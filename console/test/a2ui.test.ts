import { describe, expect, it } from 'vitest';
import { MessageProcessor, Catalog } from '@a2ui/web_core/v0_9';
import { basicCatalog } from '@a2ui/web_core/v0_9/basic_catalog';
import { API, CATALOG_ID, COMPONENTS } from '../shared/a2ui-api';
import { at, dataRefAllowed, isBare, parseBlock, splitParts, toMessages, type SurfaceBlock } from '../shared/a2ui';

const fence = (o: unknown) => '```a2ui\n' + JSON.stringify(o) + '\n```';
const weekly = {
  surfaceId: 'weekly_w45', title: 'Weekly review', dataRef: 'log/weekly/2026-W45.json',
  data: { tier: 'all' },
  components: [
    { id: 'root', component: 'Column', children: ['lead', 'kpi', 'tiers', 'go'] },
    { id: 'lead', component: 'Callout', text: 'Too early to judge tiers.', tone: 'warn' },
    { id: 'kpi', component: 'KpiTile', label: 'Sent', value: { path: '/metrics/week/total/sent' } },
    { id: 'tiers', component: 'BarChart', data: { path: '/calibration/tiers' }, y: 'meeting_rate', format: 'percent' },
    { id: 'go', component: 'ActionBar', actions: [{ label: 'Open the allocation', prompt: '/mama-allocate' }] },
  ],
};
const ok = (raw: unknown) => {
  const p = parseBlock(JSON.stringify(raw));
  if (p.kind !== 'surface') throw new Error(JSON.stringify(p));
  return p;
};

