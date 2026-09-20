# Phase 5: Per-Type Document Views - Research

**Researched:** 2026-09-20
**Domain:** Client-side content-projection layer over an existing read-only markdown pipeline (React 19 + Hono + unified/rehype), plus a documented CSS vocabulary and a mention-resolution scanner extension.
**Confidence:** HIGH — every claim below outside the Assumptions Log was verified by reading the cited file and, for discrete values, quoting it verbatim.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**View / Document-Body Relationship**
- **D-01:** The per-type view is the page. The full rendered document is reachable through an explicit **Document source** toggle rather than sitting permanently beneath the view. Revises Phase 2's D-09. Reversibility: costly.
- **D-02:** Content the manifest does **not** promote still renders inside the view, after the promoted region, in its original document order, **collapsed by default** behind a disclosure.
- **D-03:** The **Document source** toggle shows the full document through the existing v1.0 sanitized markdown pipeline — tables, code, Mermaid, heading anchors and linkified mentions intact. Not literal raw markdown text.

**Promotion Order and Fidelity**
- **D-04:** A manifest's promotion list **is** the render order. A view may present promoted fields/sections in an order that differs from the file. Document order is still preserved for everything in D-02's unpromoted remainder.
- **D-05:** No per-block provenance affordances. Promoted blocks do **not** carry "in document" back-links to their source heading anchors.
- **D-06:** A manifest that promotes a section or field the file does not contain **silently omits** it — no empty slot, no empty-state scaffolding, no partial-match chip.

**Design Language Convention**
- **D-07:** The design language lives in a **repo document** (e.g. `docs/design-language.md`) that owns the vocabulary — `status-chip[data-tone]`, `section-heading` (+ `.compact`), `empty-note`, `quiet-state`, `notice` / `notice destructive`, `source-note`, `source-link`, `eyebrow`, `lede`, `page-intro`, `page-stack`, and the `history-*` family. `.claude/CLAUDE.md` § Conventions shrinks to a one-line pointer at that doc.
- **D-08:** UI-05's enforcing test is a **class vocabulary allowlist**. It derives the sanctioned names from the design-language doc, scans `className` literals in view and page code, and fails on any name outside the vocabulary.
- **D-09:** The escape route for genuinely view-private styling is a **reserved view-local namespace** — names under a declared per-view prefix (e.g. `view-discussion-log-*`) are auto-allowed. Not a test-side exception array.
- **D-10:** The vocabulary test runs over the existing dashboard, roadmap, traceability and search pages too. **When a reference page fails, the fix is to add the name to the doc — never to rewrite the page.**

**Reading Surface — Outline (READ-07)**
- **D-11:** The outline lists **the view's own sections** — the manifest's promoted sections in promotion order, then D-02's collapsed remainder as a single entry. Not `RenderedDocument.headings` as today.
- **D-12:** At widths where the sticky left column does not fit, the outline **collapses to a sticky disclosure** pinned under the page chrome; opening it overlays the section list. Rejected: dropping it into normal flow above the document, and folding it into the narrow-width sidebar drawer.
- **D-13:** Reading position is shown as a single **active entry**, tracked with an `IntersectionObserver` on section boundaries — and at narrow width the collapsed disclosure's own label names the current section. Per Phase 2's D-16, scrolling must **not** rewrite the URL.

**Reading Surface — Mentions (BACK-02)**
- **D-14:** `D-XX` and `WR-XX` resolve **phase-local first, then whole corpus**. Ambiguous or absent → plain text, per Phase 2's D-17. Reversibility: reversible.
- **D-15:** Both schemes follow Phase 2's **D-14** preview-first pattern, reusing `src/web/components/reference-preview.tsx`. The type-specific detail is the decision's own statement or the warning's finding title, **plus which phase defines it**.

### Claude's Discretion
- Exact filename and internal organisation of the design-language doc (D-07), and the exact spelling of the reserved view-local prefix (D-09).
- Whether the vocabulary test parses the doc or is generated from it, and how `className` literals are extracted (AST vs. source scan) — provided D-08's failure condition and D-10's scope hold.
- The precise registry shape for manifests, and whether manifests are data or small functions — provided it mirrors `HANDLERS` and is keyed on the granularised `kind`.
- Disclosure mechanics, overlay placement, focus handling and transitions for D-12, provided pointer and keyboard users get equivalent access.
- `IntersectionObserver` thresholds and root margins for D-13.
- The exact granular `kind` key names produced by splitting `frontmatter-only` and `unknown`.
- Wave decomposition inside the phase — ROADMAP.md's four-wave suggestion is a sound ordering, not a mandate.

