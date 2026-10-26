// quick-261017-k45 (sketch 024 E): the LEARNINGS composer and its view, pinned against the made-up
// Lendshed phase 1 file, the synthetic file and the dense fixture's two files. ViewInput literals are built from the handler's real parse
// of each file; pinned values come from the sketch's own data.js and the source files, never from the
// composer's output.
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { LearningsHandler } from '../../src/planning-repo/handlers/learnings.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ArtifactRef } from '../../src/planning-repo/types.ts';
import {
  chapterCounts,
  composeLearningsRetro,
  entriesFor,
  filterLine,
  pickTab,
} from '../../src/web/views/learnings-retro.ts';
import type { ComposedLearningsRetro } from '../../src/web/views/learnings-retro.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { fxPath } from '../helpers/fixture-project.ts';
import { LearningsRetroView } from '../../src/web/views/learnings-retro-components.tsx';

const FIXTURES = new URL('../fixtures/learnings/', import.meta.url).pathname;
const DENSE = new URL('../../fixtures/dense/.planning/', import.meta.url).pathname;

function refOf(path: string, extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return { path, kind: 'learnings', location: 'phase', phaseIdentity: null, milestoneVersion: null, quickTaskId: null, fileClass: 'text', sizeBytes: 0, ...extra };
}

const phase = (number: string, slug: string): Partial<ArtifactRef> => ({
  phaseIdentity: { milestoneVersion: null, number, projectCode: null, slug },
});

export function inputOf(
  content: string,
  path: string,
  ref: Partial<ArtifactRef> = {},
  headings: ViewInput['headings'] = [],
): ViewInput {
  const parsed = LearningsHandler.parse({ path, content, mtimeMs: 0, size: content.length }, refOf(path, ref));
  return {
    kind: 'learnings',
    frontmatter: JSON.parse(JSON.stringify(parsed.frontmatter)) as Record<string, unknown>,
    structured: JSON.parse(JSON.stringify(parsed.structured)) as Record<string, unknown>,
    groups: [],
    planSegments: [],
    headings,
  };
}

function fileInput(file: string, ref: Partial<ArtifactRef> = {}, headings: ViewInput['headings'] = []): ViewInput {
  return inputOf(readFileSync(file, 'utf8'), file, ref, headings);
}

function page(file: string, ref: Partial<ArtifactRef> = {}): ComposedLearningsRetro {
  const model = composeLearningsRetro(fileInput(file, ref));
  if (model === null) throw new Error(`composed null: ${file}`);
  return model;
}

const syn = page(`${FIXTURES}synthetic-LEARNINGS.md`, phase('05', 'per-type-document-views'));
const lx01 = page(fxPath('phases/01-member-sign-in-sessions/01-LEARNINGS.md'), phase('01', 'member-sign-in-sessions'));
const fx = page(`${DENSE}phases/01-identity-slice/01-LEARNINGS.md`, phase('01', 'identity-slice'));
const fxp = page(`${DENSE}LEARNINGS.md`, { location: 'root' });

const numbersOf = (m: ComposedLearningsRetro, kind: 'decision' | 'lesson' | 'pattern' | 'surprise', src: string | null): number[] =>
  entriesFor(m, kind, src).map((e) => e.no);
const allNumbers = (m: ComposedLearningsRetro, src: string | null): number[] =>
  m.chapters.flatMap((c) => entriesFor(m, c.kind, src).map((e) => e.no));
const countsOf = (m: ComposedLearningsRetro, src: string | null): number[] =>
  chapterCounts(m, src).map((c) => c.shown);

