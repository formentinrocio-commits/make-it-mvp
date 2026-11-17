import { addDays, iso, monthStart, monthsBetween, toDate } from './money';
import type { GoalColor } from './tokens';

export type Priority = 'protegida' | 'alta' | 'media' | 'baja';
export type Profile = { user_id: string; name: string; monthly_saving: number; contribution_day: number; onboarded: boolean; notify_contribution: boolean; notify_moves: boolean };
export type Goal = { id: string; user_id: string; name: string; emoji: string; color: GoalColor; target: number; saved_initial: number; monthly: number; target_date: string; priority: Priority; created_at: string };
export type Contribution = { id: string; goal_id: string; month: string; amount: number; note: string | null; created_at: string };
export type Impact = { goal_id: string; name: string; emoji: string; color: GoalColor; taken: number; delay_days: number; from_date: string; to_date: string };
export type Decision = { id: string; month: string; item: string; emoji: string; amount: number; decision: 'comprar' | 'no'; from_free: number; impacts: Impact[]; created_at: string };

export const PRIO_LABEL: Record<Priority, string> = { protegida: 'Protegida', alta: 'Alta', media: 'Media', baja: 'Baja' };
export const PRIO_LEVEL: Record<Priority, number> = { protegida: 4, alta: 3, media: 2, baja: 1 };

export const today = () => new Date();
export const thisMonth = () => iso(monthStart(today()));

export type GoalView = Goal & {
  saved: number; missing: number; pct: number; thisMonth: number; planned: number;
  expected: number; delayDays: number; arrival: string; monthsLeft: number; contribs: Contribution[];
};

/* Proyección: cada mes se aporta `monthly`. Si lo ahorrado está por debajo de lo esperado, la llegada se corre en proporción (déficit / aporte mensual ≈ meses). */
export function viewGoal(g: Goal, contribs: Contribution[]): GoalView {
  const mine = contribs.filter((c) => c.goal_id === g.id);
  const saved = g.saved_initial + mine.reduce((s, c) => s + c.amount, 0);
  const missing = Math.max(0, g.target - saved);
  const tm = thisMonth();
  const thisM = mine.filter((c) => c.month === tm).reduce((s, c) => s + c.amount, 0);
  const created = monthStart(toDate(g.created_at.slice(0, 10)));
  const monthsSoFar = Math.max(1, monthsBetween(created, monthStart(today())) + 1);
  const expected = Math.min(g.target, g.saved_initial + g.monthly * monthsSoFar);
  const deficit = Math.max(0, expected - saved);
  const delayDays = g.monthly > 0 ? Math.round((deficit / g.monthly) * 30.4) : 0;
  /* Si el aporte elegido no alcanza para la fecha objetivo, la llegada base es el mes del último aporte necesario */
  const need = g.monthly > 0 ? Math.ceil(Math.max(0, g.target - g.saved_initial) / g.monthly) : 0;
  const td = toDate(g.target_date);
  const planned = need > 0 ? new Date(created.getFullYear(), created.getMonth() + need - 1, Math.min(td.getDate(), 28), 12) : td;
  const base = planned > td ? planned : td;
  const arrival = iso(addDays(base, delayDays));
  return {
    ...g, saved, missing, pct: Math.min(100, (saved / g.target) * 100), thisMonth: thisM, planned: g.monthly,
    expected, delayDays, arrival, monthsLeft: Math.max(0, monthsBetween(monthStart(today()), monthStart(toDate(arrival)))), contribs: mine,
  };
}

/* Ajuste sugerido: primero el ahorro libre; después las metas de prioridad Baja → Media → Alta, cada una hasta su aporte de este mes. Protegida nunca participa. */
export function suggest(amount: number, freeLeft: number, goals: GoalView[]) {
  let rest = amount;
  const fromFree = Math.min(rest, Math.max(0, freeLeft));
  rest -= fromFree;
  const order = goals.filter((g) => g.priority !== 'protegida').sort((a, b) => PRIO_LEVEL[a.priority] - PRIO_LEVEL[b.priority] || a.created_at.localeCompare(b.created_at));
  const impacts: Impact[] = [];
  for (const g of order) {
    if (rest <= 0) break;
    const take = Math.min(rest, Math.max(0, g.thisMonth));
    if (take <= 0) continue;
    rest -= take;
    impacts.push(impactFor(g, take));
  }
  return { fromFree, impacts, uncovered: rest };
}

export function impactFor(g: GoalView, take: number): Impact {
  const extra = g.monthly > 0 ? Math.round((take / g.monthly) * 30.4) : 0;
  return { goal_id: g.id, name: g.name, emoji: g.emoji, color: g.color, taken: take, delay_days: extra, from_date: g.arrival, to_date: iso(addDays(toDate(g.arrival), extra)) };
}

export const delayLabel = (days: number) => {
  if (days <= 0) return 'Sin cambios';
  if (days < 25) return `+${days} día${days === 1 ? '' : 's'}`;
  const m = Math.round(days / 30.4);
  return `+${m} mes${m === 1 ? '' : 'es'}`;
};

/* Aporte sugerido al crear una meta: lo que falta ÷ cantidad de aportes hasta la fecha (incluye este mes), redondeado a $1.000. */
export function suggestMonthly(target: number, savedInitial: number, targetDate: string) {
  const n = Math.max(1, monthsBetween(monthStart(today()), monthStart(toDate(targetDate))) + 1);
  return Math.ceil(Math.max(0, target - savedInitial) / n / 1000) * 1000;
}

/* Emoji sugerido por el nombre de la meta o de la compra */
const EMO: [RegExp, string][] = [
  [/viaj|japón|japon|vacacion|europa|playa|avión|avion|vuelo/i, '✈️'], [/auto|coche|moto/i, '🚗'], [/casa|depto|departamento|alquiler|hogar/i, '🏠'],
  [/jubila|retiro/i, '🏖️'], [/compu|notebook|laptop|mac|tecno/i, '💻'], [/celu|iphone|teléfono|telefono/i, '📱'], [/boda|casamiento/i, '💍'],
  [/estudi|curso|master|maestría|maestria/i, '🎓'], [/emergencia|fondo/i, '🛟'], [/bebé|bebe|hijo/i, '🍼'], [/perro|gato|mascota/i, '🐶'],
  [/ropa|zapat|zapatilla|shein|zara/i, '🛍️'], [/bici/i, '🚲'], [/tele|tv/i, '📺'], [/consola|play|xbox|switch/i, '🎮'], [/regalo/i, '🎁'],
];
export const emojiFor = (name: string, fallback = '🎯') => (EMO.find(([r]) => r.test(name)) || [null, fallback])[1] as string;
