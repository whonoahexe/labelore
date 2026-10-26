#!/usr/bin/env bash
# SessionStart hook (cloud sessions only): make sure GSD is installed. The environment's setup
# script (.claude/cloud/setup.sh) normally installs it before Claude Code launches; this is the
# fallback for an environment without it. Skills installed this late need /reload-skills, and
# GSD's agents only load in the next session.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || exit 0

GSD_VERSION=1.18.0 # keep in step with setup.sh
[ -f "$HOME/.claude/gsd-core/VERSION" ] && exit 0

log=/tmp/gsd-install.log
if npx -y --package="@opengsd/gsd-core@$GSD_VERSION" -- gsd-core --claude --global </dev/null >"$log" 2>&1; then
  msg="GSD $GSD_VERSION was installed by the SessionStart hook because this cloud environment has no setup script for it. GSD skills appear after /reload-skills; GSD agents load only in a new session. Adding .claude/cloud/setup.sh as the environment's setup script avoids this."
else
  msg="Installing GSD $GSD_VERSION failed in the SessionStart hook; the installer output is in $log."
fi
node -e 'process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: process.argv[1] } }))' "$msg"
