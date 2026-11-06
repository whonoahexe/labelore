// Phase 10 (10-05, VIEW-13, TGT-09): the Stack chips and the Concerns counts. Tidemark (the made-up map-only
// fixture) pins both per section, counted by hand in test/fixtures/tidemark/README.md under the adjusted
// rule 10-03-SUMMARY.md records. The other cases plant one shape each.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import {
  CONCERN_ITEM_CAP,
  CONCERN_LINES_CAP,
  CONCERN_LINE_CHARS,
  FIGURE_LINES_CAP,
  FIGURE_TEXT_CAP,
  extractCodebase,
  matchKey,
  normaliseHeading,
} from '../src/planning-repo/handlers/codebase-lift.ts';
import { VALUE_NOT_SHOWN_MARK } from '../src/planning-repo/handlers/withhold-values.ts';
import { WRITTEN_FORMS, formTag } from './helpers/written-value-forms.ts';

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
    expect(result.stack).toEqual({ languages: [], runtime: [], frameworks: [], keyDependencies: [], notPresent: [] });
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

describe('the Key Dependencies lift (10-14)', () => {
  it('reads Tidemark Key Dependencies as Critical and Infrastructure sets of name, version and purpose', () => {
    const lifted = lift('stack').stack!;
    expect(lifted.keyDependencies).toEqual([
      {
        label: 'Critical',
        deps: [
          { name: 'better-sqlite3', version: '11', purpose: 'the berth and booking store, opened once per process' },
          { name: 'zod', version: '3.24', purpose: 'every request body and every tide feed row is parsed with it' },
        ],
      },
      {
        label: 'Infrastructure',
        deps: [
          { name: 'pino', version: '9', purpose: 'structured logs from the server' },
          { name: 'node-cron', version: '3', purpose: 'the tide window refresh' },
        ],
      },
    ]);
    expect(lifted.notPresent).toEqual([]);
  });

  it('splits one bullet that lists several packages at its top-level commas, a comma in parentheses or backticks staying', () => {
    const deps = stack(
      [
        '## Key Dependencies',
        '',
        '**Critical (pipeline):**',
        '- unified 11.0.5 - core',
        '- remark-parse 11.0.0, remark-gfm 4.0.1, remark-rehype 11.1.2',
        '- rehype-raw 7.0.0, rehype-sanitize 6.0.0 (runs right after raw, `.use(a, b)`), rehype-slug 6.0.0',
      ].join('\n'),
    )!.keyDependencies;
    expect(deps).toHaveLength(1);
    expect(deps[0].label).toBe('Critical (pipeline)');
    expect(deps[0].deps.map((d) => [d.name, d.version])).toEqual([
      ['unified', '11.0.5'],
      ['remark-parse', '11.0.0'],
      ['remark-gfm', '4.0.1'],
      ['remark-rehype', '11.1.2'],
      ['rehype-raw', '7.0.0'],
      ['rehype-sanitize', '6.0.0'],
      ['rehype-slug', '6.0.0'],
    ]);
  });

  it('reads a comparator in a version and a package with no version as a name alone', () => {
    const deps = stack('## Key Dependencies\n\n**Critical:**\n- `node-thing` >=22.18.0 - x\n- left-pad (a tiny helper) - y\n')!
      .keyDependencies[0].deps;
    expect(deps.map((d) => [d.name, d.version])).toEqual([
      ['node-thing', '>=22.18.0'],
      ['left-pad', null],
    ]);
  });

  it('lists the names a Not present line gives, splitting at commas and "or"', () => {
    const lifted = stack(
      '## Key Dependencies\n\n**Critical:**\n- zod 3 - x\n\n**Not present:** No database driver, ORM, auth library, queue, or cloud SDK is installed.\n',
    )!;
    expect(lifted.notPresent).toEqual(['database driver', 'ORM', 'auth library', 'queue', 'cloud SDK']);
    expect(lifted.keyDependencies[0].deps.map((d) => d.name)).toEqual(['zod']);
  });

  it('puts bullets that follow no label in a set called Dependencies, and ignores bullets in a fence', () => {
    const sets = stack('## Key Dependencies\n\n- zod 3 - x\n```\n- fenced 1 - ignored\n```\n')!.keyDependencies;
    expect(sets).toEqual([{ label: 'Dependencies', deps: [{ name: 'zod', version: '3', purpose: 'x' }] }]);
  });

  it('lists 30 dependencies in full and caps at 80 with every purpose at 400 characters', () => {
    const thirty = Array.from({ length: 30 }, (_, i) => `- pkg${i} ${i}.0 - note`).join('\n');
    expect(stack(`## Key Dependencies\n\n**Critical:**\n${thirty}\n`)!.keyDependencies[0].deps).toHaveLength(30);
    const many = Array.from({ length: 200 }, (_, i) => `- pkg${i} ${i}.0 - note`).join('\n');
    const capped = stack(`## Key Dependencies\n\n**Critical:**\n${many}\n`)!.keyDependencies;
    expect(capped.reduce((sum, set) => sum + set.deps.length, 0)).toBe(80);
    const long = stack(`## Key Dependencies\n\n**Critical:**\n- pkg 1.0 - ${'p'.repeat(900)}\n`)!.keyDependencies[0].deps[0];
    expect(long.purpose).toHaveLength(400);
  });
});

