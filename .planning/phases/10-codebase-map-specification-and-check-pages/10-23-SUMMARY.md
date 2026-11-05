---
phase: 10-codebase-map-specification-and-check-pages
plan: 23
subsystem: browser-close-out
tags: [e2e, playwright, mapped-not-started, copy-command, deep-reload, screenshots, phase-10]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: every Phase 10 page (10-08 to 10-22), the Tidemark fixture (10-24), copy-command (10-10)
provides:
  - LABELORE_E2E_CHROME hook in playwright.config.ts (system Chrome; unset = unchanged)
  - TIDEMARK_FIXTURE_ROOT in test/e2e/fixture-root.ts
  - test/e2e/mapped-not-started.spec.ts (four entry paths and the copy command, in Chromium)
  - Phase 10 addresses in test/e2e/deep-reload.spec.ts
  - test/e2e/phase-10-screenshots.spec.ts (112 shots with the shared UI rule checks)
  - test/e2e/pages.ts normalised through viewKindOf
affects: [phase verification, user's screenshot review]

requirements-completed: [TGT-09, VIEW-13, VIEW-11, VIEW-12, VIEW-21]

key-files:
  created:
    - test/e2e/mapped-not-started.spec.ts
    - test/e2e/phase-10-screenshots.spec.ts
  modified:
    - playwright.config.ts
    - test/e2e/fixture-root.ts
    - test/e2e/deep-reload.spec.ts
    - test/e2e/pages.ts
    - src/web/styles/globals.css

key-decisions:
  - "The copy-command backstop checks the button reads Copied, the clipboard equals the command text, the command is selectable text outside the button, and zero requests are issued between just before the click and Copied (RESEARCH C2 instead of the toast)"
  - "Tidemark deep-reload and screenshot subjects run on a per-spec startProjectsServer on a mkdtemp copy (the Playwright config's four servers are Lendshed, Shapes dev, Shapes built and the repo); no fifth config server was added"
  - "The Integrations panel's three five-size offenders were fixed in CSS (tokens only) rather than loosening the four-size rule or approving an exception"

duration: about 1h 15m
completed: 2026-11-06

actuals:
  tokens: 9300
  tasks: 3
  commits: 4
plan_head_before: 093a89aa9a64c7b5c05aeab6f9c52842bf1e77eb
plan_head_after: f2753e3c20d50ddaeb4d5e12a73dd57a5890cdfb
commits: 4
---

# Phase 10 Plan 23: Browser close-out Summary

**A map-only project (Tidemark) opens on its "Mapped, not started" head from all four entry paths in Chromium, Copy command copies exactly the command with zero requests, every new address survives a hard reload, and 28 Phase 10 page subjects pass the shared UI rules at both widths and themes (112 screenshots for review).**

## What was built

- **Config hook.** `playwright.config.ts`: the chromium project's `launchOptions.executablePath` comes from `LABELORE_E2E_CHROME` only when it is set and non-empty. System Chrome here: `LABELORE_E2E_CHROME=/usr/bin/google-chrome`.
- **mapped-not-started.spec.ts (5 tests, all pass).** Started on the project folder; started on the `.planning` folder; added from the switcher's add dialog by its `.planning` path (then chosen again from the switcher); found by scanning `~/Work` of a synthetic HOME (copy at `Work/harbour/tidemark`, two levels down) and added from the checklist. Each lands on the eyebrow "Mapped, not started", the head sentence, the "Complete map" chip, the seven-entry panel list, and a header with Dashboard and no Roadmap or Traceability link. The copy test grants clipboard permissions, asserts the command is `/gsd-new-project`, selectable (`user-select` not none, double-click selects it), outside the button, clicks with a `page.on('request')` counter (expects `[]`), expects the button to read "Copied", the clipboard to equal the shown text, and the label to return to "Copy command".
- **deep-reload.spec.ts.** The click loop became `openAndReload`; a "Phase 10 addresses" block hard-reloads: Tidemark `/` and `/codebase/concerns`; Shapes' bare `/codebase` redirecting to its Stack document; Lendshed's `/codebase` (no map) staying not-found; and the six type addresses (`/v1.1/phase-1/spec`, `phase-2/ai-spec`, `phase-2/user-setup`, `phase-3/eval-review`, `phase-1/dom-verify`, `phase-1/reviews`), each with one h1.
- **pages.ts.** `registered` and `kindsWithoutFixture` go through `viewKindOf`, so `codebase-*` kinds read registered and the `codebase` view kind is not listed as fixture-less.
- **phase-10-screenshots.spec.ts (112 tests, all pass).** 28 subjects x 1280/390 x light/dark into `test-results/phase-10/{page}-{input}-{width}-{theme}.png`: Codebase on Tidemark (dashboard address + 7 panels), Shapes (stack, architecture, conventions), this repo (stack, structure, concerns); spec x3, ai-spec x2, user-setup x2, eval-review x2, dom-verify x3, reviews x2 on Lendshed. Each asserts one h1, no sideways scroll at 390, no destructive/warning tone in main, at most four font sizes (no exception: 10-06 approved four).

## Verification

- `mapped-not-started.spec.ts` + `deep-reload.spec.ts`: 67 of 67 pass after the one stale-test fix below. `phase-10-screenshots.spec.ts`: 112 of 112 pass (final full run, after the CSS fix; 112 PNGs).
- `npm run test:gate -- test`: `gate: total=6243 passed=6243 failed=0 skipped=0 todo=0`.
- `npm run typecheck`, `npm run lint`: exit 0. `npm run build`: built.
- Not done, by instruction: `systemctl --user restart labelore` (the orchestrator said never to touch the user's live 4173 instance). The orchestrator restarts after merge.
- Servers: every server and browser the specs and `shoot-pages.ts` started was stopped by its own teardown; none left running by this plan.

## Deviations from Plan

**1. [Rule 1 - Bug] Stale deep-reload class for a codebase document.** The existing "a codebase document" test (Shapes ARCHITECTURE.md) still expected the artifact's title in the h1; since 10-08 a map document is a Codebase page panel (h1 "Codebase", panel heading "Architecture"). Updated to assert that. Found by the plan's own verify run. Commit de297da.

**2. [Rule 1 - Bug] Integrations panel rendered five font sizes (Tidemark, both widths).** Found by the screenshot sweep's four-size check. Three causes, all in 10-12's Integrations panel: the Environment configuration rows (`.view-codebase-env dd`) and the "Also in Stack" strip (`.view-codebase-xrefs`) inherited 16px body text; and the lane diagram's compact layout (390px) sets `.lane-diagram-label` to `--fs-3` (12.16px), which beat the page's existing `.view-codebase-lanes .lane-diagram * { font-size: var(--fs-2) }` rule on specificity. Fix: `font-size: var(--fs-4)` on the first two, one same-specificity-later rule for lane label and sub at `--fs-2`. Tokens only, no new classes. Commit 1f74113.

**3. [Rule 3 - plan wording vs shipped] Fifth `phase-10-screenshots` server.** The plan's Task 3 lists Tidemark as a subject but the Playwright config has no Tidemark server. Tidemark (screenshots and deep-reload) runs on `startProjectsServer` over a mkdtemp copy with its own settings dir; no config server added.

**4. [Orchestrator instruction overrides plan] No service restart.** Task 3's verify ends with `systemctl --user restart labelore && is-active`; the dispatch said not to restart the user's live instance. Typecheck, lint and build were run; the restart was not.

**5. [Plan-era layout vs what shipped]** The plan's UI-SPEC-era wording ("the head's readiness chip", "the panel list's seven entries") was checked against sketch 042 A as built: the readiness chip, date and commit live in the rail's facts line, not inside the head block, and the eyebrow (not the h1) carries "Mapped, not started". Selectors follow what shipped. The Spec/AI spec/User setup/Eval review/Browser check/Reviews subjects use the page-root classes `view-<kind>-page` as markers.

**6. Typecheck fix in the Task 3 commit.** `DEV_SERVER` in deep-reload.spec.ts was `as const` (readonly array vs `string[]`); typed as `Pick<ServerMode, ...>`. It landed in f2753e3 with the screenshot spec rather than in the Task 2 commit.

**7. Plan defect noted, not hit.** `project.artifacts[<phase path>]` snapshot one-liners print undefined for phase files; none were needed here.

## Reviewed screenshot list (looked at, with what looks off)

Set: `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/phase-10-screenshots/` (112 PNGs; same files in `test-results/phase-10/`, git-ignored). The two other repositories' Codebase pages (cinedise-portal, duet; /codebase, /codebase/concerns, /codebase/integrations; 24 PNGs) are outside the repo at `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/phase-10-other-repos/` and are not committed.

Viewed (not all 112; a spread across every page family, both widths, both themes): codebase-tidemark-dashboard (1280 light, 390 dark), tidemark-integrations (1280 light), tidemark-concerns (1280 dark), codebase-labelore-structure (1280 light), codebase-shapes-stack (390 light), spec-lendshed-p1 (1280 light), ai-spec-lendshed-p2 (1280 dark), user-setup-lendshed-p4 (390 light), eval-review-lendshed-p3 (1280 light), dom-verify-lendshed-p2 (1280 light) and p3 (390 dark), reviews-lendshed-p1 (1280 light) and p4 (390 dark), plus cinedise-portal /codebase (1280 light) and duet /codebase/concerns (390 dark). Not individually opened: the remaining ~97 PNGs (same page code, other inputs/themes); they all pass the automated rules.

Things that look wrong or worth a decision (none failed a rule; candidates for a follow-up sketch or quick task):

1. **"Complete map" chip is accent orange-red** (Tidemark, duet, cinedise-portal). The Fast/Partial map chip is the same family, so "complete" and "incomplete" are told apart mainly by the label and a filled vs hollow square, and the orange reads close to a warning. Worth checking against the tone table.
2. **Stack panel repeats itself.** On Tidemark, cinedise-portal and this repo's Stack, the chips figure is followed by the full document text (Languages, Frameworks, Key dependencies) that says the same thing again; on the portal map that makes the page about 2,800 px of near-duplicate content before the Configuration and Platform sections. Structure on this repo is a 6,500 px page for the same reason (tree, then every directory again in prose).
3. **Shapes' Stack entry reads "0" and "0 TOOLS"** (390 light) while the document has prose: the lift found no chips, so the key number is a literal zero. A zero here says "nothing" about a panel that has content.
4. **Reviews page at 390 (p4):** the "Consensus summary, as the file wrote it" row wraps its right-aligned "THE FILE'S OWN" tag onto a second line under the title. Small, but it differs from the other bars where the tag stays on the row.
5. **Reviews p1 (one reviewer):** a single large Venn circle with one square pair and a lot of empty space above and below; correct for the data, but the figure carries almost no information in this state.
6. **AI spec p2 (all template slots):** nine "TEMPLATE SLOT" boxes and a hatched empty chart area. This is the made-up input's honest state, but it is the least informative page in the set; the hatch fills a lot of the viewport.
7. **Browser check p3 at 390:** the verdict reads "Verified" in the accent tone while the board lists 2 failed and 1 needs review. If the fixture's status line deliberately disagrees with the counts this is the intended "both shown as written" case; if not, the verdict word needs a look.
8. **Shell, not this phase:** at 390 the project name in the header switcher is cut off ("V1.1 · PHASE 4/..."), and the primary nav is a second row; unchanged from earlier phases.

Nothing screamed at a glance on the Concerns piles, the Spec gauge, User setup tree, Eval review or the Venn with four reviewers.

## Known Stubs

None added. (Fixture-only "template slot" states on the made-up AI spec are the input, not a stub.)

## Threat Flags

None. Every spec server has its own settings directory and works on mkdtemp copies or read-only fixtures; the scan ran in a synthetic HOME; the other repositories' shots were taken by hand into a folder outside the repo (T-10-45, T-10-46).

## Self-Check

- `playwright.config.ts`, `test/e2e/mapped-not-started.spec.ts`, `test/e2e/phase-10-screenshots.spec.ts`, `test/e2e/fixture-root.ts` (TIDEMARK_FIXTURE_ROOT), `test/e2e/deep-reload.spec.ts`, `test/e2e/pages.ts` exist and are committed.
- Commits a3a3d71, de297da, 1f74113, f2753e3 are ancestors of HEAD (`git rev-list --count 093a89a..HEAD` = 4 before this SUMMARY).
- `ls test-results/phase-10/*.png | wc -l` = 112 (plan asks at least 100).

## Self-Check: PASSED
