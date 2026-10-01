---
phase: quick-261001-qk6
plan: 01
subsystem: ui
tags: [ui-spec, view-registry, extractor, sketch-014, side-by-side]
requires: [quick-260930-wfs]
provides: [UiSpecHandler, extractUiSpec, composeUiSpec, UiSpecView]
affects: [src/planning-repo/handlers, src/web/views, src/web/pages/artifact-page.tsx, src/web/styles/globals.css]
key-files:
  created:
    - src/planning-repo/handlers/ui-spec-contract.ts
    - src/planning-repo/handlers/ui-spec.ts
    - src/web/views/ui-spec.ts
    - src/web/views/ui-spec-components.tsx
    - test/ui-spec-contract.test.ts
    - test/web/ui-spec.test.ts
    - test/web/ui-spec-corpus.test.ts
    - test/web/ui-spec-view-contract.test.ts
    - test/e2e/ui-spec-page.spec.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/components/copy-path-button.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/__golden__/dense.json
    - test/e2e/measure.ts
decisions:
  - "Frontmatter strings are read as written by the extractor (phase 04, created 2026-07-24)"
  - "Registry group labels check reuse before new: 'already installed, reused' is Reused"
status: complete
commits: 3
plan_head_before: 7633dc2667b4f4377c710f83c315f6762e8ee883
plan_head_after: 909bb1084b769b7eaec7c36a8c1da6aa4b5c3673
actuals:
  tasks: 3
  commits: 3
---

# Phase quick-261001-qk6 Plan 01: UI-SPEC page view Summary

Sketch 014's winner (B's shadcn choice card + A's no copy section) built as the UI-SPEC page: a server-side tolerant `extractUiSpec` and `UiSpecHandler` (`structured.uiSpec`), a pure `composeUiSpec`, and `UiSpecView` / `UiSpecIntroMeta` (cover with sign-off chip and dialog, four choice cards, spacing ruler, type ladder, 60/30/10 colour bar and role cards, coverage meter and element x state matrix, registry verdict and cards, "In the source only" strip), wired through the same seam as PATTERNS.

## Worktree

- Path: `/home/cinedise/labelore/.claude/worktrees/agent-aaaa31b9a3399fe64`
- Branch: `worktree-agent-aaaa31b9a3399fe64`
- Base commit: `7633dc2667b4f4377c710f83c315f6762e8ee883`
- Commits (3):
  - `36dee0e` Task 1 (tracer): extractor, handler, composer, cover, sign-off dialog, matrix, golden, tests
  - `2bccc57` Task 2: choice cards, scale specimens, registry, source-only strip, CSS block, design-language.md, view contract
  - `909bb10` Task 3: e2e spec, measure.ts selectors, fixes from the side-by-side

## Gates

Full `npx vitest run` 91 files / 1699 tests pass; `npm run typecheck` and `npx eslint src test` clean. e2e not run (written only). `dense.json` changed only by `structured.uiSpec` on the fixture's 01-UI-SPEC.md (5 snapshot copies, 5 `"structured": {}` replaced).

## Corpus (12 files; counts independently confirmed with an awk scan over the Status column)

| Doc | Sign-off chip | Status | Elements | Rows cov/bs/un/dis | Source-only entries |
|---|---|---|---|---|---|
| sp v1.0/04 | Signed off 6/6 | (approved, hidden) | 10 | 78 (57/6/0/15) | Layout, Motion & Reduced-Motion Contract, Screen-Reader / Live-Region Contract, Copywriting Contract, Checker's notes, How coverage was probed, UI Considerations lift rule, Status vocabulary, Scope note, Generator note, Frontmatter (11) |
| lb v1.0/02 | Signed off 6/6 | - | 15 | 104 (90/1/9/4) | Revision Summary + 6 revision chapters + Revision Considerations ("(Revision …)" stripped), Copywriting Contract, probe/lift/vocab, Frontmatter (13) |
| sp v1.0/02 | Signed off 6/6 | - | 6 | 39 (39/0/0/0) | Layout, Motion, Screen-Reader, Copywriting, Checker's notes, probe, Generator note, Frontmatter (8) |
| lb v1.0/03 | Sign-off 6/7 · 1 flag | - | 5 | 38 (32/3/0/3) | Component Inventory, Copywriting Contract, Checker's notes, probe, Scope note, Generator note, Frontmatter (7) |
| sp phases/01 | Signed off 6/6 | - | 4 | 28 (21/1/0/6) | 4 chapters + Copywriting, Checker's notes, Scope, Generator, Frontmatter (9) |
| fixture phases/01 | Sign-off not run | draft | 0 | 0 | Copywriting Contract, Generator note, Frontmatter (3) |
| lb v1.1/05 | Sign-off not run | draft | 8 | 53 (39/0/0/14) | 4 chapters, Copywriting, probe, Scope, Generator, Frontmatter (9) |
| lb v1.0/04 | Sign-off not run | draft | 6 | 21 (13/2/0/6) | Component Inventory, Copywriting, probe, Scope, Generator, Frontmatter (6) |
| sp v1.0/03 | Sign-off 5/6 · 1 flag | - | 5 | 14 (13/1/0/0) | Copywriting, probe, lift rule, vocab, Scope, Generator, Frontmatter (7) |
| sp phases/02 | Signed off 6/6 | - | 8 | 34 (18/2/0/14) | 4 chapters, Copywriting, probe, Scope, Generator, Frontmatter (9) |
| sp phases/03 | Signed off 6/6 | draft | 7 (no phantom elements from the Element \| Kinds table) | 42 (27/7/0/8) | 9 chapters, Copywriting, probe, Scope, Generator, Frontmatter (14) |
| sp phases/04 | Sign-off 5/6 · 1 flag | - | 4 | 30 (25/5/0/0) | 4 chapters, Copywriting, Scope, Generator, Frontmatter (8) |

