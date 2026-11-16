# Sales Mama Console — Frontend Design Spec v2

> Status: **proposed** (2026-11-16). Owner: manager. Applies to `console/`, plus the calendar data layer in `scripts/`, the skills and AGENTS.md (Phase 3, which needs plan mode).
> Builds on `docs/UI.md`, ADR-0006 (the console renders only), ADR-0007 (approve-then-send) and ADR-0009 (scripts emit data, views are A2UI).

---

## 0. Why this spec

The console works, but it doesn't yet feel like a chat product a rep wants to live in. The audit on 2026-11-16 (1440×800 laptop viewport, `?replay=mama-day`) found:

| # | Problem | Cause | Status |
|---|---|---|---|
| 1 | "I cannot scroll down" during a run | `scrollIntoView({behavior:'smooth'})` on **every streamed token** fought the reader's own scrolling | **Fixed in Phase 0** |
| 2 | The newest text hid under the composer | The scroll anchor sat *above* the sticky composer, so auto-scroll parked the last ~130 px underneath it | **Fixed in Phase 0** |
| 3 | The bottom of the rail was unreachable | The rail is sticky and 1006 px tall in an 800 px window | **Fixed in Phase 0** (own scroll) |
| 4 | Tool chips flood the turn | Every tool call is a chip; a 15-step run is 3 rows of chips before the answer | Phase 2 |
| 5 | Motion is mostly absent | One slide-in on cards; no streaming feedback, skeletons or transitions | Phases 1–2 |
| 6 | The composer floats over the content | A sticky composer inside a document-scrolling page | Phase 1 (docked composer) |
| 7 | No sense of time | Reps live by their calendar; the console has none | Phases 3–4 |
| 8 | No keyboard flow | No command palette, no shortcuts, no @-mentions | Phase 2 |
| 9 | `Callout` uses a left-border bar | Breaks the visual language rule against left-border callout cards (UI.md §4) | Phase 1 |

**Goal:** a fluid, keyboard-friendly, time-aware cockpit with the polish of Claude, Perplexity and Linear, a schedule view reps check before every call, and a look that is unmistakably Sales Mama.

---

## 1. Principles

The five principles in UI.md §1 stay: chat is the cockpit, show the agents working, cards over walls of text, every card is grounded, humans hold the pen. Five new ones:

6. **Never fight the reader.** Scroll, focus and selection belong to the user. The UI follows new content only while you are at the bottom.
7. **Time is a first-class object.** Everything that has a date (meetings, follow-ups, renewals, events, send windows) appears on one timeline, colour-coded the same way everywhere.
8. **Glance, then go deeper.** Each screen answers "what's next?" in one second. Details open in place (disclosures, drawers, the canvas), never on a new page that loses the thread.
9. **Motion explains.** Animate only to show cause and effect: an agent started, data arrived, a panel opened. Durations stay at 320 ms or less, and `prefers-reduced-motion` is honoured everywhere.
10. **Keyboard first, touch friendly.** Every action has a shortcut. Every target is 44 px or larger on touch.

**Non-negotiables** (unchanged ADRs):
- The console only sends prompts and renders. It never writes the repo, sends a message or widens permissions (ADR-0006/0007).
- Calendar edits such as reschedule or cancel become **prompts** that the agent carries out with `scripts/appointments.py` after confirming. No direct writes from the browser.
- Scripts emit JSON; views are A2UI or console components (ADR-0009). Numbers are bound, never typed.
- Scoping: a rep sees only their own accounts and appointments. The manager sees the team (rule 16).
- No gradient washes and no emoji. Colour comes from solid tints, bold numbers, depth and motion (UI.md §4).

---

## 2. References — what we take, what we leave

| Product | Take | Leave |
|---|---|---|
| **Claude.ai** | Docked composer under a centred reading column (~760 px); stick-to-bottom with a "jump to latest" pill; a collapsible activity/"thinking" disclosure; a side **artifact** panel for wide output; quiet, confident motion | Hidden tool details by default for power users (we show a summary line) |
| **Perplexity** | **Answer anatomy**: one-line answer, then sources, then detail; a step timeline ("Searching → Reading → Answering"); **related follow-ups** as chips after each answer; numbered source chips | A search-engine feel; ads-like "Discover" feeds |
| **ChatGPT canvas** | Split view: chat left, a wide work surface right, resizable | Editing documents in the canvas (our surfaces are read-only views) |
| **Linear / Raycast** | ⌘K command palette; a crisp 150–200 ms motion vocabulary; keyboard navigation everywhere; dense but calm lists | A purely monochrome palette (we are colourful by design) |
| **Notion Calendar (Cron) / Google Calendar** | Week time grid with a **now line**; colour per calendar; all-day lane; keyboard (← → T); "next meeting in 12 min" in the menu bar; time-zone gutter | Their busy, multi-calendar settings |
| **Superhuman** | Speed as a feature: optimistic UI, shortcuts on every row, a "next up" focus | Paid-tier complexity |

