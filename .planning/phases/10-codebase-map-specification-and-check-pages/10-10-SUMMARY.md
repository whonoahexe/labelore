---
phase: 10-codebase-map-specification-and-check-pages
plan: 10
subsystem: codebase-page
tags: [mapped-not-started, head, next-step, copy-command, sketch-042-A, phase-10]
status: complete

requires:
  - phase: 10-08
    provides: Codebase page frame (rail, panel list, composer), the facts line, the view-codebase CSS block
  - phase: 10-05
    provides: structured.codebase Stack chips and Concerns counts (the head reads them, parses nothing new)
  - phase: 10-06
    provides: sketch 042 winner A, four font sizes, the open points the head follows
provides:
  - the "Mapped, not started" head over the Codebase panels of a map-only project (dashboard address and every /codebase/{doc})
  - nextStep(), hasPlanningDocCandidates(), four constant next steps (GSD's rules as UI-SPEC section 3 narrows them)
  - the shared copy-command component (CopyCommand, CopyCommandView) with in-button confirmation
affects: [10-14 Testing panel run commands, Phase 11 onboarding page (both reuse copy-command), 10-23 browser spec]

actuals:
  tokens: 17300
  tasks: 3
  commits: 4
plan_head_before: 8b784c72631def4fa543076c758fdbf373ba8bc3
plan_head_after: f1ad8c1b1856eb795949ce46394a8f1ec29b2a80
commits: 4

key-files:
  created:
    - src/web/components/copy-command.tsx
    - test/web/copy-command.test.ts
  modified:
    - src/presentation/codebase-map.ts
    - src/web/views/codebase-page.ts
    - src/web/views/codebase-components.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/presentation/codebase-map.test.ts
    - test/web/codebase-page.test.ts

key-decisions:
  - "The head sits in the reading column above the panel, as sketch 042 A draws it; the facts line (readiness chip, date, commit) and the seven-entry list stay in the rail, so nothing is rendered twice. Under 62rem the order is head, facts and entries, panel (the sketch's own order)"
  - "Head concern labels are short (Security, Tech debt, Known bugs, Performance, Fragile areas, Scaling limits, Dependencies at risk, Missing features, Test coverage gaps) with the document's heading as the title; the panel keeps the headings (10-06 open point 1). A section the table does not know keeps its heading"
  - "Concern ordering (Security first, a missing known section as 0, total) moved into one shared concernEntries() in codebase-map.ts that the panel and the head both use"
  - "The head's Stack chips are a glance: 4 languages, 3 runtime, 3 core + 1 testing + 1 build-dev frameworks (the sketch's own subset); the Stack panel holds them all"
  - "The head drops lifted bullets that are sentences (name over 28 characters) and trims a long version to its first word; a long bullet the lift could not split ('Node.js >=22.18.0 (engines in package.json)') is a name and version when its second word starts like a version"
  - "Stack chips in the head reuse the page's view-codebase-chip (the sketch's chip-plain, mono, version muted) rather than a status-chip: that is what the winner draws and what 10-08 already built"
  - "Copy confirmation is in the button (C2): 'Copied' with a Check icon for 1.5 s and an sr-only role=status; the shared Toast is untouched"
  - "copy-command is a shared name: three rows in design-language.md (copy-command, copy-command-text, copy-command-button) and one CSS block after the phase-10-codebase block"

requirements-completed: [TGT-09, VIEW-13]

duration: about 1h
completed: 2026-11-04
---

# Phase 10 Plan 10: The "Mapped, not started" head Summary

**A map-only project opens on a bordered head over the Codebase panels (the sentence, the stack with versions, concern counts Security first with short labels, and GSD's next step as a selectable mono command with a Copy command button that confirms in place), built from sketch 042's winner A and checked beside it at 1280 and 390 in both themes.**

## What was built

- **Server (`codebase-map.ts`).** `CodebaseContext.head` is `{ stack, concerns, nextStep }` for a map-only project and `null` otherwise; it reads the Stack and Concerns lifts already on the presentation. `nextStep(readiness, hasDocCandidates)` returns one of four frozen constant steps (`NEXT_STEPS`) with the UI-SPEC reason lines verbatim: fast and partial go to `/gsd-map-codebase`, complete goes to `/gsd-ingest-docs` or `/gsd-new-project`; "The map is complete" is only the last; `--fast` is never produced; an unknown readiness falls to the partial step. `hasPlanningDocCandidates(artifacts)` is GSD's name and segment rules by character scan.
- **Composer (`codebase-page.ts`).** `MAPPED_NOT_STARTED`, `MAPPED_NOT_STARTED_LEAD`, `NEVER_RUNS_NOTE` as exported constants; `ComposedCodebase.head` with `eyebrow`, `lead`, `stack` sets, `concerns` rows (short label, heading title, tone: Security in-flight above zero, a zero quiet, others untoned) and `next`.
- **Components.** `Head` above the panel in `.view-codebase-main`; `codebaseHeaderProps` makes the eyebrow "Mapped, not started" when there is a head (the h1 stays "Codebase"). `ChipSet` and `Concerns` are shared by the head and the panel. The same page serves the dashboard address and every `/codebase/{doc}`, so the head never disappears while moving between panels.
- **copy-command.** `CopyCommandView` (static: code outside the button, `aria-label="Copy command: {command}"`, label "Copy command" or "Copied" + Check, sr-only status) and `CopyCommand` (state, 1.5 s timer). `copyCommandToClipboard(command, copy = copyText)` writes exactly the command. The file imports no api module and has no `fetch`.
- **CSS and docs.** Head block and next-step rule inside the one `phase-10-codebase` block; a `copy-command` block after it (tokens only, `--space-10` hit area on a coarse pointer). design-language.md: three shared-vocabulary rows and two Language bullets (the head; confirmation in the button, not a toast), plus the eyebrow exception on the Codebase page bullet.

## UI-SPEC open item 2: what "ADR / PRD / SPEC documents exist" means

Markdown inside `.planning/` outside `codebase/` (artifact paths starting `.planning/`), by GSD's `isPlanningDocCandidate` name and segment rules: the file name holds ADR, PRD, SPEC or RFC as a whole token (a `-`, `_` or space before it, a `-`, `_`, space or `.` after it, case-insensitive), or starts with four digits and a `-` or `_`, or a directory segment is `adr`, `adrs`, `prd`, `prds`, `spec`, `specs`, `rfc` or `rfcs`. Excluded: `REQUIREMENTS.md` (ordinary GSD file), a phase's `NN-SPEC.md` (digits and dots before `-SPEC.md`), anything under `codebase/`, non-markdown, and any path outside `.planning/` (Labelore cannot see `docs/`). Pinned: `adr/0001-store.md`, `docs/PRD-loans.md` and `2026-10-decision.md` are candidates; `REQUIREMENTS.md`, `codebase/SPECIAL.md`, `phases/01-x/01-SPEC.md`, `notes/spectrum.md` and Tidemark's `CHANGELOG-2026-10.md` are not. This is the RESEARCH A6 reading.

## Verification

- Full gate: `gate: total=5657 passed=5657 failed=0 skipped=0 todo=0` (base 5619; the 38 new tests are in codebase-map, codebase-page and copy-command).
- `npm run typecheck`, `npm run lint`, `npm run build`: exit 0.
- RED before GREEN on Task 2: commit `1dbccb4` had 14 failing tests before `fb3bed8`.
- Measured in the rendered page on all five cases below, 1280 and 390, light and dark: exactly four font sizes (11.2, 13.12, 20.8px and the h1 76.8px at 1280 or 44.8px at 390), one h1, no sideways scroll, no page error. At 390 the document order is head (top 425), facts/entries (1170), panel (1642) on Tidemark.
- Not run, as instructed: the Playwright e2e suite and `systemctl --user restart labelore` (the plan's Task 2 and Task 3 verify steps end with the restart; the orchestrator restarts after merge). `/gsd-ingest-docs`, `/gsd-map-codebase` and `/gsd-new-project` were seen on the right cases (below). The click-counts-requests browser check is 10-23's.

## Side-by-side against sketch 042 A

Sketch left, build right, same width and theme; PNGs in `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/build-10-10/` named `{case}-{width}-{theme}-side-by-side.png` (with `-sketch.png` and `-build.png` beside them, 60 PNGs; the first tracer shots are under `t1/`). Cases: `tidemark` (complete map, `/gsd-new-project`, vs the sketch's "Map only, complete"), `fast` (Tidemark minus CONVENTIONS, TESTING, CONCERNS, `/gsd-map-codebase` with the fast reason, vs "Map only, fast"), `partial` (Tidemark with only STACK and INTEGRATIONS, vs "Map only, partial" which draws three other documents), `ingest` (Tidemark plus `.planning/adr/0001-store.md`, `/gsd-ingest-docs`, vs "Map only, with ADRs"), and `labelore` (labelore's own fresh `.planning/codebase` copied alone into a scratch project, the hardest real map; compared with the complete state). The driver is `.../build-10-10/side-by-side.mjs`; servers ran on ports 4191 to 4194 over isolated settings directories.

Matches the layout contract: head block at the top of the reading column (838px at 1280, 62rem single column below), sentence at Heading size capped at 36ch, stack and concerns in two columns at 1280 and one column under 62rem, concern rows with Security first and a dashed square for a zero, next step under a rule with the reason in Meta, a wrapping mono command in a muted box with the Copy command button on its row, the quiet never-runs note, eyebrow "Mapped, not started" over the h1, ghost entries dashed with "Not mapped" on the fast and partial copies, and at 390 the head before the facts and bars.

Differences seen, and what became of them:

1. **Fixed: concern rows stretched to the stack column's height** (labelore's long stack made the counts spread out in the right column). The two columns now `align-items: start`.
2. **Fixed: the real map's Stack lift holds sentences as chips** ("Module system: ESM only (...)", "TypeScript sources execute directly via Node's native type stripping...", "shadcn 4.19.0 (devDependency) with style base-sera, ..."), which made the head's stack column taller than the whole concerns block and, at 390, a wall of boxed text. The head now keeps named tools only (name over 28 characters is dropped unless its second word starts like a version, in which case it splits into name and version; a long version keeps its first word). The Stack panel still shows every lifted chip, so those sentences are one click away; this is the 10-05 lift's output, not changed here.
3. **Fixed: Copy command icon** was 12px (the extra-small button's rule) against the sketch's 16px, making the button about 10px narrower; `.copy-command-button svg` now uses `--space-4`.
4. **Left: head stack contents differ from the sketch** because the data differs (Tidemark's languages, runtime and frameworks; labelore's chips after the filter, so its Runtime reads "Node.js ≥22.18.0" and "Vite 8" where the sketch reads "Node.js ≥22.18.0" and "ESM only"). Version text keeps the lift's own form.
5. **Left: counts differ** (Tidemark 14 concerns, labelore 30, the sketch's 30 is labelore's) and Tidemark has two zero rows the sketch's complete state does not, drawn as the dashed square it specifies for zero.
6. **Left: partial case** shows the fast-style head with `/gsd-map-codebase` and the partial reason; the sketch's partial state maps STACK, ARCHITECTURE and CONVENTIONS and has no stack chips from INTEGRATIONS, so the document list differs by construction (the plan's partial copy has STACK and INTEGRATIONS only).
7. **Left: header chrome** (10-08's differences 6 and 9): the copy-path control is a link glyph above View / Source rather than a boxed icon beside them, breadcrumbs read "Dashboard / Codebase", and a map-only header holds only Dashboard while the sketch draws Dashboard and Search. The commit and date in the facts line come from each project's own map, not the sketch's.
8. **Left: the head shows the date, commit and readiness in the rail**, not inside the head block, exactly as the sketch draws (the plan's truth lists them as head content; the sketch's A keeps them in the rail so nothing is rendered twice).
9. **Left: chip surface** is `--code-veil` with a hairline border, as 10-08's `view-codebase-chip` renders the sketch's `chip-plain`; the plan said untoned `status-chip`s, which would be a different box than the sketch (see deviations).

Dark and light parity held on every case; no sideways scroll at 390 on any of the ten 390 shots.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Freshness-claim test matched the new `head` key**
- **Found during:** Task 1
- **Issue:** `test/presentation/codebase-map.test.ts` pinned `CodebaseContext`'s exact keys and rejected any key matching `/head/` (meant to catch a git-HEAD comparison). The plan's `head` field (the map-only head's content) fails it by name.
- **Fix:** `head` added to the pinned key list; the regex keeps `fresh|stale|current|behind`; a comment says `head` is content, not a git HEAD.
- **Files modified:** test/presentation/codebase-map.test.ts
- **Commit:** 75307d2

**2. [Rule 1 - Bug] Head content too tall on a real map**
- **Found during:** Task 3 side-by-side
- **Issue:** see differences 1 and 2 above (stretched concern rows; sentences as chips).
- **Fix:** `align-items: start` on the head columns; the named-tools filter in the composer, with tests.
- **Files modified:** src/web/styles/globals.css, src/web/views/codebase-page.ts, test/web/codebase-page.test.ts
- **Commit:** f1ad8c1

### Plan interpretation

**3. The head's stack chips reuse `view-codebase-chip`, not `status-chip`.** The plan says "untoned status-chips with the version in mono"; sketch 042 A draws a mono chip with a muted version (`chip-plain`), which 10-08 built as `view-codebase-chip`. The user's rule is to build as drawn, so the existing chip is used and the head and the Stack panel read the same.

**4. The readiness chip, date and commit stay in the rail.** The plan's truth lists them among the head's items; the winner draws them in the rail's facts line (the head holds the sentence, stack, concerns and next step), and nothing is rendered twice (D-05).

**5. The plan's `ComposedCodebase.head` "facts already composed"** are therefore not duplicated in `head`; `ComposedCodebase.facts` still carries them.

**6. "Loading nav" truth (mounts inside the opening body while the project loads).** This plan changed nothing there: the head is part of the document page 10-01's dashboard outcome already opens, which renders only after the project loads; the existing opening body shows until then. Not separately exercised here (10-23's browser spec covers opening from the switcher, scan and CLI).

**7. Service restart and e2e skipped** per the dispatch; `npm run build` ran and passed.

### Environment

- The worktree had no `node_modules`; a git-ignored directory of per-entry symlinks to the main checkout's was used. No package installed.
- The per-plan HEAD ledger was written (`plan_head_before` is the dispatch base 8b784c7); `commits: 4` measured with `git rev-list --count 8b784c7..HEAD` before this summary commit.

## Authentication gates

None.

## Known Stubs

None. The head's stack and concerns are the real lifts; panels beyond Stack and Concerns still render plain sections (10-08's recorded state, unchanged here).

## Threat Flags

None new. T-10-17 mitigated: the command is one of four frozen constants chosen by readiness and a boolean (`NEXT_STEPS`, asserted for every input), and `copyCommandToClipboard` writes exactly its argument (asserted per constant). T-10-18 mitigated: `copy-command.tsx` imports no api module and contains no `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` or `EventSource` (source-contract tests in both copy-command.test.ts and codebase-page.test.ts); nothing runs the command. T-10-19 mitigated: chip text, concern labels and the command render as React text (`ResearchInline`, and a test that markup in a command renders escaped); no raw-HTML prop (existing contract test).

## Self-Check: PASSED

- Created files found: src/web/components/copy-command.tsx, test/web/copy-command.test.ts
- Commits 75307d2, 1dbccb4, fb3bed8 and f1ad8c1 are ancestors of HEAD
- Acceptance greps: "Mapped, not started" and the lead sentence in src/web/views/codebase-page.ts (1 each), `copy-command` in docs/design-language.md (rows and bullets), "Labelore does not run commands. Paste it in your terminal." in src/web/views/codebase-page.ts
