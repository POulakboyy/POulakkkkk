import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.tsx';
import { initPlatform } from './platform/init.ts';
import './design/tokens.css';
import './design/base.css';
import './design/motion.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

// Native capabilities load in the background; the web implementation serves until then.
void initPlatform();

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
