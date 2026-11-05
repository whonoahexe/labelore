---
phase: 10-codebase-map-specification-and-check-pages
plan: 14
subsystem: codebase-page
tags: [stack, integrations, conventions, testing, withheld-values, lane-diagram, risk-piles, copy-command, sketch-045-C, sketch-046-B, phase-10]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: 10-05 lifts, 10-08 frame and chip groups, 10-10 copy-command row, 10-11 winners (045 C, 046 B), 10-12 piles and mention resolver
provides:
  - withholdValue, withholdInText and stripControlCharacters (one place where a variable value is dropped and a run command is cleaned)
  - liftIntegrations, liftConventions, liftTesting, and Key Dependencies in liftStack
  - StackPanel, IntegrationsPanel, ConventionsPanel, TestingPanel (all seven Codebase panels now designed)
  - one shared pile picture (PilePicture, PileChips) used by Concerns and Conventions
  - the Stack and Integrations cross-read on the page context (`context.cross`)
affects: [10-19 USER-SETUP (reuses withholdValue), 10-23 browser spec]

actuals:
  tokens: 150000
  tasks: 3
  commits: 7
plan_head_before: fdc929dbd43bfd010b00e5212da98f7074668881
plan_head_after: 222acb81536d4e7950bd8c51ba068efdc8ae2f95
commits: 7

key-files:
  created:
    - src/planning-repo/handlers/withhold-values.ts
    - test/withhold-values.test.ts
  modified:
    - src/planning-repo/handlers/codebase-lift.ts
    - src/presentation/codebase-map.ts
    - src/web/views/codebase-page.ts
    - src/web/views/codebase-components.tsx
    - src/web/components/clean-tree.tsx
    - src/web/components/copy-command.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/codebase-lift.test.ts
    - test/codebase-handler.test.ts
    - test/presentation/codebase-map.test.ts
    - test/web/codebase-page.test.ts

key-decisions:
  - "A variable value is withheld in the lift, never in the page: the lift stores a name and `hadValue`; `withholdInText` cleans every line the lift keeps; a `NAME: value` line is read as the name alone (the remainder is the value, as the plan words it)"
  - "The Environment Configuration section is drawn by the Integrations panel (names as tags, its other lines cleaned) only when it holds nothing the panel cannot draw (no fence, no table); otherwise it stays a plain section as written (UI-SPEC section 2)"
  - "The lane kind comes from the group's section, not from the shared keyword classifier (the user's 045 C decision); the app is layer one and every group layer two, so the shipped layout draws a fan out of the app"
  - "Conventions reuses the Concerns piles through one PilePicture that takes each mark's opacity step and ring from the caller; no second copy"
  - "Configuration and Platform Requirements stay plain sections (no line-list lift): nothing in them is dropped"

requirements-completed: [VIEW-13]

duration: about 3h
completed: 2026-11-05
---

# Phase 10 Plan 14: Stack, Integrations, Conventions and Testing panels Summary

**The last four Codebase panels are built from shipped parts: Stack is the 10-08 chip groups plus Key Dependencies in the same chip set; Integrations is the shipped lane diagram fed a graph built from the groups, with variable names as tags and values never held; Conventions is the Concerns piles with a rule-strength opacity and a checked ring; Testing is a strip of runner plates, the shipped clean tree with test-type chips, and each run command on the shared copy row.**

## What was built

