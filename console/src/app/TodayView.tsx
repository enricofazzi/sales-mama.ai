// Today (home, spec §6.3): answer "what's next?" in one second. Everything here comes from the books
// (wiki/books/*.json via the rail) and markets.yaml; every action is a prompt (ADR-0006).
// The calendar parts (next-up, day ribbon) arrive with the appointments data in Phases 3–4.
import type { ReactNode } from 'react';
import type { Rail } from '../../shared/protocol';
import { sendWindow } from '../../shared/window';
import { Ring, TierMix } from '../components/Cards';
import { clock, dayLabel, hourIn, useNow } from '../hooks/useNow';
import { Composer } from '../chat/Composer';
import type { AccountInfo, SkillInfo } from '../../server/repo';
import { IconAlert, IconArrow, IconBolt, IconFire, IconFlag, IconMail, IconSpark, IconUsers } from './Icons';
import type { Calendar, CalItem } from '../calendar/time';
import { DayRibbon, NextUpCard } from '../calendar/NextUp';

interface Action { key: string; tone: string; icon: ReactNode; title: string; sub: string; prompt: string; cta: string }

function actions(rail: Rail, manager: boolean): Action[] {
  const b = rail.book, t = rail.team, out: Action[] = [];
  if (manager && rail.allocation) {
    out.push({ key: 'alloc', tone: 'allocator', icon: <IconUsers />, title: `Allocation waiting: ${rail.allocation.leads} leads`,
      sub: `Proposed ${rail.allocation.date}. Approve, edit or reject in a sentence.`, prompt: '/mama-allocate', cta: 'Review' });
  }
  if (manager && t && t.review > 0) {
    out.push({ key: 'review', tone: 'scout', icon: <IconFlag />, title: `${t.review} entity match${t.review > 1 ? 'es' : ''} to confirm`,
      sub: 'Signals that might belong to an account.', prompt: '/mama-manager', cta: 'Decide' });
  }
  if (b?.due.length) {
    const d = b.due[0];
    out.push({ key: 'due', tone: 'writer', icon: <IconMail />, title: `${b.due.length} follow-up${b.due.length > 1 ? 's' : ''} due`,
      sub: `First: ${d.name}${d.overdue ? ' (overdue)' : ''} · ${d.action || d.nba || 'next step'}`, prompt: '/mama-day', cta: 'Run my day' });
  }
  if (b?.vam.length) {
    out.push({ key: 'vam', tone: 'vam', icon: <IconSpark />, title: `${b.vam.length} VAM pre-draft${b.vam.length > 1 ? 's' : ''} waiting`,
      sub: 'Your virtual account manager prepared follow-ups overnight.', prompt: '/mama-day', cta: 'Review' });
  }
  if (b?.atRisk.length) {
    out.push({ key: 'risk', tone: 'risk', icon: <IconAlert />, title: `${b.atRisk.length} account${b.atRisk.length > 1 ? 's' : ''} at risk`,
      sub: b.atRisk.slice(0, 2).map(a => `${a.name}: ${a.detail}`).join(' · '), prompt: '/mama-book', cta: 'See why' });
  }
  if (b?.hot.length) {
    const h = b.hot[0];
    out.push({ key: 'hot', tone: 'mama', icon: <IconFire />, title: `Brief me on ${h.name}`,
      sub: `Hot · tier ${h.tier}${h.detail ? ` · ${h.detail}` : ''}`, prompt: `/mama-brief ${h.id}`, cta: 'Brief me' });
  }
  out.push(manager
    ? { key: 'cockpit', tone: 'mama', icon: <IconBolt />, title: 'Morning cockpit', sub: "Last night's run, hot accounts, risks and decisions.", prompt: '/mama-manager', cta: 'Open' }
    : { key: 'day', tone: 'mama', icon: <IconBolt />, title: 'Run my day', sub: 'Replies, follow-ups, research and drafts in one go.', prompt: '/mama-day', cta: 'Start' });
  return out.slice(0, 6);
}

