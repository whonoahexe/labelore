# Phase 8: Several Projects and a Switcher - Context

**Gathered:** 2026-10-27
**Status:** Ready for planning

<domain>
## Phase Boundary

One Labelore run holds several projects and moves between them without mixing their data. Projects
arrive from several CLI paths, from a folder scan the user asks for, from the remembered list, and
from a local path or `ssh://` target added at runtime. They are remembered in Labelore's own
settings file, which can never be written inside a target project. Every endpoint that accepts a
path, an `ssh://` target or a settings change refuses requests from other websites.

Requirements: PLAT-02, PLAT-05, PLAT-06, PLAT-07, PLAT-08, SEC-05.

Not in this phase: switching project from the Cmd-K palette (Phase 13), cross-project search,
project cards with status on the landing page, the `config.json` settings page (Phase 12), and any
write to a target's `.planning/`.

</domain>

<decisions>
## Implementation Decisions

### Switcher and landing page
- **D-01:** `/` is a **projects landing page**, even when only one project is loaded. It lists every
  project and holds the scan and add controls. A project URL (`/<slug>/…`) goes straight to that
  project. `/` never redirects to a project on its own. — **Reversibility:** reversible — a redirect
  rule could be added later without touching project URLs.
- **D-02:** Each project row, in the header switcher and on the landing page, shows **display name,
  a quiet path or `ssh://` target, and a load-state mark** (loading, or unavailable with its reason).
  Listing a project never loads it: the rows come from `GET /api/projects`'s cheap list. There is no
  milestone, phase or progress per row.
- **D-03:** The landing page uses the **same rows as the switcher**, full width, plus last-opened time
  and the scan and add controls. No project cards with status (deferred).
- **D-04:** Both lists are ordered **last opened first**. Unavailable projects keep their place in
  that order and are marked, not moved or hidden.
- **D-05:** The switcher sits in the header brand area (where `projectDisplayName` and `rootPath`
  show today). It is sketched first, built from the winning sketch and screenshot-checked against it
  (success criterion 1). The landing page goes through the same sketch loop.

### What switching does
- **D-06:** Switching project **always lands on the target project's dashboard**. There is no
  equivalent-page matching and no last-page memory.
- **D-07:** While the target is loading, the **header switches to the new project at once and the
  body shows a loading state**. Nothing from the previous project is ever shown (PLAT-08). A load
  failure shows the existing invalid-target screen (`invalid-project-screen.tsx`) with the reason
  and the path checked.
- **D-08:** **Tabs are fully independent.** Each tab follows its own URL slug, and the server holds no
  "active project" state. Opening a project only updates that entry's `lastOpened` (and
  `lastActive`) in settings.

### Remembered list lifecycle
- **D-09:** **Every project opened is remembered**: CLI paths, projects added from the switcher or
  landing page, and scan results the user picked. Test runs never touch the real settings file
  (`LABELORE_CONFIG_DIR` set in the vitest and Playwright setup).
- **D-10:** Each row (switcher and landing page) has a quiet **remove** action. It only edits
  Labelore's settings file and never touches the project. An unavailable project stays listed with
  its reason until the user removes it, and is never dropped silently. — **Reversibility:**
  reversible — it is a settings edit, and re-adding the path restores the entry (with the same slug
  only if the slug is still free).