describe('the head', () => {
  it('reads each file', () => {
    expect(lx01.head).toEqual({
      eyebrow: 'Learnings · Phase 1',
      title: 'Member Sign-In & Sessions',
      extracted: '14 Mar 2026',
      project: 'Lendshed',
      missing: [],
    });
    expect(syn.head).toEqual({
      eyebrow: 'Learnings · Phase 5',
      title: 'Per-Type Document Views',
      extracted: '21 Sep 2026',
      project: 'Labelore',
      missing: ['05-UAT.md'],
    });
    expect(fx.head).toMatchObject({
      eyebrow: 'Learnings · Phase 1',
      title: 'Identity Slice',
      extracted: '10 Jun 2026',
      project: 'Dense Fixture Project',
      missing: [],
    });
    expect(fxp.head).toMatchObject({
      eyebrow: 'Learnings · Project',
      title: 'Dense Fixture Project',
      extracted: '22 Aug 2026',
      project: null,
    });
  });

  it('writes the lede with correct singulars and the right noun', () => {
    expect(lx01.lede).toBe('40 learnings from this phase: 14 decisions, 9 lessons, 10 patterns and 7 surprises, drawn from 10 artifacts.');
    expect(syn.lede).toBe('11 learnings from this phase: 3 decisions, 3 lessons, 3 patterns and 2 surprises, drawn from 8 artifacts.');
    expect(fx.lede).toBe('3 learnings from this phase: 1 decision, 1 lesson and 1 pattern, drawn from 1 source.');
    expect(fxp.lede).toBe('8 learnings from this project: 3 decisions, 2 lessons, 2 patterns and 1 surprise, drawn from 2 sources.');
  });

  it('gives a quick file its own eyebrow and lede noun', () => {
    const input = inputOf(
      '---\nproject: X\n---\n\n# Quick 261017-abc Learnings: Fix a thing\n\n## Lessons\n\n- It broke.\n',
      '.planning/quick/261017-abc-x/261017-abc-LEARNINGS.md',
      { location: 'quick', quickTaskId: '261017-abc' },
    );
    const model = composeLearningsRetro(input);
    expect(model?.head.eyebrow).toBe('Learnings · Quick 261017-abc');
    expect(model?.head.title).toBe('Fix a thing');
    expect(model?.lede).toBe('1 learning from this quick task: 1 lesson.');
  });

  it('reads phase as 1 or "01" and generated as a Date or an ISO string', () => {
    const base = lx01;
    for (const phaseValue of [1, '01']) {
      for (const generated of ['2026-03-14', new Date('2026-03-14T00:00:00Z').toISOString()]) {
        const input = fileInput(fxPath('phases/01-member-sign-in-sessions/01-LEARNINGS.md'), phase('01', 'x'));
        input.frontmatter = { ...input.frontmatter, phase: phaseValue, generated };
        const model = composeLearningsRetro(input);
        expect(model?.head.eyebrow).toBe('Learnings · Phase 1');
        expect(model?.head.extracted).toBe('14 Mar 2026');
      }
    }
    expect(base.scope).toBe('phase');
  });
});

