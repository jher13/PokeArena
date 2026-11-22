(() => {
 const regions=[
  {name:'Kanto',site:'Viridian Forest',types:['Grass','Bug'],boss:'Venusaur',guards:[],moves:['Razor Leaf','Sludge Bomb','Sleep Powder','Giga Drain']},
  {name:'Johto',site:'Burned Tower',types:['Fire','Ghost'],boss:'Typhlosion',guards:['Misdreavus'],moves:['Flame Wheel','Swift','Flamethrower','Will-O-Wisp']},
  {name:'Hoenn',site:'Sky Pillar',types:['Dragon','Flying'],boss:'Rayquaza',guards:['Altaria','Claydol'],moves:['Dragon Claw','Air Slash','Extreme Speed','Dragon Dance']}
 ];
 const legLength=4,expeditionLength=regions.length*legLength;
 const trails={
  recruit:{label:'Recruit trail',detail:'Choose a regional Pokémon to join your team.'},
  gear:{label:'Supply trail',detail:'Choose a held item and who carries it.'},
  tutor:{label:'Move tutor',detail:'Teach a teammate a move from its Arena learnset.'},
  training:{label:'Training trail',detail:'Choose a stat bonus for your team.'},
  elite:{label:'Elite encounter',detail:'Earn double shards and choose gear or training.'},
  boss:{label:'Regional boss',detail:'Knock out the boss team to earn triple shards and choose a recruit, gear or training.'}
 };
 const items=['Leftovers','Muscle Band','Wise Glasses','Shell Bell','Assault Vest','Quick Claw','Wide Lens','Sitrus Berry'];
 const bossLoot={
  Kanto:{repeat:[['vitamins','EXP Candy 100',1],['balls','Great Ball',2]],first:['vitamins','EXP Candy 250',1]},
  Johto:{repeat:[['vitamins','EXP Candy 250',1],['balls','Ultra Ball',1]],first:['vitamins','IV Booster',1]},
  Hoenn:{repeat:[['vitamins','EXP Candy 500',1],['vitamins','Rare Candy',1],['balls','Ultra Ball',2]],first:['capsules','Ability Capsule',1]}
 };
 const lootText=loot=>loot.map(([,name,n])=>n+' × '+experienceCandyName(name)).join(' · ');
 function bounty(run,kind){
  const leg=segment(run)%regions.length;
  // Fixed encounter credit rewards clearing the route quickly and never counts idle time.
  const seconds=6+(20+6*leg+(kind==='boss'?32:kind==='elite'?12:0))/run.travelSpeed;
  return earnedCoins(Math.round(run.coinRate*seconds/60*(1+.05*(run.perks.bounty ?? 0))));
 }
 const training=[
  {key:'offense',bonus:.10,label:'Power training',detail:'+10% Attack and Sp. Atk for the team.'},
  {key:'health',bonus:.15,label:'Endurance training',detail:'+15% max HP for the team.'},
  {key:'power',bonus:.06,label:'Balanced training',detail:'+6% to all six stats for the team.'}
 ];
 const choiceBox=byId('rogue-choices');
 let writing=false;
 const segment=run=>Math.floor((run.round-1)/legLength);
 const regionFor=run=>regions[segment(run)%regions.length];
 const typesOf=name=>dex[name].slice(1,3).filter(Boolean);
 const basePool=()=>dexNames.filter(name=>!isLegendaryEncounter(name) && minimumEncounterLevel(dex[name][0])<=1);
 const sample=(list,count)=>drawRogueChoices(list,count);
 const levelAfter=(level,bonus)=>Math.min(100,level+bonus);
 const teamDescription=member=>member.name+' · Lv. '+member.level+(member.heldItem?' · '+member.heldItem:'');
 const member=(name,level,moves)=>({name,level,moves,profile:rollProfile()});
 const movePool=mon=>legalMoves(mon.name).filter(move=>isVisibleArenaMove(move) && !mon.moves.includes(move));
 function moveDetail(name){
  const [type,power,accuracy,,status]=moveCatalog[name];
  return type+' · '+(status?'Status':power+' power')+' · '+(accuracy?accuracy+'% accuracy':'Always hits')+' · '+moveRules(name).cooldown+'s cooldown';
 }
 function expeditionHud(run){
  const map=byId('rogue-route-map'),party=byId('rogue-party');map.replaceChildren();party.replaceChildren();
  if(!run)return;
  const path=element('ol',null,'rogue-itinerary');path.setAttribute('aria-label','Expedition route');
  const current=segment(run)%regions.length;
  for(const [i,region] of regions.entries()){
   const done=i<current || run.step==='clear';
   const lap=Math.floor((run.round-1)/expeditionLength);
   const li=element('li');
   li.append(element('strong',(done?'✓ ':'')+region.site),element('small',region.name+' · '+region.boss+' · Battle '+(lap*expeditionLength+(i+1)*legLength)));
   if(done)li.className='complete';
   else if(i===current)li.setAttribute('aria-current','step');
   path.append(li);
  }
  map.append(path);
  if(!run.members.length)return;
  const row=element('div',null,'rogue-party');
  for(const [i,mon] of run.members.entries()){
   const canPick=run.step==='route' && run.members.length>1;
   const chip=element(canPick?'button':'span',null,'rogue-member');chip.append(pokemonPortrait(mon.name),element('span',(i===0?'Lead · ':'')+teamDescription(mon)));
   if(canPick){
    chip.type='button';chip.setAttribute('aria-pressed',String(i===0));chip.setAttribute('aria-label','Lead with '+mon.name);
    chip.onclick=()=>{if(i)edit(r=>{const [lead]=r.members.splice(i,1);r.members.unshift(lead);});};
   }
   chip.title=mon.moves.join(' · ');row.append(chip);
  }
  party.append(element('h3','Expedition team','rogue-squad-label'),row);
  if(run.health!==1 || run.offense!==1 || run.power!==1){
   const bonus=value=>'+'+Math.round(100*(value-1))+'%';
   party.append(element('p','Team bonuses · HP '+bonus(run.power*run.health)+' · Attack / Sp. Atk '+bonus(run.power*run.offense)+' · Other stats '+bonus(run.power),'rogue-team-bonuses'));
  }
  if(run.step==='route'){
   const label=element('label',null,'wild-toggles'),check=element('input');check.type='checkbox';check.checked=run.autoReserve;
   check.onchange=()=>{const enabled=check.checked;edit(r=>{r.autoReserve=enabled;});};
   label.append(check,document.createTextNode(' Auto send-out after knockouts'));party.append(label);
   const pace=element('label',null,'wild-toggles'),select=element('select');
   for(let n=1;n<=maximumBattleSpeed();n++){const option=element('option',n+'×');option.value=n;select.append(option);}
   select.value=run.speed;select.onchange=()=>{const value=Number(select.value);edit(r=>{r.speed=value;});};
   pace.append(document.createTextNode('Battle speed '),select);party.append(pace);
  }
 }
 function screen(text,choices,active=rogueRun){
  phase='roguelit';showScreen('roguelit');expeditionHud(active);
  byId('rogue-status').textContent=text;
  choiceBox.replaceChildren(...choices.map(({label,detail,portrait,move,item,type,action,disabled})=>{
   const card=element(action?'button':'section',null,'gym-card');
   if(action){card.type='button';card.disabled=Boolean(disabled);}
   if(type){card.classList.add('rogue-route');card.style.setProperty('--route-color',moveColors[type]);}
   if(portrait)card.append(pokemonPortrait(portrait));else if(item)card.append(bagItemIcon(item));
   card.append(move?skillTitle('strong',move):element('strong',label));
   if(detail)card.append(element('small',detail));
   if(action)card.onclick=()=>{
    if(card.disabled)return;
    for(const option of choiceBox.children)option.disabled=true;
    action();
   };
   return card;
  }));
 }
 function locked(work){
  if(writing)return;
  writing=true;
  const apply=()=>{try{return work();}finally{writing=false;}};
  const locks=globalThis.navigator?.locks;
  if(!locks)return apply();
  return locks.request(playerSaveKey(rogueProgressKey),apply).catch(error=>{
   if(writing && error.name==='SecurityError')return apply();
   writing=false;throw error;
  });
 }
 // A saved delivery survives a reload between the expedition checkpoint and the main inventory write.
 // The receipt and all wallet, item and Battle Pass changes share the same inventory write.
 function settleDelivery(progress){
  const bundle=progress.delivery;
  if(!bundle)return true;
  if(window.isArenaMarketBusy?.())return false;
  let source;
  try{source=JSON.parse(playerStorage.getItem(progressKey)) ?? wildProgress;}catch{return false;}
  if(source.rogueDeliveryId!==bundle.id){
   const next={...wildProgress,...source,coins:(source.coins ?? wildProgress.coins)+bundle.coins,
    capsules:source.capsules ?? wildProgress.capsules,vitamins:{...(source.vitamins ?? wildProgress.vitamins)},
    balls:[...(source.balls ?? wildProgress.balls)],battlePass:structuredClone(source.battlePass ?? wildProgress.battlePass),rogueDeliveryId:bundle.id};
   for(const [kind,name,count] of bundle.items)giveArenaItem(kind,name,count,next);
   const note=recordBattlePass({battles:1,wins:bundle.won?1:0},null,next);
   if(!saveWildProgress(next))return false;
   Object.assign(wildProgress,next);
   if(note && ['win','loss','draw','roguelit'].includes(phase))showPassBattleNotice(note+' · '+battlePassProgressText());
  }else if(wildProgress.rogueDeliveryId!==bundle.id)Object.assign(wildProgress,source);
  delete progress.delivery;
  if(!storeRogueProgress(progress))progress.delivery=bundle;
  return true;
 }
 function pendingDelivery(){
  screen('Your expedition result is saved. The main-game reward is waiting for your bag to sync.',[
   {label:'Retry delivery',action:()=>lobby()},{label:'Main menu',action:openMenu}
  ],null);
 }
 function update(expected,mutate,after=showRun){
  const origin=phase;
  return locked(()=>{
   const progress=readRogueProgress(),current=progress.expedition;
   if(!settleDelivery(progress)){pendingDelivery();return false;}
   if(current?.id!==expected?.id || current?.revision!==expected?.revision){
    lobby('The saved expedition changed. Open the latest checkpoint.');return false;
   }
   if(mutate(progress)===false){lobby();return false;}
   if(progress.expedition)progress.expedition.revision=(current?.revision ?? 0)+1;
   if(!storeRogueProgress(progress)){
    screen('Could not save this checkpoint.',[{label:'Retry save',action:()=>update(expected,mutate,after)},{label:'Back to Roguelit',action:()=>lobby()}],expected);
    return false;
   }
   if(!settleDelivery(progress)){pendingDelivery();return false;}
   if(phase==='home' && origin!=='home')return true;
   rogueRun=progress.expedition ?? null;after();return true;
  });
 }
 function edit(change,after=showRun){
  const expected=rogueRun;
  return update(expected,progress=>change(progress.expedition),after);
 }
 function lobby(message=''){
  rogueRun=null;rogueProgress=readRogueProgress();const saved=rogueProgress.expedition;
  if(rogueProgress.delivery && !writing)return locked(()=>{
   const current=readRogueProgress();
   if(settleDelivery(current))lobby(message);else pendingDelivery();
  });
  const choices=saved?[{label:'Resume expedition',detail:regionFor(saved).site+' · Battle '+saved.round+' · '+saved.cleared+' wins'+(saved.step==='battle'?' · Restart this encounter.':''),
   action:()=>{rogueRun=saved;showRun();}}]:
   [{label:'Start expedition',detail:'Draft a starter and up to four moves. Three regions, twelve fights.',action:start}];
  choices.push({label:'Permanent upgrades',detail:'Spend shards on future expeditions.',action:upgrades});
  choices.push({label:'Boss rewards',detail:'View main-game loot and your first-clear bonuses.',action:()=>{
   screen('Every victory deposits coins in your main-game wallet. Payouts use your highest PC level and unlocked Arena speed when you start. The Lucky Coin doubles them. Boss items go to your bag.',[
    ...regions.map(r=>({label:r.boss,portrait:r.boss,detail:r.site+' · '+lootText(bossLoot[r.name].repeat)+'\nFirst clear · '+lootText([bossLoot[r.name].first])+(rogueProgress.firstClears.includes(r.name)?' · Obtained':'')})),
    {label:'Back to Roguelit',action:()=>lobby()}
   ],null);
  }});
  if(saved)choices.push({label:'Retire this expedition',detail:'Keep banked shards and finish the run.',action:()=>{
   screen('Retire after '+saved.cleared+' wins? Your banked shards stay with your trainer.',[
    {label:'Keep expedition',action:()=>lobby()},{label:'Retire expedition',action:()=>update(saved,p=>{delete p.expedition;},()=>lobby('Expedition retired.'))}
   ],saved);
  }});
  screen((message?message+' ':'')+rogueProgress.shards+' shards · Best run: '+rogueProgress.best+' wins',choices,null);
 }
 function upgrades(){
  const progress=readRogueProgress();
  screen(progress.shards+' shards · Permanent upgrades apply when you start an expedition.',[
   ...rogueUpgrades.map(({key,label,detail,cost,cap})=>{
    const rank=progress.ranks[key] ?? 0,price=cost*(rank+1);
    return {label:label+' · '+rank+'/'+cap,detail:detail+' · '+(rank===cap?'Max rank':price+' shards'),disabled:rank===cap || price>progress.shards,
     action:()=>update(progress.expedition,p=>{
      if((p.ranks[key] ?? 0)!==rank || p.shards<price)return false;
      p.shards-=price;p.ranks[key]=rank+1;
     },()=>{rogueRun=null;upgrades();})};
   }),{label:'Back to Roguelit',action:()=>lobby()}
  ],null);
 }
 function start(){
  return update(null,p=>{
   p.expedition={version:1,id:globalThis.crypto?.randomUUID?.() ?? Date.now()+'-'+Math.random(),revision:0,
    round:1,cleared:0,step:'starter',region:regions[0].name,members:[],options:sample(basePool(),5+(p.ranks.scout ?? 0)),enemyRoster:[],autoReserve:true,
    perks:{...p.ranks},coinRate:arenaAccountCoinRate(),travelSpeed:maximumBattleSpeed(),speed:1,coinsEarned:0,
    power:1,enemyPower:1,health:1+(p.ranks.health ?? 0)*.05,offense:1+(p.ranks.offense ?? 0)*.04,startLevel:10+(p.ranks.level ?? 0)};
  });
 }
 function draftMoves(run){
  const mon=run.members[0],legal=movePool(mon),attacks=legal.filter(name=>moveCatalog[name][1]>0);
  if(mon.moves.length>=4 || !legal.length){
   if(!mon.moves.length)mon.moves.push('Struggle');
   prepareRoutes(run);return;
  }
  run.step='moves';run.options=sample(!mon.moves.length && attacks.length?attacks:legal,4+(run.perks.study ?? 0));
 }
 function route(run,kind,type){
  const region=regionFor(run),boss=kind==='boss',elite=kind==='elite';
  const leg=segment(run)%regions.length;
  const level=Math.min(100,run.round===1?6:7+run.round*2+(elite?2:boss?1+leg:0));
  const pool=eligibleWildPokemon(region.name,level).filter(name=>!isLegendaryEncounter(name));
  const themed=pool.filter(name=>typesOf(name).includes(type));
  const size=Math.min(3,1+Math.floor((run.round-1)/6)+(elite?1:0));
  const names=boss?[...region.guards,region.boss]:sample(themed,size);
  if(!boss && names.length<size)names.push(...sample(pool.filter(name=>!names.includes(name)),size-names.length));
  const foes=names.map(name=>member(name,level,boss && name===region.boss?legalLoadout(name,region.moves):wildMoves(name)));
  return {kind,label:boss?region.boss:trails[kind].label,type,foes,shards:(2+run.round)*(boss?3:elite?2:1)};
 }
 function prepareRoutes(run){
  const region=regionFor(run),offset=(run.round-1)%legLength;
  run.step='route';run.region=region.name;run.enemyRoster=[];
  delete run.node;delete run.rewards;delete run.options;
  const kinds=[['recruit','training'],['gear','elite'],['tutor','recruit'],['boss']][offset];
  run.routes=kinds.map((kind,i)=>route(run,kind,region.types[i%region.types.length]));
 }
 function enterCombat(){
  if(window.isArenaMarketBusy?.()){
   screen('A transaction is syncing.',[{label:'Start encounter',action:enterCombat}]);return;
  }
  const run=rogueRun;openBattle(null,null,null,run);startBattle();
 }
 function chooseRoute(index){
  return edit(run=>{
   run.node=run.routes[index];delete run.routes;
   run.enemyRoster=run.node.foes;run.step='battle';
   const bonus=run.node.kind==='elite'?.05:run.node.kind==='boss'?.05*(segment(run)%regions.length):0;
   const laps=Math.floor((run.round-1)/expeditionLength),pastLevelCap=Math.max(0,run.round-46)/30;
   run.enemyPower=(1+bonus)*(1+.08*laps+pastLevelCap*(1+.15*pastLevelCap));
  },enterCombat);
 }
 function prepareRewards(run){
  const kind=run.node.kind,prizes={};run.rewards=prizes;
  const recruit=kind==='recruit' || kind==='boss',gear=kind==='gear' || kind==='elite' || kind==='boss';
  if(recruit){
   const candidates=eligibleWildPokemon(run.region,run.members[0].level).filter(name=>!isLegendaryEncounter(name) && !run.members.some(mon=>mon.name===name));
   const themed=candidates.filter(name=>typesOf(name).includes(run.node.type));
   const picks=sample(themed,2);
   picks.push(...sample(candidates.filter(name=>!picks.includes(name)),3+(run.perks.scout ?? 0)-picks.length));
   prizes.recruits=picks.map(name=>member(name,run.members[0].level,legalLoadout(name,wildMoves(name))));
  }
  if(gear)prizes.items=sample(items,3+(run.perks.supply ?? 0));
  if(kind==='tutor')prizes.tutors=run.members.map(mon=>sample(movePool(mon),3+(run.perks.study ?? 0)));
 }
 function finish(won){
  const expected=rogueRun;
  if(!expected || expected.step!=='battle')return;
  return update(expected,p=>{
   const run=p.expedition;
   const payout={id:run.id+'/'+run.round,won,coins:won?bounty(run,run.node.kind):0,items:[]};
   p.delivery=payout;
   if(!won){delete p.expedition;return;}
   if(run.node.kind==='boss'){
    const loot=bossLoot[run.region];payout.items=[...loot.repeat];
    if(!p.firstClears.includes(run.region)){payout.items.push(loot.first);p.firstClears.push(run.region);payout.first=true;}
   }
   run.lastPayout=payout;run.coinsEarned+=payout.coins;run.speed=expected.speed;
   run.cleared++;p.best=Math.max(p.best,run.cleared);p.shards+=run.node.shards;
   run.members.forEach(mon=>{mon.level=levelAfter(mon.level,2);});
   run.step='reward';prepareRewards(run);
  },()=>{
   if(won)showRun();else screen('Expedition ended at '+regionFor(expected).site+' · '+expected.cleared+' wins · '+expected.coinsEarned.toLocaleString()+' main-game coins earned this run · '+rogueProgress.shards+' banked shards.',[
    {label:'Back to Roguelit',action:()=>lobby()},{label:'New expedition',action:start}
   ],null);
   void checkGameVersion();
  });
 }
 function takeReward(effect){
  return edit(run=>{
   if(run.step!=='reward')return false;
   effect(run);
   if(run.round===expeditionLength){run.step='clear';delete run.rewards;return;}
   run.round++;prepareRoutes(run);
  });
 }
 function trainingChoices(){
  return training.map(({label,detail,key,bonus})=>({label,detail,action:()=>takeReward(run=>{run[key]+=bonus;})}));
 }
 function showTraining(){screen('Choose team training for the rest of this expedition.',[...trainingChoices(),{label:'Back to rewards',action:showRun}]);}
 function showRecruits(){
  const run=rogueRun;
  screen('Choose a recruit from '+run.region+'.',[
   ...run.rewards.recruits.map((mon,i)=>({label:mon.name,portrait:mon.name,detail:'Lv. '+mon.level+' · '+typesOf(mon.name).join(' / ')+'\n'+mon.moves.join(' · '),
    action:()=>{
     if(run.members.length<6){takeReward(r=>{r.members.push(r.rewards.recruits[i]);});return;}
     screen('Choose a teammate to replace with '+mon.name+'.',[
      ...run.members.map((old,index)=>({label:'Replace '+old.name,portrait:old.name,detail:teamDescription(old),
       action:()=>takeReward(r=>{r.members[index]=r.rewards.recruits[i];})})),
      {label:'Back to recruits',action:showRecruits}
     ]);
    }})),{label:'Back to rewards',action:showRun}
  ]);
 }
 function showGear(){
  screen('Choose an expedition held item.',[
   ...rogueRun.rewards.items.map(item=>({label:item,item,detail:heldItems[item].description,action:()=>{
    screen('Who should hold '+item+'?',[
     ...rogueRun.members.map((mon,i)=>({label:mon.name,portrait:mon.name,detail:mon.heldItem?'Replaces '+mon.heldItem:'Open held item slot',
      action:()=>takeReward(run=>{run.members[i].heldItem=item;})})),
     {label:'Back to items',action:showGear}
    ]);
   }})),{label:'Back to rewards',action:showRun}
  ]);
 }
 function showTutor(){
  const run=rogueRun;
  screen('Choose a teammate to learn a move.',[
   ...run.members.map((mon,i)=>({label:mon.name,portrait:mon.name,disabled:!run.rewards.tutors[i].length,detail:mon.moves.join(' · '),action:()=>{
    screen('Choose a new move for '+mon.name+'.',[
     ...run.rewards.tutors[i].map(name=>({move:name,detail:moveDetail(name),action:()=>{
      if(mon.moves.length<4){takeReward(r=>{r.members[i].moves.push(name);});return;}
      screen('Choose a move to replace with '+name+'.',[
       ...mon.moves.map((old,slot)=>({move:old,detail:'Replace '+old+' with '+name,action:()=>takeReward(r=>{r.members[i].moves[slot]=name;})})),
       {label:'Back to tutor',action:showTutor}
      ]);
     }})),{label:'Back to teammates',action:showTutor}
    ]);
   }})),{label:'Back to rewards',action:showRun}
  ]);
 }
 function rewards(run){
  const {recruits,items,tutors}=run.rewards;
  const choices=[];
  if(recruits?.length)choices.push({label:'Recruit a teammate',portrait:recruits[0].name,detail:recruits.map(mon=>mon.name).join(' · '),action:showRecruits});
  if(items?.length)choices.push({label:'Choose held gear',item:items[0],detail:items.join(' · '),action:showGear});
  if(tutors?.some(moves=>moves.length))choices.push({label:'Visit the move tutor',detail:'Choose a teammate, a new move and the slot to replace.',action:showTutor});
  if(!choices.length || run.node.kind==='boss' || run.node.kind==='elite')choices.push(...trainingChoices());
  else choices.push({label:'Train the team instead',detail:'Choose endurance, power or balanced training.',action:showTraining});
  const payout=run.lastPayout;
  screen(run.node.label+' cleared · +'+run.node.shards+' shards. Sent to your main game: '+payout.coins.toLocaleString()+' coins'+(payout.items.length?' · '+lootText(payout.items):'')+(payout.first?' (first-clear bonus included)':'')+'. Your team heals and gains up to 2 levels. Choose one expedition reward.',choices);
 }
 function showRun(){
  const run=rogueRun,region=regionFor(run);
  switch(run.step){
   case 'starter':
    screen('Choose a Pokémon to lead your expedition.',run.options.map(name=>({label:name,portrait:name,detail:typesOf(name).join(' / '),
     action:()=>edit(r=>{
      const starter=member(name,r.startLevel,[]);
      if(r.perks.kit)starter.heldItem=r.perks.kit===2?'Sitrus Berry':'Oran Berry';
      r.members.push(starter);draftMoves(r);
     })})));break;
   case 'moves':{
    const mon=run.members[0];
    screen(mon.name+' · Choose move '+(mon.moves.length+1)+' of 4'+(mon.moves.length?' · Equipped: '+mon.moves.join(', '):''),run.options.map(name=>({move:name,detail:moveDetail(name),
     action:()=>edit(r=>{r.members[0].moves.push(name);draftMoves(r);})})));break;
   }
   case 'route':
    screen((run.round>expeditionLength?'Endless · ':'')+region.site+' · Battle '+run.round+' · '+(run.routes.length===1?'Challenge the regional boss.':'Choose your route.'),run.routes.map((node,i)=>({
     label:node.label,portrait:node.foes.at(-1).name,type:node.type,detail:node.type+' arena · '+node.foes.map(mon=>mon.name+' Lv. '+mon.level).join(', ')+'\n'+bounty(run,node.kind).toLocaleString()+' main-game coins · '+node.shards+' shards · '+trails[node.kind].detail,
     action:()=>chooseRoute(i)})));break;
   case 'battle':enterCombat();break;
   case 'reward':rewards(run);break;
   case 'clear':
    screen('Expedition cleared · '+run.cleared+' wins · '+run.coinsEarned.toLocaleString()+' main-game coins earned this run · '+rogueProgress.shards+' banked shards.',[
     {label:'Finish expedition',detail:'Return to Roguelit with your banked shards.',action:()=>update(run,p=>{delete p.expedition;},()=>lobby('Expedition complete.'))},
     {label:'Continue into endless',detail:'Keep your team, held items and training. The regional route repeats with stronger opponents.',
      action:()=>edit(r=>{r.round++;prepareRoutes(r);})}
    ]);break;
  }
 }
 window.ArenaRoguelit={finish};
 byId('home-roguelit').onclick=()=>lobby();byId('rogue-back').onclick=openMenu;
 if(rogueProgress.delivery)locked(()=>settleDelivery(readRogueProgress()));
})();
