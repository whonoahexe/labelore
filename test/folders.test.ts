// Phase 7, plan 02 (DATA-07): the folder table and the position-gated kind derivation, as (path, location)
// -> kind cases. Every grammar gate, folder row and exact name has a row here. kindOfPath reads names and
// positions only, so no filesystem is involved.
import { describe, expect, it } from 'vitest';
import type { ArtifactLocation } from '../src/planning-repo/types.ts';
import { EXACT_NAME_KINDS, FOLDER_RULES, folderRuleOf, kindOfPath } from '../src/planning-repo/folders.ts';

type Case = [path: string, location: ArtifactLocation, kind: string];

const GATED_GRAMMARS: Case[] = [
  ['ROADMAP.md', 'root', 'roadmap'],
  ['STATE.md', 'root', 'state'],
  ['config.json', 'root', 'config'],
  ['v1.0-ROADMAP.md', 'root', 'roadmap'],
  ['sketches/026-x/synthetic-planning/ROADMAP.md', 'other', 'unknown'],
  ['sketches/026-x/synthetic-planning/STATE.md', 'other', 'unknown'],
  ['sketches/026-x/synthetic-planning/05-01-PLAN.md', 'other', 'unknown'],
  ['phases/05-x/ROADMAP.md', 'phase', 'unknown'],
  ['phases/05-x/config.json', 'phase', 'unknown'],
  ['milestones/v1.0-ROADMAP.md', 'milestone-root', 'roadmap'],
  ['milestones/v1.0-MILESTONE-AUDIT.md', 'milestone-root', 'milestone-audit'],
  ['milestones/v1.0-phases/01-a/v1.0-ROADMAP.md', 'archived-phase', 'unknown'],
  ['notes/v1.0-ROADMAP.md', 'other', 'note'],
  ['phases/01-a/01-01-PLAN.md', 'phase', 'plan'],
  ['phases/01-a/01-01-SUMMARY.md', 'phase', 'summary'],
  ['phases/01-a/01-CONTEXT.md', 'phase', 'context'],
  ['phases/01-a/01-ROUTE-INVENTORY.md', 'phase', 'route-inventory'],
  ['milestones/v1.0-phases/01-a/01-01-PLAN.md', 'archived-phase', 'plan'],
  ['milestones/v1.0-phases/01-a/01-REVIEW.md', 'archived-phase', 'review'],
  ['quick/260310-a7c-fix-kiln-label/260310-a7c-PLAN.md', 'quick', 'plan'],
  ['quick/260310-a7c-fix-kiln-label/260310-a7c-SUMMARY.md', 'quick', 'summary'],
  ['quick/260310-a7c-fix-kiln-label/260310-a7c-VERIFICATION.md', 'quick', 'verification'],
  ['milestones/v1.0-quick/260310-a7c-fix-kiln-label/260310-a7c-PLAN.md', 'milestone-root', 'plan'],
  ['milestones/v1.0-quick/260310-a7c-fix-kiln-label/260310-a7c-SUMMARY.md', 'milestone-root', 'summary'],
  ['milestones/v1.0-quick/260310-a7c-fix-kiln-label/260310-a7c-CONTEXT.md', 'milestone-root', 'context'],
  ['sketches/001-x/01-CONTEXT.md', 'other', 'unknown'],
  ['sketches/001-x/260310-a7c-PLAN.md', 'other', 'unknown'],
  ['research/01-CONTEXT.md', 'research', 'context'],
];

