---
phase: 01-read-layer-domain-model
plan: 04
subsystem: data
tags: [crossref, mentions, id-scanning, planning-fs-equivalence, degradation-testing, golden-snapshots, gray-matter]

# Dependency graph
requires:
  - phase: 01-read-layer-domain-model (plans 01-02, 01-03)
    provides: the PlanningFilesystem boundary and InMemoryPlanningFilesystem, the discovery pass, the typed handler registry, and assembleDomainModel producing the full Project graph this plan resolves references and scans mentions over
provides:
  - Eager cross-reference resolution (requirement-to-phase, traceability-to-phase, phase-to-plan, plan-to-summary, plan-dependency) with dangling targets carried as {raw, resolved:null} data, never a warning
  - The NAV-07 decision-mention index — a whole-corpus prose scan for four id schemes (requirement, decision, plan, phase), scoped by artifact kind, code-block-aware, offset-preserving
  - Byte-identical proof by substitution of the PlanningFilesystem interface across LocalFsPlanningFilesystem and InMemoryPlanningFilesystem, for all three fixture trees plus six in-memory-only hostile cases
  - Per-file degradation isolation proven against the real dense fixture's three deliberate corruptions, plus the refresh-seam invariants (new identity, no mutation, byte-stable, concurrency-safe)
  - Three committed, clone-portable golden snapshots (sparse-empty, sparse-started, dense) regenerated to include resolved references and the mentions index
affects: [phase-02-dashboard-shell, phase-03-search-and-linking, phase-04-rendering-and-degradation-ui]

# Actuals (#2632) — pairs with the plan's estimate to calibrate future estimates.
# Same estimateTokens scale (chars/4 over the realized diff), never a harness token count.
actuals:
  tokens: 163985
  tasks: 3
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Eager, once-per-assembly cross-reference resolution into {raw, resolved} Reference<T> records, with a dangling target as normal-path data rather than a warning (D-10)"
    - "Single combined regex-scanning pass per document, greedily selecting the longest non-overlapping match at each position, so an id token is counted under exactly one scheme (D-14)"
    - "Fixture-substitution proof: identical fixture trees through two independent PlanningFilesystem implementations, asserting on serialized bytes, never on object identity"
    - "Hostile edge cases (rejecting read/list, prototype-polluting JSON, empty/degenerate trees) authored only in-memory, never committed to fixtures/"

key-files:
  created:
    - src/planning-repo/crossref.ts
    - src/planning-repo/mentions.ts
    - test/crossref.test.ts
    - test/mentions.test.ts
    - test/fs-equivalence.test.ts
    - test/degradation.test.ts
    - test/__golden__/sparse-started.json
    - test/__golden__/dense.json
  modified:
    - src/domain/model.ts
    - src/planning-repo/assemble.ts
    - src/planning-repo/snapshot.ts
    - src/planning-repo/serialize.ts
    - src/planning-repo/frontmatter.ts
    - src/cli/snapshot.ts
    - test/snapshot.golden.test.ts
    - test/__golden__/sparse-empty.json

key-decisions:
  - "Reference<T>, Mention, MentionIndex, and IdScheme are all defined in the zero-I/O domain/model.ts, not in crossref.ts/mentions.ts where the research sample sketched them — Project.mentions and every resolved-reference field need these types, and the domain layer never imports from planning-repo/"
  - "The decision-vs-requirement collision (D-14) is resolved purely by prefix-length precedence in the regex patterns themselves (single-letter D-NN vs 2+-char XX-NN), not by a runtime artifact-kind branch — artifactKind is still recorded on every Mention because a later consumer scopes resolution by it, but the scanner needs no such branch to keep the two namespaces apart"
  - "scanMentions() takes the flat ParsedArtifact[] from dispatch, not the assembled Project graph — Plan/PlanSummary domain objects carry no body field once assembled, so the scanner must run on the pre-assembly parsed list to have anything to scan"
  - "Fixed a pre-existing gray-matter caching bug (Rule 1): matter() caches its pre-parse object by content string before the YAML parse that can throw, so re-parsing byte-identical malformed content within one process silently drops the frontmatter warning on the second call — this directly broke the refresh-seam idempotency this task exists to prove; fixed by passing an empty options object to bypass gray-matter's cache path"
  - "Fixed a pre-existing stdout-truncation bug in src/cli/snapshot.ts (Rule 3): process.exit() immediately after console.log() raced the async pipe write on large payloads, truncating output when piped — exactly the pattern this task's own <verify> block uses; switched to process.exitCode and letting main() return naturally"

