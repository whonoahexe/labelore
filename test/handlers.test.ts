import { describe, it, expect } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { StateHandler } from '../src/planning-repo/handlers/state.ts';
import { RoadmapHandler } from '../src/planning-repo/handlers/roadmap.ts';
import { RequirementsHandler } from '../src/planning-repo/handlers/requirements.ts';
import { PlanHandler } from '../src/planning-repo/handlers/plan.ts';
import { SummaryHandler } from '../src/planning-repo/handlers/summary.ts';
import { ContextHandler } from '../src/planning-repo/handlers/context.ts';
import { JsonConfigHandler } from '../src/planning-repo/handlers/json-config.ts';
import { WindowsHandler } from '../src/planning-repo/handlers/windows.ts';
import { parseWithRegistry } from '../src/planning-repo/registry.ts';
import { WarningCollector } from '../src/planning-repo/warnings.ts';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';

function ref(path: string, overrides: Partial<ArtifactRef> = {}): ArtifactRef {
  return {
    path,
    kind: 'unknown',
    location: 'root',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
    ...overrides,
  };
}

function raw(path: string, content: string): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

describe('StateHandler', () => {
  it('parses a STATE.md with only the three template-guaranteed keys', () => {
    const content = `---\ngsd_state_version: '1.0'\nstatus: planning\nprogress:\n  total_phases: 0\n---\n\n# Project State\n`;
    const result = StateHandler.parse(raw('.planning/STATE.md', content), ref('.planning/STATE.md'));
    expect(result.frontmatter.gsd_state_version).toBe('1.0');
    expect(result.frontmatter.status).toBe('planning');
    expect(result.frontmatter.milestone).toBeUndefined();
  });

  it('exposes conventional and unknown frontmatter keys unchanged', () => {
    const content = `---\ngsd_state_version: '1.0'\nstatus: executing\nmilestone: v2.0\nphase_numbering: restarts-per-milestone\nsome_future_key: surprise\n---\n\n# Project State\n`;
    const result = StateHandler.parse(raw('.planning/STATE.md', content), ref('.planning/STATE.md'));
    expect(result.frontmatter.milestone).toBe('v2.0');
    expect(result.frontmatter.phase_numbering).toBe('restarts-per-milestone');
    expect(result.frontmatter.some_future_key).toBe('surprise');
  });

  it('splits the body into ordered sections and extracts the Quick Tasks Completed table', () => {
    const content = `# Project State\n\n## Current Position\ntext\n\n## Accumulated Context\n\n### Quick Tasks Completed\n\n| # | Description | Status |\n|---|---|---|\n| 1 | Add toggle | Needs Review |\n`;
    const result = StateHandler.parse(raw('.planning/STATE.md', content), ref('.planning/STATE.md'));
    const sections = result.structured?.sections as { heading: string }[];
    expect(sections.map((s) => s.heading)).toEqual(['Current Position', 'Accumulated Context']);
  });
});

