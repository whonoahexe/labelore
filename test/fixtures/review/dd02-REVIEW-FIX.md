---
phase: 02-marching-cubes-extraction-cleanup
fixed_at: 2026-07-29T22:12:00Z
review_path: .planning/phases/02-marching-cubes-extraction-cleanup/02-REVIEW.md
iteration: 1
fix_scope: warnings_only
findings_in_scope: 11
fixed: 11
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-07-29T22:12:00Z
**Source review:** `.planning/phases/02-marching-cubes-extraction-cleanup/02-REVIEW.md`
**Iteration:** 1
**Scope:** WR-01 … WR-11. CR-01 was already fixed and committed at `20d31ee` and was
not touched. IN-01 … IN-06 were out of scope; IN-06 turned out to be load-bearing and
is recorded rather than fixed (see "Discoveries" below).

**Summary:**

- Findings in scope: 11
- Fixed: 11
- Skipped: 0

Eight commits, one per finding except WR-04/WR-05 (one gate, two defects) and
WR-08/WR-09 (one file, one class of defect). WR-10 was folded into WR-01 as instructed
— its identity half was already discharged by `20d31ee`, and its concurrency half is
covered by the six state-machine tests added with WR-01.

## Gates

| Gate | Result |
|---|---|
| `npx vitest run src/features/face-recon` | **268 passed / 17 files** (baseline 238 / 15 — no coverage removed, +30) |
| `CI=1 npx vitest run` (whole repo) | **25 failed / 748 passed (773)**, 24 failed files — identical to the 25-failure baseline, +33 passing |
| `npx tsc --noEmit` | **zero** hits under `src/features/face-recon` |
| `npx eslint src/features/face-recon --ext ts,tsx --max-warnings 0` | clean |
| `git diff --stat 20d31ee HEAD -- vite.config.ts package.json yarn.lock vitest.config.ts` | **empty** |

Nine files changed, all under `src/features/face-recon`: +1,253 / −80.

## Verification discipline

**Every assertion written or repaired in this pass was mutation-checked**: the defect it
names was injected into the source, the suite was run and observed RED with the intended
message, and the injection was reverted. Nineteen injections in total. Each is listed
under its finding.

Two mutations are worth calling out because they demonstrate that the *old* gates could
not fail:

- `catch (caught) { logger.error("…", caught); }` — the old WR-08 trigger was
  `/\b(?:err|error|e)\b/`, which does not match `caught`, so the assertion never
  evaluated and passed green while the caught object reached a non-dev-gated logger.
- `` logger.error(`… ${e2.message}`) `` — likewise not matched (`e2` is not `\be\b`),
  and it would *also* have escaped the split-on-comma form the review proposed, because
  it interpolates into the message argument rather than a later one. The implemented form
  scans `${…}` at any argument position.

## Fixed Issues

### WR-01: Superseding an in-flight run before validating leaves an unrecoverable "Extracting…" state

**Files modified:** `src/features/face-recon/hooks/useMarchingCubesExtraction.ts`,
`src/features/face-recon/hooks/useMarchingCubesExtraction.test.ts`
**Commit:** `ce9ed8f`

