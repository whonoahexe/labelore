# Labelore

Labelore is a read-only web dashboard for a GSD `.planning/` directory. Point it at any GSD-managed
project and it shows where the work stands, what every phase and plan contains, and where the
decisions, learnings and review findings are buried.

## Requirements

Node.js 22.18.0 or newer on Linux or macOS, and gsd-core 1.21.0 or newer.

## Install

Labelore installs as a GSD capability from the npm registry. In this guide `VERSION` is the release
you want and `SHA512` is its integrity string.

```sh
gsd capability install npm:labelore@VERSION --integrity SHA512 --scope global
```

`npm view labelore@VERSION dist.integrity` prints the SHA512 string for a version, and
`npm view labelore dist-tags` lists the versions you can pick from. Use `--scope project` instead of
`--scope global` to install it for one project only.

If no `gsd` binary is on your PATH, run the same command through
`node ~/.claude/gsd-core/bin/gsd-tools.cjs capability install ...`.

Once it is installed, the skill is `/gsd-labelore`.

## First launch

`/gsd-labelore [phase]` starts Labelore's own server on 127.0.0.1, on a port the operating system
picks, adds the current project to it, and prints one `Labelore URL:` line that looks like
`http://127.0.0.1:PORT/`. It needs no npm and no build. With a phase number the link goes to that
phase. Running it again reuses the server that is already up.

The port changes whenever the server restarts: after a stop, after an upgrade and after a reboot. A
link you saved earlier then stops working, so run `/gsd-labelore` again for a fresh one, or attach to
a Labelore at a fixed address instead (see "Attach to a running Labelore" below).

After `/gsd-ship`, a `ship:post` step prints the shipped phase's link. It never starts a server or
changes one. Turn it off with `gsd-tools config-set labelore.announce false`.

The launcher keeps its state in `${XDG_STATE_HOME:-~/.local/state}/labelore`, or in
`LABELORE_STATE_DIR` when that is set. That directory holds `server.json` (the running server's pid
and port), `server.log`, and `config/`, the list of projects the server remembers.
`LABELORE_CONFIG_DIR` overrides `config/`.

## Stop

`/gsd-labelore stop` stops the server the launcher started. It never touches a server you attached
to.

## Upgrade

```sh
gsd capability update labelore
```

The next `/gsd-labelore` sees that the running server is older than the installed version and
restarts it, on a new port.

## Attach to a running Labelore

This is opt-in. It is for someone who already runs a Labelore on this machine, for example from a
checkout with `npm start`, and wants every project in one place at an address that does not move.

Write this to `attach.json` in the state directory:

```json
{ "url": "http://127.0.0.1:PORT" }
```

Or set `LABELORE_ATTACH_URL` to `http://127.0.0.1:PORT`. The variable wins over the file, and an
empty one counts as unset. `attach.json` is the reliable choice, because the variable only works in
shells that pass it through to the launcher.

Only a loopback address on this machine is accepted: `127.0.0.1` or `localhost`, with an explicit
port and nothing after it. The project's path is resolved by that server on its own disk, so a
server on another machine would see the wrong files.

The launcher first checks that the address answers as Labelore 2.2 or newer, then adds the project to
that server's remembered list, where it stays, and prints links on that address. If the address is
unreachable, is not Labelore, or refuses the project, `/gsd-labelore` stops with a message naming the
URL and how to unset it. It never falls back to its own server. The check guards against a wrong
setting; it is not a security boundary.

To stop attaching, delete `attach.json` or unset the variable.

## Uninstall

1. Run `/gsd-labelore stop`.
2. Run `gsd capability remove labelore`.
3. Delete the state directory yourself: `~/.local/state/labelore` by default, or the directory named
   by your `LABELORE_STATE_DIR`.

Labelore ships no purge command on purpose, so nothing here deletes a directory for you.

## Read-only

Labelore never writes to a project's `.planning/`. The launcher's only writes are its own state
directory.

## Develop

For contributors working from a checkout:

```sh
npm ci
npm run build
npm start -- /path/to/project
```

It prints `Open http://127.0.0.1:PORT` with the port it chose, so read the address from that line
rather than expecting a fixed one. Add `--port <n>` to pin the port. `npm test` runs the tests.

## License

MIT, see [LICENSE](LICENSE).
