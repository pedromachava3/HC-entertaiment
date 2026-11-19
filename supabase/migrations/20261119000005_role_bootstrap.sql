-- Atribuição inicial de papéis por email (sem palavras-passe fixas).
-- O papel só é concedido quando o email da conta estiver CONFIRMADO; a entrada é depois removida.
create table if not exists public.role_bootstrap (
  email text primary key check (email = lower(email)),
  role public.app_role not null,
  created_at timestamptz not null default now()
);
alter table public.role_bootstrap enable row level security;
revoke all on public.role_bootstrap from anon, authenticated;
comment on table public.role_bootstrap is 'Papéis a conceder a contas ainda por criar — acesso exclusivo do servidor.';

create or replace function public.grant_bootstrap_role()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.email is not null and new.email_confirmed_at is not null then
    insert into public.user_roles (user_id, role)
      select new.id, b.role from public.role_bootstrap b where b.email = lower(new.email)
      on conflict (user_id, role) do nothing;
    delete from public.role_bootstrap where email = lower(new.email);
  end if;
  return new;
end;
$$;
revoke execute on function public.grant_bootstrap_role() from public, anon, authenticated;

drop trigger if exists on_auth_user_confirmed_role on auth.users;
create trigger on_auth_user_confirmed_role
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.grant_bootstrap_role();
