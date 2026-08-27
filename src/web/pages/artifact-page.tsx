import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import type { PhaseIdentity } from '../../domain/model.ts';
import {
  buildMilestoneUrl,
  buildPhaseUrl,
  presentationRoutePatterns,
} from '../../presentation/routes.ts';
import {
  buildFrontmatterPanels,
  type FrontmatterPanel,
  type FrontmatterValueView,
} from '../../rendering/frontmatter-views.ts';
import type { RenderedDocument } from '../../rendering/markdown.ts';

interface ArtifactDocumentResponse {
  found: true;
  status: 'found';
  artifact: {
    id: string;
    path: string;
    kind: string;
    title: string;
    frontmatter: Record<string, unknown>;
    structured: Record<string, unknown>;
    warnings: unknown[];
  };
  phaseIdentity: PhaseIdentity | null;
  document: RenderedDocument;
}

function ValueView({ value }: { value: FrontmatterValueView }): React.JSX.Element {
  if (value.kind === 'scalar') return <span className="metadata-scalar">{value.value}</span>;
  if (value.kind === 'list') {
    return value.items.length === 0 ? (
      <span className="metadata-empty">Empty list</span>
    ) : (
      <ol className="metadata-list">
        {value.items.map((item, index) => (
          <li key={index}>
            <ValueView value={item} />
          </li>
        ))}
      </ol>
    );
  }
  return value.entries.length === 0 ? (
    <span className="metadata-empty">Empty object</span>
  ) : (
    <dl className="metadata-record">
      {value.entries.map((entry) => (
        <div key={entry.key}>
          <dt>{entry.key}</dt>
          <dd>
            <ValueView value={entry.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function MetadataPanel({ panel }: { panel: FrontmatterPanel }): React.JSX.Element {
  return (
    <section className={`metadata-panel metadata-panel-${panel.presentation}`}>
      <h2>{panel.label}</h2>
      <ValueView value={panel.value} />
    </section>
  );
}

async function copyHeadingUrl(id: string): Promise<void> {
  const url = new URL(window.location.href);
  url.hash = encodeURIComponent(id);
  window.history.replaceState(window.history.state, '', url);
  try {
    await navigator.clipboard.writeText(url.href);
  } catch {
    // The canonical address still updates when clipboard permission is unavailable.
  }
}

export function DocumentView({ document }: { document: RenderedDocument }): React.JSX.Element {
  const mountRef = useRef<HTMLDivElement>(null);
  const [runtimeWarnings, setRuntimeWarnings] = useState<string[]>([]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || document.empty) return;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    for (const control of mount.querySelectorAll<HTMLButtonElement>('[data-heading-id]')) {
      const activate = () => {
        const id = control.dataset.headingId;
        if (id) void copyHeadingUrl(id);
      };
      control.addEventListener('click', activate);
      cleanups.push(() => control.removeEventListener('click', activate));
    }

    const rawHeading = window.location.hash.slice(1);
    if (rawHeading) {
      try {
        const heading = window.document.getElementById(decodeURIComponent(rawHeading));
        heading?.scrollIntoView({ block: 'start' });
      } catch {
        // A malformed fragment has no matching authored heading and is safely ignored.
      }
    }

    const mermaidNodes = Array.from(
      mount.querySelectorAll<HTMLElement>('[data-mermaid-pending="true"]'),
    );
    if (mermaidNodes.length > 0) {
      void import('mermaid').then(async ({ default: mermaid }) => {
        mermaid.initialize({ securityLevel: 'strict', startOnLoad: false });
        for (const node of mermaidNodes) {
          if (disposed) return;
          const source = node.textContent ?? '';
          try {
            await mermaid.run({ nodes: [node], suppressErrors: true });
          } catch {
            node.textContent = source;
            node.classList.remove('mermaid');
            node.classList.add('mermaid-fallback');
            node.removeAttribute('data-mermaid-pending');
            node.dataset.mermaidRejected = 'browser-parse';
            setRuntimeWarnings((warnings) => [
              ...warnings,
              'A Mermaid diagram could not be parsed and remains readable as source.',
            ]);
          }
        }
      });
    }

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [document]);

  if (document.empty) {
    return (
      <section className="artifact-empty" role="status">
        <h2>Empty document</h2>
        <p>This artifact has structured metadata but no authored body.</p>
      </section>
    );
  }

  return (
    <>
      <div
        ref={mountRef}
        className="artifact-document document-overflow-boundary"
        dangerouslySetInnerHTML={{ __html: document.html }}
      />
      {runtimeWarnings.map((warning) => (
        <p className="notice warning" role="status" key={warning}>
          {warning}
        </p>
      ))}
    </>
  );
}

async function loadDocument(route: string): Promise<ArtifactDocumentResponse> {
  const response = await fetch(`/api/documents?route=${encodeURIComponent(route)}`);
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { warning?: string } | null;
    throw new Error(payload?.warning ?? `Document request failed (${response.status})`);
  }
  return (await response.json()) as ArtifactDocumentResponse;
}

export function ArtifactPage(): React.JSX.Element {
  const location = useLocation();
  const route = location.pathname;
  const query = useQuery({
    queryKey: ['artifact-document', route],
    queryFn: () => loadDocument(route),
    staleTime: Number.POSITIVE_INFINITY,
  });
  const panels = useMemo(
    () => (query.data ? buildFrontmatterPanels(query.data.artifact.frontmatter) : []),
    [query.data],
  );

  if (query.isPending) {
    return (
      <main className="page-stack" aria-busy="true">
        <p className="eyebrow">Artifact reading</p>
        <h1>Loading the document…</h1>
      </main>
    );
  }
  if (query.isError) {
    return (
      <main className="page-stack">
        <p className="eyebrow">Artifact reading</p>
        <h1>This document could not be opened.</h1>
        <section className="notice destructive" role="alert">
          <p>{query.error.message}</p>
          <Link to={presentationRoutePatterns.dashboard}>Return to the dashboard</Link>
        </section>
      </main>
    );
  }

  const { artifact, phaseIdentity, document } = query.data;
  return (
    <main className="artifact-page">
      <nav className="artifact-breadcrumbs" aria-label="Breadcrumb">
        <Link to={presentationRoutePatterns.dashboard}>Dashboard</Link>
        <span aria-hidden="true">/</span>
        <Link to={presentationRoutePatterns.roadmap}>Roadmap</Link>
        {phaseIdentity ? (
          <>
            <span aria-hidden="true">/</span>
            <Link to={buildMilestoneUrl(phaseIdentity.milestoneVersion)}>
              {phaseIdentity.milestoneVersion ?? 'Current milestone'}
            </Link>
            <span aria-hidden="true">/</span>
            <Link to={buildPhaseUrl(phaseIdentity)}>Phase {phaseIdentity.number}</Link>
          </>
        ) : null}
        <span aria-hidden="true">/</span>
        <span aria-current="page">{artifact.title}</span>
      </nav>

      <header className="artifact-heading">
        <p className="eyebrow">{artifact.kind}</p>
        <h1>{artifact.title}</h1>
        <p className="artifact-path">{artifact.path}</p>
      </header>

      {panels.length > 0 ? (
        <div className="metadata-panels" aria-label="Structured artifact metadata">
          {panels.map((panel) => (
            <MetadataPanel key={panel.key} panel={panel} />
          ))}
        </div>
      ) : null}

      {[...artifact.warnings.map(String), ...document.warnings].map((warning) => (
        <p className="notice warning" role="status" key={warning}>
          {warning}
        </p>
      ))}

      <DocumentView document={document} />
    </main>
  );
}
