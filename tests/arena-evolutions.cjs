const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const readData=name=>JSON.parse(html.match(new RegExp('^const '+name+'\\s*=\\s*(.+);$','m'))[1]);
const dex=readData('dex'),evo=readData('evolutionData');
let checks=0,pid=500;
class Node {
 constructor(tag,text,cls=''){this.tagName=tag;this.textContent=text??'';this.className=cls;this.children=[];this.attributes={};this.style={};}
 append(...children){this.children.push(...children);}replaceChildren(...children){this.children=children;}
 setAttribute(key,value){this.attributes[key]=String(value);}addEventListener(){}get classList(){return {add(){}};}
 all(){return this.children.filter(x=>x instanceof Node).flatMap(n=>[n,...n.all()]);}
}
const nodes=new Map(),storage=new Map();
let renders=0,preview=null;
const ctx=vm.createContext({console,structuredClone,Math,window:{},phase:'menu',
 pmdData:{motions:{}},element:(...args)=>new Node(...args),
 byId:id=>{if(!nodes.has(id))nodes.set(id,new Node('div'));return nodes.get(id);},
 iconBounds:readData('iconBounds'),moveCatalog:readData('moveCatalog'),pokemonLearnsets:readData('pokemonLearnsets'),
 dex,dexStats:readData('dexStats'),evolutionData:evo,stoneEvolutions:readData('stoneEvolutions'),typeChart:readData('typeChart'),
 speciesById:Object.fromEntries(Object.entries(dex).map(([name,[id]])=>[id,name])),profileStorage:'pokemon-arena-profiles',
 profiles:{},loadouts:{},savedMoves:{},movePools:{},team:[],wildProgress:{},registeredPokemon:new Set(),evolutionScenes:[],allies:[],selectedWild:null,selectedTrainer:null,selectedGym:null,rogueRun:null,
 playerStorage:{setItem:(key,value)=>storage.set(key,value)},saveTeam(){},saveWildProgress(){},
 registerPokemon:name=>ctx.registeredPokemon.add(name),normalizeBattleAI:ai=>({...ai}),isVisibleArenaMove:move=>Boolean(ctx.moveCatalog[move]),
 profileFor:name=>ctx.profiles[dex[name][0]],ownedPokemon:name=>ctx.wildProgress.owned[name],rollProfile:()=>({pid:++pid,ivs:Array(6).fill(12),evs:Array(6).fill(0)}),
 renderMenu:()=>{renders++;},renderPokemonDetail:(name,copy)=>{preview={name,copy};},pcCollectionControls:()=>new Node('fieldset'),
 showPassBattleNotice(){},playEvolutionScenes(){},inspected:null,
 ballTypes:[{name:'Poké Ball'}],evolutionStones:[...new Set(Object.values(readData('stoneEvolutions')).flatMap(Object.keys))]});
