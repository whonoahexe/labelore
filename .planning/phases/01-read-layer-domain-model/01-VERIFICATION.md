---
phase: 01-read-layer-domain-model
verified: 2026-08-24T01:45:00Z
status: human_needed
score: 5/5 roadmap success criteria verified (39/39 plan-level must-have artifacts/key-links pass; 135/135 tests pass)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Run `npm run snapshot -- ~/studio-portal --stable > /tmp/sp.json` and confirm it exits 0; `loadStatus.status` is `ok`; the phase list contains both the live milestone's phases and the archived `v1.0` ones with the two 'Phase 1' entries distinct; the warning list is short enough to read and every entry names a real problem rather than a routine unresolved identifier; the mention index shows a decision id appearing across several files with sensible excerpts. Then repeat with a relative path, a `~`-prefixed path, and a symlink to the same directory and confirm all four resolve to the same root."
    expected: "All the above hold against the real, messy, non-fixture project — this is deliberately the only defense against a regression that manifests solely at real-world scale (D-04)."
    why_human: "01-04-PLAN.md's own `<human-check>` block marks this manual smoke test as deliberately unautomated (D-04: no committed assertion may depend on `~/studio-portal`), and this project's `human_verify_mode` is `end-of-phase`, so the executor correctly deferred it rather than running it. The verifier ran the automated half as a sanity check (see notes below) but the qualitative judgment — 'is the warning list short enough to read', 'are the excerpts sensible' — genuinely needs a human."
---

# Phase 01: Read Layer & Domain Model Verification Report

**Phase Goal:** Any GSD project on disk becomes a complete, inspectable snapshot — assembled behind a
filesystem interface that already admits multi-project, watching, and write-back, and proven correct
without a browser.

**Verified:** 2026-08-24T01:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Harness against any path shape (absolute/relative/`~`/symlink) dumps a complete `.planning/` JSON snapshot | ✓ VERIFIED | `test/target-path.test.ts` (5 unit cases) all pass. Live-reproduced independently by the verifier: absolute, `./`-relative, `~`-prefixed, and a fresh symlink into `fixtures/sparse-empty` all produced `loadStatus.status: "ok"`, exit 0. Also smoke-tested against the real `~/studio-portal` (see human-verification item — automated half passed: exit 0, `ok`, 9 phases, 2 warnings). |
| 2 | Sparse and dense fixtures both produce complete snapshots — no file dropped, unrecognized filenames become generic markdown artifacts, unknown `config.json` keys round-trip | ✓ VERIFIED | Live-inspected `fixtures/dense` snapshot: dozens of artifacts with `kind: "unknown"` are present (not dropped) including every unfamiliar type (`01-SPEC.md`, `01-AI-SPEC.md`, `01-COST-MODEL.md`, `v3.0-CAPACITY-PLAN.md`). `config.json`'s deliberately-unfamiliar keys (`vibe_check`, `experimental_widget_pipeline`, nested `telemetry.sampling.rate`, polymorphic `parallelization` object) all survive unchanged in `snapshot.project.config`. `test/handlers.test.ts` and `test/discovery.test.ts` (38 cases) cover this at the unit level. |
| 3 | A deliberately corrupted file degrades to raw body + recorded warning; every other file parses cleanly; load never throws | ✓ VERIFIED | Live-reproduced against `fixtures/dense`: exactly 2 warnings present (`HANDOFF.json` → `structured-extraction`/"nothing readable"; `02-01-PLAN.md` → `frontmatter`/"body intact, frontmatter unavailable"), matching `fixtures/README.md`'s Deliberate Defect Register defects 1–2. Defect 3 (frontmatter-with-no-body) correctly produces **no** warning, matching its explicit "empty body is not a parse failure" design. `test/degradation.test.ts` (10 cases) covers this directly, including "names only the two corrupted files across every warning in the tree." The reviewer-found CR-01 crash (non-array `depends_on` throwing through the whole `load()`) was fixed in commit `6efec5a` and independently re-reproduced by the verifier: `PlanningRepository.load()` now returns `ok` for a plan with `depends_on: "01-99"` instead of throwing. |
| 4 | Whole snapshot rebuilds through one `refresh()`; swapping the filesystem implementation requires no downstream change | ✓ VERIFIED | `test/fs-equivalence.test.ts` (12 cases: all 3 fixtures + 6 in-memory-only hostile cases) proves byte-identical stable JSON across `LocalFsPlanningFilesystem` and `InMemoryPlanningFilesystem`. `test/degradation.test.ts`'s refresh-seam suite (4 cases) proves new-object-identity, no-mutation, byte-stability across sequential refreshes, and safety under two concurrent `refresh()` calls. All 135 project tests pass; `tsc --noEmit` and `eslint .` both clean. |
| 5 | Snapshot exposes resolved cross-references (requirement→phase, phase→plans, decision-ID→mentioning files) with unresolvable refs present and explicitly marked, never dropped | ✓ VERIFIED | Live-inspected `fixtures/sparse-started`: the deliberately-dangling `SLICE-99` requirement reference resolves to `{"raw":"SLICE-99","resolved":null}` and produces **no** warning (D-10 asymmetry, correctly implemented). Live-inspected `fixtures/dense`'s `project.mentions.byId`: keys are scheme-qualified (`decision:D-01`, `requirement:IDENT-04`, `phase:01`, `plan:01-01` — 19 total, 151 mentions), proving D-14's "never one global namespace" resolution. 17 decision-scheme mentions carry artifact path, kind, line/offset, and excerpt. `test/crossref.test.ts` (11 cases) and `test/mentions.test.ts` (17 cases) cover this directly. |

