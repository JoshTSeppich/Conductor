# MB-S02 amendment — spike-environment-validation methodology

**Status:** ACCEPTED. Methodology amendment. Cross-references original
MB-S02 ADR (`docs/adr/MB-S02-tmux-spawn-fidelity.md`); does NOT
retroactively repair MB-S02 evidence — binds future spike work only.

**Date filed:** 2026-05-04
**Date amended into batch-6:** 2026-05-03 (Session A wiring-spawn batch).

**Authored under cairn finding #74** (`MB-F-MB-T05-SPIKE-ENVIRONMENT-
VALIDATION`). Cross-references cairn findings #72
(`MB-F-MB-T05-PATH-ALLOWLIST-CLAUDE-RESOLUTION`) and #73
(`MB-F-MB-T05-POST-SPAWN-LIVENESS-CHECK`).

**Related contracts:**
- `docs/cairn-findings.md` #72/#73/#74
- `CONDUCTOR_API_CONTRACT.md` §10.1 (confidence labels)
- `CONDUCTOR_API_CONTRACT.md` §10.5 (self-check)
- `WORKSTATION_CONTRACT.md` §8.1 amended (cf1848a) closed-allowlist
  env-construction bar
- Original ADR `docs/adr/MB-S02-tmux-spawn-fidelity.md`

**Confidence labels per claim:** KNOWN (directly grounded in cairn-#72
dogfood evidence), MODELED (extrapolated from KNOWN data),
SPECULATIVE (open hypothesis, calls out the gap).

---

## §1 — Context

The 2026-05-03 dogfood test surfaced a 100%-reproducible spawn
failure (cairn #72): operator clicks "+ Spawn Session", modal closes
without error, no tmux session ever appears in the kanban.

Root cause (KNOWN per cairn #72): `spawn-env.ts` `ALLOWLIST_PATH`
excludes `~/.local/bin` (the Anthropic official-installer location).
When tmux inherits the closed-allowlist PATH and forks claude, the
lookup fails. tmux returns exit-0 BEFORE the fork+exec attempt, so
the workstation receives a spurious success signal.

The `ALLOWLIST_PATH` constant in `spawn-env.ts` was derived from the
MB-S02 spike (per spawn-env.ts §1 doc-comment + ADR §3.1). MB-S02's
KNOWN claim ("Homebrew prefix prepended ahead of system paths so
`claude` and `tmux` at /opt/homebrew/bin resolve in the launchd-
minimal-PATH spawn context") was measured on a system where the
spike-runner had `claude` installed via Homebrew at `/opt/homebrew/
bin`. The KNOWN claim was true for that environment. The
generalization-to-production-operator-environments was implicit, not
spike-validated.

This amendment files the methodology lesson and the binding decision
for future spikes that touch operator-environment-dependent
assumptions.

## §2 — Methodology gap (KNOWN)

**Gap statement.** MB-S02 §3 spike methodology focused on validating
the closed-allowlist construction in the spike-runner's shell
environment (login Terminal.app with full dotfile sourcing). The
spike correctly established:

- KNOWN: launchd-minimal PATH does not include Homebrew prefix.
- KNOWN: tmux + claude at `/opt/homebrew/bin` are reachable when
  `ALLOWLIST_PATH` prepends Homebrew prefix to the system path.

What MB-S02 did NOT establish:

- KNOWN-NOW (cairn #72 evidence): `ALLOWLIST_PATH` does NOT include
  `~/.local/bin`, the documented Anthropic official-installer
  location.
- KNOWN-NOW: operators who installed claude per the official
  Anthropic installer instructions hit a 100%-reproducible silent
  failure.
- KNOWN-NOW: the spike's bound decision ("Homebrew-only PATH is
  sufficient") was true-but-incomplete: it covered the spike-runner's
  install method, not the install-method variation space.

**The methodology lesson (KNOWN):** spike evidence about operator-
installed binaries needs validation across at least the documented
install methods, not the spike-runner's environment alone. A spike
that says "this PATH works for binary X" is a claim about the spike-
runner's install method and a SPECULATIVE claim about all other
install methods until enumerated.

## §3 — Binding decision (KNOWN — methodology contract)

**Future spikes touching operator-environment-dependent assumptions
MUST:**

1. **Enumerate the install/configuration variation space.** For every
   operator-installed binary or operator-configured path the spike
   reasons about, enumerate the install/configuration methods the
   spike intends to cover (e.g., Homebrew, Anthropic official
   installer, manual install via tarball, system package manager).

2. **Validate against each enumerated variation.** Either run the
   spike under each enumerated variation's environment, OR
   explicitly mark the un-validated variations as SPECULATIVE in
   the ADR.

3. **Call out un-covered variations explicitly.** Any install/
   configuration variation not validated MUST appear in the ADR as
   a labeled SPECULATIVE row. The ADR's confidence-labels block
   MUST include an "environment dependencies" section that
   summarizes which variations were exercised and which were not.

4. **Ratchet rules MAY require subsequent dogfood validation** before
   the spike's binding decisions can be promoted to KNOWN for the
   un-covered variations. (Cairn #72's permanent fix — resolving
   `claude` to an absolute path via `which claude` at workstation
   startup — is path-agnostic, so it sidesteps this requirement for
   the specific PATH-allowlist case. Future spikes facing similar
   variation spaces should apply this ratchet rule.)

## §4 — Scope of this amendment

**Scope (what this amendment binds):**
- Future spikes filed AFTER 2026-05-03 (batch-6).
- Any spike whose binding decisions depend on operator-installed
  binaries OR operator-configured paths.

**NOT scope (what this amendment does NOT do):**
- Does NOT retroactively re-open MB-S02 for re-validation. MB-S02's
  spike-runner-environment evidence stands as KNOWN for that
  environment. The amendment makes future spikes do better, not
  past spikes do over.
- Does NOT replace the spawn-env.ts `ALLOWLIST_PATH` content. The
  permanent fix for the dogfooded symptom is cairn #72's
  `claude`-absolute-path resolution (`MB-F-MB-T05-PATH-ALLOWLIST-
  CLAUDE-RESOLUTION` followup, batch-6 Session A scope), which
  bypasses the PATH-lookup issue entirely.
- Does NOT amend any frozen contract surface (CONDUCTOR_API_CONTRACT.md,
  WORKSTATION_CONTRACT.md, schema.ts).

## §5 — Cross-references

- `docs/cairn-findings.md` Finding #72 — root-cause analysis of the
  dogfooded symptom + permanent-fix spec.
- `docs/cairn-findings.md` Finding #73 — defense-in-depth liveness-
  check fix.
- `docs/cairn-findings.md` Finding #74 — this methodology amendment.
- `docs/adr/MB-S02-tmux-spawn-fidelity.md` — original spike ADR. NOT
  modified by this amendment; this file is an addendum.
- `packages/dispatch-workstation/src/main/binary-resolver.ts` — the
  cairn-#72 implementation that resolves the PATH-allowlist gap by
  bypassing PATH lookup at the workstation→tmux boundary.

## §6 — Confidence-labels block

Per CONDUCTOR_API_CONTRACT.md §10.1:

| Claim | Confidence | Evidence |
|---|---|---|
| MB-S02 spike was run on a Homebrew-only environment | KNOWN | original ADR §3.1; spawn-env.ts header doc |
| `ALLOWLIST_PATH` excludes `~/.local/bin` | KNOWN | spawn-env.ts source line `'/opt/homebrew/bin:...:/sbin'` |
| Anthropic official installer places claude at `~/.local/bin` | KNOWN | cairn #72 dogfood-validated 2026-05-03 |
| Operators with claude outside `/opt/homebrew/bin` hit 100%-reproducible spawn failure (under MB-S02 PATH allowlist) | KNOWN | cairn #72 §"Reproduction" |
| Resolving `claude` to absolute path via `which claude` at startup repairs the symptom for the operator's specific environment | KNOWN | cairn #72 dogfood-validated workaround + batch-6 Session A green commit |
| The absolute-path fix generalizes to other install methods (Homebrew, manual install) | MODELED | the fix is path-agnostic; `which claude` returns whatever the operator's shell resolves. Not yet dogfood-validated for non-`~/.local/bin` paths. |
| The methodology lesson generalizes beyond the PATH-allowlist case to other operator-environment-dependent spike claims | MODELED | reasoning from a single case; future spikes will accumulate evidence |
| Future spikes that follow §3's binding decision will avoid analogous true-but-incomplete claims | SPECULATIVE | no evidence yet; this is the proposal under test |

---

**Self-check (CONDUCTOR_API_CONTRACT.md §10.5):**

1. API verified by spike? n/a — methodology document, no API surface.
2. Test exercises behavior or mocks? n/a — no test in this commit.
3. If implementation deleted, would test still pass? n/a.
4. Anything outside contract spec? no — cairn #74 spec implemented
   verbatim (ADR amendment cross-referencing #72/#73, methodology
   lesson + binding decision documented).
5. Modified contract without operator approval? no — no frozen
   contract touched. The MB-S02 original ADR is unchanged; this
   amendment is an addendum file.
6. Any unlabeled claim? no — all factual claims labeled
   KNOWN/MODELED/SPECULATIVE in §6.
7. Touched a file the other parallel session might also modify? no —
   new ADR file under Session A territory.
8. Direct registry-write bypassing PATCH? no — doc only.
9. Halt-state work without authorization? no.
