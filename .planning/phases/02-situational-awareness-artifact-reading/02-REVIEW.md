---
phase: 02-situational-awareness-artifact-reading
reviewed: 2026-08-29T00:00:00Z
depth: standard
files_reviewed: 49
files_reviewed_list:
  - .gitignore
  - components.json
  - eslint.config.js
  - index.html
  - package.json
  - public/fonts/jetbrains-mono-latin.woff2
  - public/fonts/space-grotesk-latin.woff2
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
  - src/web/pages/document-reference-activation.ts
  - src/web/pages/plan-pair-page.tsx
  - src/web/pages/roadmap-page.tsx
  - src/web/styles/globals.css
  - test/__golden__/dense.json
  - test/__golden__/sparse-empty.json
  - test/__golden__/sparse-started.json
  - test/handlers.test.ts
  - test/presentation/coverage.test.ts
  - test/presentation/dashboard.test.ts
  - test/presentation/roadmap.test.ts
  - test/presentation/routes.test.ts
  - test/rendering/markdown.test.ts
  - test/rendering/references.test.ts
  - test/server/deep-links.test.ts
  - test/server/project-presentation.test.ts
  - test/web/shell-contract.test.ts
  - tsconfig.json
  - tsconfig.server.json
  - tsconfig.web.json
  - vite.config.ts
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-08-29T00:00:00Z
**Depth:** standard
**Files Reviewed:** 49
**Status:** issues_found

## Summary

Reviewed the full situational-awareness/artifact-reading slice: the ROADMAP.md/STATE.md handlers,
the dashboard/roadmap/coverage/reference presentation layer, the sanitize-then-render Markdown
pipeline (including the Mermaid and plan-segment rendering paths), the Hono API surface, and the
React shell/pages, cross-checked against their test files and golden fixtures.

The markdown-rendering security contract this project cares most about is implemented correctly:
`rehype-sanitize` runs immediately after `rehype-raw` and strictly before the link-rewrite
(`rehypeResolvedReferences`), heading-slug, and Shiki-highlight plugins; `gray-matter` is only ever
called through the guarded `tryParseFrontmatter` wrapper; Mermaid sources are emitted server-side as
inert `<pre>` placeholders and only executed client-side with `securityLevel: 'strict'`; and the
`/api/artifacts/*` and `/api/documents` lookup paths resolve exclusively against an in-memory index
built from the already-loaded snapshot, so a traversal-shaped token (`../../etc/passwd`) fails closed
rather than touching the filesystem — all backed by passing tests that specifically probe these
properties.

The one critical finding is a real, provably-broken feature, not a defense-in-depth nit: the
dashboard's "Next up" and "Resolve the active blocker" actions build their destination URL from a
raw phase identity key instead of the actual phase route, so following them when the recommended
action is a phase (not a plan) sends the user to a URL matched by nothing but the app's catch-all
"not found" route. No existing test asserts the `url` field for a phase-kind next-work item, which is
how this shipped unnoticed.

## Critical Issues

### CR-01: "Next up" / blocker-resolution links to a phase are broken (non-navigable URL)

**File:** `src/presentation/dashboard.ts:183-193` and `src/presentation/dashboard.ts:218-232`

**Issue:**
`phaseWork()` and `blockerWork()` both set `url: phase.key` (or `currentPhase?.key`) as the
destination for a `NextWorkItem`, which `dashboard-page.tsx`'s `<NextWork>` component passes straight
into `<Link to={item.url}>`. But `PhaseDto.key` (built in `src/server/project-presentation.ts:431` as
`const phaseKey = phaseKeyOf(phase.identity);` and returned unchanged as `key: phaseKey` at line 513)
is only the raw phase-identity segment produced by `phaseKeyOf()` — e.g. `p~vv2.0~n~v01~vlive`. It is
**not** a route; the actual phase route is `buildPhaseUrl(identity)`, i.e.
`/milestones/<milestoneKey>/phases/<phaseKeyOf(identity)>` (see `src/presentation/routes.ts:157-162`).
Every other producer of a phase URL in this codebase (`phasePreview` in `references.ts:77-88`,
`phaseRow` in `roadmap.ts:159-192`) correctly calls `buildPhaseUrl`, so `phase.key` alone lands on a
path segment the router (`src/web/app-router.tsx`) never registers — it falls through to `NotFound`.

Concretely: whenever the dashboard's single most prominent call-to-action ("Next up") is a
phase-level item (no dependency-ready plan exists — a very common state, e.g. right after finishing
the last plan in a phase, or at the very start of a fresh phase with no plans authored yet), clicking
it 404s inside the app. Likewise, `blockerWork()`'s fallback `url: currentPhase?.key ?? '/roadmap'`
is broken any time there is both an authored blocker and a resolvable current phase — i.e. the
common case, not the edge case.

