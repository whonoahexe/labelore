---
phase: quick-261024-vty
plan: 01
subsystem: planning-files drawer
tags: [drawer, sketch-038, two-column, quick-tasks, phone]
status: complete
requires: []
provides:
  - "GET /api/drawer: a read-only projection of places and their files"
  - "two-column planning-files drawer body"
affects: [planning-files drawer, shell]
key-files:
  created:
    - src/presentation/drawer.ts
    - src/presentation/drawer-route.ts
    - src/web/components/planning-places.tsx
    - test/presentation/drawer.test.ts
    - test/e2e/planning-drawer.spec.ts
  modified:
    - src/server/index.ts
    - src/web/components/sidebar-drawer.tsx
    - src/web/styles/globals.css
    - src/planning-repo/naming.ts
    - src/presentation/tree-labels.ts
    - src/presentation/roadmap.ts
    - docs/design-language.md
  deleted:
    - src/web/components/tree-navigator.tsx
decisions:
  - "The drawer takes its data from a new /api/drawer projection; /api/tree stays served only for its existing tests."
  - "The chosen place is derived while rendering from the route, not set in an effect, so the drawer never flashes a stale place."
  - "When nothing holds the current page and there is no live phase, the drawer opens on the current quick tasks, then the newest shipped milestone."
commits: 3
plan_head_before: c6115152217e0c2c4d4ce0b79ff6af786fb062de
plan_head_after: 605a68423eb0488f8a5f4dc084d50481f0c0ad7f
actuals:
  tokens: 32800
  tasks: 3
  commits: 3
---

# Quick task 261024-vty: the two-column planning-files drawer, built from sketch 038 C

The drawer is now two columns wide (about 38rem). Places sit on the left and the chosen place's files sit on the right. On a phone it is one column that drills from the places into the files and back.

## What you now see

**On desktop**

