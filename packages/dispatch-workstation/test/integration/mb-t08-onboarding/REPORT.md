# MB-T08 onboarding probe — REPORT.md

**Branch:** `sess-3/probe-additions`
**Cut from:** `main` HEAD `af0ac36`
**Probe commit:** `56435af` (`green(probe-add): MB-T08 onboarding end-to-end probe`)
**Last individual-mode run:** 2026-05-05
**Aggregate result:** **1 / 1 PROBE PASS** (1 / 1 case, ~6s wall-clock)

Closes gap §4.1 #3 from `docs/probe-coverage-gap-analysis-2026-05-05.md`:
"MB-T08 — onboarding flow end-to-end (GAP). Stdin handlers + sentinels
are wired but no probe drives them."

## §1 Suite identity

- **1 probe file**: `probe-01-onboarding-end-to-end.test.ts` (~280 LOC).
- **1 darwin-gated test case**: two-spawn cycle.
- Plus the renderer-side React mount specs at `test/unit/mb-t08/`
  (19 specs); these probe the BrowserWindow modal path which is
  bypassed under MB_TEST_HOOKS=1 by main.ts:307-319 short-circuit.
  This integration probe is complementary, not a replacement.

## §2 Per-probe result

| # | Probe | Result | Evidence class | Test file |
|---|---|---|---|---|
| 1 | Onboarding flow end-to-end (two-spawn) | PASS in ~6s | KNOWN | `probe-01-onboarding-end-to-end.test.ts` |

### Probe 1 — Onboarding flow end-to-end — PASS

**Asserts:**

Spawn 1 (clean `MB_USER_DATA_DIR` + clean `MB_ONBOARDING_STATE_DIR`):
- `ONBOARDING_REQUIRED` sentinel fires (main.ts:311; first-launch path)
- `ONBOARDING_NEXT` stdin → `ONBOARDING_STEP_API_KEY` echo
- `ONBOARDING_API_KEY <synthetic>` stdin → `ONBOARDING_API_KEY_SAVED`
- `ONBOARDING_DONE` stdin → `ONBOARDING_COMPLETE`
- `<MB_ONBOARDING_STATE_DIR>/workstation-config.json` exists with
  `onboardingCompleted: true`
- `<MB_ONBOARDING_STATE_DIR>/anthropic-api-key.enc` exists
  (length/existence only; ciphertext value never echoed)
- Clean exit code 0 on QUIT

Spawn 2 (same `MB_USER_DATA_DIR` + same `MB_ONBOARDING_STATE_DIR`):
- `ONBOARDING_READY` sentinel fires (main.ts:432; post-createWindow)
- **Negative-evidence**: `ONBOARDING_REQUIRED` does NOT appear in stdout
  before `ONBOARDING_READY` (proves first-launch-detector honors the
  persisted `onboardingCompleted: true` state)
- Clean exit code 0 on QUIT

**Evidence class:** KNOWN end-to-end. Sentinel chain proves: first-launch
detection → smoke-path stdin handlers → safeStorage encrypt → file
persistence → first-launch detector ignores subsequent launches.

