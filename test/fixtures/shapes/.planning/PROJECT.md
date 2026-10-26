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
| Slots are one hour long | The kilns are loaded and unloaded by hand | Good |
| Glaze recipes are text, not images | Recipes get edited more often than photographed | Pending |
