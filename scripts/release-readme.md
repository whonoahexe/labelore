# Labelore

Labelore is a read-only dashboard for a GSD project's `.planning/` directory. It shows where the
work stands, what every phase and plan contains, and where decisions, learnings and review findings
live, without opening a single file by hand.

## Install

```
gsd capability install npm:labelore@<version> --scope global
```

Use `--scope project` to install it for one project only.

## Use

- `/gsd-labelore` opens the dashboard on the current project.
- `/gsd-labelore <phase>` opens it on that phase.
- `/gsd-labelore stop` stops the server it started.

The dashboard listens on `127.0.0.1` at a port it prints (`http://127.0.0.1:PORT/`). It needs
Node.js 22.18.0 or newer. It never writes to the project it shows.

## Uninstall

```
gsd capability remove labelore
```

MIT licensed.
