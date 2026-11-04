// Phase 10 (10-08, T-10-49): what View mode shows for a kind whose manifest sets `withholdDocumentInView` when no
// composed model has taken the page over: the sanctioned empty note and nothing from the file. The Source toggle
// stays the way to the text. Its own component so the artifact page itself renders no empty-state string.
import { EmptyState } from '../components/empty-state.tsx';

export function WithheldDocumentNote(): React.JSX.Element {
  return <EmptyState />;
}
