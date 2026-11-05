// USER-SETUP.md (Phase 10, 10-19, VIEW-11, T-10-33). The handler claims `{NN}-USER-SETUP.md` by its artifact token and
// carries `structured.userSetup`, the tolerant reading `extractUserSetup` makes of what GSD's `templates/user-setup.md`
// writes: the steps, the variables with where each goes and where to get it (never the value a person may have pasted
// beside a name), and every section as masked lines. The title and every string of the frontmatter pass through
// `maskValues` as well. The returned body stays as written: Source mode shows the file
// (UI-SPEC section 1 rule 1; the places a value can still be seen are recorded in 10-19-SUMMARY.md). The extraction is
// guarded by its own try/catch so a throw only omits the key: the title, body and frontmatter survive.
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { artifactTokenOf } from './artifact-token.ts';
import { extractUserSetup } from './user-setup-body.ts';
import type { UserSetupBody } from './user-setup-body.ts';
import { maskValues } from './withhold-values.ts';

export { extractUserSetup } from './user-setup-body.ts';
export type { UserSetupBody } from './user-setup-body.ts';

/** The deepest frontmatter nesting the mask follows; past it a value is dropped rather than kept unmasked. */
const FRONTMATTER_DEPTH = 8;

/** A frontmatter value with every string in it (keys included) passed through `maskValues`: a pasted value can sit in a
 * title, a list item or a nested field as easily as in the body. A value nested deeper than FRONTMATTER_DEPTH is dropped. */
function maskData(value: unknown, depth: number): unknown {
  if (typeof value === 'string') return maskValues(value);
  if (Array.isArray(value)) {
    return depth >= FRONTMATTER_DEPTH ? [] : value.map((item) => maskData(item, depth + 1));
  }
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null) {
    if (depth >= FRONTMATTER_DEPTH) return {};
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) out[maskValues(key)] = maskData(item, depth + 1);
    return out;
  }
  return value;
}

export const UserSetupHandler: ArtifactHandler = {
  kind: 'user-setup',
  match: (ref) => artifactTokenOf(ref) === 'USER-SETUP',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = maskValues(deriveTitle(fm.data, fm.body, ref.path));
    let userSetup: UserSetupBody | undefined;
    try {
      userSetup = extractUserSetup(fm.body);
    } catch {
      userSetup = undefined;
    }
    return {
      title,
      frontmatter: maskData(fm.data, 0) as Record<string, unknown>,
      body: fm.body,
      warning: fm.warning,
      structured: userSetup === undefined ? {} : { userSetup },
    };
  },
};
