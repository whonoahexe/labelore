---
status: resolved
trigger: "the sidebar icon on the navbar doesn't appear for a few seconds when the initial page loads. even the skeletons dont appear on the page initially. switching between pages is also slow. i also tried going to a plan, it didnt show the loading bar at all."
created: 2026-09-16
updated: 2026-09-16T18:55
---

# Debug Session: loading-state-regression

## Symptoms

- **Expected behavior:** On initial page load, the sidebar/drawer trigger icon and the page skeleton (dashboard/roadmap/traceability/search) should appear promptly, not after a multi-second delay. Switching between pages should feel responsive. Navigating to a plan-pair page (`/plans/:id` or similar) should show the new `RouteProgress` top bar loader if the chunk takes longer than its ~150ms debounce.
- **Actual behavior:**
  1. On initial page load, the navbar sidebar/drawer trigger icon does not appear for a few seconds.
  2. Page skeletons (`.dashboard-loading` / `.roadmap-loading` etc.) also don't appear initially — implies the same few-second blank window, not just the icon.
  3. Switching between pages (route navigation) is slow.
  4. Navigating to a plan (plan-pair-page, lazy-loaded route) never showed the new top-bar `RouteProgress` loader at all — even though task 3 of quick task 260916-o2o wired it as the Suspense fallback for lazy routes.
- **Errors:** None noticed in the browser console (user did check).
- **Timeline:** First observed immediately after quick task 260916-o2o shipped (commit range `1bf0e51`..`41a4c4e`, this session) — this is the first time the user has exercised the new loading-state code (text removal + skeletons + `RouteProgress` top bar).
- **Environment:** User is accessing the app through an already-built Cloudflare tunnel (not `npm run dev`) — exact build/serve command behind the tunnel not yet confirmed. Tunnel implies extra network hop; could explain generic latency but not the missing top bar or the missing skeletons specifically.
- **Reproduction:** Load the app fresh via the tunnel URL (initial load) — observe icon/skeleton delay. Click between Dashboard/Roadmap/Traceability — observe slow transitions. Navigate to a plan-pair page — observe no top bar at all during the transition.

## Current Focus

bug_class: Bohrbug (deterministic — reproduced on demand in both dev and prod builds)
known_pattern_candidate: (none — knowledge base did not exist, this is the first session)

hypothesis: CONFIRMED — three independent contributing causes (AND-gate fired).
test: (complete — see Evidence; playwright differential across dev/prod at 0 ms and 150 ms RTT)
expecting: (complete)
next_action: NONE — investigation closed. The user verified the fix against the production build on
  127.0.0.1:4399 and confirmed the top bar now appears on navigation ("confirmed fixed, commit it").
  The RC2/RC3 code fix is committed, this session is archived, and the reusable lessons are recorded in
  `.planning/debug/knowledge-base.md`. One item is deliberately carried OUT of this session rather than
  left open in it: RC1 is a deployment misconfiguration, not a code defect — the live tunnel origin on
  :4173 (PID 225631, NODE_ENV unset) was left running untouched at the user's explicit instruction and
  is being remediated separately. The code-side guard for RC1 (the serve-mode startup banner) shipped
  with this fix.

