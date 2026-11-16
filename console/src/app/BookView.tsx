// Book: the rep's book as a live A2UI surface bound to wiki/books/<id>.json (ADR-0009). The manager
// also gets the team view bound to wiki/books/team.json. Same components and colours as in chat.
import { useMemo } from 'react';
import type { Rail } from '../../shared/protocol';
import { parseBlock } from '../../shared/a2ui';
import { SurfaceView } from '../a2ui/Surface';
import type { CardCtx } from '../components/Cards';

const tableCols = {
  due: [{ key: 'name', label: 'Account', format: 'account' }, { key: 'tier', label: 'Tier', format: 'tier' },
    { key: 'due', label: 'Due' }, { key: 'next_action', label: 'Next action' }, { key: 'nba', label: 'Best action' }],
  hot: [{ key: 'name', label: 'Account', format: 'account' }, { key: 'tier', label: 'Tier', format: 'tier' },
    { key: 'score', label: 'Score', numeric: true }, { key: 'score_updated', label: 'Updated' }],
  risk: [{ key: 'name', label: 'Account', format: 'account' }, { key: 'tier', label: 'Tier', format: 'tier' }, { key: 'flags', label: 'Risk flags' }],
};

function bookBlock(id: string, name: string) {
  return {
    surfaceId: 'book_view', title: `Book · ${name}`, subtitle: 'Live from wiki/books, rebuilt every session', agent: 'mama',
    dataRef: `wiki/books/${id}.json`,
    components: [
      { id: 'root', component: 'Column', children: ['grid', 'p_due', 'p_hot', 'p_risk', 'go'] },
      { id: 'grid', component: 'Grid', min: 230, children: ['p_cap', 'p_mtg', 'p_tiers', 'p_stage'] },
      { id: 'p_cap', component: 'Panel', title: 'Capacity', children: ['cap', 'reply'] },
      { id: 'cap', component: 'Gauge', label: 'Active accounts', value: { path: '/active' }, max: { path: '/capacity' }, invert: true },
      { id: 'reply', component: 'KpiTile', label: 'Replies · 7 days', value: { path: '/replies_7' }, of: { path: '/sent_7' }, unit: 'sent' },
      { id: 'p_mtg', component: 'Panel', title: 'Meetings', children: ['mtg', 'mtg7'] },
      { id: 'mtg', component: 'Gauge', label: 'This month vs target', value: { path: '/meetings' }, max: { path: '/target' } },
      { id: 'mtg7', component: 'KpiTile', label: 'Meeting touches · 7 days', value: { path: '/meetings_7' } },
      { id: 'p_tiers', component: 'Panel', title: 'Tier mix', children: ['tiers'] },
      { id: 'tiers', component: 'DonutChart', data: { path: '/tiers' }, center: 'active' },
      { id: 'p_stage', component: 'Panel', title: 'Pipeline', children: ['stages'] },
      { id: 'stages', component: 'Funnel', data: { path: '/stages' } },
      { id: 'p_due', component: 'Panel', title: 'Due and overdue', span: 'full', children: ['due'] },
      { id: 'due', component: 'DataTable', rows: { path: '/due' }, columns: tableCols.due, empty: 'Nothing due. Nice.' },
      { id: 'p_hot', component: 'Panel', title: 'Hot accounts', children: ['hot'] },
      { id: 'hot', component: 'DataTable', rows: { path: '/hot' }, columns: tableCols.hot, empty: 'Nothing hot right now.', sortBy: 'score' },
      { id: 'p_risk', component: 'Panel', title: 'At risk', children: ['risk'] },
      { id: 'risk', component: 'DataTable', rows: { path: '/at_risk' }, columns: tableCols.risk, empty: 'Nothing at risk.' },
      { id: 'go', component: 'ActionBar', actions: [{ label: 'Run my day', prompt: '/mama-day' }, { label: 'Explain my book', prompt: '/mama-book' }] },
    ],
  };
}

function teamBlock() {
  return {
    surfaceId: 'team_view', title: 'Team', subtitle: 'Per rep, from wiki/books/team.json', agent: 'allocator',
    dataRef: 'wiki/books/team.json',
    components: [
      { id: 'root', component: 'Column', children: ['grid', 'p_reps', 'go'] },
      { id: 'grid', component: 'Grid', min: 230, children: ['p_pool', 'p_funnel'] },
      { id: 'p_pool', component: 'Panel', title: 'Unowned pool', children: ['pool', 'pool_t', 'review'] },
      { id: 'pool', component: 'KpiTile', label: 'Active leads in the pool', value: { path: '/pool/count' } },
      { id: 'pool_t', component: 'BarChart', data: { path: '/pool/tiers' }, height: 150 },
      { id: 'review', component: 'KpiTile', label: 'Review queue', value: { path: '/review_open' }, unit: 'undecided' },
      { id: 'p_funnel', component: 'Panel', title: 'Team funnel', children: ['funnel'] },
      { id: 'funnel', component: 'Funnel', data: { path: '/funnel' } },
      { id: 'p_reps', component: 'Panel', title: 'Load by rep', span: 'full', children: ['heat', 'reps'] },
      { id: 'heat', component: 'Heatmap', data: { path: '/reps' }, rowKey: 'rep', columns: ['active', 'due', 'at_risk', 'sent_7', 'replies_7', 'meetings'],
        columnLabels: ['Active', 'Due', 'At risk', 'Sent 7d', 'Replies 7d', 'Meetings'] },
      { id: 'reps', component: 'DataTable', rows: { path: '/reps' }, columns: [
        { key: 'rep', label: 'Rep' }, { key: 'role', label: 'Role' }, { key: 'markets', label: 'Markets' },
        { key: 'active', label: 'Active', numeric: true }, { key: 'capacity', label: 'Capacity', numeric: true },
        { key: 'meetings', label: 'Meetings', numeric: true }, { key: 'target', label: 'Target', numeric: true }] },
      { id: 'go', component: 'ActionBar', actions: [{ label: 'Morning cockpit', prompt: '/mama-manager' }, { label: 'Allocate leads', prompt: '/mama-allocate' }] },
    ],
  };
}

export function BookView({ rail, ctx }: { rail: Rail | null; ctx: CardCtx }) {
  const me = rail?.me;
  const parts = useMemo(() => {
    if (!me) return [];
    const blocks = [bookBlock(me.id, me.name.split(' ')[0] || me.id), ...(me.role === 'manager' ? [teamBlock()] : [])];
    return blocks.map(b => parseBlock(JSON.stringify(b)));
  }, [me?.id, me?.name, me?.role]);
  return (
    <section className="book-view" aria-label="Book">
      <div className="book-col">
        {!me && <div className="problem">{rail?.problem ?? 'Loading your book…'}</div>}
        {parts.map((p, i) => p.kind === 'surface'
          ? <div className="book-surface" key={p.block.surfaceId} style={{ animationDelay: `${i * 90}ms` }}><SurfaceView block={p.block} issues={p.issues} ctx={ctx} /></div>
          : null)}
      </div>
    </section>
  );
}
