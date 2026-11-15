import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalogDoc } from '../shared/catalog-doc';
import { API, COMPONENTS } from '../shared/a2ui-api';

describe('catalog document', () => {
  it('a2ui/catalog.json is in sync with shared/a2ui-api.ts (run `npm run catalog`)', () => {
    const file = JSON.parse(readFileSync(join(__dirname, '..', 'a2ui', 'catalog.json'), 'utf8'));
    expect(file).toEqual(JSON.parse(JSON.stringify(catalogDoc())));
  });
  it('lists every Sales Mama component except the internal LegacyCard, plus the basic catalog', () => {
    const doc: any = catalogDoc();
    for (const n of COMPONENTS.filter(c => c !== 'LegacyCard')) expect(doc.components[n], n).toBeTruthy();
    expect(doc.components.LegacyCard).toBeUndefined();
    expect(doc.components.Column && doc.components.ChoicePicker && doc.components.Tabs).toBeTruthy();
    expect(doc.instructions).toMatch(/Numbers come from scripts/);
    expect(Object.keys(doc['x-sales-mama'].docs)).toEqual(COMPONENTS.filter(c => c !== 'LegacyCard'));
    expect(API.ActionBar.doc).toMatch(/Never a send/);
  });
});
