// Phase 11 (11-22, VIEW-15): the seed page's composer and the static markup of its page (sketch 057 winner C, the Seed
// packet), over the made-up Lendshed and Shapes seeds loaded through the repository, plus planted copies for the shapes
// the fixtures lack. A seed leads with the idea and the sentence that says when it should surface, shown as the author
// wrote it; nothing says whether that condition has been met.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { buildSeedThreadLinks } from '../../src/presentation/seed-thread-links.ts';
import {
  blocksOf,
  composeSeed,
  segmentsOf,
  seedStatusTone,
  sincePlantedWords,
} from '../../src/web/views/seed-page.ts';
import type { ComposedSeed } from '../../src/web/views/seed-page.ts';
import { SeedView, seedHeaderProps } from '../../src/web/views/seed-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';
import { loadShapesProject } from '../helpers/shapes-project.ts';

const SEEDS = '.planning/seeds/';
const FULL = `${SEEDS}SEED-260304-k7q-shed-capacity-alerts.md`;
const NO_TRIGGER = `${SEEDS}SEED-260411-m2x-borrower-reminders.md`;
const UNKNOWN = `${SEEDS}SEED-003-paper-forms.md`;
const SHAPES_SEED = `${SEEDS}SEED-001-glaze-library.md`;

function inputOf(presentation: ProjectPresentation, path: string, withLinks = true): ViewInput {
  const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
  return {
    kind: 'seed',
    frontmatter: {},
    structured: artifact?.structured ?? {},
    groups: [],
    planSegments: [],
    seedThreadLinks: withLinks ? buildSeedThreadLinks(presentation, path) : null,
  };
}

function planted(presentation: ProjectPresentation, change: (copy: ProjectPresentation) => void): ProjectPresentation {
  const copy = structuredClone(presentation);
  change(copy);
  return copy;
}

/** A copy whose seed at `path` has these lift fields replaced. */
function withSeed(presentation: ProjectPresentation, path: string, fields: Record<string, unknown>): ProjectPresentation {
  return planted(presentation, (copy) => {
    const artifact = copy.artifacts.find((candidate) => candidate.path === path)!;
    Object.assign(artifact.structured.seed as Record<string, unknown>, fields);
  });
}

function seedOf(presentation: ProjectPresentation, path: string, withLinks = true): ComposedSeed {
  const model = composeSeed(inputOf(presentation, path, withLinks));
  expect(model, path).not.toBeNull();
  return model as ComposedSeed;
}

function markup(model: ComposedSeed): string {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SeedView, { model })));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

async function lendshed(): Promise<ProjectPresentation> {
  return (await loadFixtureProject()).presentation;
}

async function shapes(): Promise<ProjectPresentation> {
  return (await loadShapesProject()).presentation;
}

