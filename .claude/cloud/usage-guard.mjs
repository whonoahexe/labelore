#!/usr/bin/env node
// Usage guard for cloud sessions (UserPromptSubmit, PostToolUse and Stop hook). Once the 5-hour
// or 7-day plan usage reaches the threshold (95% by default, LABELORE_USAGE_PAUSE_AT overrides),
// it tells Claude to pause: run gsd-pause-work, commit everything, push. The Stop hook keeps the
// turn going until the handoff exists, the tree is clean and the branch is pushed.
//
// Runs only when CLAUDE_CODE_REMOTE=true, or locally with LABELORE_USAGE_GUARD=1 for testing.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { peakUsage, readJson, tripPath, usagePath, writeJson } from './usage-state.mjs';

const MAX_STOP_BLOCKS = 3;

if (process.env.CLAUDE_CODE_REMOTE !== 'true' && process.env.LABELORE_USAGE_GUARD !== '1')
  process.exit(0);

const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
const threshold = Number(process.env.LABELORE_USAGE_PAUSE_AT) || 95;
const peak = peakUsage(readJson(usagePath(input.session_id))?.rate_limits);
const tripFile = tripPath(input.session_id);

if (!peak || peak.pct < threshold) {
  fs.rmSync(tripFile, { force: true });
  process.exit(0);
}

const trip = readJson(tripFile) ?? { at: Date.now(), stopBlocks: 0, done: false };
writeJson(tripFile, trip);
if (trip.done) process.exit(0);

const pct = Math.floor(peak.pct);
const event = input.hook_event_name;
const pauseSteps =
  `Labelore usage guard (.claude/cloud/usage-guard.mjs): plan usage is at ${pct}% of the ${peak.window} limit, ` +
  `past this project's ${threshold}% pause threshold for cloud sessions. The project's rule at this point is to ` +
  `pause before the limit runs out: stop the current task at the nearest safe point without starting new steps ` +
  `or agents; run the gsd-pause-work skill without asking the user questions (record open questions in the ` +
  `handoff); commit all remaining changes with \`git add -A && git commit -m "chore(pause): auto-pause at ${pct}% ` +
  `usage"\`; push with \`git push -u origin HEAD\`; then end the turn.`;

function emit(output) {
  process.stdout.write(JSON.stringify(output));
  process.exit(0);
}

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  }).trim();
}

/** What still stands between the session and a completed pause. */
function missingPauseSteps(cwd) {
  const missing = [];
  let root;
  try {
    root = git(['rev-parse', '--show-toplevel'], cwd);
  } catch {
    return ['the session directory is not a git repository'];
  }
  const handoff = path.join(root, '.planning', 'HANDOFF.json');
  if (!fs.existsSync(handoff) || fs.statSync(handoff).mtimeMs < trip.at) {
    missing.push('gsd-pause-work has not written .planning/HANDOFF.json since the guard tripped');
  }
  if (git(['status', '--porcelain'], root)) missing.push('there are uncommitted changes');
  try {
    git(['rev-parse', '--abbrev-ref', '@{u}'], root);
    const ahead = Number(git(['rev-list', '--count', '@{u}..HEAD'], root));
    if (ahead > 0) missing.push(`${ahead} commit(s) are not pushed`);
  } catch {
    missing.push('the branch has no upstream yet, so nothing is pushed');
  }
  return missing;
}

if (event === 'UserPromptSubmit' || event === 'PostToolUse') {
  const context = input.agent_id
    ? `Labelore usage guard: plan usage is at ${pct}% of the ${peak.window} limit and the main session is ` +
      `pausing work. Finish only the step in progress, then return a short status of what is done and what remains.`
    : pauseSteps;
  emit({ hookSpecificOutput: { hookEventName: event, additionalContext: context } });
}

if (event === 'Stop') {
  const missing = missingPauseSteps(input.cwd || process.cwd());
  if (missing.length === 0) {
    writeJson(tripFile, { ...trip, done: true });
    emit({
      systemMessage: `Auto-paused at ${pct}% usage: handoff written, all changes committed and pushed.`,
    });
  }
  if (trip.stopBlocks >= MAX_STOP_BLOCKS) {
    writeJson(tripFile, { ...trip, done: true });
    emit({
      systemMessage: `Usage guard gave up after ${MAX_STOP_BLOCKS} attempts. Still missing: ${missing.join('; ')}.`,
    });
  }
  writeJson(tripFile, { ...trip, stopBlocks: trip.stopBlocks + 1 });
  emit({ decision: 'block', reason: `${pauseSteps} Still missing: ${missing.join('; ')}.` });
}
