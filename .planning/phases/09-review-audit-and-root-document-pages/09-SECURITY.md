---
phase: "09"
slug: "review-audit-and-root-document-pages"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-03"
---

# Phase 09 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser address -> dispatcher | Any path and query string reaches resolveProjectRoute | see the 09-01 plan's threat model |
| search hits -> result rows | Row links are built from the cached payload | see the 09-01 plan's threat model |
| address query -> traceability page | ?state= and ?milestone= are untrusted strings | see the 09-02 plan's threat model |
| REQUIREMENTS.md -> page | Out-of-scope features and reasons are author text | see the 09-02 plan's threat model |
| file names -> recognition and URLs | A fix-file suffix comes from a file name an author chose | see the 09-03 plan's threat model |
| review and fix bodies -> handlers | Untrusted markdown and YAML | see the 09-03 plan's threat model |
| planning files -> dashboard | STATE.md text is author-controlled and untrusted | see the 09-04 plan's threat model |
| disposition bodies and frontmatter -> the handler | Untrusted markdown and YAML | see the 09-05 plan's threat model |
| disposition text -> the recognised page | Notes, titles and raw dispositions are author text | see the 09-05 plan's threat model |
| browser address -> dispatcher (archive) | /vX.Y/roadmap and ?source=1 are untrusted | see the 09-06 plan's threat model |
| MILESTONES.md -> History panel | Extra field labels and values are author text | see the 09-06 plan's threat model |
| PROJECT.md -> the page | Author text: names, leads, core value, milestone labels, goals, constraints, exclusions, footers | see the 09-07 and 09-08 plans' threat models |
| server context -> tile links | Link targets the page renders | see the 09-07 plan's threat model |
| PROJECT.md decisions -> page | Decision, rationale and outcome cells are author text | see the 09-09 plan's threat model |
| screenshots -> the repository | Shots of real projects on this machine must never be committed | see the 09-09 and 09-16 plans' threat models |
| WINDOWS.md -> handler and page | Frontmatter, table cells, the JSON block, descriptions, reasons, kinds and paths are author text | see the 09-10 and 09-11 plans' threat models |
| sibling files -> the ledger | Which files join a ledger is decided from the cached presentation | see the 09-12 plan's threat model |
| fix, review and disposition text -> the page | Titles, reasons, notes, file paths and commits are author text | see the 09-12 and 09-13 plans' threat models |
| audit frontmatter and body -> the handler | YAML values of any shape and prose are author text | see the 09-14 plan's threat model |
| COVERAGE.md -> handler and page | Table cells, headers and paragraphs are author text | see the 09-15 plan's threat model |

---

## Threat Register

