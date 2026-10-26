# Cloud sessions

Setup for running this project in Claude Code cloud sessions (claude.ai/code, `claude --cloud`).
`.claude/settings.json` wires these scripts in. Each one returns immediately on your own machine,
apart from the status line, which hands off to your `~/.claude/statusline-command.sh`.

| File              | What it does                                                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setup.sh`        | Installs GSD before Claude Code starts. Paste it into the environment's **Setup script** at claude.ai/code. The result is cached, so GSD's skills and agents are there from the first message.                                                    |
| `ensure-gsd.sh`   | SessionStart fallback: installs GSD if the environment has no setup script. Skills installed this late need `/reload-skills`, and GSD's agents load only in the next session.                                                                     |
| `statusline.mjs`  | Saves the plan usage that Claude Code passes to the status line, the only place it reports usage, to `~/.claude/state/usage-guard/`.                                                                                                              |
| `usage-guard.mjs` | Once 5-hour or 7-day usage reaches 95%, Claude is told to stop, run `gsd-pause-work`, commit everything and push. Claude can't end its turn until the handoff is written, the tree is clean and the branch is pushed. It retries at most 3 times. |

Change the GSD version in both `setup.sh` and `ensure-gsd.sh`. To use a different threshold, set
`LABELORE_USAGE_PAUSE_AT` (for example `90`) in the environment's variables. To try the guard
locally, run Claude Code with `LABELORE_USAGE_GUARD=1`.
