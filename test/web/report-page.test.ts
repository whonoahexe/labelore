// Phase 11 (11-24, VIEW-18): the report page's composer and the static markup of its page (sketch 059 winner A, the Time
// ruler, one frame for both report kinds), over the made-up Lendshed reports loaded through the repository, plus planted copies
// for the shapes the fixtures lack (a milestone with one requirement not covered, a session report with no headline numbers, a
// milestone with some sections missing, a report with none of the known headings). A report leads with its own numbers in its
// own words; nothing is computed, totalled or re-worded.
import { readFile } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { extractReport } from '../../src/planning-repo/handlers/reports-lift.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import type { DocumentSectionGroup } from '../../src/web/views/document-sections.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import {
  composeReport,
  expandIds,
  isoDaysIn,
  numberBefore,
  phaseCounts,
  splitHeadline,
} from '../../src/web/views/report-page.ts';
import type { ComposedMilestoneReport, ComposedReport, ComposedSessionReport } from '../../src/web/views/report-page.ts';
import { ReportView, reportHeaderProps } from '../../src/web/views/report-page-components.tsx';
import { fxRead, loadFixtureProject } from '../helpers/fixture-project.ts';

const SESSION = '.planning/reports/SESSION_REPORT.md';
const CLEAR = '.planning/reports/20260409-session-report.md';

function inputOf(presentation: ProjectPresentation, path: string, groups: DocumentSectionGroup[] = []): ViewInput {
  const artifact = presentation.artifacts.find((candidate) => candidate.path === path);
  return { kind: 'report', frontmatter: {}, structured: artifact?.structured ?? {}, groups, planSegments: [] };
}

/** A view input whose lift is read from this text, the way the handler reads a file. */
function inputFromText(fileName: string, text: string, groups: DocumentSectionGroup[] = []): ViewInput {
  const lift = extractReport(fileName, {}, text);
  return {
    kind: 'report',
    frontmatter: {},
    structured: lift === null ? {} : { report: lift },
    groups,
    planSegments: [],
  };
}

function escapeText(text: string): string {
  return text.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
}

/** The document's rendered sections for a markdown text: one group per `## ` heading, the body as one paragraph. */
function groupsOf(text: string): DocumentSectionGroup[] {
  const groups: DocumentSectionGroup[] = [];
  let current: { heading: string; lines: string[] } | null = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      if (current !== null) groups.push(groupOf(current));
      current = { heading: line.slice(3).trim(), lines: [] };
    } else if (current !== null) current.lines.push(line);
  }
  if (current !== null) groups.push(groupOf(current));
  return groups;
}

function groupOf(section: { heading: string; lines: string[] }): DocumentSectionGroup {
  return {
    id: null,
    heading: section.heading,
    html: `<h2>${escapeText(section.heading)}</h2><p>${escapeText(section.lines.join('\n').trim())}</p>`,
  };
}

function session(model: ComposedReport | null): ComposedSessionReport {
  expect(model).not.toBeNull();
  expect(model!.variant).toBe('session');
  return model as ComposedSessionReport;
}

function milestone(model: ComposedReport | null): ComposedMilestoneReport {
  expect(model).not.toBeNull();
  expect(model!.variant).toBe('milestone');
  return model as ComposedMilestoneReport;
}

