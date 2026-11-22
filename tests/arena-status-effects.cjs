const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
function between(source,start,end) {
 const i=source.indexOf(start),j=source.indexOf(end,i);
 assert(i>=0 && j>i,start);
 return source.slice(i,j);
}

// Exercise the authoritative state that both the browser and the online battle view use.
const probe=`
export function statusCase(id,options={}) {
 const match={id:'00000056-1234-4000-a000-000000000001',mode:'free_fight',format:1,
  host_pick:['Mew'],guest_pick:['Blissey'],host_entries:{},guest_entries:{}};
 initializeOnline(match);clock=2;
 for(const [side,a] of [allies[0],enemies[0]].entries()){
  Object.assign(a,{x:300+side*28,y:210,entryPending:false,revealed:true,ability:side?options.ability:options.source,
   heldItem:null,type:side?(options.type??'Normal'):'Normal',singleType:true,hp:2000,max:2000});
  Object.assign(trainerFields[side][0],{actor:a,transition:null});
 }
 function snapshot(){return onlineView(saveOnlineState(),'host',match.mode);}
 const applied=tryAilment(enemies[0],id,allies[0]);
 const initial=snapshot();loadOnlineState(JSON.parse(JSON.stringify(saveOnlineState())));
 const restored=snapshot(),a=allies[0],b=enemies[0];
 function step(frames){for(let i=0;i<frames;i++){clock+=1/60;tickStatus(b,1/60);}}
 if(options.cure){clock+=.5;additionalStatusMoves['Heal Bell'].apply(b);}
 else step(options.frames??425);
 const later=snapshot();
 if(applied && id===2 && !options.cure){a.ability='No Guard';resolveOffensiveMove(a,'Pound',moveRules('Pound'),b,[b]);}
 return {applied,id:b.onlineId,initial,restored,later,final:snapshot()};
}
`;

function surface() {
 const commands=[],stack=[];
 const base={canvas:{width:960,height:480},globalAlpha:1,measureText:()=>({width:20}),
  save(){stack.push(this.globalAlpha);},restore(){assert(stack.length);this.globalAlpha=stack.pop();}};
 const ctx=new Proxy(base,{get(obj,key){
  if(key in obj)return obj[key];
  return (...args)=>{
   for(const arg of args)if(typeof arg==='number')assert(Number.isFinite(arg),key);
   if(key==='arc'||key==='ellipse')assert(args[2]>=0);
   commands.push([key,...args]);
  };
 }});
 return {ctx,commands,stack};
}