requirements-completed: [NAV-07, DATA-01, DATA-04, DATA-05, DATA-06]

coverage:
  - id: D1
    description: "The snapshot exposes resolved requirement-to-phase, phase-to-plan, and decision-to-file references, with unresolvable ones present and explicitly marked (phase success criterion 5; NAV-07, D-10)"
    requirement: NAV-07
    verification:
      - kind: unit
        ref: "test/crossref.test.ts — resolveCrossReferences suites (10 cases)"
        status: pass
      - kind: unit
        ref: "test/mentions.test.ts — scanMentions suites (17 cases)"
        status: pass
      - kind: integration
        ref: "npm run snapshot -- fixtures/dense --stable | decision-mention verification script (decision:D-01 mapped to 5 artifact paths)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Swapping the filesystem implementation changes nothing downstream, proven by byte-identical output (phase success criterion 4; DATA-01, D-08)"
    requirement: DATA-01
    verification:
      - kind: unit
        ref: "test/fs-equivalence.test.ts — byte-identical stable JSON across all three fixtures, both implementations"
        status: pass
      - kind: unit
        ref: "test/fs-equivalence.test.ts — six in-memory hostile cases (empty map, single-file map, empty-content file, rejecting read, rejecting list, prototype-named JSON key)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The whole snapshot rebuilds through one refresh() call without mutating the previous one (phase success criterion 4; DATA-04)"
    requirement: DATA-04
    verification:
      - kind: unit
        ref: "test/degradation.test.ts — refresh seam suite (new identity, no mutation, byte-stable sequential refreshes, concurrency-safe, getSnapshot() throw semantics)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A deliberately corrupted file degrades to its raw body plus a recorded warning while every other file parses cleanly (phase success criterion 3; D-02, D-11)"
    requirement: DATA-06
    verification:
      - kind: unit
        ref: "test/degradation.test.ts — dense fixture per-file isolation suite (6 cases)"
        status: pass
    human_judgment: false
  - id: D5
    description: "All three fixture trees produce complete, committed, clone-portable snapshots (phase success criteria 1 and 2; DATA-05, DATA-06, D-05, D-07)"
    requirement: DATA-05
    verification:
      - kind: unit
        ref: "test/snapshot.golden.test.ts — describe.each table over sparse-empty/sparse-started/dense against committed test/__golden__/*.json"
        status: pass
    human_judgment: false
  - id: D6
    description: "Manual smoke check against the real ~/studio-portal reference project (D-04) — the only defense against a regression that manifests only at real-world scale, deliberately not automated"
    verification: []
    human_judgment: true
    rationale: "This project's config sets workflow.human_verify_mode: end-of-phase — the executor embeds this <verify><human-check> for the phase verifier to harvest at end-of-phase into a consolidated UAT, rather than running it interactively mid-plan. Not performed by this executor session."

duration: 25min (this continuation session; Task 1 was committed 2026-08-23T15:47:42Z by a prior, provider-quota-interrupted executor session)
completed: 2026-08-24
status: complete
---

# Phase 1 Plan 4: Cross-Reference Resolution, Mention Index & Filesystem-Substitution Proof Summary

**Eager cross-reference resolution with dangling-as-data, a whole-corpus decision-mention scanner, and byte-identical proof of the filesystem seam across three committed golden fixtures — closing out the phase.**

## Performance

