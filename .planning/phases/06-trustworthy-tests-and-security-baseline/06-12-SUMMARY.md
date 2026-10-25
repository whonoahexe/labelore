---
phase: 06-trustworthy-tests-and-security-baseline
plan: 12
subsystem: testing
tags: [fixtures, lendshed, ui-spec, ui-review, theme-tokens, playwright, vitest]
requires: [06-01, 06-02]
provides:
  - Lendshed stylesheet token block and components.json
  - Seven Lendshed UI-SPEC files and one Lendshed UI-REVIEW file
  - UI-SPEC, theme-token and UI-review tests that read only Lendshed and Labelore files
affects: [06-22]
tech-stack:
  added: []
  patterns: [fxPath/FX_PLANNING corpus walk with FX: keys, measureGrowth instead of fixed ms budgets, FIXTURE_BASE_URL browser specs]
key-files:
  created:
    - test/fixtures/lendshed/frontend/app/globals.css
    - test/fixtures/lendshed/components.json
    - test/fixtures/lendshed/.planning/phases/01-member-sign-in-sessions/01-UI-SPEC.md
    - test/fixtures/lendshed/.planning/phases/02-roles-and-permissions/02-UI-SPEC.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-UI-SPEC.md
    - test/fixtures/lendshed/.planning/phases/04-bulk-loan-export/04-UI-SPEC.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/02-shed-inventory-health/02-UI-SPEC.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/03-catalogue-browsing/03-UI-SPEC.md
    - test/fixtures/lendshed/.planning/milestones/v1.0-phases/04-shed-to-shed-transfers/04-UI-SPEC.md
    - test/fixtures/lendshed/.planning/phases/03-account-admin-and-sessions/03-UI-REVIEW.md
  modified:
    - test/ui-spec-contract.test.ts
    - test/web/ui-spec.test.ts
    - test/web/ui-spec-corpus.test.ts
    - test/web/ui-spec-theme.test.ts
    - test/theme-tokens.test.ts
    - test/ui-review-audit.test.ts
    - test/web/ui-review.test.ts
    - test/web/ui-review-corpus.test.ts
    - test/e2e/ui-spec-page.spec.ts
    - test/e2e/ui-review-page.spec.ts
key-decisions:
  - "The UI-SPEC corpus keeps three key prefixes: LB: (Labelore's own .planning), DN: (the in-repo dense fixture, renamed from its old FX: key) and FX: (Lendshed)"
  - "The UI-review corpus drops the dense fixture walk (it holds no UI-REVIEW) and keys Lendshed as FX:"
status: complete
commits: 5
plan_head_before: eee2461
plan_head_after: 943c7352ef1ce346d298432514a378c358c22507
actuals:
  tokens: 26000
  tasks: 3
  commits: 5
---

# Phase 6 Plan 12: UI-SPEC, theme-token and UI-review families on Lendshed Summary

