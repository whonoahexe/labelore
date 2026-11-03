# Phase 10: Codebase Map, Specification and Check Pages - Research

**Researched:** 2026-11-04
**Domain:** Labelore internals (handlers, presentation builders, view registry, route dispatch, project resolver, fixtures and tests) plus the real shapes GSD 1.19.0 writes for the seven codebase-map documents, SPEC, AI-SPEC, USER-SETUP, EVAL-REVIEW, DOM-VERIFY and REVIEWS
**Confidence:** HIGH on codebase facts and on writer/template shapes (all read this session); MEDIUM on the lift rules for real map variety (no real map exists on this machine yet, D-03); LOW on how real LLM-authored AI-SPEC, REVIEWS reviewer bodies and DOM-VERIFY criterion lines look (never produced here)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Codebase map shape
- **D-01:** The seven map documents sit on **one Codebase page with a panel per document**, the way
  the Research page holds its five files (sketch 031 frame, panels 032–037). Each document keeps its
  own URL (`/<project>/codebase/stack`, `…/architecture`, …; Phase 7 URL scheme), and that URL opens
  the page on its panel. Panels are cross-read (stack ↔ integrations, architecture ↔ structure),
  which is why they share one page.
- **D-02:** Lifting is by **fuzzy heading match**, never exact name (real maps vary: "Languages &
  Runtimes", an added "API Architecture", the older `*Last updated*` footer). What matches is lifted
  into the panel's design; sections that do not match render as **plain readable sections below the
  lifted part, never dropped**. A document missing from the folder (a partial `/gsd-scan` map) shows
  as "not mapped" in the panel list, and the page says whether the map is fast/partial or complete
  (GSD's `map_readiness`: `none` / `fast` / `complete`, `core/bin/lib/onboard-projection.cjs`).
- **D-03:** Real shape inputs are **fresh maps generated now**: run `/gsd-map-codebase` on
  `labelore`, `~/codebases/cinedise-portal` and `~/codebases/duet`. The maps the v2.1 research
  observed under `~/Work/…` (rhub, plan.sideby.me, cman, pyeicon) are no longer on this machine. The
  fresh maps are the "real codebase maps on this machine" of success criterion 1: read for shape and
  heading variety only, never copied into fixtures (Phase 6 rule). Running the mapper writes
  `.planning/codebase/` into each repo, which the user accepted; for labelore it also fills the
  "Architecture not yet mapped" gap in CLAUDE.md.

### Mapped, not started
- **D-04:** A project counts as **mapped, not started** when `.planning/codebase/` exists and there
  is **no `ROADMAP.md` and no phases**. Stray extras (a `CHANGELOG-*.md`, `ui-reviews/`, a lone
  `PROJECT.md`) do not stop it, and they stay reachable from the drawer. Once a roadmap appears, the
  normal dashboard and tabs return.
- **D-05:** The project's first screen is a **short head over the Codebase page's panels on the same
  screen**: "Mapped, not started", when the map was made (and the commit stamp where the map carries
  one, as text only, since the read-only filesystem cannot compare against HEAD), fast or complete,
  the stack and the concerns lifted (concern counts per section, security first), then the panels
  of D-01 below. One page, nothing rendered twice.
- **D-06:** The head shows **GSD's suggested next step as a copyable command**, following
  onboard-projection's rules: `/gsd-new-project` for a complete map, `/gsd-ingest-docs` when
  ADR/PRD/SPEC documents exist, "finish the map" (`/gsd-map-codebase`) for a fast map. It is text
  with a copy button; Labelore never runs it.
- **D-07:** For a map-only project the header **hides Roadmap and Traceability**, so no tab or link
  leads nowhere (success criterion 2).
- **D-08:** A `.planning/` with **neither a map nor a roadmap** (e.g. ui-reviews only) is **out of
  scope** and keeps today's behaviour.
- **D-09:** Opening must work from the **project path or the `.planning` path**, from the CLI, the
  switcher and the folder scan. Today `src/cli/target-path.ts` `hasProjectMarker` requires
  `PROJECT.md` or `STATE.md` when pointed at `.planning` directly; a `codebase/` folder must also
  qualify there, through the same single resolver (Phase 8 D-17: no second parser).

### Made-up example rule (VIEW-21)
- **D-10:** Every made-up example is **labelled in the file itself and listed in a fixtures index**:
  a marker in frontmatter (or an HTML comment where the type has no frontmatter) saying it is a
  made-up example and naming the GSD template or writer it is derived from and the gsd-core version,
  plus a README in the fixtures folder listing every example with its source. **A test fails if a
  made-up example lacks the marker or is missing from the index.** The app's UI does not know about
  the marker and shows no "made up" chip. — **Reversibility:** reversible — a UI chip could be added
  later by reading the same marker.
- **D-11:** Examples are produced by **filling GSD's template by hand** (`gsd-core/templates/spec.md`,
  `AI-SPEC.md`, `user-setup.md`, the eval-review / DOM-verify / reviews writers in
  `gsd-core/workflows/` and `agents/`) with invented Lendshed content. They must cover the hard
  shapes the pages promise: an AI spec with sections still unfilled template slots, a spec below the
  ambiguity gate and one above it, a user setup with some steps done and variables whose values must
  never show, a browser check that "could not look" and one with "nothing to report", and a cross-AI
  review where reviewers disagree.
- **D-12:** Examples live **in the Lendshed fixture** (`test/fixtures/lendshed/.planning/phases/…`)
  so they open in context beside Phase 9's invented data. A map-only fixture (needed for D-04..D-09
  tests and e2e) is also made up, derived from the map-codebase templates, labelled the same way;
  where it sits is the planner's choice.
- **D-13:** The rule binds **every later type with no real example on this machine** (Phase 11's
  spikes, threads, reports, intel, workstreams): same marker, same index, same test.

### Sketch loop
- **D-14:** Sketches run in **frame + per-document panel** form, mirroring Research 031 → 032–037:
  one frame sketch for the Codebase page together with the mapped-not-started head; a panel sketch
  per map document where it earns one (Architecture, Concerns and Stack likely; Conventions and
  Testing may share one); then one sketch each for Spec, AI spec, User setup, Eval review, Browser
  check and Cross-AI reviews. Each sketch gets a fresh page frame (keeps tokens, chips and tones),
  and each build is screenshot-checked beside its sketch on the sketch's docs and on the hardest
  real or made-up docs before it is called done.
- **D-15:** **Sketch inputs are the real files**: the fresh maps (D-03) for the codebase sketches and
  the made-up Lendshed examples (D-11) for the six spec/check sketches. So the fresh maps and the
  made-up examples are written **before** those sketches, and the sketch, the build and the tests
  all read the same files.

### Claude's Discretion
- **Map navigation in a normal project** (one with a roadmap and a map): the planner picks, matching
  how Research is reached today (drawer and search at least; a header entry only if Research has one).
- **Sketch timing against `/gsd-plan-phase 10`:** the planner sequences it. Suggested: maps and
  made-up examples first, then the codebase frame and the six spec/check sketches before planning,
  with per-panel codebase sketches allowed inside the phase as a sketch → quick loop per panel.
- What each spec/check page leads with, beyond success criteria 3 and 4, is left to its sketch.

### Deferred Ideas (OUT OF SCOPE)
- A first screen for a `.planning/` with neither a map nor a roadmap (e.g. ui-reviews only), such as
  a "not mapped" head with `/gsd-map-codebase`. Not in this phase (D-08).
- A visible "Made-up example" chip in the UI when a file carries the marker (D-10 reversibility).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIEW-13 | The seven codebase-map documents open into designed pages | Real writer templates for all seven (mapper agent), fuzzy-heading lift design, concern-counting finding (Pitfall 1), fence-aware splitting (Pitfall 2), readiness and date rules, view-kind registration (Pattern 3, Pitfall 9) |
| TGT-09 | A map-only project opens from project or `.planning` path and lands on "mapped, not started" | Single-resolver change (Pattern 5), map-state gate shared by shell and dashboard (Pattern 4), next-step precedence from `onboard-projection.cjs` (Pattern 6), navbar-contract pins (Pitfall 10) |
| VIEW-11 | Spec, AI spec and user setup open into designed pages | Template and writer shapes, gate and unfilled-slot rules (Specification family section), value-withholding design (Pitfall 12) |
| VIEW-12 | Eval review, browser check and cross-AI reviews open into designed pages | Auditor and verifier output contracts, REVIEWS writer structure incl. nested plan-id headings and stub texts (Check family section) |
| VIEW-21 | Every type with no real example is built and tested against a labelled made-up example | Marker, index and test design (Pattern 8), fixture placement and coverage matrix, leak-guard traps (Pitfall 14) |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- Read-only: the tool must be incapable of damaging planning state; `node:fs` stays confined to `local-fs.ts`. Nothing in this phase may add a write path. The copy button reads the page and writes to the clipboard only. [VERIFIED: .claude/CLAUDE.md "Access" constraint]
- Compatibility: unknown files and shapes must degrade, not break (every page needs a generic fallback). [VERIFIED: .claude/CLAUDE.md "Compatibility"]
- Design: visual language lives in `docs/design-language.md`; `test/web/class-vocabulary.test.ts` enforces it. New shared class names need a table row in that doc BEFORE the test runs; `view-<kind>-*` names are auto-allowed only for kinds in `VIEW_LOCAL_PREFIXES`. [VERIFIED: test/web/class-vocabulary.test.ts header; src/web/views/kinds.ts]
- No runtime, code or data dependency on studio-portal; fixtures are made-up only (public repo, Phase 6 rule).
- Tech stack is fixed: Vite 8.2.2 + React 19.2.8 + Hono 4.13.4, react-router 8.3.0, @tanstack/react-query 5.102.3, vitest 4.1.11, Playwright 1.63.0. [VERIFIED: package.json] No new dependency is needed (see Standard Stack).
- GSD workflow enforcement: file changes go through a GSD command. Project memory rules that bind execution: restart the `labelore` systemd user service after every change (CSS included); run Playwright e2e only when necessary, narrowest spec, about 6 minutes per run; screenshot the build beside its sketch before calling a view done; colours only from design-language tones and never `destructive` for content; every sketch gets a fresh page structure; ask what is off before "polishing" a liked sketch variant.
- Treat 10-UI-SPEC.md (approved 2026-11-03) and CONTEXT as locked. Where this research found a contradiction with the UI-SPEC it is listed under "Contract conflicts" and must be resolved by the planner and the user, not silently overridden.

## Summary

Phase 10 adds one new view family (the Codebase page: seven documents, one page, a panel per document, plus a map-only first screen), six new per-type views (spec, ai-spec, user-setup, eval-review, dom-verify, reviews) and a labelled made-up-example rule. Everything fits Labelore's established pipeline: a handler produces `structured.*` (never throwing), a pure `compose*` function in `src/web/views/` turns `ViewInput` into a model, a manifest field opts a kind in, and `artifact-page.tsx` renders it. **No new npm package is needed or recommended.** The kinds and addresses for the six types already exist: I created a Lendshed copy with `01-SPEC.md`, `01-AI-SPEC.md`, `01-USER-SETUP.md`, `01-EVAL-REVIEW.md`, `01-DOM-VERIFY.md` and `01-REVIEWS.md` and the served presentation gave kinds `spec`, `ai-spec`, `user-setup`, `eval-review`, `dom-verify`, `reviews` at `/v1.1/phase-1/<kind>`. The seven map documents already carry kinds `codebase-stack` ... `codebase-concerns` at `/codebase/<doc>`. [VERIFIED: ran the server on a scratch copy, 2026-11-04]

