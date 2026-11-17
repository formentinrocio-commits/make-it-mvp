import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Screen, useGo, Chevron, Lock, Arrow, Check, useStagger } from '../ui/nav';
import { Foot, H1, HEADER_BG, Lvl, MoneyInput, X, arrivalLabel, savingWhere } from '../ui/parts';
import { AIMark } from '../ui/AIMark';
import { GOAL, stripes, EASE, calm } from '../lib/tokens';
import { fmt, fmtMonthShort, addMonths, toDate, MONTHS, capFirst } from '../lib/money';
import { PRIO_LABEL, PRIO_LEVEL, delayLabel, impactFor, suggest, type GoalView, type Impact } from '../lib/model';

/* Borrador de la compra que se está evaluando (vive en la sesión del navegador hasta decidir) */
type Draft = { item: string; emoji: string; amount: number; impacts?: Impact[]; decided?: 'comprar' | 'no' };
const KEY = 'mi-buy';
const readDraft = (): Draft | null => { try { const r = sessionStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const writeDraft = (d: Draft | null) => { try { if (d) sessionStorage.setItem(KEY, JSON.stringify(d)); else sessionStorage.removeItem(KEY); } catch { /* */ } };

const EM: [string, string][] = [['🛍️', 'shein carrito ropa compra shopping'], ['👟', 'zapatillas calzado zapatos'], ['👗', 'vestido ropa'], ['📱', 'celular telefono iphone'], ['🎧', 'auriculares musica'], ['💻', 'compu notebook'], ['🛒', 'super mercado comida'], ['🍽️', 'cena restaurante salida'], ['✈️', 'viaje vuelo pasaje'], ['🎁', 'regalo cumpleanos'], ['🎤', 'entrada recital show'], ['🎫', 'cine teatro entradas'], ['🛋️', 'mueble sillon casa'], ['🎮', 'consola play juego'], ['🚲', 'bici bicicleta']];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const emojiOf = (name: string) => { const n = norm(name); return n.trim() ? (EM.find(([, k]) => k.split(' ').some((w) => w.length >= 3 && n.includes(w))) || [''])[0] : ''; };

const SUB_BG = 'radial-gradient(420px 220px at 60px 0px, #FFFFFF 0%, rgba(255,255,255,0) 70%), #EDEFF0';
const SEC_BG = 'radial-gradient(360px 300px at 390px 80px, #E4F2F9 0%, rgba(228,242,249,0) 70%), #EDEFF0';
const hatch = (c: string, w = 2, p = 6) => `repeating-linear-gradient(150deg, #11242B 0 ${w}px, ${c} ${w}px ${p}px)`;
const shortName = (n: string) => n.replace(/^(Viaje a |Cambiar el |Comprar (el |la |un |una )?)/i, '').replace(/^\w/, (c) => c.toUpperCase());

function PurchaseHead({ d, onBack, backLabel, title }: { d: Draft; onBack?: () => void; backLabel?: string; title?: React.ReactNode }) {
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 4, padding: 'var(--top) 20px 14px', background: SUB_BG, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="row" style={{ minHeight: 44 }}>
        {onBack && <button type="button" className="glass" aria-label={backLabel} onClick={onBack}><Chevron /></button>}
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexGrow: 1, minWidth: 0 }}><span aria-hidden="true" className="badge b40" style={{ background: '#FFFFFF' }}>{d.emoji}</span><span className="num" style={{ fontSize: 17, lineHeight: '22px', fontWeight: 600 }}>{d.item} · {fmt(d.amount)}</span></span>
      </div>
      {title}
    </header>
  );
}

