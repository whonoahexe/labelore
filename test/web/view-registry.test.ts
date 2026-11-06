// VIEW-05's registry-completeness test: every kind in `VIEW_KINDS` (34 total: UI-SPEC's own 16
// plus `review-fix`, `findings`, `debug`, `todo` and `note`, RESEARCH.md § Open Question 1's recommended corpus-grep
// gap and discovery's directory-position kind, the Phase 9 kinds, and Phase 10's `codebase` plus the six specification
// and check kinds, and Phase 11's `pause`, `spikes` and `indexes`) must have a registered `VIEW_MANIFESTS` entry with a non-empty `lead` and at least one
// `promote` entry — and no manifest may exist for a kind that isn't a `VIEW_KINDS` member. Both
// directions are asserted via a single sorted-keys `toEqual`, so a new kind added to either list
// without a matching update on the other fails this suite immediately.
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { VIEW_KINDS, viewKindOf, viewOwnsLargeFile } from '../../src/web/views/kinds.ts';
import { VIEW_MANIFESTS, documentHtmlAllowedInView, resolveView, resolveViewFor } from '../../src/web/views/manifests.ts';
import type { ViewInput } from '../../src/web/views/manifest.ts';
import type { BlockComponentKey } from '../../src/web/views/manifest.ts';

const KNOWN_COMPONENTS: readonly BlockComponentKey[] = [
  'discussion-questions',
  'verification-checks',
  'plan-task-index',
  'fact-list',
];

