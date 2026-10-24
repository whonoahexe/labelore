import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartLine, ChevronRight, Layers, ListChecks, Network, TriangleAlert } from 'lucide-react';
import { useSearchParams } from 'react-router';
import type { ResearchFileKey } from '../../presentation/project-research-files.ts';
import type { ResearchFileModel, ResearchViewModel } from '../../presentation/project-research.ts';
import { EmptyState } from '../components/empty-state.tsx';
import { ConfidenceChip, ConfidenceMeter, ResearchInline } from './research-atoms.tsx';
import { FeaturesPanelBody } from './research-features-panel.tsx';
import { StackPanelBody, StackReasons } from './research-stack-panel.tsx';
import { SummaryPanelBody } from './research-summary-panel.tsx';

async function fetchResearch(): Promise<ResearchViewModel> {
  const response = await fetch('/api/research', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Research request failed (${response.status})`);
  return (await response.json()) as ResearchViewModel;
}

/** The icon on a spine's vertical title. These sit on spine titles only, never as list markers. */
const SPINE_ICONS: Record<ResearchFileKey, React.ComponentType<{ 'aria-hidden'?: boolean | 'true' }>> = {
  summary: ChartLine,
  stack: Layers,
  features: ListChecks,
  architecture: Network,
  pitfalls: TriangleAlert,
};

/** Measures the sticky shell header so the frame can fill the viewport under it. */
function useShellOffset(): number | null {
  const [offset, setOffset] = useState<number | null>(null);
  useLayoutEffect(() => {
    const header = document.querySelector('.shell-header');
    if (!header) return;
    const measure = (): void => setOffset(Math.round(header.getBoundingClientRect().height));
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  return offset;
}

/** `?open=` names the open spine. An unknown or missing key opens the first present file. */
function resolveOpen(requested: string | null, files: readonly ResearchFileModel[]): ResearchFileModel {
  return files.find((file) => file.key === requested) ?? files[0];
}

function Leaf({
  file,
  expanded,
  onToggleMore,
  leafRef,
  lead,
  children,
}: {
  file: ResearchFileModel;
  expanded: boolean;
  onToggleMore: () => void;
  leafRef: React.RefObject<HTMLElement | null>;
  /** Shown between the finding and its more toggle: the Stack decision's reasons. */
  lead?: React.ReactNode;
  children?: React.ReactNode;
}): React.JSX.Element {
  const finding = file.finding;
  return (
    <section className="research-leaf" aria-label={file.label} tabIndex={0} ref={leafRef}>
      <div className="research-leaf-in">
        <div className="research-leaf-head">
          <span className="research-leaf-number">{file.number}</span>
          <div>
            <p className="research-kicker">
              {file.key === 'summary' ? 'Read this first' : 'Research'} · <ConfidenceChip level={file.confidence} />
            </p>
            <h2 className="research-leaf-title">{file.label}</h2>
          </div>
          <div className="research-nums">
            {file.nums.map((stat) => (
              <div key={stat.label}>
                <b>{stat.value}</b>
                <small>{stat.label}</small>
              </div>
            ))}
          </div>
        </div>
        {finding ? (
          <>
            <p className="research-verdict">
              <ResearchInline text={finding.head} />
            </p>
            {finding.tail ? (
              <p className="research-tail">
                <ResearchInline text={finding.tail} />
              </p>
            ) : null}
            {lead}
            {expanded && finding.more.length > 0 ? (
              <div className="research-more">
                {finding.more.map((paragraph, index) => (
                  <p key={index}>
                    <ResearchInline text={paragraph} />
                  </p>
                ))}
              </div>
            ) : null}
            {file.moreLabel ? (
              <button type="button" className="research-toggle" aria-expanded={expanded} onClick={onToggleMore}>
                <ChevronRight aria-hidden="true" />
                {expanded ? 'Show less' : file.moreLabel}
              </button>
            ) : null}
          </>
        ) : null}
        {children ? <div className="research-leaf-body">{children}</div> : null}
      </div>
    </section>
  );
}

/** The /research route (quick-261024-k8u): the five project research files as five spines, one open.
 * Every value is a React text node - research text is never turned into markup, and the page links to
 * none of the source files. */
export function ResearchPage(): React.JSX.Element {
  const research = useQuery({ queryKey: ['research'], queryFn: fetchResearch });
  const [searchParams, setSearchParams] = useSearchParams();
  const offset = useShellOffset();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const leafRef = useRef<HTMLElement | null>(null);
  const focusLeaf = useRef(false);

  const files = research.data?.files ?? [];
  const open = files.length > 0 ? resolveOpen(searchParams.get('open'), files) : null;
  const openKey = open?.key ?? null;

  const openFile = useCallback(
    (key: ResearchFileKey, options: { focus: boolean }) => {
      focusLeaf.current = options.focus;
      setSearchParams({ open: key }, { replace: true });
    },
    [setSearchParams],
  );

  // After an arrow-key move the newly opened leaf takes focus, so the next arrow keeps going.
  useEffect(() => {
    if (focusLeaf.current && leafRef.current) {
      focusLeaf.current = false;
      leafRef.current.focus();
    }
  }, [openKey]);

  if (research.isPending) {
    return (
      <main className="page-stack" aria-busy="true">
        <span className="sr-only" role="status" aria-live="polite">
          Loading
        </span>
        <div className="roadmap-loading" aria-hidden="true" />
      </main>
    );
  }

  if (research.isError) {
    return (
      <main className="page-stack">
        <p className="eyebrow">Connection error</p>
        <h1>Research could not be loaded.</h1>
        <section className="notice destructive" role="alert">
          <h2>Request failed</h2>
          <p>{research.error.message}</p>
        </section>
      </main>
    );
  }

  const model = research.data;
  if (!model.available || !open) {
    return (
      <main className="page-stack">
        <p className="eyebrow">Project research</p>
        <h1>Research</h1>
        <EmptyState />
      </main>
    );
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.defaultPrevented) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const index = model.files.findIndex((file) => file.key === open.key);
    const next = model.files[Math.max(0, Math.min(model.files.length - 1, index + (event.key === 'ArrowRight' ? 1 : -1)))];
    event.preventDefault();
    if (next && next.key !== open.key) openFile(next.key, { focus: true });
  };

  const style = offset === null ? undefined : ({ '--research-top': `${offset}px` } as React.CSSProperties);

  return (
    <main className="research-page" style={style}>
      <header className="research-bar">
        <h1>{model.title}</h1>
        <span className="research-bar-facts">
          <ConfidenceChip level={model.confidence.level} />
          {model.researched ? (
            <span>
              Researched <b>{model.researched}</b>
            </span>
          ) : null}
          <span>
            <b>{model.fileCount}</b> research files
          </span>
        </span>
      </header>
      <div className="research-spines" role="group" aria-label="Research files" onKeyDown={onKeyDown}>
        {model.files.map((file) => {
          if (file.key === open.key) {
            return (
              <Leaf
                key={file.key}
                file={file}
                expanded={expandedKey === file.key}
                onToggleMore={() => setExpandedKey(expandedKey === file.key ? null : file.key)}
                leafRef={leafRef}
                lead={file.key === 'stack' && model.stack ? <StackReasons panel={model.stack} /> : undefined}
              >
                {file.key === 'summary' && model.summary ? <SummaryPanelBody panel={model.summary} /> : null}
                {file.key === 'stack' && model.stack ? <StackPanelBody panel={model.stack} /> : null}
                {file.key === 'features' && model.features ? <FeaturesPanelBody panel={model.features} /> : null}
              </Leaf>
            );
          }
          const Icon = SPINE_ICONS[file.key];
          return (
            <button
              key={file.key}
              type="button"
              className="research-spine"
              data-lead={file.key === 'summary' ? 'true' : 'false'}
              aria-label={`${file.label}: ${file.keyNumber.value} ${file.keyNumber.label}`}
              onClick={() => openFile(file.key, { focus: false })}
            >
              <span className="research-spine-number">{file.number}</span>
              <span className="research-spine-title">
                <Icon aria-hidden="true" />
                {file.label}
              </span>
              <span className="research-spine-foot">
                <b>{file.keyNumber.value}</b>
                <ConfidenceMeter level={file.confidence} />
              </span>
            </button>
          );
        })}
      </div>
    </main>
  );
}
