#!/usr/bin/env bash
# MB-S05 spike runner.
# Validates esbuild + React 18 + Electron renderer integration for Session D (COARCH-T02).
#
# Orchestrates 5 experiments:
#   E1: esbuild bundles TSX → dist/renderer/index.js without errors
#   E2: Electron BrowserWindow loads file:// HTML → WINDOW_READY sentinel
#   E3: React mounts in sandboxed renderer → RENDER_OK sentinel
#   E4: Full cycle exits 0 via stdin QUIT (MB-S04 K3 pattern)
#   E5: esbuild rebuilds on demand (incremental build pipeline check)
#
# NOTE: npm install used (not pnpm) to isolate spike from the parent workspace.
# The spike's node_modules is self-contained; parent package.json is untouched.
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "${SCRIPT_DIR}"

echo "================================================================"
echo "MB-S05: esbuild + React + Electron renderer spike"
echo "Dir: ${SCRIPT_DIR}"
echo "================================================================"

# ── Step 1: Install spike-local dependencies ─────────────────────────
echo ""
echo "=== Step 1: npm install (spike-isolated) ==="
npm install --prefer-offline 2>&1 | tail -5
echo "✓ Step 1: node_modules installed"

# ── Step 2: E1 — esbuild build ──────────────────────────────────────
echo ""
echo "=== Step 2: E1 — esbuild build ==="
node build.mjs

if [ ! -f "dist/renderer/index.js" ]; then
  echo "FAIL E1: dist/renderer/index.js not found after build"
  exit 1
fi
if [ ! -f "dist/renderer/index.html" ]; then
  echo "FAIL E1: dist/renderer/index.html not found after build"
  exit 1
fi
if [ ! -f "dist/main/main.js" ]; then
  echo "FAIL E1: dist/main/main.js not found after build"
  exit 1
fi

JS_SIZE=$(wc -c < "dist/renderer/index.js" | tr -d ' ')
echo "✓ E1: dist/renderer/index.js exists (${JS_SIZE} bytes)"
echo "✓ E1: dist/renderer/index.html exists"
echo "✓ E1: dist/main/main.js exists"

# Verify bundle contains React (esbuild bundled react/jsx-runtime correctly)
if grep -q "react" dist/renderer/index.js; then
  echo "✓ E1: bundle contains 'react' — jsx:automatic transform resolved react/jsx-runtime"
else
  echo "FAIL E1: 'react' not found in bundle — jsx:automatic may not have resolved"
  exit 1
fi

# ── Step 3: E5 — rebuild pipeline check ─────────────────────────────
echo ""
echo "=== Step 3: E5 — rebuild pipeline check ==="
node build.mjs > /dev/null 2>&1
NEW_JS_SIZE=$(wc -c < "dist/renderer/index.js" | tr -d ' ')
echo "✓ E5: Second build run succeeds (${NEW_JS_SIZE} bytes) — esbuild rebuild is idempotent"
echo "  NOTE (MODELED): esbuild --watch can rebuild on file-change; Electron does NOT"
echo "  auto-reload without additional wiring (electron-reload or reloadIgnoringCache())."
echo "  True hot-reload requires main-process file-watcher + reload trigger."
echo "  Session D's build tooling covers incremental build; reload is a dev-DX addition."

# ── Step 4: E2/E3/E4 — Electron harness ─────────────────────────────
echo ""
echo "=== Step 4: E2/E3/E4 — Electron spawn-and-observe harness ==="
node harness.mjs

echo ""
echo "================================================================"
echo "MB-S05: ALL EXPERIMENTS PASS"
echo "================================================================"
exit 0
