import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Screen, useGo, useBack, useSwipeBack, Check, Lock, setDir } from '../ui/nav';
import { Foot, H1, Header, Lvl, MoneyInput, X } from '../ui/parts';
import DatePicker from '../ui/DatePicker';
import { GOAL, COLOR_ORDER, type GoalColor } from '../lib/tokens';
import { fmt, iso, toDate, capFirst } from '../lib/money';
import { emojiFor, PRIO_LABEL, type Priority } from '../lib/model';

const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const pad = (n: number) => String(n).padStart(2, '0');
const EMOJIS = ['✈️', '🏖️', '🗺️', '🏔️', '🏕️', '🚲', '🏠', '🔑', '🛋️', '🪴', '🎓', '💻', '📱', '🎧', '🐶', '🍼', '💍', '🎁', '🏋️', '🛟', '🚗', '🎮', '📺', '🎯'];
const PR: { id: Priority; copy: string; more: string }[] = [
  { id: 'protegida', copy: 'Quiero preservar este aporte todos los meses.', more: 'Make It no lo reduce al explorar una compra, salvo que vos decidas cambiarlo.' },
  { id: 'alta', copy: 'Prefiero preservarla frente a metas menos prioritarias.', more: 'Es una de tus metas principales.' },
  { id: 'media', copy: 'Puedo ajustar el aporte algunos meses.', more: 'Querés seguir avanzando, pero tenés cierta flexibilidad.' },
  { id: 'baja', copy: 'Puedo reducirla o pausarla antes que otras metas.', more: 'Es una meta que hoy tiene menor prioridad.' },
];

