// Global keyboard map (spec §5.4). Ignores keys typed into fields, except ⌘K and ⌘↓.
import { useEffect, useRef } from 'react';

export interface Hotkeys { palette: () => void; slash: () => void; jump: () => void; help: () => void; go: (k: 't' | 'c' | 'k' | 'b' | 'r') => void }

const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
};

export function useHotkeys(h: Hotkeys) {
  const ref = useRef(h);
  ref.current = h;
  useEffect(() => {
    let gAt = 0;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current.palette(); return; }
      if (mod && e.key === 'ArrowDown') { e.preventDefault(); ref.current.jump(); return; }
      if (mod || e.altKey || typing(e.target)) return;
      if (e.key === '/') { e.preventDefault(); ref.current.slash(); return; }
      if (e.key === '?') { e.preventDefault(); ref.current.help(); return; }
      if (e.key === 'g') { gAt = Date.now(); return; }
      if (Date.now() - gAt < 900 && (e.key === 't' || e.key === 'c' || e.key === 'k' || e.key === 'b' || e.key === 'r')) { e.preventDefault(); gAt = 0; ref.current.go(e.key); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
