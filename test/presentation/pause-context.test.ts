// Phase 11 (11-07, VIEW-17, D-05, D-07, D-08): the pause page's server-side join, over the real Lendshed and Shapes
// presentations loaded through the repository. The two pause files are paired, dated and set against STATE and
// ROADMAP; where they disagree both values are carried with their file names and nothing is merged.
import { describe, expect, it } from 'vitest';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { buildPauseContext, movedOnForSpike } from '../../src/presentation/pause-context.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';
import { loadShapesProject } from '../helpers/shapes-project.ts';

const HANDOFF = '.planning/HANDOFF.json';
const ROOT_NOTE = '.planning/.continue-here.md';
const PHASE_NOTE = '.planning/phases/03-account-admin-and-sessions/.continue-here.md';
const SPIKE_NOTE = '.planning/spikes/SPIKE-006/.continue-here.md';

async function lendshed(): Promise<ProjectPresentation> {
  return (await loadFixtureProject()).presentation;
}

function planted(presentation: ProjectPresentation, change: (copy: ProjectPresentation) => void): ProjectPresentation {
  const copy = structuredClone(presentation);
  change(copy);
  return copy;
}

describe('buildPauseContext: Lendshed /handoff', () => {
  it('pairs the HANDOFF with the root continue-here and names the stop from the HANDOFF', async () => {
    const context = buildPauseContext(await lendshed(), HANDOFF)!;
    expect(context.active).toBe('handoff');
    expect(context.files.handoff).toEqual({ path: HANDOFF, url: '/handoff' });
    expect(context.files.continueHere).toEqual({ path: ROOT_NOTE, url: '/continue-here' });
    expect(context.contextLabel).toBe('phase 3');
    expect(context.headPhase).toEqual({ number: '3', name: 'Account Admin & Sessions' });
    expect(context.stop).toEqual({
      task: 3,
      totalTasks: 6,
      status: 'paused',
      taskName: "Keep a deleted member's loans attributed in the loan log",
      progress: 'migration written and applied to the dev copy; the loan log still reads the name from the member row',
    });
  });

  it('lists each differing field with both values and both file names, and never merges them', async () => {
    const context = buildPauseContext(await lendshed(), HANDOFF)!;
    expect(context.disagreements.map((row) => row.field)).toEqual(['task', 'status', 'nextAction']);
    const [task, status, next] = context.disagreements;
    expect(task.handoff).toEqual({ value: '3', file: 'HANDOFF.json' });
    expect(task.continueHere).toEqual({ value: '4', file: '.continue-here.md' });
    expect(status.handoff).toEqual({ value: 'paused', file: 'HANDOFF.json' });
    expect(status.continueHere).toEqual({ value: 'blocked', file: '.continue-here.md' });
    expect(next.handoff.value).toContain('Point the loan log at the name snapshot column');
    expect(next.continueHere.value).toContain('Start with: move the loan log read');
    // The total (6 in both) is not a disagreement.
    expect(context.disagreements.some((row) => row.field === 'totalTasks')).toBe(false);
    // The HANDOFF's wording leads and the note's own wording sits beside it.
    expect(context.nextAction).toEqual({
      text: 'Point the loan log at the name snapshot column, then rerun the loan log tests',
      file: 'HANDOFF.json',
    });
    expect(context.nextActionOther?.file).toBe('.continue-here.md');
    expect(context.nextActionOther?.text).toContain('Start with: move the loan log read');
  });

  it('opens the same page from the root continue-here address, still carrying both sides', async () => {
    const fromHandoff = buildPauseContext(await lendshed(), HANDOFF)!;
    const fromNote = buildPauseContext(await lendshed(), ROOT_NOTE)!;
    expect(fromNote.active).toBe('continue-here');
    expect(fromNote.files).toEqual(fromHandoff.files);
    expect(fromNote.disagreements).toEqual(fromHandoff.disagreements);
    expect(fromNote.stop).toEqual(fromHandoff.stop);
  });

  it('orders the gates: blocking human actions, then blocking constraints, then blocking anti-patterns', async () => {
    const context = buildPauseContext(await lendshed(), HANDOFF)!;
    expect(context.gates.map((gate) => gate.kind)).toEqual([
      'human-action',
      'human-action',
      'constraint',
      'constraint',
      'anti-pattern',
    ]);
    expect(context.gates[0]).toMatchObject({
      what: 'Confirm the retention window for disabled accounts',
      file: 'HANDOFF.json',
    });
    expect(context.gates[2]).toEqual({
      kind: 'constraint',
      what: 'No join on the member table',
      why: 'the loan log read must not join members for a name',
      how: 'read the snapshot column instead',
      file: '.continue-here.md',
    });
    expect(context.gates[4]).toMatchObject({ what: 'Joining a deleted row', file: '.continue-here.md' });
    // Non-blocking and advisory items go to the side, not the path.
    expect(context.sideNotes.map((note) => [note.kind, note.what])).toEqual([
      ['human-action', 'Review the wording of the cut-off confirmation'],
      ['anti-pattern', 'Re-running the old log tests'],
    ]);
  });

  it('carries behind (done, without the task in progress) and ahead (task rows and the plan row)', async () => {
    const context = buildPauseContext(await lendshed(), HANDOFF)!;
    expect(context.behind.map((row) => row.id)).toEqual(['1', '2']);
    expect(context.ahead.map((row) => row.id)).toEqual(['4', '5', '03-04']);
    expect(context.ahead[2].taskCount).toBe(2);
  });

  it('closes the rest of the handoff with the file each section came from', async () => {
    const context = buildPauseContext(await lendshed(), HANDOFF)!;
    const titles = context.restSections.map((section) => `${section.file}:${section.title}`);
    expect(titles).toEqual([
      'HANDOFF.json:Blockers',
      'HANDOFF.json:Decisions',
      'HANDOFF.json:Uncommitted files',
      'HANDOFF.json:Context notes',
      'HANDOFF.json:Other keys',
      '.continue-here.md:Current state',
      '.continue-here.md:Completed work',
      '.continue-here.md:Remaining work',
      '.continue-here.md:Decisions made',
      '.continue-here.md:Blockers',
      '.continue-here.md:Context',
    ]);
    const notes = context.restSections.find((section) => section.title === 'Context notes')!;
    expect(notes.text!.length).toBeGreaterThan(600);
    expect(notes.items).toBeNull();
    const files = context.restSections.find((section) => section.title === 'Uncommitted files')!;
    expect(files.items![0].text).toBe(' M server/db/migrations/0042_loan_name_snapshot.sql');
    expect(context.omitted).toBe(0);
  });
});

