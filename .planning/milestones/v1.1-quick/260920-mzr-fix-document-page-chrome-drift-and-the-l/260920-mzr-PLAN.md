---
phase: quick-260920-mzr
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/web/pages/artifact-page.tsx
  - src/web/pages/plan-pair-page.tsx
  - src/web/styles/globals.css
autonomous: true
requirements: [MZR-01, MZR-02, MZR-03, MZR-04]

estimate:
  tokens: 48000
  raw_tokens: 24000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "ArtifactPage and PlanPairPage render the same container geometry while loading, on error, and when loaded — no width or padding jump when the document arrives (MZR-01)."
    - "Document pages are min(86rem, 100%) wide with --space-fluid-14 top padding, inherited from .page-stack rather than declared on .artifact-page (MZR-02)."
    - "At <= 42rem the document pages' top padding is --space-10, the same as every other page (MZR-02)."
    - "The document title renders at --fs-display-3, matching .page-stack > h1 / .page-intro h1 (MZR-03)."
    - "Exactly one horizontal rule sits between the page chrome and the document body (MZR-04)."
    - "PlanPairPage still spaces its children at --space-8, not --space-6."
    - "All 53 test files / 843 tests still pass."
  artifacts:
    - src/web/pages/artifact-page.tsx
    - src/web/pages/plan-pair-page.tsx
    - src/web/styles/globals.css
  key_links:
    - ".artifact-page becomes layout-only (display/gap/min-width); .page-stack is the sole container (width/margin/padding) — the same split .dashboard-page / .roadmap-page / .traceability-page already use."
    - ".plan-pair-page (globals.css:3115) sits after .artifact-page (globals.css:2149) in source order, so its gap override keeps winning at equal specificity."
    - "token-guard.test.ts:679 requires every defined --fs-* token to be consumed at least once — retargeting the only consumer of --fs-display-2 makes removing its definition mandatory, not optional."
---

<objective>
Collapse the parallel page-frame system on `ArtifactPage` and `PlanPairPage` into the one every
other page uses, so the loading -> loaded reflow and the three-axis chrome drift are fixed by the
same structural change.

Purpose: `.artifact-page` currently conflates two jobs — page container (width/margin/padding) and
child layout (display/gap). The three visually-correct pages split these: `.page-stack` is the
container, and `.dashboard-page` / `.roadmap-page` / `.traceability-page` are layout-only modifiers.
Because the document pages have no such split, swapping `page-stack` for `artifact-page` on load
swaps the geometry too. The reflow and the drift are one bug.

Output: two `className` edits, one deleted container block, one deleted narrow-viewport override,
one retargeted title scale, one orphaned token removed, one redundant rule dropped.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/todos/pending/artifact-chrome-drift.md
@src/web/components/artifact-header.tsx
</context>

<planning_time_ground_truth>
Every line number below was read from the working tree during planning (HEAD = a57ce05). Re-verify
before editing, but these are confirmed, not inherited:

- `src/web/pages/artifact-page.tsx` — `:401` loading `page-stack`, `:415` error `page-stack`,
  `:454` loaded `artifact-page`.
- `src/web/pages/plan-pair-page.tsx` — `:111` loading, `:125` error, `:158` loaded
  `artifact-page plan-pair-page`.
- `globals.css:331-356` — shared `min-width: 0; max-width: 100%` selector list. It already contains
  `.page-stack`, so an element carrying `page-stack` inherits both properties; `.artifact-page` does
  **not** need adding to that list.
- `globals.css:823-827` — `.page-stack` container: `width: min(80rem, 100%)`, `margin: 0 auto`,
  `padding: var(--space-fluid-14) var(--space-fluid-8) var(--space-28)`.
- `globals.css:848-855` — `.page-stack > h1, .page-intro h1` at `--fs-display-3`.
- `globals.css:2076-2078` — inside `@media (max-width: 42rem)` (opens at `:2031`):
  `.page-stack { padding-top: var(--space-10) }`.
- `globals.css:2149-2153` — `.artifact-page` layout block: `display: grid; gap: var(--space-6);
  min-width: 0`. **Keep.**
- `globals.css:2168-2173` — `.artifact-heading`: has the bottom rule to keep.
- `globals.css:2509-2511` — `.page-stack { width: min(86rem, 100%) }`, top-level, no media query.
- `globals.css:2717-2721` — `.artifact-page` container block. **Delete.**
- `globals.css:2723-2728` — `.artifact-breadcrumbs`: second bottom rule, ~5rem above the heading's.
- `globals.css:2739-2746` — `.artifact-heading h1` at `--fs-display-2`.
- `globals.css:3115-3117` — `.plan-pair-page { gap: var(--space-8) }`.
- `globals.css:3151-3154` — inside `@media (max-width: 42rem)`:
  `.artifact-page { padding-top: var(--space-6) }`.
