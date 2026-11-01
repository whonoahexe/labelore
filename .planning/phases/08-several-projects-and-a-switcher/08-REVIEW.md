---
phase: 08-several-projects-and-a-switcher
reviewed: 2026-11-02T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - src/web/styles/globals.css
  - test/e2e/projects-screenshots.spec.ts
  - test/e2e/switcher.spec.ts
  - test/web/security-console-corpus.test.ts
  - test/web/uat-session-corpus.test.ts
  - test/web/ui-review-corpus.test.ts
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
status: issues_found
---

# Phase 8: Code Review Report (incremental, 37da86a..HEAD, plan 08-18)

**Reviewed:** 2026-11-02
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the diff for plan 08-18 (G-08-2: project-switcher name at 390px). The CSS change is sound. The `.snapshot-label` rule at 42rem uses a clip-based visually-hidden pattern, not `display: none`. `aria-describedby` therefore still resolves, and the label stays out of the flow. The cascade order is correct: the new rules come after the base `.snapshot-pill`, `.snapshot-label` and `.search-trigger` rules. `docs/design-language.md` (line 1029) already documents the new behaviour. The three corpus test files pass (42 tests). I did not run the Playwright specs, per the project's e2e-only-when-needed rule. No bugs or security issues were found. The remaining issues are accessibility regressions that the plan accepted as trade-offs, and a few weak spots in the new assertions.

## Warnings

### WR-01: Snapshot pill drops to a ~26px-wide touch target at 42rem and below, and a test locks that in

**File:** `src/web/styles/globals.css:3923-3926`, `test/e2e/switcher.spec.ts:~291`
**Issue:** At 42rem and below, `.snapshot-pill` loses its label, so it is dot (8px) + 2x`--space-2` padding + 2px border, about 26px wide. The rest of the narrow header is held to 40px touch targets (the trigger is at least 40px tall, and forget buttons are 40px square, as the tests enforce). The pill is an interactive refresh control, and its width is now the smallest tap target in the header. The new e2e test asserts `pillBox.width < 40`, so it enforces the small target and guards against a fix. The height comes from `size="sm"`, which this review could not confirm is at least 40px.
**Fix:** Keep the visual dot-only pill but extend the hit area with `min-width: 2.5rem` (or a pseudo-element hit area), and change the assertion to something like `expect(pillBox.width).toBeLessThan(48)`. Or record the sub-40px target as an accepted exception in the TGT-08 trade note.

### WR-02: Pill state is carried by colour alone for sighted touch users at 42rem and below

**File:** `src/web/styles/globals.css:3934-3943` (with `src/web/components/snapshot-status.tsx:78-103`)
**Issue:** With the label clipped, the visible differences between ready, pending and error are the dot colour (`--primary`, `--muted-foreground`, `--destructive`), the pill's border and text colour in the error state, and a pulse on `refreshing` (which `prefers-reduced-motion` removes). The dot has the same square shape in every state. The wording ("Metadata unavailable", "Reading snapshot...") now lives only in `title`, the accessible description and the live region. `title` does not show on touch, which is the device class that matters at this width. This is colour-only state signalling (WCAG 1.4.1) for the one control that reports whether the snapshot loaded. The plan recorded the loss of the read time as a trade. It did not record the loss of the error and pending text, and the new tests only assert the DOM state, not that anything visible differs.
**Fix:** Give the error state a non-colour cue that survives the clipped label, for example a different dot shape (`.snapshot-pill[data-state='error'] .snapshot-dot { border-radius: 50% }`, or an inset ring) inside the same media query. Extend the TGT-08 note to cover error and pending, not just the read time.

## Info

### IN-01: The 320px assertion is too loose to catch a regression

**File:** `test/e2e/switcher.spec.ts:~365`
**Issue:** `client >= 24` accepts a name of about three characters. The comment says 32px was measured before the margin change, so the test passes even if most of the gain from this plan is lost. The 390px "40px" thresholds on the long-name cases are tighter.
**Fix:** Pin it closer to the measured value after the change (for example `>= 40`, matching the other long-name checks), or record the measured width in the comment.

### IN-02: `expectWholeName` compares rounded integers, so it can flake by 1px

**File:** `test/e2e/switcher.spec.ts:78-84`, `test/e2e/projects-screenshots.spec.ts:~216`
**Issue:** `scrollWidth <= clientWidth` uses integer-rounded values. A name that overflows by a fractional pixel (for example because of font hinting differences between Chromium builds) can fail while looking whole, or pass while being clipped. The helper also reads once, with no retry, right after a visibility wait. The pill state is awaited in the main test, but in the pending-state test the layout can still be settling.
**Fix:** Allow 1px (`widths.scroll - widths.client <= 1`), or wrap the read in `expect.poll`.

### IN-03: The 08-UAT pin was inserted between a comment and the entry it describes

**File:** `test/web/uat-session-corpus.test.ts:82-85`
**Issue:** The `// Session completed by /gsd-verify-work 07 (D-18).` comment still sits above the 08 pin and its own comment block. It now appears to describe the Phase 8 entry, and the 07 entry loses its explanation.
**Fix:** Move the new 08 entry and its comment above the `Session completed by ... 07` comment, or below the 07 entry.

---

_Reviewed: 2026-11-02_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
