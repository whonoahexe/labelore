---
last_mapped_commit: c4e91ab7d03f58a2b6e1790d4c35fa80be127d69
last_mapped_at: 2026-10-30
made_up_example: true
derived_from: agents/gsd-codebase-mapper.md
gsd_core_version: 1.19.0
---
# Codebase Structure

**Analysis Date:** 2026-10-30

## Directory Layout

```
tidemark/
├── board/                  # Browser client
│   ├── components/         # Presentational pieces
│   │   ├── BerthCard/      # One berth and its windows
│   │   │   ├── index.tsx   # The card
│   │   │   └── window.css  # Window strip styling
│   │   └── RequestForm/    # Dates and boat details
│   ├── App.tsx             # Page shell
│   └── main.tsx            # Mount point
├── server/                 # API and jobs
│   ├── berths/             # Owner-facing routes
│   ├── office/             # Harbour-office routes
│   ├── tides/              # Feed fetch and window building
│   ├── store/              # The only database module
│   └── main.ts             # Process entry
├── scripts/                # One-off imports
└── package.json            # Scripts and dependencies
```

## Directory Purposes

**board/:**
- Purpose: Everything that runs in the browser
- Contains: React components, hooks, styles
- Key files: `board/App.tsx`, `board/useBerths.ts`

**server/store/:**
- Purpose: Database access and migrations
- Contains: One module, a clash check, SQL files
- Key files: `server/store/index.ts`, `server/store/clash.ts`

**server/tides/:**
- Purpose: Turn the tide feed into usable windows
- Contains: Feed client, window builder, scheduled job
- Key files: `server/tides/refresh.ts`, `server/tides/window.ts`

## Key File Locations

**Entry Points:**
- `server/main.ts`: Starts the process
- `board/main.tsx`: Mounts the board

**Configuration:**
- `server/config.ts`: Reads and checks the environment
- `vite.config.ts`: Board bundler settings

**Core Logic:**
- `server/store/clash.ts`: Decides whether two requests overlap
- `server/tides/window.ts`: Builds a window from feed rows

**Testing:**
- `server/store/clash.test.ts`: The overlap rules
- `e2e/request-berth.spec.ts`: The request flow in a browser

## Naming Conventions

**Files:**
- Components: PascalCase folder with an `index.tsx`
- Server modules: lower-case, one noun per file

**Directories:**
- One folder per resource group on the server

## Where to Add New Code

**New route group:**
- Primary code: `server/{group}/routes.ts`
- Tests: `server/{group}/routes.test.ts`

**New board component:**
- Primary code: `board/components/{Name}/index.tsx`
- Tests: `board/components/{Name}/{Name}.test.tsx`

**New scheduled job:**
- Primary code: `server/{job}/job.ts`
- Tests: `server/{job}/job.test.ts`

## Special Directories

**data/:**
- Purpose: Holds the SQLite file
- Generated: Yes
- Committed: No

**dist/:**
- Purpose: Built board served by the server
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-10-30*
