// Hand-written synthetic research files (quick-261024-k8u) for a made-up project, Lendshed (the tool
// library in test/fixtures/lendshed). They reproduce the shapes a project's `.planning/research/`
// drifts into, so the drift is pinned here without reading any real project. Every name, number and
// phrase in them is invented. Labelore's own files are read from disk by the tests that want the
// template shape.

export const DRIFT_SUMMARY = `# Project Research Summary

**Project:** Lendshed, milestone v2.0 Vault Ingest
**Domain:** Loan ledger ingest and review
**Researched:** 2026-07-30
**Confidence:** MEDIUM-HIGH (several primary sources)

## Executive Summary

The vault ingest rebuild is a streaming pipeline: read once, tee to the hasher and the writer, then fsync before anything is acknowledged. Everything else hangs off that single rule.

A second paragraph about risk.

## Key Findings

### Recommended Stack

Rust with axum, because the existing portal already runs there.

### Architecture Approach

One executor owns every write to the vault.

## Implications for Roadmap

**Entry gate (before any phase writes to the vault): the vault is mounted read-write; a backup exists.**

A plain paragraph that explains the suggested order in one go.

### Phase 1: Foundations

**Rationale:** Nothing else can start without the schema.
**Delivers:** \`IngestExecutor\` (single read, tee, hash); manifest schema; the \`fsync\` barrier (data and directory)
**Avoids:** Pitfall 17.
**Research flags:** None required - standard patterns.

### Phase 2: Ingest (parallel with Phase 1)

**Rationale:** The executor only needs the schema's types.
**Delivers:**
- Streaming upload
- Resume tokens
- Duplicate detection (by hash)
**Gate:** a; b, plus c (not; this).
**Avoids:** Pitfalls #1, #3, #4 (path handling)

### Phase 3: Review

**Rationale:** Needs the manifest.
**Delivers:** Review queue
**Uses:** axum extractors
**Implements:** the review board
**Addresses:** REV-01
**Keeps:** the old export working
This phase can overlap Phase 2 once the queue exists.

### Ordering Rationale

- **Schema first:** every other phase reads it.
- The executor before the UI.

### Research Flags

Phases needing deeper research:
- **Phase 2:** the resume protocol needs a spike.

Phases with standard patterns (skip research):
- **Phase 1:** well documented.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Already in production |
| Features | MEDIUM | Needs a user pass |
| Architecture | MEDIUM-HIGH | One open question |
| Pitfalls | LOW-MEDIUM | Few sources |

**Overall confidence: MEDIUM-HIGH** - the unknowns are all in ingest.

### Gaps to Address

- **Resume protocol:** nothing in the wild matches our hash scheme.
- **Backup cadence:** unspecified by the operator.
`;

export const DRIFT_STACK = `# Stack Research

**Researched:** 2026-07-30
**Confidence:** HIGH

## Headline

**Rust and axum, kept as they are, over a rewrite in Go.**

The portal already runs there and the ingest path wants no garbage collector:

1. **Streaming without copies.** Rust lets the tee stay zero-copy.
2. **One toolchain.** The portal and the ingest share it.

## Recommended Stack

### Core (the runtime)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Rust | 1.90 | Language | Already used |
| axum | 0.8.9 | HTTP | Already used |

### Storage (what holds the bytes)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| rustix | 1.1.4 | statvfs | Maintained |

### Tooling

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| cargo-nextest | 0.9 | Tests | Always |

### Observability

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| tracing | 0.1 | Logs | Structured |

### Misc

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| serde | 1.0 | Wire format | Standard |

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Runtime | Rust | Go | Garbage collector pauses in the tee |
| Runtime | Rust | Node | Copies every chunk |
| HTTP | axum | actix-web | Two frameworks in one portal |
`;

export const DRIFT_FEATURES = `# Feature Research

**Researched:** 2026-07-30
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Things a vault must do.

#### Projects

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Create a project | Everything lives in one | LOW | Trivial |
| Archive a project | Cleanup | MEDIUM-HIGH | Needs a tombstone |

#### Ingest

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Upload a file | It is the point | HIGH | Streaming |

### Differentiators (Competitive Advantage)

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Resume after a crash | Nobody else does | HIGH | Needs tokens |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Auto-delete after sync | Saves space | Loses the only copy | Verify, then ask |

## Competitor Feature Analysis

| Feature | Lendhub (hosted review) | Syncbox (sync) | Peerlink (peer to peer) | Our approach |
|---------|--------------------------|----------------|------------------------|--------------|
| Review | Core | N/A | N/A | A queue |
| Resume | Partial | Yes | Yes | Tokens |

The matrix says the gap is verification, not transfer.
`;

