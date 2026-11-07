---
phase: 01-cold-storage
plan: 01
subsystem: archive
tags: [rollup, storage]
requires: []
provides:
  - "archive/rollup: readings older than a year folded to hourly values"
affects: []
actuals:
  tokens: 9800
  tasks: 1
  commits: 1
key-decisions:
  - "Rolled-up hours keep the highest and lowest reading, never an average."
requirements-completed: []
status: complete
made_up_example: true
derived_from: gsd-core/bin/lib/workstream.cjs
gsd_core_version: 1.19.0
---

# Phase 1 Plan 1: Cold Storage Summary

**Readings older than a year folded to hourly highs and lows.**

## Accomplishments

- The rollup job and its first run over the oldest year.

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED
