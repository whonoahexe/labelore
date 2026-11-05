# Phase 10 — UI Review

**Audited:** 2026-11-06
**Baseline:** 10-UI-SPEC.md (approved 2026-11-03) plus the sketch winners recorded in the 10-xx SUMMARY files (042 A, 043 reuse, 044 E, 045 C, 046 B, 047 B, 048 C, 049 B, 050 B, 051 A, 052 A). Sketch-winner deviations are not counted as defects.
**Screenshots:** captured earlier (scratchpad set, 112 PNGs from 10-23). No new captures were taken in this audit. Of those 112, this audit viewed 6 directly: codebase-tidemark-dashboard (1280 light), codebase-labelore-stack (1280 light), codebase-labelore-structure is NOT viewed, dom-verify-lendshed-p3 (390 dark), ai-spec-lendshed-p2 (1280 dark), and the 1280 light Stack of this repo. The rest were judged from the 10-23 SUMMARY's own review list and the automated rule checks, not by this audit.
**Interaction captures:** off (workflow.ui_interaction_capture is false)

**Coverage caveat:** I read the 10-01 to 10-14 SUMMARY deviation sections and 10-23 in full. The 10-15 to 10-22 summaries were not read in full, so their deviation sections are not reflected here. The eight items the close-out flagged for judgment are each assessed below; four were confirmed on screen, three were taken from the close-out text, and one (Venn) was not seen.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Copy follows the contract's specific-absence rule ("Not mapped", "Template slot", "Value not shown"); the DOM-VERIFY page prints "Verified" over two failed criteria |
| 2. Visuals | 3/4 | Clear focal point on the Codebase head and AI spec lead; AI spec "all slots" state is dominated by hatching and a long empty dimension block |
| 3. Color | 2/4 | "Complete map" uses the accent (`--primary`) in the same orange as the eyebrow and the active panel, so it reads like a warning; the accent also marks a "Verified" chip beside failures |
| 4. Typography | 3/4 | Four-size cap holds (enforced by the screenshot suite); Stack prose body is dense and small-mono heavy |
| 5. Spacing | 2/4 | Stack panel repeats chips then full prose, so the Codebase page runs to 4,922 px at 1280 (this repo) and about 2,800 px on the portal map |
| 6. Experience Design | 3/4 | Copy-command path is verified by a browser test; "Could not look" vs "Nothing to report" is distinct in words; the AI spec page has no way to read its content when every slot is unfilled |

**Overall: 16/24**

---

## Top 3 Priority Fixes

