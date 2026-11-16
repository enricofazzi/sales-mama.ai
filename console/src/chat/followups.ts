// Follow-up chips for the composer (spec §5.1): the last answer's own buttons first (A2UI ActionBar
// and card actions, old mama-card actions), then a default next step per skill. Never a send action.
import { splitParts } from '../../shared/a2ui';
import type { ChatTurn } from '../useBridge';
import type { FollowUp } from './Composer';

const SEND = /\bsend\b/i;
const DEFAULTS: Record<string, FollowUp[]> = {
  'mama-day': [{ label: 'Show my book', prompt: '/mama-book' }],
  'mama-book': [{ label: 'Run my day', prompt: '/mama-day' }],
  'mama-manager': [{ label: 'Review the allocation', prompt: '/mama-allocate' }, { label: 'Weekly review', prompt: '/mama-weekly' }],
  'mama-weekly': [{ label: 'Morning cockpit', prompt: '/mama-manager' }],
  'company-insights': [{ label: 'Check the top lead', prompt: '/company-check leads --limit 1' }],
  'mama-research': [{ label: 'What should I pitch?', prompt: 'What should I pitch them?' }],
  'mama-recommend': [{ label: 'Draft the first email', prompt: 'Draft the first email for this account' }],
};

export function followUpsFor(t: ChatTurn | undefined): FollowUp[] {
  if (!t || t.running) return [];
  const out: FollowUp[] = [];
  const add = (a: unknown) => {
    const x = a as { label?: unknown; prompt?: unknown };
    if (typeof x?.label !== 'string' || typeof x?.prompt !== 'string') return;
    if (SEND.test(x.label) || SEND.test(x.prompt) || out.some(o => o.prompt === x.prompt)) return;
    out.push({ label: x.label, prompt: x.prompt });
  };
  for (const p of splitParts(t.text)) {
    if (p.kind !== 'surface') continue;
    for (const c of p.block.components) {
      (Array.isArray(c.actions) ? c.actions : []).forEach(add);
      const card = c.card as { actions?: unknown[] } | undefined;
      (Array.isArray(card?.actions) ? card!.actions : []).forEach(add);
    }
  }
  const skill = t.prompt.startsWith('/') ? t.prompt.split(/\s+/)[0].slice(1) : '';
  if (out.length < 2) (DEFAULTS[skill] ?? []).forEach(add);
  return out.slice(0, 4);
}
