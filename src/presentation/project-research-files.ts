// The five project research files (quick-261024-k8u). Kept tiny on purpose: the app shell imports
// it into the entry chunk to decide whether the Research tab shows.

export type ResearchFileKey = 'summary' | 'stack' | 'features' | 'architecture' | 'pitfalls';

export interface ResearchFileSpec {
  key: ResearchFileKey;
  label: string;
  path: string;
}

/** In page order: Summary is spine 00. */
export const RESEARCH_FILES: readonly ResearchFileSpec[] = [
  { key: 'summary', label: 'Summary', path: '.planning/research/SUMMARY.md' },
  { key: 'stack', label: 'Stack', path: '.planning/research/STACK.md' },
  { key: 'features', label: 'Features', path: '.planning/research/FEATURES.md' },
  { key: 'architecture', label: 'Architecture', path: '.planning/research/ARCHITECTURE.md' },
  { key: 'pitfalls', label: 'Pitfalls', path: '.planning/research/PITFALLS.md' },
];

/** True when the project has at least one of the five research files. */
export function projectHasResearch(artifacts: readonly { path: string }[]): boolean {
  return artifacts.some((artifact) => RESEARCH_FILES.some((file) => file.path === artifact.path));
}

export function isResearchFileKey(value: unknown): value is ResearchFileKey {
  return typeof value === 'string' && RESEARCH_FILES.some((file) => file.key === value);
}
