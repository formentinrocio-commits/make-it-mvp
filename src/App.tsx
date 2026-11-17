import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from './lib/store';
import Splash from './screens/Splash';
import { Onboarding1, Onboarding2 } from './screens/Onboarding';
import Auth from './screens/Auth';
import Plan from './screens/Plan';
import NuevaMeta from './screens/NuevaMeta';
import MetaCreada from './screens/MetaCreada';
import Inicio from './screens/Inicio';
import Metas from './screens/Metas';
import Anio from './screens/Anio';
import Perfil from './screens/Perfil';
import MetaDetalle from './screens/MetaDetalle';
import { Evaluar, Entra, Ajuste, Explorar, Impacto, Resumen } from './screens/Compro';

const PUBLIC = ['/splash', '/onboarding/1', '/onboarding/2', '/registro', '/login'];

/* A dónde va alguien según su estado: sin sesión → splash; sin ahorro del mes → plan; sin metas → nueva meta; si no, inicio */
function home(s: ReturnType<typeof useStore>) {
  if (!s.session) return '/splash';
  if (!s.profile || !s.profile.monthly_saving) return '/plan';
  if (!s.goals.length) return '/nueva-meta';
  return '/inicio';
}

export default function App() {
  const s = useStore();
  const loc = useLocation();
  const path = loc.pathname;
  let body;
  if (!s.ready) body = <div className="screen" aria-busy="true" />;
  else if (s.error && s.session) body = (
    <div className="screen" style={{ display: 'grid', placeItems: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <b style={{ fontSize: 20 }}>Algo no anduvo</b>
        <p style={{ margin: 0, color: '#526166' }}>{s.error}</p>
        <button type="button" className="btn btn-p" onClick={() => s.reload()}>Reintentar</button>
        <button type="button" className="btn-t" onClick={() => s.signOut()}>Cerrar sesión</button>
      </div>
    </div>
  );
  else if (!s.session && !PUBLIC.includes(path)) body = <Navigate to="/splash" replace />;
  else if (s.session && PUBLIC.includes(path) && path !== '/registro' && path !== '/login') body = <Navigate to={home(s)} replace />;
  else body = (
    <Routes location={loc} key={path}>
      <Route path="/" element={<Navigate to={home(s)} replace />} />
      <Route path="/splash" element={<Splash />} />
      <Route path="/onboarding/1" element={<Onboarding1 />} />
      <Route path="/onboarding/2" element={<Onboarding2 />} />
      <Route path="/registro" element={<Auth mode="registro" />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/plan" element={<Plan />} />
      <Route path="/ahorro" element={<Plan fromProfile />} />
      <Route path="/nueva-meta" element={<NuevaMeta />} />
      <Route path="/meta-creada/:id" element={<MetaCreada />} />
      <Route path="/meta/:id" element={<MetaDetalle />} />
      <Route path="/meta/:id/editar" element={<NuevaMeta edit />} />
      <Route path="/inicio" element={<Inicio />} />
      <Route path="/metas" element={<Metas />} />
      <Route path="/anio" element={<Anio />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/compro" element={<Evaluar />} />
      <Route path="/compro/entra" element={<Entra />} />
      <Route path="/compro/ajuste" element={<Ajuste />} />
      <Route path="/compro/explorar" element={<Explorar />} />
      <Route path="/compro/impacto" element={<Impacto />} />
      <Route path="/compro/resumen" element={<Resumen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
  return <div className="device">{body}</div>;
}
