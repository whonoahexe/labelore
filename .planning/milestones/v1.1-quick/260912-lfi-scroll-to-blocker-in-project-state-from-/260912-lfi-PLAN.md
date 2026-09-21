---
phase: quick-260912-lfi
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/presentation/dashboard.ts
  - src/presentation/routes.ts
  - src/web/pages/artifact-page.tsx
  - src/web/components/inline-markdown.tsx
  - src/web/pages/dashboard-page.tsx
  - src/web/styles/globals.css
  - test/presentation/dashboard.test.ts
  - test/web/inline-markdown.test.ts
  - test/web/strip-emoji.test.ts
  - test/web/visual-contract.test.ts
autonomous: true
requirements: [LFI-01, LFI-02]

must_haves:
  truths:
    - "Clicking 'View state source' on a blocker attention item in the dashboard navigates to the STATE.md artifact with a heading anchor (e.g. #blockersconcerns) and smoothly scrolls the blockers section into view (LFI-01)"
    - "sourceDestination preserves heading hash anchors on .planning/STATE.md and .planning/ROADMAP.md artifact links rather than truncating them (LFI-01)"
    - "Dashboard items (NextWork descriptions, AttentionItem details, and discrepancy details) render inline Markdown (strong, code, em, del) rather than showing raw delimiters like ** or backticks (LFI-02)"
    - "Emoji sanitization via stripEmoji is preserved before rendering inline Markdown in attention and next-work items (LFI-02)"
    - "Inline strong elements inside dashboard prose render inline without breaking layout or inheriting block styling from parent card headers (LFI-02)"
    - "All CSS rules strictly conform to design tokens, and test/token-guard.test.ts, npm run typecheck, and npm run build succeed"
  artifacts:
    - path: "src/web/components/inline-markdown.tsx"
      provides: "Lightweight, safe inline Markdown renderer supporting bold, code, italic, strikethrough, and nested spans"
      exports: ["InlineMarkdown", "parseInlineMarkdown"]
    - path: "test/web/inline-markdown.test.ts"
      provides: "Unit tests covering inline markdown parsing, code spans, nested formatting, and edge cases"
  key_links:
    - from: "src/presentation/dashboard.ts"
      to: "src/rendering/slug.ts"
      via: "stableSlug used to generate heading anchor for blocker provenance ref"
      pattern: "stableSlug\\(blocker\\.heading\\)"
    - from: "src/presentation/dashboard.ts"
      to: "src/presentation/routes.ts"
      via: "sourceDestination passing heading anchor to buildArtifactUrl"
      pattern: "buildArtifactUrl\\(null, path, heading"
    - from: "src/web/pages/dashboard-page.tsx"
      to: "src/web/components/inline-markdown.tsx"
      via: "InlineMarkdown used to render description and detail paragraphs"
      pattern: "<InlineMarkdown"
---

# Quick 260912-lfi: Scroll to blocker in project state from source link, and render markdown without raw asterisks in dashboard

<objective>
Enable seamless navigation from the dashboard's blocker items directly to the blockers section in `STATE.md` with smooth scrolling to the heading anchor, and replace raw inline Markdown delimiters (like `**` and backticks) across dashboard item descriptions and details with clean, semantic, safely-rendered HTML elements.

Locked user decisions:
- Blocker provenance from `STATE.md` includes the heading anchor slug for the blockers section (e.g. `#blockersconcerns`).
- `sourceDestination` preserves and forwards hash anchors to `buildArtifactUrl` for artifact links.
- "View state source" navigates to `/artifacts/a~.planning~STATE.md#blockersconcerns`, and `artifact-page.tsx` scrolls to that section using `scrollWhenSettled`.
- Render inline Markdown formatting (`<strong>`, `<code>`, `<em>`, `<del>`) rather than leaving raw markdown syntax or stripping to plain text.
- Applies to dashboard item descriptions and details (NextWork description, AttentionItem detail, discrepancy details).
- Preserve existing emoji stripping (`stripEmoji`), applying it prior to rendering inline markdown.
- Production assets must be rebuilt with `npm run build` upon completion.

