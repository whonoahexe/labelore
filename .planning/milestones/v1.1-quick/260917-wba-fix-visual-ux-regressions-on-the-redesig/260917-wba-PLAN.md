---
phase: quick-260917-wba
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/web/pages/traceability-page.tsx
  - src/web/styles/globals.css
  - test/web/traceability-redesign-contract.test.ts
autonomous: true
requirements: [WBA-01, WBA-02, WBA-03, WBA-04, WBA-05, WBA-06, WBA-07]

estimate:
  tokens: 70000
  raw_tokens: 70000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A category whose rows are all traced still reads as a data meter: the bar shows a framed track with an inset fill at all times, never a full-bleed solid block of the site's primary orange repeated down the page (WBA-01)"
    - "The covered segment's tone is a named, muted-down primary recipe declared once in the :root recipe block — visibly distinct from the sparing accent uses of raw var(--primary) elsewhere on the site (WBA-01)"
    - "The hero number is labelled with tracing language plus a caption stating it is not a completion measure, so a page showing Incomplete rows below it no longer contradicts its own headline (WBA-02)"
    - "coverageOf() and the TraceabilityCoverage shape in src/presentation/traceability.ts are byte-identical to their pre-task state — the fix is copy and presentation only (WBA-02)"
    - "The filter input's surface matches the adjacent control family (same border + background treatment as .trace-filter-button), with var(--input) no longer referenced at any usage site in the stylesheet (WBA-03)"
    - "The filter input and the filter buttons in the same flex row resolve to the same box height, so their baselines sit level (WBA-03)"
    - "The deferred-tier control renders a track-and-thumb switch that visibly moves between off and on, distinct from the three filter buttons beside it, while keeping its data-active and aria-pressed attributes adjacent and unchanged (WBA-04)"
    - "The first row inside an open deferred tier clears the disclosure summary by the same space token used on the other three sides of .history-tree (WBA-05)"
    - "A row inside a deferred tier renders no Requirement-status block and no destructive-red chip — its unscheduled state reads in a neutral quiet tone (WBA-06)"
    - "Requirement rows read with real hierarchy and no four-sided border per row, while keeping the two-column desktop grid and its single-column narrow-viewport override (WBA-07)"
    - "test/token-guard.test.ts, test/web/visual-contract.test.ts, test/web/empty-state-contract.test.ts and test/web/loading-state-contract.test.ts pass with zero assertions edited in any of those four files"
    - "npm run typecheck passes and no new runtime dependency is added to package.json"
  artifacts:
    - path: "src/web/pages/traceability-page.tsx"
      provides: "CoverageBar with a framed track, honest tracing copy on the hero and the bar's aria-label, a switch-shaped deferred toggle, and a TraceabilityRowList deferred variant"
    - path: "src/web/styles/globals.css"
      provides: "trace-bar track/fill rules, one new named colour recipe in the :root recipe block, control-height parity across .trace-filter-input and .trace-filter-button, .trace-toggle switch rules, four-sided .history-tree padding, and the lightened .trace-row treatment"
    - path: "test/web/traceability-redesign-contract.test.ts"
      provides: "A new source-level describe block pinning every one of the seven fixes, in the existing ruleBlocks()/source() idiom"
  key_links:
    - "New colour recipes MUST be declared as tokens inside the :root recipe block (near --primary-tint), never inline at a usage site — test/token-guard.test.ts flags any color-mix() recipe that recurs across two usage sites or duplicates a token definition's value"
    - "HISTORY_SELECTOR_LINE_COUNT_BEFORE_TASK_3 = 21 in test/web/traceability-redesign-contract.test.ts pins the number of lines matching /\\.history-[\\w-]+/ in globals.css — .history-tree must be edited in place, never scoped into a new selector"
    - "The existing assertion pins the exact string <CoverageBar coverage={group.coverage} label={`${group.category} coverage`} /> — the element text and its current indentation depth must survive (prettier printWidth is 100 and that line already sits at 94 chars)"
    - "The existing regex pins data-active={filter.includeHistory ? 'true' : undefined} on the line immediately above aria-pressed={filter.includeHistory}"
    - "test/web/visual-contract.test.ts requires the resting .trace-filter-button block to contain no var(--primary) and the [data-active='true'] block to contain it — the switch must not move either fact"
    - "test/web/visual-contract.test.ts requires the page source to still contain the literals Uncovered, Status mismatch and Unresolved (the status filter button and CoveringPhaseEntry supply all three)"