export function TodayView({ rail, canAsk, live, ask, stop, openSource, skills, accounts, cal, openEvent }: {
  rail: Rail | null; canAsk: boolean; live: boolean; ask: (t: string) => void; stop: () => void; openSource: (p: string) => void;
  skills: SkillInfo[]; accounts: AccountInfo[]; cal: Calendar | null; openEvent: (i: CalItem) => void;
}) {
  const now = useNow(30_000);
  const me = rail?.me;
  const manager = me?.role === 'manager';
  const first = Object.entries(rail?.markets ?? {})[0];
  const tz = first?.[1].tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const h = hourIn(now, tz);
  const greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const b = rail?.book, t = rail?.team;
  const windows = Object.entries(rail?.markets ?? {}).map(([code, cfg]) => sendWindow(code, cfg, now));
  const openW = windows.find(w => w.open);
  const summary = [
    b ? `${b.active} account${b.active === 1 ? '' : 's'} in your book` : null,
    b?.hot.length ? `${b.hot.length} hot` : null,
    b?.due.length ? `${b.due.length} due` : 'nothing due',
    openW ? `${openW.market} send window ${openW.label.replace(/^Send window /, '')}` : null,
  ].filter(Boolean).join(' · ');

  if (!rail) return <section className="today"><div className="today-skel" /></section>;

  return (
    <section className="today" aria-label="Today">
      <div className="today-col">
        <header className="today-hero">
          <p className="kicker">{dayLabel(now, tz)} · {first ? `${first[0]} ` : ''}{clock(now, tz)}</p>
          <h1>{greet}{me ? `, ${me.name.split(' ')[0]}` : ''}.</h1>
          <p className="today-sum">{rail.problem ?? summary}</p>
        </header>

        {cal && (
          <div className="bento bento-time">
            <NextUpCard cal={cal} now={now} onOpen={openEvent} onBrief={i => ask(i.account?.id ? `/mama-brief ${i.account.id}` : '/mama-day')} />
            <DayRibbon cal={cal} now={now} onOpen={openEvent} />
          </div>
        )}
        <div className="bento">
          {b && (
            <article className="tile-x t-ring">
              <Ring done={b.meetings.done} target={b.meetings.target} size={112} />
              <div><span className="k">Meetings this month</span><span className="sub">{b.replies7d.replies} replies from {b.replies7d.sent} sent in 7 days</span></div>
            </article>
          )}
          {b && (
            <article className="tile-x t-book">
              <span className="k">Book</span>
              <span className="n">{b.active}<small>/{b.capacity ?? '–'}</small></span>
              <TierMix {...b.tiers} free={b.capacity != null ? Math.max(b.capacity - b.active, 0) : undefined} />
            </article>
          )}
          {b && (
            <article className="tile-x t-hot">
              <span className="k">Hot ({b.hot.length})</span>
              {b.hot.length ? b.hot.slice(0, 4).map(x => (
                <button key={x.id} type="button" className="hot-row" onClick={() => openSource(`wiki/accounts/${x.id}.md`)}>
                  <span>{x.name}</span><b>{x.tier}{/score ([\d.]+)/.exec(x.detail)?.[1] ? ` · ${/score ([\d.]+)/.exec(x.detail)![1]}` : ''}</b>
                </button>
              )) : <span className="dim">Nothing hot right now.</span>}
            </article>
          )}
          {windows.map(w => (
            <article key={w.market} className={`tile-x t-window${w.open ? ' open' : ''}`}>
              <span className="k"><b className="mk" style={{ ['--m' as any]: `var(--m-${w.market})` }}>{w.market}</b>{w.open ? 'Send window open' : 'Send window closed'}</span>
              <span className="win-l">{w.label.replace(/^Send window open · /, '')}</span>
              <span className="sub">{w.detail}</span>
            </article>
          ))}
          {manager && t && (
            <article className="tile-x t-team">
              <span className="k">Team · {t.reps} rep{t.reps === 1 ? '' : 's'}</span>
              <span className="n">{t.pool.total}<small> in the pool</small></span>
              <TierMix A={t.pool.A} B={t.pool.B} C={t.pool.C} />
            </article>
          )}
        </div>

        <h2 className="sec">Needs you</h2>
        <ol className="actions">
          {actions(rail, manager).map((a, i) => (
            <li key={a.key} className={`act tone-${a.tone}`} style={{ animationDelay: `${80 + i * 45}ms` }}>
              <span className="act-ic">{a.icon}</span>
              <span className="act-txt"><b>{a.title}</b><span>{a.sub}</span></span>
              <button type="button" className="act-go" disabled={!canAsk} onClick={() => ask(a.prompt)} title={a.prompt}>{a.cta}<IconArrow size={16} /></button>
            </li>
          ))}
        </ol>

        <h2 className="sec">Ask anything</h2>
        <Composer inputId="composer-today" manager={manager} skills={skills} accounts={accounts} live={false} canAsk={canAsk} ask={ask} stop={stop} compact />
      </div>
    </section>
  );
}
