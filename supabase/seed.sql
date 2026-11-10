-- Vygenerováno: node scripts/seed-sql.mjs

insert into public.templates (category, title, body, sort) values
  ('romantika', 'Šátek', 'Dnes večer si vezmu šátek a zavážu ti oči. Ty se jen posadíš na postel a o zbytek se postarám já.', 10),
  ('romantika', 'Svíčky', 'Až přijdeš domů, bude zhasnuto a budou hořet jen svíčky. Nic neplánuj, večer patří nám dvěma.', 20),
  ('romantika', 'Pomalu', 'Mám chuť na večer, kdy nikam nespěcháme. Jen ty, já a spousta času.', 30),
  ('romantika', 'Koupel', 'Napustím nám vanu. Ty doneseš sebe, o všechno ostatní je postaráno.', 40),
  ('odvaha', 'Pravidla hry', 'Dnes večer platí jedno pravidlo: ty rozhoduješ a já poslouchám. Promysli si, co si přeješ.', 50),
  ('odvaha', 'Bez slov', 'Celý večer spolu nepromluvíme ani slovo. Uvidíme, jak dlouho to vydržíš.', 60),
  ('odvaha', 'Dárek', 'Na posteli tě bude čekat malý dárek. Otevři ho, až budu u tebe.', 70),
  ('odvaha', 'Masáž', 'Dnes večer tě čeká masáž. Začnu u ramen a uvidíme, kam se dostanu.', 80),
  ('hra', 'Tři přání', 'Dnes večer máš tři přání. Napiš mi to první, až budeš mít chvilku.', 90),
  ('hra', 'Kostky', 'Mám pro nás hru s kostkami. Pravidla ti vysvětlím až večer, prozradím jen, že prohrát se nedá.', 100),
  ('hra', 'Hádanka', 'Mám na sobě něco, co jsi na mně ještě neviděla. Večer zjistíš co.', 110),
  ('hra', 'Rande doma', 'Dnes máme rande. Obleč si něco hezkého, uvařím a zbytek večera nech na mně.', 120);

insert into public.feature_flags (key, enabled, description) values
  ('gentleman', false, 'Gentleman mód: AI přepíše vzkaz do elegantnější podoby'),
  ('templates', true, 'Nápady na vzkazy (šablony)'),
  ('stickers', true, 'Samolepky Hushki'),
  ('self_destruct', false, 'Vzkaz zmizí po přečtení'),
  ('scheduled_send', false, 'Odeslat vzkaz později (v nastavený čas)'),
  ('quick_signal', false, 'Rychlý signál bez textu (např. „Dnes večer?“) s odpovědí ano/ne'),
  ('replies', true, 'Odpověď na vzkaz'),
  ('photo_notes', true, 'Šifrovaná fotka ke vzkazu'),
  ('voice_notes', false, 'Hlasový vzkaz')
on conflict (key) do nothing;
