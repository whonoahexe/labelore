---
sketch: 039
name: project-switcher
question: "How does the header brand area open into a project list with load marks, a forget action and an \"Add or scan…\" entry?"
winner: A
tags: [header, switcher, projects, navigation, multi-project]
---

# Sketch 039: The header project switcher

## Design Question
Phase 8 lets Labelore hold several projects at once. Today the shell header's brand area shows one
fixed project name and meta line as part of the dashboard link. It has to become a control that opens
a list of every remembered project. Each row carries the display name, a quiet path or `ssh://`
target, and a load mark only while the project is loading or unavailable. A forget action sits on
each row, and an "Add or scan…" entry sits at the foot of the list. How should that list open from
the header: a popover under the name, a wide panel across the page, or the planning-files drawer's
two-column sheet?

The winner decides layout and arrangement only. Copy, tokens, states, accessibility and the
security-visible behaviour in `08-UI-SPEC.md` bind whichever variant wins.

## How to View
open .planning/sketches/039-project-switcher/index.html

- `#a`, `#b`, `#c` pick the variant (the A / B / C tabs do the same). Default is A.
- `?theme=dark` forces the dark theme; otherwise `prefers-color-scheme` decides. The Light and Dark
  buttons toggle it on the page.
- The state bar switches between: **Default** (closed header over the dashboard), **Popup open**
  (what loads first), **Forget confirm** (the inline confirm on the Portal row), **Add dialog**
  (empty), **Add error** (the invalid-target error with the exact path checked) and **Switching**
  (header already on Shapes with an empty meta line, body "Opening Shapes…"). `?state=closed|popup|confirm|add|adderror|switching`
  opens a state directly.
- **Long list** adds twelve rows including an 80-character display name and a 120-character path,
  to see clamping and ellipsis. `?long=1` does the same. **Reveal forget** shows every forget
  button at once (on a fine pointer they appear on row hover or focus-within).
- Narrow the window to 390px for the phone layout (real media queries at the shell's 62rem and
  42rem breakpoints, and `(pointer: coarse)` for the forget button).

All names, paths and hosts are made up (Lendshed, Shapes, Portal, Kiln, `~/Work/acme/...`,
`ssh://build-box/srv/kiln`). The repository is public.

## Shared across all three
- **The header is today's shell header** (drawer trigger, mark and LABELORE link, `/`, tabs,
  snapshot pill, search, theme toggle). Only the brand area changes: the mark and wordmark stay the
  link to the current project's dashboard, and the name-over-meta block becomes a separate
  **trigger button** with a trailing chevrons-up-down icon, `aria-label="Switch project. Current
  project: Lendshed"`, `aria-haspopup="dialog"`, `aria-expanded`, and the full path in `title`.
  The meta line (`v2.1 · Phase 3/5 · Executing`) lives in the trigger only, never on a row (D-02).
- **Popup content, in order:** the "Projects" micro-label with an "All projects" link at right; the
  rows; a footer with one ghost button, "Add or scan…" (plus icon).
- **One row component.** Fields, in order: display name; quiet mono path (`Folder` icon) or
  `ssh://` target (`Server` icon); a load mark only when loading ("Opening…" with a spinning
  loader, quiet tone) or unavailable ("Unavailable", `missing` tone, with the server's reason on its
  own line below); the forget action. Last-opened time is landing-page only and absent here. The
  current row has the 2px accent left rule, a `Check` icon and `sr-only` "Current". Rows are sorted
  last opened first, never-opened last, with unavailable rows keeping their place (D-04).
- **Forget action.** A ghost icon button (`aria-label="Forget Portal"`, tooltip "Forget this
  project"), 36px square on a fine pointer, 40px on `(pointer: coarse)` and at 390px, shown on row
  hover or focus-within, always shown on coarse pointers and at 390px. Pressing it replaces the row
  with the confirm: "Forget Portal? Labelore only removes it from this list. The project's files
  are not touched." with "Forget project" (outline) and "Keep project" (ghost, focused). Escape or
  "Keep project" restores the row.
- **Add dialog** (modal, 512px wide, identical in all three): title "Add a project", the
  description, the field "Project location", the footer "Close without adding" (ghost) and "Add
  project" (accent), and below the footer the link "Scan a folder instead". Its error state shows
  "Could not add this project.", the server message and "Path checked: …", with `aria-invalid` on
  the field and `role="alert"` on the notice.
- **Switching.** The popup closes at once; the header shows the new project's name with an empty
  meta line; the body shows a quiet-state "Opening Shapes…" with `aria-busy` and the route progress
  bar. The popup never shows a spinner.
- **Data.** Lendshed (current, loaded), Portal (loading, "Opening…"), Kiln (`ssh://`, server icon),
  `portal` at `~/Work/beta/portal` (slug `portal-2` after the D-11 collision; display name falls
  back to the folder basename because no `PROJECT.md` title can be read for an unavailable target,
  D-21; unavailable, with its reason), Shapes (never opened, last).
- **Only theme tokens, squared corners, the four UI-SPEC sizes** (`--fs-2`, `--fs-3`, `--fs-4`,
  `--fs-7`), weights 500 and 600, token spacing. Accent appears only on the current-row marker (rule
  and check), the "Add project" submit and the focus ring. The shipped header's own accents (mark
  tile, active tab rule, snapshot dot) are existing chrome, left as they are.

