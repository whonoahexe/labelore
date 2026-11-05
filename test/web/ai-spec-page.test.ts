// Phase 10 (10-18, VIEW-11): the AI spec composer and the static markup of its page, on the made-up Lendshed AI specs
// (04 half filled, 02 GSD's real template body). The first screen says what the system is (type, framework and
// version, stakes, lock-in), how it will be judged (the dimensions placed by priority and measurement) and how far the
// checklist has got.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { composeAiSpec } from '../../src/web/views/ai-spec-page.ts';
import type { ComposedAiSpec } from '../../src/web/views/ai-spec-page.ts';
import {
  AiSpecView,
  aiSpecHeaderProps,
  splitAiSpecTitle,
} from '../../src/web/views/ai-spec-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { AiSpecHandler } from '../../src/planning-repo/handlers/ai-spec.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';

const HALF = fxRead('phases/04-bulk-loan-export/04-AI-SPEC.md');
const TEMPLATE = fxRead('phases/02-roles-and-permissions/02-AI-SPEC.md');

function ref(path: string): ArtifactRef {
  return {
    path,
    kind: 'ai-spec',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

/** The page's section groups, the way the renderer makes them: one per `##` heading, the heading and what follows. */
function groupsOf(content: string): NonNullable<ViewInput['groups']> {
  const groups: NonNullable<ViewInput['groups']> = [];
  let current: { heading: string; lines: string[] } | null = null;
  for (const line of content.split('\n')) {
    if (line.startsWith('## ')) {
      if (current) groups.push(toGroup(current, groups.length));
      current = { heading: line.slice(3).trim(), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) groups.push(toGroup(current, groups.length));
  return groups;
}

function toGroup(g: { heading: string; lines: string[] }, index: number) {
  return { id: `g-${index}`, heading: g.heading, html: `<h2>${g.heading}</h2><p>${g.lines.slice(1).join(' ').trim()}</p>` };
}

function inputOf(aiSpec: unknown, groups: ViewInput['groups'] = []): ViewInput {
  return {
    kind: 'ai-spec',
    frontmatter: {},
    structured: aiSpec === undefined ? {} : { aiSpec },
    groups,
    planSegments: [],
  };
}

/** The handler's reading of a file, composed the way the page does. */
function composeFile(content: string, path = '.planning/phases/04-x/04-AI-SPEC.md'): ComposedAiSpec | null {
  const raw: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = AiSpecHandler.parse(raw, ref(path));
  return composeAiSpec(inputOf(parsed.structured?.aiSpec, groupsOf(content)));
}

const renderHtml = (html: string) => createElement('section', { 'data-plain': 'true' }, `HTML:${html}`);

function markup(model: ComposedAiSpec): string {
  return renderToStaticMarkup(
    createElement(AiSpecView, { model, renderHtml, onShowSource: () => undefined }),
  );
}

describe('composeAiSpec - 04-AI-SPEC, half filled', () => {
  const model = composeFile(HALF)!;

  it('composes the four datasheet cells', () => {
    expect(model.cells.map((c) => [c.label, c.value])).toEqual([
      ['System type', 'Content Generation'],
      ['Framework', 'Notewright'],
      ['Stakes level', 'Medium'],
      ['Vendor lock-in', 'Partial'],
    ]);
    expect(model.cells[1].note).toBe('2.3.1');
    expect(model.cells[1].noteKind).toBe('version');
    expect(model.cells[3].note).toMatch(/^the model host is configurable/);
    expect(model.cells[3].noteKind).toBe('reason');
  });

  it('says "6 of 16 checklist items done" as the meter sentence', () => {
    expect(model.progress).toMatchObject({ label: '6 of 16 checklist items done', done: 6, total: 16 });
  });

  it("carries each checklist item's own state so the meter squares sit where the ticks are", () => {
    expect(model.progress!.items![4]).toBe(false);
    expect(model.progress!.items![5]).toBe(true);
    const out = markup(model);
    const cells = out.match(/status-meter-sq" data-tone="[a-z-]+"/g)!;
    expect(cells.map((c) => (c.includes('complete') ? 'x' : '.')).join('')).toBe('xxxx.xx.........');
  });

  it('places the four dimensions in the measurement by priority grid', () => {
    expect(model.dimensions.map((d) => d.name)).toEqual([
      'Totals match',
      'No member names',
      'Neutral tone',
      'Usable as sent',
    ]);
    const at = (priority: string, measurement: string) =>
      model.matrix!.cells.find((c) => c.priority === priority && c.measurement === measurement)!.dimensions;
    expect(at('Critical', 'Code')).toEqual([0, 1]);
    expect(at('Medium', 'LLM Judge')).toEqual([2]);
    expect(at('High', 'Human')).toEqual([3]);
    expect(model.matrix!.unplaced).toEqual([]);
  });

  it('has one strip square per numbered section and one row per section group in file order', () => {
    expect(model.strip.map((s) => s.number)).toEqual(['1', '1b', '2', '3', '4', '4b', '5', '6', '7']);
    expect(model.rows.map((r) => r.heading)).toEqual([
      '1. System Classification',
      '1b. Domain Context',
      '2. Framework Decision',
      '3. Framework Quick Reference',
      '4. Implementation Guidance',
      '4b. AI Systems Best Practices',
      '5. Evaluation Strategy',
      '6. Guardrails',
      '7. Production Monitoring',
      'Checklist',
    ]);
  });
});

describe('composeAiSpec - nothing to shape', () => {
  it('returns null with no projection, and for a record with nothing in it', () => {
    expect(composeAiSpec(inputOf(undefined))).toBeNull();
    expect(composeAiSpec(inputOf('text'))).toBeNull();
    expect(composeAiSpec(inputOf({}))).toBeNull();
  });

  it('falls through silently for an AI spec using none of the template headings', () => {
    expect(composeFile('# Notes\n\nSome words.\n\n## Ideas\n\n- one\n')).toBeNull();
  });
});

describe('composeAiSpec - dimensions the grid has no place for', () => {
  it('lists them after the grid, never drops them', () => {
    const model = composeAiSpec(
      inputOf({
        dimensions: [
          { name: 'Latency', rubric: 'under 2s', measurement: 'Synthetic probe', priority: 'Low' },
          { name: 'Facts', rubric: 'right', measurement: 'Code + LLM Judge', priority: 'High - always' },
        ],
        checklist: { done: 0, total: 0 },
        sections: [],
      }),
    )!;
    expect(model.matrix!.unplaced).toEqual([0]);
    const cell = model.matrix!.cells.find((c) => c.priority === 'High' && c.measurement === 'Code')!;
    expect(cell.dimensions).toEqual([1]);
  });
});

describe('AiSpecView - the first screen', () => {
  const model = composeFile(HALF)!;
  const out = markup(model);

  it('writes the four cell labels and values, and the version in mono', () => {
    for (const label of ['System type', 'Framework', 'Stakes level', 'Vendor lock-in']) {
      expect(out).toContain(label);
    }
    expect(out).toContain('Content Generation');
    expect(out).toContain('Notewright');
    expect(out).toContain('Version <code>2.3.1</code>');
  });

  it('draws the checklist meter once with its one sentence', () => {
    expect(out).toContain('aria-label="6 of 16 checklist items done"');
    expect(out.split('status-meter-sq').length - 1).toBe(16);
    expect(out).toContain('data-size="large"');
  });

  it('draws the dimension chips in the grid with the grid headings', () => {
    for (const word of ['Priority', 'Code', 'LLM Judge', 'Human', 'Critical', 'High', 'Medium']) {
      expect(out).toContain(word);
    }
    expect(out).toContain('Totals match');
    expect(out).toContain('4 · placed by measurement and priority');
  });
});

describe('aiSpecHeaderProps', () => {
  it('moves the phase to the eyebrow and drops the document kind from the h1', () => {
    const props = aiSpecHeaderProps(composeFile(HALF)!, 'AI-SPEC — Phase 4: Bulk Loan Export');
    expect(props.eyebrow).toBe('Phase 4 · AI spec');
    expect(props.title).toBe('Bulk Loan Export');
    expect(props.lead).toBeNull();
  });

  it('keeps a title that does not read that way whole under the plain eyebrow', () => {
    expect(splitAiSpecTitle('AI-SPEC — Phase {N}: {phase_name}')).toEqual({
      phase: null,
      title: 'AI-SPEC — Phase {N}: {phase_name}',
    });
    expect(splitAiSpecTitle('Some other title')).toEqual({ phase: null, title: 'Some other title' });
    expect(aiSpecHeaderProps(composeFile(HALF)!, 'Some other title').eyebrow).toBe('AI spec');
  });

  it('reads a dotted phase number and a plain hyphen after AI-SPEC', () => {
    expect(splitAiSpecTitle('AI-SPEC - Phase 10.1: Late Work')).toEqual({ phase: 'Phase 10.1', title: 'Late Work' });
  });
});

describe('composeAiSpec - 02-AI-SPEC, the template body', () => {
  const model = composeFile(TEMPLATE)!;

  it('reads every cell as unfilled and no dimension', () => {
    expect(model.cells.every((c) => c.value === null)).toBe(true);
    expect(model.dimensions).toEqual([]);
    expect(model.matrix).toBeNull();
    expect(model.progress).toMatchObject({ label: '0 of 16 checklist items done', done: 0, total: 16 });
  });
});

// ---------------------------------------------------------------------------
// The unfilled-slot page (10-18, Task 2)
// ---------------------------------------------------------------------------

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('composeAiSpec - the slot lead and rows', () => {
  it('02-AI-SPEC: "9 of 9 sections are still template slots", every section a slot row, the Checklist a bar', () => {
    const model = composeFile(TEMPLATE)!;
    expect(model.slotCount).toBe(9);
    expect(model.sectionCount).toBe(9);
    expect(model.slotLead).toBe('9 of 9 sections are still template slots');
    expect(model.strip.every((s) => s.slot)).toBe(true);
    expect(model.rows.filter((r) => r.kind === 'slot')).toHaveLength(9);
    expect(model.rows.filter((r) => r.kind === 'bar').map((r) => r.heading)).toEqual(['Checklist']);
  });

  it('04-AI-SPEC: "3 of 9 sections are still template slots", sections 4b, 6 and 7 as slot rows', () => {
    const model = composeFile(HALF)!;
    expect(model.slotLead).toBe('3 of 9 sections are still template slots');
    expect(model.strip.filter((s) => s.slot).map((s) => s.number)).toEqual(['4b', '6', '7']);
    expect(
      model.rows.filter((r) => r.kind === 'slot').map((r) => r.heading),
    ).toEqual(['4b. AI Systems Best Practices', '6. Guardrails', '7. Production Monitoring']);
  });

  it('a slot row carries no html: the text under a slot never reaches the page', () => {
    const model = composeFile(HALF)!;
    for (const row of model.rows) {
      if (row.kind === 'slot') expect('html' in row).toBe(false);
    }
  });

  it('a fully filled AI spec omits the lead', () => {
    const model = composeAiSpec(
      inputOf(
        {
          systemType: 'RAG',
          framework: 'X',
          version: '1',
          stakes: 'Low',
          vendorLockIn: 'No',
          dimensions: [],
          checklist: { done: 16, total: 16 },
          sections: [
            { number: '1', heading: '1. A', slot: false, written: 3 },
            { number: '2', heading: '2. B', slot: false, written: 2 },
          ],
        },
        groupsOf(HALF),
      ),
    )!;
    expect(model.slotLead).toBeNull();
    expect(markup(model)).not.toContain('are still template slots');
  });

  it('counts one slot as "1 of {m}"', () => {
    const model = composeAiSpec(
      inputOf({
        checklist: { done: 0, total: 0 },
        sections: [
          { number: '1', heading: '1. A', slot: true, written: 0 },
          { number: '2', heading: '2. B', slot: false, written: 4 },
        ],
      }),
    )!;
    expect(model.slotLead).toBe('1 of 2 sections are still template slots');
  });
});

describe('AiSpecView - template slots', () => {
  it('02-AI-SPEC: the lead, every numbered section with the Template slot chip, no template hint text', () => {
    const model = composeFile(TEMPLATE)!;
    const out = markup(model);
    expect(out).toContain('<b>9 of 9</b> sections are still template slots');
    // four cells, the grid's one box, and nine rows: the quiet chip beside every unfilled thing
    expect(count(out, 'Template slot</span>')).toBeGreaterThanOrEqual(9);
    for (const row of model.rows.filter((r) => r.kind === 'slot')) {
      expect(out).toContain(row.heading);
    }
    // no hint comment of the template is drawn as if it said something
    const hints = [...TEMPLATE.matchAll(/<!--\s*([^>]*?)\s*-->/g)]
      .map((m) => m[1])
      .filter((t) => t.length > 8);
    expect(hints.length).toBeGreaterThan(10);
    for (const hint of hints) expect(out.includes(hint), hint).toBe(false);
    // none of the template's prompts, blockquote lines or option rows either
    expect(out).not.toContain('Researched by');
    expect(out).not.toContain('Block / Escalate / Flag');
    expect(out).not.toContain('Fetched from official docs');
  });

  it('every slot row is a dashed row with its heading, the chip and a Source button, and does not open', () => {
    const model = composeFile(HALF)!;
    const out = markup(model);
    expect(count(out, 'view-ai-spec-slot"')).toBe(3);
    expect(count(out, '<details')).toBe(7);
    expect(count(out, '>Source</button>')).toBe(3);
  });

  it('04-AI-SPEC: the lead reads 3 of 9 and the strip draws three dashed squares', () => {
    const out = markup(composeFile(HALF)!);
    expect(out).toContain('<b>3 of 9</b> sections are still template slots');
    expect(count(out, 'aria-label="4b. AI Systems Best Practices, Template slot"')).toBe(1);
  });

  it('02-AI-SPEC: the datasheet cells and the grid say Template slot', () => {
    const out = markup(composeFile(TEMPLATE)!);
    expect(count(out, 'data-slot="true"')).toBeGreaterThanOrEqual(13);
    expect(out).toContain('view-ai-spec-matrix-slot');
  });

  it('a Source button calls onShowSource with the section heading id', () => {
    const model = composeFile(HALF)!;
    const slot = model.rows.find((r) => r.kind === 'slot')!;
    expect(slot.kind === 'slot' && slot.sourceId).toBe('g-5');
  });
});

// ---------------------------------------------------------------------------
// The view contract: source-text checks in the spec-view-contract idiom (no AST tooling). Comments are stripped
// before every negative check.
// ---------------------------------------------------------------------------

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-10-ai-spec:start */';
const END = '/* phase-10-ai-spec:end */';
const COMPOSER = 'src/web/views/ai-spec-page.ts';
const COMPONENTS = 'src/web/views/ai-spec-page-components.tsx';
const EXTRACTOR = 'src/planning-repo/handlers/ai-spec.ts';
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

function toneExpressions(text: string): string[] {
  return [...text.matchAll(/data-tone=(\{[^}]*\}|"[^"]*")/g)].map((m) => m[1]);
}

/** A tone this page must never write: the parse-degradation tones, `missing` and `in-flight` (a slot is quiet). */
function writesForbiddenTone(text: string): boolean {
  return (
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning|missing|in-flight)['"]/.test(text) ||
    /data-tone="(destructive|warning|missing|in-flight)"/.test(text) ||
    /'(destructive|warning|missing|in-flight)'\s*\|/.test(text) ||
    /\|\s*'(destructive|warning|missing|in-flight)'/.test(text)
  );
}

function writesLink(text: string): boolean {
  return /\bhref\s*[=:]/.test(text) || /\bto=/.test(text) || /<(a|Link|NavLink)[\s>]/.test(text);
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
  return [...block.matchAll(/font-size\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
}

function aiSpecBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('ai spec view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'missing';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="destructive" />')).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(writesForbiddenTone('<i data-tone="in-flight" />')).toBe(true);
    expect(writesLink('<a href={ref}>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;\nexport const x = 1;')).toBe(true);
    expect(cssViolations('a { color: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });

  it('passes clean strings', () => {
    expect(writesForbiddenTone("type AiSpecTone = 'complete' | 'quiet';")).toBe(false);
    expect(writesLink('<button onClick={() => open()}>x</button>')).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('ai spec view contract - the real sources', () => {
  it('the components render no raw HTML and no link, and write no destructive, warning, missing or in-flight tone', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code.includes(RAW_HTML_PROP)).toBe(false);
    expect(writesLink(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    for (const expression of new Set(toneExpressions(code))) {
      expect(['"quiet"', '"complete"'].includes(expression) || expression.startsWith('{'), expression).toBe(true);
    }
    expect(code).toContain('aria-hidden="true"');
  });

  it('author text goes through ResearchInline, never straight into markup', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain('<ResearchInline text={cell.value} />');
    expect(code).toContain('<ResearchInline text={row.heading} />');
    expect(code).toContain('<ResearchInline text={dimension.name} />');
    expect(code).toContain('<ResearchInline text={cell.note} />');
  });

  it('the composer says "Template slot" and writes only the quiet and complete tones', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(code).toContain("export const TEMPLATE_SLOT_LABEL = 'Template slot';");
    expect(code).toContain("export type AiSpecTone = 'complete' | 'quiet';");
    expect(writesForbiddenTone(code)).toBe(false);
  });

  it('the composer and the extractor build no regular expression, use no regex literal and import no filesystem module', async () => {
    for (const path of [COMPOSER, EXTRACTOR]) {
      const code = stripSourceComments(await source(path));
      expect(buildsRegExp(code), path).toBe(false);
      expect(usesRegexLiteral(code), path).toBe(false);
      expect(importsFilesystem(code), path).toBe(false);
    }
  });

  it('the composer holds no module-level mutable state', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(hasModuleLevelLet(code)).toBe(false);
    expect(code).not.toMatch(/^(export\s+)?var\s/m);
  });

  it('the CSS block exists once, holds every .view-ai-spec- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = aiSpecBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-ai-spec-/);
    for (const selector of [
      '.view-ai-spec-page',
      '.view-ai-spec-sheet',
      '.view-ai-spec-strip',
      '.view-ai-spec-matrix',
      '.view-ai-spec-slot',
      '.view-ai-spec-bar',
    ]) {
      expect(block, selector).toContain(selector);
    }
  });

  it('the CSS block renders only the four contracted font sizes', async () => {
    const block = stripCssComments(aiSpecBlock(await source('src/web/styles/globals.css')));
    const sizes = fontSizes(block);
    expect(sizes.length).toBeGreaterThan(10);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
    expect(block).toContain('.document-outline a');
  });

  it('draws no meter of its own: the checklist goes through StatusMeter', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("from '../components/status-meter.tsx'");
    expect(code).toContain('<StatusMeter');
    expect(await source('src/web/styles/globals.css')).not.toMatch(/view-ai-spec-meter/);
  });
});
