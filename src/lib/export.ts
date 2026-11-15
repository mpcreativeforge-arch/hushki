// GDPR: kopie údajů, které o uživateli máme (přístup a přenositelnost, čl. 15 a 20).
// Obsah vzkazů je na serveru jen zašifrovaný, proto ho exportujeme jako metadata.
import { backend, type User } from './backend';
import { getPrefs } from './feedback';
import { getLang } from './i18n';
import { loadSlots, loadUnlocked } from './slots';

export async function exportMyData(user: User) {
  const pairs = await backend.getPairs();
  const rooms = [];
  for (const p of pairs) {
    const msgs = await backend.listMessages(p.id).catch(() => []);
    rooms.push({
      room_id: p.id,
      partner_nickname: p.partner_name || null,
      connected: !!p.user_b,
      messages: msgs.map((m) => ({ id: m.id, from: m.sender_id === user.id ? 'me' : 'partner', sent_at: m.created_at, read_at: m.read_at ?? null, content: 'encrypted' })),
      legend_unlocked_on_this_device: loadUnlocked(p.id),
    });
  }
  const data = {
    exported_at: new Date().toISOString(),
    app: 'Hushki',
    note: 'Message content is end-to-end encrypted and can only be read inside the app with your room key. / Obsah vzkazů je šifrovaný a přečíst ho jde jen v aplikaci s klíčem místnosti.',
    account: { id: user.id, email: user.email, nickname: user.name, gender: user.gender, privacy_policy_version: user.privacyVersion ?? null },
    rooms,
    this_device: { own_sticker_texts: loadSlots(user.id), language: getLang(), sound_and_haptics: getPrefs() },
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hushki-moje-udaje-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
