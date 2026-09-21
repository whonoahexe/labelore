---
phase: quick-260916-vjt
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/web/pages/list-pagination.ts
  - test/web/list-pagination.test.ts
  - src/web/pages/roadmap-page.tsx
  - src/web/styles/globals.css
  - test/web/requirement-pagination-contract.test.ts
autonomous: true
requirements: [VJT-01, VJT-02, VJT-03]

estimate:
  tokens: 45000
  raw_tokens: 45000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "Opening a phase's `Details and plans` disclosure on the roadmap page shows at most 4 requirement cards at once, however many requirement IDs that phase declares (VJT-01)"
    - "Prev/next controls appear only when a phase declares 5 or more requirements — a phase with 4 or fewer renders exactly as it does today, with no nav element and no visual change (VJT-03)"
    - "The nav states the visible window against the total and the page position, disables prev on the first page, and disables next on the last (VJT-01)"
    - "Each phase paginates independently: advancing one phase's requirement window leaves every other phase's window untouched (VJT-01)"
    - "Page state that falls outside the available range clamps to a real page instead of rendering an empty list (VJT-03)"
    - "Every control is a real focusable button with a screen-reader label, and each phase's nav carries its own distinct accessible name (VJT-02)"
    - "The controls read as the same component as the dashboard's Needs-attention pagination, achieved by extending that rule set's selectors — no new CSS declaration and therefore no new raw value enters globals.css (VJT-02)"
    - "test/token-guard.test.ts and test/web/visual-contract.test.ts stay green, and no assertion in either file is edited (VJT-02)"
  artifacts:
    - path: "src/web/pages/list-pagination.ts"
      provides: "Pure, generic page-window helper — clamps the requested page and returns the visible slice plus the 1-based window bounds"
    - path: "test/web/list-pagination.test.ts"
      provides: "Unit coverage of the helper's boundaries (empty, exact multiple, remainder, below-range, above-range) plus source assertions that roadmap-page.tsx consumes it at page size 4"
    - path: "src/web/pages/roadmap-page.tsx"
      provides: "PhaseFlow requirement section rendering one 4-item window with its own per-phase page state and prev/next nav"
    - path: "src/web/styles/globals.css"
      provides: "The existing attention-pagination rule set extended to cover the requirement-pagination class names"
    - path: "test/web/requirement-pagination-contract.test.ts"
      provides: "Stylesheet-source assertions pinning the shared-selector arrangement, kept out of the already-dirty visual-contract.test.ts"
  key_links:
    - from: "src/web/pages/roadmap-page.tsx PhaseFlow"
      to: "src/web/pages/list-pagination.ts"
      via: "paginate() called with the phase's requirement array and the module-level page size constant"
      pattern: "paginate\\(phase\\.requirements"
    - from: "src/web/pages/roadmap-page.tsx nav markup"
      to: "src/web/styles/globals.css"
      via: "requirement-pagination class name, added to the selector list of the rules that already style the dashboard's pagination"
      pattern: "requirement-pagination"
    - from: "src/web/styles/globals.css requirement-pagination selectors"
      to: "src/web/styles/globals.css attention-pagination declarations"
      via: "comma-grouped selector reusing the existing token-based declarations verbatim — the reason no new value is introduced"
      pattern: "\\.attention-pagination button,"
---

# Quick 260916-vjt: Paginate the roadmap requirement list, 4 at a time

<objective>
Show a phase's requirements four at a time on the roadmap page, with prev/next controls that look and behave like the pagination already shipped on the dashboard's Needs-attention list.

Purpose: a phase that declares many requirement IDs currently renders every one of them as a bordered card inside the `Details and plans` disclosure, pushing the wave stack — the part a reader actually navigates to — far below the fold. Four at a time keeps the section a fixed height.

Output: one new pure helper module with unit coverage, a paged requirement section in `PhaseFlow`, and the dashboard's pagination rule set extended to the new class names.

Task-local requirement IDs:
- VJT-01: at most 4 requirement cards visible at once, with working prev/next and per-phase state.
- VJT-02: controls match the dashboard's pagination visual language and accessibility shape, with no new CSS values.
- VJT-03: phases with 4 or fewer requirements are visually unchanged; out-of-range page state cannot produce an empty list.

## Live observations this plan is authorized from

