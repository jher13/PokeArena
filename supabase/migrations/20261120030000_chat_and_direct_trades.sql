begin;
create index if not exists social_friends_recipient on arena_private.friends(recipient,sender) where accepted;

create table arena_private.chat_messages (
 id bigint generated always as identity primary key,
 sender uuid not null references arena_private.players on delete cascade,
 channel text not null check (channel in ('world','guild','friend','trade')),
 guild_name text references arena_private.guilds(name) on delete cascade,
 recipient uuid references arena_private.players on delete cascade,
 friends_at_send uuid[] not null default '{}',
 body text not null check(length(body) between 1 and 400),
 client_id uuid not null, sent_at timestamptz not null default clock_timestamp(),
 unique(sender,client_id), check((channel='guild')=(guild_name is not null)),
 check(recipient is null or (channel='friend' and recipient<>sender))
);
create index chat_channel_recent on arena_private.chat_messages(channel,id desc);
create index chat_guild_recent on arena_private.chat_messages(guild_name,id desc) where channel='guild';
create index chat_friend_sent on arena_private.chat_messages(sender,recipient,id desc) where channel='friend';
create index chat_friend_audience on arena_private.chat_messages using gin(friends_at_send) where channel='friend' and recipient is null;
alter table arena_private.chat_messages enable row level security;
revoke all on arena_private.chat_messages from public,anon,authenticated;

