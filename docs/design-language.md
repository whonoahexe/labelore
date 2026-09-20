# Design Language

## Purpose

This document is the single, written-down source of the visual and naming conventions the
dashboard, roadmap, traceability and search pages already share — nothing here is new invention,
it is the existing `base-sera`-derived system read directly out of `src/web/styles/globals.css`
and the four reference pages. `test/web/class-vocabulary.test.ts` derives its allowlist mechanically
from the tables below (table rows whose first cell is one backticked token), so this doc and the
enforcing test can never drift apart: there is no second, test-side list of sanctioned names. When
the vocabulary test runs against `dashboard-page.tsx`, `roadmap-page.tsx`, `traceability-page.tsx`
or `search-page.tsx` and one of them fails, the vocabulary was written down incompletely — the fix
is always to add the missing name to this document, never to edit the reference page.

## Shared vocabulary

| Class | Role | Defined at |
|---|---|---|
| `page-stack` | Page-level vertical rhythm wrapper (`<main>`) | globals.css:822, 2508 |
| `page-intro` | Flex header row: `<h1>` + optional trailing content | globals.css:848, 1399 |
| `eyebrow` | Uppercase kicker label, `--primary` colored, `--fs-2`, `--font-heading`, `--ls-widest` | globals.css:828 |
| `lede` | One-sentence muted-foreground intro under a page heading, `--fs-fluid-1`, `--lh-relaxed`, capped at 48ch | globals.css:856 |
| `artifact-lead` | The document-page equivalent of `.lede`, rendered by `ArtifactHeader`'s `lead` prop | globals.css:2744 |
| `artifact-heading` | The document-page header block (`ArtifactHeader`'s title row) | globals.css:2167, 2725 |
| `artifact-breadcrumbs` | The document-page breadcrumb nav | globals.css:2154, 2716 |
| `artifact-path` | The document-page file-path caption | globals.css:2174, 2739 |
| `artifact-page` | The `<main>` wrapper for every document page (`artifact-page.tsx`, `plan-pair-page.tsx`) | globals.css:2148 |
| `section-heading` | Flex row heading pattern | globals.css:1281 |
| `compact` | Modifier on `.section-heading`: adds a bordered icon well + bottom rule | globals.css:1289 |
| `status-chip` | The tone-badge base class — pair with a `data-tone=…` attribute; see `## Tones` below | globals.css:910–953, 3458–3491 |
| `empty-note` | Absence copy — quiet inline paragraph | globals.css:1723 |
| `empty-flow` | Absence copy — icon + message block | globals.css:1369–1392, 1730 |
| `quiet-state` | Icon + muted message row, `--primary`-tinted icon | globals.css:1369–1392 |
| `notice` | Bordered aside block, `--card-veil` background, plain by default | globals.css:1792–1806 |
| `destructive` | Modifier on `.notice` (adds a left rule) and a `status-chip`/`Button` tone/variant value | globals.css:1797 |
| `source-note` | Muted-foreground caption text | globals.css:953 |
| `source-link` | Underlined link that brightens to `--foreground` + `--primary` underline on hover | globals.css:2512 |
| `artifact-metadata` | The collapsed-disclosure `<details>` pattern: bordered `.card-veil` box, `<summary>` with a trailing count span | globals.css:2757 |
| `metadata-panels` | Grid wrapper for one or more `.metadata-panel` cards | globals.css:2181, 2780 |
| `metadata-panel` | One labeled frontmatter/structured-data card | globals.css:2187, 2788 |
| `metadata-panel-known` | Modifier on `.metadata-panel` for a recognized presentation shape (no distinct rule beyond the base card — the literal class exists so the panel's presentation is inspectable/stylable later) | src/web/pages/artifact-page.tsx:112 |
| `metadata-panel-generic` | Modifier on `.metadata-panel` for an unrecognized presentation shape — dashed border | globals.css:2201 |
| `metadata-record` | Labeled dt/dd field-list rendering for a nested/record-shaped structured value | globals.css:2205–2230, 2799 |
| `metadata-list` | Labeled dt/dd field-list rendering for a flat list of structured fields | globals.css:2205–2230, 2799 |
| `metadata-scalar` | A single scalar value inside a `.metadata-record`/`.metadata-list` row | globals.css:2230 |
| `metadata-empty` | Italic muted placeholder for an empty structured value | globals.css:2235 |
| `document-reader-layout` | The two-column (outline + canvas) grid every document page uses | globals.css:2807 |
| `document-canvas` | The right-hand reading column inside `.document-reader-layout` | globals.css:2904 |
| `document-outline` | Sticky left-column "On this page" nav, `--fs-3` links, hover → `--primary` | globals.css:2821 |
| `document-outline-trigger` | The narrow-width sticky disclosure trigger that opens the outline as a popover (D-12) | new — Phase 5 §7 |
| `document-view-toggle` | The View/Source control mounted in `ArtifactHeader`'s `children` slot (D-01/D-03) | globals.css:2864 |
| `view-block` | One promoted or remainder block inside a per-type view's canvas | globals.css:2871 |
| `artifact-document` | The full rendered-markdown document body (Source mode, and inside promoted sections) | globals.css:2240, 2910 |
| `document-overflow-boundary` | Wraps tables/code blocks so wide content scrolls instead of blowing out the canvas width | globals.css:1923 |
| `roadmap-loading` | Reference-page-specific but load-bearing per REQUIREMENTS.md §Implementation Context — leave untouched | roadmap-page.tsx, search-page.tsx, traceability-page.tsx |
| `search-group-label` | Reference-page-specific but load-bearing per REQUIREMENTS.md §Implementation Context — leave untouched | search-page.tsx:3405, traceability-page.tsx |
| `render-issue` | Modifier combined with `.notice` for a runtime rendering-failure aside (`className="notice render-issue"`) | src/web/pages/artifact-page.tsx:335 |
| `sr-only` | Visually-hidden, screen-reader-only text | globals.css:1857 |
| `min-w-0` | Layout utility forcing a flex/grid child's min-width to 0 so its content can shrink/wrap | src/web/pages/roadmap-page.tsx:90 (no dedicated CSS rule — relies on the property being unset elsewhere) |
| `text-link` | Inline text link style distinct from `.source-link` | globals.css:1412 |

## Tones

| Tone | Meaning | Used for |
|------|---------|----------|
| `active` | In progress / currently selected — accent-tinted | A chosen discussion-log option, the current phase while in progress, an active outline entry |
| `complete` | Finished / matched — accent-tinted (shares styling with `active`) | A completed phase or plan, an exact traceability match |
| `quiet` | Neutral coverage gap — muted-foreground, never alarming | An unrecognized/unmanifested type, a non-exact traceability match, a phase not yet started |
| `destructive` | Genuine read/parse failure only | The "Unreadable" artifact-parse chip; never used for a merely-unrecognized type |
| `warning` | Partial read/parse degradation only | The "Warning" artifact-parse chip |
| `in-flight` | A phase or item currently being worked | Traceability covering-phase signal |
| `missing` | An expected item that has not appeared | Traceability covering-phase signal |

## Families

- **`history-*` family** (`history-section`, `history-list`, `history-milestone`, `history-tree`) —
  the shared disclosure-tree pattern used by both the roadmap and traceability pages to render
  nested, collapsible milestone/phase history. CSS-owned; JSX call sites use these four literal
  class names directly (never a glob) in `roadmap-page.tsx` and `traceability-page.tsx`.
- **`plan-section*` family** — the rendered-markdown class names `renderPlanRange` emits onto plan
  document DOM nodes (`data-plan-ordinal`, `data-plan-section`, `data-plan-gate` attributes, not
  standalone classes) so the PLAN task-structure index (VIEW-04) and the outline can read plan
  structure without re-parsing. Not a class-name family in the vocabulary-test sense — these are
  data attributes, listed here only so their existence is documented alongside the disclosure-tree
  family above.

## Reserved view-local namespace

A class matching `view-<kind>-<suffix>` is allowed **without a doc entry** when `<kind>` is a
member of `VIEW_LOCAL_PREFIXES` in `src/web/views/kinds.ts` (every registered view kind, plus the
literal `unrecognized` fallback used by VIEW-06's unmanifested/unknown-shape marker). This is the
escape route for chrome that is genuinely private to one view — a card wrapper, a grouping `<div>`,
an options list — and it keeps every *shared* name a deliberate, documented act instead of letting
private view chrome silently pile into the shared table.

The moment two views want the same treatment, that name is promoted out of the view-local namespace
and into `## Shared vocabulary` above — a second view reusing a `view-x-*` name unchanged is exactly
the drift signal the vocabulary test exists to catch.

A **bare** `view-x` (no kind segment between `view-` and the suffix) is **not** in this namespace
and must be documented as a shared name — this is why `view-block` sits in the shared table above
rather than being treated as view-local.

Examples already in use: `view-discussion-log-options` / `view-discussion-log-option` (view
`discussion-log`). Future per-view chrome follows the same shape: `view-verification-check`
(view `verification`), `view-plan-task-index` (view `plan`).

## Language beyond names

The vocabulary above is the noun list; these are the conventions that govern how any new Phase 5
element is actually written, regardless of class name:

- **Token-only spacing.** Every new spacing value uses a `--space-*` (or `--space-fluid-*`) custom
  property from `globals.css:172–223`. Never a literal `px` or `rem` value in new CSS.
- **Exactly two weights for new UI.** `--fw-medium` (500, body/list text) and `--fw-semibold` (600,
  labels/chips/headings). `--fw-bold` is reserved for 4 existing numeral/count call sites — do not
  introduce a fifth.
- **The `--fs-1`…`--fs-7` scale** (plus the fluid/display steps) is the complete type scale. Reuse
  a step; never add a ninth size.
- **The 10% accent reservation.** `--primary` is reserved, in this phase's new UI, for exactly: the
  eyebrow kind label, the chosen-option chip in a discussion-log question, the gate chip in a
  plan's task index, the active/current outline entry, and the document-view toggle's active-state
  indicator. Never used for body text, never used decoratively.
- **Squared corners.** `border-radius` is unset (0) everywhere except 3 existing call sites of
  `--radius-sm`. Treat radius as the exception, never the default, for any new element.
- **Light + dark parity.** Every new rule is checked against both `:root` and `.dark` — both
  palettes are fully declared in `globals.css`.
- **`EMPTY_STATE_MESSAGE` reused verbatim.** The shared string `'Nothing here yet.'` is the only
  sanctioned absence copy when a visible absence surface is genuinely needed; absence is silent
  (no copy at all) everywhere else (D-06).
- **`ArtifactHeader` is the only document-page header.** Every per-type view reuses it unmodified
  rather than forking a bespoke header per kind.

## Surface-scoped registered names

Enumerated by scanning `className` literals across the reference pages, the shared shell/navigation
components, and the document-page chrome — the same extraction `test/web/class-vocabulary.test.ts`
runs. This appendix is **enumerated, not designed**: the shared vocabulary above is the language;
everything below is the inventory that makes D-10 ("reference pages pass by construction") hold. A
handful of entries (`ghost`, `sm`, `icon-sm`) are `Button` `variant`/`size` prop values that the
text-scan picks up because they sit inside the same `className={buttonVariants({ ... })}`
expression as a real class name — documented here rather than taught to the scanner, per this
plan's "no AST tooling" constraint.

### Dashboard

| Class | Surface | Note |
|---|---|---|
| `attention-action` | Dashboard | |
| `attention-list` | Dashboard | |
| `attention-page-status` | Dashboard | |
| `attention-pagination` | Dashboard | |
| `attention-pagination-actions` | Dashboard | |
| `attention-panel` | Dashboard | |
| `checkpoint-badge` | Dashboard | |
| `checkpoint-callout` | Dashboard | |
| `checkpoint-content` | Dashboard | |
| `checkpoint-header` | Dashboard | |
| `checkpoint-link` | Dashboard | |
| `dashboard-grid` | Dashboard | |
| `dashboard-loading` | Dashboard | |
| `dashboard-page` | Dashboard | |
| `immediate-work` | Dashboard | |
| `item-kind` | Dashboard | |
| `milestone-label` | Dashboard | |
| `next-preview` | Dashboard | |
| `next-primary` | Dashboard | |
| `plan-breakdown-pills` | Dashboard | |
| `plan-pill` | Dashboard | |
| `plan-progress-headline` | Dashboard | |
| `plan-progress-summary` | Dashboard | |
| `position-copy` | Dashboard | |
| `position-hero` | Dashboard | |
| `position-meta` | Dashboard | |
| `preview-empty` | Dashboard | |
| `preview-list` | Dashboard | |
| `preview-panel` | Dashboard | |
| `progress-empty` | Dashboard | |
| `progress-panel` | Dashboard | |
| `progress-panel-header` | Dashboard | |
| `progress-panel-meta` | Dashboard | |

### Roadmap

| Class | Surface | Note |
|---|---|---|
| `active-flow` | Roadmap | |
| `blocked-by` | Roadmap | |
| `criteria-list` | Roadmap | |
| `history-list` | Roadmap | shared with Traceability |
| `history-milestone` | Roadmap | shared with Traceability |
| `history-section` | Roadmap | shared with Traceability |
| `history-tree` | Roadmap | shared with Traceability |
| `milestone-flow` | Roadmap | |
| `milestone-version` | Roadmap | |
| `phase-detail-grid` | Roadmap | |
| `phase-disclosure` | Roadmap | |
| `phase-facts` | Roadmap | |
| `phase-goal` | Roadmap | |
| `phase-statuses` | Roadmap | |
| `requirement-list` | Roadmap | |
| `requirement-page-status` | Roadmap | |
| `requirement-pagination` | Roadmap | |
| `requirement-pagination-actions` | Roadmap | |
| `roadmap-marker` | Roadmap | |
| `roadmap-page` | Roadmap | |
| `roadmap-phase` | Roadmap | |
| `roadmap-phase-body` | Roadmap | |
| `roadmap-phase-header` | Roadmap | |
| `roadmap-spine` | Roadmap | |
| `wave-band` | Roadmap | |
| `wave-plan-copy` | Roadmap | |
| `wave-stack` | Roadmap | |

### Traceability

| Class | Surface | Note |
|---|---|---|
| `history-list` | Traceability | shared with Roadmap |
| `history-milestone` | Traceability | shared with Roadmap |
| `history-section` | Traceability | shared with Roadmap |
| `history-tree` | Traceability | shared with Roadmap |
| `trace-bar` | Traceability | |
| `trace-bar-complete` | Traceability | |
| `trace-bar-in-flight` | Traceability | |
| `trace-bar-missing` | Traceability | |
| `trace-bar-segment` | Traceability | |
| `trace-bar-uncovered` | Traceability | |
| `trace-bar-unresolved` | Traceability | |
| `trace-category` | Traceability | |
| `trace-category-bar` | Traceability | |
| `trace-category-readout` | Traceability | |
| `trace-coverage-percent` | Traceability | |
| `trace-coverage-percent-label` | Traceability | |
| `trace-coverage-percent-value` | Traceability | |
| `trace-covering-line` | Traceability | |
| `trace-covering-lines` | Traceability | |
| `trace-dangling-text` | Traceability | |
| `trace-deferred-filter-note` | Traceability | |
| `trace-filter-button` | Traceability | |
| `trace-filter-input` | Traceability | |
| `trace-filters` | Traceability | |
| `trace-marker` | Traceability | |
| `trace-requirement-stat-tiles` | Traceability | |
| `trace-row` | Traceability | |
| `trace-row-body` | Traceability | |
| `trace-row-flags` | Traceability | |
| `trace-row-id` | Traceability | |
| `trace-row-rail` | Traceability | |
| `trace-row-rail-count` | Traceability | |
| `trace-row-text` | Traceability | |
| `trace-rows` | Traceability | |
| `trace-stat-tile` | Traceability | |
| `trace-stat-tiles` | Traceability | |
| `trace-status-filters` | Traceability | |
| `trace-summary` | Traceability | |
| `trace-summary-headline` | Traceability | |
| `trace-toggle` | Traceability | |
| `trace-toggle-thumb` | Traceability | |
| `trace-toggle-track` | Traceability | |
| `traceability-page` | Traceability | |

### Search

| Class | Surface | Note |
|---|---|---|
| `attention-more` | Search | shared with Dashboard |
| `search-group` | Search | |
| `search-group-rows` | Search | |
| `search-groups` | Search | |
| `search-result-card` | Search | |
| `search-result-card-header` | Search | |
| `search-result-card-title` | Search | |
| `search-result-path` | Search | shared with Shell and navigation |
| `search-snippet` | Search | |
| `search-snippet-toggle` | Search | |
| `search-snippets` | Search | |

### Shell and navigation

| Class | Surface | Note |
|---|---|---|
| `app-shell` | Shell and navigation | |
| `brand` | Shell and navigation | |
| `brand-mark` | Shell and navigation | |
| `brand-meta` | Shell and navigation | |
| `brand-project` | Shell and navigation | |
| `brand-project-name` | Shell and navigation | |
| `brand-separator` | Shell and navigation | |
| `brand-wordmark` | Shell and navigation | |
| `ghost` | Shell and navigation | `Button` `variant` prop value, not a CSS class — see appendix note above |
| `icon-sm` | Shell and navigation | `Button` `size` prop value, not a CSS class — see appendix note above |
| `moon-icon` | Shell and navigation | |
| `route-progress` | Shell and navigation | |
| `route-progress-bar` | Shell and navigation | |
| `search-dialog` | Shell and navigation | |
| `search-dialog-backdrop` | Shell and navigation | |
| `search-dialog-empty` | Shell and navigation | |
| `search-dialog-esc-hint` | Shell and navigation | |
| `search-dialog-field` | Shell and navigation | |
| `search-dialog-footer` | Shell and navigation | |
| `search-dialog-hint` | Shell and navigation | |
| `search-dialog-input` | Shell and navigation | |
| `search-dialog-item` | Shell and navigation | |
| `search-dialog-legend` | Shell and navigation | |
| `search-dialog-list` | Shell and navigation | |
| `search-dialog-notice` | Shell and navigation | |
| `search-dialog-results` | Shell and navigation | |
| `search-dialog-status` | Shell and navigation | |
| `search-dialog-viewport` | Shell and navigation | |
| `search-result-path` | Shell and navigation | shared with Search |
| `search-result-title` | Shell and navigation | shared with Search |
| `search-trigger` | Shell and navigation | |
| `search-trigger-kbd` | Shell and navigation | |
| `shell-content` | Shell and navigation | |
| `shell-controls` | Shell and navigation | |
| `shell-header` | Shell and navigation | |
| `shell-nav` | Shell and navigation | |
| `shell-notice` | Shell and navigation | |
| `shell-outlet` | Shell and navigation | |
| `sidebar-drawer` | Shell and navigation | |
| `sidebar-drawer-backdrop` | Shell and navigation | |
| `sidebar-drawer-close` | Shell and navigation | |
| `sidebar-drawer-header` | Shell and navigation | |
| `sidebar-drawer-title` | Shell and navigation | |
| `sidebar-trigger` | Shell and navigation | |
| `skip-link` | Shell and navigation | |
| `sm` | Shell and navigation | `Button` `size` prop value, not a CSS class — see appendix note above |
| `snapshot-dot` | Shell and navigation | |
| `snapshot-label` | Shell and navigation | |
| `snapshot-pill` | Shell and navigation | |
| `snapshot-status` | Shell and navigation | |
| `sun-icon` | Shell and navigation | |
| `theme-icon` | Shell and navigation | |
| `theme-toggle` | Shell and navigation | |

### Tree navigator

| Class | Surface | Note |
|---|---|---|
| `tree-badge` | Tree navigator | |
| `tree-chevron` | Tree navigator | |
| `tree-chevron-spacer` | Tree navigator | |
| `tree-children` | Tree navigator | |
| `tree-disclosure` | Tree navigator | |
| `tree-group-label` | Tree navigator | |
| `tree-navigator` | Tree navigator | |
| `tree-node` | Tree navigator | |
| `tree-node-label` | Tree navigator | |
| `tree-node-row` | Tree navigator | |
| `tree-root` | Tree navigator | |
| `tree-warning-indicator` | Tree navigator | |

### Reference preview

| Class | Surface | Note |
|---|---|---|
| `reference-preview` | Reference preview | |
| `reference-preview-close` | Reference preview | |
| `reference-preview-facts` | Reference preview | |
| `reference-preview-heading` | Reference preview | |
| `reference-preview-open` | Reference preview | |
| `reference-preview-positioner` | Reference preview | |

### Document pages

| Class | Surface | Note |
|---|---|---|
| `artifact-empty` | Document pages | |
| `artifact-loading` | Document pages | |
| `artifact-warning-disclosure` | Document pages | |
| `copy-field` | Document pages | |
| `copy-field-button` | Document pages | |
| `copy-field-label` | Document pages | |
| `copy-field-row` | Document pages | |
| `copy-field-value` | Document pages | |
| `coverage-matrix` | Document pages | |
| `coverage-table-boundary` | Document pages | |
| `invalid-project-detail` | Document pages | |
| `invalid-project-icon` | Document pages | |
| `invalid-project-panel` | Document pages | |
| `invalid-project-screen` | Document pages | |
| `invalid-project-theme-slot` | Document pages | |
| `plan-open-notice` | Document pages | |
| `plan-pair-document` | Document pages | |
| `plan-pair-jumps` | Document pages | |
| `plan-pair-loading` | Document pages | |
| `plan-pair-page` | Document pages | |
| `warning-disclosure-body` | Document pages | |
| `warning-disclosure-chevron` | Document pages | |
| `warning-disclosure-label` | Document pages | |
| `warning-document-warnings` | Document pages | |
| `warning-fields` | Document pages | |
| `warning-fields-label` | Document pages | |
| `warning-technical-details` | Document pages | |

## How to extend

1. **New shared name** — a new class two or more views/pages will use identically: add a row to
   `## Shared vocabulary` above *and* the CSS rule that backs it, in the same commit.
2. **New view-private name** — chrome genuinely local to one view: use the
   `view-<kind>-<suffix>` namespace (`## Reserved view-local namespace`); no doc entry needed.
3. **A reference page fails the vocabulary test** — the vocabulary was written down incompletely.
   Add the missing name to the appropriate table above. **Never** edit `dashboard-page.tsx`,
   `roadmap-page.tsx`, `traceability-page.tsx` or `search-page.tsx` to make the test pass (D-10).
