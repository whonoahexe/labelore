// Phase 11 (11-12, VIEW-14, D-01, D-07): the Spikes page's server-side join, over the real Lendshed and Shapes
// presentations loaded through the repository, plus a generated letter-family tree and planted copies for the
// shapes Lendshed does not hold. The manifest's verdict and a README's verdict are separate facts: where they
// differ both are kept, nothing is merged.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { ArtifactDto, ProjectPresentation } from '../../src/server/project-presentation.ts';
import type { SpikeManifestRow } from '../../src/planning-repo/handlers/spikes-lift.ts';
import {
  VERDICT_COLUMNS,
  buildSpikesContext,
  columnOfKeyword,
  compareSpikeIds,
  spikeFileKind,
} from '../../src/presentation/spikes-context.ts';
import type { SpikeTile, SpikesContext } from '../../src/presentation/spikes-context.ts';
import { fxRead, loadFixtureProject, loadProject } from '../helpers/fixture-project.ts';
import { loadShapesProject } from '../helpers/shapes-project.ts';
import { writeLetterFamilySpikes } from '../helpers/spike-fixtures.ts';

const MANIFEST = '.planning/spikes/MANIFEST.md';
const README_003B = '.planning/spikes/003b-local-disk-staging/README.md';

async function lendshed(): Promise<ProjectPresentation> {
  return (await loadFixtureProject()).presentation;
}

function planted(presentation: ProjectPresentation, change: (copy: ProjectPresentation) => void): ProjectPresentation {
  const copy = structuredClone(presentation);
  change(copy);
  return copy;
}

function manifestOf(copy: ProjectPresentation): ArtifactDto {
  return copy.artifacts.find((artifact) => artifact.path === MANIFEST)!;
}

function setRows(copy: ProjectPresentation, rows: Array<Partial<SpikeManifestRow> & { id: string }>): void {
  const lift = (manifestOf(copy).structured.spikes as { manifest: { rows: SpikeManifestRow[] } }).manifest;
  lift.rows = rows.map((row) => ({
    idea: 'kiosk-handover',
    name: `name-${row.id}`,
    type: 'standard',
    validates: '',
    verdictKeyword: 'VALIDATED',
    verdictText: '',
    tags: [],
    ...row,
  }));
}

const ids = (tiles: SpikeTile[]): string[] => tiles.map((tile) => tile.id);
const allTiles = (context: SpikesContext): SpikeTile[] =>
  context.lanes.flatMap((lane) => VERDICT_COLUMNS.flatMap((column) => lane.columns[column.key]));

