---
phase: 10-codebase-map-specification-and-check-pages
plan: 05
subsystem: codebase-map
tags: [codebase-map, handler, fence-aware-scan, fuzzy-heading-match, stack-chips, concern-counts]
status: complete

requires:
  - phase: 10-01
    provides: the codebase-* ref kinds the handler claims
  - phase: 10-03
    provides: the adjusted concern-counting rule, the heading-variant and stamp findings
  - phase: 10-24
    provides: the Tidemark map-only fixture and its per-section concern pins
provides:
  - splitFencedSections, the one fence-aware H2/H3 splitter for every Phase 10 extractor
  - CodebaseHandler, structured.codebase for every codebase-* artifact (stamp, sections with fuzzy keys, keyNumber, stack and concerns lifts)
affects: [10-07, 10-08 codebase page, 10-12, 10-14, panel plans that set keyNumber for the other five documents, 10-15 corpus tests]

actuals:
  tokens: 18000
  tasks: 2
  commits: 4
plan_head_before: a413e8774b0b8281063d34132de6341682dd77ae
plan_head_after: d501078315b8f6893be4182de0253742dc0a3e83
commits: 4

tech-stack:
  added: []
  patterns: [guarded handler with a separate lift, Map-only keyed lookups, one-pass character scans with body, section and chip caps, RED test commit before GREEN]

key-files:
  created:
    - src/planning-repo/handlers/fenced-sections.ts
    - src/planning-repo/handlers/codebase-lift.ts
    - src/planning-repo/handlers/codebase.ts
    - test/fenced-sections.test.ts
    - test/codebase-lift.test.ts
    - test/codebase-handler.test.ts
    - test/codebase-map-corpus.test.ts
  modified:
    - src/planning-repo/handlers/index.ts

key-decisions:
  - "Concern counting follows 10-03's adjusted rule verbatim: subsections, then bold-label lines from one, then bullets without a field label, then table rows; a unit whose first field value is None, Not detected or Not applicable counts 0"
  - "Only H2 sections are keyed; H3 sections are listed (level 3) with key null, so an H3 inside Anti-Patterns can never claim Error Handling"
  - "The first heading to claim a key owns it; a later heading matching the same key stays plain (key null), and in CONCERNS is counted as an extra"
  - "Match tiers are equal, then prefix at a word boundary (or before a plural s), then whole-word containment, longest key wins within a tier; the template texts are the keys, no short aliases"
  - "The plural-s drop is trailing only, as the spec says, so Webhook & Callback does not equal Webhooks & Callbacks; the real maps use the template text"
  - "An empty marker is None, Not detected or Not applicable followed by a non-letter, except 'None of ...', so a concern sentence that starts with None is not zeroed"
  - "structured.codebase.concerns lists the known sections in file order, then extras in file order, plus a missing list of the known keys the document lacks (the page shows each as a dashed 0)"

requirements-completed: [VIEW-13, TGT-09]

duration: 45min
completed: 2026-11-04
---

# Phase 10 Plan 05: Codebase map handler Summary

**Every codebase-* document now arrives with a UTC-day stamp, its H2/H3 sections in file order with fuzzy-matched keys (unknown headings stay plain), and for Stack and Concerns the chips and the per-section counts, with labelore's own map counting 30 concerns exactly as 10-03's adjusted rule predicted.**

## Performance

- **Duration:** about 45 min
- **Tasks:** 2 of 2 (Task 1 tracer, Task 2 TDD), four commits (RED and GREEN each)
- **Files created:** 7, modified: 1 (`handlers/index.ts`)

## What was built

- `fenced-sections.ts`: `splitFencedSections(body)`, a one-pass scan that honours backtick and tilde fences of three or more (indented markers allowed, closed by the same character at least as long, an unclosed fence runs to the end). Caps: 250,000 body characters, 400 sections, 300 heading characters. An H2's range runs through its H3s. Also exports `eachLineOutsideFences`, `fenceMarker`, `splitBodyLines` for the lifts.
- `codebase-lift.ts`: `normaliseHeading` (character scan), `CODEBASE_KEYS` (one Map per document, template texts), `matchKey`, `readMapStamp`, `liftStack`, `countConcerns`, `extractCodebase`, `CodebaseBody`.
  - Stamp: frontmatter `last_mapped_at` (a Date via `toISOString().slice(0, 10)`, or a validated string day), then `**Analysis Date:**`, `*Last updated*`, a refreshed comment, else null. The commit shows only for a string of seven or more characters (first seven); an unquoted all-digit commit arrives as a number and shows nothing.
  - Stack: chips `{ name, version | null, group }`; groups primary and secondary (languages), runtime, core, testing and build-dev (frameworks); version is the first digit-led token after the first word on the left of the first spaced dash, never one inside an earlier parenthetical; a `Runtime` label inside a combined "Languages & Runtimes" section feeds the runtime list; a `Package Manager` label feeds nothing; at most 60 chips, 120 characters per name and version. keyNumber is languages plus frameworks.
  - Concerns: per-section counts by the adjusted rule; Tidemark pins 3, 1, 2, 2, 3, 2, 0, 1, 0 (total 14).
