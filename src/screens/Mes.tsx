import { useRef, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Screen, useGo, useBack, useSwipeBack, Check, useStagger } from '../ui/nav';
import { HEADER_BG, PrioChip, joinY } from '../ui/parts';
import TabBar, { GlassDefs, ScrollEdge } from '../ui/TabBar';
import { GOAL, stripes } from '../lib/tokens';
import { fmt, fmtDay, MONTHS, toDate, addMonths, monthStart, iso } from '../lib/money';
import { thisMonth } from '../lib/model';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const ym = (d: Date) => iso(monthStart(d)).slice(0, 7);
const monthLabel = (d: Date) => `${cap(MONTHS[d.getMonth()])} ${d.getFullYear()}`;

/* Selector de mes (menú desplegable al estilo iOS) del encabezado del inicio */
export function MonthMenu() {
  const go = useGo();
  const { goals } = useStore();
  const [open, setOpen] = useState(false);
  const now = new Date(), cur = monthStart(now);
  const first = goals.length ? monthStart(toDate(goals.map((g) => g.created_at.slice(0, 10)).sort()[0])) : cur;
  /* Hasta tres meses anteriores: los que tienen datos, o al menos el mes pasado */
  const past: Date[] = [];
  for (let i = 3; i >= 1; i--) { const d = addMonths(cur, -i); if (d >= first || i === 1) past.push(d); }
  const next = addMonths(cur, 1);
  const item = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, minHeight: 52, padding: '0 14px', border: 0, borderRadius: 22, fontFamily: 'inherit', color: '#11242B', fontSize: 17, lineHeight: '22px', background: 'transparent', textAlign: 'left' as const, width: '100%' };
  return (
    <>
      <button type="button" className="glassbar chipglass" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="menu" aria-label={`${monthLabel(now)}. Cambiar de mes`} style={{ border: 0, cursor: 'pointer', paddingRight: 12, whiteSpace: 'nowrap', font: 'inherit', color: 'inherit' }}>
        <span aria-hidden="true" className="badge b32" style={{ background: '#FFFFFF' }}>🗓️</span>
        <span className="lbl" style={{ color: '#11242B' }}>{monthLabel(now)}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#11242B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginLeft: 6, transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform 200ms ease' }}><path d="M2.5 4.5L6 8l3.5-3.5" /></svg>
      </button>
      {open && <>
        <div onClick={() => setOpen(false)} aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 7 }} />
        <div role="menu" aria-label="Elegir mes" className="mi-pop month-menu" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
          {past.map((d) => { const has = d >= first; return (
            <button key={ym(d)} type="button" role="menuitem" className="mm-item" style={item} onClick={() => { setOpen(false); go(`/mes/${ym(d)}`, 'up'); }}>
              <span>{monthLabel(d)}</span><span style={{ fontSize: 13, lineHeight: '18px', color: '#526166' }}>{has ? 'Cerrado' : 'Sin datos'}</span>
            </button>
          ); })}
          <button type="button" role="menuitemradio" aria-checked="true" className="mm-item" onClick={() => setOpen(false)} style={{ ...item, background: 'rgba(17,36,43,0.08)', fontWeight: 600, cursor: 'pointer' }}>
            <span>{monthLabel(now)}</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, lineHeight: '18px' }}><Check />Hoy</span>
          </button>
          <div role="menuitem" aria-disabled="true" style={{ ...item, color: '#899397' }}><span>{monthLabel(next)}</span><span style={{ fontSize: 13, lineHeight: '18px' }}>Todavía no</span></div>
          <div aria-hidden="true" style={{ height: 1, margin: '4px 14px', background: 'rgba(17,36,43,0.12)' }} />
          <button type="button" role="menuitem" className="mm-item" style={{ ...item, justifyContent: 'flex-start', fontWeight: 600 }} onClick={() => { setOpen(false); go('/anio', 'tab-r'); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#11242B" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>Ver tu año
          </button>
        </div>
      </>}
    </>
  );
}

