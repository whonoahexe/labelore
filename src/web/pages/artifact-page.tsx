import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router';
import type { PhaseIdentity } from '../../domain/model.ts';
import type { ParseWarning } from '../../planning-repo/types.ts';
import { ArtifactHeader, type ArtifactCrumb } from '../components/artifact-header.tsx';
import {
  artifactWarningTone,
  type ArtifactWarningTone,
} from '../../presentation/artifact-warning-tone.ts';
import { artifactWarningSummary } from '../../presentation/artifact-warning-summary.ts';
import {
  buildArtifactUrl,
  buildMilestoneUrl,
  buildPhaseUrl,
  presentationRoutePatterns,
} from '../../presentation/routes.ts';
import { buildFrontmatterPanels } from '../../rendering/frontmatter-views.ts';
import { MetadataPanel } from '../components/metadata-panel.tsx';
import type { RenderedDocument } from '../../rendering/markdown.ts';
import { ReferencePreview, type ReferencePreviewState } from '../components/reference-preview.tsx';
import { DocumentViewToggle } from '../components/document-view-toggle.tsx';
import { DocumentOutline, type OutlineEntry } from '../components/document-outline.tsx';
import { useActiveSection } from '../components/use-active-section.ts';
import { handleDocumentReferenceActivation } from './document-reference-activation.ts';
import { dropLeadingTitle, splitPhaseTitle } from './document-title.ts';
import { toMermaidColor } from './mermaid-theme.ts';
import { scrollWhenSettled } from './scroll-settle.ts';
import { humanizeKind } from '../views/kinds.ts';
import { resolveViewFor } from '../views/manifests.ts';
import { unrecognizedNotice } from '../views/fallback.ts';
import {
  composeView,
  outlineEntriesOf,
  type ComposedView,
  type ViewInput,
} from '../views/manifest.ts';
import { extractPlanSegments, splitRenderedDocument } from '../views/document-sections.ts';
import { BLOCK_COMPONENTS } from '../views/blocks.tsx';
import { composeDocumentLayout } from '../views/layout.ts';
import {
  ChapterBar,
  CoverCells,
  CoverFacts,
  CoverStatusChip,
  FoldedChapters,
  useChapterFolds,
} from '../views/layout-components.tsx';
import { fetchPresentation } from '../components/app-shell.tsx';
import type { ProjectPresentation } from '../../server/project-presentation.ts';
import type { ComposedContextBrief } from '../views/context-brief.ts';
import { ContextBriefView, ContextIntroMeta } from '../views/context-brief-components.tsx';
import type { ComposedSecurityConsole } from '../views/security-console.ts';
import { SecurityConsoleView } from '../views/security-console-components.tsx';
import type { ComposedPlanNavigator } from '../views/plan-navigator.ts';
import { PlanIntroMeta, PlanNavigatorView } from '../views/plan-navigator-components.tsx';
import { findPlanContext } from '../views/plan-context.ts';
import { WarningChip } from '../components/warning-chip.tsx';
import type { ComposedResearchBriefing } from '../views/research-briefing.ts';
import { ResearchBriefingView, ResearchIntroMeta } from '../views/research-briefing-components.tsx';
import type { ComposedPatternMap } from '../views/pattern-map.ts';
import { PatternIntroMeta, PatternMapView } from '../views/pattern-map-components.tsx';
import type { ComposedValidationStrategy } from '../views/validation-strategy.ts';
import { ValidationStrategyView, validationHeaderProps } from '../views/validation-strategy-components.tsx';
import type { ComposedSummaryRun } from '../views/summary-run.ts';
import { SummaryRunView } from '../views/summary-run-components.tsx';
import type { ComposedUiReview } from '../views/ui-review.ts';
import { UiReviewIntroMeta, UiReviewView } from '../views/ui-review-components.tsx';
import type { ComposedUiSpec } from '../views/ui-spec.ts';
import { UiSpecIntroMeta, UiSpecView } from '../views/ui-spec-components.tsx';
import type { ComposedUatSession } from '../views/uat-session.ts';
import { UatIntroMeta, UatSessionView } from '../views/uat-session-components.tsx';
export {
  handleDocumentReferenceActivation,
  restoreDocumentReferenceFocus,
} from './document-reference-activation.ts';

