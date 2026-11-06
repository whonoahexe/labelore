---
made_up_example: true
derived_from: gsd-core/workflows/spike.md
gsd_core_version: 1.19.0
---
# Spike Conventions

Patterns and stack choices established across spike sessions. New spikes follow these unless the question requires otherwise.

## Stack

Shell scripts for anything that touches the host, Node for anything that needs the loan data shapes.

## Structure

One folder per spike, `NNN-name/`, with a `README.md`, the script that ran, and an `out/` folder for what it printed.

## Patterns

- Print one line per measurement so a result can be diffed.
- Name the idea key in the README frontmatter, never only in the manifest.

## Tools & Libraries

- `curl` for reader and download timings.
- Plain Node, no packages, for the queue check.