### Deferred Ideas (OUT OF SCOPE)
- **Per-block provenance links** — rejected as D-05.
- **Manifest-drift signalling** ("matched N of M" chip) — rejected as D-06 for now.
- **Outline nesting document headings under view sections** — rejected as D-11 for scope.
- **Status-based re-ranking inside a promoted group** — not taken in D-04.
- Already tracked in REQUIREMENTS.md § Deferred, not re-opened here: READ-08 (deviation pairing), BACK-01 (backlinks panel), FIND-06 (faceted search), NAV-08 (command palette), DASH-05, PLAT-01…04.
- Out of scope per REQUIREMENTS.md: writing to `.planning/`; a purpose/category taxonomy over artifact types (rejected 2026-09-20); adopting `gsd-tools query` during this milestone; rewriting the dashboard, roadmap, or traceability pages.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VIEW-01 | Each artifact type renders through a view selected for that type, rather than one undifferentiated reader | Client-side view registry dispatches on `artifact.kind`, verified already-granular on the wire (see Corrected Understanding). `FRONTMATTER_PANEL_BUILDERS` is the shipped analog for the registry shape. |
| VIEW-02 | A discussion log shows, for each question, the options that were offered and which one was chosen | Section Projection Pattern 2 + the verified `splitSections`/`splitSubsections`/`parseMarkdownTable` extractor, anchored on the `✓` table cell (verified against a real fixture, 12/12 audited per artifact-structure-survey.md). |
| VIEW-03 | A verification report leads with what still needs human verification — each check, what is expected, and why a person is required | Frontmatter Projection Pattern 1 — `human_verification[]` already on `artifact.frontmatter` via `FrontmatterOnlyHandler`, confirmed by reading its `parse()`. No handler work needed, only a manifest promoting the field. |
| VIEW-04 | A plan shows its task structure, including each section's position and whether it gates | Tag Projection Pattern 3 — `renderPlanRange`'s `data-plan-ordinal`/`data-plan-section`/`data-plan-gate` attributes already computed and emitted per segment, verified by reading `planSectionOpen()` and `PLAN_ATTRIBUTE_NAMES`. |
| VIEW-05 | All 16 known artifact types have a registered view, not a subset | Corrected Understanding traces all 16 types' `artifact.kind` wire values from `naming.ts`/`discovery.ts`; Open Question 1 flags a recommended real-corpus spot-check before finalizing the manifest table. |
| VIEW-06 | An artifact type with no registered view still renders structurally, inferred from its shape, and is marked unrecognized rather than presented as understood | Corrected Understanding distinguishes the two fallback cases (literal `'unknown'` vs. a known-but-unmanifested kind); Pitfall 1 flags that the "existing unknown-kind badge" is dead code (`unknownKind` computed, never rendered) — this is net-new UI work. |
| READ-07 | Long documents carry a table of contents that tracks reading position and stays legible at every viewport width | Pitfall 5 documents the current ≤58rem CSS in full (verified, quoted) and confirms it implements exactly the pattern D-12 rejects; D-11/D-13 need the outline's data source changed from `RenderedDocument.headings` to the view registry's section list, plus new `IntersectionObserver` tracking. |
| BACK-02 | `D-XX` decision and `WR-XX` warning mentions are clickable and resolve to their source | Pitfall 2 documents the full gap: no `decision`/`warning` entries in `ReferencePreviewType`, no `warning` `ID_PATTERNS` scheme, and no per-phase decision/warning registry exists yet. `- **D-NN:**` (5/5 phase CONTEXT.md files) and `### WR-NN:` (4/4 v1.0 REVIEW.md files) patterns verified as consistent extraction anchors. |
| UI-04 | The design language shared by the dashboard, roadmap, traceability and search pages is written down as a stated convention | Architecture Patterns + CSS vocabulary grep (`.status-chip`, `.section-heading`, `.empty-note`, `.quiet-state`, `.notice`, `.source-note`/`.source-link`, `.eyebrow`, `.lede`, `.page-intro`, `.page-stack`, `.history-*`, `.roadmap-loading`, `.search-group-label`) all confirmed as real top-level CSS rules this session. |
| UI-05 | That convention is enforced by a test, so a new view cannot silently drift from it | Standard Stack + Testing Conventions establish the existing text-scan idiom (`css-source-order.test.ts`, `visual-contract.test.ts`) as the precedent to follow for the new vocabulary-allowlist test. |
| UI-06 | Every document view uses that language — moving between a document and the dashboard reads as one application | Same CSS vocabulary basis as UI-04/05; conformance condition across all new views, verified against the same class list. |

</phase_requirements>

## Summary

Phase 5 is not a rendering rewrite. It is (1) a **client-side view registry** dispatching on a
`kind` string that turns out to **already be granular on the wire** (a corrected finding — see
below); (2) a **section-projection extractor**, newly built by composing three already-shipped,
already-tested functions in `markdown-sections.ts`; (3) **wiring** `artifact.structured` from
server response into the client, where it is currently declared and dropped; (4) a **written CSS
vocabulary doc** plus a source-scanning vitest test in the same style as three existing guards
(`css-source-order.test.ts`, `visual-contract.test.ts`, `token-guard.test.ts` — all regex/text
scans over raw file content, no AST tooling, no `ts-morph`, no React Testing Library anywhere in
this codebase); (5) an outline rebuild sourced from the view's own section list instead of
`document.headings`, with a genuinely new narrow-width collapse (today's ≤58rem behavior drops the
outline into normal flow — exactly what D-12 rejects); and (6) two additions to the mention
scanner/resolver for `D-XX`/`WR-XX`, which requires building small per-phase decision/warning
registries this codebase does not yet have, because `**D-NN:**` and `### WR-NN:` are currently only
prose, never structurally extracted.

**Primary recommendation:** Do not spend planning effort "splitting kind into granular values" at
the server/handler level — it is already granular at `Artifact.kind` (see the corrected-finding
callout). Spend the effort on: the section-projection extractor, the 16 manifests/views consuming
`structured` (already-serialized) and `frontmatter` (already-parsed for 5 types), the CSS
vocabulary doc + test, the outline data-source/narrow-width rebuild, and the two new mention
schemes with their per-phase registries.

## Architectural Responsibility Map

This project has one tier that matters for this phase: a Node/Hono server that does all parsing
(`planning-repo/*`) and rendering (`rendering/markdown.ts`) synchronously per request, and a React
SPA client that receives a fully-serialized JSON DTO and renders it. There is no browser-side
parsing of markdown and no server-side React rendering (no SSR).

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Artifact discovery, filename→kind derivation | Backend (`planning-repo/discovery.ts`) | — | Position/filename-derived only, never content (DATA-02); already produces the granular kind. |
| Frontmatter/section/tag extraction into `structured` | Backend (`planning-repo/handlers/*`) | — | `gray-matter` + the new section-projection extractor must run server-side; extraction is never duplicated client-side. |
| Full-document HTML rendering (sanitized markdown → HTML string) | Backend (`rendering/markdown.ts`, unified pipeline) | — | Shiki highlighter, mermaid placeholder emission, and `rehype-sanitize` all run once per request server-side; this is unchanged by Phase 5 (D-03 reuses it verbatim). |
| Per-type view selection and promoted-field rendering | Frontend (`src/web/pages/artifact-page.tsx` + new view registry) | — | Pure presentation over an already-parsed, already-serialized DTO — no new I/O, no new parsing. |
| Mermaid diagram rendering | Frontend (browser, `useEffect` in `DocumentView`) | — | Needs a real DOM; already established in v1.0, unchanged. |
| CSS vocabulary conformance | Frontend build-time (vitest source-scan test) | — | Enforced as a repo-local static check, not a runtime concern. |
| Mention resolution (`D-XX`/`WR-XX`) | Backend build (`planning-repo/mentions.ts`, `presentation/references.ts`) at snapshot-build time; Frontend consumes via `linkify.ts`'s existing rehype pass | — | Resolution must happen once per snapshot build (like the existing `requirement`/`phase`/`plan` schemes), not per-render in the browser. |

## Corrected Understanding — `kind` Is Already Granular on the Wire

This is the single highest-leverage finding of this research pass and revises how the "granularised
`kind`" language in CONTEXT.md/ROADMAP.md/REQUIREMENTS.md should be read by the planner. It does not
contradict any locked decision — the decisions are about view/presentation behavior — but it changes
*where* the "split the two catch-alls" work actually needs to happen.

**The claim in the canonical docs:** "Today 11 of 16 types collapse into two catch-alls
(`frontmatter-only`, `unknown`)... `kind` is the only presentation axis and needs real keys."

**What reading the code shows:** there are **two different `kind` values in this codebase**, and
the one that collapses is not the one the client receives.

