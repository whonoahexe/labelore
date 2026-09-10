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

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | not tracked | 4 | Baseline: data-first phase order, tracer-first waves, adversarial fixtures |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 590 | not measured | — |

### Top Lessons (Verified Across Milestones)

1. *(Pending a second milestone to cross-validate v1.0's lessons.)*
