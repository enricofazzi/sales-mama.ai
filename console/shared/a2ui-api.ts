// The Sales Mama A2UI catalog: component APIs (Zod) shared by the renderer, the validator and the
// generated catalog document (console/a2ui/catalog.json). ADR-0009, docs/UI.md §2.
//
// Data props (value, data, rows, items, parts, checks, companies) take a binding such as
// {"path": "/calibration/tiers"} into the surface's dataRef file, so every number on screen comes
// from a script. Labels and layout are the agent's choice.
import { z } from 'zod';
import { CommonSchemas } from '@a2ui/web_core/v0_9';

export const CATALOG_ID = 'https://sales-mama.local/a2ui/catalog/v1.json';
export const PROTOCOL = 'v0.9';

const DS = CommonSchemas.DynamicString;
const DV = CommonSchemas.DynamicValue;
const DN = CommonSchemas.DynamicNumber;
const opt = <T extends z.ZodTypeAny>(t: T) => t.optional();
const keyList = z.union([z.string(), z.array(z.string())]);
const statusEnum = z.enum(['good', 'warn', 'risk', 'neutral']);
const agentEnum = z.enum(['mama', 'scout', 'researcher', 'vam', 'writer', 'allocator']);

export const columnSchema = z.object({
  key: z.string(),
  label: z.string(),
  numeric: z.boolean().optional(),
  format: z.enum(['text', 'number', 'percent', 'ratio', 'money', 'date', 'account', 'source', 'status', 'tier']).optional(),
});

export const actionSchema = z.object({
  label: z.string(),
  prompt: z.string(),
  primary: z.boolean().optional(),
});

// Operational cards (plan, draft, reply, …): same fields and the same look as the pre-A2UI mama-cards
// (docs/UI.md §2). Every field takes a literal or a {"path": …} binding.
const cardActionSchema = z.object({ label: z.string(), prompt: z.string(), style: z.enum(['primary', 'secondary']).optional() });
const cardBase = { title: DS, subtitle: opt(DS), agent: opt(agentEnum), refs: opt(z.array(z.string())), actions: opt(z.array(cardActionSchema)) };
// DynamicValue takes literals, arrays and bindings but not plain objects (score_parts, recommendation, next).
const field = z.union([DV, z.record(z.any())]);
function card(fields: string[], required: string[]) {
  return z.object({ ...cardBase, ...Object.fromEntries(fields.map(f => [f, required.includes(f) ? field : field.optional()])) });
}
/** A2UI reserves `checks` (validation rules) and `id` (the component id), so the draft card's checks travel as
 *  `passed` and the account card's id as `account_id`. */
export const CARD_FIELD_RENAMES: Record<string, string> = { checks: 'passed', id: 'account_id' };

/** A2UI component → the card type it draws, its fields, the required ones, and its doc line. */
export const CARDS = {
  PlanCard: { type: 'plan', fields: ['steps'], required: ['steps'], doc: 'Steps of a multi-step skill. steps = [{label, status: pending|running|done|failed, agent?, note?}].' },
  AgentsCard: { type: 'agents', fields: ['lanes'], required: ['lanes'], doc: 'Subagent lanes. lanes = [{agent, label, done, total, status}].' },
  DaySummaryCard: { type: 'day_summary', fields: ['drafts', 'send_window', 'hot', 'at_risk', 'needs_you'], required: ['drafts'], doc: 'The rep\'s morning: drafts ready, send window, hot accounts, at-risk count, what needs the rep.' },
  DraftCard: { type: 'draft', fields: ['account', 'to', 'channel', 'subject', 'body', 'signal', 'pattern', 'passed', 'send_window'], required: ['account', 'channel', 'body', 'passed'], doc: 'One saved draft; passed = the draft_check.py checks it passed (the card shows them as checks). Never a send action: sending is /mama-send in chat (ADR-0007).' },
  ReplyCard: { type: 'reply', fields: ['account', 'from', 'class', 'summary', 'response_ref'], required: ['account', 'class'], doc: 'One triaged inbound reply and its class.' },
  AccountCard: { type: 'account', fields: ['account_id', 'name', 'market', 'tier', 'score', 'score_parts', 'stage', 'owner', 'signals', 'recommendation', 'next'], required: ['account_id', 'name', 'market'], doc: 'An account: tier, score and parts, stage, cited signals, recommendation chain, next action.' },
  BriefCard: { type: 'brief', fields: ['subject', 'sections'], required: ['subject', 'sections'], doc: 'A call or event brief. sections = [{heading, bullets[]}].' },
  ReviewQueueCard: { type: 'review_queue', fields: ['items'], required: ['items'], doc: 'Entity matches for the manager. items = [{n, text, source, candidate, confidence}].' },
  RunStatusCard: { type: 'run_status', fields: ['ok', 'started', 'finished', 'markets', 'items', 'linked', 'review', 'new_leads', 'errors'], required: ['ok'], doc: 'A scan or nightly run: ok, times, markets, counts, errors.' },
  ErrorCard: { type: 'error', fields: ['message', 'fix'], required: ['message'], doc: 'Something blocked the skill: message and the fix.' },
} as const;
export type CardName = keyof typeof CARDS;
export const CARD_NAMES = Object.keys(CARDS) as CardName[];
export const CARD_FOR_TYPE: Record<string, CardName> = Object.fromEntries(CARD_NAMES.map(n => [CARDS[n].type, n]));
const cardApi = Object.fromEntries(CARD_NAMES.map(n => [n, { doc: CARDS[n].doc as string, schema: card([...CARDS[n].fields], [...CARDS[n].required]) as z.ZodTypeAny }])) as unknown as
  Record<CardName, { doc: string; schema: z.ZodTypeAny }>;

