---
status: complete
phase: 03-catalogue-browsing
source: [03-VERIFICATION.md]
started: 2026-02-24T00:00:00.000Z
updated: 2026-02-25T00:20:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. Search link / reload / back-button behaviour (D-01/D-02)
expected: Search the catalogue for "drill", open the first result, step back with the browser button, then reload the page. The results list returns with the same query and filters every time, and the address bar always holds a link you could paste to another member.
result: pass
note: "Passed after three deployed fixes: G-CAT-1 (blank-query route), G-CAT-2 (plus sign read twice), G-CAT-3 (shed-less filter). Checked on the live site for all four sheds."

### 2. Sort headers + "Show retired tools" switch (D-05/D-08)
expected: Click the Tool, Shed and Added headers to re-sort, then flip "Show retired tools". Each click flips direction; tools on loan stay grouped above tools on the shelf whatever the sort; retired tools are hidden until the switch is on, with no new request on either action.
result: pass

### 3. Place a hold, then try to hold a tool that is already out (D-10/D-11)
expected: Hold a tool that is on the shelf, then try to hold one that is out on loan. The shelf tool confirms with a hold number. The loaned tool shows a DISABLED Hold button, "Out until {date}.", and a copyable "{shed} / bay {n}" pickup line whose "Copy" button reads "Copied" for about 2 seconds.
result: pass
note: "Passed after G-CAT-4 (hold request blocked by the edge firewall) and G-CAT-5 (hold slip printed with no tool name). Live check: shelf tool holds and prints the right name; a tool out for two weeks shows the disabled button and the copyable pickup line."

### 4. Browsing a shed whose inventory feed is offline (D-15)
expected: Switch one shed's feed off, then open that shed from the shed picker. The picker's status dot never blocks the switch; the results pane shows "{Shed} is offline right now — retry." with a working Retry button.
result: pass
note: "First run failed (the pane said nothing matched). Fixed via G-CAT-6 (503 shed_offline carve-out). Second run, feed off for the east shed: the offline alert appeared and the server log shows 503s for that window."

### 5. Filter-chip row overflow on a narrow screen
expected: Open the catalogue with five filters applied on a narrow screen. The chip row scrolls sideways and the results below never move.
result: pass

### 6. Steward-only fields stay out of the member view
expected: As a plain member, confirm that replacement cost and supplier notes never show on a tool page, in the list, or in the page source, even for a tool you hold. This is the documented manual-only check in 03-VALIDATION.md (status: draft, not yet signed off).
result: pass
note: "Checked as a plain member: the feed rows hold no cost or supplier keys, the tool page template has no slot for them, and a search for the cost string in the page source finds nothing. The steward desk is the only reader."

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

- gap_id: G-CAT-1
  truth: "Opening /catalogue with no query lists the first page of tools"
  status: resolved
  resolved_at: 2026-02-24
  resolved_by: "Test 1 pass on the live site (all four sheds list)"
  reason: "User reported: 'We couldn't load these tools — try again.' on every shed. That is the list's notFound state, so the API answered 404 for the blank query."
  severity: blocker
  test: 1
  root_cause: "Only /api/tools/{shed}/{*query} exists, and the wildcard never matches an empty last segment. The client asked for the blank query as '_', and the proxy rewrote '/_' away, leaving /api/tools/{shed}/ with no matching route."
  artifacts:
    - path: "server/routes.ts:64"
      issue: "Only the wildcard route is registered; no shed-level route"
    - path: "web/lib/use-tools.ts:41"
      issue: "Blank query sent as '_', which the proxy strips before routing"
  missing:
    - "server: add a /api/tools/{shed} route that maps to the blank query"
    - "web: request the shed list without the trailing '_' when the query is empty"
  debug_session: ""
  fix_deployed: 2026-02-24
  fix: "Direct fix. server/routes.ts adds the shed-level route sharing a listTools() helper; web/lib/use-tools.ts drops the '_' for a blank query. A new request-level test drives the real router through fetch."

- gap_id: G-CAT-2
  truth: "Searching for a name with a plus sign finds the tool"
  status: resolved
  resolved_at: 2026-02-24
  resolved_by: "Test 1 pass on the live site (a tool named 'C+D saw' opens)"
  reason: "User reported: searching 'C+D saw' shows the empty-results text although the tool exists."
  severity: major
  test: 1
  root_cause: "The page decoded the query once and the hook encoded it with a form-style encoder, turning the plus into a space; the server then looked for 'C D saw'."
  artifacts:
    - path: "web/pages/catalogue.tsx"
      issue: "query read from the URL already decoded, then re-encoded with the form encoder"
  missing:
    - "web: encode the query with the component encoder at the single request site"
  debug_session: ""
  fix_deployed: 2026-02-24
  fix: "Direct fix. catalogue.tsx now passes the raw query to one component-encoding call; the server is unchanged."

