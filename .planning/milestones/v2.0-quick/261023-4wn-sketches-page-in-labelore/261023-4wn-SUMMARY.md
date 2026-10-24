---
phase: quick-261023-4wn
plan: 01
subsystem: sketches
tags: [sketches, server, read-only, sandbox, nav]
requires: []
provides:
  - "Read-only /sketches/<folder>/ file route over .planning/sketches/"
  - "/api/sketches list built from MANIFEST.md with README fallback"
  - "Sketches page with in-page sandboxed viewer and a gated header tab"
affects: [src/server, src/planning-fs, src/presentation, src/web]
key-files:
  created:
    - src/server/sketch-files.ts
    - src/presentation/sketches.ts
    - src/web/pages/sketches-page.tsx
    - test/server/sketch-files.test.ts
    - test/presentation/sketches.test.ts
    - test/web/sketches-page-contract.test.ts
  modified:
    - src/planning-fs/types.ts
    - src/planning-fs/local-fs.ts
    - src/planning-fs/in-memory-fs.ts
    - src/planning-repo/snapshot.ts
    - src/server/remote-source.ts
    - src/server/index.ts
    - src/presentation/routes.ts
    - src/web/app-router.tsx
    - src/web/components/app-shell.tsx
    - src/web/styles/globals.css
    - docs/design-language.md
    - test/server/remote-source.test.ts
    - test/presentation/routes.test.ts
    - test/web/build-splitting.test.ts
    - test/web/navbar-contract.test.ts
decisions:
  - "Contained reads happen inside the filesystem boundary (readBytesWithin), so the server never touches the Node fs module."
  - "Every /sketches/* response, including errors and redirects, carries a sandbox Content-Security-Policy so a full-size tab is as isolated as the iframe."
  - "The Sketches tab is shown only when the project has sketches; a project without them keeps exactly three tabs."
metrics:
  duration: "about 35 minutes"
  completed: 2026-10-23
status: complete
commits: 3
plan_head_before: 96d0ab295e1cebebeee904c542a7cd611be1307c
plan_head_after: 88f585e8bab338048c9936af80d2d6adb6ab6f6c
actuals:
  tokens: 21000
  tasks: 3
  commits: 3
---

# Phase quick-261023-4wn Plan 01: Sketches page in Labelore Summary

Labelore now shows a project's `.planning/sketches/` itself: a Sketches page lists every sketch, View opens one inside the page in a scripts-only sandbox, and the server hands out the sketch files read-only from the target project. This replaces the throwaway python file server.

## What you now see

- **A Sketches tab in the header**, only when the project has sketches (a manifest, or a sketch folder with a README or index page). A project without sketches shows the same three tabs as before.
- **The Sketches page** (`/sketches`): the manifest's Design Direction as the intro, a tally ("28 sketches · 26 with a winner"), then one row per sketch with its number, name, design question, a Winner or No winner chip with the winner text, and its tags. Each row has View, README and Open full size.
- **README** opens the sketch's README as an ordinary document page (it already rendered that way).
- **View** swaps the list for a framed viewer on the same page (`/sketches?view=<folder>`), with an All sketches link back, the README link and Open full size. Back and middle-click behave normally.
- **Open full size** opens `/sketches/<folder>/` in a new tab, served by Labelore.
- Values come from `MANIFEST.md`. If the manifest is missing, a row is missing, or a cell is blank, the sketch's own README header fills in the number, name, question, winner and tags. Nothing throws on a badly formed manifest.

## How the sketch files are protected

