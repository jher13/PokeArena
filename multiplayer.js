(() => {
 const isCoop=mode=>mode==='coop' || mode==='coop_gigantamax' || Object.hasOwn(megaRaidTiers,mode);
 const multiplayerSource=document.currentScript.src;
 const dialog=byId('home-dialog');
 function onlineRetryMessage(error,online){
  const network=!online || error instanceof TypeError && /fetch|network|load failed/i.test(error.message);
  return (network?'Connection lost. Retrying… ':'Online battle error. Retrying… ')+error.message;
 }
 let generation=0, timer, active, inviteView=null;
 let pvpVersionContext=false;
 window.isPvpVersionContext=()=>pvpVersionContext;
 window.isCompletedRaid=()=>Boolean(active?.result && isCoop(active.mode));
 let arenaActors=new Map(), rosterRows=new Map(), displayedTurn=-1, recallSlotOnline=null;
 let frameAge=0, playbackClock=null, playbackDelay=0.32, snapshotArrival=0, arrivalGaps=[], visualSnapshots=[], soundTimeline=null, battleSnapshot=null;
 const commands={Attack:'a',Select:'s',Ranged:'r',Backline:'d',Melee:'m','Mid-Range':'c',Auto:'z',
  Aggressive:'q',Balanced:'w',Defensive:'e'};
 for(let i=1;i<=6;i++){commands['Ally '+i]=String(i);commands['Enemy '+i]='ctrl+'+i;}
 const keyStorage='pokemon-arena-pvp-keys';
 let bindings={...commands};
 try {bindings={...commands,...JSON.parse(playerStorage.getItem(keyStorage) ?? '{}')};}catch {}
 let selectedUnit=null, commandMode=null, commandSend=null;
 const keyName=event=>(event.ctrlKey?'ctrl+':'')+(event.altKey?'alt+':'')+
  (event.shiftKey?'shift+':'')+(event.metaKey?'meta+':'')+event.key.toLowerCase();
 function editPvpKeys() {
  const rows=Object.keys(commands).map(action=>{
   const label=element('div',null,'hotkey-setting-row');
   const name=action==='Select'?'Quick swap':action;
   label.append(element('span',name));
   const key=element('button',bindings[action]);
   key.type='button';
   key.setAttribute('aria-label',name+' key: '+bindings[action]);
   key.onclick=()=>{
    key.focus();
    key.textContent='Press a key…';
    key.onkeydown=event=>{
     if(['Control','Alt','Shift','Meta','Escape'].includes(event.key))return;
     event.preventDefault();event.stopPropagation();
     const value=keyName(event);
     if(Object.keys(bindings).some(other=>other!==action && bindings[other]===value)){
      key.textContent='Already assigned';return;
     }
     bindings[action]=value;
     playerStorage.setItem(keyStorage,JSON.stringify(bindings));
     key.textContent=value;
     key.setAttribute('aria-label',name+' key: '+value);
     key.onkeydown=null;
    };
   };
   key.onblur=()=>{key.onkeydown=null;key.textContent=bindings[action];};
   label.append(key);
   return label;
  });
  const reset=button('Reset defaults',()=>{
   bindings={...commands};playerStorage.setItem(keyStorage,JSON.stringify(bindings));editPvpKeys();
  });
  show('Hotkey Settings',...rows,reset);
 }
 function chooseBattleUnit(actor) {
  if(!commandSend)return;
  if(actor.hp<=0)return;
  if(commandMode==='Attack' && actor.side!==active.side && selectedUnit) {
   commandMode=null;
   updateOnlineRoster(commandSend);
   commandSend({ai:{actor:selectedUnit,target:actor.onlineId}});
   return;
  }
  if(actor.side!==active.side || commandMode==='Attack')return;
  const slots=trainerFields.flat().filter(slot=>slot.owner===active.side);
  const fieldIndex=slots.findIndex(slot=>trainerOnField(actor,[slot]));
  if(!commandMode && fieldIndex>=0 && !slots[fieldIndex].transition) {
   selectedUnit=actor.onlineId;
   updateOnlineRoster(commandSend);
   return;
  }
  if(fieldIndex>=0)return;
  const index=slots.length===1?0:commandMode==='Select'?
   slots.findIndex(slot=>slot.actor?.onlineId===selectedUnit):
   slots.findIndex(slot=>!slot.transition && !(slot.actor?.hp>0));
  const slot=slots[index];
  if(!slot || slot.transition || battleSnapshot.recall>0 && slot.actor?.hp>0){
   byId('status').textContent='That field slot is not ready to swap.';return;
  }
  commandMode=null;
  updateOnlineRoster(commandSend);
  commandSend({incoming:actor.onlineId,slot:index});
 }
 let soloSelection=null, soloCommand=null;
 function localHotkey(action) {
  const living=actor=>actor?.hp>0;
  const fields=trainerFields?.[0] ?? [{actor:activePlayer,transition:playerSwitch}];
  if(!allies.includes(soloSelection) || !living(soloSelection))soloSelection=null;
  if(action==='Escape'){
   soloCommand=null;updateBattleRosters();updateRecallStatus();return;
  }
  if(action==='Attack' || action==='Select'){
   soloCommand=action;updateBattleRosters();
   byId('status').textContent=action==='Attack'?'Choose an enemy target.':'Choose a healthy reserve to swap in.';
   return;
  }
  const rosterKey=/^(Ally|Enemy) ([1-6])$/.exec(action);
  if(rosterKey) {
   const friendly=rosterKey[1]==='Ally',index=Number(rosterKey[2])-1;
   const actor=(friendly?allies:enemies)[index];
   if(!living(actor))return;
   if(phase==='setup'){
    if(friendly)rosterCards.find(row=>row.actor===actor)?.card.click();
    return;
   }
   if(!friendly){
    if(soloCommand==='Attack'){
     const outgoing=soloSelection ?? fields.find(slot=>living(slot.actor))?.actor;
     if(outgoing)outgoing.manualTarget=battleActorId(actor);
     soloCommand=null;updateBattleRosters();updateRecallStatus();
    }
    return;
   }
   if(soloCommand==='Attack')return;
   const fieldIndex=fields.findIndex(slot=>slot.actor===actor && !slot.transition);
   if(fieldIndex>=0 && !soloCommand){
    soloSelection=actor;updateBattleRosters();
    byId('status').textContent=actor.name+' selected for commands.';return;
   }
   if(fieldIndex>=0)return;
   if(trainerFields && soloCommand==='Select'){
    const outgoing=fields.findIndex(slot=>slot.actor===soloSelection && !slot.transition);
    if(outgoing<0)return;
    recallSlot=outgoing;
   }
   if(!canSendReserve(actor))return;
   soloCommand=null;
   updateBattleRosters();
   rosterCards.find(row=>row.actor===actor)?.card.click();
   return;
  }
  const actor=soloSelection ?? fields.find(slot=>living(slot.actor))?.actor;
  if(!living(actor))return;
  const style=['Aggressive','Balanced','Defensive'].includes(action);
  actor.ai=normalizeBattleAI({...actor.ai,[style?'style':'position']:action});
  byId('status').textContent=actor.name+' · '+action;
 }
 window.localBattleHotkeyClick=(friendly,index)=>{
  if(phase!=='battle' || !soloCommand)return false;
  localHotkey((friendly?'Ally ':'Enemy ')+(index+1));return true;
 };
 window.localBattleCanTarget=()=>phase==='battle' && soloCommand==='Attack';
 window.localBattleCanSwap=()=>phase==='battle' && soloCommand==='Select';
 window.localBattleIsSelected=actor=>actor===soloSelection;
 function handleBattleHotkey(event) {
  if(phase==='setup' || phase==='battle'){
   if(dialog.open || byId('battle-settings').open || event.repeat ||
      event.target.closest?.('input,textarea,select,[contenteditable]'))return;
   const action=event.key==='Escape' && soloCommand?'Escape':Object.keys(bindings).find(key=>bindings[key]===keyName(event));
   if(action){event.preventDefault();localHotkey(action);}
   return;
  }
  if(phase!=='online-battle' || active?.result || active?.mode==='coop' || dialog.open || byId('battle-settings').open ||
     event.repeat || event.target.closest?.('input,textarea,select,[contenteditable]'))return;
  if(event.key==='Escape' && commandMode){
   commandMode=null;updateOnlineRoster(commandSend);return;
  }
  const action=Object.keys(bindings).find(key=>bindings[key]===keyName(event));
  if(!action)return;
  if(!battleSnapshot) {
   if(!active.started && !active.locked && active.format!==6 && action.startsWith('Ally ')){
    const card=byId('player-roster').querySelectorAll('.battle-slot')[Number(action.split(' ')[1])-1];
    if(card && !card.disabled){event.preventDefault();card.click();}
   }
   return;
  }
  if(!commandSend || isCoop(active.mode) && !(/^(Ally |Select$)/.test(action)))return;
  event.preventDefault();
  if(action==='Attack' || action==='Select'){
   if(!selectedUnit) {
    byId('status').textContent='Select a field Pokémon first.';
    return;
   }
   commandMode=action;
   updateOnlineRoster(commandSend);
   return;
  }
  if(/^(Ally|Enemy) /.test(action)){
   const [side,number]=action.split(' ');
   const id=(side==='Ally'?active.side:active.side==='host'?'guest':'host')+':'+(Number(number)-1);
   const actor=arenaActors.get(id);
   if(actor)chooseBattleUnit(actor);
   else byId('status').textContent='No revealed Pokémon in that roster slot.';
   return;
  }
  if(selectedUnit)commandSend({ai:{actor:selectedUnit,...(['Aggressive','Balanced','Defensive'].includes(action)?
   {style:action}:{position:action})}});
  else byId('status').textContent='Select a field Pokémon first.';
 }
 window.addEventListener('keydown',handleBattleHotkey,true);
 const settingsButton=element('button','Hotkey Settings');
 settingsButton.type='button';
 settingsButton.onclick=()=>{byId('battle-settings').close();editPvpKeys();};
 byId('battle-settings').querySelector('.battle-settings-grid').append(settingsButton);
 const menuSettings=byId('toolbar-settings').onclick;
 byId('toolbar-settings').onclick=()=>{
  menuSettings();
  byId('home-dialog-content').append(button('Hotkey Settings',editPvpKeys));
 };
 function pvpLoanerPanel(locked=false){
  const panel=element('details',null,'pvp-loaners');
  panel.open=true;
  panel.append(element('summary','PvP loaner gear'),element('p','Both players can borrow one of each item. Your regular held items are excluded in PvP.'));
  panel.append(battlePlanControls(locked));
  for(const name of team){
   const label=element('label',name+' ');
   const choices=wildProgress.pvpLoaners;
   const equipped=pvpLoanerFor(name,team,choices);
   const ordinary=wildProgress.held[name];
   const field=select(name+' PvP held item',[['','None'],...pvpLoanerItems.map(item=>[item,item])]);
   field.value=equipped ?? '';
   field.disabled=locked;
   for(const option of field.options)
    option.disabled=Boolean(option.value && team.some(other=>other!==name && pvpLoanerFor(other,team,choices)===option.value));
   const result=element('small',(equipped?'Loaner: '+equipped+' · '+heldItems[equipped].description:'No PvP held item')+
    (ordinary?' · '+ordinary+' from your bag is excluded':''));
   field.onchange=()=>{
    if(field.value)choices[name]=field.value;
    else delete choices[name];
    saveWildProgress();
    panel.replaceWith(pvpLoanerPanel());
   };
   label.append(field,result);
   panel.append(label);
  }
  return panel;
 }
 function arenaView(match, picks, togglePick, ready, leave) {
  if(phase!=='online-battle') {
   lastDpsRender=-1;renderBattleDps(0,[]);
   selectedUnit=null;commandMode=null;
   arenaActors=new Map();rosterRows=new Map();soundTimeline=globalThis.ArenaMoveAudio?.createTimeline();displayedTurn=-1;
   recallSlotOnline=null;battleSnapshot=null;playbackClock=null;playbackDelay=0.32;snapshotArrival=0;arrivalGaps=[];visualSnapshots=[];trainerFields=[[],[]];trainerPanels=null;
   phase='online-battle';speed=1;
   const mega=Object.hasOwn(megaRaidTiers,match.mode);
   setArenaDimensions(mega?megaRaidArenaSize:undefined);
   byId('battle').classList.toggle('is-mega-raid',mega);
   effects=[];pendingCasts=[];playerSwitch=enemySwitch=null;
   battleWeather=battleTerrain=null;arenaMap=null;arenaSkillFields=[];weatherTime=0;onlineMatchDuration=0;onlineVisualClock=0;
   showScreen('battle');
   for(const id of ['start','auto-reserve','battle-auto-repeat','battle-auto-start','battle-auto-capture','next-gym'])byId(id).hidden=true;
   for(const id of ['player-active','enemy-active','player-roster','enemy-roster','choices'])byId(id).replaceChildren();
   for(const id of ['player-roster','enemy-roster'])delete byId(id).dataset.onlineRoster;
   byId('speed').textContent='1× speed';byId('speed').disabled=true;
   byId('speed').setAttribute('aria-pressed','false');
   byId('score').textContent='Online battle · 1×';
   byId('reset').onclick=leave;
   try {startBattleMusic();} catch {}
  }
  if(match.started) {
   if(!battleSnapshot)byId('status').textContent='Both players are ready. Sending out Pokémon…';
   byId('choices').replaceChildren();
   return;
  }
  byId('status').textContent=match.locked?'Ready. Waiting for the other player…':
   (match.format===6?'Press Ready to send out your full team.':'Choose '+match.format+' lead Pokémon from your team, then press Ready.')+(match.opponentLocked?' The other player is ready.':'');
  byId('player-roster').replaceChildren(element('h2','Your team'),...team.map(name=>{
   const card=element('button',null,'battle-slot');
   const shiny=profileFor(name).shiny===true;
   card.append(pokemonPortrait(name,null,false,0,shiny?spriteVariants(name).shiny:null,shiny),battleRosterIdentity(name,match.mode==='free_fight'?100:ownedPokemon(name)?.level ?? 5));
   card.disabled=match.locked || match.format===6;
   card.setAttribute('aria-pressed',String(picks.includes(name)));
   card.onclick=()=>togglePick(name);
   return card;
  }));
  const confirmReady=button(match.locked?'Ready ✓':'Ready',ready);
  confirmReady.disabled=match.locked || (match.format===6?team.length!==6:picks.length!==match.format);
  byId('choices').replaceChildren(confirmReady);
  if(!isCoop(match.mode))byId('choices').append(pvpLoanerPanel(match.locked));
 }
 function createCombatRequest() {
  const automatic=new URLSearchParams(location.search).get('arenaRegion')==='auto';
  let databaseRegion=null, retryRegionAfter=0;
  return async (id,command)=>{
   const client=await cloudClient();
   const options={body:{id,command}};
   if(!automatic && databaseRegion && performance.now()>=retryRegionAfter)options.region=databaseRegion;
   const {data,error}=await client.functions.invoke('arena-combat',options);
   if(error) {
    const status=error.context?.status;
    if(options.region && (!status || status===429 || status>=500))retryRegionAfter=performance.now()+60000;
    const body=await error.context?.json?.().catch(()=>null);
    throw Error(body?.error ?? error.message);
   }
   databaseRegion=data.combatRegion ?? null;
   return data;
  };
 }
 function recordPvPTurn(timing,packet,now) {
  if(timing.last!==null) {
   const gap=now-timing.last;
   timing.maxGap=Math.max(timing.maxGap,gap);
   if(gap>=2000)timing.stalls++;
  }
  timing.last=now;
  timing.updates++;
  if(Number.isFinite(packet.serverMs) && packet.serverMs>=0)timing.server.push(packet.serverMs);
 }
 function pvpTimingDetails(timing) {
  const details=element('details');
  details.append(element('summary','PvP connection timing'));
  if(timing.server.length) {
   const times=[...timing.server].sort((a,b)=>a-b);
   const avg=times.reduce((total,ms)=>total+ms,0)/times.length;
   details.append(element('p','Server processing · '+avg.toFixed(1)+' ms average · '+times[Math.ceil(times.length*.95)-1].toFixed(1)+' ms at the 95th percentile · '+times.length+' timed turns'));
  }
  if(timing.updates>=2)details.append(element('p','Updates received on this device · '+timing.updates+' · Longest gap '+(timing.maxGap/1000).toFixed(2)+'s · Gaps of 2s or more '+timing.stalls));
  return details;
 }
 function showBattleSnapshot(packet,send) {
  if(!packet.battle || packet.turn<=displayedTurn)return;
  displayedTurn=packet.turn;
  const data=packet.battle;
  const snapshotInterval=data.clock-(battleSnapshot?.clock ?? data.clock);
  if(snapshotInterval>0 || !battleSnapshot) {
   const arrived=performance.now()/1000;
   if(snapshotArrival && snapshotInterval>0) {
    arrivalGaps.push(Math.max(arrived-snapshotArrival,snapshotInterval));
    if(arrivalGaps.length>16)arrivalGaps.shift();
    const gaps=[...arrivalGaps].sort((a,b)=>a-b);
    const typicalGap=gaps[Math.ceil(gaps.length*0.9)-1];
    const desired=clamp(Math.max(typicalGap+0.12,(arrived-snapshotArrival)+0.06),0.24,0.95);
    playbackDelay+=(desired-playbackDelay)*(desired>playbackDelay?0.65:0.06);
   }
   snapshotArrival=arrived;
  }
  playbackClock ??= data.clock-playbackDelay;
  updateNormalAttackToggle(data.normalAttacks ?? true,normalAttacks=>send({normalAttacks}));
  const mirror=!isCoop(active.mode) && active.side==='guest';
  setArenaDimensions(data.arenaMap ?? undefined);
  const mx=x=>mirror?canvas.width-x:x;
  const dx=x=>mirror?-x:x;
  const lineView=line=>!line?line:{...line,x:mx(line.x),dx:dx(line.dx),
   angle:mirror?Math.PI-line.angle:line.angle,end:{...line.end,x:mx(line.end.x)}};
  for(const entry of data.actors) {
   const actor=arenaActors.get(entry.onlineId) ?? {};
   const oldX=actor.x,oldY=actor.y;

   Object.assign(actor,entry,{
    x:mx(entry.x),friendly:mirror?!entry.friendly:entry.friendly,
    direction:mirror?(8-entry.direction)%8:entry.direction,facing:dx(entry.facing),
    attackX:dx(entry.attackX),hitX:dx(entry.hitX),
   });
   const samples=actor.motionSamples ??= [];
   const sample={time:data.clock,x:actor.x,y:actor.y,ticks:actor.motionTicks,
    ailment:entry.ailment ?? null,puppetUntil:entry.puppetUntil ?? 0};
   if(samples.length && samples.at(-1).time===sample.time)samples[samples.length-1]=sample;
   else samples.push(sample);
   if(samples.length>64)samples.shift();
   if(Number.isFinite(oldX))actor.x=oldX;
   if(Number.isFinite(oldY))actor.y=oldY;
   arenaActors.set(entry.onlineId,actor);
  }
  const actorFor=id=>arenaActors.get(id) ?? null;
  const fields=(mirror?[...data.fields].reverse():data.fields).map(slots=>slots.map(slot=>({
   ...slot,actor:actorFor(slot.actor),
   transition:slot.transition?{...slot.transition,outgoing:actorFor(slot.transition.outgoing),
    incoming:actorFor(slot.transition.incoming),snapshotElapsed:slot.transition.elapsed}:null,
  })));
  trainerFields=fields;
  visualSnapshots.push({time:data.clock,
   effects:data.effects.map(effect=>({...effect,x:mx(effect.x),tx:mx(effect.tx),sector:lineView(effect.sector)})),
   casts:data.casts.map(cast=>({...cast,actor:actorFor(cast.actor),
    center:cast.center?{...cast.center,x:mx(cast.center.x)}:null,line:lineView(cast.line)})),
  });
  if(visualSnapshots.length>64)visualSnapshots.shift();
  battleWeather=data.weather;battleTerrain=data.terrain;weatherTime=data.weatherTime ?? 0;
  arenaMap=data.arenaMap?{...data.arenaMap,viewMirror:mirror,rocks:[],
   zones:data.arenaMap.zones.map(zone=>({...zone,x:mx(zone.x),vertices:zone.vertices?.map(([x,y])=>[dx(x),y]),patches:zone.patches?.map(([x,y,rx,ry])=>[dx(x),y,rx,ry])})),
   meteors:data.arenaMap.meteors?.map(meteor=>({...meteor,x:mx(meteor.x)}))}:null;
  arenaSkillFields=(data.arenaSkillFields ?? []).map(field=>({...field,x:mx(field.x),
   friendly:mirror?!field.friendly:field.friendly}));
  byId('score').textContent='Online battle · 1×'+(data.weather?' · '+data.weather+' '+Math.ceil(data.weatherTime ?? 0)+'s'+(abilityWeather()?'':' (suppressed)'):'');
  if(data.sounds?.length)soundTimeline?.collect(data.sounds,data.clock);
  const boss=data.actors.find(actor=>actor.side==='boss' && actor.raidForm?.startsWith('Mega '));
  byId('raid-boss-hud').hidden=!boss;
  if(boss){
   const phaseName=['','Adapting','Meteor storm','BERSERK'][boss.masterRaidPhase];
   byId('raid-boss-name').textContent=boss.raidForm+(phaseName?' · Phase '+boss.masterRaidPhase+' · '+phaseName:'');
   updateStageIcons(byId('raid-boss-stages'),boss);
   const ailment=battleStatusBadges[boss.ailment];
   const status=byId('raid-boss-status');
   status.hidden=!ailment;
   if(ailment) {
    status.textContent=ailment[1];
    status.style.backgroundColor=ailment[2];
   }
   const hp=byId('raid-boss-hp');hp.max=boss.max;hp.value=boss.hp;
   byId('raid-boss-value').textContent=boss.hp.toLocaleString()+' / '+boss.max.toLocaleString()+' HP';
  }
  battleSnapshot=data;
  onlineMatchDuration=data.clock;
  onlineRaidCountdown=isCoop(active.mode);
  renderBattleDps(data.clock,data.damageBuckets ?? [],mirror);
  frameAge=0;
  updateOnlineRoster(send);
 }
 function updateOnlineRoster(send) {
  commandSend=send;
  const ownSlots=trainerFields.flat().filter(slot=>slot.owner===active.side);
  const selectedSlot=ownSlots[recallSlotOnline];
  if(recallSlotOnline!==null && (!selectedSlot?.actor?.hp || selectedSlot.transition))recallSlotOnline=null;
  const openSlot=ownSlots.findIndex(slot=>!slot.transition && !(slot.actor?.hp>0));
  const reserveSlot=openSlot>=0?openSlot:ownSlots.length===1?0:recallSlotOnline;
  const canReserve=[...arenaActors.values()].some(actor=>actor.side===active.side && actor.hp>0 &&
   !ownSlots.some(slot=>trainerOnField(actor,[slot])));
  const status=ownSlots.some(slot=>slot.transition)?'Sending out Pokémon…':
   openSlot>=0 && canReserve?'Choose a healthy reserve to send out.':
   !canReserve?'Battle in progress.':
   battleSnapshot.recall>0?'Recall ready in '+Math.ceil(battleSnapshot.recall)+'s.':
   recallSlotOnline!==null?'Choose a reserve to send out.':'Select an active Pokémon to recall it.';
  byId('status').textContent=commandMode==='Attack'?'Choose an enemy target.':commandMode==='Select'?'Choose a healthy reserve to swap in.':status;
  for(const [friendly,id] of [[true,'player-roster'],[false,'enemy-roster']]) {
   const container=byId(id);
   if(!friendly && Object.hasOwn(megaRaidTiers,active.mode))continue;
   if(!container.dataset.onlineRoster) {
    container.replaceChildren(element('h2',friendly?'Your side':isCoop(active.mode)?'Guardians':'Opponent'));
    container.dataset.onlineRoster='true';
   }
   for(const actor of arenaActors.values()) {
    if(actor.friendly!==friendly)continue;
    const own=actor.side===active.side;
    const index=ownSlots.findIndex(slot=>slot.actor===actor || slot.transition?.incoming===actor);
    let row=rosterRows.get(actor.onlineId);
    if(!row || row.form!==actor.name || row.shiny!==Boolean(actor.shiny)) {
     const card=element('button',null,'battle-slot');
     const identity=battleRosterIdentity(actor.name,actor.level);
     if(actor.raidForm)identity.querySelector('.battle-name').textContent=actor.raidForm;
     const hp=element('progress');hp.max=actor.max;hp.setAttribute('aria-label',actor.name+' HP');
     const stages=element('span',null,'battle-stage-icons');
     const exhaustion=makeExhaustionBar(actor);
     card.append(pokemonPortrait(actor.name,null,false,0,actorSpriteVariant(actor),actor.shiny),identity,hp,exhaustion,stages);
     if(row)row.card.replaceWith(card);else container.append(card);
     row={card,hp,stages,exhaustion,form:actor.name,shiny:Boolean(actor.shiny)};rosterRows.set(actor.onlineId,row);
    }
    row.hp.value=actor.hp;
    updateStageIcons(row.stages,actor);
    updateExhaustionBar(row.exhaustion,actor);
    row.card.classList.toggle('is-out',actor.hp<=0);
    row.card.classList.toggle('is-active',trainerFields.flat().some(slot=>trainerOnField(actor,[slot])) && actor.hp>0);
    row.card.classList.toggle('is-command-selected',actor.onlineId===selectedUnit);
    row.card.setAttribute('aria-pressed',String(actor.onlineId===selectedUnit || index>=0 && recallSlotOnline===index));
    row.card.disabled=!own || actor.hp<=0 || (index>=0?!canReserve || Boolean(ownSlots[index].transition):
     reserveSlot===null || (openSlot<0 && battleSnapshot.recall>0));
    if(!isCoop(active.mode) || commandMode==='Select'){
     const outgoing=ownSlots.find(slot=>slot.actor?.onlineId===selectedUnit);
     const swapSlot=ownSlots.length===1?ownSlots[0]:outgoing;
     const canQuickSwap=index<0 && Boolean(swapSlot) && !swapSlot.transition &&
      (!(swapSlot.actor?.hp>0) || battleSnapshot.recall<=0);
     row.card.disabled=actor.hp<=0 || (commandMode==='Attack'?own:!own ||
      (commandMode==='Select'?!canQuickSwap:index>=0?Boolean(ownSlots[index].transition):
       ownSlots.length===1?!canQuickSwap:openSlot<0));
    }
    row.card.onclick=()=>{
     if(commandMode || (!isCoop(active.mode) && (index>=0 || ownSlots.length===1))){
      chooseBattleUnit(actor);
      return;
     }
     if(index>=0) {
      recallSlotOnline=recallSlotOnline===index?null:index;
      updateOnlineRoster(send);
     } else send({incoming:actor.onlineId,slot:reserveSlot});
    };
   }
  }
 }
 window.paintOnlineBattle=dt=>{
  visualTime+=dt;frameAge+=dt;
  if(battleSnapshot) {
   const latest=battleSnapshot.clock;
   const age=Math.max(0,performance.now()/1000-snapshotArrival);
   const target=latest+Math.min(age,playbackDelay)-playbackDelay;
   const rate=clamp(1+(target-playbackClock)*1.5,0.65,1.35);
   playbackClock=active?.result?latest:Math.min(latest,playbackClock+dt*rate);
  }
  onlineVisualClock=playbackClock ?? 0;
  if(battleSnapshot)soundTimeline?.advance(onlineVisualClock,playSkillSound);
  for(const actor of arenaActors.values()) {
   const samples=actor.motionSamples;
   while(samples.length>2 && samples[1].time<=playbackClock)samples.shift();
   const from=samples[0];
   const to=samples[1] ?? from;
   actor.displayedStatus=onlineVisualClock>=to.time?to:from;
   const blend=to.time>from.time?clamp((playbackClock-from.time)/(to.time-from.time),0,1):1;
   const position=Math.hypot(to.x-from.x,to.y-from.y)>90 && blend<1?0:blend;
   actor.x=from.x+(to.x-from.x)*position;
   actor.y=from.y+(to.y-from.y)*position;
   actor.motionTicks=from.ticks+(to.ticks-from.ticks)*position;
   actor.attack=Math.max(0,actor.attack-dt);
   actor.hit=Math.max(0,actor.hit-dt);
   actor.labelTime=Math.max(0,actor.labelTime-dt);
   if(actor.ailment!==1)for(let i=0;i<actor.moveTimers.length;i++)actor.moveTimers[i]=Math.max(0,actor.moveTimers[i]-dt);
  }
  for(const slot of trainerFields.flat()) {
   if(slot.transition) {
    const duration=slot.transition.stage==='recall'?ballDuration:throwDuration+releaseDuration;
    slot.transition.elapsed=Math.min(duration,slot.transition.snapshotElapsed+frameAge);
   }
  }
  while(visualSnapshots.length>1 && visualSnapshots[1].time<=playbackClock)visualSnapshots.shift();
  const visual=visualSnapshots[0];
  if(visual && visual.time<=playbackClock) {
   const elapsed=playbackClock-visual.time;
   effects=visual.effects.filter(effect=>effect.life>elapsed).map(effect=>({...effect,life:effect.life-elapsed}));
   pendingCasts=visual.casts.map(cast=>cast.flight && cast.line?
    {...cast,travel:Math.min(cast.line.length,cast.travel+460*elapsed)}:
    {...cast,remaining:Math.max(0,cast.remaining-elapsed)});
  }
  if(battleSnapshot && (frameAge===dt || Math.floor(frameAge*10)!==Math.floor((frameAge-dt)*10)))updateActivePanels(trainerFields);
  paint();
 };
 const originalMenu=openMenu;
 openMenu=()=>{
  stop();
  soloSelection=soloCommand=null;
  byId('start').hidden=false;
  byId('speed').disabled=false;
  byId('reset').onclick=openMenu;
  originalMenu();
  pvpVersionContext=false;
 };
 let closeBattleChannel=null, resumeMatchPolling=null;
 window.addEventListener('online',()=>resumeMatchPolling?.());
 const stop=()=>{
  generation++;
  inviteView=null;
  resumeMatchPolling=null;
  clearTimeout(timer);
  closeBattleChannel?.();
  closeBattleChannel=null;
 };
 dialog.addEventListener('close',()=>{
  if(phase==='online-battle' && active?.result)openMenu();
  else if(phase!=='online-battle' && phase!=='raid-lobby')stop();
  if(!pvpVersionContext)void checkGameVersion();
  if(phase!=='online-battle')pvpVersionContext=false;
 });
 async function rpc(action,args={}) {
  const client=await cloudClient();
  const request=client.rpc('arena_online',{action,args});
  const {data,error}=await (action==='notifications'?timedPresenceRequest(request):request);
  if(error) throw error;
  return data;
 }
 function show(title,...nodes) {
  dialog.classList.remove('trade-hub-dialog');
  dialog.classList.toggle('collection-dialog',pvpVersionContext || title==='Hotkey Settings');
  byId('home-dialog-title').textContent=title;
  byId('home-dialog-content').replaceChildren(...nodes);
  if(!dialog.open) dialog.showModal();
  void checkGameVersion();
 }
 function button(label,fn) {
  const b=element('button',label);
  b.onclick=async()=>{
   b.disabled=true;
   try {await fn();}
   catch(error){(phase==='raid-lobby'?byId('raid-lobby').querySelector('.raid-room-controls'):byId('home-dialog-content')).append(element('p',error.message));}
   finally {b.disabled=false;}
  };
  return b;
 }
 function input(label) {
  const field=element('input');field.placeholder=label;field.setAttribute('aria-label',label);return field;
 }
 function select(label,values) {
  const node=element('select');node.setAttribute('aria-label',label);
  for(const [value,title] of values){const option=element('option',title);option.value=value;node.append(option);}
  return node;
 }
 async function open(title,view) {
  stop();
  const token=generation;
  show(title,element('p','Loading…'));
  try {
   const client=await cloudClient();
   const {data}=await client.auth.getUser();
   if(!data?.user) throw Error('Log in with your email to use online features.');
   const name=starterSave?.ign ?? currentPlayer.name;
   try {await rpc('profile',{name});}
   catch {
    if(token!==generation) return;
    const field=input('Online player name');field.maxLength=24;
    show(title,field,button('Register',async()=>{await rpc('profile',{name:field.value});await view();}));
    return;
   }
   if(token===generation) await view();
  } catch(error){if(token===generation)show(title,element('p',error.message));}
 }
 function raidAssetUrl(tier,extension) {
  const variant=tier.master?'-master':'';
  const revision=tier.master && extension==='webp'?'?v=2':'';
  return new URL('./assets/raid-tier-'+tier.tier+variant+'.'+extension+revision,multiplayerSource).href;
 }
 window.onlineBattleRecording=regionalRecording=>{
  if(active?.result)return null;
  const tier=megaRaidTiers[active?.mode];
  if(!tier)return regionalRecording;
  return active.started?raidAssetUrl(tier,'mp3'):null;
 };
 function setRaidRoomBackdrop(root,tier) {
  root.dataset.tier=String(tier?.tier ?? 1);
  root.style.backgroundImage=tier?('url("'+raidAssetUrl(tier,'webp')+'")'):'';
 }
 function raidRoom(title,visibility,leave,tier,code) {
  phase='raid-lobby';
  showScreen('raid-lobby');
  if(dialog.open)dialog.close();
  const root=byId('raid-lobby');
  root.classList.remove('has-room-chat');
  setRaidRoomBackdrop(root,tier);
  const top=element('div',null,'raid-room-top');
  const actions=element('div',null,'raid-room-actions');
  actions.append(button('Settings',()=>byId('toolbar-settings').click()),button(leave?'Leave room':'Main menu',leave ?? openMenu));
  const roomInfo=element('div',null,'raid-room-info');
  roomInfo.append(element('span',visibility));
  if(code)roomInfo.append(element('small',code));
  const heading=element('h2',title);
  const boss=Object.values(megaRaidTiers).find(entry=>title.startsWith(entry.name));
  if(boss) {
   const types=element('span',null,'raid-boss-types');
   for(const type of [dex[boss.species][1],boss.secondary]) {
    const badge=element('span',type,'home-type-badge');
    badge.style.setProperty('--type-color',moveColors[type] ?? '#b7c7dd');
    types.append(badge);
   }
   heading.append(types);
  }
  const topRight=element('div',null,'raid-room-top-right');
  topRight.append(actions);
  top.append(roomInfo,heading,topRight);
  const seats=element('div',null,'raid-room-seats');
  const controls=element('div',null,'raid-room-controls');
  const footer=element('div',null,'raid-room-footer');
  const start=element('div',null,'raid-room-start');
  footer.append(controls,start);
  root.replaceChildren(top,seats,footer);
  return {root,seats,controls,start,footer,topRight};
 }
 async function raidRpc(action,args) {
  const client=await cloudClient();
  const {data,error}=await client.rpc('arena_raid',{action,args});
  if(error)throw error;
  return data;
 }
 let ticketAccount=null, ticketBalance=null;
 window.refreshCoopTickets=async()=>{
  const account=cloudAccount;
  const display=byId('toolbar-tickets');
  if(ticketAccount!==account){ticketAccount=account;ticketBalance=null;}
  if(!account){display.textContent='0';return 0;}
  const client=await cloudClient();
  const {data,error}=await client.rpc('arena_coop_ticket_balance');
  if(error)throw error;
  if(cloudAccount!==account)return 0;
  const total=Number(data) || 0;
  const earned=ticketBalance===null?0:Math.max(0,total-ticketBalance);
  ticketBalance=total;
  display.textContent=total.toLocaleString();
  display.setAttribute('aria-label',total.toLocaleString()+' Co-op tickets');
  return earned;
 };
 async function collectMegaRaidRewards() {
  const awarded=await window.collectServerRaidRewards();
  const rewards=awarded.map(reward=>'Tier '+megaRaidTiers[reward.mode].tier+' first clear · '+reward.ultra_balls+' Ultra Balls'+' · '+reward.coins.toLocaleString()+' coins · '+reward.pvp_item);
  const tickets=await window.refreshCoopTickets();
  if(tickets)rewards.push('+'+tickets+' Co-op '+(tickets===1?'ticket':'tickets'));
  return rewards;
 }
 function mountRaidChat(room,id) {
  room.root.classList.add('has-room-chat');
  const chat=element('section',null,'raid-chat');
  const log=element('div',null,'raid-chat-log');
  log.setAttribute('role','log');
  log.setAttribute('aria-label','Raid room messages');
  const form=element('form');
  const field=input('Message your team');
  field.maxLength=240;
  const send=element('button','Send');
  send.type='submit';
  const feedback=element('small');
  feedback.setAttribute('role','status');
  form.append(field,send);
  chat.append(element('strong','Room chat'),log,form,feedback);
  room.footer.append(chat);
  let latest=0, pending=false;
  async function sync(message=null) {
   if(pending || !chat.isConnected)return;
   pending=true;
   try {
    const client=await cloudClient();
    const {data,error}=await client.rpc('arena_raid_chat',{room_id:id,message});
    if(error)throw error;
    if(!chat.isConnected)return;
    if(message!==null)field.value='';
    const messages=data ?? [];
    if(messages.length && messages.at(-1).id>latest) {
     latest=messages.at(-1).id;
     log.replaceChildren(...messages.map(row=>{
      const line=element('p');
      if(row.created_at) {
       const time=element('time',new Date(row.created_at).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}));
       time.dateTime=row.created_at;
       line.append(time,' ');
      }
      line.append(row.sender+': '+row.body);
      return line;
     }));
     log.scrollTop=log.scrollHeight;
    }
    feedback.textContent='';
   }catch(error){feedback.textContent=error.message;}
   finally{pending=false;send.disabled=false;}
  }
  form.onsubmit=event=>{
   event.preventDefault();
   const message=field.value.trim();
   if(!message || pending)return;
   send.disabled=true;
   void sync(message);
  };
  void sync();
  return sync;
 }
 function showRaidSeats(initial) {
  stop();
  const token=generation;
  let match=initial, busy=false, revision='';
  const tier=megaRaidTiers[match.mode];
  const room=raidRoom(tier?tier.name+' · '+raidTierLabel(tier):'Co-op Raid',
   match.public?'Public room':'Private room',async()=>{
    await raidRpc('leave',{id:match.id});if(token===generation)lobby(true,match.mode);
   },tier,match.code);
  const status=element('p');
  const actions=element('div',null,'raid-left-actions');
  room.controls.append(status,actions);
  const syncChat=mountRaidChat(room,match.id);
  const available=Object.keys(wildProgress.owned).filter(isAvailablePokemon).sort((a,b)=>a.localeCompare(b));
  let fighter=match.seats[match.ownSlot]?.pokemon ?? team[0] ?? available[0] ?? '';
  let kickMode=false;
  function editFighter(initial,save,slot=match.ownSlot) {
   const eligible=available.filter(name=>{
    const used=match.seats.filter((seat,index)=>index!==slot && seat?.pokemon===name).length;
    const pending=slot!==match.ownSlot && !match.seats[match.ownSlot]?.pokemon && fighter===name?1:0;
    return used+pending===0;
   });
   const editor=element('dialog',null,'raid-pc-dialog');
   const panel=byId('pokemon-detail');
   const anchor=document.createComment('PC detail position');
   const prior=inspected;
   panel.before(anchor);
   const title=element('h2','Edit Pokémon');
   const {storage,control}=clonePcBox();
   storage.setAttribute('aria-label','Choose raid Pokémon');
   const grid=control('box-grid');
   let chosen=initial, page=0, submitting=false;
   const preview=()=>{
    panel.hidden=!chosen;
    if(!chosen)return;
    inspected=chosen;
    renderDetail();
   };
   const feedback=element('p');
   feedback.setAttribute('role','alert');
   const use=element('button','Use this Pokémon');
   use.type='button';
   use.onclick=async()=>{
    if(!chosen || submitting)return;
    submitting=true;use.disabled=true;
    feedback.textContent='';
    try {
     if(await save(chosen))editor.close();
     else feedback.textContent=status.textContent || 'The raid room is busy. Try again.';
    } finally {submitting=false;use.disabled=!chosen;}
   };
   function renderPicker(names=filteredPcNames(eligible,control,false)) {
    if(!names.includes(chosen)) {
     chosen=names[0] ?? '';
     preview();
    }
    use.disabled=submitting || !chosen;
    const pages=Math.ceil(names.length/boxSize);
    page=clamp(page,0,Math.max(0,pages-1));
    control('box-prev').disabled=page===0;
    control('box-next').disabled=page>=pages-1;
    control('box-page').textContent=pages?'Box '+(page+1)+' / '+pages:'No boxes';
    control('box-count').textContent=names.length+' Pokémon';
    grid.replaceChildren(...names.slice(page*boxSize,(page+1)*boxSize).map((name,index)=>
     pokemonTile(name,'Select',name===chosen,()=>{
      chosen=name;
      feedback.textContent='';
      preview();
      renderPicker();
      grid.children[index]?.focus();
     })));
    if(!names.length)grid.append(element('p',eligible.length?'No Pokémon match these filters.':'Catch a Pokémon to join a raid.'));
   }
   bindPcBox(control,()=>{page=0;renderPicker();});
   control('box-prev').onclick=()=>{page--;renderPicker();};
   control('box-next').onclick=()=>{page++;renderPicker();};
   const names=filteredPcNames(eligible,control,false);
   chosen=names.includes(initial)?initial:names[0] ?? '';
   page=Math.max(0,Math.floor(names.indexOf(chosen)/boxSize));
   renderPicker(names);
   editor.append(title,storage,panel,feedback,element('div',null,'raid-room-actions'));
   editor.lastChild.append(use,button('Cancel',()=>editor.close()));
   editor.addEventListener('close',()=>{
    panel.hidden=false;
    anchor.replaceWith(panel);
    inspected=prior;
    editor.remove();
   },{once:true});
   document.body.append(editor);
   preview();
   editor.showModal();
  }
  const act=async(action,args={})=>{
   if(busy)return;
   busy=true;
   status.textContent='';
   try{
    if(action==='pick' || action==='fill'){
     if(args.pokemon){profileFor(args.pokemon);saveTeam();saveWildProgress();await flushArenaSave();}
    }
    const next=await raidRpc(action,{id:match.id,...args});
    if(token!==generation)return false;
    match=next;draw();
    return true;
   }catch(error){status.textContent=error.message;return false;}
   finally{busy=false;}
  };
  function draw(){
   if(match.result){openMenu();return;}
   if(match.started){active=match;showMatch('Co-op Raid');return;}
   const nextRevision=JSON.stringify(match.seats);
   const viewRevision=nextRevision+'|'+fighter+'|'+kickMode;
   if(viewRevision===revision)return;
   revision=viewRevision;
   room.seats.replaceChildren(...match.seats.map((seat,index)=>{
    const tile=element('div',null,'raid-seat');
    const pad=element('div',null,'raid-seat-pad');
    const shown=index===match.ownSlot?fighter:seat?.pokemon;
    const level=shown && (seat?.pokemon===shown && seat.level || ownedPokemon(shown)?.level);
    if(shown) {
     const shiny=Boolean((index===match.ownSlot || seat?.substitute) && profileFor(shown).shiny);
     pad.append(idlePokemonPortrait(shown,null,shiny?spriteVariants(shown).shiny:null,true,0,shiny));
    }
    tile.append(pad,element('strong',seat?.name ?? 'Open seat'),
     element('small',shown ? shown+(level?' · Lv. '+level:'')+(seat?.ready?' · Ready':' · Not ready') : seat?'Not ready':''));
    if(kickMode && match.side==='host' && seat?.uid && index!==match.ownSlot)
     tile.append(button('Remove player',()=>{kickMode=false;return act('kick',{slot:index});}));
    if(match.side==='host' && (!seat || seat.substitute)){
     tile.append(button(seat?'Edit substitute':'Choose Pokémon',()=>editFighter(shown,pokemon=>act('fill',{slot:index,pokemon}),index)));
     if(seat)tile.append(button('Clear',()=>act('fill',{slot:index,pokemon:''})));
    }
    return tile;
   }));
   const current=match.seats[match.ownSlot];
   const ready=button(current?.ready?'Unready':'Ready Up',()=>act('pick',{pokemon:current?.ready?'':fighter}));
   ready.disabled=!fighter;
   const edit=button('Edit Pokémon',()=>editFighter(fighter,async pokemon=>{
    if(match.seats[match.ownSlot]?.ready && !await act('pick',{pokemon:''}))return false;
    fighter=pokemon;
    draw();
    return true;
   }));
   const invite=button('Invite',()=>{
    const contacts=element('div');
    show('Invite',button('Friendlist',()=>showInviteContacts(contacts,'friends',match.id)),
     button('Guildlist',()=>showInviteContacts(contacts,'guild',match.id)),
     button('Copy Room Code',async()=>{
      const message=element('p');
      contacts.replaceChildren(message);
      try{await navigator.clipboard.writeText(match.code);message.textContent='Room code copied.';}
      catch{message.textContent=match.code;}
     }),contacts);
   });
   actions.replaceChildren(ready,edit,invite);
   if(match.side==='host'){
    const kick=button(kickMode?'Cancel kick':'Kick',()=>{kickMode=!kickMode;draw();});
    kick.disabled=!match.seats.some((seat,index)=>seat?.uid && index!==match.ownSlot);
    actions.append(kick);
    const start=button('START',()=>act('start'));
    start.disabled=match.seats.some(seat=>seat && !seat.ready);
    room.start.replaceChildren(start);
   }

  }
  async function pollRaid(){
   if(token!==generation)return;
   try{
    if(!busy){
     const next=await raidRpc('poll',{id:match.id});
     if(token!==generation)return;
     if(!busy){match=next;draw();if(!match.started && !match.result)void syncChat();}
    }
   }catch(error){status.textContent=error.message;}
   if(token===generation)timer=setTimeout(pollRaid,900);
  }
  draw();
  if(token===generation)timer=setTimeout(pollRaid,900);
 }
 function lobby(coop,previousTier) {
  stop();
  pvpVersionContext=!coop;
  const title=coop?'Co-op':'PvP';
  const mode=select('Match type',[['unranked','Unranked'],['ranked','Ranked']]);
  let raidMode=Object.hasOwn(megaRaidTiers,previousTier)?previousTier:Object.keys(megaRaidTiers)[0];
  const format=select('Battle format',[[1,'1v1'],[2,'2v2'],[3,'3v3']]);
  const freeFight=element('input');freeFight.type='checkbox';
  const freeFightLabel=element('label','Free Fight · Lv. 100 ');freeFightLabel.append(freeFight);
  const code=input('Room code');
  const begin=async (action,extra={})=>{
   if(cloudAccount && dirty) await flushArenaSave();
   const match=await (coop?raidRpc:rpc)(action,{mode:coop?raidMode:mode.value==='unranked' && freeFight.checked?'free_fight':mode.value,format:Number(format.value),code:code.value,...extra});
   if(coop?phase!=='raid-lobby':!dialog.open)return;
   if(coop){showRaidSeats(match);return;}
   active=match;
   showMatch(title);
  };
  const create=button('Create room',()=>{
   if(!coop)return begin('create');
   show('Create Raid Room',button('Public',()=>begin('create',{visibility:'public'})),
    button('Private',()=>begin('create',{visibility:'private'})));
  });
  const join=button('Join room',()=>begin('join'));
  if(!coop) {
   const six=element('option','6v6');six.value='6';
   format.append(six);
   mode.onchange=freeFight.onchange=()=>{
    create.hidden=join.hidden=code.hidden=mode.value==='ranked';
    freeFightLabel.hidden=mode.value!=='unranked';
   };
  }
  const find=button(coop?'Auto Match':'Find match',()=>begin('queue'));
  if(coop){
   const room=raidRoom('Co-op Raids','Raid selection',undefined,megaRaidTiers[raidMode]);
   collectMegaRaidRewards().then(rewards=>{for(const reward of rewards)room.controls.append(element('p',reward));}).catch(()=>{});
   const tiers=element('div',null,'raid-room-actions raid-tier-buttons');
   tiers.setAttribute('aria-label','Raid tier');
   const unlockChoices=[];
   for(const [key,tier] of Object.entries(megaRaidTiers)) {
    const choice=element('button',raidTierLabel(tier)+' · '+tier.name);
    if(tier.master){
     choice.disabled=true;
     choice.title='Clear the standard '+tier.name+' raid to unlock';
     unlockChoices.push([choice,tier.standard]);
    }
    choice.type='button';
    choice.setAttribute('aria-pressed',String(key===raidMode));
    choice.onclick=()=>{
     raidMode=key;
     setRaidRoomBackdrop(room.root,tier);
     for(const node of tiers.children)node.setAttribute('aria-pressed',String(node===choice));
    };
    tiers.append(choice);
   }
   void (async()=>{
    const client=await cloudClient();
    const {data,error}=await client.rpc('arena_mega_raid_clears');
    if(!error && Array.isArray(data))for(const [choice,standard] of unlockChoices){
     choice.disabled=!data.includes(standard);
     if(!choice.disabled)choice.removeAttribute('title');
    }
   })().catch(()=>{});
   const findRoom=button('Find Room',async()=>{
    const rooms=await raidRpc('list',{});
    const search=input('Search by host, tier, or boss');
    const results=element('div');
    const render=()=>{
     const query=search.value.trim().toLowerCase();
     const rows=rooms.filter(row=>{
      const tier=megaRaidTiers[row.mode];
      return (row.host+' '+(tier?raidTierLabel(tier)+' '+tier.name:'')).toLowerCase().includes(query);
     });
     results.replaceChildren(...(rows.length?rows.map(row=>{
      const tier=megaRaidTiers[row.mode];
      return button(row.host+' · '+(tier?raidTierLabel(tier)+' · '+tier.name:row.mode)+' · '+row.players+'/6 players',
       ()=>begin('join_public',{id:row.id}));
     }):[element('p','No matching public rooms.')]));
    };
    search.oninput=render;render();
    show('Find Room',search,results);
   });
   room.topRight.append(tiers);
   room.controls.append(find,create,findRoom,code,join);
   return;
  }
  const setup=element('div',null,'pvp-controls');
  setup.append(mode,format,freeFightLabel);
  const matchmaking=element('div',null,'pvp-controls');
  const joinControls=element('div',null,'pvp-join-room');
  joinControls.append(code,join);
  matchmaking.append(find,create,joinControls);
  show(title,element('h3','Match setup','bag-section-title'),setup,
   pvpLoanerPanel(),
   element('h3','Matchmaking','bag-section-title'),matchmaking);
 }
 function showMatch(title) {
  if(active.mode==='free_fight')title='Free Fight';
  stop();
  pvpVersionContext=!isCoop(active.mode);
  const token=generation;
  const view=element('div');
  const leave=async()=>{
   if(!active.result && !confirm('Leave this match? Leaving a started ranked match counts as a loss.'))return;
   try {
    if(!active.result)await (active.seats?raidRpc:rpc)('leave',{id:active.id});
    if(token!==generation)return;
    openMenu();if(dialog.open)dialog.close();
   } catch(error) {byId('status').textContent=error.message;view.append(element('p',error.message));}
  };
  const coOp=isCoop(active.mode);
  const combat=createCombatRequest();
  const timing={last:null,updates:0,maxGap:0,stalls:0,server:[]};
  const tier=megaRaidTiers[active.mode];
  raidBattleBackdrop=tier?new Image():null;
  if(raidBattleBackdrop)raidBattleBackdrop.src=raidAssetUrl(tier,'webp');
  const raid=coOp?raidRoom(tier?tier.name+' · '+raidTierLabel(tier):title,active.code?'Private room':'Public room',leave,tier,active.code):null;
  if(raid)raid.controls.append(view);
  else show(title,view,button('Leave match',leave));
  let picks=[], submitting=false, sending=false;
  let joiningChannel=false, live=false, lastPush=0;
  async function joinBattleChannel() {
   if(joiningChannel || isCoop(active.mode))return;
   joiningChannel=true;
   try {
    const client=await cloudClient();
    if(token!==generation || active.result)return;
    const channel=client.channel('arena:'+active.id+':'+active.side,{config:{private:true}});
    closeBattleChannel=()=>{void client.removeChannel(channel);};
    channel.on('broadcast',{event:'snapshot'},({payload})=>{
     if(token!==generation || active.result || !payload?.battle || payload.turn<=displayedTurn)return;
     lastPush=performance.now();
     acceptBattle(payload);
    }).subscribe(status=>{live=status==='SUBSCRIBED';});
   } catch {live=false;}
  }
  async function send(command) {
   if(sending || active.result)return;
   sending=true;
   try {
    const packet=await combat(active.id,command);
    if(token!==generation)return;
    acceptBattle(packet);
   } catch(error) {
    if(token===generation)byId('status').textContent=error.message;
   } finally {sending=false;}
  }
  function acceptBattle(packet) {
   if(!coOp && packet.battle && packet.turn>displayedTurn && (!battleSnapshot || packet.battle.clock>battleSnapshot.clock)) {
    recordPvPTurn(timing,packet,performance.now());
   }
   showBattleSnapshot(packet,send);
   if(packet.result && !active.result) {
    active={...active,result:packet.result};
    if(isCoop(active.mode))void checkGameVersion();
    clearTimeout(timer);
    closeBattleChannel?.();
    closeBattleChannel=null;
    render();
   }
  }
  function togglePick(name) {
   if(submitting || active.locked)return;
   picks=picks.includes(name)?picks.filter(p=>p!==name):[...picks,name].slice(-active.format);
   render();
  }
  async function ready() {
   if(active.format===6)picks=team.slice(0,6);
   if(submitting || active.locked || picks.length!==active.format)return;
   submitting=true;
   try {
    for(const name of team)profileFor(name);
    saveTeam();
    if(cloudAccount) {
     await flushArenaSave();
     if(dirty || saving)throw Error('Waiting for your battle team to sync. Try Ready again.');
    }
    unlockSkillSound();
    const next=await rpc('lock',{id:active.id,picks});
    if(token===generation)active=next;
   } catch(error) {
    if(token===generation)byId('status').textContent=error.message;
    return;
   } finally {submitting=false;}
   if(token===generation)render();
  }
  function render() {
   const m=active;
   view.replaceChildren(element('p',m.mode+' · '+m.format+' per player'));
   if(m.code)view.append(element('p','Room code '+m.code));
   if(m.result){
    const result={draw:'Draw',cancelled:'Match cancelled',coop_win:'Co-op victory',coop_loss:'Co-op defeat'}[m.result] ?? (m.result===m.side?'Victory':'Defeat');
    stopBattleMusic();
    if(phase==='online-battle') {
     byId('status').textContent=result;
     const data=battleSnapshot;
     const stats=[];
     if(data) {
      const seconds=Math.floor(data.clock);
      stats.push(element('p','Duration · '+Math.floor(seconds/60)+'m '+seconds%60+'s'));
      const mirror=!isCoop(m.mode) && m.side==='guest';
      const chart=element('section');
      const tabs=element('div',null,'damage-tabs');
      const bars=element('div');
      const modes=[['dealt','Damage Dealt'],['taken','Damage Taken']];
      const buttons=modes.map(([mode,label])=>button(label,()=>renderBars(mode)));
      function renderBars(mode) {
       buttons.forEach((tab,i)=>tab.setAttribute('aria-pressed',String(modes[i][0]===mode)));
       const totals=battleDamageTotals(data.damageBuckets ?? [],mode);
       bars.replaceChildren();
       for(const friendly of [true,false]) {
        const rows=totals.filter(row=>(row.friendly!==mirror)===friendly && row.total>0).sort((a,b)=>b.total-a.total);
        const actors=[...arenaActors.values()].filter(actor=>actor.friendly===friendly);
        bars.append(element('h3',friendly?'Your side':'Opposing side'),
         element('p',actors.filter(actor=>actor.hp<=0).length+' fainted'),
         ...(rows.length?damageBarRows(rows,data.clock,mode):[element('p','No damage recorded.')]));
       }
      }
      tabs.append(...buttons);
      chart.append(tabs,bars);
      renderBars('dealt');
      stats.push(chart);
     }
     if(tier && m.result==='coop_win') {
      const passNote=recordBattlePass({battles:1,wins:1,raidWins:1},String(m.id));
      if(passNote)stats.unshift(element('p',passNote+' · '+battlePassProgressText()));
      const reward=element('p','Checking raid rewards…');
      stats.unshift(reward);
      const check=()=>collectMegaRaidRewards().then(rewards=>{
       reward.textContent=rewards.join(' • ') || 'No new raid rewards.';
      }).catch(()=>{
       reward.replaceChildren(button('Retry raid rewards',check));
      });
      check();
     }
     if(!coOp && timing.updates>=2)stats.push(pvpTimingDetails(timing));
     show(result,...stats,button('Main menu',()=>dialog.close()));
    }
    else view.append(element('strong',result));return;
   }
   if(raid && !m.joined)raid.seats.replaceChildren(element('div','You','raid-seat'),element('div','Open seat','raid-seat'));
   if(!m.joined && !m.seats){
    view.append(element('p','Waiting for another player…'));
    if(m.code && m.side==='host'){
     const contacts=element('div');
     view.append(button('Invite friend or guild member',()=>showInviteContacts(contacts,'all',m.id)),contacts);
    }
    return;
   }
   if(raid && !m.started){
    raid.seats.replaceChildren(...[
     ['You',m.locked], [m.joined?'Partner':'Open seat',m.opponentLocked],
    ].map(([name,ready])=>element('div',name+' · '+(ready?'Ready':'Not ready'),'raid-seat')));
    if(!m.locked){
     const teamChoices=element('div',null,'raid-room-actions');
     teamChoices.append(...team.map(name=>{
      const choice=button(name,()=>togglePick(name));
      choice.setAttribute('aria-pressed',String(picks.includes(name)));
      return choice;
     }));
     const confirm=button('Ready up',ready);confirm.disabled=picks.length!==m.format;
     view.append(element('p','Choose '+m.format+' lead Pokémon.'),teamChoices,confirm);
    } else view.append(element('p','Ready. Waiting for your partner…'));
    return;
   }
   arenaView(m,picks,togglePick,ready,leave);
   if(dialog.open)dialog.close();
  }
  render();
  let retryCount=0, retryButton=null, polling=false;
  function resumePolling(){
   if(polling || token!==generation || active.result)return;
   clearTimeout(timer);
   void poll();
  }
  resumeMatchPolling=resumePolling;
  async function poll() {
   if(polling || token!==generation || active.result)return;
   polling=true;
   if(retryButton)retryButton.disabled=true;
   const began=performance.now();
   try {
    if(active.started && !active.result) {
     void joinBattleChannel();
     if(!retryCount && active.side==='guest' && live && began-lastPush<550){
      timer=setTimeout(poll,120);
      return;
     }
     const packet=await combat(active.id);
     if(token!==generation)return;
     const previousTurn=displayedTurn;
     acceptBattle(packet);
     if(retryCount && packet.battle && !packet.result && displayedTurn===previousTurn)
      byId('status').textContent='Connected. Waiting for the next battle update…';
     retryCount=0;
    } else {
     const next=await (active.seats?raidRpc:rpc)('poll',{id:active.id});
     if(token!==generation || (!dialog.open && phase!=='online-battle' && phase!=='raid-lobby'))return;
     if(!submitting && (!active.locked || next.locked || next.result) && !active.started &&
       (retryCount || JSON.stringify(next)!==JSON.stringify(active))){active=next;render();}
     else if(retryCount)render();
     retryCount=0;
    }
    if(!active.result)timer=setTimeout(poll,active.started?Math.max(0,100-(performance.now()-began)):850);
   } catch(error){
    if(token!==generation)return;
    retryCount++;
    const message=onlineRetryMessage(error,navigator.onLine);
    const target=phase==='online-battle'?byId('status'):view;
    target.replaceChildren(element('span',message+' Waiting for a fresh match snapshot.'));
    const delay=Math.min(active.started?2500:8000,(active.started?200:2000)*2**Math.min(4,retryCount-1));
    timer=setTimeout(poll,delay);
    if(retryCount>=3){
     retryButton=button('Request fresh snapshot',()=>{
      retryButton.disabled=true;
      resumePolling();
     });
     target.append(retryButton);
    }
   } finally {
    polling=false;
   }
  }
  if(!active.result)timer=setTimeout(poll,active.started?0:850);
 }
 async function friends() {
  const rows=await rpc('friends');
  if(phase!=='friendlist' && !dialog.open)return;
  phase='friendlist';
  if(dialog.open)dialog.close();
  showScreen('friendlist');
  const name=input('Player name');
  name.required=true;
  name.maxLength=24;
  const form=element('form',null,'friend-request-form');
  const send=element('button','Send request');
  send.type='submit';
  const feedback=element('p');
  feedback.id='friendlist-status';
  feedback.setAttribute('role','status');
  form.append(name,send);
  async function request(player,control) {
   if(!player || control.disabled)return;
   control.disabled=true;
   feedback.textContent='';
   try {
    await rpc('friend_request',{name:player});
    if(phase==='friendlist')await friends();
   } catch(error) {feedback.textContent=error.message;}
   finally {control.disabled=false;}
  }
  form.onsubmit=event=>{event.preventDefault();void request(name.value.trim(),send);};
  const groups=[
   ['Friends',rows.filter(friend=>friend.accepted),'No friends yet.'],
   ['Incoming requests',rows.filter(friend=>!friend.accepted && friend.incoming)],
   ['Sent requests',rows.filter(friend=>!friend.accepted && !friend.incoming)],
  ];
  const sections=groups.flatMap(([label,entries,empty])=>{
   if(!entries.length && !empty)return [];
   const grid=element('div',null,'shop-grid');
   for(const friend of entries) {
    const card=element('div',null,'bag-item');
    const art=element('div',null,'bag-art');
    art.append(collectionPixelArt(['....oooo....','...olccgo...','...occcgo...','....oooo....','.....oo.....','...ooccoo...','..olccccgo..','..occcccgo..','..oooooooo..'],'#8d9cd2'));
    card.append(art,element('strong',friend.name));
    if(friend.accepted) {
     const status=element('small');
     status.append(element('span',null,'friend-presence'+(friend.online?' is-online':'')),friend.online?'Online':'Offline');
     card.append(status,button('View profile',()=>window.ArenaTrainerCard.open(friend.name)));
    } else if(friend.incoming) {
     const accept=element('button','Accept');
     accept.onclick=()=>request(friend.name,accept);
     card.append(accept);
    }
    grid.append(card);
   }
   return [element('h3',label,'bag-section-title'),entries.length?grid:element('p',empty)];
  });
  byId('friendlist-content').replaceChildren(form,feedback,...sections);
 }
 byId('friends-back').onclick=()=>openMenu();
 function directorySection(title,rows,describe,icon,ranked=false) {
  const grid=element('div',null,'shop-grid');
  for(const [index,row] of rows.entries()) {
   const card=element('div',null,'bag-item');
   const art=element('div',null,'bag-art');
   art.append(icon());
   if(ranked)art.append(element('small','#'+(index+1),'bag-count'));
   card.append(art,element('strong',row.name),element('small',describe(row)));
   grid.append(card);
  }
  return [element('h3',title,'bag-section-title'),rows.length?grid:element('p','No entries yet.')];
 }
 const guildIcon=()=>collectionPixelArt(['..oooooooo..','..occlccgo..','..occwccgo..','..olwwwcgo..','..occwccgo..','..occcccgo..','...occcgo...','....ocgo....','.....oo.....'],'#6d98cd');
 async function guilds() {
  const data=await rpc('guilds');
  if(phase!=='guild-directory' && !dialog.open)return;
  phase='guild-directory';
  if(dialog.open)dialog.close();
  showScreen(phase);
  const name=input('Guild name');
  const actions=element('div',null,'guild-actions');
  const feedback=element('p');
  feedback.id='guild-action-status';
  feedback.setAttribute('role','status');
  const action=(label,method,requiresName=false)=>{
   const control=element('button',label);
   control.onclick=async()=>{
    const guildName=name.value.trim();
    if(requiresName && !guildName){name.focus();return;}
    for(const button of actions.querySelectorAll('button'))button.disabled=true;
    feedback.textContent='';
    try {
     await rpc(method,requiresName?{name:guildName}:{});
     if(phase==='guild-directory')await guilds();
    } catch(error) {feedback.textContent=error.message;}
    finally {for(const button of actions.querySelectorAll('button'))button.disabled=false;}
   };
   return control;
  };
  if(data.membership)actions.append(action('Leave guild','guild_leave'));
  else actions.append(name,action('Create guild','guild_create',true),action('Join guild','guild_join',true));
  byId('guild-directory-content').replaceChildren(
   element('p',data.membership?'Your guild · '+data.membership:'You have no guild.'),
   actions,feedback,...directorySection('Guild directory',data.guilds,g=>g.members+' members · '+g.xp+' XP',guildIcon));
 }
 async function boards() {
  const data=await rpc('leaderboards');
  if(!dialog.open)return;
  phase='leaderboard-page';
  dialog.close();
  showScreen(phase);
  const medal=color=>()=>collectionPixelArt(bagPixelShapes.stone,color);
  byId('leaderboard-content').replaceChildren(
   ...directorySection('Ranked PvP',data.ranked,p=>p.rating+' rating · '+p.wins+' wins · '+p.losses+' losses',medal('#d7a348'),true),
   ...directorySection('Co-op',data.coop,p=>p.coop+' clears',medal('#9565c5'),true),
   ...directorySection('Guilds',data.guilds,p=>p.xp+' XP',guildIcon,true));
 }
 byId('guilds-back').onclick=()=>openMenu();
 byId('leaderboards-back').onclick=()=>openMenu();
 const notificationReadKey='pokemon-arena-read-notifications';
 const notificationKeys=data=>[
  ...data.friends.map(name=>'friend:'+name),
  ...data.invites.map(invite=>'invite:'+invite.code),
  ...(data.trades ?? []).filter(notice=>!notice.read_at).map(notice=>'trade:'+notice.id),
 ];
 function updateNotificationUnread(data,markRead=false) {
  const keys=notificationKeys(data);
  const prior=new Set(JSON.parse(playerStorage.getItem(notificationReadKey) ?? '[]'));
  const seen=markRead?keys:keys.filter(key=>prior.has(key));
  playerStorage.setItem(notificationReadKey,JSON.stringify(seen));
  setToolbarUnread('toolbar-notices',keys.length-seen.length);
 }
 const notificationPulses=new Set();
 async function readNotifications(){
  if(cloudAccount && leavingAccount===cloudAccount)throw Error('Signing out.');
  const pulse=rpc('notifications');notificationPulses.add(pulse);
  let data;
  try{data=await pulse;}finally{notificationPulses.delete(pulse);}
  let hub={notices:[],pending:0};
  if(window.arenaMarketNotifications)try{hub=await window.arenaMarketNotifications();}catch{}
  return {...data,trades:hub.notices,tradePending:hub.pending};
 }
 async function notifications() {
  const data=await readNotifications();
  const direct=await window.ArenaSocial?.inbox().catch(()=>[]);
  if(data.trades?.some(notice=>!notice.read_at))await window.arenaMarketMarkRead(data.trades.filter(notice=>!notice.read_at).map(notice=>notice.id));
  updateNotificationUnread(data,true);
  show('Notifications',...(direct??[]).map(room=>button('Open trade with '+room.partner,()=>window.ArenaSocial.openTrade(room.id))),
   ...(data.trades ?? []).map(notice=>{const entry=element('article',null,'market-notice');entry.append(element('strong',notice.title),element('p',notice.message));return entry;}),
   ...(data.tradePending>0?[button('Receive completed trades',async()=>{await window.arenaMarketMutate('claim');await notifications();})]:[]),
   ...((data.trades?.length || data.tradePending)?[button('Open Trading Hub',()=>window.openTradingHub())]:[]),...data.friends.map(name=>element('div',name+' sent a friend request.')),
   ...data.friends.map(name=>button('Accept '+name,async()=>{await rpc('friend_request',{name});await notifications();})),
   ...data.invites.map(invite=>button('Join '+invite.name+' · '+invite.mode,async()=>{
    if(invite.raid){showRaidSeats(await raidRpc('join',{code:invite.code}));return;}
    active=await rpc('join',{code:invite.code});showMatch(isCoop(invite.mode)?'Co-op':'PvP');
   })),
   ...(!data.friends.length&&!data.invites.length&&!data.trades?.length&&!direct?.length?[element('p','No new notifications.')]:[]));
 }
 byId('toolbar-messages').onclick=()=>{
  if(!cloudAccount){show('Messages',element('p','Sign in to chat with other trainers.'));return;}
  return open('Messages',()=>window.ArenaSocial.messages());
 };
 byId('toolbar-notices').onclick=()=>open('Notifications',notifications);
 setInterval(async()=>{
  if(phase!=='home' || !cloudAccount || cloudAccount===leavingAccount)return;
  try {
   const data=await readNotifications();
   updateNotificationUnread(data);
  } catch {}
 },5000);
 const onlineCount=byId('home-online-count');
 let directory=null,presenceRequest=null,leavingAccount=null,nextPulse=0;
 const directoryVisible=()=>Boolean(directory?.root.isConnected && dialog.open);
 function visibleInviteView(){
  if(!inviteView || inviteView.account!==cloudAccount || inviteView.token!==generation || !inviteView.root.isConnected)return null;
  const open=dialog.contains(inviteView.root)?dialog.open:phase==='raid-lobby';
  return open?inviteView:null;
 }
 const needsOnlineNames=()=>directoryVisible() || Boolean(visibleInviteView());
 async function showInviteContacts(container,group,roomId){
  const choices=element('div'),feedback=element('p');
  feedback.setAttribute('role','status');
  choices.textContent='Checking who is online…';
  container.replaceChildren(choices,feedback);
  let contacts,available=new Set(),lastKey,recipient;
  const view={root:choices,account:cloudAccount,token:generation,update};
  inviteView=view;
  function update(rows){
   if(!contacts)return;
   const names=(rows??[]).filter(row=>!row.self && contacts.has(row.name)).map(row=>row.name);
   const key=rows?JSON.stringify(names):null;
   if(key===lastKey)return;
   lastKey=key;
   available=new Set(names);
   if(!names.length){
    const empty={friends:'No friends online.',guild:'No guild members online.',all:'No friends or guild members online.'};
    choices.textContent=rows?empty[group]:'Unable to check who is online.';
   }else if(group==='all'){
    const selected=recipient?.value;
    recipient=select('Invite recipient',names.map(name=>[name,name]));
    recipient.value=available.has(selected)?selected:names[0];
    choices.replaceChildren(recipient,button('Send invite',()=>send(recipient.value)));
   }else choices.replaceChildren(...names.map(name=>button('Invite '+name,()=>send(name))));
  }
  async function send(name){
   if(visibleInviteView()!==view)return;
   await refreshPresence();
   if(visibleInviteView()!==view || leavingAccount===view.account)return;
   if(!available.has(name)){
    feedback.textContent=lastKey===null?'':name+' is no longer online.';
    return;
   }
   try{
    await (group==='all'?rpc:raidRpc)('invite',{id:roomId,name});
    if(visibleInviteView()===view)feedback.textContent='Invited '+name+'.';
   }catch(error){
    if(visibleInviteView()===view){feedback.textContent=error.message;await refreshPresence();}
   }
  }
  try{
   if(group==='friends')contacts=new Set((await rpc('friends')).filter(friend=>friend.accepted).map(friend=>friend.name));
   else contacts=new Set(group==='guild'?await raidRpc('guildlist',{id:roomId}):await rpc('invite_list'));
  }catch(error){
   if(visibleInviteView()===view){choices.textContent='Unable to load invite contacts.';feedback.textContent=error.message;inviteView=null;}
   return;
  }
  if(visibleInviteView()===view)await refreshPresence();
 }
 function timedPresenceRequest(request){
  return typeof request.abortSignal==='function' && typeof globalThis.AbortSignal?.timeout==='function'
   ?request.abortSignal(AbortSignal.timeout(8000)):request;
 }
 async function directoryRpc(operation,client){
  client??=await cloudClient();
  const request=client.rpc('arena_online_directory',{operation,display_name:operation==='leave'?null:starterSave?.ign??null});
  const {data,error}=await timedPresenceRequest(request);if(error)throw error;return data;
 }
 function updateOnlineList(rows){
  const view=directory,key=JSON.stringify(rows);
  view.status.textContent=rows.length+' '+(rows.length===1?'trainer':'trainers')+' online';
  if(view.key===key)return;view.key=key;
  const focused=view.list.contains(document.activeElement)?document.activeElement.dataset.trainer:null;
  const buttons=new Map();
  view.list.replaceChildren(...rows.map(row=>{
   const item=element('li',null,'online-player'),name=element('strong',row.name+(row.self?' (you)':''));
   const link=button('View profile',()=>window.ArenaTrainerCard.open(row.self?null:row.name));
   link.setAttribute('aria-label','View '+row.name+'’s profile');link.dataset.trainer=row.name;buttons.set(row.name,link);
   item.append(name,link);return item;
  }));
  if(focused)buttons.get(focused)?.focus();
 }
 function refreshPresence(){
  const account=cloudAccount,withNames=needsOnlineNames();
  if(!account || leavingAccount===account){
   onlineCount.hidden=true;
   inviteView?.update(null);
   if(!account&&directoryVisible()){directory.status.textContent='Sign in to see online trainers.';directory.list.replaceChildren();directory.key=null;}
   return Promise.resolve();
  }
  if(presenceRequest){
   const pending=presenceRequest;
   if(pending.account===account && (!withNames || pending.withNames))return pending.work;
   return pending.work.then(()=>{if(cloudAccount===account && (!withNames || needsOnlineNames()))return refreshPresence();});
  }
  nextPulse=Date.now()+25000;
  const job={account,withNames},live=()=>cloudAccount===account && leavingAccount!==account;
  job.work=directoryRpc(withNames?'list':'count').then(data=>{
   if(!live())return;
   onlineCount.textContent=String(data.count);onlineCount.hidden=false;
   if(withNames && directoryVisible())updateOnlineList(data.players);
   if(withNames)visibleInviteView()?.update(data.players);
  }).catch(()=>{
   if(!live())return;
   onlineCount.hidden=true;
   visibleInviteView()?.update(null);
   if(directoryVisible()){directory.key=null;directory.list.replaceChildren();directory.status.textContent='Online players could not be loaded. Try refreshing.';}
  }).finally(()=>{if(presenceRequest===job)presenceRequest=null;});
  presenceRequest=job;return job.work;
 }
 async function showDirectory(){
  const root=element('section',null,'online-directory'),header=element('div',null,'online-directory-header');
  const status=element('p','Loading online players…'),list=element('ul',null,'online-directory-list');
  status.setAttribute('role','status');list.setAttribute('aria-label','Online trainers');
  header.append(status,button('Refresh',refreshPresence));root.append(header,list);
  directory={root,status,list,key:null};show('Online',root);await refreshPresence();
 }
 window.refreshArenaPresence=refreshPresence;
 window.resumeArenaPresence=()=>{leavingAccount=null;return refreshPresence();};
 window.leaveArenaPresence=async client=>{
  const account=cloudAccount;if(!account)return;leavingAccount=account;onlineCount.hidden=true;inviteView?.update(null);
  // The legacy notifications RPC refreshes the same timestamp. Let earlier writes finish before leaving.
  await Promise.allSettled([...notificationPulses,presenceRequest?.work]);
  if(cloudAccount===account)try{await directoryRpc('leave',client);}catch{}
 };
 byId('home-hub').onclick=()=>{
  if(!cloudAccount){show('Trading Hub',element('p','Sign in to enter the Trading Hub.'));return;}
  return open('Trading Hub',()=>window.openTradingHub());
 };
 byId('home-online').onclick=()=>{
  if(!cloudAccount){show('Online',element('p','Sign in to see online trainers and their profiles.'));return;}
  return open('Online',showDirectory);
 };
 window.addEventListener('online',refreshPresence);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshPresence();});
 setInterval(()=>{if(needsOnlineNames() || Date.now()>=nextPulse)void refreshPresence();},10000);
 void refreshPresence();
 byId('home-coop').onclick=()=>open('Co-op',()=>lobby(true));
 byId('home-pvp').onclick=()=>open('PvP',()=>lobby(false));
 byId('home-friendlist').onclick=()=>open('Friendlist',friends);
 byId('home-guilds').onclick=()=>open('Guilds',guilds);
 byId('home-leaderboard').onclick=()=>open('Leaderboards',boards);
})();
