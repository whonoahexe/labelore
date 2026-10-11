// Recognises a remote project address given on the command line (sftp://, ssh://, and the scp-style
// `[user@]host:/path`) BEFORE src/cli/target-path.ts treats the argument as a local path. Pure
// string work: no child_process and no filesystem access live here, so the parsing, quoting, argv
// construction and failure mapping are all unit-testable without a network. The spawning lives in
// src/server/remote-source.ts, and the temp-dir primitives live in src/planning-fs/local-fs.ts.
//
// Read-only by construction: the only command ever sent to the remote host is the fixed template in
// buildMirrorCommands (`[ -e ]`, `[ -d ]`, `cd`, `exec tar -cf - .planning`), with the single
// interpolated value single-quoted for the remote shell.
import { posix } from 'node:path';
import type { FailedLoadStatus } from '../planning-repo/types.ts';
import { LOAD_STATUS_MESSAGES } from './target-path.ts';

export type RemoteScheme = 'sftp' | 'ssh' | 'scp';

export interface RemoteTarget {
  scheme: RemoteScheme;
  user: string | null;
  /** IPv6 brackets are stripped here (ssh wants the bare address); the label keeps them. */
  host: string;
  port: number | null;
  /** Absolute posix path, or home-relative spelled `.` or `./rest`. Never starts with `-`. */
  remoteRoot: string;
  /** Display address shown in the UI instead of the temp mirror directory. */
  label: string;
  /** The argument as typed, with any password replaced by `***`. */
  rawPath: string;
}

export type RemoteParse =
  | { kind: 'local' }
  | { kind: 'remote'; target: RemoteTarget }
  | { kind: 'invalid'; status: FailedLoadStatus };

const EXPECTED_SHAPE = 'sftp://[user@]host[:port]/absolute/path';
const HOST_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,252}$/;
const IPV6_PATTERN = /^\[[0-9A-Fa-f:.]+\]$/;
const USER_PATTERN = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,63}$/;
const URL_PATTERN = /^(sftp|ssh):\/\//i;
// Optional `user@`, host of 2+ characters (a one-character "host" is a Windows drive letter), a
// colon, then a path that starts with `/` or `~`.
const SCP_PATTERN = /^(?:([^@/:\s]+)@)?(\[[^\]]+\]|[^@/:\s[\]]{2,}):([/~].*)$/;

export const REMOTE_EXIT = { pathMissing: 65, notDirectory: 66, cannotEnter: 67, noPlanning: 68 } as const;

