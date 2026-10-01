-- One database transaction owns the entire relapse operation.
create function public.register_relapse(p_relapse_id uuid)
returns public.app_state
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_state public.app_state%rowtype;
  relapse_at timestamptz;
  previous_streak_seconds bigint;
begin
  if p_relapse_id is null then
    raise exception 'Relapse identifier is required';
  end if;

  select * into current_state
  from public.app_state
  limit 1
  for update;

  if not found then
    raise exception 'Journey has not started';
  end if;

  -- A retry with the same identifier returns without adding another record.
  if exists (select 1 from public.relapses where id = p_relapse_id) then
    return current_state;
  end if;

  relapse_at := clock_timestamp();
  previous_streak_seconds := greatest(
    0,
    floor(extract(epoch from relapse_at - current_state.current_streak_started_at))
  )::bigint;

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
    current_state.display_level
  );

  update public.app_state
  set current_streak_started_at = relapse_at
  where id = current_state.id
  returning * into current_state;

  return current_state;
end;
$$;

revoke all on function public.register_relapse(uuid) from public, anon, authenticated;
grant execute on function public.register_relapse(uuid) to service_role;

-- Writes after first access now go through the transaction function.
revoke update on public.app_state from service_role;
revoke insert on public.relapses from service_role;

notify pgrst, 'reload schema';