Task-local requirement IDs:
- LFI-01: Blocker source link navigation and scroll target (anchor preservation, provenance slugging, and settle scroll).
- LFI-02: Safe inline Markdown rendering across dashboard cards and token-compliant typography styling.
</objective>

<context>
- `src/presentation/dashboard.ts`:
  - `attentionItems`: creates blocker items with `provenance: { kind: 'state', ref: blocker.sourcePath }`. `ProjectBlockerDto` already contains `heading: string`.
  - `sourceDestination`: currently does `const [path] = provenance.ref.split('#')` and calls `buildArtifactUrl(null, path)`, discarding any hash anchor.
  - `stableSlug` in `src/rendering/slug.ts` is the canonical zero-dependency heading slug function (`Blockers/Concerns` -> `blockersconcerns`).
- `src/presentation/routes.ts`:
  - `buildArtifactUrl(identity, artifactPath, heading)` already supports a heading argument and uses `withHeading(path, heading)`.
  - `parsePresentationUrl` parses `#heading` into route's `heading` field.
- `src/web/pages/artifact-page.tsx`:
  - Mount effect uses `scrollWhenSettled` with `window.location.hash.slice(1)` to scroll to the heading element matching the decoded target ID.
- `src/web/pages/dashboard-page.tsx`:
  - `NextWork`: renders `<p>{item.description}</p>`.
  - Discrepancy callout: renders `<p>{discrepancy.detail}</p>`.
  - Attention list: renders `<p>{stripEmoji(item.detail)}</p>`.
- `src/web/styles/globals.css`:
  - `.attention-list strong` and `.next-primary strong` currently declare `display: block;` for card titles. Strong elements inside `<p>` must be reset to `display: inline` with token-compliant font weight and colors.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Preserve and resolve blocker heading anchor in provenance, routes, and artifact scroll target</name>
  <files>src/presentation/dashboard.ts, src/presentation/routes.ts, src/web/pages/artifact-page.tsx, test/presentation/dashboard.test.ts</files>
  <precondition>node_modules present, test suite baseline verified.</precondition>
  <read_first>src/presentation/dashboard.ts, src/presentation/routes.ts, src/rendering/slug.ts, src/web/pages/artifact-page.tsx, test/presentation/dashboard.test.ts, test/web/attention-row-contract.test.ts</read_first>
  <behavior>
    - When `presentation.blockers` items have a non-empty `heading`, their `AttentionItem.provenance.ref` includes the heading anchor `#${stableSlug(blocker.heading)}`. For example, `Blockers/Concerns` in `.planning/STATE.md` produces ref `.planning/STATE.md#blockersconcerns`.
    - `sourceDestination` extracts any `#heading` fragment from `provenance.ref` and passes the heading to `buildArtifactUrl(null, path, heading)`.
    - `sourceDestination` for `.planning/STATE.md#blockersconcerns` returns `/artifacts/a~.planning~STATE.md#blockersconcerns`.
    - `withHeading` in `src/presentation/routes.ts` normalizes headings by stripping any accidental leading `#` before encoding.
    - `DocumentView` in `src/web/pages/artifact-page.tsx` triggers `scrollWhenSettled` on mount when a hash anchor is present in the URL, scrolling smoothly to the heading matching the slug.
  </behavior>
  <action>
    1. RED: In `test/presentation/dashboard.test.ts`, add test cases asserting that:
       - Blocker attention items populate `provenance.ref` with `#${stableSlug(blocker.heading)}` when `blocker.heading` is present.
       - `sourceDestination(item.provenance)` resolves to `/artifacts/a~.planning~STATE.md#<slug>`.
       - Blocker with heading `'Blockers/Concerns'` yields `/artifacts/a~.planning~STATE.md#blockersconcerns`.
       Run vitest to confirm failure.
    2. GREEN:
       - In `src/presentation/routes.ts`: In `withHeading`, sanitize `heading`: strip any leading `#` (`const clean = heading.replace(/^#+/, '')`), ensuring non-empty check and encoding.
       - In `src/presentation/dashboard.ts`:
         - Import `stableSlug` from `../rendering/slug.ts`.
         - In `sourceDestination`: split `provenance.ref` on `#`. If a hash exists, pass `hash` as the 3rd argument to `buildArtifactUrl(null, path, hash)`.
         - In `attentionItems`: when constructing blocker items, set `ref: blocker.heading ? `${blocker.sourcePath}#${stableSlug(blocker.heading)}` : blocker.sourcePath`.
       - In `src/web/pages/artifact-page.tsx`:
         - Verify that `DocumentView` effect includes `window.location.hash` or location hash in its dependencies so that navigation to an anchor always engages `scrollWhenSettled`.
    3. Run `npx vitest run test/presentation/dashboard.test.ts test/web/attention-row-contract.test.ts test/presentation/routes.test.ts` to confirm all tests pass.
  </action>
  <verify>
    - `npx vitest run test/presentation/dashboard.test.ts` passes.
    - `npx vitest run test/web/attention-row-contract.test.ts` passes.
    - `npx vitest run test/presentation/routes.test.ts` passes.
  </verify>
  <acceptance_criteria>
    - `test/presentation/dashboard.test.ts` contains assertions verifying `sourceDestination` preserves heading hash anchors on blocker provenance.
    - `sourceDestination({ kind: 'state', ref: '.planning/STATE.md#blockersconcerns' })` returns `'/artifacts/a~.planning~STATE.md#blockersconcerns'`.
  </acceptance_criteria>
