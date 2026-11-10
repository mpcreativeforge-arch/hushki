-- Hushki 0002: pohlaví v profilu, šifrované fotky ve Storage

alter table public.profiles
  add column if not exists gender text not null default 'neuvedeno'
  check (gender in ('muz', 'zena', 'neuvedeno'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, gender)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'gender', ''), 'neuvedeno')
  );
  return new;
end $$;

-- Fotky: soukromý bucket, cesta <pair_id>/<uuid>. Soubory jsou zašifrované v telefonu.
insert into storage.buckets (id, name, public, file_size_limit)
values ('photos', 'photos', false, 5242880)
on conflict (id) do nothing;

create policy "fotky: členové páru čtou" on storage.objects for select
  using (bucket_id = 'photos' and public.is_pair_member(((storage.foldername(name))[1])::uuid));

create policy "fotky: členové páru nahrávají" on storage.objects for insert
  with check (bucket_id = 'photos' and public.is_pair_member(((storage.foldername(name))[1])::uuid));

create policy "fotky: mazání vlastních" on storage.objects for delete
  using (bucket_id = 'photos' and owner = auth.uid());

-- Odpovědi, fotky a samolepky jsou teď aktivní
insert into public.feature_flags (key, enabled, description) values
  ('replies', true, 'Odpověď na vzkaz'),
  ('photo_notes', true, 'Šifrovaná fotka ke vzkazu'),
  ('stickers', true, 'Samolepky Hushki')
on conflict (key) do update set enabled = excluded.enabled;
