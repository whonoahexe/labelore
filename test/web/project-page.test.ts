// Phase 9 (09-07, sketch 041 B): the PROJECT.md page composer and its masthead, through the real
// presentation and the real server join, on the made-up Lendshed project. Expected values come from the
// fixture's own PROJECT.md and the sketch's masthead, never from the composer's output.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { ProjectHandler } from '../../src/planning-repo/handlers/project.ts';
import { buildProjectContext } from '../../src/presentation/project-context.ts';
import type { ProjectContext } from '../../src/presentation/project-context.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { VIEW_MANIFESTS } from '../../src/web/views/manifests.ts';
import { composeProjectPage } from '../../src/web/views/project-page.ts';
import type { ComposedProjectPage } from '../../src/web/views/project-page.ts';
import { ProjectPageView } from '../../src/web/views/project-page-components.tsx';
import { FX_ROOT, loadFixtureProject } from '../helpers/fixture-project.ts';
import type { LoadedProject } from '../helpers/fixture-project.ts';

let lendshed: LoadedProject;
beforeAll(async () => {
  lendshed = await loadFixtureProject();
});

/** `structured` as the real handler produces it for the Lendshed fixture's PROJECT.md. */
function lendshedStructured(): Record<string, unknown> {
  const content = readFileSync(join(FX_ROOT, '.planning', 'PROJECT.md'), 'utf8');
  const ref = { path: '.planning/PROJECT.md', kind: 'project', location: 'root', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 } as const;
  const parsed = ProjectHandler.parse({ path: ref.path, content, mtimeMs: 0, size: content.length }, ref);
  return JSON.parse(JSON.stringify(parsed.structured)) as Record<string, unknown>;
}

function inputOf(context: ProjectContext | null | undefined, structured: Record<string, unknown> = {}): ViewInput {
  return {
    kind: 'project',
    frontmatter: {},
    structured,
    groups: [],
    planSegments: [],
    projectContext: context === undefined ? null : (JSON.parse(JSON.stringify(context)) as ProjectContext | null),
  };
}

function markup(model: ComposedProjectPage): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(ProjectPageView, {
        model,
        path: '.planning/PROJECT.md',
        mode: 'view',
        onModeChange: () => undefined,
        chip: null,
      }),
    ),
  );
}

