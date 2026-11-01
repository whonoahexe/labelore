---
phase: 08-several-projects-and-a-switcher
plan: 18
subsystem: ui
tags: [css, responsive, header, project-switcher, playwright, gap-closure]
gap_closure: true
gap_ids: [G-08-2]

requires:
  - phase: 08-several-projects-and-a-switcher
    provides: the header project switcher (08-11) and its browser specs (08-15)
provides:
  - sketch 039 A's 42rem header rules, so the 390px trigger shows the open project's name
  - behavioural 390px and 320px name-width checks in ready, pending and error states
  - the TGT-08 trade (dot-only pill at 42rem and below) recorded in the design language and the UI-SPEC
affects: [08-verify-work, UAT test 2 re-run]

plan_head_before: d40f7076ba93ebed4e6e82bf59cce3914b2e090d
plan_head_after: c6c842d3b344588753225f63626805baef1e1d68

actuals:
  tokens: 4900
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Visually hidden (clip, 1px box) rather than display: none for a node an aria-describedby names"
    - "Browser checks assert a visible clientWidth, never a declared style alone"

key-files:
  created: []
  modified:
    - src/web/styles/globals.css
    - test/e2e/switcher.spec.ts
    - test/e2e/projects-screenshots.spec.ts
    - docs/design-language.md
    - .planning/phases/08-several-projects-and-a-switcher/08-UI-SPEC.md
    - test/web/uat-session-corpus.test.ts

key-decisions:
  - "TGT-08 at 42rem and below: the snapshot pill keeps only its dot; the read time stays in its title, aria-describedby and the polite live region"
  - "Label hidden visually, not with display: none, so the CR-02 guard passes unedited"
  - "The hiding rule omits .sr-only's margin: -1px, which the token guard flags in any rule but .sr-only"

requirements-completed: [PLAT-02]

coverage:
  - id: D1
    description: "At 390px with a project open the header trigger shows the whole project name beside the brand mark and the chevron"
    requirement: PLAT-02
    verification:
      - kind: e2e
        ref: "test/e2e/switcher.spec.ts#at 390px the trigger shows the whole open project name beside a dot-only snapshot pill, and the read time stays in its title, description and live region (G-08-2)"
        status: pass
      - kind: e2e
        ref: "test/e2e/projects-screenshots.spec.ts#the switcher, the landing page and the add dialog at 390px in light and dark"
        status: pass
    human_judgment: false
  - id: D2
    description: "The name stays whole while the snapshot is pending and after it fails; an 80-character name keeps at least 40px at 390px and 24px at 320px, with no sideways scroll"
    requirement: PLAT-02
    verification:
      - kind: e2e
        ref: "test/e2e/switcher.spec.ts#at 390px the name stays whole while the snapshot is pending and after it fails (G-08-2, D-07)"
        status: pass
      - kind: e2e
        ref: "test/e2e/switcher.spec.ts#at 320px the trigger keeps a visible name and the page never scrolls sideways (G-08-2)"
        status: pass
      - kind: e2e
        ref: "test/e2e/switcher.spec.ts#a long project name > truncates in the trigger at 390px"
        status: pass
    human_judgment: false
  - id: D3
    description: "The TGT-08 trade is recorded; the unit gate is green again after re-pinning the stale 08-UAT.md corpus entry"
    verification:
      - kind: unit
        ref: "npm run test:gate (gate: total=4817 passed=4817 failed=0 skipped=0 todo=0)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The 390px header looks like sketch 039 A (mark, name over meta, chevron, dot-only pill, search, theme toggle)"
    verification: []
    human_judgment: true
    rationale: "UAT test 2 re-run on the fix is a visual comparison against the sketch; collected for the end-of-phase walkthrough, never a substitute for the automated gates"

duration: 22min
completed: 2026-11-01
status: complete
---

# Phase 8 Plan 18: G-08-2 Switcher Name at 390px Summary

