# spike(§C.5) — PTY scrape: cross-substrate regex stability + CC CLI spawn capability

**Date:** 2026-05-10
**Session:** foxworks-dispatch main, SHA `02c4c4a` at spike start
**Scope per §A.2.R:** Cross-substrate regex stability of `[0-9]+ tokens$` pattern on Sonnet 4.6 / Opus 4.7 / Haiku 4.5.
**Q1:** (B) Live three-substrate — real CC CLI sessions, real PTY captures
**Q2:** (b) This file (`docs/coordination/spike-c5-pty-scrape-2026-05-10.md`)
**Q3:** (c) PTY capture via `tmux capture-pane -p` (functional equivalent of pty-stream-relay.ts tap; rendered screen content post-ANSI-decode)
**Q4:** (a) Regex matches 3/3 substrate captures — hard pass criterion

---

## §1 — Capture method

Each substrate session was spawned in a dedicated tmux window at 220×50:

```bash
tmux new-session -d -s spike-<id> -x 220 -y 50 -c <repoPath> \
  "/Users/joshuatseppich/.local/bin/claude --dangerously-skip-permissions --model <model-id>"
```

Probe prompt (identical across all three):
> "Explain how the TCP three-way handshake works. Cover what happens at each step (SYN, SYN-ACK, ACK), the role of sequence numbers, and why this process establishes a reliable connection. Be thorough, approximately 400-500 words."

Prompt submission: two Enter presses required in tmux context — `send-keys "text" Enter` places text in input area but does not submit; a subsequent bare `send-keys Enter` submits. Consistent across all three substrates. [KNOWN — see §4 implementation note]

Capture: `tmux capture-pane -p -t <session>` after `esc to interrupt` hint disappeared from status bar (indicating response complete). Regex run via `grep -oE '[0-9]+ tokens$'`.

---

## §2 — Status bar format (all substrates)

The CC CLI status bar line format is:

```
  ⏵⏵ bypass permissions on (shift+tab to cycle)       <N> tokens
```

Where:
- `<N>` is a plain integer with **no commas** regardless of magnitude
- `tokens` is the literal string
- The `<N> tokens` pair is always the **rightmost element** of the status bar line
- The status bar line therefore always terminates with `[0-9]+ tokens`

Regex `[0-9]+ tokens$` with end-of-line anchor matches correctly. [KNOWN]

---

## §3 — Capture results: 3/3 substrates

| Substrate | Model ID | Session | Final token count | Regex `[0-9]+ tokens$` | Result |
|-----------|----------|---------|-------------------|------------------------|--------|
| Sonnet 4.6 | `claude-sonnet-4-6` | `spike-s46` | `24220 tokens` | MATCH | **PASS** |
| Opus 4.7 | `claude-opus-4-7` | `spike-o47` | `33863 tokens` | MATCH | **PASS** |
| Haiku 4.5 | `claude-haiku-4-5-20251001` | `spike-h45` | `43514 tokens` | MATCH | **PASS** |

**Q4 criterion (a) satisfied: 3/3 substrate captures matched.** [KNOWN]

### Per-substrate anomalies (non-blocking)

**Sonnet 4.6:** Prompted at startup with API-key selection dialog (`ANTHROPIC_API_KEY` env var detected). Operator ratified option 2 (No, recommended — use Max-plan keychain). Status bar format unaffected. Mid-stream sample (`23356 tokens`) also matched during generation.

**Opus 4.7:** No API-key prompt (auth inherited from Sonnet 4.6 session, see §5). Substrate-specific indicator `◉ xhigh · /effort` appears on the same status bar line, to the **left** of the token count. Token count remains rightmost; `[0-9]+ tokens$` anchor is unaffected. Extended-thinking indicator `✻ Crunched for 14s` appears above separator line — not in status bar.

**Haiku 4.5:** No API-key prompt (auth inherited). Extended-thinking indicator uses a different verb: `✻ Sautéed for 11s` — whimsical cooking-verb family, substrate-specific flavor. Not in status bar; regex unaffected.

**Token counts increase with model generation order** (24220 → 33863 → 43514) — likely reflects accumulating context overhead within the `~/.local/bin/claude` process + ANTHROPIC_API_KEY env detection. Counts represent full context window usage, not response-only tokens. [MODELED — not verified by token-level inspection]

