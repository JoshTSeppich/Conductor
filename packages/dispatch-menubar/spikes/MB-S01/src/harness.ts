// SPIKE: MB-S01 harness entrypoint. Iterates scenarios, calls Sonnet 4.6,
// records raw results + summary. Halts on missing ANTHROPIC_API_KEY.
//
// Run: ANTHROPIC_API_KEY=sk-ant-... pnpm exec tsx \
//   packages/dispatch-menubar/spikes/MB-S01/src/harness.ts
// or via run.sh in the spike root.

import * as fs from "node:fs";
import * as path from "node:path";
import * as url from "node:url";
import { composeContext } from "./compose-context.ts";
import { invokeOrchestrator, attemptParse } from "./invoke.ts";
import { validateOutput } from "./schema-validate.ts";
import { detectSelfCheck } from "./self-check-detect.ts";
import { summarize, projectMonthlyCost, type RawResult } from "./measure.ts";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const FIXTURES_ROOT = path.resolve(__dirname, "../fixtures");
const RESULTS_ROOT = path.resolve(__dirname, "../results");
const SYSTEM_PROMPT_PATH = path.resolve(__dirname, "../../../coarchitect/system-prompt.md");
const BUILD_DOC_PATH = path.join(FIXTURES_ROOT, "build-doc.build.md");
const DAEMON_STATE_PATH = path.join(FIXTURES_ROOT, "daemon-state.json");
const CHAT_HISTORY_PATH = path.join(FIXTURES_ROOT, "chat-history.json");
const SCENARIO_DIR = path.join(FIXTURES_ROOT, "scenarios");

const MODEL = process.env.MB_S01_MODEL || "claude-sonnet-4-6";
const MAX_TOKENS = parseInt(process.env.MB_S01_MAX_TOKENS || "4096", 10);
const INTER_CALL_DELAY_MS = parseInt(process.env.MB_S01_INTER_CALL_DELAY_MS || "500", 10);
const PRICE_INPUT = parseFloat(process.env.MB_S01_PRICE_INPUT_USD_PER_M || "3.00");
const PRICE_OUTPUT = parseFloat(process.env.MB_S01_PRICE_OUTPUT_USD_PER_M || "15.00");

