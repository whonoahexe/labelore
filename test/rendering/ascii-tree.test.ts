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
  isDirectoryTree,
  parseTree,
  treeCounts,
} from '../../src/rendering/ascii-tree.ts';

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
