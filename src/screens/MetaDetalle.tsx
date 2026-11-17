import { useEffect, useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Screen, useGo, useBack, useSwipeBack, Chevron, Lock, Arrow, Check } from '../ui/nav';
import { Lvl, arrivalLabel, arrivalPrep } from '../ui/parts';
import { GOAL, calm, EASE } from '../lib/tokens';
import { fmt, fmtDay, fmtMonthShort, toDate, MONTHS } from '../lib/money';
import { delayLabel } from '../lib/model';

/* Detalle de meta: la card que tocaste crece hasta ser la pantalla; anillo de ahorro, plan (con línea de tiempo si se movió) y actividad */
export default function MetaDetalle() {
  const { id } = useParams();
  const go = useGo();
  const back = useBack();
  const { goals, monthDecisions, profile } = useStore();
  const root = useRef<HTMLDivElement>(null);
  const g = goals.find((x) => x.id === id);
  useSwipeBack(root, () => back('/inicio', 'none'));

  useEffect(() => {
    const el = root.current?.closest('.screen') as HTMLElement | null; if (!el || !el.animate) return;
    if (calm()) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150 }); return; }
    let c = { t: 520, l: 20, b: 60, r: 20 };
    try { const raw = sessionStorage.getItem('mi-card'); if (raw) { const p = JSON.parse(raw); if (p.id === id) c = p; sessionStorage.removeItem('mi-card'); } } catch { /* */ }
    const px = (n: number) => Math.max(0, Math.round(n)) + 'px';
    el.animate([{ clipPath: `inset(${px(c.t)} ${px(c.r)} ${px(c.b)} ${px(c.l)} round 32px)` }, { clipPath: 'inset(0px 0px 0px 0px round 48px)' }], { duration: 520, easing: EASE.zoom });
    const body = root.current!.querySelector('.md-body');
    if (body) (body as HTMLElement).animate([{ transform: `translateY(${Math.min(320, Math.max(80, c.t * 0.5))}px)` }, { transform: 'none' }], { duration: 520, easing: EASE.zoom });
    Array.from(body?.children || []).forEach((k, i) => { if (i) (k as HTMLElement).animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 440, delay: 240 + i * 120, easing: EASE.out, fill: 'backwards' }); });
    const arc = el.querySelector('circle[stroke-dasharray]'); if (arc) (arc as SVGElement).animate([{ strokeDasharray: '0 289.03' }, { strokeDasharray: arc.getAttribute('stroke-dasharray')! }], { duration: 900, delay: 380, easing: EASE.out, fill: 'backwards' });
    const tl = el.querySelector('.md-tl > div'); if (tl) (tl as HTMLElement).animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 900, delay: 520, easing: EASE.out, fill: 'backwards' });
    const cta = el.querySelector('.md-cta'); if (cta) (cta as HTMLElement).animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: 460, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!g) return <Navigate to="/inicio" replace />;
  const c = GOAL[g.color];
  const pct = Math.round(g.pct);
  const C = 289.03, dash = `${((C * g.pct) / 100).toFixed(1)} ${C}`;
  const mine = monthDecisions.filter((d) => d.impacts.some((i) => i.goal_id === g.id));
  const imps = mine.flatMap((d) => d.impacts.filter((i) => i.goal_id === g.id));
  const delay = imps.reduce((s, i) => s + i.delay_days, 0);
  const moved = delay > 0;
  const from = imps.length ? [...imps].sort((a, b) => a.from_date.localeCompare(b.from_date))[0].from_date : '';
  const items = mine.map((d) => d.item);
  const itemTxt = items.length === 1 ? `el ${items[0]}` : 'tus compras de este mes';
  const untouched = g.priority === 'protegida' && monthDecisions.length > 0;
  const created = g.created_at.slice(0, 10);
  const long = (toDate(g.arrival).getTime() - toDate(created).getTime()) / 86400000 > 365 * 5;
  const lbl = (iso: string) => (long ? fmtMonthShort(toDate(iso)) : arrivalLabel(iso, g.created_at));

  const rows: { k: string; v: string; pre?: string }[] = [
    moved ? { k: 'Fecha objetivo', v: lbl(g.arrival), pre: `${long ? fmtMonthShort(toDate(from)) : fmtDay(from)} → ` } : { k: 'Fecha objetivo', v: lbl(g.arrival) },
    { k: g.priority === 'protegida' ? 'Aporte protegido' : 'Aporte previsto', v: `${fmt(g.monthly)} por mes` },
    ...(g.thisMonth !== g.monthly ? [{ k: 'Aporte de este mes', v: fmt(g.thisMonth) }] : []),
  ];
  const day = String(profile?.contribution_day || 1).padStart(2, '0');
  const acts = [
    ...[...g.contribs].sort((a, b) => b.month.localeCompare(a.month)).map((x) => {
      const m = toDate(x.month);
      const sameAsCreation = x.month.slice(0, 7) === created.slice(0, 7);
      const d = sameAsCreation ? fmtDay(created) : `${day} ${fmtDay(x.month).split(' ')[1]}`;
      const less = g.monthly - x.amount;
      return { d, t: `Aporte de ${MONTHS[m.getMonth()]}`, sub: less > 0 && x.note ? `${fmt(less)} menos por ${x.note}` : less > 0 ? `${fmt(less)} menos que lo previsto` : '', m: `+${fmt(x.amount)}` };
    }),
    { d: fmtDay(created), t: 'Creaste la meta', sub: g.saved_initial > 0 ? 'Ahorro previo' : '', m: g.saved_initial > 0 ? `+${fmt(g.saved_initial)}` : '' },
  ];
  const now = new Date();
  const title = g.name;

  return (
    <Screen bg={c.bg} onEnter={() => true}>
      <div ref={root} className="scroller" style={{ color: '#11242B' }}>
        <header style={{ padding: 'var(--top) 20px 12px' }}>
          <div className="row" style={{ minHeight: 44 }}>
            <button type="button" className="glass" aria-label="Volver" onClick={() => back('/inicio')}><Chevron /></button>
            <span className="prio" style={{ background: 'rgba(255,255,255,0.45)' }}>{g.priority === 'protegida' ? <><Lock />Protegida</> : <><Lvl p={g.priority} />Prioridad {g.priority}</>}</span>
          </div>
        </header>
        <div className="md-body" style={{ padding: '4px 16px 120px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}><span aria-hidden="true" className="badge b52" style={{ background: c.soft }}>{g.emoji}</span><h1 style={{ margin: 0, fontSize: g.name.length > 18 ? 40 : 52, lineHeight: g.name.length > 18 ? '44px' : '52px', fontWeight: 500, letterSpacing: '-0.035em', whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{title}</h1></div>

          <section aria-label="Ahorrado" className="num" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, borderBottom: `1px solid ${c.data}` }}>
            <div className="row">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, lineHeight: '20px' }}><span aria-hidden="true" className="sw" style={{ background: '#11242B' }} />Ahorrado</span>
                <span style={{ fontSize: fmt(g.saved).length > 10 ? 28 : 34, lineHeight: '34px', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{fmt(g.saved)}</span>
                <span style={{ fontSize: 15, lineHeight: '20px', whiteSpace: 'nowrap' }}>de {fmt(g.target)}</span>
              </div>
              <div role="img" aria-label={`${pct}% ahorrado. Te faltan ${fmt(g.missing)}.`} style={{ position: 'relative', width: 108, height: 108, flex: 'none' }}>
                <svg width="108" height="108" viewBox="0 0 108 108" aria-hidden="true" style={{ display: 'block' }}>
                  <defs><pattern id="md-rayas" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="2" height="5" fill="#11242B" /></pattern></defs>
                  <circle cx="54" cy="54" r="46" fill="none" stroke="url(#md-rayas)" strokeWidth="12" />
                  <circle cx="54" cy="54" r="46" fill="none" stroke="#11242B" strokeWidth="12" strokeLinecap="round" strokeDasharray={dash} transform="rotate(-90 54 54)" />
                </svg>
                <span aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 22, lineHeight: '28px', fontWeight: 800 }}>{pct}%</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, paddingTop: 12, borderTop: '1px solid rgba(17,36,43,0.15)', fontSize: 15, lineHeight: '20px' }}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span aria-hidden="true" className="sw" style={{ background: 'repeating-linear-gradient(135deg, #11242B 0 1.5px, transparent 1.5px 4px)', boxShadow: 'inset 0 0 0 1px rgba(17,36,43,0.25)' }} />Te faltan</span><b style={{ fontWeight: 700 }}>{fmt(g.missing)}</b></div>
          </section>

          <section aria-label="Plan" className="num" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, borderBottom: `1px solid ${c.data}` }}>
            <div className="row">
              <span className="lbl">Plan</span>
              {moved && <span className="delta"><Arrow />{delayLabel(delay)}</span>}
              {untouched && <span className="prio" style={{ background: 'rgba(255,255,255,0.45)' }}><Check />Sin cambios</span>}
            </div>
            {moved && <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><b style={{ fontSize: 17, lineHeight: '22px', fontWeight: 700 }}>Ahora llegás {arrivalPrep(g.arrival)}{lbl(g.arrival)}.</b><span style={{ fontSize: 14, lineHeight: '19px' }}>Por {itemTxt}, este mes {g.thisMonth > 0 ? 'aportás menos' : 'no aportás a esta meta'}. El resto del plan sigue igual.</span></div>}
            {untouched && <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><b style={{ fontSize: 17, lineHeight: '22px', fontWeight: 700 }}>Tu plan sigue igual.</b><span style={{ fontSize: 14, lineHeight: '19px' }}>{monthDecisions.length === 1 ? `El ${monthDecisions[0].item} no tocó` : 'Tus compras de este mes no tocaron'} este aporte porque está protegido.</span></div>}
            {moved && (
              <div role="img" aria-label={`Línea de tiempo: hoy, ${MONTHS[now.getMonth()]} ${now.getFullYear()}. Fecha original ${lbl(from)}. Nueva fecha ${lbl(g.arrival)}, ${delayLabel(delay).replace('+', '')} más.`} className="md-tl" style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 2 }}>
                <div aria-hidden="true" style={{ position: 'relative', height: 28 }}><div style={{ position: 'absolute', left: 0, top: 7, height: 14, width: '72%', background: '#11242B', borderRadius: '999px 0 0 999px' }} /><div style={{ position: 'absolute', left: '72%', right: 14, top: 7, height: 14, background: 'repeating-linear-gradient(135deg, #11242B 0 2px, transparent 2px 6px)' }} /><div style={{ position: 'absolute', left: '72%', top: 4, width: 20, height: 20, marginLeft: -10, borderRadius: '50%', background: c.bg, border: '3px solid #11242B' }} /><div style={{ position: 'absolute', right: 0, top: 0, width: 28, height: 28, borderRadius: '50%', background: '#11242B' }} /></div>
                <div aria-hidden="true" style={{ position: 'relative', height: 18, fontSize: 13, lineHeight: '18px' }}><span style={{ position: 'absolute', left: 0 }}>Hoy · {fmtMonthShort(now)}</span><span style={{ position: 'absolute', left: '72%', transform: 'translateX(-100%)', paddingRight: 4, whiteSpace: 'nowrap' }}>{lbl(from)}</span><b style={{ position: 'absolute', right: 0, fontWeight: 700, whiteSpace: 'nowrap' }}>{lbl(g.arrival)}</b></div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {rows.map((r) => <div key={r.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '12px 0', borderTop: '1px solid rgba(17,36,43,0.15)', fontSize: 15, lineHeight: '20px' }}><span>{r.k}</span><b style={{ fontWeight: 600, whiteSpace: 'nowrap' }}><span style={{ fontWeight: 400 }}>{r.pre}</span>{r.v}</b></div>)}
              {g.priority === 'protegida' && <p style={{ margin: 0, paddingTop: 12, borderTop: '1px solid rgba(17,36,43,0.15)', display: 'flex', gap: 8, fontSize: 14, lineHeight: '19px' }}><span style={{ flex: 'none', marginTop: 3 }}><Lock /></span><span>Este aporte está protegido: no participa de los ajustes por compras. Solo cambia si lo editás desde acá.</span></p>}
            </div>
          </section>

          <section aria-label="Actividad" className="num" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, borderBottom: `1px solid ${c.data}` }}>
            <span className="lbl">Actividad</span>
            <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column' }}>
              {acts.map((a, i) => <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: i ? '12px 0' : '0 0 12px', borderTop: i ? '1px solid rgba(17,36,43,0.15)' : 0, fontSize: 15, lineHeight: '20px' }}><span style={{ width: 56, flex: 'none' }}>{a.d}</span><span style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}><b style={{ fontWeight: 600 }}>{a.t}</b>{a.sub && <span style={{ fontSize: 14, lineHeight: '19px' }}>{a.sub}</span>}</span><b style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{a.m}</b></li>)}
            </ol>
          </section>
          <p style={{ margin: '0 4px', fontSize: 13, lineHeight: '18px' }}>La proyección es una estimación. Cambia si cambian tus aportes.</p>
        </div>
      </div>
      <div className="md-cta" style={{ position: 'absolute', left: 20, right: 20, bottom: 'max(30px, calc(env(safe-area-inset-bottom, 0px) + 8px))' }}>
        <button type="button" className="btn btn-s" onClick={() => go(`/meta/${g.id}/editar`, 'up')}>Editar meta</button>
      </div>
    </Screen>
  );
}

