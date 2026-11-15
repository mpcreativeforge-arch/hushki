-- Verze 7: zprávy zmizí 48 hodin po poslední zprávě v místnosti. Místnost (a párování) zůstává.
-- Vyžaduje zapnuté rozšíření pg_cron (stejně jako 0006_room_expiry.sql).
create extension if not exists pg_cron;

create or replace function public.purge_idle_messages()
returns void language sql security definer set search_path = public as $$
  delete from public.messages m
  using (select pair_id from public.messages group by pair_id having max(created_at) < now() - interval '48 hours') idle
  where m.pair_id = idle.pair_id;
$$;

revoke all on function public.purge_idle_messages() from public, anon, authenticated;

select cron.schedule('hushki-purge-idle-messages', '*/10 * * * *', $$ select public.purge_idle_messages(); $$);
