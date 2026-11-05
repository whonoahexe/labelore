---
sketch: 046
name: codebase-conventions-testing
question: "Inside 042 A's Rail + column frame, how should the Conventions panel (quiet reference rules per heading) and the Testing panel (framework and runner first, run commands as copyable rows, then organisation, mocking, fixtures, coverage and test types) open on a picture rather than a list?"
winner: "B"
tags: [codebase, conventions, testing, run-commands]
---

# Sketch 046: Conventions and Testing panels

## Design Question
Phase 10 D-14 ("Conventions and Testing may share one") and UI-SPEC section 2 (Conventions and Testing rows).
Conventions is reference material: a short rules list per heading (Naming, Code Style, Import Organization, Error
Handling, Logging, Comments, Function Design, Module Design), quiet and low urgency. Testing leads with the
framework and runner, shows the **run commands as copyable mono rows** (the shared `copy-command` row: selectable
text, a "Copy command" button, "Copied" inside the button, never a toast), then file organisation, mocking,
fixtures, coverage and test types. The frame is 042 A and is drawn identically in every variant; only the panel
interiors vary.

As in 045, every variant opens on a **picture of the data** (round 1 of 043 and 044 was rejected as "plain boring
wall of texts"); a rule, runner, folder or test type is read in full on demand in the dock under the picture, and
every section of the document stays reachable as a closed bar under the dock. The three variants differ in the kind
of picture.

## How to View
open .planning/sketches/046-codebase-conventions-testing/index.html

- Tabs `#a`, `#b`, `#c` pick the variant. Light and Dark switch theme (`?theme=dark` works too).
- The rail entries **04 Conventions** and **05 Testing** switch panel (or the sketch bar's Panel buttons, or
  `?panel=testing`); the other five entries are drawn in their own sketches.
- The State bar (`?state=labelore|tidemark|commands8`):
  - **Labelore**: its own CONVENTIONS (twelve sections: the eight known plus four of its own, 112 rules) and
    TESTING (302 lines, eleven sections including the repeated "Test Types Summary", nine run commands written with
    the comment beside the command).
  - **Tidemark**: the made-up fixture: the **older-form** CONVENTIONS (no frontmatter, an Analysis Date line and a
    `*Last updated: 2026-10-27*` footer, so the panel says "Dated Oct 27, 2026 from its Analysis Date line (no map
    stamp, no commit)" and names the footer), and its short TESTING (co-located tests, three commands with the
    comment above the command).
  - **Eight run commands**: Tidemark's TESTING with five more commands in its own comment-above form.
- "Copy command" turns into "Copied" with a check inside the button for 1.5 seconds; nothing runs.

## Reuse check (shipped components that already show this kind of data)
| Shipped | Where | Used here |
|---------|-------|-----------|
| Copy-command row (`copy-command`, 10-10) | Codebase head | every variant, for every run command (UI-SPEC section 8) |
| Risk piles (044 E, chosen at 10-09, built in 10-12) | Concerns panel | **B** Conventions: one column per section, one segment per rule |
| Clean tree (`CleanTreeFigure`, 009 B) | RESEARCH structure, Structure panel | **B** Testing: the Test File Organization Structure fence |
| Swaps (032 A) | RESEARCH anti-patterns | not used as rows; A draws the same "x, not y" idea as a struck specimen |

## Variants
- **A: Specimen sheet + runner bench.** Conventions is a sheet of plates, one per section: a rule that names a case
  style is a specimen card (the style large in mono, the label over it, a real example under it: `kebab-case` /
  `project-registry.ts`, `SCREAMING_SNAKE_CASE` / `DEFAULT_PORT`); every other rule is its names in mono beside a
  one-line caption, and a name the rule rules out is struck through (`.test.tsx`, `export default`, `undefined`,
  `@ts-ignore`); a plate shows six rules and "+N more rules". Testing is a bench per runner the document names
  (Vitest with its config, Playwright Test with its config), each holding the test types that run on it and its own
  run commands as copy rows; type check and lint sit on a dashed "checks" bench, coverage on a hatched plate ("None
  enforced"); Labelore's Forbidden Test Constructs are a strip of struck names.
- **B: Reuse: rule piles + test tree.** Conventions is 044 E's pile picture: a column per section in the
  document's order, one segment per rule, the count under each column; a segment's opacity is the rule's strength
  (hard: never, must, only, no; plain; observed habit hollow) and an accent ring marks a rule a test or the linter
  checks; the section chips filter. Testing opens on a strip of runner plates (runner, e2e runner, assertion
  library, coverage), then the shipped clean tree of the document's own test folder, each folder carrying the Test
  Types whose parenthesis names it (Unit, HTTP / server, Contract / source-scan, E2E with its Playwright runner) and
  test files marked; the run commands follow in their own frame.
- **C: Territory map + mirror map.** Conventions is a map of the repository's territories the rules name by path
  (`src/server`, `src/web`, `src/planning-repo`, `test`, `docs`, the repo root files ...), an "Everywhere" band for
  rules that name no path; a territory's size and shade grow with its rules, each rule a mark in it (strength and
  checked ring as in B); the section chips light one section's marks. Testing is a mirror map: the source folders
  on the left, the test folders on the right, a wire from each test folder to the source folder its line names
  ("`test/server/` for `src/server/**`"); a test folder that names no source is dashed. With co-located tests
  (Tidemark) the tree's `x.ts` and `x.test.ts` pairs are wired instead. Runner plates above, commands below.

