-- Vlastní Legenda místnosti: úpravy názvů, popisů a ikon 20 pikantních čísel.
-- Ukládá se zašifrovaná klíčem místnosti (server ji nepřečte). Upravit ji může kterýkoli z dvojice.
alter table public.pairs add column if not exists legend_ciphertext text;
alter table public.pairs add column if not exists legend_iv text;

create or replace function public.set_room_legend(p_pair uuid, p_ciphertext text, p_iv text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_pair_member(p_pair) then raise exception 'not_member'; end if;
  if length(coalesce(p_ciphertext, '')) > 200000 then raise exception 'too_large'; end if;
  update public.pairs set legend_ciphertext = p_ciphertext, legend_iv = p_iv where id = p_pair;
end $$;

revoke all on function public.set_room_legend(uuid, text, text) from public;
grant execute on function public.set_room_legend(uuid, text, text) to authenticated;
