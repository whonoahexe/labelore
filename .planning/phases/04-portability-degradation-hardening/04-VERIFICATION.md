---
phase: 04-portability-degradation-hardening
verified: 2026-09-04T06:52:38Z
status: gaps_found
score: 6/8 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "One vocabulary spans all three surfaces: 'Warning' when the body survived, 'Unreadable' when nothing was salvageable, derived by a single shared function rather than three independent rules (D-12) — plan 04-03 must_have."
    status: failed
    reason: >
      tree.ts and search.ts both derive their badge/chip tone via the shared
      artifactWarningTone(warnings, bodyLength) function and correctly render 'Unreadable' when
      bodyLength === 0. artifact-page.tsx never calls artifactWarningTone at all — it hard-codes
      data-tone="warning" and the literal label "Warning" for both the header badge and the
      disclosure summary, for every warned artifact regardless of whether the body survived. The
      single-artifact server response (artifactResponse() in src/server/index.ts, used by both
      GET /api/artifacts/* and GET /api/documents) never forwards `bodyLength` on the artifact
      object, even though ArtifactDto (src/server/project-presentation.ts:135-139) already carries
      it for exactly this purpose — so the client cannot compute the real tone even if it tried.
      A user opening the one artifact whose body is completely unreadable sees the identical
      "Warning" badge as one that merely lost a frontmatter field. This is independently confirmed
      against the code (not merely taken from 04-REVIEW.md's CR-01): grep for `artifactWarningTone`
      and `bodyLength` across src/server/index.ts and src/web/pages/artifact-page.tsx returns zero
      matches in either file.
    artifacts:
      - path: "src/server/index.ts"
        issue: "artifactResponse() (lines 77-101) omits bodyLength from the returned artifact object"
      - path: "src/web/pages/artifact-page.tsx"
        issue: "Lines 369-373 and 394-400 hard-code data-tone=\"warning\"/\"Warning\" and never import or call artifactWarningTone; no branch ever renders \"Unreadable\" on this page"
    missing:
      - "Forward lookup.artifact.bodyLength in artifactResponse()'s returned artifact object"
      - "Import artifactWarningTone in artifact-page.tsx and use it to choose data-tone/label at both the header badge and the disclosure summary"
      - "A test asserting the \"Unreadable\" branch is reachable on the artifact page (the current degradation-ui-contract.test.ts assertion at lines 47-48 only proves \"Warning\" is reachable there)"
  - truth: "A successful refresh replaces the presentation, artifact index, reference registry and search index together in one assignment; no response ever mixes fields from two different snapshots (D-05) — plan 04-01 must_have."
    status: failed
    reason: >
      Verified independently against src/server/index.ts. GET /api/artifacts/* and GET
      /api/documents each compute `lookup` synchronously from the live `derived.artifactIndex` at
      call time, then pass `lookup` into the async `artifactResponse()` helper, which itself reads
      the live module-level `derived.referenceRegistry` binding after an `await` (`await renderer`
      then `.render()`). Because `derived` is a single mutable `let` reassigned in one line inside
      POST /api/refresh (`derived = buildDerivedViews()`), a refresh that completes on another
      connection between the synchronous `lookup` computation and the later `derived.referenceRegistry`
      read causes that one response to combine `lookup.artifact` from the pre-refresh artifact index
      with `referenceRegistry` from the post-refresh bundle — contradicting the must-have's literal,
      unconditional wording. This does not crash or lose data (worst case: stale/missing
      cross-reference links in one response) and is not exercised by any existing test —
      test/server/refresh.test.ts's concurrency test only proves two concurrent POST /api/refresh
      calls converge on one readAt, not that a GET racing a concurrent refresh reads one consistent
      bundle throughout its lifecycle. Matches 04-REVIEW.md's WR-01, confirmed here directly against
      the source rather than taken on the review's word.
    artifacts:
      - path: "src/server/index.ts"
        issue: "artifactResponse() (lines 77-101) reads the live `derived` binding a second time inside an async function instead of receiving the bundle captured at the start of the request"
    missing:
      - "Capture `derived` once per request (e.g. `const activeDerived = derived;`) in the /api/artifacts/* and /api/documents handlers and thread it through artifactResponse() instead of re-reading the module-level binding mid-request"
deferred: []
human_verification: []
---

# Phase 4: Portability & Degradation Hardening Verification Report

**Phase Goal:** The dashboard is proven to work on any GSD project — sparse, unfamiliar, partly broken, or not a GSD project at all — and never shows data whose age it cannot state.
**Verified:** 2026-09-04T06:52:38Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Sparse (`sparse-started`) and dense fixtures both render as complete, navigable dashboards; unrecognized artifact type appears in navigation and renders as plain markdown | ✓ VERIFIED | `test/portability.test.ts` drives the real `createApp` + `PlanningRepository` against `fixtures/sparse-empty`, `fixtures/sparse-started`, `fixtures/dense` over every route (`/api/presentation`, `/api/dashboard`, `/api/roadmap`, `/api/history`, `/api/tree`, `/api/traceability`, `/api/search?q=phase`), asserting HTTP 200 for each. `TGT-05` test explicitly resolves `.planning/v3.0-CAPACITY-PLAN.md` and `.planning/HANDOFF.json` (unrecognized kinds) through the tree and `/api/documents`, asserting a navigable URL and non-empty rendered HTML. `tree.ts:182` sets `unknownKind: artifact.kind === 'unknown'` on every such leaf. |
| 2 | Removing `quick/`, `milestones/`, `research/`, `UI-SPEC.md`, `SECURITY.md` produces an honest empty state in the affected view and leaves every other view untouched, never an error page | ✓ VERIFIED | `test/portability.test.ts` ("produces empty states, never an error page... (TGT-04)") removes all five and asserts every route still 200s, no leaf names a deleted `UI-SPEC.md`/`SECURITY.md`, and every optional location group (`quick`, `milestone-root`, `archived-phase`, `research`) still appears in the tree with zero matching leaves. `EmptyState`/`EMPTY_STATE_MESSAGE` (`src/web/components/empty-state.tsx`) is imported and rendered at 8 call sites across `roadmap-page.tsx`, `traceability-page.tsx`, `artifact-page.tsx`. |
| 3 | A file with deliberately corrupted YAML degrades only its own view; every other page still renders and the app does not crash | ✓ VERIFIED (D-10/D-11/D-13); ✗ FAILED (D-12, see gap) | `test/presentation/search.test.ts` and `test/presentation/tree.test.ts` prove per-artifact isolation and rank-independence (D-13, `warningTone` never affects sort order). D-12's "one shared vocabulary across all three surfaces" is violated on the artifact page — see gaps. |
| 4 | Starting against a nonexistent path, or a directory with no `.planning/`, shows a message naming the problem and the exact path that was checked | ✓ VERIFIED | `src/web/pages/invalid-project-screen.tsx` renders `loadStatus.message` verbatim and a copyable `pathChecked` (plus `rawPath` when it differs). `app-router.tsx`'s `ProjectGate` gates the entire routed tree — no `<Outlet/>` mounts on a non-ok `loadStatus`, so nav/search/tree are structurally absent (D-14). `test/target-path.test.ts` and `test/web/invalid-project-contract.test.ts` cover the resolver and screen contract. |
| 5 | Every view states when its data was read from disk, and a Refresh action re-reads the project through the same `refresh()` seam a future file watcher will call | ✓ VERIFIED (D-01–D-04); ⚠️ Partial (D-05, see gap) | `app-shell.tsx` renders `formatReadAt(presentation.data.readAt)` beside `RefreshControl` in the global header on every route; `RefreshControl` calls `POST /api/refresh`, which calls `source.refresh.bind(source)` → `PlanningRepository.refresh()`. `test/server/refresh.test.ts` proves the seam, the empty-source 200 path, and readAt-equal coalescing for concurrent POSTs. D-05's *general* "no response ever mixes fields from two different snapshots" claim is violated for `/api/artifacts/*` and `/api/documents` under a narrower race than the tested one — see gap. |

**Score:** 6/8 must-haves verified (2 plan-declared must-haves — both concerning cross-request/cross-surface consistency guarantees — fail on direct code inspection)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/server/index.ts` | `POST /api/refresh` + single derived-views bundle | ✓ VERIFIED (wired) / ⚠️ atomicity gap | Route present, coalescing present; `artifactResponse()` re-reads live `derived` mid-request (gap above) and omits `bodyLength` (gap above) |
| `src/web/components/refresh-control.tsx` | Header Refresh control, first `useMutation` | ✓ VERIFIED | `useMutation`, disables on pending, unconditional `invalidateQueries()`, error toast with fixed string |
| `src/web/components/ui/toast.tsx` | Toast provider/portal/viewport/root | ✓ VERIFIED | Present and wired into `app-shell.tsx`; IN-01 (unconditional `data-tone="destructive"`) is real but not tied to any must-have — informational only |
| `src/web/components/app-shell.tsx` | "Refreshing…" status swap, single `ToastProvider` mount | ✓ VERIFIED | `snapshot-status` slot swaps in place; no layout shift markup change observed |
| `src/web/pages/invalid-project-screen.tsx` | Whole-app failure screen | ✓ VERIFIED | Exactly heading + detail + path field(s) + restart command; theme toggle retained |
| `src/web/app-router.tsx` | Presentation-gated root | ✓ VERIFIED | `ProjectGate` branches between `InvalidProjectScreen` and `AppShell`; no double-fetch (`fetchPresentation` reused, same query key) |
| `src/presentation/artifact-warning-tone.ts` | Single tone derivation | ✓ VERIFIED, substantive | Pure function, `bodyLength`-driven split |
| `src/presentation/tree.ts` / `src/presentation/search.ts` | `warningTone` carried on leaf/row | ✓ VERIFIED, wired to shared function | Both import and call `artifactWarningTone` |
| `src/web/pages/artifact-page.tsx` | D-10/D-11 badge + disclosure using shared tone | ✗ PARTIAL — D-10/D-11 present, D-12 (shared function) not wired | See gap above |
| `src/web/components/empty-state.tsx` | Single generic empty state | ✓ VERIFIED | `EMPTY_STATE_MESSAGE = 'Nothing here yet.'`, `inline`/`block` variants, muted icon, no accent color |
| `test/portability.test.ts` | Adversarial three-fixture + stripped + unknown-type proof | ✓ VERIFIED | Mounts fixtures via `mkdtemp`+`cp`, never mutates `fixtures/` (asserted by its own self-source regex check and a before/after `listTree` diff) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `refresh-control.tsx` | `src/server/index.ts` | `fetch POST /api/refresh` | ✓ WIRED | `postRefresh()` fetches, `useMutation` drives it |
| `refresh-control.tsx` | TanStack Query cache | `invalidateQueries()` | ✓ WIRED | Unconditional, in `onSuccess` |
| `src/server/index.ts` | `PlanningRepository.refresh()` | `source.refresh.bind(source)` | ✓ WIRED | Bound before call; empty-source path returns 200 with `refreshed:false` |
| `app-router.tsx` | `app-shell.tsx` | shared `fetchPresentation`/`['presentation']` query key | ✓ WIRED | One fetch, not two — confirmed by shared import |
| `invalid-project-screen.tsx` | `src/cli/target-path.ts` | renders `loadStatus.message` verbatim | ✓ WIRED | No re-derivation found |
| `src/presentation/tree.ts` → `artifact-warning-tone.ts` | shared derivation | `artifactWarningTone(artifact)` | ✓ WIRED | line 183 |
| `src/presentation/search.ts` → `artifact-warning-tone.ts` | shared derivation | `artifactWarningTone(artifact)` | ✓ WIRED | line 88 |
| `src/web/pages/artifact-page.tsx` → `artifact-warning-tone.ts` | shared derivation | *(required by D-12, not present)* | ✗ NOT WIRED | No import of `artifact-warning-tone.ts` anywhere in `artifact-page.tsx` |
| `src/server/index.ts` (`artifactResponse`) → `derived` snapshot | single bundle per request | *(required by D-05)* | ✗ NOT WIRED (race) | `derived` is re-read live at a second async point rather than the bundle captured at request start |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `npx vitest run` | 36 files, 533 tests, all passed | ✓ PASS |
| CR-01 claim (artifact page never renders "Unreadable") | `grep -n "artifactWarningTone\|bodyLength" src/web/pages/artifact-page.tsx src/server/index.ts` | zero matches in either file | ✓ CONFIRMS gap |
| Degradation contract test only proves "Warning" reachable on artifact page | `grep -n "Unreadable\|Warning\|data-tone" test/web/degradation-ui-contract.test.ts` | line 47-48 asserts only `data-tone="warning"` / `Warning` text for the page-level check; `Unreadable` string only asserted against `tree`/`search` *source text*, not the artifact page | ✓ CONFIRMS gap |
| D-13 rank-independence | `grep -n "D-13" test/presentation/search.test.ts` | named test present and included in the 533 passing | ✓ PASS |
| Refresh coalescing (both-POST concurrency) | `test/server/refresh.test.ts` "coalesces two concurrent calls..." | included in the 533 passing | ✓ PASS (narrower race not covered — see gap) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| TGT-03 | 04-04 | Dashboard renders correctly regardless of phase/milestone count or config toggles | ✓ SATISFIED | `test/portability.test.ts` three-fixture route sweep + NaN/Infinity precision test |
| TGT-04 | 04-04 | Missing optional artifact/directory → honest empty state, never error page | ✓ SATISFIED | Stripped-fixture test + `EmptyState` component, 8 call sites |
| TGT-05 | 04-04 | Unrecognized artifact type stays navigable, renders as plain markdown | ✓ SATISFIED | Named test against `dense` fixture's unknown-kind files |
| TGT-06 | 04-03 | Malformed file isolated to its own view, no crash | ✓ SATISFIED overall; D-12 sub-requirement (shared vocabulary) not fully met (see gap) | `artifact-warning-tone.ts` shared by 2 of 3 required surfaces |
| TGT-07 | 04-02 | Invalid path shows message naming problem + exact path | ✓ SATISFIED | `InvalidProjectScreen`, `ProjectGate`, resolver tests |
| TGT-08 | 04-01 | Every view states read time; Refresh re-reads through the same seam | ✓ SATISFIED overall; D-05 atomicity sub-claim not fully met under a narrower race than what's tested (see gap) | `refresh-control.tsx`, `app-shell.tsx`, `test/server/refresh.test.ts` |

No orphaned requirements: all six `TGT-03..TGT-08` IDs from `REQUIREMENTS.md` (lines 18-23, 153-158) appear in exactly one plan's `requirements:` frontmatter each (04-01→TGT-08, 04-02→TGT-07, 04-03→TGT-06, 04-04→TGT-03/04/05).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/web/components/ui/toast.tsx` | 24-38 | Unconditional `data-tone="destructive"` regardless of `toast.type` | ℹ️ Info | Matches 04-REVIEW.md IN-01; not tied to a phase must-have, latent footgun for a future non-error toast producer |

No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` debt markers found in any file modified by this phase (one match for the `placeholder="..."` form-input attribute in `traceability-page.tsx`, which is not a debt marker).

### Gaps Summary

Two plan-declared must-haves fail on direct inspection of the current code, independent of and cross-confirmed against 04-REVIEW.md's CR-01/WR-01 findings — I did not take the review's word for either; both were re-derived here from `grep`/source reads:

1. **D-12 (plan 04-03, blocking):** The phase's own headline "one shared Warning/Unreadable vocabulary across the artifact badge, the tree indicator, and the search chip" is wired on 2 of 3 surfaces. `artifact-page.tsx` hard-codes the "Warning" tone/label unconditionally and the server-side single-artifact response doesn't even carry the `bodyLength` field the shared `artifactWarningTone()` function needs. A completely unreadable artifact is visually indistinguishable from a lightly-damaged one on the one page a user would open to find out. This is a genuine, user-visible degradation-hardening gap in a phase whose stated goal is exactly this kind of legibility.

2. **D-05 (plan 04-01, non-blocking but real):** The atomic-swap guarantee ("no response ever mixes fields from two different snapshots") holds for the tested case (concurrent `POST /api/refresh` calls converging on one `readAt`) but not for the broader, literal claim: a `GET /api/artifacts/*` or `GET /api/documents` request racing a concurrent refresh can serve a response combining pre-refresh `artifactIndex` data with post-refresh `referenceRegistry` data, because `artifactResponse()` re-reads the live module-level `derived` binding at a second `await` point instead of using the bundle captured when the request started. Narrow window, no crash, no data loss — but it contradicts the must-have's unconditional wording and is untested.

Both gaps are precise, small, mechanical fixes (forward `bodyLength` + call the existing shared function; capture `derived` once per request) — the same fixes 04-REVIEW.md already proposes for CR-01/WR-01. WR-02 (duplicated `buildDerivedViews()` work on concurrent refresh) and IN-01 (toast tone) are real but do not violate any phase must-have as literally stated and are not included as gaps here; they remain visible in 04-REVIEW.md for follow-up.

The remaining 6 of 8 must-haves — including all of TGT-03, TGT-04, TGT-05, TGT-07, and the bulk of TGT-06 and TGT-08 — are genuinely, substantively implemented and covered by real tests exercising the actual server and fixtures, not just source-text pattern matches.

---

_Verified: 2026-09-04T06:52:38Z_
_Verifier: Claude (gsd-verifier)_