- `globals.css:222-225` — the display type ramp. `--fs-display-2` (`:223`) has exactly one consumer
  in the whole repo: `globals.css:2743`.

Confirmed absent: no `@media` / `@layer` / `@supports` wraps `globals.css:2509` or `:2717` — both
are top-level.
</planning_time_ground_truth>

<two_findings_beyond_the_brief>
Both were found by reading the working tree at planning time and both are inside the brief's stated
intent ("geometry must come free from page-stack, not by hand-editing values into `.artifact-page`").
Neither is a scope expansion into the out-of-scope list.

**Finding 1 — a fourth drift axis the todo's table does not list.** `globals.css:3152` sets
`.artifact-page { padding-top: var(--space-6) }` inside `@media (max-width: 42rem)`, while
`globals.css:2076` sets `.page-stack { padding-top: var(--space-10) }` inside a different
`@media (max-width: 42rem)` block. On a document page both classes land on the same element at equal
specificity, and `:3152` is later in source order, so it wins. Leaving it means narrow viewports keep
a document-only top padding — the drift moved rather than closed, and the top padding would demonstrably
not "come free". It must go. (Note: the `css-source-order` guard does not catch this because the two
declarations use *different* selectors; it only flags same-selector defeats.)

**Finding 2 — Task 2 is a two-part edit, not one.** `test/token-guard.test.ts:679` asserts every
defined `--fs-*` token is consumed at least once outside the token blocks. `--fs-display-2` has a
single consumer, and that consumer is the exact declaration Task 2 retargets. Retargeting it alone
turns a currently-green test red with
`--fs-display-2 is defined but never consumed`. That assertion is live and correct, not obsolete —
so the definition at `globals.css:223` must be deleted in the same task. (The sibling assertion at
`:643` explicitly excludes `--space-fluid-*` from its consumption check, so the `--space-fluid-11`
that Task 1 orphans is deliberately tolerated by the project's own guard and stays put — the fluid
ramp is kept whole by design.)
</two_findings_beyond_the_brief>

<tasks>

<task type="tracer">
  <name>Task 1: Split container from layout — one page container for every document-page state</name>
  <files>src/web/pages/artifact-page.tsx, src/web/pages/plan-pair-page.tsx, src/web/styles/globals.css</files>
  <precondition>`npx vitest run` is green at HEAD (53 files / 843 tests) — any failure after this task is attributable to it.</precondition>
  <action>
This is the vertical slice: it wires the container fix through both layers (tsx class list ->
stylesheet -> cascade) for both pages at once. It cannot be split per-page — the stylesheet deletion
is global, so doing one page's className without the other would leave the second page with no
container geometry at all.

In `src/web/pages/artifact-page.tsx` at the loaded-state `main` (`:454`), append `page-stack` to the
class list, matching the established modifier-then-container order used by
`dashboard-page.tsx:127`, `roadmap-page.tsx:341`, and `traceability-page.tsx:302`. In
`src/web/pages/plan-pair-page.tsx` at the loaded-state `main` (`:158`), append `page-stack` after the
existing two classes. Leave the loading and error branches on both pages untouched — they are
already correct, and `test/web/loading-state-contract.test.ts` reads those branches.

In `src/web/styles/globals.css`, delete the entire `.artifact-page` rule at `:2717` (the one
declaring width, margin and padding). The `.artifact-page` rule at `:2149` stays exactly as it is and
becomes the layout-only modifier. Do not add width, margin, padding or max-width to it, and do not
add it to the shared selector list at `:331` — `.page-stack` is on the same element and already
supplies `min-width: 0` and `max-width: 100%`.

Also delete the `.artifact-page` rule nested in `@media (max-width: 42rem)` at `:3152`, for the
reason given in Finding 1 above. Leave the other two rules in that media block alone.

Do not touch `.plan-pair-page` at `:3115`. Its gap override sits after `:2149` in source order and
keeps winning at equal specificity; verify this holds rather than reinforcing it.

