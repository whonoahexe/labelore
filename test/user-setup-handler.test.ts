// Phase 10 (10-19, VIEW-11): the USER-SETUP.md handler and extractor. It reads the steps (the Environment Variables
// rows with a Status box and the checklist items), the variables with where each goes and where to get it, and the
// file's own Status line into `structured.userSetup`, on the made-up Lendshed user setups (04 part done with a pasted
// value, 02 all pending) (VIEW-21). A variable's value is never kept (T-10-33).
import { describe, expect, it, vi } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { UserSetupHandler, extractUserSetup } from '../src/planning-repo/handlers/user-setup.ts';
import type { UserSetupBody } from '../src/planning-repo/handlers/user-setup.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { VALUE_NOT_SHOWN_MARK } from '../src/planning-repo/handlers/withhold-values.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { fxRead } from './helpers/fixture-project.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';
import { WRITTEN_FORMS, formTag, userSetupFormDoc } from './helpers/written-value-forms.ts';

const PATH = '.planning/phases/04-bulk-loan-export/04-USER-SETUP.md';

function ref(path: string = PATH): ArtifactRef {
  return {
    path,
    kind: 'user-setup',
    fileClass: 'text',
    sizeBytes: 0,
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
}

function raw(content: string, path: string = PATH): RawArtifact {
  return { path, content, mtimeMs: 0, size: content.length };
}

const PART = fxRead('phases/04-bulk-loan-export/04-USER-SETUP.md');
const PENDING = fxRead('phases/02-roles-and-permissions/02-USER-SETUP.md');

describe('UserSetupHandler', () => {
  it('claims a USER-SETUP ref ahead of the generic handler, and no other artifact', () => {
    expect(UserSetupHandler.match(ref())).toBe(true);
    expect(UserSetupHandler.match(ref('.planning/phases/04-bulk-loan-export/04-AI-SPEC.md'))).toBe(false);
    expect(UserSetupHandler.match(ref('.planning/phases/04-bulk-loan-export/04-CONTEXT.md'))).toBe(false);
    expect(HANDLERS.find((h) => h.match(ref()))).toBe(UserSetupHandler);
    expect(HANDLERS.indexOf(UserSetupHandler)).toBeLessThan(HANDLERS.indexOf(GenericMarkdownHandler));
    expect(HANDLERS[HANDLERS.length - 1]).toBe(GenericMarkdownHandler);
  });

  it('carries the title, the body as written and the reading in structured.userSetup', () => {
    const result = UserSetupHandler.parse(raw(PART), ref());
    expect(result.title).toBe('Phase 4: User Setup Required');
    expect(result.body).toContain('## Environment Variables');
    expect((result.structured?.userSetup as UserSetupBody).total).toBe(6);
  });
});

describe('extractUserSetup on 04-USER-SETUP (part done, a pasted value)', () => {
  const body = extractUserSetup(PART);

  it('reads three variables, the key with its value withheld', () => {
    expect(body.variables.map((v) => v.name)).toEqual([
      'LOANNOTE_MODEL_HOST',
      'LOANNOTE_MODEL_NAME',
      'LOANNOTE_MODEL_KEY',
    ]);
    expect(body.variables.map((v) => v.hadValue)).toEqual([false, false, true]);
    expect(body.variables[0]).toMatchObject({
      source: 'Association model host → Settings → Endpoint address',
      destination: '.env.local',
      done: true,
    });
    expect(body.variables[2].done).toBe(false);
  });

  it('reads six steps, three of them done: three variables, one account step and two dashboard steps', () => {
    expect(body.steps.map((s) => s.kind)).toEqual([
      'variable',
      'variable',
      'variable',
      'account',
      'dashboard',
      'dashboard',
    ]);
    expect(body.steps.map((s) => s.done)).toEqual([true, true, false, true, false, false]);
    expect(body.total).toBe(6);
    expect(body.doneCount).toBe(3);
  });

  it("keeps an item's indented fields as written and its Notes apart", () => {
    const step = body.steps[5];
    expect(step.title).toBe('Cap the monthly spend');
    expect(step.group).toBe('Dashboard Configuration');
    expect(step.fields.map((f) => f.key)).toEqual(['URL', 'Location', 'Set to', 'Notes']);
    expect(step.fields[1].text).toBe('Association model host → Settings → Limits → Monthly cap');
    expect(step.notes).toEqual([
      'One note per export is about 300 tokens, so the cap is far above need; it is a safety stop only',
    ]);
  });

  it("reads the file's own Status line and head fields apart from the boxes", () => {
    expect(body.status).toBe('Complete');
    expect(body.generated).toBe('2026-04-12');
    expect(body.phase).toBe('04-bulk-loan-export');
    expect(body.hasIntro).toBe(true);
  });

  it('lists every section with its lines', () => {
    expect(body.sections.map((s) => s.heading)).toEqual([
      'Environment Variables',
      'Account Setup',
      'Dashboard Configuration',
      'Local Development',
      'Verification',
    ]);
  });
});

describe('extractUserSetup on 02-USER-SETUP (all pending)', () => {
  const body = extractUserSetup(PENDING);

  it('reads three steps, none done, and a Status line that agrees with the boxes', () => {
    expect(body.total).toBe(3);
    expect(body.doneCount).toBe(0);
    expect(body.steps.map((s) => s.kind)).toEqual(['variable', 'variable', 'dashboard']);
    expect(body.status).toBe('Incomplete');
    expect(body.variables.every((v) => !v.hadValue)).toBe(true);
  });
});

describe('extractUserSetup edge cases', () => {
  it('reads variables without a Status column as variables that are not steps', () => {
    const body = extractUserSetup(
      '# Phase 1: Setup\n\n## Environment Variables\n\n| Variable | Source | Add to |\n|----------|--------|--------|\n| `A_KEY` | Host → Keys | `.env.local` |\n',
    );
    expect(body.variables).toHaveLength(1);
    expect(body.variables[0]).toMatchObject({ name: 'A_KEY', done: null, step: false });
    expect(body.steps).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('reads a box that is neither ticked nor open as a step that is not stated', () => {
    const body = extractUserSetup(
      '## Env\n\n| Status | Variable | Source | Add to |\n|---|---|---|---|\n| [?] | `A_KEY` | Host | `.env` |\n',
    );
    expect(body.steps).toHaveLength(1);
    expect(body.steps[0].done).toBeNull();
    expect(body.doneCount).toBe(0);
  });

  it('ignores a table and a checklist inside a fence', () => {
    const body = extractUserSetup('## Notes\n\n```md\n- [ ] **Not a step**\n```\n');
    expect(body.steps).toEqual([]);
  });

  it('returns no steps for an empty body and never throws', () => {
    const body = extractUserSetup('');
    expect(body).toMatchObject({ total: 0, doneCount: 0, steps: [], variables: [], status: null });
  });
});

// ---------------------------------------------------------------------------------------------------------------
// 10-19 Task 2 (T-10-33, T-10-35): one mask over every stored string. A person may paste a real value anywhere in the
// file, so nothing the handler stores for the page - step text, sections, the title or a frontmatter string - may
// hold one.
// ---------------------------------------------------------------------------------------------------------------

const STEP_BODY = [
  '# Phase 9: User Setup Required',
  '',
  '**Status:** Incomplete',
  '',
  '## Dashboard Configuration',
  '',
  '- [ ] **Rotate the key**',
  '  - URL: https://host.example/keys',
  '  - Set to: The new key',
  '  - Notes: export LOANNOTE_MODEL_KEY=PLANTED-STEP-VALUE-0001 then restart',
  '',
  '## Local Development',
  '',
  'LOANNOTE_DEBUG_TOKEN: PLANTED-SECTION-VALUE-0002',
  '',
  'Point `LOANNOTE_MODEL_HOST` at `http://localhost:4318` and use `API_TOKEN: PLANTED-CODE-0005`.',
  '',
  '```bash',
  'LOANNOTE_RUN_KEY=PLANTED-FENCE-VALUE-0007 npm run stub',
  '```',
  '',
].join('\n');

const NO_STEPS_BODY = [
  '# Phase 9: User Setup Required',
  '',
  '## Notes',
  '',
  'Set LOANNOTE_HOST_KEY=PLANTED-FALLBACK-VALUE-0003 in .env.local before you start.',
  '',
].join('\n');

function planted(value: unknown): string[] {
  return (JSON.stringify(value).match(/PLANTED-[A-Z]+-(?:VALUE-)?\d{4}/g) ?? []) as string[];
}

describe('UserSetupHandler masks every stored string', () => {
  it('stores a step whose Notes hold a value masked', () => {
    const body = extractUserSetup(STEP_BODY);
    expect(body.steps).toHaveLength(1);
    expect(body.steps[0].notes).toEqual([`export LOANNOTE_MODEL_KEY=${VALUE_NOT_SHOWN_MARK} then restart`]);
    expect(body.steps[0].fields.find((f) => f.key === 'Notes')?.text).toContain('LOANNOTE_MODEL_KEY');
    expect(planted(body)).toEqual([]);
  });

  it('stores an unclaimed section with the value line masked and the rest as written', () => {
    const body = extractUserSetup(STEP_BODY);
    const section = body.sections.find((s) => s.heading === 'Local Development');
    expect(section?.lines).toContain(`LOANNOTE_DEBUG_TOKEN: ${VALUE_NOT_SHOWN_MARK}`);
    expect(section?.lines.join('\n')).toContain('`http://localhost:4318`');
    expect(section?.lines.join('\n')).toContain(`\`API_TOKEN: ${VALUE_NOT_SHOWN_MARK}\``);
    expect(section?.lines).toContain(`LOANNOTE_RUN_KEY=${VALUE_NOT_SHOWN_MARK} npm run stub`);
    expect(planted(body)).toEqual([]);
  });

  it('gives no steps and no variables for a file with neither, and its sections masked', () => {
    const body = extractUserSetup(NO_STEPS_BODY);
    expect(body.steps).toEqual([]);
    expect(body.variables).toEqual([]);
    expect(body.sections).toHaveLength(1);
    expect(body.sections[0].lines.join('\n')).toContain(`LOANNOTE_HOST_KEY=${VALUE_NOT_SHOWN_MARK} in .env.local`);
    expect(JSON.stringify(body)).not.toContain('PLANTED-FALLBACK-VALUE-0003');
  });

  it('keeps the sections when step parsing throws (the sections sit in their own guard)', async () => {
    vi.resetModules();
    vi.doMock('../src/planning-repo/handlers/withhold-values.ts', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../src/planning-repo/handlers/withhold-values.ts')>()),
      withholdValue: () => {
        throw new Error('boom');
      },
    }));
    const { extractUserSetup: guarded } = await import('../src/planning-repo/handlers/user-setup-body.ts');
    const withTable =
      '## Environment Variables\n\n| Status | Variable | Source | Add to |\n|---|---|---|---|\n| [ ] | `A_KEY=PLANTED-GUARD-VALUE-0009` | Host | `.env` |\n\n## Notes\n\nSet B_KEY=PLANTED-GUARD-VALUE-0010 now.\n';
    const body = guarded(withTable);
    expect(body.steps).toEqual([]);
    expect(body.sections.map((s) => s.heading)).toEqual(['Environment Variables', 'Notes']);
    expect(planted(body)).toEqual([]);
    vi.doUnmock('../src/planning-repo/handlers/withhold-values.ts');
  });

  it('masks the title and every string value of the frontmatter, and keeps the body as written', () => {
    const content =
      '---\ntitle: "Setup for KEY_A=PLANTED-TITLE-0004"\nnote: "use TOKEN_B: PLANTED-FM-VALUE-0008"\ncount: 3\nlist:\n  - "C_KEY=PLANTED-FM-VALUE-0011"\n---\n\n# Phase 9: User Setup for KEY_A=PLANTED-TITLE-0004\n\nBody text.\n';
    const result = UserSetupHandler.parse(raw(content), ref());
    expect(result.title).toBe(`Setup for KEY_A=${VALUE_NOT_SHOWN_MARK}`);
    expect(result.frontmatter.count).toBe(3);
    expect(result.frontmatter.note).toBe(`use TOKEN_B: ${VALUE_NOT_SHOWN_MARK}`);
    expect(result.frontmatter.list).toEqual([`C_KEY=${VALUE_NOT_SHOWN_MARK}`]);
    expect(planted({ title: result.title, frontmatter: result.frontmatter, structured: result.structured })).toEqual([]);
    // Source mode keeps the file as written.
    expect(result.body).toContain('PLANTED-TITLE-0004');
  });

  it('masks an H1 title taken from the body when there is no frontmatter title', () => {
    const result = UserSetupHandler.parse(raw(NO_STEPS_BODY.replace('User Setup Required', 'User Setup for KEY_A=PLANTED-TITLE-0004')), ref());
    expect(result.title).toBe(`Phase 9: User Setup for KEY_A=${VALUE_NOT_SHOWN_MARK}`);
  });

  it('masks the Source and Add to cells and the status word of a table', () => {
    const body = extractUserSetup(
      '**Status:** Complete with KEY_A=PLANTED-STATUS-0012\n\n## Env\n\n| Status | Variable | Source | Add to |\n|---|---|---|---|\n| [ ] | `A_KEY` | Host, then `B_KEY=PLANTED-SOURCE-0013 x` | `C_KEY=PLANTED-DEST-0014 y` |\n',
    );
    expect(body.status).toBe(`Complete with KEY_A=${VALUE_NOT_SHOWN_MARK}`);
    expect(body.variables[0].source).toBe(`Host, then \`B_KEY=${VALUE_NOT_SHOWN_MARK}\``);
    expect(body.variables[0].destination).toBe(`C_KEY=${VALUE_NOT_SHOWN_MARK}`);
    expect(planted(body)).toEqual([]);
  });

  it('keeps the planted 04 value out of everything structured holds, and still says a value was written', () => {
    const body = extractUserSetup(PART);
    expect(JSON.stringify(body)).not.toContain('PLACEHOLDER-NOT-A-REAL-KEY');
    expect(body.variables[2]).toMatchObject({ name: 'LOANNOTE_MODEL_KEY', hadValue: true });
    const table = body.sections.find((s) => s.heading === 'Environment Variables');
    expect(table?.lines.join('\n')).toContain(`LOANNOTE_MODEL_KEY=${VALUE_NOT_SHOWN_MARK}`);
  });

  it('stays linear on 10,000 table rows, a 200,000-character line and 5,000 assignments on one line', { timeout: 120_000 }, () => {
    const rows = measureGrowth({
      make: (n) =>
        `## Env\n\n| Status | Variable | Source | Add to |\n|---|---|---|---|\n${Array.from({ length: n }, (_, i) => `| [ ] | \`K_${i % 50}=v${i}\` | Host → Keys | \`.env\` |`).join('\n')}\n`,
      run: (text) => void extractUserSetup(text),
      startSize: 1250,
      maxSize: 10_000,
    });
    expect(rows.ratio).toBeLessThan(GROWTH_LIMIT);
    const longLine = measureGrowth({
      make: (n) => `## Notes\n\n${'x'.repeat(n)}\n`,
      run: (text) => void extractUserSetup(text),
    });
    expect(longLine.ratio).toBeLessThan(GROWTH_LIMIT);
    const assignments = measureGrowth({
      make: (n) => `## Notes\n\n${Array.from({ length: n }, (_, i) => `K_${i}=v${i}`).join(' ')}\n`,
      run: (text) => void extractUserSetup(text),
      startSize: 625,
      maxSize: 5000,
    });
    expect(assignments.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});

// 10-REVIEW CR-01 and WR-01: a checklist item's `- Key: value` lines were masked one fragment at a time, so a variable
// name used as the key never met its value; and a table's value cell has no `=` or `:` beside the name. Every written
// form (test/helpers/written-value-forms.ts) is planted in each place a person may put it, and none may be stored.
describe('the User setup reader withholds a value written in any form (10-REVIEW CR-01, WR-01)', () => {
  it('keeps the value of a `- NAME: value` field out of the fields and the notes, and keeps the name', () => {
    const body = extractUserSetup(
      '## Stripe\n\n- [ ] **Add the key**\n  - URL: https://host.example/keys\n  - STRIPE_KEY: PLANTED-FIELD-0001\n  - `SECOND_KEY`: PLANTED-FIELD-0002\n  - Value: PLANTED-FIELD-0003\n  - Notes: where it goes\n',
    );
    expect(body.steps[0].fields).toEqual([
      { key: 'URL', text: 'https://host.example/keys' },
      { key: 'STRIPE_KEY', text: VALUE_NOT_SHOWN_MARK },
      { key: '`SECOND_KEY`', text: VALUE_NOT_SHOWN_MARK },
      { key: 'Value', text: VALUE_NOT_SHOWN_MARK },
      { key: 'Notes', text: 'where it goes' },
    ]);
    expect(JSON.stringify(body)).not.toContain('PLANTED-FIELD');
  });

  it('keeps a field whose key is a plain label as written, and a placeholder value as written', () => {
    const body = extractUserSetup('## Stripe\n\n- [ ] **Add**\n  - Location: Settings → Keys\n  - STRIPE_KEY: <your key>\n');
    expect(body.steps[0].fields).toEqual([
      { key: 'Location', text: 'Settings → Keys' },
      { key: 'STRIPE_KEY', text: '<your key>' },
    ]);
  });

  it('withholds a value with a colon in it (connection string, prefixed token) and keeps label lines exact (10-VERIFICATION truth 5)', () => {
    const body = extractUserSetup(
      [
        '## Dashboard Configuration',
        '',
        '- [ ] **Add the database**',
        '  - URL: https://host.example/db',
        '  - DATABASE_URL=postgres://u:PLANTED-FIELD-0011@host/db',
        '  - STRIPE_KEY=sk:PLANTED-FIELD-0012',
        '  - Location: Settings → Database',
        '  - Notes: DATABASE_URL=postgres://u:PLANTED-FIELD-0013@host/db',
        '',
      ].join('\n'),
    );
    expect(body.steps[0].fields).toEqual([
      { key: 'URL', text: 'https://host.example/db' },
      { key: 'Location', text: 'Settings → Database' },
      { key: 'Notes', text: `DATABASE_URL=${VALUE_NOT_SHOWN_MARK}` },
    ]);
    expect(body.steps[0].notes).toEqual([`DATABASE_URL=${VALUE_NOT_SHOWN_MARK}`]);
    expect(JSON.stringify(body)).not.toContain('PLANTED-FIELD');
  });

  it('stores none of the planted secrets of any form, in the steps, fields, notes or sections', () => {
    const body = extractUserSetup(userSetupFormDoc());
    const text = JSON.stringify(body);
    expect(body.steps).toHaveLength(1);
    expect(body.steps[0].fields.length).toBeGreaterThan(2);
    for (const [index, form] of WRITTEN_FORMS.entries()) {
      for (const secret of form.secrets(formTag(index))) expect(text, `${form.label}: ${secret}`).not.toContain(secret);
    }
  });

  it('masks a table row whatever the header says: a Value column, a Name column, no header, a lower-case name', () => {
    const body = extractUserSetup(
      [
        '## A',
        '',
        '| Variable | Value |',
        '| --- | --- |',
        '| STRIPE_KEY | PLANTED-TABLE-0001 |',
        '',
        '## B',
        '',
        '| Name | Value |',
        '| --- | --- |',
        '| stripe_key | PLANTED-TABLE-0002 |',
        '',
        '## C',
        '',
        '| Env var | Where |',
        '| --- | --- |',
        '| `STRIPE_KEY` | PLANTED-TABLE-0003 | PLANTED-TABLE-0004 |',
        '',
        '## D',
        '',
        '| STRIPE_KEY | PLANTED-TABLE-0005 |',
        '',
      ].join('\n'),
    );
    expect(JSON.stringify(body)).not.toContain('PLANTED-TABLE');
    const lines = body.sections.map((s) => s.lines.join('\n'));
    expect(lines[0]).toContain(`| STRIPE_KEY | ${VALUE_NOT_SHOWN_MARK} |`);
    expect(lines[0]).toContain('| Variable | Value |');
  });

  it('keeps a variable table row with a Status column as a step with its source and destination', () => {
    const body = extractUserSetup('## Env\n\n| Status | Variable | Source | Add to |\n|---|---|---|---|\n| [ ] | `A_KEY` | Host | `.env` |\n');
    expect(body.steps[0]).toMatchObject({ title: 'A_KEY', source: 'Host', destination: '.env' });
  });
});