- `codebase.ts`: `CodebaseHandler`, registered before `GenericMarkdownHandler`, with the lift in its own try/catch (a throw keeps title, body and frontmatter and omits only `structured.codebase`).
- `markdown-sections.ts` is untouched.

## Verification

- Full gate: `gate: total=5520 passed=5520 failed=0 skipped=0 todo=0` (base was 5431; 89 new tests).
- Tidemark STACK through the snapshot CLI: `mapped: 2026-10-28 commit: 7`.
- Typecheck, lint and `npm run build` exit 0.
- Labelore's own map through the real repository: CONCERNS total 30 (6, 1, 6, 3, 4, 2, 2, 2, 4), matching the 10-03 adjusted figure for map 1; every stamp reads 2026-11-04 with a seven-character commit.
- Growth proofs (`measureGrowth`, below `GROWTH_LIMIT`) on eight shapes including 10,000 bullets, 2,000 headings, a 200k-character line and a 200k run of capitals; inputs stay under the body cap.

## Deviations from Plan

### Instructed deviations

**1. Service restart skipped**
- Task 2's verify ends with `systemctl --user restart labelore`; the orchestrator's instruction for this wave says not to restart the service, and the unit serves the main checkout, not this worktree. `npm run build` ran and passed in the worktree. The orchestrator should restart the service after merging the wave.

### Auto-fixed Issues

**2. [Rule 1 - Bug] Version read from inside a parenthetical qualifier**
- **Found during:** Task 2, reading labelore's own STACK through the repository
- **Issue:** "CSS (Tailwind v4 CSS-first config) - ..." gave name "CSS (Tailwind" and version "v4".
- **Fix:** version search tracks parenthesis depth across tokens; a token after an unclosed "(" is a qualifier.
- **Files modified:** `src/planning-repo/handlers/codebase-lift.ts`, test case added in `test/codebase-lift.test.ts`
- **Commit:** d501078

### Refinements to the recorded rule (no behaviour contradicts 10-03)

- "None of ..." is not an empty marker (a concern sentence beginning with None keeps its count); "Nonexistent" and similar are not markers either.
- A `###` or bold-label unit with no bullets at all counts 1 (no bullet to read a first field value from).
- Test comment: tests added for a non-letter-led first word ("3D shaders") and for a heading made only of an emoji.

## Observations for the page plans (10-07, 10-08, 10-12)

- A bullet with no spaced dash keeps the whole text as the chip name, as the plan states. In labelore's own STACK that produces long chip names for bullets such as the Node.js engines line and a "Module system: ESM only ..." bullet (a language chip, so the stack keyNumber of 22 over-counts slightly). The head and the panel should show names truncated; refining the no-dash case (read an early version token) is a one-function change in `chipOf` if the sketches want it.
- `structured.codebase.sections` carries H3 entries with key null; the page's plain-section remainder should group an H3 under the H2 before it.
- `concerns.missing` lists the known keys a document lacks; the page draws each as a dashed 0 and puts Security Considerations first (this lift keeps file order).
- keyNumber is null for architecture, structure, conventions, testing and integrations until their panel plans set it.
- Each document keeps its own stamp; picking the newest as "Mapped" is 10-08's (RESEARCH A3).

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or file access. T-10-08 (growth, caps), T-10-09 (Map-only lookups; a constructor, `__proto__`, toString heading test) and T-10-10 (no section body in structured.codebase; the Tidemark INTEGRATIONS placeholder key value is asserted absent) are covered by tests.

## Self-Check: PASSED

- Files created: fenced-sections.ts, codebase-lift.ts, codebase.ts, the four test files: found
- Commits c64d6b0, 50916e6, 393aa28, d501078: found on this branch
- `git diff --stat HEAD -- src/planning-repo/handlers/markdown-sections.ts` prints nothing; `git grep -c CodebaseHandler -- src/planning-repo/handlers/index.ts` prints 2
