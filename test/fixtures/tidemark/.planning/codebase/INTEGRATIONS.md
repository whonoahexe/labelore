---
last_mapped_commit: c4e91ab7d03f58a2b6e1790d4c35fa80be127d69
last_mapped_at: 2026-10-28
made_up_example: true
derived_from: agents/gsd-codebase-mapper.md
gsd_core_version: 1.19.0
---
# External Integrations

**Analysis Date:** 2026-10-28

## APIs & External Services

**Tide data:**
- Coastal tide feed - hourly water heights for the harbour mouth
  - SDK/Client: none, plain `fetch` in `server/tides/feed.ts`
  - Auth: `TIDEMARK_TIDE_FEED_KEY`

**Messaging:**
- Mail relay - emailed sign-in codes and confirmation notes
  - SDK/Client: `nodemailer` 6
  - Auth: `TIDEMARK_MAIL_TOKEN`

## Data Storage

**Databases:**
- SQLite file `data/tidemark.db`
  - Connection: `TIDEMARK_DB_PATH`
  - Client: `better-sqlite3`

**File Storage:**
- Local filesystem only

**Caching:**
- None

## Environment Configuration

**Required env vars:**
- `TIDEMARK_TIDE_FEED_KEY=PLACEHOLDER-NOT-A-REAL-KEY`
- `TIDEMARK_MAIL_TOKEN`
- `TIDEMARK_DB_PATH`

**Secrets location:**
- A `.env` file on the harbour office machine, outside the repository

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- Confirmation mail to the owner when the office confirms a request

---

*Integration audit: 2026-10-28*
