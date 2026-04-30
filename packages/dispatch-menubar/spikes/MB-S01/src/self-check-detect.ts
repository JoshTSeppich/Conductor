// SPIKE: MB-S01 self-check block detector.
//
// Per ratified P-0.3 Q5 + WORKSTATION_CONTRACT.md §3.5 + operator decision
// in MB-S01 brief: when the orchestrator proposes a draft-commit-message
// card, the 9-question self-check block per CONDUCTOR_API_CONTRACT.md
// §10.5 must appear in the card's `payload` field, NOT in `rationale`.
//
// Detection strategy: keyword regex per question. Sonnet may paraphrase
// rather than copy verbatim, so the detector accepts paraphrased forms
// that retain the key concept. Threshold: ≥7/9 questions matched in
// payload counts as "found in payload" (gives Sonnet some paraphrase
// latitude); the harness records the exact match count so the ADR can
// label by the strict 9/9 bar separately.

const SELF_CHECK_QUESTION_PATTERNS: { num: number; label: string; rx: RegExp }[] = [
  { num: 1, label: "API verified by spike", rx: /API.*verified by a spike|spike.*verifies the API/i },
  { num: 2, label: "behavior vs mocks", rx: /test exercise behavior, or my mocks|behavior\/MIXED\/MOCKS|behavior or my mocks/i },
  { num: 3, label: "implementation deleted, test still pass", rx: /implementation deleted.*test still pass|test still pass.*implementation deleted/i },
  { num: 4, label: "outside contract specification", rx: /outside this contract'?s? specification|outside the contract.*specification/i },
  { num: 5, label: "modify contract without operator", rx: /modify this contract without operator approval|modified this contract without operator/i },
  { num: 6, label: "claim unlabeled", rx: /any claim in my commit body unlabeled|unlabeled claim/i },
  { num: 7, label: "parallel session might also modify", rx: /parallel session might also modify|other parallel session/i },
  { num: 8, label: "direct registry write bypass", rx: /direct registry write|bypass.*PATCH \/v2\/sessions/i },
  { num: 9, label: "halt state without authorization", rx: /halt state.*wasn'?t? explicitly authorized|work during a halt state/i },
];

export interface SelfCheckDetection {
  found_in_payload: boolean;
  payload_match_count: number;
  rationale_match_count: number;
  payload_matches: number[]; // question numbers matched
  rationale_matches: number[];
  detail: string;
}

export function detectSelfCheck(card: any): SelfCheckDetection {
  if (!card || typeof card !== "object") {
    return {
      found_in_payload: false,
      payload_match_count: 0,
      rationale_match_count: 0,
      payload_matches: [],
      rationale_matches: [],
      detail: "card not object",
    };
  }
  const payloadStr = stringifyForSearch(card.payload);
  const rationaleStr = typeof card.rationale === "string" ? card.rationale : "";

  const payloadMatches = matchedQuestionNumbers(payloadStr);
  const rationaleMatches = matchedQuestionNumbers(rationaleStr);

  return {
    found_in_payload: payloadMatches.length >= 7,
    payload_match_count: payloadMatches.length,
    rationale_match_count: rationaleMatches.length,
    payload_matches: payloadMatches,
    rationale_matches: rationaleMatches,
    detail: `payload=${payloadMatches.length}/9 (${payloadMatches.join(",")}), rationale=${rationaleMatches.length}/9 (${rationaleMatches.join(",")})`,
  };
}

function stringifyForSearch(p: unknown): string {
  if (typeof p === "string") return p;
  if (p === undefined || p === null) return "";
  try {
    return JSON.stringify(p);
  } catch {
    return String(p);
  }
}

function matchedQuestionNumbers(text: string): number[] {
  const matched: number[] = [];
  for (const q of SELF_CHECK_QUESTION_PATTERNS) {
    if (q.rx.test(text)) matched.push(q.num);
  }
  return matched;
}
