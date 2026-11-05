---
phase: 10-codebase-map-specification-and-check-pages
reviewed: 2026-11-06T00:00:00Z
depth: standard
files_reviewed: 56
files_reviewed_list:
  - playwright.config.ts
  - src/cli/target-path.ts
  - src/planning-repo/codebase-files.ts
  - src/planning-repo/folders.ts
  - src/planning-repo/handlers/ai-spec.ts
  - src/planning-repo/handlers/codebase-lift.ts
  - src/planning-repo/handlers/codebase.ts
  - src/planning-repo/handlers/dom-verify-body.ts
  - src/planning-repo/handlers/dom-verify.ts
  - src/planning-repo/handlers/eval-review-body.ts
  - src/planning-repo/handlers/eval-review.ts
  - src/planning-repo/handlers/fenced-sections.ts
  - src/planning-repo/handlers/index.ts
  - src/planning-repo/handlers/reviews-body.ts
  - src/planning-repo/handlers/reviews.ts
  - src/planning-repo/handlers/spec-body.ts
  - src/planning-repo/handlers/spec.ts
  - src/planning-repo/handlers/user-setup-body.ts
  - src/planning-repo/handlers/user-setup.ts
  - src/planning-repo/handlers/withhold-values.ts
  - src/presentation/codebase-map.ts
  - src/presentation/project-map-state.ts
  - src/server/project-api.ts
  - src/web/components/app-shell.tsx
  - src/web/components/clean-tree.tsx
  - src/web/components/copy-command.tsx
  - src/web/components/status-meter.tsx
  - src/web/components/value-not-shown.tsx
  - src/web/pages/artifact-page.tsx
  - src/web/pages/research-atoms.tsx
  - src/web/route-dispatch.ts
  - src/web/styles/globals.css
  - src/web/views/ai-spec-page-components.tsx
  - src/web/views/ai-spec-page.ts
  - src/web/views/codebase-components.tsx
  - src/web/views/codebase-page.ts
  - src/web/views/dom-verify-page-components.tsx
  - src/web/views/dom-verify-page.ts
  - src/web/views/eval-review-page-components.tsx
  - src/web/views/eval-review-page.ts
  - src/web/views/kinds.ts
  - src/web/views/manifest.ts
  - src/web/views/manifests.ts
  - src/web/views/reviews-overlap.ts
  - src/web/views/reviews-page-components.tsx
  - src/web/views/reviews-page.ts
  - src/web/views/spec-page-components.tsx
  - src/web/views/spec-page.ts
  - src/web/views/user-setup-page-components.tsx
  - src/web/views/user-setup-page.ts
  - src/web/views/withheld-document-note.tsx
  - test/e2e/deep-reload.spec.ts
  - test/e2e/fixture-root.ts
  - test/e2e/mapped-not-started.spec.ts
  - test/e2e/pages.ts
  - test/e2e/phase-10-screenshots.spec.ts
  - test/helpers/fixture-roots.ts
  - test/helpers/made-up-examples.ts
  - test/helpers/shoot-pages.ts
findings:
  critical: 2
  warning: 5
  info: 3
  total: 10
status: issues_found
---

# Phase 10: Code Review Report

**Reviewed:** 2026-11-06
**Depth:** standard
**Files Reviewed:** 56
**Status:** issues_found

## Summary

The Phase 10 extractors are, on the whole, well bounded: body caps, section caps, a shared fence-aware scanner, no regular expression built from or run over document text (the only regexes are two fixed single-character-class patterns in `codebase-lift.ts`), and every handler wraps its extractor so a throw only omits `structured`. Sanitisation order, route redirects (`/codebase`, map-only dashboard) and the `projectMapState` derivation looked correct, and I found no raw-HTML sinks or href built from document text in the new view components.

The weak point is the one invariant the phase cares most about: variable VALUES must never reach View mode. Two independent paths leak values that I reproduced by running the code (CR-01 in the User setup projection, CR-02 in the Integrations lift). The mask is also leaky in a few documented-by-omission ways (WR-01). The remaining findings are parser correctness (severity words, nested numbered lists), an SVG layout that silently clips marks, and invisible characters surviving the copy-command cleaner.

