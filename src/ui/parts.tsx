import type { CSSProperties, ReactNode } from 'react';
import { GOAL, stripes } from '../lib/tokens';
import { fmt, fmtMonthShort, toDate, fmtDate } from '../lib/money';
import { PRIO_LABEL, type GoalView, type Priority } from '../lib/model';
import { Chevron, Lock } from './nav';

export const HEADER_BG = 'radial-gradient(120% 60% at 15% 0%, #FFFFFF 0%, rgba(255,255,255,0) 60%), radial-gradient(90% 55% at 100% 35%, #E4F2F9 0%, rgba(228,242,249,0) 70%), #EDEFF0';

/* Encabezado de pantalla interna: botón vidrio + etiqueta + título de dos pesos */
export function Header({ kicker, onBack, backLabel = 'Atrás', backIcon, right, children, sticky }: { kicker?: string; onBack?: () => void; backLabel?: string; backIcon?: ReactNode; right?: ReactNode; children?: ReactNode; sticky?: boolean }) {
  return (
    <header style={{ position: sticky ? 'sticky' : 'relative', top: 0, zIndex: 4, padding: 'var(--top) 20px 24px', borderRadius: '0 0 40px 40px', background: HEADER_BG, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="row" style={{ minHeight: 44 }}>
        {onBack ? <button type="button" className="glass" aria-label={backLabel} onClick={onBack}>{backIcon || <Chevron />}</button> : null}
        {kicker && <span className="lbl" style={{ color: '#526166', marginLeft: onBack ? 0 : undefined }}>{kicker}</span>}
        {right}
      </div>
      {children}
    </header>
  );
}

export const H1 = ({ a, b, after, style }: { a?: string; b: string; after?: string; style?: CSSProperties }) => (
  <h1 className="num" style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 400, letterSpacing: '-0.02em', ...style }}>{a}<b style={{ fontWeight: 800 }}>{b}</b>{after}</h1>
);

export const X = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#11242B" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
);

export function Lvl({ p }: { p: Priority }) {
  const n = p === 'alta' ? 3 : p === 'media' ? 2 : 1;
  return <span className="lvl" aria-hidden="true"><i className="on" /><i className={n >= 2 ? 'on' : ''} /><i className={n >= 3 ? 'on' : ''} /></span>;
}

export function PrioChip({ p, style }: { p: Priority; style?: CSSProperties }) {
  return <span className="prio" style={style}>{p === 'protegida' ? <Lock /> : <Lvl p={p} />} {PRIO_LABEL[p]}</span>;
}

/* Fecha de llegada: metas largas (más de 5 años) en mes y año */
export const arrivalLabel = (iso: string, created?: string) => {
  const d = toDate(iso), base = created ? toDate(created.slice(0, 10)) : new Date();
  return (d.getTime() - base.getTime()) / 86400000 > 365 * 5 ? fmtMonthShort(d) : fmtDate(iso);
};
export const arrivalPrep = (iso: string) => ((toDate(iso).getTime() - Date.now()) / 86400000 > 365 * 5 ? 'en ' : 'el ');

/* Card de meta en su color: ahorrado, %, barra, aporte y llegada */
export function GoalHero({ g, onClick, extra }: { g: GoalView; onClick?: () => void; extra?: ReactNode }) {
  const c = GOAL[g.color];
  const pct = Math.round(g.pct);
  const body = (
    <>
      <div className="row"><span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span aria-hidden="true" className="badge b40" style={{ background: c.soft }}>{g.emoji}</span><span style={{ fontSize: 20, lineHeight: '25px', fontWeight: 700, letterSpacing: '-0.01em', textAlign: 'left' }}>{g.name}</span></span><PrioChip p={g.priority} /></div>
      <span style={{ fontSize: 13, lineHeight: '18px', fontWeight: 600, textAlign: 'left' }}>Ya ahorrado</span>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: -8, gap: 8 }}><span className="num" style={{ fontSize: 15, lineHeight: '20px', textAlign: 'left' }}><b style={{ fontSize: 30, lineHeight: '34px', fontWeight: 800, letterSpacing: '-0.02em' }}>{fmt(g.saved)}</b> <span style={{ whiteSpace: 'nowrap' }}>de {fmt(g.target)}</span></span><span className="num" style={{ fontSize: 30, lineHeight: '34px', fontWeight: 400, letterSpacing: '-0.02em' }}>{pct}%</span></div>
      <div aria-hidden="true" style={{ height: 12, borderRadius: 999, background: 'rgba(17,36,43,0.2)', overflow: 'hidden' }}><div className="gh-fill" style={{ width: `${g.pct.toFixed(1)}%`, height: '100%', background: '#11242B', borderRadius: 999 }} /></div>
      <div className="num" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 14, lineHeight: '19px', paddingTop: 10, borderTop: '1px solid rgba(17,36,43,0.15)' }}><span>{fmt(g.monthly)} por mes</span><span>Llegás {arrivalPrep(g.arrival)}<b style={{ fontWeight: 600 }}>{arrivalLabel(g.arrival, g.created_at)}</b></span></div>
      {extra}
    </>
  );
  const st: CSSProperties = { background: c.bg, borderRadius: 32, padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12, color: '#11242B', border: 0, width: '100%', font: 'inherit', textAlign: 'left' };
  const aria = `${g.name}, ${g.priority === 'protegida' ? 'protegida' : 'prioridad ' + PRIO_LABEL[g.priority].toLowerCase()}: ${fmt(g.saved)} de ${fmt(g.target)}, ${pct}% ahorrado. ${fmt(g.monthly)} por mes. Llegás ${arrivalPrep(g.arrival)}${arrivalLabel(g.arrival, g.created_at)}.`;
  return onClick ? <button type="button" className="gh no-press-soft" aria-label={aria} onClick={onClick} style={{ ...st, cursor: 'pointer' }}>{body}</button> : <article className="gh" aria-label={aria} style={st}>{body}</article>;
}

