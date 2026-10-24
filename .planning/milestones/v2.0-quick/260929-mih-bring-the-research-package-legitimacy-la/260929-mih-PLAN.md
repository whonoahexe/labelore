---
phase: quick-260929-mih
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/web/views/research-briefing-components.tsx
  - src/web/styles/globals.css
  - test/web/research-briefing.test.ts
  - test/web/research-view-contract.test.ts
  - test/token-guard.test.ts
  - docs/design-language.md
autonomous: true
requirements: [MIH-01, MIH-02, MIH-03, MIH-04, MIH-05, MIH-06, MIH-07, MIH-08]

estimate:
  tokens: 80000
  raw_tokens: 80000
  tasks: 2
  confidence: low

must_haves:
  truths:
    - "On labelore P2 (http://127.0.0.1:5190, 0 SLOP, 12 SUS), the Removed · slop lane keeps its missing tone even with 0 items. It has a 3px inset missing top rule, a border in --missing-border (not --missing-fill), and title and count in --missing-fill. Its body reads 'Nothing removed.'"
    - "On studio-portal P2 (http://127.0.0.1:5180, all OK), both empty lanes keep their tone. Removed is toned as above. Flagged has the 3px in-flight top rule and an in-flight title and count, and its body reads 'Nothing flagged.' An empty Approved lane would read 'Nothing approved.'"
    - "The lane pagination rows read 'Show N more removed|flagged|approved ▾' and 'Show fewer ▴'. The seam toggle reads 'Show the seam output (N rows) ▾' and 'Hide the seam output (N rows) ▴'. Each caret is aria-hidden, so accessible names such as 'Show 8 more flagged' are unchanged. Both controls hover to --primary. The Patterns 'source' link, which shares .view-research-link, keeps its --foreground hover."
    - "Inside the Package legitimacy block only, inline code renders as a mono chip on a --muted wash, at 0.88em with --space-0-5 side padding. That covers the audit intro, the Flagged lane note, item reasons, the replacement row and the extra notes. Code elsewhere on the RESEARCH page, and the seam table's package names, are unchanged."
    - "Lane item dividers are a 55% --border hairline. Names in the Approved dispositions list are at --fs-3. A removed item's replacement row reads 'Use instead' (mono uppercase --fs-1 muted label), followed by the replacement at --fs-3 in the foreground colour."
    - "The notes after the lanes (Postinstall scripts / Frontend on studio-portal P2) stack tightly at --fs-3 in the muted foreground, with no gap between lines and no 72ch cap."
    - "Light and dark both match the sketch, at 1400px and at 420px, with no horizontal overflow. Only theme tokens and design-language tones are used, never --destructive. The token guard, class vocabulary, research-view contract and traceability missing-chip contract all pass."
  artifacts:
    - path: "src/web/views/research-briefing-components.tsx"
      provides: "The exported AuditBlock (root class view-research-sub view-research-audit). Lane empty copy is built from the noun. Carets are aria-hidden. There is a 'Use instead' replacement row (.view-research-lane-use), the .view-research-audit-notes wrapper and the .view-research-seam-toggle button."
      contains: "Use instead"
    - path: "src/web/styles/globals.css"
      provides: "The :root tokens --missing-border, --border-faint and --code-veil. The lane / show-more / seam-toggle / use-row / notes / code-chip rules, edited in place inside the quick-260929-3x3 block. The empty-lane de-toning override is removed."
      contains: "--missing-border:"
    - path: "test/web/research-briefing.test.ts"
      provides: "AuditBlock render cases through react-dom/server renderToStaticMarkup, using the SP02_SHAPE, LB v1.0/02 and SYNTHETIC_SLOP audits"
      contains: "renderToStaticMarkup"
    - path: "test/web/research-view-contract.test.ts"
      provides: "CSS source contract: the Removed lane is always toned on --missing-border, no empty-lane override exists, and the seam toggle has its own --primary hover"
      contains: "--missing-border"
    - path: "test/token-guard.test.ts"
      provides: "One ALLOWLIST entry for the em-relative inline-code chip size inside the audit block"
      contains: ".view-research-audit :not(td) > code"
    - path: "docs/design-language.md"
      provides: "The legitimacy-audit bullet and the RESEARCH accent-reservation bullet, updated to the sketch-faithful lanes"
      contains: "Nothing removed."
  key_links:
    - from: "src/web/styles/globals.css :root --missing-border"
      to: ".view-research-lane[data-verdict='slop'] and .status-chip[data-tone='missing']"
      via: "Both rules use border-color: var(--missing-border). Leaving the chip on the inline recipe would trip the token guard's check that a recipe must not duplicate a token definition."
      pattern: "var\\(--missing-border\\)"
    - from: "AuditBlock root className view-research-audit"
      to: ".view-research-audit :not(td) > code chip rule"
      via: "The block-scoped descendant selector. The seam table's td > code is excluded."
      pattern: "view-research-audit"
    - from: "Lane noun prop"
      to: "The empty-lane copy and the show-more label"
      via: "Nothing {noun}. / Show {more} more {noun}"
      pattern: "Nothing \\$\\{noun\\}"
