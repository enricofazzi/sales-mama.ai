// One shared ticker for clocks, the now line and countdowns. Aligned to the minute so every clock
// on screen flips together; `everyMs` lets a countdown tick faster when it needs to.
import { useEffect, useState } from 'react';

export function useNow(everyMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let id: number | undefined;
    const tick = () => setNow(new Date());
    const first = window.setTimeout(() => { tick(); id = window.setInterval(tick, everyMs); }, everyMs - (Date.now() % everyMs));
    return () => { window.clearTimeout(first); if (id) window.clearInterval(id); };
  }, [everyMs]);
  return now;
}

/** "10:42" in a time zone. */
export function clock(now: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
}

/** "Mon 16 Nov" in a time zone. */
export function dayLabel(now: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short' }).format(now);
}

/** Hour 0–23 in a time zone. */
export function hourIn(now: Date, tz: string): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(now)) % 24;
}
