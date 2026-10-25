---
date: "2026-03-24 10:15"
promoted: true
---

Raise the single-export size cap to match the bundle cap. Today MAX_EXPORT_BYTES defaults to 250 MiB (api/src/limits.ts:44) while MAX_BUNDLE_BYTES is 120 GiB, so one large export (say a 9 GB photo archive) is turned away with the shared-folder dialog even though picking its parent shed exports it through a staged bundle. The cap blocks nothing, it only forces the slower route. Wanted: single-export default = 120 GiB (same as the bundle), replace the limits test export_bytes_defaults_to_250_mib and drop bundle_bytes_and_export_bytes_are_distinct_caps; raise EXPORT_STREAM_DEADLINE (export/stream.ts:61, 300s) so large cold-storage exports are not cut off mid-stream. Known gap: direct-export tickets are single-use, so a dropped multi-GB export cannot resume (bundle exports can) — consider re-mint or resume for direct exports.