describe('a2ui blocks', () => {
  it('splits markdown, a2ui, legacy mama-card and a streaming fence in order', () => {
    const card = '```mama-card\n{"type":"stats","title":"T","tiles":[]}\n```';
    const parts = splitParts(`Summary line.\n\n${fence(weekly)}\n\nMore.\n\n${card}\n\n\`\`\`a2ui\n{"surf`);
    expect(parts.map(p => p.kind)).toEqual(['md', 'surface', 'md', 'surface', 'pending']);
    const legacy = parts[3] as Extract<typeof parts[number], { kind: 'surface' }>;
    expect(legacy.block.legacy).toBe(true);
    expect(legacy.block.components[0].component).toBe('LegacyCard');
  });

  it('hides a fence that is only partly typed', () => {
    expect(splitParts('Done.\n``').map(p => p.kind)).toEqual(['md']);
    expect((splitParts('Done.\n```a2')[0] as any).text.trim()).toBe('Done.');
  });

  it('accepts a well-formed compact block with bindings', () => {
    expect(ok(weekly).issues).toEqual([]);
  });

  it('flags components outside the catalog, missing root and dangling children', () => {
    const p = ok({ surfaceId: 's', components: [{ id: 'top', component: 'Column', children: ['x'] }, { id: 'x', component: 'Marquee' }] });
    expect(p.issues.join('\n')).toMatch(/no component with id "root"/);
    expect(p.issues.join('\n')).toMatch(/Marquee\): not in the Sales Mama catalog/);
  });

  it('flags numbers typed into data props when the block has a dataRef', () => {
    const b = structuredClone(weekly);
    (b.components[2] as any).value = 42;
    expect(ok(b).issues.join('\n')).toMatch(/"value" is typed in/);
  });

  it('never offers a send action and caps actions at 4', () => {
    const b = structuredClone(weekly);
    b.components[4] = { id: 'go', component: 'ActionBar', actions: [
      { label: 'Send all', prompt: '/mama-send' }, { label: 'Go', prompt: 'send 1 and 3' },
      ...[1, 2, 3, 4, 5].map(i => ({ label: `A${i}`, prompt: `/mama-book ${i}` }))] } as any;
    b.components.push({ id: 'btn', component: 'Button', child: 'lead', action: { event: { name: 'prompt', context: { prompt: '/mama-send --send' } } } } as any);
    (b.components[0] as any).children.push('btn');
    const p = ok(b);
    const bar = p.block.components.find(c => c.id === 'go')!;
    expect((bar.actions as any[]).map(a => a.label)).toEqual(['A1', 'A2', 'A3', 'A4']);
    expect(p.block.components.find(c => c.id === 'btn')!.action).toBeUndefined();
  });

  it('keeps dataRef inside the read-only data folders', () => {
    expect(dataRefAllowed('log/weekly/2026-W45.json')).toBe(true);
    expect(dataRefAllowed('wiki/books/mei.json')).toBe(true);
    for (const bad of ['knowledge/scoring.yaml', '../secrets.json', 'log/../.env.json', '/etc/x.json', 'company-check/data/x.json']) {
      expect(dataRefAllowed(bad)).toBe(false);
    }
    expect(ok({ ...weekly, dataRef: 'company-check/data/registry.json' }).issues.join()).toMatch(/dataRef/);
  });

  it('accepts raw v0.9 messages too', () => {
    const p = ok({ messages: [
      { version: 'v0.9', createSurface: { surfaceId: 'raw1', catalogId: CATALOG_ID } },
      { version: 'v0.9', updateComponents: { surfaceId: 'raw1', components: [{ id: 'root', component: 'Text', text: 'hi' }] } },
      { version: 'v0.9', updateDataModel: { surfaceId: 'raw1', path: '/x', value: 1 } }] });
    expect(p.block.surfaceId).toBe('raw1');
    expect(p.issues).toEqual([]);
  });

  it('expands to v0.9 messages that the A2UI processor accepts, with dataRef at / and data at /ui', () => {
    const b = ok(weekly).block as SurfaceBlock;
    const msgs = toMessages(b, { metrics: { week: { total: { sent: 7 } } }, calibration: { tiers: [] } });
    expect(Object.keys(msgs[0])).toContain('createSurface');
    const cat = new Catalog(CATALOG_ID, 'v0.9', [...COMPONENTS.map(name => ({ name, schema: API[name].schema })), ...basicCatalog.components.values()] as any);
    const proc = new MessageProcessor([cat]);
    proc.processMessages(msgs as any);
    const s: any = proc.getSurface('weekly_w45');
    expect(s.dataModel.get('/metrics/week/total/sent')).toBe(7);
    expect(s.dataModel.get('/ui/tier')).toBe('all');
    expect([...s.componentsModel.components.keys()]).toContain('tiers');
  });

  it('maps old mama-cards to the native card components; retired report cards to LegacyCard', () => {
    const draft = splitParts('```mama-card\n{"type":"draft","title":"First email","account":"acme","channel":"email","body":"Hi","checks":["suppression"],"actions":[{"label":"Send now","prompt":"/mama-send"}]}\n```')[0] as any;
    expect(draft.block.components[0]).toMatchObject({ component: 'DraftCard', account: 'acme', title: 'First email', passed: ['suppression'] });
    expect(draft.block.components[0].actions).toEqual([]);
    const book = splitParts('```mama-card\n{"type":"book","title":"B","rep":"m","active":1,"capacity":2}\n```')[0] as any;
    expect(book.block.components[0].component).toBe('LegacyCard');
  });

  it('validates operational card fields with the card schema and strips send actions', () => {
    const p = ok({ surfaceId: 'd', components: [
      { id: 'root', component: 'Column', children: ['a', 'b'] },
      { id: 'a', component: 'DraftCard', title: 'Draft', account: 'acme', channel: 'email', body: 'Hi', passed: ['ok'],
        actions: [{ label: 'Send it', prompt: '/mama-send' }, { label: 'Edit', prompt: '/mama-draft acme first' }] },
      { id: 'b', component: 'ReplyCard', title: 'Reply', account: 'acme' }] });
    expect(p.issues.join('\n')).toMatch(/b \(ReplyCard\).*class/);
    expect(p.issues.join('\n')).not.toMatch(/DraftCard\): (passed|checks|must)/);
    expect((p.block.components[1].actions as any[]).map(a => a.label)).toEqual(['Edit']);
    expect(isBare(p.block)).toBe(true);
    expect(isBare(ok(weekly).block)).toBe(false);
  });

  it('resolves paths in plain data', () => {
    expect(at({ a: { b: [10, 20] } }, '/a/b/1')).toBe(20);
    expect(at({ a: 1 }, '/x/y')).toBeUndefined();
  });
});