After the deletions, the loaded document pages must pick up `min(86rem, 100%)` from `:2509`,
`--space-fluid-14` top padding from `:823`, and `--space-10` narrow-viewport top padding from
`:2076` — all inherited, none retyped. If any of those three does not arrive on its own, stop and
diagnose the cascade; do not write the value into `.artifact-page` by hand.
  </action>
  <verify>
    <automated>cd /home/cinedise/labelore && npx vitest run --reporter=dot && npm run typecheck && test "$(awk '/^[[:space:]]*\.artifact-page \{/,/^[[:space:]]*\}/' src/web/styles/globals.css | grep -cE '^[[:space:]]*(width|margin|padding|padding-top):')" = 0 && awk '/^\.artifact-page \{/,/^\}/' src/web/styles/globals.css | grep -q 'display: grid;' && grep -q 'artifact-page page-stack' src/web/pages/artifact-page.tsx && grep -q 'plan-pair-page page-stack' src/web/pages/plan-pair-page.tsx && awk '/^\.page-stack \{/,/^\}/' src/web/styles/globals.css | grep -q 'var(--space-fluid-14)'</automated>
  </verify>
  <done>Exactly one `.artifact-page` rule remains in the stylesheet and it declares no container geometry. Both loaded-state `main` elements carry `page-stack`. All 843 tests and both typecheck projects pass.</done>
</task>

<task type="auto">
  <name>Task 2: Harmonize the document title scale and retire the token it orphans</name>
  <files>src/web/styles/globals.css</files>
  <action>
In the `.artifact-heading h1` rule (`:2739`), change the `font-size` from the display-2 step to
`var(--fs-display-3)`, matching `.page-stack > h1, .page-intro h1` at `:848`. Change nothing else in
that rule — `max-width: 22ch`, `margin`, `overflow-wrap`, `letter-spacing` and `line-height` all stay.

That retarget removes the only consumer of the display-2 token in the repository, which turns
`test/token-guard.test.ts:679` red. Per Finding 2, the assertion is live and correct, so delete the
now-unreferenced display-2 definition from the type token block at `globals.css:223` as part of this
same task. Do not weaken, skip or edit the guard.

Leave `--space-fluid-11` (`:200`) in place even though Task 1 orphans it: the sibling assertion at
`token-guard.test.ts:643` deliberately excludes the `--space-fluid-*` family from its consumption
check, which is the project's standing answer that the fluid ramp is kept whole.
  </action>
  <verify>
    <automated>cd /home/cinedise/labelore && npx vitest run --reporter=dot && awk '/^\.artifact-heading h1 \{/,/^\}/' src/web/styles/globals.css | grep -q 'font-size: var(--fs-display-3);' && test "$(grep -cE '^[[:space:]]*--fs-display-2:' src/web/styles/globals.css)" = 0</automated>
  </verify>
  <done>`.artifact-heading h1` renders at `--fs-display-3`; two numbered display steps remain defined; `token-guard.test.ts` passes unmodified.</done>
</task>

<task type="auto">
  <name>Task 3: Drop the duplicated horizontal rule above the document heading</name>
  <files>src/web/styles/globals.css</files>
  <action>
`.artifact-breadcrumbs` (`:2723`) and `.artifact-heading` (`:2168`) each draw a 1px rule, stacking two
of them roughly 5rem apart at the top of every document page. Remove both bottom-edge declarations
from `.artifact-breadcrumbs` — the rule itself and the `padding-bottom: var(--space-3-5)` that existed
only to stand the breadcrumb text off it. Keep `font-family` and `font-size` in that rule.

Keep the rule on `.artifact-heading` (`:2171`) — that is the one that survives, matching the
single-rule idiom of `.section-heading.compact` at `:1290`.

After removal, the breadcrumbs-to-heading spacing comes from the `.artifact-page` grid gap plus
`.artifact-heading`'s own `padding-top: var(--space-fluid-3)` (`:2736`); do not add replacement
spacing unless the rendered gap visibly collapses.

Write no CSS comment inside either `.artifact-breadcrumbs` rule block — a comment there would defeat
the region-scoped check in this task's verify gate. Explain the removal in the commit message instead.
  </action>
  <verify>
    <automated>cd /home/cinedise/labelore && npx vitest run --reporter=dot && npm run lint && test "$(awk '/^\.artifact-breadcrumbs \{/,/^\}/' src/web/styles/globals.css | grep -cE '^[[:space:]]*[a-z-]*bottom:')" = 0 && awk '/^\.artifact-heading \{/,/^\}/' src/web/styles/globals.css | grep -q 'border-bottom'</automated>
    <human-check>Start the dev server against a GSD project, open any artifact page and any plan-pair page, and hard-refresh each. Confirm three things: the container does not jump wider or taller the moment the document lands; the page width and top padding match the dashboard and roadmap pages; and exactly one horizontal rule sits above the document body. Check once at a narrow window width too.</human-check>
  </verify>
  <done>Neither `.artifact-breadcrumbs` block declares a bottom edge; `.artifact-heading` keeps its rule; lint and all 843 tests pass.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| (none introduced) | No boundary is created, moved or widened by this change. |

