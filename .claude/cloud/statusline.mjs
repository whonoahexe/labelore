#!/usr/bin/env node
// Status line for this project. Records the session's plan usage for usage-guard.mjs, then
// renders: your own ~/.claude/statusline-command.sh when it exists (local machine), otherwise
// GSD's status line plus a usage segment (cloud sessions).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { peakUsage, usagePath, writeJson } from './usage-state.mjs';

const raw = fs.readFileSync(0, 'utf8');
let data = {};
try {
  data = JSON.parse(raw);
} catch {
  // Render whatever we can below.
}

if (data.rate_limits) {
  try {
    writeJson(usagePath(data.session_id), {
      rate_limits: data.rate_limits,
      recorded_at: Date.now(),
    });
  } catch {
    // A failed write must never blank the status line.
  }
}

const home = os.homedir();
const ownScript = path.join(home, '.claude', 'statusline-command.sh');
const gsdScript = path.join(home, '.claude', 'hooks', 'gsd-statusline.js');

if (fs.existsSync(ownScript)) {
  process.stdout.write(
    spawnSync('bash', [ownScript], { input: raw, encoding: 'utf8' }).stdout ?? '',
  );
} else {
  let base = data.model?.display_name ?? '';
  if (fs.existsSync(gsdScript)) {
    base = (
      spawnSync(process.execPath, [gsdScript], { input: raw, encoding: 'utf8' }).stdout ?? ''
    ).trimEnd();
  }
  const segments = [
    ['5h', data.rate_limits?.five_hour],
    ['7d', data.rate_limits?.seven_day],
  ]
    .filter(([, window]) => Number.isFinite(window?.used_percentage))
    .map(([label, window]) => `${label} ${Math.round(window.used_percentage)}%`);
  const peak = peakUsage(data.rate_limits);
  const usage = segments.length
    ? ` │ ${peak && peak.pct >= 80 ? '\x1b[31m' : '\x1b[2m'}${segments.join(' · ')}\x1b[0m`
    : '';
  process.stdout.write(`${base}${usage}\n`);
}
