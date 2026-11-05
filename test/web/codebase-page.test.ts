// VIEW-13 (10-08): the Codebase page composer and its source-text contract. composeCodebase is pure: it merges the
// server's codebaseContext with the opened document's structured.codebase and section groups, so every case below
// builds a ViewInput over the committed Tidemark (complete) and Shapes (three of seven) maps through the real
// repository, with the section groups cut from the file's own `##` headings the way the page's splitter would.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildCodebaseContext } from '../../src/presentation/codebase-map.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';
import {
  MAPPED_NOT_STARTED,
  MAPPED_NOT_STARTED_LEAD,
  NOT_MAPPED,
  composeCodebase,
  linkMapMentions,
} from '../../src/web/views/codebase-page.ts';
import { CodebaseView } from '../../src/web/views/codebase-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { loadProject } from '../helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from '../helpers/growth.ts';
import { SHAPES_ROOT } from '../helpers/shapes-project.ts';

const TIDEMARK_ROOT = fileURLToPath(new URL('../fixtures/tidemark', import.meta.url)).replace(/[\\/]$/, '');
const KINDS = new Map([
  ['STACK', 'codebase-stack'],
  ['ARCHITECTURE', 'codebase-architecture'],
  ['STRUCTURE', 'codebase-structure'],
  ['CONCERNS', 'codebase-concerns'],
  ['CONVENTIONS', 'codebase-conventions'],
]);

/** The file's sections the way splitRenderedDocument cuts them: one group per `##`, the heading kept in the html. */
function groupsOf(markdown: string): DocumentSectionGroup[] {
  const body = markdown.replace(/^---\n[\s\S]*?\n---\n/, '');
  const groups: DocumentSectionGroup[] = [];
  let lead = '';
  // Cut at every `## ` line outside a fence (a diagram's `## label` line is not a heading).
  const chunks: string[] = [];
  let fenced = false;
  let current = '';
  for (const line of body.split('\n')) {
    if (line.startsWith('```')) fenced = !fenced;
    if (!fenced && line.startsWith('## ') && current !== '') {
      chunks.push(current);
      current = '';
    }
    current += `${line}\n`;
  }
  chunks.push(current);
  for (const chunk of chunks) {
    if (chunk.startsWith('## ')) {
      const heading = chunk.slice(3, chunk.indexOf('\n')).trim();
      groups.push({ id: heading.toLowerCase().replace(/[^a-z0-9]+/g, '-'), heading, html: `<h2>${heading}</h2><p>${heading} text</p>` });
    } else {
      lead += chunk;
    }
  }
  if (lead.replace(/^# .*$/m, '').trim() !== '') groups.unshift({ id: null, heading: null, html: '<p>lead</p>' });
  return groups;
}

async function inputFor(root: string, doc: string, folder = 'codebase'): Promise<ViewInput> {
  const { presentation } = await loadProject(root);
  const path = `.planning/${folder}/${doc}.md`;
  const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
  if (!artifact) throw new Error(`fixture lacks ${path}`);
  const markdown = await readFile(join(root, path), 'utf8');
  return {
    kind: KINDS.get(doc) ?? `codebase-${doc.toLowerCase()}`,
    frontmatter: artifact.frontmatter,
    structured: artifact.structured,
    groups: groupsOf(markdown),
    planSegments: [],
    codebaseContext: buildCodebaseContext(presentation, path),
  };
}

describe('composeCodebase - the facts line', () => {
  it("says how many documents are mapped, the readiness chip, the newest date and the newest document's commit", async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'STACK'));
    expect(model?.facts.countText).toBe('7 of 7 documents mapped');
    expect(model?.facts.readiness).toEqual({ key: 'complete', label: 'Complete map', tone: 'complete', title: null });
    expect(model?.facts.mappedText).toBe('Mapped Oct 30, 2026');
    expect(model?.facts.commitText).toMatch(/^Commit [0-9a-f]{7}$/);
  });

  it('words a partial map without a readiness claim and gives the UI-SPEC tooltip verbatim', async () => {
    const model = composeCodebase(await inputFor(SHAPES_ROOT, 'STACK'));
    expect(model?.facts.countText).toBe('3 of 7 documents mapped');
    expect(model?.facts.readiness.label).toBe('Partial map');
    expect(model?.facts.readiness.tone).toBe('in-flight');
    expect(model?.facts.readiness.title).toBe('Some of the four core documents are missing; the map is not complete.');
  });

  it('words a fast map with its tooltip, and omits a missing date or commit silently', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const fast = composeCodebase({
      ...input,
      codebaseContext: input.codebaseContext
        ? { ...input.codebaseContext, mappedCount: 4, readiness: 'fast', mappedAt: null, commit: null }
        : null,
    });
    expect(fast?.facts.countText).toBe('4 of 7 documents mapped');
    expect(fast?.facts.readiness).toEqual({
      key: 'fast',
      label: 'Fast map',
      tone: 'in-flight',
      title: 'A fast map covers stack, integrations, architecture and structure; project setup needs the complete one.',
    });
    expect(fast?.facts.mappedText).toBeNull();
    expect(fast?.facts.commitText).toBeNull();
  });
});

describe('composeCodebase - the panel list', () => {
  it('words a missing document "Not mapped"', () => {
    expect(NOT_MAPPED).toBe('Not mapped');
  });

  it('holds seven entries in the fixed order, each numbered, the active one current', async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE'));
    expect(model?.panels.map((panel) => panel.label)).toEqual([
      'Stack',
      'Architecture',
      'Structure',
      'Conventions',
      'Testing',
      'Integrations',
      'Concerns',
    ]);
    expect(model?.panels.map((panel) => panel.no)).toEqual(['01', '02', '03', '04', '05', '06', '07']);
    expect(model?.panels.filter((panel) => panel.current).map((panel) => panel.key)).toEqual(['architecture']);
    expect(model?.panels.every((panel) => !panel.ghost && panel.url !== null)).toBe(true);
  });

  it("shows a document the folder lacks as a ghost with no address: Shapes' single mapped panel set and four ghosts", async () => {
    const model = composeCodebase(await inputFor(SHAPES_ROOT, 'STACK'));
    expect(model?.panels.filter((panel) => !panel.ghost).map((panel) => panel.key)).toEqual([
      'stack',
      'architecture',
      'conventions',
    ]);
    const ghosts = model?.panels.filter((panel) => panel.ghost) ?? [];
    expect(ghosts.map((panel) => panel.key)).toEqual(['structure', 'testing', 'integrations', 'concerns']);
    for (const ghost of ghosts) {
      expect(ghost.url).toBeNull();
      expect(ghost.keyText).toBeNull();
    }
  });

  it('carries the key number as text where the lift set one, and none where it did not', async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'STACK'));
    expect(model?.panels.find((panel) => panel.key === 'stack')?.keyText).toBe('9');
    expect(model?.panels.find((panel) => panel.key === 'concerns')?.keyText).toBe('14');
    expect(model?.panels.find((panel) => panel.key === 'testing')?.keyText).toBeNull();
  });

  it("names the active panel's key number with a singular or plural noun", async () => {
    const concerns = composeCodebase(await inputFor(TIDEMARK_ROOT, 'CONCERNS'));
    expect(concerns?.active.keyPhrase).toBe('14 concerns');
    const input = await inputFor(TIDEMARK_ROOT, 'CONCERNS');
    const one = composeCodebase({
      ...input,
      codebaseContext: input.codebaseContext
        ? {
            ...input.codebaseContext,
            panels: input.codebaseContext.panels.map((panel) =>
              panel.key === 'concerns' ? { ...panel, keyNumber: 1 } : panel,
            ),
          }
        : null,
    });
    expect(one?.active.keyPhrase).toBe('1 concern');
  });
});

