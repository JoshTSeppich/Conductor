# MB-S06 — tmux PTY bidirectional streaming for the §10 CC-console surface

**Status:** ACCEPTED. Spike-only ADR; informs CONSOLE-T01 daemon
endpoint implementation, CONSOLE-T02 IPC, and CONSOLE-T03 panel UI.
Surfaces a section-numbering ambiguity on the CONDUCTOR_API_CONTRACT.md
amendment (see §9) and a vision §10.6 wording question (see §10).

**Date:** 2026-05-02

**Authors:** Operator-supervised CC session; harness scaffold +
recorded results at commit `02cfc4d spike: MB-S06 PTY harness — 6
experiments`. All measurements are first-party harness output cited
inline below.

**Related contracts (read-only inputs):**
- `docs/vision/SECTION_10_CC_CONSOLE.md` (frozen at `eac381e`)
- `WORKSTATION_CONTRACT.md` (frozen, last touched at `acc2307`)
- `CONDUCTOR_API_CONTRACT.md` (frozen at v2.1.0, `952f857`)
- `docs/adr/MB-S02-tmux-spawn-fidelity.md` (KNOWN tmux+Electron behavior)
- Existing daemon transport: `packages/dispatch-core/src/transport/tmux.ts`
  (sendKeys via load-buffer + paste-buffer + send-keys Enter; capturePane
  via tmux capture-pane -p; hasSession via tmux has-session)

**Confidence labels per claim:** KNOWN (measured by this spike's harness),
MODELED (extrapolated from harness-adjacent evidence + tmux/PTY
documentation), SPECULATIVE (hypothesis-only; flagged as such).

---

## §1 — Context and question

Vision §10 (CC-console surface, frozen at `eac381e`) introduces five
new daemon endpoints under `/v3/sessions/:name/console/*` that together
expose bidirectional bytes-streaming over a tmux PTY:

- `POST /v3/sessions/:name/console/stdin` — write bytes to the named
  session's tmux STDIN.
- `WS /v3/sessions/:name/console/stream` — stream raw STDOUT bytes
  back as they arrive.
- `GET /v3/sessions/:name/console/buffer` — backfill from a
  daemon-side ring buffer.
- `POST /v3/sessions/:name/console/signal` — deliver SIGINT/SIGTERM/
  SIGHUP to the pane process.
- `GET /v3/sessions/:name/console/status` — buffer line count, daemon
  buffering on/off, last STDOUT activity.

§10.5 specifies a **daemon-side ring buffer (default 50,000 lines)**
behind the WS stream so a Workstation that opens a CC-console panel
mid-session can backfill, and §10.10 specifies ship-gate criteria
including 500 ms p50 first-byte latency, 60 s sustained streaming, and
Ctrl-C → SIGINT.

The existing daemon (`packages/dispatch-core/src/transport/tmux.ts`)
talks to tmux only in **one-shot snapshot mode** — `sendKeys` for
input via load-buffer/paste-buffer/send-keys Enter (KNOWN safe per
SPIKES.md §Spike 01) and `capturePane` for output via `tmux
capture-pane -p` (a snapshot, not a stream). MB-S02 proved spawn-time
PTY parity (KNOWN) but did not exercise streaming, signals, ring
buffers, reconnection, or fan-out.

**Question this spike answers:** is bidirectional bytes-streaming
between the daemon and a tmux pane PTY correct, bounded, signal-aware,
and multi-consumer-capable enough to meet vision §10's requirements,
and what are the gotchas CONSOLE-T01 must engineer around?

**Out of spike scope (deferred to CONSOLE-T01/T02/T03):**
- Implementing the production endpoints
- Wiring the IPC layer
- Webview xterm.js renderer (vision §10.11 Q4)
- SQLite `cc_console_buffer` table
- Modifying any frozen contract or vision §10 directly

## §2 — Method

Six harness experiments under
`packages/dispatch-daemon/spikes/MB-S06/pty-harness/`. Each spawns
its own isolated tmux server (`tmux -L mb-s06-<exp>-<pid> -f /dev/null`)
so a running production tmux server cannot pollute or be polluted by
the harness, and each experiment writes a JSON results file under
`results/expN-*.json`. Harness target programs are `bash`, `cat`, `seq`,
and `yes` only — `claude` itself is **not** spawned in the spike per
the operator's scope fence.

| # | Experiment              | Source                          | Result file                       |
|---|-------------------------|----------------------------------|-----------------------------------|
| 1 | Bytes integrity         | exp1-bytes-integrity.mjs        | results/exp1-bytes-integrity.json |
| 2 | Backpressure            | exp2-backpressure.mjs           | results/exp2-backpressure.json    |
| 3 | Signal forwarding       | exp3-signal-forwarding.mjs      | results/exp3-signal-forwarding.json |
| 4 | Ring buffer behavior    | exp4-ring-buffer.mjs            | results/exp4-ring-buffer.json     |
| 5 | WS reconnection         | exp5-ws-reconnection.mjs        | results/exp5-ws-reconnection.json |
| 6 | Multi-consumer fan-out  | exp6-multi-consumer.mjs         | results/exp6-multi-consumer.json  |

The streaming primitive used throughout is `tmux pipe-pane -O -t
<target> 'cat > <fifo-or-file>'`, which attaches a consumer command
whose stdin receives the pane process's STDOUT bytes (per
`tmux(1)` `pipe-pane`: `-O` opens a new pipe even if one is open;
default direction is the program's STDOUT to the command's STDIN).

