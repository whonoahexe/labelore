---
phase: quick-260923-jxp
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/planning-repo/handlers/section-projection.ts
  - src/web/views/layout.ts
  - src/web/views/layout-discussion-log.ts
  - src/web/views/layout-components.tsx
  - src/web/components/copy-path-button.tsx
  - src/web/components/artifact-header.tsx
  - src/web/styles/globals.css
  - docs/design-language.md
  - test/section-projection.test.ts
  - test/web/discussion-log-corpus.test.ts
  - test/web/document-layout.test.ts
  - test/e2e/document-layout.spec.ts
  - test/e2e/artifact-header.spec.ts
  - test/e2e/foundation-consistency.spec.ts
  - test/e2e/measure.ts
autonomous: true
requirements: [JXP-01, JXP-02, JXP-03, JXP-04, JXP-05, JXP-06, JXP-07, JXP-08, JXP-09, JXP-10]

estimate:
  tokens: 220000
  raw_tokens: 220000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "No discussion log drops a question: every one of the 13 corpus logs (5 in this repo's milestones/*-phases, 8 in ~/studio-portal/.planning) yields exactly its pinned question count (LB v1.0 01/02/03/04 = 16 each, LB v1.1 05 = 15; SP v1.0 01 = 4, 02 = 16, 03 = 16, 04 = 25; SP phases 01 = 19, 02 = 16, 03 = 17, 04 = 18), covering the ✓-with-parenthetical cells, no-✓ custom answers, the canonical GSD-template shape (table directly under the ## area), bold **Qn:** questions and table-less 'you decide' questions (JXP-05)"
    - "The studio-portal repro (phases/01, Cutover & bootstrap admin, 'How does the very first account come into existence?') renders as a Chosen answer card showing option 1 'CLI subcommand on the server', its description, a quiet 'renamed' qualifier chip and a 'Your words' line quoting the user's backstage instruction; ✓ (Claude's call) renders as Claude chose; a table with no ✓ plus a User's choice line renders as Custom answer with the user's text (JXP-05)"
    - "Each question's chosen answer card leads with the option's squared number badge and title, then its description, then the state; the 'N other options' disclosure opens a numbered list in source-table order (number, option title, description) in which the chosen option's real number is skipped (JXP-03, JXP-04)"
    - "A question with a Notes line shows a small quiet Note toggle in its row, hidden until activated, separate from the options disclosure (whose label never carries ' · note' again); an 'Accepted gap:' sentence inside the note gets a small inline marker only (JXP-06)"
    - "The discussion-log cover shows the log's Date as 'Mon D, YYYY' and a 'D of N offered areas' fact; declined areas named by the log appear as greyed, non-expandable 'Not discussed' rows after the real topics in both the chapter index and the chapter list (LB v1.0 01: 2, LB v1.0 03: 4, none elsewhere); unrecognised shapes produce no ghosts and no error (JXP-01, JXP-02)"
    - "On discussion logs only, the 'Also in this document' fold is replaced by an always-open Endnotes sheet at the end: small-caps subsections for Claude's Discretion / Open Questions / Deferred Ideas with hanging bullets, quieter than chapters, keeping ids chapter-also and also-<spec> so the glance and the index (last entry 'Endnotes') still jump to it, with the 'More in this document' remainder still reachable inside it; PLAN and VERIFICATION keep the Also fold unchanged (JXP-07)"
    - "Every discussion-log cover number equals what the page renders: headline and status count rendered questions, the Topics pill counts rendered topic chapters (no longer every ## section), Left to Claude counts rendered Claude-chose items, Deferred counts the first list's items in the Deferred endnote (JXP-08)"
    - "No artifact page (cover layout, plain header, plan-pair page) shows the raw file-path caption in its header; every one shows a lucide Copy icon button with an accessible label and a native tooltip of the relative path that writes the path to the clipboard and shows Check for about 1.5s, silently doing nothing when the clipboard is unavailable (JXP-09)"
    - "npm test, npm run typecheck, npm run lint and npm run test:e2e (F-01..F-15 sweep plus the document-layout and artifact-header specs, light and dark, 1280 and 420) pass, npm run build succeeds, known-per-type.json gains nothing, and the systemd instance on 4173 is never touched (JXP-10)"
  artifacts:
    - path: src/planning-repo/handlers/section-projection.ts
      provides: "Tolerant extractDiscussionLog: every question shape, resolution/qualifier/chosenIndex/settled/notes per question, question-bearing topics with a leftover flag, and log meta (date, areasDiscussed, offeredCount, declinedCount, declinedAreas)"
    - path: src/web/views/layout.ts
      provides: "Generic contract additions: ItemOption, ItemAnswer (answerCard), ItemNote, ItemDetail.options, DocumentLayoutSpec.ghosts and alsoStyle, ComposedGhost, ComposedAlsoChapter.style/title, ComposedAlsoPanel.heading/bodyHtml, ENDNOTES_TITLE"
    - path: src/web/views/layout-discussion-log.ts
      provides: "Discussion-log data: answer cards, numbered options, notes, ghosts, endnotes opt-in, truthful cover (date, offered-areas fact, counts)"
    - path: src/web/views/layout-components.tsx
      provides: "Kind-agnostic rendering of answer cards, numbered option lists, note toggles, ghost rows and the endnotes sheet"
    - path: src/web/components/copy-path-button.tsx
      provides: "CopyPathButton — lucide Copy/Check icon button writing the relative path to the clipboard"
    - path: test/web/discussion-log-corpus.test.ts
      provides: "Real-corpus guards: pinned per-log question counts and cover-numbers-equal-rendered assertions"
    - path: test/e2e/artifact-header.spec.ts
      provides: "Copy-path button present and working, raw path caption absent, on cover, plain and plan-pair pages"
  key_links:
    - from: src/planning-repo/handlers/section-projection.ts
      to: src/web/views/layout-discussion-log.ts
      via: "artifact.structured questions/topics/date/areasDiscussed/offeredCount/declinedCount/declinedAreas"
      pattern: "declinedAreas"
    - from: src/web/views/layout-discussion-log.ts
      to: src/web/views/layout.ts
      via: "answerCard, note, detail.options on items; ghosts and alsoStyle 'endnotes' on the spec"
      pattern: "alsoStyle"
    - from: src/web/views/layout-components.tsx
      to: src/web/views/layout.ts
      via: "ItemRow renders answerCard/note/options; FoldedChapters renders ghosts and the endnotes sheet by also.style"
      pattern: "answerCard"
    - from: src/web/components/artifact-header.tsx
      to: src/web/components/copy-path-button.tsx
      via: "path prop renders CopyPathButton in both header variants"
      pattern: "CopyPathButton"
---

<objective>
Apply the user's nine review items to the DISCUSSION-LOG page built by quick-260922-3us (sketch-004 B3), keeping
the B3 layout and feel. Discussion logs stop dropping questions, show numbered and titled options, keep notes behind
a quiet toggle, show the log date, the offered-area count and ghost rows for declined areas, end on an Endnotes sheet,
and have cover numbers that match the page. Every artifact page swaps the raw path caption for a copy-path icon button.

Purpose: the review found silently dropped questions (whole logs in two cases), wrong cover counts and a busy end
section. The page must be trustworthy before it replaces reading the file.

Output: tolerant parse, generic layout contract additions, discussion-log data, shared components, a copy-path
button, CSS, design-language entries, unit tests (including a real-corpus guard), e2e specs, updated foundation checks,
and a fresh build.

