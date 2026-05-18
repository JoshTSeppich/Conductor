// MB-T-MVP-CONDUCTOR-CHAT-MOUNT-WIRING WB3 (RED) — probe-02: shell.html
// <script> tag source-text assertion.
//
// Closes MB-F-W3-FINAL-PRODUCTION-CHAT-REGION-BLANK-UNTIL-EXPANSION-2
// (FOLLOWUPS row 401). The prior chat-shell sweep at aef0ac8 removed
// the `<script src="../chat-shell/renderer.js">` tag without a replacement;
// dogfood-running the workstation leaves `#chat-region #root` unmounted
// (BLANK). This probe enforces the replacement: workstation-shell.html
// must load `dist/conductor-chat/renderer.js` via a <script> tag placed
// AFTER the orchestrator-focus-pane <script> and BEFORE </body>.
//
// Source-text assertion pattern mirrors `probe-mbtwft8-01-current-stub-
// state.spec.ts` precedent: readFileSync the shell, regex-match the tag.
//
// Contract (3 assertions per dispatch §WB ladder WB3):
//   (1) workstation-shell.html contains a <script ...src="../conductor-
//       chat/renderer.js"...> tag.
//   (2) The conductor-chat <script> tag appears AFTER the orchestrator-
//       focus-pane <script> tag (source-byte ordering).
//   (3) The conductor-chat <script> tag appears BEFORE the </body>
//       closing tag (source-byte ordering).
//
// RED state at HEAD aef0ac8 — sweep removed the chat-shell <script> and
// no conductor-chat replacement exists; condition (1) fails. WB4 GREEN
// inserts the tag and flips this probe to PASS.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const WORKSTATION_ROOT = resolve(HERE, '../../..');
const SHELL_HTML_PATH = resolve(
  WORKSTATION_ROOT,
  'src/main/workstation-shell.html',
);

const CONDUCTOR_CHAT_SCRIPT_PATTERN =
  /<script\s+[^>]*src=["']\.\.\/conductor-chat\/renderer\.js["'][^>]*>\s*<\/script>/;

const ORCHESTRATOR_FOCUS_PANE_SCRIPT_PATTERN =
  /<script\s+[^>]*src=["']\.\.\/orchestrator-focus-pane\/renderer\.js["'][^>]*>\s*<\/script>/;

const BODY_CLOSE_PATTERN = /<\/body>/;

describe('MB-T-MVP-CONDUCTOR-CHAT-MOUNT-WIRING WB3 — workstation-shell.html conductor-chat <script> tag', () => {
  it('(precondition) workstation-shell.html exists', () => {
    expect(existsSync(SHELL_HTML_PATH)).toBe(true);
  });

  it('(1) shell.html contains <script src="../conductor-chat/renderer.js"> tag', () => {
    const source = readFileSync(SHELL_HTML_PATH, 'utf8');
    expect(
      source,
      'workstation-shell.html must load dist/conductor-chat/renderer.js via a <script> tag (replaces the removed chat-shell <script> at sweep aef0ac8)',
    ).toMatch(CONDUCTOR_CHAT_SCRIPT_PATTERN);
  });

  it('(2) conductor-chat <script> tag appears AFTER orchestrator-focus-pane <script> tag', () => {
    const source = readFileSync(SHELL_HTML_PATH, 'utf8');
    const ofpMatch = source.match(ORCHESTRATOR_FOCUS_PANE_SCRIPT_PATTERN);
    const ccMatch = source.match(CONDUCTOR_CHAT_SCRIPT_PATTERN);
    expect(ofpMatch).not.toBeNull();
    expect(ccMatch).not.toBeNull();
    if (ofpMatch && ccMatch) {
      expect(
        ccMatch.index!,
        'conductor-chat <script> must be ordered AFTER orchestrator-focus-pane <script> (mirrors W3-final cascade-gate ordering)',
      ).toBeGreaterThan(ofpMatch.index!);
    }
  });

  it('(3) conductor-chat <script> tag appears BEFORE </body> closing tag', () => {
    const source = readFileSync(SHELL_HTML_PATH, 'utf8');
    const ccMatch = source.match(CONDUCTOR_CHAT_SCRIPT_PATTERN);
    const bodyClose = source.match(BODY_CLOSE_PATTERN);
    expect(ccMatch).not.toBeNull();
    expect(bodyClose).not.toBeNull();
    if (ccMatch && bodyClose) {
      expect(
        ccMatch.index!,
        'conductor-chat <script> must appear BEFORE </body> (defer-loaded bundle)',
      ).toBeLessThan(bodyClose.index!);
    }
  });
});
