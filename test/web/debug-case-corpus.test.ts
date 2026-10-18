// quick-261018-j5h (QJ5H-07): real-corpus guards over every debug session on this machine - labelore's
// own `.planning/debug/`, each sibling project that has one (deid-ui, deid-template-studio, resoundant,
// plan.sideby.me) and the copied synthetic session - built through the real repository load so each file
// reaches the handler with the ref discovery gives it. These are live projects, so the test asserts
// invariants for every file and pins values only for the four named sibling sketch files, using the
// numbers from the sketch's own data.js - never the composer's output.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { LocalFsPlanningFilesystem } from '../../src/planning-fs/local-fs.ts';
import { DebugHandler } from '../../src/planning-repo/handlers/debug.ts';
import { PlanningRepository } from '../../src/planning-repo/snapshot.ts';
import { toProjectPresentation } from '../../src/server/project-presentation.ts';
import type { ProjectPresentation } from '../../src/server/project-presentation.ts';
import { composeDebugCase } from '../../src/web/views/debug-case.ts';
import type { ComposedDebugCase } from '../../src/web/views/debug-case.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import { DEBUG_SIBLING_ROOTS, SKETCH_FILES } from '../helpers/debug-corpus.ts';

const LB_ROOT = new URL('../..', import.meta.url).pathname.replace(/\/$/, '');
const SYN = join(LB_ROOT, 'test/fixtures/debug/search-index-goes-stale.md');
const ROOTS = [LB_ROOT, ...DEBUG_SIBLING_ROOTS];

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) out.push(...walk(abs));
    else out.push(abs);
  }
  return out.sort();
}

