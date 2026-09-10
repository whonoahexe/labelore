---
phase: 04-portability-degradation-hardening
plan: 05
subsystem: api
tags: [gap-closure, warning-tone, atomicity, race-condition, artifact-page]

# Dependency graph
requires:
  - phase: 04-portability-degradation-hardening
    provides: "04-01's DerivedViews bundle and POST /api/refresh seam; 04-03's artifactWarningTone() shared derivation and TreeNode/SearchResultRow tone wiring"
provides:
  - "artifact.bodyLength forwarded on GET /api/documents and GET /api/artifacts/* (the third and final surface artifactWarningTone() needs)"
  - "src/web/pages/artifact-page.tsx computing one warningTone via the shared artifactWarningTone(), used at both the header badge and the disclosure summary"
  - "artifactResponse(lookup, activeDerived) — the request's captured DerivedViews bundle threaded through as a parameter instead of re-read live mid-request"
affects: []

# Actuals (#2632)
actuals:
  tokens: 5759
  tasks: 3
  commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Both artifact handlers capture `const activeDerived = derived;` as their literal first statement, before URL parsing and before the lookup — the same pattern any future route reading the derived bundle mid-request should follow to stay inside the D-05 atomicity guarantee."

key-files:
  created:
    - test/server/artifact-response.test.ts
    - test/server/derived-snapshot-isolation.test.ts
  modified:
    - src/server/index.ts
    - src/web/pages/artifact-page.tsx
    - test/web/degradation-ui-contract.test.ts

key-decisions:
  - "warningTone is computed once in ArtifactPage from the combined artifact.warnings + document.warnings arrays and artifact.bodyLength, then referenced at both the header badge and the disclosure summary — one binding, mirroring search-page.tsx's existing row.warningTone ternary shape exactly rather than introducing a differently-shaped conditional."
  - "activeDerived is captured as the first statement in both /api/artifacts/* and /api/documents, before any URL parsing — guarantees the capture happens before the handler's first await, so a refresh completing on another connection later in the same request's lifecycle cannot change what this response is built from."

patterns-established:
  - "A handler that reads the mutable per-refresh `derived` bundle at more than one point in its own async lifecycle must capture it once into a local binding at the top of the handler and thread that binding everywhere else — never re-read the module-level name after an await."

requirements-completed: [TGT-06, TGT-08]

coverage:
  - id: D1
    description: "One Warning/Unreadable vocabulary now spans all three surfaces — the artifact page computes its tone via the same artifactWarningTone() function tree.ts and search.ts already call, fed by bodyLength the server now forwards (D-12, TGT-06)"
    requirement: "TGT-06"
    verification:
      - kind: unit
        ref: "test/server/artifact-response.test.ts#a warned artifact with bodyLength: 0/1/empty-warnings yields unreadable/warning/null"
        status: pass
      - kind: unit
        ref: "test/web/degradation-ui-contract.test.ts#one Warning/Unreadable vocabulary spans the artifact badge, the tree indicator, and the search chip (D-12) — mapping-anchored regex proof"
        status: pass
    human_judgment: false
  - id: D2
    description: "A GET /api/artifacts/* or GET /api/documents response is built end to end from the bundle captured at request start — a refresh completing mid-request cannot mix pre-refresh artifact data with post-refresh reference-registry data (D-05, TGT-08)"
    requirement: "TGT-08"
    verification:
      - kind: integration
        ref: "test/server/derived-snapshot-isolation.test.ts#a GET started before a completing refresh still resolves an inline-code reference against the pre-refresh registry (verified to fail against the pre-fix code, then the fix restored)"
        status: pass
      - kind: integration
        ref: "test/server/derived-snapshot-isolation.test.ts#control: the same document served from a snapshot that never held the reference target renders with no reference-key attribute"
        status: pass
      - kind: other
        ref: "test/server/derived-snapshot-isolation.test.ts#region-scoped source check: artifactResponse reads only the activeDerived parameter, both handlers capture it before their lookup"
        status: pass
    human_judgment: false
  - id: D3
    description: "The pre-existing suite stays green at or above its verification-time floor, types/lint/build/smoke all pass, and no executed plan's PLAN.md/SUMMARY.md was disturbed"
    verification:
      - kind: other
        ref: "npx vitest run — 38 files, 540 tests, all passed (floor: 36 files / 533 tests)"
        status: pass
      - kind: other
        ref: "npm run typecheck && npm run lint — both exit 0"
        status: pass
      - kind: other
        ref: "npm run build && npm run smoke — build succeeds, smoke prints its pass line"
        status: pass
      - kind: other
        ref: "git status --porcelain -- .planning/phases/04-portability-degradation-hardening — no 04-01..04-04 PLAN.md/SUMMARY.md modified"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-09-07
status: complete
---

# Phase 4 Plan 5: Gap Closure — Shared Warning Vocabulary and Single-Bundle Atomicity Summary

**Forwards `artifact.bodyLength` on the single-artifact response and wires `artifact-page.tsx` to the shared `artifactWarningTone()` (closing D-12), and threads one captured `DerivedViews` bundle through `artifactResponse()` so a refresh completing mid-request can never mix pre- and post-refresh data in one response (closing D-05) — both proven by tests that were verified to fail against the pre-fix code.**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-09-07T16:00:00Z (approx.)
- **Completed:** 2026-09-07T16:13:14Z
- **Tasks:** 3
- **Files modified:** 5 (2 created, 3 modified)

## Accomplishments