function checkActorRendering() {
 const html=read('index.html'),statuses=read('assets/arena-status-effects.js');
 const actor={name:'Mew',type:'Psychic',x:120,y:100,hp:400,max:400,friendly:true,facing:1,hit:0,hitSpan:.2,
  attack:0,attackSpan:.5,attackX:0,attackY:0,hitX:0,hitY:0};
 const image={naturalWidth:90},sheet={image:{naturalWidth:140},cellWidth:23,cellHeight:26,padding:2};
 const frame={page:0,sx:3,sy:4,width:18,height:22,x:-9,y:-24};
 const sprite={image:{naturalWidth:70},width:17,height:20,sx:2,sy:11};
 const canvas=surface(),tints=[];
 const math=Object.create(Math);
 math.random=()=>{throw Error('Status animations must not consume combat RNG');};
 const view=vm.createContext({Math:math,clock:2,onlineVisualClock:2,phase:'battle',arenaMap:{},dex:{Mew:[151]},
  battleSpriteScale:2,moveColors:{Psychic:'pink'},getSprite:()=>sprite,battleArt:()=>sprite,actorSpriteVariant:()=>null,
  motionPose:()=>['idle',0],pmdBattleFrame:()=>frame,pmdImage:()=>image,isFlying:()=>false,
  buildMotionSheet:()=>sheet,motionRows:['idle'],framesPerMotion:8,registeredPokemon:new Set(),ctx:canvas.ctx,
  document:{createElement:()=>{const crop=surface();tints.push(crop);return {getContext:()=>crop.ctx};}}});
 vm.runInContext(statuses+'\n'+between(html,'function drawBattleFrame(','\nlet dpsSnapshot;'),view);
 const art=view.ArenaStatusEffects,bounds=[],draw=art.draw;
 art.draw=(ctx,b,t,front,mirror)=>{bounds.push({b,t,front,mirror});draw(ctx,b,t,front,mirror);};
 function render(values,visible=true) {
  bounds.length=0;canvas.commands.length=0;
  view.drawUnit({...actor,...values},visible);
  assert.equal(canvas.stack.length,0);assert.equal(canvas.ctx.globalAlpha,1);
  return canvas.commands.slice();
 }
 const trace=values=>JSON.stringify(render(values));
 const drawings=new Set(),clean=trace({});
 for(const ailment of [1,2,3,4,5,6]){
  view.clock=2;const early=trace({ailment});assert.notEqual(early,clean);
  assert.deepEqual(bounds.map(x=>x.front),[false,true]);
  assert.equal(bounds[0].b.x,120);assert.equal(bounds[0].b.y,91);
  assert.equal(bounds[0].b.h,44);assert.equal(bounds[0].b.ailment,ailment);drawings.add(early);
  view.clock=2.424;assert.notEqual(trace({ailment}),early);
  assert.equal(trace({ailment:null}),clean);assert.equal(bounds.length,0);
 }
 assert.equal(drawings.size,6);
 render({ailment:3,x:180,y:120,raidForm:'Mega Charizard X'});
 assert.equal(bounds[0].b.x,180);assert.equal(bounds[0].b.h,132);
 render({ailment:4,x:129,y:116});assert.equal(bounds[0].b.x,129);assert.equal(bounds[0].b.y,107);
 const frozen=render({ailment:3}).find(row=>row[0]==='drawImage')[1];
 assert.notEqual(frozen,image);assert.equal(tints.length,1);
 assert.deepEqual(tints[0].commands[0],['drawImage',image,3,4,18,22,0,0,18,22]);
 assert.equal(tints[0].ctx.globalCompositeOperation,'source-atop');
 assert.equal(render({}).find(row=>row[0]==='drawImage')[1],image);
 view.pmdBattleFrame=()=>null;
 assert.notEqual(render({ailment:3}).find(row=>row[0]==='drawImage')[1],sheet.image);
 assert.equal(render({}).find(row=>row[0]==='drawImage')[1],sheet.image);
 view.motionPose=()=>['other',0];
 assert.notEqual(render({ailment:3}).find(row=>row[0]==='drawImage')[1],sprite.image);
 assert.equal(render({}).find(row=>row[0]==='drawImage')[1],sprite.image);
 sprite.image.naturalWidth=0;
 render({ailment:3});assert.equal(bounds[0].b.h,20);
 assert(render({ailment:6,hp:0}).length===0);
 assert.equal(JSON.stringify(render({ailment:6},false)),trace({}));assert.equal(bounds.length,0);
 view.phase='online-battle';view.onlineVisualClock=5;view.arenaMap.viewMirror=true;
 render({ailment:null,displayedStatus:{ailment:2,puppetUntil:0}});assert.equal(bounds[0].b.ailment,2);assert(bounds[0].mirror);
 const bubbles=trace({displayedStatus:{ailment:5,puppetUntil:0}});
 assert.notEqual(trace({displayedStatus:{ailment:5,puppetUntil:6}}),bubbles);assert(bounds[0].b.puppeted);
 view.onlineVisualClock=6;
 render({displayedStatus:{ailment:5,puppetUntil:6}});assert(!bounds[0].b.puppeted);
 assert.equal(trace({ailment:4,displayedStatus:{ailment:null}}),trace({}));
 assert(html.includes('!slot.transition && slot.actor?.hp>0'));
 assert(html.includes('drawUnit(actor,battling)'));
}

