---
phase: 10-codebase-map-specification-and-check-pages
plan: 21
subsystem: browser-check-page
tags: [dom-verify, browser-check, outcome, criteria, tiles, sketch-051-A, phase-10]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: 10-07 made-up DOM-VERIFY fixtures, 10-08 dom-verify manifest, 10-17 sketch 051 winner A, 10-16 to 10-20 page shape
provides:
  - DomVerifyHandler, extractDomVerify and DomVerifyBody (structured.domVerify)
  - composeDomVerify, ComposedDomVerify, the outcome table DOM_OUTCOME_TABLE, the reason copy DOM_REASON_COPY and the result table
  - the Browser check page (DomVerifyView): the check drawn as the browser window it looked through
  - ViewInput.phaseName, the phase's roadmap name matched by phaseIdentity
affects: [10-23 browser spec]

requirements-completed: [VIEW-12]

key-files:
  created:
    - src/planning-repo/handlers/dom-verify-body.ts
    - src/planning-repo/handlers/dom-verify.ts
    - src/web/views/dom-verify-page.ts
    - src/web/views/dom-verify-page-components.tsx
    - test/dom-verify-handler.test.ts
    - test/web/dom-verify-page.test.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md

key-decisions:
  - "Built sketch 051 winner A as chosen: outcome chip and target address in the window bar, tiles failed first (a boxed mono element plus the contract quote), a shut (hatched, eye-off, in-flight, 2px chip) window for Could not look and a blank (dashed, minus, quiet, dashed chip) one for Nothing to report, counts in the status bar"
  - "The h1 is the phase name from the roadmap, passed through a new generic ViewInput.phaseName; with none it falls back to the file's own title"
  - "A criterion is a list item, or any line that opens with a readable verdict word; a list item with no readable verdict is kept as plain text under 'Result not stated'"
  - "A target is read from a body line labelled Target first, then from backticked paths and URLs in the body's paragraphs; a time only from a line labelled Checked or the like; a file date is never used"

duration: one session
completed: 2026-11-06
actuals:
  tokens: 35000
  tasks: 2
  commits: 3
plan_head_before: c0cfb6fb04c60a32a925e0ba47f3b7465f28a72d
plan_head_after: e1d2101ef38c0a1e4ed9766ef48a5993cf7390ce
---

# Phase 10 Plan 21: Browser check page Summary

**A DOM-VERIFY opens as the browser window the check looked through (sketch 051 A): the outcome chip (Verified `complete` with a check-circle; Nothing to report `quiet`, dashed, minus-circle; Could not look `in-flight`, 2px frame, eye-off) and the target in the bar, then either the criteria as tiles, failed first, each with what was seen and the contract it quotes, or a shut or blank view carrying the reason, and the counts as the file states them in the status bar. Neither non-pass outcome is ever `complete`, and neither shows three zero counts in place of "No criteria were checked."**

## What was built

