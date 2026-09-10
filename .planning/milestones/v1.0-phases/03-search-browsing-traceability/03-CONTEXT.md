# Phase 3: Search, Browsing & Traceability - Context

**Gathered:** 2026-09-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 delivers the three findability surfaces over the Phase 1 snapshot: full-text search built from
source markdown with grouped, snippet-bearing results (FIND-01–05); a persistent tree navigator
mirroring `.planning/`'s real directory structure (NAV-01); and a requirements traceability view
showing requirement → phase → status (NAV-05).

To satisfy FIND-01 and NAV-01 it also closes a gap in the Phase 1 assembly pass: the snapshot must
expose every discovered artifact, not only the `root` and `phase`/`archived-phase` locations it
exposes today. See D-11.

This phase does not add a Cmd-K command palette (NAV-08, v2), faceted/filtered search by requirement
or decision ID (FIND-06, v2), decision-ID linkification (BACK-02, v2), a graph view (researched and
explicitly rejected), file watching, write-back, or multi-project switching. It invents no new document
rendering — search results and tree nodes land on Phase 2's existing routes and artifact pages.

</domain>

<decisions>
## Implementation Decisions

### Search Entry Point and Interaction

- **D-01:** Search has one index and two entry points: a search field in the `AppShell` header beside
  Dashboard/Roadmap that shows a compact preview dropdown, and a dedicated `/search` results page that
  carries the full grouped, snippet-bearing result surface. The dropdown is for navigating; the page is
  for investigating. The Cmd-K palette stays deferred to v2 (NAV-08).
- **D-02:** The header dropdown updates debounced as-you-type (roughly 120–200ms), no Enter required;
  Enter commits the query to the full `/search` page. A stale-response guard is required so an earlier
  in-flight response can never overwrite a later one.
- **D-03:** The `/search` page carries its query in the URL (`?q=`) so a search is bookmarkable and
  survives refresh, consistent with NAV-06 and every Phase 2 view. The header field's in-flight typing
  is local component state and must never push history entries — typing twelve characters must not
  leave twelve back-button steps.
- **D-04:** Index construction runs in the background after the server begins listening; the dashboard
  paints before the index exists (FIND-05). The search field is enabled the entire time. A query typed
  before the index is ready shows a transient "Indexing…" state and resolves itself automatically once
  the index lands — never a disabled control, never a dropped query, never a lazy build that moves the
  whole delay onto the user's first search (PITFALLS #8).

### Search Match Semantics

- **D-05:** Query matching is exact plus trailing-prefix. Whole-token matches rank first; prefix
  matching is what makes as-you-type usable. No fuzzy or edit-distance matching: on a dense ID
  namespace, a typo'd `D-18` silently resolving to `D-19` is worse than an honest empty result.
- **D-06:** The tokenizer indexes ID-shaped and path-shaped tokens **both** as their intact literal
  (`role-07`, `backend/src/authz/mod.rs`) **and** as their split constituent parts. The intact token is
  what makes a literal ID or path query rank decisively above files that merely contain `ROLE` and `07`
  separately; the split parts preserve partial recall so `authz` alone still finds the path. This is the
  mechanism that actually satisfies FIND-02 — ranking alone can only prefer the right answer, never
  guarantee it.
  — **Reversibility:** costly — the tokenizer determines the shape of every indexed document, so
  changing it later means rebuilding the index against a different model and re-verifying every
  exact-token guarantee, which PITFALLS #8 characterizes as a rewrite rather than a patch.

### Search Result Layout

- **D-07:** Results group by location taxonomy first, artifact type second. Top-level groups: one per
  phase, plus sibling groups for root docs, `research/`, `quick/`, and each archived milestone — the
  taxonomy `PROJECT.md` already names. Phase groups order by execution; active-milestone phases outrank
  archived ones. Within a group, hits cluster by artifact type (PLAN, SUMMARY, CONTEXT, generic).
- **D-08:** Each result row shows one snippet centered on its highest-scoring match, plus a match count
  that expands in place to reveal the remaining snippets. Snippets are centered on the actual matched
  term, never the file's opening lines. Each snippet deep-links to the nearest heading anchor, reusing
  Phase 2's `rehype-slug` ids.

### Tree Navigator

- **D-09:** The tree navigator is a persistent, collapsible left sidebar present on every route. This
  changes the Phase 2 shell layout — `AppShell` is header-above-full-width-content today, with the
  oklch sidebar tokens defined but unused — so every long-form artifact surface must be re-checked for
  reading width and overflow behavior against Phase 2's UAT ground.
