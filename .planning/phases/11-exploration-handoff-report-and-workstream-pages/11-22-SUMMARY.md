---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 22
subsystem: web-views
tags: [seed, view-15, seed-packet, sketch-057, links-context, view-kind]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-14 winner 057 C (Seed packet), 11-20 structured.seed lift, 11-08 made-up Lendshed seeds, 11-01 adopted X2, 11-19 token-guard and view-contract idioms"
provides:
  - "The 'seed' view kind (35th) and its manifest: every seeds/SEED-*.md opens the Seed packet page"
  - "buildSeedThreadLinks and the seedThreadLinks key on /documents for kinds seed and thread: breadcrumbs and thread references resolved to payload addresses, plus readAt (11-23 reads it for threads)"
  - "composeSeed (pure), SeedView and seedHeaderProps, the phase-11-seed CSS block, design-language rows and the seed Language bullet"
affects: [11-23, 11-27, 11-30]

tech-stack:
  added: []
  patterns:
    - "A links context built server-side from the presentation (path to payload url, else null) so a composer holds no resolver and no regex"
    - "A page that needs 'name=value' masking splits prose into text and withheld segments in the composer, never in the component"

key-files:
  created:
    - src/presentation/seed-thread-links.ts
    - src/web/views/seed-page.ts
    - src/web/views/seed-page-components.tsx
    - test/presentation/seed-thread-links.test.ts
    - test/web/seed-page.test.ts
  modified:
    - src/server/project-api.ts
    - src/web/pages/artifact-page.tsx
    - src/web/views/kinds.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/web/view-registry.test.ts
    - test/helpers/shoot-pages.ts

key-decisions:
  - "No fourth Lendshed seed was added: SEED-260304 already carries the unresolved-breadcrumb state (two of three breadcrumbs name no payload artifact), and the triggered, large and parked states are covered by planted copies in the test. Adding SEED-260402-w9d would have shifted pinned fixture counts for no page state the fixtures lack."
  - "A closed bar (Scope estimate, When to surface, Notes) appears only when the author wrote something there. The writer's stock sentence and Notes boilerplate read as absent (11-20), so When to surface and Notes bars show on Lendshed and the real-shape seeds only when a seed carries real words; the sketch drew all three bars on made-up text that kept the boilerplate."
  - "Breadcrumb state is 'resolved', 'not-found' or 'text'. 'text' means prose, or any path when the links context is missing (nothing was checked, so no Not found chip is claimed)."
  - "A bullet that lists several paths ('`a`, `b` - words') checks and links the first path only; the rest sit in the words beside it as inline code. The leading comma is dropped."
  - "Age ('{n} days since planted') counts to presentation.readAt carried in the links context, never the browser clock; 'planted today' at zero and nothing for a future date."

patterns-established:
  - "State name 'not-found' (not 'missing') for a path that names no artifact, so the page never writes the `missing` tone by accident and the contract regex stays simple"
  - "Page-private square size class (view-seed-sq) beside the shared status-square, because the project page's guard forbids .status-square outside its own block"

requirements-completed: [VIEW-15]

actuals:
  tokens: 33800
  tasks: 3
  commits: 4

duration: 70min
completed: 2026-11-07
status: complete
commits: 4
plan_head_before: 7e5a63b60a29bd45b6742dd2bd3f554b3d192091
plan_head_after: e56a1d6133322828cc2f96fd11cc28e44d7a6a3b
---

# Phase 11 Plan 22: Seed page Summary

**Every seed opens the Seed packet from sketch 057 C: an envelope with a postmark, a dashed scope stamp, "Planted during", the "Surface when" sentence as the address (verbatim, never judged) and the status as a seal, over audit, Why, Breadcrumbs that link only when they name a payload artifact, and closed bars that hold only what the author wrote.**

## Performance

- **Duration:** about 70 min
- **Tasks:** 3 (Task 1 a tracer, verified end to end through the screenshot helper before expansion)
- **Files created:** 5, modified: 9

