// quick-261006-iz7 (sketch 020 D): the SUMMARY body extractor — pinned against the five sketch docs
// (read from this repo and, when present, the studio-portal checkout; a missing checkout skips its
// files), the headline rule, the task / deviation shapes the corpus uses, the tolerant degrade
// paths, and the T-iz7-01 timing bound. Pinned values were taken from the source files with grep /
// awk, independent of the extractor's own output.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from './helpers/studio-portal.ts';
import { extractSummaryRun, isNoneText, splitHeadline } from '../src/planning-repo/handlers/summary-run.ts';
import { assembleDomainModel } from '../src/planning-repo/assemble.ts';
import { discover } from '../src/planning-repo/discovery.ts';
import { parseWithRegistry } from '../src/planning-repo/registry.ts';
import { WarningCollector } from '../src/planning-repo/warnings.ts';
import { InMemoryPlanningFilesystem } from '../src/planning-fs/in-memory-fs.ts';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';

const LB = new URL('../.planning/', import.meta.url).pathname;
const LB0501 = `${LB}milestones/v1.1-phases/05-per-type-document-views/05-01-SUMMARY.md`;
const LB0X4 = `${LB}milestones/v1.0-quick/260910-0x4-close-every-tech-debt-item-in-planning-v/260910-0x4-SUMMARY.md`;
const LB3US = `${LB}quick/260922-3us-build-sketch-004-b3-folded-chapters-docu/260922-3us-SUMMARY.md`;
const SP0406 = `${SP_PLANNING}/phases/04-bulk-archive-downloads/04-06-SUMMARY.md`;
const SP0101 = `${SP_PLANNING}/phases/01-portal-owned-identity-sessions/01-01-SUMMARY.md`;
const SP0106 = `${SP_PLANNING}/phases/01-portal-owned-identity-sessions/01-06-SUMMARY.md`;
const SP_V10212 = `${SP_PLANNING}/milestones/v1.0-phases/02-storage-health-status/02-12-SUMMARY.md`;

function bodyOf(path: string): string {
  return tryParseFrontmatter(readFileSync(path, 'utf8')).body;
}

