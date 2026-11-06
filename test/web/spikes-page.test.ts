// Phase 11 (11-15, VIEW-14): the Spikes page's composer and the static markup of its board (sketch 053 winner A, the
// verdict board), over the made-up Lendshed and Shapes spikes trees loaded through the repository, plus planted copies
// for the shapes the fixtures lack. One page serves the manifest, every spike README, CONVENTIONS and WRAP-UP-SUMMARY;
// where the manifest and a README differ both verdicts show, each named, and nothing is merged.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { buildSpikesContext } from '../../src/presentation/spikes-context.ts';
import {
  composeSpikes,
  fileWords,
  requirementWords,
} from '../../src/web/views/spikes-page.ts';
import type { ComposedSpikes, ComposedSpikesTile } from '../../src/web/views/spikes-page.ts';
import { SpikesView, spikesHeaderProps } from '../../src/web/views/spikes-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';
import { loadShapesProject } from '../helpers/shapes-project.ts';

const MANIFEST = '.planning/spikes/MANIFEST.md';
const README_001 = '.planning/spikes/001-badge-reader-latency/README.md';

function inputOf(presentation: ProjectPresentation, path = MANIFEST): ViewInput {
  const kind = path === MANIFEST ? 'spikes-manifest' : 'spike';
  return {
    kind,
    frontmatter: {},
    structured: {},
    groups: [],
    planSegments: [],
    spikesContext: buildSpikesContext(presentation, path),
  };
}

function planted(presentation: ProjectPresentation, change: (copy: ProjectPresentation) => void): ProjectPresentation {
  const copy = structuredClone(presentation);
  change(copy);
  return copy;
}

function modelOf(presentation: ProjectPresentation, path = MANIFEST): ComposedSpikes {
  const model = composeSpikes(inputOf(presentation, path));
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
    expect(code).toContain("import { Link } from '../nav.tsx'");
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
    expect(page).toContain('<SpikesView key={artifact.path} model={spikesCover} />');
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

  it('reuses no view-pause-*, research-* or view-codebase-* class', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).not.toMatch(/className=["'{][^>]*\b(view-pause-|research-|view-codebase-)/);
    const css = await source('src/web/styles/globals.css');
    const inside = stripCssComments(css.slice(css.indexOf(START), css.indexOf(END)));
    expect(inside).not.toMatch(/\.view-pause-|\.view-codebase-|\.research-/);
  });
});
