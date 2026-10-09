import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Shell } from './app/Shell.tsx';
import './design/tokens.css';
import './design/base.css';
import './design/motion.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root element missing');

createRoot(root).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
);
