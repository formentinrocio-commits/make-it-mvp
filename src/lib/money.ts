export const fmt = (n: number) => '$' + Math.round(n).toLocaleString('es-AR');
export const fmtSigned = (n: number) => (n < 0 ? '−' : '+') + fmt(Math.abs(n));
export const parseMoney = (s: string) => {
  const d = s.replace(/[^\d]/g, '');
  return d ? parseInt(d, 10) : 0;
};
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const capFirst = (s: string) => { const t = s.trim(); return t ? t[0].toLocaleUpperCase('es-AR') + t.slice(1) : t; };
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const toDate = (iso: string) => new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
export const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
export const fmtDate = (s: string) => { const x = toDate(s); return `${String(x.getDate()).padStart(2, '0')} ${MES[x.getMonth()]} ${x.getFullYear()}`; };
export const fmtDay = (s: string) => { const x = toDate(s); return `${String(x.getDate()).padStart(2, '0')} ${MES[x.getMonth()]}`; };
export const fmtMonthLong = (x: Date) => `${MONTHS[x.getMonth()][0].toUpperCase()}${MONTHS[x.getMonth()].slice(1)} ${x.getFullYear()}`;
export const fmtMonthShort = (x: Date) => `${MES[x.getMonth()]} ${x.getFullYear()}`;
export const monthStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), 1, 12);
export const addMonths = (x: Date, n: number) => new Date(x.getFullYear(), x.getMonth() + n, Math.min(x.getDate(), 28), 12);
export const addDays = (x: Date, n: number) => new Date(x.getTime() + n * 86400000);
export const monthsBetween = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
