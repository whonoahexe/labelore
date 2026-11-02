# Phase 9: Review, Audit and Root Document Pages - Research

**Researched:** 2026-11-02
**Domain:** Labelore internals (handlers, route dispatch, per-type views) plus the real shapes of GSD's root documents, milestone audits, coverage files, windows ledgers and review disposition/fix files on this machine
**Confidence:** HIGH on codebase facts and real-file shapes (all read this session); MEDIUM on a few judgement calls flagged in the Assumptions Log

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Root documents that already have a designed page**
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

**Project page (PROJECT.md)**
- **D-04:** `PROJECT.md` gets a **new designed project page**: what the project is, core value, the
  current milestone's goal, requirement counts by state, constraints, and key decisions with their
  outcomes (success criterion 2). The dashboard head links to it ("About this project →"). The
  dashboard stays "where the work is now"; this page is the charter.
- **D-05:** Requirement counts on the project page come from the **traceability projection** the app
  already computes, not from PROJECT.md's own Validated/Active/Out-of-Scope bullets, and each count
  links into traceability filtered to that state. The two pages can never disagree.

**Windows ledger (WINDOWS.md)**
- **D-06:** The windows page **always leads with the open count**, even at zero ("0 open" in the
  complete tone), then a short line such as "9 fixed, last on <date>". Open and waived windows are
  listed by phase and kind, each waived one with its reason. Fixed windows sit below as a
  **collapsed history grouped by phase**. The page keeps the same shape whether or not anything is
  open.

**Review ledger (REVIEW, REVIEW-DISPOSITION, REVIEW-FIX)**
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

**Sketching and design**
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

**Thin and odd inputs**
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

### Deferred Ideas (OUT OF SCOPE)
- Sketching the windows, review-ledger, audit or coverage pages if the analog-built versions look
  wrong in the post-build screenshot review (a follow-up sketch and quick task, the v2.0 way).

(Also out of scope per CONTEXT domain: spec/check documents and codebase maps (Phase 10),
exploration/handoff/report files and workstreams (Phase 11), `config.json` settings page and Source
mode (Phase 12).)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIEW-07 | Root documents (project, roadmap, requirements, state, milestones, retrospective, windows) and their archived copies open into designed pages | Redirect set + archived-copy dispatch (Architecture Patterns 1-2), project page and windows ledger data shapes (Pitfalls 8, 10, 11), D-03 gap list (Open Question 3) |
| VIEW-08 | A milestone audit opens into a designed page | Three real audit shapes incl. object-valued `tech_debt` items and prose-only audits (Pitfall 7); canonical GSD frontmatter spec |
| VIEW-09 | Review disposition and review fix open into designed pages that read as one review ledger with the review page | Ledger context pattern, head-count precedence, id-grammar and suffix-file gaps (Architecture Pattern 3, Pitfalls 2-6) |
| VIEW-10 | A coverage file opens into a designed page showing its capability matrix | Three real coverage shapes (Pitfall 9) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Read-only: the tool must be incapable of damaging planning state; `node:fs` stays confined to `local-fs.ts` (a standing test gate pins it). No write path of any kind is added by this phase. [VERIFIED: .claude/CLAUDE.md "Access" constraint; .planning/PROJECT.md Key Decisions row 1]
- Compatibility: unknown files or shapes must degrade, not break. Every new page needs a "shape the design did not expect" fallback to the generic document view.
- Design: visual language lives in `docs/design-language.md`; `test/web/class-vocabulary.test.ts` enforces it. New shared class names need a table row in that doc BEFORE the test runs; `view-<kind>-*` names are auto-allowed only for kinds in `VIEW_LOCAL_PREFIXES`.
- No runtime/code/data dependency on studio-portal. Fixtures in the repo are made-up only (public repo; Phase 6 rule).
- GSD workflow enforcement: file changes go through a GSD command. Project memory rules that bind execution: restart the `labelore` systemd user service after every change (CSS included); run Playwright e2e only when needed, narrowest spec, about 6 minutes per run; screenshot the build beside the sketch before calling a view done; colours only from design-language tones, never `destructive` for content; every sketch gets a fresh page structure.
- Treat UI-SPEC (09-UI-SPEC.md, approved) and CONTEXT as locked. Where this research found a contradiction with UI-SPEC it is listed under "Contract conflicts" in Open Questions and must be resolved by the planner/user, not silently overridden.

## Summary

