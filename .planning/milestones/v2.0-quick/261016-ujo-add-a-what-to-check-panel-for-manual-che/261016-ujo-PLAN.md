---
phase: quick-261016-ujo
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/presentation/manual-checks.ts
  - src/server/index.ts
  - src/web/views/manifest.ts
  - src/web/pages/artifact-page.tsx
  - src/web/views/plan-navigator.ts
  - src/web/views/plan-navigator-components.tsx
  - src/web/styles/globals.css
  - src/planning-repo/handlers/plan-structure.ts
  - docs/design-language.md
  - test/presentation/manual-checks.test.ts
  - test/web/plan-navigator-view-contract.test.ts
  - test/web/plan-navigator.test.ts
  - test/plan-structure.test.ts
  - test/__golden__/dense.json
  - test/__golden__/sparse-started.json
autonomous: true
requirements: [QUJO-01, QUJO-02, QUJO-03, QUJO-04, QUJO-05, QUJO-06, QUJO-07, QUJO-08]

estimate:
  tokens: 150000
  raw_tokens: 150000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "QUJO-01: The server assembles a plan's manual checks behind the repository boundary. A pure builder in src/presentation/manual-checks.ts reads only the cached ProjectPresentation and the reference registry. The document response for a PLAN carries `manualChecks`, built from the same captured bundle as the rest of that response. Every other document, and a plan with no task that needs a person to check something, gets `manualChecks: null`. The builder never throws and never touches the filesystem."
    - "QUJO-02: A task needs a check when it is `checkpoint:human-verify` or its `<verify>` carries a `<human-check>`. Its own steps come only from its own fields. A `checkpoint:human-verify` task contributes How to check it, Steps, What to do, each Human check, Accept when and When you are done, each only when the field exists. Any other task, such as an auto or tracer task with an inline `<human-check>`, contributes only its Human check items."
    - "QUJO-03: VALIDATION files in the plan's own directory contribute their Manual-Only Verifications rows whose Requirement cell shares at least one ID with the plan's `requirements` frontmatter. IDs are trimmed and compared case-insensitively. Task IDs are never used to match a row in; they are used only to leave a row out: a row whose Behavior or Test Instructions cell names one or more task references (three dash-joined numeric groups such as `04-01-02`, phase group may carry a decimal such as `04.1-01-02`), none of which belongs to this plan (prefix `<phase>-<plan>-` taken from the plan file name, e.g. `04-06-` for 04-06-PLAN.md), is skipped. A row naming no task reference — the template shape — is kept. No shared ID, no table, or no plan requirements gives no VALIDATION group. (User decision 2026-10-16.)"
    - "QUJO-04: When the plan's directory holds a UI-SPEC, its UI Considerations rows whose status is backstop are listed. Covered, unresolved and dismissed rows are not. With no UI-SPEC, or no backstop row, there is no UI-SPEC group. Non-template sections such as Accessibility & Interaction are never special-cased."
    - "QUJO-05: A task's Read first entries become in-app links. So do `@`-prefixed entries and `@` lines in the task's own `<context>`. An entry becomes a link only when it names an artifact the presentation knows: by its exact `.planning/...` path, or by a bare file name in the plan's own directory. An entry that resolves to nothing is left out of the panel. Nothing is excerpted."
    - "QUJO-06: When the plan's directory holds a UAT file, every task with checks also points to that checklist. The pointer is a link to the file with one plain sentence and adds nothing to the count."
    - "QUJO-07: On the plan page, every task with checks gets a What to check tab. It is first, it shows the count, and the task opens on it. Every group names the file and section it came from as plain text, with a link back to that file wherever the presentation resolves one. The plan header gets a What to check control with the plan's total. The control opens the first task that needs a check on that tab. It is the plan view's counterpart of the cover's needs-a-human card."
    - "QUJO-08: A missing or unparseable source simply leaves its group out. Absence is silent, with no empty copy. Labelore stays read-only. Document text renders only through ResearchInline / ResearchBlocks. The only href is a presentation-generated artifact URL. npm test, npm run typecheck, npm run lint and npm run build pass, including the class-vocabulary, token-guard, css-source-order, plan-navigator contract and golden suites."
  artifacts:
    - path: "src/presentation/manual-checks.ts"
      provides: "The manual-checks model and the pure builder that assembles each checked task's groups from the plan, VALIDATION, UI-SPEC, Read first and UAT sources"
      contains: "export function buildPlanManualChecks"
    - path: "src/web/views/plan-navigator-components.tsx"
      provides: "ManualChecksPanel, the What to check tab body, and the header What to check control"
      contains: "ManualChecksPanel"
    - path: "src/planning-repo/handlers/plan-structure.ts"
      provides: "PlanTask.readFirst and PlanTask.resumeSignal, read tolerantly from a task's read_first / context / resume-signal children"
      contains: "readFirst"
    - path: "test/presentation/manual-checks.test.ts"
      provides: "Builder matrix: inline steps only, the studio-portal shape, a VALIDATION with no shared requirement, no UI-SPEC, inline human-check in an auto task, the UAT pointer, degradation, and a served end-to-end slice through the composer and the static markup"
      contains: "Manual-Only Verifications"
  key_links:
    - from: "src/server/index.ts artifactResponse"
      to: "src/presentation/manual-checks.ts buildPlanManualChecks"
      via: "called with activeDerived.presentation and activeDerived.referenceRegistry inside a try/catch, never the module-level derived binding"
      pattern: "buildPlanManualChecks\\(activeDerived\\.presentation"
    - from: "src/web/pages/artifact-page.tsx viewInput"
      to: "src/web/views/manifest.ts ViewInput.manualChecks"
      via: "a pass-through of the document response field, with no kind branch"
      pattern: "manualChecks: query\\.data\\.manualChecks"
    - from: "src/web/views/plan-navigator.ts composeTask"
      to: "the What to check tab"
      via: "a validated TaskManualChecks entry becomes ComposedPlanTask.checks and a first tab with key 'checks'"
      pattern: "key: 'checks'"
    - from: "src/presentation/manual-checks.ts"
      to: "src/presentation/references.ts resolveArtifactReference"
      via: "the only way a path the author wrote becomes a URL"
      pattern: "resolveArtifactReference\\("