## Accomplishments

- Task 1 (tracer): the `seed` view kind (35), the manifest with `seedPage: composeSeed` and the promote fallback, `buildSeedThreadLinks` (exact path, under `.planning/`, or a uniquely named bare file; `..`, a leading slash and a backslash never resolve), the `seedThreadLinks` guarded IIFE on `/documents` for seeds and threads, and the page, CSS and artifact-page wiring. A real browser opened the page before anything was expanded.
- Task 2: every state in the behavior block (see the table below), the view contract test, design-language tone uses and the seed Language bullet.
- Task 3: side-by-side with the 057 winner on every Lendshed seed, Shapes' seed and both real-shape seeds, at 1280 and 390, light and dark; three fixes came out of it.

| State | Seed | What the page draws |
|-------|------|---------------------|
| trigger, scope, audit | SEED-260304 | dormant quiet seal, trigger verbatim, Medium stamp, `audit_acknowledged v1.0 · 2026-03-20 · dormant`, one breadcrumb link and two plain paths with Not found |
| no `trigger_when` | SEED-260411 | dashed "No surfacing condition", active in-flight seal, Small stamp |
| writer placeholders | SEED-003 | "Scope not stated" stamp (`?`), "when relevant" verbatim, no Why, no Breadcrumbs, no bars |
| a thin file | Shapes SEED-001 | idea as the h1, the `**Trigger:**` line outside any heading as the address, no postmark or seal |
| unrecognised status | planted `parked` | `parked` verbatim, quiet |
| triggered, large | planted | in-flight seal, L stamp (the sketch-only SEED-260402-w9d state) |
| none of the known fields | planted bare idea | `composeSeed` null, promoted sections silently (X2) |

## Side-by-side with the 057 winner (Task 3)

Shots: Lendshed's three seeds, Shapes' SEED-001 and, by hand into a temporary folder outside the repository (never committed), the two real seeds in the D-14 scratch copy, 28 PNGs, no FAIL line, no sideways scroll at 390. Computed font sizes on the built page are exactly the four contracted ones (76.8px or 44.8px, 20.8px, 13.12px, 11.2px).

Matches the layout contract (packet at most 48rem and centred at 1280, full column at 390; the flap, postmark, stamp, address rule, foot and seal; the breadcrumb rows; the closed bars). What changed after the side-by-side:

1. **Absence is dashed.** The app's shared quiet chip is solid; the sketch draws "No surfacing condition" and "Not found" dashed. The seed block now sets them dashed with no fill.
2. **A second path no longer leaves a leading comma.** Both real seeds list several paths in one bullet ("`a`, `b`, `c` - words"); the words beside the first path began with ", ". The splitter drops that comma.
3. **The seal stays left when the foot wraps at 390px**, as the sketch draws it (it had drifted right).

Differences kept on purpose: the header is the app's own (crumbs "Dashboard / Roadmap / {id}", the Copy path icon and View/Source toggle on the right) rather than the sketch's mock header; the shared status chip is a few pixels larger than the sketch's chip; a breadcrumb outside `.planning/` (the sketch drew `frontend/app/globals.css` as found) reads Not found because only payload artifacts resolve; ages count to the real read day (248 days, not the sketch's 48); the sketch's "When to surface" and "Notes" bars are absent where the file holds only the writer's boilerplate. Real-shape check: the 390px real seed has no overflow; long paths and the multi-path bullet wrap inside the column.

## Task Commits

1. **Task 1: A seed opens its designed page with the idea and its surfacing condition** - `a063855` (feat)
2. **Task 2: Every seed state** - `49ca113` (feat)
3. **Task 3: The page beside its sketch** - `0d176ce` (fix)
4. **Guard fix found by the full gate** - `e56a1d6` (fix)

**Plan metadata:** the commit that adds this SUMMARY.

## Verification