const EXACT_NAMES: Case[] = [
  ['HANDOFF.json', 'root', 'handoff'],
  ['PATTERNS.md', 'root', 'graduated-patterns'],
  ['.continue-here.md', 'root', 'continue-here'],
  ['phases/02-x/.continue-here.md', 'phase', 'continue-here'],
  ['spikes/001-x/.continue-here.md', 'other', 'continue-here'],
  ['deliberations/.continue-here.md', 'other', 'continue-here'],
  ['phases/02-x/COVERAGE.md', 'phase', 'coverage'],
  ['phases/02-x/deferred-items.md', 'phase', 'deferred-items'],
  ['phases/02-x/SKELETON.md', 'phase', 'skeleton'],
  ['milestones/v1.0-phases/02-x/COVERAGE.md', 'archived-phase', 'coverage'],
  ['quick/260310-a7c-x/COVERAGE.md', 'quick', 'coverage'],
  ['quick/260310-a7c-x/deferred-items.md', 'quick', 'deferred-items'],
  ['milestones/v1.0-quick/260310-a7c-x/SKELETON.md', 'milestone-root', 'skeleton'],
  // byte-equal and case-sensitive
  ['handoff.json', 'root', 'unknown'],
  ['phases/02-x/Coverage.md', 'phase', 'unknown'],
  ['phases/02-x/skeleton.md', 'phase', 'unknown'],
  ['phases/02-x/Deferred-Items.md', 'phase', 'unknown'],
  ['Patterns.md', 'root', 'unknown'],
  // position-scoped
  ['phases/02-x/HANDOFF.json', 'phase', 'unknown'],
  ['COVERAGE.md', 'root', 'unknown'],
  ['PATTERNS.md.bak', 'root', 'unknown'],
  ['codebase/COVERAGE.md', 'other', 'unknown'],
  ['notes/PATTERNS.md', 'other', 'note'],
  ['phases/02-x/PATTERNS.md', 'phase', 'unknown'],
];

const FOLDERS: Case[] = [
  ['codebase/ARCHITECTURE.md', 'other', 'codebase-architecture'],
  ['codebase/STACK.md', 'other', 'codebase-stack'],
  ['codebase/STRUCTURE.md', 'other', 'codebase-structure'],
  ['codebase/CONVENTIONS.md', 'other', 'codebase-conventions'],
  ['codebase/TESTING.md', 'other', 'codebase-testing'],
  ['codebase/INTEGRATIONS.md', 'other', 'codebase-integrations'],
  ['codebase/CONCERNS.md', 'other', 'codebase-concerns'],
  ['codebase/notes.md', 'other', 'unknown'],
  ['codebase/architecture.md', 'other', 'unknown'],
  ['codebase/sub/STACK.md', 'other', 'unknown'],
  ['spikes/MANIFEST.md', 'other', 'spikes-manifest'],
  ['spikes/CONVENTIONS.md', 'other', 'spikes-conventions'],
  ['spikes/WRAP-UP-SUMMARY.md', 'other', 'spikes-wrap-up'],
  ['spikes/001-kiln-sensor/README.md', 'other', 'spike'],
  ['spikes/001-kiln-sensor/notes.md', 'other', 'unknown'],
  ['sketches/MANIFEST.md', 'other', 'sketches-manifest'],
  ['sketches/WRAP-UP-SUMMARY.md', 'other', 'sketches-wrap-up'],
  ['sketches/001-shelf-board/README.md', 'other', 'sketch'],
  ['sketches/001-shelf-board/index.html', 'other', 'unknown'],
  ['sketches/001-shelf-board/state.json', 'other', 'unknown'],
  ['seeds/SEED-001-glaze-library.md', 'other', 'seed'],
  ['threads/kiln-vendor-call.md', 'other', 'thread'],
  ['reports/SESSION_REPORT.md', 'other', 'report'],
  ['reports/MILESTONE_SUMMARY-v1.0.md', 'other', 'report'],
  ['forensics/report-20260510-101500.md', 'other', 'forensics'],
  ['onboarding/SUMMARY.md', 'other', 'onboarding'],
  ['intel/files.json', 'other', 'intel'],
  ['intel/SYNTHESIS.md', 'other', 'unknown'],
  ['graphs/graph.json', 'other', 'graph'],
  ['graphs/notes.md', 'other', 'unknown'],
  ['notes/2026-05-10-round-profile.md', 'other', 'note'],
  ['notes/c.txt', 'other', 'unknown'],
  ['todos/pending/retry-queue.md', 'other', 'todo'],
  ['todos/completed/retry-queue.md', 'other', 'todo'],
  ['debug/stuck-board.md', 'other', 'debug'],
  ['debug/resolved/stuck-board.md', 'other', 'debug'],
  ['debug/knowledge-base.md', 'other', 'unknown'],
  ['ui-reviews/glaze-panel.md', 'other', 'unknown'],
  ['quick-batches/batch-1/BATCH.json', 'other', 'unknown'],
  ['workstreams/alpha/STATE.md', 'other', 'unknown'],
  ['workstreams/alpha/ROADMAP.md', 'other', 'unknown'],
  ['research/STACK.md', 'research', 'unknown'],
  ['research/SUMMARY.md', 'research', 'unknown'],
  ['research/questions.md', 'research', 'unknown'],
  ['something-else/ROADMAP.md', 'other', 'unknown'],
  ['something-else/notes.md', 'other', 'unknown'],
  ['phases/README.md', 'other', 'unknown'],
  ['phases/not-a-phase-dir/notes.md', 'other', 'unknown'],
  ['quick/README.md', 'other', 'unknown'],
];

