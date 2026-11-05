---
phase: 10-codebase-map-specification-and-check-pages
plan: 17
subsystem: ui-sketches
tags: [sketch, dom-verify, browser-check, reviews, cross-ai, agreement, disagreement, outcome]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: 10-07 made-up Lendshed DOM-VERIFY and REVIEWS fixtures, 10-15 winners (frames not to reuse)
provides:
  - sketch 051 winner A (Browser window) for the Browser check page
  - sketch 052 winner A (Overlap) for the Cross-AI reviews page
  - the fields each winning mark reads, the outcome and reason tables, the agreement and disagreement rules
affects: [10-21 Browser check page build, 10-22 Cross-AI reviews page build]

tech-stack:
  added: []
  patterns: [visual-first document sketches, outcome shape differs by icon/border/word not colour, concerns placed in reviewer overlaps, figure geometry laid out at real width so labels keep page sizes]

key-files:
  created:
    - .planning/sketches/051-browser-check-page/index.html
    - .planning/sketches/051-browser-check-page/README.md
    - .planning/sketches/052-cross-ai-reviews-page/index.html
    - .planning/sketches/052-cross-ai-reviews-page/README.md
  modified:
    - .planning/sketches/MANIFEST.md

key-decisions:
  - "051 winner A, Browser window: the check drawn as the window it looked through; outcome chip and target address in the bar; criteria as tiles failed first with what was seen and the contract quote; Could not look a shut (hatched, eye-off, in-flight) view, Nothing to report a blank (dashed, minus, quiet) view, each with its reason; counts in the status bar; no synthesis"
  - "052 winner A, Overlap: one circle per reviewer, each concern a square in the region of the reviewers who raised it, agreed concerns large and numbered in the overlaps, a failed run an empty dashed circle; reviewer cards as the figure's key; Agreed beside; Disagreements side by side with 'Reviewers disagree'; no synthesis"
  - "052 A draws one to three substantive reviewers; with four or more, 10-22 shows the roster and Agreed list without the drawing and states the fallback layout itself"

requirements-completed: [VIEW-12]

estimate:
  tokens: 75000
  tasks: 3
actuals:
  tokens: 39000
  tasks: 3
  commits: 3
plan_head_before: 11d92fe645e39a2bbf25f3aad5aaff40b0a44e83
plan_head_after: 7c58ec0c2138c4809a8f113258b251e90f5dce75

duration: one round of sketching plus the checkpoint answer
completed: 2026-11-06
---

# Phase 10 Plan 17: Sketches 051 and 052 and the Browser check / Cross-AI reviews choices Summary

**The Browser check page will be built as 051 A: the check drawn as the browser window it looked through. The outcome chip and target sit in the bar, what was seen fills the window (failed first), a shut or blank window replaces it when there was nothing to see, and the counts sit in the status bar. The Cross-AI reviews page will be built as 052 A: one circle per reviewer, with each concern placed where the reviewers who raised it overlap. The Agreed list sits beside the circles and the disagreements come after, set side by side and never merged.**

## Round

There was one round, visual-first. Each sketch had three variants, each with its own page structure, and none reused the 016, 022 or 041 to 050 frames. 052's three also differ from 051's three. Each sketch included one reuse variant. The user's answer: **"A looks good for both"**. Neither winner is the reuse variant, and there is no synthesis note.