- **D-11:** Slug collisions take a **numeric suffix** (`portal`, `portal-2`). The slug is assigned once
  from the kebab-cased basename (Phase 7's rule and reserved words), **persisted** with the entry, and
  never reassigned, so bookmarks keep working across runs. Identity for de-duplication is the
  canonical path (realpath) or the normalised ssh target, not the typed string. —
  **Reversibility:** costly — persisted slugs live in users' bookmarks and the settings file, so
  changing the scheme later breaks existing links.
- **D-12:** **No rename in the UI.** A user who wants another slug edits `settings.json` by hand.
  Labelore validates each entry on read (reserved words, uniqueness, format) and reports a bad entry
  rather than throwing.

### Scanning and adding
- **D-13:** The **full scan and add form lives on the landing page**. The header switcher holds the
  list plus an "Add or scan…" entry, which opens a small add dialog (local path or `ssh://` target)
  and links to the landing page for scanning.
- **D-14:** A scan shows its results as a **checklist**: each found project with its path and a
  checkbox. Projects already in the list are marked and disabled. "Add N" remembers the picked ones
  **without loading them**.
- **D-15:** Scans are restricted to folders **inside `$HOME`**, depth 2 (`~/Work/<group>/<project>`),
  skipping dot-directories, `node_modules` and symlinks, with a capped number of results. A folder
  outside `$HOME` is refused with a named reason. A codebase-only `.planning/` counts as a project.
- **D-16:** **Scanning is UI-only.** The CLI takes several positional paths but has no `--scan` flag,
  and nothing is scanned at startup.
- **D-17:** A path or ssh target added at runtime goes through the existing `resolveTargetPath` /
  `parseRemoteTarget` exactly once, with no second parser. A bad add shows a named error that reuses
  the invalid-target wording and the exact path checked.

### Security (SEC-05, as the research specifies; restated so the plan carries it)
- **D-18:** A Host-header allowlist (`127.0.0.1`/`localhost` with the server's port) runs on `/api/*`.
  Every endpoint that accepts a path, an ssh target, a scan folder or a settings change (add, remove,
  scan, refresh) requires same-origin (`Origin` or `sec-fetch-site`, with an absent header refused,
  unlike today's `/api/refresh` gate) and a JSON content type. A test proves a foreign Origin or Host
  is refused on each one.
- **D-19:** `settings.json` lives at `$XDG_CONFIG_HOME/labelore/settings.json` (fallback
  `~/.config/labelore/`). It is written atomically (temp file plus rename), is versioned, and is
  re-read before each change. It is written by a second, explicitly allow-listed `node:fs` importer
  whose path is fixed at construction. A test proves it can never resolve inside a target root.
  `local-fs.ts` stays read-only.

### Claude's Discretion
- **Memory policy for loaded projects:** keep every loaded runtime for the run, or an LRU of the few
  most recent (disposing their indexes and ssh mirrors). The research is split (ARCHITECTURE says
  keep all, PITFALLS 17 says LRU of 2–3). Either way, a test asserts heap stays bounded across
  repeated switches.
- The scan result cap, the exact wording of the unavailable reasons, and how the loading body looks,
  all within `docs/design-language.md`.
- What a corrupt `settings.json` does at startup (research: keep it as `.bak`, start empty, say so,
  never throw).
- The unknown-slug screen: it names the slug and lists known projects with the switcher (research
  table stake). The planner shapes it.
- Hono sub-app dispatch under `/api/projects/:slug/*` (path-parameter mount or a rewritten request),
  decided by a spike.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Multi-project design (primary)
- `.planning/research/ARCHITECTURE.md` §"Feature 5: Multi-project": slug rule, `RegistryEntry`,
  startup source merge order, folder scan, lazy loading, `POST /api/projects`, the settings store and
  the two-importer gate, the `ProjectRuntime`/`project-api.ts` extraction, keeping `createApp(source)`,
  `createRegistryApp`, per-project refresh, moving `/sketches/*` under the project API, and the client
  query-key factory and `nav.tsx` helpers. Note: D-01 overrides "with lastActive set and a CLI path
  given it redirects", and D-16 drops `--scan`.
- `.planning/research/ARCHITECTURE.md` §"Pattern 3" and §"Pattern 4": per-project runtime behind a
  keyed registry, and project-relative DTO URLs with the slug applied at the edge.
- `.planning/research/PITFALLS.md` pitfalls 16–21: singleton server state, memory growth, stale query
  cache and in-flight responses, slug identity and collisions, the first write path, and
  runtime-supplied paths/ssh targets (Host allowlist, same-origin, restricted scan roots).
- `.planning/research/SUMMARY.md` item 4 under "Implications for roadmap": the in-phase build order
  (guards before any write endpoint) and the research flags (Hono spike, scan timing, ssh mirror
  cleanup).
- `.planning/research/FEATURES.md` §"B.5 Clean URLs and multi-project switching": switcher behaviours,
  the unknown-slug page, and anti-features (no global active project, no merged view, no startup
  auto-scan, no symlink following).

### Requirements and roadmap
- `.planning/REQUIREMENTS.md`: PLAT-02, PLAT-05, PLAT-06, PLAT-07, PLAT-08, SEC-05.
- `.planning/ROADMAP.md` §"Phase 8": the five success criteria, including the sketch, build and
  screenshot loop for the switcher.

### Prior phase
- `.planning/phases/07-recognised-files-and-readable-urls/07-CONTEXT.md`: the project slug as the
  first URL segment and the shared reserved-word constant. Phase 8 persists that slug.

### Conventions
- `docs/design-language.md` and `test/web/class-vocabulary.test.ts`: the switcher, landing page,
  add dialog and scan checklist must use the allowed vocabulary.
- `test/portability.test.ts`: the `node:fs` importer gate that changes from one file to exactly two.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/web/pages/invalid-project-screen.tsx`: the named-path failure screen, reused for failed loads
  (D-07) and its wording for failed adds (D-17).
- `src/cli/target-path.ts` (`resolveTargetPath`) and `src/cli/remote-target.ts` (`parseRemoteTarget`):
  the only validators for runtime adds.
- `src/server/remote-source.ts`: the ssh mirror. The registry owns disposal of every mirror.
- `src/presentation/project-slug.ts` and `src/presentation/reserved.ts` (Phase 7): the slug derivation
  and reserved words that persisted slugs build on.
- `src/web/components/app-shell.tsx`: the brand area showing `projectDisplayName`/`rootPath`, where
  the switcher goes.

### Established Patterns
- `src/server/index.ts` `parseCli` takes one positional path today (the last wins). It becomes a
  list, with `--port`/`--smoke` kept and no `--scan`.
- The `sec-fetch-site` check on `POST /api/refresh` in `src/server/index.ts` passes an absent header.
  D-18 tightens it into a shared guard.
- The D-05 single-derived-bundle-per-request rule carries over per `ProjectRuntime`.
- `src/web/nav.tsx` is the one place the slug is applied, and `src/web/project-path.ts` holds the
  slug helpers.

### Integration Points
- `src/web/app-router.tsx`: `/` becomes the landing page, and `/:project/*` resolves the slug against
  the registry, showing an unknown-slug screen for a slug it doesn't know.
- TanStack Query keys gain the slug as their first element through one factory. Refresh invalidates
  one project only.
- `src/server/sketch-files.ts` and `sketches-page.tsx` iframe URLs move under the project API, keeping
  the sandbox CSP.

</code_context>

<specifics>
## Specific Ideas

- Two checkouts with the same folder name (for example two `portal`s) exist in practice. The second
  becomes `portal-2` and keeps that name for good.
- `~/Work/<group>/<project>` is the nesting the scan depth is chosen for.
- Removing a project is only ever "forget it here", and the wording should make that clear.

</specifics>

<deferred>
## Deferred Ideas

- **Project cards with milestone, phase and progress on the landing page**: considered and declined
  for now (D-03). They need every project loaded or peeked at. A candidate after v2.1.
- **Equivalent-page switching or last-page memory per project**: declined (D-06). Revisit if
  always-dashboard proves annoying.
- **Renaming a slug from the UI**, with a redirect from the old slug: declined (D-12).
- **A `--scan <dir>` startup flag**: declined (D-16).
- Switching project from the Cmd-K palette belongs to Phase 13. Cross-project search and pinned
  favourites are out of this milestone.

</deferred>

---

*Phase: 08-several-projects-and-a-switcher*
*Context gathered: 2026-10-27*
