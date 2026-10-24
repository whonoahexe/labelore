---
phase: quick-260923-lju
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/planning-repo/handlers/context-brief.ts
  - src/planning-repo/handlers/context.ts
  - src/web/views/inline-markdown.ts
  - src/web/views/context-brief.ts
  - src/web/views/context-brief-components.tsx
  - src/web/views/manifest.ts
  - src/web/views/manifests.ts
  - src/web/pages/artifact-page.tsx
  - src/web/components/artifact-header.tsx
  - src/web/styles/globals.css
  - docs/design-language.md
  - test/context-brief.test.ts
  - test/web/inline-markdown.test.ts
  - test/web/context-brief.test.ts
  - test/web/context-brief-corpus.test.ts
  - test/web/caution-contrast.test.ts
  - test/web/visual-contract.test.ts
  - test/__golden__/dense.json
  - test/__golden__/sparse-started.json
  - test/e2e/context-brief.spec.ts
  - test/e2e/measure.ts
  - playwright.config.ts
  - .planning/quick/260923-jxp-discussion-log-page-review-fixes-on-the-/deferred-items.md
autonomous: true
requirements: [LJU-01, LJU-02, LJU-03, LJU-04, LJU-05, LJU-06, LJU-07, LJU-08, LJU-09]

estimate:
  tokens: 65000
  raw_tokens: 65000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "In View mode, every CONTEXT.md opens on the sketch-006 D1 brief, in this order: intro, boundary hero, quiet out-strip, [open-questions panel], [unrecognised sections], decision register, [Also left to Claude], ideas panels, then one closed 'More in this document' disclosure. It never shows the sketch-004 B3 cover sheet, chapter index, pinned chapter bar or folded chapters."
    - "The intro is ArtifactHeader's plain variant. It shows the eyebrow 'Context · Phase NN · Gathered Mon D, YYYY' ('Quick task <id>' replaces the phase for quick tasks), the title without its 'Phase N:' prefix and ' - Context' suffix, a status chip, 'Covers …' built from the phase's ROADMAP requirement IDs when there are any, the copy-path button and the View/Source toggle."
    - "Every D-tagged decision, and every plain bullet under a ### area in a quick-task CONTEXT, renders as one register row. The Decisions count box equals the row count, which equals the projected count."
    - "Clicking a decision summary shows its detail and its Reversibility line. A costly, one-way or irreversible decision carries an amber caution chip, and the 'hard to undo' stat counts exactly those decisions."
    - "Open questions (a '### Open questions…' subsection or an <open_questions> section) render in an amber attention panel. Each 'blocks D-NN' chip jumps to that decision and opens it, and each decision's OPEN-NN chip jumps back. A CONTEXT with no open questions renders no panel."
    - "A Claude's-discretion item that names an existing D-NN renders as a 'Claude decides' note under that decision. The remaining items, plus the section's own lead and trailer prose, render in an 'Also left to Claude' panel. There is no endnotes sheet."
    - "Nothing in a corpus CONTEXT is dropped. Unrecognised ## sections render as plain sanitized sections, boundary tables and ### subsections render as boundary notes, and canonical references plus existing code insights sit inside one closed details#view-remainder."
    - "An unrecognised or unparseable shape degrades to the existing promoted-block view and never throws. That includes a server started before this change, which sends no structured.brief."
    - "DISCUSSION-LOG, PLAN and VERIFICATION keep the B3 layout untouched: their source files and e2e specs are unchanged, and they pass."
    - "test/web/visual-contract.test.ts asserts the full-width, no-padding .document-canvas contract that 082a834 intentionally introduced, and npm test is fully green."
  artifacts:
    - path: src/planning-repo/handlers/context-brief.ts
      provides: "extractContextBrief(body): a tolerant, line-scanned CONTEXT brief projection (meta, boundary, areas and decisions, open questions, discretion, ideas, recognised headings)"
      exports: [extractContextBrief, firstSentence]
    - path: src/web/views/context-brief.ts
      provides: "composeContextBrief(input): a pure ViewInput-to-ComposedContextBrief composer, plus formatGatheredDate and formatCovers"
      exports: [composeContextBrief, formatGatheredDate, formatCovers]
    - path: src/web/views/context-brief-components.tsx
      provides: "ContextBriefView (hero, out-strip, open panel, register, discretion, ideas, More) and ContextIntroMeta"
      exports: [ContextBriefView, ContextIntroMeta]
    - path: src/web/views/inline-markdown.ts
      provides: "tokenizeInline(text): code/strong/em/link-label/ref tokens, rendered only as React text"
      exports: [tokenizeInline]
    - path: test/web/context-brief-corpus.test.ts
      provides: "Pinned counts plus a nothing-dropped word-coverage guard over every corpus CONTEXT"
    - path: test/e2e/context-brief.spec.ts
      provides: "CONTEXT brief e2e over real corpus files (this repo, plus studio-portal on 4198 when present)"
  key_links:
    - from: src/planning-repo/handlers/context.ts
      to: src/planning-repo/handlers/context-brief.ts
      via: "structured.brief = extractContextBrief(fm.body), wrapped in try/catch; decisions/sections unchanged"
      pattern: "extractContextBrief\\("
    - from: src/web/views/manifests.ts
      to: src/web/views/context-brief.ts
      via: "context manifest declares brief: composeContextBrief"
      pattern: "brief: composeContextBrief"
    - from: src/web/pages/artifact-page.tsx
      to: src/web/views/context-brief-components.tsx
      via: "manifest.brief?.(viewInput); brief && mode === 'view' renders ContextBriefView"
      pattern: "ContextBriefView"
    - from: src/web/components/artifact-header.tsx
      to: docs/design-language.md
      via: "optional meta prop renders .artifact-meta-row (documented shared name)"
      pattern: "artifact-meta-row"
    - from: test/e2e/context-brief.spec.ts
      to: "/api/documents structured.brief"
      via: "rendered counts equal projected counts"
      pattern: "structured"
---

<objective>
Build the CONTEXT.md document view from sketch 006's winning variant, D1 "Brief + register". It is the next page in
the one-type-at-a-time series, built from the dashboard's own vocabulary so it reads as the same site. It must not
copy the discussion log's sketch-004 B3 layout.

Purpose: when you open a CONTEXT file, the phase boundary comes first, what not to drift into stays quiet,
decisions are the body, open questions are loud, and Claude's discretion appears where it applies. Nothing in the
file is lost, and every corpus shape (explicit In/Not lists, prose "This phase does not…", a Locked-upstream
table, <open_questions> sections, and quick tasks without D-tags) renders or degrades plainly, never with an error.

Output: a server-side brief projection, a pure composer, the React view, CSS and tokens, docs vocabulary, and unit,
corpus and e2e coverage. The visual-contract test also gets updated to the intentional full-width canvas.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@docs/design-language.md
@.planning/sketches/006-context-brief/README.md
@.planning/sketches/006-context-brief/index.html
@.planning/sketches/006-context-brief/extract-context.reference.mjs
@.planning/quick/260923-jxp-discussion-log-page-review-fixes-on-the-/260923-jxp-SUMMARY.md
@.planning/quick/260922-3us-build-sketch-004-b3-folded-chapters-docu/260922-3us-SUMMARY.md
@src/planning-repo/handlers/context.ts
@src/planning-repo/handlers/markdown-sections.ts
@src/web/views/manifest.ts
@src/web/views/manifests.ts
@src/web/pages/artifact-page.tsx
@src/web/components/artifact-header.tsx

