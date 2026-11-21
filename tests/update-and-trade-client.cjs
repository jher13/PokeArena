const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('index.html');
let checks=0;
class Node {
 constructor(tag='div',text='',cls=''){this.tagName=tag;this.textContent=text??'';this.children=[];this.attributes={};this.classes=new Set((cls??'').split(' ').filter(Boolean));this.style={setProperty(){}};this.value='';this.open=false;this.events={};
  this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),toggle:(x,yes)=>yes?this.classes.add(x):this.classes.delete(x)};
 }
 append(...xs){for(const x of xs){if(x instanceof Node)x.parent=this;this.children.push(x);}}
 prepend(...xs){this.children.unshift(...xs);}
 replaceChildren(...xs){this.children=[];this.append(...xs);}
 setAttribute(k,v){this.attributes[k]=String(v);}
 removeAttribute(k){delete this.attributes[k];}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn);}
 focus(){this.focused=true;}
 getContext(){return {beginPath(){},moveTo(){},lineTo(){},closePath(){},stroke(){},fill(){},fillText(){}};}
 showModal(){this.open=true;}
 close(){this.open=false;for(const f of this.events.close??[])f();}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 matches(selector){if(selector.startsWith('[')){const parts=selector.match(/^\[([^=]+)="([^"]+)"\]$/);return parts&&this.attributes[parts[1]]===parts[2];}return selector.startsWith('.')?this.classes.has(selector.split(/[\[ ]/)[0].slice(1))&&(!selector.includes('[open]')||this.open):selector.startsWith('dialog')?this.tagName==='dialog'&&(!selector.includes('[open]')||this.open):this.tagName===selector;}
 all(){return this.children.filter(x=>x instanceof Node).flatMap(x=>[x,...x.all()]);}
 querySelector(selector){return this.all().find(x=>x.matches(selector))??null;}
}
function dom(){
 const body=new Node('body'),nodes=new Map();
 const byId=id=>{if(!nodes.has(id)){const n=new Node(id==='home-dialog'?'dialog':'div');nodes.set(id,n);body.append(n);}return nodes.get(id);};
 return {body,byId,element:(...xs)=>new Node(...xs),document:{body,addEventListener(){},querySelector:s=>body.querySelector(s)}};
}
async function updateChecks(){
 const d=dom();let now=0,waitHook=null,flushHook=null,fetchHook=null;const redirects=[];
 const ctx=vm.createContext({...d,window:{},location:{protocol:'https:',href:'https://example.test/PokeArena/',pathname:'/PokeArena/',replace:url=>redirects.push(url)},URL,AbortSignal,
  Date:class extends Date{static now(){return now;}},setTimeout:fn=>{now+=1000;if(waitHook)waitHook();queueMicrotask(fn);},
  fetch:async()=>{if(fetchHook)await fetchHook();return {ok:true,json:async()=>({version:'9.0.0'})};},
  flushArenaSave:async()=>{if(flushHook)await flushHook();},saving:false,
  phase:'home',selectedWild:null,selectedTrainer:null,repeatTimer:null,wildProgress:{autoRepeat:true},trainerOptions:{autoRepeat:true},updateLogEntries:[{version:JSON.parse(read('version.json')).version}]});
 vm.runInContext(html.slice(html.indexOf('let clientVersionCheckPending='),html.indexOf("window.addEventListener('focus'")),ctx);
 const safe=()=>vm.runInContext('canCheckGameVersion()',ctx);
 assert(safe(),'Saved Auto repeat preferences alone must not block menu updates');checks++;
 for(const kind of ['wild','trainer'])for(const phase of ['battle','wild-result','evolution','trainer-result','wild-select','trainer-select']){
  ctx.phase=phase;ctx.selectedWild=kind==='wild'?{}:null;ctx.selectedTrainer=kind==='trainer'?{}:null;
  assert(!safe(),kind+' automatic session in '+phase);checks++;
 }
 ctx.selectedWild=null;ctx.selectedTrainer=null;ctx.phase='home';ctx.repeatTimer=42;assert(!safe());checks++;
 ctx.repeatTimer=null;ctx.phase='contract-battle';assert(!safe());ctx.phase='home';checks++;
 ctx.window.ArenaCampaign={isBusy:()=>true};assert(!safe());ctx.window.ArenaCampaign={isBusy:()=>false};checks++;
 ctx.window.isArenaMarketBusy=()=>true;assert(!safe());ctx.window.isArenaMarketBusy=()=>false;checks++;
 ctx.wildResult={capture:{pending:true}};assert(!safe(),'A single automatic capture also needs protection');ctx.wildResult=null;checks++;
 const evolution=new Node('dialog',null,'evolution-dialog');d.body.append(evolution);evolution.showModal();assert(!safe());evolution.close();checks++;
 fetchHook=()=>{ctx.selectedWild={};};await ctx.checkGameVersion();assert.equal(redirects.length,0,'A battle started during manifest fetch must win the race');checks++;
 ctx.selectedWild=null;fetchHook=null;waitHook=()=>{ctx.selectedTrainer={};};await ctx.restartUpdatedClient('9.0.0');assert.equal(redirects.length,0);assert(!d.body.querySelector('.client-update-dialog'));checks++;
 ctx.selectedTrainer=null;waitHook=null;flushHook=()=>{ctx.selectedWild={};};await ctx.restartUpdatedClient('9.0.0');assert.equal(redirects.length,0,'Recheck after cloud flush');checks++;
 ctx.selectedWild=null;flushHook=null;await ctx.restartUpdatedClient('9.0.0');assert.equal(redirects.length,1);assert.match(redirects[0],/gameVersion=9.0.0/);checks++;
}
function storage(){const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i],getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};}
const pcFilterCode=html.slice(html.indexOf('const pcFilterKey='),html.indexOf('function appendFilterOption('));
function pcPreferenceChecks(){
 const local=storage();
 function open(profile){
  const d=dom(),ctx=vm.createContext({...d,localStorage:local,playerSaveKey:key=>profile+'/'+key});
  vm.runInContext(html.match(/^const maxTotalIVs=.+;$/m)[0]+'\n'+pcFilterCode,ctx);
  ctx.bindPcBox(d.byId,()=>{});
  return d.byId;
 }
 const main=open('one');
 const change=(control,id,value)=>{const input=control(id);input.value=value;(input.oninput??input.onchange)();};
 const settings={'box-search':'#0026','box-generation':'1','pc-element':'Electric','pc-nature':'Timid','pc-personality':'Mischievous','pc-favorites':'only','pc-sort':'level','pc-order':'desc','pc-min-iv':'90','pc-min-ev':'400'};
 for(const [id,value] of Object.entries(settings))change(main,id,value);
 change(main,'pc-min-iv','150');assert.equal(open('one')('pc-min-iv').value,'93');checks++;
 change(main,'pc-min-iv','90');
 const raid=open('one');
 for(const [id,value] of Object.entries(settings))assert.equal(raid(id).value,value,id);
 change(raid,'pc-stat','0');
 const restored=open('one');assert.equal(restored('pc-stat').value,'0');assert.equal(restored('pc-min-iv').value,'31');assert.equal(restored('pc-min-ev').value,'252');checks++;
 assert.equal(open('two')('pc-sort').value,'number');assert.equal(open('two')('box-search').value,'');checks++;
 restored('pc-reset').onclick();
 assert.equal(open('one')('pc-order').value,'asc');assert.equal(open('one')('pc-favorites').value,'');assert.equal(open('one')('pc-min-iv').max,93);checks++;
 local.setItem('two/pokemon-arena-pc-filters','{broken');
 assert.equal(open('two')('box-generation').value,'0');checks++;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function cloudChecks(){
 const d=dom(),local=storage(),session=storage();let saveWrites=0,marketCalls=[],failures=0,loseResponse=false,heldResolve=null,lastResult;
 const save={version:2,entries:Object.fromEntries(['team','moves','profiles','wild-progress','gym-badges','starter','roguelit-progress','trainer-options','music','sfx','gym-badges/master','gym-badges/clean-records'].map(key=>['pokemon-arena-'+key,null]))};
 Object.assign(save.entries,{'pokemon-arena-team':'["Charmander"]','pokemon-arena-profiles':'{"4":{"pid":3,"ivs":[31,31,31,31,31,31],"evs":[0,0,0,0,0,0]}}','pokemon-arena-moves':'{"Charmander":["Ember"]}',
  'pokemon-arena-wild-progress':JSON.stringify({coins:9000,owned:{Charmander:{level:50,xp:1}},copies:{},registered:['Charmander'],autoRepeat:true,items:{'Rare Candy':2}})});
 const client={rpc:async(name,params)=>{
  if(name==='arena_write_save'){saveWrites++;return {data:{status:'ok',updated_at:'r1'}};}
  marketCalls.push({...params,rpc:name});if(heldResolve)await new Promise(resolve=>{heldResolve=resolve;});
  if(params.action==='notices')return {data:{notices:[],pending:1}};
  if(failures>0){failures--;throw Error('Offline');}
  lastResult={status:'ok',save_data:structuredClone(save),updated_at:'r2'};
  if(loseResponse){loseResponse=false;throw Error('Response lost after commit');}
  return {data:lastResult};
 }};
 const ctx=vm.createContext({...d,window:{addEventListener(){}},localStorage:local,sessionStorage:session,playerStorage:local,playerSaveKey:key=>key,
  MutationObserver:class{observe(){}},setTimeout,clearTimeout,setInterval:()=>0,clearInterval,queueMicrotask,crypto:require('node:crypto').webcrypto,
  phase:'home',automaticBattleLoopActive:()=>false,team:['Bulbasaur'],profiles:{1:{pid:1}},loadouts:{Bulbasaur:['Tackle']},savedMoves:{Bulbasaur:['Tackle']},
  wildProgress:{owned:{Bulbasaur:{level:1,xp:0}},coins:10000,autoRepeat:true},registeredPokemon:new Set(['Bulbasaur']),inspected:'Bulbasaur',activeSlot:0,
  gymRematchRecords:{},onlineSaveId:null,openMenu(){},console});
 for(const key of ['maxTotalIVs','profileStorage','progressKey'])vm.runInContext(html.match(new RegExp('^const '+key+'=.+;$','m'))[0],ctx);
 vm.runInContext(html.slice(html.indexOf('function validProfileData('),html.indexOf('function profileFor(')),ctx);
 vm.runInContext(html.slice(html.indexOf('function personalityIdOf('),html.indexOf('function personalityTrait(')),ctx);
 vm.runInContext(html.slice(html.indexOf('function applyArenaMarketMemory('),html.indexOf('\nfor(const name of team) wildProgress.owned',html.indexOf('function applyArenaMarketMemory('))),ctx);
 vm.runInContext(read('cloud.js').replace('installAccountGate();',''),ctx);
 ctx.testClient=client;vm.runInContext("cloudAccount='user-one';cloudRevision='r0';cloudClient=async()=>testClient;",ctx);
 ctx.phase='battle';await assert.rejects(()=>ctx.window.arenaMarketMutate('buy',{id:'x'}),/main menu/);assert.equal(marketCalls.length,0);checks++;
 ctx.phase='home';loseResponse=true;const result=await ctx.window.arenaMarketMutate('buy',{id:'x'});
 assert.equal(result.status,'ok');assert.equal(marketCalls.length,2);assert.equal(marketCalls[0].args.request_id,marketCalls[1].args.request_id);checks++;
 assert.deepEqual([...ctx.team],['Charmander']);assert.equal(ctx.wildProgress.coins,9000);assert.equal(ctx.wildProgress.autoRepeat,true);assert.equal(ctx.wildProgress.items['Rare Candy'],2);assert(!ctx.loadouts.Bulbasaur);assert(ctx.savedMoves.Charmander);assert(ctx.registeredPokemon.has('Charmander'));checks++;
 failures=2;await assert.rejects(()=>ctx.window.arenaMarketMutate('claim'),/Offline/);assert(ctx.window.isArenaMarketBusy());checks++;
 vm.runInContext('dirty=true',ctx);await ctx.flushArenaSave();assert.equal(saveWrites,0,'Pending ambiguous transactions must never upload an older PC snapshot');checks++;
 vm.runInContext('dirty=false',ctx);const retryId=marketCalls.at(-1).args.request_id;await ctx.window.arenaMarketRecover();assert.equal(marketCalls.at(-1).args.request_id,retryId);assert(!ctx.window.isArenaMarketBusy());checks++;
 heldResolve=true;const pending=ctx.window.arenaMarketMutate('claim');await tick();assert(ctx.window.isArenaMarketBusy());await assert.rejects(()=>ctx.window.arenaMarketMutate('claim'),/still syncing/);const resolve=heldResolve;heldResolve=null;resolve();await pending;checks++;
 ctx.phase='gyms';failures=2;await assert.rejects(()=>ctx.window.arenaCampaignMutate('claim_region',{region:'Kanto'}),/Offline/);assert(ctx.window.isArenaMarketBusy());const campaignRetry=marketCalls.at(-1).args.request_id;ctx.phase='menu';await ctx.window.arenaMarketRecover();assert.equal(marketCalls.at(-1).rpc,'arena_campaign');assert.equal(marketCalls.at(-1).args.request_id,campaignRetry);assert(!ctx.window.isArenaMarketBusy());checks++;
 ctx.phase='home';failures=2;
 await assert.rejects(()=>ctx.window.arenaMarketMutate('offer',{id:'room',version:2},'direct'),/Offline/);
 const directRetry=marketCalls.at(-1).args.request_id;
 await ctx.window.arenaMarketRecover();
 assert.equal(marketCalls.at(-1).rpc,'arena_direct_trade');assert.equal(marketCalls.at(-1).args.request_id,directRetry);
 assert(!ctx.window.isArenaMarketBusy());checks++;
 const before=marketCalls.length;ctx.phase='battle';await ctx.window.arenaMarketNotifications();await tick();assert.equal(marketCalls.length,before+1,'Do not claim offline deliveries during battle');checks++;
 ctx.phase='home';
 let reloads=0,readSnapshot=async()=>({data:{save_data:save,updated_at:'r2'}});
 ctx.window.location={reload(){reloads++;}};ctx.window.confirm=()=>true;
 client.from=()=>({select(){return this;},eq(){return this;},maybeSingle(){return readSnapshot();}});
 const cloudButtons=()=>ctx.window.arenaCloudControls().filter(n=>n.tagName==='button').map(n=>n.textContent);
 assert.deepEqual([...cloudButtons()],['Save to cloud','Load cloud save','Re-sync']);
 assert.equal(await ctx.syncArenaCloud('sync'),'Cloud save is up to date.');assert.equal(reloads,0);checks++;
 let finishRead;
 readSnapshot=()=>new Promise(resolve=>{finishRead=resolve;});
 const raced=ctx.syncArenaCloud('load');await tick();ctx.window.queueArenaSave();
 finishRead({data:{save_data:save,updated_at:'r3'}});await assert.rejects(raced,/progress changed/);
 assert.equal(reloads,0);assert.equal(vm.runInContext('dirty',ctx),true);checks++;
 await ctx.syncArenaCloud('sync');assert.equal(saveWrites,1);
 readSnapshot=async()=>({data:{save_data:save,updated_at:'r3'}});
 await ctx.syncArenaCloud('sync');assert.equal(reloads,1);
 assert.equal(vm.runInContext('cloudRevision',ctx),'r3');checks++;
 vm.runInContext('cloudAccount=null',ctx);assert.equal(cloudButtons().length,0);checks++;
}
async function hubChecks(){
 const d=dom();d.byId('home-dialog').append(d.byId('home-dialog-content'));
 const gameDex=JSON.parse(html.match(/^const dex\s*=\s*(.+);$/m)[1]);
 const profile={pid:2,personalityId:11,ivs:[15,16,31,10,10,11],evs:Array(6).fill(0),abilityOverride:'Good as Gold'};
 const copyProfile={pid:10,personalityId:26,ivs:[10,20,8,10,13,31],evs:[4,0,0,0,4,252],abilityOverride:'Pressure',shiny:true};
 const sample={name:'Bulbasaur',number:1,generation:1,types:['Grass','Poison'],level:50,nature:'Adamant',personality:'Resilient',shiny:false,iv_total:93,ivs:profile.ivs,evs:profile.evs};
 const rows=[{selector:{name:'Bulbasaur',slot:0,fingerprint:'active'},pokemon:sample,profile},
  {selector:{name:'Bulbasaur',slot:1,fingerprint:'copy-two'},pokemon:{...sample,level:80,nature:'Modest',personality:'Mischievous',shiny:true,ivs:copyProfile.ivs,evs:copyProfile.evs,iv_total:92},profile:copyProfile},
  ...Object.entries(gameDex).filter(([,value])=>value[0]>1&&value[0]<=31||value[0]===150||value[0]===152).map(([name,value])=>({selector:{name,slot:0,fingerprint:'species-'+value[0]},
   pokemon:{...sample,name,number:value[0],generation:value[0]===152?2:1,types:value.slice(1,3).filter(Boolean)},profile}))];
 const calls=[],mutations=[];let listings=[];
 const ctx=vm.createContext({...d,localStorage:storage(),playerSaveKey:key=>key,window:{arenaMarketPrepare:async()=>{},arenaMarketRead:async(action,args)=>{calls.push({action,args});return action==='inventory'?{rows}:{rows:listings,total:listings.length};},
  arenaMarketMutate:async(action,args)=>{mutations.push({action,args});return {message:'Saved.'};}},wildProgress:{coins:10000,favorites:['Bulbasaur']},
  dexNames:Object.keys(gameDex),dex:gameDex,moveColors:{Grass:'#00aa00',Poison:'#aa00aa',Fire:'#ff0000'},typeChart:{Grass:{},Poison:{},Fire:{}},
  pokemonPortrait:()=>new Node('canvas'),idlePokemonPortrait:()=>new Node('canvas'),spriteVariants:()=>({shiny:'shiny'}),
  arenaAbilityDescriptions:{'Good as Gold':'Blocks hostile status moves.',Pressure:'Extends opposing cooldowns.'},
  dimensions:()=>[7,69],abilityFor:(_,p)=>p.abilityOverride,hiddenAbilityFor:()=>null,
  profileFor:()=>{throw Error('A Hub preview must never read or activate a local PC profile');},confirm:()=>true,console});
 vm.runInContext(html.slice(html.indexOf('const legendarySpecies='),html.indexOf('function catchChance(')),ctx);
 vm.runInContext(html.match(/^const dexStats\s*=\s*.+;$/m)[0],ctx);
 vm.runInContext(html.slice(html.indexOf('const natureNames=['),html.indexOf('const profileStorage=')),ctx);
 vm.runInContext(html.slice(html.indexOf('function natureOf('),html.indexOf('function isAvailablePokemon(')),ctx);
 vm.runInContext(html.slice(html.indexOf('function drawStats('),html.indexOf('function addEVs(')),ctx);
 vm.runInContext(pcFilterCode,ctx);
 vm.runInContext(read('trade-hub.js'),ctx);
 const content=d.byId('home-dialog-content'),allText=n=>[n,...n.all()].map(n=>n.textContent).join(' '),text=()=>allText(content);
 const button=label=>content.all().find(n=>n.tagName==='button'&&n.textContent===label);
 const input=label=>content.all().find(n=>n.attributes['aria-label']===label);
 const control=label=>content.all().find(n=>n.tagName==='button'&&n.attributes['aria-label']===label);
 const selectCopy=async(slot=0)=>{await control('Inspect Bulbasaur').onclick();if(slot)await control('Bulbasaur · Copy '+(slot+1)+' · Lv. 80').onclick();};
 await ctx.window.openTradingHub();assert(d.byId('home-dialog').open);for(const tab of ['Search','Sell','Request'])assert(button(tab));checks++;
 for(const label of ['Pokémon name','Pokédex number','Player IGN','Generation','Element','Nature','Personality','Appearance','Sort by'])assert(input(label));checks++;
 input('Nature').value='Timid';input('Nature').onchange();input('Player IGN').value='Nifty';input('Player IGN').oninput();
 content.all().find(n=>n.tagName==='form').onsubmit({preventDefault(){}});await tick();assert.equal(calls.at(-1).args.nature,'Timid');assert.equal(calls.at(-1).args.ign,'Nifty');checks++;
 await button('Sell').onclick();assert(content.querySelector('.market-pc-box'));assert(content.querySelector('.market-pc-preview'));assert.match(text(),/Box 1 \/ 2/);checks++;
 assert.equal(content.querySelector('.market-pc-grid').children.length,30);assert(control('Previous PC box').disabled);assert(!control('Next PC box').disabled);checks++;
 await control('Next PC box').onclick();assert.match(text(),/Box 2 \/ 2/);assert(control('Next PC box').disabled);assert.equal(content.querySelector('.market-pc-grid').children.length,3);checks++;
 await control('Previous PC box').onclick();assert(control('Previous PC box').disabled);checks++;
 const sort=key=>{input('PC sort by').value=key;input('PC sort by').oninput();};
 sort('legendary');assert.equal(content.querySelector('.market-pc-grid').children[0].attributes['aria-label'],'Inspect Mewtwo');checks++;
 sort('shiny');await control('Inspect Bulbasaur').onclick();
 assert.match(allText(content.querySelector('.market-pc-status')),/Copy 2 · Stored/);checks++;
 input('PC sort order').value='desc';input('PC sort order').oninput();
 assert.notEqual(content.querySelector('.market-pc-grid').children[0].attributes['aria-label'],'Inspect Bulbasaur');checks++;
 await button('Reset PC filters').onclick();
 // Select a different species first so choosing Bulbasaur starts from its Active entry.
 await control('Inspect Ivysaur').onclick();
 await selectCopy();let status=content.querySelector('.market-pc-status');assert.match(allText(status),/Adamant/,text());assert.match(allText(status),/Good as Gold/);assert(status.querySelector('.individual-stats'));checks++;
 const activeChart=status.querySelector('.stat-chart').attributes['aria-label'];await control('Bulbasaur · Copy 2 · Lv. 80').onclick();status=content.querySelector('.market-pc-status');
 const descriptionOf=prefix=>status.all().find(n=>n.textContent.startsWith(prefix)).attributes['data-pc-help'];
 assert.equal(descriptionOf('Ability: Pressure'),ctx.arenaAbilityDescriptions.Pressure);
 assert.equal(descriptionOf('Personality: Mischievous (++Sp. Atk)'), '+2 bonus Sp. Atk per 10 levels.');checks++;
 assert.match(allText(status),/Modest/);assert.match(allText(status),/Pressure/);assert.match(allText(status),/Copy 2 · Stored/);assert.match(allText(status),/Lv. 80/);assert.notEqual(status.querySelector('.stat-chart').attributes['aria-label'],activeChart);checks++;
 assert.equal(status.querySelector('.stat-chart').attributes['aria-label'],['HP','Attack','Defense','Speed','Sp. Def','Sp. Atk'].map((name,i)=>name+' '+ctx.calculatedStats('Bulbasaur',copyProfile,80)[i]).join(', '));checks++;
 assert.equal(mutations.length,0,'Previewing a copy must not mutate or activate it');assert.equal(profile.pid,2);checks++;
 input('PC nature').value='Modest';input('PC nature').oninput();assert.equal(content.querySelector('.market-pc-grid').children.length,1);assert.match(text(),/2 total · 1 matching/);checks++;
 input('PC nature').value='Adamant';input('PC nature').oninput();assert.match(allText(content.querySelector('.market-pc-status')),/Select a Pokémon/);checks++;
 input('Starting bid (optional)').value='100';input('Buy now price (optional)').value='500';await content.all().find(n=>n.tagName==='form').onsubmit({preventDefault(){}});assert.equal(mutations.length,0,'A filter hiding the selected copy must clear the trade selection');checks++;
 await button('Reset PC filters').onclick();input('PC generation').value='2';input('PC generation').onchange();assert.equal(content.querySelector('.market-pc-grid').children.length,1);assert(control('Inspect Chikorita'));checks++;
 await button('Reset PC filters').onclick();input('Search PC storage').value='#0001';input('Search PC storage').oninput();assert.equal(content.querySelector('.market-pc-grid').children.length,1);checks++;
 input('Search PC storage').value='mischievous';input('Search PC storage').oninput();await selectCopy();assert.match(allText(content.querySelector('.market-pc-status')),/Copy 2 · Stored/);checks++;
 await content.all().find(n=>n.tagName==='form').onsubmit({preventDefault(){}});assert.equal(mutations.at(-1).action,'create_auction');assert.equal(mutations.at(-1).args.selector.fingerprint,'copy-two');assert.equal(mutations.at(-1).args.buy_now,500);checks++;
 input('PC stat').value='5';input('PC stat').oninput();assert.equal(input('PC minimum IV').max,31);assert.equal(input('PC minimum EV').max,252);checks++;
 input('PC minimum EV').value='252';input('PC minimum EV').oninput();assert.equal(content.querySelector('.market-pc-grid').children.length,1);checks++;
 await button('Reset PC filters').onclick();input('PC favorites').value='only';input('PC favorites').oninput();assert.equal(content.querySelector('.market-pc-grid').children.length,1);assert(control('Inspect Bulbasaur'));checks++;
 await button('Reset PC filters').onclick();input('PC sort by').value='level';input('PC sort by').oninput();input('PC sort order').value='desc';input('PC sort order').oninput();assert.equal(content.querySelector('.market-pc-grid').children[0].attributes['aria-label'],'Inspect Bulbasaur');await selectCopy();assert.match(allText(content.querySelector('.market-pc-status')),/Lv. 80/);checks++;
 input('PC copies').value='stored';input('PC copies').oninput();
 await button('Request').onclick();assert(input('Search requests for'));await button('Create request').onclick();
 assert.equal(input('PC sort by').value,'level');assert.equal(input('PC sort order').value,'desc');assert.equal(input('PC copies').value,'stored');checks++;
 await selectCopy(1);assert.match(allText(content.querySelector('.market-pc-status')),/Copy 2 · Stored/);checks++;
 input('Pokémon you want').value='charmander';input('Wanted nature').value='Timid';input('Wanted personality').value='Swift';input('Wanted appearance').value='true';
 await content.all().find(n=>n.tagName==='form').onsubmit({preventDefault(){}});const wanted=mutations.at(-1);assert.equal(wanted.action,'create_request');assert.equal(wanted.args.selector.fingerprint,'copy-two');assert.equal(wanted.args.want.name,'Charmander');assert.equal(wanted.args.want.personality,'Swift');assert.equal(wanted.args.want.shiny,true);checks++;
 assert(ctx.window.arenaMarketMatchesWanted({...sample,name:'Charmander',nature:'Timid',personality:'Swift',shiny:true},wanted.args.want));assert(!ctx.window.arenaMarketMatchesWanted({...sample,name:'Charmander'},wanted.args.want));checks++;
 await button('Browse requests').onclick();listings=[{id:'request-one',kind:'request',pokemon:sample,seller:'Brock',want:{name:'Bulbasaur'},ends_at:new Date(Date.now()+86400000).toISOString(),status:'open'}];
 await button('Refresh').onclick();await button('Offer a matching Pokémon').onclick();assert(content.querySelector('.market-listing-expanded'));await selectCopy(1);input('PC appearance').value='false';input('PC appearance').oninput();assert(button('Complete this trade').disabled);checks++;
 input('PC appearance').value='';input('PC appearance').oninput();await selectCopy(1);await button('Complete this trade').onclick();assert.equal(mutations.at(-1).action,'fulfill');assert.equal(mutations.at(-1).args.selector.fingerprint,'copy-two');checks++;
 d.byId('home-dialog').close();assert(!d.byId('home-dialog').classes.has('trade-hub-dialog'));checks++;
}

(async()=>{pcPreferenceChecks();await updateChecks();await cloudChecks();await hubChecks();console.log(checks+' client checks passed: automatic session update guards, transaction recovery, PC filter persistence, live PC imports and all Hub tabs.');})().catch(error=>{console.error(error);process.exitCode=1;});
