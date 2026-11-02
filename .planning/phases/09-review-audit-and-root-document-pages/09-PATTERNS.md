# Phase 9: Review, Audit and Root Document Pages - Pattern Map

**Mapped:** 2026-11-02
**Files analyzed:** 27 (new or modified)
**Analogs found:** 25 / 27 (all analog paths verified git-tracked under `src/`, `test/`)

Reads RESEARCH.md "Resolved by the user after research" as binding: disposition-first head totals; `?source=1`
query flag as the Source escape (no server change); checkbox-based state tiles; session line + MILESTONES fields
filled; no retrospective seeding; `*-REVIEW-shard-*` stays unknown.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match |
|---|---|---|---|---|
| `src/planning-repo/naming.ts` (+`parseReviewFixName`) | utility (grammar) | transform | `parsePhaseArtifactName` same file L100-107 | exact |
| `src/planning-repo/handlers/review.ts` (+`ReviewDispositionHandler`, suffixed fix match) | handler | transform | `ReviewFixHandler` same file L56-76 | exact |
| `src/planning-repo/handlers/review-report.ts` (widen `idEndAt`, plural Commits) | utility (scanner) | transform | `idEndAt` same file L308-321 | exact |
| `src/planning-repo/handlers/milestone-audit.ts` (new) | handler | transform | `ProjectHandler` (`handlers/project.ts`) + `ReviewHandler` try/catch guard | role-match |
| `src/planning-repo/handlers/coverage.ts` (new) | handler | transform | `ProjectHandler` (`parseMarkdownTable`) | role-match |
| `src/planning-repo/handlers/windows.ts` (length-aware fence, normalised rows) | handler | transform | itself L13-17 | exact |
| `src/planning-repo/handlers/project.ts` (outcome fields only if needed) | handler | transform | itself | exact |
| `src/planning-repo/handlers/index.ts` (register 3 handlers) | config | n/a | itself L34-63 | exact |
| `src/presentation/root-redirects.ts` (new) | utility | request-response | `redirectTo` in `src/web/route-dispatch.ts` L36-41 | partial |
| `src/presentation/review-ledger.ts` (new) | service (pure projection) | transform | `src/presentation/review-context.ts` | exact |
| `src/presentation/traceability.ts` (+`requirementStateCounts`, shipped date) | service | transform | `archivedMilestoneOf` L286-300 | exact |
| `src/presentation/dashboard-head.ts`, `dashboard.ts` (About link, session line) | service | transform | existing dashboard-head | role-match |
| `src/server/project-api.ts` (`ledgerContext` on `/documents`) | route/controller | request-response | `reviewContext` IIFE L101-112 | exact |
| `src/web/route-dispatch.ts` (redirect rule, archive-block outcome) | router | request-response | `document` case L144-153 | exact |
| `src/web/views/kinds.ts` (+`project`,`windows`,`review-disposition`) | config | n/a | itself | exact |
| `src/web/views/manifest.ts` / `manifests.ts` (new composer fields) | config | n/a | `reviewThreads` field L158 + `review` manifest | exact |
| `src/web/views/project-page.ts` + `-components.tsx` | view composer + component | transform | `note-page.ts` + `note-page-components.tsx` | role-match |
| `src/web/views/windows-ledger.ts` + `-components.tsx` | view | transform | `todo-lifecycle.ts` / `uat-session.ts` | role-match |
| `src/web/views/milestone-audit.ts` + `-components.tsx` | view | transform | `verification-board.ts` | role-match |
| `src/web/views/coverage-matrix.ts` + `-components.tsx` | view | transform | `security-console.ts` (table-like) | partial |
| `src/web/views/review-ledger.ts` + `-components.tsx` (tab bodies, `LedgerHead`) | view | transform | `review-threads.ts` + `-components.tsx` | exact |
| `src/web/components/ledger-switch.tsx` (new) | component | event-driven | `src/web/components/pair-switch.tsx` | exact |
| `src/web/pages/artifact-page.tsx` (one `useMemo` + render branch per view) | component | request-response | `reviewThreads` L793-797, L960-975 | exact |
| `src/web/pages/roadmap-page.tsx`, `traceability-page.tsx` (block target, Shipped chip, `?state=`/`?milestone=`) | component | request-response | `roadmap-deep-link.ts`, `scroll-settle.ts`, `traceability-filter.ts` | role-match |
| `src/web/globals.css` + `docs/design-language.md` rows | config | n/a | existing `view-*` blocks | role-match |
| `test/fixtures/lendshed/.planning/**` and `test/fixtures/shapes/**` (made-up) | fixture | n/a | existing lendshed fixture | exact |
| tests: per-handler guard, composer unit, scanner growth, view-registry count, dense golden | test | n/a | `test/review-handler-guard.test.ts`, `test/scanner-growth.test.ts`, `test/web/view-registry.test.ts` | exact |

