---
phase: 04-portability-degradation-hardening
reviewed: 2026-09-03T23:54:57Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - src/presentation/artifact-warning-tone.ts
  - src/presentation/search.ts
  - src/presentation/tree.ts
  - src/server/index.ts
  - src/server/project-presentation.ts
  - src/web/app-router.tsx
  - src/web/components/app-shell.tsx
  - src/web/components/empty-state.tsx
  - src/web/components/refresh-control.tsx
  - src/web/components/tree-navigator.tsx
  - src/web/components/ui/toast.tsx
  - src/web/pages/artifact-page.tsx
  - src/web/pages/dashboard-page.tsx
  - src/web/pages/invalid-project-screen.tsx
  - src/web/pages/roadmap-page.tsx
  - src/web/pages/search-page.tsx
  - src/web/pages/traceability-page.tsx
  - src/web/styles/globals.css
  - test/portability.test.ts
  - test/presentation/roadmap.test.ts
  - test/presentation/search.test.ts
  - test/presentation/tree.test.ts
  - test/rendering/plan-sections.test.ts
  - test/rendering/references.test.ts
  - test/server/project-presentation.test.ts
  - test/server/refresh.test.ts
  - test/target-path.test.ts
  - test/web/degradation-ui-contract.test.ts
  - test/web/empty-state-contract.test.ts
  - test/web/invalid-project-contract.test.ts
  - test/web/refresh-contract.test.ts
  - test/web/visual-contract.test.ts
findings:
  critical: 1
  warning: 2
  info: 1
  total: 4
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-09-03T23:54:57Z
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

Phase 4 adds `POST /api/refresh` with an atomic derived-view swap, a `ProjectGate` above the app
shell for invalid-project handling, a shared damaged-artifact "Warning"/"Unreadable" tone
(`artifactWarningTone()`), a shared `EmptyState` component, and an adversarial portability test
suite. The refresh contract, invalid-project screen, and empty-state unification are each
well-covered by source-text contract tests and behave as documented.

The one substantive defect found is that the phase's own headline feature — a single shared
Warning/Unreadable vocabulary spanning "the artifact badge, the tree indicator, and the search
chip" (the exact phrase used in both `tree-navigator.tsx`'s doc comment and the
`degradation-ui-contract.test.ts` test title) — was only wired up on two of the three surfaces.
`artifact-page.tsx` still hard-codes `data-tone="warning"` / the label `"Warning"` and never
renders `"Unreadable"`, and the server-side DTO it consumes doesn't even carry the `bodyLength`
field needed to compute the real tone. A user opening the one document whose body is *completely*
unreadable sees the same badge as a document that merely lost some frontmatter but kept its body —
directly contradicting this phase's degradation-hardening goal.

Two further issues affect the new `POST /api/refresh` atomic-swap machinery: a narrow but real
race window where a single request can render with fields from two different `derived` bundles,
and concurrent refreshes redoing full view-derivation work that the code's own comments claim is
coalesced.

## Critical Issues

### CR-01: Artifact page never renders the "Unreadable" tone — the D-12 shared vocabulary is incomplete

**File:** `src/web/pages/artifact-page.tsx:369-373,394-400`
**Issue:**

Both `tree-navigator.tsx` and `search-page.tsx` derive their damaged-artifact badge from the
shared `artifactWarningTone()` split (`'warning'` when the body survived, `'unreadable'` when
nothing did — see `src/presentation/artifact-warning-tone.ts`). `tree-navigator.tsx`'s own doc
comment states this is "the tree half of the shared Warning/Unreadable vocabulary — same tones and
labels as the artifact-page badge and the search-page chip," and
`test/web/degradation-ui-contract.test.ts` is titled exactly "one Warning/Unreadable vocabulary
spans the artifact badge, the tree indicator, and the search chip (D-12)."

`artifact-page.tsx`, however, never computes a tone at all. It hard-codes:

```tsx
const hasWarnings = artifact.warnings.length > 0 || document.warnings.length > 0;
...
{hasWarnings ? (
  <span className="status-chip" data-tone="warning">
    Warning
  </span>
) : null}
```

