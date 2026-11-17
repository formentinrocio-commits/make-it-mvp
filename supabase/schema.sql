-- Make It · Etapa 4 · esquema de datos
-- Pegar completo en Supabase → SQL Editor → Run. Se puede correr más de una vez.
-- Tablas nuevas con prefijo mi_ (no tocan las del MVP anterior).

create table if not exists public.mi_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  monthly_saving bigint not null default 0,
  contribution_day int not null default 1,
  onboarded boolean not null default false,
  notify_contribution boolean not null default true,
  notify_moves boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.mi_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  emoji text not null default '🎯',
  color text not null default 'sky' check (color in ('sky','lime','violet','orange')),
  target bigint not null check (target > 0),
  saved_initial bigint not null default 0,
  monthly bigint not null default 0,
  target_date date not null,
  priority text not null default 'media' check (priority in ('protegida','alta','media','baja')),
  created_at timestamptz not null default now()
);

create table if not exists public.mi_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.mi_goals(id) on delete cascade,
  month date not null,
  amount bigint not null,
  note text,
  created_at timestamptz not null default now(),
  unique (goal_id, month)
);

create table if not exists public.mi_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  item text not null,
  emoji text not null default '🛍️',
  amount bigint not null,
  decision text not null check (decision in ('comprar','no')),
  from_free bigint not null default 0,
  impacts jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table public.mi_profiles enable row level security;
alter table public.mi_goals enable row level security;
alter table public.mi_contributions enable row level security;
alter table public.mi_decisions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['mi_profiles','mi_goals','mi_contributions','mi_decisions'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Eliminar cuenta desde la app (requisito de Apple 5.1.1(v)): borra los datos y el usuario.
create or replace function public.mi_delete_me()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.mi_decisions where user_id = auth.uid();
  delete from public.mi_contributions where user_id = auth.uid();
  delete from public.mi_goals where user_id = auth.uid();
  delete from public.mi_profiles where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.mi_delete_me() from public;
grant execute on function public.mi_delete_me() to authenticated;
