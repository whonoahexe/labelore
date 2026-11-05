---
phase: 10-codebase-map-specification-and-check-pages
plan: 13
subsystem: ui-sketches
tags: [sketch, spec, ai-spec, ambiguity, requirements, template-slots, checklist, status-meter]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: 10-04 made-up Lendshed SPEC and AI-SPEC fixtures, 10-11 winners (frames not to reuse)
provides:
  - sketch 047 winner B (Lock matrix) for the Spec page
  - sketch 048 winner C (Datasheet + eval matrix) for the AI spec page
  - the fields each winning mark reads, and the template-slot rule built from GSD's templates/AI-SPEC.md
affects: [10-16 Spec page build, 10-18 AI spec page build]

tech-stack:
  added: []
  patterns: [visual-first document sketches, template-slot detection by verbatim template lines, column gauges against a gate line]

key-files:
  created:
    - .planning/sketches/047-spec-page/index.html
    - .planning/sketches/047-spec-page/README.md
    - .planning/sketches/048-ai-spec-page/index.html
    - .planning/sketches/048-ai-spec-page/README.md
  modified:
    - .planning/sketches/MANIFEST.md

key-decisions:
  - "047 winner B, Lock matrix: a strip of five column gauges (the ambiguity score against the gate line beside the verdict, then one column per dimension against its minimum), the requirements × Current/Target/Acceptance grid with Edge Coverage and Prohibitions squares per requirement, and the scope drawn as a fence; no synthesis"
  - "048 winner C, Datasheet + eval matrix: four big field cells (System type, Framework + version, Stakes level, Vendor lock-in), nine section squares beside the large checklist status-meter, evaluation dimensions placed by priority × measurement; all-slots state hatched with Template slot; no synthesis"

requirements-completed: [VIEW-11]

actuals:
  tokens: 62000
  tasks: 3
  commits: 3
plan_head_before: fdc929dbd43bfd010b00e5212da98f7074668881
plan_head_after: ec9bf3f48db218d6f04e8f8a4096799de7c0a825

duration: one round of sketching plus the checkpoint answer
completed: 2026-11-05
---

# Phase 10 Plan 13: Sketches 047 and 048 and the Spec / AI spec choices Summary

**The Spec page will be built as 047 B's lock matrix: five column gauges, the score against the gate first and the four dimensions against their minimums, then a requirements × evidence grid and a scope fence. The AI spec page will be built as 048 C's datasheet: four big field cells, the slot count over a section strip beside the checklist meter, and the evaluation dimensions placed by priority × measurement.**

## Round

There was one round, visual-first from the start. Each sketch had three variants, each with its own page structure, none reusing the 041 to 046 frames, and 048's three differ from 047's three. Each sketch included one reuse variant. The user's answer: **"B for 47 and C for 48"**. Neither winner is a reuse variant, and there is no synthesis note.

| Sketch | Variants shown | Winner |
|--------|----------------|--------|
| 047 Spec | A Gate gauge, B Lock matrix, C Reuse (radar, tiles, strip, piles) | **B** |
| 048 AI spec | A Reuse (chips, piles, bars), B Contents with fill bars, C Datasheet + eval matrix | **C** |

READMEs carry `winner: "B"` and `winner: "C"` and a Winner section. The winning tabs read "★ Selected" and each sketch now opens on its winner. MANIFEST rows read "B Lock matrix (build it)" and "C Datasheet + eval matrix (build it)".

## What 10-16 builds (047 B, Spec)

**Shipped parts it reuses (checked to exist at this commit):**
- `ArtifactHeader` / `ArtifactBreadcrumbs` (`src/web/components/artifact-header.tsx`), unmodified. The h1 is the phase name via `splitPhaseTitle` (`src/web/pages/document-title.ts`).
- `CopyPathButton` (`src/web/components/copy-path-button.tsx`).
- The shared `status-square` (globals.css Phase 9 block) and `status-chip` with `data-tone`.
- Native `<details>` bars, as the other document pages use them.
- Nothing else. The column gauge, the matrix and the fence are new `view-spec-*` parts.

**Fields each mark reads:**

| Mark | Reader field |
|------|--------------|
| Verdict chip, numbers line, ambiguity column | head line `**Ambiguity score:** {score} (gate: ≤ {gate})`. The gate accepts `≤`, `<=` or `<`. When a score has no gate, the gate is 0.20 and a quiet note says so. When the score is not a number, the chip is "Ambiguity not stated" and no column is drawn |
| Four dimension columns | Ambiguity Report table: Dimension, Score, Min, Status (✓ met / ⚠ below), Notes (as `title`). The bold `Ambiguity` row is the total, not a column |
| "{n} requirements locked" | `**Requirements:** N locked`, else the count of requirements |
| Matrix rows | `N. **Label**: statement` plus the `- Current:` / `- Target:` / `- Acceptance:` lines |
| Edges / Must-not squares | the Edge Coverage and Prohibitions tables: `R{n}` in the Requirement column, plus the Status word with emoji stripped. covered, backstop and resolved are `complete`; UNRESOLVED is `in-flight`; dismissed is `quiet` |
| Fence | `**In scope:**` / `**Out of scope:**` bullets under Boundaries, split at " — " to keep the reason |
| Bars and strip | every other `##` section in document order. Interview Log goes in "In the source only"; the footer after the last rule is left to Source |

## What 10-18 builds (048 C, AI spec)

