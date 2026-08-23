// Harness entry point shared by the CLI and the golden test suite (D-05) — the tested path cannot
// diverge from the runnable one because both call buildSnapshotJson.
import { pathToFileURL } from 'node:url';
import { LocalFsPlanningFilesystem } from '../planning-fs/local-fs.ts';
import { PlanningRepository } from '../planning-repo/snapshot.ts';
import { normalizeForGolden } from '../planning-repo/serialize.ts';
import { resolveTargetPath } from './target-path.ts';
import type { ProjectSnapshot } from '../planning-repo/types.ts';

export interface SnapshotOptions {
  withBodies: boolean;
  stable: boolean;
}

export async function buildSnapshotJson(
  rawPath: string,
  options: SnapshotOptions,
): Promise<Record<string, unknown>> {
  const resolved = resolveTargetPath(rawPath);

  let snapshot: ProjectSnapshot;
  let effectiveRoot: string;

  if ('status' in resolved) {
    // resolveTargetPath itself failed — build a failing snapshot directly rather than constructing
    // a filesystem against a path we already know is bad.
    effectiveRoot = resolved.pathChecked;
    snapshot = {
      loadStatus: resolved,
      readAt: new Date().toISOString(),
      rootPath: resolved.pathChecked,
      project: null,
      warnings: [],
      exclusions: [],
    };
  } else {
    effectiveRoot = resolved.rootPath;
    const fs = new LocalFsPlanningFilesystem(resolved.rootPath);
    const repo = new PlanningRepository(fs, resolved.rootPath);
    snapshot = await repo.load();
  }

  return normalizeForGolden(snapshot, effectiveRoot, options) as Record<string, unknown>;
}

function parseArgs(argv: string[]): { rawPath: string | null; options: SnapshotOptions } {
  const withBodies = argv.includes('--with-bodies');
  const stable = argv.includes('--stable');
  const rawPath = argv.find((a) => !a.startsWith('--')) ?? null;
  return { rawPath, options: { withBodies, stable } };
}

async function main(): Promise<void> {
  const { rawPath, options } = parseArgs(process.argv.slice(2));
  if (!rawPath) {
    console.error('Usage: snapshot <path> [--with-bodies] [--stable]');
    process.exitCode = 1;
    return;
  }

  const result = await buildSnapshotJson(rawPath, options);
  // Set the exit code and let main()'s returned promise resolve naturally rather than calling
  // process.exit() here. On a piped (non-TTY) stdout, console.log's underlying write is
  // asynchronous — a large snapshot (this corpus routinely exceeds the OS pipe buffer size)
  // truncates mid-write if the process exits before the write drains. Letting the event loop run
  // to completion is what guarantees the whole payload reaches the consumer on the other end of
  // the pipe (e.g. `npm run snapshot -- fixtures/dense --stable | node -e ...`, this task's own
  // verification harness).
  console.log(JSON.stringify(result, null, 2));

  const loadStatus = result.loadStatus as { status: string; message?: string } | undefined;
  if (loadStatus && loadStatus.status !== 'ok') {
    console.error(loadStatus.message ?? `Failed to load project: ${loadStatus.status}`);
    process.exitCode = 1;
    return;
  }
  process.exitCode = 0;
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
