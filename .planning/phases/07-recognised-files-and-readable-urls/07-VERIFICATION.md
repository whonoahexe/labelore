---
phase: 07-recognised-files-and-readable-urls
verified: 2026-10-27T11:40:00Z
status: passed
score: "5/5 roadmap success criteria verified; all plan truths verified except 3 backstop (screenshot) truths routed to human"
covered_files:
  - ".planning/phases/07-recognised-files-and-readable-urls/07-01-PLAN.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-01-SUMMARY.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-02-PLAN.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-02-SUMMARY.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-03-PLAN.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-03-SUMMARY.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-04-PLAN.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-04-SUMMARY.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-05-PLAN.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-05-SUMMARY.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-06-PLAN.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-06-SUMMARY.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-07-PLAN.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-07-SUMMARY.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-08-PLAN.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-08-SUMMARY.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-09-PLAN.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-09-SUMMARY.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-10-PLAN.md"
  - ".planning/phases/07-recognised-files-and-readable-urls/07-10-SUMMARY.md"
  - "playwright.config.ts"
  - "src/planning-repo/discovery.ts"
  - "src/planning-repo/file-class.ts"
  - "src/planning-repo/folders.ts"
  - "src/planning-repo/registry.ts"
  - "src/presentation/file-facts.ts"
  - "src/presentation/legacy-routes.ts"
  - "src/presentation/project-slug.ts"
  - "src/presentation/reserved.ts"
  - "src/presentation/route-table.ts"
  - "src/presentation/routes.ts"
  - "src/server/artifact-index.ts"
  - "src/server/file-bytes.ts"
  - "src/server/index.ts"
  - "src/server/search-index.ts"
  - "src/web/app-router.tsx"
  - "src/web/nav.tsx"
  - "src/web/pages/document-route.tsx"
  - "src/web/pages/file-details-page.tsx"
  - "src/web/pages/image-page.tsx"
  - "src/web/route-dispatch.ts"
  - "test/e2e/deep-reload.spec.ts"
  - "test/server/deep-links.test.ts"
covered_digest: "v3:sha256:619f30c327c7aa829890d6f981e6718e1c0c185c186c3408e73891ee1433f08d"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Image page, light and dark: open ui-reviews/screenshots/glaze-panel.png (Fit to width, Actual size, Grid on a transparent PNG, Expand) and ui-reviews/kiln-map.svg on the Shapes fixture (node src/server/index.ts test/fixtures/shapes --port 5390)"
    expected: "Both open on the image page matching 07-UI-SPEC section 1; the SVG shows as an inert picture and its script does not run; Grid shows the checker behind transparency; Actual size scrolls inside the frame, not the page"
    why_human: "Backstop truth (07-09 E1 populated): a screenshot comparison against a design spec; automation proves the img loads (naturalWidth > 0) and the script is inert, not that it looks right"
  - test: "File details card at light, dark and 390px width: open the PDF (v1.1/phase-1/firing-sheet.pdf), notes/kiln-curve.dat, and a large-text case (copy the fixture to a temp folder, add a 2 MB text file under .planning/research)"
    expected: "The card matches 07-UI-SPEC section 2: eyebrow, lead sentence, File details panel with Name, Type, Size, Folder; nothing overflows at 390px"
    why_human: "Backstop truth (07-09 E2 populated): visual fit against a spec. The large-text case needs a temp file the committed fixture does not hold"
  - test: "Drawer After stage at light, dark and the 390px drill-down for phase 01 (PNG, PDF) and phase 02 (COVERAGE.md, .continue-here.md)"
    expected: "Rows and quiet extension-and-size badges match 07-UI-SPEC section 3; badges use no tone and no primary colour; labels ellipsise and the badge never truncates"
    why_human: "Backstop truth (07-09 E3 populated): visual fit. Automation confirmed the rows and badge text ('PDF · 70 B', 'PNG · 70 B') exist, not their look"
  - test: "07-03 walkthrough: npm run dev on this repository, open /, then /someone-else/roadmap"
    expected: "/ lands on /labelore; drawer, nav tabs and document breadcrumbs keep the /labelore prefix; the other address shows the wrong-project not-found page"
    why_human: "Plan-recorded end-of-phase check. Re-run by this verifier on the Shapes fixture (redirect to /shapes, wrong-project page text, every anchor on a page starts /shapes) and it passed; the real-repository pass and the look of the page remain for a person"
  - test: "07-07 walkthrough: open a phase from the drawer, a plan and its Summary tab, a quick task, a codebase or note page, /labelore/v1.1 and a live alias /labelore/v1.1/roadmap"
    expected: "The address bar reads like the page; the bare milestone lands on the archived roadmap; the alias lands on /labelore/roadmap; Back skips the redirected entries"
    why_human: "Plan-recorded end-of-phase check. Redirect landing and reload were re-run here on the Shapes fixture and passed; judging whether addresses 'read like the page' on this repository is a human call"
  - test: "07-08 walkthrough: open an old bookmark such as /milestones/m~v1.1/phases/<old key> and /artifacts/<old token>"
    expected: "The address switches to the readable URL with no notice, and Back does not return to the old address"
    why_human: "Plan-recorded end-of-phase check. Re-run here with an old artifact link (landed on /shapes/roadmap; Back went to the page before the old link) and passed; a real old bookmark from the user's browser history is the remaining proof"
