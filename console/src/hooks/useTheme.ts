// Light, dark or follow the system. Stored per browser (a viewer convenience, never the repo).
import { useCallback, useEffect, useState } from 'react';

export type Theme = 'system' | 'light' | 'dark';
const KEY = 'mama.theme';
const read = (): Theme => { try { const v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'system'; } catch { return 'system'; } };

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(read);
  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'system') el.removeAttribute('data-theme'); else el.setAttribute('data-theme', theme);
    try { theme === 'system' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, theme); } catch { /* private mode */ }
  }, [theme]);
  const cycle = useCallback(() => setTheme(t => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system')), []);
  return { theme, cycle };
}
