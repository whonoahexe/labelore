// quick-260929-3x3 (3X3-03, S-11): parseTree / changedOnlySet / treeCounts / isDirectoryTree — the
// pure port of sketch 009's parseTree with parent links. Corpus numbers (14 rows / 10 files / 4
// folders on studio-portal v1.0/02, 27 rows / 15 files / 12 folders on labelore v1.0/02) came from
// the sketch's own reference algorithm.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { SP02_SHAPE } from '../helpers/research-fixtures.ts';
import { extractResearchBriefing } from '../../src/planning-repo/handlers/research-briefing.ts';
import {
  changedOnlySet,
  collapseFolderChains,
  isDirectoryTree,
  parseTree,
  treeCounts,
} from '../../src/rendering/ascii-tree.ts';
import type { TreeRow } from '../../src/rendering/ascii-tree.ts';

const REPO = new URL('../../', import.meta.url);

async function treeOf(path: string): Promise<string> {
  const body = await readFile(new URL(path, REPO), 'utf8');
  const tree = extractResearchBriefing(body).architecture?.structure?.text;
  if (!tree) throw new Error(`no tree in ${path}`);
  return tree;
}

const SP_TREE = extractResearchBriefing(SP02_SHAPE).architecture?.structure?.text ?? '';

describe('parseTree', () => {
  it('studio-portal v1.0/02: 14 rows (10 files, 4 folders) with NEW / EXTEND / EXISTING badges', () => {
    const rows = parseTree(SP_TREE);
    expect(rows).toHaveLength(14);
    expect(treeCounts(rows)).toEqual({ files: 10, folders: 4, changed: 3 });
    const byName = (name: string) => rows.find((r) => r.name === name);
    expect(byName('mod.rs')).toBeDefined();
    const badges = rows.filter((r) => r.badge).map((r) => [r.name, r.badge]);
    expect(badges).toEqual([
      ['mod.rs', 'EXISTING'],
      ['bus.rs', 'NEW'],
      ['config.rs', 'EXTEND'],
      ['lib.rs', 'EXTEND'],
    ]);
  });

  it('strips the badge prefix from each note and absorbs a comment-only continuation line', () => {
    const rows = parseTree(SP_TREE);
    const bus = rows.find((r) => r.name === 'bus.rs');
    expect(bus?.note.startsWith('NEW')).toBe(false);
    expect(bus?.note.startsWith('broadcast::Sender<Event> wrapper')).toBe(true);
    const lib = rows.find((r) => r.name === 'lib.rs');
    expect(lib?.note.endsWith('same pattern, same place)')).toBe(true);
    expect(lib?.note).toContain('precedent: tickets.spawn_sweeper');
  });

  it('depth is prefix length / 4; parents point to the nearest shallower row; a trailing / is a folder', () => {
    const rows = parseTree('root/\n├── a/\n│   ├── x.ts\n│   └── y.ts\n└── b.ts');
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 2, 1]);
    expect(rows.map((r) => r.parent)).toEqual([null, 0, 1, 1, 0]);
    expect(rows.map((r) => r.dir)).toEqual([true, true, false, false, false]);
  });

  it('changedOnlySet holds the changed rows plus their ancestors, not unrelated folders', () => {
    const rows = parseTree(SP_TREE);
    const keep = changedOnlySet(rows);
    const names = [...keep].map((i) => rows[i].name);
    expect(names).toEqual(expect.arrayContaining(['bus.rs', 'config.rs', 'lib.rs', 'backend/src/', 'ws/']));
    expect(names).not.toContain('health/');
    expect(names).not.toContain('collector.rs');
  });

  it('labelore v1.0/02 (repo file): 27 rows, 15 files, 12 folders, no badges', async () => {
    const rows = parseTree(
      await treeOf('.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-RESEARCH.md'),
    );
    expect(rows).toHaveLength(27);
    expect(treeCounts(rows)).toEqual({ files: 15, folders: 12, changed: 0 });
    expect(rows.every((r) => r.badge === null)).toBe(true);
  });

  it('tolerates blank and degenerate input', () => {
    expect(parseTree('')).toEqual([]);
    expect(parseTree('\n   \n│\n# only a comment')).toEqual([]);
    expect(() => parseTree('#'.repeat(50_000))).not.toThrow();
  });

  it('a 100,000-line tree is capped and parses quickly', () => {
    const started = performance.now();
    const rows = parseTree(Array.from({ length: 100_000 }, (_, i) => `├── file${i}.ts # note`).join('\n'));
    expect(rows.length).toBeLessThanOrEqual(2000);
    expect(performance.now() - started).toBeLessThan(250);
  });
});

describe('isDirectoryTree', () => {
  it('needs three or more ├── / └── lines', () => {
    expect(isDirectoryTree(SP_TREE)).toBe(true);
    expect(isDirectoryTree('a/\n├── b\n├── c\n└── d')).toBe(true);
    expect(isDirectoryTree('a/\n├── b\n└── c')).toBe(false);
    expect(isDirectoryTree('a/\n└── only-one')).toBe(false);
    expect(isDirectoryTree('src/\n└── guide.md')).toBe(false);
    expect(isDirectoryTree('plain prose')).toBe(false);
  });

  it('is true for the labelore corpus tree', async () => {
    expect(
      isDirectoryTree(
        await treeOf('.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-RESEARCH.md'),
      ),
    ).toBe(true);
  });
});

// quick-260930-jzt: the MODIFIED badge and collapseFolderChains, against the studio-portal phases/02
// roles tree (a verbatim fixture, 32 rows).
const ROLES_TREE = await readFile(new URL('./fixtures/sp-p02-roles-tree.txt', import.meta.url), 'utf8');

