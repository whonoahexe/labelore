// quick-261017-k45 (sketch 024 E): the LEARNINGS body extractor - pinned against the two copied files
// (test/fixtures/learnings/), the dense fixture's two files, the tolerant degrade paths and the
// T-k45-02 timing bound. Pinned values come from the sketch's own data.js and the source files,
// independent of the extractor's output.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractLearningsRetro } from '../src/planning-repo/handlers/learnings-retro.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';

const FIXTURES = new URL('./fixtures/learnings/', import.meta.url).pathname;
const DENSE = new URL('../fixtures/dense/.planning/', import.meta.url).pathname;

const bodyOf = (path: string): string => tryParseFrontmatter(readFileSync(path, 'utf8')).body;
const syn = extractLearningsRetro(bodyOf(`${FIXTURES}synthetic-LEARNINGS.md`));
const sp01 = extractLearningsRetro(bodyOf(`${FIXTURES}sp01-LEARNINGS.md`));
const fx = extractLearningsRetro(bodyOf(`${DENSE}phases/01-identity-slice/01-LEARNINGS.md`));
const fxp = extractLearningsRetro(bodyOf(`${DENSE}LEARNINGS.md`));

const counts = (r: ReturnType<typeof extractLearningsRetro>): string =>
  (['decision', 'lesson', 'pattern', 'surprise'] as const)
    .map((k) => r.entries.filter((e) => e.kind === k).length)
    .join('/');

describe('the template file with graduation', () => {
  it('reads the H1 and eleven entries in document order', () => {
    expect(syn.h1).toBe('Phase 05 Learnings: Per-Type Document Views');
    expect(syn.entries).toHaveLength(11);
    expect(counts(syn)).toBe('3/3/3/2');
    expect(syn.entries.map((e) => e.kind).join(',')).toBe(
      'decision,decision,decision,lesson,lesson,lesson,pattern,pattern,pattern,surprise,surprise',
    );
  });

  it('reads the first entry body, field, source and graduation', () => {
    const first = syn.entries[0];
    expect(first.title).toBe('View is the page, Source is the escape hatch');
    expect(first.body).toEqual([
      { kind: 'paragraph', text: 'Every typed artifact opens in its view; the raw file is one toggle away and never the default.' },
    ]);
    expect(first.fields.map((f) => f.label)).toEqual(['Rationale']);
    expect(first.fields[0].text).toContain('A reader opens a document to learn what it is for');
    expect(first.sources).toEqual([{ artifact: '05-01-SUMMARY.md', note: null }]);
    expect(first.graduated).toEqual({ target: 'docs/design-language.md', date: '2026-09-22' });
    expect(first.listItem).toBe(false);
  });

  it('finds three graduated entries, two sources on #2 and seven empty bodies', () => {
    expect(syn.entries.map((e, i) => (e.graduated ? i + 1 : 0)).filter(Boolean)).toEqual([1, 4, 7]);
    expect(syn.entries[3].graduated).toEqual({ target: '.claude/CLAUDE.md', date: '2026-09-23' });
    expect(syn.entries[1].sources.map((s) => s.artifact)).toEqual(['05-01-PLAN.md', '05-01-SUMMARY.md']);
    expect(syn.entries.map((e, i) => (e.body.length === 0 ? i + 1 : 0)).filter(Boolean)).toEqual([3, 5, 6, 8, 9, 10, 11]);
  });

  it('keeps no leftover or stray section', () => {
    expect(syn.sections.map((s) => [s.heading, s.kind, s.leftover])).toEqual([
      ['Decisions', 'decision', false],
      ['Lessons', 'lesson', false],
      ['Patterns', 'pattern', false],
      ['Surprises', 'surprise', false],
    ]);
  });
});

describe('the studio-portal phase 1 file', () => {
  it('reads forty entries, each with its kind field', () => {
    expect(sp01.entries).toHaveLength(40);
    expect(counts(sp01)).toBe('14/9/10/7');
    const own = { decision: 'Rationale', lesson: 'Context', pattern: 'When to use', surprise: 'Impact' };
    for (const e of sp01.entries) expect(e.fields.map((f) => f.label)).toContain(own[e.kind]);
    expect(sp01.entries.every((e) => e.graduated === null)).toBe(true);
  });

  it('reads source notes without splitting a comma inside them', () => {
    expect(sp01.entries[0].title).toBe('All three AuthError variants render a byte-identical 401 body');
    expect(sp01.entries[0].sources).toEqual([{ artifact: '01-01-SUMMARY.md', note: null }]);
    expect(sp01.entries[2].sources).toEqual([
      { artifact: '01-02-SUMMARY.md', note: null },
      { artifact: '01-02-PLAN.md', note: 'RESEARCH Pattern 2 / Pitfall 4' },
    ]);
    expect(sp01.entries[3].sources).toEqual([
      { artifact: '01-04-SUMMARY.md', note: 'deviation 1, confirmed against axum 0.8.9 source' },
    ]);
    expect(sp01.entries[39].sources.map((s) => s.artifact)).toEqual(['01-REVIEW.md', '01-VERIFICATION.md', '01-REVIEW-FIX.md']);
  });

  it('leaves the two pattern entries that go straight to a field with an empty body', () => {
    const empty = sp01.entries.map((e, i) => (e.body.length === 0 ? i + 1 : 0)).filter(Boolean);
    expect(empty).toEqual([26, 28]);
    expect(sp01.entries[25].title).toBe('`route_layer`, never `layer`, for middleware scoped to specific routes in a merged router');
    expect(sp01.entries[27].title).toBe('Distinct synthetic `cf-connecting-ip` per login call in any test driving `/api/login` repeatedly');
  });
});

