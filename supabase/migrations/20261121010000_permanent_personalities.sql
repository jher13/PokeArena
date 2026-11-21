-- Keep PC and trade descriptions consistent after IV training.
create or replace function arena_private.profile_valid(profile jsonb)
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

create or replace function arena_private.market_metadata(pokemon jsonb)
returns jsonb language plpgsql stable set search_path=pg_catalog as $$
declare c arena_private.market_species; p jsonb:=pokemon->'profile'; pid bigint; best integer; i integer; stat integer; trait integer;
 nature_names text[]:=array['Hardy','Lonely','Adamant','Naughty','Brave','Bold','Docile','Impish','Lax','Relaxed','Modest','Mild','Bashful','Rash','Quiet','Calm','Gentle','Careful','Quirky','Sassy','Timid','Hasty','Jolly','Naive','Serious'];
 personalities text[][]:=array[array['Hearty','Sleepy','Easygoing','Messy','Relaxed'],array['Proud','Energetic','Hotheaded','Competitive','Feisty'],array['Steady','Resilient','Persistent','Enduring','Determined'],array['Swift','Alert','Impulsive','Playful','Skittish'],array['Resolute','Vain','Defiant','Driven','Stubborn'],array['Curious','Mischievous','Clever','Thoughtful','Picky']];
 stat_order integer[]:=array[0,1,2,3,5,4];
begin
 select * into c from arena_private.market_species where name=pokemon->>'name';
 if c.dex is null or not arena_private.profile_valid(p) then raise exception 'This Pokémon has invalid saved stats.'; end if;
 pid:=(p->>'pid')::bigint;
 if p ? 'personalityId' then
  stat:=((p->>'personalityId')::numeric::integer)/5;
  trait:=((p->>'personalityId')::numeric::integer)%5;
 else
  select max(value::integer) into best from jsonb_array_elements_text(p->'ivs');
  for i in 0..5 loop
   stat:=stat_order[((pid%6+i)%6)::integer+1];
   if (p->'ivs'->>stat)::integer=best then exit; end if;
  end loop;
  trait:=best%5;
 end if;
 return jsonb_build_object('name',c.name,'number',c.national_dex,'generation',c.generation,'types',to_jsonb(c.types),
  'level',(pokemon->>'level')::integer,'nature',nature_names[(pid%25)::integer+1],
  'personality',personalities[stat+1][trait+1],'ivs',p->'ivs','evs',p->'evs',
  'iv_total',(select sum(value::integer) from jsonb_array_elements_text(p->'ivs')),
  'shiny',coalesce(p->'shiny','false'),'ability',p->>'abilityOverride');
end $$;
