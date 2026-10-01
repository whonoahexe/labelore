---
sketch: 015
name: uat-page
question: "How should a UAT page show where testing stands: the started/updated timestamps and status, the current test with real attention, a summary, every test's expected and result fields, and the gaps with their diagnosis?"
winner: "B"
tags: [documents, per-type-views, uat, testing, layout]
---

# Sketch 015: UAT page

## Design Question
A UAT.md is a live test session: frontmatter (status, started, updated, source), a Current Test
that is overwritten on each step, numbered tests (expected + result, plus reported/severity for
issues, blocked_by/reason for blocked, reason for skipped), a Summary of counts, and Gaps (truth,
status, reason, severity, test, then root_cause/artifacts/missing/debug_session after diagnosis).
Where should the summary go, and how should tests and gaps read?

## How to View
http://cinedise:4174/015-uat-page/

Toolbar **Doc**: synthetic (testing) is the only in-progress doc. Every real UAT in the corpus is
finished, so this one is built from the template with sp v1.0/03 wording. It has an issue + major
diagnosed gap, an issue + minor undiagnosed gap, a blocked test, a skipped test, and 3 pending
with test 5 awaiting. Real docs: sp v1.0/03 (6 passes and 6 resolved gaps with root cause,
artifacts, fix, resolved_by), sp P3 (a reverified gap and prior_* fields), sp P1 (a skip with a
long reason, extra fields such as observed/evidence, a Notes section), sp P2 (off-template:
status passed, a "Resolution" section, prose gaps), and labelore 01 (23 tests).

## Shared across variants
- Cover: eyebrow "User acceptance test · Phase N", title from the phase slug, then a meta row with
  the Status chip (testing → active, partial/diagnosed → in-flight, complete/passed → complete),
  Started and Updated (with the gap between them), and on the right the copy-path icon and
  View/Source. Below that sits a quiet "Tested from" line.
- Current test: while testing, an attention card with the big number, "Now testing · Test 5 of 7",
  the name, the expected text, an "Awaiting user response" footer with a pulse, and a jump to the
  row. When testing is done it becomes a quiet line: "✓ Testing complete · 6 of 6 passed".
- Result tones: pass → complete, issue → missing, blocked → in-flight, skipped → quiet, pending →
  quiet dashed, the current test → active. Severity: blocker → missing, major → in-flight,
  minor/cosmetic → quiet.
- A test's result fields show only when present: Reported (quoted), Severity, Blocked by, Reason.
  Any other fields fold under "More · observed, evidence…".
- Gaps: truth as the title, status + severity chips, a link to the test, the reported reason, then
  diagnosis (root cause, artifacts with their issue, missing as a checklist, debug session) or a
  "Not diagnosed yet" placeholder. A gap with resolved_by/fix/reverify gets a Resolved strip.
- Extra sections (Notes, Deferred Follow-Ups) are folded. The "In the source only" strip lists the
  Summary block, frontmatter and template comments. If the doc's Summary disagrees with the tests,
  a ⚑ line says so.

## Variants
- **A: Summary bar · rows · gap cards.** The summary is a result bar in the cover. Tests are
  numbered rows with chips; click one to expand expected and result. Gaps are cards.
- **B: Square strip · pairs · gap register.** The summary is its own section: one numbered square
  per test (the current one ringed; click to jump) next to the bar. Tests are always-open
  Expected | Result pairs. Gaps are a register table; click a row for its diagnosis.
- **C: Side rail · grouped · gaps under tests.** A sticky rail beside the tests holds the counts,
  squares and gap tally. Tests are grouped Needs attention → Pending → Skipped → Passed (folded).
  Each test shows its gap underneath, and Gaps holds the full cards.

## What to Look For
- Synthetic: does the current-test card get attention without drowning the issue and blocked tests?
- Where does the summary feel right: in the cover (A), its own strip (B), or a rail (C)?
- sp v1.0/03 and sp P3: do resolved gaps read as finished history rather than open alarms?
- labelore 01 (23 passes): which variant keeps a long all-pass run quiet?

## Winner
**B: Square strip · pairs · gap register.** Build it:
- **Cover:** Status chip · Started · Updated (with the gap between them) · copy-path icon · View/Source, then the quiet "Tested from" line.
- **Current test:** the attention card while awaiting (number, Now testing · Test N of M, name, expected, pulsing Awaiting footer, jump to row). Once done, a quiet "Testing complete · X of Y passed" line.
- **01 Summary:** one numbered square per test in its result tone (the current test ringed, click to jump) beside the result bar and key. Add a ⚑ line when the doc's Summary block disagrees with the tests.
- **02 Tests:** always-open pairs. The left column has the number, name and expected (long text clamped with "more"). The right column has the result chips, then Reported (quoted) · Severity · Blocked by · Reason, each only when present, with any other fields under "More".
- **03 Gaps:** a register (ID · truth · severity · status · test · diagnosis). Click a row to open the reported reason, the diagnosis (root cause, artifacts + issue, missing checklist, debug session) or "Not diagnosed yet", and a Resolved strip for resolved_by/fix/reverify. Prose gaps fall back to cards.
- Extra sections (Notes, Deferred Follow-Ups) are folded at the end, followed by the "In the source only" strip (Summary block, frontmatter, template comments).