describe('the chapters', () => {
  it('lists the tabs with their padded numbers, titles and counts', () => {
    expect(lx01.chapters.map((c) => [c.kind, c.number, c.title, c.entries.length])).toEqual([
      ['decision', '01', 'What we decided', 14],
      ['lesson', '02', 'What we learned the hard way', 9],
      ['pattern', '03', 'What we’ll reuse', 10],
      ['surprise', '04', 'What surprised us', 7],
    ]);
    expect(fx.chapters.map((c) => c.kind)).toEqual(['decision', 'lesson', 'pattern']);
    expect(fx.chapters.map((c) => c.number)).toEqual(['01', '02', '03']);
  });

  it('numbers entries by document position', () => {
    expect(numbersOf(lx01, 'decision', null)).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
    expect(numbersOf(lx01, 'lesson', null)[0]).toBe(15);
    expect(numbersOf(lx01, 'pattern', null)[0]).toBe(24);
    expect(numbersOf(lx01, 'surprise', null)).toEqual([34, 35, 36, 37, 38, 39, 40]);
  });

  it('pins the entry values', () => {
    const e1 = lx01.chapters[0].entries[0];
    expect(e1.title).toBe('Every sign-in failure returns one identical 401 body');
    expect(e1.fields.map((f) => f.label)).toEqual(['Rationale']);
    expect(e1.sources).toEqual([{ artifact: '01-01-SUMMARY.md', label: '01-SUMMARY', note: null }]);
    expect(e1.graduated).toBeNull();
    const e3 = lx01.chapters[0].entries[2];
    expect(e3.sources.map((s) => [s.label, s.note])).toEqual([
      ['02-SUMMARY', null],
      ['02-PLAN', 'RESEARCH Pattern 2 / Pitfall 4'],
    ]);
    expect(lx01.chapters[0].entries[3].sources[0].note).toBe('deviation 1, confirmed against router 4.2 source');
    const e40 = lx01.chapters[3].entries[6];
    expect(e40.no).toBe(40);
    expect(e40.sources.map((s) => s.label)).toEqual(['REVIEW', 'VERIFICATION', 'REVIEW-FIX']);
    const patterns = lx01.chapters[2].entries;
    expect(patterns.filter((e) => e.body.length === 0).map((e) => e.no)).toEqual([26, 28]);
  });

  it('keeps the kind field first and the graduation on the synthetic file', () => {
    const e1 = syn.chapters[0].entries[0];
    expect(e1.title).toBe('View is the page, Source is the escape hatch');
    expect(e1.graduated).toEqual({ target: 'docs/design-language.md', date: '22 Sep 2026' });
    const graduated = syn.chapters.flatMap((c) => c.entries).filter((e) => e.graduated);
    expect(graduated.map((e) => [e.no, e.graduated?.target])).toEqual([
      [1, 'docs/design-language.md'],
      [4, '.claude/CLAUDE.md'],
      [7, 'docs/design-language.md'],
    ]);
    expect(syn.chapters.flatMap((c) => c.entries).filter((e) => e.body.length === 0).map((e) => e.no)).toEqual([3, 5, 6, 8, 9, 10, 11]);
    expect(syn.chapters[0].entries[1].sourceKeys).toEqual(['05-01-PLAN.md', '05-01-SUMMARY.md']);
  });

  it('puts the kind field first even when written second', () => {
    const input = inputOf(
      '# L\n\n## Decisions\n\n### T\n**Alpha:** a\n**Rationale:** r\n**Source:** s.md\n',
      '.planning/phases/01-x/01-LEARNINGS.md',
      phase('01', 'x'),
    );
    expect(composeLearningsRetro(input)?.chapters[0].entries[0].fields.map((f) => f.label)).toEqual(['Rationale', 'Alpha']);
  });

  it('reads the list-item files', () => {
    expect(fx.chapters.flatMap((c) => c.entries).map((e) => e.title)).toEqual([
      'Every unfamiliar artifact type is authored from its own `gsd-core` template',
      'A phase directory can legitimately hold both templated artifact types (`SPEC.md`) and a genuinely invented one (`01-COST-MODEL.md`) side by side.',
      'Registry-dispatched artifact handlers with an unconditional generic handler always last.',
    ]);
    expect(fxp.chapters.map((c) => c.entries.length)).toEqual([3, 2, 2, 1]);
    expect(fxp.chapters[0].entries[1].title).toBe('Corruption lives inside the healthy tree, isolated to exactly two files');
    expect(fxp.chapters[0].entries[1].sources[0].label).toBe('D-02');
  });
});

describe('degrade paths', () => {
  const base = (): ViewInput => ({ kind: 'learnings', frontmatter: {}, structured: {}, groups: [], planSegments: [] });

  it('returns null without a projection and without entries', () => {
    expect(composeLearningsRetro(base())).toBeNull();
    const input = base();
    input.structured = { learnings: { h1: null, entries: [], sections: [], scope: 'phase' } };
    expect(composeLearningsRetro(input)).toBeNull();
    input.structured = { learnings: 'junk' };
    expect(composeLearningsRetro(input)).toBeNull();
  });

  it('never throws on junk values', () => {
    const junk = [1, 'x', null, [], {}, [1, 'a', null], { a: 1 }];
    for (const v of junk) {
      const input = base();
      input.frontmatter = { phase: v, generated: v, project: v, phase_name: v, missing_artifacts: v, counts: v };
      input.structured = {
        learnings: {
          h1: v,
          scope: v,
          quickId: v,
          pathPhase: v,
          sections: v,
          entries: [
            { kind: 'decision', title: 'ok', body: v, fields: v, sources: v, graduated: v },
            { kind: 'lesson', title: 'ok2', body: [v], fields: [v, { label: v, blocks: v }], sources: [v, { artifact: v }], graduated: { target: v, date: v } },
            v,
          ],
        },
      };
      expect(() => composeLearningsRetro(input)).not.toThrow();
      expect(composeLearningsRetro(input)?.chapters.length).toBe(2);
    }
  });
});

