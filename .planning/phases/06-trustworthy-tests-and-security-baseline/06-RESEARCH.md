# Phase 6: Trustworthy Tests and Security Baseline - Research

**Researched:** 2026-10-25
**Domain:** Test-suite hygiene (fixtures, skips, timing), ReDoS hardening, a raw-HTML guard, a view-mode outline cap, and read-time secret masking in a Node/TypeScript/React read-only dashboard
**Confidence:** HIGH on the code-level findings (all measured or read this session); MEDIUM on the size of the fixture-authoring work (an estimate, see Open Questions)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Replacing real-project tests**
- **D-01:** Build **one made-up GSD project** under `test/fixtures/`. It holds phases, plans, summaries, notes, todos, debug sessions, reviews, learnings, UAT, security, validation and UI files, as a replacement for every test that reads another project's `.planning/` today. Both the unit corpus tests and the browser tests read it. It is also the TEST-04 browser-test target.
- **D-02:** Tests that pin exact numbers read from real files (task counts, skipped counts, section counts) are **re-pinned on the made-up project**. Each test keeps its intent and its numbers are recalculated there. Do not drop them for behaviour-only tests.
- **D-03:** **Labelore's own `.planning/` may still be read by tests.** It is committed in this repo and public, so it is not treated as live data to remove. (Only *other* projects' trees count.)
- **D-04:** The existing made-up trees (`fixtures/dense`, `fixtures/sparse-empty`, `fixtures/sparse-started`, `test/fixtures/dashboard/synthetic`) **stay as they are**, along with the golden snapshots that depend on them. The new project sits beside them.
- **D-05:** **No path to real projects survives anywhere in committed tests.** No opt-in flag, no env variable, no fallback candidates. Delete `test/helpers/studio-portal.ts`, the sibling-root lists in `test/helpers/note-corpus.ts` / `todo-corpus.ts` / `debug-corpus.ts`, and every `homedir()`-based path, along with all `it.runIf(existsSync(...))` / `test.skip(!..._AVAILABLE)` gates. Anyone who wants real output starts Labelore on that project by hand.

**What the made-up content looks like**
- **D-06:** **Keep structure, new words.** Each real file a test relied on is rewritten so that every word, name, path, ID, date-slug and person changes. Its headings, tables, frontmatter shape, odd formatting and quirks stay, so the v2.0 pages keep the coverage they were built against. This applies to the fixtures already copied from private work too (`test/fixtures/review/sp01-*`, `dd01-*`, `dd02-*`, `sb02-*`, `sb14-*`, `sp03-*`, `test/fixtures/learnings/sp01-LEARNINGS.md`, the notes fixture described as "copied byte for byte from the sketches' data", and any other file a TEST-03 audit finds).
- **D-07:** The project is about **one invented app**: a single coherent fictional product, so phase names, notes and requirements read like one real project in the browser tests. The planner or executor picks the theme.
- **D-08:** A **standing leak test** fails if any committed fixture (`fixtures/`, `test/fixtures/`, `test/__golden__/`) contains a word from a deny list of private names, such as cinedise, studio-portal, resoundant, pyedge, deid, sideby, duet and portal names found in the audit. The deny list may be committed **in plain text**. The user accepted that these names are already public in today's test helpers.

**Secret masking (SEC-04)**
- **D-09:** **Only GSD's own secret keys** count as secret: `brave_search`, `firecrawl` and `exa_search`, mirroring `SECRET_CONFIG_KEYS` in `~/.claude/gsd-core/bin/lib/secrets.cjs`. Name-pattern matching (`*key*`, `*token*` and so on) is **not** used. Copy the list into Labelore; there is no runtime dependency on gsd-core. A future GSD integration key shows in full until Labelore's list is updated, and the user accepted that.
- **D-10:** **Only text values are masked.** `true`/`false` and numbers on those keys show as they are, because they are on/off switches. This intentionally differs from GSD, which masks every value.
- **D-11:** The mask format is **GSD's style**: `****` followed by the last 4 characters, `****` when the value is shorter than 8, and `(unset)` when it is empty. Match `maskSecret()` in `secrets.cjs`.
- **D-12:** The **raw file view shows the masked object re-formatted as JSON**. The masked parse result is pretty-printed, so whitespace and key order may differ from the file on disk. The masked body is what reaches the search index and snippets, and the full value never leaves the read layer. Masking happens where `config.json` is read (`JsonConfigHandler.parse` in `src/planning-repo/handlers/json-config.ts`), so every later consumer inherits it.

**View-mode outline cap (SEC-03)**
- **D-13:** View mode caps the outline at **18 entries, the same as Source mode** (`src/web/pages/artifact-page.tsx:205`). The user accepted that long plans and research documents will show a cut-off outline.
- **D-14:** When the cap is reached, the outline's last row is a **plain-text "+N more sections" line**. It is not clickable and does not jump anywhere. The sections still render in the document.
- **D-15:** **Source mode is left alone** (no "+N more" line) until its redesign in Phase 12.

### Claude's Discretion
- How the timing tests measure growth. Research recommends the best-of-several runs at n and 4n after a warm-up, asserting a ratio between linear (4) and quadratic (16), plus a planted quadratic positive control (`.planning/research/PITFALLS.md` Pitfall 11).
- How `linkify.ts`'s `REFERENCE_TOKEN` is made linear (Pitfall 12: missing `\b` guards).
- The shape of the raw-HTML guard and its allowlist entry for `artifact-page.tsx:241`, including a positive control in the style of the class-vocabulary test.
- How browser tests fail loudly when the in-repo fixture is missing, and how the zero-skip rule is enforced (Pitfall 14).
- The invented app's theme and the fixture project's internal layout.
- Whether the "+N more" line counts only the omitted entries at depth 3 or less, or all omitted headings. Keep it consistent with what the cap filters.

