<!-- made-up example · derived from gsd-core/bin/lib/workstream.cjs · gsd-core 1.19.0 -->
# Requirements: Brinkwater ledger

**Defined:** 2026-07-20
**Core Value:** The harbour office can see the water height at every gauge post now, and trust that the number is current.

## v1 Requirements

### Tables

- [x] **LEDG-01**: Every reading is kept with its post and the time it was taken.
- [x] **LEDG-02**: A table of highs and lows is built for each day.
- [x] **LEDG-03**: The highest and lowest water of each month is listed.
- [x] **LEDG-04**: A chosen month prints as one page.

### Filing

- [ ] **LEDG-05**: The year is compared against the published almanac.
- [ ] **LEDG-06**: The yearly figures export in the filing format.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Forecasting future tides | The almanac publishes predictions; this project only records. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LEDG-01 | Phase 1 | Complete |
| LEDG-02 | Phase 2 | Complete |
| LEDG-03 | Phase 3 | Complete |
| LEDG-04 | Phase 4 | Complete |
| LEDG-05 | Phase 5 | Pending |
| LEDG-06 | Phase 6 | Pending |