---

# Phase 7: Recognised Files and Readable URLs Verification Report

**Phase Goal:** Every file GSD writes is recognised for what it is and has exactly one readable address starting with the project's name. Pages, the switcher, search and the palette built later all link to the same clean URLs, and none of them needs to change again.
**Verified:** 2026-10-27T11:40:00Z
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

Everything that can be proven by code and automation holds. This verifier did not rely on the SUMMARY files: it read the plan must_haves, ran the plan artifact and key-link verbs, ran 22 phase test files (851 tests pass), typecheck and lint (exit 0), both modes of the deep-link probe (72/72 each; the built mode used the existing `dist/`, not rebuilt), and drove the Shapes fixture through a live dev server with HTTP requests and Chromium. What remains is design-fit screenshot checks the plans themselves marked as backstop truths, plus the four plan-recorded end-of-phase walkthroughs.

### Observable Truths (roadmap Success Criteria first)

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| SC1 | Unprefixed files (`COVERAGE.md`), `HANDOFF.json`, `.continue-here.md` recognised by folder; a root-document name deeper is not mistaken for one; GSD internal files absent from drawer and search (DATA-07) | VERIFIED | Live `/api/presentation` over Shapes: `phases/02-glaze-recipes/COVERAGE.md` kind `coverage`, `deferred-items.md`, `SKELETON.md` recognised; `.planning/HANDOFF.json` kind `handoff`; `.continue-here.md` kind `continue-here` at root and in a phase folder; `sketches/001-shelf-board/synthetic-planning/ROADMAP.md` and `STATE.md` kind `unknown` while root `ROADMAP.md` is `roadmap`; `spikes/CONVENTIONS.md` is `spikes-conventions`. Root `state.json`, `milestone.lock`, `estimation-calibration.json`, `tmp/`, `async-jobs/` all absent from `artifacts` (five exclusions recorded with the D-11 reason) while `sketches/001-shelf-board/state.json` stays a visible artifact. Drawer in Chromium lists Coverage, Deferred items, Skeleton, Continue here for phase 2. `src/web` never reads `exclusions`. |
| SC2 | Images and other binary files listed as what they are and never read or indexed as text (DATA-08) | VERIFIED | Payload gives `image`/`binary` fileClass with exact `sizeBytes` and `bodyLength 0` (`kiln-floor.png` image 70, `firing-sheet.pdf` binary 70, `kiln-curve.dat` binary 13, extensionless `kiln-log` binary 14, SVG image). `/api/search?q=kilnsprite` (word inside the fixture SVG's script) returns 0 hits. `file-class.ts` sets `MAX_TEXT_BYTES = 1_048_576`, classes by extension then an 8000-byte NUL sniff before any read; `recognition-classes.test.ts` spies on `read()` and proves zero reads for non-text and re-classification on `refresh()`. `LocalFs` capabilities stay `write: false`. |
| SC3 | Address bar reads like what it points to: `/labelore/v1.1/phase-5/plan-03`, `/quick/<id>/summary`, `/codebase/architecture`, `/notes/<name>`, `/roadmap` (NAV-09) | VERIFIED | Shapes keys: `/v1.1/phase-2.1/plan-01`, `/v1.1/phase-2.1/plan-01/summary`, `/quick/261020-k4m/summary`, `/codebase/architecture`, `/notes/kiln%20%25%20notes`, `/roadmap`. Chromium navigations to `/shapes/<those>` landed on the right page with the same address, and every anchor on a phase page starts with `/shapes`. `projectSlug` is `shapes`. Only `src/web/nav.tsx` and `src/web/app-router.tsx` import `Link`/`NavLink`/`useNavigate`/`useLocation` from react-router (grep confirmed; ESLint rule plus scan test enforce it). |
| SC4 | Every fixture file has exactly one URL, no two share one, including odd files; direct open and hard reload work in dev and built app, including dotted `v1.1` (NAV-10) | VERIFIED | Shapes payload: 58 artifacts, 58 distinct keys, `urlConflicts: []`. Odd files get `file/` URLs (`/file/phases/02-glaze-recipes/plan-01.md`, `/file/phases/README.md`, `/file/quick/README.md`, `/file/phases/02-glaze-recipes/03-RESEARCH.md`). Deep-link probe this session: `mode=built urls=72 failed=0` and `mode=dev urls=72 failed=0`. Chromium open-then-reload of 14 URL classes (decimal phase plan and its summary, coverage, quick summary, codebase, `%`-note, PDF, internal file, bare milestone, alias, archived milestone, `%2F`, un-prefixed `/roadmap`, `/settings`) kept the same address and page on a dev server. `test/presentation/route-table.test.ts` runs the exactly-one-URL property over every fixture root plus this repository. |
| SC5 | Old-style encoded links redirect to the new readable URL (NAV-11) | VERIFIED | Chromium: `/artifacts/a~.planning%2FSTATE.md` landed on `/shapes/state`; `/milestones/m~v1.0` landed on `/shapes/v1.0/overview`; un-prefixed `/roadmap` landed on `/shapes/roadmap`. Redirect uses `<Navigate replace>` and carries the hash (`redirectLocation`); Back after a legacy link went to the previous page, not the old address. `test/web/route-dispatch.test.ts` runs the old-URL-to-current-URL property over every artifact, phase and plan of Shapes and Lendshed, and `legacy-isolation.test.ts` pins one importer of `legacy-routes.ts`. |

Plan-level truths (spot-confirmed against code, beyond the five above):

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| P1 | Bytes route serves images only, with sandbox CSP, nosniff, no-cache; everything else the same 404 (07-09) | VERIFIED | Live: PNG route answers 200 `image/png` with `Content-Security-Policy: sandbox; default-src 'none'; style-src 'unsafe-inline'`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-cache`. PDF, `/file/state.json`, a page URL, a `.dat` binary and an unprefixed route all answer 404 `Not found`. `/api/documents` for an image returns metadata with `bodyLength 0`. |
| P2 | Bytes request is answered from one captured bundle across a refresh (07-09, behavior-dependent) | VERIFIED | `test/server/file-bytes.test.ts` line 329 holds a read open across `/api/refresh`: the in-flight request still answers 200 and the next answers 404. That behavioral test passed in this session's run. |
| P3 | refresh() re-runs classification from scratch (07-01, behavior-dependent) | VERIFIED | `test/recognition-classes.test.ts` swaps backing content between `load()` and `refresh()` and asserts the second load reclassifies; passed. |
| P4 | Image page shows the picture through `/api/files`, SVG never inlined | VERIFIED | Chromium: `img` with `src=/api/files?route=%2Fv1.1%2Fphase-1%2Fkiln-floor.png`, `alt=kiln-floor.png`, decoded (naturalWidth 1); SVG page has 0 script elements in the DOM, `img` naturalWidth 24, and `window.kilnrowFlag` is `undefined`. |
| P5 | Non-text files open the File details card without requesting `/api/documents` (07-09) | VERIFIED | PDF page renders h1 `firing-sheet.pdf`; `DocumentRoute` branches on `filePageKindOf(...)` (key link verified). `test/web/file-pages.test.ts` passes. |
| P6 | Wrong-project and miss addresses render one not-found page naming the address; internal file and encoded-slash URLs miss (07-03, 07-07) | VERIFIED | Chromium: `/someone-else/roadmap` shows "This address starts with a different project name than the one that is open (shapes)." and `/shapes/file/state.json` and `/shapes/notes/kiln%2Fcurve` show "This local route does not exist.", before and after reload. |
| P7 | 3 backstop screenshot truths of 07-09 (E1, E2, E3 populated) | PRESENT, not proven by automation | Marked `verification: backstop` in the plan; no automated test can prove a design match. Routed to human verification. |

**Score:** 5/5 roadmap success criteria verified. All plan truths verified except the 3 backstop screenshot truths. `behavior_unverified: 0`: every state-transition and ordering truth had a passing named test.

### Required Artifacts

`verify.artifacts` for all ten plans: every declared artifact exists and passes (6, 4, 5, 5, 2, 2, 4, 3, 8 and 5 artifacts). Spot-read substance confirmed in `file-class.ts`, `file-bytes.ts`, `route-dispatch.ts`, `app-router.tsx` (no stubs).

### Key Link Verification

`verify.key-links` for all ten plans: all links verified (4, 2, 3, 3, 1, 3, 3, 2, 4 and 5). Independently confirmed by behavior: payload keys resolve through `/api/documents?route=`, redirects execute in the real router, `app.all('/api/files')` serves bytes.

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
| -------- | ---- | ------ | --------- | ------ |
| Drawer file rows and badges | `ArtifactDto.fileClass`, `sizeBytes` | Discovery stat sizes through `/api/presentation` | Yes (badges read `PDF · 70 B`, `PNG · 70 B`, matching the 70-byte files) | FLOWING |
| Image page | `img.src` bytes | `/api/files?route=` reading the indexed path | Yes (PNG decoded, SVG decoded) | FLOWING |
| Every link | `artifact.key` from the route table | `buildRouteTable` | Yes (58/58 unique) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Phase test files | `npx vitest run` on 22 phase files | 22 files, 851 tests passed | PASS |
| Typecheck and lint | `npm run typecheck`, `npm run lint` | exit 0 and exit 0 | PASS |
| Deep-link probe, built | `node test/helpers/deep-link-probe.mjs built test/fixtures/shapes` | `urls=72 failed=0` | PASS |
| Deep-link probe, dev | same with `dev` | `urls=72 failed=0` | PASS |
| Live payload and search | HTTP against a dev server on the Shapes fixture | 58 unique keys, 0 conflicts, SVG-script word absent from search | PASS |
| Browser open, reload, redirect, back | Chromium script against the same server | See SC3 to SC5; no page errors | PASS |

The full `npm test` (4462/4462 at 27bad50) and the four-server Playwright run (200 passed) were not repeated: the build step in the fourth Playwright server writes `./dist`. Only docs have been committed since 27bad50.

### Probe Execution

No `probe-*.sh` scripts are declared by this phase. The deep-link probe above is its probe equivalent. SKIPPED otherwise.

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
| ----------- | ------------ | ----------- | ------ | -------- |
| DATA-07 | 07-01, 07-02 | Files recognised by location; internal files kept out | SATISFIED | SC1 |
| DATA-08 | 07-01, 07-09 | Images and binaries recognised, never read or indexed as text | SATISFIED | SC2, P1, P4, P5 |
| NAV-09 | 07-03, 07-04, 07-05, 07-06, 07-07 | Readable URL starting with the project name | SATISFIED | SC3 |
| NAV-10 | 07-04, 07-06, 07-07, 07-08, 07-10 | One URL per file; open and reload any URL | SATISFIED | SC4 |
| NAV-11 | 07-08 | Old encoded links redirect | SATISFIED | SC5 |

All five IDs in ROADMAP Phase 7 appear in at least one plan's `requirements` frontmatter, and all five appear in REQUIREMENTS.md. No orphaned requirement maps to Phase 7.

**WARNING, bookkeeping only (not a code gap):** `.planning/REQUIREMENTS.md` still shows `- [ ] **DATA-08**` and `- [ ] **NAV-11**` (lines 42 and 90) and the traceability table still reads `Pending` for both (lines 183 and 205); DATA-07, NAV-09 and NAV-10 are ticked and `Complete`. Both are implemented and verified above, so these should be ticked when the phase is closed. The ROADMAP Phase 7 line is also still unticked, which is normal before phase completion.

### Anti-Patterns Found

None blocking. A search for `TBD`, `FIXME` and `XXX` in source files changed since 2026-10-20 returned nothing. No stub returns found in the files read. `07-SECURITY.md` records 43/43 threats closed (not re-audited here). `07-UI-REVIEW.md` scores 20/24 with no blockers.

### Human Verification Required

See the `human_verification` frontmatter: three design-fit screenshot checks (the 07-09 backstop truths) and three plan-recorded walkthroughs (07-03, 07-07, 07-08). The walkthrough behaviors were already re-exercised on the Shapes fixture by this verifier and passed; what remains for a person is the screenshot comparison and a pass over this repository's own project and a real old bookmark.

### Gaps Summary

No gaps. All five roadmap success criteria and every automatable plan truth are verified against the running code, not the SUMMARY files. The phase is `human_needed` solely because three `backstop` truths (design-spec screenshot fit in light, dark and 390px) cannot be proven by automation, and the plans recorded walkthroughs for the end of the phase. Separately, tick DATA-08 and NAV-11 in REQUIREMENTS.md on phase close.

---

_Verified: 2026-10-27T11:40:00Z_
_Verifier: Claude (gsd-verifier)_
