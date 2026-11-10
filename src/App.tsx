import { useCallback, useEffect, useRef, useState } from 'react';
import { backend, type Pair, type User } from './lib/backend';
import { createMaster, derivePairKey, keyCheck, lockKey, unlockKey, unlockMaster, unwrapRoom, wrapRoom } from './lib/crypto';
import { clearPhotoCache, encodePayload } from './lib/payload';
import { clearVault, loadVault, pinLength, saveVault, type Vault } from './lib/keystore';
import { clearSession, loadSession, saveSession, touchSession } from './lib/session';
import { AuthScreen } from './screens/AuthScreen';
import { PairScreen } from './screens/PairScreen';
import { SetPinScreen, LockScreen } from './screens/LockScreens';
import { ChatScreen } from './screens/ChatScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PrivacyConsent } from './components/Privacy';
import { PRIVACY_VERSION } from './data/privacy';

export const PIN_LENGTH = 4;
const AUTO_LOCK_MS = 30_000;

type Stage =
  | { name: 'loading' }
  | { name: 'auth' }
  /** first: první místnost / obnova na novém zařízení; add: další místnost; restore: klíč k existující místnosti */
  | { name: 'pair'; mode: 'first' | 'add' | 'restore'; pair?: Pair }
  | { name: 'setpin'; code?: string; pair?: Pair }
  | { name: 'locked' }
  | { name: 'home' }
  | { name: 'room'; pairId: string }
  | { name: 'settings' };