function rawBodyOf(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('splitHeadline', () => {
  it('splits at a strong break between 20 and 140 characters, outside code and parentheses', () => {
    const r = splitHeadline('The client-side view registry — `VIEW_KINDS`, ViewManifest and more');
    expect(r.head).toBe('The client-side view registry');
    expect(r.rest).toBe('`VIEW_KINDS`, ViewManifest and more');
  });

  it('does not split on a colon inside backticks or after a digit', () => {
    expect(splitHeadline('Live check confirms `questions: 15 topics: 6` for the log').rest).toBe('');
    expect(splitHeadline('Version 2. 5 things were checked in this very long single clause here ok').rest).toBe('');
  });

  it('falls back to a comma at 40-170 characters and leaves a short item whole', () => {
    const r = splitHeadline('A fairly long first clause that runs past forty characters, then the rest follows');
    expect(r.head).toBe('A fairly long first clause that runs past forty characters');
    expect(r.rest).toBe('Then the rest follows');
    expect(splitHeadline('Short item')).toEqual({ head: 'Short item', rest: '' });
  });
});

describe('isNoneText', () => {
  it('reads None, N/A and nothing as empty and real prose as content', () => {
    expect(isNoneText('None — no external service configuration required.')).toBe(true);
    expect(isNoneText('- N/A')).toBe(true);
    expect(isNoneText('')).toBe(true);
    expect(isNoneText('Nonexistent things happened here')).toBe(false);
    expect(isNoneText('Set the API key.')).toBe(false);
  });
});

describe('extractSummaryRun — 05-01 (labelore, canonical)', () => {
  const run = extractSummaryRun(bodyOf(LB0501));

  it('reads the H1, one-liner and performance', () => {
    expect(run.h1).toBe('Phase 5 Plan 01: Discussion-log view, section-projection extractor, view registry Summary');
    expect(run.oneLiner?.startsWith('A DISCUSSION-LOG document now opens as 15 questions')).toBe(true);
    expect(run.oneLiner?.startsWith('**')).toBe(false);
    expect(run.performance.started).toBe('2026-09-20T20:34:57+05:30 (base commit `7c38a88`)');
    expect(run.performance.duration).toBe('26 min');
  });

  it('splits five accomplishments and finds the tasks', () => {
    expect(run.accomplishments).toHaveLength(5);
    expect(run.accomplishments[1].head).toBe('The client-side view registry');
    expect(run.tasks.map((t) => [t.n, t.hashes, t.kinds])).toEqual([
      [1, ['807003d'], ['feat']],
      [2, ['e4f57d1'], ['feat']],
    ]);
    expect(run.taskSource).toBe('list');
  });

  it('reads no deviations with a note, the self-check, next and the other sections', () => {
    expect(run.deviations?.none).toBe(true);
    expect(run.deviations?.items).toEqual([]);
    expect(run.deviations?.note?.startsWith('plan executed exactly as written')).toBe(true);
    expect(run.selfCheck).toBe('passed');
    expect(run.next).toContain('view-registry seam');
    expect(run.others.map((o) => [o.title, o.none])).toEqual([
      ['Known Stubs', false],
      ['Issues Encountered', true],
    ]);
    expect(run.userSetup).toBeNull();
    expect(run.decisionsBody).toBeNull();
  });

  it('maps every path of a multi-path file bullet to its note', () => {
    const paths = run.fileNotes.map((n) => n.path);
    expect(paths).toContain('src/planning-repo/handlers/section-projection.ts');
    expect(paths).toContain('test/web/view-page-contract.test.ts');
    expect(run.fileNotes.find((n) => n.path === 'test/section-projection.test.ts')?.note).toBe('new unit/contract suites');
    expect(run.fileNotes).toHaveLength(15);
  });

  it('keeps a ledger of every section and what it claimed', () => {
    expect(run.sections.map((s) => s.heading)).toContain('Accomplishments');
    expect(run.sections.find((s) => s.heading === 'Known Stubs')?.claimed).toBe(false);
    expect(run.sections.find((s) => s.heading === 'Performance')?.claimed).toBe(true);
  });
});

describe('extractSummaryRun — labelore quick shapes', () => {
  it('0x4: no task list, five deviations and the out-of-scope extra', () => {
    const run = extractSummaryRun(bodyOf(LB0X4));
    expect(run.h1).toBe('Quick Task 260910-0x4: Close Every Tech-Debt Item Summary');
    expect(run.tasks).toEqual([]);
    expect(run.deviations?.items).toHaveLength(5);
    expect(run.deviations?.items.map((d) => d.rule)).toEqual([1, 3, 1, 1, 1]);
    expect(run.deviations?.extras.map((e) => e.title)).toEqual(['Out-of-Scope (Not Fixed — Logged)']);
    expect(run.others.filter((o) => !o.none).map((o) => o.title)).toEqual(['Fourteen-Item Outcome Table', 'Note on STATE.md']);
    expect(run.accomplishments).toEqual([]);
  });

  it('3us: tasks from the table with names and short hashes, deviations in bullet form', () => {
    const run = extractSummaryRun(bodyOf(LB3US));
    expect(run.tasks.map((t) => [t.n, t.hashes[0], t.name?.slice(0, 18)])).toEqual([
      [1, 'b51fca1', 'Shared B3 layout e'],
      [2, '596b417', 'PLAN and VERIFICAT'],
      [3, 'ed62ee0', 'Full e2e coverage,'],
    ]);
    expect(run.taskSource).toBe('table');
    expect(run.deviations?.items.map((d) => [d.rule, d.type, d.title, d.found])).toEqual([
      [1, 'bug', 'Item chips overflowed at 420px', null],
      [3, 'blocking', 'Stale fixture paths', null],
    ]);
    expect(run.deviations?.items[0].text).toContain('The e2e run showed');
    expect(run.selfCheck).toBeNull();
    expect(run.others.map((o) => o.title)).toEqual(['Verification', 'Human check (pending)']);
  });
});

describe.runIf(existsSync(SP_PLANNING))('extractSummaryRun — studio-portal shapes', () => {
  it('0101: a three-kind task, three tasks, five rule-tagged deviations with Verification fields', () => {
    const run = extractSummaryRun(bodyOf(SP0101));
    expect(run.tasks.map((t) => [t.n, t.hashes, t.kinds])).toEqual([
      [1, ['dd2cb83'], ['feat', 'tracer', 'tdd']],
      [2, ['ab6c6cb'], ['test']],
      [3, ['c5b6960'], ['test']],
    ]);
    const devs = run.deviations?.items ?? [];
    expect(devs.map((d) => d.rule)).toEqual([3, 1, 3, 2, 3]);
    expect(devs.map((d) => d.found?.split(',')[0])).toEqual(['Task 1', 'Task 1', 'Task 1', 'Task 1', 'Task 3']);
    expect(devs[0].fix).toContain('rand_core');
    expect(devs[0].commit).toBe('dd2cb83');
    expect(devs[0].others.map((o) => o.label)).toEqual(['Verification']);
    expect(run.others.map((o) => o.title)).toEqual(['Issues Encountered']);
  });

  it('0406: a task table, two deviations, extras, a pending human section', () => {
    const run = extractSummaryRun(bodyOf(SP0406));
    expect(run.tasks.map((t) => [t.n, t.hashes[0]])).toEqual([[1, '07006bf'], [2, '251b946']]);
    expect(run.deviations?.items).toHaveLength(2);
    expect(run.deviations?.extras.map((e) => e.title)).toEqual(["Files touched outside the plan's declared list", 'New copy not in the UI-SPEC']);
    const titles = run.others.map((o) => o.title);
    expect(titles).toContain('What Was Built');
    expect(titles).toContain('Task 3 — Pending Human Verification');
    expect(run.accomplishments).toEqual([]);
  });

  it('01-06: the malformed frontmatter block is skipped so the H1 is the real title', () => {
    const run = extractSummaryRun(rawBodyOf(SP0106));
    expect(run.h1).toBe('Phase 01 Plan 06: Change-password, NavShell identity, Access cutover — Summary');
  });

  it('02-12 (no frontmatter): preamble facts give the status and the commits as tasks', () => {
    if (!existsSync(SP_V10212)) return;
    const run = extractSummaryRun(rawBodyOf(SP_V10212));
    expect(run.preamble.find((f) => f.key === 'Status')?.value).toBe('Complete. 2/2 tasks.');
    expect(run.tasks.map((t) => [t.n, t.hashes[0]])).toEqual([[1, 'b711c0c'], [2, 'b7ae802']]);
    expect(run.taskSource).toBe('preamble');
  });
});

describe('extractSummaryRun — task and deviation shapes', () => {
  it('reads two hashes with their parentheticals, a hashless line, and ignores plan metadata', () => {
    const run = extractSummaryRun(
      [
        '# T',
        '',
        '## Task Commits',
        '',
        '1. **Task 1: First** - `abc1234` (test, RED) → `def5678` (feat, GREEN)',
        '2. **Task 2: No hash yet** - pending',
        '3. **Task 3: Third** — `1234567`',
        '4. **Plan metadata:** `aaaaaaa` (docs)',
      ].join('\n'),
    );
    expect(run.tasks.map((t) => [t.n, t.hashes, t.kinds])).toEqual([
      [1, ['abc1234', 'def5678'], ['test', 'RED', 'feat', 'GREEN']],
      [3, ['1234567'], []],
    ]);
  });

  it('keeps a second task-shaped section as an ordinary section', () => {
    const run = extractSummaryRun('# T\n\n## Commits\n\n1. **Task 1: A** - `abc1234`\n\n## Tasks\n\nSome prose here.\n');
    expect(run.tasks).toHaveLength(1);
    expect(run.others.map((o) => o.title)).toEqual(['Tasks']);
    expect(run.sections.find((s) => s.heading === 'Tasks')?.claimed).toBe(false);
  });

  it('reads the four header spellings and the field set', () => {
    const body = [
      '# T',
      '',
      '## Deviations from Plan',
      '',
      '### Auto-fixed Issues',
      '',
      '**1. [Rule 1 - Bug] First `thing`**',
      '- **Found during:** Task 2, writing it',
      '- **Issue:** It broke.',
      '- **Fix:** Fixed it.',
      '- **Files modified:** `a.ts`, `b.ts`',
      '- **Verification:** ran it',
      '- **Commit:** `abc1234`',
      '',
      '2. **[Rule 3 – blocker] Second title.** Prose after the title',
      '   continues here.',
      '',
      '- **[RULE 2 — Missing] Third:** body of the third',
      '',
      '**Total deviations:** 3 auto-fixed',
      '',
      '### Another list',
      '',
      'Some words.',
    ].join('\n');
    const run = extractSummaryRun(body);
    const devs = run.deviations?.items ?? [];
    expect(devs.map((d) => [d.rule, d.type, d.title])).toEqual([
      [1, 'Bug', 'First `thing`'],
      [3, 'blocker', 'Second title'],
      [2, 'Missing', 'Third'],
    ]);
    expect(devs[0]).toMatchObject({ found: 'Task 2, writing it', issue: 'It broke.', fix: 'Fixed it.', files: 'a.ts, b.ts', commit: 'abc1234', text: null });
    expect(devs[0].others).toEqual([{ label: 'Verification', value: 'ran it' }]);
    expect(devs[1].text).toBe('Prose after the title continues here.');
    expect(run.deviations?.extras.map((e) => e.title)).toEqual(['Another list']);
  });

  it('keeps prose of a deviations section that is neither none nor rule-tagged', () => {
    const run = extractSummaryRun('# T\n\n## Deviations\n\nThe plan changed twice in ways nobody wrote down.\n');
    expect(run.deviations?.none).toBe(false);
    expect(run.deviations?.items).toEqual([]);
    expect(run.deviations?.prose).toHaveLength(1);
  });

  it('reads a Commits preamble fact into tasks and key-value-only paragraphs into facts', () => {
    const run = extractSummaryRun('# T\n\n**Status:** Complete. 2/2 tasks.\n**Commits:** `b711c0c` (Task 1), `b7ae802` (Task 2).\n\nThe real one-liner.\n\n## What changed\n\nStuff.\n');
    expect(run.preamble.map((f) => f.key)).toEqual(['Status', 'Commits']);
    expect(run.oneLiner).toBe('The real one-liner.');
    expect(run.tasks.map((t) => [t.n, t.hashes[0]])).toEqual([[1, 'b711c0c'], [2, 'b7ae802']]);
  });

  it('drops the footer rule and italic stamp from the last section', () => {
    const run = extractSummaryRun('# T\n\n## Note\n\nBody here.\n\n---\n*Phase: x*\n*Completed: y*\n');
    const note = run.others[0];
    expect(note.blocks).toEqual([{ kind: 'paragraph', text: 'Body here.' }]);
  });
});

describe('extractSummaryRun — degrade paths', () => {
  it('returns empty arrays for an empty body and for a body with only a frontmatter block', () => {
    for (const body of ['', '---\nphase: x\n---\n', '---\nunclosed: true\n']) {
      const run = extractSummaryRun(body);
      expect(run.accomplishments).toEqual([]);
      expect(run.tasks).toEqual([]);
      expect(run.others).toEqual([]);
    }
  });

  it('survives an unclosed fence, a hashless task line, an unclosed [Rule and a table with no Commit column', () => {
    const body = [
      '# T',
      '',
      '## Task Commits',
      '',
      '1. **Task 1: x**',
      '',
      '| a | b |',
      '|---|---|',
      '| 1 | 2 |',
      '',
      '## Deviations from Plan',
      '',
      '**1. [Rule 2 - broken title',
      '- **Found during:** Task 1',
      '',
      '## Other',
      '',
      '```',
      'never closed',
    ].join('\n');
    expect(() => extractSummaryRun(body)).not.toThrow();
    const run = extractSummaryRun(body);
    expect(run.tasks).toEqual([]);
    expect(run.deviations?.items).toEqual([]);
  });

  it('extracts a 1 MB body holding a 200k-character hostile line within 250 ms', () => {
    const hostile = '`*[Rule '.repeat(25000);
    expect(hostile.length).toBeGreaterThanOrEqual(200000);
    const filler = 'x'.repeat(79) + '\n';
    const body = `# T\n\n## Accomplishments\n\n- ${hostile}\n\n## Deviations from Plan\n\n**1. [Rule 1 - ${hostile}**\n\n## Task Commits\n\n1. **${hostile}** \`abc1234\`\n\n${filler.repeat(9000)}`;
    expect(body.length).toBeGreaterThan(900000);
    const start = performance.now();
    const run = extractSummaryRun(body);
    const elapsed = performance.now() - start;
    expect(run.sections.length).toBe(3);
    expect(elapsed).toBeLessThan(250);
  });

  it('caps a hostile list so the model cannot grow without bound', () => {
    const body = `# T\n\n## Accomplishments\n\n${'- item one\n'.repeat(5000)}`;
    expect(extractSummaryRun(body).accomplishments.length).toBeLessThanOrEqual(500);
  });
});

describe('RequirementsHandler invariant — project.requirements reads only the root file', () => {
  it('keeps project.requirements root-only when archived snapshots parse too', async () => {
    const files: Record<string, string> = {
      '.planning/REQUIREMENTS.md': '# Requirements: Demo\n\n## v1 Requirements\n\n### Category\n\n- [ ] **AUTH-01**: Root text\n',
      '.planning/milestones/v1.0-REQUIREMENTS.md': '# Requirements: Demo\n\n## v1 Requirements\n\n### Category\n\n- [x] **OLD-01**: Archived text\n- [x] **AUTH-01**: Archived copy\n',
      '.planning/ROADMAP.md': '# Roadmap: Demo\n\n### Phase 1: Foundation\n**Goal**: Ship it\n**Requirements**: [AUTH-01]\n',
      '.planning/phases/01-foundation/01-CONTEXT.md': '<domain>x</domain>',
    };
    const fs = new InMemoryPlanningFilesystem(files);
    const warnings = new WarningCollector();
    const { refs } = await discover(fs);
    const parsed = await Promise.all(refs.map((r) => parseWithRegistry(fs, r, warnings)));
    const archived = parsed.find((p) => p.ref.path === '.planning/milestones/v1.0-REQUIREMENTS.md');
    expect((archived?.structured.items as { id: string }[]).map((i) => i.id)).toEqual(['OLD-01', 'AUTH-01']);
    const project = assembleDomainModel(parsed, warnings, '/project');
    expect(project.requirements.map((r) => [r.id, r.text])).toEqual([['AUTH-01', 'Root text']]);
  });
});
