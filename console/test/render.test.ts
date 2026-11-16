// @vitest-environment happy-dom
// Renders real surfaces with the real catalog in a DOM (happy-dom): bound numbers appear,
// send actions never do, and a legacy mama-card still renders through the shim.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { catalog } from '../src/a2ui/catalog';
import { SurfaceContext } from '../src/a2ui/components';
import { CardView } from '../src/components/Cards';
import { splitParts, toMessages, type SurfaceBlock } from '../shared/a2ui';

const WEEKLY = {
  week: '2026-W45',
  metrics: { week: { total: { sent: 31, replies: 6, reply_rate: 0.19, meetings: 2 } } },
  funnel: { stages: { new: { now: 70 }, researched: { now: 10 }, contacted: { now: 4 } } },
  calibration: { tiers: { A: { contacted: 20, meetings: 4, meeting_rate: 0.2 }, C: { contacted: 20, meetings: 4, meeting_rate: 0.2 } }, verdict: 'propose' },
  allocation: { conversion: [{ rep: 'mei', industry: 'clinics', contacted: 12, meetings: 2, smoothed_rate: 0.1219 }] },
};

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

async function render(text: string, data: unknown) {
  const part = splitParts(text).find(p => p.kind === 'surface');
  if (!part || part.kind !== 'surface') throw new Error('no surface');
  const proc = new MessageProcessor([catalog]);
  proc.processMessages(toMessages(part.block as SurfaceBlock, data) as any);
  const surface = proc.getSurface(part.block.surfaceId)!;
  const ctx = { onPrompt: () => {}, onSource: () => {}, disabled: false };
  const el = document.createElement('div');
  document.body.appendChild(el);
  await act(async () => { createRoot(el).render(createElement(SurfaceContext.Provider, { value: ctx }, createElement(A2uiSurface, { surface: surface as any }))); });
  // Basic-catalog components are Lit custom elements that host their React children after an update cycle.
  for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)); });
  return { html: el.innerHTML, part };
}

