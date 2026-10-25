// quick-261016-ujo: the PLAN page's What to check model. buildPlanManualChecks gathers a task's own
// manual-check steps, the VALIDATION Manual-Only rows that share a requirement with the plan (task
// IDs only ever leave a row out), the UI-SPEC backstop rows, the Read first links and the UAT
// pointer, from the cached presentation alone. The fixtures are in-memory projects under
// `.planning/phases/04-demo/`, built from the standard GSD template shapes, plus a served end to end
// slice through the Hono app, the composer and the static markup.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { InMemoryPlanningFilesystem } from '../../src/planning-fs/in-memory-fs.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { buildPlanManualChecks } from '../../src/presentation/manual-checks.ts';
import type { PlanManualChecks } from '../../src/presentation/manual-checks.ts';
import { buildReferenceRegistry } from '../../src/presentation/references.ts';
import { createApp } from '../../src/server/index.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { composePlanNavigator } from '../../src/web/views/plan-navigator.ts';
import { PlanNavigatorView } from '../../src/web/views/plan-navigator-components.tsx';

const ROOT = '/project';
const DIR = '.planning/phases/04-demo';
const PLAN = `${DIR}/04-06-PLAN.md`;

function planFile(requirements: string, tasks: string): string {
  return `---
phase: 04-demo
plan: 06
type: execute
requirements: ${requirements}
---

<objective>
Check it by hand. Purpose: prove it.
</objective>

<tasks>
${tasks}
</tasks>
`;
}

const AUTO_TASK = `<task type="auto">
  <name>Task 1: Build it</name>
  <files>src/a.ts</files>
  <action>Build.</action>
  <done>Built.</done>
</task>`;

const VERIFY_TASK = `<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Task 3: Look at it</name>
  <what-built>The page.</what-built>
  <action>Run the accessibility checks.</action>
  <how-to-verify>
1. Open the page.
2. Tab through it.
  </how-to-verify>
  <acceptance_criteria>
    - It reads well
    - It never overflows
  </acceptance_criteria>
</task>`;

const VALIDATION = `---
phase: 4
---

# Phase 4 - Validation Strategy

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Production Cloudflare integrity/resume (04-01-02, BLOCKING) | DL-09 | Needs production | Run the resume on production. |
| Native ZIP64 interoperability (04-07-01, BLOCKING) | DL-06 | Needs a desktop unzip | Unzip it. |
| Browser/accessibility protocol (04-06-03, BLOCKING) | DL-01, DL-02, DL-04, DL-08 | Needs a screen reader | Run the protocol in a browser. |
| Dark mode reads well | dl-07 | Needs eyes | Switch the theme and look. |
| Shared check (04-01-02, 04-06-03) | DL-04 | Both plans own it | Do both parts. |
`;

function studioFiles(): Record<string, string> {
  return {
    [PLAN]: planFile('[DL-04, DL-07, DL-08, DL-09]', `${AUTO_TASK}\n${VERIFY_TASK}`),
    [`${DIR}/04-VALIDATION.md`]: VALIDATION,
  };
}

async function snapshotOf(files: Record<string, string>) {
  return await new PlanningRepository(new InMemoryPlanningFilesystem(files), ROOT).load();
}

async function presentationOf(files: Record<string, string>): Promise<ProjectPresentation> {
  return toProjectPresentation(await snapshotOf(files));
}

async function checksOf(files: Record<string, string>, path = PLAN): Promise<PlanManualChecks | null> {
  const presentation = await presentationOf(files);
  return buildPlanManualChecks(presentation, buildReferenceRegistry(presentation), path);
}

function entryOf(checks: PlanManualChecks | null, n: number) {
  const entry = checks?.tasks.find((candidate) => candidate.n === n);
  if (!entry) throw new Error(`No entry for task ${n}`);
  return entry;
}

