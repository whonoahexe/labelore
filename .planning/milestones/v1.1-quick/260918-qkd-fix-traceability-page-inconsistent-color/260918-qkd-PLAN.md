---
phase: quick-260918-qkd
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/presentation/traceability.ts
  - src/web/pages/traceability-page.tsx
  - src/web/styles/globals.css
  - test/presentation/traceability.test.ts
  - test/web/traceability-redesign-contract.test.ts
  - test/web/css-source-order.test.ts
autonomous: true
requirements: [QKD-01, QKD-02, QKD-03, QKD-04, QKD-05, QKD-06, QKD-07, QKD-08, QKD-09, QKD-10]

estimate:
  tokens: 95000
  raw_tokens: 95000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "The projection distinguishes four covering-phase outcomes as separate, disjoint buckets — covered by a phase complete on disk, covered by a phase in flight, covered by a phase with no directory on disk, and not covered at all — plus a fifth for a covering reference that resolves to no phase; the five always sum to total (QKD-01)"
    - "Every bucket in that partition is derived from the covering phases' own observed state alone; the requirement's own checkbox is never read inside the partition, and the requirement side is reported as its own separate tally (QKD-01, QKD-02)"
    - "The headline figure reports the share whose covering phase is complete on disk, so a project with in-flight and directory-less covering phases can no longer read 100%; the tracing figure it replaces survives as its own sentence rather than being deleted (QKD-02)"
    - "The stat tiles report where the work actually stands — a count per partition bucket plus the requirement side's own checked tally — instead of two permanently-zero figures (QKD-02)"
    - "The bar's covered fill is a recipe that reads as the site's accent adjusted per theme, not a muddy maroon in dark and a washed pastel in light, and every bar segment including the uncovered share paints a visible tone against the track (QKD-03)"
    - "The requirement's own claimed status and the covering phase's own state are visually and verbally distinguishable at a glance — different wording and a source marker — while still travelling as two separate signals that are never merged into one verdict (QKD-04)"
    - "A covering phase that is in flight, one with no directory on disk, and one whose reference resolves to nothing each render in a distinct tone; they no longer collapse into a single grey chip (QKD-05)"
    - "The deferred-tier control announces as a switch, carries no button chrome, and its on-state speaks the same primary language as the active filter button beside it (QKD-06)"
    - "A trace row has no dead vertical gap between the ID and the text it labels, no ~180px of empty right margin, a shared top baseline across both columns, and no per-row repetition of what are really column headers (QKD-07)"
    - "The narrow-viewport single-column collapse actually applies at 390px, and a source-order guard fails if any narrow-viewport override in the stylesheet is ever again beaten by a later top-level rule of equal specificity (QKD-08)"
    - "The page never states that nothing matches the filter while rows are visibly rendering below, and the deferred-tier control's label describes what it actually does (QKD-09)"
    - "npm test, npm run typecheck, npm run lint and npm run build all pass; no new runtime dependency is added to package.json"
  artifacts:
    - path: "src/presentation/traceability.ts"
      provides: "A five-bucket, phase-sourced TraceabilityCoverage partition plus a separately-reported requirement-side tally and mismatch count"
    - path: "src/web/pages/traceability-page.tsx"
      provides: "Honest headline + legend tiles, a five-segment bar, per-disk-status phase chip tones, self-identifying chip copy, a real switch, and a scope-correct empty note"
    - path: "src/web/styles/globals.css"
      provides: "Named recipe tokens for every bar/chip tone, two new chip tones, switch rules with no button chrome, corrected trace-row layout, and two relocated narrow-viewport overrides"
    - path: "test/web/css-source-order.test.ts"
      provides: "A general guard: no narrow-viewport override may be re-declared by a later equal-specificity top-level rule, with a planted-fixture positive control"
  key_links:
    - "test/web/visual-contract.test.ts requires src/web/pages/traceability-page.tsx to still contain the literals Uncovered, Status mismatch and Unresolved — all three chips/controls must survive every rename in this plan"
    - "test/web/visual-contract.test.ts requires the resting .trace-filter-button block to contain no var(--primary) and its [data-active='true'] block to contain it; it also pins .status-chip[data-tone='quiet'] as containing var(--muted-foreground) and not var(--primary), and the active/complete tone rule as containing var(--primary) — none of those four facts may move"
    - "test/web/visual-contract.test.ts's unrecognized-tone scan covers dashboard-page, roadmap-page and plan-pair-page only, so new data-tone values used exclusively on the traceability page do not trip it"
    - "test/web/focus-ring-contrast.test.ts resolves --ring through toMermaidColor(), which parses literal oklch(...) only and returns any other syntax unchanged, then asserts the result matches /^#[0-9a-f]{6}$/ and clears 3:1 against both grounds — .dark's --ring must stay a literal oklch value (see Task 2, QKD-10)"
    - "index.html's line count is pinned to exactly 143 by test/web/visual-contract.test.ts — do not edit index.html in this plan"
    - "test/token-guard.test.ts flags any usage-site color-mix() string that recurs at two sites or equals a token definition's value, and forbids two different tokens holding identical value strings in both themes — every new recipe string must be unique"
    - "test/web/traceability-redesign-contract.test.ts pins HISTORY_SELECTOR_LINE_COUNT_BEFORE_TASK_3 = 21 lines matching /\\.history-[\\w-]+/ in globals.css — add no history-prefixed rule"
    - "test/web/traceability-redesign-contract.test.ts pins the exact source string data-tone={status ? 'complete' : 'quiet'} — keep that ternary verbatim on its own line and add any new attribute on a separate line"
    - "test/presentation/traceability.test.ts Test 5 pins Object.keys(view.counts) to exactly disagreement/total/uncovered — new fields go on TraceabilityCoverage, never on TraceabilityCounts"