### Deferred Ideas (OUT OF SCOPE)
- "+N more sections" line in Source mode: revisit during the Source mode redesign (Phase 12)
- Name-pattern secret detection (`*key*`, `*token*`, `*password*`): considered and rejected for now. It would come back only if GSD adds integration keys faster than Labelore can mirror them
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | Full unit suite: zero failures, zero skips on a normal run; timing tests assert growth, not an absolute budget | Summary (today's 25 failures / 9 skips, by cause), Pattern 1 (growth harness, measured), Appendix B (the 40+ absolute-budget assertions to convert) |
| TEST-02 | Corpus tests read made-up fixtures committed in the repo, never other projects' live trees | Appendix A (every dependency, grouped by family, with the fixture file each needs) |
| TEST-03 | Committed fixtures audited; private-work content replaced | Appendix C (audit result: files, words, tells) |
| TEST-04 | Browser tests run against an in-repo fixture and fail rather than skip | Browser tests (TEST-04) under Code Examples, and Appendix A (Playwright config, four near-duplicate fixture servers, 12 specs that skip today) |
| SEC-01 | Section, mention and link scanners proven linear; link scanner fixed | Code Examples, link scanner (measured: linkify quadratic, ratio 16; section and mention scanners already linear; fix verified at zero behaviour change on 18,848 real tokens) |
| SEC-02 | Standing test fails if web code injects raw HTML outside the one allowed site | Code Examples, raw-HTML guard |
| SEC-03 | View mode caps the outline like Source mode | Code Examples, outline cap |
| SEC-04 | `config.json` secrets masked in the raw file, file page, search and snippets, at read time | Code Examples, secret masking (four leak paths reproduced on a scratch project; fix point and edge cases) |
</phase_requirements>

## Summary

The suite is not trustworthy today for three separate reasons, and the phase has to fix all three. First, it fails: a run this session gave 3361 tests, 3327 passed, 25 failed, 9 skipped (176 files, 14.5 s). Twenty-four of the 25 failures come from tests that read Labelore's own live `.planning/` and pin numbers that the v2.1 milestone has since replaced (the project-level research files, the drawer, and a `v1.0-research/SUMMARY.md` archive that a summary walker mistakes for a plan summary). One is a 250 ms timing assertion that misses by 15 ms under normal parallel load; an earlier run failed two different timing tests instead, so timing failures move around between runs. Second, it skips: nine skips are silent `it.runIf(existsSync(...))` gates, and a further class of disguised skips (`if (!existsSync(x)) return;`, and loops over a directory walker that returns `[]`) pass vacuously. Third, it reads other people's private projects: about 50 unit test files and 12 browser specs read `~/Work/Cinedise/studio-portal`, three sibling work projects and `~/studio-portal`, and over 6,000 lines of private planning text and diagrams are committed under `test/`.

The security half is small and concrete. The link scanner (`REFERENCE_TOKEN` in `src/rendering/linkify.ts:20-21`) is quadratic: measured ratio 16.0 for a 4x larger input, 4.6 s for 80,000 capitals. Two fixes were tested: bounded quantifiers (`{1,31}` and `{1,16}`) gave zero behaviour difference over all 18,848 reference tokens found in the repo's own markdown and TypeScript, and measure linear. The section scanners and the mention scanner were measured with hostile inputs derived from their patterns and are already linear, so for them SEC-01 means "add the growth test", which will pass on first run; only the link scanner needs a failing-first test. The raw-HTML guard is a text scan over `src/web` with a one-entry allowlist; the current code has exactly one injection site. The View-mode outline is built from composed blocks, and with the fallback manifest (`all: true`) the entry count equals the document's `##` count, so the cap is real. The secret leak is reproduced: a planted API key in `config.json` appeared in `/api/presentation` (twice), in the file page's HTML, and in search results and snippets. One handler change closes all of them, with one extra case the decisions do not mention (a `config.json` that fails to parse still ships its raw text as the body).

The dominant cost of the phase is authoring the made-up project. The tests pin hundreds of values against roughly 15,000 lines of studio-portal documents plus about 6,000 lines of other private fixtures. Recommend a shape-preserving, trimmed rewrite (every quirk kept, prose cut), because line counts are not quirks; this is the main judgement call for the planner and is flagged in Open Questions.

**Primary recommendation:** Do the work in this order: (1) shared test infrastructure first (growth harness, source-scan helper, fixture-project loader), (2) the three small source changes (linkify, outline cap, masking) each with a test that fails first, (3) author the fixture project and retarget tests family by family, (4) rewrite the already-committed private fixtures, (5) land the standing guards (leak, zero-skip, raw-HTML) and delete the old helpers last, so the suite stays green between plans.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Secret masking | Read layer (`src/planning-repo/handlers/json-config.ts`) | none | D-12: mask where `config.json` is parsed so `Project.config`, artifact frontmatter and body, the search index, snippets and rendered HTML all inherit it. Masking in the web tier would leave `/api/*` leaking |
| Link-scanner linearity | Rendering (`src/rendering/linkify.ts`, runs server-side in the unified pipeline) | none | The scanner runs on every text node of every rendered document before the HTML leaves the server |
| Section and mention scanners | Read layer (`section-projection.ts`, `markdown-sections.ts`, `mentions.ts`) | none | Run at snapshot refresh; tests only |
| Raw-HTML guard | Test tier (source-text scan of `src/web/**`) | none | Same idiom as `class-vocabulary.test.ts`; no runtime code |
| Outline cap and "+N more" row | Browser (`artifact-page.tsx`, `document-outline.tsx`) | View registry (`manifest.ts`, pure cap function) | Pure function in the views layer so it is unit-testable; the row is presentation |
| Made-up fixture project | Test data (`test/fixtures/<app>/`) | Playwright config, fixture-server helper | One tree feeds unit corpus tests and the port-4198 browser server |
| Fail-loud and zero-skip enforcement | Test tier (a standing scan test plus a config-level throw in `playwright.config.ts`) | Phase gate command (JSON reporter) | Absence of an in-repo fixture is a bug, so it must throw |

## Standard Stack

No new packages. Everything below is already installed. [VERIFIED: package.json:6-15, :34-58]

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 4.1.11 | Unit suite, JSON reporter for the zero-skip check | `"test": "vitest run"`, `vitest.config.ts` includes `test/**/*.test.ts` |
| @playwright/test | 1.63.0 | Browser specs on ports 4199 and 4198 | `"test:e2e": "playwright test"` |
| gray-matter / tryParseJson | 4.0.3 / in-repo | Guarded parse that masking sits next to | `src/planning-repo/frontmatter.ts:71` |
| unified, rehype-raw, rehype-sanitize | 11.0.5 / 7.0.0 / 6.0.0 | Pipeline whose order (raw, sanitize, linkify) must not change | `src/rendering/markdown.ts:308-310` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-place growth assertions | A separate serial Vitest project for timing files (Pitfall 11) | Measured: a best-of-5 ratio at 8x is stable under 16 busy processes, so serial isolation is not needed. Skip the churn of moving 35 files |
| Hand-written regex bounds in linkify | The `regex` or `safe-regex` npm packages | Not needed; the fix is two quantifier bounds. No new dependency |
| Playwright `test.skip` guards | `globalSetup` file checks | A config-level `throw` is simpler and fails before any browser starts |

**Installation:** none.

## Package Legitimacy Audit

This phase installs no external packages. Nothing to check. No `slopcheck`/`package-legitimacy` run was needed.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
                       made-up project (test/fixtures/<app>/)
                       .planning/ + frontend/app/globals.css + components.json
                                  |
         +------------------------+-----------------------------+
         v                                                      v
 unit corpus tests                                  playwright.config.ts
 (test/helpers/fixture-project.ts:                  webServer :4198 -> fixture
  FX_ROOT, FX_PLANNING, loadFixture())              webServer :4199 -> repo (.)
  throws if missing, never skips)                   throw at config load if fixture missing
         |                                                      |
         v                                                      v
 PlanningRepository -> handlers ----------------------> /api/* routes
   |  JsonConfigHandler.parse                              |  presentation, artifacts,
   |    config.json only:                                  |  search (index + snippets)
   |    mask 3 keys -> frontmatter                         v
   |    re-serialise masked -> body                  web: artifact-page.tsx
   v                                                  - View: outlineEntriesOf -> capOutline (18) -> "+N more" row
 ParsedArtifact (masked, nothing downstream                - Source: unchanged (slice 0..18)
 ever sees the full value)                                - the one dangerouslySetInnerHTML (allowlisted)

 markdown render: rehypeRaw -> rehypeSanitize -> rehypeResolvedReferences (linkify, linear after fix)

 standing guards (vitest, read-only scans):
   raw-html-guard      scan src/web/** (comments blanked)  -> allowlist {artifact-page.tsx: 1}
   fixture-leak        scan fixtures/, test/fixtures/, test/__golden__/, test/rendering/fixtures/ -> deny list
   no-skips            scan test/** and playwright.config.ts for skip/runIf/homedir/real-path patterns
   growth harness      measureGrowth(make, run) at n and 8n, best of 5, planted quadratic control
```

### Recommended Project Structure
```
test/
├── fixtures/
│   └── <app>/                    # the one made-up project (D-01); name picked by the planner
│       ├── README.md             # provenance: made up, which quirks each file keeps (extends fixtures/README.md ledger)
│       ├── components.json       # for theme-token tests
│       ├── frontend/app/globals.css   # tiny oklch token block for theme-token and ui-spec-theme tests
│       └── .planning/            # PROJECT, ROADMAP, REQUIREMENTS, STATE, config.json, research/, phases/, milestones/v1.0-phases/, quick/, notes/, todos/, debug/
├── helpers/
│   ├── fixture-project.ts        # NEW: FX_ROOT, FX_PLANNING, fxPath(), loadFixture(); throws on missing
│   ├── growth.ts                 # NEW: measureGrowth / expectLinearGrowth
│   ├── source-scan.ts            # NEW: blankComments + walkSource, extracted from class-vocabulary.test.ts
│   └── (deleted: studio-portal.ts, debug-corpus.ts, sibling lists in note-corpus.ts/todo-corpus.ts)
├── no-skips.test.ts              # NEW standing scan
├── fixture-leak.test.ts          # NEW standing scan + deny list in plain text
└── web/raw-html-guard.test.ts    # NEW standing scan
```

### Pattern 1: Growth-ratio timing assertion
**What:** Run the code at size n and 8n, take the best of 5 runs each after a warm-up, assert `t(8n)/t(n)` is below a threshold between linear (8) and quadratic (64). Grow the base size until one run clears a noise floor. **Why 8x, not 4x:** at 4x linear is 4 and quadratic is 16, and under load the quadratic case read as low as 8.4 against a linear high of 4.8; at 8x the cases sit at about 8 and about 64, a threshold of 24 has a 3x margin both ways. [VERIFIED: scratch experiment, 16 busy processes, 10 runs, linear 7.9-8.4, quadratic 61-65, legacy regex 61-64 in 9 of 10 runs and 36.8 in one]
**When to use:** every test that today says `toBeLessThan(250)` on a hostile input (Appendix B).
**Example:**
```typescript
// test/helpers/growth.ts  (prototype measured in scratch: harness.mjs)
export function bestOf(fn: () => void, reps: number): number {
  let best = Infinity;
  for (let i = 0; i < reps; i++) { const t = performance.now(); fn(); best = Math.min(best, performance.now() - t); }
  return best;
}
export interface Growth { n: number; t1: number; t2: number; ratio: number }
export function measureGrowth<T>(o: {
  make: (n: number) => T; run: (input: T) => void;
  startSize?: number; factor?: number; reps?: number; minBaseMs?: number; maxSize?: number;
}): Growth {
  const { make, run, startSize = 1000, factor = 8, reps = 5, minBaseMs = 4, maxSize = 1 << 22 } = o;
  let n = startSize; run(make(n));                       // warm-up
  let base = bestOf(() => run(make(n)), reps);
  while (base < minBaseMs && n * factor <= maxSize) { n *= 2; base = bestOf(() => run(make(n)), reps); }
  const small = make(n), big = make(n * factor);         // build inputs OUTSIDE the timed region
  const t1 = bestOf(() => run(small), reps), t2 = bestOf(() => run(big), reps);
  return { n, t1, t2, ratio: t2 / Math.max(t1, 0.001) };
}
export function expectLinearGrowth<T>(opts: Parameters<typeof measureGrowth<T>>[0] & { maxRatio?: number }, expectFn: (r: Growth) => void): void {
  expectFn(measureGrowth(opts));  // caller does: expect(r.ratio).toBeLessThan(opts.maxRatio ?? 24)
}
```
Note the prototype built the input inside the timed closure for the base-size search only; the final comparison times `run` on prebuilt inputs. Build outside the timed region or input construction cost pollutes the ratio.

**Positive control (required, Pitfall 11):** a unit test of the harness itself that asserts a planted nested-loop function reads `ratio > 24` and a planted single loop reads `ratio < 24`. A second pin keeps the pre-fix regex as a literal in the test (`LEGACY_REFERENCE_TOKEN`) and asserts the harness flags it on a capitals run, so the harness is proven able to see the exact bug the fix removes.

**Caps are not growth.** Several timing tests feed inputs that the code rejects past a size cap (`liftDiagram` returns null above 250 rows or 300 columns; `classifyFence` ignores text over `FIGURE_MAX_CHARS`; `buildDiagramGraph` returns thin above `MAX_GRAPH_NODES`). For those, vary the size below the cap (area grows with rows x columns), or assert the over-cap case is flat (ratio of an 8x larger rejected input stays under about 3). Do not run n and 8n across a cap.

### Pattern 2: Standing source scan with a planted positive control
**What:** Walk source files as text, blank comments (offsets preserved), match forbidden patterns, assert the finding list equals an explicit allowlist, and prove the scanner works by writing a planted file to a `mkdtemp` directory and asserting it is reported. This is the idiom of `test/web/class-vocabulary.test.ts` (it has `blankComments`, `findMatchingBrace` and a "planted fixture written to a mkdtemp directory" test at lines 312-321). [VERIFIED: test/web/class-vocabulary.test.ts:6, :312-321]
**Extract** `blankComments` and a directory walker into `test/helpers/source-scan.ts` and reuse for the raw-HTML guard, the zero-skip scan and the leak test.

### Pattern 3: Fixture-project loader that throws
**What:** `fixture-project.ts` exports the root, resolves paths, and throws a clear error on first use if `test/fixtures/<app>/.planning` is missing. Tests import constants from it; they never call `existsSync` to decide whether to run. Replace every `SP_PLANNING`/`SP02`/`hasSp` with `FX_PLANNING`/`fxPath(...)`. The existing `loadProject(root)` and `loadFiles(map)` in `todo-corpus.ts` (lines 96-125 of that file) are the loaders to keep and repoint.

### Anti-Patterns to Avoid
- **`it.runIf(existsSync(...))` and `test.skip(!X_AVAILABLE)`** for in-repo data: absence is a bug (Pitfall 14). Zero such constructs may survive.
- **Disguised skips:** `if (!existsSync(x)) return;` inside a test body (`test/summary-run.test.ts:178`, `test/target-path.test.ts:54-57`) and directory walkers that return `[]` so a `for (const file of FILES)` loop registers zero tests. Corpus tests must assert the walked count is at least N.
- **Pinning per-file maps against Labelore's live `.planning/`:** `ui-spec-corpus.test.ts:78,95` fails with "needs a pinned entry" the day a new `UI-SPEC.md` lands in the current milestone, and Phase 12 plans one. Archived paths (`milestones/v*-...`) are frozen and safe to pin; live paths (`research/`, `phases/`, `notes/`, `todos/`, `quick/`, `debug/`, `STATE.md`, `ROADMAP.md`, `REQUIREMENTS.md`) are not.
- **Asserting a git or mtime derived date on the fixture:** the PLAN page's "Planned" fact is the git add-date, falling back to mtime (`src/server/file-dates.ts` header comment). In a fresh or shallow clone these change. Pin dates from frontmatter or a quick-task id, not from git.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timing comparison | A fixed-millisecond check, or a bespoke benchmark framework | One `growth.ts` helper (above) | Absolute budgets flake under parallel load; one helper keeps 35 call sites identical |
| Comment-blanking for source scans | A fresh parser per guard | `blankComments` from `class-vocabulary.test.ts`, moved to a helper | Already tested; offsets preserved |
| Secret-mask format | A new format | Copy `maskSecret` semantics exactly (below) | D-11 requires GSD parity |
| JSON re-serialisation | A custom stringifier | `JSON.stringify(masked, null, 2) + '\n'` | Verified byte-identical to the three committed config files, so goldens do not change (Code Examples, secret masking) |
| Four fixture servers | Four copies of port probe and spawn | One `startFixtureServer(root)` | `debug-`, `learnings-`, `note-`, `todo-fixture-server.ts` each repeat `portIsFree`, `firstFreePort`, spawn and stop (50+ lines each) |
| Reading a project path in e2e | `homedir()` joins | `FX_ROOT` from the loader | D-05 |

**Key insight:** each fix here is small; the risk is volume and drift, so shared helpers and standing scans matter more than clever code.

## Runtime State Inventory

This phase is partly a migration (tests move from external projects to an in-repo fixture), so the five categories were checked.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None for Labelore itself (read-only tool, no database). The golden snapshots `test/__golden__/{dense,sparse-started,sparse-empty}.json` embed `bodyHash`/`bodyLength` for each fixture's `config.json` | Keep goldens unchanged by re-serialising with a trailing newline (Code Examples, secret masking); verify with `snapshot.golden.test.ts` |
| Live service config | A user-run instance `node src/server/index.ts .` is running (pid seen this session). Ports 4173/4174 belong to the user's running instances; Playwright uses 4199 (repo) and 4198 (studio-portal today) | Do not touch 4173/4174. Repoint 4198 at the fixture. Fixture servers keep ports 5310-5319 |
| OS-registered state | A `labelore.service` systemd unit is referred to in `playwright.config.ts:7-8` comments (not inspected) | None; do not restart it |
| Secrets/env vars | `STUDIO_PORTAL_ROOT` env var read in `test/helpers/studio-portal.ts`; no other test env var | Delete with the helper (D-05). No secrets are stored by tests |
| Build artifacts / installed packages | `dist/`, `test-results/`, `test/e2e/screenshots/` are gitignored; `.planning/research/.cache/` is untracked | None. Do not commit `.cache` |

**Also not forgotten (history):** removing private text from HEAD does not remove it from git history. The phase text only asks for the working tree. Flagged in Open Questions.

## Common Pitfalls

### Pitfall 1: Replacing words inside ASCII diagrams breaks box geometry
**What goes wrong:** the `sp-*-diagram.txt` fixtures and `sketch-012-graphs.json` encode ragged right edges and column positions; tests pin "9 boxes, exactly 1 widened (BROADCAST BUS), 46 rows" (`test/rendering/ascii-lift.test.ts`) and 14 vs 27 rows (`clean-tree.test.ts`).
**How to avoid:** substitute same-length words, character column for column; never re-wrap. Regenerate `sketch-012-graphs.json` with the archived generator `.planning/milestones/v2.0-quick/260930-mp6-build-sketch-012-b-lanes-by-kind-as-the-/gen-sketch-golden.ts` (it runs the sketch's own `shapes.js`/`graph.js` from `.planning/sketches/012-diagram-product/`), then diff node and edge counts against the old golden.
**Warning signs:** lift returns null, or a pinned box count moves.

### Pitfall 2: A "byte for byte" provenance test survives the rewrite
**What goes wrong:** `test/todo-file.test.ts:38` asserts `readKeyed(TODO_KEYS[key])` equals `sketchTodoRaw(key)`, and `todo-lifecycle-corpus.test.ts:201` does the same for notes. After D-06 the fixtures intentionally differ from the sketch data, so these tests are provenance checks that must be **deleted**, not re-pinned. (D-02's "do not drop" applies to behaviour pins, not to a test whose only claim is "this private copy equals that private copy".) `.planning/sketches/*/data.js` hold the originals; see Open Questions.

### Pitfall 3: Deny-list word matching hits ordinary identifiers
**What goes wrong:** `deid` is a substring of `nodeId` (`src/web/components/lane-diagram.tsx:73`), `duet`/`ibis` can appear inside other words. A plain substring test gives false positives and the first run is red for the wrong reason.
**How to avoid:** match whole words, case-insensitive: `\b(cinedise|studio-portal|resoundant|pyedge|deid|sideby|duet|edgecan|ibis)\b`. Bare `portal` is too generic (the made-up `dashboard/ledger` and `synthetic` trees use it legitimately); ban compound forms only (`cinedise-portal`, `studio-portal`).

### Pitfall 4: D-04 and D-08 collide on the word "studio-portal"
**What goes wrong:** eight files under `fixtures/dense/.planning/`, `fixtures/README.md` and `test/__golden__/dense.json` (60 lines) contain the word "studio-portal" as the name of the reference project they were designed against. D-04 says these stay as they are; D-08's deny list names `studio-portal` and covers `fixtures/` and `test/__golden__/`. As written the leak test fails on day one. See Open Questions Q1 for the recommended resolution (a named, narrow exemption).

### Pitfall 5: The fixture date pins are clone-dependent
Covered in Anti-Patterns (git add-date or mtime). Specs that today say `Planned 3 Aug 2026` (`test/e2e/plan-page.spec.ts:216`) get that value from the real repo's git history. On the fixture, assert the quick-task-id date or a frontmatter date.

### Pitfall 6: Timing-test inputs that hit a cap
Covered in Pattern 1. The ascii-lift, ascii-graph, ascii-tree and figure-detect tests feed capped inputs.

### Pitfall 7: Guards landing before the rework turns the suite red
If the leak test, zero-skip scan and helper deletion land first, every intermediate plan fails. Land them last, or land them with an explicit pending-files list that must be empty at the end.

### Pitfall 8: Masked frontmatter is also `Project.config`
`src/planning-repo/assemble.ts:227` builds `Project.config` from the config artifact's `frontmatter`, and `src/server/project-presentation.ts:721` forwards it as `presentation.config`. Masking `frontmatter` in the handler therefore also masks `presentation.config`. That is intended. If a later consumer needs a real key it must not come from here (none exists: grep of `src/` shows `config` used only for naming mode and the presentation field).

## Code Examples

### Link scanner: linear `REFERENCE_TOKEN`
Current, verbatim: [VERIFIED: src/rendering/linkify.ts:20-21]
```typescript
const REFERENCE_TOKEN =
  /\.planning\/\S*[^\s.,;:!?)\]}'"]|D-\d+|Phase\s+[\p{Letter}\p{Number}.]+|[A-Z][A-Z0-9]+-\d+|\d+(?:\.\d+)?-\d+/gu;
