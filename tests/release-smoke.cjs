const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const html=read('index.html');
const candyCode=html.slice(html.indexOf('const experienceCandies='),html.indexOf('const trainingItems='));
const manifest=JSON.parse(read('version.json'));
assert.match(manifest.version,/^\d+\.\d+\.\d+$/);
const residualCode=html.slice(html.indexOf('function raidResidualDamage('),html.indexOf('const updateLogEntries='));
const residual=new Function(residualCode+'return raidResidualDamage;')();
assert.equal(residual({max:10000,masterRaidPhase:2},312),65);
assert.equal(residual({max:10000,masterRaidPhase:3},20),20);
assert.equal(residual({max:10000},312),312);
const chargeCode=html.slice(html.indexOf('function dashChargesLeft('),html.indexOf('function tryDashDodge('));
const {dashChargesLeft,defendChargesLeft,defendDamage}=new Function('isExhausted','effectiveHeldItem',chargeCode+
 'return {dashChargesLeft,defendChargesLeft,defendDamage};')(actor=>actor.exhausted,actor=>actor.heldItem);
assert.equal(dashChargesLeft({},0),3);
assert.equal(dashChargesLeft({dashRecharge:[3,4,5]},2),0);
assert.equal(dashChargesLeft({dashRecharge:[3,4,5]},3),1);
assert.equal(dashChargesLeft({dashRecharge:[3,4,5]},5),3);
const defender={hp:100,max:100};
assert.equal(defendDamage(defender,10,0),10);
assert.equal(defendDamage(defender,40,0),20);
assert.equal(defendDamage(defender,10,.99),5);
assert.equal(defendChargesLeft(defender,.99),2);
assert.equal(defendDamage(defender,10,1),10);
assert.equal(defendDamage(defender,40,1),20);
assert.equal(defendDamage(defender,40,2),20);
assert.equal(defendDamage(defender,40,3),40);
assert.equal(defendChargesLeft(defender,5),1);
assert.equal(defendDamage(defender,40,5),20);
assert.equal(defendDamage({hp:100,max:100,exhausted:true},40,0),60);
const dashCode=html.slice(html.indexOf('function tryBattleDash('),html.indexOf('function battleActorId('));
const dash=new Function('dashChargesLeft','clock','pendingCasts','canvas','clamp','movementClearance','pmdDirection','effects','actorSpriteVariant','arenaMap','effectiveHeldItem',
 dashCode+'return tryBattleDash;')(dashChargesLeft,0,[],{width:960,height:480},
 (x,lo,hi)=>Math.max(lo,Math.min(hi,x)),()=>1,()=>0,[],()=>null,null,actor=>actor.heldItem);
const dasher={x:100,y:100,motionTicks:0};
assert(dash(dasher,0,90,point=>point.x>=185));
assert.equal(dasher.x,190);
assert(!dash(dasher,0,90,()=>false));
assert(dash(dasher,0,90,()=>true));
assert(!dash(dasher,0,90,()=>true),'Save the last charge for evasion');
assert(dash(dasher,0,90,()=>true,true));
const labels=[];
const impactCode=html.slice(html.indexOf('function drawImpactLabel('),html.indexOf('let previous;',html.indexOf('function drawImpactLabel(')));
const impact=new Function('ctx',impactCode+'return drawImpactLabel;')({
 save(){},restore(){},strokeText(){},fillText(label){labels.push(label);}
});
impact({dashSprite:{name:'Pikachu'},life:.3});
impact({move:'Quick Attack',life:.3,damage:12,multiplier:1});
assert.deepEqual(labels,[12]);
const backHitCode=html.slice(html.indexOf('function isBackHit('),html.indexOf('function tacticalMoveScore('));
const backHit=new Function(backHitCode+'return isBackHit;')();
const facingRight={x:100,y:100,direction:2};
assert(backHit({x:90,y:100},facingRight));
assert(!backHit({x:110,y:100},facingRight));
assert(!backHit({x:100,y:110},facingRight));
const hazardCode=html.slice(html.indexOf('function roamingCenter('),html.indexOf('function dodgeSkill('));
const {hazardHits,warrantsDash}=new Function('canvas','clamp','inSkill','bodyRadius',
 'moveCatalog','battleDamage','effectiveness','moveRules',hazardCode+'return {hazardHits,warrantsDash};')(
 {width:960,height:480},(x,lo,hi)=>Math.max(lo,Math.min(hi,x)),
 (point,center,radius)=>Math.hypot(point.x-center.x,point.y-center.y)<=radius,
 ()=>10,{Surf:['Water',90,100,0,false],Tackle:['Normal',40,100,0,false]},
 (_,__,power)=>power,()=>1,()=>({category:1}));
