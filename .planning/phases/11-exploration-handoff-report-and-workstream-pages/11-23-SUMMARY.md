---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 23
subsystem: web-views
tags: [thread, view-16, status-dial, sketch-058, view-kind]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-14 winner 058 A (Status dial), 11-20 structured.thread lift, 11-22 seedThreadLinks context on /documents (kind thread), 11-08 made-up Lendshed threads, 11-01 adopted X2, 11-22 view-contract idioms"
provides:
  - "The 'thread' view kind (36th) and its manifest: every threads/*.md opens the Status dial page"
  - "composeThread (pure), ThreadView and threadHeaderProps, the phase-11-thread CSS block, design-language rows and the thread Language bullet"
affects: [11-27, 11-30]

tech-stack:
  added: []
  patterns:
    - "A dial drawn as SVG arcs whose geometry is plain arithmetic on the status, coloured only by the tone class a path carries"
    - "A header override that always supplies a meta item (the file name stem when the file has no slug), because ArtifactHeader only lays its meta row out when meta is present"

key-files:
  created:
    - src/web/views/thread-page.ts
    - src/web/views/thread-page-components.tsx
    - test/web/thread-page.test.ts
  modified:
    - src/web/pages/artifact-page.tsx
    - src/web/views/kinds.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/web/view-registry.test.ts

key-decisions:
  - "No fourth Lendshed thread (steward-rota-view) was added: the empty-next-steps state is covered by a planted copy in the test (the older-shape offline-mode thread also carries it for real), so no pinned fixture count moves."
  - "An older-shape thread's created day comes from its leading '*Created {date}.*' Context note (the lift reads frontmatter only); the note is taken out of the Context text because the dial card draws the date. A note whose date cannot be read stays in the Context."
  - "Status words: open, in_progress and resolved (any case, spaces or hyphens for underscores, so the older OPEN and IN PROGRESS) read as the three dial positions; any other word is shown verbatim, quiet, every arc grey, needle at rest."
  - "No status stated: no chip and no dial; the card still shows any dates. No dates and no status: no card, and the band is one column."
  - "Reference state is 'resolved', 'not-found' or 'text'. 'text' means prose, or any path when the links context is missing (nothing was checked, so no Not found is claimed). Free text gets a filled neutral square drawn by the page's own rule, not a new tone."
  - "Age ('{n} days since the last update') counts to presentation.readAt from the links context, never the browser clock; 'updated today' at zero and nothing for a future date."

patterns-established:
  - "Goal, Context and prose are split into blocks and 'NAME=value' pairs are masked in the composer (reusing the seed page's segmentsOf), so the component never sees a value"

requirements-completed: [VIEW-16]

actuals:
  tokens: 16500
  tasks: 3
  commits: 3

duration: 40min
completed: 2026-11-07
status: complete
commits: 3
plan_head_before: 54a524811b93831ae74c8db15b0aba10d03efb4f
plan_head_after: f999d0de1290d2362819ddcb80a5a20691986e52
---

# Phase 11 Plan 23: Thread page Summary

**Every thread opens the Status dial from sketch 058 A: a half-dial of Open, In progress and Resolved with the needle on the thread's own status, the status chip, Created, Updated and the age of the last update, beside the author's next steps numbered in their order (the first boxed), over Goal, with Context and References below; a reference links only when it names a payload artifact.**

## Performance

- **Duration:** about 40 min
- **Tasks:** 3 (Task 1 a tracer, verified end to end through the screenshot helper before expansion)
- **Files created:** 3, modified: 7

## Accomplishments

- Task 1 (tracer): the `thread` view kind (36), the manifest with `threadPage: composeThread` and the promote fallback, the composer (head, status, dates, age, steps, goal, context, references), the dial card and steps, the `phase-11-thread` CSS block and the artifact-page wiring (one `useMemo`, header props, one render branch). A real browser opened the page before anything was expanded.
- Task 2: Goal, Context and References, the unrecognised status, the older shape, empty next steps and the fall-through, 37 tests with the view contract, the three tone rows in design-language and the thread Language bullet.
- Task 3: side-by-side with the 058 winner; two fixes and one size correction came out of it.

| State | Thread | What the page draws |
|-------|--------|---------------------|
| in progress | loan-limit-policy | top arc in flight, needle up, chip "in progress", Created, Updated, "{n} days since the last update", three numbered steps in the fixture's words (first boxed), Goal, two Context bullets, References: a link (`complete` square) and free text |
| resolved | kiosk-printer-swap | right arc `complete`, chip "resolved", three steps, one link reference |
| older shape | offline-mode | OPEN read from the body as open (in flight, left arc), title from `# Thread:`, Created from the Context note, no Updated and no age, no steps and no References (the placeholder bullets are absent), the file name stem as meta |
| a thread that carries only a status | Shapes kiln-vendor-call | dial and chip; no dates, steps or sections |
| unrecognised status | planted `parked` | `parked` verbatim, dashed quiet chip, every arc grey, needle at rest |
| empty next steps | planted | no Next steps heading and no placeholder line; everything else draws |
| none of the known fields | planted bare thread | `composeThread` null, promoted sections silently (X2) |

## Side-by-side with the 058 winner (Task 3)