---

## §4 — Implementation notes for §C.5 ticket

**Double-Enter submission pattern.** When sending prompts programmatically to CC CLI via `tmux send-keys`, two Enter presses are required:

```bash
tmux send-keys -t <session> "prompt text" Enter   # text enters input field; Enter does NOT submit
tmux send-keys -t <session> Enter                  # bare Enter submits
```

This is consistent across all three substrates. [KNOWN] Root cause [MODELED]: CC CLI input editor treats Enter-within-non-empty-input as newline; Enter-on-trailing-blank-line as submit. §C.5 implementation must account for this when driving sessions programmatically.

**Quiescence detection.** Response completion is reliably detectable by absence of `esc to interrupt` in the captured pane. `tmux capture-pane -p | grep -q 'esc to interrupt'` is a valid polling predicate. [KNOWN — verified on all three substrates]

**Startup prompt variance.** First-ever session in a fresh environment may show the API-key selection dialog. Subsequent sessions in the same environment inherit the selection — no prompt appears. §C.5 implementation should handle or pre-dismiss this dialog if launching into a cold environment. [KNOWN]

---

## §5 — Broader capability observation (operator-directed, 2026-05-10)

[KNOWN — based on today's empirical evidence across three substrates]

**CC CLI can be spawned directly from CC sessions via tmux**, with `--model` flag selecting substrate and `--dangerously-skip-permissions` enabling unattended operation. This is the load-bearing operator capability beyond the narrow regex-stability sub-question.

**Max-plan keychain auth is inherited across child sessions.** Observed directly:
- Sonnet 4.6 (`spike-s46`): API-key prompt appeared; operator ratified "No (recommended)" — use Max-plan keychain auth.
- Opus 4.7 (`spike-o47`): No API-key prompt. Session spawned into authenticated state without any user interaction.
- Haiku 4.5 (`spike-h45`): No API-key prompt. Same.

Auth inheritance is session-level — once the CC CLI keychain selection is made in any session in the same user environment, subsequent spawned sessions inherit it. This means orchestrated multi-substrate spawning (as required by HSO Wave 1) does not require per-session credential management beyond the initial keychain setup. [KNOWN]

**`--model` flag is the correct substrate-selection mechanism.** All three model IDs resolved correctly (`claude-sonnet-4-6`, `claude-opus-4-7`, `claude-haiku-4-5-20251001`). Header bar in CC CLI TUI confirms substrate: `Sonnet 4.6 · Claude Max`, `Opus 4.7 · Claude Max`, `Haiku 4.5 · Claude Max`.

---

## §6 — Binding decisions

| Decision | Binding choice | Rationale |
|----------|---------------|-----------|
| Regex pattern for token scrape | `[0-9]+ tokens$` | Matches 3/3 substrates; plain-integer format with no commas; end-of-line anchor is safe because token count is always rightmost in status bar |
| Cross-substrate stability | CONFIRMED | Q4(a) 3/3 pass criterion met [KNOWN] |
| Prompt submission mechanism | Two-Enter pattern | `send-keys "text" Enter` + `send-keys Enter`; consistent across all substrates |
| Quiescence detection | Absence of `esc to interrupt` | Reliable completion signal; verified 3/3 |
| Auth management | No per-session credential work | Keychain inherited; only first-session dialog needs handling |

---

## §7 — Out of scope (deferred to §C.5 ticket)

- Integration test verifying regex against live daemon PTY relay stream (not tmux capture)
- Behavior under rapid multi-turn (token count stability mid-stream)
- Behavior at very high token counts (near context window limit)
- ANSI escape sequence handling in raw PTY stream vs `tmux capture-pane` decoded output
- Opus 4.7 `◉ xhigh · /effort` indicator: whether it can be suppressed or configured

---

## §8 — Ship-gate impact

**§A.2.R satisfied:** PTY scrape regex `[0-9]+ tokens$` is cross-substrate stable. [KNOWN]

This unblocks §C.5 ticket: implement token-cost meter reading from PTY scrape using this regex pattern, with the double-Enter and quiescence-detection patterns documented above.

**§C.3 and §C.4 remain closed** per §A.2.R ratification. No alternative token-source approach is needed.
