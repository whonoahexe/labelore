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
| `artifact-path` | The file-path value inside the warning technical details (`dd`) — no longer the header caption; the header offers the path as a copy button (`artifact-path-copy`) instead (quick-260923-jxp) | globals.css:2174, 2739 |
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
| `document-outline-positioner` | The `Popover.Positioner` wrapper around the narrow-width outline popup (D-12) | new — Phase 5 §7 |
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
| `document-cover` | sketch-004 B3 cover-sheet wrapper — `ArtifactHeader`'s optional `cover` prop | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-cover-copy` | Cover sheet: eyebrow/h1/lede/facts/path column | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-cover-facts` | Cover sheet: the one-line facts row | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-cover-controls` | Cover sheet: status chip + View/Source toggle column | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-cover-cells` | Cover sheet: the headline/glance/chapter-index row, pair with `data-glance` | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-cover-cell` | One cell inside `.document-cover-cells` | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-cover-glance` | Modifier on `.document-cover-cell` for the accent-topped "worth knowing" cell | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-cover-headline` | Cover sheet: the big number + label inside the headline cell | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-cover-pills` | Cover sheet: the row of supporting-count pills | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-cover-pill` | One supporting-count pill, typography mirrors `.plan-pill` but squared | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-chapter-index` | Cover sheet: the clickable "In this document" chapter list | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-chapter-index-number` | One chapter-index row's two-digit number | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-chapter-index-title` | One chapter-index row's title | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-chapter-index-count` | One chapter-index row's item count | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-chapter-bar` | The pinned bar shown once `.document-cover` scrolls out of view | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-chapter-bar-number` | Pinned bar: the current chapter's number | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-chapter-bar-title` | Pinned bar: the current chapter's title | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-chapter-bar-doc` | Pinned bar: the document title, hidden at the 42rem breakpoint | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-fold-tools` | The "Expand all"/"Collapse all" row above the first fold | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-fold` | One folded chapter — also carries `.view-block` (data-open attribute) | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-fold-title` | The fold's `h2` wrapper around `.document-fold-head` | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-fold-head` | The fold's clickable header button | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-fold-number` | The fold header's big muted number | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-fold-name` | The fold header's title — carries the heading size so status chips keep the inherited body line-height (F-05) | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-fold-rollup` | The fold header's roll-up status chips | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-fold-chevron` | The fold header's disclosure chevron (rotates via `[data-open='true']`) | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-fold-body` | A fold's revealed content, rendered only while open | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-item` | One item row inside a fold body | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-item-head` | An item row's ref/title + chips header line | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-item-ref` | An item row's reference label (e.g. "Q1", "Task 1") | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-item-title` | An item row's title | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-item-chips` | An item row's type-specific chip cluster | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-item-state` | An item row's state chip + chosen-answer text line | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-item-answer` | The chosen-answer text inside `.document-item-state` | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-item-more` | An item row's detail-toggle link + revealed detail wrapper | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-item-detail` | An item row's revealed detail block | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-item-detail-row` | One labeled row inside `.document-item-detail` | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-item-detail-label` | The optional label on a `.document-item-detail-row` | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-also` | The grid of secondary panels inside the Also chapter | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-also-panel` | One secondary panel inside `.document-also` | globals.css — sketch-004 B3 layout (quick-260922-3us) |
| `document-answer` | A discussion question's chosen/settled/custom answer card | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-answer-option` | The answer card's number+title line | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-answer-words` | The answer card's quoted "Your words" line | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-option-number` | An option's squared numeral badge — shared by the answer card and the numbered options list | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-option-title` | An option's title text | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-option-desc` | An option's description text | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-option-list` | The numbered "other options" disclosure list | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-option` | One row inside `.document-option-list` | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-item-note-toggle` | A question item's quiet note-reveal button, separate from the options disclosure | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-item-note` | A question item's revealed note text | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-item-note-mark` | The small inline marker on a note segment that started "Accepted gap:" | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-ghost` | A declined-area "Not discussed" row, placed after the real chapters — inert, no button/chevron/body | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-ghost-name` | A ghost row's declined-area name | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-endnotes` | The discussion-log's always-open back-matter sheet, replacing the folded Also chapter | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-endnotes-title` | The endnotes sheet's own heading (reads `also.title`, "Endnotes") | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-endnote` | One subsection inside the endnotes sheet (Claude's Discretion, Open Questions, Deferred Ideas) | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `document-endnote-title` | An endnote subsection's small-caps heading | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `artifact-path-copy` | ArtifactHeader's copy-path icon button, replacing the printed file-path caption on every artifact page | globals.css — discussion-log review fixes (quick-260923-jxp) |
| `artifact-meta-row` | ArtifactHeader's optional `meta` prop row (plain variant only) — holds the caller's meta content, then the copy-path button, then `children` | globals.css — CONTEXT brief (quick-260923-lju) |
| `figure-frame` | The titled figure wrapper (`<figure>`): bar, scrolling body, caption — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `figure-frame-bar` | The frame's top bar — title left, the `tools` slot, then (when scalable) Fit / Actual size and Grid chips, and Expand — sketch-009 B figure, view-agnostic (quick-260929-3x3, quick-260930-jzt) | globals.css — quick-260929-3x3 block |
| `figure-frame-title` | The frame bar's uppercase mono title — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `figure-frame-body` | The frame's body: no height cap, so the whole figure shows; scrolls horizontally when wider than the frame (both axes in the Expand dialog); `data-grid` draws a grid-paper backdrop (`document-overflow-boundary` alongside) — sketch-009 B figure, view-agnostic (quick-260929-3x3, quick-260930-jzt) | globals.css — quick-260929-3x3 block |
| `figure-frame-caption` | The dashed-rule caption under the body — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `figure-frame-dialog` | The Expand dialog popup — the same figure at actual size (Base UI Dialog, mirrors `sidebar-drawer`) — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `figure-frame-plain` | A figure the lift rejects (or a non-diagram block): plain text with its glyphs dimmed; never scrolls on its own (the frame body does) — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram` | The lifted diagram host: `position: relative`, holds the cards behind the text — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-fit` | The wrapper the Fit to width scale is measured against; `data-fit` clips the unscaled layout box so Fit never shows a horizontal scrollbar — sketch-009 B figure, view-agnostic (quick-260929-3x3, quick-260930-jzt) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-card` | One decorative card behind the text (`data-kind` box / node), placed from the model's `frame`; `data-hot` marks the innermost card under the pointer; borders and fills read `--figure-card-border` and `--figure-node-*` — sketch-009 B figure, view-agnostic (quick-260929-3x3, quick-260930-jzt) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-text` | The `<pre>` of real ASCII text, above the cards; never scrolls on its own (the frame body does) — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-row` | One fixed-height line of the diagram; `data-spacer` rows (`aria-hidden`) keep stacked step cards apart — sketch-009 B figure, view-agnostic (quick-260929-3x3, quick-260930-jzt) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-node` | A node/box title — semibold — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-sub` | A second line inside a node — muted — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-note` | Free text beside boxes — muted annotation, slanted by a synthetic oblique scoped to notes (`font-synthesis-style`), so the monospace grid holds — sketch-009 B figure, view-agnostic (quick-260929-3x3, quick-260930-jzt) | globals.css — quick-260929-3x3 block |
| `lane-diagram` | The lanes-by-kind diagram root: the canvas plus the details panel beside it (`data-panel` while a node is selected) — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-canvas` | The lane diagram's measured column; `data-fit` clips the unscaled layout box so Fit never shows a horizontal scrollbar — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-stage` | The positioned stage the lanes, wires and nodes sit in, sized from the layout (`role="group"`, labelled with the node and wire counts) — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-lane` | One kind's column band (`data-shade` on every other lane) — muted `--figure-lane` fill behind its nodes — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-lane-head` | A lane's icon and kind name in mono uppercase ("Service & steps" only when the lane holds a step) — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-wires` | The `aria-hidden` svg layer under the nodes that holds every wire and arrowhead — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-wire` | One orthogonal wire with rounded elbows, stroked in `--figure-wire` — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-arrow` | A wire's arrowhead triangle, filled in `--figure-wire` — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-node` | One graph node, a button: kind icon, label, subtitle and `+N`; `data-kind` carries its kind, `data-compact` a narrow node; edges read `--figure-card-border`, hover `--figure-node-border` — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-icon` | A node's kind icon well — `--muted` with the `--figure-icon` glyph; only the Client icon takes `--primary-tint` and `--primary` — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-text` | A node's label-and-subtitle stack — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-label` | A node's label, clamped to two lines, semibold (`data-code` sets it in mono at the smaller step) — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-sub` | A node's one-line muted subtitle — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-more` | The `+N` hidden-detail count on a node's top edge — mono, muted — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-fallback` | The quiet "Shown as drawn" line over the lifted figure — a `quiet` chip and "This figure keeps the author's layout." — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-wire-label` | A wire's label near its target — one line, italic, muted, ellipsised, with the full text in `title` — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-group` | A group the author boxed around several nodes: a dashed `--figure-card-border` region on `--figure-group-fill`, under the wires — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-group-label` | A group's mono uppercase label (`Auth middleware`) at its top left — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-panel` | The details `<aside>` beside the diagram (below it under 42rem) for the selected node — its details, notes, From and To with wire labels, and As written — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-panel-head` | The panel's top row: kind icon, title and the Close chip — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-panel-title` | The selected node's label — a paragraph, not a heading, so the page outline does not change (`data-code` sets it in mono) — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-panel-sub` | The selected node's subtitle, muted — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-panel-section` | A panel section label (kind, Details, Notes, From, To, As written) in mono uppercase — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-panel-pre` | A panel `<pre>` block: the node's details, or its text as the author wrote it — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `lane-diagram-panel-list` | The From / To / Notes lists — a wire's label follows the node name in italic muted — sketch-012 B figure, view-agnostic (quick-260930-mp6) | globals.css — quick-260929-3x3 block |
| `clean-tree` | The clean-list directory tree (`<ul>`), rendered inside the same `FigureFrame` as the diagram (titled Directory structure); a single-child folder chain with no intermediate notes collapses into one collapsible row — sketch-009 B figure, view-agnostic (quick-260929-3x3, quick-260930-jzt) | globals.css — quick-260929-3x3 block |
| `clean-tree-count` | The `F files · D folders` count — now in the figure frame bar — sketch-009 B figure, view-agnostic (quick-260929-3x3, quick-260930-jzt) | globals.css — quick-260929-3x3 block |
| `clean-tree-row` | One tree row: name column, notes column (`data-badge` NEW / EXTEND / MODIFIED / EXISTING, `data-dir` on folders); faint hairline separators and faint indent guides at a --space-6 step — sketch-009 B figure, view-agnostic (quick-260929-3x3, quick-260930-jzt) | globals.css — quick-260929-3x3 block |
| `clean-tree-name` | The indented name cell with its Folder/File icon — a --space-6 indent step per depth — sketch-009 B figure, view-agnostic (quick-260929-3x3, quick-260930-jzt) | globals.css — quick-260929-3x3 block |
| `clean-tree-folder` | A collapsible folder's toggle button (`aria-expanded`) — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `clean-tree-note` | The notes cell — badge chip plus the `# comment` — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |

## Tones