describe('end to end from files on disk', () => {
  let root: string | null = null;
  afterEach(async () => {
    if (root !== null) await rm(root, { recursive: true, force: true });
    root = null;
  });

  async function fromDisk(): Promise<{ phaseModel: ComposedLearningsRetro; rootModel: ComposedLearningsRetro }> {
    root = await mkdtemp(join(tmpdir(), 'learnings-retro-'));
    const dir = join(root, '.planning', 'phases', '05-per-type-document-views');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, '05-LEARNINGS.md'), readFileSync(`${FIXTURES}synthetic-LEARNINGS.md`, 'utf8'));
    await writeFile(join(root, '.planning', 'LEARNINGS.md'), readFileSync(`${DENSE}LEARNINGS.md`, 'utf8'));
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    const presentation = toProjectPresentation(await repository.load());
    const compose = (suffix: string): ComposedLearningsRetro => {
      const artifact = presentation.artifacts.find((a) => a.path.endsWith(suffix));
      if (!artifact) throw new Error(`artifact not loaded: ${suffix}`);
      expect(artifact.kind).toBe('learnings');
      const model = composeLearningsRetro({
        kind: artifact.kind,
        frontmatter: artifact.frontmatter,
        structured: artifact.structured,
        groups: [],
        planSegments: [],
      });
      if (model === null) throw new Error('composed null');
      return model;
    };
    return { phaseModel: compose('05-LEARNINGS.md'), rootModel: compose('.planning/LEARNINGS.md') };
  }

  it('renders a phase file and the project-root file', async () => {
    const { phaseModel, rootModel } = await fromDisk();
    const html = render(phaseModel);
    expect(html).toContain('Per-Type Document Views</h1>');
    expect(html).toContain('Learnings · Phase 5');
    expect(html).toContain('11 learnings from this phase: 3 decisions, 3 lessons, 3 patterns and 2 surprises, drawn from 8 artifacts.');
    expect(textOf(html)).toContain('Extracted without 05-UAT.md — learnings from it are not here.');
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(html).toMatch(/id="learnings-tab-decision"[^>]*aria-selected="true"/);
    expect(html).toContain('Graduated to docs/design-language.md');
    const rootHtml = render(rootModel);
    expect(rootHtml).toContain('Learnings · Project');
    expect(rootHtml).toContain('Dense Fixture Project</h1>');
  });
});

function render(model: ComposedLearningsRetro, extra: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(LearningsRetroView, {
        model,
        fallbackTitle: 'x',
        path: 'p',
        mode: 'view',
        onModeChange: () => undefined,
        onShowSource: () => undefined,
        chip: null,
        ...extra,
      }),
    ),
  );
}

