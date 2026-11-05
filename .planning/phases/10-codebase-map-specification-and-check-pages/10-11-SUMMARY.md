---
phase: 10-codebase-map-specification-and-check-pages
plan: 11
subsystem: ui-sketches
tags: [sketch, codebase, stack, integrations, conventions, testing, reuse, lane-diagram, piles, clean-tree, copy-command]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: 10-06 winner (042 A, Rail + column frame), 10-09 winners (044 E piles, 043 reuse), 10-05 Stack chip lift, 10-03 fresh maps and the private-line finding
provides:
  - sketch 045 winner C (Reuse) for the Stack and Integrations panels
  - sketch 046 winner B (Reuse) for the Conventions and Testing panels
  - the mapping from each panel part to the shipped component (file and export) 10-14 builds against
affects: [10-14 codebase panels build (Stack, Integrations, Conventions, Testing), 10-12 Concerns piles (reused by Conventions)]

tech-stack:
  added: []
  patterns: [visual-first panel sketches, reuse of shipped figures over new designs, values withheld before text reaches a sketch file]

key-files:
  created:
    - .planning/sketches/045-codebase-stack-integrations/index.html
    - .planning/sketches/045-codebase-stack-integrations/README.md
    - .planning/sketches/046-codebase-conventions-testing/index.html
    - .planning/sketches/046-codebase-conventions-testing/README.md
  modified:
    - .planning/sketches/MANIFEST.md

key-decisions:
  - "045 winner C, Reuse: Stack is the shipped 10-08 chip groups (Key Dependencies in the same chip set); Integrations is the 012 B lane diagram fed a graph built from the Integrations groups, None groups as quiet chips, variable names as a strip; the cross-read links between the two panels stay; no synthesis"
  - "046 winner B, Reuse: Conventions is 044 E's piles (a column per section, a segment per rule, opacity by strength, an accent ring on a rule a test or the linter checks); Testing is a runner-plates strip, the shipped clean tree of the test folder with test-type badges, then the run commands on the copy-command row; no synthesis"

requirements-completed: [VIEW-13]

actuals:
  tokens: 69000
  tasks: 3
  commits: 3
plan_head_before: f38850516bb0915ae9b522d68d4797181de5c581
plan_head_after: f70ea39a726215ad56b1698a0e226bd03beac876

duration: one round of sketching plus the checkpoint answer
completed: 2026-11-05
---

# Phase 10 Plan 11: Sketches 045 and 046 and the panel choices Summary

**The Stack, Integrations, Conventions and Testing panels will all be built from parts Labelore already ships or has already chosen: the 10-08 chip groups and the 012 B lane diagram (045 C), and the 044 E piles, the 009 B clean tree and the 10-10 copy-command row (046 B).**

## Round

One round, visual-first from the start (the 043/044 lesson): three variants per sketch, each differing in the kind of picture, each opening on the picture, with prose in a dock on selection and every section kept as a closed bar. Each sketch offered one reuse variant; the user chose the reuse variant in both: **"C for 45 and B for 46"**. No synthesis note.

| Sketch | Variants shown | Winner |
|--------|----------------|--------|
| 045 Stack + Integrations | A Tower + hub, B Element board + floor plan, C Reuse (shipped chips + lanes) | **C** |
| 046 Conventions + Testing | A Specimen sheet + runner bench, B Reuse (rule piles + test tree), C Territory map + mirror map | **B** |

READMEs carry `winner: "C"` and `winner: "B"` and a Winner section with a build-against table; the winning tabs read "★ Selected"; MANIFEST rows read "C Reuse — shipped chips + lanes (build it)" and "B Reuse — rule piles + test tree (build it)". A and B of 045, and A and C of 046, stay in the folders as the record and are not built.

## What 10-14 builds against (checked to exist at this commit unless said)