/** sketch-004 B3 (quick-260922-3us): the plan whose own `path` equals the current artifact's path,
 * reduced to the two fields `ViewInput.planProgress` carries. A plain module-level function (not
 * inlined into the `useMemo` callback below) so the React Compiler can preserve the memoization —
 * a nested triple `for` loop with an early `return` inside the callback body itself defeats it. */
function findPlanProgress(
  presentation: ProjectPresentation | undefined,
  path: string | undefined,
): { complete: boolean; summaryStatus: string | null } | null {
  if (!presentation || !path) return null;
  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      for (const plan of phase.plans) {
        if (plan.path !== path) continue;
        const summaryStatus =
          typeof plan.summary?.frontmatter?.status === 'string' ? plan.summary.frontmatter.status : null;
        return { complete: plan.complete, summaryStatus };
      }
    }
  }
  return null;
}

/** quick-260923-lju: the phase whose own identity matches the current artifact's `phaseIdentity`
 * (already resolved server-side, the same signal the breadcrumbs use — no new `artifact.kind === '`
 * branch), reduced to its `requirementIds`. `null` for a quick task (no `phaseIdentity`) or a phase
 * with no requirements. */
function findPhaseRequirementIds(
  presentation: ProjectPresentation | undefined,
  phaseIdentity: PhaseIdentity | null | undefined,
): string[] | null {
  if (!presentation || !phaseIdentity) return null;
  for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      if (
        phase.identity.number === phaseIdentity.number &&
        phase.identity.milestoneVersion === phaseIdentity.milestoneVersion
      ) {
        return phase.requirementIds.length > 0 ? phase.requirementIds : null;
      }
    }
  }
  return null;
}

/** quick-260929-3x3: every other artifact in the same directory as `path`, reduced to what
 * `ViewInput.siblingArtifacts` carries (kind, path, in-app URL) — matched generically by path so a
 * RESEARCH page can link its sibling CONTEXT.md with no per-kind branch. */
