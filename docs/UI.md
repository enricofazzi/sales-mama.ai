# Sales Mama UI — agentic, chat-driven

Sales Mama has two front doors. Both talk to the **same** repo, skills and rules.

| | Native (default) | Sales Mama Console (optional, Phase 9) |
|---|---|---|
| What it is | Claude Code or Codex, in the desktop app, CLI or IDE | A local web app that drives Claude Code (or Codex) headless and renders its work as live cards |
| Who it suits | Anyone, from day one | Reps and managers who want a colourful, one-glance cockpit |
| How it looks | Chat + markdown pages (books, account pages) | Chat + live agent lanes + interactive cards + a bento side rail |
| Extra setup | None | Node 20+, then `npm run console` from the repo |
| Rules and safety | AGENTS.md, hooks, permissions | Exactly the same: the console only *sends prompts* and *renders output* |

The console never adds capabilities. It cannot send email or WhatsApp, change permissions or bypass the guard: sending needs the permission prompt of `send.py --send`, which the console skips, so sending happens only in chat in Claude Code (ADR-0007). Anything it can do, a rep can also do by typing in Claude Code.

---

## 1. Interaction model

Everything starts in chat. A rep types a slash command or plain English. The agent plans, fans out subagents, and answers with **cards**. Buttons on a card are just pre-written prompts.

```
You ▸ /mama-day
Mama ▸ plan card            (5 steps, ticking live)
     ▸ agent lanes          (researcher ×5 · vam ×1, progress bars)
     ▸ day_summary card     (drafts · hot · at-risk · needs-you)
     ▸ draft cards ×8       ([Open in mailbox] [Shorter] [Different opener])
     ▸ quick replies        ("Show my book" · "Brief me on Harbourlight")
```

Design principles:
1. **Chat is the cockpit.** No menus to learn: every screen is a conversation, and every card has a "why".
2. **Show the agents working.** Live lanes show which subagent is doing what, so a 3-minute run never feels stuck.
3. **Cards over walls of text.** Numbers, chains and drafts render as compact, colourful cards. Prose stays short.
4. **Every card is grounded.** Each card carries `refs` (wiki or raw paths), and the UI shows them as source chips.
5. **Humans hold the pen.** Buttons prepare drafts and proposals; sending and approving stay explicit human acts.

---

## 2. Generative UI: A2UI surfaces (ADR-0009)

When the system prompt contains `MAMA_CARDS=on`, report skills end with one `a2ui` block per view, after a one-line summary. Scripts never draw. They write JSON. The agent composes the view from the Sales Mama catalog (`console/a2ui/catalog.json`, generated from `console/shared/a2ui-api.ts` with `npm --prefix console run catalog`). The console renders it with Google's A2UI React renderer, protocol v0.9.

````
```a2ui
{"surfaceId": "weekly_review", "title": "Weekly review · 2026-W46", "agent": "mama",
 "dataRef": "log/weekly/2026-W46.json",
 "components": [
   {"id": "root", "component": "Column", "children": ["lead", "sent", "funnel"]},
   {"id": "lead", "component": "Callout", "tone": "warn", "text": "Too early to judge tiers."},
   {"id": "sent", "component": "KpiTile", "label": "Sent", "value": {"path": "/metrics/week/total/sent"}},
   {"id": "funnel", "component": "Funnel", "data": {"path": "/funnel/stages"}, "compareKey": "week_ago"}]}
```
````

Block fields:

| Field | Notes |
|---|---|
| `surfaceId` | letters, digits, `_` |
| `title`, `subtitle`, `agent` | frame header. `agent` sets the colour (`mama` · `scout` · `researcher` · `vam` · `writer` · `allocator`) |
| `dataRef` | a script's JSON under `log/`, `wiki/books/`, `company-check/reports/` or `company-check/leads/`. Loaded read-only into the data model at `/` |
| `data` | optional local UI state (filters), at `/ui` |
| `refs` | repo paths shown as source chips |
| `components` | flat A2UI list with ids, one `root`. Children by id |
| `messages` | instead of `components`: raw v0.9 messages |

