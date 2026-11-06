// Phase 11 (11-15, VIEW-14): the Spikes page's composer and the static markup of its board (sketch 053 winner A, the
// verdict board), over the made-up Lendshed and Shapes spikes trees loaded through the repository, plus planted copies
// for the shapes the fixtures lack. One page serves the manifest, every spike README, CONVENTIONS and WRAP-UP-SUMMARY;
// where the manifest and a README differ both verdicts show, each named, and nothing is merged.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { buildSpikesContext } from '../../src/presentation/spikes-context.ts';
import {
  composeSpikes,
  fileWords,
  requirementWords,
} from '../../src/web/views/spikes-page.ts';
import type { ComposedSpikes, ComposedSpikesSheet, ComposedSpikesSpikeSheet, ComposedSpikesTile } from '../../src/web/views/spikes-page.ts';
import { SheetBody, SpikesView, spikesHeaderProps } from '../../src/web/views/spikes-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';
import { loadShapesProject } from '../helpers/shapes-project.ts';

const MANIFEST = '.planning/spikes/MANIFEST.md';
const README_001 = '.planning/spikes/001-badge-reader-latency/README.md';

function inputOf(presentation: ProjectPresentation, path = MANIFEST, groups: DocumentSectionGroup[] = []): ViewInput {
  const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
  return {
    kind: artifact?.kind ?? (path === MANIFEST ? 'spikes-manifest' : 'spike'),
    frontmatter: artifact?.frontmatter ?? {},
    structured: artifact?.structured ?? {},
    groups,
    planSegments: [],
    spikesContext: buildSpikesContext(presentation, path),
  };
}

const README_003B = '.planning/spikes/003b-local-disk-staging/README.md';
const WRAP_UP = '.planning/spikes/WRAP-UP-SUMMARY.md';
const CONVENTIONS = '.planning/spikes/CONVENTIONS.md';
const group = (heading: string | null, html: string): DocumentSectionGroup => ({ id: heading === null ? null : heading.toLowerCase().split(' ').join('-'), heading, html: `<h2>${heading ?? ''}</h2>${html}` });

function planted(presentation: ProjectPresentation, change: (copy: ProjectPresentation) => void): ProjectPresentation {
  const copy = structuredClone(presentation);
  change(copy);
  return copy;
}

function modelOf(presentation: ProjectPresentation, path = MANIFEST, groups: DocumentSectionGroup[] = []): ComposedSpikes {
  const model = composeSpikes(inputOf(presentation, path, groups));
  expect(model).not.toBeNull();
  return model!;
}

const lendshed = async (): Promise<ProjectPresentation> => (await loadFixtureProject()).presentation;
const render = (node: React.ReactElement): string => renderToStaticMarkup(createElement(MemoryRouter, null, node));
const textOf = (markup: string): string => markup.replace(/<[^>]*>/g, '');
const lanesOf = (model: ComposedSpikes) => model.lanes ?? [];
const tilesOf = (model: ComposedSpikes): ComposedSpikesTile[] => lanesOf(model).flatMap((lane) => lane.cells.flatMap((cell) => cell.tiles));