The most important findings are mismatches between the approved UI-SPEC and real code or real writer output, so the plan must resolve them explicitly (all listed under "Contract conflicts to resolve" below). The biggest: (1) the mapper's CONCERNS template writes each concern as a bold label line followed by `- Issue:` / `- Files:` field bullets, so the UI-SPEC's "count top-level list items" rule would count fields, not concerns; (2) the existing `Toast` always renders with `data-tone="destructive"` and the house copy button does not use a toast at all; (3) the UI-SPEC's "existing warning chip and notice" fallback text does not exist in `src/`, and Phase 9 shipped the silent fall-through to the promoted-block view instead; (4) real frontmatter `last_mapped_at: 2026-11-03` parses to a `Date` at UTC midnight, and an all-digit `last_mapped_commit` parses to a number; (5) the eval-review file writes infrastructure statuses like "Installed / Configured / Not found", not `ok/partial/missing`; (6) the DOM-VERIFY writer records neither a target nor a time.

D-03's fresh maps do not exist yet: `~/codebases/*/.planning/codebase/` is absent on this machine (checked 2026-11-04) and so is every made-up example. Neither can be created by a research agent. Tests can never read `cinedise-portal` or `duet` (the standing no-skips guard forbids real paths); only labelore's own committed `.planning/codebase/` can feed a corpus test, and it must be asserted by shape, never pinned (the Phase 9 WR-05 lesson). The rest of the machine's "real map" evidence reaches the build through the sketch and screenshot-check loop, run by hand.

**Primary recommendation:** Plan in five layers, in this order: (A) recognition, lifts and handlers for the seven map documents and the six types, each with fixtures and a handler-guard test, written together with the labelled made-up examples, the fixtures index and the marker test; (B) pure presentation modules (codebase model with readiness, dates, concern counts and next step; `projectMapState`; the resolver change for a `.planning` path); (C) shell and dispatch changes (header gate, map-only dashboard, copy-command row, navbar-contract updates); (D) one view per page, each preceded by a human sketch checkpoint (sketch numbers start at 042) and followed by a screenshot check beside the sketch; (E) closing sweep (both widths and themes, hard reloads, map-only e2e from all four entry paths, full `test:gate`). Keep the waves serial, as Phase 9 did, because every view build touches the same wiring files.

### Contract conflicts to resolve (put in the plan as explicit, user-confirmed deviations)

