# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-09-10
**Phases:** 4 | **Plans:** 30 (79 tasks) | **Sessions:** not tracked

### What Was Built
- A headless read layer: any `.planning/` tree becomes an immutable, cross-referenced `ProjectSnapshot`
  behind a swappable filesystem seam, proven byte-identical against three committed golden fixtures.
- The dashboard, roadmap, and a sanitized, PLAN-aware markdown reader (GFM, dual-theme Shiki,
  client-side Mermaid) with plan–summary pairing and clickable milestone-qualified ID mentions.
- Exact-token full-text search (MiniSearch, non-blocking build), a disk-mirroring tree navigator, and
  a dual-status requirements traceability view.
- Portability and degradation hardening: one refresh seam with an atomic derived-view swap, an
  invalid-project screen, a shared damaged-artifact vocabulary, and a generic empty state, all driven
  adversarially against sparse, dense, stripped, and corrupted fixtures.

### What Worked
- **Data before pixels.** Phase 1 shipped no UI and proved the snapshot against adversarial fixtures
  first. Phase 4's portability proof then ran against fixtures that already existed, and no parser
  overfit to studio-portal ever surfaced.
- **Tracer-first waves.** Every phase opened with a thin end-to-end slice, and later waves extended
  it instead of integrating separately built pieces.
- **Keeping signals separate.** Roadmap completion and observed disk state, and a requirement's own
  checkbox and its phase's status, were kept as distinct fields throughout. That surfaced
  disagreements that a merged verdict would have hidden.
- **Re-verifying after late churn.** Phase 02 was re-verified after 29 post-approval commits, and the
  milestone audit re-ran tree health independently instead of trusting summaries.

### What Was Inefficient
- **Phase 02 ran to 16 plans and three human UAT gate rounds** (02-06 → 02-09/02-13 → 02-17). Visual
  and contrast defects on real long-form content were only found at blocking human gates, each of
  which spawned a gap-closure wave.
- **Code review landed after verification.** Phase 03 and 04 review findings (including two critical
  ones in 04) were closed by quick tasks after their phases had verified `passed`. The first milestone
  audit returned `gaps_found` because of this.
- **Doc-only edits re-staled verification.** Tech-debt reconciliation touched two SUMMARY files and
  marked phases 02 and 03 `stale` at close, which forced an override closeout.
- **UI reviews re-staled by their own fixes.** CSS changes in the tech-debt pass invalidated the
  03/04 UI reviews, which then had to be re-run after every CSS change had landed.

### Patterns Established
- Sanitize immediately after `rehype-raw` and before any plugin that injects trusted markup
  (slug, link rewrite, Shiki).
- One captured derived-views bundle per request, so a concurrent refresh can never mix pre- and
  post-refresh data in one response.
- DOM-free sibling modules (`*-filter.ts`, `*-deep-link.ts`) for web logic that plain `.ts` tests
  must import.
- Dangling references are data (`{raw, resolved: null}`), not warnings, so warnings stay
  high-signal.
- Measure before fixing visual and accessibility findings: rendered-pixel contrast, per-breakpoint
  reachability, and chunk sizes, each pinned by a regression test.

### Key Lessons
1. Run code review before phase verification, or re-verify after review fixes land. A `passed`
   verification that predates a critical review finding is not a real pass.
2. For UI-heavy phases, put an automated per-surface contrast and overflow check ahead of the
   blocking human gate, so the gate confirms instead of discovers.
3. Batch documentation reconciliation *before* the final verification and audit pass, not after, so
   it doesn't re-stale verified phases.
