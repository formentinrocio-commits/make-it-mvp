import { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { Screen, useGo, Arrow, Plus, useStagger } from '../ui/nav';
import { HEADER_BG, PrioChip, arrivalLabel, savingWhere } from '../ui/parts';
import TabBar, { GlassDefs, ScrollEdge } from '../ui/TabBar';
import { GOAL, stripes } from '../lib/tokens';
import { fmt, fmtMonthLong } from '../lib/money';
import { delayLabel, type GoalView } from '../lib/model';

export const initials = (name?: string) => { const w = (name || '?').trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[1][0] : w[0].slice(0, 2)).toUpperCase(); };

/* Guarda el rectángulo de la card para que el detalle se abra desde ahí */
export const rememberCard = (e: React.MouseEvent, id: string) => {
  const card = e.currentTarget as HTMLElement, root = card.closest('.device') as HTMLElement;
  if (!root) return;
  const rr = root.getBoundingClientRect(), r = card.getBoundingClientRect();
  try { sessionStorage.setItem('mi-card', JSON.stringify({ id, t: r.top - rr.top, l: r.left - rr.left, b: rr.bottom - r.bottom, r: rr.right - r.right })); } catch { /* */ }
};

export function TopBar({ month = true }: { month?: boolean }) {
  const go = useGo();
  const { profile } = useStore();
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 4, height: 108, padding: '54px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      {month ? <span className="glassbar chipglass" style={{ whiteSpace: 'nowrap' }}><span aria-hidden="true" className="badge b32" style={{ background: '#FFFFFF' }}>🗓️</span><span className="lbl" style={{ color: '#11242B' }}>{fmtMonthLong(new Date())}</span></span> : <span />}
      <button type="button" className="avatar" aria-label="Tu perfil" onClick={() => go('/perfil', 'tab-r')}>{initials(profile?.name)}</button>
    </div>
  );
}

export function GoalCard({ g, delay, onOpen, compact, plain }: { g: GoalView; delay: number; onOpen: (e: React.MouseEvent) => void; compact?: boolean; plain?: boolean }) {
  const c = GOAL[g.color];
  const pct = Math.round(g.pct);
  const when = arrivalLabel(g.arrival, g.created_at);
  const aria = `${g.name}, ${g.priority === 'protegida' ? 'protegida' : 'prioridad ' + g.priority}. ${fmt(g.saved)} de ${fmt(g.target)}, ${pct}% ahorrado. Fecha: ${when}.${delay ? ` Se movió ${delayLabel(delay)}.` : ''} ${fmt(g.thisMonth)} este mes. Ver detalle.`;
  if (compact) return (
    <button type="button" className="gh" aria-label={aria} onClick={onOpen} style={{ background: c.bg, borderRadius: 32, padding: '16px 22px 18px', display: 'flex', flexDirection: 'column', gap: 10, color: '#11242B', border: 0, textAlign: 'left', cursor: 'pointer', width: '100%' }}>
      <div className="row" style={{ width: '100%' }}><span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}><span aria-hidden="true" className="badge b40" style={{ background: c.soft }}>{g.emoji}</span><span style={{ fontSize: 20, lineHeight: '25px', fontWeight: 700, letterSpacing: '-0.01em' }}>{g.name}</span></span><PrioChip p={g.priority} /></div>
      <div className="num" aria-hidden="true" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, fontSize: 13, lineHeight: '18px', whiteSpace: 'nowrap', width: '100%' }}><span><b style={{ fontSize: 17, lineHeight: '22px', fontWeight: 800 }}>{fmt(g.saved)}</b> · {pct}%</span><span>{fmt(g.monthly)} por mes · {when}</span></div>
    </button>
  );
  return (
    <button type="button" className="gh" aria-label={aria} onClick={onOpen} style={{ background: c.bg, borderRadius: 32, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12, color: '#11242B', border: 0, textAlign: 'left', cursor: 'pointer', width: '100%' }}>
      <div className="row" style={{ width: '100%' }}><span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}><span aria-hidden="true" className="badge b40" style={{ background: c.soft }}>{g.emoji}</span><span style={{ fontSize: 20, lineHeight: '25px', fontWeight: 700, letterSpacing: '-0.01em' }}>{g.name}</span></span><PrioChip p={g.priority} /></div>
      <div className="num" style={{ fontSize: 15, lineHeight: '20px' }}><b style={{ fontSize: 30, lineHeight: '34px', fontWeight: 800, letterSpacing: '-0.02em' }}>{fmt(g.saved)}</b> <span style={{ whiteSpace: 'nowrap' }}>de {fmt(g.target)}</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
        <div aria-hidden="true" style={{ height: 12, borderRadius: 999, background: 'rgba(17,36,43,0.2)', overflow: 'hidden' }}><div className="gh-fill" style={{ width: `${pct}%`, height: '100%', background: '#11242B', borderRadius: 999 }} /></div>
        <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, lineHeight: '18px' }}><b style={{ fontWeight: 700 }}>{pct}% ahorrado</b><b style={{ fontWeight: 700 }}>{when}</b></div>
      </div>
      {plain ? <span className="num" style={{ fontSize: 13, lineHeight: '18px' }}>{fmt(g.monthly)} por mes</span> : <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, width: '100%' }}>
        {delay > 0 ? <span className="delta"><Arrow />{delayLabel(delay)}</span> : <span className="num" style={{ fontSize: 13, lineHeight: '18px' }}>{fmt(g.monthly)} por mes</span>}
        <span className="num" style={{ fontSize: 13, lineHeight: '18px', whiteSpace: 'nowrap' }}>{g.missing <= 0 ? '¡Llegaste!' : g.monthsLeft <= 0 ? 'Llega este mes' : `Llega en ${g.monthsLeft} ${g.monthsLeft === 1 ? 'mes' : 'meses'}`}</span>
      </div>}
    </button>
  );
}

