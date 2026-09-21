---
phase: quick-260911-vqe
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/presentation/tree-labels.ts
  - src/presentation/tree.ts
  - test/presentation/tree.test.ts
  - src/web/components/tree-navigator.tsx
  - src/web/components/sidebar-drawer.tsx
  - src/web/components/app-shell.tsx
  - src/web/styles/globals.css
  - test/web/visual-contract.test.ts
  - test/web/shell-contract.test.ts
autonomous: true
requirements: [SB-01, SB-02, SB-03, SB-04, SB-05]

estimate:
  tokens: 170000
  raw_tokens: 170000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "A PanelLeft menu trigger (aria-label 'Open planning files') sits at the far left of the header at every width, rendered once /api/tree has loaded. It opens a full-height drawer fixed to the left edge over the shared overlay scrim, with a 'Planning files' title and a close button. The reading column spans the full viewport width at 1440px and at 400px, and there is no sidebar track (D-01, SB-04)"
    - "The drawer closes on Esc, on a backdrop click, on the close button, and on any tree link click, which also navigates. Manual expand/collapse state survives closing and reopening (Dialog.Portal keepMounted). On open, the current route's row is scrolled into view (D-01, SB-04)"
    - "No tree row shows a raw on-disk name. The raw path appears only in the row's title tooltip. Against fixtures/dense: groups read Project, Phases, Archived phases, Quick tasks, Milestones, Research, Other; the phase dir reads 'Identity Slice' with badge '01'; phase files read 'Plan 01', 'Summary 01', 'UI spec', 'AI spec', 'Cost model', 'UAT'; root files read 'State', 'Config', 'Estimation calibration', 'Handoff'; the archived wrapper reads 'v1.0'; the quick dir reads 'Add transport adapter' with badge 'Jun 15'; a milestone file reads 'Roadmap' with badge 'v2.0'. Same-label siblings disambiguate as 'State' and 'State (JSON)' (D-02, SB-02)"
    - "Files sort in lifecycle order, not alphabetically. Dense 01-identity-slice lists Context, Spec, AI spec, UI spec, Research, Patterns, Cost model, Validation, Plan 01, Summary 01, Plan 02, Summary 02, Verification, Security, UAT, Learnings. Root starts Project, Roadmap, Requirements, State. Quick tasks and milestone files are newest first. Phase dirs keep dotted-numeric order (D-03, SB-03)"
    - "No exclusion is shown anywhere. /api/tree has no exclusion node type and no research/.cache path, the drawer has no 'Excluded' text, and a presentation whose only content is an exclusion yields seven empty groups (D-04, SB-01)"
    - "Every row shares one layout: a chevron slot, a single-line ellipsis label, then a badge and/or warning. A ChevronRight rotates when its details is open. Rows use one colour ramp (the --sidebar family plus --muted-foreground), one rhythm (row min-height --space-8, sibling gap --space-0-5, indent --space-3, group gap --space-4) and a visible focus ring. Every new CSS value is a token, --drawer-width sits beside --dialog-max-width, and test/token-guard.test.ts passes (SB-05)"
    - "The Warning/Unreadable indicator, the empty-group 'Nothing here yet.' markup, native details/summary and the declarative group open all survive unchanged. npm test, npm run typecheck, npm run lint and npm run build pass"
  artifacts:
    - path: "src/presentation/tree-labels.ts"
      provides: "Pure label, badge and lifecycle-rank rules for tree nodes, built on the naming.ts grammar parsers"
      exports: ["GROUP_LABELS", "sentenceCase", "labelOf", "rankOf", "formatSuffix"]
    - path: "src/presentation/tree.ts"
      provides: "TreeNode projection with badge, lifecycle sorting, sibling label disambiguation, no exclusion nodes"
      contains: "badge: string | null"
    - path: "src/web/components/sidebar-drawer.tsx"
      provides: "SidebarDrawer: navbar trigger plus a left-edge @base-ui/react Dialog that hosts TreeNavigator"
      contains: "<Dialog.Portal keepMounted>"
    - path: "src/web/components/tree-navigator.tsx"
      provides: "Tree rows with chevron, label and title, badge; useTreeQuery hook; open/onNavigate props"
      contains: "export function useTreeQuery"
    - path: "src/web/styles/globals.css"
      provides: "Drawer, header menu area and tree row rules on tokens, plus the --drawer-width token"
      contains: "--drawer-width: min(22rem, 88vw);"
  key_links:
    - from: "src/presentation/tree.ts"
      to: "src/presentation/tree-labels.ts"
      via: "labelOf/rankOf/formatSuffix/GROUP_LABELS imports used by insert() and sortChildren()"
      pattern: "from './tree-labels.ts'"
    - from: "src/presentation/tree-labels.ts"
      to: "src/planning-repo/naming.ts"
      via: "grammar parsers reused, with no duplicated filename regex"
      pattern: "from '../planning-repo/naming.ts'"
    - from: "src/web/components/app-shell.tsx"
      to: "src/web/components/sidebar-drawer.tsx"
      via: "trigger rendered first in the header once the shared ['tree'] query succeeds"
      pattern: "tree\\.isSuccess \\? <SidebarDrawer />"
    - from: "src/web/components/sidebar-drawer.tsx"
      to: "src/web/components/tree-navigator.tsx"
      via: "TreeNavigator mounted in the popup with the controlled open state and the close-on-navigate callback"
      pattern: "onNavigate=\\{\\(\\) => setOpen\\(false\\)\\}"
    - from: "src/web/styles/globals.css"
      to: ".sidebar-drawer"
      via: "fixed left popup on the --sidebar / --sidebar-border pair, width var(--drawer-width)"
      pattern: "width: var\\(--drawer-width\\);"
---

# Quick 260911-vqe: Sidebar redesign (navbar drawer, readable labels, lifecycle order, exclusions hidden)

<objective>
Replace the permanent 18rem planning-tree sidebar. It becomes a drawer opened from a menu icon at the far left of the navbar, and every row shows a readable, lifecycle-ordered name instead of a raw filename. This translates the user-approved design in /home/cinedise/.claude/plans/fancy-humming-mango.md faithfully; its decisions are locked and must not be revisited.

Locked user decisions (this task):
- D-01: overlay drawer at every width, opened from a menu icon at the far left of the navbar. Content always gets the full width. This also brings the tree back below 62rem, where it is currently hidden.
- D-02: readable names only. The raw path goes in the hover tooltip (`title`).
- D-03: lifecycle ordering of files is in scope.
- D-04: exclusions are removed from the UI entirely. This reverses Phase-3 D-10's "visible stub" rule for the tree only. The server's `ProjectPresentation.exclusions` DTO field is untouched.

Naming note: code comments in these files already cite Phase-3/Phase-4 decisions (D-09, D-10, D-12, D-16, IN-01). Where this plan means those, it writes "Phase-3 D-10" and so on. Bare D-01..D-04 always means this task's decisions.

