// quick-261006-iz6 (QKIZ6-08, T-iz6-04): createFileDates — the git author date of the commit that ADDED
// a file, read-only, cached and never throwing. A real temp repository covers the rename case and the
// untouched index; an injected runner covers the refusals, the cache and the failure paths without
// running git. The document response carries `mtimeMs` and `addedAt` (null outside a repository).
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { Artifact, Project } from '../../src/domain/model.ts';
import type { ProjectSnapshot } from '../../src/planning-repo/types.ts';
import { createApp } from '../../src/server/index.ts';
import { createFileDates } from '../../src/server/file-dates.ts';
import type { GitRunner } from '../../src/server/file-dates.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function temp(): string {
  const dir = mkdtempSync(join(tmpdir(), 'labelore-file-dates-'));
  dirs.push(dir);
  return dir;
}

function git(cwd: string, args: string[], date?: string): void {
  execFileSync('git', args, {
    cwd,
    stdio: 'pipe',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 't',
      GIT_AUTHOR_EMAIL: 't@example.com',
      GIT_COMMITTER_NAME: 't',
      GIT_COMMITTER_EMAIL: 't@example.com',
      ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}),
    },
  });
}

describe('createFileDates — a real repository', () => {
  it('reads the add date of a file that was later moved', async () => {
    const root = temp();
    git(root, ['init', '-q']);
    mkdirSync(join(root, '.planning/phases/01-x'), { recursive: true });
    writeFileSync(join(root, '.planning/phases/01-x/01-01-PLAN.md'), 'plan\n'.repeat(20));
    git(root, ['add', '.'], '2026-08-03T22:12:52+05:30');
    git(root, ['commit', '-q', '-m', 'add'], '2026-08-03T22:12:52+05:30');
    mkdirSync(join(root, '.planning/milestones/v1.0-phases/01-x'), { recursive: true });
    git(root, ['mv', '.planning/phases/01-x/01-01-PLAN.md', '.planning/milestones/v1.0-phases/01-x/01-01-PLAN.md']);
    git(root, ['commit', '-q', '-m', 'archive'], '2026-09-20T10:00:00+05:30');

    const dates = createFileDates(root);
    expect(await dates.addedAt('.planning/milestones/v1.0-phases/01-x/01-01-PLAN.md')).toBe('2026-08-03T22:12:52+05:30');
  });

  it('leaves the repository index untouched', async () => {
    const root = temp();
    git(root, ['init', '-q']);
    mkdirSync(join(root, '.planning'), { recursive: true });
    writeFileSync(join(root, '.planning/A-PLAN.md'), 'x\n');
    git(root, ['add', '.']);
    git(root, ['commit', '-q', '-m', 'add'], '2026-01-02T03:04:05+05:30');
    const before = statSync(join(root, '.git/index')).mtimeMs;
    const dates = createFileDates(root);
    expect(await dates.addedAt('.planning/A-PLAN.md')).toBe('2026-01-02T03:04:05+05:30');
    expect(statSync(join(root, '.git/index')).mtimeMs).toBe(before);
  });

  it('gives null in a directory that is not a repository', async () => {
    const root = temp();
    mkdirSync(join(root, '.planning'), { recursive: true });
    writeFileSync(join(root, '.planning/A-PLAN.md'), 'x\n');
    expect(await createFileDates(root).addedAt('.planning/A-PLAN.md')).toBeNull();
  });
});

describe('createFileDates — refusals, cache and failures (injected runner)', () => {
  function spy(output: string | Error = '2026-01-02T03:04:05+00:00\n'): { run: GitRunner; calls: string[][] } {
    const calls: string[][] = [];
    const run: GitRunner = async (args) => {
      calls.push(args);
      if (output instanceof Error) throw output;
      return output;
    };
    return { run, calls };
  }

  it('refuses an empty or relative root and an unsafe path without running git', async () => {
    for (const [root, path] of [
      ['', '.planning/A.md'],
      ['relative/root', '.planning/A.md'],
      ['/root', '.planning/../secret'],
      ['/root', 'src/index.ts'],
      ['/root', '-rf'],
      ['/root', '.planning/a\\b'],
      ['/root', '.planning/a\0b'],
    ] as const) {
      const { run, calls } = spy();
      expect(await createFileDates(root, run).addedAt(path), `${root} ${path}`).toBeNull();
      expect(calls).toEqual([]);
    }
  });

  it('runs git with an argument array, a fsmonitor override and -- before the path, once per path', async () => {
    const { run, calls } = spy();
    const dates = createFileDates('/root', run);
    expect(await dates.addedAt('.planning/A-PLAN.md')).toBe('2026-01-02T03:04:05+00:00');
    expect(await dates.addedAt('.planning/A-PLAN.md')).toBe('2026-01-02T03:04:05+00:00');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual([
      '-c',
      'core.fsmonitor=false',
      '--no-pager',
      'log',
      '--diff-filter=A',
      '--follow',
      '--format=%aI',
      '--',
      '.planning/A-PLAN.md',
    ]);
  });

  it('takes the last output line (the oldest add)', async () => {
    const { run } = spy('2026-09-01T00:00:00+00:00\n2026-02-03T04:05:06+00:00\n');
    expect(await createFileDates('/root', run).addedAt('.planning/A-PLAN.md')).toBe('2026-02-03T04:05:06+00:00');
  });

  it('gives null when the runner fails or prints something that is not a date', async () => {
    expect(await createFileDates('/root', spy(new Error('timeout')).run).addedAt('.planning/A-PLAN.md')).toBeNull();
    expect(await createFileDates('/root', spy('not a date\n').run).addedAt('.planning/A-PLAN.md')).toBeNull();
    expect(await createFileDates('/root', spy('').run).addedAt('.planning/A-PLAN.md')).toBeNull();
    expect(await createFileDates('/root', spy('2026-13-45 junk\n').run).addedAt('.planning/A-PLAN.md')).toBeNull();
  });
});

describe('the document response', () => {
  function artifact(path: string): Artifact {
    return {
      id: path,
      kind: 'plan',
      location: 'phase',
      frontmatter: {},
      title: path,
      body: '<objective>\nGo.\n</objective>\n',
      bodyLength: 30,
      bodyHash: 'x',
      mtimeMs: 1234,
      warnings: [],
      structured: {},
      path,
    };
  }

  it('carries mtimeMs as a number and addedAt as null outside a git repository', async () => {
    const plan = artifact('.planning/phases/01-x/01-01-PLAN.md');
    const project: Project = {
      rootPath: '/fixture',
      name: 'Fixture',
      artifacts: { [plan.path]: plan },
      config: {},
      milestones: [],
      phases: [],
      quickTasks: [],
      requirements: [],
      mentions: { byId: {}, all: [] },
    };
    const snapshot: ProjectSnapshot = {
      loadStatus: { status: 'ok' },
      readAt: '2026-10-07T00:00:00.000Z',
      rootPath: '/fixture',
      project,
      warnings: [],
      exclusions: [],
    };
    const app = createApp({ getSnapshot: () => snapshot }, true, '.');
    const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
    const dto = presentation.artifacts.find((candidate) => candidate.path === plan.path);
    const response = await app.request(`/api/documents?route=${encodeURIComponent(dto?.key ?? '')}`);
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { artifact: { mtimeMs: unknown; addedAt: unknown } };
    expect(payload.artifact.mtimeMs).toBe(1234);
    expect(payload.artifact.addedAt).toBeNull();
  });
});