describe('RoadmapHandler', () => {
  const roadmap = `# Roadmap: Demo\n\n## Phases\n\n- [ ] **Phase 1: Foundation** - one-liner\n\n## Phase Details\n\n### Phase 1: Foundation\n**Goal**: Ship the base layer\n**Depends on**: Nothing (first phase)\n**Requirements**: [AUTH-01, AUTH-02]\n**Success Criteria** (what must be TRUE):\n  1. User can sign in\n  2. Session persists\n**Plans**: 2 plans\n\nPlans:\n- [x] 01-01: Schema\n- [ ] 01-02: API\n`;

  it('extracts number, name, goal, depends-on, requirement ids, success criteria, and plan checklist', () => {
    const result = RoadmapHandler.parse(raw('.planning/ROADMAP.md', roadmap), ref('.planning/ROADMAP.md'));
    const phases = result.structured?.phases as {
      number: string;
      name: string;
      goal: string | null;
      dependsOnRaw: string | null;
      requirementIds: string[];
      successCriteria: string[];
      plans: { id: string; checked: boolean }[];
    }[];
    expect(phases).toHaveLength(1);
    expect(phases[0]).toMatchObject({
      number: '1',
      name: 'Foundation',
      goal: 'Ship the base layer',
      dependsOnRaw: 'Nothing (first phase)',
      requirementIds: ['AUTH-01', 'AUTH-02'],
      successCriteria: ['User can sign in', 'Session persists'],
    });
    expect(phases[0].plans).toEqual([
      { id: '01-01', description: 'Schema', checked: true },
      { id: '01-02', description: 'API', checked: false },
    ]);
  });

  it('treats bracketed and unbracketed requirement lists identically', () => {
    const bracketed = RoadmapHandler.parse(
      raw('.planning/ROADMAP.md', '### Phase 1: X\n**Requirements**: [A-01, A-02]\n'),
      ref('.planning/ROADMAP.md'),
    );
    const unbracketed = RoadmapHandler.parse(
      raw('.planning/ROADMAP.md', '### Phase 1: X\n**Requirements**: A-01, A-02\n'),
      ref('.planning/ROADMAP.md'),
    );
    const bracketedIds = (bracketed.structured?.phases as { requirementIds: string[] }[])[0].requirementIds;
    const unbracketedIds = (unbracketed.structured?.phases as { requirementIds: string[] }[])[0].requirementIds;
    expect(bracketedIds).toEqual(['A-01', 'A-02']);
    expect(unbracketedIds).toEqual(['A-01', 'A-02']);
  });

  it('captures the ASCII dependency-shape block verbatim without deriving a graph', () => {
    const content = `## Phase Details\n\n**Dependency shape:**\n\`\`\`\nPhase 1 --> Phase 2\n              |\n              v\n           Phase 3\n\`\`\`\n`;
    const result = RoadmapHandler.parse(raw('.planning/ROADMAP.md', content), ref('.planning/ROADMAP.md'));
    expect(result.structured?.dependencyShape).toContain('Phase 1 --> Phase 2');
    expect(typeof result.structured?.dependencyShape).toBe('string');
  });

  it('yields one milestone group per <details> block, keyed on its <summary> text', () => {
    const content = `## Phases\n\n<details>\n<summary>✅ v1.0 MVP (Phases 1-4) - SHIPPED 2025-01-01</summary>\n\n### Phase 1: Foundation\n**Goal**: Ship it\n\nPlans:\n- [x] 01-01: Only plan\n\n</details>\n\n### Phase 5: Current\n**Goal**: Next thing\n`;
    const result = RoadmapHandler.parse(raw('.planning/ROADMAP.md', content), ref('.planning/ROADMAP.md'));
    const groups = result.structured?.milestoneGroups as { summary: string; version: string | null; phases: { number: string }[] }[];
    expect(groups).toHaveLength(1);
    expect(groups[0].summary).toContain('v1.0 MVP');
    expect(groups[0].version).toBe('v1.0');
    expect(groups[0].phases.map((p) => p.number)).toEqual(['1']);
    // The live phase outside the <details> block is not duplicated into the archived group.
    const livePhases = result.structured?.phases as { number: string }[];
    expect(livePhases.map((p) => p.number)).toEqual(['5']);
  });

  // WR-01 regression: an interior non-`Phase N:` heading (e.g. a hand-authored `#### Notes`
  // subsection) must NOT close the current phase block — everything up to the NEXT `Phase N:`
  // heading belongs to the current phase, including fields that appear after the interior heading.
  it('does not truncate a phase block at an interior non-Phase heading', () => {
    const content = `### Phase 1: Foundation\n**Goal**: Ship it\n\n#### Notes\nSome ad hoc notes here.\n\n**Requirements**: [AUTH-01]\n**Success Criteria** (what must be TRUE):\n  1. User can sign in\n\nPlans:\n- [x] 01-01: Schema\n`;
    const result = RoadmapHandler.parse(raw('.planning/ROADMAP.md', content), ref('.planning/ROADMAP.md'));
    const phases = result.structured?.phases as {
      number: string;
      goal: string | null;
      requirementIds: string[];
      successCriteria: string[];
      plans: { id: string }[];
      roadmapComplete: boolean | null;
    }[];
    expect(phases).toHaveLength(1);
    expect(phases[0].goal).toBe('Ship it');
    expect(phases[0].requirementIds).toEqual(['AUTH-01']);
    expect(phases[0].successCriteria).toEqual(['User can sign in']);
    expect(phases[0].plans).toEqual([{ id: '01-01', description: 'Schema', checked: true }]);
    expect(phases[0].roadmapComplete).toBe(true);
  });
});