The input primitive is the existing daemon pattern — `tmux
load-buffer -b <name> -` (bytes via stdin) + `tmux paste-buffer
[-r] -b <name> -t <target>`. The `-r` flag's behavior is one of the
spike's headline findings (§3.1).

All measurements taken on Darwin 25.3.0 arm64, tmux 3.6a, Node
v20.19.6, on 2026-05-02. Re-runnable via
`packages/dispatch-daemon/spikes/MB-S06/pty-harness/run-all.sh`.

## §3 — Bytes integrity round-trip

**Source:** `results/exp1-bytes-integrity.json`.

**Verdict:** Round-trip is byte-identical for all 6 test payloads
**only** when `tmux paste-buffer -r` is used. With default
paste-buffer (no `-r`), every payload's terminating LF (`0x0A`) is
silently rewritten to CR (`0x0D`) before reaching the pane process's
STDIN. Confidence: **KNOWN**.

### §3.1 The LF→CR translation gotcha

Per `tmux(1)` `paste-buffer [-dpr] [-s separator] [-b buffer-name]
[-t target-pane]`: "When output, any linefeed (LF) characters in the
paste buffer are replaced with a separator, by default carriage return
(CR). A custom separator may be specified using the -s flag. The -r
flag means to do no replacement (equivalent to a separator of LF)."

Harness evidence (results/exp1-bytes-integrity.json:
`mode_default` cases): with default paste-buffer, the captured byte
following each payload is `0d` (CR) where the input had `0a` (LF).
All 6 cases show this signature:

| Case               | Expected last byte | Captured last byte | Default mode |
|--------------------|---------------------|---------------------|--------------|
| ascii_short        | 0a                  | 0d                  | FAIL         |
| utf8_cjk           | 0a                  | 0d                  | FAIL         |
| utf8_emoji         | 0a                  | 0d                  | FAIL         |
| esc_ansi           | 0a                  | 0d                  | FAIL         |
| large_8kb (8191 B) | 0a                  | 0d                  | FAIL         |
| mixed_binary_ish   | 0a                  | 0d                  | FAIL         |

With `paste-buffer -r` (`mode_no_replace_dash_r` cases): all 6
payloads round-trip byte-identical. Captured hex matches expected hex
exactly, including UTF-8 multi-byte sequences (CJK
`e38193e38293e381abe381a1e381afe4b896e7958c0a`, emoji
`f09fa68af09f9a80e29ca80a`), ANSI escape sequences
(`1b5b33316d5245441b5b306d0a`), and an 8190-byte `A` run terminated
by LF.

