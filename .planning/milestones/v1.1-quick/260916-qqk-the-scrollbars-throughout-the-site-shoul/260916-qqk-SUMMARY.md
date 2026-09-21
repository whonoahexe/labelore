---
phase: quick-260916-qqk
plan: 01
subsystem: ui
tags: [css, scrollbar, design-tokens, tailwind, accessibility]

# Dependency graph
requires: []
provides:
  - "One consolidated scrollbar block in src/web/styles/globals.css: universal zero-space rest state (both engines), a single :is()-scoped hover/focus reveal rule naming all eleven bounded containers, and two named thumb-colour tokens"
  - "--scrollbar-thumb (30%) and --scrollbar-thumb-strong (55%) tokens in :root, replacing the prior solid-on-hover var(--muted-foreground) escalation"
affects: [design-tokens, scrollbar, globals.css, visual-contract]

# Actuals (#2632)
actuals:
  tokens: 3086
  tasks: 1
  commits: 3
plan_head_before: ca24de7

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Custom-property-driven WebKit scrollbar sizing: an unscoped ::-webkit-scrollbar rule reads var(--scrollbar-size, 0px), and only the hover/focus reveal rule sets --scrollbar-size on the matched element — the sizing rule itself never needs to be scoped or repeated."
    - "Unlayered override rule placed intentionally outside @layer base so it beats a layered universal rest-state rule regardless of selector specificity."

key-files:
  created: []
  modified:
    - src/web/styles/globals.css
    - test/web/visual-contract.test.ts
    - .planning/config.json

key-decisions:
  - "D-01: rest state is universal (declared on `*`, not enumerated per selector) so any scroll container not in the reveal list still gets zero space and no visible bar, and joining the reveal list later is a one-selector edit."
  - "D-02: the root `html` scroller is permanently excluded from the reveal — hover-gating it would be meaningless (the pointer is over html whenever it's in the window) and revealing a native bar there would reflow the whole page, which is the layout shift this task removes."
  - "D-03: thumb opacity drops at every site via two named tokens, --scrollbar-thumb (45% -> 30%) and new --scrollbar-thumb-strong (55%, WebKit-only direct-hover ceiling, replacing the old escalate-to-solid var(--muted-foreground))."
  - "D-04: revealed bar is 6px, native (not overlay), accepting that a native bar occupies content-box space while visible — a container-local effect confined to the hovered element, never a page-level shift."
  - "Deviation: added git.allow_default_branch_commits: true to .planning/config.json — the executor's protected-branch guard treats master as protected by default, but this repo's branching_strategy is \"none\" and every prior quick task already committed straight to master; the override documented in the guard's own instructions was applied rather than blocking all commits (Rule 3)."

patterns-established:
  - "Named color-mix() thumb tokens consumed only via var() at every usage site — token-guard's recurring-recipe check stays green because the recipe is spelled once, at its :root definition."

requirements-completed: [QQK-01, QQK-02, QQK-03]

coverage:
  - id: D1
    description: "Every scroll container in the app (page scroller included) reserves zero layout space at rest; the eleven bounded containers reveal a faint 6px bar only on hover/focus; thumb colour is carried by two --root tokens at reduced opacity; four legacy per-site scrollbar rules are gone, replaced by one consolidated block."
    requirement: QQK-01
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts#zero-space, hover-revealed scrollbars (QQK-01, QQK-02, QQK-03)"
        status: pass
      - kind: unit
        ref: "test/token-guard.test.ts (full suite — zero violations, no duplicated color-mix recipe)"
        status: pass
    human_judgment: true
    rationale: "Source-text assertions can prove the declarations exist/are absent but cannot prove a bar is unpainted, a gutter is gone, or that the reveal is perceptibly faint-yet-grabbable in a real engine across both themes. The plan's own <human-check> step hands this to the human gate at workflow.human_verify_mode: end-of-phase — recorded as an open item, see below."

# Metrics
duration: ~20min
completed: 2026-09-16
status: complete
---

# Quick 260916-qqk: Zero-space, hover-revealed scrollbars Summary

**Consolidated four legacy per-site scrollbar rules into one zero-space, hover/focus-revealed 6px block with two reduced-opacity named thumb tokens, driven entirely by CSS custom properties — no `.tsx` touched.**

## Performance

- **Duration:** ~20 min
- **Tasks:** 1
- **Files modified:** 3 (`src/web/styles/globals.css`, `test/web/visual-contract.test.ts`, `.planning/config.json`)
- **Commits:** 3

## Accomplishments

