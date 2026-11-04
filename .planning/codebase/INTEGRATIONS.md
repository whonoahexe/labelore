---
last_mapped_commit: 717c8d7db3d75717948b08690df3a087fc01684d
last_mapped_at: 2026-11-04
---
# External Integrations

**Analysis Date:** 2026-11-04

Labelore is a local, read-only dashboard over a GSD `.planning/` directory. It has no hosted backend, no database, and no third-party API clients. The integrations below are the local tools and filesystem sources it touches.

## APIs & External Services

**Language-model or SaaS APIs:**
- Not detected. No AI SDK, HTTP client to an external API, or SDK import appears in `src/` or `package.json`.

**Remote project source over SSH (optional, read-only):**
- The target `.planning/` can live on a remote host. Accepted forms: `sftp://`, `ssh://`, and `[user@]host:/path` (`src/cli/remote-target.ts`).
  - Client: system `ssh` binary spawned by `spawnMirrorRunner` in `src/server/remote-source.ts` (argument arrays, no shell)
  - Remote commands are fixed: path existence and directory checks, `cd`, and `exec tar -cf - .planning`, with the path value single-quoted (`buildMirrorCommands`)
  - Local side: `tar` extracts into a fresh temp directory (`src/planning-fs/local-fs.ts` provides the temp-dir primitives)
  - Auth: whatever the system `ssh` client uses (keys, agent, `~/.ssh/config`). The app does not store SSH credentials. Passwords typed in a target string are masked to `***` in `rawPath`.
  - Timeout and failure mapping are in `remote-source.ts` and `remote-target.ts`

**Git (optional, local):**
- `git` is run via `execFile` with argument arrays for file dates and commit history:
  - `src/server/file-dates.ts` (cached, never throws)
  - `src/server/commit-times.ts` (commit log for the `CommitLog` seam)
- Git's absence or failure degrades the dates to unknown rather than failing the page.

## Data Storage

**Databases:**
- None. No database client, ORM, or SQL driver is in use.

**Project data (read-only):**
- Source of truth is the filesystem `.planning/` directory of each registered project. The app reads it through the `planning-fs` abstraction:
  - `src/planning-fs/local-fs.ts` - local filesystem
  - `src/planning-fs/in-memory-fs.ts` - in-memory implementation for tests
  - `src/planning-fs/types.ts` - interface boundary
- Discovery and snapshot assembly: `src/planning-repo/discovery.ts`, `src/planning-repo/assemble.ts`, `src/planning-repo/snapshot.ts`
- Writes are not performed against project files. The one write path is the app's own settings file (below).

**App settings (the only file the app writes):**
- `settings.json` in the settings directory, resolved by `defaultSettingsDir()` in `src/server/settings-store.ts`:
  1. `LABELORE_CONFIG_DIR` when set
  2. `$XDG_CONFIG_HOME/labelore` when `XDG_CONFIG_HOME` is absolute
  3. `~/.config/labelore`
- Stores the remembered project list. Implementation: `FileSettingsStore`. Tests use `MemorySettingsStore`.
- Project identity uses `identityOfTarget` (`src/server/project-registry.ts`).

**File Storage:**
- Local filesystem only. Static client assets are served from `./dist` in production. The sketch files are served from project directories through `src/server/sketch-files.ts`.
- Byte serving for file downloads: `src/server/file-bytes.ts`

**Caching:**
- In-memory only. Search index: `src/server/search-index.ts` (MiniSearch, rebuilt on load). Project runtime cache: `src/server/project-runtime.ts`. Shiki highlighter is created once per process in `src/rendering/markdown.ts`.
- No Redis, memcached, or external cache.

## Authentication & Identity

**Auth Provider:**
- None. The server listens on `127.0.0.1` only.
- Request protection is a Host and Origin guard, not authentication:
  - `src/server/request-guard.ts` checks the `Host` header on every request (defends against DNS rebinding)
  - Origin is compared only against an allowed Host
  - Extra allowed hosts come from `LABELORE_ALLOWED_HOSTS` (`parseAllowedHosts`)
  - `createHostPolicy` learns the real bound port once the socket is listening
- A token guard exists for write-style handlers (`test/token-guard.test.ts`); the app is otherwise read-only.

**Secrets handling:**
- Project files are scanned for secrets, and matches are masked by `src/planning-repo/secret-mask.ts` before they reach the UI.
- No secrets are required by the app itself.

## Monitoring & Observability

**Error Tracking:**
- None. No Sentry or similar client is installed.

**Logs:**
- Console output from the Node process. Startup prints the project path, mode, and URL (`src/server/index.ts`).
- Runtime log file `.labelore-server.log` in the repo root is gitignored (`*.log`).

**Analytics:**
- None.

## CI/CD & Deployment

**Hosting:**
- Not hosted. Clone-and-run locally: `npm start` after `npm run build`, serving `http://127.0.0.1:4173`.
- Per-user service setup (systemd user unit) is referenced by the operator's own notes, not by a file in the repository.

**CI Pipeline:**
- None in the repository (no `.github/workflows`, no CI config files tracked by git).
- Local gates: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:gate` (`test/helpers/vitest-gate.mjs`), `npm run test:e2e`.

**Cloud-session hooks (developer tooling, not app runtime):**
- `.claude/settings.json` wires scripts in `.claude/cloud/` (`setup.sh`, `ensure-gsd.sh`, `usage-guard.mjs`, `save-at-limit.sh`, `statusline.mjs`, `usage-state.mjs`).
- They install GSD and manage pause-and-push handoffs. They are not part of the application's runtime integrations.
- Settings read there: `LABELORE_USAGE_PAUSE_AT`, `LABELORE_PAUSE_BRANCH`, `LABELORE_USAGE_GUARD`.

**MCP (developer tooling):**
- `.mcp.json` registers a `gsd-browser` stdio MCP server (`/home/cinedise/.npm-global/bin/gsd-browser`) for agent-driven browser checks. Not used by the app.

## Environment Configuration

**Required env vars:**
- None required for normal operation.
- Conditionally required: `LABELORE_CONFIG_DIR` when running under Vitest (`src/server/settings-store.ts`).

**Optional env vars:**
- `LABELORE_ALLOWED_HOSTS` - extra Host values accepted by the guard
- `LABELORE_CONFIG_DIR`, `XDG_CONFIG_HOME` - settings location
- `LABELORE_E2E_CHROME` - Chrome binary for screenshots
- `NODE_ENV` - production switch

**Secrets location:**
- No secrets are stored by the app. The `.env*` files are not read by any code (no dotenv dependency). `.npmrc` contains only `loglevel=silent`.

## Webhooks & Callbacks

**Incoming:**
- None. The Hono routes in `src/server/project-api.ts` and `src/server/registry-api.ts` are read endpoints for the local UI. No webhook receiver exists.

**Outgoing:**
- None. The app makes no outbound network calls except the SSH transport used for remote targets.

## File Watching

- Not implemented in v1. No `chokidar` or `fs.watch` usage was found. Refresh happens on request and through the project runtime.

---

*Integration audit: 2026-11-04*
