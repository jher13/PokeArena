(() => {
 const dialog=byId('home-dialog');
 let generation=0, timer, active;
 let arenaActors=new Map(), rosterRows=new Map(), displayedTurn=-1, recallSlotOnline=null;
 let frameAge=0, soundsPlayed=new Set(), battleSnapshot=null;
 const pvpExitLocked=match=>match?.joined && !match.result && ['ranked','unranked'].includes(match.mode);
 function arenaView(match, picks, togglePick, ready, leave) {
  if(phase!=='online-battle') {
   arenaActors=new Map();rosterRows=new Map();soundsPlayed=new Set();displayedTurn=-1;
   recallSlotOnline=null;battleSnapshot=null;trainerFields=[[],[]];trainerPanels=null;
   phase='online-battle';speed=1;
   effects=[];pendingCasts=[];playerSwitch=enemySwitch=null;
   battleWeather=battleTerrain=null;
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
  byId('reset').disabled=pvpExitLocked(match);
  byId('reset').title=pvpExitLocked(match)?'Available after the PvP match finishes':'';
  if(match.started) {
   if(!battleSnapshot)byId('status').textContent='Both players are ready. Sending out Pokémon…';
   byId('choices').replaceChildren();
   return;
  }
  byId('status').textContent=match.locked?'Ready. Waiting for the other player…':
   'Choose '+match.format+' lead Pokémon from your team, then press Ready.'+(match.opponentLocked?' The other player is ready.':'');
  byId('player-roster').replaceChildren(element('h2','Your team'),...team.map(name=>{
   const card=element('button',null,'battle-slot');
   card.append(pokemonPortrait(name),element('span',name));
   card.disabled=match.locked;
   card.setAttribute('aria-pressed',String(picks.includes(name)));
   card.onclick=()=>togglePick(name);
   return card;
  }));
  const confirmReady=button(match.locked?'Ready ✓':'Ready',ready);
  confirmReady.disabled=match.locked || picks.length!==match.format;
  byId('choices').replaceChildren(confirmReady);
 }
 async function combat(id,command) {
  const client=await cloudClient();
  const {data,error}=await client.functions.invoke('arena-combat',{body:{id,command}});
  if(error) {
   const body=await error.context?.json?.().catch(()=>null);
   throw Error(body?.error ?? error.message);
  }
  return data;
 }
 function showBattleSnapshot(packet,send) {
  if(!packet.battle || packet.turn<=displayedTurn)return;
  displayedTurn=packet.turn;
  const data=packet.battle;
  const mirror=active.mode!=='coop' && active.side==='guest';
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
   actor.snapshotX=actor.x;actor.snapshotY=actor.y;
   actor.previousX=Number.isFinite(oldX) && Math.abs(oldX-actor.x)<90?oldX:actor.x;
   actor.previousY=Number.isFinite(oldY) && Math.abs(oldY-actor.y)<90?oldY:actor.y;
   arenaActors.set(entry.onlineId,actor);
  }
  const actorFor=id=>arenaActors.get(id) ?? null;
  const fields=(mirror?[...data.fields].reverse():data.fields).map(slots=>slots.map(slot=>({
   ...slot,actor:actorFor(slot.actor),
   transition:slot.transition?{...slot.transition,outgoing:actorFor(slot.transition.outgoing),
    incoming:actorFor(slot.transition.incoming),snapshotElapsed:slot.transition.elapsed}:null,
  })));
  trainerFields=fields;
  effects=data.effects.map(effect=>({...effect,x:mx(effect.x),tx:mx(effect.tx),sector:lineView(effect.sector)}));
  pendingCasts=data.casts.map(cast=>({...cast,actor:actorFor(cast.actor),
   center:cast.center?{...cast.center,x:mx(cast.center.x)}:null,line:lineView(cast.line)}));
  battleWeather=data.weather;battleTerrain=data.terrain;
  const freshSounds=new Set();
  for(const sound of data.sounds ?? []) {
   const key=[sound.clock,sound.move,sound.event,sound.shape].join(':');
   if(!soundsPlayed.has(key))playSkillSound(sound.move,sound.event,sound.shape);
   freshSounds.add(key);
  }
  soundsPlayed=freshSounds;
  battleSnapshot=data;
  frameAge=0;
  updateOnlineRoster(send);
 }
 function updateOnlineRoster(send) {
  const ownSlots=trainerFields.flat().filter(slot=>slot.owner===active.side);
  const selectedSlot=ownSlots[recallSlotOnline];
  if(recallSlotOnline!==null && (!selectedSlot?.actor?.hp || selectedSlot.transition))recallSlotOnline=null;
  const openSlot=ownSlots.findIndex(slot=>!slot.transition && !(slot.actor?.hp>0));
  const reserveSlot=openSlot>=0?openSlot:recallSlotOnline;
  const canReserve=[...arenaActors.values()].some(actor=>actor.side===active.side && actor.hp>0 &&
   !ownSlots.some(slot=>trainerOnField(actor,[slot])));
  const status=ownSlots.some(slot=>slot.transition)?'Sending out Pokémon…':
   openSlot>=0 && canReserve?'Choose a healthy reserve to fill the open slot.':
   !canReserve?'Battle in progress.':
   battleSnapshot.recall>0?'Recall ready in '+Math.ceil(battleSnapshot.recall)+'s.':
   recallSlotOnline!==null?'Choose a reserve to send out.':'Select an active Pokémon to recall it.';
  byId('status').textContent=status;
  for(const [friendly,id] of [[true,'player-roster'],[false,'enemy-roster']]) {
   const container=byId(id);
   if(!container.dataset.onlineRoster) {
    container.replaceChildren(element('h2',friendly?'Your side':active.mode==='coop'?'Guardians':'Opponent'));
    container.dataset.onlineRoster='true';
   }
   for(const actor of arenaActors.values()) {
    if(actor.friendly!==friendly)continue;
    const own=actor.side===active.side;
    const index=ownSlots.findIndex(slot=>slot.actor===actor || slot.transition?.incoming===actor);
    let row=rosterRows.get(actor.onlineId);
    if(!row) {
     const card=element('button',null,'battle-slot');
     const identity=element('span',actor.name+' · Lv. '+actor.level,'battle-name');
     const hp=element('progress');hp.max=actor.max;hp.setAttribute('aria-label',actor.name+' HP');
     card.append(pokemonPortrait(actor.name),identity,hp);
     container.append(card);
     row={card,hp};rosterRows.set(actor.onlineId,row);
    }
    row.hp.value=actor.hp;
    row.card.classList.toggle('is-out',actor.hp<=0);
    row.card.classList.toggle('is-active',trainerFields.flat().some(slot=>trainerOnField(actor,[slot])) && actor.hp>0);
    row.card.setAttribute('aria-pressed',String(index>=0 && recallSlotOnline===index));
    row.card.disabled=!own || actor.hp<=0 || (index>=0?!canReserve || Boolean(ownSlots[index].transition):
     reserveSlot===null || (openSlot<0 && battleSnapshot.recall>0));
    row.card.onclick=()=>{
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
  const blend=Math.min(1,frameAge/0.13);
  for(const actor of arenaActors.values()) {
   actor.x=actor.previousX+(actor.snapshotX-actor.previousX)*blend;
   actor.y=actor.previousY+(actor.snapshotY-actor.previousY)*blend;
   actor.attack=Math.max(0,actor.attack-dt);
   actor.hit=Math.max(0,actor.hit-dt);
   actor.labelTime=Math.max(0,actor.labelTime-dt);
   for(let i=0;i<actor.moveTimers.length;i++)actor.moveTimers[i]=Math.max(0,actor.moveTimers[i]-dt);
  }
  for(const slot of trainerFields.flat()) {
   if(slot.transition) {
    const duration=slot.transition.stage==='recall'?ballDuration:throwDuration+releaseDuration;
    slot.transition.elapsed=Math.min(duration,slot.transition.snapshotElapsed+frameAge);
   }
  }
  for(const cast of pendingCasts) {
   if(cast.flight)cast.travel=Math.min(cast.line.length,cast.travel+460*dt);
   else cast.remaining=Math.max(0,cast.remaining-dt);
  }
  for(const effect of effects)effect.life-=dt;
  effects=effects.filter(effect=>effect.life>0);
  if(battleSnapshot)updateActivePanels(trainerFields);
  paint();
 };
 const originalMenu=openMenu;
 openMenu=()=>{
  stop();
  byId('start').hidden=false;
  byId('speed').disabled=false;
  byId('reset').disabled=false;
  byId('reset').title='';
  byId('reset').onclick=openMenu;
  originalMenu();
 };
 const stop=()=>{generation++;clearTimeout(timer);};
 dialog.addEventListener('close',()=>{if(phase!=='online-battle')stop();});
 async function rpc(action,args={}) {
  const client=await cloudClient();
  const {data,error}=await client.rpc('arena_online',{action,args});
  if(error) throw error;
  return data;
 }
 function show(title,...nodes) {
  byId('home-dialog-title').textContent=title;
  byId('home-dialog-content').replaceChildren(...nodes);
  if(!dialog.open) dialog.showModal();
 }
 function button(label,fn) {
  const b=element('button',label);
  b.onclick=async()=>{
   b.disabled=true;
   try {await fn();}
   catch(error){byId('home-dialog-content').append(element('p',error.message));}
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
 function lobby(coop) {
  stop();
  const title=coop?'Co-op':'PvP';
  const mode=select('Match type',[['unranked','Unranked'],['ranked','Ranked']]);
  const format=select('Battle format',[[1,'1v1'],[2,'2v2'],[3,'3v3']]);
  const code=input('Room code');
  const begin=async action=>{
   if(cloudAccount && dirty) await flushArenaSave();
   const match=await rpc(action,{mode:coop?'coop':mode.value,format:Number(format.value),code:code.value});
   if(!dialog.open) return;
   active=match;
   showMatch(title);
  };
  const create=button('Create room',()=>begin('create'));
  const join=button('Join room',()=>begin('join'));
  mode.onchange=()=>{create.hidden=join.hidden=code.hidden=mode.value==='ranked';};
  show(title,...(coop?[]:[mode]),format,button('Find match',()=>begin('queue')),create,code,join);
 }
 function showMatch(title) {
  stop();
  const token=generation;
  const view=element('div');
  const leave=async()=>{
   if(pvpExitLocked(active))return;
   if(!active.result && !confirm('Leave this match?'))return;
   try {
    if(!active.result)await rpc('leave',{id:active.id});
    if(token!==generation)return;
    openMenu();if(dialog.open)dialog.close();
   } catch(error) {byId('status').textContent=error.message;view.append(element('p',error.message));}
  };
  show(title,view,button('Leave match',leave));
  let picks=[], submitting=false, sending=false;
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
   showBattleSnapshot(packet,send);
   if(packet.result && !active.result) {
    active={...active,result:packet.result};
    render();
   }
  }
  function togglePick(name) {
   if(submitting || active.locked)return;
   picks=picks.includes(name)?picks.filter(p=>p!==name):[...picks,name].slice(-active.format);
   render();
  }
  async function ready() {
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
    byId('reset').disabled=false;
    byId('reset').title='';
    if(phase==='online-battle') show(title,element('strong',result),button('Main menu',()=>{openMenu();dialog.close();}));
    else view.append(element('strong',result));return;
   }
   if(!m.joined){
    view.append(element('p','Waiting for another player…'));
    if(m.code && m.side==='host') view.append(button('Invite friend or guild member',async()=>{
     const names=await rpc('invite_list');
     const recipient=select('Invite recipient',names.map(name=>[name,name]));
     view.append(...(names.length?[recipient,button('Send invite',async()=>{
      await rpc('invite',{id:m.id,name:recipient.value});view.append(element('p','Invitation sent.'));
     })]:[element('p','No friends or guild members to invite.')]));
    }));
    return;
   }
   arenaView(m,picks,togglePick,ready,leave);
   if(dialog.open)dialog.close();
  }
  render();
  async function poll() {
   try {
    if(active.started && !active.result) {
     const packet=await combat(active.id);
     if(token!==generation)return;
     acceptBattle(packet);
    } else {
     const next=await rpc('poll',{id:active.id});
     if(token!==generation || (!dialog.open && phase!=='online-battle'))return;
     if(!submitting && (!active.locked || next.locked || next.result) && !active.started &&
       JSON.stringify(next)!==JSON.stringify(active)){active=next;render();}
    }
    if(!active.result)timer=setTimeout(poll,active.started?140:850);
   } catch(error){
    if(token!==generation)return;
    if(phase==='online-battle')byId('status').textContent='Reconnecting… '+error.message;
    else view.replaceChildren(element('p','Reconnecting… '+error.message));
    timer=setTimeout(poll,2000);
   }
  }
  if(!active.result)timer=setTimeout(poll,850);
 }
 async function friends() {
  const rows=await rpc('friends'),name=input('Player name');
  const list=element('div');
  function renderFriends(rows) {
   list.replaceChildren(...rows.map(friend=>{
    const row=element('p');
    if(friend.accepted) {
     const dot=element('span','●');
     dot.style.color=friend.online?'#58df8b':'#8892a3';
     dot.title=friend.online?'Online':'Offline';
     dot.setAttribute('role','img');
     dot.setAttribute('aria-label',dot.title);
     row.append(dot,' ');
    }
    row.append(friend.name+(friend.accepted?'':friend.incoming?' · Incoming request':' · Request sent'));
    if(friend.incoming&&!friend.accepted)row.append(button('Accept',async()=>{
     await rpc('friend_request',{name:friend.name});await friends();await refreshNotices();
    }));
    return row;
   }));
  }
  renderFriends(rows);
  show('Friendlist',name,button('Send request',async()=>{await rpc('friend_request',{name:name.value});await friends();}),
   list);
  async function refreshFriends() {
   if(!dialog.open || !list.isConnected)return;
   try {renderFriends(await rpc('friends'));} catch {}
   if(dialog.open && list.isConnected)setTimeout(refreshFriends,10000);
  }
  setTimeout(refreshFriends,10000);
 }
 async function guilds() {
  const data=await rpc('guilds'),name=input('Guild name');
  show('Guilds',element('p',data.membership?'Your guild: '+data.membership:'You have no guild.'),
   ...(data.membership?[button('Leave guild',async()=>{await rpc('guild_leave');await guilds();})]:
    [name,button('Create guild',async()=>{await rpc('guild_create',{name:name.value});await guilds();}),
     button('Join guild',async()=>{await rpc('guild_join',{name:name.value});await guilds();})]),
   ...data.guilds.map(g=>element('p',g.name+' · '+g.members+' members · '+g.xp+' XP')));
 }
 async function boards() {
  const data=await rpc('leaderboards');
  const sections=[['Ranked PvP',data.ranked,p=>p.rating+' rating · '+p.wins+' wins · '+p.losses+' losses'],
   ['Co-op',data.coop,p=>p.coop+' clears'],['Guilds',data.guilds,p=>p.xp+' XP']];
  show('Leaderboards',...sections.flatMap(([title,rows,describe])=>[element('h3',title),
   ...(rows.length?rows.map((row,i)=>element('p',(i+1)+'. '+row.name+' · '+describe(row))):[element('p','No results yet.')])]));
 }
 async function notifications() {
  const data=await refreshNotices();
  show('Notifications',...data.friends.map(name=>element('div',name+' sent a friend request.')),
   ...data.friends.map(name=>button('Accept '+name,async()=>{await rpc('friend_request',{name});await notifications();})),
   ...data.invites.map(invite=>button('Join '+invite.name+' · '+invite.mode,async()=>{
    active=await rpc('join',{code:invite.code});showMatch(invite.mode==='coop'?'Co-op':'PvP');
   })),
   ...(!data.friends.length&&!data.invites.length?[element('p','No new notifications.')]:[]));
 }
 byId('toolbar-notices').onclick=()=>open('Notifications',notifications);
 async function refreshNotices() {
  const data=await rpc('notifications');
  const count=data.friends.length+data.invites.length;
  const control=byId('toolbar-notices');
  const badge=element('span',String(count));
  badge.style.cssText='margin-left:.45em;background:#bd2348;color:white;border-radius:999px;padding:.1em .5em';
  badge.setAttribute('aria-hidden','true');
  control.replaceChildren('Notifications',...(count?[badge]:[]));
  control.setAttribute('aria-label',count?'Notifications, '+count+' pending':'Notifications');
  return data;
 }
 setInterval(()=>{
  if(cloudAccount && phase!=='login')refreshNotices().catch(()=>{});
 },5000);
 byId('home-coop').onclick=()=>open('Co-op',()=>lobby(true));
 byId('home-pvp').onclick=()=>open('PvP',()=>lobby(false));
 byId('home-friendlist').onclick=()=>open('Friendlist',friends);
 byId('home-guilds').onclick=()=>open('Guilds',guilds);
 byId('home-leaderboard').onclick=()=>open('Leaderboards',boards);
})();
