---
phase: quick-260930-wfs
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/planning-repo/handlers/pattern-map.ts
  - src/planning-repo/handlers/patterns.ts
  - src/planning-repo/handlers/index.ts
  - src/web/views/manifest.ts
  - src/web/views/manifests.ts
  - src/web/views/pattern-map.ts
  - src/web/views/pattern-map-components.tsx
  - src/web/pages/artifact-page.tsx
  - src/web/styles/globals.css
  - docs/design-language.md
  - test/pattern-map.test.ts
  - test/web/pattern-map.test.ts
  - test/web/pattern-map-corpus.test.ts
  - test/web/patterns-view-contract.test.ts
  - test/__golden__/dense.json
  - test/e2e/patterns-map.spec.ts
  - test/e2e/measure.ts
  - .planning/quick/260930-wfs-build-sketch-013-b-by-location-panel-as-/capture-side-by-side.mjs
autonomous: true
requirements: [WFS-01, WFS-02, WFS-03, WFS-04, WFS-05, WFS-06, WFS-07, WFS-08, WFS-09, WFS-10]

estimate:
  tokens: 170000
  raw_tokens: 170000
  tasks: 3
  confidence: low

must_haves:
  truths:
    - "WFS-02/03: in View mode, labelore's v1.1/05 PATTERNS (.planning/milestones/v1.1-phases/05-per-type-document-views/05-PATTERNS.md) opens on the sketch-013 cover: eyebrow 'Pattern map · Phase 5', title 'Per-Type Document Views', facts 'Mapped 2026-09-20 · Files analyzed 17 (new + modified) · Analogs found 17 / 17' as the author wrote them, a match-quality meter derived from the classification (Exact 8, Role match 8, Partial 0, New ground 1), and a quiet mono 'Searched' line that truncates with a 'more' toggle. Source mode still shows the plain rendered document."
    - "WFS-04: the file map lists every classification row once, grouped by area — studio-portal v1.0/02 uses the doc's own five groups in order (Backend — new modules (greenfield), Backend — modified, Backend — tests & fixtures, Frontend, Ops artifacts); a doc without groups is grouped by path. Each row carries a quality chip (Exact / Role / Partial / New), the file name with its directory under it, and '← analog' or '↺ extends itself' or a muted 'no analog', plus '＋ part new' when a No Analog Found entry covers part of a file that has an analog. No Analog Found entries and Pattern Assignment sections that match no classification row appear as rows in a trailing 'Outside the file table' area, so nothing is dropped."
    - "WFS-05: a side panel beside the map (sticky at desktop, stacked below the map under 62rem) shows the selected file: name, directory and tag, quality chip with its qualifier and role, Copy from, Use instead, 'Why nothing matches' (or 'No analog for part of it'), the first guidance paragraph with a 'More guidance' toggle, rule chips, and 'N code excerpts in source'. The first new-ground file is selected on load; clicking a row selects it."
    - "WFS-06: a House rules chip strip sits above the map, each chip reading the rule's short name plus ' · N' when it touches N files. Picking a chip shows a notice with the rule text and its Apply to (or 'Not tied to specific files — applies broadly'), dims every row the rule does not touch, and marks the chip pressed; picking it again or pressing Escape clears it."
    - "WFS-07: extra sections (Cross-Cutting Notes for the Planner, Scope Basis, the No Analog Found intro) sit collapsed in back matter; an 'In the source only' strip lists 'N code excerpts', 'Line citations', 'Data-flow labels' and 'Metadata', and each switches to Source mode at its heading. No code excerpt, line citation or data-flow label renders in the view."
    - "WFS-08: every colour is a theme token or a design-language tone — exact → complete, role match → quiet, partial → in-flight, no analog → missing; the mapper's note is flagged in-flight. destructive and warning never appear, corners stay squared, and light and dark both read."
    - "WFS-09: all 11 corpus PATTERNS files (4 in labelore, 7 in studio-portal) extract without throwing and compose to a non-null map whose classified row count and quality split match the source tables; the dense fixture's 01-PATTERNS.md (no File Classification) composes to null and falls back to the existing view; a malformed or pathological PATTERNS body never throws and extracts within the time bound."
    - "WFS-10: side-by-side PNGs (sketch 013 B left, build right) exist for the four sketch docs in light, three in dark, a selected-file pair, a picked-rule pair and a 390px pair, plus build-only captures of the seven other corpus PATTERNS docs; every Winner deviation they showed is fixed or recorded in the SUMMARY. npm test, typecheck, lint and the narrow patterns-map e2e spec pass; dist/ is rebuilt and labelore.service restarted so http://cinedise:4173 serves the pattern map."
  artifacts:
    - path: "src/planning-repo/handlers/pattern-map.ts"
      provides: "extractPatternMap(body): the tolerant, fence-aware, line-bounded PATTERNS projection — cover facts, mapper's note, classification rows with their groups, assignments, shared patterns, no-analog entries and intro, other sections, metadata scope, excerpt counts and a section ledger"
      contains: "extractPatternMap"
    - path: "src/planning-repo/handlers/patterns.ts"
      provides: "PatternsHandler (kind 'patterns', token PATTERNS) adding structured.map inside a try/catch"
      contains: "PatternsHandler"
    - path: "src/web/views/pattern-map.ts"
      provides: "composePatternMap(ViewInput): the pure merge — one row per file with quality, tone, analog shorthand, assignment, no-analog reason, rules and area; unplaced rows; counts; rules with hits; back matter; source-only targets. Null when nothing composes."
      contains: "composePatternMap"
    - path: "src/web/views/pattern-map-components.tsx"
      provides: "PatternIntroMeta (facts, meter, Searched line) and PatternMapView (mapper's note, House rules strip, grouped file map, side panel, back matter, source-only strip)"
      contains: "PatternMapView"
    - path: "test/web/pattern-map-corpus.test.ts"
      provides: "Real-corpus guard over every PATTERNS.md in labelore and studio-portal, with independently confirmed pinned counts"
  key_links:
    - from: "src/planning-repo/handlers/index.ts"
      to: "src/planning-repo/handlers/patterns.ts"
      via: "PatternsHandler registered after ResearchHandler, before FrontmatterOnlyHandler; GenericMarkdownHandler stays last"
      pattern: "PatternsHandler"
    - from: "src/web/views/manifests.ts"
      to: "src/web/views/pattern-map.ts"
      via: "the patterns manifest declares patternMap: composePatternMap and keeps its promote list as the fallback"
      pattern: "patternMap: composePatternMap"
    - from: "src/web/pages/artifact-page.tsx"
      to: "src/web/views/pattern-map-components.tsx"
      via: "manifest.patternMap?.(viewInput) memo; View mode renders PatternMapView and PatternIntroMeta replaces the header copy"
      pattern: "PatternMapView"
---

