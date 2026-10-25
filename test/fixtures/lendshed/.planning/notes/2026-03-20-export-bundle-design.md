---
title: Export bundle checksums — design decisions
date: 2026-03-20
context: /gsd-explore session, after v1.0 shipped and before the Steward Desk brief
---

# Export bundle checksums — design decisions

Explored 2026-03-20. Adds a content checksum to the desk's export bundle handoff, on top of
the session sign-in the Steward Desk milestone brings. Ships in the same patch set as the rest
of the milestone — not a separate phase, not a separate deploy.

## The mechanism

1. The API computes a checksum of the bundle while writing it to disk, in
   `POST /export/bundle/...` and `POST /export/send_to_desk/...` (`api/src/export/bundle.ts:211`,
   `:268`).
2. It stores that checksum in the `ExportJob` row next to the existing `bundle_path`.
   `ExportJob.params` is `JSON`, so this is a **zero-migration change** — no schema work, no
   migration file.
3. The desk gets it for free when it polls `GET /export/job`, which already returns
   `job.params` verbatim as `JobRequest.args`. No DTO change.
4. The desk sends it back on the fetch. The API compares before serving.
5. The desk re-checks the downloaded file before opening it.

Four small edits: two mint sites, one API comparison in `getBundle`
(`api/src/export/bundle.ts:187`), one desk comparison in `DeskClient.downloadFile`
(`web/lib/desk/client.ts:96`).

The desk check belongs **inside `downloadFile`**, not at the call sites — all seven
download call sites (`loans.getFromApi` plus the `returns`, `damage` and `photos`
flows) route through that one function, so one edit covers all of them.

## Decisions

**D-A — The checksum is checked against the file, not against the asking desk's own job.**
The API compares the supplied checksum to the checksum of the file at the given path, and
serves it if they match — regardless of which desk is asking. The alternative was a
job-scoped lookup (find the job addressed to *this* signed-in desk, require path and
checksum to match that row), which would have closed the missing-authorization gap
but needs the job id threaded through every call site.

**D-B — No new endpoint.** The checksum rides on the existing fetch, as a query parameter.

**D-C — Failed downloads stay out of this change.** A desk that cannot fetch or verify a
bundle still only logs locally. Reporting the failure back is its own piece of work.
