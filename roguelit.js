(() => {
 const regions=[
  {name:'Kanto',site:'Viridian Forest',types:['Grass','Bug'],boss:'Venusaur',guards:[],moves:['Razor Leaf','Sludge Bomb','Sleep Powder','Giga Drain']},
  {name:'Johto',site:'Burned Tower',types:['Fire','Ghost'],boss:'Typhlosion',guards:['Misdreavus'],moves:['Flame Wheel','Swift','Flamethrower','Will-O-Wisp']},
  {name:'Hoenn',site:'Sky Pillar',types:['Dragon','Flying'],boss:'Rayquaza',guards:['Altaria','Claydol'],moves:['Dragon Claw','Air Slash','Extreme Speed','Dragon Dance']}
 ];
 const sites=[
  [regions[0],
   {name:'Kanto',site:'Mt. Moon',types:['Rock','Fairy'],boss:'Clefable',guards:[],moves:['Moonblast','Swift','Draining Kiss','Cosmic Power']},
   {name:'Kanto',site:'Seafoam Islands',types:['Ice','Water'],boss:'Lapras',guards:[],moves:['Water Pulse','Ice Beam','Ice Shard','Sing']}],
  [regions[1],
   {name:'Johto',site:'Olivine Lighthouse',types:['Electric','Steel'],boss:'Ampharos',guards:['Magnemite'],moves:['Discharge','Power Gem','Thunder Wave','Thunder Punch']},
   {name:'Johto',site:'Lake of Rage',types:['Water','Flying'],boss:'Gyarados',guards:['Quagsire'],moves:['Waterfall','Crunch','Ice Fang','Dragon Dance']}],
  [regions[2],
   {name:'Hoenn',site:'Cave of Origin',types:['Ground','Fire'],boss:'Groudon',guards:['Camerupt','Solrock'],moves:['Earthquake','Lava Plume','Ancient Power','Bulk Up']},
   {name:'Hoenn',site:'Seafloor Cavern',types:['Water','Dark'],boss:'Kyogre',guards:['Sharpedo','Lunatone'],moves:['Water Pulse','Ice Beam','Ancient Power','Calm Mind']}]
 ];
 // Finish a shuffled set of three sites in each region before starting the next set.
 function drawCourse(progress){
  const decks=progress.siteDecks ??= [];
  return sites.map((group,i)=>{
   const prior=decks[i];
   let left=Array.isArray(prior?.left)?prior.left.filter(n=>Number.isInteger(n) && group[n]):[];
   if(!left.length)left=group.map((_,n)=>n);
   const candidates=left.filter(n=>n!==prior?.last);
   const chosen=prior?sample(candidates.length?candidates:left,1)[0]:0;
   decks[i]={last:chosen,left:left.filter(n=>n!==chosen)};return chosen;
  });
 }
 const studies={
  relay:{name:'Relay team',detail:'Win with two different lead Pokémon.',goal:2},
  coverage:{name:'Type coverage',detail:'Win twice with a lead that knows damaging moves of at least two types.',goal:2},
  gear:{name:'Equipment trial',detail:'Win with a lead carrying a held item.',goal:1},
  elite:{name:'Elite research',detail:'Defeat an elite encounter.',goal:1}
 };
 function beginStudy(run){
  const last=run.study?.key,keys=Object.keys(studies).filter(key=>key!==last);
  run.study={key:sample(keys,1)[0],count:0,leads:[],leg:segment(run),relicFork:sample([0,1,2],1)[0]};
 }
 function recordStudyWin(run){
  const study=run.study;
  if(!study || study.leg!==segment(run) || study.count>=studies[study.key].goal)return;
  const lead=run.members[0];
  if(study.key==='relay'){
   if(!study.leads.includes(lead.name))study.leads.push(lead.name);
   study.count=study.leads.length;return;
  }
  if(study.key==='gear' && lead.heldItem || study.key==='elite' && run.node.kind==='elite' ||
   study.key==='coverage' && new Set(lead.moves.filter(move=>moveCatalog[move]?.[1]>0).map(move=>moveCatalog[move][0])).size>=2)study.count++;
 }
 const legLength=4,expeditionLength=regions.length*legLength;
 const trails={
  recruit:{label:'Recruit trail',detail:'Choose a regional Pokémon to join your team.'},
  gear:{label:'Supply trail',detail:'Choose a held item and who carries it.'},
  tutor:{label:'Move tutor',detail:'Teach a teammate a move from its Arena learnset.'},
  training:{label:'Training trail',detail:'Choose a stat bonus for your team.'},
  relic:{label:'Relic hunt',detail:'Face a stronger opponent and choose one team relic for this expedition.'},
  elite:{label:'Elite encounter',detail:'Earn double shards and choose gear or training.'},
  boss:{label:'Regional boss',detail:'Knock out the boss team to earn triple shards and choose a recruit, gear or training.'}
 };
 const items=['Leftovers','Muscle Band','Wise Glasses','Shell Bell','Assault Vest','Quick Claw','Wide Lens','Sitrus Berry'];
 const bossLoot={
  Kanto:{repeat:[['vitamins','EXP Candy 100',1],['balls','Great Ball',2]],first:['vitamins','EXP Candy 250',1]},
  Johto:{repeat:[['vitamins','EXP Candy 250',1],['balls','Ultra Ball',1]],first:['vitamins','IV Booster',1]},
  Hoenn:{repeat:[['vitamins','EXP Candy 500',1],['vitamins','Rare Candy',1],['balls','Ultra Ball',2]],first:['capsules','Ability Capsule',1]}
 };
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
 const siteFor=(run,i)=>sites[i][run.course?.[i]] ?? regions[i];
 const regionFor=run=>siteFor(run,segment(run)%regions.length);
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
  for(const i of regions.keys()){
   const region=siteFor(run,i);
   const done=i<current || run.step==='clear';
   const lap=Math.floor((run.round-1)/expeditionLength);
   const li=element('li');
   li.append(element('strong',(done?'✓ ':'')+region.site),element('small',region.name+' · '+region.boss+' · Battle '+(lap*expeditionLength+(i+1)*legLength)));
   if(done)li.className='complete';
   else if(i===current)li.setAttribute('aria-current','step');
   path.append(li);
  }
  map.append(path);
  if(run.study){
   const study=studies[run.study.key],box=element('div',null,'mode-objective');
   box.append(element('strong',study.name+' · '+run.study.count+'/'+study.goal),
    element('small',study.detail+' Regional boss bonus · '+sideSupplyText(sideSupplyTracks[run.focus].bundles[current])));
   map.append(box);
  }
  if(run.relic){
   const relic=expeditionRelics[run.relic];
   party.append(element('p',relic.name+' · '+relic.detail,'rogue-team-bonuses'));
  }
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
 function pendingDelivery(){
  screen('Your reward is saved and waiting for your bag to sync.',[
   {label:'Retry delivery',action:()=>lobby()},{label:'Main menu',action:openMenu}
  ],null);
 }
 function update(expected,mutate,after=showRun){
  const origin=phase;
  return locked(()=>{
   const progress=readRogueProgress(),current=progress.expedition;
   if(!settleModeReward(progress)){pendingDelivery();return false;}
   if(current?.id!==expected?.id || current?.revision!==expected?.revision){
    lobby('The saved expedition changed. Open the latest checkpoint.');return false;
   }
   if(mutate(progress)===false){lobby();return false;}
   if(progress.expedition)progress.expedition.revision=(current?.revision ?? 0)+1;
   if(!storeRogueProgress(progress)){
    screen('Could not save this checkpoint.',[{label:'Retry save',action:()=>update(expected,mutate,after)},{label:'Back to Roguelit',action:()=>lobby()}],expected);
    return false;
   }
   if(!settleModeReward(progress)){pendingDelivery();return false;}
   if(phase==='home' && origin!=='home')return true;
   rogueRun=progress.expedition ?? null;after();return true;
  });
 }
 function edit(change,after=showRun){
  const expected=rogueRun;
  return update(expected,progress=>change(progress.expedition,progress),after);
 }
 function lobby(message=''){
  rogueRun=null;rogueProgress=readRogueProgress();const saved=rogueProgress.expedition;
  if(rogueProgress.delivery && !writing)return locked(()=>{
   const current=readRogueProgress();
   if(settleModeReward(current))lobby(message);else pendingDelivery();
  });
  const choices=saved?[{label:'Resume expedition',detail:regionFor(saved).site+' · Battle '+saved.round+' · '+saved.cleared+' wins'+(saved.step==='battle'?' · Restart this encounter.':''),
   action:()=>{rogueRun=saved;showRun();}}]:
   [{label:'Start expedition',detail:'Draft a starter and up to four moves for twelve fights. Finish a field study and defeat its regional boss to earn your selected supplies.',action:start}];
  choices.push({label:'Permanent upgrades',detail:'Spend shards on future expeditions.',action:upgrades});
  choices.push({label:'Boss rewards',detail:'View main-game loot and your first-clear bonuses.',action:()=>{
   screen('Every victory deposits coins in your main-game wallet. Payouts use your highest PC level and unlocked Arena speed when you start. The Lucky Coin doubles them. Boss items go to your bag.',[
    ...regions.map((r,i)=>({label:r.name,portrait:r.boss,detail:sites[i].map(s=>s.boss).join(' / ')+' · '+sideSupplyText(bossLoot[r.name].repeat)+'\nFirst clear · '+sideSupplyText([bossLoot[r.name].first])+(rogueProgress.firstClears.includes(r.name)?' · Obtained':'')})),
    {label:'Back to Roguelit',action:()=>lobby()}
   ],null);
  }});
  if(saved)choices.push({label:'Retire this expedition',detail:'Keep banked shards and finish the run.',action:()=>{
   screen('Retire after '+saved.cleared+' wins? Your banked shards stay with your trainer.',[
    {label:'Keep expedition',action:()=>lobby()},{label:'Retire expedition',action:()=>update(saved,p=>{delete p.expedition;},()=>lobby('Expedition retired.'))}
   ],saved);
  }});
  screen((message?message+' ':'')+rogueProgress.shards+' shards · Best run: '+rogueProgress.best+' wins',choices,null);
  if(!saved?.focus)byId('rogue-route-map').append(sideSupplyPicker('roguelit',['Kanto','Johto','Hoenn']));
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
    round:1,cleared:0,focus:sideSupplyFocus('roguelit'),course:drawCourse(p),step:'starter',region:regions[0].name,members:[],options:sample(basePool(),5+(p.ranks.scout ?? 0)),enemyRoster:[],autoReserve:true,
    perks:{...p.ranks},coinRate:arenaAccountCoinRate(),travelSpeed:maximumBattleSpeed(),speed:1,coinsEarned:0,
    power:1,enemyPower:1,health:1+(p.ranks.health ?? 0)*.05,offense:1+(p.ranks.offense ?? 0)*.04,startLevel:10+(p.ranks.level ?? 0)};
   beginStudy(p.expedition);
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
  const level=Math.min(100,run.round===1?(kind==='relic'?7:6):7+run.round*2+(elite?2:kind==='relic'?1:boss?1+leg:0));
  let pool=eligibleWildPokemon(region.name,level).filter(name=>!isLegendaryEncounter(name));
  if(run.focus && run.round===1 && kind!=='relic'){
   const starters=pool.filter(name=>dexStats[dex[name][0]-1].reduce((sum,stat)=>sum+stat,0)<=400);
   if(starters.length)pool=starters;
  }
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
  if(run.focus){
   if(run.study?.leg!==segment(run))beginStudy(run);
   if(offset===run.study.relicFork)kinds.push('relic');
  }
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
   const bonus=run.node.kind==='relic'?.08:run.node.kind==='elite'?.05:run.node.kind==='boss'?.05*(segment(run)%regions.length):0;
   const laps=Math.floor((run.round-1)/expeditionLength),pastLevelCap=Math.max(0,run.round-46)/30;
   // Ease the opening while players have only a drafted starter. Boss and endless scaling start at full strength.
   const opening=run.focus && run.round===1?.78:run.focus && run.round===2?.93:1;
   run.enemyPower=opening*(1+bonus)*(1+.08*laps+pastLevelCap*(1+.15*pastLevelCap));
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
  if(kind==='relic')prizes.relics=sample(Object.keys(expeditionRelics).filter(key=>key!==run.relic),2+(run.perks.curator ?? 0));
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
   recordStudyWin(run);
   if(run.node.kind==='boss'){
    const loot=bossLoot[run.region];payout.items=[...loot.repeat];
    if(run.study && run.study.count>=studies[run.study.key].goal){
     payout.items.push(...sideSupplyTracks[run.focus].bundles[segment(run)%regions.length]);payout.study=studies[run.study.key].name;
    }
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
 function nextBattle(run,progress){
  run.round++;
  if(!run.focus && (run.round-1)%legLength===0){
   // Adopt field studies at the next regional boundary on older saves. Honor the original boss itinerary for this lap.
   run.focus=sideSupplyFocus('roguelit');run.course=regions.map(()=>0);
   progress.siteDecks ??= sites.map(()=>({last:0,left:[1,2]}));
  }
  if((run.round-1)%expeditionLength===0 && run.focus)run.course=drawCourse(progress);
  prepareRoutes(run);
 }
 function takeReward(effect){
  return edit((run,p)=>{
   if(run.step!=='reward')return false;
   effect(run);
   if(run.round===expeditionLength){run.step='clear';delete run.rewards;return;}
   nextBattle(run,p);
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
  if(run.rewards.relics)for(const key of run.rewards.relics){
   const relic=expeditionRelics[key];choices.push({label:relic.name,detail:relic.detail+(run.relic?' Replaces '+expeditionRelics[run.relic].name+'.':''),
    action:()=>takeReward(r=>{r.relic=key;})});
  }
  if(recruits?.length)choices.push({label:'Recruit a teammate',portrait:recruits[0].name,detail:recruits.map(mon=>mon.name).join(' · '),action:showRecruits});
  if(items?.length)choices.push({label:'Choose held gear',item:items[0],detail:items.join(' · '),action:showGear});
  if(tutors?.some(moves=>moves.length))choices.push({label:'Visit the move tutor',detail:'Choose a teammate, a new move and the slot to replace.',action:showTutor});
  if(!choices.length || run.node.kind==='boss' || run.node.kind==='elite')choices.push(...trainingChoices());
  else choices.push({label:'Train the team instead',detail:'Choose endurance, power or balanced training.',action:showTraining});
  const payout=run.lastPayout;
  screen(run.node.label+' cleared · +'+run.node.shards+' shards. Sent to your main game: '+payout.coins.toLocaleString()+' coins'+(payout.items.length?' · '+sideSupplyText(payout.items):'')+(payout.first?' (first-clear bonus included)':'')+(payout.study?' · Field study completed: '+payout.study:'')+'. Your team heals and gains up to 2 levels. Choose one expedition reward.',choices);
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
     {label:'Continue into endless',detail:'Keep your team, held items and training. Explore a new regional itinerary with stronger opponents.',
      action:()=>edit((r,p)=>nextBattle(r,p))}
    ]);break;
  }
 }
 window.ArenaRoguelit={finish};
 byId('home-roguelit').onclick=()=>lobby();byId('rogue-back').onclick=openMenu;
 if(rogueProgress.delivery)locked(()=>settleModeReward(readRogueProgress()));
})();