describe('buildPlanManualChecks — a task\'s own steps', () => {
  it('a human-verify task with no VALIDATION in its directory gives one entry with only the task group', async () => {
    const checks = await checksOf({ [PLAN]: planFile('[DL-04]', VERIFY_TASK) });
    expect(checks?.tasks).toHaveLength(1);
    const entry = entryOf(checks, 1);
    expect(entry.groups.map((group) => group.key)).toEqual(['task']);
    expect(entry.groups[0].label).toBe('From this task');
    expect(entry.groups[0].items.map((item) => item.title)).toEqual(['How to check it', 'What to do', 'Accept when']);
    expect(entry.groups[0].source).toEqual({ text: '04-06-PLAN.md · Task 1', title: PLAN, url: null });
    expect(entry.count).toBe(3);
    expect(checks?.total).toBe(3);
  });

  it('puts the acceptance lead in a paragraph and its items in one unordered list', async () => {
    const checks = await checksOf({ [PLAN]: planFile('[DL-04]', VERIFY_TASK) });
    const accept = entryOf(checks, 1).groups[0].items.find((item) => item.title === 'Accept when');
    expect(accept?.blocks).toEqual([{ kind: 'list', ordered: false, items: ['It reads well', 'It never overflows'] }]);
  });

  it('an auto task with a verify human-check gives one Human check item and no Accept when', async () => {
    const task = `<task type="auto">
  <name>Task 1: Build it</name>
  <action>Build.</action>
  <verify>
    <automated>npm test</automated>
    <human-check>Open the page and read the heading.</human-check>
  </verify>
  <acceptance_criteria>
    - It builds
  </acceptance_criteria>
  <done>Built.</done>
</task>`;
    const checks = await checksOf({ [PLAN]: planFile('[DL-04]', task) });
    const entry = entryOf(checks, 1);
    expect(entry.groups).toHaveLength(1);
    expect(entry.groups[0].items.map((item) => item.title)).toEqual(['Human check']);
    expect(entry.groups[0].items[0].blocks).toEqual([{ kind: 'paragraph', text: 'Open the page and read the heading.' }]);
  });
});

