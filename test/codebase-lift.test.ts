// Phase 10 (10-05, VIEW-13, TGT-09): the Stack chips and the Concerns counts. Tidemark (the made-up map-only
// fixture) pins both per section, counted by hand in test/fixtures/tidemark/README.md under the adjusted
// rule 10-03-SUMMARY.md records. The other cases plant one shape each.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { extractCodebase, matchKey, normaliseHeading } from '../src/planning-repo/handlers/codebase-lift.ts';

const TIDEMARK = new URL('./fixtures/tidemark/.planning/codebase/', import.meta.url);

function lift(doc: string, content?: string) {
  const text = content ?? readFileSync(new URL(`${doc.toUpperCase()}.md`, TIDEMARK), 'utf8');
  const fm = tryParseFrontmatter(text);
  return extractCodebase(doc, fm.data, fm.body);
}

const concerns = (body: string) => lift('concerns', `# Codebase Concerns\n\n${body}`).concerns;
const stack = (body: string) => lift('stack', `# Technology Stack\n\n${body}`).stack;

describe('normaliseHeading', () => {
  it('drops a leading emoji, number and punctuation, lower-cases, reads & as and, drops one trailing s', () => {
    expect(normaliseHeading('Languages & Runtimes')).toBe('languages and runtime');
    expect(normaliseHeading('🧱  3.  Key   Dependencies')).toBe('key dependencie');
    expect(normaliseHeading('## Test Types')).toBe('test type');
    expect(normaliseHeading('Business')).toBe('business');
    expect(normaliseHeading("What's Not Tested")).toBe('whats not tested');
    expect(normaliseHeading('CI/CD & Deployment')).toBe('ci cd and deployment');
    expect(normaliseHeading('👀')).toBe('');
  });
});

describe('matchKey', () => {
  it('matches Languages & Runtimes to languages and leaves API Architecture plain', () => {
    expect(matchKey('stack', 'Languages & Runtimes')).toBe('languages');
    expect(matchKey('architecture', 'API Architecture')).toBeNull();
  });

  it('prefers an equal heading over a prefix over a containment, and the longest key within a tier', () => {
    expect(matchKey('testing', 'Test Coverage')).toBe('coverage');
    expect(matchKey('testing', 'Test Types Summary')).toBe('test-types');
    expect(matchKey('structure', 'Where to Add New Code (and how)')).toBe('where-to-add-new-code');
  });

  it('reaches only Map entries: object member names match nothing', () => {
    for (const name of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
      expect(matchKey('stack', name)).toBeNull();
    }
    expect(matchKey('constructor', 'Languages')).toBeNull();
    expect(matchKey('__proto__', 'Languages')).toBeNull();
  });
});

describe('the Stack lift', () => {
  const lifted = lift('stack').stack!;

  it('reads Tidemark STACK languages with versions, the primary and secondary groups, and the runtime', () => {
    expect(lifted.languages).toEqual([
      { name: 'TypeScript', version: '5.6', group: 'primary' },
      { name: 'SQL', version: null, group: 'secondary' },
      { name: 'Shell', version: null, group: 'secondary' },
    ]);
    expect(lifted.runtime).toEqual([{ name: 'Node.js', version: '22', group: 'runtime' }]);
  });

  it('reads Tidemark STACK frameworks grouped core, testing and build-dev', () => {
    expect(lifted.frameworks).toEqual([
      { name: 'Express', version: '5.1', group: 'core' },
      { name: 'React', version: '19', group: 'core' },
      { name: 'Vitest', version: '3.2', group: 'testing' },
      { name: 'Playwright', version: '1.50', group: 'testing' },
      { name: 'Vite', version: '6', group: 'build-dev' },
      { name: 'tsx', version: '4', group: 'build-dev' },
    ]);
  });

  it('leaves the package manager and its lockfile line out of the chips', () => {
    const names = [...lifted.languages, ...lifted.runtime, ...lifted.frameworks].map((c) => c.name);
    expect(names).not.toContain('npm');
    expect(names.join(' ')).not.toContain('Lockfile');
  });

  it("sets the key number to languages plus frameworks (3 + 6 on Tidemark)", () => {
    expect(lift('stack').keyNumber).toBe(9);
  });

  it('splits at the first spaced dash and reads the version as the first digit-led token on the left', () => {
    const chips = stack(
      [
        '## Languages',
        '',
        '**Primary:**',
        '- TypeScript 5.9.3 (devDependency `typescript`, `package.json`) - all server code',
        '- Node.js `>=22.18.0` (engines) - the runtime',
        '- React v19 - client - with a second dash',
        '- @base-ui/react ^1.7.0 - primitives',
      ].join('\n'),
    )!.languages;
    expect(chips.map((c) => [c.name, c.version])).toEqual([
      ['TypeScript', '5.9.3'],
      ['Node.js', '>=22.18.0'],
      ['React', 'v19'],
      ['@base-ui/react', '^1.7.0'],
    ]);
  });

  it('gives a bullet with no version a chip with version null', () => {
    const chips = stack('## Languages\n\n- Rust (edition 2024) - the core\n- SQL - migrations\n')!.languages;
    expect(chips).toEqual([
      { name: 'Rust (edition 2024)', version: null, group: 'primary' },
      { name: 'SQL', version: null, group: 'primary' },
    ]);
  });

  it('gives a bullet with no spaced dash the whole text as its name', () => {
    const chips = stack('## Frameworks\n\n- Hono 4.13 and a long note with no dash\n- foo-bar 2\n')!.frameworks;
    expect(chips.map((c) => [c.name, c.version])).toEqual([
      ['Hono 4.13 and a long note with no dash', null],
      ['foo-bar 2', null],
    ]);
  });

  it('does not read a version-looking token inside a parenthetical qualifier', () => {
    const chips = stack('## Languages\n\n- CSS (Tailwind v4 CSS-first config) - styles\n')!.languages;
    expect(chips).toEqual([{ name: 'CSS (Tailwind v4 CSS-first config)', version: null, group: 'primary' }]);
  });

  it('does not read a digit-led first word as a version', () => {
    const chips = stack('## Languages\n\n- 3D shaders - the renderer\n')!.languages;
    expect(chips).toEqual([{ name: '3D shaders', version: null, group: 'primary' }]);
  });

  it('strips backticks and bold markers from names', () => {
    const chips = stack('## Frameworks\n\n- **Vite** 8.2 - bundler\n- `@hono/node-server` 2.1.1 - adapter\n')!.frameworks;
    expect(chips.map((c) => c.name)).toEqual(['Vite', '@hono/node-server']);
  });

  it('reads a Runtime section, ignores nested bullets and bullets inside a fence, and defaults groups', () => {
    const result = stack(
      [
        '## Runtime',
        '',
        '**Environment:**',
        '- Node.js 22 - server',
        '  - nested note 9 - ignored',
        '```',
        '- fenced 1 - ignored',
        '```',
        '**Package Manager:**',
        '- npm 10',
        '',
        '## Frameworks',
        '',
        '- Hono 4 - API',
      ].join('\n'),
    )!;
    expect(result.runtime).toEqual([{ name: 'Node.js', version: '22', group: 'runtime' }]);
    expect(result.frameworks).toEqual([{ name: 'Hono', version: '4', group: 'core' }]);
  });

  it('lifts a plain Languages section that has no group labels, in the primary group', () => {
    expect(stack('## Languages\n\n- Go 1.22 - tools\n')!.languages).toEqual([
      { name: 'Go', version: '1.22', group: 'primary' },
    ]);
  });

  it('gives an empty lift for a stack document with none of the three sections', () => {
    const result = lift('stack', '# S\n\n## Something Else\n\n- Go 1.22 - x\n');
    expect(result.stack).toEqual({ languages: [], runtime: [], frameworks: [] });
    expect(result.keyNumber).toBe(0);
  });

  it('caps the chips at 60 and every name and version at 120 characters', () => {
    const many = Array.from({ length: 200 }, (_, i) => `- Tool${i} ${i}.0 - note`).join('\n');
    const result = stack(`## Frameworks\n\n${many}\n`)!;
    expect(result.frameworks).toHaveLength(60);
    const long = stack(`## Languages\n\n- ${'N'.repeat(300)} 1.0 - x\n`)!.languages[0];
    expect(long.name).toHaveLength(120);
    const longVersion = stack(`## Languages\n\n- Go ${'9'.repeat(300)} - x\n`)!.languages[0];
    expect(longVersion.version).toHaveLength(120);
  });

  it('lifts nothing for a document that is not the stack', () => {
    expect(lift('architecture').stack).toBeUndefined();
    expect(lift('concerns').stack).toBeUndefined();
  });
});

