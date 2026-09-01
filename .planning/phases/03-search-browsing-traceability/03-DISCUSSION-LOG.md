# Phase 3: Search, Browsing & Traceability - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-02
**Phase:** 3-search-browsing-traceability
**Areas discussed:** Search entry & interaction, Match semantics & result layout, Tree navigator placement, Traceability view shape

---

## Search entry & interaction

### Where does search live in the shell?

| Option | Description | Selected |
|--------|-------------|----------|
| Header field + full page | Search input in the header beside Dashboard/Roadmap; typing shows a compact preview dropdown, committing opens a dedicated `/search` results page with full grouping and snippets. Gets FEATURES research's navigate-vs-investigate split without building the v2 Cmd-K palette. | ✓ |
| Header field only | The dropdown IS the result surface, no separate page. Cheapest, but a truncated popover fights FIND-03/04 and results aren't linkable. | |
| Nav destination only | Search as a third nav item with the input on the page. Clean header, but costs a navigation before you can type. | |

**User's choice:** Header field + full page
**Notes:** Recorded as D-01. The Cmd-K palette (NAV-08) stays v2; the one-index/two-entry-points shape means it can be added later as a third entry point without restructuring.

### How do results update as you type?

| Option | Description | Selected |
|--------|-------------|----------|
| Debounced as-you-type | Dropdown updates after ~120–200ms, no Enter needed; Enter opens the full page. Costs a debounce and a stale-response guard. | ✓ |
| Instant, no debounce | Query on every keystroke. Simplest, but each keystroke is an HTTP round-trip and short prefixes match nearly the whole corpus. | |
| Submit only | Nothing until Enter. No debounce or stale-response handling, but drops the preview dropdown just chosen. | |

**User's choice:** Debounced as-you-type
**Notes:** Recorded as D-02. Stale-response guard called out explicitly as a required part of the decision.

### Does the query live in the URL?

| Option | Description | Selected |
|--------|-------------|----------|
| Query in URL on the page only | `/search?q=…` is bookmarkable and refresh-survivable per NAV-06; header dropdown typing stays local state and pushes no history entries. | ✓ |
| Query in URL everywhere, replaceState | Header typing also syncs to the URL with clean history. Copyable mid-typing, but touches the router on every keystroke and flickers the address bar. | |
| Never in the URL | Purely ephemeral state. Simplest, but breaks the shareable-URL pattern every other view follows. | |

**User's choice:** Query in URL on the page only
**Notes:** Recorded as D-03.

### What shows while the index is still building (FIND-05)?

| Option | Description | Selected |
|--------|-------------|----------|
| Field live, query queues | Server listens and dashboard paints first; index builds in background. Field enabled throughout; an early query shows a transient "Indexing…" state and resolves when ready. | ✓ |
| Field disabled until ready | Greyed with an "Indexing…" label until done. Honest and simple, but a control that looks broken, and it punishes the user who launched specifically to search. | |
| Build lazily on first query | No background work; index built on first search. Zero startup cost, but moves the delay onto the first search — the failure PITFALLS #8 names. | |

**User's choice:** Field live, query queues
**Notes:** Recorded as D-04.

---

## Match semantics & result layout

### What does a query match?

| Option | Description | Selected |
|--------|-------------|----------|
| Exact + prefix, no fuzzy | Whole-token matches rank first; trailing prefix keeps as-you-type usable. No edit distance — a typo'd ID resolving to a different real ID is worse than zero results. | ✓ |
| Exact only | Whole indexed tokens only. Strongest FIND-02 guarantee, but makes the as-you-type dropdown nearly useless. | |
| Exact + prefix + fuzzy | Edit-distance tolerance so `ROLE-7` finds `ROLE-07`. Forgiving, but `D-18` also surfaces `D-19`. | |

**User's choice:** Exact + prefix, no fuzzy
**Notes:** Recorded as D-05.

### How should tokenization handle IDs and paths?

Context given: a default tokenizer splits `ROLE-07` into `role` + `07` and `backend/src/authz/mod.rs` into five ordinary words, so a file merely containing "ROLE" and "07" separately can satisfy a `ROLE-07` search.

| Option | Description | Selected |
|--------|-------------|----------|
| Index whole and split | ID/path-shaped tokens indexed both as their intact literal and as split parts. Literal queries hit the intact token and outrank coincidental part-matches; `authz` alone still finds the path. Costs a custom tokenizer and index size. | ✓ |
| Whole tokens only for ID/path shapes | ID/path shapes indexed only as literals. Cleanest exact guarantee and smallest index, but `authz` or `mod.rs` then find nothing in that path. | |
| Default tokenizer, boost adjacency | Stock tokenizer, rely on ranking. No custom code, but can only rank the right answer up, never guarantee it. | |

**User's choice:** Index whole and split
**Notes:** Recorded as D-06 with a `costly` reversibility rating — the tokenizer shapes every indexed document, so changing it later is an index rebuild plus re-verification of every exact-token guarantee.

### What is the grouping shape (FIND-03)?

