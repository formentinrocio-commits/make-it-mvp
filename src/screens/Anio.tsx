import { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { Screen, useGo, useStagger } from '../ui/nav';
import { HEADER_BG } from '../ui/parts';
import TabBar, { ScrollEdge } from '../ui/TabBar';
import { GOAL, stripes } from '../lib/tokens';
import { fmt, iso, monthStart, toDate, MONTHS, addMonths, fmtMonthShort } from '../lib/money';
import { thisMonth } from '../lib/model';
import { arrivalLabel } from '../ui/parts';
import { rememberCard } from './Inicio';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const ChevR = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#11242B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>;

function untilLabel(isoDate: string) {
  const d = toDate(isoDate), n = new Date();
  const m = (d.getFullYear() - n.getFullYear()) * 12 + (d.getMonth() - n.getMonth());
  if (m <= 0) return 'Este mes';
  if (m < 24) return `En ${m} ${m === 1 ? 'mes' : 'meses'}`;
  return `En ${Math.round(m / 12)} años`;
}

export default function Anio() {
  const go = useGo();
  const { goals, profile, decisions, freePlanned } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  useStagger(body, ':scope > *', 160, 100);

  const now = new Date(), year = now.getFullYear(), tm = thisMonth();
  const total = profile?.monthly_saving || 0;
  const first = goals.length ? goals.map((g) => g.created_at.slice(0, 10)).sort()[0] : iso(now);
  let m = monthStart(toDate(first));
  if (m.getFullYear() < year) m = new Date(year, 0, 1, 12);
  const months: { key: string; d: Date }[] = [];
  while (m.getFullYear() === year) { months.push({ key: iso(m), d: m }); m = addMonths(m, 1); }

  const rowFor = (key: string) => {
    const past = key < tm, cur = key === tm;
    const parts = goals.filter((g) => g.created_at.slice(0, 7) <= key.slice(0, 7)).map((g) => {
      const v = past || cur ? g.contribs.filter((c) => c.month === key).reduce((s, c) => s + c.amount, 0) : g.monthly;
      return { id: g.id, name: g.name, color: g.color, v, planned: g.monthly };
    });
    const dec = decisions.filter((d) => d.month === key && d.decision === 'comprar');
    const spentM = dec.reduce((s, d) => s + d.amount, 0);
    const free = past || cur ? Math.max(0, total - parts.reduce((s, p) => s + p.v, 0) - spentM) : freePlanned;
    return { past, cur, parts, free, dec, spentM };
  };

  const rows = months.map((x) => ({ ...x, ...rowFor(x.key) }));
  const aportado = rows.filter((r) => r.past || r.cur).reduce((s, r) => s + r.parts.reduce((a, p) => a + p.v, 0), 0);
  const libre = rows.filter((r) => r.past || r.cur).reduce((s, r) => s + r.free, 0);
  const next = [...goals].sort((a, b) => a.arrival.localeCompare(b.arrival));

  return (
    <Screen>
      <div className="scroller" onScroll={(e) => { const v = e.currentTarget.scrollTop > 120; if (v !== scrolled) setScrolled(v); }}>
        <header style={{ padding: '58px 20px 24px', borderRadius: '0 0 40px 40px', background: HEADER_BG, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="row" style={{ minHeight: 44 }}><span className="lbl" style={{ color: '#526166' }}>{year}</span></div>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 400, letterSpacing: '-0.02em' }}>Tu <b style={{ fontWeight: 800 }}>año</b></h1>
          <span className="num" style={{ fontSize: 17, lineHeight: '24px', color: '#36474D' }}>En {year} llevás <b style={{ color: '#11242B' }}>{fmt(aportado)}</b> aportados a tus metas y <b style={{ color: '#11242B' }}>{fmt(libre)}</b> de ahorro libre.</span>
        </header>
        <div ref={body} style={{ padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card" style={{ gap: 0, padding: '8px 0' }}>
            <div style={{ padding: '10px 22px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}><b style={{ fontSize: 17, lineHeight: '22px', fontWeight: 700 }}>Mes a mes</b><span className="hint">Cómo repartiste los {fmt(total)} de cada mes.</span></div>
            {rows.map((r) => {
              const name = cap(MONTHS[r.d.getMonth()]);
              const status = r.cur ? 'En curso · hoy' : r.past ? 'Cerrado' : 'Previsto';
              const all = r.parts.reduce((s, p) => s + p.v, 0) + r.free + r.spentM;
              const bar = (
                <div aria-hidden="true" style={{ display: 'flex', gap: 3, height: 20, width: '100%' }}>
                  {all <= 0 ? <div style={{ flexGrow: 1, borderRadius: 10, boxShadow: 'inset 0 0 0 1.5px #C4C9CB' }} /> : <>
                    {r.parts.filter((p) => p.v > 0).map((p) => <div key={p.id} style={{ width: `${((p.v / all) * 100).toFixed(1)}%`, borderRadius: 10, background: GOAL[p.color].bg }} />)}
                    {r.spentM > 0 && <div style={{ width: `${((r.spentM / all) * 100).toFixed(1)}%`, borderRadius: 10, background: '#C4C9CB' }} />}
                    {r.free > 0 && <div style={{ flexGrow: 1, borderRadius: 10, background: stripes() }} />}
                  </>}
                </div>
              );
              const aria = `${name} ${year}, ${status.toLowerCase()}: ${r.parts.map((p) => `${p.name} ${fmt(p.v)}`).join(', ')}, ahorro libre ${fmt(r.free)}.`;
              const head = <div className="row" style={{ width: '100%' }}><span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><b style={{ fontSize: 17, lineHeight: '22px', fontWeight: 700 }}>{name}</b><span className="hint">{status}</span></span><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><b className="num" style={{ fontSize: 17, fontWeight: 600 }}>{fmt(total)}</b>{(r.cur || r.past) && <span style={{ display: 'grid' }}><ChevR /></span>}</span></div>;
              const st = { display: 'flex', flexDirection: 'column' as const, gap: 8, padding: '14px 22px', borderTop: '1px solid #E3E6E7', color: '#11242B', background: 'transparent', border: 0, borderTopStyle: 'solid' as const, width: '100%', textAlign: 'left' as const, font: 'inherit' };
              if (r.cur) return <button key={r.key} type="button" aria-label={aria + ' Ir a hoy.'} onClick={() => go('/inicio', 'tab-l')} style={{ ...st, cursor: 'pointer', borderTop: '1px solid #E3E6E7' }}>{head}{bar}</button>;
              if (!r.past) return <div key={r.key} aria-label={aria} style={{ ...st, borderTop: '1px solid #E3E6E7' }}>{head}{bar}</div>;
              return <button key={r.key} type="button" aria-label={aria + ' Ver el mes.'} onClick={() => go(`/mes/${r.key.slice(0, 7)}`, 'up')} style={{ ...st, cursor: 'pointer', borderTop: '1px solid #E3E6E7' }}>{head}{bar}</button>;
            })}
            <div style={{ padding: '12px 22px 6px', borderTop: '1px solid #E3E6E7' }}>
              <div aria-hidden="true" className="leg">
                {goals.map((g) => <div key={g.id} className="li"><span><span className="sw" style={{ background: GOAL[g.color].bg }} />{g.name}</span><b>{g.priority === 'protegida' ? 'Protegida' : g.created_at.slice(0, 4) === String(year) ? `Desde ${fmtMonthShort(toDate(g.created_at.slice(0, 10))).split(' ')[0]}` : ''}</b></div>)}
                <div className="li"><span><span className="sw" style={{ background: 'repeating-linear-gradient(150deg, #11242B 0 1.5px, #FFFFFF 1.5px 4px)' }} />Ahorro libre</span><b /></div>
              </div>
            </div>
          </div>
          {next.length > 0 && (
            <section aria-label="Próximas llegadas" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span className="lbl" style={{ color: '#526166', padding: '0 6px' }}>Próximas llegadas</span>
              <div className="card" style={{ gap: 0, padding: '4px 0' }}>
                {next.map((g) => (
                  <button key={g.id} type="button" className="gr" onClick={(e) => { rememberCard(e, g.id); go(`/meta/${g.id}`, 'none'); }} style={{ width: '100%', border: 0, background: 'transparent', cursor: 'pointer', font: 'inherit', color: '#11242B', textAlign: 'left' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b32" style={{ background: GOAL[g.color].soft }}>{g.emoji}</span><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontWeight: 600 }}>{g.name}</b><span className="hint">{untilLabel(g.arrival)}</span></span></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><b className="num" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{arrivalLabel(g.arrival, g.created_at)}</b><ChevR /></span>
                  </button>
                ))}
              </div>
            </section>
          )}
          <p className="hint" style={{ margin: 0, textAlign: 'center' }}>Tocá un mes para verlo. Los meses pasados se ven en modo lectura.</p>
        </div>
      </div>
      <ScrollEdge on={scrolled} h={130} />
      <TabBar current={2} scrolled={scrolled} />
    </Screen>
  );
}
