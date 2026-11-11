// config.json, HANDOFF.json, estimation-calibration.json — open-map JSON reading. Everything
// returned is Record<string, unknown>: no key set is enumerated, no value is coerced, and
// `parallelization` (documented polymorphic: boolean or object) is preserved in whichever shape
// it arrives. Every parse goes through the guarded tryParseJson, which strips __proto__/
// constructor/prototype at every depth (T-01-03) — never called unguarded.
//
// Secrets (SEC-04, D-09..D-12): config.json only. The values of brave_search, firecrawl and
// exa_search are masked here, at read time, in both the parsed data and the body, so the raw file
// view, the file page, the presentation payload and the search index (which indexes this body)
// only ever see the masked form. A config.json that fails to parse has those keys' string values
// redacted in its raw text instead, and the raw text is redacted even when the file parses, so a
// secret shadowed by a later duplicate key cannot leak. A config.json that holds none of those keys
// as strings is left exactly as read. HANDOFF.json and estimation-calibration.json are returned unchanged: the
// decision scopes masking to config.json. Nothing is written back to the target.
import { basename } from 'node:path';
import type { ArtifactHandler, RawArtifact, ArtifactRef } from '../types.ts';
import { tryParseJson } from '../frontmatter.ts';
import { maskConfig, redactSecretText } from '../secret-mask.ts';

const JSON_ARTIFACT_NAMES = new Set(['config.json', 'HANDOFF.json', 'estimation-calibration.json']);

export const JsonConfigHandler: ArtifactHandler = {
  kind: 'json-config',
  // Every config.json is claimed wherever it sits (a workstream's or a codebase folder's included): the secret
  // masking is keyed on the file name, so a config.json the generic handler read would be served raw. The other
  // two names stay root-only.
  match: (ref) =>
    JSON_ARTIFACT_NAMES.has(basename(ref.path)) && (ref.location === 'root' || basename(ref.path) === 'config.json'),
  parse(raw: RawArtifact, ref: ArtifactRef) {
    const result = tryParseJson(raw.content);
    let frontmatter = result.data;
    let body = raw.content;
    if (basename(ref.path) === 'config.json') {
      // Always redact the raw text: JSON.parse keeps only the last of a duplicated key, so a secret
      // string that a later duplicate shadows is invisible to the parsed object but still sits in
      // the raw body. This also covers a file that did not parse (no object to mask at all).
      body = redactSecretText(raw.content);
      if (!result.warning) {
        const masked = maskConfig(result.data);
        if (masked.masked) {
          frontmatter = masked.data as Record<string, unknown>;
          // Source is the file as written (12-06, D-01): the redacted text (same lines, secret values masked in place)
          // stays the body when it parses back to exactly the masked data. The re-formatted view (the masked object,
          // two-space indented, with a trailing newline) is the fail-closed fallback for a secret value
          // `redactSecretText` cannot reach in place (one nested in an object or array).
          const reread = tryParseJson(body);
          const sameAsMasked = !reread.warning && JSON.stringify(reread.data) === JSON.stringify(masked.data);
          if (!sameAsMasked) body = `${JSON.stringify(masked.data, null, 2)}\n`;
        }
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
