// Phase 10 (10-20, VIEW-12): the Eval review composer and the static markup of its page (sketch 050 winner B), on the
// made-up Lendshed eval reviews (04 needs work, 03 not implemented). The first screen says what the audit scored
// ("64 of 100"), GSD's verdict as a chip, and how the dimensions stand; the file's numbers and words are shown as
// written and never recomputed.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  EVAL_WORD_TABLE,
  composeEvalReview,
  dimensionWordOf,
  infrastructureToneOf,
  verdictToneOf,
} from '../../src/web/views/eval-review-page.ts';
import type { ComposedEvalReview } from '../../src/web/views/eval-review-page.ts';
import {
  EvalReviewView,
  evalReviewHeaderProps,
  splitEvalReviewTitle,
} from '../../src/web/views/eval-review-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { EvalReviewHandler } from '../../src/planning-repo/handlers/eval-review.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from '../helpers/growth.ts';

const NEEDS_WORK = fxRead('phases/04-bulk-loan-export/04-EVAL-REVIEW.md');
const NOT_IMPLEMENTED = fxRead('phases/03-account-admin-and-sessions/03-EVAL-REVIEW.md');
const PATH = '.planning/phases/04-x/04-EVAL-REVIEW.md';

function ref(path: string): ArtifactRef {
  return {
    path,
    kind: 'eval-review',
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
  const toGroup = (g: { heading: string; lines: string[] }, index: number) => ({
    id: `g-${index}`,
    heading: g.heading,
    html: `<h2>${g.heading}</h2><p>${g.lines.slice(1).join(' ').trim()}</p>`,
  });
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

function inputOf(evalReview: unknown, groups: ViewInput['groups'] = []): ViewInput {
  return {
    kind: 'eval-review',
    frontmatter: {},
    structured: evalReview === undefined ? {} : { evalReview },
    groups,
    planSegments: [],
  };
}

/** The handler's reading of a file, composed the way the page does. */
function composeFile(content: string, path = PATH): ComposedEvalReview | null {
  const raw: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = EvalReviewHandler.parse(raw, ref(path));
  return composeEvalReview(inputOf(parsed.structured?.evalReview, groupsOf(content)));
}

const renderHtml = (html: string) => createElement('section', { 'data-plain': 'true' }, `HTML:${html}`);

function markup(model: ComposedEvalReview): string {
  return renderToStaticMarkup(createElement(EvalReviewView, { model, renderHtml }));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('composeEvalReview - 04-EVAL-REVIEW, needs work', () => {
  const model = composeFile(NEEDS_WORK)!;

  it('leads with 64 of 100 and NEEDS WORK as the in-flight verdict, both as the file wrote them', () => {
    expect(model.score).toBe('64 of 100');
    expect(model.verdict).toEqual({ word: 'NEEDS WORK', tone: 'in-flight' });
  });

  it('lists the five dimensions in file order with tone, label and measurement', () => {
    const rows = model.dimensions.map((id) => model.targets[id]);
    expect(rows.map((t) => [t.name, t.tone, t.word, t.measurement])).toEqual([
      ['Totals match', 'complete', 'Covered', 'Code'],
      ['No member names', 'complete', 'Covered', 'Code'],
      ['Draft shown before fetch', 'complete', 'Covered', 'Code'],
      ['Neutral tone', 'in-flight', 'Partial', 'LLM Judge'],
      ['Usable as sent', 'missing', 'Missing', 'Human'],
    ]);
  });

  it('counts the dimension rows by status: 3 covered, 1 partial, 1 missing', () => {
    expect(model.tally).toEqual({ covered: 3, partial: 1, missing: 1 });
    expect(model.tallyText).toBe('3 covered, 1 partial, 1 missing');
    expect(model.meter).toMatchObject({
      covered: 3,
      label: '3 of 5 dimensions covered',
      items: ['complete', 'complete', 'complete', 'in-flight', 'missing'],
    });
  });

  it("carries the file's own Coverage Score, Infrastructure Score and AI-SPEC Present as written", () => {
    expect(model.facts).toEqual([
      { key: 'Coverage Score', value: '3/5 (60%)' },
      { key: 'Infrastructure Score', value: '70/100' },
      { key: 'AI-SPEC present', value: 'Yes' },
    ]);
    expect(model.auditDate).toBe('2026-04-14');
  });
});

describe('Eval review page markup - 04-EVAL-REVIEW', () => {
  const model = composeFile(NEEDS_WORK)!;
  const out = markup(model);

  it('draws the score and the verdict chip first, in the ruled head', () => {
    expect(out.indexOf('64 of 100')).toBeGreaterThan(-1);
    expect(out.indexOf('64 of 100')).toBeLessThan(out.indexOf('view-eval-review-ledger'));
    expect(out).toMatch(/class="status-chip view-eval-review-verdict" data-tone="in-flight"[^>]*>.*NEEDS WORK/);
  });

  it('draws the tally over the shared status-meter, one square per dimension, as one image', () => {
    expect(out).toContain('<b>3</b> covered, <b>1</b> partial, <b>1</b> missing');
    expect(out).toContain('aria-label="3 of 5 dimensions covered"');
    const meter = out.slice(out.indexOf('status-meter-cells'), out.indexOf('view-eval-review-facts'));
    expect(meter.match(/data-tone="[a-z-]+"/g)).toEqual([
      'data-tone="complete"',
      'data-tone="complete"',
      'data-tone="complete"',
      'data-tone="in-flight"',
      'data-tone="missing"',
    ]);
  });

  it('draws one row per dimension, each a button with its square, label and measurement', () => {
    const rows = out.split('view-eval-review-row').length - 1;
    expect(rows).toBeGreaterThanOrEqual(5);
    expect(out).toContain('Draft shown before fetch');
    expect(out).toContain('>LLM Judge<');
    expect(out).toContain('>Covered<');
    expect(out).toContain('>Missing<');
  });

  it('draws the header override: eyebrow, the phase name as the h1, and the audit date', () => {
    expect(splitEvalReviewTitle('EVAL-REVIEW — Phase 4: Bulk Loan Export')).toEqual({
      phase: 'Phase 4',
      title: 'Bulk Loan Export',
    });
    const header = evalReviewHeaderProps(model, 'EVAL-REVIEW — Phase 4: Bulk Loan Export');
    expect(header.eyebrow).toBe('Phase 4 · Eval review');
    expect(header.title).toBe('Bulk Loan Export');
    expect(renderToStaticMarkup(createElement('div', null, header.meta))).toContain('Audited 2026-04-14');
    expect(evalReviewHeaderProps(model, 'Notes').eyebrow).toBe('Eval review');
    expect(count(out, '<h1')).toBe(0);
  });
});

describe('composeEvalReview - 03-EVAL-REVIEW, not implemented', () => {
  const model = composeFile(NOT_IMPLEMENTED)!;

  it('reads 12 of 100 and NOT IMPLEMENTED as the missing verdict', () => {
    expect(model.score).toBe('12 of 100');
    expect(model.verdict).toEqual({ word: 'NOT IMPLEMENTED', tone: 'missing' });
  });

  it('lists four dimensions, every one Missing', () => {
    expect(model.dimensions.map((id) => model.targets[id].tone)).toEqual(['missing', 'missing', 'missing', 'missing']);
    expect(model.tallyText).toBe('0 covered, 0 partial, 4 missing');
  });
});

describe('composeEvalReview - a file the page cannot shape', () => {
  it('composes nothing without a projection, or with one that holds no score, verdict, row or step', () => {
    expect(composeEvalReview(inputOf(undefined))).toBeNull();
    expect(composeFile('# Notes\n\nSome words.\n')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Task 2: the word table, the infrastructure group, the remediation plan, the states and the contract.
// ---------------------------------------------------------------------------

describe('the word table (RESEARCH Pattern 7, C4)', () => {
  it('maps the four verdicts, the three dimension statuses and the infrastructure words to a tone', () => {
    expect(EVAL_WORD_TABLE.verdict.get('PRODUCTION READY')).toBe('complete');
    expect(EVAL_WORD_TABLE.verdict.get('NEEDS WORK')).toBe('in-flight');
    expect(EVAL_WORD_TABLE.verdict.get('SIGNIFICANT GAPS')).toBe('missing');
    expect(EVAL_WORD_TABLE.verdict.get('NOT IMPLEMENTED')).toBe('missing');
    expect(EVAL_WORD_TABLE.dimension.get('COVERED')).toEqual({ tone: 'complete', label: 'Covered' });
    expect(EVAL_WORD_TABLE.dimension.get('PARTIAL')).toEqual({ tone: 'in-flight', label: 'Partial' });
    expect(EVAL_WORD_TABLE.dimension.get('MISSING')).toEqual({ tone: 'missing', label: 'Missing' });
    const tones = (words: string[]) => words.map((w) => infrastructureToneOf(w));
    expect(tones(['Installed', 'Configured', 'Present', 'Implemented'])).toEqual([
      'complete',
      'complete',
      'complete',
      'complete',
    ]);
    expect(tones(['Partial'])).toEqual(['in-flight']);
    expect(tones(['Missing', 'Not found', 'Not configured'])).toEqual(['missing', 'missing', 'missing']);
  });

  it('reads any other word as quiet, whatever its case, and matches the known ones whatever their case', () => {
    expect(infrastructureToneOf('Unknown')).toBe('quiet');
    expect(infrastructureToneOf('')).toBe('quiet');
    expect(infrastructureToneOf('NOT FOUND')).toBe('missing');
    expect(verdictToneOf('MOSTLY FINE')).toBe('quiet');
    expect(verdictToneOf(null)).toBe('quiet');
    expect(verdictToneOf('needs work')).toBe('in-flight');
    expect(dimensionWordOf('WARNING')).toEqual({ tone: 'quiet', label: 'WARNING' });
    expect(dimensionWordOf('')).toEqual({ tone: 'quiet', label: 'Not stated' });
  });
});

describe('Eval review page - 04-EVAL-REVIEW infrastructure and remediation', () => {
  const model = composeFile(NEEDS_WORK)!;
  const out = markup(model);

  it("shows the infrastructure rows with the file's own words beside the tones they map to", () => {
    const rows = model.components.map((id) => model.targets[id]);
    expect(rows.map((t) => [t.name, t.word, t.tone])).toEqual([
      ['Eval tooling (Vitest)', 'Installed', 'complete'],
      ['Reference dataset', 'Partial', 'in-flight'],
      ['CI/CD integration', 'Present', 'complete'],
      ['Online guardrails', 'Implemented', 'complete'],
      ['Tracing', 'Not found', 'missing'],
    ]);
    for (const word of ['Installed', 'Present', 'Implemented', 'Not found']) expect(out).toContain(`>${word}<`);
    expect(out).toContain('Infrastructure audit');
  });

  it('shows the three remediation groups in file order, steps numbered within each', () => {
    expect(model.groups.map((g) => [g.heading, g.steps.length])).toEqual([
      ['Must fix before production', 2],
      ['Should fix soon', 3],
      ['Nice to have', 2],
    ]);
    expect(model.steps.map((s) => `${s.group}.${s.no}`)).toEqual(['0.1', '0.2', '1.1', '1.2', '1.3', '2.1', '2.2']);
    expect(out.indexOf('Must fix before production')).toBeLessThan(out.indexOf('Should fix soon'));
    expect(out.indexOf('Should fix soon')).toBeLessThan(out.indexOf('Nice to have'));
  });

  it("tags a step that opens with a dimension's or component's name, and no other", () => {
    const named = model.steps.map((s) => (s.target === null ? null : model.targets[s.target].name));
    expect(named).toEqual([
      'Usable as sent',
      'Reference dataset',
      'Neutral tone',
      'Neutral tone',
      null,
      null,
      null,
    ]);
    expect(count(out, 'view-eval-review-tgt"')).toBe(4);
  });

  it('writes "Fix: Must 1" on the row a step names, the first word of the group and the step number', () => {
    const usable = model.targets.find((t) => t.name === 'Usable as sent')!;
    expect(usable.fixes.map((i) => model.steps[i].ref)).toEqual(['Must 1']);
    const tone = model.targets.find((t) => t.name === 'Neutral tone')!;
    expect(tone.fixes.map((i) => model.steps[i].ref)).toEqual(['Should 1', 'Should 2']);
    expect(out).toContain('Fix: Should 1, Should 2');
    expect(out).toContain('Fix: Must 2');
  });

  it('matches only a leading name: a step that names its target mid-sentence, or has no colon, gets no tag', () => {
    const input = inputOf({
      score: { value: 50, max: 100 },
      verdict: 'NEEDS WORK',
      dimensions: [{ name: 'Tracing', status: 'MISSING', measurement: 'Code', finding: '' }],
      infrastructure: [{ component: 'Eval tooling (Vitest)', status: 'Installed', finding: '' }],
      remediation: [
        {
          group: 'must',
          heading: 'Must fix',
          steps: [
            'Configure a tracing tool around the call',
            'Tracing needs a colon to count',
            '**tracing**: bold, any case, counts',
            'Eval tooling: the parenthetical is ignored',
          ],
        },
      ],
    });
    const m = composeEvalReview(input)!;
    expect(m.steps.map((s) => s.target)).toEqual([null, null, 0, 1]);
  });
});

describe('Eval review page - 03-EVAL-REVIEW, not implemented', () => {
  const model = composeFile(NOT_IMPLEMENTED)!;
  const out = markup(model);

  it('reads 12 of 100 as a missing NOT IMPLEMENTED chip, every dimension Missing, AI-SPEC Present: No as written', () => {
    expect(out).toContain('12 of 100');
    expect(out).toMatch(/view-eval-review-verdict" data-tone="missing"[^>]*>.*NOT IMPLEMENTED/);
    expect(count(out, '>Missing<')).toBe(4);
    expect(model.facts.find((f) => f.key === 'AI-SPEC present')).toEqual({ key: 'AI-SPEC present', value: 'No' });
    expect(out).toContain('AI-SPEC present <b>No</b>');
  });

  it('shows the three groups, the two empty ones as a dashed 0, and tags the one step that names a dimension', () => {
    expect(model.groups.map((g) => g.steps.length)).toEqual([3, 0, 0]);
    expect(count(out, 'view-eval-review-zero')).toBe(2);
    expect(model.steps.map((s) => s.target === null)).toEqual([true, true, false]);
    expect(model.targets[model.steps[2].target!].name).toBe('Output correctness');
  });

  it("shows the file's partial and not-configured component words verbatim", () => {
    expect(model.components.map((id) => model.targets[id].word)).toEqual([
      'Not found',
      'Partial',
      'Partial',
      'Partial',
      'Not configured',
    ]);
  });
});

describe('Eval review page - missing parts', () => {
  const noScore = NEEDS_WORK.replace('**Overall Score:** 64/100\n', '').replace('**Verdict:** NEEDS WORK\n', '');

  it('shows no numeral and the quiet "Verdict not stated" with no score and no verdict, and still lists the dimensions', () => {
    const model = composeFile(noScore)!;
    expect(model.score).toBeNull();
    expect(model.verdict).toEqual({ word: null, tone: 'quiet' });
    const out = markup(model);
    expect(out).not.toContain('64 of 100');
    expect(out).not.toContain('view-eval-review-score">6');
    expect(out).toMatch(/view-eval-review-verdict" data-tone="quiet"[^>]*>.*Verdict not stated/);
    expect(out).not.toContain('>Verdict<');
    expect(out).toContain('Totals match');
    expect(out).toContain('Usable as sent');
  });

  it('shows "Verdict not stated" for a verdict the page does not know, with the word in the source only', () => {
    const model = composeFile(NEEDS_WORK.replace('NEEDS WORK', 'MOSTLY FINE'))!;
    expect(model.verdict).toEqual({ word: null, tone: 'quiet' });
    const out = markup(model);
    expect(out).toContain('Verdict not stated');
    expect(out).not.toContain('MOSTLY FINE');
    expect(out).toContain('64 of 100');
  });

  it('omits the infrastructure group silently when the file has none', () => {
    const start = NEEDS_WORK.indexOf('## Infrastructure Audit');
    const end = NEEDS_WORK.indexOf('## Critical Gaps');
    const model = composeFile(NEEDS_WORK.slice(0, start) + NEEDS_WORK.slice(end))!;
    expect(model.components).toEqual([]);
    const out = markup(model);
    expect(out).not.toContain('Infrastructure audit');
    expect(out).not.toContain('Infrastructure Score');
    expect(out).toContain('Dimension coverage');
  });

  it('keeps the sections the page does not claim as closed bars, and claims the three it draws', () => {
    const model = composeFile(NEEDS_WORK)!;
    expect(model.bars.map((b) => b.heading)).toEqual(['Critical Gaps', 'Files Found']);
    expect(model.bars[0].count).toBe('None');
    const out = markup(model);
    expect(count(out, '<details')).toBe(2);
    expect(count(out, '<details open')).toBe(0);
    expect(out).toContain('HTML:');
    // a table the page could not read stays as a bar instead of being dropped
    const unreadable = composeFile(NEEDS_WORK.replace('| Dimension | Status |', '| Thing | State |'))!;
    expect(unreadable.bars.map((b) => b.heading)).toContain('Dimension Coverage');
  });

  it('falls through to the promoted sections when the file holds nothing the page can shape', () => {
    expect(composeFile('# EVAL-REVIEW — Phase 9: X\n\n**Verdict:** MOSTLY FINE\n\n## Notes\n\nWords.\n')).toBeNull();
  });
});

describe('Eval review page - never recomputes the file (T-10-38)', () => {
  it('shows 64 and NEEDS WORK for a review whose every dimension is COVERED', () => {
    const planted = NEEDS_WORK.split('| PARTIAL |').join('| COVERED |').split('| MISSING |').join('| COVERED |');
    const model = composeFile(planted)!;
    expect(model.tally).toEqual({ covered: 5, partial: 0, missing: 0 });
    expect(model.score).toBe('64 of 100');
    expect(model.verdict).toEqual({ word: 'NEEDS WORK', tone: 'in-flight' });
    const out = markup(model);
    expect(out).toContain('64 of 100');
    expect(out).toMatch(/data-tone="in-flight"[^>]*>.*NEEDS WORK/);
    expect(out).toContain('<b>5</b> covered, <b>0</b> partial, <b>0</b> missing');
    expect(out).toContain('Coverage Score <b>3/5 (60%)</b>');
  });

  it('shows a verdict that contradicts its score as the file wrote it', () => {
    const planted = NEEDS_WORK.replace('64/100', '95/100');
    const model = composeFile(planted)!;
    expect(model.score).toBe('95 of 100');
    expect(model.verdict.word).toBe('NEEDS WORK');
  });
});

describe('Eval review page - many rows', () => {
  function bigInput(n: number): ViewInput {
    return inputOf({
      score: { value: 50, max: 100 },
      verdict: 'NEEDS WORK',
      dimensions: Array.from({ length: n }, (_, i) => ({
        name: `Dimension ${i}`,
        status: i % 3 === 0 ? 'COVERED' : i % 3 === 1 ? 'PARTIAL' : 'MISSING',
        measurement: 'Code',
        finding: `finding ${i}`,
      })),
      infrastructure: [],
      remediation: [
        {
          group: 'must',
          heading: 'Must fix',
          steps: Array.from({ length: n }, (_, i) => `**Dimension ${i}:** fix it ${i}`),
        },
      ],
    });
  }

  it('renders 150 dimensions and 150 steps in author order with no pagination', () => {
    const model = composeEvalReview(bigInput(150))!;
    const out = markup(model);
    expect(model.dimensions).toHaveLength(150);
    expect(model.steps).toHaveLength(150);
    expect(out.indexOf('Dimension 0<')).toBeLessThan(out.indexOf('Dimension 149<'));
    expect(out).not.toMatch(/Show more|Next page|Page \d/);
    expect(model.steps[149].target).toBe(149);
  });

  it('composes 10,000 rows and steps in linear time', () => {
    const growth = measureGrowth<ViewInput>({
      make: (n) => bigInput(n),
      run: (input) => composeEvalReview(input),
      startSize: 250,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    expect(composeEvalReview(bigInput(10_000))!.dimensions).toHaveLength(10_000);
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
const START = '/* phase-10-eval-review:start */';
const END = '/* phase-10-eval-review:end */';
const COMPOSER = 'src/web/views/eval-review-page.ts';
const COMPONENTS = 'src/web/views/eval-review-page-components.tsx';
const EXTRACTOR = 'src/planning-repo/handlers/eval-review-body.ts';
const HANDLER = 'src/planning-repo/handlers/eval-review.ts';
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

/** A tone this page must never write: the parse-degradation tones (`missing` is the one it does write). */
function writesForbiddenTone(text: string): boolean {
  return (
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning)['"]/.test(text) ||
    /data-tone="(destructive|warning)"/.test(text) ||
    /'(destructive|warning)'\s*\|/.test(text) ||
    /\|\s*'(destructive|warning)'/.test(text)
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

/** Arithmetic, a comparison or a rounding call applied to a score value: what the page must never do (T-10-38). */
function appliesArithmeticToScore(text: string): boolean {
  return (
    /\bscore\w*(\.\w+)*\s+[-+*/%]\s+[\w(]/.test(text) ||
    /[\w)]\s+[-+*/%]\s+score\b/.test(text) ||
    /\bscore\w*(\.\w+)*\s+[<>]=?\s+[\w(]/.test(text) ||
    /Math\.\w+\([^)]*score/.test(text)
  );
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

function evalReviewBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('eval review view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(writesLink('<a href={ref}>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;\nexport const x = 1;')).toBe(true);
    expect(appliesArithmeticToScore('const half = score.value / 2;')).toBe(true);
    expect(appliesArithmeticToScore('const rounded = Math.round(score.value);')).toBe(true);
    expect(appliesArithmeticToScore('if (score.value >= 80) return 1;')).toBe(true);
    expect(appliesArithmeticToScore('const total = covered + score;')).toBe(true);
    expect(cssViolations('a { color: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });

  it('passes clean strings', () => {
    expect(writesForbiddenTone("type EvalReviewTone = 'complete' | 'in-flight' | 'missing' | 'quiet';")).toBe(false);
    expect(writesLink('<button onClick={() => open()}>x</button>')).toBe(false);
    expect(appliesArithmeticToScore('const score = scoreText(raw.score);')).toBe(false);
    expect(appliesArithmeticToScore('if (score === null && tone === 1) return null;')).toBe(false);
    expect(appliesArithmeticToScore('return `${value} of ${max}`;')).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('eval review view contract - the real sources', () => {
  it('the components render no raw HTML and no link, and write no destructive or warning tone', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code.includes(RAW_HTML_PROP)).toBe(false);
    expect(writesLink(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    for (const expression of new Set(toneExpressions(code))) {
      expect(['"quiet"'].includes(expression) || expression.startsWith('{'), expression).toBe(true);
    }
    expect(code).toContain('aria-hidden="true"');
  });

  it('author text goes through ResearchInline as React text, never straight into markup', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("from '../pages/research-atoms.tsx'");
    expect(code).toContain('<ResearchInline text={target.name} />');
    expect(code).toContain('<ResearchInline text={step.text} />');
    expect(code).toContain('<ResearchInline text={target.finding} />');
  });

  it('draws its own meter nowhere: the head goes through the shared StatusMeter', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("from '../components/status-meter.tsx'");
    expect(code).toContain('<StatusMeter');
    expect(await source('src/web/styles/globals.css')).not.toMatch(/view-eval-review-meter/);
  });

  it('the composer writes only the four tones and holds the one word table as Maps', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(code).toContain("export type EvalReviewTone = 'complete' | 'in-flight' | 'missing' | 'quiet';");
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).toContain('export const EVAL_WORD_TABLE');
    expect(code).toContain('new Map<string, EvalReviewTone>');
    expect(code).toContain('Verdict not stated');
  });

  it('the composer applies no arithmetic, comparison or rounding to the score, and never reads the document HTML for it', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(appliesArithmeticToScore(code)).toBe(false);
    const components = stripSourceComments(await source(COMPONENTS));
    expect(appliesArithmeticToScore(components)).toBe(false);
  });

  it('the composer, the extractor and the handler build no regular expression, use no regex literal and import no filesystem module', async () => {
    for (const path of [COMPOSER, EXTRACTOR, HANDLER]) {
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

  it('the extractor is capped: rows, steps, cells and the body', async () => {
    const code = stripSourceComments(await source(EXTRACTOR));
    expect(code).toContain('EVAL_REVIEW_ROW_CAP');
    expect(code).toContain('EVAL_REVIEW_STEP_CAP');
    expect(code).toContain('EVAL_REVIEW_CELL_CAP');
    expect(code).toContain('splitBodyLines');
  });

  it('artifact-page.tsx draws this kind from the composed model in View mode, and the manifest keeps its lead and fallback', async () => {
    const code = stripSourceComments(await source('src/web/pages/artifact-page.tsx'));
    expect(code).toContain('<EvalReviewView key={artifact.path} model={evalReviewPageCover} renderHtml={renderHtml} />');
    expect(code).toContain('manifest.evalReviewPage?.(viewInput)');
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests.match(/evalReviewPage: composeEvalReview/g)).toHaveLength(1);
    expect(manifests).toContain("How far this phase's AI evaluation is built: its score and verdict");
  });

  it('the CSS block holds the page and nothing else, with no colour recipe and only the four contracted font sizes', async () => {
    const css = await source('src/web/styles/globals.css');
    const block = evalReviewBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-eval-review-/);
    expect(stripCssComments(block)).not.toMatch(/\.status-square/);
    const sizes = fontSizes(stripCssComments(block));
    expect(sizes.length).toBeGreaterThan(10);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
    for (const selector of [
      '.view-eval-review-page',
      '.view-eval-review-head',
      '.view-eval-review-ledger',
      '.view-eval-review-wires',
      '.view-eval-review-row',
      '.view-eval-review-fix',
      '.view-eval-review-bar',
    ]) {
      expect(block, selector).toContain(selector);
    }
  });

  it('hides the wires and stacks the two sides under 52rem', async () => {
    const block = stripCssComments(evalReviewBlock(await source('src/web/styles/globals.css')));
    const media = block.slice(block.indexOf('@media (max-width: 52rem)'));
    expect(media).toContain('.view-eval-review-wires');
    expect(media).toContain('display: none');
    expect(media).toContain('grid-template-columns: minmax(0, 1fr)');
  });

  it('records the tone uses and the language bullet about the file\'s own word in design-language.md', async () => {
    const doc = await source('docs/design-language.md');
    expect(doc).toContain('The Eval review page.');
    expect(doc).toContain('(Phase 10, 10-20)');
    expect(doc).toContain("the file's own word is always shown beside its tone");
    for (const tone of ['complete', 'in-flight', 'missing', 'quiet']) {
      const row = doc.split('\n').find((line) => line.startsWith(`| \`${tone}\``))!;
      expect(row, tone).toContain('(Phase 10, 10-20) on the Eval review page');
    }
  });
});
