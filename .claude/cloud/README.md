# Cloud sessions

Setup for running this project in Claude Code cloud sessions (claude.ai/code, `claude --cloud`).
`.claude/settings.json` wires these scripts in. Each one returns immediately on your own machine,
apart from the status line, which hands off to your `~/.claude/statusline-command.sh`.

Cloud sessions can only push when the Claude GitHub App is installed on the repository. Without
it, `claude --cloud` uploads a copy of the repo that has no `origin` remote.

| File               | What it does                                                                                                                                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup.sh`         | Installs GSD before Claude Code starts. Paste it into the environment's **Setup script** at claude.ai/code. The result is cached, so GSD is there from the first message.                                                                                                                                                                                           |
| `ensure-gsd.sh`    | SessionStart fallback: installs GSD when the environment has no setup script.                                                                                                                                                                                                                                                                                       |
| `usage-guard.mjs`  | Once 5-hour or 7-day usage reaches 95%, Claude is told to stop, run `gsd-pause-work`, commit everything and push. Claude can't end its turn until the handoff is written, the tree is clean and the branch is pushed, and the hook stops insisting after 3 tries. Usage comes from the status line where there is one, otherwise from Claude Code's usage endpoint. |
| `save-at-limit.sh` | Backstop for when the limit is hit anyway. Claude can't act at that point, so the script writes `.planning/.continue-here-usage-limit.md`, commits everything and pushes. `/gsd-resume-work` picks up the note.                                                                                                                                                     |
| `statusline.mjs`   | Saves the usage figures that Claude Code passes to the status line. Cloud sessions don't run a status line.                                                                                                                                                                                                                                                         |
| `usage-state.mjs`  | Shared helpers for reading usage.                                                                                                                                                                                                                                                                                                                                   |

To check whether a session can read usage at all, run `node .claude/cloud/usage-guard.mjs --check`.
Change the GSD version in both `setup.sh` and `ensure-gsd.sh`. To use a different threshold, set
`LABELORE_USAGE_PAUSE_AT` (for example `90`) in the environment's variables. To try the hooks
locally, run Claude Code with `LABELORE_USAGE_GUARD=1`.
