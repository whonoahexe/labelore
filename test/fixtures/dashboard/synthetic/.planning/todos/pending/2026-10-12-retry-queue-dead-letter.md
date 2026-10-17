---
created: 2026-10-12T09:41:00Z
title: Move filings that fail five retries into a dead-letter view brokers can see
area: gateway
severity: major
files:
  - src/gateway/retry-queue.ts:88-140
  - src/web/pages/filings.tsx
---

## Problem

After five failed retries a filing just stops. Nothing tells the broker.

## Solution

A dead-letter list on the filings page with the last gateway response.