function hasControlCharacter(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

/** Replaces the password segment of `scheme://user:pass@host/...` with `***`. */
function redactRaw(raw: string): string {
  const schemeEnd = raw.indexOf('://');
  if (schemeEnd === -1) return raw;
  const authorityStart = schemeEnd + 3;
  let authorityEnd = raw.length;
  for (let index = authorityStart; index < raw.length; index += 1) {
    if (raw[index] === '/' || raw[index] === '?' || raw[index] === '#') {
      authorityEnd = index;
      break;
    }
  }
  const authority = raw.slice(authorityStart, authorityEnd);
  const at = authority.lastIndexOf('@');
  if (at === -1) return raw;
  const userInfo = authority.slice(0, at);
  const colon = userInfo.indexOf(':');
  if (colon === -1) return raw;
  return `${raw.slice(0, authorityStart)}${userInfo.slice(0, colon)}:***${authority.slice(at)}${raw.slice(authorityEnd)}`;
}

function invalid(rawPath: string, problem: string): RemoteParse {
  return {
    kind: 'invalid',
    status: {
      status: 'path-not-found',
      pathChecked: rawPath,
      rawPath,
      message: `Invalid remote address ${rawPath}: ${problem}. Expected ${EXPECTED_SHAPE}`,
    },
  };
}

interface NormalizedRoot {
  remoteRoot: string;
  /** Root rendered for the label: `/abs`, `/~/rest` (URL) or `~/rest` (scp) handled by caller. */
  homeRelative: boolean;
  display: string;
}

/**
 * Normalizes the path portion. `path` starts with `/` (URL form) or `/`/`~` (scp form), already
 * decoded. Returns null when the root is empty, `/`, or otherwise unusable.
 */
function normalizeRoot(path: string, homeRelative: boolean, restOfHome: string): NormalizedRoot | null {
  let remoteRoot: string;
  if (homeRelative) {
    const normalized = posix.normalize(restOfHome === '' ? '.' : restOfHome).replace(/\/+$/, '') || '.';
    remoteRoot = normalized === '.' ? '.' : `./${normalized}`;
  } else {
    remoteRoot = posix.normalize(path);
    if (remoteRoot.length > 1) remoteRoot = remoteRoot.replace(/\/+$/, '');
  }
  if (posix.basename(remoteRoot) === '.planning') remoteRoot = posix.dirname(remoteRoot);
  if (remoteRoot === '/' || remoteRoot === '' || remoteRoot.startsWith('-')) return null;
  const display = homeRelative ? (remoteRoot === '.' ? '~' : `~/${remoteRoot.slice(2)}`) : remoteRoot;
  return { remoteRoot, homeRelative, display };
}

function parseUrlTarget(raw: string): RemoteParse {
  const rawPath = redactRaw(raw);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return invalid(rawPath, 'the address could not be parsed');
  }
  const scheme = url.protocol.replace(/:$/, '').toLowerCase() as 'sftp' | 'ssh';
  if (url.search !== '' || url.hash !== '') return invalid(rawPath, 'query strings and fragments are not supported');
  if (url.password !== '') return invalid(rawPath, 'passwords in the address are not supported; use ssh keys');

  let user: string | null = null;
  let decodedPath: string;
  try {
    if (url.username !== '') user = decodeURIComponent(url.username);
    decodedPath = decodeURIComponent(url.pathname);
  } catch {
    return invalid(rawPath, 'malformed percent-encoding');
  }

  const hostname = url.hostname;
  const isIpv6 = IPV6_PATTERN.test(hostname);
  if (!isIpv6 && !HOST_PATTERN.test(hostname)) return invalid(rawPath, 'the host name is not valid');
  if (user !== null && !USER_PATTERN.test(user)) return invalid(rawPath, 'the user name is not valid');

  let port: number | null = null;
  if (url.port !== '') {
    port = Number(url.port);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) return invalid(rawPath, 'the port must be 1-65535');
  }

  if (decodedPath === '' || !decodedPath.startsWith('/') || decodedPath === '/') {
    return invalid(rawPath, 'the path must be absolute and name a project');
  }
  if (hasControlCharacter(decodedPath)) return invalid(rawPath, 'the path contains control characters');

  const home = decodedPath === '/~' || decodedPath.startsWith('/~/');
  const root = normalizeRoot(decodedPath, home, home ? decodedPath.slice(3) : '');
  if (!root) return invalid(rawPath, 'the path must name a project directory');

  const host = isIpv6 ? hostname.slice(1, -1) : hostname;
  const authority = `${user !== null ? `${user}@` : ''}${hostname}${port !== null ? `:${port}` : ''}`;
  const pathLabel = root.homeRelative ? (root.display === '~' ? '/~' : `/${root.display}`) : root.display;
  return {
    kind: 'remote',
    target: {
      scheme,
      user,
      host,
      port,
      remoteRoot: root.remoteRoot,
      label: `${scheme}://${authority}${pathLabel}`,
      rawPath,
    },
  };
}

function parseScpTarget(raw: string): RemoteParse | null {
  const match = SCP_PATTERN.exec(raw);
  if (!match) return null;
  const [, user, hostPart, path] = match;
  const isIpv6 = IPV6_PATTERN.test(hostPart);
  if (!isIpv6 && !HOST_PATTERN.test(hostPart)) return null;
  // `sftp:/x` and `ssh:/x` are a malformed URL, not a host named sftp; leave them to the local branch.
  if (/^(sftp|ssh)$/i.test(hostPart)) return null;
  if (user !== undefined && !USER_PATTERN.test(user)) return null;
  // From here on the argument is unmistakably scp-style, so problems are reported, not ignored.
  if (hasControlCharacter(path)) return invalid(raw, 'the path contains control characters');
  const home = path === '~' || path.startsWith('~/');
  const root = normalizeRoot(path, home, home ? path.slice(2) : '');
  if (!root) return invalid(raw, 'the path must name a project directory');
  return {
    kind: 'remote',
    target: {
      scheme: 'scp',
      user: user ?? null,
      host: isIpv6 ? hostPart.slice(1, -1) : hostPart,
      port: null,
      remoteRoot: root.remoteRoot,
      label: `${user !== undefined ? `${user}@` : ''}${hostPart}:${root.display}`,
      rawPath: raw,
    },
  };
}

/**
 * Classifies the raw CLI argument. `local` means "not a remote address": it flows on to
 * resolveTargetPath unchanged. `invalid` carries a ready-made FailedLoadStatus (never throws).
 */
export function parseRemoteTarget(raw: string): RemoteParse {
  if (URL_PATTERN.test(raw)) return parseUrlTarget(raw);
  return parseScpTarget(raw) ?? { kind: 'local' };
}