---

<objective>
Add a What to check panel to the PLAN page. A person checking a plan's work by hand sees every step in one place, gathered only from the standard places a GSD project puts manual-check content. So it works on any GSD project, not only studio-portal.

Purpose: In studio-portal's 04-06-PLAN.md, Task 3 (`checkpoint:human-verify`, `gate="blocking-human"`) only says "Run the UI-SPEC Accessibility & Interaction checks and each UI Considerations row…". The real steps sit in 04-VALIDATION.md and 04-UI-SPEC.md, and the user had to ask for them to be stitched together by hand. The project's core value is knowing where every artifact lives without reading files by hand.

Output:
- A pure server-side builder, src/presentation/manual-checks.ts, served on the PLAN document response.
- A What to check tab on every task with checks, and a header control.
- `readFirst` and `resumeSignal` on the PLAN projection.
- Tests and one design-language bullet.

Sources. Every one is a shape from the installed @opengsd/gsd-core 1.17 templates; nothing is studio-portal-specific.
1. The task's own fields: what-built, how-to-verify and resume-signal from references/checkpoints.md, plus `<verify><human-check>` from end-of-phase mode, the 1.17 default.
2. VALIDATION `## Manual-Only Verifications` (Behavior | Requirement | Why Manual | Test Instructions). Matched on Requirement against the plan's `requirements`, never on task IDs: the template has no task-ID column. Exclusion only: a row that names task references belonging solely to other plans is skipped (QUJO-03), so a check owned by another plan that merely shares a requirement does not appear.
3. UI-SPEC `## UI Considerations` rows with the 🧪 backstop status.
4. Read first and `@` references, as links only.
5. The phase UAT file, as a pointer.

What the reference case should show once this ships. Use this as a sanity check against the live server, not as a test dependency.
- 04-06-PLAN.md frontmatter `requirements` is really [DL-04, DL-07, DL-08, DL-09], not DL-01/DL-02.
- Task 3 lists four items of its own: What to do, How to check it, Accept when, When you are done.
- It lists one VALIDATION row: "Browser/accessibility protocol (04-06-03, BLOCKING)" (DL-01, DL-02, DL-04, DL-08). "Production Cloudflare integrity/resume (04-01-02, BLOCKING)" shares DL-09 but names only another plan's task, so it is skipped. The DL-06 ZIP64 row (04-07-01) shares no requirement, so it is left out.
- It lists the five UI-SPEC backstop rows (E1 overflow, E2 overflow, E3 overflow, E3 long-text, E4 long-text).
- Read first links to 04-UI-SPEC.md and 04-VALIDATION.md. There is no UAT pointer, because phase 04 holds no UAT file.

Planner discretion, recorded here:
- The panel is a tab, not a section. Every task with checks opens on it, which puts every step in one place on the task. The task's own Verify / Context tabs stay as they are.
- The cover's needs-a-human card in src/web/views/layout-plan.ts is not changed, because that path never shows checks. That cover only renders when `composePlanNavigator` returns null, which happens when `structured.plan` is missing or has no readable task. The builder reads the same `structured.plan`, so on that path there are never any checks to show. The plan view's header gets the counterpart instead: a What to check control that opens the first task needing a check (Task 3).
- The UAT pointer lives in the plan panel, on every task with checks whose directory holds a UAT file.
- When a plan has several tasks with checks, each one shows the plan-level groups: the VALIDATION rows matched by requirement, the UI-SPEC backstops and the UAT pointer. Nothing in the template ties a row to a single task. The header total counts those plan-level items once.
- A Read first entry that resolves to no known artifact is left out of the panel; it can still be reached from the task's existing "In the source only" Read first chip. Linking it would mean guessing.
- The data is attached to the existing document response, not a new route. The precedent is quick-261006-iz6's `addedAt`. The panel then arrives with its document, from one bundle (D-05).
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@docs/design-language.md
@src/web/views/plan-navigator.ts
@src/web/views/plan-navigator-components.tsx
@src/planning-repo/handlers/plan-structure.ts
@src/presentation/references.ts
@src/server/index.ts

<interfaces>
Existing shapes the executor builds on (verified at planning time). Every `structured` value in the presentation is plain JSON (`jsonRecord`), so the builder treats each field as `unknown` and guards it.