Requirement IDs (quick task, defined here; items numbered as in 260923-jxp-CONTEXT.md):
- JXP-01: log date on the cover (item 1)
- JXP-02: ghost chapters for declined areas and the "D of N offered areas" fact (item 2)
- JXP-03: option titles on the answer card and in the options list (item 3)
- JXP-04: numbered options with a distinctive squared numeral badge (item 4)
- JXP-05: no dropped questions, meaning ✓ variants, custom answers and every corpus question shape (item 5)
- JXP-06: notes and accepted gaps behind a quiet toggle (item 6)
- JXP-07: Endnotes sheet in place of "Also in this document", on discussion logs only (item 7)
- JXP-08: cover numbers equal what the page renders (item 8)
- JXP-09: copy-path icon button replaces the raw path caption on every artifact page (item 9)
- JXP-10: e2e and foundation coverage, all gates green, build, systemd untouched
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@.planning/quick/260923-jxp-discussion-log-page-review-fixes-on-the-/260923-jxp-CONTEXT.md
@.planning/quick/260922-3us-build-sketch-004-b3-folded-chapters-docu/260922-3us-SUMMARY.md
@docs/design-language.md
@src/planning-repo/handlers/section-projection.ts
@src/planning-repo/handlers/markdown-sections.ts
@src/web/views/layout.ts
@src/web/views/layout-discussion-log.ts
@src/web/views/layout-components.tsx
@src/web/components/artifact-header.tsx
@src/web/pages/invalid-project-screen.tsx
@test/section-projection.test.ts
@test/web/document-layout.test.ts
@test/e2e/document-layout.spec.ts

<!-- planner-discipline-allow: discussion-log -->
<!-- planner-discipline-allow: discussion-log|'plan'|'verification' -->

Live observations made at planning time (authorize scope from these; re-confirm with grep before hardcoding):

- Corpus: 13 logs. This repo has `.planning/milestones/v1.0-phases/0{1,2,3,4}-*/0N-DISCUSSION-LOG.md` and
  `.planning/milestones/v1.1-phases/05-per-type-document-views/05-DISCUSSION-LOG.md`. ~/studio-portal has
  `.planning/milestones/v1.0-phases/0{1..4}-*/` and `.planning/phases/0{1..4}-*/`. Every log has a `**Date:**` line
  (ISO `YYYY-MM-DD`) and an `**Areas discussed:**` comma list in the header region above the first `##`. None has
  frontmatter.
- Current extractor output (measured with extractDiscussionLog): SP v1.0/01 and SP v1.0/04 yield **0 questions**,
  so the layout returns null and the page falls back. SP phases/01, 02 and 04 each drop one question, whose
  Selected cell is `✓ (renamed)`, `✓ (superseded)` or `✓ (Claude's call)` respectively. The whole corpus has
  205 exact `✓` cells and these three variants.
- Question shapes seen:
  (S1) `## Topic` → `### Question` → option table → `**User's choice:**` → `**Notes:**`. This is 11 logs.
  (S2) `## Area` with the option table directly under it and no `###`. This is SP v1.0/01, and it is also the
  canonical GSD template (`~/.claude/gsd-core/templates/discussion-log.md`), so it must be supported.
  (S3) SP v1.0/04 uses bold `**Q1: …**` lines inside `##` topics, with 25 Q lines. Two of them are table-less
  and carry `— **User: "you decide"**` on the same line (Archive cautious mode Q2 and Q3). Two option tables have
  no ✓ and instead a `**User's choice (free text):** *"…"*` line, followed by a bold label line
  (`**Follow-up — confirming how to record it:**` or `**Clarification asked:**`) and a second table whose ✓ row
  settles it. A topic-level `**Notes:**` after the last Q attaches to that last question, which is acceptable.
- Notes: `**Notes:**` paragraphs wrap across continuation lines in LB v1.0/01. One note contains "Accepted gap:"
  (SP phases/01, Session lifetime). Other bold-led lines in topics: `**User's response:**`, `**Rationale:**`,
  `**Scope creep redirected:**`. Non-question `###` blocks also appear: SP phases/02 "### Model change
  (user-initiated, free text)" and LB v1.0/03 Deferred "### Gray areas noticed but not raised". Some topics have
  preambles ("Context presented:" in SP v1.0/04 ×3, "Context given:" in LB v1.0/03 Traceability view shape, and
  prose opening SP phases/04 "Execution-Time Decisions"). A fully resolved topic's group is removed from the
  remainder today, so this prose silently disappears from View mode.
- Declined-area shapes. (a) LB v1.0/01 line 10 reads `**Areas offered but not selected for discussion:** Structured-extraction
  depth, Path targeting &` and wraps onto the next line as `startup failure contract. Both were …`.
  (b) LB v1.0/03, under `### Gray areas noticed but not raised`, reads "Offered at wrap-up and declined: A, B, C, and D.
  All four were …". (c) LB v1.0/01 has the `## Claude's Discretion` paragraph "Two gray areas were identified during
  analysis, offered, and deliberately left open rather than\nlocked — …:" followed by `- **Structured-extraction
  depth** — …` and `- **Path targeting mechanics (TGT-01/TGT-02)** — …`. (d) SP phases/04 `## Open Questions
  Carried Forward` reads "Three gray areas were offered at the end and the user chose to proceed to context rather
  than discuss them. … : where …; whether …; and whether …" and is not parsed into names, per the user decision.
  The all-selected sentences are "All eight gray areas offered were selected for discussion." (SP v1.0/04),
  "The user selected all four offered gray areas." (SP phases/01) and "All four offered gray areas were selected
  for discussion." (SP phases/03). Look-alikes that must NOT produce ghosts: SP phases/04 Deferred ("…every idea
  recorded as deferred is a *declined option*…" then bold bullets, with no "gray area"), SP v1.0/04 Discretion
  ("Explicitly delegated by the user:" then bold bullets), and SP phases/01 Deferred bullets ending "— offered,
  passed over".
- Cover bug: `structured.topics` lists every `##` section (Claude's Discretion, Deferred Ideas, Open Questions …),
  so the Topics pill reads 6 on logs with 4 topic chapters (8 on SP phases/04, 10 on SP v1.0/04). The headline and
  status total sum `questionCount` over all sections.
- Header: `src/web/components/artifact-header.tsx` renders the file-path caption paragraph in both variants
  (plain, and inside `.document-cover-copy`). ArtifactPage and PlanPairPage both pass `path`. The same CSS class is
  still used by the warning-details `dd` in artifact-page.tsx, so keep its CSS and doc row, and reword the row's role.
  `src/web/pages/invalid-project-screen.tsx` `CopyField` is the house copy pattern: `Button size="icon-sm"`,
  lucide `Copy`→`Check` for 1500ms, silent try/catch, and a timeout cleared on unmount. `test/web/invalid-project-contract.test.ts`
  pins that try/catch shape for its own file. There is no Tooltip primitive in `src/web/components/ui/`. lucide-react
  1.34 exports `Copy`, `Check` and `StickyNote`.
