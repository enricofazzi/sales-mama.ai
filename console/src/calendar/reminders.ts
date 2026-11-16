// Opt-in reminders (spec §6.3): a browser notification 15 minutes before each live appointment, and a
// badge in the tab title. Opt-in is stored per browser; nothing leaves the machine.
import { useEffect, useState } from 'react';
import type { Calendar } from './time';
import { hhmm } from './time';

const KEY = 'mama.reminders';
const LEAD = 15 * 60_000;

export function useReminders(cal: Calendar | null) {
  const [on, setOn] = useState(() => { try { return localStorage.getItem(KEY) === 'on'; } catch { return false; } });
  const supported = typeof Notification !== 'undefined';
  const enable = async () => {
    if (!supported) return;
    const p = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    const ok = p === 'granted';
    setOn(ok);
    try { localStorage.setItem(KEY, ok ? 'on' : 'off'); } catch { /* private mode */ }
  };
  const disable = () => { setOn(false); try { localStorage.setItem(KEY, 'off'); } catch { /* private mode */ } };

  useEffect(() => {
    if (!cal) return;
    const timers: number[] = [];
    const base = document.title.replace(/^\(\d+\) /, '');
    const soon = () => cal.items.filter(i => i.live && !i.all_day && (() => { const ms = new Date(i.start).getTime() - Date.now(); return ms > 0 && ms <= LEAD; })()).length;
    const badge = () => { const n = soon(); document.title = n ? `(${n}) ${base}` : base; };
    badge();
    const tick = window.setInterval(badge, 60_000);
    if (on && supported && Notification.permission === 'granted') {
      for (const i of cal.items) {
        if (!i.live || i.all_day) continue;
        const at = new Date(i.start).getTime() - LEAD - Date.now();
        if (at > 0 && at < 24 * 3600_000) {
          timers.push(window.setTimeout(() => {
            new Notification(`${i.account?.name ?? i.title} in 15 min`, { body: `${hhmm(new Date(i.start), cal.tz)} · ${i.title}. Open Sales Mama for the brief.`, tag: i.id });
          }, at));
        }
      }
    }
    return () => { timers.forEach(t => window.clearTimeout(t)); window.clearInterval(tick); document.title = base; };
  }, [cal, on, supported]);
  return { on, supported, enable, disable };
}
