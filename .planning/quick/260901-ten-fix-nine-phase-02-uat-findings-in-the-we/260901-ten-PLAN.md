---
quick_id: 260901-ten
phase: quick
plan: 01
type: execute
wave: 1
depends_on: []
autonomous: true
requirements: [F1, F2, F3, F4, F5, F6, F7, F8, F9]
files_modified:
  - src/web/pages/artifact-page.tsx
  - src/web/pages/mermaid-theme.ts
  - src/web/components/reference-preview.tsx
  - src/web/styles/globals.css
  - src/rendering/markdown.ts
  - test/web/mermaid-theme.test.ts
  - test/web/visual-contract.test.ts
  - test/rendering/plan-sections.test.ts

estimate:
  tokens: 150000
  raw_tokens: 75000
  tasks: 6
  confidence: low

must_haves:
  truths:
    - "A valid mermaid fence draws an SVG and an invalid one degrades to readable source, in both light and dark (F1)."
    - "A theme-token change that mermaid cannot parse degrades to mermaid's default theme instead of killing all diagram rendering (F1)."
    - "`.discrepancy-callout p` clears 4.5:1 against its own composited background in light and stays clear in dark (F2)."
    - "Prose inside `.plan-section` is capped to a comfortable measure while tables, code blocks and diagrams keep the full column (F3)."
    - "No route produces horizontal page overflow at a 320px viewport, in either theme (F4)."
    - "The stylesheet carries no selector that matches nothing in any of the three fixture projects (F5)."
    - "A horizontally scrolling code block shows a thin, theme-consistent scrollbar that is visible at rest, stronger on hover/focus, draggable and Shift+wheel scrollable (F6)."
    - "The reference preview popover opens anchored to the trigger that opened it (F7)."
    - "A nested PLAN section carries a positional cue identifying which task is being read (F8)."
    - "Table zebra striping in both the artifact document and the coverage matrix comes from one declared source and sits with the palette in both themes (F9)."
  artifacts:
    - src/web/pages/mermaid-theme.ts
    - test/web/mermaid-theme.test.ts
    - src/web/styles/globals.css
    - src/web/pages/artifact-page.tsx
    - src/web/components/reference-preview.tsx
    - src/rendering/markdown.ts
  key_links:
    - "artifact-page.tsx mermaid effect -> toMermaidColor() -> mermaid.initialize themeVariables (F1)"
    - "reference-preview.tsx Popover.Positioner anchor -> the activating [data-reference-key] trigger element (F7)"
    - "markdown.ts renderPlanRange ordinal path -> .plan-section markup -> .plan-section-ordinal styling (F8)"
    - "globals.css table stripe custom property -> .artifact-document zebra rule AND .coverage-table-boundary zebra rule (F9)"
---

<objective>
Close nine verified phase-02 UAT findings (F1..F9) in the GSD Lore web UI.

Purpose: F1 is a total feature outage (no mermaid diagram renders in either theme, and the
degradation path is dead too). F2 is a WCAG AA failure. F3, F4 and F7 are measurable layout and
positioning defects. F5, F6, F8 and F9 are correctness and craft cleanups on the same surfaces.

Output: mermaid rendering restored and made theme-failure-tolerant, the popover anchored, prose
measure and 320px overflow fixed, and four stylesheet/markup corrections — each an independently
committable task with its findings named.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/quick/260901-ten-fix-nine-phase-02-uat-findings-in-the-we/260901-ten-FINDINGS.md
@.claude/CLAUDE.md
@test/web/visual-contract.test.ts
@src/web/styles/globals.css
</context>

<environment>
Three dev servers are already running and MUST NOT be started or killed:
`:4180` fixtures/dense (D1) · `:4181` ~/studio-portal (D2) · `:4182` fallback fixture (D3).

Browser checks use `playwright-core` (already in node_modules) with the chromium binary at
`~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`. Ad-hoc `.mjs` probes MUST be
written to and run from the repo root `/home/cinedise/gsd-lore` (module resolution fails
elsewhere) and MUST be deleted before the task's commit — they are throwaway and never committed.

