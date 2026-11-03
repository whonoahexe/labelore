// 09-04: STATE.md's Session Continuity, Deferred Items and Operator Next Steps as one capped projection.
// Planted payloads go through the real reader; the growth cases use a hand-built presentation so the
// cost measured is the scanner's, not the repository's.
import { describe, expect, it } from 'vitest';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { buildStateSession } from '../../src/presentation/state-session.ts';
import { loadFiles, loadFixtureProject } from '../helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from '../helpers/growth.ts';

const STATE_FRONT = '---\ngsd_state_version: "1.0"\nstatus: executing\n---\n\n# Project State\n\n';
const PHASE_FILE = '---\nphase: 09\n---\n# UI spec\n';

async function sessionOf(stateBody: string, extra: Record<string, string> = {}) {
  const { presentation } = await loadFiles({
    '.planning/STATE.md': STATE_FRONT + stateBody,
    ...extra,
  });
  return buildStateSession(presentation);
}

/** A presentation with only a root STATE.md whose sections are given, for the scanner growth cases. */
function stub(sections: { heading: string; body: string }[]): ProjectPresentation {
  return {
    readAt: '2026-11-03T12:00:00.000Z',
    artifacts: [
      {
        key: '/state',
        path: '.planning/STATE.md',
        kind: 'state',
        location: 'root',
        structured: { sections },
      },
    ],
  } as unknown as ProjectPresentation;
}