1. `ArtifactHandler.kind` (e.g. `'frontmatter-only'`, `'unknown'`, `'plan'`, `'context'`) —
   declared on each handler object in `src/planning-repo/handlers/*.ts`
   `[VERIFIED: src/planning-repo/handlers/frontmatter-only.ts:14]` (`kind: 'frontmatter-only',`)
   and `[VERIFIED: src/planning-repo/handlers/generic.ts:8]` (`kind: 'unknown',`). This field is
   used **only** inside `registry.ts` to pick which parser ran, and is otherwise dead — a full-repo
   grep for `handler.kind` / `Handler.kind` returns zero matches, and `test/handlers.test.ts` never
   asserts on it either. **This is the field that is actually undifferentiated** — `FrontmatterOnlyHandler`
   and `GenericMarkdownHandler` each run *identical* extraction logic regardless of which of their
   ~6 matched types fired, so `structured` stays `{}` for all 11 types dispatched to them.

2. `Artifact.kind` (and therefore `ArtifactDto.kind`, and therefore the `artifact.kind` field the
   client already receives at `/api/documents`) — is set from `parsed.ref.kind`
   `[VERIFIED: src/planning-repo/assemble.ts:49]` (`kind: parsed.ref.kind,`), and `ref.kind` is
   produced by `deriveKind(fileName)` in discovery.ts, which is **filename-token-derived and already
   per-type**:
   `[VERIFIED: src/planning-repo/discovery.ts:61-79]`:
   ```
   function deriveKind(fileName: string): string {
     const milestoneFile = parseMilestoneFileName(fileName);
     if (milestoneFile.matched) return milestoneFile.document.toLowerCase();
     if (isCanonicalRootFile(fileName)) {
       return fileName.replace(/\.(md|json|lock)$/i, '').toLowerCase();
     }
     const plan = parsePlanFileName(fileName);
     if (plan.matched) return plan.kind;
     const artifact = parsePhaseArtifactName(fileName);
     if (artifact.matched) return artifact.artifact.toLowerCase();
     const quickArtifact = parseQuickArtifactName(fileName);
     if (quickArtifact.matched) return quickArtifact.artifact.toLowerCase();
     return 'unknown';
   }
   ```
   For a phase-scoped file the artifact token comes from `parsePhaseArtifactName`'s regex
   `^(PHASE_NUM)-([A-Z][A-Z-]*)\.md$` `[VERIFIED: src/planning-repo/naming.ts:100]`
   (`const PHASE_ARTIFACT_RE = new RegExp(...` capturing group 2 as `artifact`), lowercased. So
   `05-DISCUSSION-LOG.md` → `artifact.kind === 'discussion-log'`, `01-VERIFICATION.md` →
   `'verification'`, `04-REVIEW.md` → `'review'`, `v1.0-MILESTONE-AUDIT.md` → `'milestone-audit'`
   (via the milestone-file branch), etc. **Every one of the 16 known types already produces a
   distinct `artifact.kind` string.** The literal `'unknown'` fallback fires only for a file whose
   name matches *no* GSD naming grammar at all — a materially rarer, different condition than "one
   of the 16 known types with no registered view."
   `[VERIFIED: src/server/index.ts:92]` confirms this exact field (`kind: lookup.artifact.kind,`)
   is what ships in the `/api/documents` response the client reads.

**Consequence for planning:** the client-side view registry (VIEW-01/05/06) should dispatch on the
already-granular `artifact.kind` wire value directly — no server-side "kind splitting" task is
required to make that dispatch possible. What genuinely needs building:

- The **section-projection extractor**, and wiring it into parsing so `structured` is populated for
  the 11 currently-`{}` types (whether by adding typed handlers per type, or by parameterizing
  `FrontmatterOnlyHandler`/`GenericMarkdownHandler` with a per-token manifest — Claude's Discretion
  per CONTEXT.md, "whether manifests are data or small functions").
- The **client view registry** itself, keyed on `artifact.kind` string values (`'discussion-log'`,
  `'verification'`, `'review'`, `'research'`, `'patterns'`, `'ui-review'`, `'coverage'`,
  `'validation'`, `'security'`, `'ui-spec'`, `'uat'`, `'learnings'`, `'plan'`, `'summary'`,
  `'context'`, `'milestone-audit'`, plus the literal `'unknown'` fallback case).