describe('buildSpikesContext: Lendshed', () => {
  it('groups the manifest rows into the kiosk-handover and export-staging lanes across four columns', async () => {
    const context = buildSpikesContext(await lendshed(), MANIFEST)!;
    expect(VERDICT_COLUMNS.map((column) => column.key)).toEqual(['validated', 'partial', 'invalidated', 'pending']);
    expect(context.lanes.map((lane) => lane.key)).toEqual(['kiosk-handover', 'export-staging']);
    expect(context.lanes[0].requirements).toHaveLength(2);
    expect(context.lanes[0].paragraph).toContain('how fast the badge reader answers');
    expect(context.counts).toEqual({ validated: 2, partial: 1, invalidated: 1, pending: 0 });
    const [kiosk, exportStaging] = context.lanes;
    expect(ids(kiosk.columns.validated)).toEqual(['001']);
    expect(ids(kiosk.columns.invalidated)).toEqual(['002']);
    expect(ids(exportStaging.columns.validated)).toEqual(['003b']);
    expect(ids(exportStaging.columns.partial)).toEqual(['004']);
    expect(kiosk.count).toBe(2);
  });

  it('keeps the free text on the tile: 002 INVALIDATED (no spare test kiosk), 004 PARTIAL (resume untested)', async () => {
    const context = buildSpikesContext(await lendshed(), MANIFEST)!;
    const tile = (id: string): SpikeTile => allTiles(context).find((candidate) => candidate.id === id)!;
    expect(tile('002')).toMatchObject({ verdictKeyword: 'INVALIDATED', verdictText: 'no spare test kiosk', columnKey: 'invalidated', known: true, idea: 'kiosk-handover' });
    expect(tile('004')).toMatchObject({ verdictKeyword: 'PARTIAL', verdictText: 'resume untested', columnKey: 'partial' });
    expect(tile('003b')).toMatchObject({ type: 'comparison', name: 'local-disk-staging', url: '/spikes/003b-local-disk-staging/readme' });
  });

  it("carries the README's own verdict on 003b beside the manifest's, never merged (prohibition)", async () => {
    const context = buildSpikesContext(await lendshed(), MANIFEST)!;
    const tile = allTiles(context).find((candidate) => candidate.id === '003b')!;
    expect(tile.columnKey).toBe('validated');
    expect(tile.verdictKeyword).toBe('VALIDATED');
    expect(tile.readmeSays).toBe('PENDING');
    expect(tile.readmeSaysText).toBe('needs a recording');
    // The README of 004 says PARTIAL (recovered from the head) as the manifest does: shown once.
    const same = allTiles(context).find((candidate) => candidate.id === '004')!;
    expect(same.readmeSays).toBeNull();
    expect(same.readmeSaysText).toBeNull();
    // 001 and 002 agree with their manifest rows.
    expect(allTiles(context).filter((t) => t.id === '001' || t.id === '002').every((t) => t.readmeSays === null)).toBe(true);
  });

  it('flags the spikes the wrap-up lists', async () => {
    const context = buildSpikesContext(await lendshed(), MANIFEST)!;
    const wrapped = Object.fromEntries(allTiles(context).map((tile) => [tile.id, tile.wrappedUp]));
    expect(wrapped).toEqual({ '001': true, '002': true, '003b': false, '004': false });
  });

  it('lists 005 (DEFERRED, README only) and SPIKE-006 (a pause, no README) under notInManifest', async () => {
    const context = buildSpikesContext(await lendshed(), MANIFEST)!;
    expect(context.notInManifest.map((entry) => entry.folder)).toEqual(['005-pdf-receipts', 'SPIKE-006']);
    const [deferred, pauseOnly] = context.notInManifest;
    expect(deferred).toMatchObject({ id: '005', name: 'pdf-receipts', verdictKeyword: 'DEFERRED', columnKey: null, known: false, url: '/spikes/005-pdf-receipts/readme' });
    expect(pauseOnly).toMatchObject({ id: 'SPIKE-006', verdictKeyword: '', verdictText: '', columnKey: null, known: false, url: null, files: [], fileCount: 0 });
    expect(pauseOnly.pauseUrl).toBe('/spikes/SPIKE-006/.continue-here');
    expect(context.facts).toEqual({ ideas: 2, spikes: 6, notInManifestCount: 2, wrappedUpDate: '2026-03-30' });
  });

  it('lists spike 001 files by name, kind and size only: README notes, out/latency.csv output, probe.sh script', async () => {
    const context = buildSpikesContext(await lendshed(), MANIFEST)!;
    const tile = allTiles(context).find((candidate) => candidate.id === '001')!;
    expect(tile.files.map((file) => [file.name, file.kind])).toEqual([
      ['README.md', 'notes'],
      ['out/latency.csv', 'output'],
      ['probe.sh', 'script'],
    ]);
    expect(tile.fileCount).toBe(3);
    for (const file of tile.files) {
      expect(Object.keys(file).sort()).toEqual(['kind', 'name', 'sizeBytes', 'url']);
      expect(file.sizeBytes).toBeGreaterThan(0);
    }
    expect(tile.files[1].url).toBe('/spikes/001-badge-reader-latency/out/latency.csv');
    expect(allTiles(context).find((t) => t.id === '003b')!.files.map((file) => file.name)).toEqual(['README.md', 'make_bundle.sh', 'out/bundle.log']);
  });

  it('carries no script or output content: the JSON holds none of probe.sh', async () => {
    const context = buildSpikesContext(await lendshed(), MANIFEST)!;
    const json = JSON.stringify(context);
    const script = fxRead('spikes/001-badge-reader-latency/probe.sh');
    const line = script.split('\n').map((l) => l.trim()).filter((l) => l.length > 12 && !l.startsWith('#'))[0];
    expect(line).toBeDefined();
    expect(json).not.toContain(line);
    expect(json).not.toContain('"content"');
  });

  it('carries the wrap-up with its processed chips and the spikes it did not process', async () => {
    const context = buildSpikesContext(await lendshed(), MANIFEST)!;
    expect(context.wrapUp).toMatchObject({ url: '/spikes/wrap-up-summary', date: '2026-03-30', count: 2, skillPath: './.claude/skills/spike-findings-lendshed/' });
    expect(context.wrapUp!.processed.map((row) => [row.id, row.url])).toEqual([
      ['001', '/spikes/001-badge-reader-latency/readme'],
      ['002', '/spikes/002-offline-ledger-queue/readme'],
    ]);
    expect(context.wrapUp!.notProcessed.map((row) => row.id)).toEqual(['003b', '004', '005']);
    expect(context.conventions).toEqual({ url: '/spikes/conventions' });
    expect(context.manifest).toEqual({ path: MANIFEST, url: '/spikes/manifest', readable: true });
  });

  it('names the panel the address names', async () => {
    const presentation = await lendshed();
    expect(buildSpikesContext(presentation, MANIFEST)!.activeKey).toBeNull();
    expect(buildSpikesContext(presentation, README_003B)!.activeKey).toBe('003b-local-disk-staging');
    expect(buildSpikesContext(presentation, '.planning/spikes/WRAP-UP-SUMMARY.md')!.activeKey).toBe('wrap-up-summary');
    expect(buildSpikesContext(presentation, '.planning/spikes/CONVENTIONS.md')!.activeKey).toBe('conventions');
  });

  it('gives null for a path outside the spikes folder and never throws on a broken presentation', async () => {
    const presentation = await lendshed();
    expect(buildSpikesContext(presentation, '.planning/STATE.md')).toBeNull();
    expect(buildSpikesContext({ artifacts: null } as unknown as ProjectPresentation, MANIFEST)).toBeNull();
  });
});