function ProtectedRow({ g, right }: { g: GoalView; right?: React.ReactNode }) {
  return (
    <div className="num row" style={{ background: '#FFFFFF', borderRadius: 24, padding: '10px 18px 10px 10px', fontSize: 14, lineHeight: '19px' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b32" style={{ background: GOAL[g.color].soft }}>{g.emoji}</span><span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}><Lock />{g.name} · {right ? 'protegida' : 'no participa'}</span></span>
      {right || <span style={{ color: '#526166' }}>{fmt(g.thisMonth)}</span>}
    </div>
  );
}

const Timeline = ({ bg, from, to, aria }: { bg: string; from: string; to: string; aria: string }) => (
  <div role="img" aria-label={aria} className="md-tl" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div aria-hidden="true" style={{ position: 'relative', height: 28 }}><div style={{ position: 'absolute', left: 0, top: 7, height: 14, width: '72%', background: '#11242B', borderRadius: '999px 0 0 999px' }} /><div style={{ position: 'absolute', left: '72%', right: 14, top: 7, height: 14, background: 'repeating-linear-gradient(135deg, #11242B 0 2px, transparent 2px 6px)' }} /><div style={{ position: 'absolute', left: '72%', top: 4, width: 20, height: 20, marginLeft: -10, borderRadius: '50%', background: bg, border: '3px solid #11242B' }} /><div style={{ position: 'absolute', right: 0, top: 0, width: 28, height: 28, borderRadius: '50%', background: '#11242B' }} /></div>
    <div aria-hidden="true" className="num" style={{ position: 'relative', height: 18, fontSize: 13, lineHeight: '18px' }}><span style={{ position: 'absolute', left: 0 }}>Hoy · {fmtMonthShort(new Date())}</span><span style={{ position: 'absolute', left: '72%', transform: 'translateX(-100%)', paddingRight: 4, whiteSpace: 'nowrap' }}>{from}</span><b style={{ position: 'absolute', right: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>{to}</b></div>
  </div>
);

/* 08 — ¿Qué querés comprar? */
export function Evaluar() {
  const go = useGo();
  const { freeLeft, goals } = useStore();
  const prev = readDraft();
  const [name, setName] = useState(prev && !prev.decided ? prev.item : '');
  const [amount, setAmount] = useState(prev && !prev.decided ? prev.amount : 0);
  const [pick, setPick] = useState<string | null>(prev && !prev.decided ? prev.emoji : null);
  const [open, setOpen] = useState(false);
  const emoji = pick || emojiOf(name);
  const E = freeLeft, a = amount, over = a > E, diff = Math.max(0, a - E), scale = Math.max(a, E) || 1;
  const ready = a > 0 && name.trim().length > 0;
  const next = () => {
    writeDraft({ item: capFirst(name), emoji: emoji || '🛍️', amount: a });
    go(over ? '/compro/ajuste' : '/compro/entra');
  };
  const list = [emojiOf(name), ...EM.map((x) => x[0])].filter((x, i, arr) => x && arr.indexOf(x) === i);
  return (
    <Screen>
      <div className="scroller">
        <header style={{ position: 'sticky', top: 0, zIndex: 4, padding: 'var(--top) 20px 24px', borderRadius: '0 0 40px 40px', background: HEADER_BG, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="row" style={{ minHeight: 44 }}><button type="button" className="glass" aria-label="Cancelar" onClick={() => { writeDraft(null); go('/inicio', 'back'); }}><X /></button><span className="lbl" style={{ color: '#526166' }}>Evaluar una compra</span></div>
          <H1 a="¿Qué querés " b="comprar?" />
        </header>
        <div style={{ padding: '20px 20px 150px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="field">
            <label htmlFor="c-nom" className="flab">Ponele un nombre</label>
            <span className="fbox" style={{ paddingLeft: 10, gap: 8 }}>
              <button type="button" onClick={() => setOpen(!open)} aria-label={emoji ? `Emoji de la compra: ${emoji}. Tocá para cambiarlo` : 'Agregar un emoji a la compra'} aria-expanded={open} className="badge emoji" style={{ width: 44, height: 44, border: 0, cursor: 'pointer', background: '#EDEFF0', fontSize: 22, boxShadow: open ? 'inset 0 0 0 2px #11242B' : 'none' }}>
                {emoji || <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#526166" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M9 3v12M3 9h12" /></svg>}
              </button>
              <input id="c-nom" className="fin" autoCapitalize="sentences" value={name} onChange={(e) => setName(e.target.value)} placeholder="Por ejemplo, unas zapatillas" autoComplete="off" />
            </span>
            <span className="hint">{pick ? 'Elegiste este emoji. Tocalo para cambiarlo.' : emoji ? 'Emoji sugerido por el nombre. Tocalo para cambiarlo.' : 'Mientras escribís, te sugerimos un emoji.'}</span>
            {open && <div role="radiogroup" aria-label="Emoji" className="card mi-pop" style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>{list.map((e) => <button key={e} type="button" role="radio" aria-checked={e === emoji} aria-label={e} onClick={() => { setPick(e); setOpen(false); }} className="badge emoji" style={{ width: 38, height: 38, fontSize: 22, border: 0, cursor: 'pointer', background: e === emoji ? '#EDEFF0' : 'transparent' }}>{e}</button>)}</div>}
          </div>
          <div className="field"><label htmlFor="c-monto" className="flab">¿Cuánto cuesta?</label><MoneyInput id="c-monto" big value={amount} onChange={setAmount} /></div>
          <section className="card" aria-live="polite" aria-label="Cuánto cubrís con tu ahorro libre">
            {a > 0 ? <>
              <div className="row"><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b32" style={{ background: '#EDEFF0' }}>{emoji || '🛍️'}</span><b className="num" style={{ fontSize: 16, fontWeight: 600 }}>Compra · {fmt(a)}</b></span></div>
              <div role="img" aria-label={`Compra ${fmt(a)}. Ahorro libre ${fmt(E)}. ${over ? `Diferencia a cubrir ${fmt(diff)}.` : `Te quedan ${fmt(E - a)}.`}`} className="bar" style={{ height: 44 }}>
                {Math.min(a, E) > 0 && <div style={{ width: `${(Math.min(a, E) / scale) * 100}%`, background: stripes(), transition: 'width 300ms ease' }} />}
                {over ? <div style={{ flexGrow: 1, background: '#FFFFFF', boxShadow: 'inset 0 0 0 1.5px #11242B' }} /> : a < E && <div style={{ flexGrow: 1, background: stripes(), opacity: 0.55 }} />}
              </div>
              <div className="leg num"><div className="li"><span><span className="sw" style={{ background: 'repeating-linear-gradient(150deg, #11242B 0 1.5px, #FFFFFF 1.5px 4px)' }} />Entra en tu ahorro libre</span><b>{fmt(Math.min(a, E))}</b></div></div>
              <div className="row num" style={{ background: '#EDEFF0', borderRadius: 20, padding: '12px 16px', margin: '2px -6px 0' }}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{over ? <span className="sw" style={{ background: '#FFFFFF', boxShadow: 'inset 0 0 0 1.5px #11242B' }} /> : <span className="sw" style={{ background: 'repeating-linear-gradient(150deg, #11242B 0 1.5px, #FFFFFF 1.5px 4px)', opacity: 0.55 }} />}<b style={{ fontSize: 15, fontWeight: 600 }}>{over ? 'Diferencia a cubrir' : 'Te quedan'}</b></span><b style={{ fontSize: 30, lineHeight: '34px', fontWeight: 800, letterSpacing: '-0.02em' }}>{fmt(over ? diff : E - a)}</b></div>
            </> : <>
              <div className="num row"><b style={{ fontSize: 15, fontWeight: 600 }}>Ahorro libre</b><b style={{ fontSize: 22, fontWeight: 800 }}>{fmt(E)}</b></div>
              <span className="k">Ingresá el precio para ver cuánto cubrís con tu ahorro libre.</span>
            </>}
          </section>
          {!goals.length && <p className="hint" style={{ margin: 0 }}>Todavía no tenés metas: cualquier compra solo usa tu ahorro libre.</p>}
          <p className="hint" style={{ margin: 0 }}>Es una simulación. Nada cambia hasta que confirmes.</p>
        </div>
      </div>
      <Foot>{ready ? <button type="button" className="btn btn-p" onClick={next}>{over ? 'Ver ajuste sugerido' : 'Ver resultado'}</button> : <span className="btn btn-d" aria-disabled="true">Completá qué y cuánto</span>}</Foot>
    </Screen>
  );
}

/* 16 — Entra en el ahorro libre */
export function Entra() {
  const go = useGo();
  const { freeLeft, goals, decide } = useStore();
  const d = readDraft();
  const [busy, setBusy] = useState(false);
  if (!d) return <Navigate to="/compro" replace />;
  const left = Math.max(0, freeLeft - d.amount);
  const near = [...goals].filter((g) => g.priority !== 'protegida' && g.monthly > 0).sort((a, b) => a.arrival.localeCompare(b.arrival))[0];
  const days = near ? Math.round((d.amount / near.monthly) * 30.4) : 0;
  const buy = async (decision: 'comprar' | 'no') => {
    setBusy(true);
    await decide({ item: d.item, emoji: d.emoji, amount: d.amount, decision, from_free: decision === 'comprar' ? d.amount : 0, impacts: [] });
    writeDraft({ ...d, decided: decision, impacts: [] });
    setBusy(false);
    go('/compro/resumen');
  };
  return (
    <Screen>
      <div className="scroller">
        <PurchaseHead d={d} onBack={() => go('/compro', 'back')} backLabel="Volver a editar la compra" />
        <section style={{ padding: '0 20px 24px', borderRadius: '0 0 40px 40px', background: SEC_BG, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 34, lineHeight: '40px', letterSpacing: '-0.02em' }}>Te queda de ahorro libre</span><span className="num count" style={{ fontSize: 66, lineHeight: '68px', fontWeight: 800, letterSpacing: '-0.035em' }}>{fmt(left)}</span></div>
          <span style={{ fontSize: 15, lineHeight: '21px', color: '#36474D' }}>Entra en tu ahorro libre: tus aportes no cambian.</span>
          <div style={{ position: 'relative', paddingTop: 24 }}>
            <div style={{ position: 'absolute', left: 'calc(100% - 2px)', top: 0, bottom: -6, width: 2, background: '#11242B', borderRadius: 2 }} />
            <span className="num" style={{ position: 'absolute', left: 'calc(100% - 2px)', top: 0, transform: 'translateX(-104%)', fontSize: 13, lineHeight: '18px', fontWeight: 600, whiteSpace: 'nowrap', paddingRight: 6 }}>Límite {fmt(freeLeft)}</span>
            <div role="img" aria-label={`Ahorro libre ${fmt(freeLeft)}. ${d.item} ${fmt(d.amount)}. Te quedan ${fmt(left)}. No supera el límite.`} className="bar bar-grow" style={{ height: 52 }}><div style={{ width: `${(d.amount / (freeLeft || 1)) * 100}%`, background: stripes() }} />{left > 0 && <div style={{ flexGrow: 1, background: stripes(), opacity: 0.55 }} />}</div>
          </div>
          <div className="leg num"><div className="li"><span><span className="sw" style={{ background: 'repeating-linear-gradient(150deg, #11242B 0 1.5px, #FFFFFF 1.5px 4px)' }} />Compra dentro de tu ahorro libre</span><b>{fmt(d.amount)}</b></div><div className="li"><span><span className="sw" style={{ background: 'repeating-linear-gradient(150deg, #11242B 0 1.5px, #FFFFFF 1.5px 4px)', opacity: 0.55 }} />Te queda de ahorro libre</span><b>{fmt(left)}</b></div></div>
        </section>
        <div style={{ padding: '16px 20px 200px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {goals.length > 0 && <section className="card" aria-label="Tus metas" style={{ gap: 0, padding: '6px 0' }}>{goals.map((g) => <div key={g.id} className="gr"><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b32" style={{ background: GOAL[g.color].soft }}>{g.emoji}</span><b style={{ fontSize: 16, fontWeight: 600 }}>{g.name}</b></span><span className="num" style={{ textAlign: 'right', fontSize: 15, lineHeight: '20px', whiteSpace: 'nowrap' }}>{g.priority === 'protegida' ? <b style={{ fontWeight: 600 }}>Sin cambios</b> : <><b style={{ fontWeight: 600 }}>{arrivalLabel(g.arrival, g.created_at)}</b><br /><span className="k">Sin cambios</span></>}</span></div>)}</section>}
          {near && days > 0 && <section aria-label="Otra forma de verlo" style={{ background: '#EDEFF0', borderRadius: 24, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}><span className="lbl" style={{ color: '#526166' }}>Otra forma de verlo · solo informativo</span><p className="num" style={{ margin: 0, fontSize: 15, lineHeight: '20px' }}>Si sumaras esos {fmt(d.amount)} a {near.name}, llegarías unos {days < 25 ? `${days} días` : `${Math.round(days / 30.4)} ${Math.round(days / 30.4) === 1 ? 'mes' : 'meses'}`} antes.</p></section>}
        </div>
      </div>
      <Foot>
        <button type="button" className="btn btn-p" disabled={busy} onClick={() => buy('comprar')}>{busy ? 'Guardando…' : 'Lo compro'}</button>
        <button type="button" className="btn btn-s" disabled={busy} onClick={() => buy('no')}>No comprar ahora</button>
      </Foot>
    </Screen>
  );
}

/* 09 — Ajuste sugerido según tus prioridades */
export function Ajuste() {
  const go = useGo();
  const { freeLeft, goals } = useStore();
  const d = readDraft();
  const body = useRef<HTMLDivElement>(null);
  useStagger(body, ':scope > *', 160, 100);
  if (!d) return <Navigate to="/compro" replace />;
  const s = suggest(d.amount, freeLeft, goals);
  const diff = d.amount - s.fromFree;
  const byId = (id: string) => goals.find((g) => g.id === id)!;
  const prot = goals.filter((g) => g.priority === 'protegida');
  const accept = () => { writeDraft({ ...d, impacts: s.impacts }); go('/compro/impacto'); };
  return (
    <Screen>
      <div className="scroller">
        <PurchaseHead d={d} onBack={() => go('/compro', 'back')} backLabel="Volver a la compra" />
        <section style={{ padding: '0 20px 24px', borderRadius: '0 0 40px 40px', background: SEC_BG, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="lbl" style={{ color: '#526166' }}>Ajuste sugerido según tus prioridades</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontSize: 34, lineHeight: '40px', letterSpacing: '-0.02em' }}>Diferencia a cubrir</span><span className="num count" style={{ fontSize: 66, lineHeight: '68px', fontWeight: 800, letterSpacing: '-0.035em' }}>{fmt(diff)}</span></div>
          <span style={{ fontSize: 15, lineHeight: '21px', color: '#36474D' }}>{s.fromFree > 0 ? `Tu ahorro libre cubre ${fmt(s.fromFree)}. ` : ''}Ajustamos primero las metas menos prioritarias y preservamos las más importantes todo lo posible.</span>
          {s.impacts.length > 0 && <>
            <div role="img" aria-label={`Ajuste sugerido de ${fmt(diff)}: ${s.impacts.map((i) => `${i.name} ${fmt(i.taken)}`).join(', ')}${s.uncovered ? `, falta cubrir ${fmt(s.uncovered)}` : ''}.`} className="bar bar-grow" style={{ height: 52 }}>
              {s.impacts.map((i, k) => <div key={i.goal_id} style={{ background: hatch(GOAL[i.color].bg), ...(k === s.impacts.length - 1 && !s.uncovered ? { flexGrow: 1 } : { width: `${(i.taken / diff) * 100}%` }) }} />)}
              {s.uncovered > 0 && <div style={{ flexGrow: 1, background: '#FFFFFF', boxShadow: 'inset 0 0 0 1.5px #11242B' }} />}
            </div>
            <div className="leg num">{s.impacts.map((i) => <div key={i.goal_id} className="li"><span><span className="sw" style={{ background: hatch(GOAL[i.color].bg, 1.5, 4) }} />Sale de {i.name}</span><b>{fmt(i.taken)}</b></div>)}{s.uncovered > 0 && <div className="li"><span><span className="sw" style={{ background: '#FFFFFF', boxShadow: 'inset 0 0 0 1.5px #11242B' }} />Falta cubrir</span><b>{fmt(s.uncovered)}</b></div>}</div>
          </>}
        </section>
        <div ref={body} style={{ padding: '16px 20px 190px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {s.impacts.map((im, k) => { const g = byId(im.goal_id), after = g.thisMonth - im.taken, keepPct = g.thisMonth ? (after / g.thisMonth) * 100 : 0; return (
            <article key={im.goal_id} style={{ background: GOAL[g.color].bg, borderRadius: 32, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="row"><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b32" style={{ background: GOAL[g.color].soft }}>{g.emoji}</span><span className="lbl" style={{ color: '#11242B' }}>{k + 1} · {g.name}</span></span><span className="prio"><Lvl p={g.priority} />{PRIO_LABEL[g.priority]}</span></div>
              <div className="row" style={{ alignItems: 'baseline' }}><span className="num" style={{ fontSize: 22, lineHeight: '27px', fontWeight: 700, letterSpacing: '-0.01em' }}>Este mes aportás {fmt(after)}</span><b className="num" style={{ fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>−{fmt(im.taken)}</b></div>
              <div role="img" aria-label={`Este mes el aporte pasa de ${fmt(g.thisMonth)} a ${fmt(after)}. Se ajusta el ${Math.round(100 - keepPct)}%.`} style={{ display: 'flex', gap: 3, height: 12 }}>{after > 0 && <div style={{ borderRadius: 999, width: `${keepPct}%`, background: '#11242B' }} />}<div style={{ borderRadius: 999, flexGrow: 1, background: 'repeating-linear-gradient(150deg, #11242B 0 2px, rgba(17,36,43,0) 2px 6px)', boxShadow: 'inset 0 0 0 1.5px #11242B' }} /></div>
              <p className="num" style={{ margin: 0, fontSize: 13, lineHeight: '18px' }}>Aporte previsto {fmt(g.thisMonth)} → {fmt(after)} este mes. Se ajusta el {Math.round(100 - keepPct)}%.</p>
            </article>
          ); })}
          {prot.map((g) => <ProtectedRow key={g.id} g={g} />)}
          {s.uncovered > 0 && <p role="alert" style={{ margin: 0, background: '#FCE9E6', color: '#963B33', borderRadius: 20, padding: '12px 16px', fontSize: 15, lineHeight: '20px' }}><b style={{ fontWeight: 600 }}>Este mes no alcanza.</b> Aun ajustando todas las metas que pueden participar, faltan {fmt(s.uncovered)}.</p>}
          <p className="hint" style={{ margin: 0 }}>Tramo lleno: aporte que se mantiene. Tramo rayado: ajuste sugerido. Es una propuesta; nada cambia hasta que confirmes.</p>
        </div>
      </div>
      <Foot>
        {s.uncovered > 0 ? <button type="button" className="btn btn-p" onClick={() => { writeDraft({ ...d, impacts: [] }); go('/compro/impacto?no=1'); }}>Ver qué pasa si no lo compro</button> : <button type="button" className="btn btn-p" onClick={accept}>Aceptar ajuste sugerido</button>}
        {s.impacts.length > 0 && <button type="button" className="btn btn-s" onClick={() => go('/compro/explorar')}>Explorar otros ajustes</button>}
      </Foot>
    </Screen>
  );
}

/* 10 — Explorar otros ajustes */
export function Explorar() {
  const go = useGo();
  const { freeLeft, goals } = useStore();
  const d = readDraft();
  const parts = useMemo(() => goals.filter((g) => g.priority !== 'protegida' && g.thisMonth > 0).sort((a, b) => PRIO_LEVEL[a.priority] - PRIO_LEVEL[b.priority]), [goals]);
  const sug = d ? suggest(d.amount, freeLeft, goals) : null;
  const init = () => { const m: Record<string, number> = {}; (d?.impacts?.length ? d.impacts : sug?.impacts || []).forEach((i) => { m[i.goal_id] = i.taken; }); return m; };
  const [val, setVal] = useState<Record<string, number>>(init);
  const [on, setOn] = useState<Record<string, boolean>>(() => Object.fromEntries(parts.map((g) => [g.id, (init()[g.id] || 0) > 0])));
  if (!d || !sug) return <Navigate to="/compro" replace />;
  const T = d.amount - sug.fromFree;
  const eff = (g: GoalView) => (on[g.id] ? Math.min(val[g.id] || 0, g.thisMonth) : 0);
  const adj = parts.reduce((s, g) => s + eff(g), 0), rest = T - adj, scale = Math.max(T, adj) || 1, ok = rest === 0;
  const set = (g: GoalView, v: number) => setVal({ ...val, [g.id]: Math.max(0, Math.min(g.thisMonth, Math.round(v / 1000) * 1000)) });
  const use = () => { writeDraft({ ...d, impacts: parts.filter((g) => eff(g) > 0).map((g) => impactFor(g, eff(g))) }); go('/compro/impacto'); };
  return (
    <Screen>
      <div className="scroller">
        <header style={{ position: 'sticky', top: 0, zIndex: 4, padding: 'var(--top) 20px 14px', background: SUB_BG, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="row" style={{ minHeight: 44 }}><button type="button" className="glass" aria-label="Volver al ajuste sugerido" onClick={() => go('/compro/ajuste', 'back')}><Chevron /></button><span className="lbl" style={{ color: '#526166' }}>Otros ajustes</span></div>
        </header>
        <section style={{ padding: '0 20px 24px', borderRadius: '0 0 40px 40px', background: SEC_BG, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="num" aria-live="polite" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span className="k">Diferencia</span><b style={{ fontSize: 22, lineHeight: '28px', fontWeight: 800 }}>{fmt(T)}</b></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span className="k">Ajustado</span><b style={{ fontSize: 22, lineHeight: '28px', fontWeight: 800 }}>{fmt(adj)}</b></span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span className="k" style={{ color: '#11242B', fontWeight: 600 }}>{rest >= 0 ? 'Falta cubrir' : 'Te pasaste'}</span><b style={{ fontSize: 22, lineHeight: '28px', fontWeight: 800 }}>{fmt(Math.abs(rest))}</b></span>
          </div>
          <div role="img" aria-label={`De ${fmt(T)}: ${parts.map((g) => `${g.name} ${fmt(eff(g))}`).join(', ')}${rest > 0 ? `, falta cubrir ${fmt(rest)}` : ''}.`} className="bar" style={{ height: 44 }}>
            {parts.filter((g) => eff(g) > 0).map((g) => <div key={g.id} style={{ width: `${(eff(g) / scale) * 100}%`, background: hatch(GOAL[g.color].bg), transition: 'width 200ms ease' }} />)}
            {rest > 0 && <div style={{ flexGrow: 1, background: '#11242B' }} />}
          </div>
          <div className="leg num">{parts.map((g) => <div key={g.id} className="li"><span><span className="sw" style={{ background: hatch(GOAL[g.color].bg, 1.5, 4) }} />Sale de {g.name}</span><b>{fmt(eff(g))}</b></div>)}{rest > 0 && <div className="li"><span><span className="sw" style={{ background: '#11242B' }} />Falta cubrir</span><b>{fmt(rest)}</b></div>}</div>
        </section>
        <div style={{ padding: '16px 20px 190px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ margin: 0, padding: '0 4px', fontSize: 15, lineHeight: '20px', color: '#36474D' }}>Elegí qué metas participan y cuánto reducir su aporte este mes.</p>
          {parts.map((g) => { const isOn = !!on[g.id], v = eff(g), im = impactFor(g, v); return (
            <article key={g.id} style={{ background: isOn ? GOAL[g.color].bg : '#FFFFFF', borderRadius: 32, padding: '6px 22px', display: 'flex', flexDirection: 'column', transition: 'background-color 200ms ease' }}>
              <button type="button" className="sel" role="checkbox" aria-checked={isOn} onClick={() => setOn({ ...on, [g.id]: !isOn })}>
                <span aria-hidden="true" className="badge b40" style={{ background: isOn ? GOAL[g.color].soft : '#EDEFF0' }}>{g.emoji}</span>
                <span style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><b style={{ fontSize: 17, fontWeight: 700 }}>{g.name}</b><span className="prio"><Lvl p={g.priority} />{PRIO_LABEL[g.priority]}</span></span><span className="num" style={{ fontSize: 13, lineHeight: '18px' }}>Aporte de este mes {fmt(g.thisMonth)}</span></span>
                {isOn ? <span style={{ width: 26, height: 26, borderRadius: 999, background: '#11242B', display: 'grid', placeItems: 'center', flex: 'none' }}><Check c="#FFFFFF" /></span> : <span style={{ width: 26, height: 26, borderRadius: 999, border: '2px solid #899397', flex: 'none' }} />}
              </button>
              {isOn && <div className="mi-pop" style={{ padding: '4px 0 16px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid rgba(17,36,43,0.15)' }}>
                <div className="row" style={{ paddingTop: 12 }}><label htmlFor={`${g.id}-n`} style={{ fontSize: 15, fontWeight: 600 }}>Reducir aporte este mes</label><span className="nbox"><span style={{ fontSize: 17, fontWeight: 600, color: '#526166' }}>$</span><input id={`${g.id}-n`} className="nin" inputMode="numeric" value={v.toLocaleString('es-AR')} onChange={(e) => { const x = e.target.value.replace(/\D/g, ''); setVal({ ...val, [g.id]: Math.min(g.thisMonth, x ? parseInt(x, 10) : 0) }); }} /></span></div>
                <input type="range" className="rng" min={0} max={g.thisMonth} step={1000} value={v} onChange={(e) => set(g, parseInt(e.target.value, 10) || 0)} style={{ ['--p' as string]: `${(v / g.thisMonth) * 100}%` }} aria-label={`Reducir aporte de ${g.name} este mes`} aria-valuetext={`${fmt(v)} de ${fmt(g.thisMonth)}`} />
                <div className="num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, lineHeight: '18px' }}><span>$0</span><span>{fmt(g.thisMonth)}</span></div>
                <div className="num row" style={{ paddingTop: 4, fontSize: 14, lineHeight: '19px' }}><span>Este mes aportás <b style={{ fontWeight: 600 }}>{fmt(g.thisMonth - v)}</b></span>{v > 0 ? <span className="delta"><Arrow />{delayLabel(im.delay_days)}</span> : <span className="prio"><Check />Sin cambios</span>}</div>
                <div className="num row" style={{ alignItems: 'baseline', fontSize: 14, lineHeight: '19px' }}><span>Llegada</span><b style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{v > 0 && <span style={{ fontWeight: 400 }}>{arrivalLabel(im.from_date, g.created_at)} → </span>}{arrivalLabel(im.to_date, g.created_at)}</b></div>
              </div>}
            </article>
          ); })}
          {goals.filter((g) => g.priority === 'protegida').map((g) => <ProtectedRow key={g.id} g={g} right={<span style={{ color: '#526166', whiteSpace: 'nowrap' }}>No participa</span>} />)}
        </div>
      </div>
      <Foot gap={4}>
        {ok ? <button type="button" className="btn btn-p" onClick={use}>Usar este ajuste</button> : <span className="btn btn-d num" aria-disabled="true">{rest > 0 ? `Falta cubrir ${fmt(rest)}` : `Ajustaste ${fmt(-rest)} de más`}</span>}
        <button type="button" className="btn-t" onClick={() => go('/compro/ajuste', 'back')}>Volver al ajuste sugerido</button>
      </Foot>
    </Screen>
  );
}

/* Respuestas de la IA: guionadas a partir de los números reales del usuario (no hay modelo detrás) */
function useAnswers(d: Draft, impacts: Impact[]) {
  const { freeLeft, freePlanned, profile, goals } = useStore();
  const total = profile?.monthly_saving || 0;
  const fromFree = Math.min(d.amount, freeLeft);
  const diff = d.amount - fromFree;
  const waitM = diff > 0 && freePlanned > 0 ? Math.ceil(diff / freePlanned) : 0;
  const waitWhen = waitM ? fmtMonthShort(addMonths(new Date(), waitM)) : '';
  const prot = goals.filter((g) => g.priority === 'protegida');
  const protTxt = prot.length ? ` sin tocar ${prot.map((g) => g.name).join(' ni ')}` : '';
  const mv = impacts.map((i) => { const sameMonth = toDate(i.from_date).getMonth() === toDate(i.to_date).getMonth(); return `${i.name} se corre ${delayLabel(i.delay_days).replace('+', '')}${sameMonth ? ` y sigue en ${MONTHS[toDate(i.to_date).getMonth()]}` : ''}`; });
  const join = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);
  const half = Math.round(d.amount / 2 / 1000) * 1000;
  const hs = suggest(half, freeLeft, goals);
  const first = impacts[0], fg = first && goals.find((g) => g.id === first.goal_id);
  const A: Record<string, { q: string; a: string }> = {
    intro: { q: '', a: impacts.length ? `Podés comprarlo ahora${protTxt}: ${join(mv)}.${waitM ? ` Si preferís que ninguna meta se mueva, esperar a ${waitWhen} también funciona.` : ''} Las dos opciones son válidas; depende de cuánto te importa tenerlo ahora.` : `No te alcanza este mes sin pasarte de lo que tus metas pueden ceder.${waitM ? ` Si esperás a ${waitWhen}, el ahorro libre cubre la diferencia sin mover ninguna meta.` : ''}` },
    esperar: { q: '¿Qué gano si espero?', a: waitM ? `Si esperás, tus metas quedan como están y en ${waitWhen} el ahorro libre ya cubre los ${fmt(diff)}. El costo es no tener la compra durante ${waitM} ${waitM === 1 ? 'mes' : 'meses'}.` : 'Hoy no te queda ahorro libre por mes, así que esperar no cubre la diferencia por sí solo: haría falta bajar algún aporte.' },
    mitad: { q: '¿Y si compro la mitad?', a: hs.impacts.length === 0 && hs.uncovered === 0 ? `Una compra de ${fmt(half)} entra en tu ahorro libre: ninguna meta se mueve.` : `Una compra de ${fmt(half)} necesita ${fmt(half - hs.fromFree)} más que tu ahorro libre. ${hs.impacts.map((i) => `${i.name} se movería ${delayLabel(i.delay_days).replace('+', '')}`).join(' y ')}.` },
    ...(first && fg ? { meta: { q: `¿Cómo afecta a ${shortName(fg.name)}?`, a: `Este mes aportás ${fmt(fg.thisMonth - first.taken)} en lugar de ${fmt(fg.thisMonth)} a ${fg.name}. Llegás ${arrivalLabel(first.to_date, fg.created_at)} en vez de ${arrivalLabel(first.from_date, fg.created_at)}.` } } : {}),
  };
  const numbers = [
    { t: <>{d.item} es el <b style={{ fontWeight: 700 }}>{total ? Math.round((d.amount / total) * 100) : 0}%</b> de tu ahorro del mes.</>, v: `${fmt(d.amount)} de ${fmt(total)}` },
    { t: fromFree > 0 ? `Tu ahorro libre cubre una parte. El resto sale de ${impacts.length === 1 ? 'una meta' : `${impacts.length} metas`}.` : `No te queda ahorro libre: todo sale de ${impacts.length === 1 ? 'una meta' : 'tus metas'}.`, v: `−${fmt(diff)}` },
    ...(impacts.length ? [{ t: `${join(impacts.map((i) => `${shortName(i.name)} pasa a ${arrivalLabel(i.to_date)}`))}.${prot.length ? ` ${prot.map((g) => g.name).join(' y ')} no cambia.` : ''}`, v: impacts.map((i) => delayLabel(i.delay_days)).join(' · ') }] : []),
    ...(waitM ? [{ t: `Si esperás ${waitM} ${waitM === 1 ? 'mes' : 'meses'}, el ahorro libre (${fmt(freePlanned)} por mes) cubre la diferencia sin mover metas.`, v: waitWhen }] : []),
  ];
  return { A, numbers };
}

/* 11 — Si elegís este ajuste… (+ hoja To make it or not to make it) */
export function Impacto() {
  const go = useGo();
  const { goals, decide } = useStore();
  const d = readDraft();
  const noBuy = typeof location !== 'undefined' && location.hash.includes('no=1');
  const [picked, setPicked] = useState<'comprar' | 'no' | null>(null);
  const [sheet, setSheet] = useState(false);
  const [ai, setAi] = useState<'idle' | 'loading' | 'done'>('idle');
  const [q, setQ] = useState('intro');
  const [busy, setBusy] = useState(false);
  const t = useRef<number | undefined>(undefined);
  const body = useRef<HTMLDivElement>(null);
  useStagger(body, ':scope > *', 160, 90);
  useEffect(() => () => clearTimeout(t.current), []);
  const impacts = d?.impacts || [];
  const { A, numbers } = useAnswers(d || { item: '', emoji: '', amount: 0 }, impacts);
  if (!d) return <Navigate to="/compro" replace />;
  const ask = (k: string) => { clearTimeout(t.current); setQ(k); setAi('loading'); t.current = window.setTimeout(() => setAi('done'), 1650); };
  const cur = A[q] || A.intro;
  const fromFree = d.amount - impacts.reduce((s, i) => s + i.taken, 0);
  const prot = goals.filter((g) => g.priority === 'protegida');
  const untouched = goals.filter((g) => g.priority !== 'protegida' && !impacts.some((i) => i.goal_id === g.id));
  const opts = [
    ...(!noBuy && impacts.length ? [{ id: 'comprar' as const, title: 'Comprar con este ajuste', detail: impacts.map((i) => `${shortName(i.name)} llega ${arrivalLabel(i.to_date)}`).join(' · ') }] : []),
    { id: 'no' as const, title: 'No comprar ahora', detail: 'Tu plan sigue igual' },
  ];
  const confirm = async () => {
    if (!picked) return;
    setBusy(true);
    await decide({ item: d.item, emoji: d.emoji, amount: d.amount, decision: picked, from_free: picked === 'comprar' ? fromFree : 0, impacts: picked === 'comprar' ? impacts : [] });
    writeDraft({ ...d, decided: picked });
    setBusy(false);
    go('/compro/resumen');
  };
  return (
    <Screen>
      <div className="scroller">
        <PurchaseHead d={d} onBack={() => go('/compro/ajuste', 'back')} backLabel="Volver al ajuste sugerido" title={<H1 a="Si elegís " b={noBuy ? 'esperar…' : 'este ajuste…'} />} />
        <section style={{ padding: '0 20px 24px', borderRadius: '0 0 40px 40px', background: SEC_BG }}><span style={{ fontSize: 15, lineHeight: '21px', color: '#36474D' }}>Así cambiarían tus metas. Son estimaciones.</span></section>
        <div ref={body} style={{ padding: '16px 20px 170px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {impacts.map((im) => { const g = goals.find((x) => x.id === im.goal_id); if (!g) return null; const from = arrivalLabel(im.from_date, g.created_at), to = arrivalLabel(im.to_date, g.created_at); return (
            <article key={im.goal_id} style={{ background: GOAL[g.color].bg, borderRadius: 32, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="row"><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b32" style={{ background: GOAL[g.color].soft }}>{g.emoji}</span><span className="lbl" style={{ color: '#11242B' }}>{g.name} · {PRIO_LABEL[g.priority].toLowerCase()}</span></span><span className="delta"><Arrow />{delayLabel(im.delay_days)}</span></div>
              <span className="num" style={{ fontSize: 22, lineHeight: '27px', fontWeight: 700, letterSpacing: '-0.01em' }}>Tu meta se mueve del {from.replace(/ \d{4}$/, '')} al {to.replace(/ \d{4}$/, '')}</span>
              <Timeline bg={GOAL[g.color].bg} from={from} to={to} aria={`Línea de tiempo: la fecha pasaría de ${from} a ${to}, ${delayLabel(im.delay_days).replace('+', '')} más.`} />
              <p className="num" style={{ margin: 0, fontSize: 13, lineHeight: '18px' }}>Este mes aportás {fmt(g.thisMonth - im.taken)} en lugar de {fmt(g.thisMonth)} (−{fmt(im.taken)}).</p>
            </article>
          ); })}
          {untouched.map((g) => <div key={g.id} className="num row" style={{ background: '#FFFFFF', borderRadius: 24, padding: '10px 18px 10px 10px', fontSize: 14, lineHeight: '19px' }}><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b32" style={{ background: GOAL[g.color].soft }}>{g.emoji}</span><span>{g.name}</span></span><span className="prio" style={{ background: '#EDEFF0' }}><Check />Sin cambios</span></div>)}
          {prot.map((g) => <ProtectedRow key={g.id} g={g} right={<span className="prio" style={{ background: '#EDEFF0' }}><Check />Sin cambios</span>} />)}
          <button type="button" onClick={() => { setSheet(true); if (ai === 'idle') ask('intro'); }} aria-haspopup="dialog" style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 64, padding: '10px 18px 10px 12px', border: 0, borderRadius: 24, background: '#FFFFFF', boxShadow: 'inset 0 0 0 1.5px #11242B', color: '#11242B', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
            <AIMark size={40} mode="once" />
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}><b style={{ fontSize: 16, lineHeight: '21px', fontWeight: 600 }}>To make it or not to make it</b><span className="hint">Nuestra IA te ayuda a decidir</span></span>
            <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="#11242B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 1.5L6.5 7l-5 5.5" /></svg>
          </button>
          <span style={{ fontSize: 17, lineHeight: '22px', fontWeight: 600, padding: '10px 4px 0' }}>¿Qué querés hacer?</span>
          <div role="radiogroup" aria-label="Qué hacés con esta compra" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {opts.map((o) => <button key={o.id} type="button" className="opt" role="radio" aria-checked={picked === o.id} onClick={() => setPicked(o.id)}><span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 16, lineHeight: '21px', fontWeight: 600 }}>{o.title}</span><span className="hint">{o.detail}</span></span><span className="dot" /></button>)}
          </div>
        </div>
      </div>
      <Foot gap={4}>
        {picked ? <button type="button" className="btn btn-p" disabled={busy} onClick={confirm}>{busy ? 'Guardando…' : 'Confirmar'}</button> : <span className="btn btn-d" aria-disabled="true">Elegí qué hacer</span>}
        {impacts.length > 0 && <button type="button" className="btn-t" onClick={() => go('/compro/explorar', 'back')}>Modificar ajuste</button>}
      </Foot>
      {sheet && <>
        <div className="mi-dim" onClick={() => setSheet(false)} aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 8, background: 'rgba(17,36,43,0.28)' }} />
        <div className="mi-sheet" role="dialog" aria-modal="true" aria-labelledby="pd-t" style={{ position: 'absolute', left: 0, right: 0, top: 62, bottom: 0, zIndex: 9, borderRadius: '38px 38px 0 0', background: '#F5F5F5', boxShadow: '0 -10px 40px rgba(17,36,43,0.18)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div aria-hidden="true" style={{ width: 36, height: 5, borderRadius: 999, background: 'rgba(17,36,43,0.22)', margin: '8px auto 0', flex: 'none' }} />
          <div className="row" style={{ padding: '8px 16px 6px 20px', flex: 'none' }}><h2 id="pd-t" style={{ margin: 0, fontSize: 22, lineHeight: '28px', fontWeight: 700, letterSpacing: '-0.01em' }}>To make it or not to make it</h2><button type="button" className="glass" onClick={() => setSheet(false)} aria-label="Cerrar"><X /></button></div>
          <div className="scroller" style={{ position: 'relative', flex: 1, padding: '8px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <section aria-label="Con tus números" style={{ background: '#FFFFFF', borderRadius: 32, padding: '18px 22px 8px', display: 'flex', flexDirection: 'column', flex: 'none' }}>
              <span className="lbl" style={{ paddingBottom: 6 }}>Con tus números</span>
              {numbers.map((n, i) => <div key={i} className="num" style={{ display: 'flex', gap: 12, padding: '12px 0', borderTop: '1px solid rgba(17,36,43,0.15)', fontSize: 15, lineHeight: '20px' }}><span style={{ flex: 1 }}>{n.t}</span><b style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{n.v}</b></div>)}
            </section>
            <section aria-label="Make It IA" aria-live="polite" style={{ background: '#FFFFFF', borderRadius: 32, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 12, flex: 'none' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><AIMark size={32} mode={ai === 'loading' ? 'loop' : 'still'} /><span className="lbl">Make It IA</span></span>
              {cur.q && <span className="mi-pop" style={{ alignSelf: 'flex-end', maxWidth: '80%', background: '#11242B', color: '#FFFFFF', borderRadius: '20px 20px 6px 20px', padding: '10px 14px', fontSize: 15, lineHeight: '20px' }}>{cur.q}</span>}
              {ai === 'loading' && <span style={{ fontSize: 15, lineHeight: '20px', color: '#526166' }}>Pensando con tus números…</span>}
              {ai === 'done' && <AiText key={q} text={cur.a} />}
              {ai === 'done' && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{Object.keys(A).filter((k) => k !== 'intro' && k !== q).map((k) => <button key={k} type="button" onClick={() => ask(k)} style={{ minHeight: 44, padding: '0 16px', border: 0, borderRadius: 999, background: '#EDEFF0', color: '#11242B', font: '600 15px/20px var(--font)', cursor: 'pointer' }}>{A[k].q}</button>)}</div>}
              <span className="hint">Respuesta generada a partir de tus metas. La decisión es tuya.</span>
            </section>
          </div>
        </div>
      </>}
    </Screen>
  );
}

/* La respuesta aparece palabra por palabra */
function AiText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el || calm()) return;
    Array.from(el.children).forEach((w, i) => (w as HTMLElement).animate([{ opacity: 0, filter: 'blur(4px)' }, { opacity: 1, filter: 'none' }], { duration: 360, delay: i * 28, easing: EASE.out, fill: 'backwards' }));
  }, [text]);
  return <p ref={ref} style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 18, lineHeight: '26px', letterSpacing: '-0.005em' }}>{text.split(' ').map((w, i) => <span key={i}>{w} </span>)}</p>;
}

/* 13A / 13C — Resumen de la decisión */
export function Resumen() {
  const go = useGo();
  const { goals, profile, monthDecisions, spent, freeLeft, freePlanned } = useStore();
  const d = readDraft();
  const body = useRef<HTMLDivElement>(null);
  useStagger(body, ':scope > *', 160, 100);
  if (!d || !d.decided) return <Navigate to="/inicio" replace />;
  const bought = d.decided === 'comprar';
  const impacts = d.impacts || [];
  const total = profile?.monthly_saving || 0;
  const saving = Math.max(0, total - spent);
  const parts = [...goals.map((g) => ({ k: g.id, bg: GOAL[g.color].bg, v: g.thisMonth })), { k: 'free', bg: stripes(), v: freeLeft }].filter((p) => p.v > 0);
  const base = parts.reduce((s, p) => s + p.v, 0) || 1;
  const where = savingWhere(goals, freeLeft);
  const done = () => { writeDraft(null); go('/inicio', 'fade'); };
  return (
    <Screen>
      <div className="scroller">
        <header style={{ position: 'sticky', top: 0, zIndex: 4, padding: 'var(--top) 20px 14px', background: SUB_BG, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="row" style={{ minHeight: 44 }}><span className="lbl" style={{ color: '#526166' }}>Tu decisión</span></div>
          <H1 a="Plan " b={bought ? 'actualizado' : 'sin cambios'} />
        </header>
        <section style={{ padding: '0 20px 24px', borderRadius: '0 0 40px 40px', background: SEC_BG, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b40" style={{ background: '#FFFFFF' }}>{d.emoji}</span><span className="num" style={{ fontSize: 17, lineHeight: '22px', fontWeight: 600, textDecoration: bought ? 'none' : 'line-through', textDecorationThickness: 1.5 }}>{d.item} · {fmt(d.amount)}</span></span>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 4 }}>
            <span style={{ fontSize: 22, lineHeight: '28px' }}>Este mes ahorrás <b className="num" style={{ fontWeight: 800 }}>{fmt(saving)}</b>{where.to ? ` ${where.to}` : ''}.</span>
            {bought ? <span className="num" style={{ fontSize: 15, lineHeight: '20px', color: '#36474D', marginTop: 4 }}>{where.off ? `${where.off} ` : ''}Tenías previsto {fmt(total)}; {fmt(d.amount)} fueron a {d.item}.</span> : <span style={{ fontSize: 15, lineHeight: '20px', color: '#36474D' }}>Decidiste no comprarlo ahora. Tus aportes siguen como estaban.</span>}
          </div>
          <div role="img" aria-label={`Ahorrado este mes, ${fmt(saving)}.`} className="bar bar-grow" style={{ height: 44 }}>{parts.map((p, i) => <div key={p.k} style={{ background: p.bg, ...(i === parts.length - 1 ? { flexGrow: 1 } : { width: `${((p.v / base) * 100).toFixed(1)}%` }) }} />)}</div>
          <div className="leg num">
            <span className="lbl" style={{ color: '#526166', paddingTop: 4 }}>Ahorrado este mes</span>
            {goals.map((g) => <div key={g.id} className="li"><span><span className="sw" style={{ background: GOAL[g.color].bg }} />{g.name}{g.thisMonth !== g.monthly && <span style={{ color: '#526166' }}> (previsto {fmt(g.monthly)})</span>}</span><b>{fmt(g.thisMonth)}</b></div>)}
            <div className="li"><span><span className="sw" style={{ background: 'repeating-linear-gradient(150deg, #11242B 0 1.5px, #FFFFFF 1.5px 4px)' }} />Ahorro libre{freeLeft !== freePlanned && <span style={{ color: '#526166' }}> (previsto {fmt(freePlanned)})</span>}</span><b>{fmt(freeLeft)}</b></div>
            {monthDecisions.length > 0 && <><span className="lbl" style={{ color: '#526166', paddingTop: 4 }}>Gastado</span>{monthDecisions.map((x) => <div key={x.id} className="li"><span>{x.item}</span><b>{fmt(x.amount)}</b></div>)}</>}
          </div>
        </section>
        <div ref={body} style={{ padding: '16px 20px 130px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {goals.length > 0 && <section className="card" aria-label="Tus metas" style={{ gap: 0, padding: '6px 0' }}>{goals.map((g) => { const im = bought ? impacts.find((i) => i.goal_id === g.id) : undefined; return (
            <div key={g.id} className="gr"><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b32" style={{ background: GOAL[g.color].soft }}>{g.emoji}</span><b style={{ fontSize: 16, fontWeight: 600 }}>{g.name}</b></span>
              {im ? <span className="num" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, fontSize: 15, lineHeight: '20px', whiteSpace: 'nowrap' }}><b style={{ fontWeight: 600 }}>{arrivalLabel(g.arrival, g.created_at)}</b><span className="delta"><Arrow />{delayLabel(im.delay_days)}</span></span> : <span className="prio" style={{ background: '#EDEFF0' }}><Check />Sin cambios</span>}
            </div>
          ); })}</section>}
          <p style={{ margin: 0, display: 'flex', gap: 10, alignItems: 'flex-start', background: '#EDEFF0', borderRadius: 24, padding: '14px 16px', fontSize: 15, lineHeight: '20px', color: '#36474D' }}><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#36474D" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }}><circle cx="8" cy="8" r="6.5" /><path d="M8 7.2v4M8 4.8v.1" /></svg><span>{bought ? (impacts.length ? 'Confirmaste este ajuste: ya es parte de tu plan y quedó en la actividad de cada meta.' : 'La compra salió de tu ahorro libre: tus metas no cambian.') : 'Guardamos esta evaluación. Si cambiás de idea, podés evaluarla de nuevo cuando quieras.'} Make It no paga ni mueve dinero.</span></p>
        </div>
      </div>
      <Foot><button type="button" className="btn btn-p" onClick={done}>Volver al inicio</button></Foot>
    </Screen>
  );
}
