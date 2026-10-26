#!/bin/bash
# Setup script for this project's Claude Code cloud environment. Paste it into
# claude.ai/code → environment settings → Setup script. It runs before Claude Code launches and
# the result is cached, so GSD's skills, agents and hooks are present from the first message.
GSD_VERSION=1.18.0 # keep in step with ensure-gsd.sh
npx -y --package="@opengsd/gsd-core@$GSD_VERSION" -- gsd-core --claude --global </dev/null || true