describe('composeSpikes: Lendshed', () => {
  it('leads with the facts and the four counts, every term kept', async () => {
    const model = modelOf(await lendshed());
    expect(model.head).toMatchObject({
      eyebrow: 'Exploration · Spikes',
      title: 'Spikes',
      facts: ['2 ideas', '6 spikes', '2 not in the manifest', 'Wrapped up 2026-03-30'],
      leadText: '2 validated · 1 partial · 1 invalidated · 0 pending',
      manifestPath: MANIFEST,
    });
    expect(model.columns.map((column) => [column.label, column.count, column.tone])).toEqual([
      ['Validated', 2, 'complete'],
      ['Partial', 1, 'in-flight'],
      ['Invalidated', 1, 'missing'],
      ['Pending', 0, 'quiet'],
    ]);
  });

  it('draws kiosk-handover and export-staging as lanes, an empty cell holding no tile', async () => {
    const model = modelOf(await lendshed());
    expect(lanesOf(model).map((lane) => lane.key)).toEqual(['kiosk-handover', 'export-staging']);
    const kiosk = lanesOf(model)[0];
    expect(kiosk.cells.map((cell) => [cell.label, cell.tiles.map((tile) => tile.id)])).toEqual([
      ['Validated', ['001']],
      ['Partial', []],
      ['Invalidated', ['002']],
      ['Pending', []],
    ]);
  });

  it("flags 003b with 'README says PENDING' and 001 and 002 as wrapped up, 004 as neither", async () => {
    const model = modelOf(await lendshed());
    const tile = (id: string) => tilesOf(model).find((candidate) => candidate.id === id)!;
    expect(tile('003b').readmeSays).toBe('README says PENDING');
    expect(tile('003b').readmeSaysTitle).toBe('README says PENDING (needs a recording)');
    expect(tile('003b').wrappedUp).toBe(false);
    expect(tile('001').wrappedUp).toBe(true);
    expect(tile('002').wrappedUp).toBe(true);
    expect(tile('004')).toMatchObject({ readmeSays: null, wrappedUp: false });
  });

  it('keeps the free text and writes the accessible name as "{id} {name}, {verdict} {free text}"', async () => {
    const model = modelOf(await lendshed());
    const tile = (id: string) => tilesOf(model).find((candidate) => candidate.id === id)!;
    expect(tile('002')).toMatchObject({
      freeText: 'no spare test kiosk',
      label: '002 offline-ledger-queue, Invalidated no spare test kiosk',
      tone: 'missing',
      to: '/spikes/002-offline-ledger-queue/readme',
    });
    expect(tile('001').label).toBe('001 badge-reader-latency, Validated');
    expect(tile('003b')).toMatchObject({ type: 'comparison', files: '3 files' });
  });

  it('lists 005 and SPIKE-006 under Not in the manifest, and 001 and 002 as wrap-up inputs', async () => {
    const model = modelOf(await lendshed());
    expect(model.notInManifest?.title).toBe('Not in the manifest');
    expect(model.notInManifest?.tiles.map((tile) => tile.id)).toEqual(['005', 'SPIKE-006']);
    const [deferred, pauseOnly] = model.notInManifest!.tiles;
    // An unknown keyword is shown as written and untoned; a folder with no README has nothing to open.
    expect(deferred).toMatchObject({ freeText: 'DEFERRED', tone: null, to: '/spikes/005-pdf-receipts/readme' });
    expect(pauseOnly).toMatchObject({ freeText: 'No README', tone: null, to: null, files: 'No files' });
    expect(model.wrapUp.note).toBeNull();
    expect(model.wrapUp.tiles.map((tile) => [tile.fileName, tile.to])).toEqual([
      ['WRAP-UP-SUMMARY.md', '/spikes/wrap-up-summary'],
      ['CONVENTIONS.md', '/spikes/conventions'],
    ]);
    expect(model.wrapUp.tiles[0]).toMatchObject({ title: 'Wrap-up, 2026-03-30' });
    expect(model.wrapUp.tiles[0].detail).toContain('2 spikes processed');
  });

  it('counts requirements with the singular and omits the toggle when an idea lists none', async () => {
    expect(requirementWords(1)).toBe('1 requirement');
    expect(requirementWords(2)).toBe('2 requirements');
    expect(fileWords(1)).toBe('1 file');
    expect(fileWords(3)).toBe('3 files');
    const model = modelOf(await lendshed());
    expect(lanesOf(model)[0].requirementsLabel).toBe('2 requirements');
    const one = planted(await lendshed(), (copy) => {
      const lift = (copy.artifacts.find((a) => a.path === MANIFEST)!.structured.spikes as { manifest: { ideas: Array<{ requirements: string[] }> } }).manifest;
      lift.ideas[0].requirements = ['Must answer within a second'];
      lift.ideas[1].requirements = [];
    });
    const lanes = lanesOf(modelOf(one));
    expect(lanes[0].requirementsLabel).toBe('1 requirement');
    expect(lanes[1].requirementsLabel).toBeNull();
  });

  it('marks the tile the page is open at as current, and no other', async () => {
    const model = modelOf(await lendshed(), README_001);
    expect(tilesOf(model).filter((tile) => tile.active).map((tile) => tile.id)).toEqual(['001']);
    expect(tilesOf(modelOf(await lendshed())).some((tile) => tile.active)).toBe(false);
  });

  it('composes nothing without a context, so the promoted sections render with no notice', () => {
    expect(composeSpikes({ kind: 'spikes-manifest', frontmatter: {}, structured: {}, groups: [], planSegments: [] })).toBeNull();
    expect(composeSpikes({ kind: 'spikes-manifest', frontmatter: {}, structured: {}, groups: [], planSegments: [], spikesContext: null })).toBeNull();
  });
});

