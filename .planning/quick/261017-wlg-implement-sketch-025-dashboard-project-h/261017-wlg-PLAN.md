---
phase: quick-261017-wlg
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/server/project-presentation.ts
  - src/presentation/dashboard-head.ts
  - src/presentation/dashboard.ts
  - src/web/pages/dashboard-page.tsx
  - src/web/styles/globals.css
  - docs/design-language.md
  - test/presentation/dashboard-head.test.ts
  - test/presentation/dashboard.test.ts
  - test/web/attention-row-contract.test.ts
  - test/web/strip-emoji.test.ts
  - test/web/visual-contract.test.ts
  - test/token-guard.test.ts
  - test/fixtures/dashboard/synthetic-PROJECT.md
  - test/fixtures/dashboard/synthetic-STATE.md
  - test/fixtures/dashboard/sparse-PROJECT.md
  - test/e2e/fixture-server.ts
  - test/e2e/dashboard-head.spec.ts
  - .planning/quick/261017-wlg-implement-sketch-025-dashboard-project-h/capture-side-by-side.mjs
autonomous: true
requirements: [QWLG-01, QWLG-02, QWLG-03, QWLG-04, QWLG-05, QWLG-06]

estimate:
  tokens: 110000
  raw_tokens: 110000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "QWLG-01: The reader's ProjectStateDto (src/server/project-presentation.ts stateOf) also carries milestoneName (STATE milestone_name), lastActivity (last_activity as YYYY-MM-DD, whether gray-matter gave a Date or a string; null otherwise), lastActivityDescription (last_activity_desc) and currentFocus (the text after the body's **Current focus:** line). Each is null when absent, blank or of the wrong type, and malformed STATE frontmatter never throws."
    - "QWLG-02: GET /api/dashboard carries a `head` built server-side by src/presentation/dashboard-head.ts (the page only maps fields to markup). Its name and tagline come from the PROJECT.md H1 split at the first spaced em or en dash. A title-less PROJECT.md, or no PROJECT.md at all, falls back to the shell header's projectDisplayName. The lead follows sketch 025's gen-data.mjs rules on the What This Is section: drop italic-only review notes and everything after the first ### heading; a leading bold sentence wins; otherwise sentences until the lead reaches 70 characters, never more than two; a lead over 160 characters is cut at its first ' — ' or ': '. Code spans are kept and emphasis markers dropped. The leads in corpus_facts come out exactly. A PROJECT.md with no What This Is section gives lead null, and the page shows nothing in its place."
    - "QWLG-03: The head's left side reads as R3b: the project name as the page's only h1, the tagline, the lead, then a Now block under a primary left rule. The Now block has a 'Now' label, the milestone · phase line ('v3.0 Live Read Surface · Phase 1', phase number without leading zeros), the phase title as an h2 and the status chip on its own line ('Executing' active; complete tone when STATE progress says every plan and phase is done). The phase title comes from the archived phase's roadmap name first, then STATE current_phase_name (title-cased when it is a slug), then the live phase's roadmap name, then 'Phase N'. The current phase resolves in the live milestone first, then in the archived milestone with the same version (labelore's own v1.1 phase 5 lives only in milestones/v1.1-phases). There is no position eyebrow, no project-state link and no PROJECT.md link. The value statement section of PROJECT.md is never read or shown. With no STATE.md, the Now block is absent."
    - "QWLG-04: The right side is one card, vertically centred on the left side, with each side at its own height. It reads, in order: the 'Next up' eyebrow; progress for the current phase's own plans only (done = has a SUMMARY.md, from phases/ or the milestone archive): a big percent, '<b>N</b> of M plans' (singular for one) and one bar segment per plan, done filled, the next plan shaded in-flight and the rest empty; 'No plans in this phase yet.' when the phase has none or does not resolve; then one short last-activity line ('Last 17 Oct — Quick task: compact discussion-log tables', with quick-task ids dropped, the clause cut at ' — ', ';' or an unclosed ' (', capped at 72 characters, and the year shown only when it differs from readAt's). The next step comes last: (1) when STATE is not done, the first plan with no SUMMARY.md in the current or a later live phase, as its id chip plus the whole first sentence of its objective, linking to the plan page; (2) 'Start the next milestone' when STATE says everything is done; (3) the Current focus clause when it does not start with 'Phase'; (4) 'Plan phase N' while the status mentions planning, else 'Continue phase N'. Blockers, gates, checkpoints and waits never appear in the card (they stay in Needs attention). With no STATE.md the card reads 'No STATE.md yet — nothing to report.'; when STATE gives no step at all it reads the page's existing 'No dependency-ready work is reported in the active milestone.'"
    - "QWLG-05: The progress panel, Needs attention and On deck render exactly as before. Every new class is a row in docs/design-language.md's Dashboard table. Removed dashboard-only names lose their rows and CSS, and the stale token-guard allowlist entry goes with them. A Language-beyond-names bullet records the head and its accent uses. Tokens only, squared corners, light and dark, no motion. The vocabulary, CSS source-order, token-guard (stale and consumption), visual, shell, empty-state and strip-emoji contracts pass. The G2-08 and strip-emoji contracts are rewritten honestly for the removed primary Next-up variant; nothing else is weakened."
    - "QWLG-06: test/e2e/dashboard-head.spec.ts passes through `npm run test:e2e` against read-only fixture servers on free ports in 5310-5319 (fixtures/dense served in place; temp projects for the synthetic and sparse files). It checks every corpus_facts value it renders, the centring at 1440px, stacking at 820px, no horizontal overflow at 420px in light and dark, one h1, squared corners and the absences. A Playwright side-by-side against sketch 025 R3b exists for fx, syn, sparse and lab in light at 1440px, fx and syn in dark, and fx at 820 and 390px; every visible deviation is fixed or recorded in the SUMMARY. vitest (apart from the two failures already present at the base commit), typecheck, lint and build pass."
  artifacts:
    - path: "src/presentation/dashboard-head.ts"
      provides: "buildDashboardHead(presentation): DashboardHead plus the pure, exported extractors (splitProjectTitle, whatThisIsLead, activityClause, activityDateLabel, displayPhaseNumber)"
      contains: "buildDashboardHead"
    - path: "src/server/project-presentation.ts"
      provides: "ProjectStateDto.milestoneName / lastActivity / lastActivityDescription / currentFocus"
      contains: "currentFocus"
    - path: "src/web/pages/dashboard-page.tsx"
      provides: "the project-head section (identity, Now block, Next up card) in place of the position hero"
      contains: "project-head"
    - path: "test/presentation/dashboard-head.test.ts"
      provides: "corpus_facts pinned through the real reader (fixtures + in-memory files) and the /api/dashboard route"
    - path: "test/e2e/dashboard-head.spec.ts"
      provides: "browser check of the head on dense, synthetic and sparse projects"
    - path: "test/e2e/fixture-server.ts"
      provides: "startFixtureServer({ target } | { files }) — read-only server on the first free 5310-5319 port"
      contains: "startFixtureServer"
  key_links:
    - from: "src/presentation/dashboard.ts"
      to: "src/presentation/dashboard-head.ts"
      via: "buildDashboardViewModel returns head: buildDashboardHead(presentation)"
      pattern: "head: buildDashboardHead"
    - from: "src/presentation/dashboard-head.ts"
      to: "src/server/project-presentation.ts"
      via: "reads presentation.state (new fields), presentation.milestones (live then archived phase), presentation.artifacts (PROJECT.md sections, plan objective titles)"
      pattern: "structured"
    - from: "src/web/pages/dashboard-page.tsx"
      to: "/api/dashboard"
      via: "the existing useQuery(['dashboard']) payload's head field"
      pattern: "view.head"