| # | UI-SPEC says | Reality (verified) | Recommendation |
|---|--------------|--------------------|----------------|
| C1 | A file the page cannot shape opens the generic view "with the existing warning chip and notice" ("This file has a shape this page did not expect...") | That sentence exists only in the Phase 9 and Phase 10 UI-SPEC text, nowhere in `src/` [VERIFIED: grep "did not expect" over src and docs, no hit]. For a registered kind whose composer returns `null`, the page falls to the promoted-block / full-document view with no notice; Phase 9 verification records "composers return `null` for an unshapeable file so the generic document view (recognised, no notice) takes over" [VERIFIED: 09-VERIFICATION.md row 5]. The only notice (`UnrecognizedNotice`) is for kinds with no manifest [VERIFIED: src/web/pages/artifact-page.tsx:566-583, src/web/views/fallback.ts] | Mirror Phase 9 (silent fall-through, parse-warning chip only when the artifact itself carries warnings). Adding a notice is a user decision |
| C2 | "Copied" confirmation through "the existing toast ... as `copy-path-button.tsx` already does" | `CopyPathButton` does not use a toast: it swaps a `Copy` icon for `Check` for 1.5 s and writes an sr-only `role="status"` string [VERIFIED: src/web/components/copy-path-button.tsx]. The only toast producer is the refresh-failure toast, and `ToastList` renders every toast with `data-tone="destructive"` [VERIFIED: src/web/components/ui/toast.tsx:29 `<Toast.Root key={toast.id} toast={toast} className="toast" data-tone="destructive">`], which contradicts "destructive is not used by this phase" | Reuse `copyText()` and the in-button confirmation (label flips to "Copied", icon to `Check`, sr-only status). Do not edit the shared Toast. Change the UI-SPEC backstop "the toast appears" to "the button reads Copied" |
| C3 | Concern count = "top-level items under that heading (list items, table rows, or `###` subsections)" | The mapper's CONCERNS template is bold-label groups with field bullets (quoted in Pitfall 1), so top-level bullets are the fields of one concern | Counting rule in Pitfall 1; confirm against the three fresh maps before freezing it |
| C4 | Eval review infrastructure statuses are `ok`, `partial`, `missing` | Those are the words fed to the score verb. The file the auditor writes uses per-component words: "Installed / Configured / Not found", "Present / Partial / Missing", "Implemented / Partial / Missing", "Configured / Not configured" [VERIFIED: ~/.claude/agents/gsd-eval-auditor.md write_eval_review template] | Normalise by a small word table (Pattern 7); show the file's own word verbatim beside the tone |
| C5 | Browser check shows "the target that was checked and when" | The DOM-VERIFY contract has only `schema_version, wave, outcome, reason, checked, passed, failed, needs_review` in frontmatter and "one line per criterion" in the body [VERIFIED: ~/.claude/agents/gsd-dom-verifier.md output-contract]. No target, no timestamp | Show target and time only if the body states them; do not use file mtime (a clone's mtime is checkout time) |
| C6 | Map navigation in a normal project: "a header entry only if Research has one" (CONTEXT); UI-SPEC adds none | Research does have one: a Research tab gated on `projectHasResearch` [VERIFIED: src/web/components/app-shell.tsx:47-48, 94-100]. CONTEXT's discretion rule therefore permits a Codebase tab; the UI-SPEC says it adds none. A sixth tab also strains the two-row top bar at 390 px | No new header tab. Drawer and search reach the page (they already list the seven files). For a map-only project the dashboard IS the Codebase page |
| C7 | `/{project}/codebase` with no doc "opens the first mapped panel" | There is no such address: `codebaseKind` yields kinds only for the seven file names, and `folderAddress` builds `/codebase/<doc>` only [VERIFIED: src/planning-repo/folders.ts:106-113; src/presentation/routes.ts folderAddress]. A bare `/codebase` is a not-found | Add a redirect-only dispatch case (like the bare milestone redirect, `redirectTo` in route-dispatch.ts) or drop the sentence. Cheap to add, easy to test |
| C8 | Whether the Codebase page registers one view kind or seven (open item 3) | Manifests are keyed by `artifact.kind`; `VIEW_MANIFESTS` keys must equal `VIEW_KINDS` and `resolveView(kind)` is a plain lookup [VERIFIED: test/web/view-registry.test.ts; src/web/views/manifests.ts resolveView] | Register ONE view kind `codebase` and add a tiny pure `viewKindOf(artifactKind)` (maps `codebase-*` to `codebase`) used by `resolveViewFor`. Seven kinds would make the class prefix `view-codebase-stack-*` and bloat the registry test |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Recognise the seven map files and six type files | Read layer (`planning-repo/folders.ts`, `naming.ts`) | Presentation (`routes.ts` address) | Already done; position and name decide kind, never content (DATA-02). Verified, no change needed |
| Fuzzy heading lift of a map document; date and commit stamp; concern counts | Read layer handler (`structured.codebase`) | — | Untrusted bodies are scanned server-side with caps and linear scans; the page receives a projection (same as `ProjectResearchHandler`) |
| Spec, AI-SPEC, USER-SETUP, EVAL-REVIEW, DOM-VERIFY, REVIEWS extraction | Read layer handlers (`structured.<type>`) | — | Same reason. USER-SETUP must never put a variable value in `structured` (the whole `structured` record ships to the browser in `/presentation`) |
| Map readiness, "when mapped", next-step command, panel list, concern totals | Presentation (`presentation/codebase-map.ts`, pure, a leaf) | Server `/documents` (`codebaseContext`) and a new `/codebase` endpoint | Needs all seven documents of the cached presentation at once, like `buildLedgerContext` and `buildResearchViewModel` |
| "Is this project map-only" gate | Presentation leaf (`projectMapState(artifacts)`, a tiny module like `project-research-files.ts`) | Web shell, router, dashboard | The shell imports it into the entry chunk; it must not drag a builder with it (Phase 9 WR-03 import-cycle lesson) |
| Opening from `.planning` path, CLI, switcher, scan | CLI/registry (`cli/target-path.ts` `resolveTargetPath`, the one resolver) | `planning-repo/folders.ts` (the seven names) | One resolver serves the CLI, the registry add path, the scan result add and the snapshot CLI [VERIFIED: grep resolveTargetPath callers: snapshot.ts, project-registry.ts:83, :296, :639] |
| Hide Roadmap and Traceability tabs; map-only dashboard | Browser (`app-shell.tsx`, `app-router.tsx`) | — | Local derivation from the loaded presentation, no new state |
| Panel selection | Browser (URL: a real `Link`, `aria-current="page"`) | — | Back button and deep link work; no client-only state |
| Copy command | Browser (`copyText()`) | — | Clipboard write only; command strings are constants chosen by a pure function, never text taken from a file |
| Composing page models | Web views (`src/web/views/*.ts`, pure) | — | Existing pattern; unit-testable without jsdom |
| Made-up example marker, index and test | Test and fixture contract | — | No visual surface; the UI never reads the marker (D-10) |

## Standard Stack

No new libraries. Everything below is already in `package.json`. [VERIFIED: package.json read this session]

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react / react-dom | 19.2.8 | Page components | Existing stack |
| react-router | 8.3.0 | `Link` (via `src/web/nav.tsx`), route switch | Existing; use `Link` from `../nav.tsx`, never react-router's |
| @tanstack/react-query | 5.102.3 | `/codebase` fetch for the map-only first screen, key `projectKey(slug, 'codebase')` | Existing; `projectKey` is the only key builder (`src/web/query-keys.ts`) |
| gray-matter 4.0.3 (through `tryParseFrontmatter`) | 4.0.3 | Frontmatter of map docs, DOM-VERIFY, REVIEWS | Never call gray-matter directly |
| lucide-react | 1.34.0 | Icons (`Copy`, `Check`, a distinct icon for "could not look") | Existing |
| vitest | 4.1.11 | Handler, composer, presentation, contract and corpus tests; `npm run test:gate` is the zero-skip gate | Existing |
| @playwright/test | 1.63.0 | Map-only entry-path spec, screenshot sweep, hard reloads | Existing; run narrowest spec only |

### Supporting (in-repo seams to reuse, not install)
| Seam | Path | Use |
|------|------|-----|
| `tryParseFrontmatter` | `src/planning-repo/frontmatter.ts` | All frontmatter; never throws |
| `splitSections`, `splitSubsections`, `parseMarkdownTable`, `parseChecklistItems` | `src/planning-repo/handlers/markdown-sections.ts` | Section and table scans. NOT fence-aware (Pitfall 2) |
| `tokenizeInline` | `src/web/views/inline-markdown.ts` | The only path author text reaches the DOM (text, code, strong, em) |
| `FigureFor`, `CleanTreeFigure`, `LaneDiagramFigure`, `PlainDiagram`, `FigureFrame` | `src/web/components/fenced-figure.tsx` et al. | Architecture diagram and Structure tree; view-agnostic |
| `copyText` | `src/web/components/copy-path-button.tsx` | Clipboard write with execCommand fallback |
| `ArtifactHeader`, `LedgerSwitch`/`PairSwitch` | `src/web/components/` | Header unmodified; nav-style switch with `aria-current` |
| `resolveTargetPath` | `src/cli/target-path.ts` | The one path resolver |
| `buildLedgerContext` pattern | `src/presentation/review-ledger.ts` + `src/server/project-api.ts` IIFE | Server-side join delivered on `/documents` |
| Test helpers | `test/helpers/fixture-project.ts`, `fixture-roots.ts`, `growth.ts`, `design-vocabulary.ts` | Load Lendshed through the real repository; linear-growth proof; vocabulary parse |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-written line scanners in handlers | A markdown AST (remark is already a dependency of the renderer) | The renderer pipeline is for HTML; handlers have a standing rule: line scans, caps, never a whole-document regex (T-01-11), each with a growth test. Stay with scans |
| New `ProjectPresentation.shape` field (v2.1 research suggestion) | Pure `projectMapState(artifacts)` | A function keeps the wire payload and presentation goldens unchanged and is importable by the shell without a builder. Recommend the function |

**Installation:** none.

**Version verification:** not applicable (no package added). Runtime check: Node v22.23.1 [VERIFIED: node --version], `package.json` engines `>=22.18.0`.

## Package Legitimacy Audit

No external packages are installed in this phase, so the package legitimacy gate does not apply and no `[SUS]` or `[SLOP]` verdicts exist.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                       .planning/codebase/*.md (7)        .planning/phases/*/NN-{SPEC,AI-SPEC,USER-SETUP,EVAL-REVIEW,DOM-VERIFY,REVIEWS}.md
                                   |                                          |
        discovery (position + name) |  kinds: codebase-<doc>                   |  kinds: spec, ai-spec, user-setup, eval-review, dom-verify, reviews
                                   v                                          v
                       handlers (try/catch per extraction; caps; line scans)
                       CodebaseHandler -> structured.codebase     SpecHandler / AiSpecHandler / UserSetupHandler /
                       (stamp, sections, lifts)                   EvalReviewHandler / DomVerifyHandler / ReviewsHandler
                                   |                                          |
                                   v                                          v
                  ProjectPresentation.artifacts[].structured  (ships whole to the browser: no secret values may be in it)
                          |                       |
        presentation/codebase-map.ts (pure leaf)  |        presentation/project-map-state.ts (pure leaf: mapOnly gate)
        readiness, mapped-at, counts, next step   |                       |
            |                |                    |                       +--> app-shell.tsx: hide Roadmap + Traceability
            v                v                    |                       +--> app-router.tsx: dashboard -> MappedNotStarted
   /documents?route=/codebase/<doc>               |
   -> codebaseContext on the response             |   GET /codebase -> CodebaseViewModel (map-only first screen)
            |                                     |                       |
            v                                     v                       v
   artifact-page.tsx: manifest.codebasePage(ViewInput)        <MappedNotStartedPage>: head (state, stack, concerns, next step + copy)
        -> CodebasePanels(model, activeDoc)   <----- the same component, one page, nothing rendered twice
                |
                +--> active panel: lifted part (designed) + unmatched sections (plain, document order)
                +--> panel list: 7 entries, "Not mapped" ghost entries are not links

 Six type pages: ViewInput.structured.<type> -> manifest.<type>Page(ViewInput) -> composed model -> *-components.tsx
                 composer returns null -> promoted-block / full document (silent), never a throw

 Opening: CLI arg | switcher add | folder scan result  --> resolveTargetPath() (one resolver)
          project path: any `.planning` dir qualifies     .planning path: PROJECT.md | STATE.md | >=1 of the seven map files qualifies
```

### Recommended Project Structure
```
src/
├── planning-repo/
│   ├── folders.ts                       # export the seven map file names (single source; target-path.ts imports it)
│   └── handlers/
│       ├── codebase.ts + codebase-lift.ts       # handler (guarded) + fuzzy lift, stamp, concern counts
│       ├── spec.ts, ai-spec.ts, user-setup.ts   # each handler + a *-body.ts extractor (Phase 9 coverage.ts / coverage-body.ts split)
│       ├── eval-review.ts, dom-verify.ts, reviews.ts
│       └── index.ts                             # register all, before GenericMarkdownHandler
├── presentation/
│   ├── codebase-map.ts                  # pure leaf: readiness, mapped-at, panel list, concern counts, next step
│   └── project-map-state.ts             # pure leaf: { mapOnly, documents }; imported by the shell
├── server/project-api.ts                # codebaseContext IIFE on /documents + GET /codebase
├── cli/target-path.ts                   # hasProjectMarker admits the seven names (through folders.ts)
└── web/
    ├── views/                           # codebase-page.ts, spec-page.ts, ai-spec-page.ts, user-setup-page.ts,
    │                                    #   eval-review-page.ts, dom-verify-page.ts, reviews-page.ts (+ *-components.tsx)
    ├── components/copy-command.tsx      # mono command + "Copy command" button (shared row, Pattern 6)
    └── pages/mapped-not-started-page.tsx
test/fixtures/lendshed/.planning/phases/...   # made-up spec/check examples (labelled)
test/fixtures/<map-only>/.planning/codebase/  # made-up map-only fixture (new fixture root; add to fixture-roots.ts)
test/fixtures/lendshed/README.md              # the index (or a dedicated index file the marker test reads)
```

### Pattern 1: Guarded handler with a separate extractor
**What:** The handler matches by ref (never content), parses frontmatter with `tryParseFrontmatter`, runs the extractor inside try/catch, and returns `structured: extraction === undefined ? {} : { key: extraction }`, so a throw only omits the key and the title, body and frontmatter survive.
**When to use:** all seven map documents (one handler matching `ref.kind.startsWith('codebase-')`) and each of the six types (match with `artifactTokenOf(ref) === 'SPEC'` etc., as `ReviewHandler` does).
**Example (existing, copy the shape):**
```typescript
// Source: src/planning-repo/handlers/coverage.ts (read this session)
export const CoverageHandler: ArtifactHandler = {
  kind: 'coverage',
  match: (ref) => ref.kind === 'coverage',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let coverage: CoverageBody | undefined;
    try { coverage = extractCoverage(fm.body); } catch { coverage = undefined; }
    return { title, frontmatter: fm.data, body: fm.body, warning: fm.warning,
      structured: coverage === undefined ? {} : { coverage } };
  },
};
```
Add each handler to `HANDLERS` before `GenericMarkdownHandler`, which must stay last [VERIFIED: src/planning-repo/handlers/index.ts]. Tokens: the six kinds are `SPEC`, `AI-SPEC`, `USER-SETUP`, `EVAL-REVIEW`, `DOM-VERIFY`, `REVIEWS` (distinct from `REVIEW`, `REVIEW-FIX`, `REVIEW-DISPOSITION`; `artifactTokenOf` compares whole tokens). Each handler also needs a handler-guard test (copy `test/review-handler-guard.test.ts`) and a growth test beside `test/scanner-growth.test.ts` using `measureGrowth` and `GROWTH_LIMIT`.

### Pattern 2: Server-built context delivered on `/documents`
**What:** A pure presentation function builds the cross-document join from the cached presentation; `project-api.ts` computes it in a guarded IIFE keyed on `lookup.artifact.kind`, and the web `ViewInput` carries it as an optional field. This keeps one bundle per request (D-05).
**Example:**
```typescript
// Source: src/server/project-api.ts ledgerContext IIFE (read this session) - the shape to copy
const codebaseContext = ((): CodebaseContext | null => {
  try {
    return lookup.artifact.kind.startsWith('codebase-')
      ? buildCodebaseContext(activeDerived.presentation, lookup.artifact.path)
      : null;
  } catch { return null; }
})();
```
Add the field to the `/documents` payload, to `ArtifactDocumentResponse`, to `ViewInput` (manifest.ts) and to the `viewInput` `useMemo` in `artifact-page.tsx`. The map-only first screen has no document request, so also expose the same builder at `GET /codebase` (mirror of `/research`: `api.get('/research', ...) -> buildResearchViewModel(activeDerived.presentation)`). One builder, two doors, so the head and the panels cannot disagree.

### Pattern 3: One manifest field per view; no per-kind branches in the page
**What:** Add optional composer fields to `ViewManifest` (`codebasePage`, `specPage`, `aiSpecPage`, `userSetupPage`, `evalReview`, `domVerify`, `reviewsPage`), one `useMemo` and one render branch each in `artifact-page.tsx`. Do NOT add `artifact.kind === '...'` branches: `view-page-contract.test.ts` caps that string's occurrences. [VERIFIED: comment at src/web/pages/artifact-page.tsx:660 "a further per-kind branch (view-page-contract.test.ts caps that pattern's occurrence count)"; 09-PATTERNS.md]
**Registry arithmetic:** `VIEW_KINDS` has 24 members and `view-registry.test.ts` asserts `expect(VIEW_KINDS.length).toBe(24)` and manifest keys equal kinds both ways [VERIFIED: test/web/view-registry.test.ts:21-26]. Phase 10 adds 7 view kinds (`codebase`, `spec`, `ai-spec`, `user-setup`, `eval-review`, `dom-verify`, `reviews`), making 31, and each needs a manifest with a one-sentence `lead` ending in a period and at least one `promote` entry (the promote list is also the silent fallback). `VIEW_LOCAL_PREFIXES` then auto-allows `view-codebase-*`, `view-spec-*`, ... Add `viewKindOf(kind)` in `kinds.ts` for the `codebase-*` mapping (conflict C8), and make `resolveViewFor` call it.

### Pattern 4: Map-state gate shared by shell and dashboard
**What:** `projectMapState(artifacts)` in a tiny leaf module, like `projectHasResearch`. Inputs are only `artifacts[].path` and `.location`.
```typescript
// Recommended shape [ASSUMED design; rule from D-04 as narrowed by UI-SPEC section 3 and D-08]
const MAP_DOCS = ['STACK.md','ARCHITECTURE.md','STRUCTURE.md','CONVENTIONS.md','TESTING.md','INTEGRATIONS.md','CONCERNS.md'];
export function projectMapState(artifacts: readonly { path: string; location: string }[]) {
  const present = MAP_DOCS.filter((name) => artifacts.some((a) => a.path === `.planning/codebase/${name}`));
  const hasRoadmap = artifacts.some((a) => a.path === '.planning/ROADMAP.md');
  const hasPhases = artifacts.some((a) => a.location === 'phase' || a.location === 'archived-phase');
  return { present, mapOnly: present.length > 0 && !hasRoadmap && !hasPhases };
}
```
Import the seven names from `folders.ts` (export the set) rather than repeating them, but keep the module free of heavy imports. Use it in `app-shell.tsx` (wrap the Roadmap and Traceability `NavLink`s in `{mapOnly ? null : ...}`), and in `ProjectRouteSwitch` so the `dashboard` page outcome renders `MappedNotStartedPage` when `mapOnly`. Do not use `presentation.milestones` for "no phases": a project can have phase folders and no parseable ROADMAP; `location` is the robust signal. Direct visits to `/roadmap` and `/traceability` of a map-only project keep today's (empty) pages (D-07 hides the tabs only).

### Pattern 5: The `.planning` path opens through the one resolver
**What:** `hasProjectMarker` is the only gate that rejects a map-only `.planning` path. The project-path branch already accepts any folder with a `.planning` child [VERIFIED below]. Verified experiment: a scratch project holding only the three shapes map files loaded `loadStatus: ok` from the project path, and the same project pointed at its `.planning` path returned `"status": "not-a-gsd-project"`.
```typescript
// Source: src/cli/target-path.ts:50-52 (read this session) - the current gate, verbatim
function hasProjectMarker(planningDirAbs: string): boolean {
  return pathExistsSync(join(planningDirAbs, 'PROJECT.md')) || pathExistsSync(join(planningDirAbs, 'STATE.md'));
}
```
Change: add `|| CODEBASE_MAP_FILES.some((name) => pathExistsSync(join(planningDirAbs, 'codebase', name)))`, with the seven names exported from `folders.ts` (a pure module; `target-path.ts` already imports only from `local-fs.ts` and types, so check the import does not break its "no node:fs" and layering tests). Per UI-SPEC section 3, an empty or unrecognised `codebase/` folder must NOT qualify (D-08). Extend `test/target-path.test.ts` (it has "resolves a path pointing directly at .planning identically to its parent" at line 82) with: `.planning` of a map-only fixture resolves to the project root; an empty `codebase/` folder does not; a `codebase/` holding only `notes.md` does not. The switcher add form, the scan-result add and the CLI all call `resolveTargetPath` (project-registry.ts:83, :296, :639), so no second change is needed; remote `ssh://` targets strip a trailing `.planning` and never run the marker test [VERIFIED: src/cli/remote-target.ts:107].

