// The Research page's view model (quick-261024-k8u): the frame, the findings, the numbers and the
// no-source-links rule. Built from Labelore's own research files and the synthetic drift fixtures,
// parsed through the real handler.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ProjectResearchHandler } from '../../src/planning-repo/handlers/project-research.ts';
import { buildResearchViewModel, formatResearched, splitFinding } from '../../src/presentation/project-research.ts';
import { RESEARCH_FILES, projectHasResearch } from '../../src/presentation/project-research-files.ts';
import {
  DRIFT_ARCHITECTURE,
  DRIFT_FEATURES,
  DRIFT_PITFALLS,
  DRIFT_STACK,
  DRIFT_SUMMARY,
} from '../helpers/project-research-fixtures.ts';

type Contents = Partial<Record<'SUMMARY' | 'STACK' | 'FEATURES' | 'ARCHITECTURE' | 'PITFALLS', string>>;

const RESEARCH_DIR = join(import.meta.dirname, '..', '..', '.planning', 'research');
const realContents = (): Contents =>
  Object.fromEntries(
    ['SUMMARY', 'STACK', 'FEATURES', 'ARCHITECTURE', 'PITFALLS'].map((name) => [name, readFileSync(join(RESEARCH_DIR, `${name}.md`), 'utf8')]),
  );
const driftContents = (): Contents => ({
  SUMMARY: DRIFT_SUMMARY,
  STACK: DRIFT_STACK,
  FEATURES: DRIFT_FEATURES,
  ARCHITECTURE: DRIFT_ARCHITECTURE,
  PITFALLS: DRIFT_PITFALLS,
});

function presentationOf(contents: Contents, projectName: string | null = 'Fallback Name') {
  const artifacts = Object.entries(contents).map(([name, content]) => {
    const path = `.planning/research/${name}.md`;
    const ref = { path, kind: 'unknown', location: 'research' as const, phaseIdentity: null, milestoneVersion: null, quickTaskId: null };
    const parsed = ProjectResearchHandler.parse({ path, content: content ?? '', mtimeMs: 0, size: (content ?? '').length }, ref);
    return { path, location: 'research' as const, structured: parsed.structured };
  });
  return { readAt: '2026-10-24T00:00:00.000Z', projectName, artifacts } as unknown as Parameters<typeof buildResearchViewModel>[0];
}

describe('formatResearched', () => {
  it('formats an ISO date and passes anything else through', () => {
    expect(formatResearched('2026-08-21')).toBe('21 Aug 2026');
    expect(formatResearched('last spring')).toBe('last spring');
    expect(formatResearched(null)).toBeNull();
  });
});

describe('splitFinding', () => {
  it('keeps a short first sentence whole and moves the rest to rest', () => {
    expect(splitFinding('Short one. Then another sentence here.')).toEqual({
      head: 'Short one.',
      tail: '',
      rest: 'Then another sentence here.',
    });
  });

  it('cuts a long first sentence at its colon', () => {
    const long = `The shortlist is settled: ${'one, two, three and four of the named things '.repeat(4)}end.`;
    const split = splitFinding(long);
    expect(split.head).toBe('The shortlist is settled');
    expect(split.tail.startsWith('one, two')).toBe(true);
    expect(split.rest).toBe('');
  });

  it('does not cut a long sentence whose colon comes too early, or a short one', () => {
    expect(splitFinding(`A: ${'word '.repeat(40)}end.`).tail).toBe('');
    expect(splitFinding('A short thing: with a list.').tail).toBe('');
  });

  it('tolerates empty input', () => {
    expect(splitFinding('')).toEqual({ head: '', tail: '', rest: '' });
  });
});