function treeRow(name: string, parent: number | null, depth: number, extra: Partial<TreeRow> = {}): TreeRow {
  return { depth, prefix: '', name, note: '', dir: name.endsWith('/'), badge: null, parent, ...extra };
}

describe('MODIFIED badge', () => {
  it("recognises 'MODIFIED — …' and 'MODIFIED: …', stripping the prefix, and not 'MODIFIEDX …'", () => {
    const rows = parseTree(
      'a/\n├── x.ts # MODIFIED — edits x\n├── y.ts # MODIFIED: edits y\n└── z.ts # MODIFIEDX not a badge',
    );
    expect(rows.map((r) => [r.badge, r.note])).toEqual([
      [null, ''],
      ['MODIFIED', 'edits x'],
      ['MODIFIED', 'edits y'],
      [null, 'MODIFIEDX not a badge'],
    ]);
  });

  it('roles fixture: 32 rows, 18 files / 14 folders / 18 changed, 12 MODIFIED rows with clean notes', () => {
    const rows = parseTree(ROLES_TREE);
    expect(rows).toHaveLength(32);
    expect(treeCounts(rows)).toEqual({ files: 18, folders: 14, changed: 18 });
    const modified = rows.filter((r) => r.badge === 'MODIFIED');
    expect(modified).toHaveLength(12);
    for (const row of modified) expect(row.note.startsWith('MODIFIED') || row.note.startsWith('—')).toBe(false);
  });

  it('changedOnlySet holds every NEW / EXTEND / MODIFIED row plus its ancestors', () => {
    const rows = parseTree(ROLES_TREE);
    const keep = changedOnlySet(rows);
    rows.forEach((row, index) => {
      if (row.badge === 'NEW' || row.badge === 'EXTEND' || row.badge === 'MODIFIED') expect(keep.has(index)).toBe(true);
    });
    for (const index of keep) {
      let cursor = rows[index].parent;
      while (cursor !== null) {
        expect(keep.has(cursor)).toBe(true);
        cursor = rows[cursor].parent;
      }
    }
  });
});

describe('collapseFolderChains', () => {
  it("roles: 31 rows, 'app/admin/' is one folder row whose children sit one level deeper", () => {
    const rows = collapseFolderChains(parseTree(ROLES_TREE));
    expect(rows).toHaveLength(31);
    const merged = rows.findIndex((r) => r.name === 'app/admin/');
    expect(merged).toBeGreaterThan(-1);
    expect(rows[merged].dir).toBe(true);
    const children = rows.filter((r) => r.parent === merged);
    expect(children.map((r) => r.name)).toEqual(['page.tsx', 'users/[id]/page.tsx']);
    for (const child of children) expect(child.depth).toBe(rows[merged].depth + 1);
    for (const name of ['backend/', 'src/', 'frontend/', 'components/', 'lib/']) {
      expect(
        rows.some((r) => r.name === name),
        name,
      ).toBe(true);
    }
    // Every parent link is a valid, earlier display index, and depth is the parent's depth + 1.
    rows.forEach((row, index) => {
      if (row.parent === null) expect(row.depth).toBe(0);
      else {
        expect(row.parent).toBeLessThan(index);
        expect(row.depth).toBe(rows[row.parent].depth + 1);
      }
    });
  });

  it("a/ → b/ → c/ → f.ts collapses to 'a/b/c/' plus f.ts", () => {
    const rows = collapseFolderChains([
      treeRow('a/', null, 0),
      treeRow('b/', 0, 1),
      treeRow('c/', 1, 2),
      treeRow('f.ts', 2, 3),
    ]);
    expect(rows.map((r) => [r.name, r.depth, r.parent])).toEqual([
      ['a/b/c/', 0, null],
      ['f.ts', 1, 0],
    ]);
  });

  it('a note (or a badge) on the parent folder blocks the merge; a noted last folder keeps its note', () => {
    const blocked = collapseFolderChains([
      treeRow('a/', null, 0, { note: 'the a folder' }),
      treeRow('b/', 0, 1),
      treeRow('f.ts', 1, 2),
    ]);
    expect(blocked.map((r) => r.name)).toEqual(['a/', 'b/', 'f.ts']);
    const kept = collapseFolderChains([
      treeRow('a/', null, 0),
      treeRow('b/', 0, 1, { note: 'the b folder', badge: 'NEW' }),
      treeRow('f.ts', 1, 2),
    ]);
    expect(kept.map((r) => [r.name, r.note, r.badge])).toEqual([
      ['a/b/', 'the b folder', 'NEW'],
      ['f.ts', '', null],
    ]);
  });

  it('a folder with two children never merges', () => {
    const rows = collapseFolderChains(parseTree('a/\n├── b/\n│   └── x.ts\n└── c.ts'));
    expect(rows.map((r) => r.name)).toEqual(['a/', 'b/', 'x.ts', 'c.ts']);
  });

  it('labelore v1.0/02 stays at 27 rows and studio-portal v1.0/02 at 14', async () => {
    const lb = parseTree(
      await treeOf('.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-RESEARCH.md'),
    );
    expect(collapseFolderChains(lb)).toHaveLength(27);
    expect(collapseFolderChains(parseTree(SP_TREE))).toHaveLength(14);
  });

  it('a 100,000-row single chain collapses within 250 ms', () => {
    const chain: TreeRow[] = Array.from({ length: 100_000 }, (_, i) => treeRow(`d${i}/`, i === 0 ? null : i - 1, i));
    chain.push(treeRow('leaf.ts', 99_999, 100_000));
    const started = performance.now();
    const rows = collapseFolderChains(chain);
    expect(performance.now() - started).toBeLessThan(250);
    expect(rows.map((r) => r.depth)).toEqual([0, 1]);
  });
});