/** Every Sales Mama component: name → { schema, doc }. `doc` feeds the catalog instructions. */
export const API = {
  Panel: {
    doc: 'A titled card. Children stack inside. span "full" takes the whole row in a Grid.',
    schema: z.object({
      title: DS, subtitle: opt(DS), agent: opt(agentEnum), span: opt(z.enum(['full', 'half'])),
      children: CommonSchemas.ChildList, refs: opt(z.array(z.string())),
    }),
  },
  Grid: {
    doc: 'Responsive grid of children (Panels, tiles). min = smallest column width in px (default 320).',
    schema: z.object({ children: CommonSchemas.ChildList, min: opt(z.number()) }),
  },
  Callout: {
    doc: 'One or two sentences of judgement (markdown). tone colours the bar. Never put numbers here that are not in the data.',
    schema: z.object({ text: DS, tone: opt(statusEnum), title: opt(DS) }),
  },
  KpiTile: {
    doc: 'A single number with label, unit, optional delta and sparkline. Bind value/delta/spark to data.',
    schema: z.object({
      label: DS, value: DV, unit: opt(DS), of: opt(DV), delta: opt(DV), deltaLabel: opt(DS),
      spark: opt(DV), status: opt(DV), note: opt(DS), format: opt(z.enum(['number', 'percent', 'money'])),
    }),
  },
  StatGrid: {
    doc: 'Tiles from a data array of {label, value, unit?, note?, status?}, e.g. a metrics section items.',
    schema: z.object({ items: DV, max: opt(z.number()) }),
  },
  BarChart: {
    doc: 'Bars from an array of objects (or a {key: number} map). x = category key (default "label"), y = one or more value keys (default "value"). orientation horizontal for long labels; stacked for parts of a whole.',
    schema: z.object({
      data: DV, x: opt(z.string()), y: opt(keyList), orientation: opt(z.enum(['vertical', 'horizontal'])),
      stacked: opt(z.boolean()), unit: opt(DS), format: opt(z.enum(['number', 'percent', 'money'])),
      highlight: opt(DS), height: opt(z.number()),
    }),
  },
  LineChart: {
    doc: 'Trend over an ordered x (weeks, dates). y = one or more keys. area fills under the line.',
    schema: z.object({
      data: DV, x: opt(z.string()), y: opt(keyList), area: opt(z.boolean()), unit: opt(DS),
      format: opt(z.enum(['number', 'percent', 'money'])), target: opt(DV), height: opt(z.number()),
    }),
  },
  DonutChart: {
    doc: 'Share of a whole, 2–7 slices. data = array of {label, value} or a {key: number} map.',
    schema: z.object({ data: DV, nameKey: opt(z.string()), valueKey: opt(z.string()), unit: opt(DS), center: opt(DS) }),
  },
  Funnel: {
    doc: 'Stage conversion (new → researched → contacted → replied → meeting). data = {stage: count} map, {stage: {now, week_ago}} map or [{label, value}]. compareKey reads an earlier value from each row (e.g. "week_ago"); compare = a separate earlier snapshot.',
    schema: z.object({ data: DV, compare: opt(DV), compareKey: opt(z.string()), order: opt(z.array(z.string())), compareLabel: opt(DS) }),
  },
  Heatmap: {
    doc: 'Matrix of numbers: rows = data array, row label from rowKey, one column per key in columns. Good for rep × tier or rep × industry.',
    schema: z.object({
      data: DV, rowKey: z.string(), columns: z.array(z.string()), columnLabels: opt(z.array(z.string())),
      format: opt(z.enum(['number', 'percent'])),
    }),
  },
  Gauge: {
    doc: 'Progress to a limit or target (capacity, quota, meetings vs target).',
    schema: z.object({ label: DS, value: DV, max: DV, unit: opt(DS), invert: opt(z.boolean()) }),
  },
  ScoreBreakdown: {
    doc: 'Lead score as weighted parts. parts = {fit, intent, propensity, engagement} (0–1), weights = same keys.',
    schema: z.object({ parts: DV, weights: opt(DV), total: opt(DV), tier: opt(DS) }),
  },
  DataTable: {
    doc: 'Sortable, filterable table (max 25 rows visible, the rest behind "show all"). format "account" opens the wiki page, "source" opens a file, "status"/"tier" draw badges.',
    schema: z.object({
      rows: DV, columns: z.array(columnSchema), filter: opt(z.boolean()), maxRows: opt(z.number()),
      sortBy: opt(z.string()), empty: opt(DS),
    }),
  },
  Verdict: {
    doc: 'Company-check verdict badge with score.',
    schema: z.object({ verdict: DS, score: opt(DV), subtitle: opt(DS) }),
  },
  CheckList: {
    doc: 'Rule results. checks = [{id, check, result: pass|warn|fail|unknown|n/a|info, detail}] or groups = [{name, checks}].',
    schema: z.object({ checks: opt(DV), groups: opt(DV) }),
  },
  CompareTable: {
    doc: 'Side-by-side companies: companies = [{name, verdict, score}], rows = [{check, values: [{result, text}]}].',
    schema: z.object({ companies: DV, rows: DV }),
  },
  FactList: {
    doc: 'Key–value facts. data = {label: value} map.',
    schema: z.object({ data: DV }),
  },
  SourceChips: {
    doc: 'Buttons that open repo files read-only (wiki/, log/, raw/, knowledge/, company-check/reports/).',
    schema: z.object({ refs: z.union([z.array(z.string()), CommonSchemas.DataBinding]) }),
  },
  ActionBar: {
    doc: 'Up to 4 buttons; each sends its prompt as the next turn. Never a send action (ADR-0007).',
    schema: z.object({ actions: z.array(actionSchema) }),
  },
  ...cardApi,
  LegacyCard: {
    doc: 'Internal: renders a retired report card (book, allocation, stats, chart, …) from an old saved result. Do not emit.',
    schema: z.object({ card: z.any(), issues: opt(z.array(z.string())) }),
  },
};

