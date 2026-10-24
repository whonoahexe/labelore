---
phase: quick-260923-lju
plan: 01
subsystem: ui
tags: [react, view-registry, markdown-parsing, playwright, design-tokens]

requires:
  - phase: 05-per-type-document-views
    provides: the view registry (ViewManifest/composeView), document-section grouping, and the docs/design-language.md class-vocabulary allowlist this plan builds a fourth manifest hook onto
provides:
  - A server-side CONTEXT.md brief projection (extractContextBrief) over splitSections/splitSubsections/parseMarkdownTable
  - A pure composer (composeContextBrief) and React view (ContextBriefView) implementing sketch-006 D1 — boundary hero, out-strip, boundary notes, amber open-questions panel, continuous decision register with tagged "Claude decides" notes, ideas panels, and a single closed "More" disclosure
  - ArtifactHeader's optional meta prop and .artifact-meta-row, reused by any future view
  - A fix to artifactTokenOf so typed handlers (not just kind labeling) actually engage for archived quick-task files under milestones/vX.Y-quick/
affects: [context-view, artifact-token-dispatch, playwright-e2e-harness]

actuals:
  tokens: 41972
  tasks: 3
  commits: 3
  plan_head_before: 386e492a4026b5180c086180beb8ccda07dc8592

tech-stack:
  added: []
  patterns:
    - "brief manifest hook: ViewManifest gains an optional brief(input) => ComposedX alongside promote/layout, so a fourth view shape (D1) can exist without a new artifact-page.tsx branch"
    - "tokenizeInline: a single left-to-right scan (code/strong/em/ref/text) is the only path a brief string reaches the DOM through — no dangerouslySetInnerHTML for structured content"
    - "topSections(): splitSections() results clipped at each section's own closing tag line, so the last tag-wrapped ## section in a CONTEXT.md never leaks trailing document footer into its body"
    - "corpus guard verified against source, not the extractor's own output: every pinned decision/note/open count in context-brief-corpus.test.ts was independently confirmed via grep -c '^- \\*\\*D-[0-9]' before being pinned"

key-files:
  created:
    - src/planning-repo/handlers/context-brief.ts
    - src/web/views/context-brief.ts
    - src/web/views/context-brief-components.tsx
    - src/web/views/inline-markdown.ts
    - test/context-brief.test.ts
    - test/web/context-brief.test.ts
    - test/web/context-brief-corpus.test.ts
    - test/web/inline-markdown.test.ts
    - test/web/caution-contrast.test.ts
    - test/e2e/context-brief.spec.ts
  modified:
    - src/planning-repo/handlers/context.ts
    - src/planning-repo/handlers/artifact-token.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/components/artifact-header.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - playwright.config.ts
    - test/e2e/measure.ts
    - test/web/visual-contract.test.ts
    - eslint.config.js

key-decisions:
  - "D-01: The composer's discretion-to-decision tagging attaches an item to the FIRST D-NN it names, only when a register row carries that tag — implemented literally per the plan's own stated rule, verified correct against SP 01 (3 attached, 2 loose) and LB v1.1/05 (4 attached, 3 loose) via e2e."
  - "D-02: A bullet only opens a new decision at column 0 — a nested (indented) sub-bullet folds into the parent decision's own detail rather than spawning a phantom sibling entry. Found via the corpus guard (SP02/LB01/jxp overcounted decisions by exactly their nested-bullet count before this fix)."
  - "D-03: OPEN_QUESTIONS_HEADING_RE is anchored to the start of the heading (^open questions?\\b), not a bare substring test — SP 03's <resolved_open_question> heading ('The STATE.md open question is already answered') legitimately contains the phrase without being an open-questions panel."
  - "D-04: artifactTokenOf() now also checks location === 'milestone-root' (parseQuickArtifactName) — archived quick tasks under milestones/vX.Y-quick/ have no dedicated ArtifactLocation in discovery.ts's classify(), so typed handlers never engaged for them before this fix, even though deriveKind() already labeled their wire kind correctly."
  - "D-05: The visual-contract canvas test's positive max-width: 70rem assertion is replaced with negative assertions (no max-width, no padding) — resolving quick-260923-jxp's own deferred pre-existing-failure item against commit 082a834's already-intentional full-width contract."