- gap_id: G-CAT-3
  truth: "Clearing the shed filter lists tools from every shed"
  status: resolved
  resolved_at: 2026-02-24
  resolved_by: "Test 1 pass on the live site (all-sheds list shows 40 tools)"
  reason: "User reported: choosing 'Any shed' returns the empty-results text while each single shed works."
  severity: major
  test: 1
  root_cause: "Same blank-value problem as G-CAT-1, in the shed argument. The list helper sent an empty shed through as a literal blank segment, so the request read '/api/tools//drill'."
  artifacts:
    - path: "server/shed-scope.ts"
      issue: "empty shed passed through as a blank path segment instead of meaning 'all sheds'"
    - path: "server/list-tools.ts"
      issue: "builds the feed URL from shed + query verbatim"
  missing:
    - "server: treat a blank shed as the all-sheds scope; keep rejecting '..' and absolute values"
  debug_session: ""
  fix_deployed: 2026-02-24
  fix: "Direct fix. shed-scope.ts keeps only meaningful segments, so blank becomes the all-sheds scope. New unit test covers 'drill' with and without a shed."

- gap_id: G-CAT-4
  truth: "Pressing Hold creates a hold, or shows the 'Out until' line for a loaned tool"
  status: resolved
  resolved_at: 2026-02-24
  resolved_by: "Test 3 pass on the live site (hold works after the firewall rule change)"
  reason: "User reported: 'We couldn't place that hold — try again.' on two tools."
  severity: blocker
  test: 3
  root_cause: "Not a catalogue code bug. The hold request is a JSON POST from the web origin to the API origin, so browsers send an OPTIONS check first, and the edge firewall refused that check before it reached the server. Plain list reads skip the check, which is why they worked."
  artifacts:
    - path: "edge firewall rule (api origin)"
      issue: "no pass-through for cookie-less OPTIONS checks"
    - path: "web/components/hold-button.tsx:79"
      issue: "JSON POST forces the check; the failure is upstream"
  missing:
    - "infra: let OPTIONS requests through to the API origin, which already answers them"
  debug_session: ""
  fix_deployed: 2026-02-24
  fix: "Infra fix, no code change. The firewall rule now forwards OPTIONS to the origin, whose existing CORS layer answers. Confirmed from the host: the check returns 200 with the right allow-origin header. Remaining sub-issue split into G-CAT-5."

- gap_id: G-CAT-5
  truth: "A printed hold slip names the tool"
  status: resolved
  resolved_at: 2026-02-24
  resolved_by: "Test 3 pass on the live site (slip shows tool name)"
  reason: "User reported: the slip printed 'Hold 7f3a…' with no tool name."
  severity: major
  test: 3
  root_cause: "The slip response set the content type but no title header, and the slip URL deliberately carries no tool name, so the print dialog used the last URL segment, which is the opaque hold token."
  artifacts:
    - path: "server/slip.ts:161"
      issue: "slip response sends no title header"
  missing:
    - "server: send a Content-Disposition inline title built from the hold's stored tool name"
  debug_session: ""
  fix_deployed: 2026-02-24
  fix: "Direct fix. slip.ts builds the header from the stored name, with an ASCII fallback and an extended form for accents; control characters are stripped. A unit test covers spaces, an accented name and an injection attempt."

- gap_id: G-CAT-6
  truth: "Browsing an offline shed shows the '{Shed} is offline right now — retry' alert, not an empty-results state"
  status: resolved
  resolved_at: 2026-02-25
  resolved_by: "Test 4 pass on the live site; the server logged 503 shed_offline during the feed-off window."
  reason: "User switched the east shed's feed off and the pane showed the empty-results text instead of the offline alert."
  severity: major
  test: 4
  root_cause: "The browse path never checks feed liveness. A switched-off feed still answers with an empty list, so the list comes back 200 with no rows and the web app draws the empty state. The status check exists, but only the shed picker's dot uses it."
  artifacts:
    - path: "server/routes.ts"
      issue: "the list route reads the feed without first asking whether the shed is live"
    - path: "server/feed-reader.ts"
      issue: "an off feed returns [] for a shed that really is empty"
  missing:
    - "server: ask the status check first; when the feed is off answer 503 {error: shed_offline}. The web app already maps other statuses to 'offline', so no web change."
  design_note: "Needs a way to tell a switched-off feed from a quiet one without touching the test feeds; chosen: a 'managed' flag on real sheds only."
  debug_session: ""
  fix_deployed: 2026-02-24
  fix: "Direct fix, server only. routes.ts calls shedIsOffline() before listing and answers 503 for a managed shed with its feed off. Fails open if the status read errors. New test covers an off managed shed and a scratch shed that stays quiet."