Every path and selector below was read from the working tree at planning time — do not substitute assumed locations.

- There is no `requirement-list` component file. The list is inline markup in `src/web/pages/roadmap-page.tsx`, inside the `PhaseFlow` function, in the `<section aria-labelledby={`${phase.key}-requirements`}>` block (`<ul className="requirement-list">` mapping `phase.requirements`). `PhaseFlow` is already a hook-using component, so page state has a home.
- The exact pattern to mirror already exists: `src/web/pages/dashboard-page.tsx` paginates its attention list at `const ATTENTION_PAGE_SIZE = 4` with `useState(1)`, a clamp (`Math.min(Math.max(1, page), total || 1)`), a `slice`, and a `<nav className="attention-pagination">` holding `Showing {start}–{end} of {total}`, a prev button, a `.attention-page-status` counter, and a next button. Reuse this shape rather than inventing one.
- `phase.requirements` is typed in `src/presentation/roadmap.ts` as `Array<{ id: string; text: string | null; checked: boolean | null; url: string | null }>`.
- Tests are Node-only: `vitest.config.ts` sets `include: ['test/**/*.test.ts']` (no `.tsx`), and there is no jsdom or testing-library dependency. Component behavior therefore cannot be render-tested — hence a pure helper module plus source assertions, the same arrangement `test/web/scroll-settle.test.ts` uses.
- `test/token-guard.test.ts` rejects raw spacing/type/color values outside the token block and fails on stale allowlist entries keyed by exact `selector + property + value`. Its allowlist contains no `attention-pagination` entry, so regrouping those selectors cannot make an entry stale. Baseline confirmed green: `npx vitest run test/token-guard.test.ts test/web/visual-contract.test.ts` → 84 passed.
- The pagination rule set in `src/web/styles/globals.css` occupies these exact selector lines (locate by text, not line number — the file has uncommitted edits): `.attention-pagination {`, `.attention-pagination-actions {`, `.attention-page-status {`, `.attention-pagination button {`, `.attention-pagination button:hover:not(:disabled) {`, `.attention-pagination button:disabled {`, `.attention-pagination button svg {`, plus a second `.attention-pagination {` inside the narrow-viewport `@media` block near the end of the file.
- `src/web/styles/globals.css` and `test/web/visual-contract.test.ts` carry pre-existing uncommitted changes from an unrelated reverted-then-reattempted scrollbar task. Edit globals.css on top of that working-tree state and leave those hunks alone; do not touch `test/web/visual-contract.test.ts` at all.
- The richest fixture, `fixtures/dense/.planning/ROADMAP.md`, declares at most 3 requirement IDs on a phase — below the threshold, so the nav will not appear there without a temporary local edit, and `test/__golden__/dense.json` pins that fixture (any fixture edit must be reverted before committing).
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./.claude/CLAUDE.md