```ts
// src/server/project-presentation.ts
interface ArtifactDto { key: string /* in-app URL */; path: string /* '.planning/phases/04-x/04-06-PLAN.md' */; kind: string; title: string;
  frontmatter: Record<string, unknown>; structured: Record<string, unknown>; milestoneKey: string | null; phaseKey: string | null; warnings: unknown[]; bodyLength: number }
interface ProjectPresentation { artifacts: ArtifactDto[] /* sorted by path */; /* … */ }

// kinds on the wire: 'plan' (structured.plan), 'validation' (structured.validation), 'ui-spec' (structured.uiSpec), 'uat'

// src/planning-repo/handlers/plan-structure.ts — structured.plan (plus .ref)
interface PlanTask { n: number /* 1-based */; anchor: string; type: string /* lower-cased, 'auto' when absent */; gate: string | null; tdd: boolean;
  name: string | null; files: string[]; fields: PlanTaskFields; sourceChildren: { tag: string; anchor: string }[] }
interface PlanTaskFields { action, context, whatBuilt, howToVerify, instructions, verification: PlanBlocks | null;
  behavior, acceptance: PlanList | null; done, decision: PlanText | null; options; reversibility; verify: PlanVerify | null }
interface PlanBlocks { anchor: string; blocks: Block[]; chars: number; words: number }
interface PlanList { anchor: string; lead: string | null; items: string[] }
interface PlanVerify { anchor: string; items: { kind: string /* 'automated' | 'fails_when' | 'human-check' | other tag | 'text' */; text: string }[] }
// helpers already in the file: parseFiles(text) (newline / top-level comma split, bullets, backticks, " — note", " (note)" removed), dedent, oneLine

// src/planning-repo/handlers/context-brief.ts
type Block = { kind: 'paragraph'; text: string } | { kind: 'list'; ordered: boolean; items: string[] } | { kind: 'table'; rows: Record<string, string>[] } | { kind: 'code'; text: string };
function parseBlocks(markdown: string): Block[];

// src/planning-repo/handlers/validation-strategy.ts — structured.validation.manual
interface ValidationManual { heading: string /* as written, e.g. 'Manual-Only Verifications' */; lead: Block[]; tail: Block[]; rows: ValidationManualRow[]; prose: Block[] | null }
interface ValidationManualRow { behavior: string; requirements: string[]; why: string; how: string; observed: string | null; outcome: string | null }

// src/planning-repo/handlers/ui-spec-contract.ts — structured.uiSpec.considerations
interface UiSpecConsiderations { elements: UiSpecElement[]; /* quote, intro, coverage, notes, comments */ }
interface UiSpecElement { key: string; code: string | null; name: string; kinds: string | null; rows: UiSpecConsiderationRow[] }
interface UiSpecConsiderationRow { cats: string[]; label: string /* category, e.g. 'overflow' */; status: 'covered' | 'backstop' | 'unresolved' | 'dismissed'; tag: string | null; target: string | null /* 'E1 selection bar' on a flat table */; note: string }

// src/presentation/references.ts
function buildReferenceRegistry(presentation: ProjectPresentation): ReferenceRegistry;
function resolveArtifactReference(registry: ReferenceRegistry, path: string): ReferencePreviewDto | null; // exact '.planning/...' path only; preview.url, preview.title

// src/web/views/plan-navigator.ts
type PlanTone = 'complete' | 'in-flight' | 'missing' | 'quiet' | 'active';
interface PlanChip { label: string; tone: PlanTone; hint?: string }
interface PlanTab { key: 'main' | 'side' | 'done'; label: string; count: number | null }
interface ComposedPlanTask { n; anchor; …; tabs: PlanTab[]; sections: { main: PlanSection[]; side: PlanSection[]; done: PlanSection[] }; sourceRow }
interface ComposedPlanNavigator { intro; head: { chips; triggers: { deps; files; requirements }; stats }; …; tasks: ComposedPlanTask[] }
function composePlanNavigator(input: ViewInput): ComposedPlanNavigator | null;

// src/web/views/plan-navigator-components.tsx
// PlanNavigatorView({ plan, onShowSource, initialTask?, initialModal? }) — tab state starts at 'main'; select(n) resets it to 'main';
// TaskDetail renders task.sections[active.key] where active = tabs.find(tab) ?? tabs[0].
// ResearchInline / ResearchBlocks come from ./research-briefing-components.tsx.
```

Test idioms to reuse:
- Building a presentation: `new PlanningRepository(new InMemoryPlanningFilesystem(files), '/project').load()` then `toProjectPresentation(snapshot)`. See test/server/project-presentation.test.ts `presentationOf`.
- Serving it: `createApp({ getSnapshot: () => snapshot }, true, '.')` with `app.request('/api/presentation')` to read an artifact's `key`, then `app.request('/api/documents?route=' + encodeURIComponent(key))`. See test/server/artifact-response.test.ts.
- Static markup: `renderToStaticMarkup(createElement(MemoryRouter, null, createElement(PlanNavigatorView, { plan, onShowSource: () => {}, initialTask })))`. See test/web/plan-navigator.test.ts.
</interfaces>
</context>

<tasks>

<task type="tracer">
  <name>Task 1 (tracer): End-to-end What to check for one human-verify task, covering its own steps and the VALIDATION rows matched by requirement</name>
  <files>src/presentation/manual-checks.ts, src/server/index.ts, src/web/views/manifest.ts, src/web/pages/artifact-page.tsx, src/web/views/plan-navigator.ts, src/web/views/plan-navigator-components.tsx, src/web/styles/globals.css, test/presentation/manual-checks.test.ts, test/web/plan-navigator-view-contract.test.ts</files>
  <read_first>src/web/views/plan-navigator.ts (sectionsOf, composeTask, composePlanNavigator), src/web/views/plan-navigator-components.tsx (SectionView, TaskDetail, PlanNavigatorView), src/server/index.ts (artifactResponse), src/web/pages/artifact-page.tsx (ArtifactDocumentResponse, viewInput useMemo), src/web/views/manifest.ts (ViewInput), src/presentation/references.ts (resolveArtifactReference), test/web/plan-navigator-view-contract.test.ts, test/server/derived-snapshot-isolation.test.ts (the artifactResponse region rule), and the quick-261006-iz6 block of src/web/styles/globals.css (start and end markers near lines 6000 and 7044)</read_first>
  <action>