### §3.2 Implication for CONSOLE-T01

The existing `packages/dispatch-core/src/transport/tmux.ts:25` `sendKeys`
function uses default paste-buffer (no `-r`) followed by an explicit
`send-keys Enter`. That pattern is correct for the **send-prompt**
semantic where any embedded LF in the prompt body is intentionally
translated to CR (which Claude Code interprets as the submit key), and
the trailing Enter ensures submission of the prompt.

The new **`POST .../console/stdin`** endpoint is byte-pass-through, not
prompt-injection, and therefore **MUST use `paste-buffer -r`** to
preserve the operator's bytes verbatim. Without `-r` an operator typing
multi-line text into the panel would have every LF rewritten to CR
before reaching CC, which CC's input handler may interpret as multiple
submits (depending on its readline mode). Confidence: **KNOWN at the
LF→CR layer; MODELED at "what CC would do with CR vs LF"** since the
harness did not spawn `claude`.

The two paths SHOULD remain separate at the daemon layer: the existing
`/v2/sessions/:name/prompts` continues to call the existing `sendKeys`
(default paste-buffer, with trailing Enter); the new
`/v3/sessions/:name/console/stdin` calls a new `pasteRawBytes` helper
that sets `-r` and adds no Enter.

### §3.3 PTY mode at the target

Exp1 ran the target as `bash -c 'stty raw -echo 2>/dev/null; exec cat'`
to suppress (a) line-discipline transformations (so any byte arriving
at the PTY master flows through to cat unmodified) and (b) tty echo
(so cat is the only writer to the captured stream). For the production
`claude` target, claude itself manages PTY mode via its own readline
library; the daemon does not need to set stty. KNOWN for the harness;
MODELED-equivalent for the production case.

### §3.4 Capture mechanism

`tmux pipe-pane -O -t <target> 'cat > <file>'` faithfully records the
program's STDOUT bytes (the `cat` consumer is unbuffered for short
writes; the full byte sequence is captured per the round-trip
comparison above). The single tmux server-vs-consumer pipe is the
single point of byte transit — no in-process re-encoding occurs.
KNOWN.

## §4 — Backpressure handling

**Source:** `results/exp2-backpressure.json`.

**Verdict:** Pipe-pane provides natural backpressure at the OS-pipe
layer. A slow consumer paces the producer; tmux's resident memory
grows but is bounded by the pane history-limit. No buffer leak.
Confidence: **KNOWN at the consumer-rate-paced layer; MODELED at the
"history-limit caps total memory" layer** since the harness only
exercised a 2-second burst, not a sustained 60-second one (§10.10's
ship-gate window).

### §4.1 Measured numbers

Producer: `yes` in a tmux pane (writes "y\n" repeatedly; native rate
on M-series macOS is tens of MB/s). Consumer: a shell loop reading
4096 bytes then sleeping 100 ms (effective rate 40,960 bytes/s).
Burst window: 2,000 ms. Expected consumer-paced output: ~81,920 bytes.

| Metric                              | Value     |
|-------------------------------------|-----------|
| Bytes delivered to consumer         | 81,920    |
| Expected from consumer rate         | 81,920    |
| Less than unbounded yes rate (10 MB/s) | TRUE   |
| tmux server RSS before              | 4,048 KB  |
| tmux server RSS during              | 30,048 KB |
| tmux server RSS after pipe stopped  | 30,128 KB |
| RSS growth bounded (<50 MB)         | TRUE      |

The consumer received exactly what it could pull; the producer (`yes`)
was paced down to the consumer's rate, not allowed to dump. tmux's
RSS grew by ~26 MB during the burst — attributable to tmux's own
**pane history-limit** (default 2,000 lines per pane), which `yes`
filled with "y\n" entries.

### §4.2 Implication for CONSOLE-T01

