---
status: complete
phase: 01-member-sign-in-sessions
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md, 01-VERIFICATION.md]
started: 2026-03-02T10:05:00Z
updated: "2026-03-02T08:41:00Z"
---

## Current Test

[testing complete]

## Tests

### 1. Restart with a clean slate

expected: Stop the `lendshed-api` service completely, then start it again. It comes up with no error,
the `0002_members_and_sessions.sql` migration applies (or is already applied) with nothing logged as
a failure, and an anonymous `GET /api/me` returns 401 `no session` — a live answer, not a refused
connection and not a 500.

result: pass
observed: |
  2026-03-02T07:50:12Z. Maya ran the stop and start by hand; the process id changed and the unit
  shows a fresh start.

  Start-up journal is clean, nothing at warning level or above:
    shed sync reconciliation complete resumed=0 stale=0
    ready on 127.0.0.1:9120
  The migration logged nothing (the already-applied path, which this test allows).

  Live answers from the fresh process, none a 500 or a refusal:
    GET  /api/me           → 401 no session
    POST /api/sign-in  (made-up handle) → 401
    GET  /api/tools/north  → 401

  Note: the restart was one quick command pair, so nobody watched the service while it was down.

### 2. A signed-in session survives pulling the plug

expected: Sign in, confirm the tool list shows, then cut power to the host at the wall (not `reboot`,
not a service stop). When it is back and `lendshed-api` is running, reload in the *same* browser
without clearing cookies. You land on the tool list still signed in, with your name in the top bar.
Being sent to `/sign-in` is a failure.

This is a different fault from what `session_restart.spec` covers: that test drops the connection
pool without a clean close, while a real power cut also loses writes the disk acknowledged but never
flushed. The database is opened in full-sync mode to make this hold, which is a statement about a setting, not something observed on hardware.

source: 01-01-SUMMARY.md D4 · 01-VERIFICATION.md manual item · SIGN-06
result: skipped
reason: |
  Waived by Maya on 2026-03-02, not observed. The plug was never pulled; host uptime proves it
  (`uptime -s` = 2026-02-10 09:14:02, unbroken). Only the service restarted, which is test 1.

  Accepted instead: the full-sync setting, plus `session_restart.spec` which proves survival of a
  dropped pool and a reopen. That covers a process dying without a clean close; it does not cover
  the disk losing acknowledged writes.

  So SIGN-06's power-cut case remains unwatched on purpose. If the promise ever has to be shown,
  not argued, repeat it with a real unplugged host.

### 3. Route table read as a checklist

expected: Go through `01-ROUTE-TABLE.md` row by row and decide whether each Gate verdict is what you
want in production, rather than just checking the table is self-consistent. `route_gate_coverage.spec` already proves the
path list equals the router's; it cannot decide whether `/api/sign-in` ought to be the sole
public route, whether `/live` and `/slip/{token}` being token-gated is intended, and whether the
three must-reset-exempt rows (`/api/sign-out`, `/api/reset-password`, `/api/me`, nothing else) are
the right way out, no wider.

source: 01-02-SUMMARY.md D9
result: pass
observed: |
  Maya's sign-off 2026-03-02, after checking the table against `buildRouter` in `server/app.ts`:

  - The 17 rows line up with the registered paths one for one.
  - `RESET_EXEMPT_PATHS` (`server/auth/index.ts:38`) holds three entries, the same three rows
    marked "Yes", nothing extra.

  - `/api/sign-in` is the one public route, inside the throttled `credential_routes` group.

  - `/live` and `/slip/{token}` take no member identity — correctly token-gated.

  Noticed during review and consciously let through, NOT recorded as a gap: the `AUTH_MODE=dev` check
  (`server/auth/index.ts:197`) only refuses to start on a non-loopback bind. This host binds
  `127.0.0.1:9120` behind a tunnel that connects over loopback, so putting `AUTH_MODE=dev` in `shed.env`
  would start quietly and satisfy every gated row by injected identity. Live behaviour is fine
  today: an anonymous `GET /api/me` returns 401, which the dev bypass would not give.

