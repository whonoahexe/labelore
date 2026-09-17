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
    expect(summary, 'search input nested inside the summary strip').toContain('className="trace-filters"');
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

    const segmentMatches = page.match(/className="trace-bar-segment[^"]*"\s+aria-hidden="true"/g) ?? [];
    expect(segmentMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('suppresses the bar entirely for a zero-total scope rather than rendering zero-width segments', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toMatch(/if \(coverage\.total === 0\) return null;/);
  });

  it('reads the stat tiles from the projection\'s own coverage fields, never a component recount', async () => {
    const page = await source('src/web/pages/traceability-page.tsx');
    expect(page).toContain('{view.coverage.total}');
    expect(page).toContain('{view.coverage.uncovered}');
    expect(page).toContain('{view.coverage.mismatched}');
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
    expect(page).toContain("data-tone=\"destructive\"");
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
    expect(page).toContain('<CoverageBar coverage={group.coverage} label={`${group.category} coverage`} />');
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

  it('still leaves .coverage-table-boundary\'s rules in place for plan-pair-page.tsx', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(ruleBlocks(css, '.coverage-table-boundary {')[0]).toBeDefined();
    const planPair = await source('src/web/pages/plan-pair-page.tsx');
    expect(planPair).toContain('coverage-table-boundary');
  });
});
