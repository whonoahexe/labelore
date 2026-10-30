// A throwaway web server on the machine's own loopback for the browser specs that need "another website":
// a page a browser treats as a different site from the 127.0.0.1 address Labelore is opened on. A page on
// `localhost` is exactly that (a different host name is a different site), so no second host name is needed.
// It also serves as a request recorder bound to 127.0.0.1, to see the headers a browser sends to Labelore's
// own address. The port is the first free one in 5330-5339; 5320-5329 belong to projects-server.ts, 5310-5319
// to the fixture server and 4173-4174 and 4195-4199 to the user's instances and the Playwright config.
// Opening a page here is not opening an app address, so it is kept out of the spec files, which the
// project-URL contract in test/e2e-url-contract.test.ts holds to `projectUrl`. This is a helper, not a spec
// (testMatch is *.spec.ts).
import { createServer } from 'node:http';
import type { RequestListener, Server } from 'node:http';
import type { Page } from '@playwright/test';

const FIRST_PORT = 5330;
const LAST_PORT = 5339;

export interface LocalSite {
  origin: string;
  /** Opens the site's page in `page`. */
  open(page: Page): Promise<void>;
  stop(): Promise<void>;
}

/** A node:http server on the first free port of the range, bound to `host` (the address a browser then
 * reaches it by, so the two kinds of site a spec needs differ only in this name). */
export async function startLocalSite(host: 'localhost' | '127.0.0.1', handler: RequestListener): Promise<LocalSite> {
  for (let port = FIRST_PORT; port <= LAST_PORT; port++) {
    const server: Server = createServer(handler);
    const bound = await new Promise<boolean>((done) => {
      server.once('error', () => done(false));
      server.listen(port, host, () => done(true));
    });
    if (bound) {
      const origin = `http://${host}:${port}`;
      return {
        origin,
        open: async (page) => {
          await page.goto(origin);
        },
        stop: () => new Promise<void>((done) => server.close(() => done())),
      };
    }
  }
  throw new Error(`other-site: no free port in ${FIRST_PORT}-${LAST_PORT}`);
}
