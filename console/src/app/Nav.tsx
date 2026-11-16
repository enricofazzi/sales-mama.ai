// Navigation: a slim icon rail on desktop, a bottom tab bar on phones (spec §3).
import type { Route } from './router';
import { IconBook, IconCalendar, IconChat, IconToday } from './Icons';

const ITEMS: { route: Route; label: string; Icon: (p: { size?: number }) => JSX.Element }[] = [
  { route: 'today', label: 'Today', Icon: IconToday },
  { route: 'chat', label: 'Chat', Icon: IconChat },
  { route: 'calendar', label: 'Calendar', Icon: IconCalendar },
  { route: 'book', label: 'Book', Icon: IconBook },
];

export function NavRail({ route, go, busy }: { route: Route; go: (r: Route) => void; busy: boolean }) {
  return (
    <nav className="nav" aria-label="Main">
      {ITEMS.map(({ route: r, label, Icon }) => (
        <button key={r} type="button" className={`nav-item${route === r ? ' on' : ''}`} aria-current={route === r ? 'page' : undefined} onClick={() => go(r)}>
          <span className="nav-ic"><Icon /></span>
          <span className="nav-lbl">{label}</span>
          {r === 'chat' && busy && <i className="nav-live" aria-label="a run is in progress" />}
        </button>
      ))}
    </nav>
  );
}

export function TabBar({ route, go, busy }: { route: Route; go: (r: Route) => void; busy: boolean }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {ITEMS.map(({ route: r, label, Icon }) => (
        <button key={r} type="button" className={`tab${route === r ? ' on' : ''}`} aria-current={route === r ? 'page' : undefined} onClick={() => go(r)}>
          <Icon size={22} /><span>{label}</span>
          {r === 'chat' && busy && <i className="nav-live" aria-hidden="true" />}
        </button>
      ))}
    </nav>
  );
}