for both the header badge and the disclosure summary. There is no branch that ever renders
`data-tone="destructive"` / the label `"Unreadable"` on this page — a document whose body is
completely unrecoverable (`bodyLength === 0`, `artifactWarningTone()` would return `'unreadable'`
on the tree/search rows for the exact same artifact) shows the identical "Warning" badge as a
document that merely lost one piece of frontmatter but rendered normally otherwise.

This isn't just a missed style tweak — it's structurally impossible to fix client-side as written,
because the server never sends the data needed. `artifactResponse()` in `src/server/index.ts`
builds the artifact object for `/api/documents` and `/api/artifacts/*` without `bodyLength`:

```ts
artifact: {
  id: lookup.artifact.id,
  path: lookup.artifact.path,
  kind: lookup.artifact.kind,
  title: lookup.artifact.title,
  frontmatter: jsonRecord(lookup.artifact.frontmatter),
  structured: jsonRecord(lookup.artifact.structured),
  warnings: lookup.artifact.warnings,
},
```

`ArtifactDto` (the shape the tree/search DTOs use) *does* carry `bodyLength` for exactly this
purpose (see `src/server/project-presentation.ts:135-139`), but the single-artifact document
response never forwards it, so `artifactWarningTone()` cannot be called from `artifact-page.tsx`
even if it imported it.

Given this phase is specifically "portability & degradation hardening," and the reviewed test only
asserts that `data-tone="warning"` and the text `"Warning"` are present (never asserting the
`"Unreadable"` branch is reachable on this page — see the assertions in
`degradation-ui-contract.test.ts`), the gap slipped past the test suite.

**Fix:**

Forward `bodyLength` in the single-artifact response and compute the same shared tone client-side:

```ts
// src/server/index.ts — artifactResponse()
artifact: {
  id: lookup.artifact.id,
  path: lookup.artifact.path,
  kind: lookup.artifact.kind,
  title: lookup.artifact.title,
  frontmatter: jsonRecord(lookup.artifact.frontmatter),
  structured: jsonRecord(lookup.artifact.structured),
  warnings: lookup.artifact.warnings,
  bodyLength: lookup.artifact.bodyLength,
},
```

```tsx
// src/web/pages/artifact-page.tsx
import { artifactWarningTone } from '../../presentation/artifact-warning-tone.ts';
...
const warningTone = artifactWarningTone({
  warnings: artifact.warnings,
  bodyLength: /* forwarded field, or fall back to document.empty ? 0 : 1 */,
});
...
{warningTone ? (
  <span className="status-chip" data-tone={warningTone === 'unreadable' ? 'destructive' : 'warning'}>
    {warningTone === 'unreadable' ? 'Unreadable' : 'Warning'}
  </span>
) : null}
```

and add a test asserting the `"Unreadable"` branch is actually reachable on this page (the current
contract test only proves `"Warning"` is reachable).

## Warnings

### WR-01: `artifactResponse()` can mix artifact-index and reference-registry state across a concurrent refresh

**File:** `src/server/index.ts:77-101,155-191`
**Issue:**

The module comment states the D-05 invariant plainly: "every read handler serves from one of
these bundles, built together from a single snapshot, and replaced together in one assignment —
never mutated field by field." In practice, a single request does *not* read one consistent
`derived` snapshot — it reads the live module-level `derived` binding at two separate points in
its async lifecycle:

```ts
app.get('/api/artifacts/*', async (c) => {
  ...
  const lookup = derived.artifactIndex.lookup(route.route.artifactPath);   // read #1
  if (!lookup.found) return c.json(lookup, 404);
  return c.json(await artifactResponse(lookup));                          // reads derived.referenceRegistry inside, read #2
});
```

```ts
const artifactResponse = async (lookup: ...) => {
  if (!lookup.found) return lookup;
  const document = await (await renderer).render(lookup.artifact, {
    referenceRegistry: derived.referenceRegistry,   // live read, not the same `derived` as the lookup above
  });
  ...
};
```

