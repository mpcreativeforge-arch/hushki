-- Více místností: uživatel může mít víc párů (každý se svým kódem a klíčem).
drop index if exists public.pairs_user_a_once;
drop index if exists public.pairs_user_b_once;
create index if not exists pairs_user_a on public.pairs (user_a);
create index if not exists pairs_user_b on public.pairs (user_b);

-- Limit místností na uživatele.
create or replace function public.room_count(p_user uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.pairs where p_user in (user_a, user_b);
$$;

create or replace function public.pairs_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.room_count(new.user_a) >= 10 then raise exception 'too_many_rooms'; end if;
  return new;
end $$;

drop trigger if exists pairs_limit on public.pairs;
create trigger pairs_limit before insert on public.pairs for each row execute function public.pairs_limit();

create or replace function public.join_pair(p_invite_hash text)
returns public.pairs language plpgsql security definer set search_path = public as $$
declare
  p public.pairs;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into p from public.pairs where invite_hash = p_invite_hash for update;
  if not found then raise exception 'invalid_code'; end if;
  if p.user_a = auth.uid() or p.user_b = auth.uid() then return p; end if; -- obnova na novém zařízení
  if p.user_b is not null then raise exception 'pair_full'; end if;
  if public.room_count(auth.uid()) >= 10 then raise exception 'too_many_rooms'; end if;
  update public.pairs set user_b = auth.uid(), paired_at = now() where id = p.id returning * into p;
  return p;
end $$;

-- Opuštění jedné místnosti (smaže ji i se vzkazy).
drop function if exists public.leave_pair();
create or replace function public.leave_pair(p_pair uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.pairs where id = p_pair and auth.uid() in (user_a, user_b);
$$;
