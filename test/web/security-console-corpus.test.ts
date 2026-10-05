// quick-261003-527 (Q527-09): real-corpus guards over every SECURITY.md in this repo's `.planning/`
// (excluding the sketches), fixtures/dense and `~/studio-portal/.planning/`, plus the sketch's
// synthetic open-threats doc built in-test from studio-portal's phase 03 — the uat-session-corpus
// idiom (a missing studio-portal checkout skips its files). Every file must extract without
// throwing, compose to a non-null console through the real handler, and match the counts pinned
// below. The pinned counts were independently confirmed with awk over the source files (`| T-`
// rows and their Status / Severity / Disposition / Category cells inside `## Threat Register`,
// `| R-` / `| AR-` rows inside `## Accepted Risks Log`, dated rows inside `## Security Audit
// Trail`, `- [` lines inside `## Sign-Off`) — never copied from the extractor's own output.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import { synthesize } from '../helpers/security-synthetic.ts';
import { SecurityHandler } from '../../src/planning-repo/handlers/security.ts';
import { extractSecurityRegister } from '../../src/planning-repo/handlers/security-register.ts';
import type { ArtifactRef, RawArtifact } from '../../src/planning-repo/types.ts';
import { composeSecurityConsole } from '../../src/web/views/security-console.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';

const REPO_PLANNING = new URL('../../.planning', import.meta.url).pathname;
const DENSE_PLANNING = new URL('../../fixtures/dense/.planning', import.meta.url).pathname;

function walkSecurity(root: string): string[] {
  if (!existsSync(root)) return [];
  const found: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop() as string;
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) {
        if (entry === 'sketches' || entry === 'node_modules') continue;
        stack.push(abs);
      } else if (entry.endsWith('-SECURITY.md')) {
        found.push(abs);
      }
    }
  }
  return found.sort();
}

interface Pinned {
  rows: number;
  open: number;
  openLow: number;
  closed: number;
  severity: Record<string, number>;
  disposition: Record<string, number>;
  columns: Record<string, number>;
  boundaries: number;
  /** Shared destination blocks (two or more crossings). */
  destinations: number;
  /** Rows gathered into the one-crossing list. */
  singles: number;
  /** Rows with no arrow, held in the at-rest block. */
  stores: number;
  risks: number;
  audit: number;
  signoff: [number, number];
  extras: string[];
  /** Residual-observation items (the toggle); omitted means 0. */
  residuals?: number;
  grouped: boolean;
  status: string;
}

const SEV_HIGH_MED_LOW = { critical: 0, high: 25, medium: 9, low: 8 };
const SP3_COLS = { S: 4, T: 10, R: 5, I: 12, D: 4, E: 7 };

