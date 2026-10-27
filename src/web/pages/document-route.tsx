import { useQuery } from '@tanstack/react-query';
import { filePageKindOf } from '../../presentation/file-facts.ts';
import { fetchPresentation } from '../components/app-shell.tsx';
import { ArtifactPage } from './artifact-page.tsx';
import { FileDetailsPage } from './file-details-page.tsx';
import { ImagePage } from './image-page.tsx';

/** The one entry point for an artifact key. It picks the page from the cached presentation payload
 * alone, so opening a non-text file never requests /api/documents (D-10): an image opens the image
 * page, a binary, a large text file or an over-cap image opens the File details card, and text (or
 * an address the payload does not hold) opens as an ArtifactPage. */
export function DocumentRoute({ url }: { url: string }): React.JSX.Element {
  const presentationQuery = useQuery({ queryKey: ['presentation'], queryFn: fetchPresentation });
  const presentation = presentationQuery.data;
  const artifact = presentation?.artifacts.find((candidate) => candidate.key === url);
  if (presentation && artifact) {
    const kind = filePageKindOf(artifact.fileClass, artifact.sizeBytes);
    if (kind === 'image') {
      return <ImagePage key={artifact.key} artifact={artifact} presentation={presentation} />;
    }
    if (kind === 'image-over-cap' || kind === 'binary' || kind === 'large') {
      return <FileDetailsPage artifact={artifact} presentation={presentation} variant={kind} />;
    }
  }
  return <ArtifactPage route={url} />;
}
