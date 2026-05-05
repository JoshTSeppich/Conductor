// Fix-84 / Probe 6 — Defect B card-emission + audit-row write — MANUAL.
//
// Cairn finding #84 Defect B / Fix-A resolution explicitly notes:
//   "Strict caveat: the model selected output_type:'action' for the
//    prompt rather than card / multi-choice-card. Per orchestrator-
//    output-router.ts, only card / multi-choice-card variants emit
//    orchestrator-card-rendered to the kanban webview. So the
//    *kanban-card-renders* link of the chain is not directly
//    observable from this run — but every preceding link (chat→
//    orchestrator→structured output) is alive and working. The card-
//    vs-action choice is prompt/model territory, not a defect; ...
//    Card emission is verifiable separately by varying the prompt or
//    by inspecting the routing predicate; it is *not* what #84's two
//    defects blocked."
//
// Per operator arbitration (test-batch-1 Q4 ack):
//   "accept MANUAL as terminal status. Do NOT escalate to prompt-
//    coercion spike. Reasoning: prompt-coercion to force output_type:
//    card is itself non-deterministic; would produce flaky probe OR
//    drift-fragile prompt-engineering. Card path is exercised in
//    operator dogfood. MANUAL with explicit operator-step in
//    REPORT.md is honest framing. Banking for cairn formalization:
//    non-deterministic surfaces stay MANUAL. Stochastic behavior at
//    the test boundary doesn't get faked into looking deterministic."
//
// This probe is therefore a fail-loud MANUAL designation in the
// test-runner output AND a build-pipeline asserter that the
// production routing predicate + IPC emit site survive bundling.
// The operator-step that completes the assertion is documented in
// REPORT.md.
//
// KNOWN: pure-fs assertions; no Electron, no daemon. Plus an
// it.skip() with explicit MANUAL reason so the test runner surfaces
// the manual surface in every run.
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, '../../..');
const SRC_ROUTER_TS = resolve(PACKAGE_ROOT, 'src/main/orchestrator-output-router.ts');
const SRC_COARCH_IPC_TS = resolve(PACKAGE_ROOT, 'src/main/coarchitect-ipc.ts');
const SRC_CARD_IPC_TS = resolve(PACKAGE_ROOT, 'src/main/card-ipc.ts');
const SRC_CARD_WIRING_TS = resolve(PACKAGE_ROOT, 'src/main/card-wiring.ts');
const DIST_ROUTER_JS = resolve(PACKAGE_ROOT, 'dist/main/orchestrator-output-router.js');
const DIST_COARCH_IPC_JS = resolve(PACKAGE_ROOT, 'dist/main/coarchitect-ipc.js');

function readUtf8(path: string): string {
  if (!existsSync(path)) {
    throw new Error(`expected ${path}`);
  }
  return readFileSync(path, 'utf8');
}

describe('Fix-84 / Probe 6 — Defect B card-emission + audit-row — MANUAL', () => {
  it('orchestrator-output-router branches on card / multi-choice-card output_type', () => {
    // KNOWN: source-tree assertion. The routing predicate is what
    // gates whether 'orchestrator-card-rendered' fires. Removing
    // either branch would silently drop the card-render path even
    // though Defect B's persistence layer is functional.
    const src = readUtf8(SRC_ROUTER_TS);
    expect(src).toMatch(/output\.type === 'card'/);
    expect(src).toMatch(/output\.type === 'multi-choice-card'/);
    // Cross-ref to the IPC channel name as documented in the comment
    // header.
    expect(src).toMatch(/orchestrator-card-rendered/);
  });

  it('coarchitect-ipc.ts emits orchestrator-card-rendered IPC channel to webContents', () => {
    // KNOWN: source-tree assertion of the emit site. Coarchitect-
    // ipc.ts:173 calls wc.send('orchestrator-card-rendered', ...) on
    // the routing decision. Without this emit, even a card-shape
    // model output never reaches the kanban webview.
    const src = readUtf8(SRC_COARCH_IPC_TS);
    expect(src).toMatch(/wc\.send\(\s*'orchestrator-card-rendered'/);
  });

  it('card-ipc + card-wiring wire the audit-row write path consumed by Probe 6 MANUAL step', () => {
    // KNOWN: source-tree assertion. The audit-row write is what the
    // operator-experiential MANUAL step exercises end-to-end (operator
    // approves a card → audit row hits daemon /v3/orchestrator/audit).
    // Removing wireCardIpc (card-wiring.ts) or the audit handler /
    // builder (card-ipc.ts) would break the manual path silently.
    const ipcSrc = readUtf8(SRC_CARD_IPC_TS);
    expect(ipcSrc).toMatch(/audit/i);
    expect(ipcSrc).toMatch(/buildApproveAuditRow/);
    const wiringSrc = readUtf8(SRC_CARD_WIRING_TS);
    expect(wiringSrc).toMatch(/export function wireCardIpc/);
  });

  it('dist artifacts carry the bundled card-rendered emit + routing predicate', () => {
    // KNOWN: build-pipeline assertion. tsc-bundled .js files for the
    // router + coarchitect-ipc must include both the routing
    // predicate AND the IPC emit string.
    const distRouter = readUtf8(DIST_ROUTER_JS);
    expect(distRouter).toMatch(/multi-choice-card/);
    expect(distRouter).toMatch(/orchestrator-card-rendered/);
    const distCoarch = readUtf8(DIST_COARCH_IPC_JS);
    expect(distCoarch).toMatch(/orchestrator-card-rendered/);
  });

  // MANUAL probe — fail-loud designation visible in every test run.
  // The substantive end-to-end assertion (operator types prompt →
  // model emits card → kanban renders → operator approves → audit
  // row writes → daemon GET /v3/orchestrator/audit returns the row)
  // is non-deterministic at the model boundary and is exercised in
  // operator dogfood per finding #84 resolution. Per operator
  // arbitration (test-batch-1 Q4): NOT escalated to prompt-coercion
  // spike. See REPORT.md for the operator-step.
  it.skip(
    'MANUAL: card emission + audit-row write require operator dogfood — see fix-84-verification/REPORT.md for step (skip is intentional, non-deterministic at model boundary)',
    () => {
      // intentionally empty — the operator-step lives in REPORT.md.
      // This skipped case ensures the test-runner output surfaces the
      // manual surface every run, so coverage drift cannot silently
      // dismiss it.
    },
  );
});