describe('view registry completeness (VIEW-05)', () => {
  it('VIEW_KINDS has exactly 34 members', () => {
    expect(VIEW_KINDS.length).toBe(34);
  });

  it('VIEW_MANIFESTS keys and VIEW_KINDS are the same set, both directions', () => {
    const manifestKeys = Object.keys(VIEW_MANIFESTS).sort();
    const kinds = [...VIEW_KINDS].sort();
    expect(manifestKeys).toEqual(kinds);
  });

  for (const kind of VIEW_KINDS) {
    describe(`kind: ${kind}`, () => {
      const manifest = VIEW_MANIFESTS[kind];

      it('has a registered manifest', () => {
        expect(manifest).toBeDefined();
      });

      it('manifest.kind matches the registry key', () => {
        expect(manifest?.kind).toBe(kind);
      });

      it('has a non-empty lead sentence ending in a period', () => {
        expect(typeof manifest?.lead).toBe('string');
        expect(manifest?.lead.trim().length).toBeGreaterThan(0);
        expect(manifest?.lead.trim().endsWith('.')).toBe(true);
      });

      it('has at least one promote entry', () => {
        expect(manifest?.promote.length).toBeGreaterThanOrEqual(1);
      });

      it('every section entry has a string or RegExp heading', () => {
        for (const entry of manifest?.promote ?? []) {
          if (entry.type !== 'section') continue;
          const headingType = typeof entry.heading;
          expect(headingType === 'string' || entry.heading instanceof RegExp).toBe(true);
        }
      });

      it('every data entry has a known component and a function select', () => {
        for (const entry of manifest?.promote ?? []) {
          if (entry.type !== 'data') continue;
          expect(KNOWN_COMPONENTS).toContain(entry.component);
          expect(typeof entry.select).toBe('function');
        }
      });

      it('resolveView(kind).recognized is true', () => {
        expect(resolveView(kind).recognized).toBe(true);
      });
    });
  }

  it('a kind with no registered manifest is unrecognized', () => {
    const resolved = resolveView('not-a-real-kind');
    expect(resolved.recognized).toBe(false);
    expect(resolved.manifest).toBeNull();
  });

  describe('UI-SPEC pinned lead copy (verbatim proof cases)', () => {
    it('discussion-log', () => {
      expect(VIEW_MANIFESTS['discussion-log']?.lead).toBe(
        'Each question, the options that were on the table, and which one was chosen.',
      );
    });

    it('verification', () => {
      expect(VIEW_MANIFESTS.verification?.lead).toBe(
        'What still needs a human to check, first — then everything already confirmed.',
      );
    });

    it('plan', () => {
      expect(VIEW_MANIFESTS.plan?.lead).toBe(
        'The task structure this plan commits to, in order, and which sections gate.',
      );
    });
  });

  describe('Phase 10: the codebase view kind and the six specification and check kinds', () => {
    const EMPTY_INPUT: ViewInput = { kind: '', frontmatter: {}, structured: {}, groups: [], planSegments: [] };

    it('viewKindOf maps every codebase-* kind to codebase and leaves every other kind alone', () => {
      for (const doc of ['stack', 'architecture', 'structure', 'conventions', 'testing', 'integrations', 'concerns']) {
        expect(viewKindOf(`codebase-${doc}`)).toBe('codebase');
      }
      expect(viewKindOf('codebase')).toBe('codebase');
      expect(viewKindOf('plan')).toBe('plan');
      expect(viewKindOf('user-setup')).toBe('user-setup');
      expect(viewKindOf('unknown')).toBe('unknown');
    });

    it('resolveViewFor gives the seven codebase-* kinds the one codebase manifest, recognised', () => {
      for (const doc of ['stack', 'architecture', 'structure', 'conventions', 'testing', 'integrations', 'concerns']) {
        const resolved = resolveViewFor(`codebase-${doc}`, { ...EMPTY_INPUT, kind: `codebase-${doc}` });
        expect(resolved.recognized).toBe(true);
        expect(resolved.manifest).toBe(VIEW_MANIFESTS.codebase);
      }
    });

    it('the codebase manifest opts into the page and keeps a silent promote-every-section fallback', () => {
      const manifest = VIEW_MANIFESTS.codebase;
      expect(typeof manifest?.codebasePage).toBe('function');
      expect(manifest?.lead).toBe(
        'The seven codebase-map documents on one page, a panel each, with what the map says first.',
      );
      expect(manifest?.promote).toHaveLength(1);
    });

    it('the six specification and check kinds carry their verbatim lead and no composer yet', () => {
      expect(VIEW_MANIFESTS.spec?.lead).toBe(
        'Whether this phase is specified well enough to plan, and what each requirement asks for.',
      );
      expect(VIEW_MANIFESTS['ai-spec']?.lead).toBe(
        'What kind of AI system this phase builds, how it will be evaluated, and which sections are still template slots.',
      );
      expect(VIEW_MANIFESTS['user-setup']?.lead).toBe(
        'Which setup steps a person still has to do for this phase, and where each variable goes.',
      );
      expect(VIEW_MANIFESTS['eval-review']?.lead).toBe(
        "How far this phase's AI evaluation is built: its score and verdict, what each dimension covers, and what to fix first.",
      );
      expect(VIEW_MANIFESTS['dom-verify']?.lead).toBe(
        'What a browser check of this phase found: whether it could look, and what passed, failed or needs a person.',
      );
      expect(VIEW_MANIFESTS.reviews?.lead).toBe(
        "What each AI reviewer said about this phase's plans, where they agreed and where they disagreed.",
      );
    });

    it('only user-setup withholds its document HTML from View mode (T-10-49)', () => {
      expect(VIEW_MANIFESTS['user-setup']?.withholdDocumentInView).toBe(true);
      expect(documentHtmlAllowedInView(VIEW_MANIFESTS['user-setup'] ?? null)).toBe(false);
      for (const kind of VIEW_KINDS) {
        if (kind === 'user-setup') continue;
        expect(VIEW_MANIFESTS[kind]?.withholdDocumentInView, kind).not.toBe(true);
        expect(documentHtmlAllowedInView(VIEW_MANIFESTS[kind] ?? null), kind).toBe(true);
      }
      expect(documentHtmlAllowedInView(null)).toBe(true);
    });

    it('artifact-page.tsx asks documentHtmlAllowedInView before the document HTML branches and shows the empty note instead', async () => {
      const page = await readFile(new URL('../../src/web/pages/artifact-page.tsx', import.meta.url), 'utf8');
      expect(page).toContain("const documentWithheld = mode === 'view' && !documentHtmlAllowedInView(manifest);");
      const withheld = page.indexOf(') : documentWithheld ? (');
      expect(withheld).toBeGreaterThan(-1);
      expect(page.indexOf('<WithheldDocumentNote />')).toBeGreaterThan(withheld);
      // The note comes before both document-HTML renders (promoted sections and the whole document).
      expect(withheld).toBeLessThan(page.indexOf('<ViewReader title={artifact.title}'));
      expect(withheld).toBeLessThan(page.indexOf('<ArtifactReader\n          title={artifact.title}'));
    });
  });

  describe('Phase 11: the pause view kind and the table-driven viewKindOf', () => {
    const EMPTY_INPUT: ViewInput = { kind: '', frontmatter: {}, structured: {}, groups: [], planSegments: [] };

    it('viewKindOf maps handoff and continue-here to pause, keeps codebase-* on codebase and leaves other kinds alone', () => {
      expect(viewKindOf('handoff')).toBe('pause');
      expect(viewKindOf('continue-here')).toBe('pause');
      expect(viewKindOf('pause')).toBe('pause');
      expect(viewKindOf('codebase-stack')).toBe('codebase');
      expect(viewKindOf('plan')).toBe('plan');
      expect(viewKindOf('unknown')).toBe('unknown');
      // A kind that is a property of Object.prototype is not a table row.
      expect(viewKindOf('constructor')).toBe('constructor');
      expect(viewKindOf('toString')).toBe('toString');
    });

    it('resolveViewFor gives HANDOFF.json and .continue-here.md the one pause manifest, recognised', () => {
      for (const kind of ['handoff', 'continue-here']) {
        const resolved = resolveViewFor(kind, { ...EMPTY_INPUT, kind });
        expect(resolved.recognized).toBe(true);
        expect(resolved.manifest).toBe(VIEW_MANIFESTS.pause);
      }
    });

    it('the pause manifest opts into the page, keeps a silent promote-every-section fallback and has its verbatim lead', () => {
      const manifest = VIEW_MANIFESTS.pause;
      expect(typeof manifest?.pausePage).toBe('function');
      expect(manifest?.lead).toBe(
        'Where paused work stopped, what blocks resuming it and the one next action, from the handoff files.',
      );
      expect(manifest?.promote).toHaveLength(1);
      expect(documentHtmlAllowedInView(manifest ?? null)).toBe(true);
    });

    it('a pause input with no context composes nothing, so the promoted sections render with no notice', () => {
      const manifest = VIEW_MANIFESTS.pause;
      expect(manifest?.pausePage?.({ ...EMPTY_INPUT, kind: 'handoff' })).toBeNull();
    });
  });

  describe('Phase 11: the spikes view kind and its four wire kinds', () => {
    const EMPTY_INPUT: ViewInput = { kind: '', frontmatter: {}, structured: {}, groups: [], planSegments: [] };
    const SPIKE_KINDS = ['spikes-manifest', 'spike', 'spikes-wrap-up', 'spikes-conventions'];

    it('viewKindOf maps the four spike wire kinds to spikes and keeps the pause rows', () => {
      for (const kind of SPIKE_KINDS) expect(viewKindOf(kind), kind).toBe('spikes');
      expect(viewKindOf('spikes')).toBe('spikes');
      expect(viewKindOf('handoff')).toBe('pause');
      expect(viewKindOf('sketch')).toBe('sketch');
    });

    it('resolveViewFor gives each spike file the one spikes manifest, recognised', () => {
      for (const kind of SPIKE_KINDS) {
        const resolved = resolveViewFor(kind, { ...EMPTY_INPUT, kind });
        expect(resolved.recognized, kind).toBe(true);
        expect(resolved.manifest, kind).toBe(VIEW_MANIFESTS.spikes);
      }
    });

    it('the spikes manifest opts into the page, keeps a silent promote-every-section fallback and has its verbatim lead', () => {
      const manifest = VIEW_MANIFESTS.spikes;
      expect(typeof manifest?.spikesPage).toBe('function');
      expect(manifest?.lead).toBe(
        "What each spike tried and what it found, grouped by idea, with each spike's notes one click away.",
      );
      expect(manifest?.promote).toHaveLength(1);
      expect(documentHtmlAllowedInView(manifest ?? null)).toBe(true);
    });

    it('a spikes input with no context composes nothing, so the promoted sections render with no notice', () => {
      const manifest = VIEW_MANIFESTS.spikes;
      expect(manifest?.spikesPage?.({ ...EMPTY_INPUT, kind: 'spikes-manifest' })).toBeNull();
    });
  });

  describe('Phase 11: the indexes view kind, its two wire kinds and the large-file rule', () => {
    const EMPTY_INPUT: ViewInput = { kind: '', frontmatter: {}, structured: {}, groups: [], planSegments: [] };

    it('viewKindOf maps intel and graph to indexes and leaves the other rows alone', () => {
      expect(viewKindOf('intel')).toBe('indexes');
      expect(viewKindOf('graph')).toBe('indexes');
      expect(viewKindOf('indexes')).toBe('indexes');
      expect(viewKindOf('spike')).toBe('spikes');
      expect(viewKindOf('handoff')).toBe('pause');
      expect(viewKindOf('sketch')).toBe('sketch');
    });

    it('resolveViewFor gives intel and graph the one indexes manifest, recognised', () => {
      for (const kind of ['intel', 'graph']) {
        const resolved = resolveViewFor(kind, { ...EMPTY_INPUT, kind });
        expect(resolved.recognized, kind).toBe(true);
        expect(resolved.manifest, kind).toBe(VIEW_MANIFESTS.indexes);
      }
    });

    it('the indexes manifest opts into the page, keeps a silent promote-every-section fallback and has its verbatim lead', () => {
      const manifest = VIEW_MANIFESTS.indexes;
      expect(typeof manifest?.indexesPage).toBe('function');
      expect(manifest?.lead).toBe('What the codebase indexes say, one tile per file, as short summaries; the raw data stays on disk.');
      expect(manifest?.promote).toHaveLength(1);
      expect(documentHtmlAllowedInView(manifest ?? null)).toBe(true);
    });

    it('an indexes input with no context composes nothing, so the promoted sections render with no notice', () => {
      expect(VIEW_MANIFESTS.indexes?.indexesPage?.({ ...EMPTY_INPUT, kind: 'intel' })).toBeNull();
    });

    it('viewOwnsLargeFile is true for intel and graph only', () => {
      const owners = [...VIEW_KINDS, 'intel', 'graph', 'spike', 'handoff', 'unknown', 'sketch', 'codebase-stack'].filter(
        (kind) => viewOwnsLargeFile(kind),
      );
      expect([...new Set(owners)].sort()).toEqual(['graph', 'intel']);
    });
  });
});