/** Keyed by `<repo>:<path suffix>`. */
const PINNED: Record<string, Pinned> = {
  'SYN:synthetic': {
    rows: 42, open: 2, openLow: 0, closed: 40, severity: SEV_HIGH_MED_LOW,
    disposition: { mitigate: 31, accept: 11 }, columns: SP3_COLS, boundaries: 10, destinations: 0, singles: 10,
    stores: 0, risks: 11, audit: 2, signoff: [0, 4], extras: [], grouped: false, status: 'open',
  },
  'SP:phases/01-portal-owned-identity-sessions/01-SECURITY.md': {
    rows: 44, open: 0, openLow: 0, closed: 44, severity: { critical: 2, high: 20, medium: 11, low: 11 },
    disposition: { mitigate: 34, accept: 9, transfer: 1 }, columns: { S: 9, T: 7, R: 2, I: 8, D: 9, E: 9 },
    boundaries: 10, destinations: 1, singles: 6, stores: 2, risks: 9, audit: 1, signoff: [4, 4], extras: [],
    residuals: 3, grouped: false, status: 'verified',
  },
  'SP:phases/03-account-administration-session-control/03-SECURITY.md': {
    rows: 42, open: 0, openLow: 0, closed: 42, severity: SEV_HIGH_MED_LOW,
    disposition: { mitigate: 31, accept: 11 }, columns: SP3_COLS, boundaries: 10, destinations: 0, singles: 10,
    stores: 0, risks: 11, audit: 1, signoff: [4, 4], extras: [], grouped: false, status: 'verified',
  },
  'LB:milestones/v1.1-phases/05-per-type-document-views/05-SECURITY.md': {
    rows: 19, open: 0, openLow: 1, closed: 18, severity: { high: 4, medium: 5, low: 10 },
    disposition: { mitigate: 11, accept: 8 }, columns: { S: 1, T: 8, I: 3, D: 6, E: 1 }, boundaries: 8,
    destinations: 0, singles: 8, stores: 0, risks: 8, audit: 1, signoff: [4, 4], extras: [], grouped: false, status: 'verified',
  },
  'LB:milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-SECURITY.md': {
    rows: 14, open: 0, openLow: 0, closed: 14, severity: { high: 11, medium: 3 },
    disposition: { mitigate: 11, mixed: 3 }, columns: { other: 14 }, boundaries: 4, destinations: 0, singles: 4, stores: 0, risks: 1,
    audit: 2, signoff: [3, 3],
    extras: ['Hardening Notes (not threat status changes)', 'Unregistered Flags', 'Register Scope Note'],
    grouped: true, status: 'verified',
  },
  'LB:milestones/v1.0-phases/04-portability-degradation-hardening/04-SECURITY.md': {
    rows: 29, open: 0, openLow: 0, closed: 29, severity: { high: 5, medium: 8, low: 16 },
    disposition: { mitigate: 15, accept: 14 }, columns: { T: 15, R: 2, I: 6, D: 5, E: 1 }, boundaries: 3,
    destinations: 0, singles: 3, stores: 0, risks: 0, audit: 1, signoff: [4, 4], extras: [], grouped: false, status: 'verified',
  },
  'LB:milestones/v1.0-phases/01-read-layer-domain-model/01-SECURITY.md': {
    rows: 16, open: 0, openLow: 0, closed: 16, severity: { high: 8, medium: 4, low: 4 },
    disposition: { mitigate: 12, accept: 4 }, columns: { S: 1, T: 7, R: 1, I: 4, D: 3 }, boundaries: 4,
    destinations: 0, singles: 4, stores: 0, risks: 4, audit: 1, signoff: [4, 4], extras: [], grouped: false, status: 'verified',
  },
  'LB:milestones/v1.0-phases/03-search-browsing-traceability/03-SECURITY.md': {
    rows: 21, open: 0, openLow: 0, closed: 21, severity: { high: 12, medium: 3, low: 6 },
    disposition: { mitigate: 17, accept: 4 }, columns: { T: 10, R: 1, I: 4, D: 6 }, boundaries: 4,
    destinations: 0, singles: 4, stores: 0, risks: 4, audit: 1, signoff: [4, 4], extras: [], grouped: false, status: 'verified',
  },
  'FX:phases/01-identity-slice/01-SECURITY.md': {
    rows: 1, open: 1, openLow: 0, closed: 0, severity: { medium: 1 }, disposition: { mitigate: 1 },
    columns: { T: 1 }, boundaries: 1, destinations: 0, singles: 1, stores: 0, risks: 0, audit: 1, signoff: [1, 4], extras: [],
    grouped: false, status: 'draft',
  },
};

interface Loaded {
  key: string;
  content: string;
}

function load(): Loaded[] {
  const files: Loaded[] = [];
  for (const abs of walkSecurity(REPO_PLANNING)) {
    files.push({ key: `LB:${relative(REPO_PLANNING, abs)}`, content: readFileSync(abs, 'utf8') });
  }
  for (const abs of walkSecurity(DENSE_PLANNING)) {
    files.push({ key: `FX:${relative(DENSE_PLANNING, abs)}`, content: readFileSync(abs, 'utf8') });
  }
  for (const abs of walkSecurity(SP_PLANNING)) {
    const rel = relative(SP_PLANNING, abs);
    if (!rel.startsWith('phases/')) continue;
    files.push({ key: `SP:${rel}`, content: readFileSync(abs, 'utf8') });
  }
  const sp3 = `${SP_PLANNING}/phases/03-account-administration-session-control/03-SECURITY.md`;
  if (existsSync(sp3)) files.push({ key: 'SYN:synthetic', content: synthesize(readFileSync(sp3, 'utf8')) });
  return files;
}

function inputFor(content: string): ViewInput {
  const ref: ArtifactRef = {
    path: '.planning/phases/01-x/01-SECURITY.md',
    kind: 'security',
    location: 'phase',
    phaseIdentity: null,
    milestoneVersion: null,
    quickTaskId: null,
  };
  const raw: RawArtifact = { path: ref.path, content, mtimeMs: 0, size: content.length };
  const parsed = SecurityHandler.parse(raw, ref);
  return {
    kind: 'security',
    frontmatter: parsed.frontmatter as Record<string, unknown>,
    structured: parsed.structured as Record<string, unknown>,
    groups: [],
    planSegments: [],
    headings: [],
  };
}

function tally<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return out;
}

