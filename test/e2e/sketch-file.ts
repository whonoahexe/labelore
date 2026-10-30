// The sketches under .planning/sketches/ as the browser specs meet them: the winning variant is read from
// the sketch's own README (its `winner:` frontmatter line), never written into a spec, and a sketch page is
// opened from disk at the variant, theme and state a comparison needs. This is a helper, not a spec
// (testMatch is *.spec.ts); the sketches are static files, so opening one is not an app address and is not
// part of the project-URL contract that test/e2e-url-contract.test.ts holds the specs to.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Page } from '@playwright/test';

const SKETCHES = fileURLToPath(new URL('../../.planning/sketches', import.meta.url));

/** The winning variant letter ('A', 'B' or 'C') the sketch's README names in its frontmatter. */
export function sketchWinner(sketch: string): 'A' | 'B' | 'C' {
  const readme = readFileSync(join(SKETCHES, sketch, 'README.md'), 'utf8');
  const winner = /^winner:\s*([A-C])\s*$/m.exec(readme)?.[1];
  if (winner !== 'A' && winner !== 'B' && winner !== 'C') {
    throw new Error(`${sketch}/README.md names no winner (A, B or C) in its frontmatter`);
  }
  return winner;
}

/** Opens the sketch's index.html at its winning variant (`#a`, `#b` or `#c`), with the theme forced and
 * any other query a state needs (`state=popup`, `long=1`, `page=populated`). */
export async function openSketch(
  page: Page,
  sketch: string,
  options: { theme: 'light' | 'dark'; query?: Record<string, string> },
): Promise<void> {
  const url = pathToFileURL(join(SKETCHES, sketch, 'index.html'));
  for (const [name, value] of Object.entries({ ...options.query, theme: options.theme })) {
    url.searchParams.set(name, value);
  }
  url.hash = sketchWinner(sketch).toLowerCase();
  await page.goto(url.href);
  await page.evaluate(() => document.fonts.ready);
}