- **Duration:** ~25 min (this continuation session, Tasks 2–3). Task 1 (`114f885`) was committed by a prior executor session at 2026-08-23T15:47:42Z, terminated mid-plan by a provider session-quota limit before Tasks 2–3 could run.
- **Started (this session):** 2026-08-24T00:34:00Z (approx.)
- **Completed:** 2026-08-24T00:52:08+05:30 (2026-08-23T19:22:08Z)
- **Tasks:** 3 (1 completed in a prior session, 2 completed in this continuation)
- **Files modified:** 13 (excluding regenerated golden JSON), 21 including goldens

## Accomplishments

- `src/planning-repo/crossref.ts` — `resolveCrossReferences()` builds requirement, traceability, plan-summary, and plan-dependency lookup maps once per assembly and rewrites the graph's reference fields in place. A dangling reference resolves to `{raw, resolved: null}` and adds nothing to the warning channel (D-10) — GSD prose mentions undefined identifiers routinely, and routing every one into a warning would bury real parse failures.
- `src/planning-repo/mentions.ts` — `scanMentions()` scans every parsed artifact's body for four id schemes (requirement, decision, plan, phase) in a single combined pass per document, taking the longest non-overlapping match at each position so a token is counted under exactly one scheme. Fenced code blocks and inline spans are blanked to equal-length whitespace before scanning; reported offsets always index into the original, unstripped document via a binary-searched line index.
- Cross-implementation equivalence (`test/fs-equivalence.test.ts`) proves the `PlanningFilesystem` boundary by substitution: all three fixtures produce byte-identical stable JSON through `LocalFsPlanningFilesystem` and `InMemoryPlanningFilesystem.fromDirectory`, plus six hostile cases (empty map, single-file map, empty-content file, rejecting read, rejecting list, prototype-polluting JSON) exercised only in memory.
- Per-file degradation isolation (`test/degradation.test.ts`) proves the dense fixture's three deliberate corruptions degrade independently — the tab-broken plan file gets a frontmatter-stage warning with its body intact, the malformed JSON gets a structured-extraction warning, the frontmatter-only file gets no warning at all — while every other file in the tree parses cleanly, and every warning names one of the two corrupted files.
- The refresh seam is proven directly: `refresh()` returns a new object identity every call, never mutates a previously captured snapshot, is byte-stable across two sequential calls, and resolves two concurrently-started calls to equal, complete `ok` snapshots.
- All three golden snapshots (`test/__golden__/{sparse-empty,sparse-started,dense}.json`) regenerated with `vitest -u`, diffed and reviewed by hand before committing — resolved cross-references and the new mentions index now appear; `dense.json` retains exactly its two named warnings; `sparse-started.json`'s deliberately dangling `SLICE-99` resolves to `null` with no warning.

## Task Commits

Each task was committed as a single combined commit (see "TDD Gate Compliance" below for why this deviates from the literal RED-then-GREEN split):

1. **Task 1: Eager cross-reference resolution with dangling targets as data** — `114f885` (feat) — completed and merged in a prior session, before this continuation began.
2. **Task 2: The decision-mention index — prose scanning after dispatch** — `359138e` (feat)
3. **Task 3: Prove the seam — two implementations, three fixtures, one set of goldens** — `76137ec` (feat)

## Files Created/Modified