- **D-10:** The tree is a literal disk mirror: real directories, real filenames, real order, including
  files the parser never recognized, which appear as ordinary nodes rather than vanishing. This is the
  escape hatch `ARCHITECTURE.md` describes — it must stay useful precisely where the domain model cannot
  interpret a directory. Recorded discovery exclusions (`research/.cache/`, a depth-terminated walk)
  render as explicitly-marked stubs so no exclusion is ever silently invisible.
- **D-11:** **Blocking gap, resolved by extending the snapshot at the source.** `src/planning-repo/assemble.ts`
  surfaces only `root` artifacts (line 158) into `Project.artifacts` and `phase`/`archived-phase`
  artifacts (lines 184, 190) into `Phase.artifacts`. Files classified `quick`, `research`,
  `milestone-root`, and `other` are discovered and parsed, then dropped — `QuickTask` carries only a
  directory path and no artifacts. FIND-01 ("covers every file in `.planning/`") and NAV-01 (tree
  mirrors root docs, `phases/`, `quick/`, `milestones/`, `research/`) are therefore both unreachable
  from the assembled model today. Assembly must expose every discovered artifact, preserving the
  existing phase/root groupings and adding the missing locations. Search and the tree both read that one
  snapshot — no second, parallel view of the corpus built from a different pass (ARCHITECTURE
  Anti-Pattern 3).
  — **Reversibility:** costly — this changes the assembled `Project` shape that every Phase 2 view,
  selector, and the committed Phase 1 goldens already consume; undoing it means reverting the domain
  contract and re-verifying the harness fixtures alongside it.
- **D-12:** The tree opens with top-level groups visible and everything else collapsed, then
  auto-expands and highlights the branch containing the current route, so arriving from search or the
  roadmap reveals where a file lives. Manual expand/collapse persists within the session only;
  navigation must never collapse a branch the user opened by hand. No `localStorage` persistence in v1.

### Traceability View

- **D-13:** Each requirement row shows two explicitly-labeled status columns: the requirement's own
  status as claimed by `REQUIREMENTS.md`, and the covering phase's own state. Disagreement is flagged
  visibly rather than reconciled into a single derived verdict. This extends Phase 2's D-02 — the value
  of this view is catching a requirement marked Complete under a phase that is not, and a merged status
  destroys exactly that signal.
- **D-14:** The view groups by `REQUIREMENTS.md`'s own feature-area categories (Targeting & Portability,
  Situational Awareness, Search, Navigation & Cross-Linking, …) so it reads the way the source document
  does. A filter field narrows by ID or requirement text, and status filters isolate the interesting
  slices — uncovered requirements, and rows whose two status signals disagree.
- **D-15:** Every v1 requirement appears, uncovered ones included and visibly marked — an uncovered
  requirement is the highest-value row this view can show. A dangling phase reference renders as its raw
  text plus an explicit unresolved marker, carrying forward Phase 1's D-10 and Phase 2's D-17: never a
  broken link, never silently dropped. v2 and future-tier requirements, which carry no checkbox and no
  covering phase, live in their own clearly-labeled section rather than sitting in the main table as
  permanently blank rows.
- **D-16:** The traceability view lives at its own top-level route as a nav item beside Dashboard and
  Roadmap, and is also reachable by clicking `REQUIREMENTS.md` in the sidebar tree. Requirement IDs
  already linkified by NAV-02 can point into it.

### Claude's Discretion

- Search library selection and configuration. `minisearch` is the STACK.md recommendation and is **not**
  yet in `package.json`; research should confirm it can express D-05's exact+prefix-without-fuzzy
  semantics and D-06's dual whole-and-split tokenization before it is locked in.
- Exact debounce interval, dropdown result cap, snippet character window, and the stale-response guard
  technique, provided D-02's no-Enter-required behavior and D-08's match-centered snippets hold.
- Whether title and frontmatter hits receive field boosting over body hits, and whether
  archived-milestone hits are demoted in ranking — not discussed, decide from what the corpus warrants.
- Whether PLAN pseudo-XML tags and YAML frontmatter keys are stripped from indexed text. PITFALLS #8
  says "frontmatter-stripped, pseudo-XML-tag-stripped, but otherwise raw" — treat that as the default
  and deviate only with a stated reason.
- Whether the sidebar auto-collapses on long-form artifact routes, and its behavior at narrow viewports.
- What a tree node opens for a non-markdown or unparseable file — the generic markdown fallback view is
  the obvious candidate.
- Sidebar width, tree indentation, expansion affordance, and result-group visual treatment within the
  established studio-portal visual language.
