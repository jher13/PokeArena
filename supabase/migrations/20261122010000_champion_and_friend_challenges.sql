begin;

create table arena_private.spar_defenses (
 player uuid primary key references auth.users on delete cascade,
 entries jsonb not null
);
create table arena_private.journey_runs (
 id uuid primary key default gen_random_uuid(),
 owner uuid not null references auth.users on delete cascade,
 opponent uuid references auth.users on delete cascade,
 kind text not null check(kind in ('spar','champion')),
 week date not null,
 entries jsonb not null,
 defense jsonb,
 reply_to uuid unique references arena_private.journey_runs(id) on delete set null,
 allow_rematch boolean not null default false,
 prestige boolean not null default false,
 stage integer not null default 0,
 hp jsonb,
 healed boolean not null default false,
 status text not null default 'ready',
 state jsonb,
 revision integer not null default 0,
 created timestamptz not null default now()
);
create unique index journey_one_gauntlet on arena_private.journey_runs(owner,week) where kind='champion' and status in ('ready','playing');
create unique index journey_one_spar on arena_private.journey_runs(owner,opponent) where kind='spar' and status='playing';
create index journey_spar_inbox on arena_private.journey_runs(opponent,created desc) where kind='spar';
create table arena_private.champion_prizes (
 player uuid references auth.users on delete cascade, week date, reward text not null, primary key(player,week)
);
create table arena_private.champion_laurels(player uuid primary key references auth.users on delete cascade);
create table arena_private.guild_raid_marks (
 guild text not null references arena_private.guilds(name) on delete cascade,
 week date not null, boss text not null,
 primary key(guild,week,boss)
);
create table arena_private.guild_raid_parties (
 guild text references arena_private.guilds(name) on delete cascade, week date, party text, runs integer not null,
 primary key(guild,week,party)
);
create table arena_private.guild_raid_banners(guild text primary key references arena_private.guilds(name) on delete cascade);
create function arena_private.journey_week() returns date language sql stable set search_path=pg_catalog as $$
 select date_trunc('week',now() at time zone 'UTC')::date
$$;
create function arena_private.journey_view(r arena_private.journey_runs) returns jsonb language sql stable set search_path=pg_catalog as $$
 select jsonb_build_object('id',r.id,'kind',r.kind,'week',r.week,'prestige',r.prestige,'stage',r.stage,'healed',r.healed,'hp',r.hp,'status',r.status,
  'canReply',r.allow_rematch and r.opponent=auth.uid() and r.created>=now()-interval '7 days' and not exists(select from arena_private.journey_runs j where j.reply_to=r.id),
  'defending',r.opponent=auth.uid(),'team',(r.entries->>'pokemon-arena-team')::jsonb,'opponent',(select name from arena_private.players where id=r.opponent),
  'challenger',(select name from arena_private.players where id=r.owner))
$$;
create function arena_private.guild_raid_victory() returns trigger language plpgsql security definer set search_path=pg_catalog as $$
declare guild_name text; party_key text; key text:=replace(new.mode,'_master',''); this_week date:=arena_private.journey_week();
begin
 if old.result is not null or new.result is null or new.result not in ('coop_win','coop_loss') or key not in ('coop_mega','coop_mega_2','coop_mega_3') then return new;end if;
 select md5(string_agg(distinct s->>'uid',',' order by s->>'uid')) into party_key from jsonb_array_elements(new.raid_seats) s
  where s->>'pokemon' is not null and s->>'substitute' is distinct from 'true';
 for guild_name in
  select p.guild from jsonb_array_elements(new.raid_seats) s join arena_private.players p on p.id::text=s->>'uid'
  join arena_private.guilds g on g.name=p.guild
  where s->>'pokemon' is not null and s->>'substitute' is distinct from 'true'
  group by p.guild having count(distinct p.id)>=2
 loop
  perform pg_advisory_xact_lock(hashtextextended(guild_name,72201));
  insert into arena_private.guild_raid_parties as p values(guild_name,this_week,party_key,1) on conflict(guild,week,party) do update set runs=p.runs+1;
  if new.result='coop_loss' then continue;end if;
  insert into arena_private.guild_raid_marks values(guild_name,this_week,key) on conflict do nothing;
  if (select count(*) from arena_private.guild_raid_marks m where m.guild=guild_name and m.week=this_week)=3 then
   insert into arena_private.guild_raid_banners values(guild_name) on conflict do nothing;
  end if;
 end loop;
 return new;
