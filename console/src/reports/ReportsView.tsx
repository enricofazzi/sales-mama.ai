// Reports (spec §3, Phase 5): every saved report and data file, newest first. Opening one shows it in the
// canvas through a built-in A2UI view (data files) or its own saved surfaces (.view.md / .cards.md).
import { useEffect, useMemo, useState } from 'react';
import { splitParts } from '../../shared/a2ui';
import { reportPart, type CanvasPart, type Report } from './templates';
import type { CanvasContent } from '../canvas/Canvas';
import { fuzzy } from '../chat/Composer';

const KINDS: { key: Report['kind']; label: string; tone: string }[] = [
  { key: 'weekly', label: 'Weekly reviews', tone: 'mama' },
  { key: 'allocation', label: 'Allocations', tone: 'allocator' },
  { key: 'insights', label: 'Company insights', tone: 'researcher' },
  { key: 'company', label: 'Company checks', tone: 'scout' },
  { key: 'view', label: 'Saved views', tone: 'vam' },
];

export async function openReport(r: Report): Promise<CanvasContent> {
  if (r.kind === 'view') {
    const res = await fetch(`/api/source?path=${encodeURIComponent(r.path)}`);
    if (!res.ok) throw new Error(await res.text());
    const file = await res.json() as { text: string };
    const parts: CanvasPart[] = splitParts(file.text).flatMap(p => (p.kind === 'surface' ? [{ block: p.block, issues: p.issues }] : []));
    return { key: r.path, title: r.title, parts, source: r.path };
  }
  const res = await fetch(`/api/data?path=${encodeURIComponent(r.path)}`);
  if (!res.ok) throw new Error(await res.text());
  return { key: r.path, title: r.title, parts: [reportPart(r, await res.json())], source: r.path };
}

export function ReportsView({ onOpen, current }: { onOpen: (c: CanvasContent) => void; current?: string }) {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState<Report['kind'] | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  useEffect(() => { fetch('/api/reports').then(r => r.json()).then(setReports).catch(e => setError(String(e))); }, []);

  const shown = useMemo(() => (reports ?? [])
    .filter(r => kind === 'all' || r.kind === kind)
    .filter(r => !q || Math.max(fuzzy(q, r.title, false), fuzzy(q, r.subtitle, false), fuzzy(q, r.path, false)) > 0), [reports, q, kind]);
  const open = async (r: Report) => {
    setOpening(r.path); setError(null);
    try { onOpen(await openReport(r)); } catch (e) { setError(`${r.path}: ${(e as Error).message}`); } finally { setOpening(null); }
  };
  const when = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

  return (
    <section className="reports" aria-label="Reports">
      <div className="rp-col">
        <header className="rp-head">
          <h1>Reports</h1>
          <p>Every weekly review, allocation, company check and insight the team saved. Open one to see it in the canvas; share it as a page from there.</p>
        </header>
        <div className="rp-tools">
          <input type="search" className="a2-filter" placeholder="Search reports" value={q} onChange={e => setQ(e.target.value)} aria-label="Search reports" />
          <div className="cal-filters" role="group" aria-label="Kind">
            <button type="button" className={`fchip${kind === 'all' ? '' : ' off'}`} style={{ ['--k' as any]: 'var(--ink)', ['--kt' as any]: 'var(--neutral-t)' }} onClick={() => setKind('all')}>
              All<b>{reports?.length ?? 0}</b></button>
            {KINDS.map(k => (
              <button key={k.key} type="button" className={`fchip${kind === k.key ? '' : ' off'}`} style={{ ['--k' as any]: `var(--${k.tone})`, ['--kt' as any]: `var(--${k.tone}-t)` }}
                onClick={() => setKind(kind === k.key ? 'all' : k.key)}>{k.label}<b>{(reports ?? []).filter(r => r.kind === k.key).length}</b></button>
            ))}
          </div>
        </div>
        {error && <div className="problem">{error}</div>}
        {!reports && !error && <div className="today-skel" />}
        {reports && shown.length === 0 && <p className="muted">No reports match. Run /mama-weekly, /mama-allocate or /company-insights to create some.</p>}
        <ul className="rp-list">
          {shown.map((r, i) => {
            const k = KINDS.find(x => x.key === r.kind)!;
            return (
              <li key={r.path} style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}>
                <button type="button" className={`rp-card tone-${k.tone}${current === r.path ? ' on' : ''}`} onClick={() => open(r)} disabled={opening === r.path} aria-current={current === r.path}>
                  <span className="rp-kind">{k.label.replace(/s$/, '')}</span>
                  <b>{r.title}</b>
                  <span className="rp-sub">{r.subtitle}</span>
                  <span className="rp-meta">{when(r.updated)} · {r.path}</span>
                  {opening === r.path && <span className="rp-open">Opening…</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
