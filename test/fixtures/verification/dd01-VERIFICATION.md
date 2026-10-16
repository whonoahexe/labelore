---
phase: 01-volume-acquisition-fast-volume-render
verified: 2026-08-06T17:05:00Z
status: human_needed
score: 14/14 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification: true
previous_verification:
  file: 01-VERIFICATION-2026-07-24.archived.md
  previous_status: gaps_found
  previous_score: 7/14
  previous_behavior_unverified: 4
  gaps_closed:
    - gap: "GUARD-03 — workspace not gated to the allowlist"
      closed_by: "01-06 (route RBAC + committed value + 15 consent tests) and 01-09 (resolveWorkspaceGate + page wiring, 21-case truth table)"
    - gap: "VOL-02 — faceReconBridgeStore.reset() had zero production call sites"
      closed_by: "01-07 (volumeId-stamped snapshots + deriveViewportGate identity check) and 01-09 (reset at the session boundary); later collapsed to one owner via key={jobId} + unmount cleanup"
    - gap: "VOL-03 — guard and loader selected different series; fallback failed open"
      closed_by: "01-05 (identity-bearing FaceEligibilityVerdict + CT-bounded fallback) and 01-08 (loader consumes the approved seriesUid; frame-count heuristic deleted)"
    - gap: "Allowlist value PARTIAL — APPROVED_PROJECT_IDS was new Set([-1]) as committed"
      closed_by: "01-06 — APPROVED_IDS = Object.freeze([51]) is committed at HEAD; doc block provenance matches"
  behavior_unverified_closed:
    - truth: "REND-01 / A4 geometry — a real GPU volume-rendered face"
      closed_by: "01-10 Checkpoint 1, human observation 2026-07-27 on job 123 / project 51 — A4 CONFIRMED"
    - truth: "REND-02 — live HU iso slider"
      closed_by: "01-10 Checkpoint 2 criterion 4 FAILED; root-caused and fixed at 7e3d53d (01-11); human re-verified live 2026-07-27"
    - truth: "REND-03 — rotate / orbit / zoom with lighting"
      closed_by: "01-10 Checkpoint 2 criteria 6 and 7, human observation 2026-07-27"
    - truth: "Determinate 'Loading volume… N%' with the face blank until full load"
      closed_by: "01-10 Checkpoint 2 criteria 1 and 2, human observation 2026-07-27"
  regressions: []
data_blocked: # NOT passes and NOT failures — preserved per ROADMAP's own framing
  - truth: "A deep-link to a non-CT / non-head series on an APPROVED project is refused with the CT-head reason"
    requirement: VOL-03
    reason: >-
      Every series on project 51 is CT. The only MR job (122) lives on project 50, so the
      consent gate refuses it FIRST — that exercises GUARD-03, not VOL-03. Widening
      APPROVED_PROJECT_IDS to reach the modality gate would mean disabling one guard to
      test another.
    covered_by_automation: "faceEligibility.test.ts (26 cases), useFaceEligibility.test.ts (9), workspaceGate.test.ts (21) — all green; not a substitute for the live leg"
    to_close: "Ingest a non-CT-head series into project 51, then re-run 01-10 Checkpoint 3 item 2a"
  - truth: "A job holding both a CT head and a larger CT chest reconstructs the HEAD"
    requirement: VOL-03
    reason: "No job in the database holds both. 01-10 Checkpoint 3 item 3 recorded blocked, per the plan's own direction not to approve on the unit test."
    covered_by_automation: "resolveEligibility names the winning seriesUid; useFaceVolume consumes exactly it; resolveHeadCtSeries deleted repo-wide (zero references)"
    to_close: "Ingest or index a head+chest CT job on an approved project, then re-run Checkpoint 3 item 3"
human_verification:
  - test: "Run `yarn validate:routing` to completion (dev server on :3001, `UI_VALIDATION_USERNAME` / `UI_VALIDATION_PASSWORD` set)"
    expected: "Suite completes with no routing regressions; the `/face-recon/:jobId` route and its guard resolve as configured"
    why_human: >-
      Plans 01-06 and 01-09 both deferred to this suite and it has never completed. 01-10
      attempted it on 2026-07-27 and got 14 failed / 5 skipped from a single environmental
      cause — the Playwright chromium binary was missing and no test body executed. That
      binary is NOW INSTALLED (~/.cache/ms-playwright/chromium_headless_shell-1208 present),
      so the only remaining blockers are the two credential env vars and a running dev
      server. Cheaper to close now than at any point in the phase's history.
  - test: "Load bare `/face-recon` (no jobId) and record what actually renders"
    expected: "Falls through to the 404 catch-all — `config.tsx:611` registers only `face-recon/:jobId`, so no page mounts and no toast fires"
    why_human: >-
      01-10 Checkpoint 3 item 2c is recorded as 'not separately observed'. The developer's
      blanket 'pass' did not distinguish it. A STATE.md decision note claiming
      '/face-recon with no jobId redirects to Jobs with the toast' is inaccurate as written
      — the redirect+toast at FaceReconWorkspacePage.tsx:496-509 fires only on a route MATCH
      with a failing Zod param (i.e. a non-numeric jobId, which WAS confirmed). Cosmetic,
      one-line confirmation, but it is not something to infer.
