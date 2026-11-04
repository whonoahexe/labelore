<!-- made-up example · derived from gsd-core/templates/user-setup.md · gsd-core 1.19.0 -->
# Phase 4: User Setup Required

**Generated:** 2026-04-12
**Phase:** 04-bulk-loan-export
**Status:** Complete

Complete these items for the loan-note drafting assistant to function. Claude automated everything possible; these items require human access to external dashboards/accounts.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [x] | `LOANNOTE_MODEL_HOST` | Association model host → Settings → Endpoint address | `.env.local` |
| [x] | `LOANNOTE_MODEL_NAME` | Association model host → Models → Small → Model name | `.env.local` |
| [ ] | `LOANNOTE_MODEL_KEY=PLACEHOLDER-NOT-A-REAL-KEY` | Association model host → Settings → Access keys → Create key | `.env.local` |

## Account Setup

- [x] **Create an association model host account**
  - URL: https://llm.lendshed.example/register
  - Skip if: The steward lead already has a host login

## Dashboard Configuration

- [ ] **Allow the Lendshed server address**
  - URL: https://llm.lendshed.example/settings/allowed-callers
  - Location: Association model host → Settings → Allowed callers → Add address
  - Set to: The address of the shed server on the association network
  - Notes: Requests from any other address are refused with 403

- [ ] **Cap the monthly spend**
  - URL: https://llm.lendshed.example/settings/limits
  - Location: Association model host → Settings → Limits → Monthly cap
  - Set to: 5 units
  - Notes: One note per export is about 300 tokens, so the cap is far above need; it is a safety stop only

## Local Development

For local drafting without the real host, run the stub that ships with the repo:

```bash
npm run note-stub --prefix server
```

Point `LOANNOTE_MODEL_HOST` at `http://localhost:4318` while the stub runs.

## Verification

After completing setup:

```bash
# Draft a note for last month's batch
curl -X POST http://localhost:3000/api/exports/2026-03/note
```

Expected: a 200 response whose body holds three or four sentences, each figure equal to the month's batch totals.

---

**Once all items complete:** Mark status as "Complete" at top of file.