- The left column has two headings. **Current** (with the live milestone's version when there is one) lists the current phases, each with its number, name and `done/total` plans, then a `Quick tasks` row with a count. **Shipped** has one row per milestone, newest first, with its version, its name from the milestones file and its ship date. Choosing a shipped milestone unfolds its phases and its `Quick tasks` row underneath, indented.
- The right column starts with a header that says where you are (for example `v1.1 · Phase 05`), the name, and for a phase a status chip (Complete, In progress, Researched, Discussed, or Not started).
- A phase's files come in three stages in the existing lifecycle order: **Before plans** (context, discussion log, spec, research and so on), **Plans** (one row per plan, a square that fills once its summary exists, and a count such as `6 of 6 done` or `none yet`), then **After** (review, verification, security, UAT, learnings). Anything else in the phase folder lands in a trailing **Other files** stage, so nothing the old tree showed has disappeared.
- A shipped milestone's own place lists its documents (Roadmap, Requirements, Milestone audit), its phases, and an `All N quick tasks` row.
- Quick tasks are grouped by month, newest first. Each task is one row (short date and readable name) that opens to a single row of chips, one per markdown file.
- Each time the drawer opens it lands on the place that holds the page you are on: that shipped milestone is unfolded, the quick task is open, and the row for the current page has the active bar. With no match it opens on the state's current phase, then the first unfinished phase, then the current quick tasks, then the newest shipped milestone.
- The Project and Research groups, the separate Archived phases and Milestones groups, and the expand-all button are gone. The header now holds only the title and the close button.

**On a phone (42rem and below)**

- One column. The places show first. Choosing one shows its files with an `All places` link at the top; the link goes back to the places with the same place still selected. Choosing a phase from a milestone place keeps the files showing.

## What each screenshot shows

All are in `test/e2e/screenshots/vty/` (git-ignored). I opened each one and looked at it.

- `desktop-light.png`: the drawer on the first plan of v1.1 phase 05, light theme. Left: Current with `Quick tasks 40`, Shipped with v1.1 unfolded (phase 05 selected, `Quick tasks 14` beneath) and v1.0. Right: header `V1.1 · PHASE 05`, "Per-Type Document Views", a Complete chip, then Before plans, Plans (`6 OF 6 DONE`, six filled squares, Plan 01 with the active bar), After and Other files.
- `desktop-dark.png`: the same view in the dark theme. It reads the same, with the bar and squares in the accent colour.
- `desktop-quick.png`: the current Quick tasks place. The title reads `Quick tasks · 40`, the month stage reads `OCT 2026`, and the task rows show their short dates. The first task is open to a single `Plan` chip.
- `phone-places.png`: at 375px wide, one column with the places and v1.1 phase 05 selected. No files panel.
- `phone-files.png`: after tapping that place, the files panel with `All places` at the top and the places list hidden.

## Checks

- Drawer unit tests: 33 pass. They cover the phase stages and status words, quick tasks and months, shipped milestones, the route lookups, and degradation. Two coverage tests prove that every markdown file the drawer can place appears in exactly one place, in `fixtures/dense` and in this repository's own `.planning/`.
- `/api/drawer` answers 200 on every portability fixture.
- The five contract tests (shell, visual, loading, degradation, empty state) now point at the new drawer body and styles and keep their invariants. The class-name test passes.
- `npm run typecheck`, `npm run lint` and `npm run build` pass, and the build shows no new warnings.
- `npx playwright test test/e2e/planning-drawer.spec.ts` passes, 8 of 8. I ran only that spec and never the full browser suite.
- The full `npm test` run shows 9 failing tests in 8 files, and all of them were already failing before I started: the plan-pair coverage matrix, the todo and note pages, the sketch notes, a snapshot golden file, the style token guard (3 old violations, none from this work), and three timing checks that miss their 250 ms limit on this machine. I did not touch them.
- The only change under `.planning/` is this summary file.

## Deviations from the plan

- **The chosen place is derived during rendering, not set in an effect.** The plan described resetting it "whenever the drawer opens". The lint rules for this project forbid setting state straight inside an effect, so the component remembers the chosen place along with the open state, route and data it was chosen under. When any of those changes, it falls back to the place that holds the current page. The behaviour is the same, and it avoids a frame of the wrong place.
- **A place row with no number (the Quick tasks rows) spans the number and label tracks.** Without that the count sat right against the label instead of at the right edge. The screenshots above show the fixed version.
- **When the project has nothing at all,** the drawer's default place is the empty current quick tasks place, because the plan's last fallback is the current quick tasks. Phase-less, quick-task-less projects therefore do not get a null default.
- The vitest names that said "11 bounded containers" now say "12", since the shared scrolling rule now names two drawer columns instead of one tree.
- Contract tests whose old assertion was about the tree's open-on-first-paint behaviour were replaced by one that checks the drawer resets its place from the route and has no expand-all control.

## Known gap

- A milestone file under `.planning/milestones/` whose version belongs to a milestone that is still live (not shipped) is not shown in the drawer, because the drawer only lists shipped milestones. Search still finds it. The same goes for files with no recoverable version. This never occurs in this repository or the dense fixture, and the coverage tests spell out this exception.

## Left over

- `/api/tree` and its projection are still served, only so their existing tests keep passing. They are a candidate for later removal.
- The three style-guard violations and the nine failing tests above were failing before this work and are untouched.

## Commits

- `fa17fc3`: two-column drawer with phases and shipped milestones, served from `/api/drawer`
- `26262ab`: quick tasks by month with chip rows, for current and shipped milestones
- `605a684`: phone drill-down with `All places`, and the old tree navigator retired

## Self-Check: PASSED

- Created files exist: `src/presentation/drawer.ts`, `src/presentation/drawer-route.ts`, `src/web/components/planning-places.tsx`, `test/presentation/drawer.test.ts`, `test/e2e/planning-drawer.spec.ts`.
- `src/web/components/tree-navigator.tsx` is gone, as intended.
- All three commits are in the history.