<objective>
Build sketch 013's winner, **B: By location + panel**, as the PATTERNS page view. A PATTERNS.md (pattern map) is 300–980 lines of planner-facing code excerpts; the view answers the human questions instead: when it was mapped, how much of the phase has a precedent, which files are new ground and why, what each file copies from (and any warning), and which house rules apply. Classification, assignments and no-analog each list the same files, so the view merges them into one file map.

Purpose: PATTERNS is the next type in the per-type view loop (DISCUSSION-LOG, CONTEXT and RESEARCH are done). Today it renders through the generic promoted-section view.

Output: a server-side PATTERNS extractor and handler, a pure composer, the view components and CSS, wired through the view registry seam exactly as RESEARCH is; unit, corpus, contract and one narrow e2e test; side-by-side evidence against the sketch; a rebuilt and restarted live app.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@.planning/sketches/013-patterns-page/README.md
@docs/design-language.md

<winner_spec>
From `.planning/sketches/013-patterns-page/README.md` ## Winner (the spec) and ## Shared across variants:
- W-cover: eyebrow "Pattern map · Phase N", title, facts Mapped · Files analyzed · Analogs found **as the author wrote them**, a match-quality meter derived from the classification, a one-line **Searched** scope in quiet mono that truncates with a "more" toggle.
- W-note: the mapper's note (preamble before the first `##`) as a flagged notice.
- W-map: one file map grouped by area — the doc's own classification groups when present, else by path — one row per file with a quality chip, name + dir, and "← analog" / "↺ extends itself" / "no analog".
- W-panel: a sticky side panel (stacks below on narrow widths) shows the selected file: quality, copy-from, why nothing matches, guidance with "More guidance", rule chips, excerpt count.
- W-rules: house rules as a chip strip above the map; picking one explains the rule and dims the files it doesn't apply to.
- W-back: planner notes (extra sections) collapsed in back matter; code excerpts, line citations and data-flow labels left to Source mode (an "In the source only" strip).
- W-tones: exact → complete, role-match → quiet, partial → in-flight, no analog → missing.
Variants A and C are not built.
</winner_spec>

<interfaces>
Established seams this plan plugs into (read at planning time):
- `src/planning-repo/handlers/research.ts` is the handler to mirror: `tryParseFrontmatter`, `deriveTitle`, `projectSections(ref.kind, fm.body)`, then `structured: { ...structured, briefing }` with the extractor call in try/catch (a throw only omits the key).
- `src/planning-repo/handlers/index.ts` — ordered `HANDLERS`; PATTERNS files currently fall through to `GenericMarkdownHandler` (the dense golden shows `"kind": "patterns"`, `"structured": {}`). `FrontmatterOnlyHandler`'s KNOWN_TOKENS does not include PATTERNS.
- `src/planning-repo/handlers/artifact-token.ts` — `artifactTokenOf(ref)` returns `'PATTERNS'` for phase, archived-phase and quick PATTERNS files.
- `src/planning-repo/handlers/research-briefing.ts` exports `splitWithPreamble(body, level)` and `splitFenceAware(body, level)` (fence-aware heading split, tag-only lines dropped, lines clipped to MAX_LINE) — reuse them; do not fork.
- `src/planning-repo/handlers/context-brief.ts` exports `parseBlocks(markdown): Block[]` (paragraph / list / table / code) and the `Block` type.
- `src/planning-repo/handlers/markdown-sections.ts` `parseMarkdownTable` slices `.slice(1, -1)` and so **drops the last cell of a row with no trailing pipe** — labelore v1.1/05's classification rows have no trailing pipe and their last cell is Match Quality. Do not use it (and do not change it: other views and goldens depend on it).
- `src/web/views/manifest.ts` — `ViewManifest` has optional `brief` and `briefing` hooks with type-only imports; `ViewInput` carries `structured`, `groups`, `headings` (`{id, text, depth}`).
- `src/web/views/manifests.ts` — the `patterns` entry has `promote` (file classification, pattern assignments, shared patterns, no analog found) and a UI-SPEC lead that stays verbatim; `research` shows the `briefing: composeResearchBriefing` hook shape.
- `src/web/pages/artifact-page.tsx` lines ~579-592 (brief / briefing memos), ~596-615 (`showSource(id)` switches to Source mode and scrolls to the heading id), ~622-623 (`viewAvailable`), ~682-735 (ArtifactHeader eyebrow / title / lead / meta), ~806-825 (view branches).
- `src/web/views/research-briefing-components.tsx` exports `ResearchInline({ text })` and `ResearchBlocks({ blocks })` — the only sanctioned way author text reaches the DOM (tokenizeInline → React nodes). Its source-only `<nav>` (~lines 1310-1330) and `ResearchIntroMeta` are the idioms to mirror.
- CSS: the RESEARCH block is `/* quick-260929-3x3:start */` … `/* quick-260929-3x3:end */` (globals.css ~5974-8024, the end of the file). Existing tokens: `--primary`, `--primary-tint`, `--in-flight-fill`, `--in-flight-border`, `--missing-fill`, `--missing-border`, `--muted-foreground`, `--border`, `--card-veil`, `--state-hover`; `.status-chip[data-tone=complete|quiet|in-flight|missing]` already styled; sticky reading chrome uses `top: var(--space-22)`; the app's breakpoints are `@media (max-width: 62rem)` and `(max-width: 42rem)` (no container queries).
- Class names: `view-patterns-*` is in the reserved view-local namespace (`patterns` ∈ VIEW_LOCAL_PREFIXES) and needs no doc row; reuse shared names (`status-chip`, `view-block`, `document-reader-layout`, `document-canvas`, `eyebrow`, `notice`) where they fit.
- Tests to mirror: `test/research-briefing.test.ts` (extractor + handler guard + timing), `test/web/research-briefing.test.ts` (composer + renderToStaticMarkup), `test/web/research-corpus.test.ts` (corpus walk, `SP_PLANNING` from `test/helpers/studio-portal.ts`, skip when absent), `test/web/research-view-contract.test.ts` (source-text contract), `test/e2e/research-briefing.spec.ts` (fixtures resolved via `/api/presentation`, SP on port 4198).
- Sketch logic to port: `.planning/sketches/013-patterns-page/gen-data.mjs` (parse) and `index.html` lines 204-349 (`pathsOf`, `refMatches`, `analogKey`, `model`, `groupOf`, `variantB`, `detail`, `cover`, `backMatter`, `shortRule`, `analogShort`, `firstSentence`).
</interfaces>

<corpus_facts>
Confirmed at planning time with awk over the source tables (last cell of each File Classification row, independent of any parser) — the pinned counts for tests:

