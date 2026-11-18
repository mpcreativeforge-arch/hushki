// Hushki Premium: Stripe sem posílá změny předplatného a funkce podle nich odemyká Premium.
// Soubor je samostatný, dá se vložit přímo do editoru funkcí v Supabase (Verify JWT vypnuté, ověřuje se podpis Stripe).
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { httpClient: Stripe.createFetchHttpClient() });
const crypto = Stripe.createSubtleCryptoProvider();
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function save(sub: Stripe.Subscription, userHint?: string | null) {
  const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  let userId = userHint ?? sub.metadata?.user_id ?? null;
  if (!userId) {
    const { data } = await db.from('subscriptions').select('user_id').eq('stripe_customer_id', customer).maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) { console.error('webhook: neznámý zákazník', customer); return; }
  // novější API má konec období u položky, starší u předplatného
  // deno-lint-ignore no-explicit-any
  const end = (sub.items?.data?.[0] as any)?.current_period_end ?? (sub as any).current_period_end;
  const live = ['active', 'trialing', 'past_due'].includes(sub.status);
  const { error } = await db.from('subscriptions').upsert({
    user_id: userId,
    stripe_customer_id: customer,
    stripe_subscription_id: sub.id,
    status: sub.status,
    premium_until: live && end ? new Date(end * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('webhook: zápis', error.message);
}

Deno.serve(async (req) => {
  const sig = req.headers.get('Stripe-Signature');
  if (!sig) return new Response('missing signature', { status: 400 });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await req.text(), sig, Deno.env.get('STRIPE_WEBHOOK_SECRET')!, undefined, crypto);
  } catch (e) {
    console.error('webhook: podpis', (e as Error).message);
    return new Response('bad signature', { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.mode === 'subscription' && s.subscription) {
        const sub = await stripe.subscriptions.retrieve(typeof s.subscription === 'string' ? s.subscription : s.subscription.id);
        await save(sub, s.client_reference_id);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await save(event.data.object as Stripe.Subscription);
      break;
  }
  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
