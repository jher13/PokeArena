/* Starter route, build goals, gym practice and raid target calls. */
(()=>{
 'use strict';
 const node=element,guideState=()=>((wildProgress.campaign??={}).journey??={});
 const button=(label,action)=>{const b=node('button',label);b.type='button';b.onclick=action;return b;};
 const clone=value=>structuredClone(value);
 let snapshot=null,lastLoss=null,replay=false,launchingPractice=false,hit=null,swappedTo='',startingLead='';
 const rosterKey=()=>JSON.stringify(team.map(name=>[name,wildProgress.held[name],wildProgress.ai[name],movesFor(name)]));
 function goalControl(name){
  const details=node('details',null,'journey-goal'),saved=guideState(),goal=saved.goals?.[name];
  const select=node('select'),label=node('label','Build target ');
  for(const item of ['Ability Capsule',...Object.keys(heldItems).sort()]){
   const option=node('option',item);option.value=item;select.append(option);
  }
  select.value=goal??(heldItems['Scope Lens']?'Scope Lens':'Ability Capsule');
  details.append(node('summary',goal?'Build goal · '+goal:'Pin a build goal'),label);label.append(select);
  const pin=button('Pin goal',()=>{
   (saved.goals??={})[name]=select.value;saved.featuredGoal=name;saveWildProgress();renderDetail();
  });details.append(pin);
  if(goal)details.append(goalSummary(name,goal),button('Remove goal',()=>{
   delete saved.goals[name];if(saved.featuredGoal===name)saved.featuredGoal=Object.keys(saved.goals)[0];saveWildProgress();renderDetail();
  }));
  return details;
 }
 function goalSummary(name,goal){
  const section=node('div',null,'journey-goal-progress'),capsule=goal==='Ability Capsule';
  const price=capsule?capsulePrice:heldItems[goal]?.price;
  if(!Number.isFinite(price))return section;
  const cost=Math.max(0,price-wildProgress.coins),owned=capsule?wildProgress.capsules:wildProgress.items[goal]??0;
  section.append(node('strong',name+' · '+goal),node('span',owned+' owned · '+wildProgress.coins.toLocaleString()+' / '+price.toLocaleString()+' coins · '+(cost?cost.toLocaleString()+' more needed':'ready to buy')));
  const controls=node('div',null,'journey-actions');section.append(controls);
  const go=action=>{byId('home-dialog')?.close();action();};
  controls.append(button('Trainer Battles · coins',()=>go(openTrainerSetup)),button('Item Shop',()=>go(openShop)));
  if(capsule){
   section.append(node('small','For a capsule from supplies, complete the Stage 4 board objective twice in PFT, or finish the Hoenn field study and defeat its boss in Roguelit.'));
   for(const [mode,id,title] of [['tactics','home-tactics','PFT · Stage 4 supply'],['roguelit','home-roguelit','Roguelit · Hoenn field study']]){
    controls.append(button(title,()=>go(()=>{sidePreference(mode,'development');byId(id).click();})));
   }
  }
  return section;
 }
 function routeCandidates(){
  const starter=starterSave?.name??team[0],type=dex[starter]?.[1],pool=eligibleWildPokemon('Kanto',6);
  const options=type==='Water'?['Oddish','Nidoran♀','Bellsprout','Mankey','Caterpie']:type==='Grass'?['Poliwag','Mankey','Psyduck','Nidoran♂','Spearow']:['Poliwag','Oddish','Mankey','Psyduck','Bellsprout'];
  return [...new Set([...options,...pool])].filter(name=>name!==starter && pool.includes(name) && !isLegendaryEncounter(name)).slice(0,2);
 }
 function route(root){
  const save=guideState(),state=save.route??{},box=node('details',null,'journey-route');
  box.open=!state.hidden && !clearedGyms.length;box.append(node('summary','Road to Brock'));
  box.ontoggle=()=>{if(box.isConnected && (save.route??={}).hidden!==!box.open){save.route.hidden=!box.open;saveWildProgress();}};
  const names=routeCandidates(),partner=names.find(name=>wildProgress.owned[name]);
  if(!partner)box.append(node('p','Choose a partner to catch before challenging the Pewter Gym.'));
  for(const name of names.filter(n=>!wildProgress.owned[n]))box.append(button('Encounter '+name+' · '+dex[name].slice(1,3).filter(Boolean).join(' / '),()=>openBattle(null,{name,region:'Kanto',level:Math.min(6,(wildProgress.owned[team[0]]?.level??1)+1),tier:'I',shiny:false,journeyRoute:true})));
  if(partner){
   box.append(node('p',state.switched?'Switch lesson complete. Take your team to Pewter Gym.':'Try a switch in a trainer battle. Tap a healthy reserve while your lead is fighting.'));
   box.append(button('Train with '+partner,()=>{
    if(!team.includes(partner) && team.length<6){team.push(partner);saveTeam();}
    const t=trainerEncounter('Kanto',wildDifficulties[0],1);
    t.roster=[{name:'Rattata',level:3},{name:'Geodude',level:4}];t.coins=0;t.journeyLesson=true;
    openBattle(null,null,t);startBattle();
   }));
  }
  box.append(button('Challenge Brock',()=>openBattle(gymTeams[0])));root.append(box);
 }
 function home(){
  replay=false;launchingPractice=false;
  const root=byId('journey-home');if(!root)return;
  root.replaceChildren();restoreLoss();const save=guideState();
  if(!clearedGyms.length)route(root);
  if(lastLoss && lastLoss.account===playerSaveKey('journey')){
   const box=node('section',null,'journey-loss');box.append(node('strong','Rematch practice · '+lastLoss.gym.name),node('p',lastLoss.tip),
    button('Practice same fight',practice),button('Edit team in PC',openTeamBuilder),button('Dismiss',()=>{keepLoss(null);home();}));root.append(box);
  }
  if(lastLoss && save.editedPractices)root.append(node('small','Practice wins after editing your team · '+(save.winsAfterEdit??0)+' / '+save.editedPractices));
  const name=save.featuredGoal;if(name && save.goals?.[name] && wildProgress.owned[name])root.append(goalSummary(name,save.goals[name]));
  root.hidden=!root.childElementCount;
 }
 function enterBattle(){replay=launchingPractice;launchingPractice=false;hit=null;swappedTo='';startingLead='';}
 function prepared(){
  if(replay && lastLoss){enemies=clone(lastLoss.enemies);arenaMap=clone(lastLoss.map);return;}
  if(!selectedGym || rogueRun){snapshot=null;return;}
  snapshot={account:playerSaveKey('journey'),gym:gymTeams.find(g=>g.id===selectedGym.id),master:selectedMasterGym,enemies:clone(enemies),map:clone(arenaMap),build:rosterKey()};
 }
 function keepLoss(loss){
  lastLoss=loss;
  try{
   const key=playerSaveKey('journey-gym-retry');
   if(loss)sessionStorage.setItem(key,JSON.stringify({...loss,gym:loss.gym.id}));else sessionStorage.removeItem(key);
  }catch{}
 }
 function restoreLoss(){
  if(lastLoss)return;
  try{
   const old=JSON.parse(sessionStorage.getItem(playerSaveKey('journey-gym-retry'))??'null');
   const gym=gymTeams.find(g=>g.id===old?.gym);
   if(gym && old.account===playerSaveKey('journey') && Array.isArray(old.enemies) && old.map)lastLoss={...old,gym};
  }catch{}
 }
 function practice(){
  if(!lastLoss || lastLoss.account!==playerSaveKey('journey'))return;
  launchingPractice=true;openBattle(lastLoss.gym,null,null,null,lastLoss.master);
 }
 function finish(result,timed){
  if(replay){
   const changed=lastLoss && (lastLoss.build!==rosterKey() || Boolean(startingLead && lastLoss.lead && startingLead!==lastLoss.lead));
   if(changed){
    const stats=guideState();stats.editedPractices=(stats.editedPractices??0)+1;
    if(result>0)stats.winsAfterEdit=(stats.winsAfterEdit??0)+1;
    saveWildProgress();
   }
   openMenu();const line=byId('knockout-notice');
   line.textContent='Practice '+(result>0?'won':result===0?'draw':'lost')+'. Your team can retry the gym for its badge.';line.hidden=false;
   return true;
  }
  if(selectedTrainer?.journeyLesson){
   if(swappedTo){(guideState().route??={}).switched=true;saveWildProgress();}
   openMenu();const line=byId('knockout-notice');
   line.textContent=swappedTo?'Switch lesson complete. You sent in '+swappedTo+'.':'Switch lesson finished. Try switching to a healthy reserve while your lead is fighting.';
   line.hidden=false;return true;
  }
  if(selectedGym && result<0 && snapshot){
   const foe=enemies.find(a=>a.hp>0 && a===activeEnemy)??enemies.find(a=>a.hp>0);
   const tip=hit?hit.name+' took '+hit.damage+' damage from '+hit.move+' on entry. Try a different lead or bring hazard removal.':
    foe?foe.name+' had '+Math.ceil(100*foe.hp/foe.max)+'% HP '+(timed?'when time ran out':'when your team fell')+'. Try changing your lead, held item or first Gambit before practicing.':'Try a different lead for this matchup.';
   keepLoss({...snapshot,tip,lead:startingLead});
  }else if(selectedGym && result>0 && lastLoss?.gym?.id===selectedGym.id && lastLoss.master===selectedMasterGym)keepLoss(null);
  return false;
 }
 function raidHUD(data,side,send){
  const hud=byId('raid-boss-hud'),v=data.arenaMap?.flameVents;let row=byId('raid-vent-calls');
  if(!v){if(row)row.hidden=true;return;}
  if(!row){row=node('section',null,'raid-vent-calls');row.id='raid-vent-calls';row.append(node('strong'),node('span'));hud.append(row);}
  row.hidden=false;const open=Boolean(v.until>data.clock);
  row.children[0].textContent=open?'Flame vents · '+Math.ceil(v.until-data.clock)+'s':v.exposed>data.clock?'Both vents sealed · Charizard takes 35% more damage':v.outcome===1?'One vent sealed · weakened blast':v.outcome===0?'Flame blast landed':'Flame vents charging';
  const calls=Object.entries(v.calls).map(([owner,target])=>(owner===side?'You':data.actors.find(a=>a.side===owner && !a.raidSubstitute)?.raidTrainer??data.actors.find(a=>a.side===owner && !a.raidSubstitute)?.name??'Teammate')+' → '+target);
  row.children[1].textContent=open?'Left '+Math.round(v.left*100)+'% · Right '+Math.round(v.right*100)+'%'+(calls.length?' · '+calls.join(' · '):' · Choose a target'):'Seal both vents to expose Charizard. Substitutes follow the latest call.';
  if(!row.children[2]){
   const controls=node('div',null,'journey-actions');
   for(const target of ['left','right','boss']){const b=button(target==='boss'?'Attack boss':target==='left'?'Left vent':'Right vent',()=>{});b.dataset.focus=target;controls.append(b);}
   row.append(controls);
  }
  row.children[2].hidden=!open;
  const alive=data.actors.some(a=>a.side===side && !a.raidSubstitute && a.hp>0);
  const assigned=v.calls[side]??'boss',focus=v[assigned]>=1?'boss':assigned;
  for(const b of row.children[2].children){
   const target=b.dataset.focus;b.onclick=()=>send({raidFocus:{cycle:v.cycle,target}});
   b.disabled=!alive || v[target]>=1;b.setAttribute('aria-pressed',String(focus===target));
  }
 }
 function paintVents(ctx,w,h,v){
  ctx.save();
  for(const [target,x] of [['left',w*.23],['right',w*.77]]){
   const y=h*.73,r=15;ctx.fillStyle='#30251f';ctx.strokeStyle=v[target]>=1?'#9fe3c9':'#ffab56';ctx.lineWidth=3;
   ctx.beginPath();ctx.ellipse(x,y,r*1.45,r*.65,0,0,Math.PI*2);ctx.fill();ctx.stroke();
   if(v[target]<1){ctx.fillStyle='#ff853a';ctx.beginPath();ctx.moveTo(x-9,y-2);ctx.lineTo(x-1,y-24);ctx.lineTo(x+1,y-12);ctx.lineTo(x+7,y-17);ctx.lineTo(x+9,y-2);ctx.fill();}
  }
  ctx.restore();
 }
 window.ArenaJourney={home,goalControl,enterBattle,prepared,started:name=>{startingLead=name;},finish,isPractice:()=>replay || Boolean(selectedTrainer?.journeyLesson),swapped:name=>{swappedTo=name;},
  hazardHit:(name,move,damage)=>{hit={name,move,damage};},raidHUD,paintVents,campaign:target=>{
   target.append(button('Champion Gauntlet',()=>window.ArenaLeague.open()));
  }};
 if(phase==='home')home();
})();