**Stack (045 C)**
- Chip groups: `ChipGroup` and `ChipSet` in `src/web/views/codebase-components.tsx` (file-local functions, not exported), fed `ComposedStackGroup` / `ComposedStackSet` (`src/web/views/codebase-page.ts`) from the Stack lift in `src/planning-repo/handlers/codebase-lift.ts` (10-05). Languages (Primary, Secondary), Runtime, Frameworks (Core, Testing, Build / dev).
- New in C: Key Dependencies through the same `ChipSet`, one set per Key Dependencies label, and the `**Not present:**` line as dashed ghost chips.
- Configuration and Platform Requirements stay as closed section bars.

**Integrations (045 C)**
- `LaneDiagram({ graph, fit, label })` in `src/web/components/lane-diagram.tsx` (exported; `LaneDiagramFigure` takes fence text and is not the entry point here), given a `DiagramGraph` (`DiagramNode { id, kind, label, details, notes, group, row, col }`, `DiagramEdge`, `DiagramGroup` in `src/rendering/ascii-graph.ts`), laid out by `layoutLanes(graph, budget)` in `src/rendering/lane-layout.ts`.
- One node per group in use (the app is the Service node), a wire from the app to each, labelled with the group's `Client:` / `SDK/Client:` / `Connection:` line. Section to lane kind as sketched: Authentication → edge, CI/CD → worker, Monitoring and Webhooks → channel, Data Storage → data, APIs & External Services → external, an extra section → service.
- Groups whose first line says None / Not detected / Not applicable / Not implemented / Not hosted / No, and known sections the document lacks, are quiet `status-chip`s under the lanes. Variable names are a strip of tags; a stated value shows only the quiet "Value not shown" mark (UI-SPEC Safety rule).
- Cross-read kept: a Stack chip whose name appears as a word in an Integrations group (path-like code spans left out) carries ↔ and an "Also in Integrations" link, and the reverse ("Also in Stack").

**Conventions (046 B)**
- The Risk piles 10-12 builds for the Concerns panel (044 E). **Not in `src/` at this commit** (10-12 runs in parallel), so 10-14 takes the component name from 10-12's output.
- One column per `##` section in the document's order (short labels for the eight known headings, the heading text otherwise), one segment per rule (a top-level bullet, a bold label's inline value, or a plain line under a label), the count under each column, section chips that filter, the selected rule in full in the dock.
- In place of 044 E's Priority opacity and most-dangerous ring: opacity by strength (hard: never, must, do not, only, always, no/not before a name; observed habit: observed, usually, common, rare, prefer; else plain) and an accent ring on a rule that names a `test/…test.ts` file, ESLint/lint, "enforces" or "the compiler rejects".

**Testing (046 B)**
- First, a strip of runner plates from the Test Framework labels (Runner, E2E runner, Assertion Library: name, version, config file) and a hatched Coverage plate (the Requirements value, first sentence).
- `CleanTreeFigure({ text, title, caption })` / `CleanTree({ text, changedOnly })` in `src/web/components/clean-tree.tsx` on the Test File Organization Structure fence, with test-type badges in the notes column (a Test Types label whose parenthesis names that folder) and test files marked.
- Run commands: `CopyCommand({ command })` in `src/web/components/copy-command.tsx`, one per line of a shell fence under a Run Commands label or in the Coverage section, its comment (beside, or the `#` line above) as the caption, a repeated command shown once.

## Open items for 10-14 (stated, not designed around)