## Pattern Assignments

### `src/planning-repo/handlers/review.ts` (add `ReviewDispositionHandler`, widen fix match)

**Analog:** `ReviewFixHandler`, same file L56-76. Copy the match-by-token, guarded extraction, never-throw shape:
```typescript
export const ReviewFixHandler: ArtifactHandler = {
  kind: 'review-fix',
  match: (ref) => artifactTokenOf(ref) === 'REVIEW-FIX',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let report;
    try { report = extractReviewFixReport(fm.body); } catch { report = undefined; }
    return { title, frontmatter: fm.data, body: fm.body, warning: fm.warning,
      structured: report === undefined ? {} : { reviewFix: report } };
  },
};
```
For disposition: `match: artifactTokenOf(ref) === 'REVIEW-DISPOSITION'`, `structured: { disposition }`. Register it BEFORE `ReviewHandler` is irrelevant (exact tokens) but keep all three before `GenericMarkdownHandler` in `handlers/index.ts` L34-63. Suffixed fix files (`05-REVIEW-FIX-backend.md`): `artifactTokenOf` calls `parsePhaseArtifactName` (all-capital token only, `naming.ts` L100), so add `parseReviewFixName` in `naming.ts` and let `artifactTokenOf` return `'REVIEW-FIX'` for it (`artifact-token.ts` L25-33). Keep grammar in `naming.ts` only (DATA-02).

### `src/planning-repo/handlers/review-report.ts` (id grammar)

**Analog:** `idEndAt` L308-321 (character scan, no regex over bodies, linear). Extend: optional leading 1-2 capitals plus hyphen, 2-4 capital severity token, optional `P<digits>-`, 1-4 digits, not followed by alnum. Derive severity from the severity token (not the text before the first hyphen). Plural `Commits:` handled where `SHORT_FIX_KEYS` / `pick('commit')` live. Pin strings in tests: `WR-04`, `C-WR-08`, `WR-P1-01`, `A-CR-01`, `FL-CR-01`.

### `src/planning-repo/handlers/milestone-audit.ts` and `coverage.ts` (new)

**Analog:** `src/planning-repo/handlers/project.ts` (full file, 30 lines):
```typescript
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { splitSections, parseMarkdownTable } from './markdown-sections.ts';
export const ProjectHandler: ArtifactHandler = {
  kind: 'project',
  match: (ref) => ref.location === 'root' && basename(ref.path) === 'PROJECT.md',
  parse(raw, ref) {
    const fm = tryParseFrontmatter(raw.content);
    ...
    structured: { sections, keyDecisions: keyDecisionsSection ? parseMarkdownTable(keyDecisionsSection.body) : [] },
```
Audit match: milestone-root `*-MILESTONE-AUDIT.md` (check how `kindOfPath` in `folders.ts` currently yields `milestone-audit` and reuse that predicate). Coverage match: `artifactTokenOf(ref) === 'COVERAGE'`. Wrap each extraction in the try/catch from `ReviewHandler.parse` L34-39 so a throw only omits its key. Table helpers: `parseMarkdownTable`, `splitSections` (`markdown-sections.ts`). Header-driven column detection per RESEARCH Pitfall 9; audit normalisation per Pitfall 7; YAML octal note Pitfall 17.

### `src/planning-repo/handlers/windows.ts` (modify)

**Analog:** itself. Replace the L14 regex `/```json\s*([\s\S]*?)```/` (truncates on inner triple backtick; real files use four-backtick fences) with a line scan: opening run of N backticks closes at the next run of >= N. Keep the `fencedRows ?? parseMarkdownTable(...)` precedence and `fm.warning ?? jsonResult?.warning` (L37). Normalise rows (id string, phase string|null, line number|null).

### `src/presentation/review-ledger.ts` (new, pure)

**Analog:** `src/presentation/review-context.ts` (exact). Copy: header contract (pure, no Node, no regex, never throws), `isRecord`, try/catch returning an `empty` constant, `resolveArtifactReference(registry, path)?.url ?? null`.
```typescript
export function buildReviewContext(presentation, registry, reviewPath): ReviewContext {
  const empty: ReviewContext = { phaseName: null, fix: null };
  try {
    const artifacts = Array.isArray(presentation?.artifacts) ? presentation.artifacts : [];
    ...
    const sibling = artifacts.find((c) => c.path === siblingPath && c.kind === 'review-fix');
  } catch { return empty; }
}
```
Do NOT reuse the `-REVIEW.md` -> `-REVIEW-FIX.md` suffix swap (L40-41, L73); it cannot find `05-REVIEW-FIX-backend.md`. Find siblings by same directory plus token via `artifactTokenOf`-equivalent on `artifact.path`. Keep `reviewContext.fix` untouched so `composeReviewThreads` tests stay green; hand it a merged `ReviewFixReportBody` when several fix files exist. Head precedence: disposition rows, then parsed REVIEW findings, then REVIEW frontmatter `findings.total`, then fix entries. Mark = disposition `open` and a fix entry with same id and outcome `fixed`.

