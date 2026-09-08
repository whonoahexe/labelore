---
phase: 02-situational-awareness-artifact-reading
plan: 08
subsystem: ui
tags: [react-router, roadmap, deep-link, react, vitest]

# Dependency graph
requires:
  - phase: 02-situational-awareness-artifact-reading
    provides: RoadmapPage, phase/milestone route patterns, buildPhaseUrl/buildMilestoneUrl, RoadmapHandler
provides:
  - "resolveRoadmapDeepLink: pure pathname-to-roadmap-target resolver, DOM-free, same seam as document-reference-activation.ts"
  - "milestoneContainsDeepLink: milestone containment matching against a resolved deep-link target"
  - "RoadmapPage now reads its matched route and opens/scrolls exactly one phase disclosure, opening the enclosing archived milestone when applicable"
  - "RoadmapHandler.parse now sources structured.dependencyShape from the archived-stripped remainder, not the raw body"
  - "artifact-page.tsx warning paragraphs keyed by source+index instead of warning text"
affects: [02-09]

# Actuals (#2632)
actuals:
  tokens: 4461
  tasks: 2
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DOM-free extracted-logic module (roadmap-deep-link.ts) mirroring document-reference-activation.ts, unit-testable with no jsdom"
    - "One-shot imperative DOM effect (ref + guard ref) for deep-link open/scroll, deferred one requestAnimationFrame past the child-first effect order so an enclosing collapsed container has already opened"

key-files:
  created:
    - src/web/pages/roadmap-deep-link.ts
    - test/web/roadmap-deep-link.test.ts
  modified:
    - src/web/pages/roadmap-page.tsx
    - src/planning-repo/handlers/roadmap.ts
    - src/web/pages/artifact-page.tsx
    - test/handlers.test.ts

key-decisions:
  - "Deep-link resolution rebuilds URLs through buildPhaseUrl/buildMilestoneUrl rather than comparing raw path segments, keeping the comparison encoding-proof against the same builders every rendered row's url already comes from."
  - "A single useMemo-derived target computes one targetIndex per MilestoneTree render, guaranteeing at most one phase is ever marked targeted even when duplicate urls exist."
  - "Extracted HistoryMilestone as its own component (rather than inline JSX in a .map) because it needs its own useRef/useEffect for the one-shot archived-milestone open."
  - "Fixed the same key={warning} anti-pattern in the runtime (mermaid-parse-failure) warning list in artifact-page.tsx, not just the two lists named in IN-01 — same file, same bug class, and the plan's own acceptance criteria required zero remaining matches."

patterns-established:
  - "Deep-link imperative DOM effects always pair a one-shot guard ref with a targeted-keyed useEffect, so a re-render never re-fires scroll/open."

requirements-completed: [ROAD-01, NAV-03, NAV-06]

coverage:
  - id: D1
    description: "A phase URL (from buildPhaseUrl, the app's own prose linkifier, or any other producer) opens exactly that phase's disclosure and scrolls its article into view, leaving every other disclosure collapsed."
    requirement: "ROAD-01"
    verification:
      - kind: unit
        ref: "test/web/roadmap-deep-link.test.ts#resolveRoadmapDeepLink"
        status: pass
      - kind: unit
        ref: "test/web/roadmap-deep-link.test.ts#roadmap-page wiring source contract"
        status: pass
    human_judgment: false
  - id: D2
    description: "A phase URL whose phase lives in an archived milestone also opens that milestone's history-milestone details element, and no other archived milestone opens; two same-numbered phases across milestones never collide."
    requirement: "ROAD-01"
    verification:
      - kind: unit
        ref: "test/web/roadmap-deep-link.test.ts#milestoneContainsDeepLink"
        status: pass
    human_judgment: false
  - id: D3
    description: "The bare /roadmap pathname, an unparseable pathname, and a no-match phase token all resolve to no deep-link target without throwing; at most one row is targeted when duplicate urls exist."
    requirement: "ROAD-01"
    verification:
      - kind: unit
        ref: "test/web/roadmap-deep-link.test.ts#resolveRoadmapDeepLink"
        status: pass
    human_judgment: false
  - id: D4
    description: "Actual browser round trip: fetching a real phase url from a running server's /api/roadmap and resolving it through resolveRoadmapDeepLink returns a non-null phase target."
    requirement: "NAV-06"
    verification:
      - kind: manual_procedural
        ref: "node src/server/index.ts /home/cinedise/labelore; fetch /api/roadmap; resolveRoadmapDeepLink(url) -> non-null"
        status: pass
    human_judgment: true
    rationale: "Verified end-to-end during execution (server started, real phase url fetched, resolver confirmed non-null), but the visual open/scroll/collapse behavior in an actual browser was not captured by a screenshot or e2e test in this gap-closure plan (no jsdom/Playwright per plan scope) — a human should confirm the rendered behavior at least once."
  - id: D5
    description: "extractDependencyShape now sources from the archived-stripped remainder, so an archived milestone's diagram can never be surfaced as the live milestone's, even when it appears earlier in the document."
    requirement: null
    verification:
      - kind: unit
        ref: "test/handlers.test.ts#surfaces the live dependency shape, not an archived milestone diagram that appears first"
        status: pass
    human_judgment: false
  - id: D6
    description: "Warning paragraphs (artifact, document, and runtime/mermaid-parse-failure lists) are keyed by source and index instead of warning text, eliminating duplicate-React-key collisions."
    requirement: null
    verification:
      - kind: unit
        ref: "npm test (full suite, 251 passed)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-29