### 4. The sign-in gate resolves all three outcomes end to end

expected: On the running system, check that `gate.ts` routes every case to one destination, ahead of
any page markup:

1. No cookie → request `/tools` → redirected to `/sign-in`.
2. Valid cookie, member flagged `must_reset` → request `/tools` directly → redirected to
   `/reset-password`, never the tool list.

3. Valid cookie, unflagged member → request `/tools` → the actual page.
4. Valid cookie, API stopped → request `/tools` → redirected to `/sign-in` with the neutral
   connection notice, fail-closed. The app never renders.

Cases 1 and 4 got a quick check in 01-03 with the API stopped. Case 2 as a *direct* redirect has
not been observed; the earlier walkthrough got to the reset screen through the sign-in flow.

source: 01-03-SUMMARY.md D2 · SIGN-06
result: pass
scope: all four branches
observed: |
  Branches 1-3, Maya's sign-off 2026-03-02:

  - Branch 1 confirmed here: `GET https://lendshed.example/tools` → 307 → `/sign-in`.

  - Branches 2 and 3 attested against the live stack.

  Branch 4 seen in a real stopped-API window, matched by the unit journal:
    11:02:10  Stopping lendshed-api.service
    11:02:31  Started lendshed-api.service   (21s down)

### 5. The /sign-in screen holds up on a phone and in both themes

expected: Open `/sign-in` and check light, dark and 390px wide:

- It lands empty with no validation showing before you submit.
- A wrong password shows a single fixed alert, marks both inputs `aria-invalid`, empties the
  password, keeps the handle and returns focus. The text stays generic.

- Hit the throttle: the countdown ends at zero and is never *displayed* as zero.
- Arrive with the connection notice: it reads calm, not alarming.

source: 01-03-SUMMARY.md D4
result: pass
observed: |
  Ana's walkthrough 2026-03-02 covered both themes, 390px, the wrong-password flow and the
  countdown. Attested, not reproducible from this environment: the screen is served by the web host,
  so no server signal exists to back or contradict it.

### 6. The top bar degrades toward signed-out when the API is gone

expected: Sign in and see your name and a sign-out control. Stop the API with the page open and use
the app. The bar degrades *toward* signed-out — it does not keep claiming an identity it can no
longer confirm, crash, or hang on a spinner.

source: 01-03-SUMMARY.md D2 · SIGN-03
result: pass
observed: |
  Observed in the very stopped-API window that settled test 4's branch 4. Once `/api/me` stopped
  answering, the bar dropped back to signed-out with no crash and no spinner.

### 7. Client address header reaches the origin through the tunnel (OPEN-02)

expected: The edge sets the client-address header and it survives the tunnel carrying the real
address, so the throttle's address axis uses a genuine value.

result: pass
source: automated
coverage_id: 01-02 D7
resolved_by: 01-03-SUMMARY.md D4 — throttle-as-oracle, 2026-03-02. The address bucket for this host
was exhausted through direct `127.0.0.1:9120` calls carrying an explicit header (8 admitted, then
429); a later call *via the tunnel* using a new handle answered 429 + `retry-after: 31`.
caveat: With no header the extractor uses the socket address, which behind a tunnel is always
`127.0.0.1`, so a lost header would silently put every caller in one bucket.

## Summary

total: 7
passed: 6
issues: 0
pending: 0
skipped: 1
blocked: 0

## Gaps

<!-- No gaps: no test reported an issue. The single skip is a logged deferral and
     carries its own `reason` block; it is not a failure. -->

## Notes

**Fault cases nobody has watched, carried out of this phase.** One is left. Nothing broke; it simply
has not been seen.

| Item | What would close it |
|------|---------------------|
| Test 2 — SIGN-06 power-cut case | A pulled plug with a signed-in session live |

Settled in this session: test 4 branch 4 and test 6 were both watched during a single 21-second
API outage, 11:02:10–11:02:31.

**Settled during this session.** Test 7 (01-02 D7 / OPEN-02) passed automatically without being
shown to anyone: the throttle-as-oracle result in 01-03 D4 had answered it.
