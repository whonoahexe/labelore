// Debug sessions (`.planning/debug/<slug>.md`, archived under `debug/resolved/`) - discovery gives them
// kind 'debug' by directory position (quick-261018-j5h, sketch 023 A). Like the learnings handler it
// lifts the frontmatter as an open map and keeps the body verbatim, and adds `structured.debug`: the
// tolerant session projection `composeDebugCase` reads client-side, plus `slug` (the file name without
// `.md`, which the client cannot see) and `archived` (true under `debug/resolved/`). The extraction is
// guarded by a try/catch so a throw only omits `debug` - the page then falls back to the promoted-section
// view and the title, body and frontmatter survive (T-j5h-04).
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseFrontmatter } from '../frontmatter.ts';
import { deriveTitle } from './title.ts';
import { extractDebugSession } from './debug-session.ts';

export const DebugHandler: ArtifactHandler = {
  kind: 'debug',
  match: (ref) => ref.kind === 'debug',
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const fm = tryParseFrontmatter(raw.content);
    const title = deriveTitle(fm.data, fm.body, ref.path);
    let report;
    try {
      report = extractDebugSession(fm.body);
    } catch {
      report = undefined;
    }
    const name = basename(ref.path);
    const slug = name.toLowerCase().endsWith('.md') ? name.slice(0, -3) : name;
    const archived = ref.path.includes('/debug/resolved/');
    return {
      title,
      frontmatter: fm.data,
      body: fm.body,
      warning: fm.warning,
      structured: report === undefined ? {} : { debug: { ...report, slug, archived } },
    };
  },
};
