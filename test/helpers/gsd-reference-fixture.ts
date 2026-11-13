// A MADE-UP stand-in for an installed gsd-core's configuration reference, for the tests of the settings page. None of this text is
// copied from GSD: the structure is the same (a `## Complete Field Reference` of `###` tables with five columns, a `## Field
// Interactions` list, a schema manifest and a defaults manifest), the keys and sentences are invented. It exists so the parser, the
// loader, the route and the composer are tested against a tree this repository owns, never against the machine's real install.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export const FIXTURE_PLANNING_CONFIG = `# Planning config

<some_prose>
Text before the reference is not part of it.
</some_prose>

## Complete Field Reference

Generated from made-up sources.

### Core Fields

| Key | Type | Default | Allowed Values | Description |
|-----|------|---------|----------------|-------------|
| \`mode\` | string | \`"interactive"\` | \`"interactive"\`, \`"yolo"\` | Operation mode: \`"interactive"\` asks before acting; \`"yolo"\` runs without prompts. Switching it mid-run takes effect at the next gate. |
| \`commit_docs\` | boolean | \`true\` | \`true\`, \`false\` | Commit the planning files to git. |
| \`context_window\` | number | \`200000\` | \`200000\`, \`1000000\` | Context window size. |
| \`project_code\` | string\\|null | \`null\` | Any short string | Prefix for phase folders (e.g., \`"CK"\` gives \`CK-01-start\`). |
| \`review.models.<cli>\` | string\\|null | \`null\` | Any model ID string | Per-CLI model override for reviews. |

### Workflow Fields

Set via \`workflow.*\` namespace in config.json (e.g., \`"workflow": { "research": true }\`).

| Key | Type | Default | Allowed Values | Description |
|-----|------|---------|----------------|-------------|
| \`workflow.research\` | boolean | \`true\` | \`true\`, \`false\` | Run a research pass before planning. Skips it when the phase has no questions. Reads the previous summary first. |
| \`workflow.plan_check\` | boolean | \`true\` | \`true\`, \`false\` | Check plans either with a checker \\| or with a person. _Alias:_ \`plan_checker\` is the flat form. |
| \`workflow.verifier\` | boolean | \`true\` | \`true\`, \`false\` | Verify after the run (#123, ADR-9). Always on in strict mode. |
| \`workflow.research\` | boolean | \`false\` | \`true\`, \`false\` | A duplicated row that must lose to the first. |
| this row has | too few cells |
| \`workflow._auto_chain_active\` | boolean | \`false\` | \`true\`, \`false\` | Internal: whether chaining is on. |

### Hook Fields

Set via \`hooks.*\` namespace.

| Key | Type | Default | Allowed Values | Description |
|-----|------|---------|----------------|-------------|
| \`hooks.context_warnings\` | boolean | \`true\` | \`true\`, \`false\` | Warn when the context budget runs low. |

### Gadget Fields

Set via \`gadget.*\` namespace.

| Key | Type | Default | Allowed Values | Description |
|-----|------|---------|----------------|-------------|
| \`gadget.size\` | number | \`3\` | \`1\`–\`9\` | How big a gadget is. |

### Advanced Fields

| Key | Type | Default | Allowed Values | Description |
|-----|------|---------|----------------|-------------|
| \`agent_skills\` | object | \`{}\` | \`{ "<agent-type>": "<skill-set>" }\` | Assign skill sets to agent types. |

---

## Field Interactions

Several fields affect each other:

1. **\`commit_docs\` and the ignore file** -- An explicit value wins over the ignore-file check. The ignore file only decides when nothing is set.
2. **\`mode\` and prompts** -- In \`yolo\` mode no prompt is shown. Everything else behaves the same.

---

## Example Configurations

### Minimal

| Key | Type | Default | Allowed Values | Description |
|-----|------|---------|----------------|-------------|
| \`not.part.of.it\` | string | \`"x"\` | Any | Rows after the reference are ignored. |
`;

export const FIXTURE_SCHEMA = JSON.stringify(
  {
    _comment: 'made up',
    validKeys: [
      'mode',
      'commit_docs',
      'context_window',
      'project_code',
      'workflow.research',
      'workflow.plan_check',
      'workflow.verifier',
      'workflow.human_verify_mode',
      'hooks.context_warnings',
      'gadget.size',
      'agent_skills',
      'gates.confirm_transition',
      'review.default_reviewers',
      'tavily_search',
      'statusline.show_git',
      'runtime',
    ],
    runtimeStateKeys: ['workflow._auto_chain_active'],
    dynamicKeyPatterns: [
      { topLevel: 'features', source: '^features\\.[a-zA-Z0-9_]+$', description: 'features.<name>' },
      { topLevel: 'models', source: '^models\\.(planning|discuss)$', description: 'models.<planning|discuss>' },
      { topLevel: 'broken', source: '^(unclosed', description: 'cannot compile' },
    ],
  },
  null,
  2,
);

export const FIXTURE_DEFAULTS = JSON.stringify(
  {
    _comment: 'made up',
    mode: 'interactive',
    commit_docs: true,
    workflow: { research: true, plan_check: true, human_verify_mode: 'end-of-phase' },
    gates: { confirm_transition: true },
    tavily_search: false,
    statusline: { show_git: true },
  },
  null,
  2,
);

/** Writes the three files under `references/` and `bin/shared/` of `dir`, the layout an installed gsd-core has. */
export async function writeGsdCoreTree(dir: string): Promise<void> {
  const files: Array<[string, string]> = [
    ['references/planning-config.md', FIXTURE_PLANNING_CONFIG],
    ['bin/shared/config-schema.manifest.json', FIXTURE_SCHEMA],
    ['bin/shared/config-defaults.manifest.json', FIXTURE_DEFAULTS],
  ];
  for (const [rel, text] of files) {
    const target = join(dir, rel);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, text, 'utf8');
  }
}
