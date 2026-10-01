-- The application supplies its local IANA time zone and the earned level from
-- src/lib/progression.ts. This function confirms XP and applies the penalty
-- while holding the singleton state row lock.
create or replace function public.register_relapse(
  p_relapse_id uuid,
  p_time_zone text,
  p_earned_level integer,
  p_required_xp bigint
)
returns public.app_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_state public.app_state%rowtype;
  relapse_at timestamptz;
  relapse_local_date date;
  previous_streak_seconds bigint;
  completed_seconds bigint;
  lifetime_xp bigint;
  level_after integer;
begin
  if p_relapse_id is null or p_time_zone is null or p_time_zone = ''
     or p_earned_level is null or p_earned_level < 1
     or p_required_xp is null or p_required_xp < 0 then
    raise exception 'Invalid relapse request';
  end if;

  select * into current_state
  from public.app_state
  limit 1
  for update;

  if not found then
    raise exception 'Journey has not started';
  end if;

  -- Retries with the same identifier never add a relapse or another penalty.
  if exists (select 1 from public.relapses where id = p_relapse_id) then
    return current_state;
  end if;

  relapse_at := clock_timestamp();
  relapse_local_date := (relapse_at at time zone p_time_zone)::date;
  previous_streak_seconds := greatest(
    0,
    floor(extract(epoch from relapse_at - current_state.current_streak_started_at))
  )::bigint;

  -- Include this completed streak before deciding whether a level was earned.
  if p_earned_level > current_state.highest_level_reached then
    select coalesce(sum(relapse.previous_streak_seconds), 0)::bigint
    into completed_seconds
    from public.relapses as relapse
    where relapse.app_state_id = current_state.id;

    lifetime_xp := (completed_seconds + previous_streak_seconds) / 60;
    if lifetime_xp < p_required_xp then
      raise exception 'Not enough XP for level promotion';
    end if;

    current_state.display_level := p_earned_level;
    current_state.highest_level_reached := p_earned_level;
  end if;

  level_after := current_state.display_level;
  if current_state.last_level_penalty_date is null
     or current_state.last_level_penalty_date < relapse_local_date then
    level_after := greatest(1, level_after - 1);
    current_state.last_level_penalty_date := relapse_local_date;
  end if;

  insert into public.relapses (
    id,
    app_state_id,
    occurred_at,
    previous_streak_seconds,
    level_before,
    level_after
  ) values (
    p_relapse_id,
    current_state.id,
    relapse_at,
    previous_streak_seconds,
    current_state.display_level,
    level_after
  );

  update public.app_state
  set current_streak_started_at = relapse_at,
      display_level = level_after,
      highest_level_reached = current_state.highest_level_reached,
      last_level_penalty_date = current_state.last_level_penalty_date
  where id = current_state.id
  returning * into current_state;

  return current_state;
end;
$$;

revoke all on function public.register_relapse(uuid, text, integer, bigint) from public, anon, authenticated;
grant execute on function public.register_relapse(uuid, text, integer, bigint) to service_role;

-- Retire the old signature so every new relapse supplies the browser's local zone.
drop function public.register_relapse(uuid);

notify pgrst, 'reload schema';
