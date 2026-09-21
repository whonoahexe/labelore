---
phase: 05-per-type-document-views
reviewed: 2026-09-20T20:41:45Z
depth: standard
files_reviewed: 33
files_reviewed_list:
  - .claude/CLAUDE.md
  - docs/design-language.md
  - src/domain/model.ts
  - src/planning-repo/handlers/context.ts
  - src/planning-repo/handlers/generic.ts
  - src/planning-repo/handlers/section-projection.ts
  - src/planning-repo/mentions.ts
  - src/presentation/references.ts
  - src/rendering/frontmatter-views.ts
  - src/rendering/linkify.ts
  - src/web/components/document-outline.tsx
  - src/web/components/document-view-toggle.tsx
  - src/web/components/metadata-panel.tsx
  - src/web/components/use-active-section.ts
  - src/web/pages/artifact-page.tsx
  - src/web/styles/globals.css
  - src/web/views/active-section.ts
  - src/web/views/blocks.tsx
  - src/web/views/document-sections.ts
  - src/web/views/facts.ts
  - src/web/views/fallback.ts
  - src/web/views/kinds.ts
  - src/web/views/manifests.ts
  - src/web/views/manifest.ts
  - src/web/views/plan-task-index.ts
  - test/__golden__/dense.json
  - test/__golden__/sparse-started.json
  - test/handlers.test.ts
  - test/mentions.test.ts
  - test/rendering/references.test.ts
  - test/section-projection.test.ts
  - test/web/active-section.test.ts
  - test/web/class-vocabulary.test.ts
  - test/web/degradation-ui-contract.test.ts
  - test/web/document-sections.test.ts
  - test/web/facts.test.ts
  - test/web/fallback.test.ts
  - test/web/outline-contract.test.ts
  - test/web/plan-task-index.test.ts
  - test/web/view-compose.test.ts
  - test/web/view-page-contract.test.ts
  - test/web/view-registry.test.ts
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase 05: Code Review Report

**Reviewed:** 2026-09-20T20:41:45Z
**Depth:** standard
**Files Reviewed:** 33 (`.md` docs and `.tsx`/`.ts` source counted; the two `test/__golden__/*.json` fixtures and `.claude/CLAUDE.md` were read as context, not as review targets)
**Status:** issues_found

## Summary

