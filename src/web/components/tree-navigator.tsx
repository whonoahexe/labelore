import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import type { TreeNode } from '../../presentation/tree.ts';

/** D-12: the tree half of the shared Warning/Unreadable vocabulary — same tones and labels as the
 * artifact-page badge and the search-page chip. Null tone renders nothing; the node stays a
 * normal, clickable node either way (marked, never disabled and never hidden). */
function WarningIndicator({ tone }: { tone: TreeNode['warningTone'] }): React.JSX.Element | null {
  if (tone === null) return null;
  return (
    <span className="status-chip" data-tone={tone === 'unreadable' ? 'destructive' : 'warning'}>
      {tone === 'unreadable' ? 'Unreadable' : 'Warning'}
    </span>
  );
}

async function fetchTree(): Promise<TreeNode[]> {
  const response = await fetch('/api/tree', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Tree request failed (${response.status})`);
  return (await response.json()) as TreeNode[];
}

/** Every node key from the root down to (and including) the node whose own `url` matches
 * `pathname` — or `null` when nothing in the tree matches the current route. D-12: this is the
 * "branch containing the current route", recomputed on every navigation. */
function findRevealPath(nodes: TreeNode[], pathname: string, ancestry: string[]): string[] | null {
  for (const node of nodes) {
    const nextAncestry = [...ancestry, node.key];
    if (node.url !== null && node.url === pathname) return nextAncestry;
    const nested = findRevealPath(node.children, pathname, nextAncestry);
    if (nested) return nested;
  }
  return null;
}

function TreeBranch({
  node,
  pathname,
  routeOpenKeys,
}: {
  node: TreeNode;
  pathname: string;
  routeOpenKeys: Set<string>;
}): React.JSX.Element {
  const isActive = node.url !== null && node.url === pathname;
  // D-12: top-level groups start open; everything else opens only when the current route's
  // branch requires it. Once opened this way, a subsequent manual close by the user is never
  // fought — the effect below only ever forces `open` true, exactly once per reveal, mirroring
  // roadmap-page.tsx's PhaseFlow ref-based technique (never a controlled `open` prop that would
  // re-fight the user's own toggle on every render).
  const revealed = node.nodeType === 'group' || routeOpenKeys.has(node.key);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  const openedRef = useRef(false);

  useEffect(() => {
    if (!revealed || openedRef.current) return;
    openedRef.current = true;
    if (detailsRef.current) detailsRef.current.open = true;
  }, [revealed]);

  if (node.nodeType === 'exclusion') {
    const reasonId = `${node.key}-reason`;
    return (
      <li className="tree-node" data-node-type="exclusion">
        <span className="tree-node-row tree-excluded" aria-describedby={reasonId}>
          <span className="tree-excluded-marker">Excluded</span>
          {node.label}
        </span>
        <span id={reasonId} className="tree-excluded-reason">
          {node.excludedReason}
        </span>
      </li>
    );
  }

  if (node.children.length === 0) {
    if (node.nodeType === 'group') {
      return (
        <li className="tree-node" data-node-type="group">
          <p className="tree-group-label">{node.label}</p>
          <p className="empty-note">Nothing here yet.</p>
        </li>
      );
    }
    return (
      <li className="tree-node" data-node-type={node.nodeType}>
        {node.url ? (
          <Link to={node.url} className="tree-node-row" data-active={isActive ? 'true' : undefined}>
            {node.label}
            <WarningIndicator tone={node.warningTone} />
          </Link>
        ) : (
          <span className="tree-node-row">
            {node.label}
            <WarningIndicator tone={node.warningTone} />
          </span>
        )}
      </li>
    );
  }

  const labelClassName = node.nodeType === 'group' ? 'tree-group-label' : 'tree-node-link';

  return (
    <li className="tree-node" data-node-type={node.nodeType}>
      <details className="tree-disclosure" ref={detailsRef} open={node.nodeType === 'group'}>
        <summary className="tree-node-row" data-active={isActive ? 'true' : undefined}>
          {node.url ? (
            <Link to={node.url} className={labelClassName} onClick={(event) => event.stopPropagation()}>
              {node.label}
            </Link>
          ) : (
            <span className={labelClassName}>{node.label}</span>
          )}
        </summary>
        <ul className="tree-children">
          {node.children.map((child) => (
            <TreeBranch key={child.key} node={child} pathname={pathname} routeOpenKeys={routeOpenKeys} />
          ))}
        </ul>
      </details>
    </li>
  );
}

/** D-09/D-10/D-12: the persistent left sidebar, a literal mirror of `.planning/` as it sits on
 * disk. No separate error surface of its own — per 03-UI-SPEC.md, a failure here simply means the
 * sidebar doesn't render, relying on the shell's own existing snapshot-error notice. */
export function TreeNavigator({
  onAbsentChange,
}: {
  onAbsentChange?: (absent: boolean) => void;
}): React.JSX.Element | null {
  const { pathname } = useLocation();
  const query = useQuery({ queryKey: ['tree'], queryFn: fetchTree });

  useEffect(() => {
    onAbsentChange?.(query.isError);
  }, [query.isError, onAbsentChange]);

  if (query.isError) return null;

  // Loading: the track holds its width via CSS (background + right border) with no skeleton
  // rows and no layout shift — a local filesystem read resolves in milliseconds, so there is no
  // meaningful "in progress" state worth building rows for.
  if (query.isPending) {
    return <nav className="tree-navigator" aria-hidden="true" data-state="loading" />;
  }

  const tree = query.data;
  const routeOpenKeys = new Set(findRevealPath(tree, pathname, []) ?? []);

  return (
    <nav className="tree-navigator" aria-label="Planning directory tree">
      <ul className="tree-root">
        {tree.map((group) => (
          <TreeBranch key={group.key} node={group} pathname={pathname} routeOpenKeys={routeOpenKeys} />
        ))}
      </ul>
    </nav>
  );
}