const vortex={roaming:true,center:{x:100,y:100},heading:0,remaining:2,turnIn:.5,radius:20};
assert(hazardHits({x:145,y:100},vortex,.3));
assert(!hazardHits({x:100,y:145},vortex,.3));
assert(warrantsDash({hp:200},{move:'Surf',radius:70},.2));
assert(!warrantsDash({hp:200},{move:'Surf',radius:70},.8));
assert(!warrantsDash({hp:200,max:400},{move:'Tackle'},.2));
assert(warrantsDash({hp:20},{move:'Tackle'},.2));
const migrations=fs.readdirSync(path.join(__dirname,'../supabase/migrations'));
assert(migrations.length>0);
const migrationVersions=migrations.map(file=>{
 assert.match(file,/^\d{14}_[a-z0-9_]+\.sql$/);
 return file.slice(0,14);
});
assert.equal(new Set(migrationVersions).size,migrationVersions.length);
for(const file of ['index.html','local-test/PokeArena_Local_Test.html']){
 const markup=read(file);
 assert.equal(markup.match(/const updateLogEntries\s*=\s*\[\s*\{version:'([^']+)'/)?.[1],manifest.version,file);
 for(const [,asset] of markup.matchAll(/<script src="([^"?]+)\?v=[^"]+"/g)){
  assert(fs.existsSync(path.join(__dirname,'..',path.dirname(file),asset)),asset);
 }
 for(const [,script] of markup.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
  if(script.trim())new vm.Script(script,{filename:file});
 }
}
for(const file of ['cloud.js','multiplayer.js','tactics.js'])new vm.Script(read(file),{filename:file});
const data=html.split('\n').filter(line=>/^const (dex|dexStats|typeChart)\s*=/.test(line)).join('\n');
class Node {
 constructor(tag,text,classes=''){this.tagName=tag;this.textContent=text;this.className=classes;this.children=[];this.style={setProperty(){}};this.dataset={};}
 append(...children){this.children.push(...children);}
 prepend(...children){this.children.unshift(...children);}
 replaceChildren(...children){this.children=children;}
 setAttribute(){}
 addEventListener(){}
 get classList(){return {add(){},toggle(){}};}
 get firstElementChild(){return this.children[0];}
}
const nodes=new Map();
const element=(...args)=>new Node(...args);
const byId=id=>{if(!nodes.has(id))nodes.set(id,element('div'));return nodes.get(id);};
let seed=0x13579bdf;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const context=vm.createContext({
 byId,element,window:{},phase:'home',wildProgress:{owned:{},copies:{}},maximumBattleSpeed:()=>2,earnedCoins:coins=>coins,showScreen(){},setInterval(){},clearInterval(){},
 experienceCandyName:new Function(candyCode+'return experienceCandyName;')(),
 idlePokemonPortrait:()=>element('canvas'),getSprite:()=>({image:{}}),
 types:{},moveColors:{},pmdDirection:()=>0,pmdMotion:()=>null,checkGameVersion(){},structuredClone,openMenu(){},
 drawRogueChoices:(list,n)=>list.slice(0,n),
 Math:Object.assign(Object.create(Math),{random})
});
context.button=(label,onclick,disabled)=>Object.assign(element('button',label),{onclick,disabled});
const source=read('tactics.js');
const auditExports='globalThis.audit={drawPoolCard,roll,releaseShop,buy,field,teamSize,planAI,beginChoices,result,tacticsCoinRate,creditTacticsRound,makeTrainer,start,battle,tick,outcome,combatTicks,combatStepMs,roster,rarities,combatRole,evolutionFamilies,collectionTraits,unitTraits,signatures,expandedSignatures,signatureEffects,signatureEffectText,extraSignatureText,traits,familyOf,stageLabel,openingRound,wildRound,megaRound,augmentRound,carouselRound,carouselOffers,draftCarousel,awardPlacement,megaRewardTier,finalRound,neutralTrainer,completeNeutral,grantTowerWard,receiveDamage,heal,equip,sell,ignite,fusionPlan,applyFusion,setRound:round=>{run.round=round;},getRun:()=>run};';
new vm.Script(data+'\n'+source.replace(/\}\)\(\);\s*$/,auditExports+'})();'),{filename:'tactics.js'}).runInContext(context);
const a=context.audit;
byId('home-tactics').onclick();
byId('tactics-content').children.find(node=>node.textContent==='Start match').onclick();
assert.equal(a.getRun().trainers.length,8);
assert(a.getRun().trainers.every(trainer=>trainer.gold===2));
assert.equal(byId('tactics-content').children[0].className,'tactics-layout');
assert(context.window.hasActiveTacticsRun());
for(const stage of [2,3,4,5,6]){
 const pool=structuredClone(a.getRun().pool);
 const before=[...pool.values()].reduce((sum,entry)=>sum+entry.copies,0);
 const offers=a.carouselOffers(pool,stage);
 assert.equal(offers.length,9);
 assert.equal(new Set(offers.map(offer=>offer.slot)).size,9);
 assert(offers.every(offer=>offer.unit.items[0]===offer.item));
 assert.equal(before-[...pool.values()].reduce((sum,entry)=>sum+entry.copies,0),
  offers.reduce((sum,offer)=>sum+offer.unit.poolCopies,0));
 if(stage===5)assert(offers.every(offer=>offer.ball==='Master Ball' && offer.tier===5));
 const drafter=a.makeTrainer('Carousel tester');
 drafter.units=[];
 assert(a.draftCarousel(drafter,offers[0]));
 assert.equal(drafter.units[0].items[0],offers[0].item);
}

const trainer=a.getRun().trainers[0];
const starter=trainer.units[0];
assert(a.equip(trainer,starter,'Claw'));
assert(a.equip(trainer,starter,'Claw'));
assert(a.sell(trainer,starter));
assert.equal(trainer.items[0],'Razor Claws');