| Plan | Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|------|-----------|----------|-----------|----------|-------------|------------|--------|
| 09-01 | T-09-01 | Spoofing | root-document redirect | medium | mitigate | targets only from the fixed ROOT_DOCUMENT_TARGETS table (root-redirects.ts:28-39) through redirectTo, which rejects //host and /\host (route-dispatch.ts:40-43); redirectLocation prefixes the payload's own slug via withProjectSlug; route-dispatch.test.ts hostile-target cases | closed |
| 09-01 | T-09-02 | Information disclosure | ?source=1 escape | medium | mitigate | hasSourceFlag accepts only '1' and only skips the redirect branch; documentOutcome is still an exact artifact-key lookup (not-found for /nope and /file/state.json, route-dispatch.test.ts:182); every ?source=1 URL is built by sourceUrlOf | closed |
| 09-01 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-02 | T-09-03 | Tampering | ?state= / ?milestone= seed | low | mitigate | seedTraceabilityFilter exact-matches REQUIREMENT_STATES and the payload's own versions; the address is never rendered or written back (traceability-seed.test.ts) | closed |
| 09-02 | T-09-04 | Tampering | out-of-scope text | medium | mitigate | rendered as React text through stripEmoji and LeadText (traceability-page.tsx:609-614); raw-html-guard.test.ts allows one site | closed |
| 09-02 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-03 | T-09-05 | Denial of service | idEndAt and the commits field scan | medium | mitigate | lines clipped to 8,000 before scanning, bounded character loops, MAX_COMMITS = 8, measureGrowth tests in review-report.test.ts | closed |
| 09-03 | T-09-06 | Tampering | suffixed fix address | low | mitigate | suffix grammar [A-Za-z0-9][A-Za-z0-9-]{0,39} (naming.ts:168-178), encodePart applied once (routes.ts:271, :301); route-table.test.ts proves one URL per file across every fixture | closed |
| 09-03 | T-09-07 | Spoofing | a file posing as another phase's fix | low | mitigate | samePhase check (routes.ts:259-270) sends a foreign phase prefix to the file/ address; url-grammar.test.ts:97-107 | closed |
| 09-03 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-04 | T-09-08 | Denial of service | state-session scanner | low | mitigate | section 20,000 / line 2,000 / field 400 / steps 20 caps applied before scanning, single-line bounded patterns; state-session.test.ts:125 (200k-character line, 10,000 rows, 10,000 steps) and :160 (measureGrowth) | closed |
| 09-04 | T-09-09 | Spoofing | dashboard links (Resume, +N more, Deferred, About) | low | mitigate | resume link is an artifact key or null (rendered as text when null); deferred and steps links are sourceUrlOf plus #stableSlug; About is the PROJECT artifact key | closed |
| 09-04 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-05 | T-09-10 | Denial of service | extractReviewDisposition | medium | mitigate | body capped at 1,000,000 characters before a one-pass table scan, lines clipped to 8,000, 500-row and 400-character caps; measureGrowth and cap tests in review-disposition.test.ts | closed |
| 09-05 | T-09-11 | Tampering | disposition text on the recognised page | low | mitigate | the manifest promotes only factsBlock and sections through the existing sanitised pipeline (manifests.ts:328-338); raw-html-guard.test.ts allows one site | closed |
| 09-05 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-06 | T-09-12 | Spoofing | archive-block outcome | low | mitigate | page and version come from archivedCopyTarget over the payload's own milestones and projection; the outcome type carries no URL | closed |
| 09-06 | T-09-13 | Tampering | milestone extra fields | medium | mitigate | RecordText / LeadText render React text, labels as {fact.label}; raw-HTML guard still allows one site | closed |
| 09-06 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-07 | T-09-14 | Tampering | project page text | medium | mitigate | author strings reach the DOM only through LeadText / React text; project-view-contract.test.ts forbids the raw-HTML prop; raw-HTML guard passes | closed |
| 09-07 | T-09-15 | Tampering | tile links | low | mitigate | tile URLs only from traceabilityStateUrl(literal state, payload version) with a fixed /traceability? prefix and URLSearchParams; the view contract pins every Link target | closed |
| 09-07 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-08 | T-09-16 | Denial of service | project handler scans | medium | mitigate | caps on text (600), lines per section (600), line length (2,400), bullets (40), headings (400); measureGrowth on 100,000-line inputs and cap tests on 200k-character goal, label and bullet (project-handler.test.ts) | closed |
| 09-08 | T-09-17 | Tampering | goal and margin text | medium | mitigate | LeadText only; the only link target is margin.dashboardUrl, fixed to '/'; project-view-contract.test.ts:116-128 | closed |
| 09-08 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-09 | T-09-18 | Denial of service | thousands of decisions | low | mitigate | MAX_DECISIONS = 500, MAX_TEXT = 600, regex-free outcomeOf character scan; project-handler.test.ts:303 and :314 (100,000-row measureGrowth) | closed |
| 09-09 | T-09-19 | Information disclosure | screenshots of a private project | medium | mitigate | test-results/ gitignored (.gitignore:8); the spec reads only this repo, Lendshed and Shapes; fixture-leak.test.ts passes; no images committed in the phase | closed |
| 09-09 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-10 | T-09-20 | Denial of service | fence scan and row normalisation | medium | mitigate | one linear fence pass with the guarded tryParseJson, 2,000-row and 4,000-character caps on the normalised reading, measureGrowth tests in windows-handler.test.ts | closed |
| 09-10 | T-09-21 | Repudiation | stated counts against listed rows | low | mitigate | the lead counts listed rows; a disagreement keeps and prints both numbers (windows-ledger.test.ts:121-142 planted mismatch) | closed |
| 09-10 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-11 | T-09-22 | Tampering | descriptions, reasons, paths | medium | mitigate | ResearchInline React text; no Link, anchor or href; paths render as text; windows-view-contract.test.ts:124-138 | closed |
| 09-11 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-12 | T-09-23 | Information disclosure | ledger membership | low | mitigate | members only review, review-fix and review-disposition kinds in the same directoryOf; URLs only from resolveArtifactReference; invariant sweep over ALL_FIXTURE_ROOTS (review-ledger.test.ts:353-377) | closed |
| 09-12 | T-09-24 | Denial of service | many fix files | low | mitigate | MAX_FIX_MEMBERS = 12 applied by slice (review-ledger.ts:28, :193); test plants 15 and keeps 12 | closed |
| 09-12 | T-09-25 | Tampering | fix and review text | medium | mitigate | ResearchInline React text; the only Link target is server-resolved {tab.to}; review-ledger-view-contract.test.ts:158-176 | closed |
| 09-12 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-13 | T-09-26 | Repudiation | head counts | low | mitigate | open and total only from disposition rows; fixedInReport is a separate note (test/web/review-ledger.test.ts:567, test/presentation/review-ledger.test.ts:162-186) | closed |
| 09-13 | T-09-27 | Tampering | reasons and notes | medium | mitigate | ResearchInline React text; the one review-threads Link uses the server-resolved fixContext.url; review-view-contract and review-ledger-view-contract tests | closed |
| 09-13 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-14 | T-09-28 | Denial of service | extractMilestoneAudit | medium | mitigate | caps on body, line, text, scores, groups, items, extras, rows and depth (milestone-audit-body.ts:111-123); line-at-a-time prose scan; budgeted compact; cap and measureGrowth tests in milestone-audit-handler.test.ts | closed |
| 09-14 | T-09-29 | Tampering | audit text on the page | medium | mitigate | ResearchInline React text; the narrative reuses DocumentView, the one allowlisted raw-HTML site; milestone-audit-view-contract.test.ts | closed |
| 09-14 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-15 | T-09-30 | Denial of service | extractCoverage | low | mitigate | COVERAGE_BODY_CAP = 50,000 before one table scan, 500-row and 2,000-character caps; measureGrowth and cap tests in coverage-handler.test.ts | closed |
| 09-15 | T-09-31 | Tampering | capability and reason text | medium | mitigate | ResearchInline React text, no raw HTML or links; coverage-view-contract.test.ts | closed |
| 09-15 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |
| 09-16 | T-09-32 | Information disclosure | real-corpus screenshots | medium | mitigate | test/e2e/phase-09-screenshots.spec.ts writes to gitignored test-results/phase-09 and reads only Lendshed, Shapes and this repo (playwright.config.ts servers); fixture-leak.test.ts scans the spec and passes | closed |
| 09-16 | T-09-SC | Tampering | npm installs | low | accept | this plan installs no packages | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

