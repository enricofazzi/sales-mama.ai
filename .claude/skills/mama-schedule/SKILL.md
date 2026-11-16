---
name: mama-schedule
description: 'Book, move, confirm or cancel appointments (meetings, calls, demos, site visits) for accounts you own, and answer "what''s on this week". Use for "book Kestrel Tue 2pm", "move it to Thursday", "cancel the Nimbus demo", "what''s on today/this week", or after a meeting request is accepted.'
---
# mama-schedule

## When to use
- "Book a call with <company> <day> <time>", "move it to Thursday 3pm", "confirm the Nimbus demo", "cancel tomorrow's meeting".
- "What's on today / this week?", "am I free Thursday afternoon?".
- From **mama-replies** (a meeting request) and **mama-handover** (the next meeting the rep agreed).

## Before you start
- Who: the account's `owner`, or the manager (rules 6, 16). A rep sees and books only their own accounts.
- Scripts: `appointments.py` and `build_books.py` (calendar Phase 3). If missing, say which phase adds them and stop.
- Re-read the account page and the contact page now (rule 17). The contact must be on the account page (rule 5) and not suppressed (rule 2); the script refuses otherwise.
- Times are the **account's market time** (`knowledge/markets.yaml` tz: SG/MY UTC+8, IN UTC+5:30). If the rep gives a time in another zone, convert it and say both.

## Steps
1. Work out account, contact, day, time, length (default 45 min) and kind (meeting | call | demo | site_visit). Ask only for what is missing; resolve "Tuesday" to a date in the market's week and read it back ("Tue 18 Nov 14:00 SGT").
2. Check first, write nothing: `python3 scripts/appointments.py add --account <id> --contact <contact-id> --start "<YYYY-MM-DD HH:MM>" --minutes <n> --kind <kind> --title "<short purpose>" --status <tentative|confirmed> --dry-run --json`. Read any `warnings` back (holiday, weekend, outside 08:00–19:00, overlap, past date).
3. On the rep's "yes", run the same command without `--dry-run`. A confirmed booking appends the `meeting_booked` touch and the `appointment` log line itself; never write either by hand.
4. Changes: `appointments.py confirm|cancel <apt-id>` (cancel takes `--reason`) or `reschedule <apt-id> --start "<YYYY-MM-DD HH:MM>" [--minutes n]`, each with `--dry-run` first when warnings are possible. Outcomes (`held`, `no-show`) belong to **mama-handover**.
5. "What's on": `python3 scripts/appointments.py list [--from <date>] [--to <date>] --json` (the manager may add `--rep <id>|all`). After any write, refresh the calendar data: `python3 scripts/build_books.py --rep <me>`; `wiki/books/<me>.calendar.json` also holds follow-ups due, renewals, claim lapses, events and holidays for the same window.
6. Offer the obvious next step: **mama-brief** for an appointment in the next 24 hours; a confirmation note through **mama-draft** (never sent from here; the rep approves sending in **mama-send**).

## Never
- Book, move or cancel without the rep's explicit yes for that change.
- Book for an account you don't own unless you are the manager (rules 6, 16), or with a contact who isn't on the account page (rule 5) or is suppressed (rule 2).
- Send invites or messages from here, or touch a calendar connector to create events: that is outward contact and goes through drafts and **mama-send** (ADR-0007). Google Calendar is read-only busy blocks only, later (Phase 6).
- Change `stage` or `owner`; edit `log/appointments.csv` or `log/touches.csv` by hand.

## Finish
- Summary, 1–3 lines: "Booked Kestrel Physio · Tue 18 Nov 14:00–14:45 SGT · discovery call with Mei Lim (confirmed). No clashes. Brief tomorrow morning?"
- Log: written by `appointments.py` (`appointment | <me> | accounts/<id> | booked … (confirmed) apt-…`).
- Only when the session contains `MAMA_CARDS=on` (`a2ui` surfaces, docs/UI.md §2): one surface bound to `wiki/books/<me>.calendar.json` listing the window's items. Bind every number and date with `{"path": …}`; the rich calendar components arrive in Phase 4.
```a2ui
{"surfaceId":"schedule_week","title":"This week","agent":"mama","dataRef":"wiki/books/mei.calendar.json","components":[{"id":"root","component":"Column","children":["next","items","go"]},{"id":"next","component":"Callout","tone":"neutral","text":"Kestrel Physio is next: Tue 14:00 SGT. No clashes this week."},{"id":"items","component":"DataTable","rows":{"path":"/items"},"columns":[{"key":"start","label":"When"},{"key":"title","label":"What"},{"key":"kind","label":"Kind","format":"status"},{"key":"status","label":"Status","format":"status"}],"empty":"Nothing scheduled."},{"id":"go","component":"ActionBar","actions":[{"label":"Brief me on the next one","prompt":"/mama-brief kestrel-physio"}]}]}
```
