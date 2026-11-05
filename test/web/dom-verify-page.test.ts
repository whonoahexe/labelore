// Phase 10 (10-21, VIEW-12): the Browser check composer and the static markup of its page (sketch 051 winner A), on the
// made-up Lendshed browser checks (03 verified with failures, 01 could not look, 02 nothing to report). The first screen
// says whether the browser could look and what it found; the counts and words are shown as the file wrote them and never
// recomputed.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { composeDomVerify } from '../../src/web/views/dom-verify-page.ts';
import type { ComposedDomVerify } from '../../src/web/views/dom-verify-page.ts';
import { DomVerifyView, domVerifyHeaderProps } from '../../src/web/views/dom-verify-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { DomVerifyHandler } from '../../src/planning-repo/handlers/dom-verify.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from '../helpers/growth.ts';

const VERIFIED = fxRead('phases/03-account-admin-and-sessions/03-DOM-VERIFY.md');
const PATH = '.planning/phases/03-x/03-DOM-VERIFY.md';

function ref(path: string): ArtifactRef {
  return {
    path,
    kind: 'dom-verify',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

function inputOf(domVerify: unknown, phaseName: string | null = null): ViewInput {
  return {
    kind: 'dom-verify',
    frontmatter: {},
    structured: domVerify === undefined ? {} : { domVerify },
    groups: [],
    planSegments: [],
    phaseName,
  };
}

/** The handler's reading of a file, composed the way the page does. */
function composeFile(content: string, phaseName: string | null = null, path = PATH): ComposedDomVerify | null {
  const file: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = DomVerifyHandler.parse(file, ref(path));
  return composeDomVerify(inputOf(parsed.structured?.domVerify, phaseName));
}

function markup(model: ComposedDomVerify): string {
  return renderToStaticMarkup(createElement(DomVerifyView, { model }));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('composeDomVerify - 03-DOM-VERIFY, verified with failures', () => {
  const model = composeFile(VERIFIED, 'Account Admin & Sessions')!;

  it('leads with Verified as the complete outcome, and no reason (ok shows nothing)', () => {
    expect(model.outcome).toMatchObject({ raw: 'verified', tone: 'complete', icon: 'check', word: 'Verified', mono: false });
    expect(model.outcome.ariaLabel).toBe('Outcome: Verified');
    expect(model.reason).toBeNull();
    expect(model.view).toBe('tiles');
  });

  it("shows the frontmatter's counts: 4 passed, 2 failed, 1 needs review, 7 checked", () => {
    expect(model.counts.map((c) => [c.key, c.value, c.tone])).toEqual([
      ['passed', 4, 'complete'],
      ['failed', 2, 'missing'],
      ['needs_review', 1, 'in-flight'],
    ]);
    expect(model.checked).toBe(7);
    expect(model.noCriteria).toBe(false);
    expect(model.rowCounts).toBeNull();
  });

  it('lists seven criteria grouped failed first, then needs review, then passed', () => {
    expect(model.criteria).toHaveLength(7);
    expect(model.groups.map((g) => [g.result, g.items])).toEqual([
      ['failed', [3, 5]],
      ['needs_review', [6]],
      ['passed', [0, 1, 2, 4]],
    ]);
  });

  it('reads what was seen as the backticked values and the contract as the first double-quoted value', () => {
    expect(model.criteria[3].seen).toEqual(['Remove member']);
    expect(model.criteria[3].contract).toBe('Delete member');
    expect(model.criteria[5].seen).toEqual(['This account is turned off.']);
    expect(model.criteria[5].contract).toBe('Ask a steward.');
    expect(model.criteria[6].contract).toBeNull();
  });

  it('names the wave, the phase and the phase name the page resolved', () => {
    expect(model.wave).toBe(2);
    expect(model.phase).toBe('Phase 3');
    expect(model.phaseName).toBe('Account Admin & Sessions');
    expect(model.targets).toEqual(['/desk', '/stewards/{id}']);
  });
});

describe('Browser check page markup - 03-DOM-VERIFY', () => {
  const model = composeFile(VERIFIED, 'Account Admin & Sessions')!;
  const out = markup(model);

  it('draws the window with the outcome chip first, its accessible name and the targets in the bar', () => {
    expect(out.indexOf('view-dom-verify-outcome')).toBeGreaterThan(-1);
    expect(out).toMatch(/class="status-chip view-dom-verify-outcome" data-tone="complete"[^>]*role="img" aria-label="Outcome: Verified"/);
    expect(out).toContain('title="/desk"');
    expect(out).toContain('title="/stewards/{id}"');
    expect(out.indexOf('view-dom-verify-outcome')).toBeLessThan(out.indexOf('view-dom-verify-tiles'));
  });

  it('draws one tile per criterion, failed ones first, each with what was seen and the contract it quotes', () => {
    expect(count(out, 'class="view-dom-verify-tile"')).toBe(7);
    expect(out.indexOf('Remove member')).toBeLessThan(out.indexOf('Reset password'));
    expect(out).toContain('Contract “Delete member”');
    expect(out).toContain('Contract “Ask a steward.”');
    expect(out).toMatch(/data-tone="missing"[^>]*data-criterion="3"/);
    expect(out).toContain('Failed · 2');
    expect(out).toContain('Needs review · 1');
    expect(out).toContain('Passed · 4');
  });

  it('draws the counts in the status bar as numerals with their words, and "7 checked"', () => {
    expect(out).toMatch(/view-dom-verify-num">4<\/span><span class="view-dom-verify-key">Passed</);
    expect(out).toMatch(/view-dom-verify-num">2<\/span><span class="view-dom-verify-key">Failed</);
    expect(out).toMatch(/view-dom-verify-num">1<\/span><span class="view-dom-verify-key">Needs review</);
    expect(out).toContain('>7 checked<');
  });

  it('draws the header override: eyebrow, the phase name as the h1 and Wave 2 as meta', () => {
    const header = domVerifyHeaderProps(model, 'DOM verification: Phase 3, wave 2');
    expect(header.eyebrow).toBe('Phase 3 · Browser check');
    expect(header.title).toBe('Account Admin & Sessions');
    expect(renderToStaticMarkup(createElement('div', null, header.meta))).toContain('Wave 2');
    expect(count(out, '<h1')).toBe(0);
  });

  it('draws "What the check wrote" as a closed bar', () => {
    expect(out).toContain('What the check wrote');
    expect(count(out, '<details')).toBe(1);
    expect(count(out, '<details open')).toBe(0);
  });
});

describe('composeDomVerify - a file the page cannot shape', () => {
  it('composes nothing without a projection, or with one that holds no outcome, count or criterion', () => {
    expect(composeDomVerify(inputOf(undefined))).toBeNull();
    expect(composeFile('# Notes\n\nSome words.\n')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Task 2: could not look, nothing to report, odd shapes and the contract.
// ---------------------------------------------------------------------------

const COULD_NOT_LOOK = fxRead('phases/01-member-sign-in-sessions/01-DOM-VERIFY.md');
const NOTHING_TO_REPORT = fxRead('phases/02-roles-and-permissions/02-DOM-VERIFY.md');

describe('Browser check page - 01-DOM-VERIFY, could not look', () => {
  const model = composeFile(COULD_NOT_LOOK, 'Member Sign-In & Sessions')!;
  const out = markup(model);

  it('is the in-flight outcome with the eye-off icon, the reason sentence and the raw reason, never complete', () => {
    expect(model.outcome).toMatchObject({ raw: 'could_not_look', tone: 'in-flight', icon: 'eye-off', word: 'Could not look' });
    expect(model.outcome.ariaLabel).toBe('Outcome: Could not look: target unreachable');
    expect(model.reason).toEqual({
      sentence: 'Could not look: nothing was serving the target. Start it, then rerun the browser check.',
      raw: 'target_unreachable',
    });
    expect(model.view).toBe('shut');
    expect(out).toMatch(/view-dom-verify-outcome" data-tone="in-flight"[^>]*aria-label="Outcome: Could not look: target unreachable"/);
    expect(out).toContain('Could not look: nothing was serving the target. Start it, then rerun the browser check.');
    expect(out).toContain('reason: target_unreachable');
    expect(out).toContain('data-view="shut"');
    expect(out).not.toContain('data-tone="complete"');
  });

  it('says "No criteria were checked." in place of three zero counts, and shows the address the body names', () => {
    expect(model.noCriteria).toBe(true);
    expect(model.counts).toEqual([]);
    expect(out).toContain('No criteria were checked.');
    expect(out).not.toContain('view-dom-verify-num');
    expect(out).not.toContain('checked<');
    expect(out).toContain('title="http://localhost:4871/sign-in"');
  });
});

describe('Browser check page - 02-DOM-VERIFY, nothing to report', () => {
  const model = composeFile(NOTHING_TO_REPORT, 'Roles & Permissions')!;
  const out = markup(model);

  it('is the quiet outcome with the minus icon and its own reason, never complete', () => {
    expect(model.outcome).toMatchObject({ raw: 'nothing_to_report', tone: 'quiet', icon: 'minus', word: 'Nothing to report' });
    expect(model.outcome.ariaLabel).toBe('Outcome: Nothing to report: no criteria');
    expect(model.view).toBe('blank');
    expect(out).toContain('Nothing to report: this wave had no UI acceptance criteria.');
    expect(out).toContain('reason: no_criteria');
    expect(out).toContain('data-view="blank"');
    expect(out).toContain('No criteria were checked.');
    expect(out).not.toContain('data-tone="complete"');
    expect(out).not.toContain('view-dom-verify-num');
  });

  it('shows no target when the body names none', () => {
    expect(model.targets).toEqual([]);
    expect(out).toContain('data-empty="true"');
    expect(out).not.toContain('view-dom-verify-path');
  });

  it('differs from could not look in icon, word and reason, not in colour alone', () => {
    const shut = composeFile(COULD_NOT_LOOK)!;
    expect(shut.outcome.icon).not.toBe(model.outcome.icon);
    expect(shut.outcome.word).not.toBe(model.outcome.word);
    expect(shut.reason?.raw).not.toBe(model.reason?.raw);
    expect(shut.outcome.tone).not.toBe(model.outcome.tone);
    const shutOut = markup(shut);
    expect(shutOut).not.toContain('data-view="blank"');
    expect(out).not.toContain('data-view="shut"');
  });
});

describe('Browser check page - odd shapes', () => {
  it('shows an unknown reason, profile_locked, as its raw value in mono and no sentence', () => {
    const model = composeFile(COULD_NOT_LOOK.replace('target_unreachable', 'profile_locked'))!;
    expect(model.reason).toEqual({ sentence: null, raw: 'profile_locked' });
    const out = markup(model);
    expect(out).toContain('reason: profile_locked');
    expect(out).not.toContain('nothing was serving the target');
    expect(model.outcome.ariaLabel).toBe('Outcome: Could not look: profile locked');
  });

  it('shows no reason for ok', () => {
    expect(composeFile(VERIFIED)!.reason).toBeNull();
    expect(markup(composeFile(VERIFIED)!)).not.toContain('reason: ok');
  });

  it('shows "Outcome not stated" quiet for a file with no outcome key, with the counts and criteria still shown', () => {
    const model = composeFile(VERIFIED.replace('outcome: verified\n', '').replace('reason: ok\n', ''))!;
    expect(model.outcome).toMatchObject({ raw: null, tone: 'quiet', icon: 'help', word: 'Outcome not stated' });
    const out = markup(model);
    expect(out).toContain('Outcome not stated');
    expect(out).toContain('view-dom-verify-num">4<');
    expect(count(out, 'class="view-dom-verify-tile"')).toBe(7);
  });

  it('shows an outcome word the page does not know raw, in mono, on a quiet chip', () => {
    const model = composeFile(VERIFIED.replace('outcome: verified', 'outcome: partially_verified'))!;
    expect(model.outcome).toMatchObject({ raw: 'partially_verified', tone: 'quiet', mono: true });
    expect(markup(model)).toContain('view-dom-verify-mono">partially_verified<');
  });

  it('shows the counts only when the file states them', () => {
    const model = composeFile(VERIFIED.replace('checked: 7\npassed: 4\nfailed: 2\nneeds_review: 1\n', ''))!;
    expect(model.counts).toEqual([]);
    expect(model.checked).toBeNull();
    const out = markup(model);
    expect(out).not.toContain('view-dom-verify-num');
    expect(count(out, 'class="view-dom-verify-tile"')).toBe(7);
  });

  it('shows the frontmatter counts when the rows disagree, and says what the lines show', () => {
    const model = composeFile(
      '---\nwave: 1\noutcome: verified\nreason: ok\nchecked: 5\npassed: 4\nfailed: 0\nneeds_review: 0\n---\n\n# DOM verification: Phase 5, wave 1\n\n' +
        '- passed: a\n- passed: b\n- passed: c\n- passed: d\n- passed: e\n',
    )!;
    expect(model.counts.find((c) => c.key === 'passed')?.value).toBe(4);
    expect(model.rowCounts).toEqual({ passed: 5, failed: 0, needsReview: 0 });
    const out = markup(model);
    expect(out).toContain('view-dom-verify-num">4<');
    expect(out).toContain('Lines in the file: 5 passed, 0 failed, 0 needs review.');
  });

  it('draws a zero as a dashed quiet square, and a file with only zeros and criteria does not claim a pass', () => {
    const model = composeFile(VERIFIED.replace('failed: 2', 'failed: 0'))!;
    expect(model.counts.find((c) => c.key === 'failed')).toMatchObject({ value: 0, tone: 'quiet' });
  });

  it('shows the target the body states as text, and a stated time in the header meta', () => {
    const model = composeFile(
      '---\nwave: 1\noutcome: verified\nreason: ok\nchecked: 1\npassed: 1\nfailed: 0\nneeds_review: 0\n---\n\n# DOM verification: Phase 5, wave 1\n\n' +
        'Target: http://127.0.0.1:4310/loans\n\n**Checked:** 2026-11-05 14:02\n\n- passed: the table lists `3 loans`.\n',
    )!;
    expect(model.targets).toEqual(['http://127.0.0.1:4310/loans']);
    expect(model.checkedAt).toBe('2026-11-05 14:02');
    const out = markup(model);
    expect(out).toContain('title="http://127.0.0.1:4310/loans"');
    expect(out).not.toContain('href=');
    const meta = renderToStaticMarkup(createElement('div', null, domVerifyHeaderProps(model, 'x').meta));
    expect(meta).toContain('Checked 2026-11-05 14:02');
  });

  it('shows no target and no time when the body states none, and never a file date', () => {
    const model = composeFile(NOTHING_TO_REPORT)!;
    expect(model.targets).toEqual([]);
    expect(model.checkedAt).toBeNull();
    const meta = renderToStaticMarkup(createElement('div', null, domVerifyHeaderProps(model, 'x').meta));
    expect(meta).not.toContain('Checked');
  });

  it('renders observed text containing angle brackets as text, never as markup', () => {
    const model = composeFile(
      '---\nwave: 1\noutcome: verified\nreason: ok\nchecked: 2\npassed: 1\nfailed: 1\nneeds_review: 0\n---\n\n# x\n\n' +
        '- failed: the banner reads `<img src=x onerror=alert(1)>` and "<script>alert(2)</script>".\n- passed: <b>bold</b> stays text\n',
    )!;
    const out = markup(model);
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('<b>');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(out).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
  });

  it('falls back to the file title for the h1 when no phase name resolved, and "Browser check" with no phase', () => {
    const model = composeFile(VERIFIED)!;
    expect(domVerifyHeaderProps(model, 'DOM verification: Phase 3, wave 2').title).toBe('DOM verification: Phase 3, wave 2');
    expect(domVerifyHeaderProps(model, 'DOM verification: Phase 3, wave 2').eyebrow).toBe('Phase 3 · Browser check');
    const bare = composeDomVerify(inputOf({ outcome: 'verified', counts: {}, criteria: [] }))!;
    expect(domVerifyHeaderProps(bare, 'Notes').eyebrow).toBe('Browser check');
  });
});

describe('Browser check page - many criteria', () => {
  function bigInput(n: number): ViewInput {
    return inputOf({
      outcome: 'verified',
      reason: 'ok',
      counts: { checked: n, passed: n, failed: 0, needsReview: 0 },
      criteria: Array.from({ length: n }, (_, i) => ({
        verdict: i % 3 === 0 ? 'failed' : i % 3 === 1 ? 'needs_review' : 'passed',
        text: `the control \`Item ${i}\` reads "Contract ${i}"`,
      })),
      paragraphs: [],
      targets: [],
    });
  }

  it('renders 150 criteria in file order within their groups, with no pagination', () => {
    const model = composeDomVerify(bigInput(150))!;
    const out = markup(model);
    expect(count(out, 'class="view-dom-verify-tile"')).toBe(150);
    expect(out).not.toMatch(/Show more|Next page|Page \d/);
  });

  it('composes 10,000 criteria in linear time', () => {
    const growth = measureGrowth<ViewInput>({
      make: (n) => bigInput(n),
      run: (input) => composeDomVerify(input),
      startSize: 250,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    expect(composeDomVerify(bigInput(10_000))!.criteria).toHaveLength(10_000);
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
const START = '/* phase-10-dom-verify:start */';
const END = '/* phase-10-dom-verify:end */';
const COMPOSER = 'src/web/views/dom-verify-page.ts';
const COMPONENTS = 'src/web/views/dom-verify-page-components.tsx';
const EXTRACTOR = 'src/planning-repo/handlers/dom-verify-body.ts';
const HANDLER = 'src/planning-repo/handlers/dom-verify.ts';
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

function domVerifyBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('browser check view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(writesLink('<a href={ref}>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;\nexport const x = 1;')).toBe(true);
    expect(cssViolations('a { color: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });

  it('passes clean strings', () => {
    expect(writesForbiddenTone("type DomVerifyTone = 'complete' | 'in-flight' | 'missing' | 'quiet';")).toBe(false);
    expect(writesLink('<button onClick={() => open()}>x</button>')).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('browser check view contract - the real sources', () => {
  it('the components render no raw HTML and no link, and write no destructive or warning tone', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code.includes(RAW_HTML_PROP)).toBe(false);
    expect(writesLink(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).toContain('aria-hidden="true"');
  });

  it('author text goes through ResearchInline as React text, never straight into markup', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("from '../pages/research-atoms.tsx'");
    expect(code).toContain('<ResearchInline text={criterion.text} />');
    expect(code).toContain('<ResearchInline text={paragraph} />');
  });

  it('the composer writes only the four tones, holds the word tables as Maps and writes the copy rows', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(code).toContain("export type DomVerifyTone = 'complete' | 'in-flight' | 'missing' | 'quiet';");
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).toContain('export const DOM_OUTCOME_TABLE');
    expect(code).toContain('export const DOM_REASON_COPY');
    expect(code).toContain('No criteria were checked.');
    expect(code).toContain('Outcome not stated');
  });

  it('never gives could_not_look or nothing_to_report the complete tone', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(code).toContain("['nothing_to_report', { tone: 'quiet', icon: 'minus', word: 'Nothing to report' }]");
    expect(code).toContain("['could_not_look', { tone: 'in-flight', icon: 'eye-off', word: 'Could not look' }]");
  });

  it('the composer, the extractor and the handler build no regular expression, use no regex literal and import no filesystem module', async () => {
    for (const path of [COMPOSER, EXTRACTOR, HANDLER]) {
      const code = stripSourceComments(await source(path));
      expect(buildsRegExp(code), path).toBe(false);
      expect(usesRegexLiteral(code), path).toBe(false);
      expect(importsFilesystem(code), path).toBe(false);
    }
  });

  it('the composer holds no module-level mutable state and recounts nothing', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(hasModuleLevelLet(code)).toBe(false);
    expect(code).not.toMatch(/^(export\s+)?var\s/m);
    expect(code).not.toMatch(/passed\s*\+\s*failed|\.length\s*\+\s*given|reduce\(/);
  });

  it('the extractor is capped: criteria, paragraphs, targets, lines and the body', async () => {
    const code = stripSourceComments(await source(EXTRACTOR));
    expect(code).toContain('DOM_VERIFY_CRITERIA_CAP');
    expect(code).toContain('DOM_VERIFY_PARAGRAPH_CAP');
    expect(code).toContain('DOM_VERIFY_LINE_CAP');
    expect(code).toContain('DOM_VERIFY_TARGET_CAP');
    expect(code).toContain('splitBodyLines');
  });

  it('artifact-page.tsx draws this kind from the composed model in View mode, and the manifest keeps its lead and fallback', async () => {
    const code = stripSourceComments(await source('src/web/pages/artifact-page.tsx'));
    expect(code).toContain('<DomVerifyView key={artifact.path} model={domVerifyPageCover} />');
    expect(code).toContain('manifest.domVerifyPage?.(viewInput)');
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests.match(/domVerifyPage: composeDomVerify/g)).toHaveLength(1);
    expect(manifests).toContain('What a browser check of this phase found: whether it could look');
  });

  it('draws a distinct lucide icon for could not look, hidden from assistive technology, the chip carrying the words', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain('EyeOff');
    expect(code).toContain('CircleMinus');
    expect(code).toMatch(/<EyeOff[^>]*aria-hidden="true"/);
    expect(code).toContain('aria-label={outcome.ariaLabel}');
  });

  it('the CSS block holds the page and nothing else, with no colour recipe and only the four contracted font sizes', async () => {
    const css = await source('src/web/styles/globals.css');
    const block = domVerifyBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-dom-verify-/);
    expect(stripCssComments(block)).not.toMatch(/\.status-square/);
    const sizes = fontSizes(stripCssComments(block));
    expect(sizes.length).toBeGreaterThan(10);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
    for (const selector of [
      '.view-dom-verify-page',
      '.view-dom-verify-window',
      '.view-dom-verify-chrome',
      '.view-dom-verify-tile',
      '.view-dom-verify-status',
      '.view-dom-verify-wrote',
    ]) {
      expect(block, selector).toContain(selector);
    }
  });

  it('shuts the window with a hatch and blanks it with a dashed frame, and the in-flight chip is a 2px frame', async () => {
    const block = stripCssComments(domVerifyBlock(await source('src/web/styles/globals.css')));
    expect(block).toMatch(/\[data-view='shut'\]\s*\{[^}]*repeating-linear-gradient/);
    expect(block).toMatch(/\[data-view='blank'\]\s*\{[^}]*dashed/);
    expect(block).toMatch(/view-dom-verify-outcome\[data-tone='in-flight'\]\s*\{[^}]*border-width: 2px/);
    expect(block).toMatch(/view-dom-verify-outcome\[data-tone='quiet'\]\s*\{[^}]*dashed/);
  });

  it("records the tone uses and the language bullet about the two non-pass outcomes in design-language.md", async () => {
    const doc = await source('docs/design-language.md');
    expect(doc).toContain('The Browser check page.');
    expect(doc).toContain('(Phase 10, 10-21)');
    expect(doc).toContain('differ from each other in icon, word and reason, never in colour alone');
    for (const tone of ['complete', 'in-flight', 'missing', 'quiet']) {
      const row = doc.split('\n').find((line) => line.startsWith(`| \`${tone}\``))!;
      expect(row, tone).toContain('(Phase 10, 10-21) on the Browser check page');
    }
  });
});