```
Recommended replacement (bounded quantifiers on the two alternatives that restart at every position):
```typescript
const REFERENCE_TOKEN =
  /\.planning\/\S*[^\s.,;:!?)\]}'"]|D-\d+|Phase\s+[\p{Letter}\p{Number}.]+|[A-Z][A-Z0-9]{1,31}-\d+|\d{1,16}(?:\.\d{1,16})?-\d+/gu;
```
Measured: [VERIFIED: scratch scripts lk.mjs, eq.mjs]
- Old regex, growth for 4x input: capitals 16.0, digits 16.0, mixed `A1A1...` 16.0 (287 ms at 20,000 chars, 4,618 ms at 80,000). Every other hostile shape tried (`AB-` repeated, `1.1.` repeated, `.planning/` repeated, `.planning/` plus dots, `Phase` plus whitespace, repeated `Phase  `, plain words, real IDs) was linear (2.4-4.3).
- Bounded regex: every shape linear (3.3-4.0); 80,000 capitals in 11 ms.
- Behaviour: the old and bounded regexes, each followed by the caller's `IDENTIFIER_EDGE` filter, produced identical token lists (same index and text) over 961 tracked `.md`/`.ts`/`.tsx` files, 18,848 tokens, difference 0.
- Rejected alternative: a lookbehind guard `(?<![\p{Letter}\p{Number}_-])` is faster (0.4 ms at 80,000) but changed 6 results in that corpus (it newly accepts `1-05` inside `lb-v1.1-05` and drops `0.0-27` from `7.0.0-27`), because the caller rejects after consuming and the lookbehind does not. Use the bounded form; it is the exact-parity fix. (Pitfall 12 suggested `\b`-style guards; the measurement prefers bounds.)
- Residual: a token longer than the bound (a 40-capital prefix, a 20-digit number) now fails to match instead of matching and resolving to nothing. No registry entry is that long. Add one test pinning that a 40-character prefix is not linkified and a normal `WR-03`/`05-02`/`D-12` still are.

The test: export `REFERENCE_TOKEN` (or a thin `scanReferenceTokens(text)`) so a unit test can time it without building a registry, then add one end-to-end test through `rehypeResolvedReferences()` with a registry built the way `test/rendering/references.test.ts:170` does (`buildReferenceRegistry(presentation())`), so the plugin path is covered.

### Hostile inputs derived from each pattern (not from fixtures)
| Scanner | Shapes (size parameter n) |
|---------|--------------------------|
| linkify | `'A'.repeat(n)`, `'1'.repeat(n)`, `'A1'.repeat(n/2)`, `'AB-'.repeat(n/3)`, `'1.'.repeat(n/2)`, `'.planning/' + '.'.repeat(n)`, `'Phase ' + ' '.repeat(n) + '!'`, `'Phase  '.repeat(n/7)` |
| mentions (`scanMentions`) | `'D-1 WR-01 REQ-01 01-02 Phase 3 '.repeat(n)`, caps run, digits run, `'01-02-03-'` runs (date-fragment lookarounds), body with 10k lines |
| section projection (`extractDiscussionLog`, `extractReviewWarnings`, `parseDecisionEntries`) | thousands of `\| Q \| a / b / c \| a \|` rows (Pitfall: the register promised a "5k-row synthetic table"), `'\|'.repeat(n) + '*'.repeat(2n) + '✓'` , one 200k-character line, thousands of `## Topic` / `### Q` pairs |
| markdown-sections (`splitSections`, `parseMarkdownTable`, `parseChecklistItems`) | same table and heading shapes |
Measured at n=1000 vs 4000 units (growth.ts scratch): all of `extractDiscussionLog`, `extractReviewWarnings`, `parseDecisionEntries`, `splitSections`, `splitSubsections`, `parseMarkdownTable`, `parseChecklistItems` and `scanMentions` showed ratio under 6 on every shape except one noise reading (`splitSections` on 4000 tiny headings, 0.5 ms to 3.3 ms, absolute time negligible). They pass the growth test on first run, which is expected here and not a bad sign: the test must still ship, because the 05-SECURITY audit notes record that "the regression tests the register promised ('5k-row synthetic table', '10k-line synthetic body') were never written". [VERIFIED: .planning/milestones/v1.1-phases/05-per-type-document-views/05-SECURITY.md:86-87]