Theme is selected by `localStorage['gsd-lore-theme']` (`'light'` | `'dark'`), read by the inline
boot script in `index.html`. There is no `prefers-color-scheme` support and the default when the
key is absent is dark. Every browser check MUST set the key in an init script before first paint
(`context.addInitScript(...)`), or it measures dark twice.

Representative routes (from FINDINGS.md):
- Artifact A (no outline, 2 mermaid fences): `:4180` + `/milestones/m~v3.0/phases/p~vv3.0~n~v01~videntity-slice/artifacts/a~.planning%2Fphases%2F01-identity-slice%2F01-01-PLAN.md`
- Artifact B (outline, nested plan sections, tables): `:4181` + `/milestones/m~v1.0/phases/p~vv1.0~n~v02~vstorage-health-status/artifacts/a~.planning%2Fmilestones%2Fv1.0-phases%2F02-storage-health-status%2F02-10-PLAN.md`
- Plan pair: `:4181` + `/milestones/m~v1.0/phases/p~vv1.0~n~v02~vstorage-health-status/plans/02-10`
- Dashboard `/` and roadmap on each of `:4180`, `:4181`, `:4182`.

Regression floor: `test/web/visual-contract.test.ts` (34 passing assertions at plan time) must stay
green. Do not weaken or delete an existing assertion; only add. Two of its assertions are load
bearing for this work and are called out in the tasks that could break them.
</environment>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: F1 — convert oklch theme tokens for mermaid and isolate initialize() failure</name>
  <files>src/web/pages/mermaid-theme.ts, test/web/mermaid-theme.test.ts, src/web/pages/artifact-page.tsx</files>
  <precondition>Dev server :4180 is serving fixtures/dense and the chromium binary exists at ~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome.</precondition>
  <behavior>
    New pure module `src/web/pages/mermaid-theme.ts` exporting `toMermaidColor(value: string): string`
    (house style for pure web helpers is a sibling module in `src/web/pages/` with its test in
    `test/web/` — see `document-reference-activation.ts` / `scroll-settle.ts`).
    - `oklch(1 0 0)` returns `#ffffff`
    - `oklch(0 0 0)` returns `#000000`
    - `oklch(0.922 0 0)` returns `#e5e5e5` (the light `--border`)
    - `oklch(0.205 0 0)` returns `#171717` (the dark `--card`)
    - `oklch(1 0 0 / 10%)` returns an `rgba(255, 255, 255, 0.1)` form — the alpha channel survives
    - `oklch(0.967 0.001 286.375)` returns a hex within ±2 per channel of `#f4f4f5`
    - `oklch(0.274 0.006 286.033)` returns a hex within ±2 per channel of `#27272a`
    - percentage lightness (`oklch(96.7% 0.001 286.375)`), a `deg`-suffixed hue, and an
      `/ 0.1` numeric alpha all parse to the same results as their bare equivalents
    - a non-oklch input (`#abcdef`, `rgb(1, 2, 3)`, the empty string) is returned unchanged
    - a malformed input (`oklch(`, `oklch(nope)`) is returned unchanged rather than throwing
  </behavior>
  <action>
    Write the failing test first, then the module.

    Implement `toMermaidColor` as a pure function: detect the `oklch(...)` form, parse L (fraction or
    percentage), C, H (bare number or `deg`), and an optional `/ <alpha>` (fraction or percentage);
    convert oklch to oklab (a = C·cos(H in radians), b = C·sin(H in radians)), oklab to LMS by the
    inverse Oklab matrix, cube the LMS components, LMS to linear sRGB by the second Oklab matrix,
    gamma-encode with the sRGB transfer function, clamp each channel to 0..255 and round. Emit
    `#rrggbb` when alpha is absent or 1, and `rgba(r, g, b, a)` when alpha is below 1 — mermaid's
    colour library accepts both. Return the input string untouched on any parse failure or non-oklch
    input, so a future token format change degrades rather than throws. Keep the module free of DOM
    access so it is testable under the default vitest environment.

    In `artifact-page.tsx`, import `toMermaidColor` and wrap each of the four token reads passed to
    `themeVariables` in it. Preserve the exact inner expressions
    `rootStyle.getPropertyValue('--background').trim()` and the same for `--foreground`,
    `--secondary` and `--border` as literal substrings — `visual-contract.test.ts` line ~193 asserts
    each of those four substrings is present in this file, and wrapping them in a call keeps that
    assertion satisfied. Leave `securityLevel: 'strict'`, `startOnLoad: false`, `theme: 'base'` and
    the `fontFamily` read exactly as they are, for the same reason.

    Then isolate the theme from the render loop: wrap the `mermaid.initialize({ ... })` call in its
    own try/catch inside the dynamic-import callback. On catch, re-call `initialize` with the same
    non-colour options (strict security level, no start-on-load, base theme, the app font) and no
    `themeVariables` at all, itself guarded, then continue. The per-node parse/run loop and its
    `.mermaid-fallback` degradation path must run regardless of whether theming succeeded — a theme
    failure must never take out diagram rendering again. Do not move the loop inside the try.
  </action>
  <verify>
    <automated>npx vitest run test/web/mermaid-theme.test.ts test/web/visual-contract.test.ts</automated>
    <browser>Throwaway probe at repo root against `:4180` artifact A, run once per theme with
    `gsd-lore-theme` set in an init script. Pass requires, in BOTH themes: count of
    `[data-mermaid-pending="true"]` is 0, count of `.mermaid svg` is 1, count of `.mermaid-fallback`
    is 1, count of `.notice.warning` is 1, and no captured `pageerror` whose message contains
    "Unsupported color format". Delete the probe before committing.</browser>
  </verify>
  <done>Both mermaid behaviours are alive in both themes (valid fence draws, invalid fence degrades to
  readable source with one warning notice), no uncaught page error is raised, and a theming failure
  is provably confined to theming.</done>