requirements-completed: [LJU-01, LJU-02, LJU-03, LJU-04, LJU-05, LJU-06, LJU-07, LJU-08, LJU-09]

coverage:
  - id: D1
    description: "Server-side brief projection (extractContextBrief) reads a CONTEXT.md body into boundary/decisions/openQuestions/discretion/specifics/deferred, wired into ContextHandler.parse behind a try/catch"
    requirement: LJU-01
    verification:
      - kind: unit
        ref: "test/context-brief.test.ts (SP phases/01 boundary/decisions/open-questions/discretion, LB v1.1/05 prose boundary, firstSentence, ReDoS timing guard)"
        status: pass
      - kind: unit
        ref: "test/web/context-brief-corpus.test.ts (57 tests across 19 real CONTEXT.md files — pinned counts + word-coverage guard)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Intro via ArtifactHeader's meta prop: eyebrow, status chip, Covers note, copy-path button"
    requirement: LJU-02
    verification:
      - kind: e2e
        ref: "test/e2e/context-brief.spec.ts#the artifact-meta-row holds a status chip and the copy-path button"
        status: pass
    human_judgment: false
  - id: D3
    description: "Boundary hero (statement, In card or rest prose, stats) and quiet out-strip"
    requirement: LJU-03
    verification:
      - kind: e2e
        ref: "test/e2e/context-brief.spec.ts#renders the D1 brief ... quiet out-strip ... ; #LB v1.0/01 label-prose out"
        status: pass
    human_judgment: false
  - id: D4
    description: "Amber open-questions panel with blocks-D-NN jump chips that expand and focus the target decision"
    requirement: LJU-04
    verification:
      - kind: e2e
        ref: "test/e2e/context-brief.spec.ts#SP 01: attention panel with 3 rows; clicking a blocks-D chip jumps to and expands the decision"
        status: pass
    human_judgment: false
  - id: D5
    description: "Continuous decision register: sticky area column, tag gutter, click-to-open detail + reversibility"
    requirement: LJU-05
    verification:
      - kind: e2e
        ref: "test/e2e/context-brief.spec.ts#renders the D1 brief ... full register with click-to-open"
        status: pass
    human_judgment: false
  - id: D6
    description: "Claude's-discretion items tagged into their decision as a 'Claude decides' note; leftovers in an 'Also left to Claude' panel"
    requirement: LJU-06
    verification:
      - kind: e2e
        ref: "test/e2e/context-brief.spec.ts#the \"decisions locked\" stat focuses the first decision row, and 4 discretion notes sit under decisions"
        status: pass
    human_judgment: false
  - id: D7
    description: "Specific/deferred idea panels, unrecognised-section extras, and the single closed More disclosure (never an endnotes sheet)"
    requirement: LJU-07
    verification:
      - kind: e2e
        ref: "test/e2e/context-brief.spec.ts#every repo fixture: DOM order ... More disclosure starts closed; #SP 04: boundary-notes table has 9 body rows ... extras render before the register"
        status: pass
    human_judgment: false
  - id: D8
    description: "test/web/visual-contract.test.ts asserts the intentional full-width, no-padding .document-canvas contract"
    requirement: LJU-08
    verification:
      - kind: unit
        ref: "test/web/visual-contract.test.ts#flattens the document canvas — no enclosing border, background fill, or shadow, and no max-width"
        status: pass
    human_judgment: false
  - id: D9
    description: "All gates green (npm test, typecheck, lint, test:e2e, build), B3 (DISCUSSION-LOG/PLAN/VERIFICATION) unchanged and unregressed"
    requirement: LJU-09
    verification:
      - kind: unit
        ref: "npm test — 1267/1267"
        status: pass
      - kind: e2e
        ref: "npm run test:e2e — 52/52 (CONTEXT spec, F-01..F-15 sweep light/dark 1280/420, document-layout.spec.ts + artifact-header.spec.ts)"
        status: pass
      - kind: other
        ref: "npm run typecheck; npm run lint; npm run build"
        status: pass
    human_judgment: true
    rationale: "The plan's own <verification> requires a human to restart labelore.service and visually compare the live studio-portal CONTEXT page against sketch 006 D1 in both themes/widths — this executor cannot restart that systemd unit (C-5) or judge the visual comparison itself."

