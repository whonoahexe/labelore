// Phase 11 (11-25, VIEW-18): the forensics page's composer and the static markup of its page (sketch 060 winner B, the Evidence
// rail), over the made-up Lendshed forensics reports loaded through the repository, plus planted copies (made inside the test from
// the fixture text, never by editing a fixture) for the shapes the fixtures lack: a confidence word outside HIGH, MEDIUM and LOW,
// a report with only a hypothesis, one whose git days all fall on one day and one with none of the known headings. A report leads
// with its hypothesis and actions in its own words and order; nothing is re-worded, reordered or merged.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { extractForensics } from '../../src/planning-repo/handlers/reports-lift.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { composeForensics, paragraphsOf } from '../../src/web/views/forensics-page.ts';
import type { ComposedForensics } from '../../src/web/views/forensics-page.ts';
import { ForensicsView, forensicsHeaderProps } from '../../src/web/views/forensics-page-components.tsx';
import { fxRead, loadFixtureProject } from '../helpers/fixture-project.ts';

const FIRST = '.planning/forensics/report-20260402-101500.md';
const SECOND = '.planning/forensics/report-20260406-090000.md';

function inputOf(presentation: ProjectPresentation, path: string, groups: DocumentSectionGroup[] = []): ViewInput {
  const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
  return { kind: 'forensics', frontmatter: {}, structured: artifact?.structured ?? {}, groups, planSegments: [] };
}

/** A view input whose lift is read from this text, the way the handler reads a file. */
function inputFromText(text: string, groups: DocumentSectionGroup[] = []): ViewInput {
  const lift = extractForensics(text);
  return { kind: 'forensics', frontmatter: {}, structured: lift === null ? {} : { forensics: lift }, groups, planSegments: [] };
}

function composed(model: ComposedForensics | null): ComposedForensics {
  expect(model).not.toBeNull();
  return model as ComposedForensics;
}

