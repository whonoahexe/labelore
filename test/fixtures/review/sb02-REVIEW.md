---
phase: 02-container-docs
reviewed: 2026-05-13T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - lens.sideby.me/Dockerfile
  - CLAUDE.md
findings:
  critical: 3
  warning: 4
  info: 3
  total: 10
status: partial
fixed:
  - CR-01
  - CR-02
  - CR-03
  - WR-01
skipped:
  - WR-02  # accepted risk: project decision to use nightly builds (see STATE.md)
  - WR-03  # pre-existing behavior, out of scope for phase 2
  - WR-04  # requires coordinated capture.ts changes, out of scope for phase 2
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-13
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Two files were reviewed: `lens.sideby.me/Dockerfile` (the primary deliverable of this phase) and `CLAUDE.md` (the updated developer reference). The Dockerfile has three critical defects that will cause runtime failures in production: a base image version mismatch that misaligns patchright's Chrome binary with the Playwright image's infrastructure, a missing `.dockerignore` that allows secrets to enter the image, and a missing `curl` installation before it is invoked to download yt-dlp. An additional bug exists in `ytdlp.ts` (a file included by the phase's yt-dlp integration) where contradictory CLI flags can cause yt-dlp to make unnecessary full-stream network probes. CLAUDE.md has minor documentation inconsistencies.

---

## Critical Issues

### CR-01: patchright version (1.57.0) mismatched against Playwright base image (v1.49.0)

**File:** `lens.sideby.me/Dockerfile:1`

**Issue:** The base image is `mcr.microsoft.com/playwright:v1.49.0-jammy`, which pre-installs Playwright 1.49 browser infrastructure. However, `package-lock.json` resolves `patchright` to `1.57.0` (8 minor versions ahead). The `ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` line directs patchright's browser installer to `/ms-playwright`, the same directory already populated by the 1.49 base image. When `RUN npx patchright install chrome` runs, it installs the patchright-1.57.0-compatible Chrome binary into `/ms-playwright`, but the pre-existing 1.49 Playwright metadata files in that directory may conflict or be overwritten. At runtime, `chromium.launch({ channel: 'chrome' })` in `capture.ts` looks for a system-installed Google Chrome via the `channel` resolution path — not the `PLAYWRIGHT_BROWSERS_PATH` at all — meaning the entire `patchright install` step may be targeting the wrong binary and the wrong path.

The root misalignment: the base image version should match the patchright version resolved in `package-lock.json`, or the Dockerfile should use a plain Debian/Ubuntu base and install everything explicitly.

**Fix:**
```dockerfile
# Option A — pin base image to match patchright's resolved version
FROM mcr.microsoft.com/playwright:v1.57.0-jammy

# Option B — decouple from Playwright base entirely; use a plain Ubuntu base
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y nodejs npm curl ffmpeg && rm -rf /var/lib/apt/lists/*
```

---

### CR-02: No `.dockerignore` — `.env.local` and dev artifacts copied into image

**File:** `lens.sideby.me/Dockerfile:17`

**Issue:** Line 17 (`COPY . .`) copies the entire `lens.sideby.me/` directory into the image. There is no `.dockerignore` file in `lens.sideby.me/`. This means:

- `.env.local` (containing `LENS_SHARED_SECRET`, `CF_API_TOKEN`, `CF_KV_NAMESPACE_ID`, `REDIS_URL`) is baked into every image layer.
- `node_modules/` (if present locally) is re-copied on top of the `npm ci`-installed modules, overriding the clean install.
- `dist/` (local build artifacts), `*.test.ts`, and `src/` dev files all inflate image size unnecessarily.

Any developer who builds the image locally with a populated `.env.local` will ship credentials into the image, which may be pushed to a container registry.

**Fix:** Create `lens.sideby.me/.dockerignore`:
```
.env
.env.local
.env*.local
node_modules/
dist/
*.log
.git/
coverage/
```

---

### CR-03: `curl` not guaranteed present in base image — yt-dlp install may fail silently

**File:** `lens.sideby.me/Dockerfile:13`

**Issue:** Line 13 uses `curl` to download the yt-dlp binary, but `curl` is not installed before this step. The `apt-get install` on line 10 only installs `ffmpeg`. The `mcr.microsoft.com/playwright:v1.49.0-jammy` image is based on Ubuntu 22.04 (Jammy) and does include `curl` in the default image at present — but this is undocumented behavior of the upstream image and can change at any patch to the base image. More importantly, the `apt-get update` on line 10 runs before `ffmpeg` is installed but there is no corresponding update before the `curl` invocation, meaning if the base image's apt cache is stale, the `ffmpeg` install on line 10 cleans the apt lists (`rm -rf /var/lib/apt/lists/*`), and there is no subsequent `apt-get update` before any potential `curl` install. The current ordering only works by accident.

**Fix:** Install `curl` explicitly in the same `apt-get` step:
```dockerfile
RUN apt-get update && apt-get install -y curl ffmpeg && rm -rf /var/lib/apt/lists/*
```

---

## Warnings

### WR-01: yt-dlp `--no-simulate` contradicts `--dump-json` + `--skip-download` — may trigger full stream fetch

**File:** `lens.sideby.me/src/extraction/ytdlp.ts:76`

**Issue:** The yt-dlp invocation passes three mutually contradictory flags:
- `--dump-json` — according to yt-dlp documentation: "Quiet, but print JSON information for each video. Simulate unless --no-simulate is used."
- `--no-simulate` — explicitly disables simulation mode, causing yt-dlp to proceed with network activity beyond metadata extraction.
- `--skip-download` — suppresses writing the output file but does not suppress stream probing.

The combination of `--no-simulate` with `--dump-json` causes yt-dlp to perform full stream probing (selecting formats, resolving segment URLs, potentially reading the first segment) before printing JSON. This defeats the purpose of the 8-second timeout (`LENS_YTDLP_TIMEOUT_MS`) by allowing yt-dlp to make significantly more network requests than a pure metadata lookup would require. For HLS streams, this can involve fetching the master manifest and one or more variant manifests. Removing `--no-simulate` is the correct fix; `--dump-json` alone is sufficient and runs in simulate mode.

**Fix:**
```typescript
'--dump-json',
// '--no-simulate',   // REMOVE: contradicts --dump-json; causes full stream probe
'--no-playlist',
```

---

### WR-02: yt-dlp binary pinned to a nightly build tag — fragile supply chain

**File:** `lens.sideby.me/Dockerfile:12`

**Issue:** `ARG YTDLP_VERSION=2026.05.05.233942` points to a nightly build from `yt-dlp-nightly-builds`. Nightly release artifacts on GitHub are periodically pruned; the specific tag `2026.05.05.233942` may be deleted in a future GitHub Actions cleanup run, breaking all future builds without any code change. Nightly builds also have no stability guarantees and no formal changelog.

**Fix:** Pin to a stable release tag from the main `yt-dlp/yt-dlp` repo:
```dockerfile
ARG YTDLP_VERSION=2025.04.30
RUN curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_linux" \
    -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp
```

---

### WR-03: `PLAYWRIGHT_BROWSERS_PATH` env var causes patchright to install into shared Playwright directory

**File:** `lens.sideby.me/Dockerfile:3`

**Issue:** Setting `ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` causes patchright's CLI (which reads this env var) to install its Chrome binary into `/ms-playwright`. This is the same directory used by the Playwright base image for its pre-installed browsers. The two sets of binaries from different versions coexist in the same directory tree. On a version mismatch, patchright may overwrite Playwright's metadata files or fail to locate its own binary at launch because another browser version's entry occupies the expected slot. If the goal is to use patchright's Chrome exclusively, this env var should be set to a distinct directory or removed if patchright manages its own path independently.

**Fix:**
```dockerfile
# Give patchright its own directory, separate from the playwright base image browsers
ENV PATCHRIGHT_BROWSERS_PATH=/ms-patchright
RUN npx patchright install chrome
```
Or remove `ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` entirely if patchright defaults to a separate path.

---

### WR-04: Container runs as root — no `USER` directive

**File:** `lens.sideby.me/Dockerfile:20`

**Issue:** The Dockerfile has no `USER` directive, so the Node.js process and the headless Chromium it spawns both run as `root` inside the container. Chromium running as root requires `--no-sandbox` (already present in `capture.ts`), which disables the Chromium sandbox entirely. If a malicious page achieves a renderer exploit, there is no process-level containment — the attacker has root inside the container. This is the standard Docker + headless-browser attack surface; the fix is a non-root user combined with `--no-sandbox` only when strictly necessary.

**Fix:**
```dockerfile
RUN useradd -ms /bin/bash lensuser
USER lensuser
CMD ["node", "dist/index.js"]
```
Note: Chromium with a non-root user does not need `--no-sandbox`, so that flag can be removed from `capture.ts` args when running with this change.

---

## Info

### IN-01: `logYtdlpTelemetry` silently downgrades `error` level to `warn`

**File:** `lens.sideby.me/src/extraction/ytdlp.ts:20-23`

**Issue:** The `logYtdlpTelemetry` function's `error` branch calls `logWarn` instead of `logError` with a comment: "logError not imported — only info and warn are needed; fallback to warn for safety." This means if the function is ever called with `level: 'error'`, the log record is emitted at `warn` severity. No call site currently passes `'error'`, but the function signature accepts it, creating a silent downgrade trap for future callers.

**Fix:** Either remove `'error'` from the level union type, or import and use `logError`:
```typescript
// Option A: Restrict the type
function logYtdlpTelemetry(
  level: 'info' | 'warn',   // remove 'error'
  ...
```

---

### IN-02: CLAUDE.md describes dispatch as both "7-tier" and "6-tier"

**File:** `CLAUDE.md:71` and `CLAUDE.md` pipeline summary

**Issue:** Line 71 states "7-tier dispatch" and lists tiers A–G (which is indeed 7 tiers). The `## Architecture & Data Flow` pipeline summary on lines 76–78 labels tiers A through G correctly. However, the project's own memory notes and some docs refer to a "6-tier dispatch." The tier count in documentation is inconsistent across files. This is a low-severity doc quality issue but could confuse contributors about the actual dispatch logic.

**Fix:** Standardize on "7-tier" (A through G) throughout all documentation and memory notes, since the code in `dispatch.ts` implements tiers A–G.

---

### IN-03: `npm run build` step copies `src/` and `tests/` into the final image

**File:** `lens.sideby.me/Dockerfile:17-18`

**Issue:** Because there is no `.dockerignore` (see CR-02) and no multi-stage build, the final image contains the full TypeScript source (`src/`), test files (`tests/`), `tsconfig.json`, ESLint config, and development tooling (`tsx`, `vitest`, `typescript-eslint`) installed by `npm ci`. Only `dist/` and production `node_modules/` are needed at runtime. A multi-stage build would reduce image size and reduce the attack surface.

**Fix:**
```dockerfile
# Stage 1: build
FROM mcr.microsoft.com/playwright:v1.57.0-jammy AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: runtime
FROM mcr.microsoft.com/playwright:v1.57.0-jammy
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
RUN apt-get update && apt-get install -y curl ffmpeg && rm -rf /var/lib/apt/lists/*
ARG YTDLP_VERSION=2025.04.30
RUN curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_linux" \
    -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp
RUN npx patchright install chrome
COPY --from=builder /app/dist ./dist
CMD ["node", "dist/index.js"]
```

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
