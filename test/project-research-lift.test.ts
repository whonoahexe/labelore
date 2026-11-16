// The project research lift (quick-261024-k8u): made-up Lendshed research in the canonical template
// shape, the synthetic fixtures for drift, garbage that must never throw, and a growth bound. No real
// research is read.
import { describe, expect, it } from 'vitest';
import {
  extractProjectResearch,
  liftArchitecture,
  liftFeatures,
  liftPitfalls,
  liftStack,
  liftSummary,
  RESEARCH_FILE_KEYS,
  splitTopLevel,
} from '../src/planning-repo/handlers/project-research-lift.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { ProjectResearchHandler } from '../src/planning-repo/handlers/project-research.ts';
import { SummaryHandler } from '../src/planning-repo/handlers/summary.ts';
import type { ArtifactRef } from '../src/planning-repo/types.ts';
import {
  DRIFT_ARCHITECTURE,
  DRIFT_FEATURES,
  DRIFT_PITFALLS,
  DRIFT_SCALING,
  DRIFT_STACK,
  DRIFT_SUMMARY,
  TEMPLATE_ARCHITECTURE,
  TEMPLATE_FEATURES,
  TEMPLATE_PITFALLS,
  TEMPLATE_STACK,
  TEMPLATE_SUMMARY,
} from './helpers/project-research-fixtures.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

describe('splitTopLevel', () => {
  it('splits at top-level semicolons only, never inside parentheses, backticks or quotes', () => {
    expect(splitTopLevel('a; b (c; d); `e; f`; "g; h"; i.')).toEqual(['A', 'B (c; d)', '`e; f`', '"g; h"', 'I']);
  });

  it('splits at ", plus " only when asked', () => {
    expect(splitTopLevel('a; b, plus c (not; this).', { plus: true })).toEqual(['A', 'B', 'C (not; this)']);
    expect(splitTopLevel('a, plus b')).toEqual(['A, plus b']);
  });

  it('tolerates unbalanced input and empty parts', () => {
    expect(splitTopLevel(')))a; ;; b((')).toEqual([')))a', 'B((']);
    expect(splitTopLevel('')).toEqual([]);
  });
});

