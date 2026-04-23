import { ws } from 'msw';

// MSW 2.x WebSocket API. Matches any origin + /v2/events/stream path
// so tests work regardless of whether they simulate dev-proxy
// (:5173) or same-origin prod (:7878). Token is in query string per
// contract §5.1 — handlers access via URL parsing when needed.
export const wsApi = ws.link('ws://*/v2/events/stream');
