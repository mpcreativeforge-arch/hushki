-- Hushki Premium: předplatné přes Stripe.
-- Stav zapisuje jen server (funkce stripe-webhook se service klíčem), uživatel ho smí jen číst.
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  status text,
  premium_until timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "předplatné: čtení vlastního" on public.subscriptions;
create policy "předplatné: čtení vlastního" on public.subscriptions for select using (user_id = auth.uid());
