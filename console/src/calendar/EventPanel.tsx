// Event details (spec §6.3): who, when, where, prep, and actions. Every action is a prompt or a prefill;
// nothing here writes the repo (ADR-0006). Reschedule and cancel go through mama-schedule.
import type { ReactNode } from 'react';
import type { CalItem } from './time';
import { countdown, hhmm, label, place } from './time';
import { kindOf, statusClass } from './kinds';

export interface PanelActions { ask: (p: string) => void; prefill: (p: string) => void; openSource: (p: string) => void; disabled: boolean }

export function EventPanel({ item, tz, now, onClose, act }: { item: CalItem; tz: string; now: Date; onClose: () => void; act: PanelActions }) {
  const k = kindOf(item.kind), p = place(item, tz), acc = item.account;
  const appt = ['meeting', 'call', 'demo', 'site_visit'].includes(item.kind);
  const when = p.allDay
    ? (p.day === p.endDay ? label(p.day, { weekday: 'long', day: 'numeric', month: 'long' }) : `${label(p.day, { day: 'numeric', month: 'short' })} – ${label(p.endDay, { day: 'numeric', month: 'short' })}`)
    : `${label(p.day, { weekday: 'long', day: 'numeric', month: 'long' })} · ${hhmm(new Date(item.start), tz)}–${hhmm(new Date(item.end), tz)}`;
  const until = p.startAt ? p.startAt.getTime() - now.getTime() : null;
  const actions: { label: string; run: () => void; primary?: boolean }[] = [];
  if (appt && item.live) {
    if (acc?.id) actions.push({ label: 'Brief me', run: () => act.ask(`/mama-brief ${acc.id}`), primary: true });
    if (item.status === 'tentative') actions.push({ label: 'Confirm', run: () => act.ask(`/mama-schedule confirm ${item.id}`) });
    actions.push({ label: 'Reschedule…', run: () => act.prefill(`/mama-schedule reschedule ${item.id} to `) });
    actions.push({ label: 'Cancel', run: () => act.prefill(`/mama-schedule cancel ${item.id} because `) });
    if (until != null && until < 0 && acc?.id) actions.push({ label: 'Log the outcome', run: () => act.prefill(`/mama-handover ${acc.id} `), primary: true });
  } else if (item.kind === 'followup' && acc?.id) {
    actions.push({ label: 'Draft the follow-up', run: () => act.ask(`/mama-draft ${acc.id} ${item.nba || 'next'}`), primary: true });
    actions.push({ label: 'Book a meeting', run: () => act.prefill(`/mama-schedule book @${acc.id} `) });
  } else if ((item.kind === 'renewal' || item.kind === 'renewal_window') && acc?.id) {
    actions.push({ label: 'Brief me on the renewal', run: () => act.ask(`/mama-brief ${acc.id}`), primary: true });
    actions.push({ label: 'Book a renewal call', run: () => act.prefill(`/mama-schedule book @${acc.id} `) });
  } else if (item.kind === 'claim_lapse' && acc?.id) {
    actions.push({ label: 'Plan the next touch', run: () => act.ask(`/mama-recommend ${acc.id}`), primary: true });
  } else if (item.kind === 'busy') {
    actions.push({ label: 'Resync my calendar', run: () => act.prefill('/mama-schedule sync my Google Calendar busy times'), primary: true });
  } else if (item.kind === 'event') {
    actions.push({ label: 'Who should I meet?', run: () => act.ask(`/mama-brief ${item.id.replace(/^ev-/, '')}`), primary: true });
  }
  if (acc?.id) actions.push({ label: 'Open account', run: () => act.openSource(`wiki/accounts/${acc.id}.md`) });

  const facts: [string, ReactNode][] = [
    ['When', when],
    ...(until != null && until > 0 ? [['Starts', countdown(until)] as [string, ReactNode]] : []),
    ...(item.location ? [['Where', item.location] as [string, ReactNode]] : []),
    ...(item.contact_name || item.contact ? [['With', item.contact_name || item.contact] as [string, ReactNode]] : []),
    ...(acc?.stage ? [['Stage', acc.stage] as [string, ReactNode]] : []),
    ...(item.reason ? [['Why', item.reason] as [string, ReactNode]] : []),
    ...(item.matched?.length ? [['Your accounts there', item.matched.join(', ')] as [string, ReactNode]] : []),
  ];
  return (
    <aside className="evp" style={{ ['--k' as any]: k.color, ['--kt' as any]: k.tint }} aria-label={`${k.label}: ${item.title}`}>
      <header className="evp-head">
        <span className="evp-kind"><span aria-hidden="true">{k.glyph}</span>{k.label}</span>
        {item.status && <span className={`evp-st ${statusClass(item.status)}`}>{item.status.replace('_', ' ')}</span>}
        <button type="button" className="evp-x" onClick={onClose} aria-label="Close details">×</button>
      </header>
      <h3>{acc?.name ?? item.title}</h3>
      {acc?.name && item.title && <p className="evp-sub">{item.title}</p>}
      <div className="evp-chips">
        {acc?.tier && <span className={`tier t-${acc.tier}`}>{acc.tier}</span>}
        {(acc?.market || item.market) && <b className="mk" style={{ ['--m' as any]: `var(--m-${acc?.market || item.market})` }}>{acc?.market || item.market}</b>}
        {item.rep && <span className="evp-rep">{item.rep}</span>}
      </div>
      <dl className="evp-facts">{facts.map(([k2, v]) => <div key={k2}><dt>{k2}</dt><dd>{v}</dd></div>)}</dl>
      <div className="evp-actions">
        {actions.map(a => (
          <button key={a.label} type="button" className={`btn${a.primary ? ' primary' : ''}`} disabled={act.disabled && a.label !== 'Open account'} onClick={a.run}>{a.label}</button>
        ))}
      </div>
      {item.ref && <button type="button" className="ref" onClick={() => act.openSource(item.ref!)}>{item.ref}</button>}
      <p className="evp-note">{item.kind === 'busy'
        ? 'From your Google Calendar: busy times only. No titles, attendees or details are stored, and Sales Mama never changes your calendar.'
        : 'Changes go through Sales Mama in chat: it checks ownership, clashes and holidays, then asks you to confirm.'}</p>
    </aside>
  );
}
