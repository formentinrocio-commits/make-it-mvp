import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { EASE, calm } from '../lib/tokens';

/* Dirección de la próxima transición (push iOS desde la derecha, volver, hoja que sube, fundido) */
export type Dir = 'push' | 'back' | 'up' | 'fade' | 'none' | 'tab-r' | 'tab-l';
let nextDir: Dir = 'fade';
export const setDir = (d: Dir) => { nextDir = d; };

export function useGo() {
  const nav = useNavigate();
  return (to: string, dir: Dir = 'push') => { nextDir = dir; nav(to); };
}

/* Volver: atrás en el historial si hay de dónde, si no a la pantalla indicada */
export function useBack() {
  const nav = useNavigate();
  return (fallback = '/inicio') => { nextDir = 'back'; const idx = (window.history.state as { idx?: number } | null)?.idx || 0; if (idx > 0) nav(-1); else nav(fallback); };
}

export function Screen({ children, bg = '#F5F5F5', style, onEnter }: { children: ReactNode; bg?: string; style?: CSSProperties; onEnter?: (el: HTMLDivElement, dir: Dir) => boolean | void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el || !el.animate) return;
    const dir = nextDir; nextDir = 'push';
    if (onEnter && onEnter(el, dir)) return;
    if (dir === 'none') return;
    if (calm() || dir === 'fade') { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 }); return; }
    const k: Record<string, Keyframe[]> = {
      push: [{ opacity: 0, transform: 'translateX(64px)' }, { opacity: 1, transform: 'none' }],
      back: [{ opacity: 0, transform: 'translateX(-64px)' }, { opacity: 1, transform: 'none' }],
      'tab-r': [{ opacity: 0.15, transform: 'translateX(64px)' }, { opacity: 1, transform: 'none' }],
      'tab-l': [{ opacity: 0.15, transform: 'translateX(-64px)' }, { opacity: 1, transform: 'none' }],
      up: [{ transform: 'translateY(100%)' }, { transform: 'none' }],
    };
    el.animate(k[dir] || k.push, { duration: dir === 'up' ? 420 : 440, easing: dir === 'up' ? 'cubic-bezier(.2,.9,.25,1)' : EASE.out });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div ref={ref} className="screen" style={{ background: bg, ...style }}>{children}</div>;
}

export const Chevron = ({ c = '#11242B' }: { c?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
);
export const Plus = ({ c = '#FFFFFF', s = 24 }: { c?: string; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
);
export const Check = ({ c = '#11242B', s = 12 }: { c?: string; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 14 14" fill="none" stroke={c} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" /></svg>
);
export const Lock = ({ c = '#11242B' }: { c?: string }) => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="2.5" y="6" width="9" height="6.5" rx="1.5" /><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" /></svg>
);
export const Arrow = ({ c = '#FFFFFF' }: { c?: string }) => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 7h9M8 4l3 3-3 3" /></svg>
);

export function BackButton({ to, label = 'Volver', dir = 'back' }: { to: string; label?: string; dir?: Dir }) {
  const go = useGo();
  return <button type="button" className="glass" aria-label={label} onClick={() => go(to, dir)}><Chevron /></button>;
}

/* Bloques que aparecen uno a uno */
export function useStagger(ref: React.RefObject<HTMLElement | null>, selector = ':scope > *', base = 120, step = 90) {
  useEffect(() => {
    const el = ref.current; if (!el || calm()) return;
    Array.from(el.querySelectorAll(selector)).forEach((n, i) => (n as HTMLElement).animate?.([{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: base + i * step, easing: EASE.out, fill: 'backwards' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
