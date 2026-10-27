// The image page (Phase 7: D-08): a plain document-style page that shows one image from the project.
// The picture is always an img element whose src is the images-only bytes route; an SVG is shown the
// same way, so a script inside it never runs, and no markup from the file ever reaches the DOM. The
// page offers no link, button or download to the bytes (D-09): the image is not a link.
import { useState } from 'react';
import type { ArtifactDto, ProjectPresentation } from '../../server/project-presentation.ts';
import {
  fileNameOf,
  fileTypeLabel,
  imageBytesUrl,
  imageFactsLine,
} from '../../presentation/file-facts.ts';
import { ArtifactHeader } from '../components/artifact-header.tsx';
import type { ArtifactCrumb } from '../components/artifact-header.tsx';
import { FigureFrame } from '../components/figure-frame.tsx';
import { documentCrumbsOf } from './document-crumbs.ts';

export type ImageStatus =
  | { kind: 'loading' }
  | { kind: 'loaded'; width: number; height: number }
  | { kind: 'failed' };

function dimensionsOf(status: ImageStatus): { width: number; height: number } | 'unknown' | null {
  if (status.kind === 'loading') return null;
  if (status.kind === 'failed') return 'unknown';
  return { width: status.width, height: status.height };
}

/** The markup of the image page for one status; ImagePage owns the status. */
export function ImageView({
  artifact,
  crumbs,
  status,
  onLoad,
  onError,
}: {
  artifact: ArtifactDto;
  crumbs: ArtifactCrumb[];
  status: ImageStatus;
  onLoad: React.ReactEventHandler<HTMLImageElement>;
  onError: React.ReactEventHandler<HTMLImageElement>;
}): React.JSX.Element {
  const name = fileNameOf(artifact.path);
  const facts = imageFactsLine(fileTypeLabel(name, artifact.fileClass), artifact.sizeBytes, dimensionsOf(status));
  return (
    <main className="artifact-page page-stack">
      <ArtifactHeader
        crumbs={crumbs}
        eyebrow="Image"
        title={name}
        path={artifact.path}
        meta={<span className="source-note">{facts}</span>}
      />
      <FigureFrame title="Preview">
        {() => <img alt={name} src={imageBytesUrl(artifact.key)} onLoad={onLoad} onError={onError} />}
      </FigureFrame>
    </main>
  );
}

/** Opens one image: the status starts at loading and follows the browser's load and error events. */
export function ImagePage({
  artifact,
  presentation,
}: {
  artifact: ArtifactDto;
  presentation: ProjectPresentation | undefined;
}): React.JSX.Element {
  const [status, setStatus] = useState<ImageStatus>({ kind: 'loading' });
  const name = fileNameOf(artifact.path);
  return (
    <ImageView
      artifact={artifact}
      crumbs={documentCrumbsOf(presentation, artifact.path, name)}
      status={status}
      onLoad={(event) =>
        setStatus({
          kind: 'loaded',
          width: event.currentTarget.naturalWidth,
          height: event.currentTarget.naturalHeight,
        })
      }
      onError={() => setStatus({ kind: 'failed' })}
    />
  );
}