### Browser tests (TEST-04)
Today: `playwright.config.ts` adds a second server only `...(studioPortalAvailable ? [ {...} ] : [])` where `const studioPortalPlanningDir = join(homedir(), 'studio-portal', '.planning');` [VERIFIED: playwright.config.ts:17-18, :50-63]. That path does not exist on this machine (the project lives under `~/Work/Cinedise/studio-portal`), so the 12 dependent specs skip and the suite looks green. Recommended shape:
```typescript
// playwright.config.ts
const FIXTURE_ROOT = fileURLToPath(new URL('./test/fixtures/<app>/', import.meta.url));
if (!existsSync(join(FIXTURE_ROOT, '.planning'))) {
  throw new Error(`Browser tests need the in-repo fixture project at ${FIXTURE_ROOT}; it is missing.`);
}
// webServer: [ {... 'node src/server/index.ts . --port 4199' ...},
//             { command: `node src/server/index.ts ${FIXTURE_ROOT} --port 4198`, url: 'http://127.0.0.1:4198/api/dashboard', reuseExistingServer: false, ... } ]
```
- Remove `homedir`/`existsSync` imports used for gating, every `STUDIO_PORTAL_AVAILABLE` constant and every `test.skip(...)` (list in Appendix A). Replace `SP_BASE_URL`-style 4198 specs' path strings with the fixture's paths. A spec that cannot find its fixture artifact must `throw` (the `resolveFixtureUrl` helpers in `context-brief.spec.ts:24` already do).
- Specs that resolve archived Labelore documents on 4199 (for example `milestones/v1.1-phases/05-per-type-document-views/05-CONTEXT.md`) are pinned to frozen files and can stay (D-03). Specs that read **live** content move to the fixture: `research-page.spec.ts` (pins "Researched 21 Aug 2026", "5 research files", "Overfit to studio-portal" from the live `.planning/research/`, so it very likely fails today; not run, per the no-full-browser-suite rule) and `planning-drawer.spec.ts` (`test.skip(quick.count === 0, ...)` at lines 84, 104, 123 are data-conditional skips; the fixture needs a shipped milestone with quick tasks and the spec must assert, not skip).
- Fixture servers: `debug-`, `learnings-`, `note-` and `todo-fixture-server.ts` each copy files from the real siblings into a temp project. The Labelore server is read-only, so one helper can spawn `node src/server/index.ts <fixture root> --port <first free in 5310-5319>` directly with no copy. Keep the port range (4173/4174/4198/4199 are not to be used) and the SIGTERM-then-SIGKILL stop.
- A guard test imports the Playwright config module and asserts it throws when `FIXTURE_ROOT` cannot be resolved (inject the path, or temporarily point the constant), so "fail loudly" is itself tested.

### Raw-HTML guard
```typescript
// test/web/raw-html-guard.test.ts  (sketch)
import { blankComments, walkSource } from '../helpers/source-scan.ts';
const SINKS: [string, RegExp][] = [
  ['dangerouslySetInnerHTML', /dangerouslySetInnerHTML/],
  ['innerHTML assignment', /\.\s*innerHTML\s*(?:\+)?=(?!=)/],
  ['outerHTML assignment', /\.\s*outerHTML\s*=(?!=)/],
  ['insertAdjacentHTML', /insertAdjacentHTML\s*\(/],
  ['document.write', /document\s*\.\s*write(?:ln)?\s*\(/],
  ['createContextualFragment', /createContextualFragment\s*\(/],
  ['setHTMLUnsafe', /setHTMLUnsafe\s*\(/],
  ['srcDoc', /\bsrcDoc\b|\bsrcdoc\b/],
];
const ALLOWED = [{ file: 'src/web/pages/artifact-page.tsx', sink: 'dangerouslySetInnerHTML', count: 1 }];
// 1. every hit in src/web/**/*.{ts,tsx} (comments blanked) must match an ALLOWED entry exactly (file, sink, count)
// 2. every ALLOWED entry must still be present (a stale allowlist fails)
// 3. positive control: plant a file in mkdtemp containing each sink, assert each is reported
```
Why comments must be blanked: `src/web/views/context-brief-components.tsx:7` and `inline-markdown.ts:3` mention `dangerouslySetInnerHTML` in comments ("never `dangerouslySetInnerHTML`"). Reads of `.outerHTML`/`.innerHTML` (`src/web/views/document-sections.ts:122-298`) are not injection and must not match; the assignment regexes above skip them. Today's single site: [VERIFIED: src/web/pages/artifact-page.tsx:241] `      dangerouslySetInnerHTML={{ __html: html }}`. Mermaid output is written by `mermaid.run` with `securityLevel: 'strict'` (`artifact-page.tsx:326`, run at `:387`), not by Labelore code. Existing partial pins (`test/rendering/markdown.test.ts:314` and `test/rendering/references.test.ts:762`, each "exactly 1 in artifact-page.tsx") stay and do not conflict.

### Outline cap (View mode)
`outlineEntriesOf` is `view.blocks.map((block) => ({ id: block.id, label: block.label }))` [VERIFIED: src/web/views/manifest.ts:314-316] and the View reader uses `const rawEntries = outlineEntriesOf(composed);` / `const entries = rawEntries.length < 2 ? [] : rawEntries;` [VERIFIED: src/web/pages/artifact-page.tsx:508-509]. Source mode is `document.headings.filter((heading) => heading.depth <= 3).slice(0, 18)` [VERIFIED: src/web/pages/artifact-page.tsx:205].
```typescript
// src/web/views/manifest.ts (pure, unit-testable)
export const OUTLINE_ENTRY_CAP = 18;
export function capOutline<T>(entries: T[]): { listed: T[]; omitted: number } {
  return entries.length <= OUTLINE_ENTRY_CAP
    ? { listed: entries, omitted: 0 }
    : { listed: entries.slice(0, OUTLINE_ENTRY_CAP), omitted: entries.length - OUTLINE_ENTRY_CAP };
}
// ViewReader: const raw = outlineEntriesOf(composed); const { listed, omitted } = capOutline(raw.length < 2 ? [] : raw);
//   <DocumentOutline entries={listed} omitted={omitted} activeId={...} />
// artifact-page.tsx:205 uses OUTLINE_ENTRY_CAP in place of the literal 18 (no "+N" row there, D-15)
// document-outline.tsx OutlineList: after the entries, when omitted > 0:
//   <li data-overflow="true">+{omitted} more {omitted === 1 ? 'section' : 'sections'}</li>   (no <a>, no className)
```
Decisions made here (the discretion item): **N counts every omitted outline entry.** View-mode entries are composed blocks with no `depth`, so there is no depth-3 filter to stay consistent with; Source mode's depth filter is untouched. `outlineEntriesOf` stays uncapped (pure), so `composeView(...).blocks` still contains every section and every `view-block-N` and heading `id` still exists in the document: this is the Pitfall 33 rule ("cap what is listed, not what exists"). Because `OutlineList` is shared by the wide column and the narrow popover (`document-outline.tsx`), both get the row automatically. `useActiveSection` observes only listed ids, so scrolling into an omitted section keeps the last listed entry active; acceptable and worth a one-line comment.
Style: no new class is needed (the class-vocabulary test scans `className` and `data-tone`). Add one CSS rule `.document-outline li[data-overflow='true']` using `--muted-foreground` and `--fs-3` (existing links use `font-size: var(--fs-3)`, `.document-outline a` at `globals.css` ~4668). If a class is chosen instead it must be added to `docs/design-language.md` or the class-vocabulary test fails. Per the user's standing preference, no icon or glyph marker on the row; plain text only.
Test that proves it: build a markdown body with 3,000 `##` headings, run it through the fallback manifest (`fallbackManifest('unknown-kind', input)` promotes every headed group with `all: true`, `src/web/views/fallback.ts`), assert `composeView(...).blocks.length === 3000`, `capOutline(outlineEntriesOf(view)).listed.length === 18` and `omitted === 2982`.

