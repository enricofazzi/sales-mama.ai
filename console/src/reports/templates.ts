// Built-in A2UI views for report data files (Phase 5). The console composes them the same way agents
// do (ADR-0009): layout here, every number bound to the file with {"path": …}.
import { parseBlock, type SurfaceBlock } from '../../shared/a2ui';

export interface Report { path: string; kind: 'weekly' | 'allocation' | 'insights' | 'company' | 'view'; title: string; subtitle: string; updated: string; bytes: number }
export interface CanvasPart { block: SurfaceBlock; issues: string[]; data?: unknown }

type C = Record<string, unknown>;
const id = (s: string) => s.replace(/[^A-Za-z0-9_]/g, '_');

function weekly(r: Report): C[] {
  return [
    { id: 'root', component: 'Column', children: ['kpis', 'grid', 'conv'] },
    { id: 'kpis', component: 'Grid', min: 160, children: ['k_sent', 'k_rep', 'k_mtg', 'k_rate'] },
    { id: 'k_sent', component: 'KpiTile', label: 'Sent this week', value: { path: '/metrics/week/total/sent' } },
    { id: 'k_rep', component: 'KpiTile', label: 'Replies', value: { path: '/metrics/week/total/replies' } },
    { id: 'k_mtg', component: 'KpiTile', label: 'Meetings', value: { path: '/metrics/week/total/meetings' } },
    { id: 'k_rate', component: 'KpiTile', label: 'Team meeting rate (smoothed)', value: { path: '/allocation/team_rate' }, format: 'percent' },
    { id: 'grid', component: 'Grid', children: ['p_f', 'p_c'] },
    { id: 'p_f', component: 'Panel', title: 'Funnel', subtitle: 'now vs a week ago', children: ['f'] },
    { id: 'f', component: 'Funnel', data: { path: '/funnel/stages' }, compareKey: 'week_ago', compareLabel: 'this week' },
    { id: 'p_c', component: 'Panel', title: 'Calibration', subtitle: `${r.title.split('· ')[1] ?? ''} · contacted vs meetings by tier`, children: ['c'] },
    { id: 'c', component: 'BarChart', data: { path: '/calibration/tiers' }, y: ['contacted', 'meetings'] },
    { id: 'conv', component: 'Panel', title: 'Rep × industry conversion', span: 'full', children: ['ct'] },
    { id: 'ct', component: 'DataTable', rows: { path: '/allocation/conversion' }, empty: 'No touches logged yet.', columns: [
      { key: 'rep', label: 'Rep' }, { key: 'industry', label: 'Industry' }, { key: 'contacted', label: 'Contacted', numeric: true },
      { key: 'meetings', label: 'Meetings', numeric: true }, { key: 'smoothed_rate', label: 'Smoothed rate', numeric: true, format: 'percent' }] },
  ];
}

function allocation(): C[] {
  return [
    { id: 'root', component: 'Column', children: ['grid', 'rows', 'go'] },
    { id: 'grid', component: 'Grid', children: ['p_load', 'p_chk'] },
    { id: 'p_load', component: 'Panel', title: 'Load per rep', children: ['load'] },
    { id: 'load', component: 'BarChart', data: { path: '/per_rep' }, x: 'rep', y: ['A', 'B', 'C'], stacked: true, orientation: 'horizontal', height: 140 },
    { id: 'p_chk', component: 'Panel', title: 'Hard constraints', children: ['chk'] },
    { id: 'chk', component: 'DataTable', rows: { path: '/checks' }, columns: [{ key: 'check', label: 'Check' }, { key: 'ok', label: 'Holds' }] },
    { id: 'rows', component: 'Panel', title: 'Rows', span: 'full', children: ['t'] },
    { id: 't', component: 'DataTable', rows: { path: '/rows' }, sortBy: 'score', columns: [
      { key: 'row', label: '#', numeric: true }, { key: 'account', label: 'Account', format: 'account' }, { key: 'tier', label: 'Tier', format: 'tier' },
      { key: 'score', label: 'Score', numeric: true }, { key: 'product', label: 'Product' }, { key: 'reason', label: 'Why' }] },
    { id: 'go', component: 'ActionBar', actions: [{ label: 'Review in chat', prompt: '/mama-allocate' }] },
  ];
}

