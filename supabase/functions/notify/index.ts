// Pošle partnerovi diskrétní push upozornění bez obsahu vzkazu.
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (např. mailto:info@hushki.cz)
import webpush from 'npm:web-push@3.6.7';
import { corsHeaders, json } from '../_shared/cors.ts';
import { adminClient, getUser } from '../_shared/auth.ts';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:info@hushki.cz',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const user = await getUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  const { message_id } = await req.json().catch(() => ({}));
  if (!message_id) return json({ error: 'bad_request' }, 400);

  const db = adminClient();
  const { data: msg } = await db
    .from('messages')
    .select('id, sender_id, pair_id, pairs(user_a, user_b)')
    .eq('id', message_id)
    .single();
  if (!msg || msg.sender_id !== user.id) return json({ error: 'forbidden' }, 403);

  // deno-lint-ignore no-explicit-any
  const pair = (msg as any).pairs as { user_a: string; user_b: string | null };
  const partner = pair.user_a === user.id ? pair.user_b : pair.user_a;
  if (!partner) return json({ sent: 0 });

  const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', partner);
  // Záměrně žádný obsah ani jméno – jen neutrální upozornění.
  const payload = JSON.stringify({ title: 'Hushki', body: 'Máš nový vzkaz 🤫', tag: 'hushki-new' });

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('id', s.id);
      else console.error('push error', code);
    }
  }
  return json({ sent });
});