function markup(model: ComposedForensics): string {
  return renderToStaticMarkup(createElement(ForensicsView, { model }));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

async function lendshed(): Promise<ProjectPresentation> {
  return (await loadFixtureProject()).presentation;
}

/** The numbered items under `## Recommended Actions` in a fixture report, markers dropped. */
function fixtureActions(text: string): string[] {
  const lines = text.split('\n');
  const from = lines.findIndex((line) => line.startsWith('## Recommended Actions'));
  const items: string[] = [];
  for (let at = from + 1; at < lines.length; at += 1) {
    if (lines[at]!.startsWith('---') || lines[at]!.startsWith('## ')) break;
    const dot = lines[at]!.indexOf('. ');
    if (dot > 0 && dot < 3) items.push(lines[at]!.slice(dot + 2).trim());
  }
  return items;
}

function escapeText(text: string): string {
  return text.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
}

describe('forensics page: report-20260402-101500.md, anomalies at each confidence', () => {
  it('shows the head, the hypothesis and the actions verbatim and in the report order', async () => {
    const presentation = await lendshed();
    const model = composed(composeForensics(inputOf(presentation, FIRST)));
    const text = fxRead('forensics/report-20260402-101500.md');
    expect(model.head).toEqual({
      eyebrow: 'Forensics',
      title: 'Forensic Report',
      generated: '2026-04-02T09:15:21Z',
      problem:
        'Phase 2 was marked finished at the end of the last session, but the permissions grid page still lets a member open a shed they hold no permission on.',
    });
    expect(model.hypothesis).toEqual([
      'Plan 02-03 stopped before its route change was committed, and the next session closed the phase from the roadmap instead of from a verification run, so the missing check was never seen.',
    ]);
    expect(text).toContain(model.hypothesis[0]);
    expect(model.actions).toEqual(fixtureActions(text));
    expect(model.actions).toHaveLength(3);
    const html = markup(model);
    // The rendered hypothesis and actions are the fixture's lines, in the order the fixture wrote them (inline code becomes <code>).
    expect(html).toContain(escapeText(model.hypothesis[0]!));
    const positions = ['Finish plan 02-03', 'Run <code>/gsd-verify-work 2</code>', 'If the route still lets a member through'].map((words) =>
      html.indexOf(words),
    );
    expect(positions.every((at) => at > 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    // The hypothesis and the actions lead: both come before the anomalies and the rail.
    expect(html.indexOf('Root cause hypothesis')).toBeLessThan(html.indexOf('Recommended actions'));
    expect(html.indexOf('Recommended actions')).toBeLessThan(html.indexOf('>Anomalies<'));
    expect(html.indexOf('>Anomalies<')).toBeLessThan(html.indexOf('Artifact completeness'));
  });

  it('orders the anomalies HIGH, MEDIUM, LOW with an untoned chip carrying its words', async () => {
    const presentation = await lendshed();
    const model = composed(composeForensics(inputOf(presentation, FIRST)));
    expect(model.anomalies.map((card) => [card.number, card.kind, card.chip])).toEqual([
      [1, 'high', 'High confidence'],
      [2, 'medium', 'Medium confidence'],
      [3, 'low', 'Low confidence'],
    ]);
    expect(model.anomalies[0]!.type).toBe('Shed list route skips the permission check');
    expect(model.anomalies.map((card) => card.open)).toEqual([true, false, false]);
    const html = markup(model);
    expect(html.indexOf('High confidence')).toBeLessThan(html.indexOf('Medium confidence'));
    expect(html.indexOf('Medium confidence')).toBeLessThan(html.indexOf('Low confidence'));
    for (const chip of html.match(/<span class="status-chip view-forensics-chip"[^>]*>[^<]*<\/span>/g) ?? []) {
      expect(chip).not.toContain('data-tone');
    }
    expect(count(html, 'class="status-chip view-forensics-chip"')).toBe(4);
    expect(html).toContain('data-conf="high"');
    expect(html).toContain('data-conf="medium"');
    expect(html).toContain('data-conf="low"');
    expect(html).toContain('>Evidence<');
    expect(html).toContain('>Interpretation<');
    expect(html).not.toContain('No anomalies were detected.');
  });

  it('draws the artifact grid with the word Absent beside every absent square and counts them', async () => {
    const presentation = await lendshed();
    const model = composed(composeForensics(inputOf(presentation, FIRST)));
    expect(model.grid).not.toBeNull();
    const grid = model.grid!;
    expect(grid.phases.map((phase) => phase.number)).toEqual(['01', '02', '03', '04']);
    expect(grid.phases[0]!.name).toBe('Member Sign-In & Sessions');
    expect(grid.rows.map((row) => row.artifact)).toEqual(['PLAN', 'CONTEXT', 'RESEARCH', 'SUMMARY', 'VERIFICATION']);
    expect(grid.rows[0]!.cells.map((cell) => [cell.state, cell.note])).toEqual([
      ['present', '(6)'],
      ['present', '(5)'],
      ['absent', ''],
      ['absent', ''],
    ]);
    expect(grid.rows[4]!.cells[0]).toMatchObject({ state: 'present', note: 'passed 4/4' });
    expect(grid.absent).toBe(11);
    expect(grid.total).toBe(20);
    expect(grid.summary).toBe('11 of 20 artifacts absent');
    const html = markup(model);
    expect(count(html, '>Absent<')).toBe(11);
    expect(count(html, 'data-tone="missing"')).toBe(11);
    expect(count(html, 'data-tone="complete"')).toBe(9);
    expect(html).toContain('11 of 20 artifacts absent');
    expect(html).toContain('passed 4/4');
    expect(html).toContain('(6/6)');
    // Every square is decoration beside a word.
    expect(count(html, 'aria-hidden="true"')).toBeGreaterThanOrEqual(20);
  });

  it('draws the git span as an axis from the report own dates, and the Git Activity and Planning State lists as written', async () => {
    const presentation = await lendshed();
    const model = composed(composeForensics(inputOf(presentation, FIRST)));
    expect(model.evidence.map((block) => block.heading)).toEqual(['Git Activity', 'Planning State']);
    const axis = model.evidence[0]!.axis!;
    expect(axis).toMatchObject({ fromLabel: '03-28', lastLabel: '04-01', generatedLabel: '04-02' });
    expect(axis.lastAt).toBeCloseTo(0.8, 5);
    expect(axis.generatedAt).toBe(1);
    expect(axis.showLastLabel).toBe(true);
    expect(model.evidence[1]!.axis).toBeNull();
    expect(model.evidence[0]!.rows[2]).toMatchObject({ label: 'Time span', value: '2026-03-28 → 2026-04-01' });
    expect(model.evidence[1]!.rows.map((row) => row.label)).toEqual(['Current milestone', 'Current phase', 'Last session', 'Blockers']);
    const html = markup(model);
    expect(html).toContain('Time span 2026-03-28 to the last commit 2026-04-01, report generated 2026-04-02');
    expect(html).toContain('Planning State');
  });

  it('sets the header: the eyebrow, the title, the stamp as meta and the app crumbs', async () => {
    const presentation = await lendshed();
    const model = composed(composeForensics(inputOf(presentation, FIRST)));
    const header = forensicsHeaderProps(model, 'file title', FIRST);
    expect(header.eyebrow).toBe('Forensics');
    expect(header.title).toBe('Forensic Report');
    expect(header.lead).toBeNull();
    expect(header.crumbs!.map((crumb) => crumb.label)).toEqual(['Dashboard', 'Roadmap', 'report-20260402-101500']);
    expect(renderToStaticMarkup(createElement('div', null, header.meta))).toContain('Generated 2026-04-02T09:15:21Z');
  });
});

describe('forensics page: report-20260406-090000.md, no anomalies', () => {
  it('says "No anomalies were detected." in the place the anomalies would be', async () => {
    const presentation = await lendshed();
    const model = composed(composeForensics(inputOf(presentation, SECOND)));
    expect(model.anomalies).toEqual([]);
    expect(model.noAnomalies).toBe(true);
    // The writer's own "No anomalies detected." is not drawn beside the page's sentence.
    expect(model.anomaliesNote).toBeNull();
    const html = markup(model);
    expect(html).toContain('No anomalies were detected.');
    expect(html).not.toContain('No anomalies detected.');
    expect(html).not.toContain('Rule weight carries the confidence');
    expect(html.indexOf('>Anomalies<')).toBeLessThan(html.indexOf('No anomalies were detected.'));
    expect(model.actions).toEqual(['No action needed. Continue with `/gsd-execute-phase 3`.']);
    expect(model.grid!.summary).toBe('1 of 15 artifacts absent');
    expect(model.evidence[0]!.axis!.lastAt).toBeCloseTo(0.8, 5);
  });
});

describe('forensics page: planted copies of the fixture text', () => {
  it('shows a confidence word outside the three as written, in a dashed untoned chip, after LOW', () => {
    const text = fxRead('forensics/report-20260402-101500.md').replace('Confidence: LOW', 'Confidence: Uncertain');
    const model = composed(composeForensics(inputFromText(text)));
    expect(model.anomalies.map((card) => [card.kind, card.chip])).toEqual([
      ['high', 'High confidence'],
      ['medium', 'Medium confidence'],
      ['other', 'Uncertain'],
    ]);
    const html = markup(model);
    expect(html).toContain('<span class="status-chip view-forensics-chip" data-conf="other">Uncertain</span>');
    expect(html).toContain('data-conf="other"');
    expect(html.indexOf('Medium confidence')).toBeLessThan(html.indexOf('>Uncertain<'));
    expect(html).not.toContain('Low confidence');
  });

  it('keeps the file order among equal confidences and sorts an unordered file HIGH first', () => {
    const text = [
      '# Forensic Report',
      '## Anomalies Detected',
      '### First low — Confidence: LOW',
      '**Evidence:** a',
      '### Second low — Confidence: LOW',
      '**Evidence:** b',
      '### The high one — Confidence: HIGH',
      '**Evidence:** c',
      '## Root Cause Hypothesis',
      'A cause.',
      '## Recommended Actions',
      '1. Do it.',
    ].join('\n');
    const model = composed(composeForensics(inputFromText(text)));
    expect(model.anomalies.map((card) => card.type)).toEqual(['The high one', 'First low', 'Second low']);
    expect(model.anomalies.map((card) => card.number)).toEqual([1, 2, 3]);
  });

  it('keeps the writer sentence when an empty Anomalies section says more than "none"', () => {
    const text = [
      '# Forensic Report',
      '## Anomalies Detected',
      'The run could not read the git history.',
      '## Root Cause Hypothesis',
      'Unknown.',
    ].join('\n');
    const model = composed(composeForensics(inputFromText(text)));
    expect(model.noAnomalies).toBe(true);
    expect(model.anomaliesNote).toBe('The run could not read the git history.');
    expect(markup(model)).toContain('No anomalies were detected.');
    expect(markup(model)).toContain('The run could not read the git history.');
  });

  it('draws no anomalies block, and makes no "none" claim, for a report that has no Anomalies section', () => {
    const text = ['# Forensic Report', '## Root Cause Hypothesis', 'Only this.', '## Recommended Actions', '1. Only that.'].join('\n');
    const model = composed(composeForensics(inputFromText(text)));
    expect(model.noAnomalies).toBe(false);
    expect(model.anomalies).toEqual([]);
    expect(model.grid).toBeNull();
    expect(model.evidence).toEqual([]);
    const html = markup(model);
    expect(html).not.toContain('Anomalies');
    expect(html).not.toContain('No anomalies were detected.');
    expect(html).not.toContain('Artifact completeness');
    expect(html).toContain('Only this.');
  });

  it('draws no axis when the span, the last commit and the report all fall on one day (the real writer shape)', () => {
    const text = fxRead('forensics/report-20260402-101500.md')
      .replace('2026-03-28 → 2026-04-01', '2026-04-02 13:13:38 +0530 → 2026-04-02 23:44:24 +0530')
      .replace('**Last commit:** 2026-04-01', '**Last commit:** 2026-04-02 23:44:24 +0530');
    const model = composed(composeForensics(inputFromText(text)));
    expect(model.evidence[0]!.axis).toBeNull();
    expect(model.evidence[0]!.rows[0]!.value.startsWith('2026-04-02 23:44:24 +0530')).toBe(true);
    expect(markup(model)).not.toContain('view-forensics-axis');
  });

  it('drops the last-commit label that would collide with the report day label', () => {
    const text = fxRead('forensics/report-20260402-101500.md').replace('**Generated:** 2026-04-02T09:15:21Z', '**Generated:** 2026-04-01T09:15:21Z');
    const model = composed(composeForensics(inputFromText(text)));
    const axis = model.evidence[0]!.axis!;
    expect(axis.lastAt).toBe(1);
    expect(axis.showLastLabel).toBe(false);
  });

  it('reads a cell it cannot classify as a quiet square with the cell as written, and a mark-only cell as present with no note', () => {
    const model = composed(composeForensics(inputFromText(fxRead('forensics/report-20260402-101500.md'))));
    expect(model.grid!.rows[1]!.cells[0]).toMatchObject({ state: 'present', note: '' });
    const planted = composed(
      composeForensics({
        kind: 'forensics',
        frontmatter: {},
        structured: {
          forensics: {
            hypothesis: 'h',
            grid: [
              { phase: '01 One', artifact: 'PLAN', present: true, cell: '✅' },
              { phase: '01 One', artifact: 'CONTEXT', present: null, cell: 'n/a' },
              { phase: '01 One', artifact: 'RESEARCH', present: null, cell: '' },
            ],
          },
        },
        groups: [],
        planSegments: [],
      }),
    );
    expect(planted.grid!.rows.map((row) => row.cells[0]!.state)).toEqual(['present', 'unstated', 'unstated']);
    const out = markup(planted);
    expect(out).toContain('data-tone="quiet"');
    expect(out).toContain('>n/a<');
    expect(out).toContain('>Not stated<');
    expect(planted.grid!.absent).toBe(0);
  });

  it('falls through, per file, for a forensics file with none of the known headings', () => {
    const text = ['# Notes', '', 'Some words that are not a forensic report.', '', '## Something else', 'More words.'].join('\n');
    expect(extractForensics(text)).toBeNull();
    expect(composeForensics(inputFromText(text))).toBeNull();
    expect(composeForensics({ kind: 'forensics', frontmatter: {}, structured: {}, groups: [], planSegments: [] })).toBeNull();
    expect(composeForensics({ kind: 'forensics', frontmatter: {}, structured: { forensics: {} }, groups: [], planSegments: [] })).toBeNull();
    expect(composeForensics({ kind: 'forensics', frontmatter: {}, structured: { forensics: 'x' }, groups: [], planSegments: [] })).toBeNull();
  });

  it('splits a multi-paragraph hypothesis on blank lines and keeps the words', () => {
    expect(paragraphsOf(null)).toEqual([]);
    expect(paragraphsOf('one\ntwo\n\nthree')).toEqual(['one two', 'three']);
    expect(paragraphsOf('lead\n- a\n- b')).toEqual(['lead', '- a', '- b']);
  });

  it('renders markup, a tag and a value-like string in the text as text, never as elements', () => {
    const text = [
      '# Forensic Report',
      '## Root Cause Hypothesis',
      'The <script>alert(1)</script> tag and `KEY=abc` stay text.',
      '## Recommended Actions',
      '1. Open <img src=x onerror=alert(1)>.',
    ].join('\n');
    const html = markup(composed(composeForensics(inputFromText(text))));
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });
});

// ---------------------------------------------------------------------------
// The view contract: source-text checks in the report-page idiom (no AST tooling). Comments are stripped before every
// negative check.
// ---------------------------------------------------------------------------

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-11-forensics:start */';
const END = '/* phase-11-forensics:end */';
const COMPOSER = 'src/web/views/forensics-page.ts';
const COMPONENTS = 'src/web/views/forensics-page-components.tsx';
const ALLOWED_SIZES = ['var(--fs-2)', 'var(--fs-4)', 'var(--fs-7)', 'var(--fs-display-3)', 'inherit'];

function stripSourceComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** The forensics page may use `missing` (an absent artifact) but never the parse-degradation tones. */
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

function buildsRegExp(text: string): boolean {
  return /new\s+RegExp\s*\(/.test(text) || /\bRegExp\s*\(/.test(text);
}

function usesRegexLiteral(text: string): boolean {
  return /\.(test|exec|match|matchAll|replace|replaceAll|split|search)\(\s*\//.test(text);
}

function importsFilesystem(text: string): boolean {
  return /from 'node:(fs|path)|from 'fs'/.test(text);
}

function hasModuleLevelLet(text: string): boolean {
  return /^(export\s+)?let\s/m.test(text);
}

function cssViolations(block: string): string[] {
  const found: string[] = [];
  if (/--destructive|--warning|--missing/.test(block)) found.push('parse-degradation or missing token');
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

describe('forensics view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(writesForbiddenTone('<i data-tone="missing" />')).toBe(false);
    expect(writesNetworkOrStorage("await fetch('/x')")).toBe(true);
    expect(buildsRegExp('const re = new RegExp(text);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;')).toBe(true);
    expect(cssViolations('a { color: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });
});

describe('forensics view contract - the real sources', () => {
  it('the components render no raw HTML, make no request, touch no storage and write no destructive or warning tone', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code.includes(RAW_HTML_PROP)).toBe(false);
    expect(writesNetworkOrStorage(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).toContain('aria-hidden="true"');
    expect(code).not.toMatch(/href=/);
    expect(code).not.toContain("'destructive'");
    expect(code).not.toContain("'warning'");
  });

  it('author text goes through ResearchInline as React text', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("from '../pages/research-atoms.tsx'");
    expect(code).toContain('<ResearchInline text={');
  });

  it('writes the contract words in the composer', async () => {
    const composer = stripSourceComments(await source(COMPOSER));
    for (const words of [
      "'Root cause hypothesis'",
      "'Recommended actions'",
      "'Anomalies'",
      "'No anomalies were detected.'",
      "'Artifact completeness'",
      "'Absent'",
      "'High confidence'",
      "'Medium confidence'",
      "'Low confidence'",
    ]) {
      expect(composer, words).toContain(words);
    }
  });

  it('the composer builds no regular expression, uses no regex literal, imports no filesystem module and reads no clock', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(buildsRegExp(code)).toBe(false);
    expect(usesRegexLiteral(code)).toBe(false);
    expect(importsFilesystem(code)).toBe(false);
    expect(hasModuleLevelLet(code)).toBe(false);
    expect(code).not.toMatch(/^(export\s+)?var\s/m);
    expect(code).not.toMatch(/Date\.now\(|new Date\(/);
  });

  it('the composer never writes a destructive, warning or error tone and never re-words the hypothesis or the actions', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).not.toContain("'destructive'");
    expect(code).not.toContain("'warning'");
    // The hypothesis and the actions reach the model only through paragraphsOf (line breaks) and stringList (as written).
    expect(code).toContain('hypothesis = paragraphsOf(textOrNull(forensics.hypothesis))');
    expect(code).toContain('actions = stringList(forensics.actions)');
    expect(code).not.toMatch(/actions\s*\.\s*(sort|reverse|splice)\(/);
  });

  it('artifact-page.tsx draws the page from the composed model in View mode and the manifest keeps its fallback', async () => {
    const code = stripSourceComments(await source('src/web/pages/artifact-page.tsx'));
    expect(code).toContain('<ForensicsView key={artifact.path} model={forensicsCover} />');
    expect(code).toContain('manifest.forensicsPage?.(viewInput)');
    expect(code).not.toMatch(/artifact\.kind === ['"]forensics['"]/);
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests.match(/forensicsPage: composeForensics/g)).toHaveLength(1);
    expect(manifests).toContain("promote: [{ type: 'section', heading: /\\S/, all: true }],\n    forensicsPage: composeForensics");
  });

  it('the CSS holds one contiguous phase-11-forensics block with no colour recipe and only the four contracted font sizes', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(count(css, START)).toBe(1);
    expect(count(css, END)).toBe(1);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    expect(end).toBeGreaterThan(start);
    const block = css.slice(start, end);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-forensics-/);
    const sizes = fontSizes(stripCssComments(block));
    expect(sizes.length).toBeGreaterThan(10);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
    for (const selector of ['.view-forensics-root', '.view-forensics-hyp', '.view-forensics-card', '.view-forensics-heat', '.view-forensics-rail', '.view-forensics-axis']) {
      expect(block, selector).toContain(selector);
    }
  });

  it("writes only its own view-forensics- classes beside the shared status chip and square, and reuses no other view's", async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    const tokens = [...code.matchAll(/className="([^"]*)"/g)].flatMap((match) => match[1]!.split(/\s+/));
    expect(tokens.length).toBeGreaterThan(30);
    for (const token of tokens) {
      expect(token.startsWith('view-forensics-') || token === 'status-chip' || token === 'status-square', token).toBe(true);
    }
    expect(code).not.toMatch(/className=["'{][^>]*\b(research-|view-codebase-|view-pause-|view-seed-|view-thread-|view-report-)/);
    const css = await source('src/web/styles/globals.css');
    const block = stripCssComments(css.slice(css.indexOf(START), css.indexOf(END)));
    expect(block).not.toMatch(/\.view-(codebase|pause|spikes|indexes|seed|thread|report)-|\.research-/);
  });

  it('records the tone uses and the language bullet in design-language.md', async () => {
    const doc = await source('docs/design-language.md');
    expect(doc).toContain('**The forensics page.**');
    for (const tone of ['complete', 'quiet', 'missing']) {
      const row = doc.split('\n').find((line) => line.startsWith(`| \`${tone}\``))!;
      expect(row, tone).toContain('(Phase 11, 11-25) on the forensics page');
    }
    for (const tone of ['destructive', 'warning', 'in-flight', 'active']) {
      const row = doc.split('\n').find((line) => line.startsWith(`| \`${tone}\``))!;
      expect(row, tone).not.toContain('(Phase 11, 11-25)');
    }
  });
});
