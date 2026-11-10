-- GDPR: souhlas se zásadami a smazání účtu.
alter table public.profiles add column if not exists privacy_version int;
alter table public.profiles add column if not exists privacy_accepted_at timestamptz;

-- Smazání vlastního účtu se všemi daty (právo na výmaz).
-- Místnosti, kde je uživatel zakladatel, se smažou kaskádou i se vzkazy;
-- místnosti, kam se připojil, zmizí také, aby u partnera nezůstaly jeho vzkazy.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_authenticated'; end if;
  delete from public.pairs where me in (user_a, user_b);
  delete from public.user_ideas where user_id = me;
  delete from public.push_subscriptions where user_id = me;
  delete from public.profiles where id = me;
  delete from auth.users where id = me;
end $$;

revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
