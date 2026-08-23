---
phase: 01-read-layer-domain-model
reviewed: 2026-08-24T01:10:00Z
depth: standard
files_reviewed: 45
files_reviewed_list:
  - src/cli/snapshot.ts
  - src/cli/target-path.ts
  - src/domain/model.ts
  - src/planning-fs/in-memory-fs.ts
  - src/planning-fs/local-fs.ts
  - src/planning-fs/types.ts
  - src/planning-repo/assemble.ts
  - src/planning-repo/crossref.ts
  - src/planning-repo/discovery.ts
  - src/planning-repo/frontmatter.ts
  - src/planning-repo/handlers/artifact-token.ts
  - src/planning-repo/handlers/context.ts
  - src/planning-repo/handlers/frontmatter-only.ts
  - src/planning-repo/handlers/generic.ts
  - src/planning-repo/handlers/index.ts
  - src/planning-repo/handlers/json-config.ts
  - src/planning-repo/handlers/markdown-sections.ts
  - src/planning-repo/handlers/plan.ts
  - src/planning-repo/handlers/project.ts
  - src/planning-repo/handlers/requirements.ts
  - src/planning-repo/handlers/roadmap.ts
  - src/planning-repo/handlers/state.ts
  - src/planning-repo/handlers/summary.ts
  - src/planning-repo/handlers/title.ts
  - src/planning-repo/handlers/windows.ts
  - src/planning-repo/mentions.ts
  - src/planning-repo/naming.ts
  - src/planning-repo/registry.ts
  - src/planning-repo/serialize.ts
  - src/planning-repo/snapshot.ts
  - src/planning-repo/types.ts
  - src/planning-repo/warnings.ts
  - test/assemble.test.ts
  - test/crossref.test.ts
  - test/degradation.test.ts
  - test/discovery.test.ts
  - test/fs-equivalence.test.ts
  - test/handlers.test.ts
  - test/mentions.test.ts
  - test/naming.test.ts
  - test/snapshot.golden.test.ts
  - test/target-path.test.ts
  - eslint.config.js
  - package.json
  - tsconfig.json
  - vitest.config.ts
findings:
  critical: 1
  warning: 4
  info: 2
  total: 7
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-08-24T01:10:00Z
**Depth:** standard
**Files Reviewed:** 45
**Status:** issues_found

## Summary

Reviewed the full read layer / domain model implementation: the filesystem seam (`planning-fs/`),
discovery, the handler registry and every typed handler, frontmatter/JSON guarding, cross-reference
resolution, mention scanning, cycle-safe serialization, and the CLI entry point, plus their test
coverage and project config. The architecture is careful and the documented invariants (D-05
through D-16, DATA-01/02/04) are largely honored and exercised by real tests — the symlink-escape
containment, prototype-pollution stripping, and per-file degradation isolation are all genuinely
proven, not just asserted.

One finding is a genuine BLOCKER: `resolveCrossReferences()` (`src/planning-repo/crossref.ts`)
crashes the *entire* `PlanningRepository.load()`/`refresh()` call — not just one artifact — when any
single `PLAN.md`'s `depends_on` frontmatter value is present but not an array (a plausible authoring
typo, e.g. a bare string instead of a YAML list). This was reproduced directly against
`PlanningRepository.load()` and violates the project's own explicitly documented "load()/refresh()
never throw" contract (D-12) and per-file isolation goal (D-11) for the whole snapshot, not one
artifact.

Three further WARNING-level issues were reproduced by exercising the handlers directly: an interior
markdown heading inside a ROADMAP.md phase block silently truncates that phase's parsed Requirements/
Success Criteria/Plans with no warning; a malformed fenced JSON block in WINDOWS.md silently
discards its parse-failure warning while falling back to the table; and `normalizeForGolden`'s
absolute-path-to-relative rewrite is applied to every string value in the snapshot, including
verbatim artifact `body` text, which can silently mutate prose that happens to contain the project's
own absolute root path as a substring. A packaging issue (`gray-matter` filed under `devDependencies`
despite being a genuine runtime import) rounds out the WARNING list. Two INFO-level code-quality
items (duplicated title-derivation logic, no `engines` field) are included for completeness.