Each doc has chapters 01 Design system, 02 UI considerations, 03 Registry safety; none overflows horizontally at 1440. Pinned in `test/web/ui-spec-corpus.test.ts`.

## Discretion decisions as built

- Frontmatter strings as written (extractor reads the keys itself): "Phase 04", "2026-07-24".
- Title from the slug (dashes to spaces, first letter capitalised), else H1 minus "Phase N —" / "— UI Design Contract".
- Scope note, Generator note and Frontmatter go to the source-only strip, targeting the top of Source (`null`).
- No Document metadata disclosure in View mode: the condition reads the composed `uiSpec` (`specCover`), nested inside the existing `{panels.length > 0 ? (…) : null}` so test/web/empty-state-contract.test.ts still holds. Source mode keeps it.
- Swatches/samples: `safeColor` (hex 3/4/6/8, or `oklch(` of digits . % space / - + or `none`, <= 64 chars) -> only `--swatch-light` / `--swatch-dark` values; type samples take numeric size (cap 72), weight, line height (0.8-3); fonts by `data-face`. Split key reads "Proportion of the screen · painted with the doc's own values".
- Type sample text: display = page title; heading/body/label keep the sketch strings; others the pangram.
- Element codes from `(E#…)` or a leading `E#` token; kinds from a heading parenthetical (only when every item is a lower-case kebab token, so "(added this revision)" is not kinds), an `Element kinds` line, or the preamble `Element | Kinds` table. A pre-`###` table is a considerations table only with a Category/Consideration and a Status column.
- Empty considerations (fixture): chapter 02 keeps only the author's count line ("none applicable (fixture)"); the count line is excluded from "How coverage was probed", so the fixture has no such entry.
- Sign-off chip is a plain `status-chip` with a Maximize2 icon; the sketch's larger `.signoff-chip` padding is not carried over (F-05).
- Lead stays verbatim and hidden behind the cover in View mode.
- e2e written, not run.
- Choice-card border uses the existing `--figure-node-border` token (primary mixed into border) rather than a new :root token.

Beyond the plan: the author's count falls back to a prose "N applicable …" line (lb v1.1/05); "base color" counts as `base` in the shadcn kv list; `copyText` is exported from copy-path-button.tsx.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Sketch groups "already installed, reused" blocks under "New this phase"**
- Found during: Task 2 tests (sp v1.0/04 registry)
- Issue: the sketch's group label tested `install` before `already|reuse`, so Card/Badge/… (already installed, reused) were labelled New.
- Fix: check reuse first; merge same-label groups (also removes duplicate React keys).
- Files: src/web/views/ui-spec.ts (2bccc57)

**2. [Rule 1 - Bug] Matrix table collapsed to content width** (global `table { display: block }`): fixed with `display: table` on `.view-ui-spec-matrix`. (909bb10)

**3. [Rule 1 - Bug] Reserved-for lists** lost their numbers (global list reset) and showed a stray `**` / truncated wrapped text when the lead carried its text on the same line. Fixed in CSS (`list-style: decimal`) and in the extractor (with a unit test). (909bb10)

**4. [Rule 3 - Blocking] Metadata-disclosure guard** reshaped (nested inside the existing `panels.length > 0` conditional) to keep `test/web/empty-state-contract.test.ts` passing.

## Side-by-side evidence (gsd-browser, session qk6-ui-spec)

