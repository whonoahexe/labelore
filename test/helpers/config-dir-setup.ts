// Every vitest worker gets its own throwaway LABELORE_CONFIG_DIR (D-09), so no test run can read or
// write the user's real settings.json. defaultSettingsDir also throws under vitest when the variable
// is unset, so a worker that somehow lacks this setup fails loudly instead of touching ~/.config.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll } from 'vitest';

const configDir = mkdtempSync(join(tmpdir(), 'labelore-config-'));
process.env.LABELORE_CONFIG_DIR = configDir;

afterAll(() => {
  rmSync(configDir, { recursive: true, force: true });
});
