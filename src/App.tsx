import { useCallback, useEffect, useRef, useState } from 'react';
import { backend, type Pair, type User } from './lib/backend';
import { createMaster, derivePairKey, keyCheck, lockKey, unlockKey, unlockMaster, unwrapRoom, wrapRoom } from './lib/crypto';
import { clearPhotoCache, encodePayload } from './lib/payload';
import { clearVault, loadVault, pinLength, saveVault, type Vault } from './lib/keystore';
import { AuthScreen } from './screens/AuthScreen';
import { PairScreen } from './screens/PairScreen';
import { SetPinScreen, LockScreen } from './screens/LockScreens';
import { ChatScreen } from './screens/ChatScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';

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
    if (!loadVault(u.id)) return setStage({ name: 'pair', mode: list.length ? 'restore' : 'first' });
    setStage({ name: 'locked' });
  }, [refreshPairs]);

  useEffect(() => {
    route();
    return backend.onAuthChange(() => route());
  }, [route]);

  const lockNow = useCallback(() => { setMaster(null); setKeys({}); clearPhotoCache(); setStage({ name: 'locked' }); }, []);

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
    if (user) clearVault(user.id);
    await backend.signOut();
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
          onLogout={logout}
        />
      );
      break;
  }

  return (
    <>
      {backend.mode === 'demo' && <div className="demo-banner">Demo režim: data zůstávají jen v tomto prohlížeči</div>}
      {screen}
    </>
  );
}