Wire one path through every layer: plan projection, then presentation builder, then document response, then ViewInput, then composer tab, then panel markup. The path carries two groups, the task's own steps and the VALIDATION rows matched by requirement. Build the model, component and contract-test change in their final shape, so Task 2 only adds data to them.

1. Create src/presentation/manual-checks.ts. Use a header comment in the style of plan-context.ts that names quick-261016-ujo, its five standard sources, and T-ujo-02 (a URL only from resolveArtifactReference). The module is pure: it reads no files, imports nothing from Node and uses no regular expression at all, only indexOf / slice / split string operations. It may import types from src/server/project-presentation.ts and src/presentation/references.ts, `parseBlocks` and `Block` from src/planning-repo/handlers/context-brief.ts, and `resolveArtifactReference`. Export:
- `ManualCheckGroupKey` = 'task' | 'validation' | 'ui-spec' | 'read-first' | 'uat'
- `ManualCheckReference { text: string; title: string | null; url: string | null }`
- `ManualCheckItem { title: string; blocks: Block[]; note: string | null; requirements: string[] }`
- `ManualCheckGroup { key: ManualCheckGroupKey; label: string; source: ManualCheckReference | null; lead: string | null; items: ManualCheckItem[]; links: ManualCheckReference[] }`
- `TaskManualChecks { n: number; count: number; groups: ManualCheckGroup[] }`
- `PlanManualChecks { total: number; tasks: TaskManualChecks[] }`
- `buildPlanManualChecks(presentation: ProjectPresentation, registry: ReferenceRegistry, artifactPath: string): PlanManualChecks | null`

Behaviour of `buildPlanManualChecks`:
- Return null unless `presentation.artifacts` holds the path with kind 'plan' and a `structured.plan.tasks` array. Guard every field read with small `isRecord` / `stringOf` helpers, and treat a malformed task as one that needs no check.
- A task needs a check (QUJO-02) when its `type` is 'checkpoint:human-verify', or when `fields.verify.items` holds an item whose kind is 'human-check'.
- The task group has label "From this task". Its source is `{ text: '<plan file name> · Task <n>', title: <plan path>, url: null }`, where the file name is the text after the last '/'. Its items come only from that task's own fields, in this order:
  - "How to check it" (howToVerify blocks)
  - "Steps" (instructions blocks)
  - "What to do" (action blocks, only for checkpoint:human-verify)
  - one "Human check" per human-check verify item, as `parseBlocks(text)`
  - "Accept when" (acceptance, only for checkpoint:human-verify): its lead as a paragraph block, then its items as one unordered list block
- Task 2 adds "When you are done". Each item carries `note: null` and `requirements: []`. Skip any field that is absent or empty.
- The validation group (QUJO-03) comes from every artifact of kind 'validation' in the plan's own directory, meaning the same text before the last '/', in presentation order.
  - Read the plan's `requirements` frontmatter as an array of strings, or a comma-separated string, trimmed and upper-cased.
  - Keep the rows of `structured.validation.manual.rows` that share at least one ID with it, compared the same way.
  - Then drop a kept row when its `behavior` or `how` text names at least one task reference and none of them starts with this plan's `<phase>-<plan>-` prefix (from the plan file name before `-PLAN.md`). A task reference is a whitespace/punctuation-delimited token of exactly three dash-joined groups of digits, the first group optionally holding one '.' (e.g. `04-06-03`, `04.1-02-01`). Scan by hand — the builder stays regex-free (contract test). Requirement IDs like `DL-09` never qualify (letters). A row naming no task reference is kept.
  - Each item: title = behavior, blocks = `parseBlocks(how)`, note = why or null, requirements = the row's IDs as written.
  - Label "Manual checks for this plan's requirements". Source: `{ text: '<file name> · <manual.heading>', title: <path>, url: resolveArtifactReference(registry, path)?.url ?? null }`.
  - No plan requirements, no rows, a prose-only section, or no shared ID gives no group.
- Cap each group at 200 items and stop scanning beyond the cap (T-ujo-03).
- For each task that needs a check, `groups` = the task group (when it has items), then the plan-level groups in the fixed order validation, ui-spec, uat. Task 2 fills ui-spec, read-first and uat. Read-first sits between the task group and validation. Emit a TaskManualChecks entry only when `groups` is non-empty.
- `count` = the items across that entry's groups; links and lead do not count. `total` = the task-group items summed over all entries, plus the plan-level group items counted once. Return null when no entry is emitted.

2. In src/server/index.ts, inside `artifactResponse`, compute `manualChecks` from `buildPlanManualChecks(activeDerived.presentation, activeDerived.referenceRegistry, lookup.artifact.path)` inside a try/catch that yields null. Return it as a top-level `manualChecks` field beside `document`. Use only the `activeDerived` parameter, so the region rule in derived-snapshot-isolation.test.ts keeps holding (D-05). Add a one-line quick-261016-ujo comment.

3. In src/web/views/manifest.ts, add `manualChecks?: PlanManualChecks | null` to ViewInput. Import it as a type, with a doc comment naming quick-261016-ujo. In src/web/pages/artifact-page.tsx:
- add `manualChecks?: PlanManualChecks | null` to ArtifactDocumentResponse (type-only import)
- add `manualChecks: query.data.manualChecks ?? null` to the viewInput object, keeping the memo dependencies correct
Add no kind branch; view-page-contract caps that pattern.

