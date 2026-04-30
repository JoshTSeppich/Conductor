#!/usr/bin/env bash
# MB-S02 PTY probe — spawned inside an isolated tmux pane.
# Dumps PTY state to the output path, then exits.
# Usage: bash probe-pty.sh <output-path>
set -euo pipefail
: "${1:?Usage: probe-pty.sh <output-path>}"
{
  echo "=== TERM ==="
  echo "${TERM:-<unset>}"

  echo ""
  echo "=== COLORTERM ==="
  echo "${COLORTERM:-<unset>}"

  echo ""
  echo "=== tty device ==="
  tty 2>&1 || echo "<tty command failed>"

  echo ""
  echo "=== isatty(stdin) ==="
  if [ -t 0 ]; then echo "yes"; else echo "no"; fi

  echo ""
  echo "=== COLUMNS x LINES ==="
  echo "COLUMNS=${COLUMNS:-<unset>}  LINES=${LINES:-<unset>}"

  echo ""
  echo "=== stty -a ==="
  stty -a 2>&1 || echo "<stty failed — stdin is not a tty>"

  echo ""
  echo "=== SIGWINCH ==="
  echo "(static measurement; SIGWINCH delivery requires an attached client and window resize)"
  echo "tmux allocates PTY for all panes regardless of spawn context; SIGWINCH is sent"
  echo "by tmux to the pane process on client resize. Not dependent on spawning env."

  echo ""
  echo "=== input echo discipline ==="
  stty -a 2>/dev/null | grep -o 'echo[^ ;]*' || echo "<stty unavailable>"
} > "$1"