Reviewed the Phase 5 "Per-Type Document Views" diff: the client-side view registry
(`src/web/views/*`), the new `context`/`generic` handler changes and section-projection
extractors, the whole-corpus decision/warning mention scanner (`mentions.ts`), the
phase-scoped/corpus-wide reference-resolution registry (`presentation/references.ts`),
`linkify.ts`'s rehype text-transform, the scroll-tracking document outline and its
`IntersectionObserver` hook, and the class-vocabulary allowlist test plus its backing
`docs/design-language.md` table. I traced the pure functions (`pickActiveEntry`,
`collectRawMatches`, `groupDocumentSections`, `composeView`, `selectPlanIndexRows`,
`selectFacts`, `firstSentence`, `addResolution`'s ambiguity-collapse) against their callers
and against the naming grammar upstream (`naming.ts`) rather than trusting the inline
documentation comments at face value, and ran the full test suite for the reviewed area
(15 files, 316 tests, all passing) as a sanity check only — not as proof of correctness.

The implementation is careful and its own commentary is largely accurate (the D-14
scheme-precedence ordering, the D-15 offset-preserving code-stripping, the D-02
remainder/consumption bookkeeping in `composeView`, and the ambiguity-collapse in
`addResolution` all hold up under adversarial tracing). One real, reproducible defect
was found in the VIEW-06 structural-fallback lead-copy substitution, plus two minor
code-quality/documentation issues. No security, data-loss, or crash-class defects were
found in the reviewed files.

## Warnings

### WR-01: Fallback manifest's `{kind}` substitution is vulnerable to `String.replace` special-pattern corruption

**File:** `src/web/views/fallback.ts:56`
**Issue:** `fallbackManifest` builds the VIEW-06 lead copy with:

```ts
lead: kind === 'unknown' ? CASE_A_NOTICE : CASE_B_NOTICE.replace('{kind}', kind),
```

`String.prototype.replace(searchString, replacementString)` treats the **second** argument
specially even when the first argument is a plain string, not a `RegExp`: `$$`, `$&`,
`` $` ``, and `$'` in the replacement are all live substitution patterns. If `kind` ever
contains one of those sequences, the rendered lead sentence is silently corrupted instead
of containing the literal kind text. Reproduced directly:

```
$ node -e "
const CASE_B_NOTICE = \"...for {kind} documents...\";
console.log(CASE_B_NOTICE.replace('{kind}', 'a\$&b'));
"
# => "...for a{kind}b documents..." — not "...for a$&b documents..."
```

This is reachable with real, non-malicious input: `deriveKind()` in
`src/planning-repo/discovery.ts:61-63` derives `kind` from
`parseMilestoneFileName(fileName).document.toLowerCase()` for any `vX.Y-*.md` file, and
`MILESTONE_FILE_RE` in `src/planning-repo/naming.ts:163` captures that `document` segment
with an **unconstrained** `(.+)` — unlike the sibling phase-artifact-token grammar
(`PHASE_ARTIFACT_RE`'s `[A-Z][A-Z-]*`), which is restricted to letters and hyphens. An
oddly-named file sitting in `.planning/milestones/vX.Y-phases/` (a plausible occurrence
given this tool's own stated goal of degrading, not breaking, on files GSD didn't
generate) can therefore carry a `kind` string containing `$`, and the VIEW-06 fallback
lead for that artifact will render garbled text. (The parallel `unrecognizedNotice()` in
the same file is unaffected — it interpolates `kind` via `.split('{kind}')` and a plain
JSX text child, which has no such special-pattern behavior.)

**Fix:** Use a replacer function, which receives `kind` as an opaque value with no
special-pattern interpretation, or avoid `replace` entirely:

```ts
lead: kind === 'unknown' ? CASE_A_NOTICE : CASE_B_NOTICE.replace('{kind}', () => kind),
```

## Info

### IN-01: Misleading tag-count in `stripContextTagLines` doc comment

**File:** `src/planning-repo/handlers/context.ts:20-21`
**Issue:** The comment reads: *"The six tag names with no underscore (`domain`,
`decisions`, `specifics`, `deferred`) are valid CommonMark HTML tag names..."* — but only
four names are listed, and only four of the six `CONTEXT_TAGS` entries lack an underscore
(`canonical_refs` and `code_context` both contain one, and CommonMark's HTML-block-type-7
tag-name grammar doesn't accept underscores, so those two are not actually susceptible to
the swallowing bug this comment explains). The code itself is unaffected — `stripContextTagLines`
still strips all six tags' lines unconditionally, a safe superset — so this is a
documentation-only inaccuracy, not a functional defect.
**Fix:** Reword to "four of the six tag names" (or enumerate the two that don't qualify)
so the comment doesn't contradict its own parenthetical list.

### IN-02: Redundant duplicate computation of `outlineHeadings(shown)`

**File:** `src/web/pages/artifact-page.tsx:320-334`
**Issue:** `ArtifactReader` computes `outlineHeadings(shown)` twice per render — once inside
the `entries` `useMemo` (line 322) and again inline for the `data-outline` attribute (line
333). Both calls are over the same `shown` value and always agree, so this isn't a
correctness bug, but it's an unnecessary duplicate call to a non-trivial function (filters,
slices, and re-checks a `< 2` cutoff) that a future edit could accidentally desync (e.g. if
someone changes the memoized `entries` computation without noticing the sibling literal
call still needs to match).
**Fix:** Derive `data-outline` from `entries.length > 0` (the already-memoized value)
instead of recomputing `outlineHeadings(shown)` a second time.

---

_Reviewed: 2026-09-20T20:41:45Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
