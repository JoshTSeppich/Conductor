import { z } from 'zod';

/**
 * v1 session entry schema.
 *
 * DAEMON-Z-4 fix (Round 2 finding #50 candidate, persistent-
 * state-divergence): added .passthrough() so v2-only fields
 * written by the daemon (state, last_commit_sha,
 * last_status_json_at) ride through v1 readRegistry →
 * writeRegistry round-trip untouched.
 *
 * Without .passthrough(), Zod's default strip-unknown would
 * silently drop v2 fields on parse → v1 writes back without
 * them → daemon-next-startup re-defaults state='armed'
 * across all sessions, destroying operator's paused/held
 * distinctions.
 *
 * Honors §7.2 verbatim ("fd v1 commands keep working even
 * when Conductor is offline") + §7.3 verbatim ("Schema
 * changes are additive only... existing fields unchanged").
 * Pending §7.3 amendment (operator-authored at cluster-
 * close): explicit statement that v1 commands transparently
 * preserve v2 schema fields through the §7.2 fallback path.
 */
export const SessionSchema = z
  .object({
    cwd: z.string().min(1),
    tmux_target: z.string().regex(/^[^:]+:\d+\.\d+$/),
    handoff_path: z.string().min(1),
    last_prompt_sent_at: z.string().datetime().nullable(),
    last_handoff_pulled_at: z.string().datetime().nullable(),
  })
  .passthrough();

/**
 * v1 registry shape.
 *
 * DAEMON-Z-4 fix:
 *   - version literal loosened to accept 1 OR 2 (daemon's
 *     v1→v2 migration writes version=2; v1 fallback must read
 *     it transparently per §7.2 spirit)
 *   - .passthrough() on the outer object for future-proofing
 *     (v3+ may add top-level keys; current v2 doesn't add any
 *     beyond the unchanged {version, sessions} shape, but
 *     forward-compat is cheap insurance)
 */
export const RegistrySchema = z
  .object({
    version: z.union([z.literal(1), z.literal(2)]),
    sessions: z.record(z.string().min(1), SessionSchema),
  })
  .passthrough();

export type Session = z.infer<typeof SessionSchema>;
export type Registry = z.infer<typeof RegistrySchema>;
