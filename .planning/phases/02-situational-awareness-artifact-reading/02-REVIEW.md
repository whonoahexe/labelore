---
phase: 02-situational-awareness-artifact-reading
reviewed: 2026-09-01T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - src/planning-repo/handlers/roadmap.ts
  - src/planning-repo/handlers/state.ts
  - src/presentation/coverage.ts
  - src/presentation/dashboard.ts
  - src/presentation/references.ts
  - src/presentation/roadmap.ts
  - src/presentation/routes.ts
  - src/rendering/frontmatter-views.ts
  - src/rendering/linkify.ts
  - src/rendering/markdown.ts
  - src/rendering/plan-segments.ts
  - src/server/artifact-index.ts
  - src/server/index.ts
  - src/server/project-presentation.ts
  - src/web/app-router.tsx
  - src/web/components/app-shell.tsx
  - src/web/components/reference-preview.tsx
  - src/web/components/theme-toggle.tsx
  - src/web/components/ui/button.tsx
  - src/web/main.tsx
  - src/web/pages/artifact-page.tsx
  - src/web/pages/dashboard-page.tsx
  - src/web/pages/mermaid-theme.ts
  - src/web/pages/plan-pair-page.tsx
  - src/web/pages/roadmap-deep-link.ts
  - src/web/pages/roadmap-page.tsx
  - src/web/pages/scroll-settle.ts
  - src/web/styles/globals.css
  - index.html
  - vite.config.ts
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: warning
---

# Phase 02: Code Review Report

**Reviewed:** 2026-09-01
**Depth:** standard
**Files Reviewed:** 28 (+ 2 read for cross-reference only: `src/planning-repo/snapshot.ts`, ROADMAP/UAT fixtures)
**Status:** issues found (no blockers)

## Summary

This is a re-review of a build that already passed a fresh-build human UAT gate (`02-17-SUMMARY.md`)
after nine defects were found and fixed (`260901-ten-SUMMARY.md`), including the one class of bug
this review was specifically asked to hunt for again: a raw-HTML-string mount being reinstated by a
sibling re-render. That fix (`DocumentCanvas` memoized on the `html` string in
`src/web/pages/artifact-page.tsx`) is correctly implemented — `mountRef`'s identity is stable and the
`memo()` boundary sits exactly where it needs to, so no other component in this tree can force React
to re-diff the mermaid/reference-mutated subtree back to its original markup. `reference-preview.tsx`
and the two `DocumentView` instances in `plan-pair-page.tsx` are independent state, so opening one
document's reference popover cannot erase a sibling document's rendered diagrams.

The `unified` pipeline in `markdown.ts` has `rehype-sanitize` correctly placed immediately after
`rehype-raw` and before the reference-linkify, slug, and shiki-highlight plugins — matching the
required ordering and confirming `defaultSchema` is extended (not replaced), so `<script>`,
`on*` handlers, and `javascript:` hrefs stay stripped. `gray-matter` is never called unguarded in the
files reviewed (`tryParseFrontmatter` mediates every call). The artifact/document HTTP routes never
touch the filesystem with a request-supplied path — lookups are pre-indexed `Map` reads keyed by the
canonical paths captured at snapshot time, so there is no path-traversal surface through
`/api/documents` or `/api/artifacts/*` regardless of how a token is crafted.

No Critical findings. Three Warnings, all latent-but-real correctness gaps rather than reproducible
user-facing breakage today; two Info items (dead/duplicate code, no behavioral effect).

## Warnings

### WR-01: `oklch()` chroma percentage is converted with the wrong reference range

**File:** `src/web/pages/mermaid-theme.ts:56-62,79`
**Issue:** `parsePercentOrFraction(raw, percentDivisor)` divides a percentage literal by
`percentDivisor` to get the unitless value. It is called with `percentDivisor = 100` for both `L`
(`line 78`) and `C`/chroma (`line 79`). That is correct for lightness — CSS Color 4 defines `100%`
lightness as `1.0`. It is **not** correct for chroma: the spec's reference range maps `100%` chroma
to `0.4`, not `1.0`. A CSS `oklch(70% 50% 180)` (chroma given as a percentage — a form the function's
own docstring says it supports) would parse to `c = 0.5` here instead of the correct `c = 0.2`,
handing `oklchToSrgb` a chroma more than double what a spec-conformant browser would use for the same
string, which typically pushes the resulting RGB triple to clipped/out-of-gamut extremes.
This is currently dormant: every design token in `src/web/styles/globals.css` and `index.html` writes
chroma as a raw number (`oklch(0.553 0.195 38.402)`), never a percentage, so today's actual mermaid
theming is unaffected. It is a real defect in the general-purpose converter this function claims to
be, and will silently mis-render mermaid diagram colors the first time any CSS custom property in
this palette is authored with a percentage chroma (a valid, spec-legal way to write the same color).
**Fix:**
```ts
// oklch() chroma's reference range is 0%..100% -> 0.0..0.4, not 0.0..1.0.
const c = cRaw.endsWith('%') ? (parseFloat(cRaw.slice(0, -1)) / 100) * 0.4 : parseFloat(cRaw);
```
or thread a separate `percentScale` argument through `parsePercentOrFraction` for chroma (`0.4`)
versus lightness/alpha (`1`).

