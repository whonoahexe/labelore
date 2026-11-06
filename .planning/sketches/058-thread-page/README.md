---
sketch: 058
name: thread-page
question: "How does a thread page put its status and next steps first, then its goal, context and references, as a picture?"
winner: null
tags: [thread, exploration, phase-11]
---

# Sketch 058: Thread page

## Design Question
Phase 11 D-02, D-16 (VIEW-16). `/gsd-thread` writes `.planning/threads/{slug}.md`: a small piece of work that carries
across sessions. The page leads with where it stands (status, created and updated), then the **next steps** in the
author's order, then Goal, Context and References. Three arrangements, three different pictures of the same file.

Real shape (the D-14 scratch run, 11-02-SUMMARY "## Thread", read for shape only):
- Frontmatter, five keys: `slug` (the file name stem), `title`, `status` (the workflow's set is `open`, `in_progress`,
  `resolved`; only `open` was seen for real), `created` and `updated` (dates).
- Body: `# Thread: {description}`, then `## Goal`, `## Context`, `## References`, `## Next Steps`. Context opens with an
  italic "Created {date}" note, then bullets with inline code. Next Steps are **plain bullets, not a numbered list**, so
  the numbering is the page's. The workflow's placeholder bullets ("(add links, file paths, or issue numbers)" and
  "(what the next session should do first)") count as empty when left in place.
- The older shape (the made-up example in 11-08, written to the older template): an HTML comment line, a
  `# Thread:` heading, a `## Status: OPEN` section in the body and no frontmatter at all, so there is no `updated` date,
  and the created date is only the Context note's.

## How to View
open .planning/sketches/058-thread-page/index.html

- Tabs `#a`, `#b`, `#c`; Light and Dark (`?theme=dark`). "Today" is 2026-04-21, so the ages are computed from it.
- State bar (`?state=progress|resolved|older|empty`), all made up (Lendshed):
  - **In progress** (`progress`, loan-limit-policy, the 11-08 fixture): three numbered next steps, created
    2026-03-27, updated 2026-04-12, two Context bullets, two References (one resolves, one is free text).
  - **Resolved** (`resolved`, kiosk-printer-swap, 11-08): created 2026-02-02, updated 2026-02-20, three steps.
  - **Older shape, `## Status: OPEN`** (`older`, offline-mode, 11-08): the body status read as `open`, created from the
    Context note, no updated date, and the two placeholder sections so empty (it is both the older shape and the
    empty-steps case the file happens to carry).
  - **Empty next steps** (`empty`, steward-rota-view): **a fourth thread made up for this sketch only**, the current
    shape with real dates and a real reference but its Next Steps placeholder never filled. 11-23 should add it to the
    fixture if the build needs a current-shape thread with no steps.

## Frames not reused
How the locked frames and the shipped status-first pages lay out their pages (a thread must not copy any):
- **053 A** verdict board (columns of verdict groups); **054 C** gate path (a vertical spine of gates ending in a boxed
  next action); **055 A** instrument grid (tiles with key figures); **056 C** shared root (a root node with card branches).
- **027 C** the todo lifecycle (a Noted, Captured, Closed strip over one numbered spine); **023 A** the debug case file
  (status plus reported quote, a suspects board, an evidence log).
- **057** (this phase's seed page): a time axis, a fan of references, an envelope. The thread pictures are none of
  those: a dial, a route and a day grid.
The three thread frames: **A** a dial card beside the steps (instrument over a list); **B** a vertical trail from
start to goal, a context sheet beside it; **C** a full-width figure of one square a day over a two-column reading band.

## Shared across all three
- Header: crumbs "Lendshed / Threads / {slug}", eyebrow "Thread", the h1 the title (frontmatter `title`, or the
  `# Thread:` heading in the older shape), then the slug, the View / Source toggle and a Copy path button.
- Labels (the Copywriting Contract, verbatim): "Next steps", "Goal", "Context", "References", "Created {date}",
  "Updated {date}". Older shape: "Created" from the Context note, no "Updated" (absence is silent).
- Tones: `open` and `in_progress` `in-flight` with the word telling them apart (the word is the file's, `in_progress`
  shown as "in progress"), `resolved` `complete`, any other value verbatim and quiet. The dial and the route mark the
  status by position as well as by colour, so tone is never the only signal.
- Next steps are numbered in the author's order; the first is boxed at heading size (the focal point is status and the
  first next step). Empty steps draw nothing: no "No steps" line.
