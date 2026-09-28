// quick-260923-jxp (JXP-05, JXP-08): real-corpus guards. Every discussion log in this repo's
// `.planning/` (including `milestones/*-phases/`) plus `~/studio-portal/.planning/` must yield
// its pinned question count — the review's whole premise is "no discussion log drops a
// question." Studio-portal fixtures are gated with `it.runIf(existsSync(...))` (house pattern,
// `test/rendering/plan-sections.test.ts`); this repo's own logs always run.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { SP_PLANNING } from '../helpers/studio-portal.ts';
import {
  composeDocumentLayout,
  type ComposedDocumentLayout,
} from '../../src/web/views/layout.ts';
import { discussionLogLayout } from '../../src/web/views/layout-discussion-log.ts';
import { extractDiscussionLog } from '../../src/planning-repo/handlers/section-projection.ts';
import type { ViewInput, ViewManifest } from '../../src/web/views/manifest.ts';

const REPO_ROOT = new URL('../../', import.meta.url);
const SP_ROOT = SP_PLANNING;

async function repoBody(relativePath: string): Promise<string> {
  return await readFile(new URL(relativePath, REPO_ROOT), 'utf8');
}

interface LogCase {
  label: string;
  path: string;
  questionCount: number;
  isRepoFile: boolean;
}

const CASES: LogCase[] = [
  {
    label: 'LB v1.0/01',
    path: '.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-DISCUSSION-LOG.md',
    questionCount: 16,
    isRepoFile: true,
  },
  {
    label: 'LB v1.0/02',
    path: '.planning/milestones/v1.0-phases/02-situational-awareness-artifact-reading/02-DISCUSSION-LOG.md',
    questionCount: 16,
    isRepoFile: true,
  },
  {
    label: 'LB v1.0/03',
    path: '.planning/milestones/v1.0-phases/03-search-browsing-traceability/03-DISCUSSION-LOG.md',
    questionCount: 16,
    isRepoFile: true,
  },
  {
    label: 'LB v1.0/04',
    path: '.planning/milestones/v1.0-phases/04-portability-degradation-hardening/04-DISCUSSION-LOG.md',
    questionCount: 16,
    isRepoFile: true,
  },
  {
    label: 'LB v1.1/05',
    path: '.planning/milestones/v1.1-phases/05-per-type-document-views/05-DISCUSSION-LOG.md',
    questionCount: 15,
    isRepoFile: true,
  },
  {
    label: 'SP v1.0/01',
    path: `${SP_ROOT}/milestones/v1.0-phases/01-identity-persistence-foundation/01-DISCUSSION-LOG.md`,
    questionCount: 4,
    isRepoFile: false,
  },
  {
    label: 'SP v1.0/02',
    path: `${SP_ROOT}/milestones/v1.0-phases/02-storage-health-status/02-DISCUSSION-LOG.md`,
    questionCount: 16,
    isRepoFile: false,
  },
  {
    label: 'SP v1.0/03',
    path: `${SP_ROOT}/milestones/v1.0-phases/03-file-browsing/03-DISCUSSION-LOG.md`,
    questionCount: 16,
    isRepoFile: false,
  },
  {
    label: 'SP v1.0/04',
    path: `${SP_ROOT}/milestones/v1.0-phases/04-tier-to-tier-transfers/04-DISCUSSION-LOG.md`,
    questionCount: 25,
    isRepoFile: false,
  },
  {
    label: 'SP phases/01',
    path: `${SP_ROOT}/phases/01-portal-owned-identity-sessions/01-DISCUSSION-LOG.md`,
    questionCount: 19,
    isRepoFile: false,
  },
  {
    label: 'SP phases/02',
    path: `${SP_ROOT}/phases/02-roles-permission-enforcement/02-DISCUSSION-LOG.md`,
    questionCount: 16,
    isRepoFile: false,
  },
  {
    label: 'SP phases/03',
    path: `${SP_ROOT}/phases/03-account-administration-session-control/03-DISCUSSION-LOG.md`,
    questionCount: 17,
    isRepoFile: false,
  },
  {
    label: 'SP phases/04',
    path: `${SP_ROOT}/phases/04-bulk-archive-downloads/04-DISCUSSION-LOG.md`,
    questionCount: 18,
    isRepoFile: false,
  },
];

async function bodyOf(testCase: LogCase): Promise<string> {
  return testCase.isRepoFile ? await repoBody(testCase.path) : await readFile(testCase.path, 'utf8');
}

