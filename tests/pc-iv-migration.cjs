const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

module.exports=async function testPCMigration(db,makeSave){
 const root=path.join(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const portion=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end));
 const clientCap=vm.runInNewContext([
  html.match(/^const maxTotalIVs=.+;$/m)[0],
  portion('function validProfileData(','function decodePCEntry('),
  portion('function personalityIdOf(','function personalityTrait('),
  'cappedOwnedProfile'
 ].join('\n'));
 const expected=p=>JSON.parse(JSON.stringify(clientCap(p)));
 const activeKey='pokemon-arena-profiles',progressKey='pokemon-arena-wild-progress';
 const ids=['59000000-0000-4000-8000-000000000001','59000000-0000-4000-8000-000000000002'];
 const names=['Ivy','Ash'];
 const legalIVs=[31,31,30,1,0,0];
 const legacy=pid=>({pid,ivs:[31,30,29,28,27,26],evs:[4,0,0,252,0,252],abilityOverride:'Pressure',shiny:true});
 const copy=pid=>({level:53,xp:17,moves:['Vine Whip'],profile:legacy(pid)});
 const row=async(sql,params=[])=>(await db.query(sql,params)).rows[0];
 const stored=i=>row('select save_data,updated_at::text stamp from public.arena_saves where user_id=$1',[ids[i]]);
 const who=i=>row("select set_config('arena.test_uid',$1,false),set_config('arena.test_session','active',false)",[ids[i]]);
 async function rpc(i,action,args={},direct=false){
  await who(i);
  return (await row('select public.'+(direct?'arena_direct_trade':'arena_market')+'($1,$2) result',[action,args])).result;
 }
 const mutate=async(i,action,args,direct=false)=>rpc(i,action,{...args,expected_revision:(await stored(i)).stamp,request_id:crypto.randomUUID()},direct);
 const findPID=async(i,pid)=>(await rpc(i,'inventory')).rows.find(r=>r.profile.pid===pid);
 const ok=result=>{assert.equal(result.status,'ok',result.message);return result;};
 for(const [i,id] of ids.entries()){
  await db.query('insert into auth.users values ($1)',[id]);
  await db.query('insert into arena_private.players(id,name,last_seen) values ($1,$2,clock_timestamp())',[id,names[i]]);
  const doc=makeSave(i?'Charmander':'Bulbasaur',33001+i);
  if(!i){
   const progress=JSON.parse(doc.entries[progressKey]);
   const profiles=JSON.parse(doc.entries[activeKey]);
   profiles[1]={...legacy(33001),personalityId:28,disableBattleEVs:true};
   profiles[25].ivs=legalIVs;
   profiles[7]={...legacy(33003),ivs:[16,16,16,16,16,14]};
   progress.owned.Squirtle={level:83,xp:501};progress.registered.push('Squirtle');
   progress.copies.Bulbasaur=[copy(34001),{...copy(34002),profile:{...legacy(34002),ivs:[1,3,2,1,0,14]}},copy(34003),copy(34004)];
   progress.copies.Squirtle=[copy(34005)];
   doc.entries[progressKey]=JSON.stringify(progress);doc.entries[activeKey]=JSON.stringify(profiles);
   doc.entries['pokemon-arena-team']='["Bulbasaur"]';
  }
  await db.query('insert into public.arena_saves(user_id,save_data) values ($1,$2)',[id,doc]);
 }
 const auction=ok(await mutate(0,'create_auction',{selector:(await findPID(0,34003)).selector,buy_now:500,hours:24}));
 let room=await rpc(0,'invite',{name:names[1]},true);
 await rpc(1,'accept',{id:room.id},true);
 const view=()=>rpc(0,'view',{id:room.id},true);
 room=await view();
 ok(await mutate(0,'offer',{id:room.id,version:room.version,selector:(await findPID(0,34004)).selector},true));
 room=await view();
 ok(await mutate(1,'offer',{id:room.id,version:room.version,selector:(await findPID(1,33102)).selector},true));
 room=await view();assert.equal((await rpc(0,'confirm',{id:room.id,version:room.version},true)).ready,true);
 const before=await stored(0),oldRoom=await view();
 assert.equal(oldRoom.mine.iv_total,171);
 await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261121030000_pc_iv_budget.sql'),'utf8'));
 const after=await stored(0);assert.equal(after.stamp,before.stamp);
 const newActives=JSON.parse(after.save_data.entries[activeKey]),oldActives=JSON.parse(before.save_data.entries[activeKey]);
 for(const [id,p] of Object.entries(oldActives))assert.deepEqual(newActives[id],expected(p));
 const oldProgress=JSON.parse(before.save_data.entries[progressKey]);
 const newProgress=JSON.parse(after.save_data.entries[progressKey]);
 const want=structuredClone(oldProgress);
 for(const group of Object.values(want.copies))for(const mon of group)mon.profile=expected(mon.profile);
 assert.deepEqual(newProgress,want);
 for(const key of Object.keys(before.save_data.entries))if(key!==activeKey && key!==progressKey)assert.deepEqual(after.save_data.entries[key],before.save_data.entries[key]);
 assert.deepEqual((await row('select arena_private.capped_pc_save($1) doc',[after.save_data])).doc,after.save_data);
 const listing=(await row('select pokemon from arena_private.market_listings where id=$1',[auction.listing_id])).pokemon;
 assert.deepEqual(listing.ivs,expected(legacy(34003)).ivs);assert.equal(listing.iv_total,93);
 room=await view();assert.equal(room.ready,false);assert(room.version>oldRoom.version);
 assert.deepEqual(room.mine.moves,['Vine Whip']);assert.deepEqual(room.mine.ivs,expected(legacy(34004)).ivs);
 assert.equal(room.theirs.iv_total,93);
 await assert.rejects(rpc(1,'confirm',{id:room.id,version:oldRoom.version},true),/offers changed/);
 await rpc(0,'confirm',{id:room.id,version:room.version},true);assert.equal((await rpc(1,'confirm',{id:room.id,version:room.version},true)).status,'completed');
 ok(await mutate(1,'buy',{id:auction.listing_id}));ok(await mutate(1,'claim',{}));
 for(const pid of [34003,34004])assert.deepEqual((await findPID(1,pid)).profile.ivs,expected(legacy(pid)).ivs);
 const samples=Array.from({length:200},(_,i)=>legacy((i*2654435761)>>>0));
 samples.push(legacy(4294967295),{...legacy(6),ivs:legalIVs},{...legacy(0),personalityId:27});
 const parity=await row('select jsonb_agg(arena_private.capped_pc_profile(v) order by n) values from jsonb_array_elements($1) with ordinality as t(v,n)',[JSON.stringify(samples)]);
 assert.deepEqual(parity.values,samples.map(expected));
 // A running old client can still save earned progress under the original revision.
 await who(0);
 const current=await stored(0),client=structuredClone(current.save_data);
 const oldCopy=JSON.parse(client.entries[progressKey]);oldCopy.coins+=17;
 oldCopy.copies.Bulbasaur[0].profile=legacy(34001);client.entries[progressKey]=JSON.stringify(oldCopy);
 const write=(doc,stamp)=>row('select public.arena_write_save($1,$2) result',[doc,stamp]);
 assert.equal((await write(client,'2000-01-01T00:00:00Z')).result.status,'conflict');
 assert.equal((await write(client,current.stamp)).result.status,'ok');
 const saved=await stored(0),savedProgress=JSON.parse(saved.save_data.entries[progressKey]);
 assert.equal(savedProgress.coins,oldCopy.coins);assert.deepEqual(savedProgress.copies.Bulbasaur[0].profile,expected(legacy(34001)));
 const invalid=structuredClone(saved.save_data),invalidActives=JSON.parse(invalid.entries[activeKey]);
 invalidActives[1].ivs[0]=32;invalid.entries[activeKey]=JSON.stringify(invalidActives);
 const rejected=(await write(invalid,saved.stamp)).result;
 assert.equal(rejected.status,'rejected');assert.equal(rejected.reason,'profile_limits');
 assert.equal((await stored(0)).stamp,saved.stamp);
 console.log('Full PC migration passed for active Pokémon, unselected species, stored copies, auctions, direct trades and old-client saves. 203 SQL rolls matched the client.');
};
