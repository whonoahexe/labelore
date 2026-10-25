// quick-261023-61k: the todo file projection. Every sketch todo is read as a file (byte-equal to the
// sketch's own data.js) through the real frontmatter parse, and the numbers pinned here come from the
// sketch's rendering and data, never from this extractor's own output. The degrade cases follow the
// debug-session idiom: no string makes the extractor throw, and a hostile 1 MB body stays fast.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tryParseFrontmatter } from '../src/planning-repo/frontmatter.ts';
import { extractTodoFile, levelOf, stampText } from '../src/planning-repo/handlers/todo-file.ts';
import type { TodoBlock, TodoFileBody } from '../src/planning-repo/handlers/todo-file.ts';
import { severityOf } from '../src/server/dashboard-ledger.ts';
import { LB_ROOT, TODO_KEYS, readKeyed } from './helpers/todo-corpus.ts';

function read(key: string): TodoFileBody {
  const file = TODO_KEYS[key];
  const fm = tryParseFrontmatter(readKeyed(file));
  return extractTodoFile({ body: fm.body, frontmatter: fm.data, path: file.path });
}

function textOf(blocks: TodoBlock[] | undefined): string {
  return (blocks ?? [])
    .map((block) => {
      if (block.kind === 'paragraph' || block.kind === 'code' || block.kind === 'heading' || block.kind === 'quote') return block.text;
      if (block.kind === 'list') return block.items.join(' ');
      if (block.kind === 'checklist') return block.items.map((item) => item.text).join(' ');
      return '';
    })
    .join(' ');
}

function extract(body: string, frontmatter: Record<string, unknown> = {}, path = '.planning/todos/pending/x.md'): TodoFileBody {
  return extractTodoFile({ body, frontmatter, path });
}

