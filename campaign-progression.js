/* Regional progression. Inventory claims are server transactions for signed-in accounts. */
(()=>{
 'use strict';
 const regions=gymRegions.map(([name,generation],index)=>({name,generation,index,
  badges:gymTeams.filter(gym=>gym.region===name).map(gym=>gym.id)}));
 const bundles=regions.flatMap(({name})=>[false,true].map(master=>({region:name,master,key:(master?'master:':'standard:')+name})));
 const standardCoins=[2000,3000,4500,6000,8000,10000,12500,15000];
 const standardCandy=[1,1,1,2,2,2,3,3],masterCandy=[2,2,2,3,3,3,4,4];
 const unlockText=['Two additional battle presets','Regional daily bounties','Targeted family hunts',
  'Two more presets and upgraded training rewards','Weekly elite Trainer contracts','Six daily hunt choices and the Kalos Laurel frame',
  'Upgraded elite contract rewards','4× speed and the Champion title'];
 const tabButtons=new Map();
 const phaseAllowed=()=>['home','menu','gyms','collection','wild-regions','trainer-regions'].includes(phase) && !automaticBattleLoopActive() && !window.isArenaMarketBusy?.();
 const signed=()=>Boolean(sessionStorage.getItem('arena-online-user'));
 const sections=[['regions','Regional rewards'],['contracts','Contracts'],['hunts','Hunts'],['presets','Presets']];
 let panel=null,tab='regions',feedback='',server=null,busy=false,battle=null,lastRead=0,serverOffset=0,readRevision=0;
 const day=()=>new Date(Date.now()+(signed()?serverOffset:0)).toISOString().slice(0,10);
 function week(){const date=new Date();date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);return date.toISOString().slice(0,10);}
 function state(){
  const data=wildProgress.campaign;
  if(!data || typeof data!=='object' || Array.isArray(data))wildProgress.campaign={};
  const result=wildProgress.campaign;
  if(!Array.isArray(result.presets))result.presets=[];
  if(!Array.isArray(result.claimed))result.claimed=[];
  result.claimed=result.claimed.filter(key=>typeof key==='string' && (key.startsWith('standard:') || key.startsWith('master:') || key.startsWith('daily:'+day()+':') || key.startsWith('elite:'+week()+':')));
  return result;
 }
 function completed(region,master=false){return gymRegionCleared(region,master);}
 function unlocked(region){return completed(region);}
 function capacity(){return 2+(unlocked('Kanto')?2:0)+(unlocked('Sinnoh')?2:0);}
 function family(name){let id=dex[name]?.[0],seen=new Set();while(id && evolutionData[id]?.[0] && !seen.has(id)){seen.add(id);id=evolutionData[id][0];}return id;}
 function hash(text){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;}
 function reward(region,master=false){const i=regions.findIndex(row=>row.name===region);return {coins:standardCoins[i]*(master?2:1),
  vitamins:{'Rare Candy':(master?masterCandy:standardCandy)[i],'EXP Candy 500':master?2+Math.floor(i/2):1+Math.floor(i/3)}};}
 function rewardsText(value){return [earnedCoins(value.coins).toLocaleString()+' coins',...Object.entries(value.vitamins??{}).map(([name,n])=>n+'× '+experienceCandyName(name)),
  ...(value.capsules?[value.capsules+'× Ability Capsule']:[])].join(' · ');}
 function applyReward(value,progress=wildProgress){progress.coins+=earnedCoins(value.coins);for(const [name,count] of Object.entries(value.vitamins??{}))progress.vitamins[name]=(progress.vitamins[name]??0)+count;
  progress.capsules+=value.capsules??0;}
 function claims(){return signed()?(server?.claimed??state().claimed):state().claimed;}
 function availableBundles(paid){return bundles.filter(b=>!paid.has(b.key) && completed(b.region,b.master));}
 function adoptStatus(snapshot){
  server=snapshot;lastRead=Date.now();if(server.server_now)serverOffset=Date.parse(server.server_now)-Date.now();
  const current=state();if(JSON.stringify(current.hunt??null)!==JSON.stringify(server.hunt??null) || JSON.stringify(current.claimed)!==JSON.stringify(server.claimed)){current.hunt=server.hunt??null;current.claimed=server.claimed??[];saveWildProgress();}
 }
 async function read(){
  const token=++readRevision,user=sessionStorage.getItem('arena-online-user');
  if(!user){server=null;return;}
  const snapshot=await window.arenaCampaignRead('status');
  if(token!==readRevision || user!==sessionStorage.getItem('arena-online-user'))return;
  adoptStatus(snapshot);
 }
 function button(label,action,disabled=false){const node=element('button',label);node.type='button';node.disabled=disabled;node.onclick=action;return node;}
 function message(text){feedback=text;const node=panel?.querySelector('.campaign-message');if(node){node.textContent=text;node.hidden=!text;}else if(text)showPassBattleNotice(text);}
 async function transaction(action,args){
  if(busy || !phaseAllowed())throw Error('Finish your current battle or transaction first.');
  busy=true;render();
  try{
   const result=await window.arenaCampaignMutate(action,args);
   if(result.campaign){readRevision++;adoptStatus(result.campaign);}return result;
  }
  finally{busy=false;}
 }
 function claimGuestBundles(selected){
  const total={coins:0,vitamins:{}};
  for(const bundle of selected){
   const value=reward(bundle.region,bundle.master);total.coins+=value.coins;
   for(const [item,n] of Object.entries(value.vitamins))total.vitamins[item]=(total.vitamins[item]??0)+n;
  }
  const current=state(),next={...wildProgress,vitamins:{...wildProgress.vitamins},
   campaign:{...current,claimed:[...current.claimed,...selected.map(b=>b.key)]}};
  applyReward(total,next);
  if(!saveWildProgress(next))throw Error('Could not save these rewards. Free up storage and try again.');
  Object.assign(wildProgress,next);return total;
 }
 async function claim(region,master=false){
  if(busy || !phaseAllowed())return;
  const all=region===undefined;
  try{
   if(signed()){
    const result=await transaction(all?'claim_all_regions':'claim_region',all?{}:{region,master});
    render();message((result.message??'Regional rewards received.')+(result.reward?' '+rewardsText(result.reward):''));
   }else{
    const selected=availableBundles(new Set(claims())).filter(b=>all || b.region===region && b.master===master);
    if(!selected.length){message('No regional rewards are ready to claim.');return;}
    const total=claimGuestBundles(selected);render();
    message('Claimed '+selected.length+' regional '+(selected.length===1?'bundle':'bundles')+' · '+rewardsText(total)+'.');
   }
  }catch(error){render();message(error.message);}
 }
 function safePreset(preset){
  if(!preset || typeof preset.name!=='string' || !Array.isArray(preset.team) || !preset.team.length || preset.team.length>6 || new Set(preset.team).size!==preset.team.length)
   throw Error('This preset is incomplete.');
  const nextMoves={},nextAI={},nextHeld={...wildProgress.held};
  for(const name of preset.team){
   if(!ownedPokemon(name))throw Error(name+' is no longer in your PC. Edit this preset first.');
   const requested=preset.moves?.[name];
   if(!Array.isArray(requested) || requested.length<1 || requested.length>4 || requested.some(move=>!legalMoves(name).includes(move)))throw Error('Some saved moves are unavailable for '+name+'.');
   nextMoves[name]=legalLoadout(name,requested);nextAI[name]=normalizeBattleAI(preset.ai?.[name]);delete nextHeld[name];
  }
  for(const name of preset.team){
   const item=preset.held?.[name];if(!item)continue;
   if(!Object.hasOwn(heldItems,item) || evolutionStones.includes(item) && !canHoldEvolutionItem(name,item))throw Error(name+' cannot equip '+item+'.');
   if(Object.values(nextHeld).filter(value=>value===item).length>=(wildProgress.items[item]??0))throw Error('No available '+item+'. Unequip it from another Pokémon first.');
   nextHeld[name]=item;
  }
  return {nextMoves,nextAI,nextHeld};
 }
 function savePreset(index,label){
  if(!phaseAllowed())throw Error('Finish your current battle or transaction first.');
  if(!Number.isInteger(index) || index<0 || index>=capacity())throw Error('This preset slot is locked.');
  const name=String(label??'').trim().slice(0,40);if(!name)throw Error('Give the preset a name.');
  state().presets[index]={name,team:[...team],moves:Object.fromEntries(team.map(name=>[name,[...movesFor(name)]])),
   ai:Object.fromEntries(team.map(name=>[name,normalizeBattleAI(wildProgress.ai[name])])),held:Object.fromEntries(team.filter(name=>wildProgress.held[name]).map(name=>[name,wildProgress.held[name]])),
   battlePlan:normalizeTeamPlan(wildProgress.battlePlan),carry:wildProgress.battleCarry??''};
  saveWildProgress();
 }
 function loadPreset(index){
  if(!phaseAllowed())throw Error('Finish your current battle or transaction first.');
  if(!Number.isInteger(index) || index<0 || index>=capacity())throw Error('This preset slot is locked.');
  const preset=state().presets[index],{nextMoves,nextAI,nextHeld}=safePreset(preset);
  team.splice(0,team.length,...preset.team);Object.assign(loadouts,nextMoves);Object.assign(wildProgress.ai,nextAI);wildProgress.held=nextHeld;
  wildProgress.battlePlan=normalizeTeamPlan(preset.battlePlan);wildProgress.battleCarry=preset.carry??'';activeSlot=0;inspected=null;
  saveTeam();saveWildProgress();renderMenu();
 }
 function presetControls(){
  const group=element('details',null,'campaign-presets');group.append(element('summary','Battle presets · '+state().presets.filter(Boolean).length+' / '+capacity()),
   element('p','Save your team, moves, held items, Gambits and battle plan. Presets use each species’ active PC copy.'));
  const notice=element('p',null,'campaign-message');notice.setAttribute('role','status');notice.hidden=true;group.append(notice);
  const attempt=fn=>{try{fn();notice.textContent='Preset updated.';notice.hidden=false;}catch(error){notice.textContent=error.message;notice.hidden=false;}};
  for(let index=0;index<capacity();index++){
   const saved=state().presets[index],row=element('div',null,'campaign-preset-row'),name=element('input');name.maxLength=40;name.value=saved?.name??'';name.placeholder='Preset '+(index+1);name.setAttribute('aria-label','Preset '+(index+1)+' name');
   row.append(name,button(saved?'Overwrite':'Save',()=>attempt(()=>{savePreset(index,name.value);renderPresets();})),
    button('Load',()=>attempt(()=>loadPreset(index)),!saved),button('Delete',()=>attempt(()=>{state().presets[index]=null;saveWildProgress();renderPresets();}),!saved));
   if(saved)row.append(element('small',saved.team.join(' · ')));group.append(row);
  }
  return group;
 }
 function renderPresets(){const target=byId('pc-battle-presets');if(target)target.replaceChildren(presetControls());}
 function guestHuntChoices(region){
  const generation=regions.find(row=>row.name===region)?.generation,found=new Map();
  for(const name of dexNames)if((typeof speciesForms!=='undefined' && speciesForms[dex[name][0]]?speciesForms[dex[name][0]].encounterRegion===region:generationOf(name)===generation) && !isLegendaryEncounter(name) && !found.has(family(name)))found.set(family(name),{root:family(name),name,min_level:minimumEncounterLevel(dex[name][0])});
  return [...found.values()].sort((a,b)=>hash(day()+region+a.root)-hash(day()+region+b.root)).slice(0,unlocked('Kalos')?6:3);
 }
 function activeHunt(){const hunt=state().hunt;return hunt && hunt.day===day() && hunt.remaining>0?hunt:null;}
 function pickEncounter(pool,region,fallback){
  const hunt=activeHunt();if(!hunt || hunt.region!==region)return fallback;
  hunt.remaining=Math.max(0,hunt.remaining-1);saveWildProgress();
  if(isLegendaryEncounter(fallback))return fallback;
  const matches=pool.filter(name=>!isLegendaryEncounter(name) && family(name)===hunt.root);
  return matches.length && Math.random()<.35?matches[Math.floor(Math.random()*matches.length)]:fallback;
 }
 async function startHunt(region,root){
  try{
   if(signed()){await transaction('start_hunt',{region,root});await read();}
   else{
    if(!unlocked('Hoenn') || !completed(region))throw Error('Clear Hoenn and this region first.');
    if(state().huntDay===day())throw Error('Today’s hunt has already been started.');
    if(!guestHuntChoices(region).some(choice=>choice.root===root))throw Error('Choose a family from today’s board.');
    state().huntDay=day();state().hunt={id:crypto.randomUUID(),day:day(),region,root,remaining:20};saveWildProgress();
   }
   render();message('Hunt started: 20 encounters in '+region+'.');
  }catch(error){render();message(error.message);}
 }
 function titles(){return [...(unlocked('Paldea')?['Champion']:[]),...regions.filter(row=>completed(row.name,true)).map(row=>row.name+' Master')];}
 function appearance(){const selected=state().appearance;return regions.some(row=>row.name===selected && completed(row.name,true))?selected:'';}
 function refreshCosmetics(){
  const title=byId('campaign-player-title');if(title){title.textContent=titles().includes(state().title)?state().title:'';title.hidden=!title.textContent;}
  byId('home')?.classList.toggle('has-kalos-laurel',Boolean(state().laurel && unlocked('Kalos')));
 }
 function paintTrim(ctx,width,height){
  const selected=appearance();if(!selected)return;
  const colors=['#92bd77','#b9a070','#6db8c9','#b5cdd8','#d3b563','#d9a3bd','#a6b6b2','#b6b071'],color=colors[regions.findIndex(row=>row.name===selected)];
  ctx.save();ctx.fillStyle=color;ctx.strokeStyle='#253d36';ctx.lineWidth=1;
  for(const x of [46,width-46]){ctx.beginPath();ctx.moveTo(x-7,3);ctx.lineTo(x+7,3);ctx.lineTo(x+7,17);ctx.lineTo(x,13);ctx.lineTo(x-7,17);ctx.closePath();ctx.fill();ctx.stroke();}
  ctx.restore();
 }
 function guestContracts(){
  const completedRegions=regions.filter(row=>completed(row.name));if(!unlocked('Johto'))return [];
  const cards=[];for(let slot=0;slot<2;slot++){
   const region=completedRegions[hash(day()+slot)%completedRegions.length].name;
   cards.push({key:'daily:'+day()+':'+slot,kind:'daily',region,slot,period:day(),seed:hash(day()+slot+region),
    reward:{coins:unlocked('Sinnoh')?1000:750,vitamins:unlocked('Sinnoh')?{'EXP Candy 500':1,Protein:1}:{'EXP Candy 250':1}}});
  }
  if(unlocked('Unova'))for(let slot=0;slot<2;slot++){
   const region=completedRegions[hash(week()+slot)%completedRegions.length].name,up=unlocked('Galar');
   cards.push({key:'elite:'+week()+':'+slot,kind:'elite',region,slot,period:week(),seed:hash(week()+slot+region),
    reward:{coins:up?5000:3000,vitamins:{'Rare Candy':up?2:1,'EXP Candy 500':up?3:2},capsules:1}});
  }
  return cards;
 }
 async function engine(){return import('./supabase/functions/arena-combat/engine.js?v='+updateLogEntries[0].version);}
 async function startContract(card){
  try{
   if(busy || !phaseAllowed())throw Error('Finish your current battle or transaction first.');
   unlockSkillSound();
   let run;
   if(signed()){
    const result=await transaction('start_contract',{key:card.key});busy=true;render();
    const prepared=await window.arenaCampaignVerify(result.run_id,'prepare');run={...prepared,online:true};
   }else{
    if(state().claimed.includes(card.key))return;busy=true;render();
    const lib=await engine(),save=readArenaSave();run={run_id:crypto.randomUUID(),definition:card,match:lib.campaignContractMatch(save.entries,card,crypto.randomUUID()),online:false};
   }
   const lib=await engine();if(run.version && run.version!==lib.campaignEngineVersion)throw Error('The battle server is updating. Retry when the client and server versions match.');
   busy=false;playSavedBattle(run,lib);
  }catch(error){busy=false;render();message(error.message);}
 }
 function playSavedBattle(run,lib){
   window.ArenaTrainerCard.closeMissions();openMenu();selectedGym=selectedWild=selectedTrainer=null;selectedMasterGym=false;rogueRun=null;raidBattleBackdrop=null;
   activePlayer=activeEnemy=playerSwitch=enemySwitch=null;trainerPanels=null;recallSlot=null;lastDpsRender=-1;setArenaDimensions();
   const out=lib.simulateOnline(run.match,null,0,null,'host');battle={...run,lib,state:out.state,result:null,accumulator:0,done:false,visualActors:new Map(),soundTimeline:globalThis.ArenaMoveAudio?.createTimeline()};
   phase='contract-battle';showScreen('battle');byId('battle').classList.remove('is-mega-raid');
   byId('legendary-intro').hidden=byId('next-gym').hidden=true;byId('start').disabled=true;
   byId('choices').replaceChildren(button(run.exhibition?'Return to gauntlet':'Abandon contract',()=>{
    battle=null;byId('reset').disabled=byId('basic-attacks').disabled=byId('speed').disabled=false;stopBattleMusic();openMenu();
    if(run.exhibition)run.exit();else open('contracts');
   }));
   byId('reset').disabled=true;byId('basic-attacks').disabled=true;byId('speed').disabled=true;byId('speed').textContent='1× speed';
   updateAutoReserveToggle();updateNormalAttackToggle(true,()=>{});
   byId('status').textContent=run.label??((run.definition.kind==='elite'?'Elite Trainer contract':'Regional bounty')+' · '+run.definition.region+' · Saved team and AI · 1×');
   adoptBattle();startBattleMusic();
 }
 function adoptBattle(){
  if(!battle)return;const data=battle.state,actors=battle.visualActors;
  const sync=entry=>{const actor=actors.get(entry.onlineId)??{};Object.assign(actor,entry);actors.set(entry.onlineId,actor);return actor;};
  allies=data.allies.map(sync);enemies=data.enemies.map(sync);
  for(const actor of actors.values())for(const key of ['ailmentSource','lastDamageBy'])actor[key]=actors.get(actor[key])??null;
  onlineMatchDuration=data.clock;clock=data.clock;lastDamageClock=data.lastDamageClock;arenaMap=data.arenaMap;
  trainerFields=data.fields.map(slots=>slots.map(slot=>({...slot,actor:actors.get(slot.actor)??null,
   transition:slot.transition?{...slot.transition,outgoing:actors.get(slot.transition.outgoing)??null,incoming:actors.get(slot.transition.incoming)}:null})));
  pendingCasts=data.casts.map(cast=>({...cast,actor:actors.get(cast.actor)}));effects=data.effects;damageBuckets=data.damageBuckets;
  battleWeather=data.battleWeather;battleTerrain=data.battleTerrain;weatherTime=data.weatherTime;terrainTime=data.terrainTime;
  arenaSkillFields=data.arenaSkillFields??[];entryHazards=data.entryHazards;fieldMoveExpiry=data.fieldMoveExpiry;
  if(!battle.rosterReady){renderBattleRosters();battle.rosterReady=true;}
  updateActivePanels(trainerFields);updateScore();renderBattleDps(clock,damageBuckets);updateBattleRosters();
  battle.soundTimeline?.collect(data.sounds,data.clock);
  battle.soundTimeline?.advance(data.clock,playSkillSound);
  byId('arena-duration').textContent='Contract · '+Math.floor(clock/60)+'m '+Math.floor(clock%60)+'s · 1×';
 }
 async function finishContract(){
  const run=battle;if(!run || run.done)return;run.done=true;stopBattleMusic();
  const win=run.result==='host' && run.state.enemies.every(actor=>actor.hp<=0);
  byId('status').textContent=win?'Contract won! Verifying rewards…':'Contract lost. Adjust your saved team and try again.';
  const exit=()=>{battle=null;byId('reset').disabled=byId('basic-attacks').disabled=byId('speed').disabled=false;stopBattleMusic();openMenu();open('contracts');};
  byId('choices').replaceChildren(button(win && run.online?'Verifying rewards…':'Return to contracts',exit,win && run.online));
  if(!win){if(run.online)void window.arenaCampaignVerify(run.run_id,'verify').catch(()=>{});return;}
  try{
   if(run.online){
    await window.arenaCampaignVerify(run.run_id,'verify');
    battle=null;byId('reset').disabled=byId('basic-attacks').disabled=byId('speed').disabled=false;openMenu();const result=await transaction('claim_contract',{run_id:run.run_id});await read();open('contracts',(result.message??'Contract rewards received.')+(result.reward?' '+rewardsText(result.reward):''));
   }else{
    if(!state().claimed.includes(run.definition.key)){state().claimed.push(run.definition.key);applyReward(run.definition.reward);saveWildProgress();}
    battle=null;byId('reset').disabled=byId('basic-attacks').disabled=byId('speed').disabled=false;openMenu();open('contracts','Contract rewards received · '+rewardsText(run.definition.reward));
   }
  }catch(error){
   if(phase==='contract-battle')byId('choices').replaceChildren(button('Retry reward verification',async()=>{run.done=false;await finishContract();}),button('Return to contracts',exit));
   if(phase!=='contract-battle')await open('contracts');
   message(error.message);byId('status').textContent=error.message;
  }
 }
 function advanceBattle(dt){
  if(!battle)return;visualTime+=dt;if(battle.done)return;
  battle.accumulator+=dt;const steps=Math.min(4,Math.floor(battle.accumulator*60));if(!steps)return;battle.accumulator-=steps/60;
  const out=battle.lib.simulateOnline(battle.match,battle.state,steps,null,'host');battle.state=out.state;battle.result=out.result;adoptBattle();
  if(out.result && battle.exhibition){
   const run=battle;battle=null;byId('reset').disabled=byId('basic-attacks').disabled=byId('speed').disabled=false;
   stopBattleMusic();openMenu();void run.complete(out);
  } else if(out.result)void finishContract();
 }
 function render(){
  if(!panel)return;for(const [id,node] of tabButtons)node.setAttribute('aria-pressed',String(id===tab));panel.replaceChildren();
  const notice=element('p',feedback,'campaign-message');notice.hidden=!feedback;notice.setAttribute('role','status');panel.append(notice);
  if(signed() && !busy && window.isArenaMarketBusy?.()){
   const recover=button('Retry pending sync',async()=>{
    try{await window.arenaMarketRecover();await read();render();message('Account progress synced.');}
    catch(error){message(error.message);}
   });
   recover.className='campaign-recover';panel.append(recover);
  }
  if(tab==='regions'){
   panel.append(element('p','Complete each standard region to unlock its level-100 Master challenges. Regional bundles can be claimed once per account.'));
   const paid=new Set(claims()),available=availableBundles(paid),blocked=busy || Boolean(window.isArenaMarketBusy?.());
   const actions=element('div',null,'campaign-claim-actions'),count=element('span',available.length+' '+(available.length===1?'bundle':'bundles')+' available');
   count.id='campaign-reward-count';const claimAll=button('Claim All',()=>claim(),blocked || !available.length);
   claimAll.setAttribute('aria-describedby',count.id);actions.append(claimAll,count);panel.append(actions);
   for(const row of regions){
    const card=element('section',null,'campaign-region-card'),normal=row.badges.filter(id=>clearedGyms.includes(id)).length,master=row.badges.filter(id=>masterGymClears.has(id)).length;
    card.append(element('h3',row.name+' · '+normal+'/'+row.badges.length+' standard · '+master+'/'+row.badges.length+' Master'),element('p',unlockText[row.index]),
     element('small','Standard: '+rewardsText(reward(row.name))),element('small','Master: '+rewardsText(reward(row.name,true))));
    for(const bundle of bundles.filter(b=>b.region===row.name)){const claimed=paid.has(bundle.key),tier=bundle.master?'Master':'standard';
     card.append(button(claimed?(bundle.master?'Master':'Standard')+' reward claimed':'Claim '+tier+' reward',
      ()=>claim(row.name,bundle.master),blocked || claimed || !completed(row.name,bundle.master)));}
    if(completed(row.name))card.append(element('small','Master challenges unlocked · Lv. 100'));panel.append(card);
   }
  }else if(tab==='presets')panel.append(presetControls());
  else if(tab==='hunts'){
   if(!unlocked('Hoenn')){panel.append(element('p','Clear Hoenn to unlock targeted family hunts.'));return;}
   const hunt=activeHunt();if(hunt)panel.append(element('p','Active hunt · '+hunt.region+' · '+(speciesById[hunt.root]??'Family')+' · '+hunt.remaining+' encounters remaining.'));
   panel.append(element('p','Choose one family each UTC day. During 20 encounters in that region, ordinary encounters have a 35% chance to favor eligible members of that family. Legendary and shiny odds stay at their normal rates.'));
   for(const row of regions.filter(row=>completed(row.name))){
    const card=element('section',null,'campaign-region-card');card.append(element('h3',row.name));
    const choices=signed()?(server?.hunts?.[row.name]??[]):guestHuntChoices(row.name);
    for(const choice of choices)card.append(button('Hunt '+choice.name+' family · Lv. '+choice.min_level+'+',()=>startHunt(row.name,choice.root),busy || (signed()?server?.hunt_used:state().huntDay===day())));
    panel.append(card);
   }
  }else if(tab==='contracts'){
   if(!unlocked('Johto')){panel.append(element('p','Clear Johto to unlock regional daily bounties. Unova unlocks weekly elite contracts.'));return;}
   panel.append(element('p','Daily bounties reset at 00:00 UTC. Elite contracts reset Monday at 00:00 UTC. Daily bounties use your first three team slots. Elite contracts require six Pokémon. Saved moves, items, AI and battle plans are locked for the attempt at 1×. Defeat the entire enemy team to earn the listed bundle.'));
   const cards=signed()?(server?.contracts??[]):guestContracts();
   for(const card of cards){const box=element('section',null,'campaign-region-card'),claimed=claims().includes(card.key);
    box.append(element('h3',(card.kind==='elite'?'Weekly elite':'Daily bounty')+' · '+card.region),element('p',rewardsText(card.reward)),
     button(claimed?'Reward claimed':'Challenge',()=>startContract(card),busy || claimed || card.kind==='elite' && team.length<6));if(card.kind==='elite' && team.length<6)box.append(element('small','Add six Pokémon to your active team to enter.'));panel.append(box);}
   for(const run of server?.recoverable??[])panel.append(button('Verify pending '+run.region+' contract',async()=>{
    try{busy=true;await window.arenaCampaignVerify(run.run_id,'verify');busy=false;await transaction('claim_contract',{run_id:run.run_id});await read();render();message('Pending rewards received.');}
    catch(error){busy=false;message(error.message);}
   },busy));
  }
  if(signed())panel.append(button('Refresh account progress',async()=>{try{await read();render();}catch(error){message(error.message);}},busy));
 }
 function unmountMissions(){panel=null;tabButtons.clear();}
 async function mountMissions(host,selected,notice=''){
  if(sections.some(([id])=>id===selected))tab=selected;
  feedback=notice;tabButtons.clear();
  const tabs=element('nav',null,'campaign-tabs');tabs.setAttribute('aria-label','Regional missions');
  for(const [id,label] of sections){
   const control=button(label,()=>{if(!busy){tab=id;feedback='';render();}});
   tabButtons.set(id,control);tabs.append(control);
  }
  const current=element('div',null,'campaign-content');panel=current;host.append(tabs,panel);render();
  if(signed() && Date.now()-lastRead>2000){
   try{await read();if(panel===current)render();}catch(error){if(panel===current)message(error.message);}
  }
 }
 function open(selected='regions',notice=''){
  if(phaseAllowed())return window.ArenaTrainerCard.openMissions(selected,notice);
 }
 function entrance(target){target.append(button('Regional missions',()=>open('regions')));}
 window.ArenaCampaign={playSavedBattle,isBusy:()=>busy,open,entrance,mountMissions,unmountMissions,renderPresets,capacity,savePreset,loadPreset,pickEncounter,family,reward,titles,appearance,refreshCosmetics,paintTrim,advanceBattle,
  regionComplete(region,master){showPassBattleNotice(region+(master?' Master collection complete!':' region complete!')+' Claim your rewards in Profile → Missions.');}};
 refreshCosmetics();
})();