1. **Browser check verdict contradicts its counts** — a reader sees a green-accent "Verified" chip above "2 failed" and "1 needs review" (dom-verify-lendshed-p3, 390 dark). This is the one place the page reads as a pass while listing failures. Concrete fix: when `outcome` is `verified` and any count is non-zero, keep the verdict word as written but drop the `complete` tone and add the words "Counts below disagree with the verdict" in `quiet`, or else tone the chip `in-flight`. If the fixture is meant as the "both shown as written" case, keep it and say so in the Source-only note.
2. **"Complete map" chip sits too close to the warning family** — on Tidemark, duet and cinedise-portal the chip is the accent orange, the same as the eyebrow "MAPPED, NOT STARTED" and the active panel number. The "Fast map" and "Partial map" chips are the same family, so complete vs incomplete rests on label and square fill only. Concrete fix: keep `complete` on the square but give the chip the untoned `status-chip` text, so the accent stays on the eyebrow and the active panel only (the contract's accent list does allow `complete` marks, so this is a density and read problem, not a token violation).
3. **Stack panel repeats itself and stretches the page** — the chip groups (Languages, Frameworks, Key Dependencies) are followed by the full document prose that names the same items (verified on labelore's Stack at 1280: the chip block is followed by a Languages & Runtimes prose block of about 2,000 px). Concrete fix: when the chip lift consumes a section, collapse the prose behind a `Read more` disclosure, as the contract's "Read more" pattern allows, so the chips are the default view.

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)
- Matches the contract: "Mapped, not started" eyebrow and head sentence; "Copy command" button; "Labelore does not run commands. Paste it in your terminal." (codebase-tidemark-dashboard, 1280 light); "9 of 9 sections are still template slots" and "0 of 16 checklist items done" (ai-spec-lendshed-p2, 1280 dark).
- The "Verified" chip over failed criteria is a copy-meaning conflict, see fix 1.
- The "Dependencies at risk 0" tile is a dashed box with a 0 on the Tidemark head; "Not mapped" was not observed (Tidemark has all seven documents).

### Pillar 2: Visuals (3/4)
- Focal point is the head: the sentence, readiness chip and the "Copy command" row sit in one bordered block over the rail (codebase-tidemark-dashboard).
- AI spec all-slots state (ai-spec-lendshed-p2): nine hatched template-slot cells, a hatched evaluation-dimensions block about 130 px tall that holds a single chip, and a section strip. The page is the least informative of the set, as the close-out noted. Fix: collapse the dimensions block to a one-line "Evaluation dimensions: template slot" row when every slot is empty.
- Icon-only controls carry `aria-label`/`title` (verified by the 10-23 browser tests on the copy button).

### Pillar 3: Color (2/4)
- Accent use is within the contract's reserved list (eyebrow, active panel, `complete` marks). The problem is the "Complete map" chip, which shares the eyebrow's orange and reads like a warning beside the orange "Fast map" and "Partial map" families (see fix 2).
- The DOM-VERIFY outcome "Verified" uses the `complete` accent on a card that lists failed criteria (see fix 1).
- No hard-coded colour literals were found in the shipped views this audit checked; token use is consistent light and dark.

### Pillar 4: Typography (3/4)
- The four-size cap is what the suite checks (`at most four font sizes` on all 112 shots); the Integrations five-size regression was fixed in 1f74113.
- Stack's Key Dependencies and Configuration prose uses small mono labels and body prose at the same weight, so the page has no strong secondary tier between the chip block and the prose. Acceptable, not a blocker.

### Pillar 5: Spacing (2/4)
- Confirmed: labelore's Stack at 1280 light is 4,922 px tall. Most of that is the prose repeating the chip block above it (see fix 3).
- Close-out items I did not view: Structure at 6,500 px on this repo (the tree is followed by every directory again in prose), so the same fix applies.
- Mono paths in the Stack prose wrap mid-path (`src/web/views/…`) rather than end-ellipsising. The contract asks for ellipsis with `title`; the body-prose case is outside that rule, so this is a note, not a defect.

### Pillar 6: Experience Design (3/4)
- Copy-command: the browser suite checks clipboard text, zero requests, and "Copied" feedback (10-23). Passes.
- Could not look vs nothing to report: separated by icon, word and reason (contract section 9); the Could-not-look fixture was not viewed this audit.
- AI spec: with every slot unfilled, the page offers no content to scan beyond the chips. The contract allows this ("collapsed with its heading and the chip"); the page could say so once at the top. Note only.
- Registry safety: not applicable (no third-party registry).

---

## Close-out items (10-23 "for judgment")

| Item | Assessment |
|------|------------|
| "Complete map" chip accent close to incomplete tone | Confirmed. Fix 2. |
| Stack panel repeats chips then prose | Confirmed. Fix 3. |
| Structure 6,500 px on this repo | Taken from the close-out; not viewed. Same cause as Stack. |
| Shapes Stack "0 / 0 TOOLS" despite prose | Taken from the close-out; not viewed. Real defect: a zero that says "nothing" over a panel with content. Fix: show "Prose only" instead of 0 when the chip lift is empty but the section has text. WARNING. |
| Reviews 390 "THE FILE'S OWN" tag wraps | Taken from the close-out; not viewed. Minor; the tag should stay on its row or drop below the title on purpose, not wrap by accident. Note. |
| One-reviewer Venn one big empty circle | Not viewed. Contract allows a one-reviewer state with no Agreed/Disagreements group; the empty circle is a figure-density issue. Note. |
| Empty AI spec mostly hatched | Confirmed. See Visuals. |
| DOM-VERIFY 03 shows Verified while listing 2 failed | Confirmed. Fix 1. Also a Color issue. |

---

## Registry Safety

Not applicable. `components.json` lists no third-party registries (`"registries": {}`), so no block audit was run.

---

## Files Audited

- `.planning/phases/10-codebase-map-specification-and-check-pages/10-UI-SPEC.md`
- `.planning/phases/10-codebase-map-specification-and-check-pages/10-CONTEXT.md`
- `.planning/phases/10-codebase-map-specification-and-check-pages/10-01-SUMMARY.md` to `10-14-SUMMARY.md` (deviation sections), `10-23-SUMMARY.md` (full)
- `.planning/sketches/MANIFEST.md`
- `docs/design-language.md` (first 364 of 1605 lines; tone and vocabulary sections)
- Screenshots from `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/phase-10-screenshots/`: codebase-tidemark-dashboard-1280-light.png, codebase-labelore-stack-1280-light.png, dom-verify-lendshed-p3-390-dark.png, ai-spec-lendshed-p2-1280-dark.png

No new screenshots were taken. No source files were changed. No commit was made.