</task>

<task type="primary" tdd="true">
  <name>Task 2: Implement InlineMarkdown component, integrate into dashboard items, style token-compliantly, and rebuild</name>
  <files>src/web/components/inline-markdown.tsx, src/web/pages/dashboard-page.tsx, src/web/styles/globals.css, test/web/inline-markdown.test.ts, test/web/strip-emoji.test.ts, test/web/visual-contract.test.ts</files>
  <precondition>Task 1 complete.</precondition>
  <read_first>src/web/pages/dashboard-page.tsx, src/web/pages/strip-emoji.ts, src/web/styles/globals.css, test/web/strip-emoji.test.ts, test/web/visual-contract.test.ts, test/token-guard.test.ts</read_first>
  <behavior>
    - `InlineMarkdown` parses and renders inline formatting without emitting raw delimiters:
      - `` `code` `` renders `<code>code</code>`
      - `**bold**` or `__bold__` renders `<strong>bold</strong>`
      - `*italic*` or word-boundary `_italic_` renders `<em>italic</em>`
      - `***both***` renders `<strong><em>both</em></strong>`
      - `~~strike~~` renders `<del>strike</del>`
      - Nested spans such as `**bold with `code` inside**` render `<strong>bold with <code>code</code> inside</strong>`
      - Real-world example `**Vercel TLS cert for `studio.cinedise.com` expires 2026-10-14, and renewal will fail silently.**` renders without raw asterisks
      - Snake_case words like `my_variable_name` and unmatched asterisks like `2 * 3 = 6` remain plain text
    - `NextWork` description renders `<InlineMarkdown text={item.description} />`.
    - Attention item detail renders `<InlineMarkdown text={stripEmoji(item.detail)} />`.
    - Discrepancy detail renders `<InlineMarkdown text={discrepancy.detail} />`.
    - In `src/web/styles/globals.css`, `.dashboard-page p strong` is styled `display: inline; margin-top: 0; font-family: inherit; font-size: inherit; font-weight: var(--fw-semibold); color: var(--foreground);`.
    - `.dashboard-page p code` is styled with tokens: `background: var(--secondary); padding: var(--space-0-5) var(--space-1); border-radius: var(--radius-sm); color: var(--secondary-foreground); font-family: var(--font-heading); font-size: var(--fs-3);`.
    - `test/token-guard.test.ts` passes with zero violations.
    - `npm run build` succeeds, generating updated production bundles in `dist/`.
  </behavior>
  <action>
    1. Create `test/web/inline-markdown.test.ts`:
       - Unit tests for `parseInlineMarkdown` / `InlineMarkdown`:
         - Bold `**text**` and `__text__`
         - Code `` `text` ``
         - Italic `*text*` and `_text_`
         - Nested bold and code: `**Vercel TLS cert for `studio.cinedise.com` expires 2026-10-14, and renewal will fail silently.**`
         - Unmatched asterisks: `2 * 3 = 6`
         - Snake_case variables: `ident_with_underscore` not broken
         - Empty or whitespace strings.
       Run vitest to see failures.
    2. Create `src/web/components/inline-markdown.tsx`:
       - Implement a clean regex-based tokenizer that identifies the earliest delimiter among:
         - code `` `([^`\n]+)` `` (code content is plain text, never formatted)
         - strong-em `\*\*\*([^\n]+?)\*\*\*`
         - strong `\*\*([^\n]+?)\*\*` or `__([^\n]+?)__`
         - em `\*([^\n*]+?)\*` or `(?<=^|\s|[(])_([^\n_]+?)_(?=$|\s|[),.:;!?])`
         - strike `~~([^\n~]+?)~~`
       - Emits semantic JSX elements (`<strong>`, `<code>`, `<em>`, `<del>`) with recursive parsing for non-code elements.
       - Export `<InlineMarkdown text={text} />` component and `parseInlineMarkdown(text: string)`.
    3. In `src/web/pages/dashboard-page.tsx`:
       - Import `InlineMarkdown` from `../components/inline-markdown.tsx`.
       - In `NextWork`: replace `<p>{item.description}</p>` with `<p><InlineMarkdown text={item.description} /></p>`.
       - In Discrepancy callout: replace `<p>{discrepancy.detail}</p>` with `<p><InlineMarkdown text={discrepancy.detail} /></p>`.
       - In Attention list: replace `<p>{stripEmoji(item.detail)}</p>` with `<p><InlineMarkdown text={stripEmoji(item.detail)} /></p>`.
    4. In `src/web/styles/globals.css`:
       - Add rules for `.dashboard-page p strong` and `.dashboard-page p code` ensuring inline layout and strictly using design tokens.
    5. Update contract tests:
       - In `test/web/strip-emoji.test.ts`: update source check to expect `<InlineMarkdown text={stripEmoji(item.detail)} />` and `<InlineMarkdown text={item.description} />`.
       - In `test/web/visual-contract.test.ts`: update source check line 262 to expect `<InlineMarkdown text={item.description} />`.
    6. Run tests and typecheck:
       - `npx vitest run test/web/inline-markdown.test.ts test/web/strip-emoji.test.ts test/web/visual-contract.test.ts test/token-guard.test.ts`
       - `npm run typecheck`
       - `npm run build`
  </action>
  <verify>
    - `npx vitest run test/web/inline-markdown.test.ts` passes.
    - `npx vitest run test/web/strip-emoji.test.ts` passes.
    - `npx vitest run test/web/visual-contract.test.ts` passes.
    - `npx vitest run test/token-guard.test.ts` passes.
    - `npm run typecheck` passes.
    - `npm run build` exits 0.
  </verify>
  <acceptance_criteria>
    - `src/web/components/inline-markdown.tsx` exists and exports `InlineMarkdown`.
    - `src/web/pages/dashboard-page.tsx` uses `<InlineMarkdown` for NextWork, Attention items, and discrepancy details.
    - `test/web/inline-markdown.test.ts` passes with test cases for bold, code, and nested formatting.
    - `npm run build` succeeds without error.
  </acceptance_criteria>
</task>

</tasks>
