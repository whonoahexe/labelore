// Source-level contract pinning the traceability page redesign (quick-260917-ns4). Modeled on
// test/web/visual-contract.test.ts's ruleBlocks()/source() idiom — region-scoped assertions
// against raw source text, never a DOM test runner. Grows across the plan's three tasks: this
// file starts with the summary-strip contract (Task 1) and gains the per-category bar / no-table
// contract (Task 2) and the deferred-tiers / history-reuse contract (Task 3) in later commits.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

/** Extracts every top-level rule block whose selector line matches `selectorLine` exactly —
 * copied verbatim from test/web/visual-contract.test.ts so both suites read the same stylesheet
 * the same way. */
function ruleBlocks(css: string, selectorLine: string): string[] {
  const blocks: string[] = [];
  const lines = css.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].trim() !== selectorLine) continue;
    const body: string[] = [];
    let cursor = index + 1;
    while (cursor < lines.length && lines[cursor].trim() !== '}') {
      body.push(lines[cursor]);
      cursor += 1;
    }
    blocks.push(body.join('\n'));
  }
  return blocks;
}

/** Extracts the body of the first `<tag ...>...</tag>` region starting at `openMarker`, tracking
 * nesting depth so a section that itself contains nested `<section>` elements (the filter row
 * nested inside the summary strip, Task 1) still resolves to its own true closing tag rather than
 * the first `</section>` encountered. */
function extractElement(source: string, openMarker: string, tag = 'section'): string {
  const start = source.indexOf(openMarker);
  if (start === -1) throw new Error(`opening marker not found: ${openMarker}`);
  const re = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'g');
  re.lastIndex = start;
  let depth = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    if (match[0].startsWith('</')) {
      depth -= 1;
      if (depth === 0) return source.slice(start, match.index + match[0].length);
    } else {
      depth += 1;
    }
  }
  throw new Error(`unbalanced <${tag}> starting at marker: ${openMarker}`);
}