- Plan sizing and wave structure. The roadmap sizes this phase at 2 plans; D-11's snapshot extension is
  a genuine prerequisite for both search coverage and the tree, so it likely belongs first.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope and Locked Project Constraints

- `.planning/ROADMAP.md` §"Phase 3: Search, Browsing & Traceability" — phase goal, the dual dependency
  on Phase 1 (snapshot indexed) and Phase 2 (routing/rendering conventions results point into), the
  seven mapped requirements, four success criteria, two-plan sizing, and UI hint.
- `.planning/REQUIREMENTS.md` — FIND-01–05 (lines 70–74) and NAV-01, NAV-05 (lines 58, 62) are the
  complete Phase 3 requirement set. FIND-06 (faceted search) and NAV-08 (Cmd-K palette) are v2
  Findability Enhancements, and BACK-02 (decision/warning ID linking) is v2 — none are in this phase.
  The §"Traceability" table at line 145 is the data this phase's NAV-05 view renders.
- `.planning/PROJECT.md` — core value, read-only boundary, one-project-per-run constraint, explicit v1
  exclusions, and the forward-compatibility obligations the index must not violate.
- `.planning/STATE.md` — current position and the accumulated Phase 1/2 decisions this phase inherits.
- `.planning/phases/01-read-layer-domain-model/01-CONTEXT.md` — locked read-layer decisions; D-11's
  snapshot extension must not re-litigate them.
- `.planning/phases/02-situational-awareness-artifact-reading/02-CONTEXT.md` — D-02 (roadmap vs disk
  status kept as two separate signals, the principle D-13 extends), D-13 (milestone-qualified route
  shape search results must target), D-14/D-15 (reference previews), D-16 (heading anchors D-08's
  snippets deep-link into), D-17 (dangling references render as plain text, carried forward by D-15).

### Architecture, Search Design, and Failure Modes

- `.planning/research/ARCHITECTURE.md` §"Pattern 3: Snapshot-based load with a single refresh() seam"
  (line 170), §"Internal Boundaries" (line 359 — "Search index … built and swapped in lockstep with the
  snapshot inside `refresh()`, never has an independent invalidation lifecycle"), and §"Phase C — Search
  & full navigability" (line 338 — the browse tree as an escape hatch that works where the domain model
  cannot interpret a directory).
- `.planning/research/PITFALLS.md` §"Pitfall 8" (lines 175–197) — the three compounding search failure
  modes this phase's decisions answer directly: index-build blocking startup (D-04), rendered-vs-source
  text indexing (D-06), and snippets/ranking with no "why did this match" signal (D-07, D-08). Also
  §"Looks Done But Isn't" line 309 — the source-token search check is a named verification item.
- `.planning/research/FEATURES.md` §2 "Search UX" (lines 39–48) — one index with two entry points
  (D-01), grouping as essential rather than optional (D-07); §3 "Navigation and cross-linking" (lines
  52–56) — the sidebar tree as table stakes and the reasoned rejection of a graph view.
- `.planning/research/STACK.md` — `minisearch` 7.2.0 recommendation with the incremental `add`/`remove`/
  `update` seam, and the alternatives table (FlexSearch, SQLite FTS5, ripgrep, Lunr, Fuse.js) with the
  reasoning for each rejection. Treat recorded versions as inputs to verify, not licenses to install
  blindly.
- `.planning/research/GSD-DOMAIN.md` — artifact inventory and the directory taxonomy D-07's result
  groups and D-10's tree must represent.
- `.claude/CLAUDE.md` §"Technology Stack" and §"Constraints" — resolved stack and the non-negotiable
  read-only boundary.

### Code the Phase Must Extend

- `src/planning-repo/assemble.ts` lines 158, 184, 190, 280–296 — the exact assembly gap D-11 fixes.
- `src/planning-repo/discovery.ts` lines 60–118 (`classify`) and 120–198 (`discover`) — the seven-way
  location classification and the `exclusions` ledger D-10's stubs render.
- `src/server/artifact-index.ts` — the existing canonical-path artifact lookup built at server start;
  the natural place the search index hangs off.
- `src/presentation/routes.ts` — `presentationRoutePatterns` and `buildPlanUrl`; every search result and
  tree node must resolve through these, not through hand-built URLs.
