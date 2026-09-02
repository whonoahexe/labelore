---
phase: 03-search-browsing-traceability
reviewed: 2026-09-02T00:00:00Z
depth: standard
files_reviewed: 41
files_reviewed_list:
  - eslint.config.js
  - package.json
  - src/domain/model.ts
  - src/planning-repo/assemble.ts
  - src/planning-repo/discovery.ts
  - src/planning-repo/types.ts
  - src/presentation/routes.ts
  - src/presentation/search.ts
  - src/presentation/traceability.ts
  - src/presentation/tree.ts
  - src/rendering/markdown.ts
  - src/rendering/slug.ts
  - src/server/artifact-index.ts
  - src/server/index.ts
  - src/server/project-presentation.ts
  - src/server/search-index.ts
  - src/web/app-router.tsx
  - src/web/components/app-shell.tsx
  - src/web/components/search-field.tsx
  - src/web/components/tree-navigator.tsx
  - src/web/pages/search-page.tsx
  - src/web/pages/traceability-filter.ts
  - src/web/pages/traceability-page.tsx
  - src/web/styles/globals.css
  - test/__golden__/dense.json
  - test/__golden__/sparse-empty.json
  - test/__golden__/sparse-started.json
  - test/assemble.test.ts
  - test/presentation/dashboard.test.ts
  - test/presentation/roadmap.test.ts
  - test/presentation/routes.test.ts
  - test/presentation/search.test.ts
  - test/presentation/traceability.test.ts
  - test/presentation/tree.test.ts
  - test/rendering/markdown.test.ts
  - test/rendering/plan-sections.test.ts
  - test/rendering/references.test.ts
  - test/server/deep-links.test.ts
  - test/server/project-presentation.test.ts
  - test/server/search-index.test.ts
  - test/web/attention-row-contract.test.ts
  - test/web/shell-contract.test.ts
  - test/web/visual-contract.test.ts
findings:
  critical: 1
  warning: 4
  info: 1
  total: 6
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-09-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 41
**Status:** issues_found

## Summary

Phase 03 delivered exact-token full-text search with grouped, snippet-bearing results, a
disk-mirroring tree sidebar, and a requirements traceability view. The presentation-layer code
(`search.ts`, `tree.ts`, `traceability.ts`, `routes.ts`) is disciplined about staying pure/DOM-free
and about not merging independent status signals, and the search snippet extractor's surrogate-pair
and highlight-merging logic is carefully built. The markdown pipeline correctly orders
`rehype-sanitize` before the link-rewrite/slug/highlight plugins per this project's own documented
compatibility hazard.

The most serious finding is a real crash path: `presentation/routes.ts`'s `assertNonEmpty` throws
when a milestone version is the empty string (as opposed to absent/`null`), and nothing between
`assemble.ts`'s frontmatter read and every `/api/*` presentation route guards against that value —
this reaches all the way to `createApp`'s synchronous, unguarded call site, so it can take down
server startup entirely rather than degrading a single artifact, which directly contradicts this
project's own "must degrade rather than break" compatibility constraint. Several lower-severity gaps
follow: a silently-dropped top-level exclusion in the tree view, an undeclared runtime dependency,
and React-key state leakage across different search queries.

## Critical Issues

### CR-01: Empty (not absent) milestone version crashes every presentation route

**File:** `src/planning-repo/assemble.ts:181` and `src/presentation/routes.ts:89-97`
**Issue:**
`assemble.ts` reads the active milestone version as:
```ts
const activeMilestoneVersion = (stateArtifact?.frontmatter.milestone as string | undefined) ?? null;
```
`??` only coalesces `null`/`undefined` — if `STATE.md`'s frontmatter carries `milestone: ''` (a
legal, plausible YAML value for a project that has not yet named its milestone, distinct from
omitting the key entirely — the exact "fresh project" case `domain/model.ts`'s own doc comment on
`Milestone.version` calls out), `activeMilestoneVersion` becomes the empty string `''`, not `null`.
That value then flows unchanged into every `PhaseIdentity.milestoneVersion` for the live milestone
(`assemble.ts:197`, `220`, `228`) and into `Milestone.version`.