describe('composeCodebase - the lifted part', () => {
  it('lifts the Stack chips in the sketch groups: Languages, Runtime, Frameworks, then Key Dependencies', async () => {
    const lifted = composeCodebase(await inputFor(TIDEMARK_ROOT, 'STACK'))?.active.lifted;
    expect(lifted?.kind).toBe('stack');
    if (lifted?.kind !== 'stack') return;
    expect(lifted.groups.map((group) => group.label)).toEqual(['Languages', 'Runtime', 'Frameworks', 'Key Dependencies']);
    const languages = lifted.groups[0];
    expect(languages.sets.map((set) => set.label)).toEqual(['Primary', 'Secondary']);
    expect(languages.sets[0].chips).toEqual([{ name: 'TypeScript', version: '5.6' }]);
    expect(languages.sets[1].chips.map((chip) => chip.name)).toEqual(['SQL', 'Shell']);
    expect(lifted.groups[2].sets.map((set) => set.label)).toEqual(['Core', 'Testing', 'Build and dev']);
  });

  it('lifts the Key Dependencies as chip sets in the same chip set, Critical and Infrastructure, with the purpose as the title (10-14)', async () => {
    const lifted = composeCodebase(await inputFor(TIDEMARK_ROOT, 'STACK'))?.active.lifted;
    if (lifted?.kind !== 'stack') throw new Error('expected the stack panel');
    expect(lifted.groups.map((group) => group.label)).toEqual(['Languages', 'Runtime', 'Frameworks', 'Key Dependencies']);
    const dependencies = lifted.groups[3];
    expect(dependencies.sets.map((set) => set.label)).toEqual(['Critical', 'Infrastructure']);
    expect(dependencies.sets[0].chips[0]).toEqual({
      name: 'better-sqlite3',
      version: '11',
      purpose: 'the berth and booking store, opened once per process',
      xref: ['Databases'],
    });
    expect(lifted.toolCount).toBe(9);
    expect(lifted.dependencyCount).toBe(4);
  });

  it('draws the Not present names as dashed ghost chips after the dependency sets, and counts none of them as dependencies', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const codebase = input.structured.codebase as { stack: Record<string, unknown> };
    const lifted = composeCodebase({
      ...input,
      structured: { ...input.structured, codebase: { ...codebase, stack: { ...codebase.stack, notPresent: ['ORM', 'queue'] } } },
    })?.active.lifted;
    if (lifted?.kind !== 'stack') throw new Error('expected the stack panel');
    const sets = lifted.groups[3].sets;
    expect(sets[sets.length - 1]).toEqual({ label: 'Not present', chips: [{ name: 'ORM', version: null }, { name: 'queue', version: null }], ghost: true });
    expect(lifted.dependencyCount).toBe(4);
  });

  it('lists all 30 dependencies of a stack that has 30', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const codebase = input.structured.codebase as { stack: Record<string, unknown> };
    const deps = Array.from({ length: 30 }, (_, i) => ({ name: `pkg-${i}`, version: `${i}.0`, purpose: null }));
    const lifted = composeCodebase({
      ...input,
      structured: { ...input.structured, codebase: { ...codebase, stack: { ...codebase.stack, keyDependencies: [{ label: 'Critical', deps }] } } },
    })?.active.lifted;
    if (lifted?.kind !== 'stack') throw new Error('expected the stack panel');
    expect(lifted.groups[3].sets[0].chips).toHaveLength(30);
    expect(lifted.dependencyCount).toBe(30);
  });

  it('keeps a long lifted sentence out of the chips, counted as a note, and recovers a name and version from "Node.js >=22 (...)"', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const codebase = input.structured.codebase as { stack: Record<string, unknown> };
    const stack = {
      ...codebase.stack,
      languages: [
        { name: 'TypeScript', version: '5.9.3', group: 'primary' },
        { name: 'Module system: ESM only (type is module in package.json) with nodenext resolution', version: null, group: 'primary' },
      ],
      runtime: [{ name: 'Node.js >=22.18.0 (engines in package.json)', version: null, group: 'runtime' }],
    };
    const lifted = composeCodebase({ ...input, structured: { ...input.structured, codebase: { ...codebase, stack } } })?.active.lifted;
    if (lifted?.kind !== 'stack') throw new Error('expected the stack panel');
    expect(lifted.groups[0].sets[0].chips).toEqual([{ name: 'TypeScript', version: '5.9.3' }]);
    expect(lifted.groups[0].sets[0].notes).toBe(1);
    expect(lifted.groups[1].sets[0].chips).toEqual([{ name: 'Node.js', version: '>=22.18.0' }]);
  });

  it('lifts the Concerns counts: the total, Security first, a zero as a dashed quiet row', async () => {
    const lifted = composeCodebase(await inputFor(TIDEMARK_ROOT, 'CONCERNS'))?.active.lifted;
    expect(lifted?.kind).toBe('concerns');
    if (lifted?.kind !== 'concerns') return;
    expect(lifted.totalText).toBe('14 concerns');
    expect(lifted.counts[0]).toEqual({ label: 'Security Considerations', count: 2, tone: 'in-flight' });
    expect(lifted.counts.map((row) => row.count)).toEqual([2, 3, 1, 2, 3, 2, 0, 1, 0]);
    expect(lifted.counts.find((row) => row.count === 0)?.tone).toBe('quiet');
    expect(lifted.counts.find((row) => row.label === 'Tech Debt')?.tone).toBeNull();
  });

  it('shows a known concern section the document lacks as a 0 row, and a one-concern total in the singular', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'CONCERNS');
    const codebase = input.structured.codebase as { concerns: { sections: unknown[]; total: number; missing: string[] } };
    const trimmed = {
      ...input,
      structured: {
        ...input.structured,
        codebase: {
          ...codebase,
          concerns: {
            sections: [{ key: 'tech-debt', heading: 'Tech Debt', count: 1 }],
            total: 1,
            missing: ['security-considerations'],
          },
        },
      },
    };
    const lifted = composeCodebase(trimmed)?.active.lifted;
    expect(lifted?.kind === 'concerns' ? lifted.totalText : null).toBe('1 concern');
    expect(lifted?.kind === 'concerns' ? lifted.counts[0] : null).toEqual({
      label: 'Security Considerations',
      count: 0,
      tone: 'quiet',
    });
  });

  it('lifts nothing for a panel with no designed form yet', async () => {
    expect(composeCodebase(await inputFor(TIDEMARK_ROOT, 'CONVENTIONS'))?.active.lifted).toBeNull();
  });
});

