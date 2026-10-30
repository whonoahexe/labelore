// A fetch stand-in for web tests: the client sends relative URLs ('/api/projects'), so this sends each
// one to an in-process registry app the way a browser on the app's own page would, with the Host the
// request guard allows and, on a write, the same-origin proof (app.request adds neither). Restore the
// original fetch in afterEach with the function it returns.
interface RequestableApp {
  request: (input: string, init?: RequestInit) => Response | Promise<Response>;
}

export function installRegistryFetch(app: RequestableApp, port: number): () => void {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? `${input.pathname}${input.search}` : input.url;
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    headers.set('Host', `127.0.0.1:${port}`);
    if (method !== 'GET' && method !== 'HEAD') headers.set('Sec-Fetch-Site', 'same-origin');
    return Promise.resolve(app.request(url, { ...init, method, headers }));
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}
