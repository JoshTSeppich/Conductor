/**
 * launchd LaunchAgent plist template per DAEMON-T18 + S04 ADR.
 *
 * Pure helper — produces the XML string from resolved paths.
 * Tests cover this directly; the launchctl bootstrap that
 * consumes it is a thin OS-boundary wrapper smoke-tested by
 * the operator at install time (finding #36 framework).
 *
 * Template is verbatim from S04 ADR §"plist template that
 * works on current macOS" — the Apple PropertyList DTD
 * declaration + dict/key/string/array structure with the
 * S04-validated key set: Label, ProgramArguments, KeepAlive,
 * RunAtLoad, StandardOutPath, StandardErrorPath.
 *
 * KeepAlive: true is the v2 MVP default per S04 §"3.
 * KeepAlive: true is subject to ThrottleInterval (default
 * 10s)" — operator gets crash-loop protection without
 * needing the dict-with-SuccessfulExit form.
 */

export interface PlistOpts {
  /** Reverse-DNS launchd label. T18 hardcodes
   *  'com.foxworks.dispatch-daemon' at the call site (CS-03
   *  anchor); kept as an opt for testability. */
  label: string;
  /** ProgramArguments array — argv-equivalent that launchd
   *  execs. Each element becomes a `<string>` in the plist
   *  array.
   *
   *  DAEMON-Z-1 Path B: refactored from the pre-Z-1 fixed
   *  pair (nodePath, daemonScript) to support the
   *  `node --import tsx src/index.ts` 4-arg shape. The
   *  pre-Z-1 form was `[nodePath, daemonScript]` per S04
   *  §3.1 verbatim "node + dist/index.js"; Z-1 surfaced
   *  that the daemon's compiled dist/index.js cannot
   *  resolve workspace `dispatch-core/src/...` imports at
   *  node-runtime, and the tsx CLI wrapper can't be
   *  exec'd by launchd (macOS provenance xattr → "Operation
   *  not permitted"). Fix: invoke node directly with
   *  --import tsx, which loads tsx as ESM hooks + runs
   *  the .ts source. node binary is unrestricted by
   *  launchd; tsx-as-loader handles cross-package src/
   *  imports the same way dev/test/scripts already do. */
  programArguments: readonly string[];
  /** Absolute path for stdout capture; daemon log output
   *  lands here (S04 §"4. StandardOutPath captures..."). */
  stdoutPath: string;
  /** Absolute path for stderr capture. */
  stderrPath: string;
  /** Optional working directory for the daemon process.
   *  DAEMON-Z-1 Path B requires this so `node --import tsx`
   *  can resolve tsx via node_modules at the repo root.
   *  Without it, launchd starts the daemon at cwd=/ and
   *  node fails ERR_MODULE_NOT_FOUND on tsx package resolve. */
  workingDirectory?: string;
  /** Optional EnvironmentVariables PATH for the daemon process.
   *  DAEMON-Z-2 surfaced: launchd's default PATH is
   *  `/usr/bin:/bin:/usr/sbin:/sbin` which excludes Homebrew
   *  prefixes (`/opt/homebrew/bin` Apple Silicon, `/usr/local/bin`
   *  Intel). Daemon shells out to `tmux` via dispatch-core's
   *  transport (`execFile('tmux', [...])`) — without an extended
   *  PATH, every prompt-delivery + handoff-pull invocation
   *  fails with ENOENT/has-session-false. Surfaced by Z-2 smoke
   *  S4 (fd send → prompt_sent expected) and fixed in same
   *  commit per Z-1/Z-4 surface-then-fix precedent.
   *
   *  Default value covers Apple Silicon Homebrew first
   *  (most-common operator setup), Intel Homebrew, then system
   *  paths. Override-able for non-Homebrew installs (MacPorts,
   *  manual builds in $HOME/bin, etc.). */
  pathEnv?: string;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function generatePlist(opts: PlistOpts): string {
  const argsXml = opts.programArguments
    .map((arg) => `    <string>${escapeXml(arg)}</string>`)
    .join('\n');
  const workingDirectoryXml = opts.workingDirectory
    ? `  <key>WorkingDirectory</key>\n  <string>${escapeXml(opts.workingDirectory)}</string>\n`
    : '';
  const pathEnvXml = opts.pathEnv
    ? `  <key>EnvironmentVariables</key>\n  <dict>\n    <key>PATH</key>\n    <string>${escapeXml(opts.pathEnv)}</string>\n  </dict>\n`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${opts.label}</string>
  <key>ProgramArguments</key>
  <array>
${argsXml}
  </array>
  <key>KeepAlive</key>
  <true/>
  <key>RunAtLoad</key>
  <true/>
${workingDirectoryXml}${pathEnvXml}  <key>StandardOutPath</key>
  <string>${opts.stdoutPath}</string>
  <key>StandardErrorPath</key>
  <string>${opts.stderrPath}</string>
</dict>
</plist>
`;
}
