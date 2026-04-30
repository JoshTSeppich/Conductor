#!/usr/bin/env bash
# MB-S02 env probe — spawned inside an isolated tmux pane.
# Dumps all env vars (sorted) to the output path, then exits.
# Usage: bash probe-env.sh <output-path>
set -euo pipefail
: "${1:?Usage: probe-env.sh <output-path>}"
env | sort > "$1"
