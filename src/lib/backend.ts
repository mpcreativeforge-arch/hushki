// Jednotné rozhraní k backendu. Bez konfigurace Supabase běží demo režim v prohlížeči.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import templatesJson from '../data/templates.json';
import featuresJson from '../data/features.json';
import { b64, unb64 } from './crypto';
import { clearVault } from './keystore';

export type Gender = 'muz' | 'zena' | 'neuvedeno';
export interface User { id: string; email: string; name: string; gender: Gender; privacyVersion?: number | null }
export interface Pair { id: string; user_a: string; user_b: string | null; key_check: string; partner_name: string; partner_gender: Gender; expires_at?: string | null }
export interface Message {
  id: string; pair_id: string; sender_id: string;
  ciphertext: string; iv: string; meta: Record<string, unknown>;
  created_at: string; read_at: string | null;
}
export interface Template {
  id: string; category: string; title: string; body: string;
  /** verze, když píše žena */
  body_zena?: string | null;
  /** jen pro pisatele tohoto pohlaví */
  pro?: 'muz' | 'zena' | null;
}

/** Nápady pro daného pisatele: vybere ženskou nebo mužskou verzi textu. */
export function templatesFor(list: Template[], writerFemale: boolean): Template[] {
  return list
    .filter((t) => !t.pro || t.pro === (writerFemale ? 'zena' : 'muz'))
    .map((t) => (writerFemale && t.body_zena ? { ...t, body: t.body_zena } : t));
}
export type Tone = 'elegantni' | 'romanticky' | 'hravy';

export interface Backend {
  mode: 'supabase' | 'demo';
  getUser(): Promise<User | null>;
  onAuthChange(cb: () => void): () => void;
  signUp(email: string, password: string, name: string, gender: Gender): Promise<{ needsConfirm: boolean }>;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Uloží souhlas se zásadami ochrany soukromí. */
  acceptPrivacy(version: number): Promise<void>;
  /** Smaže účet a všechna data (GDPR). */
  deleteAccount(): Promise<void>;
  updateProfile(name: string, gender: Gender): Promise<void>;
  getPairs(): Promise<Pair[]>;
  createPair(inviteHash: string, keyCheck: string): Promise<Pair>;
  joinPair(inviteHash: string): Promise<Pair>;
  leavePair(pairId: string): Promise<void>;
  /** Automatické smazání místnosti za daný počet sekund (null = vypnout). */
  setRoomExpiry(pairId: string, seconds: number | null): Promise<void>;
  listMessages(pairId: string): Promise<Message[]>;
  sendMessage(pairId: string, ciphertext: string, iv: string, meta?: Record<string, unknown>): Promise<Message>;
  markRead(id: string): Promise<void>;
  subscribe(pairId: string, cb: () => void): () => void;
  templates(): Promise<Template[]>;
  flags(): Promise<Record<string, boolean>>;
  gentleman(text: string, tone: Tone): Promise<string>;
  /** Nahraje už zašifrovaná data fotky, vrací cestu v úložišti. */
  uploadPhoto(pairId: string, data: Uint8Array): Promise<string>;
  downloadPhoto(path: string): Promise<Uint8Array>;
  savePushSubscription(sub: PushSubscriptionJSON): Promise<void>;
  notifyPartner(messageId: string): Promise<void>;
  /** Vlastní nápady uživatele, zašifrované. Vidí je jen on sám. */
  getIdeas(): Promise<{ ciphertext: string; iv: string } | null>;
  saveIdeas(ciphertext: string, iv: string): Promise<void>;
  /** jen demo: simulace partnera */
  demoPartnerMessage?(pairId: string, ciphertext: string, iv: string): Promise<void>;
}

