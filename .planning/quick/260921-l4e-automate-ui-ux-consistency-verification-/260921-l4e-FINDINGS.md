# UI/UX Foundation Consistency Sweep — Findings

quick-260921-l4e

## Run

- **Command:** `npm run test:e2e` (Playwright, chromium only)
- **Server:** the harness's own dev server on `http://127.0.0.1:4199` (`node src/server/index.ts . --port 4199`), `reuseExistingServer: false`. The systemd Labelore instance on port 4173 was never touched or restarted.
- **Chromium:** 1.63.0 (`npx playwright --version` reports `Version 1.63.0`, matching the pinned `@playwright/test` devDependency)
- **Page count:** 29 pages per theme × width combination — the 4 reference pages (dashboard, roadmap, traceability, search), one artifact per corpus `artifact.kind` (24 kinds found), and one plan-pair page.
- **Matrix:** light/dark × 1280px/420px = 4 sweep runs, each visiting all 29 pages, plus 4 standalone behaviour tests (F-10, F-11, F-12, F-13) run once at light/1280 (F-13 also drives its own light-1280 theme/width regardless of the sweep matrix).
- **`kindsWithoutFixture`** (from `buildPageMatrix`, computed live against `/api/presentation`, never hardcoded): `validation`, `coverage`, `learnings` — all three are registered in `VIEW_KINDS` but have no file in this repo's own `.planning/` corpus, so they are not exercised by this run. This matches the plan's own prediction exactly.
- **Screenshots:** `test/e2e/screenshots/{light,dark}-{1280,420}/*.png` — 29 PNGs per folder, 116 total (gitignored).
- **Final result:** `npm run test:e2e` exits 0 (8/8 tests pass). `results.json` holds 1771 entries covering every check id F-01..F-15 across all four theme/width combinations, plus the four standalone behaviour checks.

## Checks

| Check | What it measures | Result | Pages affected |
|-------|-------------------|--------|-----------------|
| F-01 | Page frame parity (`main` element count, `page-stack` class, x/width/padding vs. `ref-dashboard`) | pass | all 29 |
| F-02 | Heading block: `h1`/`eyebrow` count and typography vs. `ref-roadmap`; h1 offset-from-top sanity bound | fixed (line-height) + harness-corrected (offset check, dashboard exemption) + waived (1 kind) | all 29 (2 fixes), doc-plan-pair (1 fix), doc-requirements (1 waiver) |
| F-03 | `.lede`/`.artifact-lead` parity (fontSize/color/lineHeight) vs. `ref-roadmap`'s `.lede` | pass | 28 (pages carrying `.artifact-lead`) |
| F-04 | `.section-heading` layout + `h2` typography vs. `ref-roadmap`'s first section heading | pass | 25 (artifact/plan-pair pages) |
| F-05 | Status chip tone/typography/radius vs. `ref-dashboard`'s first chip | harness-corrected (toneless chip allowance) | 14 (pages with at least one `.status-chip`) |
| F-06 | Squared corners — `border-radius: 0` on every shared "boxy chrome" selector | pass | all 29 |
| F-07 | View-local class namespace (`view-<kind>-*` or documented `view-block`) | pass | all 29 |
| F-08 | Outline wide-column behaviour (sticky, positioned left of canvas, scroll-to-active) at 1280px | pass | 24 (artifact/plan-pair pages) |
| F-09 | Outline narrow-trigger/popover behaviour at 420px | pass | 23 |
| F-10 | View/Source toggle: exactly 2 buttons, one pressed, content swap, no horizontal reflow | fixed (harness: height dropped from the stability check) | 25 |
| F-11 | Remainder disclosure: `details#view-remainder` structure, summary format, open/visible on click | pass | 25 |
| F-12 | Fallback marker: "Unrecognized type" chip + notice for unregistered kinds, absent for registered kinds, never a destructive tone | pass | 24 (artifact pages) |
| F-13 | Loading→loaded frame stability under a 600ms artificial data delay | pass | 3 (doc-plan-pair, one registered artifact, ref-roadmap) |
| F-14 | No horizontal overflow at 420px (document, `main`, and every `.document-overflow-boundary`) | fixed (`.document-reader-layout` grid track) | doc-findings, doc-milestones (2 kinds; latent for any future long-heading content) |
| F-15 | Dark-mode application (`html.dark`, and light/dark paint genuinely differ) | pass | all 29 |

## Foundation fixes

