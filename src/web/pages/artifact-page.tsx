import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import type { PhaseIdentity } from '../../domain/model.ts';
import type { ParseWarning } from '../../planning-repo/types.ts';
import { EmptyState } from '../components/empty-state.tsx';
import {
  artifactWarningTone,
  type ArtifactWarningTone,
} from '../../presentation/artifact-warning-tone.ts';
import { artifactWarningSummary } from '../../presentation/artifact-warning-summary.ts';
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
import { toMermaidColor } from './mermaid-theme.ts';
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
    /** D-11: the four-field ParseWarning record, passed through unchanged from the domain layer —
     * rendered structurally in the technical-details disclosure below, never stringified. */
    warnings: ParseWarning[];
    /** D-12/TGT-06: the did-the-body-survive signal artifactWarningTone() needs to compute the
     * same tone the tree and search rows already show for this artifact. */
    bodyLength: number;
  };
  phaseIdentity: PhaseIdentity | null;
  document: RenderedDocument;
}

const WARNING_DISCLOSURE_LABELS: Record<Exclude<ArtifactWarningTone, null>, string> = {
  unreadable: 'Unreadable details',
  warning: 'Warning details',
};

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

/**
 * Owns the rendered-markdown DOM and nothing else.
 *
 * The effect below mutates this subtree in place — mermaid replaces a `<pre>` with an `<svg>`,
 * and the fallback path rewrites classes on a rejected diagram. React does not know about those
 * mutations, and re-rendering a node whose children come from a raw HTML string reinstates the
 * original markup, silently erasing them. Every sibling state change in `DocumentView` (a runtime
 * warning, opening a reference popover) would otherwise do exactly that. Memoizing on the html
 * string — which is stable for the life of a document — keeps React away from the node entirely.
 */