- `artifactResponse()`'s returned `artifact` object now includes `bodyLength: lookup.artifact.bodyLength` — `GET /api/documents` and `GET /api/artifacts/*` both forward it, since both are served by the one response builder.
- `src/web/pages/artifact-page.tsx` replaces the hard-coded `hasWarnings` boolean and static `data-tone="warning"`/`"Warning"` literals with one computed `warningTone` (`artifactWarningTone({ warnings: [...artifact.warnings, ...document.warnings], bodyLength: artifact.bodyLength })`), read at both the header badge and the warning-disclosure summary — mirroring the exact ternary shape `search-page.tsx` already uses against `row.warningTone`.
- `artifactResponse(lookup, activeDerived)` now takes the request's captured `DerivedViews` bundle as a required second parameter and reads `activeDerived.referenceRegistry` instead of the live module-level `derived` binding. Both `/api/artifacts/*` and `/api/documents` capture `const activeDerived = derived;` as their literal first statement, before URL parsing and before the lookup.
- New `test/server/artifact-response.test.ts` (4 cases): pins the bodyLength-0-vs-1 split exactly at zero (TGT-08 adjacency), the empty-warnings-is-not-damage case (TGT-08 empty), and that both artifact routes agree on the same `bodyLength`.
- New `test/server/derived-snapshot-isolation.test.ts` (3 cases): the race case (a `GET /api/documents` started before an awaited `POST /api/refresh` still resolves an inline-code artifact-path reference against the pre-refresh registry — manually verified to fail against the pre-Task-2 code, then the fix was restored), a control case proving the assertion isn't vacuous, and a region-scoped source check pinning that `artifactResponse` never reads the bare module-level `derived` binding.
- `test/web/degradation-ui-contract.test.ts`'s D-12 case rewritten from co-presence assertions ("does the string 'Unreadable' appear somewhere") to a mapping-anchored regex proof that the tone/label ternaries in `artifact-page.tsx` are guarded correctly in both directions, that both sites read the same `const warningTone` binding, and that no `data-tone` attribute on the page is a quoted literal.
- Full regression gate: `npx vitest run` — 38 files, 540 tests, all passed (verification-time floor was 36 files / 533 tests); `typecheck`/`lint`/`build`/`smoke` all clean.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "Unreadable" — one damaged artifact, server to badge** - `523ac7a` (feat)
2. **Task 2: One bundle per request — capture the derived views before the first await** - `19ebb91` (fix)
3. **Task 3: Whole-phase regression gate** - no code changes required; all four gates (suite, typecheck/lint, build/smoke, git status scope) passed on the first run, nothing to fix forward.

**Plan metadata:** commit to follow this SUMMARY.

## Files Created/Modified

- `src/server/index.ts` — `artifactResponse()` gains `bodyLength` on the returned artifact and a required `activeDerived: DerivedViews` parameter; both artifact handlers capture `activeDerived` first
- `src/web/pages/artifact-page.tsx` — `bodyLength` added to the local `ArtifactDocumentResponse` interface; `warningTone` computed via `artifactWarningTone()`, used at both the header badge and the disclosure summary
- `test/server/artifact-response.test.ts` — new: 4 server-route cases pinning the bodyLength/tone contract
- `test/server/derived-snapshot-isolation.test.ts` — new: 3 cases pinning the single-bundle-per-request atomicity contract
- `test/web/degradation-ui-contract.test.ts` — D-12 case rewritten to a mapping-anchored regex proof

## Decisions Made

- `warningTone` is computed from the *combined* `artifact.warnings` and `document.warnings` arrays (not just `artifact.warnings`), preserving the pre-existing D-10 rule that a document-level warning also earns a badge — `artifactWarningTone()`'s parameter type is `unknown[]`, so the mixed array typechecks without a cast.
- `activeDerived` is captured as literally the first statement in both handlers (before URL parsing), not merely "before the lookup" — this guarantees the capture happens before either handler's first `await`, so no interleaving with a concurrent refresh can change what the response is built from, regardless of how many awaits follow.

## Deviations from Plan

None - plan executed exactly as written. As an extra verification step (not part of the plan's own instructions), Task 2's fix was temporarily reverted in place, the new isolation test was re-run to confirm it fails against the pre-fix code exactly as the plan's `<behavior>` block asserts, and the fix was then restored byte-identical (confirmed via diff) before committing — this was a verification exercise, not a deviation, and produced no change to the committed code.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Both must-haves phase 4 verification found FAILED (D-12 shared vocabulary, D-05 single-bundle atomicity) are now closed and covered by tests that were confirmed to fail on the pre-fix code.
- WR-02 (duplicated `buildDerivedViews()` work on concurrent refreshes) and IN-01 (`toast.tsx`'s unconditional destructive tone) remain untouched and visible in `04-REVIEW.md` for future follow-up, as scoped by this plan's objective.
- Phase 4 is now ready for re-verification against the full, closed must-have set.

---
*Phase: 04-portability-degradation-hardening*
*Completed: 2026-09-07*

## Self-Check: PASSED

All key files (`src/server/index.ts`, `src/web/pages/artifact-page.tsx`, `test/server/artifact-response.test.ts`,
`test/server/derived-snapshot-isolation.test.ts`, `test/web/degradation-ui-contract.test.ts`) confirmed present
on disk. Both task commits (`523ac7a`, `19ebb91`) confirmed present in `git log`. Full suite (540 tests, 38
files), `typecheck`, `lint`, `build`, and `smoke` all re-verified passing immediately before writing this summary.
