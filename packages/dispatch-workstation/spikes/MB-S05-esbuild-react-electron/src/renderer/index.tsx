import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';

function App(): React.JSX.Element {
  useEffect(() => {
    // E3 sentinel: useEffect confirms React mounted and committed to DOM.
    // main.ts listens via webContents.on('console-message') and pipes to stdout.
    console.log('RENDER_OK');
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '32px', color: '#1a1a1a' }}>
      <h1>Hello from Round 2 D-spike</h1>
      <p>MB-S05: esbuild + React 18 + Electron renderer validation</p>
      <p style={{ color: '#666', fontSize: '14px' }}>
        If you see this window, E2 (file:// load) and E3 (React mount) passed.
      </p>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('MB-S05: #root element not found in index.html');
}

const root = createRoot(rootEl);
root.render(<App />);
