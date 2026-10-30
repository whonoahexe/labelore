---
sketch: 040
name: projects-landing
question: "How do the same rows read full width with last-opened time, the add form, the scan form and the checklist?"
winner: B
tags: [landing, projects, scan, add, multi-project]
---

# Sketch 040: The projects landing page

## Design Question
`/` becomes a projects landing page that never redirects (D-01), even with one project. It shows the
same rows as the header switcher (sketch 039), full width, plus last-opened time (D-03). It also
holds the add form (a folder or an `ssh://` target) and the scan form with its checklist (D-13,
D-14). How should the list, the add form and the scan form be arranged: stacked in one column, with
the forms in a side column, or with the forms folded under the list?

The winner decides layout and arrangement only. Copy, tokens, states, accessibility and the
security-visible behaviour in `08-UI-SPEC.md` bind whichever variant wins.

## How to View
open .planning/sketches/040-projects-landing/index.html

- `#a`, `#b`, `#c` pick the variant (the tabs do the same). Default is A. `?theme=dark` forces dark;
  otherwise `prefers-color-scheme` decides. The Light and Dark buttons toggle it.
- The state bar has three independent groups, so any combination can be shown:
  - **Page:** Populated, Empty, Loading, List error, Settings notices (both notices stacked above
    the list), Forget confirm (inline confirm on the Portal row).
  - **Add:** Idle, Adding…, Error (the invalid-target notice with the exact path checked), Duplicate
    ("Shapes is already in your list." with "Open Shapes").
  - **Scan:** Idle, Scanning, Results (4 found, 1 already added, checkboxes work, the button count
    follows), Capped (100 results with the cap notice), None found, Refused (outside the home
    folder), Done ("Added 3 projects…", every item "Already added", three new "Not opened yet" rows
    appear in the list).
  - URL form: `?page=empty|loading|error|notices|populated`, `&add=adding|error|duplicate`,
    `&scan=scanning|results|capped|none|refused|done`, `&forget=portal`.
- Narrow the window to 390px for the phone layout. Real media queries at 62rem (B's two columns
  stack) and 42rem (rows restack, forget always visible), plus `(pointer: coarse)`.

All names, paths and hosts are made up. The repository is public.

## Shared across all three
- **The landing header** is plain: the mark and LABELORE wordmark linking to `/`, no project name,
  no tabs, no drawer trigger, no search, no snapshot pill, and the theme toggle at right.
- **Page intro:** the accent eyebrow "Projects", the `h1` "Projects" at Heading size, and the lede at
  Body size capped at 48ch ("Open a GSD project to see where its work stands. Labelore only reads
  them and never changes them.").
- **Rows are 039's rows verbatim** (same markup, tokens, tones) with the last-opened time added at
  the right of the path line: "Opened 3 hours ago", "Opened yesterday", "Opened last week" or "Not
  opened yet", with the absolute date in `title`. No current-row marker (the landing page has no
  current project). Portal shows "Opening…"; the `portal` row at `~/Work/beta/portal` is
  "Unavailable" with its reason and keeps its place in last-opened order; Kiln is an `ssh://`
  target. The forget action and its inline confirm are the same as in 039.
