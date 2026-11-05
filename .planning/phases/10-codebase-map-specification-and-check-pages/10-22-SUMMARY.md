---
phase: 10-codebase-map-specification-and-check-pages
plan: 22
subsystem: cross-ai-reviews-page
tags: [reviews, cross-ai, agreement, disagreement, overlap, sketch-052-A, phase-10]
status: complete

requires:
  - phase: 10-codebase-map-specification-and-check-pages
    provides: 10-07 made-up REVIEWS fixtures, 10-08 reviews manifest, 10-17 sketch 052 winner A, 10-21 ViewInput.phaseName and the page shape
provides:
  - ReviewsHandler, extractReviews and ReviewsBody (structured.reviews)
  - composeReviews, normaliseConcern, stanceOf, the stance word table and SEVERITY_TABLE
  - the Cross-AI reviews page (ReviewsView): the overlap figure, Agreed, Disagreements, closed bars
affects: [10-23 browser spec]

requirements-completed: [VIEW-12]

key-files:
  created:
    - src/planning-repo/handlers/reviews-body.ts
    - src/planning-repo/handlers/reviews.ts
    - src/web/views/reviews-page.ts
    - src/web/views/reviews-overlap.ts
    - src/web/views/reviews-page-components.tsx
    - test/reviews-handler.test.ts
    - test/web/reviews-page.test.ts
  modified:
    - src/planning-repo/handlers/index.ts
    - src/web/views/manifest.ts
    - src/web/views/manifests.ts
    - src/web/pages/artifact-page.tsx
    - src/web/styles/globals.css
    - docs/design-language.md

key-decisions:
  - "Built sketch 052 winner A (Overlap) as chosen: up to three circles, a square per concern in its reviewers' region, agreed concerns large and numbered, a failed lane an empty dashed circle apart, reviewer cards as the key, Agreed beside, Disagreements side by side with the Reviewers disagree chip, the file's consensus labelled as its own"
  - "Four or more substantive reviewers: no circles; the roster cards, the Agreed list (each row naming its reviewers), a Raised by one reviewer list and one quiet line"
  - "Agreement is derived by the page and the dock says which rule matched; a failed or skipped lane is never counted"

duration: one session
completed: 2026-11-06
actuals:
  tokens: 90000
  tasks: 3
  commits: 4
plan_head_before: 8958a32119799b94a3727a9d433c4472ff202b2a
plan_head_after: 886138611ae382f3f7670e599b5b28db2213c82b
---

# Phase 10 Plan 22: Cross-AI reviews page Summary

**A REVIEWS file opens as sketch 052 A draws it: one circle per substantive reviewer with every concern a square in the region of the reviewers who raised it (the deadline A1 where Claude, Codex and OpenCode meet, `MAX_EXPORT_LOANS` A2 where Claude and OpenCode meet), Qwen's failed run an empty dashed circle apart and never counted, the reviewer cards as the key, Agreed beside, then Disagreements (Overall risk LOW / MEDIUM / HIGH and Verdict on 04-03 approve / revise) side by side with the Reviewers disagree chip, then each review as written, closed, and the file's own consensus labelled as such.**

## What was built

