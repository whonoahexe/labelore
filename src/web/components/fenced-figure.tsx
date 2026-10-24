// The one figure renderer (quick-261024-o3h). View-agnostic: a fence's kind comes from the shared
// detector (`classifyFence`), and this module is the only place a kind maps to a component. Author
// text only ever reaches the DOM as React text; nothing here parses or injects markup.
//
// Three entry points:
//   - FencedCode   for block renderers: a figure when the fence is one, else the plain code block.
//   - FencedFigure for slots that are always framed (the Research diagram and structure slots).
//   - mountFigureIslands for rendered documents: the server wraps a classified fence in a
//     `data-figure` host around its highlighted block, and this hydrates a React figure beside it.
import { useMemo } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { classifyFence, type FigureKind } from '../../rendering/figure-detect.ts';
import { CleanTreeFigure } from './clean-tree.tsx';
import { FigureFrame } from './figure-frame.tsx';
import { LaneDiagramFigure } from './lane-diagram.tsx';
import { PlainDiagram } from './lifted-diagram.tsx';

export function FigureFor({
  kind,
  text,
  title,
  caption,
}: {
  kind: FigureKind;
  text: string;
  title?: string;
  caption?: React.ReactNode;
}): React.JSX.Element {
  return kind === 'diagram' ? (
    <LaneDiagramFigure text={text} title={title ?? 'Diagram'} caption={caption} />
  ) : (
    <CleanTreeFigure text={text} title={title ?? 'Directory structure'} caption={caption} />
  );
}

/** A fenced block inside a structured view: a figure when the shared detector says so, otherwise
 * the plain preformatted code it has always been. */
export function FencedCode({
  text,
  lang,
  className,
}: {
  text: string;
  lang?: string | null;
  className?: string;
}): React.JSX.Element {
  const kind = useMemo(() => classifyFence(lang, text), [lang, text]);
  if (kind !== null) return <FigureFor kind={kind} text={text} />;
  return (
    <pre className={className}>
      <code>{text}</code>
    </pre>
  );
}

/** A slot that is always framed: the figure when the text is one, else the plain framed text. */
export function FencedFigure({
  text,
  title,
  caption,
}: {
  text: string;
  title: string;
  caption?: React.ReactNode;
}): React.JSX.Element {
  const kind = useMemo(() => classifyFence(undefined, text), [text]);
  if (kind !== null) return <FigureFor kind={kind} text={text} title={title} caption={caption} />;
  return (
    <FigureFrame title={title} caption={caption}>
      {() => <PlainDiagram text={text} />}
    </FigureFrame>
  );
}

function figureKindOf(value: string | undefined): FigureKind | null {
  return value === 'diagram' || value === 'tree' ? value : null;
}

/** Hydrates every server-made figure host inside a rendered document. The source block stays in the
 * host (CSS hides it while `data-figure-mounted` is set); the figure is a React root appended
 * beside it. The disposer restores the host synchronously and unmounts the roots on a microtask,
 * so React never unmounts a root during its parent's commit and StrictMode's replay re-hydrates
 * cleanly. */
export function mountFigureIslands(container: HTMLElement): () => void {
  const mounted: Array<{ host: HTMLElement; island: HTMLElement; root: Root }> = [];

  for (const host of Array.from(container.querySelectorAll<HTMLElement>('[data-figure]'))) {
    if (host.hasAttribute('data-figure-mounted')) continue;
    const kind = figureKindOf(host.dataset.figure);
    if (kind === null) continue;
    const block = host.firstElementChild;
    if (block === null) continue;
    const text = (block.textContent ?? '').replace(/\n$/, '');

    const island = host.ownerDocument.createElement('div');
    island.setAttribute('data-figure-island', '');
    host.appendChild(island);
    const root = createRoot(island);
    root.render(<FigureFor kind={kind} text={text} />);
    host.setAttribute('data-figure-mounted', '');
    mounted.push({ host, island, root });
  }

  return () => {
    for (const { host, island, root } of mounted) {
      island.remove();
      host.removeAttribute('data-figure-mounted');
      queueMicrotask(() => root.unmount());
    }
  };
}
