begin;

-- Start exactly the battle the trainer selected. Retries return the locked run as it stands.
create function public.arena_journey_begin_fight(run_id uuid, expected_stage integer)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare r arena_private.journey_runs;
begin
 perform arena_private.require_session();
 select j.* into r from arena_private.journey_runs j
 where j.id=run_id and j.owner=auth.uid() and j.kind='champion' and j.week=arena_private.journey_week()
 for update;
 if not found then return null; end if;
 if r.status='ready' and r.stage=expected_stage then
  update arena_private.journey_runs set status='playing' where id=r.id returning * into r;
 end if;
 return arena_private.journey_view(r);
end $$;

revoke all on function public.arena_journey_begin_fight(uuid,integer) from public,anon;
grant execute on function public.arena_journey_begin_fight(uuid,integer) to authenticated;

commit;
