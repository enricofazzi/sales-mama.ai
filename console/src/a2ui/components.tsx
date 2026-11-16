// React implementations of the Sales Mama A2UI catalog (shared/a2ui-api.ts). Pure views: every
// number arrives through a data binding; buttons only send a prompt or open a file (ADR-0006).
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { createComponentImplementation } from '@a2ui/react/v0_9';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { API, CARDS, CARD_NAMES, type CardName } from '../../shared/a2ui-api';
import { safeActions } from '../../shared/cards';
import { fromCardProps } from '../../shared/a2ui';
import { CardView } from '../components/Cards';

export interface SurfaceCtx { onPrompt: (p: string) => void; onSource: (p: string) => void; disabled: boolean; readOnly?: boolean }
export const SurfaceContext = createContext<SurfaceCtx>({ onPrompt: () => {}, onSource: () => {}, disabled: true });
const useCtx = () => useContext(SurfaceContext);

// ---------------------------------------------------------------------------------------------
// Data helpers
// ---------------------------------------------------------------------------------------------
type Row = Record<string, unknown>;
const isObj = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v)) ? Number(v) : null);
const str = (v: unknown) => (v == null ? '' : typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : JSON.stringify(v));
const keys = (k: unknown, d: string) => (Array.isArray(k) ? k.map(String) : typeof k === 'string' && k ? [k] : [d]);

/** Arrays stay arrays; a {key: number} map becomes [{label, value}]; a {key: {..}} map becomes rows with label. */
export function rows(v: unknown): Row[] {
  if (Array.isArray(v)) return v.map(x => (isObj(x) ? x : { label: str(x), value: x }));
  if (isObj(v)) return Object.entries(v).map(([k, x]) => (isObj(x) ? { label: k, ...x } : { label: k, value: x }));
  return [];
}

export function fmt(v: unknown, format?: string, unit?: string): string {
  const n = num(v);
  if (n === null) return v === 'insufficient data' ? 'n < 20' : v == null || v === '' ? '–' : str(v);
  if (format === 'percent') return `${(Math.abs(n) <= 1 ? n * 100 : n).toFixed(Math.abs(n) <= 1 && n !== 0 && Math.abs(n * 100) < 10 ? 1 : 0)}%`;
  if (format === 'money') return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  const s = Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit ? (unit === '%' || unit.startsWith('/') ? `${s}${unit}` : `${s} ${unit}`) : s;
}

const VARS = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6', '--c7'];
const FALLBACK = ['#6D28D9', '#0F766E', '#C2410C', '#1D4ED8', '#BE185D', '#15803D', '#A16207'];
/** SVG fill attributes can't read CSS variables, so resolve the palette once per render. */
function usePalette(): { series: string[]; ink: string; muted: string; line: string; good: string; warn: string; risk: string } {
  return useMemo(() => {
    const cs = typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null;
    const get = (n: string, d: string) => (cs?.getPropertyValue(n).trim() || d);
    return {
      series: VARS.map((v, i) => get(v, FALLBACK[i])), ink: get('--ink', '#16131F'), muted: get('--muted', '#5B5670'),
      line: get('--line', '#E6E1F5'), good: get('--good', '#15803D'), warn: get('--warn', '#B45309'), risk: get('--risk', '#B91C1C'),
    };
  }, []);
}

const ChartBox = ({ height = 240, children, label }: { height?: number; children: ReactNode; label: string }) => (
  <div className="viz" style={{ height }} role="img" aria-label={label}>
    <ResponsiveContainer width="100%" height="100%">{children as any}</ResponsiveContainer>
  </div>
);

function TipBox({ active, payload, label, format, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="viz-tip">
      {label != null && <strong>{label}</strong>}
      {payload.map((p: any) => (
        <span key={p.dataKey ?? p.name}><i style={{ background: p.color ?? p.payload?.fill }} />{p.name}<b>{fmt(p.value, format, unit)}</b></span>
      ))}
    </div>
  );
}

const statusOf = (v: unknown) => (['good', 'warn', 'risk', 'neutral'].includes(str(v)) ? str(v) : 'neutral');

