-- Vlastní nápady a kategorie. Celý seznam je jeden zašifrovaný blob (klíčem páru),
-- číst a měnit ho může jen jeho autor. Partner ho nevidí.
create table if not exists public.user_ideas (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  updated_at timestamptz not null default now()
);

alter table public.user_ideas enable row level security;

drop policy if exists "user_ideas own" on public.user_ideas;
create policy "user_ideas own" on public.user_ideas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