describe('buildStateSession', () => {
  it('reads Session Continuity and resolves the resume file to an artifact address', async () => {
    const session = await sessionOf(
      '## Session Continuity\n\nLast session: 2026-11-02T09:31:34.792Z\nStopped at: Phase 9 UI-SPEC approved\nResume file: .planning/phases/09-x/09-UI-SPEC.md\n',
      { '.planning/phases/09-x/09-UI-SPEC.md': PHASE_FILE },
    );
    expect(session).not.toBeNull();
    expect(session?.stoppedAt).toBe('Phase 9 UI-SPEC approved');
    expect(session?.lastSession).toBe('2026-11-02T09:31:34.792Z');
    expect(session?.lastSessionLabel).toMatch(/^\d{1,2} Nov( \d{4})?$/);
    expect(session?.resumeFile?.path).toBe('.planning/phases/09-x/09-UI-SPEC.md');
    expect(session?.resumeFile?.url).toMatch(/\/ui-spec$/);
    expect(session?.operatorSteps).toEqual([]);
    expect(session?.deferredCount).toBeNull();
    expect(session?.deferredUrl).toBeNull();
    expect(session?.stepsUrl).toBeNull();
  });

  it('shows a resume path that matches no artifact as plain text, with no address', async () => {
    const session = await sessionOf('## Session Continuity\n\nResume file: https://evil.example/x.md\n');
    expect(session?.resumeFile).toEqual({ path: 'https://evil.example/x.md', url: null });
    const missing = await sessionOf('## Session Continuity\n\nResume file: .planning/phases/nope/NOPE.md\n');
    expect(missing?.resumeFile?.url).toBeNull();
  });

  it('accepts a leading ./ and a path without the .planning/ prefix', async () => {
    const files = { '.planning/phases/09-x/09-UI-SPEC.md': PHASE_FILE };
    const dotted = await sessionOf('## Session Continuity\n\nResume file: ./.planning/phases/09-x/09-UI-SPEC.md\n', files);
    const bare = await sessionOf('## Session Continuity\n\nResume file: phases/09-x/09-UI-SPEC.md\n', files);
    expect(dotted?.resumeFile?.url).toMatch(/\/ui-spec$/);
    expect(bare?.resumeFile?.url).toBe(dotted?.resumeFile?.url);
  });

  it('counts the Deferred Items data rows and ignores blank ones', async () => {
    const session = await sessionOf(
      '## Deferred Items\n\n| A | B |\n|---|---|\n| one | x |\n| two | y |\n|  |  |\n| three | z |\n',
    );
    expect(session?.deferredCount).toBe(3);
    expect(session?.stoppedAt).toBeNull();
    expect(session?.resumeFile).toBeNull();
  });

  it('gives a null deferred count for a Deferred Items section with no table', async () => {
    const session = await sessionOf('## Deferred Items\n\nNothing deferred.\n');
    expect(session?.deferredCount).toBeNull();
  });

  it('takes the Operator Next Steps top-level bullets in order', async () => {
    const session = await sessionOf(
      '## Operator Next Steps\n\n- First step\n  - nested detail\n- Second step\n* Third step\n',
    );
    expect(session?.operatorSteps).toEqual(['First step', 'Second step', 'Third step']);
  });

  it('is null with none of the three sections', async () => {
    expect(await sessionOf('## Current Position\n\nPhase: 1\n')).toBeNull();
    const { presentation } = await loadFiles({ '.planning/PROJECT.md': '# P\n' });
    expect(buildStateSession(presentation)).toBeNull();
  });

  it('builds the source address and the heading anchors from sourceUrlOf and stableSlug', async () => {
    const session = await sessionOf(
      '## Deferred Items\n\n| A |\n|---|\n| one |\n\n## Operator Next Steps\n\n- Do it\n\n## Session Continuity\n\nStopped at: here\n',
    );
    expect(session?.sourceUrl).toBe('/state?source=1');
    expect(session?.deferredUrl).toBe('/state?source=1#deferred-items');
    expect(session?.stepsUrl).toBe('/state?source=1#operator-next-steps');
  });

  it('matches headings case-insensitively and leaves a STATE.md below the root alone', async () => {
    const session = await sessionOf('## SESSION CONTINUITY\n\nStopped at: shouting\n');
    expect(session?.stoppedAt).toBe('shouting');
    const { presentation } = await loadFiles({
      '.planning/research/STATE.md': '## Session Continuity\n\nStopped at: not the project state\n',
    });
    expect(buildStateSession(presentation)).toBeNull();
  });

  it('reads the Lendshed fixture', async () => {
    const { presentation } = await loadFixtureProject();
    const session = buildStateSession(presentation);
    expect(session?.stoppedAt).toBe('Phase 04 UI-SPEC reviewed, export wave 2 next');
    expect(session?.lastSessionLabel).toMatch(/^14 Apr( 2026)?$/);
    expect(session?.resumeFile?.url).toBe('/v1.1/phase-4/ui-spec');
    expect(session?.operatorSteps).toHaveLength(2);
    expect(session?.deferredCount).toBe(3);
  });

  it('finishes a 200k-character Session Continuity line and a 10,000-row table, every field capped', () => {
    const huge = 'x'.repeat(200_000);
    const rows = Array.from({ length: 10_000 }, (_, i) => `| item ${i} | open |`).join('\n');
    const steps = Array.from({ length: 10_000 }, (_, i) => `- step ${i}`).join('\n');
    const session = buildStateSession(
      stub([
        { heading: 'Session Continuity', body: `Stopped at: ${huge}\nResume file: ${huge}\nLast session: ${huge}` },
        { heading: 'Deferred Items', body: `| A | B |\n|---|---|\n${rows}` },
        { heading: 'Operator Next Steps', body: steps },
      ]),
    );
    expect(session).not.toBeNull();
    expect(session?.stoppedAt?.length ?? 0).toBeLessThanOrEqual(400);
    expect(session?.lastSession?.length ?? 0).toBeLessThanOrEqual(400);
    expect(session?.resumeFile?.path.length ?? 0).toBeLessThanOrEqual(400);
    expect(session?.operatorSteps.length).toBeLessThanOrEqual(20);
    expect(session?.deferredCount ?? 0).toBeLessThanOrEqual(10_000);
  });

  it('survives malformed sections without throwing', () => {
    const presentation = {
      readAt: '2026-11-03T12:00:00.000Z',
      artifacts: [
        {
          key: '/state',
          path: '.planning/STATE.md',
          kind: 'state',
          location: 'root',
          structured: { sections: [null, 7, { heading: 3 }, { heading: 'Session Continuity', body: null }] },
        },
      ],
    } as unknown as ProjectPresentation;
    expect(buildStateSession(presentation)).toBeNull();
  });

  it('scans in time that grows linearly with the section body', () => {
    const growth = measureGrowth({
      make: (n) => {
        const rows = Array.from({ length: Math.max(1, Math.floor(n / 20)) }, (_, i) => `| row ${i} | x |`).join('\n');
        return stub([
          { heading: 'Session Continuity', body: `Stopped at: ${'y'.repeat(Math.min(n, 1500))}\n${'z\n'.repeat(Math.floor(n / 2))}` },
          { heading: 'Deferred Items', body: `| A | B |\n|---|---|\n${rows}` },
          { heading: 'Operator Next Steps', body: '- step\n'.repeat(Math.floor(n / 8)) },
        ]);
      },
      run: (presentation) => {
        buildStateSession(presentation);
      },
      startSize: 200,
      maxSize: 2400,
      floorMs: 0,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});
