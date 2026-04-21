import { z } from 'zod';

export const SessionSchema = z.object({
  cwd: z.string().min(1),
  tmux_target: z.string().regex(/^[^:]+:\d+\.\d+$/),
  handoff_path: z.string().min(1),
  last_prompt_sent_at: z.string().datetime().nullable(),
  last_handoff_pulled_at: z.string().datetime().nullable(),
});

export const RegistrySchema = z.object({
  version: z.literal(1),
  sessions: z.record(z.string().min(1), SessionSchema),
});

export type Session = z.infer<typeof SessionSchema>;
export type Registry = z.infer<typeof RegistrySchema>;
