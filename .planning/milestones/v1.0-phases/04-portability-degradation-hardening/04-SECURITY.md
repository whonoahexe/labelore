---
phase: "04"
slug: "portability-degradation-hardening"
status: verified
threats_open: 0
asvs_level: 1
created: "2026-09-08"
---

# Phase 04 — Security

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Target project → reader and renderer | An arbitrary local GSD project supplies paths, Markdown, YAML, JSON, and parse failures. | Untrusted local content and diagnostic text |
| Browser → loopback Hono API | The browser reads snapshots and may request a refresh of the fixed startup target. | Same-origin HTTP requests and selected snapshot data |
| CLI path → browser DOM and clipboard | The startup path may appear in invalid-target guidance and a restart command. | User-supplied local path |

## Threat Register

| Threat ID | Category | Severity | Disposition | Mitigation / evidence | Status |
|-----------|----------|----------|-------------|-----------------------|--------|
| T-04-01-01 | Denial of Service | medium | mitigate | Refreshes coalesce; cross-site requests are rejected before disk access. Refresh route tests pass. | closed |
| T-04-01-02 | Tampering | medium | mitigate | Refresh accepts no body/query input and operates on the startup-fixed target. | closed |
| T-04-01-03 | Information Disclosure | low | accept | Loopback-only responses expose only the user's selected path and snapshot status. | closed |
| T-04-01-04 | Elevation of Privilege | low | accept | Refresh uses the existing read-only, root-contained filesystem seam. | closed |
| T-04-01-SC | Tampering | high | mitigate | No phase dependency was added; dependency contract and package diff gates pass. | closed |
| T-04-02-01 | Tampering | medium | mitigate | Invalid-target values render as escaped React text; the contract forbids raw HTML. | closed |
| T-04-02-02 | Information Disclosure | low | accept | The checked path is intentionally shown to the same local user who supplied it. | closed |
| T-04-02-03 | Tampering | low | accept | Clipboard content is fixed guidance plus the already displayed user path. | closed |
| T-04-02-04 | Denial of Service | low | accept | ProjectGate reuses the presentation query and falls back on query failure. | closed |
| T-04-02-SC | Tampering | high | mitigate | The implementation uses existing icon and UI dependencies only. | closed |
| T-04-03-01 | Tampering | high | mitigate | Warning fields render as escaped React text; the scoped no-`dangerouslySetInnerHTML` assertion passes. | closed |
| T-04-03-02 | Information Disclosure | low | accept | Project-local warning paths are available only in a closed diagnostic disclosure. | closed |
| T-04-03-03 | Denial of Service | low | accept | Parser-produced messages render in a wrapping, closed disclosure. | closed |
| T-04-03-04 | Repudiation | medium | mitigate | Warning state does not affect search ranking; order-invariance coverage passes. | closed |
| T-04-03-SC | Tampering | high | mitigate | Native details and existing status-chip styles added no package. | closed |
| T-04-04-01 | Tampering | medium | mitigate | Portability mutations run only on temporary copies; `git diff -- fixtures` remains empty. | closed |
| T-04-04-02 | Tampering | low | mitigate | Open config maps are preserved byte-for-value by portability coverage. | closed |
| T-04-04-03 | Information Disclosure | low | accept | Unknown artifacts use the existing sanitized Markdown pipeline. | closed |
| T-04-04-04 | Denial of Service | low | accept | Fixture copies are bounded OS-temporary data with suite cleanup. | closed |
| T-04-04-SC | Tampering | high | mitigate | The phase uses built-in filesystem APIs and existing UI dependencies only. | closed |
| T-04-05-01 | Information Disclosure | low | accept | `bodyLength` is non-sensitive metadata already exposed to the same local client. | closed |
| T-04-05-02 | Tampering | medium | mitigate | Badge tone is a closed derived union; labels are fixed literals; UI contracts pass. | closed |
| T-04-05-03 | Denial of Service | low | accept | Request-local bundle retention is bounded by in-flight request count. | closed |
| T-04-05-SC | Tampering | low | accept | No package or dependency was added. | closed |
| T-04-06-01 | Tampering | medium | mitigate | All warning fields remain escaped React children; scoped injection coverage passes. | closed |
| T-04-06-02 | Tampering | medium | mitigate | Summary selection uses a closed tone plus counts and fixed prose only. | closed |
| T-04-06-03 | Information Disclosure | low | accept | Outcome summaries interpolate no path, stack trace, or project datum. | closed |
| T-04-06-04 | Repudiation | low | mitigate | Composition coverage proves unreadable artifacts cannot claim recovered text. | closed |
| T-04-06-SC | Tampering | low | accept | No package or dependency was added. | closed |

## Accepted Risks Log

Low-severity accepted risks are documented in the register with their local, single-user scope and rationale. No risk remains open.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-08 | 29 | 29 | 0 | Codex inline ASVS L1 audit |

## Sign-Off

- [x] All threats have a disposition
- [x] Accepted risks are documented
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set

**Approval:** verified 2026-09-08