create function public.arena_chat(channel_name text, peer_name text default null, body_text text default null, client_id uuid default null, expected_guild text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare
 viewer uuid:=auth.uid(); player arena_private.players; peer uuid; friend_ids uuid[]; contacts jsonb;
 message_text text; previous arena_private.chat_messages; history jsonb;
begin
 perform arena_private.require_session();
 select p.* into player from arena_private.players p where p.id=viewer;
 if player.id is null then raise exception 'Register an online trainer name to chat.';end if;
 if channel_name is null or channel_name not in ('world','guild','friend','trade') then raise exception 'Unknown chat channel.';end if;
 if peer_name is not null and channel_name<>'friend' then raise exception 'Choose Friend Chat for a private conversation.';end if;
 if channel_name='guild' and player.guild is null then
  if body_text is not null then raise exception 'Join a guild to send messages here.';end if;
  return jsonb_build_object('can_send',false,'messages','[]'::jsonb,'scope',null);
 end if;
 if channel_name='friend' then
  select coalesce(array_agg(p.id),'{}'),coalesce(jsonb_agg(p.name order by lower(p.name),p.name),'[]')
   into friend_ids,contacts from (
    select f.recipient as id from arena_private.friends f where f.sender=viewer and f.accepted
    union select f.sender from arena_private.friends f where f.recipient=viewer and f.accepted
   ) friend join arena_private.players p using(id) where p.id<>viewer;
  if peer_name is not null then
   select p.id into peer from arena_private.players p where p.name=peer_name and p.id=any(friend_ids);
   if peer is null then raise exception 'Choose someone on your accepted friend list.';end if;
  end if;
 end if;
 if body_text is not null then
  if channel_name='guild' and expected_guild is distinct from player.guild then raise exception 'Your guild changed. Review Guild Chat before sending.';end if;
  message_text:=regexp_replace(body_text,'^[[:space:]]+|[[:space:]]+$','','g');
  if client_id is null or length(message_text) not between 1 and 400 then raise exception 'Enter a message of 1–400 characters.';end if;
  if channel_name='friend' and cardinality(friend_ids)=0 then raise exception 'Add a friend to use Friend Chat.';end if;
  insert into arena_private.chat_messages(sender,channel,guild_name,recipient,friends_at_send,body,client_id)
   values(viewer,channel_name,case when channel_name='guild' then player.guild end,peer,
    case when channel_name='friend' and peer is null then friend_ids else '{}' end,message_text,client_id)
   on conflict on constraint chat_messages_sender_client_id_key do nothing;
  if not found then
   select m.* into previous from arena_private.chat_messages m where m.sender=viewer and m.client_id=arena_chat.client_id;
   if previous.body is distinct from message_text or previous.channel<>channel_name or previous.recipient is distinct from peer
    or previous.guild_name is distinct from (case when channel_name='guild' then player.guild end) then
    raise exception 'This message identifier already belongs to another message.';
   end if;
  end if;
 end if;
 select coalesce(jsonb_agg(to_jsonb(recent) order by recent.id),'[]') into history from (
  select m.id,p.name,m.body,m.sent_at,m.sender=viewer as mine from arena_private.chat_messages m
   join arena_private.players p on p.id=m.sender where m.channel=channel_name and (
   channel_name in ('world','trade') or (channel_name='guild' and m.guild_name=player.guild) or
   (channel_name='friend' and case when peer is null then
     m.recipient is null and (m.sender=viewer or (m.sender=any(friend_ids) and m.friends_at_send @> array[viewer]))
    else (m.sender=viewer and m.recipient=peer) or (m.sender=peer and m.recipient=viewer) end))
   order by m.id desc limit 60) recent;
 return jsonb_build_object('messages',history,'friends',contacts,'scope',case when channel_name='guild' then player.guild else peer_name end,
  'can_send',case when channel_name='friend' then cardinality(friend_ids)>0 else true end);
end $$;
revoke all on function public.arena_chat(text,text,text,uuid,text) from public,anon;
grant execute on function public.arena_chat(text,text,text,uuid,text) to authenticated;

create table arena_private.direct_trades (
 id uuid primary key default gen_random_uuid(), inviter uuid not null references arena_private.players,
 invitee uuid not null references arena_private.players, check(inviter<>invitee),
 status text not null default 'invited' check(status in ('invited','open','completed','cancelled','expired')),
 inviter_asset uuid references arena_private.market_assets, invitee_asset uuid references arena_private.market_assets,
 inviter_offer jsonb, invitee_offer jsonb,
 inviter_ready boolean not null default false, invitee_ready boolean not null default false,
 version integer not null default 0, ends_at timestamptz not null default clock_timestamp()+interval '10 minutes'
);
create unique index direct_trade_pair on arena_private.direct_trades(least(inviter,invitee),greatest(inviter,invitee))
 where status in ('invited','open');
create index direct_trade_inviter on arena_private.direct_trades(inviter,ends_at) where status in ('invited','open');
create index direct_trade_invitee on arena_private.direct_trades(invitee,ends_at) where status in ('invited','open');
alter table arena_private.direct_trades enable row level security;
revoke all on arena_private.direct_trades from public,anon,authenticated;

-- Caller holds the room row lock. Each held Pokémon has exactly one delivery when the room closes.
create function arena_private.finish_direct_trade(room arena_private.direct_trades,outcome text) returns void
language plpgsql set search_path=pg_catalog as $$
declare side record; destination uuid; title text; message text;
begin
 for side in select * from (values(room.inviter,room.inviter_asset,room.invitee,room.invitee_asset),
                                   (room.invitee,room.invitee_asset,room.inviter,room.inviter_asset)) s(owner,asset,partner,other_asset)
 loop
  if side.asset is not null then
   destination:=case when outcome='completed' then side.partner else side.owner end;
   update arena_private.market_assets set state='delivery',owner_id=destination
    where id=side.asset and owner_id=side.owner and state='escrow';
   if not found then raise exception 'The offered Pokémon is unavailable.';end if;
   insert into arena_private.market_deliveries(user_id,asset_id,event_key)
    values(destination,side.asset,room.id||':direct:'||side.owner);
  end if;
  title:=case outcome when 'completed' then 'Direct trade completed!' when 'expired' then 'Direct trade expired' else 'Direct trade closed' end;
  if outcome='completed' then
   select 'You received '||(a.pokemon->>'name')||' from '||p.name||'.' into message
    from arena_private.market_assets a join arena_private.players p on p.id=side.partner where a.id=side.other_asset;
  else
   select 'Your trade with '||p.name||case outcome when 'expired' then ' expired.' else ' was closed.' end||
    case when side.asset is null then '' else ' Your Pokémon is ready to return to your PC.' end into message
    from arena_private.players p where p.id=side.partner;
  end if;
  perform arena_private.market_notice(side.owner,room.id,title,message);
 end loop;
 update arena_private.direct_trades set status=outcome,version=version+1 where id=room.id;
end $$;

create function arena_private.expire_direct_trades(viewer uuid) returns void
language plpgsql set search_path=pg_catalog as $$
declare room arena_private.direct_trades;
begin
 if not exists(select 1 from arena_private.direct_trades d where viewer in (d.inviter,d.invitee)
  and d.status in ('invited','open') and d.ends_at<=clock_timestamp()) then return;end if;
 if not pg_try_advisory_xact_lock(hashtextextended(viewer::text,802771)) then return;end if;
 for room in select d.* from arena_private.direct_trades d where viewer in (d.inviter,d.invitee)
  and d.status in ('invited','open') and d.ends_at<=clock_timestamp() order by d.id limit 100 for update skip locked
 loop perform arena_private.finish_direct_trade(room,'expired');end loop;
end $$;

-- The existing delivery/notification poll releases abandoned offers for returning players.
alter function arena_private.market_settle_expired(integer) rename to market_settle_expired_listings;
create function arena_private.market_settle_expired(batch_limit integer default 100) returns integer
language plpgsql security definer set search_path=pg_catalog as $$
begin
 perform arena_private.expire_direct_trades(auth.uid());
 return arena_private.market_settle_expired_listings(batch_limit);
end $$;

create function arena_private.direct_trade_view(room arena_private.direct_trades, viewer uuid) returns jsonb
language sql stable set search_path=pg_catalog as $$
 select jsonb_build_object('id',room.id,'status',room.status,'version',room.version,'expires',room.ends_at,
  'incoming',viewer=room.invitee,'partner',partner.name,
  'pending_delivery',case when room.status in ('completed','cancelled','expired') then exists(
   select 1 from arena_private.market_deliveries d where d.user_id=viewer and d.claimed_at is null and
    d.event_key=room.id||':direct:'||(case when room.status='completed' then partner.id else viewer end)) else false end,
  'mine',case when viewer=room.inviter then room.inviter_offer else room.invitee_offer end,
  'theirs',case when viewer=room.inviter then room.invitee_offer else room.inviter_offer end,
  'ready',case when viewer=room.inviter then room.inviter_ready else room.invitee_ready end,
  'partner_ready',case when viewer=room.inviter then room.invitee_ready else room.inviter_ready end)
 from arena_private.players partner where partner.id=case when viewer=room.inviter then room.invitee else room.inviter end
$$;

create function public.arena_direct_trade(action text,args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=pg_catalog as $$
declare
 viewer uuid:=auth.uid(); trainer text; target uuid; room arena_private.direct_trades; rooms jsonb; mine boolean;
 saved jsonb; stamp timestamptz; taken record; mon jsonb; offer_summary jsonb; asset arena_private.market_assets; old_asset uuid;
 request_key uuid; signature text; previous arena_private.market_operations; result jsonb;
begin
 perform arena_private.require_session();
 select p.name into trainer from arena_private.players p where p.id=viewer;
 if trainer is null then raise exception 'Register an online trainer name to trade.';end if;
 if action in ('availability','invite') then
  select p.id into target from arena_private.players p where p.name=args->>'name' and p.id<>viewer
   and p.last_seen>clock_timestamp()-interval '90 seconds';
  if action='availability' then return jsonb_build_object('available',target is not null);end if;
  if target is null then raise exception 'Choose another trainer who is online.';end if;
 end if;
 if action='offer' then
  -- Keep the same save lock, revision, ownership ledger and replay journal as the Trading Hub.
  perform pg_advisory_xact_lock(hashtextextended(viewer::text,802771));
  select s.save_data,s.updated_at into saved,stamp from public.arena_saves s where s.user_id=viewer for update;
  if saved is null then raise exception 'Sync your PC before trading.';end if;
  request_key:=(args->>'request_id')::uuid;
  if request_key is null then raise exception 'A transaction identifier is required.';end if;
  signature:=md5('direct_offer'||(args-'request_id'-'expected_revision')::text);
  select o.* into previous from arena_private.market_operations o where o.user_id=viewer and o.request_id=request_key;
  if found then
   if previous.action<>'direct_offer' or previous.payload_hash<>signature then raise exception 'That transaction identifier has already been used.';end if;
   return previous.response||jsonb_build_object('save_data',saved,'updated_at',stamp,'replayed',true);
  end if;
 end if;
 if action in ('inbox','invite') then perform arena_private.expire_direct_trades(viewer);end if;
 if action='inbox' then
  select coalesce(jsonb_agg(jsonb_build_object('id',d.id,'status',d.status,'incoming',viewer=d.invitee,'partner',p.name)
   order by d.ends_at desc),'[]') into rooms from arena_private.direct_trades d join arena_private.players p
   on p.id=case when viewer=d.inviter then d.invitee else d.inviter end
   where viewer in (d.inviter,d.invitee) and d.status in ('invited','open') and d.ends_at>clock_timestamp();
  return jsonb_build_object('rooms',rooms);
 elsif action='invite' then
  perform pg_advisory_xact_lock(hashtextextended(least(viewer,target)::text||greatest(viewer,target)::text,802772));
  perform 1 from arena_private.players p where p.id=target and p.last_seen>clock_timestamp()-interval '90 seconds' for share;
  if not found then raise exception 'That trainer is no longer online.';end if;
  select d.* into room from arena_private.direct_trades d where least(d.inviter,d.invitee)=least(viewer,target)
   and greatest(d.inviter,d.invitee)=greatest(viewer,target) and d.status in ('invited','open') for update;
  if room.id is not null and room.ends_at<=clock_timestamp() then perform arena_private.finish_direct_trade(room,'expired');room:=null;end if;
  if room.id is null then
   insert into arena_private.direct_trades(inviter,invitee) values(viewer,target) returning * into room;
   perform arena_private.market_notice(target,room.id,'Direct trade invitation',trainer||' invited you to trade Pokémon.');
  end if;
  return arena_private.direct_trade_view(room,viewer);
 end if;
 select d.* into room from arena_private.direct_trades d where d.id=(args->>'id')::uuid and viewer in (d.inviter,d.invitee) for update;
 if room.id is null then raise exception 'This direct trade is unavailable.';end if;
 mine:=viewer=room.inviter;
 if room.status in ('invited','open') and room.ends_at<=clock_timestamp() then
  perform arena_private.finish_direct_trade(room,'expired');room.status:='expired';room.version:=room.version+1;
 end if;
 if action='view' or (action in ('accept','confirm','cancel') and room.status in ('cancelled','expired','completed')) then
  return arena_private.direct_trade_view(room,viewer);
 end if;
 if action='accept' then
  if mine then raise exception 'Only the invited trainer can accept.';end if;
  if room.status='invited' then
   update arena_private.direct_trades set status='open',ends_at=clock_timestamp()+interval '10 minutes' where id=room.id returning * into room;
  end if;
 elsif action='cancel' then
  perform arena_private.finish_direct_trade(room,'cancelled');
 elsif action in ('offer','confirm') then
  if room.status<>'open' then raise exception 'Open an accepted trade first.';end if;
  if room.version is distinct from (args->>'version')::integer then raise exception 'The offers changed. Review both Pokémon again.';end if;
  if action='confirm' then
   if room.inviter_asset is null or room.invitee_asset is null then raise exception 'Both trainers must offer a Pokémon first.';end if;
   update arena_private.direct_trades set inviter_ready=inviter_ready or mine,invitee_ready=invitee_ready or not mine
    where id=room.id returning * into room;
   if room.inviter_ready and room.invitee_ready then perform arena_private.finish_direct_trade(room,'completed');end if;
  else
   if stamp is distinct from (args->>'expected_revision')::timestamptz then
    return jsonb_build_object('status','conflict','message','Your PC changed. Sync your PC before trading.');
   end if;
   if arena_private.save_issue(saved) is not null then raise exception 'Sync a valid PC before offering a Pokémon.';end if;
   old_asset:=case when mine then room.inviter_asset else room.invitee_asset end;
   select * into taken from arena_private.market_take(saved,args->'selector'->>'name',(args->'selector'->>'slot')::integer,
    args->'selector'->>'fingerprint',old_asset is not null);
   mon:=taken.pokemon;
   if mon->'profile'->>'trade_id' is null then
    if (select count(*) from arena_private.market_pokemon_rows(saved) r where r.name=mon->>'name' and r.pokemon->'profile'->'pid'=mon->'profile'->'pid')<>1
     then raise exception 'Choose a copy with an unambiguous identity.';end if;
    insert into arena_private.market_assets(owner_id,state,source_user_id,source_name,source_pid,pokemon)
     values(viewer,'escrow',viewer,mon->>'name',(mon->'profile'->>'pid')::bigint,mon) returning * into asset;
    mon:=jsonb_set(mon,'{profile,trade_id}',to_jsonb(asset.id::text));
   else
    select a.* into asset from arena_private.market_assets a where a.id=(mon->'profile'->>'trade_id')::uuid
     and a.owner_id=viewer and a.state='owned' for update;
    if not found then raise exception 'This Pokémon is unavailable to trade.';end if;
   end if;
   update arena_private.market_assets set state='escrow',pokemon=mon where id=asset.id;
   offer_summary:=arena_private.market_metadata(mon)||jsonb_build_object('moves',mon->'moves');
   saved:=taken.new_document;
   if old_asset is not null then
    update arena_private.market_assets set state='owned' where id=old_asset and owner_id=viewer and state='escrow' returning pokemon into mon;
    if not found then raise exception 'Your previous offer could not be returned.';end if;
    saved:=arena_private.market_put(saved,mon);
   end if;
   update arena_private.direct_trades set inviter_asset=case when mine then asset.id else inviter_asset end,
    invitee_asset=case when mine then invitee_asset else asset.id end,
    inviter_offer=case when mine then offer_summary else inviter_offer end,invitee_offer=case when mine then invitee_offer else offer_summary end,
    inviter_ready=false,invitee_ready=false,version=version+1,ends_at=clock_timestamp()+interval '10 minutes' where id=room.id returning * into room;
   stamp:=clock_timestamp();update public.arena_saves set save_data=saved,updated_at=stamp where user_id=viewer;
   result:=jsonb_build_object('status','ok','room_id',room.id);
   insert into arena_private.market_operations(user_id,request_id,action,payload_hash,response) values(viewer,request_key,'direct_offer',signature,result);
   return result||jsonb_build_object('save_data',saved,'updated_at',stamp);
  end if;
 else raise exception 'Unknown direct trade action.';
 end if;
 select d.* into room from arena_private.direct_trades d where d.id=room.id;
 return arena_private.direct_trade_view(room,viewer);
end $$;
revoke all on function arena_private.finish_direct_trade(arena_private.direct_trades,text),arena_private.expire_direct_trades(uuid),
 arena_private.market_settle_expired(integer),arena_private.direct_trade_view(arena_private.direct_trades,uuid),
 public.arena_direct_trade(text,jsonb) from public,anon,authenticated;
grant execute on function public.arena_direct_trade(text,jsonb) to authenticated;
commit;
