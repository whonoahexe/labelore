// Phase 11 (11-07, VIEW-17, D-05): the pause handlers. HANDOFF.json keeps exactly what JsonConfigHandler gave
// it (test/config-masking.test.ts pins that) and gains structured.pause; a lift that throws omits only that key.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { JsonConfigHandler } from '../src/planning-repo/handlers/json-config.ts';
import { ContinueHereHandler, PauseHandler } from '../src/planning-repo/handlers/pause.ts';
import {
  PAUSE_ROW_CAP,
  PAUSE_TEXT_CAP,
  extractContinueHere,
  normaliseTasks,
  splitConstraint,
} from '../src/planning-repo/handlers/pause-lift.ts';
import type { ContinueHereLift, HandoffLift } from '../src/planning-repo/handlers/pause-lift.ts';
import { buildPauseContext } from '../src/presentation/pause-context.ts';
import { createArtifactRenderer } from '../src/rendering/markdown.ts';
import { FX_PLANNING, loadFixtureProject } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';
import { loadShapesProject } from './helpers/shapes-project.ts';

function refOf(path: string, extra: Partial<ArtifactRef> = {}): ArtifactRef {
  return {
    path,
    kind: 'handoff',
    location: 'root',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
    fileClass: 'text',
    sizeBytes: 0,
    ...extra,
  };
}

function rawOf(path: string, text: string): RawArtifact {
  return { path, content: text, mtimeMs: 0, size: text.length };
}

const HANDOFF_PATH = '.planning/HANDOFF.json';
const lendshedHandoff = (): string => readFileSync(join(FX_PLANNING, 'HANDOFF.json'), 'utf8');

type Pause = HandoffLift & { source: 'handoff' };
const pauseOf = (result: { structured?: Record<string, unknown> }): Pause | undefined =>
  result.structured?.pause as Pause | undefined;