### Secret masking in the handler
Current handler, verbatim: [VERIFIED: src/planning-repo/handlers/json-config.ts:10-27]
```typescript
const JSON_ARTIFACT_NAMES = new Set(['config.json', 'HANDOFF.json', 'estimation-calibration.json']);
...
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const result = tryParseJson(raw.content);
    return { title: basename(ref.path), frontmatter: result.data, body: raw.content, warning: result.warning, structured: {} };
```
GSD's source of truth, verbatim: [VERIFIED: ~/.claude/gsd-core/bin/lib/secrets.cjs:16-31]
```javascript
exports.SECRET_CONFIG_KEYS = new Set(['brave_search', 'firecrawl', 'exa_search']);
function maskSecret(value) {
    if (value === null || value === undefined || value === '') return '(unset)';
    const s = String(value);
    if (s.length < 8) return '****';
    return '****' + s.slice(-4);
}
```
Recommended shape:
```typescript
// src/planning-repo/secret-mask.ts  (new, no gsd-core import)
export const SECRET_CONFIG_KEYS: ReadonlySet<string> = new Set(['brave_search', 'firecrawl', 'exa_search']);
export function maskSecret(value: string): string {            // only called with strings (D-10)
  if (value === '') return '(unset)';
  return value.length < 8 ? '****' : `****${value.slice(-4)}`;
}
function maskValue(value: unknown): unknown {                  // strings anywhere under a secret key fail closed
  if (typeof value === 'string') return maskSecret(value);
  if (Array.isArray(value)) return value.map(maskValue);
  if (value !== null && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, maskValue(v)]));
  return value;                                                // booleans, numbers, null stay (D-10)
}
export function maskConfig(data: Record<string, unknown>): { data: Record<string, unknown>; masked: boolean } { /* top-level keys only */ }
// handler (config.json only: basename(ref.path) === 'config.json'):
//   ok parse    -> frontmatter = masked data; body = JSON.stringify(masked, null, 2) + '\n'
//   parse fails -> frontmatter {} (as today); body = redactSecretLines(raw.content)   // see below
//   HANDOFF.json and estimation-calibration.json: untouched
```
Facts that shaped this:
- **Top-level only, exact key match.** GSD's check is set membership on the key path (`isSecretKey(keyPath)`), and `init.cjs` masks only `typeof config.brave_search === 'string'`. [VERIFIED: ~/.claude/gsd-core/bin/lib/secrets.cjs:21-23; init.cjs:2035-2037 (grep)]. Mirror top-level. Whether to also mask the same key names nested is Open Question Q4 (recommendation: not now, per D-09's mirroring).
- **Trailing newline keeps the goldens unchanged.** `JSON.stringify(JSON.parse(s), null, 2)` equals `s` minus its final `\n` for all three committed configs. [VERIFIED: scratch node check: fixtures/dense/.planning/config.json, fixtures/sparse-started/.planning/config.json, .planning/config.json all `s === r + '\n'`]. Adding `'\n'` makes the re-serialised body byte-identical, so `bodyHash`/`bodyLength` in `test/__golden__/dense.json` and `sparse-started.json` do not change. Without it, two goldens churn and D-04's "goldens stay" is broken. This also means a config with no secret keys has an unchanged body whenever it was already 2-space formatted.
- **A config that does not parse still leaks.** `tryParseJson` returns `{}` plus a warning on bad JSON, but the old handler still ships `raw.content` as `body`. So a `config.json` with a trailing comma and a real key leaks through the rendered page and search. The fix must not return raw text for `config.json` on failure. Use a linear redaction of the three keys' string values (`/("(?:brave_search|firecrawl|exa_search)"\s*:\s*)"((?:[^"\\]|\\.)*)"/g` with a replacer calling `maskSecret`; the alternation `[^"\\]|\\.` is unambiguous and linear), or return an empty body (the "JSON failed to parse" warning is already raised). Pick one; test it with a malformed file containing a planted key.
- **`null` and `""`.** D-10 says only text is masked: a string `""` becomes `(unset)` (GSD parity); `null`, booleans and numbers stay as written.
- **Objects under a secret key** (for example `"firecrawl": {"key": "abc..."}`): D-10 exempts only booleans and numbers, so mask every string leaf beneath the key (fail closed). Not specified by the decisions; recorded as A3.
- **Leak paths reproduced** on a scratch project (config with `"brave_search": "BSAsecretkeyvalue1234567890"`, server on port 5390, since stopped): `/api/presentation` carried the full value twice (once in `config`, once in `artifacts[].frontmatter`); `/api/artifacts/a~.planning%2Fconfig.json` carried it in `artifact.frontmatter` and in `document.html` (the raw JSON rendered as one paragraph); `/api/search?q=brave_search` returned a snippet with the full value, and a query for a fragment of the secret matched. `/api/tree`, `/api/drawer`, `/api/dashboard` did not. [VERIFIED: curl against the scratch server this session]
- **End-to-end test shape:** build a snapshot with `new PlanningRepository(new InMemoryPlanningFilesystem({...'.planning/config.json': text}), '/p').load()`, then `createApp(source)` and `app.request(...)` for `/api/presentation`, the artifact route, and `/api/search` (idiom: `test/server/artifact-response.test.ts` header). Assert the planted full value is absent from every response body as a substring, the `****abcd` form is present, `firecrawl: true` stays `true`, and a second read after `/api/refresh` is also masked.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed-millisecond ReDoS budgets | Growth-ratio assertions at n and 8n with a planted control | This phase (Pitfall 11) | No flakes under parallel workers |
| Corpus tests read sibling checkouts, gated by `existsSync` | One committed made-up project, loader throws | This phase | Suite result no longer depends on the machine |
| One-shot grep audit for `dangerouslySetInnerHTML` | Standing scan with allowlist and positive control | This phase | Closes 05-SECURITY audit notes 1-2 |

**Deprecated/outdated:** `test/helpers/studio-portal.ts`, the sibling lists in `note-corpus.ts`, `todo-corpus.ts`, `debug-corpus.ts`, and the `STUDIO_PORTAL_AVAILABLE` constants in 11 spec files.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A shape-preserving, trimmed rewrite of the private documents (quirks kept, prose cut, line counts not preserved) satisfies D-06 | Summary, Open Questions Q2 | If the user wants full-length documents, authoring effort roughly triples |
| A2 | The leak test should also cover `test/rendering/fixtures/` and `test/helpers/` embedded text, beyond the three directories D-08 names | Appendix C | If kept to D-08's three directories, diagram fixtures with `api.cinedise.com` stay in the public repo |
| A3 | Strings nested under a secret key (object or array value) are masked recursively; booleans, numbers and null stay | Code Examples, secret masking | If the user wants objects shown whole, a nested key would leak; if masked too eagerly nothing is lost |
| A4 | Masking applies to top-level key names only, mirroring GSD's exact-membership check | Code Examples, secret masking | A nested `integrations.brave_search` string would show in full. GSD itself would not mask it either |
| A5 | The primary Playwright server (port 4199, repo root) should stay on `.` for specs pinned to frozen archives, and specs that read live `.planning/research` or live counts should move to the fixture server | Code Examples, browser tests | If left, `research-page.spec.ts` and the drawer spec keep failing/skipping as the milestone advances |
| A6 | `fixtures/dense/**`, `fixtures/README.md` and `test/__golden__/dense.json` get a narrow, named exemption for the single word "studio-portal" in the leak test | Pitfall 4, Open Questions Q1 | If not exempted, the leak test is red on day one; if the user prefers rewording, the dense golden must be regenerated (contradicts D-04) |
| A7 | Test runs under a different `HOME` (or with the work directories absent) are a sufficient automated proof of "changing or deleting another project's `.planning/` changes no result" | Validation Architecture | The literal manual check (moving `~/Work` aside) is stronger but should stay a user-run step |
| A8 | `--reporter=json` `numPendingTests` is the right zero-skip signal for Vitest 4.1.11 | Validation Architecture | Observed: the field reported 9 for the 9 `runIf` skips this session [VERIFIED], so low risk |
| A9 | Suggested fiction: a small tool-lending app (sign-in and sessions, roles and permissions, account admin, bulk export; v1.0: data foundation, inventory health, catalogue browsing, loan transfers) maps one-to-one onto the shapes the tests need | Appendix A | Cosmetic; the executor can choose any theme (D-07) |

## Open Questions (RESOLVED)

All six were settled at plan time; each carries its resolution below and in `06-CONTEXT.md`.

1. **Q1: How does D-08's deny list treat "studio-portal" inside the made-up dense tree, its README ledger and its golden?**
   - What we know: those 10 places use the name as a reference to the project the parser must not overfit to (60 lines in `dense.json`). D-04 says leave them; D-08 lists the word.
   - What's unclear: whether the user prefers an exemption or rewording.
   - Recommendation: a named exemption list in the leak test (paths and the single word), each entry with a one-line reason, and an assertion that the exemption list has not grown. Rewording would force a golden regeneration that D-04 forbids.
   - **RESOLVED (D-16):** named exemption for `fixtures/dense/**`, `fixtures/README.md` and the dense golden, one-line reason each, and the test fails if the list grows.

2. **Q2: How faithful must the rewritten documents be in length?**
   - What we know: the private originals total about 15,000 lines (studio-portal, 52 files that tests touch) plus about 6,000 lines in committed fixtures (reviews 2,800, verifications 1,000, learnings 430, notes and todos 400 across duplicates, diagrams 2,500 including the 1,945-line golden).
   - Recommendation: keep every heading, table shape, frontmatter key, malformed spot and formatting quirk; cut prose to a few lines per section; re-pin counts (D-02). Existing evidence this is acceptable: `test/helpers/research-fixtures.ts` already embeds trimmed excerpts for the same purpose. Confirm with the user before authoring, because it changes the volume of work by a large factor.
   - **RESOLVED (D-17):** keep structure and trim prose; pinned numbers are recalculated on the trimmed files (D-02).

