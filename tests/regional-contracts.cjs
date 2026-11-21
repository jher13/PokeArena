const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const dex=JSON.parse(html.match(/^const dex *= *(.+);$/m)[1]);
const regions=JSON.parse(html.match(/^const gymRegions *= *(.+);$/m)[1]);
const names=['Mewtwo','Kyogre','Groudon','Rayquaza','Lugia','Ho-Oh'];
const moves={Mewtwo:['Psystrike','Aura Sphere','Ice Beam','Recover'],Kyogre:['Origin Pulse','Thunder','Ice Beam','Calm Mind'],
 Groudon:['Precipice Blades','Stone Edge','Fire Punch','Swords Dance'],Rayquaza:['Dragon Ascent','Extreme Speed','Crunch','Roost'],
 Lugia:['Aeroblast','Psychic','Recover','Calm Mind'],'Ho-Oh':['Sacred Fire','Brave Bird','Roost','Earthquake']};
const entries={
 'pokemon-arena-team':JSON.stringify(names),'pokemon-arena-moves':JSON.stringify(moves),
 'pokemon-arena-profiles':JSON.stringify(Object.fromEntries(names.map(name=>{
  const physical=['Groudon','Rayquaza','Ho-Oh'].includes(name);
  // Maximize HP, Speed and the attacking stat within the player IV budget, with a tier-five offensive personality.
  return [dex[name][0],{pid:physical?2:10,personalityId:physical?9:29,ivs:physical?[31,31,0,31,0,0]:[31,0,0,31,0,31],
   evs:physical?[4,252,0,252,0,0]:[4,0,0,252,0,252],abilityOverride:'Pressure'}];
 }))),
 'pokemon-arena-wild-progress':JSON.stringify({owned:Object.fromEntries(names.map(name=>[name,{level:100,xp:0}])),held:Object.fromEntries(names.map(name=>[name,'Leftovers'])),items:{Leftovers:6},
  ai:Object.fromEntries(names.map(name=>[name,{style:'Aggressive',position:'Auto'}])),battlePlan:'Burst'}),
};
(async()=>{
 const {prepareCampaignContract,verifyCampaignContract}=await import('../supabase/functions/arena-combat/campaign.js');
 const {simulateOnline,campaignEngineVersion}=await import('../supabase/functions/arena-combat/engine.js');
 const beforeLocation=global.location,beforeMedia=global.matchMedia;global.location={protocol:'https:',href:'https://example.test/PokeArena/'};global.matchMedia=()=>{throw Error('Simulation touched browser media preferences');};
 try{const browser=await import('../supabase/functions/arena-combat/engine.js?browser-isolation-test');assert.equal(browser.campaignEngineVersion,campaignEngineVersion);await new Promise(resolve=>setImmediate(resolve));}finally{if(beforeLocation===undefined)delete global.location;else global.location=beforeLocation;if(beforeMedia===undefined)delete global.matchMedia;else global.matchMedia=beforeMedia;}
 let battles=0,wins=0,longest=0;
 for(const [region] of regions)for(const kind of ['daily','elite'])for(const seed of [551,8181]){
  const run={id:'10000000-1111-4111-8111-111111111111',entries,definition:{kind,region,seed},won:false,duration:0};
  const initial=JSON.stringify(run),prepared=prepareCampaignContract(run);
  assert.equal(prepared.version,campaignEngineVersion);assert.deepEqual(prepared,prepareCampaignContract(structuredClone(run)));
  const outcome=verifyCampaignContract(run);assert.equal(JSON.stringify(run),initial,'verification cannot mutate the pinned save');
  if(outcome.won)wins++;longest=Math.max(longest,outcome.duration);battles++;
  assert(outcome.duration>0 && outcome.duration<=301);
  if(region==='Kanto' && seed===551){
   let state=null,result=null,index=0;
   while(!result && index<20000){const next=simulateOnline(prepared.match,state,index%4+1,null,'host');state=next.state;result=next.result;index++;}
   assert.equal(result==='host' && state.enemies.every(actor=>actor.hp<=0),outcome.won,'client and server outcome parity');
   assert(Math.abs(state.clock-outcome.duration)<1e-8,'client and server duration parity');
  }
 }
 assert.equal(wins,battles,'perfect benchmark teams can clear every regional contract in this seed set');
 const edge=fs.readFileSync(path.join(root,'supabase/functions/arena-combat/index.ts'),'utf8');
 assert(edge.includes("arena_campaign_read"));assert(edge.includes('advanceCampaignVerification(run)'));assert(!edge.includes('body.won'));assert(!edge.includes('body.duration'));
 console.log(JSON.stringify({contractBattles:battles,wins,longestSeconds:Math.round(longest*100)/100,clientServerParity:true,pinnedSave:true}));
})().catch(error=>{console.error(error);process.exitCode=1;});