| Tone | Meaning | Used for |
|------|---------|----------|
| `active` | In progress / currently selected — accent-tinted | A chosen discussion-log option, the current phase while in progress, an active outline entry, a sketch-004 B3 item's "Chosen"/"Claude chose" state chip, (quick-260923-jxp) a discussion item's "Custom answer" state chip, and (quick-260925-3ug) a CONTEXT specific idea's Rule chip, and (quick-260929-3x3) a RESEARCH tree's NEW badge, and (quick-261001-qk7) on a UAT page the Testing status chip, the current-test card, its Now chip and the ring on its square |
| `complete` | Finished / matched — accent-tinted (shares styling with `active`) | A completed phase or plan, an exact traceability match, a sketch-004 B3 document's "N of N decided"/"Passed" cover status and a fully-verified item's state chip, and (quick-260929-3x3) a RESEARCH viable alternative and high (or medium-high) confidence, and (quick-260930-wfs) on a PATTERNS page an exact match chip and the exact segment of the match-quality meter, and (quick-261001-qk6) on a UI-SPEC page a PASS dimension and the Signed off chip, a covered state (chip, meter segment and matrix square), the Initialized chip and the registry's No vetting needed verdict, and (quick-261001-qk7) on a UAT page a pass chip, square and result-bar segment, a Complete or Passed status, a resolved gap status and the Resolved strip, and (quick-261017-18a) on a VERIFICATION page the Passed chip and frame, a holding truth square (verified, holds incidentally or override) and the Holds row, and a satisfied requirement or one with a caveat |
| `quiet` | Neutral coverage gap — muted-foreground, never alarming | An unrecognized/unmanifested type, a non-exact traceability match, a phase not yet started, every sketch-004 B3 roll-up chip and Also-chapter panel chip, and (quick-260923-jxp) an unresolved discussion item's "Open" state chip, a chosen answer's qualifier chip, a declined-area ghost row's "Not discussed" chip, and (quick-260925-3ug) a CONTEXT specific idea's Note chip, and (quick-260929-3x3) on a RESEARCH page a rejected alternative, a resolved open question, an EXISTING tree badge, MEDIUM/LOW pitfall chips, F-codes, already-pinned / host-binary package badges and an OK seam verdict, and (quick-260930-mp6) the RESEARCH diagram's Shown as drawn fallback chip, and (quick-260930-wfs) on a PATTERNS page a role match (and an unrated) chip, the Guidance chip on an assignment that names no classified file, and the role segment of the meter, and (quick-261001-qk6) on a UI-SPEC page a not-run dimension and the Sign-off not run chip, a dismissed state (the quiet dash and meter segment), the Not initialized chip and a registry gate that is not required, and (quick-261001-qk7) on a UAT page a skipped and a (dashed) pending result, minor and cosmetic severity, the Not diagnosed yet chip and an unrecognised result, and (quick-261017-18a) on a VERIFICATION page an unknown status, an info or clear anti-pattern row, resolved human checks, the dashed Scope not stated meter and the Also chips, and (quick-261023-u13) on a NOTE page a Rejected flag |
| `destructive` | Genuine read/parse failure only | The "Unreadable" artifact-parse chip; never used for a merely-unrecognized type; never used by any sketch-004 B3 document-content chip (state/rollup/pill), which stay within `active`/`complete`/`quiet`/`in-flight`/`missing` |
| `warning` | Partial read/parse degradation only | The "Warning" artifact-parse chip; never used by any sketch-004 B3 document-content chip, same rule as `destructive` above |
| `in-flight` | A phase or item currently being worked, or waiting on someone | Traceability covering-phase signal, a sketch-004 B3 document's "Awaiting checkpoint"/"Gaps found" cover status, and the CONTEXT brief's open questions (open-question chips, an area's "N open" chip, the "open for the researcher" stat and panel rule), and (quick-260925-3ug) a CONTEXT specific idea's Leaning chip plus a deferred idea's "Revisit if" label, and (quick-260929-3x3) on a RESEARCH page a SUS package badge and the Flagged lane, a HIGH pitfall, an open question, an EXTEND or MODIFIED tree badge, mid/mixed confidence, a later-phase alternative, and the ASSUMED evidence marker, and (quick-260930-wfs) on a PATTERNS page a partial match chip and meter segment, and the mapper's note rule, and (quick-261001-qk6) on a UI-SPEC page a FLAG dimension and a flagged sign-off chip, a backstop state (chip, meter segment and half-filled square), the Vetting required verdict and a required registry gate, and (quick-261001-qk7) on a UAT page a blocked result, major severity, a Partial or Diagnosed status, the Reason box rule and the ⚑ Summary mismatch line, and (quick-261017-18a) on a VERIFICATION page the Human needed chip and frame, a not-proven truth square (unverified, partly verified, or dashed could-not-check), the Needs a person row, the slips and steps, a non-critical gap number and a warning anti-pattern rule |
| `missing` | An expected item that has not appeared | Traceability covering-phase signal, a sketch-004 B3 gap item's "Failed" state chip, and (quick-260929-3x3) on a RESEARCH page the Removed lane and a SLOP verdict, a CRITICAL pitfall, a blocking environment chip and a ✗, a do-not-use alternative, low confidence, and a bad audit signal (a fresh package, few downloads, no repo), and (quick-260930-wfs) on a PATTERNS page a no-analog (New) chip, the new-ground meter segment, the "part new" flag and the Why nothing matches box, and (quick-261001-qk6) on a UI-SPEC page a BLOCK or FAIL dimension and a blocked sign-off chip, an unresolved state (chip, meter segment and outlined square) and the Never chip on a colour role, and (quick-261001-qk7) on a UAT page an issue chip, square and result-bar segment, blocker severity, a failed or open gap status and the Reported quote rule, and (quick-261017-18a) on a VERIFICATION page the Gaps found chip and frame, a failed truth square, the Blocked row, a critical gap number, the blocker anti-pattern cards and a failed Automated count, and (quick-261023-u13) on a NOTE page an Open question label and index, a Blocked or open-question flag, Promoted: No and the Open / blocked count, and (Phase 8) a remembered project that is expected but cannot be found or read: the switcher and landing 'Unavailable' chip |

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
  indicator. Never used for body text, never used decoratively. sketch-004 B3 (quick-260922-3us)
  extends this same reservation to: the cover sheet's `.document-cover-glance` cell's top rule, the
  pinned chapter bar's current-chapter number, and every cover/panel eyebrow (`.document-cover-copy
  .eyebrow`, `.document-cover-cell .eyebrow`, `.document-also-panel .eyebrow`) — the last of these
  is the pre-existing `.eyebrow` rule reused verbatim, not a new accent use. The discussion log's
  endnote panel titles (Claude's Discretion, Deferred Ideas) take the same accent as those panel
  eyebrows.
- **Squared corners.** `border-radius` is unset (0) everywhere except 1 existing call site of
  `--radius-sm`. Treat radius as the exception, never the default, for any new element.
- **The discussion log ends on an Endnotes sheet.** (quick-260923-jxp, JXP-07) An opt-in
  `alsoStyle: 'endnotes'` on `DocumentLayoutSpec` replaces the folded "Also in this document"
  chapter with an always-open `.document-endnotes` back-matter sheet — small-caps subsections,
  hanging bullets, quieter than a chapter fold. PLAN and VERIFICATION keep the default `'fold'`
  style unchanged.
- **`data-ghost="true"`.** (quick-260923-jxp, JXP-02) A declined-area row in the chapter index
  (`.document-chapter-index li[data-ghost="true"]`) carries this attribute so it can be styled and
  tested as non-interactive — no `<button>`, no jump target.
- **Light + dark parity.** Every new rule is checked against both `:root` and `.dark` — both
  palettes are fully declared in `globals.css`.
- **`EMPTY_STATE_MESSAGE` reused verbatim.** The shared string `'Nothing here yet.'` is the only
  sanctioned absence copy when a visible absence surface is genuinely needed; absence is silent
  (no copy at all) everywhere else (D-06).
- **`ArtifactHeader` is the only document-page header.** Every per-type view reuses it unmodified
  rather than forking a bespoke header per kind. The sketch-004 B3 cover sheet (quick-260922-3us)
  is this same component's optional `cover` prop — a `.document-cover` wrapper around the identical
  eyebrow/h1/lede/path fields plus the headline/glance/chapter-index cells — never a second header.
  The path is offered as a copy-path icon button (`.artifact-path-copy`, quick-260923-jxp), not
  printed — see `artifact-path-copy` above.
- **File-class marks are quiet.** (Phase 7, D-08, D-09) The drawer's type-and-size badge, the image
  page and the File details card use no tone and no `--primary`, and add no class name: they reuse
  the places badge, the figure frame, the source note and the metadata panel as they are. Images
  and binaries have no View/Source toggle until Phase 12 (SRC-02).
- **CONTEXT uses the sketch-006 D1 brief layout, not B3.** (quick-260923-lju) The `context` kind's
  manifest declares a `brief` hook (`composeContextBrief`) instead of opting into `layout`
  (`DocumentLayoutSpec`) — a boundary hero, a quiet out-strip, an amber open-questions panel, a
  continuous decision register. View mode has no "More in this document" disclosure — that was
  removed in 1d0baf3. It never carries a cover sheet, a chapter index, folded chapters, or an
  endnotes sheet — those are B3's shape (DISCUSSION-LOG, PLAN, VERIFICATION), deliberately not
  CONTEXT's. Sections the brief still doesn't claim render as extras or are read in Source.
- **The brief closes on quiet, collapsed back-matter rows.** (quick-260925-3ob) A
  `<blocking_amendments>` section (recognised by its tag, or a heading matching
  `/requirement amendments?/i` after a leading emoji) and — always, not just when unrecognised
  elsewhere — canonical references and existing code insights each surface as one
  `.view-context-aside` row at the very end of `ContextBriefView`, after the ideas panels. Every
  row starts collapsed; the amendments row is labelled with its own heading minus the leading
  emoji, and each row's content renders through the same `Inline`/`BlockList` path as the rest of
  the brief — grouped by its `###` subsection titles, with `.planning/` paths rendered as code and
  D-NN mentions as the brief's existing muted jump buttons. The rows are muted type
  (`--muted-foreground`, brightening only to `--foreground` on hover) on hairline rules
  (`--border`) — no card, no status-chip tone, no hero stat, and no `--primary`. A
  `<resolved_open_question>` section (or a heading reading "Resolved open question…" / "…open
  question is already answered…") is a note to the researcher, not to the reader: it is recognised
  so it never falls through as a raw extra, and View mode then omits it entirely (Source mode still
  shows it). The same holds for a `<blocking_amendments>` section whose heading is not
  "Requirement amendments…" (a "⚠️ … do not inherit it" planner warning that reuses the tag): it
  is recognised and hidden, so only real requirement rewording gets a row. Boundary notes (a
  table the domain section introduces with a "…:" lead-in, such as "Locked upstream — do not
  re-open…") are also rows, first in the list, labelled with the lead-in's claim before its dash
  ("Locked upstream") — not an open block between the scope and the register.
- **The 10% accent reservation extends to the CONTEXT brief's In-this-phase card.** (quick-260923-lju)
  `.immediate-work`'s existing top rule is reused verbatim for the brief's accent "In this phase"
  card, plus the ✓ marks in its list and the "Claude decides" label under a tagged decision. No
  other brief element (the leftover-discretion hanging rule, chips, stats) uses `--primary`.
  (quick-260925-3ug, sketch-007 C) It extends once more, to the ideas block: the Specific ideas
  column's top rule and its scope label, the specifics' Rule chip (via the shared `active` tone)
  and a deferred fate-group header's hover colour. Nothing else in the ideas block — not the
  Deferred column's own top rule, not its group notes, destinations or bodies — uses `--primary`.
- **The CONTEXT brief has no tone of its own.** (quick-260923-lju, retoned 2026-09-25) Open
  questions — the open-question chips, an area's "N open" chip, the "open for the researcher" stat
  and the open panel's rule/eyebrow/tags — use the shared `in-flight` tone (`--in-flight-fill`):
  they are waiting on someone, like "Awaiting checkpoint". A costly/one-way/irreversible
  reversibility chip is the plain untoned `.status-chip` (foreground text, one step above `quiet`),
  matching the neutral "hard to undo" stat; any other reversibility chip is `quiet`. The
  `destructive`/`warning` tones stay reserved for the artifact-parse badge. Cross-references
  (`.view-context-ref`) and the "Claude decides" label stay muted like `.document-reference`. The
  amendments back-matter row (quick-260925-3ob) carries no `warning`/`destructive`/`in-flight`
  tone either, despite its source heading's own ⚠️ — the row is as quiet as its references/code
  siblings.
- **CONTEXT Deferred is grouped by fate, never by source order.** (quick-260925-3ug, sketch-007 C)
  The groups render in one fixed order — handed, declined, passed, out, carried, then the Parked
  default for an idea whose outcome the brief could not recognise — and an empty group is omitted
  rather than rendered empty. Each header is a collapsible button in the same uppercase
  label-plus-count style as the In/Out scope labels, and every group starts expanded.
- **ASCII figures are lifted, not redrawn.** (quick-260929-3x3, sketch 009) A box-drawing diagram
  keeps its source text as real, selectable text; the cards behind it are decoration, positioned
  from the measured character width and row height (`.lifted-diagram-*`). A directory tree becomes
  a clean list (`.clean-tree-*`). Their pure models live in `src/rendering/` (`ascii-lift.ts`,
  `ascii-tree.ts`) and their components in `src/web/components/` with no research-specific import,
  so the `lifted-figures-everywhere` todo can reuse them unchanged for every document. Detection is
  conservative (a real `┌…┐└…┘` rectangle or a connector flow; three or more `├──`/`└──` lines) and
  Source mode is always the way back to the raw text. (quick-260930-jzt) Hand-drawn drift is
  followed: ragged right edges are walked row by row, an open-left outer box is inferred when its
  shape rules out a connector, nested cards paint over their container, an arrow drawn into a side
  stays an arrow, and `├─`/`└─`/`│` tree guides inside a box stay content. A box-less flow becomes
  padded step cards that absorb the detail lines under or beside their trunk, with aria-hidden spacer
  rows between stacked steps; edge labels and asides stay outside every card.
  (quick-260930-mp6, sketch 012 B) A RESEARCH architecture diagram whose graph is confident is
  redrawn as lanes by kind, from a graph read out of the author's ASCII (`src/rendering/ascii-graph.ts`
  for the typed nodes, short labels, wires, wire labels and groups; `src/rendering/lane-layout.ts` for
  the lanes, `.lane-diagram-*`): one column per kind present — Client, Edge, Service (& steps), Worker,
  Channel, Data, External — with an icon header and alternate lanes shaded, layers following the
  author's rows, and uniform nodes (icon, a label of at most two lines, a one-line subtitle, `+N` for
  hidden detail). A graph is **thin** — never drawn — when it has fewer than 4 nodes, fewer wires than
  half the nodes, quality under 0.6, more than 2 dangling wire fragments, or more than 60 nodes. The
  lanes fit the frame body's measured width: the per-lane column cap falls from uncapped to 2 to 1 until
  nodes reach a comfortable width, and same-lane nodes wrap into further rows rather than widening the
  lane; a narrower budget shortens subtitles (compact) instead. A node click opens the details panel
  beside the diagram (details, notes, From and To with wire labels, As written) and lights the node's
  wires and arrowheads; Escape, the same node again, or Close clears it. A thin figure, and every drawn
  one through the **Shown as drawn** chip in the frame bar, shows the lifted diagram under a quiet note
  ("This figure keeps the author's layout."). Source mode stays the way back to the raw text.
- **The 10% accent reservation extends to the figures.** (quick-260929-3x3) The lifted diagram's
  arrows, the hovered card, and the clean tree's folder icons, take `--primary`; folder names sit on
  `--muted-foreground` (the NEW chip uses
  the shared `active` tone); node cards sit on the quieter `--figure-node-fill` / `--figure-node-border`. Box cards, connector glyphs, notes and file names stay on
  `--border`, `--background` and the muted foreground. (quick-260930-mp6) The lane diagram extends it:
  the Client icon well, the selected node's border and ring (`--primary`, `--primary-tint`), and the
  selected node's wires and arrowheads take the accent; lanes, wires, node edges, groups and the other
  icons stay on the `--figure-*` tokens and the muted foreground. `destructive` and `warning` never
  colour a figure.
- **RESEARCH uses the sketch-008 A briefing, not B3 and not CONTEXT's brief.** (quick-260929-3x3)
  The `research` manifest declares a `briefing` hook (`composeResearchBriefing`) and keeps its
  `promote` list only as the fallback for a server payload with no `structured.briefing`. The page
  opens on a cover — a facts line (Researched date, a confidence chip that opens the per-area
  breakdown, Valid until) and a quiet muted Domain caption — then the Summary beside a Primary
  recommendation callout and an At a glance column (each row jumps to its chapter). The Summary's
  framing paragraph is a calm lead (`--fs-5`, at most 60ch, foreground colour); every later
  paragraph is a numbered finding row — 01, 02 … as muted mono ordinals, each on a hairline, the body
  in the foreground colour with bold phrases in semibold as the scan path — and a block that is not
  a paragraph (list, table, code) stays with the paragraph it follows (quick-260929-m30). Then chapters
  numbered in order over the sections actually present (01 Standard stack … 06 Sources; a document
  with no architecture renumbers with no gap), collapsed back-matter rows, and an "In the source
  only" strip. That strip lists every `##` (and unrecognised `###`) the view does not render, in
  document order, each a link into Source mode at that heading — so nothing is dropped silently.
- **The legitimacy audit is lanes by verdict.** (quick-260929-3x3, sketch-010 B; restored to the
  sketch in quick-260929-mih) Removed · slop, Flagged · suspicious and Approved, at most four items
  per lane and then "Show N more removed / flagged / approved ▾" (and "Show fewer ▴"), the caret
  `aria-hidden` so the accessible name is unchanged; a dashed Approved chip marks a disposition that
  is not a plain "Approved"; the full seam table sits behind a toggle reading "Show the seam output
  (N rows) ▾"; a "Not applicable" audit degrades to its prose lines. An empty lane keeps its tone —
  Removed keeps its `--missing-border` outline, missing top rule and heading; Flagged keeps its
  in-flight top rule and heading — and reads "Nothing removed." / "Nothing flagged." / "Nothing
  approved.". A removed item's replacement reads "Use instead" (a mono uppercase label, then the
  replacement in the foreground colour); lane items sit on `--border-faint` hairlines; inline code
  inside the block is a mono chip on `--code-veil` (the seam table's package names stay plain); and
  the notes after the lanes stack tightly at `--fs-3` in the muted foreground. Document content never
  takes the parse-degradation tones — the Removed lane and a CRITICAL pitfall use `missing`, the
  Flagged lane and a HIGH pitfall use `in-flight`.
- **The 10% accent reservation extends to the RESEARCH briefing.** (quick-260929-3x3) The
  recommendation callout's left rule and tint, the Core stack label, and the pressed state of the
  Patterns ⇄ Anti-patterns control take `--primary`. The Summary's finding ordinals stay on the muted foreground and never
  take `--primary` (quick-260929-m30). Evidence markers ([VERIFIED] / [CITED] / [ASSUMED]) render as small V / C / A superscripts in the muted foreground, with the ASSUMED
  marker on `in-flight`; the citation is in the tooltip. (quick-260929-mih, sketch-010 B) The hover colour of the legitimacy lanes' Show more / Show
  fewer rows and of the seam-output toggle takes `--primary`; nothing else in the audit block does.
- **UI-SPEC uses the sketch-014 contract page.** (quick-261001-qk6, sketch 014 round-2 winner) The
  cover carries the eyebrow "UI design contract · Phase N", the title from the slug, and a meta row:
  the sign-off chip (a plain `status-chip`, tone from the worst dimension, opening a "Checker
  sign-off" dialog with each dimension's verdict, notes only where written, and the approval last),
  then Created, and Status only when the document is not approved. Chapters number in order over
  the sections present: 01 Design system (four accent-ruled choice cards — shadcn first, then
  Component library, Icon library and Font — followed by a spacing tick ruler, a type ladder of live
  samples and the 60/30/10 colour bar with a card per role), 02 UI considerations (a coverage meter
  with the author's own count, a "Needs a person" chip row, and the element x state matrix whose
  squares open that state's resolutions below it), and 03 Registry safety (a verdict line, then a
  card per registry with its blocks grouped New this phase / Reused). There is no copy deck: an "In
  the source only" strip lists Copywriting Contract, the phase-specific chapters, the checker's
  notes, how coverage was probed, the lift rule, the status vocabulary, the scope and generator
  notes and the frontmatter, each switching to Source mode at its heading. The Document metadata
  disclosure is not shown in View mode — its facts sit on the cover and in the shadcn card.
- **Swatches and type samples are content.** (quick-261001-qk6, quick-261002-li5) A colour role's
  swatch, and the colour bar's segments, paint the value the document itself states. A value reaches
  the page only after `safeColor` accepts it (a hex colour, or an `oklch(…)` of digits, dots,
  percent signs, spaces, slashes, minus signs or `none`, at most 64 characters) and only as the
  value of a `--swatch-light` / `--swatch-dark` custom property; the stylesheet picks one per theme
  with the `.dark` selector. A value the document states always wins. A token the document gives no
  value for is painted from the target project's own stylesheet: the `:root` value for light and
  the `.dark` value for dark. The stylesheet is found through components.json's `tailwind.css`,
  else a short fixed list of conventional paths. Its values pass through the same `safeColor`, the
  swatch splits into one per token, and it reads "From globals.css" with the project-relative path
  in its tooltip. Only a token that resolves in neither place is hatched and reads "Value not in
  doc". The colour-bar key says which source painted it. A type sample takes only the parsed size
  (capped at 72px), weight and line height. These, and the target project's resolved values shown as
  content, are the only colours outside the theme tokens anywhere in the app, and they never come
  from a tone.
- **The 10% accent reservation extends to the CONTEXT brief's In-this-phase card.** (quick-260923-lju)
  `.immediate-work`'s existing top rule is reused verbatim for the brief's accent "In this phase"
  card, plus the ✓ marks in its list and the "Claude decides" label under a tagged decision. No
  other brief element (the leftover-discretion hanging rule, chips, stats) uses `--primary`.
  (quick-260925-3ug, sketch-007 C) It extends once more, to the ideas block: the Specific ideas
  column's top rule and its scope label, the specifics' Rule chip (via the shared `active` tone)
  and a deferred fate-group header's hover colour. Nothing else in the ideas block — not the
  Deferred column's own top rule, not its group notes, destinations or bodies — uses `--primary`.
- **The CONTEXT brief has no tone of its own.** (quick-260923-lju, retoned 2026-09-25) Open
  questions — the open-question chips, an area's "N open" chip, the "open for the researcher" stat
  and the open panel's rule/eyebrow/tags — use the shared `in-flight` tone (`--in-flight-fill`):
  they are waiting on someone, like "Awaiting checkpoint". A costly/one-way/irreversible
  reversibility chip is the plain untoned `.status-chip` (foreground text, one step above `quiet`),
  matching the neutral "hard to undo" stat; any other reversibility chip is `quiet`. The
  `destructive`/`warning` tones stay reserved for the artifact-parse badge. Cross-references
  (`.view-context-ref`) and the "Claude decides" label stay muted like `.document-reference`. The
  amendments back-matter row (quick-260925-3ob) carries no `warning`/`destructive`/`in-flight`
  tone either, despite its source heading's own ⚠️ — the row is as quiet as its references/code
  siblings.
- **CONTEXT Deferred is grouped by fate, never by source order.** (quick-260925-3ug, sketch-007 C)
  The groups render in one fixed order — handed, declined, passed, out, carried, then the Parked
  default for an idea whose outcome the brief could not recognise — and an empty group is omitted
  rather than rendered empty. Each header is a collapsible button in the same uppercase
  label-plus-count style as the In/Out scope labels, and every group starts expanded.
- **ASCII figures are lifted, not redrawn.** (quick-260929-3x3, sketch 009) A box-drawing diagram
  keeps its source text as real, selectable text; the cards behind it are decoration, positioned
  from the measured character width and row height (`.lifted-diagram-*`). A directory tree becomes
  a clean list (`.clean-tree-*`). Their pure models live in `src/rendering/` (`ascii-lift.ts`,
  `ascii-tree.ts`) and their components in `src/web/components/` with no research-specific import,
  so the `lifted-figures-everywhere` todo can reuse them unchanged for every document. Detection is
  conservative (a real `┌…┐└…┘` rectangle or a connector flow; three or more `├──`/`└──` lines) and
  Source mode is always the way back to the raw text. (quick-260930-jzt) Hand-drawn drift is
  followed: ragged right edges are walked row by row, an open-left outer box is inferred when its
  shape rules out a connector, nested cards paint over their container, an arrow drawn into a side
  stays an arrow, and `├─`/`└─`/`│` tree guides inside a box stay content. A box-less flow becomes
  padded step cards that absorb the detail lines under or beside their trunk, with aria-hidden spacer
  rows between stacked steps; edge labels and asides stay outside every card.
  (quick-260930-mp6, sketch 012 B) A RESEARCH architecture diagram whose graph is confident is
  redrawn as lanes by kind, from a graph read out of the author's ASCII (`src/rendering/ascii-graph.ts`
  for the typed nodes, short labels, wires, wire labels and groups; `src/rendering/lane-layout.ts` for
  the lanes, `.lane-diagram-*`): one column per kind present — Client, Edge, Service (& steps), Worker,
  Channel, Data, External — with an icon header and alternate lanes shaded, layers following the
  author's rows, and uniform nodes (icon, a label of at most two lines, a one-line subtitle, `+N` for
  hidden detail). A graph is **thin** — never drawn — when it has fewer than 4 nodes, fewer wires than
  half the nodes, quality under 0.6, more than 2 dangling wire fragments, or more than 60 nodes. The
  lanes fit the frame body's measured width: the per-lane column cap falls from uncapped to 2 to 1 until
  nodes reach a comfortable width, and same-lane nodes wrap into further rows rather than widening the
  lane; a narrower budget shortens subtitles (compact) instead. A node click opens the details panel
  beside the diagram (details, notes, From and To with wire labels, As written) and lights the node's
  wires and arrowheads; Escape, the same node again, or Close clears it. A thin figure, and every drawn
  one through the **Shown as drawn** chip in the frame bar, shows the lifted diagram under a quiet note
  ("This figure keeps the author's layout."). Source mode stays the way back to the raw text.
