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
import { ReferencePreview, type ReferencePreviewState } from '../components/reference-preview.tsx';
import { handleDocumentReferenceActivation } from './document-reference-activation.ts';
import { scrollWhenSettled } from './scroll-settle.ts';
export {
  handleDocumentReferenceActivation,
  restoreDocumentReferenceFocus,
} from './document-reference-activation.ts';

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

/** Headings the outline renders. Shared with the layout so the grid knows whether column 1 is filled. */
function outlineHeadings(document: RenderedDocument): RenderedDocument['headings'] {
  const headings = document.headings.filter((heading) => heading.depth <= 3).slice(0, 18);
  return headings.length < 2 ? [] : headings;
}

function DocumentOutline({ document }: { document: RenderedDocument }): React.JSX.Element | null {
  const headings = outlineHeadings(document);
  if (headings.length === 0) return null;
  return (
    <nav className="document-outline" aria-label="On this page">
      <p>On this page</p>
      <ol>
        {headings.map((heading) => (
          <li key={heading.id} data-depth={heading.depth}>
            <a href={`#${encodeURIComponent(heading.id)}`}>{heading.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
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
  const [referenceState, setReferenceState] = useState<ReferencePreviewState | null>(null);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const previews = useMemo(
    () => new Map((document.references ?? []).map((preview) => [preview.key, preview])),
    [document.references],
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || document.empty) return;
    let disposed = false;
    const cleanups: Array<() => void> = [];

    const activateReference = (event: MouseEvent | KeyboardEvent) => {
      const next = handleDocumentReferenceActivation<HTMLElement>(event, previews);
      if (!next) return;
      setReferenceState(next);
      setReferenceOpen(true);
    };
    mount.addEventListener('click', activateReference);
    mount.addEventListener('keydown', activateReference);
    cleanups.push(() => mount.removeEventListener('click', activateReference));
    cleanups.push(() => mount.removeEventListener('keydown', activateReference));

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
        const targetId = decodeURIComponent(rawHeading);
        const disposeHeadingScroll = scrollWhenSettled({
          measure: () => {
            const heading = window.document.getElementById(targetId);
            if (!heading) return null;
            return heading.getBoundingClientRect().top + window.document.documentElement.scrollHeight;
          },
          scroll: () => {
            window.document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
          },
          schedule: (callback) => requestAnimationFrame(callback),
          cancel: (handle) => cancelAnimationFrame(handle),
        });
        cleanups.push(disposeHeadingScroll);
      } catch {
        // A malformed fragment has no matching authored heading and is safely ignored.
      }
    }

    const mermaidNodes = Array.from(
      mount.querySelectorAll<HTMLElement>('[data-mermaid-pending="true"]'),
    );
    if (mermaidNodes.length > 0) {
      const rootStyle = getComputedStyle(window.document.documentElement);
      void import('mermaid').then(async ({ default: mermaid }) => {
        mermaid.initialize({
          securityLevel: 'strict',
          startOnLoad: false,
          theme: 'base',
          fontFamily: rootStyle.getPropertyValue('--font-sans').trim(),
          themeVariables: {
            background: rootStyle.getPropertyValue('--background').trim(),
            primaryColor: rootStyle.getPropertyValue('--secondary').trim(),
            primaryTextColor: rootStyle.getPropertyValue('--foreground').trim(),
            primaryBorderColor: rootStyle.getPropertyValue('--border').trim(),
            lineColor: rootStyle.getPropertyValue('--foreground').trim(),
          },
        });
        for (const node of mermaidNodes) {
          if (disposed) return;
          const source = node.textContent ?? '';
          try {
            await mermaid.parse(source, { suppressErrors: false });
            await mermaid.run({ nodes: [node], suppressErrors: false });
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
  }, [document, previews]);

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
      {runtimeWarnings.map((warning, index) => (
        <p className="notice warning" role="status" key={`runtime-${index}`}>
          {warning}
        </p>
      ))}
      <ReferencePreview
        state={referenceState}
        open={referenceOpen}
        onOpenChange={setReferenceOpen}
        onCloseComplete={() => setReferenceState(null)}
      />
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
        <details className="artifact-metadata">
          <summary>
            Document metadata <span>{panels.length} sections</span>
          </summary>
          <div className="metadata-panels" aria-label="Structured artifact metadata">
            {panels.map((panel) => (
              <MetadataPanel key={panel.key} panel={panel} />
            ))}
          </div>
        </details>
      ) : null}

      {artifact.warnings.map(String).map((warning, index) => (
        <p className="notice warning" role="status" key={`artifact-${index}`}>
          {warning}
        </p>
      ))}
      {document.warnings.map((warning, index) => (
        <p className="notice warning" role="status" key={`document-${index}`}>
          {warning}
        </p>
      ))}

      <div
        className="document-reader-layout"
        data-outline={outlineHeadings(document).length > 0 ? 'true' : 'false'}
      >
        <DocumentOutline document={document} />
        <article className="document-canvas" aria-label={`${artifact.title} document`}>
          <DocumentView document={document} />
        </article>
      </div>
    </main>
  );
}