describe('traceability redesign — summary strip (NS4-01, NS4-04, D-02, Task 1)', () => {
  it('renders one trace-summary section hosting both the coverage headline and the filter controls', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('<section className="trace-summary"');

    const summary = extractElement(page, '<section className="trace-summary"');
    expect(summary, 'search input nested inside the summary strip').toContain(
      'className="trace-filters"',
    );
    expect(summary, 'status filter group nested inside the summary strip').toContain(
      'className="trace-status-filters"',
    );
  });

  it('marks the aggregate bar as a single labelled image, with its segments hidden from assistive tech', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    const barTag = page.match(/<div\s+className="trace-bar"[\s\S]*?>/);
    expect(barTag, 'trace-bar element opening tag').not.toBeNull();
    expect(barTag![0]).toContain('role="img"');
    expect(barTag![0]).toMatch(/aria-label=/);

    const segmentMatches =
      page.match(/className="trace-bar-segment[^"]*"\s+aria-hidden="true"/g) ?? [];
    expect(segmentMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('suppresses the bar entirely for a zero-total scope rather than rendering zero-width segments', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toMatch(/if \(coverage\.total === 0\) return null;/);
  });

  it("reads the stat tiles from the projection's own coverage fields, never a component recount", async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('{view.coverage.total}');
    expect(page).toContain('{view.coverage.completePhase}');
    expect(page).toContain('{view.coverage.inFlightPhase}');
    expect(page).toContain('{view.coverage.missingPhase}');
    expect(page).toContain('{view.coverage.uncovered}');
    expect(page).toContain('{view.coverage.unresolvedPhase}');
    expect(page).toContain('{view.coverage.claimedComplete}');
    expect(page).toContain('{view.coverage.mismatched}');
  });

  it('quick-260918-qkd Task 1: renders a data-bucket attribute per partition tile and reads completePhasePercent for the hero value', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('{view.coverage.completePhasePercent}%');
    for (const bucket of ['total', 'complete', 'in-flight', 'missing', 'uncovered']) {
      expect(page).toContain(`data-bucket="${bucket}"`);
    }
  });

  it('drops the parenthesised counts from the status filter button labels — the stat tiles carry them now', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    const filters = extractElement(page, '<section className="trace-filters"');
    expect(filters).not.toMatch(/All \(\{/);
    expect(filters).not.toMatch(/Uncovered \(\{/);
    expect(filters).not.toMatch(/Status mismatch \(\{/);
  });

  it('token-guards the new summary-strip rules — no raw colour, length or type literal outside the token blocks', async () => {
    const css = await source('src/web/styles/globals.css');
    const [summaryBlock] = ruleBlocks(css, '.trace-summary {');
    const [barBlock] = ruleBlocks(css, '.trace-bar {');
    expect(summaryBlock).toBeDefined();
    expect(barBlock).toBeDefined();
    for (const block of [summaryBlock, barBlock]) {
      expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(block).not.toMatch(/\brgb\(/);
    }
  });
});

describe('traceability redesign — per-category bars and hierarchical rows (NS4-02, NS4-05, D-01, Task 2)', () => {
  it('emits no tabular row markup anywhere in the page', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).not.toMatch(/<table\b/);
    expect(page).not.toMatch(/<thead\b/);
    expect(page).not.toMatch(/<tbody\b/);
    expect(page).not.toMatch(/<tr\b/);
    expect(page).not.toMatch(/<td\b/);
    expect(page).not.toMatch(/<th\b/);
  });

  it('renders each category section with its own labelled coverage bar', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain(
      '<CoverageBar coverage={group.coverage} label={`${group.category} coverage`} />',
    );
  });

  it('reads the category bar from group.coverage rather than recomputing over the filtered row subset', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    // The mapping that produces filteredGroups must carry `coverage` through from the source
    // group unchanged, not derive a fresh figure from the filtered rows it also produces.
    expect(page).toMatch(/coverage:\s*group\.coverage,/);
  });

  it('renders requirement rows through the shared trace-rows list, not a re-invented markup shape', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('function TraceabilityRowList');
    expect((page.match(/<TraceabilityRowList/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('splits the covering-phase name and its status chip into separate components', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('function CoveringPhaseName');
    expect(page).toContain('function CoveringPhaseChip');
  });

  it('token-guards the new row-list rules — no raw colour, length or type literal outside the token blocks', async () => {
    const css = await source('src/web/styles/globals.css');
    const [rowsBlock] = ruleBlocks(css, '.trace-rows {');
    const [rowBlock] = ruleBlocks(css, '.trace-row {');
    expect(rowsBlock).toBeDefined();
    expect(rowBlock).toBeDefined();
    for (const block of [rowsBlock, rowBlock]) {
      expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(block).not.toMatch(/\brgb\(/);
    }
  });

  it("still leaves .coverage-table-boundary's rules in place for plan-pair-page.tsx", async () => {
    const css = await source('src/web/styles/globals.css');
    expect(ruleBlocks(css, '.coverage-table-boundary {')[0]).toBeDefined();
    const planPair = await source('src/web/pages/plan-pair-page.tsx');
    expect(planPair).toContain('coverage-table-boundary');
  });
});

/** Blanks out `/* ... *\/` block comments while preserving line counts, mirroring
 * test/token-guard.test.ts's stripCssComments — so a prose mention of a history-* class name
 * inside a comment can never satisfy or break the selector-count pin below. */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
}

// Measured against the stylesheet immediately before this task's edits (git blame:
// quick-260917-ns4 Task 2 commit) — Task 3 adds no history-prefixed CSS rule at all, reusing
// every one of roadmap-page.tsx's existing global, un-scoped .history-* rules verbatim.
const HISTORY_SELECTOR_LINE_COUNT_BEFORE_TASK_3 = 21;

describe('traceability redesign — deferred tiers under the reused History treatment (NS4-03, NS4-04, D-03, Task 3)', () => {
  it('imports History and ChevronRight from lucide and renders all four history class names', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toMatch(
      /import\s*\{[^}]*\bChevronRight\b[^}]*\bHistory\b[^}]*\}\s*from\s*'lucide-react'/,
    );
    expect(page).toContain('className="history-section"');
    expect(page).toContain('className="history-list"');
    expect(page).toContain('className="history-milestone"');
    expect(page).toContain('className="history-tree"');
  });

  it('declares no new history-prefixed rule in globals.css', async () => {
    const css = stripCssComments(await source('src/web/styles/globals.css'));
    const historySelectorLines = css.split('\n').filter((line) => /\.history-[\w-]+/.test(line));
    expect(historySelectorLines.length).toBe(HISTORY_SELECTOR_LINE_COUNT_BEFORE_TASK_3);
  });

  it('the history toggle reuses the existing trace-toggle class and carries aria-checked, reflecting includeHistory (quick-260918-qkd Task 3: role=switch replaces aria-pressed)', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toMatch(
      /data-active=\{filter\.includeHistory \? 'true' : undefined\}\s*\n\s*aria-checked=\{filter\.includeHistory\}/,
    );
    expect(page).toContain('role="switch"');
  });

  it('reads deferredTiers rather than re-grouping deferredRows in the component', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('view.deferredTiers.map((tier) =>');
    expect(page).not.toMatch(/deferredRows\.reduce|deferredRows\.filter\(\(row\) => row\.tier/);
  });

  it('governs deferred-tier filtering through matchesDeferredTraceabilityFilter, not a second predicate', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('matchesDeferredTraceabilityFilter');

    const filterModule = await source('src/web/pages/traceability-filter.ts');
    expect(filterModule).toContain('export function matchesDeferredTraceabilityFilter');
    expect(filterModule).toContain('includeHistory: boolean');
  });

  it('the disclosure effect only ever opens a tier — it never sets open to false', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    const start = page.indexOf('function DeferredTierDisclosure');
    const end = page.indexOf('\nexport function TraceabilityPage');
    expect(start, 'DeferredTierDisclosure declaration').toBeGreaterThan(-1);
    expect(end, 'TraceabilityPage declaration (body end marker)').toBeGreaterThan(start);
    const body = page.slice(start, end);
    expect(body).not.toMatch(/\.open\s*=\s*false/);
    expect(body).toMatch(/\.open\s*=\s*true/);
  });

  it('preserves the EmptyState import and the bare element; the filter-result absence sentence is scoped to the active tier (quick-260918-qkd Task 3, E1)', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain("import { EmptyState } from '../components/empty-state.tsx';");
    expect(page).toContain('<EmptyState />');
    expect(page).toContain('No active-tier requirements match the current filter.');
  });
});

