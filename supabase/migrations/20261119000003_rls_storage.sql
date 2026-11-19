-- =====================================================================
-- HC Entertainment — Row Level Security e armazenamento
-- Princípio: negar por defeito. O público só lê eventos/imagens públicos.
-- Encomendas, comprovativos e bilhetes só são acedidos pelo servidor
-- (service_role) após verificação de autorização, ou por administradores.
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.events enable row level security;
alter table public.event_images enable row level security;
alter table public.ticket_types enable row level security;
alter table public.order_counters enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_submissions enable row level security;
alter table public.payment_audit_logs enable row level security;
alter table public.tickets enable row level security;
alter table public.ticket_validation_logs enable row level security;
alter table public.ticket_delivery_logs enable row level security;
alter table public.rate_limits enable row level security;

-- Defesa em profundidade: anónimos sem qualquer privilégio em dados sensíveis.
revoke all on public.orders, public.order_items, public.payment_submissions,
  public.payment_audit_logs, public.tickets, public.ticket_validation_logs,
  public.ticket_delivery_logs, public.order_counters, public.rate_limits,
  public.user_roles, public.profiles
  from anon;
revoke all on public.order_counters, public.rate_limits from authenticated;

-- ---------- Leitura pública ---------------------------------------------
create policy "Eventos públicos visíveis" on public.events
  for select to anon, authenticated
  using (status <> 'draft' and not is_archived);

create policy "Categorias de bilhetes públicas" on public.ticket_types
  for select to anon, authenticated
  using (
    is_active and exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.status <> 'draft' and not e.is_archived
    )
  );

create policy "Imagens públicas" on public.event_images
  for select to anon, authenticated
  using (
    event_id is null and show_in_gallery
    or exists (
      select 1 from public.events e
      where e.id = event_images.event_id and e.status <> 'draft' and not e.is_archived
    )
  );

-- ---------- Utilizadores autenticados -----------------------------------
create policy "Ver o próprio perfil" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "Actualizar o próprio perfil" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "Ver os próprios papéis" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- ---------- Administradores ---------------------------------------------
create policy "Admin gere eventos" on public.events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin gere imagens" on public.event_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin gere categorias" on public.ticket_types
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admin lê encomendas" on public.orders
  for select to authenticated using (public.is_admin());
create policy "Admin lê itens" on public.order_items
  for select to authenticated using (public.is_admin());
create policy "Admin lê comprovativos" on public.payment_submissions
  for select to authenticated using (public.is_admin());
create policy "Admin lê auditoria" on public.payment_audit_logs
  for select to authenticated using (public.is_admin());
create policy "Admin lê bilhetes" on public.tickets
  for select to authenticated using (public.is_admin());
create policy "Admin lê validações" on public.ticket_validation_logs
  for select to authenticated using (public.is_admin());
create policy "Admin lê entregas" on public.ticket_delivery_logs
  for select to authenticated using (public.is_admin());
-- Nota: todas as escritas em encomendas, pagamentos e bilhetes passam
-- exclusivamente pelas funções transaccionais executadas pelo servidor.

-- ---------- Armazenamento ------------------------------------------------
-- posters: público (versões optimizadas para a web)
-- originals: privado (ficheiros originais intactos)
-- payment-proofs: privado (comprovativos dos clientes)
-- tickets: privado (PDFs dos bilhetes)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('posters', 'posters', true, 10485760, array['image/webp', 'image/jpeg', 'image/png']),
  ('originals', 'originals', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('payment-proofs', 'payment-proofs', false, 4194304, array['image/jpeg', 'image/png', 'application/pdf']),
  ('tickets', 'tickets', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Sem políticas em storage.objects para anon/authenticated nos buckets privados:
-- apenas o servidor (service_role) lê/escreve e gera URLs assinados temporários.
