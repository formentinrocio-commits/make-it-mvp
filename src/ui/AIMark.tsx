import { useEffect, useRef } from 'react';
import { calm } from '../lib/tokens';

/* Marca de la IA: la M! de Make It como cinta con el gradiente de marca, compuesta como luz detrás de un vidrio ahumado Ink.
   mode: 'still' (quieta), 'once' (se dibuja una vez al aparecer y al pasar el puntero), 'loop' (piensa: se dibuja y se vacía, lineal) */
type Pt = { x: number; y: number; l: number; f: string };
let CACHE: { P: Pt[]; D: { x: number; y: number; rx: number; ry: number; rot: number; l0: number; f: string }; L: number } | null = null;
function model() {
  if (CACHE) return CACHE;
  const GS: [number, number[]][] = ([[0, '#D9FC62'], [0.225962, '#BDA8FC'], [0.490385, '#FEC3EC'], [0.725962, '#FD5E02']] as [number, string][]).map(([o, h]) => [o, [1, 3, 5].map((i) => parseInt(h.substr(i, 2), 16))]);
  const AN = (6 * Math.PI) / 180, X1 = 1000, Y1 = 1100, AL = 8200, ADX = AL * Math.cos(AN), ADY = AL * Math.sin(AN), AL2 = ADX * ADX + ADY * ADY;
  const brand = (x: number, y: number) => {
    const t = Math.max(0, Math.min(0.725962, ((x - X1) * ADX + (y - Y1) * ADY) / AL2));
    for (let i = 0; i < GS.length - 1; i++) { const [a, ca] = GS[i], [b, cb] = GS[i + 1]; if (t <= b) { const f = (t - a) / (b - a); return ca.map((v, j) => Math.round(v + (cb[j] - v) * f)); } }
    return GS[3][1];
  };
  const SK = [[[-1700, 2550], [2900, 400], [-1450, 6850], [3400, 2220], [2000, 6220], [5200, 3220], [4580, 6500]], [[7320, 300], [6480, 4400]]];
  const P: Pt[] = []; let L = 0;
  SK.forEach((s) => { for (let i = 0; i < s.length - 1; i++) { const a = s[i], b = s[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), n = Math.max(1, Math.round(d / 48)); for (let k = 0; k <= n; k++) { const t = k / n, x = a[0] + dx * t, y = a[1] + dy * t; P.push({ x, y, l: L + d * t, f: 'rgb(' + brand(x, y).join(',') + ')' }); } L += d; } });
  const D = { x: 6065, y: 6295, rx: 555, ry: 675, rot: Math.atan2(840, 4100), l0: L, f: 'rgb(' + brand(6065, 6295).join(',') + ')' };
  CACHE = { P, D, L: L + 700 };
  return CACHE;
}

export function AIMark({ size = 40, mode = 'still' }: { size?: number; mode?: 'still' | 'once' | 'loop' }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode); modeRef.current = mode;
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const g = el.getContext('2d'); if (!g) return;
    const M = model(), W = 6941, R = 470;
    const o = document.createElement('canvas'); o.width = el.width; o.height = el.height; const og = o.getContext('2d')!;
    const draw = (head: number, tail: number) => {
      const w = el.width, hh = el.height, sc = w / W, h = head * M.L, t = tail * M.L;
      og.setTransform(1, 0, 0, 1, 0, 0); og.clearRect(0, 0, w, hh); og.setTransform(sc, 0, 0, sc, 0, 0);
      M.P.forEach((p) => { if (p.l > h || p.l < t) return; og.fillStyle = p.f; og.beginPath(); og.arc(p.x, p.y, R, 0, 7); og.fill(); });
      const D = M.D, k = Math.max(0, Math.min(1, (h - D.l0) / 700)) * (t > D.l0 ? Math.max(0, 1 - (t - D.l0) / 700) : 1);
      if (k > 0) { og.fillStyle = D.f; og.beginPath(); og.ellipse(D.x, D.y, D.rx * k, D.ry * k, D.rot, 0, 7); og.fill(); }
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, hh); g.save(); g.beginPath(); g.ellipse(w / 2, hh / 2, w / 2, hh / 2, 0, 0, 7); g.clip();
      const bg = g.createLinearGradient(0, 0, w, hh); bg.addColorStop(0, '#2A4048'); bg.addColorStop(1, '#11242B'); g.fillStyle = bg; g.fillRect(0, 0, w, hh);
      g.filter = 'blur(' + Math.max(4, w * 0.16) + 'px)'; g.globalAlpha = 0.45; g.drawImage(o, 0, 0);
      g.filter = 'blur(' + Math.max(1.5, w * 0.035) + 'px)'; g.globalAlpha = 0.9; g.drawImage(o, 0, 0);
      g.filter = 'blur(' + Math.max(0.4, w * 0.005) + 'px)'; g.globalAlpha = 0.95; g.drawImage(o, 0, 0); g.filter = 'none'; g.globalAlpha = 1;
      const gr = g.createRadialGradient(w * 0.28, hh * 0.12, 0, w * 0.28, hh * 0.12, w * 0.75); gr.addColorStop(0, 'rgba(255,255,255,0.22)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
      g.restore();
      g.lineWidth = Math.max(1, w * 0.012); const rg = g.createLinearGradient(0, 0, w, hh); rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.45, 'rgba(255,255,255,0.15)'); rg.addColorStop(1, 'rgba(255,255,255,0.9)'); g.strokeStyle = rg; g.beginPath(); g.ellipse(w / 2, hh / 2, w / 2 - g.lineWidth / 2, hh / 2 - g.lineWidth / 2, 0, 0, 7); g.stroke();
      g.lineWidth = Math.max(0.5, w * 0.003); g.strokeStyle = 'rgba(17,36,43,0.14)'; g.beginPath(); g.ellipse(w / 2, hh / 2, w / 2 - 0.5, hh / 2 - 0.5, 0, 0, 7); g.stroke();
    };
    const reduce = calm();
    let raf = 0, t0 = performance.now(), last = '', once: number | null = null, alive = true;
    if (modeRef.current === 'once' && !reduce) {
      draw(0, 0); last = 'empty';
      const start = (delay: number) => { if (once === null) once = performance.now() + delay; };
      const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { start(450); io.disconnect(); } }, { threshold: 0.6 }); io.observe(el);
      const host = el.closest('button'); host?.addEventListener('pointerenter', () => start(0));
    }
    const tick = (now: number) => {
      if (!alive) return;
      const live = modeRef.current === 'loop' && !reduce;
      if (live) { if (last !== 'live') t0 = now; const m = (now - t0) % 3200; if (m < 1600) draw(m / 1600, 0); else draw(1, (m - 1600) / 1600); last = 'live'; }
      else if (once !== null) { const q = (now - once) / 1600; if (q >= 1) { draw(1, 0); once = null; last = 'still'; } else if (q > 0) { draw(q, 0); last = 'once'; } }
      else if (last !== 'still' && last !== 'empty') { draw(1, 0); last = 'still'; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); };
  }, []);
  const dpr = 3;
  return <canvas ref={ref} width={size * dpr} height={Math.round(size * 1.032) * dpr} aria-hidden="true" style={{ width: size, height: Math.round(size * 1.032), flex: 'none', display: 'block' }} />;
}
