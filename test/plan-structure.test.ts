// quick-261006-iz6 (QKIZ6-01, T-iz6-01): the PLAN projection over a synthetic body that uses every
// shape — objective splits, every task type, files given inline and as a list, verify variants, list
// leads and continuations, source-only children, nested unknown blocks, loose headings, a stray
// closing tag — plus the degrade cases and the timing guard. The corpus values are pinned in
// test/web/plan-navigator-corpus.test.ts.
import { describe, expect, it } from 'vitest';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';
import { segmentPlanBody } from '../src/rendering/plan-segments.ts';
import { extractPlanStructure } from '../src/planning-repo/handlers/plan-structure.ts';

const BODY = `<objective>
Wire the **B: navigator** into \`a.b. c\` end to end. It also covers the rest.

Purpose: Make plans legible.
Output: A page, a handler and tests.
</objective>

<context>
@.planning/STATE.md
@src/a.ts

<winner_spec>
Nested unknown block.
</winner_spec>
</context>

<execution_context>
@~/gsd/workflows/execute-plan.md
</execution_context>

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Tracer slice</name>
  <files>src/a.ts, src/b.ts (new), \`src/c.ts\` — note</files>
  <read_first>
    - src/a.ts
  </read_first>
  <behavior>
    Tests first:
    - one
    - two
      continues here
    - [ ] three
  </behavior>
  <action>
    Do the first thing.

    Then another thing.
  </action>
  <reversibility rating="costly">Re-adding is expensive.</reversibility>
  <verify>
    <automated>npm test</automated>
    <fails_when>the suite is red</fails_when>
    <human-check>Look at it.</human-check>
  </verify>
  <acceptance_criteria>
    - It works
    - It also works
  </acceptance_criteria>
  <done>Tracer is in.</done>
</task>

<task type="auto">
  <name>Plain verify</name>
  <files>
    - \`src/d.ts\`
    - src/e.ts
  </files>
  <action>Short action.</action>
  <verify>npm run typecheck</verify>
  <pre-condition>Server is up.</pre-condition>
  <weird-extra>Something unexpected.</weird-extra>
</task>

<task type="checkpoint:decision" gate="blocking">
  <name>Task 3: Pick one</name>
  <decision>Choose a shape.</decision>
  <context>Because it is one-way.</context>
  <options>Proceed — persist it; Stop — go back because of DL-08.</options>
  <resume-signal>Reply proceed.</resume-signal>
</task>

<task type="checkpoint:decision" gate="blocking">
  <name>Pick structured</name>
  <decision>Choose.</decision>
  <options>
    <option id="a">
      <name>Alpha</name>
      <pros>Fast.</pros>
      <cons>Brittle.</cons>
    </option>
    <option id="b">
      <name>Beta</name>
    </option>
  </options>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    A visual pass over \`nav.tsx\` only: an underline and a ring.
  </what-built>
  <how-to-verify>
    Open the page and look.
  </how-to-verify>
  <resume-signal>Type approved.</resume-signal>
</task>

<task type="checkpoint:human-action" gate="blocking-human">
  <name>Cut over</name>
  <reversibility rating="one-way">Cannot be undone.</reversibility>
  <instructions>
    1. Do this.
    2. Do that.
  </instructions>
  <verification>It works afterwards.</verification>
  <after-resume>Then continue.</after-resume>
</task>

<task>
  <name>No type</name>
</task>

<task type="mystery">
  <name>Unknown type</name>
</task>

</tasks>

<verification>
Run at the end:

1. \`npm test\` — green.
2. \`npm run typecheck\`
</verification>

<success_criteria>
The page reads well and nothing is hidden for the reader on the final tree.
</success_criteria>

<threat_model>
| ID | Threat |
</threat_model>

<output>
Create the summary.
</output>

<!-- a comment that is ignored -->

## Artifacts this phase produces

Some notes after the output.

</tool_result>
`;