Task-local requirement IDs:
- SB-01: exclusions out of the tree (D-04).
- SB-02: readable labels plus badges, with the raw path in the title (D-02).
- SB-03: lifecycle ordering (D-03).
- SB-04: navbar-triggered overlay drawer (D-01).
- SB-05: one row anatomy, one colour ramp and one rhythm, all on design tokens (design sections 3-4, and the strict-design-tokens memory).

Out of scope, so do NOT build any of these: a filter box or counts, phase status dots, hiding empty groups, merging each plan with its summary, a current-phase highlight, a Ctrl/Cmd+B shortcut, an expand/collapse-all control, and any change to the search page's own group labels in src/presentation/search.ts.

Purpose: open the dashboard and reach any planning file from a drawer that reads like a table of contents, without losing a permanent column of reading width.

Output:
- a new pure label/rank module
- a reworked tree projection
- a drawer component
- reworked tree rows
- a header with a menu area
- drawer and tree CSS on tokens
- updated pinning tests
- a live screenshot pass at 1440px and 400px, light and dark, drawer closed and open
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@/home/cinedise/.claude/plans/fancy-humming-mango.md

Source files. Read each once. For globals.css and the large test files, read only the named line ranges.
@src/presentation/tree.ts
@src/web/components/tree-navigator.tsx
@src/web/components/app-shell.tsx
@test/presentation/tree.test.ts

Interface facts, verified at planning time against the working tree. Do not re-derive them.
- src/planning-repo/naming.ts exports these parsers; every result is `{ matched: false }` or a match object:
  - `parsePhaseDirName(dirName)` gives `{ number, slug, projectCode, numeric }`
  - `parsePlanFileName(fileName)` gives `{ phase, plan, kind: 'plan' | 'summary' }`, with `plan` as written, e.g. "01"
  - `parsePhaseArtifactName(fileName)` gives `{ phase, artifact }`, with an uppercase token such as "UI-SPEC"
  - `parseQuickDirName(dirName)` gives `{ date: 'YYMMDD', timeToken, slug }`
  - `parseQuickArtifactName(fileName)` gives `{ quickId, artifact }`
  - `parseMilestoneFileName(fileName)` gives `{ version: 'v1.0', document: 'ROADMAP' }`
  - `parseMilestonePhasesDirName(dirName)` gives `{ version }`
  - also `comparePhaseNumbers(a, b)`

  These are the only grammar regexes allowed. tree-labels.ts must not add a filename regex of its own; a split pattern on separators is fine.
- `PhaseDto` (src/server/project-presentation.ts line 81) carries `identity` (with `number`, as written, e.g. "01"), `name` and `dirPath: string | null`. `name` is never empty for a phase with a directory. It is the ROADMAP name, or `humanizeSlug(slug)` from src/planning-repo/assemble.ts line 144 when the roadmap has no entry.
- `/api/tree` is `c.json(buildTreeViewModel(derived.presentation))` in src/server/index.ts line 125. No server file changes in this plan. The only other importer of presentation/tree.ts is tree-navigator.tsx, which imports the `TreeNode` type only. No golden file under test/__golden__ pins tree labels.
- The fixtures/dense tree as it projects TODAY, observed at planning time:
  - root: BACKLOG.md, config.json, estimation-calibration.json, HANDOFF.json, LEARNINGS.md, MILESTONES.md, PROJECT.md, REQUIREMENTS.md, RETROSPECTIVE.md, ROADMAP.md, STATE.md, v3.0-CAPACITY-PLAN.md, WINDOWS.md
  - phases/01-identity-slice: roadmap name "Identity Slice". Files: 01-01-PLAN, 01-01-SUMMARY, 01-02-PLAN, 01-02-SUMMARY, 01-AI-SPEC, 01-CONTEXT, 01-COST-MODEL, 01-LEARNINGS, 01-PATTERNS, 01-RESEARCH, 01-SECURITY, 01-SPEC, 01-UAT, 01-UI-SPEC, 01-VALIDATION, 01-VERIFICATION (all .md)
  - phases/02-transport-layer: "Transport Layer". Files 02-01-PLAN.md and 02-CONTEXT.md
  - milestones/v1.0-phases/01-bootstrap: "Bootstrap"
  - milestones/v2.0-phases/01-legacy-ingest: "Legacy Ingest"
  - milestones/v2.0-phases/02-batch-export: "Batch Export"
  - quick: 260615-1a2-add-transport-adapter (PLAN, SUMMARY) and 260701-3xz-fix-quick-typo (PLAN)
  - milestone-root: v1.0-/v2.0- MILESTONE-AUDIT, REQUIREMENTS, ROADMAP
  - research: PITFALLS, STACK, SUMMARY, plus the exclusion `.planning/research/.cache`, reason "Matches the research/.cache/ exclusion rule"
  - other: directory ui-reviews containing .gitignore
  - 52 file leaves in total