### Pattern 6: Next-step command is a pure function of readiness and visible documents
```text
Source: ~/.claude/gsd-core/bin/lib/onboard-projection.cjs (read this session), verbatim lists:
  const REQUIRED_CODEBASE_MAP_FILES = [ 'STACK.md', 'ARCHITECTURE.md', 'STRUCTURE.md', 'CONVENTIONS.md', 'TESTING.md', 'INTEGRATIONS.md', 'CONCERNS.md', ];
  const FAST_CODEBASE_MAP_FILES = [ 'STACK.md', 'INTEGRATIONS.md', 'ARCHITECTURE.md', 'STRUCTURE.md', ];
  getMapReadiness(hasCompleteMap, hasFastMap): complete -> 'complete'; fast -> 'fast'; else 'none'
  hasCodebaseMap = all seven present; hasFastCodebaseMap = all four fast files present
```
So: **complete** = all seven; **fast** = all four of STACK, INTEGRATIONS, ARCHITECTURE, STRUCTURE present and not all seven; else **none** (a `/gsd-scan --focus tech` map has STACK and INTEGRATIONS only, so it is `none`, worded "Partial map"). Next step precedence in `nextAction` for a project with no PROJECT.md: ingest-docs when doc candidates exist, else new-project; a missing required map sends to map-codebase. Labelore cannot scan the repo outside `.planning/`, so UI-SPEC section 3's table (fast and none: `/gsd-map-codebase`; complete + doc candidates: `/gsd-ingest-docs`; complete otherwise: `/gsd-new-project`) is the correct narrowing. GSD's doc-candidate test (`isPlanningDocCandidate`) is: name matches `(^|[-_ ])(ADR|PRD|SPEC|RFC)([-_ ]|\.)` (case-insensitive), or `^\d{4}[-_].+\.md$`, or any path segment in `adr, adrs, prd, prds, spec, specs, rfc, rfcs`, or the basename `REQUIREMENTS.MD`. Recommend mirroring only the name and segment rules over markdown files **inside `.planning/` outside `codebase/`**, excluding `REQUIREMENTS.md` (an ordinary GSD file) and phase-scoped `NN-SPEC.md` (a map-only project has no phases, so none exist). Record this reading as a plan decision (UI-SPEC open item 2). The four commands are constants; never build one from file text. `--fast` is never shown.
The copy row is shared with Phase 11's onboarding page, so make it `copy-command` (a documented shared name) only if a second view will use it; otherwise keep it `view-codebase-*`.

### Pattern 7: Page-level normalisation tables, never regex literals in composers
Composers and presentation modules build no regular expression and import no filesystem module (the Phase 9 contract tests assert this by source scan; `coverage-view-contract.test.ts` shows the checks). Handlers and lifts use character and line scans with caps. Put every vocabulary mapping in one small table:
| Input word (as GSD writes it) | Tone | Source |
|---|---|---|
| COVERED / PARTIAL / MISSING | complete / in-flight / missing | eval auditor scoring table |
| PRODUCTION READY / NEEDS WORK / SIGNIFICANT GAPS / NOT IMPLEMENTED | complete / in-flight / missing / missing | `eval.cjs`: `o >= 80 ? 'PRODUCTION READY' : o >= 60 ? 'NEEDS WORK' : o >= 40 ? 'SIGNIFICANT GAPS' : 'NOT IMPLEMENTED'` [VERIFIED: ~/.claude/gsd-core/bin/lib/eval.cjs:21-23] |
| Installed, Configured, Present, Implemented / Partial / Missing, Not found, Not configured | complete / in-flight / missing | auditor infrastructure table (conflict C4) |
| verified / nothing_to_report / could_not_look | complete / quiet / in-flight | DOM-VERIFY contract |
| HIGH / MEDIUM / LOW | missing / in-flight / quiet | review prompt severity scale |
The page shows the file's number and verdict verbatim and never recomputes (the auditor's own rule: "use those values verbatim ... never recompute or override them").