---

<objective>
Bring the RESEARCH page's Package legitimacy block back in line with sketch 010's winner, B ("lanes by verdict"). The user said: "package legitimacy at the moment does not look like how it was during the sketch".

Purpose: the orchestrator compared the sketch with the live page side by side and verified ten differences. Every one gets fixed toward the sketch. Commit 62ab188 was an automated UI pass, not a user decision. It stripped the tone from empty lanes, and that is reverted. The copy, carets, hover colour, inline-code chips, hairlines and note stacking return to the sketch. The [VERIFIED] evidence superscripts stay (page-wide, intentional). So do the lane grid proportions, lane head, signals, struck names and approved chips, which already match.

Colour decisions (Claude's discretion, within design-language rules):
- --missing-border becomes a real :root token, mirroring --in-flight-border (missing-fill 50% toward --border). The sketch theme defines it the same way. No new hue.
- The two sketch-only mixes, the lane hairline (--border at 55%) and the code wash (--muted at 70%), become named :root recipes, --border-faint and --code-veil. The 3x3 CSS block may not contain color-mix() (research-view-contract).
- The chip's em-relative size gets one token-guard ALLOWLIST entry. The design language forbids adding a type step, and the existing .artifact-document inline-code rule sets the precedent (0.86em, already allowlisted).

Output: the component markup and copy, the CSS and tokens, render tests and CSS contract tests, one allowlist entry, the design-language note, and after-screenshots of both documents in both themes at both widths.
</objective>

<execution_context>
@~/.claude/gsd-core/workflows/execute-plan.md
@~/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.claude/CLAUDE.md
@docs/design-language.md
@.planning/sketches/010-legitimacy-audit/README.md

Sketch reference: .planning/sketches/010-legitimacy-audit/index.html. The shared CSS (the code rule, .link-btn, .mono-note, .sig) is at L27, L47 and L57–62. Variant B's CSS is at L93–116. The helpers capped/moreBtn/fullTable are at L174–195, and variantB is at L196–211.

Live source (line numbers as of 8b9354b):
- src/web/views/research-briefing-components.tsx: Lane at L518 (it already takes a noun prop: 'removed' / 'flagged' / 'approved'), FlaggedItems at L589, ApprovedItems at L619, AuditBlock at L636 (not exported; root div.view-research-sub). The Patterns chapter also uses .view-research-link, for its per-pattern "source" button (L423), so that class is shared. The 'Use when' row at L415 is the precedent for a .view-research-key label followed by ResearchInline.
- src/web/styles/globals.css: the colour-recipe tokens are in the first :root (L53–145), with --in-flight-border at L124 and --missing-fill at L129. .status-chip[data-tone='missing'] is at L4524 and uses the inline recipe that --missing-border will name. .view-research-link and its :hover are at L6696/L6708. The lane rules are at L7001–7175 (the slop lane at L7014, .view-research-lane-more and its :hover at L7153/L7169). The empty-lane override from 62ab188 is at L7581–7592. The quick-260929-3x3 block runs L5954–L7614. Edit inside it, in place, and do not open a new block.
- test/web/research-briefing.test.ts: the helpers composeFrom (L229), chapterOf (L235) and lb02() are already there, and SP02_SHAPE, SYNTHETIC_SLOP and NA_AUDIT are imported from test/helpers/research-fixtures.ts.

Planning-time facts:
- Vitest runs in the node environment and can import src/web/views/research-briefing-components.tsx and SSR-render it with react-dom/server's renderToStaticMarkup plus React's createElement. A probe confirmed it at planning time. Test files are .ts (the include is test/**/*.test.ts), so use createElement, not JSX. react-dom is already a dependency, so nothing gets installed.
- test/token-guard.test.ts flags any em/rem/px font-size outside the token blocks unless its exact selector + property + value is in ALLOWLIST (the entry for `.artifact-document :not(pre) > code` 0.86em is the precedent). It also flags a color-mix() usage that repeats elsewhere or that equals a token's definition.
- test/web/research-view-contract.test.ts: the 3x3 block may contain no color-mix(, no --destructive/--warning, no raw colour and no radius.
- test/web/traceability-redesign-contract.test.ts L319: the missing chip block must still contain var(--missing-fill). Switching only its border-color keeps this passing.
- E2E: test/e2e/research-briefing.spec.ts L51–52 selects getByRole('button', { name: 'Show 8 more flagged' }). The carets are aria-hidden, so that name does not change. No e2e spec selects the old empty-lane copy, the old seam-toggle wording or the old replacement label. So per the user's standing rule, no e2e spec runs.
- Dev servers are already running and hot-reload. Do NOT restart or kill them. Theme is set with localStorage 'labelore-theme' ('light' | 'dark').
  - LB (labelore P2): http://127.0.0.1:5190/milestones/m~v1.0/phases/p~vv1.0~n~v02~vsituational-awareness-artifact-reading/artifacts/a~.planning%2Fmilestones%2Fv1.0-phases%2F02-situational-awareness-artifact-reading%2F02-RESEARCH.md
  - SP (studio-portal P2): http://127.0.0.1:5180/milestones/m~v1.0/phases/p~vv1.0~n~v02~vstorage-health-status/artifacts/a~.planning%2Fmilestones%2Fv1.0-phases%2F02-storage-health-status%2F02-RESEARCH.md
- Before-screenshots (dark, 1400): the sketch is in .playwright-mcp/legit-sketch-lab02.png and legit-sketch-sp02.png, and the live page in .playwright-mcp/legit-live-lab02.png and legit-live-sp02.png. .playwright-mcp/ is gitignored.
</context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1 (tracer): sketch-faithful lane markup and copy, empty lanes keep their tone, Removed lane on --missing-border</name>
  <files>src/web/views/research-briefing-components.tsx, src/web/styles/globals.css, test/web/research-briefing.test.ts, test/web/research-view-contract.test.ts</files>
  <behavior>
    In test/web/research-briefing.test.ts, add a new describe 'AuditBlock render (sketch 010 B)'. Each case renders renderToStaticMarkup(createElement(AuditBlock, { audit })), where audit is chapterOf(composed, 'stack').audit (throw if null):
    - SP02_SHAPE (composeFrom(SP02_SHAPE)): the root carries class "view-research-sub view-research-audit". The html contains 'Nothing removed.' and 'Nothing flagged.' and never the old one-word empty copy (assert not.toContain('>None.<')). It contains 'Show the seam output (4 rows)' followed by an aria-hidden '▾' span. The two extra notes sit inside one div.view-research-audit-notes as two plain p elements. The intro's code renders as <code>gsd-tools query package-legitimacy check --ecosystem crates</code> (MIH-01, MIH-04, MIH-07).
    - LB v1.0/02 (composeResearchBriefing(inputOf(lb02()))): the html contains 'Show 8 more flagged' and 'Show 14 more approved', each followed by <span aria-hidden="true">▾</span>. The slop section (data-verdict="slop") contains 'Nothing removed.'. The html contains 'Show the seam output (30 rows)' (MIH-01, MIH-04).
    - SYNTHETIC_SLOP (composed through the same Standard Stack wrapper string as the existing 'SYNTHETIC_SLOP: one removed item' case): the html contains a span.view-research-lane-use holding <span class="view-research-key">Use instead</span> and then <code>left-pad</code>. It does not contain 'Replaced by'. The struck name carries data-struck="true" (MIH-06).
    In test/web/research-view-contract.test.ts, add an it 'legitimacy lanes stay toned when empty and outline Removed on --missing-border' that reads src/web/styles/globals.css (MIH-01, MIH-02):
    - :root declares --missing-border: color-mix(in oklch, var(--missing-fill) 50%, var(--border)).
    - The .view-research-lane[data-verdict='slop'] { … } block contains border-color: var(--missing-border) and inset 0 3px 0 var(--missing-fill).
    - The .status-chip[data-tone='missing'] { … } block contains var(--missing-border).
    - The css contains no selector starting '.view-research-lane:has(' (the empty-lane override is gone).
  </behavior>
  <action>
    RED first: write the behavior cases above, run npx vitest run test/web/research-briefing.test.ts test/web/research-view-contract.test.ts, and confirm they fail because AuditBlock is not exported and the copy and CSS are not changed yet. Commit as test(views): legitimacy lanes match sketch 010 B.

    Markup (src/web/views/research-briefing-components.tsx), per sketch 010 variantB:
    - Export AuditBlock as a named export. Add a one-line comment saying it is exported for the render cases in test/web/research-briefing.test.ts. Give its root div the classes view-research-sub view-research-audit. The second class is the scope hook for Task 2's inline-code chip and sits in the auto-allowed view-research-* namespace.
    - Lane: the empty body becomes the template literal Nothing ${noun}. The noun is already threaded through (removed / flagged / approved), so this yields 'Nothing removed.' / 'Nothing flagged.' / 'Nothing approved.' (MIH-01).
    - Lane pagination button: keep the label text exactly ('Show fewer', or 'Show {more} more {noun}'), then a space, then <span aria-hidden="true"> holding ▴ when open and ▾ when closed. The accessible name stays e.g. 'Show 8 more flagged', so e2e L51 keeps matching (MIH-04).
    - FlaggedItems: the replacement row becomes a span with class view-research-lane-use. It holds a span.view-research-key reading 'Use instead', a space, then ResearchInline(item.replacement). This mirrors the 'Use when' row in the Patterns chapter. The reason and disposition rows stay on view-research-lane-why (MIH-06).
    - AuditBlock extra notes: when audit.extraNotes.length > 0, render one div.view-research-audit-notes. Inside it, each note is a plain p (no class) whose content is ResearchInline(note). Render nothing when the list is empty. The prose fallback for a 'Not applicable' audit (no lanes) keeps its view-research-note paragraphs unchanged (MIH-07).
    - Seam toggle: give the button the classes view-research-link view-research-seam-toggle. The text is '{Hide|Show} the seam output ({n} rows)', then a space, then an aria-hidden span holding ▴ when open and ▾ when closed. The table markup under it is unchanged (MIH-04).

    CSS (src/web/styles/globals.css):
    - In the first :root, directly after --missing-fill, add --missing-border: color-mix(in oklch, var(--missing-fill) 50%, var(--border)). Comment it as the missing tone softened toward the border, mirroring --in-flight-border: it outlines the missing chip and the RESEARCH Removed lane (sketch 010 B). Do not redeclare it in .dark. It resolves on html like --in-flight-border does (MIH-02).
    - .status-chip[data-tone='missing'] (L4524): set border-color to var(--missing-border). This is required: the token guard flags a usage whose recipe equals a token definition. Keep color: var(--missing-fill).
    - .view-research-lane[data-verdict='slop'] (L7014): set border-color to var(--missing-border). Keep the inset 3px --missing-fill box-shadow (MIH-02).
    - Delete both .view-research-lane:has(> .view-research-lane-empty) rules and their comment at L7581–7592. Empty lanes then keep their tone exactly as the sketch does: the Removed lane always has its border, top rule and missing title/count, and the Flagged lane always has its in-flight top rule and title/count (MIH-01).
    Then run the verify and commit as fix(views): legitimacy lanes keep their tone and sketch copy.
  </action>
  <verify>
    <automated>npx vitest run test/web/research-briefing.test.ts test/web/research-view-contract.test.ts test/token-guard.test.ts test/web/class-vocabulary.test.ts test/web/traceability-redesign-contract.test.ts && npm run typecheck</automated>
  </verify>
  <done>
    - All the new render and CSS-contract cases pass, and the existing research-briefing cases stay green.
    - On the LB and SP live pages (hot-reloaded), the Removed lane shows its missing border, top rule and heading at 0 items and reads 'Nothing removed.'. On SP, the Flagged lane shows its in-flight rule and heading and reads 'Nothing flagged.'. Show-more rows and the seam toggle carry their carets.
    - The token guard, class vocabulary, the traceability missing-chip contract and typecheck are green.
  </done>
</task>

<task type="auto">
  <name>Task 2: code chips, hover accent, hairlines, the Use instead row and note stacking, plus the design-language note and a visual pass against the sketch</name>
  <files>src/web/styles/globals.css, test/token-guard.test.ts, test/web/research-view-contract.test.ts, docs/design-language.md</files>
  <action>
    Tokens (the first :root in src/web/styles/globals.css, next to the named colour recipes), so the 3x3 block stays free of color-mix():
    - --border-faint: color-mix(in oklch, var(--border) 55%, transparent). Comment it as a hairline one step quieter than --border: the RESEARCH legitimacy lanes' item dividers (sketch 010 B) (MIH-05).
    - --code-veil: color-mix(in oklch, var(--muted) 70%, transparent). Comment it as the sketch-010 inline-code wash (MIH-03).
    - Before adding each one, grep globals.css for the same recipe string. If it already appears in a usage rule, switch that rule to the new token too. Otherwise the recurring-recipe check fails.

    Rules. Edit them in place inside the quick-260929-3x3 block. Tokens only, per test/token-guard.test.ts:
    - .view-research-lane-items li: set border-bottom to 1px solid var(--border-faint) (MIH-05).
    - .view-research-approved-notes .view-research-lane-name: add font-size: var(--fs-3). This matches the sketch's fs-3 names in the dispositions list (MIH-05).
    - .view-research-lane-use: add display block, color var(--foreground), font-size var(--fs-3) and overflow-wrap anywhere. The .view-research-key label inside it already gives the mono uppercase --fs-1 muted label (MIH-06).
    - .view-research-lane-more: add transition: color 0.15s ease, background-color 0.15s ease. Change its :hover color to var(--primary), and keep background var(--state-hover) (MIH-04).
    - Add .view-research-seam-toggle:hover { color: var(--primary); } after the lane rules. It must sit later in source than .view-research-link:hover (L6708), since both have equal specificity. Also give .view-research-seam-toggle the same transition as above. Leave .view-research-link and its :hover untouched, so the Patterns source link keeps its --foreground hover (MIH-04).
    - .view-research-audit-notes: color var(--muted-foreground), font-size var(--fs-3), min-width 0, overflow-wrap anywhere, and no max-width. Add .view-research-audit-notes p with margin 0, so consecutive notes stack with no gap. That matches the sketch's .a-none lines (MIH-07).
    - .view-research-audit :not(td) > code: padding 0 var(--space-0-5), background var(--code-veil), font-family var(--font-mono), font-size 0.88em. The ':not(td) >' part excludes the seam table's package-name code cells, which are plain mono in the sketch. Do not set a colour, so the chip inherits the muted colour in the intro and notes and the foreground in the Use instead row (MIH-03).
    - test/token-guard.test.ts: append an ALLOWLIST entry with selector '.view-research-audit :not(td) > code', property 'font-size' and value '0.88em'. Its reason: em-relative inline-code chip in the legitimacy block (sketch 010), scaling with its host line (--fs-3 intro and notes, --fs-2 lane note), the same idiom as .artifact-document :not(pre) > code. The selector string must match the CSS rule's prelude exactly (MIH-03).
    - test/web/research-view-contract.test.ts: extend Task 1's it, or add one. It asserts that .view-research-seam-toggle:hover sets var(--primary), that .view-research-lane-more:hover sets var(--primary), that the .view-research-link:hover block still sets var(--foreground), and that :root declares --border-faint and --code-veil (MIH-03, MIH-04, MIH-05).

    Design language (docs/design-language.md) (MIH-08):
    - "The legitimacy audit is lanes by verdict" bullet: say that the pagination reads "Show N more removed / flagged / approved ▾" and "Show fewer ▴", with the caret aria-hidden. Say that an empty lane keeps its tone (Removed keeps its --missing-border outline, missing top rule and heading; Flagged keeps its in-flight top rule and heading) and reads "Nothing removed." / "Nothing flagged." / "Nothing approved.". Also cover: a removed item's replacement reads "Use instead"; lane items sit on --border-faint hairlines; inline code inside the block is a mono chip on --code-veil; the notes after the lanes stack tightly at --fs-3; and the toggle reads "Show the seam output (N rows) ▾". Tag the bullet quick-260929-mih.
    - "The 10% accent reservation extends to the RESEARCH briefing" bullet: add that the hover colour of the legitimacy lanes' Show more / Show fewer rows and of the seam-output toggle takes --primary (sketch 010 B). Nothing else in the audit block does.

    Visual pass. Write a headless Playwright script at .playwright-mcp/legit-check.mjs (gitignored; import chromium from '@playwright/test'). Do not run the e2e suite. For each of LB and SP × dark and light × 1400x900 and 420x900, the script:
    1. Sets localStorage 'labelore-theme' through addInitScript, opens the URL and waits for .view-research-audit.
    2. Takes an element screenshot of .view-research-audit to .playwright-mcp/legit-after-{lab02|sp02}-{dark|light}-{1400|420}.png.
    3. Asserts, and exits non-zero on any failure:
       - The slop lane's computed box-shadow contains 'inset'.
       - The slop lane's border-top-color differs from the Approved lane's.
       - The slop lane title's computed color differs from the Approved lane title's.
       - The slop lane's empty text equals 'Nothing removed.'.
       - On SP, the sus lane's empty text equals 'Nothing flagged.', and its title colour also differs from Approved.
       - At least one .view-research-audit :not(td) > code has a background colour other than rgba(0, 0, 0, 0).
       - At 420 wide, document.documentElement.scrollWidth <= window.innerWidth.
       - On LB, after hovering the first .view-research-lane-more and waiting 300ms, its computed color equals that of a probe element styled color: var(--primary).
    Then Read the dark 1400 after-shots next to .playwright-mcp/legit-sketch-lab02.png and legit-sketch-sp02.png, and confirm all ten differences are closed. Also check the light and 420 shots for parity and legibility. If a value needs tuning, move at most one token step, and record it in the SUMMARY.
    Run the verify, then commit as fix(views): legitimacy block chips, hover accent and hairlines per sketch 010 B.
  </action>
  <verify>
    <automated>npx vitest run test && npm run typecheck && npm run lint && git diff --quiet 8b9354b -- test/e2e src/planning-repo && node .playwright-mcp/legit-check.mjs</automated>
    <human-check>The user opens the LB and SP pages (or the eight legit-after-*.png files) beside the sketch at .planning/sketches/010-legitimacy-audit/ (variant B). Check that the lanes, empty-lane tone, carets, code chips, hairlines and note stacking read as in the sketch.</human-check>
  </verify>
  <done>
    - All ten sketch differences are closed on the live pages in both themes at 1400 and 420 wide, and the legit-check script exits 0.
    - The full vitest suite, typecheck and lint are green. The e2e specs and the server extractor are unchanged.
    - docs/design-language.md describes the sketch-faithful lanes and the extra --primary hover reservation.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| target .planning/ markdown → RESEARCH briefing DOM | Untrusted document text (the replacement, reasons, notes and intro) reaches React only through ResearchInline's text tokens |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-mih-01 | Tampering | FlaggedItems 'Use instead' row and the .view-research-audit-notes paragraphs | medium | mitigate | Render the replacement and every note only through ResearchInline (tokenized text/strong/em/code, no raw HTML). The existing research-view-contract case already forbids the raw-HTML injection prop in research-briefing-components.tsx and runs in both verifies. |
| T-mih-02 | Information disclosure | Exporting AuditBlock | low | accept | It is a pure presentational component with no filesystem or network access. Exporting it only widens test reach. The read-only repository boundary is untouched. |
| T-mih-SC | Tampering | npm/pip/cargo installs | high | accept | This plan installs nothing. react-dom/server and @playwright/test are already dependencies. Any new install task would require the package-legitimacy gate. |
</threat_model>

<verification>
- npx vitest run test is green. That covers the new AuditBlock render cases, the CSS contract cases, the token guard with the single new ALLOWLIST entry, class vocabulary, and the traceability missing-chip contract.
- npm run typecheck and npm run lint are green.
- git diff 8b9354b -- test/e2e src/planning-repo is empty. No e2e spec ran.
- node .playwright-mcp/legit-check.mjs exits 0, and there are eight legit-after-*.png files, reviewed against the sketch shots.
</verification>

<success_criteria>
The Package legitimacy block on both live documents reads as sketch 010 B. Empty lanes keep their Removed and Flagged tones and read "Nothing removed/flagged.". The Removed outline sits on --missing-border. The carets and --primary hover are on pagination and the seam toggle. Inline code in the block is chipped. Lane hairlines are soft. Approved notes are at --fs-3. The replacement row reads "Use instead". The notes after the lanes stack tightly. Everything is token-clean in light and dark at 1400 and 420, and the design language records it.
</success_criteria>

<source_audit>
| Source | Item | Covered by |
|--------|------|------------|
| GOAL | Package legitimacy looks like sketch 010 B again | Task 1 (markup, tone) + Task 2 (styling, visual pass) |
| Finding 1 | Empty lanes keep their missing / in-flight tone; the 62ab188 override is removed (no test asserted it; a planning-time grep of test/ for lane-empty found nothing) | Task 1 CSS delete + contract case (MIH-01) |
| Finding 2 | Removed lane border on --missing-border | Task 1 token + slop lane + chip switch (MIH-02) |
| Finding 3 | "Nothing removed/flagged/approved." threaded through Lane's noun | Task 1 Lane + render cases (MIH-01) |
| Finding 4 | Inline code chip scoped to the audit block, token-guard compliant | Task 1 scope class + Task 2 chip rule, --code-veil, allowlist (MIH-03) |
| Finding 5 | Show N more … ▾ / Show fewer ▴, hover --primary | Task 1 carets + Task 2 hover (MIH-04) |
| Finding 6 | Seam output toggle copy and caret; scoped modifier, since .view-research-link is shared | Task 1 copy/class + Task 2 hover (MIH-04) |
| Finding 7 | Lane item dividers at a 55% border mix | Task 2 --border-faint (MIH-05) |
| Finding 8 | 'Use instead' row: mono label + fs-3 foreground replacement, unit-covered with SYNTHETIC_SLOP | Task 1 markup + render case, Task 2 style (MIH-06) |
| Finding 9 | Approved dispositions names at fs-3 | Task 2 rule (MIH-05) |
| Finding 10 | Extra notes fs-3 muted, tight, uncapped, inside the audit block only | Task 1 wrapper + Task 2 rule (MIH-07) |
| Keep | [VERIFIED] markers, grid proportions, lane head, signals, struck names, approved chips | Untouched (no task edits them) |
| Rules | Design language, class vocabulary, token guard, tones only, no --destructive, docs updated | Tokens and guards in both verifies + Task 2 design-language edit (MIH-08) |
| Rules | e2e only when a spec selects on the changed text; screenshots in both themes at 1400 and 420 | Planning-time grep (only 'Show 8 more flagged', name unchanged via aria-hidden caret) + Task 2 headless check |
</source_audit>

<output>
Create `.planning/quick/260929-mih-bring-the-research-package-legitimacy-la/260929-mih-SUMMARY.md` when done
</output>