const originalUnits=trainer.units;
trainer.units=[
 ...Array.from({length:9},()=>({name:'Pikachu',star:1,position:null})),
 ...Array.from({length:3},(_,x)=>({name:'Pikachu',star:1,position:{x,y:4}})),
 {name:'Pikachu',star:1,position:null,items:['Captain’s Crown']}
];
const captain=trainer.units.at(-1),goldBefore=trainer.gold;
assert.equal(a.sell(trainer,captain),false);
assert.equal(trainer.units.length,13);
assert.equal(trainer.gold,goldBefore);
assert(a.sell(trainer,trainer.units[0]));
assert(a.sell(trainer,captain));
assert.equal(trainer.units.filter(unit=>unit.position===null).length,9);
trainer.units=originalUnits;
const fusionTrainer=a.makeTrainer('Fusion test');
fusionTrainer.units=[
 {name:'Pikachu',star:1,position:{x:0,y:4},items:['Captain’s Crown']},
 {name:'Charmander',star:1,position:{x:1,y:4}},
 {name:'Squirtle',star:1,position:{x:2,y:4}},
 {name:'Pikachu',star:1,position:null,items:['Mirage Goggles']}
];
const fusion=a.fusionPlan(fusionTrainer,{name:'Pikachu',star:1,position:null});
assert.deepEqual(Array.from(fusion.displaced,unit=>unit.name),['Squirtle']);
assert.deepEqual(Array.from(fusion.returned),['Captain’s Crown']);
assert.equal(fusionTrainer.units.filter(unit=>unit.position!==null).length,3);
a.applyFusion(fusionTrainer,fusion);
assert.equal(fusionTrainer.units.filter(unit=>unit.position!==null).length,2);
const roleCounts=new Map();
for(const tier of a.roster){
 const counts=new Map();
 for(const name of tier){
  const role=a.combatRole(name);
  counts.set(role,(counts.get(role) ?? 0)+1);
  roleCounts.set(role,(roleCounts.get(role) ?? 0)+1);
 }
 assert.equal(counts.size,6);
 assert(Math.max(...counts.values())-Math.min(...counts.values())<=1);
}
assert.deepEqual([...roleCounts.values()].sort((a,b)=>a-b),[20,21,21,21,21,21]);
assert.equal(a.combatRole('Squirtle'),a.combatRole('Blastoise'));
assert.equal(a.roster.flat().length,125);
assert.equal(Object.keys(a.evolutionFamilies).length,110);
const fuseFamily=(root,star,branch)=>{
 const squad=a.makeTrainer('Evolution check');
 const path=a.evolutionFamilies[root]?.[branch];
 const name=star===1?root:(path?.[0] ?? root);
 const make=()=>({name,star,branch,position:null});
 squad.units=[make(),make()];
 const plan=a.fusionPlan(squad,make());
 assert.equal(plan.units.length,1);
 assert.equal(a.familyOf(plan.units[0]),root);
 return plan.units[0];
};
assert.equal(fuseFamily('Charmander',1,0).name,'Charmeleon');
assert.equal(fuseFamily('Charmander',2,0).name,'Charizard');
const gardevoir=fuseFamily('Ralts',2,0),gallade=fuseFamily('Ralts',2,1);
assert.equal(gardevoir.name,'Gardevoir');
assert.equal(gallade.name,'Gallade');
assert.equal(a.traits([gardevoir])['Mind Ward'],1);
assert.equal(a.traits([gallade])['Blade Guard'],1);
assert.equal(fuseFamily('Wurmple',1,1).name,'Cascoon');
assert.equal(fuseFamily('Eevee',2,1).name,'Jolteon');
assert.equal(fuseFamily('Mewtwo',2,0).name,'Mewtwo');
assert.equal(a.traits([{name:'Charmander'},{name:'Charmeleon'}]).Warband,1);
assert.equal(a.traits([{name:'Charmander'},{name:'Charmeleon'}]).Fire,undefined);
assert.equal(a.traits([{name:'Squirtle',items:['Marksmen Emblem']}]).Marksmen,1);

assert.equal(a.stageLabel(1),'1-1');
assert.equal(a.stageLabel(4),'1-4');
assert.equal(a.stageLabel(5),'2-1');
assert.equal(a.stageLabel(20),'4-2');
assert.equal(a.stageLabel(31),'5-6');
assert.equal(a.finalRound,123);
assert.equal(a.stageLabel(a.finalRound),'18-7');
assert(a.openingRound(1) && a.wildRound(2) && a.wildRound(4) && a.augmentRound(5));
for(let round=5;round<=a.finalRound;round++){
 const step=Number(a.stageLabel(round).split('-')[1]);
 assert.equal(a.carouselRound(round),step===4);
 assert.equal(a.megaRound(round),step===7);
}
for(const [round,tier] of [[11,2],[18,3],[25,4],[32,5],[123,5]]){
 a.setRound(round);
 assert.equal(a.megaRewardTier(round),tier);
 assert.match(a.neutralTrainer().units[0].raidForm,/^Mega /);
 const winner=a.makeTrainer('Test winner');
 const loser=a.makeTrainer('Test loser');
 const award=a.completeNeutral(winner,true);
 a.completeNeutral(loser,false);
 assert.equal(winner.items.length,2);
 assert.equal(winner.gold-loser.gold,15);
 assert.equal(winner.units.length,1);
 assert.equal(a.rarities.get(winner.units[0].name)+1,tier);
 assert.match(award,/Tier /);
 assert.equal(loser.units.length,0);
 assert.equal(loser.items.length,0);
}
a.setRound(1);

for(const [region,...forms] of [
 ['Johto','Chikorita','Quilava','Feraligatr'],['Hoenn','Sceptile','Torchic','Swampert'],
 ['Sinnoh','Torterra','Chimchar','Prinplup'],['Unova','Servine','Emboar','Oshawott'],
 ['Kalos','Chespin','Delphox','Greninja'],['Alola','Dartrix','Incineroar','Primarina'],
 ['Galar','Rillaboom','Scorbunny','Inteleon'],['Paldea','Meowscarada','Crocalor','Quaxly']
]){
 assert.equal(a.traits(forms.map(name=>({name})))[region+' Partners'],3);
}
assert.equal(a.traits([{name:'Rowlet'},{name:'Dartrix'}])['Alola Partners'],1);
const towerParty=a.makeTrainer('Tower test');
towerParty.units=['Lugia','Ho-Oh','Pikachu'].map((name,x)=>({name,star:1,position:{x,y:4}}));
const towerUnits=a.battle(towerParty,a.makeTrainer('Opponent'));
assert.equal(towerUnits[0].gear.towerWard,.12);
a.grantTowerWard(towerUnits[0],towerUnits);
assert.equal(towerUnits[2].signatureShield,Math.round(towerUnits[2].max*.12));
towerUnits[2].signatureShield=0;
a.grantTowerWard(towerUnits[1],towerUnits);
assert.equal(towerUnits[2].signatureShield,0);

const rosterForms=new Set([...a.roster.flat(),...Object.values(a.evolutionFamilies).flat(2),'Rattata','Zubat','Geodude']);
const moveNames=new Set(), effectSets=new Set();
for(const name of rosterForms){
 const move=a.signatures[name]?.[0] ?? a.expandedSignatures[name]?.[0];
 const effects=(a.signatureEffects[name] ?? a.expandedSignatures[name]?.[1] ?? '').split(' ');
 assert(move && move!=='Signature Skill' && !moveNames.has(move),name);
 moveNames.add(move);
 const key=[...effects].sort().join(' ');
 assert(!effectSets.has(key),name+' shares '+key);
 effectSets.add(key);
 for(const effect of effects)assert(a.signatureEffectText[effect] || a.extraSignatureText[effect],effect);
}
assert.equal(a.expandedSignatures.Tinkaton[0],'Gigaton Hammer');
assert.equal(a.expandedSignatures.Decidueye[0],'Spirit Quill Snare');

