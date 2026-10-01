begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(22);

-- Keep every fixture inside this transaction, including changes to an existing journey.
do $$
begin
  if not exists (select 1 from public.app_state) then
    insert into public.app_state (journey_started_at, current_streak_started_at)
    values (clock_timestamp() - interval '40 days', clock_timestamp() - interval '35 days');
  end if;
end;
$$;

create temporary table test_journey_meta as
select exists (select 1 from public.relapses) as had_history,
       clock_timestamp() - interval '2 days' as target_start;

do $$
begin
  if not (select had_history from test_journey_meta) then
    perform public.update_journey_start(
      (select target_start from test_journey_meta), 2, 1000
    );
  end if;
end;
$$;

select case when (select had_history from test_journey_meta)
  then skip(1, 'histórico existente impede testar edição sem recaída')
  else ok(
    (select journey_started_at from public.app_state) = (select target_start from test_journey_meta)
    and (select current_streak_started_at from public.app_state) = (select target_start from test_journey_meta),
    'corrigir data atualiza início da jornada e da sequência'
  ) end;
select case when (select had_history from test_journey_meta)
  then skip(1, 'histórico existente impede testar edição sem recaída')
  else ok(
    (select display_level = 2 and highest_level_reached = 2 from public.app_state),
    'corrigir data recalcula nível'
  ) end;

update public.app_state
set journey_started_at = clock_timestamp() - interval '40 days',
    current_streak_started_at = clock_timestamp() - interval '35 days',
    display_level = 8,
    highest_level_reached = 8,
    last_level_penalty_date = null;

create temporary table test_relapse_ids (label text primary key, id uuid not null default gen_random_uuid());
insert into test_relapse_ids (label) values ('first'), ('second'), ('third'), ('minimum');
create temporary table test_checks (name text primary key, passed boolean not null);

do $$
begin
  perform public.register_relapse((select id from test_relapse_ids where label = 'first'), 'Pacific/Honolulu', 8, 33000);
end;
$$;

select is((select display_level from public.app_state), 7, 'primeira recaída reduz um nível');
select is((select highest_level_reached from public.app_state), 8, 'maior nível permanece');
select is(
  (select last_level_penalty_date from public.app_state),
  (select (occurred_at at time zone 'Pacific/Honolulu')::date
   from public.relapses where id = (select id from test_relapse_ids where label = 'first')),
  'data da penalidade usa fuso local informado'
);
select ok(
  (select previous_streak_seconds > 30 * 86400
   from public.relapses where id = (select id from test_relapse_ids where label = 'first')),
  'sequência encerrada conserva duração anterior'
);
select is(
  (select count(*)::integer from public.relapses
   where id = (select id from test_relapse_ids where label = 'first')),
  1,
  'primeiro registro é único'
);

do $$
begin
  begin
    perform public.update_journey_start(clock_timestamp() - interval '1 day', 1, 0);
    insert into test_checks values ('locked_start', false);
  exception when others then
    insert into test_checks values ('locked_start', sqlerrm = 'Journey start is locked after a relapse');
  end;
end;
$$;
select ok((select passed from test_checks where name = 'locked_start'), 'data inicial bloqueada após recaída');

do $$
begin
  perform public.register_relapse((select id from test_relapse_ids where label = 'second'), 'Pacific/Honolulu', 8, 33000);
end;
$$;

select is((select display_level from public.app_state), 7, 'segunda recaída no mesmo dia não reduz outro nível');
select is(
  (select level_before from public.relapses where id = (select id from test_relapse_ids where label = 'second')),
  (select level_after from public.relapses where id = (select id from test_relapse_ids where label = 'second')),
  'histórico registra nível mantido na segunda recaída'
);
select is(
  (select count(*)::integer from public.relapses
   where id = (select id from test_relapse_ids where label = 'second')),
  1,
  'segunda recaída gera um registro'
);

do $$
begin
  perform public.register_relapse((select id from test_relapse_ids where label = 'second'), 'Pacific/Honolulu', 8, 33000);
end;
$$;

select is(
  (select count(*)::integer from public.relapses
   where id = (select id from test_relapse_ids where label = 'second')),
  1,
  'repetir UUID não duplica registro'
);
select is(
  (select current_streak_started_at from public.app_state),
  (select occurred_at from public.relapses where id = (select id from test_relapse_ids where label = 'second')),
  'repetir UUID não reinicia contador'
);

do $$
begin
  perform public.register_relapse((select id from test_relapse_ids where label = 'third'), 'Pacific/Kiritimati', 8, 33000);
end;
$$;

select is((select display_level from public.app_state), 6, 'novo dia local permite nova penalidade');
select is(
  (select last_level_penalty_date from public.app_state),
  (select (occurred_at at time zone 'Pacific/Kiritimati')::date
   from public.relapses where id = (select id from test_relapse_ids where label = 'third')),
  'data local muda com o fuso IANA'
);
select is((select highest_level_reached from public.app_state), 8, 'penalidades preservam maior nível');

update public.app_state set display_level = 1, last_level_penalty_date = null;
do $$
begin
  perform public.register_relapse((select id from test_relapse_ids where label = 'minimum'), 'Pacific/Honolulu', 8, 33000);
end;
$$;

select is((select display_level from public.app_state), 1, 'nível mínimo é um');
select is(
  (select level_after from public.relapses where id = (select id from test_relapse_ids where label = 'minimum')),
  1,
  'histórico respeita nível mínimo'
);

do $$
begin
  perform public.promote_level(9, 46000);
end;
$$;

select is((select display_level from public.app_state), 9, 'progresso recupera nível visual');
select is((select highest_level_reached from public.app_state), 9, 'promoção atualiza maior nível');

do $$
begin
  begin
    perform public.promote_level(10, 1000000000);
    insert into test_checks values ('insufficient_xp', false);
  exception when others then
    insert into test_checks values ('insufficient_xp', sqlerrm = 'Not enough XP for level promotion');
  end;

  begin
    update public.relapses set level_after = 1
    where id = (select id from test_relapse_ids where label = 'first');
    insert into test_checks values ('immutable_history', false);
  exception when others then
    insert into test_checks values ('immutable_history', sqlerrm = 'Relapse history is immutable');
  end;
end;
$$;

select ok((select passed from test_checks where name = 'insufficient_xp'), 'promoção sem XP é rejeitada');
select ok((select passed from test_checks where name = 'immutable_history'), 'histórico não pode ser alterado');

select * from finish();
rollback;
