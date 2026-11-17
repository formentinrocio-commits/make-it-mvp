import { useEffect, useRef } from 'react';
// @ts-expect-error módulo JS portado del canvas
import { startSplash } from '../ui/splashArt.js';
import { Screen, useGo } from '../ui/nav';

/* Splash + entrada: diagonales, Make It! escrito como fibra, zoom a la M, violeta/lima y panel con Crear cuenta / Iniciar sesión.
   Completo solo la primera vez; después corre igual pero se puede saltear tocando la pantalla. */
export default function Splash() {
  const ref = useRef<HTMLDivElement>(null);
  const go = useGo();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const stop = startSplash(el);
    return () => { if (typeof stop === 'function') stop(); };
  }, []);
  const leave = (to: string, flag: string) => { try { sessionStorage.setItem('mi-splash', flag); localStorage.setItem('mi-seen', '1'); } catch { /* */ } go(to, 'none'); };
  return (
    <Screen bg="#F5F5F5">
      <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
        <canvas className="sp-cv" width={390} height={844} aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
        <div className="sp-ui" style={{ position: 'absolute', left: 12, right: 12, bottom: 12, padding: '24px 20px 22px', borderRadius: 40, display: 'flex', flexDirection: 'column', gap: 20, opacity: 0, background: 'rgba(245,245,245,0.72)', WebkitBackdropFilter: 'blur(24px) saturate(1.6)', backdropFilter: 'blur(24px) saturate(1.6)', boxShadow: '0 16px 40px rgba(17,36,43,0.16), inset 0 0 0 0.5px rgba(255,255,255,0.8)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 4px' }}>
            <span className="lbl" style={{ color: '#36474D' }}>Make It!</span>
            <p style={{ margin: 0, fontFamily: 'var(--brand)', fontSize: 28, lineHeight: '31px', fontWeight: 700, letterSpacing: '-0.01em' }}>Entendé el impacto, después decidí.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" className="btn btn-p" onClick={() => leave('/onboarding/1', 'crear')}>Crear cuenta</button>
            <button type="button" className="btn btn-s" onClick={() => leave('/login', 'login')}>Iniciar sesión</button>
          </div>
        </div>
      </div>
    </Screen>
  );
}