describe('buildSpikesContext: order, unknown verdicts and bad manifests', () => {
  it('orders tiles by id (number, then letter suffix) whatever order the table lists them', async () => {
    const copy = planted(await lendshed(), (draft) => setRows(draft, [{ id: '10' }, { id: '002' }, { id: '001b' }, { id: '001' }, { id: '001a' }]));
    const context = buildSpikesContext(copy, MANIFEST)!;
    expect(ids(context.lanes[0].columns.validated)).toEqual(['001', '001a', '001b', '002', '10']);
  });

  it('keeps manifest row order between two rows with the same id', async () => {
    const copy = planted(await lendshed(), (draft) => setRows(draft, [{ id: '001', name: 'second-listed-first' }, { id: '001', name: 'x' }]));
    expect(allTiles(buildSpikesContext(copy, MANIFEST)!).map((tile) => tile.name)).toEqual(['second-listed-first', 'x']);
  });

  it('compares ids as numbers, then suffixes, with non-numeric ids last', () => {
    const sorted = ['SPIKE-006', '10', '002', '001b', '001', '001a', '9'].sort(compareSpikeIds);
    expect(sorted).toEqual(['001', '001a', '001b', '002', '9', '10', 'SPIKE-006']);
  });

  it('puts an unknown keyword and an empty cell in Pending as written, untoned', async () => {
    const copy = planted(await lendshed(), (draft) =>
      setRows(draft, [
        { id: '001', verdictKeyword: 'DEFERRED', verdictText: 'later' },
        { id: '002', verdictKeyword: '', verdictText: '' },
        { id: '003', verdictKeyword: 'pending', verdictText: '' },
      ]),
    );
    const context = buildSpikesContext(copy, MANIFEST)!;
    const pending = context.lanes[0].columns.pending;
    expect(pending.map((tile) => [tile.id, tile.verdictKeyword, tile.verdictText, tile.known])).toEqual([
      ['001', 'DEFERRED', 'later', false],
      ['002', '', '', false],
      ['003', 'pending', '', true],
    ]);
    expect(context.counts.pending).toBe(3);
    expect(columnOfKeyword('**VALIDATED**')).toBe('validated');
    expect(columnOfKeyword('')).toBeNull();
  });

  it('yields no lanes and every folder under notInManifest when there is no MANIFEST.md', async () => {
    const copy = planted(await lendshed(), (draft) => {
      draft.artifacts = draft.artifacts.filter((artifact) => artifact.path !== MANIFEST);
    });
    const context = buildSpikesContext(copy, README_003B)!;
    expect(context.lanes).toEqual([]);
    expect(context.manifest).toBeNull();
    expect(context.notInManifest.map((entry) => [entry.id, entry.verdictKeyword])).toEqual([
      ['001', 'VALIDATED'],
      ['002', 'INVALIDATED'],
      ['003b', 'PENDING'],
      ['004', 'PARTIAL'],
      ['005', 'DEFERRED'],
      ['SPIKE-006', ''],
    ]);
    expect(context.facts.ideas).toBe(0);
  });

  it('treats a manifest that cannot be read like a missing one, and says so', async () => {
    const copy = planted(await lendshed(), (draft) => {
      manifestOf(draft).structured = {};
    });
    const context = buildSpikesContext(copy, MANIFEST)!;
    expect(context.lanes).toEqual([]);
    expect(context.manifest).toMatchObject({ path: MANIFEST, readable: false });
    expect(context.notInManifest).toHaveLength(6);
  });

  it('yields no lanes for a manifest with zero rows', async () => {
    const copy = planted(await lendshed(), (draft) => setRows(draft, []));
    const context = buildSpikesContext(copy, MANIFEST)!;
    expect(context.lanes).toEqual([]);
    expect(context.manifest?.readable).toBe(true);
    expect(context.counts).toEqual({ validated: 0, partial: 0, invalidated: 0, pending: 0 });
  });

  it('builds a normal context for a single spike', async () => {
    const copy = planted(await lendshed(), (draft) => setRows(draft, [{ id: '001' }]));
    const context = buildSpikesContext(copy, MANIFEST)!;
    expect(context.lanes).toHaveLength(2);
    expect(allTiles(context)).toHaveLength(1);
    expect(context.counts.validated).toBe(1);
  });

  it('makes a lane for an idea a row names that the manifest never declared, after the declared ones', async () => {
    const copy = planted(await lendshed(), (draft) => setRows(draft, [{ id: '001', idea: 'Kiosk-Handover' }, { id: '002', idea: 'surprise' }]));
    const context = buildSpikesContext(copy, MANIFEST)!;
    // Case differences meet the declared lane; an undeclared idea follows with no paragraph.
    expect(context.lanes.map((lane) => lane.key)).toEqual(['kiosk-handover', 'export-staging', 'surprise']);
    expect(context.lanes[2]).toMatchObject({ paragraph: '', requirements: [], count: 1 });
  });
});

