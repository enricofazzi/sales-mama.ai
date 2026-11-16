// One chat turn, Perplexity's structure in the Sales Mama look (spec §5.1):
//   header (skill · time · cost · actions) → activity (one line; tools, lanes, plan inside)
//   → the answer first (lead line, then surfaces) → numbered sources.
// A thin "story line" links the prompt, the agents' work and the answer.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { describeTool, relPath, type Item, type Lane, type TextItem, type ToolItem, type Turn } from '../../shared/stream';
import { splitParts, type Part } from '../../shared/a2ui';
import type { ChatTurn } from '../useBridge';
import { BadCard, CardView, PlanList, laneAgentClass, type CardCtx } from '../components/Cards';
import { Markdown } from '../components/Markdown';
import { SurfaceView } from '../a2ui/Surface';

const SOURCE_PREFIXES = ['wiki/', 'raw/', 'knowledge/', 'log/', 'reps/', 'templates/', 'docs/', 'company-check/reports/', 'company-check/evidence/', 'company-check/leads/'];

/** Text before the last tool call is narration (it moves into Activity); text after it is the answer. */
export function partition(items: Item[]) {
  let lastTool = -1;
  items.forEach((it, i) => { if (it.kind === 'tool') lastTool = i; });
  const narration: TextItem[] = [], answer: TextItem[] = [], tools: ToolItem[] = [];
  items.forEach((it, i) => {
    if (it.kind === 'tool') tools.push(it);
    else if (it.text.trim()) (i < lastTool ? narration : answer).push(it);
  });
  return { narration, answer, tools };
}

/** Repo files behind the turn: surface data and refs, card refs, and files the agent read. */
export function sourcesOf(parts: Part[], tools: ToolItem[]): string[] {
  const out: string[] = [];
  const add = (p: unknown) => { if (typeof p === 'string' && SOURCE_PREFIXES.some(x => p.startsWith(x)) && !out.includes(p)) out.push(p); };
  for (const p of parts) {
    if (p.kind !== 'surface') continue;
    add(p.block.dataRef);
    p.block.refs?.forEach(add);
    for (const c of p.block.components) {
      (Array.isArray(c.refs) ? c.refs : []).forEach(add);
      const card = c.card as { refs?: unknown[] } | undefined;
      (Array.isArray(card?.refs) ? card!.refs : []).forEach(add);
    }
  }
  for (const t of tools) if (t.name === 'Read' && t.status !== 'error') add(relPath(String(t.input.file_path ?? '')));
  return out;
}

const fmtTime = (ms: number) => (ms < 60_000 ? `${Math.max(1, Math.round(ms / 1000))} s` : `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`);

function useElapsed(running: boolean, startedAt?: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [running]);
  return startedAt ? now - startedAt : 0;
}

export function TurnView({ t, ctx }: { t: ChatTurn; ctx: CardCtx }) {
  const { turn } = t;
  // The bridge mutates turn.items in place and copies the turn object on every event, so depend on `turn`.
  const { narration, answer, tools } = useMemo(() => partition(turn.items), [turn]);
  // Narration's markdown stays in Activity; any views it printed are shown with the answer.
  const narrationParts = useMemo(() => narration.flatMap(n => splitParts(n.text)), [narration]);
  const answerParts = useMemo(() => [
    ...narrationParts.filter(p => p.kind !== 'md'),
    ...answer.flatMap(a => splitParts(a.text)),
  ], [narrationParts, answer]);
  const streamingAnswer = t.running && answer.length > 0 && !answer[answer.length - 1].done;
  const sources = useMemo(() => sourcesOf(answerParts, tools), [answerParts, tools]);
  const elapsed = useElapsed(t.running, t.startedAt);
  const title = t.prompt.startsWith('/') ? t.prompt.split(/\s+/)[0].slice(1) : 'Sales Mama';
  const answerText = answer.map(a => a.text).join('\n\n').replace(/```(a2ui|mama-card)[\s\S]*?```/g, '').trim();
  const thinking = t.running && !turn.items.length && !turn.lanes.length;

  return (
    <article className={`turn2${t.running ? ' running' : ''}`} aria-busy={t.running}>
      <div className={`you${t.prompt.startsWith('/') ? ' cmd' : ''}`}>{t.prompt}</div>
      <div className="t-row">
        <div className="t-av" aria-hidden="true"><span className="mama-dot">M</span></div>
        <div className="t-body" aria-live="polite">
          <TurnHeader title={title} t={t} elapsed={turn.result?.durationMs ?? elapsed} answerText={answerText} ctx={ctx} />
          {thinking && <p className="shimmer">{turn.hooks.length ? 'Starting the session…' : 'Thinking…'}</p>}
          {(tools.length > 0 || turn.lanes.length > 0 || turn.plan.length > 0 || narrationParts.some(p => p.kind === 'md')) && (
            <Activity turn={turn} tools={tools} narration={narrationParts} running={t.running} elapsedMs={turn.result?.durationMs ?? elapsed} ctx={ctx} />
          )}
          {answerParts.length > 0 && (
            <div className="answer">
              {answerParts.map((p, i) => renderPart(p, i, ctx, streamingAnswer && i === answerParts.length - 1, i === answerParts.findIndex(x => x.kind === 'md')))}
            </div>
          )}
          {turn.denied.length > 0 && !t.running && <NeedsApproval denied={turn.denied} />}
          {t.error && <CardView card={{ type: 'error', title: 'The run stopped', message: t.error.message, fix: t.error.fix }} issues={[]} ctx={ctx} />}
          {turn.result && !turn.result.ok && !t.error && (
            <CardView card={{ type: 'error', title: 'The run ended with an error', message: turn.result.error ?? 'Unknown error', fix: 'Run the same prompt in Claude Code to see the details.' }} issues={[]} ctx={ctx} />
          )}
          {sources.length > 0 && !t.running && <Sources sources={sources} onSource={ctx.onSource} />}
        </div>
      </div>
    </article>
  );
}