describe('buildResearchViewModel on Labelore', () => {
  const model = buildResearchViewModel(presentationOf(realContents()));

  it('lays out five spines numbered 00 to 04 under the project name', () => {
    expect(model.available).toBe(true);
    expect(model.title).toBe('Labelore');
    expect(model.fileCount).toBe(5);
    expect(model.files.map((file) => [file.number, file.key])).toEqual([
      ['00', 'summary'],
      ['01', 'stack'],
      ['02', 'features'],
      ['03', 'architecture'],
      ['04', 'pitfalls'],
    ]);
    expect(model.researched).toBe('21 Aug 2026');
    expect(model.confidence.level).toBe('HIGH');
  });

  it('numbers each file: phases, stack entries as the sum of the layers, features, components, pitfalls', () => {
    const byKey = Object.fromEntries(model.files.map((file) => [file.key, file]));
    expect(byKey.summary.keyNumber).toEqual({ value: 4, label: 'phases suggested' });
    expect(byKey.summary.nums).toEqual([
      { value: 4, label: 'phases' },
      { value: 4, label: 'gaps' },
    ]);
    expect(byKey.stack.keyNumber).toEqual({ value: 25, label: 'stack entries' });
    expect(byKey.features.keyNumber).toEqual({ value: 27, label: 'features weighed' });
    expect(byKey.architecture.keyNumber).toEqual({ value: 7, label: 'components' });
    expect(byKey.pitfalls.keyNumber).toEqual({ value: 10, label: 'critical pitfalls' });
    expect(byKey.pitfalls.nums.map((stat) => stat.label)).toEqual(['critical pitfalls', 'warning signs', 'checks before done']);
    expect(byKey.pitfalls.nums[2].value).toBe(10);
  });

  it('leads each file with its finding', () => {
    const byKey = Object.fromEntries(model.files.map((file) => [file.key, file]));
    expect(byKey.summary.finding?.head).toMatch(/^Labelore is a read-only web viewer/);
    expect(byKey.summary.finding?.more.length).toBeGreaterThan(2);
    expect(byKey.summary.moreLabel).toBe('Read the full summary');
    expect(byKey.stack.finding?.head).toBe('Vite 8 + React 19 SPA, served by a thin Hono/Node API server, over Next.js 16.');
    expect(byKey.stack.finding?.tail).toBe('');
    expect(byKey.stack.moreLabel).toBe('Read more');
    expect(byKey.features.finding?.head).toBe('**11** things users expect, **7** that set it apart, and **9** worth refusing to build.');
    expect(byKey.features.moreLabel).toBeNull();
    expect(byKey.architecture.finding?.head).toMatch(/^System built as two clean layers/);
    expect(byKey.pitfalls.finding?.head).toBe("The worst of 10: Building the parser against studio-portal's shape, not GSD's contract.");
  });

  it('takes a file confidence from the Summary table first', () => {
    expect(model.files.map((file) => file.confidence)).toEqual(['HIGH', 'HIGH', 'HIGH', 'HIGH', 'HIGH']);
  });
});

