// The project-wide source rules every view shares, one test per rule. Each test walks the exact list
// of files the rule covers and names the file that breaks it. Raw HTML is enforced separately by
// raw-html-guard.test.ts, which walks every file under src/web. The scans are small helpers with a
// positive control that runs them on planted in-memory strings (nothing is written under src/).
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SIZES,
  buildsHref,
  buildsRegExp,
  cssViolations,
  fontSizes,
  hasModuleLevelLet,
  importsFilesystem,
  motionViolations,
  source,
  stripCssComments,
  stripSourceComments,
  usesRegexLiteral,
  writesForbiddenTone,
  writesLink,
  writesLiteralTone,
} from '../helpers/view-contract-scan.ts';

interface CssBlock {
  name: string;
  start: string;
  end: string;
  prefix: string | null;
  motion: boolean;
  sizes: string[] | null;
}

const NO_REGEXP: string[] = [
  'src/planning-repo/css-color.ts',
  'src/planning-repo/handlers/ai-spec.ts',
  'src/planning-repo/handlers/coverage-body.ts',
  'src/planning-repo/handlers/debug-session.ts',
  'src/planning-repo/handlers/dom-verify-body.ts',
  'src/planning-repo/handlers/dom-verify.ts',
  'src/planning-repo/handlers/eval-review-body.ts',
  'src/planning-repo/handlers/eval-review.ts',
  'src/planning-repo/handlers/learnings-retro.ts',
  'src/planning-repo/handlers/pattern-map.ts',
  'src/planning-repo/handlers/plan-structure.ts',
  'src/planning-repo/handlers/review-report.ts',
  'src/planning-repo/handlers/reviews-body.ts',
  'src/planning-repo/handlers/reviews.ts',
  'src/planning-repo/handlers/security-register.ts',
  'src/planning-repo/handlers/spec-body.ts',
  'src/planning-repo/handlers/summary-run.ts',
  'src/planning-repo/handlers/todo-file.ts',
  'src/planning-repo/handlers/uat-session.ts',
  'src/planning-repo/handlers/ui-review-audit.ts',
  'src/planning-repo/handlers/ui-spec-contract.ts',
  'src/planning-repo/handlers/user-setup-body.ts',
  'src/planning-repo/handlers/user-setup.ts',
  'src/planning-repo/handlers/validation-strategy.ts',
  'src/planning-repo/handlers/verification-report.ts',
  'src/planning-repo/handlers/withhold-values.ts',
  'src/planning-repo/theme-tokens.ts',
  'src/presentation/manual-checks.ts',
  'src/presentation/note-context.ts',
  'src/presentation/review-context.ts',
  'src/presentation/review-ledger.ts',
  'src/presentation/todo-context.ts',
  'src/presentation/todo-notes.ts',
  'src/web/components/source-reader.tsx',
  'src/web/views/ai-spec-page.ts',
  'src/web/views/codebase-page.ts',
  'src/web/views/coverage-matrix.ts',
  'src/web/views/debug-case.ts',
  'src/web/views/dom-verify-page.ts',
  'src/web/views/eval-review-page.ts',
  'src/web/views/forensics-page.ts',
  'src/web/views/learnings-retro.ts',
  'src/web/views/milestone-audit.ts',
  'src/web/views/note-page.ts',
  'src/web/views/onboarding-page.ts',
  'src/web/views/pattern-map.ts',
  'src/web/views/pause-page.ts',
  'src/web/views/plan-context.ts',
  'src/web/views/plan-navigator.ts',
  'src/web/views/report-page.ts',
  'src/web/views/review-ledger.ts',
  'src/web/views/review-threads.ts',
  'src/web/views/reviews-overlap.ts',
  'src/web/views/reviews-page.ts',
  'src/web/views/security-console.ts',
  'src/web/views/seed-page.ts',
  'src/web/views/spec-page.ts',
  'src/web/views/summary-run.ts',
  'src/web/views/thread-page.ts',
  'src/web/views/todo-lifecycle.ts',
  'src/web/views/uat-session.ts',
  'src/web/views/ui-review.ts',
  'src/web/views/ui-spec.ts',
  'src/web/views/user-setup-page.ts',
  'src/web/views/validation-strategy.ts',
  'src/web/views/verification-board.ts',
  'src/web/views/windows-ledger.ts',
];

