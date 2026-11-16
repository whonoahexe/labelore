// Phase 11 (11-26, VIEW-18): the onboarding page's composer and the static markup of its page (sketch 061 winner A, the Desk), over
// the made-up Lendshed (all four files present, no map) and Tidemark (a complete map and nothing else, so the first screen suggests
// another command) onboarding summaries loaded through the repository, plus planted copies - made inside the test from the fixture
// text and a cloned presentation, never by editing a fixture - for the sketch's other states: part-way with a fast map, map-only
// with both commands the same, all four files missing, no Recommended Next Step and no known heading at all. The summary's command
// leads, ready to copy and never run; the first screen's own command stands apart when it differs and is absent otherwise.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractOnboarding } from '../../src/planning-repo/handlers/onboarding.ts';
import { buildOnboardingContext } from '../../src/presentation/onboarding-context.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { copyCommandToClipboard } from '../../src/web/components/copy-command.tsx';
import { VIEW_KINDS } from '../../src/web/views/kinds.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { VIEW_MANIFESTS } from '../../src/web/views/manifests.ts';
import { composeOnboarding } from '../../src/web/views/onboarding-page.ts';
import type { ComposedOnboarding } from '../../src/web/views/onboarding-page.ts';
import { OnboardingView, onboardingHeaderProps } from '../../src/web/views/onboarding-page-components.tsx';
import { fxRead, loadFixtureProject, loadProject } from '../helpers/fixture-project.ts';

const PATH = '.planning/onboarding/SUMMARY.md';
const TIDEMARK_ROOT = fileURLToPath(new URL('../fixtures/tidemark', import.meta.url)).replace(/[\\/]$/, '');
const NEVER = 'Labelore does not run commands. Paste it in your terminal.';

function inputOf(presentation: ProjectPresentation): ViewInput {
  const artifact = presentation.artifacts.find((candidate) => candidate.path === PATH);
  return {
    kind: 'onboarding',
    frontmatter: {},
    structured: artifact?.structured ?? {},
    groups: [],
    planSegments: [],
    onboardingContext: buildOnboardingContext(presentation, PATH),
  };
}

/** A presentation whose onboarding summary is this text, lifted the way the handler lifts a file; made inside the test. */
function planted(presentation: ProjectPresentation, body: string): ProjectPresentation {
  const copy = structuredClone(presentation);
  const artifact = copy.artifacts.find((candidate) => candidate.path === PATH);
  if (artifact === undefined) throw new Error('the fixture has no onboarding summary');
  const lifted = extractOnboarding(body);
  artifact.structured = lifted === null ? {} : { onboarding: lifted };
  return copy;
}

/** `text` with each `[from, to]` replaced once; a pair that does not apply fails the test instead of silently doing nothing. */
function edited(text: string, pairs: [string, string][]): string {
  let out = text;
  for (const [from, to] of pairs) {
    expect(out, from).toContain(from);
    out = out.split(from).join(to);
  }
  return out;
}

function composed(model: ComposedOnboarding | null): ComposedOnboarding {
  expect(model).not.toBeNull();
  return model as ComposedOnboarding;
}