const PLANTED = 'PLACEHOLDER-NOT-A-REAL-KEY';

function renderPage(model: NonNullable<ReturnType<typeof composeCodebase>>): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(CodebaseView, { model, renderHtml: (html: string) => createElement('div', null, html) })),
  );
}

describe('composeCodebase - the Integrations panel (10-14, sketch 045 C)', () => {
  it('builds a graph of the app wired to one node per group in use, each in the lane its section names', async () => {
    const lifted = composeCodebase(await inputFor(TIDEMARK_ROOT, 'INTEGRATIONS'))?.active.lifted;
    if (lifted?.kind !== 'integrations') throw new Error('expected the integrations panel');
    expect(lifted.inUse).toBe(5);
    const graph = lifted.graph!;
    expect(graph.nodes.map((n) => [n.label.main, n.kind])).toEqual([
      ['This app', 'service'],
      ['Tide data', 'external'],
      ['Messaging', 'external'],
      ['Databases', 'data'],
      ['File Storage', 'data'],
      ['Outgoing', 'channel'],
    ]);
    expect(graph.edges.map((e) => [e.from, e.to, e.label])).toEqual([
      [0, 1, 'fetch'],
      [0, 2, 'nodemailer'],
      [0, 3, ''],
      [0, 4, ''],
      [0, 5, ''],
    ]);
    expect(graph.thin).toBe(false);
  });

  it('keeps the groups that say None as quiet chips, and each known section the document lacks as "not in this document"', async () => {
    const lifted = composeCodebase(await inputFor(TIDEMARK_ROOT, 'INTEGRATIONS'))?.active.lifted;
    if (lifted?.kind !== 'integrations') throw new Error('expected the integrations panel');
    expect(lifted.quiet.map((q) => q.label)).toEqual([
      'Data storage · Caching',
      'Webhooks · Incoming',
      'Authentication · not in this document',
      'Monitoring · not in this document',
      'CI/CD · not in this document',
    ]);
    expect(lifted.quiet[0].title).toBe('None');
  });

  it('lists the variable names with the value flag, and draws the Environment Configuration section itself', async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'INTEGRATIONS'));
    const lifted = model?.active.lifted;
    if (lifted?.kind !== 'integrations') throw new Error('expected the integrations panel');
    expect(lifted.variables.map((v) => [v.name, v.hadValue])).toEqual([
      ['TIDEMARK_TIDE_FEED_KEY', true],
      ['TIDEMARK_MAIL_TOKEN', false],
      ['TIDEMARK_DB_PATH', false],
    ]);
    expect(lifted.environment?.groups).toEqual([
      { label: 'Secrets location', lines: ['A `.env` file on the harbour office machine, outside the repository'] },
    ]);
    expect(model?.active.plainSections).not.toContain('Environment Configuration');
    expect(model?.active.plainSections).toContain('Webhooks & Callbacks');
  });

  it('renders "Value not shown" beside the name and the planted value nowhere: not in the text, a title or an attribute', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'INTEGRATIONS');
    const model = composeCodebase(input)!;
    const html = renderPage(model);
    expect(html).toContain('TIDEMARK_TIDE_FEED_KEY');
    expect(html).toContain('Value not shown');
    expect(html).not.toContain(PLANTED);
    expect(JSON.stringify(model)).not.toContain(PLANTED);
    expect(JSON.stringify(input.structured.codebase)).not.toContain(PLANTED);
  });

  it('renders the lifted rows alone free of the value too, when the plain sections are left out', async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'INTEGRATIONS'))!;
    const html = renderPage({ ...model, active: { ...model.active, plain: [], plainSections: [] } });
    expect(html).toContain('Value not shown');
    expect(html).not.toContain(PLANTED);
    expect(html).not.toMatch(/(title|aria-label|data-[a-z-]+)="[^"]*PLACEHOLDER/);
  });

  it('shows the Environment section plain, as written, when it holds a fence the panel cannot draw', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'INTEGRATIONS');
    const codebase = input.structured.codebase as { integrations: { environment: Record<string, unknown> } };
    const model = composeCodebase({
      ...input,
      structured: {
        ...input.structured,
        codebase: { ...codebase, integrations: { ...codebase.integrations, environment: { ...codebase.integrations.environment, whole: false } } },
      },
    });
    expect(model?.active.plainSections).toContain('Environment Configuration');
    expect(model?.active.lifted?.kind === 'integrations' ? model.active.lifted.environment : 'x').toBeNull();
  });

  it('gives no graph, and no lifted panel, for a document with nothing in it', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'INTEGRATIONS');
    const emptied = composeCodebase({
      ...input,
      structured: { ...input.structured, codebase: { doc: 'integrations', integrations: { groups: [], variables: [], environment: null, missing: [], services: 0 } } },
    });
    expect(emptied?.active.lifted).toBeNull();
  });

  it('keeps the Stack and Integrations cross-read to names both documents hold: better-sqlite3', async () => {
    const stack = composeCodebase(await inputFor(TIDEMARK_ROOT, 'STACK'))?.active.lifted;
    if (stack?.kind !== 'stack') throw new Error('expected the stack panel');
    const crossed = stack.groups.flatMap((g) => g.sets.flatMap((s) => s.chips.filter((c) => c.xref !== undefined)));
    expect(crossed.map((c) => [c.name, c.xref])).toEqual([['better-sqlite3', ['Databases']]]);
    expect(stack.integrationsUrl).toMatch(/integrations/i);
    const integrations = composeCodebase(await inputFor(TIDEMARK_ROOT, 'INTEGRATIONS'))?.active.lifted;
    if (integrations?.kind !== 'integrations') throw new Error('expected the integrations panel');
    expect(integrations.alsoInStack).toEqual([{ group: 'Databases', names: ['better-sqlite3'] }]);
    expect(integrations.stackUrl).toMatch(/stack/i);
  });

  it('adds no cross-read link when the other document is not mapped', async () => {
    const stack = composeCodebase(await inputFor(SHAPES_ROOT, 'STACK'))?.active.lifted;
    if (stack?.kind !== 'stack') return;
    expect(stack.integrationsUrl).toBeNull();
    expect(stack.groups.every((g) => g.sets.every((s) => s.chips.every((c) => c.xref === undefined)))).toBe(true);
  });

  it('draws a lane diagram, the quiet chips and the name tags in the markup, linking only through the in-app Link', async () => {
    const html = renderPage(composeCodebase(await inputFor(TIDEMARK_ROOT, 'INTEGRATIONS'))!);
    expect(html).toContain('lane-diagram');
    expect(html).toContain('Not used');
    expect(html).toContain('Also in Stack');
    expect(html).not.toContain('Environment Configuration</h3>');
  });
});

