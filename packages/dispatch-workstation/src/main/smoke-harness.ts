// MB-T08 Cluster 4 GREEN — SmokeHarness.
//
// Vision §8.2 ship-gate validation surface. Drives the full app lifecycle
// (launch → onboarding → spawn → exit) via the existing MB_TEST_HOOKS=1
// stdin-command + sentinel pattern (precedent: main.ts:132–217 +
// spawn-modal-emits-intent.test.ts:57 spawnApp).
//
// The harness depends on a ProcessController interface so unit tests inject
// a deterministic fake; production wires the real Electron-child-process
// controller (electron-process-controller.ts). Per WORKSTATION_CONTRACT.md
// §9 — methodology compliance: smoke harness is operator-arbitrated as
// non-CI v3.0 ship-gate validation.

export interface ProcessLaunchOpts {
  headless: boolean;
  env: Record<string, string>;
}

/**
 * Controller surface the harness needs. Defined as an injectable interface so
 * unit tests don't require Electron and so the real controller (Electron
 * child process spawn + sentinel parser) is swappable for future drivers
 * (e.g. playwright-electron, if v3.x adopts it per V3_TICKETS.md MB-T08
 * GREEN suggestion).
 */
export interface ProcessController {
  isLaunched(): boolean;
  launch(opts: ProcessLaunchOpts): Promise<void>;
  sendStdin(line: string): Promise<void>;
  /** Resolves once a stdout line equal to the sentinel name has been observed. */
  waitForSentinel(name: string): Promise<void>;
  /** Sends terminate signal + waits exit. Returns exit code (or null if killed by signal). */
  exit(): Promise<number | null>;
}

export interface SmokeHarnessOpts {
  processController: ProcessController;
}

export interface RunOnboardingOpts {
  apiKey: string;
}

export interface SpawnSessionOpts {
  repoPath: string;
  sessionName: string;
}

export class SmokeHarness {
  private readonly ctrl: ProcessController;

  constructor(opts: SmokeHarnessOpts) {
    this.ctrl = opts.processController;
  }

  isLaunched(): boolean {
    return this.ctrl.isLaunched();
  }

  async launch(): Promise<void> {
    await this.ctrl.launch({
      headless: true,
      env: { MB_TEST_HOOKS: '1' },
    });
  }

  /**
   * Drive onboarding modal through completion via the MB_TEST_HOOKS stdin
   * commands (extended for MB-T08 by main.ts cluster). Renderer sentinels:
   *   - ONBOARDING_READY  — modal mounted
   *   - ONBOARDING_COMPLETE — Done clicked, markOnboardingComplete done
   */
  async runOnboarding(opts: RunOnboardingOpts): Promise<void> {
    await this.ctrl.waitForSentinel('ONBOARDING_READY');
    await this.ctrl.sendStdin('ONBOARDING_NEXT');
    await this.ctrl.sendStdin(`ONBOARDING_API_KEY ${opts.apiKey}`);
    await this.ctrl.sendStdin('ONBOARDING_DONE');
    await this.ctrl.waitForSentinel('ONBOARDING_COMPLETE');
  }

  /**
   * Open spawn modal, fill it, submit. Reuses existing CLICK_SPAWN_BUTTON +
   * FILL_AND_SUBMIT_SPAWN <repoPath>|<sessionName> stdin commands wired in
   * main.ts:148–195. The harness only waits for SPAWN_MODAL_OPENED today;
   * a "spawn-result completed" sentinel is followup-tracked
   * (MB-F-MB-T08-SPAWN-RESULT-SENTINEL) — the renderer currently does not
   * subscribe to workstation:spawn-result, so MB-T08 cannot wire the
   * completion sentinel without crossing into MB-T05/MB-T06 territory.
   */
  async spawnSession(opts: SpawnSessionOpts): Promise<void> {
    await this.ctrl.sendStdin('CLICK_SPAWN_BUTTON');
    await this.ctrl.waitForSentinel('SPAWN_MODAL_OPENED');
    await this.ctrl.sendStdin(
      `FILL_AND_SUBMIT_SPAWN ${opts.repoPath}|${opts.sessionName}`,
    );
  }

  async exit(): Promise<number | null> {
    await this.ctrl.sendStdin('QUIT');
    return this.ctrl.exit();
  }
}
