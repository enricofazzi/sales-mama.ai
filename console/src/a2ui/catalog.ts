// One catalog for every surface: the Sales Mama components plus A2UI's basic catalog (Row, Column,
// Text, Tabs, ChoicePicker, …). Protocol v0.9 until @a2ui/react ships a v1.0 renderer (ADR-0009).
import { Catalog } from '@a2ui/web_core/v0_9';
import { basicCatalog, injectBasicCatalogStyles } from '@a2ui/web_core/v0_9/basic_catalog';
import { CATALOG_ID, INSTRUCTIONS, PROTOCOL } from '../../shared/a2ui-api';
import { SALES_MAMA_COMPONENTS } from './components';

export const catalog = new Catalog(
  CATALOG_ID, PROTOCOL,
  [...SALES_MAMA_COMPONENTS, ...(basicCatalog.components.values() as Iterable<any>)],
  [...basicCatalog.functions.values()],
  undefined, INSTRUCTIONS,
);

let styled = false;
export function ensureStyles() {
  if (styled || typeof document === 'undefined') return;
  injectBasicCatalogStyles(document);
  styled = true;
}