function findSiblingArtifacts(
  presentation: ProjectPresentation | undefined,
  path: string | undefined,
  phaseIdentity: PhaseIdentity | null | undefined,
): { kind: string; path: string; url: string }[] {
  if (!presentation || !path) return [];
  const directory = path.slice(0, path.lastIndexOf('/') + 1);
  const siblings: { kind: string; path: string; url: string }[] = [];
  for (const artifact of presentation.artifacts) {
    if (artifact.path === path) continue;
    if (artifact.path.slice(0, artifact.path.lastIndexOf('/') + 1) !== directory) continue;
    siblings.push({
      kind: artifact.kind,
      path: artifact.path,
      url: buildArtifactUrl(phaseIdentity ?? null, artifact.path),
    });
  }
  return siblings;
}

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
    /** quick-261006-iz6: the PLAN page's Planned date — the file's modification time and the git
     * author date of the commit that added it (null outside a repository or on any git failure). */
    mtimeMs?: number;
    addedAt?: string | null;
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
  const { hash } = useLocation();
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

    const rawHeading = (hash || window.location.hash).slice(1);
    if (rawHeading) {
      try {
        const targetId = decodeURIComponent(rawHeading);
        const disposeHeadingScroll = scrollWhenSettled({
          measure: () => {
            const heading = window.document.getElementById(targetId);
            if (!heading) return null;
            return (
              window.scrollY +
              heading.getBoundingClientRect().top +
              window.document.documentElement.scrollHeight
            );
          },
          scroll: () => {
            window.document
              .getElementById(targetId)
              ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
  }, [document, previews, hash]);

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

/** The outline plus the rendered document. Its own component so the duplicate-title trim is
 * memoised: DocumentView's effects mutate the rendered DOM, so the document it is handed must keep
 * its identity from render to render rather than be rebuilt inline by the page. */
function ArtifactReader({
  title,
  document,
}: {
  title: string;
  document: RenderedDocument;
}): React.JSX.Element {
  const shown = useMemo(() => dropLeadingTitle(document, title), [document, title]);
  const entries: OutlineEntry[] = useMemo(
    () =>
      outlineHeadings(shown).map((heading) => ({
        id: heading.id,
        label: heading.text,
        depth: heading.depth,
      })),
    [shown],
  );
  const activeId = useActiveSection(entries.map((entry) => entry.id));
  return (
    <div
      className="document-reader-layout"
      data-outline={outlineHeadings(shown).length > 0 ? 'true' : 'false'}
    >
      <DocumentOutline entries={entries} activeId={activeId} />
      <article className="document-canvas" aria-label={`${title} document`}>
        <DocumentView document={shown} />
      </article>
    </div>
  );
}

/**
 * The per-type view: manifest-promoted blocks first (D-04's promotion order), then D-02's
 * collapsed remainder, then D-11's view-sourced outline (via the shared `DocumentOutline`
 * component). Defined in this file — not `views/manifest.ts` — so it can reuse `DocumentView`
 * directly with no import cycle.
 */
function ViewReader({
  title,
  composed,
  shown,
}: {
  title: string;
  composed: ComposedView;
  shown: RenderedDocument;
}): React.JSX.Element {
  const rawEntries = outlineEntriesOf(composed);
  const entries = rawEntries.length < 2 ? [] : rawEntries;
  const activeId = useActiveSection(entries.map((entry) => entry.id));
  return (
    <div
      className="document-reader-layout"
      data-outline={entries.length > 0 ? 'true' : 'false'}
    >
      <DocumentOutline entries={entries} activeId={activeId} />
      <article className="document-canvas" aria-label={`${title} document`}>
        {composed.blocks.map((block) => {
          if (block.kind === 'section') {
            return (
              <section className="view-block" id={block.id} key={block.id}>
                <header className="section-heading">
                  <h2>{block.label}</h2>
                </header>
                <DocumentView document={{ ...shown, html: block.group.html, headings: [] }} />
              </section>
            );
          }
          const Component = BLOCK_COMPONENTS[block.component];
          return (
            <section className="view-block" id={block.id} key={block.id}>
              <Component label={block.label} data={block.data} />
            </section>
          );
        })}
      </article>
    </div>
  );
}

/** VIEW-06's neutral notice, below the header — same shared `.notice` treatment
 * `plan-pair-page.tsx`'s "Outcome not recorded yet" aside already uses. Case (b)'s lead carries a
 * literal `{kind}` placeholder; here it is split so the kind renders inside a real `<strong>`
 * rather than being pre-baked into plain text. */
function UnrecognizedNotice({ kind }: { kind: string }): React.JSX.Element {
  const { lead, kindLabel } = unrecognizedNotice(kind);
  if (kindLabel === null) {
    return (
      <aside className="notice view-unrecognized-notice" role="status">
        <p>{lead}</p>
      </aside>
    );
  }
  const [before, after] = lead.split('{kind}');
  return (
    <aside className="notice view-unrecognized-notice" role="status">
      <p>
        {before}
        <strong>{kindLabel}</strong>
        {after}
      </p>
    </aside>
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
  // sketch-004 B3 (quick-260922-3us): the same cached ['presentation'] query app-shell.tsx already
  // populates — matched by `path` below, generically, so this never adds a further per-kind
  // branch (view-page-contract.test.ts caps that pattern's occurrence count).
  const presentationQuery = useQuery({ queryKey: ['presentation'], queryFn: fetchPresentation });
  const panels = useMemo(
    () => (query.data ? buildFrontmatterPanels(query.data.artifact.frontmatter) : []),
    [query.data],
  );
  const [mode, setMode] = useState<'view' | 'source'>('view');
  const shown = useMemo(
    () => (query.data ? dropLeadingTitle(query.data.document, query.data.artifact.title) : null),
    [query.data],
  );
  const groups = useMemo(() => (shown ? splitRenderedDocument(shown.html) : []), [shown]);
  const planSegments = useMemo(
    () =>
      query.data?.artifact.kind === 'plan' && shown ? extractPlanSegments(shown.html) : [],
    [query.data, shown],
  );
  const planProgress = useMemo(
    () => findPlanProgress(presentationQuery.data, query.data?.artifact.path),
    [presentationQuery.data, query.data],
  );
  // quick-261006-iz6: a PLAN's file dates, dependencies and requirement texts, resolved against the
  // cached presentation by path — `null` for every artifact that is not a PLAN file.
  const planContext = useMemo(
    () => findPlanContext(presentationQuery.data, query.data?.artifact, query.data?.phaseIdentity),
    [presentationQuery.data, query.data],
  );
  const phaseRequirementIds = useMemo(
    () => findPhaseRequirementIds(presentationQuery.data, query.data?.phaseIdentity),
    [presentationQuery.data, query.data],
  );
  const siblingArtifacts = useMemo(
    () =>
      findSiblingArtifacts(presentationQuery.data, query.data?.artifact.path, query.data?.phaseIdentity),
    [presentationQuery.data, query.data],
  );
  const viewInput = useMemo<ViewInput | null>(() => {
    if (!query.data) return null;
    return {
      kind: query.data.artifact.kind,
      frontmatter: query.data.artifact.frontmatter,
      structured: query.data.artifact.structured,
      groups,
      planSegments,
      planProgress,
      planContext,
      phaseRequirementIds,
      headings: shown?.headings ?? [],
      siblingArtifacts,
    };
  }, [query.data, groups, planSegments, planProgress, planContext, phaseRequirementIds, shown, siblingArtifacts]);
  // VIEW-06: a registered manifest, or fallback.ts's synthesized structural-read manifest — one
  // dispatch path either way (`resolveView` itself stays registry-only, for 05-06's completeness
  // test).
  const resolved = useMemo(
    () => (viewInput ? resolveViewFor(viewInput.kind, viewInput) : null),
    [viewInput],
  );
  const manifest = resolved?.manifest ?? null;
  const recognized = resolved?.recognized ?? true;
  const composed = useMemo<ComposedView | null>(() => {
    if (!manifest || !viewInput) return null;
    return composeView(manifest, viewInput);
  }, [manifest, viewInput]);
  // quick-261006-iz6 (sketch-019 B): the PLAN task navigator, when the resolved manifest opts into
  // one — `null` for every other kind, for a plan with no task and for a payload from a server that
  // predates `structured.plan` (the sketch-004 B3 layout below then renders). A composed navigator
  // also switches the B3 layout off in both modes: its cover cells would jump into folds that no
  // longer exist, so Source mode shows the plain page instead.
  const planNavigator = useMemo<ComposedPlanNavigator | null>(() => {
    if (!manifest || !viewInput) return null;
    return manifest.planNavigator?.(viewInput) ?? null;
  }, [manifest, viewInput]);
  // sketch-004 B3: the cover/chapter-index/folded-chapter layout, when the resolved manifest opts
  // into one — `null` for every kind that keeps the pre-existing promoted-block view.
  const layout = useMemo(() => {
    if (!manifest || !viewInput || planNavigator !== null) return null;
    return composeDocumentLayout(manifest, viewInput);
  }, [manifest, viewInput, planNavigator]);
  // quick-260923-lju (sketch-006 D1): the CONTEXT brief, when the resolved manifest opts into one
  // — `null` for every kind that keeps the pre-existing promoted-block/B3 view.
  const brief = useMemo<ComposedContextBrief | null>(() => {
    if (!manifest || !viewInput) return null;
    return manifest.brief?.(viewInput) ?? null;
  }, [manifest, viewInput]);
  // quick-261003-527 (sketch-017 winner D): the SECURITY console, when the resolved manifest opts
  // into one — `null` for every other kind, for a document with neither register rows nor register
  // prose and for a payload from a server that predates `structured.security` (the promoted-block
  // view then renders).
  const securityConsole = useMemo<ComposedSecurityConsole | null>(() => {
    if (!manifest || !viewInput) return null;
    return manifest.securityConsole?.(viewInput) ?? null;
  }, [manifest, viewInput]);
  // quick-260929-3x3 (sketch-008 A): the RESEARCH briefing, when the resolved manifest opts into
  // one — `null` for every kind that keeps the pre-existing promoted-block/B3/brief view, and for
  // a payload from a server that predates `structured.briefing` (the promoted-block view then
  // renders).
  const briefing = useMemo<ComposedResearchBriefing | null>(() => {
    if (!manifest || !viewInput) return null;
    return manifest.briefing?.(viewInput) ?? null;
  }, [manifest, viewInput]);
  // quick-260930-wfs (sketch-013 B): the PATTERNS file map, when the resolved manifest opts into
  // one — `null` for every other kind, and for a document with no File Classification rows (the
  // promoted-block view then renders).
  const patternMap = useMemo<ComposedPatternMap | null>(() => {
    if (!manifest || !viewInput) return null;
    return manifest.patternMap?.(viewInput) ?? null;
  }, [manifest, viewInput]);
  // quick-261003-526 (sketch-016 winner A): the VALIDATION strategy page, when the resolved manifest
  // opts into one — `null` for every other kind, for a document with none of the six recognised
  // sections and for a payload from a server that predates `structured.validation` (the
  // promoted-block view then renders).
  const validationStrategy = useMemo<ComposedValidationStrategy | null>(() => {
    if (!manifest || !viewInput) return null;
    return manifest.validationStrategy?.(viewInput) ?? null;
  }, [manifest, viewInput]);
  // quick-261006-iz7 (sketch-020 winner D): the SUMMARY page, when the resolved manifest opts into
  // one — `null` for every other kind, for a summary with nothing beyond the head and for a payload
  // from a server that predates `structured.summary` (the promoted-block view then renders).
  const summaryRun = useMemo<ComposedSummaryRun | null>(() => {
    if (!manifest || !viewInput) return null;
    return manifest.summaryRun?.(viewInput) ?? null;
  }, [manifest, viewInput]);
  // quick-261003-528 (sketch-018 B): the UI-REVIEW scorecard, when the resolved manifest opts into
  // one — `null` for every other kind, for a document with no pillar rows and for a payload from a
  // server that predates `structured.uiReview` (the promoted-block view then renders).
  const uiReview = useMemo<ComposedUiReview | null>(() => {
    if (!manifest || !viewInput) return null;
    return manifest.uiReview?.(viewInput) ?? null;
  }, [manifest, viewInput]);
  // quick-261001-qk6 (sketch-014 winner): the UI-SPEC contract page, when the resolved manifest
  // opts into one — `null` for every other kind, and for a contract with none of the recognised
  // sections or a payload from a server that predates `structured.uiSpec` (the promoted-block view
  // then renders).
  const uiSpec = useMemo<ComposedUiSpec | null>(() => {
    if (!manifest || !viewInput) return null;
    return manifest.uiSpec?.(viewInput) ?? null;
  }, [manifest, viewInput]);
  // quick-261001-qk7 (sketch-015 winner): the UAT session page, when the resolved manifest opts
  // into one — `null` for every other kind, for a document with no tests and for a payload from a
  // server that predates `structured.uat` (the promoted-block view then renders).
  const uatSession = useMemo<ComposedUatSession | null>(() => {
    if (!manifest || !viewInput) return null;
    return manifest.uatSession?.(viewInput) ?? null;
  }, [manifest, viewInput]);
  // "In the source only" entries switch to Source mode, then scroll to the named heading once the
  // source document has mounted. The pending id lives in a ref and is cleared only when the frame
  // callback fires, so a re-run of the effect (StrictMode) still lands on it.
  const pendingSourceId = useRef<string | null>(null);
  const showSource = useCallback((id: string | null) => {
    pendingSourceId.current = id;
    setMode('source');
  }, []);
  useEffect(() => {
    if (mode !== 'source' || pendingSourceId.current === null) return;
    const frame = window.requestAnimationFrame(() => {
      const id = pendingSourceId.current;
      pendingSourceId.current = null;
      if (id === null) return;
      const reducedMotion =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      // quick-261006-iz6 (T-iz6-08): the target section is marked `data-source-hit` (and any earlier
      // mark cleared) — only an attribute is set on an existing element, nothing is injected.
      const target = window.document.getElementById(id);
      for (const previous of window.document.querySelectorAll('[data-source-hit]')) {
        previous.removeAttribute('data-source-hit');
      }
      target?.setAttribute('data-source-hit', 'true');
      target?.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mode]);
  const onRequireView = useCallback(() => setMode('view'), []);
  const folds = useChapterFolds(layout, { onRequireView });
  const renderHtml = useCallback(
    (html: string) => (shown ? <DocumentView document={{ ...shown, html, headings: [] }} /> : null),
    [shown],
  );
  const viewAvailable =
    layout !== null ||
    securityConsole !== null ||
    planNavigator !== null ||
    brief !== null ||
    briefing !== null ||
    patternMap !== null ||
    validationStrategy !== null ||
    summaryRun !== null ||
    uiReview !== null ||
    uiSpec !== null ||
    uatSession !== null ||
    (composed !== null && composed.blocks.length > 0);

  if (query.isPending) {
    return (
      <main className="page-stack" aria-busy="true">
        <span className="sr-only" role="status" aria-live="polite">
          Loading
        </span>
        <div className="artifact-loading" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
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
  // quick-261003-527: the SECURITY console's rail replaces the header, the breadcrumb row and the
  // Document metadata disclosure in View mode (the rail carries the facts and the source-only strip
  // names the frontmatter); a parse warning shows as its chip in the rail. Source mode falls
  // through to the unchanged page below.
  if (securityConsole && mode === 'view') {
    return (
      <main className="artifact-page page-stack">
        <SecurityConsoleView
          key={artifact.path}
          model={securityConsole}
          fallbackTitle={artifact.title}
          path={artifact.path}
          mode={mode}
          onModeChange={setMode}
          onShowSource={showSource}
          chip={<WarningChip tone={warningTone} />}
        />
      </main>
    );
  }
  // quick-261006-iz7: the SUMMARY page opens on its own head (the meta row, the title with its
  // metrics box, the modal triggers) with no breadcrumb row, manifest lead or Document metadata
  // disclosure in View mode — the source-only strip names the frontmatter, and a parse warning
  // shows as its chip in the head. Source mode falls through to the unchanged page below.
  if (summaryRun && mode === 'view') {
    return (
      <main className="artifact-page page-stack">
        <SummaryRunView
          key={artifact.path}
          model={summaryRun}
          fallbackTitle={artifact.title}
          path={artifact.path}
          presentation={presentationQuery.data ?? null}
          mode={mode}
          onModeChange={setMode}
          onShowSource={showSource}
          chip={<WarningChip tone={warningTone} />}
        />
      </main>
    );
  }
  const crumbs: ArtifactCrumb[] = [
    { label: 'Dashboard', to: presentationRoutePatterns.dashboard },
    { label: 'Roadmap', to: presentationRoutePatterns.roadmap },
    ...(phaseIdentity
      ? [
          {
            label: phaseIdentity.milestoneVersion ?? 'Current milestone',
            to: buildMilestoneUrl(phaseIdentity.milestoneVersion),
          },
          { label: `Phase ${phaseIdentity.number}`, to: buildPhaseUrl(phaseIdentity) },
        ]
      : []),
    { label: artifact.title },
  ];
  // quick-261006-iz6 (sketch-019 B): the PLAN task navigator opens straight on its own header (no
  // breadcrumb row, manifest lead or metadata disclosure) and replaces the page in View mode. Unlike
  // the other views, a plan carrying a parse warning keeps the navigator — wrapper warnings are common
  // and the projection skips the malformed segments — and shows the shared warning chip instead.
  if (planNavigator && mode === 'view') {
    return (
      <main className="artifact-page page-stack">
        <ArtifactHeader
          crumbs={crumbs}
          hideCrumbs
          eyebrow={planNavigator.intro.eyebrow}
          title={planNavigator.intro.title ?? artifact.title}
          path={artifact.path}
          lead={null}
          meta={<PlanIntroMeta intro={planNavigator.intro} />}
          chip={<WarningChip tone={warningTone} />}
        >
          <DocumentViewToggle mode={mode} onChange={setMode} />
        </ArtifactHeader>
        <PlanNavigatorView key={artifact.path} plan={planNavigator} onShowSource={showSource} />
      </main>
    );
  }
  // quick-261003-528 (sketch-018 B): the UI-REVIEW scorecard opens straight on its own header (no
  // breadcrumb row, manifest lead or metadata disclosure) and replaces the page in View mode. A
  // review carrying a parse warning falls through to the normal page, whose chip and disclosure
  // already say so.
  if (uiReview && mode === 'view' && warningTone === null) {
    return (
      <main className="artifact-page page-stack">
        <ArtifactHeader
          crumbs={crumbs}
          hideCrumbs
          eyebrow={uiReview.intro.eyebrow}
          title={uiReview.intro.title ?? artifact.title}
          path={artifact.path}
          lead={null}
          meta={<UiReviewIntroMeta intro={uiReview.intro} />}
        >
          <DocumentViewToggle mode={mode} onChange={setMode} />
        </ArtifactHeader>
        <UiReviewView key={artifact.path} review={uiReview} onShowSource={showSource} />
      </main>
    );
  }
  // A cover page's eyebrow already names the kind: move `Phase N` up beside it and keep only the
  // phase name in the H1. The CONTEXT brief's eyebrow already carries the phase, so it only takes
  // the stripped H1.
  const kindLabel = humanizeKind(artifact.kind);
  const coverTitle = layout || brief ? splitPhaseTitle(artifact.title, kindLabel) : null;
  // The RESEARCH briefing's cover replaces the header's copy in View mode only; Source mode keeps
  // the plain header (the same rule the CONTEXT brief follows).
  const cover = briefing && mode === 'view' ? briefing : null;
  const mapCover = patternMap && mode === 'view' ? patternMap : null;
  // The VALIDATION page's header override (eyebrow, slug title, no lead, no breadcrumb row, the
  // cover as `meta`) is one prop spread, so no shared eyebrow / title / lead / meta chain grows.
  const validationHeader =
    validationStrategy && mode === 'view' ? validationHeaderProps(validationStrategy, artifact.title) : null;
  const specCover = uiSpec && mode === 'view' ? uiSpec : null;
  const uatCover = uatSession && mode === 'view' ? uatSession : null;
  return (
    <main className="artifact-page page-stack">
      <ArtifactHeader
        crumbs={crumbs}
        hideCrumbs={Boolean(specCover || uatCover)}
        eyebrow={
          brief
            ? brief.intro.eyebrow
            : cover
              ? cover.intro.eyebrow
              : mapCover
                ? mapCover.intro.eyebrow
                : specCover
                  ? specCover.intro.eyebrow
                  : uatCover
                    ? uatCover.intro.eyebrow
                    : coverTitle?.phase
                      ? `${coverTitle.phase} · ${kindLabel}`
                      : kindLabel
        }
        title={
          brief?.intro.title ??
          cover?.intro.title ??
          mapCover?.intro.title ??
          specCover?.intro.title ??
          uatCover?.intro.title ??
          coverTitle?.title ??
          artifact.title
        }
        path={artifact.path}
        lead={brief || cover || mapCover || specCover || uatCover ? null : (manifest?.lead ?? null)}
        meta={
          brief ? (
            <ContextIntroMeta intro={brief.intro} />
          ) : cover ? (
            <ResearchIntroMeta intro={cover.intro} />
          ) : mapCover ? (
            <PatternIntroMeta intro={mapCover.intro} />
          ) : specCover ? (
            <UiSpecIntroMeta intro={specCover.intro} />
          ) : uatCover ? (
            <UatIntroMeta intro={uatCover.intro} />
          ) : undefined
        }
        cover={
          layout
            ? {
                facts: <CoverFacts facts={layout.cover.facts} />,
                cells: <CoverCells layout={layout} onJump={folds.jumpTo} />,
              }
            : undefined
        }
        chip={
          <>
            {warningTone ? (
              <span
                className="status-chip"
                data-tone={warningTone === 'unreadable' ? 'destructive' : 'warning'}
              >
                {warningTone === 'unreadable' ? 'Unreadable' : 'Warning'}
              </span>
            ) : null}
            {!recognized ? (
              <span className="status-chip" data-tone="quiet">
                Unrecognized type
              </span>
            ) : null}
            {layout ? <CoverStatusChip status={layout.cover.status} /> : null}
          </>
        }
        {...(validationHeader ?? {})}
      >
        {viewAvailable ? <DocumentViewToggle mode={mode} onChange={setMode} /> : null}
      </ArtifactHeader>

      {panels.length > 0 ? (
        // The UI-SPEC page's cover and shadcn card already carry the frontmatter facts, and the
        // Winner lists the frontmatter as source-only — View mode hides the disclosure (Source
        // mode keeps it). The UAT page's cover carries its facts and its "In the source only"
        // strip names the frontmatter, so it hides the disclosure the same way.
        specCover || uatCover ? null : (
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
        )
      ) : null}

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

      {!recognized ? <UnrecognizedNotice kind={artifact.kind} /> : null}

      {layout && mode === 'view' ? (
        <div className="document-reader-layout" data-outline="false">
          <article className="document-canvas" aria-label={`${artifact.title} document`}>
            <ChapterBar layout={layout} title={artifact.title} mode={mode} onModeChange={setMode} />
            <FoldedChapters layout={layout} folds={folds} renderHtml={renderHtml} onShowSource={showSource} />
          </article>
        </div>
      ) : brief && mode === 'view' ? (
        <div className="document-reader-layout" data-outline="false">
          <article className="document-canvas" aria-label={`${artifact.title} document`}>
            <ContextBriefView brief={brief} renderHtml={renderHtml} onShowSource={showSource} />
          </article>
        </div>
      ) : briefing && mode === 'view' ? (
        <ResearchBriefingView briefing={briefing} onShowSource={showSource} title={artifact.title} />
      ) : patternMap && mode === 'view' ? (
        <PatternMapView key={artifact.path} map={patternMap} onShowSource={showSource} title={artifact.title} />
      ) : validationStrategy && mode === 'view' ? (
        <ValidationStrategyView
          key={artifact.path}
          strategy={validationStrategy}
          onShowSource={showSource}
          title={artifact.title}
        />
      ) : uiSpec && mode === 'view' ? (
        <UiSpecView key={artifact.path} spec={uiSpec} onShowSource={showSource} title={artifact.title} />
      ) : uatSession && mode === 'view' ? (
        <UatSessionView key={artifact.path} session={uatSession} onShowSource={showSource} title={artifact.title} />
      ) : viewAvailable && mode === 'view' && composed && shown ? (
        <ViewReader title={artifact.title} composed={composed} shown={shown} />
      ) : (
        <ArtifactReader title={artifact.title} document={document} />
      )}
    </main>
  );
}