end $$;
create trigger journey_guild_victory after update of result on arena_private.matches for each row execute function arena_private.guild_raid_victory();

create function public.arena_journey(action text,args jsonb default '{}') returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare me uuid:=auth.uid(); them arena_private.players; this_week date:=arena_private.journey_week(); g text; doc jsonb; rev timestamptz;
 r arena_private.journey_runs; pinned jsonb; team jsonb; defense jsonb; can_spar boolean; award jsonb; paid text; want text; token uuid;
begin
 perform arena_private.require_session();
 if me is null then raise exception 'Sign in to play.';end if;
 if action='guild' then
  select guild into g from arena_private.players where id=me;
  return jsonb_build_object('guild',g,'week',this_week,'marks',coalesce((select jsonb_agg(m.boss order by m.boss) from arena_private.guild_raid_marks m where m.guild=g and m.week=this_week),'[]'),
   'banner',exists(select from arena_private.guild_raid_banners b where b.guild=g),
   'parties',(select count(*) from arena_private.guild_raid_parties p where p.guild=g and p.week=this_week),
   'repeats',(select count(*) from arena_private.guild_raid_parties p where p.guild=g and p.week=this_week and p.runs>=2));
 end if;
 if action='profile' or action='spar' then
  select * into them from arena_private.players p where p.name=args->>'name';
  can_spar:=them.id is not null and exists(select from arena_private.friends f where f.accepted and
   ((f.sender=me and f.recipient=them.id) or (f.sender=them.id and f.recipient=me)));
  if action='profile' then
   select save_data into doc from public.arena_saves where user_id=them.id;
   return jsonb_build_object('canSpar',can_spar and exists(select from arena_private.spar_defenses d where d.player=them.id),
    'laurel',exists(select from arena_private.champion_laurels l where l.player=them.id) and coalesce(arena_private.market_entry(doc,'pokemon-arena-wild-progress','{}')->'trainerCard'->>'championLaurel','true')='true',
    'banner',exists(select from arena_private.guild_raid_banners b where b.guild=them.guild) and coalesce(arena_private.market_entry(doc,'pokemon-arena-wild-progress','{}')->'trainerCard'->>'guildBanner','true')='true');
  end if;
 end if;
 if action='status' then
  return jsonb_build_object('week',this_week,'run',(select arena_private.journey_view(j) from arena_private.journey_runs j where j.owner=me and j.kind='champion' and j.week=this_week order by j.created desc limit 1),
   'prize',(select c.reward from arena_private.champion_prizes c where c.player=me and c.week=this_week),
   'laurel',exists(select from arena_private.champion_laurels l where l.player=me),
   'defense',exists(select from arena_private.spar_defenses d where d.player=me));
 end if;
 if action='inbox' then
  return coalesce((select jsonb_agg(arena_private.journey_view(j) order by j.created desc) from (select * from arena_private.journey_runs j where kind='spar' and me in(j.owner,j.opponent) order by created desc limit 20) j),'[]');
 end if;
 perform pg_advisory_xact_lock(hashtextextended(me::text,802771));
 select save_data,updated_at into doc,rev from public.arena_saves where user_id=me for update;
 if doc is null then raise exception 'Sync a saved team first.';end if;
 if action='hide' then delete from arena_private.spar_defenses where player=me;update arena_private.journey_runs set allow_rematch=false where owner=me and allow_rematch;return '{"ok":true}';end if;
 if action in ('publish','start','spar') then
  pinned:=arena_private.campaign_build_entries(doc);team:=(pinned->>'pokemon-arena-team')::jsonb;
  if jsonb_array_length(team) not between 1 and 6 or exists(select from jsonb_array_elements_text(team) t(n) where (pinned->>'pokemon-arena-wild-progress')::jsonb->'owned'->>t.n is null) then raise exception 'Save your PC battle team first.';end if;
  if action='publish' then
   insert into arena_private.spar_defenses values(me,pinned) on conflict(player) do update set entries=excluded.entries;return '{"ok":true}';
  elsif action='spar' then
   if not can_spar then raise exception 'Only accepted friends can challenge this team.';end if;
   if args->>'reply_to' is not null then
    select j.entries into defense from arena_private.journey_runs j where j.id=(args->>'reply_to')::uuid and j.owner=them.id and j.opponent=me
     and j.kind='spar' and j.status in ('host','guest','draw') and j.allow_rematch and j.created>=now()-interval '7 days' for share;
   else select d.entries into defense from arena_private.spar_defenses d where d.player=them.id for share;end if;
   if defense is null then raise exception 'This friend has no published defense or available rematch.';end if;
   token:=(args->>'id')::uuid;if token is null then raise exception 'Missing challenge ID.';end if;
   select * into r from arena_private.journey_runs j where j.kind='spar' and j.owner=me and j.opponent=them.id and (j.id=token or j.status='playing' or j.reply_to=(args->>'reply_to')::uuid) order by j.created desc limit 1;
   if r.id is null then
    insert into arena_private.journey_runs(id,owner,opponent,kind,week,entries,defense,status,reply_to,allow_rematch)
     values(token,me,them.id,'spar',this_week,pinned,defense,'playing',(args->>'reply_to')::uuid,coalesce((args->>'allow_rematch')::boolean,false)) returning * into r;
   end if;
  else
   if exists(select from arena_private.campaign_regions c where not arena_private.campaign_complete(doc,c.region) or (coalesce((args->>'prestige')::boolean,false) and not arena_private.campaign_complete(doc,c.region,true))) or jsonb_array_length(team)<>6 then raise exception 'Complete all required badges and save a team of six.';end if;
   select * into r from arena_private.journey_runs j where j.kind='champion' and j.owner=me and j.week=this_week and j.status in ('ready','playing') for update;
   if r.id is null and not exists(select from arena_private.champion_prizes c where c.player=me and c.week=this_week) then
    select * into r from arena_private.journey_runs j where j.kind='champion' and j.owner=me and j.week=this_week and j.status='won' order by j.created desc limit 1;
   end if;
   if r.id is null then
    insert into arena_private.journey_runs(owner,kind,week,entries,prestige) values(me,'champion',this_week,pinned,coalesce((args->>'prestige')::boolean,false)) returning * into r;
   end if;
  end if;
  return arena_private.journey_view(r);
 end if;
 select * into r from arena_private.journey_runs j where j.id=(args->>'id')::uuid and j.owner=me and kind='champion' and week=this_week for update;
 if r.id is null then raise exception 'This weekly gauntlet is unavailable.';end if;
 if action='heal' then
  if r.status<>'ready' or r.stage=0 or r.healed then raise exception 'The team heal is unavailable.';end if;
  update arena_private.journey_runs set hp=null,healed=true where id=r.id returning * into r;
 elsif action='fight' then
  if r.status not in ('playing','ready') then raise exception 'This run has ended.';end if;
  update arena_private.journey_runs set status='playing' where id=r.id returning * into r;
 elsif action='retire' then
  if r.status in ('playing','ready') then update arena_private.journey_runs set status='retired',state=null,revision=revision+1 where id=r.id returning * into r;end if;
 elsif action='claim' then
  if r.status<>'won' then raise exception 'Win all three battles before claiming.';end if;
  want:=args->>'reward';if want is null or want not in ('Ability Capsule','Rare Candy') then raise exception 'Choose a weekly reward.';end if;
  select c.reward into paid from arena_private.champion_prizes c where c.player=me and week=this_week;
  if paid is null then
   if (args->>'expected_revision')::timestamptz is distinct from rev then return jsonb_build_object('status','conflict','message','Your cloud save changed. Resync before claiming.');end if;
   award:=case when want='Rare Candy' then '{"coins":0,"vitamins":{"Rare Candy":1}}'::jsonb else '{"coins":0,"capsules":1}'::jsonb end;
   insert into arena_private.champion_prizes values(me,this_week,want);paid:=want;
   doc:=arena_private.campaign_reward(doc,award);
   if arena_private.save_issue(doc) is not null then raise exception 'Your save could not receive this prize.';end if;
   rev:=clock_timestamp();update public.arena_saves set save_data=doc,updated_at=rev where user_id=me;
  end if;
  return jsonb_build_object('status','ok','reward',paid,'save_data',doc,'updated_at',rev);
 else raise exception 'Unknown challenge action.';end if;
 return arena_private.journey_view(r);
