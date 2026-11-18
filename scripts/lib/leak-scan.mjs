// The leak-scan library (BUND-05): the one word-boundary rule shared by the repository guard
// (test/fixture-leak.test.ts) and the release script, a scanner for a staged tree, a reader that
// refuses an empty private-names list, and an in-memory reader for the packed npm tarball.
//
// Node builtins only, like scripts/labelore.mjs, so the release script can import it with nothing
// installed. Findings carry the path, the line, the kind and the term's index in its list, and never
// the term itself, so a console report or a transcript does not echo a private name.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { gunzipSync } from 'node:zlib';

/** Git's binary rule: a NUL byte in the first 8000 bytes marks a file as binary. */
const BINARY_PROBE_BYTES = 8000;

/** Word-boundary matcher for a private word. A hyphen in the word also matches a run of whitespace,
 * so the spaced, capitalised form of a hyphenated name is caught too. */
export function wordRegex(word, flags) {
  const body = word
    .split('-')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('(?:-|\\s+)');
  return new RegExp(`\\b${body}\\b`, flags);
}

/** The 1-based line of the character at `index`. */
export function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

/** True when the bytes hold a NUL in the first 8000, so the file is scanned by path only. */
function isBinary(buffer) {
  return buffer.subarray(0, BINARY_PROBE_BYTES).includes(0);
}

/** Words and hosts found in `text`: one finding per term, at its first match. Tool tells stay in the
 * repo guard, because the shipped bundle legitimately holds a public tool name as a working word. */
export function scanText(text, names) {
  const findings = [];
  for (const [kind, list] of [
    ['word', names.words],
    ['host', names.hosts],
  ]) {
    list.forEach((term, index) => {
      const match = wordRegex(term, 'i').exec(text);
      if (match) findings.push({ kind, index, line: lineOf(text, match.index) });
    });
  }
  return findings;
}

/** Path findings: every word that matches any segment of a `/`-separated path (line 0, kind `name`). */
function scanPath(path, names) {
  const segments = path.split('/');
  const findings = [];
  names.words.forEach((word, index) => {
    const regex = wordRegex(word, 'i');
    if (segments.some((segment) => regex.test(segment))) findings.push({ kind: 'name', index, line: 0 });
  });
  return findings;
}

/** Findings for one file: its path, then its body unless the file is binary. */
function scanFile(path, buffer, names) {
  const findings = scanPath(path, names).map((f) => ({ path, ...f }));
  if (!isBinary(buffer)) {
    for (const f of scanText(buffer.toString('utf8'), names)) findings.push({ path, ...f });
  }
  return findings;
}

/** Every regular file under `root`, as root-relative `/`-separated paths, sorted. */
function walkFiles(root) {
  const out = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) out.push(relative(root, full).split(sep).join('/'));
    }
  };
  visit(root);
  return out.sort();
}

/** Scans every regular file under `root`: path segments against the words, then the UTF-8 text
 * unless the file is binary. Returns `{ path, kind, index, line }` findings. */
export function scanTree(root, names) {
  const findings = [];
  for (const path of walkFiles(root)) findings.push(...scanFile(path, readFileSync(join(root, path)), names));
  return findings;
}

function isNameList(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
}

/** Reads the private-names file and refuses to let a scan run with nothing to look for: a missing
 * file, unparseable JSON, a non-string entry and an empty words list all throw, each naming the file
 * (D-09). An empty hosts list is accepted. */
export function readNamesFile(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    throw new Error(`${path} is missing`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }
  const record = typeof parsed === 'object' && parsed !== null ? parsed : {};
  if (!isNameList(record.words) || !isNameList(record.hosts)) {
    throw new Error(`${path} must be {"words": string[], "hosts": string[]} with non-empty strings`);
  }
  if (record.words.length === 0) {
    throw new Error(`${path} lists no private words; the release leak scan cannot run with an empty list`);
  }
  return { words: record.words, hosts: record.hosts };
}

/** A NUL-terminated field of a tar header as text. */
function field(header, start, end) {
  return header.toString('utf8', start, end).replace(/\0.*$/s, '');
}

/** A header size field: octal text, or base-256 when the high bit of the first byte is set. */
function headerSize(header) {
  if (header[124] & 0x80) {
    let size = header[124] & 0x7f;
    for (let i = 125; i < 136; i++) size = size * 256 + header[i];
    return size;
  }
  return parseInt(field(header, 124, 136).trim() || '0', 8);
}

/** The `path=` value of a PAX extended-header body (records are `<len> <key>=<value>\n`). */
function paxPath(body) {
  let path = null;
  for (let offset = 0; offset < body.length; ) {
    const space = body.indexOf(0x20, offset);
    if (space < 0) break;
    const length = parseInt(body.toString('utf8', offset, space), 10);
    if (!(length > 0)) break;
    const record = body.toString('utf8', space + 1, offset + length - 1);
    const eq = record.indexOf('=');
    if (eq > 0 && record.slice(0, eq) === 'path') path = record.slice(eq + 1);
    offset += length;
  }
  return path;
}

/** Entries of a decompressed tar: 512-byte headers, the name at bytes 0-100, the octal size at
 * 124-136, the typeflag at 156, the ustar prefix at 345-500 joined to the name with `/`, bodies padded
 * to 512 bytes, stopping at a zero block. A PAX `x` header sets the next entry's path from its
 * `path=` record; a `g` header is skipped; a GNU `L` header names the next entry. Yields
 * `{ path, type, body }`. */
export function* tarEntries(buffer) {
  let nextPath = null;
  for (let offset = 0; offset + 512 <= buffer.length; ) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) return;
    const size = headerSize(header);
    const type = String.fromCharCode(header[156] || 48);
    const body = buffer.subarray(offset + 512, offset + 512 + size);
    offset += 512 + Math.ceil(size / 512) * 512;
    if (type === 'x') {
      nextPath = paxPath(body) ?? nextPath;
      continue;
    }
    if (type === 'g') continue;
    if (type === 'L') {
      nextPath = body.toString('utf8').replace(/\0.*$/s, '');
      continue;
    }
    const name = field(header, 0, 100);
    const prefix = field(header, 345, 500);
    const path = nextPath ?? (prefix ? `${prefix}/${name}` : name);
    nextPath = null;
    yield { path, type, body };
  }
}

/** Reads a gzipped tarball into memory once and lists every entry with its full path. Throws on a
 * hard-link or symlink entry, naming it, so no entry escapes the scan. Returns `{ buffer, entries }`
 * where `buffer` is the exact gzipped bytes read from disk, so a caller can hash what it scans. */
export function readTarball(tgzPath) {
  const buffer = readFileSync(tgzPath);
  const entries = [];
  for (const entry of tarEntries(gunzipSync(buffer))) {
    if (entry.type === '1' || entry.type === '2') throw new Error(`Refusing a link entry in ${tgzPath}: ${entry.path}`);
    entries.push(entry);
  }
  return { buffer, entries };
}

/** Scans the file entries of a packed tarball: every path against the words, every body that is not
 * binary through scanText. Returns `{ path, kind, index, line }` findings (line 0 for a path finding). */
export function scanTarball(entries, names) {
  const findings = [];
  for (const entry of entries) {
    if (entry.type !== '0' && entry.type !== '7') continue;
    findings.push(...scanFile(entry.path, entry.body, names));
  }
  return findings;
}