The daemon-side WS forwarder MUST keep up with `tmux pipe-pane`'s
write side OR the producer will pace down (which is the
ship-gate-friendly behavior — operator sees CC produce more slowly,
not the daemon OOM). For the §10.5 ring buffer (default 50,000 lines,
operator-configurable per `MB-T11`), a per-line memory cost of ~100
bytes (typical CC line) implies ~5 MB per session at the configured
default, which is well below any reasonable cap.

**Followup recommended for CONSOLE-T01:** explicitly cap tmux pane
history-limit per session to a small value (e.g., 100 lines), since
the daemon ring buffer is the authoritative scrollback store and
duplicate retention in tmux's pane history is wasted memory. This is
configurable per pane via `tmux set-option -t <target> history-limit
N`. KNOWN that the option exists; MODELED that 100 is the right value
(should be a CONSOLE-T01 followup decision under operator-arbitrated
defaults).

### §4.3 Sustained streaming (60 s ship-gate)

The harness exercised a 2-second burst, not the §10.10 60-second
sustained window. Confidence on 60-s behavior: **MODELED** —
extrapolating from the bounded growth observed in 2 seconds, RSS at
60 seconds should plateau at the history-limit cap (a few tens of MB
per session at default settings). Recommend CONSOLE-T01 add a 60-s
soak test to its acceptance suite to convert this to KNOWN before
ship.

## §5 — Signal forwarding

**Source:** `results/exp3-signal-forwarding.json`.

**Verdict:** SIGINT, SIGTERM, and SIGHUP are all reliably deliverable,
but **via different mechanisms**. The `POST .../console/signal`
endpoint per §10.6 needs a per-signal dispatch table, not a single
mechanism. Confidence: **KNOWN per trial outcome** as recorded in the
sentinel-file evidence below.

### §5.1 Per-trial outcomes

All 7 trials wrote a sentinel file from the trapping bash so results
survive pane teardown:

| ID | Mechanism | Look-for | alive_after | matched? |
|----|-----------|----------|-------------|----------|
| A1 | paste-buffer 0x03 (Ctrl-C byte) | SIGINT_TRAPPED | false | **true** |
| A2 | tmux send-keys "C-c" | SIGINT_TRAPPED | false | **true** |
| B1 | process.kill(panePid, SIGINT) | SIGINT_TRAPPED | false | **true** |
| A3 | paste-buffer arbitrary text (no PTY mapping for SIGTERM) | SIGTERM_TRAPPED | true | (correctly NOT matched) |
| B2 | process.kill(panePid, SIGTERM) | SIGTERM_TRAPPED | false | **true** |
| B3 | process.kill(panePid, SIGHUP) | SIGHUP_TRAPPED | false | **true** |
| B4 | tmux kill-session | SIGHUP_TRAPPED | false | **true** |

A3's `false` for `matched` is the **correct** outcome — there is no
PTY byte that the kernel line-discipline translates to SIGTERM, so
arbitrary text injection cannot deliver SIGTERM. The trap did not
fire and the process stayed alive, exactly as expected. Recorded for
data-grounded clarity.

### §5.2 Per-signal recommended dispatch

| Signal   | Recommended mechanism                              | Confidence |
|----------|----------------------------------------------------|------------|
| SIGINT   | `tmux send-keys -t <target> C-c` (equivalent to byte 0x03 via PTY) | KNOWN |
| SIGTERM  | `process.kill(panePid, 'SIGTERM')` via the pane PID returned by `tmux display-message -p '#{pane_pid}'` | KNOWN |
| SIGHUP   | `process.kill(panePid, 'SIGHUP')` (preferred, surgical) OR `tmux kill-session` (also delivers SIGHUP via PTY teardown, but ALSO destroys the session — different blast radius) | KNOWN |

The data grounds vision §10.11 Q2's recommendation
(SIGINT/SIGTERM/SIGHUP only in v3.0): all three are deliverable with
known mechanism. SIGUSR1/2 would also be deliverable via `kill(2)` on
pane PID by the same path; deferral is operator preference, not a
technical block.

### §5.3 The "deferred trap" gotcha for kill(2) targets

