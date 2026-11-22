const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const engine=fs.readFileSync(path.join(root,'supabase/functions/arena-combat/engine.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const local=fs.readFileSync(path.join(root,'local-test/PokeArena_Local_Test.html'),'utf8');
for(const [start,end] of [['const advancedArenaAbilities=','const abilityEffects='],['// Remaining Arena abilities.','function abilityWeather()']]) {
 const take=s=>{const a=s.indexOf(start),b=s.indexOf(end,a);assert(a>=0 && b>a);return s.slice(a,b).replaceAll('onlineRandom()','Math.random()');};
 assert.equal(take(engine),take(html));assert.equal(take(local),take(html));
}
const probe=String.raw`
export function checkRemainingAbilities(assert) {
 const covered=new Set();let checks=0;
 function test(names,fn) {
  const list=names.split('|');
  try{fn();for(const name of list){assert(Object.hasOwn(advancedArenaAbilities,name),name);covered.add(name);}checks++;}
  catch(error){error.abilityCheck=names;throw error;}
 }
 function make(ability=null,friendly=true,name='Mewtwo',moves=['Tackle']) {
  const profile={ivs:Array(6).fill(31),evs:Array(6).fill(0),pid:0,abilityOverride:ability ?? 'Pressure'};
  const actor=unit(name,friendly?100:130,120,friendly,100,{profile,moves});
  Object.assign(actor,{ability,hp:1000,max:1000,stats:[1000,100,100,100,100,100],type:'Normal',singleType:true,copiedSecondary:null,
   heldItem:null,itemUsed:false,side:friendly?'host':'guest',onlineId:(friendly?'host:':'guest:')+Math.random(),revealed:true,
   luckyChantUntil:1e9,defendRecharge:[1e9,1e9,1e9],dashRecharge:[1e9,1e9,1e9],pace:60,cooldown:0.5,
   ai:normalizeBattleAI({style:'Aggressive',position:'Auto',target:'Nearest'})});
  return actor;
 }
 function field(actor,target,team=[],foes=[]) {
  allies=[actor,...team];enemies=[target,...foes];activePlayer=actor;activeEnemy=target;
  trainerFields=[allies,enemies].map(roster=>roster.map(actor=>({actor,transition:null,owner:actor.side,y:actor.y})));
  selectedGym=selectedTrainer=selectedWild=rogueRun=null;phase='battle';clock=0;lastDamageClock=0;masterPressure=0;
  playerSwitch=enemySwitch=null;recallCooldown=0;recallSlot=0;arenaMap=null;battleWeather=battleTerrain=null;
  weatherTime=terrainTime=0;effects=[];pendingCasts=[];entryHazards=[{},{}];fieldMoveExpiry={};damageBuckets=[];onlineRandomState=0;
 }
 function enter(actor,target){actor.entryPending=true;entryAbility(actor,target);}
 function hit(actor,target,move='Tackle',rules=moveRules(move),guaranteed=true) {
  actor.lockOnUntil=guaranteed?clock+1:0;
  resolveOffensiveMove(actor,move,rules,target,[target]);return 1000-target.hp;
 }
 function eq(actual,expected){assert(Math.abs(actual-expected)<1e-8,actual+' != '+expected);}
 function factor(actor,target,physical=true,element='Normal',move='Tackle'){return advancedAbilityDamage(actor,target,physical,element,move);}
 assert.equal(abilityEffects.size,311);assert.equal(Object.keys(advancedArenaAbilities).length,123);
 for(const ability of Object.keys(abilityCatalog))assert(abilityEffects.has(ability) && arenaAbilityDescriptions[ability],ability);
 test('Analytic|Defeatist|Rivalry|Flare Boost|Toxic Boost|Fire Mane|Mega Sol|Rocky Payload|Hunger Switch',()=>{
  const a=make(),b=make(null,false);field(a,b);
  a.ability='Analytic';b.attack=1;eq(factor(a,b),1.25);b.attack=0;eq(factor(a,b),1);
  a.ability='Defeatist';a.hp=500;eq(factor(a,b),0.5);a.hp=501;eq(factor(a,b),1);
  a.ability='Rivalry';eq(factor(a,b),1.2);b.type='Fire';eq(factor(a,b),0.9);b.type='Normal';
  a.ability='Flare Boost';a.ailment=4;eq(factor(a,b,false),1.5);
  a.ability='Toxic Boost';a.ailment=5;eq(factor(a,b),1.5);a.ailment=null;
  a.ability='Fire Mane';eq(factor(a,b,true,'Fire'),1.3);setWeather('Sun');eq(advancedAbilityPace(a),1.2);
  a.ability='Mega Sol';eq(factor(a,b,false),1.2);
  a.ability='Rocky Payload';eq(factor(a,b,true,'Rock'),1.5);
  a.ability='Hunger Switch';eq(factor(a,b,true),1.2);eq(factor(a,b,false),1);a.abilityElapsed=6;eq(factor(a,b,false),1.2);
 });
 test('Dragonize|Normalize|Liquid Voice',()=>{
  const a=make(),b=make(null,false);field(a,b);
  a.ability='Dragonize';assert.equal(arenaAttackElement(a,'Normal Attack').element,'Dragon');eq(abilityDamageMultiplier(a,true,'Dragon','Tackle'),1.2);
  a.ability='Normalize';assert.equal(arenaAttackElement(a,'Thunderbolt').element,'Normal');eq(factor(a,b,false,'Normal','Thunderbolt'),1.2);
  a.ability='Liquid Voice';assert.equal(arenaAttackElement(a,'Hyper Voice').element,'Water');eq(factor(a,b,false,'Water','Hyper Voice'),1.2);
 });
 test('Battery|Power Spot|Flower Gift|Friend Guard|Commander',()=>{
  const a=make(),b=make(null,false),c=make('Battery'),d=make('Battery');field(a,b,[c,d]);
  eq(factor(a,b,false),1.2);eq(factor(a,b,true),1);
  c.ability=d.ability='Power Spot';eq(factor(a,b),1.2);
  c.ability=d.ability='Flower Gift';setWeather('Sun');eq(factor(a,b),1.25);eq(advancedAbilityDefense(a,b,false,'Water','Surf'),1.25);
  c.ability=d.ability='Friend Guard';eq(advancedAbilityDefense(a,b,true,'Normal','Tackle'),1/0.75);
  c.ability='Commander';d.ability=null;enter(c,b);assert.equal(c.commanderTarget,battleActorId(a));
  eq(factor(a,b),1.2);eq(advancedAbilityDefense(a,b,true,'Normal','Tackle'),1/0.8);eq(factor(c,b),0.8);
  c.x=800;eq(factor(a,b),1);
 });
 test('Dark Aura|Fairy Aura|Aura Break|Tablets of Ruin|Vessel of Ruin|Sword of Ruin|Beads of Ruin',()=>{
  const a=make(),b=make(null,false),c=make('Dark Aura');field(a,b,[c]);eq(factor(a,b,true,'Dark'),4/3);
  c.ability='Fairy Aura';eq(factor(a,b,false,'Fairy'),4/3);b.ability='Aura Break';eq(factor(a,b,false,'Fairy'),0.75);b.ability=null;
  c.ability='Tablets of Ruin';eq(factor(a,b),0.75);a.ability='Tablets of Ruin';eq(factor(a,b),1);a.ability=null;
  c.ability='Vessel of Ruin';eq(factor(a,b,false),0.75);
  c.ability='Sword of Ruin';eq(advancedAbilityDefense(b,a,true,'Normal','Tackle'),0.75);
  c.ability='Beads of Ruin';eq(advancedAbilityDefense(b,a,false,'Normal','Tackle'),0.75);
 });
 test('Fluffy|Grass Pelt|Purifying Salt|Piercing Drill',()=>{
  const a=make(),b=make('Fluffy',false);field(a,b);
  eq(advancedAbilityDefense(b,a,true,'Normal','Tackle'),2);eq(advancedAbilityDefense(b,a,true,'Fire','Fire Punch'),1);
  eq(advancedAbilityDefense(b,a,false,'Fire','Flamethrower'),0.5);
  b.ability='Grass Pelt';setTerrain('Grass');eq(advancedAbilityDefense(b,a,true,'Normal','Tackle'),1.5);
  b.ability='Purifying Salt';eq(advancedAbilityDefense(b,a,false,'Ghost','Shadow Ball'),2);assert(!tryAilment(b,5,a));
  b.ability=null;a.ability='Piercing Drill';eq(advancedAbilityDefense(b,a,true,'Normal','Tackle'),0.75);eq(advancedAbilityDefense(b,a,true,'Normal','Normal Attack'),1);
 });
 test('Protosynthesis|Quark Drive|Surge Surfer',()=>{
  const a=make('Protosynthesis'),b=make(null,false);field(a,b);a.stats[1]=200;assert.equal(highestAbilityStat(a),-1);
  setWeather('Sun');assert.equal(highestAbilityStat(a),1);eq(factor(a,b),1.3);
  a.stats[3]=300;assert.equal(highestAbilityStat(a),3);eq(abilityMovementMultiplier(a),1.3);
  a.ability='Quark Drive';assert.equal(highestAbilityStat(a),-1);setTerrain('Electric');assert.equal(highestAbilityStat(a),3);
  a.ability='Surge Surfer';eq(abilityMovementMultiplier(a),2);
 });
 test('Anticipation|Forewarn|Frisk|Embody Aspect|Supersweet Syrup',()=>{
  const a=make('Anticipation'),b=make(null,false,'Mewtwo',['Aura Sphere','Hyper Beam']);field(a,b);enter(a,b);assert(a.guard>=2);
  a.ability='Forewarn';enter(a,b);assert.equal(a.forewarnMove,'Hyper Beam');assert(a.abilityNotice.includes('Hyper Beam'));eq(advancedAbilityDefense(a,b,false,'Normal','Hyper Beam'),1/0.75);
  a.ability='Frisk';b.heldItem='Leftovers';enter(a,b);assert(a.abilityNotice.includes('Leftovers'));eq(factor(a,b),1.2);
  b.heldItem=null;a.ability='Embody Aspect';a.type='Fire';enter(a,b);assert.equal(a.stages[2],1);
  a.ability='Supersweet Syrup';enter(a,b);assert.equal(b.stages[8],-1);enter(a,b);assert.equal(b.stages[8],-1);
 });
 test('Costar|Curious Medicine|Hospitality',()=>{
  const a=make('Costar'),b=make(null,false),c=make();field(a,b,[c]);c.stages[2]=2;c.stages[3]=-2;enter(a,b);
  assert.equal(a.stages[2],2);assert.equal(a.stages[3],0);
  a.ability='Curious Medicine';enter(a,b);assert.equal(c.stages[3],0);assert.equal(c.stages[2],2);
  a.ability='Hospitality';c.hp=500;enter(a,b);assert.equal(c.hp,750);enter(a,b);assert.equal(c.hp,750);
 });
 test('Leaf Guard|Flower Veil|Comatose|Early Bird|Bad Dreams',()=>{
  const a=make(),b=make('Leaf Guard',false),c=make('Flower Veil',false);field(a,b,[],[c]);setWeather('Sun');assert(!tryAilment(b,5,a));
  battleWeather=null;b.ability=null;b.type='Grass';assert(!tryAilment(b,5,a));applyChanges(b,[[2,-1]],a);assert.equal(b.stages[2],0);
  c.ability=null;b.type='Normal';b.ability='Comatose';assert(!tryAilment(b,2,a));assert(arenaAsleep(b));
  a.ability='Bad Dreams';clock=4;advancedAbilityTick(a,4);assert.equal(b.hp,960);b.ability='Magic Guard';b.ailment=2;advancedAbilityTick(a,4);assert.equal(b.hp,960);
  b.ailment=null;b.ability='Early Bird';clock=10;assert(tryAilment(b,2,a));clock=12;advancedAbilityTick(b,0.1);assert.equal(b.ailment,null);
 });
 test('Good as Gold|Aroma Veil|Mycelium Might',()=>{
  const a=make(),b=make('Good as Gold',false),c=make('Aroma Veil',false);field(a,b,[],[c]);
  hit(a,b,'Will O Wisp');assert.equal(b.ailment,null);
  b.ability=null;assert(controlAbilityBlocks(b,'Taunt',a));c.ability=null;assert(!controlAbilityBlocks(b,'Taunt',a));
  a.ability='Mycelium Might';b.ability='Good as Gold';hit(a,b,'Will O Wisp');assert.equal(b.ailment,4);
  eq(abilityActionRate(a,'Will O Wisp'),1.25);b.ailment=null;b.ability='Immunity';hit(a,b,'Toxic');assert.equal(b.ailment,5);
 });
 test('Armor Tail|Dazzling|Queenly Majesty|Gale Wings|Triage|Quick Draw|Stall',()=>{
  const a=make(),b=make(null,false),c=make(null,false);field(a,b,[],[c]);
  for(const name of ['Armor Tail','Dazzling','Queenly Majesty']) {c.ability=name;assert(priorityWardBlocks(a,b,'Quick Attack'));assert(!priorityWardBlocks(a,b,'Tackle'));}
  a.ability='Gale Wings';assert(arenaPriority(a,'Aerial Ace')>0);eq(abilityActionRate(a,'Aerial Ace'),0.75);a.hp=999;assert.equal(arenaPriority(a,'Aerial Ace'),0);
  a.ability='Triage';assert.equal(arenaPriority(a,'Giga Drain'),3);eq(abilityActionRate(a,'Recover'),0.7);
  a.ability='Quick Draw';a.abilityElapsed=0;eq(abilityActionRate(a,'Tackle'),0.7);a.abilityElapsed=2;eq(abilityActionRate(a,'Tackle'),1);
  a.ability='Stall';eq(abilityActionRate(a,'Tackle'),1.25);a.charge=1;eq(advancedAbilityDefense(a,b,true,'Normal','Tackle'),1/0.85);
 });
 test('Wonder Skin|Tangled Feet|Illuminate',()=>{
  const a=make('Illuminate'),b=make(null,false);field(a,b);enter(a,b);assert.equal(b.dazzledUntil,3);
  // Actual accuracy path: Wonder Skin limits a guaranteed-accuracy status move unless Lock On is active.
  a.ability=null;b.ability='Wonder Skin';onlineRandomState=1500;hit(a,b,'Will O Wisp',moveRules('Will O Wisp'),false);assert.equal(b.ailment,null);
  hit(a,b,'Will O Wisp');assert.equal(b.ailment,4);
  b.ailment=6;b.ability='Tangled Feet';a.stages[7]=0;onlineRandomState=1500;b.hp=1000;hit(a,b,'Tackle',moveRules('Tackle'),false);assert.equal(b.hp,1000);
 });
 test('Arena Trap|Magnet Pull|Run Away|Guard Dog',()=>{
  const a=make(),b=make('Arena Trap',false),reserve=make();field(a,b);allies.push(reserve);assert(voluntaryRecallBlocked(a));
  a.type='Flying';assert(!voluntaryRecallBlocked(a));a.type='Steel';b.ability='Magnet Pull';assert(voluntaryRecallBlocked(a));
  a.ability='Run Away';a.trappedUntil=20;assert(!voluntaryRecallBlocked(a));a.exhaustedUntil=10;assert(voluntaryRecallBlocked(a));a.exhaustedUntil=0;
  fieldMoveExpiry['Fairy Lock']=10;assert(recallWithMove(a),'Run Away must also work through actual pivot moves');field(a,b);allies.push(reserve);a.trappedUntil=20;fieldMoveExpiry['Fairy Lock']=10;onlineRecalls={};assert.doesNotThrow(()=>onlineSend('host',reserve.onlineId,0),'Run Away must work for authoritative online recalls');field(a,b);allies.push(reserve);a.ability='Guard Dog';a.trappedUntil=0;b.ability='Intimidate';enter(b,a);assert.equal(a.stages[2],1);
  assert.equal(forcedSwitchOptions(a,'Guard Dog').length,0);
 });
 test('Stalwart|Propeller Tail|Long Reach|Unseen Fist|Mind\'s Eye',()=>{
  const a=make(),b=make(null,false);field(a,b);b.redirectUntil=10;
  for(const name of ['Stalwart','Propeller Tail']){a.ability=name;assert.notEqual(targetPreference(a,b,20),-1e6);}
  a.ability=null;assert.equal(targetPreference(a,b,20),-1e6);a.ability='Long Reach';assert(!arenaContact(a,'Normal Attack'));
  a.ability='Unseen Fist';assert(unseenGuard(a,'Tackle'));b.guard=10;b.defendUntil=10;const guarded=hit(a,b);assert(guarded>0);
  a.ability="Mind's Eye";b.type='Ghost';b.hp=1000;assert.equal(arenaAbilityMatchup(a,b,'Tackle','Normal'),1);hit(a,b);assert(b.hp<1000);
 });
 test('Cheek Pouch|Gluttony|Cud Chew|Harvest|Klutz|Symbiosis',()=>{
  const a=make('Gluttony'),b=make(null,false),c=make('Symbiosis');field(a,b,[c]);a.hp=700;a.heldItem='Oran Berry';useHeldBerry(a);assert.equal(a.hp,710);
  a.ability='Cheek Pouch';a.itemUsed=false;a.hp=400;useHeldBerry(a);assert.equal(a.hp,535);
  a.ability='Cud Chew';a.itemUsed=false;a.hp=400;useHeldBerry(a);assert.equal(a.cudChewAt,4);clock=4;advancedAbilityTick(a,4);assert.equal(a.hp,420);
  a.ability='Harvest';setWeather('Sun');a.itemUsed=true;a.advancedAbilityTimer=0;advancedAbilityTick(a,12);assert(!a.itemUsed);
  a.ability='Klutz';assert.equal(effectiveHeldItem(a),null);a.itemUsed=false;a.hp=400;useHeldBerry(a);assert.equal(a.hp,400);
  a.ability=null;c.heldItem='Leftovers';useHeldBerry(a);assert.equal(a.heldItem,'Leftovers');assert.equal(c.heldItem,null);
 });
 test('Magician|Pickpocket|Sticky Hold|Pickup|Ball Fetch',()=>{
  const a=make('Magician'),b=make(null,false),c=make();field(a,b,[c]);b.heldItem='Leftovers';const profile=JSON.stringify(a.profile);hit(a,b);
  assert.equal(a.heldItem,'Leftovers');assert.equal(b.heldItem,null);assert.equal(JSON.stringify(a.profile),profile);
  a.ability=null;a.heldItem='Wise Glasses';b.ability='Pickpocket';hit(a,b);assert.equal(b.heldItem,'Wise Glasses');assert.equal(a.heldItem,null);
  a.ability='Sticky Hold';a.heldItem='Shell Bell';b.heldItem=null;assert(!takeBattleItem(b,a));exchangeHeldItems(b,a);assert.equal(a.heldItem,'Shell Bell');
  a.ability='Pickup';a.heldItem=null;c.hp=0;advancedAbilityTick(a,0.1);assert.equal(a.heldItem,'Oran Berry');assert(a.pickupUsed);
  a.ability='Ball Fetch';a.dashRecharge=[1,2,3];missedAbilityMove(a,'Thunderbolt');assert.equal(a.dashRecharge.length,2);missedAbilityMove(a,'Thunderbolt');assert.equal(a.dashRecharge.length,2);
 });
 test('Heavy Metal|Light Metal|Multitype|RKS System|Mimicry',()=>{
  const a=make(),b=make(null,false);field(a,b);const weight=arenaWeight(a);a.ability='Heavy Metal';eq(arenaWeight(a),weight*2);
  a.ability='Light Metal';eq(arenaWeight(a),weight/2);assert(movePower('Heavy Slam',0,a,b)>=40);
  const item=Object.keys(heldItems).find(name=>heldItems[name].element==='Fire');assert(item);
  for(const name of ['Multitype','RKS System']) {a.ability=name;a.heldItem=item;updateAbilityStance(a);assert.deepEqual(arenaDefenseTypes(a),['Fire']);eq(factor(a,b,true,'Fire'),1.2);a.heldItem=null;updateAbilityStance(a);assert.deepEqual(arenaDefenseTypes(a),['Normal']);}
  a.ability='Mimicry';setTerrain('Psychic');updateAbilityStance(a);assert.deepEqual(arenaDefenseTypes(a),['Psychic']);battleTerrain=null;updateAbilityStance(a);assert.deepEqual(arenaDefenseTypes(a),['Normal']);
 });
 test('Healer|Honey Gather|Moody|Steadfast',()=>{
  const a=make('Healer'),b=make(null,false),c=make();field(a,b,[c]);c.ailment=5;advancedAbilityTick(a,4);assert.equal(c.ailment,null);
  a.ability='Honey Gather';c.hp=500;a.advancedAbilityTimer=0;advancedAbilityTick(a,4);assert.equal(c.hp,530);const other=make('Honey Gather');allies.push(other);trainerFields[0].push({actor:other,owner:other.side,transition:null});advancedAbilityTick(other,4);assert.equal(c.hp,530,'Honey Gather auras must not stack');
  a.ability='Moody';a.advancedAbilityTimer=0;advancedAbilityTick(a,8);assert(a.stages.includes(2));assert(a.stages.includes(-1));
  a.ability='Steadfast';a.flinch=0.2;a.dashRecharge=[1,2,3];const speed=a.stages[6];advancedAbilityTick(a,0.1);assert.equal(a.stages[6],Math.min(3,speed+1));assert.equal(a.dashRecharge.length,2);
 });
 test('Anger Point|Anger Shell|Color Change|Sand Spit|Seed Sower|Toxic Debris|Cotton Down|Thermal Exchange',()=>{
  const a=make(),b=make('Anger Point',false);field(a,b);b.hp=900;advancedAbilityOnHit(a,b,'Tackle','Normal',true,100,true);assert.equal(b.stages[2],3);
  b.ability='Anger Shell';b.hp=400;b.stages.fill(0);advancedAbilityOnHit(a,b,'Tackle','Normal',true,200,false);assert.equal(b.stages[2],1);assert.equal(b.stages[3],-1);
  b.ability='Color Change';advancedAbilityOnHit(a,b,'Surf','Water',false,1,false);assert.deepEqual(arenaDefenseTypes(b),['Water']);
  b.ability='Sand Spit';advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(battleWeather,'Sand');
  b.ability='Seed Sower';advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(battleTerrain,'Grass');
  b.ability='Toxic Debris';advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(entryHazards[0]['Toxic Spikes'],1);
  b.ability='Cotton Down';advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(a.gooeyUntil,2);
  b.ability='Thermal Exchange';assert(!tryAilment(b,4,a));const atk=b.stages[2];advancedAbilityOnHit(a,b,'Flamethrower','Fire',false,1,false);assert.equal(b.stages[2],atk+1);
 });
 test('Electromorphosis|Wind Power|Gulp Missile|Ice Face',()=>{
  const a=make(),b=make('Electromorphosis',false);field(a,b);advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);eq(factor(b,a,false,'Electric','Thunderbolt'),2);
  hit(b,a,'Thunderbolt');assert.equal(b.electricChargeUntil,0);
  b.ability='Wind Power';advancedAbilityOnHit(a,b,'Hurricane','Flying',false,1,false);assert.equal(b.electricChargeUntil,6);
  b.ability='Gulp Missile';advancedAbilityAction(b,'Surf');assert(b.gulpLoaded);advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert(!b.gulpLoaded);assert.equal(a.ailment,1);assert(a.hp<1000);
  b.ability='Ice Face';b.hp=1000;hit(a,b);assert.equal(b.hp,1000);assert(b.iceFaceBroken);hit(a,b);assert(b.hp<1000);
  setWeather('Snow');clock=12;advancedAbilityTick(b,0.1);assert(!b.iceFaceBroken);
 });
 test('Cute Charm|Stench|Toxic Chain|Spicy Spray|Poison Puppeteer',()=>{
  const a=make(),b=make('Cute Charm',false);field(a,b);advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(a.attractUntil,3);
  a.ability='Stench';b.ability=null;onlineRandomState=2000;advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(b.flinch,0.25);
  a.ability='Toxic Chain';onlineRandomState=0;advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(b.ailment,5);
  b.ailment=null;a.ability='Spicy Spray';onlineRandomState=0;advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(b.ailment,4);
  b.ailment=null;a.ability='Poison Puppeteer';assert(tryAilment(b,5,a));assert.equal(b.puppetUntil,4);assert(arenaConfused(b));
 });
 test('Mummy|Lingering Aroma|Wandering Spirit|Perish Body|Innards Out',()=>{
  const a=make('Pressure'),b=make('Mummy',false);field(a,b);advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(a.ability,'Mummy');
  a.ability='Pressure';b.ability='Lingering Aroma';advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(a.ability,'Lingering Aroma');
  a.ability='Pressure';b.ability='Wandering Spirit';advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(a.ability,'Wandering Spirit');assert.equal(b.ability,'Pressure');
  a.ability=null;b.ability='Perish Body';advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(a.perishAt,8);assert.equal(b.perishAt,8);
  a.perishAt=b.perishAt=0;b.side='boss';advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(b.perishAt,0);b.side='guest';
  b.ability='Innards Out';b.hp=0;a.hp=1000;advancedAbilityOnHit(a,b,'Tackle','Normal',true,500,false);assert.equal(a.hp,750);
 });
 test('Emergency Exit|Wimp Out|Zero to Hero',()=>{
  for(const ability of ['Emergency Exit','Wimp Out']) {
   const a=make(),b=make(ability,false),reserve=make(null,false);field(a,b);enemies.push(reserve);b.hp=400;
   advancedAbilityOnHit(a,b,'Tackle','Normal',true,200,false);assert(trainerFields[1][0].transition);assert(b.emergencyExitUsed);
  }
  const a=make('Zero to Hero'),b=make(null,false),reserve=make();field(a,b);startSwitch(a,reserve);assert(a.heroReady);updateAbilityStance(a);assert.equal(a.abilityStance,'Hero');eq(factor(a,b),1.3);
 });
 test('Battle Bond|As One|Receiver|Power of Alchemy',()=>{
  const a=make('Battle Bond'),b=make(null,false),c=make('Rock Head');field(a,b,[c]);b.hp=0;advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert(a.battleBondUsed);assert.equal(a.stages[2],1);
  a.ability='As One';advancedAbilityOnHit(a,b,'Tackle','Normal',true,1,false);assert.equal(a.stages[2],2);assert.equal(a.stages[4],2);
  b.hp=400;b.heldItem='Oran Berry';useHeldBerry(b);assert(!b.itemUsed);
  for(const ability of ['Receiver','Power of Alchemy']){a.ability=ability;c.hp=0;advancedAbilityTick(a,0.1);assert.equal(a.ability,'Rock Head');}
 });
 test('Dancer|Opportunist',()=>{
  const a=make(),b=make('Opportunist',false),c=make('Dancer');field(a,b,[c]);applyChanges(a,[[2,1]]);assert.equal(b.stages[2],1);
  advancedAbilityAction(a,'Swords Dance');assert.equal(c.stages[2],2);advancedAbilityAction(a,'Swords Dance');assert.equal(c.stages[2],2);
  assert(b.stages[2]<=3,'Opportunist copy chain must terminate at one copy per original boost');
 });
 test('Power Construct|Shields Down|Tera Shell|Tera Shift|Teraform Zero|Illusion',()=>{
  const a=make('Power Construct'),b=make(null,false),c=make(null,true,'Pikachu');field(a,b,[c]);a.hp=500;advancedAbilityTick(a,0.1);assert.equal(a.max,1250);assert.equal(a.hp,750);assert(a.powerConstructUsed);
  a.ability='Shields Down';a.hp=1000;updateAbilityStance(a);assert.equal(a.abilityStance,'Meteor');assert(!tryAilment(a,5,b));a.hp=500;updateAbilityStance(a);assert.equal(a.abilityStance,'Core');eq(factor(a,b),1.25);
  b.ability='Tera Shell';b.type='Water';assert.equal(arenaAbilityMatchup(a,b,'Thunderbolt','Electric'),0.5);b.hp=999;assert.equal(arenaAbilityMatchup(a,b,'Thunderbolt','Electric'),2);
  b.hp=1000;b.ability=null;a.ability='Tera Shift';enter(a,b);assert.equal(a.substituteHP,188);assert.equal(a.abilityStance,'Terastal');
  setWeather('Sun');setTerrain('Electric');a.ability='Teraform Zero';enter(a,b);assert.equal(battleWeather,null);assert.equal(battleTerrain,null);
  a.ability='Illusion';enter(a,b);assert.equal(a.illusionName,'Pikachu');const visible=onlineView(JSON.parse(JSON.stringify(saveOnlineState())),'host','unranked').actors.find(v=>v.onlineId===a.onlineId);assert.equal(visible.illusionName,'Pikachu');assert.equal(visible.substituteHP,188);advancedAbilityOnHit(b,a,'Tackle','Normal',true,1,false);assert.equal(a.illusionName,null);
 });
 const missing=Object.keys(advancedArenaAbilities).filter(name=>!covered.has(name));assert.deepEqual(missing,[],'Every remaining ability needs a behavior assertion');
 {
  const a=make('Power Spot'),b=make('Neutralizing Gas',false),c=make();field(a,b,[c]);
  assert.equal(activeAbility(a),null);
  b.hp=0;assert.equal(activeAbility(a),'Power Spot','Gas knockout must invalidate the aura cache within the same frame');
  eq(factor(c,a),1.2);a.ability='Battery';eq(factor(c,a),1);eq(factor(c,a,false),1.2);
  a.abilitySuppressed=true;eq(factor(c,a,false),1);
  a.abilitySuppressed=false;trainerFields[0][0].transition={};eq(factor(c,a,false),1);
  trainerFields[0][0].transition=null;eq(factor(c,a,false),1.2);a.hp=0;eq(factor(c,a,false),1);
 }
 return {checks,abilities:covered.size};
}
export function seededRemainingAbilities(assert) {
 let battles=0,timeouts=0,longest=0;
 for(const ability of Object.keys(advancedArenaAbilities))for(const seed of [313,2027]) {
  const profile={ivs:Array(6).fill(31),evs:[4,0,0,252,0,252],pid:10,abilityOverride:ability};
  const entry=ability=>({'pokemon-arena-profiles':JSON.stringify({150:{...profile,abilityOverride:ability}}),
   'pokemon-arena-moves':JSON.stringify({Mewtwo:['Aura Sphere','Psystrike','Thunderbolt','Ice Beam']}),
   'pokemon-arena-wild-progress':JSON.stringify({owned:{Mewtwo:{level:100,xp:0}},ai:{Mewtwo:{style:'Aggressive',position:'Auto'}}})});
  const match={id:seed.toString(16).padStart(8,'0')+'-0000-4000-8000-000000000000',mode:'unranked',format:1,
   host_pick:['Mewtwo'],guest_pick:['Mewtwo'],host_entries:entry(ability),guest_entries:entry('Pressure')};
  let state=null,result=null;
  for(let second=0;second<301 && !result;second++) {
   const output=simulateOnline(match,state,60,null,'host');state=JSON.parse(JSON.stringify(output.state));result=output.result;
   for(const actor of [...state.allies,...state.enemies]) {
    assert(actor.hp>=0 && actor.hp<=actor.max,ability+' HP bounds');
    for(const value of [actor.hp,actor.max,actor.x,actor.y,...actor.stats,...actor.moveTimers])assert(Number.isFinite(value),ability+' nonfinite state');
   }
  }
  assert(result,ability+' never completed');
  if(state.clock>=299.99 && state.allies.some(a=>a.hp>0) && state.enemies.some(a=>a.hp>0))timeouts++;
  const view=onlineView(state,'host','unranked');assert(view.actors.length);longest=Math.max(longest,state.clock);battles++;
 }
 return {battles,timeouts,longestSeconds:Math.round(longest*100)/100};
}
`;
(async()=>{
 const mod=await import('data:text/javascript;base64,'+Buffer.from(engine+probe).toString('base64'));
 console.log(JSON.stringify(mod.checkRemainingAbilities(assert)));
 const seeded=mod.seededRemainingAbilities(assert);assert.equal(seeded.timeouts,0);
 console.log(JSON.stringify(seeded));
})().catch(error=>{
 console.error((error.abilityCheck ?? '')+'\n'+(error.stack ?? String(error)).split('\n')
  .map(line=>line.replace(/data:text\/javascript;base64,[^:)]*/g,'engine.js')).slice(0,8).join('\n'));
 process.exitCode=1;
});