/** rehype-slug stand-in: an id per H2 / H3 line, enough to check that targets come from the file. */
function headingsOf(content: string): NonNullable<ViewInput['headings']> {
  const out: NonNullable<ViewInput['headings']> = [];
  let fenced = false;
  for (const line of content.split('\n')) {
    if (line.trimStart().startsWith('```')) fenced = !fenced;
    const m = !fenced && /^(#{2,3}) (.+)$/.exec(line);
    if (m) out.push({ id: `h-${out.length}`, text: m[2].trim(), depth: m[1].length });
  }
  return out;
}

interface Session {
  label: string;
  path: string;
  kind: string;
  frontmatter: Record<string, unknown>;
  structured: Record<string, unknown>;
  content: string;
}

const sessions: Session[] = [];
const knowledgeBases: { label: string; kind: string }[] = [];
const expectedPaths: string[] = [];

beforeAll(async () => {
  for (const root of ROOTS) {
    const repository = new PlanningRepository(new LocalFsPlanningFilesystem(root), root);
    const presentation: ProjectPresentation = toProjectPresentation(await repository.load());
    for (const abs of walk(join(root, '.planning', 'debug'))) {
      const rel = relative(root, abs);
      const name = abs.slice(abs.lastIndexOf('/') + 1);
      const found = presentation.artifacts.find((a) => a.path === rel || a.path.endsWith(rel));
      if (name === 'knowledge-base.md') {
        knowledgeBases.push({ label: `${root}:${rel}`, kind: found?.kind ?? 'missing' });
        continue;
      }
      if (!name.endsWith('.md')) continue;
      expectedPaths.push(`${root}:${rel}`);
      if (!found) {
        sessions.push({ label: `${root}:${rel}`, path: rel, kind: 'missing', frontmatter: {}, structured: {}, content: '' });
        continue;
      }
      sessions.push({
        label: `${root}:${rel}`,
        path: rel,
        kind: found.kind,
        frontmatter: found.frontmatter,
        structured: found.structured,
        content: readFileSync(abs, 'utf8'),
      });
    }
  }
  // The copied synthetic session, parsed directly (it sits outside any .planning folder).
  const content = readFileSync(SYN, 'utf8');
  const path = '.planning/debug/search-index-goes-stale.md';
  const parsed = DebugHandler.parse(
    { path, content, mtimeMs: 0, size: content.length },
    { path, kind: 'debug', location: 'other', phaseIdentity: null, milestoneVersion: null, quickTaskId: null },
  );
  sessions.push({
    label: 'synthetic',
    path,
    kind: 'debug',
    frontmatter: JSON.parse(JSON.stringify(parsed.frontmatter)) as Record<string, unknown>,
    structured: JSON.parse(JSON.stringify(parsed.structured)) as Record<string, unknown>,
    content,
  });
}, 120000);

function compose(s: Session): ComposedDebugCase | null {
  return composeDebugCase({
    kind: s.kind,
    frontmatter: s.frontmatter,
    structured: s.structured,
    groups: [],
    planSegments: [],
    headings: headingsOf(s.content),
  });
}

describe('every debug session on this machine', () => {
  it('reads at least labelore and the synthetic one', () => {
    console.log(`debug corpus: ${sessions.length} sessions in ${ROOTS.length} projects`);
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    expect(sessions.some((s) => s.label === 'synthetic')).toBe(true);
    expect(sessions.some((s) => s.path.endsWith('resolved/loading-state-regression.md'))).toBe(true);
  });

  it('gives every session the debug kind and a projection', () => {
    for (const s of sessions) {
      expect(s.kind, s.label).toBe('debug');
      expect(typeof s.structured.debug, s.label).toBe('object');
    }
  });

  it('composes every session, with a lead that agrees with its status', () => {
    for (const s of sessions) {
      const m = compose(s);
      expect(m, s.label).not.toBeNull();
      if (m === null) continue;
      const status = String(s.frontmatter.status ?? '');
      const variant = m.lead.variant;
      if (status === 'resolved') expect(variant, s.label).toBe('resolved');
      else if (status === 'awaiting_human_verify') expect(['awaiting', 'open'], s.label).toContain(variant);
      else if (status === 'diagnosed') expect(['diagnosed', 'open'], s.label).toContain(variant);
      else if (['gathering', 'investigating', 'fixing', 'verifying'].includes(status)) expect(variant, s.label).toBe('open');
      if (variant === 'open') expect(m.lead.causes, s.label).toBeNull();
    }
  });

  it('keeps the evidence, causes, chips, files and Also targets well formed', () => {
    for (const s of sessions) {
      const m = compose(s);
      if (m === null) continue;
      const ev = m.evidence;
      if (ev !== null) {
        expect(ev.counts.confirms + ev.counts.eliminates + ev.counts.fix + ev.counts.finding, s.label).toBe(ev.total);
        expect(ev.entries.map((e) => e.no), s.label).toEqual(ev.entries.map((_, i) => i + 1));
      }
      for (const cause of m.lead.causes?.items ?? []) {
        expect(cause.label.trim(), s.label).not.toBe('');
        expect(cause.text.trim(), s.label).not.toBe('');
      }
      for (const chip of m.lead.verification?.chips ?? []) expect(['pass', 'fail', 'open'], s.label).toContain(chip.result);
      for (const file of m.lead.files?.items ?? []) {
        expect(file.path.trim(), s.label).not.toBe('');
        expect(file.name, s.label).toBe(file.path.slice(file.path.lastIndexOf('/') + 1));
      }
      const ids = new Set(headingsOf(s.content).map((h) => h.id));
      for (const a of m.also) expect(a.targetId === null || ids.has(a.targetId), `${s.label}: ${a.label}`).toBe(true);
      for (const part of [m.symptoms?.targetId, ev?.targetId, m.resolution?.targetId]) {
        expect(part === undefined || part === null || ids.has(part), s.label).toBe(true);
      }
    }
  });

  it('leaves every knowledge base unrecognised', () => {
    for (const kb of knowledgeBases) expect(kb.kind, kb.label).toBe('unknown');
  });

  it('found every markdown session the walk saw', () => {
    expect(sessions.filter((s) => s.label !== 'synthetic')).toHaveLength(expectedPaths.length);
  });
});

describe('the four sibling sketch sessions', () => {
  const find = (file: string): Session | undefined => sessions.find((s) => file.endsWith(s.path) && file.startsWith(s.label.split(':')[0]));

  it.runIf(existsSync(SKETCH_FILES.dd))('deid awaiting a check', () => {
    const m = compose(find(SKETCH_FILES.dd)!)!;
    expect([m.status.label, m.lead.variant, m.lead.next?.label]).toEqual(['Waiting on you', 'awaiting', 'What you need to check']);
    expect(m.suspects.columns.map((c) => c.items.length)).toEqual([2, 5, 0]);
    expect(m.evidence?.total).toBe(15);
    expect(m.also.map((a) => a.label)).toEqual(['Constraints', 'Reasoning checkpoint', 'Frontmatter']);
  });

  it.runIf(existsSync(SKETCH_FILES.sa))('sideby diagnosed', () => {
    const m = compose(find(SKETCH_FILES.sa)!)!;
    expect([m.status.label, m.lead.variant, m.lead.fix?.label, m.head.updated]).toEqual([
      'Diagnosed · not fixed',
      'diagnosed',
      'Suggested fix · not applied',
      null,
    ]);
    expect(m.suspects.columns.map((c) => c.items.length)).toEqual([1, 2, 0]);
    expect(m.evidence?.total).toBe(4);
  });

  it.runIf(existsSync(SKETCH_FILES.rs))('resoundant resolved', () => {
    const m = compose(find(SKETCH_FILES.rs)!)!;
    expect([m.status.label, m.lead.variant, m.head.archived]).toEqual(['Resolved', 'resolved', true]);
    expect(m.suspects.columns.map((c) => c.items.length)).toEqual([4, 3, 0]);
    expect(m.evidence?.total).toBe(24);
    expect(m.lead.files?.items).toHaveLength(8);
    expect(m.trigger?.short).not.toBeNull();
  });

  it.runIf(existsSync(SKETCH_FILES.sr))('sideby resolved over five rounds', () => {
    const m = compose(find(SKETCH_FILES.sr)!)!;
    expect([m.status.label, m.lead.variant, m.head.archived]).toEqual(['Resolved', 'resolved', false]);
    expect(m.suspects.columns.map((c) => c.items.length)).toEqual([1, 2, 0]);
    expect(m.evidence?.total).toBe(25);
    expect(m.facts.map((f) => f.label)).toContain('Rounds');
    expect(m.also).toHaveLength(12);
  });
});