- References: a path that resolves is a `complete` square and a link; one that does not is a quiet dashed square,
  plain text and a quiet "Not found"; free text is a neutral square and plain text. Placeholder bullets are absent.
- Computed by Labelore, never the file's: "{n} days since the last update", "{n} days · a week a column", "You are here".

## Variants
- **A: Status dial.** A half-dial of the three statuses (Open, In progress, Resolved), the needle on this thread's own,
  the status chip under it with Created and Updated and the age of the last update. Beside it "Next steps" (first one
  boxed) over "Goal"; Context and References in two columns below. An unrecognised status leaves every arc grey and the
  needle at rest. Computable from `status`, `created`, `updated` and the step list.
- **B: Route.** A vertical trail: a start node (the status flag "You are here" with created and updated), a stone per
  next step (first one boxed), then the goal at the end of the trail. Resolved moves the flag to the goal, which turns
  `complete`; empty steps leave a dashed trail straight from start to goal. Context and References sit in a sheet beside
  the trail.
- **C: Day grid.** One square for every day from created to today, a week a column, a month label above: the created
  and updated days ringed, the days between filled in the status tone, the quiet days since the last update empty,
  today underlined. A thread that went quiet shows as a long empty tail. The status chip, dates and a legend beside it;
  "Next steps" over "Goal", Context and References in two columns below. No `updated` date means only the created day is
  marked and the rest is empty.

## Layout contract
Measured in headless Chrome (1280x800 and 390x844; every state, every variant, both themes):
1. No sideways scroll: `scrollWidth` equals `clientWidth` (1280 and 390) in all 24 combinations per width.
2. The picture's top edge is at y 481px at 1280 for A, B and C (under the h1 and meta row).
3. A at 1280: a 352px dial card beside a 802px steps column (a 24px gutter); under 52rem (about 832px) one column, dial
   first.
4. B at 1280: the trail 794px wide beside a 352px sheet (a 32px gutter); under 62rem (about 992px) the sheet drops under
   the trail. The first next step sits above the 800px first-screen line; the goal does not at 1280.
5. C at 1280: a 1178px figure with a 320px side column; the cells are 32px at 1280 and 16px under 42rem (672px), a
   14-week thread (93 days) taking 14 columns and about 480px at 1280 and 250px at 390. The first next step is below the
   800px first-screen line.
6. Next-step sentences and the goal always wrap and are never cut; a mono slug or path ends in an ellipsis or wraps and
   never sets the row height.

## Font sizes
The four-size cap (UI-SPEC Typography, no exception route). Computed sizes found on the page in all combinations:
- **Display 76.8px** at 1280 (44.8px at 390), `--fs-display-3`: the h1 only.
- **Heading 20.8px**, `--fs-7`: section h2, the boxed first step, the status chip, the goal at the end of the route.
- **Body and Meta 13.12px**, `--fs-4`: the goal, context bullets, the other steps, reference descriptions.
- **Label 11.2px**, `--fs-2`: eyebrow, crumbs, chips, dates, slugs, step numerals, month labels, legend, buttons.
Weights 500 and 600 only. The app shell and the sketch bar are outside the page.

## Sketch words
Not UI-SPEC copy, drawn only to read the picture: "View" and "Source" (the shipped toggle), "Copy path", "You are here",
"Here", "Created to today", "a week a column", "days in between", "quiet days since the last update", "today, {date}",
"{n} days since the last update", "Not found", and the dial's three words Open, In progress, Resolved.

## Reuse and open points for the build
- **Shipped figure to reuse.** None fits as the lead: the `StatusMeter` counts items done, and a thread's steps have no
  done state in the file; the status dial is three fixed positions, not a count. The route reuses the shipped round
  `sq` squares and the `status-chip`; no new shared class is implied until the user picks.
- Steps carry no done flag in the file, so none of the variants shows progress through the steps, only the status.
- The h1 is the title and can be long (two lines at 1280, four at 390); 11-23 decides whether the header caps it.
- The older shape is recognised by the missing frontmatter and the `## Status:` section; its status word is read from the
  body and its created date from the Context note. A thread with neither shows no date row.
- A reference that is free text (no path) is shown as written and is never a link.

All text is made up. The repository is public.

## Winner
Pending, chosen at the 11-14 checkpoint.
