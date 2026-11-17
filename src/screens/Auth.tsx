import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { Screen, useGo, Chevron, Check } from '../ui/nav';
import { EASE, calm } from '../lib/tokens';

const RED = '#963B33';
const mailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

export function AuthHeader({ kicker, h1a, h1b, lead, onBack }: { kicker: string; h1a: string; h1b: string; lead: string; onBack: () => void }) {
  return (
    <header style={{ padding: '58px 20px 24px', borderRadius: '0 0 40px 40px', background: 'radial-gradient(120% 60% at 15% 0%, #FFFFFF 0%, rgba(255,255,255,0) 60%), radial-gradient(90% 55% at 100% 35%, #E4F2F9 0%, rgba(228,242,249,0) 70%), #EDEFF0', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="row" style={{ minHeight: 44 }}>
        <button type="button" className="glass" aria-label="Atrás" onClick={onBack}><Chevron /></button>
        <span className="lbl" style={{ color: '#526166' }}>{kicker}</span>
      </div>
      <h1 style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 400, letterSpacing: '-0.02em' }}>{h1a}<b style={{ fontWeight: 800 }}>{h1b}</b></h1>
      <p style={{ margin: 0, fontSize: 15, lineHeight: '21px', color: '#36474D' }}>{lead}</p>
    </header>
  );
}

