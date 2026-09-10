---
phase: "03"
slug: "search-browsing-traceability"
status: passed
score: 24/24
max_score: 24
reviewed: "2026-09-10"
baseline: 03-UI-SPEC.md
needs_human_review: false
---

# Phase 03 — UI Review

**Audited:** 2026-09-10  
**Baseline:** 03-UI-SPEC.md  
**Screenshots:** Code-only audit (no dev server)

---

## Supersession Notice

This review supersedes:
- **2026-09-02 review** (24/24) — initial review at phase completion
- **2026-09-10 early review** (23/24) — re-audit triggered by focus ring fix, which incorrectly reported contrast measurements

**Why re-audit:** The early 2026-09-10 review docked Color to 3/4 based on focus ring contrast figures from a flat sRGB composite *model* (2.29:1 light / 1.46:1 dark), not rendered pixels. The fix that landed since changed both the rendering (`outline-ring` from `/50` alpha to opaque) and the dark token value (`--ring` from `var(--primary)` to `oklch(0.56 0.157 37.304)`), and those changes are now verified through measured rendered pixels (5.21:1 light / 4.07:1 dark, both exceeding the 3:1 WCAG AA requirement). This review judges the current tree with correct measurement data.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 4/4 | All contract strings exact, state coverage complete, pluralization consistent |
| 2. Visuals | 4/4 | Visual hierarchy preserved through semantic headings, status chips, two-column layout, exclusion markers |
| 3. Color | 4/4 | Focus ring contrast verified at WCAG AA (5.21:1 light, 4.07:1 dark); no hardcoded colors; sidebar tokens activated |
| 4. Typography | 4/4 | Micro-label unified at 0.7rem; all roles reused from existing scale; no new sizes |
| 5. Spacing | 4/4 | Sidebar width minmax(14rem, 18rem) per contract; responsive collapse at 62rem; all spacing from scale |
| 6. Experience Design | 4/4 | Loading/error/empty states complete; debounce + stale-response guard; tree auto-expand; filters functional |

**Overall: 24/24**

---

## Detailed Findings

### Pillar 1: Copywriting (4/4)

**Copy Contract Compliance:**
- Search field placeholder: `"Search"` (src/web/components/search-field.tsx:73) ✓
- Search dropdown error: `"Search is unavailable."` (search-field.tsx:93) ✓
- Search dropdown empty: `"No matches"` (search-field.tsx:101) ✓
- Search results empty heading: `"No matches for "{query}"."` (src/web/pages/search-page.tsx:192) ✓
- Search results empty body: `"Nothing in .planning/ contains that exact token or its prefix. Search does not correct typos or match approximately — check the spelling and try again."` (search-page.tsx:194–195) ✓
- Indexing state: `"Indexing…"` with helper `"Results will appear automatically once the index finishes."` (search-field.tsx:97–98) ✓
- See all results link: `"See all {total} {total === 1 ? 'result' : 'results'}"` (search-field.tsx:122) with pluralization ✓
- Tree empty state: `"Nothing here yet."` (src/web/components/tree-navigator.tsx:86, src/web/components/empty-state.tsx:6) ✓
- Traceability uncovered chip: `"Uncovered"` (src/web/pages/traceability-page.tsx:96) ✓
- Traceability mismatch chip: `"Status mismatch"` (traceability-page.tsx:88) ✓
- Traceability unresolved marker: `"Unresolved"` (traceability-page.tsx:70) ✓
- Traceability error heading: `"The traceability view could not be loaded."` (traceability-page.tsx:173) ✓
- Search results error heading: `"Search could not be loaded."` (search-page.tsx:168) ✓

**State Coverage:**
- Empty states render appropriate copy with context grounding (D-05 exact-token explanation included)
- Error states use `.notice.destructive` pattern with `role="alert"`
- Loading states render transient text without disabling inputs
- All pluralization follows English conventions (1 result vs N results, singular vs plural)

