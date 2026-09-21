---
phase: 05
slug: per-type-document-views
status: verified
threats_open: 0
asvs_level: 1
created: 2026-09-21
---

# Phase 05 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| target `.planning/` markdown → section-projection extractor | Untrusted document text crosses into new server-side parsing (discussion questions, decisions, warnings). | Untrusted prose, tables, headings |
| target `.planning/` frontmatter → fact-list / verification-check blocks | Arbitrary YAML values for manifest fact keys render as text. | Untrusted structured values |
| target `.planning/` prose → mention scanner / definition extractors | Two new bounded regexes and two new line scanners run over untrusted text. | Untrusted prose |
| server `document.html` → client `DOMParser` split | Already-sanitized HTML is re-parsed in the browser and regrouped by heading via `outerHTML`. | Sanitized HTML |
| `structured.*` JSON → React views / reference registry | Extracted strings render as JSX text and become preview titles. | Extracted strings |
| rendered document DOM → `IntersectionObserver` | The hook observes elements by id in already-sanitized markup; heading labels render as trigger text. | Element ids, heading text |
| `artifact.kind` string → notice copy and eyebrow | A filename-derived token renders inside `<strong>` / `.eyebrow` as text. | Filename-derived token |
| repo source → class-vocabulary test scanner | Trusted first-party source and `docs/design-language.md` are regex-scanned at test time. | First-party source |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-05-01 | Denial of Service | `section-projection.ts` (`USER_CHOICE_LINE_RE`, table parsing) | medium | mitigate | `section-projection.ts:46` pattern is `^`/`$` anchored with `[^*]*` before the required `*` (bounded backtracking); extractor composes only the line-loop primitives in `markdown-sections.ts:11-65`. Auditor timing: 5k-row table + 50k-char adversarial choice line = 7.5 ms. The plan's declared 5k-row timing test does not exist (see audit note 1). | closed |
| T-05-02 | Tampering / XSS | `blocks.tsx` DiscussionQuestions, `ViewReader` section blocks | high | mitigate | Single `dangerouslySetInnerHTML` in `src/` at `artifact-page.tsx:111` (`DocumentCanvas`), fed only by `document.html` or its `DOMParser`→`outerHTML` regrouping (`document-sections.ts:115-137`) of output sanitized at `markdown.ts:238`; `blocks.tsx:147-161` renders question/option strings as JSX text. | closed |
| T-05-03 | Tampering | `splitRenderedDocument` DOMParser | low | accept | `document-sections.ts:137` `parseFromString` yields an inert document; input already sanitized. | closed |
| T-05-04 | Information Disclosure | `/api/documents` `structured` payload | low | accept | `structured` serialized at `src/server/index.ts:97` since 2026-09-01, pre-phase; new fields derive from the same document the client already receives. | closed |
| T-05-05 | Denial of Service | `class-vocabulary.test.ts` regexes | low | accept | `test/web/class-vocabulary.test.ts:43,165,178,205,252` — anchored / negated-class patterns over bounded first-party source. | closed |
| T-05-06 | Tampering | planted-fixture positive control | low | mitigate | `class-vocabulary.test.ts:383` `mkdtemp(join(tmpdir(), …))`; `:378-379` `afterEach` → `rm(plantedRoot, { recursive: true, force: true })`; never under `src/`. | closed |
| T-05-07 | Denial of Service (ReDoS) | `ID_PATTERNS.warning`, `tokenIdentity`, `parseDecisionEntries`, `extractReviewWarnings` | high | mitigate | `mentions.ts:37` `/\bWR-\d+\b/g`; `references.ts:361-374` anchored single-quantifier patterns; `section-projection.ts:110,141,154` anchored per-line patterns inside `split('\n')` loops; `stripCodeForScanning` runs first at `mentions.ts:196`. Auditor timing over a 10k-line body: ≤13 ms per scanner, 200k-digit `WR-` run 0.4 ms. The plan's declared 10k-line timing test does not exist (see audit note 1). | closed |
| T-05-08 | Tampering / XSS | preview `title` from decision/warning text | medium | mitigate | Pipeline order unchanged (`markdown.ts:238` `rehypeSanitize` → `:239` `rehypeResolvedReferences`); `linkify.ts:52-64` emits `button` with text children only; `reference-preview.tsx:71` renders `{preview.title}` as JSX text. | closed |
| T-05-09 | Information Disclosure | corpus-wide fallback links a root document to a phase's decision | low | accept | `references.ts:414` resolves only previews already in the registry; single local user can open every artifact anyway. | closed |
| T-05-10 | Tampering | `useActiveSection` observing ids from document content | low | accept | `use-active-section.ts:27` `getElementById` on sanitized elements; only side effect is `setActive` (`:39`). | closed |
| T-05-11 | Denial of Service | observer over many sections | low | mitigate | One observer per reader (`use-active-section.ts:32`), disconnected on unmount (`:46`). The declared 18-entry cap applies only to Source mode (`artifact-page.tsx:75`); View mode passes uncapped `outlineEntriesOf(composed)` (`artifact-page.tsx:358-360`), so the bound is the document's `##` count. | open — below high threshold (non-blocking) |
| T-05-12 | Elevation of Privilege | scroll tracking rewriting navigation state | medium | mitigate | `test/web/outline-contract.test.ts:83,89` assert `/pushState\|replaceState\|location\.hash\|useNavigate/` absent from `document-outline.tsx` and `use-active-section.ts`; `view-page-contract.test.ts:42-44` pins `artifact-page.tsx` to the one pre-existing `replaceState` in `copyHeadingUrl`. | closed |
| T-05-13 | Tampering / XSS | FactList, VerificationChecks, PlanTaskIndex, unrecognized notice | high | mitigate | `blocks.tsx:15-35,50-98,103-132` render every value as JSX text via `ValueView` (`metadata-panel.tsx:8-35`); `artifact-page.tsx:409-428` `<strong>{kindLabel}</strong>`; no `dangerouslySetInnerHTML` in `blocks.tsx`. | closed |
| T-05-14 | Denial of Service | deeply nested frontmatter through `toFrontmatterValueView` | low | accept | `src/planning-repo/frontmatter.ts:29-42` guards `matter()` in try/catch with `{}` fallback; renderer unchanged since Phase 2. | closed |
| T-05-15 | Spoofing | file named to look like a known type but unrecognized | low | accept | `artifact-page.tsx:559-563` quiet `Unrecognized type` chip and `:634` notice make the gap explicit; pinned by `view-page-contract.test.ts:59-77`. | closed |
| T-05-16 | Tampering / XSS | 15 new manifests' fact-list and section blocks | medium | mitigate | `manifests.ts:81-282` is data only; rendering resolves to `FactList` (`blocks.tsx:178`) or `DocumentView` over sanitized `group.html` (`artifact-page.tsx:380`). | closed |
| T-05-17 | Denial of Service | RegExp heading matchers with `all: true` | low | accept | `manifests.ts:81-282` matchers are `^`-anchored short literals (only `/coverage/i` and the fallback `/./` are unanchored, both linear) against short heading strings. | closed |
| T-05-18 | Information Disclosure | live deployment receiving an unverified bundle | medium | mitigate | `git log 7c38a88..7787205 -- dist package.json package-lock.json` is empty; `dist` is gitignored; `05-06-SUMMARY.md:171` records `dist` and service state unchanged during execution. The 2026-09-21 rebuild/restart was a post-phase, user-requested UAT deployment. | closed |
| T-05-SC | Tampering | npm installs | high | mitigate | `git diff 7c38a88 7787205 -- package.json package-lock.json` is empty; zero new packages in the phase. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-05-01 | T-05-03 | `DOMParser.parseFromString` produces an inert document; input is already through `rehype-sanitize`. | plan author (05-01-PLAN.md) | 2026-09-21 |
| R-05-02 | T-05-04 | `structured` was already on the wire before this phase; nothing new is disclosed. | plan author (05-01-PLAN.md) | 2026-09-21 |
| R-05-03 | T-05-05 | Test-time regexes over bounded first-party source. | plan author (05-02-PLAN.md) | 2026-09-21 |
| R-05-04 | T-05-09 | Single local user; the fallback only links what the reader could open anyway. | plan author (05-03-PLAN.md) | 2026-09-21 |
| R-05-05 | T-05-10 | Observed ids are attribute values on sanitized elements; observing has no side effect beyond `setState`. | plan author (05-04-PLAN.md) | 2026-09-21 |
| R-05-06 | T-05-14 | `gray-matter` output bounded by the existing YAML guard; renderer unchanged since Phase 2. | plan author (05-05-PLAN.md) | 2026-09-21 |
| R-05-07 | T-05-15 | The `Unrecognized type` chip and notice surface the coverage gap instead of presenting the file as understood (VIEW-06). | plan author (05-05-PLAN.md) | 2026-09-21 |
| R-05-08 | T-05-17 | Anchored, bounded matchers against short heading strings; group counts bounded by `##` count. | plan author (05-06-PLAN.md) | 2026-09-21 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-21 | 19 | 18 | 1 (non-blocking: T-05-11) | gsd-security-auditor (opus), asvs_level 1, block_on high |

### Audit notes (non-gating)

1. **T-05-01 / T-05-07 test debt.** Both are closed on the code patterns plus the auditor's adversarial timing run, but the regression tests the register promised ("5k-row synthetic table", "10k-line synthetic body … well under a second") were never written. Follow-up: a test-only quick task adding them to `test/section-projection.test.ts` and `test/mentions.test.ts`.
2. **T-05-02 / T-05-13 rely on a one-shot acceptance grep.** No standing test asserts `src/web/views/blocks.tsx` stays free of `dangerouslySetInnerHTML`. Cheap to add beside the existing source-text contract tests.
3. **T-05-11 (non-blocking).** Either cap View-mode outline entries the way Source mode does, or amend the mitigation text to state the bound is the document's `##` count.
4. No `05-0N-SUMMARY.md` contains a `## Threat Flags` section; the executor-side flag list is absent rather than empty.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-21
