## 1. Tests first (must fail on the current code)
- [x] 1.1 selftest: draft to a listed email when `wiki/suppression.csv` is missing -> suppression FAIL, reason `suppression_state_unavailable`
- [x] 1.2 selftest: same with an undecodable file and with a header without `value`
- [x] 1.3 selftest: `x@sales.acme.example` refused and `y@notacme.example` allowed by a domain row `acme.example` (OUT-002.S3; passes today, locks the behaviour)
- [x] 1.4 selftest: `send.py --preview` refuses when the list becomes unavailable after the draft (OUT-002.S2/S4)

## 2. Implementation
- [x] 2.1 `draft_check.py`: strict suppression reader returning rows or "unavailable"; `suppression_hit()` returns a typed decision
- [x] 2.2 the draft check reports `suppressed_email` / `suppressed_domain` / `suppression_state_unavailable`
- [ ] 2.3 `eval.py`: `not exercised` when there is no drafted or sent touch (deferred: it changes what PENDING means in CI)

## 3. Docs and trace
- [x] 3.1 `mama-draft` and `mama-send` skills cite OUT-002 and the new reason; run `scripts/sync_skills.py`
- [x] 3.2 update `openspec/trace/OUT-002.md` statuses
- [ ] 3.3 `python scripts/selftest.py` and `python scripts/eval.py` green on Windows and Linux (Windows only so far: 223/225, the 2 failures are the unrelated allocate glob bug; Linux not run)

## Result (2026-11-25)
- Before: 214/225, the 9 new OUT-002 cases FAIL (send S4, claim S3, draft_check S4 x3, claim S4, appointments S4, eval S4, lint S4); the 2 pre-existing allocate failures (Python 3.12 glob, see HARNESS_SALES_MAMA.md) are unrelated.
- After: 223/225, every OUT-002 case PASS, no regression; only the 2 allocate failures remain.
- Mutation check: removing the subdomain clause makes the S3 matcher return no match.
- Not done: `openspec validate` (Node.js not installed on this machine).

## Upstream (2026-11-26)
- Implemented and reviewed (4 Codex gates) as neam-lang/sales-mama.ai#3; allocate fix #2; benchmark #4.
- Test labels upstream use `suppression: …` (no spec IDs, since upstream does not use OpenSpec).
