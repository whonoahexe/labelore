---
phase: quick-260910-jz8
plan: 01
subsystem: ui
tags: [css, design-tokens, tailwind-v4, vitest-guard, globals.css]

requires: []
provides:
  - "--space-* / --space-fluid-* spacing scale, fully migrated"
  - "--fs-* / --fs-N--lh / --lh-* / --ls-* / --fw-* type scale, fully migrated"
  - "--font-mono token, wired to --font-heading and the three mono usage sites"
  - "named colour recipes (--card-veil, --destructive-tint, --destructive-border, --primary-tint, --shadow-popover, --scrollbar-thumb), palette dedupe, dead-token removal"
  - "test/token-guard.test.ts: spacing + type + colour regression guard with a planted positive control"
affects: [any future globals.css edit]

actuals:
  tokens: 27639
  tasks: 3
  commits: 3
plan_head_before: 1c3e3eca8a521600a4caee06c33498ed1e62690e

tech-stack:
  added: []
  patterns:
    - "Theme-independent :root scale block for plain custom properties, kept out of @theme/@theme inline so Tailwind never regenerates button.tsx's utilities"
    - "vitest declaration-walker guard (test/token-guard.test.ts), modeled on test/portability.test.ts's fs-gate idiom"

key-files:
  created:
    - test/token-guard.test.ts
  modified:
    - src/web/styles/globals.css
    - index.html
    - test/web/visual-contract.test.ts

key-decisions:
  - "D-01: both font-weight:650 sites snap to --fw-semibold (600), per orchestrator override of the research's 700 suggestion"
  - "D-02: the three hardcoded system-monospace stacks migrate to var(--font-mono) (JetBrains Mono first); visible font change accepted"
  - "P-01: spacing scale aligned to Tailwind's 0.25rem grid, not the research's 0.05rem unit"
  - "P-02: six static type steps on a ~1.09 ratio, not the research's 9-step table"
  - "P-05: --state-active/--state-hover alias --sidebar-primary/--sidebar-accent (not the reverse)"
  - "Added a 6th named colour recipe, --scrollbar-thumb, beyond the plan's explicit table — it recurs at 2 usage sites and the guard's own recurring-recipe check would otherwise fail on the real file"

requirements-completed: [JZ8-01, JZ8-02, JZ8-03, JZ8-04]

duration: ~2h
completed: 2026-09-11
status: complete
---

# Quick 260910-jz8: Centralize spacing, type and colour tokens with a guard check — Summary

**Migrated every hand-tuned padding/margin/gap/inset, font-size/line-height/letter-spacing/weight, and unnamed colour recipe in `globals.css` onto three named scales, and added a vitest guard (`test/token-guard.test.ts`) that fails the build if a raw literal is reintroduced.**

## Performance

- **Duration:** ~2h (sequential, on `master`, no worktree — orchestrator degraded worktree isolation due to a base-check mismatch)
- **Tasks:** 3/3 complete
- **Commits:** 3 — `6b72449` (spacing), `4f5f3c6` (type), `55c010f` (colour)

## What Was Built

**Task 1 — Spacing (JZ8-01):** Added a theme-independent `:root` scale block (`--space-0-5` … `--space-28`, all 16 steps consumed) plus 14 `--space-fluid-*` tokens consolidating 19 ad hoc `clamp()` shapes (greedy shape-merging, ≤1vw slope / ≤0.25rem endpoint tolerance). Migrated all 246 non-allowlisted spacing declarations. Wrote `test/token-guard.test.ts`'s scanner core (a single-pass CSS declaration walker) and its first family.

**Task 2 — Type (JZ8-02, D-01, D-02):** Added `--fs-1..7` (with `--fs-2` aliasing the existing `--font-size-micro-label`), `--lh-*`, `--ls-*`, `--fw-*`, and 8 fluid/display font-size tokens consolidating 13 `clamp()` shapes. Only `--fs-3--lh`/`--fs-4--lh`/`--fs-5--lh` have real usage-site pairings — `--fs-1/2/6/7--lh` were computed, found to have zero consumers, and dropped rather than defined dead. Fixed the 0.58rem floor violator and the hero label (`max(0.2em, var(--fs-1))`, P-04). Wired `--font-mono` (JetBrains Mono stack) into the palette, `@theme inline`, and index.html; migrated the three hardcoded system-mono sites onto it (D-02).

