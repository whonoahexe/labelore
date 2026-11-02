# Phase 9: Review, Audit and Root Document Pages - Context

**Gathered:** 2026-11-02
**Status:** Ready for planning (project-page sketch runs first, see D-12)

<domain>
## Phase Boundary

The unpaged files met most often in real projects open into designed pages instead of the generic
"no dedicated view" fallback: the root documents of `.planning/` (project, roadmap, requirements,
state, milestones, retrospective, windows) and their archived copies under `milestones/`, milestone
audits, coverage files, and the review disposition and review fix files, which read as one ledger
with the existing review page. Requirements VIEW-07, VIEW-08, VIEW-09, VIEW-10.

Not in this phase: spec/check documents and codebase maps (Phase 10), exploration/handoff/report
files and workstreams (Phase 11), `config.json` settings page and Source mode (Phase 12).

</domain>

<decisions>
## Implementation Decisions

### Root documents that already have a designed page
- **D-01:** A root document whose content already has a designed page **redirects to that page**
  rather than getting a second rendering: `REQUIREMENTS.md` → traceability, `STATE.md` → dashboard,
  `MILESTONES.md` → the roadmap page's milestone History, `RETROSPECTIVE.md` → the roadmap
  retrospective view, `ROADMAP.md` → the roadmap page (already its address, Phase 7 D-03). Drawer and
  search entries for these files lead to the same place. Source mode stays reachable for each file.
  Redirects replace history (same behaviour as Phase 7 D-12). — **Reversibility:** reversible — a
  file page can be added later behind the same address.
- **D-02:** An **archived copy** (`milestones/v1.0-ROADMAP.md`, `milestones/v1.0-REQUIREMENTS.md`)
  opens on the **same page as its live counterpart, scrolled to and highlighting that milestone's
  block**: `/v1.0/roadmap` → roadmap page at v1.0's History block; `/v1.0/requirements` →
  traceability at v1.0's archived-milestone section. That block carries a "Shipped v1.0 · <date>"
  mark (quiet/complete tone, from `docs/design-language.md`). No filtered mode, no separate archived
  file page.