describe('PauseHandler', () => {
  it('claims refs of kind handoff and nothing else', () => {
    expect(PauseHandler.match(refOf(HANDOFF_PATH))).toBe(true);
    expect(PauseHandler.match(refOf('.planning/config.json', { kind: 'unknown' }))).toBe(false);
    expect(PauseHandler.match(refOf('.planning/.continue-here.md', { kind: 'continue-here' }))).toBe(false);
  });

  it('is registered immediately before JsonConfigHandler, and the generic handler stays last', () => {
    expect(HANDLERS.indexOf(PauseHandler)).toBe(HANDLERS.indexOf(JsonConfigHandler) - 1);
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });

  it('reads Lendshed HANDOFF.json through the real repository as task 3 of 6 with its next action', async () => {
    const { presentation } = await loadFixtureProject();
    const artifact = presentation.artifacts.find((candidate) => candidate.path === HANDOFF_PATH);
    expect(artifact?.kind).toBe('handoff');
    const pause = artifact?.structured.pause as Pause;
    expect(pause.source).toBe('handoff');
    expect(pause.task).toBe(3);
    expect(pause.totalTasks).toBe(6);
    expect(pause.status).toBe('paused');
    expect(pause.nextAction).toBe('Point the loan log at the name snapshot column, then rerun the loan log tests');
    expect(pause.pausedAt).toBe('2026-04-06T17:42:11.000Z');
    expect(pause.pausedAtSource).toBe('timestamp');
    expect(pause.unknownKeys).toEqual(['retention_window_days']);
  });

  it('reaches the tracer context: the stop and the next action, paired with the root continue-here', async () => {
    const { presentation } = await loadFixtureProject();
    const context = buildPauseContext(presentation, HANDOFF_PATH);
    expect(context?.stop).toEqual({ task: 3, totalTasks: 6, status: 'paused' });
    expect(context?.nextAction?.text).toContain('Point the loan log');
    expect(context?.files.continueHere?.path).toBe('.planning/.continue-here.md');
  });

  it('keeps JsonConfigHandler\'s title, frontmatter, body and warning byte for byte', () => {
    const text = lendshedHandoff();
    const path = HANDOFF_PATH;
    const pause = PauseHandler.parse(rawOf(path, text), refOf(path));
    const base = JsonConfigHandler.parse(rawOf(path, text), refOf(path));
    expect(pause.title).toBe(base.title);
    expect(pause.frontmatter).toEqual(base.frontmatter);
    expect(pause.body).toBe(base.body);
    expect(pause.body).toBe(text);
    expect(pause.warning).toEqual(base.warning);
  });

  it('lifts the human actions with blocking kept apart from the rest', () => {
    const pause = pauseOf(PauseHandler.parse(rawOf(HANDOFF_PATH, lendshedHandoff()), refOf(HANDOFF_PATH)))!;
    expect(pause.humanActions.map((row) => row.blocking)).toEqual([true, true, false]);
    expect(pause.humanActions[0].action).toBe('Confirm the retention window for disabled accounts');
    expect(pause.blockers).toHaveLength(2);
    expect(pause.decisions).toHaveLength(2);
    expect(pause.uncommittedFiles).toEqual([
      ' M server/db/migrations/0042_loan_name_snapshot.sql',
      ' M server/loans/log.js',
      '?? server/loans/snapshot.js',
    ]);
    expect(pause.moreCount).toBe(0);
  });

  it('leaves a file that does not parse exactly as JsonConfigHandler gave it, with no structured.pause', () => {
    const text = '{ "task": 1, }';
    const pause = PauseHandler.parse(rawOf(HANDOFF_PATH, text), refOf(HANDOFF_PATH));
    const base = JsonConfigHandler.parse(rawOf(HANDOFF_PATH, text), refOf(HANDOFF_PATH));
    expect(pause).toEqual(base);
    expect(pause.warning).toBeDefined();
    expect(pauseOf(pause)).toBeUndefined();
  });

  it('gives a JSON value that is not an object no structured.pause and no throw', () => {
    for (const text of ['[1, 2]', '"text"', '7']) {
      const result = PauseHandler.parse(rawOf(HANDOFF_PATH, text), refOf(HANDOFF_PATH));
      expect(pauseOf(result)).toBeUndefined();
    }
  });

  it('keeps body and frontmatter and omits structured.pause when the lift throws', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/pause-lift.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/planning-repo/handlers/pause-lift.ts')>()),
      extractHandoff: () => {
        throw new Error('boom');
      },
    }));
    const { PauseHandler: Guarded } = await import('../src/planning-repo/handlers/pause.ts');
    const { JsonConfigHandler: Base } = await import('../src/planning-repo/handlers/json-config.ts');
    const text = lendshedHandoff();
    const result = Guarded.parse(rawOf(HANDOFF_PATH, text), refOf(HANDOFF_PATH));
    const base = Base.parse(rawOf(HANDOFF_PATH, text), refOf(HANDOFF_PATH));
    expect(result.body).toBe(text);
    expect(result.frontmatter).toEqual(base.frontmatter);
    expect(result.title).toBe('HANDOFF.json');
    expect(pauseOf(result)).toBeUndefined();
    vi.doUnmock('../src/planning-repo/handlers/pause-lift.ts');
  });

  it('caps a hostile list and a hostile string and counts the rows it dropped', () => {
    const rows = Array.from({ length: PAUSE_ROW_CAP + 37 }, (_, i) => ({ id: i, name: `task ${i}` }));
    const text = JSON.stringify({ remaining_tasks: rows, next_action: 'x'.repeat(PAUSE_TEXT_CAP * 3) });
    const pause = pauseOf(PauseHandler.parse(rawOf(HANDOFF_PATH, text), refOf(HANDOFF_PATH)))!;
    expect(pause.remaining).toHaveLength(PAUSE_ROW_CAP);
    expect(pause.moreCount).toBe(37);
    expect(pause.nextAction).toHaveLength(PAUSE_TEXT_CAP);
  });

  it('reads author keys as own properties only', () => {
    const text = '{"constructor": {"task": 9}, "__proto__": {"task": 8}, "toString": "x"}';
    const pause = pauseOf(PauseHandler.parse(rawOf(HANDOFF_PATH, text), refOf(HANDOFF_PATH)))!;
    expect(pause.task).toBeUndefined();
    expect(pause.unknownKeys).toEqual(expect.arrayContaining(['toString']));
    expect(Object.getPrototypeOf(pause)).toBe(Object.prototype);
  });
});

// --- Task 2: .continue-here.md, both task shapes, older and broken layouts ---------------------------------