- Contract tests still in force: `test/web/view-page-contract.test.ts` (literal `data-tone="active"` only on a
  Chosen/Gates line, no destructive/warning tone in views, a single ArtifactHeader, `artifact.kind === '` at most
  twice in artifact-page.tsx); `test/web/class-vocabulary.test.ts` (every className in views/pages/components is
  documented in docs/design-language.md tables); `test/web/css-source-order.test.ts`; `test/token-guard.test.ts`.
  e2e F-05 compares every visible `.status-chip`'s font-size, weight, padding, transform, letter-spacing and
  line-height with the dashboard chip, so chips must inherit body line-height. F-06 checks CORNER_SELECTORS for
  radius 0. F-11 clicks `#chapter-also .document-fold-head` only when present, then asserts
  `details#view-remainder`. The F-sweep's discussion-log page is the lexically smallest path, LB v1.0/01.
- e2e: Playwright serves this repo (`node src/server/index.ts . --port 4199`). The studio-portal corpus is reachable
  only from unit tests, which follow the house pattern `it.runIf(existsSync(path))` (see
  test/rendering/plan-sections.test.ts). `runFullBehaviorChecks` currently asserts `index li count === .document-fold
  count`, clicks the last index button, expects `#chapter-also[data-open="true"]`, and clicks `#chapter-also
  .document-fold-head`. All of this changes once ghosts and endnotes land (Task 2).
- The systemd instance (4173) serves ~/studio-portal from prebuilt dist/ and a build-watch unit rebuilds dist/. The
  parse change is server code, so it only reaches the tailnet after the user restarts labelore.service themselves.
  The executor never does.
- No new dependencies. No ROADMAP phase applies to this quick task, so the api-coverage, assumption-delta and
  schema-push planner hooks resolve to skipped or not detected. No COVERAGE.md is written and there is no schema task.

<interfaces>
Existing (unchanged unless listed below): `DocumentLayoutSpec`, `ChapterItem`, `ItemDetail`, `ComposedChapter`,
`ComposedAlsoPanel`, `ComposedAlsoChapter`, `composeDocumentLayout`, `rollupOf`, `chapterForTarget`, `ALSO_CHAPTER_TITLE`
in src/web/views/layout.ts; `useChapterFolds`, `CoverFacts`, `CoverCells`, `ChapterBar`, `FoldedChapters` in
layout-components.tsx; `stripLeadingHeading`, `countListItems`, `listItemTexts` in document-sections.ts;
`splitSections`, `splitSubsections`, `parseMarkdownTable` in markdown-sections.ts.

