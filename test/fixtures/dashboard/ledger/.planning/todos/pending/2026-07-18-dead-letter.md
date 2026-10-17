---
created: 2026-07-18T09:00:00Z
title: Show filings that fail five retries in a dead-letter view
area: gateway
severity: major
files:
  - src/gateway/retry.ts:88-140
  - src/web/filings.tsx
---

## Problem

After five failed retries a filing just stops.