This is masked by the test suite: `test/presentation/dashboard.test.ts`'s `phase()` fixture helper
sets a literal fake `key: 'phase:01'` string directly (decoupled from `phaseKeyOf`/`buildPhaseUrl`),
and no test in that file ever asserts `.url` for a `kind: 'phase'` or `kind: 'blocker'` next-work item
(only `kind: 'plan'`/`kind: 'human-verification'` items, whose `url` is `plan.key` — which genuinely
is a full route because `PlanDto.key` is built via `buildPlanUrl`, not a raw identity key). The
asymmetry between `PlanDto.key` (a full route) and `PhaseDto.key` (a bare identity segment) is the
root cause and is easy to reintroduce elsewhere; nothing in the type system currently distinguishes
"opaque identity key" from "navigable route."

**Fix:**
```ts
// src/presentation/dashboard.ts
import { buildPhaseUrl } from './routes.ts';

function phaseWork(phase: PhaseDto): NextWorkItem {
  return {
    kind: 'phase',
    key: phase.key,
    phaseKey: phase.key,
    planKey: null,
    title: phase.name,
    description: phase.goal ?? `Phase ${phase.identity.number} is the next planned phase.`,
    url: buildPhaseUrl(phase.identity),
  };
}

function blockerWork(
  presentation: ProjectPresentation,
  currentPhase: PhaseDto | null,
): NextWorkItem | null {
  const blocker = presentation.blockers[0];
  if (!blocker) return null;
  return {
    kind: 'blocker',
    key: `next:${blocker.key}`,
    phaseKey: currentPhase?.key ?? '',
    planKey: null,
    title: 'Resolve the active blocker',
    description: blocker.text,
    url: currentPhase ? buildPhaseUrl(currentPhase.identity) : '/roadmap',
  };
}
```
Also add a regression test in `test/presentation/dashboard.test.ts` that builds a `PhaseDto` whose
`key`/`identity` come from the real `phaseKeyOf`/`buildPhaseUrl` helpers (not an opaque fixture
string) and asserts `view.next.immediate.url` round-trips through `parsePresentationUrl` to a `phase`
route — this is exactly the kind of contract the existing `phase.key` fixture shortcut hides.

## Warnings

### WR-01: Navigating to a phase/milestone URL never scrolls to or opens that phase

**File:** `src/web/pages/roadmap-page.tsx` (whole file); routed from `src/web/app-router.tsx:50-51`

**Issue:** `presentationRoutePatterns.milestone` and `.phase` both route to `<RoadmapPage />`
(`app-router.tsx:50-51`), and the route patterns carry `:milestoneKey`/`:phaseKey` params
(`presentation/routes.ts:10-13`) specifically so a phase reference can deep-link to it. But
`RoadmapPage` never calls `useParams()` (or reads `useLocation()`), so it always renders the same
full roadmap from the top, and every phase's `<details className="phase-disclosure">` is collapsed
by default. Every phase link produced elsewhere in the app (`phasePreview.url`, `phaseRow.url`,
the fixed `phaseWork`/`blockerWork` URLs from CR-01, `SourceLink` targets, etc.) therefore lands the
user on an unscrolled, fully-collapsed roadmap and leaves them to manually find and expand the
target phase — defeating the stated purpose of "deep-linkable ... URLs for phases" called out in
this project's own technology-stack rationale for choosing `react-router`.

**Fix:** In `RoadmapPage`, read the matched phase/milestone key via `useParams()` (or parse
`useLocation().pathname` with `parsePresentationUrl`), and once `view` loads, scroll the matching
`<details>` into view and set its `open` attribute (e.g. via a `ref` + `useEffect` keyed on the
resolved phase key), similar to the hash-scroll pattern already used in `DocumentView`
(`src/web/pages/artifact-page.tsx:143-151`).

### WR-02: `extractDependencyShape` can silently surface an archived milestone's diagram instead of the live one

**File:** `src/planning-repo/handlers/roadmap.ts:118-122`