function markup(model: ComposedOnboarding): string {
  return renderToStaticMarkup(createElement(OnboardingView, { model }));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

/** The commands the copy rows show, in the order the page draws them. */
function shownCommands(html: string): string[] {
  const out: string[] = [];
  const open = '<code class="copy-command-text">';
  let from = 0;
  for (;;) {
    const at = html.indexOf(open, from);
    if (at < 0) break;
    const end = html.indexOf('</code>', at);
    out.push(html.slice(at + open.length, end));
    from = end;
  }
  return out;
}

async function lendshed(): Promise<ProjectPresentation> {
  return (await loadFixtureProject()).presentation;
}

async function tidemark(): Promise<ProjectPresentation> {
  return (await loadProject(TIDEMARK_ROOT)).presentation;
}

async function tidemarkText(): Promise<string> {
  return await readFile(join(TIDEMARK_ROOT, PATH), 'utf8');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('onboarding page: Lendshed, all four files present and no map', () => {
  it('leads with the command, then the files, the codebase and the documents', async () => {
    const model = composed(composeOnboarding(inputOf(await lendshed())));
    expect(model.next).toEqual({ command: '/gsd-manager', labelled: false });
    expect(model.firstScreen).toBeNull();
    expect(model.files?.summary).toBe('4 of 4');
    expect(model.codebase).toMatchObject({ found: false, readiness: null, readinessNone: true, caption: 'No map', brownfield: true, fastMap: false });
    expect(model.documents).toMatchObject({ count: 2, line: '2 ADR, PRD, SPEC or RFC candidates', layers: 2 });
    const html = markup(model);
    const order = ['Recommended next step', 'Your project files', 'Codebase', 'Documents'].map((label) => html.indexOf(`>${label}<`));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(shownCommands(html)).toEqual(['/gsd-manager']);
    expect(html).toContain('aria-label="Copy command: /gsd-manager"');
    expect(html).toContain('>Copy command<');
  });

  it('says once that nothing is run, shows four present sheets and no first-screen block', async () => {
    const html = markup(composed(composeOnboarding(inputOf(await lendshed()))));
    expect(count(html, NEVER)).toBe(1);
    expect(count(html, 'data-ok="yes"')).toBe(4);
    expect(count(html, 'data-ok="no"')).toBe(0);
    expect(html).not.toContain('The first screen suggests');
    expect(html).not.toContain('From the onboarding summary');
    expect(html).toContain('>.planning/<');
    expect(html).toContain('4 of 4 present');
    expect(html).toContain('No map');
    expect(html).toContain('>None<');
  });
});

describe('onboarding page: Tidemark, a complete map only, the two commands differ', () => {
  it('shows both commands, each in its own copy row, the summary first and the second block quiet and labelled', async () => {
    const model = composed(composeOnboarding(inputOf(await tidemark())));
    expect(model.next).toEqual({ command: '/gsd-ingest-docs', labelled: true });
    expect(model.firstScreen?.command).toBe('/gsd-new-project');
    expect(model.firstScreen?.reason).toBe('The map is complete. Next, set the project up.');
    const html = markup(model);
    expect(shownCommands(html)).toEqual(['/gsd-ingest-docs', '/gsd-new-project']);
    expect(count(html, '>Copy command<')).toBe(2);
    expect(html).toContain('aria-label="Copy command: /gsd-ingest-docs"');
    expect(html).toContain('aria-label="Copy command: /gsd-new-project"');
    expect(count(html, 'The first screen suggests')).toBe(1);
  });

  it('draws the summary line, the never-runs sentence once and the second block with the first screen reason', async () => {
    const html = markup(composed(composeOnboarding(inputOf(await tidemark()))));
    expect(count(html, 'From the onboarding summary')).toBe(1);
    expect(count(html, NEVER)).toBe(1);
    expect(html.indexOf('From the onboarding summary')).toBeLessThan(html.indexOf('/gsd-ingest-docs'));
    expect(html.indexOf('/gsd-ingest-docs')).toBeLessThan(html.indexOf('The first screen suggests'));
    expect(html).toContain('The map is complete. Next, set the project up.');
    expect(html).toContain('view-onboarding-first');
    // the never-runs sentence stands under the summary's command, before the second block
    expect(html.indexOf(NEVER)).toBeLessThan(html.indexOf('The first screen suggests'));
  });

  it('shows four Not found sheets, the Complete map chip, seven of seven documents and three candidates', async () => {
    const model = composed(composeOnboarding(inputOf(await tidemark())));
    expect(model.files?.summary).toBe('0 of 4');
    expect(model.codebase).toMatchObject({ found: true, mapped: 7, caption: '7 of 7 documents mapped', readiness: { label: 'Complete map', tone: 'complete' } });
    const html = markup(model);
    expect(count(html, 'data-ok="no"')).toBe(4);
    expect(count(html, 'data-ok="yes"')).toBe(0);
    expect(count(html, 'view-onboarding-nf">Not found<')).toBe(4);
    expect(html).toContain('Complete map');
    expect(html).toContain('7 of 7 documents mapped');
    expect(html).toContain('3 candidates');
    expect(count(html, 'data-tone="complete"')).toBeGreaterThan(7);
  });
});

describe('onboarding page: the sketch states with no fixture, planted inside the test', () => {
  it('part-way with a fast map: two files present, a Fast map chip in the in-flight tone, four of seven documents, one candidate', async () => {
    const body = edited(fxRead('onboarding/SUMMARY.md'), [
      ['- ROADMAP.md: present', '- ROADMAP.md: missing'],
      ['- STATE.md: present', '- STATE.md: missing'],
      ['- Map readiness: none', '- Map readiness: fast'],
      ['- Codebase map: missing', '- Codebase map: .planning/codebase/ (4 documents)'],
      ['- Fast map available: no', '- Fast map available: yes'],
      ['candidates: 2', 'candidates: 1'],
      ['- /gsd-manager', '- /gsd-new-project'],
    ]);
    const model = composed(composeOnboarding(inputOf(planted(await lendshed(), body))));
    expect(model.files?.summary).toBe('2 of 4');
    expect(model.codebase).toMatchObject({ found: true, mapped: 4, readiness: { label: 'Fast map', tone: 'in-flight' }, fastMap: true });
    expect(model.documents).toMatchObject({ count: 1, line: '1 ADR, PRD, SPEC or RFC candidate', layers: 1 });
    expect(model.firstScreen).toBeNull();
    const html = markup(model);
    expect(count(html, 'data-ok="yes"')).toBe(2);
    expect(count(html, 'data-ok="no"')).toBe(2);
    expect(html).toContain('data-tone="in-flight">Fast map<');
    expect(count(html, 'view-onboarding-mini" data-tone="in-flight"')).toBe(4);
    expect(count(html, 'view-onboarding-mini" data-tone="quiet"')).toBe(3);
    expect(html).toContain('4 of 7 documents mapped');
    expect(html).toContain('1 candidate');
    expect(shownCommands(html)).toEqual(['/gsd-new-project']);
  });

  it('map-only with both commands the same: one command, no second block, no summary line', async () => {
    const body = edited(await tidemarkText(), [['- /gsd-ingest-docs', '- /gsd-new-project']]);
    const presentation = planted(await tidemark(), body);
    expect(buildOnboardingContext(presentation, PATH)?.differs).toBe(false);
    const model = composed(composeOnboarding(inputOf(presentation)));
    expect(model.firstScreen).toBeNull();
    expect(model.next).toEqual({ command: '/gsd-new-project', labelled: false });
    const html = markup(model);
    expect(shownCommands(html)).toEqual(['/gsd-new-project']);
    expect(html).not.toContain('The first screen suggests');
    expect(html).not.toContain('From the onboarding summary');
    expect(count(html, NEVER)).toBe(1);
  });

  it('all four files missing and no map: four quiet dashed Not found rows, the one command, no second block', async () => {
    const body = edited(fxRead('onboarding/SUMMARY.md'), [
      ['- PROJECT.md: present', '- PROJECT.md: missing'],
      ['- REQUIREMENTS.md: present', '- REQUIREMENTS.md: missing'],
      ['- ROADMAP.md: present', '- ROADMAP.md: missing'],
      ['- STATE.md: present', '- STATE.md: missing'],
      ['candidates: 2', 'candidates: 0'],
      ['- /gsd-manager', '- /gsd-map-codebase'],
    ]);
    const model = composed(composeOnboarding(inputOf(planted(await lendshed(), body))));
    expect(model.files?.summary).toBe('0 of 4');
    expect(model.documents).toMatchObject({ count: 0, line: 'No candidates', layers: 1 });
    const html = markup(model);
    expect(count(html, 'data-ok="no"')).toBe(4);
    expect(count(html, 'view-onboarding-nf">Not found<')).toBe(4);
    expect(count(html, 'data-tone="quiet"')).toBeGreaterThanOrEqual(4);
    expect(html).toContain('No candidates');
    expect(html).toContain('data-n="0"');
    expect(shownCommands(html)).toEqual(['/gsd-map-codebase']);
    expect(html).not.toContain('The first screen suggests');
  });

  it('no Recommended Next Step: no command row, the rest still renders', async () => {
    const body = edited(fxRead('onboarding/SUMMARY.md'), [
      ['## Recommended Next Step\n- /gsd-manager\n', ''],
    ]);
    const model = composed(composeOnboarding(inputOf(planted(await lendshed(), body))));
    expect(model.next).toEqual({ command: null, labelled: false });
    const html = markup(model);
    expect(html).not.toContain('copy-command');
    expect(html).not.toContain('Copy command');
    expect(html).not.toContain(NEVER);
    expect(html).toContain('No command in the summary.');
    expect(html).toContain('>Your project files<');
    expect(count(html, 'data-ok="yes"')).toBe(4);
  });

  it('a file with none of the four known headings composes nothing, so the page falls through silently', async () => {
    const body = '# Onboarding Summary\n\nSome other text.\n\n## Something else\n- a: b\n';
    expect(composeOnboarding(inputOf(planted(await lendshed(), body)))).toBeNull();
    expect(composeOnboarding({ kind: 'onboarding', frontmatter: {}, structured: {}, groups: [], planSegments: [] })).toBeNull();
  });

  it('a readiness word outside none, fast, partial and complete is shown as written in a dashed plain chip', async () => {
    const body = edited(fxRead('onboarding/SUMMARY.md'), [['- Map readiness: none', '- Map readiness: sparse']]);
    const model = composed(composeOnboarding(inputOf(planted(await lendshed(), body))));
    expect(model.codebase.readiness).toEqual({ label: 'sparse', tone: null });
    const html = markup(model);
    expect(html).toContain('data-form="other">sparse<');
  });

  describe('the Codebase card and the closed Codebase bar agree about the map (L3-WR-06)', () => {
    /** The text of the Codebase card's caption (heading and chip) in the first screen. */
    function cardCaption(html: string): string {
      const from = html.indexOf('<h2 class="view-onboarding-heading">Codebase</h2>');
      expect(from).toBeGreaterThan(-1);
      return html.slice(from, html.indexOf('</div>', from));
    }
    /** The value drawn beside a label in the closed bar's facts list. */
    function factValue(html: string, label: string): string {
      const from = html.indexOf(`<dt>${label}</dt><dd>`);
      expect(from, label).toBeGreaterThan(-1);
      return html.slice(from, html.indexOf('</dd>', from));
    }
    const MAP = '- Codebase map: .planning/codebase/ (4 documents)';

    it('a map path with no readiness line reads the not-stated word on the card, never Not found', async () => {
      const body = edited(fxRead('onboarding/SUMMARY.md'), [['- Map readiness: none\n- Codebase map: missing', MAP]]);
      const model = composed(composeOnboarding(inputOf(planted(await lendshed(), body))));
      expect(model.codebase).toMatchObject({ found: true, readiness: null, readinessNone: false });
      const html = markup(model);
      expect(cardCaption(html)).toContain('>Not stated<');
      expect(cardCaption(html)).not.toContain('Not found');
      expect(factValue(html, 'Map readiness')).toContain('Not stated');
    });

    it('a map path with readiness none reads None on the card, as the bar does', async () => {
      const body = edited(fxRead('onboarding/SUMMARY.md'), [['- Codebase map: missing', MAP]]);
      const model = composed(composeOnboarding(inputOf(planted(await lendshed(), body))));
      expect(model.codebase).toMatchObject({ found: true, readiness: null, readinessNone: true });
      const html = markup(model);
      expect(cardCaption(html)).toContain('>None<');
      expect(cardCaption(html)).not.toContain('Not found');
      expect(factValue(html, 'Map readiness')).toContain('None');
    });

    it('a map path with a readiness word reads the readiness chip on the card, as the bar does', async () => {
      const body = edited(fxRead('onboarding/SUMMARY.md'), [
        ['- Map readiness: none', '- Map readiness: complete'],
        ['- Codebase map: missing', MAP],
      ]);
      const html = markup(composed(composeOnboarding(inputOf(planted(await lendshed(), body)))));
      expect(cardCaption(html)).toContain('Complete map');
      expect(cardCaption(html)).not.toContain('Not found');
      expect(factValue(html, 'Map readiness')).toContain('Complete map');
    });

    it('no map path reads Not found on the card, as the bar does for the map', async () => {
      const html = markup(composed(composeOnboarding(inputOf(await lendshed()))));
      expect(cardCaption(html)).toContain('>Not found<');
      expect(factValue(html, 'Codebase map')).toContain('Not found');
    });
  });

  it('a map count that does not read, or exceeds seven, leaves the figure out and keeps the plain line', async () => {
    const base = fxRead('onboarding/SUMMARY.md');
    for (const detail of ['(several documents)', '(12 documents)']) {
      const body = edited(base, [['- Codebase map: missing', `- Codebase map: .planning/codebase/ ${detail}`]]);
      const model = composed(composeOnboarding(inputOf(planted(await lendshed(), body))));
      expect(model.codebase.mapped, detail).toBeNull();
      expect(model.codebase.caption, detail).toBe('Documents mapped: not stated');
      expect(markup(model), detail).toContain(detail.slice(1, -1));
    }
  });

  it("the real writer's words in the map's parenthetical with readiness complete still read as seven of seven", async () => {
    const body = edited(fxRead('onboarding/SUMMARY.md'), [
      ['- Map readiness: none', '- Map readiness: complete'],
      ['- Codebase map: missing', '- Codebase map: .planning/codebase/ (complete codebase map)'],
    ]);
    const model = composed(composeOnboarding(inputOf(planted(await lendshed(), body))));
    expect(model.codebase).toMatchObject({ mapped: 7, caption: '7 of 7 documents mapped', mapDetail: 'complete codebase map' });
    expect(count(markup(model), 'view-onboarding-mini" data-tone="complete"')).toBe(7);
  });

  it('shows author markup as text, never as an element', async () => {
    const body = edited(fxRead('onboarding/SUMMARY.md'), [['- /gsd-manager', '- /gsd-manager <script>alert(1)</script>']]);
    const html = markup(composed(composeOnboarding(inputOf(planted(await lendshed(), body)))));
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('removes control and bidirectional override characters from a command, so what is copied is what is shown', async () => {
    const body = edited(fxRead('onboarding/SUMMARY.md'), [['- /gsd-manager', '- /gsd-‮manager​']]);
    const model = composed(composeOnboarding(inputOf(planted(await lendshed(), body))));
    expect(model.next.command).toBe('/gsd-manager');
  });
});

describe('onboarding page: the commands are only ever copied', () => {
  it('pressing either copy button makes no request and writes exactly the command to the clipboard', async () => {
    const fetchSpy = vi.fn();
    const written: string[] = [];
    vi.stubGlobal('fetch', fetchSpy);
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: async (text: string) => {
          written.push(text);
        },
      },
    });
    const html = markup(composed(composeOnboarding(inputOf(await tidemark()))));
    const commands = shownCommands(html);
    expect(commands).toEqual(['/gsd-ingest-docs', '/gsd-new-project']);
    for (const command of commands) {
      expect(html).toContain(`aria-label="Copy command: ${command}"`);
      expect(await copyCommandToClipboard(command)).toBe(true);
    }
    expect(written).toEqual(['/gsd-ingest-docs', '/gsd-new-project']);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('renders the page with no request either', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    markup(composed(composeOnboarding(inputOf(await tidemark()))));
    markup(composed(composeOnboarding(inputOf(await lendshed()))));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('onboarding page: the header and the registry', () => {
  it('overrides the eyebrow, keeps the file title as the h1 and puts the file name in the meta', async () => {
    const model = composed(composeOnboarding(inputOf(await lendshed())));
    const props = onboardingHeaderProps(model, 'Onboarding Summary', PATH);
    expect(props.eyebrow).toBe('Onboarding');
    expect(props.title).toBe('Onboarding Summary');
    expect(props.lead).toBeNull();
    expect(props.crumbs?.map((crumb) => crumb.label)).toEqual(['Dashboard', 'Roadmap', 'SUMMARY.md']);
    expect(renderToStaticMarkup(createElement('div', null, props.meta))).toContain('SUMMARY.md');
  });

  it('VIEW_KINDS holds 40 kinds, every one with a manifest and every manifest key a kind', () => {
    expect(VIEW_KINDS.length).toBe(40);
    expect(VIEW_KINDS).toContain('onboarding');
    for (const kind of VIEW_KINDS) expect(VIEW_MANIFESTS[kind], kind).toBeDefined();
    expect(Object.keys(VIEW_MANIFESTS).sort()).toEqual([...VIEW_KINDS].sort());
    expect(VIEW_MANIFESTS.onboarding?.onboardingPage).toBe(composeOnboarding);
  });
});

// ---------------------------------------------------------------------------
// The view contract: source-text checks in the forensics-page idiom (no AST tooling). Comments are stripped before every
// negative check.
// ---------------------------------------------------------------------------

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('onboarding view contract - the real sources', () => {
  it('records the tone uses and the language bullet in design-language.md', async () => {
    const doc = await source('docs/design-language.md');
    expect(doc).toContain('**The onboarding page.**');
    for (const tone of ['complete', 'in-flight', 'quiet']) {
      const row = doc.split('\n').find((line) => line.startsWith(`| \`${tone}\``))!;
      expect(row, tone).toContain('(Phase 11, 11-26) on the onboarding page');
    }
    for (const tone of ['destructive', 'warning', 'active', 'missing']) {
      const row = doc.split('\n').find((line) => line.startsWith(`| \`${tone}\``))!;
      expect(row, tone).not.toContain('(Phase 11, 11-26)');
    }
  });
});