- **`handlers/dom-verify-body.ts`.** `extractDomVerify(frontmatter, body)` reads the frontmatter's `outcome`, `reason`, `wave` and the four counts (numbers only; every other key ignored), then one pass over the body lines outside fences: criteria (each list item, and each other line that opens with `passed`, `failed` or `needs_review` through bold, backticks or brackets, any case, colon inside or outside the marks; an unmarked word counts only before a colon or a dash, so "Failed login shows a banner" is plain text), paragraphs, the target (a labelled line, then backticked `/path` and `http(s)` values), the time (a line labelled Checked or the like, never a bare number), and "Phase N, wave W" from the title. Caps: 250,000-character body, 500 criteria, 200 paragraphs, 8 targets, 2,000 characters a line. No regular expression.
- **`handlers/dom-verify.ts`.** `DomVerifyHandler` on the `DOM-VERIFY` token before the generic handler; guarded, so a throw only omits `structured.domVerify`.
- **`dom-verify-page.ts`.** The pure composer: the outcome as one Map (unknown value raw in mono, none the quiet "Outcome not stated"), the reason sentences as a Map (`target_unreachable`, `no_criteria`; any other reason raw only; `ok` nothing), the chip's accessible name including the reason, counts straight from the frontmatter (a zero is a `quiet` square), `noCriteria` for a non-pass file with no criteria, `rowCounts` when the lines disagree with the counts, and the criteria grouped failed, needs review, passed, result not stated. Returns `null` for a file with no outcome, count or criterion.
- **`dom-verify-page-components.tsx`.** Header override (eyebrow "Phase N · Browser check", the phase name as the h1, "Wave n" and any stated time as meta); the window figure (three decorative squares, the outcome chip, the address field of mono targets that end-ellipsise, the view, the status bar); tiles that open the full observation in a dock; "What the check wrote" as a closed bar. Every string is React text through `ResearchInline`; no link is built from document text.
- **Wiring.** `domVerifyPage` on the dom-verify manifest (lead and `promote` fallback unchanged), `ViewInput.phaseName` from `findPhaseName` in `artifact-page.tsx`, the `phase-10-dom-verify` CSS block, design-language tone rows for all four tones, a page bullet and the Language bullet that the two non-pass outcomes differ in icon, word and reason, never colour alone.

## Deviations from Plan

