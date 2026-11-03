---
phase: 01
review: 01-REVIEW.md
titles: json
findings:
  - id: CR-01
    severity: critical
    disposition: open
    title: "Cookie signing falls back to a built-in secret when `SESSION_SECRET` is unset"
  - id: WR-01
    severity: warning
    disposition: open
    title: "Signing out leaves the session row valid until the nightly sweep"
  - id: IN-01
    severity: info
    disposition: open
    title: "Sign-in form does not return focus to the handle field after a failed attempt"
  - id: IN-02
    severity: info
    disposition: open
    title: "Sweep interval appears as a literal in two files"
  - id: IN-03
    severity: info
    disposition: open
    title: "Test helper `makeMember` shadows the exported fixture of the same name"
  - id: WR-02
    severity: warning
    disposition: open
    title: "Passcode attempts are not rate limited per handle (not in the current review)"
open: 6
total: 6
recorded: 2026-03-27T09:12:44.000Z
---

# Phase 01: Code Review Disposition

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| CR-01 | critical | open | 01-REVIEW.md |
| WR-01 | warning | open | 01-REVIEW.md |
| IN-01 | info | open | 01-REVIEW.md |
| IN-02 | info | open | 01-REVIEW.md |
| IN-03 | info | open | 01-REVIEW.md |
| WR-02 | warning | open | - |
