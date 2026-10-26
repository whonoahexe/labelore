// Shared paths for the cloud usage guard. statusline.mjs records the plan-usage figures Claude
// Code hands the status line (the only place it exposes them), and usage-guard.mjs reads them
// back from hooks, which receive no usage data of their own.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const stateDir = path.join(os.homedir(), '.claude', 'state', 'usage-guard');

const safeId = (sessionId) => String(sessionId || 'unknown').replace(/[^A-Za-z0-9_-]/g, '');

export const usagePath = (sessionId) => path.join(stateDir, `${safeId(sessionId)}.json`);
export const tripPath = (sessionId) => path.join(stateDir, `${safeId(sessionId)}.trip.json`);

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
