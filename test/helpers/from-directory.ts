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
import { BINARY_EXTENSIONS, IMAGE_EXTENSIONS, SNIFF_BYTES, extensionOf } from '../../src/planning-repo/file-class.ts';

/** True for a file whose bytes must survive unchanged: an image or binary extension, or a NUL in its head. */
function keepsBytes(name: string, buffer: Buffer): boolean {
  const ext = extensionOf(name);
  if (ext !== null && (IMAGE_EXTENSIONS.has(ext) || BINARY_EXTENSIONS.has(ext))) return true;
  return buffer.subarray(0, SNIFF_BYTES).includes(0);
}

export async function fromDirectory(rootPath: string): Promise<InMemoryPlanningFilesystem> {
  const contents: Record<string, string | Uint8Array> = {};
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
        // Read as bytes first: decoding an image or a NUL-bearing file as UTF-8 would corrupt it and
        // break size parity with the real filesystem (fs-equivalence.test.ts).
        const buffer = readFileSync(abs);
        contents[relPath] = keepsBytes(entry.name, buffer) ? new Uint8Array(buffer) : buffer.toString('utf8');
      }
    }
  }

  walk(rootPath);
  return new InMemoryPlanningFilesystem(contents, latestMtime);
}