**What makes Sales Mama unique.** Five signature elements that appear nowhere else:

1. **Pulse bar.** A thin live strip under the header. Each running agent is a coloured dot (scout blue, researcher teal, VAM magenta…) travelling along it, visible from every screen. Click it to open that run.
2. **Market clocks.** `SG 10:42 ● window open · MY 10:42 · IN 08:12 ○ opens 09:00`. Each shows the local time and the send-window state of every market the user covers.
3. **Next-up capsule.** In the header: `Kestrel Physio · 14:00 · in 25 min`. It counts down, turns orange at 15 minutes, and one click gives *Brief me*.
4. **Day ribbon.** A 24-hour horizontal ribbon on Today. Meetings, follow-ups and the send-window band sit on it as solid segments, with a lime "now" marker gliding across. The day at a glance in 40 px.
5. **Story line.** In a turn, a thin vertical line links your prompt, the agents' activity and the answer. It takes the colour of the agent that produced each part, so you can see who did what.

---

## 3. Information architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ SM Sales Mama   [⌘K Search or run…]   SG 10:42 ● open · IN 08:12 ○   [Kestrel · 14:00 · 25m]  PG │  header (56px)
│ ▪▪▪▪▪▪▪▪▪▪▪▪▪●▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪●▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪▪ │  pulse bar (3px)
├────┬──────────────────────────────────────────────────────┬──────────────────────────┤
│ ⌂  │                                                      │  CONTEXT PANEL           │
│ 💬 │                 MAIN (route)                         │  Today agenda            │
│ 📅 │   Today · Chat · Calendar · Book · Reports           │  — or account inspector  │
│ ◎  │                                                      │  — or canvas (wide view) │
│ ▤  │                                                      │                          │
│    │                                                      │                          │
│ ⚙  │                                                      │                          │
└────┴──────────────────────────────────────────────────────┴──────────────────────────┘
 nav rail 64px (icons drawn as SVG, no emoji)  ·  main fluid  ·  context panel 360px, resizable 300–640
```

| Route | URL | Purpose | Default context panel |
|---|---|---|---|
| **Today** (home) | `/` | Greeting, next-up, day ribbon, three smart actions, KPIs | Agenda |
| **Chat** | `/chat` (`?replay=`, `?result=` keep working) | Conversations with Sales Mama | Agenda, or the canvas when a surface is opened |
| **Calendar** | `/calendar?view=day\|week\|month\|team&d=2026-11-16` | Appointments, follow-ups, events, windows | Event details |
| **Book** | `/book` | The rep book as a live A2UI surface (`wiki/books/<id>.json`) | Account inspector |
| **Reports** | `/reports` | Saved surfaces (`*.view.md`) and data files, newest first | Canvas |

- A tiny hash-free router (History API, about 60 lines, no dependency). Every view state lives in the URL, so it can be bookmarked and refreshed.
- **Mobile (< 900 px):** a bottom tab bar (Today · Chat · Calendar · Book), the composer docked above it, and the context panel as a bottom sheet with drag-to-expand.

---

## 4. Layout and scroll model

**One rule:** the document never scrolls. Each pane owns its scroll.

```css
.app      { height: 100dvh; display: grid; grid-template-rows: 56px 3px 1fr; }
.body     { display: grid; grid-template-columns: 64px minmax(0,1fr) var(--panel, 360px); min-height: 0; }
.thread   { overflow-y: auto; overscroll-behavior: contain; scroll-padding-bottom: 24px; }  /* chat */
.composer { position: relative; }      /* docked under .thread, never over it */
.panel    { overflow-y: auto; }         /* context panel */
```

- **Stick-to-bottom** (shipped in Phase 0 as `useStickToBottom`, moves onto `.thread` in Phase 1):
  - It is pinned while the reader is within 120 px of the bottom.
  - It unpins only on the reader's own upward movement: scrolling up, wheeling up outside the panels, or PageUp/↑/Home.
  - A `ResizeObserver` follows growth (streaming text, charts loading) while pinned. When unpinned it shows the **Jump to latest** pill, labelled "New activity" while a run streams.
  - Sending a prompt re-pins.
- **Scroll memory:** each route restores its own scroll position, and opening a drawer never moves the thread.
- **The composer is docked:** content can never sit under it. A 24 px fade mask of the ground colour (a mask, not a gradient fill) separates the thread from the composer.
- **The thread** is a centred 760 px reading column. Surfaces may break out to 1040 px ("wide"), or open in the canvas.

---

## 5. Chat experience v2

### 5.1 Turn anatomy (Perplexity's structure in the Sales Mama look)

```
                                                     ┌────────────────────────────┐
                                                     │ /company-insights clinics  │  you (ink bubble)
                                                     └────────────────────────────┘
 (M) company-insights · 32 s · $0.23        ⟳ ⧉ ↗ ☆          ← header: skill, elapsed, cost; hover actions
  │  ▸ Worked for 32 s · 7 steps · 1 agent                     ← activity disclosure (collapsed when done)
  │     ✓ Reading registry index   ✓ company_analytics.py …    ← tool chips, lanes, plan (inside)
  │
  │  There are 9,618 live clinic companies in Singapore…       ← answer first (markdown, streams)
  │  Sources ① insights-clinics.json ② icp.md ③ …              ← aggregated refs as numbered chips
  │  ┌─────────── surface: Clinics in Singapore ───────────┐   ← A2UI (skeleton → data → fade-in)
  │  └──────────────────────────────── [Open in canvas] ───┘
  └ Next: [Save these leads] [Compare top 3] [Book a demo slot]  ← follow-up chips (ActionBar + suggestions)