describe('traceability visual/UX regression fixes (quick-260917-wba, Task 1 — bars read as data, honest headline)', () => {
  it('.trace-bar always paints a track background and a padding gutter, never a bare frame', async () => {
    const css = await source('src/web/styles/globals.css');
    const [barBlock] = ruleBlocks(css, '.trace-bar {');
    expect(barBlock).toBeDefined();
    expect(barBlock).toMatch(/background:\s*var\(--muted\)/);
    expect(barBlock).toMatch(/padding:\s*var\(--space-0-5\)/);
  });

  it('.trace-bar-complete references the bare primary token, not a diluted recipe', async () => {
    const css = await source('src/web/styles/globals.css');
    const [completeBlock] = ruleBlocks(css, '.trace-bar-complete {');
    expect(completeBlock).toBeDefined();
    expect(completeBlock).toContain('var(--primary)');
  });

  it('the hero label reads as complete-phase language', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain(
      '<span className="trace-coverage-percent-label">Covered by complete phases</span>',
    );
  });

  it("the aggregate bar's aria-label sentence describes a covering phase rather than raw completion", async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toMatch(/covering phase/);
  });

  it('the per-category bar is width-bound and paired with a numeric readout read from group.coverage', async () => {
    const css = await source('src/web/styles/globals.css');
    const [categoryBarBlock] = ruleBlocks(css, '.trace-category-bar .trace-bar {');
    expect(categoryBarBlock).toBeDefined();
    expect(categoryBarBlock).toMatch(/max-width:/);

    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain(
      '<CoverageBar coverage={group.coverage} label={`${group.category} coverage`} />',
    );
    expect(page).toContain('className="trace-category-readout"');
    expect(page).toMatch(/\{group\.coverage\.completePhase\}\/\{group\.coverage\.total\}/);
  });
});