## Assessment

Stated plainly rather than padded: Labelore is a local, read-only dashboard, and this change edits
two `className` string literals and a handful of CSS declarations. It introduces no new input
surface, crosses no network boundary, adds no dependency, touches no parsing or filesystem code, and
changes no data flow. The rendered-document pipeline — which is where this application's real
untrusted-input risk lives, in `rehype-raw` followed by `rehype-sanitize` — is not in scope and is
not modified. ASVS L1; nothing here reaches the `security_block_on: high` threshold.

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-mzr-01 | Information Disclosure | `.artifact-page` / `.page-stack` container geometry | low | accept | A width or padding change cannot expose data the page was not already rendering. No content is unhidden — no `display`, `visibility`, `overflow` or clipping declaration is added or removed by any task. |

No package-manager install task exists in this plan, so no `T-mzr-SC` supply-chain row applies and
no package-legitimacy checkpoint is required.
</threat_model>

<capability_checkpoints>
Evaluated honestly against this task's scope; three of four legitimately do not apply.

- **ai-integration** — skipped. Quick mode resolves no `PHASE`/`PHASE_DIR`, so the detector returns
  `skipped` rather than a verdict. Independently true on the merits: this change integrates no
  external API, SDK or service. No COVERAGE.md.
- **assumption-delta** — skipped. No `${PHASE}` in quick mode, so the scan emits `skipped`; the
  `detected` key is absent and is not read as false. No singular->plural, required->optional or
  derived->chosen transition occurs here regardless.
- **schema-gate** — skipped. Scanned for Payload / Prisma / Drizzle / Supabase / TypeORM schema
  paths; none exist in this repository and this plan touches only `.tsx` and `.css`. No blocking
  schema-push task injected.
- **security** — applied. See `<threat_model>` above.
</capability_checkpoints>

<verification>
Baseline established at planning time: 53 test files / 843 tests pass at HEAD (a57ce05) in ~2.1s.
Any failure after these edits is attributable to this change.

Two failures are foreseeable and both are real signals, not obsolete assertions:

1. `test/token-guard.test.ts:679` — fires if Task 2 retargets the display-2 consumer without
   deleting its definition. Fix the stylesheet, never the guard.
2. `test/web/css-source-order.test.ts` — should stay green. Task 1 only deletes declarations, and the
   guard flags same-selector media-override defeats, which deletion cannot create.

These were checked at planning time and do **not** assert on the loaded-state `main` className, so
they should stay green: `shell-contract.test.ts:142-155` (asserts `ArtifactHeader` usage and that the
breadcrumb/heading classNames live in the component, not the pages), `loading-state-contract.test.ts`
(reads only the pending branch, which no task touches), `visual-contract.test.ts:627` (reads the
first `.page-stack` block at `:823`, which no task touches), plus `degradation-ui-contract`,
`empty-state-contract` and `build-splitting`.

If any contract test does fail, establish that its assertion is genuinely obsolete before changing
it, and say so explicitly in the summary.
</verification>

<success_criteria>
- Loading, error and loaded states on both document pages render identical container geometry — no
  reflow on data arrival (MZR-01).
- Width `min(86rem, 100%)`, top padding `--space-fluid-14`, narrow-viewport top padding `--space-10`
  all arrive from `.page-stack`; none of the three is declared on `.artifact-page` (MZR-02).
- `.artifact-heading h1` is `--fs-display-3` and no orphaned `--fs-*` token remains (MZR-03).
- One horizontal rule above the document body, not two (MZR-04).
- `.plan-pair-page` still spaces at `--space-8`.
- 53 files / 843 tests pass; `npm run typecheck` and `npm run lint` clean.
- The out-of-scope duplicate blocks (`.page-stack` at 823/2509, `.artifact-heading` at 2168/2734,
  `.artifact-breadcrumbs` at 2155/2723) are left unconsolidated. The rendered document body,
  metadata/warning disclosures and document outline are untouched.
</success_criteria>

<output>
Create `.planning/quick/260920-mzr-fix-document-page-chrome-drift-and-the-l/260920-mzr-SUMMARY.md` when done.

State explicitly in the summary: whether the 86rem / `--space-fluid-14` / `--space-10` values arrived
free from `.page-stack` or needed diagnosis; that the `--fs-display-2` definition was removed because
`token-guard.test.ts` demands it; and any test file changed, with the argument for why its assertion
was genuinely obsolete.
</output>
