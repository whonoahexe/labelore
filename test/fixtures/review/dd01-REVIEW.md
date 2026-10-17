---
phase: 01-volume-acquisition-fast-volume-render
reviewed: 2026-07-24T00:00:00Z
depth: standard
files_reviewed: 20
files_reviewed_list:
  - src/components/jobs/JobRowActions.tsx
  - src/components/viewer-next/runtime/initCornerstone3D.ts
  - src/features/face-recon/FaceReconWorkspacePage.tsx
  - src/features/face-recon/components/DeidEvidencePanel.tsx
  - src/features/face-recon/components/FaceVolumeViewport.tsx
  - src/features/face-recon/components/FramingBanner.tsx
  - src/features/face-recon/components/IsoThresholdSlider.tsx
  - src/features/face-recon/faceReconTypes.ts
  - src/features/face-recon/hooks/useFaceEligibility.ts
  - src/features/face-recon/hooks/useFaceVolume.ts
  - src/features/face-recon/hooks/useSkinVolumeViewport.ts
  - src/features/face-recon/lib/approvedProjects.ts
  - src/features/face-recon/lib/faceEligibility.test.ts
  - src/features/face-recon/lib/faceEligibility.ts
  - src/features/face-recon/lib/faceReconBridgeStore.test.ts
  - src/features/face-recon/lib/faceReconBridgeStore.ts
  - src/features/face-recon/lib/skinTransferFunction.test.ts
  - src/features/face-recon/lib/skinTransferFunction.ts
  - src/lib/route-params.ts
  - src/routes/config.tsx
findings:
  critical: 4
  warning: 15
  info: 7
  total: 26
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-24
**Depth:** standard
**Files Reviewed:** 20
**Status:** issues_found

## Summary

The phase ships a VOLUME_3D face-reconstruction workspace with three claimed safety
controls: an approved-project allowlist (GUARD-03 / D-02), a CT-head eligibility guard
that "fails closed" (VOL-03 / D-08 / D-09), and a hard "no partial faces" reveal gate
(VOL-02 / D-10). **All three are weaker than their own documentation claims, and two of
them do not actually hold.**

The most serious finding is that the approved-project allowlist — the module header calls
it the *consent gate* — is enforced in exactly one place: hiding a dropdown item on the
Jobs page. `isApprovedProject` has no other call site in the codebase. Three separate doc
blocks (`approvedProjects.ts`, `FaceReconWorkspacePage.tsx`, `JobRowActions.tsx`) assert
the workspace re-validates it on entry. It does not. Any authenticated user with
`review_results` can paste `/face-recon/<jobId>` for a *non-approved* project and, provided
the job contains a head CT, reconstruct a patient face.

Second, the eligibility guard and the volume resolver disagree about *which series* is
being approved. `useFaceEligibility` returns eligible if **any** series in the job is a CT
head; `resolveHeadCtSeries` then picks whichever CT series has the **most frames**, with no
head classification at all. The thing the guard approved and the thing the renderer loads
are not the same object.

Third, the module-level `faceReconBridgeStore` is never reset. `reset()` is exported and
unit-tested but has zero production call sites, so a second visit within the same SPA
session starts with the previous job's `loaded`/`error` state — which defeats the
"no partial faces" gate on exactly the navigation path a demo will use.

Secondary themes: several comments assert invariants the code does not implement
(`project_id` filtering, "never logs raw UIDs or PHI"), the evidence panel makes
unfalsifiable scrubbing claims when the pipeline recorded nothing, and the security-critical
allowlist has no unit test while the pure HU math has 187 lines of them.

The Cornerstone3D work is the strongest part of the submission — singleton engine,
enable-once, render-after-property-change, resize-flush and unmount teardown are all
correctly observed. The defects there are lifecycle races, not pattern violations.

---

## Critical Issues

### CR-01: Approved-project allowlist is never enforced on the workspace route — deep-link bypasses the consent gate

**File:** `src/features/face-recon/FaceReconWorkspacePage.tsx:118-141`, `src/features/face-recon/lib/approvedProjects.ts:34-39`

**Issue:** `isApprovedProject` has exactly two references in the entire repo:

```
src/components/jobs/JobRowActions.tsx:58  (import)
src/components/jobs/JobRowActions.tsx:173 (const approvedForRecon = isApprovedProject(projectId))
```

That is the *surface-side* gate — it only decides whether a dropdown item renders.
`FaceReconWorkspace` reads `summary?.projectId` and passes it to `useFaceEligibility`,
where it is used **only** for the `enabled` flag and the React Query key
(`useFaceEligibility.ts:256, 260`). It is never compared against `APPROVED_PROJECT_IDS`.
`resolveEligibility()` does not receive `projectId` at all.

This directly contradicts the code's own documentation in three places:
- `approvedProjects.ts:34-39` — "The workspace route re-validates the allowlist on entry
  (Plan 03 / D-08) so a crafted deep-link to `/face-recon/:jobId` for a non-approved
  project is refused even though the action was never shown."
- `FaceReconWorkspacePage.tsx:17-23` — "hiding a control is not an access control.
  `useFaceEligibility` re-validates here."
- `JobRowActions.tsx:170-172` — "the workspace re-validates on entry (Plan 03)."

