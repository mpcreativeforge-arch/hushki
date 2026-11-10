-- Nápady v ženské verzi: body_zena = text, když píše žena; pro = jen pro pisatele daného pohlaví.
alter table public.templates add column if not exists body_zena text;
alter table public.templates add column if not exists pro text check (pro in ('muz', 'zena'));
