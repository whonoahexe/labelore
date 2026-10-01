---
status: testing
phase: 03-file-browsing
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-VERIFICATION.md]
started: 2026-07-21T09:12:00Z
updated: 2026-07-21T10:47:31Z
---

<!-- SYNTHETIC: built by sketch 015 from the UAT template, with wording adapted from
     studio-portal v1.0/03-UAT.md, so the in-progress state can be judged. Not a real file. -->

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 5
name: Browsing a genuinely unreachable tier
expected: |
  Unplug the Vault drive (or stop its mount), then open /browse/vault. The pane shows
  "Vault is unreachable right now — retry." with a Retry button, the tier switcher stays
  usable, and the dot beside Vault turns muted grey, not red. Plug it back in and press
  Retry: the listing returns without a page reload.
awaiting: user response

## Tests

### 1. Deep-link / refresh / back-button navigation (D-01/D-02)
expected: Open /browse/stage/projects/2026, refresh, then use Back twice. Each step lands on the same folder it showed before, the breadcrumb matches the URL, and the tier switcher keeps Stage selected.
result: issue
reported: "Refresh works but Back from a subfolder jumps straight to /browse, skipping the parent folder"
severity: major

### 2. Sort-header clicks + "Show hidden files" toggle (D-05/D-08)
expected: Click Name, Size and Modified headers in turn; folders stay first and the arrow shows the direction. Toggle "Show hidden files" and dotfiles appear without the scroll position jumping.
result: issue
reported: "the size column sorts 1.2 GB below 900 MB"
severity: minor

### 3. Real end-to-end download + oversized LAN-path handoff (D-10/D-11)
expected: Download a 40 MB file from Stage and confirm the checksum. Then select a 120 GB file: Download is disabled with "Too large for the portal — 120 GB." and a copyable LAN path.
result: blocked
blocked_by: third-party
reason: "Cloudflare tunnel is rate-limiting large downloads this morning; retry after the window resets"

### 4. Cloud listing timeout (D-14)
expected: With the rclone remote throttled to 1 KB/s, open /browse/cloud. After 10 s the pane shows "Cloud listing timed out — retry." and Retry re-attempts without a reload.
result: skipped
reason: "No throttling proxy set up on this host yet"

### 5. Browsing a genuinely unreachable tier
expected: The pane shows the unreachable copy with Retry, the switcher stays usable, the dot turns muted grey, and Retry recovers once the drive is back.
result: [pending]

### 6. 10,000-entry folder scroll performance (D-07)
expected: Open the archive folder with 10,000 entries. Scrolling stays smooth at 60 fps and the row count matches `ls | wc -l`.
result: [pending]

### 7. Copy SMB path affordance (D-11)
expected: Click "Copy path" beside an oversized file; the label swaps to "Copied" for ~2 s and the clipboard holds the full \\cinedise path.
result: [pending]

## Summary

total: 7
passed: 0
issues: 2
pending: 3
skipped: 1
blocked: 1

## Gaps

- truth: "Back from a subfolder returns to the parent folder, not the tier root"
  status: failed
  reason: "User reported: Refresh works but Back from a subfolder jumps straight to /browse, skipping the parent folder"
  severity: major
  test: 1
  root_cause: "browse-pane.tsx navigates with router.replace() on folder open, so each drill-down overwrites the history entry instead of pushing a new one"
  artifacts:
    - path: "frontend/components/browse-pane.tsx"
      issue: "line 88 uses router.replace for folder navigation"
    - path: "frontend/lib/use-browse.ts"
      issue: "openFolder() mirrors the replace call into the query cache key"
  missing:
    - "Use router.push for folder navigation; keep replace only for sort/hidden-toggle query changes"
    - "Add an e2e step: drill two levels, Back twice, assert each parent"
  debug_session: ".planning/debug/back-skips-parent.md"
- truth: "Sorting by Size orders files by byte size"
  status: failed
  reason: "User reported: the size column sorts 1.2 GB below 900 MB"
  severity: minor
  test: 2
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