const textOf = (html: string): string => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('the source bar and the filter', () => {
  it('lists the segments in order with short labels and counts', () => {
    expect(lx01.sources.map((s) => [s.label, s.count])).toEqual([
      ['01-SUMMARY', 8],
      ['02-PLAN', 1],
      ['02-SUMMARY', 8],
      ['03-SUMMARY', 4],
      ['04-SUMMARY', 9],
      ['05-SUMMARY', 5],
      ['06-SUMMARY', 10],
      ['REVIEW-FIX', 1],
      ['REVIEW', 1],
      ['VERIFICATION', 1],
    ]);
    expect(lx01.sources.map((s) => s.artifact)[7]).toBe('01-REVIEW-FIX.md');
    expect(syn.sources.map((s) => [s.artifact, s.count])).toEqual([
      ['05-01-PLAN.md', 1],
      ['05-01-SUMMARY.md', 3],
      ['05-04-SUMMARY.md', 3],
      ['05-05-SUMMARY.md', 1],
      ['05-06-SUMMARY.md', 3],
      ['05-RESEARCH.md', 1],
      ['05-REVIEW.md', 1],
      ['05-VERIFICATION.md', 1],
    ]);
    expect(fxp.sources.map((s) => [s.label, s.count])).toEqual([['D-01', 1], ['D-02', 2]]);
    expect(fx.sources).toEqual([]);
  });

  it('filters by source with the pinned counts and entries', () => {
    expect(countsOf(lx01, null)).toEqual([14, 9, 10, 7]);
    expect(countsOf(lx01, '01-04-SUMMARY.md')).toEqual([2, 3, 3, 1]);
    expect(numbersOf(lx01, 'decision', '01-04-SUMMARY.md')).toEqual([4, 13]);
    expect(filterLine(lx01, '01-04-SUMMARY.md')).toEqual({ count: 9, text: 'Showing the 9 learnings from 01-04-SUMMARY.md' });
    expect(countsOf(lx01, '01-REVIEW.md')).toEqual([0, 0, 0, 1]);
    expect(pickTab(lx01, '01-REVIEW.md', 'decision')).toBe('surprise');
    expect(numbersOf(lx01, 'surprise', '01-REVIEW.md')).toEqual([40]);
    expect(filterLine(lx01, '01-REVIEW.md')?.text).toBe('Showing the 1 learning from 01-REVIEW.md');
    expect(countsOf(lx01, '01-06-SUMMARY.md')).toEqual([3, 4, 2, 1]);
    expect(allNumbers(lx01, '01-06-SUMMARY.md')).toEqual([10, 11, 12, 15, 16, 17, 21, 32, 33, 34]);
    expect(allNumbers(syn, '05-REVIEW.md')).toEqual([6]);
    expect(countsOf(syn, '05-REVIEW.md')).toEqual([0, 1, 0, 0]);
    expect(countsOf(syn, '05-01-SUMMARY.md')).toEqual([2, 0, 1, 0]);
    expect(allNumbers(syn, '05-01-SUMMARY.md')).toEqual([1, 2, 7]);
    expect(countsOf(fxp, 'D-02')).toEqual([1, 0, 0, 1]);
    expect(allNumbers(fxp, 'D-02')).toEqual([2, 8]);
  });

  it('keeps the wanted tab when it has entries and shows no line without a filter', () => {
    expect(pickTab(lx01, null, 'pattern')).toBe('pattern');
    expect(pickTab(lx01, '01-04-SUMMARY.md', 'pattern')).toBe('pattern');
    expect(pickTab(lx01, null, null)).toBe('decision');
    expect(filterLine(lx01, null)).toBeNull();
    expect(chapterCounts(lx01, null).every((c) => c.shown === c.total)).toBe(true);
  });
});

