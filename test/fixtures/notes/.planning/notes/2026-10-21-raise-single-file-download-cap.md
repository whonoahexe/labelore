---
date: "2026-10-21 03:38"
promoted: true
---

Raise the single-file download cap to match the archive cap. Today MAX_DOWNLOAD_BYTES defaults to 500 MiB (backend/src/config.rs:121) while MAX_ARCHIVE_BYTES is 400 GiB, so a single large file (e.g. 15 GB) is refused with the SMB path dialog even though selecting its parent folder downloads it via a staged archive. The cap blocks nothing, it just forces the slower route. Wanted: single-file default = 400 GiB (same as archive), replace config test max_download_bytes_defaults_to_500_mib and drop max_archive_bytes_and_max_download_bytes_are_distinct_caps; raise CLOUD_DOWNLOAD_STREAM_DEADLINE (download/mod.rs:75, 600s) so large cloud-tier files aren't killed mid-stream. Known gap: direct-download tickets are single-use, so a dropped multi-GB download can't resume (archive downloads can) — consider re-mint/resume for direct downloads.