---

<objective>
Build sketch 025's winner, **R3b with the Lead text**, as the top of the dashboard. Today the dashboard opens on a position hero: a "Current position" eyebrow, the phase as the h1, a status chip with a "View project state" link, and a Recommended action / Next up card that can show a blocker or a human gate. On labelore itself it reads "Phase 5 / Unavailable": the phase lives only in the v1.1 archive, and STATE has no current_phase_name. The new head opens on the project: its name (from PROJECT.md's H1, split into name and tagline), a short What This Is lead, and a "Now" block with milestone · phase, the phase title and the status chip on its own line. Beside it, centred on it, one card shows Next up: this phase's own plan progress (one bar segment per plan, the next one shaded), the last activity in one short line, and the next step in full at the end. Core Value is not shown. Blockers and gates stay in Needs attention.

Purpose: "Open the dashboard on a GSD project and immediately know where the work stands." The project now leads, the position steps down into the same section, and the next step is a real next step, not an interrupt. This is the first of several dashboard additions, so only the head changes. The progress panel, Needs attention and On deck stay as they are.

Output: the server-side head view model (reader fields + src/presentation/dashboard-head.ts) behind /api/dashboard, the new section in dashboard-page.tsx with its CSS and design-language rows, unit and route tests pinned to the sketch's own data, an e2e spec, and a side-by-side capture against the sketch.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@.planning/sketches/025-dashboard-project-head/README.md
@.planning/sketches/025-dashboard-project-head/gen-data.mjs
@docs/design-language.md
@src/presentation/dashboard.ts
@src/web/pages/dashboard-page.tsx

Read on demand (ranges named in interfaces): `.planning/sketches/025-dashboard-project-head/index.html` (R3b CSS 110-200, JS 279-334; it is the canonical visual target), `src/server/project-presentation.ts`, `src/web/styles/globals.css`, `test/presentation/dashboard.test.ts` (helpers 1-140), `test/server/deep-links.test.ts` / `test/server/remote-source.test.ts` (the `createApp(...).request('/api/dashboard')` idiom), `test/e2e/learnings-fixture-server.ts` and `test/e2e/learnings-page.spec.ts` (the fixture-server and e2e idiom), `.planning/quick/261017-k45-build-sketch-024-e-round-2-as-the-learnings-page-view-use-pl/capture-side-by-side.mjs` (the capture idiom).

<planner_notes>
Discretion decisions (record each in the SUMMARY as built):
1. A missing What This Is section is silent: the lead is simply absent. The sketch printed "PROJECT.md has no What This Is section." as a comparison aid, but docs/design-language.md says absence is silent everywhere except a genuinely needed absence surface (D-06). The card's two absence lines stay, because the card would otherwise be empty, and the README requires "a phase with no plans yet says so".
2. A plan next step links to the plan page, as the old Next up did. The other step kinds are not links.
3. "of 1 plan" uses the singular. The sketch always said "plans".
4. The tagline is everything after the first spaced dash, so later dashes are kept. The sketch dropped them.
5. The head resolves its own current phase: live milestone first, then the archived milestone with the same version. `currentPhaseOf` (progress panel, attention, next work) is untouched, so those sections behave exactly as before.
6. The card reuses the documented `.immediate-work` shell (border, 3px primary top rule, card veil, fluid padding). Its offset box-shadow is dropped, because R3b's card has none. `.position-hero` CSS stays, since the CONTEXT brief still uses it.
7. The year shows in the date label only when it differs from readAt's year. The sketch hard-coded 2026.
8. `DashboardViewModel.current` and `.next` are kept unchanged. Tests pin them and On deck reads `next.previews`.
</planner_notes>

