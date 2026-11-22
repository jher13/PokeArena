const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
let cacheVersion;
for(const [file,prefix] of [['index.html','./'],['local-test/PokeArena_Local_Test.html','../']]){
 const html=read(file);
 const script=html.match(/<script src="([^"]*?)roguelit\.js\?v=(\d+\.\d+\.\d+)"/);
 assert(script);assert.equal(script[1],prefix);if(cacheVersion)assert.equal(script[2],cacheVersion);cacheVersion=script[2];
 assert(html.includes("window.ArenaRoguelit.finish(phase==='win')"));
 assert(html.includes('id="toolbar-coin-display" class="home-pill" title="Coins"><svg class="currency-pixel"'));
 for(const asset of ['tactics-arena.webp','tactics-carousel-altar.webp']){
  assert(html.includes(prefix+'assets/'+asset+'?v='+cacheVersion),'Current PFT art in '+file);
 }
}
const engine=read('supabase/functions/arena-combat/engine.js').replace(/^export /gm,'');
const ui=String.raw`
 class TestNode{
  constructor(tagName,text='',className=''){
   Object.assign(this,{tagName,textContent:text,children:[],className,style:{setProperty(){}},attrs:{},classList:{add(){}}});
  }
  get textContent(){return (this.text ?? '')+(this.children ?? []).map(node=>typeof node==='string'?node:node.textContent).join('');}
  set textContent(value){this.text=value;this.children=[];}
  append(...v){this.children.push(...v);}
  replaceChildren(...v){this.text='';this.children=v;}
  setAttribute(key,value){this.attrs[key]=value;}
 }
 const testNodes=new Map();document.getElementById=id=>{
  if(!testNodes.has(id))testNodes.set(id,new TestNode('div'));return testNodes.get(id);
 };
 document.createTextNode=text=>new TestNode('#text',text);
 const walletCoin=new TestNode('svg','','currency-pixel');
 walletCoin.cloneNode=()=>new TestNode('svg','','currency-pixel');
 byId('toolbar-coin-display').querySelector=tag=>tag==='svg'?walletCoin:null;
 element=(...args)=>new TestNode(...args);
 skillTitle=(tag,name)=>element(tag,name);pokemonPortrait=name=>element('canvas',name);
 idlePokemonPortrait=(name,style,variant,fullSize,direction,shiny,preferMotion)=>Object.assign(element('canvas',name,style),{preferMotion});
 collectionPixelArt=()=>element('canvas');bagItemIcon=name=>element('span',name);
 showScreen=()=>{};openMenu=()=>{phase='home';rogueRun=null;};checkGameVersion=()=>{};
 openBattle=(g,w,t,run)=>{rogueRun=run;phase='setup';};startBattle=()=>{phase='battle';};
 playerStorage.getItem=k=>storage.get(k) ?? null;
 playerStorage.setItem=(k,v)=>{if(storage.fail || storage.failKey===k || (storage.failCleanup && k===rogueProgressKey && !JSON.parse(v).delivery))throw Error('test save failure');storage.set(k,v);};
 recordBattlePass=(events,id,recipient)=>{recipient.battlePass.testCredits=(recipient.battlePass.testCredits ?? 0)+1;return '';};
 if(storage.has(progressKey))Object.assign(wildProgress,JSON.parse(storage.get(progressKey)));
 if(storage.lucky)for(const gym of gymTeams)masterGymClears.add(gym.id);
 onlineRandomState=11223;
`;
const api=String.raw`
 const label=btn=>btn.children.find(x=>x.tagName==='strong')?.textContent;
 const buttons=()=>byId('rogue-choices').children;
 globalThis.testGame={
  home:()=>byId('home-roguelit').onclick(),
  focus:key=>{const select=byId('rogue-route-map').children[0].children[0].children[0];select.value=key;select.onchange();},
  bosses:run=>[0,1,2].map(i=>sideAudit.route({...run,round:(i+1)*4},'boss','Rock').foes),
  bank:bankTacticsPrize,
  routes:run=>{sideAudit.prepareRoutes(run);return run;},
  studySequence:()=>{
   const results={};
   for(const key of ['relay','gear','coverage','elite']){
    const run={round:2,study:{key,count:0,leg:0,leads:[]},members:[{name:'Pikachu',moves:['Thunderbolt']}],node:{kind:'training'}};
    const tick=()=>{sideAudit.recordStudyWin(run);return run.study.count;};
    const first=tick();run.node.kind='elite';run.members[0].heldItem='Leftovers';run.members[0].moves.push('Quick Attack');
    const second=tick();run.members[0].name='Eevee';results[key]=[first,second,tick()];
   }return results;
  },
  relicStats:key=>{
   const previous=rogueRun,lead={name:'Pikachu',level:50,moves:['Thunderbolt','Quick Attack','Iron Tail'],profile:rollProfile()};
   if(key==='iron')lead.heldItem='Leftovers';
   rogueRun={power:1,enemyPower:1,health:1,offense:1,members:[lead,{name:'Eevee'}]};
   const pair=()=>{delete rogueRun.relic;const before=unit(lead.name,0,0,true,50,lead).stats;rogueRun.relic=key;return [before,unit(lead.name,0,0,true,50,lead).stats];};
   const normal=pair();if(key==='prism')lead.moves.pop();if(key==='iron')delete lead.heldItem;
   if(key==='rations')lead.heldItem='Leftovers';if(key==='relay')rogueRun.members[1].name='Raichu';
   const inactive=pair();rogueRun=previous;return [...normal,inactive];
  },
  choose:name=>{const b=buttons().find(b=>label(b)===name && !b.disabled);if(!b)throw Error('Missing '+name+' on '+byId('rogue-status').textContent);b.onclick();},
  cards:buttons,statusNode:()=>byId('rogue-status'),
  supplies:()=>byId('rogue-route-map').children[0].children[1].children,
  options:()=>buttons().filter(b=>!b.disabled).map(label),
  status:()=>byId('rogue-status').textContent,
  snapshot:()=>readRogueProgress(),
  finish:won=>window.ArenaRoguelit.finish(won),
  actor:mon=>unit(mon.name,0,0,true,mon.level,mon),
  validMove:(mon,move)=>legalMoves(mon).includes(move) && isVisibleArenaMove(move),
  liveMap:type=>randomArenaMap(type).type
 };
`;
const program=new vm.Script(engine+'\n'+ui+'\n'+read('roguelit.js').replace(' window.ArenaRoguelit={finish};',' globalThis.sideAudit={route,prepareRoutes,recordStudyWin}; window.ArenaRoguelit={finish};')+'\n'+api,{filename:'roguelit-test.js'});
const key='pokemon-arena-roguelit-progress',walletKey='pokemon-arena-wild-progress';
const storage=new Map([[key,JSON.stringify({shards:85,best:7,ranks:{level:2,health:1}})],['pokemon-arena-team','["Ditto"]']]);
function boot(store){const c=vm.createContext({storage:store,console,structuredClone,setTimeout(){},clearTimeout(){}});program.runInContext(c);c.testGame.home();return c.testGame;}
const json=x=>JSON.parse(JSON.stringify(x));
let g=boot(storage);
const run=()=>g.snapshot().expedition;
const wallet=()=>JSON.parse(storage.get(walletKey) ?? '{}');
const choose=x=>g.choose(x);
const first=()=>choose(g.options()[0]);
assert.deepEqual(Array.from(g.supplies(),row=>row.children[0].textContent),['Kanto','Johto','Hoenn']);
choose('Boss rewards');
for(const card of g.cards().slice(0,3)){
 const [bosses,repeat,firstClear]=card.children[1].children;
 assert.equal(bosses.children.length,3);assert(bosses.children.every(row=>row.children[0].preferMotion));
 assert.equal(repeat.children[0].textContent,'Every clear');assert.match(firstClear.children[0].textContent,/First clear/);
}
choose('Back to Roguelit');choose('Permanent upgrades');choose('Power · 0/10');
assert.equal(g.snapshot().shards,70);assert.equal(g.snapshot().ranks.level,2);assert.equal(g.snapshot().ranks.offense,1);
choose('Back to Roguelit');choose('Start expedition');
assert.equal(run().options.length,5);first();assert.equal(run().members[0].level,12);
const draft=json(run());g=boot(storage);choose('Resume expedition');
assert.deepEqual(json(run()),draft);assert.deepEqual(json(g.options()),draft.options);
while(run().step==='moves')first();
assert.equal(new Set(run().members[0].moves).size,run().members[0].moves.length);
const routeCard=g.cards()[0],cardRows=routeCard.children[2].children;
assert(routeCard.children[1].preferMotion);
assert.match(cardRows[0].textContent,/Lv\. /);assert.match(cardRows.at(-4).textContent,/ Arena/);
function checkCoin(chip,amount){
 assert.equal(chip.attrs.role,'img');assert.equal(chip.children[0].tagName,'svg');
 assert.equal(chip.children[0].className,'currency-pixel');assert.equal(chip.textContent,amount.toLocaleString());
 assert.equal(chip.attrs['aria-label'],chip.textContent+' main-game coin'+(amount===1?'':'s'));
}
const routeCoins=cardRows.at(-3);
checkCoin(routeCoins,Number(routeCoins.textContent.replaceAll(',','')));
assert.match(cardRows.at(-2).attrs['aria-label'],/shards?$/);
assert.equal(cardRows.at(-2).children[0].tagName,'canvas');assert(cardRows.at(-1).textContent.length>15);
const oldTab=boot(storage);oldTab.choose('Resume expedition');
const oldBest=g.snapshot().best;let expectedShards=g.snapshot().shards,expectedCoins=0;
function battle(kind,failSave=false){
 const route=run().routes.find(o=>o.kind===kind);
 assert(route,kind);assert.equal(g.liveMap(route.type),route.type);
 const draft=json(route);choose(route.label);
 assert.equal(run().step,'battle');assert.deepEqual(json(run().enemyRoster),draft.foes);
 if(failSave){
  oldTab.choose('Training trail');assert.match(oldTab.status(),/saved expedition changed/i);
  g=boot(storage);choose('Resume expedition');assert.deepEqual(json(run().node),draft);
  storage.fail=true;g.finish(true);assert.match(g.status(),/Could not save/);
  assert.equal(g.snapshot().shards,expectedShards);storage.fail=false;choose('Retry save');
 }else g.finish(true);
 expectedShards+=route.shards;
 const credits=wallet().battlePass.testCredits;
 expectedCoins+=run().lastPayout.coins;assert.equal(wallet().coins,expectedCoins);
 checkCoin(g.statusNode().children[0].children[1],run().lastPayout.coins);
 g.finish(true);assert.equal(wallet().battlePass.testCredits,credits);
 assert.equal(g.snapshot().shards,expectedShards);assert.equal(run().step,'reward');
}
function recruit(){
 const target=run().rewards.recruits[0].name,was=run().members.length,drop=run().members.at(-1).name;
 choose('Recruit a teammate');
 for(const [i,mon] of run().rewards.recruits.entries()){
  const card=g.cards()[i],details=card.children.find(node=>node.className==='rogue-mon-details');
  assert.equal(card.children.find(node=>node.tagName==='strong').textContent,mon.name);
  assert.equal(details.children[0].textContent,'Lv. '+mon.level);assert.equal(details.children[1].className,'rogue-mon-types');
  const list=details.children.at(-1);assert.equal(list.attrs['aria-label'],'Moves');
  assert.deepEqual(Array.from(list.children,row=>row.textContent),Array.from(mon.moves));
  assert(list.children.every(row=>row.attrs.role==='listitem'));
 }
 choose(target);
 if(was===6)choose('Replace '+drop);
 assert(run().members.some(m=>m.name===target));assert.equal(run().members.length,Math.min(6,was+1));
}
battle('recruit',true);recruit();
battle('gear');{
 const item=run().rewards.items[0],name=run().members[0].name;choose('Choose held gear');choose(item);choose(name);
 assert.equal(g.actor(run().members[0]).heldItem,item);
}
battle('tutor');{
 const before=run(),i=before.rewards.tutors.findIndex(moves=>moves.length),mon=before.members[i],move=before.rewards.tutors[i][0];
 assert(g.validMove(mon.name,move));choose('Visit the move tutor');choose(mon.name);choose(move);
 if(mon.moves.length===4)choose(mon.moves[0]);
 assert(run().members[i].moves.includes(move));assert(run().members[i].moves.length<=4);
}
for(let index=4;index<=12;index++){
 const kind=index%4===0?'boss':index%4===2?'elite':'recruit';
 const before=run();if(kind==='boss')assert.equal(before.routes[0].foes.at(-1).name,['Venusaur','Typhlosion','Rayquaza'][index/4-1]);
 battle(kind);assert.equal(g.snapshot().best,Math.max(oldBest,index));
 if(kind==='recruit' || index===8)recruit();else choose('Endurance training');
}
assert.equal(run().step,'clear');assert.equal(wallet().battlePass.testCredits,12);assert.equal(g.snapshot().best,12);
assert.deepEqual(json(g.snapshot().firstClears),['Kanto','Johto','Hoenn']);
assert.equal(wallet().capsules,1);assert.equal(wallet().vitamins['Rare Candy'],1);assert.equal(wallet().vitamins['IV Booster'],1);
checkCoin(g.statusNode().children.find(node=>node.attrs?.['aria-label']?.includes('coin')),expectedCoins);
const finished=boot(new Map(storage));finished.choose('Resume expedition');finished.choose('Finish expedition');
assert.equal(finished.snapshot().expedition,undefined);assert.equal(finished.snapshot().shards,expectedShards);
const endlessStore=new Map(storage),endless=boot(endlessStore);endless.choose('Resume expedition');endless.choose('Continue into endless');
for(let wave=13;wave<=24;wave++){
 const r=endless.snapshot().expedition;endless.choose(r.routes[0].label);endless.finish(true);
 if(endless.options().includes('Train the team instead'))endless.choose('Train the team instead');
 endless.choose('Power training');
}
const endlessBag=JSON.parse(endlessStore.get(walletKey));assert.equal(endlessBag.capsules,1);assert.equal(endlessBag.vitamins['Rare Candy'],2);
assert.equal(endless.snapshot().expedition.round,25);
g=boot(storage);choose('Resume expedition');choose('Continue into endless');
assert.equal(run().round,13);assert.equal(run().members.length,6);assert.equal(run().region,'Kanto');
choose(run().routes[0].label);g.finish(false);
checkCoin(g.statusNode().children.find(node=>node.attrs?.['aria-label']?.includes('coin')),expectedCoins);
assert.equal(g.snapshot().expedition,undefined);assert.equal(g.snapshot().shards,expectedShards);
assert.equal(storage.get('pokemon-arena-team'),'["Ditto"]');assert.equal(wallet().battlePass.testCredits,13);
// A failed bag write leaves the saved victory collectible. A failed cleanup leaves its credited receipt idempotent.
const separate=new Map([[key,JSON.stringify({shards:1000,best:12,ranks:{},firstClears:['Kanto']})]]);
separate.lucky=true;
let h=boot(separate);h.choose('Permanent upgrades');
for(const label of ['Scouting','Move Studies','Quartermaster','Field Kit']){h.choose(label+' · 0/2');h.choose(label+' · 1/2');}
h.choose('Bounty Hunter · 0/3');h.choose('Back to Roguelit');h.choose('Start expedition');
assert.equal(h.snapshot().expedition.options.length,7);h.choose(h.options()[0]);
assert.equal(h.snapshot().expedition.members[0].heldItem,'Sitrus Berry');
assert.equal(h.snapshot().expedition.options.length,6);while(h.snapshot().expedition.step==='moves')h.choose(h.options()[0]);
const premium=h.snapshot().expedition;assert.equal(premium.perks.bounty,1);
h.choose('Recruit trail');separate.failKey=walletKey;h.finish(true);assert.match(h.status(),/waiting for your bag/);
const pending=h.snapshot().delivery;assert(pending && pending.coins>0);
assert.equal(pending.coins,2*Math.round(premium.coinRate*(6+20/premium.travelSpeed)/60*1.05));
assert.equal(separate.has(walletKey),false);
separate.failKey='';separate.failCleanup=true;h=boot(separate);
let bag=JSON.parse(separate.get(walletKey));const greatBallsBefore=bag.balls[2];assert.equal(bag.coins,pending.coins);assert.equal(bag.battlePass.testCredits,1);
h=boot(separate);assert.equal(JSON.parse(separate.get(walletKey)).coins,pending.coins);assert(h.snapshot().delivery);
separate.failCleanup=false;h.home();assert(!h.snapshot().delivery);h.choose('Resume expedition');
assert.equal(h.snapshot().expedition.rewards.recruits.length,5);h.choose('Recruit a teammate');h.choose(h.options()[0]);h.choose('Supply trail');h.finish(true);
assert.equal(h.snapshot().expedition.rewards.items.length,5);h.choose('Train the team instead');h.choose('Power training');
h.choose('Move tutor');h.finish(true);assert(h.snapshot().expedition.rewards.tutors.some(values=>values.length===5));
h.choose('Train the team instead');h.choose('Power training');h.choose('Venusaur');h.finish(true);
bag=JSON.parse(separate.get(walletKey));assert.equal(bag.vitamins['EXP Candy 100'],1+(h.snapshot().expedition.lastPayout.study?2:0));assert.equal(bag.vitamins['EXP Candy 250'] ?? 0,0);
assert.equal(bag.balls[2],greatBallsBefore+2);assert.equal(h.snapshot().expedition.lastPayout.first,undefined);
console.log('Roguelit passed drafting, checkpoints, recovery after partial writes, permanent upgrades, main-game coins and bag rewards, first clears, recruits, held gear, tutoring, all three bosses and endless play.');
const varietyStore=new Map(),v=boot(varietyStore),courses=[];
for(let i=0;i<6;i++){
 v.focus('catching');v.choose('Start expedition');const expedition=v.snapshot().expedition;
 assert.equal(expedition.focus,'catching');courses.push(Array.from(expedition.course));
 for(const mon of v.bosses(expedition).flat()){
  assert(mon.moves.length>=1 && mon.moves.length<=4);assert(mon.moves.every(move=>v.validMove(mon.name,move)));
 }
 v.home();v.choose('Retire this expedition');v.choose('Retire expedition');
}
for(let region=0;region<3;region++){
 assert.deepEqual(new Set(courses.slice(0,3).map(c=>c[region])),new Set([0,1,2]));
 assert.deepEqual(new Set(courses.slice(3).map(c=>c[region])),new Set([0,1,2]));
 assert.notEqual(courses[2][region],courses[3][region]);
}
v.choose('Start expedition');v.choose(v.options()[0]);
while(v.snapshot().expedition.step==='moves')v.choose(v.options()[0]);
const routeSave=v.snapshot().expedition;const checkpoint=JSON.parse(varietyStore.get(key));
const savedRoutes=json(routeSave.routes),resumed=boot(new Map(varietyStore));resumed.choose('Resume expedition');
assert.deepEqual(json(resumed.snapshot().expedition.routes),savedRoutes);
assert.deepEqual(json(resumed.snapshot().expedition.study),json(routeSave.study));
for(const field of ['course','study','focus','relic'])delete checkpoint.expedition[field];
checkpoint.expedition.routes=checkpoint.expedition.routes.filter(node=>node.kind!=='relic');
const legacy=boot(new Map([[key,JSON.stringify(checkpoint)]]));legacy.choose('Resume expedition');legacy.choose('Recruit trail');legacy.finish(true);
legacy.choose('Train the team instead');legacy.choose('Power training');
assert.equal(legacy.snapshot().expedition.study,undefined);assert.deepEqual(Array.from(legacy.snapshot().expedition.routes,r=>r.kind),['gear','elite']);

