#!/usr/bin/env node
// MB-S02 step D — session registration structural comparison.
//
// Reads:
//   results/session-cli.json       POST /v2/sessions response (CLI baseline)
//   results/session-electron.json  POST /v2/sessions response (Electron B1)
//
// Writes:
//   results/session-comparison.json  structural field diff + verdict
//
// Validates the §8.1 claim: "session registered by Electron produces a
// structurally identical record to a CLI-registered session."
//
// "Structurally identical" means every field present in the 201 body has
// the same shape and type. Values may differ for provenance fields (name,
// cwd, tmux_target, handoff_path — these are probe-specific inputs) and
// timestamps (null at registration time in both cases — verified here).
//
// Run from packages/dispatch-menubar:
//   node spikes/MB-S02/compare-sessions.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SPIKE_DIR = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(SPIKE_DIR, 'results');

// Fields that are expected to differ (probe-specific inputs).
const PROVENANCE_FIELDS = new Set(['name', 'cwd', 'tmux_target', 'handoff_path']);

// Fields that must be null in both records at registration time (per §4.3 +
// daemon impl at routes/sessions.ts:157-166 + schema at v2/schema.ts:86-98).
const MUST_BE_NULL = new Set([
  'last_prompt_sent_at',
  'last_handoff_pulled_at',
  'last_commit_sha',
  'last_status_json_at',
]);

function readResult(filename) {
  const path = join(RESULTS_DIR, filename);
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    return { error: err.message };
  }
}

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function compareFields(cliBody, electronBody) {
  const allKeys = new Set([...Object.keys(cliBody), ...Object.keys(electronBody)]);
  const results = [];

  for (const key of [...allKeys].sort()) {
    const cliVal  = cliBody[key];
    const elVal   = electronBody[key];
    const cliType = typeOf(cliVal);
    const elType  = typeOf(elVal);

    const isProvenance = PROVENANCE_FIELDS.has(key);
    const mustBeNull   = MUST_BE_NULL.has(key);

    if (!(key in cliBody)) {
      results.push({ field: key, status: 'only_in_electron', cli: undefined, electron: elVal, verdict: 'DIVERGENCE' });
      continue;
    }
    if (!(key in electronBody)) {
      results.push({ field: key, status: 'only_in_cli', cli: cliVal, electron: undefined, verdict: 'DIVERGENCE' });
      continue;
    }
    if (cliType !== elType) {
      results.push({ field: key, status: 'type_mismatch', cli_type: cliType, electron_type: elType, cli: cliVal, electron: elVal, verdict: 'DIVERGENCE' });
      continue;
    }
    if (mustBeNull) {
      const nullStatus = cliVal === null && elVal === null ? 'PASS' : 'DIVERGENCE';
      results.push({ field: key, status: 'null_check', cli: cliVal, electron: elVal, verdict: nullStatus });
      continue;
    }
    if (isProvenance) {
      results.push({ field: key, status: 'provenance_field', cli: cliVal, electron: elVal, verdict: 'EXPECTED_DIFFERENCE' });
      continue;
    }
    if (cliVal === elVal) {
      results.push({ field: key, status: 'match', value: cliVal, verdict: 'PASS' });
    } else {
      results.push({ field: key, status: 'value_differs', cli: cliVal, electron: elVal, verdict: 'DIVERGENCE' });
    }
  }

  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const cliResult      = readResult('session-cli.json');
const electronResult = readResult('session-electron.json');

const report = {
  generated_at: new Date().toISOString(),
  cli_http_code: cliResult.http_code ?? null,
  electron_http_code: electronResult.http_code ?? null,
  fields: null,
  verdict: null,
  notes: [],
};

if (cliResult.error) {
  report.notes.push(`session-cli.json unreadable: ${cliResult.error}`);
  report.verdict = 'CANNOT_COMPARE';
} else if (electronResult.error) {
  report.notes.push(`session-electron.json unreadable: ${electronResult.error}`);
  report.verdict = 'CANNOT_COMPARE';
} else if (cliResult.skipped) {
  report.notes.push('CLI registration was skipped (token not found)');
  report.verdict = 'CANNOT_COMPARE';
} else if (electronResult.skipped) {
  report.notes.push('Electron registration was skipped (token not found)');
  report.verdict = 'CANNOT_COMPARE';
} else if (cliResult.http_code !== 201) {
  report.notes.push(`CLI registration returned HTTP ${cliResult.http_code} (expected 201)`);
  report.verdict = 'CANNOT_COMPARE';
} else if (electronResult.http_code !== 201) {
  report.notes.push(`Electron registration returned HTTP ${electronResult.http_code} (expected 201)`);
  report.verdict = 'CANNOT_COMPARE';
} else {
  const cliBody      = cliResult.body;
  const electronBody = electronResult.body;

  report.fields = compareFields(cliBody, electronBody);

  const divergences = report.fields.filter(f => f.verdict === 'DIVERGENCE');
  if (divergences.length === 0) {
    report.verdict = 'PASS';
    report.notes.push('All non-provenance fields structurally identical. §8.1 registration parity: KNOWN.');
  } else {
    report.verdict = 'DIVERGENCE';
    report.notes.push(`${divergences.length} unexpected divergence(s) found. §8.1 registration parity: SPECULATIVE.`);
    for (const d of divergences) {
      report.notes.push(`  DIVERGENCE: field="${d.field}" status="${d.status}"`);
    }
  }
}

const outPath = join(RESULTS_DIR, 'session-comparison.json');
writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');

console.log('[compare-sessions] session-comparison.json written');
console.log(`  CLI HTTP:      ${report.cli_http_code}`);
console.log(`  Electron HTTP: ${report.electron_http_code}`);
console.log(`  Verdict:       ${report.verdict}`);
for (const note of report.notes) {
  console.log(`  ${note}`);
}