function renderPart(p: Part, i: number, ctx: CardCtx, streaming: boolean, lead: boolean): ReactNode {
  if (p.kind === 'md') return <div key={i} className={lead ? 'lead' : undefined}><Markdown text={p.text} onSource={ctx.onSource} streaming={streaming} /></div>;
  if (p.kind === 'surface') return <SurfaceView key={`${i}-${p.block.surfaceId}`} block={p.block} issues={p.issues} ctx={ctx} />;
  if (p.kind === 'bad') return <BadCard key={i} raw={p.raw} issues={p.issues} />;
  return <div key={i} className="skeleton" aria-label="Building a view"><span /><span /><span /></div>;
}

function TurnHeader({ title, t, elapsed, answerText, ctx }: { title: string; t: ChatTurn; elapsed: number; answerText: string; ctx: CardCtx }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(answerText); setCopied(true); window.setTimeout(() => setCopied(false), 1400); } catch { /* clipboard blocked */ }
  };
  const cost = t.turn.result?.costUsd;
  return (
    <header className="t-head">
      <span className="t-title">{title}</span>
      <span className="t-meta">
        {elapsed > 0 && <span>{fmtTime(elapsed)}</span>}
        {cost != null && <span>${cost.toFixed(2)}</span>}
      </span>
      {!t.running && (
        <span className="t-actions">
          {answerText && <button type="button" onClick={copy} aria-label="Copy the answer" title="Copy the answer">{copied ? 'Copied' : 'Copy'}</button>}
          {!t.id.startsWith('replay-') && t.id !== 'saved-result' && (
            <button type="button" onClick={() => ctx.onPrompt(t.prompt)} disabled={ctx.disabled} aria-label="Ask again" title="Ask again">Retry</button>
          )}
        </span>
      )}
    </header>
  );
}

function Activity({ turn, tools, narration, running, elapsedMs, ctx }: {
  turn: Turn; tools: ToolItem[]; narration: Part[]; running: boolean; elapsedMs: number; ctx: CardCtx;
}) {
  const failed = tools.filter(x => x.status === 'error').length;
  const agents = turn.lanes.length;
  const [open, setOpen] = useState<boolean | null>(null);
  const isOpen = open ?? (failed > 0 && !running);
  const current = [...tools].reverse().find(x => x.status === 'running');
  const doneSteps = turn.plan.filter(s => s.status === 'done').length;
  const line = running
    ? (current ? describeTool(current.name, current.input) : turn.lanes.some(l => l.status === 'running') ? 'Agents working…' : 'Writing…')
    : [`Worked for ${fmtTime(elapsedMs || 0)}`, `${tools.length} step${tools.length === 1 ? '' : 's'}`,
       agents ? `${agents} agent${agents === 1 ? '' : 's'}` : '', turn.denied.length ? `${turn.denied.length} needed approval` : '',
       failed ? `${failed} failed` : ''].filter(Boolean).join(' · ');
  return (
    <section className={`activity${isOpen ? ' open' : ''}${running ? ' is-live' : ''}${failed ? ' bad' : ''}`} aria-label="What Sales Mama did">
      <button type="button" className="act-sum" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen}>
        {turn.plan.length > 0 ? <PlanRing done={doneSteps} total={turn.plan.length} /> : <span className={`act-dot${running ? ' is-live' : ''}`} aria-hidden="true" />}
        <span className={running ? 'shimmer' : undefined}>{line}</span>
        <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {running && turn.lanes.length > 0 && <Lanes lanes={turn.lanes} />}
      <div className="act-body"><div>
        {narration.filter(p => p.kind === 'md').map((p, i) => p.kind === 'md' && (
          <div key={i} className="narration"><Markdown text={p.text} onSource={ctx.onSource} /></div>
        ))}
        {turn.plan.length > 0 && <PlanList steps={turn.plan} />}
        {!running && turn.lanes.length > 0 && <Lanes lanes={turn.lanes} />}
        {tools.length > 0 && (
          <div className="chips" aria-label="Tools used">
            {tools.map(c => {
              const text = describeTool(c.name, c.input);
              return <span key={c.id} className={`chip ${c.status}`} title={c.note ?? text}><span className="s" aria-label={c.status} />{text}</span>;
            })}
          </div>
        )}
      </div></div>
    </section>
  );
}