describe('composeSpikes: Shapes and the planted shapes', () => {
  it("draws Shapes' one lane with the 'yes' row a quiet untoned tile in Pending and 'Not wrapped up yet'", async () => {
    const { presentation } = await loadShapesProject();
    const model = modelOf(presentation);
    expect(lanesOf(model)).toHaveLength(1);
    const pending = lanesOf(model)[0].cells.find((cell) => cell.column === 'pending')!;
    const yes = pending.tiles.find((tile) => tile.freeText === 'yes');
    expect(yes).toBeDefined();
    expect(yes?.tone).toBeNull();
    // Shapes holds a CONVENTIONS.md but no wrap-up summary: the tile stays, the line names what is missing.
    expect(model.wrapUp.tiles.map((tile) => tile.fileName)).toEqual(['CONVENTIONS.md']);
    expect(model.wrapUp.note).toBe('Not wrapped up yet: no WRAP-UP-SUMMARY.md in .planning/spikes/.');
    expect(model.head.facts.at(-1)).toBe('Not wrapped up');
  });

  it('draws no board and claims no count when there is no manifest: every folder sits under Not in the manifest', async () => {
    const base = await lendshed();
    const bare = planted(base, (copy) => {
      copy.artifacts = copy.artifacts.filter((artifact) => artifact.kind !== 'spikes-manifest');
    });
    const model = modelOf(bare, README_001);
    expect(model.lanes).toBeNull();
    expect(model.head.leadText).toBeNull();
    expect(model.head.manifestPath).toBeNull();
    expect(model.head.facts).toEqual(['6 spikes', 'No manifest', 'Wrapped up 2026-03-30']);
    expect(model.boardNote).toContain('no MANIFEST.md');
    const tiles = model.notInManifest!.tiles;
    expect(tiles.map((tile) => tile.id)).toEqual(['001', '002', '003b', '004', '005', 'SPIKE-006']);
    // The README's own verdict is kept as the tile's verdict where the keyword is known.
    expect(tiles.find((tile) => tile.id === '001')?.tone).toBe('complete');
    expect(tiles.find((tile) => tile.id === '003b')?.tone).toBe('quiet');
  });

  it('says so when the manifest cannot be read, and still lists the folders', async () => {
    const broken = planted(await lendshed(), (copy) => {
      delete copy.artifacts.find((artifact) => artifact.path === MANIFEST)!.structured.spikes;
    });
    const model = modelOf(broken);
    expect(model.lanes).toBeNull();
    expect(model.head.facts[1]).toBe('Manifest unreadable');
    expect(model.boardNote).toContain('could not be read');
    expect(model.notInManifest!.tiles.length).toBeGreaterThan(4);
  });
});

