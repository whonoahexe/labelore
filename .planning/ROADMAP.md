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

**Scope, in dependency order:**

1. Settle the categorization question ([research/questions.md](research/questions.md)) — it
   determines how many view templates exist.
2. Codify the existing design language as a documented, testable convention. It already exists and
   is consistent across dashboard/roadmap/traceability/search; it is simply unwritten.
3. Fix the shared document chrome
   ([todos/pending/artifact-chrome-drift.md](todos/pending/artifact-chrome-drift.md)) so views
   inherit a correct frame.
4. Build a per-kind **view registry** mirroring `HANDLERS` (`src/planning-repo/handlers/index.ts`),
   so each type is a registry entry rather than a branch in `artifact-page.tsx`. Wire
   `artifact.structured` through to it — today it is serialized and never read.
5. Prove it end to end on **DISCUSSION-LOG**: highest stated value, zero parsing today, so it
   exercises both the handler and view layers.
6. Enumerate the remaining 15 types as follow-on quick tasks, scoped against the seam once it
   exists.

**Why a phase and not a list of quick tasks:** the first type cannot be a quick task. It would add
a bespoke branch plus bespoke CSS, the second would add another, and by the sixth there would be
six one-off code paths with no shared contract — the same drift already visible between
`.page-stack` and `.artifact-page`, multiplied sixteen-fold. Once the seam and the documented
language exist, every remaining type genuinely is a quick task.