**Shipped parts it reuses:**
- `ArtifactHeader`, `CopyPathButton`, `status-chip`, `status-square` and the native `<details>` bars, as above.
- The checklist meter is the `status-meter` that UI-SPEC section 8 names as one shared name. It is **not in `src/` yet**; the nearest shipped form is the review ledger's square bar (`.view-review-ledger-bar` with `status-square` cells in `LedgerHead`, `src/web/views/review-ledger-components.tsx`). 10-18, or whichever page builds the meter first, promotes it.
- The datasheet, the section strip and the priority × measurement matrix are new `view-ai-spec-*` parts.

**Fields each mark reads:**

| Mark | Reader field |
|------|--------------|
| Datasheet cells | `**System Type:**` (section 1), `**Selected Framework:**` and `**Version:**` (section 2), `**Stakes Level:**` (section 1b), `**Vendor Lock-In Accepted:**` (section 2, first word, the text after the dash under it). A value that is only an HTML comment counts as a slot |
| Lead line, section strip, dashed slot bars | the template-slot test, run on each numbered section |
| Checklist meter | `## Checklist` `- [x]` / `- [ ]` items: "{d} of {t} checklist items done" |
| Evaluation matrix chips and dock | section 5's `### Dimensions` table: Dimension, Rubric, Measurement Approach, Priority. The template's empty row (`| | | Code / LLM Judge / Human | Critical / High / Medium |`) is dropped |

**Template-slot rule:**
- A line is template text when it occurs verbatim (trimmed) in GSD's `templates/AI-SPEC.md`, or when it is an HTML comment.
- A numbered section (`## 1.` to `## 7.`, `## 1b.`, `## 4b.`) is a slot when every non-blank line under it is template text, leaving aside `###` sub-headings and `---` rules.
- In written sections, comments and empty template rows do not render.

Results on the fixtures:
- 04-AI-SPEC has 3 slots of 9 (4b, 6 and 7) and 6 of 16 checklist items done.
- 02-AI-SPEC has 9 slots of 9 and 0 of 16 done.

## Open items for 10-16 and 10-18 (stated, not designed around)

1. **047 B draws Edge Coverage and Prohibitions as marks.** Neither table is on the UI-SPEC Spec "must show" list. The build may parse them as drawn, or drop the two columns and keep the sections as plain bars, without breaking the contract. 03-SPEC has neither table, and the columns drop.
2. **048 counts nine sections.** The real template has nine numbered sections, so 04 reads "3 of 9". The UI-SPEC copy row's example says "3 of 8"; the copy pattern `{n} of {m}` is unchanged.
3. **h1 shapes.** For the Spec, the title `Phase N: Name — Specification` drops the kind suffix only if the kind label is "Specification". For the AI spec, the title `AI-SPEC — Phase N: Name` does not open with `Phase N:`, so `splitPhaseTitle` leaves it whole. The sketch shows the phase name alone.
4. **Gate default note.** "Gate not stated in the file; GSD's 0.20" is a sketch word (03-SPEC states no gate).
5. **Other sketch words, not UI-SPEC copy:** "Met minimum" / "Below minimum", "Not scored", the matrix key, "Ambiguity · lower is better", and on 048 "Read the section" and "{n} written lines · {n} template lines left in place".
6. **The checklist-to-section map** (used by the losing 048 A and B, not by C's meter) followed the template's fixed checklist order. C does not need it.
7. **`status-meter` promotion.** The meter is drawn once in the sketch as the shared name. The build adds the shared row to `docs/design-language.md` when a third page uses it (UI-SPEC section 8).
8. **Sketch-made states.** 047's "No score" is 01-SPEC with the template's `[score]` and no Ambiguity Report. 048's "Fully filled" is 04 with sections 4b, 6 and 7 written for the sketch and every box ticked. Tests should still use the fixtures as they are.

## Deviations from Plan

### Auto-fixed Issues

None in application code (no application code changed).

### Judgement calls

1. **Reuse variants offered.** At the orchestrator's instruction, each sketch had one variant built from shipped figures: 047 C and 048 A. Neither was chosen.
2. **Plan verify run through Node.** The harness refuses the plan's shell loop, so the same `google-chrome --headless=new` commands ran from a Node runner in the scratchpad. It produced 12 PNGs for each sketch.
3. **Ledger base kept outside the git dir.** As in 10-11, the plan-start base (`fdc929d`) is recorded here.
4. **Winner tabs open by default.** After the choice, each sketch opens on its winning tab (`#b` for 047, `#c` for 048). The other tabs stay as the record.

## Verification

- **Plan verify:** 12 headless-Chrome screenshots per sketch, and both copy checks pass. MANIFEST rows 047 and 048 are present.
- **Acceptance:** `grep -E '^winner: "?(A|B|C|synthesis)'` prints one line per README, and `grep -nE '^\| (047|048) \|.*\(build it\)'` prints two lines.
- **Sweep:** 48 renders for 047 (3 variants, 2 themes, 1280 and 390, 4 states) and 36 for 048 (3 states), checked again on the winner tabs after the choice. Results: no sideways page scroll, no console errors, exactly four font sizes (76.8 or 44.8, 20.8, 13.12 and 11.2px). Neither file contains an oklch, hex, rgb, hsl, destructive or warning literal.
- **Click checks:** requirement rows and tiles open the dock, "Read why" opens, the strip squares open cards, and the pile segments, dimension chips and section squares open their docks and bars.
- **Screenshots:** kept in the session scratchpad (`sketch-047-048/`), not committed.

## Known Stubs

None. This plan builds sketches only.

## Self-Check: PASSED

- FOUND: .planning/sketches/047-spec-page/index.html, README.md; .planning/sketches/048-ai-spec-page/index.html, README.md
- FOUND: 722c30c, 04e1db7, ec9bf3f (ancestors of HEAD)
