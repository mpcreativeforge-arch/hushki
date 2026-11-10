-- Hushki: základní schéma
-- Server ukládá jen zašifrované vzkazy. Klíč páru zná pouze zařízení obou partnerů.

create extension if not exists pgcrypto;

-- Profil uživatele -----------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Páry -----------------------------------------------------------------------
-- invite_hash = SHA-256 párovacího kódu. Samotný kód (a z něj odvozený klíč) server nikdy nevidí.
-- key_check = otisk klíče, aby si zařízení ověřilo, že zadaný kód je správný.
create table public.pairs (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid references auth.users (id) on delete set null,
  invite_hash text not null unique,
  key_check text not null,
  created_at timestamptz not null default now(),
  paired_at timestamptz,
  constraint pairs_distinct check (user_a is distinct from user_b)
);
create unique index pairs_user_a_once on public.pairs (user_a);
create unique index pairs_user_b_once on public.pairs (user_b) where user_b is not null;

create or replace function public.is_pair_member(p_pair uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.pairs
    where id = p_pair and auth.uid() in (user_a, user_b)
  );
$$;

-- Připojení k páru přes kód (RPC, aby nešlo procházet cizí páry).
create or replace function public.join_pair(p_invite_hash text)
returns public.pairs language plpgsql security definer set search_path = public as $$
declare
  p public.pairs;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if exists (select 1 from public.pairs where auth.uid() in (user_a, user_b) and invite_hash <> p_invite_hash) then
    raise exception 'already_paired';
  end if;
  select * into p from public.pairs where invite_hash = p_invite_hash for update;
  if not found then raise exception 'invalid_code'; end if;
  if p.user_a = auth.uid() or p.user_b = auth.uid() then return p; end if; -- obnova na novém zařízení
  if p.user_b is not null then raise exception 'pair_full'; end if;
  update public.pairs set user_b = auth.uid(), paired_at = now() where id = p.id returning * into p;
  return p;
end $$;

-- Opuštění páru (smaže pár i vzkazy).
create or replace function public.leave_pair()
returns void language sql security definer set search_path = public as $$
  delete from public.pairs where auth.uid() in (user_a, user_b);
$$;

-- Vzkazy ---------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  pair_id uuid not null references public.pairs (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  ciphertext text not null,   -- base64, AES-GCM
  iv text not null,           -- base64
  meta jsonb not null default '{}'::jsonb, -- nešifrovaná metadata (např. template_id, flagy)
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_pair_created on public.messages (pair_id, created_at desc);

create or replace function public.mark_read(p_message uuid)
returns void language sql security definer set search_path = public as $$
  update public.messages set read_at = now()
  where id = p_message and read_at is null and sender_id <> auth.uid()
    and public.is_pair_member(pair_id);
$$;

-- Šablony nápadů (Petr je doplňuje v Supabase dashboardu, bez aktualizace aplikace) --
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'obecne',
  title text not null,
  body text not null,
  sort int not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Přepínače funkcí (funkce, které zatím nejsou aktivní) ----------------------
create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text not null default ''
);

-- Push odběry ----------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security ---------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.pairs enable row level security;
alter table public.messages enable row level security;
alter table public.templates enable row level security;
alter table public.feature_flags enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "profil: vlastní a partnerův" on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.pairs p
    where auth.uid() in (p.user_a, p.user_b) and profiles.id in (p.user_a, p.user_b)
  )
);
create policy "profil: úprava vlastního" on public.profiles for update using (id = auth.uid());

create policy "pár: členové čtou" on public.pairs for select using (auth.uid() in (user_a, user_b));
create policy "pár: založení" on public.pairs for insert with check (user_a = auth.uid() and user_b is null);

create policy "vzkazy: členové čtou" on public.messages for select using (public.is_pair_member(pair_id));
create policy "vzkazy: odeslání" on public.messages for insert with check (
  sender_id = auth.uid() and public.is_pair_member(pair_id)
  and exists (select 1 from public.pairs where id = pair_id and user_b is not null)
);
create policy "vzkazy: mazání vlastních" on public.messages for delete using (sender_id = auth.uid());

create policy "šablony: čtení" on public.templates for select using (active);
create policy "flagy: čtení" on public.feature_flags for select using (true);

create policy "push: vlastní" on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Realtime pro vzkazy a páry
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.pairs;
