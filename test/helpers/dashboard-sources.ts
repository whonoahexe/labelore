// Test-only reader (quick-261018-4tb): the dashboard page and the section modules it was split
// into (src/web/pages/dashboard-*.tsx), as one string. A contract that pinned markup in
// dashboard-page.tsx reads this instead, so moving a section into its own module keeps the same
// assertion honest. Not matched by vitest.config.ts's `*.test.ts` glob.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGES = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src/web/pages');

/** dashboard-page.tsx followed by every other dashboard-*.tsx, in name order. */
export function dashboardSources(): string {
  const modules = readdirSync(PAGES)
    .filter((name) => /^dashboard-.+\.tsx$/.test(name) && name !== 'dashboard-page.tsx')
    .sort();
  return ['dashboard-page.tsx', ...modules].map((name) => readFileSync(join(PAGES, name), 'utf8')).join('\n');
}
