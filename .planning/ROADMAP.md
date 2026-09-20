# Roadmap: Labelore

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-09-10)
- 🚧 **v1.1 Legible Documents** — Phase 5 (in progress)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-09-10</summary>

- [x] Phase 1: Read Layer & Domain Model (4/4 plans) — completed 2026-08-24
- [x] Phase 2: Situational Awareness & Artifact Reading (16/16 plans) — completed 2026-09-01
- [x] Phase 3: Search, Browsing & Traceability (4/4 plans) — completed 2026-09-02
- [x] Phase 4: Portability & Degradation Hardening (6/6 plans) — completed 2026-09-08

Full phase detail, success criteria, and plan waves: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

**v1.1 Legible Documents**

- [ ] **Phase 5: Per-Type Document Views** - Every artifact type renders through its own view, in one written-down visual language

## Phase Details

### Phase 5: Per-Type Document Views

**Goal**: Opening any planning document shows what that document is actually for — a discussion log
reads as questions and choices, a verification as what still needs a human, a plan as a plan — and
every one of them reads as the same application as the dashboard.

**Depends on**: Phase 4 (v1.0, shipped). Two prerequisites cleared 2026-09-20 outside this
phase — the artifact categorization decision ([research/questions.md](research/questions.md)) and
the shared document-page chrome (quick task `260920-mzr`).

**Requirements**: VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06, READ-07, BACK-02, UI-04,
UI-05, UI-06

**Success Criteria** (what must be TRUE):

1. Opening a discussion log shows, per question, the options that were offered and which one was
   chosen — without reading the raw markdown. *(VIEW-02)*
2. Opening a verification report leads with the checks still awaiting a human — each check, what is
   expected, and why a person is required — instead of leaving them inside collapsed metadata.
   *(VIEW-03)*
3. Every one of the 16 known artifact types opens into a view built for that type — a plan showing
   its task structure and which sections gate — and an artifact of a type with no registered view
   still opens with structure inferred from its shape, visibly marked unrecognized rather than
   presented as understood. *(VIEW-01, VIEW-04, VIEW-05, VIEW-06)*
4. Moving between a document view and the dashboard, roadmap, traceability or search reads as one
   application in both light and dark — same section headings, status chips, empty states, page
   intros — and a view that departs from the written convention fails a check instead of shipping.
   *(UI-04, UI-05, UI-06)*
5. On a long document the table of contents stays legible at every viewport width and tracks where
   the reader is; a `D-XX` or `WR-XX` mention in prose is clickable and lands on its source.
   *(READ-07, BACK-02)*

**Plans**: TBD

**UI hint**: yes

---

#### Scope shape — read before planning

The work is **3 extraction strategies + 16 small per-type manifests**, not 16 view templates. Two
of the three strategies already ship. A manifest declares which fields or sections a type promotes;
it is a handful of lines.

| Strategy | Status | Types |
|---|---|---|
| Frontmatter projection | Exists — gray-matter parses it, the server already serializes it to the client, nothing reads it | PLAN, SUMMARY, VERIFICATION, REVIEW, MILESTONE-AUDIT |
| Tag projection | Exists — `renderPlanRange` in `src/rendering/markdown.ts` | PLAN body |
| Section projection | **To build** — composes `splitSections` / `splitSubsections` / `parseMarkdownTable`, all already shipping and tested in `src/planning-repo/handlers/markdown-sections.ts` | CONTEXT, RESEARCH, PATTERNS, UI-SPEC, UAT, VALIDATION, SECURITY, UI-REVIEW, ROADMAP, REQUIREMENTS, REVIEW-FIX, DISCUSSION-LOG |

The established facts a plan must build on rather than re-derive are in
[REQUIREMENTS.md § Implementation Context](REQUIREMENTS.md). Empirical basis: 425 files surveyed,
[notes/artifact-structure-survey.md](notes/artifact-structure-survey.md). Three-axis diagnosis:
[notes/per-kind-artifact-rendering.md](notes/per-kind-artifact-rendering.md) (two claims corrected
2026-09-20 and marked as such).

#### Suggested wave structure

This is one phase carrying 11 requirements, so the decomposition inside it is where staging
happens. A sound ordering from the established facts:

| Wave | Work | Requirements |
|---|---|---|
| 1 — Foundation | Codify the existing design language as a documented, testable convention, and build the per-kind **view registry** mirroring `HANDLERS` (`src/planning-repo/handlers/index.ts`) with a granularised `kind`. Split the two catch-alls (`frontmatter-only`, `unknown`) so the registry has real keys to dispatch on, and wire `artifact.structured` through the client boundary — today it is serialized and never read. | UI-04, UI-05, VIEW-01 |
| 2 — Extraction | Build the section-projection extractor from the existing primitives, plus the speculative structural fallback: nested frontmatter → frontmatter projection, stable `##` sections → section projection with an outline, neither → plain markdown, with the existing unknown-kind badge marking it. | VIEW-06 |
| 3 — Proof | DISCUSSION-LOG end to end. Highest stated value, and its structure is already fully machine-readable. Anchor on the `\| Option \| Description \| Selected \|` table with `✓` — audited 12/12 — and treat the `**User's choice:**` prose line as tolerant enrichment, never the anchor (it already has two spellings). | VIEW-02 |
| 4 — Coverage | The remaining type manifests until all 16 have a registered view. VIEW-03 needs **no handler work** — `human_verification[]` is already an array of `{test, expected, why_human}` on the wire; it needs a view that promotes the field instead of burying it. | VIEW-03, VIEW-04, VIEW-05 |
| Any wave | Independent of the registry work, schedulable wherever it fits. READ-07's `DocumentOutline` already exists and is already sticky — the gap is appearance and reading-position tracking, not existence. `src/planning-repo/mentions.ts` already exists for BACK-02. | READ-07, BACK-02 |

UI-06 is not a wave — it is the conformance condition every view in waves 1-4 must satisfy against
the convention written in wave 1.

#### Why one phase, not a list of quick tasks

The first type cannot be a quick task. It would add a bespoke branch to `artifact-page.tsx` plus
bespoke CSS, the second would add another, and by the sixth there would be six one-off code paths
with no shared contract — the same drift already seen between `.page-stack` and `.artifact-page`,
multiplied sixteen-fold. Naming the design language must come **before** multiplying surfaces
against it. Once the registry and the documented language exist, each remaining type genuinely is a
small independent entry.

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 5. Per-Type Document Views | 0/? | Not started | - |

*Phases 1-4 (v1.0) are complete and archived — see [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md).*

## Backlog

No open backlog items. The "Per-kind artifact views" entry captured 2026-09-20 was promoted into
Phase 5 above and is tracked there, not here.
