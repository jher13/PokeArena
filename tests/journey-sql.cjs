const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

module.exports=async function checkJourney(db,makeSave){
 const people=['Amber','Cobalt','Jade'].map((name,i)=>({name,id:'70000000-0000-4000-8000-00000000000'+(i+1)}));
 const team=['Bulbasaur','Charmander','Squirtle','Pikachu','Mewtwo','Dragonite'];
 const ids=[1,4,7,25,150,149],key='pokemon-arena-wild-progress';
 const marks=(await db.query('select unnest(badges) as badge from arena_private.campaign_regions')).rows.map(row=>row.badge);
 const doc=makeSave('Bulbasaur',4);
 doc.entries['pokemon-arena-team']=JSON.stringify(team);
 doc.entries['pokemon-arena-profiles']=JSON.stringify(Object.fromEntries(ids.map(id=>[id,{pid:id,ivs:[15,15,15,15,15,15],evs:[0,0,0,0,0,0]}])));
 const progress=JSON.parse(doc.entries[key]);
 progress.owned=Object.fromEntries(team.map(name=>[name,{level:75,xp:0}]));doc.entries[key]=JSON.stringify(progress);
 await db.exec('create table if not exists arena_private.matches(id uuid primary key default gen_random_uuid(),mode text,result text,raid_seats jsonb);');
 await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261122010000_champion_and_friend_challenges.sql'),'utf8'));
 for(const p of people){
  await db.query('insert into auth.users values($1)',[p.id]);
  await db.query("insert into arena_private.players(id,name,guild) values($1,$2,'Rocket')",[p.id,p.name]);
  await db.query('insert into public.arena_saves(user_id,save_data) values($1,$2)',[p.id,doc]);
 }
 const who=p=>db.query("select set_config('arena.test_uid',$1,false),set_config('arena.test_session','active',false)",[p.id]);
 const [a,b,c]=people;
 async function rpc(p,action,args={}){await who(p);return (await db.query('select public.arena_journey($1,$2) as v',[action,args])).rows[0].v;}
 async function snapshot(p,id){return (await db.query('select public.arena_journey_read($1,$2) as v',[p.id,id])).rows[0].v;}
 async function end(id,version,outcome,hp){return (await db.query('select public.arena_journey_checkpoint($1,$2,null,$3,$4) as v',[id,version,outcome,JSON.stringify(hp)])).rows[0].v;}
 await assert.rejects(rpc(a,'start'),/badges/);
 await db.query('insert into arena_private.friends values($1,$2,true)',[a.id,b.id]);
 const request={id:crypto.randomUUID(),name:b.name,allow_rematch:true};
 await assert.rejects(rpc(a,'spar',request),/published/);
 await rpc(b,'publish');await assert.rejects(rpc(c,'spar',{...request,id:crypto.randomUUID()}),/friends/);
 const spar=await rpc(a,'spar',request);
 assert.equal((await rpc(a,'spar',request)).id,spar.id);
 assert.equal(spar.entries,undefined);assert.equal(spar.defense,undefined);assert.equal(await snapshot(c,spar.id),null);
 assert((await snapshot(b,spar.id)).defense);
 await rpc(b,'hide');await assert.rejects(rpc(a,'spar',{...request,id:crypto.randomUUID()}),/published/);
 assert.equal(await end(spar.id,0,'guest',[]),true);assert.equal(await end(spar.id,0,'guest',[]),false);
 const returned=(await rpc(b,'inbox'))[0];assert.equal(returned.status,'guest');assert.equal(returned.canReply,true);
 const reply=await rpc(b,'spar',{id:crypto.randomUUID(),name:a.name,reply_to:spar.id});
 assert.equal((await rpc(b,'spar',{id:crypto.randomUUID(),name:a.name,reply_to:spar.id})).id,reply.id);
 await assert.rejects(rpc(c,'spar',{id:crypto.randomUUID(),name:a.name,reply_to:spar.id}),/friends/);
 const {journeyMatch,simulateOnline}=await import('../supabase/functions/arena-combat/engine.js');
 let round=await snapshot(b,reply.id);
 for(let tick=0;tick<45 && round.status==='playing';tick++){
  const out=simulateOnline(journeyMatch(round),round.state,480,null,'host');
  const saved=await db.query('select public.arena_journey_checkpoint($1,$2,$3,$4,null) as ok',[reply.id,round.revision,out.result?null:out.state,out.result]);
  assert(saved.rows[0].ok);round=await snapshot(b,reply.id);
 }
 assert(['host','guest','draw'].includes(round.status));assert.equal((await rpc(b,'inbox')).find(r=>r.id===spar.id).canReply,false);
 assert.equal((await db.query('select id from arena_private.market_notices where listing_id=$1',[spar.id])).rows.length,2);
 doc.entries['pokemon-arena-gym-badges']=JSON.stringify(marks);
 await db.query('update public.arena_saves set save_data=$1 where user_id=$2',[doc,a.id]);
 await assert.rejects(rpc(a,'start',{prestige:true}),/badges/);
 doc.entries['pokemon-arena-gym-badges/master']=JSON.stringify(marks);
 await db.query('update public.arena_saves set save_data=$1 where user_id=$2',[doc,a.id]);
 const run=await rpc(a,'start',{prestige:true}),id=run.id;assert.equal(run.team.length,6);
 assert.equal((await rpc(a,'start',{prestige:false})).id,id);
 await assert.rejects(rpc(a,'claim',{id,reward:'Rare Candy'}),/three/);
 await rpc(a,'fight',{id});await end(id,0,'host',[0,13,14,15,16,17]);
 assert.deepEqual((await rpc(a,'status')).run.hp,[0,13,14,15,16,17]);
 assert.equal((await rpc(a,'heal',{id})).hp,null);await assert.rejects(rpc(a,'heal',{id}),/unavailable/);
 await rpc(a,'fight',{id});await end(id,1,'host',[25,30,0,0,10,20]);await rpc(a,'fight',{id});await end(id,2,'host',[0,4,0,0,0,0]);
 assert.equal((await rpc(a,'status')).laurel,true);
 const revision=(await db.query('select updated_at::text as s from public.arena_saves where user_id=$1',[a.id])).rows[0].s;
 const receipt=await rpc(a,'claim',{id,reward:'Rare Candy',expected_revision:revision});
 assert.equal(receipt.status,'ok');assert.equal(JSON.parse(receipt.save_data.entries[key]).vitamins['Rare Candy'],1);
 assert.equal((await rpc(a,'claim',{id,reward:'Ability Capsule'})).reward,'Rare Candy');
 async function raid(mode,seats){const id=crypto.randomUUID();await db.query('insert into arena_private.matches(id,mode,raid_seats) values($1,$2,$3)',[id,mode,JSON.stringify(seats)]);
  await db.query("update arena_private.matches set result='coop_win' where id=$1",[id]);}
 const seats=[{uid:a.id,pokemon:'Pikachu'},{uid:b.id,pokemon:'Lapras'}];
 await raid('coop_mega',[seats[0],{...seats[1],substitute:true}]);assert.deepEqual((await rpc(a,'guild')).marks,[]);
 for(const mode of ['coop_mega','coop_mega_master','coop_mega_2_master','coop_mega_3'])await raid(mode,seats);
 const board=await rpc(b,'guild');assert.equal(board.marks.length,3);assert.equal(board.banner,true);assert.equal(board.parties,1);assert.equal(board.repeats,1);
 await db.exec('set role authenticated');
 await assert.rejects(snapshot(a,id),/permission denied/);await assert.rejects(end(id,3,'host',[]),/permission denied/);await db.exec('reset role');
 console.log('Champion gates, locked rosters, carried HP, one heal, idempotent prizes, private friend challenges, notifications and weekly guild raid marks passed.');
};

