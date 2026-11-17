import { useEffect, useMemo, useRef, useState } from 'react';
import { MONTHS } from '../lib/money';

/* Calendario al estilo del UIDatePicker de iOS (estilo "inline"):
   mes y año con flecha arriba a la izquierda (abre las ruedas de mes y año),
   flechas de mes a la derecha, días de la semana en gris, hoy en color y el día elegido en un círculo lleno.
   También se pasa de mes deslizando el calendario hacia los costados. */

const ACCENT = '#11242B';
const WD = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const ROW = 34;

type D = { d: number; m: number; y: number };

const Chev = ({ dir, c = ACCENT }: { dir: 'l' | 'r'; c?: string }) => (
  <svg width="12" height="20" viewBox="0 0 12 20" fill="none" stroke={c} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={dir === 'l' ? 'M9.5 2.5L2.5 10l7 7.5' : 'M2.5 2.5l7 7.5-7 7.5'} /></svg>
);

/* Una columna de rueda: scroll con imán, el elemento centrado es el elegido */
function Wheel({ items, index, onChange, label, width }: { items: string[]; index: number; onChange: (i: number) => void; label: string; width: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const t = useRef<number | undefined>(undefined);
  const [cur, setCur] = useState(index);
  useEffect(() => { const el = ref.current; if (el) el.scrollTop = index * ROW; setCur(index); }, [index]);
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ROW)));
    if (i !== cur) setCur(i);
    clearTimeout(t.current);
    t.current = window.setTimeout(() => { if (i !== index) onChange(i); }, 140);
  };
  return (
    <div ref={ref} role="listbox" aria-label={label} tabIndex={0} onScroll={onScroll}
      onKeyDown={(e) => { if (e.key === 'ArrowDown' && index < items.length - 1) { e.preventDefault(); onChange(index + 1); } if (e.key === 'ArrowUp' && index > 0) { e.preventDefault(); onChange(index - 1); } }}
      className="wheel" style={{ width, height: ROW * 5, overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none', position: 'relative', zIndex: 1, maskImage: 'linear-gradient(transparent, #000 34%, #000 66%, transparent)', WebkitMaskImage: 'linear-gradient(transparent, #000 34%, #000 66%, transparent)' }}>
      <div style={{ height: ROW * 2 }} />
      {items.map((it, i) => (
        <div key={it + i} role="option" aria-selected={i === cur} onClick={() => onChange(i)}
          style={{ height: ROW, scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 21, lineHeight: '25px', color: '#11242B', opacity: Math.abs(i - cur) === 0 ? 1 : Math.abs(i - cur) === 1 ? 0.55 : 0.3, transform: `scale(${i === cur ? 1 : 0.94})`, transition: 'opacity 120ms ease, transform 120ms ease', cursor: 'pointer', userSelect: 'none' }}>{it}</div>
      ))}
      <div style={{ height: ROW * 2 }} />
    </div>
  );
}

export default function DatePicker({ value, onPick, min }: { value: D | null; onPick: (v: D) => void; min: Date }) {
  const minIdx = min.getFullYear() * 12 + min.getMonth(), minDay = min.getDate();
  const [view, setView] = useState(() => (value ? { m: value.m, y: value.y } : { m: min.getMonth(), y: min.getFullYear() }));
  const [wheels, setWheels] = useState(false);
  const [anim, setAnim] = useState<'l' | 'r' | null>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [wheels]);
  const idx = view.y * 12 + view.m;
  const years = useMemo(() => Array.from({ length: 41 }, (_, i) => min.getFullYear() + i), [min]);

  const move = (n: number) => {
    const ni = idx + n; if (ni < minIdx) return;
    setAnim(n > 0 ? 'r' : 'l'); setView({ m: ((ni % 12) + 12) % 12, y: Math.floor(ni / 12) });
  };
  const cells = useMemo(() => {
    const first = (new Date(view.y, view.m, 1).getDay() + 6) % 7, nd = new Date(view.y, view.m + 1, 0).getDate();
    const out: ({ d: number; past: boolean; today: boolean; sel: boolean } | null)[] = Array(first).fill(null);
    for (let d = 1; d <= nd; d++) out.push({ d, past: idx < minIdx || (idx === minIdx && d <= minDay), today: idx === minIdx && d === minDay, sel: !!value && value.d === d && value.m === view.m && value.y === view.y });
    return out;
  }, [view, value, idx, minIdx, minDay]);

  /* Deslizar para cambiar de mes */
  const sw = useRef<{ x: number; y: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { sw.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: React.PointerEvent) => {
    const s = sw.current; sw.current = null; if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
  };

  return (
    <div ref={box} role="group" aria-label="Calendario" className="ios-cal mi-pop" style={{ scrollMarginBottom: 120 }}>
      <div className="row" style={{ padding: '2px 4px 6px 8px', minHeight: 44 }}>
        <button type="button" onClick={() => setWheels(!wheels)} aria-expanded={wheels} aria-label={`${cap(MONTHS[view.m])} ${view.y}. ${wheels ? 'Cerrar' : 'Elegir'} mes y año`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, background: 'transparent', padding: '6px 4px', cursor: 'pointer', font: '600 17px/22px var(--font)', color: wheels ? ACCENT : '#11242B' }}>
          <span aria-live="polite">{cap(MONTHS[view.m])} {view.y}</span>
          <span style={{ display: 'grid', transform: wheels ? 'rotate(90deg)' : 'none', transition: 'transform 220ms ease' }}><svg width="8" height="13" viewBox="0 0 8 13" fill="none" stroke={ACCENT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1.5 1.5l5 5-5 5" /></svg></span>
        </button>
        {!wheels && <span style={{ display: 'flex', gap: 2 }}>
          <button type="button" className="ios-cal-nav" aria-label="Mes anterior" disabled={idx <= minIdx} onClick={() => move(-1)}><Chev dir="l" c={idx <= minIdx ? '#C4C9CB' : ACCENT} /></button>
          <button type="button" className="ios-cal-nav" aria-label="Mes siguiente" onClick={() => move(1)}><Chev dir="r" /></button>
        </span>}
      </div>

      {wheels ? (
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 4, padding: '8px 0 14px' }}>
          <div aria-hidden="true" style={{ position: 'absolute', left: 8, right: 8, top: 8 + ROW * 2, height: ROW, borderRadius: 9, background: 'rgba(118,118,128,0.12)' }} />
          <Wheel label="Mes" width={150} items={MONTHS.map(cap)} index={view.m} onChange={(m) => { const ni = view.y * 12 + m; setView(ni < minIdx ? { m: min.getMonth(), y: min.getFullYear() } : { m, y: view.y }); }} />
          <Wheel label="Año" width={90} items={years.map(String)} index={Math.max(0, years.indexOf(view.y))} onChange={(i) => { const y = years[i], ni = y * 12 + view.m; setView(ni < minIdx ? { m: min.getMonth(), y } : { m: view.m, y }); }} />
        </div>
      ) : (
        <div onPointerDown={onDown} onPointerUp={onUp} style={{ touchAction: 'pan-y' }}>
          <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: 13, lineHeight: '18px', fontWeight: 600, color: 'rgba(60,60,67,0.3)', padding: '0 0 4px' }}>{WD.map((d) => <span key={d}>{d}</span>)}</div>
          <div key={idx} className={anim ? `ios-cal-in-${anim}` : ''} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 2 }}>
            {cells.map((c, i) => c ? (
              <button key={i} type="button" disabled={c.past} aria-pressed={c.sel} aria-label={`${c.today ? 'Hoy, ' : ''}${c.d} de ${MONTHS[view.m]} de ${view.y}`} onClick={() => onPick({ d: c.d, m: view.m, y: view.y })}
                className={'ios-day' + (c.sel ? ' sel' : '') + (c.today ? ' today' : '')}>{c.d}</button>
            ) : <span key={i} />)}
          </div>
        </div>
      )}
    </div>
  );
}
