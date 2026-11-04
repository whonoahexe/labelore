// The names of the documents GSD's codebase mapper writes into .planning/codebase/. A leaf with no imports,
// so the CLI resolver, the read layer's folder table and the presentation layer can all name the same list
// without depending on one another.
//
// gsd-core/workflows/map-codebase.md writes the seven UPPERCASE documents below. gsd-core/bin/lib/
// onboard-projection.cjs (REQUIRED_CODEBASE_MAP_FILES and FAST_CODEBASE_MAP_FILES) names the full set and
// the four a fast map requires.

/** The seven map documents, in the order the Codebase page shows them. */
export const CODEBASE_MAP_FILES = [
  'STACK.md',
  'ARCHITECTURE.md',
  'STRUCTURE.md',
  'CONVENTIONS.md',
  'TESTING.md',
  'INTEGRATIONS.md',
  'CONCERNS.md',
] as const;

export type CodebaseMapFile = (typeof CODEBASE_MAP_FILES)[number];

/** The four documents GSD requires for a fast map (onboard-projection.cjs FAST_CODEBASE_MAP_FILES). */
export const FAST_MAP_FILES = ['STACK.md', 'INTEGRATIONS.md', 'ARCHITECTURE.md', 'STRUCTURE.md'] as const;
