# Phase 5: Per-Type Document Views - Pattern Map

**Mapped:** 2026-09-20
**Files analyzed:** 17 (new + modified)
**Analogs found:** 17 / 17

All analog paths below were verified with `git ls-files` — every one is tracked source, none are
gitignored mirrors.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/rendering/section-projection.ts` (NEW) | utility (extractor) | transform | `src/planning-repo/handlers/markdown-sections.ts` + `src/rendering/frontmatter-views.ts` | role-match (composition of two shipped analogs) |
| `src/web/views/registry.ts` (NEW) | provider/store (registry) | transform | `src/planning-repo/handlers/index.ts` (`HANDLERS`) + `src/rendering/frontmatter-views.ts` (`FRONTMATTER_PANEL_BUILDERS`) | exact (structural mirror, explicitly named in CONTEXT.md) |
| `src/web/views/discussion-log.tsx` (NEW) | component | transform | `src/web/pages/artifact-page.tsx` (`MetadataPanel`/`ValueView`) | role-match |
| `src/web/views/verification.tsx` (NEW) | component | transform | `src/web/pages/artifact-page.tsx` (`MetadataPanel`, `.metadata-list` dt/dd usage) | exact (frontmatter projection, zero new parsing) |
| `src/web/views/plan.tsx` (NEW) | component | transform | `src/rendering/markdown.ts` (`planSectionOpen`, `PLAN_ATTRIBUTE_NAMES`) | exact (tag projection, zero new parsing) |
| `src/web/views/generic-fallback.tsx` (NEW, VIEW-06) | component | transform | `src/presentation/tree.ts` (`unknownKind`, dead field) + `src/web/components/empty-state.tsx` | role-match (no live analog; see No Analog Found) |
| `src/web/views/*.tsx` (12 remaining manifests: research, patterns, ui-spec, uat, validation, security, ui-review, coverage, learnings, context, summary, review, milestone-audit) | component | transform | `src/rendering/section-projection.ts` (own new extractor) + `src/web/pages/artifact-page.tsx` (`MetadataPanel`) | role-match |
| `src/web/pages/artifact-page.tsx` (MODIFIED — dispatch to registry, wire `structured`, outline rebuild) | component (page) | request-response | itself (existing file, extended not replaced) | exact |
| `src/web/components/document-view-toggle.tsx` (NEW, D-01/D-03) | component | event-driven (local UI state) | `src/web/components/ui/button.tsx` + `src/web/pages/plan-pair-page.tsx` (`plan-pair-jumps` slot usage inside `ArtifactHeader` children) | role-match |
| `src/web/components/document-outline.tsx` (NEW/extracted from `artifact-page.tsx`, D-11/D-12/D-13) | component | event-driven (IntersectionObserver) | `src/web/pages/artifact-page.tsx` (`DocumentOutline`, existing) + `src/web/components/reference-preview.tsx` (Popover usage) | role-match |
| `src/planning-repo/mentions.ts` (MODIFIED — add `warning` `ID_PATTERNS` scheme) | utility (scanner) | transform | itself (existing `decision`/`requirement`/`plan`/`phase` schemes) | exact |
| `src/presentation/references.ts` (MODIFIED — add `decision`/`warning` to `ReferencePreviewType`, new preview builders) | service | transform | itself (`requirementPreview`/`phasePreview`/`planPreview`, existing) | exact |
| `src/rendering/linkify.ts` (MODIFIED — no change expected, consumes `references.ts` output) | utility (rehype plugin) | transform | itself (unchanged pattern, `resolvePresentationReference` call site) | exact |
| `src/planning-repo/decisions-registry.ts` / `src/planning-repo/warnings-registry.ts` (NEW, per-phase D-XX/WR-XX extraction) | service | batch (build-time, per snapshot) | `src/planning-repo/handlers/context.ts` (`extractTag`, tag-scanning regex discipline) | role-match |
| `docs/design-language.md` (NEW, D-07) | config/doc | — | n/a (new doc; content seeded from `05-UI-SPEC.md` § Existing Shared Vocabulary) | no analog (net-new) |
| `test/web/class-vocabulary.test.ts` (NEW, D-08) | test | batch (source-scan) | `test/web/css-source-order.test.ts` + `test/web/visual-contract.test.ts` | exact (same text-scan idiom) |
| `test/rendering/section-projection.test.ts` (NEW) | test | transform | `test/handlers.test.ts` (pure-function assertions over `ParsedArtifact`) | role-match |

## Pattern Assignments

### `src/rendering/section-projection.ts` (utility, transform)

**Analog:** `src/planning-repo/handlers/markdown-sections.ts` (primitives to compose) and
`src/rendering/frontmatter-views.ts` (registry/builder shape to mirror).

**Imports pattern** (`markdown-sections.ts` has none beyond its own exports — it is dependency-free):
```typescript
import { splitSections, splitSubsections, parseMarkdownTable, parseChecklistItems } from '../planning-repo/handlers/markdown-sections.ts';
```

**Core composition pattern** (source: `src/planning-repo/handlers/markdown-sections.ts:32-65`, the three functions to compose — already shipped, do not reimplement):
```typescript
export function splitSections(body: string): MarkdownSection[] {
  return splitByHeadingLevel(body, 2);
}
export function splitSubsections(body: string): MarkdownSection[] {
  return splitByHeadingLevel(body, 3);
}
export function parseMarkdownTable(sectionBody: string): Record<string, string>[] {
  // header row -> Record<string,string>[] keyed by header cell text; lines[1] is the
  // `|---|---|` separator, skipped explicitly.
}
```

**Registry/builder shape to mirror** (source: `src/rendering/frontmatter-views.ts:13-17, 54-59`):
```typescript
export interface FrontmatterPanelBuilder {
  key: 'must_haves' | 'coverage' | 'key_links' | 'progress';
  label: string;
  build(value: unknown): FrontmatterValueView | null;
}
export const FRONTMATTER_PANEL_BUILDERS: readonly FrontmatterPanelBuilder[] = Object.freeze([
  { key: 'must_haves', label: 'Must haves', build: nonEmptyRecord },
  // ...
]);
```
A sibling `SECTION_PROJECTION_EXTRACTORS`-style table, keyed by `artifact.kind`, follows this
exact frozen-array-of-`{key, label, build}` shape (per RESEARCH.md's own recommendation).

**Error handling pattern:** none of the three composed primitives throw — `splitSections` on a
malformed body returns `[]`; `parseMarkdownTable` on <2 table lines returns `[]`. The extractor
must preserve this "degrade to empty, never throw" contract so D-06 (silent omission) holds
structurally, not via a try/catch wrapper.

**Anchor discipline (DISCUSSION-LOG proof case, D-04/D-06):** anchor on the `✓` table cell, never
on `**User's choice:**` prose (RESEARCH.md's Pitfall/Anti-Pattern, confirmed 12/12 vs 11/12
spelling-consistency):
```typescript
// Source: composed pattern, RESEARCH.md "Code Examples" section — quoted verbatim, use as-is
function extractDiscussionLog(body: string): DiscussionQuestion[] {
  const out: DiscussionQuestion[] = [];
  for (const topic of splitSections(body)) {
    for (const question of splitSubsections(topic.body)) {
      const rows = parseMarkdownTable(question.body);
      const chosen = rows.find((row) => row['Selected']?.trim() === '✓');
      if (!chosen) continue; // D-06: no matched row -> omit, never a partial/missing state
      out.push({ topic: topic.heading, question: question.heading,
        chosenOption: chosen['Option'] ?? null, chosenDescription: chosen['Description'] ?? null });
    }
  }
  return out;
}
```

---

### `src/web/views/registry.ts` (provider/store, transform)

**Analog:** `src/planning-repo/handlers/index.ts` (ordered registry shape) — note this is a
**structural** analog only; the new registry dispatches on the already-granular `artifact.kind`
wire value (see RESEARCH.md's "Corrected Understanding"), not on `ArtifactHandler.kind`.

**Registry shape to mirror** (source: `src/planning-repo/handlers/index.ts:1-30`, full file):
```typescript
// The ordered handler registry. Typed handlers come first, most-specific-to-least; the
// unconditionally-matching GenericMarkdownHandler is the final element and MUST stay there.
import type { ArtifactHandler } from '../types.ts';
import { PlanHandler } from './plan.ts';
// ...
export const HANDLERS: ArtifactHandler[] = [
  PlanHandler,
  // ...
  GenericMarkdownHandler, // MUST stay last — see load-bearing comment at its declaration
];
```
Mirror this exactly: a keyed lookup (map or array) from `artifact.kind` string to a view manifest,
with an unconditional fallback entry (VIEW-06's speculative structural view) — the client-side
equivalent of `GenericMarkdownHandler`'s "match: () => true, MUST stay last/default" contract.

**Dispatch consumption site** (source: `src/web/pages/artifact-page.tsx:394-397`, existing
frontmatter-panel dispatch to model the new view dispatch on):
```typescript
const panels = useMemo(
  () => (query.data ? buildFrontmatterPanels(query.data.artifact.frontmatter) : []),
  [query.data],
);
```

**Manifest promotion-order contract (D-04):** the registry entry for each kind must expose an
ordered list of "promoted" keys (fields or sections) — this list is *both* the render order and,
per D-11, the outline's data source. Do not let the manifest and the outline diverge into two
lists.

---

### `src/web/views/verification.tsx` (component, transform — VIEW-03)

**Analog:** `src/planning-repo/handlers/frontmatter-only.ts` (parse-side confirmation
`human_verification[]` is already on `artifact.frontmatter`, zero handler work) +
`src/web/pages/artifact-page.tsx` `MetadataPanel`/`ValueView` (dt/dd rendering pattern to reuse).

**Frontmatter-only handler confirming the data is already parsed** (source:
`src/planning-repo/handlers/frontmatter-only.ts:1-30`, full file):
```typescript
const KNOWN_TOKENS = new Set(['VALIDATION', 'SECURITY', 'UI-SPEC', 'UAT', 'VERIFICATION', 'LEARNINGS']);
export const FrontmatterOnlyHandler: ArtifactHandler = {
  kind: 'frontmatter-only',
  match: (ref) => { const token = artifactTokenOf(ref); return token !== null && KNOWN_TOKENS.has(token); },
  parse(raw, ref) {
    const fm = tryParseFrontmatter(raw.content);
    return { title: deriveTitle(fm.data, fm.body, ref.path), frontmatter: fm.data, body: fm.body, warning: fm.warning, structured: {} };
  },
};
```

**Field-list rendering pattern to reuse verbatim** (source: `src/web/pages/artifact-page.tsx:83-121`):
```typescript
function ValueView({ value }: { value: FrontmatterValueView }): React.JSX.Element {
  if (value.kind === 'scalar') return <span className="metadata-scalar">{value.value}</span>;
  // ... list -> <ol className="metadata-list">, record -> <dl className="metadata-record"><dt>/<dd>
}
function MetadataPanel({ panel }: { panel: FrontmatterPanel }): React.JSX.Element {
  return (
    <section className={`metadata-panel metadata-panel-${panel.presentation}`}>
      <h2>{panel.label}</h2>
      <ValueView value={panel.value} />
    </section>
  );
}
```
Per 05-UI-SPEC.md §4, the VERIFICATION view reuses `.metadata-list` dt/dd styling directly (Check
/ Expected / Why a person rows) rather than inventing a bespoke card — this is the same
`<dl>`/`<dt>`/`<dd>` shape as `ValueView`'s record branch above.

**Silent-omission pattern (D-06, field-level, per UI-SPEC §4):** a check missing `expected` or
`why_human` omits just that `dt`/`dd` pair — model this the same way `ValueView`'s record branch
already omits nothing but must be extended to skip `undefined` entries per key, not per whole
record.

---

### `src/web/views/plan.tsx` (component, transform — VIEW-04)

**Analog:** `src/rendering/markdown.ts` (`renderPlanRange`, `planSectionOpen`,
`PLAN_ATTRIBUTE_NAMES`) — the data this view needs is already computed server-side and emitted as
`data-plan-*` attributes.

**Attribute contract already emitted** (source: `src/rendering/markdown.ts:20-21, 272-285`):
```typescript
const PLAN_ATTRIBUTE_NAMES = ['type', 'gate', 'tdd'] as const;

function planSectionOpen(segment: PlanSegment, ordinal: string): string {
  const attributes = PLAN_ATTRIBUTE_NAMES.flatMap((name) => {
    const value = segment.attributes[name];
    return value === undefined ? [] : [` data-plan-${name}="${escapeHtml(value)}"`];
  }).join('');
  const recognized = isRecognizedPlanTag(segment.tag);
  return `<section class="plan-section plan-section-${escapeHtml(segment.tag)}" data-plan-section="${escapeHtml(segment.tag)}" data-plan-recognized="${recognized}" data-plan-ordinal="${escapeHtml(ordinal)}"${attributes}>...`;
}
```
Per RESEARCH.md Pattern 3, prefer extracting the same segment tree from `segmentPlanBody` output
(imported in `markdown.ts` from `./plan-segments.ts`) over scraping the rendered HTML's `data-*`
attributes — cleaner, and avoids a second parse of already-produced HTML.

**View-local list markup** (per 05-UI-SPEC.md §5): `<ol className="view-plan-task-index">`, one
`<li data-gate={boolean}>` per segment in ordinal order — reserved view-local namespace (D-09), no
doc entry needed. Gate chip only when `data-plan-gate` present: reuse the shared `.status-chip`
vocabulary (`data-tone="active"`), not a bespoke chip class.

---

### `src/web/views/discussion-log.tsx` (component, transform — VIEW-02 proof case)

**Analog:** `src/rendering/section-projection.ts` (own new extractor, above) for data, and
`src/web/pages/artifact-page.tsx` for the `.section-heading.compact` / `.status-chip` shared
vocabulary usage pattern.

**Shared chip vocabulary to reuse** (source: `src/web/pages/artifact-page.tsx:460-469`, the
existing `.status-chip[data-tone]` usage this view's "Chosen" chip must match):
```typescript
<span className="status-chip" data-tone={warningTone === 'unreadable' ? 'destructive' : 'warning'}>
  {warningTone === 'unreadable' ? 'Unreadable' : 'Warning'}
</span>
```
Per 05-UI-SPEC.md §3, the chosen-option chip is `data-tone="active"` (accent-tinted), not
`destructive`/`warning` — same component (`status-chip`), different tone value; do not invent a
new chip class for this state.

**View-local markup** (per 05-UI-SPEC.md §3): `<ul className="view-discussion-log-options">`
(view-local), `<li className="view-discussion-log-option" data-chosen={boolean}>` (view-local).

---

### `src/web/views/generic-fallback.tsx` (component, transform — VIEW-06)

**No live analog exists — this is genuinely new UI, confirmed by RESEARCH.md's Pitfall 1.**
`unknownKind` is computed but never rendered anywhere in the codebase:

**Dead field confirming zero existing UI to extend** (source: `src/presentation/tree.ts:171`,
grep-verified as the sole production reference):
```typescript
unknownKind: artifact.kind === 'unknown',
```
A full-repo grep of `unknownKind` outside this computation site and its one test
(`test/presentation/tree.test.ts:198`) returns nothing — no CSS rule, no conditional render.
Budget this view as new work, not a wiring task.

**Reuse for absence/neutral tone:** `src/web/components/empty-state.tsx` (full file, 30 lines) —
the "must never read as a warning" philosophy this view's chip/notice must also follow:
```typescript
export const EMPTY_STATE_MESSAGE = 'Nothing here yet.';
export function EmptyState({ variant = 'inline' }: { variant?: 'inline' | 'block' }): React.JSX.Element {
  if (variant === 'block') {
    return (
      <div className="empty-flow" data-tone="quiet" role="status">
        <CircleDashed aria-hidden="true" />
        <p>{EMPTY_STATE_MESSAGE}</p>
      </div>
    );
  }
  return <p className="empty-note">{EMPTY_STATE_MESSAGE}</p>;
}
```
Per 05-UI-SPEC.md §8, the unrecognized-type chip is `data-tone="quiet"` (neutral), never
`destructive`/`warning` — same reasoning as `EmptyState`'s own comment ("must never read as a
warning, a parse failure, or an application error").

**Notice block to reuse:** `.notice` (plain, non-`.destructive`) — same component
`plan-pair-page.tsx`'s "Outcome not recorded yet" aside already uses (source:
`src/web/pages/plan-pair-page.tsx:173`, `<aside className="notice plan-open-notice" role="status">`).

---

### `src/web/components/document-view-toggle.tsx` (component, event-driven — D-01/D-03)

**Analog:** `src/web/components/ui/button.tsx` (variant/size system) +
`src/web/pages/plan-pair-page.tsx` (the exact `ArtifactHeader` `children` slot this toggle
occupies, precedent already established by `plan-pair-jumps`).

**Slot precedent** (source: `src/web/pages/plan-pair-page.tsx:158-171`):
```typescript
<main className="artifact-page plan-pair-page page-stack">
  <ArtifactHeader crumbs={crumbs} /* ... */ >
    <nav className="plan-pair-jumps" aria-label="Plan review sections">
      {/* ... */}
    </nav>
  </ArtifactHeader>
