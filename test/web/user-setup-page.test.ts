// Phase 10 (10-19, VIEW-11): the User setup composer and the static markup of its page, on the made-up Lendshed user
// setups (04 part done with a planted value and a Status line that disagrees, 02 all pending). The first screen says how
// many setup steps are done and where each variable goes and where to get it, and never shows a variable's value.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { composeUserSetup } from '../../src/web/views/user-setup-page.ts';
import type { ComposedUserSetup } from '../../src/web/views/user-setup-page.ts';
import { UserSetupView, userSetupHeaderProps } from '../../src/web/views/user-setup-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { UserSetupHandler } from '../../src/planning-repo/handlers/user-setup.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';

const PART = fxRead('phases/04-bulk-loan-export/04-USER-SETUP.md');
const PENDING = fxRead('phases/02-roles-and-permissions/02-USER-SETUP.md');

function ref(path: string): ArtifactRef {
  return {
    path,
    kind: 'user-setup',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

function inputOf(userSetup: unknown): ViewInput {
  return {
    kind: 'user-setup',
    frontmatter: {},
    structured: userSetup === undefined ? {} : { userSetup },
    groups: [],
    planSegments: [],
  };
}

/** The handler's reading of a file, composed the way the page does. */
function composeFile(content: string, path = '.planning/phases/04-x/04-USER-SETUP.md'): ComposedUserSetup | null {
  const raw: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = UserSetupHandler.parse(raw, ref(path));
  return composeUserSetup(inputOf(parsed.structured?.userSetup));
}

function markup(model: ComposedUserSetup): string {
  return renderToStaticMarkup(createElement(UserSetupView, { model }));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('composeUserSetup', () => {
  it('returns null when the file has no projection', () => {
    expect(composeUserSetup(inputOf(undefined))).toBeNull();
  });

  it('reads 04 as "3 of 6 steps done", the key as a pending step with its value withheld', () => {
    const model = composeFile(PART);
    expect(model).not.toBeNull();
    expect(model?.lead).toBe('3 of 6 steps done');
    expect(model?.done).toBe(3);
    expect(model?.total).toBe(6);
    expect(model?.meter).toEqual(['complete', 'complete', 'in-flight', 'complete', 'in-flight', 'in-flight']);
    const key = model?.items.find((item) => item.title === 'LOANNOTE_MODEL_KEY');
    expect(key).toMatchObject({ tone: 'in-flight', word: 'Pending', hadValue: true, destination: '.env.local' });
  });

  it('reads 02 as "0 of 3 steps done" with every step pending', () => {
    const model = composeFile(PENDING, '.planning/phases/02-x/02-USER-SETUP.md');
    expect(model?.lead).toBe('0 of 3 steps done');
    expect(model?.meter).toEqual(['in-flight', 'in-flight', 'in-flight']);
  });

  it('shows the Status line beside the box count when they disagree, and a plain chip when they agree', () => {
    expect(composeFile(PART)?.status).toMatchObject({
      word: 'Complete',
      disagrees: true,
      boxes: '3 of 6',
      note: 'These disagree: the file is marked Complete with 3 boxes still open. Both are shown as written.',
    });
    expect(composeFile(PENDING, '.planning/phases/02-x/02-USER-SETUP.md')?.status).toMatchObject({
      word: 'Incomplete',
      disagrees: false,
    });
  });

  it('draws the dashboard paths as a tree: the service is the root, a one-child chain is joined, a URL-only step joins its host', () => {
    const model = composeFile(PART);
    const rows = model?.tree ?? [];
    expect(rows.filter((row) => row.depth === 0).map((row) => row.name)).toEqual(['Association model host']);
    const folders = rows.filter((row) => row.dir).map((row) => row.name);
    expect(folders).toContain('Settings');
    expect(folders).toContain('Models → Small');
    expect(folders).toContain('Access keys');
    // The account step names only a URL; it joins the root whose other steps share the host.
    const account = model?.items.find((item) => item.kind === 'account');
    const leaf = rows.find((row) => row.item === account?.index);
    expect(leaf).toMatchObject({ depth: 1, parent: 0, at: null });
    expect(model?.tray).toEqual([]);
    // The last segment is the leaf's muted prefix.
    const host = model?.items.find((item) => item.title === 'LOANNOTE_MODEL_HOST');
    expect(rows.find((row) => row.item === host?.index)?.at).toBe('Endpoint address');
  });

  it('groups the variables by destination file: "{d} of {t} set" on each card', () => {
    const model = composeFile(PART);
    expect(model?.files).toHaveLength(1);
    expect(model?.files[0]).toMatchObject({ name: '.env.local', setLabel: '2 of 3 set' });
    expect(model?.files[0].lines).toHaveLength(3);
  });

  it('opens on the first open step', () => {
    const model = composeFile(PART);
    expect(model?.items[model?.firstOpen ?? -1]?.title).toBe('LOANNOTE_MODEL_KEY');
  });

  it('lists every step as a bar by section with its done count', () => {
    const model = composeFile(PART);
    expect(model?.bars.map((bar) => [bar.heading, bar.count])).toEqual([
      ['Environment Variables', '2 of 3'],
      ['Account Setup', '1 of 1'],
      ['Dashboard Configuration', '0 of 2'],
    ]);
  });
});

describe('UserSetupView on 04-USER-SETUP', () => {
  const model = composeFile(PART) as ComposedUserSetup;
  const html = markup(model);

  it('leads with "3 of 6 steps done" over one meter with one square per step', () => {
    expect(html).toContain('<b>3 of 6</b> steps done');
    expect(html).toContain('aria-label="3 of 6 steps done"');
    expect(count(html, 'status-meter-sq')).toBe(6);
  });

  it('shows the Status line and the box count as two separate facts, dashed and untoned', () => {
    expect(html).toContain('The Status line says');
    expect(html).toContain('The boxes say');
    expect(html).toContain('Complete');
    expect(html).toContain('<span class="view-user-setup-mono">3 of 6</span> ticked');
    expect(html).toContain('These disagree: the file is marked Complete with 3 boxes still open.');
    expect(html).not.toContain('view-user-setup-disagree" data-tone');
  });

  it('draws each variable with its destination, where to get it and the quiet "Value not shown" mark', () => {
    expect(html).toContain('Get it from');
    expect(html).toContain('Goes in');
    expect(html).toContain('2 of 3 set');
    expect(html).toContain('LOANNOTE_MODEL_KEY');
    expect(html).toContain('Value not shown');
    expect(html).toContain('→ .env.local');
    expect(html).toContain('Association model host');
    expect(html).toContain('Endpoint address');
  });

  it('carries each step as a closed bar with its title and status word', () => {
    // Six steps, then Local Development and Verification as plain bars.
    expect(count(html, '<details class="view-user-setup-bar"')).toBe(8);
    expect(count(html, '<details class="view-user-setup-bar" open')).toBe(0);
    expect(html).toContain('Create an association model host account');
  });

  it('opens the dock on the first open step with its facts', () => {
    expect(html).toContain('aria-label="Step: LOANNOTE_MODEL_KEY"');
    expect(html).toContain('Association model host → Settings → Access keys → Create key');
  });

  it('puts the planted value nowhere in the markup', () => {
    expect(html).not.toContain('PLACEHOLDER-NOT-A-REAL-KEY');
  });
});

describe('UserSetupView on 02-USER-SETUP (all pending)', () => {
  const model = composeFile(PENDING, '.planning/phases/02-x/02-USER-SETUP.md') as ComposedUserSetup;
  const html = markup(model);

  it('leads with "0 of 3 steps done" and a plain Status line chip, no disagreement block', () => {
    expect(html).toContain('<b>0 of 3</b> steps done');
    expect(html).not.toContain('The Status line says');
    expect(html).toContain('Status line');
    expect(html).toContain('Incomplete');
  });

  it('shows every step pending', () => {
    expect(count(html, 'Pending')).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain('Value not shown');
  });
});

describe('userSetupHeaderProps', () => {
  it('moves the phase up to the eyebrow, keeps the title after "Phase N:" as the h1 and carries the head facts as meta', () => {
    const model = composeFile(PART) as ComposedUserSetup;
    const header = userSetupHeaderProps(model, 'Phase 4: User Setup Required');
    expect(header.eyebrow).toBe('Phase 4 · User setup');
    expect(header.title).toBe('User Setup Required');
    const meta = renderToStaticMarkup(createElement('div', null, header.meta));
    expect(meta).toContain('Generated 2026-04-12');
    expect(meta).toContain('04-bulk-loan-export');
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 10-19 Task 3 (T-10-33, RESEARCH Pitfall 12): the View renders only masked text. A person may paste a real value
// anywhere in the file, so each side door is planted with a distinct value and none may reach the markup, any
// attribute or the composed model: a step body, an unclaimed section, a title and a file with no recognisable steps.
// ---------------------------------------------------------------------------------------------------------------

const STEP_BODY = [
  '# Phase 9: User Setup Required',
  '',
  '**Status:** Incomplete',
  '',
  '## Dashboard Configuration',
  '',
  '- [ ] **Rotate the key**',
  '  - URL: https://host.example/keys',
  '  - Set to: The new key',
  '  - Notes: export LOANNOTE_MODEL_KEY=PLANTED-STEP-VALUE-0001 then restart',
  '',
  '## Local Development',
  '',
  'LOANNOTE_DEBUG_TOKEN: PLANTED-SECTION-VALUE-0002',
  '',
  'Point `LOANNOTE_MODEL_HOST` at `http://localhost:4318` and use `API_TOKEN: PLANTED-CODE-0005`.',
  '',
  '```bash',
  '# start the stub',
  'LOANNOTE_RUN_KEY=PLANTED-FENCE-VALUE-0007 npm run stub',
  'npm run note-stub --prefix server',
  '```',
  '',
  '---',
  '',
  '**Once all items complete:** Mark status as "Complete".',
  '',
].join('\n');

const NO_STEPS_BODY = [
  '# Phase 9: User Setup for KEY_A=PLANTED-TITLE-0004',
  '',
  '**Status:** Incomplete',
  '',
  '## Notes',
  '',
  'Set LOANNOTE_HOST_KEY=PLANTED-FALLBACK-VALUE-0003 in .env.local before you start.',
  '',
  '- Open the host and read `LOANNOTE_HOST_NAME: PLANTED-FALLBACK-VALUE-0006`',
  '',
].join('\n');

const PLANTED = [
  'PLANTED-STEP-VALUE-0001',
  'PLANTED-SECTION-VALUE-0002',
  'PLANTED-FALLBACK-VALUE-0003',
  'PLANTED-TITLE-0004',
  'PLANTED-CODE-0005',
  'PLANTED-FALLBACK-VALUE-0006',
  'PLANTED-FENCE-VALUE-0007',
  'PLACEHOLDER-NOT-A-REAL-KEY',
];

/** The handler's whole reading of a file: its title, the model and the markup of the page. */
function viewOf(content: string): { title: string; model: ComposedUserSetup | null; html: string } {
  const path = '.planning/phases/09-x/09-USER-SETUP.md';
  const raw: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = UserSetupHandler.parse(raw, ref(path));
  const model = composeUserSetup(inputOf(parsed.structured?.userSetup));
  const header = model === null ? null : userSetupHeaderProps(model, parsed.title);
  const html = model === null ? '' : markup(model);
  const headerHtml = header === null ? '' : renderToStaticMarkup(createElement('div', null, header.eyebrow, header.title, header.meta));
  return { title: parsed.title, model, html: html + headerHtml };
}

function expectNoneOf(text: string, values: readonly string[]): void {
  for (const value of values) expect(text, value).not.toContain(value);
}

describe('the View renders only masked text', () => {
  it('shows 04-USER-SETUP with the quiet mark and no value in the text or in any attribute', () => {
    const { html } = viewOf(PART);
    expect(html).toContain('<span class="value-not-shown">Value not shown</span>');
    expect(html).not.toContain('PLACEHOLDER-NOT-A-REAL-KEY');
    expect(html).not.toMatch(/(title|aria-label|data-[a-z-]+|value|href)="[^"]*PLACEHOLDER/);
  });

  it('keeps a planted step body, unclaimed section, fenced line and title out of the markup and the model', () => {
    for (const content of [STEP_BODY, NO_STEPS_BODY]) {
      const { model, html, title } = viewOf(content);
      expect(model).not.toBeNull();
      expectNoneOf(html, PLANTED);
      expectNoneOf(JSON.stringify(model), PLANTED);
      expectNoneOf(title, PLANTED);
    }
  });

  it('draws the mark where the step body, the unclaimed section and the fence held a value', () => {
    const { html } = viewOf(STEP_BODY);
    expect(count(html, 'class="value-not-shown"')).toBeGreaterThanOrEqual(4);
    expect(html).toContain('LOANNOTE_DEBUG_TOKEN');
    expect(html).toContain('LOANNOTE_MODEL_KEY');
  });

  it('puts no value in a copy control: a command that held a value is plain text, the others copy', () => {
    const { html } = viewOf(STEP_BODY);
    expect(count(html, 'aria-label="Copy command: ')).toBe(1);
    expect(html).toContain('aria-label="Copy command: npm run note-stub --prefix server"');
    expect(html).not.toContain('Copy command: LOANNOTE_RUN_KEY');
    expect(html).toContain('npm run stub');
  });

  it('composes a file with no recognisable steps to the plain model of its masked sections, not null', () => {
    const { model, html } = viewOf(NO_STEPS_BODY);
    expect(model?.kind).toBe('plain');
    expect(model?.total).toBe(0);
    expect(model?.lead).toBeNull();
    expect(model?.plain.map((section) => section.heading)).toEqual(['Notes']);
    expect(html).toContain('Steps not stated');
    expect(html).toContain('Set LOANNOTE_HOST_KEY=');
    expect(html).toContain('in .env.local before you start.');
    expect(html).toContain('class="value-not-shown"');
    expect(html).not.toContain('Nothing here yet.');
  });

  it('composes a file with no structured record to null, and a file with a record but no section to an empty plain model', () => {
    expect(composeUserSetup(inputOf(undefined))).toBeNull();
    const empty = composeFile('');
    expect(empty?.kind).toBe('plain');
    expect(empty?.plain).toEqual([]);
    expect(markup(empty as ComposedUserSetup)).toContain('Nothing here yet.');
  });

  it('shows 04 Status "Complete" beside "3 of 6 steps done" as two separate facts, and 02 as all pending', () => {
    const part = viewOf(PART);
    expect(part.model?.kind).toBe('designed');
    expect(part.html).toContain('<b>3 of 6</b> steps done');
    expect(part.html).toContain('The Status line says');
    expect(part.html).toContain('<span class="view-user-setup-val">Complete</span>');
    const pending = composeFile(PENDING, '.planning/phases/02-x/02-USER-SETUP.md');
    expect(pending?.lead).toBe('0 of 3 steps done');
    expect(pending?.meter.every((tone) => tone === 'in-flight')).toBe(true);
  });

  it('lays the plain sections of a designed page out as closed bars with the fenced commands as copy rows', () => {
    const { html } = viewOf(PART);
    expect(html).toContain('Local Development');
    expect(html).toContain('Verification');
    expect(html).toContain('aria-label="Copy command: npm run note-stub --prefix server"');
    expect(html).toContain('In the source only');
    expect(html).toContain('Once all items complete');
  });
});

describe('the user-setup manifest withholds the document', () => {
  it('does not allow the document HTML in View mode and composes through composeUserSetup', async () => {
    const { VIEW_MANIFESTS, documentHtmlAllowedInView } = await import('../../src/web/views/manifests.ts');
    const manifest = VIEW_MANIFESTS['user-setup'] ?? null;
    expect(documentHtmlAllowedInView(manifest)).toBe(false);
    expect(manifest?.userSetupPage).toBe(composeUserSetup);
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
const START = '/* phase-10-user-setup:start */';
const END = '/* phase-10-user-setup:end */';
const COMPOSER = 'src/web/views/user-setup-page.ts';
const COMPONENTS = 'src/web/views/user-setup-page-components.tsx';
const EXTRACTOR = 'src/planning-repo/handlers/user-setup-body.ts';
const HANDLER = 'src/planning-repo/handlers/user-setup.ts';
const MASK = 'src/planning-repo/handlers/withhold-values.ts';
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

/** A tone this page must never write: the parse-degradation tones and `missing` (a step it cannot classify is quiet). */
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

/** Reads the document's own HTML or a field named `value`: what a user-setup page must never do. */
function readsDocumentHtmlOrValue(text: string): boolean {
  return /\.html\b|\bgroups\b|\.document\b|(?<!token)\.value\b|\bvalue:/.test(text);
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

function userSetupBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('user setup view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'missing';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="destructive" />')).toBe(true);
    expect(writesForbiddenTone('<i data-tone="warning" />')).toBe(true);
    expect(writesLink('<a href={ref}>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;\nexport const x = 1;')).toBe(true);
    expect(readsDocumentHtmlOrValue('const html = group.html;')).toBe(true);
    expect(readsDocumentHtmlOrValue('const v = variable.value;')).toBe(true);
    expect(readsDocumentHtmlOrValue('for (const group of input.groups ?? []) {}')).toBe(true);
    expect(cssViolations('a { color: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });

  it('passes clean strings', () => {
    expect(writesForbiddenTone("type UserSetupTone = 'complete' | 'in-flight' | 'quiet';")).toBe(false);
    expect(writesLink('<button onClick={() => open()}>x</button>')).toBe(false);
    expect(readsDocumentHtmlOrValue('const text = field.text;')).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('user setup view contract - the real sources', () => {
  it('the components render no raw HTML and no link, and write no destructive, warning or missing tone', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code.includes(RAW_HTML_PROP)).toBe(false);
    expect(writesLink(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    for (const expression of new Set(toneExpressions(code))) {
      expect(['"quiet"', '"complete"', '"in-flight"'].includes(expression) || expression.startsWith('{'), expression).toBe(true);
    }
    expect(code).toContain('aria-hidden="true"');
  });

  it('the composer and the components never read the document HTML, the section groups or a field named value', async () => {
    for (const path of [COMPOSER, COMPONENTS]) {
      const code = stripSourceComments(await source(path));
      expect(readsDocumentHtmlOrValue(code), path).toBe(false);
    }
  });

  it('author text goes through MaskedInline, which draws the mark, never straight into markup', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain('<MaskedInline text={item.title} />');
    expect(code).toContain('<MaskedInline text={field.text} />');
    expect(code).toContain('<ValueNotShown />');
    expect(code).not.toContain('<ResearchInline');
  });

  it('the composer writes only the quiet, complete and in-flight tones', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(code).toContain("export type UserSetupTone = 'complete' | 'in-flight' | 'quiet';");
    expect(writesForbiddenTone(code)).toBe(false);
  });

  it('the composer, the extractor and the mask build no regular expression, use no regex literal and import no filesystem module', async () => {
    for (const path of [COMPOSER, EXTRACTOR, HANDLER, MASK]) {
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

  it('every stored string in the extractor passes through keep, the mask, or is a variable name from withholdValue', async () => {
    const code = stripSourceComments(await source(EXTRACTOR));
    expect(code).toContain('maskValues(');
    expect(code).toContain('withholdValue(');
    expect(code).toContain('USER_SETUP_STEP_CAP');
  });

  it('artifact-page.tsx draws this kind from the composed model and never reaches the document renderers for it', async () => {
    const code = stripSourceComments(await source('src/web/pages/artifact-page.tsx'));
    const branch = code.indexOf('userSetupPageCover ? (');
    expect(branch).toBeGreaterThan(-1);
    expect(code).toContain('<UserSetupView key={artifact.path} model={userSetupPageCover} onShowSource={showSource} />');
    // The user-setup branch precedes the withheld note and every document renderer, so the document's own heading list
    // and HTML are never what View mode draws for this kind.
    expect(branch).toBeLessThan(code.indexOf('documentWithheld ? ('));
    expect(branch).toBeLessThan(code.indexOf('<ViewReader'));
    expect(branch).toBeLessThan(code.indexOf('<ArtifactReader'));
    expect(code).toContain('documentHtmlAllowedInView(manifest)');
  });

  it('the CSS block exists once, holds every .view-user-setup- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = userSetupBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-user-setup-/);
    expect(stripCssComments(block)).not.toMatch(/\.status-square/);
    for (const selector of [
      '.view-user-setup-page',
      '.view-user-setup-head',
      '.view-user-setup-disagree',
      '.view-user-setup-map',
      '.view-user-setup-tree',
      '.view-user-setup-filecard',
      '.view-user-setup-bar',
      '.view-user-setup-plain',
    ]) {
      expect(block, selector).toContain(selector);
    }
  });

  it('the CSS block renders only the four contracted font sizes', async () => {
    const block = stripCssComments(userSetupBlock(await source('src/web/styles/globals.css')));
    const sizes = fontSizes(block);
    expect(sizes.length).toBeGreaterThan(10);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
  });

  it('draws its own meter nowhere: the lead goes through StatusMeter, the mark through ValueNotShown', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("from '../components/status-meter.tsx'");
    expect(code).toContain('<StatusMeter');
    expect(code).toContain("from '../components/value-not-shown.tsx'");
    expect(await source('src/web/styles/globals.css')).not.toMatch(/view-user-setup-meter/);
  });

  it('draws the tree through the shared CleanTree and the copy rows through the shared CopyCommand', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("from '../components/clean-tree.tsx'");
    expect(code).toContain('<CleanTree rows={rows} />');
    expect(code).toContain("from '../components/copy-command.tsx'");
    expect(code).toContain('<CopyCommand');
  });

  it('records the tones in design-language.md and the language bullet about masked text', async () => {
    const doc = await source('docs/design-language.md');
    expect(doc).toContain('The User setup page.');
    expect(doc).toContain('(Phase 10, 10-19)');
    expect(doc).toContain('shows only masked text');
  });
});