**Task 3 — Colour (JZ8-03) + final gate:** Named 6 recurring `color-mix()` recipes (5 from the plan's table + `--scrollbar-thumb`, added because it also recurs and the guard's own check would have failed on it otherwise). Aliased `--card-foreground`/`--popover-foreground`/`--sidebar-foreground` to `var(--foreground)`; pointed `--state-active`/`--state-hover` at the sidebar tokens (P-05); removed 7 now-redundant `.dark` redeclarations; deleted the 5 confirmed-dead token groups from `globals.css` and mirrored every deletion/alias into `index.html`; fixed the stale `--border` comment (16%, not 10%). Extended the guard with the colour family (raw functions/hex, named keywords, recurring/token-duplicating `color-mix()`) and the three palette checks.

## Sweep Numbers (both themes, identical light/dark)

| Metric | Baseline | Final | Direction required |
|---|---|---|---|
| distinct sizes | 33 | 16 | ↓ ✓ |
| distinct space | 43 | 22 | ↓ ✓ |
| distinct line-heights | 47 | 26 | ↓ ✓ |
| distinct letter-spacings | 25 | 16 | (not gated, still dropped) |
| distinct weights | 5 | 4 | ↓, ≤4 ✓ |
| distinct font families | 3 | 2 | = 2 ✓ |
| new off-palette colour | — | none | ✓ |
| any size < 10px | — | none | ✓ |

