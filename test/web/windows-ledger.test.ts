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
const SHAPES_PLANNING = new URL('../fixtures/shapes/.planning/', import.meta.url);

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

  it('has no notice when nothing disagrees', () => {
    expect(lendshed?.notice).toBeNull();
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

/** A ledger of planted rows (the fenced JSON source), each a partial of the row the file writes. */
function plantedLedger(rows: Array<Record<string, unknown>>): string {
  return `\`\`\`json\n${JSON.stringify(rows)}\n\`\`\`\n`;
}

const phasesOf = (list: { groups: Array<{ phase: string }> } | null | undefined): string[] =>
  (list?.groups ?? []).map((group) => group.phase);

describe('the Open and Waived lists - the Lendshed ledger', () => {
  it('groups Open by the verbatim phase string in first-appearance order', () => {
    expect(phasesOf(lendshed?.open)).toEqual(['01', 'quick/260402-t8m']);
    expect(lendshed?.open.count).toBe(2);
    expect(lendshed?.open.empty).toBeNull();
  });

  it('lists an open row with its id, kind chip, place, recorded day and the in-flight tone', () => {
    const row = lendshed?.open.groups[0].rows[0];
    expect(row).toMatchObject({
      id: '1',
      chip: 'unrun-verify',
      place: 'src/auth/session.ts',
      recorded: '2 Jun 2026',
      resolved: null,
      reason: null,
      waived: false,
      tone: 'in-flight',
    });
  });

  it('keeps the line on the place when the row has one', () => {
    const fixedRow = lendshed?.fixed?.groups[0].rows[0];
    expect(fixedRow?.place).toBe('src/auth/cookies.ts:58');
  });

  it('lists Waived with one reason and one row that states none', () => {
    expect(phasesOf(lendshed?.waived)).toEqual(['03']);
    const [withReason, without] = lendshed!.waived.groups[0].rows;
    expect(withReason).toMatchObject({ id: '3', waived: true, tone: 'quiet' });
    expect(withReason.reason).toContain('Removed in the admin refactor');
    expect(without).toMatchObject({ id: '4', waived: true, reason: null, tone: 'quiet' });
  });

  it('clamps only a long description', () => {
    expect(lendshed?.open.groups[0].rows[0].long).toBeFalsy();
    const long = composeWindowsLedger(inputOf(plantedLedger([{ id: 1, status: 'open', description: 'x'.repeat(400) }])));
    expect(long?.open.groups[0].rows[0].long).toBe(true);
  });
});

describe('the Open and Waived lists - planted rows', () => {
  it('groups a row with no phase under "No phase" and keeps 03-04 and quick/260727-3mo apart', () => {
    const ledger = composeWindowsLedger(
      inputOf(
        plantedLedger([
          { id: 1, phase: '03-04', status: 'open' },
          { id: 2, phase: 'quick/260727-3mo', status: 'open' },
          { id: 3, status: 'open' },
          { id: 4, phase: '-', status: 'open' },
          { id: 5, phase: '03-04', status: 'open' },
        ]),
      ),
    );
    expect(phasesOf(ledger?.open)).toEqual(['03-04', 'quick/260727-3mo', 'No phase']);
    expect(ledger?.open.groups.map((group) => group.rows.length)).toEqual([2, 1, 2]);
  });

  it('shows an unknown kind verbatim and lists a row of unknown status with the open ones under its raw status', () => {
    const ledger = composeWindowsLedger(
      inputOf(
        plantedLedger([
          { id: 1, phase: '01', kind: 'made-up-kind', status: 'open' },
          { id: 2, phase: '01', kind: 'stub', status: 'deferred' },
          { id: 3, phase: '02', kind: 'stub', status: '' },
        ]),
      ),
    );
    const rows = ledger!.open.groups.flatMap((group) => group.rows);
    expect(rows.map((row) => row.chip)).toEqual(['made-up-kind', 'deferred', 'No status']);
    expect(rows.map((row) => row.tone)).toEqual(['in-flight', 'quiet', 'quiet']);
    expect(ledger?.open.count).toBe(3);
    expect(ledger?.lead.open).toBe(1);
  });

  it('gives an empty group its empty-note line', () => {
    const ledger = composeWindowsLedger(inputOf(plantedLedger([{ id: 1, phase: '01', status: 'fixed' }])));
    expect(ledger?.open).toEqual({ groups: [], count: 0, empty: 'Nothing open.' });
    expect(ledger?.waived).toEqual({ groups: [], count: 0, empty: 'Nothing waived.' });
  });

  it('a file with counts and no rows does not say "Nothing open." beside a lead that says otherwise', () => {
    const ledger = composeWindowsLedger(inputOf('---\nopen_count: 2\nwaived_count: 0\nfixed_count: 1\ntotal_count: 3\n---\n'));
    expect(ledger?.open.empty).toBe('The file states this count but lists no rows.');
    expect(ledger?.waived.empty).toBe('Nothing waived.');
  });

  it('treats a whitespace reason as no reason', () => {
    const ledger = composeWindowsLedger(inputOf(plantedLedger([{ id: 1, phase: '01', status: 'waived', reason: '   ' }])));
    expect(ledger?.waived.groups[0].rows[0].reason).toBeNull();
  });
});

describe('the Open and Waived markup', () => {
  const html = renderToStaticMarkup(createElement(WindowsLedgerView, { model: lendshed! }));

  it('draws Open then Waived under the lead, each with an h2 and h3 group heads', () => {
    expect(html.indexOf('view-windows-lead')).toBeLessThan(html.indexOf('>Open<'));
    expect(html.indexOf('>Open<')).toBeLessThan(html.indexOf('>Waived<'));
    expect(html).toContain('<h3 class="view-windows-group-head">');
    expect(html).toContain('title="quick/260402-t8m"');
  });

  it('draws a row with its aria-hidden square, mono id and quiet kind chip', () => {
    expect(html).toContain('<i class="status-square" data-tone="in-flight" aria-hidden="true"></i>');
    expect(html).toContain('class="view-windows-id" title="#1"');
    expect(html).toContain('<span class="status-chip" data-tone="quiet">unrun-verify</span>');
    expect(html).toContain('title="src/auth/cookies.ts:58"');
    expect(html).toContain('Recorded 2 Jun 2026');
  });

  it('labels a waiver reason, and says plainly when there is none', () => {
    expect(html).toContain('Waived because');
    expect(html).toContain('Removed in the admin refactor already planned for the next milestone');
    expect(html).toContain('No reason recorded');
    expect(html.split('Waived because').length - 1).toBe(1);
    expect(html.split('No reason recorded').length - 1).toBe(1);
  });

  it('draws the empty-note line for an empty group and a Read more only for a long description', () => {
    const empty = renderToStaticMarkup(
      createElement(WindowsLedgerView, {
        model: composeWindowsLedger(inputOf(plantedLedger([{ id: 1, phase: '01', status: 'fixed' }])))!,
      }),
    );
    expect(empty).toContain('<p class="empty-note">Nothing open.</p>');
    expect(empty).toContain('<p class="empty-note">Nothing waived.</p>');
    expect(html).not.toContain('Read more');
    const long = renderToStaticMarkup(
      createElement(WindowsLedgerView, {
        model: composeWindowsLedger(inputOf(plantedLedger([{ id: 1, status: 'open', description: 'y'.repeat(300) }])))!,
      }),
    );
    expect(long).toContain('data-clamped="true"');
    expect(long).toContain('aria-expanded="false"');
    expect(long).toContain('Read more');
  });

  it('renders author text as text: markup in a description is escaped and a path is never a link', () => {
    const hostile = renderToStaticMarkup(
      createElement(WindowsLedgerView, {
        model: composeWindowsLedger(
          inputOf(plantedLedger([{ id: 1, status: 'open', file: '<a href="x">p</a>', description: '<img src=x onerror=alert(1)>' }])),
        )!,
      }),
    );
    expect(hostile).not.toContain('<img');
    expect(hostile).not.toContain('<a href');
    expect(hostile).not.toContain('onerror=alert(1)>');
  });
});

describe('the Fixed history', () => {
  it("folds Lendshed's fixed rows by phase in first-appearance order", () => {
    expect(phasesOf(lendshed?.fixed)).toEqual(['01', 'quick/260402-t8m']);
    expect(lendshed?.fixed?.count).toBe(2);
    const row = lendshed!.fixed!.groups[1].rows[0];
    expect(row).toMatchObject({ id: '6', tone: 'complete', recorded: '12 Jun 2026', resolved: '18 Jun 2026', waived: false });
  });

  it('draws one collapsed details element per phase with the summary "{phase} · {n} fixed"', () => {
    const html = renderToStaticMarkup(createElement(WindowsLedgerView, { model: lendshed! }));
    expect(html.split('<details').length - 1).toBe(2);
    expect(html).not.toContain('<details open');
    expect(html).toContain('01 · 1 fixed');
    expect(html).toContain('quick/260402-t8m · 1 fixed');
    expect(html).toContain('Fixed 18 Jun 2026');
    expect(html).toContain('<i class="status-square" data-tone="complete" aria-hidden="true"></i>');
    expect(html.indexOf('>Waived<')).toBeLessThan(html.indexOf('view-windows-history'));
  });

  it('is omitted when the ledger lists no fixed row', () => {
    const ledger = composeWindowsLedger(inputOf(plantedLedger([{ id: 1, phase: '01', status: 'open' }])));
    expect(ledger?.fixed).toBeNull();
    const html = renderToStaticMarkup(createElement(WindowsLedgerView, { model: ledger! }));
    expect(html).not.toContain('<details');
    expect(html).not.toContain('view-windows-history');
  });

  it('shows a fixed row with no resolved date without a Fixed date', () => {
    const ledger = composeWindowsLedger(inputOf(plantedLedger([{ id: 1, phase: '01', status: 'fixed' }])));
    expect(ledger?.fixed?.groups[0].rows[0].resolved).toBeNull();
  });

  it('keeps the page the same shape with nothing open', () => {
    const html = renderToStaticMarkup(
      createElement(WindowsLedgerView, {
        model: composeWindowsLedger(inputOf(plantedLedger([{ id: 1, phase: '01', status: 'fixed' }])))!,
      }),
    );
    const order = ['view-windows-lead', '>Open<', '>Waived<', 'view-windows-history'].map((part) => html.indexOf(part));
    expect(order.every((at) => at > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe('the Shapes ledger (zero open, D-15)', () => {
  const shapes = composeWindowsLedger(inputOf(readFileSync(new URL('WINDOWS.md', SHAPES_PLANNING), 'utf8')));

  it('leads with Nothing open. and the last fix, in the complete tone', () => {
    expect(shapes?.lead).toMatchObject({ open: 0, fixed: 2, waived: 0, total: 2, tone: 'complete' });
    expect(shapes?.lead.sentence).toBe('Nothing open. 2 fixed, last on 22 Oct 2026.');
    expect(shapes?.notice).toBeNull();
  });

  it('shows Open and Waived as their empty-note lines above the Fixed history', () => {
    expect(shapes?.open).toEqual({ groups: [], count: 0, empty: 'Nothing open.' });
    expect(shapes?.waived).toEqual({ groups: [], count: 0, empty: 'Nothing waived.' });
    expect(phasesOf(shapes?.fixed)).toEqual(['01', '02']);
    const html = renderToStaticMarkup(createElement(WindowsLedgerView, { model: shapes! }));
    expect(html).toContain('<span class="status-chip" data-tone="complete">0 open</span>');
    expect(html).toContain('<p class="empty-note">Nothing open.</p>');
    expect(html).toContain('<p class="empty-note">Nothing waived.</p>');
    expect(html).toContain('01 · 1 fixed');
  });
});

describe("this repo's own WINDOWS.md - the history", () => {
  const own = composeWindowsLedger(inputOf(readFileSync(new URL('WINDOWS.md', LB_PLANNING), 'utf8')));

  it('composes its fixed rows into the history, none open and none waived', () => {
    expect(own?.fixed?.count).toBeGreaterThanOrEqual(9);
    const rows = own!.fixed!.groups.flatMap((group) => group.rows);
    expect(rows.length).toBe(own!.fixed!.count);
    expect(rows.every((row) => row.tone === 'complete')).toBe(true);
    expect(own?.open.empty).toBe('Nothing open.');
    expect(own?.waived.empty).toBe('Nothing waived.');
  });

  it('groups by the verbatim phase string, so quick tasks keep their own group', () => {
    const phases = phasesOf(own?.fixed);
    expect(phases.slice(0, 3)).toEqual(['01', '03', '04']);
    expect(phases).toContain('quick-260909-ogb');
  });
});