- `src/web/components/app-shell.tsx` — the header-only shell D-01's search field and D-09's sidebar both
  modify.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/server/artifact-index.ts` — `buildArtifactIndex(snapshot)` already constructs a canonical
  path → artifact map plus plan-route lookups once at server start, frozen and read-only. The search
  index is the same shape of object built from the same snapshot in the same pass.
- `src/domain/model.ts` — `Artifact` already carries `body`, `bodyLength`, `bodyHash`, `title`,
  `frontmatter`, and `structured`; `bodyHash` is exactly the key an incremental or cached index would
  need later. `Requirement` already carries `category`, `tier`, `checked`, and resolved
  `coveringPhaseRefs`, so the traceability view is close to a pure projection over existing data.
- `src/planning-repo/discovery.ts` — `discover()` already walks every file at any extension and
  classifies it into seven locations, and already records a path + reason for every exclusion. The tree
  needs no new filesystem walk.
- `src/presentation/routes.ts` — the milestone-qualified route codec and `buildPlanUrl` are the only
  URL construction path; search results and tree nodes reuse them.
- `src/rendering/markdown.ts` and `linkify.ts` — Phase 2's pipeline including `rehype-slug` heading ids,
  which D-08's snippet deep-links target.

### Established Patterns

- Dependency direction is one-way: `planning-fs` → `planning-repo` → zero-I/O domain → presentation →
  web. Neither the search index nor the tree may reach back to `node:fs` or `node:path`; both read the
  assembled snapshot. This is why D-11 extends assembly rather than adding a parallel walk.
- One snapshot, rebuilt as a unit through a single `refresh()` seam. The search index is built and
  swapped in lockstep with it and has no independent invalidation lifecycle.
- Open enums, not closed: artifact kinds, statuses, and config keys degrade to generic handling rather
  than being dropped. The tree's unrecognized-file nodes and search's generic artifact-type group follow
  the same rule.
- Dangling references are normal data (`resolved: null`), warnings are reserved for genuine parse
  degradation. D-15 preserves that distinction in the traceability view.
- Server-side view models cross the boundary already shaped for display; no domain logic on the client.

### Integration Points

- Extend `assembleDomainModel()` so every discovered location surfaces as reachable `Artifact` objects
  (D-11), keeping current groupings intact and the Phase 1 committed goldens honest.
- Build the search index alongside `buildArtifactIndex` in `createApp`, but off the startup critical
  path so `serve()` begins listening first (D-04). Add a search endpoint plus a readiness signal the
  client can poll or await.
- Add a tree view model derived from the snapshot's artifact paths plus `snapshot.exclusions`.
- Add `/search` and the traceability route to `presentationRoutePatterns` and `appRouter`.
- Restructure `AppShell` from header-over-content into header-over-(sidebar + content), activating the
  already-defined but unused oklch sidebar tokens in `src/web/styles/globals.css`.

</code_context>

<specifics>
## Specific Ideas

- The exact-token guarantee is the point of this phase's search, not a nice-to-have. Searching a
  requirement ID and getting a file that merely contains the letters and the number separately is the
  specific failure being designed against.
- A search should feel like the dropdown is a way to *go* somewhere and the results page is where you
  *read*. Those are two different intents and the surfaces should feel different.
- The tree should be trustworthy as a cross-check against a terminal: what it shows is what is on disk,
  including the files the tool did not understand.
- The most valuable row in the traceability view is a requirement nothing covers, and the second most
  valuable is one whose two status signals disagree. The view should make both easy to isolate.
- An uncovered requirement, an unresolved phase reference, and a deliberately excluded directory should
  each look like themselves — visible and labeled, never absent and never an error.

</specifics>

<deferred>
## Deferred Ideas

- Cmd-K command palette over the same index (NAV-08, v2 Findability Enhancements) — D-01 deliberately
  builds one index with two entry points so the palette becomes a third entry point with no
  restructuring.
- Faceted search filtering by requirement ID, phase, or artifact type (FIND-06, v2).
- Decision-ID (`D-XX`) and warning-ID (`WR-XX`) linkification extending NAV-07's mention index into the
  UI (BACK-02, v2).
- A backlinks panel ("what references this") on requirement, decision, and phase pages — named in
  FEATURES research as a genuine differentiator over reading files by hand, built on the same reverse
  index. Not in the Phase 3 requirement set.
- Persisting search-index build output across restarts, keyed on `bodyHash`/mtime, to avoid paying the
  full-corpus cost every launch (PITFALLS #8 refinement). D-04's background build makes this unnecessary
  at current corpus size; `bodyHash` already exists if it is ever wanted.
- Persisting tree expansion state to `localStorage` across sessions — deliberately excluded from v1 by
  D-12 as the app's first persisted client state.

</deferred>

---

*Phase: 3-search-browsing-traceability*
*Context gathered: 2026-09-02*
