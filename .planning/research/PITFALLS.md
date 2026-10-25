# Pitfalls Research

**Domain:** Adding v2.1 "Wayfinding" features (about 25 more designed per-type pages, a config.json settings view, codebase-only projects, test-health work, ReDoS and innerHTML regression tests, search regrouping with facets and a Cmd-K palette, a new URL scheme, multi-project switching) to the existing Labelore read-only dashboard.
**Researched:** 2026-10-25
**Confidence:** HIGH for pitfalls grounded in this repo's code and this machine's data (marked "verified"). MEDIUM for generic framework behaviour (Vite dev-server handling of dotted URLs, react-router param decoding), which must be confirmed by a test before it is relied on.

## How to read the phase labels

The roadmap does not exist yet. Phase labels below are a suggested grouping, not a commitment.

| Label | Suggested phase | Why it is a unit |
|-------|-----------------|------------------|
| A | Test health and security regression tests | Everything else is verified by this suite. Fix it first. |
| B | Project identity and URL scheme | Every page, link, spec and golden depends on it. Must land before E and F. |
| C | Multi-project runtime (registry, switcher, folder scan, settings store) | Reshapes the server's singleton state and adds the first write path and the first runtime-supplied targets. |
| D | Project shapes and project settings (codebase-only, config.json, internal-file classification) | Decides what a "kind" is for files with no page. Must land before E. |
| E | Per-type pages, in batches | Highest volume, lowest architectural risk, once A, B and D are done. |
| F | Search regrouping, facets, Cmd-K palette | Sits on the URL scheme and the multi-project model. |
| G | Source mode redesign and UI-review polish | Leaf work. |

Suggested order: A, then B and D together, then C, then E and F in parallel, then G.

## Critical Pitfalls

### Pitfall 1: The URL is also the identity, so a "prettier URL" quietly becomes an API and cache redesign

**What goes wrong:** Today `key` is both the artifact's identity and its URL. `references.ts` sets `url: plan.key` and `url: dto.key`. The client calls `/api/documents?route=${artifact.key}`, and `parsePresentationUrl` on the server decodes it. `plan-pair-page.tsx` builds its TanStack Query key from `location.pathname`. 82 call sites use the route builders, many of them inside server-side handlers and presentation builders, so URL strings are baked into API payloads. Swapping the scheme in `routes.ts` alone leaves a mixed state: some payloads carry new URLs, some old, and the server cannot resolve the ones it did not mint.
**Why it happens:** The scheme is a self-describing token (`m~`, `p~`, `a~` prefixes), so it needed no lookup table. Readable URLs (`/labelore/v1.1/phase-5/plan-03`) are lossy, so they need one.
**How to avoid:**
- Split identity from presentation. Keep an opaque stable `key` for API calls and cache keys. Add one `href` produced by a single resolver.
- Build a bidirectional table (pretty path to artifact, artifact to pretty path) once per snapshot. Put it inside the `DerivedViews` bundle so a refresh swaps it atomically with everything else (the existing D-05 rule).
- Delete direct use of the builders outside that resolver. Enforce with a test, in the style of the existing node:fs gate.
- Write a round-trip property test: for every artifact in every fixture, `parse(build(artifact))` returns the same artifact, and no two artifacts share a URL.
**Warning signs:** A payload contains both `/milestones/m~...` and `/labelore/...` strings. A `parsePresentationUrl` failure shows up in a server log after a click. Two different files open the same page. A refresh makes a previously open URL 404 although the file still exists.
**Phase to address:** B

---

### Pitfall 2: Pretty slugs collide, change over time, or do not exist for ad-hoc files

**What goes wrong:** A readable path assumes one file per (milestone, phase, kind). That assumption is false in this corpus:
- Phase numbers repeat across milestones, and the live milestone is stored as `milestoneVersion: null`. The `v1.1` segment must be inferred for live phases. If inference fails, or the milestone is archived later, the permalink changes.
- Decimal phases (`02.1`) and project-code phases (`LORE-05`) exist, and a phase can have several plans and several same-kind files (`05-01-SUMMARY`, `05-02-SUMMARY`; `REVIEW` and `REVIEW-FIX`).
- A quick task directory holds PLAN, SUMMARY, CONTEXT, RESEARCH and VERIFICATION. `/labelore/quick/261024-qhq/summary` works for one but not for ad-hoc names such as `ROUTE-INVENTORY`.
- Basenames collide across directories. `CONVENTIONS.md` exists in both `codebase/` and `spikes/`. `MANIFEST.md` and `WRAP-UP-SUMMARY.md` exist in both `spikes/` and `sketches/`. `STACK.md` and `ARCHITECTURE.md` exist in both `research/` and `codebase/`. `README.md` sits inside every spike and sketch directory.
- Workstreams nest a whole second tree: `.planning/workstreams/<slug>/{config.json,STATE.md,ROADMAP.md,phases/}`. The scheme needs a segment for it.
- Slug edge cases: names that slugify to an empty string, leading dots (`.continue-here.md` vs `continue-here.md`), case-only differences, Unicode normalisation (NFC vs NFD) when a mirrored ssh tree comes from another OS.

**Why it happens:** Slugs are designed from the three or four shapes seen in sketches. The long tail is discovered later, as a 404 on one real file.
**How to avoid:**
- The pretty path is a convenience over a total fallback. Every artifact path must have a URL, with no exceptions.
- When a collision or an unrecognised name occurs, fall back deterministically to a path-based URL, for example `/<project>/file/<encoded-relative-path>`, or add a stable hash suffix.
- The slug function must never return an empty string. Normalise to NFC before comparing.
- Key the pretty segment on location plus path, never on basename or `kind` alone.
- Derive the milestone label for live phases from one named function, and unit-test the fallback when STATE.md or ROADMAP.md is missing.
- Add a decimal phase, a project-code phase, a duplicate phase number, an odd filename and a workstream file to a fixture, and run the round-trip test from Pitfall 1 over them.
**Warning signs:** A "which file is this" bug where the page shows another file's title. Duplicate-key warnings in React. A slug ending in `-2` or `-1` that flips when files are added. Playwright specs written with hand-typed URLs for only the happy shape.
**Phase to address:** B (design and round-trip test), D (kind and position dispatch for new directories)

---

### Pitfall 3: The first URL segment is a project slug, and several things already own the top level

**What goes wrong:**
- The server reserves `/api/`, `/sketches/` and (in production) `/assets/` by string prefix: `routesToApp` checks `url.startsWith('/api/')` and `url.startsWith('/sketches/')`. A project whose slug is `sketches`, `api` or `assets` is served the wrong thing, in dev and in production.
- The SPA already owns `/roadmap`, `/search`, `/traceability`, `/sketches`, `/research`. A project folder named `roadmap` or `research` clashes with those routes if any are kept at top level.
- The first-segment `/:project` route also swallows every typo, so the not-found screen no longer fires.