### Pattern 8: The made-up example rule (VIEW-21) as a test, not a convention
1. **Marker.** Frontmatter-bearing types (DOM-VERIFY, REVIEWS): add `made_up_example: true`, `derived_from: gsd-core/agents/gsd-dom-verifier.md` (or `gsd-core/workflows/review.md`), `gsd_core_version: 1.19.0` to the existing frontmatter. Frontmatter-less types (SPEC, AI-SPEC, USER-SETUP, EVAL-REVIEW, all seven map documents): first line `<!-- made-up example · derived from <path> · gsd-core 1.19.0 -->`. The installed version is `1.19.0` [VERIFIED: ~/.claude/gsd-core/VERSION]. A leading HTML comment is safe: `tryParseFrontmatter` needs `---` on line one, and `deriveTitle` reads the first `# ` heading. DOM-VERIFY frontmatter is "scalars only" by contract, so the three extra scalar keys are legal but the page must ignore unknown keys.
2. **Index.** A table in the fixtures README (Lendshed's, or a dedicated `test/fixtures/MADE-UP-EXAMPLES.md`): path, type, derived-from, gsd-core version, hard shape covered. `fixtures/README.md` already is a traceability ledger of this kind [VERIFIED: fixtures/README.md head], and `test/fixtures/shapes/README.md` has a ledger table with one row per file; follow that table style.
3. **Test.** For each fixture root, walk the loaded artifacts of the rule's kind set (`spec`, `ai-spec`, `user-setup`, `eval-review`, `dom-verify`, `reviews`, `codebase-*`; Phase 11 appends its kinds, D-13). Fail when: an artifact of those kinds lacks the marker; a marked file is absent from the index; the index names a file that does not exist. Read files the way the app does (through the repository load), include a planted positive control on a `mkdtemp` folder (the idiom of `fixture-leak.test.ts` and `no-skips.test.ts`).
4. **Scope decisions to record.** (a) `fixtures/dense/**` already holds placeholder `01-SPEC.md` and `01-AI-SPEC.md` behind a frozen golden (`test/__golden__/dense.json`); adding a marker would change its body hashes. Exempt `fixtures/dense` explicitly and name its own ledger as its index. (b) The three existing `test/fixtures/shapes/.planning/codebase/*.md` files are 3-line made-up map documents without a marker. They are within the rule's kind set, so give them the marker and an index row (their hashes are not golden-pinned; check `test/recognition-kinds.test.ts` and `route-table.test.ts` for pinned bodies when editing).

### Anti-Patterns to Avoid
- **A second parser for the `.planning` path.** One resolver only (Phase 8 D-17).
- **Hand-built `href`s from document text.** Cross-references in map documents become links only when they resolve against the reference registry or the panel list; every URL comes from the payload (the existing pattern: `resolveArtifactReference(registry, path)?.url ?? null`).
- **Rendering raw HTML.** Author text reaches the DOM only through `tokenizeInline`; `raw-html-guard.test.ts` allows exactly one raw-HTML site.
- **Copying a `research-*` class unchanged** onto the Codebase page (the vocabulary test flags a second view reusing a surface-scoped name). Promote the shared part instead, or write `view-codebase-*` rules.
- **Reading `~/codebases/*` from a test or helper.** `test/no-skips.test.ts` rejects `homedir()`, `/home/<user>/codebases` and tilde paths [VERIFIED: REAL_PATH_PATTERNS in test/no-skips.test.ts].

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Frontmatter parsing | A `---` splitter | `tryParseFrontmatter` | Tolerates malformed YAML; returns `warning`, never throws |
| Section splitting | A new regex per document | Extend `markdown-sections.ts` with ONE fence-aware variant and use it in the new lifts | `splitByHeadingLevel` ignores code fences (Pitfall 2); the mapper templates contain fenced blocks full of `#` lines |
| Inline markdown to React | `dangerouslySetInnerHTML` | `tokenizeInline` + a `renderTokens` like `research-atoms.tsx` | XSS guard and one rendering path |
| ASCII diagram and tree rendering | New diagram components | `FigureFor` / `CleanTreeFigure` / `LaneDiagramFigure` | Already view-agnostic; the figure frame scrolls inside itself, has Fit and Expand, and shows plain text when the lift rejects a figure |
| Clipboard | A new copy helper | `copyText()` | Secure-context check plus `execCommand` fallback |
| Segmented meter of squares (checklist, steps, dimensions, pass/fail counts) | One bar per page | Build `status-meter` once, add its row to `docs/design-language.md` before running the vocabulary test | Three or more pages need it (UI-SPEC section 8) |
| Project path resolution | Marker checks anywhere else | `resolveTargetPath` | The CLI, registry add, scan add and snapshot all use it |
| Which documents exist / readiness | A filesystem probe from the web | `presentation.artifacts` | The app is read-only and the browser never reads files |
| Date display of `last_mapped_at` | `toLocaleDateString` | UTC components of the parsed `Date` (Pitfall 3) | Date-only YAML is UTC midnight |
| Variable-value hiding | A masking regex | A name-only lift in the handler (never store the value) | `redactSecretText` handles JSON `"key": "value"` for `config.json` only |

**Key insight:** this phase's risk is not a missing library but silent semantic drift: counts that count the wrong thing, dates that shift a day, a value that leaks through a side door, and kinds that the registry cannot see. Each is a pure function with a fixture and a test.

## Specification family (VIEW-11): what GSD writes

### SPEC (`NN-SPEC.md`, no frontmatter)
Writer: `/gsd-spec-phase`, template `templates/spec.md`, written to `{phase_dir}/{padded_phase}-SPEC.md`. [VERIFIED: workflows/spec-phase.md "Write to: `{phase_dir}/{padded_phase}-SPEC.md`"]
Header lines, verbatim from the template: `**Created:** [date]`, `**Ambiguity score:** [score] (gate: ≤ 0.20)`, `**Requirements:** [N] locked`. The template's own examples omit the gate (`**Ambiguity score:** 0.12`), and the research note records the ASCII form `(gate: <= 0.20)`. Parse the score as the first number after `Ambiguity score:` and the gate as the number after `gate:` accepting `≤`, `<=`, `<` and `&le;`; default the gate to 0.20 when a score exists without one; no verdict when the score is a placeholder such as `[score]`. The gate text and "Ambiguity ≤ 0.20" come from `spec-phase.md` ("**Gate:** ambiguity ≤ 0.20 AND all dimensions ≥ their minimums"). A spec can be written **above** the gate: "Write SPEC.md anyway — flag gaps" and the `--auto` max-rounds path both do it [VERIFIED: spec-phase.md lines 173-181], with dimensions marked `⚠ Below minimum — planner must treat as assumption`. That is the "Not locked yet" case, and it is a normal file, not a corrupt one.
Requirements: `1. **Short label**: statement.` followed by indented `- Current:`, `- Target:`, `- Acceptance:` bullets. Boundaries: `**In scope:**` and `**Out of scope:**` bullet lists, out-of-scope items ending `— reason`. Other sections the UI-SPEC does not claim and the template always writes: Background, Constraints, Acceptance Criteria (checkboxes), **Edge Coverage** and **Prohibitions (must-NOT)** (tables with statuses `✅ covered / ⛔ dismissed / 🧪 backstop / ⚠ UNRESOLVED`), Ambiguity Report (4 dimensions with minimums, `✓`/`⚠`), Interview Log. These go to plain sections or the "In the source only" strip; a sketch may choose to surface the unresolved counts (cheap and useful: the Edge Coverage table is the same shape as the UI-SPEC "UI Considerations" table that `ui-spec` already reads).

### AI-SPEC (`NN-AI-SPEC.md`, no frontmatter)
Writer chain: `/gsd-ai-integration-phase` -> framework-selector, ai-researcher, domain-researcher, eval-planner; template `templates/AI-SPEC.md`. Numbered sections `## 1. System Classification`, `## 1b. Domain Context`, `## 2. Framework Decision`, `## 3. Framework Quick Reference`, `## 4. Implementation Guidance`, `## 4b. AI Systems Best Practices`, `## 5. Evaluation Strategy`, `## 6. Guardrails`, `## 7. Production Monitoring`, `## Checklist` (16 `- [ ]` items in the template). [VERIFIED: ~/.claude/gsd-core/templates/AI-SPEC.md]
The template's slots are **HTML comments** after bold labels (`**System Type:** <!-- RAG | Multi-Agent | ... -->`, `**Selected Framework:** <!-- e.g., LlamaIndex v0.10.x -->`), empty numbered items (`1.`, `2.`, `3.`), an empty dimensions table row, empty fenced blocks holding only `# comment` lines, blockquote guidance lines (`> Researched by ...`) and bare sub-headings. "System type", "Framework" and "Evaluation dimensions" come from `**System Type:**`, `**Selected Framework:**` / `**Version:**`, and the Section 5 `### Dimensions` table (`Dimension | Rubric | Measurement Approach | Priority`).
**Unfilled-slot rule (open item 5; built from the template, tagged as a recommendation):** strip HTML comments (single- and multi-line, unterminated comment runs to end of section); then, per `##` section (fence-aware), drop scaffolding: blockquote lines, bare `###` headings, bold-label-only lines, lines that are only `N.` or a bare list marker, table header and separator rows and rows whose cells are all empty, and fenced blocks whose every line is blank or a `#`/`//` comment. A section is a **template slot** when nothing remains. A section with some filled subsections is filled. The Checklist is progress, never a slot. The count line is "{n} of {m} sections are still template slots" where m is the number of numbered sections found. Verbatim-template files must score all slots; hand-filled and half-filled made-up files must score exactly the sections left empty. Test both against a copy of the real template body, not only the made-up files (UI-SPEC: "built from the real `templates/AI-SPEC.md` placeholders").

### USER-SETUP (`NN-USER-SETUP.md`, no frontmatter)
Writer: execute-plan, when a plan's `user_setup` frontmatter has items. Shape: `# Phase {X}: User Setup Required`, `**Generated:**`, `**Phase:**`, `**Status:** Incomplete` (the file says to flip it to "Complete" by hand), `## Environment Variables` table `| Status | Variable | Source | Add to |` with `[ ]` / `[x]` in the first cell, `## Account Setup` and `## Dashboard Configuration` checklists (`- [ ] **Title**` with `URL:`, `Location:`, `Set to:`, `Notes:` sub-bullets), `## Local Development`, `## Verification` (a fenced command block and "Expected"). [VERIFIED: ~/.claude/gsd-core/templates/user-setup.md]
Steps = the table rows plus the checkbox items of the two checklists. Derive "{d} of {t} steps done" from the boxes. The `**Status:**` line is the file's own word and may disagree with the boxes (an author who ticks everything and forgets the header, or the reverse): show both, never merge ("keep disagreeing signals separate"). The template never holds a value (`Source` is a dashboard path); a value in the file is human-added, and that is exactly what the made-up example plants.

## Check family (VIEW-12): what GSD writes

### EVAL-REVIEW (`NN-EVAL-REVIEW.md`, no frontmatter)
Writer: `gsd-eval-auditor`, template verbatim from the agent file: `# EVAL-REVIEW — Phase {N}: {name}`, `**Audit Date:**`, `**AI-SPEC Present:** Yes / No`, `**Overall Score:** {score}/100`, `**Verdict:** {PRODUCTION READY | NEEDS WORK | SIGNIFICANT GAPS | NOT IMPLEMENTED}`, `## Dimension Coverage` table `| Dimension | Status | Measurement | Finding |` then `**Coverage Score:** {n}/{total} ({pct}%)`, `## Infrastructure Audit` table `| Component | Status | Finding |` then `**Infrastructure Score:** {score}/100`, `## Critical Gaps`, `## Remediation Plan` with three subsections `### Must fix before production:`, `### Should fix soon:`, `### Nice to have:`, then `## Files Found`. [VERIFIED: ~/.claude/agents/gsd-eval-auditor.md]
The remediation plan is three ordered groups (author order inside each, group order as written); "tied to its dimension where the file names one" means a best-effort mention match of a dimension name inside a step, never an invented link. `Measurement` is `Code / LLM Judge / Human`. The file can be written when AI-SPEC is absent (`AI-SPEC Present: No`).

### DOM-VERIFY (`NN-DOM-VERIFY.md`, frontmatter)
Contract verbatim: `schema_version: 1`, `wave: <integer>`, `outcome: verified | nothing_to_report | could_not_look`, `reason: ok | no_criteria | no_browser_mcp | profile_locked | target_unreachable`, `checked`, `passed`, `failed`, `needs_review` (integers). Body: "one line per criterion with its verdict and the observation behind it"; for `could_not_look` "state exactly what stopped you and what the operator would change". [VERIFIED: ~/.claude/agents/gsd-dom-verifier.md output-contract]
Outcome/reason pairs: `no_criteria` goes with `nothing_to_report`; `no_browser_mcp`, `profile_locked`, `target_unreachable` go with `could_not_look`; `ok` with `verified`. The UI-SPEC copy covers `target_unreachable` and `no_criteria`; the other two reasons use the raw value in mono per the copy table. Criterion lines have no fixed grammar: parse a leading verdict word (`passed`, `failed`, `needs_review`, optionally in bold, backticks or brackets) tolerantly and list unparseable lines as plain text. The counts come from frontmatter (the writer says a reader gets the verdict "without parsing prose"); if rows parsed from the body disagree, show the frontmatter numbers and do not recount silently. Observed page text is quoted in backticks or fences by contract; render it as text only.

### REVIEWS (`NN-REVIEWS.md`, frontmatter)
Writer: `/gsd-review`, file `{padded_phase}-REVIEWS.md`. Frontmatter: `phase`, `reviewers: [claude, codex, ...]` (slugs), `reviewed_at`, `plans_reviewed: [...]`, `models:` (one entry per reviewer, double-quoted scalars, `"unknown"` when not recoverable, values may carry `(reasoning=<level>)`), `model_sources:`, optional `trimmed_reviewers:` and `plan_coverage:` (present only when a graded lane is incomplete). Body: `# Cross-AI Plan Review — Phase {N}`, an optional `## Plan-Revision Conflicts` between `<!-- gsd:plan-revision-conflicts:begin -->` / `<!-- gsd:plan-revision-conflicts:end -->`, one `## <Adapter> Review` per reviewer (or `## <Adapter> Review (<instance>)` for a reviewer instance), then `## Consensus Summary` with `### Agreed Strengths`, `### Agreed Concerns`, `### Divergent Views`. [VERIFIED: ~/.claude/gsd-core/workflows/review.md lines 705-800]
Reviewer section names are the lane `reviewsSection` values: Claude, Codex, CodeRabbit, OpenCode, Qwen, Cursor, Antigravity, Ollama, LM Studio, llama.cpp, Kimi Code [VERIFIED: bin/lib/review-lane-descriptor.cjs `reviewsSection:` lines]. Slugs and headings differ in punctuation (`lm_studio` / "LM Studio", `llama_cpp` / "llama.cpp"), so match by lower-cased alphanumerics only.
Traps that decide the parser (details in Pitfall 13): reviewer output is embedded **verbatim** under its H2 and the review prompt demands per-plan `##` sections (`## 12.6-01`), so a reviewer's body contains its own H2 headings; a reviewer boundary is a `## ... Review` heading, not any H2. A failed lane leaves a stub that "keeps its 'failed or returned empty output' header" and a budget-skipped lane writes "review skipped: prompt budget" [VERIFIED: workflows/review.md:541, :672-673]. A reviewer output may carry `[reviewed-without-repo-access]` / `REVIEWED-WITHOUT-REPO-ACCESS` or `[reviewed-without-source-citations]`, which GSD treats as reduced-weight; CodeRabbit is diff-only. These are the only per-reviewer run statuses the file can state, so they are what a reviewer card may show. The review prompt asks each reviewer for Summary, Strengths, Concerns (severity HIGH/MEDIUM/LOW), Suggestions, Risk Assessment (LOW/MEDIUM/HIGH) [VERIFIED: workflows/review.md:226-231]; LLM output varies in heading level and bullets, so degrade to the reviewer's text as written.
GSD already writes its own `### Agreed Concerns` and `### Divergent Views`; the UI-SPEC rightly derives "Agreed" and "Disagreements" from the reviewers' own text and shows the file's consensus below, labelled as the file's own. The two may differ; show both, never merge.

## Codebase map family (VIEW-13): what GSD writes

Seven UPPERCASE documents written by four mappers (`tech` -> STACK, INTEGRATIONS; `arch` -> ARCHITECTURE, STRUCTURE; `quality` -> CONVENTIONS, TESTING; `concerns` -> CONCERNS). The full templates are in the mapper agent (`~/.claude/agents/gsd-codebase-mapper.md`, `<templates>`); `templates/codebase/` holds only `stack.md` and `architecture.md`. [VERIFIED: ls ~/.claude/gsd-core/templates/codebase; agent read]
- **Freshness markers:** `**Analysis Date:** [YYYY-MM-DD]` under the H1, a footer `*Stack analysis: [date]*` / `*Architecture analysis: [date]*` / `*Structure analysis*` / `*Convention analysis*` / `*Testing analysis*` / `*Integration audit*` / `*Concerns audit*`, and `<!-- refreshed: [YYYY-MM-DD] -->` above ARCHITECTURE's H1. Since the stamp step, frontmatter `last_mapped_commit: <HEAD sha>` and `last_mapped_at: <date>` are written into **every** existing map document by `stamp-codebase-map`; `last_mapped_at` is the host-local calendar day (`clock.realClock.localToday()`), the sha is `git rev-parse HEAD` validated `^[0-9a-f]{7,40}$`, and the stamp "reflows that map's whitespace" [VERIFIED: ~/.claude/gsd-core/bin/lib/verify.cjs:2135-2152; workflows/map-codebase.md stamp_codebase_map]. An older map has only `**Analysis Date:**` or `*Last updated:*`.
- **STACK:** `## Languages` (`**Primary:**`, `**Secondary:**` bullets `- [Language] [Version] - [Where used]`), `## Runtime` (`**Environment:**`, `**Package Manager:**`, a `Lockfile:` bullet), `## Frameworks` (`**Core:**`, `**Testing:**`, `**Build/Dev:**`), `## Key Dependencies` (`**Critical:**`, `**Infrastructure:**`), `## Configuration`, `## Platform Requirements`. A bullet is `Name Version - purpose`: split on the first spaced dash, take a trailing digit-led token on the left as the version.
- **INTEGRATIONS:** `## APIs & External Services` (`**[Category]:**` then `- Service - use` with `SDK/Client:` and `Auth: [env var name]` sub-bullets), `## Data Storage` (`Connection: [env var]`), `## Authentication & Identity`, `## Monitoring & Observability`, `## CI/CD & Deployment`, `## Environment Configuration` (`**Required env vars:**`, `**Secrets location:**`), `## Webhooks & Callbacks`. The mapper is forbidden to quote `.env` values (forbidden_files block), so a value next to a name is rare but the UI-SPEC safety rule still applies.
- **ARCHITECTURE:** `## System Overview` (a ```` ```text ```` ASCII diagram), `## Component Responsibilities` (table `Component | Responsibility | File`), `## Pattern Overview`, `## Layers`, `## Data Flow` (`### Primary Request Path` numbered steps), `## Key Abstractions`, `## Entry Points`, `## Architectural Constraints`, `## Anti-Patterns` (`### Name` with `**What happens:**`, `**Why it's wrong:**`, `**Do this instead:**`), `## Error Handling`, `## Cross-Cutting Concerns`.
- **STRUCTURE:** `## Directory Layout` (a fenced tree), `## Directory Purposes`, `## Key File Locations`, `## Naming Conventions`, `## Where to Add New Code` (`**New Feature:**` then `- Primary code:` / `- Tests:` bullets), `## Special Directories`.
- **CONVENTIONS** (`Naming Patterns`, `Code Style`, `Import Organization`, `Error Handling`, `Logging`, `Comments`, `Function Design`, `Module Design`) and **TESTING** (`Test Framework` with `**Run Commands:**` in a fenced bash block, `Test File Organization`, `Test Structure`, `Mocking`, `Fixtures and Factories`, `Coverage`, `Test Types`, `Common Patterns`).
- **CONCERNS:** nine `##` sections (Tech Debt, Known Bugs, Security Considerations, Performance Bottlenecks, Fragile Areas, Scaling Limits, Dependencies at Risk, Missing Critical Features, Test Coverage Gaps), each a list of `**[Area]:**` bold-label groups with field bullets.
- The mapper's own rules: "If something is not found, use 'Not detected' or 'Not applicable'" (a section whose only content is such a phrase counts 0).

Fuzzy match (D-02): normalise a heading by dropping leading emoji, digits and punctuation, lower-casing, `&` -> `and`, collapsing whitespace and trailing plural `s`, then match when the normalised text equals a known key or starts with it or contains it as a whole-word run ("languages and runtimes" contains "languages"; "api architecture" is not in the known set and falls through to a plain section). Use a `Map`, not an object literal, for the table (Pitfall 16). Keep unmatched sections in document order after the lifted part.

## Common Pitfalls

### Pitfall 1: The concern-counting rule counts fields, not concerns (conflict C3)
**What goes wrong:** UI-SPEC counts "the number of top-level items under that heading (list items, table rows, or `###` subsections)". The mapper's CONCERNS template (verbatim) is:
```
## Tech Debt

**[Area/Component]:**
- Issue: [What's the shortcut/workaround]
- Files: `[file paths]`
- Impact: [What breaks or degrades]
- Fix approach: [How to address it]
```
Counting top-level bullets gives four per concern. [VERIFIED: ~/.claude/agents/gsd-codebase-mapper.md CONCERNS.md Template]
**How to avoid (recommendation, to be confirmed on the three fresh maps):** one rule, applied identically to every map, tried in this order within a section: (1) `###` subsections if any, else (2) bold-label lines (a line that is only `**...**` or `**...:**`) when two or more follow a list, else (3) top-level bullets that do not begin with a known field label (`Issue:`, `Files:`, `Impact:`, `Fix approach:`, `Symptoms:`, `Trigger:`, `Workaround:`, `Risk:`, `Current mitigation:`, `Recommendations:`, `Problem:`, `Cause:`, `Improvement path:`, `Why fragile:`, `Safe modification:`, `Test coverage:`, `Current capacity:`, `Limit:`, `Scaling path:`, `Impact:`, `Migration plan:`, `Blocks:`, `What's not tested:`, `Priority:`), else (4) table rows. A section whose only text is "None", "Not detected" or "Not applicable" counts 0. Pin the rule with a fixture per shape and a corpus test over labelore's own fresh map that asserts invariants (every count is a non-negative integer, the nine headings are found or absent, the sum equals the shown total), not values.
**Warning signs:** a Security count of 4 for one finding; a total that is a multiple of the field count.

### Pitfall 2: `splitSections` is not fence-aware
**What goes wrong:** `splitByHeadingLevel` splits on every `^## ` line, including inside code fences [VERIFIED: src/planning-repo/handlers/markdown-sections.ts:11-30, a per-line regex with no fence state]. TESTING.md's run-command block, ARCHITECTURE's diagram fence and STRUCTURE's tree fence contain `#` lines; a fenced `## comment` would start a bogus section and hide real content.
**How to avoid:** add one fence-aware heading scanner (track fence open and close by run length, as Phase 9's `windows.ts` fix did for four-backtick fences) and use it only in the new lifts; do not change the shared splitter (a dozen handlers depend on it). Add a fixture with a fenced `## ` line.

### Pitfall 3: `last_mapped_at` parses to a `Date`; an all-digit `last_mapped_commit` parses to a number
**What goes wrong:** GSD writes unquoted scalars. Running Labelore's own parser on `last_mapped_at: 2026-11-03` returned `last_mapped_at: 2026-11-03T00:00:00.000Z` (a `Date`, `instanceof Date` true), and `last_mapped_commit: 1234567` returned a `number` (and `1234e56` the float `1.234e+59`). A 40-hex sha with letters stays a string. [VERIFIED: ran `tryParseFrontmatter` this session] `jsonRecord` later turns the `Date` into an ISO string on the wire.
**How to avoid:** read the date as UTC (`toISOString().slice(0, 10)`, or UTC getters), never `toLocaleDateString` (a negative-offset machine shows the previous day; the suite sets `process.env.TZ = 'Asia/Kolkata'` in some tests, so test in more than one zone). Accept a commit only when it is a string; show the first 7 characters in mono. The `**Analysis Date:**`, `*Last updated:*` and `<!-- refreshed: -->` forms are plain text dates: read `YYYY-MM-DD` by character scan, show nothing if absent (silent, per the UI-SPEC). When the seven documents carry different dates (an Update run narrowed by `--files`), show the newest as "Mapped" and keep each panel's own date for the panel; record this choice [ASSUMED].

### Pitfall 4: Readiness "fast" needs all four core documents; scan subsets are `none`
`/gsd-scan --focus tech` writes STACK and INTEGRATIONS only, which GSD calls `none`. Do not word it "fast". The UI-SPEC maps `none` with at least one document to the "Partial map" chip and `/gsd-map-codebase`. Test the matrix: 7/7 complete; the four core only (fast); 4 core + 1 other (fast); STACK + INTEGRATIONS (none/partial); the existing 3-document shapes fixture (STACK, ARCHITECTURE, CONVENTIONS: none/partial).

### Pitfall 5: `hasProjectMarker` must not become "any codebase folder"
An empty `codebase/` folder or one holding only an unrecognised file does not qualify (D-08, UI-SPEC section 3). Test both negatives. Also check `looksLikePlanningDir` stays the entry condition (basename `.planning`).

### Pitfall 6: A map-only project and the "empty dashboard" today
Today `/dashboard` for a map-only project returns a head of `null`s and `"Unavailable"` provenance blocks [VERIFIED: curl against a scratch server]. The map-only screen must replace the dashboard body at the router, not patch `buildDashboardViewModel`; the loading state must be the project layout's opening body, never a flash of the empty dashboard (UI-SPEC loading rows). `DashboardPage` is lazy-loaded; keep `MappedNotStartedPage` a lazy route chunk too (`test/web/build-splitting.test.ts` pins the lazy list and the entry chunk structure).

### Pitfall 7: Tab count and order are pinned
`test/web/navbar-contract.test.ts:323-346` asserts exactly five `<NavLink className={navigationClass}` matches, that "The three original tabs sit outside both gates", and the order roadmap < researchGate < traceability < sketchesGate [VERIFIED]. D-07 puts Roadmap and Traceability behind a gate, so this test must be rewritten deliberately in the same plan (three gates now; assert the map-only gate hides exactly those two), not worked around.

### Pitfall 8: Presentation modules must be leaves
Phase 9's review (WR-03) found import cycles among `dashboard-head`, `state-session`, `root-redirects` and `traceability`. `project-map-state.ts` is imported by the shell's entry chunk and by the router; keep it free of presentation imports (take the seven names from `folders.ts`, which is already pure). `codebase-map.ts` imports types only plus the lift types.

### Pitfall 9: Registering seven kinds or one (conflict C8) and the e2e matrix
`test/e2e/pages.ts` builds one page per `artifact.kind` seen and sets `registered: viewKindSet.has(kind)`, and `kindsWithoutFixture = VIEW_KINDS.filter(kind => !kindsSeen.has(kind))`. With the single view kind `codebase`, no artifact has `kind === 'codebase'`, so it lands in `kindsWithoutFixture` and `codebase-stack` reads `registered: false`. Neither field is asserted in the specs that import the matrix [VERIFIED: grep shows only `artifact-header.spec.ts` imports `buildPageMatrix`, and uses `.pages` and `family`], but update `pages.ts` to normalise through `viewKindOf` so the matrix stays truthful.

### Pitfall 10: Fixture and test text must pass the leak guard
`test/fixture-leak.test.ts` scans every tracked or untracked-unignored text file under `test/`, `fixtures/` and `src/` for whole-word (case-insensitive, hyphen matches whitespace) `cinedise`, `cinedise-portal`, `studio-portal`, `resoundant`, `pyedge`, `deid`, `duet`, `edgecan`, `ibis`, `sideby`, hosts `taile250fc`, `rhgpu`, and tool tells `seagate`, `sandisk`, `smartctl`, `rclone` in fixtures and tests [VERIFIED: test/fixture-leak.test.ts:21-37]. `.planning/` and `.claude/` are exempt. Consequences: (a) invented Lendshed content must avoid those words (`duet` and `ibis` are ordinary English words; a made-up "duet" screen name would fail); (b) tests and `src/` must never name the real repos the maps were generated from; (c) file names are scanned too (`PRIVATE_PREFIX` rejects `sp`, `dd` or `sb` followed by a digit or hyphen). Fixtures must also be `git check-ignore`-clean (shapes README rule R7).

### Pitfall 11: Tests pinned to the repo's own mutable planning files (Phase 9 WR-05)
A corpus test may load labelore's own `.planning/codebase/` (repo-relative, so the standing guards allow it, as `note-page-corpus.test.ts` does with `LB_ROOT`) but the next `/gsd-map-codebase` rewrites it. Assert shape and invariants only; pin values only in made-up fixtures. The cinedise-portal and duet maps are reachable only by hand (sketch inputs and screenshot checks).

### Pitfall 12: A USER-SETUP value can leave through four side doors
(1) `structured` ships whole in `/presentation` (`ArtifactDto.structured`) [VERIFIED: src/server/project-api.ts artifactResponse and project-presentation.ts ArtifactDto], so the handler must store variable names, destinations and sources only, never a cell that contains `NAME=value`. (2) `/documents` returns the rendered whole-file HTML (`document`), used by Source mode and by any plain-section remainder: the View DOM must not render step text from that HTML; render step instructions from the tokenised, value-withheld text. (3) Source mode shows the raw file (legitimate; Phase 6 masks only `config.json` via `maskConfig`/`redactSecretText`, JSON-shaped). (4) The search index holds `artifact.body` and snippets are cut from the raw body, so a value is searchable (open item 1: record, do not widen scope). Withholding rule (recommendation): in a table cell, step line or inline code, a token `NAME=` or `NAME:` where NAME is upper-snake and the remainder is non-empty and not a bracketed placeholder is a value; keep `NAME` and drop the remainder before it reaches `structured` or any `title` / `aria-label`. The test renders the View through `renderToStaticMarkup` over the made-up file and asserts the planted string is absent from markup, `title` and `aria-label`, and absent from the serialised `structured`. The same rule applies to Integrations variable rows.

### Pitfall 13: REVIEWS parsing
- **Reviewer boundaries:** verbatim reviewer output includes `## <plan-id>` headings (the prompt requires them), so split reviewers at `## ... Review` / `## ... Review (<instance>)` headings, stop at `## Consensus Summary`, ignore `## Plan-Revision Conflicts` (between its markers) and trailing `---`. Use the frontmatter `reviewers` and `models` keys as the roster (names, model strings, `unknown`); a heading with no roster entry still becomes a card.
- **Agreement is best-effort:** normalise a concern's text (lower-case, strip markdown, collapse whitespace, drop a leading severity word and a `path:line` citation) and compare the normalised first clause plus any shared plan id; when unsure list it under the reviewer, not under "Agreed". Disagreement needs two reviewers and an explicit contradiction (a different overall risk, or opposite stance on the same plan or concern); otherwise there is no group (a single reviewer shows no groups). Record the normalisation in the plan and test it on the disagreeing made-up file (open item 4).
- **Statuses:** stub header "failed or returned empty output" and "review skipped: prompt budget" mark a failed or skipped lane; such a reviewer is never counted in "Agreed".
- **Quoting:** `models:` values are double-quoted YAML scalars (a model id may contain `:`), parsed by `tryParseFrontmatter` into strings or nested maps; guard non-string values.

### Pitfall 14: Spec gate wording and the "above the gate" file
`≤` is one code point; the writer's later examples drop the gate entirely. Handle both, plus a score written as a placeholder. A requirement may lack `Acceptance:` (the template says each needs all three, but a hand-edited file may not): show the fields present and the quiet "No acceptance stated" chip. `Requirements: N locked` may disagree with the numbered items; show the file's number when present and fall back to counting.

### Pitfall 15: Eval review numbers are shown, not recomputed
The score and verdict come from the file verbatim; the verb rounds to two decimals and thresholds at 80/60/40 [VERIFIED: eval.cjs:19-23]. A file may have no score or a verdict outside the four words ("Verdict not stated", quiet). Infrastructure statuses vary by component (conflict C4).

### Pitfall 16: Author-controlled keys in plain objects (Phase 9 IN-03)
Heading text, dimension names, reviewer names and variable names are author-controlled. Use `Map`, `Object.create(null)` or `Object.hasOwn` for every lookup keyed by them (`constructor` as a heading must not return `Object`'s constructor).

### Pitfall 17: Fixture totals and goldens
New files in Lendshed can break per-project totals pinned in existing tests (the shapes README rule R4 says pin per file, never a total). Run `npm run test:gate` after adding fixtures and fix pins deliberately. Do not touch `fixtures/dense/**` or `test/__golden__/dense.json` (frozen). A new map-only fixture root must be added to `test/helpers/fixture-roots.ts` (importing it throws if a root has no `.planning`) so the walk-equals-model and route-table sweeps cover it.

### Pitfall 18: Shared-file wave trap and process rules
Every view build touches `handlers/index.ts`, `manifest.ts`, `manifests.ts`, `artifact-page.tsx`, `globals.css`, `docs/design-language.md` and `view-registry.test.ts`; Phase 9 ran its builds in 12 serial waves for that reason. Restart `systemctl --user restart labelore` after every change; e2e only when necessary and narrowest; an ad-hoc screenshot server needs `LABELORE_CONFIG_DIR` and system Chrome (`/usr/bin/google-chrome`, `--headless=new`) because Playwright's bundled chromium is not installed (user memory `adhoc-screenshots`; `~/.cache/ms-playwright` holds no browser).

## Code Examples

### Date and commit from a map document (UTC-safe)
```typescript
// Pattern sketch [ASSUMED design, shaped by the verified Date/number behaviour in Pitfall 3]
function mappedStamp(frontmatter: Record<string, unknown>): { at: string | null; commit: string | null } {
  const raw = frontmatter['last_mapped_at'];
  const at = raw instanceof Date && !Number.isNaN(raw.valueOf())
    ? raw.toISOString().slice(0, 10)
    : typeof raw === 'string' && raw.length >= 10 ? raw.slice(0, 10) : null;
  const sha = frontmatter['last_mapped_commit'];
  return { at, commit: typeof sha === 'string' && sha.length >= 7 ? sha.slice(0, 7) : null };
}
```

### Next-step selection (pure, constants only)
```typescript
// Table from 10-UI-SPEC.md section 3 narrowed from onboard-projection.cjs [ASSUMED code, VERIFIED rules]
type Readiness = 'complete' | 'fast' | 'none';
export function nextStep(readiness: Readiness, hasDocCandidates: boolean): { command: string; reason: string } {
  if (readiness !== 'complete') {
    return { command: '/gsd-map-codebase', reason: readiness === 'fast'
      ? 'Finish the map. A fast map is enough to look around, but project setup needs the complete one.'
      : 'This map is partial. Some of the seven documents are missing, so map the codebase before setting the project up.' };
  }
  return hasDocCandidates
    ? { command: '/gsd-ingest-docs', reason: 'Existing decision or spec documents were found. Import them before setting the project up.' }
    : { command: '/gsd-new-project', reason: 'The map is complete. Next, set the project up.' };
}
```

### Marker test skeleton (reads like the app; planted control)
```typescript
// Shape only [ASSUMED]; helpers are the real ones from test/helpers (fixture-project.ts loadProject, fixture-roots.ts)
const MADE_UP_KINDS = new Set(['spec','ai-spec','user-setup','eval-review','dom-verify','reviews',
  'codebase-stack','codebase-architecture','codebase-structure','codebase-conventions','codebase-testing',
  'codebase-integrations','codebase-concerns']);
// for each fixture root (excluding fixtures/dense and the repo itself): load, filter artifacts by kind,
// assert marker (frontmatter made_up_example === true, or first body line starting '<!-- made-up example'),
// assert each path appears in the index table, assert every index path exists on disk.
```

### Copy command row (conflict C2 resolved)
```tsx
// Pattern [ASSUMED], reusing copyText from copy-path-button.tsx; label flips in the button, no toast
<code className="view-codebase-command">{command}</code>
<Button type="button" size="xs" variant="secondary" aria-label={`Copy command: ${command}`} onClick={onCopy}>
  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? 'Copied' : 'Copy command'}
</Button>
<p className="source-note">Labelore does not run commands. Paste it in your terminal.</p>
```

## Suggested made-up example coverage (D-11) and placement

Lendshed has four live phases (`01-member-sign-in-sessions`, `02-roles-and-permissions`, `03-account-admin-and-sessions`, `04-bulk-loan-export`) and four archived (`milestones/v1.0-phases/01..04`), plus quick tasks [VERIFIED: find over test/fixtures/lendshed]. One file of each type fits per phase folder, and files in a phase folder need no ROADMAP edit (Phase 9 added `03-REVIEW-FIX-backend.md` the same way). Suggested distribution (planner decides; counts are the minimum the success criteria and the Sketch Gate table name):

| Type | Files needed | Hard shapes to cover |
|------|--------------|----------------------|
| SPEC | 2 to 3 | one at ambiguity ≤ 0.20 with the gate stated; one above it written "anyway" with a `⚠` dimension; one with 8+ requirements and one requirement missing `Acceptance:` (can be the same files); one without a gate in the header |
| AI-SPEC | 2 | all slots unfilled (the real template body, filled only with a phase title) and half-filled (some numbered sections written, Section 5 table filled, Checklist part ticked) |
| USER-SETUP | 2 | some steps done with a value-looking placeholder beside a variable (e.g. an obvious `PLACEHOLDER` string, not a real or realistic key); all steps pending |
| EVAL-REVIEW | 2 | a mixed verdict (NEEDS WORK) and NOT IMPLEMENTED with every dimension MISSING and an absent AI-SPEC |
| DOM-VERIFY | 3 | `could_not_look` (`target_unreachable`), `nothing_to_report` (`no_criteria`), `verified` with failed and needs-review rows; the first two should sit in phases a person can open side by side |
| REVIEWS | 2 | three reviewers who disagree (different overall risk, one failed-lane stub, one `models: "unknown"`, a `plan_coverage` block), and a single reviewer |
| Map documents | 7 + a partial 4-core set | a complete map-only fixture root (new, `test/fixtures/<name>/.planning/codebase/`), an older-header variant (`*Last updated:*`, an added "API Architecture" heading), a fenced `## ` line, a CONCERNS with all nine sections of unequal length including one with "None identified", an INTEGRATIONS row with a `NAME=value` |
The Lendshed AI feature must be invented (the project is a tool library); keep it plausible (for instance a loan-note drafting assistant inside phase 04) and avoid the deny-list words. Every one of these files is also a sketch input (D-15), so they are written before the sketches.

## State of the Art

| Old approach | Current approach | When changed | Impact |
|--------------|------------------|--------------|--------|
| Map freshness read from `**Analysis Date:**` only | Frontmatter `last_mapped_commit` and `last_mapped_at` stamped into every map document | gsd-core 1.18 (stamp-codebase-map), present in 1.19.0 | Show the frontmatter first; keep the three older forms as fallbacks |
| One shape per type | Multiple writer generations coexist | ongoing | Degrade per file, never per project |
| Sketch-first for one page (Phase 9: only the project page) | Sketch-first for every page (Phase 10, D-14) | this phase | Human sketch checkpoints sit between plans |
| Phase 9 fallback "recognised, no notice" | The same | Phase 9 | Do not add a new notice without a user decision (C1) |

**Deprecated or outdated:** the v2.1 research's `ProjectPresentation.shape` field idea (replaced by a pure function here); its marker set `PROJECT.md | STATE.md | config.json | codebase | phases` for the `.planning` path (narrowed by UI-SPEC and D-08 to recognised map documents); its real map references under `~/Work/...` (gone).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The concern-counting priority rule (`###`, bold-label groups, non-field bullets, table rows) matches real maps | Pitfall 1 | Counts on the first screen are wrong; confirm against the three fresh maps before freezing |
| A2 | The unfilled-slot rule (strip comments and scaffolding, nothing left means slot) classifies real AI-SPEC sections correctly | Specification family | A filled section is called a slot or the reverse; real AI-SPEC files have never been produced here |
| A3 | A map's "Mapped" date is the newest per-document date; commit stamp comes from that document | Pitfall 3 | Mild; panel shows its own date as well |
| A4 | DOM-VERIFY criterion lines start with a verdict word and are tolerant-parseable | Check family | Rows fall to plain text; counts still come from frontmatter |
| A5 | REVIEWS agreement normalisation (first clause plus plan id) finds real agreement without false positives | Pitfall 13 | The page under- or over-claims agreement; it is designed to under-claim |
| A6 | GSD's doc-candidate rule narrowed to name and segment rules inside `.planning/` (no `docs/`) is the right reading of D-06 | Pattern 6 | `/gsd-ingest-docs` shown or withheld wrongly; UI-SPEC open item 2 |
| A7 | One view kind `codebase` (not seven) is acceptable | Conflict C8 | Registry shape; a plan can switch to seven with `view-codebase-<doc>-*` prefixes |
| A8 | Exempting `fixtures/dense/**` from the marker rule, and marking the three shapes map files, is acceptable | Pattern 8 | Rule scope; user decision recorded in the plan |
| A9 | Treating a full-sha-with-letters as a string and a numeric `last_mapped_commit` as "no commit" is acceptable | Pitfall 3 | A hand-made all-digit sha is not shown; real HEAD shas virtually never parse as numbers |
| A10 | The Lendshed AI feature can be invented inside an existing phase folder without a ROADMAP edit | Coverage section | Some pinned total breaks; fixed by running the gate |

## Open Questions

1. **Which concern-counting rule survives the real maps? (A1, C3)**
   - What we know: the template shape; the UI-SPEC rule does not fit it.
   - What's unclear: how real LLM-authored CONCERNS vary (nested bullets, tables, `###`).
   - Recommendation: generate the three fresh maps first (D-03) and read them for shape before the Concerns lift is frozen; the plan should make the rule a data table with a fixture per shape.

2. **Who runs `/gsd-map-codebase` on labelore, cinedise-portal and duet, and when?**
   - What we know: none of the three `.planning/codebase/` folders exists (checked), mapper agents are spawned by that command, and CONTEXT says the user accepted the writes.
   - What's unclear: ordering against `/gsd-plan-phase 10` and the first sketches.
   - Recommendation: a human-action checkpoint (or an explicit pre-plan step) at the start; never copy any output into a fixture. The labelore map also fills the "Architecture not yet mapped" gap in CLAUDE.md.

3. **Sketch timing.**
   - What we know: about 14 sketches (frame, up to 5 panels, six types); numbers start at 042; Phase 9 sketched one page before planning and built the rest from analogs.
   - Recommendation: plan the recognition, presentation, shell and fixture layers now (they do not depend on a sketch), and put one sketch checkpoint plus one build plan per page after them, each preceded by `/gsd-sketch` and followed by the beside-the-sketch screenshot check. Do not plan view internals for a page before its sketch winner exists.

4. **Reviewer agreement and disagreement rules (UI-SPEC open item 4).** Recommendation in Pitfall 13; the plan records the exact normalisation and tests it.

5. **Where a withheld value can leak (UI-SPEC open item 1).** Answer: Source mode (the raw file), search snippets and the index (raw body), and `/documents` HTML. Phase 6 masks only `config.json`. Record it as a follow-up; do not widen this phase.

6. **Should the made-up marker rule's kind set include the shapes map files and exclude `fixtures/dense`? (A8)** Recommend yes and yes.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build, tests, snapshot CLI | yes | v22.23.1 [VERIFIED: node --version] | — |
| GSD core (templates, agents, workflows) | made-up examples derive from them | yes | 1.19.0 [VERIFIED: ~/.claude/gsd-core/VERSION] | — |
| Real codebase maps | sketch inputs, shape reading | **no** (`~/codebases/{labelore,cinedise-portal,duet,cinedise-portfolio,studio-windows}/.planning/codebase` absent) [VERIFIED: find / -path "*/.planning/codebase" returned only the shapes fixture] | — | Run `/gsd-map-codebase` (D-03); tests use made-up fixtures plus labelore's own fresh map by shape |
| Real SPEC, AI-SPEC, USER-SETUP, EVAL-REVIEW, DOM-VERIFY, REVIEWS | — | **no** (none exists; D-11) | — | Hand-filled made-up examples from the templates and writers |
| Google Chrome | ad-hoc and sweep screenshots | yes, `/usr/bin/google-chrome` [VERIFIED: which] | — | Playwright bundled chromium is not installed (`~/.cache/ms-playwright` holds only a lock directory) |
| Playwright e2e | map-only entry paths, hard reloads | present as a dev dependency; `playwright.config.ts` starts four servers on 4196 to 4199 and runs `npm run build` for one | 1.63.0 | Run one spec with `-g`; the `startProjectsServer` helper (ports 5320-5329) serves arbitrary project paths and a synthetic HOME for the scan flow without touching the config |
| Running `labelore` service on 4173 | the user's own review | yes (per memory) | — | Restart after every change |

**Missing dependencies with no fallback:** none blocks planning. The fresh real maps are a prerequisite for the Concerns and Architecture sketches and for the "hard real docs" screenshot check, not for the handlers.
**Missing dependencies with fallback:** all listed above.

## Security Domain

(`security_enforcement` is enabled, `security_asvs_level` 1 [VERIFIED: .planning/config.json])

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | local read-only tool, no accounts |
| V3 Session Management | no | none |
| V4 Access Control | yes | Read-only guarantee: no write path; `resolveTargetPath` canonicalises once; in-tree symlink escape already refused in the filesystem port; the marker check only tests existence of seven fixed names |
| V5 Input Validation | yes | Untrusted markdown: line and character scans, body caps, row caps, cell caps, growth tests (`measureGrowth`); author text through `tokenizeInline` only; no raw-HTML prop; every link from the payload registry, never from document text |
| V6 Cryptography | no | none; never hand-roll a secret transform |
| V8 Data Protection | yes | USER-SETUP and INTEGRATIONS variable values withheld in `structured` and in the View DOM (Pitfall 12); the leak paths that remain (Source, search) are recorded, not widened |
| V12 Files | yes | Handlers read only what the repository hands them; fixtures contain made-up content only |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Quadratic or catastrophic scanning of a hostile 250 KB map or review body | Denial of service | Linear scans, per-section caps, `measureGrowth` tests (`GROWTH_LIMIT = 24`) over table-row, heading-pair, one-long-line and capital-run shapes; no regex built from document text |
| Script or HTML in a requirement, concern, reviewer text or DOM-VERIFY observed text | Tampering / XSS | Text nodes through `tokenizeInline`; DOM-VERIFY quotes are text only (the verifier agent wraps page text in code and treats it as data) |
| A secret value shown, searched or copied (USER-SETUP, env vars) | Information disclosure | Name-only lift; assert absence in markup, `title`, `aria-label`, serialised `structured`; no copy button carries a value |
| Copy-to-clipboard of attacker-chosen text | Tampering | The copied command is one of four constants chosen by readiness; it is never read from a file |
| Open redirect or wrong-origin link from a cross-reference | Spoofing | Links built from payload keys; `redirectTo` in `route-dispatch.ts` rejects `//host` and `/\`; a bare `/codebase` redirect target comes from the payload |
| Marker check following a symlinked `codebase` out of the tree | Information disclosure | Existence test only, after canonicalisation; reads still go through the guarded filesystem port |
| A made-up example carrying real data | Information disclosure | Marker plus index plus `fixture-leak.test.ts` deny list; nothing copied from the fresh maps |

## Sources

### Primary (HIGH confidence)
- Labelore source read this session: `src/planning-repo/folders.ts`, `naming.ts`, `handlers/{index,coverage,generic,project-research,artifact-token,markdown-sections,coverage-body}.ts`, `src/cli/target-path.ts`, `src/server/{project-api,project-presentation,folder-scan,project-title,project-registry}.ts`, `src/presentation/{routes,reserved,shell-header,project-research,project-research-files}.ts`, `src/web/{route-dispatch,app-router,query-keys}.ts(x)`, `src/web/pages/{research-page,dashboard-page,project-layout,artifact-page,document-route}.tsx`, `src/web/components/{app-shell,artifact-header,copy-path-button,fenced-figure,lifted-diagram}.tsx`, `src/web/components/ui/toast.tsx`, `src/web/views/{kinds,manifest,manifests,fallback}.ts`.
- Labelore tests and fixtures read: `test/web/{view-registry,navbar-contract,class-vocabulary,build-splitting,coverage-view-contract}.test.ts`, `test/{fixture-leak,no-skips,scanner-growth,coverage-handler,target-path}.test.ts`, `test/helpers/{fixture-roots,shapes-project,growth,vitest-gate}`, `test/e2e/{pages,fixture-server,projects-server}.ts`, `playwright.config.ts`, `fixtures/README.md`, `test/fixtures/{lendshed,shapes}/README.md`.
- Phase 9 artifacts: `09-PATTERNS.md`, `09-RESEARCH.md`, `09-REVIEW.md` (WR-03, WR-05, IN-03), `09-VERIFICATION.md`, `09-UAT.md`, plan list and waves.
- GSD 1.19.0 sources: `templates/{spec,AI-SPEC,user-setup}.md`, `agents/{gsd-codebase-mapper,gsd-eval-auditor,gsd-dom-verifier}.md`, `workflows/{map-codebase,spec-phase,review,eval-review}.md`, `bin/lib/{onboard-projection,eval,drift,verify}.cjs` (stamp), `bin/lib/review-lane-descriptor.cjs`, `references/agent-contracts.md`, `VERSION`.
- Experiments run this session: Lendshed copy with six new type files (kinds and addresses); a map-only scratch project (CLI from project path ok, `.planning` path `not-a-gsd-project`, dashboard payload empty); `tryParseFrontmatter` on `last_mapped_at` and `last_mapped_commit` values.
- Project memory (parallel-view-pipeline, per-type-view-loop, no-slow-e2e-runs, verify-against-sketch, sketch-fresh-structure, sketch-polish-ask-first, restart-after-every-change, adhoc-screenshots).

### Secondary (MEDIUM confidence)
- `.planning/research/{FEATURES,ARCHITECTURE,PITFALLS}.md` (v2.1 research): codebase-map family table, B.3 codebase-only projects, "no real example" pitfall. Its machine-specific real examples are gone.

### Tertiary (LOW confidence)
- None used as authority. Real-file variety for AI-SPEC, REVIEWS bodies, DOM-VERIFY bodies and the fresh maps is unknown until produced.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH (no new dependency; every seam read)
- Architecture: HIGH (Phase 9 pipeline mirrored; kinds and addresses proven by experiment)
- Writer and template shapes: HIGH (read from the agents, templates and workflows)
- Lift rules for real map and AI-SPEC variety: MEDIUM to LOW (templates only; confirm on fresh maps and made-up files)
- Pitfalls: HIGH for code-derived ones (verified), MEDIUM for REVIEWS and DOM-VERIFY body variety

**Research date:** 2026-11-04
**Valid until:** 2026-12-04 (the app is stable; GSD templates and writers move with each gsd-core release, so re-check `VERSION` and the writers before freezing fixtures)
