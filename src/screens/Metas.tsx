import { useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { Screen, useGo, Plus, useStagger } from '../ui/nav';
import { HEADER_BG } from '../ui/parts';
import TabBar, { ScrollEdge } from '../ui/TabBar';
import { GOAL } from '../lib/tokens';
import { fmt, fmtMonthLong } from '../lib/money';
import { GoalCard, rememberCard } from './Inicio';

const COUNT = ['', 'la única', 'las dos', 'las tres', 'las cuatro', 'las cinco', 'las seis'];

export default function Metas() {
  const go = useGo();
  const { goals } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  useStagger(list, ':scope > *', 160, 80);
  const total = goals.reduce((s, g) => s + g.saved, 0);
  const monthly = goals.reduce((s, g) => s + g.monthly, 0);
  const byDate = [...goals].sort((a, b) => a.arrival.localeCompare(b.arrival));
  const bySaved = [...goals].sort((a, b) => b.saved - a.saved);
  return (
    <Screen>
      <div className="scroller" onScroll={(e) => { const v = e.currentTarget.scrollTop > 120; if (v !== scrolled) setScrolled(v); }}>
        <header style={{ padding: '58px 20px 24px', borderRadius: '0 0 40px 40px', background: HEADER_BG, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="row" style={{ minHeight: 44 }}><span className="lbl" style={{ color: '#526166' }}>{fmtMonthLong(new Date())}</span></div>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 400, letterSpacing: '-0.02em' }}>Tus <b style={{ fontWeight: 800 }}>metas</b></h1>
          <div className="num" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 15, lineHeight: '20px' }}>Ahorrado en tus metas</span>
            <span className="count" style={{ fontSize: 52, lineHeight: '56px', fontWeight: 800, letterSpacing: '-0.03em' }}>{fmt(total)}</span>
            <span style={{ fontSize: 15, lineHeight: '20px', color: '#36474D' }}>Aportás {fmt(monthly)} por mes{goals.length > 1 ? ` entre ${COUNT[goals.length] || `las ${goals.length}`}` : ''}.</span>
          </div>
          {total > 0 && <div role="img" aria-label={`Ahorrado en metas, ${fmt(total)}: ${bySaved.map((g) => `${g.name} ${fmt(g.saved)}`).join(', ')}.`} className="bar bar-grow" style={{ height: 36 }}>
            {bySaved.filter((g) => g.saved > 0).map((g, i, a) => <div key={g.id} style={{ background: GOAL[g.color].bg, ...(i === a.length - 1 ? { flexGrow: 1 } : { width: `${((g.saved / total) * 100).toFixed(1)}%` }) }} />)}
          </div>}
          <div aria-hidden="true" className="leg num">{bySaved.map((g) => <div key={g.id} className="li"><span><span className="sw" style={{ background: GOAL[g.color].bg }} />{g.name}</span><b>{fmt(g.saved)}</b></div>)}</div>
        </header>
        <div ref={list} style={{ padding: '16px 20px 120px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="row" style={{ padding: '0 4px 4px' }}><span className="lbl" style={{ color: '#526166' }}>Ordenadas por fecha</span><button type="button" className="newgoal" onClick={() => go('/nueva-meta', 'up')}><Plus c="#11242B" s={14} />Nueva meta</button></div>
          {byDate.map((g) => <GoalCard key={g.id} g={g} delay={0} plain onOpen={(e) => { rememberCard(e, g.id); go(`/meta/${g.id}`, 'none'); }} />)}
          {!goals.length && <p className="hint" style={{ textAlign: 'center', padding: 24 }}>Todavía no tenés metas. Creá la primera.</p>}
        </div>
      </div>
      <ScrollEdge on={scrolled} h={130} />
      <TabBar current={1} scrolled={scrolled} />
    </Screen>
  );
}
