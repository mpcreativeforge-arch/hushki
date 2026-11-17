// Hushki Premium: platba předplatného, správa předplatného a zrušení při smazání účtu.
// Soubor je samostatný, dá se vložit přímo do editoru funkcí v Supabase (Verify JWT vypnuté, uživatele ověřuje kód).
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_MONTH, STRIPE_PRICE_YEAR, volitelně SITE_URL (výchozí https://hushki.cz)
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
const SITE = (Deno.env.get('SITE_URL') ?? 'https://hushki.cz').replace(/\/$/, '');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'unauthorized' }, 401);
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: auth } },
  });
  const user = (await userClient.auth.getUser()).data.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  const { action, plan } = await req.json().catch(() => ({}));
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: row } = await db.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle();

  try {
    if (action === 'checkout') {
      const price = plan === 'year' ? Deno.env.get('STRIPE_PRICE_YEAR') : Deno.env.get('STRIPE_PRICE_MONTH');
      if (!price) return json({ error: 'bad_request' }, 400);
      let customer = row?.stripe_customer_id as string | undefined;
      if (!customer) {
        customer = (await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } })).id;
        await db.from('subscriptions').upsert({ user_id: user.id, stripe_customer_id: customer, updated_at: new Date().toISOString() });
      }
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer,
        client_reference_id: user.id,
        line_items: [{ price, quantity: 1 }],
        subscription_data: { metadata: { user_id: user.id } },
        allow_promotion_codes: true,
        locale: 'auto',
        success_url: `${SITE}/?premium=ok`,
        cancel_url: `${SITE}/?premium=cancel`,
      });
      return json({ url: session.url });
    }
    if (action === 'portal') {
      if (!row?.stripe_customer_id) return json({ error: 'no_customer' }, 400);
      const s = await stripe.billingPortal.sessions.create({ customer: row.stripe_customer_id, return_url: `${SITE}/` });
      return json({ url: s.url });
    }
    if (action === 'cancel') {
      // při smazání účtu: předplatné hned ukončit, ať se dál nestrhává
      if (row?.stripe_subscription_id && row.status !== 'canceled') await stripe.subscriptions.cancel(row.stripe_subscription_id);
      return json({ ok: true });
    }
    return json({ error: 'bad_request' }, 400);
  } catch (e) {
    console.error('stripe', e);
    return json({ error: 'stripe' }, 502);
  }
});