Known and accepted (not re-raised): Source mode, the `/documents` `body` field and `/search` snippets show the file as written (T-10-34), and INTEGRATIONS prose outside lifted rows renders through the sanitised document HTML.

## Critical Issues

### CR-01: USER-SETUP `- NAME: value` field lines are stored unmasked and rendered in View

**File:** `src/planning-repo/handlers/user-setup-body.ts:209-219` (also `:247-251`, consumed at `src/web/views/user-setup-page.ts:302` via `readFields`)
**Issue:** `readFieldLine` splits an indented `- Key: value` line at the first colon and masks the key and the text separately: `keep(rest.slice(0, colon))` and `keep(rest.slice(colon + 1))`. `maskValues` only recognises `NAME: value` when the name and the value are in the same string, so a line such as `  - STRIPE_KEY: sk_live_abc123` becomes `{ key: "STRIPE_KEY", text: "sk_live_abc123" }` with the value intact. Reproduced:

```
fields: [{ "key": "STRIPE_KEY", "text": "sk_live_abc123" }, { "key": "Value", "text": "sk_live_qqq" }]
section line (same input, masked correctly): "  - STRIPE_KEY: [Value not shown]"
```

The page composer reads `step.fields` and draws them, so this is a View-mode leak of exactly the thing T-10-33 / CONTEXT D-11 forbid. It is also an inconsistency inside one function: the same line is masked correctly in `sections[].lines` but not in `fields`. `notes` are pushed from the same unmasked `field.text`.
**Fix:** Mask the whole line, then split, so the name and value are seen together; and drop the value when the key is itself an upper-snake name:
```ts
function readFieldLine(line: string): UserSetupField | null {
  // ... same indentation / "- " checks ...
  const rest = line.slice(at + 2);
  const colon = rest.indexOf(':');
  if (colon <= 0) return null;
  const masked = keep(rest);                    // mask over the joined text
  const maskedColon = masked.indexOf(':');
  return { key: masked.slice(0, maskedColon).trim(), text: masked.slice(maskedColon + 1).trim() };
}
```
Better: if `withholdValue(rest)` returns a name with `hadValue`, return `{ key: name, text: VALUE_NOT_SHOWN_MARK }`. Add a test that plants `- SECRET_KEY: PLANTED-VALUE` under a checklist item and asserts the value is absent from `JSON.stringify(structured)`.

### CR-02: `withholdInText` (used for every Integrations line) leaves values in several common written forms

**File:** `src/planning-repo/handlers/withhold-values.ts:114-168`, called from `src/planning-repo/handlers/codebase-lift.ts:1248-1251` (`cleanText`)
**Issue:** `cleanText` is the only scrub applied to `group.firstLine`, `group.lines`, `row.use`, `row.sdk`, and the Environment `lines` that the Codebase page shows in View. `withholdInText` only strips a value when the name is preceded by a space, `(`, `,` or tab, only for `NAME=value` with no spaces around `=`, and only for a leading `NAME: value`. Reproduced (input => output, all with a planted `sk_live_abc`):

```
Set "STRIPE_KEY=sk_live_abc" in env      => unchanged (hadValue false)
**STRIPE_KEY=sk_live_abc**               => unchanged
run;STRIPE_KEY=sk_live_abc               => unchanged
x [STRIPE_KEY=sk_live_abc]               => unchanged
STRIPE_KEY = sk_live_abc                 => unchanged
`STRIPE_KEY` = sk_live_abc               => unchanged
Auth: STRIPE_KEY: sk_live_abc            => unchanged
| STRIPE_KEY | sk_live_abc |             => unchanged
STRIPE_KEY='sk live'                     => "STRIPE_KEY live'"   (value remainder leaks)
STRIPE_KEY="a b c"                       => "STRIPE_KEY b c\""   (value remainder leaks)
```