describe('rendering surfaces', () => {
  it('draws KPIs, funnel, table and actions from the dataRef data', async () => {
    const block = {
      surfaceId: 'weekly_w45', dataRef: 'log/weekly/2026-W45.json',
      components: [
        { id: 'root', component: 'Column', children: ['lead', 'grid', 'conv', 'go'] },
        { id: 'lead', component: 'Callout', tone: 'warn', text: 'Tier A converts no better than C yet.' },
        { id: 'grid', component: 'Grid', children: ['sent', 'mtg', 'funnel'] },
        { id: 'sent', component: 'KpiTile', label: 'Sent this week', value: { path: '/metrics/week/total/sent' } },
        { id: 'mtg', component: 'KpiTile', label: 'Meetings', value: { path: '/metrics/week/total/meetings' } },
        { id: 'funnel', component: 'Panel', title: 'Funnel', children: ['f'] },
        { id: 'f', component: 'Funnel', data: { path: '/funnel/stages' } },
        { id: 'conv', component: 'DataTable', rows: { path: '/allocation/conversion' },
          columns: [{ key: 'rep', label: 'Rep' }, { key: 'industry', label: 'Industry' }, { key: 'smoothed_rate', label: 'Rate', numeric: true, format: 'percent' }] },
        { id: 'go', component: 'ActionBar', actions: [{ label: 'Send them', prompt: '/mama-send' }, { label: 'Open allocation', prompt: '/mama-allocate' }] },
      ],
    };
    const { html, part } = await render('```a2ui\n' + JSON.stringify(block) + '\n```', WEEKLY);
    expect(part.kind === 'surface' && part.issues).toEqual(['go (ActionBar): dropped 1 action(s) (send, or more than 4)']);
    expect(html).toContain('Tier A converts no better than C yet.');
    expect(html).toMatch(/Sent this week<\/span><span class="n">31/);
    expect(html).toMatch(/researched<\/span>.*10/);
    expect(html).toContain('14% of new');
    expect(html).toContain('clinics');
    expect(html).toContain('12%');
    expect(html).toContain('Open allocation');
    expect(html).not.toMatch(/Send them/);
  });

  it('an operational card surface looks exactly like the old card', async () => {
    const card = { type: 'draft', title: 'First email · Harbourlight', agent: 'writer', account: 'harbourlight-foods', to: 'ops@harbourlight.example',
      channel: 'email', subject: 'Tender win', body: 'Congrats on the tender.', signal: 'GeBIZ award', pattern: 'p1', checks: ['suppression', 'entities'],
      send_window: '09:00–11:30', refs: ['wiki/accounts/harbourlight-foods.md'] };
    const { type, ...fields } = card;
    const { checks, ...rest } = fields;
    const viaA2ui = await render('```a2ui\n' + JSON.stringify({ surfaceId: 'd1', components: [{ id: 'root', component: 'DraftCard', ...rest, passed: checks }] }) + '\n```', undefined);
    const el = document.createElement('div');
    await act(async () => { createRoot(el).render(createElement(CardView, { card: card as any, issues: [], ctx: { onPrompt: () => {}, onSource: () => {}, disabled: false } })); });
    expect(viaA2ui.html).toContain(el.innerHTML);
    expect(viaA2ui.part.kind === 'surface' && viaA2ui.part.issues).toEqual([]);
  });

  it('card fields bind to data too (AccountCard from a JSON file)', async () => {
    const block = { surfaceId: 'acc', components: [{ id: 'root', component: 'AccountCard', title: { path: '/name' }, account_id: 'kestrel-physio',
      name: { path: '/name' }, market: 'SG', tier: { path: '/tier' }, score: { path: '/score' }, score_parts: { path: '/parts' } }] };
    const { html, part } = await render('```a2ui\n' + JSON.stringify(block) + '\n```',
      { name: 'Kestrel Physio', tier: 'B', score: 0.68, parts: { fit: 0.8, intent: 0.6, propensity: 0, engagement: 0 } });
    expect(part.kind === 'surface' && part.issues).toEqual([]);
    expect(html).toContain('Kestrel Physio');
    expect(html).toContain('0.68');
  });

  it('AgendaList and CalendarWeek render a calendar file bound through dataRef', async () => {
    const cal = { type: 'calendar', date: '2026-11-16', generated: 'x', tz: 'Asia/Singapore', window: { from: '2026-11-02', to: '2027-01-15' },
      markets: { SG: { tz: 'Asia/Singapore', send_windows: { days: ['mon', 'tue', 'wed', 'thu'], hours: '09:00-11:30' } } }, next_up: null,
      items: [{ id: 'apt-1', kind: 'meeting', status: 'confirmed', title: 'Discovery call', start: '2026-11-16T14:00:00+08:00', end: '2026-11-16T14:45:00+08:00',
        all_day: false, live: true, rep: 'praveen', account: { id: 'kestrel-physio', name: 'Kestrel Physio' }, ref: 'log/appointments.csv' }] };
    const block = { surfaceId: 'sched', dataRef: 'wiki/books/praveen.calendar.json', components: [
      { id: 'root', component: 'Column', children: ['ag', 'wk'] },
      { id: 'ag', component: 'AgendaList', items: { path: '/items' }, day: '2026-11-16' },
      { id: 'wk', component: 'CalendarWeek', calendar: { path: '/' }, start: '2026-11-16' }] };
    const { html, part } = await render('```a2ui\n' + JSON.stringify(block) + '\n```', cal);
    expect(part.kind === 'surface' && part.issues).toEqual([]);
    expect(html).toContain('Kestrel Physio');
    expect(html).toContain('14:00');
    expect(html).toMatch(/class="wk"/);
    expect(html).toMatch(/class="ev /);
  });

  it('renders a legacy mama-card through the shim', async () => {
    const text = '```mama-card\n{"type":"stats","title":"Book","tiles":[{"label":"Active","value":3}]}\n```';
    const { html } = await render(text, undefined);
    expect(html).toContain('Book');
    expect(html).toContain('Active');
  });
});
