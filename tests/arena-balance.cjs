const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

function balanceChecks(assert){
 function arena(size=1){
  const picks=['Mew','Golduck'].slice(0,size);
  initializeOnline({id:'03462841-0000-4000-8000-000000000099',mode:'free_fight',format:size,host_pick:picks,guest_pick:picks,host_entries:{},guest_entries:{}});
  for(const [side,team] of [allies,enemies].entries())for(const [i,member] of team.entries()){
   Object.assign(member,{x:350+side*24,y:210+i*4,hp:1000,max:1000,stats:[1000,200,200,200,200,200],
    type:'Normal',singleType:true,ability:null,heldItem:null,entryPending:false,revealed:true,
    luckyChantUntil:99999,normalAttacksEnabled:false,defendRecharge:[999,999,999],dashRecharge:[999,999,999]});
   Object.assign(trainerFields[side][i],{actor:member,transition:null});
  }
  arenaMap=null;
  return [allies[0],enemies[0]];
 }
 function hit(a,b,move,targets=[b]){
  a.lockOnUntil=clock+1;
  const before=b.hp;
  resolveOffensiveMove(a,move,moveRules(move),b,targets);
  return before-b.hp;
 }
 function damage(a,b,move){
  const [type,power]=moveCatalog[move];
  return battleDamage(a,b,power,arenaAbilityMatchup(a,b,move,type),moveRules(move).category===2,type,move);
 }
 const gear=Object.keys(tacticalHeldItems);
 assert.equal(gear.length,6);
 assert.equal(new Set(gear.map(name=>bagItemArt[name][1])).size,gear.length);
 for(const name of gear){
  const [color,pattern]=bagItemArt[name];
  assert.match(color,/^#[a-f\d]{6}$/i);
  assert(pattern.split(' ').every(row=>row.length===12 && /^[.olwcgd]+$/.test(row)));
  assert(pattern.split(' ').length<=12 && heldItems[name].price>0 && heldItems[name].description);
  const choices={Mew:name,Golduck:name};
  assert.equal(pvpLoanerFor('Mew',['Mew','Golduck'],choices),name);
  assert.equal(pvpLoanerFor('Golduck',['Mew','Golduck'],choices),null);
 }
 for(const name of visibleArenaMoves()){
  const rule=moveRules(name);
  assert(Number.isFinite(rule.cooldown) && rule.cooldown>0 && skillDescription(name),name);
 }
 for(const name of Object.keys(abilityCatalog))assert(abilityEffects.has(name) && arenaAbilityDescriptions[name],name);
 assert.equal(moveRules('Population Bomb').cooldown,8.1);
 assert.equal(strikePowerTotal('Population Bomb',true,.9),10);
 assert(strikePowerTotal('Population Bomb',false,.9)<7);
 assert.equal(moveRules('Bullet Seed').cooldown,3.7);
 assert(moveRules('Surging Strikes').cooldown>=4.9);
 assert.equal(moveRules('Absorb').cooldown,1.5);
 assert.equal(moveRules('Mega Drain').cooldown,2.2);
 for(const move of ['Triple Kick','Triple Axel']){
  const [a,b]=arena();a.ability='Skill Link';hit(a,b,move);
  const hits=effects.filter(e=>e.move===move && e.damage>0).map(e=>e.damage);
  assert.equal(hits.length,3);assert(hits[0]<hits[1] && hits[1]<hits[2],move);
 }
 for(const move of selfDropMoves){
  const [a,b]=arena(2);b.ability='Shield Dust';enemies[1].heldItem='Covert Cloak';
  const expected=moveRules(move).changes;
  hit(a,b,move,enemies);
  for(const [stat,amount] of expected){
   assert.equal(a.stages[stat],amount,move+' pays once per cast');
   assert(enemies.every(foe=>foe.stages[stat]===0),move+' leaves defender stats intact');
  }
 }
 {
  const [a,b]=arena();a.ability='Contrary';b.type='Fire';b.ability='Flash Fire';hit(a,b,'Overheat');assert.equal(a.stages[4],0);
  b.ability=null;b.substituteHP=150;hit(a,b,'Overheat');assert.equal(a.stages[4],2);assert(b.substituteHP<150);
 }
 {
  const [a,b]=arena();b.heldItem='Covert Cloak';
  hit(a,b,'Acid Spray');assert.equal(b.stages[5],0);
  hit(a,b,'Nuzzle');assert.equal(b.ailment,null);
  hit(a,b,'Flame Charge');assert.equal(a.stages[6],1);
  hit(a,b,'Thunder Wave');assert.equal(b.ailment,1);
  fieldMoveExpiry['Magic Room']=clock+8;hit(a,b,'Acid Spray');assert.equal(b.stages[5],-2);
 }
 for(const move of finishingMoves){
  const [a,b]=arena();const listed=moveCatalog[move][2];
  assert.deepEqual([arenaBaseAccuracy(move,b,listed),movePower(move,0,a,b)],[30,95]);
  b.hp=330;assert.deepEqual([arenaBaseAccuracy(move,b,listed),movePower(move,0,a,b)],[70,160]);
  assert(hit(a,b,move)>0 && b.hp>0);
 }
 {
  const [a,b]=arena();a.hp=250;b.hp=700;
  const first=hit(a,b,'Giga Drain'),plain=a.hp-250;a.hp=250;b.hp=700;a.heldItem='Big Root';
  assert.equal(hit(a,b,'Giga Drain'),first);assert.equal(a.hp-250,Math.round(first*.5*1.3));assert(a.hp-250>plain);
  a.healBlockUntil=99;a.hp=250;hit(a,b,'Giga Drain');assert.equal(a.hp,250);
  a.healBlockUntil=0;b.ability='Liquid Ooze';hit(a,b,'Giga Drain');assert.equal(250-a.hp,plain);
 }
 {
  const [a,b]=arena();b.type='Grass';const normal=damage(a,b,'Flamethrower');
  a.heldItem='Expert Belt';assert(damage(a,b,'Flamethrower')>normal);
  a.ability='Klutz';assert.equal(damage(a,b,'Flamethrower'),normal);
  a.ability=null;b.type='Water';const resisted=damage(a,b,'Flamethrower');a.heldItem=null;assert.equal(damage(a,b,'Flamethrower'),resisted);
 }
 {
  const [a,b]=arena();b.heldItem='Rocky Helmet';const d=hit(a,b,'Pound');
  assert.equal(1000-a.hp,Math.floor(d*.2));a.hp=1000;hit(a,b,'Water Gun');assert.equal(a.hp,1000);
  a.ability='Magic Guard';hit(a,b,'Pound');assert.equal(a.hp,1000);
  a.ability=null;a.stats[1]=10000;hit(a,b,'Pound');assert.equal(a.hp,960);
 }
 {
  const crits=(item,ability)=>{
   const [a,b]=arena();b.luckyChantUntil=0;b.ability=ability;a.heldItem=item;
   const base=damage(a,b,'Water Gun');let count=0;
   for(let i=0;i<400;i++){b.hp=1000;if(hit(a,b,'Water Gun')>base)count++;}
   return count;
  };
  const plain=crits(null,null);assert(crits('Scope Lens',null)>plain+12);
  assert.equal(crits('Scope Lens','Battle Armor'),0);
 }
 for(const [item,duration] of [[null,10],['Light Clay',13]]){
  const [a,b]=arena();a.heldItem=item;a.moves=['Reflect'];a.moveTimers=[0];a.moveCooldowns=[16];
  b.moves=['Pound'];b.moveTimers=[0];b.moveCooldowns=[2];b.stats[1]=1200;
  act(a,[b],1/60);
  assert.equal(screenTime(a,'Reflect'),duration);
  assert(a.moveCooldowns[0]>duration);
 }
 {
  const [a,b]=arena();additionalStatusMoves['Leech Seed'].apply(a,b);const before=b.hp;
  for(let i=1;i<=12;i++){clock=i;tickStatus(b,1);}
  assert.equal(before-b.hp,160);assert.equal(b.seedAt,0);
  hit(a,b,'Wrap');const first=b.trappedUntil;clock++;hit(a,b,'Bind');assert.equal(b.trappedUntil,first);
  clock+=7;hit(a,b,'Wrap');assert(b.trappedUntil>first);
 }
 {
  const [a,b]=arena(2),other=allies[1];b.ability='Perish Body';
  const contact=attacker=>advancedAbilityOnHit(attacker,b,'Pound','Normal',true,10,false);
  contact(a);assert.equal(a.perishAt,8);contact(other);assert(!other.perishAt);
  b.perishAt=0;clock=4;contact(other);assert(!other.perishAt);
  clock=16;contact(other);assert.equal(other.perishAt,24);
 }
 {
  const [a,b]=arena();b.ability='Cute Charm';
  const contact=()=>{onlineRandomState=0;advancedAbilityOnHit(a,b,'Pound','Normal',true,10,false);};
  contact();assert.equal(a.attractUntil,3);clock=3;contact();assert.equal(a.attractUntil,3);
  clock=6;contact();assert.equal(a.attractUntil,9);
 }
 for(const ability of ['Rough Skin','Iron Barbs']){
  const [a,b]=arena();b.ability=ability;hit(a,b,'Pound');const hp=a.hp;assert(hp<1000);
  hit(a,b,'Pound');assert.equal(a.hp,hp);clock++;hit(a,b,'Pound');assert(a.hp<hp);
 }
 {
  const [a,b]=arena();b.ability='Weak Armor';hit(a,b,'Pound');hit(a,b,'Pound');assert.equal(b.stages[3],-1);
  clock+=4;hit(a,b,'Pound');assert.equal(b.stages[6],3);clock+=5;hit(a,b,'Pound');assert.equal(b.stages[3],-2);
 }
 {
  const [a,b]=arena(2);a.ability='Healer';a.ailment=5;allies[1].ailment=4;
  advancedAbilityTick(a,4);assert.equal(allies[1].ailment,null);assert.equal(a.ailment,5);
  advancedAbilityTick(a,4);assert.equal(a.ailment,null);
  b.hp=500;b.ability='Poison Heal';tryAilment(b,5,a);tickStatus(b,1);assert.equal(b.hp,531);
 }
 for(const [ability,move] of [['Overgrow','Vine Whip'],['Blaze','Ember'],['Torrent','Water Gun'],['Swarm','Bug Bite']]){
  const [a,b]=arena();a.ability=ability;const plain=damage(a,b,move);
  a.hp=500;const half=damage(a,b,move);a.hp=300;assert(half>plain && damage(a,b,move)>half);
 }
 for(const [ability,move,factor] of [['Huge Power','Brick Break',1.5],['Pure Power','Brick Break',1.5],
  ['Water Bubble','Surf',1.5],['Iron Fist','Ice Punch',1.35],['Hustle','Brick Break',1.65],
  ['Gorilla Tactics','Brick Break',1.25],['Technician','Fissure',1]]){
  const [a,b]=arena();const base=damage(a,b,move);a.ability=ability;
  assert(Math.abs(damage(a,b,move)-base*factor)<=1,ability+' damage');
  if(ability==='Gorilla Tactics'){a.hp=a.max/2;assert(Math.abs(damage(a,b,move)-base*1.6)<=1);}
 }
 for(const master of [false,true]){
  const [a,b]=arena();b.side='boss';if(master)b.masterRaidPhase=2;
  a.hp=200;b.max=b.hp=10000;additionalStatusMoves['Pain Split'].apply(a,b);assert.equal(a.hp,400);assert.equal(b.hp,9800);
  additionalStatusMoves['Perish Song'].apply(a,b);assert(!b.perishAt && a.perishAt);
  a.hp=1;a.destinyUntil=clock+4;hit(b,a,'Pound');assert.equal(a.hp,0);assert.equal(b.hp,9800);
 }
 {
  const [a]=arena();a.moves=['Population Bomb'];a.moveTimers=[.7];a.moveCooldowns=[1.6];
  a.battleTransform={moves:['Reflect'],moveCooldowns:[3],moveTimers:[.3]};
  const legacy=JSON.parse(JSON.stringify(saveOnlineState()));delete legacy.balanceRevision;
  loadOnlineState(legacy);assert.equal(allies[0].moveCooldowns[0],8.1);assert.equal(allies[0].moveTimers[0],.7);
  assert.equal(allies[0].battleTransform.moveCooldowns[0],16);
  loadOnlineState(saveOnlineState());assert.equal(allies[0].battleTransform.moveTimers[0],.3);
 }
 return {moves:visibleArenaMoves().length,abilities:Object.keys(abilityCatalog).length,gear:gear.length};
}
(async()=>{
 const engine=read('supabase/functions/arena-combat/engine.js');
 const code=engine+'\nexport '+balanceChecks.toString();
 const mod=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
 console.log('Arena balance and equipment checks passed.',mod.balanceChecks(assert));
})().catch(err=>{console.error(String(err.stack).replace(/data:text\/javascript;base64,[^:)]*/g,'engine.js').slice(0,1500));process.exitCode=1;});
