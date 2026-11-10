// Vygeneruje supabase/seed.sql ze src/data/templates.json a src/data/features.json
import { readFileSync, writeFileSync } from 'node:fs';
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const templates = JSON.parse(readFileSync('src/data/templates.json', 'utf8'));
const features = JSON.parse(readFileSync('src/data/features.json', 'utf8'));
let sql = '-- Vygenerováno: node scripts/seed-sql.mjs\n\n';
sql += 'insert into public.templates (category, title, body, body_zena, pro, sort) values\n';
sql += templates.map((t, i) => `  (${q(t.category)}, ${q(t.title)}, ${q(t.body)}, ${t.body_zena ? q(t.body_zena) : 'null'}, ${t.pro ? q(t.pro) : 'null'}, ${(i + 1) * 10})`).join(',\n') + ';\n\n';
sql += 'insert into public.feature_flags (key, enabled, description) values\n';
sql += features.map((f) => `  (${q(f.key)}, ${f.enabled}, ${q(f.description)})`).join(',\n');
sql += '\non conflict (key) do nothing;\n';
writeFileSync('supabase/seed.sql', sql);
console.log('supabase/seed.sql OK');