@src/web/pages/roadmap-page.tsx
@src/web/pages/dashboard-page.tsx
@src/web/pages/scroll-settle.ts
@test/web/scroll-settle.test.ts
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Page the requirement list end-to-end at four per page</name>
  <files>src/web/pages/list-pagination.ts, test/web/list-pagination.test.ts, src/web/pages/roadmap-page.tsx</files>
  <read_first>
    - `src/web/pages/dashboard-page.tsx` lines 90-130 and 240-300 — the page-size constant, the clamp arithmetic, and the nav markup this task mirrors.
    - `src/web/pages/roadmap-page.tsx` lines 24-60 (PhaseFlow's existing hooks) and 131-150 (the requirement section being replaced).
    - `test/web/scroll-settle.test.ts` lines 1-25 — the house style for a test file that mixes pure-logic cases with `source()` assertions.
    - `src/presentation/roadmap.ts` around the `requirements:` field — the element shape the helper will be instantiated with.
  </read_first>
  <behavior>
    Unit cases for `paginate(items, page, pageSize)` in `test/web/list-pagination.test.ts`, written and failing before the helper exists:
    - 7 items, page 1, size 4 → 4 visible items (the first four), `page` 1, `totalPages` 2, `start` 1, `end` 4, `total` 7.
    - 7 items, page 2, size 4 → 3 visible items (the last three), `start` 5, `end` 7.
    - 8 items, page 2, size 4 → 4 visible items, `start` 5, `end` 8, `totalPages` 2 (exact-multiple boundary produces no trailing empty page).
    - 3 items, page 1, size 4 → all 3 visible, `totalPages` 1, `start` 1, `end` 3.
    - 0 items, page 1, size 4 → 0 visible, `totalPages` 0, `start` 0, `end` 0 (an empty list reports an empty window rather than `1–0 of 0`).
    - 7 items, page 9, size 4 → clamps to the last page: 3 visible items, `page` 2 (VJT-03).
    - 7 items, page 0 and page -3, size 4 → clamps to the first page: 4 visible items, `page` 1 (VJT-03).
    - Generic over element type: a call with the requirement element shape (`{ id, text, checked, url }`) type-checks and returns that same element type.
  </behavior>
  <action>
Create `src/web/pages/list-pagination.ts` exporting a pure generic function `paginate` and its result interface (export the interface too, so the page can annotate). Signature: `paginate<T>(items: readonly T[], page: number, pageSize: number)` returning `{ items: T[]; page: number; totalPages: number; start: number; end: number; total: number }`, where `start`/`end` are 1-based inclusive window bounds for display and collapse to `0`/`0` when `items` is empty. Derive `totalPages` with `Math.ceil`, clamp the requested page into `[1, totalPages]` (guarding the zero-total case), then slice. No React import, no side effects — this module must stay importable by a Node-only vitest file.

Add `test/web/list-pagination.test.ts` covering every case in the behavior block, plus `source()`-style assertions (copy the `readFile` + `new URL('../../' + path, import.meta.url)` helper from `test/web/scroll-settle.test.ts`) against `src/web/pages/roadmap-page.tsx` proving the wiring: the file imports from `./list-pagination.ts`, declares a page-size constant whose value is `4`, calls `paginate` with the phase requirement array, and renders the `requirement-pagination` class name and the two control labels. Keep these as positive `toContain` assertions only — do not add negative greps against code literals.

Then rewire the requirement section of `PhaseFlow` in `src/web/pages/roadmap-page.tsx`:
- Add a module-level `const REQUIREMENT_PAGE_SIZE = 4;` near the top of the file (mirroring `ATTENTION_PAGE_SIZE` in dashboard-page.tsx) and import `useState` alongside the existing React hook imports.
- Inside `PhaseFlow`, add `const [requirementPage, setRequirementPage] = useState(1);` and compute the window with `paginate(phase.requirements, requirementPage, REQUIREMENT_PAGE_SIZE)`. State lives in `PhaseFlow`, which `MilestoneTree` already renders keyed by `phase.key`, so each phase gets its own independent window for free — do not lift this state up.
- Map the returned window instead of the full array; the `<li>` contents (id `<strong>`, optional text `<span>`, optional `Read requirement` link with its `ExternalLink` icon) stay byte-identical, as does the `<ul className="requirement-list">` element and the surrounding `<section aria-labelledby>`/`<h4>`/`EmptyState` structure.
- After the `</ul>`, render the nav only when the window reports more than one page, wrapping list and nav in a fragment the way dashboard-page.tsx does. Structure the nav as `<nav className="requirement-pagination" aria-label={...}>` whose accessible name includes the phase number so every phase's nav is distinctly named (for example `Requirements pagination for Phase {phase.number}`); inside it a span stating the window against the total in the dashboard's wording and en-dash, then `<div className="requirement-pagination-actions">` holding a `Previous page`-labeled button with `ChevronLeft`, a `<span className="requirement-page-status" aria-live="polite">` counter, and a `Next page`-labeled button with `ChevronRight`. Disable each button at its end of the range. Import `ChevronLeft` from lucide-react; `ChevronRight` is already imported and is also used by the disclosure summary, so add nothing there.
- Advance and retreat with the same functional-update clamps dashboard-page.tsx uses, so the state can never run past the range even if the requirement array changes underneath it.

Leave the success-criteria section, the wave stack, the deep-link `useEffect`, and every other part of the file untouched. This task is the whole vertical slice: helper, wiring, and controls that work unstyled — Task 2 only makes them match the dashboard's appearance.
  </action>
  <verify>
    <automated>npx vitest run test/web/list-pagination.test.ts && npm run typecheck</automated>
  </verify>
  <done>The unit cases all pass (they failed before the helper existed), typecheck is clean, and a phase declaring more than four requirement IDs renders four cards plus working prev/next controls whose disabled states track the range ends.</done>
  <reversibility rating="reversible">New module plus a localized markup change in one component; revertible with a single `git revert`.</reversibility>
</task>

<task type="auto">
  <name>Task 2: Give the controls the dashboard's appearance without adding a single CSS value</name>
  <files>src/web/styles/globals.css, test/web/requirement-pagination-contract.test.ts</files>
  <read_first>
    - `src/web/styles/globals.css` — the eight selector lines listed under "Live observations" (find them by searching for `attention-pagination`, since the file has uncommitted edits and line numbers have drifted).
    - `test/web/visual-contract.test.ts` lines 1-30 — read only for its `source()` and `ruleBlocks()` helpers, which the new test file copies. Do not edit this file.
    - `test/token-guard.test.ts` lines 513-560 — the allowlist shape, to confirm no entry names an `attention-pagination` selector.
  </read_first>
  <action>
Extend the existing pagination rule set in `src/web/styles/globals.css` to cover the new class names by turning each of its selectors into a comma-grouped selector, adding the requirement counterpart on its own line. Apply this to all eight sites: the base `.attention-pagination`, `.attention-pagination-actions`, `.attention-page-status`, `.attention-pagination button`, `.attention-pagination button:hover:not(:disabled)`, `.attention-pagination button:disabled`, `.attention-pagination button svg`, and the `.attention-pagination` rule inside the narrow-viewport `@media` block. The requirement counterpart of `.attention-page-status` is `.requirement-page-status`; the rest take `.requirement-pagination` in place of `.attention-pagination`.

Grouping — rather than writing a parallel block — is the point of this task: the button geometry, the disabled opacity, and the transition timing in those declarations are values that a duplicated block would have to re-spell, which is exactly what this project's token rule forbids. Change no declaration body, add no declaration, and introduce no new value of any kind. If the controls still need a spacing correction after Task 1 (for example the section's top padding reading too loose inside the denser `phase-detail-grid`), express it as a separate small `.requirement-pagination` rule that reads only existing `var(--space-*)` tokens; add it only if the visual check in Task 3 actually calls for it, and only with a token.