- **`withhold-values.ts`.** `withholdValue(text)` gives `{ name, hadValue }` for an upper-snake token (backticked or not) followed by `=` or `: ` and a remainder that is not a bracketed placeholder; it never returns the remainder. `withholdInText` cleans a longer line (`` `NAME=value` ``, `` `NAME`=value ``, a bare `NAME=value` word, a leading `NAME: value`). `stripControlCharacters` removes C0, C1, DEL and bidirectional override characters (a tab stays).
- **Lifts.** Stack gains `keyDependencies` (sets by bold label, a bullet split at its top-level commas, a purpose, at most 80) and `notPresent`. `liftIntegrations` gives groups (rows with service, use, client, credential variable as a name), `inUse`, variables with `hadValue` and kind, the Environment section as names and cleaned lines (`whole` when the panel may draw it), and the known sections the document lacks. `liftConventions` gives a group per `##` section with its rules (20 groups, 30 rules, 400 characters). `liftTesting` gives runner plates (name, version, config), the Coverage requirement, run commands (comment beside or above as the caption, quotes honoured, repeats shown once, control characters removed), the Test File Organization tree and the Test Types with the folders they name. A line that names a path under a home folder is left out of the Integrations lift.
- **Context.** `CodebasePanelEntry.keyLabel` (Testing's key is the framework name) and `CodebaseContext.cross` (the stack's tool names and the integration groups' cleaned lines, only on those two panels) for the cross-read.
- **Panels.** `StackPanel` (picture frame, chips, ghosts, "+N notes", the cross-read arrow); `IntegrationsPanel` (shipped `LaneDiagram`, quiet chips, name tags with the dashed "Value not shown" mark, the Environment section's own lines, "Also in Stack" links); `ConventionsPanel` (shared piles, dock, chips at every width); `TestingPanel` (plates, `CleanTreeFigure` with a `labels` prop for test-type chips, "Test types with no folder on this tree", `CopyCommand` rows with captions).
- **Shared piles.** The Concerns picture was extracted into `PilePicture` and `PileChips`; each panel supplies the opacity step (`pri`) and the ring per mark. The Concerns markup is unchanged.

## Deviations from Plan (the user's decisions supersede the plan)

1. **[User decision 045 C, 046 B] No variant letters, no dock.** The plan names a "winner" and a screenshot against it; the panels are built from the reuse variants recorded in 10-11-SUMMARY. The sketches' selection docks and closed section bars are not built: every section stays as an open plain section below, as on the Architecture and Structure panels (10-12); Concerns keeps its bars. The Conventions panel keeps the dock for a selected rule.
2. **[User decision 045 C] Configuration and Platform Requirements are not lifted.** The plan's "short line lists (40 lines, 400 characters)" are not built; both stay plain sections as written. Likewise Key Dependencies chips drop the purpose into the chip title and the whole section stays plain below, so nothing is lost.
3. **[User decision 046 B] `runCommands` are `{ command, caption }`, not `string[]`.** 046 B shows each comment as the caption. Runner assignment per command (a 046 A idea) is not built: B lists commands in their own frame.
4. **[Rule 1] Pinned tests updated for the new shapes.** `test/codebase-handler.test.ts` "never ships a section body" now asserts the value is absent and the name is present (the plan lifts names); `test/presentation/codebase-map.test.ts` pins the context's keys, which now include `cross`; the Stack empty-lift case gained the two new fields; the Testing key text is now "Vitest", not none; "lifts nothing for a panel with no designed form yet" now plants a record with no conventions lift.
5. **[Rule 2] `withholdInText` on every line the Integrations lift keeps.** A first pass of the plan's own tests found that `NAME: value` and `` `NAME`=value `` leaked through a prose line; both are now cut, with tests for each place a name can sit (backticked, bare, colon, sub-bullet, group bullet, auth line).
6. **[Rule 3] Shared components touched.** `CleanTree`/`CleanTreeFigure` gained an optional `labels` prop (folder path to chips); `copy-command.tsx`'s comment no longer says only constant commands are copied (the Testing rows copy document text with control characters removed; design-language says so).
7. **Plan Task 3 step 5 and the service restart.** Not run, per the dispatch: `systemctl --user restart labelore`, the Playwright suite. Shots were taken on an isolated server. The plan's "two other repositories" were shot by hand from temporary copies of `cinedise-portal` and `duet` `.planning/codebase` folders (scratchpad only, never committed); no value showed beside a variable name and no sideways scroll at 390.
8. **Stack lift deltas (10-11 open item 4).** The Package Manager label still feeds nothing (pinned by 10-05); the comparator in a version was already read. The 32-character cut-off and the name-and-version recovery (`Node.js >=22.18.0 (...)`) are done in the composer, so the head and 10-05's pins are unchanged.

## 10-11 open items

1. **Lane kinds.** Set from the section. Checked on labelore's real INTEGRATIONS: Remote project source and Git land in External; Project data, App settings, File Storage and Caching in Data; Logs in Channel; Secrets handling (Authentication) in Edge; Cloud-session hooks in Worker. Sensible, with one reading to judge: Secrets handling sits in Edge only because its section is Authentication & Identity. Tidemark: Tide data and Messaging in External, Databases and File Storage in Data, Outgoing in Channel.
2. **Lane width.** Six lanes at the shipped minimum node width are a little wider than the 838px column (about 864px), so the lanes scale to the frame from 42rem up and pan inside it below that (a state the sketch drew at fixed 134px).
3. **Piles shared.** Done: one `PilePicture`, per-mark `pri` and `ring`.
4. **Stack deltas.** See deviation 8.
5. **"None" groups with content.** Labelore's Auth Provider ("None", then the Host and Origin guard) is a quiet chip with its first line as the title; the rest is in the plain section below.
6. **Heuristics pinned with fixtures.** Strength and checked ring: `it.each` tables in `test/web/codebase-page.test.ts`, plus Tidemark's counts (22 rules, 6 hard, 1 checked). Test-type badges: a fixture tree with `test/rendering/` and `test/server/`. Run-command parsing: comment beside and above, quotes, repeats, `$ ` prompt, control characters, caps.
7. **Masking.** Values are withheld wherever the lift keeps text. The plain sections are the document as written (UI-SPEC section 2): labelore's INTEGRATIONS registers a developer tool by a home path, and that line is left out of the lifted rows and lanes but still shows in the MCP paragraph of the plain Integrations section below. Not masked there; recorded for 10-19-SUMMARY with T-10-25.

## Open question left to the user (not decided)

Lanes versus "Shown as drawn": the Integrations lanes use the shipped diagram with no "Shown as drawn" toggle (there is no author drawing to show). The Architecture panel's lane diagram (10-12) still defaults to the lane view, with ProjectRegistry and "Parsing core" in Data and three route boxes merged on Tidemark. Whether codebase diagrams should default to "Shown as drawn" is unchanged.

## Side by side (sketch left, build right)

Shots at 1280 and 390, light and dark, labelore's own map (TESTING 302 lines) and Tidemark, in `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/build-10-14/`: `sbs/{panel}-{labelore|tidemark}-{1280|390}-{light|dark}-side-by-side.png` (32 composites), the build shots in `shots/` (Tidemark) and `labelore/`, the sketch shots in `sketches/`, the two other repositories in `other-shots-cinedise-portal/` and `other-shots-duet/`. Differences, fixed or left:

1. **Fixed: lanes cut at the right edge** (six lanes wider than the frame): fit to the frame from 42rem up.
2. **Fixed: chips stretched tall** in the second and third chip set of a row (the grid stretched the set): chips keep their height.
3. **Fixed: Conventions** drew a tone square under each column and hid its chips at 1280; the sketch has neither.
4. **Fixed: Testing commands** filled the row; they now size to their text as in the sketch.
5. **Left: the app node** sits above the lanes with the shipped fan-out layout; the sketch put it mid-lane on a hand-laid grid, and calls it by the project name ("This app" here: the page has no project name).
6. **Left: the selection dock and closed section bars** (sketch) against open plain sections (build), see deviation 1.
7. **Left: key numbers.** Integrations reads 9 (groups in use) where the sketch said 3; Conventions 12 groups where the sketch said 8 (the build counts every `##` section); rules 108 with 30 hard and 17 checked against the sketch's 112, 31 and 16 (the sketch's strength words were looser: it counted `refuse`, `reject` and a bare "no" as hard).
8. **Left: file rows and glob folders** carry no test-type chip (`test/*.test.ts` has no row); Golden and Integration are listed as having no folder on the tree.
9. **Left: Runtime chips.** The sketch fed the Package Manager into Runtime (`npm`, `.npmrc sets loglevel`); the build does not (10-05 pin).
10. **Left: chip sentences** the sketch showed as chips ("Module system: ESM only") are "+1 note" chips; the full line is in the section below.
11. **Left: page chrome, titles and keys**: the sketch's bar and shell, "Lanes by kind, as shipped" against "What the code talks to", and the panel key "Vitest framework" against "Vitest".

No page error, no second h1 and no sideways scroll at 390 on any shot (`shoot-pages` printed no FAIL line). The helper's `--sketch` option clicks the first `[data-variant]` element, which is a hidden section on these two sketches, so it times out; the sketch shots came from a scratchpad script that loads the sketch with `?panel=&state=&theme=#c|b` instead.

## Verification

- `npm run test:gate -- test`: `gate: total=5798 passed=5798 failed=0 skipped=0 todo=0` (base 5705). `npm run typecheck`, `npm run lint`, `npm run build`: exit 0.
- RED before GREEN: `82da0d8` (13 withhold tests, module absent) before `cdf8d05`; Task 2's lift and panel tests were written against the finished lift and caught two leaks (deviation 5) before the commit.
- `node src/cli/snapshot.ts test/fixtures/tidemark` holds no `PLACEHOLDER-NOT-A-REAL-KEY` (0 matches). The page test renders the Integrations panel with and without the plain sections and finds the value in neither the text nor any attribute.
- Growth: `withholdValue` on a long run of capitals and a long value stays linear.

## Known Stubs

None.

## Threat Flags

None new. T-10-24 mitigated (names only in the lift, tests assert the value is absent from structured, markup, titles and aria-labels); T-10-26 mitigated (the lift and the composer both strip control and bidirectional characters, and the row's copied text is the shown text); T-10-25 accepted and recorded (plain sections and Source show the document as written, home-path line included).

## Self-Check: PASSED

- Commits 4d01c04, 82da0d8, cdf8d05, ce3df24, 97e2a12, 222acb8 are ancestors of HEAD.
- `withhold-values.ts`, `test/withhold-values.test.ts`, `StackPanel`, `IntegrationsPanel`, `ConventionsPanel`, `TestingPanel`, `CopyCommand` in `codebase-components.tsx`: found.
- STATE.md and ROADMAP.md untouched.