T-09-SC appears once per plan: each plan stated it installs no packages, and `git diff 6dc7691^ HEAD -- package.json package-lock.json` is empty (6dc7691 is the phase's first commit).

### Evidence notes

The auditor ran 32 vitest files covering the register, read-only: 1043 tests passed. Playwright was not run. Places where the plan's wording differs from the code, all still effectively mitigated:

- **T-09-01:** search rows use `rootDocumentRedirect(artifact)` as the row URL directly (src/presentation/search.ts:88), without passing through `redirectTo`. The values are constants from the fixed table, so this is safe.
- **T-09-06:** the grammar is slightly stricter than stated: the first character must be a letter or digit (1 to 40 characters in total).
- **T-09-08:** the plan says a "200k-line" test; the test uses a 200,000-character line, a 10,000-row table and 10,000 steps, plus a separate measureGrowth test.
- **T-09-10:** the body cap is 1,000,000 characters (`MAX_BODY`). With a frontmatter disposition the capped rows (at most 500) are walked a second time to map notes to IDs. This is bounded.
- **T-09-16:** the 200k-character goal, label and bullet tests assert caps without timing; the measureGrowth tests use the 100,000-line inputs.
- **T-09-20:** the 2,000-row and 4,000-character caps apply to the normalised `windows` reading. The handler's pre-phase-09 raw `structured.rows` still carries the uncapped fenced-JSON or table rows into the payload. That was outside this phase's mitigation; recorded for information only.
- **T-09-28:** the frontmatter tests assert caps only (10,000 debt items with one 200k-character item, 500-key maps); the measureGrowth tests run on the body. Extras are one level of labelled rows, but nested values are compacted to text up to `MAX_DEPTH = 3` under a 2,000-character budget. Cost remains bounded.
- 09-01, 09-09, 09-10, 09-11, 09-12 and 09-13 SUMMARY files have no `## Threat Flags` section; every SUMMARY that has one says "None".
- Unregistered flags: none. The only server change is two response fields, `ledgerContext` and `projectContext`, built from the cached payload and each wrapped in try/catch (src/server/project-api.ts).

---

## Accepted Risks Log

No accepted risks. The T-09-SC rows are plan-time "accept" dispositions; each is documented in its plan and verified (no package changes).

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-03 | 48 | 48 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-03