```
`ArtifactHeader`'s own doc comment (source: `src/web/components/artifact-header.tsx:10-18`)
confirms `children` "render last inside the header" — this is exactly where the new
`document-view-toggle.tsx` mounts for every per-type view page.

**Button variant/size to use** (source: `src/web/components/ui/button.tsx:26-42`):
```typescript
size: { default: ..., xs: "h-7 gap-1 px-3 ...", sm: ..., /* ... */ }
variant: { default: ..., secondary: 'bg-secondary text-secondary-foreground ...', ghost: 'hover:bg-muted ...' /* ... */ }
```
Per 05-UI-SPEC.md §1: active = `variant="secondary"` + `aria-pressed="true"`; inactive =
`variant="ghost"` + `aria-pressed="false"`; both at `size="xs"`.

**Error handling / loading:** none — per UI-SPEC's own UI Considerations table, this element is
explicitly dismissed for loading/error states ("no independent fetch: every view renders from the
single `/api/documents` response the artifact page has already awaited").

---

### `src/web/components/document-outline.tsx` (component, event-driven — D-11/D-12/D-13)

**Analog:** `src/web/pages/artifact-page.tsx` `DocumentOutline` (existing, to be extended/moved)
+ `src/web/components/reference-preview.tsx` (`Popover` usage pattern for the narrow-width
overlay).

**Existing outline to extend, not replace** (source: `src/web/pages/artifact-page.tsx:60-81`):
```typescript
function outlineHeadings(document: RenderedDocument): RenderedDocument['headings'] {
  const headings = document.headings.filter((heading) => heading.depth <= 3).slice(0, 18);
  return headings.length < 2 ? [] : headings;
}
function DocumentOutline({ document }: { document: RenderedDocument }): React.JSX.Element | null {
  const headings = outlineHeadings(document);
  if (headings.length === 0) return null;
  return (
    <nav className="document-outline" aria-label="On this page">
      <p>On this page</p>
      <ol>{headings.map((heading) => (
        <li key={heading.id} data-depth={heading.depth}>
          <a href={`#${encodeURIComponent(heading.id)}`}>{heading.text}</a>
        </li>
      ))}</ol>
    </nav>
  );
}
```
Per D-11, swap the data source from `document.headings` to the view registry's promoted-section
list (plus the D-02 remainder as a final entry) — the `<nav className="document-outline">` /
`<ol>`/`<li>`/`<a>` markup shape itself carries over unchanged.

**Popover pattern for the narrow-width disclosure** (source:
`src/web/components/reference-preview.tsx:41-56`, the `Popover.Root`/`Popover.Portal`/
`Popover.Positioner`/`Popover.Popup` nesting to reuse):
```typescript
<Popover.Root open={open} onOpenChange={onOpenChange} onOpenChangeComplete={/* ... */}>
  <Popover.Portal>
    <Popover.Positioner className="reference-preview-positioner" anchor={anchor} sideOffset={8} align="start" positionMethod="fixed">
      <Popover.Popup className="reference-preview" initialFocus finalFocus={() => state.trigger}>
        {/* ... */}
      </Popover.Popup>
    </Popover.Positioner>
  </Popover.Portal>
