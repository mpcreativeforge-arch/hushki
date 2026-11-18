-- Premium pro celou místnost: když předplatné má kterýkoli z dvojice, odemkne se oběma.
-- Partner nevidí cizí řádek předplatného, jen datum, do kdy Premium v místnosti platí.
create or replace function public.room_premium_until(p_pair uuid)
returns timestamptz language sql stable security definer set search_path = public as $$
  select max(s.premium_until)
  from public.pairs p
  join public.subscriptions s on s.user_id in (p.user_a, p.user_b)
  where p.id = p_pair and auth.uid() in (p.user_a, p.user_b);
$$;

revoke all on function public.room_premium_until(uuid) from public, anon;
grant execute on function public.room_premium_until(uuid) to authenticated;
