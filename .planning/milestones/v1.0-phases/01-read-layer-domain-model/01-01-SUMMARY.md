---
phase: 01-read-layer-domain-model
plan: 01
subsystem: read-layer
tags: [typescript, vitest, gray-matter, filesystem-abstraction, cli, tdd]

requires: []
provides:
  - "PlanningFilesystem boundary (Layer A) with a Node-backed and an in-memory implementation, proven byte-identical against the same fixture"
  - "PlanningRepository.load()/refresh() — the single, never-throwing snapshot seam a future watcher will call"
  - "The four-variant LoadStatus contract (ok / not-a-gsd-project / path-not-found / permission-denied), each carrying the exact path checked, with wording centralized in one exported message map"
  - "GSD-agnostic domain model (Project, Milestone, Phase, PhaseIdentity, Plan, PlanSummary, Requirement, Artifact, QuickTask) with zero imports from the parsing layers"
  - "normalizeForGolden — the one serializer owning every machine-varying value (paths, mtimeMs, readAt, body presence)"
  - "npm run snapshot -- <path> CLI plus a Vitest golden suite sharing the identical buildSnapshotJson entry point"
  - "sparse-empty fixture and its committed golden snapshot"
affects: ["01-02", "01-03", "01-04", "phase-02", "phase-04"]

actuals:
  tokens: 37242
  tasks: 3
  commits: 3

tech-stack:
  added: ["typescript@5.9.3 (TS7 fallback per CLAUDE.md escape hatch)", "vitest@4.1.11", "gray-matter@4.0.3", "@types/node@22.20.1 (version-pin fallback)", "eslint@10.8.1", "typescript-eslint@8.67.0", "@eslint/js@10.0.1", "globals@17.11.0", "prettier@3.9.6"]
  patterns:
    - "Layer A (planning-fs) / Layer B (planning-repo) / domain — strict one-way dependency, enforced by an acceptance-criteria grep for node:fs imports outside planning-fs/"
    - "Registry-dispatched artifact handlers with an unconditional generic handler always last"
    - "One normalizing serializer (normalizeForGolden) owns every machine-varying value instead of scattering path/timestamp rewrites across call sites"
    - "resolveContained() containment guard: every read/list re-canonicalizes and refuses results outside the root, converted to a visible warning rather than silently dropped or thrown"
    - "LoadStatus message wording centralized in one exported map (LOAD_STATUS_MESSAGES) instead of inlined per branch"