vm.runInContext(html.slice(html.indexOf('const natureNames=['),html.indexOf('const profileStorage=')),ctx);
vm.runInContext(html.slice(html.indexOf('function validProfileData('),html.indexOf('function profileFor(')),ctx);
vm.runInContext(html.slice(html.indexOf('function natureOf('),html.indexOf('function isAvailablePokemon(')),ctx);
vm.runInContext(html.slice(html.indexOf('function isAvailablePokemon('),html.indexOf('const dexNames =')),ctx);
vm.runInContext(html.slice(html.indexOf('function legalMoves('),html.indexOf('function saveTeam(')),ctx);
vm.runInContext(html.slice(html.indexOf('function addCaughtPokemon('),html.indexOf('function ownedPokemon(')),ctx);
vm.runInContext(html.slice(html.indexOf('function freeHeldCopies('),html.indexOf('function equipHeldItem(')),ctx);
vm.runInContext(html.slice(html.indexOf('// Arena evolution rules:'),html.indexOf('// End Arena evolution rules.')+'// End Arena evolution rules.'.length)+'\nglobalThis.routes=arenaEvolutionRoutes;',ctx);
vm.runInContext(html.slice(html.indexOf('function experienceNeeded('),html.indexOf('const evolutionScenes=')),ctx);
vm.runInContext(html.slice(html.indexOf('function stoneTarget('),html.indexOf('function playEvolutionScenes(')),ctx);
vm.runInContext(html.slice(html.indexOf('function gainWildExperience('),html.indexOf('let selectedWild=')),ctx);
const profile=extra=>({pid:++pid,ivs:Array(6).fill(31),evs:Array(6).fill(0),...extra});
function reset(name,level=100,extra={},moves=['Tackle']){
 ctx.profiles={};ctx.loadouts={};ctx.savedMoves={};ctx.team=[name];ctx.allies=[];ctx.selectedWild=null;ctx.selectedTrainer=null;ctx.selectedGym=null;ctx.rogueRun=null;
 ctx.registeredPokemon=new Set();ctx.evolutionScenes=[];ctx.inspected=null;preview=null;
 ctx.wildProgress={owned:{[name]:{level,xp:0}},copies:{},held:{},items:{'Linking Cord':2,'Leaf Stone':2,'Sun Stone':2},ai:{[name]:{style:'Balanced'}},balls:[3],autoRepeat:true,registered:[],favorites:[]};
 ctx.profiles[dex[name][0]]=profile(extra);ctx.loadouts[name]=moves;return ctx.arenaEvolutionContext(name);
}
function rule(name,target){return ctx.routes[name].find(r=>r.name===target);}
function trained(extra={}){return {evolutionProgress:{wins:9,casts:Object.fromEntries(Object.keys(ctx.typeChart).map(type=>[type,50]))},...extra};}
// Every recorded evolution, including formerly excluded forms, now has a reachable route.
let paths=0,special=0;
for(const [id,[parent]] of Object.entries(evo)){
 if(!parent)continue;
 const name=ctx.speciesById[parent],target=ctx.speciesById[id],r=rule(name,target);assert(r,name+' → '+target+' is missing');
 assert(ctx.isAvailablePokemon(target),target+' has no usable sprite');
 let extra=trained(),moves=r.move?[r.move]:ctx.legalMoves(name).slice(0,4);
 if(r.knowsType)moves=[ctx.legalMoves(name).find(move=>ctx.moveCatalog[move]?.[0]===r.knowsType)];
 if(r.stat){extra={...extra,pid:0};if(r.stat==='attack')extra.ivs=[31,31,0,31,31,31];if(r.stat==='defense')extra.ivs=[31,0,31,31,31,31];}
 const c=reset(name,100,extra,moves);ctx.team.push('Remoraid','Umbreon');
 if(r.item)ctx.wildProgress.items[r.item]=2;
 assert(ctx.arenaEvolutionReady(c,r),name+' → '+target+' has unreachable requirements: '+JSON.stringify(ctx.arenaEvolutionChecks(c,r)));
 if(!r.bonus){const result=ctx.evolveArenaIndividual(c,r);assert.equal(result.name,target);assert(ctx.ownedPokemon(target));assert.equal(ctx.profileFor(target).pid,c.profile.pid);assert.equal(ctx.wildProgress.autoRepeat,true);}
 paths++;
 if(evo[id][2]===0 && !Object.values(ctx.stoneEvolutions[name]??{}).includes(target))special++;
}
assert.equal(paths,513);assert.equal(special,142);checks++;
// Inkay needs no hardware gesture; over-level and capped Pokémon can evolve immediately.
let c=reset('Inkay',29);assert(!ctx.arenaEvolutionReady(c,rule('Inkay','Malamar')));ctx.gainWildExperience('Inkay',ctx.experienceNeeded(29));assert(ctx.ownedPokemon('Malamar'));checks++;
assert.equal(ctx.canHoldEvolutionItem('Inkay',undefined),false);assert.equal(ctx.stoneTarget('Inkay',undefined),null);checks++;
c=reset('Inkay',100,{trade_id:'10000000-0000-4000-8000-000000000001',shiny:true,disableBattleEVs:true});ctx.gainWildExperience('Inkay',1);assert(ctx.ownedPokemon('Malamar'));assert.equal(ctx.profileFor('Malamar').trade_id,c.profile.trade_id);assert(ctx.profileFor('Malamar').shiny);assert(ctx.profileFor('Malamar').disableBattleEVs);checks++;
// Bond training is per individual and counts participation once, including losses without win credit.
c=reset('Riolu',30);ctx.selectedWild={};const actor={name:'Riolu',profile:c.profile,friendly:true,enteredBattle:true};ctx.allies=[actor];
ctx.recordArenaEvolutionCast(actor,'Confusion');ctx.recordArenaEvolutionCast(actor,'Normal Attack');ctx.recordArenaEvolutionBattle(false);ctx.recordArenaEvolutionBattle(true);
assert.equal(c.profile.evolutionProgress.wins,0);assert.equal(c.profile.evolutionProgress.casts.Psychic,1);checks++;
for(let i=0;i<3;i++){ctx.allies=[{...actor,arenaEvolutionRecorded:false,evolutionCasts:{}}];ctx.recordArenaEvolutionBattle(true);}
assert.equal(c.profile.evolutionProgress.wins,3);assert(ctx.arenaEvolutionReady(c,rule('Riolu','Lucario')));checks++;
ctx.allies=[{...actor,arenaEvolutionRecorded:false,enteredBattle:false}];ctx.recordArenaEvolutionBattle(true);assert.equal(c.profile.evolutionProgress.wins,3);checks++;
ctx.selectedWild=null;ctx.allies=[{...actor,arenaEvolutionRecorded:false}];ctx.recordArenaEvolutionBattle(true);assert.equal(c.profile.evolutionProgress.wins,3);checks++;
// Move mastery, equipment, party composition and Tyrogue stats enforce their own requirements.
c=reset('Primeape',35);assert(!ctx.arenaEvolutionReady(c,rule('Primeape','Annihilape')));c.profile.evolutionProgress={casts:{Ghost:10}};assert(ctx.arenaEvolutionReady(c,rule('Primeape','Annihilape')));checks++;
c=reset('Tangela',50,{},['Tackle']);assert(!ctx.arenaEvolutionReady(c,rule('Tangela','Tangrowth')));ctx.loadouts.Tangela=['Ancient Power'];assert(ctx.arenaEvolutionReady(ctx.arenaEvolutionContext('Tangela'),rule('Tangela','Tangrowth')));checks++;
c=reset('Pancham',40);assert(!ctx.arenaEvolutionReady(c,rule('Pancham','Pangoro')));ctx.team.push('Umbreon');assert(ctx.arenaEvolutionReady(c,rule('Pancham','Pangoro')));checks++;
c=reset('Tyrogue',20,{pid:0});assert.equal(ctx.chooseArenaEvolution(c).name,'Hitmontop');c.profile.ivs[2]=0;assert.equal(ctx.chooseArenaEvolution(c).name,'Hitmonlee');c.profile.ivs[2]=31;c.profile.ivs[1]=0;assert.equal(ctx.chooseArenaEvolution(c).name,'Hitmonchan');checks++;
// Path choices remove deterministic first-branch bias and protect a reserved future path.
c=reset('Cosmoem',53);assert.equal(ctx.chooseArenaEvolution(c),null);assert.match(ctx.tryArenaEvolution('Cosmoem')[0],/Choose a path/);c.profile.evolutionPath='Lunala';assert.equal(ctx.chooseArenaEvolution(c).name,'Lunala');checks++;
c=reset('Eevee',30,trained(),['Charm']);assert.equal(ctx.chooseArenaEvolution(c),null);c.profile.evolutionPath='Sylveon';assert.equal(ctx.chooseArenaEvolution(c).name,'Sylveon');checks++;
c=reset('Meowth',28,{evolutionPath:'Perrserker'});assert.equal(ctx.chooseArenaEvolution(c),null);c.profile.evolutionProgress={wins:3};assert.equal(ctx.chooseArenaEvolution(c).name,'Perrserker');checks++;
c=reset('Inkay',40,{evolutionPath:'hold'});assert.equal(ctx.chooseArenaEvolution(c),null);checks++;
// Linking Cords are usable for newly supported species and cannot consume other holders' reserved stock.
c=reset('Kadabra',40);assert(ctx.canHoldEvolutionItem('Kadabra','Linking Cord'));assert.equal(ctx.chooseArenaEvolution(c),null);ctx.wildProgress.held.Kadabra='Linking Cord';assert.equal(ctx.chooseArenaEvolution(c,true).name,'Alakazam');
ctx.wildProgress.held.Kadabra='Leftovers';ctx.evolveArenaIndividual(c,rule('Kadabra','Alakazam'));assert.equal(ctx.wildProgress.items['Linking Cord'],1);assert.equal(ctx.wildProgress.held.Alakazam,'Leftovers');checks++;
c=reset('Kadabra',40);ctx.wildProgress.items['Linking Cord']=1;ctx.wildProgress.held.Gengar='Linking Cord';assert(!ctx.arenaEvolutionReady(c,rule('Kadabra','Alakazam')));checks++;
c=reset('Clamperl',40);ctx.wildProgress.held.Clamperl='Linking Cord';assert.equal(ctx.chooseArenaEvolution(c,true),null);c.profile.evolutionPath='Gorebyss';assert.equal(ctx.chooseArenaEvolution(c,true).name,'Gorebyss');checks++;
c=reset('Slowpoke',36);ctx.wildProgress.held.Slowpoke='Linking Cord';ctx.gainWildExperience('Slowpoke',ctx.experienceNeeded(36));assert(ctx.ownedPokemon('Slowpoke'));assert(!ctx.ownedPokemon('Slowbro'));assert.equal(ctx.chooseArenaEvolution(ctx.arenaEvolutionContext('Slowpoke'),true).name,'Slowking');checks++;
c=reset('Kirlia',29);ctx.wildProgress.items['Dawn Stone']=1;ctx.wildProgress.held.Kirlia='Dawn Stone';ctx.gainWildExperience('Kirlia',ctx.experienceNeeded(29));assert(ctx.ownedPokemon('Kirlia'));assert.equal(ctx.chooseArenaEvolution(ctx.arenaEvolutionContext('Kirlia'),true).name,'Gallade');checks++;
// Stored-copy evolution preserves the active individual's identity and never activates the selected copy.
c=reset('Inkay',100);const activePid=c.profile.pid;const stored={level:100,xp:0,profile:profile({trade_id:'20000000-0000-4000-8000-000000000001',shiny:true}),moves:['Confusion'],ai:{style:'Aggressive'}};ctx.wildProgress.copies.Inkay=[stored];
let result=ctx.evolveArenaIndividual(ctx.arenaEvolutionContext('Inkay',stored),rule('Inkay','Malamar'));assert.equal(ctx.profileFor('Inkay').pid,activePid);assert.equal(ctx.profileFor('Malamar').pid,stored.profile.pid);assert.deepEqual([...ctx.team],['Inkay']);assert.equal(ctx.wildProgress.copies.Inkay.length,0);checks++;
const stored2={...stored,profile:profile({shiny:true})};ctx.wildProgress.copies.Inkay.push(stored2);result=ctx.evolveArenaIndividual(ctx.arenaEvolutionContext('Inkay',stored2),rule('Inkay','Malamar'));assert.equal(result.copy.profile.pid,stored2.profile.pid);assert.equal(ctx.profileFor('Malamar').pid,stored.profile.pid);checks++;
assert.throws(()=>ctx.evolveArenaIndividual({name:'Inkay',copy:stored2,entry:stored2,profile:stored2.profile,moves:stored2.moves},rule('Inkay','Malamar')),/changed/);checks++;
// A promoted copy cannot immediately evolve again using the previous battler's participation.
c=reset('Kadabra',100);ctx.wildProgress.held.Kadabra='Linking Cord';ctx.wildProgress.copies.Kadabra=[{level:100,xp:0,profile:structuredClone(c.profile),held:'Linking Cord',moves:[]}];
ctx.allies=[{name:'Kadabra',profile:c.profile,enteredBattle:true}];ctx.evolveStoneHolders();assert(ctx.ownedPokemon('Alakazam'));assert(ctx.ownedPokemon('Kadabra'));assert.equal(ctx.wildProgress.items['Linking Cord'],1);ctx.evolveStoneHolders();assert.equal(ctx.wildProgress.items['Linking Cord'],1);checks++;
// Shedinja is a bonus individual, costs exactly one Poké Ball, and never duplicates a trade ID.
c=reset('Nincada',20,{trade_id:'30000000-0000-4000-8000-000000000001',shiny:true});ctx.evolveArenaIndividual(c,rule('Nincada','Ninjask'));assert(ctx.ownedPokemon('Shedinja'));assert.equal(ctx.wildProgress.balls[0],2);assert.equal(ctx.profileFor('Ninjask').trade_id,c.profile.trade_id);assert.equal(ctx.profileFor('Shedinja').trade_id,undefined);assert.notEqual(ctx.profileFor('Shedinja').pid,c.profile.pid);checks++;
c=reset('Nincada',20);ctx.wildProgress.balls[0]=0;ctx.evolveArenaIndividual(c,rule('Nincada','Ninjask'));assert(!ctx.ownedPokemon('Shedinja'));checks++;
// The PC exposes requirements, preferences and an exact-copy evolution action at level 100.
c=reset('Inkay',100);const panel=ctx.arenaEvolutionControls('Inkay');assert.equal(panel.tagName,'details');assert(panel.all().some(n=>n.textContent==='Evolution · 1 path ready'));const button=panel.all().find(n=>n.textContent==='Evolve into Malamar');assert(!button.disabled);button.onclick();assert(ctx.ownedPokemon('Malamar'));assert(renders>0);checks++;
ctx.phase='battle';c=reset('Inkay',100);const inBattle=ctx.arenaEvolutionControls('Inkay').all().find(n=>n.textContent==='Evolve into Malamar');assert(inBattle.disabled);ctx.phase='menu';checks++;
c=reset('Kadabra',100);const uiCopy={level:100,xp:0,profile:profile(),moves:[]};ctx.wildProgress.copies.Kadabra=[uiCopy];
const copyButton=ctx.arenaEvolutionControls('Kadabra',uiCopy).all().find(n=>n.textContent==='Evolve into Alakazam');copyButton.onclick();copyButton.onclick();assert.equal(ctx.wildProgress.items['Linking Cord'],1);assert.equal(ctx.profileFor('Kadabra').pid,c.profile.pid);assert.equal(ctx.profileFor('Alakazam').pid,uiCopy.profile.pid);checks++;
// Evolving a regional individual must not overwrite the original form.
c=reset('Alolan Vulpix',100,{shiny:true,disableBattleEVs:true});ctx.wildProgress.items['Ice Stone']=1;
ctx.wildProgress.owned.Ninetales={level:70,xp:9};ctx.profiles[dex.Ninetales[0]]=profile({pid:777});
ctx.evolveArenaIndividual(c,rule('Alolan Vulpix','Alolan Ninetales'));
assert.equal(ctx.profileFor('Ninetales').pid,777);assert.equal(ctx.ownedPokemon('Ninetales').level,70);
assert.equal(ctx.profileFor('Alolan Ninetales').pid,c.profile.pid);assert(ctx.profileFor('Alolan Ninetales').shiny);assert(ctx.profileFor('Alolan Ninetales').disableBattleEVs);checks++;
c=reset('Girafarig',32,{},['Tackle']);assert(!ctx.arenaEvolutionReady(c,rule('Girafarig','Farigiraf')));c.moves=['Twin Beam'];assert(ctx.arenaEvolutionReady(c,rule('Girafarig','Farigiraf')));checks++;
c=reset('Bisharp',52,{evolutionProgress:{wins:4,casts:{Dark:10}}});assert(!ctx.arenaEvolutionReady(c,rule('Bisharp','Kingambit')));
c.profile.evolutionProgress.wins=5;c.profile.evolutionProgress.casts.Dark=9;assert(!ctx.arenaEvolutionReady(c,rule('Bisharp','Kingambit')));c.profile.evolutionProgress.casts.Dark=10;assert(ctx.arenaEvolutionReady(c,rule('Bisharp','Kingambit')));checks++;
assert.match(html,/actor\.lastUsedMove=move;\s*if\(!basic\)recordArenaEvolutionCast\(actor,move\);/);assert.match(html,/recordArenaEvolutionBattle\(result>0\)/);checks++;
console.log(JSON.stringify({checks,evolutionRoutes:paths,arenaAdaptations:special,missingRoutes:0}));
// Newly available forms use the existing offline icon sheet and must survive real combat simulation.
(async()=>{
 const {simulateOnline,onlineView}=await import('../supabase/functions/arena-combat/engine.js');
 const motions=readData('pmdData').motions;
 const fallback=Object.entries(dex).filter(([,value])=>!motions[value[0]]).map(([name])=>name);
 const entries=name=>({
  'pokemon-arena-profiles':JSON.stringify({[dex[name][0]]:{pid:10,ivs:Array(6).fill(31),evs:[4,0,0,252,0,252]}}),
  'pokemon-arena-moves':JSON.stringify({[name]:['Psychic','Aura Sphere','Flamethrower','Ice Beam']}),
  'pokemon-arena-wild-progress':JSON.stringify({owned:{[name]:{level:100,xp:0}},ai:{[name]:{style:'Aggressive',position:'Auto'}}})
 });
 let timeouts=0;
 for(const [i,name] of fallback.entries()){
  const match={id:(9000+i).toString(16).padStart(8,'0')+'-1111-4111-8111-111111111111',mode:'unranked',format:1,host_pick:[name],guest_pick:['Mewtwo'],host_entries:entries(name),guest_entries:entries('Mewtwo')};
  let state=null,result=null;
  for(let second=0;second<301&&!result;second++){
   const out=simulateOnline(match,state,60,null,'host');state=JSON.parse(JSON.stringify(out.state));result=out.result;
   for(const actor of [...state.allies,...state.enemies])for(const value of [actor.x,actor.y,actor.hp,actor.max,...actor.stats])assert(Number.isFinite(value),name+' has nonfinite combat state');
  }
  assert(result,name+' did not finish combat');if(state.clock>=299.99&&state.allies.some(a=>a.hp>0)&&state.enemies.some(a=>a.hp>0))timeouts++;
  assert(onlineView(state,'host','unranked').actors.length,name+' is absent from combat rendering');
 }
 assert.equal(timeouts,0);console.log(JSON.stringify({offlineSpriteBattles:fallback.length,timeouts}));
})().catch(error=>{console.error(error);process.exitCode=1;});
