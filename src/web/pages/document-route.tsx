import { useQuery } from '@tanstack/react-query';
import { fetchPresentation } from '../components/app-shell.tsx';
import { ArtifactPage } from './artifact-page.tsx';
import { ImagePage } from './image-page.tsx';

/** The one entry point for an artifact key. It picks the page from the cached presentation payload
 * alone, so opening a non-text file never requests /api/documents (D-10): an image opens the image
 * page, and everything else opens as an ArtifactPage (07-09 adds the file-details card). */
export function DocumentRoute({ url }: { url: string }): React.JSX.Element {
  const presentationQuery = useQuery({ queryKey: ['presentation'], queryFn: fetchPresentation });
  const presentation = presentationQuery.data;
  const artifact = presentation?.artifacts.find((candidate) => candidate.key === url);
  if (presentation && artifact && artifact.fileClass === 'image') {
    return <ImagePage key={artifact.key} artifact={artifact} presentation={presentation} />;
  }
  return <ArtifactPage route={url} />;
}