| Doc | Classified rows | Exact | Role (incl. unknown) | Partial | None | Groups | Shared | Fenced blocks |
|---|---|---|---|---|---|---|---|---|
| sp v1.0/02 storage health (sketch hard case) | 26 | 7 | 3 | 5 | 11 | 5 | 6 | 39 |
| sp phases/04 bulk archive (sketch, per-concern assignments) | 30 | 25 | 5 | 0 | 0 | 0 | 4 | 19 |
| sp phases/01 identity sessions (sketch) | 16 | 7 | 4 | 1 | 4 | 0 | 7 | 17 |
| lb v1.1/05 per-type views (sketch) | 17 | 8 | 8 | 0 | 1 | 0 | 7 | 26 |
| lb v1.0/02 situational awareness | 35 | 14 | 10 (4 role + 6 unknown like "data-flow match") | 0 | 11 | 0 | 7 | — |
| lb v1.0/03 search | 18 | 12 | 6 | 0 | 0 | 0 | 7 | — |
| lb v1.0/04 portability | 16 | 11 | 4 | 0 | 1 | 0 | 6 | — |
| sp v1.0/03 file browsing | 16 | 10 | 6 | 0 | 0 | 0 | 7 | — |
| sp v1.0/04 transfers | 26 | 12 | 9 | 3 | 2 | 0 | 9 | — |
| sp phases/02 roles | 22 | 16 | 4 | 0 | 2 | 0 | 9 | — |
| sp phases/03 account admin | 24 | 19 | 5 | 0 | 0 | 0 | 7 | — |

Other facts:
- sp v1.0/02 groups, in order: "Backend — new modules (greenfield)", "Backend — modified", "Backend — tests & fixtures", "Frontend", "Ops artifacts". Its `collector.rs` row is `**partial — see divergence**` and has its own `###` assignment. Its only extra `##` is "Cross-Cutting Notes for the Planner"; lb v1.0/02's is "Scope Basis" (before File Classification).
- lb v1.1/05: header says "Analogs found: 17 / 17" while No Analog Found lists 3 entries — shown as written; the meter follows the classification.
- No classification or no-analog table cell anywhere in the corpus holds a pipe inside a code span; the only row hazard is the missing trailing pipe (lb v1.1/05).
- Running the sketch's own model over all 11 files: every file parses; sketch merge leaves unmatched No Analog entries in sp v1.0/03 (2) and sp phases/02 (1), and unused assignment sections in 8 docs (1-3 each, e.g. sp phases/04 "HTTP range serving and archive lifetime") — the sketch drops them silently; this build must not.
- `fixtures/dense/.planning/phases/01-identity-slice/01-PATTERNS.md` has no File Classification (sections "Established Patterns", "Analogs") — the degrade case.
- Services: labelore.service is active in production targeting /home/cinedise/studio-portal on 127.0.0.1:4173; labelore-build-watch.service is **inactive** (dist/ will not rebuild on its own); the sketch server answers http://127.0.0.1:4174/013-patterns-page/ with 200; ports 5193, 4198 and 4199 are free.
</corpus_facts>

<gates>
Hard gates enforced by existing tests; keep them green.
- `test/web/class-vocabulary.test.ts`: every className literal is a documented shared name or `view-patterns-*`; every data-tone literal is a documented tone. Prefer data attributes (`data-quality`, `data-dim`, `data-selected`, `data-area`) over new class names.
- `test/token-guard.test.ts`: spacing, font-size and line-height use tokens; no two `:root` tokens hold identical values; a color-mix recipe may not recur at two usage sites. Use existing tokens; if a new recipe is truly needed, make it one named `:root` token with a unique value.
- `test/web/css-source-order.test.ts`: a media-query override sits right after the rule it must beat.
- F-05 (the e2e): every `.status-chip` on the page computes the same font-size, weight, padding, text-transform, letter-spacing and line-height — ancestors of a chip set no line-height.
- `test/snapshot.golden.test.ts`: `dense.json` changes only by the new `structured.map` on the fixture's 01-PATTERNS.md.
- React: eslint-plugin-react-hooks is on; never call setState synchronously in an effect body (a keydown listener that sets state is fine).
- Checkouts and servers: ~/studio-portal is read-only; the sketch server on 4174 is never touched; labelore.service is restarted only in Task 3 after `npm run build`.
- Playwright: only `test/e2e/patterns-map.spec.ts`, once, at the end; on a failure re-run only the failing test with `-g`. Never the full suite (~6 minutes).
</gates>

<planner_notes>
Discretion decisions (record each in the SUMMARY so the human check can confirm them):
- **Nothing dropped silently.** No Analog Found entries and Pattern Assignment sections that match no classification row become rows in a trailing area "Outside the file table" (no-analog → New chip; assignment-only → a quiet "Guidance" chip). They do not count in the meter, which the Winner derives from the classification. The No Analog Found intro paragraph goes to back matter as a collapsed entry. The sketch dropped all three.
- **Assignment headings are brace-expanded** like rule refs (the sketch only expanded rule refs), so sp v1.0/02's `frontend/components/{tier-card,nav-shell,…}` assignment finds its files.
- **Glob refs match without a regular expression** (the sketch compiled author text into a RegExp — a ReDoS path, T-wfs-03).
- **Breakpoints**: the app's 62rem / 42rem media queries stand in for the sketch's 900px / 640px container queries.
- **Meter role segment and reason box use existing tokens** (`--muted-foreground`; `--missing-border` / `--missing-fill` / `--card-veil`) instead of the sketch's inline color-mix recipes.
- **The sketch's ref-note line** (project · file · lines) is omitted — ArtifactHeader already shows the path with copy.
- **The patterns manifest lead stays verbatim** (UI-SPEC copy, kept by rule in manifests.ts). View mode hides it behind the cover as RESEARCH does; it still shows in Source mode. Note it in the SUMMARY as a follow-up candidate, do not change it here.

Planner contributions:
- ai-integration: the api-coverage detector returned detected:false on this plan body — no external API is integrated, so no coverage matrix is needed.
- assumption-delta: skipped — a quick task has no ROADMAP phase section.
- schema-gate: no ORM or schema files in scope.
- security: see `<threat_model>` (ASVS level 1, block on high).
</planner_notes>

