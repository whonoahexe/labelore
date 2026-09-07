---
phase: 04-portability-degradation-hardening
reviewed: 2026-09-07T00:00:00Z
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
  - test/server/artifact-response.test.ts
  - test/server/derived-snapshot-isolation.test.ts
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
  warning: 1
  info: 1
  total: 3
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-09-07
**Depth:** standard
**Files Reviewed:** 32 (full-phase re-review, superseding the prior 04-01..04-04-scoped report at this path)
**Status:** issues_found

## Summary

This is a full-phase re-review covering all of 04-01 through 04-05, with particular attention paid
to the 04-05 gap-closure commits per the review brief: the D-05 single-bundle-capture fix in
`src/server/index.ts`, and the `bodyLength` forwarding / shared `artifactWarningTone()` wiring on
the artifact page.

**The D-05 snapshot-capture fix is correct.** I traced every async handler in `createApp()`
(`GET /api/artifacts/*`, `GET /api/documents`, `POST /api/refresh`) line by line. Both
artifact-serving handlers now capture `const activeDerived = derived` as their first statement,
before any `await`, and thread that single bundle through `artifactResponse(lookup, activeDerived)`,
which reads only the parameter — never the module-level `derived` binding — for the reference
registry used after the `await renderer.render(...)` call. Every other route handler in this file
(`/api/presentation`, `/api/dashboard`, `/api/roadmap`, `/api/history`, `/api/tree`,
`/api/traceability`, `/api/search`) is fully synchronous with no `await` in its body, so there is no
window in which a concurrent refresh's reassignment of `derived` could split a single response
across two snapshots. `test/server/derived-snapshot-isolation.test.ts` exercises the real race and
passes; `npm run typecheck` and the full relevant test suite (404 tests across 28 files) pass clean.

Digging past the mechanically-verified parts, I found one genuine content-correctness bug that
undercuts this phase's own stated goal (D-12: let a user distinguish "damaged but readable" from
"nothing salvageable"), and one reproducible logic bug in the pre-existing snippet-extraction code
that this phase's search rows depend on. Both are demonstrated below with a concrete reproduction,
not just an inspection claim.

## Critical Issues

### CR-01: The warning-disclosure copy contradicts the "Unreadable" badge it sits under

**File:** `src/web/pages/artifact-page.tsx:412-415`