Shots, into a temporary folder outside the repository (never committed): Lendshed's three threads and Shapes' kiln-vendor-call through `shoot-pages.ts`, Lendshed's thread beside sketch 058 A, and by hand the real thread in the D-14 scratch copy (`--root` on the scratch copy), at 1280 and 390, light and dark: 28 PNGs, no FAIL line, no sideways scroll at either width (scrollWidth equals clientWidth). A probe of computed font sizes on the built page finds exactly the four contracted ones (76.8px at 1280 or 44.8px at 390, 20.8px, 13.12px, 11.2px).

Matches the layout contract (a dial card 352px wide beside the steps at 1280 and one column, dial first, at 390; the first step boxed at heading size; Context and References in two columns at 1280 and one at 390; steps and goal wrap, mono paths wrap). What changed after the side-by-side:

1. **The big status chip is mono.** The app's shared `.status-chip` is the heading font; the sketch draws the dial's chip in mono at heading size. The page-scoped rule now sets the mono family.
2. **A thread with no slug lost its header row.** The older shape and Shapes' thread have no `slug` frontmatter, so no meta item was passed, and ArtifactHeader then drops its meta row layout (the copy icon and View/Source toggle fell onto separate lines). The meta is now the slug, else the file name stem (what the sketch calls the slug).
3. **The Not found chip takes the label size.** The shared chip sets a size outside the four; the references take `--fs-2` inside the page, as the seed page does.

Differences kept on purpose: the header is the app's own (crumbs "Dashboard / Roadmap / {slug}", the Copy path icon and View/Source on the right) rather than the sketch's mock header and "Lendshed / Threads" crumbs; ages count to the real read day (209 days, not the sketch's 9); the Context bullets sit as one paragraph when the file wrote a paragraph (the older shape), where the sketch drew a bullet. The real-shape thread at 390px: no overflow; long paths and the code spans wrap inside the column.

## Task Commits

1. **Task 1: A thread opens with its status and numbered next steps first** - `b268120` (feat)
2. **Task 2: Every thread state and the references** - `55f60e9` (feat)
3. **Task 3: The thread page after the side-by-side** - `f999d0d` (fix)

**Plan metadata:** the commit that adds this SUMMARY.

## Verification

- Full gate (`npm run test:gate`): total=6854 passed=6854 failed=0 skipped=0 todo=0; typecheck, lint and `npm run build` clean.
- Task 1 and Task 2 targeted gates, and the Task 3 screenshot command (28 PNGs, no FAIL), pass.
- Not done: `systemctl --user restart labelore` (named in all three tasks and in Task 2 and 3's verify). The service serves the main checkout, not this worktree; after the merge the main checkout needs `npm run build` and a restart.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] A thread with no slug broke the header layout**
- **Found during:** Task 3 (the older-shape and Shapes shots)
- **Fix:** header meta falls back to the file name stem; `threadHeaderProps` takes the artifact path as an optional third argument; test added.
- **Commit:** f999d0d

**2. [Rule 1 - Bug] `data-tone="off"` failed the class-vocabulary tone check**
- **Found during:** Task 1 verify
- **Fix:** an arc that is not the thread's own carries no `data-tone` at all (grey by default), so no undocumented tone is written.
- **Commit:** b268120

### Plan wording versus the build

- The 058 README suggests adding `steward-rota-view` to the fixtures if the build needs a current-shape thread with no steps. It was not added (see key decisions): the planted copy in the test covers the state without shifting any pinned count.
- Task verify commands end with `systemctl --user restart labelore`; skipped in the worktree (see Verification).

**Total deviations:** 2 auto-fixed, 2 notes. **Impact:** none on scope.

## Flagged assumptions

- **VIEW-16 edge probe (owner 11-23), answered.** Two thread files carrying one slug: each page composes only from its own file (tested: both open, each with its own title; the React key is the path). Next steps past the 200-item lift bound: the page draws every step the lift kept, in order, and makes no count claim; Source mode is the complete read.
- **Free text outside the headings is not shown.** Shapes' kiln-vendor-call has a sentence under its heading that the 11-20 lift does not carry; the page shows the status and View/Source still reaches the sentence. A fix belongs in the lift, not here.
- **The older shape's status word** comes from the lift (`## Status: OPEN`); only `open` was seen for real, so `in_progress` and `resolved` on a real file are drawn from the workflow's documented set.
- **Steps carry no done flag** in the file, so the page shows only the status, never progress through the steps (as the sketch notes).
- **Value leakage to search or the index** (UI-SPEC open item 4) is not scope here and was not checked; the page draws only the name and the shared mark for a `NAME=value` pair.
- **A reference bullet that lists several paths** links and checks the first path only (as on the seed page).

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-11-57: every string reaches the DOM as React text through ResearchInline, the contract test forbids the raw-HTML prop, and the one `Link` takes a server-resolved payload address (`..`, absolute and backslash paths never resolve in `buildSeedThreadLinks`).

## Self-Check: PASSED

- Created files exist: thread-page.ts, thread-page-components.tsx, thread-page.test.ts all FOUND.
- Commits `b268120`, `55f60e9` and `f999d0d` are ancestors of HEAD.
- Acceptance checks: `'thread'` in kinds.ts 1, `toBe(36)` in view-registry.test.ts 1, `threadPage` in manifests.ts 1, `phase-11-thread:start` in globals.css 1, "view contract" in thread-page.test.ts 3.