describe('buildPlanManualChecks — VALIDATION rows matched by requirement', () => {
  it('lists the rows that share a requirement and drop those that name only other plans\' tasks', async () => {
    const checks = await checksOf(studioFiles());
    expect(checks?.tasks.map((entry) => entry.n)).toEqual([2]);
    const validation = entryOf(checks, 2).groups.find((group) => group.key === 'validation');
    expect(validation?.label).toBe("Manual checks for this plan's requirements");
    // The 04-01-02 row shares DL-09 but belongs to another plan; the ZIP64 row shares nothing.
    expect(validation?.items.map((item) => item.title)).toEqual([
      'Browser/accessibility protocol (04-06-03, BLOCKING)',
      'Dark mode reads well',
      'Shared check (04-01-02, 04-06-03)',
    ]);
    expect(validation?.items[0].requirements).toEqual(['DL-01', 'DL-02', 'DL-04', 'DL-08']);
    expect(validation?.items[0].note).toBe('Needs a screen reader');
    expect(validation?.items[0].blocks).toEqual([{ kind: 'paragraph', text: 'Run the protocol in a browser.' }]);
    // IDs are compared case-insensitively, and shown as written.
    expect(validation?.items[1].requirements).toEqual(['dl-07']);
  });

  it('keeps a row whose only dash-joined numbers are dates, not task references', async () => {
    const validation = `# Phase 4 - Validation Strategy

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Release notes read well (checked 2026-10-16) | DL-08 | Needs eyes | Compare against the 16-10-2026 draft. |
| Production resume (04-01-02, BLOCKING) | DL-08 | Needs production | Resume it. |
`;
    const checks = await checksOf({
      [PLAN]: planFile('[DL-08]', VERIFY_TASK),
      [`${DIR}/04-VALIDATION.md`]: validation,
    });
    const group = entryOf(checks, 1).groups.find((candidate) => candidate.key === 'validation');
    expect(group?.items.map((item) => item.title)).toEqual(['Release notes read well (checked 2026-10-16)']);
  });

  it('names the file and section, and links to the VALIDATION page', async () => {
    const presentation = await presentationOf(studioFiles());
    const key = presentation.artifacts.find((artifact) => artifact.path === `${DIR}/04-VALIDATION.md`)?.key;
    const checks = buildPlanManualChecks(presentation, buildReferenceRegistry(presentation), PLAN);
    const validation = entryOf(checks, 2).groups.find((group) => group.key === 'validation');
    expect(validation?.source).toEqual({
      text: '04-VALIDATION.md · Manual-Only Verifications',
      title: `${DIR}/04-VALIDATION.md`,
      url: key,
    });
  });

  it('counts the plan-level items once in the total', async () => {
    const checks = await checksOf(studioFiles());
    // Task 2: How to check it, What to do, Accept when (3) + 3 validation rows.
    expect(entryOf(checks, 2).count).toBe(6);
    expect(checks?.total).toBe(6);
  });

  it('gives no validation group when no requirement is shared, none are declared, or the section is prose', async () => {
    for (const requirements of ['[ZZ-99]', '[]']) {
      const checks = await checksOf({ ...studioFiles(), [PLAN]: planFile(requirements, VERIFY_TASK) });
      expect(entryOf(checks, 1).groups.map((group) => group.key)).toEqual(['task']);
    }
    const prose = `# Validation\n\n## Manual-Only Verifications\n\nCheck the whole thing by hand when it ships.\n`;
    const checks = await checksOf({ ...studioFiles(), [`${DIR}/04-VALIDATION.md`]: prose, [PLAN]: planFile('[DL-04]', VERIFY_TASK) });
    expect(entryOf(checks, 1).groups.map((group) => group.key)).toEqual(['task']);
  });

  it('accepts a comma-separated requirements string', async () => {
    const checks = await checksOf({ ...studioFiles(), [PLAN]: planFile('"dl-07, ZZ-1"', VERIFY_TASK) });
    const validation = entryOf(checks, 1).groups.find((group) => group.key === 'validation');
    expect(validation?.items.map((item) => item.title)).toEqual(['Dark mode reads well']);
  });

  it('keeps a row that names no task reference, and never reads a requirement id as one', async () => {
    const table = `## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plain row, see DL-09 and 2026-13 | DL-09 | x | Look at it. |
`;
    const checks = await checksOf({ ...studioFiles(), [`${DIR}/04-VALIDATION.md`]: table });
    const validation = entryOf(checks, 2).groups.find((group) => group.key === 'validation');
    expect(validation?.items).toHaveLength(1);
  });

  it('reads a phase group with a decimal as a task reference', async () => {
    const table = `## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Other plan (04.1-02-01). | DL-09 | x | Look at it. |
`;
    const checks = await checksOf({ ...studioFiles(), [`${DIR}/04-VALIDATION.md`]: table });
    expect(entryOf(checks, 2).groups.map((group) => group.key)).toEqual(['task']);
  });
});

describe('buildPlanManualChecks — degradation', () => {
  it('gives null for a non-plan path, a plan with only plain auto tasks and a missing path', async () => {
    const files = studioFiles();
    expect(await checksOf(files, `${DIR}/04-VALIDATION.md`)).toBeNull();
    expect(await checksOf(files, `${DIR}/04-99-PLAN.md`)).toBeNull();
    expect(await checksOf({ [PLAN]: planFile('[DL-04]', AUTO_TASK) })).toBeNull();
  });

  it('never throws on a hand-built presentation with junk in structured.plan', async () => {
    const presentation = await presentationOf(studioFiles());
    const registry = buildReferenceRegistry(presentation);
    const planDto = presentation.artifacts.find((artifact) => artifact.path === PLAN);
    if (!planDto) throw new Error('missing plan');
    for (const plan of ['nope', { tasks: 'nope' }, { tasks: [null, 3, 'x', { type: 4 }, { type: 'checkpoint:human-verify', fields: 'x' }] }]) {
      const junk: ProjectPresentation = {
        ...presentation,
        artifacts: presentation.artifacts.map((artifact) =>
          artifact === planDto ? { ...artifact, structured: { plan } } : artifact,
        ),
      };
      expect(() => buildPlanManualChecks(junk, registry, PLAN)).not.toThrow();
    }
    const junkPlan: ProjectPresentation = {
      ...presentation,
      artifacts: presentation.artifacts.map((artifact) => (artifact === planDto ? { ...artifact, structured: { plan: 'nope' } } : artifact)),
    };
    expect(buildPlanManualChecks(junkPlan, registry, PLAN)).toBeNull();
  });
});

