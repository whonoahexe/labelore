---
phase: quick-260916-qqk
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/web/styles/globals.css
  - test/web/visual-contract.test.ts
autonomous: true
requirements: [QQK-01, QQK-02, QQK-03]

estimate:
  tokens: 38000
  raw_tokens: 25000
  tasks: 1
  confidence: low

must_haves:
  truths:
    - "No scroll container in the app reserves a layout gutter at rest — including the root page scroller, whose width is the layout change the request names (QQK-01)"
    - "The root page scrollbar is never painted, at rest or on hover, in either engine, and the page still scrolls by wheel, keyboard, and touch (QQK-01, QQK-03)"
    - "Each bounded scroll container paints a 6px bar only while hovered or holding focus, and paints nothing at rest: .tree-navigator, .document-outline, .search-dialog-results, .coverage-table-boundary, pre, table, .mermaid/.mermaid-fallback, plus the .overflow-x-auto/.table-scroll/.code-scroll utilities (QQK-03)"
    - "The painted thumb is strictly more transparent than before at every site — no rule paints a solid var(--muted-foreground) thumb or a filled var(--muted) track any more (QQK-02)"
    - "Exactly two named thumb recipes exist, both declared in the :root token block and consumed only through var(); test/token-guard.test.ts reports zero violations and no duplicated color-mix recipe (QQK-02)"
    - "scroll-behavior: smooth on html, every overscroll-behavior* declaration, and every overflow-x/overflow-y declaration survive the edit untouched (QQK-01)"
    - "The four legacy scrollbar-styling sites carry no scrollbar declarations afterwards — html, .tree-navigator, the pre/table/.mermaid group, and the .artifact-document pre block with its five WebKit rules (QQK-01, QQK-03)"
    - "The change is CSS-only: no .tsx file is modified, no overflow: overlay is introduced, and no JavaScript participates in the reveal (QQK-03)"
  artifacts:
    - path: "src/web/styles/globals.css"
      provides: "One consolidated scrollbar block — universal zero-space rest state, hover/focus reveal scoped to bounded containers, and the two named thumb tokens"
    - path: "test/web/visual-contract.test.ts"
      provides: "Region-scoped source assertions pinning the new rest/reveal contract, replacing the two tests that named the removed .artifact-document pre scrollbar selectors"
  key_links:
    - from: "src/web/styles/globals.css reveal rule"
      to: "src/web/styles/globals.css ::-webkit-scrollbar rule"
      via: "--scrollbar-size custom property — set to 6px on the hovered/focused container, read by the unscoped WebKit sizing rule with a 0px fallback"
      pattern: "var\\(--scrollbar-size, 0px\\)"
    - from: "src/web/styles/globals.css usage sites"
      to: "src/web/styles/globals.css :root token block"
      via: "--scrollbar-thumb (Firefox scrollbar-color + WebKit thumb) and --scrollbar-thumb-strong (WebKit thumb:hover) consumed by var(), never re-spelled as a color-mix at a usage site"
      pattern: "--scrollbar-thumb-strong"
    - from: "@layer base * rule"
      to: "every scroll container in the app"
      via: "scrollbar-width: none declared on every element so the rest state holds regardless of whether scrollbar-* inherits — the codebase's prior comment asserted it does not"
      pattern: "scrollbar-width: none"
---

# Quick 260916-qqk: Scrollbars take no space, sit at lower opacity, and appear only on hover

<objective>
Make every scrollbar in the app consume zero layout space at rest and surface — faintly — only while its container is hovered or holds focus.

Purpose: the current bars are always-on OS-weight controls. The root page bar reserves a gutter and paints a filled `var(--muted)` track with a solid `var(--muted-foreground)` thumb, which visibly shifts the layout and reads as chrome from a different application. Four sites style scrollbars today with three different recipes; one consolidated block replaces all of them.

Output: one commented scrollbar block in `src/web/styles/globals.css` (rest state, reveal state, thumb colours), two new `:root` tokens, four legacy sites stripped, and `test/web/visual-contract.test.ts` re-pinned to the new contract.

