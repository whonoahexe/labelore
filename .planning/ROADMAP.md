# Roadmap: Labelore

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-09-10)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-09-10</summary>

- [x] Phase 1: Read Layer & Domain Model (4/4 plans) — completed 2026-08-24
- [x] Phase 2: Situational Awareness & Artifact Reading (16/16 plans) — completed 2026-09-01
- [x] Phase 3: Search, Browsing & Traceability (4/4 plans) — completed 2026-09-02
- [x] Phase 4: Portability & Degradation Hardening (6/6 plans) — completed 2026-09-08

Full phase detail, success criteria, and plan waves: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

## Backlog

### Per-kind artifact views

**Candidate phase for the next milestone.** Captured 2026-09-20 via `/gsd-explore`. Filed as
backlog rather than a phase because v1.0 is shipped and no milestone is currently open — promote
it with `/gsd-new-milestone` or `/gsd-review-backlog`.

**Problem:** Document pages (`ArtifactPage`, `PlanPairPage`) render every artifact type through one
generic markdown pipeline, so the content is present but not legible — a DISCUSSION-LOG, a
VERIFICATION and a PLAN all read identically. Three causes, not one: 11 of 16 types have no
structured representation, the established design language is undocumented, and there is no
purpose-based categorization. Full diagnosis:
[notes/per-kind-artifact-rendering.md](notes/per-kind-artifact-rendering.md).

**Categorization: settled 2026-09-20.** No purpose taxonomy. Extraction keys on **where a type's
structure lives**; `kind` becomes the single presentation axis and goes granular; the sidebar stays
grouped by `location`; unmanifested types get a speculative structural read behind the existing
unknown-kind badge. Decision and rationale: [research/questions.md](research/questions.md).
Empirical basis (425 files surveyed): [notes/artifact-structure-survey.md](notes/artifact-structure-survey.md).

**Shape — 3 extraction strategies + 16 manifests, not N templates.** Two of the three strategies
already exist. A manifest declares which fields or sections a type promotes; it is a handful of
lines.

| Strategy | Status | Types |
|---|---|---|
| Frontmatter projection | Exists (gray-matter; already on the wire, never read) | PLAN, SUMMARY, VERIFICATION, REVIEW, MILESTONE-AUDIT |
| Tag projection | Exists (`renderPlanRange`) | PLAN body |
| Section projection | **To build** — composes `splitSections` / `splitSubsections` / `parseMarkdownTable`, all already shipping in `markdown-sections.ts` | CONTEXT, RESEARCH, PATTERNS, UI-SPEC, UAT, VALIDATION, SECURITY, UI-REVIEW, ROADMAP, REQUIREMENTS, REVIEW-FIX, DISCUSSION-LOG |

**Scope, in dependency order:**

1. ~~Settle the categorization question~~ — done 2026-09-20.
2. ~~Fix the shared document chrome~~ — done 2026-09-20, quick task `260920-mzr`
   ([todos/done/artifact-chrome-drift.md](todos/done/artifact-chrome-drift.md)).
3. Codify the existing design language as a documented, testable convention. It already exists and
   is consistent across dashboard/roadmap/traceability/search; it is simply unwritten.
4. Build the per-kind **view registry** mirroring `HANDLERS` (`src/planning-repo/handlers/index.ts`),
   so each type is a registry entry rather than a branch in `artifact-page.tsx`. Wire
   `artifact.structured` through to it — today it is serialized and never read. Split the `kind`
   catch-alls so the registry has real keys to dispatch on.
5. Build the section-projection extractor and the speculative-structure fallback.
6. Prove it end to end on **DISCUSSION-LOG**: highest stated value, and its structure is already
   fully machine-readable (`##` topic → `###` question → `| Option | Description | Selected |`
   table with `✓`). Anchor on the table — audited at 12/12 files — and treat the
   `**User's choice:**` prose line as tolerant enrichment, since it already has two spellings.
7. Enumerate the remaining 15 types as follow-on quick tasks, scoped against the seam once it
   exists. Note the frontmatter-projection types need **no handler work at all** — only a view.

**Why a phase and not a list of quick tasks:** the first type cannot be a quick task. It would add
a bespoke branch plus bespoke CSS, the second would add another, and by the sixth there would be
six one-off code paths with no shared contract — the same drift already visible between
`.page-stack` and `.artifact-page`, multiplied sixteen-fold. Once the seam and the documented
language exist, every remaining type genuinely is a quick task.
