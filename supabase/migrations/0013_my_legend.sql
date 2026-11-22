-- Každý má vlastní sadu tajných přání. Úpravy (zašifrované klíčem místnosti) patří jen autorovi:
-- řádek čte a mění jen on, partner nepozná, co upravil. Přání dostane až ve vzkazu.
-- Sdílená Legenda místnosti (pairs.legend_*, 0009) se už nepoužívá.
create table if not exists public.legend_edits (
  pair_id uuid not null references public.pairs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  updated_at timestamptz not null default now(),
  primary key (pair_id, user_id)
);

alter table public.legend_edits enable row level security;

drop policy if exists "legend_edits own" on public.legend_edits;
create policy "legend_edits own" on public.legend_edits
  for select using (user_id = auth.uid());

create or replace function public.set_my_legend(p_pair uuid, p_ciphertext text, p_iv text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_pair_member(p_pair) then raise exception 'not_member'; end if;
  if length(coalesce(p_ciphertext, '')) > 200000 then raise exception 'too_large'; end if;
  insert into public.legend_edits (pair_id, user_id, ciphertext, iv)
  values (p_pair, auth.uid(), p_ciphertext, p_iv)
  on conflict (pair_id, user_id) do update set ciphertext = excluded.ciphertext, iv = excluded.iv, updated_at = now();
end $$;

revoke all on function public.set_my_legend(uuid, text, text) from public;
grant execute on function public.set_my_legend(uuid, text, text) to authenticated;