describe('security console corpus (Q527-09)', () => {
  const files = load();

  it('finds the corpus', () => {
    expect(files.some((f) => f.key.startsWith('LB:'))).toBe(true);
    expect(files.some((f) => f.key.startsWith('FX:'))).toBe(true);
  });

  it('every corpus file is pinned, and every pinned file that exists is walked', () => {
    const keys = files.map((f) => f.key);
    for (const key of keys) expect(Object.keys(PINNED), `unpinned: ${key}`).toContain(key);
    for (const key of Object.keys(PINNED)) {
      if (key.startsWith('SP:') || key.startsWith('SYN:')) {
        if (!existsSync(SP_PLANNING)) continue;
      }
      expect(keys, `not walked: ${key}`).toContain(key);
    }
  });

  for (const file of files) {
    const pinned = PINNED[file.key];
    if (!pinned) continue;
    it(`${file.key} extracts, composes and matches the pinned counts`, () => {
      expect(() => extractSecurityRegister(file.content)).not.toThrow();
      const model = composeSecurityConsole(inputFor(file.content));
      expect(model).not.toBeNull();
      if (!model) return;
      const threats = model.threats;
      expect(threats).toHaveLength(pinned.rows);
      expect(threats.filter((t) => t.status === 'open')).toHaveLength(pinned.open);
      expect(threats.filter((t) => t.status === 'open-low')).toHaveLength(pinned.openLow);
      expect(threats.filter((t) => t.status === 'closed')).toHaveLength(pinned.closed);
      expect(tally(threats, (t) => t.severity.level)).toEqual(
        Object.fromEntries(Object.entries(pinned.severity).filter(([, n]) => n > 0)),
      );
      expect(tally(threats, (t) => t.disposition)).toEqual(pinned.disposition);
      expect(tally(threats, (t) => t.column)).toEqual(pinned.columns);
      expect(model.board.columns.map((c) => c.key).filter((k) => k !== 'other')).toEqual(
        ['S', 'T', 'R', 'I', 'D', 'E'].filter((k) => k in pinned.columns),
      );
      const blocks = model.boundaries?.destinations ?? [];
      expect(model.boundaries?.total ?? 0).toBe(pinned.boundaries);
      expect(blocks.filter((b) => b.kind === 'shared')).toHaveLength(pinned.destinations);
      expect(blocks.filter((b) => b.kind === 'single').flatMap((b) => b.crossings)).toHaveLength(pinned.singles);
      expect(blocks.filter((b) => b.kind === 'at-rest').flatMap((b) => b.crossings)).toHaveLength(pinned.stores);
      // Every boundary row lands in exactly one block.
      expect(blocks.flatMap((b) => b.crossings.map((c) => c.index)).sort((a, b) => a - b)).toEqual(
        Array.from({ length: pinned.boundaries }, (_, i) => i),
      );
      expect(model.waivers.rows).toHaveLength(pinned.risks);
      expect(model.audit?.runs ?? []).toHaveLength(pinned.audit);
      expect(model.signoff ? [model.signoff.done, model.signoff.total] : null).toEqual(pinned.signoff);
      expect(model.extras.map((e) => e.heading)).toEqual(pinned.extras);
      expect(model.residuals?.items ?? []).toHaveLength(pinned.residuals ?? 0);
      expect(model.board.unit).toBe(pinned.grouped ? 'groups' : 'threats');
      expect(model.intro.status.label.toLowerCase()).toBe(pinned.status);
      // Every register row has a square on the board.
      const squares = model.board.rows.flatMap((r) => r.cells.flatMap((c) => c.threatIndexes));
      expect(squares.sort((a, b) => a - b)).toEqual(threats.map((t) => t.index));
    });
  }

  it('the synthetic doc reads two blocking threats and its first audit open cell as written', () => {
    const syn = files.find((f) => f.key === 'SYN:synthetic');
    if (!syn) return;
    const model = composeSecurityConsole(inputFor(syn.content));
    expect(model?.gauge).toMatchObject({ open: 2, alarm: true, verdict: 'blocking sign-off', closedLine: '40 of 42 closed' });
    expect(model?.threats.filter((t) => t.status === 'open').map((t) => t.ref)).toEqual(['T-03-03', 'T-03-09']);
    expect(model?.audit?.runs[0].openText).toBe('3 (2 blocking)');
    expect(model?.stamp).toMatchObject({ signed: false, approval: 'pending — two high threats open' });
  });

  it('LB v1.0/02 reads its long rationale as clamped and its legend-less sibling keeps one source-only entry', () => {
    const lb02 = files.find((f) => f.key.includes('02-situational'));
    const lb04 = files.find((f) => f.key.includes('04-portability'));
    if (!lb02 || !lb04) return;
    const m02 = composeSecurityConsole(inputFor(lb02.content));
    expect(m02?.waivers.rows[0].long).toBe(true);
    const m04 = composeSecurityConsole(inputFor(lb04.content));
    expect(m04?.sourceOnly.map((s) => s.label)).toEqual(['Frontmatter']);
    expect(m04?.waivers.rows).toEqual([]);
  });

  it('LB v1.0/03 (not in the sketch) composes with lower-case categories mapped to STRIDE columns', () => {
    const lb03 = files.find((f) => f.key.includes('03-search-browsing'));
    if (!lb03) return;
    const model = composeSecurityConsole(inputFor(lb03.content));
    expect(model?.board.columns.map((c) => c.key)).toEqual(['T', 'R', 'I', 'D']);
  });
});