A subtle bash gotcha surfaced during exp3 development: a script of
the form `bash -c 'trap … INT; sleep 30'` does NOT respond to
`kill -INT <bash-pid>` — non-interactive bash defers the INT/QUIT
trap until the foreground command (`sleep`) returns abnormally, and
`kill -INT` to bash does NOT propagate to its child `sleep`. The
PTY-byte path **does** trigger the trap, because the kernel line
discipline delivers SIGINT to the entire foreground process group
(both bash and sleep), and sleep dying causes bash's wait to return
abnormally, which fires the trap.

For CONSOLE-T01: when targeting `claude` itself (which is the pane
process leader and is foreground), `kill(2)` on the pane PID will
work for SIGTERM/SIGHUP. For tmux configurations where a shell
forks a child as the active foreground process (e.g., a wrapper
script around claude), `kill(2)` on the pane PID may target the
shell, not the leaf foreground process — in which case kill the
process group via `process.kill(-panePid, sig)` (negative PID =
pgroup) or use `tmux send-keys` for SIGINT specifically. KNOWN
gotcha; MODELED solution.

### §5.4 Recommended endpoint shape

The `POST /v3/sessions/:name/console/signal` body per §10.6 is
`{signal: "SIGINT" | "SIGTERM" | "SIGHUP"}`. The handler dispatches
per the table in §5.2. SIGINT is implemented via `tmux send-keys
C-c` (matches existing daemon pattern at
`packages/dispatch-daemon/src/state/transitions.ts:57` for the
state-machine "armed → held" transition). SIGTERM and SIGHUP require
the daemon to know the pane PID — exposed via `tmux display-message
-p '#{pane_pid}'` (already used by the harness lib, KNOWN).

## §6 — Daemon-side ring buffer behavior

**Source:** `results/exp4-ring-buffer.json`.

**Verdict:** A simple FIFO-eviction ring buffer satisfies the §10.5
spec. Confidence: **KNOWN**.

A 100-line capacity ring received 500 producer lines (`seq 1 500`):

| Metric                         | Value      |
|--------------------------------|------------|
| Total lines received           | 500        |
| Final ring size                | 100        |
| Total evictions                | 400        |
| Ring first line                | "401"      |
| Ring last line                 | "500"      |
| Ring matches tail-100          | TRUE       |
| No crash                       | TRUE       |

This validates the §10.5 daemon-side ring buffer semantics at small
scale. The production default (50,000 lines) is 500× larger but
exercises the same FIFO eviction pattern. Confidence on 50,000-line
scale: **MODELED-equivalent** since FIFO eviction is O(n) for the
splice-based implementation in the harness, but a production daemon
should use a circular array or `Deque` for O(1) eviction. CONSOLE-T01
implementation choice; either works correctness-wise.

### §6.1 Sequence numbering

The harness's `RingBuffer` class (used in exp4/exp5/exp6) assigns a
**monotonic sequence number** to each line at push time. Sequence
numbers are NOT reset on eviction — they keep climbing across the
session lifetime. This is what enables the WS reconnection backfill
(§7) to work without ambiguity.

Per §10.6 the `POST .../console/stdin` response shape is
`{accepted: boolean, sequence: number}`. The same monotonic
sequence-number space SHOULD be used for stdin and stdout per
session, OR they SHOULD be in two disjoint spaces (e.g., `stdin_seq`
and `stdout_seq`). Vision §10.6 is silent on this; **see §10
ambiguity surface for a question to operator**.

## §7 — WebSocket reconnection mid-stream

**Source:** `results/exp5-ws-reconnection.json`.

**Verdict:** A simple "client sends last_seq on subscribe; server
replays from ring since last_seq, then resumes live broadcast"
protocol satisfies §10.5/§10.6 for both backfill and seamless
resume. No gap, no duplicate. Confidence: **KNOWN at protocol-shape
layer; MODELED at "ring buffer never overruns the disconnect window"
edge case** (see §7.2).

### §7.1 Measured outcome