// ---------------------------------------------------------------------------------------------
// Layout and text
// ---------------------------------------------------------------------------------------------
type Kids = (string | { id: string; basePath: string })[] | undefined;
const kids = (children: Kids, build: (id: string, base?: string) => ReactNode) =>
  (children ?? []).map((c, i) => <div key={typeof c === 'string' ? c : `${c.id}-${i}`} className="a2-slot">{typeof c === 'string' ? build(c) : build(c.id, c.basePath)}</div>);

export const Panel = createComponentImplementation({ name: 'Panel', schema: API.Panel.schema }, ({ props, buildChild }) => (
  <section className={`a2-panel a-${props.agent ?? 'mama'}${props.span === 'full' ? ' full' : ''}`}>
    <header><h3>{str(props.title)}</h3>{props.subtitle && <p>{str(props.subtitle)}</p>}</header>
    <div className="a2-panel-body">{kids(props.children as Kids, buildChild)}</div>
    {!!props.refs?.length && <Chips refs={props.refs} />}
  </section>
));

export const Grid = createComponentImplementation({ name: 'Grid', schema: API.Grid.schema }, ({ props, buildChild }) => (
  <div className="a2-grid" style={{ ['--min' as any]: `${Math.max(120, props.min ?? 320)}px` }}>{kids(props.children as Kids, buildChild)}</div>
));

// Status chip icons (UI.md §4: a tinted panel with an icon chip, never a left-border bar).
const CALLOUT_ICON: Record<string, ReactNode> = {
  good: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  warn: <><path d="M12 7v6" /><path d="M12 16.5v.01" /></>,
  risk: <><path d="M12 7v6" /><path d="M12 16.5v.01" /></>,
  neutral: <><path d="M12 11v5.5" /><path d="M12 7.5v.01" /></>,
};
export const Callout = createComponentImplementation({ name: 'Callout', schema: API.Callout.schema }, ({ props }) => {
  const tone = statusOf(props.tone);
  return (
    <div className={`a2-callout s-${tone}`} role="note">
      <span className="a2-callout-ic" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">{CALLOUT_ICON[tone]}</svg>
      </span>
      <div className="a2-callout-txt">
        {props.title && <strong>{str(props.title)}</strong>}
        <span>{str(props.text)}</span>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------------------------
function Spark({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values), hi = Math.max(...values), w = 96, h = 26;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 3 - ((v - lo) / (hi - lo || 1)) * (h - 6)}`).join(' ');
  return <svg className="spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

function Tile({ label, value, unit, of, delta, deltaLabel, spark, status, note, format }: Row) {
  const d = num(delta);
  const sp = Array.isArray(spark) ? spark.map(num).filter((x): x is number => x !== null) : [];
  return (
    <div className={`a2-tile s-${statusOf(status)}`}>
      <span className="k">{str(label)}</span>
      <span className="n">{fmt(value, str(format) || undefined, of == null ? str(unit) : undefined)}{of != null && <small>/{fmt(of)}{unit ? ` ${str(unit)}` : ''}</small>}</span>
      <span className="row-tight">
        {d !== null && <span className={`delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>{d > 0 ? '▲' : d < 0 ? '▼' : '•'} {fmt(Math.abs(d))}{deltaLabel ? ` ${str(deltaLabel)}` : ''}</span>}
        {sp.length > 1 && <Spark values={sp} />}
      </span>
      {note != null && note !== '' && <span className="f">{str(note)}</span>}
    </div>
  );
}

export const KpiTile = createComponentImplementation({ name: 'KpiTile', schema: API.KpiTile.schema }, ({ props }) => <Tile {...(props as Row)} />);

export const StatGrid = createComponentImplementation({ name: 'StatGrid', schema: API.StatGrid.schema }, ({ props }) => (
  // Data items may carry their own "key" field (metrics sections do); React reserves `key`, so pass it apart.
  <div className="a2-tiles">{rows(props.items).slice(0, props.max ?? 12).map(({ key, ...t }, i) => <Tile key={str(key ?? t.label) || i} {...t} />)}</div>
));

