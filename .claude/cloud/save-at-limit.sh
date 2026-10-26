#!/usr/bin/env bash
# StopFailure hook (rate_limit, cloud sessions only): the turn ended because the plan limit was
# hit, so Claude can't act any more. This saves the work without it: writes a handoff note that
# gsd-resume-work picks up, commits everything and pushes. It backs up usage-guard.mjs, which
# pauses properly at 95% when it can read usage.
[ "$CLAUDE_CODE_REMOTE" = "true" ] || [ "$LABELORE_USAGE_GUARD" = "1" ] || exit 0

input=$(cat)
field() { node -e 'process.stdout.write(String(JSON.parse(process.argv[1])[process.argv[2]] ?? ""))' "$input" "$1"; }

cd "$(field cwd)" 2>/dev/null || true
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0

changed=$(git status --porcelain)
if [ -z "$changed" ] && git rev-parse '@{u}' >/dev/null 2>&1 && [ -z "$(git rev-list '@{u}..HEAD')" ]; then
  exit 0
fi

if [ -n "$changed" ] && [ -d .planning ]; then
  {
    echo "# Stopped at the usage limit"
    echo
    echo "Claude's turn ended on $(date -u '+%Y-%m-%d %H:%M UTC') because the plan usage limit was reached"
    echo "(\`$(field last_assistant_message)\`). A hook saved the work as it stood, so the files below may"
    echo "be half-edited."
    echo
    echo "- Branch: $(git rev-parse --abbrev-ref HEAD)"
    echo "- Last commit before the save: $(git log -1 --format='%h %s')"
    echo
    echo "## Files saved"
    echo
    echo '```'
    echo "$changed"
    echo '```'
    echo
    echo "## To continue"
    echo
    echo "Run /gsd-resume-work. Check the files above for unfinished edits before going on, then delete"
    echo "this note."
  } >.planning/.continue-here-usage-limit.md
fi

git add -A && git commit -q -m "chore(pause): save work at usage limit" >/dev/null 2>&1
git push -q -u origin HEAD >/dev/null 2>&1
exit 0