The comment at the top of the file says the scan covers "every value beside a variable name"; the Integrations lift is documented as "no value is stored". `maskValues` (10-19) already handles most of these (quotes, spaced `=`, `:`, boundary = any non-name character), but `cleanText` does not use it. The two scanners disagree about what an assignment is, and the weaker one guards the map page.
**Fix:** Make `cleanText` call `maskValues` (after or instead of `withholdInText`), and keep `withholdInText`/`withholdValue` only for the "was a value present" flag:
```ts
function cleanText(text: string): string {
  const scrubbed = maskValues(withholdInText(text).text);
  return scrubbed.length > INTEGRATION_TEXT_CAP ? scrubbed.slice(0, INTEGRATION_TEXT_CAP) : scrubbed;
}
```
Also fix the quoted-value path in `withholdInText` (`valueEnd` stops at the first space inside quotes), or retire it. Add tests with the forms above, plus a table row, in an INTEGRATIONS fixture.

## Warnings

### WR-01: `maskValues` / User setup sections leave values in table cells, multi-word values and bracketed values

**File:** `src/planning-repo/handlers/withhold-values.ts:235-248, 217-233`; `src/planning-repo/handlers/user-setup-body.ts:311-325`
**Issue:** Reproduced:
- `| Variable | Value |` / `| STRIPE_KEY | sk_live_cell |` is returned unchanged in `sections[].lines` (the "no steps recognised" plain layout). A value in a separate cell has no `=` or `:` for the mask to see. `readVariableTable` only matches a header cell that is exactly `variable`, so `Variable name`, `Name` or `Env var` tables never reach `withholdValue` either.
- A value ends at the first space, so `NAME: pass phrase here` masks only `pass`; `TOKEN="abc"def` leaves `def`; an unterminated quote masks to the end but `A_B=\"x y\"` leaks ` y\"`.
- `PASSWORD=<hunter2>` and `API_KEY=[sk-live-1]` are kept as "placeholders" because any bracketed span up to 80 characters followed by punctuation counts.
**Fix:** In `readSections`, treat table rows as cells: when a section line is a table row and any cell is an upper-snake name, mask the neighbouring cells (or the row). Restrict `placeholderEnd` to spans that look like prose (contain a space, or are all lower-case words) rather than any bracketed run. For multi-word values consider masking the whole remainder of the line after `NAME:` when the name is upper-snake and the next character is not `/` or `:`.

### WR-02: `readSeverity` in non-strict mode reads ordinary words as severity ("High availability ...", "Medium-sized ...")

**File:** `src/planning-repo/handlers/reviews-body.ts:279-308`, called at `:440`
**Issue:** Inside a `Concerns` list the item is read with `strict = (item === null)`, so a list item gets the non-strict read. `- High availability is not handled` gives `{ severity: 'HIGH', text: 'availability is not handled' }`, `- Low test coverage on the exporter` gives `LOW` / `test coverage on the exporter`, and `- Medium-sized refactor needed` gives `MEDIUM` / `-sized refactor needed`. Reproduced by running `extractReviews`. The word is dropped from the concern text, the severity is invented, and `deriveAgreement` then normalises the mangled text (rule 1 keys on the opening words), so it can also create or miss agreements.
**Fix:** Require a separator in both modes (colon, spaced dash, or bold/backtick marks around the word), and use the lenient mode only for a bare word that was wrapped in marks:
```ts
if (strict && !separated) continue;       // currently only strict
// non-strict: accept only if the word was inside marks (open > 0) or is followed by a separator
if (!separated && open === 0) continue;
```

### WR-03: SPEC requirement reader turns a nested numbered list into extra requirements

**File:** `src/planning-repo/handlers/spec-body.ts:232-263, 328-340`
**Issue:** `readRequirementHead` accepts any `N. text` line indented up to 3 spaces. A requirement whose Acceptance bullet is followed by a three-space nested numbered list produces new requirements with duplicate numbers. Reproduced: input requirements 1 and 2 (with two nested items) yields `[1 Export, 1 "CSV opens in Excel", 2 "Headers match", 2 Audit]`. The Spec page then shows wrong counts and `key={`${n}-${index}`}` papers over the duplicate numbers.
**Fix:** Only treat a numbered line as a head when it is at column 0 (or at the indent of the first head seen), and treat deeper numbered lines as continuation/extras:
```ts
if (head !== null && indent <= firstHeadIndent) { ...new requirement... }
```

### WR-04: Overlap drawing clips marks when a region holds more than a few concerns, and drops absent lanes past three