**Assessment:** Complete compliance with 03-UI-SPEC.md Copywriting Contract. Empty, error, loading, and interactive states all use exact copy with correct tone and context.

### Pillar 2: Visuals (4/4)

**Hierarchy & Structure:**
- Search results: semantic `<section>` with `<h2>` group labels (aria-labelledby) containing `<ul>` of `<article>` cards (search-page.tsx:107–109) ✓
- Search result cards: `<header>` with title link + match count chip + warning indicator (search-page.tsx:56–70) ✓
- Tree structure: native `<details>`/`<summary>` disclosure with `data-active` attribute for current-route highlighting (tree-navigator.tsx:110–112) ✓
- Exclusion nodes: `.tree-excluded` marker with aria-describedby reference to exclusion reason (tree-navigator.tsx:69–76) ✓
- Traceability table: two explicitly-headed columns ("Requirement status", "Covering phase"), side-by-side layout preserved (traceability-page.tsx:128–130) ✓
- Status markers: Uncovered and Status mismatch chips in separate table cells alongside status values (traceability-page.tsx:84–91, 94–109) ✓
- Filter controls: button-group with `data-active` state attribute on active filters (traceability-page.tsx:208–232) ✓
- Loading states: reuse existing `.roadmap-loading` skeleton, no new visual patterns (search-page.tsx:159, traceability-page.tsx:165) ✓

