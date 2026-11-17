import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { iso, monthStart, monthsBetween, toDate, addMonths } from './money';
import { thisMonth, viewGoal, type Contribution, type Decision, type Goal, type GoalView, type Impact, type Profile } from './model';
import { COLOR_ORDER, type GoalColor } from './tokens';

type NewGoal = { name: string; emoji: string; target: number; saved_initial: number; monthly: number; target_date: string; priority: Goal['priority'] };

type Store = {
  ready: boolean; session: Session | null; profile: Profile | null; goals: GoalView[]; decisions: Decision[]; monthDecisions: Decision[];
  freePlanned: number; freeLeft: number; spent: number; error: string | null;
  reload: () => Promise<void>;
  saveProfile: (p: Partial<Profile>) => Promise<void>;
  createGoal: (g: NewGoal) => Promise<Goal | null>;
  updateGoal: (id: string, g: Partial<NewGoal>) => Promise<void>;
  decide: (d: { item: string; emoji: string; amount: number; decision: 'comprar' | 'no'; from_free: number; impacts: Impact[] }) => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<string | null>;
};

const Ctx = createContext<Store | null>(null);
export const useStore = () => { const s = useContext(Ctx); if (!s) throw new Error('store'); return s; };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [contribs, setContribs] = useState<Contribution[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [error, setError] = useState<string | null>(null);

  const inflight = useRef<{ uid: string | null; p: Promise<void> } | null>(null);
  const load = useCallback((s: Session | null) => {
    const uid0 = s?.user.id || null;
    if (inflight.current && inflight.current.uid === uid0) return inflight.current.p;
    const p = loadNow(s).finally(() => { if (inflight.current?.p === p) inflight.current = null; });
    inflight.current = { uid: uid0, p };
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const loadNow = async (s: Session | null) => {
    if (!s) { setProfile(null); setGoals([]); setContribs([]); setDecisions([]); return; }
    const uid = s.user.id;
    const [p, g, c, d] = await Promise.all([
      supabase.from('mi_profiles').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('mi_goals').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('mi_contributions').select('*').eq('user_id', uid).order('created_at'),
      supabase.from('mi_decisions').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
    ]);
    const err = p.error || g.error || c.error || d.error;
    if (err) { setError(err.message.includes('mi_') || err.code === '42P01' ? 'Falta crear las tablas en Supabase (schema.sql).' : err.message); return; }
    setError(null);
    let cs = (c.data || []) as Contribution[];
    /* Aporte automático: el día de aporte de cada mes se suma el aporte previsto de cada meta (si todavía no está). */
    const gs = (g.data || []) as Goal[];
    const missing: { user_id: string; goal_id: string; month: string; amount: number }[] = [];
    const now = monthStart(new Date());
    for (const goal of gs) {
      if (goal.monthly <= 0) continue;
      const start = monthStart(toDate(goal.created_at.slice(0, 10)));
      const n = monthsBetween(start, now);
      for (let i = 0; i <= n; i++) {
        const m = iso(monthStart(addMonths(start, i)));
        if (!cs.some((x) => x.goal_id === goal.id && x.month === m)) missing.push({ user_id: uid, goal_id: goal.id, month: m, amount: goal.monthly });
      }
    }
    if (missing.length) {
      /* El índice único (meta, mes) evita duplicados si dos cargas corren a la vez */
      const ins = await supabase.from('mi_contributions').upsert(missing, { onConflict: 'goal_id,month', ignoreDuplicates: true }).select();
      if (!ins.error && ins.data) cs = cs.concat((ins.data as Contribution[]).filter((x) => !cs.some((y) => y.id === x.id)));
    }
    setProfile((p.data as Profile) || null); setGoals(gs); setContribs(cs); setDecisions((d.data || []) as Decision[]);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => { setSession(data.session); await load(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); load(s); });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const reload = () => loadNow(session);
  const uid = session?.user.id;

  const views = useMemo(() => goals.map((g) => viewGoal(g, contribs)), [goals, contribs]);
  const tm = thisMonth();
  const monthDecisions = decisions.filter((d) => d.month === tm && d.decision === 'comprar');
  const freePlanned = Math.max(0, (profile?.monthly_saving || 0) - goals.reduce((s, g) => s + g.monthly, 0));
  const usedFree = monthDecisions.reduce((s, d) => s + d.from_free, 0);
  const spent = monthDecisions.reduce((s, d) => s + d.amount, 0);

  const value: Store = {
    ready, session, profile, goals: views, decisions, monthDecisions, freePlanned, freeLeft: Math.max(0, freePlanned - usedFree), spent, error,
    reload,
    saveProfile: async (patch) => {
      if (!uid) return;
      const meta = (session?.user.user_metadata || {}) as { name?: string };
      const row = { user_id: uid, name: meta.name || '', ...(profile || {}), ...patch };
      const r = await supabase.from('mi_profiles').upsert(row).select().single();
      if (r.error) { setError(r.error.message); return; }
      setProfile(r.data as Profile);
    },
    createGoal: async (g) => {
      if (!uid) return null;
      const used = goals.map((x) => x.color);
      const color: GoalColor = COLOR_ORDER.find((c) => !used.includes(c)) || COLOR_ORDER[goals.length % 4];
      const r = await supabase.from('mi_goals').insert({ ...g, user_id: uid, color }).select().single();
      if (r.error) { setError(r.error.message); return null; }
      const goal = r.data as Goal;
      let added: Contribution[] = [];
      if (goal.monthly > 0) {
        const c = await supabase.from('mi_contributions').insert({ user_id: uid, goal_id: goal.id, month: tm, amount: goal.monthly }).select();
        if (!c.error && c.data) added = c.data as Contribution[];
      }
      setGoals((x) => x.concat(goal)); setContribs((x) => x.concat(added));
      return goal;
    },
    updateGoal: async (id, patch) => {
      const prev = goals.find((g) => g.id === id);
      const r = await supabase.from('mi_goals').update(patch).eq('id', id).select().single();
      if (r.error) { setError(r.error.message); return; }
      /* Si cambia el aporte, el de este mes se actualiza (manteniendo lo que ya se usó en compras) */
      if (prev && patch.monthly !== undefined && patch.monthly !== prev.monthly) {
        const row = contribs.find((c) => c.goal_id === id && c.month === tm);
        if (row) {
          const amount = Math.max(0, patch.monthly - (prev.monthly - row.amount));
          await supabase.from('mi_contributions').update({ amount }).eq('id', row.id);
          setContribs((x) => x.map((c) => (c.id === row.id ? { ...c, amount } : c)));
        }
      }
      setGoals((x) => x.map((g) => (g.id === id ? (r.data as Goal) : g)));
    },
    decide: async (d) => {
      if (!uid) return;
      const r = await supabase.from('mi_decisions').insert({ ...d, user_id: uid, month: tm }).select().single();
      if (r.error) { setError(r.error.message); return; }
      if (d.decision === 'comprar') {
        /* La compra baja el aporte de este mes de cada meta afectada */
        for (const im of d.impacts) {
          const row = contribs.find((c) => c.goal_id === im.goal_id && c.month === tm);
          if (row) await supabase.from('mi_contributions').update({ amount: row.amount - im.taken, note: `${d.item}` }).eq('id', row.id);
        }
      }
      await loadNow(session);
    },
    signOut: async () => { await supabase.auth.signOut(); },
    deleteAccount: async () => {
      const r = await supabase.rpc('mi_delete_me');
      if (r.error) return r.error.message;
      await supabase.auth.signOut();
      return null;
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
