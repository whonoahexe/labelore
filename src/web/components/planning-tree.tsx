// The planning file tree and the Search | File tree switch (quick-261115-k9z). Both surfaces that offer the tree, the
// search page and the quick-jump palette, draw it through PlanningTree: every file the reader discovered as clean-tree
// rows, `.planning/` open, every folder below it collapsed, a file count on each folder, file names only. A file's
// name is a project-aware link to its page (Source mode for a text file). Names and paths are React text nodes only.
import { useMemo } from 'react';
import { File, FolderTree, Search } from 'lucide-react';
import { Link } from '../nav.tsx';
import { planningTreeOf } from '../../presentation/planning-tree.ts';
import type { ArtifactDto } from '../../server/project-presentation.ts';
import type { SearchMode } from '../pages/search-view.ts';
import { CleanTree } from './clean-tree.tsx';
import type { CleanTreeRow } from './clean-tree.tsx';

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`;

/** The joined segmented control: Search or File tree. Pressing the option already pressed does nothing. */
export function SearchModeSwitch({
  mode,
  onChange,
}: {
  mode: SearchMode;
  onChange: (next: SearchMode) => void;
}): React.JSX.Element {
  const press = (next: SearchMode): void => {
    if (next !== mode) onChange(next);
  };
  return (
    <div className="search-mode-switch" role="group" aria-label="Search or file tree">
      <button type="button" className="search-mode-option" aria-pressed={mode === 'search'} onClick={() => press('search')}>
        <Search aria-hidden="true" />
        Search
      </button>
      <button type="button" className="search-mode-option" aria-pressed={mode === 'tree'} onClick={() => press('tree')}>
        <FolderTree aria-hidden="true" />
        File tree
      </button>
    </div>
  );
}

/** The project's whole `.planning/` file set as a tree. `onOpen` runs when a file link is clicked (the palette uses it to close). */
export function PlanningTree({
  artifacts,
  onOpen,
}: {
  artifacts: readonly Pick<ArtifactDto, 'key' | 'path' | 'fileClass'>[];
  onOpen?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}): React.JSX.Element {
  const model = useMemo(() => planningTreeOf(artifacts), [artifacts]);
  const rows = useMemo<CleanTreeRow[]>(
    () =>
      model.rows.map((row) => ({
        depth: row.depth,
        name: row.name,
        dir: row.dir,
        parent: row.parent,
        note: row.dir ? plural(row.fileCount, 'file', 'files') : undefined,
        node:
          !row.dir && row.href !== null ? (
            <Link className="planning-tree-file" to={row.href} title={row.path} onClick={onOpen}>
              <File aria-hidden="true" />
              <span>{row.name}</span>
            </Link>
          ) : undefined,
      })),
    [model, onOpen],
  );
  // A payload refresh that adds or removes a file remounts the tree, so its index-keyed fold state never lands on another folder.
  const treeKey = useMemo(() => model.rows.map((row) => row.path).join('\n'), [model]);
  return (
    <div className="planning-tree">
      <p className="planning-tree-count">
        {plural(model.files, 'file', 'files')} in {plural(model.folders, 'folder', 'folders')}
      </p>
      <CleanTree key={treeKey} rows={rows} collapseDepth={1} />
    </div>
  );
}
