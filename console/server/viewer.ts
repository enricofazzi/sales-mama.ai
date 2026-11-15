// Builds the shared-page viewer (src/viewer.tsx) in memory: one IIFE script plus one stylesheet,
// with no external URLs, for exportPage.ts to inline. Cached for the life of the server.
import { join } from 'node:path';
import { build } from 'vite';
import react from '@vitejs/plugin-react';

let cached: Promise<{ js: string; css: string }> | null = null;

export function buildViewer(consoleDir: string): Promise<{ js: string; css: string }> {
  cached ??= (async () => {
    const out = await build({
      configFile: false, root: consoleDir, logLevel: 'warn', plugins: [react()],
      define: { 'process.env.NODE_ENV': '"production"' },
      build: {
        write: false, minify: true, cssCodeSplit: false, assetsInlineLimit: 1e9, sourcemap: false,
        rollupOptions: { input: join(consoleDir, 'src', 'viewer.tsx'), output: { format: 'iife', inlineDynamicImports: true } },
      },
    });
    const outputs = (Array.isArray(out) ? out : [out]).flatMap((o: any) => o.output ?? []);
    const js = outputs.filter((o: any) => o.type === 'chunk').map((o: any) => o.code).join('\n');
    const css = outputs.filter((o: any) => o.type === 'asset' && String(o.fileName).endsWith('.css')).map((o: any) => String(o.source)).join('\n');
    if (!js) throw new Error('empty viewer bundle');
    return { js, css };
  })().catch(e => { cached = null; throw e; });
  return cached;
}
