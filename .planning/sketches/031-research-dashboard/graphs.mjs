// Sketch 031: each project's System Overview as a DiagramGraph, built by hand from the author's ASCII
// (the shipped extractor can't read either yet). gen-data.mjs lays them out with the shipped layoutLanes.
const L = (main, sub = '', code = false) => ({ main, sub, code, full: sub ? `${main} ${sub}` : main });
const node = (id, kind, label, row, col, details = []) => ({ id, kind, label, details, notes: [], group: null, row, col });
const edge = (from, to, label = '') => ({ from, to, label, directed: true, implied: false });
const graph = (nodes, edges) => ({ nodes, edges, groups: [], quality: 1, dangling: 0, thin: false });

export const GRAPHS = {
  labelore: graph([
    node(0, 'external', L('Disk', '<project>/.planning/ · 234 files'), 0, 0),
    node(1, 'edge', L('PlanningFilesystem', 'Layer A · list · read · exists', true), 2, 0, ['v1: LocalFsPlanningFilesystem(rootPath)', 'v2: WatchedFsPlanningFilesystem adds watch', 'future: MultiProjectRegistry, WritableFsPlanningFilesystem']),
    node(2, 'worker', L('PlanningRepository', 'Layer B · discovery → handlers → assembly', true), 4, 0, ['Discovery: tree walk → ArtifactRef[]', 'Handler registry + GenericMarkdownHandler fallback', 'Assembly: resolve cross-refs eagerly']),
    node(3, 'data', L('Search index', 'in-memory · swapped with the snapshot'), 6, 0),
    node(4, 'data', L('ProjectSnapshot', 'in-memory · one pointer, atomic swap', true), 6, 1),
    node(5, 'service', L('Routes / view models', 'read-only queries on snapshot + index'), 8, 0),
    node(6, 'client', L('UI', 'view per artifact kind · link rewrite'), 10, 0),
  ], [edge(0, 1, 'fs.readdir / readFile / stat'), edge(1, 2, 'RawArtifact'), edge(2, 3), edge(2, 4, 'ProjectSnapshot'), edge(3, 5), edge(4, 5), edge(5, 6)]),
  cinedise: graph([
    node(0, 'client', L('Browser shell', 'ported · Dashboard, Projects, Ingest…'), 0, 0, ['presentation/*.ts (pure view-models)', 'use-health-socket (+custody)']),
    node(1, 'edge', L('Cloudflare tunnel', 'REST (cookie) · /ws (ticket)'), 2, 0),
    node(2, 'service', L('api::*', 'VerifiedIdentity → authz → scope', true), 4, 0, ['NEW: projects, ingest, custody, lifecycle, proxies']),
    node(3, 'service', L('Domain services', 'NEW · projects, ingest, custody, lifecycle'), 6, 0, ['jobs::service (MOD)']),
    node(4, 'worker', L('Job engine', 'MOD · claim gate · TierLocks · lanes'), 8, 0, ['NEW Tool::Ingest, Tool::Ffmpeg', 'reconcile_on_boot (+2 arms)']),
    node(5, 'worker', L('Host sensing', 'MOD · per-tier probers · PSI reader'), 8, 1, ['HealthRegistry (+custody)', 'folder-size walkers (+pause)']),
    node(6, 'data', L('SQLite', 'WAL · synchronous=FULL · NVMe'), 10, 0, ['jobs, projects, ingests, ingest_files, ingest_copies', 'tier_custody, lifecycle_proposals, proxy_items']),
    node(7, 'external', L('Tiers', '/mnt/stage · vault · archive · ingest · cloud'), 12, 0),
  ], [edge(0, 1, 'REST · /ws'), edge(1, 2), edge(2, 3), edge(3, 4), edge(3, 5, 'CustodyHandle'), edge(3, 6), edge(4, 6), edge(4, 7), edge(5, 7, 'probes'), edge(5, 2, 'health frames')]),
};
