-- =====================================================================
-- Pagamentos automáticos (PaySuite: M-Pesa / e-Mola / mKesh)
-- O cliente paga na página segura da PaySuite e confirma com o PIN no telemóvel.
-- A PaySuite notifica o servidor (webhook assinado); o servidor confirma a
-- encomenda e emite os bilhetes de forma transaccional e idempotente.
-- =====================================================================

create table public.online_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null default 'paysuite' check (provider in ('paysuite')),
  provider_payment_id text not null unique,
  checkout_url text not null,
  amount_cents bigint not null check (amount_cents > 0),
  status text not null default 'created'
    check (status in ('created', 'paid', 'failed', 'needs_review')),
  method text,                       -- mpesa / emola / … (informado pela PaySuite)
  provider_transaction_id text unique,
  review_reason text,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  updated_at timestamptz not null default now()
);
create index online_payments_order_idx on public.online_payments (order_id, created_at desc);
create trigger online_payments_updated_at before update on public.online_payments
  for each row execute function public.set_updated_at();

alter table public.online_payments enable row level security;
revoke all on public.online_payments from anon;
create policy "Admin lê pagamentos online" on public.online_payments
  for select to authenticated using (public.is_admin());

alter table public.payment_audit_logs drop constraint if exists payment_audit_logs_action_check;
alter table public.payment_audit_logs add constraint payment_audit_logs_action_check check (action in (
  'order_created', 'payment_reported', 'kept_pending', 'rejected', 'confirmed',
  'confirm_repeated', 'tickets_issued', 'expired', 'cancelled', 'pdf_generated',
  'online_checkout_created', 'online_payment_confirmed', 'online_payment_failed', 'online_payment_needs_review'
));

-- Confirmação automática. Devolve: 'confirmed' | 'already_paid' | 'needs_review'.
create or replace function public.confirm_online_payment(
  p_provider_payment_id text,
  p_amount_cents bigint,
  p_transaction_id text,
  p_method text,
  p_raw jsonb
)
returns table (result text, order_id uuid, tickets_created integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_op public.online_payments%rowtype;
  v_order public.orders%rowtype;
  v_created integer := 0;
  v_reason text;
begin
  select * into v_op from public.online_payments where provider_payment_id = p_provider_payment_id for update;
  if not found then
    raise exception 'ONLINE_PAYMENT_NOT_FOUND';
  end if;
  select * into v_order from public.orders where id = v_op.order_id for update;

  if v_order.status = 'paid' then
    update public.online_payments
      set status = case when status = 'paid' then status else 'needs_review' end,
          review_reason = case when status = 'paid' then review_reason else 'Encomenda já estava paga (possível pagamento duplicado)' end,
          raw_event = coalesce(p_raw, raw_event)
      where id = v_op.id;
    return query select 'already_paid'::text, v_order.id, 0;
    return;
  end if;

  v_reason := case
    when p_amount_cents is distinct from v_order.total_cents then 'Valor pago diferente do total da encomenda'
    when v_order.status not in ('pending_payment', 'payment_reported') then 'Encomenda ' || v_order.status::text || ' — verificar stock e reembolso'
    else null end;

  if v_reason is not null then
    update public.online_payments
      set status = 'needs_review', review_reason = v_reason, method = p_method,
          provider_transaction_id = coalesce(p_transaction_id, provider_transaction_id),
          raw_event = p_raw, paid_at = now()
      where id = v_op.id;
    insert into public.payment_audit_logs (order_id, action, note, metadata)
      values (v_order.id, 'online_payment_needs_review', v_reason,
              jsonb_build_object('provider_payment_id', p_provider_payment_id, 'amount_cents', p_amount_cents));
    return query select 'needs_review'::text, v_order.id, 0;
    return;
  end if;

  update public.online_payments
    set status = 'paid', method = p_method, provider_transaction_id = p_transaction_id,
        raw_event = p_raw, paid_at = now()
    where id = v_op.id;

  update public.payment_submissions ps
    set status = 'rejected', reviewed_at = now(), review_note = 'Substituída por pagamento automático confirmado'
    where ps.order_id = v_order.id and ps.status = 'pending';

  update public.ticket_types tt
    set quantity_reserved = greatest(tt.quantity_reserved - oi.quantity, 0),
        quantity_sold = tt.quantity_sold + oi.quantity
    from public.order_items oi
    where oi.order_id = v_order.id and tt.id = oi.ticket_type_id;

  update public.orders
    set status = 'paid', paid_at = now(), confirmed_by = null, tickets_issued_at = now(), expires_at = null,
        payment_method = case when p_method in ('mpesa', 'emola') then p_method::public.payment_method else payment_method end
    where id = v_order.id;

  v_created := public._issue_tickets(v_order.id);

  insert into public.payment_audit_logs (order_id, action, note, metadata)
    values (v_order.id, 'online_payment_confirmed', 'Pagamento automático PaySuite',
            jsonb_build_object('provider_payment_id', p_provider_payment_id, 'transaction_id', p_transaction_id, 'method', p_method));
  insert into public.payment_audit_logs (order_id, action, metadata)
    values (v_order.id, 'tickets_issued', jsonb_build_object('count', v_created));

  return query select 'confirmed'::text, v_order.id, v_created;
end;
$$;

create or replace function public.fail_online_payment(p_provider_payment_id text, p_raw jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_op public.online_payments%rowtype;
begin
  update public.online_payments set status = 'failed', raw_event = p_raw
    where provider_payment_id = p_provider_payment_id and status = 'created'
    returning * into v_op;
  if found then
    insert into public.payment_audit_logs (order_id, action, note)
      values (v_op.order_id, 'online_payment_failed', 'Pagamento automático falhou ou foi cancelado');
  end if;
end;
$$;

revoke execute on function public.confirm_online_payment(text, bigint, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.fail_online_payment(text, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_online_payment(text, bigint, text, text, jsonb) to service_role;
grant execute on function public.fail_online_payment(text, jsonb) to service_role;