**1. [F-02] `.artifact-heading h1` line-height drifted from the reference pages' h1**
- **Symptom:** every document/plan-pair page's `h1` computed `line-height` was `76.8px` (at `fs-display-3` clamp max) vs. `ref-roadmap`'s `69.12px` for the identical font-size — a `--lh-none` (1.0) vs. `--lh-display` (0.9) mismatch. All other h1 typography properties (`fontSize`, `fontWeight`, `letterSpacing`, `fontFamily`) already matched.
- **File / rule:** `src/web/styles/globals.css`, `.artifact-heading h1` — `line-height: var(--lh-none)` → `line-height: var(--lh-display)`.
- **Before/after:** `h1LineHeight` on `doc-plan` (light, 1280) was `76.8px`; after the fix it matches `ref-roadmap`'s `69.12px` exactly (both derive from the same `--fs-display-3`/`--lh-display` pairing).
- Per D-10, the document side moved to match the reference pages, which were never edited.

**2. [F-02] `doc-plan-pair`'s summary body carried a duplicate `<h1>`**
- **Symptom:** `main` on the plan-pair page had two `<h1>` elements — `ArtifactHeader`'s own `Plan {id}` title, plus the embedded `SUMMARY.md` body's own `# Phase X Plan Y: … Summary` heading (every GSD summary template opens with one). `ArtifactPage` already strips this exact duplication (`dropLeadingTitle`) for single-document views; `plan-pair-page.tsx` never applied the same treatment to either half of the pair.
- **File / rule:** `src/web/pages/plan-pair-page.tsx` — added `dropLeadingTitle(document, title)` (imported from `./document-title.ts`, the same helper `ArtifactPage` uses) via `useMemo` for both `pair.plan.document` and `pair.summary.document`, computed before the component's early returns (mirroring `ArtifactPage`'s own hook ordering).
- **Before/after:** `h1Count` on `doc-plan-pair` was `2` in every theme/width; after the fix it is `1`.
- This is systemic (every GSD `SUMMARY.md` opens with a title heading per the summary template), not a one-off — it would have recurred on every future plan pair with a summary.
- **Test contract update:** `test/presentation/coverage.test.ts`'s source-text contract asserted the literal `<DocumentView document={pair.plan.document}` / `pair.summary.document}` expressions; updated to assert the new `planDocument ?? pair.plan.document` / `summaryDocument ?? pair.summary.document` expressions. The render-order assertions (coverage matrix before plan before summary) were unaffected and still pass.

**3. [F-14] `.document-reader-layout`'s narrow-width grid track had no `minmax(0, …)` floor**
- **Symptom:** at 420px, `doc-findings` and `doc-milestones` overflowed the viewport horizontally (`document.documentElement.scrollWidth` 699px/541px vs. `innerWidth` 420px). Root cause traced via live DOM inspection: the `@media (max-width: 58rem)` override collapsed `.document-reader-layout` to `grid-template-columns: 1fr` — a bare `1fr` resolves to `minmax(auto, 1fr)`, so the track's minimum tracks its content's min-content width. An unbreakable long string (a `.document-outline-trigger`'s "On this page · <first section title>" label, or an unwrapped inline `<code>` span) then widened that single track — and every descendant computing a percentage width off it — past the viewport.
- **File / rule:** `src/web/styles/globals.css`, the `@media (max-width: 58rem)` block's `.document-reader-layout` rule — `grid-template-columns: 1fr` → `grid-template-columns: minmax(0, 1fr)` (the same `minmax(0, …)` floor the two-column layout's own second track already uses).
- **Before/after:** `doc-findings` at 420px: `docScrollWidth` 699px → 420px (no overflow); `doc-milestones`: 541px → 420px.
- Only 2 of 24 sampled kinds tripped this in the current corpus (the two documents happen to have long unbreakable outline labels), but the defect is in a shared file explicitly named in the plan's always-foundation list (`globals.css` rules for `.document-reader-layout`) and is latent for any future document with a similarly long first heading — fixed regardless of the 2-kind sample size.

## Harness corrections

Per the plan's own guidance ("If a check turns out to be wrong about the design language rather than the page… correct the check's exemption in the spec with a comment citing the design-language line — that is a harness fix, not a waiver"), four checks were corrected in `test/e2e/foundation-consistency.spec.ts` because live measurement showed the *check* was wrong, not the product:

1. **F-02 h1-typography equality — `ref-dashboard` exempted.** The dashboard's hero (`.position-copy h1`) is a documented, pre-existing, deliberately distinct pattern with its own narrow-width scale token (`--fs-display-narrow`, `clamp(2.65rem, 15vw, 4.3rem)`) — measured `63px` at 420px vs. `ref-roadmap`'s `44.8px` from the shared `--fs-display-3` token. The plan's own context notes already call out that the dashboard has "no `.page-intro`/`.lede`", unlike the other three reference pages and every document page. Comparing it against the shared `.page-intro h1` typography was never a sound equality.