4. When a stack pick hits a toolchain gap (TS7 vs `typescript-eslint`'s peer range), pin the known-good
   version and record why, rather than working around it.

### Cost Observations
- Model mix: not tracked (`model_profile: adaptive`)
- Sessions: not tracked
- Notable: 309 commits over 21 calendar days. Phase 02 alone accounts for more than half of all plans.

---

## Milestone: v1.1 — Legible Documents

**Shipped:** 2026-09-21
**Phases:** 1 | **Plans:** 6 (13 tasks) | **Sessions:** not tracked

### What Was Built
- A client-side view registry keyed on a granularised `kind`: View is the page, Source the escape
  hatch. Three extraction strategies (frontmatter, tag, section projection) plus 18 small manifests
  — not 18 templates — with a speculative structural fallback for anything unregistered.
- The design language written down (`docs/design-language.md`) and enforced by a class-vocabulary
  allowlist test derived from the doc's own table, so a new view cannot drift silently.
- Reading-position-tracking outline (one IntersectionObserver, pure `pickActiveEntry`) that becomes
  a sticky keyboard-operable disclosure below 58rem; clickable `D-XX` / `WR-XX` mentions resolved
  phase-local-first-then-corpus-unique.
- Thirteen directory quick tasks and five inline ones between the v1.0 close and Phase 5: token
  centralisation, navbar and sidebar redesign, progress panel, loading states, scrollbars,
  traceability page redesign (three rounds), per-milestone roadmap parsing, and the document page
  chrome fix that Phase 5 then built on.

### What Worked
- **Clearing the blockers before the phase, not inside it.** The categorization decision
  (`research/questions.md`) and the document page frame (quick task `260920-mzr`) were settled the
  day before planning. Phase 5 never had to stop for a design argument.
- **Survey first, then scope.** 425 files surveyed (`notes/artifact-structure-survey.md`) turned
  "16 view templates" into "3 strategies + 16 manifests" — the phase was one wave of foundation and
  three short waves of manifests, not a restyle marathon.
- **Naming the language before multiplying surfaces.** Plan 05-02 wrote the convention and its test
  before 05-03..05-06 authored fifteen manifests against it. Zero drift findings in the UI-06 sweep.
- **Tracer-first held again.** 05-01 proved DISCUSSION-LOG end to end before anything else; every
  later plan extended the same registry rather than adding a branch to `artifact-page.tsx`.
- **The conformance sweep found a real bug.** Running the `context` manifest against this repo's own
  `05-CONTEXT.md` exposed the CommonMark HTML-block swallowing of headings after `<domain>`-style
  tags — a v1.0-era handler bug no fixture had caught.

### What Was Inefficient
- **Tests promised by the threat register were not written.** 05-SECURITY closed with
  `threats_open: 0` but three regression tests (ReDoS timing, `dangerouslySetInnerHTML` guard,
  View-mode outline cap) were noted rather than added. They carry into the next milestone as debt.
- **Contract tests still collide with new literal requirements.** VIEW-06's literal
  `data-tone="quiet"` requirement broke a v1.0 blanket "no static data-tone" contract test; the fix
  (narrowing the regex) was right, but the same source-text-contract fragility flagged in the
  `loading-state-regression` debug session recurred.
- **A provider 429 mid-plan cost a session.** 05-05 stalled after Task 1 and a continuation executor
  had to reconstruct Task 2 from uncommitted working-tree state. It worked, but the 235-minute wall
  clock against ~40 minutes of actual work shows the recovery is not free.
- **The traceability page took three quick-task rounds** (`ns4` → `wba` → `qkd`) to settle —
  visual regressions from a redesign were found by the user, not by a check, the same pattern as
  v1.0's Phase 02 gates.

### Patterns Established
- View registry mirrors the handler registry: `resolveViewFor` is the one dispatch path, with a
  synthesized manifest for unregistered kinds so the page has exactly one render path.
- Design vocabulary as an allowlist test that reads the design doc's own table rows plus a
  view-local class namespace (`D-09`).
- Extraction keyed on where structure lives (frontmatter / tag / section), never on document
  purpose.
- Two-tier reference resolution (phase-scoped map, corpus-wide map) built from one primitive so
  there is one ambiguity rule, not two.
- Reuse the wide layout's own list markup inside the narrow disclosure (`OutlineList`) so two
  presentations cannot drift.

### Key Lessons
1. When a threat register or plan "promises" a regression test, write it in the same plan. A
   promise recorded in a SECURITY.md note is tech debt from the moment the phase verifies.
2. Blanket source-text contract tests ("this file never contains X") will collide with the next
   legitimate use of X. Prefer contracts that name the specific derivation being protected.
3. Running a new extractor against the project's *own* `.planning/` — not just fixtures — is a
   cheap end-of-phase check that found a real v1.0 bug here. Keep it in the conformance sweep.
4. Redesign quick tasks that touch a whole page need a visual-regression pass before hand-off; three
   rounds on the traceability page is the second milestone in a row where a blocking human found
   what an automated per-surface check could have.

### Cost Observations
- Model mix: not tracked (`model_profile: adaptive`)
- Sessions: not tracked
- Notable: 127 commits over 11 calendar days; the phase itself (6 plans) ran 2026-09-20 → 09-21 —
  the other nine days were quick tasks. Tests grew 590 → 1071 (+481) across 40 → 64 files.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | not tracked | 4 | Baseline: data-first phase order, tracer-first waves, adversarial fixtures |
| v1.1 | not tracked | 1 | Blockers cleared before the phase; convention written and tested before surfaces multiplied; survey-driven scoping |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 590 | not measured | — |
| v1.1 | 1071 | not measured | — |

### Top Lessons (Verified Across Milestones)

1. **Tracer-first waves hold.** Both milestones opened every phase with a thin end-to-end slice and
   extended it; neither ever integrated separately built pieces.
2. **Human gates still find visual defects an automated per-surface check should.** v1.0 Phase 02
   (three UAT rounds) and v1.1's traceability page (three quick-task rounds). An automated contrast
   / overflow / regression pass ahead of the human gate is now a two-milestone recommendation.
3. **Source-text contract tests are fragile in both directions.** They passed on broken code
   (`loading-state-regression`) and failed on correct code (VIEW-06 vs the D-12 contract). Prefer
   behavioural tests on extracted plain-`.ts` modules; where a text contract is unavoidable, name the
   exact derivation it protects.
4. **Batch documentation and debt reconciliation before the final verification pass** (v1.0), and
   write promised regression tests inside the plan that promises them (v1.1) — both are the same
   lesson: work recorded as "to do later" at verification time is debt at close.