### `src/server/project-api.ts` (add `ledgerContext`)

**Analog:** L101-112, copy exactly:
```typescript
const reviewContext = ((): ReviewContext | null => {
  try {
    return lookup.artifact.kind === 'review'
      ? buildReviewContext(activeDerived.presentation, activeDerived.referenceRegistry, lookup.artifact.path)
      : null;
  } catch { return null; }
})();
```
New IIFE for kinds `review | review-disposition | review-fix`; add the field to the `/documents` response and its client type.

### `src/web/route-dispatch.ts` (redirect rule)

**Analog:** `document` case L144-153 and `redirectTo` L36-41 (rejects `//host`, `/\`). Insert after the alias check, before `documentOutcome`:
```typescript
if (alias !== undefined) return redirectTo(alias);
const root = rootDocumentOutcome(route.url, search, presentation); // new, from root-redirects.ts
if (root !== null) return root;   // skipped when search carries source=1
return documentOutcome(route.url, presentation) ?? NOT_FOUND;
```
`resolveProjectRoute` already receives `search` (L118-122). Extend `RouteOutcome` (L25-32) with an `archive-block` variant carrying `{ page, version }`; never put the target in the URL. Only redirect for `location === 'root'` + basename (not kind alone) and archived `location === 'milestone-root'`. Use the same predicate as `archivedMilestoneOf` (`items.length === 0 -> null`, `traceability.ts` L286-300) for `/vX/requirements`. Redirects must replace history (existing `redirect` outcome does).

### `src/presentation/traceability.ts` (add `requirementStateCounts`)

**Analog:** `archivedMilestoneOf` L286-300 (type guards `isRequirementItem`, `.filter(entry => entry.checked !== null)`). Add one pure function returning `{ complete, pending, validated, outOfScope, validatedByMilestone[] }` using the same predicates the `?state=` seeding uses; add `shipped` to `TraceabilityArchivedMilestone` from `milestoneRecords`. Filter state stays local component state (see `traceability-filter.ts`); query params read once on arrival, never written back.

### `src/web/components/ledger-switch.tsx` (new)

**Analog:** `src/web/components/pair-switch.tsx` (exact). Copy nav + `Link` + `buttonVariants` + `aria-current`:
```tsx
const look = buttonVariants({ size: 'xs', variant: active === doc ? 'secondary' : 'ghost' });
<Link key={doc} to={to} className={look} aria-current={active === doc ? 'page' : undefined}>{text}</Link>
...
<nav className="plan-pair-switch" aria-label={label}>
```
Generalise to a list of `{ id, label, to }` tabs; render only existing files; pass `null` as `switcher` for a lone REVIEW (D-11, byte-identical). Import `Link` from `../nav.tsx`, not react-router. `status-chip` + `data-tone="quiet"` for the stale-disposition mark (see PairSwitch L35-41).

### `src/web/pages/artifact-page.tsx` (wiring)

**Analog:** L793-797 and L960-975:
```tsx
const reviewThreads = useMemo<ComposedReviewThreads | null>(() => {
  if (!manifest || !viewInput) return null;
  return manifest.reviewThreads?.(viewInput) ?? null;
}, [manifest, viewInput]);
...
if (reviewThreads && mode === 'view') {
  return (<main className="artifact-page page-stack">{switcher}<ReviewThreadsView key={artifact.path} model={reviewThreads} ... chip={<WarningChip tone={warningTone} />} /></main>);
}
```
Add one `useMemo` and one render branch per new view. Do NOT add `artifact.kind === '...'` branches: `view-page-contract.test.ts` caps that string at 2 occurrences. Dispatch only via manifest fields. Add the `?source=1` handling and the exemption from the "no dedicated view" notice (`fallback.ts`) for the five redirected kinds.

### `src/web/views/manifest.ts` / `manifests.ts` / `kinds.ts`

**Analog:** `manifest.ts` L158 `reviewThreads?: (input: ViewInput) => ComposedReviewThreads | null;` and the `review` manifest (`reviewThreads: composeReviewThreads`, with `promote` kept as fallback). Add optional fields `projectPage`, `windowsLedger`, `milestoneAudit`, `coverageMatrix`, `reviewLedger`. Replace composer-less `milestone-audit`, `coverage`, `review-fix` manifests by adding the composer field and keeping `lead` ending in `.`. Add kinds `project`, `windows`, `review-disposition` to `VIEW_KINDS` (24) and update `test/web/view-registry.test.ts` "exactly 21 members"; manifest keys must equal kinds. `view-<kind>-*` classes auto-allowed via `VIEW_LOCAL_PREFIXES`.

### View composers and components (project, windows, audit, coverage, ledger bodies)

**Composer analog:** `src/web/views/note-page.ts` header contract: pure `ViewInput -> Composed* | null`, no DOM/fs, imports types only, no regex literals, junk values degrade to omitted parts, `null` when projection missing (falls to promoted-block view). `ViewInput` = `{ kind, frontmatter, structured, ... }` (`manifest.ts` L171).
**Component analog:** `note-page-components.tsx` header: strings render only via `ResearchInline` / plain text (never raw-HTML prop; `raw-html-guard.test.ts` allows one site), `Link` from `../nav.tsx`, `CopyPathButton`, `DocumentViewToggle`, local component state only, no URL writes, tones only `complete | in-flight | missing | quiet` via `data-tone`.
Per-page analogs (D-13): review ledger tab bodies <- `review-threads.ts` + `review-threads-components.tsx`; audit <- `verification-board.ts` (+ components); windows <- `todo-lifecycle.ts` / `uat-session.ts` (reuse `formatStamp` from `uat-session.ts`); coverage <- `security-console.ts` or a plain table; project page <- `note-page` rail+main structure (but fresh frame per sketch; follow the winning sketch in `.planning/sketches/MANIFEST.md`). Outcome classification by leading word after stripping symbols (Pitfall 10).
Typography: page-scoped `.artifact-page:has(.view-<kind>-...)` rules, never edit shared classes; add new shared class rows to `docs/design-language.md` BEFORE running `test/web/class-vocabulary.test.ts`.

### Roadmap / traceability pages (archive block, Shipped chip)

**Analogs:** `src/web/pages/roadmap-deep-link.ts` (`resolveRoadmapDeepLink`, `milestoneContainsDeepLink` already opens History blocks), `src/web/pages/scroll-settle.ts` (`scrollWhenSettled` for arrival), `traceability-filter.ts`. `RoadmapPage` derives target from pathname, so the `archive-block` outcome must pass an explicit target prop.

### Fixtures and tests

**Analog:** `test/fixtures/lendshed/.planning/` (has MILESTONES, PROJECT, REQUIREMENTS, ROADMAP, STATE, phases, quick, todos; no WINDOWS/audit/disposition/coverage). Add invented content only (`fixture-leak.test.ts`). `route-table.test.ts` sweeps `ALL_FIXTURE_ROOTS` so a suffixed fix file is covered automatically. Regenerate `test/__golden__/dense.json` deliberately. Add one `*-handler-guard.test.ts` per new handler (copy `review-handler-guard`) and a growth test beside `test/scanner-growth.test.ts`.

## Shared Patterns

### Never-throw handler extraction
**Source:** `handlers/review.ts` L34-39, L62-67. **Apply to:** every new handler/extractor. Try/catch per extraction; a throw omits only its key.

### Tolerant frontmatter
**Source:** `tryParseFrontmatter` (`planning-repo/frontmatter.ts`) via `fm.warning` pass-through. **Apply to:** all handlers. Never call gray-matter directly.

### Pure presentation modules
**Source:** `presentation/review-context.ts` header and `isRecord` guards. **Apply to:** `review-ledger.ts`, `root-redirects.ts`, traceability additions. No Node imports, no throws, empty-constant fallback.

### Safe redirects
**Source:** `redirectTo` in `route-dispatch.ts` L36-41. **Apply to:** all new redirects; one `sourceUrlOf()` shared by dispatch, drawer, search.

### Manifest-only view dispatch
**Source:** `manifests.ts` `review` entry + `manifest.ts` optional composer fields. **Apply to:** all five views.

### Design-language enforcement
**Source:** `docs/design-language.md`, `test/web/class-vocabulary.test.ts`. **Apply to:** all CSS/class additions; never `destructive` for content; sketch colours only from tones.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/presentation/root-redirects.ts` | utility | request-response | No existing root-document to page mapping; closest is `legacy-routes.ts` / `redirectTo`. Use RESEARCH Pattern 2 |
| Coverage matrix component | component | transform | No existing decision-matrix table view; build from a plain table plus tone chips |

## Metadata

**Analog search scope:** `src/planning-repo/handlers`, `src/presentation`, `src/web/{views,pages,components}`, `src/server`, `test/`
**Files scanned:** about 20 read or grepped
**Pattern extraction date:** 2026-11-02
**Not read in full:** `09-UI-SPEC.md` (467 lines) was not loaded in this pass; the planner must read it directly for visual specifics. Large analogs (`verification-board.ts` 1572 lines, `todo-lifecycle.ts` 557) were identified, not excerpted; planner should read targeted ranges.