Impact: the ethical/consent control for a tool that reconstructs recognizable patient faces
from HIPAA research data is a hidden menu item. Typing a URL defeats it entirely.

**Fix:** Gate the workspace on the allowlist *before* anything else, and treat unknown
`projectId` as refusal (fail closed):

```tsx
// FaceReconWorkspacePage.tsx
import { isApprovedProject } from "./lib/approvedProjects";

function FaceReconWorkspace({ jobId }: { jobId: string }) {
  const { data: summary, isPending: summaryPending, isError: summaryError } =
    useJobSummary(jobId);

  const projectId = summary?.projectId ?? null;
  // Fail closed: unresolved project, failed lookup, or non-approved project all refuse.
  const projectApproved = !summaryPending && !summaryError && isApprovedProject(projectId);

  const { isIneligible, reason, verdict } = useFaceEligibility({ jobId, projectId });

  if (summaryPending) return <GuardPending />;           // never render the shell yet
  if (!projectApproved) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <InternalRedTeamBanner />
        <IneligibleVolumeRefusal reason="Project not approved for face reconstruction" />
      </div>
    );
  }
  // …existing eligibility branch
}
```

Also add a unit test asserting a non-approved `project_id` produces the refusal state.

---

### CR-02: The eligibility verdict does not constrain which series is actually reconstructed

**File:** `src/features/face-recon/hooks/useFaceVolume.ts:49-124`, `src/features/face-recon/hooks/useFaceEligibility.ts:197-243`

**Issue:** The guard and the loader select different series.

`resolveEligibility` returns `{ eligible: true }` when **any** series in the job classifies
as CT-of-head (`useFaceEligibility.ts:212`). It discards which one.

`resolveHeadCtSeries` then queries all CT series for the job and picks the one with the
**highest SOP-instance count** (`useFaceVolume.ts:90-122`), applying no head/body-part
classification whatsoever. `classifyEligibility` is not imported by `useFaceVolume`.

Concrete failure: a job containing a 180-slice CT head *and* a 900-slice CT chest/abdomen
passes the guard (head present) and then reconstructs the **chest** series. The
`useFaceEligibility` header claims "A job is eligible when ANY of its series is a confirmed
CT of the head — that is the series the workspace will reconstruct." It is not.

The hook already exposes the plumbing to fix this — `UseFaceEligibilityArgs.seriesUid`
(`useFaceEligibility.ts:61`) — but no caller ever passes it, so the narrowing path is dead.

