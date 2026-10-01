-- The start date may be corrected only before the first relapse.
create function public.update_journey_start(
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
  if p_started_at is null or p_started_at > clock_timestamp()
     or p_level is null or p_level < 1
     or p_required_xp is null or p_required_xp < 0 then
    raise exception 'Invalid journey start';
  end if;

  select * into current_state
  from public.app_state
  limit 1
  for update;

  if not found then
    raise exception 'Journey has not started';
  end if;

  if exists (select 1 from public.relapses where app_state_id = current_state.id) then
    raise exception 'Journey start is locked after a relapse';
  end if;

  earned_xp := greatest(0, floor(extract(epoch from clock_timestamp() - p_started_at)))::bigint / 60;
  if earned_xp < p_required_xp then
    raise exception 'Not enough XP for level promotion';
  end if;

  update public.app_state
  set journey_started_at = p_started_at,
      current_streak_started_at = p_started_at,
      display_level = p_level,
      highest_level_reached = p_level,
      last_level_penalty_date = null
  where id = current_state.id
  returning * into current_state;

  return current_state;
end;
$$;

revoke all on function public.update_journey_start(timestamptz, integer, bigint) from public, anon, authenticated;
grant execute on function public.update_journey_start(timestamptz, integer, bigint) to service_role;

notify pgrst, 'reload schema';