const integrations = (body: string) => lift('integrations', `# External Integrations\n\n${body}`).integrations!;

describe('the Integrations lift (10-14)', () => {
  const lifted = lift('integrations').integrations!;

  it('lists Tidemark groups by bold label, the section each sits in, and whether the group is in use', () => {
    expect(lifted.groups.map((g) => [g.section, g.label, g.inUse])).toEqual([
      ['external-services', 'Tide data', true],
      ['external-services', 'Messaging', true],
      ['data-storage', 'Databases', true],
      ['data-storage', 'File Storage', true],
      ['data-storage', 'Caching', false],
      ['webhooks', 'Incoming', false],
      ['webhooks', 'Outgoing', true],
    ]);
    expect(lifted.services).toBe(5);
    expect(lift('integrations').keyNumber).toBe(5);
    expect(lifted.missing).toEqual(['authentication', 'monitoring', 'ci-cd']);
  });

  it('reads a row as the service, its use, its client and its credential variable (a name only)', () => {
    expect(lifted.groups[0].rows).toEqual([
      {
        service: 'Coastal tide feed',
        use: 'hourly water heights for the harbour mouth',
        sdk: 'none, plain `fetch` in `server/tides/feed.ts`',
        authVariable: 'TIDEMARK_TIDE_FEED_KEY',
      },
    ]);
    expect(lifted.groups[1].rows[0]).toMatchObject({ sdk: '`nodemailer` 6', authVariable: 'TIDEMARK_MAIL_TOKEN' });
    expect(lifted.groups[2].rows[0]).toMatchObject({ service: 'SQLite file `data/tidemark.db`', sdk: '`TIDEMARK_DB_PATH`' });
  });

  it('lists TIDEMARK_TIDE_FEED_KEY with hadValue true and the other two names with false, all required', () => {
    expect(lifted.variables).toEqual([
      { name: 'TIDEMARK_TIDE_FEED_KEY', hadValue: true, kind: 'required' },
      { name: 'TIDEMARK_MAIL_TOKEN', hadValue: false, kind: 'required' },
      { name: 'TIDEMARK_DB_PATH', hadValue: false, kind: 'required' },
    ]);
  });

  it('never holds the planted value anywhere in the structured record', () => {
    expect(JSON.stringify(lift('integrations'))).not.toContain('PLACEHOLDER-NOT-A-REAL-KEY');
  });

  it('draws the Environment Configuration section whole when it holds only names and lines', () => {
    expect(lifted.environment).toEqual({
      heading: 'Environment Configuration',
      groups: [
        { label: 'Required env vars', names: ['TIDEMARK_TIDE_FEED_KEY', 'TIDEMARK_MAIL_TOKEN', 'TIDEMARK_DB_PATH'], lines: [] },
        { label: 'Secrets location', names: [], lines: ['A `.env` file on the harbour office machine, outside the repository'] },
      ],
      whole: true,
    });
  });

  it('leaves the section plain (whole false) when it holds a fence or a table', () => {
    const fenced = integrations('## Environment Configuration\n\n**Required env vars:**\n- `A_KEY=abc123`\n\n```\nA_KEY=abc123\n```\n');
    expect(fenced.environment?.whole).toBe(false);
    expect(JSON.stringify(fenced)).not.toContain('abc123');
    const table = integrations('## Environment Configuration\n\n| Name | Note |\n|---|---|\n| `A_KEY` | x |\n');
    expect(table.environment?.whole).toBe(false);
  });

  it('removes a value in every place a name can sit: a backticked NAME=value, NAME: value, a bare word, a sub-bullet', () => {
    const body = [
      '## Environment Configuration',
      '',
      '**Required env vars:**',
      '- `ONE_KEY=secret-one`',
      '- TWO_KEY: secret-two',
      '- `THREE_KEY`=secret-three',
      '- FOUR_KEY=secret-four - used for x',
      '  - note: set FIVE_KEY=secret-five before starting',
      '',
      '## APIs & External Services',
      '',
      '**Mail:**',
      '- Relay - sends mail using `SIX_KEY=secret-six`',
      '  - Auth: `SEVEN_KEY=secret-seven`',
    ].join('\n');
    const found = integrations(body);
    const text = JSON.stringify(found);
    for (const value of ['secret-one', 'secret-two', 'secret-three', 'secret-four', 'secret-five', 'secret-six', 'secret-seven']) {
      expect(text).not.toContain(value);
    }
    expect(found.variables.filter((v) => v.hadValue).map((v) => v.name).sort()).toEqual(
      ['FOUR_KEY', 'ONE_KEY', 'SEVEN_KEY', 'SIX_KEY', 'THREE_KEY', 'TWO_KEY'].sort(),
    );
    expect(found.groups[0].rows[0].authVariable).toBe('SEVEN_KEY');
  });

  // 10-REVIEW CR-02: cleanText ran only the leading-form scanner, so a value written any other way was stored and drawn.
  it('stores no value written in any form a person may use, in a group row, a sub-bullet, an Environment bullet or line', () => {
    const rows = WRITTEN_FORMS.map((form, index) => `- Svc ${index} - uses ${form.line(formTag(index))}`);
    const subs = WRITTEN_FORMS.map((form, index) => `- Svc ${index + 100} - use\n  - Note: ${form.line(formTag(index))}`);
    const envBullets = WRITTEN_FORMS.map((form, index) => `- ${form.line(formTag(index))}`);
    const envLines = WRITTEN_FORMS.map((form, index) => form.line(formTag(index)));
    const body = [
      '## APIs & External Services',
      '',
      '**Payments:**',
      ...rows,
      '',
      '**Billing:**',
      ...subs,
      '',
      '## Environment Configuration',
      '',
      '**Required env vars:**',
      ...envBullets,
      '',
      '**Notes:**',
      ...envLines,
    ].join('\n');
    const found = integrations(body);
    const text = JSON.stringify(found);
    expect(found.groups.length).toBeGreaterThan(0);
    expect(found.environment?.groups.length).toBeGreaterThan(0);
    for (const [index, form] of WRITTEN_FORMS.entries()) {
      for (const secret of form.secrets(formTag(index))) expect(text, `${form.label}: ${secret}`).not.toContain(secret);
    }
  });

  it('keeps a row about a variable readable once its value is withheld', () => {
    const found = integrations('## APIs & External Services\n\n**Payments:**\n- Stripe - charges\n  - Auth: STRIPE_KEY = sk_live_abc\n');
    expect(found.groups[0].lines).toEqual(['Stripe - charges', `Auth: STRIPE_KEY = ${VALUE_NOT_SHOWN_MARK}`]);
  });

  it('keeps a placeholder as not a value', () => {
    expect(integrations('## Environment Configuration\n\n**Optional env vars:**\n- `PORT=[your port]`\n').variables).toEqual([
      { name: 'PORT', hadValue: false, kind: 'optional' },
    ]);
  });

  it('counts a group whose first line says None, Not detected, Not hosted or No as not in use, and "None of" as in use', () => {
    const found = integrations(
      [
        '## Monitoring & Observability',
        '',
        '**Error Tracking:**',
        '- None. No Sentry client is installed.',
        '**Logs:**',
        '- Not detected.',
        '**Analytics:**',
        '- No analytics',
        '**Alerts:**',
        '- None of the alerts are paged - a pager rota exists',
      ].join('\n'),
    );
    expect(found.groups.map((g) => [g.label, g.inUse])).toEqual([
      ['Error Tracking', false],
      ['Logs', false],
      ['Analytics', false],
      ['Alerts', true],
    ]);
  });

  it('makes a group of bullets that follow no label, named by the section heading', () => {
    const found = integrations('## File Watching\n\n- Not implemented in v1.\n');
    expect(found.groups).toHaveLength(1);
    expect(found.groups[0]).toMatchObject({ section: null, label: 'File Watching', inUse: false });
  });

  it('leaves out a line that names a path under a home folder', () => {
    const found = integrations(
      [
        '## CI/CD & Deployment',
        '',
        '**MCP:**',
        '- registers a stdio server (`/home/someone/.npm-global/bin/tool`)',
        '',
        '**Pipeline:**',
        '- Hosted runner - runs the gate',
        '  - Client: `act` at `/Users/someone/bin/act`',
      ].join('\n'),
    );
    expect(found.groups.map((g) => g.label)).toEqual(['Pipeline']);
    expect(JSON.stringify(found)).not.toContain('someone');
  });

  it('names a variable mentioned in another group, when it has an underscore', () => {
    const found = integrations('## CI/CD & Deployment\n\n**Hooks:**\n- Reads `PAUSE_AT` and `CI` - hooks\n');
    expect(found.variables).toEqual([{ name: 'PAUSE_AT', hadValue: false, kind: 'named' }]);
  });

  it('caps groups, rows, lines and variables and lifts nothing for another document', () => {
    const many = Array.from({ length: 100 }, (_, i) => `**G${i}:**\n- svc ${i} - use`).join('\n');
    expect(integrations(`## APIs & External Services\n\n${many}\n`).groups).toHaveLength(60);
    const rows = Array.from({ length: 100 }, (_, i) => `- svc ${i} - use`).join('\n');
    const group = integrations(`## APIs & External Services\n\n**G:**\n${rows}\n`).groups[0];
    expect(group.rows).toHaveLength(30);
    expect(group.lines).toHaveLength(12);
    const names = Array.from({ length: 100 }, (_, i) => `- \`VAR_${i}\``).join('\n');
    expect(integrations(`## Environment Configuration\n\n**Required:**\n${names}\n`).variables).toHaveLength(60);
    expect(lift('stack').integrations).toBeUndefined();
  });
});

