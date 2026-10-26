---
phase: 06-trustworthy-tests-and-security-baseline
fixed_at: 2026-10-26T07:55:00Z
review_path: .planning/phases/06-trustworthy-tests-and-security-baseline/06-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 6: Code Review Fix Report

**Fixed at:** 2026-10-26
**Source review:** .planning/phases/06-trustworthy-tests-and-security-baseline/06-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (this run was limited to CR-01 and WR-01)
- Fixed: 2
- Skipped: 0

All other findings (WR-02 to WR-06, IN-01 to IN-03) are out of scope for this run and were left untouched.

## Fixed Issues

### CR-01: A shadowed (duplicate-key) secret in a valid config.json is shown unmasked

**Files modified:** `src/planning-repo/handlers/json-config.ts`, `test/handlers.test.ts`, `test/config-masking.test.ts`
**Commit:** 8acb139
**Applied fix:** The handler now always runs the raw-text redactor over a config.json body, whether or not the file parses. When the file parses and the parsed object needed masking, the body is still replaced by the re-formatted masked object, as before. Tests added first and confirmed failing: a duplicate-key config at the handler level and end to end (presentation, file page, search). Masking stays in memory; the on-disk file is untouched.

### WR-01: `redactSecretText` can be evaded on the unparseable-config path

**Files modified:** `src/planning-repo/secret-mask.ts`, `test/secret-mask.test.ts`, `test/handlers.test.ts`
**Commit:** 79934b2
**Applied fix:** The redactor now matches any quoted key in either quote style, decodes it (JSON escapes, plus `\'` inside single quotes) and compares the decoded name with the secret key names; values may likewise be double- or single-quoted. The match is still linear (unambiguous quoted-body alternation) and still masks a value cut off before its closing quote. Tests added first and confirmed failing: an escaped key, single-quoted text, mixed quote styles, an apostrophe inside a double-quoted value, and a shadowed secret with an escaped key spelling (handler level).
Status: fixed. Note this is a regex-matching change, so a human glance at the quoting edge cases is worthwhile: text that mixes quote styles in an already-broken file is matched on a best-effort basis (the alternative the review offered, failing closed on any secret key name, was not taken).

## Verification

Gates ran in the main checkout (no worktree). `vitest run test/secret-mask.test.ts test/config-masking.test.ts test/handlers.test.ts` passes (74 tests) and `npm run typecheck` passes. The full `npx vitest run` shows 1 failure out of 3595: `test/web/security-console-corpus.test.ts` reports `unpinned: LB:phases/06-trustworthy-tests-and-security-baseline/06-SECURITY.md`. That file is a planning artifact added by an earlier docs commit and has no pin in the corpus test; it is unrelated to these fixes and was left alone.

---

_Fixed: 2026-10-26_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
