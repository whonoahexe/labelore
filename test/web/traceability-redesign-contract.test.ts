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

  it('leaves RequirementStatusChip and the status-chip tone treatment untouched — chips are explicitly out of scope', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('function RequirementStatusChip');
    expect(page).toContain("data-tone={status ? 'complete' : 'quiet'}");
    expect(page).toContain('data-tone="destructive"');
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

  it('leaves the status chip component and its tone values unchanged from the pre-redesign source', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('function RequirementStatusChip');
    expect(page).toContain("data-tone={status ? 'complete' : 'quiet'}");
    expect(page).toContain('function CoveringPhaseEntry');
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

  it('the history toggle reuses the existing filter-button class and carries aria-pressed, reflecting includeHistory', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toMatch(
      /data-active=\{filter\.includeHistory \? 'true' : undefined\}\s*\n\s*aria-pressed=\{filter\.includeHistory\}/,
    );
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

  it('preserves the EmptyState import, the bare element and the filter-result absence sentence', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain("import { EmptyState } from '../components/empty-state.tsx';");
    expect(page).toContain('<EmptyState />');
    expect(page).toContain('No requirements match the current filter.');
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

  it('.trace-bar-complete references the traced-fill recipe token, never the bare primary token', async () => {
    const css = await source('src/web/styles/globals.css');
    const [completeBlock] = ruleBlocks(css, '.trace-bar-complete {');
    expect(completeBlock).toBeDefined();
    expect(completeBlock).toContain('var(--traced-fill)');
    expect(completeBlock).not.toContain('var(--primary)');
  });

  it('declares --traced-fill once in the :root token block as a primary-derived recipe', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css).toMatch(/--traced-fill:\s*color-mix\(in oklch, var\(--primary\)/);
  });

  it('the hero label reads as complete-phase language with a note that preserves the tracing figure', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain(
      '<span className="trace-coverage-percent-label">Covered by complete phases</span>',
    );
    expect(page).toContain('className="trace-coverage-percent-note"');
    expect(page).toMatch(/\{view\.coverage\.tracedPercent\}% of requirements name a covering phase/);
    expect(page).toMatch(/finished on disk/);
    expect(page).toMatch(/Checked tile/);
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

  it('the deferred-tier toggle renders track and thumb elements, and the pressed-state rule declares a transform', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('className="trace-toggle-track"');
    expect(page).toContain('className="trace-toggle-thumb"');

    const css = await source('src/web/styles/globals.css');
    const [pressedThumbBlock] = ruleBlocks(css, ".trace-toggle[aria-pressed='true'] .trace-toggle-thumb {");
    expect(pressedThumbBlock).toBeDefined();
    expect(pressedThumbBlock).toMatch(/transform:/);
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