const defaultFlags = Object.fromEntries(featuresJson.map((f) => [f.key, f.enabled]));
const localTemplates: Template[] = (templatesJson as Omit<Template, 'id'>[]).map((t, i) => ({ id: 'local-' + i, ...t }));

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
    for (const code of ['invalid_code', 'pair_full', 'too_many_rooms', 'not_authenticated']) {
      if (m.includes(code)) throw new BackendError(code);
    }
    throw new BackendError('server', m);
  };

  const withPartner = async (p: Omit<Pair, 'partner_name' | 'partner_gender'> | null): Promise<Pair | null> => {
    if (!p) return null;
    const me = await uid();
    const partnerId = p.user_a === me ? p.user_b : p.user_a;
    let partner_name = '';
    let partner_gender: Gender = 'neuvedeno';
    if (partnerId) {
      const { data } = await sb.from('profiles').select('display_name, gender').eq('id', partnerId).maybeSingle();
      partner_name = data?.display_name ?? '';
      partner_gender = (data?.gender as Gender) ?? 'neuvedeno';
    }
    return { ...p, partner_name, partner_gender };
  };

  return {
    mode: 'supabase',
    async getUser() {
      const { data } = await sb.auth.getSession();
      const u = data.session?.user;
      if (!u) return null;
      const { data: prof } = await sb.from('profiles').select('display_name, gender, privacy_version').eq('id', u.id).maybeSingle();
      return { id: u.id, email: u.email ?? '', name: prof?.display_name ?? '', gender: (prof?.gender as Gender) ?? 'neuvedeno', privacyVersion: prof?.privacy_version ?? null };
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') cb();
      });
      return () => data.subscription.unsubscribe();
    },
    async signUp(email, password, name, gender) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { display_name: name, gender } } });
      if (error) throw new BackendError('auth', error.message);
      return { needsConfirm: !data.session };
    },
    async signIn(email, password) {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw new BackendError('auth', error.message);
    },
    async signOut() { await sb.auth.signOut(); },
    async acceptPrivacy(version) {
      const { error } = await sb.from('profiles').update({ privacy_version: version, privacy_accepted_at: new Date().toISOString() }).eq('id', await uid());
      fail(error);
    },
    async deleteAccount() {
      fail((await sb.rpc('delete_my_account')).error);
      await sb.auth.signOut();
    },
    async updateProfile(name, gender) {
      const { error } = await sb.from('profiles').update({ display_name: name, gender }).eq('id', await uid());
      fail(error);
    },
    async uploadPhoto(pairId, data) {
      const path = `${pairId}/${crypto.randomUUID()}`;
      const { error } = await sb.storage.from('photos').upload(path, new Blob([data as BlobPart]), { contentType: 'application/octet-stream' });
      if (error) throw new BackendError('upload', error.message);
      return path;
    },
    async downloadPhoto(path) {
      const { data, error } = await sb.storage.from('photos').download(path);
      if (error || !data) throw new BackendError('download', error?.message);
      return new Uint8Array(await data.arrayBuffer());
    },
    async getPairs() {
      const me = await uid();
      const { data, error } = await sb.from('pairs').select('id,user_a,user_b,key_check,expires_at')
        .or(`user_a.eq.${me},user_b.eq.${me}`).order('created_at');
      fail(error);
      return (await Promise.all((data ?? []).map(withPartner))) as Pair[];
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
    async leavePair(pairId) { fail((await sb.rpc('leave_pair', { p_pair: pairId })).error); },
    async setRoomExpiry(pairId, seconds) { fail((await sb.rpc('set_room_expiry', { p_pair: pairId, p_seconds: seconds })).error); },
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
      const { data, error } = await sb.from('templates').select('id,category,title,body,body_zena,pro').order('sort');
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
    async getIdeas() {
      const { data, error } = await sb.from('user_ideas').select('ciphertext,iv').eq('user_id', await uid()).maybeSingle();
      fail(error);
      return data;
    },
    async saveIdeas(ciphertext, iv) {
      const { error } = await sb.from('user_ideas').upsert({ user_id: await uid(), ciphertext, iv, updated_at: new Date().toISOString() });
      fail(error);
    },
  };
}

// ---------------------------------------------------------------------------
// Demo (vše v localStorage, partner je simulovaný)
// ---------------------------------------------------------------------------
interface DemoState {
  user: User | null;
  /** Účet po odhlášení: data zůstávají, aby se po přihlášení vrátila. */
  account?: User | null;
  pairs: (Pair & { invite_hash: string })[];
  messages: Message[];
}
const DEMO_KEY = 'hushki-demo-v1';
const PARTNER_ID = 'demo-partner';
const DEMO_PHOTO = 'hushki-demo-photo-';
const DEMO_IDEAS = 'hushki-demo-ideas';
const demoPartner = (me: User | null, n: number): { partner_name: string; partner_gender: Gender } =>
  me?.gender === 'zena'
    ? { partner_name: ['Partner', 'Tomáš', 'Jakub', 'Ondřej'][n % 4], partner_gender: 'muz' }
    : { partner_name: ['Partnerka', 'Lucie', 'Klára', 'Tereza'][n % 4], partner_gender: 'zena' };

function wipeDemo() {
  try {
    localStorage.removeItem(DEMO_KEY);
    localStorage.removeItem(DEMO_IDEAS);
    Object.keys(localStorage).filter((k) => k.startsWith(DEMO_PHOTO)).forEach((k) => localStorage.removeItem(k));
  } catch { /* nic */ }
}