/** POSIX single-quote quoting: nothing but the closing quote can break out of single quotes. */
export function quoteForRemoteShell(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

export interface CommandSpec {
  command: string;
  args: string[];
}

export interface MirrorCommands {
  ssh: CommandSpec;
  tar: CommandSpec;
  destDir: string;
}

/**
 * The two argv specs that mirror a remote `.planning` into destDir. Spawned with `shell: false`,
 * so nothing here passes through a local shell; the one remote command string is a fixed
 * read-only template.
 */
export function buildMirrorCommands(target: RemoteTarget, destDir: string): MirrorCommands {
  const q = quoteForRemoteShell(target.remoteRoot);
  const remoteCommand =
    `[ -e ${q} ] || exit ${REMOTE_EXIT.pathMissing}; ` +
    `[ -d ${q} ] || exit ${REMOTE_EXIT.notDirectory}; ` +
    `cd ${q} || exit ${REMOTE_EXIT.cannotEnter}; ` +
    `[ -d .planning ] || exit ${REMOTE_EXIT.noPlanning}; ` +
    'exec tar -cf - .planning';
  const sshArgs = ['-T', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', '-o', 'Compression=yes'];
  if (target.port !== null) sshArgs.push('-p', String(target.port));
  if (target.user !== null) sshArgs.push('-l', target.user);
  sshArgs.push('--', target.host, remoteCommand);
  return {
    ssh: { command: 'ssh', args: sshArgs },
    tar: {
      command: 'tar',
      args: ['-x', '-f', '-', '-C', destDir, '--no-same-owner', '--no-same-permissions', '.planning'],
    },
    destDir,
  };
}

export interface MirrorRunResult {
  sshExit: number | null;
  tarExit: number | null;
  sshStderr: string;
  tarStderr: string;
  timedOut: boolean;
  spawnError: { which: 'ssh' | 'tar'; message: string } | null;
}

export type MirrorOutcome = { ok: true; remoteWarning: string | null } | { ok: false; status: FailedLoadStatus };

const EXCERPT_LIMIT = 400;

/** Strips ANSI sequences and control characters, collapses whitespace, caps the length. */
function buildExcerpt(...streams: string[]): string {
  let out = '';
  for (const stream of streams) {
    for (let index = 0; index < stream.length; index += 1) {
      const code = stream.charCodeAt(index);
      if (code === 0x1b && stream[index + 1] === '[') {
        index += 2;
        while (index < stream.length && !(stream.charCodeAt(index) >= 0x40 && stream.charCodeAt(index) <= 0x7e)) {
          index += 1;
        }
        continue;
      }
      out += code <= 0x1f || code === 0x7f ? ' ' : stream[index];
    }
    out += ' ';
  }
  const collapsed = out.replace(/\s+/g, ' ').trim();
  return collapsed.length > EXCERPT_LIMIT ? `${collapsed.slice(0, EXCERPT_LIMIT)}…` : collapsed;
}

/** Maps one mirror run onto an existing LoadStatus variant (or ok), naming the remote address. */
export function classifyMirrorResult(
  result: MirrorRunResult,
  target: RemoteTarget,
  mirrorHasPlanning: boolean,
  timeoutMs: number,
): MirrorOutcome {
  const label = target.label;
  const excerpt = buildExcerpt(result.sshStderr, result.tarStderr);
  const suffix = excerpt ? ` — ${excerpt}` : '';
  const notFound = (message: string): MirrorOutcome => ({
    ok: false,
    status: { status: 'path-not-found', pathChecked: label, rawPath: target.rawPath, message },
  });
  const denied = (message: string): MirrorOutcome => ({
    ok: false,
    status: { status: 'permission-denied', pathChecked: label, message },
  });

  if (result.spawnError) {
    return notFound(`Cannot mirror ${label}: could not start ${result.spawnError.which} (${result.spawnError.message})`);
  }
  if (result.timedOut) {
    return notFound(`Timed out after ${timeoutMs / 1000} s mirroring ${label} over ssh${suffix}`);
  }
  switch (result.sshExit) {
    case REMOTE_EXIT.pathMissing:
      return notFound(`No such path: ${target.rawPath} (checked over ssh: ${label})`);
    case REMOTE_EXIT.notDirectory:
      return notFound(`${label} is a file, not a directory (resolved from ${target.rawPath})`);
    case REMOTE_EXIT.cannotEnter:
      return denied(`${LOAD_STATUS_MESSAGES['permission-denied']({ pathChecked: label })}${suffix}`);
    case REMOTE_EXIT.noPlanning:
      return {
        ok: false,
        status: {
          status: 'not-a-gsd-project',
          pathChecked: label,
          message: LOAD_STATUS_MESSAGES['not-a-gsd-project']({ pathChecked: label }),
        },
      };
    default:
      break;
  }
  if (result.sshExit === 255) {
    if (
      /permission denied|host key verification failed|too many authentication failures|no supported authentication/i.test(
        result.sshStderr,
      )
    ) {
      return denied(`Cannot read ${label}: ssh could not log in to ${target.host}${suffix}`);
    }
    return notFound(`Cannot reach ${target.host} over ssh${suffix}`);
  }
  if (
    (result.sshExit === 0 || result.sshExit === 1 || result.sshExit === 2) &&
    result.tarExit === 0 &&
    mirrorHasPlanning
  ) {
    return { ok: true, remoteWarning: result.sshExit === 0 ? null : excerpt || null };
  }
  return notFound(`Mirroring ${label} failed (ssh exit ${result.sshExit}, tar exit ${result.tarExit})${suffix}`);
}