The UI-SPEC, theme-token and UI-review tests, their corpus guards and both browser specs now read only made-up Lendshed files (plus Labelore's own archived files, pinned per D-18); nothing is gated, skipped or timed against a fixed millisecond budget.

## What was done

- Task 1 (tracer, commit 90b7924, from the interrupted run): the made-up `globals.css` token block (warm green and timber palette) and `components.json`, the Lendshed phase 01 UI-SPEC, and `ui-spec-contract`, `theme-tokens`, `ui-spec-theme` and the first browser test moved onto Lendshed with the six token pins re-pinned and the theme-token fixed-budget test converted to `measureGrowth`.
- Task 2 (commit 87a4861, the salvaged wip commit, reviewed here and kept): the other six UI-SPEC files, `ui-spec`, `ui-spec-corpus` and `ui-spec-contract` retargeted, the corpus PINNED map re-keyed (seven FX: entries recounted in the fixture files, the LB: entries re-checked), the 7-file minimum asserted, the remaining UI-SPEC browser tests moved to `FIXTURE_BASE_URL`. The throwaway `test/zz-probe.test.ts` that rode in with that commit was removed (commit 19a3932).
- Task 3 (commit 943c735): the Lendshed phase 03 UI-REVIEW, and `ui-review-audit`, `ui-review`, `ui-review-corpus` and `ui-review-page.spec` retargeted to `fxPath`, FX: keys and `FIXTURE_BASE_URL`; the two fixed-budget tests (audit and corpus) converted to `measureGrowth`; the every-file-must-be-pinned rule kept over LB: and FX: keys.

## Verification

- `npm run test:gate` over all eight unit files: `gate: total=151 passed=151 failed=0 skipped=0 todo=0`.
- `npx playwright test test/e2e/ui-spec-page.spec.ts`: 3 passed, 0 skipped. `npx playwright test test/e2e/ui-review-page.spec.ts`: 3 passed, 0 skipped. Only these two specs were run.
- Acceptance greps over the ten test files: no `runIf|skipIf|test.skip|SP_PLANNING|STUDIO_PORTAL|homedir|helpers/studio-portal` (empty); no deny-list words in the test files or `test/fixtures/lendshed` (empty); `performance.now|Date.now` count 0 in all ten; seven `*-UI-SPEC.md` under Lendshed; the Lendshed UI-REVIEW's first line is `# Phase 03 — UI Review`, not `---`.
- Typecheck and eslint over the touched files report nothing.

## Token cross-check (T-06-19)

A one-off grep compared every oklch value pinned in `test/theme-tokens.test.ts` and `test/web/ui-spec-theme.test.ts`, plus every value in the Lendshed `globals.css`, against the reference stylesheet. None of the Lendshed palette values or the re-pinned six appear there. Four neutral defaults still appear in both: `oklch(1 0 0)`, `oklch(0.145 0 0)`, `oklch(0.922 0 0)` and `oklch(1 0 0 / 10%)`. These are the stock shadcn neutral defaults (pure white, near-black, light border), not brand values, and are used in the tests as inline synthetic stylesheet inputs. One brand-looking inline value (`oklch(0.553 0.195 38.402)`, a public Tailwind palette stop that also appeared in the reference) was replaced in `ui-spec-theme.test.ts` with a made-up `oklch(0.47 0.11 152)`.

## Per-file quirk ledger (input for 06-22)

- `globals.css`: a `:root` block and a `.dark` block of oklch custom properties plus an `@theme inline` mapping; the six pinned token values in `theme-tokens.test.ts` are re-pinned to its values.
- `components.json`: shadcn schema with `style: base-linden`, `baseColor: stone`, `rsc: false`, css path `frontend/app/globals.css`.
- phase 01 UI-SPEC: status approved, "Signed off 6/6", 3 elements (E1-E3), 22 rows (16 covered, 1 backstop, 1 unresolved, 4 dismissed), phase-specific chapters (Visual Hierarchy, Sign-In Interaction Contract, Top Bar Addition), Element | Kinds table, hex light and dark colour columns.
- phase 02 UI-SPEC: approved, "Signed off 6/6", 4 elements, 27 rows (21/2/0/4), chapters Visual Hierarchy, Grant-Derived Affordance Contract, Steward Desk Surface.
- phase 03 UI-SPEC: frontmatter `status: draft` while the sign-off reads "Signed off 6/6" (the draft-with-sign-off quirk), 5 elements, 35 rows (29/3/0/3), eight phase chapters with ADMN/D- reference tags in headings.
- phase 04 UI-SPEC: extra `reviewed_at` frontmatter key, "Sign-off 5/6 · 1 flag", 4 elements, 30 rows (25/5/0/0), UI Considerations table without per-element subsections.
- v1.0 phase 02 UI-SPEC: approved, "Signed off 6/6", 5 elements, 36 rows all covered, Motion & Reduced-Motion and Screen-Reader / Live-Region chapters, a "user-confirmed" element heading.
- v1.0 phase 03 UI-SPEC: bare `phase: 03` zero-padded, "Sign-off 5/6 · 1 flag", 4 elements, 12 rows (11/1/0/0), no phase chapters.
- v1.0 phase 04 UI-SPEC: zero-padded phase, "Signed off 6/6", 6 elements, 45 rows (31/3/0/11), Layout sub-chapters plus Motion and Screen-Reader chapters.
- phase 03 UI-REVIEW: no frontmatter; a Top 3 list whose third fix is dropped ("No third fix."); a lead sentence before the pillar scores; a closing `### Correction note` inside Summary; pillars scored 4/4/4/3/3/4 (overall 22/24), one ✗ line each in Typography and Spacing, 12 Files Audited entries, audited 2026-04-14.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wip commit carried a throwaway probe**
- **Found during:** resume merge
- **Issue:** `test/zz-probe.test.ts` rode in with the salvage commit.
- **Fix:** removed it (instructed by the dispatcher).
- **Commit:** 19a3932

**2. [Rule 2 - Missing critical functionality] Brand-looking colour left in an inline test sheet**
- **Found during:** T-06-19 token cross-check
- **Issue:** `ui-spec-theme.test.ts` used `oklch(0.553 0.195 38.402)`, which also appears in the reference stylesheet.
- **Fix:** replaced in four places with a made-up value; the file still passes (17/17).
- **Commit:** 943c735

**3. [Decision] Dense-fixture UI-REVIEW walk dropped; dense UI-SPEC key renamed DN:**
- The in-repo `fixtures/dense` holds no UI-REVIEW, so its walk was removed from the UI-review corpus. In the UI-SPEC corpus its old `FX:` key became `DN:` so `FX:` means Lendshed throughout.

**4. [Decision] Commit count base**
- No plan ledger file existed (the first commit predates this run), so `plan_head_before` is the master head at resume (eee2461); `commits: 5` counts the two salvaged commits, the merge, the probe removal and Task 3.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file-access surface; the fixtures are inert text.

## Self-Check: PASSED

All ten fixture files exist, and commits 90b7924, 87a4861, 19a3932 and 943c735 are ancestors of HEAD.