end $$;

create function public.arena_journey_read(player_id uuid,run_id uuid) returns jsonb language sql stable security definer set search_path=pg_catalog as $$
 select to_jsonb(j) from arena_private.journey_runs j where j.id=run_id and player_id in(j.owner,j.opponent)
 and (kind='spar' or week=arena_private.journey_week())
$$;
create function public.arena_journey_checkpoint(run_id uuid,expected integer,new_state jsonb,winner text,health jsonb) returns boolean language plpgsql security definer set search_path=pg_catalog as $$
declare r arena_private.journey_runs;sender_name text;receiver_name text; outcome text;
begin
 select * into r from arena_private.journey_runs where id=run_id and revision=expected and status='playing' for update;
 if r.id is null then return false;end if;
 if winner is null then
  update arena_private.journey_runs set state=new_state,revision=revision+1 where id=r.id;return true;
 end if;
 if r.kind='spar' then
  select name into sender_name from arena_private.players where id=r.owner;
  select name into receiver_name from arena_private.players where id=r.opponent;
  outcome:=case winner when 'host' then sender_name||' won' when 'guest' then receiver_name||' won' else 'The teams drew' end;
  perform arena_private.market_notice(r.opponent,r.id,'Friend sparring',sender_name||' challenged your saved team. '||outcome||'.');
  perform arena_private.market_notice(r.owner,r.id,'Friend sparring','Your team faced '||receiver_name||'. '||outcome||'.');
  update arena_private.journey_runs set state=null,status=winner,revision=revision+1 where id=r.id;
 else
  update arena_private.journey_runs set state=null,hp=health,stage=stage+case when winner='host' then 1 else 0 end,
   status=case when winner<>'host' then 'lost' when stage=2 then 'won' else 'ready' end,revision=revision+1 where id=r.id;
  if r.stage=2 and winner='host' and r.prestige then insert into arena_private.champion_laurels values(r.owner) on conflict do nothing;end if;
 end if;
 return true;
end $$;
revoke all on function public.arena_journey(text,jsonb) from public,anon;
grant execute on function public.arena_journey(text,jsonb) to authenticated;
revoke all on function public.arena_journey_read(uuid,uuid),public.arena_journey_checkpoint(uuid,integer,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.arena_journey_read(uuid,uuid),public.arena_journey_checkpoint(uuid,integer,jsonb,text,jsonb) to service_role;
revoke all on arena_private.spar_defenses,arena_private.journey_runs,arena_private.champion_prizes,arena_private.champion_laurels,
 arena_private.guild_raid_marks,arena_private.guild_raid_parties,arena_private.guild_raid_banners from public,anon,authenticated;
commit;
