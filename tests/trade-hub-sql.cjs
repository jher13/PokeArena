const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PGlite}=require('@electric-sql/pglite');
const root=path.join(__dirname,'..');
const migration=fs.readFileSync(path.join(root,'supabase/migrations/20261118010000_trading_hub.sql'),'utf8');
const ids=['10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003'];
const profile=pid=>({pid,ivs:Array(6).fill(31),evs:Array(6).fill(0),abilityOverride:'Pressure'});
function save(name,pid){return {version:2,entries:{
 'pokemon-arena-team':JSON.stringify([name,'Pikachu']),
 'pokemon-arena-profiles':JSON.stringify({[name==='Bulbasaur'?1:4]:profile(pid),25:profile(pid+100)}),
 'pokemon-arena-moves':JSON.stringify({[name]:['Tackle']}),
 'pokemon-arena-wild-progress':JSON.stringify({coins:10000,owned:{[name]:{level:50,xp:10},Pikachu:{level:20,xp:0}},copies:{},registered:[name,'Pikachu'],held:{[name]:'Charcoal'},items:{Charcoal:1},ai:{},autoRepeat:true}),
 'pokemon-arena-starter':JSON.stringify({name,ign:'Player '+pid}),
 'pokemon-arena-gym-badges':'[]','pokemon-arena-gym-badges/master':'[]','pokemon-arena-gym-badges/clean-records':'{}',
 'pokemon-arena-roguelit-progress':'{}','pokemon-arena-trainer-options':'{"autoRepeat":true}',
 'pokemon-arena-music':null,'pokemon-arena-sfx':null}};}
