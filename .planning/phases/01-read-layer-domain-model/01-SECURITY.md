---
phase: 01
slug: read-layer-domain-model
status: verified
threats_open: 0
asvs_level: 1
created: 2026-08-24
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| CLI path → target resolver | A user-controlled path selects the project tree to read. | Local filesystem paths and metadata |
| Planning tree → filesystem adapter | Files, names, and symlinks come from a tree the tool did not author. | Untrusted paths and document bytes |
| YAML/JSON/prose → domain model | Open-map configuration and malformed documents cross into typed handlers and indexes. | Untrusted structured and free-form content |
| Snapshot → stdout/golden files | Serialized project state may be logged or committed. | Paths, timestamps, and optional artifact bodies |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-01-01 | Tampering / Information Disclosure | `src/planning-fs/local-fs.ts` | high | mitigate | `resolveContained` canonicalizes targets and rejects escapes with `PathEscapeError`; `test/target-path.test.ts` covers an inside-tree symlink escape. | closed |
| T-01-02 | Denial of Service | Parsers and repository load/refresh | medium | mitigate | YAML/JSON and per-artifact extraction are guarded; degradation, handler, and filesystem-equivalence tests prove malformed and rejecting inputs return warnings rather than throw. | closed |
| T-01-03 | Tampering | Open-map JSON parsing | high | mitigate | `tryParseJson` recursively strips `__proto__`, `constructor`, and `prototype`; hostile nested-key tests confirm `Object.prototype` remains clean. | closed |
| T-01-04 | Information Disclosure | User-selected CLI path | low | accept | The local, read-only tool grants no access beyond the invoking user's shell and the path is supplied deliberately. | closed |
| T-01-06 | Denial of Service | Recursive discovery | medium | mitigate | Discovery caps walk depth and records the truncation as an exclusion; `test/discovery.test.ts` covers a pathological tree. | closed |
| T-01-07 | Information Disclosure | `--with-bodies` output | low | accept | Bodies are omitted by default; disclosure requires an explicit local CLI opt-in. | closed |
| T-01-08 | Tampering | Committed fixtures | high | mitigate | Fixtures contain no symlinks; escape behavior is exercised only in temporary runtime trees. | closed |
| T-01-09 | Information Disclosure | Synthetic fixture prose | medium | mitigate | Fixtures are synthetic and contain no credentials or private project content; the real project is limited to the manual smoke test. | closed |
| T-01-10 | Tampering | Dense fixture config | high | mitigate | The fixture avoids dangerous property names while hostile-key coverage remains in in-memory tests of the guarded JSON parser. | closed |
| T-01-11 | Denial of Service | Naming and mention scanning | high | mitigate | Identifier expressions use bounded patterns without nested unbounded groups; mention excerpts are clipped to a bounded window and tests cover scanning behavior. | closed |
| T-01-12 | Tampering | Discovery path composition | high | mitigate | Paths are composed only from directory entries returned by the filesystem adapter, never from document content. | closed |
| T-01-13 | Spoofing | Filename-based handler dispatch | low | accept | The read-only local tool retains raw bodies and falls back to a generic artifact, limiting impact to local misclassification. | closed |
| T-01-14 | Information Disclosure | Stable snapshot goldens | medium | mitigate | Stable serialization normalizes the root and timestamps and omits bodies by default; committed goldens are generated only from synthetic fixtures. | closed |
| T-01-15 | Tampering | Filesystem fixture import | high | mitigate | `fromDirectory` shares the containment-checked filesystem adapter and committed fixtures contain no symlinks. | closed |
| T-01-16 | Repudiation | Dangling cross-references | low | accept | Routine unresolved identifiers intentionally remain queryable without flooding the warning channel; health rollup is deferred to Phase 4. | closed |
| T-01-SC | Tampering | Development dependency supply chain | high | mitigate | The plan's package-legitimacy checkpoint was completed before execution; the locked dependency set then passed the full phase suite. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01-04 | T-01-04 | Local read-only path selection adds no authority beyond the invoking user. | Phase 01 threat model | 2026-08-24 |
| AR-01-07 | T-01-07 | Body output is off by default and requires explicit opt-in. | Phase 01 threat model | 2026-08-24 |
| AR-01-13 | T-01-13 | Misclassification is local, non-destructive, and preserves raw content. | Phase 01 threat model | 2026-08-24 |
| AR-01-16 | T-01-16 | Suppressing routine dangling-reference warnings preserves signal; a health surface is planned later. | Phase 01 threat model | 2026-08-24 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-24 | 16 | 16 | 0 | Codex inline security auditor |

Verification evidence: `npm test` (135/135), `npm run typecheck`, and `npm run lint` all passed on 2026-08-24. At ASVS level 1, the authored register and grep/test-depth evidence are sufficient because no blocking threats remain open.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-24