export type ComponentName = keyof typeof API;
export const COMPONENTS = Object.keys(API) as ComponentName[];

/** Props that hold numbers or data and must be bound to the dataRef file when there is one. */
export const DATA_PROPS: Partial<Record<ComponentName, string[]>> = {
  KpiTile: ['value', 'delta', 'spark', 'of'],
  StatGrid: ['items'],
  BarChart: ['data'], LineChart: ['data'], DonutChart: ['data'], Funnel: ['data', 'compare'],
  Heatmap: ['data'], Gauge: ['value', 'max'], ScoreBreakdown: ['parts', 'total'],
  DataTable: ['rows'], CheckList: ['checks', 'groups'], CompareTable: ['companies', 'rows'],
  FactList: ['data'], Verdict: ['score'],
};

export const INSTRUCTIONS = `Sales Mama catalog (A2UI ${PROTOCOL}). Build report surfaces for a B2B sales team.
Rules: (1) Numbers come from scripts: bind every data prop to the block's dataRef file with {"path": "/…"}; never type a number into a chart, tile or table. (2) Lead with one Callout of judgement, then KPIs, then charts, then tables. (3) Pick the chart for the question: trend → LineChart, ranking → BarChart horizontal, share → DonutChart (≤7 slices), conversion → Funnel, matrix → Heatmap, progress → Gauge. (4) Use basic ChoicePicker/Tabs for filters; they change the local data model only. (5) ActionBar and card actions prompt a skill or a plain request; never "send" (ADR-0007). (6) Operational results (plan, agents, draft, reply, account, brief, review queue, run status, error) use the *Card components: one per surface root, or several in a Column.`;
