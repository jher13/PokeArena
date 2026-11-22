/* Weekly gauntlets, opt-in saved squads and the guild raid board. */
(()=>{
 'use strict';
 const src=new URL('.',document.currentScript.src);
 const icon=(file,alt)=>{const img=element('img');img.src=new URL('assets/'+file+'.png',src).href;img.alt=alt;img.className='journey-emblem';return img;};
 const signed=()=>Boolean(sessionStorage.getItem('arena-online-user'));
 const week=()=>{const d=new Date();d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);};
 const engine=()=>import(new URL('supabase/functions/arena-combat/engine.js?v='+updateLogEntries[0].version,src).href);
 const local=()=>((wildProgress.campaign??={}).journey??={});
 const localSeason=()=>{const j=local();if(j.season?.week!==week())j.season={week:week(),run:null,prize:null};return j.season;};
 const rpc=(action,args={})=>window.arenaMarketRead(action,args,'journey');
 const control=(title,fn)=>{const b=element('button',title);b.type='button';b.onclick=fn;return b;};
 let view=null;
 function frame(title){
  const dialog=byId('home-dialog'),root=element('section',null,'journey-sheet');
  byId('home-dialog-title').textContent=title;byId('home-dialog-content').replaceChildren(root);
  dialog.classList.add('collection-dialog');dialog.classList.remove('trade-hub-dialog');
  if(!dialog.open)dialog.showModal();
  view=root;return root;
 }
 function showError(host,e){if(host?.isConnected){const p=element('p',e.message??String(e));p.setAttribute('role','alert');host.append(p);}}
 function guarded(host,action){
  return async()=>{if(host.dataset.busy)return;host.dataset.busy='1';
   for(const b of host.querySelectorAll('button'))b.disabled=true;
   try{await action();}catch(e){showError(host,e);}
   finally{delete host.dataset.busy;for(const b of host.querySelectorAll('button:not([data-locked])'))b.disabled=false;}
  };
 }
 function pinnedEntries(){
  const owned={},held={},items={},ai={},p={},moves={};
  for(const name of team){
   owned[name]=wildProgress.owned[name];ai[name]=wildProgress.ai[name]??{};p[dex[name][0]]=profiles[dex[name][0]];
   moves[name]=[...movesFor(name)];const item=wildProgress.held[name];if(item){held[name]=item;items[item]=wildProgress.items[item]??0;}
  }
  return {'pokemon-arena-team':JSON.stringify(team),'pokemon-arena-profiles':JSON.stringify(p),'pokemon-arena-moves':JSON.stringify(moves),
   'pokemon-arena-wild-progress':JSON.stringify({owned,held,items,ai,battlePlan:wildProgress.battlePlan,battleCarry:wildProgress.battleCarry})};
 }
 async function state(){
  if(signed())return rpc('status');
  return {...localSeason(),laurel:local().laurel===true,defense:false};
 }
 function saveSeason(next,reward=null,laurel=false){
  const copy=structuredClone(wildProgress),j=((copy.campaign??={}).journey??={});j.season=next;if(laurel)j.laurel=true;
  if(reward==='Rare Candy')copy.vitamins['Rare Candy']=(copy.vitamins['Rare Candy']??0)+1;
  if(reward==='Ability Capsule')copy.capsules=(copy.capsules??0)+1;
  if(!saveWildProgress(copy))throw Error('Could not save this result. Free some browser storage and retry.');
  Object.assign(wildProgress,copy);
 }
 function choose(host,label,fn){host.append(control(label,guarded(host,fn)));}
 async function open(message=''){
  const root=frame('Champion Gauntlet');root.append(element('p','Loading this week’s opponents…'));
  try{
   const [data,lib]=await Promise.all([state(),engine()]);if(view!==root||!root.isConnected)return;
   const run=data.run,course=lib.championCourse(data.week);root.replaceChildren(element('strong','Week of '+data.week+' · UTC'));
   if(message)root.append(element('p',message,'journey-feedback'));
   root.append(element('p','Lock six Pokémon for three battles. HP carries between fights. One team heal restores every member, including fainted Pokémon.'));
   const list=element('ol',null,'champion-course');
   course.forEach((foe,i)=>{const li=element('li');li.append(element('strong',foe.name+' · '+foe.region),element('small',foe.roster.join(' · ')));
    if(run?.stage>i)li.append(element('span','Cleared'));list.append(li);});root.append(list);
   root.append(element('p',data.prize?'Weekly prize received · '+data.prize:'First clear this week · choose one Rare Candy or Ability Capsule.'));
   if(data.laurel)root.append(icon('champion-gauntlet-laurel','Champion Laurel earned'));
   if(clearedGyms.length<gymTeams.length){root.append(element('p','Unlock at '+gymTeams.length+' standard badges · '+clearedGyms.length+' earned.'));return;}
   if(run && ['ready','playing'].includes(run.status)){
    root.append(element('strong',(run.prestige?'Prestige':'Champion')+' team · '+(run.healed?'Heal spent':'Heal available')));
    const roster=element('ul',null,'champion-team');
    run.team.forEach((name,i)=>roster.append(element('li',name+' · '+(run.hp?Math.ceil(run.hp[i])+' HP':'Full HP'))));root.append(roster);
    choose(root,(run.status==='playing'?'Resume':'Start')+' battle '+(run.stage+1),()=>fight(run,lib));
    if(run.stage>0 && !run.healed && run.status==='ready')choose(root,'Use the team heal',async()=>{
     if(signed())await rpc('heal',{id:run.id});else saveSeason({...localSeason(),run:{...run,healed:true,hp:null}});
     await open('Team restored.');});
    choose(root,'Retire this run',()=>{const confirm=control('Confirm retirement',guarded(root,async()=>{
     if(signed())await rpc('retire',{id:run.id});else saveSeason({...localSeason(),run:{...run,status:'retired'}});
     await open();}));root.replaceChildren(element('p','Retire this locked team and give up its current streak?'),confirm,control('Keep playing',()=>open()));});
   }else if(run?.status==='won' && !data.prize){
    for(const reward of ['Rare Candy','Ability Capsule'])choose(root,'Claim '+reward,async()=>{
     if(signed())await window.arenaMarketMutate('claim',{id:run.id,reward},'journey');
     else if(!localSeason().prize && localSeason().run?.status==='won')saveSeason({...localSeason(),prize:reward},reward);
     await open(reward+' added to your bag.');});
   }else{
    if(run?.status==='lost')root.append(element('p','Your previous team fell in battle '+(run.stage+1)+'.'));
    if(team.length!==6)root.append(element('p','Choose six Pokémon in PC to enter.'));
    else{
     choose(root,'Lock team · Champion',()=>start(false));
     if(masterGymClears.size===gymTeams.length)choose(root,'Lock team · Prestige',()=>start(true));
    }
    root.append(element('p','Prestige unlocks at '+gymTeams.length+' Master badges. A Prestige clear earns the Champion Laurel for your trainer card.'));
   }
  }catch(e){showError(root,e);}
 }
 async function start(prestige){
  if(signed()){await window.arenaMarketPrepare('campaign');await rpc('start',{prestige});}
  else{
   const s=localSeason();saveSeason({...s,run:{id:crypto.randomUUID(),kind:'champion',week:s.week,team:[...team],entries:pinnedEntries(),stage:0,healed:false,hp:null,status:'ready',prestige}});
  }
  await open();
 }
 async function fight(run,lib){
  let match;
  if(signed()){
   await rpc('fight',{id:run.id});const packet=await window.arenaJourneyBattle(run.id,'prepare',run.stage);
   if(packet.version!==lib.campaignEngineVersion)throw Error('The combat server is updating. Resume once both versions match.');
   match=packet.match;
  }else{saveSeason({...localSeason(),run:{...run,status:'playing'}});match=lib.journeyMatch(run);}
  byId('home-dialog').close();unlockSkillSound();
  window.ArenaCampaign.playSavedBattle({match,exhibition:true,label:(run.prestige?'Prestige':'Champion')+' Gauntlet · Battle '+(run.stage+1)+' of 3',exit:()=>open(),complete:async out=>{
   const root=frame('Champion Gauntlet');root.append(element('p','Recording the result…'));
   const settle=async()=>{
    const won=out.result==='host' && out.state.enemies.every(p=>p.hp<=0);
    if(signed())await window.arenaJourneyBattle(run.id,'verify',run.stage);
    else{
     const s=localSeason();if(s.run?.id===run.id && s.run.stage===run.stage && s.run.status==='playing'){
      const stage=run.stage+(won?1:0),status=won?(stage===3?'won':'ready'):'lost';
      saveSeason({...s,run:{...run,stage,status,hp:out.state.allies.map(p=>p.hp)}},null,run.prestige && status==='won');
     }
    }
    await open(won?'Battle '+(run.stage+1)+' won.':'Your team was defeated.');
   };
   try{await settle();}catch(e){showError(root,e);choose(root,'Retry result sync',settle);}
  }},lib);
 }
 function showSpar(name,replyTo=null){
  if(!signed())return;
  const root=frame('Friend sparring');
  root.append(element('strong',name+(replyTo?'’s challenging team':'’s published defense')),element('p','Both teams fight at level 100 using their saved held items, moves and Gambits. This is an unranked match.'));
  const check=element('input');check.type='checkbox';check.checked=true;
  const permission=element('label');permission.append(check,' Allow this friend one return challenge against this lineup for seven days.');root.append(permission);
  const id=crypto.randomUUID();
  choose(root,'Challenge '+name,async()=>{
   if(phase!=='home')openMenu();
   await window.arenaMarketPrepare('campaign');const run=await rpc('spar',{id,name,reply_to:replyTo,allow_rematch:check.checked});await resolveSpar(root,run);
  });
 }
 async function resolveSpar(root,run){
  root.replaceChildren(element('p','Your saved teams are battling…'));
  try{if(run.status==='playing')await window.arenaJourneyBattle(run.id,'verify');
   const list=await rpc('inbox'),result=list.find(row=>row.id===run.id)??run;
   root.replaceChildren(element('strong',result.challenger+' vs. '+result.opponent),element('p',sparResult(result)));
  }catch(e){showError(root,e);choose(root,'Resume challenge',()=>resolveSpar(root,run));}
 }
 function sparResult(r){return r.status==='host'?r.challenger+' won.':r.status==='guest'?r.opponent+' won.':r.status==='draw'?'The teams drew.':'Match in progress.';}
 async function defenseControls(host){
  if(!signed())return;
  const row=element('section',null,'journey-defense');host.append(row);
  try{
   const info=await state();if(!row.isConnected)return;
   row.append(element('strong','Friend sparring'),element('p',info.defense?'Your published team can be challenged while you are offline.':'Publish a copy of your current team so friends can challenge it while you are offline.'));
   choose(row,info.defense?'Update saved defense':'Publish saved defense',async()=>{
    if(phase!=='home')throw Error('Open your trainer card from the main menu to publish a defense.');
    await window.arenaMarketPrepare('campaign');await rpc('publish');row.remove();await defenseControls(host);});
   if(info.defense)choose(row,'Withdraw defense',async()=>{await rpc('hide');row.remove();await defenseControls(host);});
  }catch(e){showError(row,e);}
 }
 async function profileActions(host,name,close){
  if(!signed())return;
  const row=element('span');host.append(row);
  try{const result=await rpc('profile',{name});if(!row.isConnected)return;
   if(result.canSpar)row.append(control('Challenge saved team',()=>{close();showSpar(name);}));
   const hero=byId('trainer-card-dialog')?.querySelector('.tc-hero');
   if(hero && result.laurel)hero.append(icon('champion-gauntlet-laurel','Champion Laurel'));
   if(hero && result.banner)hero.append(icon('guild-raid-banner','Guild raid banner'));
  }catch(e){showError(row,e);}
 }
 async function mineEmblems(hero,controls){
  if(!hero || !controls)return;
  try{
   const [info,guild]=await Promise.all([state(),signed()?rpc('guild'):null]);
   if(!hero.isConnected)return;
   const card=wildProgress.trainerCard??={};
   for(const [unlocked,key,file,label] of [[info.laurel,'championLaurel','champion-gauntlet-laurel','Champion Laurel'],[guild?.banner,'guildBanner','guild-raid-banner','Guild raid banner']]){
    if(!unlocked)continue;
    const img=icon(file,label);img.hidden=card[key]===false;hero.append(img);
    const field=element('label',label+' '),check=element('input');check.type='checkbox';check.checked=!img.hidden;
    check.onchange=()=>{card[key]=check.checked;img.hidden=!check.checked;saveWildProgress();};field.append(check);controls.append(field);
   }
  }catch(e){showError(controls,e);}
 }
 async function guildBoard(host){
  try{const info=await rpc('guild');if(!host.isConnected || !info.guild)return;
   const section=element('section',null,'guild-raid-board');section.append(element('h3','Weekly guild raids'),element('p','Week of '+info.week+' · Win together with at least two guild members. Different parties can earn each mark.'));
   for(const [mode,name] of [['coop_mega','Mega Charizard X'],['coop_mega_2','Mega Gengar'],['coop_mega_3','Mega Rayquaza']])section.append(element('p',(info.marks.includes(mode)?'✓ ':'○ ')+name));
   if(info.banner)section.append(icon('guild-raid-banner','Guild raid banner earned'));else section.append(element('small','Clear all three this week to earn your guild banner.'));
   if(info.parties)section.append(element('small',info.repeats+' / '+info.parties+' guild parties played a second raid together this week.'));
   host.prepend(section);
  }catch(e){showError(host,e);}
 }
 async function sparInbox(host){
  if(!signed())return;
  try{const rows=await rpc('inbox');if(!host.isConnected || !rows.length)return;
   const section=element('section',null,'journey-spars');section.append(element('h3','Friend challenges'));
   for(const r of rows){const line=element('div');line.append(element('span',r.challenger+' vs. '+r.opponent+' · '+sparResult(r)));
    if(r.status==='playing')line.append(control('Resume',()=>resolveSpar(frame('Friend sparring'),r)));
    else if(r.defending && r.canReply)line.append(control('Challenge back',()=>showSpar(r.challenger,r.id)));section.append(line);}
   host.prepend(section);
  }catch(e){showError(host,e);}
 }
 let recoveryAt=0,recovering=false;
 async function resumeFriendChallenges(){
  if(recovering || !signed() || document.hidden || phase!=='home' || Date.now()-recoveryAt<90000)return;
  recoveryAt=Date.now();recovering=true;
  try{
   for(const r of await rpc('inbox'))if(r.status==='playing' && phase==='home')await window.arenaJourneyBattle(r.id,'verify');
  }catch{}finally{recovering=false;}
 }
 window.ArenaLeague={isBusy:()=>Boolean(view?.isConnected && view.dataset.busy),resumeFriendChallenges,open,showSpar,defenseControls,profileActions,mineEmblems,guildBoard,sparInbox};
})();
