<!-- GSD:project-start source:PROJECT.md -->

## Project

**GSD Lore**

GSD Lore is a read-only web dashboard that makes a GSD `.planning/` directory legible. It lives in its
own repository, is started with a path argument pointing at any GSD-managed project, and renders that
project's planning state: where the work stands, what every phase and plan contains, and where the
accumulated decisions, learnings, and review findings are buried. It is a personal tool, built to
replace opening `.planning/` files by hand in an editor.

**Core Value:** Open the dashboard on a GSD project and immediately know where the work stands and where any planning
artifact lives — without reading a single file by hand.

### Constraints

- **Deployment**: Clone-and-run from its own repo at `~/gsd-lore`, targeted with a path argument at
  startup — Not a per-project install, not a published CLI, not a hosted service. Keeps v1 setup trivial.

- **Access**: Read-only filesystem access to the target `.planning/` — The tool must be incapable of
  damaging planning state it does not own.

- **Compatibility**: Must read `.planning/` as produced by `@opengsd/gsd-core` (1.11.0 at time of
  writing) — GSD's artifact set evolves, so unknown files must degrade rather than break.

- **Design**: Visual language inherited from studio-portal — oklch token palette, shadcn `base-sera`,
  `@base-ui/react`, lucide, squared corners, light and dark. Familiarity, and the theme comes for free.

- **Dependencies**: No runtime, code, or data dependency on studio-portal — It is a reference and a
  theme source only.

- **Tech stack**: Undecided, pending research — The user explicitly deferred this. Research must compare
  options (inheriting the Next.js stack versus a lighter Vite/Node runner) against a local read-only
  tool's needs.

