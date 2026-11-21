begin;

create function arena_private.profile_fields_valid(profile jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare total numeric;
begin
 if jsonb_typeof(profile) is distinct from 'object'
 or (profile ? 'personalityId' and not arena_private.whole_number(profile->'personalityId',0,29))
 or not arena_private.whole_number(profile->'pid',0,4294967295)
 or jsonb_typeof(profile->'ivs') is distinct from 'array'
 or jsonb_typeof(profile->'evs') is distinct from 'array' then return false; end if;
 if jsonb_array_length(profile->'ivs')<>6 or jsonb_array_length(profile->'evs')<>6 then return false; end if;
 if exists(select 1 from jsonb_array_elements(profile->'ivs') as iv(value) where not arena_private.whole_number(value,0,31))
 or exists(select 1 from jsonb_array_elements(profile->'evs') as ev(value) where not arena_private.whole_number(value,0,252))
 then return false; end if;
 select sum((value::text)::numeric) into total from jsonb_array_elements(profile->'evs') as ev(value);
 return total<=510;
end
$$;

-- Preserve the validator's identity for existing save, campaign and trade functions.
create or replace function arena_private.profile_valid(profile jsonb)
returns boolean language sql immutable set search_path=pg_catalog as $$
 select case when arena_private.profile_fields_valid(profile) then
  (select sum(iv::numeric)<=93 from jsonb_array_elements_text(profile->'ivs') iv)
 else false end
$$;

create function arena_private.capped_pc_profile(profile jsonb) returns jsonb
language plpgsql immutable strict set search_path=pg_catalog as $$
declare
 old_ivs int[]; total int; best int; trait int; stat int; i int; pid bigint;
 stat_order int[]:=array[0,1,2,3,5,4]; seed bigint; remaining int; roll int; ivs int[];
begin
 if not arena_private.profile_fields_valid(profile) then return profile;end if;
 select array_agg(iv::numeric::int order by ord),sum(iv::numeric),max(iv::numeric)
 into old_ivs,total,best from jsonb_array_elements_text(profile->'ivs') with ordinality as v(iv,ord);
 if total<=93 then return profile;end if;
 pid:=(profile->>'pid')::numeric::bigint;
 if not profile ? 'personalityId' then
  for i in 0..5 loop
   stat:=stat_order[((pid%6+i)%6)::int+1];
   if old_ivs[stat+1]=best then exit;end if;
  end loop;
  trait:=stat*5+best%5;
  profile:=jsonb_set(profile,'{personalityId}',to_jsonb(trait));
 end if;
 -- This is the same bounded draw as cappedOwnedProfile in the client and battle engine.
 seed:=pid%2147483646+1;
 loop
  ivs:='{}';remaining:=93;
  for i in 1..5 loop
   seed:=seed*48271%2147483647;roll:=seed%32;
   ivs:=array_append(ivs,roll);remaining:=remaining-roll;
  end loop;
  if remaining between 0 and 31 then
   return jsonb_set(profile,'{ivs}',to_jsonb(array_append(ivs,remaining)));
  end if;
 end loop;
end $$;

create function arena_private.capped_pc_save(document jsonb) returns jsonb
language plpgsql immutable strict set search_path=pg_catalog as $$
declare active jsonb;progress jsonb;copies jsonb;adjusted jsonb;
begin
 if jsonb_typeof(document->'entries'->'pokemon-arena-profiles')='string' then
  active:=arena_private.market_entry(document,'pokemon-arena-profiles','{}');
  if jsonb_typeof(active)='object' then
   select coalesce(jsonb_object_agg(p.key,arena_private.capped_pc_profile(p.value)),'{}') into adjusted from jsonb_each(active) p;
   if adjusted<>active then document:=arena_private.market_set(document,'pokemon-arena-profiles',adjusted);end if;
  end if;
 end if;
 if jsonb_typeof(document->'entries'->'pokemon-arena-wild-progress')='string' then
  progress:=arena_private.market_entry(document,'pokemon-arena-wild-progress','{}');copies:=progress->'copies';
  if jsonb_typeof(copies)='object' then
   select coalesce(jsonb_object_agg(g.key,case when jsonb_typeof(g.value)='array' then
    (select coalesce(jsonb_agg(case when jsonb_typeof(c.mon)='object' and c.mon ? 'profile'
     then jsonb_set(c.mon,'{profile}',arena_private.capped_pc_profile(c.mon->'profile')) else c.mon end order by c.ord),'[]')
     from jsonb_array_elements(g.value) with ordinality as c(mon,ord)) else g.value end),'{}') into adjusted
    from jsonb_each(copies) g;
   if adjusted<>copies then
    document:=arena_private.market_set(document,'pokemon-arena-wild-progress',jsonb_set(progress,'{copies}',adjusted));
   end if;
  end if;
 end if;
 return document;
exception when invalid_text_representation then return document; -- Hand malformed entries back to the regular save validator.
end $$;

revoke all on function arena_private.profile_fields_valid(jsonb),arena_private.capped_pc_profile(jsonb),
 arena_private.capped_pc_save(jsonb) from public,anon,authenticated;

-- An old client may finish an automatic battle before it sees the new version.
-- Normalize a legacy spread only on a matching revision and keep validation on the usual fast path.
create or replace function public.arena_write_save(payload jsonb,expected_revision timestamptz)
returns jsonb language plpgsql security definer set search_path=pg_catalog as $$
declare uid uuid:=auth.uid();stamp timestamptz;issue text;
begin
 perform arena_private.require_session();perform pg_advisory_xact_lock(hashtextextended(uid::text,802771));
 select updated_at into stamp from public.arena_saves where user_id=uid for update;
 if stamp is not distinct from expected_revision then
  issue:=arena_private.save_issue(payload);
  if issue in ('profile_limits','copy_limits') then
   payload:=arena_private.capped_pc_save(payload);
   issue:=arena_private.save_issue(payload);
  end if;
  issue:=coalesce(issue,arena_private.campaign_save_issue(uid,payload));
  if issue is not null then
   insert into arena_private.market_security_events(user_id,reason) values(uid,issue);
   return jsonb_build_object('status','rejected','reason',issue);
  end if;
 end if;
 return public.arena_write_save_before_campaign(payload,expected_revision);
end $$;
revoke all on function public.arena_write_save(jsonb,timestamptz) from public,anon;
grant execute on function public.arena_write_save(jsonb,timestamptz) to authenticated;

-- Keep trades and PC saves consistent throughout the one-time backfill, including in-flight deliveries.
lock table public.arena_saves,arena_private.market_assets,arena_private.market_listings,arena_private.direct_trades in share row exclusive mode;
with converted as materialized (
 select user_id,arena_private.capped_pc_save(save_data) as doc from public.arena_saves
)
update public.arena_saves s set save_data=c.doc from converted c where s.user_id=c.user_id and s.save_data<>c.doc;

with converted as materialized (
 select id,arena_private.capped_pc_profile(pokemon->'profile') as profile from arena_private.market_assets
)
update arena_private.market_assets a set pokemon=jsonb_set(a.pokemon,'{profile}',c.profile) from converted c
 where a.id=c.id and a.pokemon->'profile'<>c.profile;
update arena_private.market_listings l set pokemon=arena_private.market_metadata(a.pokemon),version=l.version+1
 from arena_private.market_assets a where l.status='open' and l.asset_id=a.id and (l.pokemon->>'iv_total')::int>93;

with offers as (
 select r.id,
  case when (r.inviter_offer->>'iv_total')::int>93 then r.inviter_offer||arena_private.market_metadata(a.pokemon) else r.inviter_offer end as inviter,
  case when (r.invitee_offer->>'iv_total')::int>93 then r.invitee_offer||arena_private.market_metadata(b.pokemon) else r.invitee_offer end as invitee
 from arena_private.direct_trades r
 left join arena_private.market_assets a on a.id=r.inviter_asset
 left join arena_private.market_assets b on b.id=r.invitee_asset
 where r.status='open'
)
update arena_private.direct_trades r set inviter_offer=o.inviter,invitee_offer=o.invitee,
 inviter_ready=false,invitee_ready=false,version=r.version+1
from offers o where o.id=r.id and (r.inviter_offer is distinct from o.inviter or r.invitee_offer is distinct from o.invitee);
commit;
