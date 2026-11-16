// What each document handler does around its extractor. When the extractor throws, the handler keeps
// the title, body and frontmatter and omits only its own structured key, so the page falls back to the
// promoted-section view; the table below runs that guard for every extractor module. Below the table,
// each handler's own claims and ref-fact tests, run against the real extractors.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fxPath } from './helpers/fixture-project.ts';
import { noteFile } from './helpers/note-corpus.ts';
import { projectSections } from '../src/planning-repo/handlers/section-projection.ts';
import type {
  ArtifactLocation,
  ArtifactRef,
  HandlerParseResult,
  RawArtifact,
} from '../src/planning-repo/types.ts';

beforeEach(() => {
  vi.resetModules();
});

interface ThrowParse {
  handler: string;
  path: string;
  kind: string;
  location: ArtifactLocation;
  content: string;
  title: string | null;
  body: string | null;
  frontmatter: [string, unknown] | null;
  structured: { equals: unknown } | { lacks: string; defined?: boolean };
}

interface ThrowRow {
  label: string;
  handlerPath: string;
  extractorPath: string;
  mocked: string[];
  parses: ThrowParse[];
}

function refFor(parse: ThrowParse): ArtifactRef {
  const phased = parse.kind === 'ui-review' || parse.kind === 'plan';
  return {
    path: parse.path,
    kind: parse.kind as ArtifactRef['kind'],
    location: parse.location,
    phaseIdentity: phased
      ? {
          milestoneVersion: null,
          number: '01',
          projectCode: null,
          slug: parse.kind === 'plan' ? 'x' : 'color-pass',
        }
      : null,
    milestoneVersion: null,
    quickTaskId: null,
    fileClass: 'text',
    sizeBytes: 0,
  };
}

const DEBUG =
  '---\nstatus: investigating\ncreated: 2026-10-01\n---\n\n# Debug Session: thing\n\n## Current Focus\n\nhypothesis: it is the cache\n';
const LEARNINGS =
  '---\nphase: "01"\ngenerated: "2026-06-10"\ncounts:\n  decisions: 1\n---\n\n# Phase 1 Learnings: Thing\n\n## Decisions\n\n- Do the thing (D-01).\n';
const NOTE = '---\ndate: "2026-10-21 15:58"\npromoted: true\n---\n\nShow it. Want: that.\n';
const PATTERNS = '# Phase 1: X - Pattern Map\n\n## File Classification\n\n| File |\n|---|\n| a |\n';
const PLAN = `---
phase: 05-per-type-document-views
plan: 01
wave: 1
---

<objective>
Prove the architecture. Purpose: Be sure.
</objective>

<tasks>
<task type="auto">
<name>Task 1: Do it</name>
</task>
</tasks>
`;
const REVIEW =
  '---\nstatus: issues_found\nphase: "01-x"\n---\n\n# Phase 1: Thing Code Review Report\n\n## Warnings\n\n### WR-01: A thing\n\n**File:** `src/a.ts:3`\n\n**Issue:** bad\n';
const DISPOSITION =
  '---\nphase: 01\nfindings:\n  - id: WR-01\n    severity: warning\n    disposition: open\n    title: "A thing"\nopen: 1\ntotal: 1\n---\n\n# Phase 01: Code Review Disposition\n';
const SECURITY =
  '---\nstatus: verified\nphase: 01\n---\n\n## Threat Register\n\n| Threat ID |\n|---|\n| T-1-1 |\n';
const SUMMARY =
  '---\nstatus: complete\nphase: "01-x"\nplan: "01"\n---\n\n# Phase 1 Plan 01: Thing Summary\n\n**It did a thing.**\n\n## Accomplishments\n\n- A first accomplishment that is long enough — with a detail after the dash\n';
const TODO =
  '---\ntitle: Make it faster\nseverity: major\ncreated: 2026-10-01\n---\n\n## Problem\n\nIt is slow.\n\n## Solution\n\nCache it.\n';
const UAT = '---\nstatus: complete\nphase: 01-x\n---\n\n## Tests\n\n### 1. A\nresult: pass\n';
const UI_REVIEW =
  '---\nstatus: passed\nphase: "01"\n---\n\n# Phase 01 — UI Review\n\n## Pillar Scores\n\n| 1. Color | 4/4 | k |\n';
const VALIDATION = '---\nstatus: draft\nphase: 01-x\n---\n\n## Validation Sign-Off\n\n- [x] one\n';
const VERIFICATION =
  '---\nstatus: passed\nphase: "01-x"\nscore: "1/1"\n---\n\n# Phase 1: Thing Verification Report\n\n**Phase Goal:** Do a thing.\n\n## Gaps Summary\n\nNo gaps.\n';
const RESEARCH = '# Stack Research\n\nbody text';

const H = '../src/planning-repo/handlers';
const NO_KEY = (key: string): ThrowParse['structured'] => ({ lacks: key });
const EMPTY: ThrowParse['structured'] = { equals: {} };

