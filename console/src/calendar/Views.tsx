// Month, Team and Day agenda views (spec §6.3).
import type { CalItem, Calendar } from './time';
import { addDays, label, monthStart, place, weekStart, ymd, hhmm, pack } from './time';
import { kindOf, statusClass } from './kinds';

const TIMED = new Set(['meeting', 'call', 'demo', 'site_visit']);

/** Month: stacked kind dots (up to 4, then +n) and a heat tint by appointment count. */
export function Month({ anchor, items, today, tz, onDay, selected }: {
  anchor: string; items: CalItem[]; today: string; tz: string; onDay: (d: string) => void; selected?: string;
}) {
  const first = monthStart(anchor), start = weekStart(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const byDay = new Map<string, CalItem[]>();
  for (const it of items) {
    const p = place(it, tz);
    for (let d = p.day; d <= p.endDay; d = addDays(d, 1)) byDay.set(d, [...(byDay.get(d) ?? []), it]);
  }
  const maxAppt = Math.max(1, ...cells.map(d => (byDay.get(d) ?? []).filter(i => TIMED.has(i.kind) && i.live).length));
  return (
    <div className="mo">
      <div className="mo-head">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}</div>
      <div className="mo-grid">
        {cells.map(d => {
          const list = byDay.get(d) ?? [];
          const appts = list.filter(i => TIMED.has(i.kind) && i.live).length;
          const holiday = list.some(i => i.kind === 'holiday');
          return (
            <button key={d} type="button" className={`mo-cell${d.slice(0, 7) !== first.slice(0, 7) ? ' out' : ''}${d === today ? ' today' : ''}${holiday ? ' holiday' : ''}${d === selected ? ' sel' : ''}`}
              style={{ ['--heat' as any]: (appts / maxAppt).toFixed(2) }} onClick={() => onDay(d)}
              aria-label={`${label(d, { weekday: 'long', day: 'numeric', month: 'long' })}: ${list.length} item${list.length === 1 ? '' : 's'}`}>
              <span className="mo-n">{label(d, { day: 'numeric' })}</span>
              <span className="mo-dots">
                {list.slice(0, 4).map(i => <i key={i.id} style={{ background: kindOf(i.kind).color }} title={`${kindOf(i.kind).label}: ${i.title}`} />)}
                {list.length > 4 && <small>+{list.length - 4}</small>}
              </span>
              {list.filter(i => i.kind !== 'holiday').slice(0, 2).map(i => (
                <span key={i.id} className={`mo-ev ${statusClass(i.status)}`} style={{ ['--k' as any]: kindOf(i.kind).color }}>
                  {!i.all_day && i.start.length > 10 ? `${hhmm(new Date(i.start), tz)} ` : ''}{i.account?.name ?? i.title}
                </span>
              ))}
              {holiday && <span className="mo-hol">{list.find(i => i.kind === 'holiday')!.title}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Team (manager): one swimlane per rep, load against capacity, clashes flagged. */
export function Team({ team, days, today, onCell }: { team: Calendar; days: string[]; today: string; onCell: (rep: string, day: string) => void }) {
  const reps = team.reps ?? [];
  const load = team.by_rep_day ?? {};
  const max = Math.max(4, ...Object.values(load).flatMap(o => Object.values(o)));
  const clash = (rep: string, day: string) => {
    const evs = team.items.filter(i => i.rep === rep && i.live && TIMED.has(i.kind)).map(i => place(i, team.tz)).filter(p => p.day === day);
    return pack(evs).some(x => x.clash);
  };
  if (!reps.length) return <p className="muted">No reps yet.</p>;
  return (
    <div className="team" style={{ ['--cols' as any]: days.length }}>
      <div className="team-row head"><span />{days.map(d => <span key={d} className={d === today ? 'today' : ''}><b>{label(d, { weekday: 'short' })}</b> {label(d, { day: 'numeric' })}</span>)}</div>
      {reps.map(r => (
        <div key={r.rep} className="team-row">
          <span className="team-rep"><b>{r.name || r.rep}</b><small>{r.markets.join(' · ')}</small></span>
          {days.map(d => {
            const n = load[r.rep]?.[d] ?? 0;
            const items = team.items.filter(i => i.rep === r.rep && place(i, team.tz).day === d && i.kind !== 'holiday');
            const over = n > 4, c = clash(r.rep, d);
            return (
              <button key={d} type="button" className={`team-cell${over ? ' over' : ''}${c ? ' clash' : ''}${d === today ? ' today' : ''}`}
                style={{ ['--heat' as any]: (n / max).toFixed(2) }} onClick={() => onCell(r.rep, d)}
                aria-label={`${r.name || r.rep}, ${label(d, { weekday: 'long', day: 'numeric' })}: ${n} scheduled${c ? ', clash' : ''}${over ? ', overloaded' : ''}`}>
                <span className="tc-dots">{items.slice(0, 6).map(i => <i key={i.id} style={{ background: kindOf(i.kind).color }} />)}</span>
                <span className="tc-bar"><span style={{ width: `${Math.min(100, (n / max) * 100)}%` }} /></span>
                {(c || over) && <small>{c ? 'clash' : 'overload'}</small>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Day agenda: a timeline list (also used on Today and in chat). */
export function Agenda({ items, tz, day, selected, select, empty, compact }: {
  items: CalItem[]; tz: string; day?: string; selected?: string | null; select?: (i: CalItem) => void; empty?: string; compact?: boolean;
}) {
  const list = items.filter(i => !day || (place(i, tz).day <= day && place(i, tz).endDay >= day))
    .sort((a, b) => (a.all_day === b.all_day ? a.start.localeCompare(b.start) : a.all_day ? -1 : 1));
  if (!list.length) return <p className="agenda-empty">{empty ?? 'Nothing scheduled.'}</p>;
  return (
    <ol className={`agenda${compact ? ' compact' : ''}`}>
      {list.map(i => {
        const k = kindOf(i.kind), p = place(i, tz);
        return (
          <li key={i.id}>
            <button type="button" className={`ag-row ${statusClass(i.status)}${selected === i.id ? ' sel' : ''}`} style={{ ['--k' as any]: k.color, ['--kt' as any]: k.tint }}
              onClick={() => select?.(i)} disabled={!select}>
              <span className="ag-time">{p.allDay ? (day ? 'all day' : label(p.day, { day: 'numeric', month: 'short' })) : `${hhmm(new Date(i.start), tz)}`}
                {!p.allDay && <small>{hhmm(new Date(i.end), tz)}</small>}</span>
              <span className="ag-bar" aria-hidden="true" />
              <span className="ag-txt"><b>{i.account?.name ?? i.title}</b><span>{k.label}{i.title && i.account?.name ? ` · ${i.title}` : ''}{i.contact_name ? ` · ${i.contact_name}` : ''}</span></span>
              {i.status && i.status !== 'due' && <span className={`ag-st ${statusClass(i.status)}`}>{i.status.replace('_', ' ')}</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export const todayIn = (tz: string, now = new Date()) => ymd(now, tz);
