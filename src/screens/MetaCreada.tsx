import { useRef } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { Screen, useGo, Lock, useStagger } from '../ui/nav';
import { Foot, GoalHero, Header, MonthSplit } from '../ui/parts';

/* E1/E2 — Meta creada: la card en su color, cómo queda el mes y ¿Sumás otra meta? */
export default function MetaCreada() {
  const { id } = useParams();
  const go = useGo();
  const { goals, profile, freePlanned, saveProfile } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  useStagger(ref);
  const g = goals.find((x) => x.id === id);
  if (!g) return <Navigate to="/" replace />;
  const prioCopy = g.priority === 'protegida' ? 'Protegida: al evaluar una compra, nunca te vamos a proponer sacar de acá.'
    : g.priority === 'alta' ? 'Alta: si una compra no entra en tu ahorro libre, la tocamos después que a las metas de menor prioridad.'
    : g.priority === 'media' ? 'Media: puede ajustarse algún mes si una compra no entra en tu ahorro libre.'
    : 'Baja: es la primera que proponemos ajustar si una compra no entra en tu ahorro libre.';
  const toHome = async () => { if (!profile?.onboarded) await saveProfile({ onboarded: true }); go('/inicio', 'fade'); };
  return (
    <Screen>
      <div className="scroller">
        <Header kicker="Meta creada"><h1 style={{ margin: 0, fontSize: 34, lineHeight: '40px', fontWeight: 400, letterSpacing: '-0.02em' }}><b style={{ fontWeight: 800 }}>{g.name},</b> en marcha.</h1></Header>
        <div ref={ref} style={{ padding: '16px 20px 250px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <GoalHero g={g} />
          <p style={{ margin: 0, display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, lineHeight: '19px', color: '#36474D' }}><span style={{ flex: 'none', marginTop: 3 }}><Lock /></span><span>{prioCopy}</span></p>
          <MonthSplit total={profile?.monthly_saving || 0} goals={goals.map((x) => ({ name: x.name, color: x.color, amount: x.monthly }))} free={freePlanned} />
        </div>
      </div>
      <Foot gap={10}>
        <p style={{ margin: '0 0 4px', textAlign: 'center', fontSize: 17, lineHeight: '22px', fontWeight: 600 }}>¿Sumás otra meta?</p>
        {freePlanned > 0 ? <button type="button" className="btn btn-p" onClick={() => go('/nueva-meta')}>Crear otra meta</button> : <span className="btn btn-d" aria-disabled="true">No te queda ahorro libre para otra meta</span>}
        <button type="button" className="btn btn-s" onClick={toHome}>Ir al inicio</button>
      </Foot>
    </Screen>
  );
}