**File:** `src/web/views/reviews-overlap.ts:156-183`, `src/web/views/reviews-page-components.tsx:161-199`
**Issue:** Squares are laid out three to a row and the stack is centred on the region anchor with no limit, in a fixed 600x480 box. With the three-circle layout the single-reviewer anchor for circle 3 is `(300,385)`; more than about 9 singles (4 rows x 35px) push rows below y=480 and the SVG clips them, with no indication. `REVIEWS_CONCERN_CAP` allows 300 per reviewer. The squares are also the click targets that select a concern, so clipped concerns are only reachable from the list. Separately, `layoutOverlap` caps `absent` at 3 while `Drawing` computes `absent` from all non-ok reviewers, so a fourth failed lane vanishes silently.
**Fix:** Pass a per-region capacity (rows that fit before the box edge); when exceeded, shrink `small`/`gap` or draw a `+N` counter square and keep the rest in the list. Surface the dropped lanes ("and 2 more lanes did not run") in the caption.

### WR-05: `stripControlCharacters` leaves invisible characters, so "what is copied is what is on screen" is not guaranteed

**File:** `src/planning-repo/handlers/withhold-values.ts:179-191`, used by `src/planning-repo/handlers/codebase-lift.ts:1647-1656`
**Issue:** The copied-command cleaner removes C0/C1 and bidi controls only. Zero-width space/joiners (U+200B-U+200D), U+2060, U+FEFF, soft hyphen (U+00AD) and the Unicode tag block (U+E0000-E007F, used for hidden-text smuggling) all pass through. Reproduced: `npm\u200B test\u2060 \u{E0041}x\u00AD` is returned unchanged. A command with an invisible character inside a word is displayed identically but differs when pasted into a terminal. T-10-26 and the `CopyCommand` doc comment promise the visible text is what is copied.
**Fix:** Also drop Unicode format characters (`\p{Cf}`), which covers all of the above, in addition to the control and bidi ranges:
```ts
const FORMAT = /\p{Cf}/u;     // fixed pattern, no document text
if (code < 0x20 || (code >= 0x7f && code <= 0x9f) || FORMAT.test(ch)) continue;
```

## Info

### IN-01: Testing run-command lift treats console output and `\` continuation lines as commands

**File:** `src/planning-repo/handlers/codebase-lift.ts:1637-1660`
**Issue:** `SHELL_INFOS` includes `console` and `text`, and every non-comment, non-blank line of such a fence becomes a "command" with a Copy button. A `console` fence that shows `$ npm test` followed by `PASS 12 tests` yields two commands. A multi-line command written with trailing `\` becomes separate rows, the first ending in a dangling backslash, which hangs the terminal when pasted.
**Fix:** In `console`/`text` fences keep only `$ `-prefixed lines; join lines that end in `\` before pushing.

### IN-02: AI spec strip and section ids collide when two sections share a number

**File:** `src/web/views/ai-spec-page-components.tsx:124`, `src/web/views/ai-spec-page.ts:143-144, 359-363`
**Issue:** `key={item.number}` and `sectionDomId(number)` assume one section per number. `extractAiSpec` keeps every `## N.` heading, so a file with a repeated number (a copy-pasted section, or two `## 1.` headings) gives duplicate React keys (warning, possible state mix-up) and duplicate DOM ids (the strip jumps to the first).
**Fix:** Key and id on the section's position (`${index}-${number}`) or dedupe in the composer.

### IN-03: `nestedBullet` caps with the wrong bound

**File:** `src/planning-repo/handlers/codebase-lift.ts:1228`
**Issue:** `line.slice(i + 2, LINE_CAP)` slices to absolute index `LINE_CAP`, not to `i + 2 + LINE_CAP`. With deep indentation (`i + 2 >= LINE_CAP`) the result is empty, and in general a nested bullet is capped shorter than a top-level one (`topBullet` slices `2..LINE_CAP`, the same pattern but with no indent to subtract). Harmless for ordinary files, but inconsistent.
**Fix:** `line.slice(i + 2, i + 2 + LINE_CAP).trim()` (and apply the same to `topBullet` for clarity).

---

_Reviewed: 2026-11-06_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
