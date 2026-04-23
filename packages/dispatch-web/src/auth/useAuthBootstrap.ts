import { useEffect, useState } from 'react';
import { readToken, clearToken } from './token-storage.js';
import { runPreflight } from './preflight.js';
import { useUIStore } from '../store/ui.js';

// Initial auth gate per UI-S01 ADR HTTP half. WebSocket lifecycle
// and reconnect preflight live in useDaemonEvents (WEB-T03), which
// mounts only once this hook reaches 'connected'.
export type BootstrapPhase =
  | 'prompt'
  | 'bootstrapping'
  | 'connected'
  | 'daemon_down'
  | 'auth_failed';

export function useAuthBootstrap(): BootstrapPhase {
  const [phase, setPhase] = useState<BootstrapPhase>('bootstrapping');
  const authRetryNonce = useUIStore((s) => s.authRetryNonce);
  const setConnectionStatus = useUIStore((s) => s.setConnectionStatus);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function run(): Promise<void> {
      const token = readToken();
      if (!token) {
        if (!cancelled) setPhase('prompt');
        return;
      }

      setPhase('bootstrapping');
      let result;
      try {
        result = await runPreflight(
          token,
          new Date(0).toISOString(),
          controller.signal,
        );
      } catch (e) {
        if ((e as { name?: string })?.name === 'AbortError') return;
        if (!cancelled) {
          setPhase('daemon_down');
          setConnectionStatus('daemon_down');
        }
        return;
      }
      if (cancelled) return;

      if (result.kind === 'daemon_down') {
        setPhase('daemon_down');
        setConnectionStatus('daemon_down');
        return;
      }
      if (result.kind === 'auth_failed') {
        clearToken();
        setPhase('auth_failed');
        setConnectionStatus('auth_failed');
        return;
      }
      setPhase('connected');
      setConnectionStatus('connected');
    }

    void run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authRetryNonce, setConnectionStatus]);

  return phase;
}