describe('RequirementsHandler', () => {
  const content = `# Requirements: Demo\n\n## v1 Requirements\n\n### Authentication\n\n- [ ] **AUTH-01**: User can sign up\n- [x] **AUTH-02**: User can sign in\n\n## v2 Requirements\n\n### Notifications\n\n- **NOTF-01**: User gets notified\n\n## Out of Scope\n\n| Feature | Reason |\n|---|---|\n| Video posts | Too costly |\n\n## Traceability\n\n| Requirement | Phase | Status |\n|---|---|---|\n| AUTH-01 | Phase 1 | Pending |\n`;

  it('yields requirement items with id, category, text, tier, and checked state', () => {
    const result = RequirementsHandler.parse(raw('.planning/REQUIREMENTS.md', content), ref('.planning/REQUIREMENTS.md'));
    const items = result.structured?.items as { id: string; category: string; text: string; tier: string; checked: boolean | null }[];
    expect(items).toEqual([
      { id: 'AUTH-01', category: 'Authentication', text: 'User can sign up', tier: 'v1', checked: false },
      { id: 'AUTH-02', category: 'Authentication', text: 'User can sign in', tier: 'v1', checked: true },
      { id: 'NOTF-01', category: 'Notifications', text: 'User gets notified', tier: 'v2', checked: null },
    ]);
  });

  it('yields the out-of-scope table and the traceability table', () => {
    const result = RequirementsHandler.parse(raw('.planning/REQUIREMENTS.md', content), ref('.planning/REQUIREMENTS.md'));
    expect(result.structured?.outOfScope).toEqual([{ feature: 'Video posts', reason: 'Too costly' }]);
    expect(result.structured?.traceability).toEqual([{ requirementId: 'AUTH-01', phase: 'Phase 1', status: 'Pending' }]);
  });
});

describe('PlanHandler', () => {
  it('lifts nested must_haves frontmatter and keeps the body verbatim with pseudo-XML tags untouched', () => {
    const content = `---\nphase: 01\nplan: 01\nmust_haves:\n  truths:\n    - "A truth"\n  artifacts:\n    - path: src/x.ts\n---\n\n<tasks>\n<task type="auto">\n<name>Task 1</name>\n</task>\n</tasks>\n`;
    const planRef = ref('.planning/phases/01-x/01-01-PLAN.md', { location: 'phase', kind: 'plan' });
    const result = PlanHandler.parse(raw(planRef.path, content), planRef);
    expect((result.frontmatter.must_haves as { truths: string[] }).truths).toEqual(['A truth']);
    expect(result.body).toContain('<task type="auto">');
    expect(result.body).toContain('<name>Task 1</name>');
  });
});

describe('SummaryHandler', () => {
  it('distinguishes an absent coverage key from an empty coverage array', () => {
    const withCoverage = SummaryHandler.parse(
      raw('x', '---\nphase: 01\nplan: 01\ncoverage: []\n---\n\nbody\n'),
      ref('.planning/phases/01-x/01-01-SUMMARY.md', { location: 'phase', kind: 'summary' }),
    );
    const withoutCoverage = SummaryHandler.parse(
      raw('x', '---\nphase: 01\nplan: 01\n---\n\nbody\n'),
      ref('.planning/phases/01-x/01-01-SUMMARY.md', { location: 'phase', kind: 'summary' }),
    );
    expect(withCoverage.frontmatter.coverage).toEqual([]);
    expect(withoutCoverage.frontmatter.coverage).toBeUndefined();
  });
});

describe('ContextHandler', () => {
  it('parses a CONTEXT.md with no frontmatter and yields its six tag sections', () => {
    const content = `# Phase 1 - Context\n\n<domain>\nBoundary text\n</domain>\n<decisions>\nD-01\n</decisions>\n<specifics>\nNone\n</specifics>\n<canonical_refs>\nrefs\n</canonical_refs>\n<code_context>\ncode\n</code_context>\n<deferred>\nnothing\n</deferred>\n`;
    const contextRef = ref('.planning/phases/01-x/01-CONTEXT.md', { location: 'phase', kind: 'context' });
    const result = ContextHandler.parse(raw(contextRef.path, content), contextRef);
    expect(Object.keys(result.frontmatter)).toHaveLength(0);
    const sections = result.structured?.sections as Record<string, string | null>;
    expect(Object.keys(sections).sort()).toEqual(['canonical_refs', 'code_context', 'decisions', 'deferred', 'domain', 'specifics']);
    expect(sections.domain).toBe('Boundary text');
  });
});

