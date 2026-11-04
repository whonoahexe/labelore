---
last_mapped_commit: c4e91ab7d03f58a2b6e1790d4c35fa80be127d69
last_mapped_at: 2026-10-28
made_up_example: true
derived_from: gsd-core/templates/codebase/stack.md
gsd_core_version: 1.19.0
---
# Technology Stack

**Analysis Date:** 2026-10-28

## Languages & Runtimes

**Primary:**
- TypeScript 5.6 - all server code in `server/` and all board code in `board/`

**Secondary:**
- SQL - the migration scripts in `server/store/migrations/`
- Shell - the harbour-office tide import in `scripts/`

**Runtime:**
- Node.js 22 - the only runtime, server and scripts alike

**Package Manager:**
- npm 10
- Lockfile: present

## Frameworks

**Core:**
- Express 5.1 - the berth API and the static host for the built board
- React 19 - the berth board in `board/`

**Testing:**
- Vitest 3.2 - unit and route tests
- Playwright 1.50 - the request-a-berth flow

**Build/Dev:**
- Vite 6 - board bundler and dev server
- tsx 4 - runs the server and scripts without a build step

## Key Dependencies

**Critical:**
- better-sqlite3 11 - the berth and booking store, opened once per process
- zod 3.24 - every request body and every tide feed row is parsed with it

**Infrastructure:**
- pino 9 - structured logs from the server
- node-cron 3 - the tide window refresh

## Configuration

**Environment:**
- Read once at start in `server/config.ts`
- Three variables are required, listed in the integrations document

**Build:**
- `vite.config.ts`
- `tsconfig.json` with two project references

## Platform Requirements

**Development:**
- Node.js 22 and npm 10 on any desktop

**Production:**
- One small virtual machine at the harbour office, behind a reverse proxy

---

*Stack analysis: 2026-10-28*