describe('traceability visual/UX regression fixes (quick-260918-qkd Task 2 — token vocabulary, tones, two distinguishable signals)', () => {
  it('each bar-segment rule resolves to its own token, never transparent, and no two segments collide on the same token', async () => {
    const css = await source('src/web/styles/globals.css');
    const segments: Array<[string, string]> = [
      ['.trace-bar-complete {', '--primary'],
      ['.trace-bar-in-flight {', '--ring'],
      ['.trace-bar-missing {', '--destructive-border'],
      ['.trace-bar-unresolved {', '--destructive'],
      ['.trace-bar-uncovered {', '--muted-foreground'],
    ];
    const seen = new Set<string>();
    for (const [selector, token] of segments) {
      const [block] = ruleBlocks(css, selector);
      expect(block, `${selector} block`).toBeDefined();
      expect(block).toContain(`var(${token})`);
      expect(block).not.toContain('transparent');
      expect(seen.has(token), `${token} reused by another segment`).toBe(false);
      seen.add(token);
    }
  });

  it('both new chip tone rules exist and reference their own fill token as both border-color and color', async () => {
    const css = await source('src/web/styles/globals.css');
    const [inFlightBlock] = ruleBlocks(css, ".status-chip[data-tone='in-flight'] {");
    const [missingBlock] = ruleBlocks(css, ".status-chip[data-tone='missing'] {");
    expect(inFlightBlock).toBeDefined();
    expect(inFlightBlock).toContain('var(--in-flight-fill)');
    expect(missingBlock).toBeDefined();
    expect(missingBlock).toContain('var(--missing-fill)');
  });

  it('the phase-signal marker rule exists on .status-chip[data-signal="phase"]::before', async () => {
    const css = await source('src/web/styles/globals.css');
    const [markerBlock] = ruleBlocks(css, ".status-chip[data-signal='phase']::before {");
    expect(markerBlock).toBeDefined();
    expect(markerBlock).toContain('background: currentColor');
  });

  it("the disk-status lookup maps all four known statuses, falling back to 'quiet' (moved to traceability-rollup.ts with the rail)", async () => {
    const rollup = await source('src/web/pages/traceability-rollup.ts');
    expect(rollup).toMatch(/complete:\s*'complete'/);
    expect(rollup).toMatch(/in_progress:\s*'in-flight'/);
    expect(rollup).toMatch(/researched:\s*'in-flight'/);
    expect(rollup).toMatch(/no_directory:\s*'missing'/);
    expect(rollup).toContain("return 'quiet';");
  });

  it('documents --ring as a deliberate literal beside its .dark declaration, without changing its value', async () => {
    const css = await source('src/web/styles/globals.css');
    const darkBlock = ruleBlocks(css, '.dark {')[0]!;
    expect(darkBlock).toMatch(/QKD-10[\s\S]*focus-ring-contrast\.test\.ts/);
    expect(darkBlock).toMatch(/--ring:\s*oklch\(0\.56 0\.157 37\.304\);/);
  });
});