- `src/planning-repo/crossref.ts` — `resolveCrossReferences()`, `Reference<T>` re-export (Task 1)
- `src/planning-repo/mentions.ts` — `scanMentions`, `stripCodeForScanning`, `ID_PATTERNS`, type re-exports (Task 2)
- `src/domain/model.ts` — `Reference<T>` (Task 1); `IdScheme`, `Mention`, `MentionIndex`, `Project.mentions` (Task 2)
- `src/planning-repo/assemble.ts` — initializes new reference fields, calls `resolveCrossReferences()` once, initializes `Project.mentions` placeholder
- `src/planning-repo/snapshot.ts` — calls `scanMentions(parsed)` inside `refresh()`, after `assembleDomainModel` returns
- `src/planning-repo/serialize.ts` — `breakCycles()` pre-pass so `resolveCrossReferences`'s genuine object cycles don't crash `JSON.stringify` (Task 1 deviation)
- `src/planning-repo/frontmatter.ts` — `matter(content, {})` to bypass gray-matter's caching bug (Task 3 deviation)
- `src/cli/snapshot.ts` — `process.exitCode` instead of `process.exit()` to stop truncating large piped output (Task 2 deviation)
- `test/crossref.test.ts`, `test/mentions.test.ts` — TDD test suites for Tasks 1 and 2
- `test/fs-equivalence.test.ts`, `test/degradation.test.ts` — Task 3's proof suites
- `test/snapshot.golden.test.ts` — generalized from one fixture to a `describe.each` table over three
- `test/__golden__/{sparse-empty,sparse-started,dense}.json` — regenerated/created goldens

## Decisions Made