const branchTrainer=a.makeTrainer('Branch modal');
const kirlia={name:'Kirlia',family:'Ralts',star:2,position:null,branch:0};
branchTrainer.units=[{...kirlia},{...kirlia}];
const pathPlan=a.fusionPlan(branchTrainer,{...kirlia},1);
assert.equal(pathPlan.upgrades[0].branchStep,true);
assert.equal(pathPlan.units[0].name,'Gallade');
const cascoon={name:'Cascoon',family:'Wurmple',star:2,position:null,branch:1};
branchTrainer.units=[{...cascoon},{...cascoon}];
const lockedPath=a.fusionPlan(branchTrainer,{...cascoon},0);
assert.equal(lockedPath.upgrades[0].branchStep,false);
assert.equal(lockedPath.units[0].name,'Dustox');

const noOrigin=[];
for(const name of a.roster.flat()){
 for(const [,form] of a.evolutionFamilies[name] ?? [[name,name]]){
  if(![...a.unitTraits({name:form,star:3})].some(trait=>!a.collectionTraits[trait].role))noOrigin.push(form);
 }
}
assert.deepEqual(noOrigin,[]);
assert.equal(a.traits([{name:'Tyranitar'},{name:'Gigalith'}]).Sandstorm,2);
assert.equal(a.traits([{name:'Tyranitar'},{name:'Larvitar'}]).Sandstorm,1);
const chaseTeam=a.makeTrainer('Chase');
chaseTeam.units=['Mewtwo','Slaking','Porygon-Z'].map((name,x)=>({name,star:3,position:{x,y:4}}));
const chaseEnemy=a.makeTrainer('Chase enemy');
chaseEnemy.units=[{name:'Rayquaza',star:2,position:{x:2,y:4}}];
const chase=a.battle(chaseTeam,chaseEnemy);
assert.equal(chase[0].geneticTarget,chase[3]);
assert(chase[1].truantAsleep);
assert(chase[2].glitchRole);
assert(chase[3].gear.airLock);

const afflicted={hp:100,elapsed:500,woundUntil:9000};
a.ignite(afflicted,5,{});
assert.equal(afflicted.burnUntil,5500);
assert.equal(afflicted.woundUntil,9000);
assert.equal(afflicted.nextBurn,1500);

const cloud=read('cloud.js');
const keys=cloud.slice(0,cloud.indexOf('const cloudRedirect'));
const validateStart=cloud.indexOf('function validateArenaSave');
const validateEnd=cloud.indexOf('let cloudAccount',validateStart);
const storage=new Map();
const localStorage={
 getItem:key=>storage.get(key) ?? null,
 setItem:(key,value)=>storage.set(key,value),
 removeItem:key=>storage.delete(key)
};
const backups=new Function('localStorage','playerSaveKey',keys+cloud.slice(validateStart,validateEnd)+
 'return {arenaSaveKeys,validateArenaSave,restoreArenaSave}')(localStorage,key=>key);
const backup={version:1,entries:Object.fromEntries(backups.arenaSaveKeys.map(key=>[key,null]))};
backup.entries['pokemon-arena-team']='["Pikachu"]';
backup.entries['pokemon-arena-starter']='{"ign":"Smoke test","name":"Pikachu"}';
backups.restoreArenaSave(backup);
assert.equal(storage.get('pokemon-arena-team'),'["Pikachu"]');
const invalid=structuredClone(backup);
invalid.entries['pokemon-arena-team']='{}';
assert.throws(()=>backups.restoreArenaSave(invalid),/invalid team/);
assert.equal(storage.get('pokemon-arena-team'),'["Pikachu"]');

const updatedBackup=structuredClone(backup);
updatedBackup.version=2;
updatedBackup.entries['pokemon-arena-gym-badges/master']='["brock"]';
updatedBackup.entries['pokemon-arena-gym-badges/clean-records']='{"misty":true}';
backups.restoreArenaSave(updatedBackup);
assert.equal(storage.get('pokemon-arena-gym-badges/master'),'["brock"]');
assert.equal(storage.get('pokemon-arena-gym-badges/clean-records'),'{"misty":true}');
backups.restoreArenaSave(backup);
assert.equal(storage.get('pokemon-arena-gym-badges/master'),'["brock"]');

const captureSettings={autoCaptureBall:6,autoCaptureFallback:'standard',reservePremiumBalls:true,
 autoCaptureRare:false,autoCaptureRareBall:6,autoCaptureRareFallback:-1,balls:[1,0,0,0,0,0,1,1,1]};
const captureCode=html.slice(html.indexOf('function autoCaptureChoice('),html.indexOf('function renderAutoOptions('));
const chooseBall=new Function('wildProgress','ballTypes','isLegendaryEncounter',captureCode+'return autoCaptureChoice')(
 captureSettings,Array.from({length:9},()=>({})),name=>name==='Mewtwo');
assert.equal(chooseBall({name:'Pikachu'}),0);
assert.equal(chooseBall({name:'Pikachu',profile:{shiny:true}}),6);
assert.equal(chooseBall({name:'Mewtwo'}),-1,'Rare auto-capture requires its own toggle');
captureSettings.autoCaptureRare=true;
assert.equal(chooseBall({name:'Mewtwo'}),6,'Use the configured rare preferred ball');
captureSettings.balls[6]=0;
assert.equal(chooseBall({name:'Mewtwo'}),-1,'An empty preferred ball with Ask me fallback must stop');
captureSettings.autoCaptureRareFallback=7;
assert.equal(chooseBall({name:'Mewtwo'}),7,'Use the configured rare fallback ball');
captureSettings.balls[7]=0;
assert.equal(chooseBall({name:'Mewtwo'}),-1,'Never silently spend an unconfigured Master Ball');
captureSettings.balls[6]=captureSettings.balls[7]=1;
captureSettings.autoCaptureRare=false;
assert.equal(chooseBall({name:'Mewtwo'}),-1,'Turning rare capture off must take effect immediately');
captureSettings.autoCaptureFallback='none';
assert.equal(chooseBall({name:'Pikachu'}),-1);