describe('extractPlanStructure — the synthetic body', () => {
  const plan = extractPlanStructure(BODY);

  it('splits the objective into a plain title, the rest, why and you-get', () => {
    expect(plan.objective).not.toBeNull();
    // The `:` inside the bold run and the `.` inside the code span do not end the sentence.
    expect(plan.objective?.title).toBe('Wire the B: navigator into a.b. c end to end');
    expect(plan.objective?.rest).toEqual([{ kind: 'paragraph', text: 'It also covers the rest.' }]);
    expect(plan.objective?.why).toEqual([{ kind: 'paragraph', text: 'Make plans legible.' }]);
    expect(plan.objective?.youGet).toEqual([{ kind: 'paragraph', text: 'A page, a handler and tests.' }]);
  });

  it('reads an objective whose labels sit inline after the sentence', () => {
    const inline = extractPlanStructure(
      '<objective>\nPersist the contract. Purpose: Make archives auditable. Output: Migration, tests.\n</objective>',
    );
    expect(inline.objective?.title).toBe('Persist the contract');
    expect(inline.objective?.rest).toEqual([]);
    expect(inline.objective?.why).toEqual([{ kind: 'paragraph', text: 'Make archives auditable.' }]);
    expect(inline.objective?.youGet).toEqual([{ kind: 'paragraph', text: 'Migration, tests.' }]);
  });

  it('reads every task with its type, flags and name', () => {
    expect(plan.tasks.map((task) => task.type)).toEqual([
      'tracer',
      'auto',
      'checkpoint:decision',
      'checkpoint:decision',
      'checkpoint:human-verify',
      'checkpoint:human-action',
      'auto',
      'mystery',
    ]);
    expect(plan.tasks.map((task) => task.tdd)).toEqual([true, false, false, false, false, false, false, false]);
    expect(plan.tasks[2].gate).toBe('blocking');
    expect(plan.tasks[5].gate).toBe('blocking-human');
    expect(plan.tasks.map((task) => task.name)).toEqual([
      'Tracer slice',
      'Plain verify',
      'Pick one',
      'Pick structured',
      // No <name>: derived from what-built up to the first colon.
      'A visual pass over `nav.tsx` only',
      'Cut over',
      'No type',
      'Unknown type',
    ]);
  });

  it('reads files given inline with notes and as a backticked bullet list', () => {
    expect(plan.tasks[0].files).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    expect(plan.tasks[1].files).toEqual(['src/d.ts', 'src/e.ts']);
  });

  it('reads verify as commands, failure lines and checks, or as plain text', () => {
    expect(plan.tasks[0].fields.verify?.items).toEqual([
      { kind: 'automated', text: 'npm test' },
      { kind: 'fails_when', text: 'the suite is red' },
      { kind: 'human-check', text: 'Look at it.' },
    ]);
    expect(plan.tasks[1].fields.verify?.items).toEqual([{ kind: 'text', text: 'npm run typecheck' }]);
  });

  it('keeps a behavior lead apart and joins a continuation line and a checkbox item', () => {
    const behavior = plan.tasks[0].fields.behavior;
    expect(behavior?.lead).toBe('Tests first:');
    expect(behavior?.items).toEqual(['one', 'two continues here', 'three']);
    expect(plan.tasks[0].fields.acceptance?.items).toEqual(['It works', 'It also works']);
    expect(plan.tasks[0].fields.done?.text).toBe('Tracer is in.');
  });

  it('reads the action as blocks with counts, and the reversibility rating from the tag', () => {
    const action = plan.tasks[0].fields.action;
    expect(action?.blocks).toEqual([
      { kind: 'paragraph', text: 'Do the first thing.' },
      { kind: 'paragraph', text: 'Then another thing.' },
    ]);
    expect(action?.words).toBe(7);
    expect(plan.tasks[0].fields.reversibility).toMatchObject({ rating: 'costly', text: 'Re-adding is expensive.' });
    expect(plan.tasks[5].fields.reversibility?.rating).toBe('one-way');
  });

  it('reads inline options on ; and a dash, and structured options with name / pros / cons', () => {
    expect(plan.tasks[2].fields.options?.items).toEqual([
      { name: 'Proceed', description: 'persist it', pros: null, cons: null },
      { name: 'Stop', description: 'go back because of DL-08', pros: null, cons: null },
    ]);
    expect(plan.tasks[3].fields.options?.items).toEqual([
      { name: 'Alpha', description: null, pros: 'Fast.', cons: 'Brittle.' },
      { name: 'Beta', description: null, pros: null, cons: null },
    ]);
    expect(plan.tasks[2].fields.decision?.text).toBe('Choose a shape.');
    expect(plan.tasks[2].fields.context?.blocks).toEqual([{ kind: 'paragraph', text: 'Because it is one-way.' }]);
  });

  it('keeps read_first, pre-condition, resume-signal and unknown children as source children, in order', () => {
    expect(plan.tasks[0].sourceChildren.map((child) => child.tag)).toEqual(['read_first']);
    expect(plan.tasks[1].sourceChildren.map((child) => child.tag)).toEqual(['pre-condition', 'weird-extra']);
    expect(plan.tasks[4].sourceChildren.map((child) => child.tag)).toEqual(['resume-signal']);
    expect(plan.tasks[5].sourceChildren.map((child) => child.tag)).toEqual(['after-resume']);
    expect(plan.tasks[5].fields.instructions?.blocks).toEqual([
      { kind: 'list', ordered: true, items: ['Do this.', 'Do that.'] },
    ]);
    expect(plan.tasks[5].fields.verification?.blocks).toEqual([{ kind: 'paragraph', text: 'It works afterwards.' }]);
  });

  it('reads done when from the top-level lists only', () => {
    expect(plan.success?.items).toEqual(['The page reads well and nothing is hidden for the reader on the final tree.']);
    expect(plan.verification).toMatchObject({ lead: 'Run at the end:', items: ['`npm test` — green.', '`npm run typecheck`'] });
  });

  it('names the blocks outside the tasks, including those nested in context, in document order', () => {
    expect(plan.sourceBlocks.map((block) => block.tag)).toEqual([
      'context',
      'winner_spec',
      'execution_context',
      'threat_model',
      'output',
    ]);
    expect(plan.sourceBlocks[0].fileCount).toBe(2);
    expect(plan.sourceBlocks[2].fileCount).toBe(1);
    expect(plan.sourceBlocks[1].fileCount).toBeNull();
  });

  it('notes the loose heading and drops the comment', () => {
    // The stray closing tag is a wrapper warning, not a note; the trailing prose sits under the heading.
    expect(plan.loose).toEqual([{ kind: 'heading', heading: 'Artifacts this phase produces' }]);
    expect(plan.wrapperWarnings).toBe(1);
  });

  it('records for every anchor the offset of its own segment', () => {
    const segments = segmentPlanBody(BODY).filter((segment) => !segment.malformed);
    const offsets = new Set(segments.map((segment) => `plan-at-${segment.start}`));
    const anchors: string[] = [];
    if (plan.objective) anchors.push(plan.objective.anchor);
    for (const task of plan.tasks) {
      anchors.push(task.anchor, ...task.sourceChildren.map((child) => child.anchor));
      for (const field of Object.values(task.fields)) if (field) anchors.push(field.anchor);
    }
    for (const block of plan.sourceBlocks) anchors.push(block.anchor);
    if (plan.success) anchors.push(plan.success.anchor);
    if (plan.verification) anchors.push(plan.verification.anchor);
    expect(anchors.length).toBeGreaterThan(30);
    for (const anchor of anchors) expect(offsets.has(anchor), anchor).toBe(true);
    const tasks = segments.filter((segment) => segment.tag === 'task');
    expect(plan.tasks.map((task) => task.anchor)).toEqual(tasks.map((segment) => `plan-at-${segment.start}`));
  });

  it('puts a prose note after the output under a trailing note when no heading follows', () => {
    const trailing = extractPlanStructure('<objective>\nGo.\n</objective>\n\n<output>\nx\n</output>\n\nSome trailing prose.\n');
    expect(trailing.loose).toEqual([{ kind: 'trailing', heading: null }]);
    const between = extractPlanStructure('<objective>\nGo.\n</objective>\n\nProse between.\n\n<output>\nx\n</output>\n');
    expect(between.loose).toEqual([{ kind: 'between', heading: null }]);
  });
});