## Critical Issues

### CR-01: Non-array `depends_on` frontmatter crashes the entire snapshot load, violating the "never throw" contract

**File:** `src/planning-repo/crossref.ts:102`
**Issue:** `resolveCrossReferences()` computes each plan's `dependsOnRefs` with:

```ts
const dependsOnRaw = ((plan.frontmatter.depends_on as unknown[] | undefined) ?? []).map((v) => String(v));
```

`plan.frontmatter.depends_on` is lifted from raw, unvalidated YAML frontmatter by `PlanHandler`
(`src/planning-repo/handlers/plan.ts`) with no schema check. The `as unknown[]` cast is purely a
compile-time assertion — at runtime, any non-array, non-nullish value (a bare string, a number, or a
mapping — all plausible authoring mistakes, e.g. `depends_on: 01-01` instead of `depends_on: ["01-01"]`)
passes the `?? []` guard unchanged (nullish coalescing only substitutes for `null`/`undefined`) and
then `.map` is called on it, throwing a `TypeError`.

`resolveCrossReferences()` is called unconditionally at the end of `assembleDomainModel()`
(`src/planning-repo/assemble.ts:315`), which itself is called unconditionally inside
`PlanningRepository.refresh()` (`src/planning-repo/snapshot.ts:76`) with no surrounding try/catch.
The result: a single malformed `depends_on` field in **any one** `PLAN.md` anywhere in the tree
crashes the *entire* project snapshot — not just that one artifact's warnings, the whole
`load()`/`refresh()` call throws.

This was confirmed by direct reproduction against `PlanningRepository.load()`:

```
input: '.planning/phases/01-x/01-01-PLAN.md':
  '---\nphase: 01\nplan: 01\ndepends_on: "01-99"\n---\n\nbody\n'

PlanningRepository.load() -> throws:
  "(plan.frontmatter.depends_on ?? []).map is not a function"
```

