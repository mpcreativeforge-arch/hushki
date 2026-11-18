// Jiskra: spouští ji plánovač každou hodinu. Místnostem 72 h bez zprávy vloží připomínku
// (funkce spark_tick v 0011_spark.sql) a pošle push těm, kdo mají Jiskru zapnutou.
// Secrets: CRON_SECRET (plánovač ho posílá v hlavičce x-cron-secret), VAPID_* jako u notify.
import webpush from 'npm:web-push@3.6.7';
import { json } from '../_shared/cors.ts';
import { adminClient } from '../_shared/auth.ts';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:info@hushki.cz',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'unauthorized' }, 401);

  const db = adminClient();
  const { data: rows, error } = await db.rpc('spark_tick');
  if (error) { console.error('spark_tick', error.message); return json({ error: 'db' }, 500); }

  let sent = 0;
  for (const r of (rows ?? []) as { user_id: string; gender: string }[]) {
    const body = `Kde seš? Dlouho jsi nic ${r.gender === 'zena' ? 'nenapsala' : 'nenapsal'}. ✨`;
    const payload = JSON.stringify({ title: 'Hushki · Jiskra', body, tag: 'hushki-spark' });
    const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', r.user_id);
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('id', s.id);
      }
    }
  }
  return json({ rooms: new Set((rows ?? []).map((r: { pair_id: string }) => r.pair_id)).size, sent });
});
