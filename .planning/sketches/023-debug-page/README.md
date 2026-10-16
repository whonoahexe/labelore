---
sketch: 023
name: debug-page
question: "How should a DEBUG session page lead with what matters for its status — where it stands while open, what to check while awaiting, the root cause and fix once resolved — and keep the trail of evidence and ruled-out ideas readable?"
winner: "A"
tags: [documents, per-type-views, debug, investigation, evidence, layout]
---

# Sketch 023: DEBUG page

## Design Question
How does a debug session page lead with what matters for its status, and show the investigation
(evidence, ruled-out ideas, root cause) as something you can follow instead of a raw log?

## How to View
open .planning/sketches/023-debug-page/index.html (`?v=a|b|c&doc=lb|dd|sa|rs|sr|syn&theme=light`)

## Intake (user's answer)
**Lead with what matters for the status.**
- **Open sessions:** where it stands, meaning the current hypothesis and the next action.
- **Resolved sessions:** the root cause and the fix.
- **Either way:** the investigation trail sits underneath.

## Data
`gen-data.mjs` reads five real sessions and one synthetic session:
- **lb:** labelore `loading-state-regression`. Resolved, with three root causes behind an AND-gate,
  a reasoning checkpoint, and a Postmortem section.
- **dd:** deid `mr-series-selection-picks-dwi`. Awaiting a human check, with pre-gathered evidence
  and Constraints.
- **sa:** sideby `sfu-no-audio`. Diagnosed only (root cause found, not fixed). Small.
- **rs:** resoundant `heartbeat-stops-after-net-drop`. Resolved, with 24 evidence entries and
  extra sections (Context, Follow-up hook points, Field diagnostics).
- **sr:** sideby `sfu-reconnect-presence`. Resolved over several rounds, with ten extra round
  sections.
- **syn:** synthetic `search-index-goes-stale`. Still investigating; no real file is in an open
  state.

The sections are written in a loose YAML style (`key: value` blocks, bold-key bullets,
`- timestamp:` lists, a fenced yaml reasoning checkpoint), so they're read line by line.
- **Evidence tags:** each entry is tagged from its wording: Confirms, Rules out, Fix or Finding.
- **Rounds:** later evidence sections ("Round 2 Evidence", "Pre-gathered evidence") are kept as
  separate groups.

## The status-adaptive lead (shared by all variants)
- **Open** (gathering, investigating, fixing, verifying): "Where it stands" shows the current
  hypothesis, then *Testing it by* | *What the result means*, then a Next action call-out.
- **Awaiting human verify:** "Fixed, waiting on your check" shows *What you need to check*, then
  the root cause, the fix applied and the files changed.
- **Diagnosed:** "Root cause found · not fixed yet" shows the root cause and the fix direction.
- **Resolved:** "Root causes · N" shows the root cause, the fix, how it was verified (nested
  verification maps become a definition list) and the files changed.
- **Long blocks** fold behind "Read all".

## Variants
- **A: Case file.** The status, the trigger as a big quote ("What was reported") and facts sit
  beside the lead. Then:
  - **Expected vs actual:** side by side, with the other symptom fields as rows underneath.
  - **Suspects board:** three columns, Confirmed (or Leading) | Ruled out (struck through, with
    what disproved each) | Also considered. The suspects come from the eliminated list, the
    reasoning checkpoint's candidate causes, and the root cause.
  - **Evidence log:** cards in three parts (checked, found, → implication), with filters for
    Confirms, Rules out, Fix and Finding.
- **B: Lab timeline.** A session strip (status, how long it took, evidence, ruled out, root
  causes), then the lead and the symptoms. "How it unfolded" is a vertical timeline:
  - It starts at Reported, then lists the evidence by day, with ruled-out ideas dropped in after
    their day.
  - It ends at a "resolved" node or a "now" node carrying the next action.
  - "Key moments only" hides plain findings. Clicking an entry shows what was found.
- **C: Funnel.** A narrowing funnel as the centrepiece: Reported → Symptoms → Evidence →
  Explanations considered → Ruled out → Root cause (or Testing now).
  - **Beside the funnel:** a plain sentence ("Narrowed 12 pieces of evidence to 3 root causes,
    then fixed them.") and the next action.
  - **Picking a band** opens that stage in a panel below. The final band (the lead) is open by
    default.

## Winner
**A: Case file**, refined in rounds 2–4:
- **Compact lead:**
  - Each root cause is one line with its label (ENVIRONMENT / CODE / PRIMARY…). Numbered markers
    must run 1, 2, 3, so a "(1)" quoted later in a sentence is not counted as a new cause.
  - The fix is cut to its first sentence and at most 3 lines.
  - Verification becomes chips: ✓ pass, ✗ fail, ○ not settled.
  - Files changed become clean chips.
  - One link opens the whole resolution in a modal.
- **"More ↗" on anything cut short:** it opens that item's full text in a modal. On a shortened
  cause or fix it always shows; on a CSS-clamped line it shows only when the clamp actually cuts.
- **Evidence filters:** in the order Confirms · Rules out · Fix · Finding · All. Confirms is the
  default, or All when nothing confirms.

## What to Look For
- **sr and rs (long, several rounds):** does the trail stay followable?
- **dd (awaiting) and syn (investigating):** is "what do I do next" the first thing you see?
- **sa (diagnosed, small):** does a short session still feel complete?