New or changed contract (names binding; internals the executor's):

```ts
// src/planning-repo/handlers/section-projection.ts
export type DiscussionResolution = 'chosen' | 'claude' | 'custom' | 'open';
export interface DiscussionQuestion {            // existing fields kept: topic, question, options, chosenOption,
  // chosenDescription ('' when no ✓ row), userChoice
  chosenIndex: number | null;                    // 1-based source-table row of the first ✓-prefixed cell
  qualifier: string | null;                      // parenthetical after ✓: 'renamed' | "Claude's call" | 'superseded' | …
  resolution: DiscussionResolution;
  settled: { option: string; description: string; prompt: string | null } | null; // ✓ row of a later table in the same question block, used only when the option table has no ✓
  notes: string | null;                          // **Notes:** paragraph, continuation lines joined by one space
}
export interface DiscussionTopic { heading: string; questionCount: number; resolvedCount: number; leftover: boolean }
export interface DiscussionLogProjection {
  questions: DiscussionQuestion[];               // every question, including 'open' ones
  topics: DiscussionTopic[];                     // only ## sections holding >= 1 question
  date: string | null; areasDiscussed: string[] | null;
  offeredCount: number | null; declinedCount: number | null; declinedAreas: string[];
}
export function extractDiscussionLog(body: string): DiscussionLogProjection;

// src/web/views/layout.ts additions (all optional on inputs, so plan/verification data is untouched)
export interface ItemOption { number: number | null; title: string; description: string | null }
export interface ItemAnswer { option: ItemOption | null; qualifier: string | null; words: string | null }
export interface ItemNote { label: string; segments: { text: string; mark: string | null }[] }
//   ChapterItem += answerCard?: ItemAnswer | null; note?: ItemNote | null
//   ItemDetail  += options?: ItemOption[]
export interface GhostChapter { key: string; title: string; label: string }
export interface ComposedGhost extends GhostChapter { id: string }          // id = `ghost-<slug(key)>`
//   DocumentLayoutSpec += ghosts?: (input: ViewInput) => GhostChapter[] | null; alsoStyle?: 'fold' | 'endnotes'
//   DocumentLayoutSpec.cover parts += ghosts: ComposedGhost[]
//   ComposedDocumentLayout += ghosts: ComposedGhost[]
//   ComposedAlsoChapter += style: 'fold' | 'endnotes'; title: string      // ALSO_CHAPTER_TITLE | ENDNOTES_TITLE
//   ComposedAlsoPanel += heading: string; bodyHtml: string                // bodyHtml = stripLeadingHeading(html)
export const ENDNOTES_TITLE = 'Endnotes';

// src/web/views/layout-components.tsx — ChapterFolds gains openNotes: ReadonlySet<string>; toggleNote(id: string): void

// src/web/components/copy-path-button.tsx
export function CopyPathButton(props: { path: string }): React.JSX.Element;
```
</interfaces>
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Every question renders with a numbered, titled answer card, numbered options and a quiet note (parse to page)</name>
  <files>src/planning-repo/handlers/section-projection.ts, src/web/views/layout.ts, src/web/views/layout-discussion-log.ts, src/web/views/layout-components.tsx, src/web/styles/globals.css, docs/design-language.md, test/section-projection.test.ts, test/web/discussion-log-corpus.test.ts, test/web/document-layout.test.ts, test/e2e/document-layout.spec.ts</files>
  <precondition>The studio-portal repro corpus exists: `test -d /home/cinedise/studio-portal/.planning/phases/01-portal-owned-identity-sessions`</precondition>
  <read_first>src/planning-repo/handlers/section-projection.ts, src/planning-repo/handlers/markdown-sections.ts, src/web/views/layout-discussion-log.ts, src/web/views/layout.ts, src/web/views/layout-components.tsx, test/section-projection.test.ts, /home/cinedise/studio-portal/.planning/phases/01-portal-owned-identity-sessions/01-DISCUSSION-LOG.md (lines 60-110), /home/cinedise/studio-portal/.planning/milestones/v1.0-phases/04-tier-to-tier-transfers/04-DISCUSSION-LOG.md (lines 1-200), /home/cinedise/studio-portal/.planning/milestones/v1.0-phases/01-identity-persistence-foundation/01-DISCUSSION-LOG.md (lines 1-40)</read_first>
  <behavior>
    - S1 synthetic: a `✓ (renamed)` cell resolves as chosen with qualifier 'renamed' and chosenIndex = its 1-based row; `✓ (Claude's call)` resolves 'claude'; `✓ (superseded)` resolves 'chosen' with qualifier 'superseded'; an exact `✓` still resolves with qualifier null; the first ✓-prefixed row wins (existing D-06 test kept)
    - S1 synthetic: no ✓ row plus a User's choice line resolves 'custom' (chosenOption '' and chosenIndex null); no ✓ and no choice resolves 'open' and is still returned; a userChoice or chosen option reading "you decide" resolves 'claude'
    - S2 synthetic (a table directly under ##, no ###) gives one question whose title is the ## heading
    - S3 synthetic (bold **Q1:** lines): one question per Q line; a table-less `**Q2: …** — **User: "you decide"**` resolves 'claude' with userChoice 'you decide' and no options; a no-✓ option table plus a free-text choice plus a bold-label follow-up table with a ✓ row resolves 'custom' with settled = that row and prompt = the label text
    - notes: a wrapped **Notes:** paragraph is joined into one string; User's choice continuation lines are joined the same way; notes and choice stop at a blank line or the next bold label line
    - topics: only ## sections with >= 1 question are listed; questionCount = questions in it, resolvedCount = those not 'open'; leftover is true when the section holds any non-blank line outside recognised question material (heading/Q lines, table rows, choice/notes paragraphs, follow-up label lines, `---`), such as a preamble or a non-question ### block
    - a 100k-character single line of `|`, `*` and `✓` runs through extractDiscussionLog in under 200ms (bounded regexes, T-jxp-02)
    - corpus (test/web/discussion-log-corpus.test.ts): each of the 13 logs yields its pinned question count (LB v1.0 01/02/03/04 = 16, LB v1.1 05 = 15; SP v1.0 01 = 4, 02 = 16, 03 = 16, 04 = 25; SP phases 01 = 19, 02 = 16, 03 = 17, 04 = 18); LB files always run; SP files use it.runIf(existsSync(path)); the SP phases/01 repro question has resolution 'chosen', chosenIndex 1, qualifier 'renamed', userChoice containing 'backstage'
    - layout: state by resolution is chosen → Chosen/active/rollup 'chosen', claude → Claude chose/active/'by Claude', custom → Custom answer/active/'custom', open → Open/quiet/'open'; every question becomes an item (none filtered)
    - layout answerCard: option = {chosenIndex, chosenOption, chosenDescription or null} when chosenIndex is set, else {null, settled.option, settled.description} when settled, else null; qualifier is null when it names Claude; words = userChoice when it is not "you decide" and, after trimming quotes/asterisks/backticks and case-folding, differs from the option title
    - layout detail: options = the source-table options with their 1-based numbers minus the chosen one; label "N other option(s)" when one is chosen, "N option(s) offered" when none is; detail null when the list is empty; the label never contains "note"
    - layout note: notes → { label: 'Note', segments } where a sentence starting "Accepted gap:" becomes a segment with mark 'Accepted gap' (prefix removed from its text); no notes → note null
    - accountsFor is the topic's group exactly when the topic is not leftover (a leftover topic's group stays in the remainder, so its prose remains reachable)
  </behavior>
  <action>
Thin vertical slice first: the chosen answer card with its number and title, fed by the new chosenIndex, runs from the parse through the layout data and the shared components to CSS, the doc and e2e. Then widen the parse to every question shape and add the options list and the note toggle on the same path. Write the behavior list as failing tests first (RED), then implement (GREEN).

1. `src/planning-repo/handlers/section-projection.ts`, per JXP-05 and the CONTEXT's custom-answer discretion:
   - Rewrite `extractDiscussionLog` to the `<interfaces>` contract, still composed from `splitSections`/`splitSubsections`/`parseMarkdownTable` and line scanning.
   - Per `##` section, pick the question mode.
     - S1: the section has `###` subsections that contain an option table. Each such subsection is a question, and a `###` without a table counts as leftover.
     - S3: there are no such `###` and the section has lines matching a bounded bold-Q pattern (`**Q<digits>` … `**`). Split the body into question blocks at those lines. The title is the bold text. An inline trailing `— **User: …**` becomes the userChoice (strip surrounding quotes).
     - S2: neither of the above, but the section body holds an option table. The section is one question titled by its heading.
   - Inside a question block, split consecutive pipe lines into separate tables. Never feed two tables to `parseMarkdownTable` at once. The first table with Option and Selected headers is the option table. The chosen row is the first whose Selected cell, trimmed, starts with ✓. Its qualifier comes from a bounded `✓ (…)` match, capped at 60 characters.
   - When the option table has no ✓, the first ✓ row of any later table in the block is `settled`. Its prompt is the bold label line directly above that table, with `**` and the trailing colon stripped.
   - Resolution rules: 'claude' when the qualifier mentions Claude (case-insensitive), or when userChoice or chosenOption reads "you decide". Otherwise 'chosen' when a ✓ row exists, 'custom' when a non-empty userChoice exists, and 'open' otherwise.
   - Extend the User's choice extraction and add Notes extraction (`**Notes:**`, also accepting `**Note:**`). Each is a paragraph whose continuation lines run until a blank line or the next bold-label line, joined with single spaces.
   - Compute `leftover` per the behavior list. Keep T-01-11/T-05-01 discipline: every regex is single-line and bounded, and no whole-document regex.
   - In this task, return `date`, `areasDiscussed`, `offeredCount`, `declinedCount` and `declinedAreas` as null/null/null/null/[]. Task 2 fills them.
   - Update the JSDoc: the ✓ cell still anchors which option was chosen, and the user's-choice line now also resolves custom answers.

2. `test/section-projection.test.ts`: update the survey-derived tests the CONTEXT says to update.
   - The Phase 5 fixture now gives 15 questions across 4 topics.
   - Replace "discussion-free topics with questionCount 0" with "non-question sections are not topics".
   - A no-✓ question is now returned as 'open', or as 'custom' when a choice line is present. The old "never uses the userChoice line" test becomes "the ✓ cell alone decides chosenIndex; a choice line without ✓ resolves custom with chosenIndex null".
   - Keep the registry, parseDecisionEntries and extractReviewWarnings tests unchanged.
   - Add the synthetic shape, notes, leftover and timing cases from the behavior list.

3. `test/web/discussion-log-corpus.test.ts` (new): add the pinned per-log counts and the repro assertions from the behavior list. Give each log its own `it`, so a failure names the log. Use absolute studio-portal paths under `/home/cinedise/studio-portal/.planning/` gated by `it.runIf(existsSync(...))`. This repo's logs are read with `new URL('../../.planning/…', import.meta.url)`.

4. `src/web/views/layout.ts`: add `ItemOption`, `ItemAnswer`, `ItemNote`, `ChapterItem.answerCard?`, `ChapterItem.note?` and `ItemDetail.options?` exactly as in `<interfaces>`. Leave the composer untouched in this task. Everything added is optional, so the plan and verification layouts compile and render unchanged.

5. `src/web/views/layout-discussion-log.ts`: build items per the behavior list (state, answerCard, detail.options and label, note), replacing the old `answer` and "Your words"/" · note" detail rows. Keep `ref: Q<n>` per topic. Set `accountsFor` from `!leftover`, matching the group by trimmed, case-insensitive heading as today. Point the glance body at `answerCard.option?.title` (falling back to the item title). Leave the cover counts alone in this task; Task 2 fixes them.

6. `src/web/views/layout-components.tsx`. Stay kind-agnostic, and render every string as a JSX text node. Nothing here may inject HTML except through the existing `renderHtml` prop.
   - `ItemRow` with an `answerCard` renders `div.document-answer` in place of the old state line. It holds:
     - `p.document-answer-option` with `span.document-option-number` (the number, omitted when null) and `span.document-option-title`
     - `p.document-option-desc` when there is a description
     - `p.document-answer-words` with a `span.document-item-detail-label` "Your words" and the text, when words is set
     - the existing `.document-item-state` line holding the state chip and a quiet `status-chip` qualifier when set
     This follows the user's order of number and title, then description, then state.
   - Without an `answerCard`, the current `.document-item-state`/`.document-item-answer` path stays byte-for-byte, so plan and verification are untouched.
   - When `detail.options` is present, the revealed detail renders `ol.document-option-list` of `li.document-option`. Each row has `span.document-option-number`, `span.document-option-title` and, when present, `span.document-option-desc`, with the source's title-then-description order (em-dash separator in JSX or CSS, executor's call). Rows and html still render when present.
   - When `item.note` is set, the item head gets `button.document-item-note-toggle`, a tiny quiet text button with the lucide `StickyNote` icon (aria-hidden) and the text "Note". It carries aria-expanded and aria-controls `<item id>-note`. It sits after the chips cluster, not inside the options disclosure.
   - When open, it renders `div.document-item-note#<item id>-note`. Each segment is its text, and a marked segment is preceded by `span.document-item-note-mark` holding the mark.
   - Add `openNotes` and `toggleNote` to `useChapterFolds` (a separate Set). Expand all and collapse all never touch notes, and jumpTo never opens a note.