const conventions = (body: string) => lift('conventions', `# Coding Conventions\n\n${body}`).conventions!;
const testing = (body: string) => lift('testing', `# Testing Patterns\n\n${body}`).testing!;

describe('the Conventions lift (10-14)', () => {
  it('gives Tidemark eight rule groups in the template order, and the older-form stamp from its Analysis Date line', () => {
    const result = lift('conventions');
    expect(result.keyNumber).toBe(8);
    expect(result.conventions!.groups.map((g) => [g.key, g.count])).toEqual([
      ['naming-patterns', 5],
      ['code-style', 4],
      ['import-organization', 1],
      ['error-handling', 2],
      ['logging', 3],
      ['comments', 2],
      ['function-design', 3],
      ['module-design', 2],
    ]);
    expect(result.stamp).toEqual({ mappedAt: '2026-10-27', commit: null, source: 'analysis-date' });
  });

  it('reads a bullet as a rule, a bold label with its value as "Label: value", and leaves ordered steps and the footer out', () => {
    const groups = lift('conventions').conventions!.groups;
    expect(groups[0].rules[0]).toBe('Server modules are lower-case, one noun per file (`clash.ts`, `window.ts`)');
    expect(groups[4].rules[0]).toBe('Framework: pino');
    expect(groups[2].rules).toEqual(['None']);
    expect(JSON.stringify(groups)).not.toContain('Node built-ins');
    expect(JSON.stringify(groups)).not.toContain('Last updated');
  });

  it('appends a nested bullet to the rule above it, and takes a plain line under a label as a rule', () => {
    const found = conventions('## Naming Patterns\n\n**Files:**\n- kebab-case\n  - never `camelCase` files\nplain line under the label\n');
    expect(found.groups[0].rules).toEqual(['kebab-case never `camelCase` files', 'plain line under the label']);
  });

  it('ignores a bullet inside a fence and a table row, and keeps a section with no rule as a group of zero', () => {
    const found = conventions('## Naming Patterns\n\n```\n- fenced\n```\n| a | b |\n|---|---|\n\n## Logging\n\n- one\n');
    expect(found.groups.map((g) => [g.heading, g.count])).toEqual([['Naming Patterns', 0], ['Logging', 1]]);
  });

  it('caps the groups at 20, the rules at 30 and each rule at 400 characters, keeping the true count', () => {
    const groups = Array.from({ length: 30 }, (_, i) => `## S${i}\n\n- r`).join('\n\n');
    expect(conventions(groups).groups).toHaveLength(20);
    const many = Array.from({ length: 50 }, (_, i) => `- rule ${i}`).join('\n');
    const group = conventions(`## Naming Patterns\n\n${many}\n`).groups[0];
    expect(group.rules).toHaveLength(30);
    expect(group.count).toBe(50);
    expect(conventions(`## Naming Patterns\n\n- ${'x'.repeat(900)}\n`).groups[0].rules[0]).toHaveLength(400);
    expect(lift('stack').conventions).toBeUndefined();
  });
});