---

<objective>
Fix the traceability page against the live Playwright audit in `260918-qkd-FINDINGS.md`: a coverage
model that calls a requirement fully traced when its covering phase is in flight or has no directory
on disk, a one-off bar fill that reads as damage, two promised-separate status signals that render
identically, every non-complete phase state collapsed into one grey chip, a deferred-tier control
that is a button with a switch drawn inside it, a two-column row grid whose narrow-viewport collapse
is dead code, and an empty-filter message the page immediately contradicts.

Purpose: The page's job is to tell the truth about where requirements stand. Today it reports 100%
Traced over a project with ten in-flight and four directory-less covering phases, and it renders the
two signals it explicitly promises to keep separate in the same colour with nearly the same word.

Output: A phase-sourced five-bucket coverage partition with the requirement side reported beside it,
a token-derived tone per bucket, self-identifying chips, a real switch, a corrected row layout, and
a general source-order guard so the dead-media-query bug class cannot silently return.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/quick/260918-qkd-fix-traceability-page-inconsistent-color/260918-qkd-FINDINGS.md
@.claude/CLAUDE.md
@src/presentation/traceability.ts
@src/web/pages/traceability-page.tsx
@src/web/pages/traceability-filter.ts
</context>

<scope_note>
Findings coverage. Sections A, B, C, D and E of FINDINGS.md are each addressed below except one,
justified here:

- **A5 (`--ring` drifts from `--primary` in dark only) — deliberately not changed.** The dark ring
  is a hand-tuned literal on purpose: `test/web/focus-ring-contrast.test.ts` recomputes WCAG 1.4.11
  non-text contrast from the token itself and requires >= 3:1 against both `--background` and
  `--card`; the dark `--primary` at L 0.47 fails that floor, and brightening the ring to L 0.56 was
  the recorded fix (WINDOWS.md entry 7). Its resolver, `toMermaidColor()`, parses literal
  `oklch(...)` only and returns any other syntax unchanged, so replacing the literal with a
  `color-mix()` or relative-colour derivation would make that gate assert on a non-hex string. The
  drift is also already guarded — that test re-fails on any change to `--primary`, `--background`,
  `--card` or `--ring`. A5 is therefore closed as **documented, not changed** (QKD-10 in Task 2): a
  comment beside the `.dark` declaration recording why it is a literal and which test owns it.
  `index.html`'s mirrored copy is untouched — its line count is pinned to 143.