<interfaces>
Seams read at planning time:
- **Route**: src/server/index.ts:145 `app.get('/api/dashboard')` returns `{ ...buildDashboardViewModel(derived.presentation), loadStatus }`. Nothing changes there; the VM gains `head`.
- **ProjectStateDto** (src/server/project-presentation.ts:33) is built only by `stateOf(project)` (:238), from the domain STATE artifact (`artifact.frontmatter` raw: gray-matter gives an unquoted `last_activity: 2026-10-17` as a Date; `artifact.body` is the body after frontmatter). `asString`/`asNumber`/`asRecord` helpers sit at :198-213. Two test literals construct it: test/presentation/dashboard.test.ts:106-120 and test/web/attention-row-contract.test.ts:115-123. Add the four new fields there as null. ProjectPresentation itself does not change shape, because 20 test literals build it.
- **Presentation data the head reads**: `presentation.projectName` (= PROJECT.md `deriveTitle`, i.e. frontmatter title, else the first `# ` heading, else the file path; or basename(rootPath) with no PROJECT.md; see src/planning-repo/assemble.ts:229). `presentation.rootPath`. `presentation.artifacts` (ArtifactDto, JSON-normalised): the PROJECT.md artifact has `kind === 'project'`, `location === 'root'` and `structured.sections: { heading, body }[]` (## level, body trimmed, ### kept inside). A plan artifact's `structured.plan.objective.title` is the first sentence of the objective lead as plain text (src/planning-repo/handlers/plan-structure.ts:110, no trailing full stop), found by `path === PlanDto.path`. `presentation.milestones` (MilestoneDto `{ version, archived, phases: PhaseDto[] }`; PhaseDto `{ identity.number, name, archived, plans: PlanDto[] }`; PlanDto `{ id, key (plan route), path, description, summary | null }`).
- **Probed at planning time**: labelore's own presentation has only archived milestones (v1.0, v1.1). STATE phaseNumber is "5" and phaseName is null, and the v1.1 archived phase 05 "Per-Type Document Views" has 6 plans with 6 summaries. The dense fixture has archived v1.0 and v2.0, plus live v3.0 "Live Read Surface" with phase 01 (01-01+, 01-02+) and phase 02 (02-01, no summary). A project with only PROJECT.md loads with `loadStatus.status === 'ok'` and `state === null`.
- **Reusable helpers**: `projectDisplayName(projectName, rootPath)` (src/presentation/shell-header.ts:21, server-importable). `samePhaseNumber` is a private copy in both dashboard.ts and project-presentation.ts, so copy it again rather than export. `tokenizeInline(text)` (src/web/views/inline-markdown.ts:123) gives code/strong/em/ref/text tokens; the page-local renderer idiom is `NoteTokens` in src/web/components/clean-tree.tsx:24-46. `stripEmoji` / `stripMarkdown` come from src/web/pages/strip-emoji.ts.
- **Page today** (src/web/pages/dashboard-page.tsx 127-161): `section.position-hero > div.position-copy` (eyebrow with MapPin, `p.milestone-label`, `h1#current-position-heading` with a span, `div.position-meta` with the status chip and SourceLink) + `aside.immediate-work` (eyebrow, `h2#immediate-work-heading` Next up, `NextWork primary` or the `quiet-state` sentence). `SourceLink` stays: the progress panel and attention rows use it. `NextWork` without `primary` stays for On deck.
- **Contract tests that read dashboard-page.tsx or its CSS**:
  - test/web/shell-contract.test.ts:73: contains 'Next up', 'phaseMode', 'attention-pagination', 'Previous page'.
  - test/web/empty-state-contract.test.ts:64: contains the three dashboard sentences, including 'No dependency-ready work is reported in the active milestone.'.
  - test/web/strip-emoji.test.ts:43-53: `stripEmoji(rawItem.description)` lives in NextWork's primary branch, so Task 2 rewrites this test.
  - test/web/visual-contract.test.ts:235-264 (G2-08): asserts `.next-primary p` and `.next-preview p` clamps, and that `<p>{item.description}</p>` is kept untruncated. Task 2 rewrites the first two for previews only.
  - visual-contract :310-330: dashboard data-tone literals must be active, complete or quiet.
  - visual-contract :409-414: this page never renders the HTML small-print element.
  - test/web/invalid-project-contract.test.ts, test/web/loading-state-contract.test.ts (the `dashboard-loading` skeleton): untouched.
- **CSS today** (src/web/styles/globals.css):
  - min-width list at :358-389 includes `.position-copy`.
  - `.position-hero` :904 (keep; the CONTEXT brief uses it).
  - `.milestone-label` :913, `.position-copy h1` :922, `.position-copy h1 span` :932 and `.position-meta` :942 are dashboard-only; remove them.
  - `.immediate-work` :1002 (shared border list), :1014 (padding, top rule, box-shadow), :1020 (h2 list).
  - `.next-primary*` :1030-1075.
  - `@media (max-width: 62rem)` at :2034 holds `.position-hero, .dashboard-grid { 1fr }` and `.immediate-work { max-width: 38rem }`. `@media (max-width: 42rem)` holds `.position-copy h1 { font-size: var(--fs-display-narrow) }` at :2130.
  - `--fs-display-narrow` has exactly one consumer (that narrow rule). The token-guard consumption test needs it re-consumed by the project-name narrow rule.
  - test/token-guard.test.ts:561-566 allowlists `.position-copy h1 span { font-size: max(0.2em, var(--fs-1)) }`. The stale-entry test fails if the rule goes and the entry stays.
  - New base rules must sit before both media blocks (test/web/css-source-order.test.ts).
- **Tokens available**:
  - colour: `--primary`, `--primary-tint`, `--in-flight-fill`, `--muted`, `--muted-foreground`, `--foreground`, `--border`, `--card-veil`, `--code-veil`
  - type: `--font-heading`, `--font-mono`, `--fs-1`…`--fs-7`, `--fs-fluid-1`…`--fs-fluid-4`, `--fs-display-1`, `--fs-display-3`, `--fs-display-narrow`
  - line height, tracking, weight: `--lh-display`, `--lh-none`, `--lh-tight`, `--lh-snug`, `--lh-relaxed`, `--ls-tighter`, `--ls-tight`, `--ls-wider`, `--ls-widest`, `--fw-medium`, `--fw-semibold`
  - spacing: `--space-0-5`…`--space-10`, `--space-fluid-1`…`--space-fluid-14`

  No literal px, rem or em in spacing or type declarations. Grid track sizes such as `.position-hero`'s `minmax(18rem, 0.75fr)` already pass.
- **Pre-existing failures at the base commit** (confirmed at planning time; out of scope, never "fixed" here): test/token-guard.test.ts "has zero violations outside the token blocks in the real stylesheet" (exactly three older rules: .view-plan-nav-body code, .view-plan-nav-checks li::before, .view-ui-review-found-card code) and test/presentation/coverage.test.ts "renders the matrix before both complete documents in the plan pair page". Baseline: typecheck and `npm run lint` are clean.
- **e2e harness**: playwright.config.ts always starts its own server on 4199 (and 4198 when ~/studio-portal/.planning exists). Ports 4173 and 4174 are the user's running instances and are never touched. Fixture and scratch servers use the first free port in 5310-5319 only (bind probe on 127.0.0.1). Theme is set with `page.addInitScript((v) => localStorage.setItem('labelore-theme', v), theme)`.
</interfaces>

<corpus_facts>
Every value comes from sketch 025's own data.js / gen-data.mjs rules, or from reading the source files at planning time. It is never taken from the code this plan writes. Copy `.planning/sketches/025-dashboard-project-head/{synthetic-PROJECT.md,synthetic-STATE.md,sparse-PROJECT.md}` byte-for-byte into test/fixtures/dashboard/ (tests never read .planning/sketches).

| Key | Project | name / tagline | lead |
|---|---|---|---|
| fx | fixtures/dense | Dense Fixture Project / — | A synthetic, hand-authored GSD project three milestones deep, carrying every artifact type `gsd-core`'s templates define plus several it does not. |
| started | fixtures/sparse-started | Sparse Started Fixture / — | A GSD project one step further along than `sparse-empty`. |
| empty | fixtures/sparse-empty | Sparse Empty Fixture / — | A minimal, freshly-initialized GSD project used to prove the read layer survives a project with nothing to parse yet. |
| syn | test/fixtures/dashboard synthetic PROJECT + STATE (in-memory or temp dir) | Harbor Ledger / Customs Filing Automation | A batch service and review console that turns a broker's shipment manifests into customs filings for the `ace-gateway` submission API. |
| sparse | test/fixtures/dashboard sparse-PROJECT.md only | Untitled Spike / — | null |
| lab | labelore's own .planning (side-by-side only; live data) | Labelore / — | Labelore is a read-only web dashboard that makes a GSD `.planning/` directory legible. |

| Key | Now line · title · chip (tone) | plans → percent, counts | last (readAt in 2026) | step |
|---|---|---|---|---|
| fx | v3.0 Live Read Surface · Phase 1 · Identity Slice · Executing (active) | 01-01 done, 01-02 done → 100%, 2 of 2 plans | 22 Aug — Phase 1 hardening task committed | plan 02-01 "Deliver a minimal end-to-end tracer for the transport layer, calling into Phase 1's identity resolver", url = that PlanDto.key |
| started | v1.0 · Phase 1 · First Slice · Planning (active) | 01-01 next → 0%, 0 of 1 plan | 22 Aug (no text) | plan 01-01 "Deliver a minimal end-to-end tracer for the fixture project's first slice" |
| empty | (no line, no title) · Planning (active) | [] → No plans in this phase yet. | null | focus "Fixture authoring" |
| syn | v2.0 Gateway Corrections · Phase 3 · Correction Reconciliation · Planning (active) | [] → No plans in this phase yet. | 14 Oct — Phase 3 context gathered | phase "Plan phase 3" (no id, no url) |
| sparse | now null | card: No STATE.md yet — nothing to report. | — | — |
| arch | v1.1 Legible Documents · Phase 5 · Per-Type Document Views · Awaiting next milestone (complete) | 05-01 done, 05-02 done → 100%, 2 of 2 plans | 17 Oct — Quick task: compact discussion-log tables | milestone "Start the next milestone" |

`arch` is an in-memory, labelore-shaped project. Write the files in the dense fixture's archived v2.0 layout (fixtures/dense/.planning/milestones/v2.0-ROADMAP.md `### Phase 1: Legacy Ingest` headings, `milestones/v2.0-phases/<NN-slug>/<NN-MM>-PLAN.md` + `-SUMMARY.md`). The files are:
- STATE.md: milestone v1.1, milestone_name Legible Documents, current_phase 05, status `Awaiting next milestone`, progress 1/1 phases and 2/2 plans, last_activity 2026-10-17, last_activity_desc `Completed quick task 261016-2j6 (compact discussion-log tables)`.
- milestones/v1.1-ROADMAP.md: `### Phase 5: Per-Type Document Views`.
- milestones/v1.1-phases/05-per-type-document-views/: 05-01 and 05-02, each a PLAN and a SUMMARY.

Probe that the PhaseDto resolves before pinning.

Clause facts (activityClause): `Completed quick task 261016-2j6 (compact discussion-log tables)` → `Quick task: compact discussion-log tables`; `Phase 3 context gathered — five decisions locked, two left open` → `Phase 3 context gathered`; `Phase 04 execution resumed (wave continue)` → unchanged (a closing parenthetical is kept); `Completed quick task 260719-q1z: fixed env-file perms + stale on-box compose on both prod VMs` → `Quick task: fixed env-file perms + stale on-box compose on both prod VMs`; `Shipped the reconciliation worker; two follow-ups remain` → `Shipped the reconciliation worker`; `An extremely long activity description that keeps going well past the seventy-two character limit for sure` → `An extremely long activity description that keeps going well past the…`.

Lead facts beyond the corpus: `**Bold lead here.** Then more text follows here.` → `Bold lead here.`; `Short one. Second sentence here that adds detail to make it longer than seventy chars.` → both sentences; a first paragraph that is an italic note (`*Reviewed at v1.0 close.*`) is skipped; text after a `### ` heading is never used.

Date label: `2026-08-22` with readAt 2026-… → `22 Aug`; with readAt 2027-… → `22 Aug 2026`.
</corpus_facts>

- security: see `<threat_model>` (ASVS level 1, block on high).
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Project name, lead and Now block, end to end — reader fields → dashboard-head.ts → /api/dashboard → the new head section (dense fixture in the browser)</name>
  <files>src/server/project-presentation.ts, src/presentation/dashboard-head.ts, src/presentation/dashboard.ts, src/web/pages/dashboard-page.tsx, src/web/styles/globals.css, docs/design-language.md, test/token-guard.test.ts, test/presentation/dashboard-head.test.ts, test/presentation/dashboard.test.ts, test/web/attention-row-contract.test.ts, test/fixtures/dashboard/synthetic-PROJECT.md, test/fixtures/dashboard/synthetic-STATE.md, test/fixtures/dashboard/sparse-PROJECT.md, test/e2e/fixture-server.ts, test/e2e/dashboard-head.spec.ts</files>
  <behavior>
    - fx through the real reader (`new PlanningRepository(await fromDirectory(root), root)` → toProjectPresentation → buildDashboardViewModel): head.name 'Dense Fixture Project', tagline null, the fx lead, now `{ milestone: 'v3.0 Live Read Surface', phase: '1', title: 'Identity Slice', status: 'Executing', done: false }`.
    - syn (in-memory from test/fixtures/dashboard): name 'Harbor Ledger', tagline 'Customs Filing Automation', the syn lead, now milestone 'v2.0 Gateway Corrections', phase '3', title 'Correction Reconciliation', status 'Planning'.
    - started, empty: the corpus leads. empty gives now `{ milestone: null, phase: null, title: null, status: 'Planning' }`.
    - sparse: name 'Untitled Spike', lead null, now null.
    - arch: now.title 'Per-Type Document Views' (resolved from the archived milestone), phase '5', milestone 'v1.1 Legible Documents', done true.
    - Degradation: only STATE.md (no PROJECT.md) gives name 'project' (basename of the in-memory root '/project'). A PROJECT.md with no `# ` heading gives the same fallback, never the file path. Malformed STATE YAML gives now null. A non-string milestone_name or current_phase_name gives null for that piece. None of these throw.
    - Lead facts from corpus_facts (bold lead, two short sentences, italic note skipped, ### cut, the started 160-character cut).
    - Reader: stateOf gives `milestoneName`, `lastActivity: '2026-08-22'` (Date input), `lastActivityDescription`, `currentFocus: 'Phase 2 — Transport Layer'` for fx, and all four null for a STATE with none of them.
    - Route: `createApp({ getSnapshot: () => snapshot }, true, <tmp staticRoot>).request('/api/dashboard')` on the fx snapshot answers 200 with `head.name === 'Dense Fixture Project'`.
  </behavior>
  <action>
**Reader (QWLG-01).** In src/server/project-presentation.ts, extend `ProjectStateDto` with four fields after `status`:
- `milestoneName: string | null`: from `milestone_name`, via asString and trimmed, null when blank.
- `lastActivity: string | null`: YYYY-MM-DD. A Date becomes its ISO date. A string counts only when it starts with a `\d{4}-\d{2}-\d{2}` date, and keeps its first 10 characters. Anything else is null.
- `lastActivityDescription: string | null`: from `last_activity_desc`, a string, trimmed, null when blank.
- `currentFocus: string | null`: line-scan `artifact.body` for the first line whose trimmed text starts with `**Current focus:**` and take the trimmed remainder (null when empty). Line scanning follows T-01-11; no whole-document regex.

Fill them in `stateOf`. Add the four fields as `null` in the two test literals named in interfaces.

**Head module (QWLG-02, QWLG-03).** Create src/presentation/dashboard-head.ts. It is pure and has no node:* or React imports; it type-imports from ../server/project-presentation.ts the way dashboard.ts does. Open it with a header comment naming the threat mitigations (T-wlg-02, T-wlg-03): caps of MAX_SECTION_CHARS 20000, MAX_PARAGRAPH_CHARS 2000 and MAX_ACTIVITY_CHARS 400, applied before any regex; linear regexes only; total functions that never throw.

Export these interfaces:
- `DashboardHeadNow { milestone: string | null; phase: string | null; title: string | null; status: string | null; done: boolean }`
- `DashboardHead { name: string; tagline: string | null; lead: string | null; now: DashboardHeadNow | null }`. Task 2 adds `next`.

Export these functions:
- `splitProjectTitle(title, rootPath)`:
  - Use `projectDisplayName(null, rootPath)` when the title is null, blank, or equal to/ending with `PROJECT.md` (deriveTitle fell back to the path).
  - Otherwise split at the first `/\s+[—–]\s+/`. The name is the text before the dash; the tagline is all the text after it, or null.
- `whatThisIsLead(sectionBody)`: port gen-data.mjs `paragraphs`, `sentences` and `lead` exactly (rules in the must_haves; code spans masked while splitting sentences). Then remove `**`, `*` and `_` emphasis markers outside code spans, and keep backticks. Return null for no paragraphs.
- `displayPhaseNumber(raw)`: '05' → '5', '02.1' → '2.1'; a non-numeric value as-is.
- `buildDashboardHead(presentation)`.

Rules inside `buildDashboardHead`:
- **lead**: take the PROJECT.md section from the root `project` artifact's `structured.sections` whose heading matches `/^what this is\b/i`; narrow defensively, since the data is JSON. No other PROJECT.md section is read.
- **now**: null when `presentation.state` is null, or when milestone, phase, title and status all come out null.
  - milestone: `[state.milestone, state.milestoneName]`, filtered and joined with a space, or null.
  - phase: displayPhaseNumber(state.phaseNumber).
  - status: the first letter capitalised.
  - done: `totalPlans > 0 && completedPlans >= totalPlans && completedPhases >= totalPhases`, null-safe (any null gives false).
- **Phase resolution** (exported helper `headPhaseOf`, reused in Task 2): version = trimmed state.milestone or null. Look for a non-archived milestone with that version first, then an archived one with the same non-null version. In it, find the phase by numeric-aware number equality (copy samePhaseNumber).
- **title cascade**: archived phase's name → STATE phaseName (title-case each hyphen word when it matches `^[a-z0-9-]+$`) → live phase's name → `Phase <phase>` → null. Strip a leading emoji/✅ from roadmap-derived names, the same as roadmap-page does for milestone names.

In src/presentation/dashboard.ts, add `head: DashboardHead` to DashboardViewModel and `head: buildDashboardHead(presentation)` to the returned object. Change nothing else there.

**Page (QWLG-03, tracer slice).** In src/web/pages/dashboard-page.tsx, replace the position-hero section with `section.project-head` (aria-labelledby the h1's id) containing:
- `div.project-head-copy`, holding:
  - `div.project-identity`: `h1` (id `project-name-heading`) with head.name; `p.project-tagline` only when a tagline exists; `p.project-lead` only when a lead exists.
  - `div.project-now` only when head.now exists: `span.project-now-label` "Now"; `p.project-now-line` with the milestone in `<b>` and ` · Phase N` (each part only when present); `h2` with the title when present; the status chip on its own line (`span.status-chip` with CircleDot, `data-tone={now.done ? 'complete' : 'active'}`) when status is present.
- The existing `aside.immediate-work`, kept verbatim as the right column for now. Task 2 replaces its contents.

Lead rendering: run the lead through `tokenizeInline(stripEmoji(lead))` and a page-local token renderer in the clean-tree idiom. Code tokens become `<code>`. Strong and em are flattened to their children, with no wrapper element. Text and ref tokens are plain text. Every head string is a React text node; no raw-HTML prop anywhere (T-wlg-01). Apply stripEmoji to name, tagline, milestone and title.

Remove the position eyebrow, the MapPin import, the milestone label and the project-state SourceLink from the head. Keep `SourceLink` itself, since the progress panel and attention rows use it. The h1 is the only h1 in main.

**CSS.** Add the new rules immediately after `.position-hero` (before both media blocks), following R3b in the sketch's index.html (`.r3`, `.r3b`, `.b1-id`, `.b-name`, `.b-tag`, `.b-what`, `.r3b-now`, `.r2-line`, `.r2-phase h2`):
- `.project-head`: grid `minmax(0, 1.25fr) minmax(19rem, 0.9fr)`, gap `--space-fluid-9`, `align-items: center`. No bottom rule or padding.
- `.project-head-copy`: grid, gap `--space-8`, `align-content: start`.
- `.project-identity`: grid, gap `--space-5`.
- `.project-identity h1`: margin 0, `--fs-display-3`, `--fw-semibold`, `--ls-tighter`, `--lh-display`, overflow-wrap anywhere.
- `.project-tagline`: muted, `--font-heading`, `--fs-3`, `--ls-wider`, uppercase.
- `.project-lead`: muted, `--fs-fluid-1`, `--lh-relaxed`, a max-width in the `.lede` idiom (sketch 46ch), overflow-wrap anywhere.
- `.project-lead code`: `--font-mono`, a token type step (no em), `--code-veil` background, `--space-1` inline padding.
- `.project-now`: grid, gap `--space-2-5`, `justify-items: start`, padding-left `--space-4`, a 2px `--primary` left border.
- `.project-now-label`: the sketch kicker metrics (`--font-heading`, `--fs-1`, `--fw-semibold`, `--ls-wider`, uppercase) in `--primary`.
- `.project-now-line`: muted, `--font-mono`, `--fs-2`, `--ls-wider`, uppercase. Its `b` is in the foreground colour, `--fw-medium`.
- `.project-now h2`: margin 0, `--fs-display-1`, `--fw-semibold`, `--ls-tight`, `--lh-tight`, overflow-wrap anywhere.

Media blocks:
- In the 62rem block, add `.project-head` to the one-column rule.
- In the 42rem block, replace `.position-copy h1` with `.project-identity h1` (keeps `--fs-display-narrow` consumed).
- In the :358 min-width list, replace `.position-copy` with `.project-head, .project-head-copy`.

Delete `.milestone-label`, `.position-copy h1`, `.position-copy h1 span` and `.position-meta`, and delete the matching test/token-guard.test.ts allowlist entry (`.position-copy h1 span`). Keep `.position-hero`.

**Docs.** In docs/design-language.md's `### Dashboard` table, keep alphabetical order:
- Add rows for `project-head`, `project-head-copy`, `project-identity`, `project-lead`, `project-now`, `project-now-label`, `project-now-line` and `project-tagline` (Surface: Dashboard).
- Remove the rows for `milestone-label`, `position-copy` and `position-meta`.
- Change `position-hero`'s note to say the CONTEXT brief now uses it alone, since the dashboard head replaced it (quick-261017-wlg).

**Fixtures and tests.**
- Copy the three sketch files byte-for-byte into test/fixtures/dashboard/.
- Write test/presentation/dashboard-head.test.ts with every behavior bullet. Load fixtures with `fromDirectory` (test/helpers/from-directory.ts) or `new InMemoryPlanningFilesystem(files)` + `PlanningRepository(fs, '/project')` (test/server/project-presentation.test.ts idiom), and pin readAt in the snapshot.

**e2e harness.**
- Write test/e2e/fixture-server.ts, a helper and not a spec. Model it on learnings-fixture-server.ts, which stays untouched. Export `startFixtureServer(options: { target: string } | { files: Array<[from: string, to: string]> }): Promise<{ base: string; dir: string; stop(): Promise<void> }>`:
  - `target` serves an existing directory in place (read-only; it is never written).
  - `files` copies into an mkdtemp project and removes it on stop.
  - Port: the first free one in 5310-5319.
  - Readiness: poll /api/dashboard for 90 s.
  - Stop: SIGTERM, then SIGKILL after 3 s, plus a process exit hook.
- Start test/e2e/dashboard-head.spec.ts with a dense describe (light theme): main has one h1, 'Dense Fixture Project'; the lead's text and its `code` 'gsd-core'; `.project-now` shows 'Now', 'v3.0 Live Read Surface · Phase 1', h2 'Identity Slice' and a chip 'Executing'; main contains none of the old hero's texts 'Current position', 'View project state' or 'Open PROJECT.md' (rendered-DOM assertions in the spec, not source greps).
  </action>
  <verify>
    <automated>npx vitest run test/presentation/dashboard-head.test.ts test/presentation/dashboard.test.ts test/web/attention-row-contract.test.ts test/server/project-presentation.test.ts test/web/class-vocabulary.test.ts test/web/css-source-order.test.ts test/web/visual-contract.test.ts test/web/shell-contract.test.ts test/web/empty-state-contract.test.ts test/web/strip-emoji.test.ts test/web/invalid-project-contract.test.ts test/web/loading-state-contract.test.ts && npx vitest run test/token-guard.test.ts -t 'no stale entries|consumes every defined' && test "$(npx vitest run test/token-guard.test.ts 2>&1 | grep -c -e '\.project-' -e '\.immediate-work')" = 0 && test "$(grep -c 'dangerouslySetInnerHTML' src/web/pages/dashboard-page.tsx)" = 0 && npm run -s typecheck && npm run test:e2e -- test/e2e/dashboard-head.spec.ts</automated>
  </verify>
  <done>
- /api/dashboard carries `head` with name, tagline, lead and now, built server-side.
- On fixtures/dense the browser shows the project name as the only h1, the lead with its code span, and the Now block (line, h2, chip). The old hero's eyebrow and links are gone, and the right column still shows today's Next up.
- Every behavior bullet passes; the named contracts, the token-guard stale and consumption tests and typecheck pass; and no new token-guard violation exists.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The Next up card — this phase's plan progress, last activity and the next step, replacing the old Recommended action card</name>
  <files>src/presentation/dashboard-head.ts, src/web/pages/dashboard-page.tsx, src/web/styles/globals.css, docs/design-language.md, test/presentation/dashboard-head.test.ts, test/web/strip-emoji.test.ts, test/web/visual-contract.test.ts, test/e2e/dashboard-head.spec.ts</files>
  <behavior>
    - fx: next.plans `[{ id: '01-01', done: true, next: false }, { id: '01-02', done: true, next: false }]`, completed 2, percent 100, last `{ date: '2026-08-22', dateLabel: '22 Aug', text: 'Phase 1 hardening task committed' }`, step `{ kind: 'plan', id: '02-01', title: 'Deliver a minimal end-to-end tracer for the transport layer, calling into Phase 1\'s identity resolver', url: <02-01 PlanDto.key> }`.
    - started: plans `[{ id: '01-01', done: false, next: true }]`, completed 0, percent 0, last text null, step plan 01-01 with the corpus title.
    - empty: plans [], percent null, last null, step `{ kind: 'focus', id: null, title: 'Fixture authoring', url: null }`.
    - syn: plans [], last `{ dateLabel: '14 Oct', text: 'Phase 3 context gathered' }`, step `{ kind: 'phase', title: 'Plan phase 3', id: null, url: null }`. With status 'executing' and the same data, the step is 'Continue phase 3'.
    - arch: plans 05-01 and 05-02 done, percent 100, last text 'Quick task: compact discussion-log tables', step `{ kind: 'milestone', title: 'Start the next milestone', id: null, url: null }`.
    - sparse: next null. A STATE that yields no step (no phase, not done, no focus) gives step null.
    - A pending blocking-human checkpoint or authored blocker in the presentation changes nothing in `head.next`, while `view.next.immediate` still reports it.
    - activityClause and activityDateLabel facts from corpus_facts. A SUMMARY with status awaiting-checkpoint still counts as done (it has a SUMMARY.md).
    - Timing (T-wlg-02): a 1 MB What This Is body with a 200k-character line gives a lead in under 250 ms, and a 100k-character activity description gives a clause in under 50 ms.
  </behavior>
  <action>
**Card model (QWLG-04).** In src/presentation/dashboard-head.ts, export:
- `DashboardHeadNext { plans: { id: string; done: boolean; next: boolean }[]; completed: number; percent: number | null; last: { date: string | null; dateLabel: string | null; text: string | null } | null; step: { kind: 'plan' | 'milestone' | 'focus' | 'phase'; id: string | null; title: string; url: string | null } | null }`.
- Add `next: DashboardHeadNext | null` to DashboardHead. It is null exactly when presentation.state is null.

Export `activityClause(text)` and `activityDateLabel(isoDate, readAt)`, ported from gen-data.mjs `clause`:
- cap the input at MAX_ACTIVITY_CHARS first;
- rewrite `quick task <id> (x)` / `quick task <id>: x` / `— x` to `Quick task: <x up to its first comma>`;
- cut at the first spaced em dash, the first unclosed ` (`, or `; `;
- above 72 characters, slice to 70, trim back to a word boundary and append `…`.

The date label is `D Mon`, plus ` YYYY` when the year differs from readAt's year. It is null for a missing or invalid date.

Step cascade, applied in order, mirroring gen-data.mjs:
1. When not done and phase is non-null, search the live (non-archived) milestones' phases whose number is numerically ≥ the current phase. Go in ascending number order, plans by id, and take the first with `summary === null`. The step is `{ kind: 'plan', id, title, url: plan.key }`, where title is the plan artifact's `structured.plan.objective.title`, else the plan description, else `Plan <id>`.
2. Done → `Start the next milestone`.
3. currentFocus, backticks removed, that does not match `/^Phase\s/i` → `{ kind: 'focus', title: activityClause(focus) }`.
4. Phase → `Plan phase N` when the raw status matches /plan/i, else `Continue phase N`.
5. null.

Never read checkpoints, blockers, coverage waits or `nextWork`.

Plans come from `headPhaseOf`'s phase (live, then archive) in id order, with `done = summary !== null` and `next = step.kind === 'plan' && id === step.id`. They are [] when the phase does not resolve. `percent = Math.round(completed / plans.length * 100)`, or null when there are no plans.

**Card UI.** Replace the contents of the right-column aside with `aside.immediate-work.project-next` (aria-labelledby the eyebrow's id). In order:
1. `p.eyebrow` 'Next up'.
2. Progress:
   - with plans: `div.project-next-progress` holding a `div.project-next-figure` row with `span.project-next-percent` (the number, then `span.project-next-unit` '%'; a nested span, because the visual-contract test forbids the HTML small-print element on this page) and `span.project-next-counts` ('<b>N</b> of M plans', 'plan' when M is 1); then `div.project-next-bar` (aria-hidden) with one span per plan, `data-state` done / next / open.
   - without plans: `p.empty-note` 'No plans in this phase yet.'.
3. `p.project-next-last` when last exists: `span.project-next-label` 'Last', then the dateLabel, ' — ' only when both parts exist, then the text through stripMarkdown(stripEmoji(...)).
4. The step:
   - plan: a react-router `Link.project-next-step` to step.url, holding `span.project-next-id` and a `strong` with stripEmoji(title).
   - other kinds: `div.project-next-step` with `data-done` set to whether kind is milestone, holding the strong.
5. The absence lines:
   - head.next is null: `p.empty-note` 'No STATE.md yet — nothing to report.'
   - step is null: the page's existing sentence 'No dependency-ready work is reported in the active milestone.' (keep that exact string; the empty-state contract pins it).

Remove NextWork's `primary` prop and branch. It now renders only the On deck preview, still `<p>{item.description}</p>` with stripMarkdown. Remove `CheckCircle2` only if it is no longer used anywhere on the page.

**CSS.**
- `.immediate-work`: drop the offset box-shadow (R3b's card has none).
- `.project-next`: grid, gap `--space-4`, min-width 0.
- `.project-next-progress`: grid, gap `--space-2`.
- `.project-next-figure`: flex, wrap, gap `--space-3`, baseline.
- `.project-next-percent`: `--fs-display-1`, `--fw-semibold`, `--ls-tight`, `--lh-none`.
- `.project-next-unit`: muted, `--fw-medium`, a fluid step near half the display size (`--fs-fluid-2`).
- `.project-next-counts`: muted, `--fs-4`. Its `b` is in the foreground colour, `--fw-semibold`.
- `.project-next-bar`: flex, gap `--space-0-5`, height `--space-1-5`.
  - spans: flex 1, a `--muted-foreground` 22% mix.
  - `[data-state='done']`: `--primary`.
  - `[data-state='next']`: `--in-flight-fill`.
- `.project-next-last`: muted, `--fs-3`, `--lh-snug`, overflow-wrap anywhere.
- `.project-next-label`: share `.project-now-label`'s metrics, muted, margin-right `--space-2`.
- `.project-next-step`: grid, gap `--space-2`, `justify-items: start`, padding-top `--space-4`, a `--border` top rule, no underline, inherited colour.
  - `strong`: `--fs-7`, `--lh-tight`, `--ls-tight`, `--fw-semibold`, overflow-wrap anywhere.
  - `[data-done='true'] strong`: muted, `--fw-medium`.
  - link hover and focus-visible: `strong` in `--primary`, no transition.
- `.project-next-id`: `--font-mono`, `--fs-1`, muted, a `--border` outline, inline padding `--space-1-5`.

Then:
- Delete the `.next-primary*` rules.
- Keep the 62rem `.immediate-work { max-width }` rule.
- Base rules go before the media blocks.

**Docs.**
- Add Dashboard rows for `project-next`, `project-next-bar`, `project-next-counts`, `project-next-figure`, `project-next-id`, `project-next-label`, `project-next-last`, `project-next-percent`, `project-next-progress`, `project-next-step` and `project-next-unit`.
- Remove the `next-primary` row.
- Add a Language-beyond-names bullet, "The dashboard opens on the project" (quick-261017-wlg, sketch 025 R3b). It covers: the H1 split into name and tagline; the lead rules in one sentence; the Now block; the card's order; that absences are silent except the card's two lines; that the value-statement section is not shown; and that blockers and gates stay in Needs attention. It also records the accent uses, which extend the 10% reservation: the Now block's left rule and label, the card's existing top rule, the done bar segments in `--primary`, the next plan's segment in `--in-flight-fill`, and the step title's hover colour. Status chips use only `active` / `complete`. No motion.

**Contracts.**
- test/web/strip-emoji.test.ts dashboard describe: keep the attention-detail and `<p>{item.description}</p>` assertions. Replace the `rawItem.description` assertion with assertions that the page applies stripEmoji to the head's step title and last-activity text, matching the exact expressions written.
- test/web/visual-contract.test.ts G2-08: the first two tests now assert only the `.next-preview p` clamp at 2 lines, plus one assertion that no `.next-primary` rule remains. Comment that the head's next step deliberately shows its whole first sentence (sketch 025). Keep the non-truncation test as is.

**e2e.** Extend the dense describe in test/e2e/dashboard-head.spec.ts:
- `.project-next` shows 'Next up', '100%' and '2 of 2 plans';
- two bar spans with data-state done;
- the last line contains '22 Aug' and 'Phase 1 hardening task committed';
- the step shows '02-01' and the corpus title;
- clicking the step lands on a URL containing `/plans/02-01`;
- no 'Recommended action' text anywhere in main.
  </action>
  <verify>
    <automated>npx vitest run test/presentation/dashboard-head.test.ts test/presentation/dashboard.test.ts test/web/strip-emoji.test.ts test/web/visual-contract.test.ts test/web/class-vocabulary.test.ts test/web/css-source-order.test.ts test/web/shell-contract.test.ts test/web/empty-state-contract.test.ts test/web/attention-row-contract.test.ts && npx vitest run test/token-guard.test.ts -t 'no stale entries|consumes every defined' && test "$(npx vitest run test/token-guard.test.ts 2>&1 | grep -c -e '\.project-' -e '\.immediate-work')" = 0 && test "$(grep -c 'dangerouslySetInnerHTML' src/web/pages/dashboard-page.tsx)" = 0 && npm run -s typecheck && npx eslint src/presentation/dashboard-head.ts src/presentation/dashboard.ts src/server/project-presentation.ts src/web/pages/dashboard-page.tsx test/presentation/dashboard-head.test.ts test/e2e/dashboard-head.spec.ts test/e2e/fixture-server.ts && npm run test:e2e -- test/e2e/dashboard-head.spec.ts</automated>
  </verify>
  <done>
- The card renders R3b's order (Next up, progress, last activity, next step) from `head.next` alone, with no blocker, gate or checkpoint content. The old Recommended action card and its primary NextWork variant are gone, and On deck still renders previews.
- Every behavior bullet passes, including the timing caps; the rewritten contracts pass honestly; and lint is clean on the touched files.
- The dense e2e card assertions pass and the step link navigates to plan 02-01.
  </done>
</task>

<task type="auto">
  <name>Task 3: Degradation and fidelity — synthetic and sparse projects in the browser, layout, themes and overflow, side-by-side against sketch 025 R3b, and the full gates</name>
  <files>test/e2e/dashboard-head.spec.ts, .planning/quick/261017-wlg-implement-sketch-025-dashboard-project-h/capture-side-by-side.mjs, src/web/pages/dashboard-page.tsx, src/web/styles/globals.css, src/presentation/dashboard-head.ts</files>
  <action>
**1. e2e (QWLG-06).** Extend test/e2e/dashboard-head.spec.ts. Each describe gets its own `startFixtureServer` in beforeAll and `stop()` in afterAll.

- **syn** (files: test/fixtures/dashboard synthetic PROJECT.md → `.planning/PROJECT.md`, synthetic STATE.md → `.planning/STATE.md`; dark theme):
  - h1 'Harbor Ledger', `.project-tagline` 'Customs Filing Automation', the syn lead with `code` 'ace-gateway';
  - the Now line 'v2.0 Gateway Corrections · Phase 3', h2 'Correction Reconciliation', chip 'Planning';
  - the card shows 'No plans in this phase yet.', a last line containing '14 Oct' and 'Phase 3 context gathered', and a step 'Plan phase 3' that is not a link and has no `.project-next-id`;
  - `.project-head` does not contain the synthetic PROJECT.md's Core Value sentence ('Every manifest line becomes a cited filing row').
- **sparse** (files: sparse-PROJECT.md only; light): h1 'Untitled Spike'; no `.project-lead` and no `.project-now`; the card reads 'No STATE.md yet — nothing to report.'; Needs attention still renders.
- **dense layout**, at 1440×900 in light:
  - the vertical centres of `.project-head-copy` and `.project-next` differ by at most 2px, while their heights differ (each side at its own height);
  - at 820px the card's top is at or below the copy's bottom (stacked).
- **Every describe**:
  - exactly one h1 in main and at least one `.eyebrow`;
  - computed border-radius 0 on `.project-next`, `.project-next-bar span`, `.project-next-id` and the chip;
  - at 420px wide, `scrollWidth - clientWidth` is 0, in light and dark.

**2. Side-by-side.**
- Servers: serve `.planning/sketches` read-only with `python3 -m http.server <port> --bind 127.0.0.1 --directory .planning/sketches` (the sketch is `/025-dashboard-project-head/?v=r3b&doc=<fx|syn|sparse|lab>&theme=<light|dark>`). Start fixture servers for fx (target fixtures/dense), syn and sparse (files), and a scratch read-only server `node src/server/index.ts . --port <port>` for lab. Every port is a free one in 5310-5319; check with `ss -ltn` first.
- Script: adapt the k45 capture script (path in context) into this item's capture-side-by-side.mjs. Use Playwright's own chromium (falling back to /usr/bin/chromium only if that launch fails). The left side is the sketch's `main.page > section`, with `#variant-nav`, the sketch toolbar and the fake shell header hidden by an injected style. The right side is the build's `.project-head`. Output goes to test/e2e/screenshots/wlg/, which is gitignored.
- Captures: fx, syn, sparse and lab in light at 1440px; fx and syn in dark; fx at 820 and 390px.
- report.json: per-capture values for both sides — h1, tagline, lead, Now line, h2, chip text, percent, counts, bar states, last line, step id and title, the vertical-centre delta between the two sides, and horizontal overflow.

Compare each pair. Fix every structural, order, colour, spacing, size or overflow deviation in the page, the CSS or dashboard-head.ts, then re-run the affected unit tests and captures.

The following are expected differences, not deviations. List them in the SUMMARY:
- lab's live data has moved on since the sketch's data.js;
- the real app shell and sidebar narrow the head;
- the planner_notes discretion items, such as the singular 'plan' and the silent missing lead.

Stop every scratch server by PID.

**3. Gates.** Run the full vitest suite, typecheck, lint, build, then this item's e2e spec through `npm run test:e2e`. Fix anything they catch inside this plan's files. The two failures already present at the base commit (named in interfaces) stay; record them in a deferred-items.md beside the SUMMARY if they still fail.

**4. SUMMARY.** In plain language, with no internal shorthand, record:
- what the dashboard now opens on;
- each planner_notes discretion item as built;
- the contracts rewritten, and why;
- the deviations fixed (old → new) and those kept, with the reason;
- the ports used;
- the capture list.
  </action>
  <verify>
    <automated>mkdir -p test-results && npx vitest run > test-results/wlg-vitest.log 2>&1; grep -q 'Test Files' test-results/wlg-vitest.log && test "$(grep -E '^ FAIL ' test-results/wlg-vitest.log | grep -v -e 'real stylesheet' -e 'plan pair page' | wc -l)" -eq 0 && npm run -s typecheck && npm run -s lint && npm run -s build && npm run test:e2e -- test/e2e/dashboard-head.spec.ts && test -s test/e2e/screenshots/wlg/report.json</automated>
    <human-check>
- Open the dashboard on labelore itself (the user's running instance, or a scratch server on a 5310-5319 port). The first screen reads "Labelore" with the one-line lead under it. Beneath that sits a Now block: "v1.1 Legible Documents · Phase 5", "Per-Type Document Views", and the "Awaiting next milestone" chip on its own line. Beside it, centred on it, the card reads Next up, 100%, "6 of 6 plans" with six filled segments, a one-line Last activity, and "Start the next milestone" at the end.
- Open the dense fixture: the card shows "02-01" and the whole first sentence of its objective, and clicking it opens that plan.
- Check light and dark, and 390px wide. The name is the first thing read at every width, corners are squared, and nothing moves on hover beyond a colour change.
    </human-check>
  </verify>
  <done>
- The e2e spec passes for dense, synthetic and sparse, including the layout, theme and overflow checks, and no server is left running.
- Side-by-side PNGs and report.json exist for every listed capture, with every deviation fixed or recorded in the SUMMARY.
- vitest (apart from the two failures already present at the base commit), typecheck, lint, build and the e2e spec pass, and everything is committed.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target `.planning/` → local reader | PROJECT.md, STATE.md, PLAN.md and SUMMARY.md text is author-controlled (possibly another person's repository) and parsed on the local server |
| /api/dashboard → browser | head strings derived from that text cross into the rendered page |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-wlg-01 | Tampering | dashboard-page.tsx head render | medium | mitigate | Every head string renders as a React text node. The lead's code spans go through tokenizeInline into `<code>` text, with no raw-HTML prop. The verify gate pins a zero count of the raw-HTML prop in dashboard-page.tsx. |
| T-wlg-02 | Denial of service | dashboard-head.ts extractors (lead, clause) | medium | mitigate | MAX_SECTION_CHARS, MAX_PARAGRAPH_CHARS and MAX_ACTIVITY_CHARS caps apply before any regex, and only linear regexes run on the capped strings. Timing tests: a 1 MB body with a 200k-character line gives a lead in under 250 ms, and a 100k-character description gives a clause in under 50 ms. |
| T-wlg-03 | Denial of service | stateOf additions, buildDashboardHead | medium | mitigate | Every extractor is total. Tests cover malformed STATE YAML, a missing PROJECT.md, a title-less PROJECT.md, non-string frontmatter values, a Date last_activity, and a phase that does not resolve. All return null fields; none throw. The /api/dashboard route test answers 200. |
| T-wlg-04 | Spoofing | next-step link | low | mitigate | The link target is PlanDto.key (buildPlanUrl over a parsed identity) and never text from a file. Non-plan steps render no link. |
| T-wlg-05 | Information disclosure | /api/dashboard head | low | accept | The head exposes only values /api/presentation already serves for the same local, read-only project. |
| T-wlg-06 | Tampering | target project files | low | accept | The change adds no filesystem access: the head is built from the existing presentation DTO. e2e servers read fixtures/dense in place, never writing to it, and temp projects are removed on stop. |
| T-wlg-SC | Tampering | npm installs | low | accept | No package installs in this plan; every import is already a dependency in package.json. |
</threat_model>

<verification>
- `npx vitest run test/presentation/dashboard-head.test.ts` pins every corpus_facts value through the real reader and the /api/dashboard route.
- The full vitest suite fails only on the two failures already present at the base commit, and the token-guard violation list is exactly those three older rules.
- typecheck, lint and build pass.
- `npm run test:e2e -- test/e2e/dashboard-head.spec.ts` passes.
- test/e2e/screenshots/wlg/report.json exists, and the SUMMARY records each deviation fixed or kept.
</verification>

<success_criteria>
- The dashboard opens on the project: name (and tagline), the What This Is lead, and a Now block with milestone · phase, the phase title and the status chip on its own line. There is no position label and there are no source links.
- One card, centred on the left side, shows Next up: this phase's own plan progress with one segment per plan and the next one shaded, a "No plans in this phase yet." line when the phase has none, a one-line last activity, and the next step in full (plan id + the objective's first sentence, "Start the next milestone", or "Plan phase N"). It never shows a blocker, gate or checkpoint, and never Core Value.
- Labelore's own dashboard no longer reads "Unavailable": phase 5 resolves from the v1.1 archive.
- Sparse projects degrade quietly. A PROJECT.md without What This Is shows just the name, and a project without STATE.md shows no Now block and a one-line card.
- The rest of the dashboard is unchanged, and the design-language document and its enforcing tests describe the new head.
</success_criteria>

<output>
Create `.planning/quick/261017-wlg-implement-sketch-025-dashboard-project-h/261017-wlg-SUMMARY.md` when done
</output>
