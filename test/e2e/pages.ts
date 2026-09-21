// The page matrix every foundation-consistency check iterates: the four reference pages, one
// artifact per `artifact.kind` present in the corpus (picked deterministically, never
// hardcoded), and one plan-pair page. Built once per run from the live `/api/presentation`
// payload — never from a fixture list — so the sweep always reflects this repo's own
// `.planning/` corpus.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { VIEW_KINDS } from '../../src/web/views/kinds.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** `test/e2e/screenshots` — resolved from this file's own location so it is stable regardless
 * of the process's current working directory. */
export const SCREENSHOT_ROOT = join(__dirname, 'screenshots');

export interface PageSpec {
  id: string;
  url: string;
  family: 'reference' | 'artifact' | 'plan-pair';
  kind: string | null;
  registered: boolean;
}

interface ArtifactDto {
  key: string;
  path: string;
  kind: string;
}

interface PlanDto {
  key: string;
  summary: { key: string; path: string } | null;
  [k: string]: unknown;
}

interface PhaseDto {
  plans: PlanDto[];
  [k: string]: unknown;
}

interface MilestoneDto {
  phases: PhaseDto[];
  [k: string]: unknown;
}

interface ProjectPresentation {
  milestones: MilestoneDto[];
  artifacts: ArtifactDto[];
  [k: string]: unknown;
}

export interface PageMatrix {
  pages: PageSpec[];
  kindsWithoutFixture: string[];
}

const REFERENCE_SPECS: PageSpec[] = [
  { id: 'ref-dashboard', url: '/', family: 'reference', kind: null, registered: true },
  { id: 'ref-roadmap', url: '/roadmap', family: 'reference', kind: null, registered: true },
  {
    id: 'ref-traceability',
    url: '/traceability',
    family: 'reference',
    kind: null,
    registered: true,
  },
  {
    id: 'ref-search',
    url: '/search?q=phase',
    family: 'reference',
    kind: null,
    registered: true,
  },
];

export async function buildPageMatrix(baseURL: string): Promise<PageMatrix> {
  const response = await fetch(`${baseURL}/api/presentation`);
  if (!response.ok) {
    throw new Error(`buildPageMatrix: /api/presentation responded ${response.status}`);
  }
  const presentation = (await response.json()) as ProjectPresentation;

  const byKind = new Map<string, ArtifactDto>();
  for (const artifact of presentation.artifacts) {
    const existing = byKind.get(artifact.kind);
    // Deterministic pick: lexically smallest path wins per kind.
    if (!existing || artifact.path < existing.path) {
      byKind.set(artifact.kind, artifact);
    }
  }

  const viewKindSet = new Set<string>(VIEW_KINDS);
  const docSpecs: PageSpec[] = [...byKind.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([kind, artifact]) => ({
      id: `doc-${kind}`,
      url: artifact.key,
      family: 'artifact' as const,
      kind,
      registered: viewKindSet.has(kind),
    }));

  let planPairSpec: PageSpec | null = null;
  outer: for (const milestone of presentation.milestones) {
    for (const phase of milestone.phases) {
      for (const plan of phase.plans) {
        if (plan.summary !== null) {
          planPairSpec = {
            id: 'doc-plan-pair',
            url: plan.key,
            family: 'plan-pair',
            kind: null,
            registered: true,
          };
          break outer;
        }
      }
    }
  }

  const kindsSeen = new Set(byKind.keys());
  const kindsWithoutFixture = VIEW_KINDS.filter((kind) => !kindsSeen.has(kind));

  const pages: PageSpec[] = [...REFERENCE_SPECS, ...docSpecs];
  if (planPairSpec) pages.push(planPairSpec);

  return { pages, kindsWithoutFixture };
}