4. In src/web/views/plan-navigator.ts:
- Extend the PlanTab key union with 'checks'.
- Export `REQUIREMENT_TONE: PlanTone = 'quiet'`.
- Export the composed types. `PlanCheckReference { text: string; title: string | null; url: string | null }`. `PlanCheckItem { title: string; blocks: Block[]; note: string | null; chips: PlanChip[] }`. `PlanCheckGroup { key: string; label: string; source: PlanCheckReference | null; lead: string | null; items: PlanCheckItem[]; links: PlanCheckReference[] }`. `ComposedPlanChecks { count: number; groups: PlanCheckGroup[] }`.
- Add `checks: ComposedPlanChecks | null` to ComposedPlanTask.
- Add a guard `readManualChecks(value: unknown)` in the style of `readPlan`. It returns the validated entries keyed by task number, drops any malformed entry, group or item, and never throws. It keeps a url only when it is a string that starts with a single '/' and not '//' (T-ujo-02). Anything else becomes null.
- Thread the matching entry into composeTask. When an entry has at least one group, prepend `{ key: 'checks', label: 'What to check', count: count > 0 ? count : null }` to that task's tabs. Each requirement becomes a chip `{ label: id, tone: REQUIREMENT_TONE }`.
- Use no regular expression, no literal tone outside the tone constants, and no parse-degradation tone. The contract test enforces all three.

5. In src/web/views/plan-navigator-components.tsx:
- Add `CheckReference({ reference }: { reference: PlanCheckReference })`. It renders a react-router Link with `className="source-link"`, written exactly as `to={reference.url}`, with the title on hover when url is set. Otherwise it renders a span `view-plan-nav-manual-path`. This becomes the file's only new Link.
- Add `ManualChecksPanel({ checks })`. The root is `view-plan-nav-manual`. Each group is a `section`, class `view-plan-nav-manual-group`, with `data-group={group.key}` and `aria-label={group.label}`. Inside it:
  - a head row `view-plan-nav-manual-head` with the label in the existing `view-plan-nav-key`, then the source through CheckReference
  - the lead as a muted paragraph `view-plan-nav-manual-lead`
  - the items in a list `view-plan-nav-manual-items`. Each item is `view-plan-nav-manual-item` with:
    - the title in `view-plan-nav-manual-title` through ResearchInline
    - the chips through the existing Chip
    - the blocks through ResearchBlocks
    - the note as a `view-plan-nav-manual-why` line, prefixed with "Why by hand: "
  - links as a list `view-plan-nav-manual-links` of CheckReference
  All document text goes through ResearchInline / ResearchBlocks or plain React text (T-ujo-01).
- In TaskDetail, when the active tab key is 'checks' and `task.checks` is set, render ManualChecksPanel inside `view-plan-nav-body` in place of the section list. Never index `task.sections` with 'checks'. The source row stays after it.
- In PlanNavigatorView, the tab state starts at the initially selected task's first tab key, falling back to 'main'. `select(n)` sets the tab to task n's first tab key, also falling back to 'main'. A task without checks behaves exactly as before, because TaskDetail already fell back to its first tab.

6. In src/web/styles/globals.css, add the panel rules inside the existing quick-261006-iz6 block, directly before its end marker, under a sub-comment `/* quick-261016-ujo: the What to check panel */`. So the plan contract's cssViolations check covers them.
- Tokens only: `--space-*` spacing, the `--fs-*` scale, and `--fw-medium` / `--fw-semibold`.
- Colour: hairlines on `--border-faint`, muted text on `--muted-foreground`, and the path in `--font-mono`.
- No corner rounding, no colour function or hex, no colour-mix, and no `--destructive` / `--warning`.
- No `--primary`. The shared `source-link` already owns its hover.
- Media overrides sit directly after their base rules.
- Match the rhythm of `.view-plan-nav-sec` / `.view-plan-nav-note`.

7. In test/web/plan-navigator-view-contract.test.ts:
- The Link test expects 3 Links: the existing two, plus one containing `to={reference.url}`.
- Add src/presentation/manual-checks.ts to the never-builds-a-regular-expression list.
- Keep every other assertion.

8. Create test/presentation/manual-checks.test.ts. Its header comment names quick-261016-ujo. It builds in-memory projects under `.planning/phases/04-demo/` and covers:
- Inline steps only. A checkpoint:human-verify task with how-to-verify and acceptance, and no VALIDATION in the directory, gives one entry with only the task group. Its item titles are exactly How to check it, Accept when.
- The studio-portal shape.
  - The plan has `requirements: [DL-04, DL-07, DL-08, DL-09]`. Task 3 is checkpoint:human-verify with gate blocking-human, an action, how-to-verify, acceptance and a read_first naming 04-UI-SPEC.md and 04-VALIDATION.md.
  - 04-VALIDATION.md carries the template header `| Behavior | Requirement | Why Manual | Test Instructions |` and four rows: "Production Cloudflare integrity/resume (04-01-02, BLOCKING)" for DL-09; "Native ZIP64 interoperability (04-07-01, BLOCKING)" for DL-06; "Browser/accessibility protocol (04-06-03, BLOCKING)" for "DL-01, DL-02, DL-04, DL-08"; and a template-shape row with no task reference for DL-07.
  - 04-UI-SPEC.md has a UI Considerations table with backstop rows; Task 2 asserts on it.
  - The validation group holds exactly the Browser/accessibility row and the DL-07 template-shape row, in source order, with their requirements and why. The 04-01-02 row is skipped despite sharing DL-09.
  - A row naming both another plan's task and this plan's task (e.g. "04-01-02, 04-06-03") is kept.
  - Its source text is "04-VALIDATION.md · Manual-Only Verifications" and its url equals the VALIDATION ArtifactDto key.
