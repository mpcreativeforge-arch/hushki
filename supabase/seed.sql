-- Vygenerováno: node scripts/seed-sql.mjs

insert into public.templates (category, title, body, body_zena, pro, sort) values
  ('romantika', 'Šátek', 'Dnes večer si vezmu šátek a zavážu ti oči. Ty se jen posadíš na postel a o zbytek se postarám já.', 'Dnes večer si vezmu šátek a zavážu ti oči. Ty si jen lehneš a o zbytek se postarám já.', null, 10),
  ('romantika', 'Svíčky', 'Až přijdeš domů, bude zhasnuto a budou hořet jen svíčky. Nic neplánuj, večer patří nám dvěma.', null, null, 20),
  ('romantika', 'Pomalu', 'Mám chuť na večer, kdy nikam nespěcháme. Jen ty, já a spousta času.', null, null, 30),
  ('romantika', 'Koupel', 'Napustím nám vanu. Ty doneseš sebe, o všechno ostatní je postaráno.', null, null, 40),
  ('odvaha', 'Pravidla hry', 'Dnes večer platí jedno pravidlo: ty rozhoduješ a já poslouchám. Promysli si, co si přeješ.', null, null, 50),
  ('odvaha', 'Bez slov', 'Celý večer spolu nepromluvíme ani slovo. Uvidíme, jak dlouho to vydržíš.', null, null, 60),
  ('odvaha', 'Dárek', 'Na posteli tě bude čekat malý dárek. Otevři ho, až budu u tebe.', null, null, 70),
  ('odvaha', 'Masáž', 'Dnes večer tě čeká masáž. Začnu u ramen a uvidíme, kam se dostanu.', 'Dnes večer tě čeká masáž. Začnu u zad a uvidíme, kam se dostanu.', null, 80),
  ('hra', 'Tři přání', 'Dnes večer máš tři přání. Napiš mi to první, až budeš mít chvilku.', null, null, 90),
  ('hra', 'Kostky', 'Mám pro nás hru s kostkami. Pravidla ti vysvětlím až večer, prozradím jen, že prohrát se nedá.', null, null, 100),
  ('hra', 'Hádanka', 'Mám na sobě něco, co jsi na mně ještě neviděla. Večer zjistíš co.', 'Mám na sobě něco, co jsi na mně ještě neviděl. Večer zjistíš co.', null, 110),
  ('hra', 'Rande doma', 'Dnes máme rande. Obleč si něco hezkého, uvařím a zbytek večera nech na mně.', 'Dnes máme rande. Vezmi si tu košili, co mám ráda. Uvařím a zbytek večera nech na mně.', null, 120),
  ('romantika', 'Tvoje košile', 'Dnes večer na sobě budu mít jen tvoji košili. Nic víc.', null, 'zena', 130),
  ('romantika', 'Čekám', 'Čekám na tebe v posteli. Pospěš si, nebo začnu bez tebe.', null, 'zena', 140),
  ('odvaha', 'Krajka', 'Koupila jsem si něco nového z krajky. Chceš to vidět, ještě než to ze mě sundáš?', null, 'zena', 150),
  ('odvaha', 'Dnes já', 'Dnes večer to vezmu do svých rukou. Ty si jen lehneš a necháš se překvapit.', null, 'zena', 160),
  ('hra', 'Hádej', 'Celý den na tebe myslím a nemůžu se soustředit. Hádej, na co přesně.', null, 'zena', 170),
  ('hra', 'Nápověda', 'Večer pro tebe mám překvapení. Malá nápověda: je černé a moc toho nezakrývá.', null, 'zena', 180);

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
