// The clean-list directory tree (quick-260929-3x3, sketch 009 Tree B): lucide Folder/File icons,
// indentation, collapsible folders, `# comments` as a notes column, NEW / EXTEND / EXISTING chips
// (active / in-flight / quiet), a "Changed only" filter shown only when NEW/EXTEND markers exist,
// and file/folder counts. The model comes from src/rendering/ascii-tree.ts. View-agnostic: no
// research-specific import; notes render only through tokenizeInline-mapped React nodes.
import { useMemo, useState } from 'react';
import { File, Folder, FolderOpen } from 'lucide-react';
import { changedOnlySet, parseTree, treeCounts } from '../../rendering/ascii-tree.ts';
import type { TreeBadge, TreeRow } from '../../rendering/ascii-tree.ts';
import { tokenizeInline } from '../views/inline-markdown.ts';
import type { InlineToken } from '../views/inline-markdown.ts';

const BADGE_TONE: Record<TreeBadge, 'active' | 'in-flight' | 'quiet'> = {
  NEW: 'active',
  EXTEND: 'in-flight',
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

export function CleanTree({ text }: { text: string }): React.JSX.Element {
  const rows = useMemo(() => parseTree(text), [text]);
  const counts = useMemo(() => treeCounts(rows), [rows]);
  const keep = useMemo(() => changedOnlySet(rows), [rows]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<number>>(() => new Set());
  const [changedOnly, setChangedOnly] = useState(false);

  const toggle = (index: number): void => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div>
      <div className="clean-tree-tools">
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
      </div>
      <ul className="clean-tree">
        {rows.map((row, index) => {
          if (isHidden(rows, index, collapsed)) return null;
          if (changedOnly && !keep.has(index)) return null;
          const closed = collapsed.has(index);
          return (
            <li key={index} className="clean-tree-row" data-badge={row.badge ?? undefined}>
              <span
                className="clean-tree-name"
                style={{ paddingInlineStart: `calc(var(--space-5) * ${row.depth})` }}
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
                ) : (
                  <>
                    <File aria-hidden="true" />
                    <span>{row.name}</span>
                  </>
                )}
              </span>
              <span className="clean-tree-note">
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
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