describe('the view', () => {
  it('opens on the head, the bar, the tabs and the first chapter', () => {
    const html = render(lx01);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('Member Sign-In &amp; Sessions');
    const text = textOf(html);
    expect(text).toContain('Learnings · Phase 1');
    expect(text).toContain('Extracted 14 Mar 2026');
    expect(text).toContain('Lendshed');
    expect(text).toContain('Where they came from · pick one to show only its learnings');
    expect(html.match(/class="view-learnings-segment"/g)).toHaveLength(10);
    expect(html.match(/role="tab"/g)).toHaveLength(4);
    expect(text).toContain('01 What we decided 14');
    expect(text).toContain('02 What we learned the hard way 9');
    expect(text).toContain('03 What we’ll reuse 10');
    expect(text).toContain('04 What surprised us 7');
    expect(html.match(/<article class="view-learnings-entry"/g)).toHaveLength(14);
    expect(html).toMatch(/id="learnings-tab-decision"[^>]*tabindex="0"/);
    expect(html).toMatch(/id="learnings-tab-lesson"[^>]*tabindex="-1"/);
    expect(html).toContain('title="01-REVIEW.md · 1 learning"');
  });

  it('shows the filter line, disabled tabs, "N of M" and only the matching entries', () => {
    const html = render(lx01, { initialSource: '01-REVIEW.md' });
    const text = textOf(html);
    expect(text).toContain('Showing the 1 learning from 01-REVIEW.md');
    expect(text).toContain('Show all');
    expect(html.match(/ disabled=""/g)).toHaveLength(3);
    expect(html).toMatch(/id="learnings-tab-surprise"[^>]*aria-selected="true"/);
    expect(text).toContain('1 of 7');
    expect(html.match(/<article class="view-learnings-entry"/g)).toHaveLength(1);
    expect(text).toContain('Two review findings were still open at the verification pass and had to be re-checked');
    expect(html).toContain('aria-pressed="true"');
  });

  it('shows no bar for one source and renders empty-bodied entries without a paragraph', () => {
    expect(render(fx)).not.toContain('Where they came from');
    const html = render(lx01, { initialTab: 'pattern' });
    const entries = html.split('<article class="view-learnings-entry"').slice(1);
    const second = entries.find((e) => e.includes('>28<')) ?? '';
    expect(second).toContain('Distinct synthetic');
    expect(second).not.toContain('view-research-text"><');
    expect(second.split('<aside')[0]).not.toContain('<p');
  });

  it('shows the missing note, the badge, the side note and the From line', () => {
    const text = textOf(render(syn));
    expect(text).toContain('Extracted without 05-UAT.md — learnings from it are not here.');
    expect(text).toContain('Graduated to docs/design-language.md');
    expect(text).toContain('Rationale');
    expect(text).toContain('From 01-SUMMARY');
    expect(render(syn)).toContain('title="Graduated to docs/design-language.md on 22 Sep 2026"');
    expect(textOf(render(lx01, { initialTab: 'decision' }))).toContain('From 02-SUMMARY · 02-PLAN (RESEARCH Pattern 2 / Pitfall 4)');
  });

  it('writes no tone attribute and no href', () => {
    const html = render(syn);
    expect(html).not.toContain('data-tone');
    expect(html).not.toContain('href=');
  });
});

describe('Also in this file', () => {
  const shown: string[] = [];
  const labelsOf = (model: ComposedLearningsRetro): string[] => model.also.map((a) => a.label);

  it('shows one Frontmatter chip for each corpus file', () => {
    for (const m of [syn, lx01, fx, fxp]) expect(labelsOf(m)).toEqual(['Frontmatter']);
    expect(shown).toEqual([]);
    const html = render(lx01);
    expect(html).toContain('aria-label="Also in this file"');
    expect(html.match(/class="status-chip"/g)).toHaveLength(1);
  });

  it('adds a chip for an extra section and for leftover prose, resolved through the headings', () => {
    const headings = [{ id: 'open-threads', text: 'Open threads', depth: 2 }, { id: 'lessons', text: 'Lessons', depth: 2 }];
    const content =
      '---\nproject: X\n---\n\n# Learnings: X\n\n## Lessons\n\n- A lesson.\n\nStray prose.\n\n## Open threads\n\nSomething pending.\n';
    const model = composeLearningsRetro(inputOf(content, '.planning/LEARNINGS.md', { location: 'root' }, headings));
    expect(model?.also).toEqual([
      { label: 'Frontmatter', targetId: null },
      { label: 'Lessons', targetId: 'lessons' },
      { label: 'Open threads', targetId: 'open-threads' },
    ]);
    const unresolved = composeLearningsRetro(inputOf(content, '.planning/LEARNINGS.md', { location: 'root' }));
    expect(unresolved?.also.map((a) => a.targetId)).toEqual([null, null, null]);
  });

  it('shows no Frontmatter chip without frontmatter and no row without chips', () => {
    const model = composeLearningsRetro(inputOf('# L\n\n## Lessons\n\n- one\n', '.planning/LEARNINGS.md', { location: 'root' }));
    expect(model?.also).toEqual([]);
    expect(render(model as ComposedLearningsRetro)).not.toContain('Also in this file');
  });
});
