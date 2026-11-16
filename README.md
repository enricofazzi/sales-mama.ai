<p align="center">
  <img src="docs/assets/hero.png" alt="Sales Mama: the sales harness for Claude Code. Signal to send, you approve each one." width="100%">
</p>

<p align="center">
  <img alt="Claude Code native" src="https://img.shields.io/badge/Claude%20Code-native-6D28D9?style=flat-square">
  <img alt="Codex compatible" src="https://img.shields.io/badge/Codex-compatible-16131F?style=flat-square">
  <img alt="Approve-then-send" src="https://img.shields.io/badge/sending-approve%20then%20send-C2410C?style=flat-square">
  <img alt="Gmail and WhatsApp" src="https://img.shields.io/badge/channels-Gmail%20%C2%B7%20WhatsApp-0F766E?style=flat-square">
  <img alt="Self-test 213 of 213" src="https://img.shields.io/badge/self--test-213%2F213-15803D?style=flat-square">
  <a href="LICENSE"><img alt="Apache 2.0" src="https://img.shields.io/badge/licence-Apache%202.0-5B5670?style=flat-square"></a>
</p>

<p align="center">
  <b>An AI sales Harness for small B2B teams in Singapore, Malaysia and India.</b><br>
  Skills, subagents, hooks and rules that turn Claude Code into a disciplined sales team.<br>
  You approve every message.
</p>

<p align="center">
  <b>New:</b> the console: Today, chat with live agents, ⌘K, calendar and appointments, generative reports ·
  <a href="#-company-check"><code>/company-check</code></a> is this company real? ·
  <a href="#-send-review"><code>/mama-send</code></a> approve-then-send
</p>

<p align="center">
  <img src="docs/assets/demo.gif" alt="Console tour, then /mama-send: preview, approve, one email and one WhatsApp sent" width="92%">
  <br><sub>Console tour, then a real <code>/mama-send</code> run: one email and one WhatsApp, approved and sent. Demo data, fake transport.</sub>
</p>

<p align="center">
  <a href="docs/assets/video/sales-mama-2min-720p.mp4"><img src="docs/assets/video/thumbnail.jpg" alt="Sales Mama film: the next-gen sales buddy" width="92%"></a>
  <br><sub><b>Sales Mama, the next-gen sales buddy.</b> <a href="docs/assets/video/sales-mama-2min-720p.mp4">2-minute film</a> · <a href="docs/assets/video/sales-mama-5min-720p.mp4">5-minute tour</a> · music and on-screen words, fictional demo data.</sub>
</p>

## 🎬 Films

Music and on-screen words, no voice-over; fictional demo data. Each episode opens on a sales problem and shows, step by step, how a rep or manager fixes it.

<table>
<tr>
<td width="33%"><a href="docs/assets/video/install-setup-720p.mp4"><img src="docs/assets/video/install-thumb.jpg" alt="Install and set up Sales Mama"></a><br><sub><b>Install and set up</b> · 4:33 · a real install recorded on a laptop: clone, 213 checks, set-up with Claude Code, first console.</sub></td>
<td width="33%"><a href="docs/assets/video/ep1-where-do-i-start-720p.mp4"><img src="docs/assets/video/ep1-thumb.jpg" alt="Episode 1: Where do I start?"></a><br><sub><b>1 · Where do I start?</b> · 5:01 · plan the morning: Today, "run my day", briefs, send in the window.</sub></td>
<td width="33%"><a href="docs/assets/video/ep2-chasing-the-wrong-leads-720p.mp4"><img src="docs/assets/video/ep2-thumb.jpg" alt="Episode 2: Chasing the wrong leads"></a><br><sub><b>2 · Chasing the wrong leads</b> · 5:01 · reasons to call, company checks, market sizing.</sub></td>
</tr>
<tr>
<td width="33%"><a href="docs/assets/video/ep3-outreach-that-gets-ignored-720p.mp4"><img src="docs/assets/video/ep3-thumb.jpg" alt="Episode 3: Outreach that gets ignored"></a><br><sub><b>3 · Outreach that gets ignored</b> · 5:01 · research, the right offer, cited drafts, WhatsApp with consent, replies.</sub></td>
<td width="33%"><a href="docs/assets/video/ep4-meetings-that-slip-720p.mp4"><img src="docs/assets/video/ep4-thumb.jpg" alt="Episode 4: Meetings and follow-ups that slip"></a><br><sub><b>4 · Meetings that slip</b> · 5:01 · book from a reply, fix clashes, renewals, log the outcome.</sub></td>
<td width="33%"><a href="docs/assets/video/ep5-managing-blind-720p.mp4"><img src="docs/assets/video/ep5-thumb.jpg" alt="Episode 5: Managing blind"></a><br><sub><b>5 · Managing blind</b> · 5:01 · morning cockpit, fair allocation, team calendar, weekly review.</sub></td>
</tr>
</table>