duration: ~2h (across a usage-limit interruption and resume)
completed: 2026-09-23
status: complete
---

# Quick Task 260923-lju: CONTEXT page per sketch 006 D1 Summary

**Built the CONTEXT.md view end to end — sketch-006 D1's boundary hero, quiet out-strip, amber open-questions panel, continuous decision register with tagged "Claude decides" notes, ideas panels and a single "More" disclosure — proven against all 19 real CONTEXT.md files in this repo plus `~/studio-portal`.**

## Performance

- **Duration:** ~2h (resumed once after a usage-limit interruption; mid-Task-3 state was preserved and continued)
- **Tasks:** 3 (all completed)
- **Files modified:** 24 (12 created, 12 modified), excluding regenerated goldens

## Accomplishments

- A tolerant, line-scanned server projection (`extractContextBrief`) reads a CONTEXT.md body — boundary (explicit In/Out lists, prose "This phase does not…", label-prose outs, a Locked-upstream table, an `###` amendment subsection), decision areas (tag/reversibility/notes), open questions (`###` subsection or `<open_questions>` tag), Claude's-discretion (bulleted or single-paragraph colon-list), and specific/deferred ideas — composed exclusively from `splitSections`/`splitSubsections`/`parseMarkdownTable` plus bounded per-line regexes (T-01-11), never a whole-document regex.
- A pure composer (`composeContextBrief`) and a React view (`ContextBriefView`) implement every P-1..P-8 pattern point from the sketch: intro via `ArtifactHeader`'s new `meta` prop, the boundary hero + accent In card, the out-strip, boundary notes, the amber open-questions panel with jump chips that focus and expand the target decision, the continuous register with sticky area headers and tagged "Claude decides" notes, ideas panels, and a single closed "More in this document" disclosure.
- Every markdown-derived string renders only through `tokenizeInline` → React text/code/strong/em nodes (T-lju-01) — no `dangerouslySetInnerHTML` anywhere in the new files; whole-section HTML (extras, More) still goes through the existing sanitized `renderHtml` pipeline unchanged.
- A corpus guard (`test/web/context-brief-corpus.test.ts`) pins decision/note/open counts and a nothing-dropped word-coverage check against all 19 real CONTEXT.md files (10 in this repo, 9 in `~/studio-portal`) — every pinned count was independently confirmed against source (`grep -c '^- \*\*D-[0-9]'`) before being written down, and this guard caught two real parser bugs (see Deviations).
- `npm run test:e2e` is fully green (52/52): the CONTEXT spec over real corpus files on two servers (this repo on 4199, studio-portal on 4198), the full F-01..F-15 foundation sweep in light/dark at 1280/420, and `document-layout.spec.ts` + `artifact-header.spec.ts` (B3) unchanged and passing.

## Task Commits

1. **Task 1: Tracer — server projection, manifest brief hook, intro, boundary hero, out-strip, decision register** - `47a3e16` (feat)
2. **Task 2: Expand the brief — stats, open panel, tagged discretion, ideas, More, boundary notes, corpus guard** - `f06919f` (feat)
3. **Task 3: Real-corpus e2e, F-01..F-15 sweep, B3 regression proof, docs, build** - `86daac3` (feat)

All three tasks' `npm test`/`typecheck`/`lint` gates were re-verified green after Task 3's `artifactTokenOf` fix, so no separate fix-up commit was needed.

## Files Created/Modified