Task-local requirement IDs:
- QQK-01: zero layout space at rest, site-wide, root scroller included.
- QQK-02: decreased thumb opacity, expressed as named tokens.
- QQK-03: reveal on hover/focus only, for bounded containers.

## Decisions this plan locks (no CONTEXT.md — these were Claude's discretion, recorded so execution is deterministic)

- **D-01 — The rest state is universal, not enumerated.** `scrollbar-width: none` goes on the `@layer base` `*` rule and `::-webkit-scrollbar { width: var(--scrollbar-size, 0px); height: var(--scrollbar-size, 0px) }` goes on an unscoped pseudo-element rule. Consequence, accepted deliberately: a scroll container not named in the reveal list (a future `@base-ui` popup body, say) gets zero space and no visible bar at all, and joining the reveal list later is a one-selector edit. This is why the request's "throughout the site" is satisfied without enumerating eight selectors six times.

- **D-02 — The root `html` scroller is excluded from the reveal, permanently hidden.** Gating the page bar on `:hover` is meaningless: the pointer is over `html` whenever it is in the window, so a hover-gated page bar is a permanently visible page bar — exactly the status quo being removed. And revealing a native bar on the root scroller reflows the whole page, which is the layout change the request names. So the page bar is never painted. Page scrolling by wheel, keyboard, and touch is untouched; no `overflow: hidden` is introduced anywhere.

- **D-03 — Thumb opacity drops at every site; two named tokens carry it.** `--scrollbar-thumb` moves from `var(--muted-foreground) 45%` to `30%`, and a new `--scrollbar-thumb-strong` at `55%` replaces today's escalate-to-solid `var(--muted-foreground)` for direct thumb hover. Both are strict decreases: the four sites that painted a solid thumb and a filled `var(--muted)` track drop to 30%, and the one site already at 45% drops to 30% with its engaged ceiling falling from 100% to 55%. Firefox has no thumb-hover selector, so `-strong` is WebKit-only and Firefox holds `--scrollbar-thumb` throughout — an acceptable engine asymmetry, not a defect.

- **D-04 — The revealed bar is 6px and it is a native classic scrollbar.** 6px matches the existing `.artifact-document pre` precedent. Accepted trade-off, stated plainly because it cannot be engineered away in CSS: a native scrollbar always occupies content-box space while visible, so during hover the hovered container's own content narrows (vertical) or the block grows (horizontal) by 6px. That is a container-local effect confined to the element under the pointer — never a page-level shift, and never present at rest, which is what the request is actually about. Rows in `.tree-navigator` and `.search-dialog-results` already ellipsize, so they shift an ellipsis rather than re-wrapping.