## Where each mark comes from (every one is computed from the documents)
| Mark | Source in the map |
|------|-------------------|
| A plate, B column, section chip | one `##` section; the eight known headings get short labels, others keep their heading ("Conventions" dropped) |
| A rule (row, segment, mark) | a top-level bullet, a bold label's inline value (`**Framework:** console only`), or a plain line under a label |
| Case-style specimen | the words kebab-case, camelCase, PascalCase, SCREAMING_SNAKE(_CASE), snake_case or lower-case in the rule; the example is its first backticked name that is not struck |
| Names shown | the rule's backticked names |
| Struck name | a backticked name in the clause after "not", "no", "never" or "instead of", up to its colon or parenthesis and before "outside" or "except" (or before "does not" / "is not"); never a path |
| Strength (opacity) | hard: never, must, do not, only, always, no / not before a name; observed: observed, usually, common, rare, prefer; else plain |
| Checked ring | the rule names a `test/...test.ts` file, ESLint or lint, "enforces", or "the compiler rejects" |
| C territory | a backticked path in the rule, cut to `src/<folder>`, `test`, `docs`, `fixtures`, repo root config files, a bare file name, or another path; none = Everywhere |
| Runner plates / benches | Test Framework labels containing Runner, E2E runner or Assertion Library: the first bullet's name and version, the `Config:` bullet's file |
| Coverage plate | the Coverage section's Requirements value, first sentence |
| Run commands | every line of a shell fence under a Run Commands label or in the Coverage section; the comment beside (`  # ...`) or the `#` line above is the caption; a repeated command is shown once |
| A command's bench | the runner named in the command or its caption; tsc, typecheck, eslint or lint go to checks; otherwise the document's first runner |
| Test types and their runner | Test Types bold labels; their parenthesis paths; the runner named in their lines, or the Test Types Summary table's Runner column |
| B tree, badges | the Structure fence under Test File Organization (indent, `# note`); a badge is a test type whose parenthesis names that folder |
| C wire | a Location bullet (or sub-bullet) holding a `test/...` path and a `src/...` path; co-located: tree files `x.ts` and `x.test.ts` in the same folder |
| "Value not shown" / ‹value not shown› | a value written beside a variable name, removed before the text reaches this file (the code samples in Common Patterns included) |

