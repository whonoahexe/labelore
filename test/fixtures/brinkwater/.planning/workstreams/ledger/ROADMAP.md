<!-- made-up example · derived from gsd-core/bin/lib/workstream.cjs · gsd-core 1.19.0 -->
# Roadmap: Brinkwater ledger

## Overview

The ledger workstream turns the stored readings into the figures the harbour office files: daily tide tables,
the monthly extremes, and the yearly comparison against the published almanac.

## Phases

- [x] **Phase 1: Reading Store** - keep every reading with its post and time
- [x] **Phase 2: Daily Tables** - one table of highs and lows per day
- [x] **Phase 3: Monthly Extremes** - the highest and lowest water of each month
- [x] **Phase 4: Tide Tables** - the printable table for the harbour office wall
- [ ] **Phase 5: Almanac Compare** - set the year against the published almanac
- [ ] **Phase 6: Filing Export** - the yearly figures as the filing format

## Phase Details

### Phase 4: Tide Tables

**Goal**: The harbour office can print one tide table for any month.
**Depends on**: Phase 3
**Requirements**: [LEDG-04]
**Success Criteria** (what must be TRUE):
  1. A month chosen on the board prints as one page with a high and a low for every day.
**Plans**: 6 plans

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Reading Store | 6/6 | Complete | 2026-08-02 |
| 2. Daily Tables | 5/5 | Complete | 2026-08-30 |
| 3. Monthly Extremes | 5/5 | Complete | 2026-09-21 |
| 4. Tide Tables | 6/6 | Complete | 2026-10-12 |
| 5. Almanac Compare | 0/0 | Not started | - |
| 6. Filing Export | 0/0 | Not started | - |