let db;
(async()=>{
 db=new PGlite();let checks=0;
 await db.exec(`
  create role anon;create role authenticated;create role service_role;
  create schema auth;create schema arena_private;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('arena.test_uid',true),'')::uuid $$;
  grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
  create table public.arena_saves(user_id uuid primary key,save_data jsonb not null,updated_at timestamptz not null default clock_timestamp());
  create table arena_private.players(id uuid primary key,name text unique not null);
  create function arena_private.require_session() returns void language plpgsql as $$ begin
   if auth.uid() is null or current_setting('arena.test_session',true)<>'active' then raise exception 'Invalid session';end if;
  end $$;
  create function public.arena_write_save(payload jsonb,expected_revision timestamptz) returns jsonb
   language plpgsql security definer as $$ declare stamp timestamptz;begin
    select updated_at into stamp from public.arena_saves where user_id=auth.uid() for update;
    if stamp is distinct from expected_revision then return '{"status":"conflict"}';end if;
    update public.arena_saves set save_data=payload,updated_at=clock_timestamp() where user_id=auth.uid() returning updated_at into stamp;
    return jsonb_build_object('status','ok','updated_at',stamp);
   end $$;
  grant execute on function public.arena_write_save(jsonb,timestamptz) to authenticated;
 `);
 await db.exec(fs.readFileSync(path.join(__dirname,'fixtures/trade-save-validation.sql'),'utf8'));
 await db.exec(migration);
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261118020000_regional_progression.sql'),'utf8'));
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261118030000_complete_pokedex.sql'),'utf8'));checks++;
 for(let i=0;i<3;i++){
  await db.query('insert into auth.users values($1)',[ids[i]]);
  await db.query('insert into arena_private.players values($1,$2)',[ids[i],['Nifty','Brock','Misty'][i]]);
  const document=save(i===0?'Bulbasaur':'Charmander',i===0?2:3+i-1);
  if(i===0){const p=JSON.parse(document.entries['pokemon-arena-wild-progress']);p.copies.Bulbasaur=[{level:60,xp:7,profile:profile(12),moves:['Tackle']}];document.entries['pokemon-arena-wild-progress']=JSON.stringify(p);}
  await db.query('insert into public.arena_saves(user_id,save_data) values($1,$2)',[ids[i],document]);
 }
 async function who(index){await db.query("select set_config('arena.test_uid',$1,false),set_config('arena.test_session','active',false)",[ids[index]]);}
 async function stored(index){return (await db.query('select save_data,updated_at::text stamp from public.arena_saves where user_id=$1',[ids[index]])).rows[0];}
 async function read(index,action,args={}){await who(index);return (await db.query('select public.arena_market($1,$2) data',[action,args])).rows[0].data;}
 async function mutate(index,action,args={},requestId=crypto.randomUUID()){
  const current=await stored(index);return read(index,action,{...args,expected_revision:current.stamp,request_id:requestId});
 }
 const inventory=async index=>(await read(index,'inventory')).rows;
 function ok(result){assert.equal(result.status,'ok',JSON.stringify(result));checks++;return result;}
 const active=(await inventory(0)).find(row=>row.selector.name==='Bulbasaur' && row.selector.slot===0);
 assert.equal(active.pokemon.nature,'Adamant');assert.equal(active.pokemon.personality,'Resilient');checks++;
 const original=await stored(0);
 const created=ok(await mutate(0,'create_auction',{selector:active.selector,minimum_bid:100,buy_now:1000,hours:24,tags:['Grass','Adamant']}));
 const listing=created.listing_id;
 let progress=JSON.parse((await stored(0)).save_data.entries['pokemon-arena-wild-progress']);
 assert.equal(progress.owned.Bulbasaur.level,60);assert.equal(progress.held.Bulbasaur,undefined);assert.equal(progress.items.Charcoal,1);checks++;
 let results=await read(1,'search',{query:'bulba',nature:'Adamant',personality:'Resilient',generation:'1',element:'Grass',ign:'Nif'});
 assert.equal(results.total,1);assert.equal(results.rows[0].seller,'Nifty');assert.equal(results.rows[0].pokemon.number,1);checks++;
 const bidArgs={id:listing,amount:100};const bidKey=crypto.randomUUID();ok(await mutate(1,'bid',bidArgs,bidKey));
 ok(await mutate(1,'bid',bidArgs,bidKey));
 assert.equal(JSON.parse((await stored(1)).save_data.entries['pokemon-arena-wild-progress']).coins,9900);checks++;
 const denied=await mutate(0,'cancel',{id:listing});assert.equal(denied.status,'error');checks++;
 ok(await mutate(2,'bid',{id:listing,amount:200}));
 assert.equal((await read(1,'notices')).pending,1);ok(await mutate(1,'claim'));
 assert.equal(JSON.parse((await stored(1)).save_data.entries['pokemon-arena-wild-progress']).coins,10000);checks++;
 // The high bidder pays only the difference when buying now.
 ok(await mutate(2,'buy',{id:listing}));assert.equal(JSON.parse((await stored(2)).save_data.entries['pokemon-arena-wild-progress']).coins,9000);checks++;
 const after=await read(1,'search',{query:'Bulbasaur'});assert.equal(after.total,0);checks++;
 ok(await mutate(0,'claim'));assert.equal(JSON.parse((await stored(0)).save_data.entries['pokemon-arena-wild-progress']).coins,11000);checks++;
 // An old PC snapshot cannot resurrect the auctioned individual, even with a fresh revision.
 await who(0);const beforeReject=await stored(0);
 const rejected=(await db.query('select public.arena_write_save($1,$2) data',[original.save_data,beforeReject.stamp])).rows[0].data;
 assert.equal(rejected.status,'rejected');assert.equal((await stored(0)).stamp,beforeReject.stamp);checks++;
 const offered=(await inventory(0)).find(row=>row.selector.name==='Bulbasaur');
 const wanted=(await inventory(1)).find(row=>row.selector.name==='Charmander');
 const request=ok(await mutate(0,'create_request',{selector:offered.selector,want:{name:'Charmander',nature:wanted.pokemon.nature,personality:wanted.pokemon.personality}}));
 const matches=await read(1,'search',{kind:'request',side:'wanted',query:'Charmander',nature:wanted.pokemon.nature,personality:wanted.pokemon.personality});assert.equal(matches.total,1);checks++;
 const nonmatch=(await inventory(2)).find(row=>row.selector.name==='Charmander');
 const refusal=await mutate(2,'fulfill',{id:request.listing_id,selector:nonmatch.selector});assert.equal(refusal.status,'error');checks++;
 const sellerRevision=(await stored(0)).stamp;
 const fulfillmentKey=crypto.randomUUID();ok(await mutate(1,'fulfill',{id:request.listing_id,selector:wanted.selector},fulfillmentKey));
 ok(await mutate(1,'fulfill',{id:request.listing_id,selector:wanted.selector},fulfillmentKey));
 assert.equal((await stored(0)).stamp,sellerRevision,'Offline completion must not overwrite the requester’s save');checks++;
 const notices=await read(0,'notices');assert(notices.notices.some(n=>n.title==='Trade request completed!' && n.message.includes('Charmander')));checks++;
 ok(await mutate(0,'claim'));progress=JSON.parse((await stored(0)).save_data.entries['pokemon-arena-wild-progress']);assert(progress.owned.Charmander);checks++;
 const incoming=(await inventory(0)).find(row=>row.selector.name==='Charmander');assert(incoming.profile.trade_id);checks++;
 await read(0,'read_notices',{ids:notices.notices.map(n=>n.id)});assert((await read(0,'notices')).notices.filter(n=>notices.notices.some(old=>old.id===n.id)).every(n=>n.read_at));checks++;
 // Cancellation and expiration return the exact same individual.
 const cancel=ok(await mutate(0,'create_auction',{selector:incoming.selector,buy_now:700,hours:1}));ok(await mutate(0,'cancel',{id:cancel.listing_id}));
 const again=(await inventory(0)).find(row=>row.profile.trade_id===incoming.profile.trade_id);assert(again);checks++;
 const expiry=ok(await mutate(0,'create_auction',{selector:again.selector,minimum_bid:50,hours:1}));
 await db.query("update arena_private.market_listings set ends_at=clock_timestamp()-interval '1 minute' where id=$1",[expiry.listing_id]);
 await read(2,'notices');ok(await mutate(0,'claim'));assert((await inventory(0)).some(row=>row.profile.trade_id===incoming.profile.trade_id));checks++;
 // A winning timed auction settles once; no second buyer can take the same asset.
 const sellerCopy=(await inventory(2)).find(row=>row.selector.name==='Bulbasaur');
 const timed=ok(await mutate(2,'create_auction',{selector:sellerCopy.selector,minimum_bid:150,hours:1}));
 ok(await mutate(1,'bid',{id:timed.listing_id,amount:150}));
 const beforeTimedBuyer=JSON.parse((await stored(1)).save_data.entries['pokemon-arena-wild-progress']).coins;
 const beforeTimedSeller=JSON.parse((await stored(2)).save_data.entries['pokemon-arena-wild-progress']).coins;
 await db.query("update arena_private.market_listings set ends_at=clock_timestamp()-interval '1 minute' where id=$1",[timed.listing_id]);
 await read(0,'notices');await read(0,'notices');ok(await mutate(1,'claim'));ok(await mutate(2,'claim'));
 assert.equal(JSON.parse((await stored(1)).save_data.entries['pokemon-arena-wild-progress']).coins,beforeTimedBuyer);
 assert.equal(JSON.parse((await stored(2)).save_data.entries['pokemon-arena-wild-progress']).coins,beforeTimedSeller+150);checks++;
 assert.equal((await mutate(0,'buy',{id:timed.listing_id})).status,'error');checks++;
 // A bid meeting Buy now converts to a purchase and remains replay-safe with its original action.
 const repeatCopy=(await inventory(1)).find(row=>row.selector.name==='Bulbasaur');
 const instant=ok(await mutate(1,'create_auction',{selector:repeatCopy.selector,minimum_bid:20,buy_now:300,hours:1}));
 const instantKey=crypto.randomUUID();ok(await mutate(2,'bid',{id:instant.listing_id,amount:999},instantKey));
 const instantBalance=JSON.parse((await stored(2)).save_data.entries['pokemon-arena-wild-progress']).coins;
 ok(await mutate(2,'bid',{id:instant.listing_id,amount:999},instantKey));assert.equal(JSON.parse((await stored(2)).save_data.entries['pokemon-arena-wild-progress']).coins,instantBalance);checks++;
 assert.equal((await mutate(2,'bid',{id:instant.listing_id,amount:1000},instantKey)).status,'rejected');checks++;
 ok(await mutate(1,'claim'));
 // Server filters use actual Pokémon data rather than seller tags. Level/IV sorting uses listing data.
 const low=(await inventory(0)).find(row=>row.selector.name==='Charmander');
 const high=(await inventory(2)).find(row=>row.selector.name==='Bulbasaur');
 const lowListing=ok(await mutate(0,'create_auction',{selector:low.selector,buy_now:50,tags:['Water','Timid']}));
 const highListing=ok(await mutate(2,'create_auction',{selector:high.selector,buy_now:80}));
 const ranked=await read(1,'search',{sort:'level'});assert.equal(ranked.rows[0].pokemon.level,60);checks++;
 const fakeTagMatch=await read(1,'search',{element:'Water'});assert.equal(fakeTagMatch.total,0);checks++;
 ok(await mutate(0,'cancel',{id:lowListing.listing_id}));ok(await mutate(2,'cancel',{id:highListing.listing_id}));
 // Stale selectors/revisions, insufficient balances and inactive sessions cannot change escrow.
 const stale=(await inventory(0)).find(row=>row.selector.name==='Charmander');
 assert.equal((await mutate(0,'create_auction',{selector:{...stale.selector,fingerprint:'forged'},buy_now:1})).status,'error');checks++;
 assert.equal((await read(0,'claim',{expected_revision:'2000-01-01T00:00:00Z',request_id:crypto.randomUUID()})).status,'conflict');checks++;
 const expensive=ok(await mutate(0,'create_auction',{selector:stale.selector,buy_now:1000000}));
 assert.equal((await mutate(1,'buy',{id:expensive.listing_id})).status,'error');checks++;
 ok(await mutate(0,'cancel',{id:expensive.listing_id}));
 await who(0);await db.query("select set_config('arena.test_session','inactive',false)");
 const inactive=(await db.query("select public.arena_market('search','{}') data")).rows[0].data;assert.equal(inactive.status,'error');checks++;
 // Ownership spoofing and duplicate IDs are rejected and logged.
 const tampered=(await stored(2)).save_data;const p2=JSON.parse(tampered.entries['pokemon-arena-wild-progress']);
 const p0=JSON.parse((await stored(0)).save_data.entries['pokemon-arena-profiles']);
 const p2profiles=JSON.parse(tampered.entries['pokemon-arena-profiles']);p2profiles[4]=p0[4];tampered.entries['pokemon-arena-profiles']=JSON.stringify(p2profiles);
 await who(2);const fraud=(await db.query('select public.arena_write_save($1,$2) data',[tampered,(await stored(2)).stamp])).rows[0].data;
 assert.equal(fraud.status,'rejected');assert((await db.query("select count(*)::int n from arena_private.market_security_events where reason='foreign_or_escrowed_pokemon'")).rows[0].n>0);checks++;
 const duplicate=(await stored(0)).save_data;const duplicateProfiles=JSON.parse(duplicate.entries['pokemon-arena-profiles']);
 duplicateProfiles[25]=duplicateProfiles[4];duplicate.entries['pokemon-arena-profiles']=JSON.stringify(duplicateProfiles);
 await who(0);const duplicateWrite=(await db.query('select public.arena_write_save($1,$2) data',[duplicate,(await stored(0)).stamp])).rows[0].data;
 assert.equal(duplicateWrite.status,'rejected');assert.equal(duplicateWrite.reason,'duplicate_trade_identity');checks++;
 // Existing write endpoint remains usable, and its old alias cannot bypass the guard.
 await who(0);const current=await stored(0);const legitimate=(await db.query('select public.arena_write_save($1,$2) data',[current.save_data,current.stamp])).rows[0].data;assert.equal(legitimate.status,'ok');checks++;
 await db.exec('set role authenticated');
 assert((await db.query("select public.arena_market('inventory','{}') data")).rows[0].data.rows.length>0);checks++;
 await assert.rejects(()=>db.query('select public.arena_write_save_before_market($1,$2)',[current.save_data,current.stamp]),/permission denied/);checks++;
 await assert.rejects(()=>db.query('select * from arena_private.market_assets'),/permission denied/);checks++;
 await assert.rejects(()=>db.query('update public.arena_saves set save_data=save_data'),/permission denied/);checks++;
 await db.exec('reset role');
 await db.exec('set role anon');await assert.rejects(()=>db.query("select public.arena_market('search','{}')"),/permission denied/);await db.exec('reset role');checks++;
 // Coin transfers and reserved bids conserve the three accounts' total balance.
 const balances=await db.query("select sum(((save_data->'entries'->>'pokemon-arena-wild-progress')::jsonb->>'coins')::bigint)::int total from public.arena_saves");
 assert.equal(balances.rows[0].total,30000);checks++;
 // A traded Pokémon can evolve while preserving ownership and its per-individual training.
 await who(0);const evolutionSave=await stored(0),evolutionDocument=evolutionSave.save_data;
 const evolutionProgress=JSON.parse(evolutionDocument.entries['pokemon-arena-wild-progress']);
 const evolutionProfiles=JSON.parse(evolutionDocument.entries['pokemon-arena-profiles']);
 const originalTradeId=evolutionProfiles[4].trade_id;
 evolutionProfiles[5]={...evolutionProfiles[4],evolutionProgress:{wins:3,casts:{Fire:10}}};delete evolutionProfiles[4];
 evolutionProgress.owned.Charmeleon=evolutionProgress.owned.Charmander;delete evolutionProgress.owned.Charmander;delete evolutionProgress.copies.Charmander;
 evolutionDocument.entries['pokemon-arena-team']=JSON.stringify(JSON.parse(evolutionDocument.entries['pokemon-arena-team']).map(name=>name==='Charmander'?'Charmeleon':name));
 evolutionDocument.entries['pokemon-arena-profiles']=JSON.stringify(evolutionProfiles);
 evolutionDocument.entries['pokemon-arena-wild-progress']=JSON.stringify(evolutionProgress);
 const evolvedWrite=(await db.query('select public.arena_write_save($1,$2) data',[evolutionDocument,evolutionSave.stamp])).rows[0].data;
 assert.equal(evolvedWrite.status,'ok');assert((await inventory(0)).some(row=>row.selector.name==='Charmeleon'&&row.profile.trade_id===originalTradeId&&row.profile.evolutionProgress.wins===3));checks++;
 console.log(checks+' PostgreSQL trade checks passed: escrow, bids/refunds, Buy now, request matching, offline delivery, replay, filters and ownership guards.');
 await require('./social-sql.cjs')(db,save);
 await db.close();
})().catch(async error=>{console.error(error.message);if(db)try{console.error((await db.query('select reason,details from arena_private.market_security_events order by id desc limit 3')).rows);await db.close();}catch{};if(error.where)console.error(error.where);if(error.detail)console.error(error.detail);process.exitCode=1;});
