-- =====================================================================
-- HC Entertainment — funções de negócio (transaccionais e idempotentes)
--
-- Todas as funções sensíveis são SECURITY DEFINER e só podem ser
-- executadas pelo papel service_role (servidor Next.js). Clientes
-- anónimos e autenticados NÃO têm permissão de execução.
-- Erros de negócio são lançados com mensagens-código (ex.: 'SOLD_OUT')
-- que o servidor traduz para português.
-- =====================================================================

-- ---------- Papéis -----------------------------------------------------
create or replace function public.has_role(p_user uuid, p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user
      and (role = p_role or role = 'admin')   -- admin herda as permissões de staff
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin');
$$;

-- Perfil criado automaticamente para novos utilizadores do Supabase Auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Limitação de frequência ------------------------------------
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;

  -- limpeza oportunista
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end;
$$;

-- ---------- Expiração de encomendas pendentes --------------------------
-- Apenas encomendas "pending_payment" (sem pagamento comunicado) expiram.
-- Encomendas com pagamento comunicado ficam reservadas até decisão do administrador.
create or replace function public.expire_stale_orders()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order record;
  v_count integer := 0;
begin
  for v_order in
    select id from public.orders
    where status = 'pending_payment' and expires_at is not null and expires_at < now()
    order by expires_at
    for update skip locked
  loop
    update public.ticket_types tt
      set quantity_reserved = greatest(tt.quantity_reserved - oi.quantity, 0)
      from public.order_items oi
      where oi.order_id = v_order.id and tt.id = oi.ticket_type_id;

    update public.orders set status = 'expired', expires_at = null where id = v_order.id;
    insert into public.payment_audit_logs (order_id, action, note)
      values (v_order.id, 'expired', 'Prazo de pagamento expirado');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------- Registo de encomendas ---------------------------------------
-- p_items: [{"ticket_type_id": "<uuid>", "quantity": 2}, ...]
-- Os preços e totais são SEMPRE lidos da base de dados.
create or replace function public.create_order(
  p_event_id uuid,
  p_items jsonb,
  p_customer_name text,
  p_customer_whatsapp text,
  p_customer_email text,
  p_payment_method public.payment_method,
  p_access_token_hash text,
  p_idempotency_key uuid,
  p_ttl_minutes integer,
  p_ip_hash text default null
)
returns table (order_id uuid, order_code text, total_cents bigint, created boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.orders%rowtype;
  v_event public.events%rowtype;
  v_item record;
  v_tt public.ticket_types%rowtype;
  v_total bigint := 0;
  v_total_qty integer := 0;
  v_year integer;
  v_seq integer;
  v_code text;
  v_order_id uuid;
  v_today date := (now() at time zone 'Africa/Maputo')::date;
  v_sort integer := 0;
begin
  -- Idempotência: o mesmo pedido repetido devolve a mesma encomenda.
  select * into v_existing from public.orders o where o.idempotency_key = p_idempotency_key;
  if found then
    if v_existing.access_token_hash <> p_access_token_hash then
      raise exception 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select v_existing.id, v_existing.code, v_existing.total_cents, false;
    return;
  end if;

  if p_ttl_minutes is null or p_ttl_minutes < 15 or p_ttl_minutes > 10080 then
    raise exception 'INVALID_TTL';
  end if;

  perform public.expire_stale_orders();

  select * into v_event from public.events e where e.id = p_event_id for share;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if v_event.status <> 'published' or v_event.sales_status <> 'open'
     or v_event.is_archived or v_event.event_date < v_today then
    raise exception 'EVENT_NOT_ON_SALE';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER';
  end if;

  -- Rejeita categorias repetidas no mesmo pedido.
  if (select count(*) from jsonb_array_elements(p_items))
     <> (select count(distinct (e->>'ticket_type_id')) from jsonb_array_elements(p_items) e) then
    raise exception 'DUPLICATE_ITEM';
  end if;

  -- Validação e bloqueio do inventário (ordem determinística evita deadlocks).
  create temporary table if not exists _order_lines (
    ticket_type_id uuid, name text, category text, unit_price bigint, quantity integer, sort_order integer
  ) on commit drop;
  truncate _order_lines;

  for v_item in
    select (e->>'ticket_type_id')::uuid as ticket_type_id, (e->>'quantity')::integer as quantity
    from jsonb_array_elements(p_items) e
    order by (e->>'ticket_type_id')::uuid
  loop
    if v_item.quantity is null or v_item.quantity < 1 then
      raise exception 'INVALID_QUANTITY';
    end if;

    select * into v_tt from public.ticket_types t
      where t.id = v_item.ticket_type_id and t.event_id = p_event_id and t.is_active
      for update;
    if not found then
      raise exception 'TICKET_TYPE_NOT_FOUND';
    end if;
    if v_item.quantity > v_tt.max_per_order then
      raise exception 'MAX_PER_TYPE_EXCEEDED';
    end if;
    if v_item.quantity > (v_tt.quantity_total - v_tt.quantity_reserved - v_tt.quantity_sold) then
      raise exception 'SOLD_OUT';
    end if;

    update public.ticket_types set quantity_reserved = quantity_reserved + v_item.quantity
      where id = v_tt.id;

    insert into _order_lines values
      (v_tt.id, v_tt.name, v_tt.category, v_tt.price_cents, v_item.quantity, v_tt.sort_order);
    v_total := v_total + v_tt.price_cents * v_item.quantity;
    v_total_qty := v_total_qty + v_item.quantity;
  end loop;

  if v_total_qty > v_event.max_tickets_per_order then
    raise exception 'MAX_PER_ORDER_EXCEEDED';
  end if;

  -- Código sequencial por ano, atómico mesmo com pedidos simultâneos.
  v_year := extract(year from (now() at time zone 'Africa/Maputo'))::integer;
  insert into public.order_counters as c (year, last_value) values (v_year, 1)
    on conflict (year) do update set last_value = c.last_value + 1
    returning last_value into v_seq;
  v_code := format('HC-%s-%s', v_year, lpad(v_seq::text, 6, '0'));

  insert into public.orders (
    code, event_id, status, customer_name, customer_whatsapp, customer_email,
    payment_method, total_cents, access_token_hash, idempotency_key,
    terms_accepted_at, privacy_accepted_at, expires_at, ip_hash
  ) values (
    v_code, p_event_id, 'pending_payment', btrim(p_customer_name), p_customer_whatsapp,
    nullif(btrim(coalesce(p_customer_email, '')), ''), p_payment_method, v_total,
    p_access_token_hash, p_idempotency_key, now(), now(),
    now() + make_interval(mins => p_ttl_minutes), p_ip_hash
  ) returning id into v_order_id;

  for v_item in select * from _order_lines order by sort_order, name loop
    v_sort := v_sort + 1;
    insert into public.order_items (
      order_id, ticket_type_id, ticket_type_name, category, unit_price_cents,
      quantity, line_total_cents, sort_order
    ) values (
      v_order_id, v_item.ticket_type_id, v_item.name, v_item.category, v_item.unit_price,
      v_item.quantity, v_item.unit_price * v_item.quantity, v_sort
    );
  end loop;

  insert into public.payment_audit_logs (order_id, action, metadata)
    values (v_order_id, 'order_created', jsonb_build_object('total_cents', v_total, 'quantity', v_total_qty));

  return query select v_order_id, v_code, v_total, true;
end;
$$;

-- ---------- Comunicação de pagamento -----------------------------------
create or replace function public.report_payment(
  p_order_id uuid,
  p_method public.payment_method,
  p_payer_phone text,
  p_transaction_ref text,
  p_proof_path text default null,
  p_proof_mime text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_submission_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status = 'pending_payment' and v_order.expires_at is not null and v_order.expires_at < now() then
    perform public.expire_stale_orders();
    raise exception 'ORDER_EXPIRED';
  end if;
  if v_order.status = 'paid' then
    raise exception 'ALREADY_PAID';
  end if;
  if v_order.status in ('expired', 'cancelled') then
    raise exception 'ORDER_CLOSED';
  end if;
  if exists (select 1 from public.payment_submissions where order_id = p_order_id and status = 'pending') then
    raise exception 'ALREADY_REPORTED';
  end if;

  begin
    insert into public.payment_submissions (order_id, method, payer_phone, transaction_ref, proof_path, proof_mime)
      values (p_order_id, p_method, p_payer_phone, btrim(p_transaction_ref), p_proof_path, p_proof_mime)
      returning id into v_submission_id;
  exception when unique_violation then
    raise exception 'DUPLICATE_REFERENCE';
  end;

  update public.orders
    set status = 'payment_reported', payment_method = p_method, expires_at = null
    where id = p_order_id;

  insert into public.payment_audit_logs (order_id, submission_id, action)
    values (p_order_id, v_submission_id, 'payment_reported');

  return v_submission_id;
end;
$$;

-- ---------- Emissão de bilhetes (interna) ------------------------------
create or replace function public._issue_tickets(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_inserted integer;
begin
  select * into v_order from public.orders where id = p_order_id;

  with lines as (
    select oi.id as order_item_id, oi.ticket_type_id, oi.ticket_type_name, oi.category,
           oi.unit_price_cents, gs.seq,
           row_number() over (order by oi.sort_order, gs.seq) as n
    from public.order_items oi
    cross join lateral generate_series(1, oi.quantity) as gs(seq)
    where oi.order_id = p_order_id
  )
  insert into public.tickets (
    order_id, order_item_id, event_id, ticket_type_id, seq, ticket_number,
    ticket_type_name, category, holder_name, price_cents
  )
  select p_order_id, l.order_item_id, v_order.event_id, l.ticket_type_id, l.seq,
         v_order.code || '-' || lpad(l.n::text, 2, '0'),
         l.ticket_type_name, l.category, v_order.customer_name, l.unit_price_cents
  from lines l
  on conflict (order_item_id, seq) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

-- ---------- Revisão administrativa do pagamento ------------------------
-- p_action: 'confirm' | 'keep_pending' | 'reject'
-- A confirmação é idempotente: repetir não cria bilhetes adicionais.
create or replace function public.review_payment(
  p_submission_id uuid,
  p_action text,
  p_admin uuid,
  p_note text default null,
  p_ttl_minutes integer default 2880
)
returns table (order_id uuid, order_status public.order_status, tickets_created integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sub public.payment_submissions%rowtype;
  v_order public.orders%rowtype;
  v_created integer := 0;
begin
  if not public.has_role(p_admin, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  if p_action not in ('confirm', 'keep_pending', 'reject') then
    raise exception 'INVALID_ACTION';
  end if;

  select * into v_sub from public.payment_submissions where id = p_submission_id;
  if not found then
    raise exception 'SUBMISSION_NOT_FOUND';
  end if;

  -- Bloqueia a encomenda: serializa confirmações simultâneas.
  select * into v_order from public.orders where id = v_sub.order_id for update;
  select * into v_sub from public.payment_submissions where id = p_submission_id for update;

  if p_action = 'confirm' then
    if v_order.status = 'paid' then
      insert into public.payment_audit_logs (order_id, submission_id, action, actor_id, note)
        values (v_order.id, v_sub.id, 'confirm_repeated', p_admin, 'Confirmação repetida ignorada');
      return query select v_order.id, v_order.status, 0;
      return;
    end if;
    if v_order.status <> 'payment_reported' or v_sub.status <> 'pending' then
      raise exception 'INVALID_STATE';
    end if;

    update public.payment_submissions
      set status = 'approved', reviewed_by = p_admin, reviewed_at = now(), review_note = p_note
      where id = v_sub.id;

    update public.ticket_types tt
      set quantity_reserved = greatest(tt.quantity_reserved - oi.quantity, 0),
          quantity_sold = tt.quantity_sold + oi.quantity
      from public.order_items oi
      where oi.order_id = v_order.id and tt.id = oi.ticket_type_id;

    update public.orders
      set status = 'paid', paid_at = now(), confirmed_by = p_admin, tickets_issued_at = now()
      where id = v_order.id;

    v_created := public._issue_tickets(v_order.id);

    insert into public.payment_audit_logs (order_id, submission_id, action, actor_id, note)
      values (v_order.id, v_sub.id, 'confirmed', p_admin, p_note);
    insert into public.payment_audit_logs (order_id, submission_id, action, actor_id, metadata)
      values (v_order.id, v_sub.id, 'tickets_issued', p_admin, jsonb_build_object('count', v_created));

    return query select v_order.id, 'paid'::public.order_status, v_created;
    return;
  end if;

  if v_sub.status <> 'pending' then
    raise exception 'INVALID_STATE';
  end if;

  if p_action = 'keep_pending' then
    update public.payment_submissions set review_note = p_note where id = v_sub.id;
    insert into public.payment_audit_logs (order_id, submission_id, action, actor_id, note)
      values (v_order.id, v_sub.id, 'kept_pending', p_admin, p_note);
    return query select v_order.id, v_order.status, 0;
    return;
  end if;

  -- reject
  update public.payment_submissions
    set status = 'rejected', reviewed_by = p_admin, reviewed_at = now(), review_note = p_note
    where id = v_sub.id;

  if v_order.status = 'payment_reported' then
    -- O cliente pode voltar a comunicar o pagamento dentro de um novo prazo.
    update public.orders
      set status = 'pending_payment', expires_at = now() + make_interval(mins => p_ttl_minutes)
      where id = v_order.id;
  end if;

  insert into public.payment_audit_logs (order_id, submission_id, action, actor_id, note)
    values (v_order.id, v_sub.id, 'rejected', p_admin, p_note);

  return query select v_order.id, (select status from public.orders where id = v_order.id), 0;
end;
$$;

-- ---------- Cancelamento de encomenda (não paga) ------------------------
create or replace function public.cancel_order(p_order_id uuid, p_admin uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.has_role(p_admin, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status not in ('pending_payment', 'payment_reported') then
    raise exception 'INVALID_STATE';
  end if;

  update public.ticket_types tt
    set quantity_reserved = greatest(tt.quantity_reserved - oi.quantity, 0)
    from public.order_items oi
    where oi.order_id = v_order.id and tt.id = oi.ticket_type_id;

  update public.payment_submissions set status = 'rejected', reviewed_by = p_admin, reviewed_at = now(),
    review_note = coalesce(p_note, 'Encomenda cancelada')
    where order_id = v_order.id and status = 'pending';

  update public.orders set status = 'cancelled', expires_at = null where id = v_order.id;
  insert into public.payment_audit_logs (order_id, action, actor_id, note)
    values (v_order.id, 'cancelled', p_admin, p_note);
end;
$$;

-- ---------- Cancelamento de bilhete ------------------------------------
create or replace function public.cancel_ticket(p_ticket_id uuid, p_admin uuid, p_reason text)
returns public.ticket_status
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ticket public.tickets%rowtype;
begin
  if not public.has_role(p_admin, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 3 then
    raise exception 'REASON_REQUIRED';
  end if;

  update public.tickets
    set status = 'cancelled', cancelled_at = now(), cancelled_by = p_admin, cancel_reason = btrim(p_reason)
    where id = p_ticket_id and status = 'valid'
    returning * into v_ticket;

  if not found then
    select * into v_ticket from public.tickets where id = p_ticket_id;
    if not found then
      raise exception 'TICKET_NOT_FOUND';
    end if;
    raise exception 'INVALID_STATE';
  end if;

  update public.ticket_types set quantity_sold = greatest(quantity_sold - 1, 0)
    where id = v_ticket.ticket_type_id;
  return 'cancelled';
end;
$$;

-- ---------- Validação de entrada ---------------------------------------
-- Consulta (não altera estado).
create or replace function public.lookup_ticket(p_ticket_id uuid, p_staff uuid)
returns table (
  result text, ticket_id uuid, ticket_number text, holder_name text,
  event_name text, event_date date, category text, ticket_type_name text,
  used_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_t public.tickets%rowtype;
  v_e public.events%rowtype;
  v_result text;
begin
  if not public.has_role(p_staff, 'staff') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_t from public.tickets where id = p_ticket_id;
  if not found then
    insert into public.ticket_validation_logs (ticket_id, staff_id, action, result)
      values (null, p_staff, 'lookup', 'invalid');
    return query select 'invalid'::text, null::uuid, null::text, null::text, null::text, null::date, null::text, null::text, null::timestamptz;
    return;
  end if;
  select * into v_e from public.events where id = v_t.event_id;

  v_result := case
    when v_e.status = 'cancelled' then 'event_cancelled'
    when v_t.status = 'cancelled' then 'cancelled'
    when v_t.status = 'used' then 'already_used'
    else 'valid' end;

  insert into public.ticket_validation_logs (ticket_id, staff_id, action, result)
    values (v_t.id, p_staff, 'lookup', v_result);

  return query select v_result, v_t.id, v_t.ticket_number, v_t.holder_name, v_e.name, v_e.event_date,
    v_t.category, v_t.ticket_type_name, v_t.used_at;
end;
$$;

-- Confirmação de entrada: operação atómica (UPDATE condicional).
-- Duas leituras simultâneas nunca validam o mesmo bilhete duas vezes.
create or replace function public.admit_ticket(p_ticket_id uuid, p_staff uuid)
returns table (result text, ticket_number text, used_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_t public.tickets%rowtype;
  v_event_status public.event_status;
begin
  if not public.has_role(p_staff, 'staff') then
    raise exception 'FORBIDDEN';
  end if;

  select e.status into v_event_status
    from public.tickets t join public.events e on e.id = t.event_id
    where t.id = p_ticket_id;
  if not found then
    insert into public.ticket_validation_logs (ticket_id, staff_id, action, result)
      values (null, p_staff, 'admit', 'invalid');
    return query select 'invalid'::text, null::text, null::timestamptz;
    return;
  end if;
  if v_event_status = 'cancelled' then
    insert into public.ticket_validation_logs (ticket_id, staff_id, action, result)
      values (p_ticket_id, p_staff, 'admit', 'event_cancelled');
    return query select 'event_cancelled'::text, null::text, null::timestamptz;
    return;
  end if;

  update public.tickets t
    set status = 'used', used_at = now(), used_by = p_staff
    where t.id = p_ticket_id and t.status = 'valid'
    returning * into v_t;

  if found then
    insert into public.ticket_validation_logs (ticket_id, staff_id, action, result)
      values (v_t.id, p_staff, 'admit', 'admitted');
    return query select 'admitted'::text, v_t.ticket_number, v_t.used_at;
    return;
  end if;

  select * into v_t from public.tickets where id = p_ticket_id;
  insert into public.ticket_validation_logs (ticket_id, staff_id, action, result)
    values (v_t.id, p_staff, 'admit', case when v_t.status = 'used' then 'already_used' else 'cancelled' end);
  return query select (case when v_t.status = 'used' then 'already_used' else 'cancelled' end)::text,
    v_t.ticket_number, v_t.used_at;
end;
$$;

-- ---------- Indicadores do painel --------------------------------------
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'events_total', (select count(*) from public.events where not is_archived),
    'events_published', (select count(*) from public.events where status = 'published' and not is_archived),
    'orders_total', (select count(*) from public.orders),
    'payments_pending', (select count(*) from public.orders where status in ('pending_payment', 'payment_reported')),
    'payments_reported', (select count(*) from public.orders where status = 'payment_reported'),
    'payments_confirmed', (select count(*) from public.orders where status = 'paid'),
    'revenue_confirmed_cents', (select coalesce(sum(total_cents), 0) from public.orders where status = 'paid'),
    'tickets_normal_sold', (select count(*) from public.tickets where category = 'normal' and status <> 'cancelled'),
    'tickets_vip_sold', (select count(*) from public.tickets where category = 'vip' and status <> 'cancelled'),
    'tickets_issued', (select count(*) from public.tickets),
    'tickets_used', (select count(*) from public.tickets where status = 'used'),
    'tickets_cancelled', (select count(*) from public.tickets where status = 'cancelled'),
    'orders_by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                         from (select status, count(*) n from public.orders group by status) s),
    'revenue_by_day', (select coalesce(jsonb_agg(jsonb_build_object('day', d, 'cents', c) order by d), '[]'::jsonb)
                       from (select (paid_at at time zone 'Africa/Maputo')::date d, sum(total_cents) c
                             from public.orders where status = 'paid' and paid_at > now() - interval '30 days'
                             group by 1) r)
  );
$$;

-- ---------- Permissões de execução -------------------------------------
revoke execute on all functions in schema public from public;
revoke execute on all functions in schema public from anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;
grant execute on function public.is_admin() to authenticated, service_role;
grant execute on function public.set_updated_at() to service_role;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
grant execute on function public.expire_stale_orders() to service_role;
grant execute on function public.create_order(uuid, jsonb, text, text, text, public.payment_method, text, uuid, integer, text) to service_role;
grant execute on function public.report_payment(uuid, public.payment_method, text, text, text, text) to service_role;
grant execute on function public.review_payment(uuid, text, uuid, text, integer) to service_role;
grant execute on function public.cancel_order(uuid, uuid, text) to service_role;
grant execute on function public.cancel_ticket(uuid, uuid, text) to service_role;
grant execute on function public.lookup_ticket(uuid, uuid) to service_role;
grant execute on function public.admit_ticket(uuid, uuid) to service_role;
grant execute on function public.dashboard_stats() to service_role;
