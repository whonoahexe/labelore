// Phase 9 (09-10): composeWindowsLedger over the Lendshed ledger, this repo's own WINDOWS.md and planted
// inputs, plus the static markup of the lead. The handler's reading is pinned in test/windows-handler.test.ts.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { fxRead } from '../helpers/fixture-project.ts';
import { WindowsHandler } from '../../src/planning-repo/handlers/windows.ts';
import type { ArtifactRef } from '../../src/planning-repo/types.ts';
import { composeWindowsLedger } from '../../src/web/views/windows-ledger.ts';
import { WindowsLedgerView, windowsHeaderProps } from '../../src/web/views/windows-ledger-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const LB_PLANNING = new URL('../../.planning/', import.meta.url);

function inputOf(content: string): ViewInput {
  const ref: ArtifactRef = {
    path: '.planning/WINDOWS.md',
    kind: 'windows',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'root',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
  const parsed = WindowsHandler.parse({ path: ref.path, content, mtimeMs: 0, size: content.length }, ref);
  return {
    kind: 'windows',
    frontmatter: parsed.frontmatter,
    structured: parsed.structured ?? {},
    groups: [],
    planSegments: [],
  };
}

const lendshed = composeWindowsLedger(inputOf(fxRead('WINDOWS.md')));

describe('composeWindowsLedger - the Lendshed ledger', () => {
  it('opens with the eyebrow, the h1 and the one source-note line', () => {
    expect(lendshed?.intro).toEqual({
      eyebrow: 'Broken windows',
      title: 'Broken windows ledger',
      note: 'Defects that were deferred, waived or not yet checked, across every phase.',
    });
  });

  it('counts the rows the file lists and takes the in-flight tone while anything is open', () => {
    expect(lendshed?.lead).toMatchObject({ open: 2, waived: 2, fixed: 2, total: 6, tone: 'in-flight' });
  });

  it('dates the last fix by the latest resolved day', () => {
    expect(lendshed?.lead.lastFixed).toBe('18 Jun 2026');
    expect(lendshed?.lead.sentence).toBe('2 fixed, last on 18 Jun 2026 · 2 waived · 6 in total');
  });

  it('has no notice when nothing disagrees, and leaves the lists to 09-11', () => {
    expect(lendshed?.notice).toBeNull();
    expect([lendshed?.open, lendshed?.waived, lendshed?.fixed]).toEqual([null, null, null]);
  });
});

describe("composeWindowsLedger - this repo's own WINDOWS.md", () => {
  const content = readFileSync(new URL('WINDOWS.md', LB_PLANNING), 'utf8');
  const own = composeWindowsLedger(inputOf(content));

  it('leads with 0 open in the complete tone', () => {
    expect(own?.lead).toMatchObject({ open: 0, waived: 0, tone: 'complete' });
    expect(own?.lead.fixed).toBeGreaterThanOrEqual(9);
  });

  it('says "Nothing open." and when the last fix landed', () => {
    expect(own?.lead.sentence.startsWith('Nothing open. ')).toBe(true);
    expect(own?.lead.sentence).toMatch(/fixed, last on \d{1,2} [A-Z][a-z]{2} \d{4}\.$/);
  });
});

describe('composeWindowsLedger - degenerate input', () => {
  it('returns null without structured.windows', () => {
    expect(composeWindowsLedger({ kind: 'windows', frontmatter: {}, structured: {}, groups: [], planSegments: [] })).toBeNull();
  });

  it('returns null for a file with no rows and no stated counts', () => {
    expect(composeWindowsLedger(inputOf('# Broken Windows Ledger\n\nNothing here.\n'))).toBeNull();
  });

  it('returns null for a malformed projection instead of throwing', () => {
    const base = { kind: 'windows', frontmatter: {}, groups: [], planSegments: [] };
    expect(composeWindowsLedger({ ...base, structured: { windows: 'x' } })).toBeNull();
    expect(composeWindowsLedger({ ...base, structured: { windows: { rows: 3, source: 'json' } } })).toBeNull();
    expect(composeWindowsLedger({ ...base, structured: { windows: { rows: [], source: 'later' } } })).toBeNull();
  });

  it('with only the table, counts the table rows', () => {
    const table = '| id | phase | kind | status |\n|---|---|---|---|\n| 1 | 01 | stub | open |\n| 2 | | stub | fixed |\n';
    const ledger = composeWindowsLedger(inputOf(table));
    expect(ledger?.lead).toMatchObject({ open: 1, fixed: 1, waived: 0, total: 2, lastFixed: null });
    expect(ledger?.lead.sentence).toBe('1 fixed · 2 in total');
  });
});

describe('the lead markup', () => {
  it('draws the count, the word, the tone chip and the muted line, in that order', () => {
    const html = renderToStaticMarkup(createElement(WindowsLedgerView, { model: lendshed! }));
    expect(html).toContain('view-windows-number">2<');
    expect(html).toContain('<span class="status-chip" data-tone="in-flight">2 open</span>');
    expect(html.indexOf('view-windows-note')).toBeLessThan(html.indexOf('view-windows-lead'));
    expect(html.indexOf('view-windows-number')).toBeLessThan(html.indexOf('view-windows-sentence'));
    expect(html).not.toContain('destructive');
  });

  it('the header override names the page and drops the manifest lead', () => {
    expect(windowsHeaderProps(lendshed!, 'fallback')).toEqual({
      eyebrow: 'Broken windows',
      title: 'Broken windows ledger',
      lead: null,
    });
  });
});

describe('the counts-disagree notice', () => {
  const planted = (openCount: string): string =>
    `---\nopen_count: ${openCount}\n---\n\n\`\`\`json\n${JSON.stringify([
      { id: 1, phase: '01', kind: 'stub', status: 'open' },
      { id: 2, phase: '01', kind: 'stub', status: 'open' },
      { id: 3, phase: '02', kind: 'stub', status: 'fixed', resolved_at: '2026-03-02T10:00:00.000Z' },
    ])}\n\`\`\`\n`;

  it('states both numbers, counts the rows in the lead and never merges them', () => {
    const ledger = composeWindowsLedger(inputOf(planted('3')));
    expect(ledger?.notice).toBe(
      "This file's counts disagree with its rows: it says 3 open, the ledger lists 2. The rows are shown.",
    );
    expect(ledger?.lead).toMatchObject({ open: 2, fixed: 1, total: 3, tone: 'in-flight' });
  });

  it('shows no notice when the counts match', () => {
    expect(composeWindowsLedger(inputOf(planted('2')))?.notice).toBeNull();
  });

  it('a stated zero against listed open rows still says so and leads with the rows', () => {
    const ledger = composeWindowsLedger(inputOf(planted('0')));
    expect(ledger?.notice).toContain('it says 0 open, the ledger lists 2');
    expect(ledger?.lead.open).toBe(2);
  });

  it('renders the notice as a plain paragraph above the lead, never in the destructive tone', () => {
    const html = renderToStaticMarkup(
      createElement(WindowsLedgerView, { model: composeWindowsLedger(inputOf(planted('3')))! }),
    );
    expect(html).toContain('counts disagree with its rows: it says 3 open, the ledger lists 2.');
    expect(html.indexOf('view-windows-notice')).toBeLessThan(html.indexOf('view-windows-lead'));
    expect(html).toContain('<p class="notice view-windows-notice"');
    expect(html).not.toContain('destructive');
  });
});

describe('a ledger with only frontmatter counts', () => {
  it('leads with the stated counts, since there are no rows to count', () => {
    const ledger = composeWindowsLedger(
      inputOf('---\nopen_count: 0\nwaived_count: 1\nfixed_count: 4\ntotal_count: 5\n---\n\n# Broken Windows Ledger\n'),
    );
    expect(ledger?.lead).toMatchObject({ open: 0, waived: 1, fixed: 4, total: 5, lastFixed: null, tone: 'complete' });
    expect(ledger?.lead.sentence).toBe('Nothing open. 4 fixed. 1 waived.');
    expect(ledger?.notice).toBeNull();
  });

  it('works out the open count from the others when only it is missing', () => {
    const ledger = composeWindowsLedger(inputOf('---\nwaived_count: 1\nfixed_count: 2\ntotal_count: 5\n---\n'));
    expect(ledger?.lead).toMatchObject({ open: 2, tone: 'in-flight' });
  });

  it('returns null when the open count cannot be known', () => {
    expect(composeWindowsLedger(inputOf('---\nfixed_count: 2\n---\n'))).toBeNull();
  });
});

describe('hostile ledgers', () => {
  it('survives rows that are not objects, a 200k description and a pile of backticks', () => {
    const content = `\`\`\`\`json\n[1, "two", null, [3], {"id": 1, "status": "open", "description": "${'`'.repeat(200_000)}"}]\n\`\`\`\`\n`;
    const ledger = composeWindowsLedger(inputOf(content));
    expect(ledger?.lead).toMatchObject({ open: 1, total: 1 });
  });
});