**Issue:** D-12 (04-03) introduced a two-tier vocabulary — `'warning'` ("damaged but the body
survived and is shown normally") vs `'unreadable'` ("nothing survived") — specifically so a user can
tell those two situations apart. The disclosure body that appears under *both* badge variants,
however, is one hardcoded, unconditional sentence:

```tsx
{warningTone ? (
  <details className="artifact-metadata artifact-warning-disclosure">
    <summary>
      <span className="status-chip" data-tone={warningTone === 'unreadable' ? 'destructive' : 'warning'}>
        {warningTone === 'unreadable' ? 'Unreadable' : 'Warning'}
      </span>
    </summary>
    <div className="metadata-panels warning-disclosure-body" aria-label="Warning details">
      <p>
        Some of this document's structured metadata could not be read. The document text below was recovered and is shown normally.
      </p>
      ...
```

This is reachable and wrong in two concrete, traceable ways:

1. **The `'unreadable'` case (bodyLength === 0).** `artifactWarningTone()` returns `'unreadable'`
   exactly when `bodyLength === 0` (`src/presentation/artifact-warning-tone.ts:14`), and
   `bodyLength` is `body.length` from the domain layer
   (`src/planning-repo/registry.ts:52`, `src/planning-repo/assemble.ts:45`). An empty body
   renders to empty HTML, so `RenderedDocument.empty` (`html.trim().length === 0`,
   `src/rendering/markdown.ts:403`) is *always* true whenever `warningTone === 'unreadable'`. That
   means `DocumentView` will render its own, contradicting message directly below the disclosure:
   `"This artifact has structured metadata but no authored body."`
   (`src/web/pages/artifact-page.tsx:285`). The disclosure claims the text "below was recovered and
   is shown normally" in the exact case where the page immediately below it says there is no text
   at all. A user hitting a genuinely unreadable file — precisely the scenario this phase built the
   "Unreadable" badge to call out — gets two contradictory explanations on the same screen.

2. **The document-only-warning case.** The tone is computed from the union of `artifact.warnings`
   and `document.warnings` (`artifact-page.tsx:355-358`), and `document.warnings` is populated for
   purely rendering-time issues unrelated to structured metadata (e.g. an oversized Mermaid diagram,
   `src/rendering/markdown.ts:170-174`). In that case `artifact.warnings` can be empty while
   `document.warnings` is not — the badge and disclosure still render (by design, per the D-10
   comment at `artifact-page.tsx:352-354`), but the hardcoded sentence "Some of this document's
   structured metadata could not be read" is false: nothing about the structured metadata failed.

`test/web/degradation-ui-contract.test.ts` only pins that this sentence is *generic* (single
sentence, not branched per `WarningStage`) — it does not, and given the current implementation
cannot, assert that the sentence is *accurate* for both tones and both trigger sources. Fixing this
does not require branching per parser stage (which D-11 correctly rejects); it requires branching
the summary sentence on `warningTone` (and optionally on whether the trigger was structural vs.
rendering), e.g.:

**Fix:**
```tsx
<p>
  {warningTone === 'unreadable'
    ? "This document's content could not be recovered. Its structured metadata, and the body text below, could not be read."
    : "Some of this document's structured metadata could not be read. The document text below was recovered and is shown normally."}
</p>
```

## Warnings

### WR-01: `extractSnippets` can emit two search-result snippets with overlapping, mid-word-truncated text

**File:** `src/presentation/search.ts:385-408` (window construction inside `extractSnippets`)

**Issue:** The module's own docstring (`search.ts:353-359`) states the intent: occurrences that
"overlap or abut inside one window... merge into a single window... rather than producing separate
near-duplicate snippets." The implementation only merges occurrences that land inside the *same*
window (tested by `search.test.ts`'s Test 6). It does not check whether two *different* windows'
raw text ranges overlap once both occurrences become independent seeds. When two matched-term
occurrences are farther apart than `windowChars / 2` (so neither's window fully contains the other's
occurrence) but closer together than `windowChars`, their two windows still overlap in text.

I reproduced this directly against the real function:

```
body = 900 chars + "FIRSTMATCH" (900-910) + 75 'y' chars + "SECONDMATCH" (985-996) + 200 'z' chars
extractSnippets(body, ['firstmatch', 'secondmatch'])
```

produces:
```
snippet 1: bodyOffset 820, text ends "...yyyyyyyyyyyyyyySECON"   (mid-word-truncated, unhighlighted)
snippet 2: bodyOffset 905, text starts "MATCHyyyyyyyyyyyyyyy..."  (mid-word-truncated, unhighlighted)
```

Both search-result snippet cards for this row would display the same run of 85 characters of body
text (positions 905-990), and each snippet additionally shows a plain-text, unhighlighted fragment
of the *other* snippet's match term cut off mid-word ("SECON" / "MATCH") with no visual indication
it's a fragment. This is exactly the "separate near-duplicate snippets" the docstring says this
function avoids — it just isn't reachable through Test 6's same-window construction, because Test 6
only exercises occurrences close enough to land in one window.

**Fix:** After selecting a window for a seed, either (a) also consume any *unconsumed* occurrence
whose own window would overlap the just-built window (not just occurrences inside the built window),
or (b) clip window boundaries so adjacent accepted windows never overlap (e.g. cap `windowEnd` at
the midpoint between this seed and the next unconsumed seed). Either approach should be pinned with
a test using two occurrences spaced in the `(windowChars/2, windowChars)` gap — the exact case this
review's reproduction used, which the existing Test 6 does not cover.

## Info

### IN-01: Duplicate CSS rule bodies for `data-tone='warning'` and `data-tone='destructive'`

**File:** `src/web/styles/globals.css:2868-2882`

**Issue:** `.status-chip[data-tone='destructive']` and `.status-chip[data-tone='warning']` declare
byte-identical rule bodies (same `border-color`/`background`/`color` formula against
`var(--destructive)`). The adjacent comment explains this is deliberate — a separate selector "so a
future genuinely-destructive action is never silently retoned by a CSS rename" — so this is not a
functional bug, but it is a literal duplication that will drift silently if one rule is edited
without the other (there is no shared custom property or `@layer` composition tying them together).

**Fix:** Not required to ship. If revisited, consider defining a shared `--tone-destructive-*`
custom-property triplet that both selectors reference, preserving the two independent selectors
(for the stated future-proofing reason) while removing the duplicated literal values.

---

_Reviewed: 2026-09-07_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