3. **Q3: Should Labelore's own `.planning/` reads be restricted to archived paths?**
   - What we know: D-03 permits reading it. The 24 live-drift failures prove the active paths rot (research, drawer, a `v1.0-research` archive folder the summary walker did not expect). `ui-spec-corpus` will break when Phase 12 adds a UI-SPEC.
   - Recommendation: allow own-repo reads only for `milestones/v*-...` (frozen) with pins, and for invariant-only walks (every file extracts and composes, count at least N) elsewhere. Move the project-research tests (21) onto a fixture `research/` folder. This is within D-03 (it says "may", not "must").
   - **RESOLVED (D-18):** own-repo reads are re-pinned to today's files, including the 24 failing live-drift tests; the user accepts updating the pins as planning continues.

4. **Q4: Mask the three key names at any depth, or only top level?** Recommendation: top level only (mirrors GSD and D-09); revisit if the settings page (Phase 12) shows nested integrations.
   - **RESOLVED (CONTEXT, Claude's Discretion):** top level only.

5. **Q5: Private text outside the scope of D-08.** `.planning/sketches/*/data.js` embed `raw` copies of real notes, todos, debug sessions and reviews (for example `026-dashboard-below-the-head` has 108 deny-list hits across 3 files), and archived milestone folders mention the names hundreds of times (546 hits across 88 files in `milestones/v2.0-quick`). `.mcp.json` and `.claude/CLAUDE.md` contain `/home/cinedise/...`. None of this is under `test/` or `fixtures/`, so TEST-03 as written does not reach it, and D-03 explicitly leaves `.planning/` alone. Surface to the user as a follow-up; do not widen this phase unprompted.
   - **RESOLVED (D-19):** out of scope and recorded as a follow-up; tests that compare fixtures byte for byte with sketch data are deleted, not re-pinned.

6. **Q6: Git history.** Deleting the files does not purge history. Out of scope per the phase text; mention so the user can decide separately.
   - **RESOLVED (CONTEXT Deferred Ideas):** git history stays out of scope and is listed with the D-19 follow-up.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | everything | yes | v26.8.2 (package engines `>=22.18.0`) | none needed |
| vitest | unit suite | yes | 4.1.11, 176 files run in 14.5 s | none |
| Playwright browsers | spec runs | yes | chromium 1208 and 1243, firefox, webkit present in `~/.cache/ms-playwright` | none |
| git | file-dates, commit-times, snapshot | yes | on PATH (used by `file-dates.ts`) | the app already degrades to mtime |
| `~/Work/Cinedise/studio-portal`, `~/Work/Ibis/*`, `~/Work/Sideby/*` | today's corpus tests only | present on this machine | n/a | removed by the phase |
| `~/studio-portal` | today's port-4198 server | absent | n/a | replaced by the fixture |
| Free ports 5310-5319, 4198, 4199 | fixture servers, Playwright | assumed free (4173/4174 are the user's) | n/a | `firstFreePort()` already probes 5310-5319 |

**Missing dependencies with no fallback:** none.
**Not run this session:** no Playwright spec was run (user preference: never the full browser suite by default; none needed to answer the research questions).

## Validation Architecture

(`workflow.nyquist_validation` is `false` in `.planning/config.json`, but the orchestrator asked for this section explicitly, so it is included.)

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.1.11 (unit), @playwright/test 1.63.0 (browser) |
| Config file | `vitest.config.ts` (`include: ['test/**/*.test.ts']`), `playwright.config.ts` |
| Quick run command | `npx vitest run test/<file>.test.ts` (whole unit suite is only ~15 s, so run all of it per wave) |
| Full suite command | `npm test` then `npm run typecheck && npm run lint` |
| Browser (only the touched spec) | `npx playwright test test/e2e/<spec>.spec.ts` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | zero failures, zero skips | gate | `npx vitest run --reporter=json --outputFile=<tmp>/r.json` then assert `numFailedTests === 0 && numPendingTests === 0 && numTodoTests === 0` | new script in the plan |
| TEST-01 | no absolute-ms budgets remain | scan | `test/no-skips.test.ts` asserts no `toBeLessThan(<number>)` adjacent to `performance.now`/`Date.now` outside the growth helper | Wave 0 |
| TEST-01 | harness can detect quadratic | unit | `test/helpers/growth.test.ts` (planted quadratic over 24, planted linear under 24) | Wave 0 |
| TEST-02 | no real-project path anywhere | scan | `test/no-skips.test.ts` greps tests, helpers, playwright config for `homedir(`, `/home/`, `Work/(Ibis\|Cinedise\|Sideby)`, `STUDIO_PORTAL`, `SP_PLANNING` | Wave 0 |
| TEST-02 | results independent of other machines' files | gate | `HOME=$(mktemp -d) npx vitest run` gives the same counts as a normal run | command only |
| TEST-03 | fixtures hold no private words | scan | `test/fixture-leak.test.ts` (whole-word deny list, plus filename check, plus tells such as `seagate`, `smartctl`, `rclone`, `api.cinedise`) with a planted positive control | Wave 0 |
| TEST-04 | browser server targets fixture and throws when missing | unit + config | `test/playwright-config.test.ts` imports the config with the fixture temporarily unresolvable and expects a throw; plus `grep -c test.skip test/e2e` is 0 | Wave 0 |
| SEC-01 | link scanner linear; failing before fix | unit | `test/rendering/linkify-growth.test.ts` (legacy regex literal flagged; fixed regex under 24 on 8 shapes) | Wave 0 |
| SEC-01 | section and mention scanners linear | unit | extend `test/section-projection.test.ts`, `test/mentions.test.ts`, `test/security-register.test.ts` with growth cases | existing files |
| SEC-02 | one allowlisted injection site | scan | `test/web/raw-html-guard.test.ts` (planted control) | Wave 0 |
| SEC-03 | View outline capped at 18, "+N more", sections intact | unit | `test/web/outline-cap.test.ts`; extend `test/web/outline-contract.test.ts` for the `<li data-overflow>` markup | Wave 0 |
| SEC-04 | masked in frontmatter, body, config, index, snippets, rendered HTML, `/api/*`; malformed JSON; non-string values; other JSON files untouched | unit + server | `test/config-masking.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run <touched test files>`
- **Per wave merge:** `npm test` and `npm run typecheck`
- **Phase gate:** full unit suite green with the JSON-reporter zero-skip check, run **three times, once under artificial load** (Pitfall 11: for example 16 busy processes in the background, as used for the harness experiment), then the touched Playwright specs only (`research-page`, `planning-drawer`, and one retargeted spec per family), then `npm run lint`.

### Wave 0 Gaps
- [ ] `test/helpers/growth.ts` and `test/helpers/growth.test.ts`
- [ ] `test/helpers/source-scan.ts` (extract from `class-vocabulary.test.ts`)
- [ ] `test/helpers/fixture-project.ts`
- [ ] `test/no-skips.test.ts`, `test/fixture-leak.test.ts`, `test/web/raw-html-guard.test.ts`
- [ ] `test/config-masking.test.ts`, `test/rendering/linkify-growth.test.ts`, `test/web/outline-cap.test.ts`
- [ ] The fixture project itself and its README ledger entry

## Security Domain

`security_enforcement` is enabled (`.planning/config.json`, `security_asvs_level: 1`).

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | local read-only tool, no login |
| V3 Session Management | no | none |
| V4 Access Control | no (path containment already handled by `PathEscapeError` in the filesystem layer; SEC-05 is Phase 8) | n/a |
| V5 Input Validation and output encoding | yes | bounded-quantifier regexes, linear scanners with growth tests, sanitize-before-linkify pipeline order, raw-HTML guard |
| V6 Cryptography | no | none (masking is redaction, not encryption; do not describe it as protection of the file on disk) |
| V8 Data Protection | yes | mask secret strings at read time in the one handler; the full value never enters `ParsedArtifact` |
| V14 Configuration | partly | allowlisted secret keys copied from GSD with a pinned test so drift is visible |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Catastrophic backtracking in `REFERENCE_TOKEN` on a long capital or digit run (T-05-07 follow-up) | Denial of service | Bounded quantifiers (Code Examples); growth test; legacy-regex positive control |
| Hostile markdown tables and long lines in section projection | Denial of service | Existing anchored per-line patterns; new growth tests (5k rows, 200k-char line) |
| Raw HTML injected through a new `dangerouslySetInnerHTML` or `innerHTML =` | Tampering / XSS (T-05-02, T-05-13) | Standing scan with allowlist; sanitize step stays before linkify |
| Unbounded outline from thousands of `##` headings (T-05-11) | Denial of service | `capOutline` at 18; document sections still render |
| API key shown in raw file, page, search index or snippets | Information disclosure | Handler-level masking; unparseable-JSON branch; end-to-end `/api/*` assertions |
| Private text published through committed fixtures | Information disclosure | Rewrite (D-06) plus the standing leak scan |

## Appendix A: Every test that reads another project (grouped by family)

Counts below are from `grep` over `test/` this session. "FX" = a file the made-up project must supply. Every `SP_PLANNING` path is under `~/Work/Cinedise/studio-portal/.planning/` on this machine (the project has 52 of the 328 files in its `.planning/` touched by tests, about 15,000 lines). "LB" = Labelore's own `.planning/`. The unit suite is currently green for these only because that checkout exists here.

| # | Family | Test files that depend on it | Real sources read today | FX needed | Things pinned (re-pin on FX) |
|---|--------|------------------------------|-------------------------|-----------|-------------------------------|
| 1 | CONTEXT brief | `test/context-brief.test.ts` (12 gates), `test/web/context-brief-corpus.test.ts`, `test/e2e/context-brief.spec.ts` | SP phases 01-04 CONTEXT, SP v1.0 01-04 CONTEXT, SP quick 260803-2pr CONTEXT | 4 phase CONTEXT + 4 archived CONTEXT + 1 quick CONTEXT | statement/in/out/drift; 5 deferred items with fate/from/dest/revisit; 8 declined + 1 out + 1 carried; kinds `rule/rule/leaning` and `leaning/note/rule/rule/rule`; `<blocking_amendments>` and `<resolved_open_question>` tag handling |
| 2 | Discussion log | `test/section-projection.test.ts` (SP repro, line 930), `test/web/discussion-log-corpus.test.ts` (14 SP refs) | SP 01-04 DISCUSSION-LOG, SP v1.0 01-04 DISCUSSION-LOG | 8 logs, one with the "renamed CLI question" repro | chosen, chosenIndex 1, qualifier "renamed", userChoice containing a specific word |
| 3 | Research briefing | `test/research-briefing.test.ts`, `test/web/research-corpus.test.ts`, `test/rendering/ascii-lift.test.ts` (SP v1.0/03 ragged boxes), `test/helpers/research-fixtures.ts` (embedded real excerpts) | SP v1.0/02, v1.0/03, phases 01 and 03 RESEARCH (8 files, 13 total with LB) | 3-8 RESEARCH incl. a table-heavy and a box-diagram one | pinned anchors, "Summary has 2 findings" / "1 finding", ragged-edged boxes (see Pitfall 1) |
| 4 | Pattern map | `test/pattern-map.test.ts`, `test/web/pattern-map.test.ts`, `test/web/pattern-map-corpus.test.ts`, `test/e2e/patterns-map.spec.ts` | SP v1.0/02 PATTERNS (980 lines), 7 PATTERNS total | 1-2 PATTERNS | five doc groups, nine no-analog entries, a partial entry, the reject rule; corpus `>= 11` files |
| 5 | Plan | `test/rendering/plan-sections.test.ts`, `test/web/plan-navigator-corpus.test.ts` (ROWS table, 6 gates, also reads LB archives), `test/e2e/plan-page.spec.ts` | SP 01-01, 01-06, 02-01, 04-02 PLAN, quick 260802-sya PLAN | 5 PLANs with the shapes: Action checkpoint, inline-options decision, wrapper warnings | per-task counts, "Done when" from top-level verification, two option cards, "Wrapper warnings · 2" |
| 6 | Summary | `test/summary-run.test.ts` (4 SP), `test/web/summary-run.test.ts`, `test/web/summary-run-corpus.test.ts` (walks every SP and LB summary), `test/e2e/summary-page.spec.ts` | SP 01-01, 01-06 (malformed YAML), 04-06, 04-07 (seven Rule deviations), v1.0/02-12 (no frontmatter) | 5 SUMMARIES plus enough others to keep resolution percentages meaningful | "158 of 166 requirement IDs resolve" (title at line 113), deviations, awaiting-checkpoint |
| 7 | UAT | `test/uat-session.test.ts`, `test/web/uat-session.test.ts`, `test/web/uat-session-corpus.test.ts`, `test/e2e/uat-page.spec.ts` | SP phases 01-03 UAT, SP v1.0/03 UAT (six resolved YAML gaps) | 4 UATs | gaps, strips ("reverified" text), "four cards, a resolution source-only entry" |
| 8 | Security register | `test/web/security-console.test.ts` (6 gates), `test/web/security-console-corpus.test.ts` (walks all SECURITY; builds a synthetic open-threats doc from SP phase 03), `test/helpers/security-synthetic.ts`, `test/e2e/security-page.spec.ts` | SP phase 01 and 03 SECURITY | 2 SECURITY (one with open threats) | "Backend (2), the other six crossings", "Crossings · 10", T-01-07 reverse link |
| 9 | Validation strategy | `test/validation-strategy.test.ts` (8 SP refs), `test/web/validation-strategy.test.ts`, `test/web/validation-strategy-corpus.test.ts`, `test/e2e/validation-page.spec.ts` | SP phases 01-04 VALIDATION, SP v1.0 01-04 VALIDATION (8 files) | 6 VALIDATION incl. an off-template one | "33 pending tasks" (describe title, `expect(lacking).toBeLessThan(33)`) |
| 10 | UI-SPEC | `test/ui-spec-contract.test.ts`, `test/web/ui-spec.test.ts`, `test/web/ui-spec-corpus.test.ts` (PINNED map, LB keys included), `test/web/ui-spec-theme.test.ts`, `test/theme-tokens.test.ts`, `test/e2e/ui-spec-page.spec.ts` | SP v1.0/02, v1.0/04, phases 01-04 UI-SPEC; SP `frontend/app/globals.css` | 4-6 UI-SPEC plus `frontend/app/globals.css` and `components.json` | the "Element \| Kinds trap", hex light/dark columns, `oklch(...)` token values (theme-tokens test pins six values) |
| 11 | UI review | `test/ui-review-audit.test.ts`, `test/web/ui-review.test.ts`, `test/web/ui-review-corpus.test.ts`, `test/e2e/ui-review-page.spec.ts` | SP phase 03 UI-REVIEW (the only one) | 1 UI-REVIEW with: no frontmatter, a dropped third fix, a lead sentence, a correction note | those four quirks |
| 12 | Verification | `test/web/verification-board-corpus.test.ts`, `test/web/verification-board.test.ts`, `test/verification-report.test.ts` | SP v1.0/04 VERIFICATION, SP quick 260727-3mo; committed `test/fixtures/verification/{sp04,sb04,dd01,synthetic}` | 4 VERIFICATIONs | passed-with-one-frontmatter-gap shows a C1 row; same-level numbered human check |
| 13 | Review | `test/web/review-threads-corpus.test.ts`, `test/web/review-threads.test.ts`, `test/review-report.test.ts`, `test/presentation/review-context.test.ts`; committed `test/fixtures/review/*` | SP phase 01 REVIEW; fixtures `sp01`, `sp03`, `dd01`, `dd02`, `sb02`, `sb14` (+ FIX files) | rewrite 6 review + 2 fix files | "26 findings, 4 critical", threads, heads and heroes; the `clean-REVIEW.md` is already synthetic |
| 14 | Learnings | `test/web/learnings-retro-corpus.test.ts`, `test/learnings-retro.test.ts`, `test/web/learnings-retro.test.ts`, `test/e2e/learnings-page.spec.ts`, `test/e2e/learnings-fixture-server.ts` | SP phase 01 LEARNINGS (336 lines, "sketch values") ; committed `test/fixtures/learnings/sp01-LEARNINGS.md` | 1-2 LEARNINGS | sketch values for phase 1 |
| 15 | Debug sessions | `test/debug-session.test.ts`, `test/web/debug-case.test.ts`, `test/web/debug-case-corpus.test.ts`, `test/e2e/debug-page.spec.ts`, `test/e2e/debug-fixture-server.ts`, `test/helpers/debug-corpus.ts` | 4 sibling sessions in three other work projects (awaiting-a-check with two evidence rounds and six verification chips; diagnosed with two causes; resolved with 24 evidence entries, three causes, eight files; resolved over five rounds with 25 entries and 11 other sections). 6 of the 9 current skips are here | 4 debug sessions (3 live + 1 `resolved/`) + knowledge base | all of the counts quoted; the e2e `placed.includes('dd')` skips |
| 16 | Notes and todos | `test/note-lift.test.ts` (one sibling note), `test/todo-file.test.ts`, `test/web/todo-lifecycle.test.ts`, `test/web/todo-lifecycle-corpus.test.ts` (two sibling todos rs1, rs2), `test/web/note-page*.test.ts`, `test/presentation/todo-notes.test.ts`, `test/e2e/{note,todo}-page.spec.ts`, `test/e2e/{note,todo}-fixture-server.ts`, helpers `note-corpus.ts`, `todo-corpus.ts` | committed `test/fixtures/notes/**` and `test/fixtures/todos/{duet,portal,labelore}/**` (the notes and todos trees are byte duplicates of each other), sibling `.planning/notes` and `.planning/todos`, `.planning/sketches/02[78]-*/data.js` | one `notes/` and one `todos/{pending,completed,done}` set inside FX; consolidate the duplicates | the eleven todo keys, promoted-from-note, squares, rs1 "four folds", rs2 "a link to a todo stays plain text" |
| 17 | Project research | `test/project-research-lift.test.ts` (7 failing), `test/presentation/project-research.test.ts` (14 failing), `test/e2e/research-page.spec.ts`, `test/helpers/project-research-fixtures.ts` | LB `.planning/research/*.md` (live, replaced by v2.1 research) | FX `research/{SUMMARY,STACK,FEATURES,ARCHITECTURE,PITFALLS}.md` | "5 research files", "Researched 21 Aug 2026", 4 phases, 6/13/6 stack layers, 11/7/9 features, 10 pitfalls, "Overfit to ..." first pitfall |
| 18 | Diagrams | `test/rendering/ascii-graph.test.ts`, `ascii-lift`, `ascii-tree`, `lane-layout`, `test/web/lane-diagram.test.ts`, `fenced-figure.test.ts`, `clean-tree.test.ts`; fixtures `test/rendering/fixtures/sp-*.txt` (11) and `sketch-012-graphs.json` (1,945 lines) | copies of SP research diagrams (host names, device names) | rewrite the 11 diagrams column-for-column; regenerate the golden | box counts, widened box, row counts, dashed group "Auth middleware" (rename), lane/node widths |
| 19 | Drawer and dashboard | `test/presentation/drawer.test.ts` (1 failing, LB newest shipped milestone), `test/e2e/planning-drawer.spec.ts` (3 data-conditional skips) | LB live `.planning` | FX with a shipped milestone that has quick tasks | drawer expectations; "no quick tasks" skip becomes a hard assertion |
| 20 | Other | `test/target-path.test.ts:54-57` (silent early return when `~` is not an ancestor), `test/server/dashboard-ledger.test.ts` and `remote-source.test.ts` (use only synthetic or tmp dirs; no change) | `homedir()` | stub `HOME` for the test | n/a |

**Counts to size the work (grep this session):** 61 test files contain `runIf`, `skipIf` or `test.skip` or `SP_PLANNING`/`homedir`; 12 spec files skip (`context-brief`, `uat-page`, `validation-page`, `ui-review-page`, `ui-spec-page`, `security-page`, `plan-page`, `patterns-map`, `research-briefing`, `summary-page` via `STUDIO_PORTAL_AVAILABLE`; `debug-page` via `placed`; `planning-drawer` via data); 4 fixture servers; the unit suite currently skips 9 tests (debug-session 1, debug-case 3, debug-case-corpus 1, todo-file 1, todo-lifecycle 1, todo-lifecycle-corpus 1, plan-navigator-corpus 1).

## Appendix B: Absolute-millisecond assertions to convert to growth ratios (TEST-01)

All use `performance.now()`/`Date.now()` with `toBeLessThan(<ms>)`. Line numbers are from this session's grep.

`test/security-register.test.ts:231-239` (250, the one failing today) | `test/plan-structure.test.ts:327-337` | `test/debug-session.test.ts:308-322` (2) | `test/summary-run.test.ts:312-322` | `test/uat-session.test.ts:194-201` | `test/pattern-map.test.ts:178-186` | `test/web/pattern-map.test.ts:85-87` | `test/learnings-retro.test.ts:162-172` | `test/project-research-lift.test.ts:307-318` (per file key) | `test/ui-review-audit.test.ts:188-192` | `test/section-projection.test.ts:595-615` (200, 2 tests) | `test/review-report.test.ts:219-229` | `test/todo-file.test.ts:403-412` | `test/verification-report.test.ts:246-256` | `test/research-briefing.test.ts:340-353` (250 and 500) | `test/validation-strategy.test.ts:195-211` (2) | `test/ui-spec-contract.test.ts:172-179` | `test/context-brief.test.ts:133-154` (2) | `test/note-lift.test.ts:294-307, 560-572` (4) | `test/presentation/todo-notes.test.ts:192-225` (500 todos x 500 notes) | `test/rendering/ascii-tree.test.ts:87-90, 229-234` | `test/rendering/plan-sections.test.ts:449-451` | `test/rendering/figure-detect.test.ts:76-78` (100) | `test/rendering/ascii-graph.test.ts:230-236` (4 grids; failed twice in the first run) | `test/rendering/ascii-lift.test.ts:160-164, 533-553` (4) | `test/web/security-console.test.ts:395-398, 473-495` | `test/web/ui-review-corpus.test.ts:211-213` | `test/theme-tokens.test.ts:158-161` (1000) | `test/server/dashboard-ledger.test.ts:156-180` (1500) | `test/server/remote-source.test.ts:275-280` (3000, a hang detector for a fake ssh; keep as a generous hang detector) | `test/web/build-splitting.test.ts:79` (not a timing test; a bundle-size limit, leave).

About 45 assertions in 33 files. The capped-input ones are in the ascii-* group and `figure-detect`; apply the "caps are not growth" rule.

## Appendix C: TEST-03 audit result

Method: whole-word, case-insensitive grep for `cinedise|cinedise-portal|studio-portal|studio portal|resoundant|pyedge|deid|deid-ui|sideby|sideby.me|duet|edgecan|ibis` over every tracked file outside `.planning/`, plus a search for "tells" (hardware and host strings) in the fixture directories.

**Totals outside `.planning/`:** studio-portal 280, sideby.me 65, cinedise 56 (substring `deid` also hits `nodeId`, so use `\b`), sideby 22, resoundant 21, ibis 14, deid 28 (whole word), cinedise-portal 12, duet 9, deid-ui 6, pyedge 4, edgecan 2.

**Committed fixture content copied from private work (rewrite, D-06):**

| Path | Words / tells present | Lines |
|------|----------------------|-------|
| `test/fixtures/review/dd01-REVIEW.md` | deid | 919 |
| `test/fixtures/review/dd02-REVIEW.md`, `dd02-REVIEW-FIX.md` | prefix from deid; content copied | 583, 284 |
| `test/fixtures/review/sb02-REVIEW.md`, `sb02-REVIEW-FIX.md`, `sb14-REVIEW.md` | sideby (13, 7, 28) | 232, 85, 171 |
| `test/fixtures/review/sp01-REVIEW.md`, `sp03-REVIEW.md` | cinedise; studio hardware terms | 199, 335 |
| `test/fixtures/review/clean-REVIEW.md` | none (synthetic) | 38 |
| `test/fixtures/verification/dd01-`, `sb04-`, `sp04-VERIFICATION.md` | deid; cinedise (4); hardware terms | 335, 179, 317 |
| `test/fixtures/verification/synthetic-VERIFICATION.md` | 3 hits (check) | 170 |
| `test/fixtures/learnings/sp01-LEARNINGS.md` | cinedise (4), "portal" 7 | 336 |
| `test/fixtures/notes/**` (12 files) and `test/fixtures/todos/{duet,portal}/**` (12 files, byte duplicates) | duet (3 files), "portal" filenames `portal-detect-vanished-tier-device.md`, `2026-10-23-studio-media-workflow-milestone-brief.md`, WebRTC/TURN call logging | ~130 |
| `test/fixtures/todos/labelore/**` | none; Labelore's own todo/note shapes (check for copied text) | 195 |
| `test/rendering/fixtures/sp-*.txt` (11 files) | `api.cinedise.com`, Cloudflare Access, tier and drive names, `smartctl`, `rclone`; filenames prefixed `sp-` | ~420 |
| `test/rendering/fixtures/sketch-012-graphs.json` | cinedise (3) plus the same tells | 1,945 |
| `test/helpers/research-fixtures.ts` | "Verbatim, trimmed excerpts of real RESEARCH documents"; `cinedise` host, Seagate/SanDisk, rclone | 416 |
| `test/helpers/project-research-fixtures.ts`, `security-synthetic.ts` | cinedise (3); "derived from studio-portal's phase 03 doc" | 345, 22 |
| inline in tests | `strip-markdown.test.ts:26,28` contains `studio.cinedise.com`; `document-title.test.ts` uses "Cinedise Portal" as a heading; test titles name `studio-portal`, `deid`, `sideby`, `resoundant` throughout | n/a |

**Exempt by D-04 but containing a deny-list word (see Q1):** `fixtures/dense/.planning/{PROJECT,ROADMAP,STATE}.md`, `phases/01-identity-slice/{01-SPEC,01-RESEARCH,01-PATTERNS,01-02-PLAN,01-CONTEXT}.md`, `fixtures/README.md`, `test/__golden__/dense.json` (60 lines). All say "studio-portal"; no other private word.

**Already synthetic (no change):** `fixtures/sparse-empty`, `fixtures/sparse-started`, `test/fixtures/dashboard/{ledger,synthetic}` (use the generic word "portal" for a made-up gateway), `test/fixtures/debug/search-index-goes-stale.md`, `test/fixtures/learnings/synthetic-LEARNINGS.md`.

**App source (corrected 2026-10-25 at plan revision):** `src/` is not clean. Whole-word matching finds four comments that name a private project: `src/planning-repo/handlers/project-research-lift.ts:6`, `src/planning-repo/handlers/review-report.ts:859`, `src/planning-repo/handlers/ui-review.ts:5` and `src/presentation/dashboard-head.ts:80`. The two-word form of the reference project's name, which this audit's own word list includes, finds two more in `src/web/styles/globals.css` (lines 21 and 4327) and one in `index.html:20`. The earlier "no private names in `src/`" claim came from a check that missed all seven. `src/rendering/ascii-graph.ts:413` uses the public tool name rclone as a working word in its external-node classifier. That is a tell only inside copied fixture text, not a private name. Plan 06-22 rewords the seven comments (comment-only) and extends the leak test to every tracked text file outside `test/`, `fixtures/` and the three D-19 locations. `playwright.config.ts` names the reference project in its comments and its real-checkout webServer entry, which 06-01 removes.

**Outside scope, reported only (D-19):** `.mcp.json:5` carries `/home/cinedise/...`. `.claude/CLAUDE.md` carries that home path and names the reference project throughout. `.planning/sketches/**` and `.planning/milestones/**` carry hundreds of mentions and raw copies (Q5). Further `.planning/` files also name private projects: `PROJECT.md`, `REQUIREMENTS.md`, `MILESTONES.md`, `RETROSPECTIVE.md`, and files under `phases/`, `research/`, `notes/`, `todos/`, `debug/` and `quick-batches/`. Plan 06-22 lists them from a fresh search in its follow-up.

## Sources

### Primary (HIGH confidence, read or run this session)
- `src/rendering/linkify.ts`, `src/planning-repo/handlers/json-config.ts`, `src/planning-repo/frontmatter.ts`, `src/planning-repo/mentions.ts`, `src/server/search-index.ts`, `src/server/index.ts`, `src/web/pages/artifact-page.tsx`, `src/web/components/document-outline.tsx`, `src/web/views/manifest.ts`, `src/web/views/fallback.ts`, `src/web/views/document-sections.ts`
- `~/.claude/gsd-core/bin/lib/secrets.cjs` (whole file), `config.cjs`/`init.cjs` call sites (grep)
- `test/helpers/{studio-portal,note-corpus,todo-corpus,debug-corpus,research-fixtures}.ts`, `playwright.config.ts`, `vitest.config.ts`, `package.json`, `.planning/config.json`, `test/web/class-vocabulary.test.ts`, `test/snapshot.golden.test.ts`, the four `test/e2e/*-fixture-server.ts`
- `.planning/research/PITFALLS.md` (Pitfalls 11, 12, 13, 14, 33), `.planning/milestones/v1.1-phases/05-per-type-document-views/05-SECURITY.md`
- Vitest JSON run (3361 tests; 25 failed; 9 pending) and a scratch server on a planted `config.json` (curl against `/api/presentation`, `/api/artifacts/...`, `/api/search`)
- Scratch measurements: `lk.mjs` (regex growth), `eq.mjs` (behaviour parity over 961 files, 18,848 tokens), `harness.mjs` (growth ratios under 16 busy processes), `growth.ts` (section and mention scanners)

### Secondary / Tertiary
- None. No external web or Context7 queries were needed: every claim is about this repository or measured here.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, nothing new is added
- Architecture and fixes (linkify, guard, cap, masking): HIGH, each was measured or reproduced
- Fixture authoring effort: MEDIUM, an estimate from line counts and the pinned-value inventory
- Pitfalls: HIGH for items found by running the suite, MEDIUM for e2e items inferred without running specs

**Research date:** 2026-10-25
**Valid until:** about 2026-11-08 for the failure counts (the live `.planning/` keeps changing during v2.1); the code-level findings stay valid until `linkify.ts`, `json-config.ts` or `artifact-page.tsx` change.
