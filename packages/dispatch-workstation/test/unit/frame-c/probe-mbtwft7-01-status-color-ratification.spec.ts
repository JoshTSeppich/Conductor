// MB-T-WIREFRAME-T7-VISUAL-POLISH WB1 (red) — status-color palette
// ratification probe (Sub-Q-MBTWFT7-B=(i) operator-arbitrated 2026-05-12
// ratify T1 placeholder hex values).
//
// CAIRN-GRAMMAR FRAMING: per CLAUDE.md §2.3, `red:` commits author
// "failing test or contract spec authored". Under Sub-Q-B=(i) ratify
// default, T1's status-color.ts already returns the operator-acked
// hex values, so the runtime assertions in probes 01a-01f pass at
// HEAD `8f5beac`. The probe is authored as the CONTRACT SPEC for v3.0
// ship — it codifies the ratified hex values + the killed→null
// filter-sentinel semantic. WB2 GREEN comment-stamps the
// "T7 visual-polish ticket may refine" deference at status-color.ts:31
// to reflect ratification.
//
// Q3 (impl-deleted-passes?) assessment: NO — if status-color.ts
// implementation removed, probes 01a-01f fail at module-import time
// (ENOENT) OR at statusToColor return-value mismatch. The probe is
// load-bearing for the v3.0 ratified palette implementation.
//
// Asserts (per ticket body §4 WB1 + Sub-Q-B=(i) operator arbitration):
//   probe-01a: statusToColor('open')     === '#5b9d6e' (GREEN — active)
//   probe-01b: statusToColor('idle')     === '#888888' (GREY — paused)
//   probe-01c: statusToColor('warning')  === '#c97a3a' (AMBER — warning)
//   probe-01d: statusToColor('detached') === '#c97a3a' (AMBER — transient;
//              per T1 status-color.ts:16 mapping "warning + transient")
//   probe-01e: statusToColor('error')    === '#c54a4a' (RED — failure)
//   probe-01f: statusToColor('killed')   === null      (filter sentinel
//              per T1 status-color.ts contract — SessionList filters
//              killed sessions out before rendering)
//
// HEAD state at `8f5beac`:
//   - frame-c/status-color.ts:30-34 declares module-local hex constants
//     GREEN='#5b9d6e' / GREY='#888888' / AMBER='#c97a3a' / RED='#c54a4a'.
//   - Comment at status-color.ts:31-33 reads "T7 visual-polish ticket
//     may refine these hex values; for v3.0 ship they match the audit-
//     doc §1 Dim 5 row + the existing session-list.tsx:66-69 green/amber
//     values for continuity." WB2 GREEN replaces this with the
//     RATIFIED marker.
//
// WB2 GREEN deliverable: comment-stamp ratification — replace lines 31-33
// with "T7 visual-polish ticket WB2 GREEN 2026-05-12 RATIFIED these hex
// values for v3.0 ship; operator visual-diff at HALT-T7-FINAL-PRE-PUSH".
// Runtime assertions remain GREEN. WB2 acceptance: probe stays passing.

import { describe, it, expect } from 'vitest';
import { statusToColor } from '../../../src/frame-c/status-color.js';

describe('MB-T-WIREFRAME-T7-VISUAL-POLISH WB1 — status-color palette ratification (Sub-Q-B=i)', () => {
  it('probe-01a: statusToColor("open") returns ratified GREEN hex #5b9d6e', () => {
    expect(
      statusToColor('open'),
      'active/healthy session → GREEN per wireframe + T1 status-color.ts:16',
    ).toBe('#5b9d6e');
  });

  it('probe-01b: statusToColor("idle") returns ratified GREY hex #888888', () => {
    expect(
      statusToColor('idle'),
      'paused/idle session → GREY per wireframe + T1 status-color.ts:16',
    ).toBe('#888888');
  });

  it('probe-01c: statusToColor("warning") returns ratified AMBER hex #c97a3a', () => {
    expect(
      statusToColor('warning'),
      'warning state → AMBER per wireframe + T1 status-color.ts:16',
    ).toBe('#c97a3a');
  });

  it('probe-01d: statusToColor("detached") returns ratified AMBER hex #c97a3a (transient state)', () => {
    expect(
      statusToColor('detached'),
      'detached/transient state → AMBER (shared with warning) per T1 status-color.ts:16 "warning + transient" mapping',
    ).toBe('#c97a3a');
  });

  it('probe-01e: statusToColor("error") returns ratified RED hex #c54a4a', () => {
    expect(
      statusToColor('error'),
      'error/failure state → RED per wireframe + T1 status-color.ts:16',
    ).toBe('#c54a4a');
  });

  it('probe-01f: statusToColor("killed") returns null filter sentinel', () => {
    expect(
      statusToColor('killed'),
      'killed sessions are filtered out before rendering; null is the "do not render dot" defensive signal per T1 status-color.ts contract',
    ).toBeNull();
  });
});
