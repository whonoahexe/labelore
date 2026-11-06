---
made_up_example: true
derived_from: gsd-core/workflows/spike.md
gsd_core_version: 1.19.0
spike: 003b
idea: export-staging
name: local-disk-staging
type: comparison
validates: "Given a 5,000-loan export, when the bundle is staged on the API host, then the desk downloads it intact"
verdict: PENDING (needs a recording)
related: [004]
tags: [export, staging]
---

# Spike 003b: Local Disk Staging

## What This Validates

Given a 5,000-loan export, when the bundle is staged on the API host's disk, then the desk downloads it intact.

## Research

| Approach | Tool | Pros | Cons | Status |
|----------|------|------|------|--------|
| Local disk | `tar` plus a sweep job | No new service | Lost if the host is replaced | Chosen for this spike |

## How to Run

```bash
bash make_bundle.sh 5000
```

## What to Expect

A bundle file appears in the staging folder and `out/bundle.log` records its size and checksum.

## Investigation Trail

First run staged 500 loans and the checksum matched. The second run used the full 5,000 and matched again.

## Results

Both runs matched, but the desk download was not recorded on video yet, so the verdict waits for that recording.

## Open Questions

- Does the sweep job remove a bundle that is still being downloaded?