const THROW_ROWS: ThrowRow[] = [
  {
    label: 'debug',
    handlerPath: `${H}/debug.ts`,
    extractorPath: '../src/planning-repo/handlers/debug-session.ts',
    mocked: ['extractDebugSession'],
    parses: [
      {
        handler: 'DebugHandler',
        path: '.planning/debug/a.md',
        kind: 'debug',
        location: 'other',
        content: DEBUG,
        title: 'Debug Session: thing',
        body: '## Current Focus',
        frontmatter: ['status', 'investigating'],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'learnings',
    handlerPath: `${H}/learnings.ts`,
    extractorPath: '../src/planning-repo/handlers/learnings-retro.ts',
    mocked: ['extractLearningsRetro'],
    parses: [
      {
        handler: 'LearningsHandler',
        path: '.planning/phases/01-x/01-LEARNINGS.md',
        kind: 'learnings',
        location: 'phase',
        content: LEARNINGS,
        title: 'Phase 1 Learnings: Thing',
        body: '## Decisions',
        frontmatter: ['generated', '2026-06-10'],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'note',
    handlerPath: `${H}/note.ts`,
    extractorPath: '../src/planning-repo/handlers/note-lift.ts',
    mocked: ['extractNote'],
    parses: [
      {
        handler: 'NoteHandler',
        path: '.planning/notes/a.md',
        kind: 'note',
        location: 'other',
        content: NOTE,
        title: '.planning/notes/a.md',
        body: 'Want: that.',
        frontmatter: ['promoted', true],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'patterns',
    handlerPath: `${H}/patterns.ts`,
    extractorPath: '../src/planning-repo/handlers/pattern-map.ts',
    mocked: ['extractPatternMap'],
    parses: [
      {
        handler: 'PatternsHandler',
        path: '.planning/phases/01-x/01-PATTERNS.md',
        kind: 'patterns',
        location: 'phase',
        content: PATTERNS,
        title: null,
        body: 'File Classification',
        frontmatter: null,
        structured: { lacks: 'map', defined: true },
      },
    ],
  },
  {
    label: 'plan',
    handlerPath: `${H}/plan.ts`,
    extractorPath: '../src/planning-repo/handlers/plan-structure.ts',
    mocked: ['extractPlanStructure'],
    parses: [
      {
        handler: 'PlanHandler',
        path: '.planning/phases/01-x/01-01-PLAN.md',
        kind: 'plan',
        location: 'phase',
        content: PLAN,
        title: null,
        body: '<objective>',
        frontmatter: ['wave', 1],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'review',
    handlerPath: `${H}/review.ts`,
    extractorPath: '../src/planning-repo/handlers/review-report.ts',
    mocked: ['extractReviewReport', 'extractReviewFixReport'],
    parses: [
      {
        handler: 'ReviewHandler',
        path: '.planning/phases/01-x/01-REVIEW.md',
        kind: 'review',
        location: 'phase',
        content: REVIEW,
        title: 'Phase 1: Thing Code Review Report',
        body: '### WR-01',
        frontmatter: ['status', 'issues_found'],
        structured: { equals: { warnings: [{ id: 'WR-01', title: 'A thing' }] } },
      },
      {
        handler: 'ReviewFixHandler',
        path: '.planning/phases/01-x/01-REVIEW-FIX.md',
        kind: 'review-fix',
        location: 'phase',
        content: '---\nstatus: all_fixed\n---\n\n# Fix\n',
        title: 'Fix',
        body: null,
        frontmatter: ['status', 'all_fixed'],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'review-disposition',
    handlerPath: `${H}/review.ts`,
    extractorPath: '../src/planning-repo/handlers/review-disposition.ts',
    mocked: ['extractReviewDisposition'],
    parses: [
      {
        handler: 'ReviewDispositionHandler',
        path: '.planning/phases/01-x/01-REVIEW-DISPOSITION.md',
        kind: 'review',
        location: 'phase',
        content: DISPOSITION,
        title: 'Phase 01: Code Review Disposition',
        body: '# Phase 01',
        frontmatter: ['phase', 1],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'security',
    handlerPath: `${H}/security.ts`,
    extractorPath: '../src/planning-repo/handlers/security-register.ts',
    mocked: ['extractSecurityRegister'],
    parses: [
      {
        handler: 'SecurityHandler',
        path: '.planning/phases/01-x/01-SECURITY.md',
        kind: 'security',
        location: 'phase',
        content: SECURITY,
        title: null,
        body: '## Threat Register',
        frontmatter: ['status', 'verified'],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'summary',
    handlerPath: `${H}/summary.ts`,
    extractorPath: '../src/planning-repo/handlers/summary-run.ts',
    mocked: ['extractSummaryRun'],
    parses: [
      {
        handler: 'SummaryHandler',
        path: '.planning/phases/01-x/01-01-SUMMARY.md',
        kind: 'summary',
        location: 'phase',
        content: SUMMARY,
        title: 'Phase 1 Plan 01: Thing Summary',
        body: '## Accomplishments',
        frontmatter: ['status', 'complete'],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'todo',
    handlerPath: `${H}/todo.ts`,
    extractorPath: '../src/planning-repo/handlers/todo-file.ts',
    mocked: ['extractTodoFile'],
    parses: [
      {
        handler: 'TodoHandler',
        path: '.planning/todos/pending/a.md',
        kind: 'todo',
        location: 'other',
        content: TODO,
        title: 'Make it faster',
        body: '## Problem',
        frontmatter: ['severity', 'major'],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'uat',
    handlerPath: `${H}/uat.ts`,
    extractorPath: '../src/planning-repo/handlers/uat-session.ts',
    mocked: ['extractUatSession'],
    parses: [
      {
        handler: 'UatHandler',
        path: '.planning/phases/01-x/01-UAT.md',
        kind: 'uat',
        location: 'phase',
        content: UAT,
        title: null,
        body: '## Tests',
        frontmatter: ['status', 'complete'],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'ui-review',
    handlerPath: `${H}/ui-review.ts`,
    extractorPath: '../src/planning-repo/handlers/ui-review-audit.ts',
    mocked: ['extractUiReview'],
    parses: [
      {
        handler: 'UiReviewHandler',
        path: '.planning/phases/01-x/01-UI-REVIEW.md',
        kind: 'ui-review',
        location: 'phase',
        content: UI_REVIEW,
        title: null,
        body: '## Pillar Scores',
        frontmatter: ['status', 'passed'],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'validation',
    handlerPath: `${H}/validation.ts`,
    extractorPath: '../src/planning-repo/handlers/validation-strategy.ts',
    mocked: ['extractValidationStrategy'],
    parses: [
      {
        handler: 'ValidationHandler',
        path: '.planning/phases/01-x/01-VALIDATION.md',
        kind: 'validation',
        location: 'phase',
        content: VALIDATION,
        title: null,
        body: '## Validation Sign-Off',
        frontmatter: ['status', 'draft'],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'verification',
    handlerPath: `${H}/verification.ts`,
    extractorPath: '../src/planning-repo/handlers/verification-report.ts',
    mocked: ['extractVerificationReport'],
    parses: [
      {
        handler: 'VerificationHandler',
        path: '.planning/phases/01-x/01-VERIFICATION.md',
        kind: 'verification',
        location: 'phase',
        content: VERIFICATION,
        title: 'Phase 1: Thing Verification Report',
        body: '## Gaps Summary',
        frontmatter: ['status', 'passed'],
        structured: EMPTY,
      },
    ],
  },
  {
    label: 'project-research',
    handlerPath: `${H}/project-research.ts`,
    extractorPath: '../src/planning-repo/handlers/project-research-lift.ts',
    mocked: ['extractProjectResearch'],
    parses: [
      {
        handler: 'ProjectResearchHandler',
        path: '.planning/research/STACK.md',
        kind: 'unknown',
        location: 'research',
        content: RESEARCH,
        title: 'Stack Research',
        body: 'body text',
        frontmatter: null,
        structured: NO_KEY('projectResearch'),
      },
    ],
  },
];

describe('handler extractor throws', () => {
  it.each(THROW_ROWS)(
    '$label: omits its key and keeps the title, body and frontmatter',
    async (row) => {
      vi.doMock(row.extractorPath, () =>
        Object.fromEntries(
          row.mocked.map((name) => [
            name,
            () => {
              throw new Error('boom');
            },
          ]),
        ),
      );
      try {
        const mod = (await import(row.handlerPath)) as Record<
          string,
          { parse(raw: RawArtifact, ref: ArtifactRef): HandlerParseResult }
        >;
        for (const parse of row.parses) {
          const raw: RawArtifact = {
            path: parse.path,
            content: parse.content,
            mtimeMs: 0,
            size: parse.content.length,
          };
          const result = mod[parse.handler]!.parse(raw, refFor(parse));
          if (parse.title === null) expect(result.title).toBeTruthy();
          else expect(result.title).toBe(parse.title);
          if (parse.body !== null) expect(result.body).toContain(parse.body);
          if (parse.frontmatter !== null)
            expect(result.frontmatter[parse.frontmatter[0]]).toBe(parse.frontmatter[1]);
          if ('equals' in parse.structured)
            expect(result.structured).toEqual(parse.structured.equals);
          else {
            if (parse.structured.defined) expect(result.structured).toBeDefined();
            expect(result.structured ?? {}).not.toHaveProperty(parse.structured.lacks);
          }
        }
      } finally {
        vi.doUnmock(row.extractorPath);
      }
    },
  );
});

describe('debug handler', () => {
  const content =
    '---\nstatus: investigating\ncreated: 2026-10-01\n---\n\n# Debug Session: thing\n\n## Current Focus\n\nhypothesis: it is the cache\n';

  function refOf(path: string, extra: Partial<ArtifactRef> = {}): ArtifactRef {
    return {
      path,
      kind: 'debug',
      location: 'other',
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
      fileClass: 'text',
      sizeBytes: 0,
      ...extra,
    };
  }

  function rawOf(path: string): RawArtifact {
    return { path, content, mtimeMs: 0, size: content.length };
  }

  type Parsed = { debug: { slug: string; archived: boolean; focus: { key: string }[] } };

  describe('DebugHandler', () => {
    it('claims refs of kind debug and nothing else', async () => {
      const { DebugHandler } = await import('../src/planning-repo/handlers/debug.ts');
      expect(DebugHandler.match(refOf('.planning/debug/a.md'))).toBe(true);
      expect(
        DebugHandler.match(refOf('.planning/debug/knowledge-base.md', { kind: 'unknown' })),
      ).toBe(false);
      expect(
        DebugHandler.match(
          refOf('.planning/phases/01-x/01-UAT.md', { kind: 'uat', location: 'phase' }),
        ),
      ).toBe(false);
    });

    it('carries structured.debug with the slug and the archived flag', async () => {
      const { DebugHandler } = await import('../src/planning-repo/handlers/debug.ts');
      const archivedPath = '.planning/debug/resolved/loading-state-regression.md';
      const archived = DebugHandler.parse(rawOf(archivedPath), refOf(archivedPath));
      expect((archived.structured as Parsed).debug.slug).toBe('loading-state-regression');
      expect((archived.structured as Parsed).debug.archived).toBe(true);
      expect((archived.structured as Parsed).debug.focus.map((f) => f.key)).toEqual(['hypothesis']);
      const livePath = '.planning/debug/search-index-goes-stale.md';
      const live = DebugHandler.parse(rawOf(livePath), refOf(livePath));
      expect((live.structured as Parsed).debug.slug).toBe('search-index-goes-stale');
      expect((live.structured as Parsed).debug.archived).toBe(false);
    });
  });
});

describe('learnings handler', () => {
  const content =
    '---\nphase: "01"\ngenerated: "2026-06-10"\ncounts:\n  decisions: 1\n---\n\n# Phase 1 Learnings: Thing\n\n## Decisions\n\n- Do the thing (D-01).\n';

  function refOf(
    path: string,
    location: ArtifactRef['location'],
    extra: Partial<ArtifactRef> = {},
  ): ArtifactRef {
    return {
      path,
      kind: 'learnings',
      location,
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
      fileClass: 'text',
      sizeBytes: 0,
      ...extra,
    };
  }

  function rawOf(path: string): RawArtifact {
    return { path, content, mtimeMs: 0, size: content.length };
  }

  type Parsed = {
    learnings: {
      entries: { title: string }[];
      pathPhase: unknown;
      quickId: unknown;
      scope: string;
    };
  };

  describe('LearningsHandler', () => {
    it('claims LEARNINGS files in every location and the root file, and not the other tokens', async () => {
      const { LearningsHandler } = await import('../src/planning-repo/handlers/learnings.ts');
      expect(LearningsHandler.match(refOf('.planning/phases/01-x/01-LEARNINGS.md', 'phase'))).toBe(
        true,
      );
      expect(
        LearningsHandler.match(
          refOf('.planning/milestones/v1.0-phases/01-x/01-LEARNINGS.md', 'archived-phase'),
        ),
      ).toBe(true);
      expect(
        LearningsHandler.match(
          refOf('.planning/quick/260101-abc-x/260101-abc-LEARNINGS.md', 'quick'),
        ),
      ).toBe(true);
      expect(
        LearningsHandler.match(
          refOf(
            '.planning/milestones/v1.0-quick/260101-abc-x/260101-abc-LEARNINGS.md',
            'milestone-root',
          ),
        ),
      ).toBe(true);
      expect(LearningsHandler.match(refOf('.planning/LEARNINGS.md', 'root'))).toBe(true);
      expect(LearningsHandler.match(refOf('.planning/v1.1-LEARNINGS.md', 'milestone-root'))).toBe(
        false,
      );
      expect(LearningsHandler.match(refOf('.planning/phases/01-x/01-UAT.md', 'phase'))).toBe(false);
    });

    it('carries structured.learnings with the path facts from the ref', async () => {
      const { LearningsHandler } = await import('../src/planning-repo/handlers/learnings.ts');
      const path = '.planning/phases/01-x/01-LEARNINGS.md';
      const phase = LearningsHandler.parse(
        rawOf(path),
        refOf(path, 'phase', {
          phaseIdentity: { milestoneVersion: null, number: '01', projectCode: null, slug: 'x' },
        }),
      );
      const parsed = phase.structured as Parsed;
      expect(parsed.learnings.entries.map((e) => e.title)).toEqual(['Do the thing']);
      expect(parsed.learnings.pathPhase).toEqual({ number: '01', slug: 'x' });
      expect(parsed.learnings.quickId).toBeNull();
      expect(parsed.learnings.scope).toBe('phase');
      const quickPath = '.planning/quick/260101-abc-x/260101-abc-LEARNINGS.md';
      const quick = LearningsHandler.parse(
        rawOf(quickPath),
        refOf(quickPath, 'quick', { quickTaskId: '260101-abc' }),
      );
      expect((quick.structured as Parsed).learnings.quickId).toBe('260101-abc');
      expect((quick.structured as Parsed).learnings.scope).toBe('quick');
      const archivedPath = '.planning/milestones/v1.0-quick/260101-abc-x/260101-abc-LEARNINGS.md';
      const archived = LearningsHandler.parse(
        rawOf(archivedPath),
        refOf(archivedPath, 'milestone-root'),
      );
      expect((archived.structured as Parsed).learnings.quickId).toBe('260101-abc');
      expect((archived.structured as Parsed).learnings.scope).toBe('quick');
      const root = LearningsHandler.parse(
        rawOf('.planning/LEARNINGS.md'),
        refOf('.planning/LEARNINGS.md', 'root'),
      );
      expect((root.structured as Parsed).learnings.scope).toBe('project');
      expect((root.structured as Parsed).learnings.pathPhase).toBeNull();
    });
  });
});

describe('note handler', () => {
  const content = '---\ndate: "2026-10-21 15:58"\npromoted: true\n---\n\nShow it. Want: that.\n';

  function refOf(path: string, extra: Partial<ArtifactRef> = {}): ArtifactRef {
    return {
      path,
      kind: 'note',
      location: 'other',
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
      fileClass: 'text',
      sizeBytes: 0,
      ...extra,
    };
  }

  function rawOf(path: string, text: string = content): RawArtifact {
    return { path, content: text, mtimeMs: 0, size: text.length };
  }

  type Parsed = { note: { shape: string; rows: { label: string }[] } };

  describe('NoteHandler', () => {
    it('claims refs of kind note and nothing else', async () => {
      const { NoteHandler } = await import('../src/planning-repo/handlers/note.ts');
      expect(NoteHandler.match(refOf('.planning/notes/a.md'))).toBe(true);
      expect(
        NoteHandler.match(
          refOf('.planning/phases/01-x/notes.md', { kind: 'unknown', location: 'phase' }),
        ),
      ).toBe(false);
      expect(NoteHandler.match(refOf('.planning/todos/pending/a.md', { kind: 'todo' }))).toBe(
        false,
      );
    });

    it('carries structured.note for a quick note', async () => {
      const { NoteHandler } = await import('../src/planning-repo/handlers/note.ts');
      const path = '.planning/notes/a.md';
      const result = NoteHandler.parse(rawOf(path), refOf(path));
      expect((result.structured as Parsed).note.shape).toBe('quick');
      expect((result.structured as Parsed).note.rows.map((row) => row.label)).toEqual(['Want']);
      expect(result.frontmatter.promoted).toBe(true);
    });

    it("hands the extractor the path and the raw file's line count (quick-261023-u13)", async () => {
      const { NoteHandler } = await import('../src/planning-repo/handlers/note.ts');
      const path = '.planning/notes/2026-10-21-crop-images.md';
      const result = NoteHandler.parse(rawOf(path), refOf(path));
      const note = (result.structured as { note: { fileTitle?: string; lines?: number } }).note;
      expect(note.fileTitle).toBe('Crop images');
      // Six lines in the raw file: the front matter's four, a blank line and the note's text (its final newline starts no line).
      expect(note.lines).toBe(6);
      const noFinalNewline = NoteHandler.parse(rawOf(path, 'one\ntwo'), refOf(path));
      expect((noFinalNewline.structured as { note: { lines?: number } }).note.lines).toBe(2);
      const empty = NoteHandler.parse(rawOf(path, ''), refOf(path));
      expect((empty.structured as { note: { lines?: number } }).note.lines).toBe(0);
    });

    it('a titled note is a document', async () => {
      const { NoteHandler } = await import('../src/planning-repo/handlers/note.ts');
      const path = '.planning/notes/b.md';
      const result = NoteHandler.parse(
        rawOf(path, '---\ntitle: Explore\n---\n\nbody\n'),
        refOf(path),
      );
      expect((result.structured as Parsed).note.shape).toBe('document');
    });

    it('gives the same title, frontmatter and body as the generic handler for the same file', async () => {
      const { NoteHandler } = await import('../src/planning-repo/handlers/note.ts');
      const { GenericMarkdownHandler } = await import('../src/planning-repo/handlers/generic.ts');
      const path = '.planning/notes/2026-10-21-crop-images-and-profile-photos.md';
      const text = readFileSync(noteFile('dcrop'), 'utf8');
      const note = NoteHandler.parse(rawOf(path, text), refOf(path));
      const generic = GenericMarkdownHandler.parse(
        rawOf(path, text),
        refOf(path, { kind: 'unknown' }),
      );
      expect(note.title).toBe(generic.title);
      expect(note.frontmatter).toEqual(generic.frontmatter);
      expect(note.body).toBe(generic.body);
      expect(note.warning).toEqual(generic.warning);
    });
  });
});

describe('plan handler', () => {
  const content = `---
phase: 05-per-type-document-views
plan: 01
wave: 1
---

<objective>
Prove the architecture. Purpose: Be sure.
</objective>

<tasks>
<task type="auto">
<name>Task 1: Do it</name>
</task>
</tasks>
`;

  function refOf(
    path: string,
    location: ArtifactLocation,
    extra: Partial<ArtifactRef> = {},
  ): ArtifactRef {
    return {
      path,
      kind: 'plan',
      fileClass: 'text',
      sizeBytes: 0,
      location,
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
      ...extra,
    };
  }

  function rawOf(path: string): RawArtifact {
    return { path, content, mtimeMs: 0, size: content.length };
  }

  const PHASE = refOf('.planning/phases/01-x/01-01-PLAN.md', 'phase', {
    phaseIdentity: { milestoneVersion: null, number: '01', projectCode: null, slug: 'x' },
  });
  const ARCHIVED = refOf(
    '.planning/milestones/v1.1-phases/05-per-type-document-views/05-01-PLAN.md',
    'archived-phase',
    {
      phaseIdentity: {
        milestoneVersion: 'v1.1',
        number: '05',
        projectCode: null,
        slug: 'per-type-document-views',
      },
    },
  );
  const QUICK = refOf('.planning/quick/260910-0x4-x/260910-0x4-PLAN.md', 'quick', {
    quickTaskId: '260910-0x4',
  });
  const ARCHIVED_QUICK = refOf(
    '.planning/milestones/v1.0-quick/260910-0x4-x/260910-0x4-PLAN.md',
    'milestone-root',
  );

  describe('PlanHandler', () => {
    it('matches phase, archived-phase, quick and archived-quick PLAN files only', async () => {
      const { PlanHandler } = await import('../src/planning-repo/handlers/plan.ts');
      for (const ref of [PHASE, ARCHIVED, QUICK, ARCHIVED_QUICK])
        expect(PlanHandler.match(ref), ref.path).toBe(true);
      expect(PlanHandler.match(refOf('.planning/phases/01-x/01-01-SUMMARY.md', 'phase'))).toBe(
        false,
      );
      expect(
        PlanHandler.match(refOf('.planning/milestones/v3.0-CAPACITY-PLAN.md', 'milestone-root')),
      ).toBe(false);
      expect(PlanHandler.match(refOf('.planning/phases/01-x/01-CONTEXT.md', 'phase'))).toBe(false);
      expect(
        PlanHandler.match(refOf('.planning/quick/260910-0x4-x/260910-0x4-SUMMARY.md', 'quick')),
      ).toBe(false);
    });

    it('carries the ref facts for a phase plan', async () => {
      const { PlanHandler } = await import('../src/planning-repo/handlers/plan.ts');
      const parsed = PlanHandler.parse(rawOf(ARCHIVED.path), ARCHIVED);
      const plan = (parsed.structured as { plan: { ref: unknown; tasks: unknown[] } }).plan;
      expect(plan.ref).toEqual({
        planId: '05-01',
        phaseNumber: '05',
        phaseSlug: 'per-type-document-views',
        quickId: null,
      });
      expect(plan.tasks).toHaveLength(1);
      expect(parsed.body).toContain('<tasks>');
      expect(parsed.frontmatter.wave).toBe(1);
    });

    it('carries the quick id as the plan id for both quick locations', async () => {
      const { PlanHandler } = await import('../src/planning-repo/handlers/plan.ts');
      for (const ref of [QUICK, ARCHIVED_QUICK]) {
        const parsed = PlanHandler.parse(rawOf(ref.path), ref);
        const plan = (parsed.structured as { plan: { ref: unknown } }).plan;
        expect(plan.ref).toEqual({
          planId: '260910-0x4',
          phaseNumber: null,
          phaseSlug: null,
          quickId: '260910-0x4',
        });
      }
    });
  });

  describe('PlanHandler — a digits-only quick id', () => {
    it('reads 261003-528-PLAN.md as a quick plan, not as phase 261003 plan 528', async () => {
      const { PlanHandler } = await import('../src/planning-repo/handlers/plan.ts');
      const ref = refOf('.planning/quick/261003-528-x/261003-528-PLAN.md', 'quick', {
        quickTaskId: '261003-528',
      });
      expect(PlanHandler.match(ref)).toBe(true);
      const parsed = PlanHandler.parse(rawOf(ref.path), ref);
      const plan = (parsed.structured as { plan: { ref: unknown } }).plan;
      expect(plan.ref).toEqual({
        planId: '261003-528',
        phaseNumber: null,
        phaseSlug: null,
        quickId: '261003-528',
      });
    });
  });
});

describe('review handler', () => {
  const content =
    '---\nstatus: issues_found\nphase: "01-x"\n---\n\n# Phase 1: Thing Code Review Report\n\n## Warnings\n\n### WR-01: A thing\n\n**File:** `src/a.ts:3`\n\n**Issue:** bad\n';

  function refOf(
    path: string,
    location: ArtifactRef['location'],
    extra: Partial<ArtifactRef> = {},
  ): ArtifactRef {
    return {
      path,
      kind: 'review',
      location,
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
      fileClass: 'text',
      sizeBytes: 0,
      ...extra,
    };
  }

  function rawOf(path: string, text: string = content): RawArtifact {
    return { path, content: text, mtimeMs: 0, size: text.length };
  }

  type ParsedReview = {
    review: { findings: { id: string }[]; pathPhase: unknown; quickId: unknown };
    warnings: { id: string }[];
  };

  describe('ReviewHandler', () => {
    it('claims REVIEW files in every location and not the other tokens', async () => {
      const { ReviewHandler, ReviewFixHandler } =
        await import('../src/planning-repo/handlers/review.ts');
      expect(ReviewHandler.match(refOf('.planning/phases/01-x/01-REVIEW.md', 'phase'))).toBe(true);
      expect(
        ReviewHandler.match(
          refOf('.planning/milestones/v1.0-phases/01-x/01-REVIEW.md', 'archived-phase'),
        ),
      ).toBe(true);
      expect(
        ReviewHandler.match(refOf('.planning/quick/260101-abc-x/260101-abc-REVIEW.md', 'quick')),
      ).toBe(true);
      expect(
        ReviewHandler.match(
          refOf(
            '.planning/milestones/v1.0-quick/260101-abc-x/260101-abc-REVIEW.md',
            'milestone-root',
          ),
        ),
      ).toBe(true);
      expect(ReviewHandler.match(refOf('.planning/phases/01-x/01-REVIEW-FIX.md', 'phase'))).toBe(
        false,
      );
      expect(ReviewHandler.match(refOf('.planning/phases/01-x/01-UI-REVIEW.md', 'phase'))).toBe(
        false,
      );
      expect(ReviewFixHandler.match(refOf('.planning/phases/01-x/01-REVIEW-FIX.md', 'phase'))).toBe(
        true,
      );
      expect(ReviewFixHandler.match(refOf('.planning/phases/01-x/01-REVIEW.md', 'phase'))).toBe(
        false,
      );
    });

    it('carries structured.review with the path facts from the ref and the unchanged warnings', async () => {
      const { ReviewHandler } = await import('../src/planning-repo/handlers/review.ts');
      const path = '.planning/phases/01-x/01-REVIEW.md';
      const phase = ReviewHandler.parse(
        rawOf(path),
        refOf(path, 'phase', {
          phaseIdentity: { milestoneVersion: null, number: '01', projectCode: null, slug: 'x' },
        }),
      );
      const parsed = phase.structured as ParsedReview;
      expect(parsed.review.findings.map((f) => f.id)).toEqual(['WR-01']);
      expect(parsed.review.pathPhase).toEqual({ number: '01', slug: 'x' });
      expect(parsed.review.quickId).toBeNull();
      expect(parsed.warnings).toEqual([{ id: 'WR-01', title: 'A thing' }]);
      const quickPath = '.planning/quick/260101-abc-x/260101-abc-REVIEW.md';
      const quick = ReviewHandler.parse(
        rawOf(quickPath),
        refOf(quickPath, 'quick', { quickTaskId: '260101-abc' }),
      );
      expect((quick.structured as ParsedReview).review.quickId).toBe('260101-abc');
      expect((quick.structured as ParsedReview).review.pathPhase).toBeNull();
      const archivedPath = '.planning/milestones/v1.0-quick/260101-abc-x/260101-abc-REVIEW.md';
      const archived = ReviewHandler.parse(
        rawOf(archivedPath),
        refOf(archivedPath, 'milestone-root'),
      );
      expect((archived.structured as ParsedReview).review.quickId).toBe('260101-abc');
    });

    it('keeps structured.warnings equal to the section projection on the Lendshed archived reviews', async () => {
      const { ReviewHandler } = await import('../src/planning-repo/handlers/review.ts');
      for (const rel of [
        'milestones/v1.0-phases/01-member-data-foundation/01-REVIEW.md',
        'milestones/v1.0-phases/04-shed-to-shed-transfers/04-REVIEW.md',
      ]) {
        const text = readFileSync(fxPath(rel), 'utf8');
        const result = ReviewHandler.parse(rawOf(rel, text), refOf(rel, 'archived-phase'));
        const expected = projectSections('review', result.body).warnings;
        expect((result.structured as ParsedReview).warnings).toEqual(expected);
        expect((result.structured as ParsedReview).warnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('ReviewDispositionHandler', () => {
    const diffPath = '.planning/phases/01-x/01-REVIEW-DISPOSITION.md';
    const diffText =
      '---\nphase: 01\nfindings:\n  - id: WR-01\n    severity: warning\n    disposition: open\n    title: "A thing"\nopen: 1\ntotal: 1\n---\n\n# Phase 01: Code Review Disposition\n';

    it('claims REVIEW-DISPOSITION files only, and carries structured.disposition', async () => {
      vi.resetModules();
      const { ReviewDispositionHandler, ReviewHandler, ReviewFixHandler } =
        await import('../src/planning-repo/handlers/review.ts');
      expect(ReviewDispositionHandler.match(refOf(diffPath, 'phase'))).toBe(true);
      expect(
        ReviewDispositionHandler.match(
          refOf('.planning/milestones/v1.0-phases/01-x/01-REVIEW-DISPOSITION.md', 'archived-phase'),
        ),
      ).toBe(true);
      expect(
        ReviewDispositionHandler.match(refOf('.planning/phases/01-x/01-REVIEW.md', 'phase')),
      ).toBe(false);
      expect(
        ReviewDispositionHandler.match(refOf('.planning/phases/01-x/01-REVIEW-FIX.md', 'phase')),
      ).toBe(false);
      expect(ReviewHandler.match(refOf(diffPath, 'phase'))).toBe(false);
      expect(ReviewFixHandler.match(refOf(diffPath, 'phase'))).toBe(false);
      const result = ReviewDispositionHandler.parse(
        rawOf(diffPath, diffText),
        refOf(diffPath, 'phase'),
      );
      const parsed = result.structured as {
        disposition: { source: string; rows: { id: string }[] };
      };
      expect(parsed.disposition.source).toBe('frontmatter');
      expect(parsed.disposition.rows.map((r) => r.id)).toEqual(['WR-01']);
    });
  });

  describe('ReviewFixHandler', () => {
    it('carries structured.reviewFix', async () => {
      vi.resetModules();
      const { ReviewFixHandler } = await import('../src/planning-repo/handlers/review.ts');
      const path = '.planning/phases/01-x/01-REVIEW-FIX.md';
      const text =
        '---\nstatus: all_fixed\n---\n\n# Fix\n\n## Fixed Issues\n\n### WR-01: A thing\n\n**Commit:** abc1234\n';
      const result = ReviewFixHandler.parse(
        rawOf(path, text),
        refOf(path, 'phase', { kind: 'review-fix' }),
      );
      const fixed = result.structured as {
        reviewFix: { entries: { ids: string[]; commit: string }[] };
      };
      expect(fixed.reviewFix.entries).toEqual([
        expect.objectContaining({ ids: ['WR-01'], commit: 'abc1234' }),
      ]);
    });
  });
});

describe('todo handler', () => {
  const content =
    '---\ntitle: Make it faster\nseverity: major\ncreated: 2026-10-01\n---\n\n## Problem\n\nIt is slow.\n\n## Solution\n\nCache it.\n';

  function refOf(path: string, extra: Partial<ArtifactRef> = {}): ArtifactRef {
    return {
      path,
      kind: 'todo',
      location: 'other',
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
      fileClass: 'text',
      sizeBytes: 0,
      ...extra,
    };
  }

  function rawOf(path: string): RawArtifact {
    return { path, content, mtimeMs: 0, size: content.length };
  }

  type Parsed = {
    todo: { status: string; folder: string; level: string; lead: { heading: string } };
  };

  describe('TodoHandler', () => {
    it('claims refs of kind todo and nothing else', async () => {
      const { TodoHandler } = await import('../src/planning-repo/handlers/todo.ts');
      expect(TodoHandler.match(refOf('.planning/todos/pending/a.md'))).toBe(true);
      expect(TodoHandler.match(refOf('.planning/notes/a.md', { kind: 'unknown' }))).toBe(false);
      expect(
        TodoHandler.match(
          refOf('.planning/phases/01-x/01-UAT.md', { kind: 'uat', location: 'phase' }),
        ),
      ).toBe(false);
    });

    it('carries structured.todo for a completed todo and keeps title, frontmatter and body', async () => {
      const { TodoHandler } = await import('../src/planning-repo/handlers/todo.ts');
      const path = '.planning/todos/completed/make-it-faster.md';
      const result = TodoHandler.parse(rawOf(path), refOf(path));
      const todo = (result.structured as Parsed).todo;
      expect(todo.status).toBe('done');
      expect(todo.folder).toBe('completed');
      expect(todo.level).toBe('high');
      expect(todo.lead.heading).toBe('Problem');
      expect(result.title).toBe('Make it faster');
      expect(result.frontmatter.severity).toBe('major');
      expect(result.body).toContain('## Problem');
      expect(result.body).toContain('Cache it.');
    });
  });
});

describe('ui-review handler', () => {
  const content =
    '---\nstatus: passed\nphase: "01"\n---\n\n# Phase 01 — UI Review\n\n## Pillar Scores\n\n| 1. Color | 4/4 | k |\n';

  function refOf(path: string, phase: boolean): ArtifactRef {
    return {
      path,
      kind: 'ui-review',
      fileClass: 'text',
      sizeBytes: 0,
      location: phase ? 'phase' : 'quick',
      phaseIdentity: phase
        ? { milestoneVersion: null, number: '01', projectCode: null, slug: 'color-pass' }
        : null,
      milestoneVersion: null,
      quickTaskId: null,
    };
  }

  function rawOf(path: string): RawArtifact {
    return { path, content, mtimeMs: 0, size: content.length };
  }

  describe('UiReviewHandler', () => {
    it('carries pathPhase from the ref and null for a quick task', async () => {
      const { UiReviewHandler } = await import('../src/planning-repo/handlers/ui-review.ts');
      const phase = UiReviewHandler.parse(
        rawOf('.planning/phases/01-color-pass/01-UI-REVIEW.md'),
        refOf('.planning/phases/01-color-pass/01-UI-REVIEW.md', true),
      );
      const audit = (phase.structured as { uiReview: { pillars: unknown[]; pathPhase: unknown } })
        .uiReview;
      expect(audit.pillars).toHaveLength(1);
      expect(audit.pathPhase).toEqual({ number: '01', slug: 'color-pass' });
      const quick = UiReviewHandler.parse(
        rawOf('.planning/quick/260101-abc-x/260101-abc-UI-REVIEW.md'),
        refOf('.planning/quick/260101-abc-x/260101-abc-UI-REVIEW.md', false),
      );
      expect(
        (quick.structured as { uiReview: { pathPhase: unknown } }).uiReview.pathPhase,
      ).toBeNull();
    });

    it('matches only the UI-REVIEW token', async () => {
      const { UiReviewHandler } = await import('../src/planning-repo/handlers/ui-review.ts');
      expect(UiReviewHandler.match(refOf('.planning/phases/01-x/01-UI-REVIEW.md', true))).toBe(
        true,
      );
      expect(UiReviewHandler.match(refOf('.planning/phases/01-x/01-UI-SPEC.md', true))).toBe(false);
    });
  });
});

describe('verification handler', () => {
  const content =
    '---\nstatus: passed\nphase: "01-x"\nscore: "1/1"\n---\n\n# Phase 1: Thing Verification Report\n\n**Phase Goal:** Do a thing.\n\n## Gaps Summary\n\nNo gaps.\n';

  function refOf(
    path: string,
    location: ArtifactRef['location'],
    extra: Partial<ArtifactRef> = {},
  ): ArtifactRef {
    return {
      path,
      kind: 'verification',
      location,
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
      fileClass: 'text',
      sizeBytes: 0,
      ...extra,
    };
  }

  function rawOf(path: string): RawArtifact {
    return { path, content, mtimeMs: 0, size: content.length };
  }

  type Parsed = { verification: { goal: string; pathPhase: unknown; quickId: unknown } };

  describe('VerificationHandler', () => {
    it('claims VERIFICATION files in every location and not the other tokens', async () => {
      const { VerificationHandler } = await import('../src/planning-repo/handlers/verification.ts');
      expect(
        VerificationHandler.match(refOf('.planning/phases/01-x/01-VERIFICATION.md', 'phase')),
      ).toBe(true);
      expect(
        VerificationHandler.match(
          refOf('.planning/milestones/v1.0-phases/01-x/01-VERIFICATION.md', 'archived-phase'),
        ),
      ).toBe(true);
      expect(
        VerificationHandler.match(
          refOf('.planning/quick/260101-abc-x/260101-abc-VERIFICATION.md', 'quick'),
        ),
      ).toBe(true);
      expect(
        VerificationHandler.match(
          refOf(
            '.planning/milestones/v1.0-quick/260101-abc-x/260101-abc-VERIFICATION.md',
            'milestone-root',
          ),
        ),
      ).toBe(true);
      expect(VerificationHandler.match(refOf('.planning/phases/01-x/01-UAT.md', 'phase'))).toBe(
        false,
      );
    });

    it('carries structured.verification with the path facts from the ref', async () => {
      const { VerificationHandler } = await import('../src/planning-repo/handlers/verification.ts');
      const path = '.planning/phases/01-x/01-VERIFICATION.md';
      const phase = VerificationHandler.parse(
        rawOf(path),
        refOf(path, 'phase', {
          phaseIdentity: { milestoneVersion: null, number: '01', projectCode: null, slug: 'x' },
        }),
      );
      const parsed = phase.structured as Parsed;
      expect(parsed.verification.goal).toBe('Do a thing.');
      expect(parsed.verification.pathPhase).toEqual({ number: '01', slug: 'x' });
      expect(parsed.verification.quickId).toBeNull();
      const quickPath = '.planning/quick/260101-abc-x/260101-abc-VERIFICATION.md';
      const quick = VerificationHandler.parse(
        rawOf(quickPath),
        refOf(quickPath, 'quick', { quickTaskId: '260101-abc' }),
      );
      expect((quick.structured as Parsed).verification.quickId).toBe('260101-abc');
      expect((quick.structured as Parsed).verification.pathPhase).toBeNull();
      const archivedPath =
        '.planning/milestones/v1.0-quick/260101-abc-x/260101-abc-VERIFICATION.md';
      const archived = VerificationHandler.parse(
        rawOf(archivedPath),
        refOf(archivedPath, 'milestone-root'),
      );
      expect((archived.structured as Parsed).verification.quickId).toBe('260101-abc');
    });
  });
});