Downstream, `presentation/routes.ts`'s `milestoneKeyOf` calls `assertNonEmpty(version, 'Milestone
version')`, which `throw`s a `TypeError` for any non-null empty string:
```ts
export function milestoneKeyOf(version: string | null): string {
  if (version === null) return 'current';
  assertNonEmpty(version, 'Milestone version');   // throws for ''
  return `${MILESTONE_PREFIX}${encodePart(version)}`;
}
```
`milestoneKeyOf` is called, unguarded, from `project-presentation.ts`'s `toProjectPresentation`
(building every `MilestoneDto`/`PhaseDto`/`ArtifactDto`) and from `search-index.ts`'s `searchIndex`.
`toProjectPresentation` in turn is called:
- synchronously and unguarded inside `createApp` (`src/server/index.ts:42`), i.e. **before** the
  Hono app is even constructed — a throw here rejects `startServer()`'s promise and aborts the whole
  process (`runCli()` prints an error and exits, `npm run dev`/`start`/`smoke` all fail to boot);
- again, per request, inside `/api/dashboard`, `/api/roadmap`, `/api/history`, `/api/tree`,
  `/api/traceability`, and `/api/search` (`src/server/index.ts:74-131`) — so even if a later refresh
  cycle papered over the startup crash, every one of these routes would 500 on every request for the
  lifetime of the process.

This is exactly the "unknown/malformed data must degrade rather than break" scenario this project's
own CLAUDE.md constraint calls out, and here a single stray empty-string frontmatter value takes
down the entire dashboard rather than degrading the one affected artifact.
**Fix:** Normalize empty strings to `null` at the read site (the same treatment already given to
`null`/`undefined`), e.g.:
```ts
// assemble.ts
const activeMilestoneVersion =
  (stateArtifact?.frontmatter.milestone as string | undefined)?.trim() || null;
```
and/or make `milestoneKeyOf`/`phaseKeyOf` treat `''` the same as `null` instead of asserting —
whichever the codebase's own convention prefers, but at least one of the two must stop the throw from
being reachable through normal (if malformed) `.planning/` content, given `routes.ts` is exercised
on every request, not just at parse time.

## Warnings

### WR-01: Permission-denied on `.planning/` itself is silently dropped from the tree view

**File:** `src/presentation/tree.ts:123-129` (see also `src/planning-repo/discovery.ts:141-158`)
**Issue:** This module's own header comment states the tree "is a literal mirror of `.planning/` as
it sits on disk... every recorded exclusion appears as a visible, reason-carrying stub — nothing this
tool found or deliberately skipped is ever silently absent (D-10)." That invariant is violated for
one specific, reachable case: if `fs.exists('.planning')` succeeds but the subsequent `fs.list(...)`
call on the `.planning` directory itself throws (e.g. a permissions race, or a directory that exists
but isn't listable), `discovery.ts` records an exclusion with `path: '.planning'` (`discovery.ts:156`,
where `relDir === PLANNING_DIR`). Back in `tree.ts`, `locationOfExcludedPath('.planning')` computes
`segments[1]` as `undefined` and returns `'root'`; `relativeSegments('.planning', 'root')` then slices
away the whole (single-segment) path, producing `relSegments = []`. `insert()`'s first line is:
```ts
if (relSegments.length === 0) return;
```
so this exclusion is never inserted into the tree at all — the one case where the tool could not read
anything under `.planning/` silently produces an empty "Root Documents" group (or no group at all)
instead of the reason-carrying stub the rest of the codebase promises.
**Fix:** Special-case a zero-length `relSegments` by inserting a leaf directly under the location
group using the group's own label (or the exclusion's own path) as the leaf label, instead of
returning early — mirroring how every other exclusion becomes a visible stub.

### WR-02: `hast-util-sanitize` is a runtime import but not a declared dependency

