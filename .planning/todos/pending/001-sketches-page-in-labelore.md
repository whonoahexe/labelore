---
title: "Show sketches inside Labelore instead of a separate file server"
status: pending
priority: P2
source: "promoted from /gsd-note"
created: 2026-10-23
theme: general
---

## Goal

Show sketches inside Labelore instead of a separate file server. `.planning/sketches/` is a GSD artifact folder like any other, so it belongs in the dashboard: a Sketches page built from sketches/MANIFEST.md (number, name, design question, winner, tags), each sketch's README.md rendered as a document page (question, intake, variants, winner), and a View button that opens the sketch itself, served read-only by the Labelore server at /sketches/<folder>/ from the target project. Every GSD project Labelore points at gets this for free. Want: the server serves only files under .planning/sketches/ (resolve the path, refuse anything that escapes it, no directory writes), and the sketch runs in an iframe with sandbox="allow-scripts" and no allow-same-origin (sketches run their own JS and must not reach the app or its API). Open question: labelore.brkn.me targets ~/codebases/cinedise-portal, so labelore's own 28 sketches wouldn't show there — needs either a second instance aimed at ~/codebases/labelore or the multi-project targeting already named as a future direction. Open question: sketch data.js files embed other projects' planning text verbatim (027/028 carry duet and cinedise-portal todos and notes), so serving sketches publicly publishes that content — check whether labelore.brkn.me sits behind Cloudflare Access before exposing them. Today: sketches are reached through the ad-hoc python http.server on 127.0.0.1:4174 (-d .planning/sketches, does not survive reboot) plus a cloudflared quick tunnel with a random trycloudflare.com URL. Suggested interim: a user systemd unit for the 4174 server and a sketches.labelore.brkn.me ingress on the existing labelore tunnel.

## Context

Promoted from quick note captured on 2026-10-23 03:11 (`.planning/notes/2026-10-23-sketches-page-in-labelore.md`).

## Acceptance Criteria

- [x] A Sketches page lists every sketch from `.planning/sketches/MANIFEST.md` with number, name, design question, winner and tags
- [x] Each sketch's README.md renders as a document page (question, intake, variants, winner)
- [x] A View button opens the sketch, served read-only at `/sketches/<folder>/` from the target project
- [x] The sketch route serves only files under `.planning/sketches/`; paths that resolve outside it are refused, and nothing is written
- [x] The sketch runs in an iframe with `sandbox="allow-scripts"` and no `allow-same-origin`
- [ ] Decided before any public exposure: whether labelore.brkn.me sits behind Cloudflare Access, since sketch data files carry other projects' planning text verbatim
- [ ] Decided: how Labelore's own sketches are reachable (second instance aimed at this repo, or multi-project targeting)

## Progress

Built in quick task 261023-4wn (2026-10-23): the Sketches page, the per-sketch README link, the
in-page viewer, and read-only serving at `/sketches/<folder>/` with path containment and a
sandboxed frame. The two decisions above are still open. Also open: Labelore's own sketches load
fallback fonts, because `.planning/sketches/themes/fonts` is a symlink that points outside the
sketches folder and the server refuses it.