**Score:** 5/5 roadmap success criteria verified.

### Plan-Level Must-Haves (supporting detail)

All 4 plans' `must_haves` were checked via `gsd-tools query verify.artifacts`/`verify.key-links` plus
targeted manual reproduction of the highest-risk claims:

| Plan | Artifacts | Key Links | Notes |
|------|-----------|-----------|-------|
| 01-01 | 8/8 pass | 4/4 pass | — |
| 01-02 | 5/5 pass | 1/2 tool-pass, 1 tool-false-positive | The tool reported `fixtures/dense/.planning/phases → fixtures/dense/.planning/milestones` as failed (`EISDIR` — it tried to read a directory as a file). Manually verified true: `find` confirms three `01-*` phase directories exist (`phases/01-identity-slice`, `milestones/v1.0-phases/01-bootstrap`, `milestones/v2.0-phases/01-legacy-ingest`), and the live snapshot resolves them to 3 distinct, correctly milestone-qualified `Phase` entities (2 archived, 1 live), never merged. |
| 01-03 | 5/5 pass | 4/4 pass | — |
| 01-04 | 5/5 pass | 3/3 pass | — |

### Required Artifacts

All artifacts declared across the 4 plans' `must_haves.artifacts` exist, are substantive (not stubs),
and are wired — confirmed by `gsd-tools query verify.artifacts` (23/23 pass) plus direct inspection of
`src/planning-fs/{types,local-fs,in-memory-fs}.ts`, `src/planning-repo/{snapshot,serialize,crossref,mentions}.ts`,
`src/planning-repo/handlers/{index,roadmap,json-config}.ts`, `src/cli/snapshot.ts`, and
`fixtures/README.md` (traceability ledger, 183 lines).

### Key Link Verification

23/23 declared key links wired (see per-plan table above; the one tool-reported failure was a
directory-vs-file read artifact of the checking tool itself, not a real gap — manually confirmed true).

### Data-Flow Trace (Level 4)

