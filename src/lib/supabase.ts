import { createClient } from '@supabase/supabase-js';

// Clave publicable de Supabase: es pública por diseño (las reglas RLS protegen los datos de cada usuario).
const URL = 'https://xvsrmhzeyrvjacmyumsc.supabase.co';
const KEY = 'sb_publishable_KU8RobmmycpVaZvS20wlcQ_PHZtscAQ';

export const supabase = createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });
