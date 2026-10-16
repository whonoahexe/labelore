---
sketch: 021
name: verification-page
question: "How should a VERIFICATION page show phase, date, title, goal and status badges up top, human checks as the priority, score and truths and requirements coverage interactively (not as tables), anti-patterns, and gaps split critical / non-critical with each gap mapped to its fix-plan task and scope?"
winner: "E"
tags: [documents, per-type-views, verification, truths, requirements, gaps, fix-plans, layout]
---

# Sketch 021: VERIFICATION page

## Design Question
What should a VERIFICATION page show, and how, so that the verdict and what needs a person come
first, the truths and requirements read at a glance without a table, and every gap leads straight
to the fix-plan task that closes it?

## How to View
open .planning/sketches/021-verification-page/index.html (`?v=a|b|c&doc=syn|sp04|sb04|dd01|lb05&theme=light`)

`gen-data.mjs` builds `data.js` from four real reports plus one synthetic one:
- **syn:** synthetic, written to the verifier template exactly, with Critical and Non-critical gaps,
  Recommended Fix Plans, Verification Metadata, and an override, a holds-incidentally truth and a
  could-not-check truth. No real report has the template's fix-plan or metadata sections, so this
  is the only one that shows them.
- **sp04:** studio-portal phase 4, gaps found, 19/39, with 39 truths across a roadmap table and 7
  plan tables, 7 gaps in the frontmatter `gaps:` list, and a prose "Recommended Gap-Closure Shape".
- **sb04:** sideby phase 4, human needed, with 5 human checks, 15 requirements and partly verified
  truths.
- **dd01:** deid phase 1, a re-verification at 14/14 with gaps closed since the last run and
  data-blocked items.
- **lb05:** labelore phase 5, passed, with 2 behavior-unverified truths and 4 human checks.

## Mapping calls (made before building)
- **Header:** the eyebrow reads `Verification · Phase NN · Name` and is followed by the verified
  date and time. The title is the H1 with "Phase N:" removed, and the lead is the phase goal.
  Badges: the status (Passed, Gaps found or Human needed), Approach, Automated (N passed, M failed),
  Human checks (only when there are any) and Took (only when the duration is recorded).
- **Fallbacks for real reports:** Approach comes from `**Re-verification:**` (Initial or Re-).
  Automated falls back to counting the Behavioral Spot-Checks rows, labelled "Spot-checks", and
  clicking it opens the list. Took is hidden when no duration is recorded.
- **Human checks:** taken from the body's `### N. Name` blocks (Test, Expected, Why human), else
  from frontmatter `human_verification` with titles from the body's bold list. Each shows What to
  do, What should happen and Why a human. With gaps found, a note says the gaps come first.
- **Gaps:** a template report uses its Critical and Non-Critical blocks (Missing or Issue, Impact,
  Fix or Recommendation). A real report like sp04 uses its frontmatter `gaps:` list instead:
  - **What's missing:** the gap's `reason`.
  - **Why it blocks:** the truth that doesn't hold, plus where (`artifacts[].issue`).
  - **Fix:** the `missing[]` items.
- **Fix-plan mapping:** each fix task belongs to the one gap whose words it matches best.
  - A plan's "Verify" task comes along with the gaps it mentions.
  - Opening a gap shows its plan: the file name, the plan name, `Estimated scope`, and every task.
    The tasks that close this gap are marked "Fixes this" and the rest are dimmed.
  - Tasks that close no listed gap (anti-pattern or human-check work) are listed on their own.
  - sp04's prose shape gives no scope, so it shows "Scope not stated".
- **Truth ↔ gap:** a failed truth's inspector links to its gap. Behavior-unverified and
  holds-incidentally truths show their frontmatter test/expected or their harden note.
- **Also in this report:**
  - Required Artifacts, Key Links, Data-Flow, Spot-Checks, Probe, Prohibitions, Test Quality,
    Decision Coverage and Next Action
  - the gaps closed since the last verification and the data-blocked items (dd01)
  - the verifier's prose gap summary when the gaps came from the frontmatter

## Variants
- **A: Verdict sheet.** One reading column, in the order you asked for.
  - **Needs a person first:** human-check cards with three columns: do, should happen, why.
  - **Observable truths:** a big score, one coloured cell per truth, status filters, and a tile
    wall grouped by source (Roadmap, Plan 04-01, …). Clicking a cell or tile opens an inspector
    in place.
  - **Requirements:** tiles with a status band, sorted with blocked first, showing source-plan
    chips and the blocking note.
  - **Anti-patterns:** grouped by file, with blockers marked.
  - **Gaps:** two columns, Critical and Non-critical. Each gap opens to Missing, Why it blocks, Fix
    and its fix plan.