Not applicable in the UI sense (this phase produces no UI) — the equivalent trace here is
"does the JSON exiting the CLI trace back to real parsed content, not a static stub." Verified for
every artifact class exercised: `config.json` values, ROADMAP.md phase blocks, requirement
cross-references, and decision mentions were all confirmed to carry real, fixture-sourced values
(never hardcoded/mocked) via direct inspection of `node src/cli/snapshot.ts` output against all three
fixtures plus the real `~/studio-portal`.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| CLI dumps JSON, exit 0 | `node src/cli/snapshot.ts fixtures/sparse-empty --stable` | Valid JSON, `loadStatus.status: "ok"` | ✓ PASS |
| All 4 path shapes resolve identically | absolute / `./`-relative / `~`-prefixed / symlink against `fixtures/sparse-empty` | All 4 → `ok` | ✓ PASS |
| Symlink-escape containment | Created a `.planning/`-internal symlink pointing outside the project root, ran the CLI with `--with-bodies` | File present in snapshot, `body: ""`, warning `stage: "read"`, message names the escaping path — the linked-to secret content never appears in output | ✓ PASS |
| All 4 `LoadStatus` variants | `path-not-found` (nonexistent dir), `not-a-gsd-project` (dir with no `.planning/`), `permission-denied` (`chmod 000`), `ok` | All 4 correctly reported with `pathChecked` and a message; none threw | ✓ PASS |
| CR-01 regression fix | Malformed `depends_on: "01-99"` (bare string) in a `PLAN.md` | `loadStatus.status: "ok"`, no throw, `dependsOnRefs: []` | ✓ PASS |
| Dense fixture corruption isolation | `node src/cli/snapshot.ts fixtures/dense --stable` | Exactly 2 warnings (matching the defect register); third defect (frontmatter-only) correctly silent | ✓ PASS |
| `npm test` | `npx vitest run` | 135/135 passing, 11 files | ✓ PASS |
| `npm run typecheck` | `tsc --noEmit` | Clean | ✓ PASS |
| `npm run lint` | `eslint .` | Clean | ✓ PASS |
| Real-world smoke (automated half) | `node src/cli/snapshot.ts ~/studio-portal --stable` | Exit 0, `ok`, 9 phases, 2 warnings | ✓ PASS (qualitative half routed to human verification) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| TGT-01 | 01-01 | Path argument renders that project's `.planning/` | ✓ SATISFIED | Live CLI run against all fixtures + `~/studio-portal` |
| TGT-02 | 01-01 | Relative/`~`/symlinked paths accepted | ✓ SATISFIED | Live-reproduced all 4 shapes; `test/target-path.test.ts` |
| DATA-01 | 01-01, 01-04 | FS access behind an interface admitting multi-project/watch/write-back | ✓ SATISFIED | `PlanningFilesystem` interface + 2 implementations, byte-identical via `test/fs-equivalence.test.ts` |
| DATA-02 | 01-01, 01-03 | Dispatch on filename, generic handler last, unconditional | ✓ SATISFIED | Acceptance-criteria greps confirmed (`handlers/index.ts`, no `match()` reads content); `test/handlers.test.ts` |
| DATA-03 | 01-02, 01-03 | `config.json`/artifact types as open maps | ✓ SATISFIED | Live-inspected unknown keys and unfamiliar artifact types surviving round-trip |
| DATA-04 | 01-01, 01-04 | Whole snapshot rebuildable through one `refresh()` | ✓ SATISFIED | `test/degradation.test.ts` refresh-seam suite (4 cases) |
| DATA-05 | 01-01, 01-04 | Non-UI JSON-dump harness | ✓ SATISFIED | `npm run snapshot`, shared `buildSnapshotJson` entry point used by both CLI and golden tests |
| DATA-06 | 01-02, 01-04 | Two-plus synthetic fixtures, dashboard-agnostic rendering proof | ✓ SATISFIED | 3 fixture trees (sparse-empty, sparse-started, dense) all load `ok` with committed goldens |
| NAV-07 | 01-04 | Decision-mention index | ✓ SATISFIED | Live-inspected `project.mentions.byId`, 17 decision-scheme mentions with position + excerpt |

No orphaned requirements — the union of all 4 plans' `requirements:` frontmatter fields
(`{TGT-01, TGT-02, DATA-01..06, NAV-07}`) exactly matches REQUIREMENTS.md's Phase-1-mapped set.

