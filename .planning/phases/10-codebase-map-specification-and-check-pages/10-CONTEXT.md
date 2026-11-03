# Phase 10: Codebase Map, Specification and Check Pages - Context

**Gathered:** 2026-11-03
**Status:** Ready for planning (fresh maps and made-up examples come before the sketches, see D-14)

<domain>
## Phase Boundary

The seven codebase-map documents (stack, architecture, structure, conventions, testing, integrations,
concerns) open into designed pages. A project whose `.planning/` holds a codebase map and no roadmap
opens on a "mapped, not started" first screen built from them. The documents a phase is specified
with (SPEC, AI-SPEC, USER-SETUP) and checked with (EVAL-REVIEW, browser check / DOM verify,
cross-AI REVIEWS) open into designed pages, each built and tested against a made-up example derived
from GSD's own template, and that made-up rule binds every later type with no real example.
Requirements VIEW-13, TGT-09, VIEW-11, VIEW-12, VIEW-21.

Not in this phase: spikes, seeds, threads, handoff, reports, intel/graphs and workstreams (Phase 11),
`config.json` settings page and Source mode (Phase 12), search and the palette (Phase 13), and any
first screen for a `.planning/` that has neither a map nor a roadmap (D-08).

</domain>

<decisions>
## Implementation Decisions

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § Phase 10: goal and the five success criteria
- `.planning/REQUIREMENTS.md`: VIEW-11, VIEW-12, VIEW-13, VIEW-21, TGT-09
- `.planning/PROJECT.md` § Key Decisions: "per-type view is the page", "sketch first", the made-up
  fixture rule, "keep disagreeing signals separate"

### Research already done for this phase
- `.planning/research/FEATURES.md` § the codebase-map family table (structure and "at a glance" per
  document, heading variations) and § B.3 Codebase-only projects ("mapped, not started": table
  stakes, map readiness, next-step rules)
- `.planning/research/ARCHITECTURE.md`: Feature 3 (pointing at `.planning` directly), folder scan
  (codebase-only `.planning/` qualifies)
- `.planning/research/PITFALLS.md`: the "no real example on this machine" pitfall (templates show
  intent, not guarantee)

### GSD sources the examples and lifting derive from
- `~/.claude/gsd-core/workflows/map-codebase.md`, `~/.claude/gsd-core/templates/codebase/`, and the
  `gsd-codebase-mapper` agent: what the seven documents contain
- `~/.claude/gsd-core/bin/lib/onboard-projection.cjs`: `map_readiness` and the next-step rules
  (D-02, D-06)
- `~/.claude/gsd-core/templates/spec.md`, `templates/AI-SPEC.md`, `templates/user-setup.md`: spec family
- `~/.claude/gsd-core/workflows/` and `~/.claude/agents/` for eval-review (`gsd-eval-auditor`),
  DOM verify (`gsd-dom-verifier`, DOM-VERIFY.md) and cross-AI reviews (`/gsd-review`, `*-REVIEWS.md`)

### Prior phase decisions this builds on
- `.planning/phases/07-recognised-files-and-readable-urls/07-CONTEXT.md`: URL scheme (`codebase/:doc`)
- `.planning/phases/08-several-projects-and-a-switcher/08-CONTEXT.md`: D-15 (codebase-only counts
  in the scan), D-17 (one resolver for paths)
- `.planning/phases/09-review-audit-and-root-document-pages/09-CONTEXT.md`: D-12/D-13 sketch rules,
  D-15 fixture-shape coverage

### Design
- `docs/design-language.md`: tones, tokens, chips; enforced by `test/web/class-vocabulary.test.ts`
- `.planning/sketches/MANIFEST.md`: 031 (research frame) and 032–037 (panels) are the model for
  D-01/D-14; 012 (lifted diagram), 014 (UI-SPEC), 016 (validation), 018 (UI-REVIEW), 021
  (verification) and 022 (review) are the nearest frames for the spec/check pages

### Real shapes (read for shape only; never copy into fixtures)
- `labelore/.planning/codebase/`, `~/codebases/cinedise-portal/.planning/codebase/`,
  `~/codebases/duet/.planning/codebase/`: generated in this phase (D-03)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/web/pages/research-page.tsx` + `research-*-panel.tsx` + `research-atoms.tsx`: the panel-page
  pattern D-01 copies (one page, one panel per file, URL picks the panel).
- `src/planning-repo/folders.ts` `codebaseKind`: the seven documents are already recognised as
  `codebase-<name>` kinds, with `urlSegment: 'codebase'`.
- `src/presentation/routes.ts`: `codebase/:doc` addresses already exist.
- The lifted-diagram and clean-tree figures from the Research Architecture panel (032): Architecture
  and Structure panels.
- `test/fixtures/shapes/.planning/codebase/` (ARCHITECTURE, CONVENTIONS, STACK): a partial-map shape
  already in the repo.

### Established Patterns
- Per-type views are registered in `src/web/views/kinds.ts` (`VIEW_KINDS`) and
  `src/web/views/manifests.ts`; the fallback notice is in `src/web/views/fallback.ts` (success
  criterion 5's readable generic page).
- Wiring files every view build touches: `handlers/index.ts`, `manifests.ts`, `artifact-page.tsx`,
  `globals.css`, the dense golden.

### Integration Points
- `src/cli/target-path.ts` `hasProjectMarker`: admit `codebase/` for the `.planning` path (D-09).
- `src/web/pages/dashboard-page.tsx` and `project-layout.tsx`: the mapped-not-started first screen
  and the hidden Roadmap/Traceability tabs (D-05, D-07).
- Folder scan and switcher (Phase 8): a map-only project must open from both.
- `test/fixtures/lendshed/.planning/`: home of the made-up examples and the fixtures index (D-10, D-12).

</code_context>

<specifics>
## Specific Ideas

- The Codebase page should feel like the Research page: several files that are read together, on
  one page.
- The real maps the research described have gone, so fresh maps from the current GSD version are
  the honest test of "reads the real maps correctly".
- Made-up examples must exercise the awkward cases the success criteria name (unfilled slots,
  "could not look", disagreeing reviewers), not just the happy shape.

</specifics>

<deferred>
## Deferred Ideas

- A first screen for a `.planning/` with neither a map nor a roadmap (e.g. ui-reviews only), such as
  a "not mapped" head with `/gsd-map-codebase`. Not in this phase (D-08).
- A visible "Made-up example" chip in the UI when a file carries the marker (D-10 reversibility).

</deferred>

---

*Phase: 10-codebase-map-specification-and-check-pages*
