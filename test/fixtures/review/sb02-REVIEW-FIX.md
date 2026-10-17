---
phase: 02-container-docs
fixed_at: 2026-05-13T00:00:00Z
review_path: .planning/phases/02-container-docs/02-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 4
skipped: 3
status: partial
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-05-13
**Source review:** `.planning/phases/02-container-docs/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (CR-01, CR-02, CR-03, WR-01, WR-02, WR-03, WR-04)
- Fixed: 4 (CR-03, CR-02, CR-01, WR-01)
- Skipped: 3 (WR-02, WR-03, WR-04) — intentionally deferred per project decisions

## Fixed Issues

### CR-03: `curl` not guaranteed present in base image

**Files modified:** `lens.sideby.me/Dockerfile`
**Commit:** d1c6017
**Applied fix:** Changed `apt-get install -y ffmpeg` to `apt-get install -y curl ffmpeg` on line 10. curl is now an explicit declared dependency in the same RUN layer, not an undocumented assumption about the base image.

---

### CR-02: No `.dockerignore` — secrets and artifacts copied into image

**Files modified:** `lens.sideby.me/.dockerignore` (created)
**Commit:** 77a459a
**Applied fix:** Created `.dockerignore` excluding `.env`, `.env.local`, `.env*.local`, `node_modules/`, `dist/`, `*.log`, `.git/`, and `coverage/`. This prevents `.env.local` (containing `LENS_SHARED_SECRET`, `CF_API_TOKEN`, etc.) from being baked into image layers on local developer builds.

---

### CR-01: patchright version (1.57.0) mismatched against Playwright base image (v1.49.0)

**Files modified:** `lens.sideby.me/Dockerfile`
**Commit:** fea7e47
**Applied fix:** Updated base image from `mcr.microsoft.com/playwright:v1.49.0-jammy` to `mcr.microsoft.com/playwright:v1.57.0-jammy`. Verified against `package-lock.json` which resolves `node_modules/patchright` to exactly `1.57.0` — the base image now matches the locked patchright version.

---

### WR-01: yt-dlp `--no-simulate` contradicts `--dump-json` — triggers full stream probe

**Files modified:** `lens.sideby.me/src/extraction/ytdlp.ts`
**Commit:** 9896b11
**Applied fix:** Removed `'--no-simulate'` from the yt-dlp args array (was at line 76). `--dump-json` alone runs yt-dlp in simulate mode, fetching only metadata. With `--no-simulate` present, yt-dlp performed full stream probing (manifests, segment resolution) before printing JSON, consuming unnecessary network budget against the 8-second `LENS_YTDLP_TIMEOUT_MS` limit. TypeScript typecheck passed after the change.

---

## Skipped Issues

### WR-02: yt-dlp binary pinned to a nightly build tag

**File:** `lens.sideby.me/Dockerfile:12`
**Reason:** Intentionally skipped — accepted project risk. The project research phase (STATE.md) explicitly decided "Pin to nightly builds (not stable) — stable channel is stale per official docs." Switching to stable would contradict the documented architectural decision. The supply-chain fragility concern is acknowledged but deferred to a future phase (e.g., periodic pin-bump automation or a build-time fallback).
**Original issue:** Nightly release artifacts on GitHub are periodically pruned; the tag `2026.05.05.233942` may be deleted in a future GitHub Actions cleanup run, breaking future builds.

---

### WR-03: `PLAYWRIGHT_BROWSERS_PATH` env var causes patchright to install into shared Playwright directory

**File:** `lens.sideby.me/Dockerfile:3`
**Reason:** Pre-existing behavior from before Phase 2. Phase 2 only added the yt-dlp + ffmpeg layers; `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` was established in Phase 1. Changing this env var risks breaking the existing patchright browser launch without a coordinated test of the browser launch path. Deferred to a future phase with dedicated browser-path testing scope.
**Original issue:** Patchright installs into the same `/ms-playwright` directory as the Playwright base image, risking binary conflicts on version mismatch.

---

### WR-04: Container runs as root — no `USER` directive

**File:** `lens.sideby.me/Dockerfile:20`
**Reason:** Out of scope for Phase 2. Adding a non-root user requires removing `--no-sandbox` from `capture.ts` (Chromium with a non-root user does not need it), which is a coordinated multi-file change across the container and application layer. This is a meaningful security hardening task that warrants its own phase with full testing of the browser launch behavior under a non-root user.
**Original issue:** Node.js and headless Chromium both run as root, requiring `--no-sandbox` which disables the Chromium sandbox entirely.

---

_Fixed: 2026-05-13_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
