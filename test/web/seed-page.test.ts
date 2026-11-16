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
import { SeedHandler } from '../../src/planning-repo/handlers/seed-thread.ts';
import type { ArtifactRef } from '../../src/planning-repo/types.ts';
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
    expect(count(html, 'status-square view-seed-sq" data-tone="complete"')).toBe(1);
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

// 11-37 (G-11-2, L3-WR-01): the seed handler masks at read time with the project's one shared mask, and the page draws
// every field through the one shared splitter, so a value written beside a name is in no payload field and no markup.
describe('seed page: a value beside a name, from the file to the markup (L3-WR-01)', () => {
  const VALUE = 'abc123';
  const SEED_PATH = '.planning/seeds/SEED-260601-w3p-mask-me.md';
  const seedFile = (over: { notes?: string; why?: string; trigger?: string; during?: string; status?: string } = {}): string =>
    [
      '---',
      'id: SEED-260601-w3p',
      `status: ${over.status ?? 'dormant'}`,
      'planted: 2026-06-01',
      `planted_during: ${over.during ?? 'v1.0 / Phase 1'}`,
      `trigger_when: ${over.trigger ?? 'when asked'}`,
      'scope: small',
      'audit_acknowledged:',
      '  milestone: v1.0',
      '  at: "2026-06-02"',
      `  status: ${over.status ?? 'dormant'}`,
      '---',
      '',
      '# SEED-260601-w3p: Mask the idea',
      '',
      '## Why This Matters',
      '',
      over.why ?? 'Because.',
      '',
      '## Notes',
      '',
      over.notes ?? 'Nothing.',
      '',
    ].join('\n');

  function parsed(text: string): { structured: Record<string, unknown>; title: string; frontmatter: Record<string, unknown> } {
    const ref = { path: SEED_PATH, kind: 'seed', location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 } as ArtifactRef;
    const result = SeedHandler.parse({ path: SEED_PATH, content: text, mtimeMs: 0, size: text.length }, ref);
    return { structured: result.structured as Record<string, unknown>, title: result.title, frontmatter: result.frontmatter };
  }

  function composed(text: string): { model: ComposedSeed; html: string; payload: string } {
    const result = parsed(text);
    const model = composeSeed({ kind: 'seed', frontmatter: {}, structured: result.structured, groups: [], planSegments: [], seedThreadLinks: null });
    expect(model).not.toBeNull();
    return { model: model as ComposedSeed, html: markup(model as ComposedSeed), payload: JSON.stringify(result.structured) };
  }

  const FORMS: [string, string][] = [
    ['bold', '**API_KEY=abc123**'],
    ['spaced', 'API_KEY = abc123'],
    ['colon', 'API_KEY: abc123'],
    ['code span', '`API_KEY=abc123`'],
    ['plain', 'API_KEY=abc123'],
  ];

  for (const [form, written] of FORMS) {
    it(`masks the ${form} form (${written}) in the payload, the model and the markup, and draws the name and the mark`, () => {
      const { model, html, payload } = composed(seedFile({ notes: `Set ${written} before the run.` }));
      for (const [where, text] of [['payload', payload], ['model', JSON.stringify(model)], ['markup', html]] as const) {
        expect(text, `${form} ${where}`).not.toContain(VALUE);
      }
      expect(html, form).toContain('<code>API_KEY</code>');
      expect(count(html, 'Value not shown'), form).toBe(1);
      expect(html, form).not.toContain('**');
    });
  }

  it('keeps the body as written (Source mode) while the lift, title and frontmatter hold no value', () => {
    const text = seedFile({ notes: 'Set **API_KEY=abc123** now.' });
    const ref = { path: SEED_PATH, kind: 'seed', location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 } as ArtifactRef;
    const result = SeedHandler.parse({ path: SEED_PATH, content: text, mtimeMs: 0, size: text.length }, ref);
    expect(result.body).toContain('API_KEY=abc123');
    expect(JSON.stringify(result.structured)).not.toContain(VALUE);
  });

  it('masks every field the page draws: trigger, planted during, status, why, notes, audit and the idea', () => {
    const planted = seedFile({
      trigger: 'when TOKEN=abc123 is rotated',
      during: 'v1.0 TOKEN=abc123',
      status: 'TOKEN=abc123',
      why: 'Because TOKEN=abc123 leaks.',
      notes: '- TOKEN=abc123 goes in the vault\n\nTOKEN: abc123',
    }).replace('# SEED-260601-w3p: Mask the idea', '# SEED-260601-w3p: Rotate TOKEN=abc123');
    const result = parsed(planted);
    expect(JSON.stringify({ s: result.structured, t: result.title, f: result.frontmatter })).not.toContain(VALUE);
    expect(JSON.stringify(result.structured)).toContain('TOKEN');
    const { model, html } = composed(planted);
    expect(JSON.stringify(model)).not.toContain(VALUE);
    expect(html).not.toContain(VALUE);
    expect(html).toContain('<code>TOKEN</code>');
    const sentence = html.slice(html.indexOf('view-seed-sentence'), html.indexOf('view-seed-foot'));
    expect(sentence).toContain('Value not shown');
    expect(sentence).not.toContain('=[');
    const top = html.slice(html.indexOf('view-seed-top'), html.indexOf('view-seed-postmark'));
    expect(top).toContain('Value not shown');
    const props = seedHeaderProps(model, 'Fallback');
    expect(props.title).not.toContain(VALUE);
    expect(props.title).toContain('Value not shown');
  });

  it('masks a presentation planted directly in a test: the page keeps its own pass', async () => {
    const model = seedOf(
      withSeed(await lendshed(), FULL, { triggerWhen: 'when API_KEY=abc123 is set', notes: '**API_KEY=abc123**', breadcrumbs: ['`a.md` — keep TOKEN: abc123 out'] }),
      FULL,
      false,
    );
    const html = markup(model);
    expect(html).not.toContain(VALUE);
    expect(JSON.stringify(model)).not.toContain(VALUE);
    expect(html).toContain('<code>API_KEY</code>');
  });

  it('shows a lower-case name as written: outside the shared mask contract', () => {
    const { html } = composed(seedFile({ notes: 'api_key=abc123' }));
    expect(html).toContain('api_key=abc123');
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

function stripSourceComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

describe('seed view contract - the real sources', () => {
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