**Issue:**
```ts
function extractDependencyShape(body: string): string | null {
  const m = body.match(/\*\*Dependency shape:?\*\*\s*```([\s\S]*?)```/i);
  return m ? m[1].trim() : null;
}
```
`RoadmapHandler.parse` calls this with the **full, un-trimmed** `fm.body` (`roadmap.ts:167`), i.e.
before `extractMilestoneGroups` removes the archived `<details>` blocks. The regex is non-global and
returns only the first match in document order. If an archived milestone's collapsed `<details>`
block (which is valid GSD authoring and can appear anywhere, including before the live phase
details) happens to contain its own `**Dependency shape:**` fenced block, that archived diagram — not
the live milestone's — is what gets surfaced as `structured.dependencyShape` for the whole document.
This is untested (the existing test only exercises a document with a single dependency-shape block)
and silently wrong rather than failing loudly.

**Fix:** Match against the already-computed `remainder` (the body with matched `<details>` blocks
stripped) instead of `fm.body`, so only the live/current milestone's diagram can be picked up:
```ts
const { groups, remainder } = extractMilestoneGroups(fm.body);
const phases = extractRawPhaseBlocks(remainder).map(parsePhaseBlockFields);
return {
  ...
  structured: {
    milestoneGroups: groups,
    phases,
    dependencyShape: extractDependencyShape(remainder),
  },
};
```

### WR-03: `computedPercent.display` is unrounded and can render long floating-point strings

**File:** `src/presentation/dashboard.ts:351-354, 380-384`

**Issue:**
```ts
const computedPercent =
  completedPlans !== null && totalPlans !== null && totalPlans > 0
    ? (completedPlans / totalPlans) * 100
    : null;
...
computedPercent: {
  value: computedPercent,
  display: computedPercent === null ? 'Not recorded' : `${computedPercent}%`,
  ...
}
```
For any `completedPlans`/`totalPlans` pair that doesn't divide evenly (the common case — e.g. 2/7),
`display` becomes `"28.571428571428573%"`. This field isn't currently rendered anywhere in the
reviewed React pages (`grep` confirms no `computedPercent` usage outside `dashboard.ts` and its
test), but it is part of the public `/api/dashboard` response contract, and the existing test only
asserts `.value`, never `.display`, so this will ship to any future consumer unrounded.

**Fix:** Round before formatting, e.g. `` `${Math.round(computedPercent * 10) / 10}%` `` or
`` `${computedPercent.toFixed(1)}%` ``.

## Info

### IN-01: Warning list items are keyed by their own text, risking duplicate React keys

**File:** `src/web/pages/artifact-page.tsx:300-304`

**Issue:** `{[...artifact.warnings.map(String), ...document.warnings].map((warning) => (<p ... key={warning}>`
uses the warning's own string content as the React `key`. Two identical warning messages (plausible —
e.g. two malformed `<verify>` wrappers producing the same generic "is unclosed" warning) collide on
the same key, which React will warn about in development and can cause list-reconciliation glitches.

**Fix:** Key by index combined with source (`key={`artifact-${index}`}` / `key={`document-${index}`}`),
or dedupe warnings before rendering if duplicates are semantically redundant.

### IN-02: `restoreDocumentReferenceFocus` is exported/re-exported but never called in production code

**File:** `src/web/pages/document-reference-activation.ts:38-42`, re-exported from
`src/web/pages/artifact-page.tsx:18-21`

**Issue:** The function exists to restore focus to the triggering control after a reference preview
closes, but `DocumentView` never calls it — focus restoration is instead handled declaratively by
Base UI's `Popover.Popup finalFocus={() => state.trigger}` prop
(`src/web/components/reference-preview.tsx:37-41`). The only callers of
`restoreDocumentReferenceFocus` are in `test/rendering/references.test.ts`. This is dead production
code kept alive only by its own unit test.

**Fix:** Either remove the export and its re-export from `artifact-page.tsx` (and rely solely on
`finalFocus`), or, if `finalFocus`'s behavior is meant to be a redundant safety net, call it
explicitly in `onCloseComplete` and drop the reliance on `finalFocus` — don't ship two competing
mechanisms for the same concern.

### IN-03: `data-mermaid-security="strict"` attribute is emitted but never read

**File:** `src/rendering/markdown.ts:191-201`

**Issue:** The rendered Mermaid `<pre>` carries `dataMermaidSecurity: 'strict'`, but the actual
security enforcement happens globally and unconditionally via
`mermaid.initialize({ securityLevel: 'strict', startOnLoad: false })` in
`src/web/pages/artifact-page.tsx:158`, which never reads this per-node attribute. The attribute is
vestigial metadata that could mislead a future reader into thinking security level is configured
per-diagram.

**Fix:** Either remove the unused attribute, or actually consult it (e.g. pass
`node.dataset.mermaidSecurity` into a per-call `mermaid.render` security option) if per-diagram
security levels are ever intended.

---

_Reviewed: 2026-08-29T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
