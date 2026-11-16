// A tiny History-API router (spec §3): every view lives in the URL, so it can be bookmarked and
// refreshed. Route changes use the View Transitions API where the browser has it.
import { useCallback, useEffect, useState } from 'react';

export type Route = 'today' | 'chat' | 'calendar' | 'book';
export const ROUTES: Route[] = ['today', 'chat', 'calendar', 'book'];

function current(): Route {
  const q = new URLSearchParams(location.search);
  if (q.has('replay') || q.has('result')) return 'chat';      // recorded streams and saved results open in chat
  const seg = location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0];
  return (ROUTES as string[]).includes(seg) ? (seg as Route) : 'today';
}

export function useRoute() {
  const [route, setRoute] = useState<Route>(current);
  useEffect(() => {
    const onPop = () => setRoute(current());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const go = useCallback((to: Route) => {
    if (to === current()) return;
    const q = new URLSearchParams(location.search);
    const keep = (['replay', 'result', 'ask'].some(k => q.has(k)) && to === 'chat') || (to === 'calendar' && q.has('view')) ? location.search : '';
    const apply = () => { history.pushState(null, '', `/${to === 'today' ? '' : to}${keep}`); setRoute(to); };
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const vt = (document as any).startViewTransition;
    if (vt && !reduce) vt.call(document, apply); else apply();
  }, []);
  return { route, go };
}