GitHub opens these as downloads; they play in any browser or video player.

## 🎯 Why

Small teams lose deals to busywork, not to competitors.

| Problem | Sales Mama |
|---|---|
| Leads go cold in the CRM | Scans news, tenders and registries every night and flags the right accounts |
| Research eats the morning | Researches accounts in parallel; every fact links a source |
| Leads handed out by gut feel | Explainable scores and a fair allocation the manager approves |
| Follow-ups slip | A virtual account manager watches every book |
| Generic messages | Each draft opens with a real signal, in the rep's voice |

## 🧭 How it works

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/architecture-dark.svg">
    <img src="docs/assets/architecture-light.svg" alt="How Sales Mama works: overnight scan, score and allocate; manager approves; rep drafts, reviews and approves; Sales Mama sends and learns" width="100%">
  </picture>
</p>

- **The repo is the system.** Markdown, YAML and CSV in git. No servers, no database.
- **Maths in scripts, judgement in the LLM.** Scores and allocation are deterministic and explainable.
- **People decide.** Managers approve leads. Reps approve every send.

## ✅ Send review

<p align="center">
  <img src="docs/assets/send-demo.gif" alt="/mama-send: preview two drafts, approve, one email and one WhatsApp sent and logged" width="100%">
</p>

1. `/mama-draft` writes the email or WhatsApp.
2. `/mama-send` previews the batch: full text, every check, **READY** or **BLOCKED**.
3. The rep picks ("send 1, 2") and clicks **Approve**.
4. Sales Mama sends through Gmail or WhatsApp and logs every touch.

<sub>Replay of a real run on demo data with the fake transport. Still version: <a href="docs/assets/send-review.png">send-review.png</a>.</sub>

`send.py` refuses outside the send window, on holidays, to suppressed contacts, without WhatsApp opt-in, over quota, for the nightly runner, or if anything changed after the preview. Sending is **off** until the manager turns it on ([ADR-0007](docs/adr/0007-approve-then-send.md)).

## 🔎 Company check

**Know a company is real before you spend a minute selling to it.**

<p align="center">
  <img src="docs/assets/company-check-e2e.png" alt="Company check end to end: ask in the console, registry rules, three verifier subagents, verdict with every check; real run on Singapore Airlines" width="100%">
</p>

How it works, in one run (`/company-check 197200078R`):
1. **Ask** in chat or click the `/company-check` chip in the console, with a UEN or a name (ambiguous names show candidates).
2. **Registry**: a local copy of ACRA, BCA, GeBIZ and HDB open data (2,127,089 entities, 624,271 live, refreshed monthly) answers the registry rules in under a second.
3. **Verifiers**: three subagents search the web in parallel for identity, people and risk, and save cited evidence.
4. **Rules**: 18 deterministic checks, each pass, warn, fail or unknown with its reason, scored 0–100.
5. **Verdict**: a report in `company-check/reports/` and visual cards in the console. [Full result screenshot](docs/assets/screens/company-check-result.jpg)

| It checks | Rule |
|---|---|
| Live | ACRA status `Live Company` or `Live` only |
| Filing | Annual return in the last 13 months |
| Physical or virtual | Own address vs a shared registered address (20+ companies) or home-based |
| Size | More than 3 employees, from evidence only (ACRA has no headcount) |
| Outside signals | BCA contractor, GeBIZ supplier, website shows the UEN, recent activity |
| Red flags | Adverse media, MAS alert, shell-like profile, frequent name changes |

Verdicts: **Verified · Likely legitimate · Registry OK · Caution · Red flag · Not active**. `/company-check leads` turns the same data into a ranked list of new ICP leads, and CompanyData, RocketReach or Apollo can add headcount bands when connected. [How it works](company-check/README.md)

## 📊 Company insights

**Ask a question, get a report.** `/company-insights` turns the same registry data into generated stats, charts and tables, live in the console or as a shareable page.

<table>
<tr>
<td width="50%"><img src="docs/assets/insights-segment.jpg" alt="Insights for Singapore clinics: 9,618 live, filing on time, new companies per year, age bands, activities"><br><sub><b>"Clinics in Singapore"</b> · 9,618 live, 92.7% filing on time, growth by year, top activities, best leads.</sub></td>
<td width="50%"><img src="docs/assets/insights-company.jpg" alt="Company deep-dive for Singapore Airlines: verdict, every check, peers"><br><sub><b>"Tell me about Singapore Airlines"</b> · verdict, every check with its reason, peers, web evidence.</sub></td>
</tr>
</table>

