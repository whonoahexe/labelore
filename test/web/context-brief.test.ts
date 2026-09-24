// quick-260923-lju: composeContextBrief, built from literal ViewInput objects (never a real
// server round-trip — test/context-brief.test.ts covers the server extractor; the real-corpus e2e
// spec covers the two composed end to end).
import { describe, expect, it } from 'vitest';
import {
  composeContextBrief,
  formatCovers,
  formatGatheredDate,
} from '../../src/web/views/context-brief.ts';
import { extractContextBrief } from '../../src/planning-repo/handlers/context-brief.ts';
import type { ContextBrief } from '../../src/planning-repo/handlers/context-brief.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';

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
    amendments: [],
    references: [],
    codeInsights: [],
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

// ---------------------------------------------------------------------------
// asides — amendments end to end (quick-260925-3ob, Task 1)
// ---------------------------------------------------------------------------

const AMENDMENTS_DOC = `# Phase 1: Test - Context

<domain>
## Phase Boundary

A statement about scope.

</domain>

<blocking_amendments>
## ⚠️ Requirement amendments this discussion forces

**The planner must not plan against the current wording of these.**

| Document | Change |
|---|---|
| REQUIREMENTS.md — X | Reword this. |
| ROADMAP.md — Y | Reword that. |

Resolve these before planning.

</blocking_amendments>

<decisions>
## Implementation Decisions

### Area One

- **D-01:** A decision summary.

</decisions>
`;

const NO_AMENDMENTS_DOC = `# Phase 1: Test - Context

<domain>
## Phase Boundary

A statement about scope.

</domain>

<decisions>
## Implementation Decisions

### Area One

- **D-01:** A decision summary.

</decisions>
`;

const TAGGED_AMENDMENTS_DOC = `# Phase 4: Test - Context

<domain>
## Phase Boundary

A statement about scope.

</domain>

<blocking_amendments>
## ⚠️ One research recommendation is superseded — do not inherit it

Do not inherit the superseded recommendation.

</blocking_amendments>

<decisions>
## Implementation Decisions

### Area One

- **D-01:** A decision summary.

</decisions>
`;

const HEADING_ONLY_AMENDMENTS_DOC = `# Phase 5: Test - Context

<domain>
## Phase Boundary

A statement about scope.

</domain>

## Requirement amendments

Fix this before planning.

<decisions>
## Implementation Decisions

### Area One

- **D-01:** A decision summary.

</decisions>
`;

function groupsFor(headings: (string | null)[]): DocumentSectionGroup[] {
  return headings.map((heading) => ({ id: null, heading, html: '<p>x</p>' }));
}

