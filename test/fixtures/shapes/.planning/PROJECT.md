# Kilnrow

## What This Is

A booking board for a shared pottery studio's kilns, reachable at `board.kilnrow.example`. Members book a
kiln slot, the studio lead approves glaze firings, and a calendar shows what is in each kiln. It replaces
a whiteboard by the studio door.

## Core Value

A member can see which kiln is free and book it without asking the studio lead to check the whiteboard.

## Current Milestone: v1.1 Firing Board

**Goal:** Bookings become a shared board, glaze recipes are kept in the app, and a firing calendar shows
every kiln at a glance.

## Constraints

- **Hosting**: One small server in the studio office, no cloud account.
- **People**: Two people, Ines Marlow (studio lead) and Bram Okoye (developer).

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Postgres over SQLite | Two writers (members booking and the tablet logging) at once from the start. | ✓ Good |
| Book by firing slot, not by shelf space (v0.1) | Slots were simple to explain to members. | ✗ Reversed — in v0.2 — shelf space was the real limit; bookings now count shelf units |
| Magic-link sign-in, no passwords | Members sign in a few times a month; nobody remembers a password that rarely. | ✓ Good |
| The kiln tech logs firings on the room tablet | The tech is at the kiln, not a desk. | ✓ Good — offline queue added in v0.2 |
| One queue for bisque and glaze (v0.1) | Fewer screens for the first release. | ✗ Reversed — glaze needs its own cone and atmosphere; split in v0.3 |
| Email for ready-to-collect, no push | No app install, and email is already paid for. | ⚠️ Revisit — members miss the emails; consider SMS |
| Every piece gets a photo at drop-off (v0.2) | Unlabelled pieces were the most common pickup mix-up. | ✓ Good |
| Rebook every piece on a failed firing automatically (v0.3) | A failed firing today means a dozen manual rebookings. | — Pending |
| Times shown in the studio time zone only | Everyone books in person or from nearby. | ✓ Good |