- **VIEW-06's speculative fallback** applies in two distinct cases that must both degrade to it:
  (a) `artifact.kind === 'unknown'` (filename didn't parse under any grammar), and (b) a
  syntactically-valid, known-shaped `artifact.kind` string for which the view registry has no
  manifest entry (e.g. a 17th GSD type added later). Both need the same "structural inference +
  visibly marked unrecognized" treatment; only (a) can also fall back further since it has no
  filename-derived identity at all to label with.

**A second, related dead-code finding that bears directly on VIEW-06:** the "existing unknown-kind
badge" the survey/notes describe does not currently render anything. `TreeNode.unknownKind` is
computed (`unknownKind: artifact.kind === 'unknown'`
`[VERIFIED: src/presentation/tree.ts:171]`) and has one test asserting it
(`[VERIFIED: test/presentation/tree.test.ts:198]`, `expect(node?.unknownKind).toBe(true);`), but a
full-repo grep of `unknownKind` shows it is read nowhere in `tree-navigator.tsx` or any CSS —
it is dead: computed and tested, never consumed by any visual. **The plan must treat VIEW-06's
"visibly marked unrecognized" as new UI work, not as wiring up something that already exists.**

## Standard Stack

No new runtime dependencies are needed for this phase. Every capability required — markdown
section splitting, table parsing, popover/disclosure primitives, IntersectionObserver, regex-based
mention scanning — is either already in the dependency tree or a browser built-in.

### Core (existing, reused)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@base-ui/react` | 1.7.0 `[VERIFIED: package.json]` | `Popover` (already used by `reference-preview.tsx`), `Dialog` (already used by `sidebar-drawer.tsx`) | D-12's "sticky disclosure that overlays the section list" and D-15's reused preview both map directly onto primitives already in the tree — no new accessible-overlay library needed. |
| `gray-matter` | 4.0.3 `[VERIFIED: package.json]` | Frontmatter parsing, already guarded via `tryParseFrontmatter` | Frontmatter-projection types (PLAN, SUMMARY, VERIFICATION, REVIEW, MILESTONE-AUDIT) need zero new parsing work — `human_verification[]` is already on `artifact.frontmatter` today. |
| `unified` / `remark-*` / `rehype-*` / `shiki` | pinned in package.json | Full-document rendering behind D-03's "Document source" toggle | Unchanged; D-03 explicitly reuses this pipeline verbatim, not a new one. |
| `@tanstack/react-query` | 5.102.3 `[VERIFIED: package.json]` (CLAUDE.md cites 5.101.4; the installed version is newer — re-verify at plan time with `npm view @tanstack/react-query version` if precision matters) | Already the fetch layer for `/api/documents`; no change needed to add `structured` — it is already on the DTO. | — |

### Browser built-ins needed, not npm packages
| Capability | API | Note |
|---|---|---|
| Reading-position tracking (D-13) | `IntersectionObserver` | No library needed; thresholds/root margins are Claude's Discretion per CONTEXT.md. |
| Vocabulary-test source scanning (D-08) | `node:fs` + regex, same idiom as `test/web/css-source-order.test.ts` and `test/web/visual-contract.test.ts` | This codebase's established convention is **raw text/regex scanning**, never an AST library (no `ts-morph`, no `@babel/parser` in `devDependencies` — confirmed absent from `package.json`). Follow this convention rather than introducing one. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex/text-scan vocabulary test | `ts-morph` or the TypeScript compiler API for a real AST scan of `className` JSX attributes | More robust against string-concatenation edge cases, but introduces a new devDependency and a new testing idiom this codebase has deliberately avoided everywhere else (four existing "contract" tests all use text-scanning). Not worth it at this corpus size; CONTEXT.md leaves the AST-vs-scan choice to Claude's Discretion but the codebase's own precedent strongly favors text-scan. |
| `@base-ui/react` `Popover`/`Dialog` for the outline's narrow-width disclosure | A bespoke `<details>`/`<summary>` disclosure | `<details>` is simpler and is already used for `.artifact-metadata` and `.warning-technical-details` (`[VERIFIED: src/web/pages/artifact-page.tsx:473,486,501]`), but doesn't give the "overlay" behavior D-12 asks for ("opening it overlays the section list" — implies floating over content, not pushing it). `Popover` (already imported in `reference-preview.tsx`) is the closer match to the stated requirement and reuses an existing pattern rather than introducing a third disclosure idiom. |

**Installation:** none required.

**Version verification:** No new packages are proposed, so the Package Legitimacy Gate is not
applicable to this phase.

## Package Legitimacy Audit

**Not applicable.** This phase adds zero new npm dependencies — it composes existing shipped
primitives (`markdown-sections.ts`, `@base-ui/react`, browser `IntersectionObserver`) rather than
introducing new libraries. If a plan later proposes a new dependency (e.g. for AST-based scanning),
run the Package Legitimacy Gate at that point.

## Architecture Patterns

### System Architecture Diagram

```
Browser (React SPA)                         Node/Hono server (per request)
┌─────────────────────────┐                 ┌──────────────────────────────────┐
│ ArtifactPage             │  GET            │ /api/documents?route=...          │
│  useQuery(loadDocument)  │ ───────────────▶│  artifactIndex.lookup(route)      │
│                          │                 │   -> ParsedArtifact (from         │
│                          │                 │      HANDLERS dispatch, already   │
│                          │                 │      run at snapshot-build time)  │
│                          │                 │  renderer.render(artifact, {      │
│                          │                 │    referenceRegistry })            │
│                          │                 │   -> unified/remark/rehype        │
│                          │                 │      pipeline (sanitize, slug,    │
│                          │                 │      linkify mentions, shiki)     │
│                          │◀─────────────── │  -> RenderedDocument { html,      │
│  response.artifact.kind  │  JSON           │       headings, references }      │
│  response.artifact       │                 │  -> artifact.structured (NEW:     │
│    .structured (wired,   │                 │       populated by the new        │
│    currently dropped)    │                 │       section-projection          │
│  response.artifact       │                 │       extractor for 11 types)     │
│    .frontmatter (used    │                 └──────────────────────────────────┘
│    today)                │
│         │                │
│         ▼                │
│  NEW: View Registry       │  dispatches on artifact.kind (already granular)
│   lookup(kind) -> manifest│  falls back to: nested-frontmatter -> frontmatter
│         │                │  projection; stable `##` -> section projection;
│         ▼                │  else -> plain (VIEW-06 speculative read)
│  Manifest-driven view     │
│   promoted region (D-04)  │
│   + collapsed remainder   │
│   (D-02, doc order)       │
│         │                │
│         ▼                │
│  "Document source" toggle │  renders document.html (existing pipeline,
│   (D-01, D-03)            │  unchanged) via the existing DocumentCanvas/
│                           │  DocumentView machinery
└───────────────────────────┘
```

### Recommended Project Structure

Extending, not restructuring, the existing layout:

```
src/
├── rendering/
│   ├── markdown.ts              # unchanged — full-document pipeline (D-03 target)
│   ├── frontmatter-views.ts     # existing FRONTMATTER_PANEL_BUILDERS pattern — closest analog
│   └── section-projection.ts    # NEW — composes splitSections/splitSubsections/parseMarkdownTable
├── planning-repo/
│   └── handlers/
│       └── markdown-sections.ts # unchanged, already shipped/tested — the extractor's primitives
├── web/
│   ├── views/                   # NEW — one manifest/view module per granular kind, or per-type
│   │   ├── registry.ts          #   entries in one manifest table (Claude's Discretion, D-07-ish)
│   │   ├── discussion-log.ts(x)
│   │   ├── verification.ts(x)
│   │   └── ...
│   ├── pages/
│   │   └── artifact-page.tsx    # dispatches to the view registry instead of always rendering
│   │                             # the generic reader; keeps DocumentView/DocumentCanvas for D-03
│   └── styles/
│       └── globals.css          # extended, not replaced — new view-local classes under the
│                                 # reserved per-view prefix (D-09)
docs/
└── design-language.md           # NEW — D-07's vocabulary doc, derived from the 4 reference pages
test/
├── web/
│   ├── class-vocabulary.test.ts # NEW — D-08's allowlist test, same text-scan idiom as
│   │                             # css-source-order.test.ts / visual-contract.test.ts
│   └── ...
└── rendering/
    └── section-projection.test.ts # NEW — pure-function tests, no DOM (matches document-title
                                     # .test.ts's convention)
```

### Pattern 1: Frontmatter Projection (already shipped — no extraction work)

**What:** VERIFICATION, SUMMARY, REVIEW (frontmatter fields), MILESTONE-AUDIT already have their
structure in `gray-matter`-parsed `artifact.frontmatter`. `human_verification[]` is verified live:
`[VERIFIED: 01-VERIFICATION.md via grep confirms human_verification is parsed as frontmatter by
FrontmatterOnlyHandler — src/planning-repo/handlers/frontmatter-only.ts:11]` — `VERIFICATION` is in
`KNOWN_TOKENS`, and the handler's `parse()` returns `frontmatter: fm.data` unmodified
`[VERIFIED: src/planning-repo/handlers/frontmatter-only.ts:19-29]`.
**When to use:** A view for one of these types reads `artifact.frontmatter.<field>` directly — no
new backend work, only a promotion-order manifest and a component that renders the field (e.g. a
list of `{test, expected, why_human}` cards for VIEW-03).
**Example (client-side consumption pattern, already established):**
```typescript
// Source: existing pattern in src/web/pages/artifact-page.tsx:394-397
const panels = useMemo(
  () => (query.data ? buildFrontmatterPanels(query.data.artifact.frontmatter) : []),
  [query.data],
);
```
A VIEW-03 manifest promotes `human_verification` ahead of (and instead of inside) this generic
panel builder — same data source, different presentation.

### Pattern 2: Section Projection (to build)

**What:** Compose `splitSections` (level-2 `##`) → per-section `splitSubsections` (level-3 `###`)
→ `parseMarkdownTable` where a section's body is a GFM pipe table. All three are exported, typed,
and already tested `[VERIFIED: src/planning-repo/handlers/markdown-sections.ts:1-81]` — quoted
signatures:
```typescript
export function splitSections(body: string): MarkdownSection[]
export function splitSubsections(body: string): MarkdownSection[]
export function parseMarkdownTable(sectionBody: string): Record<string, string>[]
export function parseChecklistItems(text: string): ChecklistItem[]
```
**When to use:** DISCUSSION-LOG, CONTEXT (already partially handled by tag-extraction, not this),
RESEARCH, PATTERNS, UI-SPEC, UAT, VALIDATION, SECURITY, UI-REVIEW, REVIEW-FIX — anywhere structure
lives in stable `##`/`###` headings rather than frontmatter.
**Example — the DISCUSSION-LOG anchor, verified against a real fixture file
(`.planning/phases/05-per-type-document-views/05-DISCUSSION-LOG.md`):**
```
### Q1 — When a type has a registered view, how does the promoted structure relate to the rendered markdown body?

| Option | Description | Selected |
|--------|-------------|----------|
| View is primary, source behind a toggle | ... | ✓ |
| Structured lead, full document always below | ... | |
| Per-type manifest decides | ... | |

**User's choice:** View is primary, source behind a toggle
```
`[VERIFIED: .planning/phases/05-per-type-document-views/05-DISCUSSION-LOG.md:13-19]` — quoted
verbatim above (whitespace-normalized). Extraction plan: `splitSections(body)` for each `##` topic
→ `splitSubsections(sectionBody)` for each `### Q<n> —` question → `parseMarkdownTable` on the
subsection body → find the row where `row['Selected'].trim() === '✓'` → that row's `Option`/
`Description` is the chosen answer. Do **not** anchor on `**User's choice:**` — confirmed present in
only 11/12 audited files with a second spelling (`**User's choice (free text):**`) per
`.planning/notes/artifact-structure-survey.md:56-62` `[CITED: .planning/notes/artifact-structure-survey.md]`.

### Pattern 3: Tag Projection (already shipped — `renderPlanRange`)

**What:** PLAN body task structure already renders via a recursive segment walk, not via
`splitSections` — pseudo-XML tags (`<objective>`, `<task type="..." gate="...">`, etc.), not `##`
headings. `[VERIFIED: src/rendering/markdown.ts:304-353]` — the function signature and its
recursive per-segment loop are read in full; gating is exposed via `data-plan-gate` on the emitted
`<section>` (`PLAN_ATTRIBUTE_NAMES = ['type', 'gate', 'tdd']`
`[VERIFIED: src/rendering/markdown.ts:21]`).
**When to use:** VIEW-04 ("a plan shows its task structure, including each section's position and
whether it gates") is **already computed** by this exact function — the ordinal path
(`segmentPath`), the section tag, and the `gate` attribute are all present in the emitted HTML
today via `data-plan-ordinal`, `data-plan-section`, `data-plan-gate`
`[VERIFIED: src/rendering/markdown.ts:284]` (`<section class="plan-section..." data-plan-section="${...}" ... data-plan-ordinal="${...}"${attributes}>`).
A PLAN view can read these `data-*` attributes off the rendered HTML (or, more cleanly, extract the
same segment tree client-side/server-side from `segmentPlanBody` output) to build a promoted
task-structure list — this is presentation work over an existing extraction, matching the
Frontmatter Projection pattern's shape, not new parsing.

### Anti-Patterns to Avoid
- **Re-deriving `kind` granularity server-side:** as shown above, `artifact.kind` is already
  granular. Adding a second "presentation kind" field would create two sources of truth for the
  same concept.
- **Anchoring DISCUSSION-LOG extraction on `**User's choice:**` prose:** verified to have two
  spellings across the audited corpus; the `✓` table cell is the only field verified at 12/12.
- **Building a second AST-based scanning tool for the class-vocabulary test:** breaks with this
  codebase's own established "text-scan, no AST" convention used by three existing contract tests.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown → HTML rendering for the "Document source" toggle | A second rendering path | The existing `createArtifactRenderer()` / unified pipeline, called exactly as `artifact-page.tsx` calls it today | D-03 is explicit: the toggle shows the document through "the existing v1.0 sanitized markdown pipeline," not a reinterpretation. |
| GFM table parsing for DISCUSSION-LOG's option table | A bespoke pipe-table splitter | `parseMarkdownTable` `[VERIFIED: src/planning-repo/handlers/markdown-sections.ts:42-65]` | Already handles header-row extraction and empty-cell defaulting; re-implementing risks diverging on edge cases (extra whitespace, missing trailing cells) already handled here. |
| Accessible overlay/disclosure for D-12's narrow-width outline | A custom focus-trap/portal implementation | `@base-ui/react`'s `Popover` or `Dialog` (already dependencies, already used twice in this codebase) | Focus management, `Escape`/backdrop-click, and portal mounting are exactly what a hand-rolled version would get wrong first; both patterns already exist as reference implementations in this repo. |
| Reading-position tracking | A scroll-offset/`getBoundingClientRect` polling loop | `IntersectionObserver` on section boundary elements | Native, no dependency, cheaper than scroll-event polling, and is the standard mechanism for this exact "which section is currently in view" problem. |
| Mention/ID regex authoring | An unbounded or naively-quantified regex for the new `warning` scheme | The existing `ID_PATTERNS` bounded-quantifier convention (`\b[A-Z]...`) with the same word-boundary/anchoring discipline documented at `[VERIFIED: src/planning-repo/mentions.ts:27-52]` | T-01-11's ReDoS mitigation is a stated, tested constraint (`stripCodeForScanning`, bounded quantifiers, no nested unbounded groups) — a new pattern must satisfy the same shape, not merely "work." |

**Key insight:** almost everything this phase needs to *parse* is already parsed (frontmatter, plan
segments) or trivially composable from shipped primitives (section splitting, table parsing). The
actual net-new engineering is presentation (the view registry + 16 manifests + CSS vocabulary) and
two narrowly-scoped extensions to existing scanners (mentions.ts, tree/outline data sources) — not
a new parsing subsystem.

## Runtime State Inventory

Not applicable — this is a greenfield feature phase (new views, new doc, new test) over an existing
read-only tool, not a rename/refactor/migration. No stored data, live service config, OS-registered
state, secrets, or build artifacts are touched. **None found — this section intentionally omitted
below the required checklist per the greenfield exemption; verified by reading the phase scope in
CONTEXT.md `<domain>`, which lists only additive/presentational deliverables.**

## Common Pitfalls

### Pitfall 1: Treating `unknownKind`/the "existing unknown-kind badge" as already wired
**What goes wrong:** A plan assumes VIEW-06's "visibly marked unrecognized" is a matter of reusing
an existing badge, and under-scopes the task.
**Why it happens:** CONTEXT.md's Code Insights section says "the existing unknown-kind badge marks
it," which is true of the *data* (`unknownKind` is computed) but not the *UI* (nothing renders it).
**How to avoid:** Confirmed by grep: `unknownKind` has exactly one production use-site (the
computation in `tree.ts:171`) and one test (`tree.test.ts:198`); zero render call-sites. Budget this
as new UI work.
**Warning signs:** Looking for a `.tree-badge[data-unknown]`-style CSS rule or a conditional render
using `node.unknownKind` in `tree-navigator.tsx` and not finding one (there isn't one).

### Pitfall 2: Assuming `D-XX`/`WR-XX` need only a new `ID_PATTERNS` regex
**What goes wrong:** BACK-02 looks like "add a regex, done" by analogy with `requirement`/`plan`/
`phase`, but decisions and warnings have **no existing resolution target** — `linkify.ts`'s
`ReferencePreviewType` union is `'requirement' | 'phase' | 'plan' | 'artifact'`
`[VERIFIED: src/rendering/linkify.ts:11]` — no `'decision'`, no `'warning'`. `tokenIdentity()`'s
regex set in `references.ts` also has no D-XX/WR-XX pattern `[VERIFIED: src/presentation/references.ts:196-208]`.
**Why it happens:** `mentions.ts` already has a `decision` `IdScheme` used for a *different*
consumer (the NAV-07 mention index), which looks like coverage but isn't connected to the
document-rendering linkify pipeline at all.
**How to avoid:** Plan two additions: (1) `mentions.ts`'s `ID_PATTERNS` gets a `warning` scheme
placed **before** `requirement` in the object literal (insertion order is the tie-break in
`collectRawMatches`'s stable sort when two schemes match the identical span
`[VERIFIED: src/planning-repo/mentions.ts:138-183]`, and `WR-01` currently matches `requirement`'s
`/\b[A-Z][A-Z0-9]+-\d{2,}\b/g` since it has 2+ leading uppercase letters); (2) `references.ts`/
`linkify.ts` get new preview-building logic for `decision` and `warning` types, which requires a
**new per-phase registry** — extracting `- **D-NN:** <text>` bullets from each phase's `<decisions>`
tag body (currently only lifted as one opaque string,
`[VERIFIED: src/planning-repo/handlers/context.ts:9-37]`: `sections[tag] = extractTag(fm.body, tag)`
gives back the whole tag's raw text, not per-decision entries) and `### WR-NN: <title>` headings
from each phase's REVIEW.md (currently not parsed at all — REVIEW falls to `GenericMarkdownHandler`,
`structured: undefined`/`{}`).
**Warning signs:** No file in `src/presentation/` or `src/rendering/` currently builds a decision-
or warning-keyed lookup map — searching for `decisionsOf`/`extractDecision`/`WR-` extraction logic
in `src/` returns nothing outside code comments citing WR-NN as internal review-finding IDs (an
unrelated homonym — see below).

### Pitfall 3: Confusing in-repo `WR-NN`/`CR-NN` code-review-comment citations with the `WR-XX` GSD scheme
**What goes wrong:** `grep -rn "WR-"` inside `src/` turns up hits in `search.ts` and `server/index.ts`
(`[VERIFIED: src/presentation/search.ts:280,289,391,405]`, `[VERIFIED: src/server/index.ts:55,247]`)
that are comments citing *this project's own* past `01-REVIEW.md`/`02-REVIEW.md` finding IDs as
code provenance — an unrelated, coincidental reuse of the `WR-NN` label scheme, not GSD mentions to
resolve.
**How to avoid:** BACK-02 only concerns `WR-XX` tokens appearing in **prose inside rendered
artifacts** (scanned by `mentions.ts` over `ParsedArtifact.body`), never source-code comments.

### Pitfall 4: `rehype-sanitize` ordering, if a view injects new trusted markup
**What goes wrong:** Per this codebase's own established rule
(`[CITED: react-markdown's documented guidance combining rehype-raw + rehype-sanitize, transcribed
into src/rendering/markdown.ts's pipeline order]`), any new trusted-markup-injecting rehype plugin
(e.g. a hypothetical server-side promotion step operating on the hast tree instead of on already-
extracted `structured` data) must run **after** `rehypeSanitize`, mirroring
`rehypeResolvedReferences`'s position in the pipeline
`[VERIFIED: src/rendering/markdown.ts:233-241]`:
```
.use(rehypeRaw)
.use(rehypeSanitize, schema)
.use(rehypeResolvedReferences)
.use(rehypeSlug)
.use(trustedEnrichment(highlighter))
.use(rehypeStringify);
```
**How to avoid:** Phase 5's manifests operate on already-extracted `structured`/`frontmatter` JSON
data, not on the hast tree, so this pitfall likely does not apply directly — flagged only in case a
plan considers extracting promoted sections *from the rendered hast tree* instead of from raw
markdown text. Prefer extracting from raw markdown (as `markdown-sections.ts` already does) to avoid
this class of ordering bug entirely.

### Pitfall 5: The narrow-width outline collapse today does the opposite of D-12
**What goes wrong:** A plan assumes the outline "just needs new CSS" for D-12/D-13, missing that
the current ≤58rem behavior is the specific pattern D-12 rejects.
**Why it happens:** `DocumentOutline` is real and sticky at wide viewports
`[VERIFIED: src/web/styles/globals.css:2821-2827]`, so it's easy to assume the narrow-width case is
just an unstyled variant of the same thing.
**How to avoid:** Read the actual narrow-width rule: `[VERIFIED: src/web/styles/globals.css:3124-3139]`
```
@media (max-width: 58rem) {
  .document-reader-layout { grid-template-columns: 1fr; }
  .document-outline {
    position: static;
    max-height: none;
    padding: 0 0 var(--space-4);
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }
  .document-outline ol { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
```
This drops the outline into normal document flow above the content — reachable only by scrolling to
the top, which D-12's own rationale names as the rejected option ("only reachable by scrolling to
the top — which is most of what READ-07 objects to"). This CSS must be replaced with the sticky-
disclosure pattern, not extended.

## Code Examples

### Section-projection extractor shape (new, composing shipped primitives)
```typescript
// Source: composed from src/planning-repo/handlers/markdown-sections.ts's existing exports
import { splitSections, splitSubsections, parseMarkdownTable } from './markdown-sections.ts';

interface DiscussionQuestion {
  topic: string;
  question: string;
  chosenOption: string | null;
  chosenDescription: string | null;
}

function extractDiscussionLog(body: string): DiscussionQuestion[] {
  const out: DiscussionQuestion[] = [];
  for (const topic of splitSections(body)) {
    for (const question of splitSubsections(topic.body)) {
      const rows = parseMarkdownTable(question.body);
      const chosen = rows.find((row) => row['Selected']?.trim() === '✓');
      out.push({
        topic: topic.heading,
        question: question.heading,
        chosenOption: chosen?.['Option'] ?? null,
        chosenDescription: chosen?.['Description'] ?? null,
      });
    }
  }
  return out;
}
```
This mirrors the existing `FRONTMATTER_PANEL_BUILDERS` shape
(`[VERIFIED: src/rendering/frontmatter-views.ts:54-59]`, a frozen array of `{key, label, build}`
builders) closely enough that a `SECTION_PROJECTION_EXTRACTORS`-style registry, keyed by
`artifact.kind`, is a natural sibling pattern rather than a new architectural idea.

### Existing PLAN gating data already on the wire (VIEW-04 basis)
```typescript
// Source: src/rendering/markdown.ts:272-285 (verified, quoted)
function planSectionOpen(segment: PlanSegment, ordinal: string): string {
  const attributes = PLAN_ATTRIBUTE_NAMES.flatMap((name) => {
    const value = segment.attributes[name];
    return value === undefined ? [] : [` data-plan-${name}="${escapeHtml(value)}"`];
  }).join('');
  const recognized = isRecognizedPlanTag(segment.tag);
  return `<section class="plan-section plan-section-${escapeHtml(segment.tag)}" data-plan-section="${escapeHtml(segment.tag)}" data-plan-recognized="${recognized}" data-plan-ordinal="${escapeHtml(ordinal)}"${attributes}>...`;
}
```
`PLAN_ATTRIBUTE_NAMES = ['type', 'gate', 'tdd']` `[VERIFIED: src/rendering/markdown.ts:21]` — the
`gate` attribute is already captured per task segment.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Document-first canvas: full rendered markdown always visible, structured summary as a lead-in | Per-type view is the page; full document behind an explicit toggle | D-01, this phase (revises Phase 2's D-09) | Every one of the 16 views is authored against the new page shape; this is flagged in CONTEXT.md as costly to reverse. |
| `RenderedDocument.headings` (whole-document heading list) as the outline's data source | The view registry's own promoted-section list (in promotion order) plus a single collapsed-remainder entry | D-11, this phase | The outline can no longer be built purely from the renderer's output — it needs the manifest's promotion list at render time. |

**Deprecated/outdated:** Phase 2's D-09 (document-first canvas) is explicitly superseded by D-01
above, per CONTEXT.md's own note.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@tanstack/react-query` installed version (5.102.3, read from package.json) may drift from CLAUDE.md's cited 5.101.4 without consequence to this phase — treated as a non-issue, not re-verified against npm registry this session. | Standard Stack | Low — no behavior in this phase depends on the exact patch version. |
| A2 | The recommended manifest/registry shape (`SECTION_PROJECTION_EXTRACTORS` mirroring `FRONTMATTER_PANEL_BUILDERS`) is a suggestion, not a locked design — CONTEXT.md explicitly leaves "whether manifests are data or small functions" to Claude's Discretion. | Code Examples, Architecture Patterns | None if the planner treats it as illustrative; would be wrong only if presented as mandatory. |
| A3 | `@base-ui/react` `Popover`/`Dialog` chosen over `<details>` for D-12's narrow-width disclosure is a recommendation based on reading D-12's "overlays the section list" wording, not a verified requirement — the actual mechanics are Claude's Discretion per CONTEXT.md. | Alternatives Considered | Low — either approach is accessible if built carefully; the plan should treat this as a starting recommendation, not a constraint. |

## Open Questions

1. **Exact granular `kind` string set the view registry must cover**
   - What we know: all 16 types' `artifact.kind` values were derived by tracing `deriveKind()` and
     `naming.ts`'s regexes (not empirically grepped against every live file in this session).
   - What's unclear: whether any of the 16 types has a filename variant that produces an unexpected
     `kind` string (e.g. a differently-cased or hyphenated artifact token in the wild).
   - Recommendation: the planner or executor should run a quick real-corpus check
     (`grep -rhoP '(?<=-)[A-Z][A-Z-]*(?=\.md)' .planning/ | sort -u | tr 'A-Z' 'a-z'` or equivalent)
     against `.planning/` before finalizing the 16-entry manifest table, to catch any drift from the
     traced-from-code expectation.

2. **Where section-projection extraction should be wired into the handler pipeline**
   - What we know: `FrontmatterOnlyHandler` and `GenericMarkdownHandler` currently share identical,
     type-blind logic for their ~11 combined types.
   - What's unclear: whether the cleanest wiring point is (a) new typed handlers per type (matches
     the existing `HANDLERS` pattern most closely), or (b) a manifest-driven dispatch inside the two
     existing catch-all handlers (smaller diff, keeps `HANDLERS`'s length stable). CONTEXT.md
     explicitly defers this to planning discretion.
   - Recommendation: prefer (b) for the 11 catch-all types unless a specific type needs handler-level
     behavior beyond section extraction (none identified in this research) — it keeps `HANDLERS`'s
     load-bearing ordering comment untouched and avoids growing the registry array for what is, per
     the survey, "composition of functions that already ship."

## Environment Availability

Not applicable — this phase has no external tool/service/runtime dependencies beyond what the
project already runs (Node ≥22.18.0, npm). No new CLI, database, or service is introduced.

## Testing Conventions (informational — `nyquist_validation` is disabled for this project per `.planning/config.json`)

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.11 `[VERIFIED: package.json]` |
| Config file | `vitest.config.ts` — `[VERIFIED: vitest.config.ts]`: `test.include = ['test/**/*.test.ts']` — **`.test.tsx` is not included**; every existing test targets `.tsx` source only by importing pure logic modules out of it (e.g. `document-title.test.ts` imports `dropLeadingTitle` from `document-title.ts`, not by rendering `ArtifactPage`). No `@testing-library/react` or jsdom/happy-dom environment is configured anywhere in this repo — confirmed absent from `package.json` devDependencies and `vitest.config.ts`. |
| Test commands | `npm test` (`vitest run`), `npm run test:watch` (`vitest`), `npm run typecheck` (`tsc --noEmit -p tsconfig.server.json && tsc --noEmit -p tsconfig.web.json`), `npm run lint` (`eslint .`) — all `[VERIFIED: package.json]` |
| Established idiom for "contract" tests over TSX/CSS | Plain-text/regex scanning of file contents read via `node:fs`/`readFile`, never AST parsing or DOM rendering — see `test/web/css-source-order.test.ts` and `test/web/visual-contract.test.ts`, both verified read in full this session. | 
| Established idiom for pure-logic extraction | Extract DOM-free helper functions out of `.tsx` files into sibling `.ts` modules (`document-title.ts`, `scroll-settle.ts`, `document-reference-activation.ts`) and unit-test those directly — `dropLeadingTitle`, `handleDocumentReferenceActivation` are verified examples. |

**Recommendation for this phase's plans:** the section-projection extractor, the manifest/view
registry's pure data-shaping logic, and any IntersectionObserver "compute active section" helper
should all be written as plain `.ts` functions with `.test.ts` unit tests (matching the codebase's
100%-DOM-free testing convention) — not as component-rendering tests, since the tooling to do that
(jsdom, React Testing Library) is not present and would be a net-new testing-stack decision outside
this phase's stated scope.

## Security Domain

`security_enforcement: true` `[VERIFIED: .planning/config.json:47]`. This is a read-only, local,
single-user tool with no authentication/session/access-control surface (`PROJECT.md`'s locked
constraint: read-only filesystem access, no writes). The relevant ASVS surface for this phase is
narrow.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Single-user local tool; out of scope by project constraint. |
| V3 Session Management | No | No sessions. |
| V4 Access Control | No | No multi-user access model. |
| V5 Input Validation | Yes | The new `warning` `ID_PATTERNS` regex must follow the same bounded-quantifier, word-boundary-anchored discipline as the existing four patterns (T-01-11's ReDoS mitigation), never a catastrophic-backtracking-prone construction. |
| V6 Cryptography | No | Not applicable to this phase. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| ReDoS via a new mention regex | Denial of Service | Mirror `ID_PATTERNS`'s existing bounded quantifiers (`\d{2,}`, `\d+`) and anchoring; run new patterns through the same `stripCodeForScanning` pass before matching, as every existing scheme does `[VERIFIED: src/planning-repo/mentions.ts:66-68, 138-183]`. |
| XSS via a new view rendering markdown-derived content outside the existing sanitize pass | Tampering / Elevation of Privilege | Views render `structured`/`frontmatter` data (already-extracted plain strings/arrays/objects from `gray-matter`/section-splitting) through normal React JSX (auto-escaped), not via `dangerouslySetInnerHTML` — only the existing `DocumentCanvas` component uses `dangerouslySetInnerHTML`, and only for the already-sanitized `document.html` string `[VERIFIED: src/web/pages/artifact-page.tsx:144-158]`. New per-type views must not introduce a second `dangerouslySetInnerHTML` call site over unsanitized structured data. |

## Sources

### Primary (HIGH confidence — read directly, this session)
- `src/planning-repo/handlers/index.ts`, `frontmatter-only.ts`, `generic.ts`, `plan.ts`, `context.ts`, `markdown-sections.ts`, `artifact-token.ts` — handler registry, dispatch, and shipped extraction primitives
- `src/planning-repo/types.ts`, `src/domain/model.ts` — `ParsedArtifact`/`Artifact`/`ArtifactHandler` contracts
- `src/planning-repo/discovery.ts`, `naming.ts`, `assemble.ts` — `deriveKind()`, naming grammar regexes, and `Artifact.kind = parsed.ref.kind` (the corrected-finding trace)
- `src/planning-repo/mentions.ts`, `src/presentation/references.ts`, `src/rendering/linkify.ts` — mention scanning, reference resolution, and linkify pipeline (BACK-02 gap analysis)
- `src/rendering/markdown.ts`, `src/rendering/frontmatter-views.ts` — rendering pipeline, `renderPlanRange`, `FRONTMATTER_PANEL_BUILDERS`
- `src/server/index.ts` — `/api/documents` response shape, confirming `artifact.kind`/`artifact.structured` on the wire
- `src/web/pages/artifact-page.tsx`, `document-title.ts`, `document-reference-activation.ts`, `reference-preview.tsx`, `sidebar-drawer.tsx` — current document-page chrome, outline, and reusable overlay patterns
- `src/web/styles/globals.css` (targeted reads: lines 330-360, 800-1000, 1275-1310, 1720-1745, 1790-1810, 2140-2220, 2500-2530, 2800-2880, 3120-3160) — CSS vocabulary and current outline/narrow-width behavior
- `src/presentation/tree.ts`, `tree-labels.ts` — `unknownKind` dead-field finding
- `test/handlers.test.ts`, `test/discovery.test.ts`, `test/presentation/tree.test.ts`, `test/web/css-source-order.test.ts`, `test/web/visual-contract.test.ts`, `test/web/document-title.test.ts` — testing conventions
- `vitest.config.ts`, `package.json` — test/lint/typecheck commands, dependency versions
- `.planning/phases/05-per-type-document-views/05-CONTEXT.md`, `05-DISCUSSION-LOG.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/config.json` — phase scope, locked decisions, requirements
- `.planning/notes/artifact-structure-survey.md`, `.planning/notes/per-kind-artifact-rendering.md`, `.planning/research/questions.md` — empirical basis for the categorization decision
- `.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-REVIEW.md` (WR-NN heading structure, verified) and cross-repo grep confirming `### WR-NN:` under `## Warnings` in all 4 v1.0 REVIEW.md files, and `- **D-NN:**` bullets in all 5 phase CONTEXT.md files (01-05)

### Secondary (MEDIUM confidence)
- `react-markdown`'s documented `rehype-raw` + `rehype-sanitize` ordering guidance, as transcribed into this codebase's own pipeline order (not independently re-fetched this session; corroborated by reading the actual pipeline order in `markdown.ts`, which matches the documented pattern).

### Tertiary (LOW confidence)
- None — no WebSearch/training-only claims were needed for this research; every claim above is either a direct code read or a citation of an already-cited-in-repo source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies; every capability traced to an already-installed package or browser built-in.
- Architecture (kind granularity, extraction strategies): HIGH — the corrected finding was verified by reading `discovery.ts`, `naming.ts`, `assemble.ts`, and `server/index.ts` in full, with exact line citations and verbatim quotes.
- Pitfalls: HIGH — each pitfall traces to a specific, quoted code location (dead `unknownKind` field, missing `decision`/`warning` `ReferencePreviewType`, the ≤58rem outline CSS that contradicts D-12).
- Mention-resolution registries (D-XX/WR-XX extraction) design: MEDIUM — the *pattern* (`- **D-NN:**` bullets, `### WR-NN:` headings) is verified at 5/5 and 4/4 file counts respectively, but the exact registry implementation shape is left to planning, not prescribed here.

**Research date:** 2026-09-20
**Valid until:** 30 days (stable codebase, no external API drift risk for this phase's scope)