const passCode=html.slice(html.indexOf('const passTierXP='),html.indexOf('let selectedPassReward='));
const progress={battlePass:{xp:0,claimed:[]},balls:[0]};
const pass=new Function('wildProgress','ballTypes','saveWildProgress',passCode+'return {recordBattlePass,claimPassReward}')(
 progress,[{name:'Great Ball'}],()=>{});
assert.match(pass.recordBattlePass({battles:1,wins:1,raidWins:1},'raid-1'),/Clear a co-op raid/);
assert.equal(pass.recordBattlePass({battles:1,wins:1,raidWins:1},'raid-1'),'');
pass.recordBattlePass({battles:3,wins:3});
pass.claimPassReward(0,false);
pass.claimPassReward(0,false);
assert.equal(progress.balls[0],5);
const ballCode=html.slice(html.indexOf('const ballTypes='),html.indexOf('function battleBallDrops'));
const catchChanceCode=html.slice(html.indexOf('function catchChance('),html.indexOf('let repeatTimer='));
const {balls,migrate,catchChance}=new Function('isLegendaryEncounter',ballCode+catchChanceCode+
 'return {balls:ballTypes,migrate:migrateBallInventory,catchChance}')(()=>true);
assert.deepEqual(migrate([1,2,3,4,5,6,7,8]),[1,2,3,4,5,6,7,0,8]);
assert.equal(catchChance(balls[6],{name:'Mewtwo'}),.5);
assert.equal(catchChance(balls[7],{name:'Mewtwo'}),.75);
assert.equal(catchChance(balls[8],{name:'Mewtwo'}),1);
const rewards=new Function(passCode+'return passRewards')();
assert.equal(rewards.length,50);
assert.deepEqual(rewards.flatMap(([,name],index)=>name==='Master Ball'?[index+1]:[]),[50]);
for(const [index,coins] of [8000,6000,4500,3500,2000,1250,500,250].entries()){
 const received=[];
 context.wildProgress={coins:0};
 context.giveArenaItem=(...item)=>received.push(item);
 context.saveWildProgress=()=>{};
 context.earnedCoins=base=>base;
 const match={place:index+1};
 a.awardPlacement(match);
 a.awardPlacement(match);
 assert.equal(context.wildProgress.coins,coins);
 assert.equal(received.length,[2,3,2,3,2,2,1,1][index]);
}
const lateMatch={place:4,completedStage:9};
const lateItems=[];
context.wildProgress={coins:0};
context.giveArenaItem=(...item)=>lateItems.push(item);
context.earnedCoins=base=>base*2;
a.awardPlacement(lateMatch);
a.awardPlacement(lateMatch);
assert.equal(context.wildProgress.coins,7000);
assert.deepEqual(lateItems.find(([,name])=>name==='EXP Candy 250'),['vitamins','EXP Candy 250',4]);
assert.equal(Math.ceil(a.combatTicks*a.combatStepMs/1000),60);


const levelCode=html.slice(html.indexOf('function experienceNeeded('),html.indexOf('}',html.indexOf('function experienceNeeded('))+1);
const candyActions=html.slice(html.indexOf('function useExperienceCandy('),html.indexOf('let selectedWild='));
const candyInventory={vitamins:{'Rare Candy':2,'EXP Candy 100':1,'EXP Candy 250':1,'EXP Candy 500':1},held:{Pikachu:'Lucky Egg'}};
const pika={level:20,xp:30};
const candy=new Function('wildProgress','ownedPokemon','stoneTarget','levelEvolutions','dex','saveWildProgress','tryArenaEvolution',
 candyCode+levelCode+candyActions+'return {useExperienceCandy,battleExperience,experienceCandyName,experienceCandyXP,gainWildExperience}')(
 candyInventory,()=>pika,()=>null,{}, {Pikachu:[25]},()=>{},()=>[]);
assert.equal(candy.battleExperience('Pikachu',100),200);
candy.useExperienceCandy('Pikachu','EXP Candy 100');
assert.deepEqual(pika,{level:20,xp:130});
candy.useExperienceCandy('Pikachu','Rare Candy');
assert.deepEqual(pika,{level:21,xp:130});
assert.equal(candy.experienceCandyName('EXP Candy 100'),'EXP Candy S');
assert.equal(candy.experienceCandyName('EXP Candy 250'),'EXP Candy M');
assert.equal(candy.experienceCandyName('EXP Candy 500'),'EXP Candy L');
const requiredXP=new Function(levelCode+'return experienceNeeded;')();
for(const [level,xp] of [[50,3300],[60,4997],[70,8109],[80,13221],[90,33366],[99,44552]])assert.equal(requiredXP(level),xp);
for(let level=1;level<100;level++)assert(requiredXP(level)<requiredXP(level+1));
pika.level=99;pika.xp=0;
candy.useExperienceCandy('Pikachu','EXP Candy 500');
assert.equal(pika.xp,2000);
assert.equal(candyInventory.vitamins['EXP Candy 500'],0);
assert.equal(candy.experienceCandyXP('EXP Candy 250',99),1000);
assert.equal(candy.experienceCandyXP('EXP Candy 100',99),500);
pika.level=50;pika.xp=4000;
candy.gainWildExperience('Pikachu',0);
assert.deepEqual(pika,{level:51,xp:700});
pika.level=100;
candy.useExperienceCandy('Pikachu','Rare Candy');
assert.equal(candyInventory.vitamins['Rare Candy'],1);
const shieldProvider={};
const shielded={hp:50,max:50,signatureShield:6,signatureShieldUntil:2000,elapsed:0,shieldProvider,gear:{},manaLock:0,mana:0,manaOnDamage:0};
assert.equal(a.receiveDamage(shielded,10),4);
assert.equal(shieldProvider.shieldedDamage,6);
a.heal(shielded,20,shieldProvider);
assert.equal(shieldProvider.healingDone,4);

