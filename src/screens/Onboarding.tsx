import { useEffect, useRef } from 'react';
import { Screen, useGo, Chevron } from '../ui/nav';
import { WM } from '../ui/brandPaths';
import { EASE, calm, stripes } from '../lib/tokens';

/* Diagonales de color del escenario (mismas que el splash) */
function StageLines() {
  const strokes = ['#ACDDFF', '#977BF2', 'url(#ob-lv)', '#FD5E02', 'url(#ob-kp)', 'url(#ob-vl)', '#ACDDFF', 'url(#ob-vl)', '#FD5E02', 'url(#ob-pk)', '#ACDDFF', '#977BF2', 'url(#ob-lv)', '#FD5E02', 'url(#ob-kp)', 'url(#ob-vl)'];
  return (
    <svg aria-hidden="true" width="350" height="352" viewBox="0 0 350 352" style={{ position: 'absolute', inset: 0, display: 'block', width: '100%', height: '100%' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ob-vl" x1="0" y1="1" x2="1" y2="0"><stop offset="0.3" stopColor="#977BF2" /><stop offset="0.75" stopColor="#D9FC62" /></linearGradient>
        <linearGradient id="ob-lv" x1="0" y1="1" x2="1" y2="0"><stop offset="0.25" stopColor="#D9FC62" /><stop offset="0.7" stopColor="#977BF2" /></linearGradient>
        <linearGradient id="ob-pk" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#F5F5F5" /><stop offset="1" stopColor="#FEC3EC" /></linearGradient>
        <linearGradient id="ob-kp" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#FEC3EC" /><stop offset="1" stopColor="#F5F5F5" /></linearGradient>
      </defs>
      {strokes.map((s, i) => <line key={i} x1="-30" y1={11.1 + i * 40} x2="380" y2={-279.6 + i * 40} stroke={s} strokeWidth="1" />)}
    </svg>
  );
}

const pop = (n: Element | null | undefined, kf: Keyframe[], o: KeyframeAnimationOptions) => { if (n && (n as HTMLElement).animate) (n as HTMLElement).animate(kf, { fill: 'backwards', ...o }); };
const tilt = (a: number, from: string) => [{ opacity: 0, transform: `${from} rotate(${a}deg)` }, { opacity: 1, transform: `rotate(${-a * 0.3}deg)`, offset: 0.7 }, { opacity: 1, transform: 'none' }];
const SPRING = 'cubic-bezier(.34,1.4,.64,1)';

function Shell({ step, children, text, stageLabel, onSkip, back, footer, rootRef }: { step: 1 | 2; children: React.ReactNode; text: React.ReactNode; stageLabel: string; onSkip: () => void; back?: () => void; footer: React.ReactNode; rootRef: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0 }}>
      <div className="scroller">
        <div style={{ padding: '58px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}>
          {back ? <button type="button" className="glass" aria-label="Atrás" onClick={back}><Chevron /></button> : <span style={{ width: 44 }} />}
          <button type="button" className="skip" onClick={onSkip}>Omitir</button>
        </div>
        <section className="stage" role="img" aria-label={stageLabel}><StageLines />{children}</section>
        {text}
      </div>
      <div className="ob-foot">
        <div className="dots" role="img" aria-label={`Paso ${step} de 2`}><span className={step === 1 ? 'on' : ''} /><span className={step === 2 ? 'on' : ''} /></div>
        {footer}
      </div>
    </div>
  );
}

export function Onboarding1() {
  const go = useGo();
  const root = useRef<HTMLDivElement>(null);
  const ov = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current; if (!el || !el.animate) return;
    const stage = el.querySelector('.stage') as HTMLElement, card = stage.lastElementChild as HTMLElement;
    const text = el.querySelector('.ob-text'), foot = el.querySelector('.ob-foot');
    const items = (d0: number) => {
      const segs = Array.from(card.querySelectorAll('.bar > div')), rows = Array.from(card.querySelectorAll('.row'));
      pop(card.querySelector('.lbl'), [{ opacity: 0, transform: 'translateY(8px) rotate(-5deg)' }, { opacity: 1, transform: 'rotate(1.5deg)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: 380, delay: d0, easing: EASE.out });
      segs.forEach((s, i) => pop(s, [{ clipPath: 'inset(0 100% 0 0 round 14px)' }, { clipPath: 'inset(0 0 0 0 round 14px)' }], { duration: 520, delay: d0 + 120 + i * 110, easing: 'cubic-bezier(.34,1.3,.64,1)' }));
      rows.forEach((r, i) => { const a = i % 2 ? 5 : -5; pop(r, tilt(a, 'translateX(-18px)'), { duration: 460, delay: d0 + 420 + i * 120, easing: EASE.out });
        pop(r.querySelector('.badge'), [{ transform: 'scale(0) rotate(-20deg)' }, { transform: 'scale(1.18) rotate(6deg)', offset: 0.7 }, { transform: 'none' }], { duration: 480, delay: d0 + 460 + i * 120, easing: EASE.out }); });
    };
    let f: string | null = null;
    try { f = sessionStorage.getItem('mi-splash'); if (f === 'crear') sessionStorage.removeItem('mi-splash'); } catch { /* */ }
    const o = ov.current!;
    if (f !== 'crear' || calm()) { o.style.opacity = '0'; if (!calm()) items(300); return; }
    /* Desde el splash: la M violeta sobre lima se recorta y se guarda en el escenario */
    const r = stage.getBoundingClientRect(), rr = el.getBoundingClientRect();
    const T = r.top - rr.top, L = r.left - rr.left, B = rr.bottom - r.bottom, R = rr.right - r.right;
    o.style.opacity = '1';
    o.animate([{ clipPath: 'inset(0px 0px 0px 0px round 48px)', opacity: 1 }, { clipPath: `inset(${T}px ${R}px ${B}px ${L}px round 40px)`, opacity: 1, offset: 0.62 }, { clipPath: `inset(${T}px ${R}px ${B}px ${L}px round 40px)`, opacity: 0 }], { duration: 900, easing: EASE.inout, fill: 'both' });
    pop(card, [{ opacity: 0, transform: 'translateY(28px) scale(.96) rotate(5deg)' }, { opacity: 1, transform: 'rotate(-1.5deg)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: 520, delay: 620, easing: SPRING });
    items(820);
    [text, foot].forEach((n, i) => pop(n, [{ opacity: 0, transform: 'translateY(20px)' }, { opacity: 1, transform: 'none' }], { duration: 460, delay: 760 + i * 120, easing: EASE.out }));
  }, []);
  const goals = [
    { e: '🏖️', bg: '#E4DCFC', n: 'Jubilación', d: 'may 2055' },
    { e: '🚗', bg: '#EEFDC4', n: 'Cambiar el auto', d: '15 nov 2027' },
    { e: '✈️', bg: '#D6EEF9', n: 'Viaje a Japón', d: '15 may 2027' },
  ];
  return (
    <Screen bg="#FFFFFF" onEnter={() => { try { return sessionStorage.getItem('mi-splash') === 'crear'; } catch { return false; } }}>
      <Shell step={1} rootRef={root} text={<ObText h="Lo que ahorrás por mes, " b="con destino." p="Repartí tu ahorro entre tus metas y mirá cuándo llega cada una." />} stageLabel="Ejemplo: el ahorro del mes repartido entre Jubilación, Cambiar el auto y Viaje a Japón, cada una con su fecha de llegada." onSkip={() => go('/registro')}
        footer={<button type="button" className="btn btn-p" onClick={() => go('/onboarding/2')}>Siguiente</button>}>
        <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: 32, padding: '20px 20px 10px', boxShadow: '0 10px 30px rgba(17,36,43,0.08)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="lbl" style={{ color: '#526166' }}>Tu ahorro del mes</span>
          <div className="bar" style={{ height: 44 }}>
            <div style={{ width: '22.2%', background: '#BDA8FC' }} /><div style={{ width: '16.7%', background: '#D9FC62' }} /><div style={{ width: '50%', background: '#8CCDEB' }} /><div style={{ flexGrow: 1, background: stripes() }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {goals.map((g, i) => (
              <div key={g.n} className="row" style={{ padding: '10px 0', borderBottom: i < 2 ? '1px solid #E3E6E7' : 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b32" style={{ background: g.bg }}>{g.e}</span><span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>{g.n}</span></span>
                <span className="num" style={{ fontSize: 13, lineHeight: '18px', color: '#526166', whiteSpace: 'nowrap' }}>{g.d}</span>
              </div>
            ))}
          </div>
        </div>
      </Shell>
      <div ref={ov} aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', opacity: 0 }}>
        <svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
          <rect x="-200" y="-200" width="790" height="1244" fill="#D9FC62" />
          <g transform="translate(9.44 43.77) scale(0.09283)">{WM.map((d, i) => <path key={i} d={d} fillRule="evenodd" fill="#977BF2" />)}</g>
        </svg>
      </div>
    </Screen>
  );
}

/* Título y bajada debajo del escenario */
function ObText({ h, b, p }: { h: string; b: string; p: string }) {
  return (
    <div className="ob-text" style={{ padding: '28px 24px 200px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1 style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 400, letterSpacing: '-0.02em' }}>{h}<b style={{ fontWeight: 800 }}>{b}</b></h1>
      <p style={{ margin: 0, fontSize: 17, lineHeight: '24px', color: '#526166' }}>{p}</p>
    </div>
  );
}

export function Onboarding2() {
  const go = useGo();
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current; if (!el || !el.animate || calm()) return;
    const stage = el.querySelector('.stage') as HTMLElement;
    const kids = Array.from(stage.children).filter((n) => n.tagName.toLowerCase() !== 'svg'), c1 = kids[0], c2 = kids[1], d0 = 320;
    pop(c1, [{ opacity: 0, transform: 'translateY(-20px) rotate(-5deg)' }, { opacity: 1, transform: 'rotate(1.5deg)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: 480, delay: d0, easing: SPRING });
    pop(c1?.lastElementChild, [{ clipPath: 'inset(0 100% 0 0 round 999px)' }, { clipPath: 'inset(0 0 0 0 round 999px)' }], { duration: 500, delay: d0 + 260, easing: EASE.out });
    pop(c2, [{ opacity: 0, transform: 'translateY(30px) scale(.95) rotate(5deg)' }, { opacity: 1, transform: 'rotate(-1.5deg)', offset: 0.7 }, { opacity: 1, transform: 'none' }], { duration: 540, delay: d0 + 180, easing: SPRING });
    const p = c2?.children[1]?.children || ([] as unknown as HTMLCollection);
    pop(p[0], [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 620, delay: d0 + 420, easing: EASE.out });
    pop(p[1], [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 380, delay: d0 + 920, easing: 'linear' });
    [p[2], p[3]].forEach((n, i) => pop(n, [{ opacity: 0, scale: '0' }, { opacity: 1, scale: '1.25', offset: 0.7 }, { opacity: 1, scale: '1' }], { duration: 420, delay: d0 + 860 + i * 320, easing: EASE.out }));
    pop(c2?.querySelector('.tag'), [{ opacity: 0, scale: '0' }, { opacity: 1, scale: '1.2', offset: 0.7 }, { opacity: 1, scale: '1' }], { duration: 420, delay: d0 + 1180, easing: EASE.out });
    c2?.querySelectorAll('.chip').forEach((n, i) => pop(n, tilt(i % 2 ? 5 : -5, 'translateY(10px)'), { duration: 420, delay: d0 + 1250 + i * 140, easing: EASE.out }));
  }, []);
  return (
    <Screen bg="#FFFFFF">
      <Shell step={2} rootRef={root} text={<ObText h="No se trata de " b="dejar de comprar." p="Se trata de saber qué pasa con tus metas cuando comprás. Ingresá una compra y mirá cómo se mueven las fechas." />} back={() => go('/onboarding/1', 'back')} stageLabel="Ejemplo: con una compra de $400.000, Viaje a Japón pasa del 15 al 25 de mayo de 2027." onSkip={() => go('/registro')}
        footer={<>
          <button type="button" className="btn btn-p" onClick={() => go('/registro')}>Empezar</button>
          <button type="button" className="btn-t" style={{ marginTop: -8, fontWeight: 400 }} onClick={() => go('/login')}><span>¿Ya tenés cuenta? <b style={{ fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>Iniciá sesión</b></span></button>
        </>}>
        <div style={{ position: 'relative', background: '#FFFFFF', borderRadius: 24, padding: '14px 18px', boxShadow: '0 10px 30px rgba(17,36,43,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b32" style={{ background: '#F0F2F2' }}>🛍️</span><span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>Carrito de Shein</span><span className="num" style={{ fontSize: 13, lineHeight: '18px', color: '#526166' }}>$400.000</span></span></span>
          <span aria-hidden="true" style={{ width: 72, height: 24, borderRadius: 999, flex: 'none', background: stripes() }} />
        </div>
        <div style={{ position: 'relative', background: '#8CCDEB', borderRadius: 32, padding: '18px 20px', boxShadow: '0 10px 30px rgba(17,36,43,0.08)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="row"><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b32" style={{ background: '#D6EEF9' }}>✈️</span><span style={{ fontSize: 17, lineHeight: '22px', fontWeight: 700 }}>Viaje a Japón</span></span><span className="tag">+10 días</span></div>
          <div aria-hidden="true" style={{ position: 'relative', height: 28, marginRight: 14 }}>
            <div style={{ position: 'absolute', left: 0, top: 8, width: '68%', height: 12, background: '#11242B', borderRadius: '999px 0 0 999px' }} />
            <div style={{ position: 'absolute', left: '68%', top: 8, width: '14%', height: 12, background: 'repeating-linear-gradient(150deg, #11242B 0 2px, rgba(17,36,43,0) 2px 6px)' }} />
            <div style={{ position: 'absolute', left: '68%', top: 4, width: 20, height: 20, borderRadius: 999, border: '3px solid #11242B', background: '#8CCDEB', transform: 'translateX(-10px)' }} />
            <div style={{ position: 'absolute', left: '82%', top: 0, width: 28, height: 28, borderRadius: 999, background: '#11242B', transform: 'translateX(-14px)' }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><span className="chip num" style={{ background: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Antes <b>15 may 2027</b></span><span className="chip num" style={{ background: 'rgba(255,255,255,0.45)', fontSize: 12 }}>Con la compra <b>25 may 2027</b></span></div>
        </div>
      </Shell>
    </Screen>
  );
}