- **D-05 — No `overflow: overlay` (deprecated, inconsistent in current Chromium) and no JavaScript.** A true zero-space overlay bar would require a faux scrollbar driven by scroll events; that is out of scope for a presentational change and would mean touching `.tsx`. Nothing in this plan modifies a component.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/web/styles/globals.css
@test/web/visual-contract.test.ts
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Replace four legacy scrollbar sites with one zero-space, hover-revealed block</name>
  <files>src/web/styles/globals.css, test/web/visual-contract.test.ts</files>
  <read_first>
    - `src/web/styles/globals.css` lines 97-111 (named colour recipe block, `--scrollbar-thumb` and its rationale comment), 245-257 (`@layer base` `*` and `html` rules), 604-614 (`.tree-navigator`), 1847-1862 (generic overflow group and the `pre, table, .mermaid` scrollbar-width rule), 2213-2216, 2291-2294, 2754-2761, 2931-2969 (`.artifact-document pre` and its five WebKit rules), 3235-3241
    - `test/web/visual-contract.test.ts` lines 13-28 (the `ruleBlocks` helper this file's assertions are built on), 83-88, 418-434 (the two tests naming the removed selectors)
    - `test/token-guard.test.ts` lines 474-501 (the recurring-recipe check: a `color-mix()` at a usage site is a violation if it duplicates a token definition value or occurs twice — this is why both thumb colours must be `var()` references)
  </read_first>
  <behavior>
    Assertions to write into `test/web/visual-contract.test.ts` before editing the stylesheet, all region-scoped through the existing `ruleBlocks` helper (never a whole-file grep for a declaration literal):
    - Test 1 (rest state, Firefox): the `@layer base` `*` rule body declares `scrollbar-width: none` and `scrollbar-color: var(--scrollbar-thumb) transparent`.
    - Test 2 (rest state, WebKit): the `::-webkit-scrollbar {` rule body declares both `width: var(--scrollbar-size, 0px)` and `height: var(--scrollbar-size, 0px)`.
    - Test 3 (reveal): the CSS contains one rule whose selector carries both `:hover` and `:focus-within`, naming all eleven bounded containers, whose body declares `--scrollbar-size: 6px` and `scrollbar-width: thin`.
    - Test 4 (thumb colours): the `::-webkit-scrollbar-thumb {` body resolves its background through `var(--scrollbar-thumb)`; the `::-webkit-scrollbar-thumb:hover {` body resolves through `var(--scrollbar-thumb-strong)`; both tokens are declared in `:root` and neither is re-spelled as a `color-mix()` at any usage site.
    - Test 5 (legacy sites cleared): every `html {`, `.tree-navigator {`, `.mermaid {`, and `.artifact-document pre {` rule body is free of the substring `scrollbar`.
    - Test 6 (nothing unrelated lost): the `html {` body still declares `scroll-behavior: smooth`; the `.tree-navigator {` body still declares `overflow-y: auto` and `overscroll-behavior: contain`; the `.mermaid {`-terminated overflow group still declares `overflow-x: auto` and `overscroll-behavior-inline: contain`.
    Test 5's negative substring is the reason the stylesheet edit must delete the explanatory comments that currently sit inside those rule bodies, not only their declarations.
  </behavior>
  <action>
    Rewrite the two existing tests in `test/web/visual-contract.test.ts` that name now-removed selectors, then make the stylesheet edits.

    Tests: the test at line 83 (`draws a visible cross-browser scrollbar on fenced code blocks`) and the test at line 419 (`draws a thin code scrollbar that strengthens once the block is engaged`) both assert `.artifact-document pre::-webkit-scrollbar`, `...-thumb`, `...-thumb:hover` with `var(--muted-foreground)`, and `.artifact-document pre:focus-within::-webkit-scrollbar-thumb`. All four selectors cease to exist. Replace both tests with the six assertions in `<behavior>`, renaming them to describe the new contract (rest state takes no space; the bar surfaces on engagement at reduced opacity). Keep the file's existing conventions: `source()` for reading, `ruleBlocks()` for region scoping, a short comment recording *why* each claim matters. Do not write the literal `scrollbar` into any comment placed inside one of the four rule bodies Test 5 negative-greps.

    Stylesheet, step 1 — tokens (`:root`, near line 107, per D-03): change `--scrollbar-thumb` to `color-mix(in oklch, var(--muted-foreground) 30%, transparent)` and add `--scrollbar-thumb-strong: color-mix(in oklch, var(--muted-foreground) 55%, transparent)`. Rewrite the rationale comment at lines 97-101 — it currently says `--scrollbar-thumb` recurs at the Firefox `scrollbar-color` and the `.artifact-document pre` WebKit thumb; it now recurs at the universal `*` rest rule and the unscoped WebKit thumb rule, and its sibling covers the WebKit-only direct-thumb-hover state. Neither token gets a `.dark` override: both derive from `var(--muted-foreground)`, which is already per-theme. Check that neither new value equals another token's value in both themes — `token-guard`'s palette Check 1 fails on two tokens holding identical values.

    Stylesheet, step 2 — universal rest state (per D-01): add `scrollbar-width: none` and `scrollbar-color: var(--scrollbar-thumb) transparent` to the existing `@layer base` `*` rule (line 246), leaving its `@apply` and `box-sizing` alone. Declare on `*` rather than on `html` deliberately: the codebase's own comment at line 610 asserts `scrollbar-*` does not inherit while the spec says it does, and declaring on every element makes the rest state true under either reading. Add a comment above the `*` rule recording that. Then strip `scrollbar-color` and `scrollbar-width` from the `html` rule (lines 254-255), leaving `max-width`, `background`, and `scroll-behavior: smooth` exactly as they are.

    Stylesheet, step 3 — clear the remaining legacy sites: delete `scrollbar-color` and `scrollbar-width` from `.tree-navigator` (lines 612-613) **and delete the two-line comment at 610-611 that explains them** (it names `scrollbar-*`, which Test 5 forbids in that body), keeping `min-height`, `overflow-y`, and `overscroll-behavior`. Delete the entire `pre, table, .mermaid { scrollbar-width: thin }` rule at lines 1858-1862, leaving the overflow group at 1847-1856 untouched. Delete the whole `.artifact-document pre` scrollbar region at lines 2940-2969 — its leading three-line comment, the `scrollbar-width`/`scrollbar-color` rule, `::-webkit-scrollbar`, `::-webkit-scrollbar-track`, `::-webkit-scrollbar-thumb`, the three-selector thumb-hover rule, and `:focus-within` — while leaving the `.artifact-document pre` visual rule at 2931-2938 (padding, border, background, font) completely intact.

    Stylesheet, step 4 — the consolidated block, placed where the deleted rule at 1858-1862 stood so it sits with the generic overflow group. Lead it with a comment carrying D-01 through D-04 in three or four lines: zero space at rest everywhere; revealed only on engagement; the root scroller deliberately never reveals and why; a native bar occupies content-box space while visible, which is why the reveal is scoped to bounded containers. Then five rules:
    (a) `::-webkit-scrollbar` — `width: var(--scrollbar-size, 0px)` and `height: var(--scrollbar-size, 0px)`. The `0px` fallback is the rest state, and it is also the failure mode: if a container is never hovered, or if the custom property does not reach the pseudo-element, the bar stays collapsed rather than falling back to the default OS width. Write `0px`, not `0` — a bare zero is not a valid `var()` fallback for a length here.
    (b) `::-webkit-scrollbar-track, ::-webkit-scrollbar-corner` — `background: transparent`.
    (c) `::-webkit-scrollbar-thumb` — `background: var(--scrollbar-thumb)` and `border-radius: 0` (squared corners, per the project's visual language).
    (d) `::-webkit-scrollbar-thumb:hover` — `background: var(--scrollbar-thumb-strong)`.
    (e) the reveal, one rule: `:is(.tree-navigator, .document-outline, .search-dialog-results, .coverage-table-boundary, .overflow-x-auto, .table-scroll, .code-scroll, pre, table, .mermaid, .mermaid-fallback):is(:hover, :focus-within)` declaring `--scrollbar-size: 6px` and `scrollbar-width: thin`. Two reasons for this shape: the `:is()` list appears exactly once instead of being re-spelled per rule, and `:is()` is confined to a plain element rule — do **not** append `::-webkit-scrollbar` to an `:is()` selector, which is why rule (a) is unscoped and the size travels by custom property instead. The rule must be unlayered (outside `@layer base`) so it beats the layered `*` rest state regardless of specificity. `:focus-within` is what makes a keyboard user tabbing through `.document-outline` or `.search-dialog-results` see the bar.

    Bare `pre` and `table` in the list intentionally cover `.artifact-document pre`, `.artifact-document table`, and `.coverage-table-boundary table`; `.coverage-table-boundary` is listed separately because it, not its table, is the scroller, and `:hover` matching ancestors means hovering the table reveals the boundary's bar. Do not add a class to any `.tsx` file — every selector in the list already exists in the stylesheet.
  </action>
  <verify>
    <automated>cd /home/cinedise/gsd-lore && npx vitest run test/web/visual-contract.test.ts test/token-guard.test.ts && npm test && npm run lint</automated>
    <human-check>
      Source-text assertions cannot prove a bar is unpainted or that a gutter is gone; only an engine can. This is the same split `test/web/visual-contract.test.ts` already documents at its top, where perceptual claims are handed to a human gate.

      Start the dashboard with `npm run dev -- /home/cinedise/gsd-lore` and check, in light and dark:
      1. Page scroll (D-02): the right edge of a long page shows no bar and no reserved gutter, at rest and with the pointer anywhere in the window. The page still scrolls by wheel, arrow keys, and Space/PageDown — nothing became unscrollable.
      2. No layout shift (QQK-01): content sits flush to the viewport edge, and moving between a short page and a long one no longer jogs the layout horizontally.
      3. Reveal (QQK-03): hovering each of these paints a thin bar that disappears on exit — a wide fenced code block on an artifact page, a wide table, the coverage matrix on a plan-pair page, the on-this-page outline, the sidebar drawer's file tree, the search dialog's result list. Tab into the outline and the search results: the bar appears on keyboard focus too.
      4. Opacity (QQK-02): the revealed thumb reads as faint against both `var(--background)` and the code block's `var(--secondary)` — present but quiet, clearly lighter than the old solid bar — and strengthens enough to feel grabbable when the pointer sits directly on it.
      5. D-01 consequence: the sidebar drawer and the search dialog (both `@base-ui` popups, the likeliest place for a surprise) reveal on hover and show nothing at rest.

      If a container shows no bar even on hover, it is missing from the reveal list — report which one, the fix is one selector. If a container shows a bar at rest, a leftover `scrollbar-width` or `::-webkit-scrollbar` rule is winning — report the selector. Optional but decisive: in DevTools, `document.documentElement.offsetWidth - document.documentElement.clientWidth` should be 0, and `el.offsetWidth - el.clientWidth` should be 0 for each container at rest.
    </human-check>
  </verify>
  <done>The two rewritten tests plus the six new assertions pass; `test/token-guard.test.ts` reports zero violations, no duplicated `color-mix` recipe, and no unpaired token; the full suite and ESLint are green; `git diff --name-only` lists exactly `src/web/styles/globals.css` and `test/web/visual-contract.test.ts`.</done>
  <reversibility rating="reversible">Two files, no schema, no dependency, no component change — `git revert` restores the previous scrollbar styling wholesale.</reversibility>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none crossed) | This change edits one stylesheet and one test. It adds no route, no input parsing, no filesystem read, no network call, and no authorization decision. Labelore is a local read-only dashboard with no auth and no mutation surface (per `CLAUDE.md` constraints), and nothing here alters that. The register below is therefore short on purpose rather than padded with inapplicable STRIDE rows. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-QQK-01 | Tampering | unscoped `::-webkit-scrollbar*` rules in `src/web/styles/globals.css` | low | accept | The new rules are unscoped by design (D-01), so the question is whether artifact content can reach them. It cannot: markdown from the target `.planning/` passes through `rehype-sanitize` before render, which strips `<style>`, `on*` handlers, and `style`/`class` injection, so a hostile planning file cannot author or retarget CSS. The rules paint a 6px bar inside a scroll container and set no `position`, `z-index`, `content`, or `pointer-events`, so they cannot be used to overlay or obscure UI even if reached. |
| T-QQK-02 | Denial of Service | zero-width scrollbars, root scroller included (D-01, D-02) | low | accept | Only the bar's paint and its reserved gutter are removed — `width: 0` on the scrollbar pseudo-element, never `overflow: hidden` on a container. Wheel, keyboard, and touch scrolling are untouched at every site, and no container's `overflow` declaration is modified. Task 2's checkpoint verifies page and container scrolling explicitly in a real engine, which is where a "content became unreachable" regression would surface. |
| T-QQK-03 | Tampering | supply chain | n/a | n/a | No package-manager install task exists in this plan — no dependency is added, removed, or upgraded, so the package legitimacy gate does not apply and no `RESEARCH.md` audit table is required. |
</threat_model>

<!-- planner-discipline-allow: scrollbar -->

<source_coverage_audit>
No ROADMAP phase, REQUIREMENTS.md entry, RESEARCH.md, or CONTEXT.md exists for a quick task — the sources are the request itself and the grep-verified site inventory handed to planning. Every item is covered by Task 1's single consolidated block; nothing is deferred.

| Source | Item | Covered by |
|--------|------|------------|
| GOAL | Scrollbars take up no space | D-01 rest state (`*` + unscoped `::-webkit-scrollbar`), step 2 |
| GOAL | Decrease the opacity | D-03 tokens at 30%/55%, step 1 |
| GOAL | Appear only on hover | D-02 + D-04 reveal rule, step 4(e) |
| GOAL | "throughout the site" | Universal rest state covers every scroller incl. unlisted ones; reveal list covers all eleven bounded containers |
| SITE 1 | `html` page scroll (globals.css:251-257) | Step 2 strips `scrollbar-color`/`scrollbar-width`, keeps `scroll-behavior`; never reveals (D-02) |
| SITE 2 | `.tree-navigator` (606-614) | Step 3 strips declarations + comment; in reveal list |
| SITE 3 | `pre, table, .mermaid` (1850-1862) | Step 3 deletes the `scrollbar-width` rule, keeps the overflow group; all three in reveal list |
| SITE 4 | `.artifact-document :is(table, pre, .mermaid, .mermaid-fallback)` (2211-2219) | Covered by bare `pre`/`table`/`.mermaid`/`.mermaid-fallback` in the reveal list; its `overflow-x` rule untouched |
| SITE 5 | `.artifact-document pre` + 5 WebKit rules (2940-2969) | Step 3 deletes the whole region; behaviour reproduced by the consolidated block; its two contract tests rewritten |
| SITE 6 | `.coverage-table-boundary` (2290-2296) | In reveal list (gains styling it never had) |
| SITE 7 | `.document-outline` (2754-2762) | In reveal list (gains styling it never had) |
| SITE 8 | `.search-dialog-results` (3236-3244) | In reveal list (gains styling it never had) |
| CONSTRAINT | Reuse `--scrollbar-thumb`, no equivalent recipe | D-03 re-values the existing token, adds one named sibling, both consumed via `var()` |
| CONSTRAINT | Both engines, no JS, no `overflow: overlay` | D-01/D-05: `scrollbar-width` for Firefox, `::-webkit-scrollbar` for Blink/WebKit, no component change |
| CONSTRAINT | Consolidate, don't repeat per site | Five rules total; the eleven-selector list appears exactly once |
| CONSTRAINT | No regression to `token-guard` / `visual-contract` | Both named in the task's `<automated>`; the two stale assertions rewritten in the same task |
| CONSTRAINT | Preserve `scroll-behavior`/`overscroll-behavior` | Behavior Test 6 and the `<verification>` diff check |
</source_coverage_audit>

<verification>
- `npx vitest run test/web/visual-contract.test.ts test/token-guard.test.ts` passes.
- `npm test` passes in full — the scrollbar rules sit in the stylesheet other contract suites read, so collateral shows up here.
- `npm run lint` passes.
- `git diff --name-only` lists exactly two files: `src/web/styles/globals.css` and `test/web/visual-contract.test.ts`. Any `.tsx` in that list means scope crept.
- `git diff src/web/styles/globals.css` shows `scroll-behavior: smooth`, every `overscroll-behavior*`, and every `overflow-x`/`overflow-y` declaration unchanged.
- The task's `<human-check>` is harvested at end of phase (`workflow.human_verify_mode = end-of-phase`) — the real-browser confirmation of "no gutter at rest, faint bar on hover, in both themes" is the one claim source text cannot carry.
</verification>

<success_criteria>
- Every scroll container reserves zero layout space at rest, the root page scroller included, and the horizontal layout shift the request reported is gone (QQK-01).
- Thumb colour is carried by exactly two `:root` tokens at 30% and 55% of `var(--muted-foreground)`, consumed only through `var()`; no rule paints a solid thumb or a filled track any more (QQK-02).
- The eleven bounded containers paint a 6px bar on `:hover`/`:focus-within` and nothing at rest; `html` never paints one (QQK-03).
- One consolidated block replaces four legacy sites; no scrollbar declaration survives at `html`, `.tree-navigator`, the `pre, table, .mermaid` group, or `.artifact-document pre`.
- `src/web/styles/globals.css` and `test/web/visual-contract.test.ts` are the only files touched.
</success_criteria>

<output>
Create `.planning/quick/260916-qqk-the-scrollbars-throughout-the-site-shoul/260916-qqk-SUMMARY.md` when done
</output>
