---
phase: 01-read-layer-domain-model
fixed_at: 2026-08-23T19:45:46Z
review_path: .planning/phases/01-read-layer-domain-model/01-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 01: Code Review Fix Report

**Fixed at:** 2026-08-23T19:45:46Z
**Source review:** .planning/phases/01-read-layer-domain-model/01-REVIEW.md
**Iteration:** 1

**Fix scope:** `critical_warning` — CR-01 and WR-01 through WR-04. IN-01 and IN-02 were deliberately
out of scope for this run and remain open (see "Deferred / Out of Scope" below).

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

**Verification (run in the main checkout, no worktree — per this run's explicit configuration):**
After every fix and again at the end of the run: `npm run typecheck` (clean), `npm run lint`
(clean), `npm test` (135/135 passing, up from the pre-fix baseline of 128 — 7 new regression tests
added, one per fix except WR-04 which needed none). All three gates are reproducible from the
current `master` HEAD.

## Fixed Issues

### CR-01: Non-array `depends_on` frontmatter crashes the entire snapshot load, violating the "never throw" contract

**Files modified:** `src/planning-repo/crossref.ts`, `test/crossref.test.ts`
**Commit:** `6efec5a`
**Applied fix:** Replaced the unguarded `((plan.frontmatter.depends_on as unknown[] | undefined) ??
[]).map(...)` with an `Array.isArray()` check that degrades any non-array value (bare string,
number, mapping) to `[]` ("no dependencies") rather than throwing. This restores D-12's
"`load()`/`refresh()` never throw" contract for the whole snapshot when one `PLAN.md` has a
malformed `depends_on`.

**Design decision — no warning emitted:** The reviewer's fix suggestion noted this "optionally"
could route through the warning channel (`WarningCollector`, `assembly` stage). I evaluated this and
chose NOT to add one, matching the reviewer's own minimal suggested code exactly. Reasoning:
`assembleDomainModel()` currently receives only a already-materialized `ParseWarning[]` snapshot
(the `_warnings` param, explicitly unused and prefixed with `_`), not the live `WarningCollector`
instance — wiring a warning through would require threading the collector itself into
`assembleDomainModel()` and `resolveCrossReferences()`, a signature change touching three call sites
(`snapshot.ts`, and two test files) for a code path with no existing precedent (`grep` confirms zero
existing uses of `stage: 'assembly'` anywhere in the codebase or its tests). D-10's already-documented
asymmetry — a dangling reference is intentional data and must NOT warn — sets a precedent that not
every raw-frontmatter quirk needs a warning; degrading silently to "no dependencies" is consistent
with that precedent and is the lower-risk choice for a `critical_warning`-scoped fix pass. This
decision is flagged here for visibility, not hidden in the diff.

**Hardening check (per fix-task instruction):** Searched the whole `src/planning-repo/` tree for any
other `.map()`/array-cast called directly on a raw `frontmatter.*` field — `crossref.ts:102` (now
fixed) was the ONLY occurrence. No other latent defect of this shape exists.

**Regression tests added:** two new tests in `test/crossref.test.ts` — (1) exercises
`assembleDomainModel` directly with `depends_on: "01-99"` (a bare string) and asserts
`dependsOnRefs` is `[]` rather than throwing; (2) exercises the exact reproduction from the review
report through `PlanningRepository.load()` end-to-end and asserts `loadStatus.status === 'ok'` with
a non-null project.

**Status:** `fixed` — this is a pure degrade-vs-throw fix (structural, not a logic/algorithm change);
no `"requires human verification"` flag needed.

### WR-01: An interior markdown heading inside a ROADMAP.md phase block silently truncates that phase's parsed fields

**Files modified:** `src/planning-repo/handlers/roadmap.ts`, `test/handlers.test.ts`
**Commit:** `e3073cb`
**Applied fix:** `extractRawPhaseBlocks()` now only treats a heading as a block boundary when it
matches the `Phase N:` pattern. A non-`Phase N:` heading (e.g. an interior `#### Notes` subsection)
is pushed onto the current phase's `lines` as ordinary content instead of closing the block — applied
exactly as the reviewer's minimal-fix suggestion, and updated the function's own doc comment to
describe the corrected boundary rule.

**Regression test added:** `test/handlers.test.ts` — a phase block containing goal text, an interior
`#### Notes` heading, then `**Requirements**`, `**Success Criteria**`, and a `Plans:` checklist;
asserts all four fields are still parsed correctly (previously `requirementIds`, `successCriteria`,
and `plans` would have been silently empty).

**Golden snapshots:** unaffected — `npm run test` re-ran `test/snapshot.golden.test.ts` and all three
committed goldens (`sparse-empty`, `sparse-started`, `dense`) still matched byte-for-byte; none of the
fixture ROADMAP.md files contain an interior non-`Phase N:` heading inside a phase block. No
regeneration was needed or performed.

**Status:** `fixed`.

### WR-02: WINDOWS.md's fenced-JSON parse failure silently drops its warning

**Files modified:** `src/planning-repo/handlers/windows.ts`, `test/handlers.test.ts`
**Commit:** `2c5edfd`
**Applied fix:** `extractFencedJson()` now returns the full `JsonParseResult` (data + warning) instead
of discarding everything but `.data`. `WindowsHandler.parse()` surfaces `fm.warning ??
jsonResult?.warning` — the frontmatter-stage failure still takes priority if both occur, since
`HandlerParseResult.warning` can only carry one warning per artifact (confirmed against
`registry.ts`'s single-warning-per-parse dispatch).

**Regression tests added:** `test/handlers.test.ts` — (1) a malformed fenced JSON block (trailing
comma) still falls back to the table for `rows`/`rowSource`, but now also asserts
`warning.stage === 'structured-extraction'` and the JSON-parse-failure message; (2) a WINDOWS.md
with no fenced JSON block at all still produces no warning (guards against a regression where every
table-only WINDOWS.md would spuriously warn).

**Status:** `fixed`.

### WR-03: `normalizeForGolden`'s absolute-path rewrite applies to every string value, including verbatim `body` text

**Files modified:** `src/planning-repo/serialize.ts`, `test/serialize.test.ts` (new file)
**Commit:** `803542b`
**Applied fix:** Added a `PATH_KEYS` set (`rootPath`, `pathChecked`, `rawPath`, `path`, `id`,
`dirPath`, `artifactPath`) and scoped the `JSON.stringify` replacer's rewrite to
`PATH_KEYS.has(key) && value.startsWith(rootPath)` instead of matching every string by value shape
alone. Verified the two-part guard is safe even though `id`/`path` are reused for non-path data
elsewhere (`Plan.id`, `Requirement.id`, `QuickTask.id` are short tokens like `"01-02"` that can never
start with an absolute `rootPath`) — the `startsWith(rootPath)` half of the guard was already the
load-bearing check pre-fix and remains so.

**Regression tests added:** new `test/serialize.test.ts` — (1) confirms `Project.rootPath` is still
correctly rewritten to `.` (proves the fix didn't over-scope and break the legitimate rewrite); (2)
constructs a `PROJECT.md` whose body prose literally contains the project's absolute root path as a
substring and asserts the serialized `Artifact.body` is byte-identical to the source, i.e. no longer
silently mutated.

**Golden snapshot regeneration: NOT needed, verified explicitly.** All three committed goldens in
`test/__golden__/` are built with `{ stable: true, withBodies: false }` (confirmed by reading
`test/snapshot.golden.test.ts`) — `body` is stripped from golden output entirely, so this fix (which
only changes body-text handling) cannot affect them. Ran `npx vitest run test/snapshot.golden.test.ts`
after the fix: all 3 fixtures still matched their committed golden byte-for-byte. No `npm run
snapshot` regeneration was performed, and none was required.

**Status:** `fixed`.

### WR-04: `gray-matter` is a runtime dependency but is declared in `devDependencies`

**Files modified:** `package.json`, `package-lock.json`
**Commit:** `784abef`
**Applied fix:** Moved `gray-matter` from `devDependencies` to a new `dependencies` block in
`package.json`. Confirmed by grepping every `src/**/*.ts` import statement that `gray-matter` is the
ONLY external (non-`node:`) runtime dependency in the codebase — no other package needed to move.

Also ran `npm install --package-lock-only` to regenerate `package-lock.json`: the lockfile carried its
own independent `"dev": true` flags per package (mirroring the old `devDependencies` placement), which
would have caused `gray-matter` and its four transitive dependencies (`js-yaml`, `kind-of`,
`section-matter`, `strip-bom-string`, plus `argparse`/`esprima`/`extend-shallow`/`is-extendable`/
`sprintf-js` two levels down) to still be omitted under `npm ci --omit=dev` even after the
`package.json` edit alone. Verified via `git diff package-lock.json` that every affected entry's
`"dev": true` line was removed and no unrelated lockfile changes were introduced.

**Status:** `fixed`.

## Skipped Issues

None — all 5 in-scope findings were fixed.

## Deferred / Out of Scope (not attempted this run)

Per this run's `fix_scope: critical_warning` configuration, IN-01 and IN-02 were intentionally **not**
attempted and remain open findings in `01-REVIEW.md`:

- **IN-01** — Duplicated title-derivation logic between `generic.ts` and `title.ts`
  (`src/planning-repo/handlers/generic.ts:6-10`).
- **IN-02** — No `engines` field pinning the required Node version (`package.json`).

Neither was touched; no commit was made for either.

---

_Fixed: 2026-08-23T19:45:46Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