describe('composeCodebase - the Architecture panel (10-12)', () => {
  it('lifts the Tidemark diagram for the shipped figure and the two anti-patterns as swap rows', async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE'));
    const lifted = model?.active.lifted;
    expect(lifted?.kind).toBe('architecture');
    if (lifted?.kind !== 'architecture') return;
    expect(lifted.diagram?.info).toBe('text');
    expect(lifted.diagram?.text).toContain('Berth board (browser)');
    expect(lifted.diagram?.text.split('\n').pop()).toBe('## the three route groups above share one process');
    expect(lifted.swaps).toHaveLength(2);
    expect(lifted.swaps[0]).toEqual({
      bad: 'Reading the database from a route',
      good: 'Ask the slot store for the clash check (`server/store/clash.ts`).',
      details: [
        { label: 'What happens', text: 'The office confirm route opens the database file directly to check a clash.' },
        { label: "Why it's wrong", text: 'Two modules now know the table layout, and the clash rule exists twice.' },
      ],
    });
    expect(model?.active.keyPhrase).toBe('5 components');
  });

  it('keeps every other section plain, API Architecture among them, and drops only the two it draws', async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE'));
    const headings = model?.active.plainSections ?? [];
    expect(headings).not.toContain('System Overview');
    expect(headings).not.toContain('Anti-Patterns');
    expect(headings).toEqual([
      'Component Responsibilities',
      'Pattern Overview',
      'API Architecture',
      'Data Flow',
      'Key Abstractions',
      'Entry Points',
      'Error Handling',
    ]);
  });

  it('leaves a System Overview that holds prose with its fence among the plain sections, drawn once', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE');
    const codebase = input.structured.codebase as { architecture: Record<string, unknown> };
    const model = composeCodebase({
      ...input,
      structured: { codebase: { ...codebase, architecture: { ...codebase.architecture, diagram: null } } },
    });
    expect(model?.active.plainSections).toContain('System Overview');
    expect(model?.active.lifted?.kind === 'architecture' ? model.active.lifted.diagram : 'x').toBeNull();
  });

  it('pairs the drawn sections to their groups by position, then by heading when the counts differ', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE');
    const renamed = input.groups.map((group) =>
      group.heading === 'Anti-Patterns' ? { ...group, heading: 'Anti patterns (renderer text)' } : group,
    );
    expect(composeCodebase({ ...input, groups: renamed })?.active.plainSections).not.toContain('Anti patterns (renderer text)');
    const extra = [{ id: 'x', heading: 'Added later', html: '<h2>Added later</h2><p>x</p>' }, ...renamed];
    const byHeading = composeCodebase({ ...input, groups: extra })?.active.plainSections ?? [];
    expect(byHeading).toContain('Anti patterns (renderer text)');
    expect(byHeading).not.toContain('System Overview');
  });

  it('counts layers in words when the lift counted layers', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE');
    const codebase = input.structured.codebase as Record<string, unknown>;
    const withLayers = (count: number) =>
      composeCodebase({
        ...input,
        structured: { codebase: { ...codebase, keyUnit: 'layer' } },
        codebaseContext: input.codebaseContext
          ? {
              ...input.codebaseContext,
              panels: input.codebaseContext.panels.map((panel) =>
                panel.key === 'architecture' ? { ...panel, keyNumber: count } : panel,
              ),
            }
          : null,
      })?.active.keyPhrase;
    expect(withLayers(3)).toBe('3 layers');
    expect(withLayers(1)).toBe('1 layer');
  });

  it('tolerates a lift of any shape', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE');
    for (const architecture of [null, 7, 'x', { diagram: 4, antiPatterns: 'no' }, { diagram: { text: 3 }, antiPatterns: [null, { name: 4 }] }]) {
      const model = composeCodebase({ ...input, structured: { codebase: { doc: 'architecture', architecture } } });
      expect(model?.active.lifted ?? null).toBeNull();
    }
  });
});

describe('composeCodebase - the Structure panel (10-12)', () => {
  it('lifts the Tidemark tree for the shipped clean tree and counts directories', async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'STRUCTURE'));
    const lifted = model?.active.lifted;
    expect(lifted?.kind).toBe('structure');
    if (lifted?.kind !== 'structure') return;
    expect(lifted.tree?.text.split('\n')[0]).toBe('tidemark/');
    expect(model?.active.keyPhrase).toBe('11 directories');
  });

  it('draws only the Directory Layout and keeps every other section plain, Where to Add New Code included', async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'STRUCTURE'));
    expect(model?.active.plainSections).toEqual([
      'Directory Purposes',
      'Key File Locations',
      'Naming Conventions',
      'Where to Add New Code',
      'Special Directories',
    ]);
  });

  it('lifts nothing when the document has no tree to draw', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STRUCTURE');
    const model = composeCodebase({
      ...input,
      structured: { codebase: { doc: 'structure', sections: [], structure: { tree: null, directories: 0 } } },
    });
    expect(model?.active.lifted).toBeNull();
    expect(model?.active.plainSections).toContain('Directory Layout');
  });
});