Data sources:

| Script | Data file |
|---|---|
| `weekly.py --save` | `log/weekly/<week>.json` |
| `allocate.py` | `log/allocation/<date>.json` |
| `build_books.py` | `wiki/books/<rep>.json`, `team.json` |
| `company_analytics.py --out` | `company-check/reports/insights-*.json` |
| `company_check.py --save` | `company-check/reports/<date>-<uen>.json` |

Sales Mama components:
- **Layout and text:** `Panel`, `Grid`, `Callout`.
- **Numbers:** `KpiTile`, `StatGrid`, `Gauge`.
- **Charts:** `BarChart`, `LineChart`, `DonutChart`, `Funnel`, `Heatmap`, `ScoreBreakdown`.
- **Tables and checks:** `DataTable`, `Verdict`, `CheckList`, `CompareTable`, `FactList`.
- **Links and actions:** `SourceChips`, `ActionBar`.

The basic catalog adds `Row`, `Column`, `Text`, `Tabs`, `ChoicePicker` and the rest. Worked examples are in `console/test/fixtures/a2ui/`.

Rules for skills:
- A surface comes **after** a one-line plain summary, never instead of it.
- **Bind, never type.** When a block has a `dataRef`, every data prop (`value`, `data`, `rows`, `items`, …) is `{"path": …}`. The console and `eval.py` flag typed-in numbers.
- The agent's own words go in a `Callout`: judgement only, using numbers already in the data.
- `ActionBar` prompts send the next turn. Never a send action (ADR-0007). At most 4 per surface.
- Without `MAMA_CARDS=on`, never print `a2ui` JSON. Write markdown tables from the same JSON instead.
- "Share as page" downloads a self-contained HTML snapshot. It makes no network calls and writes nothing to the repo.

### Operational cards

Skills that act rather than report end with card components: one surface per card, or several in a `Column`. They keep the console's card design exactly: the same header tag, colours, body and action buttons. A surface that holds only cards (no `title`, `dataRef` or `refs`) renders without the report frame.

````
```a2ui
{"surfaceId": "draft", "components": [{"id": "root", "component": "DraftCard", "title": "First email · Harbourlight Foods",
  "agent": "writer", "account": "harbourlight-foods", "channel": "email", "body": "…", "passed": ["suppression", "entities"]}]}
```
````

Common props: `title`, `subtitle?`, `agent?` (`mama` · `scout` · `researcher` · `vam` · `writer` · `allocator`; sets the colour), `refs?` (repo paths behind the card) and `actions?` (`{label, prompt, style?}`, where `prompt` is sent as the next turn). Any prop may be a literal or a `{"path": …}` binding. Literal props are checked against `console/cards.schema.json`.

| Component | Key props | Used by |
|---|---|---|
| `PlanCard` | `steps[{label, status, agent}]` (status: pending, running, done, failed) | every multi-step skill |
| `AgentsCard` | `lanes[{agent, label, done, total, status}]` | mama-day, mama-scan, mama-vam, mama-nightly |
| `DaySummaryCard` | `drafts, send_window, hot[], at_risk, needs_you[]` | mama-day |
| `DraftCard` | `account, to, channel, subject?, body, signal, pattern, passed[], send_window` | mama-draft, mama-replies |
| `ReplyCard` | `account, from, class, summary, response_ref?` | mama-replies |
| `AccountCard` | `account_id, name, market, tier, score, score_parts{fit,intent,propensity,engagement}, stage, owner, signals[], recommendation{chain[], product, proof, talk_track}, next{action, due}` | mama-research, mama-recommend, mama-brief, mama-handover, mama-target |
| `BriefCard` | `subject, sections[{heading, bullets[]}]` | mama-brief |
| `ReviewQueueCard` | `items[{n, text, source, candidate, confidence}]` | mama-manager |
| `RunStatusCard` | `ok, started, finished, markets[], items, linked, review, new_leads, errors` | mama-nightly, mama-scan, mama-manager |
| `ErrorCard` | `message, fix` | any |