**How to avoid:**
- Keep a reserved-word list in one module, shared by the server prefix check, the router and the slug generator. A project slug can never equal a reserved word, and the generator appends a suffix instead.
- Prefer one `/<project>/...` route tree plus `/api` and `/assets`. Move `/sketches/*` file serving under the project prefix or a reserved name.
- Test every reserved word as a project name.
**Warning signs:** A project named `research` or `api` shows a blank or JSON page. `routesToApp` is still a hard-coded `startsWith` list after the new routes land.
**Phase to address:** B (slug and reserved words), C (server routing)

---

### Pitfall 4: Deep-link refresh works in the test but not in dev mode or for odd URL shapes

**What goes wrong:** `test/server/deep-links.test.ts` proves the production fallback against a fake static root, using the old URLs. The new URLs contain dotted segments (`v1.1`, `phase-2.1`) and may end in names that look like files (`config.json`, `.md`). Vite's dev middleware decides between "transform this module" and "serve the HTML shell" partly by URL shape, so a path ending in `.json` or `.md` can be served as a module in dev. Hono's `serveStatic('*')` tries a file first and then falls through to `index.html`. That is probably fine, but it is untested.
**Why it happens:** The old tokens (`a~...`, `m~...`, percent-encoded) never looked like files. The new ones do.
**How to avoid:**
- Extend the deep-link test to cover both modes: production, and the real Vite `middlewareMode` server that `startServer` uses in dev.
- Include these URL classes: dotted milestone, decimal phase, last segment ending in `.json` and `.md`, Unicode, a trailing slash, an unknown project.
- Add one Playwright spec that does a hard reload on each class and asserts the page renders.
- Verify asset URLs are still absolute (`/assets/...`) when the page URL is four segments deep.
**Warning signs:** The page works after clicking a link but shows raw JSON or a blank page on F5. A sibling dev server serves the shell but the production build does not, or the reverse.
**Phase to address:** B

---

### Pitfall 5: Old URLs, hand-typed URLs and cached payloads break everywhere at once

**What goes wrong:** Old `/milestones/m~.../phases/p~...` and `/artifacts/a~...` URLs live in browser history, in notes, in this repo's own `.planning/` docs and in Playwright specs. `test/e2e/*.spec.ts` mostly obtain URLs from the API (resilient), but hard-code `/research?open=...`, `/roadmap`, `/search?q=`, `/traceability`, `/`. Unit tests and goldens embed the old strings: 40-plus test files reference `/milestones/` or `/artifacts/`, and `snapshot.golden.test.ts` and the dense golden carry keys and URLs. If the golden is regenerated in the same commit as the code, a real regression hides inside a diff nobody reads.
**How to avoid:**
- Keep `parsePresentationUrl` as a legacy parser and add a redirect from old shapes to new. It is cheap, and it keeps old history working.
- Route the Playwright specs' fixed URLs through one helper, so the next change is one edit.
- Normalise goldens so URL strings are stripped or tokenised. Then a golden diff is only ever about content. Review the first regeneration by diffing with URLs masked.
- Change the scheme in one commit that touches the resolver only, then update consumers mechanically.
**Warning signs:** A golden updated with a thousand-line diff. Specs that pass because `test.skip` fires on a missing fixture. A "not found" screen after clicking a Phase row on the dashboard.
**Phase to address:** B

---

### Pitfall 6: Per-type pages built from one real example, or from none

**What goes wrong:** 25 more page types means many file types with no real example on this machine. Searching `~/Work` (excluding `node_modules`) found real instances of: codebase maps (8 projects), `HANDOFF.json` (2), `.continue-here.md` (4), `quick-batches` (2), spikes and seeds (2 reference copies nested in another project). It found none for AI-SPEC, EVAL-REVIEW, USER-SETUP, `*-REVIEWS.md`, FORENSICS, ONBOARD, and the `threads/`, `reports/`, `intel/`, `graphs/`, `forensics/`, `workstreams/`, `onboarding/` directories. Many of these are LLM-authored from templates, so a template shows intent, not guarantee. GSD has also moved on: 1.18.0 is installed here, the repo says it was built against 1.11.0, and key sets in `config.json` already differ across the seven local projects. Pages built from one sketch's hand-picked data break on the typical file.
**Why it happens:** The sketch-first loop is excellent for look and weak for shape coverage. Sketch data is curated, not sampled.
**How to avoid:**
- Follow the existing `fixtures/README.md` rule: derive fixtures from `~/.claude/gsd-core/templates/` and workflow source, and record the template path and the gsd-core version in a provenance header in each fixture.
- Where a GSD command can produce the file (spike, seed, thread, forensics, graphify, intel), run it in a temp directory and commit the output as the fixture.
- For every new kind, require four things: a handler guard test (the repo already has `*-handler-guard.test.ts` per type), a mutation test (drop headings, reorder, rename sections, empty body, huge body, frontmatter-only), a degrade assertion (still shows title and body, never throws), and a fallback to the generic reader when structure drifts.
- Treat shared structure as a batch. The 7 codebase documents are one template with 7 manifests. The root documents share one frame.
- JSON artifacts (`HANDOFF.json`, `graphs/*.json`, `intel/*.json`, `BATCH.json`) need their own handler. The pipeline today is markdown-centric. Cap size, render without raw HTML, and keep them out of the full-text index unless a title is all that is indexed (Pitfall 15).
**Warning signs:** A page whose sketch used exactly one data example. A `Unrecognized type` marker on a file GSD 1.18 writes. A new `view-<kind>-*` class not in the design language doc (the class-vocabulary test will fail, which is the system working).
**Phase to address:** E (every batch), with fixture policy decided in A

---

### Pitfall 7: Kind dispatch keyed on basename gives root pages to files in other directories

**What goes wrong:** `deriveKind` in `discovery.ts` calls `isCanonicalRootFile(fileName)` on the basename at any depth. So `.planning/workstreams/x/STATE.md` gets kind `state`, and `.planning/codebase/STACK.md` or `research/STACK.md` get names that collide. A view registry keyed on `kind` alone would give a workstream's `ROADMAP.md` the root roadmap page, or a codebase `STACK.md` the project-research stack panel. The existing directory-position helpers (`isDebugSessionPath`, `isTodoPath`, `isNotePath`) are the right pattern, but each one is a separate predicate in a separate walk line.
**How to avoid:**
- New directories (`codebase/`, `spikes/`, `sketches/`, `seeds/`, `threads/`, `reports/`, `intel/`, `graphs/`, `forensics/`, `workstreams/`, `onboarding/`) classify by position first, then basename. Extend `positionKind` rather than adding more bespoke predicates.
- Give root-document kinds an explicit location guard (root only). Add `workstream` as a location and teach `assemble.ts` which tree is the active one.
- Add a table-driven test: each (path, expected location, expected kind) pair, including every collision named in Pitfall 2.
**Warning signs:** `codebase/CONVENTIONS.md` showing a spike-conventions layout. A workstream file appearing in the Roadmap page.
**Phase to address:** D

