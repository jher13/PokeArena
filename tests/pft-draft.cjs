const assert=require('node:assert/strict');

module.exports=function checkTacticsDraft(game,context){
 const {getRun,makeTrainer,familyOf,field,roll,buy,sell,planAI}=game;
 const mon=(name,position=null,star=1)=>({name,position,star});
 const front={x:3,y:4},back={x:3,y:7};
 const totalCopies=unit=>unit.poolCopies ?? 3**(unit.star-1);
 function checkStock(){
  const run=getRun();
  const counts=new Map([...run.pool].map(([name,entry])=>[name,entry.copies]));
  const add=(name,copies)=>counts.set(name,counts.get(name)+copies);
  for(const trainer of run.trainers){
   for(const name of trainer.shop)if(name)add(name,1);
   for(const unit of [...trainer.units,...(trainer.bossRewards ?? [])])add(familyOf(unit),totalCopies(unit));
  }
  for(const offer of run.choice?.offers ?? [])if(offer.unit)add(offer.name,totalCopies(offer.unit));
  for(const [name,{copies,tier}] of run.pool){
   assert(Number.isInteger(copies) && copies>=0,name);
   assert.equal(counts.get(name),[26,22,18,12,9][tier],name+' must conserve its family stock');
  }
 }
 game.start();const run=getRun();
 checkStock();
 const trainer=run.trainers[1];trainer.gold=100;
 for(const u of [...trainer.units])sell(trainer,u);
 // Three actual shop reservations become one evolved unit. Buying never debits the reserved copies twice.
 for(let i=0;i<3;i++){
  trainer.shop=[game.drawPoolCard(run.pool,['Abra'])];const left=run.pool.get('Abra').copies;
  assert(buy(trainer,0));assert.equal(run.pool.get('Abra').copies,left);checkStock();
 }
 assert.equal(trainer.units[0].name,'Kadabra');assert.equal(totalCopies(trainer.units[0]),3);
 assert(sell(trainer,trainer.units[0]));checkStock();
 const small=new Map([['A',{copies:9}],['B',{copies:1}]]);
 let frequent=0;
 for(let i=0;i<1000;i++){const name=game.drawPoolCard(small,['A','B']);if(name==='A')frequent++;small.get(name).copies++;}
 assert(frequent>840 && frequent<960,'Offers must be weighted by remaining copies');
 // Alternate paid rolls, purchases and locks across eight separate shops.
 for(let round=2;round<=12;round++){
  game.setRound(round);
  for(const t of run.trainers){
   t.gold+=7;roll(t);
   if(t===run.trainers[0]){
    t.lockedOffers=new Set([0]);const held=t.shop[0];roll(t);assert.equal(t.shop[0],held);if(t.shop[1])buy(t,1);
   }else planAI(t);
   assert(t.gold>=0);checkStock();
   const board=field(t);
   assert(board.length<=game.teamSize(t));
   const tiles=board.map(u=>u.position);assert(tiles.every(c=>c && c.x>=0 && c.x<7 && c.y>=4 && c.y<=7));
   assert.equal(new Set(tiles.map(c=>c.x+','+c.y)).size,tiles.length);
  }
 }
 while(run.trainers[0].units.length>5)sell(run.trainers[0],run.trainers[0].units.at(-1));
 run.trainers[2].hp=98;game.setRound(15);game.beginChoices();
 assert.equal(run.choice.kind,'carousel');checkStock();
 const player=run.trainers[0],choice=run.choice;
 const chosen=choice.offers.find(o=>!game.fusionPlan(player,o.unit).overflow);
 assert(game.draftCarousel(player,chosen));choice.offers.splice(choice.offers.indexOf(chosen),1);
 choice.complete();run.choice=null;checkStock();
 // An unclaimed Mega prize, field, bench and locked shop all return on elimination.
 const queued=game.drawPoolCard(run.pool,['Regice']);trainer.bossRewards=[mon(queued)];
 trainer.hp=1;game.result(trainer,run.trainers[2],[],-1);assert.equal(trainer.hp,0);checkStock();

 function draft(units,shop,gold,level=3){
  const t=makeTrainer('Draft test');Object.assign(t,{units,shop,gold,level});return t;
 }
 const synergy=draft([mon('Bulbasaur',back),mon('Squirtle',front)],['Eevee','Abra'],1);
 planAI(synergy);assert.equal(game.traits(field(synergy)).Spellcraft,2);assert(!synergy.units.some(u=>u.name==='Eevee'));
 const upgrade=draft([mon('Bulbasaur',back),mon('Squirtle',front),mon('Weedle',{x:2,y:4})],['Caterpie','Mewtwo'],5);
 planAI(upgrade);assert(field(upgrade).some(u=>u.name==='Mewtwo'));assert.equal(upgrade.gold,0);
 const pair=draft([mon('Abra',back),mon('Abra'),mon('Squirtle',front)],['Eevee','Abra'],1);
 planAI(pair);assert(field(pair).some(u=>u.name==='Kadabra' && u.star===2));
 const waiting=draft([mon('Bulbasaur',back),mon('Squirtle',front)],['Mewtwo',null,null,null,null],0);
 planAI(waiting);assert(waiting.lockedOffers.has(0));roll(waiting);assert.equal(waiting.shop[0],'Mewtwo');
 const packed=draft([mon('Bulbasaur',back),mon('Squirtle',front),mon('Weedle',{x:2,y:4}),
  ...['Pichu','Starly','Seedot','Ralts','Geodude','Cleffa','Caterpie','Hoppip','Machop'].map(n=>mon(n))],['Mewtwo'],5);
 planAI(packed);assert(field(packed).some(u=>u.name==='Mewtwo'));
 assert(packed.units.filter(u=>u.position===null).length<=9);
 assert(field(packed).find(u=>u.name==='Mewtwo').position.y>=6);
 game.setRound(11);
 for(const entry of run.pool.values())entry.copies=0;
 const empty=draft([],[],20);empty.level=9;
 run.pool.get('Abra').copies=1;roll(empty);assert.deepEqual(Array.from(empty.shop).filter(Boolean),['Abra']);
 const missing=game.completeNeutral(empty,true);assert.match(missing,/All eligible Pokémon are drafted/);assert(!empty.units.length);
 game.releaseShop(empty);const fallback=game.completeNeutral(empty,true);assert.match(fallback,/Tier 1 Abra/);assert.equal(empty.units[0].name,'Abra');
 assert.equal(run.pool.get('Abra').copies,0);assert.equal(totalCopies(empty.units[0]),1);
 const none=game.carouselOffers(run.pool,2);assert.equal(none.length,0);

 context.wildProgress={coins:0,owned:{Pikachu:{level:10}},copies:{}};
 context.maximumBattleSpeed=()=>2;context.earnedCoins=n=>2*n;context.giveArenaItem=()=>{};context.saveWildProgress=()=>{};
 assert.equal(game.tacticsCoinRate(),1050);
 context.wildProgress.owned.Pikachu.level=50;assert.equal(game.tacticsCoinRate(),5130);
 context.wildProgress.copies={Pikachu:[{level:100}]};
 context.maximumBattleSpeed=()=>4;assert.equal(game.tacticsCoinRate(),17420);
 game.start();const match=getRun();context.wildProgress.copies={};assert.equal(match.coinRate,17420);
 assert(game.tacticsCoinRate()<match.coinRate);
 game.creditTacticsRound(match,100);assert.equal(match.rewardSeconds,0);
 match.round=8;game.creditTacticsRound(match,100);assert.equal(match.rewardSeconds,0);
 match.round=6;game.creditTacticsRound(match,0);assert.equal(match.rewardSeconds,0);
 game.creditTacticsRound(match,100);game.creditTacticsRound(match,100);assert.equal(match.rewardSeconds,29.5);
 match.round=11;game.creditTacticsRound(match,99999);
 assert(Math.abs(match.rewardSeconds-(29.5+25+game.combatTicks*game.combatStepMs/1000))<1e-8);
 const fixed=[8000,6000,4500,3500,2000,1250,500,250],multipliers=[1.25,1.16,1.08,1,.92,.85,.78,.70];
 for(let i=0;i<8;i++){
  const finished={place:i+1,coinRate:match.coinRate,rewardSeconds:600};
  const before=context.wildProgress.coins;game.awardPlacement(finished);game.awardPlacement(finished);
  assert.equal(context.wildProgress.coins-before,2*(fixed[i]+Math.round(match.coinRate*10*multipliers[i])));
  assert.match(finished.placementReward,/from rounds/);
 }
 console.log('PFT passed shared stock conservation across eight trainers, weighted shops, fusions, locks, carousel, elimination, sold-out prizes, composition upgrades and all eight placement payouts.');
 // Three cups per rotation, with the preview locked to the match and rules shared by all eight trainers.
 const seen=[],cupGold={};
 const picker=game.sideSupplyPicker('tactics',['Stage 2','Stage 3','Stage 4']),select=picker.children[0].children[0];
 select.value='development';select.onchange();assert.match(picker.children[1].textContent,/IV Booster/);
 for(let i=0;i<7;i++){
  const rotation=game.cupSchedule();assert.equal(new Set(rotation).size,rotation.length);
  const next=rotation[0];game.start();const cupRun=getRun();
  assert.equal(cupRun.cup,next);assert.equal(cupRun.focus,'development');assert.notEqual(cupRun.challenges[0].key,'veterans');assert.equal(new Set(cupRun.challenges.map(t=>t.key)).size,3);
  assert.notEqual(seen.at(-1),next);seen.push(next);
  if(next==='workshop'){
   assert.equal(new Set(cupRun.trainers[0].items).size,2);
   assert(cupRun.trainers.every(t=>JSON.stringify(t.items)===JSON.stringify(cupRun.trainers[0].items)));
  }
  cupGold[next]=game.goldInterest(24);assert.equal(game.goldInterest(1000),5);
  const [pa,op]=cupRun.trainers;game.setRound(6);const before=pa.xp;
  game.result(pa,op,[],1);assert.equal(pa.xp-before,next==='academy'?3:2);
 }
 // The last cup before this block may have used part of its rotation. Each new complete block sees all three.
 assert.deepEqual(new Set(seen),new Set(['academy','market','workshop']));
 assert.deepEqual(cupGold,{academy:2,workshop:2,market:3});
 const event=getRun(),p=event.trainers[0];select.value='catching';select.onchange();
 assert.equal(event.focus,'development');assert.equal(game.sideSupplyFocus('tactics'),'catching');
 event.challenges=[{key:'formation',count:0},{key:'equipment',count:0},{key:'veterans',count:0}];
 p.units=[mon('Abra',front),mon('Bulbasaur',back),mon('Eevee')];p.units[2].items=['Claw'];
 const credit=(round,ticks=2)=>{game.setRound(round);game.creditBoardChallenge(event,ticks);};
 credit(3);credit(5,0);credit(8);credit(11);assert.equal(event.challenges[0].count,0);
 credit(5);credit(5);assert.equal(event.challenges[0].count,1);credit(6);credit(7);assert.equal(event.challenges[0].count,2);
 p.units[0].items=['Wing'];credit(12);assert.equal(event.challenges[1].count,0,'Bench items do not qualify');
 p.units[1].items=['Claw'];credit(13);credit(14);assert.equal(event.challenges[1].count,2);
 p.units[0].star=2;credit(19);assert.equal(event.challenges[2].count,0);
 p.units[2].position={x:2,y:6};credit(20);credit(21);assert.equal(event.challenges[2].count,2);
 assert(game.boardChallenges.synergy.met([mon('Venusaur',back,3),mon('Blastoise',front,3),mon('Charizard',{x:1,y:6},3)]));
 assert(!game.boardChallenges.synergy.met([]));
 for(const stage of [5,19]){
  game.setRound(stage);game.beginChoices();const choice=event.choice;assert.equal(choice.kind,'augment');
  assert(choice.offers.every(([name])=>!p.augments.includes(name)));
  const [name]=choice.offers[0];p.augments.push(name);event.choice=null;
 }
 assert.equal(new Set(p.augments).size,2);assert(event.trainers.slice(1).every(t=>new Set(t.augments).size===2));
 const received=[];context.giveArenaItem=(...item)=>received.push(item);
 const paid=context.wildProgress.coins;game.awardPlacement(event);game.awardPlacement(event);
 assert(context.wildProgress.coins>paid);
 assert.deepEqual(received.filter(([kind,name])=>kind==='capsules' || name.startsWith('IV ')).map(x=>JSON.stringify(x)).sort(),
  [['vitamins','IV Reducer',1],['vitamins','IV Booster',2],['capsules','Ability Capsule',1]].map(x=>JSON.stringify(x)).sort());
 console.log('Tactics cups, double augments, unique board challenges, actual field requirements and main-bag placement bonuses passed.');
};