/* 07o — Un mes cerrado, en modo lectura */
export default function Mes() {
  const { ym: key } = useParams();
  const back = useBack();
  const { goals, decisions, profile } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const sc = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useStagger(list, ':scope > *', 160, 90);
  useSwipeBack(sc, () => back('/inicio', 'none'));
  if (!key || !/^\d{4}-\d{2}$/.test(key) || `${key}-01` >= thisMonth()) return <Navigate to="/inicio" replace />;
  const d = toDate(`${key}-01`), mkey = `${key}-01`, name = MONTHS[d.getMonth()];
  const total = profile?.monthly_saving || 0;
  const existed = goals.filter((g) => g.created_at.slice(0, 7) <= key);
  const later = goals.filter((g) => g.created_at.slice(0, 7) > key);
  const contrib = (gid: string) => goals.find((g) => g.id === gid)!.contribs.filter((c) => c.month === mkey).reduce((s, c) => s + c.amount, 0);
  const dec = decisions.filter((x) => x.month === mkey && x.decision === 'comprar');
  const spentM = dec.reduce((s, x) => s + x.amount, 0);
  const parts = existed.map((g) => ({ g, v: contrib(g.id) }));
  const inGoals = parts.reduce((s, p) => s + p.v, 0);
  const free = existed.length ? Math.max(0, total - inGoals - spentM) : 0;
  const saved = inGoals + free;
  const day = String(profile?.contribution_day || 1).padStart(2, '0');
  const atClose = (gid: string) => { const g = goals.find((x) => x.id === gid)!; return g.saved_initial + g.contribs.filter((c) => c.month <= mkey).reduce((s, c) => s + c.amount, 0); };
  const bar = [...parts.filter((p) => p.v > 0).map((p) => ({ k: p.g.id, bg: GOAL[p.g.color].bg, v: p.v })), ...(spentM ? [{ k: 'spent', bg: '#C4C9CB', v: spentM }] : []), ...(free ? [{ k: 'free', bg: stripes(), v: free }] : [])];
  const base = bar.reduce((s, b) => s + b.v, 0) || 1;
  return (
    <Screen>
      <GlassDefs />
      <div ref={sc} className="scroller" onScroll={(e) => { const v = e.currentTarget.scrollTop > 120; if (v !== scrolled) setScrolled(v); }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 4, padding: '54px 20px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(#EDEFF0 70%, rgba(237,239,240,0))' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px 4px 4px', borderRadius: 999, background: '#FFFFFF' }}><span aria-hidden="true" className="badge b32" style={{ background: '#EDEFF0' }}>🗓️</span><span className="lbl">{monthLabel(d)}</span></span>
          <button type="button" aria-label={`Volver a hoy, ${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}`} onClick={() => back('/inicio')} style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 18px', border: 0, borderRadius: 999, background: '#11242B', color: '#FFFFFF', font: '600 15px var(--font)', cursor: 'pointer' }}>Hoy</button>
        </div>
        <section style={{ padding: '8px 20px 24px', borderRadius: '0 0 40px 40px', background: HEADER_BG, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p role="note" style={{ margin: 0, display: 'flex', gap: 10, alignItems: 'flex-start', background: '#FFFFFF', borderRadius: 20, padding: '12px 16px', fontSize: 15, lineHeight: '20px' }}>
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="#11242B" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" style={{ flex: 'none', marginTop: 2 }}><rect x="2.5" y="6" width="9" height="6.5" rx="1.5" /><path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" /></svg>
            <span>Estás viendo un mes cerrado. Es solo lectura: para cambiar algo, volvé a hoy.</span>
          </p>
          {existed.length ? <>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <h1 style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 400, letterSpacing: '-0.02em' }}><span style={{ color: '#526166' }}>En {name} ahorraste</span></h1>
              <span className="num count" style={{ fontSize: 66, lineHeight: '68px', fontWeight: 800, letterSpacing: '-0.035em' }}>{fmt(saved)}</span>
              {spentM > 0 && <span className="num" style={{ fontSize: 15, lineHeight: '20px', color: '#36474D' }}>Tenías previsto {fmt(total)}; {fmt(spentM)} fueron a {dec.length === 1 ? dec[0].item : `${dec.length} compras`}.</span>}
            </div>
            <div role="img" aria-label={`${monthLabel(d)}, ${fmt(saved)}: ${parts.map((p) => `${p.g.name} ${fmt(p.v)}`).join(', ')}, ahorro libre ${fmt(free)}.`} className="bar bar-grow" style={{ height: 44 }}>
              {bar.map((b, i) => <div key={b.k} style={{ background: b.bg, ...(i === bar.length - 1 ? { flexGrow: 1 } : { width: `${((b.v / base) * 100).toFixed(1)}%` }) }} />)}
            </div>
            <div aria-hidden="true" className="leg num">
              {parts.map((p) => <div key={p.g.id} className="li"><span><span className="sw" style={{ background: GOAL[p.g.color].bg }} />{p.g.name}</span><b>{fmt(p.v)}</b></div>)}
              {dec.map((x) => <div key={x.id} className="li"><span><span className="sw" style={{ background: '#C4C9CB' }} />{x.item}</span><b>{fmt(x.amount)}</b></div>)}
              <div className="li"><span><span className="sw" style={{ background: 'repeating-linear-gradient(150deg, #11242B 0 1.5px, #FFFFFF 1.5px 4px)' }} />Ahorro libre</span><b>{fmt(free)}</b></div>
            </div>
          </> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 400, letterSpacing: '-0.02em' }}><span style={{ color: '#526166' }}>En {name}</span> <b style={{ fontWeight: 800 }}>todavía no usabas Make It.</b></h1>
              <span style={{ fontSize: 15, lineHeight: '20px', color: '#36474D' }}>Tu historial empieza en {MONTHS[toDate(goals.map((g) => g.created_at.slice(0, 10)).sort()[0] || iso(new Date())).getMonth()]}, cuando creaste tu primera meta.</span>
            </div>
          )}
        </section>
        <div ref={list} style={{ padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {existed.length > 0 && <span className="lbl" style={{ color: '#526166', padding: '6px 4px' }}>Tus metas al cierre de {name}</span>}
          {existed.map((g) => { const s = atClose(g.id), pct = Math.round((s / g.target) * 100), v = contrib(g.id); return (
            <article key={g.id} aria-label={`${g.name} en ${name}: ${fmt(s)} de ${fmt(g.target)}, ${pct}%. ${v ? `${day} ${MONTHS[d.getMonth()].slice(0, 3)} · Aporte +${fmt(v)}` : 'Sin aporte'}`} style={{ background: GOAL[g.color].bg, borderRadius: 32, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="row"><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b40" style={{ background: GOAL[g.color].soft }}>{g.emoji}</span><span style={{ fontSize: 20, lineHeight: '25px', fontWeight: 700 }}>{g.name}</span></span><PrioChip p={g.priority} /></div>
              <div aria-hidden="true" className="num" style={{ fontSize: 15, lineHeight: '20px' }}><b style={{ fontSize: 30, lineHeight: '34px', fontWeight: 800, letterSpacing: '-0.02em' }}>{fmt(s)}</b> <span style={{ whiteSpace: 'nowrap' }}>de {fmt(g.target)}</span></div>
              <div aria-hidden="true" style={{ height: 12, borderRadius: 999, background: 'rgba(17,36,43,0.2)', overflow: 'hidden' }}><div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: '#11242B', borderRadius: 999 }} /></div>
              <div aria-hidden="true" className="row num" style={{ fontSize: 13, lineHeight: '18px', paddingTop: 10, borderTop: '1px solid rgba(17,36,43,0.15)' }}><span>{v ? `${g.created_at.slice(0, 7) === key ? fmtDay(g.created_at.slice(0, 10)) : `${day} ${MONTHS[d.getMonth()].slice(0, 3)}`} · Aporte +${fmt(v)}` : 'Sin aporte este mes'}</span><b style={{ fontWeight: 700 }}>{pct}% al cierre</b></div>
            </article>
          ); })}
          {later.length > 0 && <p className="hint" style={{ margin: '4px 4px 0' }}>{later.length === 1 ? `${later[0].name} todavía no existía: la creaste el ${fmtDay(later[0].created_at.slice(0, 10))}.` : `${joinY(later.map((g) => g.name))} todavía no existían en ${name}.`}</p>}
        </div>
      </div>
      <ScrollEdge on={scrolled} h={130} />
      <TabBar current={0} scrolled />
    </Screen>
  );
}
