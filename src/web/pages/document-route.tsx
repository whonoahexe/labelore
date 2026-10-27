import { ArtifactPage } from './artifact-page.tsx';

/** The one entry point for an artifact key. Today every recognised file is text, so it opens as an
 * ArtifactPage; 07-09 branches on the file's class here (an image page, a file-details page). */
export function DocumentRoute({ url }: { url: string }): React.JSX.Element {
  return <ArtifactPage route={url} />;
}