Also: *"how clean is my book?"* and *"compare SIA, Singtel and DBS"*. Real ACRA data (14 Oct 2026); numbers come from scripts, never the model.

## 🖥️ The console

`npm run console` opens a local web console on the same repo. It only reads: every change still goes through a skill in chat, and every send through `/mama-send` (ADR-0006, ADR-0007).

- **Today.** Your next meeting with a countdown, today's ribbon, live send windows for SG · MY · IN, and only what needs you.
- **Chat with live agents.** Researchers, VAMs and writers work in parallel lanes; answers arrive as cards with numbered sources and follow-up chips. `/` for skills, `@` for accounts, `⌘K` for anything.
- **Calendar and appointments.** Day, week, month and (for managers) team views of meetings, follow-ups, renewals, claim lapses, events and holidays. Clashes are flagged; drag to ask for a move. Google Calendar adds busy times only: start and end, no titles (ADR-0010).
- **Generative reports.** Python scripts write JSON; the console draws it as A2UI views: KPI tiles, funnels, charts, tables and verdicts, opened in a side canvas or shared as a page (ADR-0009).
- **Light or dark**, desktop or phone.

<table>
<tr>
<td width="50%"><img src="docs/assets/screens/today.jpg" alt="Today: next meeting, today's ribbon, send windows and what needs you"><br><sub><b>Today.</b> Next up, the day's ribbon, send windows, what needs you.</sub></td>
<td width="50%"><img src="docs/assets/screens/chat-agents.jpg" alt="Chat: researcher and VAM agents working in parallel lanes"><br><sub><b>Agents in parallel.</b> "Run my day" researches, rescores and drafts at once.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/assets/screens/chat-draft.jpg" alt="Chat answer: day summary and a cited follow-up draft"><br><sub><b>Cited drafts.</b> Signal, pattern and checks on every draft; sources below.</sub></td>
<td width="50%"><img src="docs/assets/screens/brief.jpg" alt="Call brief for Harbourlight Foods"><br><sub><b>Walk in prepared.</b> A one-page brief before each call.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/assets/screens/calendar-week.jpg" alt="Week calendar with appointments, a clash, busy blocks and send windows"><br><sub><b>Week.</b> Appointments, a flagged clash, Google busy times, send windows.</sub></td>
<td width="50%"><img src="docs/assets/screens/calendar-team.jpg" alt="Team calendar for the manager with a clash highlighted"><br><sub><b>Team.</b> Every rep's load per day; double bookings in red.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/assets/screens/reports-canvas.jpg" alt="Reports list with a company insights report open in the canvas"><br><sub><b>Reports.</b> Weekly reviews, allocations, checks and insights in the canvas.</sub></td>
<td width="50%"><img src="docs/assets/screens/manager-cockpit.jpg" alt="Manager cockpit: funnel and an entity match to confirm"><br><sub><b>Manager cockpit.</b> Last night's run, the funnel, matches to confirm.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/assets/screens/command-palette.jpg" alt="Command palette searching accounts"><br><sub><b>⌘K.</b> Accounts, skills, reports and views, one keystroke away.</sub></td>
<td width="50%"><img src="docs/assets/screens/today-dark.jpg" alt="Today in dark mode"><br><sub><b>Dark mode.</b> Follows your system, or pick one.</sub></td>
</tr>
<tr>
<td width="50%"><img src="docs/assets/screens/send-preview.jpg" alt="Send preview: two drafts ready, one held"><br><sub><b>Send review.</b> Two ready for the SG window, one held. You say which.</sub></td>
<td width="50%" align="center"><img src="docs/assets/screens/mobile-today.jpg" width="44%" alt="Today on a phone">&nbsp;<img src="docs/assets/screens/mobile-calendar.jpg" width="44%" alt="Calendar day on a phone"><br><sub><b>On the go.</b> Today and the calendar on a phone.</sub></td>
</tr>
</table>

## 🚀 Quick start

```bash
git clone https://github.com/neam-lang/sales-mama.ai.git && cd sales-mama.ai
python3 -c "import yaml" 2>/dev/null || python3 -m pip install --user pyyaml \
  || python3 -m pip install --user --break-system-packages pyyaml   # Homebrew Python (PEP 668)
python3 scripts/selftest.py                 # 213/213 passed
claude                                      # then type: Set me up for Sales Mama
```

Connect channels, one command each:

```bash
python3 scripts/connect.py gmail --client-file <oauth-client.json>   # browser opens, click Allow
! python3 scripts/connect.py whatsapp                                 # you type the token
python3 scripts/connect.py status                                     # Sending: off · Gmail ok · WhatsApp ok
```