async function main(): Promise<number> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("HALT: ANTHROPIC_API_KEY not set in environment.");
    console.error("Per MB-S01 brief: operator must export the key for the spike run.");
    console.error("");
    console.error("Example:");
    console.error("  export ANTHROPIC_API_KEY=sk-ant-...");
    console.error("  ./packages/dispatch-menubar/spikes/MB-S01/run.sh");
    return 1;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(RESULTS_ROOT, stamp);
  const rawDir = path.join(runDir, "raw");
  fs.mkdirSync(rawDir, { recursive: true });

  const scenarioFiles = fs
    .readdirSync(SCENARIO_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const allResults: RawResult[] = [];

  console.log(`MB-S01 harness starting.`);
  console.log(`  Run directory: ${runDir}`);
  console.log(`  Model: ${MODEL}`);
  console.log(`  Max tokens: ${MAX_TOKENS}`);
  console.log(`  Inter-call delay: ${INTER_CALL_DELAY_MS}ms`);
  console.log(`  Pricing (MODELED): input=$${PRICE_INPUT}/M, output=$${PRICE_OUTPUT}/M`);
  console.log(`  Scenario files: ${scenarioFiles.join(", ")}`);
  console.log("");

  for (const scenarioFile of scenarioFiles) {
    const scenariosBlob = JSON.parse(fs.readFileSync(path.join(SCENARIO_DIR, scenarioFile), "utf8"));
    const scenarios = scenariosBlob.scenarios as any[];

    for (const scenario of scenarios) {
      const id = scenario.id;
      process.stdout.write(`▶ ${id} — ${scenario.description}\n`);

      const ctx = composeContext({
        systemPromptMarkdownPath: SYSTEM_PROMPT_PATH,
        buildDocPath: BUILD_DOC_PATH,
        daemonStatePath: DAEMON_STATE_PATH,
        chatHistoryPath: CHAT_HISTORY_PATH,
        scenario: {
          id,
          triggering_event: scenario.triggering_event,
          session_filter: scenario.session_filter ?? [],
        },
      });

      const inv = await invokeOrchestrator({
        systemPrompt: ctx.systemPrompt,
        userMessage: ctx.userMessage,
        model: MODEL,
        maxTokens: MAX_TOKENS,
      });

      // If the SDK errored on the model string, halt the entire run so the
      // operator doesn't burn token budget on a misconfigured model.
      if (inv.error && inv.error_class === "NotFoundError") {
        console.error(
          `HALT: model ${MODEL} not found by SDK. error=${inv.error}. ` +
            `Override via MB_S01_MODEL env if a different string is required.`,
        );
        return 2;
      }

      const parse = attemptParse(inv.raw);
      let schema: { ok: boolean; error: string | null; type: string | null } = {
        ok: false,
        error: null,
        type: null,
      };
      if (parse.ok) {
        schema = validateOutput(parse.parsed);
      } else {
        schema.error = parse.jsonError;
      }

      const passResult = checkPassCriteria({
        scenario,
        parse,
        schema,
      });

      const result: RawResult = {
        scenario_id: id,
        scenario_file: scenarioFile,
        expected_output_type: scenario.expected_output_type,
        ttft_ms: inv.ttft_ms,
        total_ms: inv.total_ms,
        input_tokens: inv.input_tokens,
        output_tokens: inv.output_tokens,
        parse_ok: parse.ok,
        parse_stripped_fences: parse.strippedFences,
        schema_ok: schema.ok,
        detected_type: schema.type,
        pass: passResult.pass,
        pass_detail: passResult.detail,
        error: inv.error ?? schema.error ?? parse.jsonError,
      };
      allResults.push(result);

      const rawSafe = inv.raw.length > 8000 ? inv.raw.slice(0, 8000) + "...[TRUNCATED]" : inv.raw;
      fs.writeFileSync(
        path.join(rawDir, `${id}.json`),
        JSON.stringify(
          {
            scenario,
            context_lengths: {
              system_prompt_chars: ctx.systemPromptLen,
              user_message_chars: ctx.userMessageLen,
            },
            build_doc_commit_sha: ctx.buildDocCommitSha,
            invocation: {
              model_string_used: inv.model_string_used,
              ttft_ms: inv.ttft_ms,
              total_ms: inv.total_ms,
              input_tokens: inv.input_tokens,
              output_tokens: inv.output_tokens,
              error: inv.error,
              error_class: inv.error_class,
              raw: rawSafe,
            },
            parse: {
              ok: parse.ok,
              stripped_fences: parse.strippedFences,
              json_error: parse.jsonError,
              parsed: parse.parsed,
            },
            schema,
            pass_result: passResult,
            result,
          },
          null,
          2,
        ),
        "utf8",
      );

      const status = passResult.pass ? "PASS" : "FAIL";
      console.log(
        `  [${status}] ttft=${inv.ttft_ms ?? "n/a"}ms total=${inv.total_ms}ms ` +
          `tok_in=${inv.input_tokens ?? "n/a"} tok_out=${inv.output_tokens ?? "n/a"} ` +
          `parse_ok=${parse.ok}${parse.strippedFences ? "(fenced)" : ""} schema_ok=${schema.ok}`,
      );
      if (!passResult.pass) {
        console.log(`         ${passResult.detail}`);
      }

      if (INTER_CALL_DELAY_MS > 0) {
        await sleep(INTER_CALL_DELAY_MS);
      }
    }
  }

  const summary = summarize(allResults);
  const projections: Record<string, ReturnType<typeof projectMonthlyCost>> = {};
  for (const cpd of [100, 200, 500]) {
    projections[`calls_per_day_${cpd}`] = projectMonthlyCost({
      input_tokens_avg: summary.input_tokens_avg,
      output_tokens_avg: summary.output_tokens_avg,
      input_price_per_million_usd: PRICE_INPUT,
      output_price_per_million_usd: PRICE_OUTPUT,
      calls_per_day: cpd,
    });
  }

  const summaryJson = {
    timestamp: new Date().toISOString(),
    model: MODEL,
    summary,
    pass_breakdown: passBreakdown(allResults),
    projections_at_pricing: {
      input_usd_per_million: PRICE_INPUT,
      output_usd_per_million: PRICE_OUTPUT,
      _note:
        "MODELED input. Operator must verify against current Anthropic pricing for Sonnet 4.6 at https://www.anthropic.com/pricing as of run date.",
    },
    projections,
  };

  fs.writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(summaryJson, null, 2), "utf8");
  fs.writeFileSync(path.join(runDir, "summary.md"), renderSummaryMd(summaryJson), "utf8");

  console.log("");
  console.log("=== SUMMARY ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log("");
  console.log(`Pass breakdown:`);
  console.log(JSON.stringify(summaryJson.pass_breakdown, null, 2));
  console.log("");
  console.log(`Run directory: ${runDir}`);
  console.log(`Summary files: summary.json, summary.md`);
  return 0;
}

