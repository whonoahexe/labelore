# Phase 6: Trustworthy Tests and Security Baseline - Context

**Gathered:** 2026-10-25
**Status:** Ready for planning

<domain>
## Phase Boundary

The unit suite passes on every normal run with zero failures and zero skips, and it reads only made-up
data committed in this public repository. Browser tests run against an in-repo fixture and fail loudly
when it is missing. The v1.1 security promises are in place:
- linear-time scanners, with `src/rendering/linkify.ts` fixed;
- a standing raw-HTML guard;
- a capped View-mode outline;
- `config.json` secrets masked at read time, so the raw file, the file page and search never see the full value.

Requirements: TEST-01, TEST-02, TEST-03, TEST-04, SEC-01, SEC-02, SEC-03, SEC-04. SEC-05 (cross-site request
refusal) belongs to Phase 8, and the settings page itself belongs to Phase 12.

</domain>

<decisions>
## Implementation Decisions

### Replacing real-project tests
- **D-01:** Build **one made-up GSD project** under `test/fixtures/`. It holds phases, plans, summaries,
  notes, todos, debug sessions, reviews, learnings, UAT, security, validation and UI files, as a
  replacement for every test that reads another project's `.planning/` today. Both the unit corpus tests and
  the browser tests read it. It is also the TEST-04 browser-test target.
- **D-02:** Tests that pin exact numbers read from real files (task counts, skipped counts, section
  counts) are **re-pinned on the made-up project**. Each test keeps its intent and its numbers are
  recalculated there. Do not drop them for behaviour-only tests.