- **Add a project:** a `section-heading`, the field "Project location" and the accent "Add project"
  submit (same variant as the dialog's). Adding shows "Adding…" and disables the button.
- **Scan a folder:** a `section-heading`, the field "Folder to scan" with its hint, the outline "Scan
  folder" submit. Results render as a fieldset with the legend "Found 4 projects in ~/Work", two
  text-link controls ("Select all projects", "Clear selection", each disabled when it would do
  nothing), checkbox items (name in Body semibold, mono path), one disabled "Already added" item on
  the muted surface, and the accent "Add 3 projects" button, which reads "Add 1 project" for one and
  "Add projects" (disabled) at zero. The checked checkbox fill is the one extra accent use on this
  page. Scan copy for scanning, none found, refused, capped and done is verbatim from the UI-SPEC.
- **Page states:** empty ("No projects yet." with its body, the add and scan sections still shown),
  loading ("Loading projects…"), list error (destructive notice with "Retry loading projects"),
  settings notices (the settings-unreadable notice and the skipped-entry notice).
- **Tokens only, squared corners, the four UI-SPEC sizes**, weights 500 and 600. Accent appears on
  the eyebrow, the "Add project" and "Add N projects" buttons, the checked checkbox fill and the
  focus ring, and nowhere else outside the shipped header chrome (the brand mark tile).
- **Section headings** are drawn as Label-size mono uppercase `h2`s with a top rule. The UI-SPEC
  names no other heading size, so they use no fifth size.

## Variants
- **A: Stacked.** One column. The list first, full width, then "Add a project", then "Scan a
  folder", each under its own rule. The forms are capped at 560px so the field does not stretch
  across 1178px. Reads identically at 1280px and 390px.
- **B: Side column.** From 62rem the list sits on the left and a 448px column on the right holds
  "Add a project" over "Scan a folder", both visible beside the list. Below 62rem it collapses to
  A's order.
- **C: Folded.** The list, then "Add a project" and "Scan a folder" as two disclosure rows under it
  (closed by default, chevron rotates, one extra click to open). With no projects, both open
  automatically. Choosing an Add or Scan state in the bar opens its section.

## What to Look For
- A: with a long list, are the forms too far below the fold?
- B: do 678px rows (list column at 1280px) still read well, and is a form always on screen beside
  the list worth narrowing the rows?
- C: is the quiet page worth the extra click for a task done rarely, and does a scan result opening
  inside a folded section feel contained?
- All: does the unavailable row's reason line read as part of the row, and does the scan checklist
  read as a different thing from the project list?

## Layout contract
Measured in the sketch with Playwright at 1280x800 and 390x844; 08-05, 08-17 and 08-13 build to
these and 08-15 asserts them against the built page. Facts for the winning variant bind.

### A: Stacked
1. The list's top is above the "Add a project" heading's top, which is above the "Scan a folder"
   heading's top (sketch at 1280px: 421, 853, 1050).
2. The list, both headings and both forms share one left edge, the page-stack's (sketch: 51px at
   1280px, 16px at 390px); rows span the full page-stack width (1178px at 1280px).
3. The add and scan forms are at most 560px wide at 1280px and the full column width at 390px.
4. At 390px there is no horizontal scroll, the last-opened time sits on its own line under the
   path, and the forget action is visible and 40px square on every row.
5. A row's last-opened time is right-aligned on the path line at 1280px, directly beneath any load
   mark.

### B: Side column
1. At 1280px the list column starts at the page's left edge (51px) and is 678px wide; the side
   column is 448px wide and ends at the page's right edge (1229px), with a 51px gap between them.
2. The "Add a project" heading sits above "Scan a folder" in the side column, both inside 24px of
   the list's top (sketch: list 421, add heading 438), so both forms are visible without scrolling
   at 1280x800.
3. At 390px (and below 62rem) the side column stacks under the list in A's order, one left edge,
   no horizontal scroll.
4. Rows in the list column keep the last-opened time right-aligned on the path line; the forget
   action appears on hover or focus-within at 1280px and is always visible at 390px.

### C: Folded
1. The list is followed by two disclosure rows, "Add a project" then "Scan a folder", each as wide
   as the list (1178px at 1280px) and at least 48px tall, closed by default (their bodies are not
   rendered while closed).
2. The disclosure triggers are buttons with `aria-expanded`, a chevron at the left that rotates a
   quarter turn when open; Enter and Space toggle.
3. With zero projects both sections are open and the empty-flow sits above them.
4. At 390px the disclosure rows and the list share one left edge (16px), no horizontal scroll, and
   the forget action is visible on every row.

## Notes for the build
- **"Above" in the empty copy.** The UI-SPEC empty-state body says "Add a folder or an ssh://
  target above". The sketch keeps that copy verbatim, but in A and C the forms sit below the empty
  box and in B beside it. If A, B or C wins, 08-17 changes that one word to match ("below" for A and
  C, "beside" for B) and 08-13 updates the UI-SPEC row. The scan-none copy ("add a project by its
  location above") is correct in all three, since the add form precedes the scan form.
- **Select controls.** The UI-SPEC copy "Select all projects" / "Clear selection" is drawn as two
  text-link controls shown together, each disabled when it would change nothing.
- **Sizes and icon tint** follow the UI-SPEC (Label, Meta, Body, Heading), not the shipped
  `.status-chip`, `.source-note` and `.quiet-state` values (see 039's build notes).
- **Settings notices** are drawn stacked above the list; the "settings could not be read" notice
  uses the destructive left rule (a genuine read failure), the skipped-entry notice does not.
- **Capped scan** draws 100 generated items to show the length; the cap notice sits above the list.

## Winner
**B: Side column** (list left, add and scan in a side column), chosen by the user at the 08-02
checkpoint (decision gate, success criterion 1 and D-05). No synthesis note. 08-05, 08-17 and 08-13
build variant B to its layout contract above; 08-15 asserts it against the built page. Because B
won, 08-17 changes the empty-state word "above" to "beside" and 08-13 updates the UI-SPEC row (see
"Notes for the build"). Variants A and C are kept for the record. The choice is also recorded in the
MANIFEST row and in `08-02-SUMMARY.md`.
