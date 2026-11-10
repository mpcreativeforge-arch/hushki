// Jednotné rozhraní k backendu. Bez konfigurace Supabase běží demo režim v prohlížeči.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import templatesJson from '../data/templates.json';
import featuresJson from '../data/features.json';

export interface User { id: string; email: string; name: string }
export interface Pair { id: string; user_a: string; user_b: string | null; key_check: string; partner_name: string }
export interface Message {
  id: string; pair_id: string; sender_id: string;
  ciphertext: string; iv: string; meta: Record<string, unknown>;
  created_at: string; read_at: string | null;
}
export interface Template { id: string; category: string; title: string; body: string }
export type Tone = 'elegantni' | 'romanticky' | 'hravy';

export interface Backend {
  mode: 'supabase' | 'demo';
  getUser(): Promise<User | null>;
  onAuthChange(cb: () => void): () => void;
  signUp(email: string, password: string, name: string): Promise<{ needsConfirm: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  updateName(name: string): Promise<void>;
  getPair(): Promise<Pair | null>;
  createPair(inviteHash: string, keyCheck: string): Promise<Pair>;
  joinPair(inviteHash: string): Promise<Pair>;
  leavePair(): Promise<void>;
  listMessages(pairId: string): Promise<Message[]>;
  sendMessage(pairId: string, ciphertext: string, iv: string, meta?: Record<string, unknown>): Promise<Message>;
  markRead(id: string): Promise<void>;
  subscribe(pairId: string, cb: () => void): () => void;
  templates(): Promise<Template[]>;
  flags(): Promise<Record<string, boolean>>;
  gentleman(text: string, tone: Tone): Promise<string>;
  savePushSubscription(sub: PushSubscriptionJSON): Promise<void>;
  notifyPartner(messageId: string): Promise<void>;
  /** jen demo: simulace partnera */
  demoPartnerMessage?(pairId: string, ciphertext: string, iv: string): Promise<void>;
}

const defaultFlags = Object.fromEntries(featuresJson.map((f) => [f.key, f.enabled]));
const localTemplates: Template[] = templatesJson.map((t, i) => ({ id: 'local-' + i, ...t }));

export class BackendError extends Error {
  constructor(public code: string, message?: string) { super(message ?? code); }
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
function supabaseBackend(url: string, anonKey: string): Backend {
  const sb: SupabaseClient = createClient(url, anonKey, { auth: { persistSession: true } });

  const uid = async () => {
    const { data } = await sb.auth.getUser();
    if (!data.user) throw new BackendError('not_authenticated');
    return data.user.id;
  };

  const fail = (error: { message: string } | null) => {
    if (!error) return;
    const m = error.message;
    for (const code of ['invalid_code', 'pair_full', 'already_paired', 'not_authenticated']) {
      if (m.includes(code)) throw new BackendError(code);
    }
    throw new BackendError('server', m);
  };

  const withPartner = async (p: Omit<Pair, 'partner_name'> | null): Promise<Pair | null> => {
    if (!p) return null;
    const me = await uid();
    const partnerId = p.user_a === me ? p.user_b : p.user_a;
    let partner_name = '';
    if (partnerId) {
      const { data } = await sb.from('profiles').select('display_name').eq('id', partnerId).maybeSingle();
      partner_name = data?.display_name ?? '';
    }
    return { ...p, partner_name };
  };

  return {
    mode: 'supabase',
    async getUser() {
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      if (!u) return null;
      const { data: prof } = await sb.from('profiles').select('display_name').eq('id', u.id).maybeSingle();
      return { id: u.id, email: u.email ?? '', name: prof?.display_name ?? '' };
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') cb();
      });
      return () => data.subscription.unsubscribe();
    },
    async signUp(email, password, name) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name } } });
      if (error) throw new BackendError('auth', error.message);
      return { needsConfirm: !data.session };
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new BackendError('auth', error.message);
    },
    async signOut() { await sb.auth.signOut(); },
    async updateName(name) {
      const { error } = await sb.from('profiles').update({ display_name: name }).eq('id', await uid());
      fail(error);
    },
    async getPair() {
      const me = await uid();
      const { data, error } = await sb.from('pairs').select('id,user_a,user_b,key_check')
        .or(`user_a.eq.${me},user_b.eq.${me}`).maybeSingle();
      fail(error);
      return withPartner(data);
    },
    async createPair(invite_hash, key_check) {
      const { data, error } = await sb.from('pairs').insert({ user_a: await uid(), invite_hash, key_check })
        .select('id,user_a,user_b,key_check').single();
      fail(error);
      return (await withPartner(data))!;
    },
    async joinPair(invite_hash) {
      const { data, error } = await sb.rpc('join_pair', { p_invite_hash: invite_hash });
      fail(error);
      return (await withPartner(data))!;
    },
    async leavePair() { fail((await sb.rpc('leave_pair')).error); },
    async listMessages(pairId) {
      const { data, error } = await sb.from('messages').select('*').eq('pair_id', pairId)
        .order('created_at', { ascending: false }).limit(200);
      fail(error);
      return data ?? [];
    },
    async sendMessage(pair_id, ciphertext, iv, meta = {}) {
      const { data, error } = await sb.from('messages')
        .insert({ pair_id, sender_id: await uid(), ciphertext, iv, meta }).select('*').single();
      fail(error);
      return data!;
    },
    async markRead(id) { fail((await sb.rpc('mark_read', { p_message: id })).error); },
    subscribe(pairId, cb) {
      const ch = sb.channel('pair-' + pairId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `pair_id=eq.${pairId}` }, cb)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pairs', filter: `id=eq.${pairId}` }, cb)
        .subscribe();
      return () => { sb.removeChannel(ch); };
    },
    async templates() {
      const { data, error } = await sb.from('templates').select('id,category,title,body').order('sort');
      if (error || !data?.length) return localTemplates;
      return data;
    },
    async flags() {
      const { data } = await sb.from('feature_flags').select('key,enabled');
      return { ...defaultFlags, ...Object.fromEntries((data ?? []).map((f) => [f.key, f.enabled])) };
    },
    async gentleman(text, tone) {
      const { data, error } = await sb.functions.invoke('gentleman', { body: { text, tone } });
      if (error) {
        let code = 'ai_error';
        try { code = (await (error as { context?: Response }).context?.json())?.error ?? code; } catch { /* nic */ }
        throw new BackendError(code);
      }
      return data.text as string;
    },
    async savePushSubscription(sub) {
      const { error } = await sb.from('push_subscriptions').upsert({
        user_id: await uid(), endpoint: sub.endpoint, p256dh: sub.keys?.p256dh, auth: sub.keys?.auth,
      }, { onConflict: 'endpoint' });
      fail(error);
    },
    async notifyPartner(message_id) {
      await sb.functions.invoke('notify', { body: { message_id } }).catch(() => undefined);
    },
  };
}