7. `src/web/styles/globals.css`: place the new rules after the existing `.document-item*` rules, with any media override after its base rule (css-source-order).
   - `.document-answer`: a quiet card with a 1px `--border` rule, token padding and squared corners.
   - `.document-option-number`: the distinctive squared numeral badge. Use `--font-mono`, `--fs-2`, `--fw-semibold`, a token min-inline-size so single digits and 10+ align, a 1px `--border` border, `--muted` background and `--foreground` text. Inside `.document-answer` it inverts (`--foreground` background, `--background` text) so the chosen number stands out without spending the `--primary` accent.
   - `.document-option-list`: no list-style; a grid of rows with the badge in the first column.
   - `.document-option-desc`: muted.
   - `.document-answer-words`: muted, with the text in quotes.
   - `.document-item-note-toggle`: `--fs-2`, muted foreground, hover to `--foreground`, no border, a squared focus ring from the existing focus tokens.
   - `.document-item-note`: `--fs-3`, muted, with a left rule.
   - `.document-item-note-mark`: small caps or uppercase `--fs-1` label.
   - Chips inside these containers must inherit body line-height and font-size (F-05), so never set font-size or line-height on a chip's parent.
   - Token-only spacing, only `--fw-medium`/`--fw-semibold`, squared corners, light and dark from existing tokens, and no horizontal overflow at 420px: long option titles wrap and the badge never shrinks.