describe('composeProjectPage', () => {
  it('Lendshed: the masthead names the project, what it is and its core value', () => {
    const page = composeProjectPage(inputOf(buildProjectContext(lendshed.presentation)));
    expect(page).not.toBeNull();
    expect(page!.masthead.eyebrow).toBe('Project');
    expect(page!.masthead.name).toBe('Lendshed');
    expect(page!.masthead.lead?.startsWith('A web app for a neighbourhood tool library')).toBe(true);
    expect(page!.masthead.coreValue).toBe(
      'A member can see what is on the shelf at every shed and borrow it without asking a steward to look it up.',
    );
    expect(page!.margin).toBeNull();
    expect(page!.decisions).toBeNull();
  });

  it('is null without a projectContext, and null when the context holds only the name', () => {
    expect(composeProjectPage(inputOf(null))).toBeNull();
    expect(composeProjectPage(inputOf(undefined))).toBeNull();
    const nameOnly: ProjectContext = {
      name: 'Bare',
      tagline: null,
      lead: null,
      coreValue: null,
      counts: null,
      tiles: null,
      dashboardUrl: '/',
    };
    expect(composeProjectPage(inputOf(nameOnly))).toBeNull();
  });

  it('omits the core value when the context has none, silently', () => {
    const context: ProjectContext = { ...buildProjectContext(lendshed.presentation), coreValue: null };
    const page = composeProjectPage(inputOf(context));
    expect(page!.masthead.coreValue).toBeNull();
    expect(markup(page!)).not.toContain('Core value');
  });

  it('the project manifest opts into the page and keeps promote as the fallback', () => {
    const manifest = VIEW_MANIFESTS.project;
    expect(manifest?.projectPage).toBe(composeProjectPage);
    expect(manifest?.promote.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ProjectPageView masthead', () => {
  it('renders the eyebrow, the one h1, the lead and the core-value card', () => {
    const page = composeProjectPage(inputOf(buildProjectContext(lendshed.presentation)))!;
    const html = markup(page);
    expect(html).toContain('<p class="eyebrow">Project</p>');
    expect(html.match(/<h1\b/g)?.length).toBe(1);
    expect(html).toContain('<h1 class="view-project-name">Lendshed</h1>');
    expect(html).toContain('view-project-what');
    expect(html).toContain('view-project-core');
    expect(html).toContain('Core value');
    expect(html).toContain('borrow it without asking a steward');
  });

  it('puts the View / Source toggle and the copy-path button in the masthead', () => {
    const page = composeProjectPage(inputOf(buildProjectContext(lendshed.presentation)))!;
    const html = markup(page);
    const masthead = html.slice(html.indexOf('view-project-masthead'));
    expect(masthead).toContain('aria-label="Document display"');
    expect(masthead).toContain('artifact-path-copy');
  });
});

describe('composeProjectPage strip', () => {
  it('Lendshed: the strip holds the four tiles from the context and no goal without structured.project', () => {
    const context = buildProjectContext(lendshed.presentation);
    const page = composeProjectPage(inputOf(context))!;
    expect(page.strip).not.toBeNull();
    expect(page.strip!.goalLabel).toBeNull();
    expect(page.strip!.goal).toBeNull();
    expect(page.strip!.tiles!.map((tile) => tile.state)).toEqual(['complete', 'pending', 'validated', 'out-of-scope']);
    expect(page.strip!.tiles!.map((tile) => tile.count)).toEqual(context.tiles!.map((tile) => tile.count));
  });

  it('Lendshed: the goal cell reads "Now building v1.1 Steward Desk" with the milestone goal', () => {
    const context = buildProjectContext(lendshed.presentation);
    const page = composeProjectPage(inputOf(context, lendshedStructured()))!;
    expect(page.strip!.goalLabel).toBe('Now building v1.1 Steward Desk');
    expect(page.strip!.goal?.startsWith('Lendshed owns its own sign-in')).toBe(true);
    expect(page.strip!.tiles).toHaveLength(4);
  });

  it('with tiles null the strip keeps only the goal cell', () => {
    const context = { ...buildProjectContext(lendshed.presentation), tiles: null };
    const page = composeProjectPage(inputOf(context, lendshedStructured()))!;
    expect(page.strip).not.toBeNull();
    expect(page.strip!.tiles).toBeNull();
    expect(page.strip!.goalLabel).toBe('Now building v1.1 Steward Desk');
  });

  it('with no Current Milestone section the goal cell is omitted and the tiles keep the strip', () => {
    const context = buildProjectContext(lendshed.presentation);
    const structured = { ...lendshedStructured(), project: { milestone: null } };
    const page = composeProjectPage(inputOf(context, structured))!;
    expect(page.strip!.goalLabel).toBeNull();
    expect(page.strip!.goal).toBeNull();
    expect(page.strip!.tiles).toHaveLength(4);
  });

  it('a milestone without a goal shows its label alone', () => {
    const context = buildProjectContext(lendshed.presentation);
    const structured = { project: { milestone: { label: 'v3.0 Quiet', version: 'v3.0', goal: null } } };
    const page = composeProjectPage(inputOf(context, structured))!;
    expect(page.strip!.goalLabel).toBe('Now building v3.0 Quiet');
    expect(page.strip!.goal).toBeNull();
  });

  it('a malformed structured.project is ignored, never thrown on', () => {
    const context = buildProjectContext(lendshed.presentation);
    for (const project of [null, 7, 'x', [], { milestone: 'x' }, { milestone: { label: 4, goal: {} } }]) {
      const page = composeProjectPage(inputOf(context, { project }));
      expect(page, JSON.stringify(project)).not.toBeNull();
      expect(page!.strip!.goalLabel).toBeNull();
    }
  });

  it('a PROJECT.md whose only recognised content is the milestone still composes', () => {
    const nameOnly: ProjectContext = {
      name: 'Bare',
      tagline: null,
      lead: null,
      coreValue: null,
      counts: null,
      tiles: null,
      dashboardUrl: '/',
    };
    const structured = { project: { milestone: { label: 'v1.0 First', version: 'v1.0', goal: 'Ship it.' } } };
    const page = composeProjectPage(inputOf(nameOnly, structured));
    expect(page).not.toBeNull();
    expect(page!.strip).toEqual({ goalLabel: 'Now building v1.0 First', goal: 'Ship it.', tiles: null });
  });

  it('is null without tiles, and a page with only tiles still composes', () => {
    const context = buildProjectContext(lendshed.presentation);
    expect(composeProjectPage(inputOf({ ...context, tiles: null }))!.strip).toBeNull();
    const onlyTiles = composeProjectPage(inputOf({ ...context, lead: null, coreValue: null }));
    expect(onlyTiles).not.toBeNull();
    expect(onlyTiles!.masthead.lead).toBeNull();
    expect(onlyTiles!.strip).not.toBeNull();
  });
});

describe('ProjectPageView strip', () => {
  const html = (): string => markup(composeProjectPage(inputOf(buildProjectContext(lendshed.presentation)))!);

  it('renders each tile as a link with a square, the numeral, the label and the sub-line', () => {
    const out = html();
    expect(out.match(/class="view-project-tile"/g)?.length).toBe(4);
    expect(out).toContain('href="/traceability?milestone=v1.1&amp;state=complete"');
    expect(out).toContain('href="/traceability?milestone=v1.1&amp;state=pending"');
    expect(out).toContain('href="/traceability?state=validated"');
    expect(out).toContain('href="/traceability?state=out-of-scope"');
    expect(out).toContain('class="status-square" data-tone="complete" aria-hidden="true"');
    expect(out).toContain('shipped before');
    expect(out).toContain('by choice');
  });

  it('gives each tile an accessible name of its count, label and sub-line, and the breakdown a title', () => {
    const out = html();
    expect(out).toContain('aria-label="2 out of scope by choice"');
    expect(out).toContain('title="v1.0 ');
  });

  it('a zero-count tile shows 0 with a quiet square', () => {
    const context = buildProjectContext(lendshed.presentation);
    const tiles = context.tiles!.map((tile) =>
      tile.state === 'pending' ? { ...tile, count: 0, tone: 'quiet' as const } : tile,
    );
    const out = markup(composeProjectPage(inputOf({ ...context, tiles }))!);
    expect(out).toContain('aria-label="0 pending in v1.1"');
    expect(out).toContain('data-tone="quiet" aria-hidden="true"></i>0<');
  });

  it('renders the goal cell first, with its label and the clamped goal text', () => {
    const context = buildProjectContext(lendshed.presentation);
    const out = markup(composeProjectPage(inputOf(context, lendshedStructured()))!);
    expect(out).toContain('data-goal="true" data-tiles="true"');
    expect(out).toContain('<p class="view-project-goal-label">Now building v1.1 Steward Desk</p>');
    expect(out).toContain('view-project-goal-text');
    expect(out).toContain('Lendshed owns its own sign-in');
    expect(out.indexOf('view-project-goal')).toBeLessThan(out.indexOf('view-project-tile'));
  });

  it('with tiles absent the goal cell spans the strip', () => {
    const context = { ...buildProjectContext(lendshed.presentation), tiles: null };
    const out = markup(composeProjectPage(inputOf(context, lendshedStructured()))!);
    expect(out).toContain('data-goal="true" data-tiles="false"');
    expect(out).not.toContain('view-project-tile"');
  });

  it('with no goal the strip is the four tiles alone', () => {
    const out = html();
    expect(out).toContain('data-goal="false" data-tiles="true"');
    expect(out).not.toContain('view-project-goal');
  });

  it('omits the strip when there are no tiles', () => {
    const context = buildProjectContext(lendshed.presentation);
    const out = markup(composeProjectPage(inputOf({ ...context, tiles: null }))!);
    expect(out).not.toContain('view-project-strip');
  });
});

describe('composeProjectPage margin', () => {
  it('Lendshed: three constraints, two exclusions, the last-updated line and the dashboard url', () => {
    const context = buildProjectContext(lendshed.presentation);
    const page = composeProjectPage(inputOf(context, lendshedStructured()))!;
    expect(page.margin).not.toBeNull();
    expect(page.margin!.constraints.map((c) => c.name)).toEqual(['Tech stack', 'Security', 'Hardware']);
    expect(page.margin!.outOfScope.map((c) => c.name)).toEqual(['Payments and deposits', 'Mobile app']);
    expect(page.margin!.lastUpdated).toBe('2026-04-09 after Phase 3 — Account Admin & Sessions');
    expect(page.margin!.dashboardUrl).toBe('/');
  });

  it('is null when both lists are empty and lastUpdated is null', () => {
    const context = buildProjectContext(lendshed.presentation);
    const structured = { project: { milestone: null, constraints: [], outOfScope: [], lastUpdated: null } };
    expect(composeProjectPage(inputOf(context, structured))!.margin).toBeNull();
    expect(composeProjectPage(inputOf(context))!.margin).toBeNull();
  });

  it('a last-updated line alone still makes a margin', () => {
    const context = buildProjectContext(lendshed.presentation);
    const page = composeProjectPage(inputOf(context, { project: { constraints: [], outOfScope: [], lastUpdated: '2026-01-01' } }))!;
    expect(page.margin).toEqual({ constraints: [], outOfScope: [], lastUpdated: '2026-01-01', dashboardUrl: '/' });
  });

  it('drops malformed entries, keeps a nameless one with its text', () => {
    const context = buildProjectContext(lendshed.presentation);
    const project = { constraints: [null, 4, { name: 1, text: 2 }, { name: '', text: 'Kept' }, { name: 'N', text: 'T' }] };
    const page = composeProjectPage(inputOf(context, { project }))!;
    expect(page.margin!.constraints).toEqual([
      { name: '', text: 'Kept' },
      { name: 'N', text: 'T' },
    ]);
  });

  it('a PROJECT.md whose only recognised content is structured.project still composes', () => {
    const nameOnly: ProjectContext = { name: 'Bare', tagline: null, lead: null, coreValue: null, counts: null, tiles: null, dashboardUrl: '/' };
    const page = composeProjectPage(inputOf(nameOnly, { project: { outOfScope: [{ name: 'X', text: 'y' }] } }));
    expect(page).not.toBeNull();
    expect(page!.strip).toBeNull();
    expect(page!.margin!.outOfScope).toEqual([{ name: 'X', text: 'y' }]);
  });
});

describe('ProjectPageView margin', () => {
  const page = (): ComposedProjectPage => composeProjectPage(inputOf(buildProjectContext(lendshed.presentation), lendshedStructured()))!;

  it('lists "Bound by · 3" and "Will not do · 2" with names in dt and text in dd', () => {
    const out = markup(page());
    expect(out).toContain('>Bound by · 3</h2>');
    expect(out).toContain('>Will not do · 2</h2>');
    expect(out).toContain('<dt class="view-project-rule-name"><span>Tech stack</span></dt>');
    expect(out).toContain('view-project-rule-text');
    expect(out).toContain('data-refused="true"');
  });

  it('renders one aria-pressed toggle, closed by default, and the footer', () => {
    const out = markup(page());
    expect(out).toContain('aria-pressed="false"');
    expect(out).toContain('>Read in full<');
    expect(out).toContain('data-full="false"');
    expect(out).toContain('Last updated 2026-04-09 after Phase 3');
    expect(out).toContain('href="/"');
    expect(out).toContain('Where the work is now');
  });

  it('puts the margin after the masthead, in the body', () => {
    const out = markup(page());
    expect(out.indexOf('view-project-masthead')).toBeLessThan(out.indexOf('view-project-body'));
    expect(out.indexOf('view-project-body')).toBeLessThan(out.indexOf('view-project-margin"'));
  });

  it('omits the body and the margin when there is nothing to show', () => {
    const out = markup(composeProjectPage(inputOf(buildProjectContext(lendshed.presentation)))!);
    expect(out).not.toContain('view-project-body');
    expect(out).not.toContain('Where the work is now');
  });

  it('renders a nameless constraint as its text alone', () => {
    const context = buildProjectContext(lendshed.presentation);
    const out = markup(composeProjectPage(inputOf(context, { project: { constraints: [{ name: '', text: 'Plain rule' }] } }))!);
    expect(out).toContain('Plain rule');
    expect(out).toContain('>Bound by · 1</h2>');
    expect(out).not.toContain('Will not do');
  });
});

/** `structured` as the real handler produces it for a PROJECT.md given as text. */
function structuredOf(content: string): Record<string, unknown> {
  const ref = { path: '.planning/PROJECT.md', kind: 'project', location: 'root', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0 } as const;
  const parsed = ProjectHandler.parse({ path: ref.path, content, mtimeMs: 0, size: content.length }, ref);
  return JSON.parse(JSON.stringify(parsed.structured)) as Record<string, unknown>;
}

const LABELORE_MD = readFileSync(new URL('../../.planning/PROJECT.md', import.meta.url), 'utf8');

/** The first cell of each Key Decisions data row, by an independent line walk. */
function tableDecisions(markdown: string): string[] {
  const lines = markdown.split('\n');
  const at = lines.findIndex((line) => line.startsWith('## Key Decisions'));
  const out: string[] = [];
  let seen = 0;
  for (let i = at + 1; i < lines.length; i += 1) {
    if (lines[i].startsWith('## ')) break;
    const line = lines[i].trim();
    if (!line.startsWith('|')) continue;
    seen += 1;
    if (seen > 2) out.push(line.split('|')[1].trim());
  }
  return out;
}

function pageOf(markdown: string): ComposedProjectPage {
  const context = buildProjectContext(lendshed.presentation);
  return composeProjectPage(inputOf(context, structuredOf(markdown)))!;
}

function table(...rows: string[]): string {
  return `# P\n\n## Key Decisions\n\n| Decision | Rationale | Outcome |\n|---|---|---|\n${rows.join('\n')}\n`;
}

describe('composeProjectPage decisions', () => {
  it("this repository's PROJECT.md: the rows equal the table rows in order and count (D-04)", () => {
    const expected = tableDecisions(LABELORE_MD);
    const rows = pageOf(LABELORE_MD).decisions!.rows;
    expect(rows).toHaveLength(expected.length);
    expect(rows.length).toBeGreaterThanOrEqual(27);
    rows.forEach((row, index) => {
      // The statement is the table cell minus a trailing tag, so the cell starts with it.
      expect(expected[index].startsWith(row.decision), `${row.n}: ${row.decision}`).toBe(true);
      expect(row.n).toBe(index + 1);
      expect(row.nn).toBe(String(index + 1).padStart(2, '0'));
    });
  });

  it('Lendshed: four rows, a tally that omits zero counts, and no era', () => {
    const decisions = composeProjectPage(inputOf(buildProjectContext(lendshed.presentation), lendshedStructured()))!.decisions!;
    expect(decisions.count).toBe(4);
    expect(decisions.tally.map((t) => [t.label, t.count, t.tone])).toEqual([
      ['good', 3, 'complete'],
      ['pending', 1, 'quiet'],
    ]);
    expect(decisions.eras).toEqual([]);
  });

  it('maps outcomes to tones, and only Revisit, Reversed and Pending carry a chip', () => {
    const rows = pageOf(table('| a | r | ✓ Good |', '| b | r | ⚠️ Revisit — x |', '| c | r | ✗ Reversed — y |', '| d | r | — Pending |', '| e | r | Unsure |')).decisions!.rows;
    expect(rows.map((r) => r.tone)).toEqual(['complete', 'in-flight', 'missing', 'quiet', 'quiet']);
    expect(rows.map((r) => r.chip)).toEqual([false, true, true, true, false]);
  });

  it('an era marker appears only where a v or Phase tag changes; D-NN and quick tags never mark one', () => {
    const decisions = pageOf(
      table(
        '| a (D-01) | r | Good |',
        '| b (v1.0) | r | Good |',
        '| c | r | Good |',
        '| d (v1.0) | r | Good |',
        '| e (Phase 7) | r | Good |',
        '| f (quick 260101-abc) | r | Good |',
        '| g (Phase 7) | r | Good |',
        '| h (v2.0) | r | Good |',
      ),
    ).decisions!;
    expect(decisions.eras).toEqual([
      { at: 1, label: 'v1.0' },
      { at: 4, label: 'Phase 7' },
      { at: 7, label: 'v2.0' },
    ]);
    expect(decisions.rows[0].tag).toBe('D-01');
    expect(decisions.rows[5].tag).toBe('quick 260101-abc');
  });

  it('is null without a Key Decisions table, and the page still shows its masthead and margin', () => {
    const page = composeProjectPage(inputOf(buildProjectContext(lendshed.presentation), { project: { constraints: [{ name: 'A', text: 'b' }], decisions: [] } }))!;
    expect(page.decisions).toBeNull();
    expect(page.margin).not.toBeNull();
    const out = markup(page);
    expect(out).not.toContain('Every decision in order');
    expect(out).not.toContain('>Decisions<');
    expect(out).toContain('view-project-masthead');
    expect(out).toContain('view-project-margin');
  });

  it('a malformed decisions payload degrades to none', () => {
    const page = composeProjectPage(inputOf(buildProjectContext(lendshed.presentation), { project: { decisions: [null, 3, 'x'] } }))!;
    expect(page.decisions).toBeNull();
  });

  it('a row with no outcome cell has a quiet square, no chip and no note', () => {
    const [row] = pageOf(table('| Only the decision |')).decisions!.rows;
    expect(row).toMatchObject({ tone: 'quiet', chip: false, note: '', outcomeLabel: null });
  });
});

describe('ProjectPageView decisions', () => {
  const lendshedPage = (): ComposedProjectPage => composeProjectPage(inputOf(buildProjectContext(lendshed.presentation), lendshedStructured()))!;

  it('renders an ol spine with one li per decision and the Decisions heading with its count', () => {
    const out = markup(lendshedPage());
    expect(out).toContain('<ol class="view-project-spine">');
    expect(out.split('class="view-project-node"').length - 1).toBe(4);
    expect(out).toContain('>Decisions</h2>');
    expect(out).toContain('4, oldest first');
    expect(out).toContain('id="view-project-decision-3"');
  });

  it('each row is a button with aria-expanded, closed to begin with, and the reveal is not rendered', () => {
    const out = markup(lendshedPage());
    expect(out.split('class="view-project-node-btn"').length - 1).toBe(4);
    expect(out).toContain('aria-expanded="false"');
    expect(out).not.toContain('aria-expanded="true"');
    expect(out).not.toContain('How it turned out');
  });

  it('the toggle reads "Show every reason" and is aria-pressed false at first', () => {
    const out = markup(lendshedPage());
    expect(out).toContain('aria-pressed="false">Show every reason<');
  });

  it('the jump strip is a labelled group with one named square button per decision', () => {
    const out = markup(lendshedPage());
    expect(out).toContain('role="group" aria-label="Every decision in order"');
    expect(out.split('class="view-project-jump-sq"').length - 1).toBe(4);
    expect(out).toContain('aria-label="03 v1.1: Lendshed owns sign-in: Pending"');
    expect(out).toContain('aria-label="01 SQLite file over a hosted database: Good"');
  });

  it('shows the tally as "{n} good" and "{n} pending" with no zero entries', () => {
    const out = markup(lendshedPage());
    expect(out).toContain('3 good');
    expect(out).toContain('1 pending');
    expect(out).not.toContain('revisit<');
    expect(out).not.toContain('0 reversed');
  });

  it('Good has no outcome chip; Pending has one; a Good note shows under the row', () => {
    const out = markup(lendshedPage());
    expect(out).toContain('<span class="status-chip" data-tone="quiet">Pending</span>');
    expect(out).not.toContain('>Good</span>');
    expect(out).toContain('view-project-node-note');
    expect(out).toContain('for v1.0 — superseded in v1.1');
  });

  it('draws the tag as a quiet chip and the era marker as an aria-hidden tick and label', () => {
    const out = markup(pageOf(table('| a (v1.0) | r | Good |', '| b (v1.0) | r | Good |', '| c (v2.0) | r | Good |')));
    expect(out).toContain('<span class="status-chip" data-tone="quiet">v1.0</span>');
    expect(out.split('class="view-project-era"').length - 1).toBe(2);
    expect(out).toContain('<li class="view-project-era" aria-hidden="true"><span class="view-project-era-tick"></span><span class="view-project-era-label">v1.0</span></li>');
  });

  it('puts the spine in the main column, before the margin', () => {
    const out = markup(composeProjectPage(inputOf(buildProjectContext(lendshed.presentation), lendshedStructured()))!);
    expect(out.indexOf('view-project-main')).toBeLessThan(out.indexOf('view-project-spine'));
    expect(out.indexOf('view-project-spine')).toBeLessThan(out.indexOf('view-project-margin"'));
    expect(out).toContain('data-margin="true"');
  });

  it('with decisions and no margin the body is a single column', () => {
    const out = markup(pageOf(table('| a | r | Good |')));
    expect(out).toContain('data-margin="false"');
    expect(out).toContain('view-project-spine');
  });

  it('renders every row of a 60-decision table with no pagination', () => {
    const rows = Array.from({ length: 60 }, (_, i) => `| d${i + 1} | r | Good |`);
    const out = markup(pageOf(table(...rows)));
    expect(out.split('class="view-project-node"').length - 1).toBe(60);
    expect(out.split('class="view-project-jump-sq"').length - 1).toBe(60);
  });

  it('author text stays text: markup in a decision is escaped', () => {
    const out = markup(pageOf(table('| <img src=x onerror=alert(1)> | <b>r</b> | Good — <script>x</script> |')));
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<script');
    expect(out).toContain('&lt;img');
  });
});
