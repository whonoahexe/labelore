// Made-up index trees for the Indexes page (Phase 11, 11-13, VIEW-19, D-04). Two shapes Lendshed does not hold:
//   - a large knowledge graph (`writeLargeGraph`): a deterministic graph of any node count, for the scan's
//     oracle and growth tests and for photographing the "counts not read" and big-graph states;
//   - an ingest-docs project (`writeIngestDocsProject`): intel/ holds only the markdown family
//     `/gsd-ingest-docs` writes (SYNTHESIS.md, decisions.md, requirements.md, constraints.md, context.md) and
//     there is no graphs/ folder at all.
// Tests call the writers on a temp folder; 11-14 and later plans run the CLI to photograph the page:
//
//   node test/helpers/index-fixtures.ts --out <folder> --shape large-graph | ingest-docs
//
// Everything written is invented (a seed-tray library, not any real project) and carries the made-up marker the
// fixture rule asks for: top-level keys in the graph JSON, a first-line comment in each markdown file.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DERIVED_GRAPH = 'gsd-core/bin/lib/graphify.cjs';
const DERIVED_SYNTH = 'agents/gsd-doc-synthesizer.md';
const VERSION = '1.19.0';

/** The 40-character commit id every large graph claims to have been built at (invented). */
export const LARGE_GRAPH_COMMIT = '3f9a1c7d52e80b46a9d1c3e7f2058b64a1d9c7e3';

