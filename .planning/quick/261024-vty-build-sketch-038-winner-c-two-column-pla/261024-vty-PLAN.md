---
phase: quick-261024-vty
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/planning-repo/naming.ts
  - test/naming.test.ts
  - src/presentation/tree-labels.ts
  - src/presentation/roadmap.ts
  - src/presentation/drawer.ts
  - src/presentation/drawer-route.ts
  - src/server/index.ts
  - test/presentation/drawer.test.ts
  - test/portability.test.ts
  - src/web/components/planning-places.tsx
  - src/web/components/sidebar-drawer.tsx
  - src/web/components/tree-navigator.tsx
  - src/web/components/empty-state.tsx
  - src/web/styles/globals.css
  - docs/design-language.md
  - test/web/shell-contract.test.ts
  - test/web/visual-contract.test.ts
  - test/web/loading-state-contract.test.ts
  - test/web/degradation-ui-contract.test.ts
  - test/web/empty-state-contract.test.ts
  - test/e2e/planning-drawer.spec.ts
autonomous: true
requirements: [QVTY-01, QVTY-02, QVTY-03, QVTY-04, QVTY-05, QVTY-06, QVTY-07, QVTY-08]

estimate:
  tokens: 300000
  raw_tokens: 300000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "QVTY-01: The planning-files drawer is about 38rem wide (min(38rem, 94vw)) and has two columns. The left column lists places under two headings, Current (with the current milestone's version when one exists) and Shipped. The right column shows the chosen place's files under a header with where it is (for example `v1.1 · Phase 05`), its name, and, for a phase, a status chip."
    - "QVTY-02: A phase's files come in three stages in the existing lifecycle order: Before plans (CONTEXT, DISCUSSION-LOG, SPEC, AI-SPEC, UI-SPEC, RESEARCH, PATTERNS, COST-MODEL, VALIDATION, as in tree-labels.ts), then Plans (one row per plan, linking to the plan page, with a square that fills once the SUMMARY exists, and a count like `4 of 6 done` or `none yet`), then After (REVIEW, REVIEW-FIX, VERIFICATION, SECURITY, UAT, LEARNINGS). Any other markdown file in the phase (UI-REVIEW, deferred-items, a SUMMARY with no PLAN) goes in a trailing Other files stage, so nothing the old tree showed disappears."
    - "QVTY-03: The Quick tasks place is grouped by month, newest first. Each task is one row (short date and readable name) that opens to a single row of chips, one per markdown file (Context · Plan · Summary · Verification · …). Current quick tasks come from `.planning/quick/`. A shipped milestone's quick tasks come from `.planning/milestones/vX.Y-quick/`."
    - "QVTY-04: Shipped has one row per milestone, newest first, showing the version, the name from MILESTONES.md (falling back to the ROADMAP name) and the ship date. Choosing one unfolds its phases and its Quick tasks row underneath, indented. A shipped milestone's own place lists its documents (Roadmap, Requirements, Milestone audit, …), its phases (each one opens that phase) and an `All N quick tasks` row. Archived phases live only inside their milestone. There is no separate Archived phases or Milestones group."
    - "QVTY-05: The row for the current page (a phase file, a plan, a quick-task chip or a milestone document) has the active bar (data-active plus aria-current=page). Each time the drawer opens, it lands on the place that holds the current page: that shipped milestone is unfolded, and the quick task is open. When no place holds the page, it opens on a computed default (the state's current phase, then the first unfinished current phase, then the Current quick tasks, then the newest shipped milestone)."
    - "QVTY-06: At a phone width (42rem and below) the drawer is one column. Places show first. Choosing a place drills into its files, and an `All places` back link returns to the places."
    - "QVTY-07: The Project and Research groups are gone: no root and no research file appears in the drawer. The expand-all control is gone: the drawer header holds only the title and the close button."
    - "QVTY-08: Every row comes from the real reader through a new pure projection served at GET /api/drawer. Nothing is hardcoded from the sketch. Unknown or odd files degrade instead of breaking: /api/drawer returns 200 for every portability fixture, and every markdown file in the phase, archived-phase, quick and milestone-root locations appears in exactly one place. The only exceptions are files with no recoverable milestone version or no owning phase, and search still finds those. Nothing under `.planning/` is written apart from this quick task's own directory. The class-vocabulary test and the retargeted contract tests pass. Only test/e2e/planning-drawer.spec.ts is run in the browser."
  artifacts:
    - path: "src/presentation/drawer.ts"
      provides: "pure projection ProjectPresentation -> DrawerViewModel (current phases + quick tasks, shipped milestones with documents, phases and quick tasks, defaultPlaceKey)"
      contains: "export function buildDrawerViewModel"
    - path: "src/presentation/drawer-route.ts"
      provides: "pure route lookups the client uses: which place and which quick task hold a pathname, which shipped milestone owns a place"
      contains: "export function placeKeyForPath"
    - path: "src/web/components/planning-places.tsx"
      provides: "the two-column drawer body (places list + files panel, phone drill-down)"
      contains: "export function PlanningPlaces"
    - path: "src/server/index.ts"
      provides: "GET /api/drawer"
      contains: "app.get('/api/drawer'"
    - path: "test/presentation/drawer.test.ts"
      provides: "projection + route-lookup unit tests over fixtures/dense, in-memory fixtures and this repo's own corpus"
      contains: "buildDrawerViewModel"
    - path: "test/e2e/planning-drawer.spec.ts"
      provides: "the drawer browser test (desktop and phone), data resolved from /api/drawer"
      contains: "All places"
    - path: "docs/design-language.md"
      provides: "the drawer's class names registered for the vocabulary test"
      contains: "### Planning files drawer"
  key_links:
    - from: "src/web/components/sidebar-drawer.tsx"
      to: "src/web/components/planning-places.tsx"
      via: "the Dialog popup renders PlanningPlaces with the open flag and the close-on-navigate callback"
      pattern: "<PlanningPlaces open=\\{open\\} onNavigate"
    - from: "src/web/components/planning-places.tsx"
      to: "src/server/index.ts GET /api/drawer"
      via: "useDrawerQuery (react-query key ['drawer']) fetches the projection"
      pattern: "/api/drawer"
    - from: "src/server/index.ts"
      to: "src/presentation/drawer.ts"
      via: "buildDrawerViewModel(derived.presentation) per request, same as /api/tree"
      pattern: "buildDrawerViewModel\\(derived\\.presentation\\)"
    - from: "src/web/components/planning-places.tsx"
      to: "src/presentation/drawer-route.ts"
      via: "on every open the selected place resets to placeKeyForPath(model, pathname) or model.defaultPlaceKey"
      pattern: "placeKeyForPath\\("
    - from: "src/presentation/drawer.ts"
      to: "src/presentation/tree-labels.ts"
      via: "lifecycle tables, labels, quick ranks and version ordering are reused, never re-declared"
      pattern: "PRE_PLAN_ARTIFACT_ORDER"