A2UI reserves two prop names, so two card fields are renamed. The draft's `checks` become `passed`, and the account's `id` becomes `account_id`.

Old ```` ```mama-card ```` blocks still render, from recordings and saved results. The console maps each to its card component, or to `LegacyCard` for the retired report types (`book`, `allocation`, `team_book`, `stats`, `chart`, `table`, `company`, `compare`). Skills never emit them.

---

## 3. Console architecture (Phase 9)

```
browser (localhost:4173) ──WebSocket── console server (Node) ──spawn── claude -p … --output-format stream-json
                                              │                         (or: codex exec --json)
                                              └── reads repo files for source chips and the bento rail
```

- **Engine:** spawn the local CLI in the repo folder, using each user's own sign-in on their own machine:
  `claude -p "<prompt>" --output-format stream-json --verbose --include-partial-messages --append-system-prompt "MAMA_CARDS=on" --resume <session>`.
  For Codex: `codex exec --json "<prompt>"`. Alternatively use the Agent SDK (TypeScript or Python) with an API key.
- **Event mapping:**
  - Text deltas → the streaming chat bubble.
  - Tool calls → small tool chips ("Reading wiki/accounts/…", "Running scripts/score.py").
  - Subagent messages (their `parent_tool_use_id`) → one **agent lane** each.
  - Task-list updates → the **plan** card.
  - `mama-card` blocks → rendered cards.
  - Errors → an `error` card with the fix.
- **Permissions:** the console runs with the project's `.claude/settings.json`. It never passes flags that widen permissions, and never offers a send button.
- **Side rail (bento):** a live read of `wiki/books/<rep>.md` (or `team.md` for the manager). It shows the meetings ring, tier mix, hot list and send window, and refreshes after each sync.
- **Stack:** Node 20 + TypeScript, React + Vite, a WebSocket bridge, no database. It runs on localhost only. Before offering it beyond your own team, check the current Anthropic and OpenAI terms on authentication.

---

## 4. Visual language (2026)

| Token | Value | Use |
|---|---|---|
| Ground | `#F6F4FF` | page background |
| Surface | `#FFFFFF` | cards |
| Ink | `#16131F` | text, dark hero panels |
| Muted | `#5B5670` | secondary text (≥ 4.5:1 on white) |
| Lime | `#C8F031` | highlights on dark panels, "live" pulses |
| Mama (violet) | `#6D28D9` / tint `#EFE8FF` | primary actions, Sales Mama |
| Scout (blue) | `#1D4ED8` / `#E5EDFF` | signal scanning |
| Researcher (teal) | `#0F766E` / `#DDF5F1` | account research |
| VAM (magenta) | `#BE185D` / `#FFE6F1` | virtual account managers |
| Writer (orange) | `#C2410C` / `#FFEDE0` | drafts |
| Allocator (green) | `#15803D` / `#E2F6E8` | allocation |
| Risk | `#B91C1C` | at-risk counts |

- **Type:** Bricolage Grotesque for display numbers and headings; Geist for UI text; Geist Mono for commands and paths.
- **Shape:** 20–28 px card radius, 999 px chips, 44 px minimum touch targets.
- **Motion:** live lanes pulse lime while running; cards slide in as they stream. Respect `prefers-reduced-motion`.
- **No** gradient washes, emoji or left-border callout cards. Colour comes from solid agent tints and bold numbers.
- **Mobile:** the chat column first, with the bento rail collapsing to a swipeable row of tiles; quick replies stay at the thumb zone.

The design canvas "Sales Mama UI" shows the target screens: rep morning run, ask-my-book, account brief, manager cockpit, and the mobile view.
