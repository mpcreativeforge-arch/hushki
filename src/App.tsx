import { useCallback, useEffect, useRef, useState } from 'react';
import { InstallSheet } from './components/InstallSheet';
import { platform, shouldOfferInstall } from './lib/install';
import { backend, recoveryLink, type Pair, type User } from './lib/backend';
import { createMaster, decryptText, derivePairKey, encryptText, keyCheck, lockKey, unlockKey, unlockMaster, unwrapRoom, wrapRoom } from './lib/crypto';
import { clearPhotoCache, encodePayload } from './lib/payload';
import { clearVault, loadVault, pinLength, saveVault, type Vault } from './lib/keystore';
import { clearSession, loadSession, saveSession, touchSession } from './lib/session';
import { AuthScreen, NewPasswordScreen } from './screens/AuthScreen';
import { PairScreen } from './screens/PairScreen';
import { SetPinScreen, LockScreen } from './screens/LockScreens';
import { ChatScreen } from './screens/ChatScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { PrivacyConsent } from './components/Privacy';
import { PRIVACY_VERSION } from './data/privacy';
import { Splash } from './components/Splash';
import { ProfileStep } from './components/ProfileStep';
import { Toaster, toast } from './components/Toast';
import { isPremium } from './lib/premium';
import { t, useLang } from './lib/i18n';
import { clearInvite, takeInvite } from './lib/invite';

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
  const [recovery, setRecovery] = useState(recoveryLink);
  const [user, setUser] = useState<User | null>(null);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [master, setMaster] = useState<CryptoKey | null>(null);
  const [keys, setKeys] = useState<Record<string, CryptoKey>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const hiddenAt = useRef<number | null>(null);
  useLang(); // po přepnutí jazyka se překreslí celá aplikace
  const [invite, setInvite] = useState<string | null>(() => takeInvite());
  const dropInvite = useCallback(() => { clearInvite(); setInvite(null); }, []);
  // úvodní obrazovka jen při spuštění, ne při každém obnovení stránky
  const [splash, setSplash] = useState(() => { try { return !sessionStorage.getItem('hushki.splash'); } catch { return true; } });
  const endSplash = useCallback(() => { setSplash(false); try { sessionStorage.setItem('hushki.splash', '1'); } catch { /* */ } }, []);

  const refreshPairs = useCallback(async () => {
    const list = await backend.getPairs().catch(() => null);
    if (list) setPairs(list);
    return list ?? [];
  }, []);

  const refreshUser = useCallback(async () => { const u = await backend.getUser(); if (u) setUser(u); return u; }, []);

  // Návrat z platební stránky Stripe: Premium odemkne webhook, takže chvíli zkoušet znovu načíst účet.
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('premium');
    if (!q) return;
    history.replaceState(null, '', location.pathname + location.hash);
    if (q !== 'ok') return;
    toast(t('Děkujeme! Premium se odemyká…', 'Thank you! Unlocking Premium…'));
    let n = 0;
    const tick = async () => {
      const u = await refreshUser();
      if (isPremium(u)) toast(t('Premium je aktivní 👑', 'Premium is active 👑'));
      else if (++n < 10) setTimeout(tick, 3000);
    };
    setTimeout(tick, 1500);
  }, [refreshUser]);

  // Rozhodne, kam uživatele poslat po načtení / přihlášení.
  const route = useCallback(async () => {
    const u = await backend.getUser();
    setUser(u);
    setMaster(null); setKeys({});
    if (!u) return setStage({ name: 'auth' });
    backend.flags().then(setFlags).catch(() => undefined);
    const list = await refreshPairs();
    const vault = loadVault(u.id);
    if (!vault) return setStage({ name: 'pair', mode: list.length && !takeInvite() ? 'restore' : 'first' });
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

  // Pozvánka odkazem: po odemčení rovnou nabídni připojení k místnosti.
  useEffect(() => {
    if (invite && stage.name === 'home') setStage({ name: 'pair', mode: 'add' });
  }, [invite, stage.name]);

  // Odkaz s pozvánkou otevřený v už spuštěné aplikaci
  useEffect(() => {
    const onHash = () => { const c = takeInvite(); if (c) setInvite(c); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Demo: partner pošle první vzkaz, jakmile se "připojí".
  useEffect(() => {
    if (backend.mode !== 'demo') return;
    for (const p of pairs) {
      const key = keys[p.id];
      if (!p.user_b || !key) continue;
      const flag = 'hushki-demo-welcome-' + p.id;
      try { if (localStorage.getItem(flag)) continue; localStorage.setItem(flag, '1'); } catch { continue; }
      setTimeout(async () => {
        const { ciphertext, iv } = await encodePayload(key, { t: 'sticker', sticker: p.partner_gender === 'zena' ? 'f01' : 'm01', text: t('Ahoj! Tady si píšeme jen samolepkami. Zkus mi nějakou poslat a mrkni i na Legendu. 🤫', 'Hi! Here we talk only in stickers. Send me one and check out the Legend too. 🤫') });
        await backend.demoPartnerMessage?.(p.id, ciphertext, iv);
      }, 2500);
    }
  }, [pairs, keys]);

  /** Uloží klíč místnosti do trezoru (hlavní klíč musí být odemčený). */
  const addRoomKey = async (m: CryptoKey, code: string, pair: Pair) => {
    const key = await derivePairKey(code);
    if ((await keyCheck(key)) !== pair.key_check) throw new Error('key_mismatch');
    const vault = loadVault(user!.id) as Vault;
    const wrapped = await wrapRoom(m, key);
    const usable = await unwrapRoom(m, wrapped);
    // kód si pamatujeme (zašifrovaný klíčem místnosti), aby ho šlo po zadání PINu znovu zobrazit
    const c = await encryptText(usable, code);
    vault.rooms[pair.id] = { ...wrapped, code: { ct: c.ciphertext, iv: c.iv } };
    saveVault(user!.id, vault);
    setKeys((k) => ({ ...k, [pair.id]: usable }));
  };

  const roomCode = async (pairId: string): Promise<string | null> => {
    const v = user ? loadVault(user.id) : null;
    const c = v && v.v === 2 ? v.rooms[pairId]?.code : undefined;
    if (!c || !keys[pairId]) return null;
    try { return await decryptText(keys[pairId], c.ct, c.iv); } catch { return null; }
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

  const needsConsent = !!user && !recovery && stage.name !== 'auth' && stage.name !== 'loading' && user.privacyVersion !== PRIVACY_VERSION;
  const acceptPrivacy = async () => {
    await backend.acceptPrivacy(PRIVACY_VERSION);
    setUser((u) => (u ? { ...u, privacyVersion: PRIVACY_VERSION } : u));
  };

  const room = stage.name === 'room' ? pairs.find((p) => p.id === stage.pairId) : undefined;
  // místnost zmizela (partner ji zrušil) → zpět na seznam
  useEffect(() => {
    if (stage.name === 'room' && !pairs.some((p) => p.id === stage.pairId)) setStage({ name: 'home' });
  }, [stage, pairs]);

  // Na mobilu hned nabídnout instalaci na plochu, na počítači zůstává web.
  const [offerInstall, setOfferInstall] = useState(false);
  useEffect(() => {
    if (splash || platform() === 'desktop' || !shouldOfferInstall()) return;
    const tm = setTimeout(() => setOfferInstall(true), 1200);
    return () => clearTimeout(tm);
  }, [splash]);

  let screen: React.ReactNode = null;
  switch (stage.name) {
    case 'loading':
      screen = <div className="app"><div className="grow" style={{ display: 'grid', placeItems: 'center' }}><span className="spinner" /></div></div>;
      break;
    case 'auth':
      screen = <AuthScreen invited={!!invite} />;
      break;
    case 'pair':
      screen = (
        <PairScreen
          key={invite ?? 'manual'}
          mode={stage.mode} existing={stage.pair ?? null} known={pairs}
          onPaired={async (c, p) => { setInvite(null); await onPaired(c, p); }} onLogout={logout}
          onBack={master ? () => { dropInvite(); setStage({ name: 'home' }); } : undefined}
          invite={invite} onDropInvite={() => { dropInvite(); if (master) setStage({ name: 'home' }); }}
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
          onLock={lockNow} onLogout={logout} onLeave={() => leave(room.id)} getCode={() => roomCode(room.id)} onPremiumChange={refreshUser}
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
          onLogout={logout} onDeleteAccount={deleteAccount} onPremiumChange={refreshUser}
        />
      );
      break;
  }
  // odkaz z e-mailu pro obnovu hesla → nejdřív nové heslo
  if (recovery && user && stage.name !== 'loading') {
    screen = <NewPasswordScreen onDone={() => { history.replaceState(null, '', location.pathname + location.search); setRecovery(false); }} />;
  }

  return (
    <>
      {backend.mode === 'demo' && <div className="demo-banner">{t('Demo režim: data zůstávají jen v tomto prohlížeči', 'Demo mode: data stays in this browser only')}</div>}
      {screen}
      <Toaster />
      {splash && <Splash onDone={endSplash} />}
      {!needsConsent && user && !user.name && (stage.name === 'room' || stage.name === 'home') && (
        <ProfileStep user={user} onDone={(name, gender) => setUser({ ...user, name, gender })} />
      )}
      {offerInstall && !recovery && !needsConsent && (stage.name === 'auth' || (stage.name === 'home' && !!user?.name)) && (
        <InstallSheet onClose={() => setOfferInstall(false)} />
      )}
      {needsConsent && <PrivacyConsent updated={user!.privacyVersion != null} onAccept={acceptPrivacy} onDecline={logout} />}
    </>
  );
}
