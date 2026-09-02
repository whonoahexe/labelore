---
phase: "03"
slug: "search-browsing-traceability"
status: verified
threats_open: 0
asvs_level: 1
created: "2026-09-02"
---

# Phase 03 — Security

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Browser → search and filter logic | User-controlled query text drives bounded matching | Query strings |
| Planning corpus → browser | Local Markdown paths, titles, snippets, requirements, and exclusion reasons render in React | User-authored text |
| Snapshot → navigation | Parsed paths and identities become browser destinations | Route identities |
| Dependency registry → runtime | MiniSearch is included as an exact-pinned runtime dependency | Third-party code |

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01-01 | Denial of service | Search query | high | mitigate | `MAX_QUERY_LENGTH` truncates before MiniSearch; oversized-query tests pass | closed |
| T-03-01-02 | Denial of service | Token shape regex | high | mitigate | Anchored, bounded alternatives with no nested unbounded quantifiers | closed |
| T-03-01-03 | Tampering | Search result rows | high | mitigate | Titles and paths render as React text; raw-HTML injection is absent | closed |
| T-03-01-04 | Tampering | Planning target | high | mitigate | Search consumes the assembled snapshot and imports no filesystem API | closed |
| T-03-01-05 | Denial of service | Startup | medium | mitigate | Index construction is deferred with `setImmediate`; smoke coverage passes | closed |
| T-03-01-SC | Tampering | MiniSearch dependency | high | mitigate | Version `7.2.0` is exact-pinned and research records the package audit | closed |
| T-03-01-06 | Information disclosure | Indexed frontmatter | low | accept | Single-user local corpus; no data beyond the already-readable project is added | closed |
| T-03-02-01 | Tampering | Snippet rendering | high | mitigate | Corpus slices render as React text and only match ranges become JSX `<mark>` nodes | closed |
| T-03-02-02 | Denial of service | Snippet extraction | medium | mitigate | Plain `indexOf` scans and bounded windows; no corpus-derived regex | closed |
| T-03-02-03 | Tampering | Heading anchors | low | mitigate | Anchors use the renderer's shared `stableSlug` function | closed |
| T-03-02-04 | Information disclosure | Snippet content | low | accept | Snippets expose only the local planning corpus to its reader | closed |
| T-03-03-01 | Tampering | Tree labels | high | mitigate | Names and exclusion reasons render as escaped React text | closed |
| T-03-03-02 | Tampering | Tree destinations | high | mitigate | Destinations come from canonical route builders and DTO URLs | closed |
| T-03-03-03 | Tampering | Planning target | high | mitigate | Tree projection consumes the snapshot and performs no filesystem walk | closed |
| T-03-03-04 | Information disclosure | Exclusion reasons | low | accept | Reasons are fixed discovery-rule descriptions, not corpus contents | closed |
| T-03-03-05 | Denial of service | Nested tree | low | mitigate | Discovery bounds traversal depth before rendering | closed |
| T-03-04-01 | Tampering | Traceability cells | high | mitigate | Requirement and reference text renders through React escaping | closed |
| T-03-04-02 | Tampering | Covering-phase links | high | mitigate | Resolved links use `buildPhaseUrl`; unresolved values remain inert text | closed |
| T-03-04-03 | Denial of service | Traceability filter | medium | mitigate | Case-insensitive substring matching over the bounded row set | closed |
| T-03-04-04 | Repudiation | Status reporting | high | mitigate | Requirement and phase status remain separate; tests forbid merged verdict fields | closed |
| T-03-04-05 | Information disclosure | Requirement text | low | accept | The view displays only the reader's local requirements corpus | closed |

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-01-06 | Indexing does not expand access beyond the local project reader | Project threat model | 2026-09-02 |
| AR-03-02 | T-03-02-04 | Snippets are excerpts of the same local corpus | Project threat model | 2026-09-02 |
| AR-03-03 | T-03-03-04 | Exclusion reasons are application-owned fixed strings | Project threat model | 2026-09-02 |
| AR-03-04 | T-03-04-05 | Traceability repeats locally available requirement text | Project threat model | 2026-09-02 |

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-02 | 21 | 21 | 0 | Codex inline ASVS L1 review |

## Sign-Off

- [x] All threats have a disposition
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-02