If a `POST /api/refresh` completes on another connection between "read #1" and "read #2" (both
awaits give the event loop a chance to run the refresh handler's synchronous
`derived = buildDerivedViews()` reassignment), the response for this request is rendered with
`lookup.artifact` from the *old* artifact index but `referenceRegistry` from the *new* bundle.
Worst case this produces subtly wrong/missing cross-reference links in the rendered document for
that one response; it does not crash or leak data, but it is a genuine violation of the atomicity
this code's own comments promise, and the race widens under real refresh traffic (e.g. a file
watcher in a later phase).

**Fix:** Capture the bundle once per request and thread it through instead of re-reading the
module-level `derived` binding mid-request:

```ts
app.get('/api/artifacts/*', async (c) => {
  const activeDerived = derived;
  ...
  const lookup = activeDerived.artifactIndex.lookup(route.route.artifactPath);
  if (!lookup.found) return c.json(lookup, 404);
  return c.json(await artifactResponse(lookup, activeDerived));
});

const artifactResponse = async (
  lookup: ReturnType<DerivedViews['artifactIndex']['lookup']>,
  activeDerived: DerivedViews,
) => {
  if (!lookup.found) return lookup;
  const document = await (await renderer).render(lookup.artifact, {
    referenceRegistry: activeDerived.referenceRegistry,
  });
  ...
};
```

Apply the same pattern to the `/api/documents` handler.

### WR-02: Concurrent `POST /api/refresh` calls duplicate the full view-derivation and search-index build, not just the filesystem walk

**File:** `src/server/index.ts:214-236`
**Issue:**

The coalescing comment claims: "coalesce concurrent refreshes into one in-flight filesystem walk —
N simultaneous callers await the same promise rather than each starting their own rebuild." The
`inFlight` promise does correctly coalesce the call into `source.refresh()` (the filesystem walk),
but each caller that was awaiting `inFlight` independently calls `buildDerivedViews()` again after
it resolves:

```ts
if (!inFlight) {
  inFlight = refresh().finally(() => { inFlight = null; });
}
const snapshot = await inFlight;
derived = buildDerivedViews();   // <-- runs once per concurrent caller, not once per refresh
```

`buildDerivedViews()` is not free: it rebuilds `toProjectPresentation`, `buildArtifactIndex`,
`buildReferenceRegistry`, and schedules a full MiniSearch rebuild via `searchIndexState.buildFrom`.
Two overlapping `POST /api/refresh` calls (e.g. a user double-clicking the refresh control, or two
browser tabs open on the same server) trigger two full rebuilds of all four derived views and two
MiniSearch index builds, even though only one filesystem read happened. The final result is still
correct (both rebuilds are built from the same resolved snapshot), so this is not a correctness
bug, but it directly contradicts the "one in-flight ... rather than each starting their own
rebuild" framing and wastes real CPU work on every concurrent refresh.

**Fix:** Coalesce the rebuild the same way the filesystem walk is coalesced — memoize the
`buildDerivedViews()` call inside the same `inFlight`-guarded block so it also runs once per
refresh cycle, e.g. by having `inFlight` resolve to the already-built `DerivedViews` bundle instead
of the raw snapshot:

```ts
if (!inFlight) {
  inFlight = refresh()
    .then((snapshot) => {
      derived = buildDerivedViews();
      return snapshot;
    })
    .finally(() => { inFlight = null; });
}
const snapshot = await inFlight;
```

## Info

### IN-01: `Toast` tone is unconditionally `"destructive"` regardless of `toast.type`

**File:** `src/web/components/ui/toast.tsx:24-38`
**Issue:** `ToastList` renders every toast with `data-tone="destructive"` regardless of the
toast's own `type` field:

```tsx
{toasts.map((toast) => (
  <Toast.Root key={toast.id} toast={toast} className="toast" data-tone="destructive">
```

The comment acknowledges this is fine "today" because the refresh-failure toast is the only
producer, but the hard-coded tone means any future non-error toast (a success/info toast, say)
would silently inherit the destructive styling with no compile-time or test signal to catch it.
**Fix:** Derive the tone from `toast.type` (e.g. `data-tone={toast.type === 'error' ? 'destructive' : 'quiet'}`)
now, while there is only one call site to update, rather than leaving a footgun for the next toast
producer.

---

_Reviewed: 2026-09-03T23:54:57Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
