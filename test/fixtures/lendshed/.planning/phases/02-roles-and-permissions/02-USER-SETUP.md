<!-- made-up example · derived from gsd-core/templates/user-setup.md · gsd-core 1.19.0 -->
# Phase 2: User Setup Required

**Generated:** 2026-03-29
**Phase:** 02-roles-and-permissions
**Status:** Incomplete

Complete these items for the steward grant notices to function. Claude automated everything possible; these items require human access to external dashboards/accounts.

## Environment Variables

| Status | Variable | Source | Add to |
|--------|----------|--------|--------|
| [ ] | `SHED_NOTICE_SENDER` | Association mail service → Senders → Verified address | `.env.local` |
| [ ] | `SHED_NOTICE_TOKEN` | Association mail service → Settings → API tokens → Create token | `.env.local` |

## Dashboard Configuration

- [ ] **Verify the sender address**
  - Location: Association mail service → Senders → Add sender
  - Set to: The steward desk address on `lendshed.example`
  - Notes: Verification mail goes to the steward lead

## Verification

After completing setup:

```bash
# Send a test notice to the steward desk
curl -X POST http://localhost:3000/api/desk/test-notice
```

Expected: a 202 response and one mail in the steward desk inbox.

---

**Once all items complete:** Mark status as "Complete" at top of file.