- **The 10% accent reservation extends to the figures.** (quick-260929-3x3) The lifted diagram's
  arrows, the hovered card, and the clean tree's folder icons, take `--primary`; folder names sit on
  `--muted-foreground` (the NEW chip uses
  the shared `active` tone); node cards sit on the quieter `--figure-node-fill` / `--figure-node-border`. Box cards, connector glyphs, notes and file names stay on
  `--border`, `--background` and the muted foreground. (quick-260930-mp6) The lane diagram extends it:
  the Client icon well, the selected node's border and ring (`--primary`, `--primary-tint`), and the
  selected node's wires and arrowheads take the accent; lanes, wires, node edges, groups and the other
  icons stay on the `--figure-*` tokens and the muted foreground. `destructive` and `warning` never
  colour a figure.
- **RESEARCH uses the sketch-008 A briefing, not B3 and not CONTEXT's brief.** (quick-260929-3x3)
  The `research` manifest declares a `briefing` hook (`composeResearchBriefing`) and keeps its
  `promote` list only as the fallback for a server payload with no `structured.briefing`. The page
  opens on a cover — a facts line (Researched date, a confidence chip that opens the per-area
  breakdown, Valid until) and a quiet muted Domain caption — then the Summary beside a Primary
  recommendation callout and an At a glance column (each row jumps to its chapter). The Summary's
  framing paragraph is a calm lead (`--fs-5`, at most 60ch, foreground colour); every later
  paragraph is a numbered finding row — 01, 02 … as muted mono ordinals, each on a hairline, the body
  in the foreground colour with bold phrases in semibold as the scan path — and a block that is not
  a paragraph (list, table, code) stays with the paragraph it follows (quick-260929-m30). Then chapters
  numbered in order over the sections actually present (01 Standard stack … 06 Sources; a document
  with no architecture renumbers with no gap), collapsed back-matter rows, and an "In the source
  only" strip. That strip lists every `##` (and unrecognised `###`) the view does not render, in
  document order, each a link into Source mode at that heading — so nothing is dropped silently.
