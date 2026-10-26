---
phase: 06-trustworthy-tests-and-security-baseline
reviewed: 2026-10-26T00:00:00Z
depth: standard
files_reviewed: 55
files_reviewed_list:
  - playwright.config.ts
  - src/planning-repo/handlers/json-config.ts
  - src/planning-repo/handlers/project-research-lift.ts
  - src/planning-repo/handlers/review-report.ts
  - src/planning-repo/handlers/ui-review.ts
  - src/planning-repo/mentions.ts
  - src/planning-repo/secret-mask.ts
  - src/presentation/dashboard-head.ts
  - src/rendering/linkify.ts
  - src/web/components/document-outline.tsx
  - src/web/pages/artifact-page.tsx
  - src/web/styles/globals.css
  - src/web/views/manifest.ts
  - test/config-masking.test.ts
  - test/context-brief.test.ts
  - test/e2e/context-brief.spec.ts
  - test/e2e/fixture-root.ts
  - test/e2e/fixture-server.ts
  - test/e2e/note-page.spec.ts
  - test/e2e/patterns-map.spec.ts
  - test/e2e/validation-page.spec.ts
  - test/fixture-leak.test.ts
  - test/fixture-project.test.ts
  - test/handlers.test.ts
  - test/helpers/fixture-project.ts
  - test/helpers/growth.test.ts
  - test/helpers/growth.ts
  - test/helpers/todo-corpus.ts
  - test/helpers/vitest-gate.mjs
  - test/no-skips.test.ts
  - test/pattern-map.test.ts
  - test/playwright-config.test.ts
  - test/presentation/manual-checks.test.ts
  - test/presentation/roadmap.test.ts
  - test/presentation/todo-notes.test.ts
  - test/remote-target.test.ts
  - test/rendering/linkify-growth.test.ts
  - test/scanner-growth.test.ts
  - test/secret-mask.test.ts
  - test/section-projection.test.ts
  - test/security-register.test.ts
  - test/todo-file.test.ts
  - test/validation-strategy.test.ts
  - test/web/context-brief-corpus.test.ts
  - test/web/discussion-log-corpus.test.ts
  - test/web/document-title.test.ts
  - test/web/outline-cap.test.ts
  - test/web/outline-contract.test.ts
  - test/web/pattern-map-corpus.test.ts
  - test/web/pattern-map.test.ts
  - test/web/strip-markdown.test.ts
  - test/web/todo-lifecycle-corpus.test.ts
  - test/web/todo-lifecycle.test.ts
  - test/web/validation-strategy-corpus.test.ts
  - test/web/validation-strategy.test.ts
findings:
  critical: 1
  warning: 6
  info: 3
  total: 10
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-10-26
**Depth:** standard
**Files Reviewed:** 55 (the 56 made-up fixture files under test/fixtures/ were out of scope)

## Summary

The app-source changes are small and mostly sound. The linkify bounds are linear: I traced each alternative of `REFERENCE_TOKEN` and found no remaining quadratic shape. The `scanMentions` spread-to-loop change is correct. `capOutline` and the outline overflow row are correct, and Source mode's decision not to show the overflow row is pinned deliberately by D-15. Nothing in the server reads a `config.json` outside the handler. `readBytesWithin` is limited to the sketches directory, and the parse warning is a fixed string, so it cannot echo content.

The secret masking has one real hole on its main path (CR-01) and several evasions on the fallback path (WR-01). The new standing guards (no-skips, leak, growth) also have blind spots that I reproduced. `blankComments` swallows real test headers, and one growth test has weak sensitivity. Two e2e helpers have latent path and overwrite hazards.

## Critical Issues

### CR-01: A shadowed (duplicate-key) secret in a valid config.json is shown unmasked

**File:** `src/planning-repo/handlers/json-config.ts:32-39`
**Issue:** For a config.json that parses, the body is rewritten from the masked object only when `maskConfig` reports `masked === true`. Otherwise `body` stays the raw file text. `JSON.parse` keeps only the last occurrence of a duplicate key. Take `{"brave_search":"SECRETSECRET1234","brave_search":true}`. It parses to `brave_search: true`, so nothing is masked and `masked` is false. The raw text, including the first string value, is then served as the body. That body feeds the file page, the raw view, the presentation payload and the search index. I reproduced this by calling `JsonConfigHandler.parse` directly: the output body still contained `SECRETSECRET1234`. The handler header claims "A config.json that holds none of those keys as strings is left exactly as read", but the raw text does hold such a string. It is only invisible to the parsed object.
Any shape where the raw text carries a secret string that the parsed object does not see has the same problem: shadowed duplicate keys, and a secret key written with a `_` escape in the key name before an override.
**Fix:** Always run the raw-text redactor over the body for config.json, whichever branch is taken, and keep the parsed-object masking for `frontmatter`.
```ts
if (basename(ref.path) === 'config.json') {
  body = redactSecretText(raw.content); // covers shadowed duplicates and unparseable text
  if (!result.warning) {
    const masked = maskConfig(result.data);
    if (masked.masked) {
      frontmatter = masked.data as Record<string, unknown>;
      body = `${JSON.stringify(masked.data, null, 2)}\n`; // already clean
    }
  }
}
```
Add a test with a duplicate-key config to `test/config-masking.test.ts`.