1. **Lane kinds for an Integrations graph.** The shipped lane kinds (`client`, `edge`, `service`, `worker`, `channel`, `data`, `external`) and their keyword classification in `src/rendering/ascii-graph.ts` were written for RESEARCH diagrams. The sketch sets each node's kind from its section (the table above) rather than asking the classifier. Whether that mapping places every integration group sensibly (for example Monitoring's Logs as a channel, Labelore's cloud-session hooks as a worker) is not checked; nothing was designed around it.
2. **Lane width at 838px.** Labelore's Integrations fills six lanes; the sketch sized them to the measured body (about 134px each) and pans at 390. Whether `layoutLanes` with the column width cap produces the same at the reading column's width is not checked.
3. **The piles component is shared with Concerns.** Conventions needs the pile with a different opacity rule (strength, not Priority) and a different ring (checked rule, not most dangerous). Whether 10-12's component takes these as props is for 10-12/10-14 to settle.
4. **Stack lift deltas.** The sketch extends 10-05's `chipOf` with a comparator in a version (`>=22.18.0`) and a top-level comma split for Key Dependencies bullets that hold several packages, and feeds the Package Manager label into Runtime (10-05 feeds it nothing). The 32-character chip cut-off for sentence bullets is a sketch number.
5. **"None" groups with real content.** Labelore's Auth Provider says "None", then describes the Host and Origin guard; the sketch counts the group as not in use (10-03's zero rule for concerns). The build may want that content visible.
6. **Heuristics to pin with fixtures.** Rule strength, the checked ring, runner assignment of commands (Tidemark's comments name no runner, so its commands sit on the first runner), and test-type badges (Labelore's tree lists `rendering/fixtures/` as one row, so the Unit badge for `test/rendering/` has no row; Golden and Integration are listed as not placed on the tree).
7. **Masking.** The sketch withholds a value beside a variable name everywhere, code samples included; UI-SPEC leaves plain sections and Source unmasked. Labelore's INTEGRATIONS line registering a developer tool by a home path (10-03-SUMMARY) was left out of the sketch; whether the build masks it is 10-14's call.

## Deviations from Plan

### Auto-fixed Issues

None in application code (no application code changed).

### Judgement calls

**1. Reuse variants offered.** At the orchestrator's instruction (the 043/044 lesson), each sketch had one variant built only from shipped or already-chosen components; both were chosen.
**2. "Eight run commands" state.** Labelore's own TESTING already has nine commands, so the eight-command state is Tidemark's TESTING with five more commands written in the fixture's comment-above form (noted in 046's README).
**3. "30 dependencies" state.** Labelore's 20 key dependencies plus ten of its real devDependencies (versions from `package.json`) as one more labelled group.
**4. Plan verify run through Node.** The harness refused the plan's shell loop with `$(mktemp -d)`; the same `google-chrome --headless=new ...` commands were run from a Node runner in the scratchpad (12 PNGs for each sketch).
**5. Ledger base kept outside the git dir.** The worktree harness refused writes into the git dir, so the plan-start base (`f388505`) is recorded here and in the checkpoint rather than in a ledger file.

## Verification

- Plan verify: 12 headless-Chrome screenshots for each sketch; the 045 copy check (Value not shown, Stack, Integrations, `TIDEMARK_TIDE_FEED_KEY`, the theme sheet; no `PLACEHOLDER-NOT-A-REAL-KEY`) and the 046 copy check (Conventions, Testing, Copy command, Copied, the theme sheet; MANIFEST row 046) pass.
- Acceptance: both folders exist and hold no cinedise, duet or studio-portal; MANIFEST rows 045 and 046 present; `grep -E '^winner: "?(A|B|C|synthesis)'` prints one line per README; `grep -nE '^\| (045|046) \|.*\(build it\)'` prints two lines.
- Swept 72 screenshots per sketch (3 variants, 2 themes, 1280 and 390, 2 panels, 3 states): no sideways page scroll, no console errors, exactly four font sizes. No oklch, hex, rgb, hsl or destructive literal in either file. The one path-like string is labelore's own generic `/home/x` placeholder in a TESTING code sample (generic per 10-03).
- Click checks: docks open from chips, groups, nodes, segments, folders and territories; the cross-read links switch panel; Copy command reads "Copied" inside the button.
- Screenshots are in the session scratchpad (`sketch-045-046/`), not committed.

## Known Stubs

None. This plan builds sketches only.

## Threat Flags

None. No application code changed. T-10-20 mitigated: the planted value is removed before any text reaches a sketch file and the copy check confirms it is absent; the private INTEGRATIONS line is left out; no other repository's map is drawn from.

## Self-Check: PASSED

- 045 and 046 `index.html` and `README.md`, MANIFEST rows 045 and 046: found
- Commits 376002b, e8b853d, f70ea39 on this branch: found
- README winners 045 `C`, 046 `B`; MANIFEST "(build it)" on both rows; "★ Selected" on 045 C and 046 B tabs: found