const CONTINUE_PATH = '.planning/.continue-here.md';
const lendshedContinue = (relative = '.continue-here.md'): string => readFileSync(join(FX_PLANNING, relative), 'utf8');
const continueRef = (path: string): ArtifactRef => refOf(path, { kind: 'continue-here' });

type ContinuePause = ContinueHereLift & { source: 'continue-here' };
const continueOf = (result: { structured?: Record<string, unknown> }): ContinuePause | undefined =>
  result.structured?.pause as ContinuePause | undefined;

describe('ContinueHereHandler', () => {
  it('claims refs of kind continue-here and is registered before the generic handler', () => {
    expect(ContinueHereHandler.match(continueRef(CONTINUE_PATH))).toBe(true);
    expect(ContinueHereHandler.match(refOf(HANDOFF_PATH))).toBe(false);
    expect(HANDLERS.indexOf(ContinueHereHandler)).toBe(HANDLERS.length - 2);
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });

  it('lifts the Lendshed root pause: task 4 of 6, blocked, the seven tag sections', () => {
    const result = ContinueHereHandler.parse(rawOf(CONTINUE_PATH, lendshedContinue()), continueRef(CONTINUE_PATH));
    const pause = continueOf(result)!;
    expect(pause.source).toBe('continue-here');
    expect(pause.context).toBe('phase');
    expect(pause.phase).toBe('03-account-admin-and-sessions');
    expect(pause.task).toBe(4);
    expect(pause.totalTasks).toBe(6);
    expect(pause.status).toBe('blocked');
    expect(pause.lastUpdated).toBe('2026-04-06T18:05:40.000Z');
    expect(Object.keys(pause.tags).sort()).toEqual(
      ['blockers', 'completedWork', 'context', 'currentState', 'decisionsMade', 'nextAction', 'remainingWork'].sort(),
    );
    expect(pause.tags.nextAction).toBe(
      'Start with: move the loan log read onto the name snapshot column, then run the loan log tests.',
    );
    expect(pause.tags.currentState).toContain('Task 4 is where the work stands');
  });

  it('splits a constraint into name, what and mitigation, and reads one blocking and one advisory anti-pattern', () => {
    const pause = continueOf(
      ContinueHereHandler.parse(rawOf(CONTINUE_PATH, lendshedContinue()), continueRef(CONTINUE_PATH)),
    )!;
    expect(pause.constraints).toHaveLength(2);
    expect(pause.constraints[0]).toEqual({
      name: 'No join on the member table',
      what: 'the loan log read must not join members for a name',
      mitigation: 'read the snapshot column instead',
    });
    expect(pause.antiPatterns.map((row) => [row.pattern, row.blocking, row.severity])).toEqual([
      ['Joining a deleted row', true, 'blocking'],
      ['Re-running the old log tests', false, 'advisory'],
    ]);
    expect(pause.antiPatterns[0].prevention).toContain('snapshot column');
    // The anti-patterns table is not repeated as a section, and neither is the constraint block.
    expect(pause.sections.map((section) => section.heading)).toEqual([]);
  });

  it('keeps title, frontmatter and warning as the generic handler gave them, and a body with no tag-only line', () => {
    const text = lendshedContinue();
    const result = ContinueHereHandler.parse(rawOf(CONTINUE_PATH, text), continueRef(CONTINUE_PATH));
    const generic = GenericMarkdownHandler.parse(rawOf(CONTINUE_PATH, text), continueRef(CONTINUE_PATH));
    expect(result.title).toBe(generic.title);
    expect(result.frontmatter).toEqual(generic.frontmatter);
    expect(result.warning).toEqual(generic.warning);
    expect(result.body.split('\n').filter((line) => /^<\/?[a-z_]+>$/.test(line.trim()))).toEqual([]);
    expect(result.body).toContain('Task 4 is where the work stands');
    expect(result.body.split('\n')).toHaveLength(generic.body.split('\n').length);
  });

  it('hands the renderer a body whose heading after a tag-only line still renders as a heading', async () => {
    const text = '---\nphase: 2\n---\n<current_state>\n## Where it stands\nWorking.\n</current_state>\n## Left\n- one\n';
    const result = ContinueHereHandler.parse(rawOf(CONTINUE_PATH, text), continueRef(CONTINUE_PATH));
    const renderer = await createArtifactRenderer();
    const rendered = await renderer.render({ kind: 'continue-here', body: result.body });
    expect(rendered.headings.map((heading) => heading.text)).toEqual(['Where it stands', 'Left']);
    // The tag text is read from the untouched body, so the heading line is inside current_state.
    expect(continueOf(result)!.tags.currentState).toBe('## Where it stands\nWorking.');
  });

  it('reads the nested pauses: another phase\'s folder, and a spike with no README', () => {
    const nested = '.planning/phases/03-account-admin-and-sessions/.continue-here.md';
    const spike = '.planning/spikes/SPIKE-006/.continue-here.md';
    const inFolder = continueOf(
      ContinueHereHandler.parse(
        rawOf(nested, lendshedContinue('phases/03-account-admin-and-sessions/.continue-here.md')),
        continueRef(nested),
      ),
    )!;
    expect(inFolder.phase).toBe('04-bulk-loan-export');
    expect(inFolder.task).toBe(2);
    expect(inFolder.totalTasks).toBe(5);
    expect(inFolder.constraints).toEqual([]);
    const inSpike = continueOf(
      ContinueHereHandler.parse(rawOf(spike, lendshedContinue('spikes/SPIKE-006/.continue-here.md')), continueRef(spike)),
    )!;
    expect(inSpike.context).toBe('spike');
    expect(inSpike.phase).toBe('SPIKE-006');
    expect(inSpike.status).toBe('in_progress');
    expect(inSpike.lastUpdated).toBe('2026-04-12T15:20:05.000Z');
  });

  it('keeps a constraint line that does not split whole, and a two-part line as name and what', () => {
    expect(splitConstraint('Never run the migration on staging')).toEqual({ name: 'Never run the migration on staging' });
    expect(splitConstraint('Dev only — the migration is applied to the dev copy')).toEqual({
      name: 'Dev only',
      what: 'the migration is applied to the dev copy',
    });
    const text = '# BLOCKING CONSTRAINTS\n\n- [x] CONSTRAINT: Never run the migration on staging\n';
    const pause = continueOf(ContinueHereHandler.parse(rawOf(CONTINUE_PATH, text), continueRef(CONTINUE_PATH)))!;
    expect(pause.constraints).toEqual([{ name: 'Never run the migration on staging' }]);
  });

  it('lifts every other heading as a section, and the text of an older layout with no tags', () => {
    const text =
      '---\nphase: 5\n---\n# Continue here\n\nIntro line.\n\n## Required Reading\n- a.md\n\n## Infrastructure State\nDocker is up.\n';
    const pause = continueOf(ContinueHereHandler.parse(rawOf(CONTINUE_PATH, text), continueRef(CONTINUE_PATH)))!;
    expect(pause.sections).toEqual([
      { heading: 'Continue here', text: 'Intro line.' },
      { heading: 'Required Reading', text: '- a.md' },
      { heading: 'Infrastructure State', text: 'Docker is up.' },
    ]);
  });

  it('reads the Shapes continue-here (no frontmatter, no tags) as one section and the rest empty', async () => {
    const { presentation } = await loadShapesProject();
    const artifact = presentation.artifacts.find((candidate) => candidate.path === CONTINUE_PATH);
    const pause = artifact?.structured.pause as ContinuePause;
    expect(pause.task).toBeUndefined();
    expect(pause.tags).toEqual({});
    expect(pause.sections[0].heading).toBe('Continue here');
    expect(pause.sections[0].text).toContain('Paused on 2026-05-09');
  });

  it('omits structured.pause when the lift throws and keeps title, frontmatter and a blanked body', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/pause-lift.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/planning-repo/handlers/pause-lift.ts')>()),
      extractContinueHere: () => {
        throw new Error('boom');
      },
    }));
    const { ContinueHereHandler: Guarded } = await import('../src/planning-repo/handlers/pause.ts');
    const result = Guarded.parse(rawOf(CONTINUE_PATH, lendshedContinue()), continueRef(CONTINUE_PATH));
    expect(result.structured).toEqual({});
    expect(result.frontmatter.status).toBe('blocked');
    expect(result.body).toContain('Task 4 is where the work stands');
    vi.doUnmock('../src/planning-repo/handlers/pause-lift.ts');
  });

  it('caps hostile lists and counts what it dropped', () => {
    const constraints = Array.from({ length: PAUSE_ROW_CAP + 5 }, (_, i) => `- [ ] CONSTRAINT: rule ${i}`).join('\n');
    const pause = continueOf(
      ContinueHereHandler.parse(rawOf(CONTINUE_PATH, `---\nphase: 1\n---\n${constraints}\n`), continueRef(CONTINUE_PATH)),
    )!;
    expect(pause.constraints).toHaveLength(PAUSE_ROW_CAP);
    expect(pause.moreCount).toBe(5);
  });

  it('does not take a tag-looking line inside a code fence, and ignores a tag that never closes', () => {
    const fenced = '```\n<next_action>\nnot a tag\n</next_action>\n```\n';
    expect(continueOf(ContinueHereHandler.parse(rawOf(CONTINUE_PATH, fenced), continueRef(CONTINUE_PATH)))!.tags).toEqual({});
    const open = '<next_action>\nnever closed\n';
    const result = ContinueHereHandler.parse(rawOf(CONTINUE_PATH, open), continueRef(CONTINUE_PATH));
    expect(continueOf(result)!.tags).toEqual({});
    expect(result.body).toContain('never closed');
  });

  it('scans a large planted body in linear time', () => {
    const growth = measureGrowth({
      make: (n) => {
        const block = '<context>\nsome words here\n</context>\n- [ ] CONSTRAINT: a — b — c\n## Section\ntext\n';
        let text = '';
        while (text.length < n) text += block;
        return text;
      },
      run: (text) => {
        extractContinueHere({}, text);
      },
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});

describe('Task shapes in HANDOFF lists', () => {
  it('reads Lendshed remaining as two task rows and one plan row naming its id with its nested task count', () => {
    const pause = pauseOf(PauseHandler.parse(rawOf(HANDOFF_PATH, lendshedHandoff()), refOf(HANDOFF_PATH)))!;
    expect(pause.remaining).toHaveLength(3);
    expect(pause.remaining[0]).toMatchObject({ id: '4', status: 'not_started' });
    expect(pause.remaining[2]).toMatchObject({
      id: '03-04',
      name: 'Run the member lifecycle end to end',
      wave: '3',
      taskCount: 2,
    });
    expect(pause.remaining[0].taskCount).toBeUndefined();
    expect(pause.completed.map((row) => [row.id, row.status, row.commit])).toEqual([
      ['1', 'done', 'a41c9e2'],
      ['2', 'done', 'b7d03f5'],
      ['3', 'in_progress', undefined],
    ]);
    expect(pause.completed[2].progress).toContain('migration written');
  });

  it('keeps a plan-shaped entry as one row, never dropped, and tolerates bare strings', () => {
    const rows = normaliseTasks([{ id: '02-01', wave: 1, tasks: [{}, {}, {}] }, 'Write the probe', 7, null, {}]);
    expect(rows).toEqual([{ id: '02-01', wave: '1', taskCount: 3 }, { name: 'Write the probe' }, { name: '7' }, {}]);
  });

  it('reads the Shapes older HANDOFF (paused_at, task 2 of 5, next action, empty lists)', async () => {
    const { presentation } = await loadShapesProject();
    const artifact = presentation.artifacts.find((candidate) => candidate.path === HANDOFF_PATH);
    const pause = artifact?.structured.pause as Pause;
    expect(pause.pausedAt).toBe('2026-05-09T16:40:00.000Z');
    expect(pause.pausedAtSource).toBe('paused_at');
    expect(pause.task).toBe(2);
    expect(pause.totalTasks).toBe(5);
    expect(pause.nextAction).toBe('Wire the cone field into the recipe form, then rerun the form tests');
    for (const list of [pause.completed, pause.remaining, pause.blockers, pause.humanActions, pause.decisions, pause.asyncJobs]) {
      expect(list).toEqual([]);
    }
  });

  it('gives the frozen dense HANDOFF.json (invalid JSON) no structured.pause, its warning, and no throw', () => {
    const dense = readFileSync(new URL('../fixtures/dense/.planning/HANDOFF.json', import.meta.url), 'utf8');
    const result = PauseHandler.parse(rawOf(HANDOFF_PATH, dense), refOf(HANDOFF_PATH));
    expect(result.warning?.message).toBe('JSON failed to parse');
    expect(pauseOf(result)).toBeUndefined();
    expect(result.body).toBe(dense);
  });
});