**Mechanism:** Smoke-harness short-circuit at main.ts:307-319 routes
`MB_TEST_HOOKS=1` past the production `runOnboardingIfNeeded`
BrowserWindow modal (which would block headless runs) and emits
`ONBOARDING_REQUIRED` directly. Stdin handlers at main.ts:513-536
invoke `saveApiKey` + `markOnboardingComplete` directly with the same
persistence calls the renderer's IPC channels (`workstation:onboarding-
save-api-key` + `workstation:onboarding-complete`) would use.
Behavior is identical from the on-disk standpoint.

**Catches regressions:**
- Smoke-path stdin handler removal/rename (timeout on any of 4 sentinels).
- `markOnboardingComplete` write-path break (assertion on
  `workstation-config.json` existence/contents).
- `saveApiKey` ciphertext write break (assertion on
  `anthropic-api-key.enc` existence).
- First-launch-detector regression that re-shows onboarding despite
  persisted state (negative-evidence in spawn 2).
- Any change to the `MB_ONBOARDING_STATE_DIR` env-override that
  breaks `configDir()` resolution.

**Defense-in-depth:**
- API key value is synthetic (`sk-ant-api03-PROBE-MB-T08-DO-NOT-USE-...`);
  never a real Anthropic key.
- API key plaintext is never echoed; assertion is existence-only on
  the encrypted ciphertext file.
- `MB_USER_DATA_DIR` + `MB_ONBOARDING_STATE_DIR` isolated to fresh
  tmpdirs; operator's real `~/.foxworks-dispatch/` and
  `~/Library/Application Support/` untouched.

## §3 What's verified — KNOWN evidence catalog

### §3.1 Onboarding stdin handler contract (main.ts:513-536)

- `ONBOARDING_NEXT` → `ONBOARDING_STEP_API_KEY` (no-op echo per smoke-
  path comment).
- `ONBOARDING_API_KEY <plaintext>` → `saveApiKey` → `ONBOARDING_API_KEY_SAVED`.
- `ONBOARDING_DONE` → `markOnboardingComplete` → `ONBOARDING_COMPLETE`.

**Confidence: KNOWN** — captured at probe HEAD; all 4 sentinels emitted
in single probe spawn within 6s wall-clock.

### §3.2 First-launch detector (main.ts:307-319)

- `checkFirstLaunch({configDir})` returns true → `ONBOARDING_REQUIRED`
  emitted (under MB_TEST_HOOKS=1).
- `checkFirstLaunch` returns false → silent short-circuit; only
  `ONBOARDING_READY` later.

**Confidence: KNOWN** — both branches observed across the two-spawn
cycle.

### §3.3 Persistence path (`onboarding-mount.ts`, `api-key-storage.ts`)

- `markOnboardingComplete({configDir})` writes
  `{onboardingCompleted: true}` JSON to
  `<configDir>/workstation-config.json`.
- `saveApiKey(plaintext, {configDir, safeStorage})` writes
  safeStorage-encrypted ciphertext to `<configDir>/anthropic-api-key.enc`.

**Confidence: KNOWN** — files observed on disk after sentinel arrival.

### §3.4 What is NOT verified at this probe

- **Renderer-side modal mount path**: production `runOnboardingIfNeeded`
  + `electronOnboardingDeps` open a real BrowserWindow with the React
  modal and listen for `ipcMain.once('workstation:onboarding-complete')`.
  This probe bypasses that path via the `MB_TEST_HOOKS=1` short-circuit.
  Renderer mount is covered by `test/unit/mb-t08/` (19 specs, jsdom).
- **safeStorage decrypt roundtrip**: this probe asserts the encrypted
  file exists; full encrypt → decrypt → process.env populate is
  covered by `test/integration/fix-84-verification/probe-03-defect-a-
  end-to-end-live.test.ts`.
- **Anthropic-outage / invalid build-doc / daemon-offline error UI**:
  separate gaps (gap analysis §4.2 P11/P13/P14) — out of scope.

## §4 Findings filed during probe development

**None.** The probe surfaced no defect; existing wiring behaves per
finding-doc and main.ts comments. Reserved finding range #115-119
(scaffold §2.3) — finding entry will land in commit 13 (cairn finding
entries aggregate).

## §5 Hash / commit references

| Commit | Body |
|---|---|
| `88daa41` | `green(probe-add): SHELL_EVAL stdin handler for shell DOM probes` |
| `56435af` | `green(probe-add): MB-T08 onboarding end-to-end probe` |
| this commit | `docs(probe-add): mb-t08-onboarding/REPORT.md` |

P3 closes gap §4.1 #3. Branch advance: `af0ac36 → 88daa41 → 56435af → this`.
