# Conductor Reasoning + Cortex + Relay — Architecture Notes (v0.1)

**Status:** Working notes, not frozen. Input to MB-T34, MB-T35, MB-T-CORTEX-MINIMAL, and a new MB-T-RELAY ticket. Subject to revision as MB-T34 onward surface real constraints.

**Scope:** Mechanical design only. Captures what's buildable from the architectural conversation of 2026-05-07. Excludes long-arc speculation (population dynamics, multi-Cortex emergence, training-data-as-corpus theories) — those exist in chat history and are not load-bearing for current build.

---

## §1 — The four roles

Conductor's reasoning architecture has four distinct roles. Each has its own trust boundary, cost tier, and write permissions. They are physically separable (different repos, possibly different machines).

| Role            | Cost tier                | What it does                                                       | Writes to                        |
|-----------------|--------------------------|--------------------------------------------------------------------|----------------------------------|
| **Operator**    | Human                    | Authors BUILD.md, sets build direction, intervenes on edge cases   | BUILD.md (frozen side of Relay)  |
| **Conductor**   | LLM (Haiku for MVP)      | Reads state, proposes next dispatch                                | Nothing — proposes only          |
| **Verifier**    | LLM (Sonnet)             | Checks Conductor's proposals against ground truth                  | Working side of Relay            |
| **Worker CC**   | LLM (Opus)               | Executes individual WBs in target product repos                    | Target product repo (git)        |

Each role is stateless across cycles. The Relay holds the state they share. Skills (the foxworks-cairn plugin) hold the methodology they all interpret.

---

## §2 — The Relay

A coordination space that mediates between roles. Has two structurally separated sides.

### §2.1 Frozen side
- Contains: BUILD.md, dispatch table, frozen contract pointers, skill manifest
- Writers: operator only
- Readers: all roles
- Update cadence: per ticket (rare)
- Purpose: authoritative spec of what work needs doing

### §2.2 Working side
- Contains: dispatch tickets (Conductor → Worker), result manifests (Worker → Verifier), verification verdicts (Verifier → state), rejection log (audit trail), operator override entries
- Writers: each automated role writes only to its own lane
- Readers: all roles
- Update cadence: per cycle (frequent)
- Purpose: the conversation between roles + audit trail

### §2.3 Implementation choice
- v1 (MVP): Relay is a git repo. Files in directories. Convention-based write discipline enforced by each role's prompt + skills. Easy to debug, easy for operator to manually intervene.
- v2+ (Registry binary): Relay becomes a binary with a service interface. Enforces schemas. Holds locks against concurrent writes. Logs everything. New entry in Registry — call it MB-T-RELAY when authored.
- Don't commit to v2 until v1 has run for a while and concrete pain points are observed.

---

## §3 — The reasoning cycle

One cycle of automated dispatch:

1. Operator authors or updates BUILD.md (frozen side).
2. Conductor (LLM) wakes up. Reads frozen side + working side + relevant skills.
3. Conductor reasons: identifies next action (dispatch a WB, flip a checkbox, surface an issue).
4. Conductor writes its proposal to working side as a structured proposal record.
5. Verifier (LLM) reads the proposal, reads relevant ground truth (git state, prior commits, WB spec), reads same skills.
6. Verifier verifies semantically — does the proposal align with evidence?
7. If verified: Verifier writes the state change (e.g., checkbox flip) to working side with verification signature.
8. If rejected: Verifier writes rejection to log with classification. Either fires a fresh Conductor call (for retryable failures) or surfaces to operator (for state corruption or spec ambiguity).
9. If a dispatch was authorized: Worker CC is spawned in target product repo with dispatch spec as initial prompt.
10. Worker executes WB, commits to target repo, writes result manifest to Relay working side.
11. Loop returns to step 2 with new state.