Tokens stay in `~/.config/sales-mama/`, never in the repo. Admin steps (Google OAuth client, Meta templates): [SETUP.md · Connect channels](SETUP.md#connect-channels-adr-0007).

**Add a rep:** give them repo access; they type *"Set me up for Sales Mama from https://github.com/neam-lang/sales-mama.ai"*.

**Nightly run:** on one always-on machine, *"Set up the Sales Mama nightly runner on this machine."*

<details>
<summary>Using Codex</summary>

Codex reads `AGENTS.md` and `.agents/skills/` (`$mama-day`). It has no hooks or ask rules, so it runs `session_start.py` / `sync.py` itself, and `/mama-send` stops at the preview for the rep to send.

</details>

## 🗓️ A day with Sales Mama

| Time (SGT) | Who | Command |
|---|---|---|
| 02:00 | Runner | `/mama-nightly` scan · score · VAMs · allocation proposal |
| 08:30 | Manager | `/mama-manager` approve leads, clear the review queue |
| 08:45 | Rep | `/mama-day` replies · research · drafts |
| 09:00–11:30 | Rep | `/mama-send` review and approve |
| Friday | Manager | `/mama-weekly` metrics, calibration, PR |

<details>
<summary>All commands</summary>

| Rep | | Manager | |
|---|---|---|---|
| `/mama-day` | whole morning | `/mama-manager` | cockpit |
| `/mama-book` | my accounts | `/mama-allocate` | split the pool |
| `/mama-research acme` | research | `/mama-scan` | scan signals |
| `/mama-recommend acme` | what to pitch | `/mama-vam <rep>` | refresh a book |
| `/mama-draft acme first` | email or WhatsApp | `/mama-nightly` | run tonight's job |
| `/mama-send` | review and send | `/mama-ingest` | import CRM |
| `/mama-replies` | handle replies | `/mama-weekly` | weekly review |
| `/mama-brief acme` | call prep | | |
| `/mama-handover acme` | log a meeting | | |

</details>

## 🛡️ Guardrails

| Rule | Enforced by |
|---|---|
| Nothing sent without the rep's approval | `send.py` preview + permission prompt ([ADR-0007](docs/adr/0007-approve-then-send.md)) |
| No lead assigned without the manager | `claim.py --assign` after approval |
| Every fact cites a source | `lint.py`, `eval.py` |
| No invented names in drafts | `draft_check.py` entity check |
| Suppression, send windows, WhatsApp opt-in | `draft_check.py`, `send.py` |
| Reps touch only their own book | `guard.py` hook |
| Web text is data, not instructions | Rule 15 in [AGENTS.md](AGENTS.md) |

[Security on one page](docs/SECURITY.md) · compliance notes in `knowledge/guardrails.md` are not legal advice; confirm with your DPO.

## 📊 Quality

```bash
python3 scripts/selftest.py   # 213/213
python3 scripts/eval.py       # 13 pass · 0 fail · 8 pending
python3 scripts/lint.py       # 0 errors
```

Every pilot mistake becomes a failing eval case before it is fixed.

## 🗺️ Roadmap

- **Now:** Singapore pilot · approve-then-send live after DPO sign-off · every rep on Gmail
- **Next:** Malaysia (WhatsApp, Bahasa Malaysia), then India (DPDP consent before May 2027)
- **Later:** score calibration from real meetings · LLM-judged draft quality · Codex in the console · CRM write-back

<details>
<summary>Build phases</summary>

| Phase | Status |
|---|---|
| 0–3 · Skeleton, knowledge, signals, scoring | ✅ |
| 4 · Outreach, replies, approve-then-send | 🟡 live mailbox + 40 labelled replies to go |
| 5 · Books + VAMs | 🟡 first VAM runs |
| 6 · Allocation + cockpit | ✅ |
| 7 · Nightly + weekly | 🟡 schedule + 5 nights |
| 8 · Codex parity + SG pilot | 🟡 in progress |
| 9 · Console | ✅ |
| 9b · Console v2: Today, chat, calendar, generative reports | ✅ |

</details>

## 📚 Docs

[GUIDE](GUIDE.md) · [PLAN](PLAN.md) · [SETUP](SETUP.md) · [AGENTS](AGENTS.md) · [UI](docs/UI.md) · [SECURITY](docs/SECURITY.md) · [ADRs](docs/adr/)

<p align="center"><sub>Built with <a href="https://claude.com/claude-code">Claude Code</a> · Apache 2.0 · Screens use fictional demo data</sub></p>