describe('buildResearchViewModel on the drift fixtures', () => {
  const model = buildResearchViewModel(presentationOf(driftContents()));

  it('takes the milestone name from a "Name, milestone vX.Y Milestone" project line', () => {
    expect(model.title).toBe('Vault Ingest');
  });

  it('takes the project name when the line has no milestone, and the presentation name without a Summary', () => {
    const plain = DRIFT_SUMMARY.replace('Cinedise Portal, milestone v2.0 Vault Ingest', 'Cinedise Portal');
    expect(buildResearchViewModel(presentationOf({ SUMMARY: plain })).title).toBe('Cinedise Portal');
    expect(buildResearchViewModel(presentationOf({ STACK: DRIFT_STACK }, 'Named By Folder')).title).toBe('Named By Folder');
  });

  it('prefers the Summary confidence row, then the file own confidence', () => {
    const byKey = Object.fromEntries(model.files.map((file) => [file.key, file.confidence]));
    expect(byKey).toEqual({
      summary: 'MEDIUM-HIGH',
      stack: 'HIGH',
      features: 'MEDIUM',
      architecture: 'MEDIUM-HIGH',
      pitfalls: 'LOW-MEDIUM',
    });
    const withoutAreas = DRIFT_SUMMARY.replace(/\| Stack \|[^\n]*\n/, '').replace(/\| Pitfalls \|[^\n]*\n/, '');
    const fallback = buildResearchViewModel(presentationOf({ ...driftContents(), SUMMARY: withoutAreas }));
    const levels = Object.fromEntries(fallback.files.map((file) => [file.key, file.confidence]));
    expect(levels.stack).toBe('HIGH');
    expect(levels.pitfalls).toBe('MEDIUM-HIGH');
  });

  it('sums the stack layers for the key number', () => {
    const stack = model.files.find((file) => file.key === 'stack');
    expect(stack?.keyNumber).toEqual({ value: 6, label: 'stack entries' });
  });

  it('cuts a stack verdict that runs long at its colon and keeps the rest behind the toggle', () => {
    const stack = model.files.find((file) => file.key === 'stack');
    expect(stack?.finding?.head).toBe('Rust and axum, kept as they are, over a rewrite in Go.');
    expect(stack?.finding?.more).toEqual(['The portal already runs there and the ingest path wants no garbage collector:']);
  });

  it('falls back to the build steps and then the anti-patterns for the architecture number', () => {
    const noComponents = DRIFT_ARCHITECTURE.replace(/## Component Responsibilities[\s\S]*?## Recommended Project Structure/, '## Recommended Project Structure');
    const steps = buildResearchViewModel(presentationOf({ ARCHITECTURE: noComponents })).files[0];
    expect(steps.keyNumber).toEqual({ value: 4, label: 'build steps' });
    const noOrder = noComponents.replace(/## Suggested Build Order[\s\S]*?## Anti-Patterns/, '## Anti-Patterns');
    expect(buildResearchViewModel(presentationOf({ ARCHITECTURE: noOrder })).files[0].keyNumber).toEqual({ value: 2, label: 'anti-patterns' });
  });
});

describe('buildResearchViewModel with files missing', () => {
  it('shows four spines 00 to 03 without PITFALLS', () => {
    const { PITFALLS: _dropped, ...rest } = realContents();
    void _dropped;
    const model = buildResearchViewModel(presentationOf(rest));
    expect(model.files.map((file) => file.number)).toEqual(['00', '01', '02', '03']);
    expect(model.fileCount).toBe(4);
    // The Summary still names pitfalls; with no file the finding is simply absent.
    expect(model.files.find((file) => file.key === 'pitfalls')).toBeUndefined();
  });

  it('shows one spine for SUMMARY only', () => {
    const model = buildResearchViewModel(presentationOf({ SUMMARY: realContents().SUMMARY }));
    expect(model.files.map((file) => file.key)).toEqual(['summary']);
    expect(model.available).toBe(true);
  });

  it('is unavailable with no research files', () => {
    const model = buildResearchViewModel(presentationOf({}));
    expect(model.available).toBe(false);
    expect(model.files).toEqual([]);
    expect(model.fileCount).toBe(0);
  });

  it('ignores a file whose lift is missing', () => {
    const presentation = presentationOf(realContents());
    for (const artifact of presentation.artifacts) delete (artifact.structured as Record<string, unknown>).projectResearch;
    expect(buildResearchViewModel(presentation).available).toBe(false);
  });
});

describe('the no-source-links rule', () => {
  it('carries no file name, .planning path, line number or artifact URL in the serialised view model', () => {
    for (const contents of [realContents(), driftContents()]) {
      const json = JSON.stringify(buildResearchViewModel(presentationOf(contents)));
      expect(json).not.toMatch(/\.planning\/research/);
      expect(json).not.toMatch(/\/artifacts\//);
      for (const name of ['SUMMARY.md', 'STACK.md', 'FEATURES.md', 'ARCHITECTURE.md', 'PITFALLS.md']) {
        expect(json).not.toContain(name);
      }
      expect(json).not.toMatch(/"line(s|Number)?"/);
    }
  });
});

describe('projectHasResearch', () => {
  it('is true when any of the five files is present and false otherwise', () => {
    expect(projectHasResearch([{ path: '.planning/research/STACK.md' }])).toBe(true);
    expect(projectHasResearch(RESEARCH_FILES.map((file) => ({ path: file.path })))).toBe(true);
    expect(projectHasResearch([{ path: '.planning/research/questions.md' }, { path: '.planning/STATE.md' }])).toBe(false);
    expect(projectHasResearch([])).toBe(false);
  });
});
