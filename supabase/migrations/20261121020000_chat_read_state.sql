begin;

create table arena_private.chat_notification_preferences (
 player_id uuid primary key references arena_private.players(id) on delete cascade,
 start_id bigint not null,
 muted boolean not null default false
);
create table arena_private.chat_read_positions (
 player_id uuid not null references arena_private.players(id) on delete cascade,
 scope text not null, last_id bigint not null,
 primary key(player_id,scope)
);
alter table arena_private.chat_notification_preferences enable row level security;
alter table arena_private.chat_read_positions enable row level security;
revoke all on arena_private.chat_notification_preferences,arena_private.chat_read_positions from public,anon,authenticated;

-- Count new mail from rollout for existing accounts and from registration for new ones.
create function arena_private.start_chat_notifications() returns trigger
language plpgsql security definer set search_path=pg_catalog as $$
begin
 insert into arena_private.chat_notification_preferences(player_id,start_id)
 values(new.id,coalesce((select max(m.id) from arena_private.chat_messages m),0));
 return new;
end $$;
revoke all on function arena_private.start_chat_notifications() from public,anon,authenticated;
create trigger start_chat_notifications after insert on arena_private.players
 for each row execute function arena_private.start_chat_notifications();
insert into arena_private.chat_notification_preferences(player_id,start_id)
 select p.id,coalesce((select max(m.id) from arena_private.chat_messages m),0) from arena_private.players p
 on conflict do nothing;

-- The friends feed and each private conversation have independent read positions.
create function arena_private.chat_notification_scopes(viewer uuid)
returns table(channel text,scope text,display_name text,peer uuid) language sql stable as $$
 select * from (values ('world','world',null::text,null::uuid),('trade','trade',null,null),('friend','friend',null,null)) feeds
 union all
 select 'guild','guild:'||p.guild,p.guild,null from arena_private.players p where p.id=viewer and p.guild is not null
 union all
 select 'friend','dm:'||p.id::text,p.name,p.id
 from (select f.recipient as id from arena_private.friends f where f.accepted and f.sender=viewer
       union select f.sender from arena_private.friends f where f.accepted and f.recipient=viewer) friends
 join arena_private.players p using(id) where p.id<>viewer
$$;

-- Match arena_chat audiences. Only incoming messages can create a notification.
create function arena_private.incoming_chat_ids(viewer uuid,feed text,display_name text,peer uuid,after_id bigint,through_id bigint)
returns table(id bigint) language sql stable as $$
 -- Separate branches let PostgreSQL use the guild, private pair and friend-audience indexes.
 select incoming.id from (
  select m.id from arena_private.chat_messages m
   where feed in ('world','trade') and m.channel=feed and m.sender<>viewer
  union all
  select m.id from arena_private.chat_messages m
   where feed='guild' and m.channel='guild' and m.guild_name=display_name and m.sender<>viewer
  union all
  select m.id from arena_private.chat_messages m
   where feed='friend' and peer is not null and m.channel='friend' and m.sender=peer and m.recipient=viewer
  union all
  select m.id from arena_private.chat_messages m
   where feed='friend' and peer is null and m.channel='friend' and m.recipient is null
    and m.sender<>viewer and m.friends_at_send @> array[viewer] and exists(
     select 1 from arena_private.friends f where f.accepted and
      ((f.sender=viewer and f.recipient=m.sender) or (f.recipient=viewer and f.sender=m.sender)))
 ) incoming where incoming.id>after_id and incoming.id<=through_id
$$;
revoke all on function arena_private.chat_notification_scopes(uuid),
 arena_private.incoming_chat_ids(uuid,text,text,uuid,bigint,bigint) from public,anon,authenticated;

create function public.arena_chat_notifications(read_through bigint default null,mute_notifications boolean default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
 viewer uuid:=auth.uid(); prefs arena_private.chat_notification_preferences; seen_scope text; result jsonb;
begin
 perform arena_private.require_session();
 select * into strict prefs from arena_private.chat_notification_preferences where player_id=viewer;
 if mute_notifications is not null then
  update arena_private.chat_notification_preferences set muted=mute_notifications where player_id=viewer returning * into prefs;
 end if;
 if read_through>prefs.start_id then
  select s.scope into seen_scope from arena_private.chat_notification_scopes(viewer) s
  cross join lateral arena_private.incoming_chat_ids(viewer,s.channel,s.display_name,s.peer,read_through-1,read_through) m;
  if found then
   insert into arena_private.chat_read_positions as pos(player_id,scope,last_id) values(viewer,seen_scope,read_through)
   on conflict(player_id,scope) do update set last_id=excluded.last_id where pos.last_id<excluded.last_id;
  end if;
 end if;
 with counts as (
  select s.channel,s.scope,s.peer,s.display_name,unread.n
  from arena_private.chat_notification_scopes(viewer) s
  left join arena_private.chat_read_positions pos on pos.player_id=viewer and pos.scope=s.scope
  cross join lateral (
   select count(*) as n from (
    select m.id from arena_private.incoming_chat_ids(viewer,s.channel,s.display_name,s.peer,
     coalesce(pos.last_id,prefs.start_id),9223372036854775807) m limit 100
   ) recent
  ) unread
 )
 select jsonb_build_object('muted',prefs.muted,'counts',jsonb_build_object(
  'world',coalesce(sum(n) filter(where channel='world'),0),'trade',coalesce(sum(n) filter(where channel='trade'),0),
  'guild',coalesce(sum(n) filter(where channel='guild'),0),'friend',coalesce(sum(n) filter(where channel='friend'),0)),
  'friend_feed',coalesce(sum(n) filter(where scope='friend'),0),
  'peers',coalesce(jsonb_object_agg(display_name,n) filter(where peer is not null and n>0),'{}'::jsonb))
 into result from counts;
 return result;
end $$;
revoke all on function public.arena_chat_notifications(bigint,boolean) from public,anon;
grant execute on function public.arena_chat_notifications(bigint,boolean) to authenticated;
commit;
