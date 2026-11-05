// The clean-list directory tree (quick-260929-3x3, sketch 009 Tree B; quick-260930-jzt): lucide
// Folder/File icons, a --space-6 indent step with faint indent guides, collapsible folders (a
// single-child folder chain shows as one row), `# comments` as a notes column, NEW / EXTEND /
// MODIFIED / EXISTING chips (active / in-flight / in-flight / quiet), a "Changed only" filter shown
// only when changed markers exist, and file/folder counts. A page that builds its own rows (10-19: the User setup
// page's dashboard paths, with a clickable leaf and a status word on each) passes `rows` instead of an ASCII `text`;
// the row styling, indentation, guides and folder collapsing are the same. CleanTreeFigure frames the tree in the
// same FigureFrame shell as the diagram, with Changed only and the counts in the frame bar. The model
// comes from src/rendering/ascii-tree.ts. View-agnostic: no research-specific import; notes render
// only through tokenizeInline-mapped React nodes.
import { useMemo, useState } from 'react';
import { File, Folder, FolderOpen } from 'lucide-react';
import { changedOnlySet, collapseFolderChains, parseTree, treeCounts } from '../../rendering/ascii-tree.ts';
import type { TreeBadge, TreeRow } from '../../rendering/ascii-tree.ts';
import { FigureFrame } from './figure-frame.tsx';
import { tokenizeInline } from '../views/inline-markdown.ts';
import type { InlineToken } from '../views/inline-markdown.ts';

const BADGE_TONE: Record<TreeBadge, 'active' | 'in-flight' | 'quiet'> = {
  NEW: 'active',
  EXTEND: 'in-flight',
  MODIFIED: 'in-flight',
  EXISTING: 'quiet',
};

function NoteTokens({ tokens }: { tokens: InlineToken[] }): React.JSX.Element {
  return (
    <>
      {tokens.map((token, index) => {
        const key = `${token.type}-${index}`;
        if (token.type === 'strong') {
          return (
            <strong key={key}>
              <NoteTokens tokens={token.value} />
            </strong>
          );
        }
        if (token.type === 'em') {
          return (
            <em key={key}>
              <NoteTokens tokens={token.value} />
            </em>
          );
        }
        if (token.type === 'code') return <code key={key}>{token.value}</code>;
        return <span key={key}>{token.value}</span>;
      })}
    </>
  );
}

function isHidden(rows: TreeRow[], index: number, collapsed: ReadonlySet<number>): boolean {
  let cursor = rows[index].parent;
  while (cursor !== null) {
    if (collapsed.has(cursor)) return true;
    cursor = rows[cursor].parent;
  }
  return false;
}

/**
 * A row a page builds itself instead of parsing an ASCII tree (10-19): the shared tree's row-input path. `node` is a
 * leaf's own content, drawn in place of the file icon and name (an interactive leaf, say); `trail` is drawn in the
 * note column. A folder row is still drawn by the shared collapsible folder button. Rows are in draw order, each
 * naming its nearest shallower row above as `parent` (null for a root), and are drawn as given: no folder chain is
 * joined, so the page joins the chains it wants joined.
 */
export interface CleanTreeRow {
  depth: number;
  name: string;
  dir: boolean;
  parent: number | null;
  note?: string;
  node?: React.ReactNode;
  trail?: React.ReactNode;
}

type DrawnRow = TreeRow & { node?: React.ReactNode; trail?: React.ReactNode };

function drawnRowsOf(rows: readonly CleanTreeRow[]): DrawnRow[] {
  return rows.map((row) => ({
    depth: row.depth,
    prefix: '',
    name: row.name,
    note: row.note ?? '',
    dir: row.dir,
    badge: null,
    parent: row.parent,
    node: row.node,
    trail: row.trail,
  }));
}

/** Folder path (as the tree draws it, "test/rendering/") to the labels shown as quiet chips on that row (10-14: the test
 * types that name the folder). */
export type TreeLabels = ReadonlyMap<string, readonly string[]>;

export function CleanTree({
  text = '',
  rows: inputRows,
  changedOnly = false,
  labels,
}: {
  text?: string;
  rows?: readonly CleanTreeRow[];
  changedOnly?: boolean;
  labels?: TreeLabels;
}): React.JSX.Element {
  const rows = useMemo<DrawnRow[]>(
    () => (inputRows !== undefined ? drawnRowsOf(inputRows) : collapseFolderChains(parseTree(text))),
    [inputRows, text],
  );
  // Each row's path: its name after its ancestors', so a label can name a folder by path.
  const paths = useMemo(() => {
    const out: string[] = [];
    rows.forEach((row, index) => {
      out[index] = `${row.parent === null ? '' : out[row.parent]}${row.name}`;
    });
    return out;
  }, [rows]);
  const keep = useMemo(() => changedOnlySet(rows), [rows]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set());

  const toggle = (index: number): void => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <ul className="clean-tree">
      {rows.map((row, index) => {
        if (isHidden(rows, index, collapsed)) return null;
        if (changedOnly && !keep.has(index)) return null;
        const closed = collapsed.has(index);
        return (
          <li
            key={index}
            className="clean-tree-row"
            data-badge={row.badge ?? undefined}
            data-dir={row.dir ? 'true' : undefined}
            style={{ backgroundSize: `calc(var(--space-6) * ${row.depth}) 100%` }}
          >
            <span
              className="clean-tree-name"
              style={{ paddingInlineStart: `calc(var(--space-6) * ${row.depth})` }}
            >
              {row.dir ? (
                <button
                  type="button"
                  className="clean-tree-folder"
                  aria-expanded={!closed}
                  onClick={() => toggle(index)}
                >
                  {closed ? <Folder aria-hidden="true" /> : <FolderOpen aria-hidden="true" />}
                  <span>{row.name}</span>
                </button>
              ) : row.node !== undefined ? (
                row.node
              ) : (
                <>
                  <File aria-hidden="true" />
                  <span>{row.name}</span>
                </>
              )}
            </span>
            <span className="clean-tree-note">
              {row.dir
                ? (labels?.get(paths[index]) ?? []).map((label) => (
                    <span key={label} className="status-chip" data-tone="quiet">
                      {label}
                    </span>
                  ))
                : null}
              {row.badge ? (
                <span className="status-chip" data-tone={BADGE_TONE[row.badge]}>
                  {row.badge.toLowerCase()}
                </span>
              ) : null}
              {row.note !== '' ? (
                <span>
                  <NoteTokens tokens={tokenizeInline(row.note)} />
                </span>
              ) : null}
              {row.trail}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The tree in the diagram's frame: the title, Changed only and the counts in the bar, Expand. */
export function CleanTreeFigure({
  text,
  title,
  caption,
  labels,
}: {
  text: string;
  title: string;
  caption?: React.ReactNode;
  labels?: TreeLabels;
}): React.JSX.Element {
  const counts = useMemo(() => treeCounts(parseTree(text)), [text]);
  const [changedOnly, setChangedOnly] = useState(false);
  return (
    <FigureFrame
      title={title}
      caption={caption}
      scalable={false}
      tools={
        <>
          {counts.changed > 0 ? (
            <button
              type="button"
              className="status-chip"
              aria-pressed={changedOnly}
              onClick={() => setChangedOnly((previous) => !previous)}
            >
              Changed only · {counts.changed}
            </button>
          ) : null}
          <span className="clean-tree-count">
            {counts.files} files · {counts.folders} folders
          </span>
        </>
      }
    >
      {() => <CleanTree text={text} changedOnly={changedOnly} labels={labels} />}
    </FigureFrame>
  );
}
