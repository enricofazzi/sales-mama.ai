// Entry for shared pages (exportPage.ts): renders one surface from the JSON embedded in the page.
// Read-only: no prompts, no file access, no network.
import { createRoot } from 'react-dom/client';
import { SurfaceView } from './a2ui/Surface';
import type { ExportPayload } from './a2ui/exportPage';
import './styles.css';
import './a2ui/a2ui.css';

const el = document.getElementById('mama-surface');
const p = JSON.parse(el?.textContent ?? '{}') as ExportPayload;
const noop = () => {};

createRoot(document.getElementById('root')!).render(
  <main className="viewer-main">
    <div className="brand"><span className="logo" aria-hidden="true">SM</span>Sales Mama</div>
    <SurfaceView block={p.block} issues={[]} ctx={{ onPrompt: noop, onSource: noop, disabled: true, readOnly: true }} preloaded={{ data: p.data }} readOnly />
    <footer className="viewer-foot">
      Generated {p.generated?.slice(0, 16).replace('T', ' ')} UTC{p.block.dataRef ? ` from ${p.block.dataRef}` : ''}.
      Numbers come from Sales Mama scripts; the layout was generated. A snapshot: it does not update.
    </footer>
  </main>,
);
