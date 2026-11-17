import { useState } from 'react';
import { useStore } from '../lib/store';
import { Screen, useGo } from '../ui/nav';
import { Foot, H1, Header, MoneyInput } from '../ui/parts';

/* 91 — ¿Cuánto podés ahorrar este mes? (primera vez, o desde Perfil para cambiarlo) */
export default function Plan({ fromProfile }: { fromProfile?: boolean }) {
  const go = useGo();
  const { profile, saveProfile, goals } = useStore();
  const [amount, setAmount] = useState(profile?.monthly_saving || 0);
  const [busy, setBusy] = useState(false);
  const committed = goals.reduce((s, g) => s + g.monthly, 0);
  const tooLow = amount > 0 && amount < committed;
  const next = async () => {
    setBusy(true);
    await saveProfile({ monthly_saving: amount });
    setBusy(false);
    if (fromProfile) go('/perfil', 'back');
    else go(goals.length ? '/inicio' : '/nueva-meta', 'push');
  };
  return (
    <Screen>
      <div className="scroller">
        <Header sticky kicker={fromProfile ? 'Tu ahorro' : 'Primera vez'} onBack={fromProfile ? () => go('/perfil', 'back') : undefined}>
          <H1 a="¿Cuánto podés " b="ahorrar este mes?" />
        </Header>
        <div style={{ padding: '20px 20px 140px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MoneyInput big value={amount} onChange={setAmount} label="Ahorro del mes" describedBy="df-help" bad={tooLow} />
          {tooLow && <p role="alert" className="err" style={{ margin: '-10px 0 0', fontSize: 15, lineHeight: '20px' }}>Tus metas ya suman <b>${committed.toLocaleString('es-AR')}</b> por mes. Bajá algún aporte antes o ingresá un monto mayor.</p>}
          <p id="df-help" style={{ margin: 0, fontSize: 17, lineHeight: '24px' }}>Lo que te queda después de cubrir lo necesario. Una parte va a tus metas, con destino; el resto queda libre.</p>
          <section className="card" aria-label="Qué hacés con tu ahorro">
            <span style={{ fontSize: 15, lineHeight: '20px', fontWeight: 600 }}>Con este monto vas a definir</span>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15, lineHeight: '20px' }}>
              {['Cuánto aportás a cada meta', 'Cuánto te queda de ahorro libre'].map((t, i) => <li key={t} style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="badge b32 num" style={{ background: '#EDEFF0', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{i + 1}</span>{t}</li>)}
            </ul>
          </section>
          <p style={{ margin: 0, fontSize: 13, lineHeight: '18px', color: '#526166' }}>No hace falta conectar cuentas ni registrar cada gasto.</p>
        </div>
      </div>
      <Foot>
        {amount > 0 && !tooLow
          ? <button type="button" className="btn btn-p" disabled={busy} onClick={next}>{busy ? 'Guardando…' : fromProfile ? 'Guardar' : 'Continuar'}</button>
          : <span className="btn btn-d" aria-disabled="true">{tooLow ? 'El monto no alcanza para tus metas' : 'Ingresá un monto para continuar'}</span>}
      </Foot>
    </Screen>
  );
}