// ---------------------------------------------------------------------------
// Demo (vše v localStorage, partner je simulovaný)
// ---------------------------------------------------------------------------
interface DemoState {
  user: User | null;
  pair: (Pair & { invite_hash: string }) | null;
  messages: Message[];
}
const DEMO_KEY = 'hushki-demo-v1';
const PARTNER_ID = 'demo-partner';

function demoBackend(): Backend {
  const listeners = new Set<() => void>();
  const authListeners = new Set<() => void>();
  const load = (): DemoState => {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY) ?? '') as DemoState; } catch { return { user: null, pair: null, messages: [] }; }
  };
  const save = (s: DemoState) => {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(s)); } catch { /* nic */ }
    listeners.forEach((l) => l());
  };
  const wait = (ms = 250) => new Promise((r) => setTimeout(r, ms));
  const id = () => crypto.randomUUID();

  return {
    mode: 'demo',
    async getUser() { return load().user; },
    onAuthChange(cb) { authListeners.add(cb); return () => authListeners.delete(cb); },
    async signUp(email, _pw, name) {
      await wait();
      save({ ...load(), user: { id: 'demo-me', email, name } });
      authListeners.forEach((l) => l());
      return { needsConfirm: false };
    },
    async signIn(email) {
      await wait();
      const s = load();
      save({ ...s, user: s.user ?? { id: 'demo-me', email, name: email.split('@')[0] } });
      authListeners.forEach((l) => l());
    },
    async signOut() {
      try { localStorage.removeItem(DEMO_KEY); } catch { /* nic */ }
      authListeners.forEach((l) => l());
    },
    async updateName(name) { const s = load(); if (s.user) save({ ...s, user: { ...s.user, name } }); },
    async getPair() { return load().pair; },
    async createPair(invite_hash, key_check) {
      await wait();
      const s = load();
      const pair = { id: id(), user_a: s.user!.id, user_b: null, key_check, invite_hash, partner_name: '' };
      save({ ...s, pair });
      // partner se "připojí" za pár vteřin
      setTimeout(() => {
        const cur = load();
        if (cur.pair?.id === pair.id && !cur.pair.user_b) save({ ...cur, pair: { ...cur.pair, user_b: PARTNER_ID, partner_name: 'Partnerka' } });
      }, 4000);
      return pair;
    },
    async joinPair(invite_hash) {
      await wait();
      const s = load();
      if (s.pair && s.pair.invite_hash === invite_hash) return s.pair;
      throw new BackendError('demo_join');
    },
    async leavePair() { save({ ...load(), pair: null, messages: [] }); },
    async listMessages() { return [...load().messages].sort((a, b) => b.created_at.localeCompare(a.created_at)); },
    async sendMessage(pair_id, ciphertext, iv, meta = {}) {
      await wait();
      const s = load();
      const m: Message = { id: id(), pair_id, sender_id: s.user!.id, ciphertext, iv, meta, created_at: new Date().toISOString(), read_at: null };
      save({ ...s, messages: [...s.messages, m] });
      setTimeout(() => {
        const cur = load();
        save({ ...cur, messages: cur.messages.map((x) => (x.id === m.id ? { ...x, read_at: new Date().toISOString() } : x)) });
      }, 6000);
      return m;
    },
    async demoPartnerMessage(pair_id, ciphertext, iv) {
      const s = load();
      const m: Message = { id: id(), pair_id, sender_id: PARTNER_ID, ciphertext, iv, meta: {}, created_at: new Date().toISOString(), read_at: null };
      save({ ...s, messages: [...s.messages, m] });
    },
    async markRead(mid) {
      const s = load();
      save({ ...s, messages: s.messages.map((x) => (x.id === mid && !x.read_at ? { ...x, read_at: new Date().toISOString() } : x)) });
    },
    subscribe(_pairId, cb) {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => { if (e.key === DEMO_KEY) cb(); };
      window.addEventListener('storage', onStorage);
      return () => { listeners.delete(cb); window.removeEventListener('storage', onStorage); };
    },
    async templates() { return localTemplates; },
    async flags() { return defaultFlags; },
    async gentleman(text, tone) {
      await wait(900);
      const t = text.trim().replace(/\s+/g, ' ');
      const body = t.charAt(0).toUpperCase() + t.slice(1);
      const intro = { elegantni: 'Celý den mi nejdeš z hlavy.', romanticky: 'Myslím na tebe víc, než bych měl.', hravy: 'Mám pro tebe malé tajemství.' }[tone];
      return `${intro} ${body}${/[.!?…]$/.test(body) ? '' : '.'} Těším se na večer.`;
    },
    async savePushSubscription() { /* demo */ },
    async notifyPartner() { /* demo */ },
  };
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const backend: Backend = url && key ? supabaseBackend(url, key) : demoBackend();