- Full gate (`npm run test:gate`): total=6810 passed=6810 failed=0 skipped=0 todo=0; typecheck, lint and `npm run build` clean.
- Task 1 and Task 2 targeted gates, and the Task 3 screenshot command (28 PNGs, no FAIL), pass.
- Not done: `systemctl --user restart labelore`. The service serves the main checkout, not this worktree; after the merge the main checkout needs `npm run build` and a restart.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] test/helpers/shoot-pages.ts could not photograph sketch 057**
- **Found during:** Task 1 (the plan's own verify and Task 3 pass `--sketch .planning/sketches/057-seed-page/index.html`)
- **Issue:** the helper clicks `[data-variant]`, which in this sketch is a hidden section (the tabs are `a[data-tab]`), so a winner that is not the first tab never opened and the run hung on a click that retried for minutes. Plans 11-10 and 11-11 hit the same thing and used throwaway scripts. The sketch also reads `?theme=dark` itself, so its dark shots were light.
- **Fix:** click `[data-tab="{variant}"]` when it exists (else the old selector) and pass `?theme={theme}` in the sketch URL.
- **Files modified:** test/helpers/shoot-pages.ts (outside the plan's file list)
- **Commit:** a063855

**2. [Rule 1 - Bug] `.status-square` selectors in the seed block broke the project page's guard**
- **Found during:** the full gate (test/web/project-view-contract.test.ts forbids `.status-square` outside the project block)
- **Fix:** the seed page sizes its squares with its own `view-seed-sq` class (the pause page does the same with `view-pause-sq`).
- **Commit:** e56a1d6

**3. [Rule 1 - Bug] Leading comma, solid absence chips and a drifting seal** found in the side-by-side; see above. **Commit:** 0d176ce

### Plan wording versus the build

- The plan's Task 1 says SEED-260304's "other" breadcrumb gets null; it has three breadcrumbs, one resolves and two do not, and the test says so.
- No `SEED-260402-w9d` fixture (see key decisions).
- `docs/design-language.md` also got the `complete`, `quiet` and `in-flight` tone rows extended; the `missing` row is untouched on purpose (the seed page never draws it).

**Total deviations:** 3 auto-fixed, 3 notes. **Impact:** none on scope; one helper file outside the list.

## Flagged assumptions

- **VIEW-15 edge probe (owner 11-22), answered.** Two seed files carrying one id: each page composes only from its own file (tested: both open, each with its own idea; the React key is the path). Breadcrumbs past the 200-item lift bound: the page draws every breadcrumb the lift kept and makes no count claim ("{n} of {total}" would be false, the lift cannot know the total); Source mode is the complete read. Both were seen against the real-shape seeds and Lendshed in the screenshot review.
- **Free text outside the headings is not shown.** Shapes' SEED-001 has an intro sentence above its first heading that the 11-20 lift does not carry; the page shows the idea and trigger and View/Source still reaches the sentence. A fix belongs in the lift, not here.
- **Value leakage to search or the index** (UI-SPEC open item 4) is not scope here and was not checked; the page draws only the name and the shared mark for a `NAME=value` pair in the prose.
- A multi-path breadcrumb bullet links and checks the first path only.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-11-35: every string reaches the DOM as React text through ResearchInline, and the contract test forbids the raw-HTML prop. T-11-36: the one `Link` takes a server-resolved payload address; `..`, absolute and backslash paths never resolve. T-11-37: a `NAME=value` pair draws the name and the shared mark, the value never enters the composed model.

## Self-Check: PASSED

- Created files exist: seed-thread-links.ts, seed-page.ts, seed-page-components.tsx, seed-thread-links.test.ts, seed-page.test.ts all FOUND.
- Commits `a063855`, `49ca113`, `0d176ce` and `e56a1d6` are ancestors of HEAD.
- Acceptance checks: `'seed'` in kinds.ts 1, `toBe(35)` in view-registry.test.ts 1, `buildSeedThreadLinks(` in project-api.ts 1, "No surfacing condition" in seed-page.ts 3, `phase-11-seed:start` in globals.css 1, "view contract" in seed-page.test.ts 3.