- **D-03:** **Labelore's own `.planning/` may still be read by tests.** It is committed in this repo and
  public, so it is not treated as live data to remove. (Only *other* projects' trees count.)
- **D-04:** The existing made-up trees (`fixtures/dense`, `fixtures/sparse-empty`,
  `fixtures/sparse-started`, `test/fixtures/dashboard/synthetic`) **stay as they are**, along with the
  golden snapshots that depend on them. The new project sits beside them.
- **D-05:** **No path to real projects survives anywhere in committed tests.** No opt-in flag, no env
  variable, no fallback candidates. Delete `test/helpers/studio-portal.ts`, the sibling-root lists in
  `test/helpers/note-corpus.ts` / `todo-corpus.ts` / `debug-corpus.ts`, and every `homedir()`-based
  path, along with all `it.runIf(existsSync(...))` / `test.skip(!..._AVAILABLE)` gates. Anyone who wants
  real output starts Labelore on that project by hand.

### What the made-up content looks like
- **D-06:** **Keep structure, new words.** Each real file a test relied on is rewritten so that every word,
  name, path, ID, date-slug and person changes. Its headings, tables, frontmatter shape, odd formatting
  and quirks stay, so the v2.0 pages keep the coverage they were built against. This applies to the
  fixtures already copied from private work too (`test/fixtures/review/sp01-*`, `dd01-*`, `dd02-*`,
  `sb02-*`, `sb14-*`, `sp03-*`, `test/fixtures/learnings/sp01-LEARNINGS.md`, the notes fixture described
  as "copied byte for byte from the sketches' data", and any other file a TEST-03 audit finds).
- **D-07:** The project is about **one invented app**: a single coherent fictional product, so phase
  names, notes and requirements read like one real project in the browser tests. The planner or executor
  picks the theme.
- **D-08:** A **standing leak test** fails if any committed fixture (`fixtures/`, `test/fixtures/`,
  `test/__golden__/`) contains a word from a deny list of private names, such as cinedise, studio-portal,
  resoundant, pyedge, deid, sideby, duet and portal names found in the audit. The deny list may be
  committed **in plain text**. The user accepted that these names are already public in today's test
  helpers.

### Secret masking (SEC-04)
- **D-09:** **Only GSD's own secret keys** count as secret: `brave_search`, `firecrawl` and `exa_search`,
  mirroring `SECRET_CONFIG_KEYS` in `~/.claude/gsd-core/bin/lib/secrets.cjs`. Name-pattern matching
  (`*key*`, `*token*` and so on) is **not** used. Copy the list into Labelore; there is no runtime
  dependency on gsd-core. A future GSD integration key shows in full until Labelore's list is updated, and
  the user accepted that.
- **D-10:** **Only text values are masked.** `true`/`false` and numbers on those keys show as they are,
  because they are on/off switches. This intentionally differs from GSD, which masks every value.
- **D-11:** The mask format is **GSD's style**: `****` followed by the last 4 characters, `****` when the
  value is shorter than 8, and `(unset)` when it is empty. Match `maskSecret()` in `secrets.cjs`.
- **D-12:** The **raw file view shows the masked object re-formatted as JSON**. The masked parse result is
  pretty-printed, so whitespace and key order may differ from the file on disk. The masked body is what
  reaches the search index and snippets, and the full value never leaves the read layer. Masking happens
  where `config.json` is read (`JsonConfigHandler.parse` in
  `src/planning-repo/handlers/json-config.ts`), so every later consumer inherits it.

### View-mode outline cap (SEC-03)
- **D-13:** View mode caps the outline at **18 entries, the same as Source mode**
  (`src/web/pages/artifact-page.tsx:205`). The user accepted that long plans and research documents will
  show a cut-off outline.
- **D-14:** When the cap is reached, the outline's last row is a **plain-text "+N more sections" line**.
  It is not clickable and does not jump anywhere. The sections still render in the document.
- **D-15:** **Source mode is left alone** (no "+N more" line) until its redesign in Phase 12.

### Plan-time decisions (from research open questions, 2026-10-25)
- **D-16:** The D-08 leak test carries a **named exemption** for the made-up dense tree's deliberate
  "studio-portal" mentions (`fixtures/dense/**`, `fixtures/README.md`, the dense golden): each exempt
  path has a one-line reason, and the test fails if the exemption list grows. The dense tree and its
  golden stay untouched (D-04).
- **D-17:** Made-up rewrites **keep structure and trim prose**: every heading, table shape, frontmatter
  key, malformed spot and formatting quirk stays; prose is cut to a few lines per section; pinned
  numbers are recalculated on the trimmed files (D-02).
- **D-18:** Tests that read Labelore's own `.planning/` (D-03) are **re-pinned to today's files**,
  including the 24 failing live-drift tests. The user accepts that these pins will need updating as
  planning continues.
- **D-19:** Private text outside `test/` and `fixtures/` (`.planning/sketches/*/data.js`, archived
  milestone folders, `.mcp.json` / `.claude/CLAUDE.md` home paths) is **out of scope** and recorded as a
  follow-up. Tests that compare fixtures byte for byte against sketch data are deleted, not re-pinned.

### Claude's Discretion
- Secret keys are masked at the top level of `config.json` only (mirrors GSD and D-09).
- How the timing tests measure growth. Research recommends the best-of-several runs at n and 4n after a
  warm-up, asserting a ratio between linear (4) and quadratic (16), plus a planted quadratic positive
  control (`.planning/research/PITFALLS.md` Pitfall 11).
- How `linkify.ts`'s `REFERENCE_TOKEN` is made linear (Pitfall 12: missing `\b` guards).
- The shape of the raw-HTML guard and its allowlist entry for `artifact-page.tsx:241`, including a
  positive control in the style of the class-vocabulary test.
- How browser tests fail loudly when the in-repo fixture is missing, and how the zero-skip rule is
  enforced (Pitfall 14).
- The invented app's theme and the fixture project's internal layout.
- Whether the "+N more" line counts only the omitted entries at depth 3 or less, or all omitted headings.
  Keep it consistent with what the cap filters.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` §"Phase 6: Trustworthy Tests and Security Baseline": goal and the 5 success criteria
- `.planning/REQUIREMENTS.md`: TEST-01..04 and SEC-01..04 text

### Research behind this phase
- `.planning/research/SUMMARY.md`: item 12 (linkify is quadratic, verified) and the recommended Phase 1 bundle
- `.planning/research/PITFALLS.md`: Pitfall 11 (absolute timing budgets), 12 (linkify quadratic), 13
  (copying other projects' `.planning` publishes private content), 14 (green because skipped), 33 (outline
  cap changes search anchors)

### Security promises being closed
- `.planning/milestones/v1.1-phases/05-per-type-document-views/05-SECURITY.md`: T-05-11 (View-mode
  outline uncapped) and closing notes 1–3 (ReDoS tests, `dangerouslySetInnerHTML` guard, outline cap)

### Secret masking convention
- `~/.claude/gsd-core/bin/lib/secrets.cjs`: `SECRET_CONFIG_KEYS` and `maskSecret()`, the convention D-09 and D-11 mirror

### Fixture rules
- `fixtures/README.md`: the existing fixture traceability ledger (D-01 synthetic rule, D-04 "studio-portal
  is manual smoke only", the dense tree's deliberate warnings, the deliberate `SLICE-99` dangling ref).
  Phase 6 enforces the D-04 rule from that ledger, which today's tests break.

### Conventions
- `docs/design-language.md`: visual vocabulary for the "+N more sections" row; the class-vocabulary test
  (`test/web/class-vocabulary.test.ts`) enforces it

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test/helpers/todo-corpus.ts`: `LB_ROOT`, `SYNTHETIC_ROOT`, `loadFiles`, `planningFiles` are the loaders
  the corpus helpers share; repoint them at the new fixture project
- `test/e2e/*-fixture-server.ts` (debug, learnings, note, todo): an existing pattern for starting the app
  on a fixture during browser tests
- `test/web/class-vocabulary.test.ts`: the standing-test-with-positive-control idiom to copy for the
  raw-HTML guard and the leak test
- `src/planning-repo/frontmatter.ts` `tryParseJson`: the guarded JSON parse that masking sits next to

### Established Patterns
- Corpus helpers today: `test/helpers/{studio-portal,note-corpus,todo-corpus,debug-corpus,research-fixtures}.ts`
  resolve real checkouts via `homedir()` and gate tests with `it.runIf(existsSync(...))`. About 75 test
  files import them (28 in `test/web`, 13 in `test/e2e`, 17 top-level, plus rendering/presentation/server/golden)
- Absolute timing budgets that become growth ratios: `test/section-projection.test.ts:597-615` (< 200 ms),
  `test/security-register.test.ts:235-239` (< 250 ms, the one failing test today)
- `src/planning-repo/mentions.ts` documents its regexes as having no nested unbounded groups (linear),
  and `src/rendering/linkify.ts` is the one that is not

### Integration Points
- `src/planning-repo/handlers/json-config.ts` (`JsonConfigHandler.parse`): mask `frontmatter` and
  re-serialise `body` here, for `config.json` only (not `HANDOFF.json` / `estimation-calibration.json`)
- `src/web/pages/artifact-page.tsx:205` is the Source-mode `.slice(0, 18)`, and `:508` is the View-mode
  `outlineEntriesOf(composed)` (uncapped)
- `src/web/pages/artifact-page.tsx:241` is the single allowed `dangerouslySetInnerHTML` site
- `src/server/search-index.ts` indexes the parsed body, so it inherits the masking automatically when the
  handler masks

</code_context>

<specifics>
## Specific Ideas

- The user explicitly wants no surviving way to run committed tests against the real projects. To see
  real output, launch Labelore on the project.
- Masking follows GSD's `/gsd-settings` look (`****abcd`) so the two tools agree, except that on/off
  values stay visible.

</specifics>

<deferred>
## Deferred Ideas

- "+N more sections" line in Source mode: revisit during the Source mode redesign (Phase 12)
- Name-pattern secret detection (`*key*`, `*token*`, `*password*`): considered and rejected for now. It
  would come back only if GSD adds integration keys faster than Labelore can mirror them
- Private text outside the test folders (D-19): the raw copies in `.planning/sketches/*/data.js`, the
  private project names in archived milestone folders, and the `/home/cinedise/...` paths in
  `.mcp.json` and `.claude/CLAUDE.md`. Git history also still holds the private files deleted in this phase.

</deferred>

---

*Phase: 06-trustworthy-tests-and-security-baseline*
*Context gathered: 2026-10-25*