<source_audit>
| Source | Item | Covered by |
|---|---|---|
| GOAL | Build sketch 013 B (by location + panel) as the PATTERNS page view | Tasks 1-3 |
| CONTEXT (Winner) | W-cover: eyebrow, title, facts as written, meter from classification, quiet Searched line with more | Task 1 (composer, PatternIntroMeta); Task 2 (Searched toggle polish) |
| CONTEXT (Winner) | W-note: mapper's note as a flagged notice | Task 1 (extractor); Task 2 (notice) |
| CONTEXT (Winner) | W-map: grouped by area (doc groups, else path), one row per file, chip + name/dir + analog shorthand | Task 1 |
| CONTEXT (Winner) | W-panel: sticky side panel, stacks below narrow; quality, copy-from, why nothing matches, guidance + More guidance, rule chips, excerpt count | Task 1 (model); Task 2 (panel) |
| CONTEXT (Winner) | W-rules: house-rule chip strip; picking explains and dims | Task 1 (rule hits); Task 2 (strip, notice, dim, Escape) |
| CONTEXT (Winner) | W-back: planner notes collapsed; code excerpts, line citations, data-flow labels left to Source | Task 1 (model); Task 2 (back matter, source-only strip) |
| CONTEXT (Winner) | W-tones: exact complete, role quiet, partial in-flight, none missing | Task 1 (tone map); Task 2 (CSS, docs, contract) |
| User pref | Only design-language tones and theme tokens; never destructive/warning for content | Task 2 (CSS block, contract test); Task 3 (compare) |
| User pref | Side-by-side against the sketch on its 4 docs and on the other corpus PATTERNS files; reuse the mp6 capture pattern | Task 3 (D, E) |
| User pref | At most one narrow e2e spec, run once with -g narrowing; vitest / typecheck / eslint otherwise | Task 3 (A, B) |
| User pref | Code excerpts stay in Source mode; unknown/malformed PATTERNS degrade, not break | Task 1 (extractor, degrade + corpus tests); Task 2 (static-markup "no pre" check) |
| User pref | Hosting: rebuild and restart so the user sees it at cinedise:4173 | Task 3 (C) |
| Contribution | Security threat model | `<threat_model>` |
| Excluded | Variants A and C; the sketch toolbar and toast | Not chosen by the user |
</source_audit>
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1 (tracer): PATTERNS extractor, handler and composer wired through the view seam to a cover and a grouped file map</name>
  <files>src/planning-repo/handlers/pattern-map.ts, src/planning-repo/handlers/patterns.ts, src/planning-repo/handlers/index.ts, src/web/views/manifest.ts, src/web/views/manifests.ts, src/web/views/pattern-map.ts, src/web/views/pattern-map-components.tsx, src/web/pages/artifact-page.tsx, src/web/styles/globals.css, test/pattern-map.test.ts, test/web/pattern-map.test.ts, test/web/pattern-map-corpus.test.ts, test/__golden__/dense.json</files>
  <precondition>~/studio-portal/.planning exists (the studio-portal corpus files are read, never written).</precondition>
  <read_first>.planning/sketches/013-patterns-page/gen-data.mjs, .planning/sketches/013-patterns-page/index.html (lines 204-349), src/planning-repo/handlers/research.ts, src/planning-repo/handlers/research-briefing.ts (lines 300-400 for splitWithPreamble/labelOf, 1700-1780 for the entry point), src/planning-repo/handlers/context-brief.ts (Block type, parseBlocks), src/web/views/manifest.ts, src/web/views/manifests.ts (research and patterns entries), src/web/views/research-briefing.ts (lines 1-20 and composeResearchBriefing at ~1066), src/web/pages/artifact-page.tsx (lines 560-828), test/research-briefing.test.ts, test/web/research-corpus.test.ts, test/web/research-briefing.test.ts (header)</read_first>
  <behavior>
    - extractPatternMap on lb v1.1/05: phase '5', title 'Per-Type Document Views', mapped '2026-09-20', filesAnalyzed '17 (new + modified)', analogsFound '17 / 17'; 17 classification rows, none grouped; the last row's quality cell reads 'role-match' (proves the no-trailing-pipe rows keep their last cell); 11 assignments; 7 shared; 3 no-analog entries; excerpts 26; a mapper's note with at least one block; scope starts with '`src/planning-repo/handlers/`'.
    - extractPatternMap on sp v1.0/02: 26 rows across the five named groups in order; 6 shared; 9 no-analog entries with a non-empty intro; 'Cross-Cutting Notes for the Planner' in other; excerpts 39; no guidance block is a code block.
    - Degrade: the dense fixture's 01-PATTERNS.md extracts with zero classification rows and composePatternMap returns null; an empty string, a body with an unclosed fence, a classification table with no Match Quality column (rows fall back to role), and a 1 MB body with one 200k-character line all extract without throwing, the last within 250 ms; PatternsHandler.parse keeps title/body/structured and simply omits map when the extractor throws.
    - composePatternMap on lb v1.1/05: counts exact 8 / role 8 / partial 0 / none 1; eyebrow 'Pattern map · Phase 5'; areas derived by path; the 'design-language.md' row is quality none with tone missing and is the default selection; an 'itself' analog renders as extends-itself; no unplaced rows.
    - composePatternMap on sp v1.0/02: the five doc groups as areas in order (plus 'Outside the file table' only if something is unplaced); collector.rs is partial / in-flight with qualifier 'see divergence' and an assignment whose guidance has at least one block; rule 'Reject/fail identically' (short name) touches at least one file.
    - Corpus: every PATTERNS.md under .planning (excluding sketches) and SP_PLANNING extracts, composes non-null, and its classified row count and quality split equal the corpus_facts table; every No Analog entry and every assignment section is either merged into a row or present as an unplaced row.
    - End to end: PatternsHandler.parse on lb v1.1/05 → composePatternMap → renderToStaticMarkup of PatternMapView contains 17 `data-quality` rows, the area labels, and no `<pre`.
  </behavior>
  <action>
Implements WFS-01, WFS-02, WFS-04 and WFS-09, plus the WFS-03 cover facts and meter. Write the tests from the behavior block first (RED), then implement (GREEN).

