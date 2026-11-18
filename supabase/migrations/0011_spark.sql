-- Jiskra: po 72 hodinách bez zprávy přijde do místnosti připomínka (a push upozornění).
-- Čas poslední zprávy se drží v pairs.last_activity_at, protože samotné zprávy po 48 h mizí (0008).
alter table public.pairs add column if not exists last_activity_at timestamptz;
alter table public.pairs add column if not exists spark_sent_at timestamptz;
alter table public.profiles add column if not exists spark boolean not null default true;

update public.pairs p set last_activity_at = coalesce(
  (select max(created_at) from public.messages m where m.pair_id = p.id and m.meta ->> 'sys' is null), p.created_at)
where last_activity_at is null;

create or replace function public.touch_pair_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.meta ->> 'sys' is null then
    update public.pairs set last_activity_at = new.created_at where id = new.pair_id;
  end if;
  return new;
end $$;

drop trigger if exists messages_touch_pair on public.messages;
create trigger messages_touch_pair after insert on public.messages
  for each row execute function public.touch_pair_activity();

-- Místnosti, kterým má Jiskra napsat: spárované, 72 h bez zprávy, od poslední zprávy ještě nepsala
-- a aspoň jeden z dvojice má Jiskru zapnutou. Vloží systémovou zprávu a vrátí, komu poslat push.
create or replace function public.spark_tick()
returns table (pair_id uuid, user_id uuid, gender text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare r record;
begin
  for r in
    select p.id, p.user_a, p.user_b from public.pairs p
    where p.user_b is not null
      and coalesce(p.last_activity_at, p.paired_at, p.created_at) < now() - interval '72 hours'
      and (p.spark_sent_at is null or p.spark_sent_at < coalesce(p.last_activity_at, p.paired_at, p.created_at))
      and (p.expires_at is null or p.expires_at > now())
      and exists (select 1 from public.profiles pr where pr.id in (p.user_a, p.user_b) and pr.spark)
  loop
    insert into public.messages (pair_id, sender_id, ciphertext, iv, meta, read_at)
    values (r.id, r.user_a, '', '', jsonb_build_object('sys', 'spark'), now());
    update public.pairs set spark_sent_at = now() where id = r.id;
    return query select r.id, pr.id, pr.gender from public.profiles pr where pr.id in (r.user_a, r.user_b) and pr.spark;
  end loop;
end $$;

revoke all on function public.spark_tick() from public, anon, authenticated;
