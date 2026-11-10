-- Automatické smazání místnosti. Nastavit ho může kterýkoli z dvojice.
-- Změna se v chatu objeví jako systémová hláška (zpráva s meta.sys, bez šifrovaného obsahu).
alter table public.pairs add column if not exists expires_at timestamptz;

create or replace function public.set_room_expiry(p_pair uuid, p_seconds int)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare
  v_exp timestamptz;
begin
  if not public.is_pair_member(p_pair) then raise exception 'not_member'; end if;
  if p_seconds is not null and (p_seconds < 60 or p_seconds > 31536000) then raise exception 'invalid_expiry'; end if;
  v_exp := case when p_seconds is null then null else now() + make_interval(secs => p_seconds) end;
  update public.pairs set expires_at = v_exp where id = p_pair;
  insert into public.messages (pair_id, sender_id, ciphertext, iv, meta, read_at)
  values (p_pair, auth.uid(), '', '', jsonb_build_object('sys', 'expiry', 'seconds', p_seconds, 'expires_at', v_exp), now());
  return v_exp;
end $$;

-- Prošlé místnosti nejsou vidět ani před smazáním.
create or replace function public.is_pair_member(p_pair uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pairs
    where id = p_pair and auth.uid() in (user_a, user_b) and (expires_at is null or expires_at > now())
  );
$$;

drop policy if exists "pár: členové čtou" on public.pairs;
create policy "pár: členové čtou" on public.pairs for select
  using (auth.uid() in (user_a, user_b) and (expires_at is null or expires_at > now()));

-- Úklid každých 5 minut (Supabase: Database → Extensions → pg_cron musí být zapnutý).
create extension if not exists pg_cron;
-- Zašifrované fotky smazané místnosti zůstanou v bucketu jako nečitelná data; uklidit je jde
-- Edge funkcí přes Storage API (přímé mazání ze storage.objects Supabase nepovoluje).
select cron.schedule('hushki-expire-rooms', '*/5 * * * *', $$ delete from public.pairs where expires_at < now(); $$);