status: complete
---

# Phase 02 Plan 08: Roadmap deep-link resolution, archived-diagram fix, and warning-key dedup Summary

**RoadmapPage now reads its matched route via a DOM-free `resolveRoadmapDeepLink` resolver and imperatively opens/scrolls exactly one phase disclosure — closing verification gap WR-01 — plus the WR-02 archived-diagram leak and IN-01 duplicate-warning-key fixes from the same review.**

## Performance

- **Duration:** ~25 min
- **Completed:** 2026-08-29T13:25:34Z
- **Tasks:** 2 completed
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- Added `src/web/pages/roadmap-deep-link.ts`: `resolveRoadmapDeepLink(pathname)` parses the matched
  route via `parsePresentationUrl` and rebuilds the canonical url through `buildPhaseUrl`/
  `buildMilestoneUrl`, returning `null` (never throwing) on any non-ok result or unrelated route kind.
  `milestoneContainsDeepLink(milestone, target)` matches a milestone against a resolved target,
  handling both phase-scoped and milestone-only targets.
- Wired the resolver into `RoadmapPage`: `useLocation()` + a `useMemo`-derived target, threaded
  through `MilestoneTree` (computing a single `targetIndex` so at most one phase is ever targeted)
  down to `PhaseFlow`, which imperatively opens its `<details>` and scrolls its article into view via
  a one-shot guard ref inside a `requestAnimationFrame`, deferred past the child-first effect order so
  an enclosing archived milestone has already opened before the scroll fires.
- Extracted a new `HistoryMilestone` component that opens only the archived milestone containing the
  deep-link target (via `milestoneContainsDeepLink`), without itself scrolling.
- Fixed WR-02: `RoadmapHandler.parse` now extracts `structured.dependencyShape` from the
  archived-`<details>`-stripped `remainder` instead of the raw `fm.body`, so an archived milestone's
  diagram can no longer win over the live one when it appears earlier in the document. Added a
  regression fixture proving this with distinguishable live/archived markers.
- Fixed IN-01: warning paragraphs in `artifact-page.tsx` (artifact warnings, document warnings, and
  the runtime mermaid-parse-failure warnings) are now keyed by source and index (`artifact-<i>`,
  `document-<i>`, `runtime-<i>`) instead of the warning text itself, eliminating duplicate-key
  collisions on identical warning strings.

## Task Commits

Each task was committed atomically:

1. **Task 1: Resolve the matched route into a single opened, scrolled phase** - `ccb08b3` (feat)
2. **Task 2: Close the two remaining Info-severity anti-patterns the verifier surfaced** - `7b29aa8` (fix)

_Note: Task 1 is a `tracer` task; its `<verify>` (vitest + typecheck + lint) was executed as part of
normal task completion and re-run end-to-end for the tracer feedback gate before Task 2 began — see
Deviations below._

## Files Created/Modified

- `src/web/pages/roadmap-deep-link.ts` - Pure resolver: `resolveRoadmapDeepLink`, `milestoneContainsDeepLink`
- `src/web/pages/roadmap-page.tsx` - `useLocation`/`useMemo` target resolution; `targeted` prop through
  `MilestoneTree`/`PhaseFlow`; new `HistoryMilestone` component; `data-deep-link-target` attribute
- `test/web/roadmap-deep-link.test.ts` - 14 tests: resolver behavior, containment matching, purity, and
  source-contract assertions on `roadmap-page.tsx`'s wiring
- `src/planning-repo/handlers/roadmap.ts` - One-argument change: `extractDependencyShape(remainder)`
- `src/web/pages/artifact-page.tsx` - Warning paragraph keys changed to source+index across three lists
- `test/handlers.test.ts` - New archived-before-live dependency-diagram regression fixture

