# ADR-0010: Appointments live in the Sales Mama log

- **Status:** accepted (2026-11-16). Extends ADR-0002 (git as the database) and ADR-0009 (scripts emit data).
- **Context:** Reps live by their calendar, but nothing recorded *when* a meeting happens. A `meeting_booked` touch carries only the time it was logged. The console's calendar (Today countdown, Week, Month, Team; docs/Frontend_Design_Spec.md §6) needs a dated, shared, auditable source. The manager chose Sales Mama's own log over Google Calendar as the source of truth, so it works for every rep without connectors.
- **Decision:**
  1. **`log/appointments.csv`, append-only and event-sourced.** Every change (book, confirm, reschedule, cancel, held, no-show) appends a row, and the latest row per `id` is the current state. History is kept, and `merge=union` in `.gitattributes` lets two reps book at once without conflicts.
  2. **One writer: `scripts/appointments.py`.** It is used by the owner or the manager (rules 6, 16), and only through rep skills (mama-schedule, mama-replies, mama-handover). VAMs, the runner and the console never write appointments. The console turns drags and clicks into prompts (ADR-0006).
  3. **Checks:**
     - It refuses another rep's account, an inactive account, a contact not on the account page (rule 5), and a suppressed contact or domain (rule 2).
     - It warns about holidays, weekends, times outside 08:00–19:00, overlaps and past dates.
  4. **Market time.** Times are read in the account's market zone and stored as ISO with that offset. SG, MY and IN have no daylight saving, so the offsets are fixed: +08:00, +08:00 and +05:30.
  5. **No side effects on the pipeline.**
     - Appointments never change `stage` or `owner`.
     - A confirmed booking appends the existing `meeting_booked` touch, so meeting counts and evals stay consistent.
     - `held` adds no touch, because `crm_update.py` writes `meeting_held` in mama-handover.
  6. **Calendar data.** `build_books.py` writes `wiki/books/<rep>.calendar.json` and `team.calendar.json`. They are gitignored and rebuilt every session, and cover today −14 to +60 days. They hold:
     - appointments
     - follow-ups due
     - renewal dates and windows
     - claim lapses
     - trade events
     - holidays
     - each market's send windows
- **Consequences:**
  - The calendar is the same data in chat (A2UI surfaces), the console views and plain Claude Code.
  - `lint.py` warns about malformed appointment rows. `eval.py` checks that every live appointment is owned, valid and not suppressed.
  - Google Calendar (Phase 6) will add read-only **busy blocks only**: start and end, never titles or attendees of personal events (rule 8). Invites to prospects are outward contact and go through drafts and approval (ADR-0007).

## Addendum (2026-11-16): Google Calendar busy blocks (Phase 6)
- **Read-only, busy only.** A rep runs "sync my calendar" in **mama-schedule**. The agent reads their primary calendar through the claude.ai Google Calendar connector's read tools, preferring free/busy. `scripts/busy_import.py --approved` then keeps **only start and end** of each busy period. Titles, attendees, descriptions and locations are dropped before anything is written, and the result lists the dropped field names. Declined, free (transparent) and all-day events are skipped, and overlaps are merged.
- **Add-only files.** Each import is a new `raw/calendar/<rep>/<YYYY-MM-DD-HHMM>.json`, and the newest one per rep wins. Retention is 90 days (`knowledge/guardrails.md`).
- **Enforced.** `lint.py` raises an **error** for any calendar file holding more than the busy schema (rule 8).
- **Used, never written back.**
  - `build_books.py` shows the blocks as anonymous "Busy" items in the rep's and the team calendar.
  - `appointments.py` warns when a booking overlaps one.
  - Nothing ever creates, changes or deletes a Google Calendar event: invites to prospects are outward contact and go through drafts and approval (ADR-0007).