## Warnings

### WR-01: `redactSecretText` can be evaded on the unparseable-config path

**File:** `src/planning-repo/secret-mask.ts:62-65, 78-83`
**Issue:** The regex needs a literal double-quoted key name followed by a double-quoted string value. I confirmed three leaks on text that fails to parse:
- An escaped key name, `{"brave_search":"SECRETSECRET1234",}`, comes back unchanged. A parseable file would have been masked, because `JSON.parse` decodes the key.
- Single-quoted JSON5-style text, `{'brave_search': 'SECRETSECRET1234',}`, comes back unchanged.
- The fallback path exists precisely for hand-edited, broken files, which is where unusual quoting is most likely.

**Fix:** Allow escape sequences inside the key alternation, for example by matching `"(?:[^"\\]|\\.)*"` as the key and decoding it before comparing to `SECRET_CONFIG_KEYS`. Accept single quotes for both key and value, or fail closed. Failing closed would mean showing no raw body for an unparseable config.json that still mentions a secret key name, loosely `/brave.?search|firecrawl|exa.?search/i`. Add the two cases above to `test/secret-mask.test.ts`.

### WR-02: The no-skips guard's comment blanker hides real test code (verified)

**File:** `test/helpers/source-scan.ts:15-39` (consumed by `test/no-skips.test.ts:103-112`)
**Issue:** `blankComments` has no string or regex awareness. A `//` inside a string, such as a URL, blanks the rest of the line. A `/*` inside a string, such as the glob `'src/*.ts'`, opens a "block comment" that runs to the next `*/` anywhere later in the file. I reproduced both:
- `const u = 'http://x'; it.skip('a');` becomes `const u = 'http:` followed by spaces.
- A `'src/*.ts'` string blanks the following `it.skip('a')` line.

Over the repo's test tree, the blanker hides the header of 75 `it(`/`test(` lines in 6 files, including `test/fixture-leak.test.ts`, `test/web/pattern-map.test.ts` and `test/web/strip-markdown.test.ts`. No hidden skip exists today. The guard's skip-member, disguised-skip and absolute-budget scans (all run on blanked text) are nonetheless blind to anything after such a string. A future `it.skip` or `expect(performance.now() - t0).toBeLessThan(500)` placed there would pass the guard.
**Fix:** Make the blanker string-aware. Track `'`, `"` and backtick state, skipping escaped characters, and only treat `//` and `/*` as comments outside strings. Regex literals are a smaller remaining risk, so a conservative tokenizer is enough. Add a planted control with a URL and a glob before an `it.skip`.

### WR-03: The register growth test is diluted by a fixed 200 KB prefix and has no positive control

**File:** `test/scanner-growth.test.ts:139-161`
**Issue:** `make(rows)` prepends `'x'.repeat(200_000)` to every input. The row count is capped at 3000, so the sweep runs from 375 to 3000 rows (`startSize: 20`, `maxSize: 3000`), with `floorMs: 0`. t1 and t2 both include the same fixed scan of the long line. A quadratic-in-rows regression is therefore compressed. By rough arithmetic, a few nanoseconds per row pair puts the ratio near 25-30 instead of 64, against a limit of 24. That leaves almost no margin, and nothing proves this specific configuration can see a quadratic. The harness-level control in `growth.test.ts` uses different sizes and shapes. Other parts of this file have the same risk, but this one is the weakest.
**Fix:** Measure the rows and the long line separately: one test with no prefix and rows up to the cap, and one with a fixed row count and a growing prefix. Or add a planted-quadratic control built with the same `make`/`startSize`/`maxSize`, and assert it reads above `GROWTH_LIMIT`.

### WR-04: The 420px e2e test claims more than it checks

**File:** `test/e2e/context-brief.spec.ts:244-274, 143-148, 262`
**Issue:**
- The test title says "every bounded table/code scrolls in place", but the `boundaries` data collected in `page.evaluate` is never asserted. Only `docScrollWidth` is checked.
- "every repo fixture: View mode renders no 'More in this document' disclosure" checks a single file.
- `if (await firstIdea.count()) await firstIdea.click();` silently skips the widest-state expansion when the element is missing, which is the kind of conditional-run pattern this phase set out to remove.
- These tests (decision counts of 15 and 16, `4` out-items) pin the live repo `.planning/` served on 4199. Any new CONTEXT file or edit to those CONTEXT files breaks them without any code change.