Pre-migration worklist sizes (live-gate violation counts before each task's migration): spacing 252, type 186 raw lines (97 font-size + 33 line-height + 33 letter-spacing + 22 font-weight + 53 font-family/font-shorthand declarations before filtering already-tokenized ones), colour — no literal-elimination needed (0 raw colours outside token blocks per the research audit); the work was naming/dedupe of 43 `color-mix()` call sites plus dead-token deletion.

## Snap and Fluid-Cluster Tables

**Spacing static snap** (all 16 steps consumed): the full observed→token mapping matched the plan's planning-time table exactly, verified programmatically (px-grid rule: <1rem rounds to nearest 2px, ≥1rem to nearest 4px, non-zero never snaps to 0).

**Spacing fluid clusters** (14 tokens, this plan's own discretionary clustering — the plan gave the algorithm, not a final table, for the spacing axis):

| Token | Value | Absorbs |
|---|---|---|
| `--space-fluid-1` | `clamp(0rem, 2vw, 1.5rem)` | — |
| `--space-fluid-2` | `clamp(1rem, 2.5vw, 1.5rem)` | `clamp(1rem, 2vw, 1.5rem)` |
| `--space-fluid-3` | `clamp(1.25rem, 3vw, 2rem)` | `clamp(1.25rem, 3vw, 2.25rem)` |
| `--space-fluid-4` | `clamp(1rem, 3vw, 2.5rem)` | — |
| `--space-fluid-5` | `clamp(1.1rem, 4vw, 2.5rem)` | — |
| `--space-fluid-6` | `clamp(1.5rem, 3vw, 2.5rem)` | — |
| `--space-fluid-7` | `clamp(1.25rem, 4vw, 3rem)` | `clamp(1.5rem, 4vw, 3rem)` |
| `--space-fluid-8` | `clamp(1rem, 4vw, 3.5rem)` | `clamp(1.25rem, 4vw, 3.5rem)`, `clamp(1.1rem, 4vw, 3.5rem)` |
| `--space-fluid-9` | `clamp(1.5rem, 4vw, 4rem)` | — |
| `--space-fluid-10` | `clamp(2rem, 5vw, 4rem)` | — |
| `--space-fluid-11` | `clamp(1.5rem, 4vw, 4.5rem)` | — |
| `--space-fluid-12` | `clamp(2rem, 5vw, 4.5rem)` | — |
| `--space-fluid-13` | `clamp(2.5rem, 7vw, 5rem)` | — |
| `--space-fluid-14` | `clamp(2rem, 5vw, 5.5rem)` | — |

**Type static snap**: matched the plan's table exactly (7 steps, nearest-value with tie-break up).

**Type fluid/display** (8 tokens): matched the plan's explicit table exactly (`--fs-fluid-1..4`, `--fs-display-1..3`, `--fs-display-narrow`).

**Line-height, letter-spacing, weight snap**: matched the plan's tables exactly. Only `--fs-3/4/5--lh` have real consumers (computed by cross-referencing every font-size+line-height pair sharing a rule block); `--fs-1/2/6/7--lh` were computed to have zero consumers and were not defined.

## Allowlist (9 entries, with reasons)

| Selector | Property | Value | Reason |
|---|---|---|---|
| `.sr-only` | `margin` | `-1px` | visually-hidden idiom |
| `.phase-detail-grid` | `gap` | `1px` | grid-divider hairline |
| `.metadata-panels` | `gap` | `1px` | grid-divider hairline |
| `.artifact-document :is(h1..h6)` | `margin` | `1.8em 0 0.65em` | em-relative heading margin |
| `.artifact-document :is(h1..h6)` | `margin-top` | `2.3em` | em-relative heading margin |
| `.artifact-document :is(h1..h6)` | `margin-bottom` | `0.75em` | em-relative heading margin |
| `.position-copy h1 span` | `font-size` | `max(0.2em, var(--fs-1))` | P-04 hero label floor |
| `.artifact-document :not(pre) > code` | `font-size` | `0.86em` | em-relative inline code |

(8 rows — `.metadata-panels`'s `padding: 1px` was **not** allowlisted; it snapped mechanically to `var(--space-0-5)` per the plan's snap rule, a ~1px visual change to that grid gutter noted as a deviation below.)

## Decisions for the User

- **D-01:** both `font-weight: 650` sites → `--fw-semibold` (600), per orchestrator override.
- **D-02:** the three hardcoded mono stacks → `var(--font-mono)`; visible font change to JetBrains Mono accepted.
- **P-01 (spacing scale):** Tailwind's 0.25rem grid, not the research's 0.05rem unit. Max drift ≤1.2px below 1rem, ≤2.4px above.
- **P-02 (type scale):** six static steps on ~1.09 ratio; dominant 0.78rem body size moved to 0.76rem (−0.32px); 13 fluid font sizes → 8 tokens.
- **P-03 (scroll-margin):** out of scope, per user's explicit padding/margin/gap/inset wording; untouched.
- **P-04 (hero label floor):** `.position-copy h1 span` → `max(0.2em, var(--fs-1))`.
- **P-05 (alias direction):** `--state-active`/`--state-hover` alias the sidebar tokens, not the reverse.

## Deviations from Plan

### Auto-fixed / Rule 2 additions

1. **[Rule 2 — missing recipe naming] Added a 6th named colour recipe, `--scrollbar-thumb`.** The plan's table named 5 recipes; `color-mix(in oklch, var(--muted-foreground) 45%, transparent)` also recurs (the Firefox `scrollbar-color` and WebKit `::-webkit-scrollbar-thumb` for `.artifact-document pre`), and the guard's own "recurring recipe" check — which the plan itself requires — would fail on the real file if it stayed unnamed. Files: `src/web/styles/globals.css`, `test/web/visual-contract.test.ts`. Commit: `55c010f`.
2. **[Rule 1 — test pin updates] Two pre-existing pinned counts in `test/web/visual-contract.test.ts` needed updating** as a direct, intentional consequence of index.html edits this plan required: the link-weight assertion (`font-weight: 600` → `font-weight: var(--fw-semibold)`, same weight) and the index.html line-count pin (165 → 167 after Task 2's `--font-mono` split, then → 143 after Task 3's colour cleanup). Commits: `4f5f3c6`, `55c010f`.
3. **`.metadata-panels`'s `padding: 1px`** (paired with its `gap: 1px` divider, but not itself named in the allowlist) mechanically snapped to `var(--space-0-5)` (2px) per the plan's own snap rule — a ~1px increase to that grid gutter's outer padding. Not allowlisted since the plan only named the two `gap: 1px` rules as exceptions.

### Out-of-scope, not fixed

- `test/rendering/markdown.test.ts`'s "renders the real Phase 1 plan..." test fails on a missing file (`.planning/phases/01-read-layer-domain-model/01-04-PLAN.md`), broken by the unrelated `chore: archive v1.0 milestone files` commit (`1857c97`) before this plan started. Confirmed pre-existing and unrelated to any CSS/token change; left untouched per the scope-boundary rule.

## Human-Check Findings (final screenshots, both themes)

Reviewed `$S/shots-final/{light,dark}-{dashboard,plan}.png`:
- **Corners:** square in both themes, both pages — confirmed.
- **Hero/section heading hierarchy:** the dashboard's large "Bulk Archive Downloads" heading and its supporting cards render with clear size/weight hierarchy in both themes — confirmed.
- **Task-list checkboxes / `.artifact-path`, `.metadata-record dt`, `.plan-section-label` mono rendering:** the captured plan-page viewport (scrolled to the document header/metadata panel) did not include a task-list block or the specific labeled elements in frame, so this could not be visually confirmed from the four captured screenshots. The inline code spans visible on that page (`VerifiedIdentity`, `backend/src/auth/mod.rs`) do render in a monospace face in both themes, consistent with `--font-mono` being wired correctly. No visual regressions were observed anywhere in the four screenshots.

## Self-Check

- `test/token-guard.test.ts` exists and all 6 tests pass: FOUND
- `src/web/styles/globals.css` scale block exists with `--space-4: 1rem`: FOUND
- `index.html` mirrors `--font-mono`: FOUND
- Commits `6b72449`, `4f5f3c6`, `55c010f` exist on `master`: FOUND

## Self-Check: PASSED
