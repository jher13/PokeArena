const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

// Exercise the same escrow, ownership, save guard and delivery tables as the Trading Hub.
module.exports=async function socialChecks(db,save){
 const users=Array.from({length:4},(_,i)=>'40000000-0000-4000-8000-00000000000'+(i+1));
 const names=['Blue','Red','Silver','Gold'];
 await db.exec(`
  alter table arena_private.players add column guild text,add column last_seen timestamptz;
  create table arena_private.guilds(name text primary key);
  create table arena_private.friends(sender uuid,recipient uuid,accepted boolean,primary key(sender,recipient));
  insert into arena_private.guilds values('Rocket'),('Plasma');
 `);
 await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261120030000_chat_and_direct_trades.sql'),'utf8'));
 for(const [i,id] of users.entries()){
  await db.query('insert into auth.users values ($1)',[id]);
  await db.query("insert into arena_private.players(id,name,guild,last_seen) values($1,$2,$3,clock_timestamp())",
   [id,names[i],['Rocket','Rocket','Plasma',null][i]]);
  const doc=save(i===0?'Bulbasaur':'Charmander',80+i);
  if(i===0){
   const progress=JSON.parse(doc.entries['pokemon-arena-wild-progress']);
   progress.copies.Bulbasaur=[{profile:{pid:700,ivs:[31,29,28,27,26,25],evs:[0,0,0,0,0,0],shiny:true},moves:['Vine Whip'],level:62,xp:0}];
   doc.entries['pokemon-arena-wild-progress']=JSON.stringify(progress);
  }
  await db.query('insert into public.arena_saves(user_id,save_data) values($1,$2)',[id,doc]);
 }
 async function who(i){await db.query("select set_config('arena.test_uid',$1,false),set_config('arena.test_session','active',false)",[users[i]]);}
 async function call(i,name,args){
  await who(i);const placeholders=args.map((_,j)=>'$'+(j+1)).join(',');
  return (await db.query('select public.'+name+'('+placeholders+') as result',args)).rows[0].result;
 }
 const chat=(i,channel,opts={})=>call(i,'arena_chat',[channel,opts.peer??null,opts.body??null,opts.key??(opts.body!==undefined?crypto.randomUUID():null),opts.guild??null]);
 const direct=(i,action,args={})=>call(i,'arena_direct_trade',[action,args]);
 const market=(i,action,args={})=>call(i,'arena_market',[action,args]);
 const inventory=async i=>(await market(i,'inventory')).rows;
 const revision=async i=>(await db.query('select updated_at::text as stamp from public.arena_saves where user_id=$1',[users[i]])).rows[0].stamp;
 const invite=(i,target)=>direct(i,'invite',{name:names[target]});
 const offer=async(i,room,row,extra={})=>direct(i,'offer',{id:room.id,version:room.version,selector:row.selector,
  expected_revision:await revision(i),request_id:crypto.randomUUID(),...extra});
 const view=(i,room)=>direct(i,'view',{id:room.id});
 const confirm=(i,room)=>direct(i,'confirm',{id:room.id,version:room.version});
 const claim=async i=>{
  const result=await market(i,'claim',{request_id:crypto.randomUUID(),expected_revision:await revision(i)});
  assert.equal(result.status,'ok',result.message);
 };
 const friend=(i,j,accepted)=>db.query('insert into arena_private.friends values($1,$2,$3)',[users[i],users[j],accepted]);
 const messages=async(i,channel,peer)=>(await chat(i,channel,{peer})).messages.map(m=>m.body);
 await friend(0,1,true);await friend(1,2,true);await friend(0,2,false);
 const msgId=crypto.randomUUID();
 await chat(0,'world',{body:' Hello arena! ',key:msgId});await chat(0,'world',{body:'Hello arena!',key:msgId});
 assert.deepEqual(await messages(3,'world'),['Hello arena!']);
 await assert.rejects(chat(0,'trade',{body:'hello',key:msgId}),/identifier/);
 await chat(2,'trade',{body:'Looking for an Eevee'});
 assert.deepEqual(await messages(0,'trade'),['Looking for an Eevee']);assert.deepEqual(await messages(2,'world'),['Hello arena!']);
 await chat(1,'guild',{body:'Rocket meet up',guild:'Rocket'});
 assert.deepEqual(await messages(0,'guild'),['Rocket meet up']);assert.deepEqual(await messages(2,'guild'),[]);
 assert.equal((await chat(3,'guild')).can_send,false);
 await assert.rejects(chat(3,'guild',{body:'test',guild:'Rocket'}),/Join a guild/);
 await db.query("update arena_private.players set guild='Plasma' where id=$1",[users[0]]);
 assert.deepEqual(await messages(0,'guild'),[]);await assert.rejects(chat(0,'guild',{body:'old draft',guild:'Rocket'}),/guild changed/);
 await chat(0,'friend',{body:'For my friends'});await chat(0,'friend',{peer:'Red',body:'Just us'});
 assert.deepEqual(await messages(1,'friend'),['For my friends']);
 assert.deepEqual(await messages(1,'friend','Blue'),['Just us']);
 assert.deepEqual(await messages(2,'friend'),[]);assert.deepEqual(await messages(3,'friend'),[]);
 assert.equal((await chat(3,'friend')).can_send,false);
 await assert.rejects(chat(2,'friend',{peer:'Blue'}),/accepted friend/);
 await assert.rejects(chat(1,'world',{peer:'Blue'}),/Friend Chat/);
 await friend(3,0,true);assert.deepEqual(await messages(3,'friend'),[]);
 await db.query('update arena_private.friends set accepted=false where sender=$1 and recipient=$2',[users[0],users[1]]);
 assert.deepEqual(await messages(1,'friend'),[]);await assert.rejects(chat(1,'friend',{peer:'Blue'}),/accepted friend/);
 await assert.rejects(chat(0,'world',{body:' \n\t '}),/1–400/);await assert.rejects(chat(0,'world',{body:'a'.repeat(401)}),/1–400/);
 assert.equal((await direct(0,'availability',{name:'Blue'})).available,false);assert.equal((await direct(0,'availability',{name:'Silver'})).available,true);
 await db.query("update arena_private.players set last_seen=clock_timestamp()-interval '100 seconds' where id=$1",[users[2]]);
 await assert.rejects(invite(0,2),/online/);
 await db.query('update arena_private.players set last_seen=clock_timestamp() where id=$1',[users[2]]);
 let room=await invite(0,2);assert.equal(room.status,'invited');assert.equal(room.partner,'Silver');
 assert.equal((await invite(0,2)).id,room.id);assert.equal((await invite(2,0)).id,room.id);
 assert.equal((await market(2,'notices')).notices.filter(n=>n.listing_id===room.id).length,1);
 assert.equal((await direct(2,'inbox')).rooms[0].incoming,true);assert.deepEqual((await direct(3,'inbox')).rooms,[]);
 await assert.rejects(view(1,room),/unavailable/);await assert.rejects(direct(0,'accept',{id:room.id}),/invited trainer/);
 await assert.rejects(direct(3,'cancel',{id:room.id}),/unavailable/);
 const blueRows=await inventory(0),copy=blueRows.find(r=>r.selector.slot===1),active=blueRows.find(r=>r.selector.name==='Bulbasaur'&&!r.selector.slot);
 await assert.rejects(offer(0,room,copy),/accepted trade/);
 room=await direct(2,'accept',{id:room.id});assert.equal(room.status,'open');
 await assert.rejects(confirm(0,room),/Both trainers/);
 assert.equal((await offer(0,room,copy,{expected_revision:'2000-01-01Z'})).status,'conflict');
 await assert.rejects(offer(0,room,copy,{selector:{...copy.selector,fingerprint:'stale'}}),/copy changed/);
 const repeat={request_id:crypto.randomUUID(),expected_revision:await revision(0)};
 assert.equal((await offer(0,room,copy,repeat)).status,'ok');assert.equal((await offer(0,room,copy,repeat)).replayed,true);
 await assert.rejects(offer(0,room,active,repeat),/identifier/);assert(!(await inventory(0)).some(r=>r.profile.pid===700));
 room=await view(2,room);assert.equal(room.theirs.shiny,true);assert.deepEqual(room.theirs.moves,['Vine Whip']);
 const silverRows=await inventory(2),first=silverRows.find(r=>r.selector.name==='Charmander');
 await offer(2,room,first);room=await view(0,room);
 const old=room;assert.equal((await confirm(0,room)).ready,true);const last=(await inventory(2))[0];
 assert.equal((await offer(2,room,last)).status,'ok');room=await view(0,room);
 assert.equal(room.ready,false);assert.equal(room.partner_ready,false);assert.equal(room.theirs.name,'Pikachu');
 await assert.rejects(confirm(0,old),/offers changed/);
 assert.equal((await confirm(2,room)).ready,true);assert.equal((await confirm(2,room)).status,'open');
 assert.equal((await confirm(0,room)).status,'completed');assert.equal((await confirm(0,room)).status,'completed');
 assert.equal((await view(0,room)).pending_delivery,true);assert.deepEqual((await direct(0,'inbox')).rooms,[]);
 assert.equal((await market(0,'notices')).pending,1);assert.equal((await market(2,'notices')).pending,1);
 await claim(0);await claim(2);await claim(2);assert.equal((await view(0,room)).pending_delivery,false);
 assert.equal((await inventory(2)).filter(r=>r.profile.pid===700&&r.pokemon.shiny&&r.pokemon.level===62).length,1);
 assert.equal((await inventory(0)).filter(r=>r.profile.pid===182&&r.selector.name==='Pikachu').length,1);
 room=await invite(1,3);assert.equal((await direct(3,'cancel',{id:room.id})).status,'cancelled');
 room=await invite(0,2);await direct(2,'accept',{id:room.id});room=await view(2,room);
 const tradedCopy=(await inventory(2)).find(r=>r.profile.pid===700);
 await offer(2,room,tradedCopy);assert.equal((await direct(0,'cancel',{id:room.id})).status,'cancelled');
 await direct(0,'cancel',{id:room.id});await claim(2);
 assert.equal((await inventory(2)).filter(r=>r.profile.pid===700).length,1);
 room=await invite(0,3);await direct(3,'accept',{id:room.id});
 await offer(0,room,(await inventory(0)).find(r=>r.profile.pid===80));
 await db.query("update arena_private.direct_trades set ends_at=clock_timestamp()-interval '1 minute' where id=$1",[room.id]);
 assert.equal((await market(0,'notices')).pending,1);assert.equal((await view(3,room)).status,'expired');
 await claim(0);assert.equal((await inventory(0)).filter(r=>r.profile.pid===80).length,1);
 await who(1);await db.exec("select set_config('arena.test_session','inactive',false)");
 await assert.rejects(db.query("select public.arena_chat('world')"),/session/);await assert.rejects(db.query("select public.arena_direct_trade('inbox')"),/session/);
 await who(0);await db.exec('set role authenticated');
 assert.equal((await db.query("select public.arena_chat('world') c")).rows[0].c.messages.length,1);
 await assert.rejects(db.exec('select * from arena_private.chat_messages'),/permission denied/);
 await assert.rejects(db.exec('select * from arena_private.direct_trades'),/permission denied/);
 await db.exec('reset role;set role anon');
 await assert.rejects(db.query("select public.arena_chat('world')"),/permission denied/);
 await assert.rejects(db.query("select public.arena_direct_trade('inbox')"),/permission denied/);
 await db.exec('reset role');
 console.log('Four chat channels passed visibility, membership and retry checks. Direct trades passed online eligibility, offer changes, mutual confirmation, cancellation, expiry and exact-once PC delivery.');
};
