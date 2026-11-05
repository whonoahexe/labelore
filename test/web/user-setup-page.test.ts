// Phase 10 (10-19, VIEW-11): the User setup composer and the static markup of its page, on the made-up Lendshed user
// setups (04 part done with a planted value and a Status line that disagrees, 02 all pending). The first screen says how
// many setup steps are done and where each variable goes and where to get it, and never shows a variable's value.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { composeUserSetup } from '../../src/web/views/user-setup-page.ts';
import type { ComposedUserSetup } from '../../src/web/views/user-setup-page.ts';
import { UserSetupView, userSetupHeaderProps } from '../../src/web/views/user-setup-page-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { UserSetupHandler } from '../../src/planning-repo/handlers/user-setup.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { fxRead } from '../helpers/fixture-project.ts';

const PART = fxRead('phases/04-bulk-loan-export/04-USER-SETUP.md');
const PENDING = fxRead('phases/02-roles-and-permissions/02-USER-SETUP.md');

function ref(path: string): ArtifactRef {
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

function inputOf(userSetup: unknown): ViewInput {
  return {
    kind: 'user-setup',
    frontmatter: {},
    structured: userSetup === undefined ? {} : { userSetup },
    groups: [],
    planSegments: [],
  };
}

/** The handler's reading of a file, composed the way the page does. */
function composeFile(content: string, path = '.planning/phases/04-x/04-USER-SETUP.md'): ComposedUserSetup | null {
  const raw: RawArtifact = { path, content, mtimeMs: 0, size: content.length };
  const parsed = UserSetupHandler.parse(raw, ref(path));
  return composeUserSetup(inputOf(parsed.structured?.userSetup));
}

function markup(model: ComposedUserSetup): string {
  return renderToStaticMarkup(createElement(UserSetupView, { model }));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('composeUserSetup', () => {
  it('returns null when the file has no projection', () => {
    expect(composeUserSetup(inputOf(undefined))).toBeNull();
  });

  it('reads 04 as "3 of 6 steps done", the key as a pending step with its value withheld', () => {
    const model = composeFile(PART);
    expect(model).not.toBeNull();
    expect(model?.lead).toBe('3 of 6 steps done');
    expect(model?.done).toBe(3);
    expect(model?.total).toBe(6);
    expect(model?.meter).toEqual(['complete', 'complete', 'in-flight', 'complete', 'in-flight', 'in-flight']);
    const key = model?.items.find((item) => item.title === 'LOANNOTE_MODEL_KEY');
    expect(key).toMatchObject({ tone: 'in-flight', word: 'Pending', hadValue: true, destination: '.env.local' });
  });

  it('reads 02 as "0 of 3 steps done" with every step pending', () => {
    const model = composeFile(PENDING, '.planning/phases/02-x/02-USER-SETUP.md');
    expect(model?.lead).toBe('0 of 3 steps done');
    expect(model?.meter).toEqual(['in-flight', 'in-flight', 'in-flight']);
  });

  it('shows the Status line beside the box count when they disagree, and a plain chip when they agree', () => {
    expect(composeFile(PART)?.status).toMatchObject({
      word: 'Complete',
      disagrees: true,
      boxes: '3 of 6',
      note: 'These disagree: the file is marked Complete with 3 boxes still open. Both are shown as written.',
    });
    expect(composeFile(PENDING, '.planning/phases/02-x/02-USER-SETUP.md')?.status).toMatchObject({
      word: 'Incomplete',
      disagrees: false,
    });
  });

  it('draws the dashboard paths as a tree: the service is the root, a one-child chain is joined, a URL-only step joins its host', () => {
    const model = composeFile(PART);
    const rows = model?.tree ?? [];
    expect(rows.filter((row) => row.depth === 0).map((row) => row.name)).toEqual(['Association model host']);
    const folders = rows.filter((row) => row.dir).map((row) => row.name);
    expect(folders).toContain('Settings');
    expect(folders).toContain('Models → Small');
    expect(folders).toContain('Access keys');
    // The account step names only a URL; it joins the root whose other steps share the host.
    const account = model?.items.find((item) => item.kind === 'account');
    const leaf = rows.find((row) => row.item === account?.index);
    expect(leaf).toMatchObject({ depth: 1, parent: 0, at: null });
    expect(model?.tray).toEqual([]);
    // The last segment is the leaf's muted prefix.
    const host = model?.items.find((item) => item.title === 'LOANNOTE_MODEL_HOST');
    expect(rows.find((row) => row.item === host?.index)?.at).toBe('Endpoint address');
  });

  it('groups the variables by destination file: "{d} of {t} set" on each card', () => {
    const model = composeFile(PART);
    expect(model?.files).toHaveLength(1);
    expect(model?.files[0]).toMatchObject({ name: '.env.local', setLabel: '2 of 3 set' });
    expect(model?.files[0].lines).toHaveLength(3);
  });

  it('opens on the first open step', () => {
    const model = composeFile(PART);
    expect(model?.items[model?.firstOpen ?? -1]?.title).toBe('LOANNOTE_MODEL_KEY');
  });

  it('lists every step as a bar by section with its done count', () => {
    const model = composeFile(PART);
    expect(model?.bars.map((bar) => [bar.heading, bar.count])).toEqual([
      ['Environment Variables', '2 of 3'],
      ['Account Setup', '1 of 1'],
      ['Dashboard Configuration', '0 of 2'],
    ]);
  });
});

describe('UserSetupView on 04-USER-SETUP', () => {
  const model = composeFile(PART) as ComposedUserSetup;
  const html = markup(model);

  it('leads with "3 of 6 steps done" over one meter with one square per step', () => {
    expect(html).toContain('<b>3 of 6</b> steps done');
    expect(html).toContain('aria-label="3 of 6 steps done"');
    expect(count(html, 'status-meter-sq')).toBe(6);
  });

  it('shows the Status line and the box count as two separate facts, dashed and untoned', () => {
    expect(html).toContain('The Status line says');
    expect(html).toContain('The boxes say');
    expect(html).toContain('Complete');
    expect(html).toContain('<span class="view-user-setup-mono">3 of 6</span> ticked');
    expect(html).toContain('These disagree: the file is marked Complete with 3 boxes still open.');
    expect(html).not.toContain('view-user-setup-disagree" data-tone');
  });

  it('draws each variable with its destination, where to get it and the quiet "Value not shown" mark', () => {
    expect(html).toContain('Get it from');
    expect(html).toContain('Goes in');
    expect(html).toContain('2 of 3 set');
    expect(html).toContain('LOANNOTE_MODEL_KEY');
    expect(html).toContain('Value not shown');
    expect(html).toContain('→ .env.local');
    expect(html).toContain('Association model host');
    expect(html).toContain('Endpoint address');
  });

  it('carries each step as a closed bar with its title and status word', () => {
    expect(count(html, '<details class="view-user-setup-bar"')).toBe(6);
    expect(count(html, '<details class="view-user-setup-bar" open')).toBe(0);
    expect(html).toContain('Create an association model host account');
  });

  it('opens the dock on the first open step with its facts', () => {
    expect(html).toContain('aria-label="Step: LOANNOTE_MODEL_KEY"');
    expect(html).toContain('Association model host → Settings → Access keys → Create key');
  });

  it('puts the planted value nowhere in the markup', () => {
    expect(html).not.toContain('PLACEHOLDER-NOT-A-REAL-KEY');
  });
});

describe('UserSetupView on 02-USER-SETUP (all pending)', () => {
  const model = composeFile(PENDING, '.planning/phases/02-x/02-USER-SETUP.md') as ComposedUserSetup;
  const html = markup(model);

  it('leads with "0 of 3 steps done" and a plain Status line chip, no disagreement block', () => {
    expect(html).toContain('<b>0 of 3</b> steps done');
    expect(html).not.toContain('The Status line says');
    expect(html).toContain('Status line');
    expect(html).toContain('Incomplete');
  });

  it('shows every step pending', () => {
    expect(count(html, 'Pending')).toBeGreaterThanOrEqual(3);
    expect(html).not.toContain('Value not shown');
  });
});

describe('userSetupHeaderProps', () => {
  it('moves the phase up to the eyebrow, keeps the title after "Phase N:" as the h1 and carries the head facts as meta', () => {
    const model = composeFile(PART) as ComposedUserSetup;
    const header = userSetupHeaderProps(model, 'Phase 4: User Setup Required');
    expect(header.eyebrow).toBe('Phase 4 · User setup');
    expect(header.title).toBe('User Setup Required');
    const meta = renderToStaticMarkup(createElement('div', null, header.meta));
    expect(meta).toContain('Generated 2026-04-12');
    expect(meta).toContain('04-bulk-loan-export');
  });
});