---

<objective>
Fix seven visual/UX regressions on the redesigned traceability page found in a live audit: coverage
bars that read as decorative rules, a misleading completion-sounding headline, an off-pattern and
mis-sized filter input, a toggle rendered as a plain button, a missing top padding, alarming
guaranteed-true chips in deferred tiers, and heavy low-hierarchy row cards.

Purpose: The page's own data currently argues against itself — a bold 100% sits above rows marked
Incomplete, and the site's sparing accent colour is painted as full-width blocks a dozen times down
a long page. Every fix here is presentation or copy; none touches the coverage computation.

Output: An updated traceability page component, updated trace-*/history-* stylesheet rules, one new
named colour recipe token, and a new contract describe block pinning all seven fixes.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

@src/web/pages/traceability-page.tsx
@src/web/styles/globals.css
@test/web/traceability-redesign-contract.test.ts
@test/token-guard.test.ts
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Coverage bars read as data, and the headline stops claiming completion</name>
  <files>src/web/styles/globals.css, src/web/pages/traceability-page.tsx, test/web/traceability-redesign-contract.test.ts</files>
  <read_first>
    src/web/styles/globals.css lines 96-145 (the named colour recipe block inside :root, and the
    .dark overrides), lines 3549-3620 (.trace-summary through .trace-bar-uncovered), lines 3702-3719
    (.trace-category-bar); src/web/pages/traceability-page.tsx lines 84-124 (CoverageBar) and lines
    283-304 (the summary headline); test/token-guard.test.ts lines 387-510 (the colour family and
    its recurring-recipe rule).
  </read_first>
  <behavior>
    - A bar whose scope is entirely traced still shows a framed track with the fill visibly inset
      inside it, so it cannot be mistaken for a horizontal rule.
    - The covered segment resolves to a muted-down primary recipe, not the raw accent token.
    - The per-category bar is width-constrained and accompanied by a numeric readout, so it is
      unambiguously a measurement rather than a divider.
    - The hero number's label and the bar's spoken description use tracing language; a caption under
      the number denies the completion reading.
    - test/token-guard.test.ts reports zero violations after the change.
  </behavior>
  <action>
Declare one new named colour recipe in the :root recipe block in globals.css, immediately after
--primary-tint (the block carrying --card-veil / --destructive-tint / --primary-tint at lines
104-107). Name it for the traced-fill role and give it a color-mix of var(--primary) blended toward
var(--muted) at roughly a third to a half strength, so it adapts per theme automatically and needs
no .dark override. It MUST live in the token block: the colour family's recurring-recipe check in
test/token-guard.test.ts flags any color-mix() spelled at a usage site that either recurs twice or
duplicates a token definition's value. Confirm the new value is unique across the palette — the
guard also fails two different tokens holding identical non-alias values in both themes.

Rework the .trace-bar family so the track is always visible. Give .trace-bar its own track fill from
var(--muted) and a small padding gutter from a --space-* token (var(--space-0-5)) so the segments
never touch the frame; keep its existing 1px var(--border) frame. Point .trace-bar-covered at the
new recipe token instead of var(--primary). Leave .trace-bar-mismatched on var(--destructive). Make
.trace-bar-uncovered show the track through instead of painting var(--border) — the keyword
transparent always passes the guard. Segments keep stretching to the track's content box; do not
introduce raw lengths in any padding/margin/gap/height declaration (use --space-* tokens).

Make the per-category bar stop reading as a full-bleed rule: turn .trace-category-bar into a flex row
with a max-width bound on its bar (max-width is outside the guard's spacing property set, and
.trace-bar already precedents a raw min-width: 12rem), aligned to centre, holding the CoverageBar
plus a short numeric readout element styled like the existing micro-labels (var(--font-size-micro-label),
var(--muted-foreground), uppercase, var(--ls-wider)). Render the readout in traceability-page.tsx as
the traced count over the total for that category, read straight off group.coverage — never recounted
from rows. CRITICAL: the CoverageBar element inside that wrapper must keep its exact current text and
its current indentation depth; an existing assertion pins that string literally, and prettier's
printWidth of 100 leaves only 6 characters of slack on that line.

