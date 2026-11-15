# Labelore

Labelore is a read-only web dashboard for a GSD `.planning/` directory. Point it at any GSD-managed
project and it shows where the work stands, what every phase and plan contains, and where the
decisions, learnings and review findings are buried.

## Requirements

Node.js 22.18 or newer and npm, on Linux or macOS.

## Run it directly

```sh
npm ci
npm run build
npm start -- /path/to/project
```

It prints `Open http://127.0.0.1:4173`. Add `--port <n>` to pin the port; without it, Labelore moves up
to the next free port when 4173 is taken.

## Use it as a GSD capability

Labelore is a GSD feature capability. It needs gsd-core 1.21.0 or newer.

```sh
gsd capability install https://github.com/whonoahexe/labelore.git --scope global
```

If no `gsd` binary is on your PATH, run the same command through
`node ~/.claude/gsd-core/bin/gsd-tools.cjs capability install ...`. Leave `#<ref>` off the URL: GSD
clones with depth 1, so a tag that is not at the default branch tip fails to check out.

Use global scope. A project-scope install succeeds but stays inactive, because GSD's project-scope
consent hash refuses bundles over 16 MiB and this repository carries its own planning history.

GSD stages the skill as `gsd-labelore` the next time it installs or updates your runtime. After that:

- `/gsd-labelore [phase]` starts Labelore on the current project, or adds the project to the server it
  started earlier, and prints a `Labelore URL:` line. With a phase number the link goes to that phase.
- `/gsd-labelore stop` stops the server the launcher started.
- The first launch builds inside the installed bundle: `npm ci --ignore-scripts`, then `vite build`.
  Expect a few minutes and about 500 MB of `node_modules`.
- After `/gsd-ship`, a `ship:post` step prints the shipped phase's link, or the command that starts
  Labelore. It never starts or changes a server. Turn it off with
  `gsd-tools config-set labelore.announce false`.

The launcher keeps its state in `${XDG_STATE_HOME:-~/.local/state}/labelore`, or in
`LABELORE_STATE_DIR` when that is set. That directory holds the server's pid and port, its logs, and
`config/`, the remembered-project list of the server the launcher starts. `LABELORE_CONFIG_DIR`
overrides `config/`. The launcher only ever talks to the server it started itself, so a Labelore you
run by hand never picks up projects opened through the capability.

To remove it, run `/gsd-labelore stop`, then `gsd capability remove labelore`, and delete the state
directory yourself.

## Read-only

Labelore never writes to a project's `.planning/`. The launcher's only writes are its own state
directory and, on first launch, the bundle's own `node_modules/` and `dist/`.

## License

MIT, see [LICENSE](LICENSE).