export const Gauge = createComponentImplementation({ name: 'Gauge', schema: API.Gauge.schema }, ({ props }) => {
  const v = num(props.value) ?? 0, max = num(props.max) ?? 0;
  const pct = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0;
  const level = props.invert ? (pct >= 0.9 ? 'risk' : pct >= 0.75 ? 'warn' : 'good') : (pct >= 1 ? 'good' : pct >= 0.5 ? 'neutral' : 'warn');
  return (
    <div className={`a2-gauge s-${level}`} role="meter" aria-valuenow={v} aria-valuemin={0} aria-valuemax={max} aria-label={str(props.label)}>
      <div className="row between"><span className="k">{str(props.label)}</span><strong>{fmt(v)} / {fmt(max)}{props.unit ? ` ${str(props.unit)}` : ''}</strong></div>
      <div className="track"><span style={{ width: `${pct * 100}%` }} /></div>
    </div>
  );
});

// ---------------------------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------------------------
export const BarChartView = createComponentImplementation({ name: 'BarChart', schema: API.BarChart.schema }, ({ props }) => {
  const pal = usePalette();
  const data = rows(props.data);
  const x = props.x ?? 'label', ys = keys(props.y, 'value');
  const horizontal = props.orientation === 'horizontal';
  const fmtV = (v: unknown) => fmt(v, props.format, str(props.unit) || undefined);
  const hl = str(props.highlight);
  const height = props.height ?? (horizontal ? Math.max(160, data.length * 30 + 40) : 240);
  if (!data.length) return <p className="muted">No data yet.</p>;
  return (
    <ChartBox height={height} label={`Bar chart of ${ys.join(', ')} by ${x}`}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 16, bottom: 4, left: horizontal ? 8 : 0 }}>
        <CartesianGrid stroke={pal.line} vertical={horizontal} horizontal={!horizontal} />
        {horizontal
          ? <><XAxis type="number" tickFormatter={fmtV} stroke={pal.muted} fontSize={12} /><YAxis type="category" dataKey={x} width={150} stroke={pal.muted} fontSize={12} tickLine={false} /></>
          : <><XAxis dataKey={x} stroke={pal.muted} fontSize={12} tickLine={false} interval="preserveStartEnd" /><YAxis tickFormatter={fmtV} stroke={pal.muted} fontSize={12} width={48} /></>}
        <Tooltip content={<TipBox format={props.format} unit={str(props.unit) || undefined} />} cursor={{ fill: pal.line, opacity: 0.5 }} />
        {ys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {ys.map((k, i) => (
          <Bar key={k} dataKey={k} name={k.replace(/_/g, ' ')} stackId={props.stacked ? 's' : undefined} fill={pal.series[i % pal.series.length]}
            radius={props.stacked && i < ys.length - 1 ? 0 : horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]} maxBarSize={44}>
            {ys.length === 1 && hl && data.map((d, j) => <Cell key={j} fill={str(d[x]) === hl ? pal.series[2] : pal.series[0]} />)}
          </Bar>
        ))}
      </BarChart>
    </ChartBox>
  );
});