Add `test/web/requirement-pagination-contract.test.ts` — a new file, so the already-dirty `test/web/visual-contract.test.ts` is left alone. Copy its `source()` and `ruleBlocks()` helpers, and assert positively that each of the eight grouped selectors exists in the stylesheet and that the grouped `button` rule still carries the border, background, and color declarations it had before, so the two class names cannot silently drift apart. Assert the roadmap page's three requirement-pagination class names appear in `src/web/pages/roadmap-page.tsx`. Do not restate the token rule here as a negative grep — `test/token-guard.test.ts` already enforces it stylesheet-wide and is part of the gate below.
  </action>
  <verify>
    <automated>npx vitest run test/web/requirement-pagination-contract.test.ts test/token-guard.test.ts test/web/visual-contract.test.ts</automated>
  </verify>
  <done>The requirement nav renders in the dashboard's pagination styling; the grouped-selector assertions pass; token-guard and visual-contract are both still green with no assertion in either edited.</done>
  <reversibility rating="reversible">Selector-list edits to existing rules plus one new test file.</reversibility>
</task>

<task type="auto">
  <name>Task 3: Full-suite regression sweep and visual confirmation</name>
  <files>src/web/pages/roadmap-page.tsx, src/web/styles/globals.css</files>
  <action>
Run the whole gate and fix anything the first two tasks disturbed: `npm test`, `npm run typecheck`, `npm run lint`, and a formatting pass over only the files this plan touched (`npx prettier --check` on the five paths in `files_modified`, then `--write` if it reports a diff). The 100-column print width is the likely nit in the nav markup — dashboard-page.tsx has a line that runs long in the same spot.

Pay attention to two specific regression surfaces. First, `test/web/shell-contract.test.ts` asserts strings present in and absent from `src/web/pages/roadmap-page.tsx`; the added nav must not reintroduce any phrase it forbids. Second, `git status` must show no change to `fixtures/` or `test/__golden__/` when this task finishes — if the visual confirmation below temporarily edited a fixture, that edit is reverted before the commit.