### WR-02: `/api/documents` and `/api/artifacts/*` skip the JSON-safety normalization every other endpoint applies

**File:** `src/server/index.ts:41-59` (compare `src/server/project-presentation.ts:185-205`, `jsonRecord`/`jsonValue`, used by `/api/presentation`, `/api/roadmap`, `/api/history` via `toProjectPresentation`)
**Issue:** `artifactResponse()` returns `frontmatter: lookup.artifact.frontmatter` and
`structured: lookup.artifact.structured` straight from the parsed `Artifact` domain object. Every
other endpoint that ships frontmatter/structured data to the client routes it through `jsonRecord()`
first, which recursively guards against reference cycles (`ancestors` set), converts `Date`/`bigint`,
and nulls out non-finite numbers before `JSON.stringify` ever sees them. `js-yaml` (via `gray-matter`)
can produce a self-referencing object graph from a YAML anchor/alias pair that references its own
parent — this is valid, non-malformed YAML, not something `tryParseFrontmatter`'s try/catch guard
against parse *errors* would catch. When that value reaches `c.json(...)` in `/api/documents` or
`/api/artifacts/*`, `JSON.stringify` throws `TypeError: Converting circular structure to JSON`
synchronously inside the async handler, which Hono's router turns into an opaque 500 for that one
artifact — while the exact same artifact still renders correctly through `/api/presentation`, because
that path normalizes the same underlying data. This directly contradicts the project's own stated
degrade-not-break requirement (ROADMAP.md: "A file with deliberately corrupted YAML degrades only its
own view; every other page still renders and the app does not crash") — here the *document* view is
the one that breaks, while the presentation-wide view survives, the inverse of graceful degradation.
**Fix:**
```ts
frontmatter: jsonRecord(lookup.artifact.frontmatter),
structured: jsonRecord(lookup.artifact.structured),
```
(reusing the existing `jsonRecord`/`jsonValue` helpers from `project-presentation.ts`, exported for
this call site).

### WR-03: Unhandled promise rejection if the `mermaid` chunk fails to load

**File:** `src/web/pages/artifact-page.tsx:204`
**Issue:** `void import('mermaid').then(async ({ default: mermaid }) => { ... })` has no `.catch()`.
Every failure mode *inside* the callback that matters (bad theme tokens, a node that fails to parse)
is already guarded by nested `try`/`catch` — those are handled correctly and surface a
`runtimeWarnings` message to the user. But if the dynamic `import('mermaid')` promise itself rejects
(a stale/evicted chunk after a redeploy, an offline reload, a corrupted browser cache, any network
failure fetching the lazy-loaded module), that rejection is never caught anywhere in the chain. It
becomes an unhandled promise rejection: reported to the console (and to
`window.onunhandledrejection`/any error-monitoring hook a future version might add), with no
`runtimeWarnings` notice shown to the user — every pending mermaid diagram on the page just silently
stays as `data-mermaid-pending="true"` forever, unlike every other mermaid failure path in this same
effect, which degrades to visible fallback source with an explanatory warning.
**Fix:**
```ts
void import('mermaid')
  .then(async ({ default: mermaid }) => { /* ... existing body ... */ })
  .catch(() => {
    if (disposed) return;
    setRuntimeWarnings((warnings) => [
      ...warnings,
      'Mermaid could not be loaded, so diagrams remain readable as source.',
    ]);
  });
```

## Info

### IN-01: Duplicate `.attention-list p` CSS rule

**File:** `src/web/styles/globals.css:797-805`
**Issue:** `.attention-list p { color: ...; font-size: ...; line-height: ...; }` and a second,
immediately adjacent `.attention-list p { margin: 0.35rem 0; }` are two separate rule blocks for the
same selector. Both apply (non-conflicting properties), so there is no visual bug, but it reads as an
artifact of the F5 dead-selector cleanup (`260901-ten`, commit `02c8cb7`) that removed
`.attention-list small` and left this split behind.
**Fix:** Merge into one declaration block.

### IN-02: Dead CSS block in `index.html`

**File:** `index.html:17-288`
**Issue:** The inline critical-CSS `<style>` block correctly duplicates the oklch token set (verified
byte-for-byte identical to `src/web/styles/globals.css`'s `:root`/`.dark` blocks, aside from one new
`--table-zebra` token that's absent here — expected, since that's not needed pre-paint) to avoid a
flash of unstyled content before the bundle loads. But roughly 150 lines of it
(`.position-card`, `.error-card`, `.card-heading`, `.status`, `.progress-block`, `.progress-row`,
`.progress-track`, `.progress-fill`, `.metadata`/`.metadata dt`/`.metadata dd`, `.skeleton`,
`@keyframes pulse`, and their `@media (max-width: 36rem)` variant) target classNames that do not
appear anywhere in `src/web` — confirmed by grep against every component. This looks like leftover
scaffold CSS from an earlier bootstrap stage of the project, predating the current `dashboard-page`/
`app-shell`/`globals.css` class names.
**Fix:** Remove the unused rule set, keeping only the `:root`/`.dark` token block, `color-scheme`,
box-sizing reset, and body/base styles actually load-bearing for FOUC prevention.

---

_Reviewed: 2026-09-01_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