reasoning_checkpoint:
  hypothesis: "Three separate causes combine. RC1 (environment): the tunnel origin runs `node src/server/index.ts` with NODE_ENV unset, so `createApp`'s `production` flag is false and Hono serves the Vite dev middleware instead of `dist/` — 55 unbundled module round-trips at tunnel latency leave the page fully blank for ~11.8 s. RC2 (code): `RouteProgress` is wired only as a `<Suspense fallback>`, which React renders only when the boundary MOUNTS; react-router v8 navigates inside `startTransition`, during which React keeps an already-mounted boundary's children on screen instead of swapping in the fallback, so the bar can never show on an in-app navigation. RC3 (code): `app-shell.tsx:47` gates `SidebarDrawer` on `tree.isSuccess`, so the icon waits on a 120 KB `/api/tree` payload and always pops in after the rest of the header."
  confirming_evidence:
    - "`curl http://127.0.0.1:4173/` returns `<script type=\"module\" src=\"/@vite/client\">`, and `/proc/225631/environ` shows NODE_ENV unset — directly observed, not inferred"
    - "Measured at 150 ms RTT: DEV first paint t=11,792 ms / 55 requests vs PROD first paint t=765 ms / 14 requests"
    - "Delaying the plan chunk 2500 ms: hard load showed `.route-progress` at t=432 ms; client-side navigation to the same URL never rendered it, in BOTH dev and prod"
    - "`.sidebar-trigger` appeared 482 ms (prod) and 564 ms (dev) after `a.brand`, and `/api/tree` is a 120,265-byte payload"
  falsification_test: "If RC2 were wrong, the bar would have appeared during the client-side navigation with the chunk delayed 2500 ms. It did not, in either build mode. If RC1 were wrong, the prod origin would show the same ~12 s blank window — it showed 0.77 s."
  fix_rationale: "RC2's fix moves the bar off the Suspense-mount signal entirely: the `React.lazy` factories are wrapped so the in-flight chunk count lives in a module-level store, and the shell renders the bar from that store via `useSyncExternalStore`. The shell sits ABOVE the suspended boundary and is already committed, so a store update paints the bar over the still-visible old page — which is the intended NProgress UX and also avoids the blank flash that keying the boundary would introduce. This addresses the root cause (the signal was tied to boundary mount, not to 'a chunk is loading') rather than the symptom. RC3's fix removes the gate because `TreeNavigator` already renders its own `isPending`/`isError` states internally, so the gate was redundant. RC1's fix is a restart in production mode plus a startup banner naming the mode, so a dev-mode serve can never again be silent."
  blind_spots: "Emulated 150 ms RTT is a proxy for the real Cloudflare tunnel, which may also add TLS/HTTP-2 behavior I did not model. I have not tested the bar under `prefers-reduced-motion`, nor a navigation to a route whose chunk is already cached (expected: no bar, which is correct). `queueMicrotask`-deferred store emission is used to avoid a set-state-during-render warning; verified by test run rather than by reading React internals."
  candidate_causes:
    - "environment: server started without NODE_ENV=production, serving Vite dev middleware over a high-latency tunnel"
    - "code: Suspense-fallback-only progress signal cannot fire during a router startTransition"
    - "code: sidebar trigger structurally gated on a large query's success"
    - "data: 120 KB /api/tree payload amplifies the RC3 gate"
  and_gate: "yes — RC1 and RC2 are genuinely independent and BOTH must be fixed. Fixing only RC1 leaves symptom 4 (no top bar on navigation) intact, as proven by the prod-mode probe. Fixing only RC2 leaves symptoms 1-3 (the ~12 s blank window) intact. RC3 is additive, not required for either."

## Evidence

- timestamp: 2026-09-16 (phase 0)
  checked: `.planning/debug/knowledge-base.md` and MemPalace availability
  found: No knowledge base exists yet (first debug session in this project); no prior resolution to match against
  implication: No known-pattern shortcut; full investigation required

- timestamp: 2026-09-16
  checked: `git log` commit times vs `dist/` mtime, and `grep -l route-progress dist/assets/*.js`
  found: `dist/` built 17:47 (commit 41a4c4e landed 17:47:34); `dist/assets/index-DYoPMaVu.js` and `dist/assets/index-D5dAqGdq.css` BOTH contain `route-progress`
  implication: ELIMINATES "stale build" as the cause of the missing top bar — the production build does contain the new code

- timestamp: 2026-09-16
  checked: `ps aux` for the process behind the Cloudflare tunnel, and `/proc/225631/environ`
  found: Running command is `node src/server/index.ts /home/cinedise/studio-portal` with **NODE_ENV unset**, started **Tue Sep 15 16:25**, cwd `/home/cinedise/gsd-lore`; tunnel is `cloudflared tunnel --url http://127.0.0.1:4173` pointing at that exact process
  implication: `createApp(source, production = process.env.NODE_ENV === 'production')` evaluates `production === false`, so the server takes the `createViteServer({ middlewareMode: true, hmr: false })` branch — the tunnel is serving the **dev** server, and `dist/` is never read

