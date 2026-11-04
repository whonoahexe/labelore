---
last_mapped_commit: 717c8d7db3d75717948b08690df3a087fc01684d
last_mapped_at: 2026-11-04
---
# Technology Stack

**Analysis Date:** 2026-11-04

## Languages

**Primary:**
- TypeScript 5.9.3 (devDependency `typescript`, `package.json`) - all server code (`src/server/`, `src/cli/`, `src/planning-repo/`, `src/planning-fs/`, `src/domain/`, `src/presentation/`, `src/rendering/`) and client code (`src/web/`, `.tsx`)
- Module system: ESM only (`"type": "module"` in `package.json`); `module`/`moduleResolution` are `nodenext` in `tsconfig.json`; relative imports carry `.ts` extensions (`allowImportingTsExtensions`, `verbatimModuleSyntax`)

**Secondary:**
- CSS (Tailwind v4 CSS-first config with oklch tokens) - `src/web/styles/globals.css`
- JavaScript - ESLint flat config `eslint.config.js`, `.prettierrc`
- Markdown - `docs/design-language.md`, `fixtures/**/.planning/*.md` (test fixtures that the app reads)
- JSON - `components.json` (shadcn config), `fixtures/**/.planning/config.json`

## Runtime

**Environment:**
- Node.js `>=22.18.0` (`engines` in `package.json`)
- TypeScript sources execute directly via Node's native type stripping: `npm run dev` runs `node src/server/index.ts`, `npm start` runs `NODE_ENV=production node src/server/index.ts`, `npm run snapshot` runs `node src/cli/snapshot.ts`
- Vite 8 handles the client bundle and (in dev) serves the UI through the Node server

**Package Manager:**
- npm (lockfile present: `package-lock.json`, lockfileVersion as committed)
- `.npmrc` sets `loglevel=silent`

## Frameworks

**Core:**
- React 19.2.8 (`react`, `react-dom`) - client UI; entry `src/web/main.tsx`, routing shell `src/web/app-router.tsx`
- react-router 8.3.0 - client routing in library/data mode; imports from `react-router` and `react-router/dom`. The package `react-router-dom` is not installed.
- Hono 4.13.4 - HTTP API and static serving; `src/server/index.ts`, `src/server/registry-api.ts`, `src/server/project-api.ts`, `src/server/request-guard.ts`
- `@hono/node-server` 2.1.1 - Node adapter (`createAdaptorServer`, `getRequestListener`) and `serve-static` (`@hono/node-server/serve-static`); `hono/body-limit` for request size limits
- TanStack React Query 5.102.3 (`@tanstack/react-query`) - client server-state cache; keys in `src/web/query-keys.ts`, fetch layer in `src/web/api.ts`
- @base-ui/react 1.7.0 - headless primitives (dialog, popover, input, field, tooltip, toast, preview-card, combobox, checkbox, button) in `src/web/components/`
- shadcn 4.19.0 (devDependency) with style `base-sera`, `rsc: false`, icon library lucide; config `components.json`

**Testing:**
- Vitest 4.1.11 - unit and server tests; config `vitest.config.ts` (`include: test/**/*.test.ts`, setup `test/helpers/config-dir-setup.ts`). Test tree under `test/`.
- Playwright 1.63.0 (`@playwright/test`) - e2e; config `playwright.config.ts`, specs under `test/e2e/`. Screenshot helper `test/helpers/shoot-pages.ts` uses a system Chrome via `LABELORE_E2E_CHROME` (default `/usr/bin/google-chrome`).

**Build/Dev:**
- Vite 8.2.2 - bundler and dev server; config `vite.config.ts` (`chunkSizeWarningLimit: 680`, alias `@` to `src/web`)
- `@vitejs/plugin-react` 6.1.0 - React transform (Babel-based)
- `@tailwindcss/vite` 4.3.3 and `tailwindcss` 4.3.3 - Tailwind v4 via Vite plugin
- `tw-animate-css` 1.4.0 - animation utilities imported from `src/web/styles/globals.css`
- ESLint 10.8.1 with `@eslint/js` 10.0.1, `typescript-eslint` 8.67.0, `eslint-plugin-react-hooks` 7.1.1, `globals` 17.11.0 - config `eslint.config.js` (flat config)
- Prettier 3.9.6 - config `.prettierrc`; script `npm run format`
- TypeScript 5.9.3 - `typecheck` script runs `tsc --noEmit` against `tsconfig.server.json` and `tsconfig.web.json`; base `tsconfig.json` has `"files": []`

## Key Dependencies