### §3.1 Rejection classification
Verifier categorizes rejections to drive retry behavior:
- Class A — Conductor misread: Conductor reasoned over BUILD.md state incorrectly. Retryable. Fire fresh Conductor call.
- Class B — State corruption: Ground truth doesn't match BUILD.md claim. Not retryable. Surface to operator.
- Class C — Spec ambiguity: Conductor and Verifier have different valid interpretations of "done." Not retryable. Surface to operator for arbitration.

Without this classification, retry loops can infinitely cycle on Class B or Class C failures.

---

## §4 — Repo-per-role isolation

Each role operates in a different repo. The repo is the trust boundary.

| Repo                          | Role              | Contains                                                  |
|-------------------------------|-------------------|-----------------------------------------------------------|
| foxworks-conductor-brain      | Conductor LLM     | Conductor's working scratch, dispatch composition state   |
| <target-product>              | Worker CCs        | Source code, tests, BUILD.md (in product's docs)          |
| foxworks-relay                | Relay coordinator | Frozen BUILD.md copies + working-side conversation log    |
| foxworks-tooling              | All roles (read)  | foxworks-cairn plugin (skills + agents)                   |

A Worker CC running in target product repo cannot see Conductor's brain. A Conductor session cannot see Worker's source code directly — only what comes through the Relay. This makes statelessness structural rather than convention-enforced.

### §4.1 Multi-build consolidation
For a solo operator running multiple builds across products, the brain repo and Relay repo can hold subdirectories per active build:
foxworks-conductor-brain/
├── builds/
│   ├── foxworks-dispatch/
│   ├── sherpa/
│   └── lantern/
└── conductor-state.md

One brain repo, multiple build threads. Simpler than one brain repo per product.

---

## §5 — Skills as universal protocol

The foxworks-cairn plugin (shipped 2026-05-07 as v0.1.0) provides the methodology layer all roles load.

- cairn-methodology skill: defines what BUILD.md notation means, what self-check Q1-Q9 evaluates, what cairn commit grammar implies, what halt discipline requires
- foxworks-conductor-codebase skill: defines package layout conventions, frozen contract surfaces, sentinel zone patterns
- 5 agents: anti-fabrication-verifier, phase-1-diagnose, followup-drafter, test-failure-triage, cross-package-impact

Each role loads these skills on instantiation. They share interpretive substrate. A Verifier checking a Worker's commit and a Conductor proposing a Worker dispatch must agree on what the methodology demands — the skills are the source of that agreement.

---

## §6 — Hard-coded vs LLM logic

Not every decision in the loop should be an LLM call. Cost and reliability both improve when deterministic logic handles things deterministic logic can.

### §6.1 Should be hard-coded (not LLM)
- Schema validation (does this proposal record match the expected fields)
- Git state queries (does commit X exist on origin/main)
- File existence checks
- Diff-based BUILD.md write enforcement (only checkbox flips and append-only entries permitted)
- Rate limiting / quota tracking
- Routing logic ("Conductor's proposal type Y goes to Verifier")

### §6.2 Should be LLM (reasoning required)
- Conductor's "what's the next action given current state" decision
- Verifier's semantic check ("does this commit satisfy the WB spec given the methodology")
- Rejection classification (A/B/C)
- Operator-facing surface generation

---

## §7 — Cost model and Max plan vs API

### §7.1 Per-cycle cost (estimated, API path)
- Conductor (Haiku): ~$0.05-0.20 per call
- Verifier (Sonnet): ~$0.15-0.50 per call
- Worker CC (Opus, when dispatched): ~$5-15 per WB ladder

Verifier-in-the-loop adds 20-30% to per-cycle cost vs Conductor-alone, but prevents wasted Worker dispatches when Conductor misreads. Net positive for both correctness and cost.

### §7.2 Max plan path
If Anthropic's Max plan terms permit, all three roles can be Claude Code sessions on Max plan instead of API calls. This collapses per-cycle API cost to zero (within rate limits).

The repo-per-role isolation pattern makes the Max path cleaner — each role is just another CC session in its own repo, indistinguishable from operator running parallel CCs for different projects.

ToS verification is operator's responsibility before committing to Max-plan-driven Conductor.

### §7.3 Hybrid path
Conductor + Verifier on Max plan (high-frequency, small calls); Worker CCs on Max plan or API depending on rate limit pressure. Hybrid hedges against Max plan policy changes.

---

## §8 — BUILD.md design

### §8.1 Schema
BUILD.md follows a deterministic schema. Same shape across all builds.

### §8.2 Write permissions
- Header, work spec, dispatch table, halts: operator only
- Checkbox flips on the work spec: Verifier only, after semantic verification
- Machine-readable summary: Verifier only, derived from work spec state
- Conductor: never writes to BUILD.md. Proposes flips via working side; Verifier executes them.

### §8.3 Determinism rationale
A Haiku call resuming a build must encounter the same shape every time. Deterministic schema means front-loaded summary, single-source-per-fact, explicit pointers, and enables Cortex ingestion later.

---

## §9 — Cortex (mechanical scope)

### §9.1 Primary purpose
Cortex's first job is to ingest output from the 16 Registry binaries and provide structured retrieval over the aggregate. It is not first a model. Not first a knowledge store for Conductor reasoning. Those are downstream uses. First it is a multi-source aggregator that learns the shape of binary outputs.

### §9.2 Ingestion contract
Each Registry binary's contract includes a clause: after completing primary work, the binary writes its output to Cortex via a standardized ingestion interface. Cortex must exist (at least minimally) before the binaries can fulfill their contracts. MB-T-CORTEX-MINIMAL is a hard prerequisite for all other Group Alpha binaries, not a parallel track.

### §9.3 Schema design implication
If Cortex ingests from 16 binaries and learns shape, the schemas binaries write in determine what's learnable. Bad schemas constrain Cortex permanently. This argues for: author Cortex's ingestion contract first, then derive each binary's output contract from it.

### §9.4 Scope of "understand shape"
MB-T-CORTEX-MINIMAL is the low-end version: typed database with per-binary schemas + structured query. Higher levels (statistical patterns, predictive synthesis) become later tickets if they prove valuable.

### §9.5 Cortex as retrieval substrate (downstream)
Once Cortex is populated by binary outputs, LLM reasoning roles (Conductor, Verifier) can query it. The LLM continues to reason; Cortex provides personalized, project-specific retrieval that the LLM's pre-training cannot have. LLMs do not get replaced by Cortex. They get better at reasoning over richer retrieval.

### §9.6 What Cortex is not (in MVP)
Not a trained model. Not a global singleton. Not a successor to Conductor's LLM reasoning. Not networked across instances.

---

## §10 — Build sequencing implications

1. MB-T-RELAY (new ticket) — author the Relay's working-side schema and frozen-side contract. Required before MB-T34/T35.
2. MB-T-CORTEX-MINIMAL ingestion contract — author the ingestion interface every binary will write to. Required before any Group Alpha binary's output contract can be frozen.
3. MB-T34 (Anthropic API client) — required for Conductor to make LLM calls programmatically.
4. MB-T35 (Conductor reasoning loop) — depends on MB-T-RELAY + MB-T34.
5. Group Alpha binaries — each writes to Cortex per the ingestion contract.
6. Group Beta + Group Gamma — unchanged from current plan.

---

## §11 — Open questions (intentionally unresolved)

- How does Conductor know Worker CC is done? (Polling Relay vs polling git remote vs Worker writing back)
- Who triggers Worker CC spawns — operator manually vs Conductor itself via subprocess?
- What's the Verifier's exact rejection-classification rubric? (Specifics need real failure cases)
- Conversation log pruning — when does the working side archive completed builds?
- Schema enforcement on Relay v1 — convention-only vs lightweight diff validator vs structural file separation?

---

## §12 — What's not in this doc

Excluded from this scope: population dynamics across multiple Cortexes, Cortex-as-trained-successor-model framing, self-improving system feedback loops, philosophical framing about emergence/ancestry/evolution. Captured in chat history; surface again when the substrate they describe actually exists.
