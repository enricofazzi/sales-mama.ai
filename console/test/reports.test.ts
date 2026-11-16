import { describe, expect, it } from 'vitest';
import { reportPart, type Report } from '../src/reports/templates';
import { DATA_PROPS } from '../shared/a2ui-api';

const rep = (kind: Report['kind'], path: string): Report => ({ kind, path, title: `T ${kind}`, subtitle: 's', updated: '2026-11-16T00:00:00Z', bytes: 1 });
const INSIGHTS = {
  title: 'Clinics', summary: ['x'], order: ['overview', 'by_year', 'age', 'types', 'where', 'leads', 'company', 'vs', 'cmp'],
  sections: {
    overview: { kind: 'metrics', title: 'Overview', items: [{ key: 'count', label: 'Live', value: 3 }] },
    by_year: { kind: 'series', title: 'Per year', dimension: 'time', items: [] },
    age: { kind: 'series', title: 'Age', dimension: 'ordinal', items: [] },
    types: { kind: 'series', title: 'Types', dimension: 'category', share_of_total: true, items: [] },
    where: { kind: 'series', title: 'Where', dimension: 'category', items: [] },
    leads: { kind: 'rows', title: 'Leads', columns: [{ key: 'name', label: 'Company' }, { key: 'rank', label: 'Rank', numeric: true }], rows: [] },
    company: { kind: 'company', title: 'Acme', verdict: 'Verified', score: 90, facts: {}, groups: [] },
    vs: { kind: 'comparison', title: 'vs peers', items: [] },
    cmp: { kind: 'compare', title: 'Side by side', companies: [], rows: [] },
  },
};

describe('report views', () => {
  it.each([
    ['weekly', 'log/weekly/2026-W47.json', {}],
    ['allocation', 'log/allocation/2026-11-16.json', {}],
    ['company', 'company-check/reports/2026-11-05-197200078R.json', {}],
    ['insights', 'company-check/reports/insights-clinics-2026-11-16.json', INSIGHTS],
  ] as const)('%s builds a valid surface bound to its file', (kind, path, data) => {
    const part = reportPart(rep(kind, path), data);
    expect(part.issues).toEqual([]);
    expect(part.block.dataRef).toBe(path);
    for (const c of part.block.components) {
      for (const prop of (DATA_PROPS as Record<string, string[]>)[c.component] ?? []) {
        if (c[prop] !== undefined) expect(c[prop], `${c.id}.${prop}`).toHaveProperty('path');
      }
    }
  });

  it('insights pick the visual from the section shape', () => {
    const kinds = Object.fromEntries(reportPart(rep('insights', 'company-check/reports/insights-x.json'), INSIGHTS).block.components.map(c => [c.id, c.component]));
    expect(kinds).toMatchObject({ m_overview: 'StatGrid', s_by_year: 'LineChart', s_age: 'BarChart', s_types: 'DonutChart', s_where: 'BarChart',
      r_leads: 'DataTable', v_company: 'Verdict', c_company: 'CheckList', x_cmp: 'CompareTable', b_vs: 'BarChart' });
  });
});
