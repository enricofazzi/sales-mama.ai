# outreach Specification

## Purpose
How Sales Mama decides whether a contact may receive a draft or a message. This spec is the single
source of truth for outreach behaviour. `AGENTS.md` keeps the short operational rule and links here;
skills cite requirement IDs; selftests, evals and benchmark tasks reference scenario IDs
(traceability: `openspec/trace/OUT-002.md`). Rationale lives in `docs/adr/`.

## Requirements

### Requirement: OUT-002 Suppressed contacts and domains get no outreach
The system SHALL NOT create a draft for, or send any message to, a contact whose email address, email
domain or account domain is listed in `wiki/suppression.csv`. The check SHALL run when a draft is created and
again immediately before sending, and SHALL refuse with a structured reason when the list cannot be read.
(AGENTS.md rule 2.)

#### Scenario: OUT-002.S1 Email and domain suppression at draft time
- **GIVEN** contact A suppressed by email, contact B whose domain is suppressed, and contact C not suppressed
- **WHEN** the rep asks for one first email to each of A, B and C
- **THEN** a draft is created for C only
- **AND** the rep gets a skip reason `suppressed_email` for A and `suppressed_domain` for B
- **AND** matching ignores case and surrounding whitespace

#### Scenario: OUT-002.S2 Opt-out arrives after the draft and before the send
- **GIVEN** a draft to contact D that passed every check when it was created
- **WHEN** D's address is added to `wiki/suppression.csv` and the rep then previews and approves the batch
- **THEN** the send preview refuses D with reason `suppressed_email`
- **AND** nothing is sent to D

#### Scenario: OUT-002.S3 Subdomain blocked, look-alike allowed
- **GIVEN** a `domain` row for `acme.example`
- **WHEN** drafts are requested for `x@sales.acme.example` and `y@notacme.example`
- **THEN** the first is refused with `suppressed_domain` and the second is allowed

#### Scenario: OUT-002.S4 Suppression list unavailable
- **GIVEN** `wiki/suppression.csv` is missing, unreadable, or lacks the `value` column
- **WHEN** any draft or send is requested
- **THEN** it is refused with reason `suppression_state_unavailable`
- **AND** the rep is told which file to fix
- **AND** no draft is created and nothing is sent

### Requirement: OUT-003 Opt-outs are recorded at once and idempotently
The system SHALL record an unsubscribe reply in `wiki/suppression.csv` during the same session in which
the reply is processed, set the contact to `do_not_contact`, and SHALL NOT add a duplicate row when the
same opt-out is processed again. Any rep may suppress any contact; ownership never blocks an opt-out.

#### Scenario: OUT-003.S1 Unsubscribe reply
- **WHEN** a reply classified `unsubscribe` is processed for contact E
- **THEN** one row for E's email is appended to `wiki/suppression.csv`
- **AND** E's contact page has `status: do_not_contact`

#### Scenario: OUT-003.S2 Same opt-out twice
- **WHEN** the same unsubscribe is processed a second time
- **THEN** `wiki/suppression.csv` still has exactly one row for E
