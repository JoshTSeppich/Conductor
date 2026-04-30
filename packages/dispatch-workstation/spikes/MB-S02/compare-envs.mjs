#!/usr/bin/env node
// MB-S02 step C — env diff analysis.
//
// Reads:
//   results/env-cli.txt              CLI baseline (tmux pane spawned from Terminal)
//   results/env-electron-b1.txt      Electron B1 pane (inherited process.env)
//   results/env-electron-b2.txt      Electron B2 pane (minimal launchd env)
//   results/env-electron-process.txt Electron process.env at main-process startup
//
// Writes:
//   results/env-diff.json            structured diff with divergence classification
//
// Run from packages/dispatch-menubar:
//   node spikes/MB-S02/compare-envs.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SPIKE_DIR = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(SPIKE_DIR, 'results');

// Divergence classification buckets (per ADR design).
// PATH_CRITICAL: vars that change which binaries/modules are found.
// CC_BEHAVIORAL: vars that change claude / AI tool behavior.
// TERMINAL_SPECIFIC: vars that only matter for terminal UX (colors, prompt, etc.)
// SPAWN_METADATA: vars injected by the spawn mechanism itself (expected differences).
// UNCLASSIFIED: everything else.
const CLASSIFICATION_RULES = [
  { bucket: 'PATH_CRITICAL',     pattern: /^(PATH|HOME|USER|LOGNAME|SHELL|NVM_DIR|NVM_BIN|PYENV_ROOT|RBENV_ROOT|GOPATH|GOROOT|JAVA_HOME|CARGO_HOME|RUSTUP_HOME|npm_config_prefix)$/ },
  { bucket: 'CC_BEHAVIORAL',     pattern: /^(ANTHROPIC_API_KEY|ANTHROPIC_MODEL|NODE_ENV|NODE_PATH|npm_|NPM_|PNPM_|CLAUDE_|FD_|FOXWORKS_|OPENAI_|GEMINI_)/ },
  { bucket: 'TERMINAL_SPECIFIC', pattern: /^(TERM|COLORTERM|TERM_PROGRAM|TERM_PROGRAM_VERSION|ITERM_|LC_|LANG|LANGUAGE|SHLVL|OLDPWD|HISTFILE|PS1|PS2|PROMPT_COMMAND|BASH_VERSION|ZSH_VERSION|CONDA_|VIRTUAL_ENV|DIRENV_|__CF_USER_TEXT_ENCODING|SECURITYSESSIONID|Apple_PubSub_Socket_Render)/ },
  { bucket: 'SPAWN_METADATA',    pattern: /^(TMUX|TMUX_PANE|WINDOWID|SSH_|DISPLAY|DBUS_|XDG_|DESKTOP_SESSION|SESSION_MANAGER|GPG_AGENT_INFO)$/ },
];

function classify(key) {
  for (const { bucket, pattern } of CLASSIFICATION_RULES) {
    if (pattern.test(key)) return bucket;
  }
  return 'UNCLASSIFIED';
}

function parseEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8');
    const result = {};
    for (const line of text.split('\n')) {
      const eq = line.indexOf('=');
      if (eq < 1) continue;
      result[line.slice(0, eq)] = line.slice(eq + 1);
    }
    return result;
  } catch (err) {
    console.warn(`[compare-envs] WARNING: could not read ${path}: ${err.message}`);
    return null;
  }
}

function diffEnvs(label, baseline, compare) {
  if (!compare) return { label, available: false, divergences: [] };

  const allKeys = new Set([...Object.keys(baseline), ...Object.keys(compare)]);
  const divergences = [];

  for (const key of [...allKeys].sort()) {
    const inBaseline = key in baseline;
    const inCompare  = key in compare;
    const baseVal    = baseline[key];
    const cmpVal     = compare[key];

    if (inBaseline && inCompare && baseVal === cmpVal) continue;

    const bucket = classify(key);
    if (inBaseline && !inCompare) {
      divergences.push({ key, status: 'only_in_cli', cli: baseVal, compare: null, bucket });
    } else if (!inBaseline && inCompare) {
      divergences.push({ key, status: 'only_in_electron', cli: null, compare: cmpVal, bucket });
    } else {
      divergences.push({ key, status: 'value_differs', cli: baseVal, compare: cmpVal, bucket });
    }
  }

  return { label, available: true, divergences };
}

function summarize(diff) {
  const byBucket = {};
  for (const d of diff.divergences) {
    byBucket[d.bucket] = (byBucket[d.bucket] ?? 0) + 1;
  }
  return { total: diff.divergences.length, by_bucket: byBucket };
}

// ── Main ─────────────────────────────────────────────────────────────────────
const cli       = parseEnvFile(join(RESULTS_DIR, 'env-cli.txt'));
const b1        = parseEnvFile(join(RESULTS_DIR, 'env-electron-b1.txt'));
const b2        = parseEnvFile(join(RESULTS_DIR, 'env-electron-b2.txt'));
const eProcEnv  = parseEnvFile(join(RESULTS_DIR, 'env-electron-process.txt'));

if (!cli) {
  console.error('[compare-envs] FATAL: env-cli.txt not found — run a-cli-baseline.sh first');
  process.exit(1);
}

const diffB1   = diffEnvs('B1_inherited', cli, b1);
const diffB2   = diffEnvs('B2_launchd_minimal', cli, b2);
const diffProc = diffEnvs('electron_process_env', cli, eProcEnv);

const report = {
  generated_at: new Date().toISOString(),
  cli_var_count: Object.keys(cli).length,
  comparisons: [
    { ...diffB1,   summary: summarize(diffB1) },
    { ...diffB2,   summary: summarize(diffB2) },
    { ...diffProc, summary: summarize(diffProc) },
  ],
  classification_note: 'PATH_CRITICAL divergences affect binary resolution. CC_BEHAVIORAL divergences affect claude/AI tool behavior. TERMINAL_SPECIFIC are cosmetic. SPAWN_METADATA are expected from tmux pane context.',
};

const outPath = join(RESULTS_DIR, 'env-diff.json');
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');

console.log('[compare-envs] env-diff.json written');
for (const cmp of report.comparisons) {
  if (!cmp.available) {
    console.log(`  ${cmp.label}: NOT AVAILABLE (results file missing)`);
    continue;
  }
  const s = cmp.summary;
  console.log(`  ${cmp.label}: ${s.total} divergences — ${JSON.stringify(s.by_bucket)}`);
}