function markup(model: ComposedReport, renderHtml?: (html: string) => React.ReactNode): string {
  return renderToStaticMarkup(createElement(ReportView, { model, renderHtml }));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

/** The text of a `**Label:** value` line of a fixture report. */
function labelled(text: string, label: string): string {
  const line = text.split('\n').find((candidate) => candidate.startsWith(`**${label}:** `));
  expect(line, label).toBeDefined();
  return line!.slice(`**${label}:** `.length).trim();
}

async function lendshed(): Promise<ProjectPresentation> {
  return (await loadFixtureProject()).presentation;
}

/** A numeral as the page prints it: the main text, then the parenthetical (or the chips) when there is one. */
function numeralText(model: ComposedSessionReport, key: string): string {
  const numeral = model.numerals.find((candidate) => candidate.key === key)!;
  const note = numeral.chips.length > 0 ? numeral.chips.join(', ') : numeral.note;
  return note === null ? numeral.main : `${numeral.main} (${note})`;
}

describe('report page: SESSION_REPORT.md, with blockers', () => {
  it('shows the three headline numerals exactly as the file wrote them, and the head', async () => {
    const presentation = await lendshed();
    const model = session(composeReport(inputOf(presentation, SESSION)));
    const text = fxRead('reports/SESSION_REPORT.md');
    expect(model.numerals.map((numeral) => numeral.label)).toEqual(['Duration', 'Commits', 'Plans']);
    expect(numeralText(model, 'duration')).toBe(labelled(text, 'Duration'));
    expect(numeralText(model, 'commits')).toBe(labelled(text, 'Commits Made'));
    expect(numeralText(model, 'plans')).toBe(labelled(text, 'Plans Executed'));
    expect(model.numerals[0]).toMatchObject({ main: '~5 hours', note: 'first commit 2026-03-27 13:42, last commit 2026-03-27 18:51' });
    expect(model.numerals[1]).toMatchObject({ main: '17', note: null });
    expect(model.numerals[2]).toMatchObject({ main: '3', chips: ['01-04', '01-05', '01-06'] });
    expect(model.head).toEqual({
      eyebrow: 'Session report',
      title: 'GSD Session Report',
      generated: '2026-03-28 09:05 +0100',
      context: 'Lendshed · v1.1 — Steward Desk',
    });
    const html = markup(model);
    expect(html).toContain('>Duration<');
    expect(html).toContain('<span class="view-report-numeral" data-long="false">~5 hours</span>');
    expect(html).toContain('<span class="view-report-numeral" data-long="false">17</span>');
    expect(html).toContain('<span class="view-report-numeral" data-long="false">3</span>');
    // Headline numerals are untoned: no status-chip tone near them other than the plan id chips.
    expect(html.slice(0, html.indexOf('>Duration<') + 400)).not.toContain('data-tone="complete"');
  });

  it('draws a 24 hour clock with a bar from the first to the last commit, the stamps read from the Duration note', async () => {
    const presentation = await lendshed();
    const model = session(composeReport(inputOf(presentation, SESSION)));
    expect(model.ruler).toMatchObject({ kind: 'clock', from: '13:42', to: '18:51' });
    const html = markup(model);
    expect(html).toContain('First to last commit · a 24 hour day');
    expect(html).toContain('<i class="view-report-span"');
    expect(html).toContain('>13:42<');
    expect(html).toContain('>18:51<');
  });

  it('reads the phase progress sentence: one cell per phase of the milestone, the first N done, the touched ones ringed', async () => {
    const presentation = await lendshed();
    const model = session(composeReport(inputOf(presentation, SESSION)));
    expect(model.progress).toMatchObject({ done: 1, total: 4 });
    expect(model.progress!.cells!.map((cell) => [cell.label, cell.done, cell.touched])).toEqual([
      ['Phase 1', true, true],
      ['Phase 2', false, true],
      ['Phase 3', false, false],
      ['Phase 4', false, false],
    ]);
    const html = markup(model);
    expect(count(html, 'class="view-report-ph"')).toBe(4);
    expect(count(html, 'data-touched="true"')).toBe(2);
    expect(html).toContain('Phase 1 of 4 is complete, with 6 of 6 plans executed');
  });

  it('lists the seven key outcomes in the file order and the phases touched and the decisions beside them', async () => {
    const presentation = await lendshed();
    const model = session(composeReport(inputOf(presentation, SESSION)));
    expect(model.outcomes).toHaveLength(7);
    expect(model.outcomes[0]!.text).toBe('Sign-in attempts are throttled on two self-clearing counters, one per account name and one per address.');
    expect(model.touched).toHaveLength(2);
    expect(model.decisions.items).toHaveLength(2);
    const html = markup(model);
    expect(count(html, '<ol class="view-report-outcomes">')).toBe(1);
    expect(html.indexOf('>Key outcomes<')).toBeLessThan(html.indexOf('>Phases touched<'));
    expect(html.indexOf('>Phases touched<')).toBeLessThan(html.indexOf('>Decisions<'));
    // Backticked paths are code, never markup.
    expect(html).toContain('<code>/sign-in</code>');
  });

  it('shows three blockers in-flight, the phase tag as a chip and the untagged one as plain text', async () => {
    const presentation = await lendshed();
    const model = session(composeReport(inputOf(presentation, SESSION)));
    expect(model.blockers.map((blocker) => blocker.tag)).toEqual(['Phase 1', 'Phase 1', null]);
    const html = markup(model);
    expect(html).toContain('>Blockers and open items<');
    expect(count(html, '<i class="status-square view-report-sq" data-tone="in-flight"')).toBe(3);
    expect(count(html, '<span class="status-chip" data-tone="in-flight">Phase 1</span>')).toBe(2);
    expect(html).toContain('Spike 004 is still PARTIAL');
    // Blockers come after the outcomes (the right column) and every one is the in-flight tone, never destructive.
    expect(html).not.toContain('destructive');
  });

  it('folds Files Changed and Estimated Resource Usage as closed bars, with the insertions and deletions bar read from the counts', async () => {
    const presentation = await lendshed();
    const model = session(composeReport(inputOf(presentation, SESSION)));
    expect(model.files).toMatchObject({ count: '43 files', insertions: 1206, deletions: 388 });
    expect(model.files!.dirs.map((dir) => dir.path)).toEqual(['src/server/auth/', 'src/web/router/', 'src/web/pages/', 'test/server/']);
    expect(model.usage!.rows).toHaveLength(4);
    const html = markup(model);
    expect(count(html, '<details class="view-report-bar"')).toBe(2);
    expect(html).not.toContain('<details class="view-report-bar" open');
    expect(html).toContain('Files changed');
    expect(html).toContain('Estimated resource usage');
    expect(html).toContain('aria-label="1206 insertions, 388 deletions"');
    expect(html).toContain('43 files changed, 1,206 insertions(+), 388 deletions(-).');
    expect(html).toContain('<td>Subagents spawned</td><td class="view-report-mono">~9</td>');
  });
});

describe('report page: 20260409-session-report.md, no blockers', () => {
  it('keeps "Single session" as written on a dashed empty axis and draws no blockers block', async () => {
    const presentation = await lendshed();
    const model = session(composeReport(inputOf(presentation, CLEAR)));
    expect(model.numerals[0]).toMatchObject({ label: 'Duration', main: 'Single session', note: null });
    expect(numeralText(model, 'duration')).toBe(labelled(fxRead('reports/20260409-session-report.md'), 'Duration'));
    expect(model.ruler).toEqual({ kind: 'none', label: 'No commit stamps in the file', text: 'Single session' });
    expect(model.blockers).toEqual([]);
    const html = markup(model);
    expect(html).toContain('data-ghost="true"');
    expect(html).toContain('>Single session<');
    expect(html).not.toContain('Blockers and open items');
    expect(html).not.toContain('None blocking');
  });

  it("shows the file's own sentence when Decisions Made is prose, and the progress counts it states", async () => {
    const presentation = await lendshed();
    const model = session(composeReport(inputOf(presentation, CLEAR)));
    expect(model.decisions.items).toEqual([]);
    expect(model.decisions.note).toBe('No decisions were added to STATE.md this session.');
    expect(model.progress).toMatchObject({ done: 3, total: 4 });
    expect(model.progress!.cells!.map((cell) => cell.done)).toEqual([true, true, true, false]);
    expect(model.progress!.cells!.filter((cell) => cell.touched).map((cell) => cell.label)).toEqual(['Phase 3']);
    const html = markup(model);
    expect(html).toContain('No decisions were added to STATE.md this session.');
    expect(model.numerals[2]).toMatchObject({ main: '2', chips: ['03-04', '03-05'] });
  });
});

describe('report page: MILESTONE_SUMMARY-v1.0.md', () => {
  const text = fxRead('reports/MILESTONE_SUMMARY-v1.0.md');
  const input = (): ViewInput => inputFromText('MILESTONE_SUMMARY-v1.0.md', text, groupsOf(text));

  it('draws the five stats as the numerals, each as written, and the head', () => {
    const model = milestone(composeReport(input()));
    expect(model.head).toEqual({
      eyebrow: 'Milestone summary',
      title: 'Milestone v1.0 — Project Summary',
      generated: '2026-03-21',
      context: 'Team onboarding and milestone review',
    });
    expect(model.numerals.map((numeral) => numeral.label)).toEqual(['Timeline', 'Phases', 'Commits', 'Files changed', 'Contributors']);
    const stat = (label: string): string => text.split('\n').find((line) => line.startsWith(`- **${label}:** `))!.slice(`- **${label}:** `.length).trim();
    for (const numeral of model.numerals) {
      const written = numeral.note === null ? numeral.main : `${numeral.main} (${numeral.note})`;
      expect(written, numeral.label).toBe(stat(numeral.label));
    }
    const html = markup(model);
    expect(html).toContain('>Commits<');
    expect(html).toContain('>140<');
  });

  it('draws a calendar from the Timeline stat with a numbered mark where each phase was delivered', () => {
    const model = milestone(composeReport(input()));
    expect(model.ruler).toMatchObject({ kind: 'calendar', from: '2026-01-12', to: '2026-03-20' });
    const ruler = model.ruler as Extract<ComposedMilestoneReport['ruler'], { kind: 'calendar' }>;
    expect(ruler.marks.map((mark) => [mark.number, mark.date])).toEqual([
      ['1', '01-30'],
      ['2', '02-14'],
      ['3', '03-03'],
      ['4', '03-20'],
    ]);
    expect(ruler.marks[3]!.edge).toBe('end');
    expect(ruler.months.map((month) => month.name)).toEqual(['Feb', 'Mar']);
    const html = markup(model);
    expect(count(html, 'class="view-report-mark"')).toBe(4);
    expect(count(html, 'class="view-report-md"')).toBe(3);
    expect(html).toContain('Calendar · a mark where each phase was delivered');
  });

  it('shows one delivered row per phase, each complete', () => {
    const model = milestone(composeReport(input()));
    expect(model.phases.map((phase) => [phase.number, phase.name, phase.status, phase.date, phase.tone])).toEqual([
      ['1', 'Member Data Foundation', 'Complete', '2026-01-30', 'complete'],
      ['2', 'Shed Inventory Health', 'Complete', '2026-02-14', 'complete'],
      ['3', 'Catalogue Browsing', 'Complete', '2026-03-03', 'complete'],
      ['4', 'Shed-to-Shed Transfers', 'Complete', '2026-03-20', 'complete'],
    ]);
    const html = markup(model);
    expect(html).toContain('>Phases delivered<');
    expect(count(html, 'class="view-report-drow"')).toBe(4);
    expect(count(html, '<span class="status-chip" data-tone="complete">Complete</span>')).toBe(4);
  });

  it('shows requirements coverage with the marks, ids expanded, and the audit verdict as written', () => {
    const model = milestone(composeReport(input()));
    expect(model.requirements.rows.map((row) => [row.name, row.tone, row.word, row.ids.length, row.phase])).toEqual([
      ['Member records', 'complete', 'Covered', 5, 'Phase 1'],
      ['Shed inventory', 'complete', 'Covered', 5, 'Phase 2'],
      ['Catalogue', 'complete', 'Covered', 5, 'Phase 3'],
      ['Transfers', 'complete', 'Covered', 5, 'Phase 4'],
    ]);
    expect(model.requirements.rows[0]!.ids).toEqual(['MEMB-01', 'MEMB-02', 'MEMB-03', 'MEMB-04', 'MEMB-05']);
    expect(model.requirements.verdict).toBe('tech debt — the milestone meets its intent, with three small items carried forward and none blocking.');
    const html = markup(model);
    expect(html).toContain('>Requirements coverage<');
    expect(count(html, '>Covered<')).toBe(4);
    expect(html).not.toContain('Not covered');
    expect(html).toContain('<strong>Audit verdict:</strong>');
  });

  it('counts decisions per phase from the rows (ids repeat across phases) and lists every row in the file order', () => {
    const model = milestone(composeReport(input()));
    expect(model.decisions.rows).toHaveLength(18);
    expect(model.decisions.bars.map((bar) => [bar.label, bar.count])).toEqual([
      ['Phase 1', 4],
      ['Phase 2', 5],
      ['Phase 3', 4],
      ['Phase 4', 5],
    ]);
    expect(model.decisions.bars[1]!.fill).toBe(1);
    const html = markup(model);
    expect(html).toContain('>Key decisions<');
    expect(html).toContain('Every decision, in the file&#x27;s order');
    expect(count(html, '<td class="view-report-id">D-01</td>')).toBe(4);
  });

  it('keeps all seven numbered sections reachable in order, then Stats; the sections it does not compose stay through the document', () => {
    const rendered: string[] = [];
    const model = milestone(composeReport(input()));
    expect(model.index.map((chip) => [chip.number, chip.label])).toEqual([
      ['1', 'Project Overview'],
      ['2', 'Architecture & Technical Decisions'],
      ['3', 'Phases delivered'],
      ['4', 'Requirements coverage'],
      ['5', 'Key decisions'],
      ['6', 'Tech debt and deferred'],
      ['7', 'Getting Started'],
      ['·', 'Stats'],
    ]);
    const html = markup(model, (section) => {
      rendered.push(typeof section === 'string' ? section : '');
      return null;
    });
    expect(model.bars.map((bar) => bar.number)).toEqual(['1', '2', '7']);
    expect(model.debt).not.toBeNull();
    expect(count(html, '<details class="view-report-bar"')).toBe(4);
    expect(html).toContain('1 · Project Overview');
    expect(html).toContain('7 · Getting Started');
    expect(html).toContain('>Tech debt and deferred<');
    // The chips are real buttons that jump to the section ids the page carries.
    expect(count(html, '<button type="button">')).toBe(8);
    for (const chip of model.index) expect(html, chip.target).toContain(`id="${chip.target}"`);
    // The document's own heading is stripped by the page, the rest of the section goes to the renderer.
    expect(rendered).toHaveLength(4);
  });

  it('shares one frame with the session report: the same card, ruler, columns and bars classes', async () => {
    const presentation = await lendshed();
    const a = markup(session(composeReport(inputOf(presentation, SESSION))));
    const b = markup(milestone(composeReport(input())));
    for (const name of ['view-report-root', 'view-report-card', 'view-report-axis', 'view-report-cols', 'view-report-numeral']) {
      expect(a, name).toContain(name);
      expect(b, name).toContain(name);
    }
  });
});

describe('report page: the sketch-only state, one requirement not covered (planted)', () => {
  it('reads a cross-marked bullet as not covered, quiet, with the words "Not covered"', () => {
    const base = fxRead('reports/MILESTONE_SUMMARY-v1.0.md');
    const covered = '- ✅ **Transfers** — MOVE-01, MOVE-02, MOVE-03, MOVE-04, MOVE-05 (Phase 4)';
    expect(base).toContain(covered);
    const text = base.replace(
      covered,
      '- ✅ **Transfers** — MOVE-01 ... MOVE-04 (Phase 4)\n- ❌ **Transfers** — MOVE-05 (Phase 4)',
    );
    const model = milestone(composeReport(inputFromText('MILESTONE_SUMMARY-v1.0.md', text, groupsOf(text))));
    const rows = model.requirements.rows;
    expect(rows).toHaveLength(5);
    expect(rows[3]).toMatchObject({ tone: 'complete', word: 'Covered', ids: ['MOVE-01', 'MOVE-02', 'MOVE-03', 'MOVE-04'] });
    expect(rows[4]).toMatchObject({ tone: 'quiet', word: 'Not covered', ids: ['MOVE-05'] });
    const html = markup(model);
    expect(count(html, '<span class="status-chip" data-tone="quiet">Not covered</span>')).toBe(1);
    expect(count(html, '>Covered<')).toBe(4);
    // A not-covered requirement is a coverage note, never a failure.
    expect(html).not.toContain('destructive');
    expect(html).not.toContain('data-tone="missing"');
  });

  it('shows a bullet with no mark as untoned words-free quiet', () => {
    const base = fxRead('reports/MILESTONE_SUMMARY-v1.0.md');
    const text = base.replace('- ✅ **Catalogue**', '- **Catalogue**');
    const model = milestone(composeReport(inputFromText('MILESTONE_SUMMARY-v1.0.md', text, groupsOf(text))));
    expect(model.requirements.rows[2]).toMatchObject({ name: 'Catalogue', tone: 'quiet', word: null });
  });
});

describe('report page: edge probe VIEW-18 (11-20): a report with no headline numbers, a milestone missing sections', () => {
  it('draws no numeral and no 0 for a session report whose Session Summary lines are absent, and still shows its outcomes', () => {
    const text = '# GSD Session Report\n\n## Work Performed\n\n### Key Outcomes\n- Shipped the throttle.\n- Wrote the proof.\n';
    const model = session(composeReport(inputFromText('SESSION_REPORT.md', text, groupsOf(text))));
    expect(model.numerals).toEqual([]);
    expect(model.ruler).toBeNull();
    expect(model.progress).toBeNull();
    const html = markup(model);
    expect(html).not.toContain('view-report-numeral');
    expect(html).not.toContain('>0<');
    expect(html).not.toContain('view-report-card');
    expect(html).toContain('Shipped the throttle.');
  });

  it('lists only the numbered sections the file has, inventing none', () => {
    const text = [
      '# Milestone v2.0 — Project Summary',
      '',
      '## 1. Project Overview',
      '',
      'One paragraph.',
      '',
      '## 3. Phases Delivered',
      '',
      '| Phase | Name | Status | One-Liner |',
      '|-------|------|--------|-----------|',
      '| 5 | Reports | Complete (2026-05-02) | Report pages |',
      '',
    ].join('\n');
    const model = milestone(composeReport(inputFromText('MILESTONE_SUMMARY-v2.0.md', text, groupsOf(text))));
    expect(model.index.map((chip) => chip.number)).toEqual(['1', '3']);
    expect(model.requirements.rows).toEqual([]);
    expect(model.decisions.rows).toEqual([]);
    expect(model.numerals).toEqual([]);
    expect(model.ruler).toBeNull();
    const html = markup(model);
    expect(html).not.toContain('Requirements coverage');
    expect(html).not.toContain('Key decisions');
    expect(html).toContain('>Phases delivered<');
  });

  it('a section the lift read no rows for stays reachable through the document, as a plain section', () => {
    const text = '# Milestone v2.0 — Project Summary\n\n## 3. Phases Delivered\n\nNo table was written.\n';
    const model = milestone(composeReport(inputFromText('MILESTONE_SUMMARY-v2.0.md', text, groupsOf(text))));
    expect(model.phases).toEqual([]);
    expect(model.plain).toHaveLength(1);
    expect(model.plain[0]!.title).toBe('Phases Delivered');
  });

  it('a heading the writer added later stays reachable as a closed bar, on both report kinds', () => {
    const text = fxRead('reports/SESSION_REPORT.md') + '\n## Follow-ups\n\nCall the steward.\n';
    const model = session(composeReport(inputFromText('SESSION_REPORT.md', text, groupsOf(text))));
    expect(model.more.map((section) => section.title)).toEqual(['Follow-ups']);
    expect(markup(model, () => null)).toContain('Follow-ups');
  });
});

describe('report page: a report with none of the known headings falls through silently', () => {
  it('composeReport is null for a planted report with none of the headings, and for a missing or unknown lift', () => {
    const text = '# Notes\n\nJust some notes.\n\n## Something else\n\nMore.\n';
    expect(extractReport('SESSION_REPORT.md', {}, text)).toBeNull();
    expect(composeReport(inputFromText('SESSION_REPORT.md', text, groupsOf(text)))).toBeNull();
    expect(composeReport(inputFromText('MILESTONE_SUMMARY-v9.md', text))).toBeNull();
    expect(composeReport({ kind: 'report', frontmatter: {}, structured: {}, groups: [], planSegments: [] })).toBeNull();
    expect(
      composeReport({ kind: 'report', frontmatter: {}, structured: { report: { variant: 'other' } }, groups: [], planSegments: [] }),
    ).toBeNull();
    expect(
      composeReport({ kind: 'report', frontmatter: {}, structured: { report: 'text' }, groups: [], planSegments: [] }),
    ).toBeNull();
  });

  it('does not throw on a lift whose fields are the wrong types', () => {
    const input: ViewInput = {
      kind: 'report',
      frontmatter: {},
      structured: { report: { variant: 'session', duration: 5, outcomes: 'x', blockers: [1, null], filesChanged: 'no', resources: [null] } },
      groups: [],
      planSegments: [],
    };
    expect(() => composeReport(input)).not.toThrow();
  });
});

describe('report page: the header', () => {
  it('gives the eyebrow, the title, the stamp and context as meta and crumbs ending on the file name', async () => {
    const presentation = await lendshed();
    const header = reportHeaderProps(session(composeReport(inputOf(presentation, SESSION))), 'fallback', SESSION);
    expect(header.eyebrow).toBe('Session report');
    expect(header.title).toBe('GSD Session Report');
    expect(header.lead).toBeNull();
    expect(header.crumbs?.map((crumb) => crumb.label)).toEqual(['Dashboard', 'Roadmap', 'SESSION_REPORT']);
    const meta = renderToStaticMarkup(createElement('div', null, header.meta));
    expect(meta).toContain('Generated 2026-03-28 09:05 +0100');
    expect(meta).toContain('Lendshed · v1.1 — Steward Desk');
  });

  it('falls back to the artifact title and the file name stem when the report states neither', () => {
    const model = session(composeReport({ kind: 'report', frontmatter: {}, structured: { report: { variant: 'session', outcomes: ['x'] } }, groups: [], planSegments: [] }));
    const header = reportHeaderProps(model, 'Artifact title', '.planning/reports/SESSION_REPORT.md');
    expect(header.title).toBe('Artifact title');
    expect(renderToStaticMarkup(createElement('div', null, header.meta))).toContain('SESSION_REPORT');
  });
});

describe('report page: the readers', () => {
  it('splitHeadline splits a closing parenthetical that follows a space and nothing else', () => {
    expect(splitHeadline('~5 hours (first commit 13:42)')).toEqual({ main: '~5 hours', note: 'first commit 13:42' });
    expect(splitHeadline('17')).toEqual({ main: '17', note: null });
    expect(splitHeadline('Single session')).toEqual({ main: 'Single session', note: null });
    expect(splitHeadline('9 insertions(+), 1 deletions(-)')).toEqual({ main: '9 insertions(+), 1 deletions(-)', note: null });
    expect(splitHeadline('(only a parenthetical)')).toEqual({ main: '(only a parenthetical)', note: null });
    const text = '3 (01-04, 01-05, 01-06)';
    const { main, note } = splitHeadline(text);
    expect(`${main} (${note})`).toBe(text);
  });

  it('phaseCounts reads "N of the M phases" and does not read plan counts', () => {
    expect(phaseCounts('Phase 1 of 4 is complete, with 6 of 6 plans executed, so 1 of the 4 v1.1 phases (25%) is done.')).toEqual({ done: 1, total: 4 });
    expect(phaseCounts('3 of 5 phases complete')).toEqual({ done: 3, total: 5 });
    expect(phaseCounts('Phase 2 is under way, 6 of 6 plans executed.')).toBeNull();
    expect(phaseCounts('9 of 4 phases')).toBeNull();
    expect(phaseCounts('')).toBeNull();
  });

  it('expandIds expands ranges and lists and keeps text it cannot read', () => {
    expect(expandIds('MEMB-01 ... MEMB-03')).toEqual(['MEMB-01', 'MEMB-02', 'MEMB-03']);
    expect(expandIds('MOVE-01, MOVE-02, MOVE-05')).toEqual(['MOVE-01', 'MOVE-02', 'MOVE-05']);
    expect(expandIds('A-1…A-3')).toEqual(['A-1', 'A-2', 'A-3']);
    expect(expandIds('X-01 ... Y-03')).toEqual(['X-01 ... Y-03']);
    expect(expandIds('X-05 ... X-01')).toEqual(['X-05 ... X-01']);
    expect(expandIds('REQ-01 ... REQ-9999')).toEqual(['REQ-01 ... REQ-9999']);
    expect(expandIds('')).toEqual([]);
  });

  it('numberBefore and isoDaysIn read numbers and days without a pattern', () => {
    expect(numberBefore('43 files changed, 1,206 insertions(+), 388 deletions(-).', 'insertion')).toBe(1206);
    expect(numberBefore('43 files changed, 1,206 insertions(+), 388 deletions(-).', 'deletion')).toBe(388);
    expect(numberBefore('1 file changed', 'file')).toBe(1);
    expect(numberBefore('no counts', 'insertion')).toBeNull();
    expect(isoDaysIn('2026-01-12 → 2026-03-20 (68 days)')).toEqual(['2026-01-12', '2026-03-20']);
    expect(isoDaysIn('Complete (2026-01-30)')).toEqual(['2026-01-30']);
    expect(isoDaysIn('20260130 and 2026-13-45')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The view contract: source-text checks in the thread-page idiom (no AST tooling). Comments are stripped before every
// negative check.
// ---------------------------------------------------------------------------

async function source(path: string): Promise<string> {
  return await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
}

describe('report view contract - the real sources', () => {
  it('records the tone uses and the language bullet in design-language.md', async () => {
    const doc = await source('docs/design-language.md');
    expect(doc).toContain('**The report page.**');
    for (const tone of ['complete', 'in-flight', 'quiet']) {
      const row = doc.split('\n').find((line) => line.startsWith(`| \`${tone}\``))!;
      expect(row, tone).toContain('(Phase 11, 11-24) on the report page');
    }
    const missing = doc.split('\n').find((line) => line.startsWith('| `missing`'))!;
    expect(missing).not.toContain('(Phase 11, 11-24)');
  });
});

// Phase 11 (11-38, G-11-2: L3-WR-02, L3-WR-03): a milestone summary keeps its Stats and debt sections, and every chip lands.
describe('report page: milestone Stats and debt sections are never dropped (11-38, L3-WR-02, L3-WR-03)', () => {
  const PHASE_TABLE = [
    '| Phase | Name | Status | One-Liner |',
    '|-------|------|--------|-----------|',
    '| 5 | Reports | Complete (2026-05-02) | Report pages |',
  ].join('\n');

  function milestoneFrom(text: string): ComposedMilestoneReport {
    return milestone(composeReport(inputFromText('MILESTONE_SUMMARY-v3.0.md', text, groupsOf(text))));
  }

  it('a Stats section the lift read no stat lines from is a closed bar carrying the Stats id, and the Stats chip lands on it', () => {
    const text = `# Milestone v3.0 — Project Summary\n\n## 3. Phases Delivered\n\n${PHASE_TABLE}\n\n## Stats\n\nThe numbers are in the changelog.\n`;
    const model = milestoneFrom(text);
    expect(model.numerals).toEqual([]);
    const bar = model.bars.find((candidate) => candidate.id === model.statsId);
    expect(bar).toBeDefined();
    expect(bar!.html).toContain('The numbers are in the changelog.');
    expect(model.index.filter((chip) => chip.label === 'Stats')).toHaveLength(1);
    const html = markup(model, () => null);
    expect(count(html, `id="${model.statsId}"`)).toBe(1);
    for (const chip of model.index) expect(html, chip.target).toContain(`id="${chip.target}"`);
  });

  it('no Stats section and no stat lines gives no Stats chip', () => {
    const text = `# Milestone v3.0 — Project Summary\n\n## 3. Phases Delivered\n\n${PHASE_TABLE}\n`;
    const model = milestoneFrom(text);
    expect(model.index.some((chip) => chip.label === 'Stats')).toBe(false);
    expect(model.bars.some((bar) => bar.id === model.statsId)).toBe(false);
  });

  it('with the stats read, the card carries the Stats id and no Stats bar exists', () => {
    const text = fxRead('reports/MILESTONE_SUMMARY-v1.0.md');
    const model = milestone(composeReport(inputFromText('MILESTONE_SUMMARY-v1.0.md', text, groupsOf(text))));
    expect(model.bars.some((bar) => bar.id === model.statsId)).toBe(false);
    const html = markup(model, () => null);
    expect(count(html, `id="${model.statsId}"`)).toBe(1);
  });

  it('a section titled "Tech debt and deferred requirements" is the debt section, never the requirements page', () => {
    const text = [
      '# Milestone v3.0 — Project Summary',
      '',
      '## 4. Requirements Coverage',
      '',
      '- ✅ **Reports** — REPT-01, REPT-02 (Phase 5)',
      '',
      '## 7. Tech debt and deferred requirements',
      '',
      'Nothing blocking; two items carried forward.',
      '',
    ].join('\n');
    const model = milestoneFrom(text);
    expect(model.requirements.rows).toHaveLength(1);
    expect(model.anchors.requirements).toBe('view-report-sec-4');
    expect(model.debt).not.toBeNull();
    expect(model.debt!.html).toContain('two items carried forward');
    expect(markup(model, () => null)).toContain('>Tech debt and deferred<');
    const noRows = milestoneFrom('# Milestone v3.0 — Project Summary\n\n## 6. Tech Debt & Deferred Items\n\nOne item.\n');
    expect(noRows.debt).not.toBeNull();
    expect(noRows.plain).toEqual([]);
  });

  it('only the first section of a kind is composed and anchored; a later one is shown as written, never dropped', () => {
    const text = [
      '# Milestone v3.0 — Project Summary',
      '',
      '## 4. Requirements Coverage',
      '',
      '- ✅ **Reports** — REPT-01, REPT-02 (Phase 5)',
      '',
      '## 5. Requirements follow-up',
      '',
      'Second requirements section text.',
      '',
      '## 6. Tech Debt',
      '',
      'First debt text.',
      '',
      '## 7. Tech Debt, continued',
      '',
      'Second debt text.',
      '',
    ].join('\n');
    const model = milestoneFrom(text);
    expect(model.anchors.requirements).toBe('view-report-sec-4');
    expect(model.plain.map((section) => section.id)).toEqual(['view-report-sec-5']);
    expect(model.debt!.html).toContain('First debt text.');
    expect(model.bars.map((bar) => bar.id)).toContain('view-report-sec-7');
    const html = markup(model, (section) => (typeof section === 'string' ? section : null));
    expect(html).toContain('Second requirements section text.');
    expect(html).toContain('Second debt text.');
    expect(html).toContain('First debt text.');
    for (const chip of model.index) expect(html, chip.target).toContain(`id="${chip.target}"`);
  });
});

// Phase 11 (11-38, G-11-2: L3-WR-04): the session report claims only the sections it read.
describe('report page: no session-report section is lost (11-38, L3-WR-04)', () => {
  function sessionFrom(text: string): ComposedSessionReport {
    return session(composeReport(inputFromText('SESSION_REPORT.md', text, groupsOf(text))));
  }

  it("Lendshed's two session reports draw what they drew before: nothing in the closing bars", async () => {
    const presentation = await lendshed();
    for (const path of [SESSION, CLEAR]) {
      const name = path.slice(path.lastIndexOf('/') + 1);
      const text = fxRead(`reports/${name}`);
      const model = sessionFrom(text);
      expect(model.more, name).toEqual([]);
      expect(session(composeReport(inputOf(presentation, path, groupsOf(text)))).more, name).toEqual([]);
    }
  });

  it('a Key Outcomes written as prose is listed under the closing bars with its text', () => {
    const text = '# GSD Session Report\n\n## Key Outcomes\n\nWe shipped the throttle and wrote the proof.\n\n## Decisions Made\n\n- Keep it small.\n';
    const model = sessionFrom(text);
    expect(model.more.map((section) => section.title)).toEqual(['Key Outcomes']);
    expect(model.more[0]!.html).toContain('We shipped the throttle');
    expect(markup(model, (html) => html)).toContain('We shipped the throttle');
  });

  it('a Work Performed whose Key Outcomes could not be read is listed whole; the read groups are not', () => {
    const text = [
      '# GSD Session Report',
      '',
      '## Session Summary',
      '',
      '**Duration:** 2 hours',
      '',
      '## Work Performed',
      '',
      '### Phases Touched',
      '- Phase 1 — sign-in',
      '',
      '### Key Outcomes',
      '',
      'Prose, not bullets.',
      '',
      '## Files Changed',
      '',
      '3 files changed.',
      '',
    ].join('\n');
    const model = sessionFrom(text);
    expect(model.more.map((section) => section.title)).toEqual(['Work Performed']);
  });

  it('a Files Changed, an Estimated Resource Usage and a Session Summary with nothing readable are listed', () => {
    const text = [
      '# GSD Session Report',
      '',
      '## Session Summary',
      '',
      'It went well.',
      '',
      '## Key Outcomes',
      '- One.',
      '',
      '## Files Changed',
      '',
      '## Estimated Resource Usage',
      '',
      'Not measured.',
      '',
    ].join('\n');
    const model = sessionFrom(text);
    expect(model.more.map((section) => section.title)).toEqual(['Session Summary', 'Files Changed', 'Estimated Resource Usage']);
  });

  it('a heading outside the session set is kept as today, and a lift with no unread list reads as all read', () => {
    const text = '# GSD Session Report\n\n## Key Outcomes\n- One.\n\n## Follow-ups\n\nCall the steward.\n';
    expect(sessionFrom(text).more.map((section) => section.title)).toEqual(['Follow-ups']);
    const lift = extractReport('SESSION_REPORT.md', {}, '# GSD Session Report\n\n## Key Outcomes\n\nProse.\n') as unknown as Record<string, unknown>;
    delete lift.unread;
    const input: ViewInput = {
      kind: 'report',
      frontmatter: {},
      structured: { report: lift },
      groups: groupsOf('# GSD Session Report\n\n## Key Outcomes\n\nProse.\n'),
      planSegments: [],
    };
    expect(session(composeReport(input)).more).toEqual([]);
  });
});

describe('report page: the ruler states what the stamps are (11-38, L3-WR-05)', () => {
  function rulerFrom(duration: string): { model: ComposedSessionReport; html: string } {
    const text = `# GSD Session Report\n\n## Session Summary\n\n**Duration:** ${duration}\n`;
    const model = session(composeReport(inputFromText('SESSION_REPORT.md', text, groupsOf(text))));
    return { model, html: markup(model) };
  }

  it('labels a session whose stamps fall on two days as spanning more than one day, with both stamps as text', () => {
    const { model, html } = rulerFrom('~2 hours (first commit 2026-03-27 23:10, last commit 2026-03-28 01:05)');
    expect(model.ruler).toMatchObject({ kind: 'none', label: 'Commit stamps span more than one day' });
    expect(model.ruler).toMatchObject({ stamps: { from: '23:10', to: '01:05' } });
    expect(html).toContain('aria-label="Commit stamps span more than one day"');
    expect(html).not.toContain('No commit stamps in the file');
    expect(html).toContain('23:10');
    expect(html).toContain('01:05');
  });

  it('labels a session that wrapped past midnight on one day the same way', () => {
    const { model, html } = rulerFrom('~15 hours (first commit 18:00, last commit 09:00)');
    expect(model.ruler).toMatchObject({ kind: 'none', label: 'Commit stamps span more than one day' });
    expect(html).toContain('aria-label="Commit stamps span more than one day"');
    expect(html).toContain('18:00');
    expect(html).toContain('09:00');
  });

  it("keeps 'No commit stamps in the file' for a report without two stamps, and the axis says the same", () => {
    const { model, html } = rulerFrom('Single session');
    expect(model.ruler).toMatchObject({ kind: 'none', label: 'No commit stamps in the file' });
    expect(html).toContain('aria-label="No commit stamps in the file"');
    expect(html).not.toContain('Commit stamps span more than one day');
  });
});
