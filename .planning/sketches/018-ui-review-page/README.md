---
sketch: 018
name: ui-review-page
question: "How should a UI-REVIEW page make reviewing easy — the score, the fixes to make, where points were lost, the passing evidence out of the way, and how and when it was audited — and in what order?"
winner: "B"
tags: [documents, per-type-views, ui-review, audit, layout]
---

# Sketch 018: UI-REVIEW page

## Design Question
A UI-REVIEW.md is a retroactive 6-pillar audit (the `gsd-ui-auditor` template). It has optional
frontmatter (status, score, reviewed, baseline, needs_human_review), header facts (Audited ·
Baseline · Screenshots · Interaction captures, sometimes "Prior reviews superseded"), a Pillar
Scores table (score /4 + key finding) and an Overall /24, Top 3 Priority Fixes (issue — user impact
— fix), Detailed Findings per pillar (bold sub-groups of ✅ / ⚠️ / ❌ or trailing ✓ / ✗ lines,
closed by a Score Justification / Assessment / Issue Finding line), and back matter (Registry
Safety, Technical Verification, Files Audited, Summary, Supersession and Correction notes).

Most of the body is passing evidence. What the reader needs is: **did it pass, what should I fix,
where were points lost, and can I trust how it was audited?** So every variant puts the score and
fixes first, shows issues before passes, folds the passes, and moves the method and history to the
back but keeps them one click away.

## How to View
http://cinedise:4174/018-ui-review-page/

Toolbar **Doc**:
- **synthetic (17/24):** a hand-written review (`synthetic-UI-REVIEW.md`) with two 2/4 pillars, ❌ items, 3 fixes, partial screenshots and 1 superseded review. Every real doc scores 22 or 24.
- **labelore 05 (22/24):** fixes written as User impact / Fix, a code block in the evidence, and Registry Safety.
- **sp 03 (22/24, corrected):** no frontmatter, a code-only audit, "No third fix", and a Correction note.
- **labelore 03 (24/24):** no fixes section, 2 superseded reviews, and Technical Verification.
- **labelore 04 (24/24):** "no fixes" written in italics, plus a superseded list in the header.

## Shared across variants
- **Tones:** pillar 4/4 → complete, 3/4 → in-flight, 2/4 or less → missing. A ✓ item → complete glyph, ⚠ → in-flight, ✗ → missing, unmarked evidence → quiet. No other hues.
- **Method chips:** status, screenshots (seen in a browser / partly / "code only · not seen in a browser"), "Against <baseline>", "Needs a human look", "Supersedes N reviews". A code-only audit is a reason to distrust the visual pillars, so it sits up front.
- **Fixes are linked to their pillar**, via the pillar's own "See Priority Fix N" or the fix title.
- **File refs** (`file.tsx:88`) become copy chips.
- **Files audited** is shown as a tree grouped by directory.
- The page has copy-path and View/Source controls, plus the "In the source only" strip.

## Variants
- **A: Fix queue.** A title row with a big score and a one-line verdict. A **score ribbon** shows 24 squares in 6 groups (lost points dashed), and each group jumps to its pillar. Then the **fix queue** as tickets (pillar chip · What's wrong · Why it matters · Do this · file chips · Evidence ↓ · "Mark handled", which is tab-local and never written back). Then **Where the points went**: only pillars below 4/4, worst first, with their ✗/⚠ items and their passes folded. The 4/4 pillars are "held up" chips that open their evidence. A **tray** of tabs at the end holds How it was audited (with a score history), Summary, Files audited and any extra sections.
- **B: Scorecard.** The hero is a **hexagon radar** of the 6 pillars (score polygon, toned vertex squares, the total in the middle, and fix numbers under each label), beside a big verdict sentence, fix pins, method chips and a score-across-reviews bar chart. Below it is a **pillar tab bar** and an **inspector**. The inspector opens on the worst pillar, ← → steps through pillars, and it shows Found (issue cards plus that pillar's fix cards) beside Held up (the passing evidence, grouped). Clicking a fix pin opens its pillar and highlights the fix. Back matter is folded.
- **C: Worst first.** The header is a **review-history timeline**: superseded reviews are struck-through nodes with their reason, ending in this review. Below it, **pillar bands** run worst first. Each band has a big score with vertical pips, the key finding, the issues, and that pillar's **fixes inline** (Fix N · Why · Do · Where). A count column shows failed / flagged / held / fixes. An **Issues only / Everything** switch shrinks the 4/4 bands to one line. The page ends with How this was audited, the auditor's summary and the files tree.

## What to Look For
- Which reads fastest as "what do I do now": tickets (A), pins plus the inspector (B), or fixes inside their pillar (C)?
- Is the hexagon worth its space, or is the 24-square ribbon (A) or score-and-pips (C) enough?
- On the 24/24 docs (labelore 03 / 04), does each variant stay calm and short?
- Is "code only · not seen in a browser" prominent enough to make you check the visuals yourself?

## Winner
**B: Scorecard, hexagon + pillar inspector** ("B is awesome"). Build it:
- **Header:** eyebrow "UI Review · Phase N", the title from the slug, and a facts line (Audited · Phase · Fixes). Copy-path and View/Source sit on the right.
- **Hero (two columns; stacks below ~860px):**
  - **Hexagon radar:** 6 axes with 4 rings and the score polygon in `--primary` (tint fill). Vertex squares are toned per pillar (4 → complete, 3 → in-flight, ≤2 → missing). The total sits in the middle ("17 / of 24"). Each label shows the short name, the score and "fix N" in in-flight, and clicking a label selects that pillar.
  - **Side:** the verdict sentence ("N points lost, in X and Y." + "N fixes asked for." / "Full marks. Nothing to fix."), then the fix pins (number + title; a click opens the pillar and highlights the fix), the method chips (status · seen in a browser / partly / code only · against <baseline> · needs a human look · supersedes N), and a score-across-reviews bar chart when there is history.
- **Pillar tab bar:** the 6 pillars, each with name + 4 score squares. It opens on the worst pillar (lowest score, then first), and ← → steps through pillars.
- **Inspector:** "Pillar N of 6", the name and score, the key finding, the verdict line, then two columns:
  - **Found:** ✗/⚠ items as cards with a left bar in missing / in-flight, followed by this pillar's fix cards (Fix N · title · Why · Do · file chips). When nothing was found it says "Nothing found — every check held."
  - **Held up:** the ✓ and unmarked evidence, grouped under the doc's bold sub-headings.
- **Back matter:** folded details (Files audited as a directory tree, Summary incl. Correction note, Registry Safety, Technical Verification, Supersession), then the "In the source only" strip.
- Tones as above, and no other hues. Fix "No third fix" entries are dropped. Fixes link to pillars through the pillar's "See Priority Fix N", falling back to the fix title.
- A and C stay in the sketch as explored alternatives and are not built.
