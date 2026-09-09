// Test-only loader (quick-260910-0x4 item 7, plan 01-01's original must-have restored): walks a
// real directory tree once and returns an in-memory instance holding its contents. This is the
// only place under test/ a real directory read is legitimate for building a PlanningFilesystem —
// D-08's fs-equivalence proof runs identical fixtures through both PlanningFilesystem
// implementations, and this is how the in-memory side gets its data.
//
// Previously lived as InMemoryPlanningFilesystem.static fromDirectory() in
// src/planning-fs/in-memory-fs.ts, which made that file the second importer under src/ of the Node
// filesystem module (local-fs.ts being the sole intended one) — a seam violation with no
// correctness consequence (DATA-01's substitution guarantee never depended on it: the interface
// methods themselves never touch real disk) but a drift risk left uncorrected. Moved here verbatim;
// only the import path at every call site changed, not what this function asserts or returns.
//
// Covered by tsconfig.server.json's `test/**/*.ts` include (typechecked) but NOT matched by
// vitest.config.ts's `test/**/*.test.ts` collection glob (not collected as an empty suite) — this
// file's name deliberately has no `.test.ts` suffix.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';

export async function fromDirectory(rootPath: string): Promise<InMemoryPlanningFilesystem> {
  const contents: Record<string, string> = {};
  let latestMtime = 0;

  function walk(dir: string): void {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile()) {
        const relPath = relative(rootPath, abs).split(sep).join('/');
        const stat = statSync(abs);
        latestMtime = Math.max(latestMtime, stat.mtimeMs);
        contents[relPath] = readFileSync(abs, 'utf8');
      }
    }
  }

  walk(rootPath);
  return new InMemoryPlanningFilesystem(contents, latestMtime);
}