Source of truth for the design. It is the "Outcome" section of the sketch README, labelled P-1..P-8 in this plan.
- P-1 Intro: page-intro, the eyebrow `Context · Phase NN · Gathered <date>`, title, status chip, "Covers …", copy-path icon, View/Source.
- P-2 Boundary hero: position-hero. The left side holds the first sentence in large heading type, the rest muted, and the stat buttons (decisions locked / open for the researcher / hard to undo / left to Claude). The right side holds the accent "In this phase" card with a ✓ list, or the remaining summary prose when there is no explicit In list.
- P-3 Out strip: "Not in this phase · do not drift into these", dashed and muted, each item with its `→ destination`.
- P-4 Open questions: an amber attention panel. Each row is OPEN-NN · question · a `blocks D-NN` jump chip, with the reasoning shown on click. There is no panel when the file has none.
- P-5 Decision register: a section-heading "Decisions" with a count box, a sticky area column (name plus locked/open chips), and rows of tag gutter · first-sentence summary · chips (OPEN-NN, reversibility). Clicking a row shows the detail and the reversibility line.
- P-6 Claude's discretion tagged in: an item that names a D-NN becomes a "Claude decides" note under that decision, and the leftovers go in an "Also left to Claude" panel. No endnotes sheet.
- P-7 Ideas: "Specific ideas" and "Deferred" as two preview-style panels with count boxes. Each item is a bold title plus a two-line clamp that expands on click.
- P-8 Back matter: one closed "More in this document" disclosure holding canonical references and existing code insights, grouped by their ### headings.

Constraints (C-*) from the orchestrator.
- C-1 Nothing is dropped. An unrecognised shape degrades to a plainer rendering, never an error.
- C-2 The prose-boundary split is conservative: split only on clear list punctuation, otherwise show the paragraph as written.
- C-3 DISCUSSION-LOG, PLAN and VERIFICATION (B3) must not regress.
- C-4 Gates: npm test, typecheck, lint, test:e2e (a CONTEXT spec over real corpus files, plus the F-01..F-15 sweep in light and dark at 1280 and 420), and build.
- C-5 Never restart or touch labelore.service (4173) or the sketch server (4174).
- C-6 The visual-contract canvas test is updated to the intentional full-width contract. Do not restore the CSS.

Corpus (19 files): every *-CONTEXT.md under this repo's .planning/ (milestones/*-phases, milestones/*-quick, quick/)
plus ~/studio-portal/.planning (phases/, milestones/v1.0-phases/, quick/). Shapes found by a planning-time scan:
- Boundary.
  - Explicit `**In scope:**` comma list plus a `**Not in scope — do not drift into these:**` bullet list with `→ Phase N` (SP phases/01).
  - A prose `This phase does not …, does not …, … — and does not …` paragraph (LB v1.1/05). Multi-sentence "This phase does not add a, b, or c. Those remain…" paragraphs (LB v1.0/02-04).
  - Label-plus-prose outs, with no bullets: `**Not this phase:**` (SP 04), `Explicitly **not** this phase:` (LB v1.0/01), unbolded `Out of scope:` (LB quick jxp), `**Not in this phase:**` (SP v1.0/01, 04).
  - A `**Locked upstream …:**` paragraph followed by a 2-column table (SP 04).
  - Numbered lists and `**Requirements covered:**` labelled paragraphs (SP v1.0/01-04, jxp).
  - A `---` then a `### ⚠️ …` subsection inside the boundary (SP v1.0/04).
