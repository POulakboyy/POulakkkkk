import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.tsx';
import { initPlatform } from './platform/init.ts';
import { store } from './store/index.ts';
import './design/tokens.css';
import './design/base.css';
import './design/motion.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

// Perf builds only (`VITE_POUXIS_PERF=1`, docs/performance/UI.md): the stress test seeds data through
// the real store. The branch is removed from regular builds.
if (import.meta.env.VITE_POUXIS_PERF === '1') {
  (globalThis as { __pouxis?: unknown }).__pouxis = { store };
}

// Native capabilities load in the background; the web implementation serves until then.
void initPlatform();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
