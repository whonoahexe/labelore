// Phase 12 (12-03, SET-01): the settings composer over the made-up Lendshed config.json loaded through the real repository (so the
// data is the handler's masked frontmatter, D-08). Counts and panels come from the masked data alone: Set, Not set, Not recognised
// and Masked, panels of read-only rows, and nothing invented for a key the file does not set.
import { describe, expect, it } from 'vitest';
import type { ComposedSettings } from '../../src/web/views/settings-page.ts';
import { composeSettings } from '../../src/web/views/settings-page.ts';
import { loadFixtureProject } from '../helpers/fixture-project.ts';

const READ = { scope: null, unreadable: false };

async function lendshedConfig(): Promise<Record<string, unknown>> {
  const { presentation } = await loadFixtureProject();
  const artifact = presentation.artifacts.find((candidate) => candidate.path === '.planning/config.json');
  if (artifact === undefined) throw new Error('the Lendshed fixture has no config.json');
  return artifact.frontmatter;
}

function ready(model: ComposedSettings | null): Extract<ComposedSettings, { state: 'ready' }> {
  if (model === null || model.state !== 'ready') throw new Error('expected a ready settings model');
  return model;
}

describe('composeSettings over the Lendshed config.json', () => {
  it('counts the keys the file sets, by hand: eight top-level and five under workflow', async () => {
    const model = ready(composeSettings(await lendshedConfig(), READ));
    // mode, granularity, model_profile, commit_docs, parallelization, brave_search, firecrawl, exa_search = 8;
    // workflow.research, plan_check, verifier, nyquist_validation, ui_phase = 5.
    expect(model.counts.set).toBe(13);
    expect(model.counts.notRecognised).toBe(0);
    expect(model.counts.masked).toBe(0);
    expect(model.counts.notSet).toBeGreaterThan(0);
  });

  it('shows parallelization as a boolean row in the shape it arrives', async () => {
    const model = ready(composeSettings(await lendshedConfig(), READ));
    const row = model.panels.flatMap((panel) => panel.rows).find((candidate) => candidate.key === 'parallelization');
    expect(row?.value).toEqual({ kind: 'boolean', on: true });
  });

  it('lists the panels with something set first, in catalogue order, and the empty groups last', async () => {
    const model = ready(composeSettings(await lendshedConfig(), READ));
    const ids = model.panels.map((panel) => panel.id);
    expect(ids[0]).toBe('run');
    const firstEmpty = model.panels.findIndex((panel) => panel.setCount === 0);
    expect(firstEmpty).toBeGreaterThan(0);
    expect(model.panels.slice(firstEmpty).every((panel) => panel.setCount === 0)).toBe(true);
  });

  it('gives a workstream scope no model, so the file reads as a plain file (D-11)', async () => {
    expect(composeSettings(await lendshedConfig(), { scope: 'intake', unreadable: false })).toBeNull();
  });

  it('gives an unreadable file the unreadable state and nothing else (D-11)', () => {
    expect(composeSettings({}, { scope: null, unreadable: true })).toEqual({ state: 'unreadable' });
  });
});
