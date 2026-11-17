import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { StoreProvider } from './lib/store';

/* Teclado en iPhone: el alto de la app sigue al área visible (así el botón queda arriba del teclado)
   y el campo enfocado se acomoda a la vista */
const vv = window.visualViewport;
if (vv) {
  const fit = () => {
    document.documentElement.style.setProperty('--vvh', `${vv.height}px`);
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  };
  vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); fit();
}
document.addEventListener('focusin', (e) => {
  const t = e.target as HTMLElement;
  if (!t.matches?.('input, textarea')) return;
  setTimeout(() => (t.closest('.field') || t.closest('.fbox') || t).scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 320);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
);
