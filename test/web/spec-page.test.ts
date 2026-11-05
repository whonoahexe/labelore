// Phase 10 (10-16, VIEW-11): the Spec composer and the static markup of its page, on the made-up Lendshed specs.
// The first screen says whether the spec is locked enough to plan: a verdict chip and "{score} against a gate of
// {gate}", five column gauges, and each requirement as a row with Current, Target and Acceptance.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  LOCKED_LABEL,
  NOT_LOCKED_LABEL,
  NOT_STATED_LABEL,
  composeSpec,
} from '../../src/web/views/spec-page.ts';
import type { ComposedSpec } from '../../src/web/views/spec-page.ts';
import { SpecView, specHeaderProps } from '../../src/web/views/spec-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { SpecHandler } from '../../src/planning-repo/handlers/spec.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';

function inputOf(spec: unknown, groups: ViewInput['groups'] = []): ViewInput {
  return {
    kind: 'spec',
    frontmatter: {},
    structured: spec === undefined ? {} : { spec },
    groups,
    planSegments: [],
  };
}

function ref(path: string): ArtifactRef {
  return {
    path,
    kind: 'spec',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

/** The handler's reading of a file, composed the way the page does. */
function composeFile(content: string, groups: ViewInput['groups'] = []): ComposedSpec | null {
  const path = '.planning/phases/01-x/01-SPEC.md';
  const raw: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = SpecHandler.parse(raw, ref(path));
  return composeSpec(inputOf(parsed.structured?.spec, groups));
}

/** A stand-in for the page's renderHtml: the section html shows as escaped text, so a test can find it. */
const renderHtml = (html: string) => createElement('section', { 'data-plain': 'true' }, `HTML:${html}`);

function markup(model: ComposedSpec): string {
  return renderToStaticMarkup(createElement(SpecView, { model, renderHtml, onShowSource: () => undefined }));
}

const LOCKED = fxRead('phases/01-member-sign-in-sessions/01-SPEC.md');

describe('composeSpec - 01-SPEC, locked', () => {
  const model = composeFile(LOCKED)!;

  it('says "Locked enough to plan" with "0.14 against a gate of 0.20"', () => {
    expect(model.verdict.label).toBe(LOCKED_LABEL);
    expect(model.verdict.label).toBe('Locked enough to plan');
    expect(model.verdict.tone).toBe('complete');
    expect(model.verdict.numbers).toBe('0.14 against a gate of 0.20');
    expect(model.verdict.note).toBeNull();
  });

  it('draws the ambiguity column against the gate and four dimension columns against their minimums', () => {
    expect(model.ambiguity.lowerIsBetter).toBe(true);
    expect(model.ambiguity.fill).toBe(28);
    expect(model.ambiguity.mark).toBe(40);
    expect(model.dimensions.map((d) => d.label)).toEqual(['Goal', 'Boundary', 'Constraint', 'Acceptance Criteria']);
    expect(model.dimensions.map((d) => d.statusLabel)).toEqual(['Met minimum', 'Met minimum', 'Met minimum', 'Met minimum']);
    expect(model.dimensions[2].mark).toBe(65);
    expect(model.dimensions[2].fill).toBe(78);
  });

  it('reads the count line from the file and the created date', () => {
    expect(model.countLine).toBe('5 requirements locked');
    expect(model.created).toBe('2026-03-22');
  });

  it('lays out five requirements with all three fields and no "No acceptance stated"', () => {
    expect(model.requirements).toHaveLength(5);
    expect(model.requirements.every((r) => !r.noAcceptance)).toBe(true);
    expect(model.requirements[0].fields.map((f) => f.label)).toEqual(['Current', 'Target', 'Acceptance']);
    expect(model.hasCoverage).toBe(true);
    expect(model.requirements[0].edges.map((m) => m.word)).toEqual(['Covered']);
    expect(model.requirements[0].prohibitions.map((m) => m.word)).toEqual(['Resolved', 'Resolved', 'Dismissed']);
  });
});

describe('composeSpec - nothing to shape', () => {
  it('returns null without a projection, and for a projection with no score, requirement, dimension, goal or scope', () => {
    expect(composeSpec(inputOf(undefined))).toBeNull();
    expect(composeSpec(inputOf('not a record'))).toBeNull();
    expect(composeSpec(inputOf({}))).toBeNull();
    expect(composeFile('# Just a title\n\nSome words.\n')).toBeNull();
  });
});

describe('SpecView - the first screen', () => {
  const html = markup(composeFile(LOCKED)!);

  it('opens with the verdict chip and the numbers line', () => {
    expect(html).toContain('Locked enough to plan');
    expect(html).toContain('<b>0.14</b> against a gate of <b>0.20</b>');
    expect(html.indexOf('Locked enough to plan')).toBeLessThan(html.indexOf('Requirements'));
  });

  it('lists every requirement as a numbered row in author order, with a closed panel', () => {
    for (const label of ['Account sign-in', 'Session survives a restart', 'Sign-out', 'Forced first password change', 'Sign-in rate limiting']) {
      expect(html).toContain(label);
    }
    expect(html.indexOf('Account sign-in')).toBeLessThan(html.indexOf('Sign-in rate limiting'));
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('view-spec-open');
  });

  it('shows the dimensions with the status as an aria-labelled square', () => {
    expect(html).toContain('aria-label="Met minimum"');
    expect(html).toContain('min 0.65');
  });

  it('writes the goal under the strip', () => {
    expect(html).toContain('A member signs in to Lendshed with a username and password Lendshed itself holds');
  });

  it('renders no destructive, warning or missing tone', () => {
    expect(html).not.toMatch(/data-tone="(destructive|warning|missing)"/);
  });
});

describe('specHeaderProps', () => {
  it('sets "Phase N · Spec", the phase name as the h1 and the created date and count as meta', () => {
    const model = composeFile(LOCKED)!;
    const header = specHeaderProps(model, 'Phase 1: Member Sign-In & Sessions — Specification');
    expect(header.eyebrow).toBe('Phase 1 · Spec');
    expect(header.title).toBe('Member Sign-In & Sessions');
    expect(header.lead).toBeNull();
    const meta = renderToStaticMarkup(createElement('div', null, header.meta));
    expect(meta).toContain('Created 2026-03-22');
    expect(meta).toContain('5 requirements locked');
  });

  it('keeps a title that does not open with Phase N whole', () => {
    const header = specHeaderProps(composeFile(LOCKED)!, 'A loose spec');
    expect(header.eyebrow).toBe('Spec');
    expect(header.title).toBe('A loose spec');
  });
});

describe('the verdict words', () => {
  it('are the documented ones', () => {
    expect(NOT_LOCKED_LABEL).toBe('Not locked yet');
    expect(NOT_STATED_LABEL).toBe('Ambiguity not stated');
  });
});

/** One section group per `## ` heading, the way the rendered document groups them. */
function groupsOf(md: string): ViewInput['groups'] {
  const groups: ViewInput['groups'] = [];
  let current: { heading: string; lines: string[] } | null = null;
  const close = (): void => {
    if (current === null) return;
    const id = current.heading.toLowerCase().split(' ').join('-');
    groups.push({ id, heading: current.heading, html: `<h2 id="${id}">${current.heading}</h2><p>${current.lines.join(' ')}</p>` });
  };
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      close();
      current = { heading: line.slice(3).trim(), lines: [] };
    } else if (current !== null && line.trim() !== '') {
      current.lines.push(line.trim());
    }
  }
  close();
  return groups;
}