```

- **Activity disclosure.** While a run is live it shows the current step as shimmering text ("Running company_analytics.py…"), the plan as a progress ring (3/7), and agent lanes inline. When the run ends it collapses to one line: `Worked for 32 s · 7 steps · 2 agents · 1 needed approval`. Failed tools turn the line red and expand it automatically.
- **Answer first.** The agent's one-line summary is styled as the lead (17 px, 600). Markdown streams with a soft caret, and each new block fades in (opacity 0→1, 140 ms).
- **Sources row.** It merges `refs` from every surface and card in the turn, with duplicates removed. Each is numbered and opens the source drawer.
- **Surfaces:**
  - Skeleton shimmer while `dataRef` loads, with height reserved to avoid layout jump.
  - Content cross-fades in, and KPI numbers count up once, over 600 ms.
  - Card-only surfaces keep the card look (ADR-0009).
- **Follow-up chips.** These are the turn's `ActionBar` prompts plus up to three suggestions from the skill. After a run they sit above the composer (the Perplexity "related" pattern) until the next prompt.
- **Message actions** (on hover or focus):
  - Copy answer
  - Retry: re-ask the same prompt
  - Open surface in canvas
  - Share as page
  - Pin to Today, saved in the browser's local storage
- **Needs approval** appears as an inline amber banner in the turn: *"4 steps were skipped: run this in Claude Code to approve"*, with a *Copy command* button.

### 5.2 Composer v2

```
┌──────────────────────────────────────────────────────────────────────────┐
│ @Kestrel Physio  ×   SG window open                                     │  context chips
│ Brief me before the 2pm call and draft a follow-up for tomorrow▌         │  autosize 1–8 lines
├──────────────────────────────────────────────────────────────────────────┤
│ /  @  ⌘K     /mama-brief  /mama-day  /company-insights …          [ ➜ ]  │  quick skills · send/stop
└──────────────────────────────────────────────────────────────────────────┘
```

- **`/` opens the skill menu:** fuzzy search, a one-line description per skill and an argument hint (`/mama-draft <account> <step>`). Arrow keys and ⏎ choose.
- **`@` mentions an account** from your own accounts (the manager sees all), searched from `wiki/books/<id>.json` plus `/api/accounts`, a new read-only endpoint. Each suggestion shows tier, stage and the next meeting. The mention is sent as the account id.
- **Keys:** ⏎ sends, ⇧⏎ adds a new line and ⌘⏎ always sends. While a run is going, Esc stops it.
- **Drafts persist** per conversation in local storage. The composer never loses your text on reload.
- **Busy state:** while a run is live the send button becomes Stop, with a radial progress of the plan. You can type the next prompt while you wait; it is queued and sent when the run ends.

### 5.3 Command palette (⌘K)

One box for everything: *skills* (run), *accounts* (open the inspector or start a chat about one), *views* (Today, Calendar week, Team), *recent prompts*, and *actions* (New chat, Toggle theme, Share current surface). Results are grouped and fuzzy-matched, with recent items first. The palette opens with a 160 ms scale-and-fade.

### 5.4 Keyboard map

| Keys | Action |
|---|---|
| ⌘K | Command palette |
| / | Focus the composer and open the skill menu |
| ⌘↓ | Jump to latest |
| Esc | Stop the run, or close the drawer, sheet or palette |
| g t · g c · g k · g b | Go to Today · Chat · Calendar · Book |
| ⌘⇧C | Copy the last answer |
| Calendar: ← → · t · d w m | Previous/next period · today · day/week/month |
| ? | Shortcut sheet |

### 5.5 Conversations

- A **chat history** list sits under the Chat nav item. It holds titles, auto-named from the first prompt, and is stored in the browser only (local storage; the console never writes the repo). Resuming uses the stored `sessionId` (`--resume`).
- **Paced replay:** `?replay=mama-day&speed=1` replays recorded streams at real speed. Use it for demos, design review and the Playwright motion tests.

---

## 6. Calendar and appointments

### 6.1 What appears on the calendar (sources)

| Item | Source | Produced by |
|---|---|---|
| **Appointments** (meeting, call, demo, site visit) | `log/appointments.csv` (new, append-only) | `scripts/appointments.py` (new) |
| **Follow-ups due** | account `next_action` / `next_action_due` | VAMs, mama-draft (existing) |
| **Renewal windows** | account `contract_end` (90/60/30-day markers) | CRM ingest (existing) |
| **Claim lapses** | `claimed_on` / `allocated_on` + 21 days without a touch | existing lint rule |
| **Trade events** | `wiki/events/*.md` `dates`, `matched_accounts` | mama-scan (existing) |
| **Send windows** | `knowledge/markets.yaml` `send_windows`, `tz` | existing |
| **Holidays** | `knowledge/markets.yaml` `holidays` | existing |
| **Team rhythm** (manager) | nightly run 02:00, weekly review (Friday) | constants in the skill docs |
| *Busy blocks* (optional, Phase 6) | Google Calendar free/busy, via the connector | `raw/calendar/` snapshot |

### 6.2 Appointment data model (Phase 3, plan mode)

`log/appointments.csv` is append-only and event-sourced: the **latest row per `id` is the current state**, so reschedules keep their history.

```
ts,id,rep,account,contact,kind,title,starts,ends,tz,location,status,source,ref,by
2026-11-16 10:05,apt-20261118-kestrel-physio-1,praveen,kestrel-physio,mei-lim-kestrel-physio,meeting,Discovery call,2026-11-18T14:00,2026-11-18T14:45,Asia/Singapore,Google Meet,confirmed,reply,raw/replies/2026-11-16-kestrel.md,praveen
```

- `kind` is one of `meeting`, `call`, `demo`, `site_visit`.
- `status` is one of `tentative`, `confirmed`, `rescheduled`, `cancelled`, `held`, `no_show`.
- `source` is one of `reply`, `rep`, `handover`, `calendar`.

`scripts/appointments.py` is a tool (JSON in and out):
- **Commands:** `add`, `reschedule`, `cancel`, `held`, `no-show` and `list --json`.
- **Refusals:**
  - an account the user doesn't own (rules 6 and 16)
  - a contact that isn't on the account page (rule 5)
  - personal data beyond business role (rule 8)
- **Warnings:**
  - a market holiday
  - outside 08:00–19:00 in the account's market time zone
  - an overlap with the rep's other appointments
- **On `add`:** appends the existing `meeting_booked` touch with `ref = apt id`, and logs `- [..] appointment | <rep> | accounts/<id> | booked 18 Nov 14:00 SGT`. This adds a new `appointment` log op to AGENTS.md.

`build_books.py` additionally writes these files, gitignored like the books, and the console reads them through `/api/data`:
- `wiki/books/<rep>.calendar.json`
- `wiki/books/team.calendar.json` (manager)

The window is −14 to +60 days. Item shape:

```json
{"id": "apt-20261118-kestrel-physio-1", "kind": "meeting", "status": "confirmed", "title": "Discovery call",
 "start": "2026-11-18T14:00:00+08:00", "end": "2026-11-18T14:45:00+08:00", "all_day": false,
 "market": "SG", "tz": "Asia/Singapore", "rep": "praveen",
 "account": {"id": "kestrel-physio", "name": "Kestrel Physio Pte Ltd", "tier": "B", "stage": "researched"},
 "contact": "Mei Lim (Ops Manager)", "location": "Google Meet", "ref": "log/appointments.csv",
 "prep": {"brief": false, "last_touch": "2026-11-02"}}
```

SG and MY are UTC+8 and IN is UTC+5:30, and none of them observe daylight saving, so all date maths is plain offsets with `Intl.DateTimeFormat`. No date library is needed.

**Skills** (Phase 3, plan mode):
- **New `mama-schedule`:** "book Kestrel Tue 2pm", "move it to Thursday", "what's on this week", "cancel".
- **mama-replies:** a `meeting_request` books a `tentative` appointment on the rep's say-so, and `confirmed` once accepted.
- **mama-handover:** marks the appointment `held` and its outcome.
- **mama-day:** puts today's meetings first and offers a brief for any meeting in the next 24 hours.
- **mama-manager:** adds the team week.

### 6.3 Views

**Today (home):**

```
Good morning, Praveen.                                         Mon 16 Nov · SG 10:42
┌ NEXT UP ─────────────────────────────┐ ┌ TODAY ───────────────────────────────────────┐
│ ● Kestrel Physio · Discovery call    │ │ 08   09   10   11   12   13   14   15   16    │
│   14:00–14:45 SGT · Google Meet       │ │      [▓▓▓ send window ▓▓▓]     ●Kestrel       │  day ribbon
│   in 3 h 18 m   [Brief me] [Open]     │ │              ▲ now        ◆fu Lotus  ★Expo    │
└──────────────────────────────────────┘ └──────────────────────────────────────────────┘
 Smart actions:  [3 follow-ups due → draft]   [Allocation waiting → review]   [Renewal in 30 d: Nimbus]
 KPIs:  Meetings 0/8 ◔   Replies 0/0   Book 3/60 ▁   Hot 2
```

**Week** (default calendar view):

```
          Mon 16      Tue 17      Wed 18        Thu 19      Fri 20     │ legend
 all-day  ◆fu Lotus               ★IntraLogisteX              ↻ Nimbus  │ ● meeting  ◐ call
 08:00                                                                  │ ◇ demo     ◆ follow-up
 09:00   ▒▒▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒▒▒▒▒▒▒  ▒▒▒▒▒▒▒▒▒▒             │ ★ event    ↻ renewal
 10:00   ▒ send win  ▒           ▒            ▒                         │ ▒ send window
 ─now──● ──────────────────────────────────────────────────────────── │ ▨ holiday
 14:00               ┌─────────┐ ┌──────────────┐                       │
                     │●Kestrel │ │◇ Demo Nimbus │                       │ filters: kinds · tier
                     │ B · 45m │ │  A · 60m     │                       │ market · status
 16:00               └─────────┘ └──────────────┘                       │
```

- A time grid from 08:00 to 19:00 in the rep's market time zone, extendable. The gutter shows a second time zone when the rep covers more than one (SG and IN).
- An all-day lane holds follow-ups, events, renewals and claim lapses.
- Send-window bands are shaded in allocator tint, and holidays are hatched with the holiday name.
- **Now line:** lime, with a pulsing dot. It glides every minute and never jumps.
- **Overlaps:** overlapping appointments sit side by side, and conflicts get a red corner notch.

**Month:** each day has stacked kind-dots (up to 4, then "+3"), plus a heat tint by appointment count. Clicking a day opens the Day agenda in the panel.

**Team** (manager only):

```
            Mon 16          Tue 17          Wed 18 …
 praveen    ●●  ◆◆◆  ▁▃     ●   ◆           ●● ◇
 mei        ●●● ◆   ▅       ●●  ◆◆  ⚠ clash
 arun       —   ◆◆◆◆ ▇ overload
```

- One swimlane per rep, with a load bar for appointments plus follow-ups against capacity.
- Clashes and overload are flagged in red.
- Clicking a cell filters the Week view to that rep and day.
- **Scoping:** reps never see the Team view. In their own Week view, teammates appear only as anonymous "busy" blocks, and only if Phase 6 is enabled.

**Event details** (context panel):
- Account header with tier, stage and score ring.
- Contact (business role only) and location or link.
- **Prep checklist:**
  - brief ready?
  - last touch
  - open objections
  - signals in the last 30 days
- **Actions,** which are all prompts:
  - Brief me: `/mama-brief <id>`
  - Log outcome: `/mama-handover <id>`
  - Reschedule… opens a small picker, then sends "reschedule apt-… to Thu 19 Nov 15:00". The agent confirms, then runs `appointments.py`.
  - Cancel
  - Open account

**Direct manipulation, without breaking ADR-0006:**
- **Dragging an event** to a new slot shows a ghost at the target, with a confirm bubble: *"Ask Sales Mama to move Kestrel to Thu 15:00?"* ⏎ sends the prompt. The block shows as "pending" (dashed) until the rebuilt calendar JSON arrives over the WebSocket push.
- **Clicking an empty slot** prefills the composer: `/mama-schedule book @… Thu 19 Nov 15:00`.

**Reminders** are an opt-in browser `Notification` 15 minutes before an appointment ("Kestrel Physio in 15 min: Brief me"), plus the header capsule turning orange. The tab title gets a badge: `(1) Sales Mama`.

**In chat:** two new A2UI components, `AgendaList` and `CalendarWeek`, are bound to `<rep>.calendar.json`. That lets `/mama-day` and `/mama-schedule` show schedules inline, with the same colours and the same event drawer.

### 6.4 Google Calendar (optional, Phase 6)

- **Read-only free/busy import** through the claude.ai Google Calendar connector, rep-approved. It is written as `raw/calendar/<date>-<rep>.json` with **busy blocks only**: start, end and "busy", never titles or attendees of personal events (rule 8).
- **Invites stay human.** Sending an invite to a prospect is outward contact, so it is drafted and approved in Claude Code chat like a send (ADR-0007). The console never creates invites.

---

## 7. Visual system v2

### 7.1 Colour roles

The agent palette (UI.md §4) stays. **Schedule kinds reuse the same hues**, so one colour language spans chat, cards and calendar:

| Role | Light (solid / tint) | Dark (solid / tint) | Glyph (SVG) | Notes |
|---|---|---|---|---|
| Meeting · confirmed | Mama `#6D28D9` / `#EFE8FF` | `#A78BFA` / `#2A2142` | ● | tentative = dashed 1.5 px outline on tint |
| Call | Scout `#1D4ED8` / `#E5EDFF` | `#7DA2FF` / `#1B2540` | ◐ | |
| Demo | Researcher `#0F766E` / `#DDF5F1` | `#3CC4B0` / `#12302C` | ◇ | |
| Site visit | Allocator `#15803D` / `#E2F6E8` | `#4ADE80` / `#15301F` | ⌂ | |
| Follow-up due | Writer `#C2410C` / `#FFEDE0` | `#FB923C` / `#3A2316` | ◆ | overdue = solid fill + risk dot |
| Trade event | VAM `#BE185D` / `#FFE6F1` | `#F472B6` / `#3A1A2B` | ★ | |
| Renewal window | Amber `#A16207` / `#FDF0DC` | `#FBBF24` / `#3A2E12` | ↻ | 90/60/30-day markers |
| Claim lapse | Risk `#B91C1C` outline | `#F87171` outline | ⚠ | |
| Send window | Allocator tint band, 40% | `#15301F` band | ▒ | label "window open" in allocator-d |
| Holiday | Hatched `--line-2` 45° | hatched `#3A3449` | ▨ | name in muted text |
| Now | Lime `#C8F031` on ink | Lime | — | 2 px line + 8 px dot, pulse 2 s |
| Busy (imported) | `--line` solid, no label | `#2D283B` | — | Phase 6 |

**Status language,** used everywhere (calendar, cards, tables), with icons drawn as inline SVG:

| Status | Look |
|---|---|
| confirmed | solid |
| tentative | dashed |
| held | check, in muted text |
| cancelled | strikethrough at 50% opacity |
| no-show | risk dot |
| rescheduled | "moved from Tue 14:00" in the tooltip |

**Tier chips:** A is solid violet, B is a violet tint, C is neutral. **Market chips:** SG, MY and IN as two-letter mono chips with fixed hues: SG rose `#BE123C`, MY blue `#1D4ED8`, IN saffron `#C2410C`. No flags.

**Contrast:** text on every tint is at least 4.5:1, verified with the dataviz validator script in CI (Phase 7). Kind is always shown by glyph *and* colour, never colour alone.

### 7.2 Depth, shape, type

- **Elevation:** level 0 is flat and bordered (cards). Level 1 is raised (`0 6px 20px rgba(22,19,31,.12)`) for popovers and the jump pill. Level 2 is an overlay (`0 24px 60px rgba(22,19,31,.24)`) for the palette, drawers and sheets. The header gets a subtle `backdrop-filter: blur(12px)` over a translucent surface.
- **Radius:** 28 for panels, 20 for cards, 14 for tiles and events, 999 for chips. Events in the time grid use 10.
- **Type scale:**
  - 12 mono (paths)
  - 13 caption
  - 15 body
  - 17 lead
  - 22 h3
  - 28 h2
  - 44 and 64 display numbers (Bricolage)
  - Tabular numbers everywhere numbers align.
- **Dark mode:** full parity, using the tokens already in `a2ui.css`. In Phase 1 these merge into one `tokens.css`, with a manual toggle stored in local storage.
- **Fix:** `Callout` drops the left border. It becomes a tinted panel with a 24 px status icon chip (UI.md §4).

### 7.3 Motion system

| Token | Value | Use |
|---|---|---|
| `--t-fast` | 120 ms | hovers, chip presses |
| `--t-base` | 200 ms | messages entering, disclosures, menus |
| `--t-slow` | 320 ms | drawers, sheets, route changes |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | enter |
| `--ease-in` | `cubic-bezier(.4,0,1,1)` | exit |
| `--ease-spring` | `linear(0, .5 9%, 1.03 35%, .99 60%, 1)` | the palette, the pill, dropping an event |

| Pattern | Animation |
|---|---|
| Message enters | opacity 0→1 and translateY 8→0, 200 ms out; streaming blocks fade 140 ms |
| Activity running | shimmer text sweep (1.6 s linear loop); lane bars move indeterminately; pulse-bar dots glide |
| Disclosure | `grid-template-rows: 0fr → 1fr`, 200 ms, so content height is never measured |
| Surface data arrives | skeleton cross-fades to content over 200 ms; KPI count-up once, 600 ms |
| Route change | View Transitions API (`document.startViewTransition`) with a 200 ms shared-axis slide, falling back to a fade |
| Drawer, sheet | slide 24 px plus fade, 320 ms, spring settle |
| Calendar | the now line moves via `transform`; event hover lifts 2 px; dragging shows a ghost at 60% plus a magnetic snap to 15-minute slots |
| Reduced motion | no transforms, no shimmer, no count-up; opacity fades at most 120 ms |

Only `transform` and `opacity` animate (60 fps budget). There is no animation library: CSS, the Web Animations API and View Transitions cover it, keeping the bundle as it is.

---

## 8. Architecture

```
console/src/
  app/        Shell.tsx · Header.tsx (clocks, next-up, pulse) · NavRail.tsx · ContextPanel.tsx · router.ts
  chat/       Thread.tsx · Turn.tsx · Activity.tsx · Composer.tsx · SkillMenu.tsx · Mentions.tsx · FollowUps.tsx
  palette/    CommandPalette.tsx
  calendar/   Today.tsx · DayRibbon.tsx · Week.tsx · Month.tsx · Team.tsx · EventDrawer.tsx · time.ts · layout.ts (overlap packing)
  a2ui/       (existing) + AgendaList · CalendarWeek components
  styles/     tokens.css · shell.css · chat.css · calendar.css · motion.css   (split from styles.css)
  hooks/      useStickToBottom.ts (Phase 0) · useHotkeys.ts · useNow.ts · useLocalStore.ts · useCalendar.ts
console/server/
  index.ts    + /api/accounts (read-only list for @-mentions), WS push "calendar" when wiki/books/*.calendar.json changes
```

- **State:**
  - `useBridge`: the chat, as today.
  - `useCalendar`: fetches `/api/data?path=wiki/books/<id>.calendar.json` and refreshes on the WS push.
  - `useNow`: one 30-second ticker shared by the clocks, the now line and the countdowns.
- **No new runtime dependencies** for the shell, chat or calendar: the calendar grid is custom (about 700 lines) so it matches the design exactly. FullCalendar was considered and rejected for bundle size and styling fights.
- **Tests:**
  - **Vitest:** time maths, overlap packing, router, palette ranking.
  - **Playwright e2e** (new, in CI): scroll behaviour (the Phase 0 checks), keyboard map, calendar drag→prompt, reduced motion, phone width, light and dark.
  - **Visual snapshots** of key screens.

---

## 9. Implementation phases

Each phase is shippable alone, ends with green tests, and leaves the console usable.

| Phase | Scope | Key files | Done when | Size |
|---|---|---|---|---|
| **0 · Scroll hotfix** ✅ | Direction-aware stick-to-bottom, jump pill, own-scroll rail | `useStickToBottom.ts`, `App.tsx`, `styles.css` | 8 browser checks pass: pinned load, follows streaming, no yank when scrolled up, free scroll down, jump returns, rail reachable, no errors, no horizontal scroll at 390 px | done 2026-11-16 |
| **1 · Foundations** ✅ (2026-11-16: Today, Chat and Book routes; Calendar and Reports join the nav in Phases 4–5) | `tokens.css` (light/dark, kinds, motion), app shell (header with market clocks and pulse bar, nav rail, context panel, own-scroll panes, docked composer), router, mobile tab bar and bottom sheet, Callout fix, theme toggle | `app/*`, `styles/*`, `main.tsx` | No document scroll at any width. Every route reachable by URL and keyboard. Lighthouse a11y ≥ 95. Visual parity of all existing cards | M |
| **2 · Chat v2** | Turn anatomy, activity disclosure, streaming fades, surface skeletons, sources row, follow-up chips, message actions, composer v2 (`/` menu, `@` mentions, drafts, queueing), ⌘K palette, shortcut sheet, local chat history, paced replay | `chat/*`, `palette/*`, `server/index.ts` (`/api/accounts`) | A 15-step run shows one activity line. ⌘K finds any skill or account in < 50 ms. Keyboard-only walkthrough passes. Replay `&speed=1` animates smoothly at 60 fps | L |
| **3 · Calendar data layer** (plan mode) | `log/appointments.csv` schema, `scripts/appointments.py`, calendar JSON in `build_books.py`, `mama-schedule` skill, updates to mama-replies, mama-handover, mama-day and mama-manager, AGENTS.md (CSV schema, `appointment` op), selftest + eval cases, ADR-0010 | `scripts/*`, `.agents/skills/*`, `AGENTS.md`, `docs/adr/0010-*.md` | A failing selftest is written first, then green. Refuses others' accounts. Holiday, overlap and after-hours warnings. Calendar JSON validated. eval: appointment rows reference real accounts | M |
| **4 · Calendar UI** | Today (next-up, day ribbon, smart actions), Week, Month, Team, event drawer, slot→prompt, drag→prompt with confirm, filters and legend, dual time-zone gutter, reminders, `AgendaList`/`CalendarWeek` A2UI components | `calendar/*`, `a2ui/*` | All four views from real JSON. Drag/slot send correct prompts and never write. Rep cannot see teammates' accounts. 390 px usable. Reduced motion respected | L |
| **5 · Canvas and reports** | Resizable canvas panel for wide surfaces, Reports route (saved `*.view.md` and data files), Share from the canvas | `app/ContextPanel.tsx`, `reports/*` | Open, resize and close the canvas without losing scroll. Shared page still offline-clean | S |
| **6 · Google Calendar busy blocks** (optional) | Connector import of free/busy only, busy blocks in Week/Team, ADR addendum | skill + `raw/calendar/` + UI | No personal titles stored (lint rule). Rep approval recorded | S |
| **7 · Hardening** | Playwright in CI, visual snapshots, contrast checks, perf budget (TTI < 1.5 s local, 60 fps scroll), docs (UI.md, README screens), demo replay | `console/e2e/*`, `.github/workflows/ci.yml` | CI green with e2e. Docs updated. Screens re-shot | M |

**Suggested order:** 0 → 1 → 2 → 3 → 4 → 5 → 7, with 6 when the team wants it. Phases 3 and 4 can overlap once the calendar JSON shape (§6.2) is frozen.

---

## 10. Decisions for the manager

**Decided 2026-11-16:**
- Appointments live in the Sales Mama log (`log/appointments.csv`), with optional read-only Google Calendar busy blocks (Phase 6).
- The first calendar release ships all four views: Today with next-up, Week, Team and Month.
- Build order is Phase 1 next, with a review (screenshots) before Phase 2.

Original options:

1. **Where appointments live.** *Recommended:* in Sales Mama (`log/appointments.csv`, shared through git), with Google Calendar busy blocks as an optional read-only overlay. The alternative is Google Calendar as the source of truth; that needs every rep connected and makes the timeline depend on a vendor.
2. **Teammate visibility for reps.** *Recommended:* reps see only their own items; the manager sees Team. Optionally, show anonymous busy blocks for teammates in Phase 6.
3. **Reminders.** Browser notifications are opt-in per user. *Recommended:* yes, 15 minutes before.
4. **Chat history.** It is stored in the browser only (per device). *Recommended:* yes. The alternative, syncing via the repo, would break ADR-0006.
5. **Motion.** CSS, the Web Animations API and View Transitions only, with no animation library. *Recommended:* yes.

## 11. Risks

| Risk | Mitigation |
|---|---|
| `appointments.csv` merge conflicts when two reps book at once | Append-only rows, plus `merge=union` in `.gitattributes` (check `sync.py`'s conflict path in Phase 3) |
| Time-zone mistakes (SG/MY +8 vs IN +5:30) | Store ISO with offset. Render with `Intl` in the viewer's market zone. Unit tests across all three markets |
| The calendar becomes a second source of truth for stages | Appointments never change `stage`. Only rep skills do (AGENTS.md conventions) |
| Motion polish costs performance on older laptops | Transform/opacity only, `content-visibility: auto` on old turns, a perf budget in CI |
| Scope creep into a full CRM calendar | Read-mostly views. All writes are prompts executed by skills with their usual checks |