describe('discussion-log corpus — pinned question counts (JXP-05: no dropped question)', () => {
  for (const testCase of CASES) {
    const run = testCase.isRepoFile ? it : it.runIf(existsSync(testCase.path));
    run(`${testCase.label} yields ${testCase.questionCount} questions`, async () => {
      const body = await bodyOf(testCase);
      const { questions } = extractDiscussionLog(body);
      expect(questions).toHaveLength(testCase.questionCount);
    });
  }
});

describe('SP phases/01 repro (JXP-05): the renamed CLI question', () => {
  const path = `${SP_ROOT}/phases/01-portal-owned-identity-sessions/01-DISCUSSION-LOG.md`;

  it.runIf(existsSync(path))('resolves chosen, chosenIndex 1, qualifier "renamed", userChoice containing "backstage"', async () => {
    const body = await readFile(path, 'utf8');
    const { questions } = extractDiscussionLog(body);
    const q = questions.find((question) =>
      question.question.startsWith('How does the very first account come into existence?'),
    );
    expect(q).toBeDefined();
    expect(q).toMatchObject({ resolution: 'chosen', chosenIndex: 1, qualifier: 'renamed' });
    expect(q!.userChoice).toContain('backstage');
  });
});

// ---------------------------------------------------------------------------
// JXP-08: every cover number equals what the page renders — checked against real logs (parsed
// output plus the composed layout), not just synthetic fixtures.
// ---------------------------------------------------------------------------

function composedFor(body: string): ComposedDocumentLayout {
  const structured = extractDiscussionLog(body) as unknown as Record<string, unknown>;
  const manifest: ViewManifest = {
    kind: 'discussion-log',
    lead: 'lead.',
    promote: [],
    layout: discussionLogLayout,
  };
  const input: ViewInput = {
    kind: 'discussion-log',
    frontmatter: {},
    structured,
    groups: [],
    planSegments: [],
  };
  const composed = composeDocumentLayout(manifest, input);
  expect(composed).not.toBeNull();
  return composed!;
}

interface CoverCase {
  label: string;
  path: string;
  isRepoFile: boolean;
  discussedFact: string;
}

const COVER_CASES: CoverCase[] = [
  {
    label: 'LB v1.0/01',
    path: '.planning/milestones/v1.0-phases/01-read-layer-domain-model/01-DISCUSSION-LOG.md',
    isRepoFile: true,
    discussedFact: '4 of 6 offered areas',
  },
  {
    label: 'LB v1.0/03',
    path: '.planning/milestones/v1.0-phases/03-search-browsing-traceability/03-DISCUSSION-LOG.md',
    isRepoFile: true,
    discussedFact: '4 of 8 offered areas',
  },
  {
    label: 'SP phases/01',
    path: `${SP_ROOT}/phases/01-portal-owned-identity-sessions/01-DISCUSSION-LOG.md`,
    isRepoFile: false,
    discussedFact: '4 of 4 offered areas',
  },
  {
    label: 'SP phases/04',
    path: `${SP_ROOT}/phases/04-bulk-archive-downloads/04-DISCUSSION-LOG.md`,
    isRepoFile: false,
    discussedFact: '4 of 7 offered areas',
  },
  {
    label: 'SP v1.0/04',
    path: `${SP_ROOT}/milestones/v1.0-phases/04-tier-to-tier-transfers/04-DISCUSSION-LOG.md`,
    isRepoFile: false,
    discussedFact: '8 of 8 offered areas',
  },
];

describe('discussion-log corpus — cover numbers equal rendered counts (JXP-08)', () => {
  for (const testCase of COVER_CASES) {
    const run = testCase.isRepoFile ? it : it.runIf(existsSync(testCase.path));
    run(`${testCase.label}: headline/pills/facts match rendered chapters and items`, async () => {
      const body = testCase.isRepoFile ? await repoBody(testCase.path) : await readFile(testCase.path, 'utf8');
      const layout = composedFor(body);

      const allItems = layout.chapters.flatMap((c) => c.items ?? []);
      const notOpenCount = allItems.filter((item) => item.state?.label !== 'Open').length;
      expect(layout.cover.headline?.value).toBe(String(notOpenCount));

      const topicsPill = layout.cover.pills.find((p) => p.label === 'Topic' || p.label === 'Topics');
      expect(topicsPill?.value).toBe(String(layout.chapters.length));

      const claudeCount = allItems.filter((item) => item.state?.label === 'Claude chose').length;
      const claudePill = layout.cover.pills.find((p) => p.label === 'Left to Claude');
      if (claudeCount > 0) {
        expect(claudePill?.value).toBe(String(claudeCount));
      } else {
        expect(claudePill).toBeUndefined();
      }

      const discussedFact = layout.cover.facts.find((f) => f.label === 'Discussed');
      expect(discussedFact?.value).toBe(testCase.discussedFact);
    });
  }
});
