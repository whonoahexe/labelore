# Quick Task 260923-jxp: Discussion-log page review fixes on the B3 layout - Context

**Gathered:** 2026-09-23
**Status:** Ready for planning

<domain>
## Task Boundary

The user reviewed the DISCUSSION-LOG page built by quick-260922-3us (sketch-004 B3 folded-chapters layout).
The B3 UI is liked and stays. This task refines it with nine review items:

1. Show the log's date on the page.
2. Show gray areas that were offered but not selected as greyed-out chapters.
3. Show each option's title as well as its description.
4. Number the options properly and make them look less boring.
5. Stop dropping questions where the user gave a custom answer. Example: studio-portal phase 1, area 2, question 1 is missing.
6. Surface each question's **Notes:** and accepted gaps, but quietly.
7. Redesign the "Also in this document" block (Claude's discretion, deferred ideas, open questions). It stays at the end.
8. Fix the wrong numbers in the "at a glance" `document-cover-pill`s.
9. Remove the raw path breadcrumb from the artifact header panel (e.g.
   `.planning/phases/01-portal-owned-identity-sessions/01-DISCUSSION-LOG.md`). Replace it with a copy-path icon
   button on **every** artifact page, not just discussion logs.

Out of scope: frontmatter-structured pages (PLAN, VERIFICATION, SUMMARY…). They only pick up item 9's shared header
change, and they must not regress.

</domain>

<decisions>
## Implementation Decisions

### Unselected gray areas (item 2)
- Show **ghost chapters only when the log names the declined areas**. A declined area gets a greyed,
  non-expandable chapter row placed after the real topics in the chapter index and the chapter list,
  labelled "Not discussed".
- Known source shapes that name them (all prose, so parse tolerantly):
  - `.planning/milestones/v1.0-phases/03-search-browsing-traceability/03-DISCUSSION-LOG.md`, under
    `### Gray areas noticed but not raised`: "Offered at wrap-up and declined: A, B, C, and D."
  - `.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-DISCUSSION-LOG.md`, under
    `## Claude's Discretion`: "Two gray areas were identified during analysis, offered, and deliberately left
    open…", followed by bold-led bullets `- **Name** — …`.
  - `~/studio-portal/.planning/phases/04-bulk-archive-downloads/04-DISCUSSION-LOG.md`, under
    `## Open Questions Carried Forward`: "Three gray areas were offered at the end and the user chose to
    proceed… : where X; whether Y; and whether Z." The user did **not** pick the option that parses this
    `where/whether` prose, so this shape may stay un-ghosted if it can't be parsed cleanly. Do not force it.
- When the log only says "all N offered areas were selected" (the common case), or says nothing, show a quiet
  cover line/fact such as "4 of 4 offered areas discussed". The discussed areas come from the
  `**Areas discussed:**` line when present, otherwise from the topic count.
- Unrecognised shape: no ghosts and no error (degrade, don't break).

### Option layout (items 3 and 4)
- **Keep today's shape. The chosen option stays up top as the answer card, and the rest are folded.**
- The chosen answer card shows the option's **number and title** (e.g. `① 30-day sliding idle`), then its
  description, then a `✓ Chosen` / `Claude chose` state.
- The disclosure (`▸ 3 other options`) opens a **numbered list** in source-table order. Each row is
  `② 7-day sliding idle — Same mechanism…`: the number, then the title (option cell), then the description.
- Numbers are the option's 1-based position in the source table, so the chosen option keeps its real number
  (it isn't always ①).
- Make the numbers visually distinctive, e.g. a small squared numeral badge, within the existing design
  language. Exact styling is Claude's call.

### Notes and accepted gaps (item 6)
- **Behind a small toggle.** A question with a `**Notes:**` line gets a tiny, quiet "note" affordance in its row.
  Activating it expands the note text. It is hidden until asked for.
- "Accepted gap: …" sentences inside a note are part of the note text. They get no separate loud treatment. A small
  inline marker inside the expanded note is fine.
- This is separate from the "other options" disclosure. Do not bundle the note into it as today's
  "`N other options · note`" label does.

### End section (item 7)
- Replace the "Also in this document" block with an **endnotes sheet**: a single typographic sheet at the bottom
  of the document, like a report's back matter.
- Each panel (Claude's Discretion, Open Questions / Carried forward, Deferred Ideas) becomes a subsection with a
  small-caps heading and hanging bullets. It is always open, reads quieter than the chapters, and keeps its
  anchor id so cover glance links and the chapter index still jump to it.
- It stays last. The chapter index may list it as one final "Endnotes" entry.

### Claude's Discretion
- **Log date (item 1):** read the `**Date:**` line from the log body (every audited log has one) and show it in the
  cover `facts`. Fall back to frontmatter or omit if absent. Format it like other dates in the app.
- **Custom answers (item 5):** root cause confirmed in `src/planning-repo/handlers/section-projection.ts:80`. It
  matches `row['Selected']?.trim() === '✓'` exactly, but the audited sources also use `✓ (renamed)`,
  `✓ (Claude's call)` and `✓ (superseded)`.
  - Treat a cell that **starts with** `✓` as chosen, and carry the parenthetical as a qualifier. Show it as a
    small chip beside the state (e.g. "renamed").
  - When the user's quoted words differ from the chosen option, show them as "Your words" on the answer card.
    For example, `"cli command but dont use cinedise-portal, use the name backstage for cli"`.
  - A question whose table has no `✓` row but has a `**User's choice:**` line must still render, with a
    "Custom answer" state and the user's text as the answer.
  - `✓ (Claude's call)` maps to the "Claude chose" state.
  - Update the survey-derived tests or fixtures that assumed exact `✓`.
- **Pill counts (item 8):** the counts are wrong today. Investigate against real logs (both corpora) and fix
  them. A likely cause is `structured.topics` counting non-topic `##` sections (Claude's Discretion, Deferred
  Ideas, Open Questions, Execution-Time Decisions…) as topics, and/or totals derived from `questionCount`
  rather than rendered questions.
  - Every cover number (headline, status, pills, glance) must equal what the page actually renders.
  - Add a unit test that asserts this against at least one real log.
- **Copy-path button (item 9):** it lives in the shared artifact header, so every artifact page gets it,
  including frontmatter pages and generic markdown pages.
  - Use a lucide icon button (`Copy` → `Check` for ~1.5s on success) with an accessible label and tooltip
    showing the relative path.
  - Use `navigator.clipboard.writeText`, and fail silently or show a quiet error state if clipboard is unavailable.
    Note that the tailnet URL is HTTPS, so the clipboard API is available.
  - Remove the raw breadcrumb text entirely.
- Styling, class names and spacing must follow `docs/design-language.md`. Any new classes must pass
  `test/web/class-vocabulary.test.ts`, and the F-01..F-15 foundation e2e sweep must stay green in light and
  dark at 1280 and 420 widths.

</decisions>

<specifics>
## Specific Ideas

- Repro for item 5: studio-portal
  `.planning/phases/01-portal-owned-identity-sessions/01-DISCUSSION-LOG.md`, `## Cutover & bootstrap admin`,
  first question "How does the very first account come into existence?". Its selected cell is `✓ (renamed)`.
- The B3 layout lives in `src/web/views/layout.ts`, `layout-components.tsx` and `layout-discussion-log.ts`.
  The parse lives in `src/planning-repo/handlers/section-projection.ts`, and the header in
  `src/web/components/artifact-header.tsx`.
- The corpus for checking behaviour is this repo's `.planning/` (including `milestones/*-phases/`) plus
  `~/studio-portal/.planning/`. All ~13 discussion logs should render without dropped questions.

</specifics>

<canonical_refs>
## Canonical References

- `.planning/sketches/004-sheet-refined/` — the B3 sketch (visual reference; keep its feel)
- `.planning/quick/260922-3us-build-sketch-004-b3-folded-chapters-docu/260922-3us-SUMMARY.md` — what was built
- `.planning/notes/artifact-structure-survey.md` — DISCUSSION-LOG shape + the "anchor on the table" rule
- `docs/design-language.md` — class vocabulary and visual conventions (enforced by test)

</canonical_refs>
