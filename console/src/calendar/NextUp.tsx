// The next-up capsule (header) and card (Today), plus the day ribbon (spec §2, §6.3).
import type { Calendar, CalItem } from './time';
import { countdown, hhmm, label, minutesOf, place, windowOn, ymd } from './time';
import { kindOf } from './kinds';
import { Agenda } from './Views';

/** The next live appointment that has not ended yet (the JSON's next_up is computed at build time). */
export function nextAppointment(cal: Calendar | null, now: Date): CalItem | null {
  if (!cal) return null;
  const live = cal.items.filter(i => i.live && !i.all_day && new Date(i.end).getTime() > now.getTime())
    .sort((a, b) => a.start.localeCompare(b.start));
  return live[0] ?? null;
}

export function NextUpCapsule({ cal, now, onOpen }: { cal: Calendar | null; now: Date; onOpen: (i: CalItem) => void }) {
  const n = nextAppointment(cal, now);
  if (!n || !cal) return null;
  const ms = new Date(n.start).getTime() - now.getTime();
  if (ms > 7 * 86400000) return null;
  const soon = ms <= 15 * 60_000;
  return (
    <button type="button" className={`nextup${soon ? ' soon' : ''}${ms <= 0 ? ' now' : ''}`} onClick={() => onOpen(n)}
      title={`${kindOf(n.kind).label}: ${n.title}`} aria-label={`Next: ${n.account?.name ?? n.title} at ${hhmm(new Date(n.start), cal.tz)}, ${ms <= 0 ? 'happening now' : countdown(ms)}`}>
      <i style={{ background: kindOf(n.kind).color }} aria-hidden="true" />
      <b>{n.account?.name ?? n.title}</b>
      <span>{ms > 86400000 ? label(ymd(new Date(n.start), cal.tz), { weekday: 'short' }) + ' ' : ''}{hhmm(new Date(n.start), cal.tz)}</span>
      <em>{ms <= 0 ? 'now' : countdown(ms)}</em>
    </button>
  );
}

export function NextUpCard({ cal, now, onOpen, onBrief }: { cal: Calendar; now: Date; onOpen: (i: CalItem) => void; onBrief: (i: CalItem) => void }) {
  const n = nextAppointment(cal, now);
  if (!n) {
    return (
      <article className="tile-x t-next empty">
        <span className="k">Next up</span>
        <span className="next-t">Nothing booked yet</span>
        <span className="sub">Try “book Kestrel Physio Thursday 2pm”.</span>
      </article>
    );
  }
  const k = kindOf(n.kind), ms = new Date(n.start).getTime() - now.getTime();
  return (
    <article className={`tile-x t-next${ms <= 15 * 60_000 ? ' soon' : ''}`} style={{ ['--k' as any]: k.color }}>
      <span className="k"><i className="dotk" aria-hidden="true" />Next up · {k.label}</span>
      <span className="next-t">{n.account?.name ?? n.title}</span>
      <span className="sub">{label(ymd(new Date(n.start), cal.tz), { weekday: 'short', day: 'numeric', month: 'short' })} · {hhmm(new Date(n.start), cal.tz)}–{hhmm(new Date(n.end), cal.tz)}{n.location ? ` · ${n.location}` : ''}{n.contact_name ? ` · ${n.contact_name}` : ''}</span>
      <span className="next-cd">{ms <= 0 ? 'happening now' : countdown(ms)}</span>
      <span className="row">
        <button type="button" className="btn primary small" onClick={() => onBrief(n)}>Brief me</button>
        <button type="button" className="btn small" onClick={() => onOpen(n)}>Details</button>
      </span>
    </article>
  );
}

/** 24 h in 40 px: send-window band, timed items as segments, all-day items as markers, a lime now marker. */
export function DayRibbon({ cal, now, onOpen }: { cal: Calendar; now: Date; onOpen: (i: CalItem) => void }) {
  const tz = cal.tz, day = ymd(now, tz);
  const from = 7 * 60, to = 21 * 60, span = to - from;
  const x = (m: number) => `${(Math.max(0, Math.min(span, m - from)) / span) * 100}%`;
  const items = cal.items.map(i => place(i, tz)).filter(p => p.day <= day && p.endDay >= day);
  const timed = items.filter(p => !p.allDay), allDay = items.filter(p => p.allDay && p.item.kind !== 'holiday');
  const holiday = items.find(p => p.item.kind === 'holiday');
  const w = windowOn(day, Object.values(cal.markets)[0]?.send_windows);
  const nowMin = minutesOf(now, tz);
  return (
    <article className="tile-x t-ribbon">
      <span className="k">Today{holiday ? ` · ${holiday.item.title}` : ''}<span className="sub">{allDay.length ? `${allDay.length} all-day item${allDay.length > 1 ? 's' : ''}` : ''}</span></span>
      <div className="ribbon" role="img" aria-label={`Today: ${timed.length} timed item${timed.length === 1 ? '' : 's'}${w ? ', send window ' + Math.floor(w[0] / 60) + ':00' : ''}`}>
        {w && !holiday && <span className="rb-window" style={{ left: x(w[0]), width: `calc(${x(w[1])} - ${x(w[0])})` }} />}
        {timed.map(p => (
          <button key={p.item.id} type="button" className="rb-ev" title={`${hhmm(new Date(p.item.start), tz)} ${p.item.account?.name ?? p.item.title}`}
            style={{ left: x(p.startMin), width: `max(10px, calc(${x(p.endMin)} - ${x(p.startMin)}))`, background: kindOf(p.item.kind).color }} onClick={() => onOpen(p.item)} />
        ))}
        {nowMin >= from && nowMin <= to && <span className="rb-now" style={{ left: x(nowMin) }} aria-hidden="true" />}
      </div>
      <div className="rb-scale" aria-hidden="true">{[8, 10, 12, 14, 16, 18, 20].map(h => <span key={h} style={{ left: x(h * 60) }}>{h}</span>)}</div>
      {timed.length > 0 && <Agenda items={timed.map(p => p.item)} tz={tz} day={day} compact select={onOpen} />}
      {allDay.length > 0 && (
        <div className="rb-allday">{allDay.slice(0, 4).map(p => (
          <button key={p.item.id} type="button" className="chipev" style={{ ['--k' as any]: kindOf(p.item.kind).color, ['--kt' as any]: kindOf(p.item.kind).tint }} onClick={() => onOpen(p.item)}>
            <span className="g" aria-hidden="true">{kindOf(p.item.kind).glyph}</span>{p.item.title}
          </button>))}
        </div>
      )}
    </article>
  );
}
