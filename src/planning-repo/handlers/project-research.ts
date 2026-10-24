// The five project research files (quick-261024-k8u, sketches 031-035): SUMMARY, STACK, FEATURES,
// ARCHITECTURE and PITFALLS directly under `.planning/research/`. They parse exactly as the generic
// handler parses them and additionally carry `structured.projectResearch`, the tolerant lift the
// Research page composes from. The lift is guarded by a try/catch so a throw only omits it: the
// title, body and every other `structured` field survive.
//
// This handler reads only the raw content the registry hands it and imports no filesystem module.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { projectSections } from './section-projection.ts';
import { extractProjectResearch, type ResearchFileKey } from './project-research-lift.ts';

const PREFIX = '.planning/research/';

const FILE_KEYS: Record<string, ResearchFileKey> = {
  'SUMMARY.md': 'summary',
  'STACK.md': 'stack',
  'FEATURES.md': 'features',
  'ARCHITECTURE.md': 'architecture',
  'PITFALLS.md': 'pitfalls',
};

/** The research file key a path names, or null. Direct children of `.planning/research/` only. */
export function researchFileKeyOf(path: string): ResearchFileKey | null {
  if (!path.startsWith(PREFIX)) return null;
  const rest = path.slice(PREFIX.length);
  return Object.hasOwn(FILE_KEYS, rest) ? FILE_KEYS[rest] : null;
}

export const ProjectResearchHandler: ArtifactHandler = {
  kind: 'project-research',
  match: (ref) => ref.location === 'research' && researchFileKeyOf(ref.path) !== null,
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    const structured: Record<string, unknown> = { ...projectSections(ref.kind, fm.body) };
    const key = researchFileKeyOf(ref.path);
    if (key) {
      try {
        structured.projectResearch = extractProjectResearch(key, fm.body);
      } catch {
        // A throwing lift only omits `projectResearch`.
      }
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured,
    };
  },
};