1. **[User decision 051 A] Layout.** The plan names only the "051 winner"; built as drawn. The window is a view-local figure, not `FigureFrame` (10-17 allowed either): `FigureFrame`'s bar carries Fit to width, Grid and Expand chrome that a window of tiles has no use for.
2. **[Sketch over plan] Target.** The plan reads the target only from a body line labelled Target or Checked. The sketch and the user's decision read backticked paths and URLs in the body's paragraphs too (01's "Nothing answered at `http://localhost:4871/sign-in`" fills the address field). Built both: a labelled line first, then backticked values. Still text only, never a link, never a file date; a body that states none shows an empty dashed field.
3. **[Plan defect] Criteria.** The plan says "one per non-empty body line under the heading", which would make 03's intro sentence an eighth criterion and break "seven criteria". A criterion is a list item or a line that opens with a verdict word; other lines are paragraphs. The real verifier writes "one line per criterion with its verdict", so both bulleted and bare verdict lines read.
4. **Extra fields on `DomVerifyBody`.** `phase` (from the title), `paragraphs`, `targets` (the list; `target` is its first) beside the plan's fields. `wave` falls back to the title's "wave W" when the frontmatter has none.
5. **New `ViewInput.phaseName`.** 10-17 left the `h1` source to this plan: the file's title gives only "Phase N, wave W", so the roadmap name arrives through a generic `phaseName` found by `phaseIdentity` (as `phaseRequirementIds` is), with the file's own title as the fallback.
6. **Extra copy.** "Lines in the file: {p} passed, {f} failed, {n} needs review." (shown only when the lines disagree with the frontmatter counts, so nothing is recounted silently) and "No criteria in the file." (sketch word, for a window with nothing to list and no reason) are the build's words.
7. **[Dispatch] Not run:** the Playwright suite, `systemctl --user restart labelore` (the plan's last verify clause), `--sketch` on `shoot-pages` (a scratchpad script `shoot-051.mjs` shot the sketch; build shots came from `shoot-pages` on an isolated server). The service is therefore not restarted; do that after merge.
8. **CSS guards.** The block holds no colour recipe (`--card-veil`, `--code-veil`, `--missing-border` and `--in-flight-fill` are the shared tokens, and the hatch is the one the Spec and AI spec blocks use) and sets no `.status-square` selector (the page sizes squares through `view-dom-verify-sq`).
9. **Plan's known defect (snapshot one-liners on `project.artifacts`).** Not hit; the dense golden did not change.
10. **node_modules** in the worktree is a git-ignored directory of symlinks to the main checkout's (nothing installed).

## Tracer and TDD record

Task 1 (tracer): handler, extractor, composer, page, CSS and wiring shipped together (`2220759`); checked end to end (gate on the six named files: 310 passed, typecheck, build, four screenshots of 03) before expansion. The extractor and composer were written whole in the tracer, so Task 2's RED (`ca5cc75`) failed only where the page had a gap: 4 tests (the shut and blank windows with their reason card, the raw `profile_locked` reason, the design-language rows); the other 41 tests added there (extractor, composer and contract) passed at once. GREEN `e1d2101` (the shut and blank views, the design-language rows).

## Side by side (sketch left, build right)

Shots in `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/build-10-21/`: `sketch/sketch-{01,02,03}-{1280,390}-{light,dark}.png`, `build/dom-v1-1-phase-{1,2,3}-dom-verify-{1280,390}-{light,dark}.png`, and the composites `pair/pair-{01,02,03}-{1280,390}-{light,dark}.png`. All twelve composites were viewed (01 could not look, 02 nothing to report, 03 verified, each at 1280 and 390 in light and dark), plus a build shot with a tile open in its dock. The build matched the sketch at first look, so nothing was changed. Differences:

1. **Left: chip typeface.** The sketch sets chips (and the outcome word) in mono; the shared app `status-chip` is condensed sans, as on every other page.
2. **Left: page chrome.** The app shell, the crumbs with the full file title ("DOM verification: Phase 3, wave 2"), and the header row (the app puts the link-copy button and View / Source on their own right-aligned line at 1280).
3. **Left: dark window surface.** The window's `--card` reads a touch lighter in the app's dark theme than in the sketch's; both come from the same token.
4. **Left: dock.** Opening a tile was checked in a scratchpad script (the dock holds "Criterion 4 of 7", the Failed chip, Close and the full line) and photographed at 1280 light only.
5. **Not photographed:** the No outcome and Other reason states (the sketch made them; no fixture exists), tested through markup only; and the Verified chip in dark reads dim in both the sketch and the build (the shared complete tint).

No sideways page scroll at 390 and no page error (`shoot-pages` printed no FAIL line; the scratch script read `scrollWidth` equal to the viewport on all six runs). Exactly four computed font sizes in the page body at 1280 and 390 (20.8, 13.12, 11.2 and the h1 76.8 / 44.8); the block's sizes are test-pinned.

## Verification

- `npm run test:gate -- test`: `gate: total=6170 passed=6170 failed=0 skipped=0 todo=0` (base 6107). `npm run typecheck`, `npm run lint`, `npm run build`: exit 0.
- Acceptance: `DomVerifyHandler` in `handlers/index.ts`; `domVerifyPage: composeDomVerify` once in `manifests.ts`; `No criteria were checked.` in `dom-verify-page.ts`.
- Growth (T-10-41): the extractor stays linear in lines and in the length of a line of backticked values; the composer composes 10,000 criteria in linear time.
- The dense golden did not change.

## Known Stubs

None.

## Open items

- **Which wave file a Phase page links to.** A DOM-VERIFY file is per wave and each opens at its own address; this plan does not choose between several waves' files.
- **Criterion shapes in real files.** The tolerant verdict read and the "what was seen" and "contract" reads (backticked values, the first double-quoted value) are best-effort against made-up files; a real verifier line with neither shows its first two lines of text.

## Threat Flags

None new. T-10-39 mitigated (criterion, paragraph and observed text render as React text through `ResearchInline`, so a planted `<img onerror>` is escaped; the contract test forbids the raw-HTML prop and any link). T-10-40 mitigated (a target is shown as mono text in the address field, never a link, and no `href` is built from document text). T-10-41 mitigated (caps, single-pass scans, growth tests). No package installed.

## Self-Check: PASSED

- FOUND: `dom-verify-body.ts`, `dom-verify.ts`, `dom-verify-page.ts`, `dom-verify-page-components.tsx`, `test/dom-verify-handler.test.ts`, `test/web/dom-verify-page.test.ts`.
- FOUND commits 2220759, ca5cc75, e1d2101 (ancestors of HEAD).
- STATE.md and ROADMAP.md untouched.
