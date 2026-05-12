#!/usr/bin/env node
// MB-T-METHODOLOGY-PHASE-3-VISUAL-VERIFICATION-TOOLING WB10 · CLI wrapper
//
// Invokes `runPhase3Smoke` from phase-3-visual-smoke.mjs and prints the
// single-line summary to stdout for commit-body inclusion. Exit code:
//   0   for PASS / TARGET-ABSENT (graceful-degradation per §2.3)
//   1   for FAIL / BUILD-FAILED / LAUNCH-FAILED (genuine failure)
//
// Per Sub-Q-A=(ii) per-package package.json scripts pattern; invoked via:
//   pnpm --filter dispatch-workstation verify:phase-3-smoke
//
// Direct invocation from repo root FAILS — see WB2 SPIKE ADR §4 risk
// (pnpm workspace @playwright/test resolution requires per-package dir).

import { runPhase3Smoke } from './phase-3-visual-smoke.mjs';

const result = await runPhase3Smoke({});
console.log(result.summary);

const exitOk =
  result.state === 'PASS' || result.state === 'TARGET-ABSENT';
process.exit(exitOk ? 0 : 1);