warnings:
  - id: WARN-01
    severity: warning
    item: "ROADMAP Success Criterion 5 still requires 'an internal-only, non-overstating framing banner'"
    detail: >-
      REQUIREMENTS.md GUARD-02 struck the banner clause on 2026-08-06 (commit 1777224,
      operator decision) with a full record. ROADMAP.md SC5 was never given the parallel
      strike note that SC4 received for the HU band, so the roadmap contract still names a
      component the requirement of record deliberately removed. Not a code defect — the
      operative half (reconstructability, not identification) holds and is mutation-checked.
      Fix is a one-line amendment to SC5 mirroring SC4's precedent.
  - id: WARN-02
    severity: warning
    item: "01-CONTEXT.md D-05 and D-07 carry superseded text with no supersession note"
    detail: >-
      D-05 still mandates the persistent internal-only banner and the attributed Schwarz
      footnote (both deleted at 1777224); D-07 still specifies the '−300 to −100' iso range
      (corrected to −300..+200 on 2026-07-27). ROADMAP, REQUIREMENTS and the code all carry
      the corrections; only the CONTEXT decisions file reads as though nothing changed.
  - id: WARN-03
    severity: info
    item: "DEFAULT_ISO_HU docblock cites the superseded band"
    detail: >-
      skinTransferFunction.ts:32 reads 'the -300..-100 HU band midpoint-ish'. The VALUE
      (−200) is correct and approved; only the comment is stale. Known and deliberately
      left out of the fix commit's four-file scope — recorded in
      .planning/debug/resolved/iso-slider-no-visible-change.md § 'Known cosmetic inaccuracy'.
---

# Phase 01: Volume Acquisition + Fast Volume-Render — Verification Report (RE-VERIFICATION)

**Phase Goal:** Users can select an approved de-identified head-CT volume and see a real-time, GPU volume-rendered, rotatable face — displayed directly alongside the volume's "de-identified" status.

**Verified:** 2026-08-06
**Status:** human_needed (14/14 truths verified; 2 outstanding human items; 2 data-blocked corroborations)
**Re-verification:** Yes — supersedes `01-VERIFICATION-2026-07-24.archived.md` (`gaps_found`, 7/14)

## Re-verification note

The 2026-07-24 report was written against commit `c7b696b`, before plans 01-05 … 01-10, the
01-11 iso-slider fix, and the 2026-08-06 viewport-resize work. **All four of its gaps are
closed in the committed tree, and all four of its behavior-unverified truths have since been
observed by a human.** Each closure was verified independently against the code below rather
than accepted from a SUMMARY.

| Prior gap | Verdict now | Closed by |
|---|---|---|
| GUARD-03 — workspace not gated | ✅ CLOSED | 01-06 + 01-09 |
| VOL-02 — `reset()` never called; unscoped snapshot | ✅ CLOSED | 01-07 + 01-09 |
| VOL-03 — guard and loader select different series; fallback fails open | ✅ CLOSED | 01-05 + 01-08 |
| Allowlist value uncommitted (`-1` sentinel) | ✅ CLOSED | 01-06 |
| REND-01 / REND-03 / progress — present, behavior unverified | ✅ OBSERVED | 01-10 (2026-07-27) |
| REND-02 — present, behavior unverified | ✅ OBSERVED after a real FAILURE and a fix | 01-10 → `7e3d53d` (01-11) → human re-verify |

Two events since that report deserve explicit note because they cut in opposite directions:

1. **REND-02 genuinely failed human verification**, which is the strongest evidence in this
   phase that the human checkpoint is not a rubber stamp. The archived report's
   `PRESENT_BEHAVIOR_UNVERIFIED` call on SC4 was correct and was vindicated: the slider had
   been inert since 01-03 behind 124 green tests. It was root-caused to an AND-gate (a CS3D
   actor-key mismatch plus a measurably inert HU band), fixed, and re-observed.
