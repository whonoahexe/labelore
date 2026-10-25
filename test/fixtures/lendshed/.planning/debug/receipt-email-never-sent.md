---
status: diagnosed
trigger: "Members who return a tool at the Elm Street shed get a loan-closed screen but never receive the receipt email. Reported twice in the first week of April."
created: 2026-04-08T00:00:00Z
updated: 2026-04-08T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED — the receipt job is queued with the member's display name in the address field, so the mail provider rejects it; the failure is swallowed by the queue worker. Secondary: a member with no saved email never gets a job at all, and nothing says so.
test: traced the return flow from the desk button to the mail provider call across the return handler, the queue worker and the provider client
expecting: a queued job whose recipient is not an address -> confirmed
next_action: report ROOT CAUSE FOUND (find_root_cause_only mode — no fix)

## Symptoms

expected: When a loan is closed at the desk, the member receives a receipt email within a minute.
actual: The desk shows "Loan closed" and the loan history updates, but no email arrives. The mail provider dashboard shows no sends for those loans.
errors: None reported
reproduction: Close any loan for a member who signed up through the kiosk. Test 4 in the steward UAT notes.
started: Receipt emails were added in phase 02 and have not been seen working since the kiosk sign-up change.

## Eliminated

- hypothesis: Suspect #3 — the mail provider throttles Lendshed after a burst of sends
  evidence: The provider dashboard shows 3 sends in the past week, far under any limit, and the account has no warnings. A throttled account would show rejected sends, not missing ones.
  timestamp: 2026-04-08

- hypothesis: Suspect #4 — the receipt template fails to render for loans with several tools
  evidence: The template renders for a six-tool loan in a local run and the output is complete HTML. The job never reaches the render step in production.
  timestamp: 2026-04-08

## Evidence

- timestamp: 2026-04-08
  checked: server/loans/return.ts closeLoan (lines 40-77) and the queue call at line 66
  found: closeLoan queues the receipt with `to: member.displayName` where the member record also carries `email`; the address field is filled from the wrong property.
  implication: The queued job carries a name such as "Ana R." as the recipient, which is not an address.

- timestamp: 2026-04-08
  checked: server/queue/worker.ts handler for the receipt job (lines 90-128)
  found: The handler wraps the provider call in a bare catch that logs at debug level and returns success, so a rejected send leaves the job marked done.
  implication: This ROOT CAUSE stays invisible: the job looks healthy in the queue and nothing raises an alert.

- timestamp: 2026-04-08
  checked: server/members/signup.ts and the kiosk sign-up form
  found: The kiosk form makes the email field optional, so members who sign up there can have an empty email. closeLoan skips the receipt when `email` is empty and writes no log line.
  implication: A second group of members never gets a job; the silence is by design but unannounced.

- timestamp: 2026-04-08
  checked: debug-level worker log for the Elm Street return on April 5
  found: One line, "provider rejected recipient", with the member's display name as the address.
  implication: The provider answered with a rejection, which ELIMINATES an outage on its side and fits the display-name theory exactly.

## Resolution

root_cause: |
  PRIMARY (unconditional, suspect #1): closeLoan in server/loans/return.ts builds the receipt job with `to: member.displayName` instead of `member.email`, so the mail provider rejects every receipt as having no valid recipient, and the queue worker's bare catch in server/queue/worker.ts hides the rejection and marks the job done.

  SECONDARY (order-dependent, suspect #2): members who signed up at the kiosk can have an empty email, and closeLoan silently skips the receipt for them without any log line, so the desk gives no hint that nothing was sent.

  Suspects #3 (provider throttling) and #4 (template failure) are refuted (see Eliminated): the dashboard shows no rejected sends from a limit and the template renders.
fix: |
  (not applied — find_root_cause_only mode)
  Direction: (1) In closeLoan, pass `member.email` as the recipient and keep the display name for the greeting only. (2) In the worker, rethrow provider rejections so the queue retries and then parks the job as failed. (3) For members with no email, log one line and show "No receipt sent (no email on file)" on the loan row.
verification: |
  (not applied — find_root_cause_only)
files_changed: []
