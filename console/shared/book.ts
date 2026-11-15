// The bento rail's view of the books. scripts/build_books.py writes wiki/books/<rep>.json and
// team.json as data (ADR-0009); this maps them to what the rail draws. No markdown parsing.

export interface AccountLine { id: string; name: string; tier: string; detail: string }
export interface DueLine { id: string; name: string; tier: string; due: string; overdue: boolean; action: string; nba: string; why: string }

export interface Book {
  name: string;
  rep: string;
  role: string;
  markets: string[];
  active: number;
  capacity: number | null;
  tiers: { A: number; B: number; C: number };
  meetings: { done: number; target: number | null };
  replies7d: { replies: number; sent: number };
  quota: number | null;
  generated: string;
  due: DueLine[];
  hot: AccountLine[];
  atRisk: AccountLine[];
  vam: AccountLine[];
  pipeline: { stage: string; n: number }[];
}

export interface TeamBook {
  generated: string;
  reps: number;
  pool: { total: number; A: number; B: number; C: number };
  review: number;
}

type J = Record<string, any>;
const n = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const s = (v: unknown) => (v == null ? '' : String(v));
const line = (a: J, detail: string): AccountLine => ({ id: s(a.account), name: s(a.name) || s(a.account), tier: s(a.tier) || '-', detail });

export function bookFromJson(j: J): Book {
  const tiers = j.tiers ?? {};
  return {
    name: s(j.name) || s(j.rep), rep: s(j.rep), role: s(j.role) || 'rep', markets: (j.markets ?? []).map(String),
    active: n(j.active) ?? 0, capacity: n(j.capacity),
    tiers: { A: n(tiers.A) ?? 0, B: n(tiers.B) ?? 0, C: n(tiers.C) ?? 0 },
    meetings: { done: n(j.meetings) ?? 0, target: n(j.target) },
    replies7d: { replies: n(j.replies_7) ?? 0, sent: n(j.sent_7) ?? 0 },
    quota: n(j.quota), generated: s(j.generated),
    due: (j.due ?? []).map((d: J) => ({
      id: s(d.account), name: s(d.name) || s(d.account), tier: s(d.tier) || '-', due: s(d.due), overdue: !!d.overdue,
      action: s(d.next_action), nba: s(d.nba), why: s(d.nba_reason),
    })),
    hot: (j.hot ?? []).map((a: J) => line(a, a.score != null ? `score ${a.score}` : '')),
    atRisk: (j.at_risk ?? []).map((a: J) => line(a, (a.flags ?? []).join(', '))),
    vam: (j.vam_predrafts ?? []).map((a: J) => line(a, a.nba ? `nba ${a.nba}` : '')),
    pipeline: Object.entries(j.stages ?? {}).map(([stage, v]) => ({ stage, n: n(v) ?? 0 })),
  };
}

export function teamFromJson(j: J): TeamBook {
  const t = j.pool?.tiers ?? {};
  return {
    generated: s(j.generated), reps: (j.reps ?? []).length,
    pool: { total: n(j.pool?.count) ?? 0, A: n(t.A) ?? 0, B: n(t.B) ?? 0, C: n(t.C) ?? 0 },
    review: n(j.review_open) ?? 0,
  };
}