8. `docs/design-language.md`: add one `## Shared vocabulary` row per new class: document-answer, document-answer-option, document-answer-words, document-option-number, document-option-title, document-option-desc, document-option-list, document-option, document-item-note-toggle, document-item-note, document-item-note-mark. Each gets its role and "globals.css — discussion-log review fixes (quick-260923-jxp)". In the Tones table, add the "Custom answer" state to `active` (it is the user's chosen answer) and the "Open" state and qualifier chips to `quiet`.

9. `test/web/document-layout.test.ts`: rewrite the discussion-log cases that pinned the old detail label and "Your words" row to the new behavior. Update the `discussionQuestion()` helper defaults for the new fields. All plan and verification cases stay as they are.

10. `test/e2e/document-layout.spec.ts`: add a `test.describe('discussion-log review fixes (quick-260923-jxp)')`. On 05 at 1280 in light, after Expand all:
    - the first `.document-item` has a `.document-answer` whose `.document-option-number` is digits and whose `.document-option-title` is non-empty
    - opening its options toggle shows a `.document-option-list` whose badge numbers strictly increase and skip the answer card's number
    - no options toggle label contains "note"
    - at least one `.document-item-note-toggle` exists; its `.document-item-note` is absent until clicked, then visible with aria-expanded true
    Plain `expect`. Fail, never skip, when a fixture lacks the element.
  </action>
  <verify>
    <automated>npx vitest run test/section-projection.test.ts test/web/discussion-log-corpus.test.ts test/web/document-layout.test.ts test/web/document-layout-types.test.ts test/web/view-page-contract.test.ts test/web/class-vocabulary.test.ts test/web/css-source-order.test.ts test/token-guard.test.ts && npm run typecheck && npm run lint && npx playwright test test/e2e/document-layout.spec.ts</automated>
  </verify>
  <done>All 13 corpus logs parse to their pinned question counts, the studio-portal repro resolves as a renamed Chosen answer with the user's words, every discussion question renders a numbered and titled answer card (or its custom, Claude or open state), the options disclosure is a numbered source-order list, notes sit behind a quiet toggle, plan and verification rendering is unchanged, and the listed tests, typecheck, lint and the document-layout e2e spec pass.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The cover tells the truth, with date, offered areas, ghost chapters for declined areas and an Endnotes sheet</name>
  <files>src/planning-repo/handlers/section-projection.ts, src/web/views/layout.ts, src/web/views/layout-discussion-log.ts, src/web/views/layout-components.tsx, src/web/styles/globals.css, docs/design-language.md, test/section-projection.test.ts, test/web/discussion-log-corpus.test.ts, test/web/document-layout.test.ts, test/e2e/document-layout.spec.ts</files>
  <read_first>src/web/views/layout.ts (composeDocumentLayout, chapterForTarget), src/web/views/layout-components.tsx (useChapterFolds, CoverCells, ChapterBar, AlsoFold, FoldedChapters), .planning/milestones/v1.0-phases/01-read-layer-domain-model/01-DISCUSSION-LOG.md (lines 1-15, 225-245), .planning/milestones/v1.0-phases/03-search-browsing-traceability/03-DISCUSSION-LOG.md (lines 225-240), /home/cinedise/studio-portal/.planning/phases/04-bulk-archive-downloads/04-DISCUSSION-LOG.md (lines 1-12, 204-230)</read_first>
  <behavior>
    - meta parse: date = the `**Date:**` value from the header region; areasDiscussed = the `**Areas discussed:**` value split on commas outside parentheses, trimmed; both are null when absent
    - offeredCount: from an "all <N> … offered … gray area(s) … selected" sentence (digits or number words one to twelve, in any of the three corpus word orders): SP v1.0/04 = 8, SP phases/01 = 4, SP phases/03 = 4; null otherwise
    - declinedAreas, first shape that yields >= 1 name wins, in order (b), (c), (a): (b) the text after "declined:" on a line that also says offered, up to the first sentence end, split on commas and a final "and"; (c) in a non-topic section, a paragraph mentioning gray area(s), offered, and one of left open / declined / not selected / not discussed, followed by a list whose items start with **bold** names; (a) the `**Areas offered but not selected…:**` value (continuation lines joined), first sentence, split the same way. Names are trimmed with the first letter uppercased. LB v1.0/01 gives ['Structured-extraction depth', 'Path targeting mechanics (TGT-01/TGT-02)'], LB v1.0/03 gives 4 names starting 'Sidebar auto-collapse on long-form pages', and every other corpus log gives [] (the look-alikes in the context must not match)
    - declinedCount: from a "<N> gray area(s) were …" paragraph in a non-topic section that also says offered and one of declined / left open / rather than discuss / not selected; SP phases/04 = 3, LB v1.0/01 = 2; null otherwise
    - composer: ghosts come from spec.ghosts (null or [] gives []), with ids `ghost-<slug(key)>`; ghosts are neither numbered nor counted, and they never make a layout on their own (zero chapters still returns null); alsoStyle 'endnotes' gives also.style 'endnotes' and title ENDNOTES_TITLE, while default and 'fold' give 'fold' and ALSO_CHAPTER_TITLE; each panel carries heading (group heading) and bodyHtml (stripLeadingHeading of its html); cover receives ghosts in parts
    - chapterForTarget still resolves chapter-also, also-<spec> panel ids and embedded ids with alsoStyle 'endnotes'
    - discussion ghosts: one per declinedArea with label 'Not discussed', title = the name, and key = the name
    - discussion cover: headline value = decided count (items not Open), label 'questions decided' or 'of T questions decided' with T = rendered items; status 'D of T decided' (complete when D === T, else in-flight); pills Topics = chapters.length, Left to Claude = items whose state is Claude chose, Deferred = the deferred panel's count (each only when non-zero)
    - discussion facts: [{label: 'Logged', value: 'Mon D, YYYY'}] from `date` (else a string frontmatter.date; omitted when neither parses as YYYY-MM-DD, with the raw string used only when it is non-empty and not ISO), then [{label: 'Discussed', value: 'D of N offered areas'}] with D = areasDiscussed length (else chapters.length) and N = D + declinedAreas length, else D + declinedCount, else offeredCount, else D
    - real-log cover numbers (corpus test, with extractDiscussionLog output and groups []): for LB v1.0/01, LB v1.0/03 and the runIf SP phases/01, phases/04 and v1.0/04, headline value === items not Open, T === total items, Topics pill === chapters.length, Left to Claude === Claude-chose item count, and the Discussed fact reads 4 of 6 (LB 01), 4 of 8 (LB 03), 4 of 4 (SP phases/01), 4 of 7 (SP phases/04), 8 of 8 (SP v1.0/04)
  </behavior>
  <action>
Document-level items (JXP-01, JXP-02, JXP-07 and JXP-08) through the same layers. Tests first (RED), then implement (GREEN).

1. `src/planning-repo/handlers/section-projection.ts`: fill `date`, `areasDiscussed`, `offeredCount`, `declinedCount` and `declinedAreas` per the behavior list and the CONTEXT's unselected-gray-areas decision.
   - Scan the header region (lines before the first `##`) for the bold header lines and the "all N offered" sentence.
   - Scan non-topic `##` sections (sections that yielded zero questions), including their `###` sub-blocks, paragraph by paragraph (lines joined between blank lines), for shapes (b), (c) and the declined-count sentence. Shape (a) and the all-N sentence may sit in the header region.
   - Do not force the SP phases/04 where/whether prose into names. Its count alone feeds `declinedCount`, per the user decision.
   - Unrecognised prose yields null/[] and never throws.
   - Same bounded, per-line or per-paragraph regex discipline as Task 1.
   Add synthetic tests for each shape and each look-alike, and corpus assertions for LB v1.0/01 and 03 plus the runIf SP logs.

2. `src/web/views/layout.ts`: implement the Task-2 half of `<interfaces>`:
   - `GhostChapter`, `ComposedGhost`, `DocumentLayoutSpec.ghosts` and `alsoStyle`
   - `ComposedDocumentLayout.ghosts`, `ComposedAlsoChapter.style`/`title` and `ComposedAlsoPanel.heading`/`bodyHtml`
   - `ENDNOTES_TITLE`, and ghosts passed to `cover`
   Numbering is unchanged: the Also or Endnotes number is still one past the last real chapter, and ghosts take no number. `chapterForTarget` keeps using the panel's full `html` for embedded ids, so deep links to the original section slug still resolve. Keep this file free of kind names (grep gate below).

3. `src/web/views/layout-discussion-log.ts`:
   - Add `ghosts` from `structured.declinedAreas`, per JXP-02.
   - Set `alsoStyle: 'endnotes'`, per JXP-07. Keep the discretion, open-questions and deferred AlsoSpecs and their ids.
   - Rewrite `cover` per the behavior list (JXP-01, JXP-08): no count may come from `structured.topics` totals or `questionCount` sums. Headline, status and pills count what `parts.chapters` renders.
   - Format the date with a small local helper using the same short month names as `shortQuickDate` in src/presentation/tree-labels.ts, giving "Aug 21, 2026".
   The plan and verification layouts are not touched, so they keep the default fold.

4. `src/web/views/layout-components.tsx`, still kind-agnostic:
   - `CoverCells` index order is chapters, then ghosts, then the Also/Endnotes entry, titled from `also.title`. A ghost entry is `li[data-ghost="true"]` holding non-interactive spans: `.document-chapter-index-number` showing an en dash, `.document-chapter-index-title`, and a quiet `status-chip` with the ghost label. It gets no button.
   - `FoldedChapters` renders the fold tools, the chapter folds, then one `div.document-ghost#<ghost id>` per ghost. Each ghost row reuses the fold-head grid with an en-dash `.document-fold-number`, a `span.document-ghost-name` and a quiet `status-chip` "Not discussed". It has no button, no chevron and no body.
   - Then comes `AlsoFold` when `also.style` is 'fold' (unchanged markup), or a new `EndnotesSheet` when it is 'endnotes':
     - `section.document-endnotes#chapter-also` with tabIndex -1 and an `h2.document-endnotes-title` reading `also.title`
     - one `section.document-endnote#<panel id>` per panel, with tabIndex -1, an `h3.document-endnote-title` holding `panel.heading` and `renderHtml(panel.bodyHtml)`
     - then the unchanged remainder disclosure (`details.artifact-metadata#view-remainder`, summary REMAINDER_LABEL plus the "N section(s)" span), so F-11 keeps its structure
     The sheet is always rendered, never folded.
   - `ChapterBar` titles its active entry from `also.title`.
   - `useChapterFolds`: expandable ids (for allOpen, expandAll and collapseAll) exclude an endnotes-style Also chapter and all ghosts. The ids `ChapterBar` feeds `useActiveSection` still include `chapter-also`.
   - jumpTo's chapter-target focus falls back to the chapter element itself when it has no `.document-fold-head` (the endnotes sheet). Panel targets already scroll and focus by id.
   - Render every ghost name and heading as JSX text.

5. `src/web/styles/globals.css`: place the new rules after the `.document-fold*` and `.document-also*` rules, with media overrides after their base rules.
   - `.document-ghost`: the fold-head column grid at wide widths and the same restack at the 42rem breakpoint. Muted foreground, a dashed 1px `--border`, no hover or cursor affordance. Put its name size on `.document-ghost-name` so the chip keeps inherited line-height (F-05).
   - `.document-endnotes`: a typographic back-matter sheet. It has a top 1px `--border` rule and token spacing above, reads quieter than chapters (`--fs-3` body, `--muted-foreground` text), and uses no card background.
   - `.document-endnotes-title` and `.document-endnote-title`: small caps (`font-variant-caps: all-small-caps`, or the eyebrow's uppercase plus `--ls-widest` if small caps render poorly in `--font-heading`, executor's call), `--fw-semibold`, muted.
   - `.document-endnote`: token gap between subsections. Hanging bullets on its lists, meaning the bullet sits outside the text column so wrapped lines align with the first line's text. Use no negative margins (F-14).
   - Squared corners, tokens only, light and dark.

6. `docs/design-language.md`:
   - Add rows for document-ghost, document-ghost-name, document-endnotes, document-endnotes-title, document-endnote and document-endnote-title, with "globals.css — discussion-log review fixes (quick-260923-jxp)".
   - Note the `data-ghost` index attribute.
   - Extend the quiet-tone "Used for" cell with the "Not discussed" ghost chip.
   - Add one bullet under "Language beyond names": the discussion log ends on an Endnotes sheet (opt-in `alsoStyle: 'endnotes'`), while plan and verification keep the folded Also chapter.

7. `test/web/document-layout.test.ts`: add composer tests (ghosts, alsoStyle, panel heading/bodyHtml, chapterForTarget under endnotes) and discussion cover and facts tests. Replace "cover facts is always empty". Keep the `ALSO_CHAPTER_TITLE` test and add one for `ENDNOTES_TITLE`.

8. `test/e2e/document-layout.spec.ts`:
   - Update `runFullBehaviorChecks` for the new shapes. Do not weaken it, and comment each change as quick-260923-jxp.
     - Index `li` count equals `.document-fold` + `.document-ghost` + `.document-endnotes` counts.
     - The last index button targets `#chapter-also`. For a fold-style Also, keep the data-open assertion and the collapse-back click. For `.document-endnotes`, assert it has no `.document-fold-head` and poll until it scrolls into the viewport.
     - In the 05 reference-preview test, click `#chapter-also .document-fold-head` only when present.
   - In the jxp describe block, add these checks:
     - LB 01 shows 2 `.document-ghost` rows and 2 `li[data-ghost]`, each reading "Not discussed", with facts "Aug 21, 2026" and "4 of 6 offered areas". LB 03 shows 4 ghosts and "4 of 8 offered areas". LB 02 shows 0 ghosts, "Aug 25, 2026" and "4 of 4 offered areas".
     - On 05, `.document-endnotes#chapter-also` contains `#also-deferred`, and the last index entry reads "Endnotes".
     - On each of LB 01/02/03/05 after Expand all: the headline number equals the `.document-item` count, the Topics pill equals the `.document-fold` count, the Left to Claude pill (when present) equals the items whose state chip reads "Claude chose", and the Deferred pill (when present) equals the direct `li` children of the first list inside `#also-deferred`.
   - PLAN and VERIFICATION fixtures must still pass unchanged: they keep `#chapter-also.document-fold`.
  </action>
  <verify>
    <automated>npx vitest run test/section-projection.test.ts test/web/discussion-log-corpus.test.ts test/web/document-layout.test.ts test/web/document-layout-types.test.ts test/web/view-page-contract.test.ts test/web/class-vocabulary.test.ts test/web/css-source-order.test.ts test/token-guard.test.ts && npm run typecheck && npm run lint && test "$(grep -vE '^\s*(//|\*|/\*)' src/web/views/layout-components.tsx src/web/views/layout.ts | grep -cE "discussion-log|'plan'|'verification'")" = "0" && npx playwright test test/e2e/document-layout.spec.ts</automated>
  </verify>
  <done>Discussion-log covers show the log date and a truthful "D of N offered areas" fact; LB v1.0/01 and 03 show 2 and 4 greyed "Not discussed" rows in index and list; the log ends on an always-open Endnotes sheet whose anchors, glance and index jump still work and which still holds the remainder; every cover number equals the rendered count (unit test on real logs plus e2e); plan and verification still use the Also fold; the shared files name no kind; tests, typecheck, lint and the e2e spec pass.</done>
</task>

<task type="auto">
  <name>Task 3: Copy-path button on every artifact page, then foundation sweep, all gates and build</name>
  <files>src/web/components/copy-path-button.tsx, src/web/components/artifact-header.tsx, src/web/styles/globals.css, docs/design-language.md, test/e2e/artifact-header.spec.ts, test/e2e/foundation-consistency.spec.ts, test/e2e/measure.ts</files>
  <read_first>src/web/components/artifact-header.tsx, src/web/pages/invalid-project-screen.tsx (CopyField), src/web/pages/plan-pair-page.tsx (lines 170-195), test/e2e/measure.ts (CORNER_SELECTORS), test/e2e/foundation-consistency.spec.ts (F-06, F-10, F-11, F-13)</read_first>
  <action>
1. `src/web/components/copy-path-button.tsx` (new), per JXP-09 and the CONTEXT's copy-path discretion. Export `CopyPathButton({ path })`, mirroring CopyField's shape:
   - `Button` from `./ui/button.tsx`, with `type="button"`, `size="icon-sm"`, `variant="ghost"` and `className="artifact-path-copy"`
   - `aria-label="Copy file path"` and a native `title={path}` tooltip showing the relative path (no Tooltip primitive exists, and none is added)
   - `data-copied` set to "true" while copied
   - lucide `Copy`, swapping to `Check` for 1500ms after a successful `navigator.clipboard.writeText(path)` inside try/catch
   - a silent catch, so an unavailable clipboard (including an undefined `navigator.clipboard`) changes nothing
   - a timeout ref cleared on unmount
   - a visually hidden `span.sr-only` with `role="status"` that reads "Path copied" while copied, and is empty otherwise
   Only `path` (the project-relative artifact path) is ever written. Never the root path.

2. `src/web/components/artifact-header.tsx`: remove the raw file-path caption paragraph from both variants entirely. Render `<CopyPathButton path={path} />` when `path` is non-empty:
   - in the cover variant, as the first child of `.document-cover-controls`, before the chip and toggle
   - in the plain variant, in the slot the caption occupied (after the lede, before `children`)
   Keep the `path` prop name and every other slot and order unchanged. Update the doc comment by concept ("the path is offered as a copy button, not printed") without naming the removed caption class. ArtifactPage and PlanPairPage need no change: both already pass `path`.

3. `src/web/styles/globals.css`: add a `.artifact-path-copy` rule with `justify-self: start` for the plain grid header and muted foreground that turns `--foreground` on hover/focus-visible. It stays squared (the Button base is already `rounded-none`). Keep the existing caption-class rules, because the warning-details `dd` still uses them.

4. `docs/design-language.md`: add an `artifact-path-copy` row ("ArtifactHeader's copy-path icon button, quick-260923-jxp"). Reword the role of the row currently described as "The document-page file-path caption" to say it is the file-path value in the warning technical details, now that the header offers the path as a copy button. Update the "`ArtifactHeader` is the only document-page header" bullet: the path is a copy button, not a caption.

5. `test/e2e/artifact-header.spec.ts` (new). Grant `clipboard-read` and `clipboard-write` on the context. Pages are resolved from `/api/presentation` by path, never hardcoded URLs: a discussion log (cover), 01-01-PLAN (cover), a SUMMARY (plain header, a non-layout kind) and the first plan-pair page (plan `key` with a summary, as in test/e2e/pages.ts). For each:
   - `.artifact-heading` contains no element with the old caption class, and no text node equal to the artifact path
   - there is exactly one `.artifact-path-copy` button with aria-label "Copy file path" and a title equal to the artifact's `path`
   - clicking it makes `navigator.clipboard.readText()` equal the path, `data-copied` becomes "true", and the Check icon shows, then reverts within 3s
   - at 420px in light and dark there is no horizontal overflow
   Also check that the header renders without throwing when clipboard permissions are not granted. Plain `expect`.

6. `test/e2e/measure.ts`: add `.document-answer`, `.document-option-number`, `.document-ghost`, `.document-endnotes` and `.artifact-path-copy` to CORNER_SELECTORS with a quick-260923-jxp comment (this strengthens F-06).

7. `test/e2e/foundation-consistency.spec.ts`: run the full sweep. Change a check only if the new header or endnotes genuinely invalidate an assumption. Update it and never weaken it, with a comment naming quick-260923-jxp, and fix real defects in the files from Tasks 1-3 rather than waiving them. `test/e2e/known-per-type.json` gains nothing.

8. Run the gates, fix failures and rerun until all pass: npm test, npm run typecheck, npm run lint, npm run test:e2e (F-01..F-15 light/dark at 1280 and 420, document-layout, artifact-header).

9. Run npm run build. Do not start, stop, restart or rebind the systemd instance on 4173. In the SUMMARY, state that the parse change (server code) reaches the tailnet only after the user restarts labelore.service themselves. Also record the leftover-topic rule (prose-bearing topics stay in "More in this document"). If vite reports a chunk-size warning, leave `chunkSizeWarningLimit` alone and note it.
  </action>
  <verify>
    <automated>npm test && npm run typecheck && npm run lint && npm run test:e2e && npm run build && test "$(grep -rln dangerouslySetInnerHTML src/web)" = "src/web/pages/artifact-page.tsx"</automated>
    <human-check>After restarting labelore.service yourself (it reads ~/studio-portal), open https://cinedise.persian-elnath.ts.net/ on studio-portal phase 01's discussion log in light and dark, at desktop and phone width. Check: "Cutover & bootstrap admin" shows the renamed CLI question with its number, title and "Your words"; options are numbered; notes open quietly; the date and offered-areas fact are on the cover; the log ends on Endnotes; the copy button copies the path. Also check that a PLAN page and a SUMMARY page show the copy button and no raw path.</human-check>
  </verify>
  <done>Every artifact page (cover, plain and plan-pair) shows a working copy-path icon button and no raw path caption; the F-01..F-15 sweep and all e2e specs pass in light and dark at 1280 and 420 with only strengthened checks; npm test, typecheck, lint and test:e2e are green; dist/ is rebuilt; the systemd instance was not touched.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target `.planning/` markdown → server parse | Discussion-log bodies are authored outside Labelore and are parsed by new line-scanning code on every snapshot |
| parsed strings → browser DOM | Option titles and descriptions, user choice text, note text, declined-area names and the date travel as JSON strings in `structured` and are rendered by React |
| browser → clipboard | A user-initiated write of the artifact path |
| e2e harness → local ports | Playwright runs its own server on 4199; the systemd instance on 4173 serves the tailnet |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-jxp-01 | Tampering (script injection) | layout-components.tsx answer card, option list, note, ghost rows; layout-discussion-log.ts | medium | mitigate | Every markdown-derived string (choice text, notes, option cells, area names, date, headings) renders only as a JSX text node, which React escapes. Only server-sanitized html (endnote `bodyHtml` from `stripLeadingHeading` over the already rehype-sanitized document) goes through the existing `renderHtml` → DocumentCanvas path. The Task 3 gate asserts the raw-HTML prop still appears only in artifact-page.tsx |
| T-jxp-02 | Denial of Service (ReDoS) | section-projection.ts extractDiscussionLog and meta scanners | medium | mitigate | Only bounded single-line or single-paragraph patterns (capped `[^…]{0,N}` classes, no nested unbounded quantifiers, no whole-document regex, per T-01-11/T-05-01), plus a unit test running a 100k-char hostile line in under 200ms |
| T-jxp-03 | Information Disclosure | copy-path-button.tsx clipboard write | low | mitigate | Writes only the project-relative `artifact.path` (already shown on the page before this change) on an explicit click, never the root path. It never reads the clipboard, and a failed write is silently caught |
| T-jxp-04 | Elevation / Tampering | read-only boundary | low | accept | No new route, write path or filesystem access. The parse stays read-only over already-loaded bodies |
| T-jxp-05 | Denial of Service | systemd instance on 4173 | medium | mitigate | e2e keeps `reuseExistingServer: false` on 4199, and Task 3 only runs `npm run build`. The executor never starts, stops, restarts or rebinds the service. The restart needed to show server parse changes is left to the user |
| T-jxp-SC | Tampering | npm installs | low | accept | No packages are added. lucide `StickyNote`/`Copy`/`Check` come from the already-installed lucide-react 1.34 |
</threat_model>

<verification>
- `npm test`, `npm run typecheck`, `npm run lint` and `npm run test:e2e` all pass, and `npm run build` completes.
- `test "$(grep -rln dangerouslySetInnerHTML src/web)" = "src/web/pages/artifact-page.tsx"` holds.
- The kind-name gate over layout.ts and layout-components.tsx prints 0 (Task 2 verify).
- `grep -c "artifact.kind === '" src/web/pages/artifact-page.tsx` is at most 2 (artifact-page.tsx is not modified).
- test/web/discussion-log-corpus.test.ts passes with the studio-portal cases executed (not skipped) on this machine.
- PLAN and VERIFICATION fixtures in document-layout.spec.ts pass unchanged (the Also fold is retained).

## Multi-source coverage audit

| Source item | Covered by |
|---|---|
| CONTEXT item 1: log date (from `**Date:**`, frontmatter fallback, app date style) | Task 2 (JXP-01) |
| CONTEXT item 2: ghost chapters only when the log names declined areas, after real topics in index and list, "Not discussed"; quiet "D of N offered areas" fact; SP phases/04 where/whether prose not forced; unrecognised gives no ghosts and no error | Task 2 (JXP-02) |
| CONTEXT item 3: option title plus description on the answer card and in the list | Task 1 (JXP-03) |
| CONTEXT item 4: chosen card keeps today's shape and shows number, title, description, state; source-order numbered list; real numbers; distinctive squared badge | Task 1 (JXP-04) |
| CONTEXT item 5: ✓-prefix plus qualifier chip; "Your words"; no-✓ plus User's choice as Custom answer; Claude's call as Claude chose; tests updated; SP phases/01 repro; all ~13 logs lose no question | Task 1 (JXP-05) |
| CONTEXT item 6: note behind a small quiet toggle, separate from the options disclosure; accepted-gap inline marker only | Task 1 (JXP-06) |
| CONTEXT item 7: Endnotes sheet, always open, small-caps subsections, hanging bullets, quieter, anchor ids kept, last, "Endnotes" index entry | Task 2 (JXP-07) |
| CONTEXT item 8: every cover number equals the rendered count; unit test against real logs | Task 2 (JXP-08) |
| CONTEXT item 9: raw path caption removed; lucide Copy→Check about 1.5s, accessible label, tooltip with relative path, silent failure, on every artifact page | Task 3 (JXP-09) |
| Out of scope held: PLAN/VERIFICATION/SUMMARY pick up only item 9 and do not regress | Tasks 1-2 (optional contract fields, default fold), Task 3 (sweep) |
| Constraints: design-language plus class-vocabulary, F-01..F-15 light/dark at 1280/420, gates matching quick-260922-3us, build, systemd untouched | Tasks 1-3 (JXP-10) |
| RESEARCH | None for this quick task (no research phase) |
| Deferred ideas | None recorded in CONTEXT.md |
</verification>

<success_criteria>
Every discussion log in both corpora renders all its questions. Chosen answers show their numbered option title and
description, custom and Claude answers are labelled honestly, options are a numbered source-order list and notes wait
behind a quiet toggle. The cover shows the log date, a truthful offered-areas fact, ghost rows for named declined areas
and numbers that match the page. The log ends on an Endnotes sheet. Every artifact page offers a copy-path button
instead of a printed path. PLAN, VERIFICATION and other kinds are otherwise unchanged. All gates pass and dist/ is rebuilt.
</success_criteria>

<output>
Create `.planning/quick/260923-jxp-discussion-log-page-review-fixes-on-the-/260923-jxp-SUMMARY.md` when done
</output>
