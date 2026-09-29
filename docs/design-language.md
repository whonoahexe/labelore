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
| `figure-frame-bar` | The frame's top bar — title left, Fit / Actual size and Expand chips right — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `figure-frame-title` | The frame bar's uppercase mono title — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `figure-frame-body` | The frame's scrolling body (scrolls at actual size; `document-overflow-boundary` alongside) — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `figure-frame-caption` | The dashed-rule caption under the body — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `figure-frame-dialog` | The Expand dialog popup — the same figure at actual size (Base UI Dialog, mirrors `sidebar-drawer`) — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `figure-frame-plain` | A figure the lift rejects (or a non-diagram block): plain text with its glyphs dimmed — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram` | The lifted diagram host: `position: relative`, holds the cards behind the text — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-fit` | The wrapper the Fit to width scale is measured against — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-card` | One decorative card behind the text (`data-kind` box / node), positioned from the measured character width and row height — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-text` | The `<pre>` of real ASCII text, above the cards — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-row` | One fixed-height line of the diagram — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-node` | A node/box title — semibold — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-sub` | A second line inside a node — muted — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `lifted-diagram-note` | Free text beside boxes — muted italic annotation — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `clean-tree` | The clean-list directory tree (`<ul>`) — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `clean-tree-tools` | The tree's tools row — Changed only chip, file/folder counts — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `clean-tree-count` | The `F files · D folders` count — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `clean-tree-row` | One tree row: name column, notes column (`data-badge` NEW / EXTEND / EXISTING) — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `clean-tree-name` | The indented name cell with its Folder/File icon — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `clean-tree-folder` | A collapsible folder's toggle button (`aria-expanded`) — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |
| `clean-tree-note` | The notes cell — badge chip plus the `# comment` — sketch-009 B figure, view-agnostic (quick-260929-3x3) | globals.css — quick-260929-3x3 block |

## Tones

| Tone | Meaning | Used for |
|------|---------|----------|
| `active` | In progress / currently selected — accent-tinted | A chosen discussion-log option, the current phase while in progress, an active outline entry, a sketch-004 B3 item's "Chosen"/"Claude chose" state chip, (quick-260923-jxp) a discussion item's "Custom answer" state chip, and (quick-260925-3ug) a CONTEXT specific idea's Rule chip, and (quick-260929-3x3) a RESEARCH tree's NEW badge |
| `complete` | Finished / matched — accent-tinted (shares styling with `active`) | A completed phase or plan, an exact traceability match, a sketch-004 B3 document's "N of N decided"/"Passed" cover status and a fully-verified item's state chip, and (quick-260929-3x3) a RESEARCH viable alternative and high (or medium-high) confidence |
| `quiet` | Neutral coverage gap — muted-foreground, never alarming | An unrecognized/unmanifested type, a non-exact traceability match, a phase not yet started, every sketch-004 B3 roll-up chip and Also-chapter panel chip, and (quick-260923-jxp) an unresolved discussion item's "Open" state chip, a chosen answer's qualifier chip, a declined-area ghost row's "Not discussed" chip, and (quick-260925-3ug) a CONTEXT specific idea's Note chip, and (quick-260929-3x3) on a RESEARCH page a rejected alternative, a resolved open question, an EXISTING tree badge, MEDIUM/LOW pitfall chips, F-codes, already-pinned / host-binary package badges and an OK seam verdict |
| `destructive` | Genuine read/parse failure only | The "Unreadable" artifact-parse chip; never used for a merely-unrecognized type; never used by any sketch-004 B3 document-content chip (state/rollup/pill), which stay within `active`/`complete`/`quiet`/`in-flight`/`missing` |
| `warning` | Partial read/parse degradation only | The "Warning" artifact-parse chip; never used by any sketch-004 B3 document-content chip, same rule as `destructive` above |
| `in-flight` | A phase or item currently being worked, or waiting on someone | Traceability covering-phase signal, a sketch-004 B3 document's "Awaiting checkpoint"/"Gaps found" cover status, and the CONTEXT brief's open questions (open-question chips, an area's "N open" chip, the "open for the researcher" stat and panel rule), and (quick-260925-3ug) a CONTEXT specific idea's Leaning chip plus a deferred idea's "Revisit if" label, and (quick-260929-3x3) on a RESEARCH page a SUS package badge and the Flagged lane, a HIGH pitfall, an open question, an EXTEND tree badge, mid/mixed confidence, a later-phase alternative, and the ASSUMED evidence marker |
| `missing` | An expected item that has not appeared | Traceability covering-phase signal, a sketch-004 B3 gap item's "Failed" state chip, and (quick-260929-3x3) on a RESEARCH page the Removed lane and a SLOP verdict, a CRITICAL pitfall, a blocking environment chip and a ✗, a do-not-use alternative, low confidence, and a bad audit signal (a fresh package, few downloads, no repo) |

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
- **Squared corners.** `border-radius` is unset (0) everywhere except 3 existing call sites of
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
  Source mode is always the way back to the raw text.
- **The 10% accent reservation extends to the figures.** (quick-260929-3x3) The lifted diagram's
  arrows and node-card tint, and the clean tree's folder names and icons, take `--primary` (the
  NEW chip uses the shared `active` tone). Box cards, connector glyphs, notes and file names stay on
  `--border`, `--background` and the muted foreground.
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
| `attention-panel` | Dashboard | shared with the CONTEXT brief (quick-260923-lju) |
| `checkpoint-badge` | Dashboard | |
| `checkpoint-callout` | Dashboard | |
| `checkpoint-content` | Dashboard | |
| `checkpoint-header` | Dashboard | |
| `checkpoint-link` | Dashboard | |
| `dashboard-grid` | Dashboard | |
| `dashboard-loading` | Dashboard | |
| `dashboard-page` | Dashboard | |
| `immediate-work` | Dashboard | shared with the CONTEXT brief (quick-260923-lju) |
| `item-kind` | Dashboard | |
| `milestone-label` | Dashboard | |
| `next-preview` | Dashboard | |
| `next-primary` | Dashboard | |
| `plan-breakdown-pills` | Dashboard | |
| `plan-pill` | Dashboard | |
| `plan-progress-headline` | Dashboard | |
| `plan-progress-summary` | Dashboard | |
| `position-copy` | Dashboard | |
| `position-hero` | Dashboard | shared with the CONTEXT brief (quick-260923-lju) |
| `position-meta` | Dashboard | |
| `preview-empty` | Dashboard | |
| `preview-list` | Dashboard | |
| `preview-panel` | Dashboard | shared with the CONTEXT brief (quick-260923-lju) |
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