key-files:
  created:
    - src/planning-fs/types.ts
    - src/planning-fs/local-fs.ts
    - src/planning-fs/in-memory-fs.ts
    - src/planning-repo/types.ts
    - src/planning-repo/frontmatter.ts
    - src/planning-repo/warnings.ts
    - src/planning-repo/discovery.ts
    - src/planning-repo/registry.ts
    - src/planning-repo/handlers/generic.ts
    - src/planning-repo/assemble.ts
    - src/planning-repo/snapshot.ts
    - src/planning-repo/serialize.ts
    - src/cli/target-path.ts
    - src/cli/snapshot.ts
    - src/domain/model.ts
    - fixtures/sparse-empty/.planning/PROJECT.md
    - fixtures/sparse-empty/.planning/REQUIREMENTS.md
    - fixtures/sparse-empty/.planning/STATE.md
    - test/snapshot.golden.test.ts
    - test/__golden__/sparse-empty.json
    - test/target-path.test.ts
    - package.json
    - tsconfig.json
    - vitest.config.ts
    - eslint.config.js
  modified:
    - src/planning-fs/local-fs.ts (Task 2: added checkReadAccessSync)
    - src/cli/target-path.ts (Task 2: added LOAD_STATUS_MESSAGES map, permission-denied fix)
    - src/planning-repo/registry.ts (Task 2: read-failure warning now carries the thrown error's own message)

key-decisions:
  - "typescript pinned to 5.9.3, not the 7.0.2 named in CLAUDE.md — TS7 violates typescript-eslint@8.67.0's peer range (>=4.8.4 <6.1.0); this is the fallback CLAUDE.md itself names."
  - "@types/node pinned to 22.20.1 — 22.23.1 does not exist on the npm registry."
  - "Node's native TS type-stripping rejects constructor parameter properties as non-erasable syntax; every class in this codebase uses plain field declarations with explicit constructor assignment instead."
  - ".npmrc sets loglevel=silent so npm run <script> never pollutes stdout, preserving the 'stdout parses as pure JSON' contract."
  - "permission-denied was silently misclassified as not-a-gsd-project for a mode-000 directory, because stat()/existsSync() only need parent-directory execute permission and existsSync swallows the EACCES it hits probing for a .planning child. Fixed by adding an explicit accessSync(R_OK|X_OK) check (checkReadAccessSync) before trusting those existence checks."
  - "The inside-tree symlink-escape warning previously read the generic 'File could not be read' — now registry.ts's read-failure catch reuses the thrown error's own .message (PathEscapeError's text already names the escaping relative path and its resolved target), keeping the decoupling from any concrete PlanningFilesystem implementation intact."

requirements-completed: [TGT-01, TGT-02, DATA-01, DATA-02, DATA-04, DATA-05]

coverage:
  - id: D1
    description: "A user-supplied project path (absolute, relative, ~-prefixed, symlinked, or pointing directly at .planning/) resolves to a canonicalized root and produces normalized snapshot JSON via one CLI command, exit 0."
    requirement: "TGT-01"
    verification:
      - kind: unit
        ref: "test/target-path.test.ts#resolves an absolute path to a project root as ok"
        status: pass
      - kind: unit
        ref: "test/target-path.test.ts#resolves a relative path to the same root identically to the absolute case"
        status: pass
      - kind: unit
        ref: "test/target-path.test.ts#resolves a tilde-prefixed path when the fixture is reachable from $HOME"
        status: pass
      - kind: unit
        ref: "test/target-path.test.ts#resolves a symlinked root to the symlink's target, not the link path"
        status: pass
      - kind: unit
        ref: "test/target-path.test.ts#resolves a path pointing directly at .planning identically to its parent"
        status: pass
      - kind: e2e
        ref: "npm run snapshot -- fixtures/sparse-empty --stable"
        status: pass
    human_judgment: false
  - id: D2
    description: "load()/refresh() never throw; every failure names one of the four LoadStatus values plus the exact path checked, with wording centralized in one exported message map."
    requirement: "TGT-02"
    verification:
      - kind: unit
        ref: "test/target-path.test.ts#returns path-not-found for a nonexistent path, without throwing"
        status: pass
      - kind: unit
        ref: "test/target-path.test.ts#returns not-a-gsd-project for an existing directory with no .planning child, without throwing"
        status: pass
      - kind: unit
        ref: "test/target-path.test.ts#returns permission-denied for a directory whose read permission is removed, without throwing"
        status: pass
      - kind: unit
        ref: "test/target-path.test.ts#maps every non-ok status to project: null and a non-empty message"
        status: pass
    human_judgment: false
  - id: D3
    description: "The PlanningFilesystem boundary holds — a second (in-memory) implementation produces byte-identical snapshot output to the Node-backed one."
    requirement: "DATA-01"
    verification:
      - kind: unit
        ref: "test/snapshot.golden.test.ts#produces byte-identical output through InMemoryPlanningFilesystem.fromDirectory"
        status: pass
      - kind: other
        ref: "! grep -rlE \"from 'node:fs'\" src --include='*.ts' | grep -qv '^src/planning-fs/'"
        status: pass
    human_judgment: false
  - id: D4
    description: "The generic markdown handler matches unconditionally, is registered last, and every discovered artifact (including unrecognized file types) survives as kind: 'unknown' rather than being dropped."
    requirement: "DATA-02"
    verification:
      - kind: unit
        ref: "test/snapshot.golden.test.ts#matches the committed golden via LocalFsPlanningFilesystem"
        status: pass
      - kind: other
        ref: "src/planning-repo/registry.ts HANDLERS array — GenericMarkdownHandler declared last"
        status: pass
    human_judgment: false
  - id: D5
    description: "The whole snapshot is rebuildable through one refresh() entry point, which is also what a future watcher will call."
    requirement: "DATA-04"
    verification:
      - kind: unit
        ref: "src/planning-repo/snapshot.ts — PlanningRepository.load()/refresh()"
        status: pass
    human_judgment: false
  - id: D6
    description: "A non-UI harness (CLI + Vitest) dumps the parsed snapshot as JSON through one shared entry point, bodies omitted by default with length+hash retained, --with-bodies restores them, --stable makes goldens clone-portable."
    requirement: "DATA-05"
    verification:
      - kind: e2e
        ref: "npm run snapshot -- fixtures/sparse-empty --stable / --with-bodies"
        status: pass
      - kind: unit
        ref: "test/snapshot.golden.test.ts (both cases)"
        status: pass
    human_judgment: false
  - id: D7
    description: "An inside-tree symlink resolving outside the canonicalized root has its content refused, not silently followed or silently dropped — the artifact still appears with an empty body and a stage 'read' warning naming the escaping path."
    verification:
      - kind: unit
        ref: "test/target-path.test.ts#refuses to return content for a symlink inside the tree resolving outside the canonicalized root"
        status: pass
    human_judgment: false
  - id: D8
    description: "Manual smoke test against the real ~/studio-portal reference project (D-04) — exits 0, loadStatus ok, artifact list looks like a real .planning/ tree rather than empty/truncated."
    verification: []
    human_judgment: true
    rationale: "D-04 explicitly scopes this as a manual smoke target with zero committed assertions — automation already ran it this session (see Accomplishments) and it looked correct, but the plan reserves final judgment for a human per its own design."

duration: ~35min (active execution across two sessions, split by the tracer feedback gate checkpoint)
completed: 2026-08-22
status: complete
---

# Phase 1 Plan 1: Read Layer & Domain Model — End-to-End Tracer Summary

**A canonicalized-path CLI (`npm run snapshot`) reads any GSD `.planning/` tree through a swappable `PlanningFilesystem` boundary, discovers and dispatches every artifact through a registry-based handler chain, assembles an immutable `ProjectSnapshot`, and normalizes it into clone-portable golden JSON — proven end-to-end by two Vitest suites (12 tests) and a byte-identical second filesystem implementation.**

## Performance

- **Duration:** ~35 min active execution (Task 1 tracer + Task 2 TDD hardening), across two sessions separated by the plan's tracer feedback gate checkpoint (human approval required before expansion)
- **Started:** 2026-08-22 (Task 1)
- **Completed:** 2026-08-22T16:00:25Z (Task 2)
- **Tasks:** 3 (package-legitimacy gate + tracer + TDD hardening task)
- **Files modified:** 29 created, 3 further modified in Task 2

## Accomplishments

- Established the Labelore repository: ES-module TypeScript project pinned to the versions in `.claude/CLAUDE.md` (with two documented version-pin fallbacks), Vitest, ESLint flat config, no build step — Node's native type-stripping runs `.ts` sources directly.
- Wired one production-quality path through every layer: `resolveTargetPath` → `LocalFsPlanningFilesystem` → `discover()` → `parseWithRegistry()` (`GenericMarkdownHandler`) → `assembleDomainModel()` → `PlanningRepository.load()` → `normalizeForGolden()` → CLI JSON on stdout.
- Proved the `PlanningFilesystem` seam is real, not aspirational: `InMemoryPlanningFilesystem.fromDirectory()` walks the same fixture and produces byte-identical normalized JSON to the Node-backed implementation.
- Authored the `sparse-empty` fixture traced line-by-line to `~/.claude/gsd-core/templates/` (never to `~/studio-portal`), and committed its golden snapshot.
- Hardened the path-targeting contract with a dedicated Vitest suite (`test/target-path.test.ts`, 10 cases) covering all nine behaviors in the plan's `<behavior>` block, following RED → GREEN discipline: wrote the tests first, confirmed exactly two genuine failures, then fixed only those two.
- Fixed a real bug the tests caught: a directory with all permission bits removed (`chmod 000`) was misclassified as `not-a-gsd-project` instead of `permission-denied`, because `stat`/`existsSync` only need execute permission on the *parent* directory and `existsSync` swallows the `EACCES` it hits probing for a `.planning` child. Added `checkReadAccessSync` (explicit `accessSync(R_OK|X_OK)`) to catch this before the existence checks run.
- Fixed the inside-tree symlink-escape warning to name the escaping path: `registry.ts`'s read-failure catch now reuses the thrown error's own `.message` (`PathEscapeError`'s text already carries the relative path and resolved target) instead of a generic "File could not be read" string — without importing any concrete `PlanningFilesystem` implementation into the registry.
- Centralized all four `LoadStatus` message strings into one exported map (`LOAD_STATUS_MESSAGES`) in `src/cli/target-path.ts` so wording can never drift between call sites, and so Phase 4's error screens can reuse it verbatim.
- Ran the manual `~/studio-portal` smoke test (D-04): exits 0, `loadStatus.status: "ok"`, real artifact list populated correctly.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "dump a GSD project as JSON" — one path only** — `9595d41` (feat) — completed and independently verified by the orchestrator in a prior session (tsc, eslint, tests, snapshot stdout-as-JSON, two-run byte-identity all confirmed passing).
2. **Task 2 (RED): Add failing tests for path targeting and never-throwing load contract** — `08b1f2d` (test)
3. **Task 2 (GREEN): Harden path targeting and never-throwing load contract** — `94709a6` (feat)

_No REFACTOR commit — the GREEN implementation needed no further cleanup; the changes were already minimal and localized._

**Checkpoint cleared:** the plan's package-legitimacy gate (Task 0, `gate="blocking-human"`) — approved in a prior session; not re-presented per the continuation instructions. The tracer feedback gate after Task 1 was also approved ("approved", no changes requested) before this session began Task 2.

## Files Created/Modified

- `src/planning-fs/types.ts` — `PlanningFilesystem`, `DirEntry`, `FileRead`, `FsCapabilities`
- `src/planning-fs/local-fs.ts` — Node-backed implementation, sole `node:fs` importer under `src/`; Task 2 added `checkReadAccessSync`
- `src/planning-fs/in-memory-fs.ts` — Map-backed implementation, `fromDirectory()` static loader
- `src/planning-repo/types.ts` — `LoadStatus`, `WarningStage`, `ParseWarning`, `ArtifactRef`, `ArtifactHandler`, `ProjectSnapshot`
- `src/planning-repo/frontmatter.ts` — guarded `tryParseFrontmatter`/`tryParseJson`, prototype-pollution stripping
- `src/planning-repo/warnings.ts` — `WarningCollector`, the single source of truth for both `snapshot.warnings` and per-artifact warnings
- `src/planning-repo/discovery.ts` — filename/directory-position dispatch, deterministic sorted order, cycle guard
- `src/planning-repo/registry.ts` — `HANDLERS` array (generic handler last), `parseWithRegistry`; Task 2 fixed the read-failure warning message
- `src/planning-repo/handlers/generic.ts` — `GenericMarkdownHandler`, unconditional match
- `src/planning-repo/assemble.ts` — `assembleDomainModel`, root-document slice only in this plan
- `src/planning-repo/snapshot.ts` — `PlanningRepository`, the never-throwing `load()`/`refresh()` seam
- `src/planning-repo/serialize.ts` — `normalizeForGolden`, the one serializer owning every machine-varying value
- `src/cli/target-path.ts` — `resolveTargetPath`; Task 2 added `LOAD_STATUS_MESSAGES` and the permission-denied fix
- `src/cli/snapshot.ts` — `buildSnapshotJson`, shared by CLI and test suite
- `src/domain/model.ts` — dependency-free entity types
- `fixtures/sparse-empty/.planning/{PROJECT,REQUIREMENTS,STATE}.md` — template-traced sparse fixture
- `test/snapshot.golden.test.ts` + `test/__golden__/sparse-empty.json` — golden suite
- `test/target-path.test.ts` — Task 2's TDD suite, 10 cases

## Decisions Made

See `key-decisions` in frontmatter. Summary: two version-pin fallbacks (`typescript@5.9.3`, `@types/node@22.20.1`) documented and carried forward from Task 1; a real permission-detection bug found and fixed by the TDD suite in Task 2; the symlink-escape warning message improved to name the offending path via error-message reuse rather than a new type-coupling.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `typescript@7.0.2` incompatible with `typescript-eslint@8.67.0`'s peer range**
- **Found during:** Task 1 (scaffold)
- **Issue:** CLAUDE.md's primary pin (`typescript` 7.0.2) violates `typescript-eslint@8.67.0`'s documented peer range (`>=4.8.4 <6.1.0`)
- **Fix:** Used the escape hatch CLAUDE.md itself names — pinned `typescript@5.9.3`
- **Files modified:** `package.json`
- **Verification:** `npx tsc --noEmit` and `npx eslint .` both exit 0
- **Committed in:** `9595d41` (Task 1 commit)

**2. [Rule 1 - Bug] `@types/node@22.23.1` does not exist on the npm registry**
- **Found during:** Task 1 (scaffold)
- **Issue:** The version named in CLAUDE.md's stack table is not a published version
- **Fix:** Pinned `@types/node@22.20.1`, the nearest published version
- **Files modified:** `package.json`
- **Verification:** `npm install` succeeds, `tsc --noEmit` exits 0
- **Committed in:** `9595d41` (Task 1 commit)

**3. [Rule 3 - Blocking] Node's native TS type-stripping rejects constructor parameter properties**
- **Found during:** Task 1 (scaffold)
- **Issue:** `constructor(public readonly x: string)` shorthand is non-erasable syntax under Node's native strip-only TypeScript support; every class using it fails to run without a build step
- **Fix:** Every class in the codebase uses plain field declarations with explicit constructor assignment instead. `tsx`/`ts-node` deliberately not installed.
- **Files modified:** all class-bearing files (`local-fs.ts`, `in-memory-fs.ts`, `warnings.ts`, `snapshot.ts`)
- **Verification:** `node src/cli/snapshot.ts` runs directly with zero flags
- **Committed in:** `9595d41` (Task 1 commit)

**4. [Rule 3 - Blocking] `npm run <script>` output was polluting the "stdout parses as pure JSON" contract**
- **Found during:** Task 1 (scaffold)
- **Issue:** npm's default lifecycle output (e.g. "> labelore@0.1.0 snapshot") prepends to stdout, breaking `JSON.parse` on the CLI's output
- **Fix:** Added `.npmrc` with `loglevel=silent`
- **Files modified:** `.npmrc`
- **Verification:** `npm run snapshot -- fixtures/sparse-empty --stable` stdout parses as pure JSON
- **Committed in:** `9595d41` (Task 1 commit)

**5. [Rule 1 - Bug] `permission-denied` misclassified as `not-a-gsd-project` for a mode-000 directory**
- **Found during:** Task 2 RED phase — `test/target-path.test.ts`'s permission-denied case failed with `"not-a-gsd-project"` instead of `"permission-denied"`
- **Issue:** `stat()` only requires execute permission on the parent directory, so a directory with all its own permission bits stripped still stats fine as a directory. The subsequent `existsSync(join(resolvedPath, '.planning'))` check then hits `EACCES` internally, which `existsSync` swallows and reports as `false` — indistinguishable from "directory exists but genuinely has no `.planning` child."
- **Fix:** Added `checkReadAccessSync` (`accessSync(R_OK|X_OK)`, non-throwing) to `local-fs.ts` and call it in `resolveTargetPath` right after the directory-stat check, before trusting any `.planning`-existence result.
- **Files modified:** `src/planning-fs/local-fs.ts`, `src/cli/target-path.ts`
- **Verification:** `test/target-path.test.ts#returns permission-denied for a directory whose read permission is removed` passes; full suite (12 tests) green
- **Committed in:** `94709a6` (Task 2 GREEN commit)

**6. [Rule 1 - Bug] Inside-tree symlink-escape warning didn't name the escaping path**
- **Found during:** Task 2 RED phase — the escape test asserted the warning message contains `escape.md`; it received the generic string `"File could not be read"`
- **Issue:** `registry.ts`'s `parseWithRegistry` caught any `fs.read()` failure with one hardcoded message, discarding the more specific error thrown by `LocalFsPlanningFilesystem`'s containment guard (`PathEscapeError`, which already names the relative path and resolved target)
- **Fix:** Catch block now uses `err.message` when the caught value is an `Error`, falling back to the generic string otherwise — no new import or type coupling to any concrete `PlanningFilesystem` implementation
- **Files modified:** `src/planning-repo/registry.ts`
- **Verification:** `test/target-path.test.ts#refuses to return content for a symlink...` passes
- **Committed in:** `94709a6` (Task 2 GREEN commit)

---

**Total deviations:** 6 auto-fixed (4 from Task 1: 2 dependency-version bugs, 1 syntax-compatibility blocker, 1 CLI-output blocker; 2 from Task 2: real bugs the TDD suite caught before they could reach production).
**Impact on plan:** All auto-fixes were necessary for correctness (a real permission-classification bug and an unhelpful warning message) or for the scaffold to run at all (version pins, syntax constraints, output hygiene). No scope creep — no feature was added beyond what the plan specified.

### Acceptance-Criteria Environmental Note (not a code deviation)

One of Task 2's literal acceptance criteria — *"Running `npm run snapshot -- .` from the repository root exits nonzero with a message naming the resolved repository path and stating no planning directory was found"* — is **not reproducible in this repository as written**, because this repository (`labelore`) is itself GSD-managed: its own `.planning/` directory (used to run *this very phase*) already exists at the repo root. Running the literal command therefore correctly exits `0` with `loadStatus.status: "ok"`, which is the CORRECT behavior for a directory that genuinely has a `.planning/` child — not a bug.

The underlying behavior the criterion intended to verify (a directory that exists but has no `.planning/` child produces `not-a-gsd-project`, naming the resolved path, without throwing) IS fully covered and passing: `test/target-path.test.ts#returns not-a-gsd-project for an existing directory with no .planning child, without throwing`, exercised against a freshly created temp directory guaranteed to lack `.planning/`. No implementation change was needed or made in response to this note — it is a documentation artifact of the plan assuming a fact about this repo (no self-hosted `.planning/` at the time of writing) that later became false once GSD itself started managing this project's own development.

## Issues Encountered

None beyond the deviations documented above — all were resolved within the deviation-handling rules without requiring a plan change or user decision.

## Known Stubs

None. Task 1 explicitly scoped stubs as acceptable only where a later plan fills them without changing a signature (`HANDLERS` holding exactly one handler; `assembleDomainModel` populating only the root-document slice) — both are documented, intentional, and load-bearing for plan `01-03`, not incomplete work hiding a gap.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- The `PlanningFilesystem` boundary, the `LoadStatus`/`ProjectSnapshot` contract, and the domain model's `PhaseIdentity`/`roadmapComplete`/`diskStatus` shape are all now load-bearing and proven; plans `01-02` through `01-04` and all of Phases 2–4 build directly on them without re-shaping.
- Plan `01-03` (structured-extraction depth) can now register typed handlers ahead of `GenericMarkdownHandler` in `HANDLERS` — the registry's ordering contract and unconditional-fallback behavior are proven.
- Plan `01-04` has both `LocalFsPlanningFilesystem` and `InMemoryPlanningFilesystem.fromDirectory()` available to run identical fixtures through two implementations, as `DATA-01`'s substitution proof requires.
- No blockers. The manual `~/studio-portal` smoke test (D-04) passed but remains, by design, outside the committed assertion set — a human should still glance at its output per the plan's own human-check note before treating Phase 1's read layer as fully trustworthy against a real, non-fixture project.

---
*Phase: 01-read-layer-domain-model*
*Completed: 2026-08-22*

## Self-Check: PASSED

All key files verified present on disk; all three task commits (`9595d41`, `08b1f2d`, `94709a6`) verified in git log; `npx tsc --noEmit`, `npx eslint .`, and `npm test` (12/12) all re-verified passing after Task 2's changes.