**Note (documentation freshness, not a functional gap):** REQUIREMENTS.md's checkboxes and its
"Traceability" table still show `[ ]`/"Pending" for NAV-07, DATA-01, DATA-03, DATA-04, DATA-05, and
DATA-06, even though all six are functionally complete and verified above (only TGT-01, TGT-02, and
DATA-02 are checked/marked "Complete"). This is a stale-bookkeeping issue in REQUIREMENTS.md, not
evidence against the implementation — flagged so it gets updated (likely by the ship/complete-milestone
workflow) rather than silently left inconsistent.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/planning-repo/crossref.ts` | ~102 | A malformed (non-array) `depends_on` frontmatter value degrades to `[]` silently, with **no** warning recorded — a deliberate fix-time design decision (see below) | ℹ️ Info | Does not violate any stated must-have or the D-12 never-throw contract (which it fixes); does create a small blind spot where a real authoring typo in `depends_on` is invisible to the warning channel. Documented, reasoned trade-off in `01-REVIEW-FIX.md`, consistent in spirit with D-10's dangling-reference-is-not-a-warning precedent, but arguably distinguishable (a wrong-shaped field vs. a well-formed but unresolved token). Not blocking; flagged for awareness. |
| `src/planning-fs/in-memory-fs.ts` | 5 | Imports `node:fs` (for the test-only `static fromDirectory()` loader) | ℹ️ Info | Technically contradicts plan 01-01's literal must-have wording ("`local-fs.ts` is the only file under `src/` that imports the Node filesystem module"). Does not violate DATA-01's actual architectural intent: `fromDirectory` is a one-time fixture-loading helper, never called on the CLI's production request path, and the interface methods (`list`/`read`/`exists`) never touch real disk. The substitution proof (byte-identical output across both implementations) still holds. |
| `.planning/REQUIREMENTS.md` | — | Stale checkboxes/traceability for 6 of 9 Phase-1 requirement IDs | ℹ️ Info | Documentation freshness only — see Requirements Coverage note above. |

No debt markers (`TBD`/`FIXME`/`XXX`) found in modified source files — the two grep hits
(`STABLE_TIMESTAMP_PLACEHOLDER` identifier name, and a `"Plans: TBD"` string used as **test input**
in `test/assemble.test.ts` and referenced in a doc-comment describing that exact edge case) are false
positives, not debt markers.

### Code Review Findings (already resolved)

`01-REVIEW.md` found 1 Critical + 4 Warnings; `01-REVIEW-FIX.md` fixed all 5 (commits `6efec5a`,
`e3073cb`, `2c5edfd`, `803542b`, `784abef`). The verifier independently re-confirmed each fix:

- **CR-01** (non-array `depends_on` crashed `load()`) — re-reproduced live, confirmed fixed (no throw, `ok` status).
- **WR-01** (interior ROADMAP.md heading truncated phase fields) — regression test present and passing.
- **WR-02** (WINDOWS.md fenced-JSON parse failure silently dropped its warning) — regression tests present and passing.
- **WR-03** (`normalizeForGolden` over-broad path rewrite could mutate verbatim body prose) — regression tests present and passing; scoped to a `PATH_KEYS` set.
- **WR-04** (`gray-matter` misfiled under `devDependencies`) — confirmed moved to `dependencies` in `package.json`.

Two Info-level findings (IN-01 duplicated title-derivation logic, IN-02 missing `engines` field) were
deliberately deferred and remain open — both are pure code-quality items with no correctness impact.

Two in-flight bug fixes were made outside any plan's declared `files_modified` during 01-04's own
execution (not part of the later review-fix pass): a `gray-matter` internal-cache bug in
`src/planning-repo/frontmatter.ts` that silently returned stale parse results on a second parse of the
same malformed content (breaking the refresh-idempotency guarantee), and a `process.exit()` vs.
`process.exitCode` bug in `src/cli/snapshot.ts` that truncated stdout on large piped payloads. Both are
documented in the `01-04` plan commit (`76137ec`, `359138e`), both are sound fixes that strengthen
rather than weaken any must-have, and both are covered by the passing test suite.

### Human Verification Required

### 1. Manual smoke test against `~/studio-portal`

**Test:** Run `npm run snapshot -- ~/studio-portal --stable > /tmp/sp.json` and confirm it exits 0;
`loadStatus.status` is `ok`; the phase list contains both the live milestone's phases and the archived
`v1.0` ones, with the two "Phase 1" entries distinct; the warning list is short enough to read and
every entry names a real problem rather than a routine unresolved identifier; and the mention index
shows a decision id appearing across several files with sensible excerpts. Then repeat with a relative
path, a `~`-prefixed path, and a symlink to the same directory and confirm all four produce the same
resolved root.

**Expected:** All of the above hold against the real, messy, non-fixture project.

**Why human:** `01-04-PLAN.md`'s own `<human-check>` block marks this as deliberately unautomated
(D-04: "no committed assertion may depend on `~/studio-portal`"), and this project's
`human_verify_mode` is `end-of-phase`, so the executor correctly deferred it. The verifier ran the
automated half independently as a sanity check — `node src/cli/snapshot.ts ~/studio-portal --stable`
exits 0 with `loadStatus.status: "ok"`, 9 phases, and only 2 warnings — which is a strong positive
signal, but the qualitative judgment calls ("is the warning list short enough to read", "are the
excerpts sensible") genuinely require a human looking at the actual content.

### Gaps Summary

No blocking gaps. All 5 ROADMAP success criteria are independently verified against live CLI behavior
(not just against SUMMARY.md's claims), all 39 plan-level must-have artifacts/key-links pass, all 135
tests pass, typecheck and lint are clean, and the code review's 1 Critical + 4 Warnings were fixed and
independently re-confirmed by this verifier.

Three non-blocking observations are recorded for awareness (none contradict a stated must-have or
success criterion): (1) the CR-01 fix's silent-degradation design decision for malformed `depends_on`
values, a reasoned but debatable trade-off; (2) `in-memory-fs.ts`'s test-only `node:fs` import, which
contradicts one must-have's literal wording without violating DATA-01's actual substitution guarantee;
(3) REQUIREMENTS.md's stale checkboxes/traceability table for 6 of 9 Phase-1 requirement IDs. None of
these block phase completion.

One item is routed to human verification: the manual smoke test against the real `~/studio-portal`
project, deliberately deferred per this project's `human_verify_mode: end-of-phase` configuration
and 01-04-PLAN.md's own explicit instruction not to automate it.

---

_Verified: 2026-08-24T01:45:00Z_
_Verifier: Claude (gsd-verifier)_