Phase 9 adds five per-type views (project, windows, milestone audit, coverage, and the review ledger's Disposition/Fix tabs plus shared head) and a set of root-document redirects, all inside Labelore's existing pipeline: a handler produces `structured`, a pure `compose*` function in `src/web/views/` turns `ViewInput` into a model, a manifest field opts a kind in, and `artifact-page.tsx` renders it. No new npm package is needed or recommended; everything is hand-written in the established style (linear, capped, never-throwing scanners; try/catch guards around every handler extraction). [VERIFIED: src/planning-repo/handlers/index.ts, src/web/views/manifests.ts, src/web/pages/artifact-page.tsx read this session]

The most important findings are mismatches between the approved contract and the real data/code. (1) The UI-SPEC's Source escape hatch (`file/` address) does not exist for a file that has a clean address: both the client dispatcher and the server artifact index resolve only route-table keys, so `/file/STATE.md` is a not-found. A query flag on the same address is the cheapest working mechanism. (2) The review ledger's "open of total" head cannot use REVIEW findings as the total: Labelore's own phase 8 has 5 findings in REVIEW.md but 32 in its disposition (31 open), and the sharded REVIEW files in cinedise-portal parse to zero findings. (3) The review parsers' finding-ID grammar rejects shard-prefixed (`A-WR-01`) and phase-qualified (`WR-P1-01`) IDs, so three of the four cinedise-portal fix files would show an empty Fix tab and two of its REVIEW files show zero findings. (4) Real milestone audits are not uniformly frontmatter-heavy: labelore's own v1.0 audit has object-valued `tech_debt` items and extra frontmatter keys, and two of the three real audits keep their verdict only in a `**Status:**` prose line. (5) The project page's requirement counts cannot come from the traceability projection as it stands: it has no out-of-scope count and no per-state counts.

**Primary recommendation:** Plan this phase as four layers in order: (A) recognition and parser fixes (suffixed fix-file grammar, widened finding-ID grammar, plural commits, new handlers for disposition, milestone audit, coverage; normalising windows/project), (B) pure presentation modules (root-document redirect set, review ledger builder, requirement-state counts), (C) route dispatch and the redirect/archived-copy/Source-flag mechanics, (D) five views with fixtures, class-vocabulary doc rows, and the screenshot review. Build fixtures for every real shape first (D-15) so each parser has a regression target.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Recognise suffixed fix files, new kinds | Read layer (`planning-repo/naming.ts`, `folders.ts`, handlers) | Presentation (`routes.ts` address) | Kind and address are decided by path position and name, never content (DATA-02) |
| Parse disposition, audit, coverage, windows, decisions | Read layer handlers (`structured.*`) | — | Untrusted bodies are scanned server-side with caps and linear scans; the page receives a projection |
| Root-document redirect set and archived-copy mapping | Presentation (pure module shared by dispatch, drawer, search) | Client dispatcher (`route-dispatch.ts`) | One source of truth so the three surfaces cannot disagree |
| Review ledger (siblings, head counts, disagreement marks) | Presentation (`review-ledger.ts`, pure, built per document request like `review-context.ts`) | Server `/documents` response; client view | Needs the sibling artifacts of the cached presentation, not the file system |
| Requirement-state counts for the project page | Presentation (`traceability.ts` extension) | Server `/traceability` | D-05: one computation, shared with the traceability page |
| Composing page models | Web views (`src/web/views/*.ts`, pure) | — | Existing pattern: pure composers are unit-testable without jsdom |
| Rendering, tabs, disclosure, arrival highlight | Browser (`*-components.tsx`, `artifact-page.tsx`, roadmap/traceability pages) | — | Local component state only; nothing writes anywhere |
| Query-param seeding (`?state=`, `?milestone=`, retrospective) | Browser (read once on arrival) | — | Never written back (UI-SPEC) |

## Standard Stack

No new libraries. Everything below is already in `package.json`. [VERIFIED: package.json lines 24-49 read this session]

### Core (existing, used as-is)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react / react-router | 19.2.8 / 8.3.0 | Pages, `Link`, `Navigate` | Established; `react-router` only (not `-dom`) per stack decision |
| @tanstack/react-query | 5.102.3 | Document and presentation fetch cache | `ArtifactPage` and `PlanPairPage` already query through it |
| gray-matter | 4.0.3 | Frontmatter (via `tryParseFrontmatter`) | Always called through the guarded wrapper; note YAML 1.1 octal behaviour (Pitfall 17) |
| lucide-react | 1.34.0 | Icons (`FileText` for the Source button, `Plug`/`Unplug` for coverage) | Design language |
| @base-ui/react | 1.7.0 | Primitives | Not needed beyond the existing `Button`/`Dialog` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written table/YAML-ish scanners | A markdown AST library | The codebase's rule is bounded linear scans with caps (SEC-01); adding a parser dependency contradicts it and adds a package to vet |
| A `yaml` library for lenient frontmatter | gray-matter guarded | Existing `tryParseFrontmatter` already degrades; do not change it |

**Installation:** none.

## Package Legitimacy Audit

No external packages are installed by this phase. The `gsd-tools query package-legitimacy` gate is not applicable.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
 .planning/ files (read-only fs)
        |
        v
 discovery -> kindOfPath(position, name)  --[ naming.ts / folders.ts ]-->  artifact.kind
        |                                                         (new: REVIEW-FIX-<suffix> => review-fix)
        v
 handlers (match by token/location, parse with caps + try/catch)
   project  windows  review  review-fix  review-disposition(new)  milestone-audit(new)  coverage(new)
        |  structured.* + frontmatter
        v
 toProjectPresentation -> ProjectPresentation (artifacts carry kind, key, structured, frontmatter)
        |                                   |
        |                                   +--> presentation/*.ts pure projections
        |                                         traceability.ts (+state counts, +out-of-scope)
        |                                         review-ledger.ts (new: siblings, head, marks)
        |                                         root-redirects.ts (new: path -> target, shared)
        v
 Hono /api/projects/:slug/{presentation,documents,traceability,roadmap,dashboard}
        |  documents response gains `ledgerContext` for review|review-disposition|review-fix
        v
 Browser: resolveProjectRoute(path, search, presentation)
        |
        |-- root doc in redirect set, no ?source flag ----> redirect (replace) to dashboard | traceability | roadmap(+seed)
        |-- archived roadmap/requirements copy ------------> page outcome carrying a block target
        |-- everything else with a key --------------------> document -> ArtifactPage
        v
 ArtifactPage: viewInput -> manifest.<projectPage|windowsLedger|reviewLedger|milestoneAudit|coverage>(input)
        |-> composed model or null  (null => existing promoted-block / generic fallback view)
        v
 *-components.tsx render; review kinds render {switcher = LedgerSwitch + LedgerHead} then the tab body
```

### Recommended Project Structure
```
src/planning-repo/
├── naming.ts                       # + parseReviewFixName (phase, suffix|null)
├── handlers/
│   ├── review.ts                   # + ReviewDispositionHandler; fix handler accepts suffixed names
│   ├── review-report.ts            # widen finding-id grammar, plural Commits
│   ├── milestone-audit.ts          # new (normalised structured.audit)
│   ├── coverage.ts                 # new (structured.coverage)
│   ├── windows.ts                  # fence-length-aware JSON, normalised rows
│   └── project.ts                  # keep keyDecisions; add outcome-tag fields only if needed
src/presentation/
├── root-redirects.ts               # new: ROOT_DOCUMENT_TARGETS, sourceUrlOf(); used by dispatch, drawer, search
├── review-ledger.ts                # new: pure; siblings + head counts + disagreement marks
└── traceability.ts                 # + requirementStateCounts, out-of-scope rows, archive shipped date
src/web/views/
├── project-page.ts / -components.tsx
├── windows-ledger.ts / -components.tsx
├── milestone-audit.ts / -components.tsx
├── coverage-matrix.ts / -components.tsx
├── review-ledger.ts / -components.tsx   # Disposition + Fix tab bodies, LedgerSwitch, LedgerHead
├── kinds.ts, manifests.ts, manifest.ts  # register + one manifest field per view
src/web/pages/
├── artifact-page.tsx               # one useMemo + one render branch per view (existing pattern)
├── roadmap-page.tsx, traceability-page.tsx  # block target + shipped chip + seeded params
test/fixtures/{lendshed,shapes}/.planning/  # made-up fixtures for every real shape (D-15)
```

### Pattern 1: Per-type view registration (the existing seam)
**What:** handler `structured` -> `composeX(ViewInput)` -> manifest field -> `useMemo` + render branch in `artifact-page.tsx`; returning `null` drops to the promoted-block view. [VERIFIED: src/web/views/manifest.ts, manifests.ts, artifact-page.tsx:793-831,885-905,960-1020]
**Registration facts that tests enforce:**
```ts
// src/web/views/kinds.ts:11-33 (VIEW_KINDS, verbatim list)
'discussion-log','verification','plan','summary','review','milestone-audit','research','patterns',
'ui-spec','uat','validation','security','ui-review','coverage','learnings','context','review-fix',
'findings','todo','note','debug'
// test/web/view-registry.test.ts:20  -> it('VIEW_KINDS has exactly 21 members', ...)
// VIEW_MANIFESTS keys must equal VIEW_KINDS (sorted toEqual) and every manifest needs a lead ending in '.'
```
`milestone-audit`, `coverage` and `review-fix` are already kinds with basic manifests (replace by adding a composer field; keep `promote` as the fallback). New kinds to add: `project`, `windows`, `review-disposition` (24 total; update the count test). `view-<kind>-*` classes are auto-allowed once the kind is in `VIEW_LOCAL_PREFIXES` (= `VIEW_KINDS` plus `unrecognized`). `view-page-contract.test.ts:135-136` caps `artifact.kind === '` occurrences in `artifact-page.tsx` at 2, so dispatch only through manifests, never a new kind branch.

### Pattern 2: Root-document redirects and archived copies in the dispatcher
**What:** `resolveProjectRoute` already receives `(path, search, presentation)` and returns `redirectTo(target)` (replace history). The document branch is the one place to add the rule. [VERIFIED: src/web/route-dispatch.ts:53-56, 141-152]
```ts
// src/web/route-dispatch.ts:53-56 (verbatim)
function documentOutcome(url: string, presentation: ProjectPresentation): RouteOutcome | null {
  const artifact = presentation.artifacts.find((candidate) => candidate.key === url);
  return artifact ? { kind: 'document', url, artifactPath: artifact.path } : null;
}
```
Recommended shape: a pure `rootDocumentTarget(artifact, presentation, search)` in `presentation/root-redirects.ts` returning `{ kind:'redirect', to } | { kind:'archive-block', page:'roadmap'|'traceability', version } | null`, called from the `document` case. The same module exports `sourceUrlOf(artifact)` (the key plus the Source flag) so the drawer and search rows add their Source icon from one definition. Live root files are recognised by `artifact.location === 'root'` and basename (not `kind` alone: the `kind` for `research/STATE.md` is unaffected because folder rows gate by position, Phase 7 T-07-04). Archived copies are `location === 'milestone-root'`, directly under `milestones/`, kind `roadmap`/`requirements`.
- `/v1.0/roadmap`: only if `presentation.milestones` holds an archived milestone with that version; outcome renders `RoadmapPage` with an explicit target prop. `RoadmapPage` derives its target from the pathname (`resolveRoadmapDeepLink(pathname)`), and `/v1.0/roadmap` parses as a plain document, so the outcome must carry the target (extend `RouteOutcome`, not the URL). History blocks already open themselves through `milestoneContainsDeepLink` when the target is a milestone. [VERIFIED: src/web/pages/roadmap-deep-link.ts, roadmap-page.tsx:327-400]
- `/v1.0/requirements`: only if the archive is actually projected (the projection skips archives with no checkbox items: `if (items.length === 0) return null`), so share that predicate; otherwise fall to the generic document. [VERIFIED: src/presentation/traceability.ts:286-300]
- Bare `/v1.0` already redirects to `milestone.roadmapUrl`, which `milestoneRoadmapUrl()` sets to `/v1.0/roadmap` when that file exists; keep that working (it will now land on the block).

### Pattern 3: Review ledger as a server-built context plus a switcher
**What:** `reviewContext` is built per `/documents` request from the cached presentation (`buildReviewContext`), keyed on `artifact.kind === 'review'` only. [VERIFIED: src/server/project-api.ts:101-112, src/presentation/review-context.ts] Build a sibling `ledgerContext` for kinds `review`, `review-disposition`, `review-fix` with a new pure `presentation/review-ledger.ts`:
- Find siblings by same directory and `artifactTokenOf` in `REVIEW | REVIEW-DISPOSITION | REVIEW-FIX` (including suffixed fix files). Do NOT use the `-REVIEW.md` to `-REVIEW-FIX.md` suffix swap that `review-context.ts` uses (`const FIX_SUFFIX = '-REVIEW-FIX.md'`, line 41): it can never find `05-REVIEW-FIX-backend.md`.
- Return tabs (only existing files), the head model, and per-finding marks. Keep `reviewContext.fix` as is so `composeReviewThreads` and its tests are untouched; when several fix files exist, hand `composeReviewThreads` a merged `ReviewFixReportBody` (concatenated `entries` and `deferred`) so the Review tab's per-finding outcomes still join.
- Render: `ArtifactPage` already puts `{switcher}` first inside `<main>` for every view, so pass `<LedgerSwitch/>` + `<LedgerHead/>` as the switcher when there is more than one member. With a lone REVIEW, pass `null`: byte-identical to today (D-11). `LedgerSwitch` generalises `PairSwitch` (same `nav` + `Link` + `aria-current` markup and `plan-pair-switch` look). [VERIFIED: src/web/components/pair-switch.tsx]
- Each tab is its own artifact URL, so tab changes are ordinary navigations (back button works, nothing to sync). The Fix tab for suffixed files: each fix file's own URL opens the same Fix tab scrolled to its section (`#fix-backend`).

### Pattern 4: Windows, audit, coverage are single-file views
Single-file kinds follow the Pattern 1 path. Normalise inside the handler (server) with caps; compose pure in `web/views`. Precedent for parse discipline: `milestones.ts`, `review-report.ts` ("every scan is one linear pass over lines with bounded, single-line patterns, and sizes are capped before any of it runs").

### Anti-Patterns to Avoid
- **Second page for a redirected file** (D-01/D-03): fill gaps on the target page.
- **Merging disagreeing signals** (open vs fixed; frontmatter counts vs rows; checkbox vs phase coverage): show both, apart.
- **Keying behaviour on substrings of prose** (Pitfall 10).
- **Adding a per-kind branch to `artifact-page.tsx`**: the contract test caps it.
- **Editing shared CSS classes to hit the 4-size typography cap**: use page-scoped `.artifact-page:has(.view-<kind>-…)` rules (UI-SPEC).
- **Reading a whole body with a global regex**: SEC-01 scanner-growth tests exist; new parsers need a growth test.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter parse | New YAML reading | `tryParseFrontmatter` | Cache-bypass and warning behaviour already solved (frontmatter.ts:13-43) |
| Markdown table to rows | New splitter | `parseMarkdownTable` / `splitSections` / `splitSubsections` in `handlers/markdown-sections.ts` | Already used by project, requirements, state, windows |
| Fence-aware section split, hex tokens, labelled fields | New scanners | `splitWithPreamble`, `readFields`, `hexTokenIn`, `leadingIds` in `research-briefing.ts` / `review-report.ts` | Fence-aware and capped |
| Inline markdown in cells | Own renderer | `ResearchInline`, `LeadText`, `inline-markdown.ts` | The tokenizer UI-SPEC says to use |
| Tab strip | New tabs | Generalise `PairSwitch` to `LedgerSwitch` | UI-SPEC and design language |
| Block arrival scroll | Own timer loop | `scrollWhenSettled` (`scroll-settle.ts`) | UI-SPEC section 6 reuses it |
| Warning chip / tone | Own | `artifactWarningTone`, `WarningChip` | One shared derivation |
| Redirect safety | Own checks | `redirectTo()` in route-dispatch | Rejects `//host` and `/\` targets |
| Redirected-file Source link | Per-surface logic | One `sourceUrlOf()` | Drawer, search and dispatch must agree |

**Key insight:** the work is mostly tolerant parsing of messy real files plus wiring; the visual layer is assembly of existing vocabulary. Time goes into fixtures and parser regressions, not components.

## Common Pitfalls

### Pitfall 1: The UI-SPEC "Source" address does not exist
**What goes wrong:** UI-SPEC section 2 says a redirected file's Source button opens "the existing `file/` fallback address" and leaves only its exact form open. `/file/STATE.md` parses as a `document` route whose url is `/file/STATE.md`, but `documentOutcome` matches only `artifact.key`, and a file with a clean address has key `/state`. The server is the same: `lookupRoute` resolves only route-table entries ("A file/ URL of an internal file has no table entry, so it is a miss"). [VERIFIED: route-dispatch.ts:53-56; src/server/artifact-index.ts:73-88]
**Fix:** recommend a query flag on the file's own address (for example `/state?source=1`), checked in the dispatcher's redirect rule using the `search` argument it already receives. No server change: `/documents?route=/state` is unchanged. Also exempt the five redirected kinds from the "no dedicated view" notice on that escape page (they are designed elsewhere), without adding them to `VIEW_KINDS` (the registry test requires manifests and kinds to match). Note SC1: without the exemption the escape hatch shows exactly the notice SC1 forbids.
**Warning signs:** a Source button that 404s; the generic page showing "Labelore doesn't yet have a dedicated view for state documents".

### Pitfall 2: Head totals from REVIEW are wrong when a disposition exists
**What goes wrong:** UI-SPEC 4.2 says totals are over REVIEW findings and open comes from the disposition. Labelore's own phase 8: `08-REVIEW.md` frontmatter `findings.total: 5`, `08-REVIEW-DISPOSITION.md` frontmatter `open: 31`, `total: 32` (rows carry "(not in the current review)"). That head would read "31 of 5 open". cinedise-portal phase 6: REVIEW frontmatter `total: 38` but the extractor parses 0 findings (Pitfall 3), disposition has 38 rows. [VERIFIED: files read; extractor run this session]
**Fix:** when a disposition exists, take BOTH open and total (and the severity split) from the disposition rows; fall back to parsed REVIEW findings, then REVIEW frontmatter `findings.total`, then fix entries. Keep the Review tab's own outcome tally unchanged. This is a deviation from UI-SPEC wording and needs confirmation (Open Question 1).

### Pitfall 3: Finding-ID grammar rejects real IDs
**What goes wrong:** `idEndAt` accepts only 2-4 capitals, a hyphen, 1-4 digits. Real IDs on this machine (counted from fix/review headings): `WR-N` (30), `WR-PN-N` e.g. `WR-P1-01` (18), `C-WR-N`, `B-WR-N`, `A-WR-N`, `D-WR-N`, `C-CR-N`, `A-CR-N`, `C-IN-N`, `D-IN-N`, `FL-CR-N`. Result: `05-REVIEW-FIX-backend.md`, `-frontend.md` and cinedise `08-REVIEW-FIX.md` all parse to 0 entries (fm says fixed 15 / 15 / 18); `05-REVIEW.md` and `06-REVIEW.md` parse to 0 findings. `severityOf` also takes the text before the first hyphen as the prefix, so `A-WR-01` would fall through to the section heading. [VERIFIED: review-report.ts:309-321, 368-377; extractor run output this session]
**Fix:** widen to an optional leading 1-2 capital tag plus hyphen, the 2-4 capital severity token, an optional `P<digits>-` segment, then 1-4 digits; derive severity from the severity token wherever it sits. Keep it a character scan (no regex over the body). Add the real ID shapes to unit tests and to a made-up two-fix-file fixture.

### Pitfall 4: `Commits:` plural and multiple hashes
**What goes wrong:** `**Commits:** 9790a0b, eeb3f45` (and `**Commit:** abc (lint cleanup in def)`) appear in real fix files (81 singular, 4 plural). `pick('commit')` matches only the singular label, so plural rows get no commit. [VERIFIED: grep over real corpus; review-report.ts `SHORT_FIX_KEYS`]
**Fix:** accept `commit` and `commits`; keep the first hash as `commit` and add `commits: string[]` so the Fixed row can show all.

### Pitfall 5: Suffixed fix files are `unknown` and have no right address
**What goes wrong:** `PHASE_ARTIFACT_RE = ^(<phase>)-([A-Z][A-Z-]*)\.md$` requires an all-capital token, so `05-REVIEW-FIX-backend.md` is kind `unknown`, address `/v3.0/phase-5/05-REVIEW-FIX-backend` (free-form). `06-REVIEW-shard-A.md` etc. are the same. GSD itself writes only `NN-REVIEW-FIX.md` (workflows/code-review-fix.md:84), so the suffix is a user convention that CONTEXT D-09 nevertheless locks. [VERIFIED: naming.ts:100; kinds script output; ~/.claude/gsd-core/workflows/code-review-fix.md:84]
**Fix:** one new grammar function `parseReviewFixName` in `naming.ts` (the single grammar module), used by `kindOfPath`/`grammarKindOf`, `artifactTokenOf` (so `ReviewFixHandler.match` claims it) and `phaseFileAddress`/`quickAddress` (address `review-fix-<suffix-lowercased>`, which cannot collide with `review-fix` or a plan segment). Leave `*-REVIEW-shard-*` unknown (not in scope; mention in the plan so it is a decision, not an accident). Check `test/naming.test.ts`, `recognition-kinds.test.ts`, `url-grammar.test.ts`, `route-table.test.ts` (it sweeps all fixture roots for one-URL-per-file).

### Pitfall 6: Disposition files come in three shapes, and "Source" is not always a commit
**What goes wrong:** (a) GSD tool shape: frontmatter `findings: [{id, severity, disposition, title}]` + `open`/`total` + table `Finding | Severity | Disposition | Source` (8 of 11 real files). (b) hand-written 5-column `ID | Severity | Finding | Disposition | Note` with capitalised severity and extra values `accepted`, `wont-fix`, and notes like "needs human check" (duet phase 1). (c) 2-column `Finding | Disposition` with values like `fixed (see 03-REVIEW-FIX.md)` and no frontmatter at all (duet phases 2-3). The Source cell for fixed rows holds a plan id (`06-29`), a fix-file name, a commit, or prose; for deferred/skipped it holds the reason. [VERIFIED: all 11 real files read/grepped this session]
**Fix:** `ReviewDispositionHandler` reads frontmatter `findings` first, then the table (header-driven columns, case-insensitive), classifies the disposition by its LEADING word (`open|fixed|skipped|deferred`, else verbatim into "Other"), derives severity from the ID when the column is absent. For the Fixed group use: commit from the fix file, else the Source/Note text verbatim, else "Commit not recorded" (this refines UI-SPEC, which jumps straight to "Commit not recorded").

### Pitfall 7: Real milestone audits have three shapes, and debt items can be objects
**What goes wrong:** (a) cinedise v2.0: everything in frontmatter, `tech_debt: [{phase, items:[string]}]`, `gaps` empty, `nyquist` lists. (b) labelore v1.0: frontmatter plus extra keys (`supersedes`, `previously_blocking_now_closed[]` with id/prior_status/now/closed_by/evidence, `tech_debt_reconciliation{}`, `nyquist.reason`) and `tech_debt[].items[]` that are OBJECTS `{status: closed, closed_by, description}`. (c) cinedise v1.0 and labelore dense fixture: no verdict in frontmatter; `**Status:** \`tech_debt\` — ...` prose line (or `**Status:** Passed`), `**Audited:** 2026-07-26`. (d) the old test fixtures: a heading and a "Verdict: ..." sentence only. The canonical GSD writer spec is `status: passed | gaps_found | tech_debt`, `scores: {requirements,phases,integration,flows: "N/M"}`, gap objects `{id,status,phase,claimed_by_plans,completed_by_plans,verification_status,evidence}`, `tech_debt: [{phase, items:[string]}]`, `nyquist: {...}`. [VERIFIED: ~/.claude/gsd-core/workflows/audit-milestone.md:196-225; real files read]
**Fix:** normalise in a `MilestoneAuditHandler` into one model: verdict (frontmatter `status`, else the `**Status:**` line, lowercased and snake-cased: "Passed" -> passed, "Tech debt" -> tech_debt; anything else raw => "Verdict not stated" per UI-SPEC), audited date (frontmatter, else `**Audited:**`), scores (`n/m` string, `{n,m}`, percentage, bare number, else verbatim), gaps (array of strings or objects), debt items (string -> ID/status extraction; object -> `description` + `status` + extra fields as a labelled dl; an item whose `status` is `closed` renders in the `complete` tone as closed, not as debt, and is excluded from the "open" total), and every unclaimed frontmatter key as a labelled list (`supersedes`, `previously_blocking_now_closed`, `tech_debt_reconciliation`) so nothing is silently dropped. Do not attempt prose extraction of scores, gaps or debt (only verdict and date); the prose stays in the narrative fold. YAML note: gray-matter parses a date scalar to a `Date` (serialised ISO on the wire by `jsonRecord`).

### Pitfall 8: Windows ledger parsing hazards
**What goes wrong:** (a) the real files fence the JSON with FOUR backticks; `WindowsHandler` extracts with ```` /```json\s*([\s\S]*?)``` ```` (windows.ts:14), which works on a clean ledger but truncates at the first triple-backtick inside a description (GSD's writer rejects only 4-backtick runs in descriptions: broken-windows.cjs `validateDescription` comment). (b) `line` is `null`, a number, or `-`/empty in the table; `phase` is `"01"`, `"03-04"`, `quick/260727-3mo`, `quick-260909-ogb`, `260803-2pr`; `milestone` is an extra key in one file. (c) GSD's closed kind set is `stub, todo, fixme, skipped-test, lint-warning, unmet-truth, unrun-verify, deviation`; show unknown strings verbatim. (d) status set is `open | waived | fixed`. (e) No waived row exists anywhere on this machine (all 24 real rows are open or fixed), so the waived path has no real example; the fixture must supply it. (f) GSD itself throws when frontmatter counts disagree with entries (broken-windows.cjs ~596), so the "counts disagree" notice is only for hand-edited files. [VERIFIED: windows.ts, broken-windows.cjs:107-116, run output of win.mts on three projects]
**Fix:** make the fence match length-aware (opening run of N backticks closes at the next run of at least N), prefer JSON, then table, then frontmatter-only counts. Normalise rows (`id` string, `phase` string or null, `line` number or null, `reason` string or null, dates string or null).

### Pitfall 9: Coverage files have three matrix shapes plus a multi-paragraph "none"
**What goes wrong:** (a) duet: `capability | decision | reason`, decision plain `INTEGRATE`/`OPT-OUT`, reason blank for integrate. (b) cinedise v1.0 phase 4: `# | RC method | Capability | Row | Reason (OPT-OUT only) | Plan` with `**INTEGRATE**` bold, `—` as the empty reason and two plausible "capability" columns. (c) a made-up test fixture (`shapes/02-glaze-recipes`): `Capability | Covered by | Status` with `covered/partial/open`, which is NOT a GSD coverage matrix and must degrade to the generic view. (d) "none" files: one line (`No external API integration: ...`, 9 of 14 real files) or H1 plus several paragraphs (labelore phase 1). [VERIFIED: all 14 real COVERAGE.md files inspected]
**Fix:** column detection by header text, case-insensitive: decision column = `decision` or `row`; capability column = exact `capability` when present, else first of `capability|method|feature`; reason column = header starting `reason`. Strip `**` and backticks from decision values; treat `—`, `-`, empty as "no reason". Classify decision by its leading word (`INTEGRATE`, `OPT-OUT`/`OPT OUT`), else "Other" verbatim. If no decision column exists, leave `coverage.matrix = null` so the page uses the generic view. "None" detection: any paragraph beginning `No external API integration` (case-insensitive); reason = text after the first colon; if a matrix is present as well, the matrix wins.

### Pitfall 10: Outcome classification by substring misreads real decisions
**What goes wrong:** Labelore's own table has "✓ Good — revisit only if corpus size grows substantially", which contains "revisit" but is Good. The template values are `✓ Good / ⚠️ Revisit / — Pending` (templates/project.md:73); duet also uses `✗ Reversed 2026-10-09: ...`. [VERIFIED: PROJECT.md Key Decisions rows; ~/.claude/gsd-core/templates/project.md:73,132-134]
**Fix:** strip leading symbols and variation selectors, take the first word, match `good|revisit|reversed|pending` case-insensitively; anything else is `quiet` with its text as the note. Pin with the real strings in a unit test.

### Pitfall 11: Project-page requirement counts have no source yet
**What goes wrong:** D-05 says counts come from the traceability projection, but `TraceabilityViewModel` has `groups` (checkbox rows of the active tier), `deferredRows/Tiers` (checkbox-less), `counts {total, uncovered, disagreement}`, `coverage` (phase-sourced buckets plus `claimedComplete`), and `archivedMilestones[].total`. It has no out-of-scope rows (they live in the root REQUIREMENTS artifact's `structured.outOfScope`) and no state axis. The traceability filter is "Local component state only — never URL state". [VERIFIED: src/presentation/traceability.ts:20-135, 379-446; traceability-filter.ts:1-30; handlers/requirements.ts]
**Fix:** add one pure function (in `traceability.ts`) `requirementStateCounts(presentation)` returning `{ complete, pending, validated, outOfScope, validatedByMilestone[] }` and use the SAME predicates in the `?state=` seeding. Define `complete` = active-tier rows with `requirementStatus === true`, `pending` = `=== false` (the requirement's own claim; the phase-sourced `coverage` buckets stay on the traceability page as the second signal, never merged), `validated` = checkbox rows of projected archives, `outOfScope` = count of `structured.outOfScope` rows. Needs user confirmation (Assumption A2). Add `shipped` (from `milestoneRecords`) to `TraceabilityArchivedMilestone` for the Shipped chip.

### Pitfall 12: D-03 gap check finds real gaps
**What goes wrong:** The dashboard shows position, last activity, blockers, decisions, on-deck, recent tasks and pace, but nothing reads STATE.md's `## Session Continuity` ("Last session / Stopped at / Resume file"), `## Deferred Items` or `## Operator Next Steps` (grep over src/presentation and src/web/pages found no reader). The roadmap History panel shows only Delivered (summary), Git range and What's next; `MilestoneRecord` carries `accomplishments`, `stats` but the panel does not render them, and `MilestoneEntry.extra` (Closeout, Known verification overrides, Archive, Deferred at close, Timeline, Code...) and `phases` are dropped by `milestoneRecords`. The retrospective dialog lifts only the four point lists: `What Was Built`, `Cost Observations` and `## Cross-Milestone Trends` (present in cinedise-portal and duet) appear nowhere, and a RETROSPECTIVE entry for a version with no History block is invisible. The retrospective dialog has no URL, so `RETROSPECTIVE.md -> the retrospective view` needs a seed mechanism. [VERIFIED: presentation/dashboard.ts:99-138, roadmap-page.tsx:241-299, roadmap.ts:62-77 & 298-322, roadmap-retrospective.tsx, retrospective.ts header comment]
**Fix:** treat each as a planned task with a decision: add the session line (and deferred items) to the dashboard; render the remaining MILESTONES fields in `MilestoneRecordPanel`; give the retrospective a one-time seed (`?retrospective=<version>` read once on arrival, same pattern as the `?state=` seeding) and decide what to do about the unshown sections (Open Question 3).

### Pitfall 13: Test and wiring tripwires
- `VIEW_KINDS has exactly 21 members` and manifest/kind set equality (update, do not weaken).
- `class-vocabulary` test: add `status-square` and the Phase 9 tone-table rows to `docs/design-language.md` first; the test parses `| \`name\` |` rows from that doc.
- Dense golden (`test/__golden__/dense.json`) will change if a handler that matches a dense file changes its `structured` (dense holds PROJECT, WINDOWS and two milestone audits). Regenerate deliberately and review the diff.
- Handler throw-guard tests exist per handler (`*-handler-guard.test.ts`): add one per new handler. Corpus tests read `LB_PLANNING` (this repo's own `.planning/`) and made-up fixtures only.
- `fixture-leak.test.ts` forbids private project names in fixtures: invent names and text.
- New fixtures change counts in tests that list fixture files; `route-table.test.ts` sweeps `ALL_FIXTURE_ROOTS`, so a suffixed fix file in a fixture is covered automatically.
- e2e: spec files are per page; run only the narrowest spec (memory: about 6 minutes per run). The archived-arrival test (UI-SPEC backstop) is the one that genuinely needs a browser.

### Pitfall 14: UI-SPEC and shipped code disagree about headers
UI-SPEC says every page uses `ArtifactHeader` unmodified. The shipped per-type views (review, todo, debug, learnings, summary...) render their own heads inside their `*View` components, and `ArtifactHeader`'s `cover` slot is `{facts, cells}` inside `.document-cover`, not a two-column band. For the project page, UI-SPEC already says to record a deviation in `docs/design-language.md` if `cover` cannot host the masthead; plan for that deviation rather than discovering it in the build. [VERIFIED: components/artifact-header.tsx; artifact-page.tsx:960-1020]

### Pitfall 15: Typography cap is per page and traps shared classes
`.section-heading h2` is `--fs-fluid-3` (UI-SPEC checker note); do not use it on the four non-project pages. Page-scoped overrides only. `Button` renders 12px uppercase; the cap needs `--fs-2` overrides for tab and toggle buttons on these pages.

### Pitfall 16: Hostile input
Every new scanner takes untrusted bodies. Follow the linear-scan, cap-first rule and add a growth test next to `test/scanner-growth.test.ts` (thousands of table rows, very long lines, long runs of `|`, `*`, backticks).

### Pitfall 17: YAML 1.1 numbers in frontmatter
gray-matter's YAML reads `[01, 04, 08, 010, 10]` as `[1, 4, "08", 8, 10]` (verified by running it). Audit `nyquist.*_phases` lists therefore arrive as mixed numbers and strings and `010` becomes 8. Display phase list entries with `String(n).padStart(2,'0')` for numbers and verbatim for strings; accept that a rare `010` is unrecoverable.

## Code Examples

### Widened finding-id scan (character scan, no regex over bodies)
```ts
// Source: derived from src/planning-repo/handlers/review-report.ts:309-321 (current idEndAt)
// Accepts: WR-01, CR-1, IN-12, A-WR-01, C-CR-01, FL-CR-01, WR-P1-01, D-IN-03
// Current rule (verbatim comment, line 308): "Two to four capitals, a hyphen, one to four digits at `pos`; the end index or -1."
// New rule: [tag:1-2 capitals + '-']? severity:2-4 capitals + '-' [P<digits> + '-']? digits:1-4, then not alphanumeric.
```
Test strings to pin (all from the real corpus): `WR-04 / WR-05`, `C-WR-08 / D-WR-01`, `WR-P1-01`, `A-CR-01`, `FL-CR-01`.

### Outcome classification
```ts
// Source: PROJECT.md Key Decisions rows + ~/.claude/gsd-core/templates/project.md:73
const first = outcomeCell.replace(/^[^A-Za-z]+/, '').split(/\W+/, 1)[0]?.toLowerCase();
// good | revisit | reversed | pending -> tones complete | in-flight | missing | quiet; else quiet + text as note
```

### Redirect rule (shape only)
```ts
// route-dispatch.ts, 'document' case, after the alias check:
const redirect = rootDocumentOutcome(artifactForUrl(route.url), presentation, search);
if (redirect !== null) return redirect;          // never when search carries the Source flag
return documentOutcome(route.url, presentation) ?? NOT_FOUND;
```

### Ledger head counts (precedence)
```ts
// 1) disposition rows exist  -> total = rows.length; open = rows with disposition==='open'; severity from row/ID
// 2) else REVIEW findings parsed -> total = findings.length; no open count (UI-SPEC)
// 3) else REVIEW frontmatter findings.total; 4) else fix entries.
// mark = disposition 'open' && a fix entry (any fix file) with the same id and outcome 'fixed'
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic fallback for every unpaged kind | Per-type view via manifest field | v1.1 Phase 5 | This phase extends the same seam |
| Clean address only by exact artifact token | Position-gated name grammar + route table with `file/` fallback | v2.1 Phase 7 | Suffixed fix files need a deliberate grammar row |
| Filters in component state | Query seeding read once, never written back (project-page tiles) | This phase (UI-SPEC) | Traceability gains `?milestone=` / `?state=` |

**Deprecated/outdated:** none relevant.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Disposition total (not REVIEW total) should drive the shared head's "of N" when a disposition exists | Pitfall 2 | UI-SPEC 4.2 says REVIEW totals; if the user insists, phase 8's head reads "31 of 5 open" |
| A2 | `complete`/`pending` tile counts use each requirement's own checkbox (`requirementStatus`), `validated` counts checkbox rows of projected archives, `out of scope` counts the root REQUIREMENTS `Out of Scope` table rows | Pitfall 11 | Tiles could disagree with a user's mental model of "complete" (phase-sourced coverage is the other signal) |
| A3 | A query flag (for example `?source=1`) is an acceptable Source escape hatch in place of the `file/` address | Pitfall 1 | If the user wants a path-like address, a server route-table change is needed instead |
| A4 | Leave `*-REVIEW-shard-*` files unrecognised in this phase | Pitfall 5 | Shard files stay `unknown`; user may expect them in the ledger |
| A5 | Prose extraction for audits is limited to verdict and date | Pitfall 7 | Prose-only audits show no scores, gaps or debt rows (narrative open instead) |
| A6 | An audit debt item with `status: closed` is shown as closed (complete tone) and excluded from the debt total | Pitfall 7 | Totals differ from the audit author's "closed_count" wording only if they count differently |
| A7 | Fixed-row detail falls back to the disposition's Source/Note text before "Commit not recorded" | Pitfall 6 | Minor copy deviation from UI-SPEC |
| A8 | The five redirected kinds are exempted from the unrecognised-type notice on their Source escape page | Pitfall 1 | Otherwise the "no dedicated view" notice appears (SC1) |

## Open Questions

1. **Contract conflicts to resolve before planning (two)**
   - What we know: UI-SPEC 4.2 (head totals over REVIEW findings) and UI-SPEC section 2 (Source via `file/`) both fail against real data/code (Pitfalls 1-2).
   - What's unclear: whether the user accepts the recommended replacements (A1, A3).
   - Recommendation: take the replacements; note them in the plan as explicit, user-confirmed deviations.

2. **Which requirement-state definition for the tiles (A2)?**
   - What we know: only checkbox state and phase-sourced coverage exist; D-05 forbids PROJECT.md's own bullets.
   - Recommendation: checkbox-based as in Pitfall 11, with the phase-sourced split left on the traceability page.

3. **How far to fill the D-03 gaps?**
   - What we know: session line and deferred items missing from the dashboard; MILESTONES extra fields, accomplishments and stats missing from History; RETROSPECTIVE's built/cost/trends sections and orphan versions missing; retrospective has no address.
   - Recommendation: fill (a) the STATE session line on the dashboard, (b) the remaining MILESTONES fields in `MilestoneRecordPanel`, (c) retrospective seeding; for the unshown retrospective sections record an explicit accepted gap unless the user wants a folded "More from this retrospective" block. This is a user decision because it changes two existing pages beyond the stated scope.

4. **Windows kinds `fixed` history: collapse by phase when phase strings are mixed**
   - Group key is the verbatim phase string (UI-SPEC); `03-04` and `quick/260727-3mo` are separate groups. Acceptable; confirm in the screenshot review.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | Build, tests, snapshot CLI | yes | v22.23.1 [VERIFIED: node --version] | — |
| Real corpora for shape reading | Fixture design (read only) | yes | `~/codebases/{cinedise-portal,duet,labelore}`; `studio-windows` and `cinedise-portfolio` hold none of the files in scope | — |
| Playwright + browsers | Archived-arrival and screenshot checks | not probed this session | per package.json | Run only the narrow spec, per memory rule |
| Running `labelore` service | Visual review on the user's instance | not probed | — | Restart after every change (memory rule) |

No missing dependency blocks planning.

## Security Domain

`security_enforcement` is enabled (ASVS level 1). [VERIFIED: .planning/config.json]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication / V3 Session | no | Local read-only tool |
| V4 Access Control | yes (narrow) | Redirect targets must stay project-relative: reuse `redirectTo()`; the Source flag must only bypass the redirect for the fixed redirect set, never open an internal file (D-11 not-found rule stays) |
| V5 Input Validation | yes | Every new parser: caps before scanning, linear scans, guarded by try/catch, never throws; query params (`?state=`, `?milestone=`, retrospective, Source flag) ignored silently when unrecognised |
| V6 Cryptography | no | — |
| V12 Files/Resources | yes | Read-only: no new fs access; handlers receive content from the existing port |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Hostile markdown/YAML causing quadratic scans (ReDoS) | Denial of service | Bounded single-line scans, size caps, growth tests (SEC-01) |
| Open redirect via a crafted address/param | Spoofing | Targets come from the payload; `redirectTo` rejects `//` and `/\` |
| Raw HTML injection through audit/decision text | Tampering | Render through the existing tokenizer/`LeadText`; the standing raw-HTML guard (`raw-html-guard.test.ts`) allows one site only |
| Information disclosure of an internal file via the Source flag | Information disclosure | Flag honoured only for artifacts already in the table and in the redirect set |
| Secret in a planning file shown on a new page | Information disclosure | Existing masking applies to `config.json` only; these pages show planning prose; no new secret surface |

## Sources

### Primary (HIGH confidence, read this session)
- Codebase: `src/web/route-dispatch.ts`, `src/presentation/{routes,route-table,reserved,review-context,traceability,roadmap,drawer,tree,dashboard,dashboard-head}.ts`, `src/planning-repo/{naming,folders}.ts`, `src/planning-repo/handlers/{index,review,review-report,windows,project,milestones,retrospective,requirements,state,frontmatter-only}.ts`, `src/server/{project-api,artifact-index,project-presentation}.ts`, `src/web/views/{kinds,manifests,manifest,fallback}.ts`, `src/web/pages/{artifact-page,plan-pair-page,roadmap-page,roadmap-retrospective,roadmap-deep-link,scroll-settle,traceability-page,traceability-filter,document-route}.tsx|ts`, `src/web/components/{pair-switch,artifact-header}.tsx`, tests (`view-registry`, `view-page-contract`, `class-vocabulary`, `review-handler-guard`, `fixture-project`).
- GSD runtime: `~/.claude/gsd-core/workflows/audit-milestone.md:196-225`, `workflows/code-review-fix.md:84`, `bin/lib/broken-windows.cjs` (kinds, statuses, validation), `templates/project.md:73,132-134`.
- Real files: cinedise-portal, duet, labelore `.planning/` (WINDOWS, audits, COVERAGE x14, 11 REVIEW-DISPOSITION, 9 REVIEW-FIX, PROJECT/STATE/MILESTONES/RETROSPECTIVE) read for shape only; extractor/handler behaviour measured by running the repo's own code against them via scratch scripts (kinds, windows, review-fix).
- Phase inputs: 09-CONTEXT.md, 09-UI-SPEC.md, sketch 041 README, REQUIREMENTS.md, ROADMAP.md.

### Secondary / Tertiary
- None. No web sources were needed; all claims are about this repository and files on this machine.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (no additions; versions read from package.json)
- Architecture: HIGH (every integration point read and traced)
- Pitfalls: HIGH for items 1-11 (reproduced with the repo's own code or read from real files); MEDIUM for recommended fixes (A1-A8 need confirmation)

**Research date:** 2026-11-02
**Valid until:** 2026-11-30 (the real corpora and the codebase change with every phase; re-run the shape checks if Phase 8/10 land first)

## Resolved by the user after research (2026-11-02)

These answers were given after research and before planning. They override the matching
recommendations, assumptions and open questions above, and are user-confirmed deviations from
UI-SPEC where noted.

| Item | Decision |
|------|----------|
| A1 / Open Question 1: review head totals | **Disposition first.** When a disposition exists, both open and total come from it. Otherwise fall back to parsed REVIEW findings, then REVIEW frontmatter, then fix entries. A user-confirmed deviation from UI-SPEC 4.2. |
| A3 + A8 / Open Question 1: Source escape hatch | **Query flag on the file's own address** (for example `?source=1`) shows the generic rendered document. No server route change. The five redirected kinds are exempt from the "no dedicated view" notice on that page. A user-confirmed deviation from UI-SPEC section 2's `file/` wording. |
| A2 / Open Question 2: requirement-state tiles | **Checkbox-based**, exactly as Pitfall 11 defines it. The same predicates drive the `?state=` / `?milestone=` seeding into traceability. |
| Open Question 3: D-03 gaps | **Fill:** (a) the STATE.md session line on the dashboard (Session Continuity, with Deferred Items and Operator Next Steps); (b) the remaining MILESTONES fields (accomplishments, stats, phases and the extra fields) in `MilestoneRecordPanel`. **Do not build:** retrospective seeding (no `?retrospective=` mechanism; the RETROSPECTIVE.md redirect lands on the retrospective view without picking an entry) and the unshown retrospective sections (What Was Built, Cost Observations, Cross-Milestone Trends, and versions with no History block). Record both as accepted gaps against D-03. |
| A4 | Taken as recommended: `*-REVIEW-shard-*` files stay unrecognised this phase (recorded decision). |
| A5, A6, A7 | Taken as recommended. |