describe('buildPauseContext: the pause date and its source', () => {
  it('uses the HANDOFF timestamp first', async () => {
    const context = buildPauseContext(await lendshed(), HANDOFF)!;
    expect(context.pausedAt).toEqual({ iso: '2026-04-06T17:42:11.000Z', source: 'timestamp' });
  });

  it('uses paused_at for the older Shapes layout', async () => {
    const { presentation } = await loadShapesProject();
    const context = buildPauseContext(presentation, HANDOFF)!;
    expect(context.pausedAt).toEqual({ iso: '2026-05-09T16:40:00.000Z', source: 'paused_at' });
    expect(context.stop).toMatchObject({ task: 2, totalTasks: 5, status: 'paused', taskName: null });
    expect(context.behind).toEqual([]);
    expect(context.ahead).toEqual([]);
    expect(context.gates).toEqual([]);
    expect(context.nextAction?.text).toBe('Wire the cone field into the recipe form, then rerun the form tests');
    expect(context.headPhase).toEqual({ number: '2', name: 'Glaze recipes' });
  });

  it('pairs the older Shapes HANDOFF with its note, whose missing fields are not disagreements', async () => {
    const { presentation } = await loadShapesProject();
    const fromHandoff = buildPauseContext(presentation, HANDOFF)!;
    expect(fromHandoff.files.continueHere?.path).toBe(ROOT_NOTE);
    expect(fromHandoff.disagreements).toEqual([]);
    expect(fromHandoff.restSections.map((section) => section.title)).toContain('Continue here');
    const fromNote = buildPauseContext(presentation, ROOT_NOTE)!;
    expect(fromNote.files.handoff?.path).toBe(HANDOFF);
  });

  it('uses last_updated for a continue-here with no HANDOFF', async () => {
    const context = buildPauseContext(await lendshed(), SPIKE_NOTE)!;
    expect(context.pausedAt).toEqual({ iso: '2026-04-12T15:20:05.000Z', source: 'last_updated' });
  });

  it('falls to the note\'s date when the HANDOFF carries none', async () => {
    const copy = planted(await lendshed(), (draft) => {
      const handoff = draft.artifacts.find((artifact) => artifact.path === HANDOFF)!;
      const pause = handoff.structured.pause as { pausedAt?: string; pausedAtSource?: string };
      delete pause.pausedAt;
      delete pause.pausedAtSource;
    });
    expect(buildPauseContext(copy, HANDOFF)!.pausedAt).toEqual({ iso: '2026-04-06T18:05:40.000Z', source: 'last_updated' });
  });
});

