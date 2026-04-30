// SPIKE: MB-S01 single-call SDK invoker with streaming first-token latency
// capture. Halts on missing ANTHROPIC_API_KEY (operator brief: spike runs
// against real Anthropic API; harness MUST NOT proceed without key).

import Anthropic from "@anthropic-ai/sdk";

export interface InvokeInput {
  systemPrompt: string;
  userMessage: string;
  model: string;
  maxTokens: number;
}

export interface InvokeResult {
  raw: string;
  ttft_ms: number | null;
  total_ms: number;
  input_tokens: number | null;
  output_tokens: number | null;
  model_string_used: string;
  error: string | null;
  error_class: string | null;
}

export interface ParseAttempt {
  ok: boolean;
  parsed: unknown;
  strippedFences: boolean;
  jsonError: string | null;
}

export async function invokeOrchestrator(input: InvokeInput): Promise<InvokeResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY missing — invokeOrchestrator must not be called without it");
  }
  const client = new Anthropic();
  const tStart = Date.now();
  let tFirst: number | null = null;
  let raw = "";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  let error: string | null = null;
  let errorClass: string | null = null;

  try {
    const stream = client.messages.stream({
      model: input.model,
      max_tokens: input.maxTokens,
      system: input.systemPrompt,
      messages: [{ role: "user", content: input.userMessage }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (tFirst === null) tFirst = Date.now();
        const delta = event.delta as { type: string; text?: string };
        if (delta.type === "text_delta" && typeof delta.text === "string") {
          raw += delta.text;
        }
      } else if (event.type === "message_start") {
        const u = event.message?.usage;
        if (u && typeof u.input_tokens === "number") inputTokens = u.input_tokens;
      } else if (event.type === "message_delta") {
        const u = event.usage;
        if (u && typeof u.output_tokens === "number") outputTokens = u.output_tokens;
      }
    }

    const finalMessage = await stream.finalMessage();
    if (finalMessage.usage) {
      if (typeof finalMessage.usage.input_tokens === "number") inputTokens = finalMessage.usage.input_tokens;
      if (typeof finalMessage.usage.output_tokens === "number") outputTokens = finalMessage.usage.output_tokens;
    }
  } catch (e: any) {
    error = e?.message ?? String(e);
    errorClass = e?.constructor?.name ?? null;
  }

  return {
    raw,
    ttft_ms: tFirst === null ? null : tFirst - tStart,
    total_ms: Date.now() - tStart,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    model_string_used: input.model,
    error,
    error_class: errorClass,
  };
}

// Attempt to parse Sonnet's raw text as JSON. Records whether markdown
// fences had to be stripped — fence-wrapping is itself a structured-output
// discipline violation per primitive §2.5, so the harness records both
// the strict result (parse_ok with no stripping) and the salvaged result
// (parse_ok after stripping). Schema validation runs on the salvaged
// payload; the strippedFences flag is preserved in the raw result.
export function attemptParse(raw: string): ParseAttempt {
  let text = raw.trim();
  let strippedFences = false;
  const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
    strippedFences = true;
  }
  try {
    const parsed = JSON.parse(text);
    return { ok: true, parsed, strippedFences, jsonError: null };
  } catch (e: any) {
    return { ok: false, parsed: null, strippedFences, jsonError: e?.message ?? String(e) };
  }
}