2. **The 2026-08-06 resize/layout work touched Phase 01 surfaces** (`useSkinVolumeViewport.ts`,
   `FaceReconWorkspacePage.tsx`, `FramingBanner.tsx`, `FaceVolumeViewport.tsx`). Checked for
   regressions against every Phase 01 truth: **none found.** Two Phase 01 truths were
   *improved* by it (GUARD-01's degradation lifted; the evidence panel now stacks rather than
   hiding below `lg`). One requirement's wording was deliberately narrowed by operator
   decision (GUARD-02's banner clause, struck in REQUIREMENTS.md with a full record) —
   verified against the amended text, not the deleted component.

## Goal Achievement

### Observable Truths

Same 14 truths as the archived report (ROADMAP SC1–SC5 + plan truths T6–T14), so the
re-adjudication maps line-for-line.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Select an approved head-CT from an allowlist; the picker blocks non-CT / non-head (VOL-01, VOL-03, GUARD-03) | ✓ VERIFIED | `FaceReconWorkspacePage.tsx:407` calls `isApprovedProject(projectId)` and `:415` `resolveWorkspaceGate(...)`; the shell mounts **only** in the `allowed` arm. Consent precedes the query — `useFaceEligibility` is handed `jobId: undefined` when unapproved, so a non-consented project runs zero eligibility SQL. Live-confirmed 01-10 Checkpoint 3 item 1 (jobs 122/project 50 and 119/project 1 both refused, zero eligibility query fired). |
| SC2 | Rendering never starts on a partially-loaded volume; the aggregate load signal gates, never `getImageLoadObject` (VOL-02) | ✓ VERIFIED | `grep -rn getImageLoadObject src/features/face-recon` → **zero**. Gate is the pure `isAggregateLoaded` (`lib/volumeLoadGate.ts`, 14 tests) plus `deriveViewportGate` identity scoping (`lib/viewportGate.ts`, 7 tests incl. "does NOT reveal a loaded snapshot belonging to another volume"). Live-confirmed 01-10 Ckpt 2 criterion 2 and Ckpt 3 items 4a/4b — including the genuine *failed*-first-job leg, run without a page reload. |
| SC3 | Real-time GPU volume-rendered face on a `VOLUME_3D` viewport, singleton engine, hand-built skin TF (REND-01) | ✓ VERIFIED | `engine.enableElement({type: Enums.ViewportType.VOLUME_3D})` at `useSkinVolumeViewport.ts:383-389` on `getOrCreateRenderingEngine()`; zero `new RenderingEngine` in the feature. **A4 CONFIRMED** by human observation 2026-07-27 (01-10-SUMMARY § "A4 geometry verdict"): coherent shaded human head, correct orientation, no shear/stretch/mirror, handedness cross-checked against the app's 2D viewer. |
| SC4 | Drag a HU iso slider (~−300 to **+200**) and watch the face update live (REND-02) | ✓ VERIFIED | Band `ISO_SLIDER_MIN_HU = -300` / `ISO_SLIDER_MAX_HU = 200` (`IsoThresholdSlider.tsx:78-79`), inside the `-600..+200` clamp. `applyIso` resolves through `resolveVolumeActor` (referencedId fallback) and the call site passes `actorUID: volumeId` (`useSkinVolumeViewport.ts:415`); both formerly-silent returns `logger.warn`. 13 regression tests pin the old broken lookup as an explicit assertion. **Human re-verified live 2026-07-27** after failing 01-10 Ckpt 2 criterion 4. |
| SC5 | Rotate / orbit / zoom with lighting, beside the de-identified status and non-overstating framing (REND-03, GUARD-01, GUARD-02) | ✓ VERIFIED | Tool group: `TrackballRotateTool`/`ZoomTool`/`PanTool` + `ToolGroupManager` + guarded `addViewport` + `setToolActive` on Primary (`:104-146`). Shading `setShade(true)` + ambient/diffuse/specular (`skinTransferFunction.ts:223-227`). Live-confirmed 01-10 Ckpt 2 criteria 6 and 7, and Ckpt 3 items 5–10. **See WARN-01** — the roadmap clause naming a banner that GUARD-02 deliberately struck. |
| T6 | Entry is the Jobs-row action only — no top-level route, no separate picker (D-01) | ✓ VERIFIED | `routes/config.tsx:610-620` — `face-recon/:jobId`, `hidden: true`, no nav entry. |
| T7 | The viewport uses the app's singleton RenderingEngine — no second WebGL engine | ✓ VERIFIED | Zero `new RenderingEngine` / `createRenderingEngine` in the feature; only `getOrCreateRenderingEngine()`. Unmount detaches and calls `disableRenderingEngineViewport`, never destroying the shared engine. |
| T8 | The "Reconstruct face" action is absent for non-allowlisted projects | ✓ VERIFIED | `JobRowActions.tsx:173` `isApprovedProject(projectId)` → `:293` conditional render, plus a handler early return. |
| T9 | Hand-built raw-HU skin transfer function, never a preset | ✓ VERIFIED | `applySkinTF` builds `vtkColorTransferFunction`/`vtkPiecewiseFunction` at literal HU coordinates; no `applyPreset` anywhere. 15 tests pin the raw-HU axis and iso shift. |
| T10 | A deep-link to an ineligible (non-CT / non-head) jobId is refused at the workspace | ✓ VERIFIED (2 live legs data-blocked) | Verdict now NAMES its series (`FaceEligibilityVerdict = {eligible:true; seriesUid; studyUid}`), the loader consumes exactly it, and the anonymous `{eligible:true}` no longer type-checks. Fallback bounded to series **already read as CT in pass 1** (`useFaceEligibility.ts:271-297`) — the MR-brain borrowed-modality bypass is gone. Live: 2b (non-numeric jobId → redirect+toast) and 2d (approved project, zero indexed series → fail-closed refusal) confirmed. Legs 2a and 3 are **data-blocked**, not passes. |
| T11 | The slider is visibly disabled until the volume is fully loaded | ✓ VERIFIED | `IsoThresholdSlider` derives `disabled` from the store's `loadingState`; live-confirmed 01-10 Ckpt 2 criterion 3 (inert during load, enabled at ≈ −200 HU after). |
| T12 | The evidence panel loads independently and never blocks or breaks the face render | ✓ VERIFIED | `<aside>` is a sibling of `<main>` (`FaceReconWorkspacePage.tsx:304`); `DeidEvidencePanel` owns its own query with in-panel skeleton/error/empty and internal scroll. Live-confirmed 01-10 Ckpt 3 items 7 and 8 (forced evidence failure stayed in-panel; the face still rendered). |
| T13 | Framing asserts reconstructability only — no identification or accuracy claim | ✓ VERIFIED (scope narrowed by operator decision) | `ReconstructabilityClaim` is the only framing copy: *"This de-identified volume reconstructs into a recognizable facial surface."* `InternalRedTeamBanner` and `ExternalContextFootnote` were **deleted at operator request** (1777224) and GUARD-02's banner clause struck in REQUIREMENTS.md. The removed footnote's *rule* was NOT removed with it — `FaceReconWorkspacePage.test.ts:301` directly asserts the prohibition (no identification/match claim, no accuracy or hit-rate figure, no third party's finding), mutation-checked with an injected `"Accuracy: matched the patient in 83% of cases (Schwarz et al.)"` line. |
| T14 | Determinate "Loading volume… N%" while streaming; the face panel blank until full load | ✓ VERIFIED | `role="progressbar"` driven by `loadPct` off `IMAGE_VOLUME_MODIFIED` frame counts with monotonic clamping; opaque cover while `!loaded`. Live-confirmed 01-10 Ckpt 2 criteria 1 and 2 (monotonic 0→100, no rewind, reveal only at 100%). |

**Score:** 14/14 truths verified (0 present-but-behavior-unverified — every previously-unproven
truth now carries a dated human observation).

### Data-Blocked Items (not passes, not failures)

Preserved exactly as ROADMAP and 01-10-SUMMARY record them. Both are *corroborations* of
truths already verified by executable truth table — not the sole evidence for any truth.

| # | Item | Requirement | Why blocked | To close |
|---|------|-------------|-------------|----------|
| 1 | CT-head refusal observed in isolation on an approved project | VOL-03 | Every project-51 series is CT; the only MR job (122) is on project 50, so consent refuses first and the modality gate is never reached. Widening the allowlist to test it would disable one guard to test another. | Ingest a non-CT-head series into project 51 |
| 2 | Head+chest job reconstructs the **head** | VOL-03 | No job holds both. Plan 01-08 directed recording this rather than approving on the unit test. | Ingest/index a head+chest CT job on an approved project |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `lib/approvedProjects.ts` | Allowlist + `isApprovedProject` (GUARD-03) | ✓ VERIFIED | `APPROVED_IDS = Object.freeze([51])` **committed at HEAD** (`git show HEAD:` confirms); doc-block provenance names project 51 / ReconTest01. Predicate reads the frozen array, not the Set view, so `(APPROVED_PROJECT_IDS as Set).add(9999)` is a no-op. 15 tests. |
| `lib/workspaceGate.ts` | Pure route-side consent decision | ✓ VERIFIED | 166 lines; `summaryError` → refuse, `summaryPending` → wait, then consent, then eligibility, then a named-series check. 21-case truth table incl. "refuses a non-approved project holding a genuine CT head — the URL-typing bypass". |
| `lib/viewportGate.ts` | Volume-scoped reveal gate (VOL-02) | ✓ VERIFIED | `isMine` computed once; `loaded`/`isError`/`isStreaming`/`loadPct` all expressed through it, so a future field cannot forget the check. 7 tests. |
| `lib/volumeLoadGate.ts` | Loader-side aggregate-load decision | ✓ VERIFIED | 14 tests; `isAggregateLoaded` + `shouldEnterLoadingState` (WR-07 no-rewind). |
| `lib/volumeActorResolution.ts` | CS3D actor lookup with `referencedId` fallback | ✓ VERIFIED | New at `7e3d53d`; 13 tests including the old broken `getActor(volumeId)` pinned as an explicit assertion. |
| `lib/viewportResizeCalibration.ts` | Resize read-back + retry seam | ✓ VERIFIED | New at `9a0b22b`; 23 tests, including a CONTRACT test against the real installed `@cornerstonejs/core` so an upgrade fails loudly. |
| `lib/faceEligibility.ts` | Pure CT-head classifier (D-09) | ✓ VERIFIED | Identity-bearing verdict; strict modality gate, BodyPartExamined decisive, position-idiom scrub → non-head veto → head match. 26 tests. |
| `hooks/useFaceEligibility.ts` | React-Query wrap; fail-closed fallback | ✓ VERIFIED | Paired `FaceSeriesRecord` (no parallel arrays); pass 2 bounded to CT-confirmed series; `safeErrorLabel` on every catch. 9 tests. |
| `hooks/useFaceVolume.ts` | Approved-series loader + full-load gate | ✓ VERIFIED | Consumes `approved.seriesUid`; `resolveHeadCtSeries` **deleted** (zero references repo-wide); refuses rather than substituting when the series cannot be resolved; every store patch stamped with its `volumeId`. |
| `hooks/useSkinVolumeViewport.ts` | VOLUME_3D lifecycle on the singleton engine | ✓ VERIFIED | 600+ lines; enable-once, `actorUID: volumeId`, `resizeAndProbe` on every resize path, ResizeObserver, unmount detach+disable. |
| `components/FaceVolumeViewport.tsx` | Full-bleed canvas, blank until loaded | ✓ VERIFIED | Opaque cover on `!loaded`; overlay stack is `absolute inset-0` so the shelf and slider float and cannot steal viewport height. |
| `FaceReconWorkspacePage.tsx` | Gated split-panel workspace | ✓ VERIFIED | Zod param parse → role-loading pending state → `RequirePermission` → `resolveWorkspaceGate` switch → shell `key={jobId}`. The allowlist gate its own header claimed in the archived report now exists. |
| `components/DeidEvidencePanel.tsx` | Scrubbed-tag proof + `2.25.` pills + badge (D-04) | ✓ VERIFIED | The archived warning is closed: `scrubOutcome` has an explicit `unknown` branch rendering "no pipeline record" in a neutral chip, never the CAN-purple redaction marker. |
| `components/FramingBanner.tsx` | Reconstructability claim (D-05, amended) | ✓ VERIFIED (narrowed) | One export now. Header records what each removed piece said and which rule it carried, so a future edit cannot reintroduce a third party's figure as this tool's result. |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| `FaceReconWorkspacePage.tsx` | `lib/approvedProjects.ts` | `isApprovedProject(projectId)` at `:407`, then `resolveWorkspaceGate` at `:415` | ✓ WIRED — **the archived BLOCKER is closed** |
| `resolveWorkspaceGate` | `FaceEligibilityVerdict.seriesUid` | `allowed` arm carries `{projectId, seriesUid, studyUid}` into the shell's `approved` prop | ✓ WIRED |
| `FaceEligibilityVerdict.seriesUid` | `useFaceVolume` | `approved` argument → `resolveApprovedSeries` → one narrow lookup for that UID only | ✓ WIRED — approving A and loading B is no longer expressible |
| `FaceReconWorkspaceShell` | `faceReconBridgeStore.reset()` | unmount cleanup at `:274`, with `key={jobId}` as the session boundary | ✓ WIRED — **the archived zero-call-site defect is closed** |
| `FaceVolumeViewport` | `lib/viewportGate.ts` | `deriveViewportGate(snapshot, volumeId)` → `ready` for the viewport hook | ✓ WIRED |
| `IsoThresholdSlider` | `applyIso` → `resolveVolumeActor` → `applySkinTF` → `viewport.render()` | rAF-coalesced, warns on both drop paths | ✓ WIRED — **the REND-02 silent no-op is closed** |
| `getRouteAccess('/face-recon/:jobId')` | `ROUTE_ACCESS['/face-recon']` | `review_results` @ reviewer | ✓ WIRED — **the archived PUBLIC-fallback warning is closed** |
| `useSkinVolumeViewport` | `lib/viewportResizeCalibration.ts` | `resizeAndProbe()` on both the setup and observer paths | ✓ WIRED |
| `JobRowActions.tsx` | `lib/approvedProjects.ts` | surface-side gate + `navigate('/face-recon/:jobId')` | ✓ WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Real data | Status |
|---|---|---|---|---|
| `FaceVolumeViewport` | `snapshot.{loadingState,loadPct,error}` | bridge store ← `useFaceVolume` CS3D events, **stamped with volumeId** | Yes, and now identity-scoped | ✓ FLOWING (stale-capable defect closed) |
| `FaceVolumeViewport` (canvas) | volume actor | `createAndCacheVolume` ← `useSeriesImageIds` ← DICOM-web wadouri | Yes — human-observed rendering a real head 2026-07-27 | ✓ FLOWING |
| `IsoThresholdSlider` | `isoHU` | local state → `applyIso` → live actor | Yes — human-observed moving the surface 2026-07-27 | ✓ FLOWING |
| `DeidEvidencePanel` | `tags`, `uidRows` | `useNormalizedTagsQuery` (project_id int) + pipeline `redact_value` | Yes; unmeasured tags now render "no pipeline record" | ✓ FLOWING |
| `resolveWorkspaceGate` | `decision` | job summary + eligibility verdict | Yes; fails closed on pending/error | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Feature suite | `yarn vitest run src/features/face-recon --reporter=basic` | **25 files, 440/440 passed** (5.16s) — was 46 at the archived report, 124 at 01-10, 137 after the iso fix | ✓ PASS |
| A test exercises the allowlist gate | `approvedProjects.test.ts` | 15 tests — **the archived "security-critical module untested" FAIL is closed** | ✓ PASS |
| A test exercises the full-load gate | `volumeLoadGate.test.ts` + `viewportGate.test.ts` | 14 + 7 tests — **the archived "the phase's central invariant is untested" FAIL is closed** | ✓ PASS |
| The consent gate refuses the URL-typing bypass | `workspaceGate.test.ts` | 21-case truth table, incl. the named bypass regression | ✓ PASS |
| The REND-02 actor-lookup regression is pinned | `volumeActorResolution.test.ts` | 13 tests; old `getActor(volumeId)` behavior asserted explicitly | ✓ PASS |
| `/face-recon` route RBAC | `npx vitest run src/lib/rbac/route-permissions.test.ts -t "face-recon"` | **5 passed / 29 skipped** | ✓ PASS |
| No new type errors in the feature | `npx tsc --noEmit \| grep -c "src/features/face-recon"` | **0** (240 pre-existing repo-wide, none in this feature) | ✓ PASS |
| Render / orbit / slider / geometry | n/a | Requires dev server + rdx-api + GPU — **already performed 2026-07-27**, see 01-10-SUMMARY | ✓ PASS (human) |
| `yarn validate:routing` | needs :3001 + creds | Never completed; Playwright binary now installed, creds still unset | ? SKIP → human verification |

### Probe Execution

No probes declared in any Phase 01 PLAN and no `scripts/*/tests/probe-*.sh` exists in this
repo. Step 7c: SKIPPED (no probes in scope).

### Requirements Coverage

All 9 phase requirement IDs are claimed across the plans (01-01: VOL-01, VOL-02, GUARD-03,
REND-01 · 01-02: REND-01, REND-03, VOL-02 · 01-03: VOL-03, REND-02 · 01-04: GUARD-01,
GUARD-02 · 01-05: VOL-03 · 01-06: GUARD-03 · 01-07: VOL-02, GUARD-01 · 01-08: VOL-02, VOL-03 ·
01-09: GUARD-01, GUARD-03, VOL-02, VOL-03 · 01-10: all 9). **No orphaned requirements.**

| Requirement | Source plans | Status | Evidence |
|---|---|---|---|
| VOL-01 | 01-01, 01-10 | ✓ SATISFIED | Jobs-row entry → `/face-recon/:jobId` → `useSeriesImageIds` → project-scoped wadouri imageIds. Human-verified 01-10. |
| VOL-02 | 01-01, 01-02, 01-07, 01-08, 01-09, 01-10 | ✓ SATISFIED | Aggregate gate + volumeId-scoped snapshot + single-owner session reset. Human-verified 01-10 Ckpt 2 crit. 2, Ckpt 3 items 4a/4b. **Was BLOCKED at the archived report.** |
| VOL-03 | 01-03, 01-05, 01-08, 01-09, 01-10 | ✓ SATISFIED (2 legs data-blocked) | Identity-bearing verdict; loader consumes exactly it; CT-bounded fallback. **Was BLOCKED.** Two live corroborations remain data-blocked — recorded, never counted as passes. |
| REND-01 | 01-01, 01-02, 01-10 | ✓ SATISFIED | A4 CONFIRMED by human observation 2026-07-27. **Was NEEDS HUMAN.** |
| REND-02 | 01-03, 01-10, 01-11 | ✓ SATISFIED | Failed human verification, root-caused (AND-gate), fixed at `7e3d53d`, human re-verified 2026-07-27. Band `−300..+200` agrees across code, ROADMAP SC4 and REQUIREMENTS, each carrying the measured-inert rationale and an explicit "do not restore −100". **Was NEEDS HUMAN.** |
| REND-03 | 01-02, 01-10 | ✓ SATISFIED | Orbit/zoom/pan + lit shading human-verified 01-10 Ckpt 2 crit. 6–7. **Was NEEDS HUMAN.** |
| GUARD-01 | 01-04, 01-07, 01-09, 01-10 | ✓ SATISFIED | Evidence panel stacks rather than hiding at any width (the archived `hidden lg:block` warning is closed). Squish degradation recorded 2026-08-05 and **lifted 2026-08-06** (`9a0b22b` + layout commits, 71 new tests). |
| GUARD-02 | 01-04, 01-10 | ✓ SATISFIED (against amended text) | Reconstructability-only copy plus a direct, mutation-checked prohibition on identification/accuracy/third-party-figure claims. Banner clause struck by operator 2026-08-06. **See WARN-01** — ROADMAP SC5 not amended to match. |
| GUARD-03 | 01-01, 01-06, 01-09, 01-10 | ✓ SATISFIED | Committed allowlist `[51]`, workspace gate failing closed on pending/error, route RBAC entry, surface-side action gate. Live-confirmed 01-10 Ckpt 3 item 1 with zero eligibility query fired. **Was BLOCKED.** |

REQUIREMENTS.md's `[x]` marks and "Complete" traceability rows for these 9 IDs — which the
archived report called premature for VOL-02, VOL-03 and GUARD-03 — are **now earned**.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/features/face-recon/**` | — | `TBD` / `FIXME` / `XXX` | ✓ none | Debt-marker gate passes; also zero `TODO` / `HACK` / `PLACEHOLDER` |
| `.planning/ROADMAP.md` | SC5 | Criterion still requires the struck banner | ⚠️ Warning | WARN-01 — roadmap contract names a component its own requirement deliberately removed |
| `.planning/…/01-CONTEXT.md` | D-05, D-07 | Superseded decisions with no supersession note | ⚠️ Warning | WARN-02 — a reader of CONTEXT alone gets the deleted banner and the inert HU band |
| `lib/skinTransferFunction.ts` | 32 | `DEFAULT_ISO_HU` docblock cites `-300..-100` | ℹ️ Info | WARN-03 — value correct, comment stale; known and deliberately out of scope |
| `src/lib/rbac/route-permissions.test.ts` | — | 2 stale `/admin/users` cases fail at baseline | ℹ️ Info | Pre-existing, documented in `deferred-items.md`; unrelated to this phase. The 5 `/face-recon` cases pass. |

Previously-listed anti-patterns now **closed**: the missing `/face-recon` `ROUTE_ACCESS` entry;
raw error objects reaching `logger` (now `safeErrorLabel` throughout); `scrubOutcome` with no
`unknown` branch; `hidden lg:block` on the evidence panel; and the stale
"lands in a later plan" comment in `useFaceVolume.ts`.

### Human Verification Required

Two items. Neither blocks the phase goal; both are honest loose ends.

**1. `yarn validate:routing` to completion**
- **Test:** Dev server on :3001, set `UI_VALIDATION_USERNAME` / `UI_VALIDATION_PASSWORD`, run the suite.
- **Expected:** Completes with no routing regressions.
- **Why human:** Owed since 01-06 and 01-09. 01-10's attempt returned 14 failed / 5 skipped from one environmental cause — the Playwright binary was absent and **no test body executed**. That binary is now present (`~/.cache/ms-playwright/chromium_headless_shell-1208`), so only the credentials and a running server remain.

**2. Bare `/face-recon` (no jobId) — one-line confirmation**
- **Test:** Navigate to `/face-recon` and record what renders.
- **Expected:** 404 catch-all — `config.tsx:611` registers only `face-recon/:jobId`.
- **Why human:** 01-10 recorded item 2c as "not separately observed" and flagged a STATE.md decision note as inaccurate as written. The behavior it describes (redirect + toast) is real but fires on a *non-numeric* jobId, which was confirmed. Cosmetic, but not something to infer.

### Gaps Summary

**No gaps.** All four gaps from 2026-07-24 are closed in the committed tree, verified
independently against the code rather than accepted from a SUMMARY:

1. **GUARD-03 is now enforced where it matters.** The archived report's most serious finding —
   "the access control is a hidden menu item" — no longer holds. `resolveWorkspaceGate` runs at
   the route, before the shell mounts and before any eligibility SQL, and refuses on a pending
   or errored summary rather than stepping over it. The doc blocks that once asserted an
   enforcement point that did not exist now describe one that does. Backed by a 21-case truth
   table, 15 consent tests, and an explicit `ROUTE_ACCESS` entry with a guard test that fails
   loudly if the entry is ever removed.
2. **VOL-02's "no partial faces, ever" now holds on every visit.** Not by remembering to call
   `reset()`, but by two independent controls: `key={jobId}` makes a job change a remount whose
   unmount cleanup is the entire session boundary, and `deriveViewportGate` scopes every derived
   flag on volume identity so a foreign snapshot simply cannot satisfy the gate. The stronger of
   the two survives a missed reset. Live-confirmed across two in-session visits *without a page
   reload* — including a genuinely failed first job, which the 2026-07-26 run could not arrange.
3. **VOL-03 approves and reconstructs the same object.** The verdict type now carries identity;
   `{eligible: true}` alone no longer type-checks; `resolveHeadCtSeries` is deleted repo-wide, so
   there is no second opinion left to disagree with. The fallback is bounded to series already
   positively read as CT, closing the borrowed-modality fail-open.
4. **The allowlist ships a real value.** `Object.freeze([51])` is committed at HEAD, the doc
   block's provenance matches, and the predicate reads the frozen array so a cast-and-mutate
   widening is a no-op.

**What deserves saying beyond the gap list.** REND-02 is the most instructive outcome in this
phase: a control that shipped in 01-03 was inert for seven plans behind 124 green tests, was
caught only when a human finally dragged it, and turned out to have *two* independently
sufficient causes — a cross-library key-contract mismatch and a spec number nobody had run the
arithmetic on. Both were fixed, the silent returns now warn, the regression is pinned by an
assertion of the old broken behavior, and the "do not restore −100" rationale is recorded at all
three sites so a future reader cannot cheaply undo it on textbook grounds. That is the phase's
strongest evidence that its verification chain works rather than merely reports.

The 2026-08-06 resize/layout session touched Phase 01 surfaces and **regressed nothing**; it
lifted GUARD-01's recorded degradation and removed one of the three squish triggers by floating
the mesh shelf over the canvas rather than beneath it. The banner deletion narrowed GUARD-02's
scope by operator decision, with the removed footnote's *rule* re-expressed as a direct,
mutation-checked prohibition rather than left to lapse — the right way to remove a guardrail.

Status is `human_needed` rather than `passed` for exactly two reasons, neither a defect:
`yarn validate:routing` has never completed, and one cosmetic route behavior was never
separately observed. Two VOL-03 corroborations remain **data-blocked** and are recorded as such
— not as passes, not as failures — preserving the honesty ROADMAP already applied to them.

---

_Verified: 2026-08-06_
_Verifier: Claude (gsd-verifier) — re-verification superseding 01-VERIFICATION-2026-07-24.archived.md_
