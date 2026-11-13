(() => {
 const dialog=byId('home-dialog');
 let generation=0, timer, active;
 const stop=()=>{generation++;clearTimeout(timer);};
 dialog.addEventListener('close',stop);
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
  show(title,view,button('Leave match',async()=>{
   if(active.result){lobby(active.mode==='coop');return;}
   if(!confirm('Leave this match? Leaving a started ranked match counts as a loss.'))return;
   await rpc('leave',{id:active.id});lobby(active.mode==='coop');
  }));
  let picks=[];
  function render() {
   const m=active;
   view.replaceChildren(element('p',m.mode+' · '+m.format+' per player'));
   if(m.code)view.append(element('p','Room code '+m.code));
   if(m.result){
    const result={draw:'Draw',cancelled:'Match cancelled',coop_win:'Co-op victory',coop_loss:'Co-op defeat'}[m.result] ?? (m.result===m.side?'Victory':'Defeat');
    view.append(element('strong',result));return;
   }
   if(!m.joined){view.append(element('p','Waiting for another player…'));return;}
   if(!m.field) {
    view.append(element('p',m.opponentLocked?'Opponent ready.':'Opponent choosing a lineup.'));
    if(m.locked){view.append(element('p','Your lineup is locked.'));return;}
    view.append(element('p','Choose '+m.format+' Pokémon.'));
    for(const name of m.choices) {
     const choice=button(name,()=>{picks=picks.includes(name)?picks.filter(p=>p!==name):[...picks,name].slice(-m.format);render();});
     choice.setAttribute('aria-pressed',String(picks.includes(name)));
     view.append(choice);
    }
    const lock=button('Lock lineup',async()=>{
     active=await rpc('lock',{id:m.id,picks});showMatch(title);
    });
    lock.disabled=picks.length!==m.format;view.append(lock);return;
   }
   view.append(element('p','Turn '+m.turn));
   for(const unit of m.field){
    const row=element('div',null,'online-unit');
    if(Object.hasOwn(dex,unit.name))row.append(pokemonPortrait(unit.name));
    row.append(element('strong',(unit.side===m.side?'You':unit.side==='boss'?'AI':m.mode==='coop'?'Ally':'Opponent')+' · '+unit.name));
    const hp=element('progress');hp.max=unit.max;hp.value=unit.hp;hp.setAttribute('aria-label',unit.name+' HP');
    row.append(hp,element('span',unit.hp+'/'+unit.max));view.append(row);
   }
  }
  render();
  async function poll() {
   try {
    const next=await rpc('poll',{id:active.id});
    if(token!==generation || !dialog.open)return;
    if(JSON.stringify(next)!==JSON.stringify(active)){active=next;render();}
    if(!active.result)timer=setTimeout(poll,850);
   } catch(error){if(token===generation)view.append(element('p',error.message));}
  }
  if(!active.result)timer=setTimeout(poll,850);
 }
 async function friends() {
  const rows=await rpc('friends'),name=input('Player name');
  show('Friendlist',name,button('Send request',async()=>{await rpc('friend_request',{name:name.value});await friends();}),
   ...rows.map(friend=>{
    const row=element('p',friend.name+' · '+(friend.accepted?'Friend':friend.incoming?'Incoming request':'Request sent'));
    if(friend.incoming&&!friend.accepted)row.append(button('Accept',async()=>{await rpc('friend_request',{name:friend.name});await friends();}));
    return row;
   }));
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
 byId('home-coop').onclick=()=>open('Co-op',()=>lobby(true));
 byId('home-pvp').onclick=()=>open('PvP',()=>lobby(false));
 byId('home-friendlist').onclick=()=>open('Friendlist',friends);
 byId('home-guilds').onclick=()=>open('Guilds',guilds);
 byId('home-leaderboard').onclick=()=>open('Leaderboards',boards);
})();
