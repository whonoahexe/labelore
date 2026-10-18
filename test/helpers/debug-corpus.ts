// Where the other projects' debug sessions live on this machine, for the corpus-anchored tests that read
// their real `.planning/debug/` files (quick-261018-j5h). Each root is kept only when its
// `.planning/debug` directory exists, so a machine without the checkouts skips the tests that need
// them (their own `it.runIf(existsSync(...))` gates). The sibling projects are only ever read.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CANDIDATES = [
  join(homedir(), 'Work/Ibis/deid/deid-ui'),
  join(homedir(), 'Work/Ibis/deid/deid-template-studio/deid-template-studio'),
  join(homedir(), 'Work/Ibis/resoundant'),
  join(homedir(), 'Work/Sideby/plan.sideby.me'),
];

/** The sibling project roots that hold a `.planning/debug` directory. */
export const DEBUG_SIBLING_ROOTS: string[] = CANDIDATES.filter((root) => existsSync(join(root, '.planning', 'debug')));

/** The four sibling sessions sketch 023 was built from. */
export const SKETCH_FILES = {
  dd: join(homedir(), 'Work/Ibis/deid/deid-ui/.planning/debug/mr-series-selection-picks-dwi.md'),
  sa: join(homedir(), 'Work/Sideby/plan.sideby.me/.planning/debug/sfu-no-audio.md'),
  rs: join(homedir(), 'Work/Ibis/resoundant/.planning/debug/resolved/heartbeat-stops-after-net-drop.md'),
  sr: join(homedir(), 'Work/Sideby/plan.sideby.me/.planning/debug/sfu-reconnect-presence.md'),
} as const;