---

<objective>
Build sketch 038's winner C ("C seems perfect") into the real planning-files drawer. The drawer widens
to two columns: places on the left (Current: phases and Quick tasks; Shipped: one row per milestone,
unfolding to its phases and quick tasks) and the chosen place's files on the right (a phase as Before
plans · Plans · After, quick tasks by month with chip rows, a shipped milestone's documents, phases and
quick-task link). On a phone it drills down with an "All places" back link. The Project and Research
groups go, the expand-all control goes, and archived phases merge into their shipped milestone.

Purpose: a phase today lists up to 25 files in one flat run and a shipped milestone is split across two
groups. The two columns end deep nesting, and every place is one click from its files.
Output: a pure `/api/drawer` projection with unit tests, a new two-column drawer component that
replaces the tree navigator, CSS and design-language entries, retargeted contract tests, and a new
Playwright spec.

Spec: `.planning/sketches/038-sidebar-after-dashboards/README.md` `## Winner` (authoritative) and
`index.html` variant C (`renderC`, `phaseFiles`, `bQuickRows`, `quickChips`, the `.c-*` CSS) as the
visual reference. Build from real reader data only. The sketch's sample data, the `Executing` status
word and its `Oct 9` date format are not copied. Statuses use the plain words below, and dates use the
app's existing `activityDateLabel` format (`21 Sep`).
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@.planning/sketches/038-sidebar-after-dashboards/README.md
@.planning/sketches/038-sidebar-after-dashboards/index.html
@docs/design-language.md
@src/web/components/sidebar-drawer.tsx
@src/web/components/tree-navigator.tsx
@src/presentation/tree.ts
@src/presentation/tree-labels.ts
@src/presentation/roadmap.ts
@src/presentation/dashboard-head.ts
@src/server/project-presentation.ts

Facts gathered while planning (verified against HEAD):
- The drawer today: `SidebarDrawer` (a `@base-ui/react` Dialog with `keepMounted`) renders
  `TreeNavigator`, which fetches `/api/tree` (`buildTreeViewModel` in src/presentation/tree.ts).
  `/api/tree` and `buildTreeViewModel` stay as they are, because test/portability.test.ts,
  test/server/refresh.test.ts and test/presentation/tree.test.ts exercise them. The drawer just stops
  calling them.
- `ProjectPresentation.milestones[]` holds `MilestoneDto { key, version, name, archived, phases[] }`.
  Each `PhaseDto` has `key`, `identity`, `name`, `dirPath`, `archived`, `roadmapComplete` and
  `plans[]`. Each `PlanDto` has `key` (already the plan page URL, for example
  `/milestones/m~v1.0/phases/p~…/plans/01-01`), `id` (`01-01`), `planNumber`, `path` and
  `summary: { key (a token, not a URL), path } | null`. Each `ArtifactDto` has `key` (its page URL),
  `path`, `kind`, `location`, `milestoneKey`, `phaseKey` (equal to `PhaseDto.key`), `warnings` and
  `bodyLength`.
- Locations: `phase` (`.planning/phases/…`), `archived-phase` (`.planning/milestones/vX.Y-phases/…`),
  `quick` (`.planning/quick/<dir>/…`) and `milestone-root` (everything else under
  `.planning/milestones/`). That last one includes archived quick tasks at
  `.planning/milestones/vX.Y-quick/<dir>/<file>`, which come with a null `milestoneKey`, so the
  version has to be recovered from the `vX.Y-quick` path segment.
- This repo (the Playwright target on port 4199): no live milestone (STATE says v1.1, which is
  archived). Shipped v1.0 (phases 01–04) and v1.1 (phase 05). 40 current quick dirs, 14 in
  `milestones/v1.1-quick`, some in `milestones/v1.0-quick`. MILESTONES.md has `v1.1 Legible
  Documents (Shipped: 2026-09-21)` and `v1.0 MVP (Shipped: 2026-09-10)`. ROADMAP milestone names are
  noisy (`✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-09-10`), so names come from MILESTONES.md. The client
  runs `stripEmoji` (src/web/pages/strip-emoji.ts) over every milestone name it renders.
- fixtures/dense: live v3.0 `Live Read Surface` (phase 01 complete with 2 plans, phase 02 in progress
  with 1 plan), shipped v2.0 (phases 01, 02) and v1.0 (phase 01). Each has ROADMAP, REQUIREMENTS and
  MILESTONE-AUDIT docs. 3 quick files. STATE phase 1, milestone v3.0.
- Contract tests read source text. test/web/shell-contract.test.ts, visual-contract.test.ts,
  loading-state-contract.test.ts, degradation-ui-contract.test.ts and empty-state-contract.test.ts pin
  `tree-navigator.tsx`, `<TreeNavigator …/>`, `--drawer-width: min(22rem, 88vw);`, the `.tree-*` CSS
  rules and the `.tree-navigator` member of the scrollbar container selector. test/web/class-vocabulary.test.ts
  fails on any className token not documented as a `| \`name\` |` row in docs/design-language.md.
