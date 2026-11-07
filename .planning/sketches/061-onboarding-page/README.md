---
sketch: 061
name: onboarding-page
question: "How does an onboarding summary page lead with the recommended command, ready to copy and never run, then show the project's files, codebase and documents, beside a first screen that may suggest another command, as a picture?"
winner: null
tags: [onboarding, report, phase-11]
---

# Sketch 061: Onboarding page

## Design Question
Phase 11 D-03, D-16 (VIEW-18, last page). `/gsd-onboard` writes `.planning/onboarding/SUMMARY.md`. The page leads with the
**Recommended next step**: the command the summary wrote, in the shared copy-command row ("Copy command", then "Copied"
inside the button, never run, "Labelore does not run commands. Paste it in your terminal." once). Then **Your project
files** (the four planning files, present or "Not found"), **Codebase** (brownfield, the map readiness chip in the Phase
10 words "Complete map" / "Fast map" / "Partial map", the map path, fast map) and **Documents** (the ADR / PRD / SPEC / RFC
candidate count). On a map-only project the Phase 10 "Mapped, not started" head (042 A) also suggests a command; when it
differs from the summary's, a quiet second block "The first screen suggests" shows it with its own "Copy command"
button, neither merged nor hidden (UI-SPEC section 6, RESEARCH C11, 11-20 `buildOnboardingContext`: `firstScreen`,
`differs`).

Real shape (11-02-SUMMARY "## Onboarding summary", matches the writer template exactly): no frontmatter, no tables, no
fences, no bold labels. `# Onboarding Summary`; four `##` (Project State, Codebase Context, Docs Context, Recommended Next
Step) of plain `- label: value` bullets. Project State: four lines, `present` or `missing`. Codebase Context: brownfield
yes/no, map readiness as a bare word (`none`, `fast`, `complete` seen), the map as a path with a parenthetical or
`missing`, fast map yes/no. Docs Context: one integer. Recommended Next Step: one slash command, no backticks. Nothing here
is drawn from a field the lift (11-20) does not carry: files, brownfield, readiness, mapPath, mapDetail (leading number
drives the seven-document figure), fastMapAvailable, docsCount, command, and for a map-only project firstScreen
(command + reason) and differs.

