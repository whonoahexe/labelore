---
phase: 10-codebase-map-specification-and-check-pages
fixed_at: 2026-11-06T13:15:00Z
review_path: .planning/phases/10-codebase-map-specification-and-check-pages/10-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 10: Code Review Fix Report

**Fixed at:** 2026-11-06
**Source review:** .planning/phases/10-codebase-map-specification-and-check-pages/10-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (CR-01, CR-02, WR-01 to WR-05; Info findings out of scope)
- Fixed: 7
- Skipped: 0

Verification ran in the main checkout (`use_worktrees` not used, per the task). `npm test`: 6289 passed, 2 failed. The 2 failures are in `test/web/ui-review-corpus.test.ts` and are pre-existing, not caused by these fixes: the corpus test finds `10-UI-REVIEW.md` (added by commit 80d3d48) and it is not in the test's `PINNED` map. They failed before the first fix (6242/6244). `npm run typecheck`, `npx eslint src test` and `npm run build` are clean. The dense golden did not change. Playwright e2e was not run; the service was not restarted.

## Fixed Issues

### CR-01: USER-SETUP `- NAME: value` field lines stored unmasked

**Files modified:** `src/planning-repo/handlers/user-setup-body.ts`, `test/helpers/written-value-forms.ts`, `test/user-setup-handler.test.ts`, `test/web/user-setup-page.test.ts`
**Commit:** 453e16f
**Applied fix:** `readFieldLine` masks the key and text as one string when the key is an upper-snake variable name (`isVariableKey`; `URL` stays a label), so `maskValues` sees the name and value together. A key that labels a secret (`Value`, `Password`, `Token`, ...) keeps only the quiet mark. Planted-value tests cover every written form through the handler, composer and page markup (text and attributes). With the fix stashed, 6 of the new tests fail.
**Status note:** logic fix, requires human verification of the mask choices (see WR-01).

### CR-02: `withholdInText` used for every Integrations line leaves values in several forms

**Files modified:** `src/planning-repo/handlers/withhold-values.ts`, `src/planning-repo/handlers/codebase-lift.ts`, `test/helpers/written-value-forms.ts`, `test/withhold-values.test.ts`, `test/codebase-lift.test.ts`, `test/web/codebase-page.test.ts`
**Commit:** 34f7426
**Applied fix:** `cleanText` now runs `maskValues(withholdInText(text).text)`, and bold group/environment labels (`**NAME=value**` is read as a label) pass through it too. `withholdInText` reads a quoted value, including a backslash-escaped one, whole. `maskValues` gained the forms the review lists: names closed by `**` or quotes (`**NAME** = v`, `"NAME": "v"`), a colon after a label, values of several words after `NAME: `, text stuck to a closing quote (`"abc"def`), backslash-escaped quotes, and trailing `*`, `]` and quotes kept outside the value. The shared list `test/helpers/written-value-forms.ts` (21 forms) is asserted against the mask, the Integrations record, the composed model and the rendered markup. This commit also contains the mask-engine half of WR-01.
**Status note:** logic fix, requires human verification.

### WR-01: mask leaves values in table cells, multi-word values and bracketed values

**Files modified:** `src/planning-repo/handlers/withhold-values.ts` (in 34f7426), `src/planning-repo/handlers/user-setup-body.ts` (in 453e16f)
**Commits:** 34f7426, 453e16f
**Applied fix:**
- Table rows: `maskValues` masks every non-empty cell after the first cell that is only an upper-snake name (`| STRIPE_KEY | v |`, ticked names, three cells). The User setup sections also mask every cell under a `Value`, `Secret` or similar column header, and section lines labelled as a secret (`- Value: ...`).
- Multi-word values: after `NAME: ` the value runs to the end of the clause (comma, semicolon, closing bracket, full stop before a space, line end). `NAME:value` and `NAME = value` keep the one-token reading the existing tests pin.
- Bracketed values: `[...]` and `<...>` are kept as placeholders only when they read as a description (a few lower-case words, or an upper-snake token like `<YOUR_KEY>`). `<hunter2>`, `[sk-live-1]` and `<Hunter>` are masked. The same predicate now backs `withholdValue`'s `hadValue`.
**Known limits (not fixed):** a lower-case hyphenated value with no digits in brackets (`<sk-live-abc>`) still reads as a placeholder, and in a table row every cell after the name cell is masked, including a legitimate Source or Add-to cell in the plain fallback layout.
**Status note:** logic fix, requires human verification.

### WR-02: `readSeverity` reads ordinary words as severity

**Files modified:** `src/planning-repo/handlers/reviews-body.ts`, `test/reviews-handler.test.ts`
**Commit:** b840fa2
**Applied fix:** `readSeverity` takes a mode (`separated`, `marked`, `any`). A Concerns list item needs a separator, marks around the word, or capitals, so "High availability is not handled", "Low test coverage ..." and "Medium-sized ..." stay whole with no severity. A bare risk word on a Risk Assessment line is still read.
**Status note:** logic fix, requires human verification.

### WR-03: SPEC nested numbered list becomes extra requirements

**Files modified:** `src/planning-repo/handlers/spec-body.ts`, `test/spec-handler.test.ts`
**Commit:** 9059134
**Applied fix:** a numbered line indented deeper than the first requirement head is read as continuation text of that requirement, not a new head.
**Status note:** logic fix, requires human verification.

### WR-04: overlap clips marks past a few concerns and drops absent lanes past three

**Files modified:** `src/web/views/reviews-overlap.ts`, `src/web/views/reviews-page-components.tsx`, `test/web/reviews-page.test.ts`
**Commit:** bda9728
**Applied fix:** `layoutOverlap` works out how many rows fit between the box edges for each region. Squares that do not fit become a `+N` count (`overflow`), and the list still holds every concern. Lanes past three get a "+N more did not run" label (`absentMore`). No new CSS classes were added.
**Status note:** logic fix, requires human verification (a browser look at a crowded region is advisable; e2e not run).

### WR-05: `stripControlCharacters` leaves invisible characters

**Files modified:** `src/planning-repo/handlers/withhold-values.ts`, `test/withhold-values.test.ts`
**Commit:** bab6fa5
**Applied fix:** invisible format characters are dropped: zero-width space/joiners (U+200B to U+200F), U+2060 to U+2064, U+FEFF, the soft hyphen, the Arabic format marks and the tag block U+E0000 to U+E007F. This is written as explicit ranges rather than `\p{Cf}`, so the file's "no regular expression runs over document text" claim still holds. Test inputs use escapes.

## Skipped Issues

None. Info findings IN-01 to IN-03 are outside `fix_scope: critical_warning`.

---

_Fixed: 2026-11-06_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