describe('extractPlanStructure — degrade, never throw', () => {
  it('gives zero tasks for an empty body, prose only, an unclosed task and a prose-only <tasks>', () => {
    for (const body of [
      '',
      'Just some prose with no wrappers at all.\n',
      '<tasks>\n<task type="auto">\n<name>Never closed</name>\n</tasks>\n',
      '<tasks>\nOnly prose in here.\n</tasks>\n',
    ]) {
      const plan = extractPlanStructure(body);
      expect(plan.tasks).toEqual([]);
    }
    expect(extractPlanStructure('<tasks>\n<task type="auto">\n<name>Never closed</name>\n</tasks>\n').wrapperWarnings).toBe(1);
  });

  // Four pathological shapes, each scaled by a character count n in the proportions the old 1 MB
  // fixed-budget test used. The cost may grow with n, but no faster than linearly.
  const pathological: Array<[string, (n: number) => string]> = [
    ['an unclosed run of <a', (n) => `<objective>\nGo.\n</objective>\nx\n${'<a '.repeat(Math.floor(n * 0.4))}\n${'y'.repeat(Math.floor(n * 0.6))}`],
    ['a run of unclosed code spans', (n) => `${'``<a '.repeat(Math.floor(n / 10))}\n${'z'.repeat(Math.floor(n * 0.6))}`],
    ['one very long tag name', (n) => `<${'a'.repeat(Math.floor(n * 0.4))}\n${'b'.repeat(Math.floor(n * 0.6))}`],
    ['thousands of short unclosed tags', (n) => '<x>\n'.repeat(Math.max(1, Math.floor(n / 25)))],
  ];

  it.each(pathological)('extracts %s no faster than linearly', (name, make) => {
    const growth = measureGrowth({ make, run: (body) => void extractPlanStructure(body) });
    expect(growth.ratio, `${name}: ${growth.t1.toFixed(2)}ms at ${growth.n} characters, ${growth.t2.toFixed(2)}ms at 8x`).toBeLessThan(GROWTH_LIMIT);
  });
});