The stale comment at `useFaceVolume.ts:50-54` ("the eligibility classifier … lands in a
later plan") shows this is unfinished work that was never re-wired after
`faceEligibility.ts` landed.

**Fix:** Have the guard return the winning `seriesUid` and make the loader consume it —
one resolution, one series, one verdict:

```ts
// faceEligibility / useFaceEligibility
export type FaceEligibilityVerdict =
  | { eligible: true; seriesUid: string }
  | { eligible: false; reason: string };

// resolveEligibility: return the first series that classifies eligible, not just `true`.

// useFaceVolume: accept the approved seriesUid and select it directly —
// never re-derive by frame count.
async function resolveApprovedSeries(jobId: string, projectId: number, seriesUid: string) {
  // SELECT study_uid, series_uid FROM series_info
  // WHERE job_id = ? AND series_uid = ?   ← the exact series the guard approved
}
```

Until that lands, at minimum re-run `classifyEligibility` on the chosen candidate inside
`resolveHeadCtSeries` and return `null` when it refuses.

---

### CR-03: `dicom_elements` fallback in the eligibility guard fails OPEN — borrowed modality can promote a non-CT series

**File:** `src/features/face-recon/hooks/useFaceEligibility.ts:226-240`

**Issue:**

```ts
const tagMetas = await fetchDicomElementMeta(seriesUids);   // ALL series uids from pass 1
for (const [, tagMeta] of tagMetas) {
  const merged: FaceEligibilityMeta = {
    modality: tagMeta.modality ?? ctMetas[0]?.modality ?? null,  // ← borrowed "CT"
    bodyPart: tagMeta.bodyPart,
    …
  };
  if (classifyEligibility(merged).eligible) return { eligible: true };
}
```

`seriesUids` (built at `useFaceEligibility.ts:141-143`) contains **every** series in the
job, not only the CT ones. When a series' `0008,0060` (Modality) row is missing from
`dicom_elements` — which is exactly the "unreadable metadata" case this fallback exists to
handle — `tagMeta.modality` is `undefined` and the code substitutes the modality of an
**unrelated** series (`ctMetas[0]`, always `"CT"` by construction at line 218-220).

Concrete failure: job contains one blank-metadata CT (chest) and one MR brain. Pass 1
classifies nothing → `needsTagFallback` is true → the MR series returns
`{ bodyPart: "BRAIN" }` with no modality row → `merged.modality` becomes `"CT"` → verdict
**eligible**. The guard is opened by a series that is neither CT nor the series that will
be loaded.

The module header states the guard "FAILS CLOSED … query failures, empty result sets and
unreadable metadata all resolve to 'refused'". This path resolves the opposite way.

**Fix:** Never synthesize a modality for a series you did not read one for. Restrict the
fallback to the CT series discovered in pass 1 and require a positively-read modality:

```ts
const ctSeriesUids = new Set(/* series_uid of rows whose modality read as CT in pass 1 */);
const tagMetas = await fetchDicomElementMeta([...ctSeriesUids]);
for (const [uid, tagMeta] of tagMetas) {
  if (!ctSeriesUids.has(uid)) continue;
  const merged = { ...tagMeta, modality: tagMeta.modality ?? "CT" }; // safe: uid is a known CT
  if (classifyEligibility(merged).eligible) return { eligible: true, seriesUid: uid };
}
```

This requires `fetchSeriesInfoMeta` to return `metas` and `seriesUids` as *paired* records
rather than two parallel arrays that are never correlated (they are not correlated today —
`metas[i]` and `seriesUids[i]` can diverge whenever a row has a null `series_uid`).

---

### CR-04: Module-level bridge store is never reset — stale `loaded`/`error` leaks across jobs and breaks the "no partial faces" gate

**File:** `src/features/face-recon/lib/faceReconBridgeStore.ts:151`, `src/features/face-recon/components/FaceVolumeViewport.tsx:37-48`, `src/features/face-recon/hooks/useFaceVolume.ts:188-198`

**Issue:** `faceReconBridgeStore` is a module singleton. `reset()` is implemented
(`faceReconBridgeStore.ts:129-136`) and unit-tested (`faceReconBridgeStore.test.ts:182-192`)
but has **no production call site** — no mount effect, no unmount effect, no route change
handler.

`FaceVolumeViewport` derives its render gate from that global snapshot:

```tsx
const { loadingState, loadPct, error } = snapshot;
const loaded = loadingState === "loaded";
const { applyIso } = useSkinVolumeViewport({ elementRef, volumeId, ready: loaded });
```

Sequence that breaks the D-10 guarantee (all within one SPA session):
1. User opens `/face-recon/101`, volume loads → store is `{ loadingState: "loaded", loadPct: 100 }`.
2. User navigates to Jobs, then opens `/face-recon/202`.
3. First render of `FaceVolumeViewport` reads the **stale** snapshot → `loaded === true`,
   so the opaque `!loaded` cover (`FaceVolumeViewport.tsx:69`) does not render.
4. When job 202's `selection` resolves and `volumeId` becomes non-null, React runs child
   effects before parent effects: `useSkinVolumeViewport`'s setup effect
   (`useSkinVolumeViewport.ts:283-376`) fires with `ready === true` **before**
   `useFaceVolume`'s effect (`useFaceVolume.ts:195-198`) patches `"loading"`.
5. `setVolumesForViewports` is therefore called on a volume that has not loaded — the exact
   condition the phase's central invariant forbids ("Attach the volume only once fully
   loaded — no partial faces", `useSkinVolumeViewport.ts:322`).

The `"error"` variant is equally visible: job 101 failing leaves
`{ loadingState: "error", error: "No CT head volume found for this job." }`, and job 202
renders job 101's error message under a black cover with the slider suppressed, before any
request for 202 is made.

**Fix:** Reset the store on workspace mount and unmount, and make `ready` volume-scoped so
a snapshot can never be attributed to the wrong volume:

```tsx
// FaceReconWorkspaceShell (owns the session)
useEffect(() => {
  faceReconBridgeStore.reset();
  return () => faceReconBridgeStore.reset();
}, [jobId]);
```

Stronger: add `volumeId: string | null` to `FaceReconSnapshot`, patch it alongside
`loadingState`, and compute `const loaded = snapshot.loadingState === "loaded" &&
snapshot.volumeId === volumeId;` so a stale snapshot can never satisfy the gate.

---

## Warnings

### WR-01: `/face-recon/*` has no ROUTE_ACCESS entry — route-level RBAC defaults to PUBLIC, and the in-page guard renders optimistically while roles load

**File:** `src/routes/config.tsx:609-618`, `src/features/face-recon/FaceReconWorkspacePage.tsx:164-178`

**Issue:** `getRouteAccess()` (`src/lib/rbac/route-permissions.ts:121-134`) falls back to
`PUBLIC` for any unmatched pathname, and there is no `/face-recon` key in `ROUTE_ACCESS`
(`grep` for `face-recon` in `src/lib/rbac/` returns nothing). The route config entry sets
only `feature: "deid-review"` and `hidden: true`, neither of which participates in
permission resolution — `PermissionGuard` takes no props and resolves purely from
`location.pathname`.

So the app's most sensitive surface is, at the route layer, accessible to every
authenticated user including `viewer`. The only thing holding is the in-page
`<RequirePermission permission="review_results">`, which itself fails open while role state
is resolving:

```tsx
// RequirePermission.tsx
if (loading) {
  return <>{children}</>;   // renders the workspace before authorization is known
}
```

During that window the workspace mounts, `useJobSummary` and `useFaceEligibility` fire, and
(if eligible) volume acquisition begins. It self-corrects once roles resolve, but work
starts before authorization does — and `AccessDeniedPage` never appears for this route.

**Fix:** Add an explicit entry alongside `/deid/review`:

```ts
// src/lib/rbac/route-permissions.ts
'/deid/review':  { permissions: ['review_results'] },
'/face-recon':   { permissions: ['review_results'], minLevel: ROLE_LEVELS.reviewer },
```

and add a `route-permissions.test.ts` case pinning that a `viewer` cannot reach
`/face-recon/1`. Consider rendering a pending state rather than children while
`useRole().loading` is true on this specific surface.

---

### WR-02: Raw axios / CS3D errors are logged, contradicting the "never logs raw UIDs or PHI" contract

**File:** `src/features/face-recon/hooks/useFaceEligibility.ts:239`, `src/features/face-recon/hooks/useFaceVolume.ts:111, 271`

**Issue:** Three call sites pass the caught error object straight into the logger:

```ts
logger.warn("[useFaceEligibility] dicom_elements fallback failed", err);
logger.warn("[useFaceVolume] frame-count query failed; using first CT series", err);
logger.error("[useFaceVolume] volume load failed", err);
```

`executeQuery` (`src/api/dbExplorerApi.ts:34-59`) puts the **entire SQL statement in the
query string** — including every de-identified series UID interpolated at
`useFaceEligibility.ts:158-171`. An `AxiosError` carries `config.url` and `config.headers`,
so expanding the logged object in DevTools exposes those UIDs and the `Authorization`
header injected by the request interceptor. `logger.error` is **not** dev-gated
(`src/lib/logger.ts:31-33` — "Errors are always logged"), so the third call ships to
production consoles.

This contradicts both module headers ("Never logs raw UIDs or PHI",
`useFaceEligibility.ts:23` and `useFaceVolume.ts:18`) and CLAUDE.md's "never log raw
tokens" rule.

**Fix:** Log a scrubbed shape, never the error object:

```ts
function safeErrorLabel(err: unknown): string {
  if (axios.isAxiosError(err)) return `http ${err.response?.status ?? "network"}`;
  return err instanceof Error ? err.name : "unknown";
}
logger.warn("[useFaceVolume] frame-count query failed", safeErrorLabel(err));
```

---

### WR-03: Evidence panel asserts "redacted" / "absent from output" when the pipeline recorded nothing

**File:** `src/features/face-recon/components/DeidEvidencePanel.tsx:79-96, 195-202`

**Issue:** `scrubOutcome` has no "unknown" branch:

```ts
if (!row) return { kind: "absent" };                       // → "absent from output"
if (action === "remove" || action === "delete") …
const replacement = (row.redact_value ?? "").trim();
if (replacement) return { kind: "replaced", value: replacement };
return { kind: "redacted" };                               // ← catch-all
```

Two false-evidence paths:

1. **Missing row → "absent from output."** A tag can be missing because the pipeline removed
   it, *or* because `fetchAllNormalizedSeriesTags` returned nothing for the series, or the
   tag was never indexed. The panel presents all three as proof of scrubbing.
2. **`action: null, redact_value: null` → "redacted."** Every DICOM-Web supplemental row
   produced by `parseDicomJsonInstance` (`src/api/deidReviewApi.ts:1503-1504`) has exactly
   these values, and `mergeNormalizedWithDicomWeb` appends them to the same array the panel
   searches. So a tag the pipeline never touched, surfaced only via DICOM-Web, is rendered
   under a CAN-purple "redacted" chip.

On a panel whose stated purpose is proving to an auditor that the metadata leak is closed,
an unfalsifiable default is worse than an honest gap.

**Fix:** Add an explicit unknown state and render it neutrally:

```ts
type ScrubOutcome =
  | { kind: "absent" } | { kind: "removed" } | { kind: "redacted" }
  | { kind: "replaced"; value: string }
  | { kind: "unknown" };                       // no pipeline record for this tag

if (!row.action && !row.redact_value) return { kind: "unknown" };
// OUTCOME_LABEL.unknown = "no pipeline record"   ← neutral token, not can-purple
```

and distinguish "tag not present in a successfully-fetched tag set" from
"tag set was empty/unavailable" before claiming `absent`.

---

### WR-04: `RewrittenUidPill` renders an original (non-de-identified) UID verbatim

**File:** `src/features/face-recon/components/DeidEvidencePanel.tsx:123-154, 204-220`

**Issue:** The panel header states raw UIDs are safe to display because "they are `2.25.`
de-identified UIDs, which is the entire point of the pills." But the component explicitly
handles the negative case and still prints the value:

```tsx
{deidentified ? "2.25. de-identified" : "not rewritten"}
<span className="break-all font-mono text-xs text-foreground/80">{uid}</span>
```

If the pipeline failed to rewrite a UID, or the `series_info` fallback
(`DeidEvidencePanel.tsx:205-208`) supplies an original UID, the DOM now contains a
PHI-linkable original DICOM identifier — on the one surface that is meant to be evidence of
de-identification. CLAUDE.md treats original UIDs as sensitive ("do not cache PHI/UIDs in
web storage").

**Fix:** Mask the value when `isDeidentifiedUid(uid)` is false:

```tsx
{deidentified ? (
  <span className="break-all font-mono text-xs text-foreground/80">{uid}</span>
) : (
  <span className="font-mono text-xs text-muted-foreground/70">
    withheld — identifier was not rewritten
  </span>
)}
```

---

### WR-05: Cornerstone `eventTarget` listeners leak when the volume effect re-runs during init

**File:** `src/features/face-recon/hooks/useFaceVolume.ts:244-284`

**Issue:** Listeners are registered *after* an await:

```ts
const setup = async () => {
  await ensureCornerstone3DInitialized();
  if (cancelled) return;
  eventTarget.addEventListener(Enums.Events.IMAGE_VOLUME_MODIFIED, onModified);
  eventTarget.addEventListener(Enums.Events.IMAGE_VOLUME_LOADING_COMPLETED, onComplete);
  …
};
void setup();

return () => {
  cancelled = true;
  eventTarget.removeEventListener(Enums.Events.IMAGE_VOLUME_MODIFIED, onModified);
  eventTarget.removeEventListener(Enums.Events.IMAGE_VOLUME_LOADING_COMPLETED, onComplete);
};
```

If the effect re-runs (deps `[volumeId, imageIds, selection]`) or the component unmounts
while `ensureCornerstone3DInitialized()` is still pending, cleanup removes listeners that
have not been added yet; the pending `setup` then resumes, passes the `cancelled` check
only if it happened to be scheduled first, or — in the unmount-during-await case — the
`if (cancelled) return;` saves it. But in the **re-run** case the previous closure's
`cancelled` is set *and* the new run adds its own listeners while the old ones (added
after their cleanup ran) remain attached forever. Handlers are closure-scoped, so each
leaked pair persists for the page lifetime.

**Fix:** Register listeners synchronously in the effect body (before any await) and remove
them in cleanup, or re-check `cancelled` immediately after adding and remove there:

```ts
eventTarget.addEventListener(Enums.Events.IMAGE_VOLUME_MODIFIED, onModified);
eventTarget.addEventListener(Enums.Events.IMAGE_VOLUME_LOADING_COMPLETED, onComplete);
void setup();   // setup no longer touches eventTarget
```

---

### WR-06: No recovery path if `IMAGE_VOLUME_LOADING_COMPLETED` arrives before `loadStatus.loaded` flips

**File:** `src/features/face-recon/hooks/useFaceVolume.ts:233-242`

**Issue:** The reveal has exactly one trigger and it is conditional:

```ts
const onComplete = (evt: Event) => {
  if (!detail || detail.volumeId !== volumeId) return;
  if (volumeRef.current?.loadStatus?.loaded === true && !cancelled) { … reveal … }
};
```

If the aggregate flag has not been set at the instant the event dispatches, the reveal never
happens — no re-check, no post-event verification, no fallback. The user sits under an
opaque black cover at 99% indefinitely with no error and no way to retry short of a reload.
`onModified` cannot rescue it because `highWaterPct` only advances when
`framesProcessed === totalFrames` produces exactly 100.

**Fix:** Re-check the aggregate flag on a microtask after the event, and treat the
frames-complete condition as a second (still aggregate-verified) trigger:

```ts
const tryReveal = () => {
  if (cancelled) return;
  if (volumeRef.current?.loadStatus?.loaded !== true) return;
  setLoadPct(100); setLoadingState("loaded");
  faceReconBridgeStore.patch({ loadingState: "loaded", loadPct: 100 }, true);
};
const onComplete = (evt) => { …guard…; tryReveal(); queueMicrotask(tryReveal); };
// and call tryReveal() from onModified when framesProcessed >= totalFrames
```

---

### WR-07: Volume effect re-runs reset a fully-rendered face back to "loading 0%"

**File:** `src/features/face-recon/hooks/useFaceVolume.ts:188-198, 285`

**Issue:** The effect deps are `[volumeId, imageIds, selection]`, and its first statements
are unconditional:

```ts
setLoadingState("loading");
setLoadPct(0);
faceReconBridgeStore.patch({ loadingState: "loading", loadPct: 0, error: null }, true);
```

`imageIds` and `selection` are React Query `data` references. Any refetch (mount remount
after `staleTime`, manual invalidation, retry) produces a new array/object identity, re-runs
the effect, and flips the workspace from a rendered face back to a 0% loading cover. That
in turn drops `ready` to false in `useSkinVolumeViewport`, re-running its setup effect. The
volume itself is cached, so the state is recovered on the next tick — but the user sees the
face disappear and the load bar restart for no reason.

**Fix:** Only enter the loading state when the volume is not already loaded:

```ts
const cached = cache.getVolume?.(volumeId);
if (cached?.loadStatus?.loaded === true) { /* reveal, skip the reset */ }
else { setLoadingState("loading"); setLoadPct(0); … }
```

or key the effect on stable primitives (`volumeId`, `imageIds.length`, `imageIds[0]`)
rather than object identity.

---

### WR-08: `project_id` is never used in any face-recon SQL, despite headers and parameters claiming it is

**File:** `src/features/face-recon/hooks/useFaceEligibility.ts:20-23, 106-146, 152-195`, `src/features/face-recon/hooks/useFaceVolume.ts:55-124`

**Issue:** The `useFaceEligibility` header states: "Filtering keys on `job_id` and the
integer `project_id` — never the unindexed project-name column." Neither query contains
`project_id`:

```sql
SELECT * FROM series_info WHERE job_id = '…' AND series_uid IS NOT NULL   -- no project_id
SELECT series_uid, tag, value FROM dicom_elements WHERE series_uid IN (…) -- no job_id either
```

`resolveHeadCtSeries` and the `sop_instances` count query in `useFaceVolume` are likewise
`job_id`-only. The `dicom_elements` pass has *no* tenant scoping at all — it matches purely
on series UID, so a UID reused across a re-run job or a different project returns rows from
outside the requested job, and those rows feed the eligibility decision.

`projectId` reaching only the React Query key (`useFaceEligibility.ts:256, 260`) is not the
same as filtering on it.

**Fix:** Add the column to both passes (project_id, integer — per CLAUDE.md), and scope the
tag fallback to the job:

```sql
SELECT * FROM series_info
 WHERE job_id = '…' AND project_id = 51 AND series_uid IS NOT NULL

SELECT series_uid, tag, value FROM dicom_elements
 WHERE job_id = '…' AND series_uid IN (…) AND tag IN (…)
```

If `series_info`/`dicom_elements` genuinely lack `project_id`, correct the module headers
rather than leaving a claim the code does not honor.

---

### WR-09: Face-recon reaches the database through a standalone axios instance, bypassing the shared auth interceptors

**File:** `src/features/face-recon/hooks/useFaceEligibility.ts:27`, `src/features/face-recon/hooks/useFaceVolume.ts:29`

**Issue:** Both hooks import `executeQuery` from `@/api/dbExplorerApi`, which builds its own
client:

```ts
// src/api/dbExplorerApi.ts:16-18
const api = axios.create({ baseURL: getApiBaseUrl() });
```

This bypasses the shared `api` instance from `rdxApi.ts` and therefore the centralized
401 session-expired probe and 403 debounced-toast handling. CLAUDE.md is explicit:
"All new API modules must import `api` from `rdxApi.ts`" / "Never construct standalone
axios instances." A 401 during eligibility resolution surfaces as a generic query failure
(which, per CR-03's sibling path, resolves to a refusal with misleading copy) instead of
the app's session-expiry flow.

**Fix:** Either migrate `dbExplorerApi` to the shared instance, or add a thin face-recon
data module that goes through `api`:

```ts
import { api } from "@/api/rdxApi";
export const runFaceReconQuery = async (sql: string, limit: number) =>
  api.get("/api/query", { params: { sql, limit } });
```

---

### WR-10: `sqlEscape` re-implemented twice instead of using the shared `escapeSql`

**File:** `src/features/face-recon/hooks/useFaceVolume.ts:45-47`, `src/features/face-recon/hooks/useFaceEligibility.ts:75-77`

**Issue:** Both hooks define an identical private helper:

```ts
function sqlEscape(value: string): string {
  return value.replace(/'/g, "''");
}
```

The codebase already exports `escapeSql` from `src/lib/filter-sql-utils.ts`, used by
`dataset-builder-url-scope.ts` and `dataset-query-builder-v2.ts`. Two extra copies of a
security-relevant escaping routine means three places to fix if the backend's quoting rules
turn out to need backslash handling. (Injection is not currently exploitable here: `jobId`
is Zod-validated `^\d+$` at `route-params.ts:99`, and `seriesUid` is never passed by any
caller — but the *next* caller will not have that guarantee.)

**Fix:** `import { escapeSql } from "@/lib/filter-sql-utils";` in both hooks and delete the
local copies. If the shared helper is inadequate, harden it once, centrally.

---

### WR-11: `registerUnknownVolumeLoader` makes the streaming loader an app-wide fallback for *any* scheme

**File:** `src/components/viewer-next/runtime/initCornerstone3D.ts:61-65`

**Issue:**

```ts
volumeLoader.registerVolumeLoader("cornerstoneStreamingImageVolume", cornerstoneStreamingImageVolumeLoader);
volumeLoader.registerUnknownVolumeLoader(cornerstoneStreamingImageVolumeLoader);
```

The named registration is all this feature needs — its volumeIds are always
`cornerstoneStreamingImageVolume:face-recon-…` (`useFaceVolume.ts:163`). The second line is
a global behavioral change for the whole application: every future volumeId with a
misspelled or unregistered scheme now silently resolves to the streaming loader instead of
throwing. That converts a loud, immediately-diagnosable error into a confusing partial load,
in a codebase where a *typo'd* volumeId is a realistic mistake.

**Fix:** Drop the unknown-loader registration, or scope it behind an explicit opt-in and
document the schemes it is meant to catch:

```ts
volumeLoader.registerVolumeLoader(
  "cornerstoneStreamingImageVolume",
  cornerstoneStreamingImageVolumeLoader,
);
// No registerUnknownVolumeLoader — an unregistered scheme should fail loudly.
```

---

### WR-12: Guard never resolves when `projectId` is null — permanent "Preparing volume…" with no error

**File:** `src/features/face-recon/hooks/useFaceEligibility.ts:256, 269`, `src/features/face-recon/FaceReconWorkspacePage.tsx:119-138`

**Issue:**

```ts
const enabled = Boolean(jobId && typeof projectId === "number");
const isLoading = !enabled || query.isPending;
```

If `useJobSummary` fails, or the job has `projectId === null` (the type is
`number | null`, `useJobSummary.ts:24`), `enabled` stays false forever. `verdict` is `null`,
so `isIneligible` is false and the page renders `FaceReconWorkspaceShell` with
`eligible={false}`. `useFaceVolume` is handed `undefined`, nothing is fetched, and the
viewport sits on "Preparing volume…" permanently — no error, no refusal, no retry.

Access-control-wise this fails closed (good), but it is an unrecoverable dead UI state with
no diagnostic.

**Fix:** Treat an unresolvable project as an explicit refusal rather than perpetual loading:

```ts
const summaryResolved = !summaryPending;
const unresolvableProject = summaryResolved && typeof projectId !== "number";
if (unresolvableProject) {
  return <IneligibleVolumeRefusal reason="Could not resolve this job's project" />;
}
```

---

### WR-13: Guard failures render "This volume isn't a CT head scan" for what may be a transient index error

**File:** `src/features/face-recon/hooks/useFaceEligibility.ts:272-274`, `src/features/face-recon/FaceReconWorkspacePage.tsx:51-69`

**Issue:** Every refusal — genuine ineligibility, a 500 from `/api/query`, an expired
session, an empty result set — collapses to the same verdict
`{ eligible: false, reason: INELIGIBLE_REASON }`, and `IneligibleVolumeRefusal` renders the
fixed body copy "This volume isn't a CT head scan, so it can't be reconstructed here."

Failing closed is correct. Asserting a factual claim about the data when the guard never
managed to read the data is not — the operator has no way to distinguish "wrong modality"
from "backend down", and the copy actively misleads them toward the former.

**Fix:** Carry a refusal *cause* through the verdict and vary only the body copy (keep the
heading and the fail-closed behavior identical):

```ts
type RefusalCause = "not-ct-head" | "no-indexed-series" | "guard-unavailable";
// guard-unavailable → "We couldn't verify this volume. Try again, or check the index."
```

---

### WR-14: Head-keyword fallback matches "HEAD FIRST SUPINE" — the exact bypass D-09 claims to prevent

**File:** `src/features/face-recon/lib/faceEligibility.ts:29-42, 100-102`, `src/features/face-recon/lib/faceEligibility.test.ts:85-96`

**Issue:** The test suite pins that a description cannot override a *present* non-head body
part:

```ts
classifyEligibility({ modality: "CT", bodyPart: "CHEST", seriesDesc: "Head first supine" })
// → refused ✓
```

But the fallback path (`bodyPart` blank) applies the same keyword list with no such
protection — and the module's own comment says blank `BodyPartExamined` is "common on
de-identified indexes," i.e. this is the *common* path, not the edge case:

```ts
classifyEligibility({ modality: "CT", bodyPart: "", seriesDesc: "CHEST HEAD FIRST-SUPINE" })
// → ELIGIBLE (matches "head")
```

"HEAD FIRST" / "HEADFIRST" patient-position text is routinely embedded in DICOM series
descriptions across all body regions. The guard's most-used path admits chest, abdomen and
whole-body CTs.

**Fix:** Add a negative-keyword veto to the fallback and exclude the position idiom:

```ts
const POSITION_NOISE = /head\s*[- ]?first|headfirst|feet\s*[- ]?first/gi;
const NON_HEAD_KEYWORDS = ["chest","thorax","abdomen","pelvis","spine","lung","cardiac","body","extremity"];

const descriptions = `${normalize(meta.studyDesc)} ${normalize(meta.seriesDesc)}`
  .replace(POSITION_NOISE, " ");
if (NON_HEAD_KEYWORDS.some((k) => descriptions.includes(k))) return REFUSED;
return mentionsHeadRegion(descriptions) ? ELIGIBLE : REFUSED;
```

and add test cases for `"CT CHEST HEAD FIRST-SUPINE"` with a blank body part.

---

### WR-15: The security-critical allowlist and the fail-closed hook have no tests

**File:** `src/features/face-recon/lib/approvedProjects.ts` (no `.test.ts`), `src/features/face-recon/hooks/useFaceEligibility.ts` (no `.test.ts`)

**Issue:** Three test files were delivered — `faceEligibility.test.ts` (163 lines),
`skinTransferFunction.test.ts` (187 lines), `faceReconBridgeStore.test.ts` (204 lines) —
covering the pure classifier, the HU math, and the store. Neither security control has one:

- `approvedProjects.ts` explicitly advertises itself as "Pure — safe to call in render and
  in tests" and describes the fail-closed contract (`undefined`/`null`/non-approved →
  `false`), which nothing verifies. Nothing would catch an accidental
  `APPROVED_PROJECT_IDS.add()` or a truthiness regression in `isApprovedProject`.
- `useFaceEligibility`'s documented invariants — query error → refused, empty result set →
  refused, tag-fallback bounded — are untested; CR-03 is precisely a fail-open in that
  untested path.

**Fix:** Add `approvedProjects.test.ts` (fail-closed matrix: `undefined`, `null`, `NaN`,
`-1`, `0`, `"51"` as a string, a non-approved id, an approved id) and a hook test with a
mocked `executeQuery` covering: throws → refused; empty rows → refused; CT+CHEST → refused;
non-CT with borrowed modality → refused (regression test for CR-03).

---

## Info

### IN-01: Two sources of truth for the default iso HU

**File:** `src/features/face-recon/lib/faceReconBridgeStore.ts:30`, `src/features/face-recon/lib/skinTransferFunction.ts:33`

`DEFAULT_ISO_VALUE = -200` and `DEFAULT_ISO_HU = -200` are the same physical constant
declared twice, in two modules, with two names, and asserted separately by two test files.
`IsoThresholdSlider` seeds local state from `DEFAULT_ISO_HU` while the store seeds from
`DEFAULT_ISO_VALUE`; they will silently disagree the moment one is tuned.

**Fix:** `export const DEFAULT_ISO_VALUE = DEFAULT_ISO_HU;` re-exported from
`skinTransferFunction.ts`, or delete the store-side constant entirely.

---

### IN-02: Dead state and unused public API across the feature

**File:** `src/features/face-recon/lib/faceReconBridgeStore.ts:129-136`, `src/features/face-recon/hooks/useFaceVolume.ts:126-133, 168-171`, `src/features/face-recon/hooks/useFaceEligibility.ts:61, 68-70`

- `faceReconBridgeStore.reset()` — implemented, tested, never called (see CR-04).
- `FaceReconSnapshot.isoValue` — written by `IsoThresholdSlider.tsx:62`, read by nothing.
- `UseFaceVolumeResult.volume / loadingState / loadPct / error` — the only consumer
  destructures `{ volumeId, selection }` (`FaceReconWorkspacePage.tsx:83`). The four
  `useState` hooks backing them exist purely to be mirrored into the global store, so the
  hook maintains two parallel copies of the same state.
- `UseFaceEligibilityArgs.seriesUid` and `UseFaceEligibilityResult.isLoading / isError` —
  no caller passes or reads them.

**Fix:** Delete the unused surface, or wire it (the `seriesUid` narrowing is the intended
fix for CR-02).

---

### IN-03: `IsoThresholdSlider` renders above the loading cover

**File:** `src/features/face-recon/components/FaceVolumeViewport.tsx:62-66, 69-71`

The slider wrapper is `z-20`; the opaque "no partial faces" cover is `z-10`. While the
volume streams, a dimmed-but-visible slider floats on top of the loading indicator. It is
correctly `disabled`, so this is cosmetic, but it contradicts the component's own comment
("Inert until the volume is loaded") in spirit and clutters the load state.

**Fix:** `{loaded && !isError && (<div className="…">…</div>)}` — mount the control only
once the reveal has happened.

---

### IN-04: Slider label/aria are attached to the Radix root, not the `role="slider"` thumb

**File:** `src/features/face-recon/components/IsoThresholdSlider.tsx:76-101`

`<label htmlFor="face-recon-iso-slider">` and `aria-label` both land on the Slider root
`<span>`. The element that actually carries `role="slider"` is the Radix Thumb, which
receives neither, so screen readers announce an unlabeled slider. The custom class selector
`[&_[role=slider]]` at line 98 shows the author knows the thumb is a separate node.

**Fix:** Pass the labelling through to the thumb (Radix forwards `aria-label` on
`SliderThumb`), or use `aria-labelledby` pointing at the visible label's id.

---

### IN-05: Stale comment — `resolveHeadCtSeries` says the classifier "lands in a later plan"

**File:** `src/features/face-recon/hooks/useFaceVolume.ts:49-54`

> "For this walking-skeleton plan the eligibility classifier (CT + head, VOL-03/D-09) lands
> in a later plan; here we pick the largest CT series (most SOP instances) for the job"

`faceEligibility.ts` shipped in this same phase. The comment documents the CR-02 defect as
if it were still planned work, which will mislead the next reader into thinking the gap is
tracked.

**Fix:** Remove the comment as part of the CR-02 fix.

---

### IN-06: `approvedProjects.ts` doc block describes a sentinel the file no longer contains

**File:** `src/features/face-recon/lib/approvedProjects.ts:41-51`

The doc block above `APPROVED_PROJECT_IDS` still explains that "Sentinel `-1` is
intentionally unmatchable by any real project_id … so the gate fails closed until real
approved ids are filled in", while the set now holds a real id. *The value itself is the
intended demo configuration and is not a finding* — but the surrounding prose now describes
a different file than the one it sits in, on the codebase's most security-sensitive
constant.

**Fix:** Update the block to state which project is approved and by whom, e.g.
"Approved 2026-07: project_id 51 (data owner sign-off on file). Adding an id here grants
face-reconstruction consent — treat as a security change."

---

### IN-07: `applySkinTF` allocates vtk transfer functions per frame without releasing the previous pair

**File:** `src/features/face-recon/lib/skinTransferFunction.ts:205-216`, `src/features/face-recon/hooks/useSkinVolumeViewport.ts:247-269`

Each rAF-coalesced iso change calls `vtkColorTransferFunction.newInstance()` and
`vtkPiecewiseFunction.newInstance()` and hands them to the actor property; the displaced
instances are never `.delete()`d. vtk.js objects have explicit lifetimes, so a sustained
slider drag allocates a new pair per frame. Flagged as informational only — memory
behavior is out of scope for this review tier — but it is a cheap fix while the code is
open.

**Fix:** Retain the previous pair in a ref and `delete()` it after `setRGBTransferFunction`
/ `setScalarOpacity` have taken the replacement, or mutate a single long-lived pair via
`removeAllPoints()` + `addRGBPoint()` instead of reallocating.

---

_Reviewed: 2026-07-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