describe('buildPauseContext: work has moved on', () => {
  it('names the root HANDOFF\'s phase 3 as behind the current phase, from STATE, kept apart from the handoff fields', async () => {
    const context = buildPauseContext(await lendshed(), HANDOFF)!;
    expect(context.movedOn).toEqual({
      what: 'Phase 3 Account Admin & Sessions is behind the current phase 4 Bulk Loan Export',
      source: 'STATE',
      date: '2026-04-14',
    });
    // The note is not one of the handoff's own fields.
    expect(context.stop.status).toBe('paused');
  });

  it('names ROADMAP when the roadmap\'s plan checklist marks the phase complete, with the newest summary day', async () => {
    const copy = planted(await lendshed(), (draft) => {
      const phase = draft.milestones.flatMap((m) => m.phases).find((p) => p.dirPath?.endsWith('03-account-admin-and-sessions'))!;
      phase.roadmapComplete = true;
      phase.plans = [
        { summary: { key: 'a', path: 'a', frontmatter: { completed: '2026-04-01' } } },
        { summary: { key: 'b', path: 'b', frontmatter: { completed: new Date('2026-04-09T00:00:00Z') } } },
      ] as never;
    });
    expect(buildPauseContext(copy, HANDOFF)!.movedOn).toEqual({
      what: 'Phase 3 Account Admin & Sessions is complete',
      source: 'ROADMAP',
      date: '2026-04-09',
    });
  });

  it('names STATE when the phase is complete on disk, with the state\'s last activity', async () => {
    const copy = planted(await lendshed(), (draft) => {
      const phase = draft.milestones.flatMap((m) => m.phases).find((p) => p.dirPath?.endsWith('03-account-admin-and-sessions'))!;
      phase.diskStatus = 'complete';
    });
    expect(buildPauseContext(copy, HANDOFF)!.movedOn).toMatchObject({ source: 'STATE', date: '2026-04-14' });
  });

  it('gives no note for a phase that is still open', async () => {
    const context = buildPauseContext(await lendshed(), PHASE_NOTE)!;
    expect(context.movedOn).toBeNull();
  });

  it("gives Lendshed's SPIKE-006 pause no note: the manifest has no row for spike 006", async () => {
    const presentation = await lendshed();
    expect(movedOnForSpike(presentation, 'SPIKE-006')).toBeNull();
    expect(buildPauseContext(presentation, SPIKE_NOTE)!.movedOn).toBeNull();
  });
});

describe('movedOnForSpike: the spike pause rule (RESEARCH A8, flagged)', () => {
  const MANIFEST = '.planning/spikes/MANIFEST.md';

  function withRow(presentation: ProjectPresentation, verdictKeyword: string, id = '006'): ProjectPresentation {
    return planted(presentation, (draft) => {
      const manifest = draft.artifacts.find((artifact) => artifact.path === MANIFEST)!;
      const lift = (manifest.structured.spikes as { manifest: { rows: Array<Record<string, unknown>> } }).manifest;
      lift.rows.push({ id, idea: 'kiosk-handover', name: 'restart-replay', type: 'standard', validates: '', verdictKeyword, verdictText: '', tags: [] });
    });
  }

  it.each(['VALIDATED', 'INVALIDATED', 'PARTIAL'])('reads %s as moved on, from the manifest', async (keyword) => {
    const copy = withRow(await lendshed(), keyword);
    const note = movedOnForSpike(copy, 'SPIKE-006');
    expect(note).toEqual({ what: `spike 006 restart-replay is marked ${keyword} in the manifest`, source: 'MANIFEST', date: null });
    // The pause page's context fills the same note for the SPIKE-006 pause.
    expect(buildPauseContext(copy, SPIKE_NOTE)!.movedOn).toEqual(note);
  });

  it('does not read PENDING, an unknown word or an empty verdict as moved on', async () => {
    for (const keyword of ['PENDING', 'DEFERRED', '']) {
      const copy = withRow(await lendshed(), keyword);
      expect(movedOnForSpike(copy, 'SPIKE-006'), keyword).toBeNull();
      expect(buildPauseContext(copy, SPIKE_NOTE)!.movedOn, keyword).toBeNull();
    }
  });

  it('finds the row by the id the folder names, however the folder is written', async () => {
    const presentation = await lendshed();
    expect(movedOnForSpike(presentation, '003b-local-disk-staging')?.what).toBe('spike 003b local-disk-staging is marked VALIDATED in the manifest');
    expect(movedOnForSpike(presentation, 'SPIKE-004')?.what).toBe('spike 004 object-store-staging is marked PARTIAL in the manifest');
    expect(movedOnForSpike(presentation, 'spike 2')?.what).toBe('spike 002 offline-ledger-queue is marked INVALIDATED in the manifest');
    expect(movedOnForSpike(presentation, 'no id here')).toBeNull();
  });

  it('gives null when the project has no readable manifest', async () => {
    const missing = planted(await lendshed(), (draft) => {
      draft.artifacts = draft.artifacts.filter((artifact) => artifact.path !== MANIFEST);
    });
    expect(movedOnForSpike(missing, '003b')).toBeNull();
    const unreadable = planted(await lendshed(), (draft) => {
      draft.artifacts.find((artifact) => artifact.path === MANIFEST)!.structured = {};
    });
    expect(movedOnForSpike(unreadable, '003b')).toBeNull();
  });
});

