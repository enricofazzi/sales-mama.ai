// npm run catalog → rewrites a2ui/catalog.json from shared/a2ui-api.ts (ADR-0009).
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogDoc } from '../shared/catalog-doc';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'a2ui', 'catalog.json');
writeFileSync(out, JSON.stringify(catalogDoc(), null, 2) + '\n');
console.log(`Wrote ${out}`);