Leave the pre-existing uncommitted hunks in `src/web/styles/globals.css` and `test/web/visual-contract.test.ts` exactly as they were found. They belong to an unrelated reverted scrollbar task; do not stage them as part of this work beyond the pagination selectors added in Task 2.
  </action>
  <verify>
    <automated>npm test && npm run typecheck && npm run lint && npx prettier --check src/web/pages/list-pagination.ts test/web/list-pagination.test.ts src/web/pages/roadmap-page.tsx src/web/styles/globals.css test/web/requirement-pagination-contract.test.ts</automated>
    <human-check>Start the dev server against the dense fixture (`node src/server/index.ts fixtures/dense`) and open the roadmap page. With the fixture as-is — 3 requirement IDs on its richest phase — confirm the requirement section looks exactly as it did before this change, with no nav element (VJT-03). Then, to see the paged state, temporarily append two extra IDs to the `**Requirements**:` line of that phase in `fixtures/dense/.planning/ROADMAP.md`, reload, and confirm: four cards visible, the nav reading its window against the total, prev disabled on page 1, next disabled on the last page, the counter updating, tab-reachable buttons, and controls indistinguishable from the dashboard's Needs-attention pagination in both light and dark. Confirm paging one phase does not move another phase's window. Then `git checkout -- fixtures/dense/.planning/ROADMAP.md` — `test/__golden__/dense.json` pins that fixture and a leftover edit would fail the golden test.</human-check>
  </verify>
  <done>`npm test`, typecheck, lint, and the format check all pass; `git status` shows only this plan's five files changed (plus the pre-existing unrelated hunks); the visual pass confirms both the paged and the unchanged-under-four states.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none new) | This change slices and renders an array the client already holds. The data crossed its trust boundary earlier, at the existing `/api/roadmap` fetch and the server-side `.planning/` read; no request, parameter, route, or filesystem path is introduced, and page state is component-local React state that never reaches a URL or the server. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-vjt-01 | Denial of Service | `paginate()` in `src/web/pages/list-pagination.ts` | low | mitigate | Out-of-range or negative page values clamp into the valid range instead of slicing past the array or yielding a negative offset, so no page state can render an empty or broken requirement section. Covered by the below-range/above-range unit cases in Task 1 (VJT-03). |
| T-vjt-02 | Information Disclosure | requirement `<li>` contents | low | accept | The card contents (id, text, link) are rendered through the identical JSX as before — React escapes them as it already does, and pagination neither adds a rendering path nor reveals any field that was not already on screen. No new exposure to mitigate. |
| T-vjt-03 | Tampering | dependency surface | low | accept | No package is installed by this plan — `paginate` is a hand-written pure function and `ChevronLeft` comes from the already-installed lucide-react. With no package-manager install task in scope, the Package Legitimacy Gate does not apply and no audit table is required. |

ASVS level 1, block-on `high`: nothing in this register reaches `high`, so no security gate blocks this plan.
</threat_model>

<verification>
- `npx vitest run test/web/list-pagination.test.ts` — helper boundaries and clamping (VJT-01, VJT-03).
- `npx vitest run test/web/requirement-pagination-contract.test.ts` — the grouped-selector arrangement and the page's class names (VJT-02).
- `npx vitest run test/token-guard.test.ts test/web/visual-contract.test.ts` — the token rule and the existing visual contract survive the stylesheet edit, with no assertion in either file changed (VJT-02).
- `npm test && npm run typecheck && npm run lint` — full-suite, type, and lint regression gate, including `test/web/shell-contract.test.ts`'s source assertions on roadmap-page.tsx.
- `git status` reports no modification under `fixtures/` or `test/__golden__/`.
</verification>

<success_criteria>
- A phase declaring 5 or more requirement IDs shows exactly 4 requirement cards with working prev/next controls; a phase declaring 4 or fewer is byte-identical to today with no nav rendered.
- Page state is per phase and cannot leave the valid range.
- The controls carry screen-reader labels, per-phase distinct nav names, and the dashboard's pagination styling — reached by extending that rule set, so `git diff src/web/styles/globals.css` shows selector-line additions and no new declaration or value beyond the pre-existing unrelated hunks.
- All four commands in `<verification>` pass.
</success_criteria>

<output>
Create `.planning/quick/260916-vjt-add-pagination-to-the-requirement-list-c/260916-vjt-SUMMARY.md` when done
</output>
</content>
</invoke>
