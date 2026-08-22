import { useEffect, useState } from 'react';

export type ThemePref = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'budget-theme';

export function getStoredTheme(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function resolveIsDark(pref: ThemePref): boolean {
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(pref: ThemePref) {
  const isDark = resolveIsDark(pref);
  document.documentElement.classList.toggle('dark', isDark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#151F19' : '#16A34A');
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemePref>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (pref: ThemePref) => {
    try {
      localStorage.setItem(STORAGE_KEY, pref);
    } catch {
      // ignore (private browsing / storage disabled)
    }
    setThemeState(pref);
  };

  return { theme, setTheme };
}