const multiplayer=read('multiplayer.js');
const retryStart=multiplayer.indexOf(' function onlineRetryMessage(');
const retry=new Function(multiplayer.slice(retryStart,multiplayer.indexOf(' let generation=',retryStart))+'return onlineRetryMessage')();
assert.match(retry(new TypeError('Failed to fetch'),true),/^Connection lost/);
assert.match(retry(new TypeError("Cannot read properties of undefined (reading 'slice')"),true),/^Online battle error/);
assert.match(retry(new Error('Network unavailable'),false),/^Connection lost/);
const weatherTrainer=a.makeTrainer('Weather');
weatherTrainer.units=[{name:'Kyogre',star:1,position:{x:0,y:7}}];
const weatherEnemy=a.makeTrainer('Enemy');
weatherEnemy.units=[{name:'Squirtle',star:1,position:{x:0,y:7}}];
const weatherUnits=a.battle(weatherTrainer,weatherEnemy);
const [storm,victim]=weatherUnits;
const stormPulse=Math.round(victim.max*.015);
victim.signatureShield=stormPulse;victim.signatureShieldUntil=5000;
storm.wait=victim.wait=10000;

for(let i=0;i<9;i++)a.tick(weatherUnits);
assert.equal(weatherUnits[1].signatureShield,0);
assert.equal(weatherUnits[0].damageDealt ?? 0,0);
for(let i=0;i<9;i++)a.tick(weatherUnits);
assert.equal(weatherUnits[0].damageDealt,stormPulse);
assert.equal(weatherUnits[1].damageTaken,stormPulse);

const roster=a.roster.flat();
const report=new Map();
let rounds=0, draws=0, totalTicks=0;
a.setRound(11);
for(const [index,name] of roster.entries()){
 for(const star of [1,2,3]){
  const player=a.makeTrainer('Player');
  const enemy=a.makeTrainer('Enemy');
  const atStar=root=>star===1?root:a.evolutionFamilies[root]?.[0]?.[star-2] ?? root;
  player.units=[{name:atStar(name),star,position:{x:2,y:4}},{name:'Squirtle',star:1,position:{x:3,y:4}}];
  const rival=roster[(index+19)%roster.length];
  enemy.units=[{name:atStar(rival),star,position:{x:3,y:4}},{name:'Charmander',star:1,position:{x:2,y:4}}];
  const units=a.battle(player,enemy);
  let ticks=0, firstCast=null;
  for(;ticks<a.combatTicks && a.outcome(units)===null;ticks++){
   a.tick(units,ticks*a.combatStepMs);
   if(firstCast===null && units[0].lastCast)firstCast=ticks*a.combatStepMs/1000;
  }
  rounds++;
  totalTicks+=ticks;
  if(!a.outcome(units))draws++;
  for(const unit of units){
   assert(Number.isFinite(unit.hp) && unit.hp>=0 && unit.hp<=unit.max);
   assert(Number.isFinite(unit.mana) && unit.mana>=0 && unit.mana<=60);
  }
  const unit=units[0];
  const key='Cost '+(a.rarities.get(name)+1)+' · '+unit.role+' · '+star+'★';
  const stats=report.get(key) ?? {samples:0,wins:0,damage:0,healed:0,shielded:0,cast:0,castSamples:0,seconds:0};
  stats.samples++;stats.wins+=Number(a.outcome(units)>0);
  stats.damage+=unit.damageDealt ?? 0;stats.healed+=unit.healingDone ?? 0;stats.shielded+=unit.shieldedDamage ?? 0;
  stats.seconds+=ticks*a.combatStepMs/1000;
  if(firstCast!==null){stats.cast+=firstCast;stats.castSamples++;}
  report.set(key,stats);
 }
}
console.log('Start Match, item fusion and sale, Battle Pass idempotency, healing and shielding passed.');
console.log(rounds+' seeded rounds · '+draws+' draws/timeouts · '+(totalTicks*a.combatStepMs/rounds/1000).toFixed(1)+'s mean duration');
if(process.argv.includes('--balance'))console.table([...report].map(([group,s])=>({
 group,matches:s.samples,winPct:Math.round(s.wins/s.samples*100),damage:Math.round(s.damage/s.samples),
 heal:Math.round(s.healed/s.samples),shield:Math.round(s.shielded/s.samples),
 firstCast:s.castSamples?+(s.cast/s.castSamples).toFixed(1):null,seconds:+(s.seconds/s.samples).toFixed(1)
})));

async function verifyRaidRetry(){
 const start=multiplayer.indexOf('  let retryCount=0, retryButton=null');
 const pollStart=multiplayer.indexOf('  async function poll() {',start);
 const end=multiplayer.indexOf('\n  if(!active.result)timer=setTimeout(poll,',pollStart);
 assert(start>=0 && end>start);
 const source=multiplayer.slice(start,end);
 const scheduled=[];
 const fakeTimeout=(callback,delay)=>{scheduled.push({callback,delay});return scheduled.length;};
 for(const stage of ['ready','combat','result']){
  scheduled.length=0;
  const status=element('p');
  const state={active:{id:'test',started:stage!=='ready',seats:[]},rendered:0,snapshots:0,fail:true};
  const rpc=async()=>{
   if(state.fail)throw new TypeError('Failed to fetch');
   return {...state.active,ready:true};
  };
  const combat=async()=>{
   if(state.fail)throw new TypeError('Failed to fetch');
   return {turn:1,battle:{},result:stage==='result'?'coop_win':null};
  };
  const poll=new Function('state','status','rpc','combat','onlineRetryMessage','element','setTimeout','clearTimeout',
   'let active=state.active, timer, displayedTurn=0,resumeMatchPolling=null;'+
   'const token=1,generation=1,submitting=false, live=false,lastPush=0,'+
   'phase=active.started?"online-battle":"raid-lobby",dialog={open:true},navigator={onLine:true};'+
   'const raidRpc=rpc,view=status,byId=()=>status,joinBattleChannel=()=>{},render=()=>{state.rendered++;};'+
   'const button=(text,onclick)=>({text,onclick,disabled:false});'+
   'const acceptBattle=packet=>{displayedTurn=packet.turn;state.snapshots++;active.result=packet.result;};'+
   source+'return poll;')(state,status,rpc,combat,retry,element,fakeTimeout,()=>{});
  await poll();await poll();await poll();
  assert.match(status.children[0].textContent,/Waiting for a fresh match snapshot/);
  assert.equal(status.children[1].text,'Request fresh snapshot');
  assert(scheduled.at(-1).delay>scheduled[0].delay);
  state.fail=false;
  await scheduled.pop().callback();
  if(stage==='ready')assert.equal(state.rendered,1);
  else assert.equal(state.snapshots,1);
  if(stage==='result')assert.equal(state.active.result,'coop_win');
 }
 console.log('Simulated raid reconnect passed during ready-up, combat and result.');
}