const LABEL = ([path, location]: Case) => `${path} at ${location}`;

describe('kindOfPath - filename grammars apply only at their position', () => {
  it.each(GATED_GRAMMARS)('%s (%s) is %s', (path, location, kind) => {
    expect(kindOfPath(path, location)).toBe(kind);
  });
});

describe('kindOfPath - the exact-name map', () => {
  it.each(EXACT_NAMES)('%s (%s) is %s', (path, location, kind) => {
    expect(kindOfPath(path, location)).toBe(kind);
  });

  it('lists each Labelore-side name once, with the place it applies', () => {
    expect(EXACT_NAME_KINDS.map((row) => `${row.name}:${row.where}:${row.kind}`).sort()).toEqual(
      [
        '.continue-here.md:any:continue-here',
        'COVERAGE.md:phase-or-quick:coverage',
        'HANDOFF.json:root:handoff',
        'PATTERNS.md:root:graduated-patterns',
        'SKELETON.md:phase-or-quick:skeleton',
        'deferred-items.md:phase-or-quick:deferred-items',
      ].sort(),
    );
  });
});

describe('kindOfPath - the folder table', () => {
  it.each(FOLDERS)('%s (%s) is %s', (path, location, kind) => {
    expect(kindOfPath(path, location)).toBe(kind);
  });

  it('never lets a file below the root take a root document kind, whatever its folder', () => {
    for (const [path, location] of FOLDERS) {
      if (path.split('/').length === 1) continue;
      expect(kindOfPath(path, location), LABEL([path, location, ''])).not.toMatch(/^(roadmap|state|project|requirements|config)$/);
    }
  });
});

describe('FOLDER_RULES', () => {
  const FOLDER_NAMES = [
    'codebase', 'research', 'notes', 'todos', 'debug', 'spikes', 'sketches', 'seeds', 'threads', 'reports',
    'forensics', 'onboarding', 'intel', 'graphs', 'ui-reviews', 'quick-batches', 'workstreams',
  ];

  it('has one row per top-level GSD folder, each citing its GSD source', () => {
    expect(FOLDER_RULES.map((rule) => rule.folder).sort()).toEqual([...FOLDER_NAMES].sort());
    for (const rule of FOLDER_RULES) {
      expect(rule.source.length, `${rule.folder} needs a source`).toBeGreaterThan(10);
      expect(rule.urlSegment.length).toBeGreaterThan(0);
    }
  });

  it('keeps the name rules the URL grammar will read', () => {
    const rule = (folder: string) => FOLDER_RULES.find((candidate) => candidate.folder === folder)?.nameRule;
    for (const folder of ['codebase', 'spikes', 'sketches', 'research']) expect(rule(folder), folder).toBe('gsd-lower');
    for (const folder of ['notes', 'todos', 'debug', 'seeds', 'threads', 'reports', 'forensics', 'onboarding']) {
      expect(rule(folder), folder).toBe('keep-case');
    }
    for (const folder of ['intel', 'graphs', 'ui-reviews', 'quick-batches', 'workstreams']) {
      expect(rule(folder), folder).toBe('keep-all');
    }
  });

  it('finds a row by the first segment only', () => {
    expect(folderRuleOf('codebase/STACK.md')?.folder).toBe('codebase');
    expect(folderRuleOf('todos/pending/a.md')?.folder).toBe('todos');
    expect(folderRuleOf('phases/01-a/codebase/STACK.md')).toBeNull();
    expect(folderRuleOf('something-else/a.md')).toBeNull();
    expect(folderRuleOf('STATE.md')).toBeNull();
  });

  it('gives workstreams a reserved row whose files are unknown', () => {
    expect(folderRuleOf('workstreams/alpha/STATE.md')?.kindOf(['alpha', 'STATE.md'])).toBe('unknown');
  });
});
