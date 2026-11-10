import { useCallback, useEffect, useRef, useState } from 'react';
import { backend, type Message, type Pair, type User } from './lib/backend';
import { derivePairKey, encryptText, keyCheck, lockKey, unlockKey } from './lib/crypto';
import { clearLocked, loadLocked, saveLocked } from './lib/keystore';
import { AuthScreen } from './screens/AuthScreen';
import { PairScreen } from './screens/PairScreen';
import { SetPinScreen, LockScreen } from './screens/LockScreens';
import { InboxScreen } from './screens/InboxScreen';
import { ComposeScreen } from './screens/ComposeScreen';
import { ReadScreen } from './screens/ReadScreen';
import { SettingsScreen } from './screens/SettingsScreen';

export const PIN_LENGTH = 6;
const AUTO_LOCK_MS = 30_000;

type Stage =
  | { name: 'loading' }
  | { name: 'auth' }
  | { name: 'pair'; restore: boolean }
  | { name: 'setpin'; code: string; pair: Pair }
  | { name: 'locked' }
  | { name: 'inbox' }
  | { name: 'compose' }
  | { name: 'read'; message: Message }
  | { name: 'settings' };

export function App() {
  const [stage, setStage] = useState<Stage>({ name: 'loading' });
  const [user, setUser] = useState<User | null>(null);
  const [pair, setPair] = useState<Pair | null>(null);
  const [pairKey, setPairKey] = useState<CryptoKey | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const hiddenAt = useRef<number | null>(null);

  // Rozhodne, kam uživatele poslat po načtení / přihlášení.
  const route = useCallback(async () => {
    const u = await backend.getUser();
    setUser(u);
    setPairKey(null);
    if (!u) return setStage({ name: 'auth' });
    backend.flags().then(setFlags).catch(() => undefined);
    const p = await backend.getPair().catch(() => null);
    setPair(p);
    if (!p) return setStage({ name: 'pair', restore: false });
    const stored = loadLocked(u.id);
    if (!stored || stored.pairId !== p.id) return setStage({ name: 'pair', restore: true });
    setStage({ name: 'locked' });
  }, []);

  useEffect(() => {
    route();
    return backend.onAuthChange(() => route());
  }, [route]);

  // Automatické zamčení po odchodu z aplikace.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) hiddenAt.current = Date.now();
      else if (hiddenAt.current && Date.now() - hiddenAt.current > AUTO_LOCK_MS && pairKey) {
        setPairKey(null);
        setStage({ name: 'locked' });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pairKey]);

  // Udržuj info o páru aktuální (připojení partnera, jméno).
  useEffect(() => {
    if (!pair) return;
    return backend.subscribe(pair.id, () => {
      backend.getPair().then((p) => p && setPair(p)).catch(() => undefined);
    });
  }, [pair?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Demo: partner pošle první vzkaz, jakmile se "připojí".
  useEffect(() => {
    if (backend.mode !== 'demo' || !pair?.user_b || !pairKey || !user) return;
    const flag = 'hushki-demo-welcome-' + pair.id;
    try { if (localStorage.getItem(flag)) return; localStorage.setItem(flag, '1'); } catch { return; }
    setTimeout(async () => {
      const { ciphertext, iv } = await encryptText(pairKey, 'Ahoj, tohle je ukázkový vzkaz od partnerky. Vidíš ho jen ty, protože je zašifrovaný klíčem vašeho páru. 🤫');
      await backend.demoPartnerMessage?.(pair.id, ciphertext, iv);
    }, 2500);
  }, [pair?.user_b, pairKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPaired = async (code: string, p: Pair) => {
    setPair(p);
    setStage({ name: 'setpin', code, pair: p });
  };

  const onPinSet = async (pin: string) => {
    if (stage.name !== 'setpin' || !user) return;
    const key = await derivePairKey(stage.code);
    if ((await keyCheck(key)) !== stage.pair.key_check) throw new Error('key_mismatch');
    saveLocked(user.id, { pairId: stage.pair.id, locked: await lockKey(key, pin) });
    setPairKey(await unlockKey(loadLocked(user.id)!.locked, pin));
    setStage({ name: 'inbox' });
  };

  const onUnlock = async (pin: string) => {
    if (!user) return false;
    const stored = loadLocked(user.id);
    if (!stored) return false;
    try {
      setPairKey(await unlockKey(stored.locked, pin));
      setStage({ name: 'inbox' });
      return true;
    } catch {
      return false;
    }
  };

  const onForgotPin = () => {
    if (user) clearLocked(user.id);
    setStage({ name: 'pair', restore: true });
  };

  const lockNow = () => { setPairKey(null); setStage({ name: 'locked' }); };

  const leave = async () => {
    await backend.leavePair();
    if (user) clearLocked(user.id);
    route();
  };

  const logout = async () => {
    if (user) clearLocked(user.id);
    await backend.signOut();
  };

  let screen: React.ReactNode = null;
  switch (stage.name) {
    case 'loading':
      screen = <div className="app"><div className="grow" style={{ display: 'grid', placeItems: 'center' }}><span className="spinner" /></div></div>;
      break;
    case 'auth':
      screen = <AuthScreen />;
      break;
    case 'pair':
      screen = <PairScreen restore={stage.restore} existing={pair} onPaired={onPaired} onLogout={logout} />;
      break;
    case 'setpin':
      screen = <SetPinScreen length={PIN_LENGTH} code={stage.code} onSet={onPinSet} />;
      break;
    case 'locked':
      screen = <LockScreen length={PIN_LENGTH} onUnlock={onUnlock} onForgot={onForgotPin} />;
      break;
    case 'inbox':
      screen = (
        <InboxScreen
          user={user!} pair={pair!} pairKey={pairKey!}
          onCompose={() => setStage({ name: 'compose' })}
          onOpen={(m) => setStage({ name: 'read', message: m })}
          onSettings={() => setStage({ name: 'settings' })}
          onLock={lockNow}
        />
      );
      break;
    case 'compose':
      screen = <ComposeScreen user={user!} pair={pair!} pairKey={pairKey!} flags={flags} onDone={() => setStage({ name: 'inbox' })} />;
      break;
    case 'read':
      screen = <ReadScreen user={user!} pair={pair!} pairKey={pairKey!} message={stage.message} onBack={() => setStage({ name: 'inbox' })} />;
      break;
    case 'settings':
      screen = (
        <SettingsScreen
          user={user!} pair={pair!} flags={flags}
          onBack={() => setStage({ name: 'inbox' })}
          onRenamed={(name) => setUser({ ...user!, name })}
          onChangePin={() => { if (user) clearLocked(user.id); setStage({ name: 'pair', restore: true }); }}
          onLeave={leave} onLogout={logout}
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