export function App() {
  const [stage, setStage] = useState<Stage>({ name: 'loading' });
  const [user, setUser] = useState<User | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [master, setMaster] = useState<CryptoKey | null>(null);
  const [keys, setKeys] = useState<Record<string, CryptoKey>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const hiddenAt = useRef<number | null>(null);

  const refreshPairs = useCallback(async () => {
    const list = await backend.getPairs().catch(() => null);
    if (list) setPairs(list);
    return list ?? [];
  }, []);

  // Rozhodne, kam uživatele poslat po načtení / přihlášení.
  const route = useCallback(async () => {
    const u = await backend.getUser();
    setUser(u);
    setMaster(null); setKeys({});
    if (!u) return setStage({ name: 'auth' });
    backend.flags().then(setFlags).catch(() => undefined);
    const list = await refreshPairs();
    const vault = loadVault(u.id);
    if (!vault) return setStage({ name: 'pair', mode: list.length ? 'restore' : 'first' });
    // obnovení stránky v otevřené relaci → bez PINu
    const sess = vault.v === 2 ? await loadSession(u.id) : null;
    if (sess && vault.v === 2) {
      try {
        const out: Record<string, CryptoKey> = {};
        for (const [id, r] of Object.entries(vault.rooms)) out[id] = await unwrapRoom(sess.master, r);
        setMaster(sess.master); setKeys(out);
        return setStage(sess.room && out[sess.room] && list.some((p) => p.id === sess.room) ? { name: 'room', pairId: sess.room } : { name: 'home' });
      } catch { clearSession(); }
    }
    setStage({ name: 'locked' });
  }, [refreshPairs]);

  useEffect(() => {
    route();
    return backend.onAuthChange(() => route());
  }, [route]);

  const lockNow = useCallback(() => { clearSession(); setMaster(null); setKeys({}); clearPhotoCache(); setStage({ name: 'locked' }); }, []);

  // relace: uložit po odemčení, prodlužovat a pamatovat si otevřenou místnost
  useEffect(() => {
    if (!master || !user) return;
    saveSession(user.id, master, stage.name === 'room' ? stage.pairId : undefined);
  }, [master, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!master) return;
    touchSession(stage.name === 'room' ? stage.pairId : null);
    const t = setInterval(() => { if (!document.hidden) touchSession(); }, 30_000);
    return () => clearInterval(t);
  }, [master, stage]);

  // Automatické zamčení po odchodu z aplikace.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > AUTO_LOCK_MS && master) lockNow();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [master, lockNow]);

  // Udržuj seznam místností aktuální (připojení partnera, jméno).
  const pairIds = pairs.map((p) => p.id).join(',');
  useEffect(() => {
    if (!pairIds) return;
    const offs = pairIds.split(',').map((id) => backend.subscribe(id, () => { refreshPairs(); }));
    return () => offs.forEach((off) => off());
  }, [pairIds, refreshPairs]);

  // Místnost s nastaveným smazáním zmizí, jakmile vyprší.
  const nextExpiry = pairs.map((p) => p.expires_at).filter(Boolean).sort()[0];
  useEffect(() => {
    if (!nextExpiry) return;
    const ms = Math.max(0, new Date(nextExpiry).getTime() - Date.now()) + 1000;
    const t = setTimeout(() => { refreshPairs(); }, Math.min(ms, 2_000_000_000));
    return () => clearTimeout(t);
  }, [nextExpiry, refreshPairs]);

  // Demo: partner pošle první vzkaz, jakmile se "připojí".
  useEffect(() => {
    if (backend.mode !== 'demo') return;
    for (const p of pairs) {
      const key = keys[p.id];
      if (!p.user_b || !key) continue;
      const flag = 'hushki-demo-welcome-' + p.id;
      try { if (localStorage.getItem(flag)) continue; localStorage.setItem(flag, '1'); } catch { continue; }
      setTimeout(async () => {
        const { ciphertext, iv } = await encodePayload(key, { t: 'text', text: 'Ahoj, tohle je ukázkový vzkaz. Vidíš ho jen ty, protože je zašifrovaný klíčem vaší místnosti. Zkus mi odpovědět, poslat fotku nebo samolepku. 🤫' });
        await backend.demoPartnerMessage?.(p.id, ciphertext, iv);
      }, 2500);
    }
  }, [pairs, keys]);

  /** Uloží klíč místnosti do trezoru (hlavní klíč musí být odemčený). */
  const addRoomKey = async (m: CryptoKey, code: string, pair: Pair) => {
    const key = await derivePairKey(code);
    if ((await keyCheck(key)) !== pair.key_check) throw new Error('key_mismatch');
    const vault = loadVault(user!.id) as Vault;
    vault.rooms[pair.id] = await wrapRoom(m, key);
    saveVault(user!.id, vault);
    const usable = await unwrapRoom(m, vault.rooms[pair.id]);
    setKeys((k) => ({ ...k, [pair.id]: usable }));
  };

  const onPaired = async (code: string, p: Pair) => {
    await refreshPairs();
    if (!master) return setStage({ name: 'setpin', code, pair: p });
    await addRoomKey(master, code, p);
    setStage({ name: 'room', pairId: p.id });
  };

  const onPinSet = async (pin: string) => {
    if (stage.name !== 'setpin' || !user) return;
    if (!stage.code) {
      // změna PINu: stejný hlavní klíč, nový zámek
      const vault = loadVault(user.id) as Vault;
      saveVault(user.id, { ...vault, master: await lockKey(master!, pin), len: pin.length });
      return setStage({ name: 'settings' });
    }
    const m = await createMaster();
    saveVault(user.id, { v: 2, master: await lockKey(m, pin), rooms: {}, len: pin.length });
    await addRoomKey(m, stage.code, stage.pair!);
    setMaster(m);
    setStage({ name: 'room', pairId: stage.pair!.id });
  };

  const onUnlock = async (pin: string) => {
    if (!user) return false;
    const stored = loadVault(user.id);
    if (!stored) return false;
    try {
      let vault: Vault;
      let m: CryptoKey;
      if (stored.v !== 2) {
        // převod ze staré verze (jeden pár zamčený přímo PINem)
        const old = await unlockKey(stored.locked, pin, true);
        m = await createMaster();
        vault = { v: 2, master: await lockKey(m, pin), rooms: { [stored.pairId]: await wrapRoom(m, old) }, len: pin.length };
        saveVault(user.id, vault);
      } else {
        vault = stored;
        m = await unlockMaster(vault.master, pin);
      }
      const out: Record<string, CryptoKey> = {};
      for (const [id, r] of Object.entries(vault.rooms)) out[id] = await unwrapRoom(m, r);
      setMaster(m); setKeys(out);
      await refreshPairs();
      setStage({ name: 'home' });
      return true;
    } catch {
      return false;
    }
  };

  const onForgotPin = () => {
    clearSession();
    if (user) clearVault(user.id);
    route();
  };

  const leave = async (pairId: string) => {
    await backend.leavePair(pairId);
    if (user) {
      const vault = loadVault(user.id);
      if (vault?.v === 2) { delete vault.rooms[pairId]; saveVault(user.id, vault); }
    }
    setKeys(({ [pairId]: _gone, ...rest }) => rest);
    await refreshPairs();
    setStage({ name: 'home' });
  };

  const logout = async () => {
    // Trezor s klíči místností zůstává (chrání ho PIN), takže po přihlášení stačí zadat PIN.
    clearSession();
    await backend.signOut();
  };

  const deleteAccount = async () => {
    const id = user?.id;
    await backend.deleteAccount();
    if (id) clearVault(id);
  };

  const needsConsent = !!user && stage.name !== 'auth' && stage.name !== 'loading' && user.privacyVersion !== PRIVACY_VERSION;
  const acceptPrivacy = async () => {
    await backend.acceptPrivacy(PRIVACY_VERSION);
    setUser((u) => (u ? { ...u, privacyVersion: PRIVACY_VERSION } : u));
  };

  const room = stage.name === 'room' ? pairs.find((p) => p.id === stage.pairId) : undefined;
  // místnost zmizela (partner ji zrušil) → zpět na seznam
  useEffect(() => {
    if (stage.name === 'room' && !pairs.some((p) => p.id === stage.pairId)) setStage({ name: 'home' });
  }, [stage, pairs]);

  let screen: React.ReactNode = null;
  switch (stage.name) {
    case 'loading':
      screen = <div className="app"><div className="grow" style={{ display: 'grid', placeItems: 'center' }}><span className="spinner" /></div></div>;
      break;
    case 'auth':
      screen = <AuthScreen />;
      break;
    case 'pair':
      screen = (
        <PairScreen
          mode={stage.mode} existing={stage.pair ?? null} known={pairs}
          onPaired={onPaired} onLogout={logout}
          onBack={master ? () => setStage({ name: 'home' }) : undefined}
        />
      );
      break;
    case 'setpin':
      screen = <SetPinScreen length={PIN_LENGTH} change={!stage.code} onSet={onPinSet} onCancel={!stage.code ? () => setStage({ name: 'settings' }) : undefined} />;
      break;
    case 'locked':
      screen = <LockScreen length={pinLength(user!.id, PIN_LENGTH)} onUnlock={onUnlock} onForgot={onForgotPin} />;
      break;
    case 'home':
      screen = (
        <HomeScreen
          user={user!} pairs={pairs} keys={keys}
          onOpen={(p) => setStage(keys[p.id] ? { name: 'room', pairId: p.id } : { name: 'pair', mode: 'restore', pair: p })}
          onAdd={() => setStage({ name: 'pair', mode: 'add' })}
          onSettings={() => setStage({ name: 'settings' })}
          onLock={lockNow} onLogout={logout}
        />
      );
      break;
    case 'room':
      screen = room && keys[room.id] ? (
        <ChatScreen
          key={room.id}
          user={user!} pair={room} pairKey={keys[room.id]} flags={flags}
          onBack={() => setStage({ name: 'home' })}
          onSettings={() => setStage({ name: 'settings' })}
          onLock={lockNow} onLogout={logout} onLeave={() => leave(room.id)}
        />
      ) : <div className="app"><div className="grow" style={{ display: 'grid', placeItems: 'center' }}><span className="spinner" /></div></div>;
      break;
    case 'settings':
      screen = (
        <SettingsScreen
          user={user!} flags={flags}
          onBack={() => setStage({ name: 'home' })}
          onProfile={(name, gender) => setUser({ ...user!, name, gender })}
          onChangePin={() => setStage({ name: 'setpin' })}
          onLogout={logout} onDeleteAccount={deleteAccount}
        />
      );
      break;
  }

  return (
    <>
      {backend.mode === 'demo' && <div className="demo-banner">Demo režim: data zůstávají jen v tomto prohlížeči</div>}
      {screen}
      {needsConsent && <PrivacyConsent updated={user!.privacyVersion != null} onAccept={acceptPrivacy} onDecline={logout} />}
    </>
  );
}