const NO_REGEX_LITERAL: string[] = [
  'src/planning-repo/handlers/ai-spec.ts',
  'src/planning-repo/handlers/coverage-body.ts',
  'src/planning-repo/handlers/dom-verify-body.ts',
  'src/planning-repo/handlers/dom-verify.ts',
  'src/planning-repo/handlers/eval-review-body.ts',
  'src/planning-repo/handlers/eval-review.ts',
  'src/planning-repo/handlers/reviews-body.ts',
  'src/planning-repo/handlers/reviews.ts',
  'src/planning-repo/handlers/spec-body.ts',
  'src/planning-repo/handlers/user-setup-body.ts',
  'src/planning-repo/handlers/user-setup.ts',
  'src/planning-repo/handlers/withhold-values.ts',
  'src/presentation/note-context.ts',
  'src/presentation/review-ledger.ts',
  'src/web/views/ai-spec-page.ts',
  'src/web/views/codebase-page.ts',
  'src/web/views/coverage-matrix.ts',
  'src/web/views/dom-verify-page.ts',
  'src/web/views/eval-review-page.ts',
  'src/web/views/forensics-page.ts',
  'src/web/views/milestone-audit.ts',
  'src/web/views/note-page.ts',
  'src/web/views/onboarding-page.ts',
  'src/web/views/pause-page.ts',
  'src/web/views/report-page.ts',
  'src/web/views/review-ledger.ts',
  'src/web/views/reviews-overlap.ts',
  'src/web/views/reviews-page.ts',
  'src/web/views/seed-page.ts',
  'src/web/views/spec-page.ts',
  'src/web/views/thread-page.ts',
  'src/web/views/user-setup-page.ts',
  'src/web/views/windows-ledger.ts',
];

const NO_HREF: string[] = [
  'src/web/views/plan-navigator-components.tsx',
  'src/web/views/security-console-components.tsx',
  'src/web/views/uat-session-components.tsx',
  'src/web/views/ui-review-components.tsx',
  'src/web/views/validation-strategy-components.tsx',
];

const NO_LINK: string[] = [
  'src/web/views/ai-spec-page-components.tsx',
  'src/web/views/coverage-matrix-components.tsx',
  'src/web/views/dom-verify-page-components.tsx',
  'src/web/views/eval-review-page-components.tsx',
  'src/web/views/milestone-audit-components.tsx',
  'src/web/views/reviews-page-components.tsx',
  'src/web/views/spec-page-components.tsx',
  'src/web/views/user-setup-page-components.tsx',
  'src/web/views/windows-ledger-components.tsx',
];

const NO_LITERAL_TONE: string[] = [
  'src/web/views/plan-navigator-components.tsx',
  'src/web/views/review-threads-components.tsx',
  'src/web/views/security-console-components.tsx',
  'src/web/views/summary-run-components.tsx',
  'src/web/views/uat-session-components.tsx',
  'src/web/views/ui-review-components.tsx',
  'src/web/views/validation-strategy-components.tsx',
  'src/web/views/verification-board-components.tsx',
];