**Fix:** Assert the boundary data, for example `scrollWidth <= clientWidth` or that each overflowing boundary has `overflow-x` auto/scroll. Rename or widen the "every repo fixture" test. Replace the conditional with `await expect(firstIdea).toHaveCount(1)` (or document that this file has no ideas). Move the pinned counts onto the Lendshed fixture on 4198.

### WR-05: `startFixtureServer` silently overwrites duplicate targets and can leak its temp folder

**File:** `test/e2e/fixture-server.ts:75-88`
**Issue:**
- `note-page.spec.ts` merges placements from three roots (`FX_ROOT`, `SYNTHETIC_ROOT`, `LB_ROOT`). Two roots with the same project-relative `to` produce no error. The later `copyFileSync` overwrites the earlier, so a spec can end up testing the wrong file with no signal.
- `tempDir` is created before `firstFreePort()` and before the copy loop finishes. If `firstFreePort()` throws, or `mkdirSync` or `copyFileSync` throws (for example a missing directory permission), the `tempDir` is never removed, because only the containment check cleans up.

**Fix:** Reject duplicate `to` values while validating, as the existing validation already throws for a missing source. Wrap everything after `mkdtempSync` in a `try`/`catch` that removes `tempDir` and rethrows. Take the free port before creating the temp folder.

### WR-06: Path handling breaks on a project path containing a space or non-ASCII character

**File:** `playwright.config.ts:44`; `test/helpers/todo-corpus.ts:9`; `test/web/pattern-map-corpus.test.ts:19`
**Issue:**
- The webServer command is `node src/server/index.ts ${fixtureRoot} --port 4198` with the path unquoted. A checkout under a path with a space splits the argument, and Playwright waits out its 90 s timeout. `test/playwright-config.test.ts` pins `command` with `toContain(FIXTURE_ROOT)`, which would need to change with any quoting.
- `LB_ROOT` and `REPO_PLANNING` use `new URL(...).pathname`, which is percent-encoded (`%20`) and not a filesystem path, whereas `fixture-root.ts` and `fixture-project.ts` correctly use `fileURLToPath`. In such a checkout the live-repo corpora read nothing or throw, while the Lendshed ones work.

**Fix:** Use `fileURLToPath(new URL('../..', import.meta.url))` everywhere (there are further `.pathname` uses, for example `test/web/summary-run-corpus.test.ts:18`). Quote the path in the webServer command, for example `JSON.stringify(fixtureRoot)`, and update the config test's `toContain`.

## Info

### IN-01: HANDOFF.json and estimation-calibration.json are deliberately left unmasked

**File:** `src/planning-repo/handlers/json-config.ts:12-13`; `test/config-masking.test.ts:126-141`
**Issue:** By decision D-09 only config.json is masked, and a test pins that a `brave_search` string in HANDOFF.json is shown in clear. A pasted key in a hand-off file would appear in the UI and the search index. Nested secret keys (for example `workflow.brave_search`) are also deliberately unmasked in config.json. This is documented, but it is a standing gap.
**Fix:** If it needs closing later, run `redactSecretText` over HANDOFF.json bodies as well. This is a decision, not a defect.

### IN-02: A planted-quadratic harness test has no explicit timeout

**File:** `test/helpers/growth.test.ts:9-24`
**Issue:** This test grows `n` until a nested loop clears 2 ms and then times a roughly 12,800-squared pass six times. It takes about 1 s alone, but it keeps the 5 s default timeout. The linkify and scanner growth tests set 60-120 s for the same reason. Under a sixteen-worker run it can time out and fail the gate. The `bestOf` test also asserts an absolute `< 2` ms. It takes the minimum, so it is safe, and it is exempt in `no-skips`.
**Fix:** Pass `{ timeout: 60_000 }` to the planted-quadratic test.

### IN-03: `vitest-gate.mjs` can crash and leave its scratch folder behind

**File:** `test/helpers/vitest-gate.mjs:33`
**Issue:** `JSON.parse(readFileSync(reportPath))` is unguarded. A truncated report (vitest killed mid-write) throws inside the `exit` handler. The process exits non-zero, so the gate still fails, which is correct. The `labelore-vitest-gate-*` temp folder is never removed, because `rmSync` comes after the parse.
**Fix:** Wrap the parse in `try`/`catch`, treat it as a gate failure, and run `rmSync` in a `finally`.

---

_Reviewed: 2026-10-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
