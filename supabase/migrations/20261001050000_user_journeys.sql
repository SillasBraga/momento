-- Preserve the existing local journey without assigning it to an account.
-- New accounts start with their own journey; the legacy row remains untouched.
alter table public.app_state
  add column user_id uuid references auth.users(id) on delete restrict;

drop index public.app_state_single_journey;
create unique index app_state_one_per_user on public.app_state (user_id)
  where user_id is not null;
create index relapses_by_journey on public.relapses (app_state_id, occurred_at desc);

-- Browser roles still have no table access. Server actions verify the session,
-- then use the server-only secret key and always filter by that user ID.

create or replace function public.promote_level(
  p_user_id uuid,
  p_target_level integer,
  p_required_xp bigint
)
returns public.app_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_state public.app_state%rowtype;
  completed_seconds bigint;
  current_seconds bigint;
begin
  if p_user_id is null or p_target_level is null or p_target_level < 1
     or p_required_xp is null or p_required_xp < 0 then
    raise exception 'Invalid level promotion';
  end if;

  select * into current_state from public.app_state
  where user_id = p_user_id for update;
  if not found then raise exception 'Journey has not started'; end if;
  if p_target_level <= current_state.highest_level_reached then return current_state; end if;

  select coalesce(sum(previous_streak_seconds), 0)::bigint into completed_seconds
  from public.relapses where app_state_id = current_state.id;
  current_seconds := greatest(0, floor(extract(epoch from
    clock_timestamp() - current_state.current_streak_started_at)))::bigint;
  if (completed_seconds + current_seconds) / 60 < p_required_xp then
    raise exception 'Not enough XP for level promotion';
  end if;

  update public.app_state
  set display_level = greatest(display_level, p_target_level),
      highest_level_reached = greatest(highest_level_reached, p_target_level)
  where id = current_state.id returning * into current_state;
  return current_state;
end;
$$;

create or replace function public.update_journey_start(
  p_user_id uuid,
  p_started_at timestamptz,
  p_level integer,
  p_required_xp bigint
)
returns public.app_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_state public.app_state%rowtype;
  earned_xp bigint;
begin
  if p_user_id is null or p_started_at is null or p_started_at > clock_timestamp()
     or p_level is null or p_level < 1
     or p_required_xp is null or p_required_xp < 0 then
    raise exception 'Invalid journey start';
  end if;

  select * into current_state from public.app_state
  where user_id = p_user_id for update;
  if not found then raise exception 'Journey has not started'; end if;
  if exists (select 1 from public.relapses where app_state_id = current_state.id) then
    raise exception 'Journey start is locked after a relapse';
  end if;

  earned_xp := greatest(0, floor(extract(epoch from
    clock_timestamp() - p_started_at)))::bigint / 60;
  if earned_xp < p_required_xp then
    raise exception 'Not enough XP for level promotion';
  end if;

  update public.app_state
  set journey_started_at = p_started_at,
      current_streak_started_at = p_started_at,
      display_level = p_level,
      highest_level_reached = p_level,
      last_level_penalty_date = null
  where id = current_state.id returning * into current_state;
  return current_state;
end;
$$;

create or replace function public.register_relapse(
  p_user_id uuid,
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
  level_after integer;
begin
  if p_user_id is null or p_relapse_id is null or p_time_zone is null or p_time_zone = ''
     or p_earned_level is null or p_earned_level < 1
     or p_required_xp is null or p_required_xp < 0 then
    raise exception 'Invalid relapse request';
  end if;

  select * into current_state from public.app_state
  where user_id = p_user_id for update;
  if not found then raise exception 'Journey has not started'; end if;

  -- Idempotency is scoped to the owner. Another user's UUID must not match.
  if exists (select 1 from public.relapses
             where id = p_relapse_id and app_state_id = current_state.id) then
    return current_state;
  end if;

  relapse_at := clock_timestamp();
  relapse_local_date := (relapse_at at time zone p_time_zone)::date;
  previous_streak_seconds := greatest(0, floor(extract(epoch from
    relapse_at - current_state.current_streak_started_at)))::bigint;

  if p_earned_level > current_state.highest_level_reached then
    select coalesce(sum(relapse.previous_streak_seconds), 0)::bigint into completed_seconds
    from public.relapses as relapse where relapse.app_state_id = current_state.id;
    if (completed_seconds + previous_streak_seconds) / 60 < p_required_xp then
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
    id, app_state_id, occurred_at, previous_streak_seconds, level_before, level_after
  ) values (
    p_relapse_id, current_state.id, relapse_at, previous_streak_seconds,
    current_state.display_level, level_after
  );

  update public.app_state
  set current_streak_started_at = relapse_at,
      display_level = level_after,
      highest_level_reached = current_state.highest_level_reached,
      last_level_penalty_date = current_state.last_level_penalty_date
  where id = current_state.id returning * into current_state;
  return current_state;
end;
$$;

revoke all on function public.promote_level(uuid, integer, bigint) from public, anon, authenticated;
revoke all on function public.update_journey_start(uuid, timestamptz, integer, bigint) from public, anon, authenticated;
revoke all on function public.register_relapse(uuid, uuid, text, integer, bigint) from public, anon, authenticated;
grant execute on function public.promote_level(uuid, integer, bigint) to service_role;
grant execute on function public.update_journey_start(uuid, timestamptz, integer, bigint) to service_role;
grant execute on function public.register_relapse(uuid, uuid, text, integer, bigint) to service_role;

drop function public.promote_level(integer, bigint);
drop function public.update_journey_start(timestamptz, integer, bigint);
drop function public.register_relapse(uuid, text, integer, bigint);
notify pgrst, 'reload schema';