- **B3 (`mismatched` is near-impossible to trigger) — the rule is correct; the dead tile is the
  defect.** An unchecked requirement under an in-flight phase is agreement between the two signals,
  not disagreement, so `mismatched: 0` is the honest answer on this project. Task 1 therefore leaves
  `disagreesWithAnyCovering()` semantics alone, removes the permanently-zero tile from the headline
  in favour of figures that are never trivially zero, and renders both the mismatch tile and the
  mismatch filter button only when the count is non-zero — a dead control now reads as dead.
- **D1 revealed a second instance.** A planning-time scan of every `@media (max-width: 42rem)`
  declaration against later top-level rules found exactly two source-order defeats: `.trace-row`
  (media line 2122 beaten at 3829, the reported bug) and `.warning-fields` (media line 3146 beaten
  at 3518, previously unknown). The general guard in Task 3 requires both to be fixed.
</scope_note>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Honest coverage — a phase-sourced partition, the requirement side reported beside it (QKD-01, QKD-02; B1, B2, B4, B5)</name>
  <files>src/presentation/traceability.ts, src/web/pages/traceability-page.tsx, test/presentation/traceability.test.ts, test/web/traceability-redesign-contract.test.ts</files>
  <behavior>
    - A row whose only covering phase has `diskStatus: 'complete'` lands in the complete bucket and nowhere else.
    - A row whose only covering phase has `diskStatus: 'in_progress'` (or `'researched'`, or any unrecognised on-disk status) lands in the in-flight bucket.
    - A row whose only covering phase has `diskStatus: 'no_directory'` lands in the missing bucket.
    - A row whose every covering reference is unresolved lands in the unresolved bucket.
    - A row with no covering reference at all lands in the uncovered bucket.
    - A row covered by both a complete phase and an in-flight phase lands in the in-flight bucket — the weakest covering phase decides.
    - The five buckets always sum to `total`, for any input including the empty scope.
    - The two percentages are whole numbers and are both 0 for an empty scope, never NaN.
    - The requirement-side tally counts rows whose own `requirementStatus` is exactly `true`, and is computed without reading any covering phase.
    - Against `fixtures/dense`, every group's five buckets sum to that group's row count, and the groups' buckets sum to the whole-view buckets.
  </behavior>
  <action>
Rewrite the coverage layer in `src/presentation/traceability.ts` so the partition answers one
question only — what state is the covering phase in — and the requirement's own claim is reported as
a separate number beside it. This strengthens, rather than weakens, the module header's standing
invariant: today `coverageOf()` subtracts `mismatched` (a cross-signal flag) out of `covered`, which
is the one place the two signals do get folded together. After this task the partition reads the
phase side only, and `mismatched` becomes a sibling figure.

Replace the `TraceabilityCoverage` interface fields `covered`, `mismatched`, `coveragePercent` with,
in this order: `total`, `completePhase`, `inFlightPhase`, `missingPhase`, `unresolvedPhase`,
`uncovered`, `tracedPercent`, `completePhasePercent`, `claimedComplete`, `mismatched`. Name the first
five for the phase they describe so the invariant is self-documenting at every call site. Do not add
anything to `TraceabilityCounts` — an existing assertion pins its three keys.

Add a module-local `coveringRank()` helper taking a `TraceabilityCoveringPhase` and returning an
ordinal: unresolved lowest, then no-directory, then on-disk-but-not-complete, then complete highest.
Derive a row's bucket as the minimum rank across its covering phases (weakest link wins, so a
requirement split across a finished phase and an unfinished one is never reported as finished), with
the empty covering list short-circuiting to uncovered before any rank is taken. Treat
`diskStatus === 'complete'` as complete, `diskStatus === 'no_directory'` as missing, and every other
non-null status as in-flight, so a future status value added by `assemble.ts` degrades to the honest
"something exists, it is not finished" bucket rather than being dropped.

