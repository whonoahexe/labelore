// quick-260923-lju: composeContextBrief, built from literal ViewInput objects (never a real
// server round-trip — test/context-brief.test.ts covers the server extractor; the real-corpus e2e
// spec covers the two composed end to end).
import { describe, expect, it } from 'vitest';
import {
  composeContextBrief,
  formatCovers,
  formatGatheredDate,
} from '../../src/web/views/context-brief.ts';
import type { ContextBrief } from '../../src/planning-repo/handlers/context-brief.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';

function baseInput(brief: unknown, overrides: Partial<ViewInput> = {}): ViewInput {
  return {
    kind: 'context',
    frontmatter: {},
    structured: { brief },
    groups: [],
    planSegments: [],
    ...overrides,
  };
}

function minimalBrief(overrides: Partial<ContextBrief> = {}): ContextBrief {
  return {
    meta: { title: null, phase: '1', quickId: null, gathered: '2026-08-03', status: 'Ready for planning', preambleExtra: false },
    boundary: {
      eyebrow: 'Phase Boundary',
      statement: 'A statement.',
      statementRest: '',
      inList: [],
      outList: [],
      outFromProse: false,
      outSource: null,
      drift: false,
      blocks: [],
      notes: [],
      extras: [],
    },
    decisionsPreamble: [],
    areas: [],
    openQuestions: [],
    discretion: null,
    specifics: [],
    deferred: [],
    recognizedHeadings: ['Phase Boundary'],
    ...overrides,
  };
}

describe('composeContextBrief', () => {
  it('returns null when structured.brief is absent', () => {
    expect(composeContextBrief(baseInput(undefined))).toBeNull();
  });

  it('returns null when structured.brief is malformed', () => {
    expect(composeContextBrief(baseInput({ not: 'a brief' }))).toBeNull();
  });

  it('returns null when the brief has neither a boundary nor any area', () => {
    const brief = minimalBrief({ boundary: null, areas: [] });
    expect(composeContextBrief(baseInput(brief))).toBeNull();
  });

  it('builds the phase eyebrow with a zero-padded 2-digit phase and a formatted date', () => {
    const brief = minimalBrief();
    const composed = composeContextBrief(baseInput(brief));
    expect(composed?.intro.eyebrow).toBe('Context · Phase 01 · Gathered Aug 3, 2026');
  });

  it('builds the quick-task eyebrow', () => {
    const brief = minimalBrief({
      meta: { title: null, phase: null, quickId: '260923-jxp', gathered: '2026-09-23', status: null, preambleExtra: false },
    });
    const composed = composeContextBrief(baseInput(brief));
    expect(composed?.intro.eyebrow).toBe('Context · Quick task 260923-jxp · Gathered Sep 23, 2026');
  });

  it('formatCovers collapses a 6-item same-prefix run and returns null for empty', () => {
    expect(formatCovers(['AUTH-01', 'AUTH-02', 'AUTH-03', 'AUTH-04', 'AUTH-05', 'AUTH-06'])).toBe('AUTH-01 … AUTH-06');
    expect(formatCovers([])).toBeNull();
    expect(formatCovers(null)).toBeNull();
  });

  it('formatGatheredDate turns an ISO date into Mon D, YYYY without a locale API', () => {
    expect(formatGatheredDate('2026-08-03')).toBe('Aug 3, 2026');
    expect(formatGatheredDate('not-a-date')).toBe('not-a-date');
    expect(formatGatheredDate(null)).toBeNull();
  });

  it('gives "Ready for planning" the complete tone and any other status the quiet tone', () => {
    const ready = composeContextBrief(baseInput(minimalBrief()));
    expect(ready?.intro.status).toEqual({ label: 'Ready for planning', tone: 'complete' });
    const other = composeContextBrief(
      baseInput(minimalBrief({ meta: { ...minimalBrief().meta, status: 'Draft' } })),
    );
    expect(other?.intro.status).toEqual({ label: 'Draft', tone: 'quiet' });
  });

  it('puts the rest under the statement when inList is non-empty, and omits the In card content when both are empty', () => {
    const withIn = composeContextBrief(
      baseInput(minimalBrief({ boundary: { ...minimalBrief().boundary!, inList: ['a', 'b'] } })),
    );
    expect(withIn?.boundary?.inList).toEqual(['a', 'b']);

    const withoutIn = composeContextBrief(baseInput(minimalBrief()));
    expect(withoutIn?.boundary?.inList).toEqual([]);
  });

  it('gives every decision a unique id, even across duplicate tags', () => {
    const brief = minimalBrief({
      areas: [
        {
          title: 'Area A',
          entries: [
            { kind: 'decision', tag: 'D-01', summary: 's1', detail: '', reversibility: null },
            { kind: 'decision', tag: 'D-01', summary: 's2', detail: '', reversibility: null },
            { kind: 'decision', tag: null, summary: 's3', detail: '', reversibility: null },
          ],
        },
      ],
    });
    const composed = composeContextBrief(baseInput(brief));
    const ids = composed!.areas[0].entries.map((e) => (e.kind === 'decision' ? e.decision.id : null));
    expect(new Set(ids).size).toBe(3);
  });

  it('flags a costly/one-way/irreversible reversibility as hard to undo, and nothing else', () => {
    const brief = minimalBrief({
      areas: [
        {
          title: 'Area A',
          entries: [
            {
              kind: 'decision',
              tag: 'D-01',
              summary: 's',
              detail: '',
              reversibility: { word: 'costly', text: 'costly — expensive to undo.' },
            },
            {
              kind: 'decision',
              tag: 'D-02',
              summary: 's',
              detail: '',
              reversibility: { word: 'reversible', text: 'reversible — cheap to undo.' },
            },
          ],
        },
      ],
    });
    const composed = composeContextBrief(baseInput(brief));
    const [d1, d2] = composed!.areas[0].entries.map((e) => (e.kind === 'decision' ? e.decision : null));
    expect(d1?.reversibility?.hardToUndo).toBe(true);
    expect(d2?.reversibility?.hardToUndo).toBe(false);
  });

  it('formats the phase-requirement Covers note from ViewInput.phaseRequirementIds', () => {
    const composed = composeContextBrief(
      baseInput(minimalBrief(), { phaseRequirementIds: ['AUTH-01', 'AUTH-02'] }),
    );
    expect(composed?.intro.covers).toBe('AUTH-01 · AUTH-02');
  });
});