describe('seed page: SEED-260304, a seed with a trigger, a scope and an audit', () => {
  it('leads with the idea, the trigger verbatim and a quiet dormant seal', async () => {
    const model = seedOf(await lendshed(), FULL);
    expect(model.head).toEqual({
      eyebrow: 'Seed',
      title: "Alert a steward when a shed's stock of a popular tool runs low",
      id: 'SEED-260304-k7q',
    });
    expect(model.packet.surfaceWhen).toBe('when stewards ask to be told before a shed runs out of a popular tool');
    expect(model.packet.status).toEqual({ word: 'dormant', tone: 'quiet' });
    expect(model.packet.stamp).toEqual({ letter: 'M', size: 'Medium' });
    expect(model.packet.planted).toBe('2026-03-04');
    expect(model.packet.plantedDuring).toBe('v1.0 / Phase 4 (Shed-to-Shed Transfers)');
    expect(model.audit).toBe('v1.0 · 2026-03-20 · dormant');
  });

  it('draws the packet: postmark, untoned stamp, the sentence, the seal and the audit line', async () => {
    const html = markup(seedOf(await lendshed(), FULL));
    expect(html).toContain('aria-label="Planted 2026-03-04"');
    expect(html).toContain('Planted during');
    expect(html).toContain('v1.0 / Phase 4 (Shed-to-Shed Transfers)');
    expect(html).toContain('Surface when');
    expect(html).toContain('when stewards ask to be told before a shed runs out of a popular tool');
    expect(html).toContain('data-empty="false"');
    expect(html).toContain('class="view-seed-seal" data-tone="quiet"');
    expect(html).toContain('audit_acknowledged');
    expect(html).toContain('Why this matters');
    // The stamp carries the size word and no tone.
    expect(html).toMatch(/view-seed-stamp" data-state="known"/);
    expect(html).not.toMatch(/view-seed-stamp"[^>]*data-tone/);
  });

  it('lists every breadcrumb: the one that resolves is a link, the others are text with a quiet Not found', async () => {
    const model = seedOf(await lendshed(), FULL);
    expect(model.breadcrumbs.map((crumb) => crumb.state)).toEqual(['resolved', 'not-found', 'not-found']);
    expect(model.breadcrumbs[0]).toMatchObject({ path: '.planning/ROADMAP.md', url: '/roadmap' });
    const html = markup(model);
    expect(count(html, '<a ')).toBe(1);
    expect(html).toContain('href="/roadmap"');
    expect(count(html, 'Not found')).toBe(2);
    expect(html).not.toContain('href="frontend');
    // A quiet dashed square for the unresolved, a `complete` square for the link.
    expect(count(html, 'status-square" data-tone="complete"')).toBe(1);
    expect(count(html, 'class="view-seed-crumb" data-state="not-found"')).toBe(2);
  });

  it('keeps the closed bars closed and holds only what the author wrote', async () => {
    const model = seedOf(await lendshed(), FULL);
    expect(model.bars.map((bar) => bar.key)).toEqual(['estimate']);
    expect(model.bars[0]).toMatchObject({ title: 'Scope estimate', count: 'Medium', strong: 'Medium' });
    const html = markup(model);
    expect(html).toContain('<details class="view-seed-bar">');
    expect(html).not.toContain('<details class="view-seed-bar" open');
  });
});

describe('seed page: SEED-260411, a seed with no surfacing condition', () => {
  it("draws the quiet dashed 'No surfacing condition' in the slot and an in-flight active seal", async () => {
    const model = seedOf(await lendshed(), NO_TRIGGER);
    expect(model.packet.surfaceWhen).toBeNull();
    expect(model.packet.status).toEqual({ word: 'active', tone: 'in-flight' });
    expect(model.packet.stamp).toEqual({ letter: 'S', size: 'Small' });
    expect(model.audit).toBeNull();
    const html = markup(model);
    expect(html).toContain('data-empty="true"');
    expect(html).toContain('<span class="status-chip" data-tone="quiet">No surfacing condition</span>');
    expect(html).not.toContain('view-seed-sentence');
    expect(html).toContain('class="view-seed-seal" data-tone="in-flight"');
    expect(html).not.toContain('audit_acknowledged');
  });
});

describe('seed page: SEED-003, the writer placeholders', () => {
  it("shows 'Scope not stated', the trigger as written and none of the placeholder text as content", async () => {
    const model = seedOf(await lendshed(), UNKNOWN);
    expect(model.packet.stamp).toEqual({ letter: '?', size: null });
    expect(model.packet.surfaceWhen).toBe('when relevant');
    expect(model.why).toEqual([]);
    expect(model.bars).toEqual([]);
    expect(model.breadcrumbs).toEqual([]);
    const html = markup(model);
    expect(html).toContain('Scope not stated');
    expect(html).toContain('data-state="unknown"');
    expect(html).toContain('when relevant');
    for (const placeholder of ['To be filled in', 'No breadcrumbs collected', 'Captured via one-shot', 'will surface during']) {
      expect(html, placeholder).not.toContain(placeholder);
    }
    expect(html).not.toContain('Why this matters');
    expect(html).not.toContain('Breadcrumbs');
  });
});

describe("seed page: Shapes' SEED-001 renders through the same composer", () => {
  it('leads with the idea and the trigger line the lift found outside any heading', async () => {
    const model = seedOf(await shapes(), SHAPES_SEED);
    expect(model.head.title).toBe('Glaze library');
    expect(model.packet.surfaceWhen).toBe('when the recipe list passes fifty entries.');
    expect(model.packet.status).toBeNull();
    expect(model.packet.planted).toBeNull();
    const html = markup(model);
    expect(html).toContain('when the recipe list passes fifty entries.');
    expect(html).not.toContain('view-seed-postmark');
    expect(html).not.toContain('view-seed-seal');
  });
});

describe('seed page: the status word and its tone', () => {
  it("shows an unrecognised status verbatim and quiet, 'parked' included", async () => {
    const model = seedOf(withSeed(await lendshed(), FULL, { status: 'parked' }), FULL);
    expect(model.packet.status).toEqual({ word: 'parked', tone: 'quiet' });
    const html = markup(model);
    expect(html).toContain('class="view-seed-seal" data-tone="quiet"');
    expect(html).toContain('parked');
  });

  it('reads active and triggered as in flight, and dormant as quiet, in any case', () => {
    expect(seedStatusTone('active')).toBe('in-flight');
    expect(seedStatusTone('Triggered')).toBe('in-flight');
    expect(seedStatusTone(' ACTIVE ')).toBe('in-flight');
    expect(seedStatusTone('dormant')).toBe('quiet');
    expect(seedStatusTone('parked')).toBe('quiet');
    expect(seedStatusTone('')).toBe('quiet');
  });

  it('draws a triggered, large seed with breadcrumbs that mostly do not resolve (the sketch-only 057 example)', async () => {
    const presentation = withSeed(await lendshed(), FULL, {
      status: 'triggered',
      scope: 'Large',
      triggerWhen: 'when a shed outside the first region asks to join',
      breadcrumbs: [
        '`frontend/app/kiosk/screen.tsx` — the one screen all copy would have to come out of',
        '`.planning/phases/02-kiosk-check-in/02-CONTEXT.md` — the decision to keep kiosk copy in code',
        '`frontend/app/i18n.ts` — where the string table was first drafted',
        '`docs/regions.md` — which regions the sheds sit in',
      ],
    });
    const model = seedOf(presentation, FULL);
    expect(model.packet.status).toEqual({ word: 'triggered', tone: 'in-flight' });
    expect(model.packet.stamp).toEqual({ letter: 'L', size: 'Large' });
    expect(model.breadcrumbs.map((crumb) => crumb.state)).toEqual(['not-found', 'not-found', 'not-found', 'not-found']);
    expect(count(markup(model), 'Not found')).toBe(4);
  });
});

describe('seed page: the surfacing condition is never judged', () => {
  it('holds the trigger sentence verbatim and no word that says it is met, due or overdue', async () => {
    const presentation = await lendshed();
    for (const path of [FULL, NO_TRIGGER, UNKNOWN]) {
      const model = seedOf(presentation, path);
      // Everything the page says about the condition, apart from the author's own idea, why and notes.
      const said = JSON.stringify({ packet: model.packet, audit: model.audit }).toLowerCase();
      expect(said, path).not.toMatch(/\b(met|due|overdue|ready|expired|elapsed|reached)\b/);
    }
    const model = seedOf(presentation, FULL);
    expect(model.packet.surfaceWhen).toBe(
      (presentation.artifacts.find((artifact) => artifact.path === FULL)!.frontmatter as { trigger_when: string }).trigger_when,
    );
  });

  it("counts the age to the day the project was read and says only 'since planted'", async () => {
    const presentation = await lendshed();
    const read = presentation.readAt.slice(0, 10);
    const model = seedOf(presentation, FULL);
    const days = Math.round((Date.parse(read) - Date.parse('2026-03-04')) / 86_400_000);
    expect(model.packet.age).toBe(`${days} days since planted`);
    expect(sincePlantedWords('2026-03-04', '2026-03-05T09:00:00Z')).toBe('1 day since planted');
    expect(sincePlantedWords('2026-03-04', '2026-03-04T09:00:00Z')).toBe('planted today');
    expect(sincePlantedWords('2026-03-10', '2026-03-04')).toBeNull();
    expect(sincePlantedWords(null, '2026-03-04')).toBeNull();
    expect(sincePlantedWords('2026-03-04', null)).toBeNull();
    expect(sincePlantedWords('last spring', '2026-03-04')).toBeNull();
  });
});

describe('seed page: a seed with none of the known headings falls through silently', () => {
  it('composes null for a seed that holds only an id and an idea (a bare idea), and for a missing lift', async () => {
    const presentation = await lendshed();
    const bare = withSeed(presentation, FULL, {
      status: null,
      planted: null,
      plantedDuring: null,
      triggerWhen: null,
      scope: null,
      auditAcknowledged: null,
      why: null,
      whenToSurface: { trigger: null, text: null },
      scopeEstimate: null,
      breadcrumbs: [],
      notes: null,
    });
    expect(composeSeed(inputOf(bare, FULL))).toBeNull();
    expect(composeSeed({ ...inputOf(presentation, FULL), structured: {} })).toBeNull();
    expect(composeSeed({ ...inputOf(presentation, FULL), structured: { seed: 'text' } })).toBeNull();
    expect(composeSeed({ ...inputOf(presentation, FULL), structured: { seed: [] } })).toBeNull();
  });

  it('is decided per file: a bare seed beside a full one leaves the full one composed', async () => {
    const presentation = await lendshed();
    expect(composeSeed(inputOf(presentation, FULL))).not.toBeNull();
    const bare = withSeed(presentation, UNKNOWN, {
      status: null,
      planted: null,
      plantedDuring: null,
      triggerWhen: null,
      scope: null,
      whenToSurface: { trigger: null, text: null },
    });
    expect(composeSeed(inputOf(bare, UNKNOWN))).toBeNull();
    expect(composeSeed(inputOf(bare, FULL))).not.toBeNull();
  });

  it('draws the breadcrumbs as text, never as links, when the links context is missing', async () => {
    const model = seedOf(await lendshed(), FULL, false);
    expect(model.breadcrumbs.map((crumb) => crumb.state)).toEqual(['text', 'text', 'text']);
    expect(model.breadcrumbs[0]).toMatchObject({ path: '.planning/ROADMAP.md', url: null });
    const html = markup(model);
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('Not found');
  });
});

describe('seed page: a value-looking string in the prose', () => {
  it('draws the name and the shared Value not shown mark, and never the value', async () => {
    const notes = 'Set API_KEY=sk-live-123 before running and keep `DB_URL=postgres://u:p@h/db` private.\n\n- TOKEN=abc123 goes in the vault';
    const model = seedOf(withSeed(await lendshed(), FULL, { notes }), FULL);
    const html = markup(model);
    expect(html).toContain('<code>API_KEY</code>');
    expect(html).toContain('<code>DB_URL</code>');
    expect(html).toContain('<code>TOKEN</code>');
    expect(count(html, 'Value not shown')).toBe(3);
    for (const value of ['sk-live-123', 'postgres', 'abc123', 'u:p@h']) {
      expect(html, value).not.toContain(value);
      expect(JSON.stringify(model), value).not.toContain(value);
    }
    expect(html).toContain('before running and keep');
  });

  it('reads only an upper-case name with a value after the equals sign', () => {
    expect(segmentsOf('a=b and key=value and X=1 and KEY= and PATH=/bin')).toEqual([
      { kind: 'text', text: 'a=b and key=value and X=1 and KEY= and ' },
      { kind: 'withheld', name: 'PATH' },
    ]);
    expect(segmentsOf('plain words')).toEqual([{ kind: 'text', text: 'plain words' }]);
    expect(segmentsOf('')).toEqual([]);
  });

  it('keeps blank-line blocks and bullet lists', () => {
    const blocks = blocksOf('one\ntwo\n\n- a\n- b\n\n   \nthree');
    expect(blocks.map((block) => block.kind)).toEqual(['paragraph', 'list', 'paragraph']);
    expect(blocksOf(null)).toEqual([]);
    expect(blocksOf('')).toEqual([]);
  });
});

describe('seed page: the header', () => {
  it('overrides the eyebrow, the h1 and the meta, drops the lead and keeps the header copy button', async () => {
    const model = seedOf(await lendshed(), FULL);
    const props = seedHeaderProps(model, 'Fallback');
    expect(props.eyebrow).toBe('Seed');
    expect(props.title).toBe("Alert a steward when a shed's stock of a popular tool runs low");
    expect(props.lead).toBeNull();
    expect('path' in props).toBe(false);
    expect(props.crumbs!.map((crumb) => crumb.label)).toEqual(['Dashboard', 'Roadmap', 'SEED-260304-k7q']);
    expect(seedHeaderProps({ ...model, head: { ...model.head, title: null } }, 'Fallback').title).toBe('Fallback');
  });
});

describe('edge probe VIEW-15: two seed files carrying one id, and breadcrumbs past the lift bound', () => {
  it('composes each file from its own input, so two seeds with one id never share a page', async () => {
    const presentation = await lendshed();
    const twin = planted(presentation, (copy) => {
      const original = copy.artifacts.find((artifact) => artifact.path === FULL)!;
      const clone = structuredClone(original);
      clone.path = `${SEEDS}SEED-260304-k7q-twin.md`;
      (clone.structured.seed as { idea: string }).idea = 'The other seed that wrote the same id';
      copy.artifacts.push(clone);
    });
    const first = seedOf(twin, FULL);
    const second = seedOf(twin, `${SEEDS}SEED-260304-k7q-twin.md`);
    expect(first.head.id).toBe(second.head.id);
    expect(first.head.title).toBe("Alert a steward when a shed's stock of a popular tool runs low");
    expect(second.head.title).toBe('The other seed that wrote the same id');
    expect(markup(first)).not.toContain('The other seed');
  });

  it('draws every breadcrumb the lift kept (200 at most) without an unbounded count claim', async () => {
    const crumbs = Array.from({ length: 200 }, (_, at) => `\`frontend/file-${at}.ts\` — note ${at}`);
    const model = seedOf(withSeed(await lendshed(), FULL, { breadcrumbs: crumbs }), FULL);
    expect(model.breadcrumbs).toHaveLength(200);
    const html = markup(model);
    expect(count(html, '<li class="view-seed-crumb"')).toBe(200);
    expect(html).not.toMatch(/of \d+ breadcrumbs/);
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
const START = '/* phase-11-seed:start */';
const END = '/* phase-11-seed:end */';
const COMPOSER = 'src/web/views/seed-page.ts';
const COMPONENTS = 'src/web/views/seed-page-components.tsx';
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

function writesForbiddenTone(text: string): boolean {
  return (
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning|missing)['"]/.test(text) ||
    /data-tone="(destructive|warning|missing)"/.test(text) ||
    /'(destructive|warning|missing)'\s*\|/.test(text) ||
    /\|\s*'(destructive|warning|missing)'/.test(text)
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

describe('seed view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="missing" />')).toBe(true);
    expect(writesNetworkOrStorage("await fetch('/x')")).toBe(true);
    expect(buildsRegExp('const re = new RegExp(text);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;')).toBe(true);
    expect(cssViolations('a { color: color-mix(in oklch, red, blue); }')).toContain('color-mix recipe');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });
});

describe('seed view contract - the real sources', () => {
  it('the components render no raw HTML, make no request, touch no storage and write no destructive, warning or missing tone', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code.includes(RAW_HTML_PROP)).toBe(false);
    expect(writesNetworkOrStorage(code)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).toContain('aria-hidden="true"');
  });

  it('author text goes through ResearchInline as React text, withheld values through the shared mark', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("from '../pages/research-atoms.tsx'");
    expect(code).toContain('<ResearchInline key={index} text={segment.text} />');
    expect(code).toContain("from '../components/value-not-shown.tsx'");
    expect(code).toContain('<ValueNotShown />');
    // The only link is a payload address the server resolved.
    expect(code).toContain('<Link className="view-seed-path" to={crumb.url}>');
    expect(code).not.toMatch(/href=/);
  });

  it('writes the contract words in the composer', async () => {
    const composer = stripSourceComments(await source(COMPOSER));
    for (const words of [
      "'Surface when'",
      "'No surfacing condition'",
      "'Scope not stated'",
      "'Planted during'",
      "'Breadcrumbs'",
      "'audit_acknowledged'",
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

  it('the composer writes only the quiet and in-flight tones and never a word that judges the condition', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(writesForbiddenTone(code)).toBe(false);
    expect(code).not.toContain("'destructive'");
    expect(code).not.toContain("'warning'");
    expect(code).not.toMatch(/\b(overdue|expired|due)\b/);
    expect(code).not.toMatch(/'(met|ready|reached)'/);
  });

  it('artifact-page.tsx draws the page from the composed model in View mode and the manifest keeps its fallback', async () => {
    const code = stripSourceComments(await source('src/web/pages/artifact-page.tsx'));
    expect(code).toContain('<SeedView key={artifact.path} model={seedCover} />');
    expect(code).toContain('manifest.seedPage?.(viewInput)');
    expect(code).toContain('seedThreadLinks: query.data.seedThreadLinks ?? null');
    expect(code).not.toMatch(/artifact\.kind === ['"]seed['"]/);
    const manifests = await source('src/web/views/manifests.ts');
    expect(manifests.match(/seedPage: composeSeed/g)).toHaveLength(1);
    const api = await source('src/server/project-api.ts');
    expect(api.match(/buildSeedThreadLinks\(/g)).toHaveLength(1);
  });

  it('the CSS holds one contiguous phase-11-seed block with no colour recipe and only the four contracted font sizes', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(count(css, START)).toBe(1);
    expect(count(css, END)).toBe(1);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    expect(end).toBeGreaterThan(start);
    const block = css.slice(start, end);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-seed-/);
    const sizes = fontSizes(stripCssComments(block));
    expect(sizes.length).toBeGreaterThan(8);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
    for (const selector of ['.view-seed-root', '.view-seed-packet', '.view-seed-address', '.view-seed-stamp', '.view-seed-seal']) {
      expect(block, selector).toContain(selector);
    }
    // The narrow column: at most 48rem, centred.
    expect(block.slice(block.indexOf('.view-seed-root {'))).toContain('width: min(100%, 48rem)');
  });

  it('writes only its own view-seed- classes beside the shared status chip and square, and reuses no other view\'s', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    const tokens = [...code.matchAll(/className="([^"]*)"/g)].flatMap((match) => match[1]!.split(/\s+/));
    expect(tokens.length).toBeGreaterThan(10);
    for (const token of tokens) {
      expect(token.startsWith('view-seed-') || token === 'status-chip' || token === 'status-square', token).toBe(true);
    }
    expect(code).not.toMatch(/className=["'{][^>]*\b(research-|view-codebase-|view-pause-)/);
    const css = await source('src/web/styles/globals.css');
    const block = stripCssComments(css.slice(css.indexOf(START), css.indexOf(END)));
    expect(block).not.toMatch(/\.view-(codebase|pause|spikes|indexes)-|\.research-/);
  });

  it('records the tone uses and the language bullet in design-language.md', async () => {
    const doc = await source('docs/design-language.md');
    expect(doc).toContain('**The seed page.**');
    for (const tone of ['complete', 'in-flight', 'quiet']) {
      const row = doc.split('\n').find((line) => line.startsWith(`| \`${tone}\``))!;
      expect(row, tone).toContain('(Phase 11, 11-22) on the seed page');
    }
    const missing = doc.split('\n').find((line) => line.startsWith('| `missing`'))!;
    expect(missing).not.toContain('(Phase 11, 11-22)');
  });
});