**A. Extractor — src/planning-repo/handlers/pattern-map.ts.** `extractPatternMap(rawBody: string): PatternMap`, pure, non-throwing on any string, port of gen-data.mjs's parse with its gaps fixed. Discipline (T-wfs-01): use `splitWithPreamble` / `splitFenceAware` from research-briefing.ts for `##` and `###` splits (fence-aware), clip every line, apply every regex to one bounded line or cell at a time — never a whole-document regex, never a nested unbounded quantifier. Model (export the types):
- `meta`: `phase`, `title` (from an H1 shaped "Phase N: Title - Pattern Map"; otherwise title is the H1 text and phase null), `mapped`, `filesAnalyzed`, `analogsFound` (raw values of the `**Mapped:**` / `**Files analyzed:**` / `**Analogs found:**` preamble lines), `notes: Block[]` (the preamble minus the H1 and those three lines, blockquote markers stripped, via parseBlocks, code blocks dropped, `---` rules dropped).
- `classification: { group: string | null; file; role; flow; analog; quality }[]` — the File Classification section; when it has `###` subsections each table's rows carry that heading as `group`. Parse tables with a local row splitter: drop one leading and one trailing pipe if present (the trailing one is optional), split on pipes that are neither backslash-escaped nor inside a backtick code span, skip the separator row, key cells by the lowercased header. Columns by header pattern with index fallback: file (`new/modified file` or `file`, else column 0), `role`, `data flow`, `closest analog`, `match quality` (else the last column). Skip rows whose file cell is empty.
- `assignments: { heading; analog; applyTo; useInstead; guidance: Block[]; excerpts }[]` — each `###` of Pattern Assignments. `**Analog:**` / `**Apply to:**` / `**Use instead:**` values run from the label to the next blank line or next bold label (line-accumulated). `guidance` = parseBlocks of the body with fenced blocks removed and `####` lines turned into bold sub-head paragraphs, keeping paragraphs and lists only, and dropping the bold-label lines above plus line-citation captions (a line that is only a bold label followed by a parenthetical, or only a bold label ending in a colon). `excerpts` = fenced blocks in the section.
- `shared: { heading; source; applyTo; rule: string | null; excerpts }[]` — each `###` of Shared Patterns; `source` from `**Source:**` or `**Sources:**`; `rule` is the first prose paragraph that is not a bold-label line.
- `noAnalog: { file; reason }[]` from the No Analog Found table (same row splitter), and `noAnalogNote: Block[]` — its prose outside the table (lb v1.0/03's "None — every new file…" lands here).
- `other: { heading; blocks: Block[] }[]` — every `##` that is not File Classification, Pattern Assignments, Shared Patterns, No Analog Found or Metadata, in document order, code blocks dropped.
- `scope` (`**Analog search scope:**`) and `scanned` (the first Metadata label that mentions files scanned or read) from Metadata.
- `excerpts` (every fenced block in the body) and `sections: { heading; claimed: boolean }[]` for every `##`.

**B. Handler.** src/planning-repo/handlers/patterns.ts exports `PatternsHandler` (kind 'patterns', `match: (ref) => artifactTokenOf(ref) === 'PATTERNS'`), mirroring ResearchHandler: `structured: map === undefined ? structured : { ...structured, map }` with the extractor in try/catch (T-wfs-04). Register it in src/planning-repo/handlers/index.ts right after ResearchHandler. Regenerate the dense golden with `npx vitest run test/snapshot.golden.test.ts -u` and confirm with `git diff --stat test/__golden__/` that only dense.json changed and only by the new `map` object on 01-PATTERNS.md.

**C. Composer — src/web/views/pattern-map.ts.** `composePatternMap(input: ViewInput): ComposedPatternMap | null`, pure, reading `input.structured.map` defensively (an older server's payload composes to null). Null when map is missing or classification has zero rows (per the degrade rule — the page then keeps today's view). Port index.html's `model` and `variantB` data logic with these rules:
- Quality from the cell (asterisks stripped, lowercased): starts with "no analog", "none" or contains "n/a" → none; "partial" → partial; "role" → role; "exact" → exact; anything else → role. Qualifier = the parenthetical, else the text after an em dash. Tone map: exact complete, role quiet, partial in-flight, none missing (a typed const, the only place tones are chosen). Chip labels Exact / Role / Partial / New; full labels Exact / Role match / Partial / New ground.
- `pathsOf(text)`: backticked tokens, brace-expanded (`a/{b,c}.ts` → two paths), with any `::…` or `:<digit>…` suffix removed. A row's real paths are those containing `/` or `.`; name = their basenames joined by ", " (else the plain file cell minus a trailing parenthetical); dir = the first path's directory; tag = the trailing parenthetical of the file cell (e.g. "NEW", "MODIFIED — …").
- `refMatches(ref, paths)`: equal; path ends with "/"+ref; ref has a "/" and ends with "/"+basename(path); ref ends with "/" and path contains ref; ref without "/" equals basename(path); a ref containing `*` matches with an iterative wildcard matcher written by hand (T-wfs-03) — never build a regular expression from author text.
- Assignment for a row: the first assignment whose heading paths (heading text before the first "(", brace-expanded) or Apply to paths match. No-analog for a row: an entry with paths matches by refMatches, else by case-insensitive substring of the plain file cell. `partNew` = matched no-analog on a row whose quality is not none. `analogKey`: 'itself' when the analog text starts with itself / same file / its; null for none / n/a; else the first path. `analogShort`: none → kind 'none'; itself → kind 'itself'; a key → kind 'path' with the basename; else kind 'text' with the first sentence clipped to 60 characters.
- Areas: the row's group when the doc has groups; else the sketch's `groupOf` (test/ or tests/ or backend/tests → "Tests"; src → "src/<next segment>"; frontend or backend → that segment; otherwise the first segment when there is a directory, else "Other"), in first-appearance order.
- Unplaced rows (discretion, see planner_notes): no-analog entries matched to no row (quality none, reason set) and assignments matched to no row (quality null, chip "Guidance", tone quiet; name from the heading's first path basename, else the heading text), in a final area "Outside the file table". They never count in `counts`.
- Rules: one per shared pattern — short name (heading minus a trailing parenthetical and any " — …" tail), rule text, applyTo, source, excerpts, `hits` (row ids whose paths match any Apply to path), `broad` (no Apply to paths, or Apply to says every/all). Each row gets its rule ids.
- Intro: eyebrow "Pattern map · Phase N" (just "Pattern map" when phase is null), title, mapped, filesAnalyzed split into value (first token) and qualifier (the rest), analogsFound minus any parenthetical, counts per quality over classified rows, total, scope, scanned. Also `notes`, `defaultSelection` (first classified none row, else the first row), `backMatter` (the other sections, then the No Analog intro titled "No Analog Found" when it has blocks), and `sourceOnly`: "{N} code excerpts" (omitted when 0) and "Line citations" → the Pattern Assignments heading id, "Data-flow labels" → the File Classification heading id, "Metadata" → the Metadata heading id, each id resolved against `input.headings` by normalized text (null when absent).

**D. Seam wiring.** In src/web/views/manifest.ts add an optional `patternMap?: (input: ViewInput) => ComposedPatternMap | null` beside `briefing`, with a type-only import like the others. In src/web/views/manifests.ts add `patternMap: composePatternMap` to the patterns entry; keep its lead and promote list unchanged. In src/web/pages/artifact-page.tsx add a `patternMap` memo like `briefing`, include it in `viewAvailable`, and in View mode let it supply the header eyebrow and title, a null lead, and `meta={<PatternIntroMeta intro=… />}`, and render `<PatternMapView map=… onShowSource={showSource} title=… />` in the view branch after the briefing branch. Source mode keeps the plain header and document.

**E. Tracer UI — src/web/views/pattern-map-components.tsx.** `PatternIntroMeta`: the facts line (Mapped · Files analyzed with its qualifier muted · Analogs found), the meter (a bar of segments sized by count, `data-quality` per segment, plus a key "{count} {full label}" for all four qualities), and the Searched line (truncated, with a more/less button, `aria-expanded`; the scanned text joins when open). `PatternMapView`: a `document-reader-layout` / `document-canvas` wrapper holding a "File map" section heading with the aside "{N} files · {M} areas", then each area label with its count and its rows — each row a button with `data-quality`, the quality chip (`status-chip` with the tone from the composer), name over dir, and the analog shorthand ("←" + basename, "↺ extends itself", muted "no analog", or the clipped text), plus "＋ part new" when partNew. Author text renders only through ResearchInline / ResearchBlocks — never the raw-HTML injection prop. Start the CSS block in src/web/styles/globals.css after the quick-260929-3x3 end marker, delimited by `/* quick-260930-wfs:start */` and `/* quick-260930-wfs:end */`, with only what the tracer needs (cover facts, meter, rows); Task 2 fills it.
  </action>
  <verify>
    <automated>npx vitest run test/pattern-map.test.ts test/web/pattern-map.test.ts test/web/pattern-map-corpus.test.ts test/snapshot.golden.test.ts test/handlers.test.ts test/web/view-registry.test.ts test/web/class-vocabulary.test.ts test/token-guard.test.ts && npm run typecheck</automated>
  </verify>
  <done>
    - A PATTERNS artifact carries `structured.map`; the handler survives an extractor throw.
    - The patterns manifest opts in through `patternMap`; the page shows the Pattern map cover and the grouped file map in View mode and the plain document in Source mode.
    - All 11 corpus files compose with the pinned counts; the dense fixture falls back; the pathological body stays under 250 ms.
    - dense.json changed only by the new map; the listed tests and typecheck pass; committed.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: side panel, House rules strip, mapper's note, back matter and source-only strip, with the CSS block, tones doc and view contract</name>
  <files>src/web/views/pattern-map-components.tsx, src/web/views/pattern-map.ts, src/web/styles/globals.css, docs/design-language.md, test/web/pattern-map.test.ts, test/web/patterns-view-contract.test.ts</files>
  <read_first>.planning/sketches/013-patterns-page/index.html (lines 37-108 and 143-157 for the shared and B CSS; 260-306 and 330-349 for cover, backMatter, detail, variantB), src/web/views/research-briefing-components.tsx (ResearchIntroMeta, the source-only nav near the end, ChapterLabel), test/web/research-view-contract.test.ts, docs/design-language.md (## Tones, ## Reserved view-local namespace), src/web/styles/globals.css (lines 5974-5990: the RESEARCH block header comment)</read_first>
  <behavior>
    - Static markup of PatternMapView for sp v1.0/02 includes the mapper's note, the House rules strip with 6 chips, the panel for the default (first new-ground) file with "Why nothing matches", and back matter containing a closed `<details>` titled "Cross-Cutting Notes for the Planner"; it contains no `<pre` and no code-excerpt text.
    - For lb v1.1/05 the source-only strip has 4 buttons reading "26 code excerpts", "Line citations", "Data-flow labels", "Metadata".
    - The contract helpers flag an in-memory planted string holding a raw-HTML prop, a literal parse-degradation tone and a colour literal (positive control), and pass on the real sources.
  </behavior>
  <action>
Implements WFS-05, WFS-06, WFS-07 and WFS-08, and finishes WFS-03 (Searched line, mapper's note). All state is local to PatternMapView (`useState`): the selected row id (initialised from `defaultSelection`), the picked rule id, and the set of rows with guidance expanded.

**A. Mapper's note** (per W-note): above the map, a `notice` with a `view-patterns-*` modifier and a left rule in `--in-flight-fill`, headed by a mono "Mapper's note" label, body via ResearchBlocks. Absent when `notes` is empty.

**B. House rules strip** (per W-rules): above the map, a mono "House rules" label and one `status-chip` button per rule (neutral, no tone) reading short name plus " · N" when it has hits, `aria-pressed` when picked, `title` holding the rule text. Picking a chip toggles the rule; when set, a notice under the strip shows the short name, the rule text, "Apply to" with its value, and "Not tied to specific files — applies broadly" when there are no hits; every row not in `hits` gets `data-dim="true"` (opacity only). A document keydown listener clears the rule on Escape (the selection stays, as in the sketch).

**C. Grid and panel** (per W-panel): the map and an `aside` panel side by side (map `minmax(0, 1fr)`, panel about 18-25rem, gap from the space scale); under `@media (max-width: 62rem)` one column with the panel after the map and not sticky; under `(max-width: 42rem)` the row's analog cell wraps under the name. The panel is `position: sticky; top: var(--space-22)` with a max-height and its own scroll. Clicking a row selects it (`aria-pressed` on rows, selected row tinted with `--primary-tint` and an inset primary edge; clicking the selected row keeps it). Panel content, in order: name (larger mono) and dir · tag; the quality chip, the qualifier and the role as mono notes; "Copy from" (the assignment's analog, else the classification analog) unless quality is none; "Use instead" when present; the reason box — labelled "Why nothing matches", or "No analog for part of it" when partNew — with a `--missing-border` border, a `--missing-fill` left rule and `--card-veil` fill; the first guidance block, the rest behind a "More guidance ▾ / Less ▴" button (`aria-expanded`); "Rules" with one chip per rule id that toggles the same picked rule; "{N} code excerpt(s) in source" when the assignment has excerpts. Unplaced rows open the same panel.

**D. Back matter and source-only** (per W-back): after the map, each back-matter entry as a closed `<details>` whose summary reads its heading and a count of its blocks, body via ResearchBlocks; then a `<nav aria-label="In the source only">` strip with one button per `sourceOnly` entry calling `onShowSource(targetId)`.

**E. CSS** — fill the `quick-260930-wfs` block in src/web/styles/globals.css (one contiguous block; a header comment in the style of the RESEARCH block). The contract in G reads the block's raw text, comments included, exactly as the RESEARCH contract does — so word the header comment the way the RESEARCH block's is worded: name the forbidden things in plain words, never as a custom-property token, a colour-function call or a radius declaration. Tokens only (space, font-size, line-height tokens), no radius, no literal colour, no color-mix recipe of its own, no destructive or warning token; colour only from `--primary`, `--primary-tint`, `--in-flight-fill`, `--in-flight-border`, `--missing-fill`, `--missing-border`, `--muted-foreground`, `--border`, `--card-veil`, `--state-hover`. Meter segments by `data-quality`: exact `--primary`, role `--muted-foreground`, partial `--in-flight-fill`, none `--missing-fill` (the same four for the key swatches). No ancestor of a chip sets line-height (F-05). Media overrides right after their base rules.

**F. Docs** — in docs/design-language.md ## Tones append "(quick-260930-wfs) on a PATTERNS page …" usages: complete — an exact match chip and meter segment; quiet — a role match (and unrated) chip, the Guidance chip on an unplaced assignment row, and the meter's role segment; in-flight — a partial match and the mapper's note rule; missing — a no-analog (New) chip, the new-ground meter segment and the Why nothing matches box. No shared-vocabulary row is needed unless a new non-`view-patterns-*` class name appears; if one does, add its row in the same commit.

**G. Contract test — test/web/patterns-view-contract.test.ts** (research-view-contract idiom, readFile + regex): pattern-map-components.tsx never uses the raw-HTML injection prop and never writes a literal active, destructive or warning data-tone (tones come from the composer's map); the composer source never constructs a RegExp object; manifests.ts declares `patternMap: composePatternMap` and keeps the patterns promote list; the `quick-260930-wfs` CSS block exists once, holds every `.view-patterns-` rule in globals.css, and inside it has none of the patterns the RESEARCH block test rejects (parse-degradation tokens, colour-function or hex literals, any radius declaration, colour-mix calls) — copy that test's regexes. Put the checks in small helper functions and add a positive control that runs them on an in-memory planted string holding each forbidden thing (the class-vocabulary test's positive-control idea; nothing is written under src/).

Extend test/web/pattern-map.test.ts with the behavior block's static-markup checks.
  </action>
  <verify>
    <automated>npx vitest run test/web/pattern-map.test.ts test/web/patterns-view-contract.test.ts test/web/class-vocabulary.test.ts test/token-guard.test.ts test/web/css-source-order.test.ts test/web/visual-contract.test.ts && npm run typecheck && npx eslint src/web/views/pattern-map.ts src/web/views/pattern-map-components.tsx src/planning-repo/handlers/pattern-map.ts test/web/patterns-view-contract.test.ts</automated>
  </verify>
  <done>
    - The panel, rule strip (explain, dim, Escape), mapper's note, back matter and source-only strip render from the composed model; the Searched line toggles.
    - The CSS lives in one contiguous quick-260930-wfs block using tokens and tones only; the Tones table records the PATTERNS usages.
    - The contract, vocabulary, token-guard, source-order and static-markup tests pass; typecheck and eslint are clean; committed.
  </done>
</task>

<task type="auto">
  <name>Task 3: narrow e2e, gates, rebuild and restart, and side-by-side verification against sketch 013 B on the sketch docs and the wider corpus</name>
  <files>test/e2e/patterns-map.spec.ts, test/e2e/measure.ts, .planning/quick/260930-wfs-build-sketch-013-b-by-location-panel-as-/capture-side-by-side.mjs</files>
  <precondition>http://127.0.0.1:4174/013-patterns-page/ and http://127.0.0.1:4173/api/dashboard both answer 200, and ~/studio-portal/.planning exists.</precondition>
  <read_first>test/e2e/research-briefing.spec.ts, test/e2e/measure.ts (CORNER_SELECTORS), .planning/quick/260930-mp6-build-sketch-012-b-lanes-by-kind-as-the-/capture-side-by-side.mjs, .planning/sketches/013-patterns-page/index.html (lines 183-204 and 383-398: toolbar, doc/theme/width buttons, row and rule selectors), ~/.claude/projects/-home-cinedise-labelore/memory/labelore-hosting.md</read_first>
  <action>
Implements WFS-10 and checks WFS-02..09 against the live build.

**A. e2e — test/e2e/patterns-map.spec.ts** (one new spec, research-briefing.spec.ts idiom: fixtures resolved by path through `/api/presentation`, never mocked).
- "LB v1.1/05 pattern map" (port 4199, light): one h1 reading "Per-Type Document Views"; eyebrow "Pattern map · Phase 5"; facts contain "2026-09-20" and "17 / 17"; meter key counts 8 / 8 / 0 / 1 by `data-quality`; 17 rows; the panel shows "design-language.md" and "Why nothing matches". Pick the "Error handling" rule chip: the notice appears and the dimmed row count equals 17 minus the N in the chip's " · N"; Escape clears it. The source-only strip has 4 buttons; "Metadata" lands in Source mode with the Metadata h2 in the viewport; View restores the map. F-05: all `main .status-chip` share one computed signature (more than 10 chips). Squared corners on the panel, rows and notices. At 420px in dark: no horizontal overflow, and the panel's top sits below the last row's top (stacked).
- "SP v1.0/02 pattern map" (port 4198, skipped when the checkout is absent): the five doc area labels in order; meter 7 / 3 / 5 / 11; the Mapper's note is visible; clicking the collector.rs row shows "Partial", "see divergence" and "Copy from" in the panel; the "Cross-Cutting Notes for the Planner" details is present and closed.
In test/e2e/measure.ts add the panel, row and note selectors to CORNER_SELECTORS after the quick-260929-3x3 entries (F-06). Do not run the foundation sweep.

**B. Gates.** `npm test`, `npm run typecheck`, `npm run lint`; then `npx playwright test test/e2e/patterns-map.spec.ts -g "pattern map"` once. On a failure, fix and re-run only the failing test with its own `-g` title.

**C. Build and host.** labelore-build-watch.service is inactive, so: `npm run build`; `systemctl --user restart labelore` (server code changed — the new handler); confirm `systemctl --user is-active labelore`; confirm the index served at http://100.97.55.101:4173/ references a JS asset whose contents include "view-patterns" (curl, then grep the asset). The sketch server on 4174 is not touched.

**D. Side by side** (the verify-against-sketch rule). Write capture-side-by-side.mjs in this quick directory, adapting the mp6 script (it resolves @playwright/test from the repo root), writing into the gitignored test/e2e/screenshots/wfs/. Start a detached scratch production server for the labelore docs and note its PID: `NODE_ENV=production node src/server/index.ts /home/cinedise/labelore --port 5193`. Studio-portal docs come from 127.0.0.1:4173.
- Build capture: resolve the route by path substring via /api/presentation; viewport 1440×1000 (390×900 for the phone pair) with localStorage 'labelore-theme' set before load; wait for the file map and fonts; hide fixed or sticky elements outside `main`; screenshot `main`.
- Sketch capture: load http://127.0.0.1:4174/013-patterns-page/ (variant B is the default); click the `#doc-btns` button whose `data-doc` is sp02, sp04, sp01 or lb05; click `#sketch-tools [data-theme]`; for the phone pair click `[data-width="390"]`; screenshot `#root .page`.
- Compose each pair (sketch left, build right) into one PNG named `{id}-{theme}.png` by screenshotting a local page holding both images.
- Pairs: sp-v1-02, sp-04, sp-01, lb-05 in light; sp-v1-02, sp-04, lb-05 in dark; `sp-v1-02-selected-light` (collector.rs clicked in both: sketch `button.b-row`, build the row button); `sp-v1-02-rule-light` (the "Reject/fail identically" chip picked in both); `sp-v1-02-phone-light` at 390.
- Build-only captures of the other seven: lb v1.0/02, lb v1.0/03, lb v1.0/04, sp v1.0/03, sp v1.0/04, sp phases/02, sp phases/03, in light. Record per doc: rows, areas, unplaced rows, and whether `main` overflows horizontally, into report.json.

**E. Compare and fix.** Read every composed PNG against the Winner: cover facts as written; meter with the four-entry key; quiet Searched line truncated with more; mapper's note flagged in-flight; rules strip above the map, picking dims and explains; rows grouped by area (doc groups on sp v1.0/02) with chip, name over dir and the analog shorthand, ＋ part new; the panel to the right (stacked below at 390) with copy-from, why nothing matches, guidance and More guidance, rule chips and excerpt count; back matter collapsed and the source-only strip; tones exact complete, role quiet, partial in-flight, none missing, no invented hue in either theme; squared corners. Check the wider-corpus captures for the unplaced area, very long names and dirs, and empty sections. Fix every deviation within the contract, re-run the affected unit tests, `npm run build` when dist/ must show the fix, and re-capture the affected pairs until they match. Stop the scratch server by its PID, never with pkill -f.
  </action>
  <verify>
    <automated>npm test && npm run typecheck && npm run lint && npx playwright test test/e2e/patterns-map.spec.ts -g "pattern map" && systemctl --user is-active labelore && ls test/e2e/screenshots/wfs/sp-v1-02-light.png test/e2e/screenshots/wfs/sp-v1-02-dark.png test/e2e/screenshots/wfs/lb-05-light.png test/e2e/screenshots/wfs/sp-v1-02-selected-light.png test/e2e/screenshots/wfs/sp-v1-02-phone-light.png test/e2e/screenshots/wfs/report.json</automated>
    <human-check>
      On http://cinedise:4173 (hard-refresh), at 1440px in both themes, open studio-portal v1.0/02 storage health PATTERNS and phases/04 bulk archive PATTERNS: the cover, the rules strip, the grouped file map and the side panel should read as sketch 013 B at http://cinedise:4174/013-patterns-page/. Pick a house rule and select collector.rs. Check a phone width once. Then look through the composed pairs in test/e2e/screenshots/wfs/.
    </human-check>
  </verify>
  <done>
    - The e2e spec asserts the cover, meter, rows, panel, rule strip, source-only jump and invariants, and passes in one run.
    - The full vitest suite, typecheck and lint pass.
    - dist/ is rebuilt, labelore.service is restarted and active, and the served bundle contains the pattern map.
    - The composed side-by-side PNGs and build-only captures listed in D exist; every contract deviation they showed is fixed or recorded in the SUMMARY; the scratch server is stopped.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target `.planning/` markdown → server extractor | A PATTERNS.md from any GSD project is untrusted input to a line scanner, a table splitter and label parsers running in the server process |
| structured.map → client composer | Author-written paths and globs drive matching logic in the browser |
| composed model → React DOM | File names, analogs, reasons, guidance and rule text become rendered text and attributes |
| executor → host services | Task 3 rebuilds dist/, restarts labelore.service and runs a scratch server on port 5193 |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-wfs-01 | Denial of service | src/planning-repo/handlers/pattern-map.ts extractPatternMap | medium | mitigate | Fence-aware splits via splitWithPreamble (lines clipped to MAX_LINE); every regex runs on one bounded line or cell with no nested unbounded quantifier; the table splitter is a single linear character scan. A test extracts a 1 MB body with a 200k-character line within 250 ms. |
| T-wfs-02 | Tampering (script injection) | src/web/views/pattern-map-components.tsx | medium | mitigate | Author text renders only through ResearchInline / ResearchBlocks (tokenizeInline → React nodes); the raw-HTML injection prop is never used, enforced by patterns-view-contract.test.ts; code excerpts never reach the view. The unified/rehype pipeline and its sanitize order are untouched. |
| T-wfs-03 | Denial of service (ReDoS) | src/web/views/pattern-map.ts refMatches | medium | mitigate | Glob refs from Apply to cells match through a hand-written iterative wildcard matcher; the composer never compiles author text into a regular expression (contract test asserts it). Path and ref lengths are bounded by the extractor's line clip. |
| T-wfs-04 | Denial of service (render failure) | src/planning-repo/handlers/patterns.ts | low | mitigate | The extractor call sits in try/catch; a throw only omits `map`, and composePatternMap returns null on any missing or malformed map, so the page keeps today's view. |
| T-wfs-05 | Information disclosure | corpus tests and captures | low | accept | They only read PATTERNS docs the app already renders; the studio-portal checkout stays read-only; captures go to the gitignored screenshots directory. |
| T-wfs-06 | Denial of service | labelore.service restart and the scratch server on 5193 | low | accept | A few seconds' interruption of a personal tool, as in every per-type build; the scratch server is read-only against .planning and stopped by PID. |
| T-wfs-SC | Tampering | npm/pip/cargo installs | high | accept | No package is installed or upgraded; react, react-dom/server, vitest and @playwright/test are already dependencies. Any install an executor finds necessary is out of scope and must stop for a checkpoint. |
</threat_model>

<verification>
- `npm test` passes the full vitest suite, including pattern-map, pattern-map-corpus, patterns-view-contract, snapshot golden, class-vocabulary, token-guard and css-source-order.
- `npm run typecheck` and `npm run lint` are clean.
- `npx playwright test test/e2e/patterns-map.spec.ts -g "pattern map"` passes in one run.
- The live app on 4173 serves the new bundle after `npm run build` and `systemctl --user restart labelore`.
- Composed side-by-side PNGs in test/e2e/screenshots/wfs/ cover the four sketch docs (light), three in dark, the selected, rule and phone pairs; build-only captures cover the other seven corpus PATTERNS docs; each has been read against the Winner.
- End-of-phase human check (human_verify_mode end-of-phase): studio-portal v1.0/02 and phases/04 PATTERNS on http://cinedise:4173, both themes, one phone width.
</verification>

<success_criteria>
- Every Winner item (W-cover, W-note, W-map, W-panel, W-rules, W-back, W-tones) is observable in the live app and has an automated case where testable: extractor and composer units, the corpus guard, static markup and the narrow e2e.
- The PATTERNS view plugs in through the same seam as RESEARCH (handler → structured.map → manifest hook → artifact page) and degrades to today's view when the map does not compose.
- Nothing in the doc is dropped silently: unplaced entries show as rows, extra sections and the No Analog intro sit in back matter, and code, citations and data-flow labels are one click away in Source mode.
- Colours come only from theme tokens and the design-language tones; nothing uses destructive or warning; corners stay squared.
- The user has side-by-side evidence against sketch 013 B on the sketch's docs and on the rest of the corpus.
</success_criteria>

<output>
Create `.planning/quick/260930-wfs-build-sketch-013-b-by-location-panel-as-/260930-wfs-SUMMARY.md` when done. Record in it:
- per corpus doc: classified rows, areas, unplaced rows (no-analog / assignment), and rules with hits vs broad;
- each discretion decision from planner_notes as built, and anything the side-by-side made you change (old → new, why);
- any e2e count that differs from the plan, and why;
- the paths of the composed PNGs and report.json;
- any Winner deviation left in place, with its reason;
- follow-up candidates (the Source-mode lead copy for patterns; any doc whose matching left many rows without guidance).
</output>
</content>
</invoke>
