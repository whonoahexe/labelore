// Phase 10 (10-19, VIEW-11): the USER-SETUP.md handler and extractor. It reads the steps (the Environment Variables
// rows with a Status box and the checklist items), the variables with where each goes and where to get it, and the
// file's own Status line into `structured.userSetup`, on the made-up Lendshed user setups (04 part done with a pasted
// value, 02 all pending) (VIEW-21). A variable's value is never kept (T-10-33).
import { describe, expect, it } from 'vitest';
import type { ArtifactRef, RawArtifact } from '../src/planning-repo/types.ts';
import { UserSetupHandler, extractUserSetup } from '../src/planning-repo/handlers/user-setup.ts';
import type { UserSetupBody } from '../src/planning-repo/handlers/user-setup.ts';
import { HANDLERS } from '../src/planning-repo/handlers/index.ts';
import { GenericMarkdownHandler } from '../src/planning-repo/handlers/generic.ts';
import { fxRead } from './helpers/fixture-project.ts';

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
    expect(step.fields[1].value).toBe('Association model host → Settings → Limits → Monthly cap');
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
