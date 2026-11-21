const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

// Run the shipped click handlers and renderers against a small DOM and a controlled network.
class Element {
 constructor(tag) {
  this.tag = tag; this.children = []; this.attributes = {}; this.events = {}; this.dataset = {};
  this.style = {setProperty(key,value){this[key]=value;}};
  this.classes = new Set();
  this.classList = {
   add: (...names) => names.forEach(name => this.classes.add(name)),
   remove: (...names) => names.forEach(name => this.classes.delete(name)),
   contains: name => this.classes.has(name),
   toggle: (name,on) => on ? this.classes.add(name) : this.classes.delete(name)
  };
 }
 set className(value){this.classes=new Set(value.split(/\s+/).filter(Boolean));}
 get className(){return [...this.classes].join(' ');}
 set textContent(value){this.replaceChildren(String(value??''));}
 get textContent(){return this.children.map(child=>child instanceof Element?child.textContent:child).join('');}
 append(...items){for(const item of items){if(item instanceof Element){item.remove();item.parent=this;}this.children.push(item);}}
 prepend(...items){this.replaceChildren(...items,...this.children);}
 replaceChildren(...items){for(const child of this.children)if(child instanceof Element)child.parent=null;this.children=[];this.append(...items);}
 replaceWith(item){if(this.parent){const owner=this.parent;owner.replaceChildren(...owner.children.map(child=>child===this?item:child));}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.parent=null;}
 cloneNode(deep){const copy=new Element(this.tag);copy.className=this.className;if(deep)copy.append(...this.children.map(c=>c instanceof Element?c.cloneNode(true):c));return copy;}
 get isConnected(){return this===document.body||Boolean(this.parent?.isConnected);}
 get options(){return this.children.filter(child=>child.tag==='option');}
 contains(node){return this===node||Boolean(node?.parent&&this.contains(node.parent));}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getAttribute(key){return this.attributes[key]??null;}
 addEventListener(type,handler){(this.events[type]??=[]).push(handler);}
 focus(){document.activeElement=this;}
 showModal(){this.open=true;}
 close(){this.open=false;for(const handler of this.events.close??[])handler({target:this});}
 getContext(){return new Proxy({measureText:s=>({width:s.length*6})},{get:(obj,key)=>obj[key]??(()=>{})});}
 matches(selector){
  const [key,qualifier]=selector.split('[');
  if(qualifier==='open]'&&!this.open)return false;
  return key[0]==='#'?this.id===key.slice(1):key[0]==='.'?this.classes.has(key.slice(1)):key===this.tag;
 }
 querySelectorAll(selector){return this.children.filter(c=>c instanceof Element).flatMap(c=>[...(c.matches(selector)?[c]:[]),...c.querySelectorAll(selector)]);}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
}
const document={body:new Element('body'),activeElement:null,currentScript:{src:'https://arena.test/multiplayer.js'},
 createElement:tag=>new Element(tag),addEventListener(){},querySelector(s){return this.body.querySelector(s);},querySelectorAll(s){return this.body.querySelectorAll(s);},
 getElementById(id){let el=this.body.querySelector('#'+id);if(!el){el=new Element('div');el.id=id;this.body.append(el);}return el;}
};
const session=new Map();
const store={getItem:key=>session.get(key)??null,setItem:(key,value)=>session.set(key,String(value)),removeItem:key=>session.delete(key)};
const rows=[{name:'Nifty',self:true},{name:'Rival',self:false}];
const network={rows,profile:null,fail:false,marketOpens:0,requests:[],
 async rpc(method,args){
  if(method==='arena_online' && args.action==='notifications'){
   this.onNotifications?.();await this.pendingNotifications;return {data:{friends:[],invites:[]}};
  }
  if(method==='arena_online')return {data:{name:'Nifty'}};
  if(method==='arena_online_directory'){
   this.requests.push(args.operation);
   if(this.fail)throw Error('Offline');
   return {data:args.operation==='list'?{count:this.rows.length,players:this.rows}:{count:this.rows.length}};
  }
  if(method==='arena_direct_trade')return {data:args.action==='inbox'?{rooms:[]}:{available:this.rows.some(row=>!row.self && row.name===args.args.name)}};
  if(method==='arena_trainer_card')return {data:args.trainer_name?this.profile:{online:{name:'Nifty',raids:[]}}};
  throw Error(method);
 },auth:{getUser:async()=>({data:{user:{id:'viewer'}}})}
};
async function navigationChecks(A, net) {
 const find=(el,text)=>el.querySelectorAll('button').find(b=>b.textContent===text);
 const click=async(el,text)=>{const b=find(el,text);A.ok(b,text);await b.onclick();};
 const select=(el,id,value)=>{const c=el.querySelector('#tc-'+id);A.ok(c,id);c.value=value;c.onchange();};
 const account='viewer';
 phase='home';starterSave={name:'Pikachu',ign:'Local name'};team.splice(0,team.length,'Pikachu');
 wildProgress.trainerCard={};wildProgress.campaign={};wildProgress.owned={Pikachu:{level:44,xp:0}};wildProgress.favorites=['Pikachu'];
 const dlg=()=>byId('trainer-card-dialog'),gallery=()=>dlg().querySelectorAll('.tc-badge');
 await byId('toolbar-profile').onclick();
 const steps=dlg().querySelector('.tc-ranks').children;
 A.deepEqual(steps.map(step=>step.querySelector('b').textContent),['1','2','3','4','5','6','7']);
 A.deepEqual(steps.map(step=>step.querySelector('strong').textContent),['Rookie','Trainer','Ace','Veteran','Elite','Champion','Master']);
 for(const step of steps)A.equal(step.querySelector('.tc-rank-marker').getAttribute('aria-hidden'),'true');
 A.deepEqual(dlg().querySelector('#tc-frame').children.map(o=>o.value),['']);
 const badgeIds=gymTeams.map(g=>g.id);
 clearedGyms=[...badgeIds];for(const id of badgeIds.slice(0,8))masterGymClears.add(id);
 await window.ArenaTrainerCard.open();
 const featured=dlg().querySelector('.tc-buddy');A.ok(featured);
 const effect=featured.querySelector('.tc-buddy-effect'),sprite=featured.querySelector('.tc-buddy-sprite');
 A.ok(effect&&sprite);A.equal(effect.parent,sprite.parent);A.equal(effect.width,effect.height);A.equal(sprite.dataset.portraitAlign,'center');
 select(dlg(),'frame','laurel');A.ok(dlg().querySelector('.tc-hero').classList.contains('laurel'));
 const hero=dlg().querySelector('.tc-hero');A.equal(hero.children.at(-1),hero.querySelector('.tc-card-frame'));
 A.equal(hero.querySelectorAll('.tc-frame-corner').length,4);A.equal(hero.querySelector('.tc-card-frame').getAttribute('aria-hidden'),'true');
 A.ok(dlg().querySelector('.tc-buddy').classList.contains('tc-frame-laurel'));
 A.ok(byId('home').classList.contains('has-kalos-laurel'));A.equal(wildProgress.campaign.laurel,true);
 select(dlg(),'frame','');A.equal(dlg().querySelector('.tc-card-frame'),null);A.equal(dlg().querySelector('.tc-frame-laurel'),null);A.equal(byId('home').classList.contains('has-kalos-laurel'),false);
 select(dlg(),'frame','laurel');
 select(dlg(),'pennants','Kanto');select(dlg(),'title','Kanto Master');select(dlg(),'audience','friends');
 A.equal(window.ArenaCampaign.appearance(),'Kanto');A.equal(byId('campaign-player-title').textContent,'Kanto Master');A.equal(wildProgress.trainerCard.audience,'friends');
 await click(dlg(),'Achievements');A.equal(gallery().length,68);
 A.equal(dlg().querySelectorAll('.master-badge-mark').length,8);
 A.deepEqual(gallery().map(b=>b.querySelector('.gym-badge-sprite').style['--badge-y']),badgeIds.map((_,i)=>-Math.floor(i/10)*48+'px'));
 await gallery()[67].onclick();A.match(dlg().querySelector('.tc-badge-detail').textContent,new RegExp(gymTeams[67].badge));await gallery()[67].onclick();A.equal(dlg().querySelector('.tc-badge-detail').hidden,true);
 await click(dlg(),'Missions');A.ok(find(dlg(),'Regional rewards'));A.match(dlg().textContent,/Daily missions/);A.equal(dlg().querySelector('#tc-frame'),null);
 await click(dlg(),'Contracts');A.equal(find(dlg(),'Contracts').getAttribute('aria-pressed'),'true');
 await click(dlg(),'Close');phase='gyms';renderCampaign(false);await click(byId('gym-grid'),'Regional missions');
 A.equal(find(dlg(),'Missions').getAttribute('aria-pressed'),'true');A.equal(find(dlg(),'Regional rewards').getAttribute('aria-pressed'),'true');
 await click(dlg(),'Close');phase='home';
 const lobby=byId('home-dialog'),content=byId('home-dialog-content');lobby.append(byId('home-dialog-title'),content);
 await byId('toolbar-messages').onclick();A.match(content.textContent,/Sign in/);
 await byId('home-online').onclick();A.match(content.textContent,/Sign in/);
 cloudAccount=account;sessionStorage.setItem('arena-online-user',account);await window.resumeArenaPresence();
 window.openTradingHub=async()=>{net.marketOpens++;};await byId('home-hub').onclick();A.equal(net.marketOpens,1);
 await byId('home-online').onclick();A.equal(byId('home-dialog-title').textContent,'Online');A.equal(byId('home-online-count').textContent,'2');
 const profileLinks=()=>content.querySelectorAll('button').filter(b=>b.textContent==='View profile');
 A.deepEqual(profileLinks().map(b=>b.dataset.trainer),['Nifty','Rival']);A.match(content.textContent,/Nifty \(you\)/);
 await profileLinks()[0].onclick();A.equal(find(dlg(),'Trade').hidden,true);A.equal(dlg().querySelector('.tc-bio').querySelector('h2').textContent,'Nifty');await click(dlg(),'Close');
 net.profile={profile:{publicOnly:true,name:'Rival',style:{},laurel:true},online:{wins:2,losses:1,rating:1012,coop:4}};
 await profileLinks()[1].onclick();A.equal(find(dlg(),'Trade').hidden,false);A.equal(dlg().querySelector('.tc-nav').hidden,true);A.ok(dlg().querySelector('.tc-avatar').classList.contains('tc-frame-laurel'));A.match(dlg().textContent,/1012|1,012/);
 A.equal(dlg().querySelector('.tc-edit'),null);await click(dlg(),'Close');A.equal(lobby.open,true);
 net.profile={profile:{name:'Rival',style:{},standard:badgeIds,master:[],laurel:true,featured:[{name:'Pikachu',level:44},null,null],
  regionCounts:Array(9).fill(0),shinyLegends:[],records:{}},online:{raids:[]}};
 await profileLinks()[1].onclick();A.ok(dlg().querySelector('.tc-buddy').classList.contains('tc-frame-laurel'));
 A.equal(dlg().querySelector('.tc-edit'),null);A.equal(find(dlg(),'Missions'),undefined);await click(dlg(),'Achievements');A.equal(gallery().length,68);await click(dlg(),'Close');
 profileLinks()[1].focus();net.rows.unshift({name:'Abra',self:false});await click(content,'Refresh');
 A.equal(document.activeElement.dataset.trainer,'Rival');A.equal(byId('home-online-count').textContent,'3');
 net.rows=net.rows.filter(r=>r.self);await click(content,'Refresh');A.equal(profileLinks().length,1);
 net.fail=true;await click(content,'Refresh');A.equal(profileLinks().length,0);A.match(content.textContent,/Try refreshing/);A.equal(byId('home-online-count').hidden,true);
 net.fail=false;await click(content,'Refresh');A.equal(profileLinks().length,1);
 await window.ArenaTrainerCard.open('Rival');A.equal(find(dlg(),'Trade').hidden,true);await click(dlg(),'Close');
 await socialNavigationChecks(A,net);
 await inviteNavigationChecks(A,net);
 const started=new Promise(resolve=>net.onNotifications=resolve);let finishHeartbeat;
 net.pendingNotifications=new Promise(resolve=>finishHeartbeat=resolve);
 const polling=byId('toolbar-notices').onclick();await started;
 const leaving=window.leaveArenaPresence(net);await Promise.resolve();
 A.notEqual(net.requests.at(-1),'leave');finishHeartbeat();await Promise.all([polling,leaving]);
 A.equal(net.requests.at(-1),'leave');A.equal(byId('home-online-count').hidden,true);
}
async function socialNavigationChecks(A,net){
 const content=byId('home-dialog-content'),card=byId('trainer-card-dialog');
 const find=(root,label)=>root.querySelectorAll('button').find(b=>b.textContent===label);
 const click=async(root,label)=>{const b=find(root,label);A.ok(b,label);A.ok(!b.disabled,label);await b.onclick();};
 const original=net.rpc,originalPC=window.ArenaTradePC,originalMutate=window.arenaMarketMutate;
 let unlocked=true,pendingGuild,failOnce=true,requests=[],posts=[],trade,receipts=0;
 let muted=false,tradeUnread=0;
 net.rpc=async function(method,params){
  if(method==='arena_chat_notifications'){
   if(params.mute_notifications!==undefined)muted=params.mute_notifications;
   return {data:{muted,counts:{world:0,guild:0,friend:0,trade:tradeUnread},friend_feed:0,peers:{}}};
  }
  if(method==='arena_chat'){
   const {channel_name,peer_name,body_text,client_id}=params;
   if(channel_name==='guild' && pendingGuild)await pendingGuild;
   if(body_text){
    requests.push(params);
    if(!posts.some(m=>m.id===client_id))posts.push({id:client_id,channel_name,peer_name,body:body_text,name:'Nifty',mine:true,sent_at:new Date().toISOString()});
    if(failOnce){failOnce=false;throw Error('Connection interrupted');}
   }
   return {data:{messages:posts.filter(m=>m.channel_name===channel_name && m.peer_name===peer_name),
    friends:['Rival'],scope:channel_name==='guild'&&unlocked?'Kanto':null,can_send:channel_name!=='guild'||unlocked}};
  }
  if(method==='arena_direct_trade'){
   if(params.action==='availability')return {data:{available:params.args.name==='Rival'}};
   if(params.action==='inbox')return {data:{rooms:trade?[trade]:[]}};
   if(params.action==='invite')trade={id:'direct',status:'invited',incoming:false,partner:'Rival',version:0};
   if(params.action==='cancel')trade={...trade,status:'cancelled',version:1};
   if(params.action==='accept')trade={...trade,status:'open',mine:null,theirs:null,ready:false,partner_ready:false};
   if(params.action==='confirm')trade={...trade,status:'completed',pending_delivery:true};
   return {data:trade};
  }
  return original.call(this,method,params);
 };
 try{
  await byId('toolbar-messages').onclick();
  A.deepEqual(content.querySelectorAll('button').filter(b=>b.getAttribute('role')==='tab').map(b=>b.textContent),
   ['World Chat','Guild Chat','Friend Chat','Trade Chat']);
  const mute=content.querySelector('.social-mute').querySelector('input');
  await new Promise(resolve=>setImmediate(resolve));tradeUnread=3;window.ArenaSocial.refreshUnread(true);
  await new Promise(resolve=>setImmediate(resolve));A.equal(byId('toolbar-messages').dataset.unread,'3');
  mute.checked=true;await mute.onchange();A.ok(mute.checked);A.equal(byId('toolbar-messages').dataset.unread,undefined);
  A.ok(find(content,'Trade Chat (3)'));
  mute.checked=false;await mute.onchange();A.equal(byId('toolbar-messages').dataset.unread,'3');
  tradeUnread=0;window.ArenaSocial.refreshUnread(true);await new Promise(resolve=>setImmediate(resolve));
  const input=content.querySelector('form').querySelector('input');input.value='<img src=x>';input.oninput();
  const submit=()=>content.querySelector('form').onsubmit({preventDefault(){}});
  await submit();A.match(content.textContent,/Connection interrupted/);await submit();
  A.equal(requests[0].client_id,requests[1].client_id);A.match(content.querySelector('ol').textContent,/<img src=x>/);
  A.equal(content.querySelector('ol').querySelector('img'),null);
  let resume;pendingGuild=new Promise(resolve=>{resume=resolve;});
  const delayed=click(content,'Guild Chat');await click(content,'Friend Chat');resume();await delayed;pendingGuild=null;
  A.match(content.textContent,/accepted friends/);const select=content.querySelector('select');select.value='Rival';await select.onchange();
  A.match(content.textContent,/Private conversation with Rival/);A.equal(content.querySelector('ol').textContent,'No messages yet.');
  unlocked=false;await click(content,'Guild Chat');A.match(content.textContent,/Join a guild/);A.equal(content.querySelector('form').querySelector('input').disabled,true);
  await click(content,'Trade Chat');await window.ArenaTrainerCard.open('Rival');
  await click(card,'Trade');A.equal(card.open,false);A.equal(byId('home-dialog-title').textContent,'Trade with Rival');
  A.match(content.textContent,/Waiting for Rival/);
  await click(content,'Cancel invitation');A.match(content.textContent,/canceled/);
  await click(content,'Back to Trade Chat');A.equal(find(content,'Trade Chat').getAttribute('aria-selected'),'true');
  trade={id:'direct',status:'invited',incoming:true,partner:'Rival',version:0};
  await byId('toolbar-notices').onclick();await click(content,'Open trade with Rival');A.ok(find(content,'Accept trade'));A.ok(find(content,'Decline'));
  await click(content,'Accept trade');
  // The partner posts an offer while our box loads. Our PC selection must stay available.
  window.ArenaTradePC={inventory:async()=>{
   trade={...trade,version:trade.version+1,theirs:{name:'Eevee'},partner_ready:true};return [{selector:{name:'Pikachu',slot:0}}];
  },picker:(rows,onPick)=>{const b=element('button','Pick Pikachu');b.onclick=()=>onPick(rows[0]);return b;},
  pokemonPanel:mon=>element('p',mon.name)};
  window.arenaMarketMutate=async(action,args,service)=>{
   if(action==='offer'){A.equal(service,'direct');A.equal(args.version,1);trade={...trade,mine:{name:'Pikachu'},version:2};}
   else{A.equal(action,'claim');receipts++;trade={...trade,pending_delivery:false};}
  };
  await click(content,'Choose Pokémon');await click(content,'Pick Pikachu');await click(content,'Offer selected Pokémon');
  A.match(content.textContent,/Eevee/);await click(content,'Confirm trade');
  A.equal(receipts,1);A.match(content.textContent,/Trade completed. You received Eevee/);A.ok(find(content,'Received in PC'));
 }finally{net.rpc=original;window.ArenaTradePC=originalPC;window.arenaMarketMutate=originalMutate;}
}
async function inviteNavigationChecks(A,net){
 const content=byId('home-dialog-content'),room=byId('raid-lobby');
 const find=(root,label)=>root.querySelectorAll('button').find(node=>node.textContent===label);
 const click=async(root,label)=>{const node=find(root,label);A.ok(node,label+' in '+root.textContent);await node.onclick();};
 const friends=[{name:'Rival',accepted:true},{name:'Offline friend',accepted:true},{name:'Pending',accepted:false}];
 const guild=['Guildmate','Rival','Offline guildmate'];
 const pvp={id:'pvp-room',code:'PVP',mode:'unranked',format:1,side:'host',joined:false};
 const raid={id:'raid-room',code:'RAID',mode:'coop_mega',format:1,side:'host',ownSlot:0,seats:[{uid:'viewer',name:'Nifty'},null,null,null,null,null]};
 const sent=[],originalRpc=net.rpc;
 let waitForFriends;
 net.rpc=async function(method,args){
  if(method==='arena_online'||method==='arena_raid'){
   if(args.action==='create'||args.action==='poll')return {data:method==='arena_online'?pvp:raid};
   if(args.action==='invite_list')return {data:['Nifty','Rival','Guildmate','Offline friend','Offline guildmate']};
   if(args.action==='friends'){await waitForFriends;return {data:friends};}
   if(args.action==='guildlist')return {data:guild};
   if(args.action==='invite'){sent.push([method,args.args.id,args.args.name]);return {data:{}};}
  }
  if(method==='arena_raid_chat'||method==='arena_mega_raid_clears')return {data:[]};
  if(method==='arena_coop_ticket_balance')return {data:0};
  return originalRpc.call(this,method,args);
 };
 const online=(...names)=>{net.rows=[{name:'Nifty',self:true},...names.map(name=>({name,self:false}))];};
 const names=()=>content.querySelector('select')?.options.map(option=>option.value)??[];
 try{
  online('Guildmate','Pending','Rival','Stranger');
  await byId('home-pvp').onclick();await click(content,'Create room');await click(content,'Invite friend or guild member');
  A.deepEqual(names(),['Guildmate','Rival']);
  content.querySelector('select').value='Rival';await click(content,'Send invite');
  A.deepEqual(sent,[['arena_online','pvp-room','Rival']]);
  online('Rival');await window.refreshArenaPresence();A.deepEqual(names(),['Rival']);A.equal(content.querySelector('select').value,'Rival');
  online();await click(content,'Send invite');A.equal(sent.length,1);
  A.deepEqual(names(),[]);A.ok(!find(content,'Send invite'));A.match(content.textContent,/No friends or guild members online/);
  await click(content,'Invite friend or guild member');A.equal(content.querySelectorAll('select').length,0);

  online('Guildmate','Pending','Rival','Stranger');
  await byId('home-coop').onclick();await click(room,'Create room');await click(content,'Private');await click(room,'Invite');
  await click(content,'Friendlist');
  A.deepEqual(content.querySelectorAll('button').filter(b=>b.textContent.startsWith('Invite ')).map(b=>b.textContent),['Invite Rival']);
  await click(content,'Invite Rival');A.deepEqual(sent.at(-1),['arena_raid','raid-room','Rival']);
  let finish;waitForFriends=new Promise(resolve=>{finish=resolve;});
  const slow=click(content,'Friendlist');await click(content,'Guildlist');finish();await slow;
  A.ok(find(content,'Invite Guildmate'));A.ok(!find(content,'Invite Offline guildmate'));
  online('Guildmate');await window.refreshArenaPresence();
  A.ok(!find(content,'Invite Rival'));await click(content,'Invite Guildmate');
  A.deepEqual(sent.at(-1),['arena_raid','raid-room','Guildmate']);
  net.fail=true;await window.refreshArenaPresence();A.ok(!find(content,'Invite Guildmate'));A.match(content.textContent,/Unable to check/);
  net.fail=false;online('Offline guildmate');await window.refreshArenaPresence();A.ok(find(content,'Invite Offline guildmate'));
  online();await window.refreshArenaPresence();A.match(content.textContent,/No guild members online/);
  await click(content,'Friendlist');A.match(content.textContent,/No friends online/);
  byId('home-dialog').close();await window.refreshArenaPresence();A.equal(net.requests.at(-1),'count');
 }finally{
  net.rpc=originalRpc;net.fail=false;phase='home';
  await byId('home-online').onclick();
 }
}
(async()=>{
 for(const [file,assetRoot] of [['index.html','./assets/'],['local-test/PokeArena_Local_Test.html','../assets/']]){
  const markup=read(file);
  assert(markup.includes('--arena-kalos-laurel:url("'+assetRoot+'campaign-laurel.svg'));
  assert(markup.includes('#home.has-kalos-laurel #feature-sprite::before,.tc-frame-laurel::before'));
  assert(markup.includes(assetRoot+'gym-badges.png'));
  for(const asset of ['social.js','social.css','trade-hub.js','multiplayer.js','trainer-card.js','cloud.js'])
   assert(markup.includes(assetRoot.replace('assets/','')+asset+'?v='));
 }
 for(const rule of ['.tc-card-frame{','.tc-frame-corner{','.tc-buddy>canvas{grid-area:1/1'])assert(read('trainer-card.css').includes(rule));
 const settingsGrid=new Element('div');settingsGrid.className='battle-settings-grid';document.getElementById('battle-settings').append(settingsGrid);
 globalThis.profileTest={document,store,network};
 let engine=read('supabase/functions/arena-combat/engine.js');
 engine=engine.slice(0,engine.indexOf('const makeNode'))+'const document=globalThis.profileTest.document;\n'+engine.slice(engine.indexOf('const localStorage'));
 engine=engine.replace('const sessionStorage=localStorage;','const sessionStorage=globalThis.profileTest.store;');
 engine=engine.replace('const location=undefined;',"const location={protocol:'file:',search:''};");
 engine=engine.replace('const Image=class {};','const Image=class {addEventListener(){}};');
 const source=[engine,'let cloudAccount=null;const dirty=false;const cloudClient=async()=>globalThis.profileTest.network;',read('campaign-progression.js'),read('trainer-card.js'),read('multiplayer.js'),read('social.js'),socialNavigationChecks.toString(),inviteNavigationChecks.toString(),'export '+navigationChecks.toString()].join('\n');
 const mod=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 await mod.navigationChecks(assert,network);
 console.log('Passed profile navigation, cosmetics, 68 badge icons, Mission shortcuts, online directory, live PvP/co-op invites, chat navigation and profile trades.');
})().catch(error=>{
 console.error(error.name,error.message);
 console.error(error.stack.split('\n').slice(1,4).map(l=>l.replace(/data:text\/javascript;base64,[\w+/=]+/g,'arena-client')).join('\n'));
 process.exitCode=1;
});
