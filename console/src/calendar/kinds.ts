// One colour language for chat, cards and calendar (spec §7.1): schedule kinds reuse the agent hues.
export interface KindMeta { label: string; color: string; tint: string; glyph: string; timed: boolean }
export const KINDS: Record<string, KindMeta> = {
  meeting: { label: 'Meeting', color: 'var(--k-meeting)', tint: 'var(--k-meeting-t)', glyph: '●', timed: true },
  call: { label: 'Call', color: 'var(--k-call)', tint: 'var(--k-call-t)', glyph: '◐', timed: true },
  demo: { label: 'Demo', color: 'var(--k-demo)', tint: 'var(--k-demo-t)', glyph: '◇', timed: true },
  site_visit: { label: 'Site visit', color: 'var(--k-visit)', tint: 'var(--k-visit-t)', glyph: '⌂', timed: true },
  followup: { label: 'Follow-up', color: 'var(--k-followup)', tint: 'var(--k-followup-t)', glyph: '◆', timed: false },
  event: { label: 'Trade event', color: 'var(--k-event)', tint: 'var(--k-event-t)', glyph: '★', timed: false },
  renewal: { label: 'Renewal', color: 'var(--k-renewal)', tint: 'var(--k-renewal-t)', glyph: '↻', timed: false },
  renewal_window: { label: 'Renewal window', color: 'var(--k-renewal)', tint: 'var(--k-renewal-t)', glyph: '↻', timed: false },
  claim_lapse: { label: 'Claim lapse', color: 'var(--risk)', tint: 'var(--risk-t)', glyph: '!', timed: false },
  holiday: { label: 'Holiday', color: 'var(--muted)', tint: 'var(--neutral-t)', glyph: '▨', timed: false },
};
export const kindOf = (k: string): KindMeta => KINDS[k] ?? KINDS.meeting;
export const FILTERS: { key: string; label: string; kinds: string[] }[] = [
  { key: 'appointments', label: 'Appointments', kinds: ['meeting', 'call', 'demo', 'site_visit'] },
  { key: 'followups', label: 'Follow-ups', kinds: ['followup'] },
  { key: 'renewals', label: 'Renewals', kinds: ['renewal', 'renewal_window'] },
  { key: 'events', label: 'Events', kinds: ['event'] },
  { key: 'risks', label: 'Claim lapses', kinds: ['claim_lapse'] },
  { key: 'holidays', label: 'Holidays', kinds: ['holiday'] },
];
/** Status as a class name: tentative = dashed, cancelled = struck through, held = checked, no_show = risk dot. */
export const statusClass = (s: string) => (s ? `st-${s.replace(/_/g, '-')}` : '');