function company(): C[] {
  return [
    { id: 'root', component: 'Column', children: ['v', 'grid', 'p_chk'] },
    { id: 'v', component: 'Verdict', verdict: { path: '/verdict' }, score: { path: '/score' }, subtitle: { path: '/dataset' } },
    { id: 'grid', component: 'Grid', min: 220, children: ['f_uen', 'f_type', 'f_reg', 'f_ssic'] },
    { id: 'f_uen', component: 'KpiTile', label: 'UEN', value: { path: '/uen' } },
    { id: 'f_type', component: 'KpiTile', label: 'Entity type', value: { path: '/entity_type' } },
    { id: 'f_reg', component: 'KpiTile', label: 'Registered', value: { path: '/registered' } },
    { id: 'f_ssic', component: 'KpiTile', label: 'Activity', value: { path: '/ssic' } },
    { id: 'p_chk', component: 'Panel', title: 'Every check', span: 'full', children: ['chk'] },
    { id: 'chk', component: 'CheckList', checks: { path: '/checks' } },
  ];
}

/** Insights files carry {order, sections}; pick the visual from each section's kind and shape. */
function insights(data: any): C[] {
  const order: string[] = Array.isArray(data?.order) ? data.order : Object.keys(data?.sections ?? {});
  const comps: C[] = [];
  const kids: string[] = [];
  for (const key of order) {
    const sec = data.sections?.[key];
    if (!sec) continue;
    const base = `/sections/${key}`, sid = id(key);
    const panel = (child: C[], full = false) => {
      comps.push({ id: `p_${sid}`, component: 'Panel', title: String(sec.title ?? key), ...(sec.subtitle ? { subtitle: String(sec.subtitle) } : {}), ...(full ? { span: 'full' } : {}), children: child.map(c => c.id) }, ...child);
      kids.push(`p_${sid}`);
    };
    if (sec.kind === 'metrics') panel([{ id: `m_${sid}`, component: 'StatGrid', items: { path: `${base}/items` } }], true);
    else if (sec.kind === 'series') {
      const viz = sec.dimension === 'time' ? { component: 'LineChart', area: true }
        : sec.dimension === 'ordinal' ? { component: 'BarChart' }
        : sec.share_of_total ? { component: 'DonutChart' } : { component: 'BarChart', orientation: 'horizontal' };
      panel([{ id: `s_${sid}`, ...viz, data: { path: `${base}/items` } }]);
    } else if (sec.kind === 'rows') {
      panel([{ id: `r_${sid}`, component: 'DataTable', rows: { path: `${base}/rows` }, columns: (sec.columns ?? []).map((c: any) => ({ key: c.key, label: c.label, ...(c.numeric ? { numeric: true } : {}) })) }], true);
    } else if (sec.kind === 'company') {
      panel([{ id: `v_${sid}`, component: 'Verdict', verdict: { path: `${base}/verdict` }, score: { path: `${base}/score` } },
        { id: `f_${sid}`, component: 'FactList', data: { path: `${base}/facts` } },
        { id: `c_${sid}`, component: 'CheckList', groups: { path: `${base}/groups` } }], true);
    } else if (sec.kind === 'compare') {
      panel([{ id: `x_${sid}`, component: 'CompareTable', companies: { path: `${base}/companies` }, rows: { path: `${base}/rows` } }], true);
    } else if (sec.kind === 'comparison') {
      panel([{ id: `b_${sid}`, component: 'BarChart', data: { path: `${base}/items` }, x: 'measure', y: ['this', 'peer_median'], orientation: 'horizontal' }]);
    }
  }
  return [{ id: 'root', component: 'Grid', min: 340, children: kids }, ...comps];
}

/** A canvas part for a data report; `data` is the file content (needed to lay out insights). */
export function reportPart(r: Report, data: unknown): CanvasPart {
  const components = r.kind === 'weekly' ? weekly(r) : r.kind === 'allocation' ? allocation() : r.kind === 'company' ? company() : insights(data);
  const p = parseBlock(JSON.stringify({ surfaceId: id(`rep_${r.path}`).slice(0, 60), title: r.title, subtitle: r.subtitle,
    agent: r.kind === 'allocation' ? 'allocator' : r.kind === 'weekly' ? 'mama' : 'researcher', dataRef: r.path, components }));
  if (p.kind !== 'surface') throw new Error(p.kind === 'bad' ? p.issues.join('; ') : 'not a surface');
  return { block: p.block, issues: p.issues, data };
}