2. **F-02 h1-offset envelope — widened from a ±2px reference-only band to a generous sanity ceiling.** Every document/plan-pair page renders `nav.artifact-breadcrumbs` above `.artifact-heading` — chrome none of the four reference pages have at all — and that breadcrumb nav legitimately wraps to 2–3 lines at 420px (measured ~56px tall on a representative 4-segment crumb trail, vs. 0px on any reference page). Pages carrying the F-12-required "Unrecognized type"/warning status chip add a further dedicated row before the h1. Both are real, load-bearing UI this same sweep requires elsewhere; collapsing them to chase a tight cross-family offset match would mean deleting real navigation and status signalling. The reference envelope itself swings from a 34px band at 1280px to comfortably covering document pages there, purely from the dashboard hero's own responsive scale — confirming this was never a stable, tight, cross-family invariant. The check still records the measurement and still fails on a truly runaway/broken offset (a generous ceiling above the reference envelope), but no longer treats the breadcrumb+chip overhead as a defect.

3. **F-05 status-chip tone — a toneless `.status-chip` is now allowed.** `ref-search`'s "N matches" count badge (`search-page.tsx`) renders `<span className="status-chip">` with no `data-tone` at all — a valid, pre-existing pattern the base `.status-chip` CSS rule renders meaningfully with no `[data-tone]` selector required. Dashboard, roadmap, and traceability's chips all carry a tone, but search's neutral count badge legitimately doesn't need one. Search is one of the four reference pages this task may not modify (and D-10 forbids editing a reference page to satisfy a check); the check was corrected to require a *present* tone to be a documented value, without mandating that every chip carry one.

4. **F-10 toggle stability — `height` dropped from the box-stability comparison.** Live measurement on a representative plan document: `main`'s height went from ~2507px (View mode — manifest-promoted blocks plus a *collapsed* `<details>` remainder, D-02) to ~18456px (Source mode — the complete raw document) while `x`/`width` stayed pixel-identical (`0`, `1280`). That is the intended difference in content amount between the two modes, not a layout-instability defect — comparing `height` would have flagged the toggle as "unstable" on every single page by design. `x`/`width` are the actual invariant (no horizontal reflow or scrollbar-induced shift), and both were already passing.

## Per-type backlog

Grouped by artifact kind — reported, not fixed, per the triage rule (confined to 1–2 kinds' manifest entries or content, not a shared file):

### requirements

| Check | Symptom | Waiver reason |
|-------|---------|----------------|
| F-02 | `h1Count=2` on `doc-requirements` (both themes, both widths) | The sampled fixture (`.planning/milestones/v1.0-REQUIREMENTS.md`) is an archival document that embeds a full prior `REQUIREMENTS.md` body — including that document's own `# Requirements: Labelore` title — beneath the archive's own `# Requirements Archive: v1.0 MVP` heading. `dropLeadingTitle()` only strips the leading H1 matching the artifact's own title, so the embedded document's H1 survives into the rendered body. This is a property of this one archived file's content, not the renderer, the fallback view, or any shared component — recorded in `test/e2e/known-per-type.json`. |

### Registered kinds with no fixture in this corpus

`validation`, `coverage`, `learnings` — all three are registered in `VIEW_KINDS` (`src/web/views/kinds.ts`) but no file of that kind exists anywhere in this repo's `.planning/` tree, so `buildPageMatrix` reports them under `kindsWithoutFixture` and the sweep never exercises their views. Not a defect; nothing to fix or waive. A future quick task adding a fixture (or testing against a corpus that has one) would need to re-run the sweep to get first-time coverage of these three.

## Review

- **Screenshots:** `test/e2e/screenshots/{light,dark}-{1280,420}/*.png` — one PNG per page × theme × width (116 total), full-page, animations disabled. Gitignored; regenerated on every run.
- **Machine-readable results:** `test/e2e/screenshots/results.json` — one entry per check × page × theme × width, each carrying `pass`/`waived`/`detail`. 1771 entries in the final green run; 0 non-waived failures.
- **Re-run:** `npm run test:e2e` (optionally `-- --grep "sweep light 1280"` for a faster single-matrix pass). The harness always boots its own server on port 4199 — port 4173 (the systemd instance) is never touched, referenced, or restarted by any part of this suite.
- **Unit test suite:** `npm test` reports 4 pre-existing failures in `test/section-projection.test.ts`, entirely unrelated to this task. They reference fixture paths under `.planning/phases/05-per-type-document-views/05-DISCUSSION-LOG.md` and `05-CONTEXT.md`, which no longer exist after the v1.1 milestone archival (`chore: archive v1.1 milestone files`, commit `7866290`) moved that phase's artifacts elsewhere. Confirmed pre-existing by running the same test file against commit `d1aaa33` (this task's own Task 2 commit, before any Task 3 changes) — the failure reproduces identically. Out of this task's scope per the executor's scope-boundary rule; not fixed here.
- **Visual spot-check beyond what the assertions can see:** reviewing the final screenshot set, no additional clipped text, broken images, or obviously wrong reflow was observed on any of the 116 PNGs beyond what the checks above already caught and resolved.