**Critical (rendering pipeline, `src/rendering/markdown.ts`):**
- unified 11.0.5 - processor core
- remark-parse 11.0.0, remark-gfm 4.0.1, remark-rehype 11.1.2
- rehype-raw 7.0.0, rehype-sanitize 6.0.0 (sanitize runs right after raw, `.use(rehypeSanitize, schema)` before `rehype-slug`), rehype-slug 6.0.0, rehype-stringify 10.0.1
- hast-util-sanitize 5.0.2 - custom sanitize schema
- shiki 4.4.3 - `createHighlighter()` with themes `vitesse-light` and `vitesse-dark` and a fixed language list (bash, css, html, javascript, json, jsx, markdown, tsx, typescript, xml, yaml, ...)
- mermaid 11.17.1 - diagrams rendered client-side only; `src/web/pages/artifact-page.tsx` looks for `[data-mermaid-pending="true"]`, theme mapping in `src/web/pages/mermaid-theme.ts`
- gray-matter 4.0.3 - YAML frontmatter parsing (`src/planning-repo/frontmatter.ts`)
- minisearch 7.2.0 - in-memory full-text index (`src/server/search-index.ts`)

**Critical (UI):**
- lucide-react 1.34.0 - icons
- class-variance-authority 0.7.1, clsx 2.1.1, tailwind-merge 3.6.0 - class composition helpers (`cn` in `src/web/lib/` or equivalent)

**Infrastructure (types only in dev):**
- `@types/node` 22.20.1, `@types/react` 19.2.18, `@types/react-dom` 19.2.5

**Not present:** No database driver, ORM, auth library, queue, or cloud SDK is installed.

## Configuration

**Environment variables read by the code:**
- `NODE_ENV` - selects production mode (`startServer` in `src/server/index.ts`; `createApp` default). `npm start` sets `production`.
- `LABELORE_CONFIG_DIR` - directory holding `settings.json` (remembered project list). Required when `VITEST` is set (`src/server/settings-store.ts`).
- `XDG_CONFIG_HOME` - used for the settings directory when absolute; otherwise settings go to `~/.config/labelore`.
- `LABELORE_ALLOWED_HOSTS` - extra `Host` header values accepted by the request guard (`src/server/request-guard.ts`, `parseAllowedHosts`).
- `LABELORE_E2E_CHROME` - path to Chrome for the screenshot helper (`test/helpers/shoot-pages.ts`).
- `LABELORE_USAGE_PAUSE_AT`, `LABELORE_PAUSE_BRANCH`, `LABELORE_USAGE_GUARD` - used only by the cloud-session hooks in `.claude/cloud/` (not by the app).
- No `.env` loader (no dotenv) is installed; configuration is through the process environment and CLI arguments.

**CLI arguments:**
- Positional project paths (local path, `sftp://`, `ssh://`, or `[user@]host:/path`); parsed in `src/cli/target-path.ts` and `src/cli/remote-target.ts`
- `--port`, `--smoke`, and related flags in `src/server/index.ts` (default port 4173, auto-port tries 4173 through 4182 when the default is taken)
- Argument parsing is hand-written; no CLI library is used.

**Build:**
- `vite.config.ts` - React and Tailwind plugins, `@` alias, chunk warning limit
- `tsconfig.json`, `tsconfig.server.json`, `tsconfig.web.json` - split server and web typechecks
- `components.json` - shadcn registry config (`src/web/styles/globals.css` is the CSS entry)
- `playwright.config.ts`, `vitest.config.ts`, `eslint.config.js`, `.prettierrc`
- Output: `dist/` (gitignored), served in production from `./dist` by `src/server/index.ts`

**Fonts and static assets:**
- Self-hosted WOFF2 under `public/fonts/`: `space-grotesk-latin.woff2`, `jetbrains-mono-latin.woff2`, declared via `@font-face` in `src/web/styles/globals.css`. No CDN font loading.
- `public/favicon.svg`

## Platform Requirements

**Development:**
- Node.js 22.18 or newer
- `npm install` from the lockfile
- Optional: system Chrome for Playwright screenshots (`/usr/bin/google-chrome` by default)
- Optional: system `ssh` and `tar` binaries for remote project targets (`src/server/remote-source.ts` spawns them with argument arrays, no shell)
- Optional: `git` on PATH for file dates and commit times (`src/server/file-dates.ts`, `src/server/commit-times.ts`); missing git is tolerated

**Production:**
- Local, single-user tool bound to `127.0.0.1` (`HOSTNAME` in `src/server/index.ts`)
- Run as `npm run build` followed by `npm start`; the repo's `.labelore-server.log` shows the development-mode warning that recommends this path
- Not deployed to a hosted platform. No Dockerfile, no CI config, and no cloud deploy config is in the repository.

---

*Stack analysis: 2026-11-04*