export default function Inicio() {
  const go = useGo();
  const { profile, goals, freePlanned, freeLeft, monthDecisions, spent } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  useStagger(list, ':scope > *', 160, 80);

  const total = profile?.monthly_saving || 0;
  const saving = Math.max(0, total - spent);
  const delayOf = (id: string) => monthDecisions.reduce((s, d) => s + d.impacts.filter((i) => i.goal_id === id).reduce((a, i) => a + i.delay_days, 0), 0);
  const sorted = [...goals].sort((a, b) => a.arrival.localeCompare(b.arrival));
  const long = (g: GoalView) => (new Date(g.arrival).getTime() - Date.now()) / 86400000 > 365 * 5;
  const free = spent > 0 ? freeLeft : freePlanned;
  const parts = spent > 0
    ? [...goals.map((g) => ({ k: g.id, bg: GOAL[g.color].bg, v: g.thisMonth })), { k: 'free', bg: stripes(), v: freeLeft }]
    : [...goals.map((g) => ({ k: g.id, bg: GOAL[g.color].bg, v: g.monthly })), { k: 'free', bg: stripes(), v: freePlanned }];
  const base = parts.reduce((s, p) => s + p.v, 0) || 1;

  const open = (e: React.MouseEvent, g: GoalView) => { rememberCard(e, g.id); go(`/meta/${g.id}`, 'none'); };

  return (
    <Screen>
      <GlassDefs />
      <div className="scroller" onScroll={(e) => { const s = e.currentTarget.scrollTop > 120; if (s !== scrolled) setScrolled(s); }}>
        <TopBar />
        <section style={{ marginTop: -108, padding: '112px 20px 24px', borderRadius: '0 0 40px 40px', background: HEADER_BG, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 400, letterSpacing: '-0.02em' }}>Hola <span aria-hidden="true" className="emoji">👋</span> <b style={{ fontWeight: 800 }}>{profile?.name},</b><br /><span style={{ color: '#526166' }}>este mes ahorrás</span></h1>
            <span className="num count" style={{ fontSize: 66, lineHeight: '68px', fontWeight: 800, letterSpacing: '-0.035em' }}>{fmt(saving)}</span>
            {spent > 0 && (() => { const w = savingWhere(goals, freeLeft); return <>
              {w.to && <span style={{ fontSize: 20, lineHeight: '26px', fontWeight: 600, letterSpacing: '-0.01em' }}>{w.to}</span>}
              <span className="num" style={{ fontSize: 15, lineHeight: '20px', color: '#36474D', marginTop: 6 }}>{w.off ? `${w.off} ` : ''}Tenías previsto {fmt(total)}; {fmt(spent)} {monthDecisions.length === 1 ? `fueron a ${monthDecisions[0].item}` : `fueron a ${monthDecisions.length} compras`}.</span>
            </>; })()}
          </div>
          <div role="img" aria-label={`Distribución de ${fmt(saving)}: ${goals.map((g) => `${g.name} ${fmt(spent ? g.thisMonth : g.monthly)}`).join(', ')}, ahorro libre ${fmt(free)}.`} className="bar bar-grow" style={{ height: 44 }}>
            {parts.filter((p) => p.v > 0).map((p, i, a) => <div key={p.k} style={{ background: p.bg, ...(i === a.length - 1 ? { flexGrow: 1 } : { width: `${((p.v / base) * 100).toFixed(1)}%` }) }} />)}
          </div>
          {spent > 0 ? (
            <div className="leg num">
              <span className="lbl" style={{ color: '#526166', paddingTop: 4 }}>Ahorrado este mes</span>
              {goals.map((g) => <div key={g.id} className="li"><span><span className="sw" style={{ background: GOAL[g.color].bg }} />{g.name}{g.thisMonth !== g.monthly && <span style={{ color: '#526166' }}> (previsto {fmt(g.monthly)})</span>}</span><b>{fmt(g.thisMonth)}</b></div>)}
              <div className="li"><span><span className="sw" style={{ background: 'repeating-linear-gradient(150deg, #11242B 0 1.5px, #FFFFFF 1.5px 4px)' }} />Ahorro libre{freeLeft !== freePlanned && <span style={{ color: '#526166' }}> (previsto {fmt(freePlanned)})</span>}</span><b>{fmt(freeLeft)}</b></div>
              <span className="lbl" style={{ color: '#526166', paddingTop: 4 }}>Gastado</span>
              {monthDecisions.map((d) => (
                <div key={d.id} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div className="li"><span>{d.item}</span><b>{fmt(d.amount)}</b></div>
                  <span style={{ fontSize: 13, lineHeight: '18px', color: '#526166' }}>Salió de: {[d.from_free > 0 ? `Ahorro libre ${fmt(d.from_free)}` : '', ...d.impacts.map((i) => `${i.name} ${fmt(i.taken)}`)].filter(Boolean).map((t, k) => <span key={k}>{k ? ' · ' : ''}<span style={{ whiteSpace: 'nowrap' }}>{t}</span></span>)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div aria-hidden="true" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', fontSize: 13, lineHeight: '18px' }}>
              {goals.map((g) => <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="sw" style={{ background: GOAL[g.color].bg }} />{g.name}</span>)}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span className="sw" style={{ background: 'repeating-linear-gradient(150deg, #11242B 0 1.5px, #FFFFFF 1.5px 4px)', boxShadow: 'inset 0 0 0 1px rgba(17,36,43,0.25)' }} />Ahorro libre</span>
            </div>
          )}
          {!spent && <div className="num row" style={{ background: '#FFFFFF', borderRadius: 24, padding: '14px 18px' }}><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>Ahorro libre</b><span className="hint">Lo que queda después de tus metas</span></span><b style={{ fontSize: 30, lineHeight: '34px', fontWeight: 800, letterSpacing: '-0.02em' }}>{fmt(freePlanned)}</b></div>}
        </section>
        <div style={{ height: 12 }} />
        <div style={{ position: 'sticky', top: 108, zIndex: 3, padding: '10px 20px 10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="lbl" style={{ color: '#526166' }}>Tus metas</span>
          <button type="button" className="newgoal" onClick={() => go('/nueva-meta', 'up')}><Plus c="#11242B" s={14} />Nueva meta</button>
        </div>
        <div ref={list} style={{ padding: '4px 20px 120px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((g) => <GoalCard key={g.id} g={g} delay={delayOf(g.id)} compact={long(g) && !delayOf(g.id)} onOpen={(e) => open(e, g)} />)}
        </div>
      </div>
      <ScrollEdge on={scrolled} />
      <TabBar current={0} scrolled={scrolled} coach />
    </Screen>
  );
}
