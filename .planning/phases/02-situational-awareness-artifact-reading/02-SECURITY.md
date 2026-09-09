---
phase: "02"
slug: "situational-awareness-artifact-reading"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-09-09"
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Retroactive verification — the register was authored at plan time across all 17 phase plans;
> this document records the first audit of whether those mitigations actually landed.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| CLI path → repository | A user-supplied path selects the one local project snapshot | Filesystem path, resolved once and canonicalized |
| Browser → local Hono API | Browser requests cross into the startup-selected snapshot | Route tokens, artifact identifiers |
| Artifact content → rendered HTML | Untrusted markdown from the target `.planning/` becomes DOM | Arbitrary third-party prose, raw HTML, mermaid source |
| npm registry → runtime | Newly installed package code enters trusted execution | Third-party code |

The dominant threat classes for a read-only, loopback-only, unauthenticated local dashboard are
path traversal / symlink escape, XSS via artifact content, prototype pollution from open-map JSON,
and supply chain. Verification was weighted accordingly.

---

## Threat Register

69 unique threats across 17 plans. **67 closed by verification, 2 resolved this audit** — one by a
documentation edit, one carried by later gates. Full per-threat evidence with file/line citations
is in the audit record referenced below; this table summarizes by group.

| Threat group | Ids | Sev | Disposition | Status | Evidence anchor |
|---|---|---|---|---|---|
| Loopback binding, single repository instance, DTO projection | T-02-01, T-02-06, T-02-35 | high/med/low | mitigate/accept | closed | `src/server/index.ts:23,260,274,286,317`; `src/server/project-presentation.ts:203-218` |
| Markdown → HTML sanitize ordering and mermaid containment | T-02-12, T-02-13, T-02-37, T-02-46, T-02-47, T-02-54 | high | mitigate | closed | `src/rendering/markdown.ts:224-242`; `src/web/pages/artifact-page.tsx:226-228,252-265` |
| Route token parsing, fail-closed traversal handling | T-02-04, T-02-05, T-02-14, T-02-23, T-02-24 | high/med | mitigate | closed | `src/presentation/routes.ts:57-67,106-138,213-329`; `src/server/artifact-index.ts:31-84` |
| Phase identity: live vs archived collision | T-02-04, T-02-09, T-02-22, T-02-28 | high/med | mitigate | closed | `test/presentation/routes.test.ts:28`; `test/web/roadmap-deep-link.test.ts:115` |
| Reference resolution and preview trigger integrity | T-02-17, T-02-18, T-02-55, T-02-15-01..04 | high/med/low | mitigate | closed | `src/presentation/references.ts:216-236`; `src/web/pages/document-reference-activation.ts:30-35` |
| Attention-row and dashboard destination integrity | T-02-41, T-02-42, T-02-44, T-02-16-01..04 | high/med/low | mitigate/accept | closed | `test/web/attention-row-contract.test.ts:159-217,300,324-330` |
| Deep-link scroll bounding | T-02-27, T-02-29, T-02-30, T-02-43 | med/low | mitigate | closed | `src/web/pages/scroll-settle.ts:43,67`; `src/web/pages/roadmap-page.tsx:37-55` |
| Plan-section tag grammar and escaping | T-02-36, T-02-38 | high/med | mitigate | closed | `src/rendering/plan-segments.ts:170-259`; `src/rendering/markdown.ts:275,284` |
| Read-only filesystem guarantee | T-02-21, T-02-52 | high/med | mitigate | closed | `src/planning-fs/local-fs.ts:27` `capabilities={watch:false,write:false}` |
| Supply chain (npm) | T-02-SC | high | mitigate | closed | `02-RESEARCH.md:203-242` (12 `[SUS]`, 0 `[SLOP]`); blocking-human checkpoint at `02-01-PLAN.md:97-117` |
| Gate integrity and audit honesty | T-02-16, T-02-32, T-02-33, T-02-34, T-02-49, T-02-51, T-02-53, T-02-17-02, T-02-17-03, T-02-17-04 | high/med | mitigate | closed | `02-13-SUMMARY.md:219`; `02-17-SUMMARY.md:69-91` |
| Tested-commit audit record | T-02-17-01 | high | mitigate | **closed this audit** | `02-17-SUMMARY.md` § "Tested Commit" — `56346a4`, reconstructed 2026-09-09 |
| Named-checklist gate control | T-02-20 | medium | mitigate | **accepted** — see log | `02-06-SUMMARY.md:42,86,149` |
| Fixture/path disclosure, local-only exposure | T-02-10, T-02-11, T-02-25, T-02-26, T-02-31, T-02-39, T-02-45, T-02-48 | low/med | mitigate/accept | closed | `test/web/shell-contract.test.ts:28,62`; `grep -rc '/home/cinedise' fixtures/dense` → 0 |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `block_on: high` count toward threats_open*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-02-01 | T-02-20 | The 02-06 gate closed on an explicit human close-out decision rather than a re-run of its named checklist, and deliverable D3 carries `status: unknown` while the plan reads `status: complete` — so a missing response did not block completion as the control declared it would. Accepted because: the user is the human the gate defers to and did give an explicit decision; D3 is flagged `human_judgment: true` so it resurfaces rather than disappearing; and the same surface was in fact re-gated downstream by 02-09 → 02-13 → 02-17, the last of which was approved. Severity medium, below the `high` block threshold, so non-blocking regardless. | User (via /gsd-verify-work 02 security gate) | 2026-09-09 |

---

## Hardening Notes (not threat status changes)

- **`src/rendering/linkify.ts:40-45`** — `skipped()` excludes `a`, `pre` and mermaid, but
  T-02-15-02's declared mitigation also names **buttons**, which are absent from the list. The
  threat does not realize today only because `button` is not in `hast-util-sanitize`'s default
  `tagNames`, so no author-authored button survives sanitize into the linkify tree, and linkify's
  own generated buttons are never re-walked (`:146-147`). The exclusion is therefore a property of
  the sanitize schema, not of `skipped()`. **If `button` is ever added to the schema at
  `src/rendering/markdown.ts:224-231`, a nested-interactive trigger becomes reachable.** Adding
  `'button'` to `skipped()` would make the mitigation self-contained.

---

## Unregistered Flags

None. No `## Threat Flags` section exists in any of the 16 SUMMARY files, so no new attack surface
was declared during implementation.

---

## Register Scope Note

Plan 02-09 (`status: superseded` by 02-13, never executed, no SUMMARY) contributes T-02-32,
T-02-33, T-02-34, T-02-35 and a T-02-SC row. These were verified as carried by 02-13/02-17 rather
than treated as independently open, and all close on that evidence.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-09 | 69 | 68 | 0 (1 accepted, R-02-01) | gsd-security-auditor (ASVS L1, block_on: high) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