const STUDIO_TASK = `<task type="checkpoint:human-verify" gate="blocking-human">
  <name>Task 3: Look at it</name>
  <read_first>
    - .planning/phases/04-demo/04-UI-SPEC.md
    - 04-VALIDATION.md
    - 04-06-PLAN.md
    - frontend/x.tsx
  </read_first>
  <action>Run the accessibility checks.</action>
  <how-to-verify>
1. Open the page.
  </how-to-verify>
  <acceptance_criteria>
    - It reads well
  </acceptance_criteria>
  <resume-signal>Type "approved" or describe what is wrong.</resume-signal>
</task>`;

const UI_SPEC = `---
phase: 4
---

# Phase 4 - UI Design Contract

## UI Considerations

| Element | Category | Status | Resolution |
|---------|----------|--------|------------|
| E1 selection bar | overflow | 🧪 backstop (P-01) | Long names wrap. |
| E1 selection bar | empty | ✅ covered | Shows a hint. |
| E2 list | overflow | 🧪 backstop | Scrolls sideways. |
| E3 detail | long-text | ⚠ unresolved | Not decided. |
| E4 footer | focus | dismissed | Not shown. |
`;

const UI_SPEC_NO_BACKSTOP = UI_SPEC.split('🧪 backstop (P-01)').join('✅ covered').split('🧪 backstop').join('✅ covered');

function fullFiles(): Record<string, string> {
  return {
    [PLAN]: planFile('[DL-04, DL-07, DL-08, DL-09]', `${AUTO_TASK}\n${STUDIO_TASK}`),
    [`${DIR}/04-VALIDATION.md`]: VALIDATION,
    [`${DIR}/04-UI-SPEC.md`]: UI_SPEC,
  };
}

