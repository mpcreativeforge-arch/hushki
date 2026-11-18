// Sada samolepek se řídí jen volbou HE / SHE (je trvalá, v Nastavení se už nemění).
import { type Gender } from './backend';
import { sexOf } from '../data/stickers';

export function useStickerSex(_uid: string, gender: Gender): 'muz' | 'zena' {
  return sexOf(gender);
}
