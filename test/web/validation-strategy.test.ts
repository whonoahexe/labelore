// quick-261003-526: composeValidationStrategy, built from literal ViewInput objects and from the
// real corpus extractions through ValidationHandler (test/validation-strategy.test.ts covers the
// server extractor; the narrow e2e spec covers the page end to end), plus the static markup of the
// view. The documents are the made-up Lendshed files, read through fxPath (a missing file throws, never
// skips); every pinned number was counted in the Lendshed file itself with grep/awk.
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { MemoryRouter } from 'react-router';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { fxPath } from '../helpers/fixture-project.ts';
import { ValidationHandler } from '../../src/planning-repo/handlers/validation.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import {
  DOC_STATUS,
  STATUS_TONE,
  composeValidationStrategy,
  docStatusOf,
  segmentsOf,
  splitCommands,
} from '../../src/web/views/validation-strategy.ts';
import type { ComposedValidationStrategy } from '../../src/web/views/validation-strategy.ts';
import {
  ValidationIntroMeta,
  ValidationStrategyView,
  validationHeaderProps,
} from '../../src/web/views/validation-strategy-components.tsx';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const DENSE = new URL(
  '../../fixtures/dense/.planning/phases/01-identity-slice/01-VALIDATION.md',
  import.meta.url,
).pathname;
const FX2 = fxPath('phases/02-roles-and-permissions/02-VALIDATION.md');
const FX1 = fxPath('phases/01-member-sign-in-sessions/01-VALIDATION.md');
const FX3 = fxPath('phases/03-account-admin-and-sessions/03-VALIDATION.md');
const FX4 = fxPath('phases/04-bulk-loan-export/04-VALIDATION.md');
const V102 = fxPath('milestones/v1.0-phases/02-shed-inventory-health/02-VALIDATION.md');
const V103 = fxPath('milestones/v1.0-phases/03-catalogue-browsing/03-VALIDATION.md');

