<!-- made-up example · derived from agents/gsd-eval-auditor.md · gsd-core 1.19.0 -->
# EVAL-REVIEW — Phase 4: Bulk Loan Export

**Audit Date:** 2026-04-14
**AI-SPEC Present:** Yes
**Overall Score:** 64/100
**Verdict:** NEEDS WORK

## Dimension Coverage

| Dimension | Status | Measurement | Finding |
|-----------|--------|-------------|---------|
| Totals match | COVERED | Code | `server/src/export/note/totals.test.ts` compares every figure in the drafted note with the saved batch totals across five saved months, including a month with zero loans. Runs in the unit suite. |
| No member names | COVERED | Code | The same suite scans each draft for every handle and display name in the batch fixture; a planted handle fails the test, which was confirmed by running it. |
| Draft shown before fetch | COVERED | Code | The export route refuses the archive fetch while the note's `reviewed_at` is empty; two route tests cover the refusal and the pass. |
| Neutral tone | PARTIAL | LLM Judge | A judge prompt with the 1-5 rubric exists and was run by hand once on three drafts. It is not wired into any command, the pass mark of 4 is not enforced, and no run has been saved. |
| Usable as sent | MISSING | Human | AI-SPEC asks the steward lead to label each draft pass or fail. No labelling sheet, no labels and no place to record them were found. |

**Coverage Score:** 3/5 (60%)

## Infrastructure Audit

| Component | Status | Finding |
|-----------|--------|---------|
| Eval tooling (Vitest) | Installed | Listed in `package.json` and called by the totals and names suites. The judge prompt is not called by it. |
| Reference dataset | Partial | Five saved months found, against twelve in AI-SPEC. The zero-loan month is there; the re-issued-tool months and the 500-loan months are not. No labels. |
| CI/CD integration | Present | `npm test -- server/src/export/note` runs in the pull-request workflow. |
| Online guardrails | Implemented | The request path strips handles before the totals reach the model and blocks the fetch until the note is reviewed. |
| Tracing | Not found | No tracing tool is configured; draft calls are not recorded anywhere. |

**Infrastructure Score:** 70/100

## Critical Gaps

None. The one MISSING dimension, Usable as sent, is rated High in AI-SPEC, not Critical, and both Critical dimensions (Totals match, No member names) are COVERED.

## Remediation Plan

### Must fix before production:
1. **Usable as sent:** add a labelling sheet (one row per saved month, pass or fail, one line of reason) and have the steward lead fill it for every month in the dataset. Record the pass rate beside the totals suite output.
2. **Reference dataset:** grow the five saved months to the twelve AI-SPEC names by adding the three re-issued-tool months and the three months over 500 loans; keep the labels in the same file as the totals.

### Should fix soon:
1. **Neutral tone:** move the judge prompt into the suite, run it over the whole dataset, and fail the run when any draft scores under 4.
2. **Neutral tone:** save each judge run's scores so a later change to the draft prompt can be compared with the last run.
3. Pin the judge model name in the config so a silent model change does not move the scores.

### Nice to have:
1. Configure a tracing tool around the draft call and keep the last 50 drafts with their totals.
2. Add a fifth guardrail test for a note over 600 characters; the field currently accepts any length.

## Files Found

- `server/src/export/note/totals.test.ts`
- `server/src/export/note/names.test.ts`
- `server/src/export/note/judge-prompt.md`
- `server/src/export/note/fixtures/months/` (five saved months, `2026-01.json` through `2026-05.json`)
- `server/src/routes/export-jobs.test.ts`
- `.github/workflows/pull-request.yml`