**Sketch 039 A's 42rem header rules ported so the 390px trigger shows "Lendshed" whole (118px, was 0), with the snapshot label visually hidden inside a position-relative pill and browser checks that fail on the old layout.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-11-01T18:26:20Z
- **Completed:** 2026-11-01T18:48:50Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- The header trigger shows the open project's name at 390px: name `clientWidth` 118, `scrollWidth` 118 (whole); pill 26px wide (dot only). At 320px the name is 48px wide (62px of text, cut with an ellipsis), no sideways scroll.
- The pill's `.snapshot-label` is visually hidden (the repository's own `.sr-only` pattern), so the pill's `aria-describedby` still resolves and the CR-02 guard passes unedited. At 1280px the label is visible as before.
- Seven browser checks now assert a visible name width (new Task 1 test, the 390 popup test, the 390 long-name test, the pending/error test, the 320px test, contract A at 390 in both themes, the long-text test). All fail on the pre-fix stylesheet.
- The TGT-08 trade is recorded in the plan, the design-language `snapshot-label` and `project-switcher-trigger` rows, and 08-UI-SPEC sections 1 and 8 (no new bullet, row or heading, so the corpus guard counts hold).
- The one failure the unit gate had before this plan (stale 08-UAT.md pin) is cleared by re-pinning to the diagnosed session; 08-UAT.md is not edited.

## Task Commits

1. **Task 1: 42rem header rules and one browser check (tracer)** - `c01aa82` (fix)
2. **Task 2: every 390px check asserts a visible name** - `7c4c611` (test)
3. **Task 3: record the trade, re-pin the UAT corpus entry** - `c6c842d` (docs)
   - Follow-up to Task 1: `559d5ed` (fix) drops `margin: -1px` from the label rule (see Deviations)

**Pre-fix base:** `d40f7076ba93ebed4e6e82bf59cce3914b2e090d`. `git log -1 --format=%h -- test/web/refresh-contract.test.ts` prints `e05d893` before and after (guard unedited).

## Files Created/Modified

- `src/web/styles/globals.css` - 42rem shell block: lockup right margin, drawer-trigger left margin and controls padding at `--space-2`, accurate comment in place of the stale one, `.snapshot-pill` (position relative, padding) and the visually hidden `.snapshot-label`; a second 42rem block after the base rule for `.search-trigger` padding
- `test/e2e/switcher.spec.ts` - `nameWidths` and `expectWholeName` helpers, the G-08-2 test, the pending/error test, the 320px test, name-width asserts in the 390 popup and long-name tests
- `test/e2e/projects-screenshots.spec.ts` - contract A at 390 and the long-text check assert a visible name width
- `docs/design-language.md` - the two rows
- `.planning/phases/08-several-projects-and-a-switcher/08-UI-SPEC.md` - sections 1 and 8 amended in place
- `test/web/uat-session-corpus.test.ts` - 08-UAT.md pin: tests 2, pass 1, issue 1, gaps 1, mode items

## Red / green evidence