/* Barra de distribución del ahorro del mes + leyenda */
export function MonthSplit({ total, goals, free, title = 'Tu ahorro del mes', bigFree = true }: { total: number; goals: { name: string; color: GoalView['color']; amount: number }[]; free: number; title?: string; bigFree?: boolean }) {
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <section className="card num" aria-label="Tu mes" style={{ gap: 14 }}>
      <div className="row"><span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>{title}</span><b style={{ fontSize: 17, fontWeight: 600 }}>{fmt(total)}</b></div>
      <div role="img" aria-label={`Distribución de ${fmt(total)}: ${goals.map((g) => `${g.name} ${fmt(g.amount)}`).join(', ')}${goals.length ? ', ' : ''}ahorro libre ${fmt(free)}.`} className="bar" style={{ height: 36 }}>
        {goals.filter((g) => g.amount > 0).map((g) => <div key={g.name} style={{ width: `${pct(g.amount).toFixed(1)}%`, background: GOAL[g.color].bg }} />)}
        {free > 0 && <div style={{ flexGrow: 1, background: stripes() }} />}
      </div>
      <div className="leg">
        {goals.map((g) => <div key={g.name} className="li"><span><span className="sw" style={{ background: GOAL[g.color].bg }} />{g.name}</span><b>{fmt(g.amount)}</b></div>)}
        <div className="li"><span><span className="sw" style={{ background: 'repeating-linear-gradient(150deg, #11242B 0 1.5px, #FFFFFF 1.5px 4px)' }} />Ahorro libre</span><b>{fmt(free)}</b></div>
      </div>
      {bigFree && <div className="row" style={{ background: '#EDEFF0', borderRadius: 20, padding: '12px 16px', margin: '2px -8px 0' }}><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>Ahorro libre</b><span style={{ fontSize: 13, lineHeight: '18px', color: '#526166' }}>Lo que queda después de tus metas</span></span><b style={{ fontSize: 30, lineHeight: '34px', fontWeight: 800, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>{fmt(free)}</b></div>}
    </section>
  );
}

/* Pie fijo con fundido */
export function Foot({ children, bg = '#F5F5F5', gap = 10 }: { children: ReactNode; bg?: string; gap?: number }) {
  const t = bg === '#FFFFFF' ? 'rgba(255,255,255,0)' : 'rgba(245,245,245,0)';
  return <div className="foot" style={{ gap, background: `linear-gradient(${t}, ${bg} 24px)` }}>{children}</div>;
}

/* Campo de dinero: $ + número con puntos de miles */
export function MoneyInput({ id, value, onChange, label, big, bad, describedBy, autoFocus }: { id?: string; value: number; onChange: (n: number) => void; label?: string; big?: boolean; bad?: boolean; describedBy?: string; autoFocus?: boolean }) {
  const s = big ? { fontSize: 36, lineHeight: '42px', fontWeight: 800, letterSpacing: '-0.02em' } : {};
  return (
    <span className={'fbox' + (bad ? ' bad' : '')} style={{ minHeight: big ? 84 : 64 }}>
      <span aria-hidden="true" style={{ font: '600 20px/24px var(--font)', color: '#526166', ...s }}>$</span>
      <input id={id} className="fin" inputMode="numeric" autoComplete="off" autoFocus={autoFocus} aria-label={label} aria-invalid={bad} aria-describedby={describedBy} placeholder="0" style={s}
        value={value ? Math.round(value).toLocaleString('es-AR') : ''} onChange={(e) => { const d = e.target.value.replace(/\D/g, '').slice(0, 11); onChange(d ? parseInt(d, 10) : 0); }} />
      {value > 0 && <button type="button" className="clr" aria-label="Borrar monto" onMouseDown={(e) => e.preventDefault()} onClick={() => onChange(0)}><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="8" fill="#899397" /><path d="M6 6l6 6M12 6l-6 6" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" /></svg></button>}
    </span>
  );
}

/* Dónde queda el ahorro del mes después de las compras: qué metas reciben aporte y cuáles no */
export const joinY = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);
export function savingWhere(goals: GoalView[], freeLeft: number) {
  const to = goals.filter((g) => g.thisMonth > 0).map((g) => g.name);
  if (freeLeft > 0) to.push('tu ahorro libre');
  const off = goals.filter((g) => g.monthly > 0 && g.thisMonth <= 0).map((g) => g.name);
  return {
    to: to.length ? `en ${joinY(to)}` : '',
    off: off.length ? `${joinY(off)} no ${off.length === 1 ? 'recibe' : 'reciben'} aporte este mes.` : '',
  };
}
