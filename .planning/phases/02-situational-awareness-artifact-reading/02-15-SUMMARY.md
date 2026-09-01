---
phase: 02-situational-awareness-artifact-reading
plan: 15
subsystem: rendering
tags: [rehype, hast, markdown-linkify, artifact-references, gap-closure]

# Dependency graph
requires:
  - phase: 02-situational-awareness-artifact-reading
    provides: "02-14's collision-aware reference-preview positioning (fixed Base UI Positioner), which this plan's artifact previews render through unchanged"
provides:
  - "Exact `.planning` artifact-path resolution keyed directly by canonical snapshot path (no milestone-context indirection, unlike phase/plan/requirement identity)"
  - "Prose and standalone-inline-code artifact-path preview triggers sharing one resolver"
  - "A recorded, explicit block on G2-03/G2-03's source-code-path linking: no canonical repository/source-file inventory or in-app source route exists yet"
affects: [02-16, 02-17 UAT re-gate, artifact reader, reference navigation, G-09 deferred coverage]

# Actuals (#2632)
actuals:
  tokens: 4745
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Two resolution strategies by identity shape: milestone-scoped lookup (lookupKey + resolutions map) for identifiers that legitimately repeat across milestones (phase numbers, plan ids, requirement ids); direct canonical-path lookup (artifactPreviews map) for identifiers that are already globally unique (filesystem paths) — no milestone indirection needed or added."
    - "REFERENCE_TOKEN's `.planning/...` alternative is ordered first in the alternation so a whole artifact path is captured before a narrower alternative (e.g. the plan-id pattern) can match a substring embedded inside it."

key-files:
  created: []
  modified:
    - src/presentation/references.ts
    - src/rendering/linkify.ts
    - test/rendering/references.test.ts

key-decisions:
  - "Artifact previews are indexed directly by each artifact's canonical snapshot path (a Map<path, preview>), not through the milestone-scoped lookupKey/resolutions machinery used for phase/plan/requirement tokens — artifact paths are already unique identities by construction, so no duplicate-across-milestones ambiguity exists to guard against."
  - "resolveArtifactReference is exported from references.ts specifically so linkify.ts's inline-code handling can reuse the exact same resolver as prose linkification, rather than re-implementing path lookup."
  - "`code` moved out of linkify.ts's blanket skip list into its own narrow check in walk(): only a standalone inline code node (exactly one text child, trimmed content an exact registered path) is replaced. `a` and `pre` remain blanket-skipped, which also guarantees (by construction of the tree walk) that any `code` element reachable by the loop is neither inside a fenced block nor inside an authored link — so the generated trigger can never end up nested inside either."
  - "Trailing sentence punctuation is excluded from the artifact-path regex match itself (a negated trailing character class), not stripped in a post-processing step — this keeps the visible button text and the lookup key the same string, so 'faithful to the authored path' and 'excluded from lookup' are the same guarantee rather than two synchronized ones."
  - "G2-03's reproduced source-code paths (e.g. `backend/src/auth/mod.rs`) are explicitly NOT addressed by this plan. The artifact-path regex only ever matches strings starting with the literal `.planning/` prefix, so source paths and commit hashes are structurally excluded — no additional denylist logic was needed to keep D-17's plain-text requirement true."

patterns-established:
  - "Direct canonical-path registry keying is the pattern for any future reference type whose identity is already globally unique in the snapshot (contrast with the milestone-scoped pattern for repeating identities)."

requirements-completed: [NAV-02, NAV-03, READ-06]

coverage:
  - id: D1
    description: "An exact prose `.planning` artifact path (phase-local, milestone-root, or archived) resolves to a snapshot-backed preview whose Open URL is the artifact's existing in-app URL; unresolved/unknown paths, source-code paths, and commit hashes remain plain text; trailing sentence punctuation is excluded from the lookup while the visible reference stays faithful to the authored path."
    requirement: NAV-02
    verification:
      - kind: unit
        ref: "test/rendering/references.test.ts (exact artifact-path presentation references, post-sanitize reference enrichment — 4 new prose-linkification tests)"
        status: pass
      - kind: integration
        ref: "npm test -- --run test/rendering/references.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "A standalone inline-code artifact path (sole text content, exact registered path) becomes the same preview trigger prose produces; fenced code blocks, mixed-content inline code, unresolved paths, and code nested inside authored links stay untouched with no interactive elements nested inside another."
    requirement: NAV-03
    verification:
      - kind: unit
        ref: "test/rendering/references.test.ts (inline-code artifact-path references — 4 tests)"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: false
  - id: D3
    description: "The artifact-path branch of G-09 is delivered without claiming G2-03's source-code-path closure — REFERENCE_TOKEN only ever matches strings beginning with the literal `.planning/` prefix, so `backend/src/auth/mod.rs`-shaped paths and commit hashes remain structurally excluded and plain text per D-17."
    requirement: READ-06
    verification:
      - kind: unit
        ref: "test/rendering/references.test.ts (leaves unresolved or malformed token ordinary; leaves an unknown .planning path, a reproduced source path, and a commit hash as plain text (D-17))"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-09-01
status: complete
---

# Phase 02 Plan 15: Exact Artifact-Path References Summary

