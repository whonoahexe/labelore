// Phase 11 (11-07, VIEW-17, D-05): the pause handlers. HANDOFF.json keeps exactly what JsonConfigHandler gave
// it (test/config-masking.test.ts pins that) and gains structured.pause; a lift that throws omits only that key.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { JsonConfigHandler } from '../src/planning-repo/handlers/json-config.ts';
import { PauseHandler } from '../src/planning-repo/handlers/pause.ts';
import { PAUSE_ROW_CAP, PAUSE_TEXT_CAP } from '../src/planning-repo/handlers/pause-lift.ts';
import type { HandoffLift } from '../src/planning-repo/handlers/pause-lift.ts';
import { buildPauseContext } from '../src/presentation/pause-context.ts';
import { FX_PLANNING, loadFixtureProject } from './helpers/fixture-project.ts';

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
