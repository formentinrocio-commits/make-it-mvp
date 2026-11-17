import { useEffect, useRef, useState } from 'react';
import { useGo } from './nav';
import { calm } from '../lib/tokens';

const BASE = import.meta.env.BASE_URL;
const TABS = [
  { to: '/inicio', label: 'Inicio', icon: (on: boolean) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#11242B" strokeWidth={on ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 11l8-7 8 7v8.5a1.5 1.5 0 01-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 014 19.5z" /></svg> },
  { to: '/metas', label: 'Metas', icon: (on: boolean) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#11242B" strokeWidth={on ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="#11242B" /></svg> },
  { to: '/anio', label: 'Tu año', icon: (on: boolean) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#11242B" strokeWidth={on ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg> },
  { to: '/perfil', label: 'Perfil', icon: (on: boolean) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#11242B" strokeWidth={on ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8.5" r="4" /><path d="M4.5 20.5c1.4-3.8 4.4-5.5 7.5-5.5s6.1 1.7 7.5 5.5" /></svg> },
];

/* Filtros de refracción (Liquid Glass): solo Chromium los aplica en backdrop-filter; Safari usa el blur */
export function GlassDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
      <filter id="lens-pill" x="0" y="0" width="350" height="64" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB"><feImage href={`${BASE}glass/lens-pill-350x64.png`} x="0" y="0" width="350" height="64" preserveAspectRatio="none" result="map" /><feDisplacementMap in="SourceGraphic" in2="map" scale="30" xChannelSelector="R" yChannelSelector="G" /></filter>
      <filter id="lens-chip" x="0" y="0" width="184" height="40" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB"><feImage href={`${BASE}glass/lens-pill-184x44.png`} x="0" y="0" width="184" height="40" preserveAspectRatio="none" result="map" /><feDisplacementMap in="SourceGraphic" in2="map" scale="22" xChannelSelector="R" yChannelSelector="G" /></filter>
    </svg>
  );
}

const memTab = (cur: number) => { let p: string | null = null; try { p = sessionStorage.getItem('mi-tab'); sessionStorage.setItem('mi-tab', String(cur)); } catch { /* */ } return p === null ? null : parseInt(p, 10); };

/* Tab bar flotante + botón ¿Lo compro?. Arriba de todo en Inicio el botón muestra el texto y el menú solo íconos; al bajar (o en otras pestañas) se invierte. */
export default function TabBar({ current, scrolled, coach }: { current: number; scrolled: boolean; coach?: boolean }) {
  const go = useGo();
  const prev = useRef<number | null | undefined>(undefined);
  if (prev.current === undefined) prev.current = memTab(current);
  const moved = prev.current !== null && prev.current !== current;
  const compact = !(scrolled || current !== 0);
  const ind = useRef<HTMLSpanElement>(null);
  const [tip, setTip] = useState(() => { if (!coach) return false; try { return !localStorage.getItem('mi-coach'); } catch { return false; } });
  const closeTip = () => { setTip(false); try { localStorage.setItem('mi-coach', '1'); } catch { /* */ } };

  useEffect(() => {
    const el = ind.current; if (!el || !moved || !el.animate || calm() || prev.current === null) return;
    const w = (el.parentElement!.offsetWidth - 14) / 4, st = w + 2, a = (prev.current ?? 0) * st, b = current * st, lo = Math.min(a, b), span = Math.abs(b - a) + w;
    el.animate([{ transform: `translateX(${a}px)`, width: `${w}px` }, { transform: `translateX(${lo}px)`, width: `${span}px`, offset: 0.45 }, { transform: `translateX(${b}px)`, width: `${w}px` }], { duration: 420, easing: 'cubic-bezier(.3,.9,.3,1)' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toTab = (i: number) => { if (i === current) return; go(TABS[i].to, i > current ? 'tab-r' : 'tab-l'); };
  const ev = compact ? { w: 178, pr: 16, op: 1, nav: 208 } : { w: 64, pr: 6, op: 0, nav: 94 };

  return (
    <>
      <GlassDefs />
      {tip && (
        <div role="dialog" aria-labelledby="tip-t" aria-describedby="tip-d" className="mi-tip">
          <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 999, background: '#11242B', display: 'grid', placeItems: 'center', flex: 'none' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}><b id="tip-t" style={{ fontSize: 15, lineHeight: '20px', fontWeight: 700 }}>Evaluá antes de comprar</b><span id="tip-d" style={{ fontSize: 14, lineHeight: '19px', color: '#36474D' }}>Escribí qué querés comprar y mirá cómo cambia cada meta. Nada se mueve hasta que confirmes.</span></span>
          <button type="button" onClick={closeTip} aria-label="Cerrar sugerencia" style={{ width: 44, height: 44, margin: '-10px -4px 0 0', border: 0, padding: 0, borderRadius: 999, background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#526166" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
          <span aria-hidden="true" style={{ position: 'absolute', right: 44, bottom: -7, width: 14, height: 14, background: 'rgba(255,255,255,0.92)', transform: 'rotate(45deg)', borderRadius: '0 0 3px 0' }} />
        </div>
      )}
      <button type="button" aria-label="Evaluar una compra" className="glassbar ev" onClick={() => { closeTip(); go('/compro', 'up'); }} style={{ width: ev.w, padding: `0 ${ev.pr}px 0 6px` }}>
        <span aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 999, background: '#11242B', display: 'grid', placeItems: 'center', flex: 'none' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span>
        <span aria-hidden="true" style={{ whiteSpace: 'nowrap', fontSize: 16, lineHeight: '21px', fontWeight: 600, opacity: ev.op, transition: 'opacity 200ms ease' }}>¿Lo compro?</span>
      </button>
      <nav aria-label="Secciones" className={'glassbar tabs' + (compact ? ' mi-compact' : '')} style={{ right: ev.nav }}>
        <span ref={ind} aria-hidden="true" className="tab-ind" style={{ transform: `translateX(calc(${current} * (100% + 2px)))` }} />
        {TABS.map((t, i) => (
          <button key={t.to} type="button" aria-current={i === current ? 'page' : undefined} aria-label={t.label} onClick={() => toTab(i)} style={{ fontWeight: i === current ? 700 : 500 }}>
            {t.icon(i === current)}<span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

/* Velo de borde de scroll (como iOS): aparece cuando el contenido pasa por debajo del encabezado */
/* Va como primer hijo del scroller: queda pegado arriba, debajo de los botones fijos y encima del contenido */
export const ScrollEdge = ({ on, h = 'calc(var(--top) + 24px)' }: { on: boolean; h?: string }) => <div aria-hidden="true" className={'scroll-edge' + (on ? ' on' : '')} style={{ height: h, marginBottom: `calc(-1 * ${h})` }} />;