Context given: much of `.planning/` has no phase — root docs, `research/`, `quick/`, archived milestones.

| Option | Description | Selected |
|--------|-------------|----------|
| Location group → artifact type | Top level is the real location taxonomy: one group per phase plus siblings for root docs, `research/`, `quick/`, each archived milestone. Artifact type clusters within. Phase groups order by execution; active outranks archived. | ✓ |
| Artifact type → phase | All PLAN hits together, subdivided by phase. Better for "where did we decide this in a summary", worse for "what does Phase 2 say about X", and forces non-phase files into a "no phase" bucket inside every type. | |
| Flat ranked list with labels | One relevance-ordered list with phase and type chips. Purest ranking, least layout work, but FEATURES research calls a flat list "close to useless" and it reads as a miss against FIND-03. | |

**User's choice:** Location group → artifact type
**Notes:** Recorded as D-07.

### How many snippets per file (FIND-04)?

| Option | Description | Selected |
|--------|-------------|----------|
| Best snippet, expandable | One snippet on the highest-scoring match plus a match count that expands in place. Grouped list stays scannable; dense files still give up every hit. Snippets deep-link to the nearest heading anchor. | ✓ |
| Best snippet only | One snippet, no expansion — open the file for the rest. Simplest and most compact, but "which of the six places mentions ROLE-07" is often the actual question. | |
| All matches, always | Every match inline. Nothing hidden, but one common word can blow a file into thirty snippets and bury every other group. | |

**User's choice:** Best snippet, expandable
**Notes:** Recorded as D-08.

---

## Tree navigator placement

### Where does the tree live?

Context given: `AppShell` renders a header above a single full-width `shell-content` with no sidebar layout; the oklch sidebar tokens exist but are unused.

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent collapsible sidebar | Left rail on every route, collapsible. The Docusaurus/MkDocs default and what makes the app feel browsable. Cost: changes the Phase 2 shell layout and every long-form page must be re-checked for reading width and overflow. | ✓ |
| Dedicated `/browse` destination | Third nav item, tree owns the page full-width. Zero disruption to the document canvas, but walking the tree becomes a place you go, and every hop back loses reading position. | |
| Overlay drawer | Hidden by default, slides over content. No layout cost, never touches reading width, but modal by nature — can't read a plan and see where it sits at the same time. | |

**User's choice:** Persistent collapsible sidebar
**Notes:** Recorded as D-09. The re-check of Phase 2's long-form reading-width and overflow behavior was accepted as a known cost.

### How to reach the files the domain model drops?

Raised mid-area from codebase evidence: `assemble.ts` surfaces only `root` (line 158) and `phase`/`archived-phase` (lines 184, 190) artifacts. `quick/`, `research/`, `milestones/` root docs, and `other` files are parsed then dropped; `QuickTask` carries only a directory path. FIND-01 and NAV-01 are both unreachable from the assembled model today.

| Option | Description | Selected |
|--------|-------------|----------|
| Extend the snapshot | Assembly exposes every discovered artifact, keeping existing groupings and adding missing locations. Search and tree read one snapshot and can never disagree. A Phase 1-layer change inside Phase 3. | ✓ |
| Index and tree from discovery output | Leave the domain model alone; build both from the raw discovery/parse pass. Narrower blast radius, but creates a second parallel corpus view — ARCHITECTURE Anti-Pattern 3. | |
| Ship phase + root coverage only | Accept today's model. No structural change, but knowingly fails FIND-01 and NAV-01, and `quick/` and `research/` are real places decisions get buried. | |

**User's choice:** Extend the snapshot
**Notes:** Recorded as D-11 with a `costly` reversibility rating — it changes the assembled `Project` shape that Phase 2 views and the committed Phase 1 goldens consume.

### Literal disk mirror or interpreted domain shape?

| Option | Description | Selected |
|--------|-------------|----------|
| Literal disk mirror | Real directories, filenames, and order, including unrecognized files as ordinary nodes. The escape hatch ARCHITECTURE describes. Recorded exclusions render as explicitly-marked stubs. | ✓ |
| Interpreted domain shape | Nodes are phases, plans, requirements with friendly names. Prettier, but duplicates the roadmap view and can only show what the parser understood. | |
| Domain names over disk structure | Real structure, parsed titles as labels where available. Readable and structurally faithful, but labels no longer match a terminal, weakening it as a cross-check. | |

**User's choice:** Literal disk mirror
**Notes:** Recorded as D-10.

### Load and navigation behavior?

| Option | Description | Selected |
|--------|-------------|----------|
| Route-synced, minimal expansion | Top-level groups visible, rest collapsed; auto-expands and highlights the current route's branch. Manual expansion persists within the session; navigation never collapses a hand-opened branch. | ✓ |
| Route-synced, remembered across sessions | Same, plus `localStorage` persistence. Nicer on a casually-opened tool, but the app's first persisted client state, and can disagree with a changed project. | |
| Fully expanded, no route sync | Everything open, ignores the current route. Nothing to implement, but an unusable wall of files on a mature project and no orientation. | |