describe('the Testing lift (10-14)', () => {
  const lifted = lift('testing').testing!;

  it('gives Tidemark the framework, the runner plate with its config, the assertion plate and the coverage requirement', () => {
    expect(lift('testing').keyLabel).toBe('Vitest');
    expect(lift('testing').keyNumber).toBeNull();
    expect(lifted.framework).toBe('Vitest');
    expect(lifted.runner).toBe('Vitest');
    expect(lifted.plates).toEqual([
      { label: 'Runner', name: 'Vitest', version: '3.2', config: 'vitest.config.ts' },
      { label: 'Assertion Library', name: 'Vitest built-ins', version: null, config: null },
    ]);
    expect(lifted.coverage).toBe('None enforced');
  });

  it('gives Tidemark three run commands, the comment lines above them as captions and not as commands', () => {
    expect(lifted.commands).toEqual([
      { command: 'npm test', caption: 'Run every unit and route test once' },
      { command: 'npm run test:watch', caption: 'Watch mode while editing' },
      { command: 'npm run test:coverage', caption: 'Coverage report' },
    ]);
  });

  it('takes a comment beside a command as its caption, keeps a # inside quotes, and shows a repeated command once', () => {
    const found = testing(
      [
        '## Test Framework',
        '',
        '**Run Commands:**',
        '```bash',
        'npm test            # vitest run',
        'npx playwright test -g "a # b"   # one spec',
        'npm test',
        '$ npm run lint',
        '```',
        '',
        '## Coverage',
        '',
        '**View Coverage:**',
        '```bash',
        'npm run test:coverage',
        '```',
      ].join('\n'),
    );
    expect(found.commands).toEqual([
      { command: 'npm test', caption: 'vitest run' },
      { command: 'npx playwright test -g "a # b"', caption: 'one spec' },
      { command: 'npm run lint', caption: null },
      { command: 'npm run test:coverage', caption: null },
    ]);
  });

  it('removes a control character from a run command, so the command copied is the command shown', () => {
    const found = testing('## Test Framework\n\n**Run Commands:**\n```bash\nnpm\u0007 test‮ --all\n```\n');
    expect(found.commands).toEqual([{ command: 'npm test --all', caption: null }]);
  });

  it('reads commands only from a fence under a Run Commands label or in Coverage, not from a code sample', () => {
    const found = testing('## Test Structure\n\n```bash\nrm -rf /\n```\n\n## Test Framework\n\n**Run Commands:**\n```ts\nconst x = 1;\n```\n');
    expect(found.commands).toEqual([]);
  });

  it('caps the commands at 30 and each at 400 characters', () => {
    const many = Array.from({ length: 60 }, (_, i) => `cmd-${i}`).join('\n');
    expect(testing(`## Test Framework\n\n**Run Commands:**\n\`\`\`bash\n${many}\n\`\`\`\n`).commands).toHaveLength(30);
    expect(testing(`## Test Framework\n\n**Run Commands:**\n\`\`\`bash\n${'c'.repeat(900)}\n\`\`\`\n`).commands[0].command).toHaveLength(400);
  });

  it('lifts the test folder tree and the Test Types with the folders their parenthesis names', () => {
    expect(lifted.tree?.text).toContain('clash.test.ts');
    expect(lifted.types.map((t) => t.name)).toEqual(['Unit', 'Integration', 'E2E']);
    const found = testing(
      [
        '## Test Types',
        '',
        '**Unit tests (`test/rendering/`, `test/*.test.ts`):**',
        '- pure',
        '**HTTP / server tests (`test/server/`):**',
        '- app.request',
        '**Golden tests:**',
        '- snapshot',
      ].join('\n'),
    );
    expect(found.types).toEqual([
      { name: 'Unit', paths: ['test/rendering/', 'test/*.test.ts'] },
      { name: 'HTTP / server', paths: ['test/server/'] },
      { name: 'Golden', paths: [] },
    ]);
  });

  it('gives a document with no recognised section an empty lift and no key label', () => {
    const result = lift('testing', '# T\n\n## Something\n\n- x\n');
    expect(result.testing).toEqual({ framework: null, runner: null, plates: [], coverage: null, commands: [], tree: null, types: [] });
    expect(result.keyLabel).toBeUndefined();
    expect(lift('stack').testing).toBeUndefined();
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
    expect(result.sections).toEqual([
      {
        key: 'dependencies-at-risk',
        heading: 'Dependencies at Risk',
        count: 1,
        items: [{ label: 'Old parser', lines: ['- Issue: unmaintained', '- Impact: low'] }],
      },
    ]);
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
    expect(result.concerns?.sections[0]).toEqual({
      key: null,
      heading: 'Odd Heading',
      count: 1,
      items: [{ label: 'X', lines: ['- Issue: y'] }],
    });
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
    expect(result.sections).toEqual([
      { key: 'tech-debt', heading: 'Tech Debt', count: 1, items: [{ label: 'Real', lines: ['- Issue: a'] }] },
    ]);
  });

  it('claims a repeated known heading once: the second is a plain section counted as an extra', () => {
    const result = concerns('## Tech Debt\n\n**A:**\n- Issue: a\n\n## Tech Debt\n\n**B:**\n- Issue: b\n')!;
    expect(result.sections.map((s) => [s.key, s.count])).toEqual([
      ['tech-debt', 1],
      [null, 1],
    ]);
  });

  it('keeps each concern its own lines and nothing else of the body', () => {
    const json = JSON.stringify(lift('concerns').concerns);
    expect(json).toContain('tide job deletes');
    expect(json).not.toContain('Concerns audit');
  });

  it('gives a document with no sections zero and eight-plus missing keys', () => {
    const result = lift('concerns', '# Codebase Concerns\n\nNothing yet.\n');
    expect(result.keyNumber).toBe(0);
    expect(result.concerns?.missing).toHaveLength(9);
  });
});

