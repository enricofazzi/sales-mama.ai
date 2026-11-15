// "Share as page": a self-contained HTML file built in the browser and downloaded. The page holds the
// surface, its resolved data and the viewer bundle; it makes no network calls. Nothing is written to
// the repo (ADR-0006); publishing it anywhere is the user's choice.
import type { SurfaceBlock } from '../../shared/a2ui';

export interface ExportPayload { block: SurfaceBlock; data: unknown; generated: string }

let viewer: Promise<{ js: string; css: string }> | null = null;

export function pageHtml(p: ExportPayload, bundle: { js: string; css: string }): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const json = JSON.stringify(p).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const js = bundle.js.replace(/<\/script/gi, '<\\/script');
  const css = bundle.css.replace(/<\/style/gi, '<\\/style');
  const title = p.block.title ?? p.block.surfaceId;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Sales Mama console">
<title>${esc(title)} · Sales Mama</title>
<style>${css}</style>
</head>
<body class="viewer">
<div id="root"></div>
<script type="application/json" id="mama-surface">${json}</script>
<script>${js}</script>
</body>
</html>
`;
}

export async function exportSurface(block: SurfaceBlock, data: unknown): Promise<void> {
  viewer ??= fetch('/api/viewer').then(async r => {
    if (!r.ok) { viewer = null; throw new Error(await r.text()); }
    return r.json();
  });
  const html = pageHtml({ block, data, generated: new Date().toISOString() }, await viewer);
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${new Date().toISOString().slice(0, 10)}-${block.surfaceId}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
