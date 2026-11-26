## Why
`draft_check.suppression_hit()` reads `wiki/suppression.csv` through `mama_common.read_csv()`, which
returns `[]` when the file is missing and also swallows every read error (`scripts/mama_common.py:212-223`).
Measured on a copy (2026-11-24): with the file missing, unreadable, or with a header without `value`, a
contact listed for opt-out is reported as "not suppressed" and the draft check passes. A broken
suppression list therefore silently disables AGENTS.md rule 2. This is the "never a silent empty result"
case: OUT-002.S4 requires an explicit refusal.

## What Changes
- **MODIFIED** OUT-002: add scenario OUT-002.S4 (list unavailable -> refuse with
  `suppression_state_unavailable`) and name the reason codes `suppressed_email`, `suppressed_domain`.
- `scripts/draft_check.py`: a strict reader of the suppression list (missing file, read error or missing
  `value` column -> unavailable), used by the draft check and therefore by `send.py --preview`.
- An empty list with a valid header stays valid (a new team has no opt-outs yet).
- `scripts/selftest.py`: failing-first cases for S3 (subdomain / look-alike) and S4 (missing, corrupt, wrong header).
- `scripts/eval.py`: suppression checks report "not exercised" when no drafted or sent touch exists.

## Impact
- Affected: `scripts/draft_check.py`, `scripts/send.py` (through draft_check), `scripts/selftest.py`,
  `scripts/eval.py`, `.agents/skills/mama-draft/SKILL.md` and `mama-send/SKILL.md` (cite OUT-002 and the new reason).
- Bootstrap: `mama-setup` must create `wiki/suppression.csv` with its header (it already ships in templates/demo).
- Out of scope: the benchmark grader (tracked separately, see openspec/trace/OUT-002.md), WhatsApp consent (OUT-004, later).
- Per CLAUDE.md, the scripts/ part is implemented only after plan-mode review.