/* Nueva meta en 5 pasos (nombre, monto y fecha → ahorrado → prioridad → aporte → plan) o edición en una sola pantalla */
export default function NuevaMeta({ edit }: { edit?: boolean }) {
  const go = useGo();
  const back = useBack();
  const { id } = useParams();
  const { goals, freePlanned, createGoal, updateGoal } = useStore();
  const g0 = edit ? goals.find((g) => g.id === id) : undefined;
  const now = new Date(); const TI = now.getFullYear() * 12 + now.getMonth(), TD = now.getDate();
  const todayLbl = `${TD} ${MES[now.getMonth()]}`;

  const [step, setStep] = useState(1);
  const [name, setName] = useState(g0?.name || '');
  const [pick, setPick] = useState<string | null>(g0?.emoji || null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [target, setTarget] = useState(g0?.target || 0);
  const d0 = g0 ? toDate(g0.target_date) : null;
  const [date, setDate] = useState<{ d: number; m: number; y: number } | null>(d0 ? { d: d0.getDate(), m: d0.getMonth(), y: d0.getFullYear() } : null);
  const [dateText, setDateText] = useState(d0 ? `${pad(d0.getDate())}/${pad(d0.getMonth() + 1)}/${d0.getFullYear()}` : '');
  const [dateErr, setDateErr] = useState('');
  const [cal, setCal] = useState<{ m: number; y: number } | null>(null);
  const [has, setHas] = useState<'yes' | 'no' | null>(g0 ? (g0.saved_initial > 0 ? 'yes' : 'no') : null);
  const [saved, setSaved] = useState(g0?.saved_initial || 0);
  const [prio, setPrio] = useState<Priority | null>(g0?.priority || null);
  const [aporte, setAporte] = useState<number | null>(g0 ? g0.monthly : null);
  const [busy, setBusy] = useState(false);
  const sc = useRef<HTMLDivElement>(null);
  const swipe = useRef<() => void>(() => {});
  useSwipeBack(sc, () => swipe.current(), [step]);

  const emoji = pick || emojiFor(name, '🎯');
  const color: GoalColor = g0?.color || COLOR_ORDER.find((c) => !goals.some((x) => x.color === c)) || COLOR_ORDER[goals.length % 4];
  const libre = freePlanned + (g0 ? g0.monthly : 0);

  const tIdx = date ? date.y * 12 + date.m : 0;
  const months = date ? tIdx - TI : 0;
  const n = date ? months + 1 : 0; /* aportes: este mes incluido */
  const long = months > 60;
  const lbl = (d: number, idx: number) => { const y = Math.floor(idx / 12), m = idx % 12; return long ? `${MES[m]} ${y}` : `${d} ${MES[m]} ${y}`; };
  const prep = long ? 'en ' : 'el ';
  const tgtLbl = date ? lbl(date.d, tIdx) : '';
  const savedEff = has === 'yes' ? Math.min(saved, target) : 0;
  /* En edición, lo ahorrado incluye los aportes ya hechos */
  const already = g0 ? g0.saved - g0.saved_initial : 0;
  const falta = Math.max(0, target - savedEff - already);
  const sugg = falta > 0 && n > 0 ? Math.ceil(falta / n / 1000) * 1000 : 0;
  const ap = aporte === null ? sugg : aporte;
  const nNeeded = ap > 0 ? Math.ceil(falta / ap) : 0;
  const onTime = nNeeded <= n;
  const arrLbl = date ? (onTime ? tgtLbl : lbl(date.d, TI + nNeeded - 1)) : '';
  const lateM = nNeeded - n;
  const over = ap > libre;
  const pct = target ? Math.round(((savedEff + already) / target) * 100) : 0;

  const setTyped = (raw: string) => {
    let dg = raw.replace(/\D/g, '').slice(0, 8);
    if (raw.length < dateText.length && /\/$/.test(dateText)) dg = dg.slice(0, -1);
    const txt = dg.slice(0, 2) + (dg.length > 2 ? '/' + dg.slice(2, 4) : '') + (dg.length > 4 ? '/' + dg.slice(4) : '');
    setDateText(txt); setAporte(null);
    if (dg.length < 8) { setDate(null); setDateErr(''); return; }
    const d = +dg.slice(0, 2), m = +dg.slice(2, 4) - 1, y = +dg.slice(4);
    const ok = m >= 0 && m < 12 && d >= 1 && d <= new Date(y, m + 1, 0).getDate();
    const idx = y * 12 + m, fut = idx > TI || (idx === TI && d > TD);
    if (ok && fut) { setDate({ d, m, y }); setDateErr(''); }
    else { setDate(null); setDateErr(ok ? `Elegí una fecha posterior a hoy (${todayLbl}).` : 'Esa fecha no existe. Revisá el día y el mes.'); }
  };
  const pickDay = (d: number, m: number, y: number) => { setDate({ d, m, y }); setDateText(`${pad(d)}/${pad(m + 1)}/${y}`); setDateErr(''); setAporte(null); setCal(null); };

  let missing = '';
  if (edit) missing = !name.trim() ? 'Poné un nombre' : !target ? 'Ingresá el monto' : !date ? 'Elegí una fecha' : over ? 'Bajá el aporte' : falta > 0 && ap <= 0 ? 'Ingresá un aporte' : '';
  else if (step === 1) missing = !name.trim() ? 'Poné un nombre' : !target ? 'Ingresá el monto' : !date ? 'Elegí una fecha' : '';
  else if (step === 2) missing = has === null ? 'Elegí Sí o No' : has === 'yes' && saved <= 0 ? 'Ingresá cuánto tenés' : '';
  else if (step === 3) missing = !prio ? 'Elegí una prioridad' : '';
  else if (step === 4) missing = over ? 'Bajá el aporte' : falta > 0 && ap <= 0 ? 'Ingresá un aporte' : '';

  const toStep = (s: number) => { setDir(s < step ? 'back' : 'push'); setStep(s); setEmojiOpen(false); setCal(null); if (sc.current) sc.current.scrollTop = 0; };
  const cancel = () => (edit ? back(`/meta/${id}`) : back(goals.length ? '/inicio' : '/plan'));
  swipe.current = () => { if (edit || step === 1) { if (edit) back(`/meta/${id}`, 'none'); else back(goals.length ? '/inicio' : '/plan', 'none'); } else { setDir('none'); setStep(step - 1); } };

  const save = async () => {
    if (!date || !prio) return;
    setBusy(true);
    const row = { name: capFirst(name), emoji, target, saved_initial: savedEff, monthly: ap, target_date: iso(new Date(date.y, date.m, date.d, 12)), priority: prio };
    if (edit && id) { await updateGoal(id, row); setBusy(false); back(`/meta/${id}`); return; }
    const g = await createGoal(row);
    setBusy(false);
    if (g) go(`/meta-creada/${g.id}`, 'push');
  };

  const sub = !edit && step > 1 ? (step === 2 ? `${name} · ${fmt(target)}` : step === 5 ? `${name} · ${prio === 'protegida' ? 'protegida' : 'prioridad ' + PRIO_LABEL[prio!].toLowerCase()}` : name) : '';


  const s1 = (
    <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="field">
        <label htmlFor="m-nom">Ponele un nombre</label>
        <span className="fbox" style={{ paddingLeft: 8 }}>
          <button type="button" onClick={() => setEmojiOpen(!emojiOpen)} aria-label={`Emoji de la meta: ${emoji}. Tocá para elegir otro`} aria-expanded={emojiOpen} className="badge b40" style={{ border: 0, cursor: 'pointer', background: GOAL[color].soft, boxShadow: emojiOpen ? 'inset 0 0 0 2px #11242B' : 'none' }}>{emoji}</button>
          <input id="m-nom" className="fin" autoCapitalize="sentences" value={name} onChange={(e) => setName(e.target.value)} placeholder="Por ejemplo, un viaje" autoComplete="off" />
        </span>
        <span className="hint">{pick ? 'Elegiste este emoji. Tocalo para cambiarlo.' : name.trim() ? 'Emoji sugerido por el nombre. Tocalo para cambiarlo.' : 'Mientras escribís, te sugerimos un emoji.'}</span>
        {emojiOpen && (
          <div role="radiogroup" aria-label="Emoji" className="card mi-pop" style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
            {[emojiFor(name, '🎯'), ...EMOJIS].filter((x, i, a) => a.indexOf(x) === i).map((e) => (
              <button key={e} type="button" role="radio" aria-checked={e === emoji} aria-label={e} onClick={() => { setPick(e); setEmojiOpen(false); }} className="badge" style={{ width: 38, height: 38, fontSize: 22, border: 0, cursor: 'pointer', background: e === emoji ? '#EDEFF0' : 'transparent' }}>{e}</button>
            ))}
          </div>
        )}
      </div>
      <div className="field"><label htmlFor="m-monto">Monto objetivo</label><MoneyInput id="m-monto" value={target} onChange={(v) => { setTarget(v); setAporte(null); }} /></div>
      <div className="field">
        <label htmlFor="m-fecha">Fecha objetivo</label>
        <span className={'fbox' + (dateErr ? ' bad' : '')} style={{ paddingRight: 8 }}>
          <input id="m-fecha" className="fin" inputMode="numeric" value={dateText} onChange={(e) => setTyped(e.target.value)} placeholder="dd/mm/aaaa" autoComplete="off" aria-describedby="m-fecha-ayuda" aria-invalid={!!dateErr} />
          <button type="button" onClick={() => setCal(cal ? null : date ? { m: date.m, y: date.y } : { m: now.getMonth(), y: now.getFullYear() })} aria-label={cal ? 'Cerrar calendario' : 'Abrir calendario'} aria-expanded={!!cal} style={{ width: 44, height: 44, border: 0, background: 'transparent', display: 'grid', placeItems: 'center', cursor: 'pointer', borderRadius: 999 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#11242B" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
          </button>
        </span>
        {dateErr ? <span id="m-fecha-ayuda" role="alert" className="err">{dateErr}</span> : <span id="m-fecha-ayuda" className="hint">{date ? `Faltan ${months} ${months === 1 ? 'mes' : 'meses'}. ` : ''}Escribila o elegila en el calendario.</span>}
        {cal && <DatePicker value={date} min={now} onPick={(v) => pickDay(v.d, v.m, v.y)} />}
      </div>
    </div>
  );

  const s2 = (
    <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div role="radiogroup" aria-label="¿Ya tenés algo ahorrado?" style={{ display: 'flex', gap: 10 }}>
        {(['yes', 'no'] as const).map((v) => (
          <button key={v} type="button" role="radio" aria-checked={has === v} onClick={() => { setHas(v); setAporte(null); }} style={{ flex: 1, minHeight: 60, borderRadius: 999, background: '#FFFFFF', color: '#11242B', border: `2px solid ${has === v ? '#11242B' : '#FFFFFF'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', font: '600 17px var(--font)' }}>{has === v && <Check s={14} />}{v === 'yes' ? 'Sí' : 'No'}</button>
        ))}
      </div>
      {has === 'yes' && <div className="field"><label htmlFor="m-ahorro">¿Cuánto?</label><MoneyInput id="m-ahorro" value={saved} onChange={(v) => { setSaved(v); setAporte(null); }} /></div>}
      {has !== null && <div className="row" style={{ background: '#FFFFFF', borderRadius: 24, padding: '14px 18px' }}><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>Falta</b><span className="hint">Objetivo menos lo ahorrado</span></span><b className="num" style={{ fontSize: 30, lineHeight: '34px', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{fmt(falta)}</b></div>}
    </div>
  );

  const s3 = (
    <div style={{ padding: edit ? '20px 20px 0' : '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {edit && <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>Prioridad</span>}
      <div role="radiogroup" aria-label="Prioridad" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PR.map((o) => { const sel = prio === o.id; return (
          <button key={o.id} type="button" role="radio" aria-checked={sel} onClick={() => setPrio(o.id)} className="opt">
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>{o.id === 'protegida'
                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, lineHeight: '20px', fontWeight: 600, padding: '4px 12px 4px 10px', borderRadius: 999, background: '#11242B', color: '#FFFFFF' }}><Lock c="#FFFFFF" />Protegida</span>
                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 15, lineHeight: '20px', fontWeight: 600, padding: '4px 12px 4px 10px', borderRadius: 999, background: '#EDEFF0' }}><Lvl p={o.id} />{PRIO_LABEL[o.id]}</span>}</span>
              <span className="hint">{o.copy}</span>
              {sel && <span style={{ fontSize: 13, lineHeight: '18px' }}>{o.more}</span>}
            </span>
            <span className="dot" aria-hidden="true" />
          </button>
        ); })}
      </div>
      <p className="hint" style={{ margin: 0, display: 'flex', gap: 8 }}><span style={{ marginTop: 2 }}><Lock c="#526166" /></span>La prioridad ordena los escenarios cuando una compra supera tu ahorro libre. Make It nunca mueve dinero por su cuenta.</p>
    </div>
  );

  const s4 = (
    <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {edit && <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>Aporte por mes</span>}
      <MoneyInput big value={ap} onChange={setAporte} label="Aporte por mes" bad={over} describedBy="m-ap-msg" />
      {over ? <p id="m-ap-msg" role="alert" style={{ margin: 0, background: '#FCE9E6', color: '#963B33', borderRadius: 20, padding: '12px 16px', fontSize: 15, lineHeight: '20px' }}><b style={{ fontWeight: 600 }}>Supera tu ahorro libre.</b> Hoy tenés {fmt(libre)}.</p>
        : ap === sugg && sugg > 0 ? <p id="m-ap-msg" style={{ margin: 0, fontSize: 15, lineHeight: '20px', color: '#36474D' }}>Calculado para llegar {prep}{tgtLbl}: <b style={{ fontWeight: 600, color: '#11242B', whiteSpace: 'nowrap' }}>{n} aportes</b>. Podés cambiarlo.</p>
        : ap > 0 ? <div id="m-ap-msg" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><p style={{ margin: 0, fontSize: 15, lineHeight: '20px', color: '#36474D' }}>Con este aporte llegás <b style={{ fontWeight: 600, color: '#11242B', whiteSpace: 'nowrap' }}>{prep}{arrLbl}</b>.</p><button type="button" onClick={() => setAporte(null)} style={{ alignSelf: 'flex-start', minHeight: 44, border: 0, padding: 0, background: 'transparent', font: '600 15px/20px var(--font)', color: '#11242B', textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>Volver al calculado ({fmt(sugg)})</button></div> : null}
      <section aria-label="Cómo queda tu mes" className="num" style={{ background: '#FFFFFF', borderRadius: 32, padding: '14px 22px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div className="row" style={{ minHeight: 40 }}><span style={{ fontSize: 16 }}>Ahorro libre hoy</span><b style={{ fontSize: 17, fontWeight: 600 }}>{fmt(libre)}</b></div>
        <div className="row" style={{ minHeight: 40 }}><span style={{ fontSize: 16 }}><span aria-label="menos" style={{ color: '#526166', fontWeight: 600, marginRight: 6 }}>−</span>Aporte a {name}</span><b style={{ fontSize: 17, fontWeight: 600 }}>{fmt(ap)}</b></div>
        <div className="row" style={{ background: '#EDEFF0', borderRadius: 20, padding: '12px 16px', margin: '6px -8px 0' }}><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 16, fontWeight: 600 }}><span aria-label="igual" style={{ color: '#526166', marginRight: 6 }}>=</span>Ahorro libre</b><span className="hint">Lo que te queda este mes</span></span><b style={{ fontSize: 26, lineHeight: '34px', fontWeight: 800, letterSpacing: '-0.02em' }}>{fmt(Math.max(0, libre - ap))}</b></div>
      </section>
      <p className="hint" style={{ margin: 0 }}>Los aportes se suman el día de aporte de cada mes y pueden cambiar de un mes a otro. La proyección se actualiza con ellos.</p>
    </div>
  );

  const s5 = (
    <div style={{ padding: '16px 20px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!onTime && <p style={{ margin: 0, fontSize: 15, lineHeight: '20px', color: '#36474D' }}>Elegiste <b style={{ fontWeight: 600, color: '#11242B', whiteSpace: 'nowrap' }}>{tgtLbl}</b>. Con {fmt(ap)} por mes llegás {lateM === 1 ? 'un mes' : `${lateM} meses`} después.</p>}
      <article aria-label={`Plan de ${name}`} className="num mi-pop" style={{ background: GOAL[color].bg, borderRadius: 32, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="row"><span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}><span aria-hidden="true" className="badge b40" style={{ background: GOAL[color].soft }}>{emoji}</span><b style={{ fontSize: 17, lineHeight: '22px', fontWeight: 600 }}>{name}</b></span>
          {prio === 'protegida' ? <span className="prio" style={{ background: '#11242B', color: '#FFFFFF' }}><Lock c="#FFFFFF" />Protegida</span> : prio && <span className="prio"><Lvl p={prio} />{PRIO_LABEL[prio]}</span>}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontSize: 13, lineHeight: '18px' }}>Ya ahorrado</span><b style={{ fontSize: 30, lineHeight: '34px', fontWeight: 800, letterSpacing: '-0.02em' }}>{fmt(savedEff)}</b><span style={{ fontSize: 15, lineHeight: '20px' }}>de {fmt(target)}</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div role="img" aria-label={`${pct}% ahorrado`} style={{ height: 12, borderRadius: 999, background: 'rgba(17,36,43,0.2)', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: '#11242B', borderRadius: 999 }} /></div>
          <span style={{ fontSize: 13, lineHeight: '18px' }}><b style={{ fontWeight: 600 }}>{pct}%</b> ahorrado · te faltan <b style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{fmt(falta)}</b></span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(17,36,43,0.15)', paddingTop: 6 }}>
          <div className="row" style={{ minHeight: 36, fontSize: 15 }}><span>Llegada</span><b style={{ fontWeight: 600 }}>{arrLbl}</b></div>
          <div className="row" style={{ minHeight: 36, fontSize: 15 }}><span>Aporte por mes</span><b style={{ fontWeight: 600 }}>{fmt(ap)} <span style={{ fontWeight: 400 }}>· {nNeeded} aportes</span></b></div>
        </div>
      </article>
      <p className="hint" style={{ margin: 0 }}>La proyección es una estimación. Puede cambiar si cambian tus aportes.</p>
    </div>
  );

  const titles: Record<number, React.ReactNode> = {
    1: <H1 a="¿Qué querés " b="alcanzar?" />,
    2: <H1 a="¿Ya tenés algo " b="ahorrado" after=" para esta meta?" />,
    3: <H1 a="¿Qué prioridad tiene " b="esta meta" after=" para vos?" />,
    4: <H1 a="¿Cuánto querés " b="aportar" after=" por mes?" />,
    5: <H1 a={(onTime ? 'Sí, llegás ' : 'Llegás ') + prep} b={arrLbl + '.'} />,
  };

  return (
    <Screen bg="#F5F5F5" key={edit ? 'e' : step}>
      <div className="scroller" ref={sc}>
        <Header sticky kicker={edit ? '' : `Paso ${step} de 5`}
          onBack={edit || step === 1 ? cancel : () => toStep(step - 1)} backLabel={edit || step === 1 ? 'Cancelar' : 'Atrás'} backIcon={edit || step === 1 ? <X /> : undefined}>
          {sub && <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b40" style={{ background: '#FFFFFF' }}>{emoji}</span><span style={{ fontSize: 17, lineHeight: '22px', fontWeight: 600 }}>{sub}</span></span>}
          {edit ? <H1 a="Editar " b="meta" /> : titles[step]}
        </Header>
        {edit ? <>{s1}{s3}{s4}</> : step === 1 ? s1 : step === 2 ? s2 : step === 3 ? s3 : step === 4 ? s4 : s5}
        <div style={{ height: 140 }} />
      </div>
      <Foot>
        {missing ? <span className="btn btn-d" aria-disabled="true">{missing}</span>
          : edit || step === 5 ? <button type="button" className="btn btn-p" disabled={busy} onClick={save}>{busy ? 'Guardando…' : edit ? 'Guardar cambios' : 'Guardar meta'}</button>
          : <button type="button" className="btn btn-p" onClick={() => toStep(step + 1)}>{step === 4 ? 'Ver plan' : 'Continuar'}</button>}
      </Foot>
    </Screen>
  );
}
