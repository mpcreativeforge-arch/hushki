// Vlastní nápady: kategorie a texty připravené dopředu. Ukládají se zašifrovaně.
import { backend } from './backend';
import { decryptText, encryptText } from './crypto';

export interface MyCategory { id: string; name: string }
export interface MyIdea { id: string; cat: string; title: string; text: string }
export interface MyIdeas { v: 1; cats: MyCategory[]; ideas: MyIdea[] }

const empty = (): MyIdeas => ({ v: 1, cats: [], ideas: [] });

export async function loadMyIdeas(key: CryptoKey): Promise<MyIdeas> {
  const row = await backend.getIdeas().catch(() => null);
  if (!row) return empty();
  try {
    const data = JSON.parse(await decryptText(key, row.ciphertext, row.iv)) as MyIdeas;
    return { v: 1, cats: data.cats ?? [], ideas: data.ideas ?? [] };
  } catch {
    return empty();
  }
}

export async function saveMyIdeas(key: CryptoKey, data: MyIdeas) {
  const { ciphertext, iv } = await encryptText(key, JSON.stringify(data));
  await backend.saveIdeas(ciphertext, iv);
}

export const newId = () => crypto.randomUUID().slice(0, 8);
