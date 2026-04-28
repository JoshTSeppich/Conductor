/**
 * Local type declaration for node-notifier (no shipped @types,
 * upstream package has no .d.ts).
 *
 * Surface limited to what DAEMON-T16 + S03 spike actually use:
 *   notify(opts, callback) — callback is (err, response,
 *   metadata) per node-notifier docs.
 *
 * Filed under DAEMON-F-runtime-deps-hygiene as a candidate for
 * upstreaming a proper @types contribution OR migration to a
 * native macOS-notifications surface (S03 followup #4 — defer
 * unless production usage justifies).
 */

declare module 'node-notifier' {
  interface NotifyOptions {
    title?: string;
    message?: string;
    wait?: boolean;
    sound?: boolean;
    icon?: string;
    [key: string]: unknown;
  }

  type NotifyCallback = (
    err: Error | null,
    response?: string,
    metadata?: unknown,
  ) => void;

  interface Notifier {
    notify(opts: NotifyOptions, callback?: NotifyCallback): void;
  }

  const notifier: Notifier & {
    NotificationCenter: unknown;
  };

  export default notifier;
}
