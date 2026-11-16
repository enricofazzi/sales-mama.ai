// The canvas (spec §5.1, Phase 5): wide views open beside the chat (ChatGPT canvas / Claude artifacts).
// Resizable by dragging its left edge; the width is remembered per browser; Esc closes it. It only renders.
import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { CanvasPart } from '../reports/templates';
import { SurfaceView } from '../a2ui/Surface';
import type { SurfaceCtx } from '../a2ui/components';

export interface CanvasContent { key: string; title: string; parts: CanvasPart[]; source?: string }
const KEY = 'mama.canvas.w';
const clamp = (w: number) => Math.round(Math.max(380, Math.min(w, Math.min(1180, window.innerWidth * 0.72))));

export function useCanvasWidth() {
  const [w, setW] = useState(() => { try { return clamp(Number(localStorage.getItem(KEY)) || 620); } catch { return 620; } });
  const save = useCallback((n: number) => { const c = clamp(n); setW(c); try { localStorage.setItem(KEY, String(c)); } catch { /* private mode */ } }, []);
  return [w, save] as const;
}

export function Canvas({ content, width, onWidth, onClose, ctx }: {
  content: CanvasContent; width: number; onWidth: (w: number) => void; onClose: () => void; ctx: SurfaceCtx;
}) {
  const drag = useRef<{ x: number; w: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !(e.target as HTMLElement)?.closest?.('[role=dialog], textarea, input')) onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  const down = (e: PointerEvent<HTMLDivElement>) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, w: width }; setDragging(true); };
  const move = (e: PointerEvent<HTMLDivElement>) => { if (drag.current) onWidth(drag.current.w - (e.clientX - drag.current.x)); };
  const up = () => { drag.current = null; setDragging(false); };
  const innerCtx: SurfaceCtx = { ...ctx, openCanvas: undefined };
  return (
    <aside className={`canvas${dragging ? ' resizing' : ''}`} aria-label={`Canvas: ${content.title}`}>
      <div className="cv-handle" role="separator" aria-orientation="vertical" aria-label="Resize the canvas" tabIndex={0}
        aria-valuenow={width} onPointerDown={down} onPointerMove={move} onPointerUp={up}
        onKeyDown={e => { if (e.key === 'ArrowLeft') onWidth(width + 40); if (e.key === 'ArrowRight') onWidth(width - 40); }} />
      <header className="cv-head">
        <span className="cv-tag">Canvas</span>
        <h2>{content.title}</h2>
        {content.source && <button type="button" className="ref" onClick={() => ctx.onSource(content.source!)} title="Open the file behind this view">{content.source}</button>}
        <button type="button" className="evp-x" onClick={onClose} aria-label="Close the canvas (Esc)">×</button>
      </header>
      <div className="cv-body">
        {content.parts.length === 0 && <p className="muted">Nothing to show in this file.</p>}
        {content.parts.map((p, i) => (
          <SurfaceView key={`${content.key}-${i}`} block={p.block} issues={p.issues} ctx={innerCtx} preloaded={p.data !== undefined ? { data: p.data } : undefined} />
        ))}
      </div>
    </aside>
  );
}