describe('linkMapMentions - cross-links between map panels (10-12)', () => {
  const urls = new Map([
    ['STRUCTURE.md', '/p/codebase/structure'],
    ['ARCHITECTURE.md', '/p/codebase/architecture'],
  ]);

  it('links a see-STRUCTURE.md mention to the mapped panel and leaves the rest as text', () => {
    expect(linkMapMentions('Layout: see STRUCTURE.md for folders.', urls)).toEqual([
      { text: 'Layout: see ', to: null },
      { text: 'STRUCTURE.md', to: '/p/codebase/structure' },
      { text: ' for folders.', to: null },
    ]);
  });

  it('links a .planning/codebase path whole', () => {
    expect(linkMapMentions('in .planning/codebase/ARCHITECTURE.md.', urls)).toEqual([
      { text: 'in ', to: null },
      { text: '.planning/codebase/ARCHITECTURE.md', to: '/p/codebase/architecture' },
      { text: '.', to: null },
    ]);
  });

  it('takes the backticks around a mention into the link, shown as code', () => {
    expect(linkMapMentions('see `STRUCTURE.md`.', urls)).toEqual([
      { text: 'see ', to: null },
      { text: 'STRUCTURE.md', to: '/p/codebase/structure', code: true },
      { text: '.', to: null },
    ]);
  });

  it('stays text when the target is not mapped, for any of the seven names', () => {
    expect(linkMapMentions('see TESTING.md and CONCERNS.md', urls)).toEqual([{ text: 'see TESTING.md and CONCERNS.md', to: null }]);
    expect(linkMapMentions('see STRUCTURE.md', new Map())).toEqual([{ text: 'see STRUCTURE.md', to: null }]);
  });

  it('matches the seven exact names only, on a word edge, and builds no href from the text', () => {
    expect(linkMapMentions('MYSTRUCTURE.md structure.md STRUCTURE.mdx ../STRUCTURE.md', urls).every((part) => part.to === null)).toBe(true);
    const parts = linkMapMentions('STRUCTURE.md STRUCTURE.md', urls);
    expect(parts.filter((part) => part.to !== null)).toHaveLength(2);
    for (const part of parts) expect(part.to === null || [...urls.values()].includes(part.to)).toBe(true);
    expect(linkMapMentions('', urls)).toEqual([]);
  });
});