describe('traceability visual/UX regression fixes (quick-260917-wba, Task 2 — filter row input, height parity, switch)', () => {
  it('.trace-filter-input references neither the frosted input token nor a raw colour literal, and declares a min-height', async () => {
    const css = await source('src/web/styles/globals.css');
    const [inputBlock] = ruleBlocks(css, '.trace-filter-input {');
    expect(inputBlock).toBeDefined();
    expect(inputBlock).not.toMatch(/var\(--input\)/);
    expect(inputBlock).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(inputBlock).not.toMatch(/\brgb\(/);
    expect(inputBlock).toMatch(/min-height:\s*var\(--space-8\)/);
  });

  it('.trace-filter-button declares the same min-height token as the filter input', async () => {
    const css = await source('src/web/styles/globals.css');
    const [buttonBlock] = ruleBlocks(css, '.trace-filter-button {');
    expect(buttonBlock).toBeDefined();
    expect(buttonBlock).toMatch(/min-height:\s*var\(--space-8\)/);
  });

  it('the deferred-tier toggle renders track and thumb elements, and the checked-state rule declares a transform (quick-260918-qkd Task 3: rekeyed from aria-pressed to aria-checked)', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('className="trace-toggle-track"');
    expect(page).toContain('className="trace-toggle-thumb"');

    const css = await source('src/web/styles/globals.css');
    const [checkedThumbBlock] = ruleBlocks(css, ".trace-toggle[aria-checked='true'] .trace-toggle-thumb {");
    expect(checkedThumbBlock).toBeDefined();
    expect(checkedThumbBlock).toMatch(/transform:/);
  });
});

describe('traceability visual/UX regression fixes (quick-260917-wba, Task 3 — deferred-tier chips/padding, lighter rows)', () => {
  it('.history-tree pads all four sides from one token, and the history selector-line count is unchanged', async () => {
    const css = stripCssComments(await source('src/web/styles/globals.css'));
    // Index 1: index 0 is the shared min-width/max-width selector-group rule that also happens
    // to end in the exact line `.history-tree {` (see the shared-scroll-clamp block above); the
    // rule this task edited is the standalone declaration further down the sheet.
    const treeBlock = ruleBlocks(css, '.history-tree {')[1];
    expect(treeBlock).toBeDefined();
    expect(treeBlock).toMatch(/padding:\s*var\(--space-5\);/);

    const historySelectorLines = css.split('\n').filter((line) => /\.history-[\w-]+/.test(line));
    expect(historySelectorLines.length).toBe(HISTORY_SELECTOR_LINE_COUNT_BEFORE_TASK_3);
  });

  it('TraceabilityRowList accepts a variant prop, defaulting to "default", passed as "deferred" only from the disclosure', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toMatch(/variant\s*=\s*'default'/);
    expect(page).toContain(
      '<TraceabilityRowList rows={visibleRows} labelledBy={headingId} variant="deferred" />',
    );
  });

  it('the deferred branch renders a quiet-toned "not yet scheduled" chip and never the destructive tone', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    const start = page.indexOf('function TraceabilityRowList');
    const end = page.indexOf('\n/** One tier');
    expect(start, 'TraceabilityRowList declaration').toBeGreaterThan(-1);
    expect(end, 'DeferredTierDisclosure doc comment (body end marker)').toBeGreaterThan(start);
    const body = page.slice(start, end);
    expect(body).toContain("variant === 'deferred' && row.uncovered");
    expect(body).toMatch(/data-tone="quiet"/);
    expect(body).toMatch(/Not yet scheduled/);
  });

  it('.trace-row declares no border shorthand while an adjacent-sibling rule declares a top hairline', async () => {
    const css = await source('src/web/styles/globals.css');
    const [rowBlock] = ruleBlocks(css, '.trace-row {');
    expect(rowBlock).toBeDefined();
    expect(rowBlock).not.toMatch(/\bborder:/);

    const [siblingBlock] = ruleBlocks(css, '.trace-row + .trace-row {');
    expect(siblingBlock).toBeDefined();
    expect(siblingBlock).toMatch(/border-top:\s*1px solid var\(--border\)/);
  });

  it('the row text outranks its ID: row-text steps up to fs-5, row-id demotes to the micro-label treatment', async () => {
    const css = await source('src/web/styles/globals.css');
    const [textBlock] = ruleBlocks(css, '.trace-row-text {');
    expect(textBlock).toBeDefined();
    expect(textBlock).toMatch(/font-size:\s*var\(--fs-5\)/);

    const [idBlock] = ruleBlocks(css, '.trace-row-id {');
    expect(idBlock).toBeDefined();
    expect(idBlock).toMatch(/font-size:\s*var\(--font-size-micro-label\)/);
    expect(idBlock).toMatch(/text-transform:\s*uppercase/);
  });
});