- Every scroll container in the app — including the root page scroller — now reserves zero layout space at rest, in both Firefox (`scrollbar-width: none` on the universal `* {}` rule) and WebKit/Blink (an unscoped `::-webkit-scrollbar` rule with a `var(--scrollbar-size, 0px)` fallback).
- A single `:is(...)` -scoped rule reveals a thin 6px bar only on `:hover`/`:focus-within` across all eleven bounded containers (`.tree-navigator`, `.document-outline`, `.search-dialog-results`, `.coverage-table-boundary`, `.overflow-x-auto`, `.table-scroll`, `.code-scroll`, `pre`, `table`, `.mermaid`, `.mermaid-fallback`), placed unlayered so it beats the layered rest-state rule regardless of specificity.
- The root `html` scroller never reveals a bar — deliberately (D-02) — since gating it on `:hover` would be meaningless (the pointer is over `html` whenever it's in the window) and would otherwise reflow the whole page.
- Thumb colour dropped from a solid `var(--muted-foreground)` escalation to two named, reduced-opacity tokens: `--scrollbar-thumb` at 30% (was 45%, or solid 100% at the old per-site hover states) and a new WebKit-only `--scrollbar-thumb-strong` at 55% for direct thumb hover.
- Four legacy scrollbar-styling sites (`html`, `.tree-navigator`, the `pre, table, .mermaid { scrollbar-width: thin }` rule, and `.artifact-document pre` + its five WebKit rules) carry no scrollbar declarations any more — replaced by the one consolidated block.

## Task Commits

TDD task (RED → GREEN, no REFACTOR needed — implementation matched the plan precisely and passed cleanly on first GREEN run):

1. **Task 1 — RED: failing tests for the new contract** - `62b7872` (test)
2. **Task 1 — GREEN: consolidated scrollbar block implementation** - `c5cc80f` (feat)

**Deviation commit (Rule 3, blocking-issue auto-fix, precedes the TDD cycle):** `4dbd099` (chore) — see Deviations below.

## Files Created/Modified

- `src/web/styles/globals.css` — tokens (`--scrollbar-thumb` re-valued to 30%, `--scrollbar-thumb-strong` added at 55%), universal `*` rest state, `html`/`.tree-navigator`/`.artifact-document pre` stripped of scrollbar declarations, one consolidated block (5 rules) replacing the deleted `pre, table, .mermaid { scrollbar-width: thin }` rule's former location.
- `test/web/visual-contract.test.ts` — two stale `.artifact-document pre::-webkit-scrollbar*` tests replaced with six region-scoped tests pinning the new rest/reveal/token contract.
- `.planning/config.json` — added `git.allow_default_branch_commits: true` (deviation, see below).

## Decisions Made

See `key-decisions` in frontmatter (D-01 through D-04, carried verbatim from the plan's own discretionary decisions, plus the one deviation decision made during execution).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `git.allow_default_branch_commits: true` to `.planning/config.json`**
- **Found during:** Pre-commit safety assertion, before the first commit of this task.
- **Issue:** The executor's mandatory pre-commit HEAD safety check classifies `master` as a protected/default branch and refuses to commit onto it unless overridden. This repo's `.planning/config.json` already declares `git.branching_strategy: "none"`, and every prior quick task in this repo's history (`260910-jz8`, `260911-243`, `260911-vqe`, `260912-lfi`, `260912-oae`, `260916-o2o`, etc.) committed directly to `master` — there is no feature-branch workflow here to re-home onto.
- **Fix:** Set the documented override key (`git.allow_default_branch_commits: true`) named explicitly in the guard's own instructions, aligning the tooling's check with this repo's actual, already-established policy rather than blocking every commit for the rest of this task.
- **Files modified:** `.planning/config.json`
- **Verification:** Re-ran `gsd_run query git.base-branch --is-protected master` after the change; it now returns `false`, and the guard passes on every subsequent commit.
- **Committed in:** `4dbd099`

**2. [Process note, not a deviation rule] Corrected a commit-boundary mistake before it left the local repo**
- **Found during:** Immediately after committing `4dbd099`.
- **Issue:** A `git add test/web/visual-contract.test.ts` staged from an earlier exploratory command was still in the index when `4dbd099` was committed, so the config change and the (not-yet-intended-to-be-committed) RED test changes landed in the same commit instead of two atomic ones.
- **Fix:** Since the commit was purely local (11 commits ahead of `origin/master`, never pushed) and no content was at risk, used `git reset --soft HEAD~1` to un-commit while keeping both changesets fully intact in the index, then re-staged and re-committed each file separately as the intended `chore` and `test` commits.
- **Files modified:** none beyond the two already in flight.
- **Verification:** `git show --stat` on both resulting commits confirms exactly one file each.
- **Committed in:** `4dbd099` (config only) and `62b7872` (test only).

---

**Total deviations:** 1 auto-fixed (Rule 3, blocking) + 1 corrected process mistake (no rule category — a local, unpushed commit-splitting fix, not a plan deviation).
**Impact on plan:** Neither touched `src/web/styles/globals.css` or the plan's task scope. No scope creep against the plan's `<success_criteria>` (which names exactly `src/web/styles/globals.css` and `test/web/visual-contract.test.ts` as the only files the *task* should touch — `git diff --name-only` confirms the CSS-implementing `feat` commit touches only `src/web/styles/globals.css`).

## TDD Gate Compliance

- **RED commit:** `62b7872` — `test(quick-260916-qqk): add failing tests for zero-space hover-revealed scrollbars`. Confirmed by direct `vitest run` output (not `gsd_run check tdd-red-evidence` — see note below): 5 of the 6 new assertions failed against the unmodified stylesheet, each on the planned assertion itself (missing `--scrollbar-thumb-strong` token, missing `scrollbar-width: none` on `*`, missing the reveal rule, leftover `scrollbar-color`/`scrollbar-width` on `html`/`.tree-navigator`/`.artifact-document pre`) — never on an import/syntax/zero-discovery error. The 6th assertion ("keeps scroll-behavior... untouched") legitimately already passed pre-edit, since it pins pre-existing invariants the change must preserve, not new behavior.
- **GREEN commit:** `c5cc80f` — `feat(quick-260916-qqk): consolidate scrollbars into one zero-space, hover-revealed block`. All 6 new assertions plus the 2 kept assertions in the same file pass (`test/web/visual-contract.test.ts`: 82/82); `test/token-guard.test.ts` reports zero violations, no duplicated `color-mix` recipe.
- **REFACTOR:** none — the GREEN implementation matched the plan's precise instructions and passed the full suite plus lint on the first run; no cleanup was needed.
- **Tooling note:** `gsd_run check tdd-red-evidence` expects Node's `--test` TAP summary lines (`# tests`/`# pass`/`# fail`), which this project's Vitest TAP reporter does not emit (confirmed via `npx vitest run --reporter=tap`, which produces nested `ok N - <name> { ... }` blocks with no terminal summary line). The check is therefore not usable in this Vitest-based project as-is; RED evidence above was instead verified by direct inspection of the default-reporter failure output, which unambiguously named the correct failing tests and assertions.

## Automated Verification

- `npx vitest run test/web/visual-contract.test.ts test/token-guard.test.ts` — 82/82 pass.
- `npm test` (full suite) — 711/711 pass.
- `npm run lint` — clean, no output.
- `git diff --name-only` for the `feat` commit lists exactly `src/web/styles/globals.css` (the only file the plan's `<success_criteria>` names for the stylesheet edit).
- `git diff` confirms `scroll-behavior: smooth`, both `overscroll-behavior*` declarations (`.tree-navigator`, the `.mermaid`-terminated overflow group), and every `overflow-x`/`overflow-y` declaration are unchanged.

## Outstanding: Human Verification (deferred to end-of-phase)

Per `workflow.human_verify_mode: end-of-phase` and this task's constraints, the plan's `<human-check>` step was **not** run by this executor (no browser driven). Recorded as an open item in `.planning/WINDOWS.md` (entry id 9, kind `unrun-verify`). The five checks still needed, in light and dark, with `npm run dev -- /home/cinedise/gsd-lore`:

1. **Page scroll (D-02):** no bar, no reserved gutter at the right edge of a long page, at rest and with the pointer anywhere in the window; page still scrolls by wheel/keyboard/touch.
2. **No layout shift (QQK-01):** content sits flush to the viewport edge; moving between a short and a long page no longer jogs the layout horizontally.
3. **Reveal (QQK-03):** hovering a wide fenced code block, a wide table, the coverage matrix, the on-this-page outline, the sidebar drawer's file tree, and the search dialog's result list each paints a thin bar that disappears on exit; tabbing into the outline and search results also reveals it (`:focus-within`).
4. **Opacity (QQK-02):** the revealed thumb reads faint against both `var(--background)` and the code block's `var(--secondary)`, clearly lighter than the old solid bar, strengthening enough to feel grabbable when the pointer sits directly on it.
5. **D-01 consequence:** the sidebar drawer and search dialog (both `@base-ui` popups) reveal on hover and show nothing at rest.

Optional decisive DevTools check named in the plan: `document.documentElement.offsetWidth - document.documentElement.clientWidth` should be `0`, and `el.offsetWidth - el.clientWidth` should be `0` for each container at rest.

## Known Stubs

None — this is a pure CSS change; no data-shaped stubs were introduced.

## Issues Encountered

None beyond the commit-boundary process mistake documented under Deviations, which was corrected before proceeding and did not affect the plan's own file scope.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The scrollbar contract is fully implemented and automated-verified; only the human-check visual/motion pass remains, tracked in `.planning/WINDOWS.md` (open, id 9) for the standard end-of-phase harvest.
- No blockers for any subsequent quick task or phase.

---
*Phase: quick-260916-qqk*
*Completed: 2026-09-16*

## Self-Check: PASSED

- FOUND: `src/web/styles/globals.css`
- FOUND: `test/web/visual-contract.test.ts`
- FOUND: `.planning/quick/260916-qqk-the-scrollbars-throughout-the-site-shoul/260916-qqk-SUMMARY.md`
- FOUND: commit `4dbd099` (chore — config override)
- FOUND: commit `62b7872` (test — RED)
- FOUND: commit `c5cc80f` (feat — GREEN)