Moved both validations (`isAggregateLoaded`, the finite-iso check) above the supersede
block. Both are bare returns that patch nothing, so running them after a kill left the
store holding `extractionStatus: "running"` and the killed run's `isoPinned` with no run
alive to clear either — ticking timer, slider frozen by
`extractionStatus === "running"` (D-19's dead end), and a "Cancel extraction" button that
no-oped because `activeRunRef` was already null. Ordering is the whole fix; reaching the
kill now means the run *will* start, which is what makes skipping the restore correct.

The mechanical assertions in `faceSurfaceProtocol.test.ts:464-484` are unaffected — the
`killWorker()` inside the `activeRunRef.current !== null` block is unchanged, and the
in-flight guard is still not a bare early return.

Also discharges the remainder of **WR-10**: six state-machine tests (a refused click
leaves the in-flight worker alive and `cancel()` reachable; the same for the non-finite
iso path; the control case that a startable click still supersedes; a completion after
`cancel()` and after `releaseMesh()` repopulates nothing; unmount terminates).

*Mutations:* restoring the kill-then-validate order → RED on the `worker.terminated`
assertion ("a click refused by the D-16 full-load gate must not terminate the run already
in flight"), and independently RED on the cancel assertion ("expected 'running' to be
'idle'") when the first was muted.

### WR-02: Every uncaught worker error is reported as "the extractor never booted"

**Files modified:** `useMarchingCubesExtraction.ts`, `useMarchingCubesExtraction.test.ts`
**Commit:** `4889271`

Added `bootedRef`, set when the worker's `ready` message arrives (scoped by the per-run
`onmessage` closure — `ready` carries no runId) and reset next to the run id. `onerror`
now branches `fail(bootedRef.current ? "runtime" : "boot")`. The discriminator the
protocol documents as "the only way to distinguish 'never booted' from 'booted but
threw'" was received and discarded; it is now live.

*Mutations:* restoring the unconditional `fail("boot")` → RED; dropping the `ready`
recording again → RED on the same case (the fix is the recording, not the branch);
removing the per-run reset → RED on the third case with `'runtime'` where `'boot'` is owed.

### WR-03: The recon-session boundary resets the store and the mesh, but not the hook's own state

**Files modified:** `useMarchingCubesExtraction.ts`, `useMarchingCubesExtraction.test.ts`
**Commit:** `59813bd`

`releaseMesh()` now also resets `status`, `stage`, `stageFraction`, `runStartedAt`,
`refusalKind` and `cancelled`. `cancelled` is the one with no store gate and no identity
gate, so cancelling on job A and reaching job B without unmounting opened job B's panel
with "Extraction cancelled. No mesh was kept." Resetting in the leg the boundary already
calls is what matches the shell's stated single-owner rule; scoping the acknowledgement
in the panel instead would have created a second owner.

*Mutation:* removing the six resets → RED on both cases (`cancelled` survives; the
run-state object still describes the previous job's refusal).

### WR-04 / WR-05: `readVolumeScalars` admitted a raw buffer, and narrowed width with an unchecked cast

**Files modified:** `src/features/face-recon/lib/volumeScalars.ts`,
`src/features/face-recon/lib/volumeScalars.test.ts`, `useMarchingCubesExtraction.ts`
**Commit:** `d76d768`

`typeof out.byteLength === "number"` → `ArrayBuffer.isView(out)`, plus a new
`instanceof Int16Array` check under a new `"unsupported-dtype"` reason carried by the
existing `"scalars"` failure copy. Verified in node, and pinned as test premises:
`typeof new ArrayBuffer(8).byteLength === "number"`;
`new Int16Array(new Uint16Array([40000, 1024]))` → `[-25536, 1024]`;
`new Int16Array(new Float32Array([-150.7, 40.9]))` → `[-150, 40]`.

Truth table extended with a raw `ArrayBuffer`, a `SharedArrayBuffer` (conditional on the
runtime providing one), a `DataView`, and four wrong-width typed arrays — plus two
controls so the narrowing cannot be satisfied by refusing everything: a real `Int16Array`,
and an `Int16Array` view over a larger buffer.

The existing test "accepts any typed-array constructor, not only Int16Array" asserted the
contract WR-05 identifies as the defect, so it was replaced rather than kept.

*Mutations, run separately:* restoring the `byteLength` probe → RED on the ArrayBuffer and
SharedArrayBuffer cases; dropping the `instanceof Int16Array` narrowing → RED on the
DataView and wrong-width cases.

### WR-06: A `direction` longer than nine elements is silently truncated instead of refused

**Files modified:** `useMarchingCubesExtraction.ts`, `useMarchingCubesExtraction.test.ts`
**Commit:** `ccb6354`

`direction.length < 9` → `!== 9`, matching the protocol validator, and
`Array.from(direction).slice(0, 9)` → `Array.from(direction)`. For an identity mat4 the
old truncation read as `[1,0,0, 0,0,1, 0,0,0]` — a singular matrix — and the resulting
mesh has an identical axis-aligned bounding box, so `indexToWorld`'s truth table (this
phase's only orientation evidence, per deferred-items § 2 and § 3) could never see it.

*Mutation:* restoring `< 9` + `.slice(0, 9)` → RED (the run reaches `running` where
`error` is owed, and a worker is constructed for a payload that should never have been
built). A control case asserts all nine cosines of a non-identity direction arrive verbatim.

### WR-07: The session boundary runs side effects during render

**Files modified:** `src/features/face-recon/FaceReconWorkspacePage.tsx`,
`src/features/face-recon/FaceReconWorkspacePage.test.ts` *(new)*
**Commit:** `1323437`

Took the review's preferred form: `key={jobId}` on `FaceReconWorkspaceShell`, and LEG 1
deleted. A job change is now an unmount plus a fresh mount, so LEG 2's cleanup is the
whole boundary and both legs collapse into one. This removes the class of bug rather than
the instance, and means WR-03's carryover cannot recur through this path either.

The old comment's reasoning (child effects run before parent effects) does not survive
the change of mechanism: on a remount React flushes the deleted tree's passive cleanups
before the new tree's passive effects, so no newly mounted child can observe the previous
job's snapshot. `deriveViewportGate`'s volume-identity check stays as the independent
second control, as its own comment requires.

New mechanical suite, because a `key` is the easiest thing in a React file for a future
edit to drop while everything still renders, and a render-phase store write produces a
dev-mode console error plus correct-looking output.

*Mutations:* dropping the key → RED; re-adding the render-phase LEG 1 → RED on two
assertions (call counts 2 where 1 is owed); reversing the mesh/store order in the cleanup
→ RED on "the mesh must be released BEFORE the store is reset".

### WR-08 / WR-09: Two assertion gates that could not fail against the defect they name

**Files modified:** `src/features/face-recon/workers/faceSurfaceProtocol.test.ts`
**Commit:** `69538c9`

Three repairs:

1. **The PHI-scrub trigger is inverted.** Every dynamic value in every log call must now
   be on an allow-list (`safeErrorLabel(…)`, `workerErrorLabel(…)`, `.label`, and the
   closed string-literal unions `.reason` / `.kind` / `.stage`); fixed string copy is
   exempt and nothing else is, whatever the binding is called. `${…}` interpolations are
   collected at any argument position, so a leak in the message argument is caught too.
2. **`logCallsIn` is paren-matched over comment-stripped source**, and `logCallCountIn`
   pins the count so a call the extractor cannot read fails the suite instead of vanishing
   from it.
3. **The "no eleventh row" test now asserts structure.** The word-grep keeps a name that
   matches what it checks (`names no trimming stage and no clipped row`), and two new
   assertions hold what the old name claimed: exactly ten `ForensicRow`/`BoundsRow`
   elements, and `STAGE_LABELS` naming exactly `[reading, cropping, extracting,
   components, orienting]` in order. Both fail loudly if their extraction fails rather
   than passing on an empty match.

*Mutations:* `catch (caught) → logger.error("…", caught)` → RED (old gate: green);
`` logger.error(`… ${e2.message}`) `` → RED (old gate: green); an eleventh readout row →
"expected 11 to be 10"; a sixth stage → stage-key list mismatch; a log call with an
unbalanced paren inside a string → the parse-count assertion fires instead of the call
quietly leaving the scanned set.

### WR-10: The one module with concurrency has no tests

**Commit:** `ce9ed8f` (folded into WR-01, as instructed)

`20d31ee` had already added `useMarchingCubesExtraction.test.ts` with identity/race
coverage. The remainder — the stuck-`running` path, cancel/completion ordering, supersede,
release, and teardown — is the six state-machine tests listed under WR-01. The suite now
covers every behaviour the module's header presents as load-bearing except the two-frame
yield, which is exercised implicitly by every test (each waits for the worker to appear
after the yield rather than on the tick after the click).

### WR-11: "the workspace stays interactive" is shown while the main thread is blocked

**Files modified:** `src/features/face-recon/components/ExtractMeshPanel.tsx`,
`src/features/face-recon/components/ExtractMeshPanel.test.tsx` *(new)*
**Commit:** `2085984`

The claim is scoped to the three worker stages. The two main-thread stages say what they
are actually doing — "Reading voxels on the main thread — the page may pause briefly." —
rather than going silent, so an operator who sees the page stall gets an explanation
instead of an absence. A null stage reads as `reading`, exactly as the stage label above
it already does, so the two lines can never describe different stages.

This is the feature's **first component test**. 02-REVIEW noted that fourteen suites render
nothing, which is why claims about *when* copy appears were enforced by source-text greps
or by nothing — and a grep can see that a string exists, never when it is shown.

*Mutation:* restoring the unconditional claim → RED on all three main-thread cases plus
the label/claim agreement case. The three worker-stage cases are the control that stops
the scoping being satisfied by deleting the claim outright.

## Skipped Issues

None.

## Discoveries recorded rather than fixed

**IN-06 is load-bearing, and there is a live leak behind it.** The mechanical prohibitions
scan six hand-listed files, while their assertion messages are phrased as statements about
the feature. Widening `SOURCES` to the directory would immediately turn the suite red on

```ts
// src/features/face-recon/hooks/useSkinVolumeViewport.ts:387
logger.error("[useSkinVolumeViewport] VOLUME_3D setup failed", err);
```

— a raw caught object handed to a logger that is not dev-gated, which is precisely the leak
WR-08's inverted gate is built to catch, sitting one directory away from where the gate can
see it. It is a Phase 01 file and outside this pass's scope, so it was **recorded, not
changed**. Written up in `deferred-items.md § 5` with the instruction to scrub it with
`safeErrorLabel(err)` in the same change that widens `SOURCES`.

**A stale worktree from the killed prior run was recovered.** `/tmp/sv-02-reviewfix-gjKPs6`
and branch `gsd-reviewfix/02-16505` were still present with two commits on them — an earlier,
test-less CR-01 fix (superseded by `20d31ee` on the main branch) and a WR-01 attempt. The
branch had diverged from `noah/dev-v3.3`, so it was **not** merged: the orphan worktree and
branch were removed, the recovery sentinel cleared, and this pass started clean from
`20d31ee`. The prior WR-01 attempt was not reused — the surrounding code had changed under it.

## Not touched (per the known-and-accepted list)

Blank forensic number fields, D-13(b)'s deliberately narrowed bbox assertion,
`MIN_HEAD_SURFACE_TRIANGLES = 1000`, and the 25 pre-existing repo-wide failures.

---

_Fixed: 2026-07-29T22:12:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