describe('traceability visual/UX regression fixes (quick-260918-qkd Task 3 — row layout, real switch, honest filter, source-order guard)', () => {
  it('.trace-row declares align-items: start and the fixed-rail column template (sketch 001, variant C)', async () => {
    const css = await source('src/web/styles/globals.css');
    const [rowBlock] = ruleBlocks(css, '.trace-row {');
    expect(rowBlock).toBeDefined();
    expect(rowBlock).toMatch(/align-items:\s*start/);
    expect(rowBlock).toMatch(/grid-template-columns:\s*9rem minmax\(0, 1fr\)/);
  });

  it('.trace-row-body declares align-content: start', async () => {
    const css = await source('src/web/styles/globals.css');
    const [bodyBlock] = ruleBlocks(css, '.trace-row-body {');
    expect(bodyBlock).toBeDefined();
    expect(bodyBlock).toMatch(/align-content:\s*start/);
  });

  it('.trace-row-micro-label no longer exists, and its accessible names survive as sr-only spans', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).not.toContain('.trace-row-micro-label');

    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).not.toContain('trace-row-micro-label');
    expect(page).toMatch(/<span className="sr-only">Covering phase<\/span>/);
    expect(page).not.toMatch(/<span className="trace-row-micro-label">Scheduling<\/span>/);
  });

  it('the deferred toggle carries role="switch" and a live aria-checked reflecting includeHistory', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('role="switch"');
    expect(page).toMatch(/aria-checked=\{filter\.includeHistory\}/);
    expect(page).not.toMatch(/aria-pressed=\{filter\.includeHistory\}/);
  });

  it('.trace-toggle declares no border or background — the track and thumb are its only surface', async () => {
    const css = await source('src/web/styles/globals.css');
    const [toggleBlock] = ruleBlocks(css, '.trace-toggle {');
    expect(toggleBlock).toBeDefined();
    expect(toggleBlock).not.toMatch(/\bborder:/);
    expect(toggleBlock).not.toMatch(/\bbackground:/);

    const [hoverBlock] = ruleBlocks(css, '.trace-toggle:hover {');
    expect(hoverBlock).toBeDefined();
    expect(hoverBlock).not.toMatch(/\bborder-color:/);
    expect(hoverBlock).not.toMatch(/\bbackground:/);

    const [checkedBlock] = ruleBlocks(css, ".trace-toggle[aria-checked='true'] {");
    expect(checkedBlock).toBeDefined();
    expect(checkedBlock).toMatch(/color:\s*var\(--primary\)/);
  });

  it('the page contains the scoped empty-note sentence and the new switch label', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('No active-tier requirements match the current filter.');
    expect(page).toContain('Filter deferred tiers too');
  });

  it('renders the unfiltered-deferred-tiers note only when the switch is off and a filter is engaged', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('function isFilterEngaged');
    expect(page).toContain('className="trace-deferred-filter-note"');
    expect(page).toMatch(/!filter\.includeHistory && isFilterEngaged\(filter\)/);

    const css = await source('src/web/styles/globals.css');
    expect(ruleBlocks(css, '.trace-deferred-filter-note {')[0]).toBeDefined();
  });

  it('moves the .trace-row and .warning-fields narrow-viewport collapses to live immediately after the rules they must beat (QKD-08)', async () => {
    const css = await source('src/web/styles/globals.css');

    // The shared narrow-viewport block (identified by its unrelated, still-present sibling rule
    // .blocked-by) no longer declares .trace-row at all.
    const [sharedBlock] = ruleBlocks(css, '.blocked-by {');
    expect(sharedBlock).toBeDefined();

    const blockedByLine = css.split('\n').findIndex((line) => line.trim() === '.blocked-by {');
    const traceRowBaseLine = css.split('\n').findIndex((line) => line.trim() === '.trace-row {');
    expect(traceRowBaseLine).toBeGreaterThan(blockedByLine);

    // .trace-row's own narrow-viewport collapse now lives after .trace-row + .trace-row, i.e.
    // between the base rule and .trace-row-rail.
    const lines = css.split('\n');
    const rowRailLine = lines.findIndex((line) => line.trim() === '.trace-row-rail {');
    const collapseBetween = lines
      .slice(traceRowBaseLine, rowRailLine)
      .some((line) => line.trim() === '@media (max-width: 42rem) {');
    expect(collapseBetween).toBe(true);

    // The rail's own stacking collapse lives after the rail's base rule, before its count rule.
    const railLine = lines.findIndex((line) => line.trim() === '.trace-row-rail {');
    const railCountLine = lines.findIndex((line) => line.trim() === '.trace-row-rail-count {');
    expect(
      lines
        .slice(railLine, railCountLine)
        .some((line) => line.trim() === '@media (max-width: 42rem) {'),
    ).toBe(true);

    // .warning-fields' own narrow-viewport collapse now lives after its dd rule, before
    // .warning-fields-label.
    const warningDdLine = lines.findIndex((line) => line.trim() === '.warning-fields dd {');
    const warningLabelLine = lines.findIndex((line) => line.trim() === '.warning-fields-label {');
    const warningCollapseBetween = lines
      .slice(warningDdLine, warningLabelLine)
      .some((line) => line.trim() === '@media (max-width: 42rem) {');
    expect(warningCollapseBetween).toBe(true);
  });
});

