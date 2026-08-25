# Phase 2: Situational Awareness & Artifact Reading - Research

**Researched:** 2026-08-25
**Domain:** Local read-only React dashboard, milestone routing, and safe technical-document rendering
**Confidence:** HIGH for repository architecture; MEDIUM for current external-library guidance

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Landing-Page Hierarchy

- **D-01:** The first screen is current-position-first. Lead with the current milestone, phase, status,
  and immediate next work; progress and exceptions follow rather than competing with that answer.
- **D-02:** Use one primary progress display. Keep observed disk completion as a compact, explicitly
  sourced secondary signal and surface a prominent discrepancy alert when it differs from formal
  roadmap completion. The two underlying signals remain distinct even though they do not receive equal
  visual weight.
- **D-03:** Combine blockers, human-verification waits, and status discrepancies into one prioritized
  **Needs attention** list. Every item carries a clear type label.
- **D-04:** Show one explicit immediate next item with a short explanation of why it is next, followed by
  the next two items in a quieter preview. Do not turn the landing page into the full remaining-work
  queue.

### Roadmap and Milestone Browsing

- **D-05:** The primary roadmap is a vertical phase flow ordered by execution, using compact dependency
  connectors and status markers rather than a graph canvas.
- **D-06:** Each phase is compact by default: identity, status, goal, dependencies, and progress are
  always visible. Success criteria, mapped requirements, and wave-grouped plans expand in place.
- **D-07:** Archived milestones live in a dedicated, clearly labeled history section. Use subdued visual
  treatment and expandable archived phase trees so history is reachable without competing with the
  active milestone.
- **D-08:** Within an expanded phase, render plans in vertically stacked wave bands. Plans appear as rows
  inside each band, with explicit `blocked by` labels wherever dependencies require them.

### Artifact-Reading Experience

- **D-09:** Artifact pages use a document-first reading canvas: breadcrumbs, title, artifact type, and a
  compact structured summary lead directly into the rendered document.
- **D-10:** Known frontmatter fields such as `must_haves`, `coverage`, `key_links`, and `progress` receive
  artifact-aware tables, badges, or panels. Unknown fields remain visible in a generic key/value panel;
  specialized presentation must never become a reason to drop unfamiliar data.
- **D-11:** PLAN pseudo-XML becomes semantic document structure. `<objective>`, `<task>`, and `<decision>`
  render as labeled sections, nested markdown renders normally, and meaningful attributes such as task
  type become badges. Literal tags must neither disappear as HTML nor leak as garbage text.
- **D-12:** A paired plan/summary page begins with a truth-to-coverage matrix matching the plan's
  `must_haves.truths` against summary `coverage`, then renders the full plan and full summary as stacked
  sections with jump links. Preserve full reading width for tables and code.

### Deep Links and Document Navigation

- **D-13:** Bookmarkable URLs use a readable, milestone-qualified hierarchy encoding milestone, phase,
  plan, and artifact identity. Duplicate phase numbers across milestones must never collide.
  — **Reversibility:** costly — changing the public route shape after links are copied would invalidate
  bookmarks, cross-links, and Phase 3 search-result destinations.
- **D-14:** Clicking a recognized requirement, phase, or plan ID opens a preview first rather than
  navigating immediately. The preview includes an explicit **Open** action.
- **D-15:** Link previews are compact and type-aware: show identity, title, status, location, and the most
  useful type-specific detail (requirement text, phase goal, or plan objective), without becoming a
  miniature full page.
- **D-16:** Headings reveal a copy-link affordance on pointer hover and keyboard focus. Activating it
  updates and copies the stable section URL; anchor controls are not permanently visible and the URL
  does not automatically change during scrolling.
- **D-17:** Carry forward Phase 1's dangling-reference rule: if an ID has no resolved definition, render
  it as ordinary text with no broken link or misleading preview affordance.

### the agent's Discretion

- Exact spacing, typography scale, responsive breakpoints, and low-level component composition within
  the required studio-portal visual language.
- Exact route segment names and slug-normalization mechanics, provided D-13's milestone-qualified,
  readable hierarchy and stable identity constraints hold.
- Preview placement, dismissal mechanics, and subtle transitions, provided pointer and keyboard users
  receive equivalent access.
- Exact dependency-connector drawing technique for the vertical flow. Phase 1 preserves the roadmap's
  free-form dependency text; research and planning may choose the safest derivation strategy without
  expanding this phase into a graph editor or graph canvas.

### Deferred Ideas (OUT OF SCOPE)

- Add a richer dependency graph canvas in a future phase. Phase 2 intentionally uses the vertical
  phase flow with compact connectors; ROAD-03's legible-flow requirement must still be satisfied now.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DASH-01 | Landing view shows current milestone, current phase number and name, status, and progress, sourced from `STATE.md` frontmatter | Dashboard selector and cycle-free DTO patterns |
| DASH-02 | Landing view shows what comes next and what is blocked | Deterministic next-work and dependency selectors |
| DASH-03 | Landing view shows work awaiting human verification | Coverage/checkpoint attention extraction |
| DASH-04 | Formal roadmap completion and observed disk state remain separate and disagreements are visible | Existing `roadmapComplete` / `diskStatus` contract |
| ROAD-01 | Every phase shows goal, success criteria, mapped requirements, and dependencies | Existing `Phase` projection and expansion pattern |
| ROAD-02 | Plans are grouped by wave with blocked-on relationships | Open-frontmatter wave grouping and `dependsOnRefs` |
| ROAD-03 | Phase dependencies render as a legible flow, not ASCII art | Ordered vertical spine plus verbatim dependency labels |
| ROAD-04 | Phase identity is milestone-qualified throughout | Canonical route-key builder from `PhaseIdentity` |
| READ-01 | GFM tables, highlighted code, task lists, and blockquotes render | unified/remark/rehype/Shiki pipeline |
| READ-02 | Known YAML fields render as structured panels | Frontmatter view registry with generic remainder |
| READ-03 | PLAN pseudo-XML renders as semantic structure | Bounded pseudo-XML segment parser before markdown |
| READ-04 | Rendered markdown is sanitized | `rehype-raw` → `rehype-sanitize` security order |
| READ-05 | Plan and summary read together with truth-to-coverage matching | Pair DTO plus conservative match matrix |
| READ-06 | Document headings have stable anchors | `rehype-slug` plus custom copy-link affordance |
| NAV-02 | Requirement IDs in prose link to the covering phase | AST text-node linkifier and canonical resolver |
| NAV-03 | Phase and plan references in prose link correctly | Milestone-contextual reference resolution |
| NAV-04 | Undefined IDs remain plain text | Linkifier emits a control only after successful resolution |
| NAV-06 | URLs map to milestone → phase → plan → artifact | Central route codec and SPA fallback |
| HIST-01 | Archived milestones are viewable and visually distinct | Archived milestone section from `Project.milestones` |
| HIST-02 | Archived phase trees are browsable | Expandable archived phase/artifact projection |
| UI-01 | Use studio-portal oklch/base-sera/lucide/squared-corner language | Verified visual source and shadcn Vite setup |
| UI-02 | Light and dark themes work on long-form content | Shared token port, no-flash theme init, Shiki dual themes |
| UI-03 | Wide content scrolls locally; page body never scrolls horizontally | Explicit containment contract and real-corpus UAT |
</phase_requirements>