- The same VALIDATION with a plan whose requirements share no ID gives no validation group. A plan with no requirements also gives none, and so does a Manual-Only section of prose only.
- An auto task whose `<verify>` holds an automated command and a `<human-check>` gives an entry for that task, with one "Human check" item and no Accept when.
- Degradation, none of which throws:
  - a non-plan path gives null
  - a plan whose tasks are all plain auto tasks gives null
  - a hand-built ProjectPresentation whose plan ArtifactDto has `structured.plan` set to a string, or tasks holding junk, gives null
- Served end to end.
  - createApp over the studio-portal-shape snapshot. `/api/documents` for the plan returns a `manualChecks` that deep-equals `buildPlanManualChecks` on the same presentation and registry. A non-plan document returns `manualChecks: null`.
  - The payload goes through composePlanNavigator. Task 3's first tab is What to check.
  - Static markup with `initialTask: 3` contains "What to check", "Browser/accessibility protocol", "04-VALIDATION.md · Manual-Only Verifications", and `href="<the VALIDATION key>"`.
- The composer drops a crafted url of '//elsewhere' or 'javascript:x' to null, and renders that reference as plain text.
  </action>
  <verify>
    <automated>npx vitest run test/presentation/manual-checks.test.ts test/web/plan-navigator.test.ts test/web/plan-navigator-view-contract.test.ts test/server/artifact-response.test.ts test/server/derived-snapshot-isolation.test.ts test/web/view-page-contract.test.ts test/web/class-vocabulary.test.ts test/token-guard.test.ts test/web/css-source-order.test.ts test/portability.test.ts && npm run -s typecheck && npx eslint src/presentation/manual-checks.ts src/server/index.ts src/web/views/manifest.ts src/web/pages/artifact-page.tsx src/web/views/plan-navigator.ts src/web/views/plan-navigator-components.tsx test/presentation/manual-checks.test.ts test/web/plan-navigator-view-contract.test.ts</automated>
  </verify>
  <done>
- A PLAN document response carries `manualChecks`; every other document gets null.
- The studio-portal-shape fixture's Task 3 opens on a What to check tab. It lists its own steps and the VALIDATION rows that share a requirement and don't belong solely to another plan, with "04-VALIDATION.md · Manual-Only Verifications" linking to the VALIDATION page.
- Inline-only, no-match, auto-task human-check and degradation cases behave as specified.
- Existing plan-navigator tests still pass unchanged.
- The contract, vocabulary, token and portability suites pass, and the slice is committed.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add the UI-SPEC backstop rows, Read first links, the When you are done step and the UAT pointer</name>
  <files>src/planning-repo/handlers/plan-structure.ts, src/presentation/manual-checks.ts, test/plan-structure.test.ts, test/presentation/manual-checks.test.ts, test/__golden__/dense.json, test/__golden__/sparse-started.json</files>
  <read_first>src/planning-repo/handlers/plan-structure.ts (parseFiles, extractTask and its SOURCE_CHILD_TAGS handling), src/planning-repo/handlers/ui-spec-contract.ts (UiSpecConsiderationRow, UiSpecElement), test/plan-structure.test.ts (the source-children case near line 252), test/snapshot.golden.test.ts, and test/presentation/manual-checks.test.ts as Task 1 left it</read_first>
  <behavior>
    - plan-structure: a task `<read_first>` gives readFirst in source order, with no duplicates. The read_first may be comma-separated, or bulleted with backticks and " — note" tails, or start with a colon-ended lead line such as "Read these before starting:". Prose lines that contain a space are dropped. A leading '@' is stripped. `@` lines in the task's own `<context>` are added.
    - plan-structure: a task `<resume-signal>` gives resumeSignal as one trimmed line. A task without either child gives `readFirst: []` and `resumeSignal: null`, and sourceChildren is unchanged in both cases.
    - builder: the studio-portal shape gains a UI-SPEC group listing only the backstop rows. Each item title is the category, then " · ", then the element; blocks come from the resolution / reason. Its source text is "04-UI-SPEC.md · UI Considerations" with the UI-SPEC url.
    - builder: Task 3's read-first group links 04-UI-SPEC.md and 04-VALIDATION.md to their keys. An entry naming no known artifact, such as frontend/x.tsx, is absent. A bare sibling file name resolves to the sibling. A read_first naming the plan itself is absent.
    - builder: Task 3's task group ends with "When you are done", taken from its resume-signal.
    - builder: with no UI-SPEC in the directory, or a UI-SPEC with no backstop row, there is no ui-spec group.
    - builder: a directory holding 04-UAT.md gives each task with checks a 'uat' group: label "Phase checklist", lead "This phase also collects its hand checks in one checklist.", source linking the UAT file, no items. Counts are unchanged.
  </behavior>
  <action>
Write the behaviour cases first, in test/plan-structure.test.ts and test/presentation/manual-checks.test.ts, and see them fail. Then implement.

1. In src/planning-repo/handlers/plan-structure.ts, add two fields to PlanTask: `readFirst: string[]` and `resumeSignal: string | null`. In extractTask's returned object, put them directly after `files`. The golden JSON then gains lines without editing any existing line.
- Keep read_first and resume-signal exactly where they are in sourceChildren. This adds a reading of those children and moves nothing.
- readFirst is built from each read_first child body, then the task's own context child body:
  - from read_first, take every entry `parseFiles(dedent(body))` yields, after dropping lines that end with ':'
  - from context, take only lines starting with '@'
  - strip a leading '@' and a leading './'
  - keep an entry only when it contains no whitespace
  - de-duplicate in first-seen order and cap at 50