- **D-03:** The planner must confirm each redirect target actually shows what its file holds (e.g.
  that the dashboard covers STATE.md's position, blockers and session line). A real gap found here is
  filled on the target page, not by building a second page for the file.
  *Amended 2026-11-02 after research (user decision):* the gaps filled are the STATE.md session line
  (Session Continuity, Deferred Items, Operator Next Steps) on the dashboard and the remaining
  MILESTONES fields in the roadmap History panel. Accepted gaps, not built this phase: retrospective
  seeding (the RETROSPECTIVE.md redirect lands on the retrospective view without picking an entry)
  and the unshown retrospective sections (What Was Built, Cost Observations, Cross-Milestone Trends,
  versions with no History block).

### Project page (PROJECT.md)
- **D-04:** `PROJECT.md` gets a **new designed project page**: what the project is, core value, the
  current milestone's goal, requirement counts by state, constraints, and key decisions with their
  outcomes (success criterion 2). The dashboard head links to it ("About this project →"). The
  dashboard stays "where the work is now"; this page is the charter.
- **D-05:** Requirement counts on the project page come from the **traceability projection** the app
  already computes, not from PROJECT.md's own Validated/Active/Out-of-Scope bullets, and each count
  links into traceability filtered to that state. The two pages can never disagree.

### Windows ledger (WINDOWS.md)
- **D-06:** The windows page **always leads with the open count**, even at zero ("0 open" in the
  complete tone), then a short line such as "9 fixed, last on <date>". Open and waived windows are
  listed by phase and kind, each waived one with its reason. Fixed windows sit below as a
  **collapsed history grouped by phase**. The page keeps the same shape whether or not anything is
  open.

### Review ledger (REVIEW, REVIEW-DISPOSITION, REVIEW-FIX)
- **D-07:** The three files read as one ledger through **tabs on one page**, like the plan/summary
  pair page: `/phase-N/review`, `/phase-N/review-disposition` and `/phase-N/review-fix` each keep
  their own URL (Phase 7 D-06) and open the same page on the Review, Disposition or Fix tab. A
  shared head shows open against total findings by severity.
- **D-08:** Head counts take **"open" from the disposition file** (GSD's record). Where a fix file
  says a finding was fixed but the disposition still says `open` (common in real projects: 08's
  disposition is all `open`), the finding carries a quiet "fixed in <commit>, disposition not
  updated" mark. The two signals are shown apart, never merged (project rule: keep disagreeing
  signals separate).
- **D-09:** Several fix files for one phase (`05-REVIEW-FIX-backend.md`, `05-REVIEW-FIX-frontend.md`)
  go in **one Fix tab with one labelled, anchored section per file**. The head totals across all of
  them.
- **D-10:** The Disposition tab is **grouped by disposition**: open first, then deferred and skipped
  with their reasons, then fixed with the commit (taken from the fix file where one exists).
  Severity uses the existing severity pips.
- **D-11:** **Tabs appear only for files that exist.** A lone REVIEW looks exactly as it does today,
  with no tab strip; the strip and shared head appear once a second file exists. The same rules
  apply to live phases, archived phases and quick tasks.

### Sketching and design
- **D-12:** **Only the project page goes through the sketch loop**, and the sketch runs **before
  `/gsd-plan-phase 9`** (`/gsd-sketch` for the project page). The winning variant in
  `.planning/sketches/MANIFEST.md` is a canonical reference for the project-page plan, and the build
  is screenshotted beside the sketch (on the sketch's docs and on real PROJECT.md files) before it
  is called done.
- **D-13:** The windows ledger, review ledger, milestone audit and coverage pages are **built from
  their closest existing analogs** within `docs/design-language.md` and enforced by the
  class-vocabulary test, with a screenshot review with the user after the build. Suggested analogs:
  review ledger ← review page (`review-threads`) + pair-page tabs; audit ← verification board;
  windows ← todo lifecycle / UAT session lists; coverage ← a plain matrix. Each page keeps its own
  structure, not a copy of the last frame; colours only from design-language tones (never
  `destructive` for content).

### Thin and odd inputs
- **D-14:** A one-line `COVERAGE.md` ("No external API integration: <why>", the common real shape)
  shows a **quiet "No external API in this phase" card** with the file's reason underneath. The
  capability matrix (capability · decision INTEGRATE/OPT-OUT · reason, as in duet's file) appears
  only when the file has such a table: integrated vs opted out, each opt-out with its reason.
- **D-15:** Made-up fixtures must cover every real shape the pages meet (Phase 6 rule: the repo holds
  only invented data, e.g. in Lendshed): a frontmatter-heavy milestone audit with tech debt by phase,
  a one-line coverage file and a matrix one, a windows ledger with zero open and one with open and
  waived rows, a disposition with stale `open` rows that a fix file marks fixed, and a phase with two
  fix files. Real files on this machine are read for shape only and never copied in.

### Claude's Discretion
- **Milestone audit source precedence:** the user left it to the planner. Recommendation: verdict,
  scores, gaps and tech debt from frontmatter first (the real audits in
  `cinedise-portal/.planning/milestones/v2.0-MILESTONE-AUDIT.md` keep everything there), prose
  sections only where a field is missing, the remaining body below as narrative; empty gaps read
  "No gaps" in the complete tone, never a blank section. Must read both the real shape and the old
  fixture shape (success criterion 3).
- **Project sketch inputs:** the sketch picks its real PROJECT.md inputs, but per the "hardest real
  inputs" rule it should include labelore's long Key Decisions table (30+ rows with outcomes and
  ⚠️ Revisit marks) and at least one short one.
- **WINDOWS.md source of truth:** the file carries frontmatter counts, a markdown table and a JSON
  block. The planner picks which to read; if they disagree, show it rather than merging.
- How the "Shipped" mark, the review tab strip, and the coverage matrix look in detail, within the
  design language.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § Phase 9 — goal and the four success criteria
- `.planning/REQUIREMENTS.md` — VIEW-07, VIEW-08, VIEW-09, VIEW-10
- `.planning/PROJECT.md` § Key Decisions — "keep disagreeing signals separate", "per-type view is the
  page", "sketch first", made-up fixture rule

### Prior phase decisions this builds on
- `.planning/phases/07-recognised-files-and-readable-urls/07-CONTEXT.md` — D-01..D-06 URL scheme
  (milestone segment, one address per live root document, lowercased phase-file tokens), D-12
  silent redirects
- `.planning/phases/08-several-projects-and-a-switcher/08-CONTEXT.md` — project-prefixed URLs

### Design
- `docs/design-language.md` — tones, tokens, chips, severity pips; enforced by
  `test/web/class-vocabulary.test.ts`
- `.planning/sketches/MANIFEST.md` — sketch winners; the project-page winner (D-12) is added here
  before planning; 022 (review page), 021 (verification), 027 (todo), 030 (milestone retro dialog)
  are the nearest prior frames

### Real shapes on this machine (read for shape only; never copy into fixtures)
- `~/codebases/cinedise-portal/.planning/milestones/v2.0-MILESTONE-AUDIT.md` — frontmatter audit
- `~/codebases/duet/.planning/milestones/v1.0-phases/01-foundation-auth-media-plane/COVERAGE.md` —
  coverage matrix shape
- `~/codebases/cinedise-portal/.planning/phases/03-projects/COVERAGE.md` — one-line coverage shape
- `.planning/phases/08-several-projects-and-a-switcher/08-REVIEW-DISPOSITION.md`,
  `.planning/phases/06-trustworthy-tests-and-security-baseline/06-REVIEW-FIX.md` — disposition and fix
- `~/codebases/cinedise-portal/.planning/phases/05-card-ingest/05-REVIEW-FIX-{backend,frontend}.md`
  — several fix files
- `.planning/WINDOWS.md`, `~/codebases/cinedise-portal/.planning/WINDOWS.md` — windows ledger

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/web/pages/plan-pair-page.tsx` + `src/web/components/pair-switch.tsx`: the tab pattern for the
  review ledger (one page, each file its own URL).
- `src/web/views/review-threads.ts` / `review-threads-components.tsx`: the existing review page.
- `src/planning-repo/handlers/review.ts`: `ReviewHandler` and `ReviewFixHandler`
  (`structured.reviewFix` already extracts fixed/skipped/deferred); disposition needs a handler.
- `src/planning-repo/handlers/windows.ts`: `WindowsHandler` exists with no designed page.
- `src/web/views/manifests.ts`: basic `milestone-audit`, `coverage`, `review-fix` manifests to
  replace or extend.
- `src/presentation/traceability.ts`: `archivedMilestones` projection (D-02 target) and the state
  counts for D-05.
- `src/presentation/roadmap.ts` + `src/web/pages/roadmap-page.tsx`, `roadmap-retrospective.tsx`:
  milestone History and retrospective (D-01, D-02 targets).
- `src/presentation/dashboard-head.ts`: where the "About this project →" link goes (D-04).
- `src/web/views/verification-board.ts`, `todo-lifecycle.ts`, `uat-session.ts`: analogs (D-13).

### Established Patterns
- Per-type views are registered in `src/web/views/kinds.ts` (`VIEW_KINDS`) and
  `src/web/views/manifests.ts`; the fallback notice lives in `src/web/views/fallback.ts`.
- File kinds come from the folder table `src/planning-repo/folders.ts` and `naming.ts`; URLs from
  `src/presentation/route-table.ts` and `routes.ts` (`PROJECT_PAGES`, reserved segments).
- Page-level redirects go through `src/web/route-dispatch.ts` (`redirectTo`).
- Wiring files every view build touches: `handlers/index.ts`, `manifests.ts`, `artifact-page.tsx`,
  `globals.css`, the dense golden.

### Integration Points
- Route table / route dispatch: root-document redirects (D-01) and archived-copy scroll targets (D-02).
- Artifact page: the review ledger tabs (D-07) and new per-type views.
- Fixtures under `test/fixtures/lendshed/.planning/` (no WINDOWS, audit, disposition or coverage
  there yet) for D-15.

</code_context>

<specifics>
## Specific Ideas

- The project page is the charter, and the dashboard is "now". Keep them separate and link them both ways.
- Stale dispositions are real (08's are all `open` after fixes). The ledger should make that visible
  quietly, not hide it.
- Most coverage files are one line, so the one-line card is the normal case, not an edge case.

</specifics>

<deferred>
## Deferred Ideas

- Sketching the windows, review-ledger, audit or coverage pages if the analog-built versions look
  wrong in the post-build screenshot review (a follow-up sketch and quick task, the v2.0 way).

</deferred>

---

*Phase: 09-review-audit-and-root-document-pages*
