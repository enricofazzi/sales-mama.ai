// Calendar data: wiki/books/<me>.calendar.json (and team.calendar.json for the manager), read-only via
// /api/data. Refetched whenever the rail changes, i.e. after every session start or sync rebuilds the books.
import { useEffect, useState } from 'react';
import type { Rail } from '../../shared/protocol';
import { valid, type Calendar } from './time';

/** One malformed row must never take the whole calendar down: keep only drawable items. */
const clean = (c: Calendar): Calendar => ({ ...c, items: (c.items ?? []).filter(valid), next_up: c.next_up && valid(c.next_up) ? c.next_up : null });

export function useCalendar(rail: Rail | null) {
  const [mine, setMine] = useState<Calendar | null>(null);
  const [team, setTeam] = useState<Calendar | null>(null);
  const [error, setError] = useState<string | null>(null);
  const me = rail?.me;
  const stamp = `${rail?.book?.generated ?? ''}|${rail?.team?.generated ?? ''}`;
  useEffect(() => {
    if (!me) return;
    let live = true;
    const get = (p: string) => fetch(`/api/data?path=${encodeURIComponent(p)}`).then(async r => (r.ok ? r.json() : Promise.reject(new Error(await r.text()))));
    get(`wiki/books/${me.id}.calendar.json`).then(d => { if (live) { setMine(clean(d)); setError(null); } })
      .catch(e => { if (live) setError(String(e.message ?? e)); });
    if (me.role === 'manager') get('wiki/books/team.calendar.json').then(d => { if (live) setTeam(clean(d)); }).catch(() => {});
    return () => { live = false; };
  }, [me?.id, me?.role, stamp]);
  return { mine, team, error };
}