- resumeSignal is `oneLine(dedent(body))` of the first resume-signal child, or null when empty.
- Keep the file's rules: never throws, no regular-expression object, per-line operations only.

2. In src/presentation/manual-checks.ts:
- ui-spec group (QUJO-04). It comes from every kind 'ui-spec' artifact in the plan's directory, reading `structured.uiSpec.considerations.elements[].rows` where status is 'backstop'.
  - Item title: the row label capitalised, then " · ", then the element. The element is `row.target` when set, else the element's code and name joined by a space. Blocks: `parseBlocks(row.note)`. Note: null. Requirements: [].
  - Label "Screen states to check by hand". Source `{ text: '<file name> · UI Considerations', title: path, url }`.
- read-first group (QUJO-05), per task, placed after the task group.
  - For each readFirst entry, resolve with `resolveArtifactReference(registry, entry)` first. Only when the entry has no '/', fall back to `resolveArtifactReference(registry, '<plan directory>/' + entry)`.
  - Keep only resolved entries whose path is not the plan's own, de-duplicated by url.
  - Each link is `{ text: <file name>, title: <path>, url }`. Label "Read first", source null, no items. Omit the group when no link resolves.
- uat group (QUJO-06). For the first kind 'uat' artifact in the plan's directory, add `{ key: 'uat', label: 'Phase checklist', lead: 'This phase also collects its hand checks in one checklist.', source: { text: <file name>, title: path, url }, items: [], links: [] }`, last in every entry.
- Task group: append "When you are done" (`parseBlocks(resumeSignal)`) after Accept when, for checkpoint:human-verify tasks.
- Update the Task 1 studio-portal expectations to the full group list: task, read-first, validation, ui-spec.
- Extend the served end-to-end markup check: it should now contain "04-UI-SPEC.md · UI Considerations", a backstop row's title, and an `href` to the UI-SPEC key.

3. Regenerate the goldens with `npx vitest run test/snapshot.golden.test.ts -u`. Then read `git diff -- test/__golden__`: it must show only added `readFirst` / `resumeSignal` lines, and zero deleted lines. Fix the field order if any line changed.
  </action>
  <verify>
    <automated>npx vitest run test/plan-structure.test.ts test/plan-handler-guard.test.ts test/presentation/manual-checks.test.ts test/snapshot.golden.test.ts test/web/plan-navigator.test.ts test/web/plan-navigator-view-contract.test.ts && npm run -s typecheck && npx eslint src/planning-repo/handlers/plan-structure.ts src/presentation/manual-checks.ts test/plan-structure.test.ts test/presentation/manual-checks.test.ts && GOLDEN_NUMSTAT="$(git diff --numstat HEAD -- test/__golden__)" && test "$(printf '%s\n' "$GOLDEN_NUMSTAT" | awk '{d+=$2} END {print d+0}')" = 0</automated>
  </verify>
  <done>
- The studio-portal-shape Task 3 panel shows four groups: From this task, ending with When you are done; Read first, with two links; the matched VALIDATION rows (Browser/accessibility and the DL-07 template-shape row, not the 04-01-02 row); and the backstop rows only.
- A directory without a UI-SPEC shows no backstop group, and a directory with a UAT file shows the Phase checklist pointer.
- The goldens differ only by added readFirst / resumeSignal lines. All listed suites pass, and the change is committed.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Add the What to check control to the plan header and the task-list marker, record the convention, and run the full gates</name>
  <files>src/web/views/plan-navigator.ts, src/web/views/plan-navigator-components.tsx, test/web/plan-navigator.test.ts, docs/design-language.md</files>
  <read_first>src/web/views/plan-navigator.ts (composeTask's sub-line, composePlanNavigator's head), src/web/views/plan-navigator-components.tsx (the triggers row and onGoto in PlanNavigatorView), docs/design-language.md ("Language beyond names", lines 214 onward)</read_first>
  <behavior>
    - composePlanNavigator with a ViewInput whose manualChecks has entries for tasks 2 and 3: `head.checks` = { count: <total>, task: 2, title: 'Task 2 needs a person to check it — open what to check' }. Without manualChecks, or with a malformed one, `head.checks` is null.
    - A task with checks and count N > 0 ends its sub-line with "N to check". A task without checks keeps its sub-line exactly.
    - Static markup with checks contains a `view-plan-nav-trigger` button with `data-jump="checks"` whose text is "What to check" followed by the count. Without checks there is no such button.
  </behavior>
  <action>
Write the behaviour cases first in test/web/plan-navigator.test.ts, using a hand-built manualChecks on the file's existing synthetic plan, and see them fail. Then implement.

1. In src/web/views/plan-navigator.ts:
- Add `checks: { count: number; task: number; title: string } | null` to `ComposedPlanNavigator.head`.
- The task is the first task n with checks. The count is the validated `manualChecks.total`, or that task's own count when total is not a finite number.
- The title is "Task <n> needs a person to check it — open what to check". It is plain language and names only the plan's own task number.
- In composeTask, append `<count> to check` to the sub-line parts when the task has checks and count > 0.

