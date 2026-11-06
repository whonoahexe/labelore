---
made_up_example: true
derived_from: gsd-core/workflows/spike.md
gsd_core_version: 1.19.0
---
# Spike Manifest

## Ideas

### kiosk-handover

Decide how the shed kiosk hands a loan to the next member without a steward stepping in: how fast the badge
reader answers, and whether a loan recorded with no network survives until the link returns.

**Requirements:**

- Must show the borrower's name within a second of the badge touching the reader
- Must keep a loan recorded offline and replay it in order when the link returns

### export-staging

Decide where the loan export bundle sits between the moment a steward asks for it and the moment the desk
downloads it, and what the download is allowed to contain.

**Requirements:**

- Must keep a staged bundle for at most one day
- Must not stage a bundle larger than the 5,000-loan cap allows

## Spikes

| # | Idea | Name | Type | Validates | Verdict | Tags |
|---|------|------|------|-----------|---------|------|
| 003b | export-staging | local-disk-staging | comparison | Given a 5,000-loan export, when the bundle is staged on the API host, then the desk downloads it intact | VALIDATED | export, staging |
| 001 | kiosk-handover | badge-reader-latency | standard | Given a badge on the reader, when the kiosk looks the member up, then the name shows within a second | VALIDATED | kiosk, latency |
| 004 | export-staging | object-store-staging | standard | Given a staged bundle in an object store, when the desk asks for it, then a signed link downloads it | PARTIAL (resume untested) | export, staging |
| 002 | kiosk-handover | offline-ledger-queue | standard | Given no network, when three loans are recorded, then all three replay in order on reconnect | INVALIDATED (no spare test kiosk) | kiosk, offline |
