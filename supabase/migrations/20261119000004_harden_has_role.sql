-- has_role(p_user, ...) só é usada pelo servidor; is_admin() (apenas sobre o próprio utilizador) é necessária às políticas RLS.
revoke execute on function public.has_role(uuid, public.app_role) from authenticated;
comment on table public.order_counters is 'Contador interno de códigos de encomenda — acesso exclusivo do servidor (sem políticas RLS de propósito).';
comment on table public.rate_limits is 'Limitação de frequência — acesso exclusivo do servidor (sem políticas RLS de propósito).';
