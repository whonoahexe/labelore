// Phase 9, plan 03: a phase's suffixed fix files (03-REVIEW-FIX-backend.md) are review fixes with clean
// addresses, read by ReviewFixHandler like a plain fix file. Pinned on the made-up Lendshed project.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadFixtureProject } from './helpers/fixture-project.ts';
import type { LoadedProject } from './helpers/fixture-project.ts';

let lendshed: LoadedProject;

beforeAll(async () => {
  lendshed = await loadFixtureProject();
});

function artifactAt(path: string) {
  const found = lendshed.presentation.artifacts.find((artifact) => artifact.path === `.planning/${path}`);
  if (!found) throw new Error(`Lendshed presentation has no artifact at .planning/${path}`);
  return found;
}

const PHASE_3 = 'phases/03-account-admin-and-sessions';

describe('suffixed review fix files (Lendshed phase 3)', () => {
  it.each([
    [`${PHASE_3}/03-REVIEW-FIX-backend.md`, '/v1.1/phase-3/review-fix-backend'],
    [`${PHASE_3}/03-REVIEW-FIX-frontend.md`, '/v1.1/phase-3/review-fix-frontend'],
  ])('%s has kind review-fix and the key %s', (path, key) => {
    const artifact = artifactAt(path);
    expect(artifact.kind).toBe('review-fix');
    expect(artifact.key).toBe(key);
  });

  it('is read by the review fix handler: both files carry entries', () => {
    for (const suffix of ['backend', 'frontend']) {
      const artifact = artifactAt(`${PHASE_3}/03-REVIEW-FIX-${suffix}.md`);
      const reviewFix = artifact.structured.reviewFix as { entries: unknown[] } | undefined;
      expect(reviewFix?.entries.length ?? 0).toBeGreaterThan(0);
    }
  });
});

type DispositionStructured = { rows: unknown[] };

describe('review disposition files (Lendshed phase 1)', () => {
  const path = 'phases/01-member-sign-in-sessions/01-REVIEW-DISPOSITION.md';

  it('has kind review-disposition and the key /v1.1/phase-1/review-disposition', () => {
    const artifact = artifactAt(path);
    expect(artifact.kind).toBe('review-disposition');
    expect(artifact.key).toBe('/v1.1/phase-1/review-disposition');
  });

  it('carries six structured.disposition rows', () => {
    const disposition = artifactAt(path).structured.disposition as DispositionStructured | undefined;
    expect(disposition?.rows).toHaveLength(6);
  });
});