- Tests run under vitest in the node environment, and only `test/**/*.test.ts` files run. There is no DOM library. tsconfig.server.json covers src/**/*.ts and test/**/*.ts but excludes src/web/**. Web components are covered by source-text contracts that use a `source()` readFile helper and visual-contract's `ruleBlocks(css, selector)` helper.
- test/token-guard.test.ts checks every declaration outside the `:root`, `.dark`, `@theme inline` and `@font-face` blocks:
  - spacing properties (padding, margin, gap, inset, top, right, bottom, left) must be 0, auto, a % or wholly var(); raw units fail even inside calc()
  - font-size, line-height, letter-spacing, font-weight and font-family must be tokens
  - colours must be tokens, and a color-mix() recipe may not recur
  - `--space-N` steps must be 0.125rem multiples, which is why `--drawer-width` must NOT carry the `--space-` prefix
  - every `--space/--fs/--lh/--ls/--fw` token must be consumed
  - any new non-scale `:root` token joins the palette uniqueness check
  - width, height, transform, box-shadow offsets, z-index and outline are not scanned. Still use tokens for space, type and colour, per the user's standing rule
- Existing `--space-*` steps: 0-5, 1, 1-5, 2, 2-5, 3, 3-5, 4, 5, 6, 7, 8, 10, 12, 22, 28.
- Other tokens and recipes to reuse:
  - `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-border`, `--muted-foreground`, `--primary`, `--ring`, `--overlay-scrim` (both themes), `--shadow-popover`
  - `--fs-1..3`, `--lh-snug`, `--ls-wider`, `--ls-normal`, `--fw-medium`, `--fw-semibold`, `--font-heading`, `--font-mono`
  - inset focus recipe: `outline: 2px solid var(--ring); outline-offset: -2px;` (globals.css lines 3150-3153)
  - Base UI slide/fade recipe: `[data-starting-style]` / `[data-ending-style]` (see `.reference-preview`, lines 2074-2078)
  - scrim and z-index recipe: `.search-dialog-backdrop` z-index 70 with popup 71 (lines 2855-2879)
  - Tailwind preflight hides `[hidden]` with !important. Base UI sets `hidden` on a keepMounted popup while it is closed, so a `display` rule on `.sidebar-drawer` cannot leak it open.
- globals.css line map:
  - micro-label comment 86-94
  - dialog geometry tokens 232-237
  - overflow reset selector list 294-300 (shell-contract pins `.shell-content,` in it)
  - `.shell-header` 357-371
  - brand/nav/controls grid-area rules 373-500
  - `.shell-content` through the `.tree-excluded-reason` block 574-702
  - `@media (max-width: 62rem)` 1645-1693
  - `@media (max-width: 42rem)` 1695-1760
  - global reduced-motion block 1795-1804
- @base-ui/react 1.7.0 `@base-ui/react/dialog` exports Root (`open`, `onOpenChange`), Trigger, Portal (`keepMounted`, see node_modules/@base-ui/react/dialog/portal/DialogPortal.d.ts), Backdrop, Popup, Title and Close. SearchDialog in src/web/components/search-field.tsx lines 105-121 is the in-repo pattern: a Trigger styled with `buttonVariants({ variant: 'ghost', size: 'sm', className })` from ./ui/button.tsx. lucide-react exports PanelLeft, ChevronRight and X.
- eslint runs eslint-plugin-react-hooks v7 flat recommended, which flags setState called synchronously in an effect body and ref reads during render. There is no react-refresh plugin, so exporting a hook next to a component is fine.
- Server CLI: `node src/server/index.ts <projectPath> --port <n>` for dev, which needs no build, and `npm start -- <projectPath> --port <n>` for prod, which serves dist/. Both bind 127.0.0.1. A user instance may already be running on port 4210. Never stop or restart it. Use port 4211, plus 4212 for the optional studio-portal shot.
- Browser automation: the browser MCPs are broken on this machine. Use a throwaway .mjs file under /tmp, never in the repo. It imports `chromium` from `/home/cinedise/.npm-global/lib/node_modules/@playwright/test/node_modules/playwright-core/index.mjs` and launches with `executablePath: '/home/cinedise/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'`. Seed the theme with an addInitScript that sets localStorage `labelore-theme` to 'light' or 'dark'.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1 (tracer): readable, lifecycle-ordered, exclusion-free tree, end to end from projection through /api/tree to the rendered row</name>
  <files>src/presentation/tree-labels.ts, src/presentation/tree.ts, test/presentation/tree.test.ts, src/web/components/tree-navigator.tsx</files>
  <precondition>node_modules is present in the worktree. If it is absent, run `npm ci`, which installs only lockfile packages.</precondition>
  <read_first>src/presentation/tree.ts, src/planning-repo/naming.ts lines 1-210, src/web/components/tree-navigator.tsx, test/presentation/tree.test.ts, test/web/degradation-ui-contract.test.ts lines 45-115, test/web/shell-contract.test.ts lines 96-116, test/web/empty-state-contract.test.ts</read_first>
  <behavior>
    - sentenceCase:
      - 'UI-SPEC' gives 'UI spec', 'AI-SPEC' gives 'AI spec', 'DISCUSSION-LOG' gives 'Discussion log', 'COST-MODEL' gives 'Cost model'
      - 'estimation-calibration' gives 'Estimation calibration', 'api_keys' gives 'API keys', 'UAT' gives 'UAT'
      - 'add-transport-adapter' gives 'Add transport adapter'
    - Dense group labels in order: Project, Phases, Archived phases, Quick tasks, Milestones, Research, Other.
    - Dense labels and badges by path:
      - .planning/STATE.md gives State (null badge); config.json gives Config; estimation-calibration.json gives Estimation calibration; HANDOFF.json gives Handoff
      - .planning/v3.0-CAPACITY-PLAN.md gives Capacity plan with badge v3.0
      - .planning/phases/01-identity-slice gives Identity Slice with badge 01
      - in that phase dir: 01-01-PLAN.md gives Plan 01, 01-02-SUMMARY.md gives Summary 02, 01-UI-SPEC.md gives UI spec, 01-AI-SPEC.md gives AI spec, 01-UAT.md gives UAT
      - .planning/milestones/v1.0-phases gives v1.0 (null badge); .planning/milestones/v2.0-phases/02-batch-export gives Batch Export with badge 02
      - .planning/quick/260615-1a2-add-transport-adapter gives Add transport adapter with badge Jun 15; 260701-3xz-fix-quick-typo gives Fix quick typo with badge Jul 1; 260615-1a2-PLAN.md gives Plan
      - .planning/milestones/v1.0-ROADMAP.md gives Roadmap with badge v1.0; v2.0-MILESTONE-AUDIT.md gives Milestone audit with badge v2.0
      - .planning/research/STACK.md gives Stack
      - .planning/ui-reviews gives UI reviews; .planning/ui-reviews/.gitignore gives Gitignore
    - No file-leaf label anywhere in the dense tree contains '.md' or '.json'.
    - Lifecycle order in the dense tree:
      - 01-identity-slice children labels are exactly Context, Spec, AI spec, UI spec, Research, Patterns, Cost model, Validation, Plan 01, Summary 01, Plan 02, Summary 02, Verification, Security, UAT, Learnings
      - root children labels are exactly Project, Roadmap, Requirements, State, Milestones, Backlog, Learnings, Retrospective, Capacity plan, Windows, Config, Estimation calibration, Handoff
      - quick dir paths run newest first: 260701-3xz-fix-quick-typo, then 260615-1a2-add-transport-adapter
      - milestone-root label/badge pairs are Roadmap/v2.0, Requirements/v2.0, Milestone audit/v2.0, Roadmap/v1.0, Requirements/v1.0, Milestone audit/v1.0
      - research is Summary, Stack, Pitfalls
      - archived wrappers are v1.0 then v2.0, and the v2.0 phases are Legacy Ingest then Batch Export
    - Collision: stub root artifacts STATE.md and STATE.json become 'State' and 'State (JSON)'. A lone config.json stays 'Config' with no suffix.
    - The phase-order test now asserts child PATHS .planning/phases/2-second, 2.1-urgent, 10-tenth in that order, with badges '2', '2.1', '10'.
    - Exclusions (D-04):
      - dense: no node path contains '.cache', no label contains 'Excluded', the research group's children are exactly the three .md paths, and no node object has an excludedReason key
      - a presentation carrying only the `.planning` exclusion yields seven groups, each with zero children, without throwing
    - Every node carries a `badge` key (string or null). Test 1 (52 file leaves equal the artifact paths), Test 3 (directory paths), Test 6 and the D-16 root REQUIREMENTS override keep passing unchanged.
  </behavior>
  <action>
RED first. In test/presentation/tree.test.ts:
- Import `sentenceCase` from `../../src/presentation/tree-labels.ts`.
- Add a describe "readable labels and badges (quick-260911-vqe D-02)", a describe "lifecycle order (D-03)" and a describe "exclusions hidden (D-04)", covering every case in `<behavior>`.
- Build the collision case with the same stub-DTO shape the existing Phase-4 D-12 describe uses: key, path, kind, title, location 'root', frontmatter, structured, milestoneKey, phaseKey, warnings, bodyLength.
- Replace "Test 5" and the WR-01 describe with their inverted D-04 forms.
- Rewrite the phase-order test to assert paths and badges.
- Delete the D-12 test's loop over exclusion-typed nodes, since that node type no longer exists.
- Run the file and see it fail.

GREEN, in this order:

1. Create src/presentation/tree-labels.ts as a pure module: no DOM, no node:* imports, no React. Import the parsers from `../planning-repo/naming.ts`. Import the `TreeNode` and `TreeLocation` types from `./tree.ts` with `import type` only; that is erased at runtime, so there is no runtime cycle. Export:

   (a) `GROUP_LABELS: Record<TreeLocation, string>`: root 'Project', phase 'Phases', archived-phase 'Archived phases', quick 'Quick tasks', milestone-root 'Milestones', research 'Research', other 'Other'. The CSS eyebrow uppercases them visually, per D-02.

   (b) `sentenceCase(token: string): string`.
   - Split on runs of hyphen, underscore and whitespace, drop empty parts, and lowercase each word.
   - Upper-case a word when its uppercase form is in the acronym set UAT, UI, AI, API, JSON, ADR, PRD, CLI.
   - Otherwise capitalise only the first word's first character. Join with single spaces.
   - An input that yields no words is returned unchanged.

   (c) `labelOf(node: Pick<TreeNode, 'location' | 'nodeType' | 'path'>, phase: { name: string; number: string } | null): { label: string; badge: string | null }`. The segment is the last path segment. Rules, per D-02:
   - Directory in location phase or archived-phase:
     - when `phase` is given, label is phase.name and badge is phase.number
     - else a parseMilestonePhasesDirName match gives label = the version string, badge null
     - else a parsePhaseDirName match gives label = sentenceCase(slug), badge = number
     - else the generic directory rule
   - Directory in location quick: a parseQuickDirName match gives label = sentenceCase(slug) and badge = a short date. The short date is a fixed English three-letter month from the MM digits, a space, then the day number without a leading zero ('260615' gives 'Jun 15', '260701' gives 'Jul 1'). Take the digits by string slicing, not Date or locale APIs. An out-of-range month gives a null badge.
   - Any other directory: sentenceCase(segment), badge null.
   - File in phase or archived-phase: a parsePlanFileName match gives 'Plan NN' or 'Summary NN', using `plan` as written. Else a parsePhaseArtifactName match gives sentenceCase(artifact). Else the generic file rule.
   - File in quick: a parseQuickArtifactName match gives sentenceCase(artifact). Else the generic file rule.
   - File in root or milestone-root: a parseMilestoneFileName match gives label sentenceCase(document) and badge version. This applies to root as well as milestone-root, so `v3.0-CAPACITY-PLAN.md` reads 'Capacity plan' with badge v3.0 instead of 'V3.0 capacity plan' (Claude's discretion, recorded here). Else the generic file rule.
   - Generic file rule:
     - a name that starts with a dot and has no other dot drops the dot and is sentence-cased ('.gitignore' gives 'Gitignore')
     - otherwise split at the last dot; for an `md` or `json` extension (case-insensitive), label = sentenceCase(base)
     - any other extension is appended as a lowercase trailing word ('milestone.lock' gives 'Milestone lock')
     - no extension gives sentenceCase(segment)
     - badge null

   (d) `formatSuffix(segment: string): string | null`: null for a `.md` name or a name with no extension, otherwise the extension upper-cased ('STATE.json' gives 'JSON').

   (e) `rankOf(node: Pick<TreeNode, 'location' | 'nodeType' | 'path'>): number`. Lower sorts first; the caller breaks ties on the raw segment. Rules, per D-03:
   - File in phase or archived-phase:
     - a PLAN/SUMMARY match ranks 1000 + planNumber * 2, plus 1 for a summary, so each summary sits right after its plan
     - a parsePhaseArtifactName token in the pre-plan list CONTEXT, DISCUSSION-LOG, SPEC, AI-SPEC, UI-SPEC, RESEARCH, PATTERNS, COST-MODEL, VALIDATION ranks by its index (0-8)
     - a token in the post-plan list REVIEW, REVIEW-FIX, VERIFICATION, SECURITY, UAT, LEARNINGS ranks 1_000_000 + index
     - any other token or unmatched name ranks 2_000_000, so unknowns come last and alphabetically via the tie-break
   - File in root: PROJECT.md, ROADMAP.md, REQUIREMENTS.md, STATE.md, MILESTONES.md, BACKLOG.md, LEARNINGS.md, RETROSPECTIVE.md rank 0-7. Any other .md ranks 100. Everything else ranks 200.
   - File in research: SUMMARY.md, STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md rank 0-4. Everything else ranks 100.
   - File in milestone-root with a parseMilestoneFileName match: rank is -(versionKey * 10) + documentIndex, where documentIndex is ROADMAP 0, REQUIREMENTS 1, MILESTONE-AUDIT 2, anything else 3. Compute versionKey = major * 1_000_000 + minor * 1_000 + patch by dropping the leading 'v' and splitting on dots, so no regex is needed. An unmatched file ranks Number.MAX_SAFE_INTEGER.
   - Directory in quick with a parseQuickDirName match: rank is -(Number(date) * 46_656 + parseInt(timeToken, 36)), so the newest task sorts first (46_656 is 36 cubed, the time token's range). An unmatched directory ranks 1.
   - File in quick with a parseQuickArtifactName match: CONTEXT 0, PLAN 1, SUMMARY 2, VERIFICATION 3, anything else 100.
   - Directory in archived-phase with a parseMilestonePhasesDirName match: versionKey, ascending. This keeps today's oldest-first wrapper order, but numerically correct.
   - Everything else ranks 0.

2. Rework src/presentation/tree.ts:
   - Export `type TreeLocation` (the existing `keyof typeof LOCATION_ORDER`).
   - Narrow `TreeNodeType` to group, directory and file.
   - On `TreeNode`, delete the exclusion-reason field. Add `badge: string | null`, documented as a phase number, milestone version or quick-task date, and null otherwise.
   - Move the group labels to tree-labels.ts and import GROUP_LABELS, labelOf, rankOf and formatSuffix from `./tree-labels.ts`.
   - Replace the dirPath-to-identity map with one holding `{ identity, name }` from each PhaseDto whose dirPath is non-null. The url still comes from `buildPhaseUrl(identity)`; the label and badge come from `labelOf(directoryNode, { name, number: identity.number })`.
   - Leaves take their label and badge from `labelOf(fileNode, null)`. Keep the url rule, including the ROOT_REQUIREMENTS_PATH traceability override (Phase-3 D-16), plus unknownKind and warningTone, all unchanged.
   - Per D-04, delete the exclusion loop, the path-based location classifier that only exclusions used, and the zero-segment early branch in `insert()`.
   - Rewrite the file-header comment. The tree mirrors every reachable artifact, each shown as a leaf with a readable label, and recorded exclusions are deliberately not shown (quick-260911-vqe D-04), though they remain on ProjectPresentation for other surfaces. Update the import-list note to include tree-labels.ts.
   - `sortChildren`, per D-03:
     - directories before leaves, as today
     - two directories that both have phase identities compare by `comparePhaseNumbers`
     - otherwise, and for all leaves, compare `rankOf` ascending, then the raw last path segment with `localeCompare`; never the label, since readable labels would break chronology
     - after sorting, run a disambiguation pass over the leaves: when two or more leaves share a label, every one of them whose `formatSuffix(segment)` is non-null gets ' (SUFFIX)' appended, giving 'State (JSON)'
     - recurse into directories as today

3. Rework the row markup in src/web/components/tree-navigator.tsx, markup only; Task 2 owns its CSS and the drawer props:
   - Per D-04, delete the exclusion render branch.
   - Import `ChevronRight` from lucide-react.
   - Leaf rows (the Link and the plain span variants) contain, in order:
     - an empty `span.tree-chevron-spacer` with aria-hidden
     - `<span className="tree-node-label" title={node.path}>{node.label}</span>`
     - a `span.tree-badge` holding `node.badge`, rendered only when non-null
     - the unchanged `<WarningIndicator tone={node.warningTone} />`
   - A disclosure `<summary>` contains, in order:
     - `<ChevronRight className="tree-chevron" aria-hidden="true" />`
     - the label element: Link or span as today, className `tree-node-label tree-group-label` for groups or `tree-node-label tree-node-link` for directories, with `title={node.path}` on directories only (a group's path is its location key, not a file path)
     - the badge span when non-null
   - Keep these byte-identical, because other contracts pin them:
     - the empty-group branch: `<p className="tree-group-label">{node.label}</p>` and `<p className="empty-note">Nothing here yet.</p>`
     - `<details className="tree-disclosure" ref={detailsRef} open={node.nodeType === 'group'}>`
     - the reveal effect's `if (detailsRef.current) detailsRef.current.open = true;`
     - the Warning/Unreadable literals
   - Leave the TreeNavigator props and the app-shell wiring as they are in this task; Task 2 replaces them.
   - No raw-HTML injection; every label, badge and title is React text or an attribute.

4. Tracer end-to-end check. Write /tmp/vqe-api-check.mjs, outside the repo and never committed. It:
   - fails fast if something already answers on http://127.0.0.1:4211
   - spawns `process.execPath` with args `src/server/index.ts fixtures/dense --port 4211`, with cwd /home/cinedise/gsd-lore
   - polls GET /api/tree every 250ms for up to 30s
   - asserts on the JSON: the first group's label is 'Project'; the node at .planning/phases/01-identity-slice has label 'Identity Slice' and badge '01'; no node has nodeType 'exclusion'; no node path contains '.cache'
   - kills the child in a finally block and exits non-zero on any failure

Run the verify command until green.
  </action>
  <verify>
    <automated>npx vitest run test/presentation/tree.test.ts test/web/degradation-ui-contract.test.ts test/web/empty-state-contract.test.ts test/web/shell-contract.test.ts test/web/visual-contract.test.ts && npm run typecheck && npm run lint && npm test && node /tmp/vqe-api-check.mjs</automated>
  </verify>
  <done>
    - The live /api/tree on fixtures/dense returns readable labels, badges and lifecycle order with no exclusion node.
    - Rows render label, title tooltip and badge.
    - All tree tests, including the new label, order and D-04 cases, pass.
    - The full suite, typecheck and lint are green at this commit.
  </done>
</task>

<task type="auto">
  <name>Task 2: overlay drawer behind a navbar menu trigger, plus one row anatomy, colour ramp and rhythm in tokens</name>
  <files>src/web/components/sidebar-drawer.tsx, src/web/components/tree-navigator.tsx, src/web/components/app-shell.tsx, src/web/styles/globals.css, test/web/visual-contract.test.ts, test/web/shell-contract.test.ts</files>
  <read_first>src/web/components/search-field.tsx lines 1-12 and 105-121, src/web/components/app-shell.tsx, node_modules/@base-ui/react/dialog/portal/DialogPortal.d.ts, globals.css lines 84-94, 228-237, 290-300, 355-500, 570-705, 1640-1760, 2046-2080, 2855-2880 and 3148-3154, test/web/visual-contract.test.ts lines 1-40 (ruleBlocks helper), 485-569 and 700-775, test/web/shell-contract.test.ts lines 38-62 and 96-116, test/web/navbar-contract.test.ts lines 270-305 (lucide import and brand pins on app-shell.tsx), test/web/refresh-contract.test.ts lines 45-60</read_first>
  <action>
Comment hygiene: the updated tests negative-match the removed header-measurement machinery and the removed absent-sidebar plumbing in app-shell.tsx, and the removed exclusion selectors in globals.css. Do not name those removed identifiers in any new comment in those files; describe them by concept.

1. Test updates first. Leave every other describe untouched. In test/web/visual-contract.test.ts, rename the describe "persistent tree sidebar (03-03 Task 2, D-09/D-10/D-12)" to "planning-files drawer (quick-260911-vqe D-01..D-04, SB-04/SB-05)" and rewrite its tests:
   - Test 1: the `.shell-content {` block declares `display: grid;` and `grid-template-columns: minmax(0, 1fr);`, and the stylesheet has no `.shell-content[` attribute-variant selector.
   - Test 2:
     - the `.sidebar-drawer {` block contains `position: fixed;`, `width: var(--drawer-width);`, `background: var(--sidebar);`, `color: var(--sidebar-foreground);`, `border-right: 1px solid var(--sidebar-border);` and `box-shadow: var(--shadow-popover);`
     - the `summary.tree-node-row:hover {` block contains `background: var(--sidebar-accent);` and `color: var(--sidebar-foreground);`
   - Test 3:
     - the `.tree-navigator {` block contains `overflow-y: auto;` and no `position: sticky;`
     - the stylesheet declares `--drawer-width: min(22rem, 88vw);`
     - a `.sidebar-drawer[data-starting-style]` rule sets `translateX(-100%)`
     - a prefers-reduced-motion block sets `transition: none` on `.sidebar-drawer`
   - Test 4 (the active row on --sidebar-primary): keep as it is.
   - Test 5: the `.tree-node-label {` block contains `text-overflow: ellipsis;` and `white-space: nowrap;`.
   - Test 6: keep as it is.
   - The narrow-viewport test:
     - the base `.shell-header {` block declares `grid-template-areas: 'menu brand nav controls';`
     - the 62rem section declares `'menu brand controls' 'nav nav nav'`
     - no rule from the 62rem media query onward sets display none on `.tree-navigator` or `.sidebar-trigger`
   - Test 7: keep. Also assert that src/web/components/sidebar-drawer.tsx has no localStorage or sessionStorage.
   - The shell-region test:
     - app-shell.tsx contains `<SidebarDrawer`, `href="#main-content"` and `<div className="shell-outlet" id="main-content">`
     - sidebar-drawer.tsx contains `<TreeNavigator`, `@base-ui/react/dialog`, `<Dialog.Portal keepMounted>`, `aria-label="Open planning files"`, `PanelLeft` and `Dialog.Title`
     - tree-navigator.tsx contains `export function useTreeQuery`, `ChevronRight`, `className="tree-badge"`, `title={node.path}` and `scrollIntoView({ block: 'nearest' })`
   - In the micro-label describe, drop the exclusion-marker entry from MICRO_LABEL_SELECTORS, and edit the "six sibling selectors" comment and the trailing note near line 770 so they describe five siblings. Note that the tree's exclusion marker left with the D-04 removal.

   In test/web/shell-contract.test.ts, replace the "restructures the shell content region into a persistent sidebar plus outlet (03-03 D-09)" test with "mounts the planning-files drawer trigger in the header and keeps a single-column content region (quick-260911-vqe D-01)". It asserts:
   - app-shell.tsx contains `import { SidebarDrawer } from './sidebar-drawer.tsx';` and `import { useTreeQuery } from './tree-navigator.tsx';`
   - app-shell.tsx matches `{tree.isSuccess ? <SidebarDrawer /> : null}`, and that render sits after `<header className="shell-header"` and before `className="brand"`
   - app-shell.tsx contains `<div className="shell-content">`, `<div className="shell-outlet" id="main-content">` and `href="#main-content"`
   - app-shell.tsx does not contain the words data-sidebar, onAbsentChange, ResizeObserver or shell-header-height
   - sidebar-drawer.tsx contains `<TreeNavigator open={open} onNavigate={() => setOpen(false)} />` and no dangerouslySetInnerHTML
   Keep the IN-01 declarative-open test exactly as it is.

   Run both files and see them fail.

2. src/web/components/tree-navigator.tsx, per D-01:
   - Export `useTreeQuery()`, returning `useQuery({ queryKey: ['tree'], queryFn: fetchTree })`. TreeNavigator calls it; react-query dedupes the fetch with AppShell's call.
   - Change the TreeNavigator props to `{ open: boolean; onNavigate: () => void }`. Delete the absent-state callback prop and its effect.
   - Thread `onNavigate` through TreeBranch recursion. Every leaf Link's onClick calls it. The directory-summary Link keeps `event.stopPropagation()` and then calls it.
   - Add a `navRef` on the loaded `<nav className="tree-navigator" aria-label="Planning directory tree">`. Add a `useEffect` keyed on `open`: when open, schedule a `requestAnimationFrame` that finds the `[data-active='true']` element inside navRef and calls `scrollIntoView({ block: 'nearest' })`, and cancel the frame in the cleanup. Declare every hook before the error and pending early returns. There is no setState in any effect.
   - Update the component doc comment: it is now the drawer body.
   - Keep the reveal effect, the declarative group open, the empty-group JSX and WarningIndicator unchanged.

3. Create src/web/components/sidebar-drawer.tsx, exporting `SidebarDrawer()`. It is modelled on SearchDialog:
   - It holds `const [open, setOpen] = useState(false)` and renders `Dialog.Root open={open} onOpenChange={setOpen}`, in the default modal mode, so Esc and backdrop clicks close it.
   - The trigger is `Dialog.Trigger` with className `buttonVariants({ variant: 'ghost', size: 'sm', className: 'sidebar-trigger' })`, `aria-label="Open planning files"`, and `<PanelLeft aria-hidden="true" />` inside.
   - `<Dialog.Portal keepMounted>` keeps manual expand/collapse state and the tree alive while closed. It contains `Dialog.Backdrop className="sidebar-drawer-backdrop"` and `Dialog.Popup className="sidebar-drawer"`.
   - Inside the popup, first a `div.sidebar-drawer-header` holding `Dialog.Title className="sidebar-drawer-title"` with the text "Planning files" and a `Dialog.Close` styled `buttonVariants({ variant: 'ghost', size: 'sm', className: 'sidebar-drawer-close' })` with `aria-label="Close planning files"` and `<X aria-hidden="true" />`. Then `<TreeNavigator open={open} onNavigate={() => setOpen(false)} />`.
   - PanelLeft and X are imported here, not in app-shell.tsx: navbar-contract pins app-shell's lucide import to the tab icons only.

4. src/web/components/app-shell.tsx, per D-01:
   - Remove the header-measurement effect, its ref and state, the inline custom-property style on `.app-shell`, the ref on `<header>`, and the absent-sidebar state. Trim the react import to `Suspense`; build-splitting pins that import.
   - Call `const tree = useTreeQuery();`.
   - Render `{tree.isSuccess ? <SidebarDrawer /> : null}` as the FIRST child of `<header className="shell-header">`, before the brand NavLink.
   - The content region becomes `<div className="shell-content">` containing only the existing `<div className="shell-outlet" id="main-content">` with its Suspense/Outlet block.
   - Keep the brand, tabs, shell-controls, shell-notice, fetchPresentation and ToastProvider exactly as they are.

5. src/web/styles/globals.css. Use tokens only (strict-design-tokens memory). Per D-01 and SB-05:
   - In the dialog-geometry token block, add `--drawer-width: min(22rem, 88vw);` with a one-line comment: it is the planning-files drawer width, not `--space-` prefixed for the same reason as the dialog tokens above.
   - Header:
     - `.shell-header` gets `grid-template-areas: 'menu brand nav controls';` and `grid-template-columns: auto minmax(0, 1fr) auto minmax(0, 1fr);`
     - the 62rem override becomes `'menu brand controls' 'nav nav nav'` over `auto minmax(0, 1fr) auto`
     - new `.sidebar-trigger`: grid-area menu, align-self center, margin-left var(--space-3)
     - tune spacing between trigger and brand with `--space-*` tokens only, so the 400px header stays two rows
   - Content:
     - `.shell-content` keeps position relative and z-index 1, with `display: grid; grid-template-columns: minmax(0, 1fr);`
     - delete the attribute-variant `.shell-content` rule and its comment
     - delete the 62rem `.shell-content` override and the 62rem rule that hides `.tree-navigator`, with its comment
     - keep `.tree-navigator` in the overflow reset selector list
   - `.tree-navigator` becomes the drawer's scroll body: min-height 0, overflow-y auto, overscroll-behavior contain. It has no sticky positioning, no height calc, no border and no background, since the drawer owns those.
   - Drawer:
     - `.sidebar-drawer-backdrop`: position fixed, inset 0, z-index 70, background var(--overlay-scrim), opacity transition; its `[data-starting-style]` and `[data-ending-style]` set opacity 0
     - `.sidebar-drawer`: position fixed, top 0, bottom 0, left 0, z-index 71, display grid, grid-template-rows `auto minmax(0, 1fr)`, `width: var(--drawer-width);`, `background: var(--sidebar);`, `color: var(--sidebar-foreground);`, `border-right: 1px solid var(--sidebar-border);`, `box-shadow: var(--shadow-popover);`, and a transform transition
     - `.sidebar-drawer[data-starting-style]` and `.sidebar-drawer[data-ending-style]` set `transform: translateX(-100%);`
     - `.sidebar-drawer-header`: flex, space-between, gap var(--space-2), padding on `--space-*` tokens, bottom border 1px solid var(--sidebar-border)
     - `.sidebar-drawer-title`: margin 0, font-heading, var(--fs-2), var(--fw-semibold), var(--ls-wider), uppercase, var(--sidebar-foreground)
     - a `@media (prefers-reduced-motion: reduce)` block setting `transition: none` on `.sidebar-drawer`, `.sidebar-drawer-backdrop` and `.tree-chevron`
   - Row anatomy and rhythm:
     - `.tree-node-row`: display grid; grid-template-columns `var(--space-4) minmax(0, 1fr)`; grid-auto-flow column with grid-auto-columns auto, so the badge and warning take trailing auto tracks; align-items center; gap var(--space-1-5); min-height var(--space-8); padding-inline var(--space-2); color var(--muted-foreground) for the leaf tone; var(--fs-3); var(--lh-snug); no text-decoration. Drop the old flex, overflow-wrap and block padding.
     - `.tree-node-label`: min-width 0, overflow hidden, text-overflow ellipsis, white-space nowrap.
     - `.tree-chevron`: width and height var(--space-3-5), justify-self center, color var(--muted-foreground), transform transition. `.tree-disclosure[open] > summary > .tree-chevron` rotates 90deg.
     - `.tree-badge`: var(--font-mono), var(--fs-1), var(--ls-normal), var(--muted-foreground), tabular-nums.
     - Folder rows: `.tree-node[data-node-type='directory'] > .tree-disclosure > .tree-node-row` uses var(--sidebar-foreground) and var(--fw-medium).
     - `.tree-group-label`, the eyebrow: var(--muted-foreground), var(--fs-2), font-heading, var(--fw-semibold), var(--ls-wider), uppercase. Drop overflow-wrap from the shared `.tree-node-link, .tree-group-label` rule.
     - Hover: keep the `a.tree-node-row:hover, summary.tree-node-row:hover` selector list, now with background var(--sidebar-accent) and color var(--sidebar-foreground). This drops the stray accent-foreground token from the tree.
     - Active: keep `.tree-node-row[data-active='true']` exactly as it is.
     - Focus: add `a.tree-node-row:focus-visible, summary.tree-node-row:focus-visible` with the in-repo inset recipe, `outline: 2px solid var(--ring); outline-offset: -2px;`.
     - Siblings: `.tree-root, .tree-children` keep gap var(--space-0-5).
     - `.tree-children`: margin-left var(--space-4), which puts the guide line under the parent chevron's centre (row padding --space-2 plus half the --space-4 chevron slot); padding-left var(--space-3); keep the existing single color-mix border-left.
     - `.tree-root > .tree-node + .tree-node`: margin-top var(--space-4), so every group after the first gets the group gap.
     - `.tree-root`: padding on `--space-*` tokens.
   - Per D-04, delete the three `.tree-excluded*` rules. Edit the micro-label comment near line 88 so it no longer names the exclusion marker; keep `--font-size-micro-label`, which other selectors still consume.

6. Run the verify command until green, including token-guard.
  </action>
  <verify>
    <automated>npx vitest run test/web/visual-contract.test.ts test/web/shell-contract.test.ts test/web/navbar-contract.test.ts test/web/refresh-contract.test.ts test/web/degradation-ui-contract.test.ts test/web/empty-state-contract.test.ts test/web/build-splitting.test.ts test/token-guard.test.ts && npm run typecheck && npm run lint && npm test</automated>
  </verify>
  <done>
    - The header renders a PanelLeft trigger in a new menu area once the tree loads.
    - The trigger opens a left-edge, keepMounted drawer holding the tree. Links close it, and the active row scrolls into view on open.
    - The content region is a single full-width column at every width.
    - Rows share one grid, colour ramp and rhythm, with a rotating chevron, an ellipsis label, a mono badge and a focus ring.
    - Every value is a token, and the exclusion CSS is gone.
    - The full suite, typecheck and lint are green at this commit.
  </done>
</task>

<task type="auto">
  <name>Task 3: full gate plus live drawer verification at 1440px and 400px, light and dark, closed and open</name>
  <files>none; verification only. Screenshots and scripts live under /tmp and are never committed.</files>
  <read_first>/home/cinedise/.claude/projects/-home-cinedise-gsd-lore/memory/browser-tooling-workaround.md</read_first>
  <action>
1. Full gate: `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` must all pass. Fix any regression in the owning file and re-run.

2. Start `npm start -- fixtures/dense --port 4211` in the background, from /home/cinedise/gsd-lore. Poll http://127.0.0.1:4211/api/tree until it answers. Never touch port 4210.

3. Write /tmp/vqe-drawer-check.mjs using the playwright-core and Chromium paths in `<context>`. The script:
   - fetches /api/tree once to look up node urls by path
   - runs every step below at viewport widths 1440 and 400 (height 900), in each theme (light, dark)
   - writes screenshots to /tmp/vqe-shots/
   - prints one compact JSON result per assertion and exits non-zero on any failure

   Steps:
   (a) Load the url of .planning/phases/01-identity-slice/01-01-PLAN.md.
       - Assert `document.documentElement.scrollWidth <= window.innerWidth`.
       - Assert the `.shell-outlet` bounding width is within 1px of `document.documentElement.clientWidth`.
       - Assert `.sidebar-drawer` is not visible.
       - At 400px, assert `.sidebar-trigger` and `.brand` tops are within 4px of each other.
       - Screenshot the full page with the drawer closed.
   (b) Click `button[aria-label="Open planning files"]`.
       - Assert `.sidebar-drawer` is visible, its left edge is at 0, and its width is at most min(352, 0.88 * viewport width) + 1.
       - Assert `.sidebar-drawer-backdrop` is visible.
       - Assert the `[data-active='true']` row inside the drawer is visible and lies within the `.tree-navigator` rect (the active row is in view on open).
       - Screenshot with the drawer open.
   (c) The drawer's innerText includes 'Plan 01', 'UI spec', 'State', 'Identity Slice', 'v1.0' and 'Jun 15'.
   (d) The drawer's textContent, which covers collapsed branches because the portal is kept mounted, includes neither 'Excluded' nor '.cache'. It matches none of the raw-name patterns: a two-digit-then-uppercase-token .md name such as 01-CONTEXT.md, a NN-NN-PLAN or SUMMARY name, or a .json filename. An element with title exactly `.planning/phases/01-identity-slice/01-CONTEXT.md` exists inside the drawer.
   (e) An open disclosure's `.tree-chevron` computed transform is not 'none'.
   (f) Click the 'UI spec' row link. Assert the URL path equals that node's url from /api/tree and `.sidebar-drawer` is hidden.
   (g) Reopen, press Escape, and assert the drawer is hidden.
   (h) Reopen and click at (viewport width - 10, viewport height / 2), which is on the backdrop. Assert the drawer is hidden.
   (i) Reopen and click the Phases group summary to collapse it. Close with Escape, reopen, and assert that group's `details` is still closed (keepMounted state survives). Click it again to restore.
   (j) Reopen and click the drawer's close button (aria-label 'Close planning files'). Assert the drawer is hidden.

4. Optional real-project shot. If /home/cinedise/studio-portal/.planning exists:
   - start `npm start -- /home/cinedise/studio-portal --port 4212`
   - open the drawer at 1440px in light mode and screenshot it
   - assert only that the drawer textContent has no 'Excluded' text
   This tool is read-only against that directory.

5. Kill only the 4211 and 4212 servers this task started. Record every assertion result and every screenshot path in the SUMMARY for end-of-phase human review.
  </action>
  <verify>
    <automated>npm test && npm run typecheck && npm run lint && npm run build && node /tmp/vqe-drawer-check.mjs</automated>
    <human-check>Review the /tmp/vqe-shots screenshots (1440px and 400px, light and dark, drawer closed and open) and confirm:
- The menu icon sits at the far left of the header, and content spans the full width when the drawer is closed.
- The drawer slides over a scrim from the left edge with square corners.
- Rows share one height and rhythm, with chevrons aligned and leaf text lined up under folder text.
- The labels read as a table of contents (Plan 01, UI spec, State, Identity Slice, with mono badges), with no raw filenames and no Excluded stub.
- The active row is highlighted and in view.
- Both themes stay legible.</human-check>
  </verify>
  <done>
    - The full suite, typecheck, lint and build pass.
    - Every live assertion passes at 1440px and 400px in both themes. That covers full-width content, drawer open and close via the trigger, link, Esc, backdrop and close button, active row in view, readable labels, raw names only in titles, no exclusions, and keepMounted state.
    - Screenshots are listed in the SUMMARY.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target .planning corpus → tree DOM | Filenames, directory slugs and ROADMAP phase names come from an arbitrary target project and are untrusted text. They now flow into labels, badges and title attributes |
| browser → local API | GET /api/tree on the loopback-only Hono server. The route and its handler are unchanged; only the projection's output shape changes |
| modal drawer ↔ page | A modal Dialog traps focus and locks scroll while open. It must always be dismissible |

## STRIDE Threat Register (ASVS L1, block on high)

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-vqe-01 | Tampering (markup injection) | tree-navigator.tsx labels, badges and titles; sidebar-drawer.tsx | medium | mitigate | Corpus strings render only as React text children and title attributes, never raw HTML. degradation-ui-contract keeps pinning no dangerouslySetInnerHTML in tree-navigator.tsx, and the new shell-contract test adds the same pin for sidebar-drawer.tsx. sentenceCase and labelOf only split, case and concatenate strings |
| T-vqe-02 | Denial of Service | tree-labels.ts parsing on every node | low | mitigate | Only the existing anchored naming.ts regexes are reused (no new filename regex, so no new backtracking surface). Rank and label are O(1) per node and the sort is O(n log n) per sibling list |
| T-vqe-03 | Information Disclosure | raw .planning-relative path in the row title tooltip | low | accept | A loopback-only personal tool. The same relative paths already appear in search results and artifact pages |
| T-vqe-04 | Repudiation / transparency | exclusions no longer shown in the tree (D-04) | low | accept | The user explicitly reversed Phase-3 D-10 for the tree. `ProjectPresentation.exclusions` is still produced server-side and untouched, so no information is destroyed, only not rendered in this surface |
| T-vqe-05 | Elevation / UI redress | modal drawer focus trap | low | mitigate | Base UI Dialog in the default modal mode, with Esc, backdrop click, the close button and link clicks all closing it. Task 3 asserts each dismissal path live |
| T-vqe-06 | Tampering | read-only invariant | low | mitigate | No server, planning-fs or planning-repo file is in files_modified. No endpoint or write path is added |
| T-vqe-SC | Tampering | npm installs | low | mitigate | No package is installed. @base-ui/react and lucide-react are existing dependencies. refresh-contract's dependency-set test stays unchanged and fails on any new dependency. `npm ci` (the Task 1 precondition) installs only lockfile packages |
</threat_model>

<verification>
- `npm test` passes, including test/token-guard.test.ts, the reworked test/presentation/tree.test.ts, and the retargeted test/web/visual-contract.test.ts and test/web/shell-contract.test.ts. The pins in degradation-ui-contract, empty-state-contract, navbar-contract, refresh-contract and build-splitting keep passing unchanged.
- `npm run typecheck`, `npm run lint` and `npm run build` pass.
- The Task 1 live /api/tree check and the Task 3 playwright pass on fixtures/dense (port 4211) record every assertion as passing, with screenshots listed in the SUMMARY.
- Source audit, with every source item covered:

| Source | Item | Covered by |
|--------|------|------------|
| GOAL | Sidebar becomes a navbar-toggled drawer; content always full width | Task 2 (drawer, header, CSS) + Task 3 (live) |
| CONTEXT | D-01 overlay drawer at every width, menu icon at far left, tree back below 62rem | Task 2 steps 2-5, Task 3 steps (a)-(b) at 400px |
| CONTEXT | D-02 readable names only, raw path in title | Task 1 steps 1(c) and 3, Task 3 steps (c)-(d) |
| CONTEXT | D-03 lifecycle ordering (phase, root, research, milestone-root, quick) | Task 1 steps 1(e) and 2 |
| CONTEXT | D-04 exclusions removed from the UI | Task 1 steps 2-3 (projection and render), Task 2 step 5 (CSS), Task 3 step (d) |
| RESEARCH/design §1 | badge field, sentenceCase with acronym set, group labels, collision suffix, phase name from PhaseDto, vX.Y wrapper, quick date badge | Task 1 |
| design §2 | useTreeQuery, trigger only when tree loaded, header measurement removed, SidebarDrawer via base-ui Dialog, keepMounted, controlled open plus onNavigate, active row scrolled into view, native details kept | Task 2 steps 2-4 |
| design §3 | row grid (chevron, label, badge/warning), ChevronRight rotation, leaf spacer, ellipsis plus title, WarningIndicator and empty-group JSX unchanged | Task 1 step 3 (markup) + Task 2 step 5 (CSS) |
| design §4 | single-column content, header menu area at both breakpoints, drawer rules, --drawer-width token, one colour ramp, one rhythm, focus-visible, exclusion CSS deleted | Task 2 step 5 |
| design §5 | test updates in tree, visual-contract and shell-contract | Task 1 (tree.test.ts), Task 2 step 1 |
| design Verification | typecheck, lint, test, build; playwright at 1440/400, light/dark, closed/open | Task 3 |
| Memory | strict design tokens + token-guard; playwright-core + Chromium 1234 script | Task 2 step 5, Task 3 |
| Excluded | filter box and counts, status dots, hiding empty groups, plan+summary merge, current-phase highlight, Ctrl/Cmd+B shortcut, expand/collapse all (design "Follow-ups") | not planned |
</verification>

<success_criteria>
- Every must_haves truth holds, observed live against fixtures/dense at 1440px and 400px in both themes.
- The tree projection is pure and tested. Labels and ranks come from tree-labels.ts on top of the naming.ts parsers, with no duplicated grammar regex.
- The drawer is the only home of the tree. The content region is a single column, and no dead header-measurement or absent-sidebar code remains.
- token-guard is green; the one new token is --drawer-width.
- Existing contracts for warnings, empty groups, native disclosure, declarative group open, brand/tabs, refresh and the lazy Outlet all still pass.
</success_criteria>

<output>
Create `/home/cinedise/gsd-lore/.planning/quick/260911-vqe-sidebar-redesign-navbar-drawer-readable-/260911-vqe-SUMMARY.md` when done. It must list the Task 1 /api/tree check result, every Task 3 assertion result and every screenshot path, for end-of-phase human review.
</output>
