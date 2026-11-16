// Chat: the thread scrolls on its own; the composer is docked under it, never over it (spec §4).
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import type { ChatTurn } from '../useBridge';
import { useStickToBottom } from '../useStickToBottom';
import { TurnView } from '../components/Turn';
import type { CardCtx } from '../components/Cards';
import { IconArrow, IconDown } from './Icons';

const REP_SKILLS = ['/mama-day', '/mama-book', '/company-check', '/company-insights', '/mama-draft', '/mama-send', '/mama-replies'];
const MANAGER_SKILLS = ['/mama-manager', '/mama-allocate', '/company-check', '/company-insights', '/mama-weekly', '/mama-day'];

export function ChatView({ turns, ctx, manager, firstName, busy, canAsk, live, ask, stop, seed, onSeedUsed }: {
  turns: ChatTurn[]; ctx: CardCtx; manager: boolean; firstName: string; busy: boolean; canAsk: boolean; live: boolean;
  ask: (t: string) => void; stop: () => void; seed: string | null; onSeedUsed: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { showJump, jump } = useStickToBottom(scrollRef, contentRef, turns.length);
  return (
    <section className="chat-view" aria-label="Chat">
      <div className="thread" ref={scrollRef}>
        <div className="thread-col" ref={contentRef}>
          {turns.length === 0 && <ChatEmpty manager={manager} firstName={firstName} canAsk={canAsk} ask={ask} />}
          {turns.map(t => <div className="turn" key={t.id}><TurnView t={t} ctx={ctx} /></div>)}
        </div>
      </div>
      <div className="dock-wrap">
        {showJump && (
          <button type="button" className="jump" onClick={jump} aria-label="Jump to the latest message">
            <IconDown size={14} />{busy ? 'New activity' : 'Jump to latest'}
          </button>
        )}
        <Composer manager={manager} busy={busy} canAsk={canAsk} live={live} ask={ask} stop={stop} seed={seed} onSeedUsed={onSeedUsed} />
      </div>
    </section>
  );
}

function ChatEmpty({ manager, firstName, canAsk, ask }: { manager: boolean; firstName: string; canAsk: boolean; ask: (t: string) => void }) {
  const quick = manager
    ? ['/mama-manager', '/company-insights segment --industry clinics', '/mama-weekly', 'What changed overnight?']
    : ['/mama-day', '/mama-book', '/company-check', 'What changed overnight?'];
  return (
    <div className="chat-empty">
      <span className="logo big" aria-hidden="true">SM</span>
      <h1>What shall we work on{firstName ? `, ${firstName}` : ''}?</h1>
      <p>{manager ? 'Run the cockpit, review the team, or ask about any account.' : 'Run your day, check a company, or ask about your book.'}</p>
      <div className="quick">
        {quick.map((q, i) => <button key={q} type="button" style={{ animationDelay: `${60 + i * 50}ms` }} disabled={!canAsk} onClick={() => ask(q)}>{q}</button>)}
      </div>
    </div>
  );
}

export function Composer({ manager, busy, canAsk, live, ask, stop, seed, onSeedUsed, compact }: {
  manager: boolean; busy: boolean; canAsk: boolean; live: boolean; ask: (t: string) => void; stop: () => void;
  seed?: string | null; onSeedUsed?: () => void; compact?: boolean;
}) {
  const [draft, setDraft] = useState(() => { try { return sessionStorage.getItem('mama.draft') ?? ''; } catch { return ''; } });
  const ref = useRef<HTMLTextAreaElement>(null);
  const skills = manager ? MANAGER_SKILLS : REP_SKILLS;

  // Keep the draft across reloads and route changes (a viewer convenience; never the repo).
  useEffect(() => { try { sessionStorage.setItem('mama.draft', draft); } catch { /* private mode */ } }, [draft]);
  // Grow with the text, 1 to 8 lines.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 8 * 24 + 20)}px`;
  }, [draft]);
  // A prompt handed over from Today or a smart action.
  useEffect(() => {
    if (!seed) return;
    setDraft(seed);
    onSeedUsed?.();
    requestAnimationFrame(() => { ref.current?.focus(); ref.current?.setSelectionRange(seed.length, seed.length); });
  }, [seed, onSeedUsed]);

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!draft.trim() || !canAsk) return;
    ask(draft);
    setDraft('');
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
    if (e.key === 'Escape' && live) stop();
  };
  const pick = (s: string) => { setDraft(s + ' '); ref.current?.focus(); };

  return (
    <div className={`dock${compact ? ' compact' : ''}`}>
      <form className={`composer${live ? ' busy' : ''}`} onSubmit={submit}>
        {!compact && (
          <div className="slash" aria-label="Skills">
            {skills.map(s => <button key={s} type="button" onClick={() => pick(s)}>{s}</button>)}
          </div>
        )}
        <div className="compose-row">
          <label htmlFor={compact ? 'composer-today' : 'composer'} className="sr">Ask Sales Mama</label>
          <textarea id={compact ? 'composer-today' : 'composer'} ref={ref} rows={1} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={onKey}
            placeholder={manager ? 'Approve, edit in a sentence, or ask about the team' : 'Ask anything, or type / for a skill'} />
          {live
            ? <button type="button" className="go stop" aria-label="Stop the run (Esc)" onClick={stop}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><rect x="3" y="3" width="10" height="10" rx="2" fill="currentColor" /></svg>
              </button>
            : <button type="submit" className="go" aria-label="Ask Sales Mama" disabled={!canAsk || !draft.trim()}><IconArrow size={20} /></button>}
        </div>
      </form>
      {!compact && <p className="dock-hint"><kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> new line{live ? <> · <kbd>Esc</kbd> stop</> : null}</p>}
    </div>
  );
}