- **`handlers/reviews-body.ts`.** `extractReviews(frontmatter, body)` splits reviewers only at `## {Name} Review` and `## {Name} Review ({instance})` headings (fence-aware), so a reviewer's own `## 04-02` headings stay in its body; stops at `## Consensus Summary`; carves the Plan-Revision Conflicts block out (kept as an unclaimed section). Roster from `reviewers`, `models` (a non-string model is null) and `plan_coverage`, matched by lower-cased letters and digits; a heading with no roster entry still becomes a reviewer; a file with no reviewer heading gives one reviewer with the whole text. Per reviewer: status (a stub whose only content is "failed or returned empty output" or "review skipped: prompt budget"), reduced-weight tags, concerns (`**HIGH:**`, `HIGH:`, `- MEDIUM:` under a plain Concerns line), each plan's Risk Assessment word and Verdict line, its text. The file's consensus lists and text. Caps: 500,000 characters, 20 reviewers, 300 concerns each, 2,000 characters a concern. No regular expression.
- **`handlers/reviews.ts`.** `ReviewsHandler` on the whole token `REVIEWS` (so `REVIEW` is not claimed) before the generic handler; guarded.
- **`reviews-page.ts`.** The pure composer: reviewers, concerns, `agreed`, `singles`, `disagreements`, the layout (`overlap` or `roster`), the one quiet line, the closed-bar blocks. It has no single verdict field. Returns `null` with no projection or no reviewer.
- **`reviews-overlap.ts`.** Pure geometry laid out at the figure's measured width (so labels keep the page's sizes at 390).
- **`reviews-page-components.tsx`.** Header override (eyebrow "Phase N · Cross-AI reviews", phase name as h1 via `ViewInput.phaseName`, date, plans and reviewer count as meta), the figure, the cards, the Agreed or Concerns list, the dock (an agreed concern sets each reviewer's words side by side and says how it was matched), Disagreements, the bars. Every string is React text through `ResearchInline`; no link.
- **Wiring.** `reviewsPage: composeReviews` on the reviews manifest (lead and promote fallback unchanged), `phase-10-reviews` CSS block, design-language tone rows, a page bullet and a tones bullet.

## UI-SPEC open item 4: the exact rules

**`normaliseConcern(text)`** (character scans): markdown stripped (`*`, backticks, `~`, link syntax with the link text kept, an underscore kept only inside a word so `MAX_EXPORT_LOANS` stays whole); lower-cased; spaces collapsed; any path:line citation token dropped (`src/x.ts:12`, trailing punctuation allowed); then a leading list marker, a leading severity word (HIGH, MEDIUM, LOW, with or without a colon) and a following dash dropped. `"**MEDIUM** Foo  Bar src/x.ts:12"` gives `"foo bar"`.

**First clause.** The normalised text up to the first comma, semicolon or colon, reduced to letters, digits, underscores and single spaces. A clause under 3 words (`MIN_CLAUSE_WORDS`) carries no agreement.

**Agreed, rule 1 (same opening words).** Two substantive reviewers' concerns on the same plan (both null counts as the same) whose first-clause keys are equal. Only a reviewer's first concern in a bucket joins.

**Agreed, rule 2 (the file's consensus names the reviewers together).** An Agreed Concerns line shaped `text (Claude, OpenCode). Plan 04-02.`, with a parenthesised group naming two or more substantive reviewers. Each named reviewer's concern on that plan (any plan when the line names none) that shares at least 2 key words (`MIN_SHARED_WORDS`; words of 4 or more letters, "'s" dropped, a stop list left out) with the line, the best match per reviewer, is joined when two or more reviewers have one. The agreed row then shows the file's line text. The dock says "Matched: the same opening words on the same plan", "named together in the file's consensus" or both.

**Agreed severity** is the highest among the joined concerns. **Order**: severity, then reviewer count, then file order. Whatever neither rule matches stays under its reviewer; failed and skipped lanes take no part.

**Disagreements.** Overall risk: two or more substantive reviewers state different risks (a reviewer's risk is the plans' common word, else the highest). Verdict: for a plan id, one reviewer's Verdict line states approve and another's states revise. The words live in one table (`STANCE_WORDS`: approve, approved, approves, lgtm; revise, revised, revision, rework, block, blocked, reject, rejected; `STANCE_PHRASES`: ship it, looks good; do not ship, don't ship, not ready). A verdict the table cannot read, or one holding both kinds, is no stance. Stances are shown as the file wrote them; reviewers with none sit in a hatched cell ("Review failed", "Review skipped", "Not reviewed", "No verdict stated", "Risk not stated").

**On 04-REVIEWS** this gives exactly A1 (HIGH, Claude, Codex, OpenCode, matched through the consensus only), A2 (MEDIUM, Claude and OpenCode, matched by words and by the consensus), seven concerns left under their reviewers, the risk split and the 04-03 verdict split; Qwen is in neither group.

## Four or more reviewers: the layout chosen (10-17 open item)

With four or more substantive reviewers (a failed or skipped lane is not substantive) no circle is drawn. The page shows a "Reviewers" label and the reviewer cards full width, then one quiet dashed line, "More than three reviewers took part, so the overlap is not drawn. Each row names its reviewers.", then "Agreed" (each row: number A1, text, severity chip, the reviewers' names and the plan) and "Raised by one reviewer" as rows naming their reviewer (so nothing the circles would have carried is lost), then Disagreements and the bars as usual. The same roster layout also serves a file with no concerns at all, and an unsplittable file (one card, the text in its bar). The dock opens from any row.

## Deviations from Plan

1. **[User decision 052 A] Layout.** The plan names only the "052 winner"; built as drawn (see above), with the four-reviewer fallback recorded.
2. **[Plan vs 10-17 / user decision] Matching rule.** The plan's second rule ("same plan id and the same first four words") is not built; the user decision and 10-17's README name the file's consensus naming the reviewers together instead, which is built (rule 2). Four shared words is a looser claim than the user chose. Rule 1 is the first-clause rule on the same plan, as both name.
3. **[Plan defect] 04-02 vs 04-03.** The plan's behavior block places the approve-versus-revise split "on 04-02"; the fixture, the sketch and the user's decision have it on 04-03 (Claude approve, OpenCode revise; 04-02 has one verdict). Built and tested on 04-03.
4. **[Plan vs data] Stance reading.** The plan lets "a reviewer's text for a plan" hold the approve or revise word. Built on the plan's Verdict line only (a stated stance), so a word in prose never claims a stance. Under-claims by design (RESEARCH A5).
5. **Extra fields.** `ReviewsBody` also carries `phase`, `reviewedAt` (a UTC day; `reviewed_at` parses to a Date), `others` (unclaimed sections), per-reviewer `instance`, `reducedWhy`, `plans` (risk and verdict per plan), `planIds` and `text`, and the roster's `missing`. Reviewer text travels as `text` (not only a line range, which is also kept) because the page has no body to index.
6. **Concerns with no severity.** An item under a Concerns label that states no HIGH, MEDIUM or LOW is kept with `severity: null` ("No severity", quiet) unless it reads "None" or "No concerns".
7. **Bars are native `<details>`** (the sketch's and 10-21's idiom), not a `button aria-expanded`; the text of a bar is mounted only once it is opened.
8. **Rule 3 cwd.** Harness refused compound `git`/heredoc shell commands; scratch files were written with Write and run as plain commands. No repository effect.
9. **[Dispatch] Not run:** the Playwright suite, `systemctl --user restart labelore` (the plan's last verify clause) and `--sketch` on `shoot-pages` (a scratchpad `shoot-052.mjs` shot the sketch; build shots came from `shoot-pages` on an isolated server). The service is therefore not restarted; do that after merge.
10. **Plan's known defect (snapshot one-liners on `project.artifacts`).** Not hit; the dense golden did not change.
11. **node_modules** in the worktree is a git-ignored directory of symlinks to the main checkout's (nothing installed).

## Tracer and TDD record

Task 1 (tracer): handler, extractor, composer (reviewers, cards, concerns, consensus; no derivation yet), figure, list, dock, bars, CSS and wiring shipped together (`b2badfa`); checked end to end (the named gate files: 314 passed, typecheck, build, four screenshots) before expansion. Task 2 RED (`1a16f56`): 12 composer tests failed (normaliseConcern missing, Agreed and Disagreements empty, roster note); the 22 extractor tests passed at once because the extractor was written whole in the tracer. GREEN `9f8d895` (agreement, disagreement, stance words). Two test-side fixes at GREEN: markup assertions needed `Agreed <` (the count span follows) and the lucide chevrons are SVG so "no circles" is asserted by class. Task 3 `8861386`: growth, markup safety, the contract, design-language rows.

## Side by side (sketch left, build right)

Shots in `/tmp/claude-1000/-home-cinedise-codebases-labelore/eee67f35-318e-418b-ab45-56538cdc4f26/scratchpad/build-10-22/`: `sketch/sketch-{04,01}-{1280,390}-{light,dark}.png`, `build/rv-v1-1-phase-{4,1}-reviews-{1280,390}-{light,dark}.png`, composites `pair/pair-{04,01}-{1280,390}-{light,dark}.png`, 1:1 crops `pair/crop-04-1280-dark-{a,b}.png`, and the five-reviewer scratch case `build4/rv4-v1-1-phase-4-reviews-{1280,390}-{light,dark}.png` (scratch copy `lend4/`, not committed). All eight composites were viewed, plus the 1280 dark and 390 light five-reviewer shots. The build matched at first look; one fix (below). Differences:

1. **Left: page chrome.** The app shell, the crumbs with the full file title, and the header row (the app puts copy-link and View / Source on their own right-aligned line at 1280).
2. **Left: chip typeface and quiet chip.** The sketch sets chips in mono and a `quiet` chip dashed; the shared app `status-chip` is condensed sans, and its quiet chip is a plain frame (as on every page). "Overall risk: MEDIUM" wraps to two lines in the sketch's key at 1280, one line in the build.
3. **Left: the failed lane's name.** The sketch writes "Qwen" inside the small dashed circle; the build writes it under the circle, so the label never spills out of a 17px circle at 390.
4. **Left: coverage squares.** The done square was the sketch's neutral fill; the build first drew it too pale in dark. Fixed: it is filled `--muted-foreground` (a touch lighter than the sketch's grey, left).
5. **Left: dark window surface.** Card and figure surfaces read a touch lighter in the app's dark theme (same tokens).
6. **Left: dock.** Opening a square or a row (the dock with each reviewer's words side by side) was not photographed; tested through markup and the dock composer.
7. **Dark theme, HIGH versus MEDIUM.** Checked in every dark shot: HIGH is an outline square (circle, Agreed chip, key chip, risk stance), MEDIUM a filled one; each also carries its word. They stay apart.
8. **No sideways page scroll at 390 and no page error:** `shoot-pages` printed no FAIL line for phase 1 or 4, nor for the five-reviewer scratch case.

## Verification

- `npm run test:gate -- test`: `gate: total=6243 passed=6243 failed=0 skipped=0 todo=0` (base 6170). `npm run typecheck`, `npm run lint`, `npm run build`: exit 0.
- Acceptance: `ReviewsHandler` in `handlers/index.ts`; `reviewsPage: composeReviews` once in `manifests.ts`; `Reviewers disagree` in `reviews-page.ts` and the components; `Consensus summary, as the file wrote it` in `src/web/views`; `view contract` in `test/web/reviews-page.test.ts`.
- Growth (T-10-42): the extractor stays linear in lines, across 20 reviewers and in headings (plan ids capped at 200 a reviewer); a 500,000-character body with 2,000 headings stays within caps; the composer composes 20 reviewers of 300 concerns in linear time.
- The dense golden did not change.

## Known Stubs

None.

## Open items

- **Real multi-reviewer files.** Agreement and disagreement are best-effort text matches built to under-claim (RESEARCH A5); no real multi-reviewer file has been produced on this machine, only the made-up ones. A reviewer who words a verdict outside the stance table gives no split.
- **Overall risk per plan.** The card shows the plans' common word, else the highest; no fixture has a reviewer whose plans differ, so that fallback is tested on a scratch string only.
- **Consensus-only matches** (A1) read the same as word matches in the row; the dock names the rule. Whether they should look different was left open by 10-17 and is not decided here.

## Threat Flags

None new. T-10-42 mitigated (caps, fence-aware single-pass scans, growth tests). T-10-43 mitigated (reviewer, concern and consensus text render as React text through `ResearchInline`; a planted `<img onerror>` is escaped; a reviewer's own headings never re-split the page; the contract test forbids the raw-HTML prop and any link). T-10-44 mitigated (agreement only from equal normalised clauses on one plan or a consensus line naming the reviewers; ambiguous concerns stay under their reviewer; the file's consensus is shown separately and labelled). No package installed.

## Self-Check: PASSED

- FOUND: `reviews-body.ts`, `reviews.ts`, `reviews-page.ts`, `reviews-overlap.ts`, `reviews-page-components.tsx`, `test/reviews-handler.test.ts`, `test/web/reviews-page.test.ts`.
- FOUND commits b2badfa, 1a16f56, 9f8d895, 8861386 (ancestors of HEAD).
- STATE.md and ROADMAP.md untouched.