/** A deterministic pseudo-random sequence (a small LCG), so the same node count always gives the same graph. */
function sequence(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Labels that make a naive scanner miscount: structural characters, an escaped quote and non-ASCII text. */
const AWKWARD_LABELS = ['close } brace', 'open { brace', 'bracket ] and [', 'say \\"hi\\"', 'back\\\\slash', 'café 日本語'];

export interface LargeGraphShape {
  /** 'links' (networkx node-link) or 'edges' (the key graphify's own reader prefers). */
  arrayKey?: 'links' | 'edges';
}

/**
 * The text of a made-up graph with `nodes` nodes and about three links per node. Node ids are `n0` .. `n{k}`;
 * a few low-numbered nodes are hubs; every 97th label holds structural characters. Top-level keys come first
 * (the made-up marker, `built_at_commit`), then `nodes`, then the links array.
 */
export function largeGraphText(nodes: number, shape: LargeGraphShape = {}): string {
  const next = sequence(20260914);
  const arrayKey = shape.arrayKey ?? 'links';
  const nodeRows: unknown[] = [];
  for (let i = 0; i < nodes; i += 1) {
    const label = i % 97 === 0 ? `Node ${i} ${AWKWARD_LABELS[(i / 97) % AWKWARD_LABELS.length | 0]}` : `Node ${i}`;
    nodeRows.push({ id: `n${i}`, label, file_type: 'code', source_file: `src/mod${i % 400}.ts`, community: i % 12 });
  }
  const linkRows: unknown[] = [];
  const hubs = Math.max(1, Math.min(12, nodes));
  for (let i = 0; i < nodes; i += 1) {
    for (let k = 0; k < 3; k += 1) {
      const target = k === 0 ? Math.floor(next() * hubs) : Math.floor(next() * nodes);
      linkRows.push({ source: `n${i}`, target: `n${target}`, relation: k === 0 ? 'imports' : 'calls', confidence: 'EXTRACTED' });
    }
  }
  const head = {
    made_up_example: true,
    derived_from: DERIVED_GRAPH,
    gsd_core_version: VERSION,
    directed: false,
    multigraph: false,
    built_at_commit: LARGE_GRAPH_COMMIT,
    graph: {},
  };
  return JSON.stringify({ ...head, nodes: nodeRows, [arrayKey]: linkRows });
}

function writeAt(root: string, relative: string, text: string): void {
  const target = join(root, '.planning', relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text, 'utf8');
}

const MINIMAL_PROJECT = `# Seed Tray Library

## What This Is

A made-up project that exists only so the Indexes page has something to read.
`;

/**
 * Writes `<dir>/.planning/PROJECT.md` and `<dir>/.planning/graphs/graph.json` (a graph of `nodes` nodes) and
 * returns `dir`. The graph has no GRAPH_REPORT.md and no build status, so a summary of it must come from the scan.
 */
export function writeLargeGraph(dir: string, nodes: number, shape: LargeGraphShape = {}): string {
  writeAt(dir, 'PROJECT.md', MINIMAL_PROJECT);
  writeAt(dir, 'graphs/graph.json', largeGraphText(nodes, shape));
  return dir;
}

const MARKER_COMMENT = `<!-- made-up example · derived from ${DERIVED_SYNTH} · gsd-core ${VERSION} -->`;

const SYNTHESIS = `${MARKER_COMMENT}
# Ingest Synthesis

Docs synthesized: 5 (2 ADR, 2 SPEC, 1 PRD)
Decisions locked: 3
Requirements: 4
Conflicts: 1 blockers, 2 competing-variants, 3 auto-resolved

STATUS: BLOCKED — review report before routing

Per-type intel files sit beside this one.
`;

const DECISIONS = `${MARKER_COMMENT}
# Decisions

## Print labels straight to the device
- source: docs/adr/0001-direct-print.md
- status: locked
- decision: A tray label prints straight to the device.
- scope: labels

## Keep a spool file for retries
- source: docs/adr/0002-spool.md
- status: proposed
- decision: A failed print waits in a spool file.
- scope: labels

## Sign trays with a counter
- source: docs/adr/0003-counter.md
- status: locked
- decision: Each tray gets a running counter.
- scope: trays
`;

const REQUIREMENTS = `${MARKER_COMMENT}
# Requirements

## REQ-label-speed
- source: docs/prd/labels.md
- description: A label prints within three seconds of the scan.
- acceptance: Given a tray scan, the label is out within three seconds.
- scope: labels

## REQ-no-half-labels
- source: docs/prd/labels.md
- description: An unplugged printer leaves no half-printed label.
- acceptance: Unplug during a print; no partial label remains.
- scope: labels
`;

const CONSTRAINTS = `${MARKER_COMMENT}
# Constraints

## Printer protocol
- source: docs/spec/printer.md
- type: protocol
- content: The printer speaks a line-based protocol over a serial port.
`;

const CONTEXT = `${MARKER_COMMENT}
# Context

## Bench layout
- source: docs/notes/bench.md
- The label printer sits at the seed bench, one metre from the scanner.
`;

/**
 * Writes an ingest-docs project under `dir`: PROJECT.md and the five markdown intel files, no graphs/ folder, and
 * returns `dir`. SYNTHESIS.md names five documents and a conflicts line of 1 blocker, 2 competing variants and
 * 3 auto-resolved; decisions.md holds two locked and one proposed entry.
 */
export function writeIngestDocsProject(dir: string): string {
  writeAt(dir, 'PROJECT.md', MINIMAL_PROJECT);
  writeAt(dir, 'intel/SYNTHESIS.md', SYNTHESIS);
  writeAt(dir, 'intel/decisions.md', DECISIONS);
  writeAt(dir, 'intel/requirements.md', REQUIREMENTS);
  writeAt(dir, 'intel/constraints.md', CONSTRAINTS);
  writeAt(dir, 'intel/context.md', CONTEXT);
  return dir;
}

// The command line: node test/helpers/index-fixtures.ts --out <folder> --shape large-graph | ingest-docs
function main(argv: readonly string[]): number {
  const valueOf = (flag: string): string | undefined => {
    const at = argv.indexOf(flag);
    return at === -1 ? undefined : argv[at + 1];
  };
  const out = valueOf('--out');
  const shape = valueOf('--shape');
  if (out === undefined || (shape !== 'large-graph' && shape !== 'ingest-docs')) {
    console.log('usage: node test/helpers/index-fixtures.ts --out <folder> --shape large-graph | ingest-docs');
    return 1;
  }
  const root = resolve(out);
  if (shape === 'large-graph') writeLargeGraph(root, 20_000);
  else writeIngestDocsProject(root);
  console.log(root);
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exit(main(process.argv.slice(2)));
}
