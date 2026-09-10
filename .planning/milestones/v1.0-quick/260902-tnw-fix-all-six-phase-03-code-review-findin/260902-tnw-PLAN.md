---
quick_id: 260902-tnw
type: quick
description: Fix all six phase-03 code review findings from 03-REVIEW.md
source: .planning/phases/03-search-browsing-traceability/03-REVIEW.md
tasks: 3
files_modified:
  - src/planning-repo/assemble.ts
  - src/presentation/tree.ts
  - src/web/components/tree-navigator.tsx
  - src/web/pages/search-page.tsx
  - package.json
  - test/assemble.test.ts
  - test/presentation/tree.test.ts
  - test/web/shell-contract.test.ts
---

# Quick Task: Fix phase-03 code review findings

Closes all six findings in `03-REVIEW.md` (1 Critical, 4 Warning, 1 Info). Grouped into three
atomic tasks by the seam each finding lives on, so each commit is independently revertable.

## Task 1 — Assembly-layer input robustness (CR-01, WR-04)

**Files:** `src/planning-repo/assemble.ts`, `test/assemble.test.ts`

**CR-01.** `assemble.ts:181` reads the active milestone version with `?? null`, which coalesces only
`undefined`. A STATE.md carrying `milestone: ''` therefore yields `''`, flows into
`Milestone.version` via line 228, and reaches `milestoneKeyOf` → `assertNonEmpty` →
`throw new TypeError`. That call sits inside `toProjectPresentation`, invoked synchronously at
`src/server/index.ts:42` during `createApp`, so the whole server fails to boot; six route handlers
re-enter the same path per request.

**Action:** normalize empty/whitespace-only to `null` at the read site — `?.trim() || null` — for
both `milestone` and `milestone_name`, so an unnamed milestone degrades to the same `current` key an
absent one already produces. Fix at the assembly boundary rather than loosening `assertNonEmpty`:
`milestoneKeyOf`'s refusal to encode an empty path segment is correct and stays a real invariant.

**WR-04.** `assemble.ts:297` casts `quickTasksCompleted` to `Record<string, string>[]` unvalidated,
then calls `v.includes(id)` on each cell — a non-string cell from the STATE.md table parser throws
and takes down `assembleDomainModel` for the entire project.

**Action:** guard the predicate with `typeof v === 'string' &&`, matching the defensive
`asString`/`asRecord` idiom already used in `project-presentation.ts`.

**Verify:** new tests — an empty-string `milestone` assembles with `version === null` and survives
`toProjectPresentation`; a non-string cell in `quickTasksCompleted` does not throw.

## Task 2 — Tree exclusion completeness and first-paint state (WR-01, IN-01)

**Files:** `src/presentation/tree.ts`, `src/web/components/tree-navigator.tsx`,
`test/presentation/tree.test.ts`, `test/web/shell-contract.test.ts`

**WR-01.** When `.planning/` itself is unlistable, discovery records an exclusion with
`path: '.planning'`. `locationOfExcludedPath` returns `'root'` (no `segments[1]`), and
`relativeSegments` slices away the single segment against `GROUP_PATH_PREFIX.root` (`['.planning']`),
leaving `[]`. `insert()`'s `if (relSegments.length === 0) return;` then drops it — so the one case
where the tool could read nothing at all renders as an empty tree rather than the reason-carrying
stub `tree.ts`'s own header comment promises under D-10.

**Action:** in `insert`, replace the bare early return with a leaf appended directly to the location
group, labelled by the exclusion's own final path segment. Every other exclusion already becomes a
visible stub; this makes the zero-segment case behave the same.

**IN-01.** `tree-navigator.tsx:40-48` applies `open` only imperatively inside a `useEffect`, so
top-level groups render closed for one paint before the effect mutates the DOM.

**Action:** add `open={node.nodeType === 'group'}` as a declarative initial attribute. Keep the
existing effect for the route-reveal case, which genuinely must react to navigation and must keep
its open-once semantics so a user's manual close is never fought.

**Verify:** new test — a `.planning`-rooted exclusion produces a visible exclusion node carrying its
reason; shell contract asserts groups carry the initial `open` attribute.

## Task 3 — Declared dependency and per-query UI state (WR-02, WR-03)

**Files:** `package.json`, `src/web/pages/search-page.tsx`

**WR-02.** `src/rendering/markdown.ts:3` imports `defaultSchema` from `hast-util-sanitize` at
runtime, but the package is absent from `package.json` — it resolves only as a transitive of
`rehype-sanitize`. A hoisting change or a `rehype-sanitize` major bump breaks the markdown pipeline
with no signal from `package.json`.

**Action:** declare `hast-util-sanitize` in `dependencies`, pinned to the version already installed.

**WR-03.** `SearchRow`'s `expanded` and `SearchGroupSection`'s `limit` are keyed by `row.path` /
`group.key`, both query-independent. React reconciles a same-key node across two different queries
as the same instance, so expansion and pagination state leak from one search into an unrelated one.

**Action:** fold the query into both keys so a new query mounts fresh components.

**Verify:** `npm run build`, `npm run typecheck`, full `npx vitest run` green.

## Done when

- All six findings are addressed, each task committed atomically.
- `npm run build` exits 0, `npm run typecheck` clean, full suite green at or above 470 tests.
- `03-REVIEW.md` findings are traceable to the commits that closed them via the SUMMARY.