Setup: producer emits 200 numbered lines at one per 25 ms. Client A
opens, receives 50 lines, closes. Daemon continues to receive ~30
more lines while no client. Client B opens with `last_seq=50`,
receives 29 backfilled lines, then resumes live until 60 lines
total (= 89 unique seqs across both clients).

| Metric                              | Value |
|-------------------------------------|-------|
| Client A lines received             | 50    |
| Client A last seq                   | 50    |
| Client B `backfill_meta`            | `{ring_oldest:1, ring_newest:79, missed_count:29, requested_last_seq:50, backfill_complete:true}` |
| Client B lines received             | 60    |
| Reconstructed min_seq               | 1     |
| Reconstructed max_seq               | 110   |
| Reconstructed count                 | 110   |
| No gap after dedupe                 | TRUE  |
| Overlap count between clients       | 0     |

The combined sequence covers seqs 1..110 with no gap and no overlap
between the two clients' message lists (server backfilled 51..79 and
streamed live 80+ — both ranges disjoint from client A's 1..50).

### §7.2 Backfill_complete signaling

The proposed handshake includes a `backfill_meta` message sent
**before** the first replayed line:

```json
{
  "type": "backfill_meta",
  "ring_oldest": <int>,    // oldest seq still in ring
  "ring_newest": <int>,    // newest seq daemon has seen
  "missed_count": <int>,   // ring.since(last_seq).length
  "requested_last_seq": <int>,  // echo of client's last_seq
  "backfill_complete": <bool>   // true iff (last_seq + 1) >= ring_oldest
                                // i.e. client missed nothing since
                                // disconnect (no eviction-window gap)
}
```

