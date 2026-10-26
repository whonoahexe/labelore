// Plan usage for the cloud usage guard. Hooks receive no usage data, so it comes from one of two
// places: the figures statusline.mjs records from the status line input (local sessions; cloud
// sessions run no status line), or Claude Code's own usage endpoint, called with the session's
// token and cached for a minute.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const stateDir = path.join(os.homedir(), '.claude', 'state', 'usage-guard');

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage';
const STATUSLINE_FRESH_MS = 5 * 60_000;
const API_CACHE_MS = 60_000;

const safeId = (sessionId) => String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '');

export const usagePath = (sessionId) => path.join(stateDir, `${safeId(sessionId)}.json`);
export const tripPath = (sessionId) => path.join(stateDir, `${safeId(sessionId)}.trip.json`);
const apiCachePath = path.join(stateDir, 'api.json');

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value));
  fs.renameSync(tmp, file);
}

/** The highest used_percentage across the 5-hour and 7-day windows still in effect. */
export function peakUsage(rateLimits) {
  const now = Date.now() / 1000;
  let peak = null;
  for (const [name, window] of Object.entries(rateLimits ?? {})) {
    if (name !== 'five_hour' && name !== 'seven_day') continue;
    const pct = Number(window?.used_percentage);
    if (!Number.isFinite(pct)) continue;
    if (window.resets_at && window.resets_at < now) continue;
    if (!peak || pct > peak.pct) peak = { pct, window: name === 'five_hour' ? '5-hour' : '7-day' };
  }
  return peak;
}

/** Where a claude.ai token can come from, in the order they are tried. */
export function tokenSources() {
  const sources = [];
  // Cloud sessions hold no claude.ai login; their session token answers the usage endpoint.
  const ingressFile = process.env.CLAUDE_SESSION_INGRESS_TOKEN_FILE;
  const ingressToken =
    ingressFile && fs.existsSync(ingressFile) && fs.readFileSync(ingressFile, 'utf8').trim();
  if (ingressToken)
    sources.push({ name: 'CLAUDE_SESSION_INGRESS_TOKEN_FILE', token: ingressToken });
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) {
    sources.push({ name: 'CLAUDE_CODE_OAUTH_TOKEN', token: process.env.CLAUDE_CODE_OAUTH_TOKEN });
  }
  const credentials = readJson(path.join(os.homedir(), '.claude', '.credentials.json'));
  if (credentials?.claudeAiOauth?.accessToken) {
    sources.push({
      name: '~/.claude/.credentials.json',
      token: credentials.claudeAiOauth.accessToken,
    });
  }
  return sources;
}

/** Calls the usage endpoint and returns its windows in the status line's rate_limits shape. */
export async function fetchRateLimits(token) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(USAGE_URL, { headers, signal: AbortSignal.timeout(4000) });
  if (!response.ok) return { status: response.status };
  const body = await response.json();
  const rateLimits = {};
  for (const name of ['five_hour', 'seven_day']) {
    const window = body[name];
    if (!Number.isFinite(window?.utilization)) continue;
    rateLimits[name] = {
      used_percentage: window.utilization,
      resets_at: window.resets_at ? Math.floor(Date.parse(window.resets_at) / 1000) : undefined,
    };
  }
  return { status: response.status, rateLimits };
}

/** The freshest rate limits available to a hook, or null when there is no way to read them. */
export async function currentRateLimits(sessionId) {
  const recorded = readJson(usagePath(sessionId));
  if (recorded && Date.now() - recorded.recorded_at < STATUSLINE_FRESH_MS)
    return recorded.rate_limits;

  const cached = readJson(apiCachePath);
  if (cached && Date.now() - cached.recorded_at < API_CACHE_MS) return cached.rate_limits;

  for (const { token } of tokenSources()) {
    try {
      const { rateLimits } = await fetchRateLimits(token);
      if (rateLimits) {
        writeJson(apiCachePath, { rate_limits: rateLimits, recorded_at: Date.now() });
        return rateLimits;
      }
    } catch {
      // Try the next source; no usage figure just means the guard stays quiet.
    }
  }
  return recorded?.rate_limits ?? null;
}