const NO_FORBIDDEN_TONE: string[] = [
  'src/planning-repo/handlers/debug-session.ts',
  'src/planning-repo/handlers/debug.ts',
  'src/planning-repo/handlers/learnings-retro.ts',
  'src/planning-repo/handlers/learnings.ts',
  'src/planning-repo/handlers/note-lift.ts',
  'src/planning-repo/handlers/note.ts',
  'src/planning-repo/handlers/review.ts',
  'src/planning-repo/handlers/todo-file.ts',
  'src/planning-repo/handlers/todo.ts',
  'src/planning-repo/handlers/verification.ts',
  'src/presentation/note-context.ts',
  'src/presentation/review-context.ts',
  'src/presentation/review-ledger.ts',
  'src/presentation/todo-context.ts',
  'src/presentation/todo-notes.ts',
  'src/web/components/ledger-switch.tsx',
  'src/web/components/record-disagreement.tsx',
  'src/web/views/ai-spec-page-components.tsx',
  'src/web/views/ai-spec-page.ts',
  'src/web/views/codebase-components.tsx',
  'src/web/views/coverage-matrix-components.tsx',
  'src/web/views/coverage-matrix.ts',
  'src/web/views/debug-case-components.tsx',
  'src/web/views/debug-case.ts',
  'src/web/views/dom-verify-page-components.tsx',
  'src/web/views/dom-verify-page.ts',
  'src/web/views/eval-review-page-components.tsx',
  'src/web/views/forensics-page-components.tsx',
  'src/web/views/indexes-page-components.tsx',
  'src/web/views/indexes-page.ts',
  'src/web/views/learnings-retro-components.tsx',
  'src/web/views/learnings-retro.ts',
  'src/web/views/milestone-audit-components.tsx',
  'src/web/views/milestone-audit.ts',
  'src/web/views/note-page-components.tsx',
  'src/web/views/note-page.ts',
  'src/web/views/onboarding-page-components.tsx',
  'src/web/views/onboarding-page.ts',
  'src/web/views/pattern-map-components.tsx',
  'src/web/views/pause-page-components.tsx',
  'src/web/views/pause-page.ts',
  'src/web/views/plan-navigator-components.tsx',
  'src/web/views/plan-navigator.ts',
  'src/web/views/report-page-components.tsx',
  'src/web/views/report-page.ts',
  'src/web/views/review-ledger-components.tsx',
  'src/web/views/review-ledger.ts',
  'src/web/views/review-threads-components.tsx',
  'src/web/views/reviews-page-components.tsx',
  'src/web/views/reviews-page.ts',
  'src/web/views/security-console-components.tsx',
  'src/web/views/security-console.ts',
  'src/web/views/seed-page-components.tsx',
  'src/web/views/seed-page.ts',
  'src/web/views/spec-page-components.tsx',
  'src/web/views/spikes-page-components.tsx',
  'src/web/views/spikes-page.ts',
  'src/web/views/summary-run-components.tsx',
  'src/web/views/summary-run.ts',
  'src/web/views/thread-page-components.tsx',
  'src/web/views/thread-page.ts',
  'src/web/views/todo-lifecycle-components.tsx',
  'src/web/views/todo-lifecycle.ts',
  'src/web/views/uat-session-components.tsx',
  'src/web/views/uat-session.ts',
  'src/web/views/ui-review-components.tsx',
  'src/web/views/ui-review.ts',
  'src/web/views/ui-spec-components.tsx',
  'src/web/views/user-setup-page-components.tsx',
  'src/web/views/user-setup-page.ts',
  'src/web/views/validation-strategy-components.tsx',
  'src/web/views/validation-strategy.ts',
  'src/web/views/verification-board-components.tsx',
  'src/web/views/verification-board.ts',
  'src/web/views/windows-ledger-components.tsx',
  'src/web/views/windows-ledger.ts',
];

const NO_FS_IMPORT: string[] = [
  'src/planning-repo/handlers/ai-spec.ts',
  'src/planning-repo/handlers/coverage-body.ts',
  'src/planning-repo/handlers/dom-verify-body.ts',
  'src/planning-repo/handlers/dom-verify.ts',
  'src/planning-repo/handlers/eval-review-body.ts',
  'src/planning-repo/handlers/eval-review.ts',
  'src/planning-repo/handlers/reviews-body.ts',
  'src/planning-repo/handlers/reviews.ts',
  'src/planning-repo/handlers/spec-body.ts',
  'src/planning-repo/handlers/todo-file.ts',
  'src/planning-repo/handlers/user-setup-body.ts',
  'src/planning-repo/handlers/user-setup.ts',
  'src/planning-repo/handlers/withhold-values.ts',
  'src/presentation/review-ledger.ts',
  'src/presentation/todo-context.ts',
  'src/presentation/todo-notes.ts',
  'src/web/views/ai-spec-page.ts',
  'src/web/views/codebase-page.ts',
  'src/web/views/coverage-matrix.ts',
  'src/web/views/dom-verify-page.ts',
  'src/web/views/eval-review-page.ts',
  'src/web/views/forensics-page.ts',
  'src/web/views/milestone-audit.ts',
  'src/web/views/onboarding-page.ts',
  'src/web/views/pause-page.ts',
  'src/web/views/report-page.ts',
  'src/web/views/review-ledger.ts',
  'src/web/views/reviews-overlap.ts',
  'src/web/views/reviews-page.ts',
  'src/web/views/seed-page.ts',
  'src/web/views/spec-page.ts',
  'src/web/views/thread-page.ts',
  'src/web/views/todo-lifecycle.ts',
  'src/web/views/user-setup-page.ts',
  'src/web/views/windows-ledger.ts',
];