## How to View
open .planning/sketches/061-onboarding-page/index.html  (served: http://cinedise:4174/061-onboarding-page/)

- Tabs `#a`, `#b`, `#c`; Light and Dark (`?theme=dark`); the state bar (`?state=present|partial|maponly|same|missing`):
  - **All four present** (`present`, Lendshed, 11-09 fixture): four files present, map readiness `none`, 2 candidates,
    `/gsd-manager`. No first-screen block (the project has a roadmap, so the Phase 10 head is not shown).
  - **Part-way, fast map** (`partial`, **made up for this sketch only**): two of four files, a fast map of 4 documents,
    1 candidate, `/gsd-new-project`.
  - **Map only, commands differ** (`maponly`, Tidemark, 11-09 fixture): all four files missing, a complete map of 7
    documents, 3 candidates, the summary says `/gsd-ingest-docs`, the first screen suggests `/gsd-new-project` ("The map is
    complete. Next, set the project up."). The two-command case.
  - **Map only, same command** (`same`, **made up**): map-only with both commands `/gsd-new-project`; `differs` is false,
    so no second block is drawn.
  - **All four missing** (`missing`, **made up**): a bare repo, no map, 0 candidates, `/gsd-map-codebase`. 11-09 notes the
    writer does not produce a no-file state with a map; here there is no map either, so it is not map-only and shows one
    command.
- "Copy command" turns to "Copied" inside the button for 1.5 s; no toast; nothing runs.
- At 390px none of the three scrolls sideways in either theme.

## Frames not reused
- **053 A** verdict board; **054 C** gate path; **055 A** instrument grid; **056 C** shared root; **057 C** seed packet;
  **058 A** status dial; **059 A** time ruler; **060 B** evidence rail (sticky margin with a heat map).
- **042 A** rail + column, the Phase 10 mapped-not-started head this page must sit beside (its head stays the Codebase
  page's; this page does not reuse the rail).
The three onboarding frames: **A** one table with three objects standing on it, **B** a full-width ledger of rows, each a
large meter, **C** a stepped stack of floors narrow at the top and wide at the ground. None has a sticky column, a dial, a
ruler, a grid of equal tiles or a two-column rail.

## Shared across all three
- Header: crumbs "{project} / Onboarding / SUMMARY.md", eyebrow "Onboarding", h1 "Onboarding Summary" (the file's title),
  View / Source and Copy path.
- Reading order everywhere: "Recommended next step" first; then "Your project files", "Documents" / "Codebase" (B keeps the
  file's order Files, Codebase, Documents; A is a row Files, Codebase, Documents; C stacks them Files, Documents,
  Codebase by how GSD sets a project up: map, then import documents, then the planning files).
- The command is text in a mono box outside its button (selectable), the button "Copy command" with an aria-label that
  names the command; "Labelore does not run commands. Paste it in your terminal." appears once, under the summary's
  command. The second block has its own button and no second note.
- Differing case: the summary's block carries a quiet "From the onboarding summary" line (a copy addition beyond the
  UI-SPEC list, to label it as the summary's per section 6; drop it if not wanted) and the second block is a dashed quiet
  box "The first screen suggests" with the Phase 10 reason sentence and its own copy row. Where it sits is the variant's
  choice (A beside the command, B under it, C on the Codebase floor).
- Files: present is a `complete` square or sheet; "Not found" is `quiet` dashed (an absence, never an error tone).
  Map readiness chip: Complete map `complete`, Fast map and Partial map `in-flight`; `none` shows "Not found" for the map; a
  word outside those is shown as written in a dashed plain chip. Candidates are neutral (not good or bad).
- Tones: `complete`, `in-flight`, `quiet` and the neutral square only. No `destructive`, `warning` or `missing` anywhere:
  nothing here is a failed read.
- Computed by Labelore from the summary's own fields only: present count (n of 4), the mapped-document count (leading
  number of the parenthetical, out of the map's seven), `differs`. A line that does not read leaves its figure out and
  shows the plain line.

## Layout contract
- **Page:** `.page` max width 40 space-8 units (the 060 width), padding fluid, section gap `--space-8`; every variant is
  one column of content under the header at 390px.
- **A: Desk.** Under the command (and, in the differing case, the second block beside it at 62rem and up, stacked below
  that) one bordered **desk**: three columns `2.5fr 1.2fr 0.8fr`, objects bottom-aligned so they stand on the table
  edge (8px foreground rule). Files: a folder with the tab ".planning/" holding four sheets (present: tinted sheet with
  three text lines and the file name; Not found: dashed empty sheet). Codebase: a smaller folder "codebase/" with seven
  mini documents (mapped tinted, the rest dashed) and "n of 7 documents mapped", the readiness chip beside the heading;
  a dashed folder and "No map" when there is none. Documents: a pile of up to five offset sheets with the count on the top
  one (a dashed empty sheet for 0). Under 62rem the desk is one column; under 42rem the sheets are two by two. Three
  closed bars under the desk hold the prose facts (the file pills, brownfield, readiness, map path, fast map, the
  candidate line); clicking an object opens its bar.
- **B: Meter ledger (reuse).** One ledger under an 8px foreground rule: a label column (6 space-8 units), a figure column,
  a facts column. Row 1 the command (label left, command and the quiet second block right, full width of the two
  columns). Rows 2 to 4 the measures, each with the shipped **status-meter** drawn large: files as four squares, the map as
  seven (in the readiness tone; none filled when not found), candidates as up to twelve neutral squares with the count as a
  heading-size number; facts column: the four file pills, the codebase fact list (brownfield, readiness chip, map path
  with its parenthetical, fast map), nothing for documents. Reuses `status-meter`, `status-chip` and the shared
  `copy-command` row unchanged. Under 62rem every row is one column.
- **C: Floors.** A centred stack of slabs, narrow at the top and wide at the ground, shared 1px borders: the roof (64%
  wide, 8px top rule) is the command; then Your project files (76%, four windows), Documents (88%, one small sheet per
  candidate up to twelve, dashed when there are none), Codebase (100%, the ground, muted fill, seven mini documents,
  facts, and the quiet second block, which sits on the floor it comes from). Each slab has a label column and a body;
  under 62rem every slab is full width, under 52rem the label stacks above the body and the windows go two by two.

## Font sizes
Four: `--fs-display-3` (the h1), `--fs-7` (section headings, the big candidate count), `--fs-4` (body and the command
text), `--fs-2` (labels, chips, file names, captions). No other size is used (checked by grep). No colour literal or
`destructive` in the file (checked by grep); every colour is a theme token or a colour-mix of tokens.

## Variants
- **A: Desk.** Opens on a picture of the project as three objects on one table: a folder with four sheet slots (the
  four planning files), a smaller folder of seven mini documents (the codebase map and its readiness), a pile of
  candidate documents. Beside the Phase 10 map-only first screen: the second block sits to the right of the command, so
  the "summary says / first screen says" pair is the first thing you read; the desk never repeats the Phase 10 head's
  stack and concern counts. Draws the files as slots (new figure).
- **B: Meter ledger (reuse).** Opens on the shipped figures: the status-meter large for files and for the map, the readiness
  chip, the copy-command row. One row per measure, so it reads as an instrument list. The second block sits directly
  under the command in the first row. The reuse option for this page (the Phase 10 chips and meter, nothing new drawn).
- **C: Floors.** Opens on a stepped stack of floors: the command is the roof, the planning files, documents and the
  codebase below it, narrow to wide. Beside the Phase 10 head: the second command is attached to the Codebase floor, the
  layer the Phase 10 head is about, with the map figure beside it, so each command sits where it comes from.

## Open choices for the user
- B reuses shipped pieces and draws nothing new; A and C draw new figures (a folder of slots, a stack of floors).
- Whether the "From the onboarding summary" line (differing case only) stays.
- The never-runs sentence appears once under the summary's command, so in C and B the second block's copy button has the
  note above it, not under it.
- The 11-02 / 11-09 note stands: a map-only project with four missing files is not what the writer produces, so the
  `maponly` state is a fixture case; the page handles it either way.