describe('buildSpikesContext: other trees', () => {
  const made: string[] = [];
  afterAll(() => {
    for (const dir of made) rmSync(dir, { recursive: true, force: true });
  });

  it('lists a letter family in id order though the table lists 001c first, with no wrap-up', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'spike-family-'));
    made.push(dir);
    writeLetterFamilySpikes(dir);
    const { presentation } = await loadProject(dir);
    const context = buildSpikesContext(presentation, MANIFEST)!;
    expect(context.lanes.map((lane) => lane.key)).toEqual(['seed-labelling']);
    expect(ids(context.lanes[0].columns.validated)).toEqual(['001a', '001b', '001c']);
    expect(context.wrapUp).toBeNull();
    expect(context.facts.wrappedUpDate).toBeNull();
    expect(context.notInManifest).toEqual([]);
    expect(allTiles(context).every((tile) => !tile.wrappedUp)).toBe(true);
    expect(allTiles(context).find((tile) => tile.id === '001c')).toMatchObject({ verdictText: 'lost on a restart', fileCount: 3 });
    // Each README agrees with its manifest keyword, so nothing is flagged.
    expect(allTiles(context).every((tile) => tile.readmeSays === null)).toBe(true);
  });

  it("reads Shapes' older manifest as one implicit lane, its 'yes' verdict untoned in Pending", async () => {
    const { presentation } = await loadShapesProject();
    const context = buildSpikesContext(presentation, MANIFEST)!;
    expect(context.lanes).toHaveLength(1);
    expect(context.lanes[0]).toMatchObject({ key: 'spikes', implicit: true, count: 1 });
    expect(context.lanes[0].columns.pending).toHaveLength(1);
    expect(context.lanes[0].columns.pending[0]).toMatchObject({
      id: '001',
      name: 'kiln-sensor',
      verdictKeyword: 'yes',
      known: false,
      columnKey: 'pending',
      url: '/spikes/001-kiln-sensor/readme',
      readmeSays: null,
    });
    expect(context.notInManifest).toEqual([]);
    expect(context.wrapUp).toBeNull();
  });

  it('classifies file kinds by position and extension', () => {
    expect(spikeFileKind('README.md')).toBe('notes');
    expect(spikeFileKind('notes/extra.md')).toBe('notes');
    expect(spikeFileKind('out/anything.sh')).toBe('output');
    for (const name of ['a.csv', 'a.log', 'a.json', 'a.txt', 'a.png', 'a.jpg', 'a.webm', 'a.mp4']) expect(spikeFileKind(name)).toBe('output');
    for (const name of ['probe.sh', 'queue.js', 'run.py', 'Makefile']) expect(spikeFileKind(name)).toBe('script');
  });
});
