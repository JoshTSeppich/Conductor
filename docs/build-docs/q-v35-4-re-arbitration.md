# Q-V35-4 Re-arbitration — MB-T36 architecture-independent fire window

**Original arbitration:** 2026-05-08, operator-ratified at "strict-post-spike" per all-recmd authorization. Ratification text: "no ticket fires before spike."

**Re-arbitration date:** 2026-05-08, post-SPIKE-HSO-01 closure (commit `c1b78c4`).

**Re-arbitration ratification:** [Operator fills: "ratified" / "modified" / "rejected"]

**Authoring posture:** Drafted by chat-Claude for operator review per §3.4 mechanical translation carve-out. Operator authors final text.

---

## §1 — Re-arbitration scope (narrow)

This re-arbitration narrows Q-V35-4 from "no ticket fires before spike" to "no ticket fires before SPIKE-HSO-01 ratification, OR SPIKE-HSO-02 ratification when ticket scope depends on Shape A vs B handoff arbitration."

**Scope of re-arbitration:** MB-T36 (orchestrator-fired spawn / `fireSpawn` real implementation) ONLY. Other §5 tickets (MB-T35-revised, MB-T37, MB-T38, MB-T39, MB-T40, MB-T41) remain strict-post-spike pending SPIKE-HSO-02 ratification.

**Justification (KNOWN):**
1. SPIKE-HSO-01 ratified the substrate viability and 5 architectural requirements (D1-D5) at commit `c1b78c4`. The architecture is no longer SPECULATIVE; it is KNOWN-RATIFIED.
2. MB-T36's scope per v3.5 BUILD §5.2 is explicitly "Architecture-independent — works for both v3.5 HSO and v3.0-fallback paths." The fireSpawn implementation does not depend on orchestrator substrate (HSO or API), nor does it depend on handoff Shape A vs B (SPIKE-HSO-02 territory).
3. Closing `MB-F-T11-WB7-ORCHESTRATOR-SPAWN-DEFERRED` and pairing closure with `MB-F-T24-ORCHESTRATOR-FIRED-SPAWN-GATE` is independently valuable for v3.0 ship-gate completeness regardless of v3.5 ratification trajectory.
4. Round 7 SPIKE-HSO-01 evidence base (the only ratified evidence we have) is sufficient for MB-T36 scope: spawn-handler wiring + dispatch-mode gate + SpawnConfirmGate integration are all referenced in already-shipped code (MB-T05 + MB-T24).

**Scope of re-arbitration that remains forbidden:** Any §5 ticket that touches:
- Markdown-marker action variant routing (MB-T35-revised) — depends on candidate system prompt validation, MB-T41 territory
- Pool manager (MB-T37) — depends on D1-D3 system prompt + halt_urgency + token-count monitoring
- swarm-state.md write protocol (MB-T38) — depends on D2 schema fields, possibly Shape A vs B handoff document
- Self-summary harvester (MB-T39) — depends on D4 pull-handoff bundling prohibition + MB-T41 system prompt
- Chat-panel PTY refactor (MB-T40) — depends on action variant routing landing (MB-T35-revised)
- HSO system prompt artifact (MB-T41) — operator-only authoring per §3.4

These remain gated on SPIKE-HSO-02 ratification and operator-only artifacts as v3.5 BUILD §4.3 specified.

---

## §2 — Cairn discipline preserved

**§3.4 frozen-contract refusal:** This re-arbitration does not modify CONDUCTOR_API_CONTRACT.md, REGISTRY.md, schema.ts, or any operator-arbitrated frozen surface. It re-arbitrates a Q-question in v3.5 BUILD §7 — operator-only authorship territory, ratified explicitly.

**§3.7 halt discipline:** MB-T36 fires after this re-arbitration commits and operator authorizes dispatch launch. Each HALT gate in MB-T36 dispatch must be cleared individually. No batch-fire of multiple §5 tickets.

**§3.18 operator-artifact halt-and-surface:** This re-arbitration record is operator-authored. Chat-Claude drafted; operator commits. If chat-Claude's draft contains errors, halt-and-surface is the correct response, not silent acceptance.

**Round 7 cairn evidence applied:** Per `MB-F-ROUND5-DISPATCH-AUTHORING-PREFILL-VERIFICATION` and the 3 chat-Claude path/line errors caught in SPIKE-HSO-01 HALT 0/HALT 1, the MB-T36 dispatch authored under this re-arbitration must:
- Probe-verify all file paths and line numbers at dispatch-authoring time, not memory-cite
- Cite only operator-machine-accessible paths (no `/mnt/user-data/outputs/` or `/mnt/project/` paths)
- Anchor against current `main` HEAD `c1b78c4` (post-SPIKE-HSO-01 commit) explicitly

---

## §3 — Effect on v3.5 BUILD §7 Q-V35-4 status

Original Q-V35-4 text:
> Recmd: strict-post-spike per §3.4 cairn discipline. Strict cairn doesn't pre-author tickets even when content is architecture-stable.

Amended Q-V35-4 text (effective post-this-re-arbitration):
> Operator-ratified at SPIKE-HSO-01 closure (2026-05-08, commit `c1b78c4`): MB-T36 (orchestrator-fired spawn / `fireSpawn` real implementation) may fire post-SPIKE-HSO-01, pre-SPIKE-HSO-02. Architecture-independent scope — works for both v3.5 HSO and v3.0-fallback paths. Other §5 tickets (MB-T35-revised, MB-T37, MB-T38, MB-T39, MB-T40, MB-T41) remain strict-post-SPIKE-HSO-02 + post-MB-T41-authoring.

**Operator commits this re-arbitration to v3.5 BUILD §7** (or to a sibling `q-v35-4-re-arbitration.md` under `docs/build-docs/` if operator prefers separate file).

---

## §4 — Standing by

**Operator action required:**
1. Read this re-arbitration draft
2. Ratify, revise, or reject
3. If ratified: amend v3.5 BUILD §7 Q-V35-4 in `docs/build-docs/CONDUCTOR_V3.5_BUILD.md` with the §3 amended text + commit reference to this re-arbitration record
4. Authorize MB-T36 dispatch launch under amended Q-V35-4

**Operator-only authorship per §3.4.** Chat-Claude drafts only; operator authors final text + commits.
