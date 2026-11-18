// The identity a running server reports at GET /api/identity, so a launcher can tell its own server
// from any other process on a port, and from a server of another version.
//
// The contract is stable, and Phase 15's attach and every launcher version read it. The route answers
// 200 with exactly { app, version, instanceId, pid }. `app` is the constant "labelore". `version` is the
// package.json version, baked into the bundle at build (read from package.json in a source run).
// `instanceId` is the LABELORE_INSTANCE_ID the server was started with when that is a non-empty string
// of at most 64 characters of [A-Za-z0-9-], else null, so a hand-run or service-run server can never be
// taken for the launcher's own. `pid` is the process id. A field may be added later; renaming or removing
// one breaks every installed launcher.
import { readFileSync } from 'node:fs';

export interface ServerIdentity {
  app: 'labelore';
  version: string;
  instanceId: string | null;
  pid: number;
}

/** The longest LABELORE_INSTANCE_ID the server will report (a UUID is 36). */
export const INSTANCE_ID_MAX = 64;

const INSTANCE_ID_SHAPE = /^[A-Za-z0-9-]+$/;

function readVersion(): string {
  // In the bundle the build defines LABELORE_BUNDLE as "1", so this branch folds away and the built
  // file holds only the version literal; a source run reads package.json beside src/.
  if (process.env.LABELORE_BUNDLE === '1') return process.env.LABELORE_VERSION as string;
  const manifest = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    version: string;
  };
  return manifest.version;
}

/** The version of this server: package.json's, baked in at build for the bundle. */
export const SERVER_VERSION: string = readVersion();

export function serverIdentity(env: NodeJS.ProcessEnv = process.env): ServerIdentity {
  const raw = env.LABELORE_INSTANCE_ID;
  const instanceId =
    typeof raw === 'string' && raw.length > 0 && raw.length <= INSTANCE_ID_MAX && INSTANCE_ID_SHAPE.test(raw)
      ? raw
      : null;
  return { app: 'labelore', version: SERVER_VERSION, instanceId, pid: process.pid };
}