In traceability-page.tsx, rewrite the CoverageBar aria-label sentence so it describes tracing rather
than completion: name the traced count as having a covering phase, keep the mismatched and untraced
counts, and keep role="img" plus the three aria-hidden segments and the zero-total early return
exactly as they are. Do NOT change the label prop expressions at either call site — both are pinned.

Change the hero label under the percentage from the completion-sounding word to the tracing word, and
add one caption element below it (a new .trace-coverage-percent-note rule styled from
var(--muted-foreground) and an existing --fs-* token) stating in one short sentence that the figure
counts requirements with a covering phase and is not a measure of work completed. Leave the three
stat tiles' labels, the percentage expression {view.coverage.coveragePercent}, and every
view.coverage.* read untouched.

Do not open src/presentation/traceability.ts for editing — coverageOf() and the TraceabilityCoverage
shape are fixed by the task constraints; this finding is a labelling fix only.

Add a new describe block at the end of test/web/traceability-redesign-contract.test.ts for this quick
task, reusing that file's existing source() / ruleBlocks() helpers. Pin: the .trace-bar block declares
both a background and a padding; the .trace-bar-covered block references the new recipe token and does
not reference the bare primary token; the new recipe token is declared in the stylesheet's token block;
the hero label element renders the tracing word; the caption element is present; and the aria-label
sentence describes a covering phase. Prefer positive containment assertions over negative greps.
  </action>
  <verify>
    <automated>cd /home/cinedise/labelore &amp;&amp; npm test -- test/web/traceability-redesign-contract.test.ts test/token-guard.test.ts</automated>
  </verify>
  <done>
    The new recipe token is declared once in :root and consumed only by .trace-bar-covered; .trace-bar
    paints a track plus a gutter; the per-category bar is width-bound and carries a numeric readout;
    the hero reads as a tracing figure with a non-completion caption; both named test files pass; and
    src/presentation/traceability.ts shows no diff.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Filter row — site-pattern input, height parity, and a real toggle switch</name>
  <files>src/web/styles/globals.css, src/web/pages/traceability-page.tsx, test/web/traceability-redesign-contract.test.ts</files>
  <read_first>
    src/web/styles/globals.css lines 3644-3701 (.trace-filters through the active filter-button rule)
    and lines 3231-3247 (.search-dialog-input, the site's established input pattern);
    src/web/pages/traceability-page.tsx lines 306-354 (the filter section);
    test/web/visual-contract.test.ts lines 685-727 (the assertions already pinning this region).
  </read_first>
  <behavior>
    - The filter input's border and background come from the same token pair the adjacent buttons use;
      the frosted translucent token is no longer referenced at any usage site.
    - Input and buttons in the same flex row resolve to one shared box height.
    - The deferred-tier control renders a track and a thumb, with the thumb offset differing between
      its pressed and unpressed states.
    - The three status filter buttons keep their existing class and active treatment untouched.
  </behavior>
  <action>
Restyle .trace-filter-input to the site's own control pattern: keep its 1px var(--border) frame, and
swap its background from the frosted token to var(--background) — the same surface .trace-filter-button
already rests on, which makes the two read as one control family. Drop its font-size to var(--fs-3)
so it sits closer to the buttons optically, and move its padding onto the same scale the buttons use
(var(--space-1-5) var(--space-3)). Keep the placeholder and focus rules as they are. After this edit,
the stylesheet must contain no remaining usage-site reference to the frosted input token; its
declaration in the palette and its @theme inline mapping both stay (the mapping keeps it consumed).

Equalize the heights: add min-height driven by the same --space-* token (var(--space-8)) to both
.trace-filter-input and .trace-filter-button, and give .trace-filter-button inline-flex display with
centred alignment so its label centres inside the taller box. min-height is outside the guard's
spacing property set but use the token anyway for consistency. Do not add var(--primary) to the
resting .trace-filter-button block and do not remove it from the [data-active='true'] block — both
facts are pinned by test/web/visual-contract.test.ts.

Give the deferred-tier control a switch affordance. In traceability-page.tsx, keep it a
<button type="button">, keep its onClick and its state, and keep data-active={filter.includeHistory ?
'true' : undefined} on the line IMMEDIATELY above aria-pressed={filter.includeHistory} — a regex in
the contract test pins that adjacency. Change its className to a new toggle class, and render inside
it an aria-hidden track element containing a thumb element, followed by the existing text label.

Add the toggle rules to globals.css beside the filter-button rules: the toggle is an inline-flex row
with the same min-height, border, padding scale, heading font, uppercase treatment and letter-spacing
as the filter buttons so it still belongs to the row, but its track is a fixed-size squared block
(sized from --space-* tokens, no border-radius anywhere) filled from var(--muted) with a 1px
var(--border) frame, holding a thumb block filled from var(--muted-foreground) sitting at the track's
start. Under [aria-pressed='true'], tint the track from var(--primary-tint), move the thumb to the
track's end with a transform, and fill the thumb from var(--primary). Add a short transform transition
on the thumb; the existing prefers-reduced-motion block already neutralises it globally.

Extend this quick task's describe block in test/web/traceability-redesign-contract.test.ts: pin that
the .trace-filter-input block references neither the frosted token nor a raw colour literal and
declares a min-height; that .trace-filter-button declares the same min-height token; that the toggle
markup renders the track and thumb class names; and that the pressed-state toggle rule declares a
transform. Then re-run the two pre-existing gate suites covering this region to prove no assertion in
them needed editing.
  </action>
  <verify>
    <automated>cd /home/cinedise/labelore &amp;&amp; npm test -- test/web/traceability-redesign-contract.test.ts test/web/visual-contract.test.ts test/token-guard.test.ts</automated>
  </verify>
  <done>
    grep -n 'var(--input)' src/web/styles/globals.css returns only the @theme inline mapping line;
    both controls declare the same min-height token; the toggle renders track and thumb elements with
    a pressed-state transform; all three named suites pass with test/web/visual-contract.test.ts
    unedited.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Deferred-tier breathing room and chips, and lighter row cards</name>
  <files>src/web/styles/globals.css, src/web/pages/traceability-page.tsx, test/web/traceability-redesign-contract.test.ts</files>
  <read_first>
    src/web/styles/globals.css lines 1739-1772 (.history-list through .history-tree), lines 3720-3802
    (.trace-rows through .trace-dangling-text), lines 2110-2121 (the narrow-viewport .trace-row
    override), lines 892-933 (.status-chip and its tone rules);
    src/web/pages/traceability-page.tsx lines 126-224 (TraceabilityRowList and DeferredTierDisclosure).
  </read_first>
  <behavior>
    - The first deferred-tier row clears the disclosure summary by the same amount as the other three
      sides of the tree container.
    - A deferred-tier row renders one secondary block only, with a quiet-toned chip, and no
      destructive tone anywhere in that variant.
    - A non-deferred row renders exactly as it does today, structurally unchanged.
    - Rows in a list are separated without a four-sided border per row, and the requirement text
      outranks its ID typographically.
  </behavior>
  <action>
Fix the missing top padding by editing the existing .history-tree rule in place: replace its
three-value padding with the single --space-5 token on all four sides. Do NOT introduce a
traceability-scoped variant of that selector — the contract test pins the exact count of lines
matching the history- selector pattern at 21, and a scoped rule would add one. This rule is shared
with roadmap-page.tsx's archived-milestone disclosures; the added top padding is a deliberate
improvement to both.

Give TraceabilityRowList an optional variant prop with a default and a deferred value, and keep both
existing call sites (the contract test counts at least two usages of the component). Pass the deferred
value from DeferredTierDisclosure only. In the deferred variant: omit the Requirement-status micro-label
block entirely — every row in a deferred tier has a null requirement status by construction, so the
em-dash chip and the mismatch marker are guaranteed noise there. For the covering-phase block in the
deferred variant, when a row has no covering phase render one .status-chip with data-tone="quiet"
whose copy names the row as not yet scheduled, under a micro-label naming scheduling rather than
covering phase; when a deferred row does carry covering phases (defensive — do not assume it cannot),
render the existing covering list under the existing micro-label. The destructive tone MUST NOT appear
in the deferred variant. The default variant's markup must be structurally identical to today's.

Improve the row cards' hierarchy within the existing token palette and squared-corner language.
Remove the four-sided border from .trace-row and separate rows with a single hairline between
siblings instead (an adjacent-sibling rule declaring border-top: 1px solid var(--border)), collapsing
.trace-rows' gap so the rows form one continuous list, and give .trace-row a hover background from
var(--state-hover). Invert the typographic weight inside .trace-row-primary so the requirement text
leads: step .trace-row-text up to var(--fs-5) on var(--foreground), and demote .trace-row-id to the
micro-label treatment already used elsewhere in this file (var(--font-size-micro-label),
var(--muted-foreground), uppercase, var(--ls-wider)) so the ID reads as a tag above its requirement.
Step the secondary block's own type down to var(--fs-3). Keep .trace-row's two-column grid and keep
the narrow-viewport single-column override intact. No border-radius, no new hardcoded colour, no raw
length in any padding/margin/gap declaration, and no new inline color-mix() at a usage site.

Extend this quick task's describe block: pin the four-sided .history-tree padding and that the
history selector-line count is still 21; pin that TraceabilityRowList accepts the variant prop and
that the deferred branch renders the quiet-toned unscheduled chip; pin that .trace-row declares no
border shorthand while an adjacent-sibling rule declares a top hairline; and pin the row-text and
row-id size tokens. Finish by running the whole suite plus the typechecker.
  </action>
  <verify>
    <automated>cd /home/cinedise/labelore &amp;&amp; npm test &amp;&amp; npm run typecheck</automated>
  </verify>
  <done>
    .history-tree pads all four sides from one token and the pinned history selector-line count is
    unchanged; deferred-tier rows show one quiet-toned block and no destructive chip; default rows are
    structurally unchanged; rows separate by hairline with the requirement text outranking its ID; the
    full vitest suite and npm run typecheck both pass.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target `.planning/` files → server projection → browser | Untrusted-in-principle markdown/frontmatter from the targeted project crosses into rendered UI. This task adds no new crossing: every value it renders (coverage counts, requirement IDs and text) already flows through the same projection and the same React text interpolation. |
| user → filter input | Local, single-user, in-memory filter state. Restyled only; its value handling is untouched. |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-WBA-01 | Information disclosure | traceability-page.tsx summary headline | low | mitigate | The misleading completion-sounding headline is itself the defect: relabel to tracing language plus a non-completion caption (Task 1) so the page cannot misreport project state to its reader. |
| T-WBA-02 | Tampering | traceability-page.tsx new markup (toggle track/thumb, readout, caption, deferred chip) | low | accept | All new nodes are static JSX text and aria-hidden decoration; no dangerouslySetInnerHTML is introduced and no corpus string is injected as raw HTML. React's default escaping already covers the interpolated counts. |
| T-WBA-03 | Tampering | npm/pip/cargo installs | high | accept | No dependency is added or changed by this task; package.json is not in files_modified, so the package-legitimacy gate has nothing to audit. If any task turns out to need a new package, stop and route it through the legitimacy gate first. |
| T-WBA-04 | Denial of service | CSS transform transition on the toggle thumb | low | accept | A single short transform transition on one element, already neutralised by the stylesheet's existing prefers-reduced-motion block. |
</threat_model>

<verification>
- `npm test` passes in full, with zero assertions edited in test/token-guard.test.ts,
  test/web/visual-contract.test.ts, test/web/empty-state-contract.test.ts or
  test/web/loading-state-contract.test.ts.
- `npm run typecheck` passes.
- `git diff --stat src/presentation/traceability.ts` is empty — the coverage computation is untouched.
- `git diff package.json` is empty — no new dependency.
- Every new colour value is a token declared in the stylesheet's token block; no hex, rgb() or raw
  oklch() appears at any usage site (enforced by test/token-guard.test.ts).
</verification>

<success_criteria>
All seven audit findings are closed: the coverage bars carry a permanent track and a muted-down
traced tone with a width-bound per-category readout; the hero reports tracing, not completion; the
filter input matches the site's control family and shares the buttons' height; the deferred-tier
control is a switch; .history-tree pads all four sides; deferred-tier rows drop the guaranteed-true
status block and the destructive chip; and rows read as a hierarchy without per-row four-sided
borders. The four pre-existing gate suites and the typechecker pass unmodified.
</success_criteria>

<output>
Create `.planning/quick/260917-wba-fix-visual-ux-regressions-on-the-redesig/260917-wba-SUMMARY.md` when done
</output>