Rewrite `coverageOf()` to tally the five buckets in one pass, then compute `tracedPercent` from
`total - uncovered` over `total` and `completePhasePercent` from `completePhase` over `total`, both
rounded, both 0 when `total` is 0. Compute `claimedComplete` from `requirementStatus === true` only,
and `mismatched` from `statusDisagreement` only. Leave `disagreesWithAnyCovering()`,
`traceabilityRow()`, `TraceabilityRow`, `TraceabilityCounts` and the deferred-tier grouping exactly
as they are. Update the interface's doc comment to state that the partition is phase-sourced, that
`claimedComplete` is the requirement side's own tally, and that `mismatched` is deliberately not a
partition bucket so the partition can never silently become a merged verdict.

Then update the summary section of `src/web/pages/traceability-page.tsx` to report it. `CoverageBar`
gains two more segments — render, in partition order, complete / in-flight / missing / unresolved /
uncovered, each a `trace-bar-segment` with its own modifier class (`trace-bar-complete`,
`trace-bar-in-flight`, `trace-bar-missing`, `trace-bar-unresolved`, `trace-bar-uncovered`), each
still `aria-hidden`, each width a percentage of `total`. Rename the existing `trace-bar-covered`
class to `trace-bar-complete` and rename `trace-bar-mismatched` to `trace-bar-unresolved` (the
mismatch flag is no longer a segment); carry the corresponding stylesheet renames in Task 2. Rewrite
the container's `aria-label` to name all five counts and keep the phrase "covering phase" in it.

In the headline: the big value becomes `completePhasePercent`, its micro-label becomes the phrase
"Covered by complete phases", and `.trace-coverage-percent-note` becomes a sentence that preserves
the old figure rather than deleting it — state that `tracedPercent` percent of requirements name a
covering phase at all, that this headline counts only those whose covering phase is finished on
disk, and that a requirement's own checkbox is reported separately as the Checked tile. Replace the
three stat tiles with: Total, Complete phase, In flight, No directory, Uncovered — always rendered,
each carrying a `data-bucket` attribute matching its bar segment so Task 2 can turn the tiles into
the bar's legend — then Unresolved rendered only when `unresolvedPhase` is above zero, then Checked
(from `claimedComplete`), then Status mismatch rendered only when `mismatched` is above zero. Give
the requirement-side pair its own wrapper element so Task 2 can separate it visually from the
phase-side tiles. Every tile reads a field off `view.coverage` — no arithmetic, no recount.

Also render the Status mismatch filter button as `disabled` when `view.coverage.mismatched` is zero,
so the permanently-empty control reads as unavailable instead of as an empty result. Keep its label
text exactly `Status mismatch`. Change the per-category readout from the traced count to
`{group.coverage.completePhase}/{group.coverage.total} complete`, keeping it on one line inside
`.trace-category-readout`.