## Variants
- **A: Popover under the trigger.** The lightest change to the header. A popup at most 448px wide
  and 448px or 70vh tall hangs under the trigger, left-aligned with it, and scrolls inside. The page
  stays visible and unshaded behind it (non-modal). At 390px it spans the viewport width directly
  under the header.
- **B: Wide panel from the header.** A panel drops across the whole header width with full-bleed
  rows. At 1280px each row is one line of columns (name, path, load mark) with the reason on its own
  line under the path, so long paths and reasons show in full. The page below is dimmed. At 390px it
  collapses to A's phone layout.
- **C: Left sheet, sketch 038's two-column pattern.** A 608px (38rem) sheet from the left edge with
  the project list on the left (256px) and, on the right, the details and actions of the project
  under the pointer or keyboard focus (full path, status, reason, address, "Open dashboard", "Forget
  this project"), defaulting to the current project. Rows still navigate on click; the pane only
  follows hover and focus. At 390px the sheet is one column (the pane is hidden) and the forget
  action stays on the row. "Add or scan…" spans the foot of the sheet.

## What to Look For
- A: Is 448px enough for long paths, or does ellipsis arrive too soon? Does a dozen-plus list feel
  cramped in a small scrolling box?
- B: Do full-bleed rows earn the extra width, or is covering the page too heavy for a quick switch?
- C: Does the details pane earn a second sheet beside the planning-files drawer, given that on touch
  and at 390px it disappears?
- All: does the forget action stay quiet until wanted, and is the inline confirm clear in a narrow
  box?

## Layout contract
Measured in the sketch with Playwright at 1280x800 and 390x844 (long list on); 08-11 builds to
these and 08-15 asserts them against the built switcher. Facts for the winning variant bind; the
other two are kept for the record.

### A: Popover
1. The popup's left edge is within 8px of the trigger's left edge at 1280px (sketch: 4px), and its
   top is at or below the header's bottom edge (it never covers the trigger).
2. The popup is at most 448px wide at 1280px and at most min(448px, 70vh) tall; the list scrolls
   inside it while the "Projects" head and the footer stay in view.
3. At 390px the popup spans the full viewport width (left 0, right 390px) directly under the header,
   with no side borders.
4. The "Add or scan…" button is the last focusable element in the popup; inside a row the tab order
   is project link, then forget button.
5. The forget button is 36px square and hidden until row hover or focus-within at 1280px; at 390px
   it is visible on every row and 40px square.
6. The trigger is at least 40px tall at 390px, and its name and meta truncate with an ellipsis.

### B: Wide panel
1. The panel's left edge is 0 and its right edge is the viewport's right edge (1280px and 390px)
   with its top at the header's bottom edge; a scrim dims the page below it.
2. The panel is at most min(560px, 70vh) tall and scrolls inside; every row is exactly as wide as
   the panel, with dividers running edge to edge.
3. At 1280px the path of every row starts at one shared left edge (sketch: 328px), the load mark
   is right-aligned in the row, and an unavailable row's reason sits on its own line under the path.
4. At 390px rows stack name and mark, path, then reason, with no horizontal scroll, and the forget
   button is visible and 40px square.
5. "Add or scan…" is the last focusable element in the panel.

### C: Left sheet
1. The sheet is anchored to the left edge (left 0) and runs the full height of the app below the
   sketch bar; it is 608px (38rem) wide at 1280px and 94% of the viewport at 390px.
2. At 1280px the list column is 256px wide on the left and the details pane fills the rest
   (351px); the pane is hidden (not rendered) at 390px, which leaves one column.
3. The "Projects" head with "All projects" and a Close button sits above both columns, and the "Add
   or scan…" footer spans the sheet's bottom edge and is the last focusable element.
4. Rows are as wide as the list column; the path takes the full row width under the name, with the
   load mark on the name's line, right-aligned.
5. The page stays visible to the right of the sheet at 1280px under a scrim; the sheet closes with
   Escape and the Close button.

## Notes for the build
- **UI-SPEC sizes override the shipped ones.** `.brand-meta`, `.status-chip` and `.source-note`
  ship at `--fs-1` (10.24px) in `globals.css`; this sketch and 08-UI-SPEC.md Typography use `--fs-2`
  for the meta line and chips (Label) and `--fs-3` for `.source-note` reasons (Meta). The build sets
  those sizes for the new uses (the four-size set binds).
- **Quiet-state icon.** The shipped `.quiet-state svg` is accent-tinted; the accent list in the
  UI-SPEC excludes it, so the sketch keeps the loader neutral. The build overrides it for the
  "Opening {name}…" row.
- **Links stay neutral.** The sketch's `.text-link` hover is neutral; the build keeps whatever the
  shipped `.text-link` does (the UI-SPEC says links stay as they stand).
- **Notice heading.** The shipped `.notice h2` is `--fs-6`, outside the four sizes; the sketch
  sets the heading line at Body size, semibold.
- **Tooltip.** The sketch's "Forget this project" tooltip is CSS-only; the build uses Base UI
  Tooltip with the `aria-label` as the accessible name.

## Winner
**A: Popover under the name trigger**, chosen by the user at the 08-02 checkpoint (decision gate,
success criterion 1 and D-05). No synthesis note. 08-11 builds variant A to its layout contract
above; 08-15 asserts it against the built switcher. Variants B and C are kept for the record. The
choice is also recorded in the MANIFEST row and in `08-02-SUMMARY.md`.
