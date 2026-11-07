<!-- made-up example · derived from gsd-core/bin/lib/workstream.cjs · gsd-core 1.19.0 -->
# Roadmap: Brinkwater intake

## Overview

The intake workstream carries a reading from a gauge post to the store: the feed that polls the posts, then
the alerts that fire when a post goes quiet.

## Phases

- [x] **Phase 1: Sensor Feed** - poll every gauge post and store each reading
- [ ] **Phase 2: Feed Alerts** - tell the harbour office when a post stops reporting

## Phase Details

### Phase 1: Sensor Feed

**Goal**: Every gauge post is polled once a minute and each reading is stored with its post and time.
**Depends on**: Nothing (first phase)
**Requirements**: [FEED-01, FEED-02]
**Success Criteria** (what must be TRUE):
  1. A reading from each configured post is stored within two minutes of the poll.
  2. A post that answers badly is skipped and the next post is still polled.
**Plans**: 1 plan

### Phase 2: Feed Alerts

**Goal**: The harbour office hears about a silent post without watching the board.
**Depends on**: Phase 1
**Requirements**: [ALRT-01]
**Success Criteria** (what must be TRUE):
  1. A post with no reading for ten minutes raises one alert.
**Plans**: 1 plan

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Sensor Feed | 1/1 | Complete | 2026-10-24 |
| 2. Feed Alerts | 0/1 | Not started | - |