</task>

<task type="auto">
  <name>Task 2: F7 — anchor the reference preview popover to its trigger</name>
  <files>src/web/components/reference-preview.tsx</files>
  <precondition>Dev server :4181 is serving ~/studio-portal.</precondition>
  <action>
    Measured root cause (playwright, :4181 artifact B, light theme, 1440px): with the popover open
    the positioner's inline style is `position: fixed; top: 0px; left: 0px; --anchor-width: 0px;
    --anchor-height: 0px; transform: translate(0px, 8px)` while the trigger's own rect is
    x=445 y=436 w=175. The 8px is the `sideOffset` applied against a 0x0 reference rect at the
    viewport origin — the anchor element is never registered as the position reference. The state is
    stable across scroll, viewport resize and a close/reopen cycle, so this is not a first-paint
    timing artefact; the raw-`Element` `anchor` prop is simply not taking effect in
    `@base-ui/react@1.7.0`'s `Popover.Positioner`.

    Fix by handing the positioner a stable virtual element instead of the bare DOM node: memoize, on
    the trigger's identity, an object exposing `getBoundingClientRect` and `getClientRects` that
    delegate to the trigger plus a `contextElement` pointing at the trigger, and pass that as
    `anchor`. `useMemo` must be called unconditionally, so move the `if (!state) return null` guard
    below the hook and keep the hook's inputs null-safe — `eslint-plugin-react-hooks` is in the lint
    config and will fail a conditional hook.

    If the measurement below still reports a zero anchor width, escalate in this order and re-measure
    after each step: (a) the callback form, passing a function that returns the trigger; (b) a
    `RefObject` whose `current` is kept in sync with the trigger. Do not change `sideOffset`,
    `align`, `positionMethod`, `initialFocus` or `finalFocus` — those carry already-passing
    behaviours.

    Leave `.reference-preview-positioner`'s `z-index: 60` and the `.reference-preview` popup styles
    alone; this is a positioning bug, not a stacking or styling one.
  </action>
  <verify>
    <automated>npm run typecheck &amp;&amp; npm run lint</automated>
    <browser>Throwaway probe at repo root against `:4181` artifact B in both themes at 1440x900 and
    390x844. Click the first `[data-reference-key]` trigger and read the positioner's computed
    `--anchor-width` and the popup's client rect. Pass requires: `--anchor-width` equals the
    trigger's own rect width within 1px; the popup's rect is fully inside the viewport; and the popup
    overlaps the trigger's horizontal extent or is shifted only by collision avoidance. Then confirm
    the four regression behaviours in the same run: the popup paints above the sticky header, Escape
    closes it, focus returns to the trigger afterwards, and a scroll of 40px keeps the popup tracking
    the trigger. Delete the probe before committing.</browser>
  </verify>
  <done>The preview opens beside the `.planning`-path trigger that opened it rather than at the
  viewport origin, in both themes and at both widths, with the four previously-passing behaviours
  intact.</done>
</task>

<task type="auto">
  <name>Task 3: F3 + F4 — cap prose measure and stop 320px overflow inside nested plan sections</name>
  <files>src/web/styles/globals.css, test/web/visual-contract.test.ts</files>
  <precondition>Dev servers :4180, :4181 and :4182 are all serving.</precondition>
  <action>
    Both findings are the same scoping bug: the prose rules under `.artifact-document` use the child
    combinator (`.artifact-document > :is(p, ul, ol, blockquote)` around line 2168) and so never
    reach prose wrapped in `.plan-section` or in `blockquote`.

    F3: extend the `max-width: 76ch` measure cap to nested prose. Tables, code blocks and diagrams
    legitimately want the full column, so exclude them explicitly rather than switching the whole
    rule to a descendant combinator — scope the addition to prose inside `.plan-section` and inside
    `blockquote`, and keep prose inside `table`, `pre`, `.mermaid` and `.coverage-table-boundary`
    uncapped. Verify the exclusion by measurement, not by inspection.

    F4: measured root cause at 320px — `document.documentElement.scrollWidth` is 325 on artifact B
    and 328 on the plan pair while no element box extends past 320px. The overflow comes from bare
    text nodes: `<p>` elements inside `.plan-section-context` and `.plan-section-execution_context`
    hold unbreakable path tokens (`@.planning/phases/02-storage-health-status/02-CONTEXT.md`,
    `@$HOME/.claude/gsd-core/workflows/execute-plan.md`) and compute `overflow-wrap: normal`, so a
    `<p>` with clientWidth 211 reports scrollWidth 270 and that overflow propagates through
    `.plan-section` -> `.artifact-document` -> `main` -> `html`. A `<p>` inside a `blockquote` does
    the same with a long quoted line. Apply `overflow-wrap: anywhere` to the same nested-prose set —
    `anywhere` is the value already used by `.document-outline a`, and unlike `break-word` it also
    lowers the min-content contribution, which is what stops the ancestor chain from being pushed.
    Do not touch `pre`, `code`, `.shiki` or `.mermaid-fallback`: `visual-contract.test.ts` line ~90
    asserts no `pre` rule sets `white-space: pre-wrap` and that the mermaid fallback stays
    `white-space: pre`, and a fenced code line must never wrap.

    Add two stylesheet-source assertions to `test/web/visual-contract.test.ts` in the existing
    `source()` / `ruleBlocks()` style: one proving the measure cap reaches prose inside
    `.plan-section`, one proving `overflow-wrap: anywhere` reaches it too.
  </action>
  <verify>
    <automated>npx vitest run test/web/visual-contract.test.ts</automated>
    <browser>Throwaway probe at repo root covering dashboard, roadmap, artifact A, artifact B and the
    plan pair across `:4180`, `:4181` and `:4182`, in both themes. At 320x900 pass requires
    `document.documentElement.scrollWidth &lt;= document.documentElement.clientWidth` on every route,
    and no `p`, `li`, `blockquote`, `dd` or `dt` with visible overflow-x reporting
    `scrollWidth &gt; clientWidth + 0.5`. At 1440x900 on artifact A and artifact B pass requires the
    median `p` line-box width to be at most 80 characters at the document's computed font size (the
    pre-fix medians were 968px on A and 864px on B), while `table`, `pre` and `.mermaid` element
    widths are unchanged from their pre-fix values. Delete the probe before committing.</browser>
  </verify>
  <done>Nested plan prose reads at a ~65-80 character measure, tables, code blocks and diagrams still
  span the full column, and no route overflows a 320px viewport in either theme.</done>
</task>

<task type="auto">
  <name>Task 4: F2 + F5 — lift discrepancy-callout contrast and delete the dead selector</name>
  <files>src/web/styles/globals.css, test/web/visual-contract.test.ts</files>
  <precondition>Dev server :4180 is serving fixtures/dense (the dashboard renders a discrepancy callout there).</precondition>
  <action>
    F2: `.discrepancy-callout p` (globals.css ~line 713) sets `color: var(--muted-foreground)` over a
    composited `color-mix(in oklch, var(--destructive) 8%, transparent)` background and measures
    4.11:1 in light at 12.8px — below the 4.5:1 floor for normal-size text. Dark measures 6.34:1 and
    is fine. Fix locally, in this rule only: raise the text colour toward `--foreground` (a
    `color-mix` between `--foreground` and `--muted-foreground` weighted to `--foreground` is the
    cheapest option that keeps the callout body quieter than a heading). Do NOT change the shared
    `--muted-foreground` token — the light-theme floor across the other eight muted surfaces is
    4.74:1 and moving the token would put all of them at risk. Do not change the callout's
    background, border or font-size; the contrast has to come from the text colour.

    F5: `.attention-list small` (globals.css line ~791) matches nothing — no `<small>` is rendered in
    an attention row on any of D1, D2 or D3; `dashboard-page.tsx` emits `<span class="item-kind">`,
    `<strong>`, `<p>` and `.source-note`. Delete the dead half of the selector list and leave
    `.attention-list p` carrying the same declarations. Do not leave a CSS comment in globals.css
    naming the removed selector — the verify below negative-greps the stylesheet for it.

    Add to `test/web/visual-contract.test.ts`: an assertion that the `.discrepancy-callout p` rule
    block no longer resolves its colour to the bare shared muted token, and an assertion that the
    stylesheet source does not contain the removed attention-list selector.
  </action>
  <verify>
    <automated>npx vitest run test/web/visual-contract.test.ts</automated>
    <browser>Throwaway probe at repo root on the `:4180` dashboard in both themes at 1440x900 and
    390x844. Composite the callout paragraph's own background stack and compute the WCAG contrast
    ratio of its computed colour against it. Pass requires every cell at or above 4.5:1, and requires
    re-measuring the other eight muted-surface selectors from the original 36-cell matrix to confirm
    none of them dropped. Delete the probe before committing.</browser>
  </verify>
  <done>The discrepancy callout body clears WCAG AA in both themes at both widths, the rest of the
  muted-surface matrix is unmoved, and the stylesheet carries no selector that matches nothing.</done>
</task>

<task type="auto">
  <name>Task 5: F6 + F9 — retune the code-block scrollbar and table zebra to the palette</name>
  <files>src/web/styles/globals.css, test/web/visual-contract.test.ts</files>
  <action>
    Both are aesthetic judgment calls with no numeric pass/fail. The direction and the tokens are
    fixed here; the exact values are the executor's call within them.

    F6: today `.artifact-document pre::-webkit-scrollbar` is 8px tall with a `var(--border)` thumb and
    a `var(--muted-foreground)` hover, and the global `pre { scrollbar-width: thin }` covers Firefox
    with no colour. Make it thinner and quieter at rest without making it disappear: reduce the
    WebKit track height, give the track a background that reads as part of the code surface
    (`--secondary` is the `pre` background) rather than as an OS chrome bar, and set the resting
    thumb to a partially transparent mix of `--muted-foreground` so it is present but recessive.
    Keep `var(--muted-foreground)` as the hover colour — `visual-contract.test.ts` line ~83 asserts
    the `:hover` rule resolves to that token — and add an equivalent stronger state for
    `:focus-within` so keyboard users get the same affordance. Add a `scrollbar-color` on
    `.artifact-document pre` so Firefox tracks the same two tokens instead of inheriting the `html`
    pairing. The four behaviours already accepted in UAT are a regression floor: visible at rest,
    stronger on hover/focus, thumb drags, Shift+wheel scrolls — so no `scrollbar-width: none`, no
    fully transparent resting thumb, and no `overflow: hidden`.

    F9: the two zebra rules (`.artifact-document tr:nth-child(even) td` ~line 2267 and
    `.coverage-table-boundary tbody tr:nth-child(even) td` ~line 1698) each hard-code
    `color-mix(in oklch, var(--muted) 38%, transparent)`, one value for both themes, declared twice.
    Collapse them onto one custom property declared once in `:root` and once in `.dark` — that single
    source is what stops the two tables drifting, and it is what the new assertion pins. Retune the
    two values: lighter in light (the stripe currently reads heavier than the rest of the palette
    against the white card), and in dark derive it from `--muted` or `--secondary` at a strength that
    stays distinguishable from `--card` without becoming a second surface. Do not reintroduce
    vertical borders or change the existing `border-bottom` rules — `visual-contract.test.ts` lines
    ~125 and ~138 assert horizontal-only ruling and the presence of both zebra selectors.

    Add to `test/web/visual-contract.test.ts`: an assertion that both zebra selectors reference the
    same custom property, and an assertion that the property is declared in both the `:root` and
    `.dark` blocks. Add an assertion that the code-block scrollbar rules set a `scrollbar-color` and
    that a `:focus-within` thumb rule exists.
  </action>
  <verify>
    <automated>npx vitest run test/web/visual-contract.test.ts</automated>
    <human-check>Open `:4181` artifact B in both themes: the scrollbar under a wide code fence reads
    as part of the surface at rest and strengthens on hover; the table stripe reads as the same
    palette as the surrounding card in both themes. Confirm the four scrollbar behaviours still work
    (visible at rest, stronger on hover/focus, thumb drags, Shift+wheel scrolls).</human-check>
  </verify>
  <done>The code-block scrollbar is thin and theme-consistent with all four accepted behaviours
  intact, and both tables take their stripe from one declared, per-theme source.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 6: F8 — number nested PLAN sections</name>
  <files>src/rendering/markdown.ts, test/rendering/plan-sections.test.ts, src/web/styles/globals.css, test/web/visual-contract.test.ts</files>
  <behavior>
    In `test/rendering/plan-sections.test.ts`, against a PLAN body nesting plan -> tasks -> task:
    - every emitted `<section class="plan-section ...">` carries a `data-plan-ordinal` attribute
    - a top-level section's ordinal is its 1-based position among top-level sections
    - a nested section's ordinal is its ancestors' ordinals joined to its own 1-based position among
      its siblings by `.` (a second task inside the second top-level section reads `2.2`)
    - malformed segments, which render as a warning plus literal `<pre>` rather than a section, do
      not consume an ordinal
    - the ordinal is emitted escaped, through the same escaping path as the other `data-plan-*`
      attributes
  </behavior>
  <action>
    Findings F8: artifact B nests plan -> tasks -> task -> the actual task. The separator rule is
    already correct (only the top level draws one) and must stay correct; what is missing is a
    positional cue at depth. This is an aesthetic call with no numeric threshold — the markup half is
    what gets pinned by tests, the styling half is directional.

    Write the failing rendering test first. Then thread an ordinal path through
    `renderPlanRange` in `src/rendering/markdown.ts`: it already sorts `directChildren` into document
    order and recurses, so pass the parent's ordinal path down and compose each child's ordinal from
    its 1-based index among the sections it actually emits. Emit it as a `data-plan-ordinal`
    attribute on the `<section>` in `planSectionOpen`, and render it as a leading
    `<span class="plan-section-ordinal">` inside the existing `.plan-section-label` div so the cue
    travels with the label rather than being a CSS-only decoration. Keep the existing
    `plan-section`/`plan-section-{tag}` classes, `data-plan-section`, `data-plan-recognized` and the
    `PLAN_ATTRIBUTE_NAMES` output byte-identical — `plan-sections.test.ts` line ~316 asserts no
    stylesheet rule targets `data-plan-recognized`, and several assertions index into the HTML by
    those exact attribute strings.

    Style `.plan-section-ordinal` in globals.css to sit with the label it prefixes: same monospace
    family, same size, same `--muted-foreground` token, separated by spacing rather than by a
    different colour or weight. Do not modify the `.plan-section {` or `.plan-section .plan-section {`
    rule blocks — `visual-contract.test.ts` lines ~40 and ~51 iterate over every one of those blocks
    (there are two of each in the file) and assert the exact separator, `min-width` and
    `padding-inline` declarations. Do not modify the `.plan-section-label {` blocks' colour either;
    the G2-09 assertion requires both of them to resolve to the same muted token.
  </action>
  <verify>
    <automated>npx vitest run test/rendering/plan-sections.test.ts test/web/visual-contract.test.ts</automated>
    <human-check>Open `:4181` artifact B: at the nested plan -> tasks -> task depth each section
    carries a positional number that makes it obvious which task is being read, and the top-level
    separator rule is still drawn exactly once per top-level section.</human-check>
  </verify>
  <done>Every plan section emits a stable dotted ordinal path, nested tasks are individually
  identifiable on the page, and no existing plan-section markup or stylesheet assertion changed.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target `.planning/` files -> markdown pipeline -> rendered HTML | Untrusted authored content crosses into the DOM |
| computed CSS custom properties -> mermaid config object | Theme strings cross from the document into a third-party library's config |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-quick-01 | Tampering | `planSectionOpen` `data-plan-ordinal` (Task 6) | low | mitigate | Emit the ordinal through the same `escapeHtml` path as the other `data-plan-*` attributes; the value is derived from integer sibling indices, never from file content |
| T-quick-02 | Denial of Service | `mermaid.initialize` themeVariables (Task 1) | high | mitigate | This is F1 itself: a single unparseable token currently kills all diagram rendering. Task 1 confines `initialize` to its own try/catch with a colourless retry so the per-node loop always runs |
| T-quick-03 | Elevation of Privilege | mermaid rendering of authored fences | low | accept | `securityLevel: 'strict'` is unchanged and asserted by the existing visual-contract test; the pipeline's `rehype-sanitize` ordering is untouched by this plan |
| T-quick-SC | Tampering | package installs | low | accept | No task installs a package; `toMermaidColor` is implemented in-repo precisely to avoid adding a colour-conversion dependency |
</threat_model>

<verification>
After all six tasks:
1. `npm test` — full vitest suite green, including the 34 pre-existing `visual-contract.test.ts`
   assertions and the new ones added by tasks 1, 3, 4, 5 and 6.
2. `npm run typecheck` and `npm run lint` clean.
3. `git status` shows no stray `.mjs` probe files at the repo root.
4. One commit per task, each naming its findings (F1..F9) in the message body.
</verification>

<success_criteria>
- F1: on `:4180` artifact A in both themes — 0 pending mermaid nodes, 1 `.mermaid svg`, 1
  `.mermaid-fallback`, 1 `.notice.warning`, no "Unsupported color format" page error.
- F2: `.discrepancy-callout p` at or above 4.5:1 in light and dark, desktop and mobile; the other
  eight muted-surface selectors unmoved.
- F3: median `p` measure at or below 80 characters at 1440px on artifacts A and B; table, `pre` and
  `.mermaid` widths unchanged.
- F4: `documentElement.scrollWidth <= clientWidth` at 320px on dashboard, roadmap, artifact A,
  artifact B and the plan pair, across `:4180`, `:4181`, `:4182`, both themes.
- F5: the stylesheet source no longer contains the dead attention-list selector.
- F6: thin, token-driven scrollbar with the four accepted behaviours intact.
- F7: popover `--anchor-width` equals the trigger width within 1px and the popup sits beside its
  trigger, with the four previously-passing behaviours intact.
- F8: every plan section carries a dotted ordinal path; nested tasks are individually identifiable.
- F9: both zebra rules reference one custom property declared per theme.
</success_criteria>

<output>
Create `.planning/quick/260901-ten-fix-nine-phase-02-uat-findings-in-the-we/260901-ten-SUMMARY.md` when done.
</output>
</content>
</invoke>