describe('composeCodebase - the Concerns panel (10-12, sketch 044 E)', () => {
  async function concernsOf(input?: ViewInput) {
    const model = composeCodebase(input ?? (await inputFor(TIDEMARK_ROOT, 'CONCERNS')));
    const lifted = model?.active.lifted;
    if (lifted?.kind !== 'concerns') throw new Error('not a concerns lift');
    return { model, lifted };
  }

  it('leads with 14 concerns and Security first, with its 2, then the others in document order', async () => {
    const { lifted } = await concernsOf();
    expect(lifted.totalText).toBe('14 concerns');
    expect(lifted.sections.map((entry) => [entry.heading, entry.count])).toEqual([
      ['Security Considerations', 2],
      ['Tech Debt', 3],
      ['Known Bugs', 1],
      ['Performance Bottlenecks', 2],
      ['Fragile Areas', 3],
      ['Scaling Limits', 2],
      ['Dependencies at Risk', 0],
      ['Missing Critical Features', 1],
      ['Test Coverage Gaps', 0],
    ]);
    expect(lifted.sections[0].label).toBe('Security');
    expect(lifted.sections[1].label).toBe('Tech debt');
  });

  it('tones Security in-flight above zero, a zero quiet (Security complete), and leaves the rest untoned', async () => {
    const { lifted } = await concernsOf();
    expect(lifted.sections.map((entry) => entry.tone)).toEqual([
      'in-flight',
      null,
      null,
      null,
      null,
      null,
      'quiet',
      null,
      'quiet',
    ]);
    for (const entry of lifted.sections) expect([null, 'in-flight', 'complete', 'quiet']).toContain(entry.tone);
    const input = await inputFor(TIDEMARK_ROOT, 'CONCERNS');
    const codebase = input.structured.codebase as { concerns: { sections: { key: string; items: unknown[]; count: number }[] } };
    const empty = {
      ...input,
      structured: {
        codebase: {
          ...codebase,
          concerns: {
            ...codebase.concerns,
            sections: codebase.concerns.sections.map((entry) =>
              entry.key === 'security-considerations' ? { ...entry, count: 0, items: [] } : entry,
            ),
          },
        },
      },
    };
    expect((await concernsOf(empty)).lifted.sections[0].tone).toBe('complete');
  });

  it('keeps each concern as a title over its field lines, with the Priority a mark reads', async () => {
    const { lifted } = await concernsOf();
    const security = lifted.sections[0];
    expect(security.items).toHaveLength(2);
    expect(security.items[0].id).toBe('0:0');
    expect(security.items[0].title.length).toBeGreaterThan(0);
    expect(security.items[0].fields.length).toBeGreaterThan(0);
    const fragile = lifted.sections.find((entry) => entry.heading === 'Fragile Areas')!;
    expect(fragile.items).toHaveLength(3);
    expect(fragile.items.every((item) => item.fields.length === 0 && item.title.length > 0)).toBe(true);
  });

  it('reads Priority and splits fields from bullet lines and continuations', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'CONCERNS');
    const codebase = input.structured.codebase as { concerns: Record<string, unknown> };
    const one = (lines: string[]) => ({
      ...input,
      structured: {
        codebase: {
          ...codebase,
          concerns: {
            sections: [{ key: 'tech-debt', heading: 'Tech Debt', count: 1, items: [{ label: 'X', lines }] }],
            total: 1,
            missing: [],
          },
        },
      },
    });
    const high = (await concernsOf(one(['- Issue: a thing', '  that goes on', '- Priority: High - soon', '- Files: `a.ts`']))).lifted.sections[0].items[0];
    expect(high.priority).toBe('high');
    expect(high.fields).toEqual([
      { label: 'Issue', text: 'a thing that goes on' },
      { label: 'Priority', text: 'High - soon' },
      { label: 'Files', text: '`a.ts`' },
    ]);
    expect(high.gist).toBe('a thing that goes on');
    expect((await concernsOf(one(['- Priority: Medium']))).lifted.sections[0].items[0].priority).toBe('med');
    expect((await concernsOf(one(['- Priority: low']))).lifted.sections[0].items[0].priority).toBe('low');
    expect((await concernsOf(one(['- Issue: x']))).lifted.sections[0].items[0].priority).toBe('');
  });

  it('lists all 40 items of a section, and says how many it left out when the lift kept fewer than it counted', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'CONCERNS');
    const codebase = input.structured.codebase as { concerns: Record<string, unknown> };
    const items = Array.from({ length: 40 }, (_, i) => ({ label: `Item ${i}`, lines: [`- Issue: thing ${i}`] }));
    const withItems = (count: number) => ({
      ...input,
      structured: {
        codebase: {
          ...codebase,
          concerns: { sections: [{ key: 'tech-debt', heading: 'Tech Debt', count, items }], total: count, missing: [] },
        },
      },
    });
    const forty = (await concernsOf(withItems(40))).lifted.sections[0];
    expect(forty.items).toHaveLength(40);
    expect(forty.omitted).toBe(0);
    expect((await concernsOf(withItems(600))).lifted.sections[0].omitted).toBe(560);
  });

  it('marks the first Security item as the most dangerous, else the first Tech Debt item', async () => {
    const { lifted } = await concernsOf();
    expect(lifted.top).toBe('0:0');
    const input = await inputFor(TIDEMARK_ROOT, 'CONCERNS');
    const codebase = input.structured.codebase as { concerns: { sections: { key: string; items: unknown[]; count: number }[] } };
    const noSecurity = {
      ...input,
      structured: {
        codebase: {
          ...codebase,
          concerns: {
            ...codebase.concerns,
            sections: codebase.concerns.sections.map((entry) =>
              entry.key === 'security-considerations' ? { ...entry, count: 0, items: [] } : entry,
            ),
          },
        },
      },
    };
    const found = await concernsOf(noSecurity);
    expect(found.lifted.top).toBe('1:0');
    expect(found.lifted.sections[1].heading).toBe('Tech Debt');
  });

  it('draws every concerns section itself, keeping a zero section\'s own words and the text before the first heading', async () => {
    const { model, lifted } = await concernsOf();
    expect(model?.active.plainSections).toEqual([]);
    const zero = lifted.sections.find((entry) => entry.heading === 'Dependencies at Risk')!;
    expect(zero.fallbackHtml).toContain('Dependencies at Risk text');
    expect(lifted.sections[0].fallbackHtml).toBeNull();
  });

  it('writes no missing or destructive tone anywhere in the concerns markup', async () => {
    const components = await source(COMPONENTS);
    const concernsPart = components.slice(components.indexOf('function ConcernRow'));
    expect(concernsPart).not.toMatch(/data-tone=\{?["']?(missing|destructive|warning)/);
    expect(concernsPart).toContain('Read more');
    expect(concernsPart).toContain('Read less');
    expect(concernsPart).toContain('aria-expanded');
  });
});

describe('composeCodebase - growth (10-12)', () => {
  it('stays linear on many concern sections of many items', { timeout: 60_000 }, async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'CONCERNS');
    const growth = measureGrowth({
      make: (n) => ({
        ...input,
        structured: {
          codebase: {
            doc: 'concerns',
            concerns: {
              sections: Array.from({ length: n }, (_, i) => ({
                key: null,
                heading: `S${i}`,
                count: 20,
                items: Array.from({ length: 20 }, (_, k) => ({ label: `C${k}`, lines: ['- Issue: a', '- Files: `b`'] })),
              })),
              total: n * 20,
              missing: [],
            },
          },
        },
        groups: Array.from({ length: n }, (_, i) => ({ id: `s${i}`, heading: `S${i}`, html: `<h2>S${i}</h2><p>x</p>` })),
      }),
      run: (value) => void composeCodebase(value),
      maxSize: 400,
      startSize: 5,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});

describe('composeCodebase - plain sections drop nothing', () => {
  it("keeps Tidemark's added API Architecture section among the plain sections, in document order", async () => {
    const model = composeCodebase(await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE'));
    const headings = model?.active.plainSections ?? [];
    expect(headings).toContain('API Architecture');
    expect(headings.indexOf('Pattern Overview')).toBeLessThan(headings.indexOf('API Architecture'));
    expect(headings.indexOf('API Architecture')).toBeLessThan(headings.indexOf('Data Flow'));
    expect(model?.active.plain.map((section) => section.heading).filter((heading) => heading !== null)).toEqual(headings);
  });

  it('shows every section plain when the document has no heading the page knows', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'CONVENTIONS');
    const groups: DocumentSectionGroup[] = [
      { id: 'one', heading: 'Notes on yachts', html: '<h2>Notes on yachts</h2><p>a</p>' },
      { id: 'two', heading: 'Harbour fees', html: '<h2>Harbour fees</h2><p>b</p>' },
    ];
    const model = composeCodebase({ ...input, groups });
    expect(model?.active.plainSections).toEqual(['Notes on yachts', 'Harbour fees']);
    expect(model?.active.plain.map((section) => section.html)).toEqual(groups.map((group) => group.html));
  });

  it('keeps the text before the first heading, without a heading of its own', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const model = composeCodebase({
      ...input,
      groups: [{ id: null, heading: null, html: '<p>lead</p>' }, ...input.groups],
    });
    expect(model?.active.plain[0]).toMatchObject({ heading: null, html: '<p>lead</p>' });
    expect(model?.active.plainSections).not.toContain(null);
  });

  it('leaves out a blank group', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const model = composeCodebase({ ...input, groups: [{ id: 'x', heading: 'Empty', html: '  ' }, ...input.groups] });
    expect(model?.active.plainSections).not.toContain('Empty');
  });
});