- The CSS slice trap: visual-contract's narrow-viewport test slices globals.css from the first
  `@media (max-width: 62rem)` (line ~3641) to the first `@media (max-width: 42rem)` (line ~3688). A new
  42rem block placed above line 3641 would break that slice. Put the phone rules inside, or after, the
  existing first 42rem block.
- Playwright (playwright.config.ts) starts its own `node src/server/index.ts . --port 4199` in
  development mode (Vite serves the source), so no build is needed before the spec. Never touch ports
  4173 and 4174. Screenshots go under `test/e2e/screenshots/` (gitignored), via `SCREENSHOT_ROOT` from
  test/e2e/pages.ts.
- Design rules (docs/design-language.md "Language beyond names" plus saved user feedback): spacing only
  from `--space-*` tokens and type sizes only from the `--fs-*` scale; only `--fw-medium` and
  `--fw-semibold`; squared corners; light and dark parity. Group labels and the files-panel title use
  the app's sans heading font (`--font-heading`). In-panel labels (stage labels, numbers, badges,
  where-line) use `--font-mono` at weight 400. No icon or emoji-like list markers: the plan marker is a
  square. No added motion: no chevron rotation, no new transitions. The only sanctioned absence copy is
  `Nothing here yet.`.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1 (tracer): open the drawer on a shipped plan page and land on its phase. Projection, /api/drawer and the two-column drawer, end to end</name>
  <files>src/presentation/tree-labels.ts, src/presentation/roadmap.ts, src/presentation/drawer.ts, src/presentation/drawer-route.ts, src/server/index.ts, test/presentation/drawer.test.ts, test/portability.test.ts, src/web/components/planning-places.tsx, src/web/components/sidebar-drawer.tsx, src/web/styles/globals.css, docs/design-language.md, test/web/shell-contract.test.ts, test/web/visual-contract.test.ts, test/e2e/planning-drawer.spec.ts</files>
  <behavior>
    - fixtures/dense: `current.version` is `v3.0`. `current.phases` are 01 then 02. `shipped` lists v2.0 then v1.0 (newest first). Each shipped milestone's `name` comes from fixtures/dense's MILESTONES.md entry, and its `shippedLabel` is non-null whenever that entry has a Shipped date.
    - The phase lifecycle runs on an in-memory fixture (InMemoryPlanningFilesystem, same helper shape as test/presentation/tree.test.ts). One live phase has CONTEXT, RESEARCH, 01-01-PLAN plus 01-01-SUMMARY, a 01-02-PLAN with no summary, REVIEW, VERIFICATION, UI-REVIEW and deferred-items.md. That gives `before` = [Context, Research], `plans` = [Plan 01 (badge 01-01, done) and Plan 02 (badge 01-02, not done)], `after` = [Review, Verification] and `other` = [UI review, Deferred items]. Also `done` 1, `total` 2, status `In progress` with tone `active`. No PLAN or SUMMARY path appears in before, after or other. Each plan row's `matchUrls` holds the PLAN artifact's key and, when it exists, the SUMMARY artifact's key.
    - Status words follow a table. All plans summarised gives `Complete` (complete). Some plans exist but not all are summarised gives `In progress` (active). No plans and `roadmapComplete` true gives `Complete` (complete). No plans with a RESEARCH file gives `Researched` (quiet). No plans with a CONTEXT file gives `Discussed` (quiet). Otherwise `Not started` (quiet).
    - A shipped milestone's `documents` are its `vX.Y-*.md` files directly under milestones/, ordered Roadmap, Requirements, Milestone audit, then the rest by path.
    - Coverage: every markdown artifact in the phase and archived-phase locations whose `phaseKey` names a PhaseDto appears exactly once across all phase places (in before, after or other, or as a plan row's PLAN or SUMMARY). No root, research or `other` location file appears anywhere in the model.
    - Every `url` and `matchUrls` entry in the model starts with `/`. The drawer.ts source imports nothing from `node:`.
    - drawer-route: `placeKeyForPath(model, planUrl)`, `placeKeyForPath(model, planArtifactUrl)` and `placeKeyForPath(model, phaseUrl)` all return that phase's key. A milestone document's URL returns the milestone's key. An unknown path returns null. `shippedOwnerOf(model, archivedPhaseKey)` returns its milestone's key, and returns null for a current phase.
    - fixtures/sparse-empty gives a model with no current phases and no shipped milestones, and does not throw.
    - Browser (planning-drawer.spec.ts): open the first plan URL of the first shipped phase that has plans (resolved from /api/drawer) and open the drawer. The files header reads `<version> · Phase <number>`, the active row reads `Plan <planNumber>`, that milestone is unfolded with the phase row selected, the group labels are exactly Current and Shipped, the header has one button (Close), and the drawer is at least 560px wide at 1280px.
  </behavior>
  <action>
Step 0, baseline: run `npx vitest run` and `npm run typecheck`, and note any failure that is already there before you change anything (it is not yours to fix). Run `git status --porcelain` in this checkout and keep the output for the end check.

Shared helpers (src/presentation/tree-labels.ts): export the existing `PRE_PLAN_ARTIFACT_ORDER`, `POST_PLAN_ARTIFACT_ORDER`, `MILESTONE_DOC_ORDER` and `versionKeyOf` (add `export` and nothing else, so the old tree keeps behaving the same and tree.test.ts still passes). In src/presentation/roadmap.ts, pull the body of `milestoneRecords` that finds the root `milestones` artifact and filters `structured.entries` through `isMilestoneEntry` out into a new exported `milestoneEntries(presentation)` that returns the valid `MilestoneEntry[]`, and have `milestoneRecords` use it. The `/api/roadmap` payload must not change.

Projection (new src/presentation/drawer.ts). This is a pure projection, like tree.ts: no `node:*`, no fs, and no import from src/web. Export these types: `DrawerFileRow { key, label, path, url, warningTone }`, `DrawerPlanRow { key, label, badge, url, done, matchUrls, warningTone }`, `DrawerPhasePlace { kind: 'phase', key, url, milestoneVersion, number, name, status: { label, tone }, done, total, before, plans, after, other }`, `DrawerMilestonePlace { kind: 'milestone', key, url, version, name, shippedLabel, documents, phases }` and `DrawerViewModel { current: { version, phases }, shipped, defaultPlaceKey }`. Task 2 adds the quick-task fields. Export `buildDrawerViewModel(presentation)` built on these rules:
(a) Consider only artifacts whose path ends in `.md`, in the locations phase, archived-phase and milestone-root. Leave out root, research and other entirely: the dashboard, roadmap, traceability and research pages cover them (this is the removal of the Project and Research groups).
(b) Current means the phases of every non-archived MilestoneDto, in presentation order, each milestone's phases sorted with `comparePhaseNumbers`. `current.version` is `state.milestone` when that names a non-archived milestone, otherwise the first non-archived milestone's version, otherwise null.
(c) Shipped means every archived MilestoneDto, plus any version recovered from a milestone-root file name (`parseMilestoneFileName`) that has no MilestoneDto, sorted newest first by `versionKeyOf`. The `name` is the MILESTONES.md entry's name (`milestoneEntries`, matched on the lower-cased version), otherwise `MilestoneDto.name`, otherwise the version. `shippedLabel` is `activityDateLabel(entry.shipped, presentation.readAt)` (from dashboard-head.ts), otherwise null. `url` is `buildMilestoneUrl(version)`. `key` is `MilestoneDto.key`, or `milestoneKeyOf(version)` for a version known only from files. `documents` are the milestone-root files directly under `.planning/milestones/` for that version, labelled with `sentenceCase(document)` and ordered by `MILESTONE_DOC_ORDER`, then by path.
(d) A phase place: `url` is `buildPhaseUrl(identity)` and `number` is `identity.number`. Each PlanDto becomes a plan row: `label` is `Plan ` plus `planNumber`, `badge` is `plan.id`, `url` is `plan.key`, `done` is `plan.summary !== null`, `matchUrls` are the `key`s of the artifacts whose path equals `plan.path` or `plan.summary.path`, and `warningTone` comes from the PLAN artifact. `done` counts plans with a summary and `total` is `plans.length`. Every other markdown artifact whose `phaseKey === phase.key` and whose path is not owned by a plan row is placed with `parsePhaseArtifactName`: a token in `PRE_PLAN_ARTIFACT_ORDER` goes to `before` (sorted by its index), a token in `POST_PLAN_ARTIFACT_ORDER` goes to `after` (sorted by its index), and anything else, unparseable names included, goes to `other` (sorted by path). File labels come from `labelOf({ location, nodeType: 'file', path }, null)`, URLs are `artifact.key`, and tones come from `artifactWarningTone(artifact)`. Status words follow the behavior table. This is a plan-time choice: it matches the dashboard's derivation in spirit and uses only the documented tones `complete`, `active` and `quiet`.
(e) `defaultPlaceKey`: the key of `headPhaseOf(presentation)` when that phase is in Current, otherwise the first Current phase whose status is not Complete, otherwise the last Current phase, otherwise the newest shipped milestone's key, otherwise null. Task 2 inserts the quick-task steps.

Route lookups (new src/presentation/drawer-route.ts). It has a type-only import of drawer.ts, so the client bundle never pulls in the projection. Export `placeKeyForPath(model, pathname)`, which returns the first place whose own phase `url`, milestone `url`, any file row `url`, or any plan row `url` or `matchUrls` entry equals `pathname`, or null. Export `shippedOwnerOf(model, placeKey)`, which returns the key of the shipped milestone that is that place or contains it, or null. Export `findPlace(model, placeKey)`, which returns the place object, or null.

Endpoint: in src/server/index.ts, next to `/api/tree`, add `app.get('/api/drawer', …)` returning `c.json(buildDrawerViewModel(derived.presentation))`. It is GET only and adds no write path. Add `'/api/drawer'` to `ROUTES` in test/portability.test.ts so every fixture must answer 200 without NaN or Infinity.

Tests first: write test/presentation/drawer.test.ts from the behavior list (RED), then implement until it passes (GREEN).

Drawer body (new src/web/components/planning-places.tsx). Export `useDrawerQuery()`: react-query key `['drawer']`, fetching `/api/drawer` with `Accept: application/json`, and throwing on a non-OK status the same way fetchTree does. Export `PlanningPlaces({ open, onNavigate })`. While pending it renders `<nav className="places-navigator" aria-hidden="true" data-state="loading" />`. On error it renders null, because the shell's snapshot notice covers that (same convention as before). Inside it keeps the state `selectedKey`. Whenever `open` turns true, or the pathname or data changes, `selectedKey` resets to `placeKeyForPath(model, pathname) ?? model.defaultPlaceKey`. That is how the drawer opens on the place holding the current page. The unfolded shipped milestone is derived as `shippedOwnerOf(model, selectedKey)`, never stored separately, so only one milestone is unfolded at a time.
The left column is `<div className="places-list">` with two `<section className="places-group">` blocks. Each has an `<h2 className="places-group-label">` reading `Current` with the version in a `<span className="places-group-version">` (left out when null), or `Shipped`. The rows are `<button type="button" className="places-row">` with `data-selected` and `aria-current="true"` when selected. A Current phase row shows a `places-number` span (the phase number), a `places-label` span (the name) and a `places-badge` span with `done/total` when total is above 0. A shipped milestone row shows its version as `places-number`, its name through `stripEmoji` as `places-label`, and `shippedLabel` as `places-badge`. When that milestone is the unfolded one, its phases follow as rows with `data-depth="1"` (number and name). A group with no rows renders `<p className="empty-note">Nothing here yet.</p>`. Choosing a row sets `selectedKey`.
The right column is `<div className="places-files">`. Its header `<div className="places-files-head">` holds a `places-where` line (`<version> · Phase <number>`, or `Phase <number>` when there is no version, and for a milestone `Shipped <shippedLabel>` or just `Shipped`), then `<h3 className="places-files-title">` (the phase name, or `<version> · <name>` for a milestone), then, for a phase, `<span className="status-chip" data-tone={status.tone}>`. Stages are `<div className="places-stage">` with a label span and, where there is one, a count span: Before plans; Plans (`<done> of <total> done`, or `none yet` when total is 0); After; Other files. Leave out an empty stage, except Plans, which always shows. File rows are react-router `Link`s with `className="places-file-row"`, `data-active` and `aria-current="page"` when `url === pathname` (for a plan row, when its url or any `matchUrls` entry equals pathname), and `onClick={onNavigate}`. Each holds a leading `<span className="places-plan-square" data-tone={done ? 'complete' : 'quiet'}>` for plan rows (with `sr-only` text reading `summary written` or `no summary yet`), or an empty `places-row-spacer` span for other rows, then a `places-label` (title = the file path), an optional `places-badge` (the plan id), and the Warning/Unreadable indicator. That indicator copies TreeNavigator's `WarningIndicator` exactly: a `places-warning status-chip` span whose tone is chosen with the expression `warningTone === 'unreadable' ? 'destructive' : 'warning'` and whose label is chosen with `warningTone === 'unreadable' ? 'Unreadable' : 'Warning'`. A milestone place shows a `Milestone documents` stage (file rows), then a `Phases` stage with the count, holding `places-row` buttons (number and name) that select that phase. All planning-derived text renders as React text nodes and titles, never as raw HTML. On open, a requestAnimationFrame scrolls the `[data-active='true']` row and the `[data-selected='true']` row into view with `{ block: 'nearest' }`, the same way TreeNavigator does.

Drawer shell (src/web/components/sidebar-drawer.tsx): render `<PlanningPlaces open={open} onNavigate={() => setOpen(false)} />` in place of TreeNavigator. Delete the expand/collapse-all button, the state flag behind it, the capture-phase toggle listener effect, the toggle handler, the popup ref that only they used, and the two chevrons-pair icon imports (per the winner spec: nothing nests any more). Keep the Dialog, `keepMounted`, the PanelLeft trigger, `aria-label="Open planning files"`, `Dialog.Title` and the close button. Leave tree-navigator.tsx in place for now. Task 3 retires it.

CSS (src/web/styles/globals.css, next to the drawer rules). Set `--drawer-width: min(38rem, 94vw)` and add `--drawer-places-width: 15.5rem` beside it, with a comment saying why it is not a `--space-` token, like the comment above `--drawer-width`. `.places-navigator` is a grid with `grid-template-columns: var(--drawer-places-width) minmax(0, 1fr)` and `min-height: 0`. `.places-list` and `.places-files` each have `min-height: 0`, `overflow-y: auto` and `overscroll-behavior: contain`. `.places-list` gets a right border in `--sidebar-border`. The row anatomy copies the old `.tree-node-row` (grid, `min-height: var(--space-8)`, `--fs-3`, muted-foreground, `--sidebar-accent` hover, a focus-visible ring) and adds a `data-depth='1'` indent of `--space-5`. Selected and active rows use `--sidebar-primary` with the `inset 3px 0 var(--primary)` bar. Labels use ellipsis. Badges, numbers, `places-where` and `places-stage` are mono weight 400, with `--fs-1` and `--ls-wider` uppercase on the stage. `places-group-label` copies the old `.tree-group-label` recipe (heading font, `--fs-2`, semibold, uppercase). `places-files-title` is the heading font, `--fs-5`, semibold. The plan square is a bordered `--space-2` square, filled with the existing complete-tone colour when `data-tone='complete'`. Add no transitions. Token-only values, light and dark both checked.

Docs and contract retargets. In docs/design-language.md, add a `### Planning files drawer` table under `## Surface-scoped registered names` (same `| Class | Surface | Note |` shape) with one row per new class this task uses (places-navigator, places-list, places-files, places-group, places-group-label, places-group-version, places-row, places-number, places-label, places-badge, places-row-spacer, places-files-head, places-where, places-files-title, places-stage, places-file-row, places-plan-square, places-warning), and a one-line note naming sketch 038 C. In test/web/shell-contract.test.ts, change the asserted drawer line to the PlanningPlaces one. In test/web/visual-contract.test.ts, change the `--drawer-width` literal to the new one, and change the wiring test's `<TreeNavigator` expectation to `<PlanningPlaces`. Leave every other tree assertion for Task 3.

Browser: create test/e2e/planning-drawer.spec.ts in the style of test/e2e/artifact-header.spec.ts. Resolve the target from `${baseURL}/api/drawer` (never hardcode a URL or a count), set the viewport to 1280×900, and assert the browser bullet in the behavior list.
  </action>
  <verify>
    <automated>npx vitest run test/presentation/drawer.test.ts test/presentation/tree.test.ts test/portability.test.ts test/web/shell-contract.test.ts test/web/visual-contract.test.ts test/web/class-vocabulary.test.ts && npm run typecheck && test "$(grep -v '^\s*//' src/web/components/sidebar-drawer.tsx | grep -c 'allExpanded\|ChevronsUpDown')" = 0 && test "$(grep -c "app.get('/api/drawer'" src/server/index.ts)" = 1 && test "$(grep -c 'min(38rem, 94vw)' src/web/styles/globals.css)" -ge 1 && npx playwright test test/e2e/planning-drawer.spec.ts</automated>
  </verify>
  <done>Gate baselines at HEAD were 7, 0 and 0, so none of the three passes before this task. On a shipped plan page the drawer opens two columns wide, on that phase, with the plan row active and its milestone unfolded. Phase files sit in Before plans · Plans · After (and Other files when there are any), with one row per plan and its square. The expand-all control is gone. /api/drawer answers 200 on every portability fixture. The projection tests and the two retargeted contract tests pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: quick tasks everywhere. Current and shipped Quick tasks places grouped by month, each task opening to one chip row, plus a shipped milestone's "All N quick tasks" link</name>
  <files>src/planning-repo/naming.ts, test/naming.test.ts, src/presentation/tree-labels.ts, src/presentation/drawer.ts, src/presentation/drawer-route.ts, test/presentation/drawer.test.ts, src/web/components/planning-places.tsx, src/web/styles/globals.css, docs/design-language.md, test/e2e/planning-drawer.spec.ts</files>
  <behavior>
    - `parseMilestoneQuickDirName('v1.1-quick')` gives `{ matched: true, version: 'v1.1' }`. `'quick'` and `'v1.1-phases'` give `{ matched: false }`.
    - `quickMonthOf('261024')` gives `Oct 2026`. A month token out of range gives null (string slicing only, no Date).
    - In-memory fixture: `.planning/quick/261024-abc-some-task/` holds 261024-abc-PLAN.md, 261024-abc-SUMMARY.md, 261024-abc-CONTEXT.md and a non-markdown helper.mjs, and `.planning/milestones/v1.0-quick/260901-xyz-old-task/260901-xyz-PLAN.md` exists. Then `current.quick` has 1 task (badge `Oct 24`, month `Oct 2026`, chips Context · Plan · Summary in QUICK_FILE_ORDER, and no chip for helper.mjs). The v1.0 shipped milestone's `quick` has 1 task in month `Sep 2026`. v1.0 gets a Shipped entry even though it has no MilestoneDto.
    - Tasks are newest first (the existing quick directory rank). Month groups follow task order. A directory whose name does not parse goes in a trailing `Undated` month. A markdown file sitting directly in `.planning/quick/` becomes a one-chip task of its own.
    - A milestone-root file under a `vX.Y-<other>/` directory goes into that milestone's documents.
    - Coverage, extended: over fixtures/dense and over this repository's own `.planning/` (loaded through LocalFsPlanningFilesystem from the repo root), every markdown artifact in the phase, archived-phase, quick and milestone-root locations appears exactly once in the model. The only exceptions are milestone-root files with no recoverable version and phase-location files with no owning PhaseDto. The test computes that exception set with the same rule and asserts nothing else is missing.
    - `placeKeyForPath` on a quick chip's url gives that quick place's key. `quickTaskKeyForPath(model, chipUrl)` gives the task's key. `shippedOwnerOf` on a shipped quick place gives its milestone.
    - `defaultPlaceKey` for this repo's corpus (no live milestone, current quick tasks present) is the Current quick place's key.
    - Browser: choosing Current › Quick tasks shows month stages and as many task rows as /api/drawer reports, and opening the first task shows a chip row containing Plan. Opening a quick task's PLAN page and then the drawer lands on that Quick tasks place with that task open and its Plan chip active. A shipped milestone's place has an `All <n> quick tasks` row that opens that milestone's quick tasks.
  </behavior>
  <action>
Grammar: in src/planning-repo/naming.ts, add `parseMilestoneQuickDirName(dirName)` beside `parseMilestonePhasesDirName`, with the same shape and a `^(v\d+\.\d+(?:\.\d+)?)-quick$` (case-insensitive) pattern, and add its cases to test/naming.test.ts. In src/presentation/tree-labels.ts, export `quickMonthOf(date)` beside `shortQuickDate`. It uses `MONTH_NAMES` and string slicing only, returns `<Mon> 20<YY>`, and returns null when the month is out of range. Also export the existing `QUICK_FILE_ORDER`.

Projection (src/presentation/drawer.ts). Add the types `DrawerQuickTask { key, label, dateBadge, files: DrawerFileRow[] }` and `DrawerQuickPlace { kind: 'quick', key, milestoneVersion, count, months: { label, tasks }[] }`. Add `quick` to `current` (key `quick:current`) and to every `DrawerMilestonePlace` (key `quick:` plus the milestone key). Take in the `quick` location: a task is the directory segment right after `.planning/quick/`. Take in milestone-root files whose first segment under milestones/ matches `parseMilestoneQuickDirName`: a task is the next segment, assigned to that version's shipped milestone. A version known only this way still gets a Shipped entry, per Task 1's rule (c). A task's `label` and `dateBadge` come from `labelOf({ location: 'quick', nodeType: 'directory', path: dirPath }, null)`. Order tasks with `rankOf` on the same shape, and group consecutive tasks by `quickMonthOf` of the parsed directory date, with `Undated` for unparseable names. Chips are the task's markdown files, labelled with `labelOf({ location: 'quick', nodeType: 'file', path }, null)` and ordered by `QUICK_FILE_ORDER`, then by path. A markdown file directly in `.planning/quick/` becomes its own task with that one chip. A milestone-root file under any other `vX.Y-…/` directory goes into that milestone's documents. Anything with no recoverable version is left out of the drawer (search still finds it). Extend `defaultPlaceKey` (Task 1 rule (e)): after the last-Current-phase step, use the Current quick place when its count is above 0, then the newest shipped milestone, then the Current quick place.

Route lookups (src/presentation/drawer-route.ts): `placeKeyForPath` and `findPlace` now also search quick places (any chip url). Add `quickTaskKeyForPath(model, pathname)`. `shippedOwnerOf` now also covers each shipped milestone's quick place.

Write the new behavior cases into test/presentation/drawer.test.ts and test/naming.test.ts first (RED), then implement (GREEN).

UI (src/web/components/planning-places.tsx). The Current group gains a final `places-row` reading `Quick tasks` with the count as its badge. An unfolded shipped milestone gains a `data-depth="1"` `Quick tasks` row with the count. The milestone place gains a `Quick tasks` stage with the count, holding one `places-row` button reading `All <n> quick tasks` that selects that milestone's quick place, or a `none` count with no button when n is 0. A quick place's header shows `places-where` (the version, or `Current`) and the title `Quick tasks · <count>`. Then, for each month, a `places-stage` with the month label, followed by one `<details className="places-quick-task">` per task. Its `<summary className="places-file-row">` shows the date badge in the leading column and then the label. Its body is `<div className="places-chips">`, holding one react-router `Link className="places-chip"` per file with `data-active` and `aria-current="page"` when its url equals pathname, and `onClick={onNavigate}`. A task holding the current page gets the `open` attribute on first paint, declaratively (key the details by task key so a re-open re-applies it). It never gets an effect that fights a user's own close. Hide the native summary marker. No icon markers, no chevron.

CSS and docs: add the `.places-quick-task`, `.places-chips` and `.places-chip` rules (chip: a `--sidebar-border` border, `--fs-2`, muted text; active: `--primary-border` border and `--sidebar-primary` fill, as in the sketch's `.chip`). Add those three rows to the docs/design-language.md `### Planning files drawer` table.

Browser: add the Task 2 cases to test/e2e/planning-drawer.spec.ts. Resolve every count, URL and label from `/api/drawer`.
  </action>
  <verify>
    <automated>npx vitest run test/naming.test.ts test/presentation/drawer.test.ts test/presentation/tree.test.ts test/portability.test.ts test/web/class-vocabulary.test.ts && npm run typecheck && npx playwright test test/e2e/planning-drawer.spec.ts</automated>
  </verify>
  <done>Current and every shipped milestone have a Quick tasks place, grouped by month, newest first. Each task opens to one row of file chips. A quick-task page opens the drawer on its task with its chip active. A shipped milestone's place links to all its quick tasks. The coverage test proves every placeable markdown file in this repo and in fixtures/dense appears exactly once.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: the drawer drills down on a phone with an "All places" back link, and the old tree surface is retired from the client</name>
  <files>src/web/components/planning-places.tsx, src/web/components/tree-navigator.tsx, src/web/components/empty-state.tsx, src/web/styles/globals.css, docs/design-language.md, test/web/shell-contract.test.ts, test/web/visual-contract.test.ts, test/web/loading-state-contract.test.ts, test/web/degradation-ui-contract.test.ts, test/web/empty-state-contract.test.ts, test/e2e/planning-drawer.spec.ts</files>
  <behavior>
    - Browser at 375×812: the drawer is one column. The places list is visible and the files panel is not. Tapping a place shows its files and an `All places` back control, and hides the list. Tapping `All places` brings the list back with the same place still selected. Choosing a phase from a milestone place keeps the files panel showing.
    - Browser at 1280×900: the `All places` control is not visible.
    - Contract tests: the shell, visual, loading-state, degradation-ui and empty-state contracts all assert against src/web/components/planning-places.tsx and the new `.places-*` CSS, keeping their invariants. That means pending and error states inside the drawer body, the one Warning/Unreadable vocabulary, `Nothing here yet.` for an empty group, no `dangerouslySetInnerHTML`, no localStorage or sessionStorage, the `--sidebar` token family with hover on `--sidebar-accent`, the active row on `--sidebar-primary`, ellipsis labels, each column scrolling on its own `overflow-y` without sticky positioning, reduced motion on the drawer and backdrop, and the drawer never hidden from 62rem down.
  </behavior>
  <action>
Phone drill-down (planning-places.tsx and globals.css). Add a `drilled` boolean, false whenever the drawer opens and true once any place is chosen (a left row, or a phase or quick-task button in a milestone place). Expose it as `data-drilled` on `.places-navigator`. At the top of `.places-files`, render a `<button type="button" className="places-back">` with lucide `ChevronLeft` (aria-hidden) and the text `All places`, which sets `drilled` back to false. Do not add the phone rules in a new block above the first `@media (max-width: 62rem)`. Add them inside the first existing `@media (max-width: 42rem)` block (around globals.css line 3688). There, `--drawer-width` becomes `88vw` on `.sidebar-drawer`, `.places-navigator` drops to one `minmax(0, 1fr)` column, `.places-files` is hidden unless `data-drilled='true'`, `.places-list` is hidden when it is, and `.places-back` shows (a flex row, `--fs-2`, muted). Above that width `.places-back` is `display: none`.

Retire the tree from the client. Delete src/web/components/tree-navigator.tsx (nothing imports it after Task 1, so check with a grep first). Update the comment in src/web/components/empty-state.tsx so it names the drawer body file. In globals.css, remove every `.tree-*` rule, the `.tree-navigator` and `.tree-node` members of the min-width selector list near line 365 (put `.places-navigator`, `.places-list` and `.places-files` there instead), and the tree chevron entry in the reduced-motion rule. Swap `.tree-navigator` for `.places-list, .places-files` in both scrollbar-container `:is(…)` selectors near line 2222. Leave `.clean-tree-*` alone, because it is unrelated. In docs/design-language.md, delete the `### Tree navigator` table and the drawer's expand-all row from the Shell and navigation table, and add `places-back` to the Planning files drawer table.

Contract retargets. Each one keeps the invariant and changes only the file or selector:
- shell-contract: the obsolete test that opens tree groups declaratively becomes one asserting that the drawer body resets its place from the route (`placeKeyForPath(`) and that sidebar-drawer.tsx has no expand-all control.
- loading-state-contract: read planning-places.tsx for `query.isPending` and `query.isError`.
- degradation-ui-contract: read planning-places.tsx for the Warning/Unreadable vocabulary, the empty note and the no-raw-HTML check. Drop the tree group-label literal and assert the `places-group-label` heading instead.
- empty-state-contract: read planning-places.tsx.
- visual-contract: in `SCROLLBAR_CONTAINERS`, put the two new column selectors where the tree one was, in the same order as the CSS. Point the legacy-site and overflow tests at `.places-list {` and `.places-files {`. Point the hover, active, label and reduced-motion assertions at the `.places-*` rules. The native-disclosure test asserts that `<details` is used for quick tasks and that the headless collapsible is not. Point the wiring test at `useDrawerQuery` and the rAF scroll.

Full checks: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` (no new warnings), then `npx playwright test test/e2e/planning-drawer.spec.ts` only. Never run the whole `test:e2e`. Compare against the Step 0 baseline: there should be no failure that was not already failing. Add the phone cases to the spec, plus screenshots of the drawer at desktop light, desktop dark and phone (both the drilled and the undrilled state). Save them under `SCREENSHOT_ROOT/vty/` (the theme is set via `localStorage['labelore-theme']`, as artifact-header.spec.ts does). Open the screenshots and look at them. Check `git status --porcelain` shows changes only under src/, test/, docs/ and this quick task's directory, and that nothing under `.planning/` outside this quick task's directory changed. Write the SUMMARY in plain words: what the user now sees in the drawer on desktop and on a phone, what each screenshot shows, and anything left undone. Note that `/api/tree` remains served only for its existing tests, as a candidate for later removal. Use no internal codes or shorthand in the prose.
  </action>
  <verify>
    <automated>npm test && npm run typecheck && npm run lint && npm run build && test ! -e src/web/components/tree-navigator.tsx && test "$(grep -c '^| `tree-' docs/design-language.md)" = 0 && npx playwright test test/e2e/planning-drawer.spec.ts</automated>
    <human-check>Open the drawer on a v1.1 plan page and on the dashboard, in light and dark. Expect two columns: Current and Shipped on the left, and files on the right in Before plans · Plans · After, with filled squares for summarised plans and the active bar on the current page's row. On a phone width, expect one column that drills into a place, with an All places link back. Headings should be in the sans font and stage labels in mono at weight 400, with no icon list markers and no motion other than the drawer's existing slide.</human-check>
  </verify>
  <done>Gate baselines at HEAD were: the tree navigator file exists, and 12 `| \`tree-` doc rows. Neither passes before this task. On a phone the drawer drills from places into files and back. The old tree component, its CSS and its doc rows are gone. All five contract tests assert the new drawer's invariants. The full unit suite, typecheck, lint, build and the drawer browser spec pass against the baseline. Screenshots were looked at and described in the SUMMARY.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target `.planning/` files → reader → /api/drawer | File names, phase and milestone names and MILESTONES.md text are author-controlled input from the target project |
| /api/drawer JSON → browser drawer | The browser renders server-projected labels and follows server-projected URLs |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-vty-01 | Tampering | target `.planning/` tree | high | mitigate | The new endpoint is GET only, and drawer.ts and drawer-route.ts are pure projections with no fs and no `node:*` import (a unit test reads drawer.ts's source and asserts no `node:` import). Task 3 checks `git status --porcelain` shows no `.planning/` change outside this quick task's directory |
| T-vty-02 | Information disclosure / injection (XSS) | planning-places.tsx rendering names, labels and paths | medium | mitigate | Everything renders as React text nodes or a `title` attribute. The retargeted contract tests assert that planning-places.tsx and sidebar-drawer.tsx contain no `dangerouslySetInnerHTML` |
| T-vty-03 | Spoofing (unsafe link target) | file, plan and chip links | low | mitigate | Every URL comes from route builders (`buildPhaseUrl`, `buildMilestoneUrl`, `PlanDto.key`) or the server-built `ArtifactDto.key`, and goes only into react-router `Link`. A unit test asserts every `url` and `matchUrls` entry starts with `/` |
| T-vty-04 | Denial of service | /api/drawer projection on a large corpus | low | accept | A local, single-user, read-only tool. The projection is one linear pass over artifacts per request, like /api/tree today. The portability suite covers every fixture |
| T-vty-SC | Tampering | npm/pip/cargo installs | low | accept | This plan installs no package (lucide `ChevronLeft` ships in the existing lucide-react), so no legitimacy checkpoint is needed |
</threat_model>

<verification>
- `npx vitest run test/presentation/drawer.test.ts test/naming.test.ts test/portability.test.ts test/presentation/tree.test.ts test/web/class-vocabulary.test.ts` passes.
- `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` pass against the Step 0 baseline.
- `npx playwright test test/e2e/planning-drawer.spec.ts` passes (that spec only).
- Grep and file gates (HEAD baselines recorded): expand-all identifiers in sidebar-drawer.tsx 7 → 0; the `/api/drawer` route 0 → 1; `min(38rem, 94vw)` 0 → ≥1; tree-navigator.tsx exists → gone; `| \`tree-` doc rows 12 → 0.
- No `.planning/` change outside `.planning/quick/261024-vty-build-sketch-038-winner-c-two-column-pla/`.
</verification>

<success_criteria>
- The drawer matches sketch 038 C's winner spec on real data: two columns at about 38rem, Current and Shipped places, phase files in three lifecycle stages with one row per plan, quick tasks by month with chip rows, shipped milestones holding their documents, phases and quick tasks, the active bar on the current page's row, opening on the place that holds it, and a phone drill-down with an All places back link.
- Project and Research groups, the Archived phases and Milestones groups, and the expand-all control no longer exist.
- Unknown files degrade: every fixture's /api/drawer answers 200, and every placeable markdown file appears in exactly one place.

Coverage audit (winner spec → task):
- Drawer widens to about 38rem, with places left and files right, under Current and Shipped headings → Task 1
- Current phases with number, name and done/total → Task 1. Current Quick tasks with a count → Task 2
- Shipped rows with version, name and ship date, unfolding to indented phases → Task 1. Their Quick tasks row → Task 2
- Files header with where, name and status chip → Task 1
- Phase: Before plans · Plans (square, N of M done) · After, in lifecycle order → Task 1
- Quick tasks grouped by month, each opening to one chip row → Task 2
- Shipped milestone place with documents and phases → Task 1. The link to all its quick tasks → Task 2
- Active bar, and opening on the place that holds the current page → Task 1, with quick tasks in Task 2
- Phone one column with an All places back link → Task 3
- Project and Research removed → Task 1 (projection rule (a)). Expand-all removed → Task 1
- Archived phases merged into their shipped milestone → Task 1
</success_criteria>

<output>
Create `.planning/quick/261024-vty-build-sketch-038-winner-c-two-column-pla/261024-vty-SUMMARY.md` when done
</output>