const DocumentCanvas = memo(function DocumentCanvas({
  html,
  mountRef,
}: {
  html: string;
  mountRef: React.RefObject<HTMLDivElement | null>;
}): React.JSX.Element {
  return (
    <div
      ref={mountRef}
      className="artifact-document document-overflow-boundary"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

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
            return (
              heading.getBoundingClientRect().top + window.document.documentElement.scrollHeight
            );
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
      const chunk = import('mermaid').then(async ({ default: mermaid }) => {
        const baseOptions = {
          securityLevel: 'strict' as const,
          startOnLoad: false,
          theme: 'base' as const,
          fontFamily: rootStyle.getPropertyValue('--font-sans').trim(),
        };
        try {
          // quick-260910-0x4 item 9: full palette, all through toMermaidColor() — the single
          // conversion seam, never a second one and never a raw property handed to mermaid
          // unconverted. Every value here, including fontSize (not a colour; toMermaidColor()
          // returns non-oklch input unchanged), is wrapped for that reason — the source-level
          // contract test in test/web/mermaid-theme.test.ts asserts this literally.
          //
          // Seeds vs. derived: under theme:'base' mermaid computes most of its palette from a
          // small seed set (primaryColor -> nodeBkg/mainBkg, secondaryColor -> edgeLabelBackground,
          // tertiaryColor -> clusterBkg, each `||`-defaulted only when unset). Rather than let
          // derivation run and risk an inconsistent result, every named surface below is seeded
          // explicitly instead.
          //
          // primaryColor was --secondary before this fix — the 02-13 diagnosis's root cause: dark
          // --secondary carries chroma and sits off the app's zero-chroma neutral palette, which is
          // what read as "very ugly". --card is the actual neutral surface the rest of the app
          // paints nodes/panels on, so node fill now seeds from that instead.
          const bodyFontSize = getComputedStyle(window.document.body).fontSize;
          mermaid.initialize({
            ...baseOptions,
            themeVariables: {
              background: toMermaidColor(rootStyle.getPropertyValue('--background').trim()),
              primaryColor: toMermaidColor(rootStyle.getPropertyValue('--card').trim()),
              primaryTextColor: toMermaidColor(rootStyle.getPropertyValue('--foreground').trim()),
              primaryBorderColor: toMermaidColor(rootStyle.getPropertyValue('--border').trim()),
              secondaryColor: toMermaidColor(rootStyle.getPropertyValue('--secondary').trim()),
              tertiaryColor: toMermaidColor(rootStyle.getPropertyValue('--muted').trim()),
              tertiaryTextColor: toMermaidColor(rootStyle.getPropertyValue('--foreground').trim()),
              lineColor: toMermaidColor(rootStyle.getPropertyValue('--foreground').trim()),
              nodeBkg: toMermaidColor(rootStyle.getPropertyValue('--card').trim()),
              nodeBorder: toMermaidColor(rootStyle.getPropertyValue('--border').trim()),
              nodeTextColor: toMermaidColor(rootStyle.getPropertyValue('--foreground').trim()),
              clusterBkg: toMermaidColor(rootStyle.getPropertyValue('--muted').trim()),
              clusterBorder: toMermaidColor(rootStyle.getPropertyValue('--border').trim()),
              edgeLabelBackground: toMermaidColor(rootStyle.getPropertyValue('--card').trim()),
              noteBkgColor: toMermaidColor(rootStyle.getPropertyValue('--muted').trim()),
              noteTextColor: toMermaidColor(rootStyle.getPropertyValue('--foreground').trim()),
              noteBorderColor: toMermaidColor(rootStyle.getPropertyValue('--border').trim()),
              fontSize: toMermaidColor(bodyFontSize),
            },
          });
        } catch {
          // A theme token mermaid's colour library cannot parse must never take out diagram
          // rendering — fall back to mermaid's own default theme with no custom colours.
          try {
            mermaid.initialize(baseOptions);
          } catch {
            // Even the colourless retry can fail in principle; the per-node loop below still
            // attempts every node and each falls back to readable source independently.
          }
        }
        for (const node of mermaidNodes) {
          if (disposed) return;
          const source = node.textContent ?? '';
          try {
            await mermaid.parse(source, { suppressErrors: false });
            await mermaid.run({ nodes: [node], suppressErrors: false });
            // Clear the marker so a node that already carries an SVG is never queued twice.
            node.removeAttribute('data-mermaid-pending');
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
      chunk.catch(() => {
        // The module itself failed to load; every node keeps its readable source, but say so
        // rather than leaving the diagrams silently unrendered.
        if (disposed) return;
        setRuntimeWarnings((warnings) => [
          ...warnings,
          'The Mermaid renderer could not be loaded; diagrams remain readable as source.',
        ]);
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
      <DocumentCanvas html={document.html} mountRef={mountRef} />
      {runtimeWarnings.map((warning, index) => (
        <p className="notice render-issue" role="status" key={`runtime-${index}`}>
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
  // D-10/D-11/D-12: one shared derivation of the damaged-artifact tone — the same function
  // tree.ts and search.ts call — computed from both warning arrays (a document-level warning
  // also earns a badge, per D-10) and the artifact's own bodyLength.
  const warningTone: ArtifactWarningTone = artifactWarningTone({
    warnings: [...artifact.warnings, ...document.warnings],
    bodyLength: artifact.bodyLength,
  });
  const warningSummary = artifactWarningSummary({
    tone: warningTone,
    structuralWarningCount: artifact.warnings.length,
    renderWarningCount: document.warnings.length,
  });
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
        {warningTone ? (
          <span
            className="status-chip"
            data-tone={warningTone === 'unreadable' ? 'destructive' : 'warning'}
          >
            {warningTone === 'unreadable' ? 'Unreadable' : 'Warning'}
          </span>
        ) : null}
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
      ) : (
        <EmptyState />
      )}

      {warningTone ? (
        <details className="artifact-metadata artifact-warning-disclosure">
          <summary>
            <span className="warning-disclosure-label">
              <span
                className="status-chip"
                data-tone={warningTone === 'unreadable' ? 'destructive' : 'warning'}
              >
                {warningTone === 'unreadable' ? 'Unreadable' : 'Warning'}
              </span>
              <span>{WARNING_DISCLOSURE_LABELS[warningTone]}</span>
            </span>
            <ChevronDown className="warning-disclosure-chevron" aria-hidden="true" />
          </summary>
          <div className="metadata-panels warning-disclosure-body" aria-label="Warning details">
            {warningSummary ? <p>{warningSummary}</p> : null}
            <details className="warning-technical-details">
              <summary>Technical details</summary>
              {artifact.warnings.length > 0 ? (
                <dl className="warning-fields">
                  {artifact.warnings.map((warning, index) => (
                    <div key={`artifact-warning-${index}`}>
                      <dt>Path</dt>
                      <dd className="artifact-path">{warning.path}</dd>
                      <dt>Stage</dt>
                      <dd className="source-note">{warning.stage}</dd>
                      <dt>Message</dt>
                      <dd className="source-note">{warning.message}</dd>
                      <dt>Salvage</dt>
                      <dd className="source-note">{warning.salvage}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {document.warnings.length > 0 ? (
                <div className="warning-document-warnings">
                  <p className="warning-fields-label">Document warnings</p>
                  <ul>
                    {document.warnings.map((warning, index) => (
                      <li className="source-note" key={`document-warning-${index}`}>
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </details>
          </div>
        </details>
      ) : null}

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