describe('extractTodoFile on the sketch todos', () => {
  const pinned: Record<
    string,
    {
      status: string;
      folder: string;
      created: string;
      level: string;
      severity: string | null;
      priority: string | null;
      area: string | null;
      theme: string | null;
    }
  > = {
    dcrop: { status: 'done', folder: 'completed', created: '2026-03-24T09:47:31.208Z', level: 'low', severity: 'minor', priority: 'low', area: 'media', theme: null },
    dsfx: { status: 'done', folder: 'completed', created: '2026-10-20T12:09:13.550Z', level: 'low', severity: 'cosmetic', priority: null, area: 'ui', theme: null },
    dcall: { status: 'done', folder: 'completed', created: '2026-10-20T12:09:13.550Z', level: 'high', severity: 'major', priority: null, area: 'calls', theme: null },
    sretry: { status: 'pending', folder: 'pending', created: '2026-10-12T09:41:00.000Z', level: 'high', severity: 'major', priority: null, area: 'gateway', theme: null },
    srec: { status: 'pending', folder: 'pending', created: '2026-10-15T16:02:00.000Z', level: 'low', severity: 'minor', priority: null, area: 'reporting', theme: null },
    star: { status: 'pending', folder: 'pending', created: '2026-10-16', level: 'medium', severity: null, priority: 'P2', area: null, theme: 'general' },
    sport: { status: 'done', folder: 'completed', created: '2026-10-02T10:00:00.000Z', level: 'low', severity: 'minor', priority: null, area: 'data', theme: null },
    pcheck: { status: 'pending', folder: 'pending', created: '2026-10-23', level: 'high', severity: null, priority: 'high', area: null, theme: null },
    pdev: { status: 'done', folder: 'completed', created: '2026-10-23', level: 'medium', severity: null, priority: 'medium', area: null, theme: null },
    lfig: { status: 'pending', folder: 'pending', created: '2026-09-29', level: 'medium', severity: null, priority: 'medium', area: null, theme: null },
    ldrift: { status: 'done', folder: 'done', created: '2026-09-20', level: 'medium', severity: null, priority: 'medium', area: null, theme: null },
  };
  for (const [key, want] of Object.entries(pinned)) {
    it(`${key}: status, folder, created, weight and area`, () => {
      expect(read(key)).toMatchObject(want);
    });
  }

  it('splits files into path and line range', () => {
    expect(read('sretry').files).toEqual([
      { raw: 'src/gateway/retry-queue.ts:88-140', dir: 'src/gateway/', name: 'retry-queue.ts', from: 88, to: 140 },
      { raw: 'src/web/pages/filings.tsx', dir: 'src/web/pages/', name: 'filings.tsx', from: null, to: null },
    ]);
    expect(read('dcrop').files.map((file) => file.raw)).toEqual([
      'api/src/photos/resize.ts',
      'api/src/photos/avatar.ts',
      'api/src/photos/routes.ts',
      'web/public/push-worker.js',
      'web/components/tray/photo-tray.tsx',
    ]);
    expect(read('dsfx').files).toHaveLength(1);
    expect(read('dcall').files).toHaveLength(3);
    expect(read('sport').files).toEqual([]);
  });

  it('reads the lead and the plan', () => {
    expect(read('dcrop').lead?.heading).toBe('Problem');
    expect(textOf(read('dcrop').lead?.blocks)).toMatch(/^Tool photos can't be cropped/);
    expect(read('dcrop').plan).toMatchObject({ kind: 'solution', heading: 'Solution', checks: null });
    expect(read('sretry').plan?.kind).toBe('solution');
    expect(read('srec').lead?.heading).toBe('Problem');
    expect(read('srec').plan).toBeNull();
    expect(read('star').lead?.heading).toBe('Goal');
    expect(read('star').plan).toBeNull();
    expect(read('sport').lead).toBeNull();
    expect(read('sport').plan).toBeNull();

    const pcheck = read('pcheck');
    expect(pcheck.lead?.heading).toBeNull();
    expect(textOf(pcheck.lead?.blocks)).toMatch(/^Do these before the Studio Media Workflow milestone/);
    expect(pcheck.plan).toMatchObject({ kind: 'checklist', heading: null, checks: { done: 0, total: 4 } });
    expect(pcheck.plan?.blocks).toHaveLength(1);
    expect(pcheck.plan?.blocks[0].kind).toBe('checklist');
    expect(pcheck.extras).toEqual([]);

    expect(textOf(read('pdev').lead?.blocks)).toMatch(/^On 2026-10-22 the vault SSD was unplugged while still mounted\./);
    expect(textOf(read('lfig').lead?.blocks)).toMatch(/^Sketch 009's winners, \*\*Diagram B \(Lifted\)\*\*/);
    expect(textOf(read('ldrift').lead?.blocks)).toMatch(/^`ArtifactPage` and `PlanPairPage` maintain a second, parallel page-frame system/);
  });

  it('keeps every other section in order, leftover prose first as Details', () => {
    expect(read('dcrop').extras).toEqual([]);
    expect(read('pdev').extras.map((extra) => extra.heading)).toEqual(['Details']);
    expect(read('lfig').extras.map((extra) => extra.heading)).toEqual(['Details']);
    expect(read('pdev').extras[0].sourceHeading).toBeNull();
    expect(read('ldrift').extras.map((extra) => extra.heading)).toEqual([
      '1. The container changes mid-load (visible reflow)',
      '2. The two frames have drifted on three axes',
      'Scope',
      'Why it is its own task',
    ]);
    expect(read('ldrift').extras[0].sourceHeading).toBe('1. The container changes mid-load (visible reflow)');
  });

  it('reads the closing, the quick task, the commits and the closed-on day', () => {
    const dcrop = read('dcrop');
    expect(dcrop.closing?.from).toBe('resolution');
    expect(dcrop.closing?.text).toMatch(/^Done in quick task 260326-m3d \(2026-03-26\)\. What shipped:/);
    expect(dcrop.quickTask).toBe('260326-m3d');
    expect(dcrop.closedOn).toBe('2026-03-26');
    expect(dcrop.commits).toEqual([]);
    const dsfx = read('dsfx');
    expect(dsfx.closing?.text).toMatch(/^Done in quick task 261022-4gf\. Per the user, there is no Sounds on\/off switch/);
    expect(dsfx.quickTask).toBe('261022-4gf');
    expect(dsfx.closedOn).toBe('2026-10-22');

    const ldrift = read('ldrift');
    expect(ldrift.closing?.from).toBe('callout');
    expect(ldrift.closing?.text).toMatch(/^\*\*Closed 2026-09-20\.\*\* Execution found a fourth drift axis this note missed/);
    expect(ldrift.quickTask).toBe('260920-mzr');
    expect(ldrift.commits).toEqual(['cc92a07', '4934254', '84c402d']);
    expect(ldrift.closedOn).toBe('2026-09-20');
    expect(ldrift.completed).toBe('2026-09-20');
    expect(ldrift.completedBy).toMatch(/^quick task 260920-mzr/);

    for (const key of ['dcall', 'sport', 'pdev']) {
      const todo = read(key);
      expect(todo.closing).toBeNull();
      expect(todo.quickTask).toBeNull();
      expect(todo.closedOn).toBeNull();
    }
    for (const key of ['sretry', 'srec', 'star', 'pcheck', 'lfig']) expect(read(key).closing).toBeNull();
  });

  it('collects the note references', () => {
    expect(read('dcrop').noteRefs).toEqual({
      listed: ['.planning/notes/2026-03-24-crop-tool-photos-and-member-avatars.md', '.planning/notes/2026-03-24-round-member-avatars.md'],
      wiki: [],
      mentioned: [],
      promotedText: null,
    });
    expect(read('dsfx').noteRefs.listed).toHaveLength(1);
    expect(read('dcall').noteRefs.listed).toHaveLength(1);
    for (const key of ['pcheck', 'pdev']) {
      expect(read(key).noteRefs).toEqual({
        listed: [],
        wiki: [],
        mentioned: ['.planning/notes/2026-10-23-studio-media-workflow-milestone-brief.md'],
        promotedText: null,
      });
    }
    expect(read('ldrift').noteRefs.wiki).toEqual(['per-kind-artifact-rendering']);
    expect(read('star').noteRefs.promotedText).toBe("show the tariff schedule's own notes as tooltips on HS codes");
    expect(read('star').noteRefs.listed).toEqual([]);
    for (const key of ['sretry', 'srec', 'sport', 'lfig']) {
      expect(read(key).noteRefs).toEqual({ listed: [], wiki: [], mentioned: [], promotedText: null });
    }
  });

  const live = join(LB_ROOT, '.planning/todos/pending/001-sketches-page-in-labelore.md');
  it.runIf(existsSync(live))("reads labelore's own promoted todo (001)", () => {
    const fm = tryParseFrontmatter(readFileSync(live, 'utf8'));
    const todo = extractTodoFile({ body: fm.body, frontmatter: fm.data, path: '.planning/todos/pending/001-sketches-page-in-labelore.md' });
    expect(todo).toMatchObject({ status: 'pending', created: '2026-10-23', level: 'medium', priority: 'P2', theme: 'general' });
    expect(todo.lead?.heading).toBe('Goal');
    expect(todo.plan).toMatchObject({ kind: 'acceptance', checks: { done: 5, total: 7 } });
    expect(todo.extras.map((extra) => extra.heading)).toEqual(['Context', 'Progress']);
    expect(todo.noteRefs.promotedText).toHaveLength(1686);
    expect(todo.noteRefs.mentioned).toContain('.planning/notes/2026-10-23-sketches-page-in-labelore.md');
  });
});

describe('stampText', () => {
  it('turns a midnight-UTC date into a day and keeps an instant whole', () => {
    expect(stampText(new Date('2026-09-29T00:00:00.000Z'))).toBe('2026-09-29');
    expect(stampText(new Date('2026-10-21T10:31:14.064Z'))).toBe('2026-10-21T10:31:14.064Z');
    expect(stampText('  2026-10-21 15:58 ')).toBe('2026-10-21 15:58');
    expect(stampText(7)).toBe('7');
  });

  it('gives null for anything else', () => {
    for (const value of ['', '   ', null, undefined, Number.NaN, {}, [], true, new Date(Number.NaN)]) {
      expect(stampText(value)).toBeNull();
    }
  });
});

describe('the severity table agrees with the dashboard ledger', () => {
  it('names the same levels for every word it knows', () => {
    const words = ['blocker', 'critical', 'major', 'high', 'p0', 'p1', 'medium', 'moderate', 'normal', 'p2', 'minor', 'low', 'cosmetic', 'trivial', 'p3', 'p4', 'MAJOR', 'P2', 'urgent', '', null];
    for (const word of words) expect(levelOf(word), String(word)).toBe(severityOf(word));
  });
});

describe('extractTodoFile degrades', () => {
  it('gives a todo with nothing in it for an empty or frontmatter-only string', () => {
    for (const body of ['', '---\ntitle: x\n---\n', '\n\n  \n']) {
      const todo = extract(body);
      expect(todo.lead).toBeNull();
      expect(todo.plan).toBeNull();
      expect(todo.extras).toEqual([]);
      expect(todo.closing).toBeNull();
    }
  });

  it('skips a frontmatter block that did not parse', () => {
    const todo = extract('---\ntitle: [oops\n---\n\nSome words here.\n');
    expect(textOf(todo.lead?.blocks)).toBe('Some words here.');
  });

  it('does not read a heading inside a fence as a section', () => {
    const todo = extract('## Problem\n\nText\n\n```\n## Not a section\nmore\n```\n\n## Solution\n\nDo it\n');
    expect(todo.lead?.blocks.map((block) => block.kind)).toEqual(['paragraph', 'code']);
    expect(todo.plan?.kind).toBe('solution');
    expect(todo.extras).toEqual([]);
  });

  it('survives an unclosed fence', () => {
    const todo = extract('## Problem\n\nText\n\n```\n## Still code\n- [ ] item\n');
    expect(todo.lead?.blocks.at(-1)?.kind).toBe('code');
    expect(todo.extras).toEqual([]);
  });

  it('keeps a quote that says nothing about closing in the preamble', () => {
    const todo = extract('> Remember to be kind.\n\nSome words.\n');
    expect(todo.closing).toBeNull();
    expect(todo.extras.flatMap((extra) => extra.blocks.map((block) => block.kind))).toContain('quote');
  });

  it('takes a leading closing quote as the closing, and a Resolution section over it', () => {
    const callout = extract('> **Closed 2026-01-02.** Shipped in quick 260102-abc.\n\n# Title\n\nWords.\n');
    expect(callout.closing?.from).toBe('callout');
    expect(callout.quickTask).toBe('260102-abc');
    expect(callout.closedOn).toBe('2026-01-02');
    expect(textOf(callout.lead?.blocks)).toBe('Words.');
    const both = extract('> Closed already.\n\nWords.\n\n## Resolution\n\nDone in quick 260103-xyz.\n');
    expect(both.closing?.from).toBe('resolution');
    expect(both.quickTask).toBe('260103-xyz');
    expect(both.extras.flatMap((extra) => extra.blocks.map((block) => block.kind))).toContain('quote');
  });

  it('reads a mixed checklist as a plain list, and a pure one as a checklist', () => {
    const mixed = extract('## Goal\n\nx\n\n## Acceptance Criteria\n\n- [ ] one\n- two\n');
    expect(mixed.plan?.blocks[0].kind).toBe('list');
    expect(mixed.plan?.checks).toEqual({ done: 0, total: 1 });
    const pure = extract('## Goal\n\nx\n\n## Acceptance Criteria\n\n- [x] one\n* [ ] two\n- [X] three\n');
    expect(pure.plan?.blocks[0]).toEqual({
      kind: 'checklist',
      items: [
        { done: true, text: 'one' },
        { done: false, text: 'two' },
        { done: true, text: 'three' },
      ],
    });
    expect(pure.plan?.checks).toEqual({ done: 2, total: 3 });
  });

  it('shows the first extra open work to the composer: no lead, no plan, extras stay in order', () => {
    const todo = extract('## Notes\n\nSome.\n\n## More\n\nOther.\n');
    expect(todo.lead).toBeNull();
    expect(todo.plan).toBeNull();
    expect(todo.extras.map((extra) => extra.heading)).toEqual(['Notes', 'More']);
  });

  it('keeps preamble prose as Details beside a Problem section', () => {
    const todo = extract('Context before the problem.\n\n## Problem\n\nIt breaks.\n');
    expect(todo.lead?.heading).toBe('Problem');
    expect(todo.extras.map((extra) => extra.heading)).toEqual(['Details']);
  });

  it('survives odd frontmatter values', () => {
    const junk: Record<string, unknown>[] = [
      { files: 3 },
      { files: { a: 1 } },
      { files: [null, 4, '', '  ', ['x']] },
      { notes: 'notes/a.md' },
      { notes: ['../outside.md', 'notes\\x.md', '.planning/notes/a/../b.md', 5, null, '.planning/notes/ok.md'] },
      { created: 12345 },
      { created: 'soon' },
      { created: {} },
      { severity: [], priority: {}, area: 4, completed_by: ['x'], source: false },
      { title: null, notes: null, files: null },
    ];
    for (const frontmatter of junk) expect(() => extract('## Problem\n\nx\n', frontmatter)).not.toThrow();
    expect(extract('', { files: 3 }).files).toEqual([]);
    expect(extract('', { files: { a: 1 } }).files).toEqual([]);
    expect(extract('', { files: 'src/a.ts:5' }).files).toEqual([{ raw: 'src/a.ts:5', dir: 'src/', name: 'a.ts', from: 5, to: 5 }]);
    expect(extract('', { notes: 'notes/a.md' }).noteRefs.listed).toEqual(['.planning/notes/a.md']);
    expect(extract('', { notes: ['../outside.md', 'notes\\x.md', '.planning/notes/a/../b.md', 5, null, './notes/ok.md'] }).noteRefs.listed).toEqual([
      '.planning/notes/ok.md',
    ]);
    expect(extract('', { created: 12345 }).created).toBe('12345');
    expect(extract('', { created: 'soon' }).created).toBe('soon');
    expect(extract('', { created: {} }).created).toBeNull();
  });

  it('reads file ranges only in their exact shape', () => {
    const files = (entry: string) => extract('', { files: [entry] }).files[0];
    expect(files('a/b.ts:3')).toMatchObject({ dir: 'a/', name: 'b.ts', from: 3, to: 3 });
    expect(files('a/b.ts:3-9')).toMatchObject({ name: 'b.ts', from: 3, to: 9 });
    expect(files('a/b-9.ts')).toMatchObject({ name: 'b-9.ts', from: null });
    expect(files('b.ts:')).toMatchObject({ name: 'b.ts:', from: null });
    expect(files('b.ts:3-')).toMatchObject({ name: 'b.ts:3-', from: null });
    expect(files('b.ts:1-2-3')).toMatchObject({ from: null });
    expect(files('dir/')).toMatchObject({ from: null });
  });

  it('finds note references only where they stand alone, and not inside a fence', () => {
    const todo = extract(
      [
        'See notes/a.md and (notes/b.md), also `notes/c.md` and "notes/d.md".',
        'But not xnotes/e.md or ../notes/f.md or notes/g.txt. A .planning/notes/h.md counts, and notes/i.md.',
        '```',
        'notes/in-fence.md [[fenced]]',
        '```',
        'Wiki [[one]] and [[two-three]] but not [[bad slug]] or [[]].',
      ].join('\n'),
    );
    expect(todo.noteRefs.mentioned).toEqual([
      '.planning/notes/a.md',
      '.planning/notes/b.md',
      '.planning/notes/c.md',
      '.planning/notes/d.md',
      '.planning/notes/h.md',
      '.planning/notes/i.md',
    ]);
    expect(todo.noteRefs.wiki).toEqual(['one', 'two-three']);
  });

  it('takes the promoted text only from a Goal and a source that says so', () => {
    const goal = '## Goal\n\nhello  world\n';
    expect(extract(goal, { source: 'promoted from /gsd-note' }).noteRefs.promotedText).toBe('hello  world');
    expect(extract(goal, { source: 'typed by hand' }).noteRefs.promotedText).toBeNull();
    expect(extract('## Problem\n\nx\n', { source: 'Promoted from /gsd-note' }).noteRefs.promotedText).toBeNull();
  });

  it('finds the quick id, the commits and the closed-on day without patterns that backtrack', () => {
    const todo = extract('## Resolution\n\nShipped in quick task 261101-a1b on 2026-11-02 and quick 261101-zzz.\n', {
      completed_by: 'commits abcdef1 and 1234567890abcdef, not ABCDEF1, not abc123, not 123456789012345678901234567890123456789012',
    });
    expect(todo.quickTask).toBe('261101-a1b');
    expect(todo.closedOn).toBe('2026-11-01');
    expect(todo.commits).toEqual(['abcdef1', '1234567890abcdef']);
    expect(extract('## Resolution\n\nDone on 2026-11-02.\n').closedOn).toBe('2026-11-02');
    expect(extract('## Resolution\n\nDone on 12026-11-02.\n').closedOn).toBeNull();
    expect(extract('## Resolution\n\nDone.\n', { completed: '2026-03-04T10:00:00Z' }).closedOn).toBe('2026-03-04');
    expect(extract('## Resolution\n\nDone.\n', { completed: 'soon' }).closedOn).toBeNull();
  });

  it('reads the folder as the status', () => {
    expect(extract('', {}, '.planning/todos/pending/a.md')).toMatchObject({ status: 'pending', folder: 'pending' });
    expect(extract('', {}, '.planning/todos/completed/a.md')).toMatchObject({ status: 'done', folder: 'completed' });
    expect(extract('', {}, '.planning/todos/done/a.md')).toMatchObject({ status: 'done', folder: 'done' });
    expect(extract('', {}, '.planning/todos/parked/a.md')).toMatchObject({ status: 'unfiled', folder: 'parked' });
    expect(extract('', {}, '.planning/todos/a.md')).toMatchObject({ status: 'unfiled', folder: null });
    expect(extract('', {}, 'weird')).toMatchObject({ status: 'unfiled', folder: null });
    expect(extract('', { status: 'done' }, '.planning/todos/pending/a.md').status).toBe('pending');
  });

  it('never throws on arbitrary strings', () => {
    const samples = [
      '#'.repeat(5000),
      '## '.repeat(300),
      '> '.repeat(2000),
      '- [ ] '.repeat(500),
      '[[' .repeat(3000),
      'notes/'.repeat(3000),
      '|'.repeat(4000),
      '```\n'.repeat(101),
      'quick '.repeat(3000),
      ':'.repeat(9000),
      '\u0000￿\ud800 weird',
    ];
    for (const body of samples) expect(() => extract(body, { files: [body], notes: [body] })).not.toThrow();
  });

  it('extracts a 1 MB body with a 200k-character line in under 250 ms', () => {
    const filler = Array.from({ length: 4000 }, (_, i) => `- item ${i} with [[slug-${i}]] and notes/n${i}.md and quick 261101-a1b`).join('\n');
    const body = `## Problem\n\n${'x'.repeat(200_000)}\n\n${filler}\n\n${'word '.repeat(150_000)}\n\n## Solution\n\n${'[ ] '.repeat(60_000)}\n`;
    expect(body.length).toBeGreaterThan(900_000);
    const started = performance.now();
    const todo = extract(body);
    const elapsed = performance.now() - started;
    expect(todo.lead).not.toBeNull();
    expect(todo.noteRefs.wiki.length).toBeLessThanOrEqual(100);
    expect(elapsed).toBeLessThan(250);
  });
});

describe('extractTodoFile fence languages (quick-261024-o3h)', () => {
  it('sets lang on a tagged fence and omits it on a bare fence', () => {
    const todo = extract('## Problem\n\n```bash\nnpm test\n```\n\n```\nplain\n```\n');
    const codes = (todo.lead?.blocks ?? []).filter((block) => block.kind === 'code');
    expect(codes).toEqual([
      { kind: 'code', text: 'npm test', lang: 'bash' },
      { kind: 'code', text: 'plain' },
    ]);
  });
});
