-- =====================================================================
-- HC Entertainment — esquema principal
-- Tabelas, tipos, índices e restrições.
-- =====================================================================

-- ---------- Tipos controlados ----------------------------------------
create type public.app_role as enum ('admin', 'staff');
create type public.event_status as enum ('draft', 'published', 'ongoing', 'completed', 'cancelled');
create type public.sales_status as enum ('open', 'closed');
create type public.order_status as enum ('pending_payment', 'payment_reported', 'paid', 'expired', 'cancelled');
create type public.payment_method as enum ('mpesa', 'emola');
create type public.submission_status as enum ('pending', 'approved', 'rejected');
create type public.ticket_status as enum ('valid', 'used', 'cancelled');
create type public.delivery_status as enum ('not_sent', 'sent');

-- ---------- Utilitário updated_at ------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- Perfis e papéis ------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (full_name is null or char_length(full_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index user_roles_user_idx on public.user_roles (user_id);

-- ---------- Eventos ----------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  name text not null check (char_length(name) between 2 and 150),
  description text check (description is null or char_length(description) <= 5000),
  event_date date not null,
  start_time time,                       -- hora local (Africa/Maputo); null = por definir
  venue text check (venue is null or char_length(venue) <= 150),
  address text check (address is null or char_length(address) <= 300),
  city text check (city is null or char_length(city) <= 100),
  lineup text[] not null default '{}',
  door_info text check (door_info is null or char_length(door_info) <= 300),
  poster_image_id uuid,                   -- FK adicionada abaixo
  status public.event_status not null default 'draft',
  sales_status public.sales_status not null default 'closed',
  is_archived boolean not null default false,
  max_tickets_per_order integer not null default 10
    check (max_tickets_per_order between 1 and 50),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_public_idx on public.events (status, is_archived, event_date);
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

create table public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  kind text not null default 'gallery' check (kind in ('poster', 'gallery')),
  title text check (title is null or char_length(title) <= 150),
  original_path text not null,           -- bucket privado "originals" (ficheiro intacto)
  display_path text not null,            -- bucket público "posters" (WebP optimizado)
  thumb_path text not null,              -- bucket público "posters" (miniatura)
  width integer check (width > 0),
  height integer check (height > 0),
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  show_in_gallery boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index event_images_event_idx on public.event_images (event_id);
create index event_images_gallery_idx on public.event_images (show_in_gallery, sort_order);

alter table public.events
  add constraint events_poster_fk foreign key (poster_image_id)
  references public.event_images (id) on delete set null;

-- ---------- Categorias de bilhetes ------------------------------------
create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  category text not null default 'normal' check (category in ('normal', 'vip', 'other')),
  description text check (description is null or char_length(description) <= 500),
  price_cents bigint not null check (price_cents >= 0 and price_cents <= 100000000),
  quantity_total integer not null check (quantity_total >= 0),
  quantity_reserved integer not null default 0 check (quantity_reserved >= 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0),
  max_per_order integer not null default 10 check (max_per_order between 1 and 50),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, name)
);
create index ticket_types_event_idx on public.ticket_types (event_id);
create trigger ticket_types_updated_at before update on public.ticket_types
  for each row execute function public.set_updated_at();