export const LineChartView = createComponentImplementation({ name: 'LineChart', schema: API.LineChart.schema }, ({ props }) => {
  const pal = usePalette();
  const data = rows(props.data);
  const x = props.x ?? 'label', ys = keys(props.y, 'value');
  const fmtV = (v: unknown) => fmt(v, props.format, str(props.unit) || undefined);
  const target = num(props.target);
  if (!data.length) return <p className="muted">No data yet.</p>;
  const Chart: any = props.area ? AreaChart : LineChart;
  return (
    <ChartBox height={props.height ?? 240} label={`Trend of ${ys.join(', ')} over ${x}`}>
      <Chart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid stroke={pal.line} vertical={false} />
        <XAxis dataKey={x} stroke={pal.muted} fontSize={12} tickLine={false} />
        <YAxis tickFormatter={fmtV} stroke={pal.muted} fontSize={12} width={48} />
        <Tooltip content={<TipBox format={props.format} unit={str(props.unit) || undefined} />} />
        {ys.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {target !== null && <ReferenceLine y={target} stroke={pal.warn} strokeDasharray="4 4" label={{ value: `target ${fmtV(target)}`, fontSize: 11, fill: pal.muted, position: 'insideTopRight' }} />}
        {ys.map((k, i) => props.area
          ? <Area key={k} type="monotone" dataKey={k} name={k.replace(/_/g, ' ')} stroke={pal.series[i]} strokeWidth={2.5} fill={pal.series[i]} fillOpacity={0.14} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          : <Line key={k} type="monotone" dataKey={k} name={k.replace(/_/g, ' ')} stroke={pal.series[i]} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />)}
      </Chart>
    </ChartBox>
  );
});

export const DonutChart = createComponentImplementation({ name: 'DonutChart', schema: API.DonutChart.schema }, ({ props }) => {
  const pal = usePalette();
  const nk = props.nameKey ?? 'label', vk = props.valueKey ?? 'value';
  const data = rows(props.data).filter(d => (num(d[vk]) ?? 0) > 0);
  const total = data.reduce((a, d) => a + (num(d[vk]) ?? 0), 0);
  if (!data.length) return <p className="muted">No data yet.</p>;
  return (
    <div className="a2-donut">
      <div className="viz" style={{ height: 200, width: 200 }} role="img" aria-label={`Donut chart, total ${total}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey={vk} nameKey={nk} innerRadius="62%" outerRadius="96%" paddingAngle={2} stroke="none" isAnimationActive={false}>
              {data.map((_, i) => <Cell key={i} fill={pal.series[i % pal.series.length]} />)}
            </Pie>
            <Tooltip content={<TipBox unit={str(props.unit) || undefined} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="center"><b>{fmt(total)}</b><small>{str(props.center) || str(props.unit)}</small></div>
      </div>
      <ul className="a2-legend">
        {data.map((d, i) => (
          <li key={i}><i style={{ background: pal.series[i % pal.series.length] }} /><span>{str(d[nk])}</span>
            <b>{fmt(d[vk])}</b><small>{total ? Math.round((100 * (num(d[vk]) ?? 0)) / total) : 0}%</small></li>
        ))}
      </ul>
    </div>
  );
});

const STAGE_ORDER = ['new', 'researched', 'contacted', 'replied', 'meeting', 'handed_over'];
export const Funnel = createComponentImplementation({ name: 'Funnel', schema: API.Funnel.schema }, ({ props }) => {
  const toMap = (v: unknown, key?: string) => {
    const out = new Map<string, number>();
    for (const r of rows(v)) out.set(str(r.label ?? r.stage), num(key ? r[key] : r.value ?? r.now ?? r.count) ?? 0);
    return out;
  };
  const now = toMap(props.data);
  const before = props.compare ? toMap(props.compare) : props.compareKey ? toMap(props.data, props.compareKey) : null;
  // Side exits (nurture, closed_lost, do_not_contact) only show when they hold accounts.
  for (const [k, v] of [...now]) if (!STAGE_ORDER.includes(k) && !v) now.delete(k);
  // string[] props are typed as child lists by the binder's types; at runtime they stay plain strings.
  const want = ((props.order as unknown as string[] | undefined) ?? STAGE_ORDER).map(String);
  const order = want.filter(s => now.has(s)).concat([...now.keys()].filter(k => !want.includes(k)));
  const top = Math.max(1, ...order.map(s => now.get(s) ?? 0));
  if (!order.length) return <p className="muted">No data yet.</p>;
  return (
    <ol className="a2-funnel" aria-label="Funnel">
      {order.map((s, i) => {
        const v = now.get(s) ?? 0, prev = i > 0 ? now.get(order[i - 1]) ?? 0 : null;
        const b = before?.get(s);
        return (
          <li key={s}>
            <span className="stage">{s.replace(/_/g, ' ')}</span>
            <span className="a2-bar"><span style={{ width: `${Math.max(2, (100 * v) / top)}%` }} /></span>
            <b>{fmt(v)}</b>
            <small>{prev ? `${Math.round((100 * v) / prev)}% of ${order[i - 1].replace(/_/g, ' ')}` : ''}{b != null && b !== v ? ` · ${v > b ? '+' : ''}${v - b} ${str(props.compareLabel) || 'vs before'}` : ''}</small>
          </li>
        );
      })}
    </ol>
  );
});

export const Heatmap = createComponentImplementation({ name: 'Heatmap', schema: API.Heatmap.schema }, ({ props }) => {
  const data = rows(props.data);
  const cols = (props.columns as unknown as string[]).map(String);
  const labels = ((props.columnLabels as unknown as string[] | undefined) ?? cols).map(String);
  const vals = data.flatMap(r => cols.map(c => num(r[c]) ?? 0));
  const hi = Math.max(1e-9, ...vals);
  if (!data.length) return <p className="muted">No data yet.</p>;
  return (
    <div className="a2-heat-wrap">
      <table className="a2-heat">
        <thead><tr><th />{labels.map(l => <th key={l} scope="col">{l}</th>)}</tr></thead>
        <tbody>{data.map((r, i) => (
          <tr key={i}><th scope="row">{str(r[props.rowKey])}</th>
            {cols.map(c => {
              const v = num(r[c]);
              const a = v === null ? 0 : 0.08 + 0.82 * (v / hi);
              return <td key={c} style={{ ['--a' as any]: a.toFixed(2) }} className={a > 0.55 ? 'hot' : ''}>{fmt(r[c], props.format)}</td>;
            })}
          </tr>))}
        </tbody>
      </table>
    </div>
  );
});

export const ScoreBreakdown = createComponentImplementation({ name: 'ScoreBreakdown', schema: API.ScoreBreakdown.schema }, ({ props }) => {
  const pal = usePalette();
  const parts = isObj(props.parts) ? props.parts : {};
  const weights: Row = isObj(props.weights) ? props.weights : {};
  const items = Object.entries(parts).map(([k, v]) => {
    const p = num(v) ?? 0, w = num(weights[k]);
    return { k, p, w, c: w === null ? p : p * w };
  });
  const total = num(props.total) ?? items.reduce((a, x) => a + x.c, 0);
  return (
    <div className="a2-score">
      <div className="row between"><span className="k">Score</span><strong>{total.toFixed(2)}{props.tier && <span className={`tier t-${str(props.tier)}`}>{str(props.tier)}</span>}</strong></div>
      <div className="stack" role="img" aria-label="Score contributions">
        {items.map((x, i) => <span key={x.k} title={`${x.k}: ${x.c.toFixed(2)}`} style={{ flexGrow: Math.max(0.001, x.c), background: pal.series[i] }} />)}
        <span style={{ flexGrow: Math.max(0, 1 - total) }} className="rest" />
      </div>
      <ul className="a2-legend">{items.map((x, i) => (
        <li key={x.k}><i style={{ background: pal.series[i] }} /><span>{x.k}</span><b>{x.p.toFixed(2)}</b><small>{x.w !== null ? `× ${x.w} = ${x.c.toFixed(2)}` : ''}</small></li>
      ))}</ul>
    </div>
  );
});

// ---------------------------------------------------------------------------------------------
// Tables and domain views
// ---------------------------------------------------------------------------------------------
type Col = { key: string; label: string; numeric?: boolean; format?: string };
function Cell2({ v, col, row }: { v: unknown; col: Col; row: Row }) {
  const { onSource } = useCtx();
  if (col.format === 'account' && v) {
    const id = str(row.account ?? v);
    return <button type="button" className="ref inline" onClick={() => onSource(`wiki/accounts/${id}.md`)}>{str(v)}</button>;
  }
  if (col.format === 'source' && v) return <button type="button" className="ref inline" onClick={() => onSource(str(v))}>{str(v).split('/').pop()}</button>;
  if (col.format === 'status') return <span className={`badge r-${str(v).toLowerCase().replace(/[^a-z/]/g, '')}`}>{str(v)}</span>;
  if (col.format === 'tier') return v ? <span className={`tier t-${str(v)}`}>{str(v)}</span> : <span className="muted">–</span>;
  if (typeof v === 'boolean') return <span className={`badge ${v ? 'r-ok' : 'r-fail'}`}>{v ? 'ok' : 'no'}</span>;
  if (Array.isArray(v)) return <>{v.map(str).join(', ')}</>;
  return <>{fmt(v, col.format === 'percent' || col.format === 'money' ? col.format : undefined)}</>;
}

export const DataTable = createComponentImplementation({ name: 'DataTable', schema: API.DataTable.schema }, ({ props }) => {
  const all = rows(props.rows);
  const cols = props.columns as Col[];
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(props.sortBy ? { key: props.sortBy, dir: -1 } : null);
  const [more, setMore] = useState(false);
  const max = props.maxRows ?? 25;
  const shown = useMemo(() => {
    let r = q ? all.filter(x => cols.some(c => str(x[c.key]).toLowerCase().includes(q.toLowerCase()))) : all;
    if (sort) r = [...r].sort((a, b) => {
      const x = num(a[sort.key]), y = num(b[sort.key]);
      return sort.dir * (x !== null && y !== null ? x - y : str(a[sort.key]).localeCompare(str(b[sort.key])));
    });
    return r;
  }, [all, q, sort, cols]);
  if (!all.length) return <p className="muted">{str(props.empty) || 'Nothing to show.'}</p>;
  return (
    <div className="a2-table">
      {(props.filter ?? all.length > 8) && <input className="a2-filter" type="search" placeholder={`Filter ${all.length} rows`} value={q} onChange={e => setQ(e.target.value)} aria-label="Filter rows" />}
      <div className="tw"><table>
        <thead><tr>{cols.map(c => (
          <th key={c.key} scope="col" className={c.numeric ? 'num' : ''} aria-sort={sort?.key === c.key ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
            <button type="button" onClick={() => setSort(s => ({ key: c.key, dir: s?.key === c.key ? (s.dir === 1 ? -1 : 1) : (c.numeric ? -1 : 1) }))}>
              {c.label}{sort?.key === c.key ? (sort.dir > 0 ? ' ↑' : ' ↓') : ''}
            </button>
          </th>))}</tr></thead>
        <tbody>{(more ? shown : shown.slice(0, max)).map((r, i) => (
          <tr key={i}>{cols.map(c => <td key={c.key} className={c.numeric ? 'num' : ''}><Cell2 v={r[c.key]} col={c} row={r} /></td>)}</tr>
        ))}</tbody>
      </table></div>
      {shown.length > max && <button type="button" className="link" onClick={() => setMore(m => !m)}>{more ? 'Show fewer' : `Show all ${shown.length}`}</button>}
    </div>
  );
});

export const Verdict = createComponentImplementation({ name: 'Verdict', schema: API.Verdict.schema }, ({ props }) => {
  const v = str(props.verdict);
  const level = /^verified|likely/i.test(v) ? 'good' : /registry ok/i.test(v) ? 'neutral' : /caution/i.test(v) ? 'warn' : 'risk';
  const score = num(props.score);
  return (
    <div className={`a2-verdict s-${level}`}>
      <b>{v}</b>
      {score !== null && <span className="a2-ring" style={{ ['--p' as any]: `${score}%` }}><span>{score}</span></span>}
      {props.subtitle && <small>{str(props.subtitle)}</small>}
    </div>
  );
});

function Checks({ list }: { list: Row[] }) {
  return (
    <div className="a2-checks">{list.map((c, i) => (
      <div key={str(c.id) || i} className={`chk r-${str(c.result)}`}>
        <span className="a2-dot" aria-hidden="true" /><b>{str(c.id)}</b><span>{str(c.check)}</span><em>{str(c.result)}</em>
        {c.detail != null && <small>{str(c.detail)}</small>}
      </div>))}
    </div>
  );
}

export const CheckList = createComponentImplementation({ name: 'CheckList', schema: API.CheckList.schema }, ({ props }) => {
  const groups = rows(props.groups);
  if (groups.length) return <>{groups.map((g, i) => <div key={i} className="a2-check-group"><h4>{str(g.name)}</h4><Checks list={rows(g.checks)} /></div>)}</>;
  return <Checks list={rows(props.checks)} />;
});

export const CompareTable = createComponentImplementation({ name: 'CompareTable', schema: API.CompareTable.schema }, ({ props }) => {
  const cos = rows(props.companies), rs = rows(props.rows);
  return (
    <div className="tw"><table className="a2-compare">
      <thead><tr><th />{cos.map((c, i) => <th key={i} scope="col">{str(c.name)}<small>{str(c.verdict)} · {fmt(c.score)}/100</small></th>)}</tr></thead>
      <tbody>{rs.map((r, i) => (
        <tr key={i}><th scope="row">{str(r.check)}</th>{rows(r.values).map((v, j) => (
          <td key={j} className={`r-${str(v.result)}`}><span className="a2-dot" aria-hidden="true" />{str(v.text) || str(v.result)}</td>))}</tr>
      ))}</tbody>
    </table></div>
  );
});

export const FactList = createComponentImplementation({ name: 'FactList', schema: API.FactList.schema }, ({ props }) => (
  <dl className="a2-facts">{Object.entries(isObj(props.data) ? props.data : {}).filter(([, v]) => v !== '' && v != null).map(([k, v]) => (
    <div key={k}><dt>{k}</dt><dd>{Array.isArray(v) ? v.map(str).join(', ') : str(v)}</dd></div>
  ))}</dl>
));

function Chips({ refs }: { refs: unknown }) {
  const { onSource } = useCtx();
  const list = Array.isArray(refs) ? refs.map(str).filter(Boolean) : [];
  if (!list.length) return null;
  return <div className="refs" aria-label="Sources">{list.map(r => <button key={r} type="button" className="ref" title={r} onClick={() => onSource(r)}>{r}</button>)}</div>;
}
export const SourceChips = createComponentImplementation({ name: 'SourceChips', schema: API.SourceChips.schema }, ({ props }) => <Chips refs={props.refs} />);

export const ActionBar = createComponentImplementation({ name: 'ActionBar', schema: API.ActionBar.schema }, ({ props }) => {
  const { onPrompt, disabled, readOnly } = useCtx();
  if (readOnly) return null; // shared pages are snapshots: no prompts to send
  return (
    <div className="card-foot a2-actions">
      {props.actions.filter(a => !/\bsend\b/i.test(a.label) && !/\bsend\b/i.test(a.prompt)).slice(0, 4).map((a, i) => (
        <button key={a.label} type="button" disabled={disabled} title={a.prompt} className={`btn${a.primary || (a.primary === undefined && i === 0) ? ' primary' : ''}`}
          onClick={() => onPrompt(a.prompt)}>{a.label}</button>
      ))}
    </div>
  );
});

/** Operational cards keep the console's card design: the same CardView, fed by bound or literal props. */
function cardComponent(name: CardName) {
  return createComponentImplementation({ name, schema: API[name].schema }, ({ props }) => {
    const ctx = useCtx();
    // The binder adds setter functions for bindable props; a card only needs the values.
    const fields = Object.fromEntries(Object.entries(props as Row).filter(([, v]) => typeof v !== 'function'));
    const card = { ...fromCardProps(fields), type: CARDS[name].type, title: str(fields.title), actions: ctx.readOnly ? [] : safeActions(fields.actions) };
    return <CardView card={card as any} issues={[]} ctx={ctx} />;
  });
}
export const OPERATIONAL_CARDS = CARD_NAMES.map(cardComponent);

export const LegacyCard = createComponentImplementation({ name: 'LegacyCard', schema: API.LegacyCard.schema }, ({ props }) => {
  const ctx = useCtx();
  return <CardView card={props.card as any} issues={(props.issues as string[]) ?? []} ctx={ctx} />;
});

export const SALES_MAMA_COMPONENTS = [
  Panel, Grid, Callout, KpiTile, StatGrid, Gauge, BarChartView, LineChartView, DonutChart, Funnel, Heatmap,
  ScoreBreakdown, DataTable, Verdict, CheckList, CompareTable, FactList, SourceChips, ActionBar, LegacyCard,
  ...OPERATIONAL_CARDS,
];
