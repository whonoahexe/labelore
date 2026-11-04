<!-- made-up example · derived from agents/gsd-codebase-mapper.md · gsd-core 1.19.0 -->
# Coding Conventions

**Analysis Date:** 2026-10-27

## Naming Patterns

**Files:**
- Server modules are lower-case, one noun per file (`clash.ts`, `window.ts`)
- Board components live in a PascalCase folder with an `index.tsx`

**Functions:**
- camelCase, verb first (`buildWindow`, `findClash`)

**Variables:**
- camelCase; constants in SCREAMING_SNAKE_CASE only at module top level

**Types:**
- PascalCase, no `I` prefix

## Code Style

**Formatting:**
- Prettier 3, default settings plus single quotes
- Two-space indent

**Linting:**
- ESLint 9 with the recommended TypeScript rules
- No unused exports outside `index.ts` files

## Import Organization

**Order:**
1. Node built-ins
2. Packages
3. Project modules by relative path

**Path Aliases:**
- None

## Error Handling

**Patterns:**
- Routes throw a `HarbourError` with a status code
- Never swallow an error in the store; let it reach the route handler

## Logging

**Framework:** pino

**Patterns:**
- One info line per request, one warn line per refused request
- Never log an owner's email address

## Comments

**When to Comment:**
- Say why a tide rule exists, not what the line does

**JSDoc/TSDoc:**
- Only on exports used across route groups

## Function Design

**Size:** Short enough to read without scrolling

**Parameters:** One options object after the second positional argument

**Return Values:** Plain values; failures are thrown, not returned

## Module Design

**Exports:** Named exports only

**Barrel Files:** One `index.ts` per route group, nowhere else

---

*Last updated: 2026-10-27*