</Popover.Root>
```
Per 05-UI-SPEC.md §7, the new `.document-outline-trigger` popup content reuses the *same*
`.document-outline` `<ol>` markup shown above — do not duplicate the list styling into a second
class.

**CSS rule being replaced, not extended (Pitfall 5)** — verified current narrow-width behavior
that D-12 explicitly rejects (source: `05-RESEARCH.md` citing `src/web/styles/globals.css:3124-3139`):
```css
@media (max-width: 58rem) {
  .document-reader-layout { grid-template-columns: 1fr; }
  .document-outline { position: static; max-height: none; padding: 0 0 var(--space-4); border-right: 0; border-bottom: 1px solid var(--border); }
  .document-outline ol { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```
This drops the outline into normal flow (reachable only by scrolling to the top) — the exact
pattern D-12 rejects. Replace this rule; do not add to it.

---

### `src/planning-repo/mentions.ts` (utility/scanner, transform — BACK-02, `warning` scheme)

**Analog:** itself — the existing `decision` scheme is the direct sibling the new `warning` scheme
must match in form and precedence discipline.

**Full `ID_PATTERNS` block to extend** (source: `src/planning-repo/mentions.ts:30-53`):
```typescript
export const ID_PATTERNS: Record<IdScheme, RegExp> = {
  requirement: /\b[A-Z][A-Z0-9]+-\d{2,}\b/g,
  decision: /\bD-\d+\b/g,
  plan: /(?<!\d-)\b(?!\d{4}-)\d{2,3}-\d{2,3}\b(?!-\d)/g,
  phase: /\bPhase\s+(\d+[A-Z]?(?:\.\d+)*)\b/gid,
};
```
A `warning: /\bWR-\d+\b/g`-shaped entry (mirroring `decision`'s exact bounded-quantifier,
word-boundary shape) must be inserted **before** `requirement` in object literal order — insertion
order is the tie-break in `collectRawMatches`'s stable sort (source:
`src/planning-repo/mentions.ts:169-172`, `candidates.sort(...)` — longer match wins at equal
start, otherwise earliest `Object.keys(ID_PATTERNS)` iteration order wins), and `WR-01` currently
falls to `requirement`'s `/\b[A-Z][A-Z0-9]+-\d{2,}\b/g` since it has 2+ leading uppercase letters.

**Bounded-quantifier / ReDoS discipline to match (V5, ASVS):** every existing pattern is
word-boundary-anchored with bounded quantifiers (`\d{2,}`, `\d+`) — no nested unbounded groups.
The new `warning` pattern must satisfy the identical shape and run through the existing
`stripCodeForScanning` pass (source: `src/planning-repo/mentions.ts:66-68`) exactly as every
existing scheme does — no new call site should skip it.

---

### `src/presentation/references.ts` (service, transform — BACK-02 preview builders)

**Analog:** itself — `requirementPreview`/`phasePreview`/`planPreview` are the direct shape new
`decisionPreview`/`warningPreview` functions must follow.

**Type union to extend** (source: `src/presentation/references.ts:11`):
```typescript
export type ReferencePreviewType = 'requirement' | 'phase' | 'plan' | 'artifact';
```
Add `'decision' | 'warning'`.

**Builder shape to mirror** (source: `src/presentation/references.ts:63-78`, `requirementPreview`
— the closest existing shape since both decisions and requirements are ID-keyed, per-phase or
per-milestone facts with a short "detail" pair):
```typescript
function requirementPreview(requirement: RequirementDto, milestone: MilestoneDto, phase: PhaseDto): ReferencePreviewDto {
  return {
    key: previewKey(milestone.key, 'requirement', requirement.id),
    type: 'requirement',
    identity: requirement.id,
    title: requirement.text,
    status: statusOf(requirement.checked),
    location: `${milestoneLocation(milestone)} · Phase ${phase.identity.number}`,
    detail: { label: 'Tier', value: requirement.tier },
    url: buildPhaseUrl(phase.identity),
  };
}
```
Per D-15, the new `decision`/`warning` previews' `detail` field carries "the decision's own
statement or the warning's finding title, plus which phase defines it" — exactly the
`{ label, value }` pair shape above, reused verbatim.

**Registration/dedup pattern to mirror** (source: `src/presentation/references.ts:49-61,
156-184`, `addResolution` and its call sites inside `buildReferenceRegistry`):
```typescript
function addResolution(resolutions, key, preview, previews): void {
  if (resolutions.has(key)) { resolutions.set(key, null); return; } // ambiguous -> null, per D-14/D-17
  resolutions.set(key, preview.key);
  previews.set(preview.key, preview);
}
```
D-14's "phase-local first, then whole corpus, exactly-one-match" resolution is a new fallback
layer on top of this existing per-milestone `lookupKey`/`resolutions` map — the ambiguous-collapse
behavior (`resolutions.set(key, null)`) is the same primitive D-17's "plain text on ambiguity"
already relies on; reuse it rather than writing a second ambiguity rule.

**New per-phase extraction needed (Pitfall 2), no existing analog — closest structural precedent:**
`src/planning-repo/handlers/context.ts`'s tag-scanning discipline (source: full file, 38 lines):
```typescript
function extractTag(body: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`);
  const m = body.match(re);
  return m ? m[1].trim() : null;
}
```
This currently lifts a whole `<decisions>` tag body as one opaque string
(`sections[tag] = extractTag(fm.body, tag)`) — the new per-phase decision registry needs one level
deeper: splitting that tag body on `- **D-NN:**` bullets (verified 5/5 phase CONTEXT.md files) and,
separately, a REVIEW.md scanner splitting on `### WR-NN:` headings (verified 4/4 v1.0 REVIEW.md
files) — currently unparsed since REVIEW falls to `GenericMarkdownHandler`. Bound each new regex
the same way `extractTag`'s is bounded (anchored, no nested unbounded groups) per V5/T-01-11.

---

### `docs/design-language.md` (config/doc, D-07) and `test/web/class-vocabulary.test.ts` (test, D-08)

**No code analog for the doc itself** — its content is the seed list already compiled in
`05-UI-SPEC.md` § "Existing Shared Vocabulary" (17 rows: `.page-stack`, `.eyebrow`,
`.section-heading`, `.status-chip[data-tone]`, `.empty-note`/`.empty-flow`, `.quiet-state`,
`.notice`, `.source-note`/`.source-link`, `.artifact-metadata`, `.metadata-panel`/`.metadata-record`/
`.metadata-list`, `.document-outline`, `.history-*`, `.roadmap-loading`/`.search-group-label`) plus
the reserved `view-<kind>-*` namespace regex `^view-[a-z-]+-[a-z-]+$`.

**Test-idiom analog** (source: `test/web/css-source-order.test.ts:1-17` header/imports, and
`test/web/visual-contract.test.ts:1-27` header/`ruleBlocks` helper — both confirm the established
"raw text/regex scan via `node:fs`, never AST" convention):
```typescript
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}
```
`class-vocabulary.test.ts` follows this exact shape: read `docs/design-language.md` for the
allowlist, then regex-scan `className="..."` literals (and the `view-<kind>-*` prefix pattern)
across every file in `src/web/views/`, `src/web/pages/`, `src/web/components/` — no `ts-morph`, no
`@babel/parser`, matching the codebase's zero-AST-dependency precedent (confirmed absent from
`package.json` devDependencies).

---

## Shared Patterns

### Status/tone chips
**Source:** `.status-chip[data-tone=...]`, used at `src/web/pages/artifact-page.tsx:460-469,
489-494` and `src/web/pages/plan-pair-page.tsx:202` (coverage-matrix row).
**Apply to:** DISCUSSION-LOG's "Chosen" chip (`data-tone="active"`), PLAN task-index's "Gates"
chip (`data-tone="active"`), VIEW-06's "Unrecognized type" chip (`data-tone="quiet"`) — one shared
component, only the `data-tone` value differs per view.
```typescript
<span className="status-chip" data-tone="active">Chosen</span>
```

### Collapsed disclosure (`<details className="artifact-metadata">`)
**Source:** `src/web/pages/artifact-page.tsx:472-483` (Document metadata) and `:485-534` (warning
disclosure) — both already use the identical `<details className="artifact-metadata">` +
`<summary>label <span>{N} count</span></summary>` shape.
**Apply to:** D-02's collapsed remainder ("More in this document · {N} sections") — same class,
same summary-with-trailing-count shape, zero new CSS.
```typescript
<details className="artifact-metadata">
  <summary>Document metadata <span>{panels.length} sections</span></summary>
  <div className="metadata-panels" aria-label="Structured artifact metadata">{/* ... */}</div>
</details>
```

### `EmptyState`/absence copy
**Source:** `src/web/components/empty-state.tsx` (full file).
**Apply to:** Any view surface that needs to say nothing-is-here (VIEW-06's deepest fallback case
only, per D-06 — everywhere else, absence is silent per D-06 and renders no component at all).
`EMPTY_STATE_MESSAGE = 'Nothing here yet.'` — reuse verbatim, never author new absence copy.

### `ArtifactHeader` shared page-open component
**Source:** `src/web/components/artifact-header.tsx` (full file, 60 lines) — already used
identically by `artifact-page.tsx` and `plan-pair-page.tsx`.
**Apply to:** every one of the 17 per-type views (16 kinds + unrecognized fallback) — this
component is explicitly called out in `05-UI-SPEC.md` as "the shared document-page header every
Phase 5 view reuses without modification." Do not fork it per view.

### `Popover` (`@base-ui/react/popover`) overlay pattern
**Source:** `src/web/components/reference-preview.tsx:1-95` (full file).
**Apply to:** D-12's narrow-width outline disclosure — reuse the `Popover.Root`/`Portal`/
`Positioner`/`Popup` nesting and its `open`/`onOpenChange`/`onOpenChangeComplete` controlled-state
shape rather than introducing a `<details>`-based or custom-portal alternative.

### Error handling (mention-scanner regex safety, V5/ASVS)
**Source:** `src/planning-repo/mentions.ts:30-68` (`ID_PATTERNS` + `stripCodeForScanning`).
**Apply to:** the new `warning` scheme in `mentions.ts` and any regex added to
`src/presentation/references.ts`'s `tokenIdentity()` (source: `references.ts:196-208`) — bounded
quantifiers, word-boundary anchors, run through `stripCodeForScanning` before matching, mirroring
`decision`'s exact shape.

### rehype pipeline ordering (if any manifest ever touches the hast tree — flagged, not expected)
**Source:** `src/rendering/markdown.ts:233-241` (`createProcessor`'s `.use()` chain).
```typescript
.use(rehypeRaw)
.use(rehypeSanitize, schema)
.use(rehypeResolvedReferences)
.use(rehypeSlug)
.use(trustedEnrichment(highlighter))
.use(rehypeStringify);
```
**Apply to:** N/A for Phase 5's manifests directly (they operate on `structured`/`frontmatter`
JSON, not the hast tree, per D-03) — documented here only because RESEARCH.md's Pitfall 4 flags it
as the one ordering rule any future hast-touching addition must respect.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/web/views/generic-fallback.tsx` | component | transform | VIEW-06's "visibly marked unrecognized" has no rendering analog anywhere in the codebase — `unknownKind` (`src/presentation/tree.ts:171`) is computed and tested but never rendered (RESEARCH.md Pitfall 1, confirmed by grep). Build from `EmptyState`'s neutral-tone philosophy and the `.notice` block pattern, not from an existing unrecognized-type UI, because none exists. |
| `docs/design-language.md` | config/doc | — | Net-new document; no prior design-language doc exists in this repo (`.claude/CLAUDE.md` § Conventions currently reads "not yet established"). Content is compiled from `05-UI-SPEC.md` § Existing Shared Vocabulary, not copied from another file. |
| `src/planning-repo/decisions-registry.ts` / `warnings-registry.ts` | service | batch | No file in `src/presentation/` or `src/rendering/` currently builds a decision- or warning-keyed lookup map (RESEARCH.md Pitfall 2, confirmed by grep for `decisionsOf`/`extractDecision`/`WR-` extraction logic). `context.ts`'s `extractTag` is the closest structural precedent (tag-scanning discipline) but extracts a whole tag body, not per-bullet/per-heading entries — the per-entry split is new parsing work. |

## Metadata

**Analog search scope:** `src/planning-repo/handlers/`, `src/rendering/`, `src/presentation/`,
`src/web/pages/`, `src/web/components/`, `src/server/`, `test/web/`, `test/handlers.test.ts`.
**Files scanned:** 37 (all confirmed git-tracked via `git ls-files` before citation).
**Pattern extraction date:** 2026-09-20
