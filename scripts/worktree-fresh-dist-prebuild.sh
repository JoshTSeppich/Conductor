#!/usr/bin/env bash
# worktree-fresh-dist-prebuild — pretest hook ensuring dispatch-core/dist/ exists and is
# fresh relative to src/. Closes MB-F-WORKTREE-FRESH-MISSING-DIST-CRASH (FOLLOWUPS:155).
#
# Failure mode addressed (per row 155 body):
#   Fresh worktrees created via `git worktree add` reuse the pnpm store from the primary
#   working tree, so `pnpm install` is never re-invoked on the new worktree. The row-172
#   `postinstall: tsc` hook in packages/dispatch-core/package.json does NOT fire, leaving
#   packages/dispatch-core/dist/ absent. Workstation tests then crash at import-time when
#   they resolve `dispatch-core/dist/v3/schema.js`.
#
# Mechanism (per row 155 body verbatim — "dist/ is absent or older than src/"):
#   - Anchor: packages/dispatch-core/dist/v3/schema.js — the artifact cited in row 155.
#   - If the anchor is missing OR any file under packages/dispatch-core/src/ is newer
#     than the anchor, run `pnpm --filter dispatch-core build`.
#   - Otherwise, no-op.
#
# Composition with row-172 closure (MB-F-DISPATCH-CORE-POST-PULL-REBUILD-DISCIPLINE):
#   - row 172 lifecycle key: `postinstall` — fires on `pnpm install` (post-clone / post-pull).
#   - row 155 lifecycle key: `pretest`   — fires on `pnpm test` (covers worktree-add scenario
#     where `pnpm install` is skipped). Different lifecycles; both coexist in package.json.
#
# Test affordances (used by probe-mbfwfd-02; production callers never set these):
#   WFD_CORE_DIR  — override the dispatch-core package root.
#   WFD_SRC_DIR   — override the source-tree freshness input.
#   WFD_ANCHOR    — override the dist anchor file checked for freshness.
#   WFD_BUILD_CMD — override the rebuild command (e.g., a sandboxed builder).

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

CORE_DIR="${WFD_CORE_DIR:-${REPO_ROOT}/packages/dispatch-core}"
SRC_DIR="${WFD_SRC_DIR:-${CORE_DIR}/src}"
ANCHOR="${WFD_ANCHOR:-${CORE_DIR}/dist/v3/schema.js}"
BUILD_CMD="${WFD_BUILD_CMD:-pnpm --filter dispatch-core build}"

reason=""
needs_build=0

if [ ! -f "${ANCHOR}" ]; then
  needs_build=1
  reason="anchor absent (${ANCHOR})"
elif [ -n "$(find "${SRC_DIR}" -type f -newer "${ANCHOR}" -print -quit 2>/dev/null)" ]; then
  needs_build=1
  reason="src newer than anchor"
else
  reason="dist fresh"
fi

if [ "${needs_build}" -eq 1 ]; then
  printf 'worktree-fresh-dist-prebuild: %s; rebuilding dispatch-core...\n' "${reason}" >&2
  eval "${BUILD_CMD}"
else
  printf 'worktree-fresh-dist-prebuild: %s; skipping rebuild.\n' "${reason}" >&2
fi
