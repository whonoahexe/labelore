---
made_up_example: true
derived_from: gsd-core/workflows/spike.md
gsd_core_version: 1.19.0
spike: 004
idea: export-staging
name: object-store-staging
type: standard
validates: "Given a staged bundle in an object store, when the desk asks for it, then a signed link downloads it"
verdict: PARTIAL: resume untested
related: [003b]
tags: [export, staging]
---

# Spike 004: Object Store Staging

## What This Validates

Given a staged bundle in an object store, when the desk asks for it, then a signed link downloads it.

## Research

A signed link expires on its own, which fits the one-day limit for a staged bundle.

## How to Run

Upload the bundle, ask for a link, download through the link.

## What to Expect

The downloaded file matches the uploaded one byte for byte.

## Investigation Trail

A small bundle and a full 5,000-loan bundle both downloaded intact. A download that is cut off and resumed was not tried.

## Results

Partly validated. Downloading works; resuming a cut-off download is untested.