describe('the Architecture lift (10-12)', () => {
  const arch = (body: string) => lift('architecture', `# Architecture\n\n${body}`);
  const lifted = lift('architecture').architecture!;

  it('lifts the Tidemark System Overview fence whole, a line starting with two hashes staying inside it', () => {
    expect(lifted.diagram?.info).toBe('text');
    expect(lifted.diagram?.text).toContain('Berth board (browser)');
    expect(lifted.diagram?.text.split('\n').pop()).toBe('## the three route groups above share one process');
    expect(lifted.diagram?.text).not.toContain('```');
    expect(lift('architecture').sections.map((s) => s.heading)).not.toContain('the three route groups above share one process');
  });

  it('counts the five Tidemark components, gives them as the key number and leaves API Architecture plain', () => {
    expect(lifted.components).toBe(5);
    const body = lift('architecture');
    expect(body.keyNumber).toBe(5);
    expect(body.keyUnit).toBeUndefined();
    expect(body.sections.find((s) => s.heading === 'API Architecture')?.key).toBeNull();
  });

  it('lifts the two Tidemark anti-patterns with their three parts', () => {
    expect(lifted.antiPatterns.map((a) => a.name)).toEqual(['Reading the database from a route', 'Hard-coded depth in the board']);
    expect(lifted.antiPatterns[0]).toEqual({
      name: 'Reading the database from a route',
      whatHappens: 'The office confirm route opens the database file directly to check a clash.',
      whyWrong: 'Two modules now know the table layout, and the clash rule exists twice.',
      doInstead: 'Ask the slot store for the clash check (`server/store/clash.ts`).',
      more: [],
    });
  });

  it('gives the Layers count as the key number, in layers, when there is no component table', () => {
    const body = arch('## Layers\n\n### One\n\nx\n\n### Two\n\ny\n');
    expect(body.keyNumber).toBe(2);
    expect(body.keyUnit).toBe('layer');
    const labelled = arch('## Layers\n\n**Port:**\n- a\n\n**Core:**\n- b\n\n**Edge:**\n- c\n');
    expect(labelled.keyNumber).toBe(3);
    expect(labelled.keyUnit).toBe('layer');
    expect(arch('## Layers\n\nJust prose.\n').keyNumber).toBeNull();
  });

  it('lifts the diagram only when the System Overview holds that one fence and nothing else', () => {
    const fence = '```text\n┌──┐\n│ a│\n└──┘\n```';
    expect(arch(`## System Overview\n\n${fence}\n`).architecture?.diagram?.text).toContain('│ a│');
    expect(arch(`## System Overview\n\nSome prose first.\n\n${fence}\n`).architecture?.diagram).toBeNull();
    expect(arch(`## System Overview\n\n${fence}\n\nAnd a note after.\n`).architecture?.diagram).toBeNull();
    expect(arch(`## System Overview\n\n${fence}\n\n${fence}\n`).architecture?.diagram).toBeNull();
    expect(arch('## System Overview\n\n```mermaid\ngraph TD; A-->B\n```\n').architecture?.diagram).toBeNull();
    expect(arch('## System Overview\n\n```ts\nconst a = 1;\n```\n').architecture?.diagram).toBeNull();
  });

  it('leaves a figure over the caps to the plain section, whole', () => {
    expect(arch(`## System Overview\n\n\`\`\`text\n${'x'.repeat(FIGURE_TEXT_CAP + 10)}\n\`\`\`\n`).architecture?.diagram).toBeNull();
    const tall = Array.from({ length: FIGURE_LINES_CAP + 5 }, (_, i) => `line ${i}`).join('\n');
    expect(arch(`## System Overview\n\n\`\`\`text\n${tall}\n\`\`\`\n`).architecture?.diagram).toBeNull();
  });

  it('lifts anti-patterns all or nothing', () => {
    const entry = (name: string, instead = true) =>
      `### ${name}\n\n**What happens:** a\n**Why it's wrong:** b\n${instead ? '**Do this instead:** c\n' : ''}\n`;
    expect(arch(`## Anti-Patterns\n\n${entry('One')}${entry('Two')}`).architecture?.antiPatterns).toHaveLength(2);
    expect(arch(`## Anti-Patterns\n\n${entry('One')}${entry('Two', false)}`).architecture?.antiPatterns).toEqual([]);
    expect(arch(`## Anti-Patterns\n\nWe avoid these.\n\n${entry('One')}`).architecture?.antiPatterns).toEqual([]);
    expect(arch('## Anti-Patterns\n\nNone yet.\n').architecture?.antiPatterns).toEqual([]);
    expect(
      arch('## Anti-Patterns\n\n### One\n\n**What happens:** a\n```\ncode\n```\n**Do this instead:** c\n').architecture?.antiPatterns,
    ).toEqual([]);
  });

  it('keeps a part it has no slot for and the text of a continuation line', () => {
    const body = arch(
      '## Anti-Patterns\n\n### One\n\nA lead line.\n**Cost**: high\n**What happens:** first\ncontinues here\n**Do this instead:** c\n',
    );
    expect(body.architecture?.antiPatterns[0]).toEqual({
      name: 'One',
      whatHappens: 'first continues here',
      whyWrong: null,
      doInstead: 'c',
      more: [
        { label: 'Note', text: 'A lead line.' },
        { label: 'Cost', text: 'high' },
      ],
    });
  });
});

describe('the Structure lift (10-12)', () => {
  const structure = (body: string) => lift('structure', `# Codebase Structure\n\n${body}`);
  const lifted = lift('structure').structure!;

  it('lifts the Tidemark Directory Layout fence and counts its directories as the key number', () => {
    expect(lifted.tree?.text.split('\n')[0]).toBe('tidemark/');
    expect(lifted.tree?.text).toContain('BerthCard/');
    expect(lifted.tree?.text).not.toContain('```');
    expect(lifted.directories).toBe(11);
    expect(lift('structure').keyNumber).toBe(11);
  });

  it('keeps Where to Add New Code and the other sections as plain keyed sections, lifting nothing from them', () => {
    const body = lift('structure');
    expect(body.sections.find((s) => s.heading === 'Where to Add New Code')?.key).toBe('where-to-add-new-code');
    expect(Object.keys(body.structure!).sort()).toEqual(['directories', 'tree']);
  });

  it('gives tree null, no key number and every section plain when there is no Directory Layout', () => {
    const body = structure('## Directory Purposes\n\n**src/:**\n- Purpose: code\n');
    expect(body.structure).toEqual({ tree: null, directories: 0 });
    expect(body.keyNumber).toBeNull();
  });

  it('lifts the tree only when the Directory Layout holds that one fence and nothing else', () => {
    const fence = '```\nroot/\n├── a/\n└── b.ts\n```';
    expect(structure(`## Directory Layout\n\n${fence}\n`).structure?.directories).toBe(2);
    expect(structure(`## Directory Layout\n\nHow it is laid out.\n\n${fence}\n`).structure?.tree).toBeNull();
    expect(structure(`## Directory Layout\n\n${fence}\n\n${fence}\n`).structure?.tree).toBeNull();
    expect(structure('## Directory Layout\n\n```ts\nroot/\n```\n').structure?.tree).toBeNull();
  });

  it('leaves a tree over the caps to the plain section, whole', () => {
    const tall = Array.from({ length: FIGURE_LINES_CAP + 5 }, (_, i) => `├── d${i}/`).join('\n');
    expect(structure(`## Directory Layout\n\n\`\`\`\nroot/\n${tall}\n\`\`\`\n`).structure?.tree).toBeNull();
  });
});