- **B: Console.** A sticky left rail and a main column.
  - **Rail:** a score ring segmented by status, a status legend that filters, and a section list
    with counts.
  - **Human checks:** a stepper with ← and → between checks.
  - **Truths:** three lanes (Failed, Not proven, Verified). A card opens a side drawer.
  - **Requirements:** a coverage grid of requirement × plan. Click a row for its note.
  - **Anti-patterns:** severity lanes.
  - **Gaps → fixes:** a board with gap cards on the left and fix plans on the right, joined by lines
    to the exact tasks. Opening a gap lights its lines and tasks.
- **C: Goal trace.** The title and goal sit beside a verdict panel: a plain sentence such as "Not
  achieved yet. 2 gaps block the goal, 2 can wait", with the facts listed under it.
  - **Do these first:** human checks as a row of cards you scroll sideways.
  - **Truths:** a status bar, then a trace from the goal down to each truth. Problem truths come
    first and the verified ones fold away, per group.
  - **Requirements:** a stacked coverage bar and ID chips that open a preview.
  - **Anti-patterns:** one row per file with severity pips.
  - **Gaps:** tabs for Critical and Non-critical. Each gap opens to a flow (what's missing → why
    it blocks → fix) with its fix plan under it.

## Round 2 (A–C were "lifeless")
A–C put a small title over a row of badges and then stacked boxes that all looked alike.
Round 2 does what the picked 017 and 018 sketches do:
- an app header and a display-size title
- one signature graphic in the first screen
- the verdict said as a large plain sentence
- staggered motion on load
- sections that are visibly unequal in weight

- **D: Target.** The truths are squares on a target around the goal:
  - **Rings:** the inner ring holds, the middle is not proven, and the outer ring failed. Sectors
    are plans.
  - **Beside it:** the verdict sentence ("Not done. 2 gaps block the goal, 2 can wait."), the gaps
    as pins you can click, the human checks as pins, and how it was checked. Picking a square
    swaps the side panel for that truth's evidence.
  - **Below:**
    - human checks as big numbered steps
    - critical gaps as large tinted panels: missing / why it blocks / fix, plus a "Fixed by"
      ticket with a scope meter and only the tasks that close this gap
    - non-critical gaps as rows you can open
    - requirements as a coloured ribbon
    - anti-patterns with blockers as cards
- **E: Board + ledger.** The 017 console rail holds the title, status, a big number, stats
  (clicking one jumps to its section) and human-check slips.
  - **Main column:** a gap → fix ledger leads, one row per gap: the gap, then the plan tasks that
    close it, then a scope meter.
  - **Truth board:** status × plan, with numbered squares and an inspector.
  - **Requirement board:** requirement IDs grouped by status.
- **F: Road to done.** A route under the verdict: Today → each fix plan (wider for a bigger
  scope, with the gaps it closes as tokens) → Re-verify → human checks → Done.
  - **Human needed:** the route is the checks themselves.
  - **Passed:** every stop is filled.
  - **Clicking a stop** opens it: today's gaps and who closes each, a plan's tasks with the gap
    each one closes, or a human check.
  - **What holds:** a waffle of truths with a caption that changes as you hover.

## Winner
**E: Board + ledger**, which we'll keep iterating on. Round-3 changes:
- **Motion:** the round-2 motion is gone (pop, rise, sweep and draw). Only the page fade and the
  jump highlight that the earlier sketches already had are kept.
- **Opened gap:** what's missing, why it blocks and the fix sit in three spaced columns. The
  "where" notes sit under a hairline, and the "Fixed by" ticket has more padding. The row's
  one-line preview hides while the gap is open.
- **Also in this report:** one row, an "Also in this report" label followed by chips that each
  open their section in the source, like the "In the source only" strip on the other pages.

## What to Look For
- **sp04 (39 truths, 7 gaps):** does the truth view still scan, and does the gap-to-fix mapping
  read as correct?
- **syn:** in each variant, does opening a gap make it obvious which plan task fixes it and how big
  that plan is?
- **lb05 / dd01 (passed, or human needed with a full score):** does the page stay calm when nothing
  failed?
- **Human checks:** do they read as the priority without drowning a gaps-found verdict?