-- ---------- Encomendas ------------------------------------------------
create table public.order_counters (
  year integer primary key,
  last_value integer not null default 0
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^HC-[0-9]{4}-[0-9]{6,}$'),
  event_id uuid not null references public.events (id) on delete restrict,
  status public.order_status not null default 'pending_payment',
  customer_name text not null check (char_length(customer_name) between 3 and 120),
  customer_whatsapp text not null check (customer_whatsapp ~ '^\+[0-9]{8,15}$'),
  customer_email text check (customer_email is null or char_length(customer_email) <= 254),
  payment_method public.payment_method not null,
  total_cents bigint not null check (total_cents >= 0),
  currency text not null default 'MZN' check (currency = 'MZN'),
  access_token_hash text not null check (char_length(access_token_hash) = 64),
  idempotency_key uuid not null unique,
  terms_accepted_at timestamptz not null,
  privacy_accepted_at timestamptz not null,
  expires_at timestamptz,
  paid_at timestamptz,
  confirmed_by uuid references auth.users (id) on delete set null,
  tickets_issued_at timestamptz,
  tickets_pdf_path text,
  delivery_status public.delivery_status not null default 'not_sent',
  delivered_at timestamptz,
  delivered_by uuid references auth.users (id) on delete set null,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_event_idx on public.orders (event_id);
create index orders_expiry_idx on public.orders (expires_at) where status = 'pending_payment';
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  ticket_type_name text not null,
  category text not null,
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 50),
  line_total_cents bigint not null check (line_total_cents = unit_price_cents * quantity),
  sort_order integer not null default 0,
  unique (order_id, ticket_type_id)
);
create index order_items_order_idx on public.order_items (order_id);

-- ---------- Pagamentos -------------------------------------------------
create table public.payment_submissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  method public.payment_method not null,
  payer_phone text not null check (payer_phone ~ '^\+[0-9]{8,15}$'),
  transaction_ref text not null check (char_length(transaction_ref) between 4 and 64),
  transaction_ref_norm text generated always as (upper(regexp_replace(transaction_ref, '[^A-Za-z0-9]', '', 'g'))) stored,
  proof_path text,
  proof_mime text check (proof_mime is null or proof_mime in ('image/jpeg', 'image/png', 'application/pdf')),
  status public.submission_status not null default 'pending',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 500),
  created_at timestamptz not null default now()
);
create index payment_submissions_order_idx on public.payment_submissions (order_id);
-- Impede a reutilização da mesma referência de transacção (excepto se rejeitada).
create unique index payment_submissions_ref_unique
  on public.payment_submissions (method, transaction_ref_norm)
  where status <> 'rejected';

create table public.payment_audit_logs (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  submission_id uuid references public.payment_submissions (id) on delete set null,
  action text not null check (action in (
    'order_created', 'payment_reported', 'kept_pending', 'rejected', 'confirmed',
    'confirm_repeated', 'tickets_issued', 'expired', 'cancelled', 'pdf_generated'
  )),
  actor_id uuid references auth.users (id) on delete set null,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index payment_audit_logs_order_idx on public.payment_audit_logs (order_id, created_at);

-- ---------- Bilhetes ---------------------------------------------------
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  order_item_id uuid not null references public.order_items (id) on delete restrict,
  event_id uuid not null references public.events (id) on delete restrict,
  ticket_type_id uuid not null references public.ticket_types (id) on delete restrict,
  seq integer not null check (seq >= 1),
  ticket_number text not null unique,
  ticket_type_name text not null,
  category text not null,
  holder_name text not null,
  price_cents bigint not null,
  status public.ticket_status not null default 'valid',
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  cancel_reason text,
  created_at timestamptz not null default now(),
  unique (order_item_id, seq)
);
create index tickets_order_idx on public.tickets (order_id);
create index tickets_event_status_idx on public.tickets (event_id, status);

create table public.ticket_validation_logs (
  id bigint generated always as identity primary key,
  ticket_id uuid references public.tickets (id) on delete set null,
  staff_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('lookup', 'admit')),
  result text not null check (result in ('valid', 'admitted', 'already_used', 'cancelled', 'invalid', 'wrong_event', 'event_cancelled')),
  created_at timestamptz not null default now()
);
create index ticket_validation_logs_ticket_idx on public.ticket_validation_logs (ticket_id);

create table public.ticket_delivery_logs (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  action text not null check (action in ('pdf_downloaded', 'message_copied', 'chat_opened', 'marked_sent', 'unmarked_sent')),
  created_at timestamptz not null default now()
);
create index ticket_delivery_logs_order_idx on public.ticket_delivery_logs (order_id);

-- ---------- Limitação de frequência ------------------------------------
create table public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits integer not null default 0
);
