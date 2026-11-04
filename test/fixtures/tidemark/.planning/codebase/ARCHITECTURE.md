---
last_mapped_commit: c4e91ab7d03f58a2b6e1790d4c35fa80be127d69
last_mapped_at: 2026-10-30
made_up_example: true
derived_from: gsd-core/templates/codebase/architecture.md
gsd_core_version: 1.19.0
---
<!-- refreshed: 2026-10-30 -->
# Architecture

**Analysis Date:** 2026-10-30

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                       Berth board (browser)                  │
│                         `board/`                             │
└────────────────────────────┬────────────────────────────────┘
                             │ JSON over HTTP
                             ▼
┌──────────────────┬──────────────────┬───────────────────────┐
│   Berth routes   │  Office routes   │    Tide window job    │
│ `server/berths/` │ `server/office/` │    `server/tides/`    │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Slot store module                       │
│        `server/store/` over the file `data/tidemark.db`      │
└─────────────────────────────────────────────────────────────┘
## the three route groups above share one process
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Berth board | Shows free berths and the owner's own requests | `board/App.tsx` |
| Berth routes | Accept a request, list berths for a date range | `server/berths/routes.ts` |
| Office routes | Confirm, move or refuse a request | `server/office/routes.ts` |
| Tide window job | Turns the tide feed into usable windows per berth | `server/tides/refresh.ts` |
| Slot store | The only module that touches the database file | `server/store/index.ts` |

## Pattern Overview

**Overall:** Layered monolith with a thin browser client

**Key Characteristics:**
- One process serves the API and the built board
- Route groups never call each other; they share the slot store
- A berth is usable only inside a tide window, and the window is data, not code

## API Architecture

**Style:** JSON resources under `/api`, one router per resource group.

**Versioning:** None. The board and the server ship together.

**Authentication:** Owners sign in with an emailed code; the office uses a shared staff login.

## Data Flow

### Primary Request Path

1. The owner picks dates on the board (`board/RequestForm.tsx`)
2. The berth route parses the body and checks the tide window (`server/berths/routes.ts`)
3. The slot store writes a pending request (`server/store/index.ts`)
4. The board refetches the berth list and shows the request as pending (`board/useBerths.ts`)

### Tide Refresh

1. The scheduled job fetches the tide feed (`server/tides/refresh.ts`)
2. Each row is parsed and turned into a window per berth depth
3. The slot store replaces the windows for the next fourteen days

**State Management:**
- Server state lives in the database file; the board keeps only form state

## Key Abstractions

**Window:**
- Purpose: A span of time during which a berth of a given depth has enough water
- Examples: `server/tides/window.ts`
- Pattern: Plain value object, rebuilt on every refresh

## Entry Points

**Server:**
- Location: `server/main.ts`
- Triggers: `npm start`
- Responsibilities: Reads config, opens the store, mounts routes, starts the refresh job

**Board:**
- Location: `board/main.tsx`
- Triggers: Page load
- Responsibilities: Mounts the app and the query client

## Anti-Patterns

### Reading the database from a route

**What happens:** The office confirm route opens the database file directly to check a clash.
**Why it's wrong:** Two modules now know the table layout, and the clash rule exists twice.
**Do this instead:** Ask the slot store for the clash check (`server/store/clash.ts`).

### Hard-coded depth in the board

**What happens:** The board filters berths by a depth constant copied from the harbour chart.
**Why it's wrong:** A dredged berth keeps its old depth on screen until the next release.
**Do this instead:** Send the depth from the server with each berth (`server/berths/routes.ts`).

## Error Handling

**Strategy:** Routes throw typed errors; one handler turns them into JSON with a status code.

**Patterns:**
- Parse failures answer 400 with the first zod issue
- A clash answers 409 and names the berth

---

*Architecture analysis: 2026-10-30*
