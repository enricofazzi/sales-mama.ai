// One A2UI surface in the chat: loads its dataRef (read-only), runs the v0.9 message processor with
// the Sales Mama catalog and renders it. Events: "prompt" sends the next turn, "open" opens a file.
import { useEffect, useMemo, useState } from 'react';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { MessageProcessor } from '@a2ui/web_core/v0_9';
import { isBare, toMessages, type SurfaceBlock } from '../../shared/a2ui';
import { catalog, ensureStyles } from './catalog';
import { SurfaceContext, type SurfaceCtx } from './components';
import { exportSurface } from './exportPage';

const SEND = /\bsend\b/i;

export function SurfaceView({ block, issues, ctx, preloaded, readOnly }: {
  block: SurfaceBlock; issues: string[]; ctx: SurfaceCtx; preloaded?: { data: unknown }; readOnly?: boolean;
}) {
  const [data, setData] = useState<{ ok: true; value: unknown } | { ok: false; error: string } | null>(
    preloaded ? { ok: true, value: preloaded.data } : block.dataRef ? null : { ok: true, value: undefined });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (preloaded || !block.dataRef) return;
    let live = true;
    fetch(`/api/data?path=${encodeURIComponent(block.dataRef)}`)
      .then(async r => (r.ok ? { ok: true as const, value: await r.json() } : { ok: false as const, error: await r.text() }))
      .catch(e => ({ ok: false as const, error: String(e) }))
      .then(d => { if (live) setData(d); });
    return () => { live = false; };
  }, [block.dataRef, preloaded]);

  const built = useMemo(() => {
    if (!data) return null;
    ensureStyles();
    const errors: string[] = [];
    const proc = new MessageProcessor([catalog], action => {
      const c = (action.context ?? {}) as Record<string, unknown>;
      if (action.name === 'prompt' && typeof c.prompt === 'string' && !SEND.test(c.prompt)) ctx.onPrompt(c.prompt);
      else if (action.name === 'open' && typeof c.path === 'string') ctx.onSource(c.path);
    });
    try {
      proc.processMessages(toMessages(block, data.ok ? data.value : undefined) as any);
    } catch (e) {
      errors.push((e as Error).message);
    }
    const surface = proc.getSurface(block.surfaceId);
    surface?.onError?.subscribe?.((err: any) => { errors.push(err?.message ?? String(err)); });
    return { surface, errors };
    // ctx callbacks are stable for a turn; rebuilding would reset filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, data]);

  const all = [...issues, ...(built?.errors ?? []), ...(data && !data.ok ? [`data ${block.dataRef}: ${data.error}`] : [])];
  if (isBare(block)) {
    // Operational cards keep the card look: no report frame, no share button.
    return (
      <>
        {built?.surface && <SurfaceContext.Provider value={ctx}><div className="surface-bare"><A2uiSurface surface={built.surface as any} /></div></SurfaceContext.Provider>}
        {all.length > 0 && <details className="issues bare"><summary>Shown best-effort: {all.length} issue{all.length > 1 ? 's' : ''}</summary><ul>{all.map(i => <li key={i}>{i}</li>)}</ul></details>}
      </>
    );
  }

  const share = async () => {
    setBusy(true);
    try { await exportSurface(block, data && data.ok ? data.value : undefined); }
    catch (e) { alert(`Couldn't build the page: ${(e as Error).message}`); }
    finally { setBusy(false); }
  };

  return (
    <article className={`surface a-${block.agent ?? 'mama'}`} aria-label={block.title ?? block.surfaceId}>
      {(block.title || block.subtitle) && (
        <header className="surface-head">
          <span className="t"><span className="tag">{block.agent ?? 'mama'}</span><span>{block.title}</span></span>
          {block.subtitle && <span className="sub">{block.subtitle}</span>}
        </header>
      )}
      <div className="surface-body">
        {!data && <div className="pending-card">Loading {block.dataRef}…</div>}
        {built?.surface && (
          <SurfaceContext.Provider value={ctx}>
            <A2uiSurface surface={built.surface as any} />
          </SurfaceContext.Provider>
        )}
      </div>
      <footer className="surface-foot">
        {block.dataRef && (
          <button type="button" className="ref" title="Open the data behind this view" onClick={() => ctx.onSource(block.dataRef!)}>data · {block.dataRef}</button>
        )}
        {block.refs?.map(r => <button key={r} type="button" className="ref" title={r} onClick={() => ctx.onSource(r)}>{r}</button>)}
        {!readOnly && ctx.openCanvas && (
          <button type="button" className="ghost small" onClick={() => ctx.openCanvas!({ block, issues, data: data && data.ok ? data.value : undefined })}
            title="Open this view wide, beside the chat">Open in canvas</button>
        )}
        {!readOnly && <button type="button" className={`ghost small${ctx.openCanvas ? ' tight' : ''}`} onClick={share} disabled={busy || !built?.surface}>{busy ? 'Building page…' : 'Share as page'}</button>}
      </footer>
      {all.length > 0 && (
        <details className="issues">
          <summary>Shown best-effort: {all.length} issue{all.length > 1 ? 's' : ''} (Sales Mama A2UI catalog)</summary>
          <ul>{all.map(i => <li key={i}>{i}</li>)}</ul>
        </details>
      )}
    </article>
  );
}
