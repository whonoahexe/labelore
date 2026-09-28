// Where the studio-portal checkout lives on this machine, for the corpus-anchored tests that read
// its real `.planning/` files. STUDIO_PORTAL_ROOT wins when set; otherwise the first known checkout
// location that exists. When none exists the path still resolves (to the first candidate), and the
// tests' own `it.runIf(existsSync(...))` gates skip them as before.
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CANDIDATES = [join(homedir(), 'Work/Cinedise/studio-portal'), '/home/cinedise/studio-portal'];

export const STUDIO_PORTAL_ROOT =
  process.env.STUDIO_PORTAL_ROOT ?? CANDIDATES.find((dir) => existsSync(dir)) ?? CANDIDATES[0];

/** The checkout's `.planning/` directory — what the corpus tests call SP_ROOT. */
export const SP_PLANNING = join(STUDIO_PORTAL_ROOT, '.planning');
