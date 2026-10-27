// The File details card (Phase 7: D-09): what a file is when Labelore does not show its contents - a
// binary, a text file over the size limit, or an image above the image cap. One static page: a header,
// one card of four facts. No preview, no download, no link to the bytes and no button but the header's
// copy-path (D-09). Every value is React text; the facts come from the payload alone.
import { MAX_IMAGE_BYTES, MAX_TEXT_BYTES } from '../../planning-repo/file-class.ts';
import {
  exactByteCount,
  fileFolderOf,
  fileNameOf,
  fileTypeLabel,
  formatByteSize,
} from '../../presentation/file-facts.ts';
import type { ArtifactDto, ProjectPresentation } from '../../server/project-presentation.ts';
import { ArtifactHeader } from '../components/artifact-header.tsx';
import { documentCrumbsOf } from './document-crumbs.ts';

export type FileDetailsVariant = 'binary' | 'large' | 'image-over-cap';

const COPY: Record<FileDetailsVariant, { eyebrow: string; lead: string }> = {
  binary: { eyebrow: 'Binary file', lead: "Labelore does not show this file's contents." },
  large: {
    eyebrow: 'Large file',
    lead: `Labelore does not read text files larger than ${formatByteSize(MAX_TEXT_BYTES)}.`,
  },
  'image-over-cap': {
    eyebrow: 'Image',
    lead: `This image is larger than ${formatByteSize(MAX_IMAGE_BYTES)}, so Labelore does not load it.`,
  },
};

export function FileDetailsPage({
  artifact,
  presentation,
  variant,
}: {
  artifact: ArtifactDto;
  presentation: ProjectPresentation | undefined;
  variant: FileDetailsVariant;
}): React.JSX.Element {
  const name = fileNameOf(artifact.path);
  const { eyebrow, lead } = COPY[variant];
  return (
    <main className="artifact-page page-stack">
      <ArtifactHeader
        crumbs={documentCrumbsOf(presentation, artifact.path, name)}
        eyebrow={eyebrow}
        title={name}
        lead={lead}
        path={artifact.path}
      />
      <div className="metadata-panels">
        <section className="metadata-panel metadata-panel-known">
          <h2>File details</h2>
          <dl className="metadata-record">
            <div>
              <dt>Name</dt>
              <dd>
                <span className="metadata-scalar">{name}</span>
              </dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>
                <span className="metadata-scalar">{fileTypeLabel(name, artifact.fileClass)}</span>
              </dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>
                <span className="metadata-scalar" title={exactByteCount(artifact.sizeBytes)}>
                  {formatByteSize(artifact.sizeBytes)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Folder</dt>
              <dd>
                <span className="metadata-scalar artifact-path">{fileFolderOf(artifact.path)}</span>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  );
}