describe('SpikesView: static markup', () => {
  it('renders each idea as a labelled section, each column a labelled list and each tile one link', async () => {
    const model = modelOf(await lendshed());
    const markup = render(createElement(SpikesView, { model }));
    expect(markup).toContain('<h3 class="view-spikes-lane-title"');
    expect(markup).toContain('aria-label="Validated, kiosk-handover"');
    expect(markup).toContain('aria-label="003b local-disk-staging, Validated"');
    expect(markup).toContain('href="/spikes/003b-local-disk-staging/readme"');
    expect(markup).toContain('README says PENDING');
    expect(markup).toContain('Wrapped up');
    expect(markup).toContain('Not in the manifest');
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain('2 requirements +');
    // An empty cell is a dashed hairline: no count, hidden from assistive technology.
    expect(markup).toContain('data-empty="true" aria-hidden="true"');
    expect(markup).not.toContain('view-spikes-cell" data-empty="true" aria-hidden="true">0');
    expect(textOf(markup)).toContain('2 Validated');
  });

  it('keeps the requirements closed until the toggle opens them, and names each count in the chip key', async () => {
    const model = modelOf(await lendshed());
    const markup = render(createElement(SpikesView, { model }));
    expect(markup).not.toContain('Requirements, as the manifest states them');
    expect(markup).toContain('0 Pending');
  });

  it('renders the Wrap-up tiles, and the quiet line where the summary is missing', async () => {
    const wrapped = render(createElement(SpikesView, { model: modelOf(await lendshed()) }));
    expect(wrapped).toContain('WRAP-UP-SUMMARY.md');
    expect(wrapped).toContain('CONVENTIONS.md');
    const { presentation } = await loadShapesProject();
    const bare = render(createElement(SpikesView, { model: modelOf(presentation) }));
    expect(bare).toContain('Not wrapped up yet');
    // With neither file there is no heading and no tile, only the one quiet line.
    const neither = planted(presentation, (copy) => {
      copy.artifacts = copy.artifacts.filter((artifact) => artifact.kind !== 'spikes-conventions');
    });
    const none = render(createElement(SpikesView, { model: modelOf(neither) }));
    expect(none).toContain('no WRAP-UP-SUMMARY.md or CONVENTIONS.md');
    expect(none).not.toContain('>Wrap-up<');
  });

  it('renders author text as text: markup in a verdict or a name is escaped, never injected', async () => {
    const hostile = planted(await lendshed(), (copy) => {
      const lift = (copy.artifacts.find((a) => a.path === MANIFEST)!.structured.spikes as { manifest: { rows: Array<{ verdictText: string; name: string }> } }).manifest;
      lift.rows[0].verdictText = '<img src=x onerror=alert(1)>';
      lift.rows[0].name = '<script>alert(2)</script>';
    });
    const markup = render(createElement(SpikesView, { model: modelOf(hostile) }));
    expect(markup).not.toContain('<img src=x');
    expect(markup).not.toContain('<script>');
    expect(markup).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('writes the header override: the eyebrow, the h1, the lead terms, the facts and the manifest on the copy button', async () => {
    const props = spikesHeaderProps(modelOf(await lendshed()));
    expect(props.eyebrow).toBe('Exploration · Spikes');
    expect(props.title).toBe('Spikes');
    expect(props.path).toBe(MANIFEST);
    expect(props.crumbs?.map((crumb) => crumb.label)).toEqual(['Dashboard', 'Spikes']);
    expect(textOf(renderToStaticMarkup(createElement('div', null, props.lead)))).toBe('2 validated · 1 partial · 1 invalidated · 0 pending');
    expect(textOf(renderToStaticMarkup(createElement('div', null, props.meta)))).toContain('2 not in the manifest');
  });
});

// ---------------------------------------------------------------------------
// 11-16: the sheet. A spike README, the wrap-up and the conventions open over the board at their own address.
// ---------------------------------------------------------------------------

const sheetOf = (model: ComposedSpikes): ComposedSpikesSheet => {
  expect(model.sheet).not.toBeNull();
  return model.sheet!;
};
const spikeSheetOf = (model: ComposedSpikes): ComposedSpikesSpikeSheet => {
  const sheet = sheetOf(model);
  expect(sheet.kind).toBe('spike');
  return sheet as ComposedSpikesSpikeSheet;
};
const renderBody = (sheet: ComposedSpikesSheet): string =>
  render(
    createElement(SheetBody, {
      sheet,
      titleId: 'sheet-title',
      renderHtml: (html: string) => createElement('div', { 'data-doc': 'true' }, html),
    }),
  );
const lift = (copy: ProjectPresentation, path: string): Record<string, unknown> =>
  (copy.artifacts.find((artifact) => artifact.path === path)!.structured.spikes as Record<string, Record<string, unknown>>).readme;

describe('composeSpikes: the sheet at a spike README', () => {
  it("opens 003b's sheet with the manifest's and the README's verdicts apart, never merged", async () => {
    const model = modelOf(await lendshed(), README_003B);
    const sheet = spikeSheetOf(model);
    expect(sheet).toMatchObject({
      eyebrow: 'Spike 003b · export-staging · comparison',
      title: 'local-disk-staging',
      address: '003b-local-disk-staging/README.md',
      closeTo: '/spikes/manifest',
      focus: '003b-local-disk-staging',
      verdict: { word: 'Validated', tone: 'complete', freeText: '' },
    });
    expect(sheet.disagreement).toMatchObject({
      manifest: { label: 'MANIFEST.md', value: 'VALIDATED' },
      readme: { label: 'README.md', value: 'PENDING (needs a recording)' },
    });
    const markup = renderBody(sheet);
    expect(markup).toContain('Verdict · MANIFEST.md');
    expect(markup).toContain('Verdict · README.md');
    expect(textOf(markup)).toContain('VALIDATED');
    expect(textOf(markup)).toContain('PENDING (needs a recording)');
    expect(markup).toContain('differs from');
    expect(markup).toContain('aria-hidden="true"');
  });

  it('draws no disagreement block where the two files agree', async () => {
    const sheet = spikeSheetOf(modelOf(await lendshed(), README_001));
    expect(sheet.disagreement).toBeNull();
    expect(renderBody(sheet)).not.toContain('record-disagreement');
  });

  it("shows 001's id, idea and type, Given / When / Then, the files with their kind and size, and the by-name line", async () => {
    const results = group('Results', '<p>Validated. The slowest cold lookup took 840 ms.</p>');
    const trail = group('Investigation Trail', '<p>Cold lookups were the slow ones.</p>');
    const model = modelOf(await lendshed(), README_001, [group('What This Validates', '<p>x</p>'), group('Research', '<p>r</p>'), results, trail]);
    const sheet = spikeSheetOf(model);
    expect(sheet.eyebrow).toBe('Spike 001 · kiosk-handover · standard');
    expect(sheet.validates).toMatchObject({ kind: 'gwt', given: expect.stringContaining('badge on the reader') });
    expect(sheet.files.map((file) => [file.name, file.kind])).toEqual([
      ['README.md', 'notes'],
      ['out/latency.csv', 'output'],
      ['probe.sh', 'script'],
    ]);
    for (const file of sheet.files) expect(file.size).toMatch(/^\d+(\.\d)? (B|KB|MB)$/);
    expect(sheet.filesTitle).toBe('Files in 001-badge-reader-latency/');
    expect(sheet.tags).toEqual(['kiosk', 'latency']);
    // Results as written; the remaining sections become closed bars, the two the sheet draws itself do not.
    expect(sheet.resultsHtml).toContain('840 ms');
    expect(sheet.bars.map((bar) => bar.title)).toEqual(['Research', 'Investigation Trail']);
    const markup = renderBody(sheet);
    for (const word of ['Given', 'When', 'Then', 'What this validates', 'Results', 'Related']) expect(markup).toContain(word);
    expect(markup).toContain('Listed by name only. Labelore never runs or opens these files.');
    expect(markup).toContain('Files in 001-badge-reader-latency/');
    expect(markup).toContain('<details class="view-spikes-bar">');
    expect(markup).not.toContain('<details class="view-spikes-bar" open');
  });

  it('lists a script and an output by name with no anchor, and issues no request for them', async () => {
    const sheet = spikeSheetOf(modelOf(await lendshed(), README_001));
    const markup = renderBody(sheet);
    const files = markup.slice(markup.indexOf('view-spikes-files'));
    const rows = files.slice(0, files.indexOf('Listed by name only'));
    expect(rows).toContain('probe.sh');
    expect(rows).toContain('out/latency.csv');
    expect(rows).not.toContain('<a ');
    expect(rows).not.toContain('href=');
    for (const file of sheet.files) expect(Object.keys(file).sort()).toEqual(['kind', 'name', 'size']);
    const spy = vi.fn();
    const original = globalThis.fetch;
    globalThis.fetch = spy as unknown as typeof fetch;
    try {
      renderBody(sheet);
    } finally {
      globalThis.fetch = original;
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it('keeps a validates with no Given whole', async () => {
    const whole = planted(await lendshed(), (copy) => {
      lift(copy, README_001).validates = { whole: 'Badge lookups feel instant on the kiosk' };
    });
    const sheet = spikeSheetOf(modelOf(whole, README_001));
    expect(sheet.validates).toEqual({ kind: 'whole', text: 'Badge lookups feel instant on the kiosk' });
    const markup = renderBody(sheet);
    expect(markup).toContain('Badge lookups feel instant on the kiosk');
    expect(markup).not.toContain('>Given<');
  });

  it('resolves a related id to its panel and leaves an unresolved one as plain text', async () => {
    const odd = planted(await lendshed(), (copy) => {
      lift(copy, README_001).related = ['002', '099'];
    });
    const sheet = spikeSheetOf(modelOf(odd, README_001));
    expect(sheet.related.map((chip) => [chip.id, chip.to, chip.tone])).toEqual([
      ['002', '/spikes/002-offline-ledger-queue/readme', 'missing'],
      ['099', null, null],
    ]);
    const markup = renderBody(sheet);
    expect(markup).toContain('href="/spikes/002-offline-ledger-queue/readme"');
    expect(markup).toContain('<span class="view-spikes-rel" data-plain="true">');
    expect(markup).not.toContain('href="/099');
  });

  it('shows the Paused work link from the tile when the folder holds a pause file', async () => {
    const paused = planted(await lendshed(), (copy) => {
      const base = copy.artifacts.find((artifact) => artifact.path.endsWith('SPIKE-006/.continue-here.md'))!;
      copy.artifacts.push({ ...base, path: '.planning/spikes/001-badge-reader-latency/.continue-here.md', key: '/spikes/001-badge-reader-latency/continue-here' });
    });
    const sheet = spikeSheetOf(modelOf(paused, README_001));
    expect(sheet.pauseTo).toBe('/spikes/001-badge-reader-latency/continue-here');
    expect(renderBody(sheet)).toContain('Paused work');
    expect(renderBody(spikeSheetOf(modelOf(await lendshed(), README_001)))).not.toContain('Paused work');
  });

  it('says a folder with no manifest row is not in the manifest and quotes its README', async () => {
    const sheet = spikeSheetOf(modelOf(await lendshed(), '.planning/spikes/005-pdf-receipts/README.md'));
    expect(sheet.verdict).toEqual({ word: 'Not in the manifest', tone: null, freeText: '' });
    expect(sheet.orphanNote).toContain('This folder has no row in MANIFEST.md');
    expect(sheet.orphanNote).toContain('Its README says');
    expect(sheet.disagreement).toBeNull();
  });

  it('writes an unknown keyword as written, untoned, with its free text', async () => {
    const unknown = planted(await lendshed(), (copy) => {
      const rows = (copy.artifacts.find((a) => a.path === MANIFEST)!.structured.spikes as { manifest: { rows: Array<{ id: string; verdictKeyword: string; verdictText: string }> } }).manifest.rows;
      const row = rows.find((candidate) => candidate.id === '001')!;
      row.verdictKeyword = 'DEFERRED';
      row.verdictText = 'until the kiosk arrives';
    });
    const sheet = spikeSheetOf(modelOf(unknown, README_001));
    expect(sheet.verdict).toEqual({ word: 'DEFERRED', tone: null, freeText: 'until the kiosk arrives' });
    expect(renderBody(sheet)).toContain('data-plain="true"');
  });

  it('closes to the manifest, or hides in place when the project has none', async () => {
    expect(sheetOf(modelOf(await lendshed(), README_001)).closeTo).toBe('/spikes/manifest');
    const bare = planted(await lendshed(), (copy) => {
      copy.artifacts = copy.artifacts.filter((artifact) => artifact.kind !== 'spikes-manifest');
    });
    expect(sheetOf(modelOf(bare, README_001)).closeTo).toBeNull();
  });

  it('opens no sheet at the manifest address', async () => {
    expect(modelOf(await lendshed()).sheet).toBeNull();
  });
});

describe('composeSpikes: the sheet at the wrap-up and the conventions', () => {
  it('shows the processed spikes as chips and names those not processed', async () => {
    const model = modelOf(await lendshed(), WRAP_UP, [group('Key Findings', '<p>Stream the archive from a cursor.</p>'), group('Processed Spikes', '<p>t</p>')]);
    const sheet = sheetOf(model);
    expect(sheet.kind).toBe('wrap-up');
    if (sheet.kind !== 'wrap-up') return;
    expect(sheet.title).toBe('Wrap-up, 2026-03-30');
    expect(sheet.processed.map((chip) => chip.id)).toEqual(['001', '002']);
    expect(sheet.processed.map((chip) => chip.to)).toEqual(['/spikes/001-badge-reader-latency/readme', '/spikes/002-offline-ledger-queue/readme']);
    expect(sheet.notProcessed).toContain('003b');
    expect(sheet.notProcessed).toContain('004');
    expect(sheet.findingsHtml).toContain('Stream the archive');
    const markup = renderBody(sheet);
    expect(markup).toContain('Processed spikes');
    expect(markup).toContain('Key findings');
    expect(textOf(markup)).toContain('Not processed: 003b');
  });

  it('shows the conventions as their sections, each a closed bar', async () => {
    const headings = ['Stack', 'Structure', 'Patterns', 'Tools & Libraries'];
    const model = modelOf(await lendshed(), CONVENTIONS, headings.map((heading) => group(heading, `<p>${heading} text</p>`)));
    const sheet = sheetOf(model);
    expect(sheet.kind).toBe('conventions');
    if (sheet.kind !== 'conventions') return;
    expect(sheet.sections.map((section) => section.title)).toEqual(headings);
    const markup = renderBody(sheet);
    expect(markup.split('<details class="view-spikes-bar">')).toHaveLength(5);
  });
});

describe('SpikesView: the sheet shell', () => {
  it('renders the board with no sheet at the manifest and keeps the Dialog out of the markup until it is open', async () => {
    const markup = render(createElement(SpikesView, { model: modelOf(await lendshed()) }));
    expect(markup).not.toContain('view-spikes-sheet');
  });

  it('marks the open spike tile as current and gives each linked tile its folder for focus to return to', async () => {
    const markup = render(createElement(SpikesView, { model: modelOf(await lendshed(), README_003B) }));
    expect(markup).toContain('data-spike-folder="003b-local-disk-staging"');
    expect(markup).toContain('aria-current="page"');
  });
});

// ---------------------------------------------------------------------------
// The view contract: source-text checks in the pause-page idiom (no AST tooling). Comments are stripped before every
// negative check.
// ---------------------------------------------------------------------------

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-11-spikes:start */';
const END = '/* phase-11-spikes:end */';
const COMPOSER = 'src/web/views/spikes-page.ts';
const COMPONENTS = 'src/web/views/spikes-page-components.tsx';
const ALLOWED_SIZES = ['var(--fs-2)', 'var(--fs-4)', 'var(--fs-7)', 'var(--fs-display-1)', 'var(--fs-display-3)', 'inherit'];

function stripSourceComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function writesForbiddenTone(text: string): boolean {
  return (
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning)['"]/.test(text) ||
    /data-tone="(destructive|warning)"/.test(text) ||
    /'(destructive|warning)'\s*\|/.test(text) ||
    /\|\s*'(destructive|warning)'/.test(text)
  );
}

function writesNetworkOrStorage(text: string): boolean {
  return /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|document\.cookie)\b/.test(text);
}

function cssViolations(block: string): string[] {
  const found: string[] = [];
  if (/--destructive|--warning/.test(block)) found.push('parse-degradation token');
  if (/\boklch\(|\brgb\(|\bhsl\(/.test(block)) found.push('colour function');
  if (/:[^;{}]*#[0-9a-fA-F]{3,8}\b/.test(block)) found.push('hex colour');
  if (/radius\s*:/.test(block)) found.push('radius');
  if (/color-mix\(/.test(block)) found.push('color-mix recipe');
  if (/@keyframes/.test(block)) found.push('keyframes');
  if (/\banimation\b/.test(block)) found.push('animation');
  if (/\btransition\b/.test(block)) found.push('transition');
  if (/:root/.test(block)) found.push(':root');
  return found;
}

function fontSizes(block: string): string[] {
  return [...block.matchAll(/font-size\s*:\s*([^;]+);/g)].map((m) => m[1]!.trim());
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('spikes view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesNetworkOrStorage("await fetch('/x')")).toBe(true);
    expect(cssViolations('a { color: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });
});

describe('spikes view contract - the real sources', () => {
  it('the components render no raw HTML, make no request, touch no storage and write no destructive or warning tone', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code.includes(RAW_HTML_PROP)).toBe(false);
    expect(writesNetworkOrStorage(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).toContain('aria-hidden="true"');
  });

  it('author text goes through ResearchInline as React text, and a tile is a router Link built from the payload address', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("from '../pages/research-atoms.tsx'");
    expect(code).toContain('<ResearchInline text={tile.name} />');
    expect(code).toContain('<ResearchInline text={tile.freeText} />');
    expect(code).toContain("from '../nav.tsx'");
    expect(code).toMatch(/import \{ Link[^}]*\} from '\.\.\/nav\.tsx'/);
    expect(code).toContain('to={tile.to}');
    expect(code).toContain('aria-label={tile.label}');
    expect(code).toContain('aria-expanded={open}');
  });

  it('the composer builds no regular expression, uses no regex literal, imports no filesystem module and reads no clock', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(code).not.toMatch(/new\s+RegExp\s*\(|\bRegExp\s*\(/);
    expect(code).not.toMatch(/\.(test|exec|match|matchAll|replace|replaceAll|split|search)\(\s*\//);
    expect(code).not.toMatch(/from 'node:(fs|path)|from 'fs'/);
    expect(code).not.toMatch(/^(export\s+)?(let|var)\s/m);
    expect(code).not.toMatch(/Date\.now\(|new Date\(/);
    expect(code).not.toContain("'destructive'");
    expect(code).not.toContain("'warning'");
    expect(writesForbiddenTone(code)).toBe(false);
  });

  it('writes the contracted words', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    for (const words of ['Not in the manifest', 'Not wrapped up yet', 'README says', 'Wrapped up', 'Exploration · Spikes', 'Verdict board']) {
      const home = words === 'Verdict board' ? COMPONENTS : COMPOSER;
      expect(stripSourceComments(await source(home)), words).toContain(words);
    }
    expect(code).toContain('requirement');
  });

  it('artifact-page.tsx draws the page from the composed model in View mode and the manifest keeps its fallback', async () => {
    const page = stripSourceComments(await source('src/web/pages/artifact-page.tsx'));
    expect(page).toContain('<SpikesView key="spikes" model={spikesCover} renderHtml={renderHtml} />');
    expect(page).toContain('manifest.spikesPage?.(viewInput)');
    expect(page).toContain('spikesContext: query.data.spikesContext ?? null');
    expect(page).not.toMatch(/artifact\.kind === ['"](spike|spikes|spikes-manifest)['"]/);
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests.match(/spikesPage: composeSpikes/g)).toHaveLength(1);
  });

  it('the CSS holds one contiguous phase-11-spikes block with no colour recipe and only the five contracted font sizes', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(count(css, START)).toBe(1);
    expect(count(css, END)).toBe(1);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    expect(end).toBeGreaterThan(start);
    const block = css.slice(start, end);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-spikes-/);
    const sizes = fontSizes(stripCssComments(block));
    expect(sizes.length).toBeGreaterThan(8);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
    // X4 (approved at 11-01): the column counts are the one place --fs-display-1 appears.
    expect(sizes.filter((size) => size === 'var(--fs-display-1)')).toHaveLength(1);
    expect(stripCssComments(block).slice(stripCssComments(block).indexOf('.view-spikes-num {'))).toContain('font-size: var(--fs-display-1)');
    for (const selector of ['.view-spikes-root', '.view-spikes-board', '.view-spikes-lane', '.view-spikes-tile', '@media (max-width: 48rem)']) {
      expect(block, selector).toContain(selector);
    }
  });

  it('the sheet reuses the shared RecordDisagreement, lists files as text with no link, and says "by name only" once', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("from '../components/record-disagreement.tsx'");
    expect(code).toContain('<RecordDisagreement');
    const files = code.slice(code.indexOf('function FilesList'), code.indexOf('function Bars'));
    expect(files).not.toMatch(/<(a|Link)\b/);
    expect(files).not.toContain('href');
    expect(count(code, 'Listed by name only. Labelore never runs or opens these files.')).toBe(1);
    expect(code).toContain('aria-label={SHEET_CLOSE_LABEL}');
    expect(await source('src/web/views/spikes-page.ts')).toContain("SHEET_CLOSE_LABEL = 'Close spike'");
  });

  it('reuses no view-pause-*, research-* or view-codebase-* class', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).not.toMatch(/className=["'{][^>]*\b(view-pause-|research-|view-codebase-)/);
    const css = await source('src/web/styles/globals.css');
    const inside = stripCssComments(css.slice(css.indexOf(START), css.indexOf(END)));
    expect(inside).not.toMatch(/\.view-pause-|\.view-codebase-|\.research-/);
  });
});
