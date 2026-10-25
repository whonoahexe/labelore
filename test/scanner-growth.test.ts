// SEC-01, TEST-01 (T-06-05): standing growth tests for the section, register and mention scanners on
// hostile input. This closes 05-SECURITY closing note 1: the "5k-row synthetic table" and "10k-line
// synthetic body" regression tests the v1.1 threat register promised were never written.
//
// The scanners were measured linear before this file existed, so every test is expected to pass on its
// first run. They still ship: a scanner that later turns quadratic must fail here. Inputs come from
// make(n) so measureGrowth builds them outside the timed region (n counts characters, so every shape
// reaches the same few hundred kilobytes), and every shape stays below the size
// caps the scanners enforce (the caps-are-not-growth rule in test/helpers/growth.ts).
import { describe, expect, it } from 'vitest';
import {
  parseChecklistItems,
  parseMarkdownTable,
  splitSections,
  splitSubsections,
} from '../src/planning-repo/handlers/markdown-sections.ts';
import { extractSecurityRegister } from '../src/planning-repo/handlers/security-register.ts';
import {
  extractDiscussionLog,
  extractReviewWarnings,
  parseDecisionEntries,
} from '../src/planning-repo/handlers/section-projection.ts';
import { scanMentions } from '../src/planning-repo/mentions.ts';
import type { ParsedArtifact } from '../src/planning-repo/types.ts';
import { GROWTH_LIMIT, measureGrowth } from './helpers/growth.ts';

const TIMEOUT = 60_000;

type Shape = [name: string, make: (n: number) => string];

const TABLE_HEAD = '## Topic\n\n| Question | Options | Selected |\n|---|---|---|\n';

// The shapes every markdown scanner is run over: thousands of table rows, thousands of heading pairs,
// one line of pipes then asterisks then a check mark, one very long line, and long capital/digit runs.
const MARKDOWN_SHAPES: Shape[] = [
  ['table rows', (n) => `${TABLE_HEAD}${'| Q | a / b / c | a |\n'.repeat(Math.ceil(n / 22))}`],
  [
    'heading pairs',
    (n) => Array.from({ length: Math.ceil(n / 24) }, (_, i) => `## Topic ${i}\n\n### Q${i}\n\n`).join(''),
  ],
  ['a pipe and asterisk line', (n) => `## Topic\n\n### Q1\n\n${'|'.repeat(n)}${'*'.repeat(2 * n)}✓\n`],
  ['one long line', (n) => `## Topic\n\n${'word '.repeat(n)}\n`],
  ['a capital run', (n) => `## Topic\n\n${'A'.repeat(n)}\n`],
  ['a digit run', (n) => `## Topic\n\n${'1'.repeat(n)}\n`],
];

