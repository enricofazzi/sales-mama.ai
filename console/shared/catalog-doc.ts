// The Sales Mama A2UI catalog document (a2ui/catalog.json): what agents may emit, generated from the
// Zod APIs plus the basic catalog. `npm run catalog` rewrites it; a test keeps it in sync.
import { Catalog } from '@a2ui/web_core/v0_9';
import { basicCatalog } from '@a2ui/web_core/v0_9/basic_catalog';
import { API, CATALOG_ID, COMPONENTS, DATA_PROPS, INSTRUCTIONS, PROTOCOL } from './a2ui-api';

export function catalogDoc(): Record<string, unknown> {
  const ours = COMPONENTS.filter(n => n !== 'LegacyCard').map(name => ({ name, schema: API[name].schema }));
  const cat = new Catalog(CATALOG_ID, PROTOCOL, [...ours, ...(basicCatalog.components.values() as Iterable<any>)] as any,
    [...basicCatalog.functions.values()], undefined, INSTRUCTIONS);
  // zod-to-json-schema warns about the recursive FunctionCall type and falls back to $refs; that is fine.
  const warn = console.warn;
  console.warn = () => {};
  let doc: Record<string, any>;
  try { doc = cat.toJson() as Record<string, any>; } finally { console.warn = warn; }
  return {
    ...doc,
    title: 'Sales Mama A2UI catalog',
    'x-sales-mama': {
      protocol: PROTOCOL,
      salesMamaComponents: COMPONENTS.filter(n => n !== 'LegacyCard'),
      basicComponents: [...basicCatalog.components.keys()],
      dataProps: DATA_PROPS,
      docs: Object.fromEntries(COMPONENTS.filter(n => n !== 'LegacyCard').map(n => [n, API[n].doc])),
    },
  };
}
