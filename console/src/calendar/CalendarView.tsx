// Calendar route (spec §6.3): Day · Week · Month · Team. State lives in the URL (?view=&d=), filters are
// the legend, the event panel sits on the right. Drags and slot clicks become prompts after a confirm.
import { useEffect, useMemo, useState } from 'react';
import type { Calendar, CalItem } from './time';
import { addDays, label, monthStart, place, weekStart, minutesOf, ymd } from './time';
import { FILTERS, kindOf } from './kinds';
import { Week, weekDays, fmtMin } from './Week';
import { Agenda, Month, Team } from './Views';
import { EventPanel, type PanelActions } from './EventPanel';
import { useNow } from '../hooks/useNow';
import { IconBell } from '../app/Icons';

export interface ReminderCtl { on: boolean; supported: boolean; enable: () => void; disable: () => void }

type View = 'day' | 'week' | 'month' | 'team';
const read = () => {
  const q = new URLSearchParams(location.search);
  const v = q.get('view');
  return { view: (['day', 'week', 'month', 'team'].includes(v ?? '') ? v : 'week') as View, d: q.get('d') ?? '' };
};

export function CalendarView({ mine, team, manager, error, act, focus, onFocused, reminders }: {
  mine: Calendar | null; team: Calendar | null; manager: boolean; error: string | null; act: PanelActions;
  focus?: string | null; onFocused?: () => void; reminders: ReminderCtl;
}) {
  const now = useNow(30_000);
  const tz = mine?.tz ?? 'Asia/Singapore';
  const today = ymd(now, tz);
  const [state, setState] = useState(read);
  const view = state.view === 'team' && !manager ? 'week' : state.view;
  const anchor = state.d || today;
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<CalItem | null>(null);
  const [confirm, setConfirm] = useState<{ it: CalItem; day: string; min: number } | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const go = (next: Partial<{ view: View; d: string }>) => {
    const s = { view, d: anchor, ...next };
    const q = new URLSearchParams(location.search);
    q.set('view', s.view); q.set('d', s.d);
    history.replaceState(null, '', `${location.pathname}?${q}`);
    setState(s);
  };
  // Opened from the header capsule or Today: jump to the item's week and show its details.
  useEffect(() => {
    if (!focus || !mine) return;
    const it = [...mine.items, ...(team?.items ?? [])].find(i => i.id === focus);
    if (it) { setSelected(it); go({ view: view === 'month' || view === 'team' ? 'week' : view, d: place(it, mine.tz).day }); }
    onFocused?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus, mine]);
  // Data refresh clears pending moves (the rebuilt JSON is the truth).
  useEffect(() => { setPending(new Set()); }, [mine?.generated]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.closest?.('input, textarea, [role=dialog]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const step = view === 'month' ? 0 : view === 'day' ? 1 : 7;
      if (e.key === 'ArrowLeft') go({ d: view === 'month' ? addDays(monthStart(anchor), -1) : addDays(anchor, -step) });
      else if (e.key === 'ArrowRight') go({ d: view === 'month' ? addDays(monthStart(anchor), 32).slice(0, 8) + '01' : addDays(anchor, step) });
      else if (e.key === 't') go({ d: today });
      else if (e.key === 'd') go({ view: 'day' });
      else if (e.key === 'w') go({ view: 'week' });
      else if (e.key === 'm') go({ view: 'month' });
      else if (e.key === 'Escape') { setSelected(null); setConfirm(null); }
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  const source = view === 'team' ? team : mine;
  const items = useMemo(() => (source?.items ?? []).filter(i => !FILTERS.some(f => hidden.has(f.key) && f.kinds.includes(i.kind))), [source, hidden]);
  const days = view === 'day' ? [anchor] : weekDays(weekStart(anchor));
  const title = view === 'month' ? label(monthStart(anchor), { month: 'long', year: 'numeric' })
    : view === 'day' ? label(anchor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : `${label(days[0], { day: 'numeric', month: 'short' })} – ${label(days[6], { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const step = (dir: 1 | -1) => go({ d: view === 'month' ? addDays(monthStart(anchor), dir > 0 ? 32 : -1).slice(0, 8) + '01' : addDays(anchor, dir * (view === 'day' ? 1 : 7)) });

  const ctx = {
    tz, today, nowMin: minutesOf(now, tz), selected: selected?.id ?? null, pending,
    select: (it: CalItem) => setSelected(it),
    onSlot: (day: string, min: number) => act.prefill(`/mama-schedule book ${label(day, { weekday: 'short', day: 'numeric', month: 'short' })} ${fmtMin(min)} with @`),
    onMove: (it: CalItem, day: string, min: number) => setConfirm({ it, day, min }),
  };
  const sendMove = () => {
    if (!confirm) return;
    act.ask(`/mama-schedule reschedule ${confirm.it.id} to ${confirm.day} ${fmtMin(confirm.min)}`);
    setPending(p => new Set(p).add(confirm.it.id));
    setConfirm(null);
  };

  if (!mine) {
    return (
      <section className="cal" aria-label="Calendar">
        <div className="cal-empty">
          <h2>Calendar</h2>
          <p>{error ? `The calendar data isn't built yet: ${error.slice(0, 120)}` : 'Loading your calendar…'}</p>
          <p className="muted">It is rebuilt at every session start (scripts/build_books.py). Ask “what's on this week?” to refresh it.</p>
        </div>
      </section>
    );
  }
  const counts = FILTERS.map(f => ({ ...f, n: (source?.items ?? []).filter(i => f.kinds.includes(i.kind)).length }));

  return (
    <section className={`cal${selected ? ' with-panel' : ''}`} aria-label="Calendar">
      <div className="cal-main">
        <header className="cal-bar">
          <div className="cal-nav">
            <button type="button" className="btn small" onClick={() => go({ d: today })} title="Today (t)">Today</button>
            <button type="button" className="icon-sq" onClick={() => step(-1)} aria-label="Previous (←)">‹</button>
            <button type="button" className="icon-sq" onClick={() => step(1)} aria-label="Next (→)">›</button>
            <h2>{title}</h2>
            <span className="cal-tz" title="Times are shown in your market's time zone">{tz.replace('_', ' ')}</span>
          </div>
          {reminders.supported && (
            <button type="button" className={`btn small remind${reminders.on ? ' on' : ''}`} onClick={reminders.on ? reminders.disable : reminders.enable}
              aria-pressed={reminders.on} title="A browser notification 15 minutes before each appointment">
              <IconBell size={16} />{reminders.on ? 'Reminders on' : 'Remind me'}
            </button>
          )}
          <div className="seg" role="tablist" aria-label="View">
            {(['day', 'week', 'month', ...(manager ? ['team'] : [])] as View[]).map(v => (
              <button key={v} type="button" role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => go({ view: v })}>
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </header>
        <div className="cal-filters" aria-label="Show or hide">
          {counts.map(f => {
            const k = kindOf(f.kinds[0]);
            const off = hidden.has(f.key);
            return (
              <button key={f.key} type="button" className={`fchip${off ? ' off' : ''}`} aria-pressed={!off} style={{ ['--k' as any]: k.color, ['--kt' as any]: k.tint }}
                onClick={() => setHidden(h => { const n = new Set(h); n.has(f.key) ? n.delete(f.key) : n.add(f.key); return n; })}>
                <span className="g" aria-hidden="true">{k.glyph}</span>{f.label}<b>{f.n}</b>
              </button>
            );
          })}
        </div>
        <div className="cal-body">
          {view === 'week' && <Week cal={mine} days={days} items={items} ctx={ctx} />}
          {view === 'day' && (
            <div className="cal-day">
              <Week cal={mine} days={days} items={items} ctx={ctx} />
              <div className="cal-day-list"><h3 className="sec">Agenda</h3><Agenda items={items} tz={tz} day={anchor} selected={selected?.id} select={setSelected} empty="Nothing on this day." /></div>
            </div>
          )}
          {view === 'month' && <Month anchor={anchor} items={items} today={today} tz={tz} onDay={d => go({ view: 'day', d })} />}
          {view === 'team' && team && <Team team={{ ...team, items }} days={weekDays(weekStart(anchor))} today={today} onCell={(_, d) => go({ view: 'day', d })} />}
          {view === 'team' && !team && <p className="muted">The team calendar isn't built yet.</p>}
        </div>
        {confirm && (
          <div className="cal-confirm" role="dialog" aria-label="Confirm the move">
            <span>Ask Sales Mama to move <b>{confirm.it.account?.name ?? confirm.it.title}</b> to <b>{label(confirm.day, { weekday: 'short', day: 'numeric', month: 'short' })} {fmtMin(confirm.min)}</b>? It checks clashes and holidays and asks you before it writes.</span>
            <button type="button" className="btn primary" onClick={sendMove} disabled={act.disabled}>Ask to move</button>
            <button type="button" className="btn" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        )}
      </div>
      {selected && <EventPanel item={selected} tz={tz} now={now} onClose={() => setSelected(null)} act={act} />}
    </section>
  );
}