// quick-261016-ujo: a task's Read first entries and resume signal, read tolerantly from its own children.
describe('extractPlanStructure — readFirst and resumeSignal (quick-261016-ujo)', () => {
  const task = (children: string, type = 'auto'): ReturnType<typeof extractPlanStructure>['tasks'][number] =>
    extractPlanStructure(`<tasks>\n<task type="${type}">\n<name>T</name>\n${children}\n</task>\n</tasks>\n`).tasks[0];

  it('reads a comma-separated read_first in source order, without duplicates', () => {
    const read = task('<read_first>src/a.ts, 04-UI-SPEC.md, src/a.ts</read_first>');
    expect(read.readFirst).toEqual(['src/a.ts', '04-UI-SPEC.md']);
  });

  it('reads a bulleted read_first with backticks and note tails, skipping a colon-ended lead line', () => {
    const read = task(
      '<read_first>\n  Read these before starting:\n  - `src/a.ts` — the entry point\n  - ./b.md (the contract)\n  - Some prose line that is not a path\n</read_first>',
    );
    expect(read.readFirst).toEqual(['src/a.ts', 'b.md']);
  });

  it('strips a leading @ and adds the @ lines of the task\'s own context', () => {
    const read = task('<read_first>@src/a.ts</read_first>\n<context>\nSome prose.\n@.planning/phases/04-x/04-UI-SPEC.md\n@src/a.ts\n</context>');
    expect(read.readFirst).toEqual(['src/a.ts', '.planning/phases/04-x/04-UI-SPEC.md']);
  });

  it('caps the list at 50 entries', () => {
    const many = Array.from({ length: 80 }, (_, index) => `src/f${index}.ts`).join('\n');
    expect(task(`<read_first>\n${many}\n</read_first>`).readFirst).toHaveLength(50);
  });

  it('reads the resume signal as one trimmed line, and null without one', () => {
    const signal = task('<resume-signal>\n  Type "approved"\n  or describe issues\n</resume-signal>', 'checkpoint:human-verify');
    expect(signal.resumeSignal).toBe('Type "approved" or describe issues');
    const bare = task('<action>Do.</action>');
    expect(bare.readFirst).toEqual([]);
    expect(bare.resumeSignal).toBeNull();
  });

  it('keeps read_first and resume-signal in sourceChildren', () => {
    const read = task('<read_first>src/a.ts</read_first>\n<resume-signal>go</resume-signal>');
    expect(read.sourceChildren.map((child) => child.tag)).toEqual(['read_first', 'resume-signal']);
  });
});