- Only files whose real location is inside `.planning/sketches/` are served. Encoded slashes, `..`, backslashes, NUL bytes, empty or dot-prefixed parts, and symlinks that lead outside the sketches folder all get a 403 with no file content. Missing files and folders with no index page get a 404; there is never a directory listing.
- Only GET and HEAD are accepted; anything else gets a 405 and the sketches folder is verified unchanged afterwards.
- The frame's sandbox is exactly `allow-scripts`, and every `/sketches/*` response carries `Content-Security-Policy: sandbox allow-scripts`, so a sketch's own scripts run without reaching the app or its data, including in a full-size tab. Responses also carry `nosniff` and `no-cache`. Only font files get an open cross-origin header, because a sandboxed sketch needs it to load its fonts.
- Remote (ssh-mirrored) projects and the dev server both reach the same route; the bare `/sketches` path still belongs to the page.

## Tasks

| Task | Result | Commit |
|------|--------|--------|
| 1. Contained, sandboxed sketch file route | Done | bb8fa99 |
| 2. Sketches list (API and page), README links, Open | Done | fef70c8 |
| 3. In-page viewer and gated header tab | Done | 88f585e |

## Verification

- New tests: sketch serving, refusals, methods, content types, remote source, manifest parsing with README fallback, route, page contract and nav contract all pass.
- Full `npx vitest run`: 2 failures, both already present before this work (token-guard's three listed CSS declarations, and the plan-pair ordering check in the coverage test). Nothing else failed. The token check shows no new violation beyond those three declarations.
- `npm run typecheck` and `npm run lint` exit 0.
- Smoke over this repository (production off): `/api/sketches` returned 28 rows for the 28 sketch folders, each with a view link and a README link; sketch 001's winner reads "C — status rail"; 005 and 011 count as undecided; `/sketches/028-note-page/` returned 200 with the sandbox header, `/sketches/themes/default.css` returned 200 as CSS, and the font file under `themes/fonts` returned 403.
- Scratch dev server on port 5310 (stopped afterwards): `/sketches` and `/sketches?view=...` serve the app, `/sketches/028-note-page/` serves the sketch with the sandbox header, a missing-slash folder redirects (308), and POST gets 405.

## Not checked by eye

I did not open a browser, so the planned look-and-feel check (light and dark, the framed viewer working, the 360px-wide header and rows, and the three-tab header on a project without sketches) still needs your eyes. I sized the 360px header by estimate: with four tabs the icons are hidden and tab padding is tightened at phone width, and only when the fourth tab exists.

## Decisions still open (not resolved here)

1. Whether `labelore.brkn.me` should sit behind Cloudflare Access before sketches are exposed publicly. Sketch data files can carry other projects' planning text verbatim. Those same files are already readable through the existing document pages, so this route does not add new exposure, but the public-exposure question is yours.
2. How Labelore's own 28 sketches become reachable from the public instance, which targets cinedise-portal: a second instance aimed at this repo, or multi-project targeting.

The python server, systemd unit and tunnel entry were out of scope and untouched.

## Something to know about Labelore's own sketches

`.planning/sketches/themes/fonts` is a symlink to `public/fonts`, outside the sketches folder, so the new route refuses it and Labelore's own sketches show in fallback fonts when viewed through Labelore. That is the intended behaviour. If you want the real fonts, copy the two woff2 files into `.planning/sketches/themes/fonts/` as real files. I did not change the symlink or anything under `.planning/sketches/`.

## Deviations from Plan

- **Test and code order (Task 2):** for the manifest parser I wrote the code before its tests rather than watching the tests fail first; the tests then passed on the first run. Tasks 1 followed red then green as planned.
- **Phone-width header:** besides hiding the tab icons when a fourth tab exists, I also tightened the tabs' side padding in that case, since the estimate showed icons alone would not make four tabs fit 360px.
- No other deviations. No bugs found in existing code; no package installs.

## Known Stubs

None.

## Threat Flags

None beyond the plan's threat model; the new `/sketches/*` surface is the one the plan covers.

## Self-Check: PASSED

- Created files exist: `src/server/sketch-files.ts`, `src/presentation/sketches.ts`, `src/web/pages/sketches-page.tsx`, the three new test files.
- Commits `bb8fa99`, `fef70c8`, `88f585e` are in history; the working tree was clean after the last task commit.