const NOT_LOCKED = fxRead('phases/02-roles-and-permissions/02-SPEC.md');
const NINE = fxRead('phases/03-account-admin-and-sessions/03-SPEC.md');

describe('composeSpec - 02-SPEC, above the gate', () => {
  const model = composeFile(NOT_LOCKED, groupsOf(NOT_LOCKED))!;

  it('says "Not locked yet", in-flight, with "0.31 against a gate of 0.20"', () => {
    expect(model.verdict.label).toBe('Not locked yet');
    expect(model.verdict.tone).toBe('in-flight');
    expect(model.verdict.numbers).toBe('0.31 against a gate of 0.20');
    expect(model.ambiguity.fillTone).toBe('in-flight');
  });

  it('marks Constraint below its minimum, in-flight, and the rest met', () => {
    expect(model.dimensions.map((d) => d.statusLabel)).toEqual(['Met minimum', 'Met minimum', 'Below minimum', 'Met minimum']);
    expect(model.dimensions[2].statusTone).toBe('in-flight');
    expect(model.dimensions[2].title).toBe('Below minimum — planner must treat as assumption');
  });

  it('puts one mark on each requirement an edge or prohibition names, toned by status', () => {
    const [r1, r2, r3] = model.requirements;
    expect(model.hasCoverage).toBe(true);
    expect(r1.edges.map((m) => [m.word, m.tone])).toEqual([['Covered', 'complete'], ['Dismissed', 'quiet']]);
    expect(r2.prohibitions.map((m) => [m.word, m.tone])).toEqual([['Resolved', 'complete'], ['Unresolved', 'in-flight']]);
    expect(r3.edges.map((m) => [m.word, m.tone])).toEqual([['Unresolved', 'in-flight'], ['Backstop', 'complete']]);
  });

  it('draws the boundaries: three in scope, three out with their reasons', () => {
    expect(model.boundaries?.inScope).toHaveLength(3);
    expect(model.boundaries?.outOfScope[0]).toEqual({ item: 'Creating, disabling or deleting accounts', reason: 'that is Phase 3' });
  });

  it('keeps every other section as a bar in file order and the Interview Log in the source-only strip', () => {
    expect(model.bars.map((b) => b.heading)).toEqual([
      'Background',
      'Constraints',
      'Acceptance Criteria',
      'Edge Coverage',
      'Prohibitions (must-NOT)',
      'Ambiguity Report',
    ]);
    expect(model.sourceOnly).toEqual([{ label: 'Interview Log', targetId: 'interview-log' }]);
  });

  it('sends a section with no rendered group to the source-only strip rather than dropping it', () => {
    const bare = composeFile(NOT_LOCKED, [])!;
    expect(bare.bars).toEqual([]);
    expect(bare.sourceOnly.map((s) => s.label)).toContain('Background');
  });
});

