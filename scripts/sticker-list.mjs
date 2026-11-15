// Vytvoří public/stickers/list.json se seznamem dostupných samolepek.
// Aplikace podle něj stáhne samolepky předem, aby fungovaly hned a i bez připojení.
import { readdirSync, writeFileSync } from 'node:fs';
const dir = new URL('../public/stickers/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.webp')).sort();
writeFileSync(new URL('list.json', dir), JSON.stringify(files) + '\n');
console.log(`stickers/list.json: ${files.length} samolepek`);
