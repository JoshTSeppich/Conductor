#!/usr/bin/env bash
# MB-S01 spike runner. Operator-executed.
#
# Required env: ANTHROPIC_API_KEY (the harness halts without it).
# Optional env:
#   MB_S01_MODEL                   default: claude-sonnet-4-6
#   MB_S01_MAX_TOKENS              default: 4096
#   MB_S01_INTER_CALL_DELAY_MS     default: 500
#   MB_S01_PRICE_INPUT_USD_PER_M   default: 3.00 (Sonnet 4.6 posted; verify)
#   MB_S01_PRICE_OUTPUT_USD_PER_M  default: 15.00 (Sonnet 4.6 posted; verify)
set -euo pipefail

# Repo root (three dirs up from spike root)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "${SCRIPT_DIR}/../../../.." && pwd )"

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "HALT: ANTHROPIC_API_KEY is not set."
  echo "Per MB-S01 brief: operator must export the key for the spike run."
  echo
  echo "Example:"
  echo "  export ANTHROPIC_API_KEY=sk-ant-..."
  echo "  $0"
  exit 1
fi

cd "${REPO_ROOT}"
exec "${REPO_ROOT}/node_modules/.bin/tsx" "${SCRIPT_DIR}/src/harness.ts"