This directly violates D-12 ("`load()`/`refresh()` never throw — a failed target check
short-circuits to a snapshot carrying the failing LoadStatus") and the project's core design promise
that unfamiliar/malformed artifact content degrades to a warning rather than taking anything down.
Every other raw-frontmatter-derived collection in `assemble.ts`/`crossref.ts` is either
handler-computed (guaranteed array shape) or used only as a scalar (no method call that can throw);
this is the one unguarded `.map()` over raw, unvalidated frontmatter data in the codebase.

**Fix:** Validate the shape before mapping, and treat anything malformed as "no dependencies" (optionally
routing it through the warning channel at `assembly` stage, consistent with D-11's four-stage taxonomy):

```ts
const rawDependsOn = plan.frontmatter.depends_on;
const dependsOnRaw = Array.isArray(rawDependsOn) ? rawDependsOn.map((v) => String(v)) : [];
```

## Warnings

### WR-01: An interior markdown heading inside a ROADMAP.md phase block silently truncates that phase's parsed fields

**File:** `src/planning-repo/handlers/roadmap.ts:55-76` (`extractRawPhaseBlocks`)
**Issue:** The phase-block scanner treats *any* heading of level 2–6 as a block boundary, not just
another `Phase N:` heading:

```ts
for (const line of text.split('\n')) {
  const headingMatch = line.match(/^#{2,6}\s+(.*)$/);
  if (headingMatch) {
    const phaseMatch = headingMatch[1].match(/^(?:[^\w]*\s*)?Phase\s+([\w.]+):\s*(.+)$/i);
    if (current) {
      blocks.push({ number: current.number, name: current.name, body: current.lines.join('\n') });
      current = null;
    }
    if (phaseMatch) {
      current = { number: phaseMatch[1], name: phaseMatch[2].trim(), lines: [] };
    }
    continue;
  }
  if (current) current.lines.push(line);
}
```

If a hand-authored phase entry contains any non-`Phase N:` heading (e.g. an ad hoc `#### Notes`
subsection), the current block is closed at that point and never reopened until the *next* `Phase N:`
heading — every line between the interior heading and the next real phase heading (which can include
`**Requirements**:`, `**Success Criteria**:`, and the `Plans:` checklist) is silently dropped from
that phase's body and never parsed. No warning is produced.

Reproduced directly against `RoadmapHandler.parse()`: a phase block containing goal text, then an
interior `#### Notes` heading, then `**Requirements**`, `**Success Criteria**`, and a `Plans:`
checklist, yields a parsed phase with `goal: "Ship it"` but `requirementIds: []`,
`successCriteria: []`, `plans: []`, `roadmapComplete: null` — despite all three being present in the
source text.

**Fix:** Only treat a heading as a block boundary when it matches the `Phase N:` pattern (or track
depth/level more precisely — e.g. only reset on a heading at or above the level that started the
current phase). Minimal fix:

```ts
if (headingMatch) {
  const phaseMatch = headingMatch[1].match(/^(?:[^\w]*\s*)?Phase\s+([\w.]+):\s*(.+)$/i);
  if (phaseMatch) {
    if (current) blocks.push({ number: current.number, name: current.name, body: current.lines.join('\n') });
    current = { number: phaseMatch[1], name: phaseMatch[2].trim(), lines: [] };
  } else if (current) {
    current.lines.push(line); // non-phase heading is content of the current phase, not a boundary
  }
  continue;
}
```

### WR-02: WINDOWS.md's fenced-JSON parse failure silently drops its warning

**File:** `src/planning-repo/handlers/windows.ts:11-16` (`extractFencedJson`)
**Issue:**

```ts
function extractFencedJson(body: string): unknown[] | null {
  const m = body.match(/```json\s*([\s\S]*?)```/);
  if (!m) return null;
  const parsed = tryParseJson(m[1]);
  return Array.isArray(parsed.data) ? (parsed.data as unknown[]) : null;
}
```

`tryParseJson` (`src/planning-repo/frontmatter.ts`) already returns a `warning` on malformed JSON
per D-11's guarded-parse contract, but `extractFencedJson` only reads `parsed.data` and discards
`parsed.warning` entirely. The caller (`WindowsHandler.parse`) then falls back to
`parseMarkdownTable(fm.body)` with no indication anywhere that the authoritative fenced-JSON block
(documented in this file's own header comment as "the authoritative-shaped source") failed to parse.

Reproduced directly: a WINDOWS.md with a trailing-comma-broken fenced JSON block and an otherwise
valid table parses with `result.warning === undefined` and `rowSource: "table"` — the corruption is
invisible to both the artifact's own warnings and the flat `snapshot.warnings` list, contradicting
D-11's "every failure produces a warning" invariant that every other handler in this codebase
observes.

**Fix:** Surface the warning instead of silently discarding it:

```ts
parse(raw: RawArtifact, ref: ArtifactRef) {
  const fm = tryParseFrontmatter(raw.content);
  const title = deriveTitle(fm.data, fm.body, ref.path);
  const m = fm.body.match(/```json\s*([\s\S]*?)```/);
  const jsonResult = m ? tryParseJson(m[1]) : null;
  const fencedRows = jsonResult && Array.isArray(jsonResult.data) ? jsonResult.data : null;
  const rows = fencedRows ?? parseMarkdownTable(fm.body);
  return {
    title,
    frontmatter: fm.data,
    body: fm.body,
    warning: fm.warning ?? jsonResult?.warning,
    structured: { rows, rowSource: fencedRows ? 'json' : 'table' },
  };
},
```

### WR-03: `normalizeForGolden`'s absolute-path rewrite applies to every string value, including verbatim `body` text

**File:** `src/planning-repo/serialize.ts:58-61`
**Issue:**

```ts
JSON.stringify(cycleFree, (key, value) => {
  if (typeof value === 'string' && value.startsWith(rootPath)) {
    const rel = relative(rootPath, value);
    return rel === '' ? '.' : rel;
  }
  ...
```

This replacer is not scoped to path-shaped fields (`rootPath`, `pathChecked`, artifact `path`/`id`)
— it runs against *every* string value in the serialized tree, `key` is ignored entirely. Any string
field whose value happens to start with the project's absolute root path — most plausibly
`Artifact.body`, which the project's own design explicitly promises to keep verbatim ("Structured
extraction only — never a replacement for rendering the raw body", `markdown-sections.ts:3`) — gets
silently rewritten into a relative path fragment instead of being left as-authored. A research doc or
CONTEXT.md that quotes its own project's absolute filesystem path in prose (a realistic case for a
tool whose own `.planning/` this project reviews itself) would have that quoted path silently mutated
in the rendered body.

**Fix:** Scope the rewrite to known path-bearing keys instead of matching by value shape alone:

```ts
const PATH_KEYS = new Set(['rootPath', 'pathChecked', 'path', 'id', 'dirPath', 'artifactPath']);
...
if (options stable-independent rewrite) {
  if (PATH_KEYS.has(key) && typeof value === 'string' && value.startsWith(rootPath)) { ... }
}
```
(Adjust the key set to the actual path-bearing fields; the essential fix is keying off `key`, not
matching every string by its prefix.)

### WR-04: `gray-matter` is a runtime dependency but is declared in `devDependencies`

**File:** `package.json:14-24`
**Issue:** `src/planning-repo/frontmatter.ts` imports `gray-matter` and is exercised by the CLI entry
point (`src/cli/snapshot.ts`) at runtime, not just by tests — yet `gray-matter` is listed only under
`devDependencies`, alongside genuinely dev-only tools (`vitest`, `eslint`, `prettier`,
`typescript-eslint`). Every other package in `devDependencies` is dev/build/test tooling only. An
install performed with `npm ci --omit=dev` or `npm install --production` (a common step in
containerized or CI deployment of a Node CLI/server) would omit `gray-matter` and break the tool at
runtime with `Cannot find module 'gray-matter'`, despite `npm test`/`npm run typecheck` passing in
the dev environment where all dependencies are present.

**Fix:** Move `gray-matter` to a `dependencies` block:

```json
"dependencies": {
  "gray-matter": "4.0.3"
},
"devDependencies": {
  "typescript": "5.9.3",
  ...
}
```

## Info

### IN-01: Duplicated title-derivation logic between `generic.ts` and `title.ts`

**File:** `src/planning-repo/handlers/generic.ts:6-10`
**Issue:** `GenericMarkdownHandler` reimplements its own local `deriveTitle(content, path)` helper
with the identical `/^#\s+(.+)$/m` heading-match logic that `src/planning-repo/handlers/title.ts`
already exports as `deriveTitleFromHeading`. Every other typed handler in the registry
(`plan.ts`, `context.ts`, `roadmap.ts`, `state.ts`, etc.) imports and reuses `title.ts`'s shared
`deriveTitle`; `generic.ts` is the one handler that diverges with its own copy, risking drift if the
heading-match rule is ever changed in `title.ts` but not mirrored here.
**Fix:** Import and reuse `deriveTitleFromHeading`/`deriveTitle` from `./title.ts` instead of the
local reimplementation.

### IN-02: No `engines` field pinning the required Node version

**File:** `package.json`
**Issue:** `npm run snapshot` invokes `node src/cli/snapshot.ts` directly, relying on Node's native
TypeScript-stripping support (stable only on sufficiently recent Node 22.x/23.x builds) with no
`tsx`/`ts-node` fallback declared and no `"engines"` field in `package.json` to document or enforce
the minimum Node version this depends on. The project's own tech-stack research explicitly assumes
"Node ≥22"; that assumption isn't encoded anywhere a package manager or CI check would enforce it.
**Fix:** Add `"engines": { "node": ">=22.6.0" }` (or the actual minimum verified version) to
`package.json`.

---

_Reviewed: 2026-08-24T01:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