Captured by `capture-side-by-side.mjs` (copy at `.planning/quick/261001-qk6-ui-spec-page-view/capture-side-by-side.mjs`; run from the worktree root against scratch production servers on 5196/5197/5198, stopped by PID afterwards; 4173/4174/4198/4199 untouched). Output: `/home/cinedise/labelore/test/e2e/screenshots/qk6/` (gitignored); `report.json` there holds per-doc facts and `overflowX`.

Composed pairs (sketch left, build right): `sp04-light`, `lb02-light`, `sp02-light`, `lb03-light`, `sp01-light`, `fx01-light`, `sp04-dark`, `lb02-dark`, `sp02-dark`, `sp04-cell-light`, `sp04-signoff-light`, `sp04-phone-light` (`{id}.png`, plus `-sketch.png` / `-build.png` halves and the composing `.html`). Build-only: `lb05`, `lb04`, `sp-p2`, `sp-p3`, `sp-p4`, `sp03` (`{id}-light.png`).

Actually read against the Winner (halves cropped to native size): sp04 light (cover, cards, ruler, ladder, colour, meter/matrix, selected cell, registry, strip), sp04 sign-off dialog, sp04 phone (colour and reserved-for section), sp02 light and dark (hex L/D swatches), fx01 (top to bottom), lb02 matrix (15 elements, OTHER column), sp-p3 bottom (7 elements, no phantom rows, source-only strip). Not read in detail: lb03, sp01, lb05, lb04, sp-p2, sp-p4, sp03 images (checked by report.json metrics only: counts, chip, chapters, overflow).

Changes made because of the side-by-side (old -> new, why): matrix `display:block` -> `table` (it hugged the left); Usage button below the ruler -> beside it (sketch layout); reserved-for lists gained numbers; chapter inner gap 16px -> 0 with an explicit heading margin (spacing between blocks now follows the sketch); stray `**` and wrapped-line truncation in reserved-for text; registry "Reused" labels.

## Winner deviations left in place (and why)

- Sign-off chip, "Needs a person" chips and their states use the shared `status-chip` metrics (slightly different from the sketch's chip) - F-05 requires one chip signature.
- The display rung samples the page title ("Tier to tier transfers") instead of the sketch's "Tiers at a glance" - planner decision.
- The colour bar key says "the doc's own values" (theme-picked) rather than "light values" - planner decision.
- Breadcrumbs above the eyebrow are app chrome, not in the sketch.
- At 390px the third colour-bar segment label clips ("ACCEN"): the segment is narrower than its label and the label is `overflow: hidden`. Accepted.
- Sketch bug not carried over: "New this phase · 10" for reused blocks (Deviation 1).
- The kv list shows `base neutral` where the sketch showed only style and theme (more of what the doc states).

## Known Stubs

None. No placeholders; every value comes from the document.

## Threat Flags

None beyond the plan's `<threat_model>`; no new network endpoints or file access. `safeColor` and the style-key allowlist are enforced by `test/web/ui-spec-view-contract.test.ts` and `test/web/ui-spec.test.ts`.

## Operator next steps (post-merge, on master)

1. `npx playwright test test/e2e/ui-spec-page.spec.ts -g "UI-SPEC page"` once (on a failure re-run only that test).
2. `npm run build && systemctl --user restart labelore` (new server handler).
3. Human check: on http://cinedise:4173 (hard refresh), both themes at 1440, open studio-portal v1.0/04 and phases/03 UI-SPEC beside http://cinedise:4174/014-ui-spec-page/; open the sign-off dialog, copy the preset, click a backstop square, check a phone width once; look through the composed pairs in `test/e2e/screenshots/qk6/`.

## Follow-up candidates

- Matrix element names are ellipsised hard on the phone (8.5rem); a long-name doc (lb v1.0/02) would benefit from a two-line clamp.
- Author's count disagrees with rows in lb v1.0/02 ("103 applicable - 89 …" vs 104 rows / 90 covered); shown as written, the meter follows the rows.
- lb v1.0/03: dimension 2 is an unchecked FLAG with an approval; consider surfacing "non-blocking" in the dialog.
- The foundation sweep (`test/e2e/foundation-consistency.spec.ts`) was not run; a UI-SPEC fixture may be worth adding to its per-type list.

## Self-Check: PASSED

- Files exist: the three src modules, four new test files, test/e2e/ui-spec-page.spec.ts, qk6 screenshots and report.json.
- Commits 36dee0e, 2bccc57, 909bb10 exist on the worktree branch; `git rev-list --count 7633dc2..HEAD` = 3.