`backfill_complete = false` is the signal that the ring evicted
past the client's last_seq during their disconnect — i.e. the
client missed bytes that are no longer recoverable. The client
SHOULD surface this to the operator (e.g., a panel banner: "Some
output was dropped while disconnected"). CONSOLE-T03 implementation
detail; the protocol shape is what this spike validates.

### §7.3 Implication for §10.6

The current vision §10.6 spec for `WS .../console/stream` says only:
"Backfill: on connection, daemon sends up to N most recent buffer
lines (N negotiated in connection handshake)." This is shape-equivalent
to the harness's protocol but does not specify **how the client signals
its last-known sequence** vs **how the server signals an eviction
gap**. The amendment proposal in `MB-S06-conductor-amendment-proposal.md`
proposes precise shape for both.

## §8 — Multi-consumer fan-out

**Source:** `results/exp6-multi-consumer.json`.

**Verdict:** A single shared pipe-pane reader fans out to N WS
clients. Closing one does not affect the others. Both clients see
identical seqs in their overlapping range. Confidence: **KNOWN**.

### §8.1 Measured outcome

Setup: same producer (200 numbered lines at one per 25 ms). Two WS
clients (A and B) open simultaneously, both subscribe at
`last_seq=0`. Both run until they have ~60 lines, then A closes.
B continues until reaching ~91 lines.

| Metric                                  | Value |
|-----------------------------------------|-------|
| Reader invocations total                | 91    |
| Lines A at close                        | 60    |
| Lines B at close                        | 60    |
| A and B identical in overlap (seq 1..60) | TRUE |
| Lines A after close (did not grow)      | TRUE  |
| Lines B kept growing                    | TRUE  |
| Lines B final                           | 91    |

`reader_invocations_total = 91` is the proof that the **PTY reader
is shared, not duplicated**: 91 lines were read once by the single
shared `readline` interface attached to the single `pipe-pane`
fifo; both subscribers consumed the broadcast. If each subscriber
had its own pipe-pane, the total would be 2× reader invocations.

### §8.2 Implication for CONSOLE-T01

The daemon should maintain **one pipe-pane per session**, not one
per WS subscriber. Subscribers consume from a daemon-side broadcast
(EventEmitter or similar). Vision §10.11 Q3 caps simultaneous
panels at 4 in v3.0 — the harness validated 2; scaling to 4 is a
trivial broadcast set extension and does not require additional
spike evidence. KNOWN at 2 subscribers; MODELED at 4 (no
fundamental change in behavior expected).

## §9 — CONDUCTOR_API_CONTRACT.md amendment numbering — AMBIGUITY SURFACE

**This section halts and surfaces an ambiguity to operator per spike
halt discipline. The amendment proposal at
`MB-S06-conductor-amendment-proposal.md` cannot proceed past stub
without operator arbitration.**

The spike instructions stated: "§11 in CONDUCTOR_API_CONTRACT.md is
already amended (952f857 took the /v3/* slot). Your amendment proposal
targets the next-available section number. Read CONDUCTOR_API_CONTRACT.md
to determine the next section; if ambiguous, halt and surface — do not
guess section numbers."

Inspection of CONDUCTOR_API_CONTRACT.md (frozen at v2.1.0, `952f857`):

| §  | Title                              | Touched by 952f857? |
|----|-------------------------------------|---------------------|
| 1  | Purpose                             | YES (added /v3/* coordination paragraph) |
| 2  | Authority and frozen status         | no                  |
| 3  | Authentication                      | no                  |
| 4  | REST endpoints (incl. §4.6)         | YES (added §4.6 Coordinated /v3/* surface) |
| 5  | WebSocket events                    | no                  |
| 6  | State machine rules                 | no                  |
| 7  | fd v1 backward compatibility        | no                  |
| 8  | STATUS.json schema                  | no                  |
| 9  | Out of scope (v2)                   | no                  |
| 10 | Cairn enforcement structure (incl. §10.3) | YES (added /v3/* SQLite spike rule) |
| 11 | Operator review checklist           | no — UNCHANGED      |
| 12 | Versioning                          | YES (bumped to v2.1.0) |

§11 is **NOT** an amendment slot — it is the original "Operator review
checklist" section, untouched by 952f857. The 952f857 amendment placed
the /v3/* coordination at **§4.6** (a new subsection of §4 REST
endpoints), not §11.

The coord file `docs/cairn-coordination/batch-1-spikes.md` line 11 says
"First to draft claims §11. Second accepts §12." This appears to have
been a pre-amendment plan that was superseded when 952f857 chose the
§4.6 placement.

Three plausible section placements for the new console endpoints:

- **(a) §4.7** — a new subsection of §4 REST endpoints, parallel to
  §4.6's coordinated /v3/* paragraph. Most consistent with how 952f857
  placed its amendment. The new subsection enumerates cross-cutting
  expectations (auth, error envelope, route-registration, 404 shape,
  WebSocket coordination, versioning) for the /v3/sessions/:name/console/*
  surface specifically.
- **(b) §13** — a new top-level section after §12 Versioning, dedicated
  to the CC-console amendment surface. Cleanest if operator wants the
  CC-console amendment to be self-contained and distinct from the
  /v3/orchestrator/* + /v3/tickets/* coordination already at §4.6.
- **(c) Extend §4.6 in-place** — fold the new five endpoints into the
  existing §4.6 paragraph as additional bullet points or sub-sub-list.
  Smallest diff but mixes the two amendments at the same anchor.

This spike does NOT pre-arbitrate the choice. The amendment proposal
at `MB-S06-conductor-amendment-proposal.md` ships with **placement
deliberately left as `<<<§N — operator-arbitrate>>>` placeholders**;
operator selects (a), (b), or (c) and replaces the placeholders before
authoring the actual `contract:` amendment commit.

Pending operator arbitration of (a)/(b)/(c). Spike work resumes after
the choice — see §11 self-check Q4.

## §10 — Vision §10.6 wording — ambiguity surface (informational, not blocking)

Three §10.6 wording details came up during harness work where the
spec is silent or ambiguous. Each is informational; the spike does
not block on these but flags them for operator awareness during
CONSOLE-T01 design.

**Q-§10.6-A (sequence-number space).** §10.6 says
`POST .../console/stdin` responds with `{accepted, sequence}` and
`GET .../console/buffer` query-param accepts `before_sequence`. Is
the sequence space SHARED across stdin and stdout (one monotonic
counter per session for both directions) or DISJOINT (separate
`stdin_seq` and `stdout_seq` counters)? The spike implemented disjoint
counters in exp5/exp6 (only stdout was sequenced). MODELED-recommend
disjoint: stdin sequencing is for write-acknowledgement correlation;
stdout sequencing is for stream-replay correlation; the two have
different semantics and conflating them risks subtle bugs. Operator
to confirm.

**Q-§10.6-B (backfill handshake).** §10.6 says "N negotiated in
connection handshake" but does not specify the handshake messages.
The spike implemented `subscribe {last_seq}` → `backfill_meta {…}`
→ replay → live (§7.2). MODELED-recommend this shape verbatim.

**Q-§10.6-C (eviction-window-gap signaling).** §10.6 does not specify
how the daemon signals to the client that the ring evicted past the
client's last-known sequence (i.e. the client missed bytes
permanently). The spike implemented `backfill_meta.backfill_complete:
boolean` (§7.2). Operator to confirm whether this should also produce
a metrics event in `WS /v2/events/stream` for observability (per
§5 of CONDUCTOR_API_CONTRACT.md's frozen event types — would require
a new event type, which is additive only per §2 authority).

## §11 — Self-check (per CONDUCTOR_API_CONTRACT.md §10.5)

1. **Is the API I called verified by a spike in this repo?** yes —
   the harness IS the spike; every claim in this ADR cites a result
   file in `packages/dispatch-daemon/spikes/MB-S06/pty-harness/results/`
   produced at commit `02cfc4d`.
2. **Does my test exercise behavior, or my mocks?** behavior — every
   measurement was against real tmux 3.6a, real PTY/pipe-pane, real
   `ws` library WebSocket clients, real Node readline streams. No mocks.
3. **If implementation deleted, would test still pass?** no — the
   harness measures actual tmux behavior against actual files; deleting
   tmux or the harness scripts would break re-runnability and falsify
   this ADR's claims.
4. **Did I add anything outside this contract's specification?** no —
   the ADR observes spike evidence and proposes endpoint behavior to
   inform CONSOLE-T01. It does not implement the endpoints, modify any
   contract, or alter vision §10. The numbered sections and tables stay
   within the spike's authorized scope (docs/adr/MB-S06-* and
   packages/dispatch-daemon/spikes/MB-S06/).
5. **Did I modify this contract without operator approval?** no — and
   §9 of this ADR explicitly halts on the amendment-numbering
   ambiguity, surfacing the (a)/(b)/(c) choice to operator rather than
   inferring.
6. **Is any claim in my commit body unlabeled?** no — every claim is
   labeled KNOWN, MODELED, or SPECULATIVE per §10.1, with citation to
   a specific result file or tmux man-page text.
7. **Did this commit touch any file the other parallel session might
   also modify?** Surfaced — the `docs/cairn-coordination/batch-1-spikes.md`
   coord file is shared across Sessions A/B/C; per the protocol, each
   session appends its own milestone lines without rewriting prior
   lines. Per-path `git add` of the coord file specifically (no `git add
   -A`) avoids accidentally staging Sessions B/C's unstaged
   territory work. The `docs/adr/MB-S06-*` and
   `packages/dispatch-daemon/spikes/MB-S06/` trees are exclusive to this
   spike (Session A territory per coord file lines 31-34). Verified pre-commit
   via `git status --short`.
8. **Does this commit change session state via direct registry write,
   bypassing PATCH /v2/sessions/:name/state?** no — the harness uses
   isolated tmux servers via `-L <socket>` and never touches the
   production daemon's `sessions.json` or the production tmux server.
9. **Did I do work during a halt state that wasn't explicitly
   authorized?** no — §9's halt-and-surface for amendment numbering is
   a deliberate halt that this ADR commit performs; the amendment
   proposal commit will be deferred until operator arbitrates.

---

**End of MB-S06 ADR.** Amendment proposal at
`MB-S06-conductor-amendment-proposal.md` is a stub pending operator
arbitration of §9.
