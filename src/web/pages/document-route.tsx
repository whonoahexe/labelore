import { useQuery } from '@tanstack/react-query';
import { filePageKindOf } from '../../presentation/file-facts.ts';
import { fetchPresentation } from '../api.ts';
import { useProjectScope, useProjectSlug } from '../nav.tsx';
import { projectKey } from '../query-keys.ts';
import { viewOwnsLargeFile } from '../views/kinds.ts';
import { ArtifactPage } from './artifact-page.tsx';
import { FileDetailsPage } from './file-details-page.tsx';
import { ImagePage } from './image-page.tsx';

/** The one entry point for an artifact key. It picks the page from the cached presentation payload
 * alone, so opening a non-text file never requests /api/documents (D-10): an image opens the image
 * page, a binary, a large text file, a listed spike file or an over-cap image opens the File details card, and text (or
 * an address the payload does not hold) opens as an ArtifactPage. One exception (Phase 11, 11-18, RESEARCH C2): a
 * large file whose kind owns a designed page that reads a bounded summary (an intel or graph file) opens that page,
 * not the card; listed, binary and image files keep their own pages. */
export function DocumentRoute({ url }: { url: string }): React.JSX.Element {
  const slug = useProjectSlug() ?? '';
  const scope = useProjectScope();
  const presentationQuery = useQuery({
    queryKey: projectKey(slug, scope, 'presentation'),
    queryFn: () => fetchPresentation(slug, scope),
  });
  const presentation = presentationQuery.data;
  const artifact = presentation?.artifacts.find((candidate) => candidate.key === url);
  if (presentation && artifact) {
    const kind = filePageKindOf(artifact.fileClass, artifact.sizeBytes);
    if (kind === 'image') {
      return <ImagePage key={artifact.key} artifact={artifact} presentation={presentation} />;
    }
    const viewOwnsIt = kind === 'large' && viewOwnsLargeFile(artifact.kind);
    if (!viewOwnsIt && (kind === 'image-over-cap' || kind === 'binary' || kind === 'large' || kind === 'listed')) {
      return <FileDetailsPage artifact={artifact} presentation={presentation} variant={kind} />;
    }
  }
  return <ArtifactPage route={url} />;
}
