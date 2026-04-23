/**
 * Reads a tmux capture-pane -e dump of `fd status` (ANSI-escaped) and
 * writes it as styled HTML to /tmp/fd-status-frame.html. The HTML is
 * then rendered to PNG via headless Chrome for the §6 / FD-T11 exit
 * gate at docs/screenshots/fd-status.png.
 *
 * Pipeline:
 *   node scripts/seed-status-demo.js
 *   tmux new -d -s fdstatus-cap -x 110 -y 14 -e FORCE_COLOR=3 "./dist/bin/fd.js status"
 *   sleep 2
 *   tmux capture-pane -t fdstatus-cap -p -e > /tmp/tmux-frame.ansi
 *   tmux kill-session -t fdstatus-cap
 *   pnpm tsx scripts/render-status-frame.tsx
 *   # headless chrome renders /tmp/fd-status-frame.html to PNG
 *
 * Using the ansi-to-html dev dep (already installed) so colors match
 * exactly what ink emitted — no hand-styled approximation.
 */

import { readFileSync, writeFileSync } from 'node:fs';
// @ts-expect-error — no upstream types shipped for ansi-to-html
import Convert from 'ansi-to-html';

const ansi = readFileSync('/tmp/tmux-frame.ansi', 'utf8')
  // tmux capture pads each line to pane width with trailing spaces; strip
  // so the HTML doesn't produce huge empty right margins.
  .split('\n')
  .map((line) => line.replace(/\s+$/, ''))
  .join('\n')
  .replace(/\n+$/, '');

const convert = new Convert({
  fg: '#e6e6e6',
  bg: '#141414',
  newline: true,
  escapeXML: true,
  colors: {
    0: '#000000',
    1: '#cc5555',
    2: '#77bb77',
    3: '#e0c050',
    4: '#6688cc',
    5: '#cc66cc',
    6: '#60c8dd',
    7: '#cccccc',
    8: '#808080',
    9: '#dd6060',
    10: '#77dd77',
    11: '#eeee77',
    12: '#7799dd',
    13: '#dd77dd',
    14: '#77dddd',
    15: '#ffffff',
  },
});

const body = convert.toHtml(ansi);

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>fd status</title>
  <style>
    html, body { margin: 0; padding: 0; background: #141414; }
    .term {
      font-family: "SF Mono", "Menlo", "Consolas", monospace;
      font-size: 15px;
      line-height: 1.5;
      color: #e6e6e6;
      background: #141414;
      padding: 28px 32px;
      display: inline-block;
      white-space: pre;
    }
  </style>
</head>
<body>
<div class="term">${body}</div>
</body>
</html>`;

writeFileSync('/tmp/fd-status-frame.html', html, 'utf8');
console.log('wrote /tmp/fd-status-frame.html');