describe('composeCodebase - the map-only head (10-10)', () => {
  it('words the head with the two sentences verbatim', () => {
    expect(MAPPED_NOT_STARTED).toBe('Mapped, not started');
    expect(MAPPED_NOT_STARTED_LEAD).toBe('This project has a codebase map and no roadmap yet.');
  });

  it('gives a map-only project the head at every panel, and a project with a roadmap none', async () => {
    for (const doc of ['STACK', 'ARCHITECTURE', 'CONCERNS', 'CONVENTIONS']) {
      const head = composeCodebase(await inputFor(TIDEMARK_ROOT, doc))?.head;
      expect(head?.eyebrow, doc).toBe('Mapped, not started');
      expect(head?.lead, doc).toBe('This project has a codebase map and no roadmap yet.');
    }
    expect(composeCodebase(await inputFor(SHAPES_ROOT, 'STACK'))?.head).toBeNull();
  });

  it('lifts the stack into Languages, Runtime and Frameworks sets with versions, capped to a glance', async () => {
    const head = composeCodebase(await inputFor(TIDEMARK_ROOT, 'ARCHITECTURE'))?.head;
    expect(head?.stack.map((set) => set.label)).toEqual(['Languages', 'Runtime', 'Frameworks']);
    expect(head?.stack[0].chips[0]).toEqual({ name: 'TypeScript', version: '5.6' });
    for (const set of head?.stack ?? []) expect(set.chips.length).toBeGreaterThan(0);
    expect(head?.stack[0].chips.length).toBeLessThanOrEqual(4);
    expect(head?.stack[1].chips.length).toBeLessThanOrEqual(3);
    expect(head?.stack[2].chips.length).toBeLessThanOrEqual(5);
  });

  it('counts the concerns with short labels, Security first, the heading as the title and a zero as a quiet row', async () => {
    const concerns = composeCodebase(await inputFor(TIDEMARK_ROOT, 'STACK'))?.head?.concerns;
    expect(concerns?.total).toBe(14);
    expect(concerns?.noun).toBe('concerns');
    expect(concerns?.counts[0]).toEqual({
      label: 'Security',
      title: 'Security Considerations',
      count: 2,
      tone: 'in-flight',
    });
    expect(concerns?.counts.map((row) => row.count)).toEqual([2, 3, 1, 2, 3, 2, 0, 1, 0]);
    expect(concerns?.counts.find((row) => row.title === 'Tech Debt')?.label).toBe('Tech debt');
    expect(concerns?.counts.find((row) => row.count === 0)?.tone).toBe('quiet');
    expect(concerns?.counts.slice(1).every((row) => row.tone === null || row.tone === 'quiet')).toBe(true);
  });

  it('keeps named tools in the head and leaves lifted sentences to the Stack panel, trimming a long version to its first word', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const context = input.codebaseContext;
    const chip = (name: string, version: string | null, group: string) => ({ name, version, group });
    const model = composeCodebase({
      ...input,
      codebaseContext: context
        ? {
            ...context,
            head: {
              concerns: null,
              nextStep: { command: '/gsd-new-project', reason: 'x' },
              stack: {
                languages: [
                  chip('Module system: ESM only ("type": "module" in package.json)', null, 'primary'),
                  chip('TypeScript', '5.9.3', 'primary'),
                ],
                runtime: [
                  chip('Node.js', '>=22.18.0 (engines in package.json)', 'runtime'),
                  chip('Deno', 'x'.repeat(40), 'runtime'),
                  chip('Bun 1.2 (a long note that the lift could not split from the name)', null, 'runtime'),
                  chip('Vite handles the client bundle and (in dev) serves the UI through Node', null, 'runtime'),
                ],
                frameworks: [],
              },
            },
          }
        : null,
    });
    expect(model?.head?.stack).toEqual([
      { label: 'Languages', chips: [{ name: 'TypeScript', version: '5.9.3' }] },
      {
        label: 'Runtime',
        chips: [
          { name: 'Node.js', version: '>=22.18.0' },
          { name: 'Deno', version: null },
          { name: 'Bun', version: '1.2' },
        ],
      },
    ]);
  });

  it('keeps a section the template does not know under its own heading', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const context = input.codebaseContext;
    const model = composeCodebase({
      ...input,
      codebaseContext: context
        ? {
            ...context,
            head: {
              nextStep: { command: '/gsd-new-project', reason: 'The map is complete. Next, set the project up.' },
              stack: null,
              concerns: { total: 3, entries: [{ key: null, heading: 'Repository Hygiene', count: 3 }] },
            },
          }
        : null,
    });
    expect(model?.head?.stack).toEqual([]);
    expect(model?.head?.concerns?.counts).toEqual([
      { label: 'Repository Hygiene', title: 'Repository Hygiene', count: 3, tone: null },
    ]);
  });
});

describe('composeCodebase - never throws, falls through silently, holds no state', () => {
  it('returns null without a context or without structured.codebase', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    expect(composeCodebase({ ...input, codebaseContext: null })).toBeNull();
    expect(composeCodebase({ ...input, codebaseContext: undefined })).toBeNull();
    expect(composeCodebase({ ...input, structured: {} })).toBeNull();
    expect(composeCodebase({ ...input, structured: { codebase: 'odd' } })).toBeNull();
  });

  it('survives an odd stamp, odd chips and odd counts', async () => {
    const input = await inputFor(TIDEMARK_ROOT, 'STACK');
    const odd = {
      ...input,
      structured: { codebase: { doc: 'stack', stamp: 7, sections: 'x', stack: { languages: 'no', runtime: [3], frameworks: null } } },
    };
    expect(() => composeCodebase(odd)).not.toThrow();
    expect(() => composeCodebase({ ...input, structured: { codebase: { doc: 'concerns', concerns: { sections: [null, 4] } } } })).not.toThrow();
  });

  it('gives the same output for two inputs composed alternately as for each alone', async () => {
    const stack = await inputFor(TIDEMARK_ROOT, 'STACK');
    const concerns = await inputFor(SHAPES_ROOT, 'ARCHITECTURE');
    const aloneStack = composeCodebase(stack);
    const aloneConcerns = composeCodebase(concerns);
    const first = composeCodebase(stack);
    const second = composeCodebase(concerns);
    const third = composeCodebase(stack);
    expect(first).toEqual(aloneStack);
    expect(second).toEqual(aloneConcerns);
    expect(third).toEqual(aloneStack);
  });
});

// ---------------------------------------------------------------------------------------------------------
// The view contract: source-text checks in the coverage-view-contract idiom (readFile + regex, no AST tooling).
// ---------------------------------------------------------------------------------------------------------
async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

const RAW_HTML_PROP = 'dangerously' + 'SetInnerHTML';
const START = '/* phase-10-codebase:start */';
const END = '/* phase-10-codebase:end */';
const COMPOSER = 'src/web/views/codebase-page.ts';
const COMPONENTS = 'src/web/views/codebase-components.tsx';
const ALLOWED_SIZES = ['var(--fs-2)', 'var(--fs-4)', 'var(--fs-7)', 'var(--fs-display-3)'];

function stripSourceComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '');
}

