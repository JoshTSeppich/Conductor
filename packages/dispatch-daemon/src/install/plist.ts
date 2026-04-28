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
  /** Absolute path to the node binary launchd will exec. */
  nodePath: string;
  /** Absolute path to the daemon's built entry script.
   *  Per S04: <repo>/packages/dispatch-daemon/dist/index.js */
  daemonScript: string;
  /** Absolute path for stdout capture; daemon log output
   *  lands here (S04 §"4. StandardOutPath captures..."). */
  stdoutPath: string;
  /** Absolute path for stderr capture. */
  stderrPath: string;
}

export function generatePlist(opts: PlistOpts): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${opts.label}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${opts.nodePath}</string>
    <string>${opts.daemonScript}</string>
  </array>
  <key>KeepAlive</key>
  <true/>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${opts.stdoutPath}</string>
  <key>StandardErrorPath</key>
  <string>${opts.stderrPath}</string>
</dict>
</plist>
`;
}