**Registry-backed `.planning` artifact-path resolution (direct canonical-path lookup, no milestone indirection) with matching prose and standalone-inline-code preview triggers, sharing one resolver.**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-09-01T17:00:00+05:30 (first RED commit)
- **Completed:** 2026-09-01T17:02:16+05:30 (last GREEN commit)
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Extended `ReferenceRegistry` with an `artifactPreviews` map keyed directly by each artifact's canonical snapshot path, populated from `presentation.artifacts` with identity/title/status/location/detail/url all sourced from the existing snapshot record — no path-shape inference, no filesystem or route synthesis.
- Extended `REFERENCE_TOKEN` in `linkify.ts` so an exact `.planning/...` prose token resolves through the new registry, with the artifact-path alternative ordered first in the regex alternation so a whole path is captured before a narrower pattern (e.g. the plan-id shape) can match a substring embedded inside it, and trailing sentence punctuation excluded from the match itself.
- Added a narrow inline-code transformation: a standalone `code` node whose sole text content is an exact registered artifact path becomes the same trigger, reusing the exported `resolveArtifactReference` resolver so path resolution has exactly one implementation across prose and code.
- Explicitly recorded, and structurally enforced via the `.planning/`-prefix-only regex, that G2-03's reproduced source-code paths and commit hashes remain plain text per D-17 — this plan closes only the `.planning` artifact-path branch of G-09.

## Task Commits

Each task was committed as RED then GREEN:

1. **Task 1 RED: exact artifact-path reference contracts (registry + prose)** - `94c8b7b` (test)
2. **Task 1 GREEN: artifact-path registry and prose resolution** - `2fe8317` (feat)
3. **Task 2 RED: inline-code artifact-path trigger contracts** - `09668c8` (test)
4. **Task 2 GREEN: standalone inline-code artifact-path triggers** - `a6f9b34` (feat)

## Files Created/Modified

- `src/presentation/references.ts` - Added `artifact` to `ReferencePreviewType`, `artifactPreviews` registry map, `artifactPreview`/`artifactLocation`/`artifactStatus` builders, and exported `resolveArtifactReference` for direct canonical-path resolution.
- `src/rendering/linkify.ts` - Extended `REFERENCE_TOKEN` with a `.planning/...` alternative (ordered first, trailing-punctuation-excluding), moved `code` out of the blanket skip list into a narrow `inlineCodeReference` check in `walk()`.
- `test/rendering/references.test.ts` - Registry-level artifact-path resolution tests, prose-linkification pipeline tests, and inline-code trigger tests (positive, negative, and nesting-safety coverage).

## Decisions Made

See `key-decisions` in frontmatter.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Issues Encountered

None. The tracer feedback gate (Task 1, `type="tracer"`) was evaluated per the end-of-phase precedence chain: the task carries no `gate="blocking-human"`, auto-mode is not active (`workflow.auto_advance: false`, `_auto_chain_active: false`), and `workflow.human_verify_mode` is `end-of-phase` (default) with the tracer's `<verify>` carrying only `<automated>` — so the gate re-ran `npm test -- --run test/rendering/references.test.ts` (27/27 passing at that point), logged verified end-to-end, and expanded directly into Task 2 with no checkpoint.

## Verification

- `npm test -- --run test/rendering/references.test.ts`: 31/31 passed (27 after Task 1, 31 after Task 2).
- `npm run typecheck`: clean.
- Full suite: 318/318 tests passed across 24 files.
- `npm run lint`: clean.
- `npm run build`: succeeded (only the pre-existing advisory about chunks above 500 kB, unrelated to this change).
- Every `<read_first>` path confirmed tracked via `git ls-files --error-unmatch` before implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- The `.planning` artifact-path branch of G-09 is closed: registered phase-local, milestone-root, and archived artifact paths resolve to snapshot-backed previews with correct Open destinations, in both prose and standalone inline code.
- G2-03 remains explicitly BLOCKED on a canonical repository/source-file inventory and stable in-app source route for reproduced source paths like `backend/src/auth/mod.rs` — not attempted here, and structurally unreachable by this plan's `.planning/`-prefix-only matching, consistent with D-17.
- No ASVS L1 high-severity threat from the plan's threat register remains open: T-02-15-01 (tampering) is closed by exact canonical-path matching with no synthesized destinations; T-02-15-02 (elevation of privilege) is closed by the `a`/`pre` blanket skip plus the single-text-child requirement, which together make nested interactive triggers structurally impossible; T-02-15-03 (information disclosure) is closed by sourcing every preview field from the existing snapshot record; T-02-15-04 (denial of service) is closed by the unchanged bounded single-pass tree walk and O(1) map lookups.
- Ready for plan 02-16 and the 02-17 UAT re-gate.

## Self-Check: PASSED

- All three modified files (`src/presentation/references.ts`, `src/rendering/linkify.ts`, `test/rendering/references.test.ts`) exist on disk.
- All four RED/GREEN task commits (`94c8b7b`, `2fe8317`, `09668c8`, `a6f9b34`) exist in git history.
- All task acceptance criteria and the plan-level `<verification>` commands passed on the final tree (31/31 targeted tests, 318/318 full suite, typecheck/lint/build clean).
- Stub and skipped-test scans found no open items.

---
*Phase: 02-situational-awareness-artifact-reading*
*Completed: 2026-09-01*
