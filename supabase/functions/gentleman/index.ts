// Gentleman mód: přepíše vzkaz do elegantnější podoby pomocí Claude API.
// Secrets: ANTHROPIC_API_KEY, volitelně GENTLEMAN_MODEL (výchozí claude-haiku-5-5)
import Anthropic from 'npm:@anthropic-ai/sdk';
import { corsHeaders, json } from '../_shared/cors.ts';
import { getUser } from '../_shared/auth.ts';

const MAX_INPUT = 1200;

const TONES: Record<string, string> = {
  elegantni: 'elegantní, sebevědomý a gentlemanský, s noblesou',
  romanticky: 'něžný a romantický, vřelý',
  hravy: 'hravý, škádlivý a s lehkým humorem',
};

const SYSTEM = `Jsi „Gentleman mód“ v aplikaci Hushki pro páry. Muž píše své partnerce soukromý vzkaz o tom, co by s ní chtěl večer zažít. Tvým úkolem je jeho text přepsat tak, aby zněl hezky a nebyl trapný.

Pravidla:
- Zachovej význam, záměr a všechny konkrétní nápady z původního textu. Nic podstatného nepřidávej ani neubírej.
- Piš česky, v první osobě, oslovuj partnerku přímo (ty).
- Smyslnost vyjadřuj s vkusem a náznakem, bez vulgarit a bez explicitních popisů.
- Vyhni se klišé, patosu, přehnaným metaforám a „básnickým“ frázím. Má to znít jako od skutečného muže, který umí psát, ne jako od AI.
- Délka podobná originálu, nanejvýš o třetinu delší.
- Vrať pouze výsledný text vzkazu, bez uvozovek, nadpisů a komentářů.`;

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });
const MODEL = Deno.env.get('GENTLEMAN_MODEL') ?? 'claude-haiku-5-5';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const user = await getUser(req);
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body: { text?: string; tone?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const text = (body.text ?? '').trim();
  if (!text) return json({ error: 'empty' }, 400);
  if (text.length > MAX_INPUT) return json({ error: 'too_long' }, 400);
  const tone = TONES[body.tone ?? ''] ?? TONES.elegantni;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: 'low' },
      system: SYSTEM,
      messages: [
        { role: 'user', content: `Požadovaný tón: ${tone}.\n\nPůvodní vzkaz:\n${text}` },
      ],
    });

    if (response.stop_reason === 'refusal') return json({ error: 'refused' }, 422);

    const out = response.content
      .flatMap((b) => (b.type === 'text' ? [b.text] : []))
      .join('')
      .trim();
    if (!out) return json({ error: 'empty_output' }, 502);
    return json({ text: out });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return json({ error: 'rate_limited' }, 429);
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error', err.status, err.message);
      return json({ error: 'ai_error' }, 502);
    }
    console.error(err);
    return json({ error: 'internal' }, 500);
  }
});
