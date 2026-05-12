// MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB1 (red) — empty-sessions-stub
// detection contract probe.
//
// Per ticket body `ec60622` §4 WB1:
//   Source-text inspection of `packages/dispatch-workstation/src/
//   tile-grid/mount.ts:175-181`. Asserts the `tryAutoMountFrameC`
//   function body does NOT contain the `sessions: []` empty-array
//   literal at the `mountFrameC(root, ...)` call site. Probe fails
//   RED until WB4 GREEN replaces the empty-sessions stub with a live
//   stream consumed from the Sub-Q-T1-A=(α) renderer-only useState
//   pattern (independent subscription mirroring tile-grid-app.tsx:
//   159-185 spawn-result useEffect).
//
// Encoded contract (3 conditions per ticket body acceptance):
//   (1) mount.ts file readable + source captured (sanity guard).
//   (2) `tryAutoMountFrameC` function-name reference exists in mount.ts
//       — proves we're looking at the right file/function (this should
//       remain GREEN across the RED→GREEN flip; WB4 modifies the body
//       but does NOT remove the function).
//   (3) The text between `function tryAutoMountFrameC` and the next
//       top-level boundary does NOT contain the `sessions: []` empty-
//       array literal. Regex: /mountFrameC\([^)]*\{\s*sessions:\s*\[\s*\]/
//       Currently FAILS — `mount.ts:180` ships
//       `mountFrameC(root, { sessions: [] });` per MB-F-FRAME-C-
//       SESSIONS-STREAM-INTEGRATION Tier 2 row 327 deferred-state.
//
// RED state at HEAD `ec60622`:
//   - Condition (1) GREEN (file exists at known path).
//   - Condition (2) GREEN (`tryAutoMountFrameC` defined at mount.ts:175).
//   - Condition (3) FAILS — empty-sessions literal still present at
//     mount.ts:180 per audit-trail anchor `ea11bc7` (Wave B WB10 GREEN
//     landed the stub per Q-WB10-B=α arbitration).
//
// WB4 GREEN target:
//   - Replace empty-stub body of `tryAutoMountFrameC` with a sessions-
//     stream consumer per Sub-Q-T1-A=(α) renderer-only useState pattern.
//     Likely shape: read `window.workstationBridge` + pass to
//     mountFrameC so FrameCRoot can subscribe to onSpawnResult
//     independently, OR subscribe inside the factory and forward
//     sessions array on each replay. Final shape decided at WB3 GREEN
//     when source-of-truth surface lands.
//
// CLOSES on WB4 GREEN flip: MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION
// (FOLLOWUPS.md:327, Tier 2, filed at `e2688fa`).

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MOUNT_TS_PATH = resolve(
  __dirname,
  '../../../src/tile-grid/mount.ts',
);

const FUNCTION_NAME = 'tryAutoMountFrameC';
const EMPTY_STUB_REGEX = /mountFrameC\([^)]*\{\s*sessions:\s*\[\s*\]/;

let mountTsSource: string | undefined;
let readError: Error | undefined;

beforeAll(() => {
  try {
    mountTsSource = readFileSync(MOUNT_TS_PATH, 'utf8');
  } catch (e) {
    readError = e instanceof Error ? e : new Error(String(e));
  }
});

describe('MB-T-WIREFRAME-T1-SESSION-DATA-FLOW WB1 — empty-sessions-stub detection', () => {
  describe('Condition (1): mount.ts file readable', () => {
    it('mount.ts source captured without I/O error', () => {
      if (readError) throw new Error(`read failed: ${readError.message}`);
      expect(mountTsSource).toBeDefined();
      expect(mountTsSource!.length).toBeGreaterThan(0);
    });
  });

  describe(`Condition (2): ${FUNCTION_NAME} function-name reference present`, () => {
    it(`mount.ts contains "${FUNCTION_NAME}" identifier (sanity guard)`, () => {
      expect(mountTsSource).toBeDefined();
      expect(
        mountTsSource!.includes(FUNCTION_NAME),
        `mount.ts must define ${FUNCTION_NAME} — WB4 modifies its body but does not remove the function`,
      ).toBe(true);
    });
  });

  describe('Condition (3): empty-sessions literal ABSENT from mount.ts', () => {
    it(`mount.ts does NOT contain the empty-sessions stub pattern (RED until WB4 GREEN)`, () => {
      expect(mountTsSource).toBeDefined();
      expect(
        EMPTY_STUB_REGEX.test(mountTsSource!),
        `mount.ts contains the empty-sessions stub pattern ${EMPTY_STUB_REGEX} — WB4 GREEN must replace with live sessions-stream consumer per Sub-Q-T1-A=(α). Closes MB-F-FRAME-C-SESSIONS-STREAM-INTEGRATION Tier 2 row 327.`,
      ).toBe(false);
    });
  });
});