// Feed the actual snapshot receiver and interpolation loop. A cure or new ailment must follow its displayed frame.
function checkOnlinePlayback(initial,cleared,id,mode,side,mirror) {
 const source=read('multiplayer.js'),heard=[];
 const view=vm.createContext({active:{mode,side},megaRaidTiers:{coop_mega_master:{}},window:{},canvas:{width:960},
  performance:{now:()=>3200},arenaActors:new Map(),playSkillSound:(...args)=>heard.push(args),visualSnapshots:[],arrivalGaps:[],
  displayedTurn:0,battleSnapshot:null,playbackClock:null,playbackDelay:.25,snapshotArrival:0,
  frameAge:0,visualTime:0,onlineVisualClock:0,byId:()=>({}),clamp:(n,min,max)=>Math.min(max,Math.max(min,n)),
  setArenaDimensions(){},updateNormalAttackToggle(){},renderBattleDps(){},updateOnlineRoster(){},updateActivePanels(){},paint(){}});
 vm.runInContext(read('assets/arena-sound.js'),view);
 view.soundTimeline=view.ArenaMoveAudio.createTimeline();
 vm.runInContext(source.split('\n').find(line=>line.includes('const isCoop='))+'\n'+
  between(source,' function showBattleSnapshot(',' function updateOnlineRoster(')+'\n'+
  between(source,' window.paintOnlineBattle=dt=>',' const originalMenu='),view);
 const post=(turn,battle)=>view.showBattleSnapshot({turn,battle},()=>{});
 const at=t=>{view.playbackClock=t;view.window.paintOnlineBattle(0);return view.arenaActors.get(id);};
 const startCue={clock:initial.clock,order:0,move:'Thunder',event:'release'};
 post(1,{...initial,sounds:[startCue]});
 assert.equal(heard.length,0,'snapshot receipt is silent until displayed');
 const before=at(initial.clock);
 assert.equal(heard.length,1);assert.equal(heard[0][0],'Thunder');
 assert.equal(before.displayedStatus.ailment,4);assert.equal(view.arenaMap.viewMirror,mirror);
 const from=initial.actors.find(a=>a.onlineId===id).x;
 const second=JSON.parse(JSON.stringify(cleared));second.actors.find(a=>a.onlineId===id).x=from+40;
 second.sounds=[startCue,{clock:cleared.clock,order:0,move:'Weather Ball',variant:'Rain',event:'release'}];
 post(2,second);
 assert.equal(heard.length,1,'an overlapping packet and a future event do not play early');
 const interpolated=at((initial.clock+cleared.clock)/2);
 assert.equal(interpolated.ailment,null);assert.equal(interpolated.displayedStatus.ailment,4);
 assert.equal(heard.length,1);
 assert.equal(interpolated.x,mirror?960-(from+20):from+20);
 assert.equal(at(cleared.clock).displayedStatus.ailment,null);
 assert.deepEqual(heard[1],['Weather Ball','release',undefined,0,'Rain']);assert.equal(heard.length,2);
 const legacy=JSON.parse(JSON.stringify(initial));legacy.clock=cleared.clock+1;
 for(const entry of legacy.actors){delete entry.ailment;delete entry.puppetUntil;}
 post(3,legacy);assert.equal(at(legacy.clock).displayedStatus.ailment,null);assert.equal(at(legacy.clock).displayedStatus.puppetUntil,0);
}

(async()=>{
 const engine=await import('data:text/javascript;base64,'+Buffer.from(read('supabase/functions/arena-combat/engine.js')+probe).toString('base64'));
 const actor=(run,snapshot)=>run[snapshot].actors.find(a=>a.onlineId===run.id);
 for(const condition of [1,2,3,4,5,6]){
  const run=engine.statusCase(condition);assert(run.applied);
  assert.equal(actor(run,'initial').ailment,condition);assert.equal(actor(run,'restored').ailment,condition);
  assert.equal(actor(run,'later').ailment,null);
  if(condition===2){
   const sleeping=engine.statusCase(2,{frames:120});
   assert.equal(actor(sleeping,'later').ailment,2);
   assert.equal(actor(sleeping,'final').ailment,null,'A hit wakes the target before the five-second limit');
  }
  assert.equal(actor(run,'final').ailment,null);
  const cured=engine.statusCase(condition,{cure:true});assert.equal(actor(cured,'later').ailment,null);
 }
 for(const [condition,options] of [[1,{type:'Electric'}],[2,{ability:'Insomnia'}],[3,{type:'Ice'}],[4,{type:'Fire'}],[5,{type:'Steel'}],[6,{ability:'Own Tempo'}]]){
  const run=engine.statusCase(condition,options);assert.equal(run.applied,false);assert.equal(actor(run,'initial').ailment,null);
 }
 const puppet=engine.statusCase(5,{source:'Poison Puppeteer',frames:250});
 assert.equal(actor(puppet,'restored').puppetUntil,6);assert.equal(actor(puppet,'later').ailment,5);
 assert(actor(puppet,'later').puppetUntil<puppet.later.clock);
 checkActorRendering();
 const burn=engine.statusCase(4,{cure:true});
 for(const [mode,side,mirror] of [['free_fight','host',false],['free_fight','guest',true],['coop_mega_master','raid:p2',false]])
  checkOnlinePlayback(burn.initial,burn.later,burn.id,mode,side,mirror);
 console.log('Six animated status conditions passed application, immunity, recovery, sprite, and buffered PvP/co-op playback checks.');
})().catch(error=>{console.error(String(error.stack).replace(/data:text\/javascript;base64,[^:)]*/g,'engine.js').slice(0,1800));process.exitCode=1;});