export const DRIFT_ARCHITECTURE = `# Architecture Research

**Researched:** 2026-07-30
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

\`\`\`
+---------+     +----------+
| Browser | --> | Executor |
+---------+     +----------+
\`\`\`

## Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| Executor | Owns writes |
| Manifest | Records hashes |

## Recommended Project Structure

\`\`\`
src/
  ingest/
    executor.rs
\`\`\`

### Structure Rationale

Dropped from the page.

## Suggested Build Order

Dependency graph of the steps:

\`\`\`
S1 schema ──► I1 executor ──► R1 review
              I1 executor ──► R2 export
\`\`\`

| Step | Deliverable | Depends on | Notes |
|------|-------------|------------|-------|
| S1 | Schema: the manifest types | None | First |
| I1 | Executor: single read, tee | S1 | Core |
| R1 | Review queue: list and filter | I1, S1 | UI |
| R2 | Export | I1, spike X1 (needs an answer) | Last |

**Roadmap grouping suggestion:** S1 and I1 as one phase; R1 and R2 as the second.

## Anti-Patterns

### Anti-Pattern 1: Writing outside the executor

**Why wrong:** Two writers race on the manifest.
**Instead:** Route every write through the executor.

### Anti-Pattern 2: Hashing after the write

**What people do:** Re-read the file to hash it.
**Why it's wrong:** Doubles the I/O.
**Do this instead:** Hash in the tee.
`;

export const DRIFT_PITFALLS = `# Pitfalls Research

**Researched:** 2026-07-30
**Confidence:** MEDIUM-HIGH

## Critical Pitfalls

Ranked by how much they cost to fix late.

### Pitfall 1: Statvfs lies on absent mounts

**What goes wrong:**
The mount point degrades to an empty directory, so the probe reports the root filesystem's capacity. It looks healthy.

**Why it happens:**
\`nofail\` mounts.

**Confidence:** MEDIUM-HIGH - two independent sources

**How to avoid:**
- Check mountinfo first
- Then run a bounded canary

**Warning signs:** A tier shows full capacity while its drive is unplugged; the capacity equals the root disk; no mount event in the log.

**Phase to address:** Phase 1 (probe design) - before UI work

### Pitfall 2: Exit codes are a bitmask

**What goes wrong:**
diskcheck exits non-zero on a failing disk.

**How to avoid:**
Decode the bits.

**Warning signs:**
- A failing drive reported as an error

**Phase to address:** Phase 2

### Pitfall 3: A pitfall with no signs at all

**What goes wrong:**
Something.

**Why it happens:**
Reasons.

**Phase to address:** Phase 3

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1. Absent mounts | Phase 1 | Unplug a tier |
| 2. Exit bitmask | Phase 2 | Feed a failing disk |

## "Looks Done But Isn't" Checklist

- [ ] **Absent tiers:** often only tested plugged in - verify by unplugging each tier (Pitfall 1)
- [ ] **Exit codes:** verify the bitmask is decoded (Pitfall 2) (Pitfall 3)
`;

/** A numbered "Scaling Considerations" with a lead, a concerns × tiers matrix and two priorities,
 * one of which pins to a cell and one of which does not. */
export const DRIFT_SCALING = `# Architecture Research

## 11. Scaling Considerations

A small studio; scale means data volume on one machine, not users.

| Concern | Today | Per season (hundreds of GB) | Per year |
|---------|-------|----------------------------|----------|
| \`ingest_rows\` | n/a | thousands | tens of thousands |
| Write rate | low | per-file, far below limits | unchanged |
| Archive disk | adequate | the archive disk throttles dual-target ingest | keep ingest first |

### Scaling priorities

1. **First bottleneck:** the archive disk during dual-target ingest. Mitigation is policy, not code.
2. **Second:** render CPU against responsiveness. Mitigated by the lane design.

---

## 12. Anti-Patterns
`;
