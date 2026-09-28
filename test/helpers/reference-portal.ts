// Where the reference-portal checkout lives on this machine, for the corpus-anchored tests that read
// its real `.planning/` files. reference-portal_ROOT wins when set; otherwise the first known checkout
// location that exists. When none exists the path still resolves (to the first candidate), and the
// tests' own `it.runIf(existsSync(...))` gates skip them as before.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CANDIDATES = [join(homedir(), 'Work/user/reference-portal'), '/home/user/reference-portal'];

export const reference-portal_ROOT =
  process.env.reference-portal_ROOT ?? CANDIDATES.find((dir) => existsSync(dir)) ?? CANDIDATES[0];

/** The checkout's `.planning/` directory — what the corpus tests call SP_ROOT. */
export const SP_PLANNING = join(reference-portal_ROOT, '.planning');