describe('the template shape (made-up Lendshed research)', () => {
  it('SUMMARY: head, phases, rationale, gaps and the confidence table', () => {
    const lift = liftSummary(TEMPLATE_SUMMARY);
    expect(lift.head.project).toBe('Lendshed');
    expect(lift.head.researched).toBe('2026-05-14');
    expect(lift.head.confidence.level).toBe('HIGH');
    expect(lift.phases).toHaveLength(3);
    expect(lift.phases.every((phase) => phase.gate === null && phase.parallelWith === null)).toBe(true);
    expect(lift.phases[0].name).toBe('Loan Ledger and Member Model');
    expect(lift.phases[0].delivers).toHaveLength(5);
    expect(lift.phases[0].avoids).toEqual([1, 2, 4]);
    expect(lift.rationale).toHaveLength(4);
    expect(lift.gaps).toHaveLength(2);
    expect(lift.gaps[0].lead).toBe('Offline queue limits');
    expect(lift.areas.map((area) => [area.area, area.level])).toEqual([
      ['Stack', 'HIGH'],
      ['Features', 'HIGH'],
      ['Architecture', 'HIGH'],
      ['Pitfalls', 'HIGH'],
    ]);
    expect(lift.exec).toHaveLength(4);
    expect(lift.keyFindings.architecture).toMatch(/two clean layers/);
  });

  it('STACK: the decision, three layers of 4, 5 and 2, and six alternatives', () => {
    const lift = liftStack(TEMPLATE_STACK);
    expect(lift.decision?.verdict).toBe('Rust API with a React kiosk app, over a Rails monolith.');
    expect(lift.decision?.reasons).toHaveLength(3);
    expect(lift.layers.map((layer) => [layer.title, layer.items.length])).toEqual([
      ['Core Technologies', 4],
      ['Supporting Libraries', 5],
      ['Development Tools', 2],
    ]);
    expect(lift.layers.map((layer) => layer.whyLabel)).toEqual(['Why', 'When to use', 'Notes']);
    expect(lift.layers[2].items[0]).toMatchObject({ name: 'cargo-nextest', version: '0.9.99' });
    expect(lift.alternatives?.kind).toBe('when');
    expect(lift.alternatives?.rows).toHaveLength(6);
  });

  it('FEATURES: 5 expected, 3 differentiators, 4 anti-features, two rivals plus ours', () => {
    const lift = liftFeatures(TEMPLATE_FEATURES);
    expect(lift.expected.items).toHaveLength(5);
    expect(lift.differentiators.items).toHaveLength(3);
    expect(lift.anti.items).toHaveLength(4);
    expect(lift.expected.items.every((item) => item.group === null)).toBe(true);
    expect(lift.expected.items[0].complexity).toBe('LOW');
    expect(lift.competitors?.rivals).toHaveLength(2);
    expect(lift.competitors?.ours).toBe("Lendshed's approach");
    expect(lift.competitors?.rows).toHaveLength(3);
  });

  it('ARCHITECTURE: overview, structure, three anti-patterns and the A to D prose build order', () => {
    const lift = liftArchitecture(TEMPLATE_ARCHITECTURE);
    expect(lift.overview).toContain('+');
    expect(lift.structure).toContain('src/');
    expect(lift.structure).not.toContain('Structure Rationale');
    expect(lift.antiPatterns).toHaveLength(3);
    expect(lift.antiPatterns.every((pattern) => pattern.does && pattern.why && pattern.instead)).toBe(true);
    expect(lift.buildOrder?.steps.map((step) => step.id)).toEqual(['A', 'B', 'C', 'D']);
    expect(lift.buildOrder?.steps[1].depends).toEqual(['A']);
    expect(lift.buildOrder?.steps[2].depends).toEqual(['A', 'B']);
    expect(lift.buildOrder?.steps[0].notes).toBe('~1–2 plans');
  });

  it('ARCHITECTURE scaling: a Scale | Adjustments table is one concern across three tiers', () => {
    const scaling = liftArchitecture(TEMPLATE_ARCHITECTURE).scaling!;
    expect(scaling.byRow).toBe(true);
    expect(scaling.lead).toBeNull();
    expect(scaling.tiers).toHaveLength(3);
    expect(scaling.tiers[0]).toMatch(/^[A-Za-z-]+ reference scale \(/);
    expect(scaling.concerns.map((concern) => concern.name)).toEqual(['Architecture Adjustments']);
    expect(scaling.concerns[0].cells).toHaveLength(3);
    expect(scaling.priorities.map((priority) => priority.label)).toEqual([
      'First real bottleneck, if any',
      "Not a bottleneck at this project's actual scale",
    ]);
  });

  it('ARCHITECTURE scaling: a numbered section with a lead and a concerns × tiers matrix', () => {
    const scaling = liftArchitecture(DRIFT_SCALING).scaling!;
    expect(scaling.byRow).toBe(false);
    expect(scaling.lead).toBe('A small studio; scale means data volume on one machine, not users.');
    expect(scaling.axis).toBe('Concern');
    expect(scaling.tiers).toEqual(['Today', 'Per season (hundreds of GB)', 'Per year']);
    expect(scaling.concerns.map((concern) => concern.name)).toEqual(['`ingest_rows`', 'Write rate', 'Archive disk']);
    expect(scaling.concerns[1].cells).toEqual(['low', 'per-file, far below limits', 'unchanged']);
    expect(scaling.priorities).toEqual([
      { label: 'First bottleneck', text: 'the archive disk during dual-target ingest. Mitigation is policy, not code.' },
      { label: 'Second', text: 'render CPU against responsiveness. Mitigated by the lane design.' },
    ]);
  });

  it('PITFALLS: the performance, security and UX tables with their headers and the security lead', () => {
    const { tables } = liftPitfalls(TEMPLATE_PITFALLS);
    expect(tables.map((table) => [table.kind, table.rows.length])).toEqual([
      ['performance', 2],
      ['security', 3],
      ['ux', 4],
    ]);
    expect(tables[0].head).toEqual(['Trap', 'Symptoms', 'Prevention', 'When It Breaks']);
    expect(tables[2].head).toEqual(['Pitfall', 'User Impact', 'Better Approach']);
    expect(tables[0].lead).toBeNull();
    expect(tables[1].lead).toMatch(/^Even for a one-shed pilot/);
  });

  it('PITFALLS: four pitfalls with how-likely, short names from the mapping, and three checks', () => {
    const lift = liftPitfalls(TEMPLATE_PITFALLS);
    expect(lift.pitfalls).toHaveLength(4);
    expect(lift.pitfalls[0].short).toMatch(/^Overfit to /);
    expect(lift.pitfalls[0].likely?.level).toBe('Very high');
    expect(lift.pitfalls[0].signs.length).toBeGreaterThan(1);
    expect(lift.pitfalls.every((pitfall) => pitfall.likely !== null)).toBe(true);
    expect(lift.checks).toHaveLength(3);
    expect(lift.checks.some((check) => check.pitfalls.includes(2))).toBe(true);
  });
});

describe('drift: the shapes a drifted research folder uses', () => {
  it('SUMMARY: an entry-gate preamble, a parallel phase, split gates and a Research Flags section', () => {
    const lift = liftSummary(DRIFT_SUMMARY);
    expect(lift.head.project).toBe('Lendshed, milestone v2.0 Vault Ingest');
    expect(lift.head.confidence.level).toBe('MEDIUM-HIGH');
    expect(lift.preamble[0]).toMatch(/^\*\*Entry gate \(before any phase writes to the vault\)/);
    expect(lift.preamble).toHaveLength(2);
    expect(lift.phases.map((phase) => phase.n)).toEqual(['1', '2', '3']);
    expect(lift.phases[1].name).toBe('Ingest');
    expect(lift.phases[1].parallelWith).toBe(1);
    expect(lift.phases[2].parallelWith).toBe(2);
    expect(lift.phases[0].delivers).toEqual([
      '`IngestExecutor` (single read, tee, hash); manifest schema; the `fsync` barrier (data and directory)',
    ]);
    expect(lift.phases[0].avoids).toEqual([17]);
    expect(lift.phases[1].avoids).toEqual([1, 3, 4]);
    expect(lift.phases[1].gate).toBe('a; b, plus c (not; this).');
    expect(lift.phases[1].delivers).toHaveLength(3);
    expect(lift.phases[2]).toMatchObject({ uses: 'axum extractors', addresses: 'REV-01' });
    expect(lift.flags.needs.map((flag) => flag.phase)).toEqual(['2']);
    expect(lift.flags.standard.map((flag) => flag.phase)).toEqual(['1']);
    expect(lift.rationale).toHaveLength(2);
    expect(lift.gaps.map((gap) => gap.lead)).toEqual(['Resume protocol', 'Backup cadence']);
    expect(lift.overall).toMatch(/^MEDIUM-HIGH/);
    expect(lift.areas[3].level).toBe('LOW-MEDIUM');
  });

  it('STACK: a Headline with a bold verdict, parenthetical layer notes, a Category table', () => {
    const lift = liftStack(DRIFT_STACK);
    expect(lift.decision?.verdict).toBe('Rust and axum, kept as they are, over a rewrite in Go.');
    expect(lift.decision?.rest).toEqual(['The portal already runs there and the ingest path wants no garbage collector:']);
    expect(lift.decision?.reasons.map((reason) => reason.lead)).toEqual(['Streaming without copies', 'One toolchain']);
    expect(lift.layers.map((layer) => [layer.title, layer.note])).toEqual([
      ['Core', 'the runtime'],
      ['Storage', 'what holds the bytes'],
      ['Tooling', null],
      ['Observability', null],
      ['Misc', null],
    ]);
    expect(lift.alternatives?.kind).toBe('whynot');
    expect(lift.alternatives?.rows.map((row) => [row.category, row.chosen])).toEqual([
      ['Runtime', 'Rust'],
      ['Runtime', 'Rust'],
      ['HTTP', 'axum'],
    ]);
  });

  it('FEATURES: #### groups under Table Stakes and a three-rival competitor table', () => {
    const lift = liftFeatures(DRIFT_FEATURES);
    expect(lift.expected.items.map((item) => [item.group, item.name])).toEqual([
      ['Projects', 'Create a project'],
      ['Projects', 'Archive a project'],
      ['Ingest', 'Upload a file'],
    ]);
    expect(lift.expected.items[1].complexity).toBe('MEDIUM-HIGH');
    expect(lift.differentiators.items).toHaveLength(1);
    expect(lift.anti.items[0]).toMatchObject({ name: 'Auto-delete after sync', instead: 'Verify, then ask' });
    expect(lift.competitors?.rivals).toEqual(['Lendhub (hosted review)', 'Syncbox (sync)', 'Peerlink (peer to peer)']);
    expect(lift.competitors?.ours).toBe('Our approach');
    expect(lift.competitors?.note).toBe('The matrix says the gap is verification, not transfer.');
  });

  it('ARCHITECTURE: a System Overview under Standard Architecture and a Step table with a non-step dependency', () => {
    const lift = liftArchitecture(DRIFT_ARCHITECTURE);
    expect(lift.overview).toContain('Browser');
    expect(lift.components).toBe(2);
    expect(lift.structure).toContain('executor.rs');
    expect(lift.antiPatterns).toHaveLength(2);
    expect(lift.antiPatterns[0]).toMatchObject({ does: null, why: 'Two writers race on the manifest.', instead: 'Route every write through the executor.' });
    expect(lift.antiPatterns[1]).toMatchObject({ does: 'Re-read the file to hash it.', instead: 'Hash in the tee.' });
    const order = lift.buildOrder;
    expect(order?.steps.map((step) => [step.id, step.name])).toEqual([
      ['S1', 'schema'],
      ['I1', 'executor'],
      ['R1', 'review'],
      ['R2', 'export'],
    ]);
    // "spike X1" is not a step, so it is dropped from the wires and kept in the text.
    expect(order?.steps[3].depends).toEqual(['I1']);
    expect(order?.steps[3].dependsText).toBe('I1, spike X1 (needs an answer)');
    expect(order?.steps[0].dependsText).toBeNull();
    expect(order?.grouping).toMatch(/^S1 and I1 as one phase/);
  });

  it('PITFALLS: no How likely, a pitfall with no Why, semicolon signs and a labelled checklist', () => {
    const lift = liftPitfalls(DRIFT_PITFALLS);
    expect(lift.note).toBe('Ranked by how much they cost to fix late.');
    expect(lift.pitfalls.map((pitfall) => pitfall.n)).toEqual([1, 2, 3]);
    expect(lift.pitfalls[0].likely).toBeNull();
    expect(lift.pitfalls[0].confidence?.level).toBe('MEDIUM-HIGH');
    expect(lift.pitfalls[0].signs).toEqual([
      'A tier shows full capacity while its drive is unplugged',
      'The capacity equals the root disk',
      'No mount event in the log',
    ]);
    expect(lift.pitfalls[0].short).toBe('Absent mounts');
    expect(lift.pitfalls[0].verify).toBe('Unplug a tier');
    expect(lift.pitfalls[1].why).toEqual([]);
    expect(lift.pitfalls[1].signs).toEqual(['A failing drive reported as an error']);
    expect(lift.pitfalls[2].signs).toEqual([]);
    expect(lift.checks[0]).toEqual({
      label: 'Absent tiers',
      trap: 'only tested plugged in',
      check: 'Verify by unplugging each tier',
      pitfalls: [1],
    });
    expect(lift.checks[1].pitfalls).toEqual([2, 3]);
  });
});

describe('absent sections degrade to empty lists or null', () => {
  it.each(RESEARCH_FILE_KEYS)('%s lifts an empty document', (key) => {
    expect(() => extractProjectResearch(key, '')).not.toThrow();
  });

  it('gives empty shapes for a document with only a title', () => {
    const body = '# Nothing\n';
    expect(liftSummary(body)).toMatchObject({ exec: [], phases: [], gaps: [], areas: [], overall: null });
    expect(liftStack(body)).toMatchObject({ decision: null, layers: [], alternatives: null });
    expect(liftFeatures(body)).toMatchObject({ competitors: null, expected: { items: [] } });
    expect(liftArchitecture(body)).toMatchObject({ overview: null, structure: null, scaling: null, buildOrder: null, antiPatterns: [] });
    expect(liftPitfalls(body)).toMatchObject({ note: null, pitfalls: [], checks: [], tables: [] });
  });
});

describe('robustness', () => {
  const garbage = [
    '\u0000\u0001\ud800',
    '#'.repeat(5000),
    '| a | b |\n|---|---|\n' + '| x '.repeat(3000) + '|',
    '```\n' + 'unclosed fence\n'.repeat(500),
    '### Phase 1: ' + '('.repeat(4000),
    '**Gate:** ' + ';'.repeat(5000),
    '### Pitfall 1: x\n**Warning signs:** ' + '"'.repeat(3000),
    '## Recommended Build Order\n' + '| S1 | a | S1, S2 | b |\n'.repeat(2000),
  ];

  it.each(RESEARCH_FILE_KEYS)('%s never throws on garbage', (key) => {
    for (const text of garbage) expect(() => extractProjectResearch(key, text)).not.toThrow();
    expect(() => extractProjectResearch(key, undefined as unknown as string)).not.toThrow();
  });

  // A body of about n characters: many short sections, then a long line of x and a longer one of y,
  // in the proportions the old fixed-budget test used. The cost may grow with the size, not faster.
  const bodyOf =
    (key: string) =>
    (n: number): string =>
      [
        `# ${key}`,
        '**Confidence:** HIGH',
        ...Array.from({ length: Math.max(1, Math.floor(n / 230)) }, (_, i) => `## Section ${i}\n- item ${i} with some **bold** text; and (parens; here)`),
        'x'.repeat(Math.floor(n / 5)),
        'y'.repeat(Math.floor((n * 3) / 5)),
      ].join('\n');

  it.each(RESEARCH_FILE_KEYS)('%s lifts a body with a very long line no faster than linearly', (key) => {
    const growth = measureGrowth({ make: bodyOf(key), run: (body) => void extractProjectResearch(key, body) });
    expect(growth.ratio, `${key}: ${growth.t1.toFixed(2)}ms at ${growth.n} characters, ${growth.t2.toFixed(2)}ms at 8x`).toBeLessThan(GROWTH_LIMIT);
  });
});

describe('ProjectResearchHandler', () => {
  const ref = (path: string, location: ArtifactRef['location'] = 'research'): ArtifactRef => ({
    path,
    kind: 'unknown',
    fileClass: 'text',
    sizeBytes: 0,
    location,
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  });

  it('claims exactly the five files directly under .planning/research/', () => {
    for (const name of ['SUMMARY', 'STACK', 'FEATURES', 'ARCHITECTURE', 'PITFALLS']) {
      expect(ProjectResearchHandler.match(ref(`.planning/research/${name}.md`))).toBe(true);
    }
    expect(ProjectResearchHandler.match(ref('.planning/research/questions.md'))).toBe(false);
    expect(ProjectResearchHandler.match(ref('.planning/research/GSD-DOMAIN.md'))).toBe(false);
    expect(ProjectResearchHandler.match(ref('.planning/research/nested/STACK.md'))).toBe(false);
    expect(ProjectResearchHandler.match(ref('.planning/STACK.md', 'root'))).toBe(false);
    expect(ProjectResearchHandler.match(ref('.planning/phases/01-x/STACK.md', 'phase'))).toBe(false);
    expect(ProjectResearchHandler.match(ref('.planning/research/__proto__.md'))).toBe(false);
  });

  it('is registered, finds research/SUMMARY.md, and leaves SummaryHandler to plan summaries', () => {
    const summary = ref('.planning/research/SUMMARY.md');
    expect(HANDLERS.find((handler) => handler.match(summary))).toBe(ProjectResearchHandler);
    expect(HANDLERS.indexOf(ProjectResearchHandler)).toBeLessThan(HANDLERS.length - 1);
    expect(SummaryHandler.match(summary)).toBe(false);
  });

  it('parses the file generically and attaches the lift', () => {
    const result = ProjectResearchHandler.parse(
      { path: '.planning/research/STACK.md', content: DRIFT_STACK, mtimeMs: 0, size: DRIFT_STACK.length },
      ref('.planning/research/STACK.md'),
    );
    expect(result.title).toBe('Stack Research');
    expect(result.body).toContain('## Headline');
    expect((result.structured?.projectResearch as { file: string }).file).toBe('stack');
  });
});
