// The ONE function that owns every machine-varying value (D-07). Absolute paths become
// project-root-relative always; mtimeMs and readAt become fixed placeholders under --stable so two
// dumps taken from different clones of the same tree are byte-identical.
import { relative } from 'node:path';
import type { ProjectSnapshot } from './types.ts';

export interface NormalizeOptions {
  stable: boolean;
  withBodies: boolean;
}

const STABLE_TIMESTAMP_PLACEHOLDER = '1970-01-01T00:00:00.000Z';

export function normalizeForGolden(
  snapshot: ProjectSnapshot,
  rootPath: string,
  options: NormalizeOptions,
): unknown {
  return JSON.parse(
    JSON.stringify(snapshot, (key, value) => {
      if (typeof value === 'string' && value.startsWith(rootPath)) {
        const rel = relative(rootPath, value);
        return rel === '' ? '.' : rel;
      }
      if (options.stable && key === 'mtimeMs') {
        return 0;
      }
      if (options.stable && key === 'readAt') {
        return STABLE_TIMESTAMP_PLACEHOLDER;
      }
      if (!options.withBodies && key === 'body') {
        return undefined; // JSON.stringify drops keys whose replacer returns undefined
      }
      return value;
    }),
  );
}
