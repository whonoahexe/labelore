// config.json, HANDOFF.json, estimation-calibration.json — open-map JSON reading. Everything
// returned is Record<string, unknown>: no key set is enumerated, no value is coerced, and
// `parallelization` (documented polymorphic: boolean or object) is preserved in whichever shape
// it arrives. Every parse goes through the guarded tryParseJson, which strips __proto__/
// constructor/prototype at every depth (T-01-03) — never called unguarded.
//
// Secrets (SEC-04, D-09..D-12): config.json only. The values of brave_search, firecrawl and
// exa_search are masked here, at read time, in both the parsed data and the body, so the raw file
// view, the file page, the presentation payload and the search index (which indexes this body)
// only ever see the masked form. A config.json that holds none of those keys as strings is left
// exactly as read. HANDOFF.json and estimation-calibration.json are returned unchanged: the
// decision scopes masking to config.json. Nothing is written back to the target.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseJson } from '../frontmatter.ts';
import { maskConfig } from '../secret-mask.ts';

const JSON_ARTIFACT_NAMES = new Set(['config.json', 'HANDOFF.json', 'estimation-calibration.json']);

export const JsonConfigHandler: ArtifactHandler = {
  kind: 'json-config',
  match: (ref) => ref.location === 'root' && JSON_ARTIFACT_NAMES.has(basename(ref.path)),
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const result = tryParseJson(raw.content);
    let frontmatter = result.data;
    let body = raw.content;
    if (basename(ref.path) === 'config.json') {
      const masked = maskConfig(result.data);
      if (masked.masked) {
        frontmatter = masked.data as Record<string, unknown>;
        // A re-formatted view: the masked object, two-space indented, with a trailing newline.
        body = `${JSON.stringify(masked.data, null, 2)}\n`;
      }
    }
    return {
      title: basename(ref.path),
      // The parsed JSON object IS the structured data for this artifact type — there is no
      // separate markdown frontmatter/body split for a .json file. Kept in `frontmatter` so every
      // consumer that reads Artifact.frontmatter as "this artifact's open-map data" works
      // uniformly across markdown and JSON artifacts alike.
      frontmatter,
      body,
      warning: result.warning,
      structured: {},
    };
  },
};
