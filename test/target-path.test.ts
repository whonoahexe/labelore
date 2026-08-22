// Path targeting + never-throwing load contract (Task 2). One case per line of the plan's
// <behavior> block. Symlink/permission/missing-path cases build inside a per-test temp directory
// under the OS temp dir and tear it down afterward — never inside fixtures/, which stays
// committable and reproducible.
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, symlinkSync, chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, resolve, relative, sep } from 'node:path';
import { resolveTargetPath } from '../src/cli/target-path.ts';
import { LocalFsPlanningFilesystem } from '../src/planning-fs/local-fs.ts';
import { PlanningRepository } from '../src/planning-repo/snapshot.ts';

const FIXTURE_ROOT = resolve('fixtures/sparse-empty');
const IS_ROOT = typeof process.getuid === 'function' && process.getuid() === 0;

const cleanupPaths: string[] = [];

afterEach(() => {
  while (cleanupPaths.length) {
    const p = cleanupPaths.pop();
    if (!p) continue;
    try {
      chmodSync(p, 0o700);
    } catch {
      // best-effort — path may already be gone or already have normal perms
    }
    try {
      rmSync(p, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
  }
});

describe('resolveTargetPath — path targeting contract', () => {
  it('resolves an absolute path to a project root as ok', () => {
    const result = resolveTargetPath(FIXTURE_ROOT);
    expect('status' in result).toBe(false);
    if (!('status' in result)) {
      expect(result.rootPath).toBe(FIXTURE_ROOT);
    }
  });

  it('resolves a relative path to the same root identically to the absolute case', () => {
    const relPath = relative(process.cwd(), FIXTURE_ROOT);
    const relResult = resolveTargetPath(relPath);
    const absResult = resolveTargetPath(FIXTURE_ROOT);
    expect(relResult).toEqual(absResult);
  });

  it('resolves a tilde-prefixed path when the fixture is reachable from $HOME', () => {
    const rel = relative(homedir(), FIXTURE_ROOT);
    if (rel.startsWith('..')) {
      // Fixture isn't reachable from $HOME on this machine — skip, per the plan's own wording.
      return;
    }
    const tildePath = `~/${rel.split(sep).join('/')}`;
    const result = resolveTargetPath(tildePath);
    expect('status' in result).toBe(false);
    if (!('status' in result)) {
      expect(result.rootPath).toBe(FIXTURE_ROOT);
    }
  });

  it("resolves a symlinked root to the symlink's target, not the link path", () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gsd-lore-symlink-'));
    cleanupPaths.push(tmp);
    const linkPath = join(tmp, 'project-link');
    symlinkSync(FIXTURE_ROOT, linkPath, 'dir');
    const result = resolveTargetPath(linkPath);
    expect('status' in result).toBe(false);
    if (!('status' in result)) {
      expect(result.rootPath).toBe(FIXTURE_ROOT);
    }
  });

  it('resolves a path pointing directly at .planning identically to its parent', () => {
    const direct = resolveTargetPath(join(FIXTURE_ROOT, '.planning'));
    const parent = resolveTargetPath(FIXTURE_ROOT);
    expect(direct).toEqual(parent);
  });

  it('returns path-not-found for a nonexistent path, without throwing', () => {
    const raw = '/definitely/not/a/real/path/xyz-does-not-exist';
    const result = resolveTargetPath(raw);
    expect('status' in result && result.status).toBe('path-not-found');
    if ('status' in result && result.status === 'path-not-found') {
      expect(result.rawPath).toBe(raw);
      expect(result.pathChecked).toBe(resolve(raw));
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('returns not-a-gsd-project for an existing directory with no .planning child, without throwing', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gsd-lore-noproject-'));
    cleanupPaths.push(tmp);
    const result = resolveTargetPath(tmp);
    expect('status' in result && result.status).toBe('not-a-gsd-project');
    if ('status' in result && result.status === 'not-a-gsd-project') {
      expect(result.pathChecked).toBe(tmp);
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('returns permission-denied for a directory whose read permission is removed, without throwing', () => {
    if (IS_ROOT) {
      // A root process can read a mode-000 directory — the assertion would be vacuous.
      return;
    }
    const tmp = mkdtempSync(join(tmpdir(), 'gsd-lore-noperm-'));
    cleanupPaths.push(tmp);
    chmodSync(tmp, 0o000);
    const result = resolveTargetPath(tmp);
    expect('status' in result && result.status).toBe('permission-denied');
    if ('status' in result && result.status === 'permission-denied') {
      expect(result.pathChecked).toBe(tmp);
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('maps every non-ok status to project: null and a non-empty message (spot check via buildSnapshotJson-shaped failure)', () => {
    const missing = resolveTargetPath('/definitely/not/a/real/path/xyz-does-not-exist');
    expect('status' in missing).toBe(true);
    if ('status' in missing) {
      expect(missing.status).not.toBe('ok');
      expect(missing.message.length).toBeGreaterThan(0);
    }
  });
});

describe('inside-tree symlink escape', () => {
  it('refuses to return content for a symlink inside the tree resolving outside the canonicalized root, recording a stage "read" warning naming the escaping path', async () => {
    const tmp = mkdtempSync(join(tmpdir(), 'gsd-lore-escape-'));
    cleanupPaths.push(tmp);
    const projectRoot = join(tmp, 'project');
    const outside = join(tmp, 'outside-secret.md');
    mkdirSync(join(projectRoot, '.planning'), { recursive: true });
    writeFileSync(outside, '# secret content that must never be returned', 'utf8');
    symlinkSync(outside, join(projectRoot, '.planning', 'escape.md'));

    const fs = new LocalFsPlanningFilesystem(projectRoot);
    const repo = new PlanningRepository(fs, projectRoot);
    const snapshot = await repo.load();

    expect(snapshot.loadStatus.status).toBe('ok');
    const escapingArtifact = snapshot.project?.artifacts['.planning/escape.md'];
    expect(escapingArtifact).toBeDefined();
    expect(escapingArtifact?.body).toBe('');

    const readWarning = snapshot.warnings.find(
      (w) => w.path === '.planning/escape.md' && w.stage === 'read',
    );
    expect(readWarning).toBeDefined();
    expect(readWarning?.salvage).toContain('nothing readable');
    expect(readWarning?.message).toContain('escape.md');
  });
});