describe('composeSpec - 03-SPEC, nine requirements and no gate', () => {
  const model = composeFile(NINE)!;

  it('says "Locked enough to plan" at 0.18, with a quiet note that the gate is GSD\'s 0.20', () => {
    expect(model.verdict.label).toBe('Locked enough to plan');
    expect(model.verdict.numbers).toBe('0.18 against a gate of 0.20');
    expect(model.verdict.note).toBe("Gate not stated in the file; GSD's 0.20");
  });

  it('counts "9 requirements locked" and lists all nine in order', () => {
    expect(model.countLine).toBe('9 requirements locked');
    expect(model.requirements.map((r) => r.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('flags only the sixth as having no acceptance', () => {
    expect(model.requirements.filter((r) => r.noAcceptance).map((r) => r.n)).toEqual([6]);
    expect(model.hasCoverage).toBe(false);
  });

  it('folds the long statements and fields behind Read more', () => {
    expect(model.requirements[5].statementLong).toBe(true);
    expect(model.requirements[2].fields[0].long).toBe(true);
    expect(model.requirements[0].statementLong).toBe(false);
  });
});

describe('composeSpec - the verdict at the gate and without a score', () => {
  const head = (line: string) => `# Phase 1: X — Specification\n\n${line}\n\n## Goal\n\nA goal.\n`;

  it.each([
    ['**Ambiguity score:** 0.14 (gate: ≤ 0.20)', 'Locked enough to plan'],
    ['**Ambiguity score:** 0.20 (gate: ≤ 0.20)', 'Locked enough to plan'],
    ['**Ambiguity score:** 0.21 (gate: ≤ 0.20)', 'Not locked yet'],
    ['**Ambiguity score:** 0.31', 'Not locked yet'],
  ])('%s is "%s"', (line, label) => {
    expect(composeFile(head(line))?.verdict.label).toBe(label);
  });

  it.each([['**Ambiguity score:** [score] (gate: ≤ 0.20)'], ['**Created:** 2026-01-01']])(
    '%s gives "Ambiguity not stated", quiet, with no numbers and no "Locked enough to plan"',
    (line) => {
      const model = composeFile(head(line))!;
      expect(model.verdict.label).toBe('Ambiguity not stated');
      expect(model.verdict.tone).toBe('quiet');
      expect(model.verdict.numbers).toBeNull();
      expect(model.ambiguity.empty).toBe(true);
    },
  );

  it('still renders the requirements without a score, with dashed Not scored columns', () => {
    const html = renderToStaticMarkup(
      createElement(SpecView, {
        model: composeFile(`${head('**Ambiguity score:** [score]')}\n## Requirements\n\n1. **A**: s\n   - Current: c\n`)!,
        renderHtml,
        onShowSource: () => undefined,
      }),
    );
    expect(html).toContain('Ambiguity not stated');
    expect(html).toContain('Not scored');
    expect(html).toContain('>A<');
    expect(html).not.toContain('Locked enough to plan');
  });

  it('shows no Requirements heading for a spec with none', () => {
    const html = renderToStaticMarkup(
      createElement(SpecView, { model: composeFile(head('**Ambiguity score:** 0.1'))!, renderHtml, onShowSource: () => undefined }),
    );
    expect(html).not.toContain('Requirements');
  });
});

describe('SpecView - the rest of the page', () => {
  const notLocked = composeFile(NOT_LOCKED, groupsOf(NOT_LOCKED))!;
  const html = markup(notLocked);
  const nine = markup(composeFile(NINE, groupsOf(NINE))!);

  it('is "Not locked yet" with an in-flight chip and no destructive, warning or missing tone', () => {
    expect(html).toContain('Not locked yet');
    expect(html).toContain('data-tone="in-flight"');
    expect(html).not.toMatch(/data-tone="(destructive|warning|missing)"/);
  });

  it('draws the fence: In scope inside, Out of scope outside with the reason kept', () => {
    expect(html).toContain('In scope');
    expect(html).toContain('Out of scope');
    expect(html).toContain('that is Phase 3');
    expect(html.indexOf('In scope')).toBeLessThan(html.indexOf('Out of scope'));
  });

  it('draws the Edges and Must-not columns and a mark for each named row', () => {
    expect(html).toContain('Edges');
    expect(html).toContain('Must-not');
    expect(html).toContain('aria-label="Unresolved: last steward demotes themself"');
  });

  it('opens the other sections as closed bars and links the Interview Log into Source', () => {
    expect(html).toContain('<details');
    expect(html).toContain('HTML:');
    expect(html).toContain('In the source only');
    expect(html).toContain('Interview Log');
    expect(html).not.toContain('<details open');
  });

  it('shows the quiet "No acceptance stated" chip on 03 requirement 6 only, and no coverage columns', () => {
    expect(nine.split('No acceptance stated').length - 1).toBe(1);
    expect(nine).not.toContain('Must-not');
  });

  it('shows a requirement with no Current or Target as the fields it has', () => {
    const model = composeFile('# S\n\n## Requirements\n\n1. **A**: s\n   - Acceptance: only this\n')!;
    expect(model.requirements[0].fields.map((f) => [f.label, f.value])).toEqual([
      ['Current', null],
      ['Target', null],
      ['Acceptance', 'only this'],
    ]);
  });
});

// ---------------------------------------------------------------------------
// The view contract: source-text checks in the coverage-view-contract idiom (no AST tooling). Comments are
// stripped before every negative check.
// ---------------------------------------------------------------------------

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-10-spec:start */';
const END = '/* phase-10-spec:end */';
const COMPOSER = 'src/web/views/spec-page.ts';
const COMPONENTS = 'src/web/views/spec-page-components.tsx';
const EXTRACTOR = 'src/planning-repo/handlers/spec-body.ts';
const ALLOWED_SIZES = ['var(--fs-2)', 'var(--fs-4)', 'var(--fs-7)', 'var(--fs-display-3)', 'inherit'];

function stripSourceComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function toneExpressions(text: string): string[] {
  return [...text.matchAll(/data-tone=(\{[^}]*\}|"[^"]*")/g)].map((m) => m[1]);
}

/** A tone this page must never write: the parse-degradation tones and `missing` (above the gate is in-flight). */
function writesForbiddenTone(text: string): boolean {
  return (
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning|missing)['"]/.test(text) ||
    /data-tone="(destructive|warning|missing)"/.test(text) ||
    /'(destructive|warning|missing)'\s*\|/.test(text) ||
    /\|\s*'(destructive|warning|missing)'/.test(text)
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

function specBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('spec view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'missing';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="destructive" />')).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(writesLink('<a href={ref}>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;\nexport const x = 1;')).toBe(true);
    expect(cssViolations('a { color: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });

  it('passes clean strings and allows in-flight', () => {
    expect(writesForbiddenTone("type SpecTone = 'complete' | 'in-flight' | 'quiet';")).toBe(false);
    expect(writesLink('<button onClick={() => open()}>x</button>')).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('spec view contract - the real sources', () => {
  it('the components render no raw HTML and no link, and write no destructive, warning or missing tone', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code.includes(RAW_HTML_PROP)).toBe(false);
    expect(writesLink(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    for (const expression of new Set(toneExpressions(code))) {
      expect(['"complete"', '"quiet"', '"in-flight"'].includes(expression) || expression.startsWith('{'), expression).toBe(true);
    }
    expect(code).toContain('aria-hidden="true"');
  });

  it('author text goes through ResearchInline, never straight into markup', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain('<ResearchInline text={requirement.label} />');
    expect(code).toContain('<ResearchInline text={model.goal} />');
    expect(code).toContain('<ResearchInline text={item.reason} />');
  });

  it('the composer writes only the documented tones and the documented words', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(code).toContain("export type SpecTone = 'complete' | 'in-flight' | 'quiet';");
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).toContain("export const LOCKED_LABEL = 'Locked enough to plan';");
    expect(code).toContain("export const NOT_LOCKED_LABEL = 'Not locked yet';");
    expect(code).toContain("export const NOT_STATED_LABEL = 'Ambiguity not stated';");
    expect(code).toContain("export const NO_ACCEPTANCE_LABEL = 'No acceptance stated';");
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

  it('the CSS block exists once, holds every .view-spec- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = specBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-spec-/);
    for (const selector of ['.view-spec-page', '.view-spec-strip', '.view-spec-col', '.view-spec-row', '.view-spec-fence', '.view-spec-bar']) {
      expect(block, selector).toContain(selector);
    }
  });

  it('the CSS block renders only the four contracted font sizes', async () => {
    const block = stripCssComments(specBlock(await source('src/web/styles/globals.css')));
    const sizes = fontSizes(block);
    expect(sizes.length).toBeGreaterThan(10);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
    expect(block).toContain('.document-outline a');
  });
});