const NO_MUTABLE_STATE: string[] = [
  'src/web/views/ai-spec-page.ts',
  'src/web/views/codebase-page.ts',
  'src/web/views/coverage-matrix.ts',
  'src/web/views/dom-verify-page.ts',
  'src/web/views/eval-review-page.ts',
  'src/web/views/forensics-page.ts',
  'src/web/views/onboarding-page.ts',
  'src/web/views/pause-page.ts',
  'src/web/views/report-page.ts',
  'src/web/views/reviews-overlap.ts',
  'src/web/views/reviews-page.ts',
  'src/web/views/seed-page.ts',
  'src/web/views/spec-page.ts',
  'src/web/views/thread-page.ts',
  'src/web/views/user-setup-page.ts',
];

const CSS_BLOCKS: CssBlock[] = [
  {
    name: 'ai-spec-page',
    start: '/* phase-10-ai-spec:start */',
    end: '/* phase-10-ai-spec:end */',
    prefix: 'view-ai-spec-',
    motion: true,
    sizes: DEFAULT_SIZES,
  },
  {
    name: 'codebase-page',
    start: '/* phase-10-codebase:start */',
    end: '/* phase-10-codebase:end */',
    prefix: 'view-codebase-',
    motion: true,
    sizes: ['var(--fs-2)', 'var(--fs-4)', 'var(--fs-7)', 'var(--fs-display-3)'],
  },
  {
    name: 'coverage-view-contract',
    start: '/* phase-09-coverage:start */',
    end: '/* phase-09-coverage:end */',
    prefix: 'view-coverage-',
    motion: true,
    sizes: ['var(--fs-2)', 'var(--fs-4)', 'var(--fs-7)', 'var(--fs-display-3)'],
  },
  {
    name: 'debug-view-contract',
    start: '/* quick-261018-j5h:start */',
    end: '/* quick-261018-j5h:end */',
    prefix: 'view-debug-',
    motion: true,
    sizes: null,
  },
  {
    name: 'dom-verify-page',
    start: '/* phase-10-dom-verify:start */',
    end: '/* phase-10-dom-verify:end */',
    prefix: 'view-dom-verify-',
    motion: true,
    sizes: DEFAULT_SIZES,
  },
  {
    name: 'eval-review-page',
    start: '/* phase-10-eval-review:start */',
    end: '/* phase-10-eval-review:end */',
    prefix: 'view-eval-review-',
    motion: true,
    sizes: DEFAULT_SIZES,
  },
  {
    name: 'forensics-page',
    start: '/* phase-11-forensics:start */',
    end: '/* phase-11-forensics:end */',
    prefix: 'view-forensics-',
    motion: true,
    sizes: DEFAULT_SIZES,
  },
  {
    name: 'indexes-page',
    start: '/* phase-11-indexes:start */',
    end: '/* phase-11-indexes:end */',
    prefix: 'view-indexes-',
    motion: true,
    sizes: ['var(--fs-2)', 'var(--fs-4)', 'var(--fs-7)', 'var(--fs-display-1)', 'inherit'],
  },
  {
    name: 'learnings-view-contract',
    start: '/* quick-261017-k45:start */',
    end: '/* quick-261017-k45:end */',
    prefix: 'view-learnings-',
    motion: true,
    sizes: null,
  },
  {
    name: 'milestone-audit-view-contract',
    start: '/* phase-09-milestone-audit:start */',
    end: '/* phase-09-milestone-audit:end */',
    prefix: 'view-milestone-audit-',
    motion: true,
    sizes: ['var(--fs-2)', 'var(--fs-4)', 'var(--fs-7)', 'var(--fs-display-3)'],
  },
  {
    name: 'note-view-contract',
    start: '/* quick-261023-61l:start */',
    end: '/* quick-261023-61l:end */',
    prefix: 'view-note-',
    motion: true,
    sizes: null,
  },
  {
    name: 'onboarding-page',
    start: '/* phase-11-onboarding:start */',
    end: '/* phase-11-onboarding:end */',
    prefix: 'view-onboarding-',
    motion: true,
    sizes: DEFAULT_SIZES,
  },
  {
    name: 'patterns-view-contract',
    start: '/* quick-260930-wfs:start */',
    end: '/* quick-260930-wfs:end */',
    prefix: 'view-patterns-',
    motion: false,
    sizes: null,
  },
  {
    name: 'pause-page',
    start: '/* phase-11-pause:start */',
    end: '/* phase-11-pause:end */',
    prefix: 'view-pause-',
    motion: true,
    sizes: DEFAULT_SIZES,
  },
  {
    name: 'plan-navigator-view-contract',
    start: '/* quick-261006-iz6:start */',
    end: '/* quick-261006-iz6:end */',
    prefix: 'view-plan-nav-',
    motion: false,
    sizes: null,
  },
  {
    name: 'report-page',
    start: '/* phase-11-report:start */',
    end: '/* phase-11-report:end */',
    prefix: 'view-report-',
    motion: true,
    sizes: DEFAULT_SIZES,
  },
  {
    name: 'review-ledger-view-contract',
    start: '/* phase-09-review-ledger:start */',
    end: '/* phase-09-review-ledger:end */',
    prefix: 'view-review-ledger-',
    motion: true,
    sizes: null,
  },
  {
    name: 'review-view-contract',
    start: '/* quick-261017-k44:start */',
    end: '/* quick-261017-k44:end */',
    prefix: null,
    motion: true,
    sizes: null,
  },
  {
    name: 'reviews-page',
    start: '/* phase-10-reviews:start */',
    end: '/* phase-10-reviews:end */',
    prefix: 'view-reviews-',
    motion: true,
    sizes: DEFAULT_SIZES,
  },
  {
    name: 'security-view-contract',
    start: '/* quick-261003-527:start */',
    end: '/* quick-261003-527:end */',
    prefix: 'view-security-',
    motion: false,
    sizes: null,
  },
  {
    name: 'seed-page',
    start: '/* phase-11-seed:start */',
    end: '/* phase-11-seed:end */',
    prefix: 'view-seed-',
    motion: true,
    sizes: DEFAULT_SIZES,
  },
  {
    name: 'spec-page',
    start: '/* phase-10-spec:start */',
    end: '/* phase-10-spec:end */',
    prefix: 'view-spec-',
    motion: true,
    sizes: DEFAULT_SIZES,
  },
  {
    name: 'spikes-page',
    start: '/* phase-11-spikes:start */',
    end: '/* phase-11-spikes:end */',
    prefix: 'view-spikes-',
    motion: true,
    sizes: [
      'var(--fs-2)',
      'var(--fs-4)',
      'var(--fs-7)',
      'var(--fs-display-1)',
      'var(--fs-display-3)',
      'inherit',
    ],
  },
  {
    name: 'summary-view-contract',
    start: '/* quick-261006-iz7:start */',
    end: '/* quick-261006-iz7:end */',
    prefix: 'view-summary-',
    motion: false,
    sizes: null,
  },
  {
    name: 'thread-page',
    start: '/* phase-11-thread:start */',
    end: '/* phase-11-thread:end */',
    prefix: 'view-thread-',
    motion: true,
    sizes: DEFAULT_SIZES,
  },
  {
    name: 'todo-view-contract',
    start: '/* quick-261023-61k:start */',
    end: '/* quick-261023-61k:end */',
    prefix: 'view-todo-',
    motion: true,
    sizes: null,
  },
  {
    name: 'uat-view-contract',
    start: '/* quick-261001-qk7:start */',
    end: '/* quick-261001-qk7:end */',
    prefix: 'view-uat-',
    motion: false,
    sizes: null,
  },
  {
    name: 'ui-review-view-contract',
    start: '/* quick-261003-528:start */',
    end: '/* quick-261003-528:end */',
    prefix: 'view-ui-review-',
    motion: false,
    sizes: null,
  },
  {
    name: 'ui-spec-view-contract',
    start: '/* quick-261001-qk6:start */',
    end: '/* quick-261001-qk6:end */',
    prefix: 'view-ui-spec-',
    motion: false,
    sizes: null,
  },
  {
    name: 'user-setup-page',
    start: '/* phase-10-user-setup:start */',
    end: '/* phase-10-user-setup:end */',
    prefix: 'view-user-setup-',
    motion: true,
    sizes: DEFAULT_SIZES,
  },
  {
    name: 'validation-view-contract',
    start: '/* quick-261003-526:start */',
    end: '/* quick-261003-526:end */',
    prefix: 'view-validation-',
    motion: false,
    sizes: null,
  },
  {
    name: 'verification-view-contract',
    start: '/* quick-261017-18a:start */',
    end: '/* quick-261017-18a:end */',
    prefix: 'view-verification-(rail|ledger|row|gap|square|step|ticket|board|big|stat)',
    motion: false,
    sizes: null,
  },
  {
    name: 'windows-view-contract',
    start: '/* phase-09-windows-ledger:start */',
    end: '/* phase-09-windows-ledger:end */',
    prefix: 'view-windows-',
    motion: true,
    sizes: null,
  },
];