- **The legitimacy audit is lanes by verdict.** (quick-260929-3x3, sketch-010 B; restored to the
  sketch in quick-260929-mih) Removed · slop, Flagged · suspicious and Approved, at most four items
  per lane and then "Show N more removed / flagged / approved ▾" (and "Show fewer ▴"), the caret
  `aria-hidden` so the accessible name is unchanged; a dashed Approved chip marks a disposition that
  is not a plain "Approved"; the full seam table sits behind a toggle reading "Show the seam output
  (N rows) ▾"; a "Not applicable" audit degrades to its prose lines. An empty lane keeps its tone —
  Removed keeps its `--missing-border` outline, missing top rule and heading; Flagged keeps its
  in-flight top rule and heading — and reads "Nothing removed." / "Nothing flagged." / "Nothing
  approved.". A removed item's replacement reads "Use instead" (a mono uppercase label, then the
  replacement in the foreground colour); lane items sit on `--border-faint` hairlines; inline code
  inside the block is a mono chip on `--code-veil` (the seam table's package names stay plain); and
  the notes after the lanes stack tightly at `--fs-3` in the muted foreground. Document content never
  takes the parse-degradation tones — the Removed lane and a CRITICAL pitfall use `missing`, the
  Flagged lane and a HIGH pitfall use `in-flight`.
- **The 10% accent reservation extends to the RESEARCH briefing.** (quick-260929-3x3) The
  recommendation callout's left rule and tint, the Core stack label, and the pressed state of the
  Patterns ⇄ Anti-patterns control take `--primary`. The Summary's finding ordinals stay on the muted foreground and never
  take `--primary` (quick-260929-m30). Evidence markers ([VERIFIED] / [CITED] / [ASSUMED]) render as small V / C / A superscripts in the muted foreground, with the ASSUMED
  marker on `in-flight`; the citation is in the tooltip. (quick-260929-mih, sketch-010 B) The hover colour of the legitimacy lanes' Show more / Show
  fewer rows and of the seam-output toggle takes `--primary`; nothing else in the audit block does.
- **UI-SPEC uses the sketch-014 contract page.** (quick-261001-qk6, sketch 014 round-2 winner) The
  cover carries the eyebrow "UI design contract · Phase N", the title from the slug, and a meta row:
  the sign-off chip (a plain `status-chip`, tone from the worst dimension, opening a "Checker
  sign-off" dialog with each dimension's verdict, notes only where written, and the approval last),
  then Created, and Status only when the document is not approved. Chapters number in order over
  the sections present: 01 Design system (four accent-ruled choice cards — shadcn first, then
  Component library, Icon library and Font — followed by a spacing tick ruler, a type ladder of live
  samples and the 60/30/10 colour bar with a card per role), 02 UI considerations (a coverage meter
  with the author's own count, a "Needs a person" chip row, and the element x state matrix whose
  squares open that state's resolutions below it), and 03 Registry safety (a verdict line, then a
  card per registry with its blocks grouped New this phase / Reused). There is no copy deck: an "In
  the source only" strip lists Copywriting Contract, the phase-specific chapters, the checker's
  notes, how coverage was probed, the lift rule, the status vocabulary, the scope and generator
  notes and the frontmatter, each switching to Source mode at its heading. The Document metadata
  disclosure is not shown in View mode — its facts sit on the cover and in the shadcn card.
- **Swatches and type samples are content.** (quick-261001-qk6) A colour role's swatch, and the
  colour bar's segments, paint the value the document itself states. A value reaches the page only
  after `safeColor` accepts it (a hex colour, or an `oklch(…)` of digits, dots, percent signs,
  spaces, slashes, minus signs or `none`, at most 64 characters) and only as the value of a
  `--swatch-light` / `--swatch-dark` custom property; the stylesheet picks one per theme with the
  `.dark` selector. A token with no stated value is hatched and reads "Value not in doc". A type
  sample takes only the parsed size (capped at 72px), weight and line height. These are the only
  colours outside the theme tokens anywhere in the app, and they never come from a tone.
- **The 10% accent reservation extends to the UI-SPEC page.** (quick-261001-qk6) The four choice
  cards' tint and top rule, the registry verdict's left rule, the spacing range bar, the covered
  matrix square (and the covered meter segment) and the selected matrix cell take `--primary`.
  Backstop uses `--in-flight-fill`, unresolved `--missing-fill`, and a dismissed state is a quiet
  `--muted-foreground` dash; `destructive` and `warning` never appear on this page.
- **The REVIEW page's tones and accent.** (quick-261017-k44, sketch 022 C) On a REVIEW page `complete`
  marks the Clean or all-fixed verdict, a Fixed stamp, the Fixed tally count and the fixed reply mark;
  `in-flight` marks a warning severity mark, an open warning stamp and the "still in the code" phrase when
  no critical remains; `missing` marks a critical severity mark, an open critical stamp, a non-zero Open
  or Critical tally count and the "still in the code" or "K critical" phrase while a critical remains;
  `quiet` marks an info severity mark, the Skipped (dashed) and Not attempted (dotted) stamps, an open info
  stamp, the Outside scope chip and the Also chips. The pull-quote rule, the Suggested change kicker, the
  fixed reply mark, the pressed "Show fixed threads" square and the fixed ruler marks take `--primary`.
  The parse-degradation tones never appear on this page, and every class is in the reserved
  `view-review-` namespace, so no vocabulary row is added.
- **The PLAN page's What to check tab gathers only standard GSD sources.** (quick-261016-ujo) A task that
  needs a person to check it (a `checkpoint:human-verify`, or a `<verify>` that carries a
  `<human-check>`) opens on a first tab, What to check, with the count. It is built on the server from
  the task's own How to check it, Steps, What to do, Human check, Accept when and When you are done;
  the VALIDATION Manual-Only rows that share a requirement ID with the plan (task IDs never match a
  row in; they only leave out a row that names solely other plans' tasks); the UI-SPEC 🧪 backstop
  rows; the task's Read first files, as links only; and the phase UAT file, as a pointer. Each group
  names its file and section as plain text and links back through the shared `source-link` wherever
  the presentation resolves one. A requirement chip on an item is `quiet`. The panel takes no
  `--primary` and never a parse-degradation tone, and absence is silent: a source that is missing or
  unreadable leaves its group out with no empty copy. The plan header's What to check control, which
  opens the first task that needs a check, is the plan view's counterpart of the cover's needs-a-human
  card. Every class is in the reserved `view-plan-` namespace, so no vocabulary row is added.

- **The 10% accent reservation extends to the VERIFICATION page.** (quick-261017-18a, sketch 021 E)
  The Holds row header, holding squares, the scope meter's filled segments, the ledger arrow, the
  task-chip prefix and the Fixed-by ticket rule take `--primary`. The parse-degradation tones never
  appear on this page. Every class is in the reserved `view-verification-` namespace, so no
  vocabulary row is added.
- **The LEARNINGS page marks the four kinds by identity colour, not tone.** (quick-261017-k45, sketch
  024 E) A decision takes `--primary`, a lesson `--in-flight-fill`, a pattern `--foreground` and a
  surprise `--missing-fill`, keyed on `data-kind` and used only on the selected tab's underline and
  number and on the chapter rule and number. The picked or hovered source segment and the graduated
  badge take `--primary` on `--primary-tint`; the missing-artifacts note takes a dashed
  `--in-flight-border` with `--in-flight-fill` names. The page writes no `data-tone`, the
  parse-degradation tones never appear on it, and every class is in the reserved `view-learnings-`
  namespace, so no vocabulary row is added.
- **The DEBUG page leads with the session's status.** (quick-261018-j5h, sketch 023 A) The status
  badge and the lead beside it take `complete` for a resolved session, `in-flight` for an open,
  awaiting-check or diagnosed one and `quiet` for an unrecognised status, and the Archived chip is
  `quiet`. Evidence tags are identity colours on `data-tag`, not tones: Confirms takes `--primary`,
  Rules out `--missing-fill`, Fix `--in-flight-fill` and Finding a muted outline square. The confirmed
  suspect column, the expected kicker and a passed verification chip take `--primary`; the ruled-out
  column, its strike-through and the actual kicker take `--missing-fill`; the next-action call-out
  and a not-settled chip take `--in-flight-fill` on `--in-flight-border`. The parse-degradation
  tones never appear on this page. Every class is in the reserved `view-debug-` namespace, so no
  vocabulary row is added.
- **The TODO page reads as a lifecycle.** (quick-261023-61k, sketch 027 C) A strip of three steps,
  Noted, Captured and Closed (or Now while the todo is open), sits under the title and the chip row,
  and one numbered spine runs under it: the notes the todo was made from, the todo itself (the
  problem beside the plan, the files, the other sections folded), then how it closed or a dashed
  "still open" line. The status chip takes `complete` for a todo in `completed/` or `done/`,
  `in-flight` for one in `pending/` and `quiet` for one filed anywhere else; the area chip is
  `quiet`. The severity square is an identity colour on `data-severity`, shared with the
  dashboard's On deck rows: High is filled `--missing-fill`, Medium filled `--in-flight-fill`, Low
  a muted outline and Unrated a dashed outline. A done step or stage takes a `--primary` top rule
  and a primary-tinted node; an open one takes `--in-flight-fill` and a dashed node; a step with no
  data takes a dashed `--border` rule. The resolution box is `--primary-border` on `--primary-tint`,
  and the still-open line is a dashed `--in-flight-border` with its lead in `--in-flight-fill`. A
  note card has a 3px `--muted-foreground` left rule on `--card`. A note reference in the text and
  the closing quick task's link are `--primary`. The parse-degradation tones never appear on this
  page, and every class is in the reserved `view-todo-` namespace, so no vocabulary row is added.
- **The NOTE page opens on its gist.** (quick-261023-61l, sketch 028 A; quick-261023-u13, sketch 029 A) A
  sticky rail on the left holds the eyebrow, the one h1 (a quick note's title is made from its file
  name), a where-it-went chip, one big number, a stat list, the todo card(s) and the page tools; the
  gist is said large beside it, under it the Lifted | As written toggle and a ledger of numbered rows:
  "What it says" for a quick note (one row per lifted clause), "Where it went" for a one-liner, and
  "Section by section" for an explore note, whose rows open the section in place with Read +. Colours
  are theme tokens. The stage chip and the big number's bar are identity colours on `data-stage`, not
  tones: done `--primary`, open `--in-flight-fill`, untraced `--missing-fill`, and note muted with a
  dashed square. Labels take the documented tones: Decided `complete`; Bug, Cause, Observed and
  Suggested `in-flight`; Open question `missing`; every other label is a plain outline. The row's
  index takes the label's tone, else its group's (decided `complete`, problem `in-flight`, open
  `missing`). An explore note's flag labels take Decided and Resolved `complete`, Corrected
  `in-flight`, Blocked and Open question `missing`, and Rejected `quiet`. Stat values take Promoted:
  No `missing`, Todo by its status (Done `complete`, Pending `in-flight`), Decided `complete` and
  Open / blocked `missing` when above zero. The todo card's status chip reads Done `complete`,
  Pending `in-flight` and Unfiled `quiet`, with the area chip `quiet`; the card's top rule is an
  identity colour on `data-status`: pending `--in-flight-fill`, done `--primary`, unfiled `--border`,
  and a dashed `--border` box when no todo names the note. The weight marker on `data-level` uses the
  TODO page's colours: High is filled `--missing-fill`, Medium filled `--in-flight-fill`, Low a muted
  outline and Unrated a dashed outline. A file reference is a dotted underline, and a highlighted one
  (clicked, in the text or in Mentions) takes `--primary` on `--primary-tint`; code identifiers are
  mono text, and figure chips are mono outlines with a muted unit. The parse-degradation tones never
  appear on this page, corners stay squared, nothing is animated, and every class is in the reserved
  `view-note-` namespace, so no vocabulary row is added.
- **The dashboard opens on the project.** (quick-261017-wlg, sketch 025 R3b) A "Project overview"
  eyebrow sits above the PROJECT.md H1, which is the page's only h1, split at its first spaced
  dash into a name and a tagline. Under it sits the What This Is lead: a leading bold sentence, or
  sentences up to about 70 characters (never more than two). Then comes a "Now" block: milestone ·
  phase, the phase title and the status chip on its own line. Beside it, centred on it, one card
  reads Next up, then this phase's own plan progress, the last activity and the next step. The
  step follows `/gsd-next`'s routing from the files on disk (execute, discuss, plan, verify,
  complete or start a milestone), and an execute step names its first open plan as an inline link
  ("Execute phase 5, from 05-01"). Absences are silent, except the card's "No plans in this phase
  yet." and "No STATE.md yet" lines. Core Value is not shown here (it is the Traceability page's
  lede, cut by the same lead rules, and absent without a Core Value section), and open blockers lead
  in the red band below it. The accent goes to the Now block's left rule and label, the
  card's top rule, the done bar segments, and the plan link on hover. The next plan's segment
  takes `--in-flight-fill`. Status chips use only `active` and `complete`. No motion.
- **Blockers lead below the head.** (quick-261018-4tb, sketch 026 B) Directly under the head, open
  blockers fill one full-width red band: a "Blocking" eyebrow, the open count and "open blockers,
  plus N marked resolved", a group legend that filters (All, each group, Untagged), the most urgent
  blocker in the current filter as a large sentence with its sources, a search box, a "Show
  resolved" toggle, and the rest as one-line rows that expand in place, five to a page. With nothing
  open the band is one quiet line, "Nothing blocking. No open blockers are recorded". The lead is the
  first urgent open blocker in view, else the first open one. A blocker links only to documents it
  names that resolve to a real file (a review finding, a phase document, a plan, a quick task, a
  requirement, a named `.md` path, including one on its group line), and lists up to eight other
  files that cite the same finding, quick task or requirement under "Also mentioned in". One that
  names nothing is Untagged: a dashed marker, its own legend entry, a note that its text is the
  whole record, and Copy text. The band never names the file the blockers were read from. Its
  accent is the destructive family (`--destructive`, `--destructive-border`, `--destructive-tint`)
  as a content colour for open blockers only, never as a `data-tone` and never for parse state.
- **Decisions follow on a phase rail.** (quick-261018-4tb, sketch 026 B) A "Settled" eyebrow, the
  h2 "Decisions", a search box and the count ("N logged", or "M in phase X"). With two or more phase
  groups a bar chart sits above the log, one bar per phase (the left-to-right order is no phase,
  then the oldest phase to the newest), and a bar filters the log. Entries run newest first, eight
  to a page, grouped by phase on a rail within the page ("Phase" over a large number and "N
  decisions", or "No phase"). A row opens to Why, Logged and Source: a card for the plan (with its
  objective's first sentence), the quick task, or the phase's CONTEXT or RESEARCH, resolved in live
  phases first and then the newest archived milestone, plus a Phase link when the entry has a
  phase. An entry with neither a phase nor a source is Untagged and offers Copy text. Changing the
  filter or search goes back to page 1, and paging closes an open row. The selected bar and the rail
  rule take `--primary`; a hovered bar takes `--in-flight-fill`. Nothing in the section names the
  file the log was read from.
- **Pace is rebuilt from SUMMARY durations.** (quick-261018-4tb, sketch 026 P1) A rail panel with a
  `--primary` left rule: the total execution time as the hero, then Plans completed (with the
  untimed count), Average (with the median) and Per task. On the right sit the milestone chips
  (with two or more milestones), the trend chip and its sentence, and every timed plan as a dot in
  finish order over shaded phase bands with a running median of five; approximate plans are hollow,
  and a plan above the cap is drawn at the top with a caret. Hovering a dot names the plan, through
  a native SVG title. Every number is rebuilt from each plan's own SUMMARY.md (`duration` and
  `completed`, top level or under `metrics`) and the plan's task count, never from the hand-appended
  metrics table. "7h 7m elapsed" is wall-clock time and "recovered" says nothing, so those plans
  count as untimed. The trend compares the median minutes a task of the last plans with the plans
  before them, only with at least four on each side. The default scope is the current milestone once
  it has four timed plans, else all. The faster chip is primary-tinted, the slower chip is
  destructive-tinted (a content colour, never a `data-tone`), and steady stays foreground. With no
  timed plan the section says "No completed plan has a recorded duration yet."
- **On deck and Recent work share the bottom row.** (quick-261018-4tb, sketch 026 B round 2) Two
  panels sit 24px apart and stretch to the taller one, with each pager (and On deck's "N todos
  done." line) pinned to the panel's floor. On deck reads "After the next step" and has Next, Todos
  and Notes tabs with counts (Notes counts the unpromoted ones); it opens on the first tab that has
  anything, and each tab keeps its own page of five. Next lists the unfinished plans from the current
  phase on, then the phases not yet finished, minus the plan the head already names, at most six.
  Todos come from `todos/pending/` and STATE.md's pending list, High before Medium before Low
  before Unrated (however the project spells severity or priority), newest first within a level.
  Each has a severity gutter (a square marker, filled for High, dashed for Unrated), a title, a
  two-line detail and one quiet line (area · Added … · the first file's name, with the full path on
  hover and +N for the rest). Only a file-backed todo links out and shows the arrow; a STATE.md
  todo shows a chip for each document it names, or a dashed Untagged. Notes list the unpromoted
  ones newest first, then promoted ones dimmed with "Now a todo". Recent work reads "Quick and fast
  tasks", counts "N in 3 weeks", and draws 21 days ending on the newest task's day (quick stacked
  over fast, quick in `--primary`, fast in `--in-flight-fill`), then five tasks a page grouped by
  day under a date gutter (a large day number over "Oct · Fri"). A row has a Q or F badge, a
  two-line title, the status, the commit, and Plan and Summary links only where those files exist.
  High takes `--missing-fill` and Medium `--in-flight-fill`, the same severity colours as the TODO
  page (quick-261023-61k), as content colours and never as a `data-tone`. Nothing animates.

- **The Research page is five spines, one open.** (quick-261024-k8u, sketches 031 E round 4, 032 A,
  033 D1, 034 A and 035 A) `/research` shows the five files in `.planning/research/` as one frame: a
  slim bar (the only h1: the milestone name, else the project name; a confidence chip with a 3-cell
  meter, "Researched 21 Aug 2026" and "N research files") over full-height spines, one open. Summary
  is spine 00 and its closed spine carries a faint accent tint (`--primary-tint` over the
  background). A closed spine shows its number, a vertical title with its lucide icon (icons sit on
  spine titles only, never as list markers) and its key number over a confidence meter. The open
  leaf shows a big accent number (`--primary`), a kicker ("Read this first" or "Research", then the
  confidence), the file's name and its numbers. The first screen says one sentence: when it is long
  and has a colon, the part before the colon is the large line and the rest sits below in small
  muted text; everything else waits behind "Read the full summary" or "Read more". Left and right
  arrows move between spines (`?open=<file>` restores the open one); elements that own their arrows
  stop them. Under 42rem the spines stack as bars. Type: headings use `--font-heading`; in-panel
  labels, kickers and counts use JetBrains Mono at weight normal, muted and uppercase; mono is
  otherwise for code, numbers and badges. **The page links to none of the source research files**:
  no Source chip, file name, line number, artifact link or copy-path button, and every string
  reaches the DOM as a React text node through the inline tokenizer, never as markup. A pitfall is
  drawn in the `missing` family (`--missing-fill`, `--missing-border`), never `destructive` or
  `warning`; document content never takes those two tones. Nothing animates. Accent uses inside the
  panels: the build-order track line, the selected phase card and its number, the gate block's tint
  and lock tile, the pressed chip or kind, the reasons' numbers, the gaps' numbers, our matrix
  column's tint, the selected build-order step's border and its lit wires, and How to verify's left rule.
  The pitfall tone is the `missing` family everywhere: a pitfall's number, the meter cells, the warning-sign
  squares, the selected tab's underline and the open row's tint.

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
| `attention-page-status` | Dashboard | every dashboard pager |
| `attention-pagination` | Dashboard | every dashboard pager (Blocking, Decisions, On deck, Recent work); shared with the requirement lists |
| `attention-pagination-actions` | Dashboard | every dashboard pager |
| `attention-panel` | Dashboard | the CONTEXT brief's open-questions panel alone; the dashboard's Decisions and Blockers left it (quick-261018-4tb) |
| `blocking-band` | Dashboard | the full-width red band under the head that leads with the most urgent open blocker (quick-261018-4tb) |
| `blocking-calm` | Dashboard | the one quiet line shown when no blocker is open |
| `blocking-dot` | Dashboard | a blocker row's square marker; filled when urgent, a turned hollow diamond when resolved |
| `blocking-lead` | Dashboard | the most urgent blocker in the current filter, as a large sentence |
| `blocking-lead-sources` | Dashboard | the lead's source links, or its Untagged note |
| `blocking-lead-title` | Dashboard | |
| `blocking-lead-why` | Dashboard | |
| `blocking-legend` | Dashboard | the group filter beside the count; buttons carry `data-on` and `data-untagged` |
| `blocking-main` | Dashboard | |
| `blocking-summary` | Dashboard | the band's left column: the eyebrow, the open count and the legend |
| `blocking-tag` | Dashboard | a blocker's caps lead or Time-bound label; `data-quiet` for a resolved one |
| `blocking-total` | Dashboard | the open count, in the destructive colour |
| `dashboard-loading` | Dashboard | |
| `dashboard-lower` | Dashboard | the bottom row: On deck beside Recent work, 24px apart and stretched to the taller (quick-261018-4tb) |
| `dashboard-page` | Dashboard | |
| `decisions-histogram` | Dashboard | the per-phase bar chart; a bar filters the log |
| `decisions-histogram-bar` | Dashboard | |
| `decisions-histogram-bars` | Dashboard | buttons carry `data-on` |
| `decisions-histogram-labels` | Dashboard | |
| `decisions-histogram-value` | Dashboard | |
| `decisions-phase` | Dashboard | one phase's group on the rail; `data-none` for entries with no phase |
| `decisions-phase-mark` | Dashboard | the group's kicker, number and decision count |
| `decisions-phase-number` | Dashboard | |
| `decisions-rail` | Dashboard | the phase groups of one page of decisions |
| `decisions-section` | Dashboard | the Decisions section (quick-261018-4tb) |
| `deck-chip` | Dashboard | the Now a todo mark on a promoted note |
| `deck-foot` | Dashboard | 'N todos done.', pinned to the floor of the panel |
| `deck-item` | Dashboard | a Next item or a note, as a link; `data-promoted` dims a promoted note |
| `deck-item-detail` | Dashboard | a two-line clamp |
| `deck-item-meta` | Dashboard | |
| `deck-item-title` | Dashboard | |
| `deck-list` | Dashboard | |
| `deck-panel` | Dashboard | On deck and Recent work; a flex column so the pager sits on the floor |
| `deck-tab` | Dashboard | a Next, Todos or Notes tab; `aria-selected` marks the open one |
| `deck-tabs` | Dashboard | |
| `immediate-work` | Dashboard | shared with the CONTEXT brief (quick-260923-lju) |
| `ledger-chip` | Dashboard | a filter or toggle chip, and a link chip for a file that also mentions the entry; `data-on` marks the active one |
| `ledger-chips` | Dashboard | |
| `ledger-count` | Dashboard | the section's count: N logged, or M in phase X |
| `ledger-go` | Dashboard | a small bordered mono link or button (Copy text, a source link) |
| `ledger-head` | Dashboard | a ledger section's header: eyebrow, h2 and tools |
| `ledger-head-tools` | Dashboard | |
| `ledger-kicker` | Dashboard | the shared mono uppercase micro-label |
| `ledger-mentions` | Dashboard | the Also mentioned in chips and their 'and N more' note |
| `ledger-quiet` | Dashboard | muted text inside a ledger section |
| `ledger-row` | Dashboard | one expandable row; `data-open`, and on a blocker `data-urgent` and `data-resolved` |
| `ledger-row-body` | Dashboard | |
| `ledger-row-chevron` | Dashboard | turns a quarter turn when its row is open, without a transition |
| `ledger-row-facts` | Dashboard | the expanded row's label and value list |
| `ledger-row-head` | Dashboard | the button that opens and closes a row |
| `ledger-row-id` | Dashboard | a decision row's plan, quick task or context id |
| `ledger-row-links` | Dashboard | the row's go-links |
| `ledger-row-title` | Dashboard | a row's title; one line closed, wrapped and semibold open |
| `ledger-rows` | Dashboard | the hairline-ruled list of rows |
| `ledger-search` | Dashboard | the search box shared by Blocking and Decisions |
| `ledger-source` | Dashboard | a card linking to a document an entry names |
| `ledger-source-detail` | Dashboard | a source card's two-line clamp |
| `ledger-source-head` | Dashboard | |
| `ledger-source-sum` | Dashboard | the collapsed row's source chip; `data-untagged` is dashed |
| `ledger-sources` | Dashboard | |
| `ledger-tools` | Dashboard | the search and toggle row |
| `ledger-untagged` | Dashboard | the dashed note on an entry that names no source, with Copy text |
| `pace-band` | Dashboard | a shaded phase band behind the dots; `data-alt` marks every other one |
| `pace-band-label` | Dashboard | |
| `pace-chart` | Dashboard | the dot timeline figure |
| `pace-dot` | Dashboard | one plan's dot; `data-approx` makes it hollow |
| `pace-dot-hit` | Dashboard | |
| `pace-dot-mark` | Dashboard | |
| `pace-empty` | Dashboard | the Pace section when no plan has a recorded duration |
| `pace-facts` | Dashboard | plans completed, average with its median, and per task |
| `pace-gridline` | Dashboard | |
| `pace-hero` | Dashboard | the total execution time and the facts under it |
| `pace-key` | Dashboard | the chart's key |
| `pace-key-dot` | Dashboard | `data-hollow` for the approximate marker |
| `pace-key-line` | Dashboard | |
| `pace-main` | Dashboard | the rail's right side: milestone chips, trend and chart |
| `pace-median` | Dashboard | the running median of 5 |
| `pace-over` | Dashboard | the caret on a plan above the cap, drawn at the top |
| `pace-rail` | Dashboard | the Pace panel, with a `--primary` left rule |
| `pace-scope` | Dashboard | the milestone chips |
| `pace-tick` | Dashboard | |
| `pace-total` | Dashboard | the total as the hero, in `--fs-display-3` |
| `pace-trend` | Dashboard | the trend chip; `data-verdict` is faster, steady or slower |
| `pace-verdict` | Dashboard | the trend chip and its sentence |
| `position-hero` | Dashboard | now used by the CONTEXT brief alone; the dashboard opens on `project-head` (quick-261017-wlg) |
| `preview-panel` | Dashboard | the CONTEXT brief and the document endnotes alone; the dashboard's On deck left it (quick-261018-4tb) |
| `project-head` | Dashboard | |
| `project-head-copy` | Dashboard | |
| `project-identity` | Dashboard | |
| `project-lead` | Dashboard | |
| `project-next` | Dashboard | |
| `project-next-bar` | Dashboard | |
| `project-next-counts` | Dashboard | |
| `project-next-figure` | Dashboard | |
| `project-next-label` | Dashboard | |
| `project-next-last` | Dashboard | |
| `project-next-percent` | Dashboard | |
| `project-next-plan` | Dashboard | |
| `project-next-progress` | Dashboard | |
| `project-next-step` | Dashboard | |
| `project-next-unit` | Dashboard | |
| `project-now` | Dashboard | |
| `project-now-label` | Dashboard | |
| `project-now-line` | Dashboard | |
| `project-tagline` | Dashboard | |
| `recent-activity` | Dashboard | the 21-day activity chart with its axis and key |
| `recent-axis` | Dashboard | |
| `recent-bars` | Dashboard | one slot a day, quick stacked over fast; `data-empty` for a quiet day |
| `recent-date` | Dashboard | the date gutter of a day group |
| `recent-date-number` | Dashboard | |
| `recent-day` | Dashboard | one day's tasks under a date gutter |
| `recent-key` | Dashboard | Quick and Fast |
| `recent-log` | Dashboard | |
| `recent-status` | Dashboard | |
| `recent-task` | Dashboard | |
| `recent-task-kind` | Dashboard | the Q or F badge; `data-kind` |
| `recent-task-meta` | Dashboard | the status, commit and Plan and Summary links |
| `recent-task-title` | Dashboard | a two-line clamp |
| `todo-detail` | Dashboard | a two-line clamp |
| `todo-files` | Dashboard | the first file's name, with +N for the rest |
| `todo-go` | Dashboard | the arrow on a file-backed todo |
| `todo-main` | Dashboard | |
| `todo-meta` | Dashboard | area, when it was added, and the files, or a STATE.md todo's source chips |
| `todo-row` | Dashboard | a pending todo; `data-severity` is high, medium, low or unrated |
| `todo-severity` | Dashboard | the severity gutter: a square marker (filled for High, dashed for Unrated) and the label |
| `todo-title` | Dashboard | a link only when the todo is a file |

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
| `milestone-delivered` | Roadmap | a History milestone's MILESTONES.md Delivered line in its summary, at the card's full width |
| `milestone-record` | Roadmap | a History milestone's MILESTONES.md entry, above its phase tree |
| `milestone-record-facts` | Roadmap | Git range and What's next, as hairline-divided cells |
| `milestone-retro-button` | Roadmap | a History milestone's Retrospective button at the summary's right edge; icon only on phones, and it never toggles the card |
| `milestone-retro` | Roadmap | the dialog holding a milestone's RETROSPECTIVE.md section: head, rail beside pane, foot |
| `milestone-retro-head` | Roadmap | the dialog's eyebrow, milestone title and History caption |
| `milestone-retro-body` | Roadmap | the rail and the pane, side by side; stacked on phones |
| `milestone-retro-rail` | Roadmap | the vertical tablist of What worked / What was inefficient / Patterns established / Key lessons; a tab row on phones |
| `milestone-retro-tab` | Roadmap | one section in the rail: icon, label, count; an empty section is disabled |
| `milestone-retro-pane` | Roadmap | the open section: its label large, the point count, the numbered points |
| `milestone-retro-count` | Roadmap | "N points from the vX.Y retrospective" under the pane heading |
| `milestone-retro-points` | Roadmap | the open section's points, a mono 01 gutter and the bold lead inline |
| `milestone-retro-foot` | Roadmap | the arrow-key hint at the left and the Older / Newer walk at the right |
| `milestone-retro-keys` | Roadmap | the arrow-key hint in the foot; hidden on phones |
| `milestone-retro-walk` | Roadmap | Older / Newer buttons that move between milestones, keeping the open section |
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
| `sidebar-drawer-actions` | Shell and navigation | |
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

### Planning files drawer

Sketch 038 C (quick-261024-vty): places on the left, the chosen place's files on the right.

| Class | Surface | Note |
|---|---|---|
| `places-navigator` | Planning files drawer | The drawer body: two columns, places left and files right |
| `places-list` | Planning files drawer |  |
| `places-files` | Planning files drawer |  |
| `places-group` | Planning files drawer |  |
| `places-group-label` | Planning files drawer |  |
| `places-group-version` | Planning files drawer |  |
| `places-row` | Planning files drawer |  |
| `places-number` | Planning files drawer |  |
| `places-label` | Planning files drawer |  |
| `places-badge` | Planning files drawer |  |
| `places-row-spacer` | Planning files drawer |  |
| `places-files-head` | Planning files drawer |  |
| `places-where` | Planning files drawer |  |
| `places-files-title` | Planning files drawer |  |
| `places-stage` | Planning files drawer |  |
| `places-file-row` | Planning files drawer |  |
| `places-plan-square` | Planning files drawer |  |
| `places-warning` | Planning files drawer |  |
| `places-back` | Planning files drawer | The phone-only All places link above a place's files; hidden at wider widths |
| `places-quick-group` | Planning files drawer | One milestone's quick tasks: its stage label, then its task rows |
| `places-quick-task` | Planning files drawer | A quick task as one row, date and name, that opens its plan; `data-active` marks it while any of its pages is open |
| `places-fold` | Planning files drawer | One shipped milestone row with its unfolded phases beneath it |

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
| `plan-pair-switch` | Document pages | |
| `warning-disclosure-body` | Document pages | |
| `warning-disclosure-chevron` | Document pages | |
| `warning-disclosure-label` | Document pages | |
| `warning-document-warnings` | Document pages | |
| `warning-fields` | Document pages | |
| `warning-fields-label` | Document pages | |
| `warning-technical-details` | Document pages | |

### Sketches

| Class | Surface | Note |
|---|---|---|
| `sketches-page` | Sketches | The `<main>` of the Sketches page; its `.page-intro` stacks block-wise so the tally sits under the lede |
| `sketches-tally` | Sketches | The "N sketches · M with a winner" line in the page intro, in large numerals |
| `sketch-list` | Sketches | The `<ol>` of sketch rows: one hairline-bordered card, rows separated by hairlines |
| `sketch-row` | Sketches | One sketch: number, main column and actions in a three-column grid with generous padding (a single column under 42rem) |
| `sketch-number` | Sketches | A sketch's number in large mono, muted |
| `sketch-main` | Sketches | A row's middle column: heading, verdict panel and tags, capped at a readable width |
| `sketch-heading` | Sketches | The name-and-question pair at the top of a row |
| `sketch-name` | Sketches | A sketch's name (an `h2`) |
| `sketch-question` | Sketches | A sketch's design question, muted body text capped at a readable measure |
| `sketch-verdict` | Sketches | A row's verdict panel: the picked variant large beside its description; accent-ruled when `data-decided='true'`, dashed otherwise |
| `sketch-verdict-pick` | Sketches | The verdict panel's left cell: the Winner / No winner label over the variant |
| `sketch-verdict-label` | Sketches | The small uppercase Winner / No winner label |
| `sketch-verdict-variant` | Sketches | The picked variant ("C", "B3") in large accent type, muted when undecided |
| `sketch-verdict-text` | Sketches | What the winning variant is, in body text |
| `sketch-tags` | Sketches | A sketch's tags as small hairline-boxed mono labels |
| `sketch-actions` | Sketches | A row's View (secondary) and Open full size (ghost) actions, stacked at the trailing edge |
| `sketch-viewer` | Sketches | The in-page viewer that replaces the list while one sketch is open (`?view=<folder>`) |
| `sketch-viewer-head` | Sketches | The viewer's header, also a `.page-intro` so its top spacing and title match the other pages: eyebrow with the All sketches back link as a breadcrumb, name, question, then the verdict bar |
| `sketch-viewer-bar` | Sketches | The row under the question: the verdict panel beside the Open full size action (stacked under 42rem) |
| `sketch-viewer-actions` | Sketches | The viewer's Open full size action |
| `sketch-viewer-frame` | Sketches | The sandboxed `iframe` (scripts only, no same-origin grant) that shows the sketch |

### Research

| Class | Surface | Note |
|---|---|---|
| `research-page` | Research | The `<main>` of the Research page: a grid of the bar over the spines, filling the viewport under the shell header (`--research-top`, measured) and auto height under 42rem |
| `research-bar` | Research | The slim bar under the shell header: the h1 and the facts line |
| `research-bar-facts` | Research | The confidence chip, "Researched <date>" and "N research files" in small uppercase |
| `research-conf` | Research | A confidence chip: a meter and its lowercase level, in the accent |
| `research-meter` | Research | A row of squared cells (`data-fill` full, half or empty): a 3-cell confidence meter |
| `research-spines` | Research | The row of closed spines and the one open leaf (a column of bars under 42rem) |
| `research-spine` | Research | A closed spine: a button with its number, vertical title and key number (`data-lead` tints Summary) |
| `research-spine-number` | Research | A spine's two-digit number, muted |
| `research-spine-title` | Research | A spine's vertical title and its icon (horizontal under 42rem) |
| `research-spine-foot` | Research | A spine's key number over its confidence meter |
| `research-leaf` | Research | The open spine: a focusable, internally scrolling section |
| `research-leaf-in` | Research | The leaf's padded column, capped at a readable width |
| `research-leaf-head` | Research | The leaf head: the big number, kicker with the file's name, and the numbers, over a hairline |
| `research-leaf-number` | Research | The leaf's big accent number |
| `research-kicker` | Research | The mono label above the file's name |
| `research-leaf-title` | Research | The file's name (an h2) |
| `research-nums` | Research | The leaf's big numbers, each with a small uppercase label |
| `research-verdict` | Research | The file's finding: its first sentence, large |
| `research-tail` | Research | The list after the finding's colon, small and muted |
| `research-more` | Research | The finding's remaining paragraphs, muted, shown once the toggle opens |
| `research-toggle` | Research | The "Read the full summary" / "Read more" / "Show less" button |
| `research-leaf-body` | Research | The panel under the finding: the open file's Summary, Stack or Features body (and the later panels) |
| `research-label` | Research | The mono in-panel label (JetBrains Mono, weight normal, muted, uppercase), as on the plan and summary pages |
| `research-section-head` | Research | A panel section's head: an h3 title and a mono tally, over a hairline |
| `research-tally` | Research | The mono tally at a section head's trailing edge ("4 phases · 1 gated") |
| `research-sec-note` | Research | A muted note under a section head |
| `research-chev` | Research | The row chevron; it turns a quarter when its button is `aria-expanded` |
| `research-icon-btn` | Research | A small squared icon button (the phase inspector's previous and next) |
| `research-chips` | Research | A one-at-a-time chip switch: Stack layers, Features groups |
| `research-chip` | Research | One chip with its count (`aria-pressed`); pressed takes `--primary-tint` and an accent border |
| `research-pf-chip` | Research | A pitfall number chip in the `missing` family; a button when it opens that pitfall |
| `research-pf-chips` | Research | The row of pitfall chips under "Avoids pitfalls" |
| `research-summary` | Research | The Summary body: the build-order section, then the gaps |
| `research-entry` | Research | The entry gate block ahead of phase 01 |
| `research-track-wrap` | Research | The build-order track's horizontal scroller |
| `research-track` | Research | The track: a grid of phase columns and up to two lanes, with the accent line through the numbers (`--research-cols`) |
| `research-stn` | Research | One phase on the track: a button with its number square and card (`data-alongside` hangs it on a dashed tick; `aria-pressed` selects it) |
| `research-stn-num` | Research | A phase's number square; solid accent when selected, dashed when alongside |
| `research-stn-card` | Research | A phase's card: name and marks |
| `research-stn-with` | Research | The "Alongside 01" label on a lane-two card |
| `research-stn-name` | Research | A phase's name, clamped at three lines |
| `research-stn-marks` | Research | A card's marks: Gate, Research and the number of pitfalls it avoids |
| `research-inspect` | Research | The phase inspector under the track |
| `research-inspect-head` | Research | The inspector head: "Phase 02 of 4" kicker over the name, with previous and next |
| `research-inspect-title` | Research | The inspector's phase name (an h4) |
| `research-walk` | Research | The inspector's previous and next buttons |
| `research-inspect-body` | Research | The inspector body: rationale, Delivers and the side facets (one column under 62rem) |
| `research-inspect-why` | Research | The phase rationale, large, across both columns |
| `research-facet` | Research | One labelled facet in the inspector |
| `research-facets-side` | Research | The inspector's right column: gate, avoids, flag and the Uses / Implements / Addresses / Keeps facets |
| `research-dv-grid` | Research | Delivers as tiles in two columns, an odd last tile spanning both (`data-one` for one column); hairlines are borders |
| `research-dv` | Research | One Delivers tile |
| `research-dv-n` | Research | A tile's number |
| `research-dv-main` | Research | A tile's point |
| `research-dv-sub` | Research | A tile's closing parenthetical, on a quiet second line |
| `research-gate` | Research | A barrier block: a lock tile, "Gate" and a checklist; tinted `--primary-tint` with faint diagonal hatching |
| `research-gate-lock` | Research | The gate's solid lock tile (`--primary` with `--primary-foreground` glyph) |
| `research-gate-head` | Research | The gate's title and its "Must pass before this phase can finish" sub line |
| `research-gate-cond` | Research | The gate's conditions, each marked with a small outlined square, never a tick |
| `research-why` | Research | The "Why this order" fold |
| `research-why-list` | Research | The numbered ordering rationale |
| `research-gaps` | Research | The gaps ledger: a numbered two-column list (one column under 62rem) |
| `research-gap` | Research | One gap: an accent number, a bold lead and its body |
| `research-stack` | Research | The Stack body: layers and alternatives |
| `research-features` | Research | The Features body: the landscape and the competitor matrix |
| `research-reasons-wrap` | Research | The decision's reasons block, inside the leaf under the verdict |
| `research-reasons` | Research | The decision's numbered reasons |
| `research-reason` | Research | One reason: a button with its accent number and one-line lead, opening to its body |
| `research-reason-n` | Research | A reason's accent number |
| `research-reason-lead` | Research | A reason's bold lead |
| `research-reason-body` | Research | A reason's opened body |
| `research-gnote` | Research | The chosen layer's note under the chips |
| `research-prows` | Research | The chosen layer's package rows |
| `research-prow` | Research | One package row: name (mono), version (mono, muted) and purpose, opening to its why |
| `research-prow-name` | Research | A package name in mono |
| `research-prow-version` | Research | A package version in muted mono |
| `research-prow-purpose` | Research | A package purpose, muted |
| `research-row-more` | Research | The opened part of a Stack or Features row: a mono label over its text |
| `research-alts` | Research | The "chosen over alternative" rows |
| `research-alt-group` | Research | An alternatives category header (mono label) |
| `research-alt` | Research | One alternative row, opening to "Use it instead when" or "Why not" |
| `research-alt-chosen` | Research | The chosen option; hidden (`data-repeat`) when it repeats the row above |
| `research-alt-over` | Research | The small "over" between the two |
| `research-alt-other` | Research | The alternative that was passed over, muted |
| `research-kinds` | Research | The Features kind switch: three big counts |
| `research-kind` | Research | One kind (expected, differentiators, not to build); pressed takes `--primary-tint`, the accent number and an accent rule |
| `research-frows` | Research | The chosen kind's feature rows |
| `research-frow` | Research | One feature row: name, a one-line why and complexity cells, opening to its why and notes |
| `research-frow-name` | Research | A feature's name |
| `research-frow-why` | Research | A feature's one-line why, hidden while the row is open |
| `research-swaps` | Research | Swap rows (032 A): a thing struck through, then what to do instead |
| `research-swap` | Research | One swap row (`data-open`) |
| `research-swap-button` | Research | A swap's button: number, struck-through text, arrow, instead, chevron |
| `research-swap-n` | Research | A swap's number |
| `research-swap-bad` | Research | The struck-through feature or mistake, in muted text |
| `research-swap-arrow` | Research | The accent arrow between the two |
| `research-swap-good` | Research | The better approach |
| `research-swap-why` | Research | A swap's opened why: mono labels over muted text |
| `research-swap-key` | Research | Mono column labels over a run of swaps (037 B): the item's header over the struck-through column, the fix's header over the fix; hidden on phones |
| `research-matrix` | Research | The competitor matrix: the feature, each rival, then our column (`--research-rivals`); scrolls sideways inside itself |
| `research-matrix-row` | Research | One matrix row (the head row has `data-head`); a click unclamps its cells (`data-open`) |
| `research-matrix-feature` | Research | A row's feature cell |
| `research-matrix-them` | Research | A rival's cell, muted |
| `research-matrix-us` | Research | Our column, tinted `--primary-tint` and headed with the project's name |
| `research-matrix-clamp` | Research | A cell's text, clamped at three lines until its row is clicked |
| `research-matrix-note` | Research | The closing paragraph under the matrix |
| `research-arch` | Research | The Architecture body: overview, structure, scaling, anti-patterns, build order |
| `research-scale` | Research | Scaling considerations (036 A): what breaks first, then every concern at every scale |
| `research-scale-lead` | Research | The section's opening sentence, said large |
| `research-bns` | Research | The ranked bottlenecks |
| `research-bn` | Research | One bottleneck: big number, mono label (where it bites), the problem said large, its fix (`data-first` colours the first number) |
| `research-bn-number` | Research | A bottleneck's big number; `--primary` for the first, muted after |
| `research-bn-text` | Research | The problem, at section-heading size |
| `research-bn-fix` | Research | The fix line: an accent "Fix" label beside the text |
| `research-scale-not` | Research | A "not a bottleneck" note in a dashed box |
| `research-scale-sub` | Research | The "At each scale" subhead over the grid |
| `research-scale-grid` | Research | The concerns × scale grid (`--research-scale-cols`; `data-single` drops the concern column for a one-concern table); stacks by concern on phones |
| `research-scale-corner` | Research | The grid's corner: the table's first header in mono |
| `research-scale-tier` | Research | A scale's column head: number, name, its parenthetical as a quiet second line |
| `research-scale-concern` | Research | A concern's row head |
| `research-scale-cell` | Research | One concern at one scale; `data-tone` holds / na reads muted, `data-pin` marks where a bottleneck bites |
| `research-scale-na` | Research | "Doesn't apply", in italics, for an n/a cell |
| `research-scale-pin` | Research | The bottleneck's number on the cell where it bites |
| `research-scale-cell-tier` | Research | A cell's scale name, shown only on phones where the column heads hide |
| `research-pitfalls` | Research | The Pitfalls body: the watch list, performance / security / UX swaps behind a kind switch, and the check ledger |
| `research-bo` | Research | The build-order graph and its step panel |
| `research-bo-canvas` | Research | The DAG's framed canvas; it scrolls sideways inside itself when the steps do not fit |
| `research-bo-stage` | Research | The canvas's positioned stage (`data-selecting` dims the steps the selection does not touch) |
| `research-bo-wires` | Research | The aria-hidden svg of wires and arrowheads under the step buttons |
| `research-bo-wire` | Research | One wire on the transitive reduction; `data-hot` lights it in `--primary` |
| `research-bo-arrow` | Research | A wire's arrowhead; `data-hot` lights it in `--primary` |
| `research-bo-node` | Research | One step: an absolutely positioned button with its id and name (`aria-pressed` selected, `data-hot` a neighbour); the selected step takes an accent border |
| `research-bo-id` | Research | A step's id square in mono |
| `research-bo-name` | Research | A step's name, up to three lines |
| `research-bo-detail` | Research | The panel under the graph for the selected step |
| `research-bo-big` | Research | The selected step's big accent id |
| `research-bo-title` | Research | The selected step's name (an h4) |
| `research-bo-what` | Research | What the selected step delivers |
| `research-bo-rel` | Research | The Waits for and Unlocks rows |
| `research-bo-note` | Research | A step's notes and its "Also waits for" line, muted |
| `research-bo-hint` | Research | The hint shown while no step is selected |
| `research-step-chip` | Research | A step chip in the panel (a button that selects that step, or a plain "Nothing · starts any time") |
| `research-wl` | Research | The pitfall watch list |
| `research-wl-row` | Research | One pitfall; an open row takes a faint `--missing-fill` tint (`data-open`) |
| `research-wl-head` | Research | A row's button: number, names, how likely, phase, chevron |
| `research-pnum` | Research | A pitfall's number in `--missing-fill` |
| `research-wl-name` | Research | The short name over the full title and the "Watch for" line |
| `research-wl-full` | Research | The full title, muted, under the short name |
| `research-wl-watch` | Research | "Watch for" (mono, `--missing-fill`) with the first warning sign and "+N more" |
| `research-wl-sign` | Research | The first sign and its "+N more" count |
| `research-wl-sign-text` | Research | The first sign, on one line with an ellipsis |
| `research-wl-lk` | Research | The how-likely cell |
| `research-likely` | Research | A 4-cell how-likely meter (or the 3-cell confidence meter) and its level, in `--missing-fill` |
| `research-phase-tag` | Research | The phase that prevents the pitfall, muted, two lines at most |
| `research-wl-open` | Research | An opened row's body, indented under the names |
| `research-p-wrong` | Research | The first sentence of What goes wrong, large |
| `research-p-wrong-list` | Research | What goes wrong as a short list when the file bullets it, marked with small squares |
| `research-p-more` | Research | What goes wrong in full, shown once its toggle opens |
| `research-ptabs` | Research | The tablist: Warning signs, How to avoid, Why it happens, How to verify (empty ones are not drawn) |
| `research-ptab` | Research | One tab; the selected one takes a `--missing-fill` underline |
| `research-ppane` | Research | The selected tab's panel |
| `research-signs` | Research | Warning signs, each marked with a small filled square in `--missing-fill` (no icon, no glyph) |
| `research-avoid` | Research | How to avoid as numbered rows |
| `research-avoid-button` | Research | One way to avoid it: a button whose rest unclamps on click |
| `research-avoid-n` | Research | A row's number |
| `research-avoid-main` | Research | The bold lead (or first sentence) of a way to avoid it |
| `research-avoid-rest` | Research | The rest, clamped at two lines until the row is clicked |
| `research-p-prose` | Research | Why it happens, as prose |
| `research-verify` | Research | How to verify: a mono label and the check over an accent (`--primary`) left rule, with no tick icon |
| `research-ledger` | Research | "Looks done but isn't": a numbered two-column ledger (one column under 62rem), each check with the pitfalls it names as chips |

### Projects

| Class | Surface | Note |
|---|---|---|
| `projects-page` | Projects | The `<main>` of the projects landing page (`projects-page.tsx`) and of the unknown-project page; its `.lede` is set to Body size and a direct-child `<aside>` becomes the side column from 62rem (globals.css, Phase 8 projects block) |
| `project-list` | Projects | The `<ul>` of project rows, ruled top and bottom; shared by the landing page, the unknown-project page and the switcher (globals.css, Phase 8 projects block) |
| `project-row` | Projects | One project: name over path on the left, load mark over last-opened time on the right, an unavailable project's reason on its own line; `data-current="true"` marks the current project (globals.css, Phase 8 projects block) |
| `project-row-name` | Projects | The row's name link, stretched over the whole row; Body size, semibold, clamped at two lines (globals.css, Phase 8 projects block) |
| `project-row-path` | Projects | The row's folder or `ssh://` target in mono with a Folder or Server icon, one line with an end ellipsis; the full value is its `title` (globals.css, Phase 8 projects block) |
| `project-row-meta` | Projects | The landing row's "Opened 3 hours ago" / "Not opened yet" at Meta size, right-aligned under the load mark (under the path at 42rem); the absolute date is its `title` (globals.css, Phase 8 projects block) |
| `brand-lockup` | Projects | The header's brand area: holds the mark-and-wordmark link and the project switcher trigger as siblings in the one `brand` grid area, because a link may not contain a button (globals.css, Phase 8 switcher block and the header block) |
| `project-switcher-trigger` | Projects | The header button that shows the open project's name over its meta line with a chevrons icon and opens the switcher; neutral, never accent; at least 40px tall below 42rem (globals.css, Phase 8 switcher block) |
| `project-switcher-positioner` | Projects | The `Popover.Positioner` wrapper around the switcher popup; only layers it above the header (globals.css, Phase 8 switcher block) |
| `project-switcher-popup` | Projects | The switcher's non-modal popup: the `--popover` surface with a Projects head, the scrolling project list and the footer region; at most 448px wide and min(448px, 70vh) tall, the full viewport width under the header below 42rem (globals.css, Phase 8 switcher block) |
| `project-switcher-footer` | Projects | The switcher popup's footer region, ruled on top and hidden while empty; it holds the "Add or scan…" entry (globals.css, Phase 8 switcher block) |
| `project-add-form` | Projects | The add form: the "Project location" field, its notice (a destructive alert for a failed add, a plain status for a duplicate) and the action row ending in the accent "Add project"; one component (`add-project-form.tsx`) hosted by the landing page's side column and by the add dialog (globals.css, Phase 8 add block) |
| `project-add-dialog` | Projects | The modal "Add a project" dialog opened from the switcher footer; width `min(calc(var(--space-8) * 16), calc(100vw - var(--space-8)))`, title at Heading size (`project-add-dialog.tsx`, globals.css, Phase 8 add block) |

## How to extend

1. **New shared name** — a new class two or more views/pages will use identically: add a row to
   `## Shared vocabulary` above *and* the CSS rule that backs it, in the same commit.
2. **New view-private name** — chrome genuinely local to one view: use the
   `view-<kind>-<suffix>` namespace (`## Reserved view-local namespace`); no doc entry needed.
3. **A reference page fails the vocabulary test** — the vocabulary was written down incompletely.
   Add the missing name to the appropriate table above. **Never** edit `dashboard-page.tsx`,
   `roadmap-page.tsx`, `traceability-page.tsx` or `search-page.tsx` to make the test pass (D-10).
