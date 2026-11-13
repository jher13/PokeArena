alter table arena_private.players add column if not exists last_seen timestamptz;
create or replace function public.arena_online(action text, args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
 uid uuid:=auth.uid(); player arena_private.players; room arena_private.matches;
 request_mode text:=args->>'mode'; fmt int; other uuid; guild_name text; picks jsonb;
 catalog jsonb:='["Bulbasaur","Charmander","Squirtle","Pikachu","Eevee","Riolu"]';
 outcome text;
begin
 if uid is null then raise exception 'Sign in to play online'; end if;
 perform pg_advisory_xact_lock(193482035);
 select * into player from arena_private.players where id=uid;
 if action='profile' then
  if player.id is null then
   if length(trim(coalesce(args->>'name',''))) not between 2 and 24 then raise exception 'Choose a name with 2–24 characters'; end if;
   insert into arena_private.players(id,name) values(uid,trim(args->>'name')) returning * into player;
  end if;
  return to_jsonb(player)-'id';
 end if;
 if player.id is null then raise exception 'Set your online name first'; end if;
 if action='invite_list' then
  return coalesce((select jsonb_agg(p.name order by p.name) from arena_private.players p
   where p.id<>uid and (p.guild=player.guild or exists(select 1 from arena_private.friends f where f.accepted and
    ((f.sender=uid and f.recipient=p.id) or (f.recipient=uid and f.sender=p.id))))),'[]');
 elsif action='invite' then
  select p.id into other from arena_private.players p where p.name=args->>'name' and p.id<>uid
   and (p.guild=player.guild or exists(select 1 from arena_private.friends f where f.accepted and
    ((f.sender=uid and f.recipient=p.id) or (f.recipient=uid and f.sender=p.id))));
  if other is null then raise exception 'Choose a friend or guild member'; end if;
  select * into room from arena_private.matches m where m.id=(args->>'id')::uuid and m.host=uid
   and m.code is not null and m.guest is null and m.result is null and m.created>now()-interval '20 minutes';
  if room.id is null then raise exception 'Room unavailable'; end if;
  insert into arena_private.invites values(room.id,other) on conflict do nothing;
  return '{}'::jsonb;
 elsif action='notifications' then
  update arena_private.players set last_seen=clock_timestamp() where id=uid
   and (last_seen is null or last_seen<clock_timestamp()-interval '20 seconds');
  return jsonb_build_object(
   'friends',coalesce((select jsonb_agg(p.name) from arena_private.friends f join arena_private.players p on p.id=f.sender where f.recipient=uid and not f.accepted),'[]'),
   'invites',coalesce((select jsonb_agg(jsonb_build_object('name',p.name,'code',m.code,'mode',m.mode))
    from arena_private.invites i join arena_private.matches m on m.id=i.room join arena_private.players p on p.id=m.host
    where i.recipient=uid and m.result is null and m.guest is null and m.created>now()-interval '20 minutes'),'[]'));
 end if;
 if action='friend_request' then
  select id into other from arena_private.players where lower(name)=lower(trim(args->>'name')) limit 1;
  if other is null or other=uid then raise exception 'Choose another registered player'; end if;
  if exists(select 1 from arena_private.friends where sender=other and recipient=uid) then
   update arena_private.friends set accepted=true where sender=other and recipient=uid;
  else
   insert into arena_private.friends(sender,recipient) values(uid,other) on conflict do nothing;
  end if;
  return '{}'::jsonb;
 elsif action='friends' then
  return coalesce((select jsonb_agg(jsonb_build_object('name',p.name,'accepted',f.accepted,'incoming',f.recipient=uid,
   'online',f.accepted and coalesce(p.last_seen>clock_timestamp()-interval '60 seconds',false)) order by p.name)
   from arena_private.friends f join arena_private.players p on p.id=case when f.sender=uid then f.recipient else f.sender end
   where uid in(f.sender,f.recipient)), '[]');
 elsif action in ('guild_create','guild_join','guild_leave') then
  guild_name:=trim(coalesce(args->>'name',''));
  if action='guild_leave' then
   if exists(select 1 from arena_private.guilds g where g.owner=uid and g.name=player.guild) then
    raise exception 'Guild owners must stay in their guild';
   end if;
   guild_name:=null;
  else
   if player.guild is not null then raise exception 'Leave your current guild first'; end if;
   if length(guild_name) not between 2 and 24 then raise exception 'Enter a guild name with 2–24 characters'; end if;
   if action='guild_create' then insert into arena_private.guilds(name,owner) values(guild_name,uid);
   elsif not exists(select 1 from arena_private.guilds where name=guild_name) then raise exception 'Guild not found'; end if;
  end if;
  update arena_private.players set guild=guild_name where id=uid;
  return '{}'::jsonb;
 elsif action='guilds' then
  return jsonb_build_object('membership',player.guild,'guilds',coalesce((select jsonb_agg(to_jsonb(g))
   from (select x.name,x.xp,(select count(*) from arena_private.players where guild=x.name) members
         from arena_private.guilds x order by x.xp desc,x.name limit 50) g),'[]'));
 elsif action='leaderboards' then
  return jsonb_build_object(
   'ranked',coalesce((select jsonb_agg(to_jsonb(p)) from (select name,rating,wins,losses from arena_private.players where wins+losses>0 order by rating desc,wins desc,name limit 50) p),'[]'),
   'coop',coalesce((select jsonb_agg(to_jsonb(p)) from (select name,coop from arena_private.players where coop>0 order by coop desc,name limit 50) p),'[]'),
   'guilds',coalesce((select jsonb_agg(to_jsonb(g)) from (select name,xp from arena_private.guilds order by xp desc,name limit 50) g),'[]'));
 end if;

 if action in ('queue','create','join') then
  select * into room from arena_private.matches m where uid in(m.host,m.guest) and m.result is null
   and m.created>now()-interval '20 minutes' order by m.created desc limit 1;
  if room.id is null then
   if action='join' then
    select * into room from arena_private.matches m where m.code=upper(trim(args->>'code'))
     and m.guest is null and m.result is null and m.created>now()-interval '20 minutes';
    if room.id is null then raise exception 'Room unavailable'; end if;
   else
    fmt:=(args->>'format')::int;
    if request_mode is null or request_mode not in ('ranked','unranked','coop') or fmt is null or fmt not between 1 and 3
     or (action='create' and request_mode='ranked') then raise exception 'Invalid match settings'; end if;
    if action='queue' then
     select * into room from arena_private.matches m where m.mode=request_mode and m.format=fmt and m.code is null
      and m.guest is null and m.result is null and m.created>now()-interval '20 minutes' order by m.created limit 1;
    end if;
   end if;
   if room.id is null then
    insert into arena_private.matches(host,mode,format,code) values(uid,request_mode,fmt,
     case when action='create' then upper(replace(gen_random_uuid()::text,'-','')) end) returning * into room;
   else
    update arena_private.matches set guest=uid where id=room.id returning * into room;
   end if;
  end if;
 else
  select * into room from arena_private.matches m where m.id=(args->>'id')::uuid and uid in(m.host,m.guest);
  if room.id is null then raise exception 'Match unavailable'; end if;
 end if;

 if room.result is null then
  if action='leave' then
   if room.mode in ('ranked','unranked') and room.guest is not null then
    raise exception 'You can leave once the PvP match finishes';
   end if;
   outcome:=case when room.field is null or room.mode='coop' then 'cancelled'
    when uid=room.host then 'guest' else 'host' end;
   perform arena_private.finish_online(room.id,outcome);
   room.result:=outcome;
  elsif action='lock' then
   picks:=args->'picks';
   if room.guest is null then raise exception 'Wait for another player'; end if;
   if (uid=room.host and room.host_pick is null) or (uid=room.guest and room.guest_pick is null) then
    if jsonb_typeof(picks) is distinct from 'array' then raise exception 'Choose your leads'; end if;
    select save_data->'entries' into catalog from public.arena_saves where user_id=uid;
    if uid=room.host then room.host_entries:=catalog; else room.guest_entries:=catalog; end if;
    catalog:=(catalog->>'pokemon-arena-team')::jsonb;
    if jsonb_typeof(catalog) is distinct from 'array' or jsonb_array_length(catalog) not between room.format and 6
     then raise exception 'Save a battle team with enough Pokémon before joining'; end if;
    if jsonb_array_length(picks)<>room.format or
      (select count(distinct value) from jsonb_array_elements(picks))<>room.format or
      exists(select 1 from jsonb_array_elements(picks) where not catalog @> jsonb_build_array(value))
      then raise exception 'Choose distinct Pokémon from your battle team'; end if;
    picks:=picks || coalesce((select jsonb_agg(value order by ordinality)
     from jsonb_array_elements(catalog) with ordinality where not picks @> jsonb_build_array(value)), '[]');
    if uid=room.host then room.host_pick:=picks; else room.guest_pick:=picks; end if;
    if room.host_pick is not null and room.guest_pick is not null then
     room.field:='[]'::jsonb;
     room.next_tick:=clock_timestamp();
    end if;
    update arena_private.matches set host_pick=room.host_pick,guest_pick=room.guest_pick,
     host_entries=room.host_entries,guest_entries=room.guest_entries,field=room.field,next_tick=room.next_tick where id=room.id;
   end if;
  end if;
 end if;
 return jsonb_build_object('id',room.id,'code',room.code,'mode',room.mode,'format',room.format,
  'joined',room.guest is not null,'locked',case when uid=room.host then room.host_pick is not null else room.guest_pick is not null end,
  'opponentLocked',case when uid=room.host then room.guest_pick is not null else room.host_pick is not null end,
   'side',case when uid=room.host then 'host' else 'guest' end,
  'started',room.field is not null and room.host_entries is not null and room.guest_entries is not null,
  'result',room.result,'turn',room.turn);

end;
$$;
revoke all on function public.arena_online(text,jsonb) from public,anon;
grant execute on function public.arena_online(text,jsonb) to authenticated;