const GLOBALS = 'src/web/styles/globals.css';

async function code(path: string): Promise<string> {
  return stripSourceComments(await source(path));
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('view source rules - the scans catch planted violations', () => {
  it('flags each forbidden thing in an in-memory string', () => {
    expect(writesLiteralTone('<span data-tone="complete" />')).toBe(true);
    expect(writesLiteralTone("<span data-tone={'missing'} />")).toBe(true);
    expect(writesForbiddenTone('<span data-tone="warning" />')).toBe(true);
    expect(writesForbiddenTone("const tone = 'destructive';")).toBe(true);
    expect(writesForbiddenTone("type Tone = 'warning' | 'quiet';")).toBe(true);
    expect(writesForbiddenTone("type Tone = 'quiet' | 'destructive';")).toBe(true);
    expect(buildsHref('<a href={item.debugSession}>x</a>')).toBe(true);
    expect(buildsHref('const link = { href: path };')).toBe(true);
    expect(writesLink('<Link to={target}>x</Link>')).toBe(true);
    expect(writesLink('<a>x</a>')).toBe(true);
    expect(buildsRegExp('const re = new RegExp(ref);')).toBe(true);
    expect(buildsRegExp('const re = RegExp(ref);')).toBe(true);
    expect(usesRegexLiteral('text.match(/b/g)')).toBe(true);
    expect(importsFilesystem("import { readFileSync } from 'node:fs';")).toBe(true);
    expect(importsFilesystem("import { join } from 'node:path';")).toBe(true);
    expect(hasModuleLevelLet('let cache = null;')).toBe(true);
    expect(cssViolations('a { color: var(--destructive); }')).toContain('parse-degradation token');
    expect(cssViolations('a { color: oklch(0.5 0.1 30); }')).toContain('colour function');
    expect(cssViolations('a { color: #ff0000; }')).toContain('hex colour');
    expect(cssViolations('a { border-radius: 4px; }')).toContain('radius');
    expect(cssViolations('a { background: color-mix(in oklch, red, blue); }')).toContain(
      'color-mix recipe',
    );
    expect(motionViolations('@keyframes spin { to { opacity: 1; } }')).toContain('keyframes');
    expect(motionViolations('a { animation: spin 1s; }')).toContain('animation');
    expect(motionViolations('a { transition: color 1s; }')).toContain('transition');
    expect(motionViolations(':root { --x: 1; }')).toContain(':root');
    expect(fontSizes('a { font-size: var(--fs-5); }')).toEqual(['var(--fs-5)']);
  });

  it('passes clean strings', () => {
    expect(writesLiteralTone('<span data-tone={test.tone} />')).toBe(false);
    expect(writesForbiddenTone('const t = RESULT_TONE[result];')).toBe(false);
    expect(writesForbiddenTone("type Tone = 'complete' | 'quiet';")).toBe(false);
    expect(buildsHref('<span className="view-uat-path">{path}</span>')).toBe(false);
    expect(writesLink('<button onClick={() => open()}>x</button>')).toBe(false);
    expect(buildsRegExp('const x = text.includes(key);')).toBe(false);
    expect(usesRegexLiteral('const x = text.includes(key);')).toBe(false);
    expect(importsFilesystem("import { x } from './model.ts';")).toBe(false);
    expect(hasModuleLevelLet('function f() {\n  let local = 1;\n  return local;\n}')).toBe(false);
    expect(cssViolations('a { color: var(--primary); border: 1px solid var(--border); }')).toEqual(
      [],
    );
    expect(motionViolations('a { color: var(--primary); }')).toEqual([]);
    expect(fontSizes('a { color: red; }')).toEqual([]);
    expect(stripSourceComments('// let x\nconst a = 1; /* new RegExp(x) */')).not.toMatch(
      /RegExp|let x/,
    );
    expect(stripCssComments('/* oklch(1 1 1) */ a { color: red; }')).not.toContain('oklch');
  });
});

describe('view source rules - the real sources', () => {
  it('R1: no composer, extractor or handler builds a regular expression from document text', async () => {
    for (const path of NO_REGEXP) expect(buildsRegExp(await code(path)), path).toBe(false);
    for (const path of NO_REGEX_LITERAL)
      expect(usesRegexLiteral(await code(path)), path).toBe(false);
  });

  it('R2: no href is built from document text', async () => {
    for (const path of NO_HREF) expect(buildsHref(await code(path)), path).toBe(false);
    for (const path of NO_LINK) expect(writesLink(await code(path)), path).toBe(false);
  });

  it('R3: no literal tone and no destructive or warning tone is written', async () => {
    for (const path of NO_LITERAL_TONE)
      expect(writesLiteralTone(await code(path)), path).toBe(false);
    for (const path of NO_FORBIDDEN_TONE)
      expect(writesForbiddenTone(await code(path)), path).toBe(false);
  });

  it('R4: each guarded CSS block appears once, holds its view rules and is free of colour recipes', async () => {
    const css = await source(GLOBALS);
    for (const entry of CSS_BLOCKS) {
      expect(count(css, entry.start), entry.name).toBe(1);
      expect(count(css, entry.end), entry.name).toBe(1);
      const start = css.indexOf(entry.start);
      const end = css.indexOf(entry.end);
      expect(end, entry.name).toBeGreaterThan(start);
      const block = css.slice(start, end);
      expect(cssViolations(stripCssComments(block)), entry.name).toEqual([]);
      if (entry.motion) expect(motionViolations(stripCssComments(block)), entry.name).toEqual([]);
      if (entry.prefix) {
        expect(css.replace(block, ''), entry.name).not.toMatch(
          new RegExp(`^\\.${entry.prefix}`, 'm'),
        );
        expect(block, entry.name).toMatch(new RegExp(`\\.${entry.prefix}`));
      }
    }
  });

  it('R5: each guarded CSS block uses only the contracted font sizes', async () => {
    const css = await source(GLOBALS);
    for (const entry of CSS_BLOCKS) {
      if (!entry.sizes) continue;
      const block = stripCssComments(css.slice(css.indexOf(entry.start), css.indexOf(entry.end)));
      const sizes = fontSizes(block);
      expect(sizes.length, entry.name).toBeGreaterThan(0);
      for (const size of sizes) expect(entry.sizes, `${entry.name}: ${size}`).toContain(size);
    }
  });

  it('R6: composers import no filesystem module, read no clock and hold no module-level mutable state', async () => {
    for (const path of NO_FS_IMPORT) expect(importsFilesystem(await code(path)), path).toBe(false);
    for (const path of NO_MUTABLE_STATE) {
      const text = await code(path);
      expect(hasModuleLevelLet(text), path).toBe(false);
      expect(text, path).not.toMatch(/^(export\s+)?var\s/m);
      expect(text, path).not.toMatch(/Date\.now\(|new Date\(/);
    }
  });
});
