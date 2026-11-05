// Standalone preview of the component gallery for visual QA:
//   cd apps/pouxis && npx vite src/ui/__preview__ --config vite.config.ts --port 4174
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../design/tokens.css';
import '../../design/base.css';
import '../../design/motion.css';
import { Gallery } from '../Gallery.tsx';

const params = new URLSearchParams(location.search);
const theme = params.get('theme');
if (theme) document.documentElement.dataset.theme = theme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Gallery withToaster />
  </StrictMode>,
);
