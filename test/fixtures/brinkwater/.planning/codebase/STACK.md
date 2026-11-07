---
last_mapped_commit: 7be03c91a4d2f85e60b1c97d3a42e08f15a6bd73
last_mapped_at: 2026-10-21
made_up_example: true
derived_from: gsd-core/templates/codebase/stack.md
gsd_core_version: 1.19.0
---
# Technology Stack

**Analysis Date:** 2026-10-21

## Languages

**Primary:**
- TypeScript 5.6 - the reading intake service in `intake/` and the board in `board/`

**Secondary:**
- SQL - the reading store migrations in `intake/store/migrations/`

## Runtime

**Environment:**
- Node.js 22

**Package Manager:**
- npm 10
- Lockfile: present

## Frameworks

**Core:**
- Hono 4 - the intake HTTP surface the posts report to

**Testing:**
- Vitest 4 - unit tests for the reading parser

## Key Dependencies

**Critical:**
- better-sqlite3 - the on-disk reading store

## Configuration

**Environment:**
- `.env` files are not committed; the gauge post list lives in `intake/posts.json`

*Stack analysis: 2026-10-21*
