// The planning file tree's pure model (quick-261115-k9z): every file the reader discovered, drawn as folders and
// files in pre-order. No Node, no React, no reading: it turns the presentation payload's artifact list (key, path,
// fileClass) into rows a tree component draws, so the same list serves the search page and the quick-jump palette.
import type { ArtifactDto } from '../server/project-presentation.ts';
import { sourceLinkOf } from './source-link.ts';

/** One row of the tree, in draw order. A folder's name and path end in '/'. */
export interface PlanningTreeRow {
  depth: number;
  name: string;
  dir: boolean;
  /** The index of the folder row this row sits in; null for a root. */
  parent: number | null;
  path: string;
  /** Every file beneath a folder, however deep; 0 on a file. */
  fileCount: number;
  /** Where a file leads (project-relative); null on a folder and on a file with no address. */
  href: string | null;
}

export interface PlanningTreeModel {
  rows: PlanningTreeRow[];
  files: number;
  folders: number;
}

type TreeArtifact = Pick<ArtifactDto, 'key' | 'path' | 'fileClass'>;

interface FolderNode {
  name: string;
  path: string;
  folders: Map<string, FolderNode>;
  files: { name: string; artifact: TreeArtifact }[];
}

const byName = (a: string, b: string): number => a.localeCompare(b, 'en', { numeric: true });

function folderNode(name: string, path: string): FolderNode {
  return { name, path, folders: new Map(), files: [] };
}

/** A text file opens in Source (`?source=1`); any other file with an address opens its own page; no address, no link. */
function hrefOf(artifact: TreeArtifact): string | null {
  if (artifact.key === '') return null;
  return artifact.fileClass === 'text' ? sourceLinkOf(artifact.key, null) : artifact.key;
}

function countFiles(node: FolderNode): number {
  let total = node.files.length;
  for (const child of node.folders.values()) total += countFiles(child);
  return total;
}

/**
 * Artifacts to draw-ordered rows. Inside a folder, folders come first and then files, each in numeric-aware name
 * order (so `9-a/` sorts before `10-b/`). Every file counts, whatever its kind or place. Never throws.
 */
export function planningTreeOf(artifacts: readonly TreeArtifact[]): PlanningTreeModel {
  const roots = new Map<string, FolderNode>();
  let files = 0;

  for (const artifact of artifacts) {
    const segments = artifact.path.split('/').filter((segment) => segment !== '');
    if (segments.length === 0) continue;
    const fileName = segments[segments.length - 1];
    let siblings = roots;
    let current: FolderNode | null = null;
    let path = '';
    for (const segment of segments.slice(0, -1)) {
      path += `${segment}/`;
      let next = siblings.get(segment);
      if (next === undefined) {
        next = folderNode(segment, path);
        siblings.set(segment, next);
      }
      current = next;
      siblings = next.folders;
    }
    if (current === null) {
      // A bare file name with no folder: it is its own root, drawn after the root folders.
      const root = roots.get('') ?? folderNode('', '');
      roots.set('', root);
      root.files.push({ name: fileName, artifact });
    } else {
      current.files.push({ name: fileName, artifact });
    }
    files += 1;
  }

  const rows: PlanningTreeRow[] = [];
  let folders = 0;

  function emit(node: FolderNode, depth: number, parent: number | null): void {
    const index = rows.length;
    rows.push({
      depth,
      name: `${node.name}/`,
      dir: true,
      parent,
      path: node.path,
      fileCount: countFiles(node),
      href: null,
    });
    folders += 1;
    drawContents(node, depth + 1, index);
  }

  function drawContents(node: FolderNode, depth: number, parent: number | null): void {
    for (const child of [...node.folders.values()].sort((a, b) => byName(a.name, b.name))) {
      emit(child, depth, parent);
    }
    for (const file of [...node.files].sort((a, b) => byName(a.name, b.name))) {
      rows.push({
        depth,
        name: file.name,
        dir: false,
        parent,
        path: file.artifact.path,
        fileCount: 0,
        href: hrefOf(file.artifact),
      });
    }
  }

  const loose = roots.get('');
  roots.delete('');
  for (const root of [...roots.values()].sort((a, b) => byName(a.name, b.name))) emit(root, 0, null);
  if (loose !== undefined) drawContents(loose, 0, null);

  return { rows, files, folders };
}