function inputOf(content: string, headings: ViewInput['headings'] = []): ViewInput {
  const ref: ArtifactRef = {
    path: '.planning/phases/01-x/01-VALIDATION.md',
    kind: 'validation',
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
  const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
  const parsed = ValidationHandler.parse(raw, ref);
  return {
    kind: 'validation',
    frontmatter: parsed.frontmatter as Record<string, unknown>,
    structured: parsed.structured as Record<string, unknown>,
    groups: [],
    planSegments: [],
    headings,
  };
}

function compose(path: string, headings?: ViewInput['headings']): ComposedValidationStrategy {
  const composed = composeValidationStrategy(inputOf(readFileSync(path, 'utf8'), headings));
  expect(composed).not.toBeNull();
  return composed as ComposedValidationStrategy;
}

const noop = (): void => undefined;

function renderView(
  composed: ComposedValidationStrategy,
  props: Partial<Parameters<typeof ValidationStrategyView>[0]> = {},
): string {
  return renderToStaticMarkup(
    createElement(ValidationStrategyView, { strategy: composed, title: 'VALIDATION', onShowSource: noop, ...props }),
  );
}

function count(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

describe('tone maps and helpers', () => {
  it('maps each status, doc status and splits commands outside code spans', () => {
    expect(STATUS_TONE).toEqual({
      green: 'complete',
      red: 'missing',
      flaky: 'in-flight',
      pending: 'quiet',
      none: 'quiet',
    });
    expect(DOC_STATUS.draft).toEqual({ label: 'Draft', tone: 'in-flight' });
    expect(DOC_STATUS.ready).toEqual({ label: 'Ready', tone: 'active' });
    expect(DOC_STATUS.validated).toEqual({ label: 'Validated', tone: 'complete' });
    expect(docStatusOf('wibble')).toEqual({ label: 'wibble', tone: 'quiet' });
    expect(docStatusOf('')).toEqual({ label: 'Unknown', tone: 'quiet' });
    expect(splitCommands('`a | b` · `c`; `d`')).toEqual(['`a | b`', '`c`', '`d`']);
    expect(splitCommands("`npm test -- --test-name-pattern='archive|download'`")).toHaveLength(1);
    expect(splitCommands('Targeted frontend tests')).toEqual(['Targeted frontend tests']);
  });

  it('turns task IDs that exist in the map into segments, but never inside a code span', () => {
    const ids = new Map([['2-01-02', 1]]);
    expect(segmentsOf('created by 2-01-02, extended', ids)).toEqual([
      { text: 'created by ' },
      { taskId: '2-01-02', index: 1 },
      { text: ', extended' },
    ]);
    expect(segmentsOf('created by `2-01-02`', ids)).toEqual([{ text: 'created by `2-01-02`' }]);
    expect(segmentsOf('2-09-09 is unknown', ids)).toEqual([{ text: '2-09-09 is unknown' }]);
  });
});

describe('composeValidationStrategy — degenerate input', () => {
  it('returns null with no structured.validation or with every section null', () => {
    const base: ViewInput = {
      kind: 'validation',
      frontmatter: {},
      structured: {},
      groups: [],
      planSegments: [],
    };
    expect(composeValidationStrategy(base)).toBeNull();
    expect(composeValidationStrategy(inputOf('## Notes\n\nonly an extra\n'))).toBeNull();
    expect(
      composeValidationStrategy({
        ...base,
        structured: {
          validation: { infra: null, sampling: null, map: null, wave0: null, manual: null, signoff: null, extras: [] },
        },
      }),
    ).toBeNull();
  });

  it('shows a dim only when its frontmatter key exists, and reads string booleans', () => {
    const composed = composeValidationStrategy(
      inputOf('---\nnyquist_compliant: "false"\n---\n\n## Validation Sign-Off\n\n- [x] one\n'),
    );
    expect(composed?.intro.dims).toEqual([
      { key: 'nyquist', glyph: '✗', label: 'Not Nyquist compliant', tone: 'in-flight' },
    ]);
    expect(composed?.intro.eyebrow).toBe('Validation strategy');
    expect(composed?.intro.title).toBeNull();
  });

  it('notes a passed VERIFICATION when the strategy is still a draft or its map was never filled in', () => {
    const draft = inputOf('---\nstatus: draft\n---\n\n## Validation Sign-Off\n\n- [ ] one\n');
    const verification = (status: string) => ({
      kind: 'verification',
      path: '.planning/phases/01-x/01-VERIFICATION.md',
      url: '/verification',
      frontmatter: { status, verified: '2026-07-20T21:07:07Z' },
    });
    const composed = composeValidationStrategy({ ...draft, siblingArtifacts: [verification('passed')] });
    expect(composed?.intro.unreconciled).toEqual({ verified: '20 Jul 2026', url: '/verification' });
    const html = renderToStaticMarkup(
      createElement(MemoryRouter, null, validationHeaderProps(composed!, 'Fallback').lead),
    );
    expect(html).toContain('Phase verified 20 Jul 2026</a> · this strategy was never reconciled');

    expect(validationHeaderProps(composeValidationStrategy(draft)!, 'Fallback').lead).toBeNull();
    expect(composeValidationStrategy(draft)?.intro.unreconciled).toBeNull();
    expect(
      composeValidationStrategy({ ...draft, siblingArtifacts: [verification('gaps_found')] })?.intro.unreconciled,
    ).toBeNull();
    const validated = inputOf('---\nstatus: validated\n---\n\n## Validation Sign-Off\n\n- [x] one\n');
    expect(
      composeValidationStrategy({ ...validated, siblingArtifacts: [verification('passed')] })?.intro.unreconciled,
    ).toBeNull();
  });

  it('keeps ID text inside a backticked Wave 0 item as code, not a task link', () => {
    const body = [
      '## Per-Task Verification Map',
      '',
      '| Task ID | Plan | Wave | Command |',
      '|---|---|---|---|',
      '| 1-01-01 | 01 | 1 | `cargo test` |',
      '',
      '## Wave 0 Requirements',
      '',
      '- [ ] `x.rs` — created by 1-01-01 and by `1-01-01`',
    ].join('\n');
    const composed = composeValidationStrategy(inputOf(body)) as ComposedValidationStrategy;
    const segments = composed.wave0?.items[0].segments ?? [];
    expect(segments.filter((s) => 'taskId' in s)).toHaveLength(1);
    const html = renderView(composed, { initialWave0Open: true });
    expect(count(html, 'class="view-validation-ref"')).toBe(1);
    expect(html).toContain('<code>1-01-01</code>');
  });

  it('shows Template comments only for a body with an HTML comment', () => {
    const none = composeValidationStrategy(inputOf('## Validation Sign-Off\n\n- [x] a\n')) as ComposedValidationStrategy;
    expect(renderView(none)).not.toContain('Template comments');
    const some = composeValidationStrategy(
      inputOf('<!-- hi -->\n## Validation Sign-Off\n\n- [x] a\n'),
    ) as ComposedValidationStrategy;
    const html = renderView(some);
    expect(html).toContain('Template comments');
    expect(html).not.toMatch(/<button[^>]*>Template comments/);
  });
});

describe('composeValidationStrategy — Lendshed phase 2', () => {
  const c = compose(FX2);

  it('composes the cover', () => {
    expect(c.intro).toMatchObject({
      eyebrow: 'Validation strategy · Phase 2',
      title: 'Roles and permissions',
      status: { label: 'Draft', tone: 'in-flight' },
      created: '30 Mar 2026',
      reconciled: null,
      updated: null,
    });
    expect(c.intro.dims).toEqual([
      { key: 'nyquist', glyph: '✓', label: 'Nyquist compliant', tone: 'complete' },
      { key: 'wave0', glyph: '○', label: 'Wave 0 not complete', tone: 'quiet' },
    ]);
  });

  it('composes the three cells', () => {
    expect(c.cells.tasks.value).toBe('0');
    expect(c.cells.tasks.note).toBe('of 15 green');
    expect(c.cells.tasks.squares).toHaveLength(15);
    expect(c.cells.tasks.squares.every((s) => s.tone === 'quiet')).toBe(true);
    expect(c.cells.human).toEqual({ count: 6, note: 'not yet observed', hasSection: true });
    expect(c.cells.signoff).toMatchObject({ checked: 6, total: 6, stampLabel: 'Pending', stampTone: 'active' });
  });

  it('composes the map: four lanes, six plan groups, 7 files to create, glyph counts', () => {
    const map = c.map;
    expect(map?.lanes.map((l) => l.wave)).toEqual(['1', '2', '3', '4']);
    expect(map?.lanes.flatMap((l) => l.plans)).toHaveLength(6);
    expect(map?.toCreate).toBe(7);
    expect(map?.statuses).toEqual([{ status: 'pending', label: 'Pending', tone: 'quiet', count: 15 }]);
    const glyphs = Object.fromEntries((map?.filters.kinds ?? []).map((k) => [k.glyph, k.count]));
    expect(glyphs).toEqual({ HUMAN: 3, INT: 2, UNIT: 8, BUILD: 2 });
    expect(map?.tasks[0]).toMatchObject({
      shortId: '01-01',
      glyph: 'HUMAN',
      glyphTone: 'in-flight',
      commandLabel: 'Checked by',
      anchorId: 'validation-task-0',
    });
    expect(map?.tasks[1].reqLabel).toBe('ROLE-03 ROLE-06 +2');
    expect(map?.tasks[1].copy).toBe('cd server && npx vitest run test/guard-enforcement.test.ts');
  });

  it('numbers the sections present and lists the source-only entries', () => {
    expect(c.sections.map((s) => `${s.number} ${s.title}`)).toEqual([
      "01 How it's tested",
      '02 Task verification',
      '03 Checked by a human',
      '04 Sign-off',
    ]);
    expect(c.sourceOnly.map((s) => s.label)).toEqual(['Preamble', 'Status legend', 'Frontmatter']);
  });

  it('renders the lanes, tiles, no pressed tile and an empty inspector', () => {
    const html = renderView(c);
    expect(count(html, 'class="view-validation-lane"')).toBe(4);
    expect(count(html, 'class="view-validation-tile"')).toBe(15);
    expect(html).not.toContain('aria-pressed="true"');
    expect(html).toContain('Pick a task to see');
    expect(html).toContain('7 need a file created');
  });

  it('opens the inspector on an initial selection', () => {
    const html = renderView(c, { initialSelection: 1 });
    expect(html).toContain('npx vitest run test/guard-enforcement.test.ts');
    expect(count(html, 'aria-pressed="true"')).toBe(1);
    expect(html).toContain('aria-label="Copy command"');
    expect(html).toMatch(/<button[^>]*class="view-validation-ref"[^>]*>ROLE-06</);
  });

  it('shows Checked by and the human link for a HUMAN task, and no copy button', () => {
    const html = renderView(c, { initialSelection: 0 });
    const inspector = html.slice(html.indexOf('<aside'), html.indexOf('</aside>'));
    expect(inspector).toContain('Checked by');
    expect(inspector).toContain('See the human checks ↓');
    expect(inspector).not.toContain('aria-label="Copy command"');
  });

  it('renders the cover: 15 squares, the verdict texts and a closed checklist', () => {
    const html = renderToStaticMarkup(createElement(ValidationIntroMeta, { intro: c.intro, cells: c.cells }));
    expect(count(html, 'class="view-validation-square"')).toBe(15);
    expect(html).toContain('of 15 green');
    expect(html).toContain('not yet observed');
    expect(html).toContain('of 6 checks');
    expect(html).toContain('Go to checks ↓');
    expect(html).toContain('Show checks ▾');
    expect(html).toContain('Created<b>30 Mar 2026</b>');
    expect(html).not.toContain('view-validation-checklist');
    const open = renderToStaticMarkup(
      createElement(ValidationIntroMeta, { intro: c.intro, cells: c.cells, initialChecksOpen: true }),
    );
    expect(count(open, '<li ')).toBe(6);
    expect(open).toContain('Hide checks ▴');
  });

  it('renders the rig: spec rows, two command lines each, runtime, cadence, 50% latency, no read-only tag', () => {
    const html = renderView(c);
    const rig = html.slice(html.indexOf('id="validation-rig"'), html.indexOf('id="validation-map"'));
    expect(count(rig, 'class="view-validation-spec-row"')).toBe(2);
    expect(rig).toContain('Framework');
    expect(rig).toContain('Config file');
    const quick = rig.slice(rig.indexOf('data-run="quick"'), rig.indexOf('data-run="full"'));
    expect(count(quick, 'class="view-validation-cmd"')).toBe(2);
    expect(count(quick, 'aria-label="Copy command"')).toBe(2);
    const full = rig.slice(rig.indexOf('data-run="full"'));
    expect(count(full, 'class="view-validation-cmd"')).toBe(2);
    expect(rig).toContain('Runtime ·');
    expect(rig.match(/data-size="(\d)"/g)).toEqual(['data-size="0"', 'data-size="1"', 'data-size="2"']);
    // 60 seconds of a 120-second scale.
    expect(rig).toContain('width:50%');
    expect(html.toLowerCase()).not.toContain('read-only');
  });

  it('dims the tiles that lack the filtered requirement or threat', () => {
    const html = renderView(c, { initialFilter: { ref: 'ROLE-06', kind: null, status: null } });
    const tiles = c.map?.tasks ?? [];
    const lacking = tiles.filter((t) => !t.requirements.includes('ROLE-06') && !t.threats.includes('ROLE-06')).length;
    // 5 of the 15 rows name ROLE-06 (2-01-02, 2-01-03, 2-03-01, 2-06-01, 2-06-02), counted in the file.
    expect(lacking).toBe(10);
    expect(count(html, 'data-dim="true"')).toBe(lacking);
    expect(html).toMatch(/data-filter="ref"[^>]*aria-pressed="true"/);
    expect(html).toContain('Clear');
  });

  it('lists every distinct requirement as a chip with a count', () => {
    const reqs = c.map?.filters.requirements ?? [];
    expect(reqs.map((r) => r.value)).toEqual(['ROLE-01', 'ROLE-02', 'ROLE-03', 'ROLE-04', 'ROLE-05', 'ROLE-06']);
    const html = renderView(c);
    expect(count(html, 'data-filter="ref"')).toBe(reqs.length);
  });

  it('folds Wave 0 by default and opens to 7 items', () => {
    const closed = renderView(c);
    expect(closed).toContain('0 of 7 in place');
    expect(closed).toMatch(/id="validation-wave0"[\s\S]*?aria-expanded="false"/);
    expect(closed).not.toContain('view-validation-wave0-list');
    const open = renderView(c, { initialWave0Open: true });
    expect(count(open, '<li data-done=')).toBeGreaterThanOrEqual(7);
    expect(open).toContain('aria-expanded="true"');
    // Wave 0 IDs that exist in the map become buttons.
    expect(open).toMatch(/<button[^>]*class="view-validation-ref"[^>]*>2-01-02</);
  });

  it('renders 6 human cards awaiting a human, with a Backstop chip and the clause removed', () => {
    const html = renderView(c);
    expect(count(html, '<article class="view-validation-card"')).toBe(6);
    expect(count(html, 'Awaiting a human')).toBe(6);
    expect(count(html, '>Backstop<')).toBe(2);
    expect(html).not.toContain('(**backstop**');
  });

  it('renders the sign-off checklist and the Pending stamp in the active tone', () => {
    const html = renderView(c);
    const signoff = html.slice(html.indexOf('id="validation-signoff"'));
    expect(count(signoff, '>✓<')).toBe(6);
    expect(signoff).toMatch(/class="view-validation-stamp" data-tone="active"/);
    expect(signoff).toContain('>Pending<');
  });

  it('lists Preamble, Status legend and Frontmatter in the source-only strip', () => {
    const html = renderView(c);
    const nav = html.slice(html.indexOf('id="validation-source-only"'));
    expect(nav).toContain('>Preamble<');
    expect(nav).toContain('>Status legend<');
    expect(nav).toContain('>Frontmatter<');
    expect(nav).not.toContain('Map preface');
  });
});

describe('composeValidationStrategy — the other Lendshed documents', () => {
  it('phase 4: Ready, reconciled, no status column, five lanes and a prerequisite on every task', () => {
    const c = compose(FX4);
    expect(c.intro.status).toEqual({ label: 'Ready', tone: 'active' });
    expect(c.intro.reconciled).toBe('9 Apr 2026');
    expect(c.cells.tasks.value).toBeNull();
    expect(c.cells.tasks.note).toBe('10 tasks · no status column');
    expect(c.map?.lanes).toHaveLength(5);
    expect(c.map?.tasks.every((t) => t.file.label === 'Not recorded')).toBe(true);
    expect(c.map?.tasks.filter((t) => t.prerequisite !== '')).toHaveLength(10);
    const html = renderView(c, { initialWave0Open: true, initialSelection: 0 });
    expect(html).toContain('Before it runs');
    expect(html).toContain('No status column');
    expect(html).toContain('>Step 1<');
    expect(html).toContain('>Step 4<');
    expect(html).not.toContain('view-validation-latency');
    const rig = html.slice(html.indexOf('id="validation-rig"'), html.indexOf('id="validation-map"'));
    const quick = rig.slice(rig.indexOf('data-run="quick"'), rig.indexOf('data-run="full"'));
    expect(count(quick, 'class="view-validation-cmd"')).toBe(2);
    expect(quick).toContain('export|download');
    // 04-03-01 is a map task, so the Wave 0 reconciliation links it.
    expect(html).toMatch(/<button[^>]*class="view-validation-ref"[^>]*>04-03-01</);
  });

  it('phase 3: every Quick and Full row is shown with its qualifier, and Wave 0 reads "4 notes"', () => {
    const c = compose(FX3);
    const html = renderView(c);
    const rig = html.slice(html.indexOf('id="validation-rig"'), html.indexOf('id="validation-map"'));
    const quick = rig.slice(rig.indexOf('data-run="quick"'), rig.indexOf('data-run="full"'));
    expect(count(quick, 'class="view-validation-cmd"')).toBe(2);
    expect(quick).toContain('>server<');
    expect(quick).toContain('>web<');
    const full = rig.slice(rig.indexOf('data-run="full"'));
    expect(count(full, 'class="view-validation-cmd"')).toBe(2);
    expect(count(rig, 'class="view-validation-spec-row"')).toBe(3);
    expect(html).toContain('4 notes');
  });

  it('phase 1: 8 of 9 green, 3 observed, three Observed · pass footers and one Not observed', () => {
    const c = compose(FX1);
    expect(c.intro.dims).toEqual([
      { key: 'nyquist', glyph: '✗', label: 'Not Nyquist compliant', tone: 'in-flight' },
      { key: 'wave0', glyph: '✓', label: 'Wave 0 complete', tone: 'complete' },
    ]);
    expect(c.intro.updated).toBe('27 Mar 2026');
    expect(c.cells.tasks.value).toBe('8');
    expect(c.cells.tasks.note).toBe('of 9 green');
    expect(c.cells.human.note).toBe('3 observed');
    const html = renderView(c);
    expect(count(html, 'Observed · pass')).toBe(3);
    expect(count(html, 'Not observed')).toBe(1);
    expect(html).toContain('7 of 7 in place');
    // The suite state authored after the map table is still parsed, but the page no longer shows it.
    expect(c.map?.notes).toHaveLength(2);
    expect(count(html, 'view-validation-note')).toBe(0);
  });

  it('v1.0/02: lanes 0, 5, TBD in that order and a Map preface entry', () => {
    const c = compose(V102);
    expect(c.map?.lanes.map((l) => l.wave)).toEqual(['0', '5', 'TBD']);
    expect(c.sourceOnly.map((s) => s.label)).toContain('Map preface');
    expect(c.wave0?.summary).toBe('2 of 5 in place');
  });

  it('v1.0/03: the template map shows the notice, no tiles, and "map never filled in"', () => {
    const c = compose(V103);
    expect(c.map?.template).toEqual({ id: '{N}-01-01', command: '`{command}`' });
    expect(c.map?.lanes).toEqual([]);
    expect(c.cells.tasks.value).toBeNull();
    expect(c.cells.tasks.note).toBe('map never filled in');
    const html = renderView(c);
    expect(html).toContain('The map was never filled in.');
    expect(html).not.toContain('view-validation-tile');
  });
});

describe('composeValidationStrategy — the dense fixture', () => {
  const c = compose(DENSE);

  it('shows "none listed" and renders the author prose with no cards', () => {
    expect(c.cells.human).toEqual({ count: 0, note: 'none listed', hasSection: true });
    expect(c.manual?.prose?.length).toBeGreaterThan(0);
    const html = renderView(c);
    expect(html).not.toContain('<article class="view-validation-card"');
    expect(html).toContain('All phase behaviors have automated verification.');
  });

  it('shows 5 ticked and 1 open sign-off item in the in-flight tone', () => {
    expect(c.cells.signoff).toMatchObject({ checked: 5, total: 6, stampLabel: 'Pending', stampTone: 'in-flight' });
    const html = renderView(c);
    const signoff = html.slice(html.indexOf('id="validation-signoff"'));
    expect(count(signoff, '>✓<')).toBe(5);
    expect(count(signoff, '>○<')).toBe(1);
  });
});
