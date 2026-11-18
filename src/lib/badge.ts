// Číslo na ikoně aplikace (Badging API). Android Chrome, Edge a iPhone/iPad od iOS 16.4
// (jen aplikace přidaná na plochu a se zapnutými upozorněními). Bez podpory se nic nestane.
type BadgeNav = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

export function setBadge(count: number) {
  const nav = navigator as BadgeNav;
  try {
    if (count > 0) nav.setAppBadge?.(count)?.catch(() => undefined);
    else nav.clearAppBadge?.()?.catch(() => undefined);
  } catch { /* nepodporováno */ }
}
