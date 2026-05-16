#!/usr/bin/env bash
# cairn-atomic-commit — atomic stage-commit-push helper for parallel-cairn shared-tree mode.
#
# Ticket: MB-F-PARALLEL-CAIRN-SHARED-INDEX-RACE-WINDOW closure-path-(β).
# Authored: SESSION-r12-t1c-w1-parallel-cairn-atomic-commit (Round 12 Wave T1-CLOSURE-Wave-1).
#
# Mechanism (per CLAUDE.md §2.7 per-path discipline + round-11 §5.C.3 KNOWN-load-bearing
# §3.9.A commit-pathspec mandate + memory feedback_git_commit_pathspec_for_new_files):
#
#   1. Capture pre-add `git status --short` baseline (informational).
#   2. Per-path `git add -- <pathspec>` for every staged file.
#   3. Capture post-add `git status --short`; verify every requested pathspec
#      shows as staged (column 1 non-space, non-?).
#   4. If race detected (some pathspec NOT staged), retry once: re-add + re-check.
#      If still missing after retry, abort with clear error (Q-ATOMIC-2 = (a)).
#   5. `git commit -o -m "<msg>" -- <pathspec>...` — `-o`/`--only` re-stages from
#      working tree, race-protected against another session's index sweep.
#   6. Single-attempt `git push <remote> <branch>` per CLAUDE.md §2.6 push discipline
#      (Q-ATOMIC-3 = (a) — surface rejection; do NOT blind-retry).
#
# Invocation (Q-ATOMIC-1 = (a) — positional pathspecs + `--` separator + message):
#   cairn-atomic-commit [options] <pathspec1> [<pathspec2>...] -- "<commit-message>"
#
# Options:
#   --no-push            Skip the push step (commit only).
#   --remote <name>      Push remote (default: origin).
#   --branch <name>      Push branch (default: current HEAD branch).
#   -h, --help           Show this message.
#
# Shell compatibility (Q-ATOMIC-4): bash 3.2+ (macOS default) and bash 4/5.
# Self-execs via shebang regardless of parent shell (verified under zsh).
#
# Sourcing: the script defines functions and runs cairn_main only when executed
# directly. This affords unit-testable internals (cairn_detect_race).

set -eo pipefail

cairn_print_usage() {
  cat <<USAGE >&2
Usage: cairn-atomic-commit [options] <pathspec1> [<pathspec2>...] -- "<commit-message>"

Options:
  --no-push            Skip the push step (commit only).
  --remote <name>      Push remote (default: origin).
  --branch <name>      Push branch (default: current HEAD branch).
  -h, --help           Show this message.
USAGE
}

# cairn_capture_status — print 'git status --short' output to stdout.
cairn_capture_status() {
  git status --short
}

