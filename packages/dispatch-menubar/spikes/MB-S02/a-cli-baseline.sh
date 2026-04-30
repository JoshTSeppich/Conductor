#!/usr/bin/env bash
# MB-S02 CLI baseline capture.
#
# Run from a login shell (Terminal.app, iTerm2, etc.) that has full
# dotfiles sourced — the env you want to measure as the "CLI baseline."
# This is the conventional pre-fd-init flow: operator manually runs
# tmux new-session then POST /v2/sessions. fd spawn does not exist in
# v2.0.1; this script is the authoritative CLI baseline for MB-S02.
#
# Uses isolated tmux sockets (-L) so results are not contaminated by
# an already-running tmux server's environment.
#
# Writes:
#   results/env-cli.txt          env vars seen by pane (spawned from CLI env)
#   results/pty-cli.txt          PTY state seen by pane
#   results/session-cli.json     POST /v2/sessions response

set -euo pipefail

SPIKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SPIKE_DIR/results"
TOKEN_PATH="$HOME/.foxworks-dispatch/token"
DAEMON_URL="http://127.0.0.1:7878"
TMUX_BIN="${TMUX_BIN:-/opt/homebrew/bin/tmux}"

mkdir -p "$RESULTS_DIR"

echo "[MB-S02/A] CLI baseline capture starting"
echo "[MB-S02/A] Shell: $SHELL"
echo "[MB-S02/A] PATH entries: $(echo "$PATH" | tr ':' '\n' | wc -l | tr -d ' ')"
echo "[MB-S02/A] tmux: $TMUX_BIN ($(${TMUX_BIN} -V))"

ENV_OUT="$RESULTS_DIR/env-cli.txt"
PTY_OUT="$RESULTS_DIR/pty-cli.txt"

# --- wait helper: poll until isolated tmux server has no more sessions ---
wait_for_probe() {
  local socket="$1" session="$2" timeout=30
  local waited=0
  while "$TMUX_BIN" -L "$socket" has-session -t "$socket-$session" 2>/dev/null; do
    sleep 0.3
    waited=$((waited + 1))
    if [ "$waited" -gt $((timeout * 3)) ]; then
      echo "[MB-S02/A] ERROR: probe did not exit within ${timeout}s"
      "$TMUX_BIN" -L "$socket" kill-server 2>/dev/null || true
      return 1
    fi
  done
}

# --- Env probe ---
SOCKET_ENV="mb-s02-cli-env-$$"
echo "[MB-S02/A] Spawning env probe (isolated socket: $SOCKET_ENV)…"
"$TMUX_BIN" -L "$SOCKET_ENV" -f /dev/null \
  new-session -d -s "$SOCKET_ENV-probe" -x 220 -y 50 -- \
  bash "$SPIKE_DIR/probe-env.sh" "$ENV_OUT"

wait_for_probe "$SOCKET_ENV" "probe"
"$TMUX_BIN" -L "$SOCKET_ENV" kill-server 2>/dev/null || true
echo "[MB-S02/A] Env probe complete → $ENV_OUT ($(wc -l < "$ENV_OUT") vars)"

# --- PTY probe ---
SOCKET_PTY="mb-s02-cli-pty-$$"
echo "[MB-S02/A] Spawning PTY probe (isolated socket: $SOCKET_PTY)…"
"$TMUX_BIN" -L "$SOCKET_PTY" -f /dev/null \
  new-session -d -s "$SOCKET_PTY-probe" -x 220 -y 50 -- \
  bash "$SPIKE_DIR/probe-pty.sh" "$PTY_OUT"

wait_for_probe "$SOCKET_PTY" "probe"
"$TMUX_BIN" -L "$SOCKET_PTY" kill-server 2>/dev/null || true
echo "[MB-S02/A] PTY probe complete → $PTY_OUT"

# --- Session registration probe ---
if [ ! -f "$TOKEN_PATH" ]; then
  echo "[MB-S02/A] WARNING: token not found at $TOKEN_PATH — skipping registration probe"
  printf '{"skipped":true,"reason":"token not found"}\n' > "$RESULTS_DIR/session-cli.json"
else
  TOKEN="$(cat "$TOKEN_PATH")"
  PROBE_NAME="mb-s02-cli-reg-$$"
  PROBE_CWD="$(mktemp -d)"
  PROBE_HANDOFF="$PROBE_CWD/HANDOFF.md"

  echo "[MB-S02/A] Registering probe session: $PROBE_NAME"
  FULL_RESPONSE=$(curl -s \
    -X POST "$DAEMON_URL/v2/sessions" \
    -H "X-Conductor-Token: $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"$PROBE_NAME\",\"cwd\":\"$PROBE_CWD\",\"tmux_target\":\"mb-s02-cli:0.0\",\"handoff_path\":\"$PROBE_HANDOFF\"}" \
    -o /tmp/mb-s02-cli-reg-body.json \
    -w "%{http_code}")

  BODY="$(cat /tmp/mb-s02-cli-reg-body.json)"
  printf '{"http_code":%s,"body":%s}\n' "$FULL_RESPONSE" "$BODY" > "$RESULTS_DIR/session-cli.json"
  echo "[MB-S02/A] Registration HTTP $FULL_RESPONSE"

  if [ "$FULL_RESPONSE" = "201" ]; then
    curl -s -X PATCH "$DAEMON_URL/v2/sessions/$PROBE_NAME/state" \
      -H "X-Conductor-Token: $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"state":"killed"}' > /dev/null
    echo "[MB-S02/A] Probe session killed (registry cleaned up)"
  fi

  rm -rf "$PROBE_CWD" /tmp/mb-s02-cli-reg-body.json
fi

echo ""
echo "[MB-S02/A] CLI baseline complete."
echo "  env-cli.txt       $(wc -l < "$ENV_OUT") vars"
echo "  pty-cli.txt       written"
echo "  session-cli.json  written"
echo ""
echo "Next: run step B from packages/dispatch-menubar:"
echo "  npx electron spikes/MB-S02/b-electron-main.mjs"