function demoBackend(): Backend {
  const listeners = new Set<() => void>();
  const authListeners = new Set<() => void>();
  const load = (): DemoState => {
    try {
      const s = JSON.parse(localStorage.getItem(DEMO_KEY) ?? '') as DemoState & { pair?: DemoState['pairs'][number] | null };
      if (!s.pairs) s.pairs = s.pair ? [s.pair] : []; // starší demo s jedním párem
      delete s.pair;
      return s;
    } catch { return { user: null, pairs: [], messages: [] }; }
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
    async signUp(email, _pw, name, gender) {
      await wait();
      // Nová registrace v demu začíná načisto (jinak by zdědila místnosti předchozího účtu).
      wipeDemo(); clearVault('demo-me');
      save({ user: { id: 'demo-me', email, name, gender }, pairs: [], messages: [] });
      authListeners.forEach((l) => l());
      return { needsConfirm: false };
    },
    async signIn(email) {
      await wait();
      const s = load();
      save({ ...s, user: s.user ?? s.account ?? { id: 'demo-me', email, name: email.split('@')[0], gender: 'neuvedeno' }, account: null });
      authListeners.forEach((l) => l());
    },
    async signOut() {
      // Jako u skutečného serveru: odhlášení nic nemaže, místnosti počkají na další přihlášení.
      const s = load();
      save({ ...s, user: null, account: s.user ?? s.account ?? null });
      authListeners.forEach((l) => l());
    },
    async deleteAccount() {
      wipeDemo();
      authListeners.forEach((l) => l());
    },
    async updateProfile(name, gender) { const s = load(); if (s.user) save({ ...s, user: { ...s.user, name, gender } }); },
    async acceptPrivacy(version) { const s = load(); if (s.user) save({ ...s, user: { ...s.user, privacyVersion: version } }); },
    async uploadPhoto(pairId, data) {
      const path = `${pairId}/${id()}`;
      try { localStorage.setItem(DEMO_PHOTO + path, b64(data)); } catch { throw new BackendError('upload', 'Úložiště prohlížeče je plné'); }
      return path;
    },
    async downloadPhoto(path) {
      const v = localStorage.getItem(DEMO_PHOTO + path);
      if (!v) throw new BackendError('download');
      return unb64(v);
    },
    async getPairs() {
      const s = load();
      const now = new Date().toISOString();
      const alive = s.pairs.filter((p) => !p.expires_at || p.expires_at > now);
      if (alive.length !== s.pairs.length) {
        const ids = new Set(alive.map((p) => p.id));
        save({ ...s, pairs: alive, messages: s.messages.filter((m) => ids.has(m.pair_id)) });
      }
      return alive.map(({ invite_hash: _h, ...p }) => p);
    },
    async setRoomExpiry(pairId, seconds) {
      const s = load();
      const expires_at = seconds === null ? null : new Date(Date.now() + seconds * 1000).toISOString();
      const m: Message = { id: id(), pair_id: pairId, sender_id: s.user!.id, ciphertext: '', iv: '', meta: { sys: 'expiry', seconds, expires_at }, created_at: new Date().toISOString(), read_at: new Date().toISOString() };
      save({ ...s, pairs: s.pairs.map((p) => (p.id === pairId ? { ...p, expires_at } : p)), messages: [...s.messages, m] });
    },
    async createPair(invite_hash, key_check) {
      await wait();
      const s = load();
      if (s.pairs.length >= 10) throw new BackendError('too_many_rooms');
      const n = s.pairs.length;
      const pair = { id: id(), user_a: s.user!.id, user_b: null, key_check, invite_hash, partner_name: '', partner_gender: 'neuvedeno' as Gender };
      save({ ...s, pairs: [...s.pairs, pair] });
      // partner se "připojí" za pár vteřin
      setTimeout(() => {
        const cur = load();
        save({ ...cur, pairs: cur.pairs.map((x) => (x.id === pair.id && !x.user_b ? { ...x, user_b: PARTNER_ID + '-' + n, ...demoPartner(cur.user, n) } : x)) });
      }, 4000);
      const { invite_hash: _h, ...out } = pair;
      return out;
    },
    async joinPair(invite_hash) {
      await wait();
      const p = load().pairs.find((x) => x.invite_hash === invite_hash);
      if (p) { const { invite_hash: _h, ...out } = p; return out; }
      throw new BackendError('demo_join');
    },
    async leavePair(pairId) { const s = load(); save({ ...s, pairs: s.pairs.filter((p) => p.id !== pairId), messages: s.messages.filter((m) => m.pair_id !== pairId) }); },
    async listMessages(pairId) { return load().messages.filter((m) => m.pair_id === pairId).sort((a, b) => b.created_at.localeCompare(a.created_at)); },
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
      const sender = s.pairs.find((p) => p.id === pair_id)?.user_b ?? PARTNER_ID;
      const m: Message = { id: id(), pair_id, sender_id: sender, ciphertext, iv, meta: {}, created_at: new Date().toISOString(), read_at: null };
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
    async getIdeas() {
      try { return JSON.parse(localStorage.getItem(DEMO_IDEAS) ?? 'null'); } catch { return null; }
    },
    async saveIdeas(ciphertext, iv) {
      try { localStorage.setItem(DEMO_IDEAS, JSON.stringify({ ciphertext, iv })); } catch { throw new BackendError('storage'); }
    },
    async savePushSubscription() { /* demo */ },
    async notifyPartner() { /* demo */ },
  };
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const backend: Backend = url && key ? supabaseBackend(url, key) : demoBackend();