2. In src/web/views/plan-navigator-components.tsx, render the control inside `view-plan-nav-triggers`, after the three modal triggers, when `head.checks` is set:
- a button with `className="view-plan-nav-trigger"`, `data-jump="checks"` and `title={head.checks.title}`
- its text is "What to check" followed by the count in `<b>`
- `onClick` calls the existing `onGoto(head.checks.task)`, so the task opens on its What to check tab (first tab, per Task 1), scrolls into view and flashes
It reuses the trigger styling, so no new CSS is needed.

3. In docs/design-language.md, add one bullet to "Language beyond names", tagged quick-261016-ujo. It says the PLAN page's What to check tab gathers only standard GSD sources:
- the task's own How to check it, Steps, What to do, Human check, Accept when and When you are done
- the VALIDATION Manual-Only rows that share a requirement ID with the plan; task IDs never match a row in, they only leave out a row that names solely other plans' tasks
- the UI-SPEC 🧪 backstop rows
- the task's Read first files, as links only
- the phase UAT file, as a pointer
It also records:
- each group names its file and section, and links back through the shared `source-link`
- requirement chips are `quiet`
- the panel takes no `--primary`, and never a parse-degradation tone
- absence is silent
- the header's What to check control is the plan view's counterpart of the cover's needs-a-human card
Edit no vocabulary table row: every new class is in the reserved `view-plan-` namespace.

4. Run the full gates. Fix anything they catch inside this plan's files.
  </action>
  <verify>
    <automated>npx vitest run test/web/plan-navigator.test.ts test/presentation/manual-checks.test.ts test/web/plan-navigator-view-contract.test.ts test/web/class-vocabulary.test.ts && npm test && npm run -s typecheck && npm run -s lint && npm run -s build</automated>
    <human-check>
- With the dashboard serving studio-portal (`node src/server/index.ts sftp://studio-ext/home/cinedise/studio-portal`, http://127.0.0.1:4173), open plan 04-06 in light and in dark.
- The header shows What to check. It opens Task 3 on its What to check tab, which lists the four task items, the one matched VALIDATION row (Browser/accessibility protocol — not the Cloudflare row, which belongs to plan 04-01) and the five UI-SPEC backstops.
- Read first links to 04-UI-SPEC.md and 04-VALIDATION.md, and each group's source link opens that file.
- Squared corners, readable at 390px, no horizontal overflow.
    </human-check>
  </verify>
  <done>
- The plan header opens the first task that needs a person to check it, on its What to check tab.
- Tasks with checks say how many in the task list.
- The convention is written down in docs/design-language.md.
- npm test, typecheck, lint and build all pass, and the change is committed.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target `.planning/` files → server parse | Author-written PLAN, VALIDATION, UI-SPEC and UAT text, table cells and paths are untrusted input |
| server JSON → browser render | Composed check text and reference URLs cross into the DOM and the router |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-ujo-01 | Tampering | ManualChecksPanel / CheckReference in plan-navigator-components.tsx | high | mitigate | Document text renders only through ResearchInline / ResearchBlocks or plain React text. The plan-navigator contract test keeps failing on the raw-HTML prop, a literal tone and any `href=` in the file. |
| T-ujo-02 | Spoofing | Read first and source links (manual-checks.ts, readManualChecks in plan-navigator.ts) | medium | mitigate | A URL exists only when resolveArtifactReference matches a known presentation artifact path exactly, or a bare sibling file name. Unresolved entries are dropped. The composer keeps a url only when it starts with a single '/'. The contract test pins the one new Link as `to={reference.url}`. |
| T-ujo-03 | Denial of Service | buildPlanManualChecks over large tables | low | mitigate | Linear passes over parser output that is already capped (VALIDATION 2000 rows, UI-SPEC 400 table rows). 200 items per group, 50 readFirst entries. No regular expression in the builder (contract test). |
| T-ujo-04 | Denial of Service | Malformed `structured` JSON on the document route | medium | mitigate | Every field read is guarded, buildPlanManualChecks never throws, artifactResponse wraps the call in try/catch yielding null, and readManualChecks drops malformed entries. The degradation tests cover string and junk plans. |
| T-ujo-05 | Tampering | Writes to the target `.planning/` | low | mitigate | The builder is pure and imports no filesystem module (portability test); no route writes. |
| T-ujo-06 | Information Disclosure | Linking files outside the target | low | accept | Links only reach artifacts already listed in the target's own presentation, which the dashboard already serves. |
| T-ujo-SC | Tampering | npm/pip/cargo installs | high | accept | This plan installs no package; existing dependencies only. |
</threat_model>

<verification>
- `npx vitest run test/presentation/manual-checks.test.ts` covers the five required cases: inline steps only; the studio-portal shape with requirement-matched rows and backstop rows; a template VALIDATION with no shared requirement; no UI-SPEC; an inline `<human-check>` in an auto task. It also covers the UAT pointer, degradation, and the served end-to-end slice.
- `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` pass.
- The golden diff contains only added readFirst / resumeSignal lines.
- Live sanity check on studio-portal 04-06 Task 3 matches the expectation in the objective (the Task 3 human-check).
</verification>

<success_criteria>
- Opening a plan whose task needs a person to check its work shows, on that task, every step from the standard GSD sources in one tab. Each step names its file and section and links back where the file is known.
- The same code works on any GSD project: no task-ID matching (task references only exclude other plans' rows), no studio-portal section names, and missing sources leave their group out silently.
- Assembly lives in src/presentation behind the repository boundary and is served with the document. React only composes and renders it.
</success_criteria>

<output>
Create `.planning/quick/261016-ujo-add-a-what-to-check-panel-for-manual-che/261016-ujo-SUMMARY.md` when done
</output>