---

### Pitfall 8: Files GSD writes for itself get "Unrecognized type" markers and pages they do not deserve

**What goes wrong:** GSD writes transient or internal files into `.planning/`: `tmp/*.json`, `async-jobs/*.json`, `agent-history.json`, `current-agent-id.txt`, `active-workstream`, `.gsd-outgoing-milestone`, `milestone.lock`, `state.json`, `.gsd-ws-arg` (visible as untracked in this repo's `git status` right now). The walk indexes all of it. They flood the drawer and search with `Unrecognized` entries, and they change while being read.
**How to avoid:** Keep an explicit, documented classification of internal and ephemeral paths. Show them under a quiet "Internal" group in the drawer, exclude them from the search index, never design a page for them. Keep the "unknown files must degrade, not break" rule for everything else. A read that fails because the file vanished is a quiet state, not a warning.
**Warning signs:** Warning counts rise after every GSD command. Search returns `tmp/verify-*.json`.
**Phase to address:** D

---

### Pitfall 9: config.json settings view that is hard-coded to one GSD version, or claims defaults it does not know

**What goes wrong:**
- Key sets differ across the seven local projects. Sideby has `graphify`, `intel`, `planning`. Resoundant has `resolve_model_ids`. Several have `_auto_chain_active` (an internal underscore key). Labelore's own has `ship.pr_body_sections` with nested arrays. A hand-written label table drops new keys silently or throws on a type change.
- With workstreams, the config lives at `.planning/workstreams/<slug>/config.json`. The root file may not be the one in force.
- Showing "workflow.research: on" for a missing key claims GSD's default as fact. If the default changed in 1.18, the page lies.
- A config can hold command strings (`code_review_command`, `plan_bounce_script`) and, on other installs, tokens. This repo is public and screenshots are committed under `test/e2e/screenshots`.
- config.json is already an artifact (`json-config` handler), so it appears in search and the drawer. Two canonical places for it creates the "parallel truths" the project rules against.

**How to avoid:**
- Render by walking the actual object. A registry of descriptions only decorates keys it knows. Unknown keys go to an "Other" group with the raw value. A type mismatch shows the raw value.
- A missing key reads "not set". Show a default only when it is read from gsd-core source, and then label it as GSD's default.
- Mask values whose key matches key, token, secret or password, and never put config.json values in search snippets.
- State which file is shown, and the gsd-core version if the file records one.
- One canonical destination: the drawer, search and links point at the settings view, and Source mode still shows the raw file.
- Reachable from invalid-looking and codebase-only projects, and from an empty state when the file is missing. Parse failure shows the raw text with a warning, never a blank.
**Warning signs:** A settings row labelled with a raw key name that no human wrote. A settings page that is empty on Sideby's config (it has almost no standard keys).
**Phase to address:** D

---

### Pitfall 10: Codebase-only projects pass or fail validation by accident

**What goes wrong:** The checks today:
- `resolveTargetPath` accepts any directory that contains `.planning`. A codebase-only project passes.
- Passing the `.planning` directory itself requires `PROJECT.md` or `STATE.md` (`hasProjectMarker`). A codebase-only project is rejected as "not a GSD project" depending on how the argument was typed.
- `PlanningRepository.checkTargetIsGsdProject` only checks that `.planning` exists.
- The dashboard, shell header (`projectDisplayName`, `formatProjectMeta`), nav tabs (Roadmap, Traceability), next-work and blocked builders all assume STATE and ROADMAP exist or tolerate null in ways that were tested with sparse fixtures, not with "nothing but codebase/".
- `/gsd-map-codebase` can write a subset (the workflow lets the user pick files such as STACK.md and CONCERNS.md), may add `config.json` or dot-files, and its documents go stale as the code changes.
- Multi-project scanning (Pitfall 18) must also recognise this shape, or it drops the very projects it should offer.

**How to avoid:**
- Compute a `projectShape` once in the domain layer: `empty`, `codebase-only`, `initialised-no-roadmap`, `started`. Neutral files (config.json, dot-files, `.gsd-ws-arg`) do not change the shape. Everything downstream branches on the shape, never on "state is null".
- Make the overview work with 1 to 7 documents and show the mapped date from the document header, framed as a past analysis.
- Use one validation rule at the CLI, the repository and the scanner.
- Add a `codebase-only` fixture and a test that hits every `/api/*` endpoint on it and expects 200 with an honest empty state. Add a shell render test with no PROJECT.md (name falls back to the folder).
- Define the hand-off: once STATE.md or ROADMAP.md appears, the dashboard takes over (a refresh must not leave the overview up).
**Warning signs:** A 500 or an `undefined.map` on `/api/dashboard` for the new fixture. A Roadmap tab that opens an empty page. The same folder accepted from the CLI and rejected from the switcher.
**Phase to address:** D

---

### Pitfall 11: Timing tests with absolute budgets in a parallel suite

**What goes wrong:** `security-register.test.ts` asserts `elapsed < 250` ms on a 600 KB body, and `section-projection.test.ts` asserts `< 200` ms on hostile inputs. Vitest runs 176 files across worker processes, and each measures wall-clock time that includes GC and CPU contention from the other workers. The one failing test misses by a few milliseconds, which is the signature of this problem. Adding more absolute-budget ReDoS tests (the v2.1 requirement) will add flakes proportionally.
**How to avoid:**
- Assert growth, not absolute time. Run the scanner at size n and at 4n, take the best of several runs after a warm-up, and assert `t(4n) / t(n)` is below a threshold between linear (4) and quadratic (16). Load shifts both sides equally.
- Keep an absolute ceiling only as a hang detector, and make it generous (seconds, not tens of milliseconds).
- Put timing tests in their own Vitest project that runs files serially. Do not use `retry` to hide a flake.
- Include a planted positive control: a deliberately quadratic function that the harness must flag. The class-vocabulary test already uses this idiom.
- Prove the stability claim before closing: run the whole suite three times under artificial load.
**Warning signs:** A test that fails only when the full suite runs. A failure message of the form "expected 252 to be less than 250".
**Phase to address:** A

---

### Pitfall 12: The linkify reference scanner is quadratic today (verified)

**What goes wrong:** The v2.1 requirement names ReDoS tests for the "mention scanners". I ran the regexes against hostile input:
- `REFERENCE_TOKEN` in `src/rendering/linkify.ts` has no `\b` guard on the `[A-Z][A-Z0-9]+-\d+` and `\d+(?:\.\d+)?-\d+` alternatives. On a run of capitals or digits with no hyphen it restarts from every position. Measured: 5k characters 17 ms, 10k 70 ms, 20k 280 ms. Doubling the input quadruples the time, so 100k characters is roughly seven seconds. It runs on every text node of every rendered document, so one pasted long uppercase or digit run freezes a server-side render.
- `ID_PATTERNS` in `src/planning-repo/mentions.ts` use `\b` and measured linear (sub-millisecond at 40k). The `.planning/\S*...` alternative in linkify also measured linear.
- The test named in the requirement must therefore cover `linkify.ts`, not only `mentions.ts`.

**How to avoid:** Fix `linkify.ts` first (add `\b` or lookbehind and lookahead guards matching `mentions.ts`), then write the growth-ratio test from Pitfall 11 against both files, with hostile shapes derived from each regex's actual quantifiers: long capital runs, long digit runs, `Phase` plus long whitespace, `.planning/` plus long non-whitespace, unterminated emphasis and long pipe runs for section projection. A test written before the fix must fail, which proves it can detect the problem.
**Warning signs:** A ReDoS test that passes on the first run without a code change. Test inputs chosen from existing fixtures rather than derived from the pattern.
**Phase to address:** A

---

### Pitfall 13: Copying other projects' `.planning` into fixtures publishes private content

**What goes wrong:** The repo's remote is `github.com/whonoahexe/labelore`, and `gh` reports its visibility as PUBLIC. The live corpus sources include work projects: Ibis (resoundant, pyedge, deid), Cinedise (studio-portal), Sideby. Their planning files hold business logic, internal URLs, people and sometimes credentials. `fixtures/README.md` already states the rule (D-01: fixtures are hand-authored synthetic, never from a real project), but several committed files are described as copied byte-for-byte (`test/fixtures/notes`, `test/fixtures/todos/{duet,portal}`) and the review and verification fixtures are prefixed by source (`sp01`, `dd01`, `sb02`). Pushed content cannot be un-pushed without rewriting history.
**Why it happens:** The corpus tests are valuable precisely because the files are real, and "copy it into `test/`" is the shortest path to green.
**How to avoid:**
- Decide the policy once, in writing, and test it: fixtures are either synthetic (preferred) or run through a committed scrub script that replaces project names, people, URLs, hostnames, emails and IPs and fails on any secret-shaped string. Add a secret scan to the check that guards `test/fixtures`.
- Audit what is already committed under `test/fixtures` and `test/e2e/screenshots` before adding more.
- Pick fixtures for shape diversity, not volume: the largest, the smallest, the most warnings, the unusual headings, found by script. Record each fixture's provenance and the shape it covers.
- Keep a separate opt-in `test:corpus` script that walks live projects for drift detection. It must never gate the default suite.
- Set a size budget for `test/fixtures` (today 804 KB across 87 files; Labelore's own `.planning` is 15 MB and 500 files).
**Warning signs:** A fixture containing a company name, a hostname or a person. A `git add` of more than a few hundred KB under `test/fixtures`.
**Phase to address:** A (policy and audit), then each of E's batches

---

### Pitfall 14: Green because skipped, and fixed paths that no longer exist

**What goes wrong:** `playwright.config.ts` adds a second server only if `~/studio-portal/.planning` exists. That path no longer exists on this machine (the project lives under `~/Work/Cinedise/studio-portal`), while `test/helpers/studio-portal.ts` has a different candidate list. The dependent specs `test.skip`. Corpus tests do the same with `it.runIf(existsSync(...))`. The result is a green suite that silently tests less each time a project moves.
**How to avoid:** Once data lives in the repo, absence is a bug. Replace conditional skips for in-repo fixtures with hard failures. For the opt-in live corpus, print the skip count. Add a single check that fails if the number of skipped tests in the default run is not zero.
**Warning signs:** Vitest or Playwright output with a non-zero "skipped" count that nobody noticed.
**Phase to address:** A

---

### Pitfall 15: Search regrouping and facets rebuilt on top of an index that cannot serve them, plus a second Cmd-K

**What goes wrong:**
- A Cmd-K dialog already exists. `SearchDialog` in `search-field.tsx` registers a global `keydown` for Meta/Ctrl+K on `window` and opens a base-ui `Dialog` with a `Combobox`. Adding a "palette" as a new component gives two global listeners and two dialogs. The existing one already handles the editable-target and own-popup cases.
- The index is body-oriented (`prefix: true`, `fuzzy: false`, `combineWith: 'AND'`, boosts on title and frontmatterText). A quick-jump palette wants title, path and id matches, fuzziness and recency. It can share the same MiniSearch index with a different `search` call (restrict `fields`, enable `fuzzy`, change `boost`), but not with the same options.
- Facet filters need fields the index may not carry: milestone, phase, kind, requirement ids. Requirement filtering needs the document to requirement mapping from the mention index at build time. Facet counts must be computed from the unfiltered hit list, or each count reflects the other filters.
- After `/api/refresh`, `buildDerivedViews` creates a fresh `searchIndexState` in `building` status and swaps it in immediately. For that window `/api/search` returns zero results. With a palette that people open in the middle of work, this reads as "nothing matches". A switched project's lazy index would show the same behaviour.
- Non-prose artifacts (graphs, intel JSON, `tmp/`) pollute results and bloat the index.
- Group buckets: artifacts with no phase (root documents, notes, todos, quick tasks, codebase maps, research) must not fall out of "milestone then phase" grouping. Group order by best score, not by chronology.
- Stale filter values: a `?phase=` in the URL that no longer exists after a refresh or a project switch.
- Hash anchors in snippets must keep using the one shared `stableSlug`.

**How to avoid:**
- Extend `SearchDialog` into the palette. One listener, one dialog, one trigger. Keep the existing editable-target guard.
- Give the palette its own query mode on the same index. Add milestone, phase, kind, requirement and path fields at index time. Compute facet counts in one pass.
- Keep serving the previous index until the new one is ready, or return the stale results flagged as stale. The palette states "indexing" distinctly from "no results", and refetches when status flips.
- Treat the other document-level `keydown` handlers as consumers to protect. `plan-navigator`, `ui-review`, `ui-spec` and `pattern-map` each listen on `document` for j/k, arrow keys or Escape, with `inside` and `editable` guards; verify each ignores events from the dialog portal, and that Escape does not also clear a picked rule behind the dialog.
- Handle IME composition (ignore Enter while `isComposing`), return focus to the trigger on close, and keep a clickable trigger for touch.
- Put filters in the URL, validate them against the current index, and drop unknown values with a visible note.
**Warning signs:** Two Cmd-K listeners in a React DevTools or `getEventListeners` check. "No results" appearing for one second after Refresh. A facet count that drops to zero when you tick its own facet.
**Phase to address:** F

---

### Pitfall 16: Multi-project switching on a server built from singletons

**What goes wrong:** `createApp` keeps one `derived` bundle, one `commits` log, one `fileDates`, one `inFlight` refresh promise and one `source`, all as closure variables. `startServer` makes one source, registers one set of `SIGINT`/`SIGTERM`/`exit` handlers with `process.once`, and `/sketches/*` is bound to one filesystem. Remote (ssh) sources own a mirror in a temp directory. Naively instantiating `createApp` per project multiplies Hono apps and listeners; naively keeping one app means project A's response can be built from project B's bundle.
**How to avoid:**
- Introduce a project context (source, derived bundle, commit log, file dates, refresh coalescing) held in a registry. Extend the D-05 rule: each request captures its project context first, then does everything else from that capture.
- Namespace the API by project (`/api/p/<slug>/...`). No ambient "current project" in the server. The client carries the project in the URL.
- Register process signal handlers once, for the registry, not per source. Make the registry's `dispose` close every mirror, and delete stale `labelore-remote-*` temp directories on startup.
- Refresh coalescing is per project.
- Keep per-project loading lazy (Pitfall 17).
**Warning signs:** `MaxListenersExceededWarning`. A request for project A that shows B's title. Temp directories named `labelore-remote-*` surviving a crash.
**Phase to address:** C

---

### Pitfall 17: Memory and load cost grow with every project opened

**What goes wrong:** Each loaded project holds its full snapshot (every file body), an artifact index, a reference registry, a MiniSearch index over all bodies, and a rendered-document cache. The 23 `.planning` directories under `~/Work` range from tens of files to about 500 files and 15 MB. Building all of them at startup, or keeping all of them after the user moves on, wastes memory and makes startup slow, and a folder scan that eagerly loads results is worse.
**How to avoid:** Load a project when first opened. Keep the active project and a small number of recent ones (LRU of two or three). Evict the rest, disposing their indexes and mirrors. The scan returns candidates only, with no snapshot. Build the search index on first search for that project. Add a test that switches among N projects repeatedly and asserts that heap use does not grow with N.
**Warning signs:** Resident memory climbing with every switch. A multi-second delay on the first request after startup with many paths given.
**Phase to address:** C

---

### Pitfall 18: Stale TanStack Query cache and in-flight responses across projects

**What goes wrong:** Query keys are `['presentation']`, `['dashboard']`, `['roadmap']`, `['tree']`, `['drawer']`, `['traceability']`, `['research']`, `['sketches']`, `['search', ...]`, `['artifact-document', route]`. None carry a project. Switching projects shows the previous project's data until each query refetches, and a response that was in flight when the user switched can land in the new project's cache. Any `localStorage` or `sessionStorage` keys (theme is global, but pagination, outline or filter state is per project) have the same problem.
**How to avoid:**
- Make the project the first element of every query key through one `useProjectQuery` helper, and ban raw `useQuery({ queryKey: [` outside it with a lint rule or a source-scan test.
- Drive the project from the URL, so the cache partitions naturally. `queryClient.clear()` on switch is not enough on its own, because of in-flight responses.
- Pass an `AbortSignal` and make each response carry its project id, which the client checks before use.
- Namespace persisted UI state by project slug.
**Warning signs:** The project name in the header changes but the dashboard body does not. A flash of the old project's data after a switch.
**Phase to address:** C

---

### Pitfall 19: Project slugs that collide, depend on arrival order, or flip

**What goes wrong:** A slug from the folder name collides: two folders named `app`, `pyedge/cman` against another `cman`, the Labelore repo against its own `fixtures/dense`. The same project can be reached by two paths (a symlink, an ssh target and a local checkout, a git worktree). If the first project to arrive gets `app` and the second gets `app-2`, then adding or removing a project changes existing URLs.
**How to avoid:** Derive identity from the canonical path (realpath) or the normalised ssh target. Generate a slug as sanitised basename, adding a short hash of that identity only on collision, and persist the assignment in the settings store so it never changes later. Reserved words per Pitfall 3 apply. Deduplicate by identity, not by string.
**Warning signs:** A bookmarked project URL opens a different project after a new path is added.
**Phase to address:** C (identity), B (slug rules)

---

### Pitfall 20: The first write path in the app, and the read-only guarantee

**What goes wrong:** "Remember opened projects in Labelore's own settings" is the first code that writes to disk. The project rule is that `local-fs.ts` is the only `src/` importer of `node:fs`, pinned by a test, and the filesystem seam has `capabilities: { write: false }`. A settings writer breaks that gate or tempts someone to widen the seam. It also brings classic persistence faults:
- Corruption: a crash mid-write truncates the JSON and the next start throws or loses the project list.
- Concurrency: several Labelore instances can run at once (a systemd service, a dev instance, auto-port, the Playwright server on 4199). Last write wins.
- Test pollution: vitest and Playwright runs add temp-directory fixtures to the user's real remembered list.
- Stale entries: a remembered project that has moved gets silently deleted, or crashes the switcher.
- Proximity: a settings file placed inside, or resolved into, a target tree.

**How to avoid:**
- Make the writer a second, deliberately named module with its own narrow gate test: the allowlist of `node:fs` importers becomes exactly two files, with write calls permitted only in the settings module. The settings path must never resolve inside any registered target root, and a test asserts it.
- Write atomically (temp file then rename), include a schema version, and validate per entry on read. On a parse failure, keep the bad file as `.bak`, start empty and say so. Never throw at startup.
- On every change, re-read and merge before writing (or write only on explicit user action), so concurrent instances do not erase each other.
- Mark an entry whose path is missing as "unavailable" in the switcher. Do not delete it.
- Add an environment override for the settings directory, and set it in the vitest and Playwright setup so tests never touch the real file.
**Warning signs:** A project list that loses entries after running tests. A raw `SyntaxError` at startup. A second file in `src/` that imports `node:fs/promises` for writing.
**Phase to address:** C

---

### Pitfall 21: Runtime-supplied paths and ssh targets turn a local viewer into a request-driven file reader and process spawner

**What goes wrong:** Today only the CLI chooses what to read. The switcher adds HTTP endpoints that accept a filesystem path, a folder to scan, or an `ssh://` target. The server listens on 127.0.0.1 only, but any web page open in the user's browser can attempt requests to it, and DNS rebinding defeats same-origin assumptions. The only existing gate is a `sec-fetch-site` check on `POST /api/refresh`, and an absent header passes. A scan endpoint is also a directory-listing oracle. An ssh add spawns a process against an arbitrary host. Separately, the sketches route serves target-project HTML on the app origin (it does set `Content-Security-Policy: sandbox allow-scripts`, which is the right protection and must be kept on every new route that serves project files).
**How to avoid:**
- Check the `Host` header against an allowlist (`127.0.0.1` and `localhost` with the server's port) on every request. Require a same-origin `Origin` or `sec-fetch-site` value on every non-GET and on the scan endpoint, and require a custom header or JSON content type, so a form post cannot trigger it.
- Restrict scan roots to the user's home directory or the paths given at startup. Return only directories that contain `.planning`.
- Reuse `parseRemoteTarget` and its validation (leading `-` rejection, host and user patterns, `shell: false`, `BatchMode=yes`). Do not write a second parser for the switcher.
- Resolve an added path through `resolveTargetPath` exactly once, then pass the canonical path onward.
- Run an ssh add asynchronously with a visible "connecting" state, a cancel, and the existing timeout, so a slow host cannot freeze the UI or the server.
**Warning signs:** An endpoint that accepts a path and has no origin check. A scan that walks outside `$HOME`. A second regular expression for host names.
**Phase to address:** C

---

### Pitfall 22: Folder scan cost and false positives

**What goes wrong:** `~/Work` has about 20,555 directories, of which about 5,767 remain after pruning `node_modules` (6 of them here, but they hold most of the weight on a busier tree). There are 23 `.planning` directories, and the shape is not flat:
- Nested real projects (`resoundant/pyedge/cman/.planning` lives inside `resoundant/.planning`'s project). Stopping at the first match drops them.
- Reference copies that look like projects (`deid-template-studio/reference/protocol2rules-master/.planning`).
- Labelore's own fixtures: `~/Work/Personal/labelore/fixtures/*` and `test/fixtures/*` contain `.planning` directories that a scan would offer as projects.
- Agent worktrees under `.claude/worktrees/` (three exist), which can hold a full `.planning` copy while a GSD run is active.
- Symlink loops and slow network or FUSE mounts.
- Codebase-only projects, which must count (Pitfall 10).

**How to avoid:** Prune `node_modules`, `.git`, `dist`, `build`, `.next`, `target`, `vendor`, `.venv`, `.claude/worktrees`, and fixture-named directories (`fixtures`, `test`, `__fixtures__`, `reference`). Use `readdir` with file types and do not follow symlinks. Cap depth and add a time budget with a visible "stopped early" result. Do not stop descending at a match. Stream results, and show them as candidates the user picks. Measure with and without `node_modules` on a real tree, not a toy one.
**Warning signs:** A scan that takes seconds, or that lists `dense` and `sparse-empty`.
**Phase to address:** C

---

### Pitfall 23: A standing "no raw HTML" assertion that checks the wrong place or trips on comments

**What goes wrong:** The v2.1 requirement is a standing assertion that `blocks.tsx` stays free of `dangerouslySetInnerHTML`. Today the only real use is in `src/web/pages/artifact-page.tsx` (line 241), fed by server-sanitised HTML. With roughly 25 new page components under `src/web/views` and `src/web/pages`, the risk is in the new files, not only in `blocks.tsx`. A naive text search also fails on comments: `context-brief-components.tsx` mentions the word in a comment.
**How to avoid:** Scan all of `src/web/**` for `dangerouslySetInnerHTML`, `.innerHTML`, `.outerHTML`, `insertAdjacentHTML`, `document.write`, `srcdoc`, `{ __html`, `eval(`, `new Function`. Strip comments first (the `blankComments` helper in `class-vocabulary.test.ts` already does). Maintain an allowlist of exactly one site (`artifact-page.tsx`). Include a planted positive control. Keep JSON-derived text and config values as React text nodes.
**Warning signs:** A new page that "needs" HTML for a figure. An allowlist with more than one entry.
**Phase to address:** A, enforced during E

## Moderate Pitfalls

### Pitfall 24: Percent-encoding, odd filenames and double decoding

**What goes wrong:** `parsePresentationUrl` decodes through `new URL(...).pathname` and then `decodeURIComponent`. react-router also decodes params, and if any code calls `decodeURIComponent` on a param that was already decoded, a file name containing a literal `%` throws or is mangled. `?` and `#` in a name truncate the URL. `%2F` inside a segment is normalised by some servers. `new URL` collapses `.` and `..` segments. Names with Unicode normalisation differences between a mirrored ssh tree and the local OS fail to match.
**Prevention:** Decode exactly once, at one boundary. Do not rely on `%2F` to carry slashes; either use separate segments or a private escape. Add fixtures with spaces, `%`, `#`, `?`, `+`, non-ASCII and very long names, and a route-matching test per URL class using `createMemoryRouter`. Compare names in NFC.
**Phase:** B

### Pitfall 25: Lookup table stale after refresh

**What goes wrong:** The new slug table must be rebuilt on refresh. If it lives outside the derived bundle, a renamed file produces a 404 until restart, or two requests in one refresh window disagree.
**Prevention:** Build it inside `buildDerivedViews`; capture the bundle once per request (same as the existing artifact and document routes).
**Phase:** B

### Pitfall 26: Design-language and bundle drift from 25 new page families

**What goes wrong:** Each page adds `view-<kind>-*` classes, a manifest, a component file and a lazy chunk. The class-vocabulary test requires the doc table to list every sanctioned class and auto-allows only the `view-<kind>-` namespace for kinds in `VIEW_KINDS` (which feeds `VIEW_LOCAL_PREFIXES`). A new kind not added there fails the test. The build sets `chunkSizeWarningLimit: 680`, and `build-splitting.test.ts` exists to guard chunk shape; 25 more components can push the entry chunk back over its limit.
**Prevention:** Register each kind in `VIEW_KINDS` in the same commit. Share frames and figures across a batch. Keep every page lazy. Re-run the build-splitting test per batch.
**Phase:** E

### Pitfall 27: Root-document pages duplicate the existing designed views

**What goes wrong:** ROADMAP.md, REQUIREMENTS.md, STATE.md and PROJECT.md already feed the Roadmap, Traceability and Dashboard pages. A second designed page for the same file creates two canonical URLs and two renderings that can disagree. This repo's own decision log is "keep disagreeing signals separate, never merged".
**Prevention:** For each root document, decide up front whether its artifact URL redirects into the existing view, hosts a reading view with a link to the existing view, or is the page. Record the decision in the sketch.
**Phase:** E

### Pitfall 28: Large or non-prose artifacts hurt payload and search

**What goes wrong:** `graphs/` and `intel/` JSON can be megabytes. The server sends the whole body to the client and the search index tokenises it, which slows indexing and returns junk hits.
**Prevention:** Cap the body size sent to the client and show a truncation notice with a Source link. Index titles only, or skip the kind, for JSON and generated data.
**Phase:** E, F

### Pitfall 29: Corpus invariants weaken as fixtures shrink

**What goes wrong:** Corpus tests assert "for every file" invariants, which only mean something over a diverse set. A hand-picked small set passes while the long tail breaks.
**Prevention:** Choose fixtures by script for shape extremes (largest, smallest, most warnings, rarest headings), and record why each is there. Keep the opt-in live corpus run for drift, and run it before each milestone close.
**Phase:** A

### Pitfall 30: Sketch-first loop cost and screenshot drift at 25 pages

**What goes wrong:** One sketch, one build and one screenshot comparison per page is slow in series, and screenshots in `test/e2e/screenshots` are binary files that grow the public repo.
**Prevention:** Batch similar types into one sketch round. Keep committed screenshots to a small reference set, and gitignore bulk comparison output. Per project memory, run only the touched page's Playwright spec, not the full suite.
**Phase:** E

## Minor Pitfalls

### Pitfall 31: Source mode redesign regresses read-only or large-file behaviour
**What goes wrong:** A new Source view that highlights large files in the browser, or offers copy-and-edit affordances that imply editing.
**Prevention:** Keep it a viewer. Cap highlighting for large bodies (Shiki runs server-side, once). No editing affordance.
**Phase:** G

### Pitfall 32: UI-review polish items re-applied to superseded components
**What goes wrong:** The three v1.1 polish items (opaque narrow outline trigger, depth markers on the plan task index, primary-coloured trigger chevron) target code that v2.0 rebuilt. Applying them to the old shape wastes effort or reverts a v2.0 decision.
**Prevention:** Re-check each against the current component first, as the requirement already says.
**Phase:** G

### Pitfall 33: Outline entry cap changes search anchors
**What goes wrong:** A View-mode outline-entry cap can hide headings that search snippets and reference previews link to.
**Prevention:** Cap what is listed, not what exists: anchors still resolve, and the outline shows "N more".
**Phase:** A (cap), E

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Change `routes.ts` only and leave payload `url` fields | Smallest diff | Mixed old and new URLs, unresolvable links (Pitfall 1) | Never |
| Pretty URL only for recognised kinds | Fast to ship | 404 on ad-hoc files and collisions | Never, a total fallback is required |
| Regenerate goldens in the same commit as the URL change | Green suite | Real regressions hide in a huge diff | Only with URL masking and a reviewed diff |
| Copy whole projects' `.planning` into `test/fixtures` | Corpus tests keep passing | Public leak, large repo, staleness (Pitfall 13) | Never for work projects |
| Absolute-millisecond ReDoS assertions | Easy to write | Flakes under parallel load (Pitfall 11) | Only as a generous hang detector |
| One `createApp` per project | Reuses all existing code | Listener and memory multiplication, wrong-bundle risk | Never |
| Load every scanned project eagerly | Instant switching | Startup time and memory (Pitfall 17) | Never |
| Settings file written inline wherever convenient | Quick to add | Breaks the single-importer gate; corruption (Pitfall 20) | Never, use one module |
| Hard-coded config.json label table | Pretty first screen | Silent loss of new keys on GSD upgrade (Pitfall 9) | Only as decoration over a generic walk |
| Skip the handler guard and mutation tests for a "simple" page | Saves an hour | A drifted file breaks the page for a user, not a test | Never |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| GSD file formats | Treat templates as guarantees | Template-derived fixtures plus mutation tests plus generic-reader fallback; record the gsd-core version |
| Vite dev middleware | Assume the SPA fallback matches production | Test deep links in both modes, including dotted and extension-like segments |
| Hono `serveStatic` | Assume nested URLs fall back to the shell | Test a four-segment URL with a dotted segment against a real `dist` |
| react-router 8 | Decode params again by hand | Decode once, at one boundary; test with `createMemoryRouter` |
| TanStack Query | Leave keys project-less | One helper that prefixes the project; lint the rest |
| MiniSearch | Reuse one options object for body search and quick-jump | Same index, separate `search` options and fields, per mode |
| base-ui `Dialog`/`Combobox` | Add a second dialog | Extend `SearchDialog`; verify focus trap and focus return |
| System `ssh` | Re-validate hosts in a new place | Reuse `parseRemoteTarget` and `buildMirrorCommands` unchanged |
| `process.once` signal handlers | One set per project | One set for the registry |
| Playwright fixed ports | Reuse 4173 (the running service) | Keep 4199 and 4198; give any new multi-server spec its own ports and a settings-dir override |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Quadratic `REFERENCE_TOKEN` in `linkify.ts` | Render hangs on a long capital or digit run | Add boundary guards, then a growth-ratio test | About 20k characters of an uppercase or digit run costs ~280 ms; 100k costs seconds |
| Loading all projects | Slow start, high memory | Lazy load plus LRU | A handful of 500-file projects |
| Recursive scan without pruning | Multi-second scan | Prune list, depth cap, time budget | Trees with several `node_modules` or deep monorepos |
| Index swap to `building` on refresh | Empty palette for a moment | Serve the old index until the new one is ready | Every Refresh |
| Facet counts per keystroke over full hit list | Typing lag | Compute counts in one pass over the unfiltered hits | Thousands of documents; fine at today's hundreds |
| Indexing JSON and generated data | Slow index, junk hits | Index titles only or skip | One large `graphs/` file |
| Server-side Mermaid or figure work per page for 25 types | Slow page loads | Keep the existing client-side Mermaid and lazy chunks | Entry chunk over the 680 kB limit |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Mutating or path-accepting endpoint without Host and Origin checks | Any open web page, or DNS rebinding, can make Labelore read directories or spawn ssh | Host allowlist, same-origin requirement on non-GET, custom header (Pitfall 21) |
| Scan endpoint over arbitrary roots | Directory-listing oracle | Restrict to home or startup paths; return only `.planning` parents |
| Showing config.json values verbatim | Tokens and command strings in a public-repo screenshot or search snippet | Mask by key name; keep values out of snippets (Pitfall 9) |
| Copying private planning docs into fixtures | Confidential content on a public repo | Synthetic or scrubbed fixtures with a secret scan (Pitfall 13) |
| New route that serves project files without the sandbox CSP | Project-authored script runs on the app origin and can call the API | Keep `Content-Security-Policy: sandbox allow-scripts` on every file-serving route |
| Settings path inside a target | Writes near the user's planning state | Test that it never resolves under a registered root |
| `dangerouslySetInnerHTML` in a new page | XSS from planning content | Repo-wide scan with a one-site allowlist (Pitfall 23) |
| Raw JSON rendered as HTML for graph or intel files | Same as above | Render JSON as text nodes |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Palette says "No results" while indexing | User thinks the file does not exist | Distinct "Indexing" state, then refetch |
| Project switch leaves old data for a moment | User acts on the wrong project | Route-driven project, keyed cache, skeleton on switch |
| Settings view that shows invented defaults | User trusts a value GSD does not use | "Not set" unless the default is read from GSD source |
| Overview for a codebase-only project presented as current truth | Stale analysis read as fact | Show the mapped date and frame it as a past mapping |
| Unknown or internal files shown as "Unrecognized type" | Noise in the drawer | "Internal" group; hide ephemeral files |
| Scan returns fixtures and worktrees | User must triage junk | Prune and mark candidates |
| Old URL gives a not-found screen | Lost bookmarks | Redirect legacy shapes |
| Filter state in the URL points at a missing phase | Empty results with no explanation | Validate on load and note the dropped filter |
| Cmd-K steals the browser's own shortcut in an editable field | Cannot use the address bar or an editor | Keep the existing editable-target guard |

## "Looks Done But Isn't" Checklist

- [ ] **New URL scheme:** often missing the legacy-URL redirect, the dev-mode deep-link test and the round-trip test over odd names. Verify a hard reload for each URL class in both modes.
- [ ] **Every artifact has a URL:** often missing the fallback for collisions and ad-hoc names. Verify the count of distinct URLs equals the count of artifacts across all fixtures.
- [ ] **Codebase-only overview:** often missing the endpoint sweep. Verify every `/api/*` returns 200 and an honest empty state on a codebase-only fixture, and that adding STATE.md flips the first screen.
- [ ] **Settings view:** often missing unknown keys, workstream configs and masking. Verify against all seven local projects' config.json and a fabricated one with a new key and a wrong type.
- [ ] **A page per type:** often missing mutation tests and the generic-reader fallback. Verify each kind has handler guard, mutation, degrade and class-vocabulary coverage.
- [ ] **ReDoS tests:** often green on first run. Verify each fails against a deliberately vulnerable pattern, and that the `linkify.ts` fix landed.
- [ ] **No raw HTML assertion:** often scoped to one file. Verify it scans `src/web/**`, strips comments, and has a positive control.
- [ ] **Corpus fixtures:** often missing the scrub. Verify no company, host, person or secret-shaped string, and that provenance is recorded.
- [ ] **Zero skips:** often ignored. Verify the default run reports zero skipped tests.
- [ ] **Palette:** often a second listener. Verify exactly one `keydown` registration for Cmd/Ctrl+K, focus returns on close, IME Enter is ignored, and "indexing" is distinct from "empty".
- [ ] **Multi-project:** often missing cache partitioning. Verify switching A to B to A never shows the wrong data, and heap stays bounded across 20 switches.
- [ ] **Settings store:** often missing corruption and concurrency handling. Verify truncated JSON recovers, two instances do not lose entries, and tests cannot touch the real file.
- [ ] **Runtime-added ssh target:** often missing the origin check. Verify a request with a foreign `Origin` or `Host` is refused.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Mixed old and new URLs shipped | MEDIUM | Route all builders through the resolver, add the legacy redirect, regenerate goldens with URLs masked |
| Slug flips after a project is added | MEDIUM | Persist slug assignments; ship a one-time migration that pins current slugs |
| Private content already pushed in fixtures | HIGH | Remove files, rewrite history (`git filter-repo`) and force-push, rotate any exposed secret, replace with synthetic fixtures |
| Flaky timing tests | LOW | Convert to growth-ratio tests, isolate in a serial project |
| Quadratic scanner in production | LOW | Add boundary guards; add the test that would have caught it |
| Corrupt settings file | LOW | Restore from `.bak`, or start empty and rescan |
| Wrong project's data shown after switch | MEDIUM | Prefix query keys by project, add the response project-id check |
| Memory climbing with switches | MEDIUM | Add LRU and eviction with `dispose` |
| Page broken by GSD format drift | LOW | Generic-reader fallback already exists; add the new shape as a fixture |
| Second Cmd-K dialog shipped | LOW | Fold into `SearchDialog`, delete the duplicate listener |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 URL is identity | B | Round-trip test; no payload mixes schemes |
| 2 Slug collisions and gaps | B, D | Distinct-URL count equals artifact count across all fixtures |
| 3 Reserved first segments | B, C | Every reserved word tried as a project name |
| 4 Deep-link refresh | B | Hard reload per URL class in dev and production |
| 5 Legacy URLs, goldens, specs | B | Redirect test; golden diff with URLs masked is empty |
| 6 Fixture fidelity | A (policy), E | Per-kind guard, mutation and degrade tests |
| 7 Basename dispatch | D | Table-driven path to location and kind test |
| 8 Internal files | D | Fixture with `tmp/`, `async-jobs/`, `.gsd-ws-arg`: no warnings, not indexed |
| 9 config.json view | D | Seven real configs plus a fabricated drifted one render without loss |
| 10 Codebase-only | D | Endpoint sweep on a codebase-only fixture |
| 11 Timing tests | A | Three full runs under load, all green |
| 12 Quadratic linkify | A | Growth-ratio test fails before the fix, passes after |
| 13 Private fixtures | A | Secret and name scan on `test/fixtures` passes; audit recorded |
| 14 Silent skips | A | Zero skipped in the default run |
| 15 Search, facets, palette | F | One listener; "indexing" state; counts correct |
| 16 Singleton server state | C | Concurrent requests for two projects return their own data |
| 17 Memory | C | Bounded heap across repeated switches |
| 18 Query cache | C | Switch test; lint on raw `useQuery` |
| 19 Project slug identity | C | Adding a project never changes an existing URL |
| 20 First write path | C | Gate test lists two importers; settings never under a target; corruption test |
| 21 Runtime targets | C | Foreign Host and Origin refused; scan restricted |
| 22 Folder scan | C | Real `~/Work` scan within time budget; no fixtures or worktrees listed |
| 23 innerHTML assertion | A, E | One-site allowlist; positive control |
| 24 Encoding | B | Fixtures with `%`, `#`, `?`, Unicode round-trip |
| 25 Stale table | B | Rename a file, refresh, new URL resolves, old one redirects or 404s cleanly |
| 26 Design-language drift | E | Class-vocabulary and build-splitting tests per batch |
| 27 Root-document duplication | E | Decision recorded per root document |
| 28 Large JSON | E, F | Size cap and index exclusion tests |
| 29 Corpus power | A | Fixture-selection script and rationale recorded |
| 30 Sketch loop cost | E | Batched rounds; screenshot size budget |
| 31 to 33 Minor | G, A | Per-item checks |

## Sources

- This repository, read on 2026-10-25: `src/presentation/routes.ts`, `src/server/index.ts`, `src/server/search-index.ts`, `src/server/remote-source.ts`, `src/cli/target-path.ts`, `src/cli/remote-target.ts`, `src/planning-repo/{discovery,snapshot,assemble,mentions,registry}.ts`, `src/planning-fs/local-fs.ts`, `src/rendering/linkify.ts`, `src/web/app-router.tsx`, `src/web/components/{app-shell,search-field}.tsx`, `src/web/views/kinds.ts`, the document-level keydown handlers in `src/web/views/*-components.tsx`, `test/security-register.test.ts`, `test/section-projection.test.ts`, `test/server/deep-links.test.ts`, `test/web/class-vocabulary.test.ts`, `playwright.config.ts`, `fixtures/README.md`, `vitest.config.ts`. HIGH confidence.
- Measured on this machine: regex growth timings for `linkify.ts` and `mentions.ts` patterns (scratchpad scripts), directory counts and scan timings under `~/Work`, per-project `.planning` sizes, local `config.json` key sets across seven projects, presence of each new file type across `~/Work`, `gh repo view` visibility. HIGH confidence.
- GSD source installed at `~/.claude/gsd-core` (version 1.18.0): `templates/`, `workflows/map-codebase.md`, `workflows/settings*.md`, `references/workstream-flag.md`, and an enumeration of `.planning/` paths named across workflows. HIGH confidence for what GSD writes. MEDIUM for how faithfully LLM-authored files follow templates.
- Not verified here and flagged for a test before reliance: Vite dev-server handling of dotted or extension-like last path segments, react-router 8 param decoding of `%2F` and `%25`, Hono `serveStatic` fallthrough for nested dotted paths. MEDIUM confidence.

---
*Pitfalls research for: Labelore v2.1 Wayfinding*
*Researched: 2026-10-25*