**Visual Priority & Focal Point:**
The four surfaces establish focal points through:
- **Search results:** group labels as organizational anchors; result title + match count as primary content scanners
- **Tree navigator:** group nodes at top level with auto-expand on route arrival; current-route highlighting via `data-active='true'`
- **Traceability table:** status columns side-by-side (disagreement signal is the dual-column design itself); uncovered requirements marked with destructive tone
- **Search field dropdown:** limited to 8 rows (D-01's "compact preview"); "See all N results" footer link as action anchor

**Assessment:** Visual structure follows 03-UI-SPEC.md semantic intent. Hierarchy is established through role-appropriate heading sizes, grouping, and status indicators. No design regressions from Phase 2 reading widths or layout patterns.

### Pillar 3: Color (4/4)

**Focus Ring Fix — Verified Rendered Contrast:**

*Root cause (pre-fix):*
1. Base layer applied `outline-ring/50` (50% alpha on --ring)
2. `index.html` pre-hydration snapshot used `:root.dark` (0,2,0 specificity), out-specifying globals.css `.dark` (0,1,0)
3. Result: dark tokens shadowed after hydration; ring appeared too faint in dark mode

*Fix Applied:*
1. `src/web/styles/globals.css` line 160: `@apply border-border outline-ring;` (opaque, no alpha)
2. `src/web/styles/globals.css` line 141 (dark block): `--ring: oklch(0.56 0.157 37.304);` (custom value, not `var(--primary)`)
3. `index.html` line 69: `.dark {` selector (0,1,0 specificity, later cascade wins over globals.css tie)
4. Explanation comment added to `index.html` documenting specificity tie-breaking

*Measured Contrast (via Playwright at 1200px, sampled rendered pixels):*
- **Light theme:** 5.21:1 (WCAG AA ✓)
- **Dark theme:** 4.07:1 (WCAG AA ✓)
- Both exceed 3:1 required minimum; compare to pre-fix 2.36:1 light / 1.93:1 dark

*Test Coverage:*
- `test/web/focus-ring-contrast.test.ts`: contrast recomputed from tokens through app's own `toMermaidColor()`, specificity guard (no `:root.dark`), snapshot token sync in both themes
- `.planning/WINDOWS.md` entry 7: marked `fixed`

**Semantic Color Usage:**
- No hardcoded product colors in Phase 3 files (grep returns 0 matches on `#[0-9a-fA-F]{3,8}` or `rgb(`)
- Sidebar tokens activated for first time: `--sidebar` background, `--sidebar-border` divider, `--sidebar-accent` hover, `--sidebar-primary` active highlight (globals.css lines 92–98 light, 147–154 dark)
- Search snippet highlights: `color-mix(in oklch, var(--primary) 9%, transparent)` matching existing `.status-chip[data-tone='active']` pattern
- Status chips use semantic `data-tone` attributes: `complete`, `quiet`, `destructive`, `warning`
- Destructive reserved for warnings/disagreements only (uncovered requirements, unresolved references, status mismatches)
- All light/dark pairs defined consistently in root and .dark blocks

**Assessment:** Focus ring fix is verified through actual rendered pixel measurements, exceeding WCAG requirements. Semantic color usage throughout; no hardcoded colors; all 60/30/10 principles maintained.

### Pillar 4: Typography (4/4)

**Unified Micro-Label Scale:**
- Token defined once at root level: `--font-size-micro-label: 0.7rem` (line 115, globals.css)
- Replaces three pre-existing `0.62rem` and three pre-existing `0.64rem` scattered declarations
- Accessibility floor met: 0.7rem = 11.2px at unmodified 16px root, clears 10px minimum
- Not theme-dependent; defined once (same as `--radius` pattern)
- Used consistently across eyebrows, status chips, micro-labels

**Role Reuse — No New Sizes:**
- Body text: 13px (0.82rem), Space Grotesk 400, line-height 1.55 — used for search input text, snippet bodies, requirement descriptions
- Label/eyebrow: 11px (0.67rem), JetBrains Mono 600, uppercase, 0.08em letter-spacing — used for group labels (search, tree, traceability categories)
- Heading (section h2/h3): 21px (1.3rem), JetBrains Mono 600 — reused for result titles, category headers
- Search result titles: 0.84rem semibold, matching existing `.metadata-panel h2` / `.requirement-list strong`

**Distribution Across Phase 3 Surfaces:**
- Search field: body text size (same as every other input in the app)
- Search results page: existing `<h1>` Display scale for page hero; group labels use eyebrow; result rows use body/heading scale
- Tree navigator: group labels use eyebrow; node labels reuse body text with `overflow-wrap: anywhere` within bounded track
- Traceability view: category headers use search-group-label (eyebrow); requirement ID + text use body + `<strong>`

**Assessment:** Zero new font sizes introduced. The unified micro-label token resolves a pre-existing scattered-values maintenance issue. All roles derived from 03-UI-SPEC.md Typography table, applied consistently without deviation.

### Pillar 5: Spacing (4/4)

**Sidebar Track Width:**
- Defined: `minmax(14rem, 18rem)` (globals.css line 424)
- Contract spec: "minmax(14rem, 18rem) for the tree (wider than the in-page outline because it carries deeper nesting)"
- Grounding: reuses established `.document-outline` pattern, scales appropriately for phase → plan/artifact nesting depth

**Responsive Collapse at 62rem:**
- Media query: `@media (max-width: 62rem)` (line 1491)
- Behavior: `.shell-content` grid changes to single-column `minmax(0, 1fr)` (line 1522)
- Sidebar handling: `.tree-navigator { display: none }` (line 1526) — collapses out entirely rather than squeezing reading column
- Alignment: mirrors existing `.shell-nav` adaptation at this breakpoint (line 1516)
- Comment: "D-09: the sidebar collapses out of the layout entirely below 62rem rather than squeezing the reading column"

**Sticky Header Height Measurement:**
- Runtime-measured via ResizeObserver, not a guessed constant (app-shell.tsx)
- Stored in CSS custom property `--shell-header-height` for use in sidebar `top` calculation
- Avoids hard-coded rem value because header height is responsive/padded, not fixed

**Spacing Scale Adherence:**
- Search result spacing: `0.5rem`, `0.75rem`, `1rem`, `1.5rem` gaps — all from contract scale
- Traceability table: standard cell padding via existing `.coverage-table-boundary` wrapper
- Tree node indentation: CSS nesting + `padding-left`, no arbitrary values
- All `minmax()` definitions use `rem` values per contract (no arbitrary `[Xpx]` or `[Xrem]` in Phase 3 components)

**Accessibility:** No arbitrary spacing introduces reflow or overflow at common viewport widths. Horizontal scroll on traceability table (`.coverage-table-boundary overflow-x-auto`) preserves column adjacency on narrow windows.

**Assessment:** Sidebar width, responsive collapse, and spacing all verified to specification. No arbitrary spacing introduces maintenance burden or accessibility risk.

### Pillar 6: Experience Design (4/4)

**Loading States:**
- Search dropdown: `isIndexing` condition shows "Indexing…" + helper text, input never disabled (search-field.tsx:53, 95–99) ✓
- Search results page: `isPending` renders `.roadmap-loading` skeleton with `aria-busy="true"` (search-page.tsx:154–161) ✓
- Traceability page: `isPending` renders skeleton (traceability-page.tsx:160–167) ✓
- Tree navigator: `isPending` returns nav element with `data-state="loading"` (tree-navigator.tsx:161) — no skeleton rows, no layout shift (D-12: "local filesystem read resolves in milliseconds") ✓

**Error States:**
- Search dropdown: `isError` renders destructive notice (search-field.tsx:91–94) ✓
- Search results: `isError` renders destructive notice with `error.message` (search-page.tsx:164–174) ✓
- Traceability: `isError` renders destructive notice (traceability-page.tsx:169–179) ✓
- Tree navigator: `isError` returns null; relies on shell's existing `.shell-notice` (tree-navigator.tsx:155) ✓

**Empty States:**
- Search dropdown: `isEmpty` renders `Combobox.Empty` with "No matches" (search-field.tsx:100–101) ✓
- Search results: `view.total === 0` renders full empty-state message (search-page.tsx:188–198) ✓
- Tree groups: render `.empty-note` "Nothing here yet." when a location has no files (tree-navigator.tsx:81–86) ✓
- Traceability with filters: "No requirements match the current filter." (traceability-page.tsx:251) ✓

**Interactive Design (D-02, D-04, D-12, D-14):**
- Search field never disabled, even while indexing (enforced via condition logic, search-field.tsx:23 comment) ✓
- Debounce: 160ms via `useState` + `useEffect` (DEBOUNCE_MS constant, search-field.tsx:10, 30–33) ✓
- Stale-response guard: TanStack Query AbortSignal on `queryKey` change (search-field.tsx:39–46) — earlier in-flight response is aborted when newer query supersedes ✓
- Keyboard navigation: Enter key commits dropdown query to `/search` page (search-field.tsx:76–80) ✓
- Tree auto-expand: ref-based imperative `open` once per reveal (tree-navigator.tsx:57–63) — never fights user's manual close ✓
- Traceability filters: callback-driven state updates (traceability-page.tsx:147–158), counts sourced from projection (view.counts.uncovered, view.counts.disagreement) ✓
- No localStorage persistence (D-12: "No localStorage persistence in v1") ✓

**Accessibility:**
- Search field: `aria-label="Search planning artifacts"` (search-field.tsx:74) ✓
- Tree nodes: `aria-describedby` on exclusion rows linking to reason text (tree-navigator.tsx:70) ✓
- Tree nav: `aria-label="Planning directory tree"` (tree-navigator.tsx:168) ✓
- Filter section: `aria-label="Filter requirements"`, filter buttons in `role="group"` (traceability-page.tsx:197–208) ✓
- Search results group: `aria-labelledby` tying list to `<h2>` (search-page.tsx:107) ✓
- Loading states: `aria-busy="true"` on main element (search-page.tsx:156, traceability-page.tsx:162) ✓
- Error notices: `role="alert"` (search-field.tsx:92, search-page.tsx:169, traceability-page.tsx:174) ✓
- Result highlighting: `<mark>` element (not dangerouslySetInnerHTML) for matched text (search-page.tsx:33) ✓

**Indexing Resilience (D-04):**
- Index construction runs background after server starts listening (search-index.ts: `setImmediate` scheduling)
- Dashboard paints before index exists (GET /api/dashboard never blocked by index construction)
- Queries typed before index ready show "Indexing…" transient, resolve automatically on completion
- No disabled inputs, no dropped queries, no lazy build that delays user's first search

**Assessment:** All six categories of interactive states (loading, error, empty, populated, partial, overflow) are present and functional. Design patterns follow existing Phase 2 conventions (skeleton reuse, `.notice.destructive` error pattern, ref-based disclosure for auto-expand). Accessibility is comprehensive — all interactive elements labeled, status changes announced, confirmation states present where appropriate.

---

## Technical Verification

**Build & Tests:**
- `npm run build` — success, 388.75 kB gzip (entry chunk)
- `npm run typecheck` — clean across both `tsconfig.server.json` and `tsconfig.web.json`
- `npm run lint` — clean (0 errors in Phase 3 scope)
- `npm test -- --run` — **596/596 tests passed** (includes 24 new tests for Phase 3: search/tree/traceability unit + integration + visual-contract assertions)

**Files Audited (Phase 3 scope):**
- `src/web/components/search-field.tsx` — Header search input with debounce + stale-response guard + Combobox
- `src/web/pages/search-page.tsx` — `/search` results page with grouping, snippets, progressive reveal
- `src/web/components/tree-navigator.tsx` — Persistent sidebar tree navigator with auto-expand on route reveal
- `src/web/pages/traceability-page.tsx` — `/traceability` dual-status requirements view with filters
- `src/web/pages/traceability-filter.ts` — DOM-free filter predicate, testable without React/JSX
- `src/web/components/app-shell.tsx` — Restructured header-over-sidebar-plus-content layout, ResizeObserver header-height measurement
- `src/web/styles/globals.css` — Search, tree, traceability CSS rules; sidebar track; responsive collapse at 62rem; focus ring fix
- `index.html` — Pre-hydration token snapshot with corrected dark selector specificity

**No Registry Safety Issues:**
- `components.json` present but no shadcn CLI-generated components in Phase 3
- No third-party registries used; all components hand-authored against `@base-ui/react` primitives
- No suspicious patterns (network access, eval, dynamic imports, environment exfiltration) in implementation

---

## Summary

Phase 3's four surfaces (search field, search results page, tree navigator, traceability view) achieve full compliance with 03-UI-SPEC.md. The focus ring fix, verified through rendered pixel measurement, ensures WCAG AA contrast in both light and dark themes (5.21:1 / 4.07:1, exceeding the 3:1 requirement). No regressions in Phase 2 reading widths, typography scale, or spatial layout. All 596 tests pass; build succeeds; code is clean.

The implementation correctly establishes visual hierarchy through semantic HTML, preserves interactive resilience (debounce, stale-response guarding, never-disabled inputs, auto-expand without fighting user toggles), and maintains accessibility throughout. The shell restructure introducing the sidebar is complete and responsive, collapsing appropriately below 62rem breakpoint without squeezing the reading column.

---

## Files Audited

- `src/web/components/search-field.tsx`
- `src/web/pages/search-page.tsx`
- `src/web/components/tree-navigator.tsx`
- `src/web/pages/traceability-page.tsx`
- `src/web/pages/traceability-filter.ts`
- `src/web/components/app-shell.tsx`
- `src/web/styles/globals.css`
- `index.html`
- `src/web/styles/globals.css` (focus ring verification: lines 85, 141, 160)
- All Phase 3 tests: `test/presentation/search.test.ts`, `test/presentation/tree.test.ts`, `test/presentation/traceability.test.ts`, `test/web/visual-contract.test.ts` (Phase 3 regions)

---

*Phase: 03-search-browsing-traceability*  
*Final audit: 2026-09-10*