- `src/planning-repo/handlers/context-brief.ts` — the server projection (`extractContextBrief`, `firstSentence`, `parseBlocks`, `topSections`)
- `src/planning-repo/handlers/context.ts` — wires `structured.brief` inside a try/catch
- `src/planning-repo/handlers/artifact-token.ts` — dispatch fix for archived quick-task files (see Deviations)
- `src/web/views/context-brief.ts` — the pure composer (`composeContextBrief`, `formatGatheredDate`, `formatCovers`)
- `src/web/views/context-brief-components.tsx` — the React view (`ContextBriefView`, `ContextIntroMeta`, `useContextBrief`)
- `src/web/views/inline-markdown.ts` — `tokenizeInline`
- `src/web/views/manifest.ts` / `manifests.ts` — the `brief` hook on `ViewManifest`, wired for `context`
- `src/web/pages/artifact-page.tsx` — computes and renders `brief` before the promoted-block fallback
- `src/web/components/artifact-header.tsx` — optional `meta` prop (plain variant only)
- `src/web/styles/globals.css` — `--caution`/`--caution-border`, `.status-chip[data-tone='caution']`, `.artifact-meta-row`, every `.view-context-*` rule (additive only, confirmed via `git diff` zero-deletion check against `386e492`)
- `docs/design-language.md` — `artifact-meta-row`, the `caution` tone, and three language-beyond-names bullets
- `playwright.config.ts` — `webServer` array, adding the read-only studio-portal server on 4198
- `test/e2e/measure.ts` — `CORNER_SELECTORS` gains the brief's radius-bearing chrome
- `test/context-brief.test.ts`, `test/web/context-brief.test.ts`, `test/web/context-brief-corpus.test.ts`, `test/web/inline-markdown.test.ts`, `test/web/caution-contrast.test.ts`, `test/e2e/context-brief.spec.ts` — new test coverage
- `test/web/visual-contract.test.ts` — the canvas max-width assertion flip (resolves jxp's deferred item)
- `eslint.config.js` — `.planning/**` excluded from lint scope

## Decisions Made

See `key-decisions` in the frontmatter (D-01..D-05). The two parser bugs (D-02, D-03) and the dispatch bug (D-04) were all found by real-data verification — the corpus guard and the e2e suite respectively — not by inspection.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Nested sub-bullets inside a decision were parsed as phantom sibling decisions**
- **Found during:** Task 2, building the corpus guard's pinned counts
- **Issue:** `parseAreaEntries` treated any trimmed line starting with `- `/`* ` as a new decision-opening bullet, regardless of indentation — a real corpus decision's own nested `  - sub-point` detail list (e.g. jxp's ghost-chapter decision, SP02's permission decisions) spawned extra decision rows instead of folding into the parent's detail.
- **Fix:** A bullet only opens a new decision at column 0 (checked against the raw, untrimmed line); an indented bullet folds into the currently-open decision's continuation text.
- **Verification:** SP02 21 (was 23), LB v1.0/01 16 (was 20), jxp 15 (was 18) — all now match independently-grep-verified source counts.
- **Committed in:** `f06919f`

**2. [Rule 1 - Bug] `<resolved_open_question>` headings misread as a real open-questions panel**
- **Found during:** Task 2, corpus guard
- **Issue:** `OPEN_QUESTIONS_HEADING_RE` was a bare substring test (`/open questions?/i`) — SP 03's `## ⚠️ The STATE.md open question is already answered` heading contains "open question" without being one.
- **Fix:** Anchored the regex to the start of the heading (`/^open questions?\b/i`).
- **Verification:** SP 03 now correctly shows 0 open items (was spuriously 3); SP 01 and SP 04 (the two real open-questions files) are unaffected.
- **Committed in:** `f06919f`

**3. [Rule 1 - Bug] Archived quick-task CONTEXT.md files never got typed (structural) parsing**
- **Found during:** Task 3, the "quick oae" e2e fixture — `#context-boundary` never became visible
- **Issue:** `discovery.ts`'s `classify()` has no branch for a `milestones/vX.Y-quick/` top segment (only `vX.Y-phases`), so those files fall through to the generic `'milestone-root'` location. `artifactTokenOf()` only checked `location === 'phase' | 'archived-phase' | 'quick'`, so `ContextHandler.match()` (and every other typed handler dispatching through the same helper) returned false for these files — `structured` came back `{}` on the wire, even though `deriveKind()` already labeled the wire `kind` correctly as `'context'` via its own unconditional `parseQuickArtifactName` fallback.
- **Fix:** `artifactTokenOf()` now also tries `parseQuickArtifactName` for `location === 'milestone-root'`, mirroring `deriveKind()`'s existing unconditional-fallback discipline. Phase-style and quick-style filename grammars never overlap, so this is unambiguous.
- **Verification:** `structured.brief` (and `structured.decisions`/`sections`) now populate correctly for `260912-oae-CONTEXT.md`; full `npm test` (1267/1267) and `npm run test:e2e` (52/52) stayed green after the change — no regression to any other handler's dispatch.
- **Committed in:** `86daac3`

**4. [Rule 3 - Blocking] `.planning/**` excluded from ESLint scope**
- **Found during:** Task 1, running `npm run lint`
- **Issue:** `.planning/sketches/006-context-brief/extract-context.reference.mjs` (a pre-existing, untracked planning-sketch reference script this task's own constraints forbid staging) is the first non-markdown file to land under `.planning/`, and it fails Node-globals lint rules (`process`/`console` undefined) — blocking the plan's own literal `npm run lint` verify gate with zero relation to this task's shipped code.
- **Fix:** Added `.planning/**` to `eslint.config.js`'s `ignores`, mirroring the existing `fixtures/**`/`test/__golden__/**` exclusions.
- **Verification:** `npm run lint` is clean; no other file under `.planning/` was previously linted (confirmed by search before the change).
- **Committed in:** `47a3e16`

---

**Total deviations:** 4 auto-fixed (3 Rule 1 bugs, 1 Rule 3 blocking issue)
**Impact on plan:** All four were necessary for correctness — three were caught by the plan's own required verification methods (the corpus guard's independently-verified counts, and the e2e fixture list), not invented scope. No architectural changes, no Rule 4 escalations.

## Known Stubs

None.

## Issues Encountered

- **Playwright hang on a mis-targeted `page.goto`:** the studio-portal e2e fixtures initially timed out (~16+ minutes before I killed the run) because `page.goto(url)` used the artifact's relative `key` against Playwright's default `baseURL` (port 4199, this repo's server) instead of the studio-portal server (port 4198) the fixture data came from. Fixed by navigating to the full `${SP_BASE_URL}${url}` for that describe block only; the underlying `#context-boundary`-never-visible symptom this produced is what led to correctly diagnosing deviation #3 above as a real production bug rather than a test-only issue.
- **A stale golden-canvas test failure was pre-existing**, not caused by this task (confirmed against `git stash` in `260923-jxp`'s own deferred-items.md) — resolved here as part of Task 1's step 1 per the plan.

## User Setup Required

**The live `labelore.service` still serves the pre-existing promoted-block view for CONTEXT files until restarted** — this executor did not, and must not, restart it (C-5). After this change is deployed:

1. Restart the service: `systemctl --user restart labelore` (targets `~/studio-portal`; confirm with `systemctl --user cat labelore` first).
2. Open `https://cinedise.persian-elnath.ts.net/` → studio-portal Phase 01's CONTEXT page.
3. Compare against sketch 006 D1 (`https://cinedise.persian-elnath.ts.net/sketches/006-context-brief/`) in light and dark, at desktop and phone width — this is the plan's `<human-check>` gate (D9's `human_judgment: true` above) and was not run by this executor.
4. While there, open one DISCUSSION-LOG, one PLAN and one VERIFICATION page and confirm the B3 layout is unchanged (already proven automatically by `document-layout.spec.ts`/`artifact-header.spec.ts`, 31/31 passing, but worth a human glance since it's a live deploy).

## Next Phase Readiness

- CONTEXT is now the fourth view kind with its own full layout (after B3's DISCUSSION-LOG/PLAN/VERIFICATION and the plain promoted-block view for everything else) — the `brief` hook on `ViewManifest` is a reusable seam if a fifth per-type layout is ever needed.
- The `artifact-token.ts` fix (deviation #3) is a genuine, narrowly-scoped bug fix to shared dispatch infrastructure — worth a mental note that `milestones/vX.Y-quick/` archived quick tasks were previously silently under-parsed for every typed artifact kind (RESEARCH, VALIDATION, SECURITY, …), not just CONTEXT. No further action needed; the fix is general.
- No blockers. The only remaining step is the human visual verification named above, which requires restarting the live service — outside this executor's authority per C-5.

---
*Phase: quick-260923-lju*
*Completed: 2026-09-23*
