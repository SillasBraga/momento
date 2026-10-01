-- Single local journey. A unique expression index prevents a second state row.
create table public.app_state (
  id uuid primary key default gen_random_uuid(),
  journey_started_at timestamptz not null,
  current_streak_started_at timestamptz not null,
  display_level integer not null default 1 check (display_level >= 1),
  highest_level_reached integer not null default 1 check (highest_level_reached >= display_level),
  last_level_penalty_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint current_streak_after_journey check (current_streak_started_at >= journey_started_at)
);

create unique index app_state_single_journey on public.app_state ((true));

create table public.relapses (
  id uuid primary key default gen_random_uuid(),
  app_state_id uuid not null references public.app_state(id) on delete restrict,
  occurred_at timestamptz not null,
  previous_streak_seconds bigint not null check (previous_streak_seconds >= 0),
  level_before integer not null check (level_before >= 1),
  level_after integer not null check (level_after >= 1 and level_after <= level_before),
  created_at timestamptz not null default now()
);

create index relapses_occurred_at_desc on public.relapses (occurred_at desc);

create function public.set_app_state_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger app_state_updated_at
before update on public.app_state
for each row execute function public.set_app_state_updated_at();

create function public.reject_relapse_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Relapse history is immutable';
end;
$$;

create trigger relapses_immutable
before update or delete on public.relapses
for each row execute function public.reject_relapse_mutation();

alter table public.app_state enable row level security;
alter table public.relapses enable row level security;

-- The browser has no direct access to sensitive personal records.
revoke all on public.app_state, public.relapses from public, anon, authenticated, service_role;
grant select, insert, update on public.app_state to service_role;
grant select, insert on public.relapses to service_role;
