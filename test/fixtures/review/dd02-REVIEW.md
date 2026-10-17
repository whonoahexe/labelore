---
phase: 02-marching-cubes-extraction-cleanup
reviewed: 2026-07-29T20:30:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - docs/INDEX.md
  - docs/architecture/vtkjs-marching-cubes-silent-failures.md
  - src/features/face-recon/FaceReconWorkspacePage.tsx
  - src/features/face-recon/components/ExtractMeshPanel.tsx
  - src/features/face-recon/components/IsoThresholdSlider.tsx
  - src/features/face-recon/components/MeshForensicsReadout.tsx
  - src/features/face-recon/faceReconTypes.ts
  - src/features/face-recon/hooks/useMarchingCubesExtraction.ts
  - src/features/face-recon/lib/extractionGate.test.ts
  - src/features/face-recon/lib/extractionGate.ts
  - src/features/face-recon/lib/faceReconBridgeStore.ts
  - src/features/face-recon/lib/indexToWorld.test.ts
  - src/features/face-recon/lib/indexToWorld.ts
  - src/features/face-recon/lib/meshComponents.test.ts
  - src/features/face-recon/lib/meshComponents.ts
  - src/features/face-recon/lib/viewportGate.test.ts
  - src/features/face-recon/lib/volumeScalars.test.ts
  - src/features/face-recon/lib/volumeScalars.ts
  - src/features/face-recon/workers/faceSurface.worker.ts
  - src/features/face-recon/workers/faceSurfaceProtocol.test.ts
  - src/features/face-recon/workers/faceSurfaceProtocol.ts
findings:
  critical: 1
  warning: 11
  info: 6
  total: 18
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-07-29T20:30:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** issues_found

## Summary

Reviewed the marching-cubes extraction slice: the worker + protocol boundary, the four
pure decision modules (`indexToWorld`, `meshComponents`, `extractionGate`,
`volumeScalars`), the React lifecycle owner (`useMarchingCubesExtraction`), the panel and
readout, and the store/type changes that carry extraction state.

Verified clean (do not re-investigate):

- **The MESH-03 transform is mathematically correct.** `buildIndexToWorld` writes
  `direction[0..2]` to mat4 column 0 (`m[0..2]`), `[3..5]` to column 1 (`m[4..6]`),
  `[6..8]` to column 2 (`m[8..10]`) after `fromTranslation`, then `mat4.scale` scales
  columns by spacing — i.e. `T · D · S`, matching `ImageData.computeTransforms()`. The
  hand-computed truth table genuinely fails against direction-ignoring code (I checked
  the expected triples by hand, not by running the function).
- **The union-find cleanup is correct and bounded.** `cellEnd = polys.length - 3` plus
  `isTriangleAt`'s upper-bound check make every `polys[c+1..c+3]` and every
  `points[index*3+2]` read in-bounds; the tie-break is order-independent; the
  three-pass progress counter reaches exactly `totalWork`, so the one determinate bar
  never exceeds 1 or goes backwards.
- **No PHI/geometry leak paths.** No storage, network, telemetry or clipboard call
  exists in any reviewed module; every catch logs `safeErrorLabel(err)` /
  `workerErrorLabel(err)` / a fixed label; no log line carries `volumeId`, points,
  polys or bounds. The worker is never told which volume it holds.
- **Honesty controls hold where checked.** No fabricated percentage for the synchronous
  filter call; `Infinity`/`NaN` cannot reach the readout (refused upstream by
  `assessExtractionResult`, then null-guarded in `computeBoundsMm`, then formatter- and
  `ForensicRow`-guarded); no copy claims support hardware was separated out.
- `npx tsc --noEmit` reports zero errors in `src/features/face-recon`; `eslint` is
  clean; all 235 face-recon tests pass.

What the review found: **one BLOCKER** — the mesh and its forensic record are stamped
with the *currently mounted* `volumeId` at completion rather than with the volume the
voxels were actually read from, which inverts the identity control that the module
documents as its primary (release-independent) guard. Plus eleven warnings, concentrated
in three places: the extraction hook's state machine has recoverable-state gaps and
render-phase side effects, `volumeScalars`' "positive proof of a typed array" is weaker
than its own documentation (it admits a raw `ArrayBuffer`, in which case the transfer
neuters Cornerstone's own buffer), and two of the mechanical assertion gates in
`faceSurfaceProtocol.test.ts` cannot fail against the defect they name — the same class
of bug this phase already found three instances of.

## Critical Issues

### CR-01: The mesh is stamped with the mounted volume, not the volume it came from

**File:** `src/features/face-recon/hooks/useMarchingCubesExtraction.ts:521`, `:584-595`
(compare `:374`, `:408`, `:467`)

**Issue:** `extract()` captures the identity of the volume it is about to read at click
time (`const currentVolumeId = volumeIdRef.current;`, line 374) and uses that capture for
the `running` and `cropping` patches. The completion handler does not use it. It re-reads
the live ref instead:

```ts
const currentId = volumeIdRef.current;   // line 521 — the CURRENTLY MOUNTED volume
...
meshRef.current = { volumeId: currentId, ... };            // 584-589
const meshStats: MeshForensics = { ...message.stats, volumeId: currentId, elapsedMs };  // 591-595
```

So if `volumeId` changes between the click and the worker's reply, the geometry extracted
from volume A is stamped as belonging to volume B. Both identity controls then read it as
valid: `getMesh()` (line 267-273) compares `mesh.volumeId` against `volumeIdRef.current`
and returns A's points as B's mesh through the documented export seam, and
`ExtractMeshPanel` (line 322-326) compares `storedStats.volumeId === volumeId` and
presents A's triangle/vertex/bounds numbers as B's forensic evidence. `ExtractedMesh.volumeId`
is documented as "The volume this geometry came from (D-06)" — the code assigns the volume
it is going to.

The mirror-image failure is equally silent: if `volumeId` transits to `null` mid-run, the
mesh lands in the slot stamped `null`, `getMesh()` can never return it, and the panel
falls through to `showEmptyState` (line 327-332 does not exclude `extractionStatus === "done"`),
so the operator is told "No mesh extracted yet" while a full patient reconstruction is
resident in memory and unreachable.

Reachability, stated honestly: a *jobId* change is already covered — `FaceReconWorkspaceShell`'s
LEG 1 calls `releaseMesh()`, which bumps `runIdRef` and drops the reply. What is not
covered is a `volumeId` change without a jobId change (`useFaceVolume:173-179` derives it
from `selection.seriesUid`, so any eligibility/selection re-resolution or a cleared query
cache moves it). That narrowness is exactly why this is still a blocker rather than a
warning: the module's own rationale for the stamp is that "identity holds even if a
release is missed, races, or is added in the wrong place by a future edit" (lines 250-266).
A stamp taken from the mounted volume at completion time cannot hold under that
condition — it agrees with whatever is mounted by construction, which makes the check
tautological in precisely the scenario it was written for.

**Fix:** stamp from the click-time capture, the same value the opening patches use, and
pass it into the handler rather than re-reading the ref.

```ts
// inside worker.onmessage — use the identity captured at line 374, not the live ref
const sourceVolumeId = currentVolumeId; // captured in extract(), never re-read

meshRef.current = {
  volumeId: sourceVolumeId,
  isoBuiltAt: message.stats.isoBuiltAt,
  points: message.points,
  polys: message.polys,
};
const meshStats: MeshForensics = { ...message.stats, volumeId: sourceVolumeId, elapsedMs };
```

Then let the existing consumers do their job: `getMesh()` and the panel already refuse a
stamp that does not match the mounted volume, so a mid-run volume change becomes a
correctly-refused mesh instead of a mis-attributed one. Apply the same change to the
`progress`/`refused` patches (they also use `currentId`) so one run reports under one
identity end to end. Add a unit test through the `createWorker` seam that drives
`volumeId` A → B between `extract()` and the `ok` message and asserts `getMesh()` returns
`null`.

## Warnings

### WR-01: Superseding an in-flight run before validating leaves an unrecoverable "Extracting…" state

**File:** `src/features/face-recon/hooks/useMarchingCubesExtraction.ts:367-385`

**Issue:** `extract()` terminates the in-flight run *first* (lines 367-371) and validates
*afterwards* (line 379 `isAggregateLoaded`, line 385 the finite-iso check). Both
validations are bare `return`s that patch nothing. Take the return at line 379 with a run
in flight: the worker is dead, `activeRunRef` is `null`, but the store still holds
`extractionStatus: "running"` and `isoPinned` from the killed run. Consequences, all
simultaneous and all permanent until a page reload:

- `ExtractMeshPanel:301` reads `running` from the snapshot → the progress affordance stays
  on screen with `ElapsedTimer` ticking off the *old* `runStartedAt` forever;
- `IsoThresholdSlider:102-103` stays disabled (`extractionStatus === "running"`), so the
  operator's only control is frozen — the exact dead end D-19 exists to prevent;
- `cancel()` (line 328) early-returns because `activeRunRef.current === null`, so the
  visible "Cancel extraction" button does nothing.

Reachable path: the CS3D volume cache evicts the 205 MiB volume, `useFaceVolume`'s effect
re-runs, `shouldEnterLoadingState` is true, `createAndCacheVolume` mints a fresh volume
whose `loadStatus.loaded` is false, and the operator clicks Extract again while the first
run is still in flight.

**Fix:** validate before destroying, and make every early exit restore the snapshot.

```ts
const currentVolume = volumeRef.current;
if (!isAggregateLoaded(currentVolume)) return;          // BEFORE any kill
const iso = faceReconBridgeStore.getSnapshot().isoValue;
if (typeof iso !== "number" || !Number.isFinite(iso)) return;

if (activeRunRef.current !== null) { killWorker(); activeRunRef.current = null; startedAtRef.current = null; }
```

Reordering also keeps the mechanical assertion in
`faceSurfaceProtocol.test.ts:464-484` satisfied (the `killWorker()` inside the
`activeRunRef.current !== null` block is unchanged).

### WR-02: Every uncaught worker error is reported as "the extractor never booted"

**File:** `src/features/face-recon/hooks/useMarchingCubesExtraction.ts:508-512`, `:517`

**Issue:** `worker.onerror` unconditionally calls `fail("boot")`, which renders "Couldn't
start the extractor — The surface extractor failed to load in this browser session.
Reload the page and try again." (`ExtractMeshPanel:188-191`). But `onerror` fires for *any*
uncaught error in the worker at any point in its life, not only at module evaluation — an
allocation failure or a vtk.js throw that escapes the `try/catch` mid-run lands here too,
and the operator is told to reload when the correct remedy is to raise the threshold.

The discriminator that would fix this is already implemented and then thrown away:
`faceSurfaceProtocol.ts:88-94` states that "the ABSENCE of this message is the only way to
distinguish 'never booted' from 'booted but threw'", the worker posts it at
`faceSurface.worker.ts:241`, and the hook receives it and drops it on the floor
(`if (message.type === "ready") return;`, line 517). So the documented mechanism is
inert — the code has the evidence and does not use it.

**Fix:** record the boot signal and branch on it.

```ts
const bootedRef = useRef(false);        // reset to false per run, next to runId
...
if (message.type === "ready") { if (activeRunRef.current === runId) bootedRef.current = true; return; }
...
worker.onerror = () => {
  if (disposedRef.current || activeRunRef.current !== runId) return;
  logger.error("[useMarchingCubesExtraction] surface worker error");
  fail(bootedRef.current ? "runtime" : "boot");
};
```

### WR-03: The recon-session boundary resets the store and the mesh, but not the hook's own state

**File:** `src/features/face-recon/FaceReconWorkspacePage.tsx:217-222`;
`src/features/face-recon/components/ExtractMeshPanel.tsx:479-485`;
`src/features/face-recon/hooks/useMarchingCubesExtraction.ts:211-217`

**Issue:** LEG 1 handles a same-instance job change by releasing the mesh and resetting the
store singleton. The extraction hook's own React state is not part of that reset:
`status`, `stage`, `runStartedAt`, `refusalKind` and `cancelled` all survive into the next
job. Four of those are gated by a store value that *was* reset, so they stay invisible.
`cancelled` is not:

```tsx
{cancelled && !running && (   // ExtractMeshPanel:479 — no store gate, no identity gate
  <p role="status">{stats ? "Extraction cancelled — your previous mesh is unchanged."
                          : "Extraction cancelled. No mesh was kept."}</p>
)}
```

So: cancel a run on job A, then reach job B without unmounting (the shell stays mounted
whenever `useJobSummary(B)` is already cached, which is the only case LEG 1 exists for) and
job B's panel opens with "Extraction cancelled. No mesh was kept." — an acknowledgement of
an action the operator never performed on this patient. The comment block at lines 163-176
claims this component is the single owner of "which job is this state about?"; the hook's
state is a third thing that answers that question and nobody resets it.

**Fix:** give the hook a `resetSession()` (or clear its state inside `releaseMesh`, which
LEG 1 and LEG 2 already call) that sets `status`/`stage`/`stageFraction`/`runStartedAt`/
`refusalKind`/`cancelled` back to their initial values. Alternatively, scope the
acknowledgement in the panel the way the readout is scoped — but resetting at the boundary
is the fix that matches the file's stated single-owner rule.

### WR-04: `readVolumeScalars` accepts a raw `ArrayBuffer`, and the "copy" then transfers Cornerstone's own buffer

**File:** `src/features/face-recon/lib/volumeScalars.ts:105-112`;
`src/features/face-recon/hooks/useMarchingCubesExtraction.ts:475-478`, `:621`

**Issue:** the typed-array proof is `typeof out.byteLength === "number"` (documented as
"the cheapest positive proof of a typed array"). It is not — `ArrayBuffer` and
`SharedArrayBuffer` both satisfy it (verified in node: `typeof new ArrayBuffer(8).byteLength === "number"`
→ `true`). If the accessor ever answers with the buffer rather than a view, the result is
returned as `{ ok: true, scalars: out as Int16Array }`, and the hook's "COPY, transferred
in place of the original" is not a copy at all:

```ts
scalars: new Int16Array(scalarResult.scalars),   // ArrayBuffer arg ⇒ a VIEW over that buffer
...
worker.postMessage(request, [request.scalars.buffer]);   // transfers ⇒ neuters the source
```

`new Int16Array(arrayBuffer).buffer === arrayBuffer` (verified), so the transfer neuters
Cornerstone's scalar buffer for the cached volume the whole workspace is rendering — the
precise outcome the comment at lines 473-475 says must never happen, and the CS3D cache is
an app-wide singleton, so the damage is not scoped to this page. A `DataView` also passes
the check and yields a zero-length `Int16Array` (verified), which at least fails closed at
the worker's product check.

**Fix:** prove it is a *view*, not a buffer.

```ts
if (!ArrayBuffer.isView(out)) return { ok: false, reason: "not-typed-array" };
```

and extend the truth table with an `ArrayBuffer`, a `SharedArrayBuffer` and a `DataView`
case — the existing suite only pins plain arrays and `{ length: 4 }`.

### WR-05: Unchecked narrowing to `Int16Array` silently rewrites voxel values for non-Int16 volumes

**File:** `src/features/face-recon/lib/volumeScalars.ts:112`;
`src/features/face-recon/hooks/useMarchingCubesExtraction.ts:477`

**Issue:** `volumeScalars` deliberately accepts *any* typed array — its own test asserts
this ("accepts any typed-array constructor, not only Int16Array",
`volumeScalars.test.ts:118-123`) — and then asserts the result is an `Int16Array` with a
bare cast (`out as Int16Array`), which hides the mismatch from the compiler. The hook then
performs a lossy element-wise conversion with no check:

```ts
scalars: new Int16Array(scalarResult.scalars),
```

Verified conversions: `new Int16Array(new Uint16Array([40000, 1024]))` → `[-25536, 1024]`
(modular wrap), `new Int16Array(new Float32Array([-150.7, 40.9]))` → `[-150, 40]`
(truncation). For a `Uint16` volume — a real CS3D `dataType` — every voxel above 32767
becomes a large negative number, the iso comparison inverts for those voxels, and the
filter returns a plausible surface built from corrupted HU values. Nothing throws, the
dimensions/length check still passes, and the readout reports the run as a measurement.
That is the "plausible-but-wrong face" failure mode this feature's documentation ranks as
worse than an error.

**Fix:** either narrow the contract or handle the width. Cheapest correct option — refuse
what the pipeline cannot honestly interpret, and let the existing `"scalars"` failure copy
carry it:

```ts
export type VolumeScalarsFailureReason = "no-accessor" | "not-typed-array" | "unsupported-dtype";
...
if (!(out instanceof Int16Array)) return { ok: false, reason: "unsupported-dtype" };
```

If other widths must be supported, convert with an explicit widening path (e.g. keep the
source constructor and send `dataType` across the boundary) rather than a truncating
`Int16Array` constructor call.

### WR-06: A `direction` longer than nine elements is silently truncated instead of refused

**File:** `src/features/face-recon/hooks/useMarchingCubesExtraction.ts:459`, `:484`

**Issue:** the geometry guard is `direction.length < 9`, and the payload is built with
`Array.from(direction).slice(0, 9)`. A 16-element matrix (a `mat4`, which is what several
CS3D/vtk.js surfaces hand out) therefore passes the guard and is truncated to its first
nine elements — which are *not* the 3×3 direction; they are rows 0-2 of a 4×4 with the
homogeneous column interleaved. The protocol validator cannot catch it either, because it
runs on the already-truncated array. The resulting mesh is wrongly oriented, has an
identical bounding box, and is invisible to every check in the feature — the exact defect
`indexToWorld.ts`'s header says the truth table exists for, arriving through a path the
truth table cannot see.

**Fix:** require the exact length at the producer, matching the validator.

```ts
if (!dimensions || !spacing || !origin || !direction || direction.length !== 9) { ... fail("scalars"); }
...
direction: Array.from(direction),   // no slice — the length is now proven
```

### WR-07: The session boundary runs side effects during render

**File:** `src/features/face-recon/FaceReconWorkspacePage.tsx:217-222`

**Issue:** LEG 1 executes `releaseMesh()` (which calls `worker.terminate()` and
`setHasMesh(false)`) and `faceReconBridgeStore.reset()` inside the render body.
`reset()` → `commit()` → `listeners.forEach(fn => fn())`
(`faceReconBridgeStore.ts:113-117`), and those listeners are the
`useSyncExternalStore` change handlers of *already-mounted sibling components*
(`FaceVolumeViewport`, `IsoThresholdSlider`, `ExtractMeshPanel`). Notifying them from
inside the parent's render is the "Cannot update a component while rendering a different
component" case: React 18 logs it as an error in dev, and the store the children read
during the same pass is mutating underneath them. Separately, a render is not a commit —
React may discard and re-run it — and this one has already killed a worker and dropped a
mesh by then.

The reasoning in the comment (child effects run before parent effects, so an effect here
would be too late) is sound; the conclusion does not have to be a render-phase side
effect. Note this is why `deriveViewportGate`'s identity check exists, and the comment says
to keep both — so the safe form is available.

**Fix:** make the boundary a *derivation* rather than a mutation. Either key the subtree on
the job so a job change unmounts and remounts it (LEG 2's cleanup then does the whole job,
and both legs collapse into one):

```tsx
case "allowed":
  body = <FaceReconWorkspaceShell key={jobId} jobId={jobId} approved={{...}} />;
```

or, if the shell must survive, have the store expose a `bindSession(jobId)` that is safe to
call during render because it *replaces the snapshot without notifying* when no listener
can be observing a stale value yet — and keep the notification in a `useLayoutEffect`. The
`key` form is strictly simpler and removes the class of bug rather than the instance.

### WR-08: The PHI-scrub assertion is keyed on the catch-binding's *name*, so renaming it disables the gate

**File:** `src/features/face-recon/workers/faceSurfaceProtocol.test.ts:304-317` (line 307)

**Issue:**

```ts
for (const call of logCallsIn(source)) {
  if (!/\b(?:err|error|e)\b/.test(call)) continue;   // ← the gate's entire trigger
  expect(/safeErrorLabel|workerErrorLabel|\.label\b/.test(call), ...).toBe(true);
}
```

The rule being enforced is "no caught object reaches a log line", but the test only fires
when the log arguments mention an identifier literally named `err`, `error` or `e`. A
future `catch (caught) { logger.error("...", caught); }`, `catch (ex)`, `catch (reason)`,
or `logger.error(\`${e2.message}\`)` publishes UIDs and the `Authorization` header while
this assertion passes green — it never even evaluates. This is the same class as the three
already-found gates in this phase: an assertion that cannot fail against the defect it
names.

A secondary weakness in the same helper: `logCallsIn` matches non-greedily up to the first
`);` (line 223), so any log call whose arguments contain that sequence is captured
truncated or missed entirely, and a missed call is silently un-asserted.

**Fix:** invert the trigger — assert on *every* log call that its arguments are drawn from
an allow-list, instead of guessing which ones carry an error.

```ts
// every log argument list must be: string/template literals, plus ONLY scrubbed values
const SCRUBBED = /^(?:[^,]*)$|safeErrorLabel|workerErrorLabel|\.label\b/;
for (const call of logCallsIn(source)) {
  const args = call.split(",").slice(1);              // everything after the message
  for (const arg of args) {
    expect(/safeErrorLabel\(|workerErrorLabel\(|\.label\b/.test(arg), `${name}: ${arg}`).toBe(true);
  }
}
```

and assert `logCallsIn(source).length` equals the count of `/(?:logger|console)\./g`
matches, so a call the regex fails to parse fails the suite instead of vanishing from it.

### WR-09: "adds no eleventh readout row" asserts nothing about rows

**File:** `src/features/face-recon/workers/faceSurfaceProtocol.test.ts:406-417`

**Issue:** the test named "adds no eleventh readout row and no trimming stage" greps for
`/trimming|\bclipped\b/i` and nothing else. Adding an eleventh `<ForensicRow label="Cut away" …/>`
to `MeshForensicsReadout`, or a sixth `ExtractionStage`, passes it. There is no component
test for the readout anywhere in the feature (14 suites, none render a component), so
"TEN ROWS, AND NO ELEVENTH" (`MeshForensicsReadout.tsx:32-36`) and the ten-field UI
contract are enforced by nothing executable. The test's *name* claims a guarantee its body
does not provide — which is worse than no test, because the name is what a future reader
trusts.

**Fix:** assert the structure it claims to hold.

```ts
const rows = [...SOURCE_TEXT.readout.matchAll(/<(?:ForensicRow|BoundsRow)\b/g)];
expect(rows.length, "the UI contract names TEN fields; an eleventh row is a scope change (D-20(e))").toBe(10);
const stages = [...SOURCE_TEXT.panel.matchAll(/^\s{2}\w+:\s"/gm)];   // STAGE_LABELS entries
expect(stages.length).toBe(5);
```

(or rename the test to what it actually checks, and file the row-count gate as owed).

### WR-10: The one module with concurrency has no tests, though its test seam exists only for tests

**File:** `src/features/face-recon/hooks/useMarchingCubesExtraction.ts:105-116` (no
`useMarchingCubesExtraction.test.ts` exists)

**Issue:** `createWorker` is documented as an "Injection seam for tests… Production never
passes it" — and nothing passes it, because there is no test file. Every behaviour the
module's 58-line header presents as load-bearing is unpinned: the run-id drop for
superseded/cancelled replies, cancel-restores-without-destroying, supersede-terminates,
the two-frame yield, teardown termination, and the identity stamp. CR-01 is a direct
consequence — a single test driving `volumeId` A → B across a run would have caught it, and
`faceSurfaceProtocol.test.ts` reaches for source-text greps precisely because no
executable test of this module exists. The four *pure* modules are exhaustively
truth-tabled; the one stateful module is not tested at all, which inverts the risk
ordering.

**Fix:** add `useMarchingCubesExtraction.test.ts` with a fake worker
(`createWorker: () => fakeWorker`) and `renderHook`. Minimum cases, all cheap:
supersede terminates the first worker; a reply from a superseded run patches nothing; a
reply arriving after `releaseMesh()` does not repopulate the slot; `cancel()` leaves
`getMesh()` non-null; unmount terminates; and the CR-01 case (`volumeId` changes mid-run ⇒
`getMesh()` returns `null`). Note jsdom has no `requestAnimationFrame` guarantee — the
`yieldTwoFrames` helper already degrades when it is absent (line 189).

### WR-11: "the workspace stays interactive" is shown while the main thread is blocked

**File:** `src/features/face-recon/components/ExtractMeshPanel.tsx:458-460`

**Issue:** the line "Extracting off the main thread — the workspace stays interactive." is
rendered for the whole of `running`, including the `reading` and `cropping` stages, which
run on the main thread and block it for a measured 250-533 ms (the hook's own header,
lines 14-17) — doubled in practice because the `new Int16Array(...)` copy at line 477 is a
second full-size main-thread allocation. During that window the statement on screen is
false. On an artifact whose entire purpose is to be believed, on-screen text asserting
something the code is not doing at that moment is a defect, not a nit.

Related, same block: the `cropping` stage patch (lines 465-469) is followed by the
synchronous read + copy + structured-clone with no yield, so "Preparing voxels" is
committed to the DOM only after the stall it is meant to label ends — the label the
operator actually sees during the stall is "Reading volume".

**Fix:** scope the claim to the stages where it is true.

```tsx
{stage !== "reading" && stage !== "cropping" && (
  <p className="text-xs font-normal text-muted-foreground">
    Extracting off the main thread — the workspace stays interactive.
  </p>
)}
```

and, if the two main-thread stages should be honest about themselves, say so instead
("Reading voxels — this may briefly pause the page").

## Info

### IN-01: `topComponentSizes` is computed, sorted and never used

**File:** `src/features/face-recon/lib/meshComponents.ts:88-89`, `:278`, `:293`;
`src/features/face-recon/workers/faceSurface.worker.ts:211-228`

**Issue:** the field is documented as "the honest distribution" but the worker's
`MeshForensicsFromWorker` never carries it and no readout row renders it, so the sort at
line 278 and the slice at line 293 are dead work whose only consumer is the test.
**Fix:** either surface it (it is the one field that would substantiate the D-20
disclosure beyond three aggregates) or delete it and its test assertion.

### IN-02: Four of the hook's returned values have no consumer

**File:** `src/features/face-recon/hooks/useMarchingCubesExtraction.ts:647-659`

**Issue:** `status`, `stage`, `hasMesh` and `getMesh` are returned and nothing destructures
them (`FaceReconWorkspacePage.tsx:196`). `status`/`stage` duplicate `extractionStatus`/
`extractionStage` in the snapshot the UI actually renders, so they are two sources that can
drift (WR-03 is the drift already happening). **Fix:** drop `status`/`stage`/`hasMesh` and
keep `getMesh` with a comment naming it as the export seam, or leave a `// used by 03-…`
marker so the next reader does not treat them as live wiring.

### IN-03: Cleanup rebuilds into plain JS arrays, against the module's own stated discipline

**File:** `src/features/face-recon/lib/meshComponents.ts:253-275`, `:283-284`

**Issue:** the header justifies a typed array for `parent` ("a plain object map would be an
order of magnitude worse"), then accumulates `keptPointValues` and `keptCells` as
`number[]` — roughly 4.6 M and 12 M elements at the measured 3.03 M-triangle real result,
plus reallocation during growth, plus the final typed-array copies. Out of v1 scope as a
performance item; flagged because a `RangeError`/OOM here surfaces as the `runtime` failure
kind on the only dataset that matters. **Fix (if it ever bites):** two passes — count kept
triangles/points first, then fill pre-sized `Float32Array`/`Uint32Array`.

### IN-04: Two small render gaps in the panel

**File:** `src/features/face-recon/components/ExtractMeshPanel.tsx:152`, `:203`, `:465`

**Issue:** (a) `<Alert role="alert">` duplicates the role the primitive already sets
(`ui/alert.tsx:30`) — harmless but redundant. (b) `extractionStatus === "refused"` with a
null `refusalReason` renders *nothing*: no refusal block, and `showEmptyState` is false
because the status is `refused`, so the panel shows only the control row with no
explanation. The hook always patches the pair together today, so this is defence-in-depth.
**Fix:** render the tier body with a generic heading when `refusalReason` is null, or fold
`refused` into `showEmptyState`'s allowance.

### IN-05: The elapsed timer's `aria-live="off"` mitigation may not hold inside `role="status"`

**File:** `src/features/face-recon/components/ExtractMeshPanel.tsx:416`, `:232`

**Issue:** the header explains that the timer is `aria-live="off"` so 200 ms ticks do not
flood a screen reader, but it sits inside a container with `role="status"`, which carries an
implicit `aria-atomic="true"` — several ATs re-announce the whole atomic region on any
subtree change. The documented mitigation is AT-dependent. **Fix:** move the timer outside
the `role="status"` region (the stage label alone is the live region worth announcing), or
set `aria-atomic="false"` on the container.

### IN-06: The mechanical prohibition greps cover six files, not the feature

**File:** `src/features/face-recon/workers/faceSurfaceProtocol.test.ts:200-224`

**Issue:** `SOURCES` lists hook, worker, protocol, panel, readout, slider. The
persistence/network/telemetry prohibition and the log-line prohibition therefore do not
cover `FaceReconWorkspacePage.tsx` (which owns the session boundary and calls
`releaseMesh`), `faceReconBridgeStore.ts` (which holds `meshStats`), or the three pure
mesh modules — while the assertion messages are phrased as statements about the feature.
**Fix:** enumerate the directory instead of hand-listing it (`readdirSync` over
`src/features/face-recon`, excluding `*.test.*`), so a new file is covered on creation
rather than on someone remembering to add it.

---

_Reviewed: 2026-07-29T20:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