Update both test files in the same commit. In `test/presentation/traceability.test.ts`: the
`TraceabilityCoverage` describe block's Tests 1-4 and 6 and the `TraceabilityGroup.coverage` block's
Tests 1-3 all read the removed fields — rewrite them against the new shape and add one case per
bullet in this task's behavior block, including the weakest-link case and the unrecognised-status
case. Keep Test 5's `counts` key pin unchanged. In
`test/web/traceability-redesign-contract.test.ts`: update the stat-tile assertion, the
category-readout regex, and the `.trace-bar-covered` / `--traced-fill` assertions to the new class
and token names (Task 2 sets the token's final recipe), and add assertions that the page renders a
`data-bucket` attribute per partition tile and reads `completePhasePercent` for the hero value.
  </action>
  <verify>
    <automated>cd /home/cinedise/labelore && npm run typecheck && npm test -- test/presentation/traceability.test.ts test/web/traceability-redesign-contract.test.ts</automated>
  </verify>
  <done>`TraceabilityCoverage` exposes the five phase-sourced buckets plus `tracedPercent`, `completePhasePercent`, `claimedComplete` and `mismatched`; the five buckets sum to total on every tested input including `fixtures/dense`; the hero reads `completePhasePercent` and its note preserves the tracing figure in prose; the tiles are the partition plus the requirement side; typecheck passes with no consumer left reading a removed field.</done>
</task>

<task type="auto">
  <name>Task 2: One token vocabulary for every tone — bar fills, two new chip tones, two distinguishable signals (QKD-03, QKD-04, QKD-05, QKD-10; A1, A2, A3, A4, A5)</name>
  <files>src/web/styles/globals.css, src/web/pages/traceability-page.tsx, test/web/traceability-redesign-contract.test.ts</files>
  <action>
All new colour lands as named recipes in the `:root` recipe block beside `--primary-tint` and
`--destructive-tint`, each derived from the existing token set, each a unique value string (the
token guard fails two tokens holding identical strings in both themes, and fails any usage-site
recipe that recurs or duplicates a token's value). Each recipe below is chosen so one string works
in both themes: mixing toward `--foreground` darkens in light and lightens in dark, which is
exactly the per-theme behaviour a fill needs against a `--muted` track and chip text needs against a
`--muted`-washed chip.

Redefine `--traced-fill` — today `var(--primary)` 40% into `var(--muted)`, which measures as a muddy
maroon in dark and a washed pastel in light — as `var(--primary)` 80% into `var(--foreground)`.
Add four more recipe tokens beside it:

- `--in-flight-fill`: `var(--primary)` 38% into `var(--muted-foreground)` — the accent, drained of
  commitment. Used by the in-flight bar segment and the in-flight chip's text.
- `--missing-fill`: `var(--destructive)` 35% into `var(--muted-foreground)` — a subdued brick that
  reads as a gap rather than as damage. Used by the missing bar segment and chip.
- `--unresolved-fill`: `var(--destructive)` 75% into `var(--foreground)` — full alarm, reserved for
  a reference that resolves to no phase at all.
- `--uncovered-fill`: `var(--muted-foreground)` 28% into `var(--muted)` — a neutral tone that is
  visibly distinct from the `--muted` track in both themes, replacing today's `transparent`, which
  made an uncovered share indistinguishable from unfilled track (A4).

Point the five renamed bar-segment rules from Task 1 at these tokens: `.trace-bar-complete` at
`--traced-fill`, `.trace-bar-in-flight` at `--in-flight-fill`, `.trace-bar-missing` at
`--missing-fill`, `.trace-bar-unresolved` at `--unresolved-fill`, `.trace-bar-uncovered` at
`--uncovered-fill`. No raw token and no `transparent` remains as a segment fill; the bar now mixes
nothing but named recipes. Leave `.trace-bar`'s own `var(--muted)` track background and
`var(--space-0-5)` padding gutter untouched — both are pinned by existing assertions.

Add two chip tones next to the existing destructive and warning tone rules, each with a unique
inline border recipe and its fill token as the text colour, and no background override so both
inherit the shared `.status-chip` wash: an `in-flight` tone rule with
`border-color` mixing `var(--in-flight-fill)` 50% into `var(--border)` and `color:
var(--in-flight-fill)`, and a `missing` tone rule with `border-color` mixing `var(--missing-fill)`
50% into `var(--border)` and `color: var(--missing-fill)` — both selectors written in the same
`.status-chip[data-tone='...']` attribute form the four existing tone rules use. Do not touch the `active`/`complete`, `quiet`, `destructive` or `warning` tone
rules; three of them are pinned by `visual-contract.test.ts`.

In `src/web/pages/traceability-page.tsx`, replace `CoveringPhaseEntry`'s binary tone expression with
a module-level lookup from disk status to tone: `complete` to `'complete'`, `in_progress` and
`researched` to `'in-flight'`, `no_directory` to `'missing'`, anything else (including null) falling
back to `'quiet'` (A3 — an actively-worked phase and a phase with nothing on disk stop being the
same grey chip). Keep the unresolved branch's `data-tone="destructive"` and its `Unresolved` label
exactly as they are.

For A2 — the two signals the lede promises to keep separate currently render as the same chip with
nearly the same word — apply two changes and no colour merge. First, copy: change
`RequirementStatusChip`'s labels from `Complete`/`Incomplete` to `Checked`/`Unchecked`, so the chip
names the checkbox it is reporting and can never be read as a verdict about the phase. Keep the
expression `data-tone={status ? 'complete' : 'quiet'}` byte-identical on its own line — it is pinned
by source assertion — and add the new attribute on a separate line. Second, source marking: add
`data-signal="requirement"` to the requirement chip and `data-signal="phase"` to the covering-phase
chip, and in the stylesheet give `.status-chip[data-signal='phase']::before` a
`var(--space-1-5)`-square `currentColor` block with an inline-end margin of `var(--space-1)`, so a
phase-sourced chip carries a visible source marker at a glance. Squared corners, no radius, per the
sheet's convention.

Finally QKD-10: add a comment immediately above `.dark`'s `--ring` declaration recording that the
value is a deliberately hand-tuned literal, that dark `--primary` at L 0.47 fails the WCAG 1.4.11
3:1 non-text floor against `--background` and `--card`, and that
`test/web/focus-ring-contrast.test.ts` owns the value and re-fails on any change to `--primary`,
`--background`, `--card` or `--ring`. Change no value, and do not edit `index.html`.

Extend `test/web/traceability-redesign-contract.test.ts` with a describe block for this task
asserting, via the existing `ruleBlocks()` idiom: each of the five bar-segment rules resolves to its
named token and none contains `transparent` or a bare `var(--primary)` / `var(--destructive)`; all
five recipe tokens are declared in the `:root` recipe block; both new chip tone rules exist and
reference their fill token; the phase-signal marker rule exists; the disk-status lookup in the page
maps all four known statuses; and the requirement chip renders the new copy while the pinned tone
ternary is unchanged.
  </action>
  <verify>
    <automated>cd /home/cinedise/labelore && npm test -- test/token-guard.test.ts test/web/visual-contract.test.ts test/web/focus-ring-contrast.test.ts test/web/traceability-redesign-contract.test.ts</automated>
  </verify>
  <done>Every bar segment and both new chip tones resolve to a named recipe token defined once in `:root` and derived from the existing palette; the uncovered segment is visible against the track in both themes; in-flight, no-directory and unresolved covering phases render three distinct tones; the requirement chip says Checked/Unchecked and the phase chip carries a source marker; `--ring` is unchanged and now documented; the token guard, visual contract and focus-ring contrast suites all pass untouched.</done>
</task>

<task type="auto">
  <name>Task 3: Row layout, a real switch, a self-consistent filter, and a source-order guard (QKD-06, QKD-07, QKD-08, QKD-09; C1-C3, D1-D5, E1-E2)</name>
  <files>src/web/styles/globals.css, src/web/pages/traceability-page.tsx, test/web/css-source-order.test.ts, test/web/traceability-redesign-contract.test.ts</files>
  <action>
**Row layout (D2, D3, D5).** In `.trace-row`, add `align-items: start` so the primary and secondary
columns share a top baseline instead of starting at different optical heights, and change
`grid-template-columns` from `minmax(0, 1.6fr) minmax(0, 1fr)` to `minmax(0, 1fr) minmax(0, 20rem)`
— the secondary column's content measures 150-290px while it is currently allotted 468px at 1440,
so binding it near its content width returns roughly 400px to the requirement text. In
`.trace-row-primary`, add `align-content: start`, which removes the ~35px of dead space stretched
between the 11.2px ID label and the text it labels.

**Per-row column headers (D4).** Remove the two visible per-row micro-labels — 68 instances of what
are really column headers — and the deferred tier's `Scheduling` label, whose enclosing section is
already titled. Replace each with an `sr-only` span carrying the same words, so the accessible
naming survives exactly. Delete the now-unused `.trace-row-micro-label` rule from the stylesheet.
The chips are self-identifying after Task 2 (`Checked`/`Unchecked` plus a source marker on the phase
chip), which is what makes the labels removable. Keep the deferred branch's
`variant === 'deferred' && row.uncovered` condition, its `data-tone="quiet"` and its
`Not yet scheduled` text, and keep the `Uncovered` and `Status mismatch` chips — all are pinned by
source assertions.

**The switch (C1, C2, C3).** The control is a `button` with `aria-pressed` wearing the exact chrome
of the three filter buttons beside it, and its measured "active" appearance is really its hover rule
painting `var(--foreground)` — white in dark — louder than the adjacent button's genuine
`var(--primary)` active state. Keep the element a `button` and the `.trace-toggle*` class names, and
change three things. Semantics: `role="switch"` with `aria-checked={filter.includeHistory}`
replacing `aria-pressed` (keep `data-active` on the line immediately above it; the existing pinning
regex must be updated to match `aria-checked`). Chrome: remove `border`, `background` and the
inline padding from `.trace-toggle` so the track and thumb are the control's only surface and hover
can no longer impersonate an active state; the hover rule then changes only the label `color` to
`var(--foreground)`. State: rekey the two `[aria-pressed='true']` descendant rules to
`[aria-checked='true']` and add a rule giving the checked control's own label `color:
var(--primary)`, so its on-state speaks the same language as `.trace-filter-button[data-active='true']`.
Keep `min-height: var(--space-8)` so the row stays level, and keep the thumb's transform transition
(the global reduced-motion block already neutralises it).

**Filter honesty (E1, E2).** With `includeHistory` off the deferred tiers render in full, so the
page can currently print "No requirements match the current filter." directly above four visibly
rendered uncovered rows. Scope the sentence to what it actually describes: change it to
`No active-tier requirements match the current filter.` Relabel the switch from
`Search deferred tiers` to `Filter deferred tiers too`, which describes what the control does — it
governs whether the query and status filter reach the tiers, not whether the tiers are shown. And
when the switch is off while a filter is actually engaged (status is not `all`, or the trimmed query
is non-empty), render one quiet line inside the deferred section header — a new
`.trace-deferred-filter-note` paragraph styled like `.trace-coverage-percent-note` — stating that
the deferred tiers are shown unfiltered. Change nothing in `src/web/pages/traceability-filter.ts`;
the predicate's behaviour is the recorded D-03 decision and is correct — only the page's account of
it was wrong.

**Source order (D1) and its guard (QKD-08).** `@media (max-width: 42rem)` at line 2016 declares
`.trace-row { grid-template-columns: 1fr }` at line 2122, and the base `.trace-row` rule at line
3827 re-declares the same property with equal specificity later in the file, so the collapse never
applies at any width. Delete that entry from the early media block and add a new
`@media (max-width: 42rem)` block immediately after the `.trace-row` rules in the trace section,
declaring the single-column collapse there. A planning-time scan of the whole stylesheet found one
other instance of the identical bug: `.warning-fields { grid-template-columns: 1fr }` at media line
3146 is beaten by the base rule at 3518. Fix it the same way — move that override, together with
its sibling `.warning-fields dt:not(:first-child)` rule, out of the media block at 3133 and into a
new `@media (max-width: 42rem)` block placed after the `.warning-fields` rules further down.

Then add `test/web/css-source-order.test.ts` so this bug class cannot silently return. Following
`test/token-guard.test.ts`'s idiom — comment-stripping first, a brace-depth walker, no postcss — the
guard collects every (selector, property) pair declared inside any `@media (max-width: ...)` block,
splitting comma-separated and multi-line selector lists into individual selectors, then asserts that
no top-level rule whose selector list contains that identical selector declares that same property
at a later line. Run it over the live stylesheet expecting zero findings, and include a
planted-fixture positive control written to a `mkdtemp` directory (never the real source tree) that
reproduces the defeated-override pattern and asserts the guard reports it, plus a clean fixture with
the same rules in the correct order asserting it reports nothing — so the guard can never pass
vacuously.

Update the affected existing assertions in `test/web/traceability-redesign-contract.test.ts` (the
`aria-pressed` regex, the removed micro-label, the empty-note sentence) and add a describe block for
this task pinning: `.trace-row` declares `align-items: start` and the new column template,
`.trace-row-primary` declares `align-content: start`, `.trace-row-micro-label` no longer exists, the
switch carries `role="switch"` and `aria-checked`, `.trace-toggle` declares no `border` or
`background`, and the page contains the scoped empty-note sentence and the new switch label.
  </action>
  <verify>
    <automated>cd /home/cinedise/labelore && npm run typecheck && npm run lint && npm test && npm run build</automated>
  </verify>
  <done>The narrow-viewport collapse applies at 390px for `.trace-row` and `.warning-fields`; `test/web/css-source-order.test.ts` reports zero findings against the live sheet and catches its planted fixture; the row grid has a shared top baseline, no dead gap under the ID, a content-bound secondary column and no repeated column headers; the deferred control announces as a switch with no button chrome and a primary on-state; the empty note is scoped to the active tier and the switch label describes its real effect; the full suite, typecheck, lint and build all pass.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target `.planning/` -> reader | Untrusted markdown from an arbitrary GSD project crosses into the presentation layer |
| server -> browser | Projection JSON crosses into React rendering |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-qkd-01 | Information disclosure | `coverageOf()` in `src/presentation/traceability.ts` | low | mitigate | The partition reads only `diskStatus` and `resolved`, both already in the DTO; no new filesystem read, no new path is exposed, and the tool stays read-only |
| T-qkd-02 | Tampering | Phase `diskStatus` string from an arbitrary target project | low | mitigate | The bucket mapping matches two known literals and routes every other non-null value to the in-flight bucket, so an unexpected status degrades rather than dropping a row out of the partition; the chip tone lookup falls back to `quiet` for the same reason |
| T-qkd-03 | Spoofing | Requirement text / phase name rendered into chips and rows | low | accept | React escapes all of it by default and this task introduces no `dangerouslySetInnerHTML`; unchanged from the current page |
| T-qkd-SC | Tampering | npm/pip/cargo installs | high | mitigate | No package is installed by this plan — `package.json` is not in `files_modified`, and the plan-level verification asserts it is unchanged |
</threat_model>

<verification>
1. `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` all pass.
2. `git diff --stat package.json package-lock.json` is empty — no dependency was added.
3. `git diff --stat index.html` is empty — its line count is pinned at 143.
4. Browser check (the Playwright MCP server is unusable here; write a small node script using the
   installed `playwright-core` at
   `/tmp/claude-1000/-home-cinedise-labelore/78de64a6-354a-4221-ae4e-2225f6484e74/scratchpad/pw` with
   an explicit `executablePath` of
   `/home/cinedise/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`). Start the dev server
   against a target project — `npm run dev -- fixtures/dense` — and on `/traceability` confirm:
   - The hero percentage is below 100 whenever the bar shows a non-zero in-flight or missing
     segment, and the note beneath it still states the tracing figure.
   - `getComputedStyle` on all five `.trace-bar-segment` elements returns five distinct non-transparent
     backgrounds, in both light and dark.
   - A requirement chip and its neighbouring phase chip differ in text and the phase chip renders a
     `::before` marker; an in-flight, a no-directory and a complete phase chip resolve to three
     different `color` values.
   - `getComputedStyle(document.querySelector('.trace-row')).gridTemplateColumns` reports a single
     track at a 390px viewport and two tracks at 1440px.
   - The deferred control reports `role === 'switch'` with a live `aria-checked`, and its computed
     `border-width`/`background-color` show no button chrome.
   - Selecting the Uncovered filter never prints an empty-scope sentence that contradicts rows
     rendered below it.
</verification>

<success_criteria>
Every finding in FINDINGS.md sections A, B, C, D and E is either fixed by a task above or closed in
`<scope_note>` with its reason (A5, and the B3 reframe). The coverage partition is disjoint,
phase-sourced and sums to total; the requirement side is reported beside it and never inside it. All
four verification steps pass.
</success_criteria>

<output>
Create `.planning/quick/260918-qkd-fix-traceability-page-inconsistent-color/260918-qkd-SUMMARY.md` when done
</output>