**File:** `src/rendering/markdown.ts:3`
**Issue:** `defaultSchema` is imported directly from `hast-util-sanitize` and used at runtime to build
the sanitizer schema:
```ts
import { defaultSchema } from 'hast-util-sanitize';
```
`hast-util-sanitize` does not appear in `package.json`'s `dependencies` — it currently resolves only
because it happens to be a transitive dependency of `rehype-sanitize` (confirmed via
`package-lock.json`). This is a "phantom dependency": npm's install algorithm, a future
`rehype-sanitize` major bump that changes its own dependency graph, or a stricter package manager
(pnpm, or npm with hoisting changes) can all silently break this import without `package.json` ever
signaling the breakage. `hast`, `mdast`, and `vfile` (imported as `import type` elsewhere in the same
file) share the same undeclared-dependency issue, though with lower runtime risk since they're
type-only.
**Fix:** Add `hast-util-sanitize` (and ideally `hast`/`mdast`/`vfile` for the type-only imports) as
explicit `dependencies`/`devDependencies` in `package.json`, pinned to the version actually in use.

### WR-03: Search result "show more"/"expanded" UI state leaks across different queries via reused React keys

**File:** `src/web/pages/search-page.tsx:49-52`, `93-96`
**Issue:** `SearchRow`'s `expanded` state is `useState(false)` on a component keyed by `row.path`
(`key={row.path}`, line 104), and `SearchGroupSection`'s `limit` state is `useState(GROUP_PAGE_SIZE)`
on a component keyed by `group.key` (line 206) — both keys are stable, query-independent identifiers
(`location:root`, `location:research`, a phase key, or a specific file's own path). When a user types
a new search query, `view.groups` is a brand-new array, but if the new result set produces a group
or row with the same key as one from the previous query (e.g. the "Root Documents" group appears for
both queries, or the same file matches two different queries), React reconciles it as the *same*
component instance and keeps its prior `expanded`/`limit` state. A group the user had expanded to 15
rows for query A will render already-expanded to 15 rows for the very first render of query B's
unrelated results, and a row whose snippets were expanded for query A will show all of query B's
snippets by default too.
**Fix:** Fold the query string into the key (e.g. `key={`${query}:${group.key}`}` /
`key={`${query}:${row.path}`}`), or reset local `expanded`/`limit` state in a `useEffect` keyed on the
query changing.

### WR-04: Unvalidated cast on `quickTasksCompleted` risks a runtime crash on a non-string cell

**File:** `src/planning-repo/assemble.ts:297-317`
**Issue:**
```ts
const quickTasksCompleted = (stateArtifact?.structured.quickTasksCompleted as Record<string, string>[] | undefined) ?? [];
...
stateRow: quickTasksCompleted.find((row) => Object.values(row).some((v) => v.includes(id))) ?? null,
```
`quickTasksCompleted` is blindly cast to `Record<string, string>[]` with no runtime check, and `v`
(typed as `string` only because of that cast) is called with `.includes(id)`. Every other place in
this codebase that reads structured/frontmatter data defensively guards against unexpected shapes
(`asString`/`asNumber`/`asRecord` in `project-presentation.ts`, the try/catch around every markdown
render). If the STATE.md table parser ever emits a non-string cell (a `null`/numeric/boolean value
for one column, or a missing column resulting in `undefined`), `.includes` is not defined on
non-strings and this throws, taking down `assembleDomainModel` for the whole project rather than
degrading the one row.
**Fix:** Guard the cast with the same `asString`-style helper used elsewhere, e.g.
`Object.values(row).some((v) => typeof v === 'string' && v.includes(id))`.

## Info

### IN-01: Sidebar `<details>` groups start visually closed for one paint before being forced open

**File:** `src/web/components/tree-navigator.tsx:40-48`
**Issue:** Top-level groups (`node.nodeType === 'group'`) are intended to "start open" per the
in-code comment, but "open" is only ever applied imperatively inside a `useEffect` (`detailsRef.current.open
= true`), never as a declarative `open` attribute on the JSX `<details>` element itself. Native
`<details>` defaults to closed, so on the very first render/paint the element is closed until the
effect runs and mutates the DOM — a brief, avoidable flash for what should always render already-open.
**Fix:** Set `open={node.nodeType === 'group'}` as the initial JSX attribute so the very first paint
already matches the intended state, and keep the existing effect only for the route-reveal case that
genuinely needs to react to navigation.

---

_Reviewed: 2026-09-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
