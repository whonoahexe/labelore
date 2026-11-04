// The codebase map documents (Phase 10, 10-05, VIEW-13, TGT-09): STACK.md, ARCHITECTURE.md, STRUCTURE.md,
// CONVENTIONS.md, TESTING.md, INTEGRATIONS.md and CONCERNS.md under .planning/codebase/. The handler claims
// every `codebase-*` ref and carries `structured.codebase`, the projection `extractCodebase` makes
// (codebase-lift.ts: the stamp, the sections in file order with fuzzy keys, and the Stack and Concerns
// lifts). The lift is guarded by its own try/catch so a throw only omits the key: the page then falls back
// to the plain document and the title, body and frontmatter survive.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { extractCodebase } from './codebase-lift.ts';
import type { CodebaseBody } from './codebase-lift.ts';

export type { CodebaseBody } from './codebase-lift.ts';

const PREFIX = 'codebase-';

export const CodebaseHandler: ArtifactHandler = {
  kind: 'codebase',
  match: (ref) => ref.kind.startsWith(PREFIX),
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let codebase: CodebaseBody | undefined;
    try {
      codebase = extractCodebase(ref.kind.slice(PREFIX.length), fm.data, fm.body);
    } catch {
      codebase = undefined;
    }
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: codebase === undefined ? {} : { codebase },
    };
  },
};
