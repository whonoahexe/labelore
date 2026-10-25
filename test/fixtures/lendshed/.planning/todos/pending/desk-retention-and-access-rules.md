---
title: Two desk-side gaps on GET /export/bundle — retention and access
date: 2026-03-21
priority: high
---

# Two desk-side gaps on `GET /export/bundle`

Found during the 2026-03-20 `/gsd-explore` session. Both are outside the scope of the
bundle checksum change — see [[2026-03-20-export-bundle-design]] (D-A).

Neither was part of the milestone's original sign-in finding, and the Phase 1 sign-in work
closes neither.

## 1. Finished bundles are never deleted

Every export is streamed into a temp file under the API's `/var/tmp`
(`api/src/export/bundle.ts:211`, `:268`) and nothing removes it; the only `unlink` in that
file (line 340) belongs to the saved-exports `DELETE` handler. Each bundle stays fetchable
through `GET /export/bundle` for good, and it holds member loan history.

The desk deletes its own copy after every download. The API has no matching cleanup and no
retention job.

Worth deciding: delete on fetch, or age out on a timer? Delete-on-fetch is tighter but
interacts with the missing retry story ([[overdue-reminders-not-reported-to-desk]]) — a retried
fetch needs the file to still be there.

## 2. The endpoint signs in but does not check access

`getBundle` (`export/bundle.ts:187`) accepts a `desk` session and then **never uses it**. It
proves *a* valid desk is calling, not that this is the desk the bundle was addressed to.

The `ExportJob` row records the intended desk, yet the download path never reads it. So any
signed-in desk that learns or guesses another shed's path can pull that shed's export, and with
gap 1 the set of valid paths only grows.

The checksum raises the bar as a side effect, not as a control. The structural fix is a
job-scoped lookup: require an `ExportJob` for this desk and this path before serving.