const trialStore=new Map(varietyStore),base=JSON.parse(trialStore.get(key)),seedRun=base.expedition;
seedRun.study.relicFork=0;seedRun.perks.curator=1;
seedRun.study.key='elite';seedRun.focus='catching';base.expedition=v.routes(seedRun);trialStore.set(key,JSON.stringify(base));
const q=boot(trialStore);q.choose('Resume expedition');q.choose('Relic hunt');q.finish(true);
const relicOptions=q.snapshot().expedition.rewards.relics;assert.equal(new Set(relicOptions).size,3);
q.choose(q.options()[0]);assert.equal(q.snapshot().expedition.relic,relicOptions[0]);
q.choose('Elite encounter');q.finish(true);q.choose('Endurance training');
q.choose('Move tutor');q.finish(true);
if(q.options().includes('Train the team instead'))q.choose('Train the team instead');
q.choose('Power training');const firstBoss=q.snapshot().expedition.routes[0].label;
const beforeBoss=JSON.parse(trialStore.get(walletKey));q.choose(firstBoss);trialStore.failKey=walletKey;q.finish(true);
assert.equal(q.snapshot().delivery.study,'Elite research');
assert.equal(JSON.parse(trialStore.get(walletKey)).coins,beforeBoss.coins);
trialStore.failKey='';const recovered=boot(trialStore);recovered.choose('Resume expedition');
const bossBag=JSON.parse(trialStore.get(walletKey));assert.equal(bossBag.balls[2]-beforeBoss.balls[2],5);
const freshQuiz=q.studySequence();
assert.deepEqual(json(freshQuiz),{relay:[1,1,2],coverage:[0,1,2],gear:[0,1,1],elite:[0,1,1]});
for(const [key,indices] of Object.entries({prism:[1,5],iron:[2,4],relay:[3],rations:[0]})){
 const [normal,on,off]=q.relicStats(key);
 for(let i=0;i<6;i++)assert.equal(on[i],indices.includes(i)?Math.round(normal[i]*1.15):normal[i],key+' stat '+i);
 assert.deepEqual(Array.from(off[0]),Array.from(off[1]),key+' activation condition');
}
// PFT settlement uses the same pending-reward checkpoint, while keeping separate wallet receipts.
const prizeStore=new Map(),prizeGame=boot(prizeStore);
const prize={mode:'tactics',id:'pft/123',won:true,coins:4100,items:[['vitamins','IV Booster',2],['capsules','Ability Capsule',1]]};
prizeStore.failKey=walletKey;assert.equal(prizeGame.bank(prize),false);assert.equal(prizeStore.has(walletKey),false);
assert.equal(prizeGame.snapshot().delivery.id,prize.id);
prizeStore.failKey='';prizeStore.failCleanup=true;const restart=boot(prizeStore);
assert.equal(JSON.parse(prizeStore.get(walletKey)).coins,4100);assert(restart.snapshot().delivery);
prizeStore.failCleanup=false;restart.home();assert(!restart.snapshot().delivery);
assert(restart.bank({...prize,id:'pft/124'}));assert(restart.bank(prize));
const finalBag=JSON.parse(prizeStore.get(walletKey));assert.equal(finalBag.coins,8200);assert.equal(finalBag.vitamins['IV Booster'],4);
assert.equal(finalBag.capsules,2);assert.equal(finalBag.battlePass.testCredits,2);
const queued=new Map(),qgame=boot(queued);queued.failKey=walletKey;
assert.equal(qgame.bank(prize),false);assert.equal(qgame.bank({...prize,id:'pft/789'}),false);
assert.equal(qgame.snapshot().tacticsQueue.length,1);assert.equal(qgame.bank({...prize,id:'pft/789'}),false);
queued.failKey='';const drained=boot(queued);assert(!drained.snapshot().delivery);assert(!drained.snapshot().tacticsQueue);
assert.equal(JSON.parse(queued.get(walletKey)).coins,8200);
console.log('All nine boss sites, legacy saves, relic conditions, field studies, both supply deliveries and duplicate-reward recovery passed.');