const manualCapture=html.slice(html.indexOf('function runWildResultOptions()'),html.indexOf('function renderWildResult()'));
const throws=[];
let rendered=0;
new Function('wildProgress','wildResult','phase','difficultyMenu','captureMenu','cancelWildRepeat','canCatchResult',
 'autoCaptureChoice','tryCatch','renderWildResult',manualCapture+'runWildResultOptions()')(
 {autoCapture:true,autoRepeat:true,balls:[1]}, {name:'Pikachu'}, 'wild-result', false, true,()=>{},()=>true,
 ()=>0,index=>throws.push(index),()=>rendered++);
assert.deepEqual(throws,[]);
assert.equal(rendered,1);

const draftTrainer=a.makeTrainer('Full bench');
draftTrainer.units=[
 {name:'Pikachu',star:1,position:null},{name:'Pikachu',star:1,position:null},
 ...Array.from({length:7},()=>({name:'Squirtle',star:1,position:null}))
];
assert.equal(a.fusionPlan(draftTrainer,{name:'Pikachu',star:1,position:null}).overflow,0);
assert.equal(a.fusionPlan(draftTrainer,{name:'Charmander',star:1,position:null}).overflow,1);
require('./pft-draft.cjs')(a,context);

async function verifyPendingRecovery(){
 const from=cloud.indexOf('const pendingSaveKey=');
 const markerCode=cloud.slice(from,cloud.indexOf('async function flushArenaSave(',from));
 const enter=cloud.slice(cloud.indexOf('async function enterCloudAccount('),cloud.indexOf("window.addEventListener('online'"));
 const actions=[];
 const browser={queueArenaSave:()=>actions.push('retry')};
 let serverRevision='original';
 const logic=new Function('localStorage','sessionStorage','window','claimArenaSession','fetchArenaSave',
  'restoreArenaSave','checkArenaLease','setInterval','clearInterval','saveState',
  'let cloudAccount="user",cloudRevision="original",dirty=true,onlineSaveId="user",leaseTimer;'+
  markerCode+enter+'return {updatePendingSave,enterCloudAccount,revision:()=>cloudRevision};')(
  localStorage,{getItem:()=>null,setItem(){}},browser,async()=>true,
  async()=>({updated_at:serverRevision,save_data:{}}),()=>actions.push('restore'),
  ()=>{},()=>{},()=>{},{});
 logic.updatePendingSave();
 for(const revision of ['original','newer']){
  serverRevision=revision;
  await logic.enterCloudAccount({}, {id:'user'},()=>{});
  assert.equal(logic.revision(),'original');
 }
 assert.deepEqual(actions,['retry','retry']);
}
async function verifyLoanerGear(){
 const {simulateOnline}=await import('../supabase/functions/arena-combat/engine.js');
 const playerEntries=choices=>({
  'pokemon-arena-wild-progress':JSON.stringify({
   owned:{Pikachu:{level:5},Squirtle:{level:5}},
   held:{Pikachu:'Leftovers'},items:{Leftovers:1},pvpLoaners:choices
  })
 });
 const match={
  id:'b2450000-0000-0000-0000-000000000000',mode:'ranked',format:1,host:'a',guest:'b',
  host_pick:['Pikachu','Squirtle'],guest_pick:['Pikachu'],
  host_entries:playerEntries({Pikachu:'Muscle Band',Squirtle:'Muscle Band'}),
  guest_entries:playerEntries({Pikachu:'Shell Bell'})
 };
 const serialized=JSON.stringify(simulateOnline(match,null,0,null,'host'));
 assert.equal((serialized.match(/"heldItem":"Muscle Band"/g) ?? []).length,1);
 assert.equal((serialized.match(/"heldItem":"Shell Bell"/g) ?? []).length,1);
 assert(!serialized.includes('"heldItem":"Leftovers"'));
}
async function verifyOpenArenaChase(){
 const {simulateOnline}=await import('../supabase/functions/arena-combat/engine.js');
 const match={id:'b2450000-0000-0000-0000-000000000000',mode:'unranked',format:1,
  host:'a',guest:'b',host_pick:['Mewtwo'],guest_pick:['Malamar'],host_entries:{},guest_entries:{}};
 const {state}=simulateOnline(match,null,0,null,'host');
 const [mewtwo]=state.allies;
 const [malamar]=state.enemies;
 Object.assign(mewtwo,{x:415,y:270,moves:['Night Shade','Sucker Punch','Confusion','Shadow Ball'],
  moveTimers:[0,0,0,0],moveCooldowns:[5,4,3,5],
  ai:{target:'Nearest',style:'Aggressive',position:'Melee',priorities:[1,2,1,1]}});
 Object.assign(malamar,{x:545,y:270});
 state.arenaMap.rocks=[{x:480,y:270,r:32,hp:32,maxHp:32,cover:true}];
 const result=simulateOnline(match,state,600,null,'host');
 assert.deepEqual(result.state.arenaMap.rocks,[],'Legacy reconnect snapshots discard pillars');
 assert(result.state.lastDamageClock>0,'Mewtwo and Malamar must exchange damage in an open arena');
}
async function verifyMasterRaids(){
 const {simulateOnline,onlineView}=await import('../supabase/functions/arena-combat/engine.js');
 for(const [mode,health] of [['coop_mega_master',8000],['coop_mega_2_master',13600],['coop_mega_3_master',16800]]){
  const match={id:'b2450000-0000-0000-0000-000000000000',mode,format:1,host:'a',
   raid_seats:[{uid:'a',pokemon:'Mewtwo',entries:{'pokemon-arena-wild-progress':JSON.stringify({owned:{Mewtwo:{level:100}}})}}]};
  let {state}=simulateOnline(match,null,0,null,'host');
  assert.equal(state.enemies[0].max,health);
  assert.equal(state.enemies[0].level,100);
  assert.equal(state.enemies[0].shiny,true);
  assert.equal(new Set(state.enemies[0].moves).size,16);
  assert.equal(state.arenaMap.phase,1);
  state.enemies[0].hp=health*.65;
  ({state}=simulateOnline(match,state,1,null,'host'));
  assert.equal(state.arenaMap.phase,1);
  state.enemies[0].hp=health*.64;
  ({state}=simulateOnline(match,state,90,null,'host'));
  assert.equal(state.arenaMap.phase,2);
  assert(state.arenaMap.meteors.every(m=>m.impact>state.clock && m.impact<=state.clock+1));
  assert.equal(onlineView(state,'host',mode).arenaMap.phase,2);
  state.enemies[0].hp=health*.24;
  ({state}=simulateOnline(match,state,1,null,'host'));
  assert.equal(state.arenaMap.phase,3);
  assert.equal(state.enemies[0].masterRaidPhase,3);
  assert.equal(state.arenaMap.meteors.length,0);
 }
}
async function verifyRaidTransform(){
 const {simulateOnline,onlineView}=await import('../supabase/functions/arena-combat/engine.js');
 const entries=ability=>({
  'pokemon-arena-profiles':JSON.stringify({132:{ivs:Array(6).fill(31),evs:Array(6).fill(0),pid:0,abilityOverride:ability}}),
  'pokemon-arena-moves':JSON.stringify({Ditto:['Transform']}),
  'pokemon-arena-wild-progress':JSON.stringify({owned:{Ditto:{level:100}}})
 });
 for(const raid of ['coop_mega','coop_mega_2','coop_mega_3'])for(const master of [false,true]){
  const mode=raid+(master?'_master':''),match={id:'d1770000-0000-4000-8000-000000000001',mode,format:1,host:'a',
   raid_seats:[{uid:'a',pokemon:'Ditto',entries:entries('Imposter')},{uid:'b',pokemon:'Ditto',entries:entries('Limber')}]};
  let {state}=simulateOnline(match,null,0,null,'host');
  const bossMoves=[...state.enemies[0].moves],expected=bossMoves.slice(0,4);
  assert.equal(bossMoves.length,master?16:8,mode);
  for(let step=0;step<40 && state.allies.some(actor=>!actor.battleTransform);step++){
   ({state}=simulateOnline(match,JSON.parse(JSON.stringify(state)),15,null,'host'));
  }
  for(const actor of state.allies){
   assert.equal(actor.originalName,'Ditto',mode+' '+actor.side);assert.deepEqual(actor.moves,expected);
   assert.deepEqual(actor.moveCooldowns,state.enemies[0].moveCooldowns.slice(0,4));assert.equal(actor.moveTimers.length,4);
   const view=onlineView(state,actor.side,mode);
   assert.deepEqual(view.actors.find(a=>a.onlineId===actor.onlineId).moves,expected);
   assert.deepEqual(view.actors.find(a=>a.side==='boss').moves,bossMoves);
  }
  // A room created by the previous version may already have copied and queued extra slots.
  const legacy=JSON.parse(JSON.stringify(state)),ditto=legacy.allies[1],boss=legacy.enemies[0];
  ditto.moves=[...bossMoves];ditto.moveCooldowns=[...boss.moveCooldowns];
  ditto.moveTimers=bossMoves.map((_,i)=>i+.25);ditto.moveCooldownStarts=bossMoves.map((_,i)=>100+i);
  const cast=(actor,slot)=>({actor:actor.onlineId,move:actor.moves[slot],cooldownSlot:slot});
  legacy.casts=[cast(ditto,2),cast(ditto,5),cast(boss,5)];
  const publicState=onlineView(legacy,ditto.side,mode);
  assert.deepEqual(publicState.actors.find(a=>a.onlineId===ditto.onlineId).moves,expected);
  assert.equal(legacy.allies[1].moves.length,bossMoves.length,'reading a snapshot must not modify it');
  const resumed=simulateOnline(match,JSON.parse(JSON.stringify(legacy)),0,null,'host').state;
  assert.deepEqual(resumed.allies[1].moves,expected);assert.deepEqual(resumed.allies[1].battleTransform.moves,['Transform']);
  assert.deepEqual(resumed.allies[1].moveTimers,[.25,1.25,2.25,3.25]);assert.deepEqual(resumed.allies[1].moveCooldownStarts,[100,101,102,103]);
  assert.deepEqual(resumed.enemies[0].moves,bossMoves);
  for(const packet of [publicState,resumed])assert.deepEqual(packet.casts,[legacy.casts[0],legacy.casts[2]]);
 }
 console.log('Transform and Imposter each copied four moves across all six Mega raids, including resumed rooms.');
}
Promise.all([verifyPendingRecovery(),verifyLoanerGear(),verifyOpenArenaChase(),verifyMasterRaids(),verifyRaidTransform(),verifyRaidRetry()]).then(()=>{
 console.log('Manual Capture, full-bench fusion, pending-save recovery, and server loaner gear checks passed.');
 for(const file of ['shiny-pc.cjs','ability-adaptations.cjs','remaining-abilities.cjs','update-and-trade-client.cjs','arena-evolutions.cjs','arena-tactics.cjs','arena-maps.cjs','arena-move-effects.cjs','arena-move-audio.cjs','arena-status-effects.cjs','regional-progression-client.cjs','regional-contracts.cjs','roster-expansion.cjs','online-combat-turns.mjs'])
  require('node:child_process').execFileSync(process.execPath,[path.join(__dirname,file)],{stdio:'inherit'});
}).catch(error=>{console.error(error);process.exitCode=1;});
