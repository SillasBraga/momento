-- Promote only when the local database confirms enough lifetime XP.
-- The required threshold comes from the server's central progression formula.
create function public.promote_level(p_target_level integer, p_required_xp bigint)
returns public.app_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_state public.app_state%rowtype;
  completed_seconds bigint;
  current_seconds bigint;
  lifetime_xp bigint;
begin
  if p_target_level is null or p_target_level < 1
     or p_required_xp is null or p_required_xp < 0 then
    raise exception 'Invalid level promotion';
  end if;

  select * into current_state
  from public.app_state
  limit 1
  for update;

  if not found then
    raise exception 'Journey has not started';
  end if;

  if p_target_level <= current_state.highest_level_reached then
    return current_state;
  end if;

  select coalesce(sum(previous_streak_seconds), 0)::bigint
  into completed_seconds
  from public.relapses
  where app_state_id = current_state.id;

  current_seconds := greatest(
    0,
    floor(extract(epoch from clock_timestamp() - current_state.current_streak_started_at))
  )::bigint;
  lifetime_xp := (completed_seconds + current_seconds) / 60;

  if lifetime_xp < p_required_xp then
    raise exception 'Not enough XP for level promotion';
  end if;

  update public.app_state
  set display_level = greatest(display_level, p_target_level),
      highest_level_reached = greatest(highest_level_reached, p_target_level)
  where id = current_state.id
  returning * into current_state;

  return current_state;
end;
$$;

revoke all on function public.promote_level(integer, bigint) from public, anon, authenticated;
grant execute on function public.promote_level(integer, bigint) to service_role;

notify pgrst, 'reload schema';
