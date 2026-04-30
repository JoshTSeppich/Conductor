#!/usr/bin/env bash
# MB-S04 spike runner. Operator-executed.
#
# Validates vitest can spawn-and-observe Electron for the MB-T01 Red criterion.
# Test approach: spawn `electron path/to/main.mjs` directly (dev mode), observe
# stdout sentinel on window-ready, send SIGTERM / stdin-QUIT, assert clean exit.
#
# Run from repo root or spike dir; resolves paths relatively.
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "${SCRIPT_DIR}/../../../.." && pwd )"
RESULTS_DIR="${SCRIPT_DIR}/results"
mkdir -p "${RESULTS_DIR}"

cd "${REPO_ROOT}"

echo "MB-S04: running vitest against ${SCRIPT_DIR}"
exec "${REPO_ROOT}/node_modules/.bin/vitest" run \
  --config "${SCRIPT_DIR}/vitest.config.mjs" \
  --root "${SCRIPT_DIR}" \
  --reporter=default