- **Task 1 red** (stylesheet unchanged): the new test failed at `expect(widths.client).toBeGreaterThan(0)` — "Expected: > 0, Received: 0".
- **Task 1 green:** `1 passed`; the full `switcher.spec.ts` run was `27 passed`. Measured: name `clientWidth` 118 at 390px, pill 26px wide.
- **Task 2 red proof** (pre-fix `globals.css` restored from the base commit, scratchpad copy `globals.fixed.css` kept as a second restore source; Task 1's commit held the fix, working tree clean for the file): 8 failed, 2 passed (the two 390px forget-button tests, which do not touch the name). Failing on a name width of 0:
  - contract A at 390px light and dark (`projects-screenshots.spec.ts`, `wholeName.client` > 0)
  - long text in the header (`clientWidth` >= 40, received 0)
  - the 390 popup test (`expectWholeName`)
  - the new G-08-2 test
  - the pending/error test
  - the 320px test (>= 24, received 0)
  - the 390 long-name test (>= 40, received 0)

  This is the expected set plus the 320px test. After the round trip: `git status --porcelain -- src/web/styles/globals.css` printed nothing, `cmp` against the scratchpad copy reported identical, and `.snapshot-label {` rule count was back to 2.
- **Task 2 green:** `switcher.spec.ts` + `projects-screenshots.spec.ts`: `34 passed (1.5m)`. Measured name `clientWidth`: 118 at 390px, 48 at 320px (thresholds 24 and 40; nowhere within 4px of a threshold).

## Phase gate (last lines)

- `npm run test:gate`: `gate: total=4817 passed=4817 failed=0 skipped=0 todo=0` (CR-02, css-source-order, navbar, visual, class-vocabulary, token-guard, UI-SPEC corpus and UAT corpus guards included)
- `npm run typecheck`: exit 0
- `npm run lint`: exit 0
- Full e2e: `241 passed (12.2m)`, exit 0, no failed, flaky or skipped lines

## Decisions Made

- TGT-08 at 42rem and below is accepted as decided in the plan: dot-only pill, read time kept in title, description and live region. Reversible: one rule in the 42rem block.
- The hiding rule uses `.sr-only`'s declarations except `margin: -1px` (see Deviations).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Token guard flagged `margin: -1px` in the `.snapshot-label` rule**
- **Found during:** Task 3 (unit gate run)
- **Issue:** The plan said to copy `.sr-only`'s declarations. `test/token-guard.test.ts` flags `margin: -1px` as a spacing violation in every rule except the allowlisted `.sr-only`: `3937 .snapshot-label { margin: -1px } [spacing]`. The gate had been green on this file before the change.
- **Fix:** Dropped the negative margin, as the repository's other phone-width hiding rule (`.milestone-retro-button > span`) already does. The clip, the 1px box and the zero overflow still hide the label. The comment above the rule says why. The token guard stays unedited.
- **Files modified:** `src/web/styles/globals.css`
- **Verification:** `npm run test:gate` green (4817); G-08-2 label checks (box at most 1px wide) pass in the full e2e run
- **Committed in:** `559d5ed`

**2. [Rule 3 - Blocking] No Playwright-managed Chromium in the sandbox**
- **Found during:** Task 1
- **Issue:** `npm run test:e2e` failed at launch: the Playwright browser download directory held no Chromium.
- **Fix:** An untracked `playwright.local.config.ts` (never committed, deleted before return) spreads the repository config unchanged and sets `channel: 'chrome'` on the one project, which uses the system Google Chrome 153. Every Playwright run in this plan went through it with the repository's own servers, specs and settings. Nothing about the repository config changed.
- **Verification:** All runs above
- **Committed in:** not committed

**3. [Rule 3 - Blocking] Worktree had no `node_modules`**
- **Fix:** A symlink to the main checkout's `node_modules`, with a temporary `/node_modules` line in the shared `.git/info/exclude` so `test/fixture-leak.test.ts` (which scans `git ls-files --others --exclude-standard`) does not try to read the symlink. Both removed before return; the exclude file is restored.

---

**Total deviations:** 3 (1 bug fix in the plan's own CSS, 2 environment blockers)
**Impact on plan:** None on scope. All plan acceptance criteria hold.

## Acceptance criteria (Task 1 and 3, re-run at the end)

- `grep -c 'Relaid out to flow'` 0; `.snapshot-label {` 2; `.snapshot-pill {` 2; `.search-trigger {` 2; `toHaveAccessibleDescription` 1.
- `git diff --name-only d40f707 HEAD -- src/web/components src/web/pages test/web` prints only `test/web/uat-session-corpus.test.ts` (the intended Task 3 edit); no `.tsx` change, no guard edited. `08-UAT.md` unchanged.
- `git log -1 --format=%h -- test/web/refresh-contract.test.ts` prints `e05d893`, the hash recorded at the start of Task 1.
- Task 2 counts: `clientWidth` 3 in `switcher.spec.ts` (helper counted once, plus the two threshold checks), 5 in `projects-screenshots.spec.ts`; `'error'` 1 and `'pending'` 1 in `switcher.spec.ts`.

## Issues Encountered

None beyond the deviations above.

## Known Stubs

None.

## Threat Flags

None. No endpoint, input or file read changed. T-08-43 mitigated: the CR-02 guard file's last commit is unchanged.

## Human check (deferred to the end-of-phase walkthrough)

Open `test-results/phase-08/switcher-390-light.png` and `switcher-390-dark.png` beside their `-sketch.png` pairs (written by the passing projects-screenshots run). Expected: the header shows the mark, "Lendshed" over its meta line and the chevron, a dot-only snapshot pill, search and the theme toggle; nothing scrolls sideways. The executor looked at the light capture: it matches. This is UAT test 2 re-run on the fix and does not stand in for any automated gate above, all of which passed first.

## Next Phase Readiness

G-08-2 is closed by test; `/gsd-verify-work 08` re-tests UAT test 2 and re-pins the 08-UAT.md corpus entry when it does.

## Self-Check: PASSED

- Modified files exist: globals.css, both specs, design-language.md, 08-UI-SPEC.md, uat-session-corpus.test.ts (verified).
- Commits `c01aa82`, `7c4c611`, `559d5ed`, `c6c842d` are ancestors of HEAD.

---
*Phase: 08-several-projects-and-a-switcher*
*Completed: 2026-11-01*