- **Forward compatibility**: The `.planning/` reader must sit behind a boundary that admits multi-project
  targeting, a file watcher, and eventually write-back — None of those ship in v1, but all three are
  named future directions and a reader baked into the UI would block all of them.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## The Decision, Stated Once

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vite | 8.2.2 | Dev server + client bundler | Near-instant cold start/HMR; official "Backend Integration" middleware-mode pattern is stable and exactly fits a thin custom Node server. |
| React | 19.2.8 | UI library | Matches the theme source (studio-portal); no reason to diverge. |
| Hono | 4.13.3 (+ `@hono/node-server` 2.1.1) | Node API/static server, hosts Vite in dev, serves `dist/` in prod, owns the CLI entrypoint | Tiny footprint, native `streamSSE` helper for the v2 watcher transport, first-class Node adapter, far less ceremony than Express or Fastify for ~6 routes. |
| TypeScript | 7.0.2 | Language/type-checking | Now `latest` on npm — this is the Go-ported native compiler ("tsgo"), already the default tag as of this research. 10x+ faster checking matters for solo dev-loop speed. For a codebase this size (no advanced type-level metaprogramming), maturity risk is low. Verify `tsc`/editor integration on first setup; fall back to `typescript@^5` (still fully supported) if anything in your specific patterns doesn't yet work under TS7. |
| react-router | 8.3.0 | Client-side routing (library mode, `createBrowserRouter`) | Deep-linkable, back-button-correct URLs for phases/plans/search — needed because cross-references must become "clickable in-app routes," and refresh-on-a-deep-link must still work. Use the `react-router` package directly, **not** `react-router-dom` — as of v7+ the two were merged and `react-router` is the current unified package; `react-router-dom` is the legacy re-export. |
| @tanstack/react-query | 5.101.4 | Server-state cache for the client | Gives you loading/error states for the search and file-read endpoints for free, and — the actual reason to add it now — a single `queryClient.invalidateQueries()` call is the entire client-side reaction to a v2 SSE "file changed" event. Build the fetch layer through this from v1 so the watcher has nothing to restructure. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `gray-matter` | 4.0.3 | YAML frontmatter extraction | Always wrap the call in try/catch (see Version Compatibility) — it throws on malformed YAML by default; never call unguarded. |
| `unified` | 11.0.5 | Markdown→HTML pipeline core | The processor that chains the plugins below. |
| `remark-parse` | 11.0.0 | Markdown → mdast | Standard first step of the unified pipeline. |
| `remark-gfm` | 4.0.1 | GFM: tables, task-list checkboxes, strikethrough, autolinks | Single plugin covers 3 of the 4 rendering requirements (tables, task lists, plus autolinking of bare URLs). |
| `remark-rehype` | 11.1.2 (`{ allowDangerousHtml: true }`) | mdast → hast | Bridges markdown AST to HTML AST. |
| `rehype-raw` | 7.0.0 | Expand raw HTML embedded in markdown (`<details>`, `<img>`, etc.) into real hast nodes | GSD docs occasionally use raw HTML blocks; without this they render as literal escaped text. |
| `rehype-sanitize` | 6.0.0 | Strip `<script>`, `on*` handlers, `javascript:` hrefs | Run this **immediately after** `rehype-raw` and **before** heading-anchor/link-rewrite/highlight plugins — see Version Compatibility for why order matters. |
| `rehype-slug` | 6.0.0 | Adds `id` attributes to headings | Satisfies the "heading anchors" requirement — headings become addressable via `#slug`. |
| `rehype-autolink-headings` | 7.1.0 | Adds a clickable anchor icon next to each heading | Optional polish, not required by spec; cheap to add alongside `rehype-slug`. |
| `rehype-stringify` | 10.0.1 | hast → HTML string | Final step; render server-side once per file, cache the string. |
| `shiki` | 4.4.3 | Syntax highlighting | Current de-facto standard (same engine Next.js's own docs, Shadcn docs, and VitePress use) over Prism/highlight.js — VS Code-quality grammars, dual light/dark theme output via CSS variables. Create the highlighter **once** at server startup (`createHighlighter()`, async) and call its **synchronous** `codeToHtml()` per code block inside a small custom rehype plugin — do not use `rehype-pretty-code` as an added dependency for this; it wraps the same call for a use case (line-highlight annotations) you don't need. |
| `mermaid` | 11.17.0 | Diagram rendering | GSD artifacts contain mermaid fences. Do **not** try to render mermaid server-side (it needs a real DOM). Have the custom highlight plugin skip ` ```mermaid ` blocks, emit `<pre class="mermaid" data-mermaid-source="...">` placeholders instead, and call `mermaid.run()` client-side in a `useEffect` after the HTML is mounted (this is the standard pattern used by VitePress/Docusaurus-style tools). ASCII-art diagrams need no special handling — they're plain fenced code blocks with no `lang`, shiki renders them as monospace text as-is. |
| `minisearch` | 7.2.0 | Full-text search index | See Full-Text Search section — this is the standout choice for this corpus size and the v2 watcher's incremental-update needs. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `@vitejs/plugin-react` | 6.1.0 | React Fast Refresh in Vite | Use the Babel-based plugin, not `-swc`, unless build time becomes a measured problem — this codebase is small. |
| `@tailwindcss/vite` | 4.3.3 | Tailwind v4 integration for Vite | Direct equivalent of `@tailwindcss/postcss` used by studio-portal; same `@theme`/`@import "tailwindcss"` CSS-first config carries over unchanged. |
| `vitest` | 4.1.11 | Unit tests | Native Vite integration (shares config/transform pipeline), fast. Cover: frontmatter fallback parsing, the link-rewrite rehype plugin, the search index seam (`add`/`remove`/`update`), and a snapshot test of the full markdown pipeline against a fixture file. Skip Playwright/e2e for v1 — genuine ceremony for a solo local tool; revisit only if regressions in "does it boot and render a known fixture project" start recurring. |
| ESLint | 10.8.1 (+ `typescript-eslint` 8.67.0, `@eslint/js` 10.0.1, `eslint-plugin-react-hooks` 7.1.1, `globals` 17.11.0) | Linting | Flat config only (ESLint 10 finished dropping `.eslintrc` support) — fine, this is greenfield. Keep the ruleset small: `@eslint/js` recommended + `typescript-eslint` recommended + `react-hooks` recommended is enough rigor without enterprise ceremony. |
| Prettier | 3.9.6 | Formatting | Optional but cheap; skip a separate lint-staged/husky pre-commit pipeline unless you find yourself actually forgetting to format — one more thing to maintain solo. |
| `commander` | — (deliberately not used) | — | See "What NOT to Use." |

## Installation

# Core

# Markdown/search pipeline

# Theme

# Dev dependencies

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|--------------------------|
| Vite + React SPA + Hono | Next.js 16 App Router | If GSD Lore ever grows a networked/multi-user mode, needs SEO, or you specifically want RSC's fs-read-with-no-API-layer for a much larger artifact tree where the API surface really would dominate the codebase. Not this project's v1. |
| Hono | Express 5.2.1 | If you want the single most battle-tested, tutorial-everywhere Node server — functionally equivalent here, just more ceremony (middleware chaining conventions, no built-in SSE helper) for ~6 routes. |
| Hono | Fastify 5.12.1 | If you want built-in JSON-schema request/response validation — not a real need for a read-only local API with a handful of routes. |
| MiniSearch | FlexSearch 0.8.212 | If corpus grows into the tens of thousands of documents and raw index-build/query speed becomes the bottleneck. At "a few hundred markdown files," both are instant; MiniSearch's incremental `add`/`remove`/`discard` API and cleaner TS-native docs win on maintainability. |
| MiniSearch | SQLite FTS5 (`better-sqlite3` 13.0.3) | If the corpus needs to persist across restarts, exceed memory-comfortable size, or you want SQL-queryable structured search. `better-sqlite3` is a native module requiring prebuilt binaries per platform/Node ABI — a real setup-simplicity tax for a "clone and run" tool, unjustified at this scale. |
| MiniSearch | Ripgrep shelled out (`@vscode/ripgrep`) | If you want zero index-build cost and are fine with grep-quality results (no relevance ranking, no field boosting, weaker snippet UX). Full-text search is a named v1 UX requirement here (grouped by phase/type), not just "can I find a string" — an index beats shelling out. |
| MiniSearch | Lunr 2.3.9 | Avoid for this project: Lunr's index is effectively immutable once built — no real incremental update story, which fights directly against the v2 watcher requirement. |
| MiniSearch | Fuse.js 7.5.0 | Good for fuzzy-matching short strings (e.g., a command palette jumping to filenames), weak for TF-IDF-style ranking across full document bodies. Consider pairing it later for a lightweight "jump to file by name" affordance, not as the full-text search engine. |
| `gray-matter` (guarded) | `yaml` 2.9.0 directly | If you want more control over lenient/partial parsing recovery than gray-matter's engine hook gives you. Not necessary here — the try/catch fallback (full content as body, empty frontmatter) fully satisfies "must tolerate malformed frontmatter without throwing." |
| `react-router` (library mode) | TanStack Router | Equally valid, more type-safe route params out of the box. `react-router` was chosen for being the more familiar, lower-ceremony default and because this app's route shape (a handful of static + `:slug` params) doesn't need TanStack Router's heavier type-generation machinery. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|--------------|
| Next.js custom server (`next()` wrapping raw `http.Server`) | Next's own docs now explicitly discourage it ("should only be used when the integrated router... can't meet your app requirements"); Vercel dropped the App Router example for it. Fighting the framework's grain for a need (CLI path argument) that a plain Node server handles natively. | Vite + Hono, per the resolved decision above. |
| `rehype-pretty-code` | Adds a dependency to wrap the same `shiki.codeToHtml()` call you can invoke directly in a ~20-line custom rehype plugin; its main value-add (line-highlight/diff annotations) is not a stated requirement here. | Direct `shiki` usage inside a small custom rehype plugin. |
| `better-sqlite3` / SQLite FTS5 for v1 search | Native binary dependency, per-platform/Node-ABI prebuild fragility, for a corpus (a few hundred files) that fits trivially in an in-memory index rebuilt in well under a second at startup. Real cost against "clone-and-run" simplicity for zero benefit at this scale. | MiniSearch, in-memory, rebuilt on server start. |
| Calling `matter()` (gray-matter) unguarded | Throws on malformed/partial YAML by default — directly violates the stated requirement to tolerate bad frontmatter. | Always wrap in try/catch; on failure, treat the whole file as body with `{}` frontmatter. |
| `rehype-sanitize` placed *after* the shiki-highlight plugin in the pipeline | Its default schema strips the `style`/`class` attributes shiki injects for syntax coloring — you'd silently lose all highlighting. | Sanitize immediately after `rehype-raw`, before slug/link-rewrite/highlight plugins run (see Version Compatibility). |
| `react-router-dom` | Legacy package name; as of v7+ it's a re-export of `react-router`, which now ships the DOM bindings directly. Installing both invites version-drift bugs. | `react-router` directly. |
| `commander` (or any CLI-arg-parsing library) for this project | The CLI surface is one positional path argument and maybe an optional `--port` flag — `process.argv` slicing is a handful of lines. Adding a parsing library here is exactly the "enterprise ceremony" this tool should avoid. | Manual `process.argv` parsing in the CLI entrypoint. |
| `zustand` / other global client-state libraries, by default | No UI state in this app (sidebar collapse, theme toggle, active route) is complex enough to outgrow React's built-in `useState`/`useContext`. Add only if state genuinely sprawls. | React built-ins first; reach for a state library only when you feel the pain. |

## Stack Patterns by Variant

- Add `chokidar` (5.0.0, requires Node ≥20.19 — satisfied by the local Node 22.23.1) watching the target
- Wire chokidar's `add`/`change`/`unlink` events into the `SearchIndex` seam's `add`/`update`/`remove`
- Transport to the browser: Server-Sent Events via Hono's `streamSSE` helper, not WebSocket. This is a
- **Build now, so v2 has nothing to restructure:** put every filesystem read behind a small repository
- Re-evaluate MiniSearch's in-memory rebuild-on-startup cost; if it becomes noticeably slow, that's the

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|------------------|-------|
| `rehype-sanitize` (6.0.0) | Must run **before** the custom shiki-highlight rehype plugin, and before any custom link-rewrite plugin that injects trusted markup | Sanitize defangs attacker-influenced content early; plugin-injected nodes added afterward (highlighted code spans, rewritten hrefs) are trusted and should not be re-stripped. Getting this order backwards is the single most likely correctness bug in the markdown pipeline — confirmed against `react-markdown`'s own documented guidance for combining `rehype-raw` + `rehype-sanitize`. |
| `shiki` (4.4.3) `createHighlighter()` | Async at creation (call once at server startup, before the Hono server starts accepting requests), synchronous at `codeToHtml()` call time | Do not call `createHighlighter()` per-request — cache the singleton. This is what makes shiki usable inside a synchronous unified `.processSync()` pipeline. |
| `react-router` (8.3.0) | Do not also install `react-router-dom` | v7+ merged the packages; `react-router` is current and includes the DOM bindings. |
| `@base-ui/react` (1.7.0) | `components.json` → `"rsc": false` when running `shadcn add` against this project | The studio-portal reference sets `"rsc": true` because it's Next.js App Router. `@base-ui/react` itself has no RSC dependency — it's a headless, client-side primitives library (the Radix-lineage successor), portable to any React setup. Flip only that one config flag; component source, tokens, and Tailwind config carry over unchanged. |
| Tailwind v4 (`4.3.3`) | `@tailwindcss/vite` (Vite) is the direct equivalent of `@tailwindcss/postcss` (Next) | Same CSS-first `@theme`/`@import "tailwindcss"` config model in both; the oklch token block and `@theme inline` mapping in studio-portal's `globals.css` can be copied into the Vite project's CSS entrypoint verbatim. |
| TypeScript (`7.0.2`) | Node ≥22 assumed | Confirmed as the `latest` npm dist-tag at research time (native Go-ported compiler, formerly "tsgo"). If any tooling in your chosen stack hasn't caught up (check `eslint`/`typescript-eslint`/editor integration on first setup), pin to `typescript@^5` as a safe fallback — semantically compatible, just the older JS-hosted compiler. |
| `better-sqlite3` (`13.0.3`, not recommended for v1) | Requires Node ≥22 | Noted only because it's the natural "scale up" path if the corpus-size assumption changes; matches the local runtime today, but its prebuilt-binary distribution is exactly the "clone-and-run setup simplicity" cost this stack avoids for now. |

## Sources

- Live `npm view <pkg> version` / `dist-tags` queries against the npm registry (2026-08-21) — every
- `/home/cinedise/studio-portal/frontend/package.json`, `components.json`, `app/globals.css` — theme
- Official Vite docs, "Backend Integration" guide (`vite.dev/guide/backend-integration`) — confirmed the
- Official Next.js docs, "Guides: Custom Server" (`nextjs.org/docs/app/guides/custom-server`) — confirmed
- shadcn/ui official Vite installation docs (`ui.shadcn.com/docs/installation/vite`) and Tailwind v4 docs
- `react-markdown` project's own documented guidance on combining `rehype-raw` + `rehype-sanitize` for
- MiniSearch, FlexSearch, Lunr, Fuse.js — feature/incremental-update comparison based on each library's
- Confidence on `@base-ui/react`'s framework-agnosticism is architectural (it is a headless client-side

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
