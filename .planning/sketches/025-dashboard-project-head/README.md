---
sketch: 025
name: dashboard-project-head
question: "How should the dashboard open on the project itself — name first, then what it is and its core value — clearly and without clutter?"
winner: "R3b"
tags: [dashboard, project, identity, layout]
---

# Sketch 025: Dashboard project head

## Design Question
The dashboard opens on the current position today. The project should come first: its name as the
prominent thing, then What This Is and Core Value from PROJECT.md, short and plain. This is the first
of several additions to the dashboard.

## How to View
open .planning/sketches/025-dashboard-project-head/index.html (`?v=r3a|r3b|r3c|b1|b2|b3|a|b|c&doc=lab|sp|sb|syn|fx|sparse&text=full&theme=light&width=375`)

## Variants
- **A: Masthead** — the project is the hero: big name, What This Is as a large lede, Core Value as a
  ruled statement. The current position steps down to a smaller band below.
- **B: Name + promise** — name and a quiet What This Is on the left, Core Value as a large statement
  in its own tinted panel on the right. The current position steps down below.
- **C: Cover line** — a compact band above today's dashboard: name, one line of What This Is and a
  one-line Core Value. The current position hero stays the biggest thing on screen.

## Round 2 — B with the position folded in
Feedback on round 1: B is the starting point. Fold the current position into the same section, drop
the "Current position" label, keep milestone + phase, the phase title and its status, drop the Open
PROJECT.md and View project state links, rework Next up to show the state concisely, and stop showing
blockers in it.

- **B1: One spread** — left: name, What This Is, then the milestone · phase line and the phase title
  with its status, bottom-aligned. Right: the Core Value panel above the Next up card.
- **B2: Two tiers** — name + What This Is beside Core Value on top; a ruled strip below holds the
  phase on the left and the Next up card, unboxed, on the right.
- **B3: One panel** — as B1, but Core Value and Next up share one tinted panel.

**Next up card (same in all three):** the next plan (its id and the first sentence of its objective),
or "Start the next milestone" once every plan is done, or "Plan phase N" while a phase is still being
planned. Below it: percent complete, plans and phases done, one bar segment per phase, and the last
activity as one short line. Gates, checkpoints, blockers and waits stay out; they belong to Needs
attention.

## Round 3 — B1, left as one flow, core value inside the card
Feedback on round 2: B1, but group the left side more logically, and keep the Next up card with the
Core Value folded into it.

- **R3a: Stacked flow** — the phase sits straight under What This Is, after a hairline. The card
  opens with Core Value, then Next up, progress and last activity.
- **R3b: Now block** — the phase is labelled "Now" under a primary rule. The card leads with Next up,
  and Core Value closes it as a quiet footer.
- **R3c: One line** — the phase is one line: status chip, phase number and name, with the milestone
  under it. The card opens with Core Value as a large statement on a tinted band.

**Picked: R3b, edited in place.** Core Value moved to open the card, keeping the footer's quiet
treatment, before Next up. The progress row now counts only the current phase's own plans (done =
has a SUMMARY.md, from `phases/` or the milestone's archive), with one bar segment per plan and the
next plan shaded. STATE.md's progress counts the whole milestone, so it is no longer used here. A
phase with no plans yet says so.

Then: the status chip sits on its own line under the phase title. In the card, "Next up" heads the
section, followed by progress, last activity, and the next step (plan id + objective) at the end.
The next step shows its whole first sentence, not a two-line clamp.

**Winner: R3b with the Lead text.**

After the pick: Core Value is removed from the dashboard. The two sides share a top and a bottom edge:
the name meets the card's top rule, and the Now block's status chip meets the card's bottom, where
the next step is pinned.

## Extraction (same in every variant)
`gen-data.mjs` reads PROJECT.md without rewriting anything:
- **Name:** the H1. A title like `Harbor Ledger — Customs Filing Automation` splits into a name and
  a tagline.
- **Lead:** a leading bold sentence if there is one. Otherwise sentences are taken until the lead
  reaches about 70 characters, and never more than two. A lead still over 160 characters is cut at
  its first ` — ` or `: `.
- **Dropped:** italic review notes ("*Reviewed at v1.0 close…*") and sub-headings.
- **Full section:** the toolbar's Text toggle shows the whole section, to compare against the lead.

## Data
STATE.md supplies the milestone, phase, status, progress and last activity. The phase name comes from
the milestone's roadmap heading first. The next plan is the first PLAN.md in the current or a later
phase that has no SUMMARY.md. Quick-task IDs are dropped from the last-activity line.

labelore, studio-portal and sideby.me PROJECT.md files, the dense fixture, a synthetic file shaped
like the client projects (tagline, bold lead, review notes) and a synthetic file with neither section.

## What to Look For
- Is the name the first thing you read, at every width?
- Does the lead say what the project is, without the rest of the paragraph?
- How much should the current position step down once the project leads?