## Mobile form at 390px (no sideways page scroll in any state, theme or variant)
Everything **reflows**; nothing pans. A's plates and benches become one column. B's piles keep every column (twelve
for Labelore) and hide the column labels, as 044 E does, with the section chips under the picture; the tree keeps
its indent. C's territories wrap to two or one a row; the mirror map keeps both columns with a narrow gutter and
hides the captions (so Labelore's three `test/` root rows read the same until selected). Checked in headless
Chrome: 72 screenshots (3 variants, 2 themes, 2 widths, 2 panels, 3 states), no sideways page scroll, no console
errors.

## Layout contract
Measured in headless Chrome from the file; the picture frame is the reading column, 838px wide at 1280 and 358px at
390. Heights are the picture frame, Labelore state unless named.

**A: Specimen sheet + runner bench**
- 1280 Conventions: plates in three columns of at least 15rem (Naming spans two), six rules each; 838 by 2951px
  (Tidemark 928). The longest first screen of the three.
- 1280 Testing: three benches (Vitest, Playwright Test, checks), the coverage plate under them, the Forbidden strip
  across; 838 by 1119px (Tidemark 437, eight commands 885).
- 390: one column, Conventions 6097px, Testing 1829px.

**B: Reuse: rule piles + test tree**
- 1280 Conventions: twelve columns across 806px, segments 13px with 3px gaps, the tallest (Naming, 22) about 350px;
  838 by 533px (Tidemark, eight columns, 261px).
- 1280 Testing: the runner strip then the tree, 838 by 554px; the run commands are a second frame below it.
- 390: twelve columns of about 22px, labels hidden (583px); the tree is 633px.

**C: Territory map + mirror map**
- 1280 Conventions: the Everywhere band full width (42 rules), then thirteen territories in wrapped rows of at
  least 9rem, `src/server` largest (23); 838 by
  548px (Tidemark 340).
- 1280 Testing: two columns with a 7rem gutter for the wires, each source folder on the row of its test folder;
  838 by 1772px with the nine commands (Tidemark 575).
- 390: territories two or one a row (1024px); the mirror keeps two columns and a 2rem gutter (1812px).

## Font sizes
Measured in light theme at 1280 and 390, text of the page only: four sizes in every variant, state and panel; no
typography exception.

| Role | Token | Size at 1280 | Renders |
|------|-------|--------------|---------|
| Display | `--fs-display-3` | 76.8px (44.8px at 390) | the `h1` only |
| Heading | `--fs-7` | 20.8px | panel `h2`, case-style specimens, runner names, column and territory counts |
| Body | `--fs-4` | 13.12px | the command text, mono names, folder names, the dock, the section bars |
| Label | `--fs-2` | 11.2px | captions, badges, micro labels, "Copy command", keys |

## Colour
Tokens only: the opacity steps `--fill-1..4`, a hatch of `--border`, the foreground and muted foreground; the accent
for the frame's active entry, a selected mark's ring, the checked ring and a lit wire; the folder icons take
`--primary` as the shipped clean tree does. No tone is used for a rule or a test (they are content); no destructive,
warning or missing tone anywhere. No colour literal in the file.

## What to Look For
- Conventions is "reference, low urgency": does the specimen sheet (A) make the naming rules readable at a glance,
  or do the piles (B) or the territories (C) say more about the document ("Naming and Code Style ask the most",
  "42 rules apply everywhere, `src/server` carries the most")?
- Testing must lead with the runner: which picture says "what runs what" best: benches holding their commands (A),
  the test folder tree with type badges (B), or the mirror of tests against code (C)?
- The copy-command rows: inside the benches (A, commands split by runner) or as one list after the picture (B, C)?
- Tidemark's older-form Conventions (dated from its Analysis Date line, the Last updated footer named) and its
  co-located tests: does each variant still read, or does one fall back to too little?

## Open points for the build
- Strength words, the checked rule and the struck-name rule are sketch heuristics; they hold on these two
  documents and should be pinned with fixtures if a variant using them wins.
- A command's bench (A) relies on the runner being named in the command or its comment; Tidemark's comments name
  none, so its commands sit on the first runner except type check and lint.
- Labelore's tree lists `rendering/fixtures/` as one row, so the Unit badge for `test/rendering/` has no row; Golden
  and Integration name files outside the tree and are listed as "not placed on the tree" (B).
- The mirror map's three `test/` root rows (handler tests, root guards, the general location line) are told apart
  only by their captions, which hide at 390.
- A value beside a variable name in a code sample (TESTING's Common Patterns) is withheld here as
  "‹value not shown›"; UI-SPEC leaves plain sections unmasked, so whether the build masks code samples is open.

All content is Labelore's own public map, the made-up Tidemark fixture, or five Tidemark commands invented here in
the fixture's own form; no other repository's map is drawn from. The repository is public.

## Winner
**B: Reuse: rule piles + test tree**, chosen by the user at the 10-11 checkpoint ("B for 46"), no synthesis. The
tab is marked "★ Selected"; A and C stay in this folder as the record and are not built.

Build B as drawn, from shipped or already-chosen parts inside 042 A's frame:

| Part of the panel | Build against | Sketch it came from |
|-------------------|---------------|---------------------|
| Conventions: a column per section, a segment per rule, the count under each column, the section chips that filter, a selected rule in the dock | the Risk piles 10-12 builds for the Concerns panel (044 E); not in `src/` at this sketch's commit, so 10-14 takes the component from 10-12's output | 044 E |
| Conventions: segment opacity by strength, the accent ring on a checked rule | this sketch's rules (hard, plain, observed; checked by a test or the linter) in place of 044 E's Priority steps and most-dangerous ring | this sketch (B) |
| Testing: runner plates (runner, e2e runner, assertion library, coverage) | first, a strip of small plates | this sketch (B) |
| Testing: the test folder | `CleanTreeFigure({ text, title, caption })` / `CleanTree` in `src/web/components/clean-tree.tsx` on the Test File Organization Structure fence, with test-type badges in the notes column | 009 B |
| Testing: run commands | `CopyCommand({ command })` in `src/web/components/copy-command.tsx` (the shared `copy-command` row), one per command, its comment as the caption | 10-10 |

The sections the picture does not draw stay as the closed section bars. Open items are in 10-11-SUMMARY.md.