describe('asides — amendments end to end', () => {
  it('composes exactly one quiet amendments aside with an emoji-free label, count and untitled group', () => {
    const brief = extractContextBrief(AMENDMENTS_DOC);
    const groups = groupsFor(['Phase Boundary', '⚠️ Requirement amendments this discussion forces', 'Implementation Decisions']);
    const composed = composeContextBrief(baseInput(brief, { groups }));

    expect(composed?.asides).toHaveLength(1);
    const aside = composed!.asides[0];
    expect(aside.id).toBe('context-amendments');
    expect(aside.kind).toBe('amendments');
    expect(aside.label).toBe('Requirement amendments this discussion forces');
    expect(aside.count).toBe(2);
    expect(aside.hint).toBeNull();
    expect(aside.groups).toHaveLength(1);
    expect(aside.groups[0].title).toBeNull();
    expect(aside.groups[0].blocks.map((b) => b.kind)).toEqual(['paragraph', 'table', 'paragraph']);
  });

  it('drops the amendments section out of extras', () => {
    const brief = extractContextBrief(AMENDMENTS_DOC);
    const groups = groupsFor(['Phase Boundary', '⚠️ Requirement amendments this discussion forces', 'Implementation Decisions']);
    const composed = composeContextBrief(baseInput(brief, { groups }));

    expect(composed?.extras.some((e) => (e.heading ?? '').toLowerCase().includes('amendments'))).toBe(false);
  });

  it('gives no asides when the document has no amendments section', () => {
    const brief = extractContextBrief(NO_AMENDMENTS_DOC);
    const groups = groupsFor(['Phase Boundary', 'Implementation Decisions']);
    const composed = composeContextBrief(baseInput(brief, { groups }));

    expect(composed?.asides).toEqual([]);
  });

  it('recognises a <blocking_amendments> section by its tag when the heading does not say "requirement amendments"', () => {
    const brief = extractContextBrief(TAGGED_AMENDMENTS_DOC);
    const groups = groupsFor(['Phase Boundary', '⚠️ One research recommendation is superseded — do not inherit it', 'Implementation Decisions']);
    const composed = composeContextBrief(baseInput(brief, { groups }));

    expect(composed?.asides).toHaveLength(1);
    expect(composed!.asides[0].label).toBe('One research recommendation is superseded — do not inherit it');
  });

  it('still composes non-null with no asides when the amendments key is absent from the payload', () => {
    const brief = minimalBrief();
    delete (brief as Partial<ContextBrief>).amendments;
    const composed = composeContextBrief(baseInput(brief));

    expect(composed).not.toBeNull();
    expect(composed?.asides).toEqual([]);
  });

  it('recognises a heading-only "## Requirement amendments" with no tag', () => {
    const brief = extractContextBrief(HEADING_ONLY_AMENDMENTS_DOC);
    const groups = groupsFor(['Phase Boundary', 'Requirement amendments', 'Implementation Decisions']);
    const composed = composeContextBrief(baseInput(brief, { groups }));

    expect(composed?.asides).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// asides — canonical references and existing code insights (quick-260925-3ob, Task 2)
// ---------------------------------------------------------------------------

const TWO_REFERENCES_SECTIONS_DOC = `# Phase 1: Test - Context

<domain>
## Phase Boundary

A statement.

</domain>

<canonical_refs>
## Canonical References

### Group A
- \`path/a.ts\` — nice

</canonical_refs>

## Canonical References

### Group B
- \`path/b.ts\` — nice

<code_context>
## Existing Code Insights

### Group C
- item

</code_context>

<decisions>
## Implementation Decisions

### Area One

- **D-01:** A decision.

</decisions>
`;

describe('asides — canonical references and existing code insights', () => {
  it('emits asides in order amendments, references, code, merging two references sections into one', () => {
    const brief = extractContextBrief(TWO_REFERENCES_SECTIONS_DOC);
    const groups = groupsFor([
      'Phase Boundary',
      'Canonical References',
      'Canonical References',
      'Existing Code Insights',
      'Implementation Decisions',
    ]);
    const composed = composeContextBrief(baseInput(brief, { groups }));

    expect(composed?.asides.map((a) => a.kind)).toEqual(['references', 'code']);

    const references = composed!.asides[0];
    expect(references.id).toBe('context-references');
    expect(references.label).toBe('Canonical references');
    expect(references.groups.map((g) => g.title)).toEqual(['Group A', 'Group B']);
    expect(references.count).toBe(2);
    expect(references.hint).toBe('Group A · Group B');

    const code = composed!.asides[1];
    expect(code.id).toBe('context-code');
    expect(code.label).toBe('Existing code insights');
    expect(code.groups.map((g) => g.title)).toEqual(['Group C']);
    expect(code.count).toBe(1);
    expect(code.hint).toBe('Group C');
  });

  it('gives no references aside when references is empty, composes non-null when references/codeInsights are absent, and has no more key', () => {
    const emptyRefs = composeContextBrief(baseInput(minimalBrief({ references: [] })));
    expect(emptyRefs?.asides.some((a) => a.kind === 'references')).toBe(false);

    const brief = minimalBrief();
    delete (brief as Partial<ContextBrief>).references;
    delete (brief as Partial<ContextBrief>).codeInsights;
    const composed = composeContextBrief(baseInput(brief));
    expect(composed).not.toBeNull();
    expect(composed).not.toHaveProperty('more');
  });

  it('never lets a Canonical References / Existing Code Insights group leak into extras', () => {
    const brief = extractContextBrief(TWO_REFERENCES_SECTIONS_DOC);
    const groups = groupsFor([
      'Phase Boundary',
      'Canonical References',
      'Canonical References',
      'Existing Code Insights',
      'Implementation Decisions',
    ]);
    const composed = composeContextBrief(baseInput(brief, { groups }));
    expect(composed?.extras.some((e) => /canonical references|existing code insights/i.test(e.heading ?? ''))).toBe(false);
  });
});
