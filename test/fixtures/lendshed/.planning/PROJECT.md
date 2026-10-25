# Lendshed

## What This Is

A web app for a neighbourhood tool library, reachable at `app.lendshed.example`. Members borrow tools from
shared sheds, stewards keep each shed's inventory honest, and a loan can move from one shed to another.
It replaces a shared spreadsheet and a paper sign-out sheet.

## Core Value

A member can see what is on the shelf at every shed and borrow it without asking a steward to look it up.

## Current Milestone: v1.1 Steward Desk

**Goal:** Lendshed owns its own sign-in, stewards manage members and permissions in the app, and a steward
can export a month of loans as one file.

**Target features:**
- Member sign-in with a username and password Lendshed holds itself, replacing the shared kiosk passcode
- Two fixed roles (`steward` | `member`) with `lend` and `adjust` permissions granted per member, per shed
- Steward area: create members with a forced first sign-in password change, reset, disable, delete, see
  signed-in sessions, read the loan log
- Bulk loan export as a single file, capped at 5,000 loans

## Requirements

### Validated

- ✓ Live stock count for every shed in one view — v1.0
- ✓ Tool condition notes with a flag for tools that need repair — v1.0
- ✓ Browse the catalogue by shed and by category — v1.0
- ✓ Move a tool between sheds as a tracked transfer — v1.0

### Active

Scoped to v1.1 — see `.planning/REQUIREMENTS.md` for the full list of IDs.

- [ ] Members sign in with a username and password held by Lendshed
- [ ] Stewards control what each member may lend or adjust, per shed
- [ ] Stewards export a month of loans as one file

### Out of Scope

- **Payments and deposits** — the library is free; money handling is a different product.
- **Mobile app** — the web app is installable and that is enough for now.

## Constraints

- **Tech stack**: a small Node server with a SQLite file; one process, one machine.
- **Security**: as of v1.1 the server both signs members in and decides what they may do.
- **Hardware**: runs on a spare mini PC at the Elm Street shed; power cuts happen, so every write is durable.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite file over a hosted database | One machine, one writer, nothing to operate | ✓ Good |
| Shared kiosk passcode for v1.0 | Four stewards, no accounts needed yet | ✓ Good for v1.0 — superseded in v1.1 |
| v1.1: Lendshed owns sign-in | Per-member permissions need an identity the app holds | Pending |
| Transfers are tracked rows, not edits | A tool in transit must still be findable | ✓ Good |

---
*Last updated: 2026-04-09 after Phase 3 — Account Admin & Sessions*
