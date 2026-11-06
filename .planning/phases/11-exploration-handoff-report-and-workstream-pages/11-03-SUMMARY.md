---
phase: 11-exploration-handoff-report-and-workstream-pages
plan: 03
subsystem: planning-repo
tags: [file-class, listed, spikes, intel, graphs, map-only, workstreams]

requires:
  - phase: 11-exploration-handoff-report-and-workstream-pages
    provides: "11-01 confirmed deviations C3, C4 and C8 (all adopted)"
provides:
  - "FileClass 'listed': spike scripts and outputs named and sized, never read, indexed or served"
  - "isListedPosition(relUnderPlanning) in folders.ts, decided before any head sniff"
  - "intel/ and graphs/ recognise .md beside .json (kinds intel and graph)"
  - "projectMapState treats a live workstream folder as work (mapOnly false)"
affects: [11-04, 11-15, 11-16, 11-18, 11-27, 11-29, 11-31]

actuals:
  tokens: 18000
  tasks: 2
  commits: 2
plan_head_before: fcc8f68d611a6dd91cbf5c8862d00ab3b7bb46cd
plan_head_after: e37d46b18081303f0275f1c7de5c05a232c87fe6

tech-stack:
  added: []
  patterns:
    - "A file class decided from position before any read (listed), the strongest form of the never-read rule"
    - "A counting filesystem double (reads, readHead, readBytesWithin) turns 'never read' into a measured zero"

key-files:
  created:
    - test/listed-files.test.ts
  modified:
    - src/domain/model.ts
    - src/planning-repo/folders.ts
    - src/planning-repo/discovery.ts
    - src/presentation/file-facts.ts
    - src/presentation/drawer.ts
    - src/web/components/planning-places.tsx
    - src/web/pages/document-route.tsx
    - src/web/pages/file-details-page.tsx
    - src/presentation/project-map-state.ts
    - test/folders.test.ts
    - test/presentation/file-facts.test.ts
    - test/presentation/project-map-state.test.ts

key-decisions:
  - "listed is a new FileClass member (RESEARCH A4/C4), not a reuse of 'large'"
  - "README.md is excluded from listing only at depth two (spikes/<dir>/README.md); a deeper README.md is listed"
  - "The listed type label comes from the extension (Shell script, Python script, JSON file...), else File"

requirements-completed: [VIEW-14, VIEW-19, VIEW-20]

coverage:
  - id: D1
    description: "A spike script or output is classed listed from its position, with zero read/readHead/readBytesWithin calls, an empty body, and the stat size"
    requirement: "VIEW-14"
    verification:
      - kind: automated
        ref: "test/listed-files.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "A listed file is absent from the search documents and index, and the bytes route answers 404"
    requirement: "VIEW-14"
    verification:
      - kind: automated
        ref: "test/listed-files.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "A listed file opens the File details card with the listed lead line"
    requirement: "VIEW-19"
    verification:
      - kind: automated
        ref: "test/presentation/file-facts.test.ts (filePageKindOf listed, label and badge); card copy by grep"
        status: pass
    human_judgment: false
  - id: D4
    description: "intel/*.md and graphs/*.md are kinds intel and graph; other extensions stay unknown"
    requirement: "VIEW-20"
    verification:
      - kind: automated
        ref: "test/folders.test.ts"
        status: pass
    human_judgment: false
  - id: D5
    description: "A map plus a live workstream folder is not map-only; a lone workstreams/ file keeps it map-only"
    requirement: "VIEW-20"
    verification:
      - kind: automated
        ref: "test/presentation/project-map-state.test.ts"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-11-07
status: complete
---

# Phase 11 Plan 03: Listed spike files, markdown intel and graphs, workstream-aware map-only Summary

**A new `listed` file class names and sizes everything inside a spike folder except its README and .continue-here.md without reading a byte, intel/ and graphs/ now recognise their markdown reports, and a map plus a live workstream folder no longer reads as map-only.**

## Performance

- **Duration:** about 25 min
- **Tasks:** 2
- **Files modified:** 12 (plus 1 created)

## Accomplishments

- `isListedPosition` (folders.ts) decides 'listed' from the path alone; discovery runs it before `needsHeadSniff`, so a listed file is never head-sniffed and has `body ''`, no warnings, and the stat size. The registry's existing non-text branch already returns the empty shape and the search index already keeps text-class only.
- `test/listed-files.test.ts` (22 tests) wraps the in-memory port with read, readHead and readBytesWithin counters: zero calls for the four listed paths (script with a marker word, output json, extensionless file, NOTES.md), README and .continue-here.md still read, search index finds nothing for the marker, `/api/documents` carries none, and `/api/files` answers 404 and reads nothing. A sketch script stays text.
- The File details card gains the `listed` variant with the exact lead "Listed by name only. Labelore never runs or opens these files."; document-route sends `listed` there before any /documents request. Drawer and badges already treat any non-text class as a badge row, so `listed` renders as `SH · 2 KB`.
- `indexKind` replaces `jsonKind` for the intel and graphs rows (.json or .md, else unknown); sources cite agents/gsd-doc-synthesizer.md and graphify.cjs. The folders.test.ts pins changed deliberately (intel/SYNTHESIS.md to intel, graphs/notes.md to graph).
- `projectMapState` gains the workstream condition (any path under `.planning/workstreams/` with a folder segment before the file name); no scope import.

## Task Commits

1. **Task 1 (tracer): spike script listed by name and size, end to end** - `1c646e0` (feat)
2. **Task 2: markdown intel and graph recognised; map-only knows workstreams** - `e37d46b` (feat)

Note: the folders.ts `indexKind` edit that Task 2 names was made in Task 1's commit, because the same file's `isListedPosition` was edited there; Task 2's commit carries the test pins and the project-map-state change.

## Deviations from Plan

None - plan executed exactly as written. `src/web/components/planning-places.tsx` and `src/presentation/drawer.ts` needed only comment updates because their `fileClass === 'text'` checks already cover `listed`.

## Deferred Issues

Out of scope, pre-existing or environmental, not fixed:

- `test/web/ui-spec-corpus.test.ts` and `test/web/pattern-map-corpus.test.ts` fail at this base: the corpus guards walk `.planning/phases/` and find `11-UI-SPEC.md` and `11-PATTERNS.md` with no pinned entry. Unrelated to this plan's files; the owning phase-11 plan that finishes the corpus pins should add them.
- `test/fixture-leak.test.ts` errors with EISDIR in this worktree only: I symlinked `node_modules` into the worktree to run the gate, and the test reads every untracked path as a file. The symlink is not committed and is removed before return.
- `recognition-kinds` and `route-table` showed 5 s timeouts in one full-gate run under load; both pass alone (59/59).

Every targeted gate from both tasks passes (182/182 and 276/276, 0 failed/skipped/todo); full gate was 6327/6330 with the three failures above.

## Known Stubs

None.

## Threat Flags

None. T-11-03, T-11-04 and T-11-05 are mitigated and proven in test/listed-files.test.ts.

## Self-Check: PASSED

- test/listed-files.test.ts exists; commits 1c646e0 and e37d46b are ancestors of HEAD
- Acceptance greps: 'listed' in model.ts = 1, isListedPosition( in discovery.ts = 1, lead line in file-details-page.tsx = 1, old SYNTHESIS pin = 0, new pin = 1, workstreams/ in project-map-state.ts = 4
- typecheck, lint and build exit 0; labelore service active
