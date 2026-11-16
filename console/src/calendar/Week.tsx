// Week time grid (spec §6.3): all-day lane, 07:00–20:00 grid in the market zone, send-window bands,
// hatched holidays, a gliding now line, packed overlaps with a clash notch. Clicking an empty slot or
// dragging an event never writes: it hands a prompt to the caller (ADR-0006).
import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { addDays, label, pack, place, windowOn, type CalItem, type Calendar, type Placed } from './time';
import { kindOf, statusClass } from './kinds';

export const HOUR_PX = 52;
const SNAP = 15;

export interface GridCtx {
  tz: string; today: string; nowMin: number; selected: string | null; pending: Set<string>; readOnly?: boolean;
  select: (it: CalItem) => void; onSlot: (day: string, min: number) => void; onMove: (it: CalItem, day: string, min: number) => void;
}

export const fmtMin = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const movable = (it: CalItem) => !!it.live && ['meeting', 'call', 'demo', 'site_visit'].includes(it.kind);

export function Week({ cal, days, items, ctx }: { cal: Calendar; days: string[]; items: CalItem[]; ctx: GridCtx }) {
  const placed = useMemo(() => items.map(i => place(i, ctx.tz)), [items, ctx.tz]);
  const timed = placed.filter(p => !p.allDay);
  const allDay = placed.filter(p => p.allDay);
  const startH = Math.min(7, ...timed.map(p => Math.floor(p.startMin / 60)));
  const endH = Math.max(20, ...timed.map(p => Math.ceil(p.endMin / 60)));
  const hours = Array.from({ length: endH - startH }, (_, i) => startH + i);
  const top = (min: number) => ((min - startH * 60) / 60) * HOUR_PX;
  const sw = Object.values(cal.markets)[0]?.send_windows;
  const holidays = new Set(allDay.filter(p => p.item.kind === 'holiday').map(p => p.day));
  const grid = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; x0: number; y0: number; dx: number; dy: number } | null>(null);

  const target = (clientX: number, clientY: number, p: Placed) => {
    const cols = [...(grid.current?.querySelectorAll<HTMLElement>('.wk-col') ?? [])];
    const col = cols.find(c => { const r = c.getBoundingClientRect(); return clientX >= r.left && clientX < r.right; });
    const dyMin = Math.round(((clientY - (drag?.y0 ?? clientY)) / HOUR_PX) * 60 / SNAP) * SNAP;
    return { day: col?.dataset.day ?? p.day, min: Math.max(0, Math.min(24 * 60 - SNAP, p.startMin + dyMin)) };
  };
  const down = (e: PointerEvent, p: Placed) => {
    if (ctx.readOnly || !movable(p.item)) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setDrag({ id: p.item.id, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 });
  };
  const move = (e: PointerEvent) => { if (drag) setDrag({ ...drag, dx: e.clientX - drag.x0, dy: e.clientY - drag.y0 }); };
  const up = (e: PointerEvent, p: Placed) => {
    if (!drag) { ctx.select(p.item); return; }
    const moved = Math.abs(drag.dx) > 4 || Math.abs(drag.dy) > 4;
    const t = target(e.clientX, e.clientY, p);
    setDrag(null);
    if (!moved) { ctx.select(p.item); return; }
    if (t.day !== p.day || t.min !== p.startMin) ctx.onMove(p.item, t.day, t.min);
  };
  const slot = (e: React.MouseEvent<HTMLDivElement>, day: string) => {
    if (ctx.readOnly || e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    const min = startH * 60 + Math.floor(((e.clientY - r.top) / HOUR_PX) * 60 / 30) * 30;
    ctx.onSlot(day, min);
  };

  return (
    <div className="wk" style={{ ['--hour' as any]: `${HOUR_PX}px`, ['--cols' as any]: days.length }}>
      <div className="wk-head">
        <span className="wk-gutter" />
        {days.map(d => (
          <span key={d} className={`wk-day${d === ctx.today ? ' today' : ''}${holidays.has(d) ? ' holiday' : ''}`}>
            <b>{label(d, { weekday: 'short' })}</b><i>{label(d, { day: 'numeric' })}</i>
          </span>
        ))}
      </div>
      <div className="wk-allday">
        <span className="wk-gutter">all day</span>
        {days.map(d => (
          <div key={d} className="wk-ad-cell">
            {allDay.filter(p => (p.day <= d && p.endDay >= d) || (d === ctx.today && p.item.status === 'overdue' && p.endDay < d)).map(p => {
              const k = kindOf(p.item.kind);
              return (
                <button key={p.item.id} type="button" className={`chipev ${statusClass(p.item.status)}${ctx.selected === p.item.id ? ' sel' : ''}`}
                  style={{ ['--k' as any]: k.color, ['--kt' as any]: k.tint }} onClick={() => ctx.select(p.item)} title={`${k.label}: ${p.item.title}`}>
                  <span className="g" aria-hidden="true">{k.glyph}</span>{p.item.title}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="wk-body">
        <div className="wk-grid" ref={grid}>
          <div className="wk-hours">{hours.map(h => <span key={h} style={{ height: HOUR_PX }}>{fmtMin(h * 60)}</span>)}</div>
          {days.map(d => {
            const w = windowOn(d, sw);
            const evs = pack(timed.filter(p => p.day === d));
            return (
              <div key={d} className={`wk-col${d === ctx.today ? ' today' : ''}${holidays.has(d) ? ' holiday' : ''}`} data-day={d}
                style={{ height: hours.length * HOUR_PX }} onClick={e => slot(e, d)}>
                {hours.map((h, i) => <span key={h} className="wk-hl" style={{ top: i * HOUR_PX }} aria-hidden="true" />)}
                {w && !holidays.has(d) && <span className="wk-window" style={{ top: top(w[0]), height: top(w[1]) - top(w[0]) }} aria-hidden="true"><i>send window</i></span>}
                {evs.map(({ p, col, cols, clash }) => {
                  const k = kindOf(p.item.kind);
                  const dragging = drag?.id === p.item.id;
                  const h = Math.max(22, top(p.endMin) - top(p.startMin) - 2);
                  return (
                    <button key={p.item.id} type="button"
                      className={`ev ${statusClass(p.item.status)}${h < 36 ? ' short' : ''}${clash ? ' clash' : ''}${ctx.selected === p.item.id ? ' sel' : ''}${ctx.pending.has(p.item.id) ? ' pending' : ''}${dragging ? ' dragging' : ''}${movable(p.item) && !ctx.readOnly ? ' movable' : ''}`}
                      style={{ top: top(p.startMin) + 1, height: h, left: `calc(${(100 / cols) * col}% + 2px)`, width: `calc(${100 / cols}% - 4px)`,
                        ['--k' as any]: k.color, ['--kt' as any]: k.tint, transform: dragging ? `translate(${drag!.dx}px, ${drag!.dy}px)` : undefined }}
                      onPointerDown={e => down(e, p)} onPointerMove={move} onPointerUp={e => up(e, p)}
                      aria-label={`${k.label} ${p.item.title}, ${fmtMin(p.startMin)} to ${fmtMin(p.endMin)}${p.item.status ? `, ${p.item.status}` : ''}`}>
                      <b>{p.item.account?.name ?? p.item.title}</b>
                      <span>{fmtMin(p.startMin)}–{fmtMin(p.endMin)}{p.item.account?.tier ? ` · ${p.item.account.tier}` : ''}</span>
                      {h > 56 && <small>{p.item.title}</small>}
                    </button>
                  );
                })}
                {d === ctx.today && ctx.nowMin >= startH * 60 && ctx.nowMin <= endH * 60 && (
                  <span className="now-line" style={{ transform: `translateY(${top(ctx.nowMin)}px)` }} aria-label={`Now ${fmtMin(ctx.nowMin)}`}><i /></span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const weekDays = (start: string, n = 7) => Array.from({ length: n }, (_, i) => addDays(start, i));
