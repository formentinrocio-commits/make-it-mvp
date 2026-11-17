import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { Screen, useGo, useStagger } from '../ui/nav';
import { HEADER_BG } from '../ui/parts';
import TabBar, { ScrollEdge } from '../ui/TabBar';
import { fmt } from '../lib/money';
import { EASE, calm } from '../lib/tokens';
import { initials } from './Inicio';

const ChevR = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#11242B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>;

function Switch({ on, onToggle, labelledBy }: { on: boolean; onToggle: () => void; labelledBy: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-labelledby={labelledBy} onClick={onToggle} className="switch" style={{ background: on ? '#11242B' : 'rgba(120,120,128,0.24)' }}><span aria-hidden="true" style={{ left: on ? 22 : 2 }} /></button>;
}

export default function Perfil() {
  const go = useGo();
  const { profile, session, saveProfile, signOut, deleteAccount } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const body = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  useStagger(body, ':scope > *', 140, 90);
  useEffect(() => { if (del && sheet.current && !calm()) sheet.current.animate([{ opacity: 0, transform: 'scale(1.08)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EASE.spring }); }, [del]);
  const email = session?.user.email || '';
  const day = String(profile?.contribution_day || 1).padStart(2, '0');

  const out = async () => { try { sessionStorage.clear(); } catch { /* */ } await signOut(); go('/splash', 'fade'); };
  const remove = async () => {
    setBusy(true); setErr(null);
    const e = await deleteAccount();
    setBusy(false);
    if (e) { setErr(/mi_delete_me/.test(e) ? 'Falta la función mi_delete_me en Supabase (schema.sql).' : 'No pudimos eliminar tu cuenta. Probá de nuevo.'); return; }
    try { sessionStorage.clear(); localStorage.removeItem('mi-coach'); } catch { /* */ }
    go('/splash', 'fade');
  };

  return (
    <Screen>
      <div className="scroller" onScroll={(e) => { const v = e.currentTarget.scrollTop > 4; if (v !== scrolled) setScrolled(v); }}>
        <ScrollEdge on={scrolled} />
        <header style={{ padding: 'var(--top) 20px 24px', borderRadius: '0 0 40px 40px', background: HEADER_BG, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="row" style={{ minHeight: 44 }}><span className="lbl" style={{ color: '#526166' }}>Tu cuenta</span></div>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 400, letterSpacing: '-0.02em' }}>Tu <b style={{ fontWeight: 800 }}>perfil</b></h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: 999, background: '#11242B', color: '#FFFFFF', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 700, letterSpacing: '0.02em', flex: 'none' }}>{initials(profile?.name)}</span>
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><b style={{ fontSize: 20, lineHeight: '25px', fontWeight: 700 }}>{profile?.name}</b><span style={{ fontSize: 15, lineHeight: '20px', color: '#526166', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span></span>
          </div>
        </header>
        <div ref={body} style={{ padding: '16px 20px 130px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <section aria-label="Tu plan" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="lbl" style={{ color: '#526166', padding: '0 6px' }}>Tu plan</span>
            <div className="card" style={{ gap: 0, padding: '4px 0' }}>
              <button type="button" className="gr" onClick={() => go('/ahorro')} style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer', font: 'inherit', color: '#11242B' }}><span>Ahorro del mes</span><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><b className="num" style={{ fontWeight: 600 }}>{fmt(profile?.monthly_saving || 0)}</b><ChevR /></span></button>
              <div className="gr"><span>Día de aporte</span><span style={{ color: '#526166' }}>{day} de cada mes</span></div>
              <div className="gr"><span>Moneda</span><span style={{ color: '#526166' }}>Peso argentino</span></div>
            </div>
          </section>
          <section aria-label="Avisos" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="lbl" style={{ color: '#526166', padding: '0 6px' }}>Avisos</span>
            <div className="card" style={{ gap: 0, padding: '4px 0' }}>
              <div className="gr"><span style={{ display: 'flex', flexDirection: 'column' }}><span id="pa-l">Recordarme el aporte</span><span className="hint">El {day} de cada mes</span></span><Switch on={profile?.notify_contribution ?? true} labelledBy="pa-l" onToggle={() => saveProfile({ notify_contribution: !(profile?.notify_contribution ?? true) })} /></div>
              <div className="gr"><span style={{ display: 'flex', flexDirection: 'column' }}><span id="pm-l">Avisarme si una meta se mueve</span><span className="hint">Cuando una compra cambia una fecha</span></span><Switch on={profile?.notify_moves ?? true} labelledBy="pm-l" onToggle={() => saveProfile({ notify_moves: !(profile?.notify_moves ?? true) })} /></div>
            </div>
          </section>
          <section aria-label="Cuenta" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="lbl" style={{ color: '#526166', padding: '0 6px' }}>Cuenta</span>
            <div className="card" style={{ gap: 0, padding: '4px 0' }}>
              <div className="gr"><span>Email</span><span style={{ color: '#526166', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 210 }}>{email}</span></div>
              <button type="button" className="gr" onClick={out} style={{ width: '100%', border: 0, borderTop: '1px solid #E3E6E7', background: 'transparent', cursor: 'pointer', font: 'inherit', color: '#11242B', fontWeight: 600 }}><span>Cerrar sesión</span></button>
            </div>
            <div className="card" style={{ gap: 0, padding: '4px 0' }}>
              <button type="button" className="gr" onClick={() => setDel(true)} style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer', font: 'inherit', color: '#963B33', textAlign: 'left' }}><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontWeight: 600 }}>Eliminar cuenta</b><span style={{ fontSize: 13, lineHeight: '18px', color: '#526166' }}>Borra tus metas, aportes y decisiones.</span></span></button>
            </div>
          </section>
          <p className="hint" style={{ margin: 0, textAlign: 'center' }}>Make It no se conecta a tu banco ni mueve dinero. Tus datos quedan en tu cuenta.</p>
        </div>
      </div>
      <TabBar current={3} scrolled={scrolled} />
      {del && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(17,36,43,0.32)', display: 'grid', placeItems: 'center', padding: 36, animation: 'mi-fade 200ms ease' }} onClick={(e) => { if (e.target === e.currentTarget && !busy) setDel(false); }}>
          <div ref={sheet} role="alertdialog" aria-modal="true" aria-labelledby="del-t" aria-describedby="del-d" style={{ width: '100%', maxWidth: 300, background: 'rgba(255,255,255,0.94)', WebkitBackdropFilter: 'blur(24px)', backdropFilter: 'blur(24px)', borderRadius: 32, padding: '22px 20px 16px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 20px 60px rgba(17,36,43,0.25)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'center' }}>
              <b id="del-t" style={{ fontSize: 17, lineHeight: '22px', fontWeight: 700 }}>¿Eliminar tu cuenta?</b>
              <span id="del-d" style={{ fontSize: 14, lineHeight: '19px', color: '#36474D' }}>Se borran tus metas, tus aportes y tus decisiones. No se puede deshacer.</span>
              {err && <span role="alert" className="err">{err}</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" className="btn" disabled={busy} onClick={remove} style={{ background: '#963B33', color: '#FFFFFF', minHeight: 50 }}>{busy ? 'Eliminando…' : 'Eliminar cuenta'}</button>
              <button type="button" className="btn" autoFocus disabled={busy} onClick={() => setDel(false)} style={{ background: '#EDEFF0', color: '#11242B', minHeight: 50 }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
