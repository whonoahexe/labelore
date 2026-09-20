# Open Research Questions

Questions raised during planning that need deeper investigation before they can be decided.

---

## How should the 16 artifact types be categorized for presentation?

**Raised:** 2026-09-20 (`/gsd-explore` — planning artifact rendering)
**Blocks:** per-kind artifact views (see `.planning/notes/per-kind-artifact-rendering.md`)

Two categorization schemes exist today and neither answers *what a document is for*:

- **`location`** — 6 sidebar groups (`Project`, `Phases`, `Archived phases`, `Quick tasks`,
  `Milestones`, `Research`), from `LOCATION_ORDER` in `src/planning-repo/discovery.ts:35`.
  Describes where the file sits on disk, nothing more.
- **`kind`** — 11 handler kinds from `src/planning-repo/handlers/index.ts`, but 11 of the 16 real
  document types collapse into 2 catch-alls (`frontmatter-only`, `unknown`), so it cannot serve as
  a presentation axis as it stands.

A purpose-based axis — e.g. decision record / verification evidence / specification / research /
narrative — would drive both sidebar grouping and which view template a type receives.

**To settle:**

1. What are the purpose categories, and do the 16 types partition cleanly into them? (PLAN,
   SUMMARY, VERIFICATION, UAT, SECURITY, REVIEW, DISCUSSION-LOG, CONTEXT, UI-SPEC, RESEARCH,
   PATTERNS, COVERAGE, UI-REVIEW, ROADMAP, REQUIREMENTS, MILESTONE-AUDIT.)
2. Is purpose a **third** field alongside `location` and `kind`, or does it take over `kind`'s
   presentation role while `kind` stays a parse-time concern?
3. Does one purpose category map to one view template, or do types within a category still need
   individual views? This determines whether the work is ~5 templates or ~16.
4. Should the sidebar regroup by purpose, keep grouping by location, or offer both?
5. How does an unrecognized type degrade — which category does it fall into, and does the
   `unknown` marker survive? (Compatibility constraint: unknown files must degrade, not break.)

**Why it must precede the views:** the answer sets how many templates get built and what the
view-registry key actually is. Designing views first would hard-code an answer by accident.