describe('the Concerns lift', () => {
  it('counts Tidemark CONCERNS per section, in template order: 3, 1, 2, 2, 3, 2, 0, 1, 0', () => {
    const result = lift('concerns').concerns!;
    expect(result.sections.map((s) => [s.key, s.count])).toEqual([
      ['tech-debt', 3],
      ['known-bugs', 1],
      ['security-considerations', 2],
      ['performance-bottlenecks', 2],
      ['fragile-areas', 3],
      ['scaling-limits', 2],
      ['dependencies-at-risk', 0],
      ['missing-critical-features', 1],
      ['test-coverage-gaps', 0],
    ]);
    expect(result.sections.map((s) => s.heading)[0]).toBe('Tech Debt');
    expect(result.total).toBe(14);
    expect(result.missing).toEqual([]);
    expect(lift('concerns').keyNumber).toBe(14);
  });

  it('counts a single bold-label group as one (the "two or more" rule would lose it)', () => {
    const result = concerns('## Dependencies at Risk\n\n**Old parser:**\n- Issue: unmaintained\n- Impact: low\n')!;
    expect(result.sections).toEqual([{ key: 'dependencies-at-risk', heading: 'Dependencies at Risk', count: 1 }]);
  });

  it('counts a group whose first field value is None, Not detected or Not applicable as zero', () => {
    const result = concerns(
      [
        '## Known Bugs',
        '',
        '**No open defects in the ledger:**',
        '- Symptoms: None recorded.',
        '- Files: n/a',
        '',
        '**Startup depends on the mode:**',
        '- Symptoms: the server starts in dev mode',
        '- Files: `src/server/index.ts`',
        '',
        '**Another empty one:**',
        '- Issue: Not detected',
        '',
        '**And one more:**',
        '- Risk: Not applicable here',
      ].join('\n'),
    )!;
    expect(result.sections[0].count).toBe(1);
  });

  it('counts a section whose only text is None, None identified, Not detected or Not applicable as zero', () => {
    for (const text of ['None', 'None identified.', 'Not detected.', 'Not applicable', 'No concerns were found.']) {
      const result = concerns(`## Tech Debt\n\n${text}\n`)!;
      expect(result.sections[0].count).toBe(0);
    }
    expect(concerns('## Tech Debt\n\n- None\n')!.sections[0].count).toBe(0);
  });

  it('counts a prose-only section as zero whatever the prose says', () => {
    const result = concerns('## Known Bugs\n\nNothing was found; see the debug folder for the last investigation.\n')!;
    expect(result.sections[0].count).toBe(0);
  });

  it('does not treat a bullet that merely begins with the word None as an empty marker', () => {
    expect(concerns('## Fragile Areas\n\n- None of the migrations can be rerun\n- A second one\n')!.sections[0].count).toBe(2);
  });

  it('counts ### subsections first when a section uses them', () => {
    const result = concerns('## Performance Bottlenecks\n\n### One\n\n- Problem: a\n\n### Two\n\n- Problem: b\n\n**Not a unit:**\n')!;
    expect(result.sections[0].count).toBe(2);
  });

  it('counts top-level bullets that do not begin with a field label when there are no labels or subsections', () => {
    const result = concerns(
      '## Fragile Areas\n\n- The builder assumes sorted rows\n- Files: `a.ts`\n- What\'s not tested in CI: x\n  - nested\n- Another unlabelled one\n',
    )!;
    expect(result.sections[0].count).toBe(2);
  });

  it('counts table rows, not the header or the separator', () => {
    const result = concerns('## Scaling Limits\n\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n| 5 | 6 |\n')!;
    expect(result.sections[0].count).toBe(3);
  });

  it('counts an extra section by the same rule, after the known ones, and includes it in the total', () => {
    const result = concerns(
      [
        '## Destructive Operations',
        '',
        '**Reset:**',
        '- Risk: wipes state',
        '',
        '**Purge:**',
        '- Risk: wipes logs',
        '',
        '## Tech Debt',
        '',
        '**One:**',
        '- Issue: a',
      ].join('\n'),
    )!;
    expect(result.sections.map((s) => [s.key, s.heading, s.count])).toEqual([
      ['tech-debt', 'Tech Debt', 1],
      [null, 'Destructive Operations', 2],
    ]);
    expect(result.total).toBe(3);
  });

  it('lists the known sections a document lacks, shown as zero by the page', () => {
    const result = concerns('## Tech Debt\n\n**One:**\n- Issue: a\n')!;
    expect(result.missing).toHaveLength(8);
    expect(result.missing).toContain('known-bugs');
    expect(result.missing).not.toContain('tech-debt');
  });

  it('lets an unknown extra heading be a plain section with a count and no key', () => {
    const result = lift('concerns', '# C\n\n## Odd Heading\n\n**X:**\n- Issue: y\n');
    expect(result.sections).toEqual([{ heading: 'Odd Heading', level: 2, key: null }]);
    expect(result.concerns?.sections[0]).toEqual({ key: null, heading: 'Odd Heading', count: 1 });
  });

  it('never counts the single-star footer, a rule line or a preamble as a concern', () => {
    const result = concerns(
      'Scope: the whole repository.\n\n## Tech Debt\n\n**One:**\n- Issue: a\n\n---\n\n*Concerns audit: 2026-10-30*\n',
    )!;
    expect(result.sections[0].count).toBe(1);
  });

  it('ignores a bold line, a bullet or a heading inside a fence', () => {
    const result = concerns(
      '## Tech Debt\n\n**Real:**\n- Issue: a\n\n```md\n**Fake:**\n## Fake section\n- not a concern\n```\n',
    )!;
    expect(result.sections).toEqual([{ key: 'tech-debt', heading: 'Tech Debt', count: 1 }]);
  });

  it('claims a repeated known heading once: the second is a plain section counted as an extra', () => {
    const result = concerns('## Tech Debt\n\n**A:**\n- Issue: a\n\n## Tech Debt\n\n**B:**\n- Issue: b\n')!;
    expect(result.sections.map((s) => [s.key, s.count])).toEqual([
      ['tech-debt', 1],
      [null, 1],
    ]);
  });

  it('keeps the body out of the projection', () => {
    const json = JSON.stringify(lift('concerns').concerns);
    expect(json).not.toContain('tide job deletes');
  });

  it('gives a document with no sections zero and eight-plus missing keys', () => {
    const result = lift('concerns', '# Codebase Concerns\n\nNothing yet.\n');
    expect(result.keyNumber).toBe(0);
    expect(result.concerns?.missing).toHaveLength(9);
  });
});
