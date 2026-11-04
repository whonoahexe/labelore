---
phase: 10-codebase-map-specification-and-check-pages
plan: 06
subsystem: sketches
tags: [sketch, codebase-page, mapped-not-started, phase-10, decision]
status: complete

requires:
  - phase: 10-03
    provides: labelore's fresh codebase map, concern-counting rule, heading and length shapes
  - phase: 10-02
    provides: UI-SPEC contract the sketch draws
provides:
  - sketch 042 (three variants of the Codebase page frame and the map-only head), winner A
  - the typography outcome for the Codebase page (four sizes, no exception)
affects: [10-08 codebase frame, 10-10 mapped-not-started head, 10-09 and 10-11 panel sketches 043-046]

actuals:
  tokens: 40000
  tasks: 2
  commits: 3
plan_head_before: 05ac39ca30ef28737d292e99b52c614c746cce1f
plan_head_after: 527998cdfc4aedeaf117e8e6ad08f567917a2272
commits: 3

key-files:
  created:
    - .planning/sketches/042-codebase-page/index.html
    - .planning/sketches/042-codebase-page/README.md
  modified:
    - .planning/sketches/MANIFEST.md

key-decisions:
  - "Sketch 042 winner: A, Rail + column (user: \"A seems good enough\"), no synthesis"
  - "Codebase-page typography: four sizes; the exception route is not taken"

requirements-completed: [VIEW-13, TGT-09]

duration: about 1h
completed: 2026-11-04
---

# Phase 10 Plan 06: Codebase page frame and the map-only head (sketch 042) Summary

**Sketch 042 draws the Codebase page and the "Mapped, not started" head three ways on the app's own tokens (A rail + column, B tile strip, C bars in place) across six states, and the user chose A, which renders exactly four font sizes.**

## Winner

**042 A: Rail + column**, chosen by the user at the checkpoint (reply: "A seems good enough"), no synthesis note. Build it as drawn: a sticky left rail (288px at 1280) holds the facts line and the seven entries as a table of contents; the reading column holds the map-only head as a bordered block (sentence, stack, concern counts, next step with Copy command), then the active panel. Under 62rem the order is head, facts and seven bars, panel. Recorded in the README `winner:` field ("A"), the tab label ("A: Rail + column ★ Selected") and the MANIFEST row ("A Rail + column (build it)").

Open for the build (the user gave no comment; unchanged from the README's "Open points for the build"):
- The head's concern labels are short ("Security", "Tech debt"); the panel keeps the document's own headings.
- A muted "Most dangerous" pull line is drawn in the Concerns panel; 044 may drop it.
- At 390px the head is ordered before the rail's facts and bars (done in the sketch with `order`).

Typography: four sizes. A renders `--fs-display-3` (h1), `--fs-7`, `--fs-4` and `--fs-2` only (measured in the rendered sketch), so the Codebase-page typography exception is not needed and not approved; 10-08 and 10-10 keep the default four-size cap.

## What was built

- `.planning/sketches/042-codebase-page/index.html`: one self-contained file linking `../themes/default.css`, three variants (`data-variant` a, b, c, picked by the hash), light and dark, and a state bar of six states: normal project, map-only complete (`/gsd-new-project`), fast (`/gsd-map-codebase`, 4 of 7), partial (`/gsd-map-codebase`, 3 of 7), complete with ADR documents (`/gsd-ingest-docs`), and heading variants. Copy command turns into "Copied" inside the button; "Not mapped" entries are not links.
- `.planning/sketches/042-codebase-page/README.md`: how 031, 040 and 041 frame their pages, the shared content, the three variants, a layout contract per variant at 1280px and 390px (measured), and the font sizes per variant by role and token.
- Text is labelore's own public map; the other two repositories' maps only set shapes. The one private line 10-03 flags in the Integrations document was left out, and the folder passes the privacy grep.
- Screenshots (72 full-page renders, three variants by six states by two themes by two widths) are in the session scratchpad, not committed; none scrolls sideways at 390px.

## Deviations from Plan

None. The plan's verify used headless Chrome `--screenshot`; rendering and measurement used Playwright through the installed Chrome as well, because headless Chrome's window flag does not reliably give a 390px viewport. Both ran.

## Known Stubs

None that block the goal. The panel bodies inside the frame are stand-ins by design: 043 to 046 sketch Architecture, Structure, Concerns, Stack and Integrations inside the winning frame.

## Threat Flags

None. No endpoint, auth path or file access was introduced. T-10-11 mitigated: `grep -rqiE 'cinedise|duet|studio-portal'` over the sketch folder finds nothing, and no home path appears.

## Self-Check: PASSED

- `.planning/sketches/042-codebase-page/index.html` and `README.md`: found
- Commits 7fbcf49 and 527998c are ancestors of HEAD; the summary commit follows
- `grep -E '^winner: "?(A|B|C|synthesis)'` on the README prints one line; the MANIFEST 042 row ends the Winner cell with "(build it)"