function toneExpressions(text: string): string[] {
  return [...text.matchAll(/data-tone=(\{[^}]*\}|"[^"]*")/g)].map((m) => m[1]);
}

function writesForbiddenTone(text: string): boolean {
  return (
    /tone[A-Za-z]*\s*[:=]\s*['"](destructive|warning|missing)['"]/.test(text) ||
    /data-tone="(destructive|warning|missing)"/.test(text) ||
    /'(destructive|warning|missing)'\s*\|/.test(text) ||
    /\|\s*'(destructive|warning|missing)'/.test(text)
  );
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
  if (/@keyframes/.test(block)) found.push('keyframes');
  if (/\banimation\b/.test(block)) found.push('animation');
  if (/\btransition\b/.test(block)) found.push('transition');
  if (/:root/.test(block)) found.push(':root');
  return found;
}

function fontSizes(block: string): string[] {
  return [...block.matchAll(/font-size\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
}

function codebaseBlock(css: string): string {
  const start = css.indexOf(START);
  const end = css.indexOf(END);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return css.slice(start, end);
}

describe('codebase view contract - helpers catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesForbiddenTone("const tone = 'missing';")).toBe(true);
    expect(writesForbiddenTone('<i data-tone="destructive" />')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral("text.replace(/a/g, '')")).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;\nexport const x = 1;')).toBe(true);
    expect(cssViolations('a { transition: color 0.2s ease; }')).toContain('transition');
    expect(fontSizes('a { font-size: var(--fs-5); } b { font-size: 12px; }')).toEqual(['var(--fs-5)', '12px']);
  });

  it('passes clean strings', () => {
    expect(writesForbiddenTone("type CodebaseTone = 'complete' | 'in-flight' | 'quiet';")).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(hasModuleLevelLet('function f() {\n  let x = 1;\n  return x;\n}')).toBe(false);
    expect(cssViolations('a { color: var(--primary); }')).toEqual([]);
  });
});

describe('codebase view contract - the real sources', () => {
  it('the components render no raw-HTML prop and write only documented tones, never destructive, warning or missing', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code.includes(RAW_HTML_PROP)).toBe(false);
    expect(writesForbiddenTone(code)).toBe(false);
    for (const expression of toneExpressions(code)) {
      expect(['"complete"', '"in-flight"', '"quiet"', '{tone}', '{row.tone}', '{facts.readiness.tone}', '{readiness.tone}'], expression).toContain(expression);
    }
  });

  it('every link goes through the in-app Link to a payload address; a ghost entry is not interactive', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain("import { Link } from '../nav.tsx';");
    expect(code).not.toMatch(/\bhref\s*=/);
    expect(code).not.toMatch(/<a[\s>]/);
    expect(code).toContain("data-ghost=\"true\"");
    expect(code).toContain('{NOT_MAPPED}');
  });

  it('lifted text is React text through ResearchInline, and plain sections go through the page\'s renderHtml callback', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain('renderHtml');
    expect(code).toContain('ResearchInline');
  });

  it('the head is one block over the panel in the reading column, and its words are the eyebrow', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).toContain('model.head === null ? \'Codebase\' : model.head.eyebrow');
    expect(code).toContain('<Head head={model.head} />');
    expect(code.indexOf('<Head head={model.head} />')).toBeLessThan(code.indexOf('<article'));
    const css = stripCssComments(codebaseBlock(await source('src/web/styles/globals.css')));
    expect(css).toContain('.view-codebase-head {\n    order: -1;');
  });

  it('the head\'s next step is the shared copy-command row, which imports no api module and never fetches', async () => {
    const components = stripSourceComments(await source(COMPONENTS));
    expect(components).toContain("import { CopyCommand } from '../components/copy-command.tsx';");
    expect(components).toContain('<CopyCommand command={head.next.command} />');
    const copy = stripSourceComments(await source('src/web/components/copy-command.tsx'));
    expect(copy).not.toMatch(/from\s+['"]\.\.\/api\.ts['"]/);
    expect(copy).not.toMatch(/\bfetch\b/);
    expect(await source(COMPOSER)).toContain('Labelore does not run commands. Paste it in your terminal.');
  });

  it('the composer builds no regular expression, uses no regex literal and imports no filesystem module', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(buildsRegExp(code)).toBe(false);
    expect(usesRegexLiteral(code)).toBe(false);
    expect(importsFilesystem(code)).toBe(false);
  });

  it('the composer holds no module-level mutable state', async () => {
    const code = stripSourceComments(await source(COMPOSER));
    expect(hasModuleLevelLet(code)).toBe(false);
    expect(code).not.toMatch(/^(export\s+)?var\s/m);
  });

  it('the CSS block exists once, holds every .view-codebase- rule and has no forbidden thing', async () => {
    const css = await source('src/web/styles/globals.css');
    expect(css.split(START).length - 1).toBe(1);
    expect(css.split(END).length - 1).toBe(1);
    const block = codebaseBlock(css);
    expect(cssViolations(stripCssComments(block))).toEqual([]);
    expect(css.replace(block, '')).not.toMatch(/\.view-codebase-/);
    for (const selector of [
      '.view-codebase-page',
      '.view-codebase-rail',
      '.view-codebase-entry',
      '.view-codebase-panel',
      '.view-codebase-chip',
      '.view-codebase-count',
    ]) {
      expect(block, selector).toContain(selector);
    }
  });

  it('the CSS block renders only the four contracted font sizes', async () => {
    const block = stripCssComments(codebaseBlock(await source('src/web/styles/globals.css')));
    const sizes = fontSizes(block);
    expect(sizes.length).toBeGreaterThan(8);
    for (const size of sizes) expect(ALLOWED_SIZES, size).toContain(size);
  });

  it('maps the document outline and rendered-document sizes inside the four-size scale', async () => {
    const block = stripCssComments(codebaseBlock(await source('src/web/styles/globals.css')));
    expect(block).toContain('.artifact-page:has(.view-codebase-page) .status-chip');
    expect(block).toContain('.view-codebase-plain-section');
  });

  it('reuses no research-* class unchanged and adds no history-prefixed or status-square rule', async () => {
    const code = stripSourceComments(await source(COMPONENTS));
    expect(code).not.toMatch(/['"\s]research-[\w-]+/);
    const block = stripCssComments(codebaseBlock(await source('src/web/styles/globals.css')));
    expect(block).not.toMatch(/\.history-[\w-]+/);
    expect(block).not.toMatch(/\.research-[\w-]+/);
    expect(block).not.toMatch(/\.status-square\s*\{/);
  });
});