function PlanRing({ done, total }: { done: number; total: number }) {
  const r = 7, c = 2 * Math.PI * r;
  return (
    <svg className="plan-ring" width="20" height="20" viewBox="0 0 20 20" role="img" aria-label={`${done} of ${total} steps`}>
      <circle cx="10" cy="10" r={r} fill="none" stroke="var(--line-2)" strokeWidth="3" />
      <circle cx="10" cy="10" r={r} fill="none" stroke="var(--mama)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(c * done) / Math.max(total, 1)} ${c}`} transform="rotate(-90 10 10)" />
    </svg>
  );
}

function Lanes({ lanes }: { lanes: Lane[] }) {
  const running = lanes.filter(l => l.status === 'running').length;
  return (
    <div className="lanes" aria-label="Agents working">
      <div className="row">
        <span className={`live${running ? '' : ' idle'}`} aria-hidden="true" />
        <strong>{running ? 'Agents working' : 'Agents finished'}</strong>
        <span className="dim">{running ? `${running} running${lanes.length > running ? ` · ${lanes.length - running} done` : ''}` : `${lanes.length} ran`}</span>
      </div>
      {lanes.map(l => (
        <div key={l.id} className={`lane ${laneAgentClass(l.agent)}`}>
          <span className="tag">{l.agent}</span>
          <span className="label">{l.label}{l.last && <span className="last">{l.last}</span>}</span>
          <span className={`track ${l.status === 'running' ? 'indet' : l.status === 'done' ? 'full' : 'fail'}`}><span /></span>
          <span className="state">{l.status === 'running' ? `${l.tools} tool${l.tools === 1 ? '' : 's'}` : l.status}</span>
        </div>
      ))}
    </div>
  );
}

function Sources({ sources, onSource }: { sources: string[]; onSource: (p: string) => void }) {
  const [all, setAll] = useState(false);
  const shown = all ? sources : sources.slice(0, 6);
  return (
    <div className="sources" aria-label="Sources">
      <span className="src-lbl">Sources</span>
      {shown.map((s, i) => (
        <button key={s} type="button" className="src" title={s} onClick={() => onSource(s)}>
          <b>{i + 1}</b>{s.split('/').pop()}
        </button>
      ))}
      {sources.length > 6 && <button type="button" className="src more" onClick={() => setAll(!all)}>{all ? 'Fewer' : `+${sources.length - 6}`}</button>}
    </div>
  );
}

function NeedsApproval({ denied }: { denied: string[] }) {
  const list = [...new Set(denied)];
  const [copied, setCopied] = useState(false);
  return (
    <div className="approval" role="note">
      <span className="ap-ic" aria-hidden="true">!</span>
      <div className="ap-txt">
        <b>{list.length} step{list.length > 1 ? 's were' : ' was'} skipped: they need your approval</b>
        <span>The console keeps this repo's permissions and never widens them. Run the same prompt in Claude Code and approve there, or ask your manager to add allow rules in <code>.claude/settings.json</code>.</span>
        <details><summary>Show the skipped steps</summary><ul>{list.slice(0, 8).map(d => <li key={d}>{d}</li>)}</ul></details>
      </div>
      <button type="button" className="ap-copy" onClick={async () => { try { await navigator.clipboard.writeText(list.join('\n')); setCopied(true); } catch { /* blocked */ } }}>
        {copied ? 'Copied' : 'Copy details'}
      </button>
    </div>
  );
}