## Summary

Phase 2 should be planned as six cooperating subsystems rather than three page-shaped plans: delivery/API shell, cycle-free client DTOs and selectors, canonical routing/reference resolution, dashboard/roadmap/history views, the artifact-rendering pipeline, and the studio-portal-derived visual shell. The Phase 1 dependency direction is already fixed: browser and server presentation code consume `PlanningRepository.load()` output and must never read the target filesystem directly. The repository refresh seam produces a new snapshot and is the only load boundary. [VERIFIED: `src/planning-repo/snapshot.ts:15-26,57-90`]

The most important hidden constraint is serialization. The in-memory domain graph is deliberately cyclic: phase requirement references point to requirements, whose covering-phase references can point back to phases. `JSON.stringify` therefore cannot be used directly at a Hono endpoint. Phase 2 needs an explicit cycle-free API DTO that replaces object references with canonical identity keys and provides artifact bodies through snapshot-derived lookup—not through route-local disk reads. [VERIFIED: `src/planning-repo/serialize.ts:28-45`; `src/domain/model.ts:120-171`]

The renderer should treat source markdown as hostile even though the app is local. Parse the small, recognized PLAN pseudo-XML grammar into semantic segments before Markdown conversion; run ordinary content through the official raw-HTML/sanitization chain; add only trusted heading/link/highlight nodes after sanitization; initialize Shiki once; and render Mermaid in the browser with `securityLevel: 'strict'`. [CITED: https://github.com/remarkjs/remark-rehype#example-supporting-html-in-markdown-properly] [CITED: https://mermaid.js.org/config/usage.html]

**Primary recommendation:** Build one reusable `ProjectPresentation`/DTO and one canonical route/reference codec first; make every dashboard, roadmap, preview, and document view consume those two seams.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Target path and snapshot loading | API / Backend | Database / Storage (filesystem adapter) | The existing Node repository owns all reads and returns one immutable snapshot. [VERIFIED: `src/planning-repo/snapshot.ts:15-26,57-90`] |
| Cycle-free project/artifact DTO | API / Backend | Browser / Client | Server flattens cyclic references into stable keys; the browser never sees parser/fs types. [VERIFIED: `src/planning-repo/serialize.ts:28-45`] |
| Dashboard fact derivation | API / Backend | Browser / Client | Pure selectors derive current position, next work, attention, and the two progress signals; React only assigns visual hierarchy. [VERIFIED: `.planning/STATE.md:2-16`; `src/domain/model.ts:120-145`] |
| Roadmap and history flow | Browser / Client | API / Backend | React owns disclosure/layout; data comes from milestone-qualified DTOs. [VERIFIED: `src/domain/model.ts:147-190`] |
| Markdown and PLAN parsing | API / Backend | Browser / Client | Server produces sanitized HTML and semantic metadata; browser adds interactive previews, copy links, and Mermaid rendering. [CITED: https://github.com/remarkjs/remark-rehype#example-supporting-html-in-markdown-properly] |
| Canonical URLs and reference resolution | Shared route module | API / Backend | A pure codec is shared by route generation, API lookup, breadcrumbs, previews, and future Phase 3 search destinations. [VERIFIED: `src/domain/model.ts:82-93`] |
| Reference preview interaction | Browser / Client | API / Backend | Base UI popover positioning/focus behavior belongs in the browser; preview data comes from the DTO. [CITED: https://base-ui.com/react/components/popover] |
| Static assets and SPA fallback | API / Backend | CDN / Static | Hono serves Vite output and returns `index.html` for non-API deep links. [CITED: https://hono.dev/docs/getting-started/nodejs] |

## Standard Stack

The project already pins TypeScript `5.9.3`, Vitest `4.1.11`, and `gray-matter` `4.0.3`; keep those exact versions and add the web stack without upgrading the established toolchain. [VERIFIED: `package.json:14-25`]

### Core

| Library | Version / publish date checked | Purpose | Why Standard |
|---------|--------------------------------|---------|--------------|
| `vite` [WARNING: flagged as suspicious — verify before using.] | 8.2.2 / 2026-08-20 | Browser dev/build tool | Official backend integration and JS APIs fit the existing Node entrypoint. [CITED: https://vite.dev/guide/backend-integration.html] |
| `react`, `react-dom` | 19.2.8 / 2026-07-21 | UI and DOM renderer | React's official existing-project guide installs both packages. [VERIFIED: npm registry] [CITED: https://react.dev/learn/add-react-to-an-existing-project] |
| `hono` + `@hono/node-server` [WARNING: both flagged as suspicious — verify before using.] | 4.13.4 / 2026-08-24; 2.1.1 / 2026-08-14 | JSON API and production static server | Official Node adapter supplies `serve` and static-file middleware. [CITED: https://hono.dev/docs/getting-started/nodejs] |
| `react-router` | 8.3.0 / 2026-07-22 | Client routing | Official library mode supports nested routes, dynamic segments, loaders, and route handles. [VERIFIED: npm registry] [CITED: https://reactrouter.com/start/data/routing] |
| `@tanstack/react-query` [WARNING: flagged as suspicious — verify before using.] | 5.102.3 / 2026-08-24 | Server-state cache | Establishes one query invalidation seam for Phase 4 refresh and future watcher events. [CITED: https://tanstack.com/query/latest/docs/framework/react/installation] |
| `tailwindcss` + `@tailwindcss/vite` | 4.3.3 / 2026-07-16 | Token-driven styling | Official Vite plugin and CSS-first setup match the theme source. [VERIFIED: npm registry] [CITED: https://tailwindcss.com/docs/installation/using-vite] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vitejs/plugin-react` [WARNING: flagged as suspicious — verify before using.] | 6.1.0 | React Fast Refresh transform | Vite web configuration. [CITED: https://vite.dev/plugins/] |
| `unified` | 11.0.5 | AST pipeline | Processor core. [VERIFIED: npm registry] |
| `remark-parse` / `remark-gfm` | 11.0.0 / 4.0.1 | Markdown and GFM parsing | All artifact bodies. [VERIFIED: npm registry] |
| `remark-rehype` | 11.1.2 | mdast → hast | Bridge after PLAN segmentation. [VERIFIED: npm registry] |
| `rehype-raw` / `rehype-sanitize` | 7.0.0 / 6.0.0 | Parse then sanitize embedded HTML | Always adjacent and in this order. [VERIFIED: npm registry] [CITED: https://github.com/remarkjs/remark-rehype#example-supporting-html-in-markdown-properly] |
| `rehype-slug` / `rehype-stringify` | 6.0.0 / 10.0.1 | Stable heading IDs and HTML | Whole-document postprocessing/output. [VERIFIED: npm registry] |
| `shiki` [WARNING: flagged as suspicious — verify before using.] | 4.4.3 | Code highlighting with dual themes | Initialize once; emit light/dark CSS variables. [CITED: https://shiki.style/guide/dual-themes] |
| `mermaid` [WARNING: flagged as suspicious — verify before using.] | 11.17.1 | Diagram rendering | Browser-only, manually run under strict security. [CITED: https://mermaid.js.org/config/usage.html] |
| `@base-ui/react` [WARNING: flagged as suspicious — verify before using.] | 1.7.0 | Accessible popover/disclosure primitives | Link previews and roadmap expansion. [CITED: https://base-ui.com/react/components/popover] |
| `lucide-react` [WARNING: flagged as suspicious — verify before using.] | 1.34.0 | Icons | Theme toggle, copy link, status/attention icons. [CITED: https://lucide.dev/] |
| `class-variance-authority`, `clsx`, `tailwind-merge` | 0.7.1 / 2.1.1 / 3.6.0 | Generated component variants and class merging | Match base-sera component conventions. [VERIFIED: npm registry] [CITED: https://ui.shadcn.com/docs/installation/manual] |
| `tw-animate-css` | 1.4.0 | Generated component transition utilities | Only where selected base-sera primitives require them. [VERIFIED: npm registry] |
| `shadcn` [WARNING: flagged as suspicious — verify before using.] | 4.19.0 | One-time base-sera component generation | Install as a dev tool and invoke locally; do not make the app import the CLI. [CITED: https://ui.shadcn.com/docs/installation/vite] [CITED: https://ui.shadcn.com/docs/changelog/2026-04-sera] |
| `@types/react`, `@types/react-dom` [WARNING: both flagged as suspicious — verify before using.] | 19.2.18 / 19.2.5 | React TypeScript types | React's official TypeScript guide names both packages; use them only in the web tsconfig. [CITED: https://react.dev/learn/typescript] |
| `eslint-plugin-react-hooks` | 7.1.1 | Hooks lint rules | Extend the existing flat ESLint config for TSX. [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate cycle-free DTO | `normalizeForGolden()` output | Rejected: golden normalization duplicates shared references, emits `$circularRef` stubs, and optionally removes bodies; it is a harness format, not a client API contract. [VERIFIED: `src/planning-repo/serialize.ts:41-87`] |
| Server-rendered sanitized HTML | Client-only Markdown processing | Client processing increases bundle/work per navigation and makes security/pipeline consistency harder; Mermaid remains the one browser-only stage. [CITED: https://mermaid.js.org/config/usage.html] |
| Bounded PLAN grammar | XML DOM parser | GSD PLAN bodies contain Markdown within XML-like wrappers rather than a schema-validated XML document; parsing only recognized wrappers preserves forward-compatible Markdown. [VERIFIED: `src/planning-repo/handlers/plan.ts:1-25`; `fixtures/dense/.planning/phases/01-identity-slice/01-01-PLAN.md:23-91`] |
| Vertical execution spine | Parsed dependency graph | The existing source contract deliberately keeps phase dependency text free-form and does not create edges. [VERIFIED: `src/domain/model.ts:127-130`; `src/planning-repo/crossref.ts:63-66`] |
| Base UI popover | Custom floating/focus manager | Base UI already supports anchoring to a supplied element and collision handling. [CITED: https://base-ui.com/react/components/popover] |

**Installation:**

```bash
npm install react@19.2.8 react-dom@19.2.8 react-router@8.3.0 \
  @tanstack/react-query@5.102.3 hono@4.13.4 @hono/node-server@2.1.1 \
  unified@11.0.5 remark-parse@11.0.0 remark-gfm@4.0.1 remark-rehype@11.1.2 \
  rehype-raw@7.0.0 rehype-sanitize@6.0.0 rehype-slug@6.0.0 \
  rehype-stringify@10.0.1 shiki@4.4.3 mermaid@11.17.1 \
  @base-ui/react@1.7.0 lucide-react@1.34.0 class-variance-authority@0.7.1 \
  clsx@2.1.1 tailwind-merge@3.6.0 tw-animate-css@1.4.0

npm install --save-dev vite@8.2.2 @vitejs/plugin-react@6.1.0 \
  tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 shadcn@4.19.0 \
  @types/react@19.2.18 @types/react-dom@19.2.5 eslint-plugin-react-hooks@7.1.1
```

All version numbers above were checked with `npm view <package> version` on 2026-08-25. None of the checked packages reports a `scripts.postinstall` value. [VERIFIED: npm registry]

## Package Legitimacy Audit

The table records the exact 2026-08-25 package-legitimacy seam output. `SUS` here means the latest release triggered the seam's `too-new` rule; protocol requires a human checkpoint even where official documentation and very high download counts strongly indicate a legitimate package. [VERIFIED: package-legitimacy seam]

| Package | Registry | Age | Downloads/wk | Source Repo | Verdict | Disposition |
|---------|----------|-----|--------------|-------------|---------|-------------|
| vite | npm | 6y | 169,369,863 | github.com/vitejs/vite | SUS (`too-new`) | Flagged — checkpoint |
| react | npm | 14y | 170,480,639 | github.com/react/react | OK | Approved |
| react-dom | npm | 12y | 159,631,504 | github.com/react/react | OK | Approved |
| @vitejs/plugin-react | npm | 4y | 83,483,737 | github.com/vitejs/vite-plugin-react | SUS (`too-new`) | Flagged — checkpoint |
| hono | npm | 4y | 56,399,133 | github.com/honojs/hono | SUS (`too-new`) | Flagged — checkpoint |
| @hono/node-server | npm | 3y | 52,961,881 | github.com/honojs/node-server | SUS (`too-new`) | Flagged — checkpoint |
| react-router | npm | 12y | 51,841,394 | github.com/remix-run/react-router | OK | Approved |
| @tanstack/react-query | npm | 4y | 66,137,030 | github.com/TanStack/query | SUS (`too-new`) | Flagged — checkpoint |
| unified | npm | 11y | 52,760,558 | github.com/unifiedjs/unified | OK | Approved |
| remark-parse | npm | 10y | 49,018,100 | github.com/remarkjs/remark | OK | Approved |
| remark-gfm | npm | 5y | 37,445,521 | github.com/remarkjs/remark-gfm | OK | Approved |
| remark-rehype | npm | 10y | 42,083,773 | github.com/remarkjs/remark-rehype | OK | Approved |
| rehype-raw | npm | 9y | 17,693,218 | github.com/rehypejs/rehype-raw | OK | Approved |
| rehype-sanitize | npm | 9y | 9,547,765 | github.com/rehypejs/rehype-sanitize | OK | Approved |
| rehype-slug | npm | 9y | 3,306,643 | github.com/rehypejs/rehype-slug | OK | Approved |
| rehype-stringify | npm | 10y | 7,768,595 | github.com/rehypejs/rehype | OK | Approved |
| shiki | npm | 12y | 20,802,425 | github.com/shikijs/shiki | SUS (`too-new`) | Flagged — checkpoint |
| mermaid | npm | 11y | 14,526,740 | github.com/mermaid-js/mermaid | SUS (`too-new`) | Flagged — checkpoint |
| tailwindcss | npm | 8y | 125,155,069 | github.com/tailwindlabs/tailwindcss | OK | Approved |
| @tailwindcss/vite | npm | 2y | 46,022,969 | github.com/tailwindlabs/tailwindcss | OK | Approved |
| @base-ui/react | npm | 8mo | 10,466,051 | github.com/mui/base-ui | SUS (`too-new`) | Flagged — checkpoint |
| lucide-react | npm | 5y | 96,054,697 | github.com/lucide-icons/lucide | SUS (`too-new`) | Flagged — checkpoint |
| class-variance-authority | npm | 4y | 64,279,699 | github.com/joe-bell/cva | OK | Approved |
| clsx | npm | 7y | 120,733,677 | github.com/lukeed/clsx | OK | Approved |
| tailwind-merge | npm | 5y | 82,644,022 | github.com/dcastil/tailwind-merge | OK | Approved |
| tw-animate-css | npm | 1y | 38,303,711 | github.com/Wombosvideo/tw-animate-css | OK | Approved |
| shadcn | npm | 2y | 8,179,709 | github.com/shadcn-ui/ui | SUS (`too-new`) | Flagged — checkpoint |
| @types/react | npm | 10y | 159,239,097 | github.com/DefinitelyTyped/DefinitelyTyped | SUS (`too-new`) | Flagged — checkpoint |
| @types/react-dom | npm | 10y | 132,166,946 | github.com/DefinitelyTyped/DefinitelyTyped | SUS (`too-new`) | Flagged — checkpoint |
| eslint-plugin-react-hooks | npm | 7y | 97,785,728 | github.com/facebook/react | OK | Approved |

**Packages removed due to [SLOP] verdict:** none.

**Packages flagged as suspicious [SUS]:** `vite`, `@vitejs/plugin-react`, `hono`, `@hono/node-server`, `@tanstack/react-query`, `shiki`, `mermaid`, `@base-ui/react`, `lucide-react`, `shadcn`, `@types/react`, `@types/react-dom`. The planner must place one consolidated `checkpoint:human-verify` before installation and show the exact seam evidence. [VERIFIED: package-legitimacy seam]

## Architecture Patterns

### System Architecture Diagram

```text
CLI project path
      │
      ▼
resolveTargetPath → LocalFsPlanningFilesystem → PlanningRepository.load()
                                              │
                                              ▼
                                   immutable ProjectSnapshot
                                              │
                  ┌───────────────────────────┴──────────────────────────┐
                  ▼                                                      ▼
       cycle-free ProjectPresentation                         Artifact lookup by path
       (IDs/keys, no object cycles)                           (snapshot only; no fs read)
                  │                                                      │
                  └───────────────────────────┬──────────────────────────┘
                                              ▼
                                      Hono JSON endpoints
                                              │
                                              ▼
                              React Query + canonical route codec
                  ┌───────────────────┬──────────────────────┬───────────┐
                  ▼                   ▼                      ▼           ▼
              Dashboard          Roadmap/history      Artifact page   Preview
                                                           │
                                                           ▼
                           artifact-view registry (known → generic fallback)
                                                           │
                              ┌────────────────────────────┴────────────┐
                              ▼                                         ▼
                    PLAN pseudo-XML segmenter                 normal markdown body
                              └────────────────────────────┬────────────┘
                                                           ▼
                  remark/GFM → raw HTML parse → sanitize → slug/linkify/Shiki
                                                           │
                                                           ▼
                                      sanitized document HTML
                                                           │
                                          ┌────────────────┴──────────────┐
                                          ▼                               ▼
                                  strict Mermaid.run()            anchors/ref popover
```

No arrow returns to the filesystem. The UI is observational and read-only. [VERIFIED: `.claude/CLAUDE.md:16-31`; `src/planning-repo/snapshot.ts:57-90`]

### Recommended Project Structure

```text
src/
├── server/
│   ├── index.ts                 # CLI start, Hono, Vite dev/prod delivery
│   ├── project-presentation.ts  # cycle-free DTO and pure selectors
│   └── artifact-index.ts        # snapshot-only artifact lookup
├── presentation/
│   ├── routes.ts                # canonical key/URL codec shared by server/client
│   ├── references.ts            # contextual requirement/phase/plan resolution
│   ├── dashboard.ts             # current/next/attention selectors
│   ├── roadmap.ts               # phase/wave/history view models
│   └── coverage.ts              # conservative truth↔coverage matrix
├── rendering/
│   ├── plan-segments.ts         # bounded pseudo-XML grammar
│   ├── markdown.ts              # one unified processor/highlighter lifecycle
│   ├── linkify.ts               # trusted post-sanitize AST enrichment
│   └── frontmatter-views.ts     # known fields + generic remainder
└── web/
    ├── main.tsx
    ├── app-router.tsx
    ├── pages/                   # dashboard, roadmap, artifact, plan-pair
    ├── components/              # shell, previews, document chrome
    ├── components/ui/           # generated base-sera primitives
    └── styles/globals.css       # ported oklch tokens + document containment
test/
├── presentation/               # DTO, routing, dashboard, coverage
├── rendering/                  # pseudo-XML, sanitizer, links, anchors
└── server/                      # deep-link fallback and API contracts
```

This preserves the existing one-way `planning-fs → planning-repo → domain` layering; `presentation`, `rendering`, and `web` may import the zero-I/O domain vocabulary but must not import `planning-fs` or handler internals. [VERIFIED: `src/domain/model.ts:1-5`; `src/planning-repo/snapshot.ts:5-11`]

### Pattern 1: Explicit Cycle-Free API DTO

**What:** Convert the in-memory graph into plain records keyed by canonical IDs. Serialize references as keys or `null`, never by recursively embedding resolved objects. Keep full bodies in an artifact endpoint/index derived from the same snapshot. [VERIFIED: `src/planning-repo/serialize.ts:28-45`]

The source-of-truth phase identity fields are quoted verbatim: `"milestoneVersion: string | null; number: string; projectCode: string | null; slug: string;"`. [VERIFIED: `src/domain/model.ts:88-93`]

**When to use:** Every server response. Do not return `Project` directly.

**Planner test:** `JSON.stringify(projectPresentation)` succeeds for the dense fixture, contains no `$circularRef`, and retains distinct active/archive Phase 1 route keys.

### Pattern 2: One Canonical Route Codec

**What:** Centralize `phaseKey`, `planKey`, `artifactToken`, builders, and parsers. Recommended public shapes are:

```text
/
/roadmap
/milestones/:milestoneKey
/milestones/:milestoneKey/phases/:phaseKey
/milestones/:milestoneKey/phases/:phaseKey/plans/:planId
/milestones/:milestoneKey/phases/:phaseKey/artifacts/:artifactToken
/artifacts/:artifactToken
```

These exact segment names are a research recommendation within D-13's delegated discretion. [ASSUMED]

Use milestone version as `milestoneKey`; encode a missing active version as `current`. Use a phase key derived from project code plus phase number, not display name, so a later rename does not invalidate bookmarks. The same codec must generate breadcrumbs, cross-links, preview Open links, heading URLs, API lookup keys, and Phase 3 search destinations. [ASSUMED]

**When to use:** Everywhere a URL or identity is created or decoded.

### Pattern 3: Pure Situational-Awareness Selectors

**What:** Build a single `DashboardViewModel` from snapshot facts before React rendering. The current repo exposes separate formal and observed signals. The observed values are quoted verbatim from their source assignments: `"researched"`, `"no_directory"`, `"complete"`, and `"in_progress"`. [VERIFIED: `src/planning-repo/assemble.ts:112-119`]

Recommended selector order:

1. Current position comes only from STATE frontmatter. The current file's keys are quoted verbatim: `"milestone"`, `"current_phase"`, `"current_phase_name"`, `"status"`, and `"progress"`. [VERIFIED: `.planning/STATE.md:2-16`]
2. Immediate next is the first incomplete plan in the current phase whose resolved sibling dependencies have summaries; if none exists, select the next incomplete phase in roadmap order. [ASSUMED]
3. Blocked items are incomplete plans with a dangling or incomplete `dependsOnRefs` entry, plus explicitly authored blocker prose from the STATE `Blockers/Concerns` section. [ASSUMED]
4. Human-verification attention comes from incomplete PLAN checkpoint tasks and summary coverage entries with `human_judgment: true`. The corpus includes the verbatim task marker `<task type="checkpoint:human-verify" gate="blocking-human">` and coverage field `human_judgment: true`. [VERIFIED: `.planning/phases/01-read-layer-domain-model/01-01-PLAN.md:188`; `.planning/phases/01-read-layer-domain-model/01-04-SUMMARY.md:113-118`]
5. Discrepancies compare `roadmapComplete` and `diskStatus` without coercing `null` into false. The source contract says `roadmapComplete: boolean | null` and `diskStatus: string`. [VERIFIED: `src/domain/model.ts:133-142`]

### Pattern 4: Bounded PLAN Grammar Before Markdown

**What:** Recognize a small allowlist of wrapper tags (`objective`, `task`, `decision`, and the existing companion sections) with a stack-based, linear scanner that ignores fenced code. Preserve inner source as Markdown, convert recognized wrappers to trusted semantic nodes, expose safe attributes such as `type`, `gate`, and `tdd` as text badges, and send every unknown tag through the ordinary sanitized-HTML path. [VERIFIED: `fixtures/dense/.planning/phases/01-identity-slice/01-01-PLAN.md:23-91`]

The handler intentionally preserves the body verbatim: `"body: fm.body"` and `"structured: {}"`. [VERIFIED: `src/planning-repo/handlers/plan.ts:17-26`]

**When to use:** Only for artifacts whose resolved kind is the verbatim handler value `kind: 'plan'`. Summary and generic handler values are `kind: 'summary'` and `kind: 'unknown'`. [VERIFIED: `src/planning-repo/handlers/plan.ts:10-12`; `src/planning-repo/handlers/summary.ts:11-13`; `src/planning-repo/handlers/generic.ts:12-14`]

**Failure behavior:** Unclosed or mismatched recognized wrappers become escaped literal text plus a local render warning; the document still renders. Never call an XML parser and never pass pseudo-XML directly to `rehype-raw`.

### Pattern 5: Sanitize Before Trusted Enrichment

**What:** Use one processor lifecycle:

```typescript
// Source: official remark-rehype safe HTML example and Shiki dual-theme guide.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, artifactSchema)
  .use(rehypeSlug)
  .use(rehypeResolvedReferences, referenceContext)
  .use(rehypeShikiWithSingleton, highlighter)
  .use(rehypeHeadingCopyControls)
  .use(rehypeStringify);
```

[CITED: https://github.com/remarkjs/remark-rehype#example-supporting-html-in-markdown-properly] [CITED: https://shiki.style/guide/dual-themes]

`rehypeResolvedReferences`, highlighting, and copy controls run after sanitization only because their nodes and URLs are generated from trusted application code and resolved DTO identities. Never interpolate artifact-provided attribute names, styles, URLs, or event handlers in those plugins.

### Pattern 6: Known Frontmatter Views With a Generic Remainder

**What:** A field-view registry consumes `Record<string, unknown>`, type-guards each known field, records handled keys, then renders every remaining entry recursively as safe text. An invalid known field falls back to generic display rather than disappearing or throwing. [VERIFIED: `src/domain/model.ts:8-27`]

For a plan pair, retrieve both full artifacts from `Phase.artifacts` by `Plan.path` and `Plan.summary.path`; the smaller `Plan`/`PlanSummary` nodes are pairing metadata, not document bodies. [VERIFIED: `src/planning-repo/assemble.ts:69-105`; `src/domain/model.ts:95-118`]

### Pattern 7: Conservative Truth-to-Coverage Matching

**What:** Coverage rows do not carry a stable pointer to a plan truth. The real corpus has truth strings and independent coverage objects with IDs such as `D1`; order and count can differ. [VERIFIED: `/home/cinedise/studio-portal/.planning/phases/04-bulk-archive-downloads/04-05-PLAN.md:24-41`; `/home/cinedise/studio-portal/.planning/phases/04-bulk-archive-downloads/04-05-SUMMARY.md:55-115`]

Use a conservative matcher: exact normalized text first; otherwise score shared requirement IDs plus normalized significant-token overlap; accept only one-to-one matches above an explicit tested threshold; show all unmatched truths and coverage entries. Label heuristic matches as inferred. Never silently pair by array index. [ASSUMED]

### Pattern 8: Ordered Flow, Not Invented Graph

**What:** Render one vertical execution spine through phases in existing order, with compact connectors/status markers. Display each phase's `dependsOnRaw` verbatim beside its connector. Within a phase, group disk plans by the open `frontmatter.wave` value and label blocked rows from `dependsOnRefs`. This meets the flow requirement without claiming that free-form dependency prose is a parsed graph. [VERIFIED: `src/domain/model.ts:127-142`; `src/planning-repo/crossref.ts:58-66`]

### Anti-Patterns to Avoid

- **`c.json(snapshot.project)`:** the graph contains real cycles and JSON serialization throws. Build the DTO. [VERIFIED: `src/planning-repo/serialize.ts:28-45`]
- **Route-local filesystem reads:** they create a second freshness/cache truth and violate Phase 1's seam. [VERIFIED: `src/planning-repo/snapshot.ts:57-90`]
- **Passing PLAN tags into raw HTML parsing:** Markdown inside pseudo-XML becomes opaque HTML or disappears. Segment recognized wrappers first. [VERIFIED: `src/planning-repo/handlers/plan.ts:1-25`]
- **Array-index coverage pairing:** real plan truths and summary coverage arrays need not align. [VERIFIED: `/home/cinedise/studio-portal/.planning/phases/04-bulk-archive-downloads/04-05-PLAN.md:15-26`; `/home/cinedise/studio-portal/.planning/phases/04-bulk-archive-downloads/04-05-SUMMARY.md:55-115`]
- **Phase number as a key:** archived and active milestones can both contain Phase 1. [VERIFIED: `src/domain/model.ts:82-93`]
- **Always-visible anchor icons:** D-16 requires hover/focus disclosure and no scroll-driven URL updates. [VERIFIED: `.planning/phases/02-situational-awareness-artifact-reading/02-CONTEXT.md:75-77`]
- **Linkifying raw strings before Markdown parsing:** this corrupts code fences, inline code, and authored links. Walk sanitized HAST text nodes and skip `a`, `code`, `pre`, and Mermaid nodes.
- **Mermaid `securityLevel: 'loose'`:** loose allows HTML labels and click behavior; keep strict for artifact input. [CITED: https://mermaid.js.org/config/usage.html]
- **`overflow-x: hidden` on the entire app as the only fix:** it masks which component is too wide. Apply `min-width: 0` through the shell and local `overflow-x: auto` wrappers around tables, pre, and diagrams.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Markdown/GFM parsing | Regex Markdown renderer | unified + remark packages | Tables, task lists, nesting, raw HTML boundaries, and AST positions are already handled. [CITED: https://github.com/remarkjs/remark-rehype] |
| HTML sanitization | Tag/attribute blacklist | `rehype-sanitize` immediately after `rehype-raw` | XSS requires context-sensitive sanitization; blacklists miss schemes and attributes. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html] |
| Syntax highlighting | Regex lexer or per-request highlighter | Shiki singleton with dual themes | Shiki emits theme-aware token output. [CITED: https://shiki.style/guide/dual-themes] |
| Diagram parsing | Mermaid regex/SVG generation | Mermaid `run()` in strict mode | Diagram grammar and rendering are complex; strict mode limits embedded behavior. [CITED: https://mermaid.js.org/config/usage.html] |
| Floating preview geometry/focus | Custom portal/positioning engine | Base UI Popover anchored to the clicked element | It supplies collision-aware anchoring and popup primitives. [CITED: https://base-ui.com/react/components/popover] |
| Component visual baseline | Recreate a parallel design system | shadcn base-sera source plus studio tokens | Sera is specifically typography-first with square corners and uppercase tracking. [CITED: https://ui.shadcn.com/docs/changelog/2026-04-sera] |
| Phase dependency graph | Parse arbitrary arrows/free prose | Ordered spine + raw dependency labels | Phase 1 explicitly preserved the text rather than fabricating edges. [VERIFIED: `src/planning-repo/crossref.ts:63-66`] |
| Project reads | API endpoint calling `node:fs` by path | `PlanningRepository` snapshot/artifact index | One load/refresh seam preserves consistency and future watching. [VERIFIED: `src/planning-repo/snapshot.ts:57-90`] |

**Key insight:** The only justified custom parsers are domain adapters: the bounded PLAN wrapper grammar, view-model decoders for open frontmatter, and contextual ID resolution. Markdown, HTML security, code grammars, diagrams, popup focus, and general routing should remain library-owned.

## Common Pitfalls

### Pitfall 1: Treating the Domain Graph as an API Shape

**What goes wrong:** Hono throws while serializing or emits huge recursively duplicated responses.

**Why it happens:** Eager resolved references are ideal in memory but intentionally cyclic. [VERIFIED: `src/planning-repo/serialize.ts:28-39`]

**How to avoid:** Create explicit DTOs and reference keys; add a dense-fixture JSON serialization test.

**Warning signs:** `$circularRef` appears in browser data, or an endpoint imports `normalizeForGolden`.

### Pitfall 2: PLAN Pseudo-XML Is Swallowed or Leaked

**What goes wrong:** `<objective>` content disappears as HTML, task Markdown does not format, or closing tags print as garbage.

**Why it happens:** Those wrappers are domain syntax around Markdown, not ordinary HTML.

**How to avoid:** Segment the known grammar before Markdown; test multiline, inline, nested task fields, attributes, fenced-code tag text, mismatches, and unknown tags against a real multi-task plan.

**Warning signs:** A toy plan passes while `.planning/phases/01-read-layer-domain-model/01-04-PLAN.md` fails.

### Pitfall 3: Sanitization Happens Too Late—or Is Undone Later

**What goes wrong:** Embedded scripts/events/unsafe URLs survive, or a post-sanitize plugin copies untrusted attributes into trusted nodes.

**Why it happens:** Raw HTML is expanded without a sanitizer, or trusted enrichment treats source attributes as configuration.

**How to avoid:** Keep the documented raw→sanitize order; allow only needed classes/tags; generate post-sanitize URLs exclusively through the route codec. [CITED: https://github.com/remarkjs/remark-rehype#example-supporting-html-in-markdown-properly]

**Warning signs:** `onclick`, `javascript:`, user-controlled `style`, iframes, or SVG event attributes appear in renderer snapshots.

### Pitfall 4: Coverage Matrix Claims More Than the Corpus Encodes

**What goes wrong:** A truth is marked covered because it happened to share an array index with an unrelated coverage item.

**Why it happens:** `must_haves.truths` has no stable IDs, while coverage has its own deliverable IDs.

**How to avoid:** Conservative one-to-one matching, inferred labels, unmatched rows, and pair tests from both the synthetic dense fixture and studio-portal.

**Warning signs:** Every row is always “matched,” or reordering YAML changes the result.

### Pitfall 5: Reference Resolution Loses Milestone Context

**What goes wrong:** “Phase 1” in an archived document previews the active Phase 1.

**Why it happens:** Resolution uses number alone rather than the source artifact's milestone context.

**How to avoid:** Resolve phase/plan prose relative to the containing artifact's milestone; root current docs resolve against the active milestone. Unresolved remains text.

**Warning signs:** `phase.number` or plan ID appears as a global `Map` key without milestone scope.

### Pitfall 6: Deep Links Work In-App but 404 on Refresh

**What goes wrong:** React navigation succeeds, but pasting a plan URL into a new tab returns a static-file 404.

**Why it happens:** Hono serves assets but has no final SPA fallback.

**How to avoid:** API routes first, static assets second, and a final non-API `index.html` response; integration-test a milestone-qualified plan URL.

### Pitfall 7: Dashboard Status Is Recomputed from Displayed Markdown

**What goes wrong:** Visual progress conflicts with STATE, or disk completion is collapsed into roadmap completion.

**Why it happens:** Components count checkboxes/files independently.

**How to avoid:** Pure selectors over the DTO; keep formal/observed provenance in each returned signal. [VERIFIED: `src/domain/model.ts:133-142`]

### Pitfall 8: Wide Content Breaks the Shell

**What goes wrong:** A table or Shiki/Mermaid block expands the page body horizontally, especially inside nested flex/grid containers.

**Why it happens:** An ancestor lacks `min-width: 0`, or content wrappers rely on body clipping.

**How to avoid:** Assert `html, body, #root { max-width: 100%; }`, set `min-w-0` at each content column, and wrap `table`, `pre`, and Mermaid output in local horizontal scrollers.

**Warning signs:** A 390px viewport can pan the whole page, or the header moves sideways while a table scrolls.

### Pitfall 9: Theme Flash and Highlight Drift

**What goes wrong:** Initial paint uses the wrong theme, or code blocks remain light after switching dark.

**Why it happens:** Theme is applied after React mounts, or Shiki output has one theme.

**How to avoid:** Apply the stored class in a compile-time constant inline head script before paint; emit Shiki dual-theme variables keyed by the same `.dark` root class. The reference implementation explicitly treats the DOM class as the source of truth. [VERIFIED: `/home/cinedise/studio-portal/frontend/lib/theme.ts:1-35`; `/home/cinedise/studio-portal/frontend/components/theme-toggle.tsx:8-32`] [CITED: https://shiki.style/guide/dual-themes]

## Code Examples

### Cycle-Free Reference Projection

```typescript
// Source: repository cycle analysis in src/planning-repo/serialize.ts:28-45.
type PhaseRefDto = {
  milestoneKey: string;
  phaseKey: string;
};

function toPhaseRef(phase: Phase): PhaseRefDto {
  return {
    milestoneKey: milestoneKeyOf(phase.identity.milestoneVersion),
    phaseKey: phaseKeyOf(phase.identity),
  };
}

// Resolved objects are projected to keys, never recursively embedded.
const requirementRefs = phase.requirementRefs.map((ref) => ({
  raw: ref.raw,
  targetId: ref.resolved?.id ?? null,
}));
```

The code uses the verbatim reference contract `raw: string; resolved: T | null;`. [VERIFIED: `src/domain/model.ts:36-39`]

### Safe Markdown Pipeline

```typescript
// Source: https://github.com/remarkjs/remark-rehype#example-supporting-html-in-markdown-properly
const html = await unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, artifactSchema)
  .use(rehypeSlug)
  .use(rehypeResolvedReferences, referenceContext)
  .use(rehypeShikiWithSingleton, highlighter)
  .use(rehypeHeadingCopyControls)
  .use(rehypeStringify)
  .process(markdown);
```

### Mermaid Mount Contract

```typescript
// Source: https://mermaid.js.org/config/usage.html
mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' });
await mermaid.run({ nodes: container.querySelectorAll('.mermaid') });
```

### Frontmatter Registry With Generic Remainder

```typescript
const handled = new Set<string>();

if (isMustHaves(frontmatter.must_haves)) {
  panels.push(renderMustHaves(frontmatter.must_haves));
  handled.add('must_haves');
}

for (const [key, value] of Object.entries(frontmatter)) {
  if (!handled.has(key)) panels.push(renderGenericField(key, value));
}
```

The exact known keys `must_haves`, `coverage`, `key_links`, and `progress` come from locked D-10; all maps remain open by Phase 1 contract. [VERIFIED: `.planning/phases/02-situational-awareness-artifact-reading/02-CONTEXT.md:54-56`; `src/domain/model.ts:12-26`]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `react-router-dom` as the primary DOM package | Unified `react-router` package, library/data mode | React Router v7+ | Import `createBrowserRouter`, route components, and hooks from `react-router`. [CITED: https://reactrouter.com/start/data/routing] |
| Tailwind PostCSS integration | First-party `@tailwindcss/vite` plugin | Tailwind v4 | Use CSS-first configuration and the Vite plugin. [CITED: https://tailwindcss.com/docs/installation/using-vite] |
| One Shiki theme or retokenize on toggle | Dual-theme CSS-variable output | Current Shiki docs | One rendered code block follows the root theme selector. [CITED: https://shiki.style/guide/dual-themes] |
| `mermaid.init` | `mermaid.run` | Mermaid v10 | Use manual `run()` for dynamically mounted artifact content. [CITED: https://mermaid.js.org/config/usage.html] |
| shadcn generic/new-york baseline | Sera/Base UI preset | April 2026 | Sera's editorial typography and square geometry match UI-01. [CITED: https://ui.shadcn.com/docs/changelog/2026-04-sera] |

**Deprecated/outdated:**

- `mermaid.init`: deprecated in favor of `mermaid.run`. [CITED: https://mermaid.js.org/config/usage.html]
- `react-router-dom` as a separate recommendation: use `react-router` directly for this stack. [CITED: https://reactrouter.com/start/data/routing]
- Raw ASCII dependency diagram as the user-facing roadmap: preserve it as source content, but the roadmap view uses the ordered vertical flow required by D-05.

## Verification Strategy

The repository already has Vitest `4.1.11` with 11 passing test files / 135 passing tests, plus green typecheck and lint on 2026-08-25. [VERIFIED: local commands `npm test`, `npm run typecheck`, `npm run lint`]

Plan verification by subsystem:

| Subsystem | Automated proof | Manual proof |
|-----------|-----------------|--------------|
| DTO/API | Dense snapshot projects to JSON without cycles; every artifact path resolves from snapshot; API never imports `node:fs` | Load real studio-portal and inspect counts/identity |
| Dashboard | Table-driven STATE variants; next/blocked/attention priority; formal-vs-disk discrepancy cases | “At a glance” hierarchy on healthy and discrepant states |
| Roadmap/history | Active + two archived milestones with duplicate Phase 1; wave grouping; dangling dependency labels | Expand/collapse and vertical-flow legibility |
| PLAN parser | Inline/multiline objective, nested task fields, decision, attributes, fenced pseudo-tags, malformed/unclosed tags | Real `.planning/phases/01-read-layer-domain-model/01-04-PLAN.md` |
| Markdown security | Script/event/javascript/data URL payloads removed; GFM/code/task list/blockquote snapshots; stable duplicate-heading IDs | Attempt links/copy controls and long-document reading |
| Pairing | Real plan/summary fixtures; exact/inferred/unmatched coverage cases; full bodies present | Review the studio-portal 04-05 pair for truthful matrix behavior |
| Cross-links/routes | Active/archive reference contexts; dangling text; code spans untouched; production deep-link fallback | Copy URL, reload, back/forward, keyboard-trigger preview/Open |
| Theme/overflow | Production build and source contract for token/class setup | Both themes at 390px and desktop; tables/code/Mermaid scroll locally |

Recommended task-level commands:

```bash
npm test -- --run test/presentation test/rendering test/server
npm run typecheck
npm run lint
npm run build
```

The final phase gate should additionally run the complete existing suite and a human UAT against both `fixtures/dense` and the read-only studio-portal corpus. The project explicitly disallows committed assertions that depend on studio-portal; use it only as a qualitative smoke target. [VERIFIED: `.planning/phases/01-read-layer-domain-model/01-CONTEXT.md:258-262`]

`workflow.nyquist_validation` is explicitly `false`, so the formal `## Validation Architecture` section is intentionally omitted. [VERIFIED: `.planning/config.json:20-25`]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The recommended literal route segments, `current` null-milestone token, project-code/phase-number key, and shared-codec consumers are acceptable within D-13's delegated route discretion. | Route codec | Costly bookmark migration if changed after Phase 3 |
| A2 | “Immediate next” means first dependency-ready incomplete plan, otherwise next incomplete phase. | Dashboard selectors | Landing page may disagree with the user's mental model |
| A3 | Blockers combine dependency state with authored STATE blocker prose; human waits combine incomplete checkpoint tasks with `coverage.human_judgment`. | Dashboard selectors | Needs-attention list may over/under-report |
| A4 | Conservative token/requirement similarity with an explicit threshold is acceptable for truth-to-coverage inference. | Coverage matching | False matches would misrepresent execution evidence |
| A5 | Oversized Markdown or Mermaid input should be capped and fail locally with a non-fatal warning. | Security Domain | A limit that is too low hides valid content; no limit risks UI denial of service |

## Open Questions

1. **What is the authoritative semantic rule for truth-to-coverage matching?**
   - What we know: no stable truth ID is present in the plan; coverage has independent `D1`, `D2`, … IDs, and count/order can differ. [VERIFIED: `/home/cinedise/studio-portal/.planning/phases/04-bulk-archive-downloads/04-05-PLAN.md:15-26`; `/home/cinedise/studio-portal/.planning/phases/04-bulk-archive-downloads/04-05-SUMMARY.md:55-115`]
   - What's unclear: acceptable similarity threshold and whether requirement overlap should outweigh prose overlap.
   - Recommendation: implement and test conservative inference with visible “inferred” and “unmatched” states; never claim complete coverage merely because both arrays are non-empty.

2. **Which authored sources count as a live blocker or pending human verification?**
   - What we know: dependencies, checkpoint task types, STATE blocker prose, and summary `human_judgment` all exist. [VERIFIED: `src/domain/model.ts:127-142`; `.planning/phases/01-read-layer-domain-model/01-01-PLAN.md:188-196`; `.planning/STATE.md:80-83`; `.planning/phases/01-read-layer-domain-model/01-04-SUMMARY.md:113-118`]
   - What's unclear: whether a completed plan's `human_judgment: true` remains pending after UAT/verification artifacts exist.
   - Recommendation: let verification/UAT completion suppress the corresponding coverage wait only when an explicit structured pass can be linked; otherwise keep it visible with source label.

3. **How will browser UAT be run in this environment?**
   - What we know: no `chromium`, `google-chrome`, or `firefox` command was detected in PATH.
   - What's unclear: whether a host graphical browser is available outside the shell environment.
   - Recommendation: planner adds an end-of-phase human browser checkpoint rather than adding a new E2E stack in this phase.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | server, Vite, tests | ✓ | 22.23.1 | — |
| npm | package install/scripts | ✓ | 10.9.8 | — |
| Git | project workflow | ✓ | detected | — |
| ripgrep | corpus checks | ✓ | detected | — |
| Existing Vitest suite | regression checks | ✓ | 4.1.11 | — |
| Vite/React/Hono/renderer packages | Phase 2 implementation | ✗ | not installed | Install after package checkpoint |
| Chromium/Chrome/Firefox CLI | automated visual smoke | ✗ | — | Human browser UAT |

**Missing dependencies with no fallback:** none for implementation after approved npm installation.

**Missing dependencies with fallback:** browser CLI—use the host browser for required visual/keyboard/contrast/overflow UAT.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local single-user app has no authentication surface in scope. [VERIFIED: `.planning/REQUIREMENTS.md:142-143`] |
| V3 Session Management | no | No accounts or sessions are in scope. [VERIFIED: `.planning/REQUIREMENTS.md:142-143`] |
| V4 Access Control | limited | Enforce the startup-selected project boundary in `PlanningFilesystem`; API artifact lookup accepts only keys already present in the loaded snapshot. [VERIFIED: `src/planning-fs/local-fs.ts:21-55,57-78`; `src/planning-repo/snapshot.ts:15-23`] |
| V5 Input Validation | yes | Treat artifact Markdown/HTML/Mermaid, route params, and lookup keys as untrusted; sanitize and resolve through allowlisted codecs. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html] |
| V6 Cryptography | no | No secrets, credentials, signing, or encrypted storage are introduced in this phase. [VERIFIED: `.planning/phases/02-situational-awareness-artifact-reading/02-CONTEXT.md:7-17`; `.planning/REQUIREMENTS.md:127-143`] |

### Known Threat Patterns for React/Hono/Markdown

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Stored XSS from artifact HTML | Tampering / Elevation | `rehype-raw` then `rehype-sanitize`; test scripts, events, dangerous URLs, SVG/MathML payloads. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html] |
| DOM XSS through `dangerouslySetInnerHTML` | Elevation | Only insert the finalized sanitized string; never concatenate source after sanitization. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html] |
| Mermaid active-content escape | Elevation | `securityLevel: 'strict'`, `startOnLoad: false`, run only selected placeholder nodes. [CITED: https://mermaid.js.org/config/usage.html] |
| Artifact lookup path traversal | Tampering / Information Disclosure | Decode canonical route key, then map to the pre-indexed snapshot artifact; never pass request text to filesystem APIs. [VERIFIED: `src/planning-repo/snapshot.ts:57-90`] |
| Malicious href/src scheme | Elevation / Spoofing | Sanitizer schema plus route codec; allow only application routes and explicitly safe external schemes. [CITED: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html] |
| Regex denial of service | Denial of Service | Reuse the bounded ID patterns/linear scan; PLAN tag scanner must be linear with bounded attributes. Existing mention patterns explicitly avoid nested unbounded groups. [VERIFIED: `src/planning-repo/mentions.ts:21-53`] |
| Oversized documents/diagrams | Denial of Service | Keep rendering failure local to the artifact, cap Mermaid source/text size, and surface a non-fatal render warning. [ASSUMED] |

## Sources

### Primary (HIGH confidence)

- `src/domain/model.ts`, `src/planning-repo/{snapshot,assemble,serialize,crossref,mentions}.ts`, and handlers — current repository contracts and discrete values.
- `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, Phase 1 plans/summaries, and dense fixtures — current project/corpus behavior.
- `/home/cinedise/studio-portal/frontend/{package.json,components.json,app/globals.css,components/theme-toggle.tsx,lib/theme.ts}` — required visual reference.
- `/home/cinedise/studio-portal/.planning/phases/04-bulk-archive-downloads/04-05-{PLAN,SUMMARY}.md` — real mismatch-sensitive plan/coverage pair.
- Live npm registry and package-legitimacy seam checks on 2026-08-25 — versions, publish signals, downloads, repositories, postinstall fields, and verdicts.

### Secondary (MEDIUM confidence)

- https://vite.dev/guide/backend-integration.html — backend/Vite integration.
- https://vite.dev/plugins/ — official React plugin identity and purpose.
- https://react.dev/learn/add-react-to-an-existing-project and https://react.dev/learn/typescript — official React/React DOM and TypeScript package setup.
- https://hono.dev/docs/getting-started/nodejs — Node adapter and static serving.
- https://reactrouter.com/start/data/routing — library/data route configuration.
- https://github.com/remarkjs/remark-rehype#example-supporting-html-in-markdown-properly — safe raw HTML order.
- https://shiki.style/guide/dual-themes — dual-theme highlighting.
- https://mermaid.js.org/config/usage.html — strict security and `run()`.
- https://tailwindcss.com/docs/installation/using-vite and https://tailwindcss.com/docs/dark-mode — Vite and manual theme setup.
- https://ui.shadcn.com/docs/installation/vite and https://ui.shadcn.com/docs/changelog/2026-04-sera — Vite/base-sera setup.
- https://base-ui.com/react/components/popover — anchored preview primitive.
- OWASP XSS/Input Validation cheat sheets and ASVS project page — rendering security controls.

### Tertiary (LOW confidence)

- Assumptions A1–A5 above; each needs planner/user confirmation or an explicit implementation test.

## Metadata

**Confidence breakdown:**

- Standard stack: MEDIUM — official docs and registry versions are current, but 12 packages are protocol-flagged `SUS` solely for recent releases and require human approval.
- Architecture: HIGH — derived directly from the implemented Phase 1 graph, serializers, handlers, fixtures, and locked Phase 2 decisions.
- Pitfalls: HIGH — core failures are reproduced by current contracts/corpus shapes; external security ordering is confirmed by official docs.
- Dashboard semantics: MEDIUM — source fields are verified, while prioritization/suppression rules remain assumptions A2/A3.
- Coverage matching: MEDIUM-LOW — source mismatch is verified; the proposed inference rule needs corpus tests and explicit acceptance.

**Research date:** 2026-08-25
**Valid until:** 2026-09-01 for package versions; architecture remains valid until Phase 1 domain contracts change.
