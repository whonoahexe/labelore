---
title: "Steward Desk — next milestone brief"
date: "2026-03-26"
context: "/gsd-explore session; input for /gsd-new-milestone"
---

# Steward Desk — milestone brief

Captured from an exploration session on 2026-03-26. Inputs from the stewards are included.

## Features

1. **Member sign-in.** Members sign in with a one-time code mailed to them; sessions last a week and can be ended from any device. No sign-in exists today, only a shared tablet. Existing borrowers need a claim path for their old records. The stewards tidy the member list by hand before the milestone starts, so only real people remain.
2. **Roles.** Three roles — member, steward, lead — decide who can edit stock, move loans between sheds, or change roles. The lead assigns roles in the app; nobody edits them in the database. The kiosk keeps working with no sign-in, as a read-only counter. Roles must not depend on the sensor being present (open question: what a steward may do when a shed's sensor is offline).
3. **Account admin.** Stewards list, suspend and re-open accounts and see active sessions per member. Suspending takes effect on the next request, because members are lent expensive gear. Anything that deletes history stays out of reach.
4. **Bulk loan export.** Stewards pick a date range and sheds and get one bundle: loans, returns, damage notes and photos, each file listed with a checksum. The app writes **two verified copies** before it offers the bundle for download, because the shared folder is cleared every week.
   - **small** (CSV only, a few MB): loans and returns
   - **full** (CSV and photos): everything in range
   - **archive**: the bundle kept for about a month, then removed
   Full exports cannot be built on the kiosk: a busy month runs to several GB.
5. **Reminder reporting.** Overdue reminders get a delivery report on the desk screen; a reminder that failed shows as failed, not as sent (see the todo `overdue-reminders-not-reported-to-desk`).
6. **UI.** Reuse the evolved look from the catalogue app: dashboards and pages, strictly on the shared component kit.
7. **Bug fixes.** A small-screen sweep (issues to be found during the milestone), plus the vanished-sensor bug (todo `kiosk-detect-vanished-shed-sensor`).

## Loan facts (measured 2026-03-26)

Source: the March loan log, 1,284 loans across the four sheds, exported by hand.

| Shed | Loans | Photos | Average bundle |
|---|---|---|---|
| North | 412 | 1,870 | ~1.1 GB |
| Canal | 590 | 3,240 | ~2.4 GB |

- One month mixes small and large loans. A bundle forced to one format wastes space for some sheds, which matches the stewards' "the export is too big for email" report. Photo-only bundles are around 60% of a full one.
- A CSV-only export finishes in seconds, so only the photos need a progress bar.

## Desk facts (measured 2026-03-26)

- The desk tablet's Wi‑Fi dropped 41 times in a week (58 events on Mar 25) and rejoined at several speeds, with the router logging "weak signal, check placement". The tablet is currently tethered to a phone. This is the likely cause of the sign-in timeouts reported all month.
- The shed hub has a spare USB port, so a wired sensor dock is possible, but the stewards judged it too fiddly. A second tablet on the same network was discussed only as a fallback.
