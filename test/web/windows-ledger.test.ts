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