describe('buildPauseContext: nested pauses', () => {
  it('heads the phase-3 folder\'s note with phase 4 from its frontmatter, keeps the folder in the path, and pairs with nothing', async () => {
    const context = buildPauseContext(await lendshed(), PHASE_NOTE)!;
    expect(context.active).toBe('continue-here');
    expect(context.contextLabel).toBe('phase 4');
    expect(context.headPhase).toEqual({ number: '4', name: 'Bulk Loan Export' });
    expect(context.files.handoff).toBeNull();
    expect(context.files.continueHere?.path).toBe(PHASE_NOTE);
    expect(context.files.continueHere?.url).toBe('/v1.1/phase-3/continue-here');
    expect(context.disagreements).toEqual([]);
    expect(context.stop).toMatchObject({ task: 2, totalTasks: 5, status: 'in_progress', taskName: null });
    expect(context.pausedAt?.source).toBe('last_updated');
    expect(context.gates).toEqual([]);
  });

  it('heads a spike pause with its context, no phase, and no partner', async () => {
    const context = buildPauseContext(await lendshed(), SPIKE_NOTE)!;
    expect(context.contextLabel).toBe('spike SPIKE-006');
    expect(context.headPhase).toBeNull();
    expect(context.files.handoff).toBeNull();
    expect(context.files.continueHere?.path).toBe(SPIKE_NOTE);
    expect(context.stop).toMatchObject({ task: 1, totalTasks: 3, status: 'in_progress' });
    expect(context.nextAction?.file).toBe('.continue-here.md');
    expect(context.nextActionOther).toBeNull();
  });

  it('pairs the HANDOFF with the note in the folder its phase_dir names when there is no root note', async () => {
    const copy = planted(await lendshed(), (draft) => {
      draft.artifacts = draft.artifacts.filter((artifact) => artifact.path !== ROOT_NOTE);
    });
    const context = buildPauseContext(copy, HANDOFF)!;
    expect(context.files.continueHere?.path).toBe(PHASE_NOTE);
    // The note is phase 4's, so its fields are set against the HANDOFF's as disagreements, never merged.
    expect(context.disagreements.find((row) => row.field === 'task')).toMatchObject({
      handoff: { value: '3' },
      continueHere: { value: '2' },
    });
  });

  it('stands a note alone when the root HANDOFF names another phase', async () => {
    const context = buildPauseContext(await lendshed(), PHASE_NOTE)!;
    expect(context.files.handoff).toBeNull();
  });
});

describe('buildPauseContext: failure and hostile data', () => {
  it('gives null for a path that is not a pause file, a missing path and a broken presentation', async () => {
    const presentation = await lendshed();
    expect(buildPauseContext(presentation, '.planning/STATE.md')).toBeNull();
    expect(buildPauseContext(presentation, '.planning/nope.json')).toBeNull();
    expect(buildPauseContext({} as ProjectPresentation, HANDOFF)).toBeNull();
    expect(buildPauseContext(null as unknown as ProjectPresentation, HANDOFF)).toBeNull();
  });

  it('gives null for a pause file whose lift is absent (the page falls back to the document)', async () => {
    const copy = planted(await lendshed(), (draft) => {
      draft.artifacts.find((artifact) => artifact.path === HANDOFF)!.structured = {};
    });
    expect(buildPauseContext(copy, HANDOFF)).toBeNull();
  });

  it('reads malformed lift fields as empty and does not throw', async () => {
    const copy = planted(await lendshed(), (draft) => {
      const pause = draft.artifacts.find((artifact) => artifact.path === HANDOFF)!.structured.pause as Record<string, unknown>;
      pause.completed = 'x';
      pause.remaining = { not: 'a list' };
      pause.humanActions = null;
      pause.blockers = 7;
    });
    const context = buildPauseContext(copy, HANDOFF)!;
    expect(context.behind).toEqual([]);
    expect(context.ahead).toEqual([]);
    expect(context.gates.map((gate) => gate.kind)).toEqual(['constraint', 'constraint', 'anti-pattern']);
  });

  it('does not change the presentation it reads', async () => {
    const presentation = await lendshed();
    const before = JSON.stringify(presentation);
    buildPauseContext(presentation, HANDOFF);
    buildPauseContext(presentation, PHASE_NOTE);
    expect(JSON.stringify(presentation)).toBe(before);
  });
});
