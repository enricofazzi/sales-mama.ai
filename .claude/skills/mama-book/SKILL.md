---
name: mama-book
description: 'Show the current rep''s book of accounts: due actions, hot and at-risk accounts, tiers, stages, targets and VAM highlights. Use for "show my book", "how''s my pipeline".'
---
# mama-book

## When to use
- A rep asks "show my book", "how's my pipeline", "what's due", or `/mama-book`.
- Read-only: it changes no account pages. The manager's team view is mama-manager.

## Before you start
- Who: a rep, or the manager looking at their own book. The manager may name a rep ("show Mei's book").
- Scripts: `find.py` (Phase 0), `build_books.py` (Phase 5).
- If a required script is missing, say which phase adds it and stop.
- Before you quote any account in detail, re-read its page (rule 17).

## Steps
1. Identify the rep: `git config user.email` → `reps/<id>.md`. If the user is a rep, the book is theirs; never show another rep's book to a rep (rule 16).
2. Rebuild: `python3 scripts/build_books.py --rep <id>`.
3. Read `wiki/books/<id>.md` (the same numbers are data in `wiki/books/<id>.json`). Present, in this order and briefly:
   - Active accounts vs capacity (`max_active`); tier mix A/B/C; counts by stage.
   - Meetings this month vs `targets.meetings_per_month`; replies vs sent in the last 7 days.
   - Today: due and overdue actions (tier, then due date), with `nba` and `nba_reason`.
   - Hot accounts (score jump or new tier A), at-risk accounts with their `risk` flags, and VAM pre-drafts waiting.
   - The VAM 5-line summary: the `## <rep>` block in the latest `log/briefs/<date>-books.md` (written by mama-vam), if there is one. Show only this rep's block.
4. Link every account as `[[accounts/<id>]]`. Show money in the account market's currency.
5. For the top 3 items, open each page (rule 17) and offer one concrete next action, e.g. "Draft fu1 to Harbourlight Foods (cites GeBIZ award, 28 Oct)" or "Brief me on Kopi Co before Thursday's call".
6. If the user asks a narrower question ("which F&B accounts are hot?"), filter with `python3 scripts/find.py --owner me --industry fnb --hot` and answer from those pages only.

## Never
- Mix another rep's accounts into a rep's answer (rule 16).
- State a fact that isn't on the account page with a `raw/` source; say "unknown" instead (rule 3).
- Edit pages or change stages here; hand off to the right skill.

## Finish
- Summary, 1–3 lines: "42/60 active · A 6 · B 15 · C 21 · meetings 3/8 this month. Due today 5, hot 2, at risk 3. Next: draft fu1 to Harbourlight Foods?"
- Log: none. This is a read-only view, the book file is generated and gitignored, and no log op covers views. If the user then acts (a draft, a brief), that skill logs its own line.
- Only when the session contains `MAMA_CARDS=on`: one `a2ui` surface (docs/UI.md §2) with `"dataRef": "wiki/books/<id>.json"`: `Gauge`s for active of capacity (`/active`, `/capacity`, `"invert": true`) and meetings of target (`/meetings`, `/target`), a `DonutChart` of `/tiers`, a `Funnel` of `/stages`, `DataTable`s of `/due` (account, tier, due, nba) and `/at_risk` (account, flags), and an `ActionBar` with the top next action. Bind every number with `{"path": …}`.
```a2ui
{"surfaceId":"book_mei","title":"Mei's book","dataRef":"wiki/books/mei.json","components":[{"id":"root","component":"Column","children":["cap","mtg","tiers","due","go"]},{"id":"cap","component":"Gauge","label":"Active accounts","value":{"path":"/active"},"max":{"path":"/capacity"},"invert":true},{"id":"mtg","component":"Gauge","label":"Meetings this month","value":{"path":"/meetings"},"max":{"path":"/target"}},{"id":"tiers","component":"DonutChart","data":{"path":"/tiers"},"center":"active"},{"id":"due","component":"DataTable","rows":{"path":"/due"},"columns":[{"key":"name","label":"Account","format":"account"},{"key":"tier","label":"Tier","format":"tier"},{"key":"due","label":"Due"},{"key":"nba","label":"Next"}]},{"id":"go","component":"ActionBar","actions":[{"label":"Draft fu1 to Harbourlight","prompt":"/mama-draft harbourlight-foods fu1"}]}]}
```
