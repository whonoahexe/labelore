<!-- made-up example · derived from gsd-core/bin/lib/workstream.cjs · gsd-core 1.19.0 -->
# Requirements: Brinkwater intake

**Defined:** 2026-10-20
**Core Value:** The harbour office can see the water height at every gauge post now, and trust that the number is current.

## v1 Requirements

### Feed

- [x] **FEED-01**: Every configured gauge post is polled once a minute.
- [x] **FEED-02**: Each reading is stored with its post and the time it was taken.

### Alerts

- [ ] **ALRT-01**: A post with no reading for ten minutes raises one alert to the harbour office.

## v2 Requirements

### Feed

- **FEED-03**: Readings older than a year are rolled up to hourly values.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Pushing alerts to a phone | The harbour office reads the board; a phone app is a later project. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FEED-01 | Phase 1 | Complete |
| FEED-02 | Phase 1 | Complete |
| ALRT-01 | Phase 2 | Pending |

**Coverage:**
- v1 requirements: 3 total
- Mapped to phases: 3
- Unmapped: 0