See `key-decisions` in frontmatter above — summarized: `Reference<T>`/`Mention`/`MentionIndex`/`IdScheme` live in the zero-I/O `domain/model.ts`, not in `crossref.ts`/`mentions.ts`; the D-05-vs-D1 collision is resolved by regex prefix-length precedence rather than a runtime artifact-kind branch; `scanMentions()` operates on the pre-assembly `ParsedArtifact[]` because assembled `Plan`/`PlanSummary` objects carry no body.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed gray-matter's caching bug silently dropping the frontmatter warning on repeat parses**
- **Found during:** Task 3 (writing `test/degradation.test.ts` and `test/fs-equivalence.test.ts`, both of which load the dense fixture more than once within the same process)
- **Issue:** `gray-matter`'s `matter()` caches its internal pre-parse `file` object by raw content string *before* attempting the YAML parse that can throw (`node_modules/gray-matter/index.js`, unconditional `matter.cache[file.content] = file` ahead of the throwing `parseMatter()` call). The first parse of the tab-broken plan file's content throws correctly and our `tryParseFrontmatter` catch block produces the expected warning — but the pre-parse object is already cached. A second parse of byte-identical content within the same process (a second `refresh()`, a second `PlanningRepository` over the same fixture, or — as discovered here — this test suite loading `fixtures/dense` from multiple test files within one vitest worker) hits the cache and silently returns the stale object without re-throwing, dropping the warning entirely. This directly violated this task's own refresh-seam idempotency guarantee (DATA-04) and D-11/D-12's "every parse is wrapped, every failure produces a warning" contract.
- **Fix:** `src/planning-repo/frontmatter.ts`: changed `matter(content)` to `matter(content, {})`. `gray-matter`'s cache-check-and-set block is guarded by `if (!options)`, so passing an empty (but present) options object bypasses the cache path entirely; `defaults()`'s own `Object.assign({}, options)` makes `{}` and `undefined` behaviorally identical for parsing, confirmed by reading gray-matter's source.
- **Files modified:** `src/planning-repo/frontmatter.ts`
- **Verification:** `test/degradation.test.ts` and `test/fs-equivalence.test.ts` both pass reliably now, including when run together or repeatedly in the same process; full `npm test` (128/128) confirms no regression elsewhere.
- **Committed in:** `76137ec` (part of Task 3's commit)

**2. [Rule 3 - Blocking] Fixed stdout truncation in the snapshot CLI on large piped output**
- **Found during:** Task 2, running this task's own `<verify>` command (`npm run snapshot -- fixtures/dense --stable | node -e ...`)
- **Issue:** `src/cli/snapshot.ts`'s `main()` called `process.exit(0)`/`process.exit(1)` immediately after `console.log(JSON.stringify(result, ...))`. On a piped (non-TTY) stdout, the underlying write is asynchronous; for a payload this corpus routinely produces (hundreds of KB), the process could exit before the OS pipe buffer finished draining, truncating the JSON mid-object and breaking any downstream consumer piping the CLI's output — exactly the pattern this task's own verification harness depends on.
- **Fix:** Replaced every `process.exit(N)` with `process.exitCode = N` and let `main()`'s returned promise resolve naturally, so Node drains pending stdout writes before the process exits.
- **Files modified:** `src/cli/snapshot.ts`
- **Verification:** `npm run snapshot -- fixtures/dense --stable | node -e ...` now reliably parses the full JSON and confirms the mentions index; re-ran multiple times without truncation.
- **Committed in:** `359138e` (part of Task 2's commit)

**3. [Rule 1 - Bug, inherited from Task 1] Fixed circular-structure crash in the golden serializer**
- **Found during:** Task 1 (prior session), documented here for completeness since it is load-bearing for Task 3's goldens
- **Issue:** `resolveCrossReferences()` introduces genuine object cycles in the resolved graph (e.g. `Phase.requirementRefs[].resolved` is a `Requirement` whose own `coveringPhaseRefs[].resolved` can point back to the same `Phase`), which crashed `JSON.stringify` inside `normalizeForGolden`.
- **Fix:** `src/planning-repo/serialize.ts` gained a `breakCycles()` pre-pass with a proper per-path ancestor stack, replacing only true self-referential cycles with a compact stub while leaving non-cyclic shared references (ordinary duplication) fully expanded.
- **Files modified:** `src/planning-repo/serialize.ts`
- **Committed in:** `114f885` (Task 1's commit, prior session)

---

**Total deviations:** 3 auto-fixed (2 bugs — one newly found in this session, one inherited from Task 1 — and 1 blocking issue). **Impact:** All three were necessary for correctness (gray-matter caching bug directly threatened this task's own idempotency proof) or to unblock this task's own verification (CLI truncation). No scope creep — none touched files outside what the plan's cross-reference/mention/golden work already required to reach a working, verifiable state.

## TDD Gate Compliance

Both `tdd="true"` tasks (1 and 2) were executed procedurally as RED→GREEN — a failing test was written and observed to fail before any implementation code existed, then implementation was added and the test suite watched turn green — but each was committed as a **single combined commit** (`114f885` for Task 1, `359138e` for Task 2) rather than as separate `test(01-04): ...` (RED) and `feat(01-04): ...` (GREEN) commits. Task 1 established this pattern in a prior session before this continuation began; Task 2 followed the same pattern for consistency within one plan's commit history. Git log confirms: no `test(01-04):`-prefixed commits exist for either task, only the combined `feat(01-04):` commits. The RED/GREEN *discipline* was followed (tests genuinely failed first, per the executor's own terminal output at each step); only the *commit-granularity* convention was not.

## Issues Encountered

None beyond the two deviations documented above (both resolved). No unresolved blockers.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 1's read layer and domain model are complete: filesystem boundary proven by substitution, degradation proven per-file, cross-references resolved eagerly with dangling-as-data, and the decision-mention index built (exposed in the snapshot; the clickable UI is Phase 2/BACK-02 per STATE.md's roadmap decision).
- Three committed, clone-portable golden fixtures (`sparse-empty`, `sparse-started`, `dense`) are available for Phase 2 onward to develop the dashboard against without needing a real GSD project.
- **Outstanding, not performed by this executor:** the plan's `<verify><human-check>` manual smoke test against the real `~/studio-portal` reference project (D-04) — per `workflow.human_verify_mode: end-of-phase` in this project's config, this is harvested by the phase verifier into a consolidated UAT at end-of-phase, not run mid-plan. Whoever runs phase verification should execute it as written in `01-04-PLAN.md`'s Task 3 `<verify>` block: `npm run snapshot -- ~/studio-portal --stable`, confirm `ok` status, both live and archived-`v1.0` "Phase 1" entries appear distinct, the warning list is short and every entry names a real problem, the mention index shows a decision id spanning several files with sensible excerpts, and all four path forms (relative, `~`-prefixed, absolute, symlinked) resolve to the same root.

---
*Phase: 01-read-layer-domain-model*
*Completed: 2026-08-24*