describe('traceability status rail (sketch 001, variant C)', () => {
  it('renders one rail per row holding a single chip drawn from the rollup, not one chip per phase', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    const start = page.indexOf('function TraceabilityRowList');
    const end = page.indexOf('\n/** One tier');
    const body = page.slice(start, end);
    expect(body).toContain('className="trace-row-rail"');
    expect(body).toContain('coveringRollup(row.coveringPhases)');
    expect(body).toContain('<CoveringPhaseChip covering={rollup.worst} />');
    // The chip is rendered exactly once inside the row; per-phase lines carry text, not chips.
    expect((body.match(/<CoveringPhaseChip/g) ?? []).length).toBe(1);
  });

  it('renders each covering phase as a name/link line marked by its tone square, with no status word beside it', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('className="trace-covering-line"');
    expect(page).toContain('data-tone={coveringPhaseSignal(covering)}');
    expect(page).not.toContain('trace-covering-status');
  });

  it('drops the pre-rail row classes from the stylesheet and the page', async () => {
    const css = await source('src/web/styles/globals.css');
    const page = await source('src/web/pages/traceability-page.tsx');
    for (const gone of [
      'trace-row-primary',
      'trace-row-secondary',
      'trace-row-phase',
      'trace-covering-names',
      'trace-covering-list',
      'trace-covering-entry',
      'trace-covering-status',
    ]) {
      expect(css, `${gone} in globals.css`).not.toContain(gone);
      expect(page, `${gone} in the page`).not.toContain(gone);
    }
  });

  it('token-guards the new rail rules — no raw colour literal in the rail, body or phase-line rules', async () => {
    const css = await source('src/web/styles/globals.css');
    for (const selector of [
      '.trace-row-rail {',
      '.trace-row-body {',
      '.trace-covering-line {',
      '.trace-covering-line::before {',
    ]) {
      const [block] = ruleBlocks(css, selector);
      expect(block, `${selector} block`).toBeDefined();
      expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(block).not.toMatch(/\brgb\(/);
    }
  });
});
