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
}
const engine=read('supabase/functions/arena-combat/engine.js').replace(/^export /gm,'');
const ui=String.raw`
 class TestNode{
  constructor(tagName,text='',className=''){
   Object.assign(this,{tagName,textContent:text,children:[],className,style:{setProperty(){}},attrs:{},classList:{add(){}}});
  }
  append(...v){this.children.push(...v);}
  replaceChildren(...v){this.children=v;}
  setAttribute(key,value){this.attrs[key]=value;}
 }
 const testNodes=new Map();document.getElementById=id=>{
  if(!testNodes.has(id))testNodes.set(id,new TestNode('div'));return testNodes.get(id);
 };
 document.createTextNode=text=>new TestNode('#text',text);
 element=(...args)=>new TestNode(...args);
 skillTitle=(tag,name)=>element(tag,name);pokemonPortrait=name=>element('canvas',name);
 bagItemIcon=name=>element('span',name);
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
  choose:name=>{const b=buttons().find(b=>label(b)===name && !b.disabled);if(!b)throw Error('Missing '+name+' on '+byId('rogue-status').textContent);b.onclick();},
  options:()=>buttons().filter(b=>!b.disabled).map(label),
  status:()=>byId('rogue-status').textContent,
  snapshot:()=>readRogueProgress(),
  finish:won=>window.ArenaRoguelit.finish(won),
  actor:mon=>unit(mon.name,0,0,true,mon.level,mon),
  validMove:(mon,move)=>legalMoves(mon).includes(move) && isVisibleArenaMove(move),
  liveMap:type=>randomArenaMap(type).type
 };
`;
const program=new vm.Script(engine+'\n'+ui+'\n'+read('roguelit.js')+'\n'+api,{filename:'roguelit-test.js'});
const key='pokemon-arena-roguelit-progress',walletKey='pokemon-arena-wild-progress';
const storage=new Map([[key,JSON.stringify({shards:85,best:7,ranks:{level:2,health:1}})],['pokemon-arena-team','["Ditto"]']]);
function boot(store){const c=vm.createContext({storage:store,console,structuredClone,setTimeout(){},clearTimeout(){}});program.runInContext(c);c.testGame.home();return c.testGame;}
const json=x=>JSON.parse(JSON.stringify(x));
let g=boot(storage);
const run=()=>g.snapshot().expedition;
const wallet=()=>JSON.parse(storage.get(walletKey) ?? '{}');
const choose=x=>g.choose(x);
const first=()=>choose(g.options()[0]);
choose('Permanent upgrades');choose('Power · 0/10');
assert.equal(g.snapshot().shards,70);assert.equal(g.snapshot().ranks.level,2);assert.equal(g.snapshot().ranks.offense,1);
choose('Back to Roguelit');choose('Start expedition');
assert.equal(run().options.length,5);first();assert.equal(run().members[0].level,12);
const draft=json(run());g=boot(storage);choose('Resume expedition');
assert.deepEqual(json(run()),draft);assert.deepEqual(json(g.options()),draft.options);
while(run().step==='moves')first();
assert.equal(new Set(run().members[0].moves).size,run().members[0].moves.length);
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
 g.finish(true);assert.equal(wallet().battlePass.testCredits,credits);
 assert.equal(g.snapshot().shards,expectedShards);assert.equal(run().step,'reward');
}
function recruit(){
 const target=run().rewards.recruits[0].name,was=run().members.length,drop=run().members.at(-1).name;
 choose('Recruit a teammate');choose(target);
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
bag=JSON.parse(separate.get(walletKey));assert.equal(bag.vitamins['EXP Candy 100'],1);assert.equal(bag.vitamins['EXP Candy 250'] ?? 0,0);
assert.equal(bag.balls[2],greatBallsBefore+2);assert.equal(h.snapshot().expedition.lastPayout.first,undefined);
console.log('Roguelit passed drafting, checkpoints, recovery after partial writes, eight permanent upgrades, main-game coins and bag rewards, first clears, recruits, held gear, tutoring, all three bosses and endless play.');
