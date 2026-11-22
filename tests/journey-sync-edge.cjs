const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

module.exports=async function checkInterruptedBattle(db,player,id){
 const originalFetch=globalThis.fetch,originalDeno=globalThis.Deno,origin='https://journey-fixture.test';
 let handler;
 const query=async(sql,args)=>(await db.query(sql,args)).rows[0].value;
 globalThis.Deno={env:{get:key=>({SUPABASE_URL:origin,SUPABASE_SERVICE_ROLE_KEY:'fixture'})[key]},serve:fn=>{handler=fn;}};
 globalThis.fetch=async(url,options)=>{
  const address=new URL(url);assert.equal(address.origin,origin);
  if(address.pathname==='/auth/v1/user')return Response.json({id:player});
  const p=JSON.parse(options.body);
  switch(address.pathname){
   case '/rest/v1/rpc/arena_journey_read':
    return Response.json(await query('select public.arena_journey_read($1,$2) as value',[p.player_id,p.run_id]));
   case '/rest/v1/rpc/arena_journey_checkpoint':
    return Response.json(await query('select public.arena_journey_checkpoint($1,$2,$3,$4,$5) as value',
     [p.run_id,p.expected,p.new_state,p.winner,p.health===null?null:JSON.stringify(p.health)]));
   default:throw Error('Unexpected fixture URL '+address.pathname);
  }
 };
 try{
  await import('../supabase/functions/arena-combat/index.ts');
  const {simulateOnline,campaignEngineVersion}=await import('../supabase/functions/arena-combat/engine.js');
  const invoke=async(name,{body})=>{
   assert.equal(name,'arena-combat');
   const response=await handler(new Request(origin,{method:'POST',headers:{authorization:'Bearer fixture'},
    body:JSON.stringify(body)}));
   const data=await response.json();assert.equal(response.status,200,JSON.stringify(data.error));return {data};
  };
  const client={functions:{invoke},rpc:async(name,p)=>{
   assert.equal(name,'arena_journey_begin_fight');
   return {data:await query('select public.arena_journey_begin_fight($1,$2) as value',[p.run_id,p.expected_stage])};
  }};
  const cloud=fs.readFileSync(path.join(__dirname,'../cloud.js'),'utf8');
  const adapter=vm.createContext({window:{},cloudClient:async()=>client,AbortController,setTimeout,clearTimeout});
  vm.runInContext(cloud.slice(cloud.indexOf('window.arenaJourneyBattle='),cloud.indexOf('window.arenaCampaignMutate=')),adapter);
  const request=(journey,onProgress)=>adapter.window.arenaJourneyBattle(id,journey,0,onProgress);
  const prepared=await request('prepare');assert.equal(prepared.version,campaignEngineVersion);
  assert.equal((await request('prepare')).match.id,prepared.match.id);
  // A previous client began verification and closed its tab. Keep its first saved frame.
  const first=simulateOnline(prepared.match,null,1,null,'host');
  assert(await query('select public.arena_journey_checkpoint($1,0,$2,null,null) as value',[id,first.state]));
  assert.equal((await request('prepare')).verifying,true);
  let seconds=0;
  const result=await request('verify',next=>{assert(next>seconds);seconds=next;});
  assert.equal(result.complete,true);
  // Repeat a verify whose final HTTP response was lost.
  const final=await request('verify');
  assert.equal(final.status,result.winner==='host'?'ready':'lost');
  assert.equal(final.stage,result.winner==='host'?1:0);
  assert.deepEqual({...await request('prepare')},{...final});
  assert.deepEqual(await request('verify'),final);
  console.log('Champion verification resumed a stored checkpoint and survived duplicate prepare and final verification requests.');
 }finally{globalThis.fetch=originalFetch;if(originalDeno===undefined)delete globalThis.Deno;else globalThis.Deno=originalDeno;}
};