describe('the Concerns items (10-12)', () => {
  const lifted = lift('concerns').concerns!;
  const section = (heading: string) => lifted.sections.find((entry) => entry.heading === heading)!;

  it('lists every Tidemark concern in each section, so the items listed are exactly the ones counted', () => {
    for (const entry of lifted.sections) expect(entry.items.length, entry.heading).toBe(entry.count);
    expect(lifted.sections.reduce((sum, entry) => sum + entry.items.length, 0)).toBe(14);
  });

  it('keeps a ### subsection as a label over its own field lines', () => {
    expect(section('Tech Debt').items[0]).toEqual({
      label: 'Window rebuild on every refresh',
      lines: [
        '- Issue: The tide job deletes and rewrites all windows instead of changing the ones that moved',
        '- Files: `server/tides/refresh.ts`, `server/store/index.ts`',
        '- Impact: A request checked during a refresh can see no window at all',
        '- Fix approach: Write the new windows in one transaction and swap them in',
      ],
    });
  });

  it('keeps a plain bullet as its own first line, with no label', () => {
    const items = section('Fragile Areas').items;
    expect(items).toHaveLength(3);
    for (const item of items) expect(item.label).toBeNull();
    expect(items[0].lines[0]).not.toMatch(/^- /);
  });

  it('keeps a table row as its first cell over header: cell lines', () => {
    const items = section('Scaling Limits').items;
    expect(items).toHaveLength(2);
    expect(items[0].label).not.toBe('');
    expect(items[0].lines.every((line) => line.includes(': '))).toBe(true);
  });

  it('lists nothing for a section that counts zero', () => {
    expect(section('Dependencies at Risk').items).toEqual([]);
    expect(section('Test Coverage Gaps').items).toEqual([]);
  });

  it('leaves out a group whose first field says None, as the count does', () => {
    const result = concerns('## Tech Debt\n\n**Real:**\n- Issue: a\n\n**Empty:**\n- Issue: None\n')!;
    expect(result.sections[0].count).toBe(1);
    expect(result.sections[0].items.map((item) => item.label)).toEqual(['Real']);
  });

  it('lists all 40 items of a section with 40 groups', () => {
    const body = `## Tech Debt\n\n${Array.from({ length: 40 }, (_, i) => `**Item ${i}:**\n- Issue: thing ${i}\n- Files: \`a/${i}.ts\`\n`).join('\n')}`;
    const result = concerns(body)!;
    expect(result.sections[0].count).toBe(40);
    expect(result.sections[0].items).toHaveLength(40);
    expect(result.sections[0].items[39]).toEqual({ label: 'Item 39', lines: ['- Issue: thing 39', '- Files: `a/39.ts`'] });
  });

  it('keeps at most 500 items a section and 60 lines of 2,000 characters a concern, the count staying true', () => {
    const many = concerns(`## Fragile Areas\n\n${'- one more fragile thing\n'.repeat(600)}`)!;
    expect(many.sections[0].count).toBe(600);
    expect(many.sections[0].items).toHaveLength(CONCERN_ITEM_CAP);
    const long = concerns(
      `## Tech Debt\n\n**Big:**\n${Array.from({ length: 80 }, (_, i) => `- Note ${i}: ${'x'.repeat(2500)}`).join('\n')}\n`,
    )!;
    expect(long.sections[0].items[0].lines).toHaveLength(CONCERN_LINES_CAP);
    expect(long.sections[0].items[0].lines[0].length).toBe(CONCERN_LINE_CHARS);
  });

  it('gives a continuation line to the concern it follows and ignores a bold line inside a fence for the count', () => {
    const result = concerns('## Tech Debt\n\n**Real:**\n- Issue: a\n  and more\n\n```md\n**Fake:**\n```\n')!;
    expect(result.sections[0].count).toBe(1);
    expect(result.sections[0].items[0].lines[0]).toBe('- Issue: a');
    expect(result.sections[0].items[0].lines).toContain('  and more');
  });
});