describe('extractDiscussionLog growth', () => {
  for (const [name, make] of MARKDOWN_SHAPES) {
    it(`stays linear on ${name}`, { timeout: TIMEOUT }, () => {
      const growth = measureGrowth({ make, run: (body) => void extractDiscussionLog(body) });
      expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    });
  }

  it('stays linear on a long Options cell with a long Selected cell', { timeout: TIMEOUT }, () => {
    const growth = measureGrowth({
      make: (n) => `${TABLE_HEAD}| Q | ${'a / '.repeat(n)}a | ${'*'.repeat(2 * n)} |\n`,
      run: (body) => void extractDiscussionLog(body),
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
  });
});

describe('extractReviewWarnings growth', () => {
  const REVIEW_SHAPES: Shape[] = [
    ...MARKDOWN_SHAPES,
    [
      'warning subsections',
      (n) =>
        `## Warnings\n\n${Array.from({ length: Math.ceil(n / 30) }, (_, i) => `### WR-${i}: title ${i}\n\ntext\n\n`).join('')}`,
    ],
  ];
  for (const [name, make] of REVIEW_SHAPES) {
    it(`stays linear on ${name}`, { timeout: TIMEOUT }, () => {
      const growth = measureGrowth({ make, run: (body) => void extractReviewWarnings(body) });
      expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    });
  }
});

describe('parseDecisionEntries growth', () => {
  const DECISION_SHAPES: Shape[] = [
    ...MARKDOWN_SHAPES,
    [
      'decision bullets with continuation lines',
      (n) =>
        Array.from({ length: Math.ceil(n / 45) }, (_, i) => `- **D-${i}:** choice ${i}\n  — **Reversibility:** easy\n`).join(''),
    ],
  ];
  for (const [name, make] of DECISION_SHAPES) {
    it(`stays linear on ${name}`, { timeout: TIMEOUT }, () => {
      const growth = measureGrowth({ make, run: (body) => void parseDecisionEntries(body) });
      expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    });
  }
});

describe('splitSections growth', () => {
  for (const [name, make] of MARKDOWN_SHAPES) {
    it(`stays linear on ${name}`, { timeout: TIMEOUT }, () => {
      const growth = measureGrowth({ make, run: (body) => void splitSections(body) });
      expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    });
  }
});

describe('splitSubsections growth', () => {
  for (const [name, make] of MARKDOWN_SHAPES) {
    it(`stays linear on ${name}`, { timeout: TIMEOUT }, () => {
      const growth = measureGrowth({ make, run: (body) => void splitSubsections(body) });
      expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    });
  }
});

describe('parseMarkdownTable growth', () => {
  for (const [name, make] of MARKDOWN_SHAPES) {
    it(`stays linear on ${name}`, { timeout: TIMEOUT }, () => {
      const growth = measureGrowth({ make, run: (body) => void parseMarkdownTable(body) });
      expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    });
  }
});

describe('parseChecklistItems growth', () => {
  const CHECKLIST_SHAPES: Shape[] = [
    ...MARKDOWN_SHAPES,
    ['checklist items', (n) => '- [ ] open item\n- [x] done item\n'.repeat(Math.ceil(n / 32))],
    ['a bracket run', (n) => `- ${'['.repeat(n)}\n`],
  ];
  for (const [name, make] of CHECKLIST_SHAPES) {
    it(`stays linear on ${name}`, { timeout: TIMEOUT }, () => {
      const growth = measureGrowth({ make, run: (body) => void parseChecklistItems(body) });
      expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    });
  }
});

describe('extractSecurityRegister growth', () => {
  // MAX_ROWS in the register handler is 3000, so the row count stays below it at 8x: the largest input
  // must still yield exactly its own rows, which is what proves the cap was never crossed.
  const REGISTER_HEAD =
    '## Threat Register\n\n| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |\n|---|---|---|---|---|---|---|\n';
  const ROW = `| T-9-9 | Spoofing | x | high | mitigate | ${'m '.repeat(10)} | closed |\n`;
  const make = (rows: number): string =>
    `# T\n\n${'x'.repeat(200_000)}\n\n${REGISTER_HEAD}${ROW.repeat(rows)}\n## Sign-Off\n\n- [ ] reviewed\n`;

  it('stays linear on register rows after one 200k-character line', { timeout: TIMEOUT }, () => {
    const growth = measureGrowth({
      make,
      run: (body) => void extractSecurityRegister(body),
      startSize: 20,
      minBaseMs: 0.25,
      maxSize: 3000,
      floorMs: 0,
    });
    expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    const largest = growth.n * 8;
    expect(largest).toBeLessThanOrEqual(3000);
    expect(extractSecurityRegister(make(largest)).register?.rows).toHaveLength(largest);
  });
});

function mentionArtifact(body: string): ParsedArtifact {
  return {
    ref: {
      path: '.planning/phases/01-example/01-CONTEXT.md',
      kind: 'context',
      location: 'phase',
      phaseIdentity: null,
      milestoneVersion: null,
      quickTaskId: null,
    },
    title: '',
    frontmatter: {},
    body,
    bodyLength: body.length,
    bodyHash: '',
    mtimeMs: 0,
    warnings: [],
    structured: {},
  };
}

describe('scanMentions on a single huge document', () => {
  it('returns every mention instead of overflowing the stack', () => {
    const count = 200_000;
    const index = scanMentions([mentionArtifact('D-1 '.repeat(count))]);
    expect(index.all).toHaveLength(count);
  });
});

describe('scanMentions growth', () => {
  const MENTION_SHAPES: Shape[] = [
    ['repeated mentions', (n) => 'D-1 WR-01 REQ-01 01-02 Phase 3 '.repeat(Math.ceil(n / 31))],
    ['a capital run', (n) => 'A'.repeat(n)],
    ['a digit run', (n) => '1'.repeat(n)],
    ['a date-fragment run', (n) => '01-02-03-'.repeat(Math.ceil(n / 9))],
    ['many short lines', (n) => 'line with D-1 and 01-02\n'.repeat(Math.ceil(n / 24))],
  ];
  for (const [name, make] of MENTION_SHAPES) {
    it(`stays linear on ${name}`, { timeout: TIMEOUT }, () => {
      const growth = measureGrowth<ParsedArtifact[]>({
        make: (n) => [mentionArtifact(make(n))],
        run: (artifacts) => void scanMentions(artifacts),
      });
      expect(growth.ratio).toBeLessThan(GROWTH_LIMIT);
    });
  }
});