describe('buildPlanManualChecks — UI-SPEC backstops, Read first, the resume signal and the UAT pointer', () => {
  it('lists the UI-SPEC backstop rows only, each titled with its category and element', async () => {
    const presentation = await presentationOf(fullFiles());
    const checks = buildPlanManualChecks(presentation, buildReferenceRegistry(presentation), PLAN);
    const group = entryOf(checks, 2).groups.find((candidate) => candidate.key === 'ui-spec');
    expect(group?.label).toBe('Screen states to check by hand');
    expect(group?.items.map((item) => item.title)).toEqual(['Overflow · E1 selection bar', 'Overflow · E2 list']);
    expect(group?.items[0].blocks).toEqual([{ kind: 'paragraph', text: 'Long names wrap.' }]);
    const key = presentation.artifacts.find((artifact) => artifact.path === `${DIR}/04-UI-SPEC.md`)?.key;
    expect(group?.source).toEqual({ text: '04-UI-SPEC.md · UI Considerations', title: `${DIR}/04-UI-SPEC.md`, url: key });
  });

  it('shows the task, read-first, validation and ui-spec groups in that order, ending on When you are done', async () => {
    const checks = await checksOf(fullFiles());
    const entry = entryOf(checks, 2);
    expect(entry.groups.map((group) => group.key)).toEqual(['task', 'read-first', 'validation', 'ui-spec']);
    const items = entry.groups[0].items.map((item) => item.title);
    expect(items).toEqual(['How to check it', 'What to do', 'Accept when', 'When you are done']);
    expect(entry.groups[0].items[3].blocks).toEqual([{ kind: 'paragraph', text: 'Type "approved" or describe what is wrong.' }]);
  });

  it('links Read first entries that name a known artifact, by exact path or a bare sibling name', async () => {
    const presentation = await presentationOf(fullFiles());
    const keyOf = (path: string): string | undefined => presentation.artifacts.find((artifact) => artifact.path === path)?.key;
    const checks = buildPlanManualChecks(presentation, buildReferenceRegistry(presentation), PLAN);
    const group = entryOf(checks, 2).groups.find((candidate) => candidate.key === 'read-first');
    // frontend/x.tsx resolves to nothing and the plan's own name is skipped.
    expect(group?.links).toEqual([
      { text: '04-UI-SPEC.md', title: `${DIR}/04-UI-SPEC.md`, url: keyOf(`${DIR}/04-UI-SPEC.md`) },
      { text: '04-VALIDATION.md', title: `${DIR}/04-VALIDATION.md`, url: keyOf(`${DIR}/04-VALIDATION.md`) },
    ]);
    expect(group?.items).toEqual([]);
    expect(group?.source).toBeNull();
  });

  it('leaves out the ui-spec group without a UI-SPEC or without a backstop row', async () => {
    const withoutFile = { ...fullFiles() };
    delete withoutFile[`${DIR}/04-UI-SPEC.md`];
    expect(entryOf(await checksOf(withoutFile), 2).groups.map((group) => group.key)).not.toContain('ui-spec');
    const noBackstop = await checksOf({ ...fullFiles(), [`${DIR}/04-UI-SPEC.md`]: UI_SPEC_NO_BACKSTOP });
    expect(entryOf(noBackstop, 2).groups.map((group) => group.key)).not.toContain('ui-spec');
  });

  it('points to the phase UAT file on every task with checks, without adding to the count', async () => {
    const before = await checksOf(fullFiles());
    const presentation = await presentationOf({ ...fullFiles(), [`${DIR}/04-UAT.md`]: '---\nstatus: testing\n---\n\n# UAT\n' });
    const after = buildPlanManualChecks(presentation, buildReferenceRegistry(presentation), PLAN);
    const entry = entryOf(after, 2);
    const last = entry.groups[entry.groups.length - 1];
    const uatKey = presentation.artifacts.find((artifact) => artifact.path === `${DIR}/04-UAT.md`)?.key;
    expect(last).toEqual({
      key: 'uat',
      label: 'Phase checklist',
      source: { text: '04-UAT.md', title: `${DIR}/04-UAT.md`, url: uatKey },
      lead: 'This phase also collects its hand checks in one checklist.',
      items: [],
      links: [],
    });
    expect(entry.count).toBe(entryOf(before, 2).count);
    expect(after?.total).toBe(before?.total);
    expect(entryOf(before, 2).groups.map((group) => group.key)).not.toContain('uat');
  });

  it('renders the full panel for the multi-phase shape', async () => {
    const snapshot = await snapshotOf(fullFiles());
    const app = createApp({ getSnapshot: () => snapshot }, true, '.');
    const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
    const planKey = presentation.artifacts.find((artifact) => artifact.path === PLAN)?.key ?? '';
    const uiKey = presentation.artifacts.find((artifact) => artifact.path === `${DIR}/04-UI-SPEC.md`)?.key ?? '';
    const served = (await (await app.request(`/api/documents?route=${encodeURIComponent(planKey)}`)).json()) as DocumentPayload;
    const plan = composePlanNavigator({
      kind: 'plan',
      frontmatter: served.artifact.frontmatter,
      structured: served.artifact.structured,
      groups: [],
      planSegments: [],
      headings: [],
      manualChecks: served.manualChecks,
    });
    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(PlanNavigatorView, { plan: plan!, onShowSource: () => undefined, initialTask: 2 }),
      ),
    );
    expect(markup).toContain('04-UI-SPEC.md · UI Considerations');
    expect(markup).toContain('Overflow · E1 selection bar');
    expect(markup).toContain(`href="${uiKey}"`);
    expect(markup).toContain('When you are done');
  });
});