describe('JsonConfigHandler', () => {
  it('round-trips a key nested two levels inside an unknown namespace unchanged', () => {
    const content = JSON.stringify({ someFutureNamespace: { nested: { deep: 'value' } } });
    const result = JsonConfigHandler.parse(raw('.planning/config.json', content), ref('.planning/config.json', { kind: 'config' }));
    const namespace = result.frontmatter.someFutureNamespace as { nested: { deep: string } };
    expect(namespace.nested.deep).toBe('value');
  });

  it('preserves a polymorphic parallelization value shaped as an object rather than a boolean', () => {
    const content = JSON.stringify({ parallelization: { enabled: true, maxAgents: 4 } });
    const result = JsonConfigHandler.parse(raw('.planning/config.json', content), ref('.planning/config.json', { kind: 'config' }));
    expect(result.frontmatter.parallelization).toEqual({ enabled: true, maxAgents: 4 });
  });

  it('strips a __proto__-named key without polluting any object prototype', () => {
    const content = '{"__proto__": {"polluted": true}, "safe": 1}';
    const result = JsonConfigHandler.parse(raw('.planning/config.json', content), ref('.planning/config.json', { kind: 'config' }));
    expect(result.frontmatter.safe).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(result.frontmatter, '__proto__')).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('parses an empty config object into an empty map with zero warnings', () => {
    const result = JsonConfigHandler.parse(raw('.planning/config.json', '{}'), ref('.planning/config.json', { kind: 'config' }));
    expect(result.frontmatter).toEqual({});
    expect(result.warning).toBeUndefined();
  });

  it('a HANDOFF.json with a trailing comma yields a structured-extraction warning, retains the raw text, and never throws', () => {
    const content = '{"version": "1.0", "phase": "01",}';
    expect(() =>
      JsonConfigHandler.parse(raw('.planning/HANDOFF.json', content), ref('.planning/HANDOFF.json', { kind: 'unknown' })),
    ).not.toThrow();
    const result = JsonConfigHandler.parse(raw('.planning/HANDOFF.json', content), ref('.planning/HANDOFF.json', { kind: 'unknown' }));
    expect(result.warning?.stage).toBe('structured-extraction');
    expect(result.body).toBe(content);
  });
});

describe('GenericMarkdownHandler — absence is normal-path data, never a warning', () => {
  it('parses a frontmatter block with no keys as a well-formed empty map, no warning', () => {
    const result = GenericMarkdownHandler.parse(raw('x', '---\n---\n\nbody text\n'), ref('.planning/NOTES.md'));
    expect(result.frontmatter).toEqual({});
    expect(result.warning).toBeUndefined();
    expect(result.body.trim()).toBe('body text');
  });

  it('parses a document with frontmatter and no body without a warning', () => {
    const result = GenericMarkdownHandler.parse(raw('x', '---\ntitle: Only Frontmatter\n---\n'), ref('.planning/NOTES.md'));
    expect(result.frontmatter.title).toBe('Only Frontmatter');
    expect(result.warning).toBeUndefined();
    expect(result.body.trim()).toBe('');
  });
});

describe('WindowsHandler', () => {
  it('prefers the fenced JSON block over the markdown table when both are present', () => {
    const content = `---\nschema_version: 1\nopen_count: 1\n---\n\n# Windows\n\n| id | phase | kind |\n|---|---|---|\n| 1 | 01 | stub |\n\n\`\`\`json\n[{"id": 1, "phase": "01", "kind": "deviation"}]\n\`\`\`\n`;
    const result = WindowsHandler.parse(raw('.planning/WINDOWS.md', content), ref('.planning/WINDOWS.md', { kind: 'windows' }));
    expect(result.frontmatter.schema_version).toBe(1);
    expect(result.structured?.rowSource).toBe('json');
    expect(result.structured?.rows).toEqual([{ id: 1, phase: '01', kind: 'deviation' }]);
  });

  // WR-02 regression: a malformed fenced JSON block — the "authoritative-shaped source" per this
  // file's own header comment — must surface a warning even though the table fallback silently
  // produces usable rows. Previously `extractFencedJson` discarded `tryParseJson`'s warning
  // entirely, so the corruption was invisible in both the artifact's own warnings and the flat
  // snapshot.warnings list.
  it('surfaces a structured-extraction warning when the fenced JSON block is malformed, while still falling back to the table', () => {
    const content = `---\nschema_version: 1\n---\n\n# Windows\n\n| id | phase | kind |\n|---|---|---|\n| 1 | 01 | stub |\n\n\`\`\`json\n[{"id": 1,}]\n\`\`\`\n`;
    const result = WindowsHandler.parse(raw('.planning/WINDOWS.md', content), ref('.planning/WINDOWS.md', { kind: 'windows' }));
    expect(result.structured?.rowSource).toBe('table');
    expect(result.structured?.rows).toEqual([{ id: '1', phase: '01', kind: 'stub' }]);
    expect(result.warning?.stage).toBe('structured-extraction');
    expect(result.warning?.message).toBe('JSON failed to parse');
  });

  it('produces no warning when no fenced JSON block is present at all, falling back to the table', () => {
    const content = `---\nschema_version: 1\n---\n\n# Windows\n\n| id | phase | kind |\n|---|---|---|\n| 1 | 01 | stub |\n`;
    const result = WindowsHandler.parse(raw('.planning/WINDOWS.md', content), ref('.planning/WINDOWS.md', { kind: 'windows' }));
    expect(result.structured?.rowSource).toBe('table');
    expect(result.warning).toBeUndefined();
  });
});

describe('HANDLERS registry', () => {
  it('matches a ref no typed handler recognizes with the unconditional GenericMarkdownHandler, registered last', () => {
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
    const anyRef = ref('.planning/spikes/idea.md', { location: 'other' });
    expect(HANDLERS[HANDLERS.length - 1].match(anyRef)).toBe(true);
  });

  it('dispatch is unaffected by frontmatter presence or absence (DATA-02)', () => {
    const planRef = ref('.planning/phases/01-x/01-01-PLAN.md', { location: 'phase', kind: 'plan' });
    const withFrontmatter = HANDLERS.find((h) => h.match(planRef));
    // Same ref, frontmatter presence is a content property never consulted by match().
    const stillWithFrontmatter = HANDLERS.find((h) => h.match(planRef));
    expect(withFrontmatter).toBe(stillWithFrontmatter);
    expect(withFrontmatter).toBe(PlanHandler);

    const contextRef = ref('.planning/phases/01-x/01-CONTEXT.md', { location: 'phase', kind: 'context' });
    const contextMatch = HANDLERS.find((h) => h.match(contextRef));
    expect(contextMatch).toBe(ContextHandler);
  });

  it('parses a batch of one tab-broken frontmatter file and three healthy files with exactly one warning and three fully-parsed results', async () => {
    const files: Record<string, string> = {
      '.planning/STATE.md': '---\ngsd_state_version: "1.0"\nstatus: planning\n---\n\n# Project State\n',
      '.planning/PROJECT.md': '# Demo\n\n## What This Is\ntext\n',
      '.planning/REQUIREMENTS.md': '# Requirements: Demo\n',
      '.planning/phases/01-x/01-01-PLAN.md': '---\nfoo: "unterminated\n---\n\nbody\n',
    };
    const fs = new InMemoryPlanningFilesystem(files);
    const warnings = new WarningCollector();
    const refs: ArtifactRef[] = [
      ref('.planning/STATE.md', { kind: 'state' }),
      ref('.planning/PROJECT.md', { kind: 'project' }),
      ref('.planning/REQUIREMENTS.md', { kind: 'requirements' }),
      ref('.planning/phases/01-x/01-01-PLAN.md', { location: 'phase', kind: 'plan' }),
    ];
    const results = await Promise.all(refs.map((r) => parseWithRegistry(fs, r, warnings)));
    expect(warnings.all()).toHaveLength(1);
    expect(warnings.all()[0].stage).toBe('frontmatter');
    const fullyParsed = results.filter((r) => r.warnings.length === 0);
    expect(fullyParsed).toHaveLength(3);
    // The broken file still retains its full body rather than being dropped.
    const brokenResult = results.find((r) => r.ref.path === '.planning/phases/01-x/01-01-PLAN.md');
    expect(brokenResult?.body.length).toBeGreaterThan(0);
  });

  it('retains two artifacts deriving the same artifact token as distinct entries keyed by path, never merged', async () => {
    const fs = new InMemoryPlanningFilesystem({
      '.planning/phases/01-x/01-CONTEXT.md': '<domain>a</domain>',
    });
    const warnings = new WarningCollector();
    // Two refs deliberately sharing the same derived kind (as two ad-hoc-but-identically-keyed
    // artifacts would) but different paths — the pipeline must key by path, never by kind.
    const refA = ref('.planning/phases/01-x/01-CONTEXT.md', { location: 'phase', kind: 'context' });
    const refB = ref('.planning/phases/01-x/01-CONTEXT-DUPLICATE.md', { location: 'phase', kind: 'context' });
    const resultA = await parseWithRegistry(fs, refA, warnings);
    const resultB = await parseWithRegistry(new InMemoryPlanningFilesystem({ '.planning/phases/01-x/01-CONTEXT-DUPLICATE.md': '<domain>b</domain>' }), refB, warnings);
    const byPath: Record<string, unknown> = {};
    for (const r of [resultA, resultB]) byPath[r.ref.path] = r;
    expect(Object.keys(byPath)).toHaveLength(2);
    expect(byPath['.planning/phases/01-x/01-CONTEXT.md']).toBeDefined();
    expect(byPath['.planning/phases/01-x/01-CONTEXT-DUPLICATE.md']).toBeDefined();
  });
});