describe('the dense fixture list items', () => {
  it('reads the phase file: three entries, the joined lesson, "None." gives no entry', () => {
    expect(fx.h1).toBe('Phase 1 Learnings: Identity Slice');
    expect(fx.entries).toHaveLength(3);
    expect(counts(fx)).toBe('1/1/1/0');
    expect(fx.entries.every((e) => e.listItem)).toBe(true);
    expect(fx.entries[0].title).toBe('Every unfamiliar artifact type is authored from its own `gsd-core` template');
    expect(fx.entries[0].sources).toEqual([{ artifact: 'D-01', note: null }]);
    expect(fx.entries[1].title).toBe(
      'A phase directory can legitimately hold both templated artifact types (`SPEC.md`) and a genuinely invented one (`01-COST-MODEL.md`) side by side.',
    );
    expect(fx.entries[2].title).toBe('Registry-dispatched artifact handlers with an unconditional generic handler always last.');
    const surprises = fx.sections.find((s) => s.kind === 'surprise');
    expect(surprises).toMatchObject({ leftover: false, blank: true });
  });

  it('reads the project file: eight entries, references moved to sources', () => {
    expect(fxp.entries).toHaveLength(8);
    expect(counts(fxp)).toBe('3/2/2/1');
    expect(fxp.entries[0].title).toBe('Three milestones, not two — multi-milestone identity logic must not be validated only at N=2.');
    expect(fxp.entries[0].sources).toEqual([]);
    expect(fxp.entries[1].title).toBe('Corruption lives inside the healthy tree, isolated to exactly two files');
    expect(fxp.entries[1].sources).toEqual([{ artifact: 'D-02', note: null }]);
    expect(fxp.entries[7].title.endsWith('can never be asserted against it again')).toBe(true);
    expect(fxp.entries[7].sources).toEqual([{ artifact: 'D-02', note: null }]);
  });
});

describe('degrade paths', () => {
  it('gives an empty model for empty and frontmatter-only strings', () => {
    expect(extractLearningsRetro('')).toEqual({ h1: null, entries: [], sections: [] });
    expect(extractLearningsRetro('---\nphase: 1\n---\n').entries).toEqual([]);
  });

  it('never throws on odd shapes', () => {
    const odd = [
      '## Decisions\n\n### Unclosed\n```js\n### not an entry\n',
      '### Entry outside any section\n**Rationale:** x\n',
      '## Lessons\n\n### T\n**Context:**\n**Source:**\n',
      '## Patterns\n\n### T\n**Source:** a.md (unbalanced, b.md\n**Graduated:** docs/x.md\n',
      '## Surprises\n\n### T\n**Graduated:** docs/x.md:\n**Graduated:**\n',
      '## Decisions\n- ((((\n- )))\n',
      '## Decisions\n\nstray prose\n\n- item (D-01\n',
    ];
    for (const body of odd) expect(() => extractLearningsRetro(body)).not.toThrow();
    const a = extractLearningsRetro(odd[0]);
    expect(a.entries).toHaveLength(1);
    expect(a.entries[0].title).toBe('Unclosed');
    expect(extractLearningsRetro(odd[1]).entries).toEqual([]);
    expect(extractLearningsRetro(odd[3]).entries[0].graduated).toEqual({ target: 'docs/x.md', date: null });
    expect(extractLearningsRetro(odd[6]).sections[0].leftover).toBe(true);
  });

  it('does not read headings inside fences as entries', () => {
    const r = extractLearningsRetro('## Decisions\n\n### Real\nbody\n```\n### Fake\n```\n');
    expect(r.entries.map((e) => e.title)).toEqual(['Real']);
    expect(r.entries[0].body.map((b) => b.kind)).toEqual(['paragraph', 'code']);
  });

  it('keeps an unhandled section for the Also row', () => {
    const r = extractLearningsRetro('## Decisions\n- a\n\n## Open threads\n\nSomething pending.\n\n## Notes\n\nNone.\n');
    expect(r.sections.map((s) => [s.heading, s.kind, s.blank])).toEqual([
      ['Decisions', 'decision', false],
      ['Open threads', null, false],
      ['Notes', null, true],
    ]);
  });

  it('extracts a 1 MB body holding a 200k-character line within 250 ms', () => {
    const hostile = '`*|[**1. **('.repeat(20000);
    expect(hostile.length).toBeGreaterThanOrEqual(200000);
    const filler = 'x'.repeat(79) + '\n';
    const body = `# T\n\n## Decisions\n\n### ${hostile}\n**Rationale:** ${hostile}\n**Source:** ${hostile}\n\n- ${hostile}\n\n${filler.repeat(9000)}`;
    expect(body.length).toBeGreaterThan(900000);
    const start = performance.now();
    const report = extractLearningsRetro(body);
    const elapsed = performance.now() - start;
    expect(report.entries.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(250);
  });

  it('caps hostile lists', () => {
    const items = '- an item\n'.repeat(3000);
    expect(extractLearningsRetro(`## Decisions\n\n${items}`).entries.length).toBeLessThanOrEqual(500);
    const heads = '### h\nbody\n'.repeat(3000);
    expect(extractLearningsRetro(`## Decisions\n\n${heads}`).entries.length).toBeLessThanOrEqual(500);
    const fields = '**Aa:** x\n'.repeat(200);
    const e = extractLearningsRetro(`## Lessons\n\n### T\n${fields}`).entries[0];
    expect(e.fields.length).toBeLessThanOrEqual(30);
  });
});