interface DocumentPayload {
  artifact: { frontmatter: Record<string, unknown>; structured: Record<string, unknown> };
  manualChecks: PlanManualChecks | null;
}

describe('served end to end', () => {
  it('serves the model on the plan document, composes a What to check tab and renders its links', async () => {
    const snapshot = await snapshotOf(studioFiles());
    const app = createApp({ getSnapshot: () => snapshot }, true, '.');
    const presentation = (await (await app.request('/api/presentation')).json()) as ProjectPresentation;
    const key = (path: string): string => {
      const dto = presentation.artifacts.find((artifact) => artifact.path === path);
      if (!dto) throw new Error(`no artifact ${path}`);
      return dto.key;
    };
    const documentOf = async (path: string): Promise<DocumentPayload> =>
      (await (await app.request(`/api/documents?route=${encodeURIComponent(key(path))}`)).json()) as DocumentPayload;

    const served = await documentOf(PLAN);
    expect(served.manualChecks).toEqual(
      buildPlanManualChecks(presentation, buildReferenceRegistry(presentation), PLAN),
    );
    expect((await documentOf(`${DIR}/04-VALIDATION.md`)).manualChecks).toBeNull();

    const input: ViewInput = {
      kind: 'plan',
      frontmatter: served.artifact.frontmatter,
      structured: served.artifact.structured,
      groups: [],
      planSegments: [],
      headings: [],
      manualChecks: served.manualChecks,
    };
    const plan = composePlanNavigator(input);
    const task = plan?.tasks.find((candidate) => candidate.n === 2);
    expect(task?.tabs[0]).toEqual({ key: 'checks', label: 'What to check', count: 6 });
    expect(plan?.tasks.find((candidate) => candidate.n === 1)?.tabs.map((tab) => tab.key)).not.toContain('checks');

    const markup = renderToStaticMarkup(
      createElement(
        MemoryRouter,
        null,
        createElement(PlanNavigatorView, { plan: plan!, onShowSource: () => undefined, initialTask: 2 }),
      ),
    );
    expect(markup).toContain('What to check');
    expect(markup).toContain('Browser/accessibility protocol');
    expect(markup).toContain('04-VALIDATION.md · Manual-Only Verifications');
    expect(markup).toContain(`href="${key(`${DIR}/04-VALIDATION.md`)}"`);
    expect(markup).toContain('Why by hand: ');
  });

  it('the composer drops a crafted url to plain text', () => {
    const crafted = (url: string): ViewInput => ({
      kind: 'plan',
      frontmatter: {},
      structured: {
        plan: {
          tasks: [{ n: 1, anchor: 'a', type: 'auto', gate: null, tdd: false, name: 'T', files: [], fields: {}, sourceChildren: [] }],
        },
      },
      groups: [],
      planSegments: [],
      headings: [],
      manualChecks: {
        total: 1,
        tasks: [
          {
            n: 1,
            count: 1,
            groups: [
              {
                key: 'validation',
                label: 'Checks',
                source: { text: 'x.md · Section', title: null, url },
                lead: null,
                items: [{ title: 'Look', blocks: [], note: null, requirements: [] }],
                links: [],
              },
            ],
          },
        ],
      },
    });
    for (const url of ['//elsewhere', 'javascript:x', '/\\elsewhere', 'https://example.com/']) {
      const plan = composePlanNavigator(crafted(url));
      expect(plan?.tasks[0].checks?.groups[0].source?.url, url).toBeNull();
      const markup = renderToStaticMarkup(
        createElement(MemoryRouter, null, createElement(PlanNavigatorView, { plan: plan!, onShowSource: () => undefined })),
      );
      expect(markup).toContain('view-plan-nav-manual-path');
      expect(markup).not.toContain('href="//elsewhere"');
    }
    const ok = composePlanNavigator(crafted('/artifacts/x'));
    expect(ok?.tasks[0].checks?.groups[0].source?.url).toBe('/artifacts/x');
  });
});