- Decisions.
  - `- **D-NN:**` bullets separated by blank lines, with indented continuation lines, including `— **Reversibility:** reversible|costly|one-way — …` (SP phases/*, LB v1.0/04).
  - Area prose paragraphs interleaved with bullets (SP quick 2pr has 9 rows and 10 prose paragraphs; SP v1.0/02 amendments preamble).
  - Quick tasks with plain bullets and no D-tags (oae 9, lfi 6, o2o 6, ns4 3, jxp 15).
  - Discretion headings "Claude's Discretion" and "the agent's Discretion". The body is either bullets; a lead paragraph plus bullets plus a trailer (LB v1.0/01, SP 03, SP v1.0/04); a single paragraph "…left to planning judgment: a, b, and c." (SP 01, comma list); or the same with a `;` list containing commas inside backticks (SP 02).
  - SP 04 defines D-09 inside its discretion bullets (`**D-09 (manifest as contract):**`), so its areas hold 14 rows.
- Open questions: `### Open questions for the researcher` with `**OPEN-01 (blocks D-09):**`, `**OPEN-02 (blocks D-17):**` and an untagged-blocks `**OPEN-03:**` (SP 01, the only OPEN-NN file). An `<open_questions>` tagged `## Named, deliberately unresolved — …` section holds a numbered list with bold-lead items (SP 04).
- Extra ## sections: `<blocking_amendments>` (SP 02, 03, 04), `<resolved_open_question>` (SP 03), and a trailing `## Amendment: 2026-07-18 …` with no tag (SP v1.0/02).

<interfaces>
Existing contracts the executor builds on. Extract nothing else.
- src/web/views/manifest.ts: `ViewInput { kind; frontmatter; structured; groups: DocumentSectionGroup[]; planSegments; planProgress? }`; `ViewManifest { kind; lead; promote; layout?: DocumentLayoutSpec }`; `REMAINDER_ID = 'view-remainder'`, `REMAINDER_LABEL = 'More in this document'`, `INTRODUCTION_LABEL`. manifest.ts already type-imports DocumentLayoutSpec from layout.ts. Mirror that type-only import for the brief type so no runtime cycle appears.
- src/web/views/document-sections.ts: `DocumentSectionGroup { id: string | null; heading: string | null; html: string }`, plus the DOM-backed helpers `stripLeadingHeading(html)` and `countListItems(html)`. Call these from components only, never from the pure composer.
- src/planning-repo/handlers/markdown-sections.ts: `splitSections(body)`, `splitSubsections(body)`, `parseMarkdownTable(sectionBody)`. These are line-scanning primitives.
- src/web/pages/artifact-page.tsx: `DocumentView({ document })` renders `div.artifact-document.document-overflow-boundary` from already-sanitized HTML. `renderHtml(html)` is the existing callback that wraps it. `findPlanProgress(presentation, path)` is the module-level lookup pattern to mirror, kept at module level for React Compiler memoisation.
- src/web/views/layout-components.tsx `useChapterFolds`: the jump pattern to mirror is a pending-scroll ref plus a tick-state effect (react-hooks v7, no setState inside an effect body), requestAnimationFrame, prefers-reduced-motion giving auto instead of smooth, and focusing the target with preventScroll.
- src/web/components/artifact-header.tsx: the plain variant renders eyebrow, chip, h1, lead, CopyPathButton, children. The cover variant must stay byte-identical.
- The existing test gates this work must satisfy: test/web/class-vocabulary.test.ts (every className is documented or view-local `view-context-*`, and every data-tone literal is a documented tone), test/web/view-page-contract.test.ts (no per-kind branch added to artifact-page; view files never use the parse-degradation tones, never fork the header/breadcrumb chrome and never contain the shared empty-state copy; every accent-toned chip reads Chosen or Gates, so do not use the `active` tone), test/token-guard.test.ts (tokens only in :root/.dark, no literal px/rem spacing, no duplicate palette values), test/web/css-source-order.test.ts, and test/snapshot.golden.test.ts.
</interfaces>
</context>

<tasks>

<task type="tracer">
  <name>Task 1: Tracer, the CONTEXT brief end to end: server projection, manifest brief hook, intro, boundary hero, out-strip, decision register</name>
  <files>src/planning-repo/handlers/context-brief.ts, src/planning-repo/handlers/context.ts, test/context-brief.test.ts, test/__golden__/dense.json, test/__golden__/sparse-started.json, src/web/views/inline-markdown.ts, test/web/inline-markdown.test.ts, src/web/views/context-brief.ts, src/web/views/context-brief-components.tsx, test/web/context-brief.test.ts, src/web/views/manifest.ts, src/web/views/manifests.ts, src/web/pages/artifact-page.tsx, src/web/components/artifact-header.tsx, src/web/styles/globals.css, docs/design-language.md, test/web/caution-contrast.test.ts, test/web/visual-contract.test.ts, test/e2e/context-brief.spec.ts, .planning/quick/260923-jxp-discussion-log-page-review-fixes-on-the-/deferred-items.md</files>
  <behavior>
    - extractContextBrief on the SP phases/01 boundary:
      - statement is "Members sign in to the portal with a username and password the portal itself holds, and stay signed in across backend restarts and power cuts."
      - inList has 9 items, the first being "`users` and `sessions` tables" and the last "removal of the Access policy".
      - outList has 4 items. The first is text "Roles, permissions, or any per-tier gating", dest "Phase 2". The third is dest "Phase 3 (ADMIN-03)".
      - drift is true.
    - extractContextBrief on the LB v1.1/05 boundary gives exactly 4 out items, verbatim apart from the dropped "This phase does not"/"does not"/"and" joiners and the final period:
      - "add a purpose/category taxonomy (rejected 2026-09-20)"
      - "adopt `gsd-tools query`"
      - "rewrite the dashboard, roadmap, traceability or search pages — they are the reference this conforms to"
      - "add plan-vs-outcome deviation pairing (READ-08), backlinks (BACK-01), faceted search (FIND-06) or file watching (PLAT-01)"
      - outSource keeps the verbatim paragraph.
    - Multi-sentence "This phase does not add search, …, or a rich dependency-graph canvas. Those remain later or future capabilities." (LB v1.0/02) gives ONE out item: the verbatim paragraph.
    - Label-prose outs (`**Not this phase:** …`, `Explicitly **not** this phase: …`, unbolded `Out of scope: …`) each give ONE item holding the text after the colon, verbatim.
    - Decision bullets:
      - separated by blank lines, with indented continuations, parse to rows in source order.
      - `**D-01**:` and `**D-01:**` both parse.
      - `— **Reversibility:** costly — independent per-view refresh…` gives reversibility word "costly" plus the full text, and the reversibility text is removed from the detail.
      - summary is the first sentence: never cut inside a code span, inside **bold** (unless the closing ** directly follows), or after e.g./i.e./etc./vs./cf.
    - An area whose body mixes prose paragraphs and bullets (the SP quick 2pr shape) returns note and decision entries interleaved in source order. No line is lost.
    - Subsections whose heading matches discretion or open questions are NOT areas. Task 2 projects them.
    - meta:
      - "# Phase 1: Portal-Owned Identity & Sessions - Context" gives title "Portal-Owned Identity & Sessions", phase "1".
      - "# Quick Task 260923-jxp: Discussion-log page review fixes … - Context" gives quickId "260923-jxp".
      - `**Gathered:** 2026-08-03` and `**Status:** Ready for planning` are captured.
    - A 200,000-character single-line boundary built from repeated `**`, backticks, ", does not" and "(" finishes in under 250 ms. ContextHandler.parse never throws on garbage input, and always keeps structured.decisions and structured.sections unchanged.
    - tokenizeInline:
      - "`a.b` and **bold** and *em* see D-03 and [label](http://x)" gives tokens code, text, strong, text, em, text, ref(D-03), text, text("label").
      - An unclosed ** or ` stays literal text.
      - "<script>alert(1)</script>" is a single text token.
    - composeContextBrief:
      - returns null when structured.brief is absent or malformed.
      - eyebrow for phase "1" and gathered "2026-08-03" is "Context · Phase 01 · Gathered Aug 3, 2026". Quick gives "Context · Quick task 260923-jxp · Gathered Sep 23, 2026".
      - formatCovers(["AUTH-01","AUTH-02","AUTH-03","AUTH-04","AUTH-05","AUTH-06"]) is "AUTH-01 … AUTH-06". formatCovers([]) is null.
      - status "Ready for planning" gets tone complete; any other status gets tone quiet.
      - the hero puts the rest under the statement when inList is non-empty, puts it in the In card otherwise, and omits the card when both are empty.
      - decision ids are unique.
  </behavior>
  <action>
Build the thinnest production path through every layer: server parse, wire, composer, manifest hook, page dispatch, header, view, CSS and docs. It renders the intro (P-1), the boundary hero with its In card (P-2 without stats), the out-strip (P-3) and the decision register (P-5 without OPEN chips). Task 2 expands on top of this. Write tests first where the behavior block specifies them.

1. Housekeeping (C-6). In test/web/visual-contract.test.ts "flattens the document canvas":
   - replace the positive 70rem max-width expectation with negative assertions. The `.document-canvas` block declares no max-width and no padding, still declares `min-width: 0;`, and still has no border/box-shadow/background.
   - Add a one-line comment naming commit 082a834 as the intentional full-width canvas.
   - Do not touch globals.css for this.
   - Append one line to the jxp deferred-items.md recording that quick-260923-lju resolved it by updating the test.

2. Server projection (LJU-01). Create src/planning-repo/handlers/context-brief.ts exporting `extractContextBrief(body: string): ContextBrief` and `firstSentence(text): [head, rest]`, plus the model types.
   - Scope: it reads only the body text, composes from splitSections/splitSubsections/parseMarkdownTable plus per-line bounded regexes, never uses a whole-document regex, and has no nested unbounded quantifiers (T-01-11 discipline).
   - First strip tag-only lines (a line that is just an opening or closing lowercase/underscore tag).
   - Section roles: a `##` section's role comes from its heading, or from the opening tag line directly above it. The role table:
     - boundary: /^(phase|task) boundary/i or domain
     - decisions: /^implementation decisions/i or decisions
     - specifics: /^specific ideas/i or specifics
     - deferred: /^deferred ideas/i or deferred
     - references: /^canonical references/i or canonical_refs
     - code: /^existing code insights/i or code_context
     - The open_questions tag and heading-based open-question sections are Task 2.
   - `recognizedHeadings` lists the exact `##` heading texts the brief accounts for.
   - `meta`:
     - title: H1 text minus a leading `Phase N[.M]:` or `Quick Task <id>:` and a trailing ` - Context`.
     - phase and quickId come from that prefix.
     - gathered and status come from the bold label lines.
     - preambleExtra is true only when the text between the H1 and the first `##`/tag holds a non-blank line other than the Gathered/Status lines.
   - Block parser, reused by Task 2. `parseBlocks(markdown)` turns lines into paragraph, list (ordered or not; an item's indented continuation and nested-bullet lines are joined with single spaces), table (a run of pipe lines via parseMarkdownTable; if malformed it falls back to paragraph text) or code (fenced, verbatim) blocks. Every non-blank line lands in exactly one block.
   - Boundary:
     - Content before the first `---` or `###` is the summary region. Everything from there on is `extras` (Task 2 fills them; in this task, store the raw subsections as parsed blocks with a title).
     - In the summary region, classify each block:
       - An In-label paragraph is one whose text, with ** removed, starts with /^(in scope|in this phase)\b/i and has a colon within 80 chars. Its items are the text after the colon, split on top-level `;` if any exists, else on top-level `,`. "Top-level" means outside backticks and parentheses. Leading and/or is stripped, and the trailing period dropped. If that yields fewer than 2 items, keep it as one item.
       - An Out-label paragraph matches /^(explicitly\s+)?(not in scope|not in this phase|not this phase|out of scope)\b/i with a colon within 80 chars. drift is true when the label mentions drift. If a list block immediately follows, its items are the out items: split `A → B` into text and dest. Otherwise the text after the colon is ONE verbatim item.
       - With no Out label, a paragraph starting /^This (phase|task) does not\b/i is the prose out-source. Split it only when firstSentence says it is a single sentence AND splitting at `, does not` / `, and does not` / ` — and does not` boundaries (lookahead on "does not") yields at least 2 items. In that case, drop the leading "This phase does not " and each joiner, keep em-dash asides, and drop the final period. Otherwise it is ONE item, the paragraph verbatim (C-2). Store `outSource` as the verbatim paragraph either way.
       - Every other block (plain paragraphs, other labelled paragraphs, lists, tables) is summary content, in order. `statement` is firstSentence of the first plain paragraph. `statementRest` is the remainder of that paragraph. `blocks` holds the other summary blocks.
   - firstSentence follows the reference extractor:
     - mask `.!?` inside code spans.
     - a sentence end is `[.!?]` followed by whitespace or end of text.
     - skip e.g./i.e./etc./vs./cf.
     - never end inside an odd `**` count, unless `**` directly follows, in which case end after it.
     - no end found means the whole text.
   - Decisions:
     - Paragraphs before the first `###` are `decisionsPreamble`.
     - Each `###` subsection not matching /discretion/i or /open questions/i becomes an area `{ title, entries }`.
     - Entries, in source order:
       - a bullet (`- `, `* `, or `N.`/`N)`) opens a decision.
       - an indented line continues it.
       - a blank line followed by an indented line also continues it (a multi-paragraph item).
       - a blank line followed by a non-indented line closes it.
       - a non-bullet paragraph becomes a `note` entry.
     - Decision parsing:
       - `^\*\*(D-\d{1,3})[:.]?\*\*[:.]?\s*` gives a tag; otherwise the decision is untagged.
       - Reversibility is split off the joined text at ` — **Reversibility:** ` (accept — – or - as the dash) into `{ word, text }`. word is the leading /^(reversible|costly|one-way|irreversible)/i match, else the first word.
       - summary and detail come from firstSentence of the remainder.

3. Wire it in. In ContextHandler.parse, set `structured.brief` from extractContextBrief(fm.body) inside a try/catch. On a throw, omit brief (the page then falls back, C-1). Leave `decisions`, `sections` and stripContextTagLines unchanged, so BACK-02 mentions are untouched. Regenerate the goldens with `npx vitest run test/snapshot.golden.test.ts -u`, then review the diff: it may only add `brief` subtrees.

4. Inline tokenizer. Create src/web/views/inline-markdown.ts exporting `tokenizeInline(text)`.
   - Output is a flat array of `{ type: 'text'|'code'|'strong'|'em'|'ref', value }`. strong and em carry child tokens, one nesting level, which may hold text, code and ref.
   - It is a single left-to-right scan using indexOf for closers.
   - Links `[label](url)` become the label as text. The URL is never emitted.
   - Refs match `\b(D|OPEN)-\d{1,3}\b` inside text runs only, never inside code.
   - Unclosed markers stay literal.
   - It is pure, with no DOM and no HTML strings.

5. Composer. Create src/web/views/context-brief.ts.
   - `composeContextBrief(input: ViewInput): ComposedContextBrief | null` is pure, with no DOM.
   - Validate `input.structured.brief` with a type guard. Return null when it is missing or malformed, or when it has neither a boundary nor any area.
   - `intro`:
     - eyebrow joins 'Context', then 'Phase ' + the phase zero-padded to 2 digits before any `.M`, or 'Quick task ' + quickId, then 'Gathered ' + formatGatheredDate(gathered), with ' · ' between parts and absent parts omitted.
     - formatGatheredDate turns ISO YYYY-MM-DD into 'Mon D, YYYY' through a month table, never a locale API. Anything else comes back raw.
     - title falls back to null so the page uses artifact.title.
     - status: tone complete when it matches /^(ready|complete|done|locked)/i, else quiet.
     - covers: formatCovers(input.phaseRequirementIds ?? []). That keeps ROADMAP order, collapses each same-prefix run of 3 or more consecutive numbers to 'PFX-a … PFX-b', joins with ' · ', and returns null when empty.
   - `boundary`: `{ eyebrow (the source heading), statement, restBlocks (statementRest as a paragraph, then blocks), inList, outItems, outFromProse }`. Placement per P-2: with inList, restBlocks render muted under the statement. Without inList, they render in the In card. The card is omitted when both are empty. Tables are Task 2's boundary notes; in this task, pass table blocks through restBlocks unchanged.
   - `areas`: `{ id, title, lockedCount, entries }`.
     - A decision entry carries `{ id, tag, summary, detail, reversibility: { word, text, tone } | null, expandable }`.
     - tone is caution for /^(costly|one-way|irreversible)/i, else quiet.
     - id is `decision-` + the lowercased tag, suffixed -2, -3… on a duplicate tag. Untagged decisions get `decision-a{area}-{row}`.
   - `decisionCount`, `decisionsPreamble`.
   - `refTargets` maps each D tag to its row id.

6. Manifest hook.
   - In manifest.ts, add `phaseRequirementIds?: string[] | null` to ViewInput and `brief?: (input: ViewInput) => ComposedContextBrief | null` to ViewManifest, as a type-only import. Doc-comment it as the sketch-006 D1 layout a manifest opts into.
   - In manifests.ts, the context manifest keeps its lead and promote (they become the fallback) and adds `brief: composeContextBrief`.

7. ArtifactHeader. Add an optional `meta?: React.ReactNode` prop to the plain variant only.
   - When present, after the h1 (and lead), render one `div.artifact-meta-row` holding meta, then the CopyPathButton, then children, in place of the separate copy button and children.
   - When absent, the markup is byte-identical to today. The cover variant is untouched.

8. ArtifactPage.
   - Add a module-level `findPhaseRequirementIds(presentation, path)`: find the artifact by path, take its phaseKey, then the matching phase's requirementIds, else null. Pass it into viewInput.
   - Compute `brief` with useMemo from `manifest?.brief?.(viewInput) ?? null`, before the early returns.
   - `viewAvailable` also becomes true when brief is non-null.
   - Header props:
     - eyebrow is brief's eyebrow, else humanizeKind.
     - title is brief's title, else artifact.title.
     - lead is null when brief exists (the sketch intro has no lede).
     - meta is `<ContextIntroMeta intro=… />` when brief exists.
   - Body: keep the B3 layout branch first. Then, when brief is set and mode is view, render `div.document-reader-layout[data-outline=false] > article.document-canvas > ContextBriefView` with renderHtml. Then ViewReader, then ArtifactReader.
   - Add no `artifact.kind ===` comparison.

9. Components. Create src/web/views/context-brief-components.tsx.
   - Render every markdown-derived string only through an `Inline` component that maps tokenizeInline output to React text nodes, code, strong and em. Never use React's raw-HTML injection prop here (T-lju-01).
   - A ref token becomes a `button.view-context-ref` that calls jumpTo when refTargets has it AND the caller allows interactivity. Anything nested inside another button renders as a plain span.
   - A `useContextBrief(brief)` hook owns the set of open ids, `toggle(id)`, and `jumpTo(id, { open })` in the useChapterFolds pattern. On mount, it opens a row when location.hash names a brief target id.
   - ContextIntroMeta: a status chip `span.status-chip` with the composed tone, then `span.source-note` "Covers …" when covers exists.
   - Hero (P-2): `section#context-boundary.view-block.position-hero.view-context-hero`.
     - Left column: `p.eyebrow` (the boundary heading), `p.view-context-statement`, and muted rest blocks when inList exists.
     - Right column: `aside.immediate-work.view-context-in` with `p.eyebrow` "In this phase", then either a ✓ list `ul.view-context-in-list` or the rest blocks.
     - Blocks render through a small BlockList: paragraph as p, list as ul/ol, table inside `div.document-overflow-boundary > table`, code as pre. All text goes through Inline.
   - Out-strip (P-3): `section.view-block.view-context-out`, rendered only when outItems exist. It holds `p.view-context-out-label` "Not in this phase · do not drift into these", then a list of items, each with `span.view-context-dest` "→ {dest}" when a dest exists.
   - Register (P-5): `section#context-decisions.view-block.view-context-register`.
     - It opens with `header.section-heading.compact` holding h2 "Decisions" and a span count box. decisionsPreamble notes follow.
     - Each area is `div.view-context-area`: a sticky `header.view-context-area-head` (h3 plus a quiet `N locked` chip), then its entries.
     - A note entry is `p.view-context-note`.
     - A decision entry is `div.view-context-decision[id][tabIndex=-1]` containing:
       - `span.view-context-tag` (the tag, or a middle dot when untagged).
       - the summary: `button.view-context-summary[aria-expanded][aria-controls]` when expandable, else a span.
       - a chips span, holding the reversibility `span.status-chip` with the word and tone.
       - when open, `div.view-context-detail`: the detail paragraph plus `p.view-context-reversibility` with the label "Reversibility" and its text.
   - Chip buttons must measure identically to span chips (F-05). Use the caution tone, never the parse-degradation or active tones.

10. CSS and tokens (additive only; do not delete or edit existing rules).
    - Add `--caution` to both :root and .dark. Use distinct values, for example light oklch(0.52 0.12 70) and dark oklch(0.78 0.14 75), and tune them until the contrast test passes.
    - Add a `--caution-border` recipe with color-mix next to --destructive-border.
    - Add `.status-chip[data-tone='caution']`: border --caution-border, color --caution.
    - Add `.artifact-meta-row`: flex, wrap, gap var(--space-3), align center. Its copy button gets margin-left auto.
    - Add the `.view-context-*` rules mirroring the sketch CSS for .hero/.statement/.in-list/.out-strip/.reg-area/.dec, with these translations:
      - tokens only, no radius, and only the weights --fw-medium and --fw-semibold.
      - `.view-context-hero` overrides position-hero's align-items to start, and handles its bottom border and padding so the out-strip joins it.
      - the area head is sticky at top var(--space-22), the same clearance as .document-outline.
      - collapse to one column at the existing 62rem breakpoint.
      - add overflow-wrap anywhere on statement, decision and note text.
      - check both themes.
    - Create test/web/caution-contrast.test.ts in the focus-ring-contrast.test.ts idiom (toMermaidColor plus WCAG luminance). It asserts that `--caution` reaches at least 4.5:1 against --background and --card in both themes.

11. Docs (LJU-02, LJU-05). In docs/design-language.md:
    - add a Shared vocabulary row for `artifact-meta-row` (ArtifactHeader's optional meta row, quick-260923-lju).
    - add a Tones row for `caution`: amber, flagged for someone else to resolve, never an error. It is used for CONTEXT open-question chips and the panel rule, the open stat, a costly/one-way reversibility chip and an area's open chip.
    - set the Note of the Dashboard appendix rows `position-hero`, `immediate-work`, `attention-panel` and `preview-panel` to "shared with the CONTEXT brief (quick-260923-lju)".
    - View-private chrome uses the `view-context-` namespace and needs no rows.

12. Tests.
    - test/context-brief.test.ts (server): every behavior above.
    - test/web/inline-markdown.test.ts.
    - test/web/context-brief.test.ts: the composer behaviors, built from literal ViewInput objects.
    - test/e2e/context-brief.spec.ts: one tracer test. Resolve the LB v1.1/05 CONTEXT URL from /api/presentation using the document-layout.spec.ts resolveFixtureUrl pattern, then assert:
      - there is no `.document-cover`.
      - `#context-boundary` precedes `#context-decisions` in DOM order.
      - `.view-context-out li` count is 4.
      - `.view-context-decision` count is 15 and equals the count box text.
      - clicking the D-01 summary sets aria-expanded to true and shows `.view-context-detail`.
  </action>
  <verify>
    <automated>npm test && npm run typecheck && npm run lint && npx playwright test test/e2e/context-brief.spec.ts && git diff --quiet 386e492 -- src/web/views/layout.ts src/web/views/layout-components.tsx src/web/views/layout-discussion-log.ts src/web/views/layout-plan.ts src/web/views/layout-verification.ts src/planning-repo/handlers/section-projection.ts && CSSD="$(git diff 386e492 -- src/web/styles/globals.css)" && test "$(printf '%s\n' "$CSSD" | grep -c '^-[^-]')" = "0" && GD="$(git diff -U0 386e492 -- test/__golden__)" && test "$(printf '%s\n' "$GD" | grep '^-[^-]' | grep -vc '^-[[:space:]]*}$')" = "0" && test "$(grep -v '^[[:space:]]*//' src/web/views/context-brief-components.tsx src/web/views/inline-markdown.ts | grep -c 'dangerouslySetInnerHTML')" = "0" && test "$(grep -c "toContain('max-width: 70rem;')" test/web/visual-contract.test.ts)" = "0"</automated>
  </verify>
  <done>
    - LB v1.1/05's CONTEXT opens on the brief: the intro eyebrow reads "Context · Phase 05 · Gathered Sep 20, 2026" with a status chip and the copy button in the meta row, the hero leads, the out-strip has 4 items, and the register shows all 15 decisions with click-to-open detail.
    - npm test is fully green, including the updated canvas test.
    - B3 files and section-projection.ts are unchanged, globals.css only grew, and the goldens only gained brief subtrees.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Expand the brief: stats, amber open-questions panel with jump chips, tagged discretion, ideas panels, the More disclosure, boundary notes, unrecognised sections, and the corpus guard</name>
  <files>src/planning-repo/handlers/context-brief.ts, test/context-brief.test.ts, test/__golden__/dense.json, test/__golden__/sparse-started.json, src/web/views/context-brief.ts, src/web/views/context-brief-components.tsx, test/web/context-brief.test.ts, test/web/context-brief-corpus.test.ts, src/web/styles/globals.css, test/e2e/context-brief.spec.ts</files>
  <behavior>
    - Open questions:
      - SP 01 yields 3 items: OPEN-01 blocks [D-09], OPEN-02 blocks [D-17], OPEN-03 blocks []. The lead is the "These are flagged, not decided…" paragraph.
      - SP 04's `<open_questions>` section yields 3 numbered items with tag null. Item 1's summary is "**Where DL-08's omission report reaches the member.**".
      - That section's heading is in recognizedHeadings.
      - An open-questions subsection or section that yields 0 items is NOT consumed. It stays an area of notes, or an unrecognised section.
    - Discretion:
      - SP 01's single colon-list paragraph gives lead "No area was handed over wholesale. Within the decisions above, the following are left to planning judgment:" and 5 items. The composer attaches 3 of them, to D-01, D-10 and D-12, and leaves 2 loose.
      - SP 02 splits on top-level ';' into 7 items. The commas inside backticks do not split.
      - LB v1.0/01 gives a lead paragraph, 2 bullet items and a trailer paragraph.
      - A paragraph with no colon-list (fixture "Everything else is open.") is lead only, 0 items.
      - SP 04's D-09 discretion item stays loose, because its areas hold no D-09 row.
      - LB v1.1/05 attaches 4 items (D-07, D-08, D-12, D-13) and leaves 3 loose.
    - Specific ideas and deferred:
      - a bullet `**Title** — body`, `**Title:** body` or `**Title.** body` gives a title and a body.
      - any other bullet, or a non-bullet paragraph, gives an untitled item.
    - Boundary extras:
      - SP v1.0/04 yields one extra subsection titled "⚠️ XFER-07's premise is dead — this phase amends it", whose blocks hold every paragraph and list line.
      - SP 04's Locked-upstream label paragraph plus its table (9 body rows) becomes a boundary note, not In-card content.
    - Composer partition: every non-blank DocumentSectionGroup ends up exactly once in the recognised set, in `extras` (unrecognised, shown before the register), or in `more` (references and code, in document order). The leading group lands in extras only when preambleExtra is true.
    - Stats:
      - decisions locked is the row count.
      - open for the researcher is the open item count.
      - hard to undo is the caution-reversibility count.
      - left to Claude is the discretion item count.
      - a stat with a zero count is omitted.
      - each stat has a jump target id.
    - Corpus guard, for all 19 files (the studio-portal ones run through it.runIf(existsSync)):
      - composeContextBrief is non-null.
      - pinned row counts: SP v1.0/01 11, SP v1.0/02 24, SP v1.0/03 16, SP v1.0/04 26, SP 01 19, SP 02 21, SP 03 16, SP 04 14, SP quick 2pr 9 (with 10 notes), LB v1.0/01 16, LB v1.0/02 17, LB v1.0/03 16, LB v1.0/04 17, LB v1.1/05 15, lfi 6, oae 9, o2o 6, ns4 3, jxp 15.
      - open counts: SP 01 3, SP 04 3, all others 0.
      - every word of 4 or more letters in the stripped text of the boundary, decisions, open-questions, specifics and deferred sections appears in the brief's concatenated strings (nothing dropped, C-1).
  </behavior>
  <action>
Expand Task 1's slice to the rest of the locked pattern. Each step leaves a user-visible capability, and every test is written before its code.

1. Server (LJU-04, LJU-06, LJU-07, C-1). Extend extractContextBrief:
   - `openQuestions`:
     - Sources: a decisions `###` subsection matching /open questions/i, and any `##` section whose heading matches /\bopen questions?\b/i or whose opening tag line is open_questions. Items from all sources are kept in document order.
     - Items come from list blocks, `{ tag, number, blocks, summary, detail }`:
       - `^\*\*(OPEN-\d{1,3})(?:\s*\(([^)]{1,80})\))?:\*\*\s*` gives the tag, and blocks = every `D-\d{1,3}` in the parenthetical.
       - otherwise tag is null, and number is the 1-based item position.
       - summary and detail come from firstSentence.
     - `lead` is the source's non-list paragraphs.
     - Consume a source (and add its `##` heading to recognizedHeadings) only when it yields at least 1 item. Otherwise leave it as an area or an unrecognised section.
   - `discretion`: `{ heading, lead, items, trailer }`, from the /discretion/i subsection.
     - The list items are the items. Paragraphs before the first list are the lead; paragraphs after it are the trailer.
     - When there are no lists and exactly one paragraph has a top-level colon (outside backticks and parentheses) followed by a list with at least 2 top-level separators: lead is the text up to and including that colon, and items split on top-level `;` if present, else `,`. Strip leading and/or and the trailing period.
     - Otherwise the paragraphs are the lead, with 0 items.
   - `specifics` and `deferred`: `{ heading, items: { title, body }[] }` from each section's blocks, per the behavior block.
   - `boundary.extras`: `{ title | null, blocks }[]`, one per `###` subsection (or `---` run) after the summary region.
   - Move every table block in the summary region, together with a plain paragraph ending in ':' directly before it, from summary blocks into `boundary.notes`. The narrow In card never holds a table.
   - `references` and `code` headings go into recognizedHeadings.
   - Regenerate the goldens again. Additive only.

2. Composer.
   - Stats.
   - The open panel model: rows with id `question-` plus the lowercased tag, or `question-{n}`; blocks chips resolved against refTargets; `refTargets` gains the OPEN tags.
   - Per decision: `openChips` (the open tags that block it), `claudeNotes`, and an area `openCount`.
   - Discretion tagging: an item attaches to the FIRST `D-\d{1,3}` it names, and only if a register row has that tag. Everything else stays loose.
   - `discretionPanel`: `{ lead, loose, trailer }`, omitted when all three are empty.
   - `ideas`: the specifics and deferred panels, each omitted when it has 0 items.
   - `boundaryNotes`: notes plus extras.
   - The group partition. Normalise headings (lowercase, strip * ` _, link syntax to its label, collapse whitespace) and compare them with recognizedHeadings. `extras` holds the unrecognised groups (plus the leading group when preambleExtra). `more` holds the references and code groups.

3. Components.
   - Stat row inside the hero's left column: `div.view-context-stats` of `button.view-context-stat`, each a `strong` count plus its label, in P-2 copy and order. The open stat adds `view-context-stat-caution`. Each calls jumpTo. hard-to-undo and left-to-Claude open the target row.
   - Boundary notes: `section.view-block.view-context-boundary-notes`, directly after the out-strip. Each note or extra is an h3 title (when present) plus a BlockList. Tables go inside `.document-overflow-boundary`.
   - Open panel (P-4): `section#context-open.view-block.attention-panel.view-context-open`. Its top rule and eyebrow use --caution.
     - It holds `p.eyebrow` "Open for the researcher", then the lead as `p.source-note`, then `ol.view-context-open-list`.
     - Each `li[id]` holds `span.view-context-tag` (the tag, or the number), the question (a button with aria-expanded when detail exists), and the chips: caution `button.status-chip` "blocks D-NN" that calls jumpTo(decision, { open: true }), or a quiet "unattached" chip for a tagged item with no blocks.
     - The revealed detail goes through Inline.
     - No panel is rendered when there are 0 rows.
   - Register additions (P-5, P-6):
     - the area head gains a caution "N open" chip when openCount > 0.
     - the decision chips gain caution OPEN-NN chip buttons, which jump to the question and open it.
     - `div.view-context-claude-note` rows sit under a decision, each with `span.view-context-claude-label` "Claude decides" (accent colour, per the reservation) and the Inline text.
   - Extras: before the register, each unrecognised group is `section.view-block.view-context-extra`, holding `header.section-heading.compact > h2` with the group heading (or INTRODUCTION_LABEL), then `renderHtml(stripLeadingHeading(group.html))`, the existing sanitized path.
   - Discretion panel: `section#context-discretion.view-block.preview-panel.view-context-discretion`, holding `p.eyebrow` "Also left to Claude", the lead as `p.source-note`, `ul.view-context-leftover`, and the trailer paragraphs.
   - Ideas (P-7): `div.view-block.view-context-ideas` (2 columns, 1 below 62rem). Each panel is `section#context-specifics|#context-deferred.preview-panel`, holding `header.section-heading.compact` (h2 "Specific ideas" / "Deferred" plus a span count) and `ul` rows of `button.view-context-idea[aria-expanded]`. A row holds a strong title and a body clamped to 2 lines until opened. An untitled row shows its body at foreground colour.
   - More (P-8): `details#view-remainder.artifact-metadata.view-context-more`, closed by default.
     - The summary is REMAINDER_LABEL plus `<span>`: "1 section" or "N sections" (the F-11 contract).
     - The body is `div.view-context-more-groups` (2 columns, 1 below 62rem). Each group gets an h3 with its heading and a count from countListItems, then renderHtml(stripLeadingHeading(html)). The markdown's own ### headings do the grouping.
     - No disclosure is rendered when `more` is empty.
   - Order inside the canvas: hero, out-strip, boundary notes, open panel, extras, register, discretion panel, ideas, More.

4. CSS: additive `.view-context-*` rules for everything above, mirroring the sketch's .stat/.attn-list/.claude-note/.idea/.leftover/.back-groups. Use tokens only, keep corners square, respect prefers-reduced-motion for any jump highlight, and check both themes.

5. Tests.
   - Extend test/context-brief.test.ts and test/web/context-brief.test.ts with the behavior block.
   - Create test/web/context-brief-corpus.test.ts in the discussion-log-corpus.test.ts idiom: SP_ROOT is gated with it.runIf(existsSync), and ContextHandler.parse runs on the real file contents. Pin the counts listed in the behavior block. Before pinning, confirm each count independently against the source (grep or awk over the file). Never copy a count from the extractor's own output.
   - Word coverage: strip markdown punctuation from each source section and collect /[A-Za-z]{4,}/ words. Assert each one is present, case-insensitively, in the concatenation of every string in the projected brief (including outSource, lead and trailer).
   - Extend the e2e spec with one SP-independent test on LB v1.1/05: the "decisions locked" stat focuses the first decision row, and the discretion notes count equals 4.
  </action>
  <verify>
    <automated>npm test && npm run typecheck && npm run lint && npx playwright test test/e2e/context-brief.spec.ts && CSSD="$(git diff 386e492 -- src/web/styles/globals.css)" && test "$(printf '%s\n' "$CSSD" | grep -c '^-[^-]')" = "0" && GD="$(git diff -U0 386e492 -- test/__golden__)" && test "$(printf '%s\n' "$GD" | grep '^-[^-]' | grep -vc '^-[[:space:]]*}$')" = "0" && git diff --quiet 386e492 -- src/web/views/layout.ts src/web/views/layout-components.tsx src/web/views/layout-discussion-log.ts src/web/views/layout-plan.ts src/web/views/layout-verification.ts src/planning-repo/handlers/section-projection.ts</automated>
  </verify>
  <done>
    - All eight pattern points (P-1..P-8) render from real data.
    - SP 01 shows 3 open questions with working "blocks D-NN" and OPEN-NN jumps, 3 "Claude decides" notes and 2 loose items.
    - Every corpus CONTEXT passes the pinned-count and word-coverage guards.
    - The More disclosure satisfies the F-11 remainder contract.
  </done>
</task>

<task type="auto">
  <name>Task 3: Real-corpus CONTEXT e2e (this repo, plus studio-portal on 4198), the F-01..F-15 sweep in light and dark at 1280 and 420, B3 regression proof, docs, build</name>
  <files>test/e2e/context-brief.spec.ts, playwright.config.ts, test/e2e/measure.ts, src/web/styles/globals.css, docs/design-language.md</files>
  <action>
Prove the page against real corpus files and the foundation sweep, then close every gate (C-4, LJU-09).

1. Second corpus server. In playwright.config.ts, turn webServer into an array.
   - Keep the existing entry byte-for-byte.
   - Append `node src/server/index.ts <HOME>/studio-portal --port 4198` (url `http://127.0.0.1:4198/api/dashboard`, `reuseExistingServer: false`, same timeout, stdout ignored) only when existsSync(join(homedir(), 'studio-portal', '.planning')) holds.
   - Port 4198 is deliberate: 4173 and 4174 belong to systemd units that must never be touched (C-5), and 4199 is the main harness. Record that reasoning in a comment.
   - The server stays read-only; it only reads that tree.

2. Full spec in test/e2e/context-brief.spec.ts.
   - Fixtures are resolved from each server's /api/presentation by path fragment, never hardcoded URLs.
   - Expected numbers come from the same server's `/api/documents?route=` → `artifact.structured.brief`, plus the pinned anchors listed below.
   - Repo fixtures:
     - LB v1.1/05: prose out-strip of 4; 4 Claude notes; 3 loose.
     - LB v1.0/01: label-prose out of 1; discretion lead, bullets and trailer.
     - LB v1.0/04: a costly caution chip on D-05, and its detail shows the Reversibility line; "hard to undo" is at least 1.
     - quick oae: 9 untagged rows across 3 areas, no out-strip, no discretion panel.
     - quick jxp: the numbered boundary list in the In card, and 1 out item from the unbolded "Out of scope:".
   - Checks for every fixture:
     - there is no .document-cover and no .document-fold.
     - `.artifact-heading .eyebrow` starts with "Context".
     - `.artifact-meta-row` holds a `.status-chip` and `.artifact-path-copy`.
     - DOM order is hero, then open panel, then register, then ideas, then `details#view-remainder`, skipping absent parts.
     - the register row count equals the count box, which equals the projection.
     - `#context-open` is absent on every repo fixture.
     - the More disclosure starts closed, its summary span reads "N sections", and opening it shows `.artifact-document`.
     - toggling to Source shows `.artifact-document` and zero `.view-block`, and toggling back restores the same `.view-block` count.
     - when /api/presentation gives the phase requirementIds, the "Covers" note contains the first ID; otherwise it is absent.
   - Studio-portal fixtures, run via test.skip when the directory is absent, against baseURL 4198:
     - SP 01: an attention panel with 3 rows. Clicking OPEN-01's "blocks D-09" chip scrolls to `#decision-d-09`, puts it in view and expands it. The OPEN-01 chip on D-09 jumps back to `#question-open-01`. The Claude notes sit under D-01, D-10 and D-12. The "Covers" note contains "AUTH-01".
     - SP 04: the boundary notes table has 9 body rows. The out-strip has 1 item. The attention panel has 3 numbered rows with no blocks chips. The `<blocking_amendments>` section renders as `.view-context-extra`, with its heading, before the register.
     - SP v1.0/04: a boundary-notes h3 contains "XFER-07".
     - SP quick 2pr: `.view-context-note` count is 10.
   - 420px in light and dark, for every repo fixture and SP 01/04, with the first decision and first idea expanded and More opened: document scrollWidth is at most innerWidth + 1, and every `.document-overflow-boundary` either fits or scrolls (reuse overflowState from measure.ts).

3. Foundation sweep.
   - Add the new radius-bearing candidates (`.view-context-hero`, `.view-context-in`, `.view-context-open`, `.view-context-stat`, `.view-context-decision`, `.view-context-idea`, `.view-context-more`, `.artifact-meta-row`) to CORNER_SELECTORS in test/e2e/measure.ts.
   - Run `npm run test:e2e`. The doc-context page (LB v1.0/01, the lexically first path) must pass F-01..F-15 in light and dark at 1280 and 420 with zero unwaived failures. known-per-type.json gains nothing.
   - Fix any finding in the page or in additive CSS. Never weaken a check. If a harness correction is genuinely required, mirror the existing "Harness correction (…, not a per-type waiver)" comment discipline and name this task.

4. Docs. Add language-beyond-names bullets to docs/design-language.md:
   - CONTEXT uses the sketch-006 D1 brief layout (manifest `brief` hook), not B3, and ends on the More disclosure, not an endnotes sheet.
   - The 10% accent reservation extends to the brief's In-this-phase card top rule (the dashboard's `.immediate-work`, reused verbatim), the ✓ marks, and the "Claude decides" label.
   - `caution` is amber and never an error: the parse-degradation tones stay reserved for the parse badge.

5. B3 regression proof (C-3). test/e2e/document-layout.spec.ts and artifact-header.spec.ts must pass unchanged. The git diff gate below proves their sources and the B3 view files are untouched.

6. Run `npm run build`. It writes dist/. Do not restart or signal labelore.service; the user restarts it to pick up the server-side projection. Until then the live UI falls back to the promoted-block view, by design (C-1).
  </action>
  <verify>
    <automated>npm test && npm run typecheck && npm run lint && npm run test:e2e && npm run build && git diff --quiet 386e492 -- src/web/views/layout.ts src/web/views/layout-components.tsx src/web/views/layout-discussion-log.ts src/web/views/layout-plan.ts src/web/views/layout-verification.ts src/planning-repo/handlers/section-projection.ts test/e2e/document-layout.spec.ts test/e2e/artifact-header.spec.ts test/e2e/known-per-type.json && CSSD="$(git diff 386e492 -- src/web/styles/globals.css)" && test "$(printf '%s\n' "$CSSD" | grep -c '^-[^-]')" = "0"</automated>
    <human-check>After the user runs `systemctl --user restart labelore` (the live service targets ~/studio-portal; check with `systemctl --user cat labelore`), open https://cinedise.persian-elnath.ts.net/ and go to studio-portal phase 01's CONTEXT. Compare it against sketch 006 D1 (https://cinedise.persian-elnath.ts.net/sketches/006-context-brief/) in light and dark, at desktop and phone width: the boundary leads, the out-strip is quiet, the amber panel's blocks chips jump, the register's area column sticks, "Claude decides" notes sit under D-01, D-10 and D-12, and More is closed. Then open one discussion log, one PLAN and one VERIFICATION and confirm B3 is unchanged.</human-check>
  </verify>
  <done>
    - npm test, typecheck, lint, test:e2e (the CONTEXT spec over real repo files plus studio-portal when present, and the full F-01..F-15 sweep in light and dark at 1280 and 420) and build are all green.
    - B3 sources and specs are unchanged, globals.css only grew, and neither labelore.service nor the sketch server was touched.
  </done>
</task>

</tasks>

<source_audit>
| Source | Item | Covered by |
|---|---|---|
| GOAL | CONTEXT view from sketch 006 D1, its own shape, same site, not B3 | Tasks 1-3 |
| CONTEXT (locked pattern) | P-1 intro (eyebrow/date, status, Covers, copy-path, toggle) | Task 1 (steps 5, 7-9) |
| CONTEXT | P-2 boundary hero + In card; stat buttons | Task 1 (hero), Task 2 (stats) |
| CONTEXT | P-3 quiet out-strip with → destinations | Task 1 |
| CONTEXT | P-4 amber open-questions panel, blocks D-NN jump chips, no panel when none | Task 2 |
| CONTEXT | P-5 continuous register (sticky area column, tag gutter, summary, detail/reversibility on click, OPEN/reversibility chips) | Task 1 (register), Task 2 (OPEN chips) |
| CONTEXT | P-6 discretion tagged as "Claude decides" + "Also left to Claude", no endnotes | Task 2 |
| CONTEXT | P-7 specific + deferred preview panels with count boxes, clamp/expand | Task 2 |
| CONTEXT | P-8 single closed "More in this document" (refs + code insights, ### grouping) | Task 2 |
| Constraint | C-1 nothing dropped / plain degrade / never an error | Task 1 (try/catch, null → fallback), Task 2 (partition, extras, notes, word-coverage guard) |
| Constraint | C-2 conservative prose split | Task 1 |
| Constraint | C-3 B3 pages do not regress | Tasks 1-3 git-diff gates; Task 3 specs |
| Constraint | C-4 gates incl. CONTEXT e2e + F-01..F-15 light/dark 1280/420 + build | Task 3 |
| Constraint | C-5 never touch 4173/4174 | Task 3 (4198 server, build only) |
| Constraint | C-6 visual-contract canvas test → full-width contract | Task 1 |
| REQ | LJU-01..LJU-09 (defined below) | see frontmatter + tasks |
| RESEARCH | none: no research phase; sketch README "Parsing notes" folded into Task 1 and Task 2 parse rules | Tasks 1-2 |

Requirement IDs for this quick task:
- LJU-01: server-side brief projection.
- LJU-02: intro via ArtifactHeader.
- LJU-03: hero and out-strip.
- LJU-04: open-questions panel.
- LJU-05: register.
- LJU-06: tagged discretion.
- LJU-07: ideas, More and unrecognised sections.
- LJU-08: visual-contract fix.
- LJU-09: all gates, with B3 untouched.

Not in scope, per the user: D2 and D3 variants, the B3 cover/fold treatment for CONTEXT, and an endnotes sheet.
</source_audit>

<planner_contributions>
- ai-integration: not detected. This is a quick task with no ROADMAP phase, and it integrates no external API/SDK. No COVERAGE.md.
- assumption-delta: skipped. There is no ROADMAP phase section to scan.
- schema-gate: not detected. No ORM schema files.
- security: applied. See `<threat_model>` below (ASVS L1, block_on high). No new dependencies, so no package-legitimacy checkpoint.
</planner_contributions>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target `.planning/` → server parser | CONTEXT markdown is untrusted content from any targeted project (including ~/studio-portal) |
| server JSON → browser render | `structured.brief` strings and group HTML cross into the DOM |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-lju-01 | Tampering (XSS) | context-brief-components.tsx, inline-markdown.ts | high | mitigate | Brief strings render only as React text, code, strong and em nodes via tokenizeInline. There is no raw-HTML prop in the new files, enforced by a verify grep. Whole-section HTML goes only through the existing rehype-sanitize → DocumentView path. A tokenizer test keeps `<script>` as text. |
| T-lju-02 | Denial of Service (ReDoS) | context-brief.ts parser | medium | mitigate | Line scanning uses splitSections/splitSubsections/parseMarkdownTable, bounded per-line regexes, no whole-document regex and no nested unbounded quantifiers. A 200k-character pathological-line test must finish in under 250 ms. |
| T-lju-03 | Tampering (link/href injection) | tokenizeInline, ref buttons | medium | mitigate | Link URLs are never emitted, only labels. Jump targets are composer-built ids from validated `D-\d{1,3}`/`OPEN-\d{1,3}` tags and are never taken raw from content. |
| T-lju-04 | Denial of Service (parse crash) | ContextHandler.parse | medium | mitigate | extractContextBrief runs inside try/catch, and decisions/sections are unchanged. The composer type-guards the brief and returns null, so the page falls back to the promoted-block view and never shows an error. |
| T-lju-05 | Information Disclosure | e2e server on 4198 | low | accept | It exists only during `npm run test:e2e`, binds 127.0.0.1, and reads ~/studio-portal read-only, as labelore always does. |
| T-lju-06 | Tampering (target planning state) | read side | low | mitigate | The read-only reader is unchanged. The new parser has no filesystem access; it only sees the body string. |
</threat_model>

<verification>
- `npm test` is fully green. That includes test/context-brief.test.ts, test/web/inline-markdown.test.ts, test/web/context-brief.test.ts, test/web/context-brief-corpus.test.ts, test/web/caution-contrast.test.ts, the updated visual-contract test, class-vocabulary, view-page-contract, token-guard, css-source-order and the regenerated goldens.
- `npm run typecheck` and `npm run lint` are clean.
- `npm run test:e2e` is green: context-brief.spec.ts over repo fixtures (plus studio-portal on 4198 when present), document-layout.spec.ts and artifact-header.spec.ts unchanged, and the F-01..F-15 foundation sweep in light and dark at 1280 and 420 with zero unwaived failures.
- `npm run build` succeeds.
- `git diff 386e492` shows B3 view files, section-projection.ts and the B3 specs unchanged, and globals.css additions only.
</verification>

<success_criteria>
- Every corpus CONTEXT (19 files) renders the D1 brief in View mode with nothing dropped, and every unrecognised shape degrades plainly.
- Open questions, blocks chips, reversibility chips, "Claude decides" notes, stats, ideas and the single More disclosure all behave as the sketch shows.
- DISCUSSION-LOG, PLAN and VERIFICATION B3 pages are unchanged. All five gates are green. Neither systemd unit was touched.
</success_criteria>

<output>
Create `.planning/quick/260923-lju-context-page-per-sketch-006-d1/260923-lju-SUMMARY.md` when done. Record that the jxp
deferred canvas-test item is resolved, and that the user must restart labelore.service for the server-side projection
to go live.
</output>