function checkPassCriteria(args: {
  scenario: any;
  parse: { ok: boolean; parsed: unknown; jsonError: string | null };
  schema: { ok: boolean; error: string | null; type: string | null };
}): { pass: boolean; detail: string; self_check?: ReturnType<typeof detectSelfCheck> } {
  if (!args.parse.ok) return { pass: false, detail: `parse failed: ${args.parse.jsonError ?? "unknown"}` };
  if (!args.schema.ok) return { pass: false, detail: `schema failed: ${args.schema.error ?? "unknown"}` };

  const pc = (args.scenario.pass_criteria || {}) as any;
  const out = args.parse.parsed as any;

  if (pc.type && out.type !== pc.type) {
    return { pass: false, detail: `type mismatch: got ${out.type}, expected ${pc.type}` };
  }
  if (pc.type_in && !pc.type_in.includes(out.type)) {
    return { pass: false, detail: `type mismatch: got ${out.type}, expected ${pc.type_in.join("|")}` };
  }

  if (pc.action_in && (out.type === "action" || out.type === "card")) {
    if (!pc.action_in.includes(out.action)) {
      return { pass: false, detail: `action mismatch: got ${out.action}, expected ${pc.action_in.join("|")}` };
    }
  }

  if (pc.options_count_in && out.type === "multi-choice-card") {
    if (!Array.isArray(out.options) || !pc.options_count_in.includes(out.options.length)) {
      return {
        pass: false,
        detail: `options count: got ${out.options?.length ?? "n/a"}, expected ${pc.options_count_in.join("|")}`,
      };
    }
  }

  if (pc.self_check_in_payload === true) {
    const det = detectSelfCheck(out);
    if (!det.found_in_payload) {
      return { pass: false, detail: `self-check absent from payload (${det.detail})`, self_check: det };
    }
    return { pass: true, detail: `self-check ok (${det.detail})`, self_check: det };
  }

  return { pass: true, detail: "ok" };
}

function passBreakdown(
  results: RawResult[],
): Record<string, { total: number; pass: number; fail_ids: string[] }> {
  const groups: Record<string, RawResult[]> = {};
  for (const r of results) {
    const key = r.scenario_file.replace(".json", "");
    (groups[key] ||= []).push(r);
  }
  const out: Record<string, { total: number; pass: number; fail_ids: string[] }> = {};
  for (const [k, rs] of Object.entries(groups)) {
    out[k] = {
      total: rs.length,
      pass: rs.filter((r) => r.pass).length,
      fail_ids: rs.filter((r) => !r.pass).map((r) => r.scenario_id),
    };
  }
  return out;
}

function renderSummaryMd(s: any): string {
  return `# MB-S01 spike run summary

- Timestamp: ${s.timestamp}
- Model: ${s.model}

## Aggregate metrics

\`\`\`json
${JSON.stringify(s.summary, null, 2)}
\`\`\`

## Pass breakdown by scenario file

\`\`\`json
${JSON.stringify(s.pass_breakdown, null, 2)}
\`\`\`

## Cost projections

Pricing inputs (MODELED, operator-verifiable at https://www.anthropic.com/pricing for Sonnet 4.6):
- Input: \$${s.projections_at_pricing.input_usd_per_million}/M tokens
- Output: \$${s.projections_at_pricing.output_usd_per_million}/M tokens

\`\`\`json
${JSON.stringify(s.projections, null, 2)}
\`\`\`
`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

main().then(
  (code) => process.exit(code),
  (e) => {
    console.error("FATAL:", e);
    process.exit(1);
  },
);