## Decisions Made

- Rebuild deep-link urls through `buildPhaseUrl`/`buildMilestoneUrl` rather than comparing raw path
  segments — encoding-proof against the same builders every rendered row's `url` already uses.
- Compute one `targetIndex` per `MilestoneTree` render (not per-row independent equality) so the
  ROAD-01 `ordering` truth holds structurally: exactly one row can ever be targeted.
- Extract `HistoryMilestone` as its own component rather than inline `.map` JSX, since it needs its own
  `useRef`/`useEffect` for the one-shot archived-milestone open.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed the same `key={warning}` duplicate-key anti-pattern in the runtime
(mermaid-parse-failure) warning list, not just the two lists IN-01 named**
- **Found during:** Task 2
- **Issue:** `artifact-page.tsx` has a third warning-rendering site (`runtimeWarnings.map`, populated on
  mermaid parse failures) using the identical `key={warning}` pattern IN-01 flagged for the other two
  lists. The plan's own acceptance criterion (`grep -n "key={warning}"` must produce no output) would
  fail if this third occurrence were left unfixed.
- **Fix:** Keyed by `runtime-${index}`, matching the `artifact-${index}`/`document-${index}` pattern
  applied to the two lists explicitly named in the action.
- **Files modified:** `src/web/pages/artifact-page.tsx`
- **Verification:** `grep -n "key={warning}"` returns no matches (exit 1); full test suite passes (251
  tests).
- **Committed in:** `7b29aa8` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug, same class as the plan's own IN-01 fix)
**Impact on plan:** Necessary to satisfy the plan's own acceptance criterion; no scope creep beyond the
already-declared `files_modified` for this task.

### Tracer feedback gate (Task 1)

Task 1 is `type="tracer" tdd="true"`. Per the tracer feedback gate, its `<verify>`
(`npx vitest run test/web/roadmap-deep-link.test.ts && npm run typecheck && npm run lint`) was re-run
end-to-end immediately after the task's commit, before starting Task 2's expansion work. All three
commands passed (14/14 tests, clean typecheck, clean lint). `.planning/config.json` has
`workflow.auto_advance: false` and `workflow._auto_chain_active: false`, but also
`workflow.human_verify_mode: "end-of-phase"` — combined with the tracer's `<verify>` being fully
automated (no `<human-check>` component) and this plan being `autonomous: true` with no
`checkpoint:*` tasks authored, the re-verified automated gate was treated as satisfied and execution
proceeded to Task 2 without a mid-flight halt. This is documented here rather than silently assumed.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Verification gap WR-01 is closed: `RoadmapPage` reads its matched route (`useLocation` +
  `resolveRoadmapDeepLink`), opens exactly one phase disclosure per deep link, scrolls it into view,
  and opens only the enclosing archived milestone when applicable. Confirmed live against a running
  server reading this project's own `.planning/`.
- WR-02 (archived-diagram leak) and IN-01 (duplicate warning keys) are both closed with regression
  coverage.
- Full test suite: 251 passed (was 236+ required; existing suite grew by 15 tests: 14 new in
  `roadmap-deep-link.test.ts` + 1 new in `handlers.test.ts`).
- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run smoke -- fixtures/dense` all pass.
- No CSS was touched, no new dependency was added, and the public route shape is unchanged — clears the
  way for plan 02-09's contrast gate to inspect exactly the stylesheet the verifier flagged.
- Plan 02-09 (the next plan in this phase, per `affects`) can build on this deep-link resolver and the
  `data-deep-link-target` attribute as a stable browser-gate hook.

## Known Stubs

None.

## Self-Check: PASSED

- `src/web/pages/roadmap-deep-link.ts` — FOUND
- `test/web/roadmap-deep-link.test.ts` — FOUND
- `.planning/phases/02-situational-awareness-artifact-reading/02-08-SUMMARY.md` — FOUND
- Commits `ccb08b3`, `7b29aa8` — FOUND in `git log --oneline --all --grep="02-08"`
- `npm test` — 251 passed (0 failed)
- `npm run typecheck`, `npm run lint`, `npm run build` — all exit 0
- `npm run smoke -- fixtures/dense` — passed
- Live round trip against `node src/server/index.ts /home/cinedise/labelore` — `resolveRoadmapDeepLink` returned a non-null phase target for a real `/api/roadmap` phase url

---
*Phase: 02-situational-awareness-artifact-reading*
*Completed: 2026-08-29*
