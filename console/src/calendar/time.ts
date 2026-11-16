// Calendar time maths (spec §6.2). Everything is shown in the calendar's market time zone; items carry
// ISO times with offsets (or YYYY-MM-DD for all-day). SG/MY/IN have no daylight saving.

export interface CalItem {
  id: string; kind: string; status: string; title: string; start: string; end: string; all_day: boolean;
  tz?: string; rep?: string; market?: string; account?: { id: string; name?: string; tier?: string; stage?: string; market?: string };
  contact?: string; contact_name?: string; location?: string; live?: boolean; ref?: string; nba?: string; reason?: string; matched?: string[];
}
export interface Calendar {
  type: string; date: string; generated: string; tz: string; window: { from: string; to: string };
  markets: Record<string, { tz: string; send_windows?: { days?: string[]; hours?: string } }>;
  next_up: CalItem | null; items: CalItem[];
  reps?: { rep: string; name: string; markets: string[]; capacity: number | null }[];
  by_rep_day?: Record<string, Record<string, number>>;
}

const parts = (d: Date, tz: string) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
  timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
}).formatToParts(d).map(p => [p.type, p.value]));

/** YYYY-MM-DD of an instant in a zone. */
export function ymd(d: Date, tz: string): string { const p = parts(d, tz); return `${p.year}-${p.month}-${p.day}`; }
/** Minutes since local midnight. */
export function minutesOf(d: Date, tz: string): number { const p = parts(d, tz); return (Number(p.hour) % 24) * 60 + Number(p.minute); }
export function hhmm(d: Date, tz: string): string { const p = parts(d, tz); return `${String(Number(p.hour) % 24).padStart(2, '0')}:${p.minute}`; }

const toUTC = (day: string) => { const [y, m, d] = day.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export function addDays(day: string, n: number): string { return new Date(toUTC(day) + n * 86400000).toISOString().slice(0, 10); }
export function dayDiff(a: string, b: string): number { return Math.round((toUTC(b) - toUTC(a)) / 86400000); }
/** 0 = Monday … 6 = Sunday. */
export function weekday(day: string): number { return (new Date(toUTC(day)).getUTCDay() + 6) % 7; }
export function weekStart(day: string): string { return addDays(day, -weekday(day)); }
export function monthStart(day: string): string { return `${day.slice(0, 7)}-01`; }
export function label(day: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(new Date(toUTC(day)));
}
export const DAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** An item placed on the local calendar: its day(s) and minutes. */
export interface Placed { item: CalItem; day: string; endDay: string; startMin: number; endMin: number; allDay: boolean; startAt: Date | null }
/** An item the calendar can draw: a YYYY-MM-DD all-day start or a parseable instant. */
export function valid(item: CalItem): boolean {
  if (!item || typeof item.start !== 'string') return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(item.start)) return true;
  return !Number.isNaN(new Date(item.start).getTime()) && (!item.end || !Number.isNaN(new Date(item.end).getTime()));
}

export function place(item: CalItem, tz: string): Placed {
  if (!valid(item)) return { item, day: String(item.start ?? '').slice(0, 10), endDay: String(item.start ?? '').slice(0, 10), startMin: 0, endMin: 1440, allDay: true, startAt: null };
  if (item.all_day || /^\d{4}-\d{2}-\d{2}$/.test(item.start)) {
    return { item, day: item.start.slice(0, 10), endDay: (item.end || item.start).slice(0, 10), startMin: 0, endMin: 1440, allDay: true, startAt: null };
  }
  const s = new Date(item.start), e = new Date(item.end || item.start);
  return { item, day: ymd(s, tz), endDay: ymd(e, tz), startMin: minutesOf(s, tz), endMin: Math.max(minutesOf(e, tz), minutesOf(s, tz) + 15), allDay: false, startAt: s };
}

/** Side-by-side columns for overlapping timed events in one day (greedy interval packing). */
export function pack(events: Placed[]): { p: Placed; col: number; cols: number; clash: boolean }[] {
  const sorted = [...events].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const out: { p: Placed; col: number; cols: number; clash: boolean }[] = [];
  let cluster: typeof out = [], colEnds: number[] = [], clusterEnd = -1;
  const flush = () => { const n = colEnds.length; cluster.forEach(c => { c.cols = n; c.clash = n > 1; }); out.push(...cluster); cluster = []; colEnds = []; };
  for (const p of sorted) {
    if (p.startMin >= clusterEnd && cluster.length) flush();
    let col = colEnds.findIndex(end => end <= p.startMin);
    if (col < 0) { col = colEnds.length; colEnds.push(p.endMin); } else colEnds[col] = p.endMin;
    cluster.push({ p, col, cols: 1, clash: false });
    clusterEnd = Math.max(clusterEnd, p.endMin);
  }
  flush();
  return out;
}

/** Send window on a given local day, as minutes, or null. */
export function windowOn(day: string, sw?: { days?: string[]; hours?: string }): [number, number] | null {
  if (!sw?.hours) return null;
  const days = (sw.days ?? []).map(d => d.toLowerCase().slice(0, 3));
  if (days.length && !days.includes(DAY_NAMES[weekday(day)])) return null;
  const [a, b] = sw.hours.split('-').map(t => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); });
  return [a, b];
}

export function countdown(ms: number): string {
  if (ms < 60_000) return 'now';
  const m = Math.round(ms / 60_000);
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  if (h < 24) return `in ${h} h${r ? ` ${r} m` : ''}`;
  const d = Math.round(h / 24);
  return `in ${d} day${d > 1 ? 's' : ''}`;
}
