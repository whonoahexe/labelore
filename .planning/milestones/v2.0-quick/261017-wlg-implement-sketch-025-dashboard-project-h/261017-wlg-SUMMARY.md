---
phase: quick-261017-wlg
plan: 01
status: complete
commit: 675a82e
---

# Quick 261017-wlg: Dashboard project head (sketch 025 R3b)

## What the dashboard now opens on

The old position section is gone. Its "Current position" label, its phase-as-heading, its "View
project state" link and its Recommended action card were all removed. The dashboard now opens on:

- **Left:** the project name as the page's only h1, with the tagline split off the PROJECT.md title
  at its first spaced dash. Under it is the What This Is lead, cut by the sketch's rules. Then comes
  a "Now" block under a primary left rule: milestone · phase, the phase title, and the status chip
  on its own line.
- **Right:** one card, centred against the left side. It reads Next up, then this phase's own plan
  progress (one bar segment per plan, with the next plan shaded), the last activity as one short
  line, and the next step in full at the end.

Core Value is not shown. Blockers and gates stay in Needs attention. The progress panel, Needs
attention and On deck are unchanged.

On labelore itself the head used to read "Phase 5 / Unavailable". It now reads "Per-Type Document
Views": the phase is looked up in the live milestone first, then in that milestone's archive.

## How it is built

- The server reads four more values from STATE.md: the milestone name, the last activity date, the
  last activity description, and the "Current focus" line.
- `src/presentation/dashboard-head.ts` builds the head on the server, and `/api/dashboard` carries
  it as `head`. The page only maps fields to markup, and every string renders as plain text.
- New class names are listed in the Dashboard table of docs/design-language.md. The removed hero
  names (`milestone-label`, `position-copy`, `position-meta`, `next-primary`) lost their rows and
  CSS. `position-hero` stays, because the CONTEXT brief still uses it.

## Choices where the sketch and the project rules differ

- A missing What This Is section shows nothing; the sketch printed a placeholder line. The card's
  "No plans in this phase yet." and "No STATE.md yet — nothing to report." lines stay.
- "1 plan" is singular.
- The year shows in the last-activity date only when it differs from the snapshot's year.
- The card keeps the existing card frame and top rule, but not its offset shadow, since R3b's card
  has none. The shadow is removed only on this card; the CONTEXT brief keeps it.
- A plan step links to the plan page. The other steps are not links.

## Tests

- Added test/presentation/dashboard-head.test.ts. It runs the dense fixture, the synthetic and bare
  PROJECT.md files from the sketch, an archived-phase project and malformed STATE through the real
  reader, plus the lead, activity and date rules.
- Rewrote two older checks that described the removed card: the emoji check now covers the head's
  name, step and last-activity text, and the line-clamp check now covers only the On deck previews.
  Also removed a stale entry from the style-check allowlist.
- Full suite: 2 failures. Both also fail on the code before this change: the style check on three
  older rules, and the plan pair page coverage test. Type check, lint and build pass.
- Checked in the browser on labelore and on the dense fixture, in light and dark at 1440px and at
  390px. The two sides are centred on each other, there is no sideways scroll, and the page has
  one h1.

## Left out of the plan

The user asked to do this directly, as a small change. So the plan's browser test spec, its
reusable fixture-server helper, and the side-by-side screenshot script against the sketch were not
written. The browser check above was done by hand instead.