| Sketch | Variants shown | Winner |
|--------|----------------|--------|
| 051 Browser check | A Browser window, B Reuse (chip, meter, piles), C Route map | **A** |
| 052 Cross-AI reviews | A Overlap, B Where each stands (LOW/MEDIUM/HIGH board), C Reuse (050 B's wire ledger) | **A** |

Both READMEs carry `winner: "A"` and a Winner section with build notes. The winning tabs read "★ Selected" and each sketch opens on its winner. The MANIFEST rows read "A Browser window (build it)" and "A Overlap (build it)".

## What 10-21 builds (051 A, Browser check)

- **Header:** `ArtifactHeader` (`src/web/components/artifact-header.tsx`) with crumbs Lendshed / Phase N / Browser check, the eyebrow "Phase N · Browser check", the phase name as the `h1`, and "Wave {n}" as meta. No time is shown: the files state none, and a file date is never used.
- **The window:** a framed figure, using `FigureFrame` (`src/web/components/figure-frame.tsx`) if its chrome fits, else a view-local frame.
  - The bar holds the outcome chip at Heading size and an address field. The chip uses the shared `status-chip` with `data-tone`, an icon and a word. The address field shows the body's targets as mono paths that end-ellipsise, with the full value in `title`.
  - **Verified, or any file with criteria:** tiles grouped Failed, Needs review, then Passed. Each tile shows the backticked values it saw as boxed mono values and "Contract “…”" from the first double-quoted value; a tile opens a dock.
  - **Could not look:** the view is shut, with `--hatch`, an eye-off icon in `--in-flight-fill`, and a card holding the reason sentence and `reason: {raw}` in mono.
  - **Nothing to report:** the view is blank, with a dashed inner frame, a minus-circle icon and the same reason card.
  - **The status bar:** three counts, each a `status-square` (`data-tone`) beside a Heading numeral and its word, with a zero on a dashed square, plus "{n} checked". On the two non-pass outcomes it shows "No criteria were checked." instead.
  - **No outcome:** the quiet "Outcome not stated" chip, with the tiles and counts still shown.
- **Below:** "What the check wrote" as a closed bar.

**Outcome table (UI-SPEC, kept):**

| `outcome` | Tone | Icon | Chip shape | Word |
|---|---|---|---|---|
| `verified` | `complete` | check-circle | solid, tinted | Verified |
| `nothing_to_report` | `quiet` | minus-circle | dashed | Nothing to report |
| `could_not_look` | `in-flight` | eye-off | 2px solid | Could not look |
| absent | `quiet` | help-circle | dashed | Outcome not stated |
| other | `quiet` | help-circle | dashed | the raw value, mono |

Reasons:
- `target_unreachable` and `no_criteria` take the copy table's sentences.
- Any other reason (`profile_locked`, `no_browser_mcp`) shows only its raw value in mono.
- `ok` shows nothing.

The chip's accessible name carries the reason ("Outcome: Could not look: target unreachable"). Neither Could not look nor Nothing to report carries a `complete` tone or an accent mark.

**Fields each mark reads (DOM-VERIFY):**
- Outcome, reason and counts come from the frontmatter: `outcome`, `reason`, `passed`, `failed`, `needs_review`, `checked`, `wave`, as written and never recomputed.
- Criteria are the `- ` items that open with their result, written plain, bold or in backticks, followed by a colon.
- What was seen is the item's backticked values; the contract is the item's first double-quoted value.
- The target is any backticked value in the body's paragraphs that starts with `/` or `http`.

## What 10-22 builds (052 A, Cross-AI reviews)

- **The figure and the Agreed column** sit side by side (7fr / 5fr) and stack under 52rem.
  - **The drawing:** one circle per substantive reviewer. Circles are filled `--muted-foreground` at low opacity, so overlaps darken, with a `--foreground` stroke.
  - **Concern squares:** each sits in its reviewers' region. Agreed concerns are large and numbered A1, A2. Severity sets the mark: HIGH is an outline in `--missing-fill`, MEDIUM a fill in `--in-flight-fill`, LOW dashed in the muted foreground.
  - **A failed run** is an empty dashed circle off to the side.
  - **Layout:** the geometry is laid out at the figure's real width after layout, so labels stay at `--fs-2` / `--fs-4` at 390. This needs a small file-local SVG drawn after layout, the same way 050 B's wires are drawn.
  - **The key:** the reviewer roster, one untoned card per reviewer. Each card shows the name, the model verbatim in mono, an "Overall risk: {word}" chip, a dashed "Review failed" card for a failed run, and coverage with "{plan} not reviewed".
  - **The Agreed column:** "Agreed" with its count. Each row shows the number, the text, the highest-severity chip, the reviewers and the plan. A line under it counts the concerns raised by one reviewer.
  - **The dock:** a square or a row opens a dock that sets each reviewer's own words side by side and says how the match was made.
- **Disagreements:** a dashed `quiet` block per stance, with the `in-flight` "Reviewers disagree" chip. Stances sit side by side; a reviewer who did not state one gets a hatched cell ("Not reviewed", "Review failed").
- **Below:** each review as written (one bar per reviewer), unclaimed sections (Plan-Revision Conflicts), then "Consensus summary, as the file wrote it".
- **One reviewer:** one circle, "Concerns" in place of Agreed, and no Disagreements.

**Fields each mark reads (REVIEWS):**
- **Reviewers:** each `## {Name} Review` section. The plans under it are `## {NN-NN}` headings.
- **Models and coverage:** models from frontmatter `models.{key}`; coverage from `plans_reviewed`, the reviewer's plan sections and `plan_coverage.{key}.missing`.
- **Overall risk:** each plan's `### Risk Assessment` or `Risk:` first word. The card shows it when the plans agree, otherwise the highest.
- **Failed run:** a review section with no plan whose text says "failed or returned empty output".
- **Concerns:** Concerns list items that open with HIGH, MEDIUM or LOW, in any of the file's three forms: `**HIGH:**`, `HIGH:`, and `- MEDIUM:` under a plain "Concerns:" line.
- **Disagreements:** overall risks that differ across reviewers, and a plan's `### Verdict` words that differ.

**Agreement-matching rule (best-effort; the page never claims agreement it did not derive):**
1. **Same words:** two concerns from different reviewers on the same plan agree when their first clauses match after normalising (split at the first `,`, `;` or `:`). A2 (`MAX_EXPORT_LOANS`) matches this way.
2. **The file's own consensus:** an `### Agreed Concerns` line that names two or more reviewers in parentheses and a plan. Each named reviewer's concern on that plan that shares two or more key words with the line is joined to it. A1 (the deadline) matches this way, because the three reviewers word it differently.

The agreed severity is the highest among the matched concerns. Anything that cannot be matched stays under its reviewer, and a failed run is never counted.

**Shipped parts to reuse:**
- `status-square` with `data-tone` (globals.css, the Phase 9 block).
- `status-chip` with `data-tone`.
- `ArtifactHeader`, `CopyPathButton` (`components/copy-path-button.tsx`) and `DocumentViewToggle` (`components/document-view-toggle.tsx`) through the header.
- The `--hatch` and closed-bar patterns, as the 10-18 AI spec page's `view-ai-spec-bar` details do.

No lane-diagram, clean-tree or wire component applies. The overlap drawing is new and view-local.

## Verification

- **Plan checks:** both pass for each sketch: 12 headless-Chrome screenshots per sketch and the copy checks. Both were re-run after the winner edits, with "★ Selected" added to the checked strings.
- **Font sizes:** never more than four in any variant, state, theme or width. Some states use three: 051's "01 beside 02" has no `h1`, and 052 B and C at 01 have no group heading.
- **Layout and colour:** no sideways scroll at 390, and no colour literal, `destructive` or `warning` in either file.
- **Interaction:** a tile, segment, row, circle square, Agreed row and reviewer card each open their dock or their wires, with no page errors.
- **Criteria:** `winner: "A"` in both READMEs, and two MANIFEST rows with "(build it)".

## Deviations from Plan

**1. [Rule 3 - Blocking] Screenshot verify run from a Node runner.** The harness refuses inline shell loops. The plan's same command set (same flags, 12 PNGs, exit 0 only at 12) ran from `verify-shots.js` in the session scratchpad. The sketches are built by a scratchpad generator, which copies 050's shared CSS block verbatim and embeds the fixtures as JSON. As in 10-15, the generator is not committed. No repository files were affected.

**Total deviations:** 1 (process-level). **Impact:** none on the designs.

## Open items for 10-21 and 10-22

- **052 A with four or more substantive reviewers:** the drawing covers one to three circles only. With four or more, the build must not attempt a circle drawing. It shows the roster cards and the Agreed list, where each row names its reviewers, without the drawing, and says so in one quiet line. 10-22 states the exact fallback layout; this plan does not design it.
- **Dark theme, HIGH vs MEDIUM:** `--missing-fill` and `--in-flight-fill` sit close in hue in the dark theme. 052 keeps them apart by shape (an outline square versus a filled one) and always by the severity word. 10-22 should keep both, and a screenshot review in dark should confirm it.
- **Agreement matching:** the rule above is a heuristic.
  - A wrong or loose consensus line could join the wrong concern. The dock shows every reviewer's own words and how the match was made, so a reader can check.
  - A1 is a consensus-only match. Whether it should look different from a same-words match was raised as a question and not decided.
- **Overall risk:** risk is per plan in the file, and no fixture has a reviewer whose plans differ. The card's "highest" fallback is untested against real data.
- **`h1` titles:** both pages use the phase name from the roadmap, since the files' titles give only the phase number and wave. 10-21 and 10-22 confirm the title source.
- **051 target and "what was seen":** both are best-effort reads. A body naming its target in plain text shows no target, and a line with no backticks or quotes shows its first two lines.
- **051 per-wave files:** a DOM-VERIFY file covers one wave. Which file a Phase page links to is 10-21's call.
- **Sketch words, not UI-SPEC copy:**
  - 051: "{n} checked", "Criterion {n} of {t}", "Contract “…”", "What the check wrote", "No criteria in the file."
  - 052: "Review failed", "Not reviewed", "{plan} not reviewed", "Raised by one reviewer", "Each review as written", "Matched: …", "Verdict on {plan}", "one square per concern".
- **Sketch-made states:** No outcome and Other reason (051) have no fixture. If 10-21 tests them, it needs fixtures.

## Known Stubs

None. The sketches are throwaway HTML; no app code changed.

## Self-Check: PASSED

- FOUND: .planning/sketches/051-browser-check-page/index.html, README.md
- FOUND: .planning/sketches/052-cross-ai-reviews-page/index.html, README.md
- FOUND: commits 540db85, 5137ac7, 7c58ec0 on this branch
- PASS: `winner: "A"` in both READMEs; MANIFEST rows 051 and 052 with "(build it)"