**User's choice:** Route-synced, minimal expansion
**Notes:** Recorded as D-12. `localStorage` persistence explicitly deferred.

---

## Traceability view shape

Context given: `REQUIREMENTS.md` carries three status-ish signals — the per-requirement checkbox in the categorized v1 list, the `Status` column in its own Traceability table, and (via `coveringPhaseRefs`) the covering phase's `roadmapComplete` and `diskStatus`, which Phase 2's D-02 deliberately keeps apart.

### Which status does a row show?

| Option | Description | Selected |
|--------|-------------|----------|
| Requirement status + phase status, side by side | Two labeled columns; disagreement flagged rather than resolved. Extends D-02 — the value is catching a requirement marked Complete under a phase that isn't. | ✓ |
| Requirement's own status only | Show what REQUIREMENTS.md says and stop. Simplest, one source of truth, but re-renders a table you can already read and can't surface disagreements. | |
| Single derived status | Reconcile into one computed verdict. Cleanest to scan, and exactly what D-02 rejected — a plausible merged value hiding which source disagreed. | |

**User's choice:** Requirement status + phase status, side by side
**Notes:** Recorded as D-13.

### How is the view organized?

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped by category, filterable | Mirrors REQUIREMENTS.md's own feature-area headings; filter by ID or text, status filters isolate uncovered and disagreeing rows. Real editorial structure, not synthetic grouping. | ✓ |
| Grouped by covering phase | Each phase lists what it covers. Useful, but largely what the roadmap's expanded phase already shows, and strands unclaimed requirements in an orphan bucket. | |
| One flat sortable table | Closest to REQUIREMENTS.md's own table, least code. Drops the category structure that makes 40+ requirements navigable; sorting is weaker than filtering for "show me what's uncovered". | |

**User's choice:** Grouped by category, filterable
**Notes:** Recorded as D-14.

### What happens to rows that don't fit requirement → phase → status?

| Option | Description | Selected |
|--------|-------------|----------|
| v1 in full, v2 in a separate section | Every v1 requirement appears, uncovered ones marked. Dangling phase refs render as raw text plus an unresolved marker (Phase 1 D-10, Phase 2 D-17). v2/future in their own labeled section. | ✓ |
| v1 only | Strictly the tier being built. Tightest, but v2 requirements are real recorded scope with nowhere in the UI. | |
| Everything in one list, tier as a column | All tiers with a tier column and filter. Nothing hidden, but v2 rows carry no checkbox or phase and read as gaps rather than deliberate future scope. | |

**User's choice:** v1 in full, v2 in a separate section
**Notes:** Recorded as D-15.

### Where does it live?

| Option | Description | Selected |
|--------|-------------|----------|
| Nav item + tree entry | Top-level destination beside Dashboard and Roadmap, also reachable by clicking REQUIREMENTS.md in the tree. A standing surface for "is anything uncovered". Linkified requirement IDs can point here. | ✓ |
| A section of the roadmap page | Folded below the phase flow. Keeps the header to three items, but the roadmap page is already dense and this buries a distinct question. | |
| The rendered view of REQUIREMENTS.md | A traceability panel above that artifact page's body. Zero new navigation, sits with the document it describes, but only findable if you think to open that file. | |

**User's choice:** Nav item + tree entry
**Notes:** Recorded as D-16.

---

## Claude's Discretion

- Search library selection and configuration (`minisearch` is the STACK.md recommendation but is not yet installed; research must confirm it expresses D-05 and D-06 before locking it in).
- Debounce interval, dropdown result cap, snippet character window, stale-response guard technique.
- Field boosting of title/frontmatter hits over body hits; demotion of archived-milestone hits.
- Whether PLAN pseudo-XML tags and YAML keys are stripped from indexed text (PITFALLS #8's default is yes).
- Sidebar auto-collapse on long-form artifact routes and narrow-viewport behavior.
- What a tree node opens for a non-markdown or unparseable file.
- Sidebar width, tree indentation, expansion affordance, result-group visual treatment.
- Plan sizing and wave structure within the roadmap's two-plan sizing.

## Deferred Ideas

- Cmd-K command palette over the same index (NAV-08, v2).
- Faceted search by requirement ID, phase, or artifact type (FIND-06, v2).
- Decision-ID and warning-ID linkification extending NAV-07's mention index into the UI (BACK-02, v2).
- A backlinks panel ("what references this") on requirement, decision, and phase pages — named in FEATURES research as a genuine differentiator, not in the Phase 3 requirement set.
- Persisting search-index build output across restarts keyed on `bodyHash`/mtime (PITFALLS #8 refinement).
- Persisting tree expansion state to `localStorage` across sessions.

### Gray areas noticed but not raised

Offered at wrap-up and declined: sidebar auto-collapse on long-form pages, what a tree node opens for an unparseable file, whether pseudo-XML/YAML is stripped before indexing, and whether archived-milestone hits are demoted. All four were folded into Claude's Discretion rather than left open.