- timestamp: 2026-09-16
  checked: `curl http://127.0.0.1:4173/` (the tunnel's origin)
  found: Response HTML contains `<script type="module" src="/@vite/client"></script>`
  implication: CONFIRMS dev mode conclusively. In dev, every module (app + each lazy page + its whole import graph) is a separate unbundled HTTP request, each a full round trip through the Cloudflare tunnel — this is the dominant cause of the multi-second initial blank window and the slow page switches

- timestamp: 2026-09-16
  checked: Playwright (playwright-core + cached Chromium 1234, per the machine's browser workaround) against the live dev origin, delaying the `plan-pair-page` chunk by 2500 ms, comparing a **hard load** of a plan URL against a **client-side navigation** to the same URL
  found: Hard load (boundary mounts fresh) → `.route-progress` APPEARED at t=432 ms, REMOVED at t=2740 ms. Client-side navigation (boundary already mounted) → `.route-progress` **never appeared**; the previous page's `<h1>` stayed on screen for the entire 2500 ms chunk delay, and the first visible change was the plan page's own data skeleton at t=2731 ms
  implication: The `RouteProgress` component itself works. The defect is that as a `<Suspense fallback>` it only renders when the boundary MOUNTS. react-router v8's `RouterProvider` runs navigations inside `React.startTransition`, and React deliberately keeps an already-mounted boundary's current children on screen during a transition rather than swapping in the fallback — so the bar can never appear on an in-app navigation

- timestamp: 2026-09-16
  checked: Same probe with CDP `Network.emulateNetworkConditions` at 150 ms RTT (tunnel-like), comparing the live DEV origin (:4173) against a PROD origin (`NODE_ENV=production`, :4399, serving `dist/`)
  found: DEV → 55 requests, first paint (`div.app-shell`) at **t=11,792 ms**, sidebar trigger at 12,356 ms, wall 22.8 s. PROD → 14 requests, first paint at **t=765 ms**, sidebar trigger at 1,247 ms, wall 11.7 s
  implication: Serving `dist/` instead of the Vite dev middleware collapses the fully-blank window from ~11.8 s to ~0.77 s — a 15x improvement, and the direct cause of symptoms 1, 2 and 3. The user's "icon takes a few seconds / skeletons never appear" is simply "the entire page is blank for ~12 s"

- timestamp: 2026-09-16
  checked: `routeProgressEverSeen` on a client-side navigation in BOTH the dev and prod origins at 150 ms RTT
  found: `false` in both. In prod the old `<h1>` stayed until the new page's own skeleton appeared at t=316 ms; in dev until t=1218 ms
  implication: The missing top bar is **mode-independent** — a genuine code defect, not a side effect of dev mode. Fixing the serve mode alone would leave symptom 4 unfixed

- timestamp: 2026-09-16
  checked: `app-shell.tsx:47` (`{tree.isSuccess ? <SidebarDrawer /> : null}`) against measured `.sidebar-trigger` appearance, and `curl` size of `/api/tree`
  found: `/api/tree` returns a 120,265-byte payload; `.sidebar-trigger` appeared 482 ms after `a.brand` in PROD and 564 ms after in DEV — a lag present in both modes
  implication: A third, smaller contributing cause — the sidebar icon is structurally absent until the 120 KB tree payload lands, so it always pops in after the rest of the header. This is the specific "the sidebar icon doesn't appear for a few seconds" detail that the blank-window cause alone does not explain

- timestamp: 2026-09-16 (resume)
  checked: `useNavigation()` viability, by reading react-router 8.3.0's own navigation lifecycle at `node_modules/react-router/dist/development/lib/router/router.js:693`
  found: `handleLoaders` short-circuits BEFORE it ever assigns `updates.navigation = loadingNavigation` — `if (!init.dataStrategy && !dsMatches.some((m) => m.shouldLoad) && !dsMatches.some((m) => m.route.middleware?.length) && revalidatingFetchers.length === 0) { completeNavigation(...); return { shortCircuited: true }; }`. Every route in `app-router.tsx` declares only `element:` — no `loader`, no `middleware`, no custom `dataStrategy` — so this branch always fires and `navigation.state` never leaves `"idle"`
  implication: ELIMINATES `useNavigation()` as the detector. Two independent reasons: (a) with no loaders the router never publishes a `loading` state at all, and (b) even with loaders it would go idle the moment loaders resolved, which is before the `React.lazy` chunk finishes downloading — the chunk fetch happens in React's render phase via Suspense and is completely invisible to react-router. The signal must come from the lazy factory itself

- timestamp: 2026-09-16 (resume)
  checked: `git status` / `git diff --stat` against the working tree, after an initial file read returned pre-restart content
  found: The three-part fix is ALREADY APPLIED in the working tree (uncommitted): `route-progress.tsx` (+store, `trackRouteChunk`, `RouteFallback`), `app-router.tsx` (6 wrapped factories), `app-shell.tsx` (bar hoisted above the boundary, `tree.isSuccess` gate removed), `src/server/index.ts` (serve-mode banner), plus 82 lines of new contract tests
  implication: The crashed session had reached the fix stage. Remaining work is the failing test, verification, and resolution — not re-implementation. (Read-tool content was stale across the restart; `git diff` is the trustworthy view)

- timestamp: 2026-09-16 (resume)
  checked: `npx vitest run test/web/loading-state-contract.test.ts`
  found: 11 passed, 1 failed — `routes every lazy page through trackRouteChunk` expected 6 to be 7. `grep -n "lazy(" src/web/app-router.tsx` shows 7 matches: 6 real `lazy(` calls plus line 9's prose comment "Every routed page is lazy()-loaded"
  implication: The TEST is wrong, not the implementation — its `/\blazy\(/g` count binds to prose as well as code. Fix by stripping comments before counting, not by rewording the comment (a reworded comment leaves the same trap for the next one)

- timestamp: 2026-09-16 (resume)
  checked: Whether the pre-existing source-text contract tests could ever have caught this bug — re-ran the ORIGINAL assertion (`loading-state-contract.test.ts:159`, "debounces, portals and cleans up the route-transition top bar loader") against the ORIGINAL broken code
  found: It passed on the broken Suspense-fallback wiring. It asserts only that the source contains `createPortal`, `document.body`, `ROUTE_PROGRESS_DELAY_MS = 150`, `clearTimeout` and the a11y attributes — every one of which the broken version also had
  implication: This is the "why was it not caught" answer. The whole file is source-text pinning with an IMPLICIT oracle (does the text mention the right identifiers), which cannot observe behaviour. The recurrence guard must be a behavioural test that actually drives the store

## Eliminated

- hypothesis: "`useNavigation()` from react-router is the idiomatic detector for an in-flight navigation to an already-mounted boundary"
  evidence: react-router 8.3.0 `router.js:693` short-circuits `completeNavigation` before publishing a `loading` navigation whenever no matched route has a loader/middleware — which is every route in this app. Separately, a `React.lazy` chunk download is invisible to the router's navigation lifecycle entirely, so even a loader-bearing route would report idle while the chunk was still in flight
  timestamp: 2026-09-16 (resume)

- hypothesis: "The production build is stale and simply does not contain the new RouteProgress code"
  evidence: `grep -l route-progress dist/assets/*.js` matched both the JS and CSS bundles, built at 17:47 against commit 41a4c4e
  timestamp: 2026-09-16

## Resolution

root_cause:
  Three independent contributing causes. The AND-gate fired: no single one explains all four
  symptoms, and fixing any one alone leaves the others intact.

  1. ENVIRONMENT (symptoms 1, 2, 3 — dominant). The Cloudflare tunnel origin was running
     `node src/server/index.ts` with NODE_ENV unset (process started Sep 15 16:25), so
     `createApp(source, production = process.env.NODE_ENV === 'production')` evaluated
     `production === false` and Hono served the Vite dev middleware instead of `./dist`. Over the
     tunnel every module is a separate unbundled round trip. Measured at 150 ms RTT: DEV = 55
     requests, first paint t=11,792 ms; PROD = 14 requests, first paint t=765 ms. The user's "the
     icon takes a few seconds / the skeletons never appear" is simply "the whole page is blank for
     ~12 s". Not a code defect — a deployment misconfiguration that the server gave no signal about.

  2. CODE (symptom 4 — mode-independent, reproduced in BOTH dev and prod). `RouteProgress` was
     wired only as app-shell.tsx's `<Suspense fallback>`. React renders a Suspense fallback when the
     boundary MOUNTS; react-router v8 runs every in-app navigation inside `React.startTransition`,
     and during a transition React deliberately keeps an already-mounted boundary's current children
     on screen rather than swapping in its fallback. So the bar could only ever paint on a hard
     load. With the plan chunk held 2500 ms: hard load painted it at t=432 ms, client-side
     navigation to the same URL never painted it at all.

  3. STRUCTURAL / PRE-EXISTING (the specific "sidebar icon" detail). `app-shell.tsx:47` gated the
     drawer trigger behind `{tree.isSuccess ? <SidebarDrawer /> : null}`, so the icon waited on a
     120,265-byte `/api/tree` payload. `.sidebar-trigger` lagged `a.brand` by 482 ms in prod and
     564 ms in dev. Present in both modes and not introduced by quick task 260916-o2o — the gate
     also bought nothing, since `TreeNavigator` already renders its own isPending/isError states.

fix:
  RC2 (the real bug, and the reason the session was filed): moved the loading signal off the
  Suspense-mount event entirely. `useNavigation()` was investigated first, as the notionally
  idiomatic detector, and ELIMINATED on direct source evidence — react-router 8.3.0
  (router.js:693) short-circuits `completeNavigation` before ever publishing a `loading`
  navigation when no matched route declares a loader or middleware, which is every route here; and
  a `React.lazy` chunk download happens in React's render phase, invisible to the router's
  navigation lifecycle regardless. Instead a new `src/web/components/route-chunk-store.ts` counts
  chunks in flight: `trackRouteChunk` wraps each `React.lazy` factory in app-router.tsx,
  incrementing synchronously on entry and decrementing in a `finally` (so a chunk that 404s cannot
  strand the bar). `RouteProgress` now reads that store via `useSyncExternalStore` and is rendered
  by the shell ABOVE the Suspense boundary, where it is already committed and free to repaint while
  the boundary below it suspends — so the bar lands over the still-visible previous page, with no
  blank flash. The boundary keeps a layout-only `RouteFallback`. The 150 ms debounce is preserved,
  now inside the component (it stays mounted, so the timer re-arms on the effect cleanup rather
  than on unmount). Listener notification is deferred with `queueMicrotask` because the counter is
  incremented from inside a `React.lazy` factory, i.e. during another component's render.

  RC3: removed the `tree.isSuccess` gate; `<SidebarDrawer />` renders unconditionally and the
  drawer contents own their own loading state, as they already did.

  RC1: NOT fixed in code — it is a deployment misconfiguration outside this codebase's control, and
  the correct remediation is to serve the production build behind the tunnel. What the code now
  does is make the footgun impossible to miss: `runCli()` prints the serve mode at startup, with
  the dev branch as a `console.warn` naming the consequence and the exact remedy. Restarting the
  live tunnel origin is deliberately left to the user, since it is a process they are actively
  browsing through.

  Also, while resuming: the `lazy(`-counting contract test was over-counting prose in comments
  (7 vs 6) and was re-anchored; the chunk store was extracted from route-progress.tsx into a plain
  .ts module so its tests import cleanly under tsconfig.server.json without that config having to
  grow `jsx`/DOM settings it should not have.

verification:
  - signal: regression test fails without the fix (mutation-checked)
    result: PASS. Mutant A (decrement moved out of the `finally`) killed by 3 tests. Mutant B (the
    identity wrapper — the closest analogue of the original no-signal defect) killed by 5 of 6.
    The pre-existing source-text tests, by contrast, all passed on the ORIGINAL broken code.
  - signal: full suite
    result: PASS. 707 tests / 47 files, all green (was 705 before; the store suite adds 6 and the
    duplicated behavioural block was consolidated out of the contract file).
  - signal: typecheck + lint
    result: PASS. `npm run typecheck` and `npm run lint` both exit 0. (Typecheck initially FAILED
    with TS6142 — tsconfig.server.json type-checks `test/**` with no `jsx` — which is what drove
    the store extraction rather than loosening the server config.)
  - signal: behavioural acceptance in a real browser (playwright-core + cached Chromium 1234,
    against a freshly rebuilt `dist/` served with NODE_ENV=production on :4399)
    result: PASS on all four, with zero console errors/warnings:
      * client-side navigation, plan chunk held 2500 ms -> bar APPEARED (t=1023 ms) and was removed;
        the previous page stayed visible throughout. THIS IS THE ACCEPTANCE SIGNAL FOR RC2 — it was
        `false` before the fix.
      * hard load of the same plan URL, same delay -> bar APPEARED (t=230 ms) and was removed. The
        path that already worked is not regressed.
      * navigation to an ALREADY-LOADED chunk -> bar did NOT appear. No flash on cached routes.
      * initial load at 150 ms RTT -> first paint 765 ms, brand 766 ms, sidebar trigger 766 ms,
        trigger lag 0 ms (was 482 ms in prod / 564 ms in dev). RC3 confirmed fixed.
      * consoleErrors: [] — confirms the `queueMicrotask` deferral avoids a set-state-during-render
        warning, which had been an open blind spot.
  - signal: startup banner, both branches, observed at runtime
    result: PASS. production -> "Mode: production — serving the prebuilt ./dist bundle";
    dev -> console.warn "Mode: DEVELOPMENT — serving unbundled modules through Vite...".
  - signal: outstanding, requires the user
    result: the live tunnel origin on :4173 is STILL the dev server (PID 225631, NODE_ENV unset).
    Symptoms 1-3 persist for the user until that process is restarted in production mode.

  guardrail_verdict: accepted

files_changed:
  - src/web/components/route-chunk-store.ts (new): the chunk-in-flight store and `trackRouteChunk`
  - src/web/components/route-progress.tsx: store-driven bar + layout-only `RouteFallback`
  - src/web/components/app-shell.tsx: bar hoisted above the Suspense boundary; `tree.isSuccess`
    gate removed from the drawer trigger; `useTreeQuery` read dropped
  - src/web/app-router.tsx: all six `React.lazy` factories wrapped in `trackRouteChunk`
  - src/server/index.ts: serve-mode startup banner (warn on dev)
  - test/web/route-chunk-store.test.ts (new): 6 behavioural tests driving the store directly
  - test/web/loading-state-contract.test.ts: comment-stripping so counts bind to code not prose;
    assertions re-pointed at the store module; duplicated behavioural block consolidated out
  - test/web/shell-contract.test.ts, test/web/build-splitting.test.ts: follow the shell/router edits

## Postmortem

why_not_caught:
  A gate existed and was green. `test/web/loading-state-contract.test.ts` was written by the very
  quick task that introduced the bug, and it passed on the broken code — because every assertion in
  it was source-text pinning with an IMPLICIT oracle: it checked that route-progress.tsx contained
  `createPortal`, `document.body`, `ROUTE_PROGRESS_DELAY_MS = 150`, `clearTimeout` and the right
  a11y attributes. All of that was true of the broken version. The bar existed, was debounced, was
  portalled, and was accessible; it simply never received a signal during a navigation. No test in
  the suite could observe behaviour, so none could tell a working signal from a dead one.

  The second-order reason is that the defect lived in an interaction between three libraries
  (React Suspense semantics x react-router's `startTransition` x `React.lazy`), none of which is
  visible in the source text of any single file. Typecheck, lint and review could not have caught
  it either — the broken code is type-correct, lint-clean, and reads as obviously right.

  RC1 had no gate at all: nothing in the server's startup output, health endpoint, or served HTML
  stated which mode was serving, so a dev-mode process could sit behind a public tunnel for 26
  hours without a single signal.

recurrence_guard:
  - test/web/route-chunk-store.test.ts — 6 behavioural tests that drive `trackRouteChunk` and
    `routeChunkStore` with no DOM and no renderer. Mutation-verified: killed by 3/6 and 5/6 against
    two deliberate mutants. This is the guard that the original source-text suite could not be.
  - The store lives in a plain .ts module precisely so it stays drivable from a test without a
    React renderer — the architectural half of the same guard.
  - src/server/index.ts startup banner, pinned by a contract test asserting both branches exist and
    that the dev branch is a `console.warn`, not an easily-missed `console.log`.
  - Comment-stripping in the contract test's identifier counts, so prose can never again make a
    correct implementation look broken (or, worse, a broken one look correct).
