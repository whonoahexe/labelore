---
last_mapped_commit: c4e91ab7d03f58a2b6e1790d4c35fa80be127d69
last_mapped_at: 2026-10-28
made_up_example: true
derived_from: agents/gsd-codebase-mapper.md
gsd_core_version: 1.19.0
---
# Testing Patterns

**Analysis Date:** 2026-10-28

## Test Framework

**Runner:**
- Vitest 3.2
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest built-ins

**Run Commands:**
```bash
# Run every unit and route test once
npm test
# Watch mode while editing
npm run test:watch
# Coverage report
npm run test:coverage
```

## Test File Organization

**Location:**
- Co-located with the module under test

**Naming:**
- `{module}.test.ts` and `{Component}.test.tsx`

**Structure:**
```
server/store/
├── clash.ts
└── clash.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
describe('findClash', () => {
  it('reports two requests that share a berth and a night', () => {
    expect(findClash(first, second)).toEqual({ berth: 'B4' });
  });
});
```

**Patterns:**
- Build the store in memory in a `beforeEach`
- Close it in an `afterEach`
- One behaviour per `it`

## Mocking

**Framework:** Vitest `vi`

**Patterns:**
```typescript
vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(feedBody));
```

**What to Mock:**
- The tide feed and the mail relay

**What NOT to Mock:**
- The slot store; use an in-memory database instead

## Fixtures and Factories

**Test Data:**
```typescript
const request = makeRequest({ berth: 'B4', nights: 2 });
```

**Location:**
- `server/testing/factories.ts`

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
npm run test:coverage
```

## Test Types

**Unit Tests:**
- Window building and the clash rule

**Integration Tests:**
- Route tests against an in-memory store

**E2E Tests:**
- Playwright, one spec for the request flow

---

*Testing analysis: 2026-10-28*
