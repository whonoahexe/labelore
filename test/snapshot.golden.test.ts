// The committed golden suite (D-05, D-07). One assertion per fixture tree against
// test/__golden__/<fixture>.json, through the same exported harness function the CLI calls
// (buildSnapshotJson) — the tested path cannot diverge from the runnable one.
//
// A note on what a zero-warning assertion means per tree, since this file intentionally never
// makes one: `sparse-empty` and `sparse-started` are entirely healthy fixtures and their goldens
// report zero warnings, as a byte-for-byte property of the committed JSON — nothing here asserts
// that separately. `dense`'s golden permanently contains warnings by deliberate design (D-02): its
// three corrupted files are load-bearing fixtures for Phase 4's degradation claims, and any
// assertion of zero warnings against it would always be wrong. Warnings on the dense tree are
// asserted by stage and by named path — never by total count — in test/degradation.test.ts, not
// here. This file's job is narrower: does the stable snapshot for each tree match its committed
// golden, byte for byte.
//
// The cross-implementation equivalence proof (D-08) lives in test/fs-equivalence.test.ts, not
// here — this file is goldens-only.
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildSnapshotJson } from '../src/cli/snapshot.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FIXTURES = ['sparse-empty', 'sparse-started', 'dense'] as const;

describe.each(FIXTURES)('snapshot golden — %s', (fixtureName) => {
  it(`matches the committed golden via LocalFsPlanningFilesystem (through the CLI entry point)`, async () => {
    const fixtureRoot = join(__dirname, '..', 'fixtures', fixtureName);
    const result = await buildSnapshotJson(fixtureRoot, { stable: true, withBodies: false });
    await expect(JSON.stringify(result, null, 2)).toMatchFileSnapshot(`__golden__/${fixtureName}.json`);
  });
});