# cairn_detect_race — verify every pathspec appears staged in the supplied
# status snapshot.
#
# Args: <status-snapshot-string> <pathspec1> [<pathspec2>...]
# Returns: 0 if all pathspecs staged; 1 + diagnostic on stderr otherwise.
#
# Status --short line format: 'XY filename' where X is the index column.
# A staged path has X in [AMDRTC] (anything not space and not '?').
# Renames appear as 'R  old -> new'; we match against the 'new' path.
cairn_detect_race() {
  local snapshot="$1"
  shift
  if [ $# -eq 0 ]; then
    return 0
  fi
  local missing=""
  local p
  for p in "$@"; do
    if ! printf '%s\n' "$snapshot" | awk -v p="$p" '
      {
        if (length($0) < 4) next;
        idx = substr($0, 1, 1);
        path = substr($0, 4);
        sub(/.* -> /, "", path);
        # Strip surrounding quotes git uses for paths with special chars.
        gsub(/^"|"$/, "", path);
        if (path == p && idx != " " && idx != "?") { found = 1; exit }
      }
      END { exit !found }
    '; then
      if [ -z "$missing" ]; then
        missing="$p"
      else
        missing="$missing, $p"
      fi
    fi
  done
  if [ -n "$missing" ]; then
    printf 'cairn-atomic-commit: race detected — pathspec(s) not staged: %s\n' "$missing" >&2
    return 1
  fi
  return 0
}

cairn_main() {
  local no_push=0
  local remote="origin"
  local branch=""
  local pathspecs=()
  local msg=""
  local saw_msg=0

  while [ $# -gt 0 ]; do
    case "$1" in
      --no-push) no_push=1; shift ;;
      --remote)
        if [ $# -lt 2 ]; then
          printf 'cairn-atomic-commit: error: --remote requires an argument\n' >&2
          return 2
        fi
        remote="$2"; shift 2 ;;
      --branch)
        if [ $# -lt 2 ]; then
          printf 'cairn-atomic-commit: error: --branch requires an argument\n' >&2
          return 2
        fi
        branch="$2"; shift 2 ;;
      -h|--help) cairn_print_usage; return 0 ;;
      --)
        shift
        if [ $# -eq 0 ]; then
          printf 'cairn-atomic-commit: error: commit message required after --\n' >&2
          return 2
        fi
        msg="$1"
        saw_msg=1
        shift
        break ;;
      -*)
        printf 'cairn-atomic-commit: error: unknown option: %s\n' "$1" >&2
        cairn_print_usage
        return 2 ;;
      *) pathspecs+=("$1"); shift ;;
    esac
  done

  if [ ${#pathspecs[@]} -eq 0 ]; then
    printf 'cairn-atomic-commit: error: at least one pathspec is required\n' >&2
    cairn_print_usage
    return 2
  fi
  if [ "$saw_msg" -eq 0 ] || [ -z "$msg" ]; then
    printf 'cairn-atomic-commit: error: commit message (after --) is required\n' >&2
    cairn_print_usage
    return 2
  fi

  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    printf 'cairn-atomic-commit: error: not in a git repository\n' >&2
    return 3
  fi

  # Step 1: pre-add baseline (informational; reserved for future diagnostics).
  local _baseline
  _baseline="$(cairn_capture_status)"
  : "${_baseline}"

  # Step 2: per-path add (CLAUDE.md §2.7).
  local p
  for p in "${pathspecs[@]}"; do
    if ! git add -- "$p"; then
      printf 'cairn-atomic-commit: error: git add -- %s failed\n' "$p" >&2
      return 3
    fi
  done

  # Test affordance — only consulted when explicitly set; production caller
  # never sets this. Documented in probe-mbf-pcacc-02 header.
  if [ -n "${CAIRN_ATOMIC_TEST_RACE_HOOK:-}" ]; then
    eval "${CAIRN_ATOMIC_TEST_RACE_HOOK}" || true
  fi

  # Step 3: post-add status capture + race check.
  local post_add
  post_add="$(cairn_capture_status)"

  if ! cairn_detect_race "$post_add" "${pathspecs[@]}"; then
    printf 'cairn-atomic-commit: retrying once...\n' >&2
    for p in "${pathspecs[@]}"; do
      git add -- "$p" || true
    done
    post_add="$(cairn_capture_status)"
    if ! cairn_detect_race "$post_add" "${pathspecs[@]}"; then
      printf 'cairn-atomic-commit: error: race persists after retry; aborting\n' >&2
      return 4
    fi
    printf 'cairn-atomic-commit: retry succeeded\n' >&2
  fi

  # Step 4: commit using -o (--only) — re-stages from working tree, race-protected.
  if ! git commit -o -m "$msg" -- "${pathspecs[@]}"; then
    printf 'cairn-atomic-commit: error: git commit failed; surfacing for caller investigation\n' >&2
    return 5
  fi

  # Step 5: optional push (single-attempt per Q-ATOMIC-3).
  if [ "$no_push" -eq 0 ]; then
    if [ -z "$branch" ]; then
      branch="$(git symbolic-ref --short HEAD 2>/dev/null || echo HEAD)"
    fi
    if ! git push "$remote" "$branch"; then
      printf 'cairn-atomic-commit: error: git push %s %s failed; investigate per CLAUDE.md §2.6 (do NOT blind-retry)\n' "$remote" "$branch" >&2
      return 6
    fi
  fi

  return 0
}

# Allow sourcing without executing main (for unit tests that exercise
# cairn_detect_race in isolation).
if [ "${BASH_SOURCE[0]:-$0}" = "${0}" ]; then
  cairn_main "$@"
fi