export default function Auth({ mode }: { mode: 'registro' | 'login' }) {
  const login = mode === 'login';
  const go = useGo();
  const { reload } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [show, setShow] = useState(false);
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const okRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => { if (ok && okRef.current && !calm()) okRef.current.animate([{ opacity: 0, transform: 'translateY(-8px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 360, easing: EASE.spring }); }, [ok]);

  const nameBad = !login && tried && !name.trim();
  const emailBad = tried && !mailOk(email);
  const passOk = pass.length >= 8;
  const passBad = (tried && !passOk) || wrong;
  const passHint = wrong ? 'La contraseña no coincide con ese email.' : (tried && !passOk ? 'Tiene que tener al menos 8 caracteres.' : (login ? '' : 'Usá al menos 8 caracteres.'));

  const submit = async () => {
    setTried(true); setFormErr(null); setWrong(false);
    if ((!login && !name.trim()) || !mailOk(email) || !passOk) return;
    setLoading(true);
    if (login) {
      const r = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
      setLoading(false);
      if (r.error) {
        if (/invalid login/i.test(r.error.message)) setWrong(true);
        else if (/not confirmed/i.test(r.error.message)) setFormErr('Todavía no confirmaste tu email. Abrí el mail que te mandamos y volvé a intentar.');
        else setFormErr('No pudimos iniciar sesión. Revisá tu conexión y probá de nuevo.');
        return;
      }
      setDone(true);
      await reload();
      setTimeout(() => go('/', 'fade'), 500);
      return;
    }
    const r = await supabase.auth.signUp({ email: email.trim(), password: pass, options: { data: { name: name.trim() } } });
    if (r.error) {
      setLoading(false);
      setFormErr(/already|registered/i.test(r.error.message) ? 'Ya hay una cuenta con ese email. Iniciá sesión.' : (/password/i.test(r.error.message) ? 'Esa contraseña es muy fácil de adivinar. Probá con otra.' : 'No pudimos crear tu cuenta. Probá de nuevo en un rato.'));
      return;
    }
    if (!r.data.session) {
      setLoading(false);
      setOk('Te mandamos un mail para confirmar tu cuenta. Confirmalo y después iniciá sesión.');
      return;
    }
    await supabase.from('mi_profiles').upsert({ user_id: r.data.session.user.id, name: name.trim(), onboarded: false });
    setLoading(false); setDone(true);
    setOk(`Listo, ${name.trim()}. Ahora armemos tu mes.`);
    await reload();
    setTimeout(() => go('/plan', 'push'), 1300);
  };

  const box = (bad: boolean) => ({ borderColor: bad ? RED : undefined, boxShadow: bad ? `0 0 0 1px ${RED}` : undefined });

  return (
    <Screen>
      <div className="scroller">
        <AuthHeader kicker={login ? 'Tu cuenta' : 'Crear cuenta'} h1a={login ? 'Hola de nuevo, ' : 'Guardá tu plan '} h1b={login ? 'iniciá sesión' : 'en tu cuenta'}
          lead={login ? 'Entrá con el email y la contraseña que usaste al registrarte.' : 'Así tus metas y tus decisiones te esperan la próxima vez que abras Make It.'}
          onBack={() => go(login ? '/splash' : '/onboarding/2', 'back')} />
        <form noValidate onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {ok && <p role="status" ref={okRef} style={{ margin: 0, display: 'flex', gap: 10, alignItems: 'center', background: '#E8F4EC', color: '#2F6B45', borderRadius: 20, padding: '12px 16px', fontSize: 15, lineHeight: '20px', fontWeight: 600 }}><span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 999, background: '#2F6B45', display: 'grid', placeItems: 'center', flex: 'none' }}><Check c="#FFFFFF" s={14} /></span><span>{ok}</span></p>}
          {formErr && <p role="alert" style={{ margin: 0, display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FCE9E6', color: RED, borderRadius: 20, padding: '12px 16px', fontSize: 15, lineHeight: '20px' }}><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={RED} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" style={{ flex: 'none', marginTop: 1 }}><circle cx="9" cy="9" r="7.5" /><path d="M9 5v4.5M9 12.5v.01" /></svg><span>{formErr}</span></p>}
          {!login && (
            <div className="field">
              <label htmlFor="au-nom">¿Cómo te llamás?</label>
              <span className={'fbox' + (nameBad ? ' bad' : '')}><input id="au-nom" className="fin" value={name} onChange={(e) => setName(e.target.value)} autoComplete="given-name" placeholder="Tu nombre" aria-invalid={nameBad} aria-describedby="au-nom-e" /></span>
              {nameBad && <span id="au-nom-e" className="err">Escribí tu nombre.</span>}
            </div>
          )}
          <div className="field">
            <label htmlFor="au-mail">Email</label>
            <span className={'fbox' + (emailBad ? ' bad' : '')}><input id="au-mail" className="fin" type="email" inputMode="email" value={email} onChange={(e) => { setEmail(e.target.value); setWrong(false); }} autoComplete="email" placeholder="nombre@correo.com" aria-invalid={emailBad} aria-describedby="au-mail-e" /></span>
            {emailBad && <span id="au-mail-e" className="err">Revisá el email: le falta algo, por ejemplo la @.</span>}
          </div>
          <div className="field">
            <label htmlFor="au-pass">Contraseña</label>
            <span className={'fbox' + (passBad ? ' bad' : '')} style={{ paddingRight: 8, ...box(false) }}>
              <input id="au-pass" className="fin" type={show ? 'text' : 'password'} value={pass} onChange={(e) => { setPass(e.target.value); setWrong(false); }} autoComplete={login ? 'current-password' : 'new-password'} placeholder={login ? 'Tu contraseña' : 'Mínimo 8 caracteres'} aria-invalid={passBad} aria-describedby="au-pass-h" />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={show} style={{ minWidth: 44, height: 44, border: 0, padding: '0 10px', background: 'transparent', borderRadius: 999, font: '600 15px var(--font)', color: '#11242B', cursor: 'pointer' }}>{show ? 'Ocultar' : 'Mostrar'}</button>
            </span>
            {passHint && <span id="au-pass-h" style={{ fontSize: 13, lineHeight: '18px', color: passBad ? RED : '#526166' }}>{passHint}</span>}
          </div>
          {!login && <p style={{ margin: 0, fontSize: 13, lineHeight: '18px', color: '#526166' }}>Make It no se conecta a tu banco ni mueve dinero. Tus metas y simulaciones quedan guardadas en tu cuenta.</p>}
          <button type="submit" className="btn" disabled={loading || done} aria-busy={loading} style={{ marginTop: 4, background: done ? '#2F6B45' : '#11242B', color: '#FFFFFF', transition: 'background-color 240ms ease' }}>
            {done && <Check c="#FFFFFF" s={18} />}
            {loading && <span aria-hidden="true" className="spin" />}
            {done ? (login ? 'Listo' : 'Cuenta creada') : loading ? (login ? 'Entrando…' : 'Creando tu cuenta…') : (login ? 'Iniciar sesión' : 'Crear cuenta')}
          </button>
          <button type="button" className="btn-t" style={{ fontWeight: 400 }} onClick={() => go(login ? '/registro' : '/login', 'fade')}>
            <span>{login ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'} <b style={{ fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>{login ? 'Creá una' : 'Iniciá sesión'}</b></span>
          </button>
        </form>
      </div>
    </Screen>
  );
}
