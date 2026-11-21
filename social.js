/* Social chat and private Pokémon exchanges. The server decides membership and ownership. */
(()=>{
 'use strict';
 const dialog=byId('home-dialog'),content=byId('home-dialog-content');
 const channels=[['world','World Chat'],['guild','Guild Chat'],['friend','Friend Chat'],['trade','Trade Chat']];
 const node=element;
 const timeFormat=new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'});
 let active=null;
 function button(label,action){
  const b=node('button',label);b.type='button';b.onclick=action;return b;
 }
 async function rpc(method,args){
  const {data,error}=await (await cloudClient()).rpc(method,args);
  if(error)throw error;return data;
 }
 const direct=(action,args={})=>rpc('arena_direct_trade',{action,args});
 const inbox=async()=>(await direct('inbox')).rooms;
 let unreadAccount=null,unread=null,noticeQueue=Promise.resolve(),pendingNotices=0,lastNoticeCheck=0;
 function syncNoticeAccount(){
  if(unreadAccount===cloudAccount)return;
  unreadAccount=cloudAccount;unread=null;lastNoticeCheck=0;
  setToolbarUnread('toolbar-messages',0);
 }
 function updateNotices(args={}){
  syncNoticeAccount();
  const account=unreadAccount;
  if(!account)return Promise.resolve();
  pendingNotices++;
  const update=noticeQueue.then(async()=>{
   if(account!==cloudAccount)return;
   const result=await rpc('arena_chat_notifications',args);
   if(account!==cloudAccount)return;
   unread=result;lastNoticeCheck=Date.now();
   const total=channels.reduce((sum,[key])=>sum+(unread.counts[key]??0),0);
   setToolbarUnread('toolbar-messages',unread.muted?0:total);
   active?.drawNotices?.();
  }).finally(()=>{pendingNotices--;});
  // A failed request must not prevent later reads or mute changes.
  noticeQueue=update.catch(()=>{});return update;
 }
 function refreshUnread(force=false){
  syncNoticeAccount();
  if(!cloudAccount || phase!=='home' || document.hidden || pendingNotices || (!force && Date.now()-lastNoticeCheck<10000))return;
  lastNoticeCheck=Date.now();void updateNotices().catch(()=>{});
 }
 function withCount(label,count){
  return count?label+' ('+(count>99?'99+':count)+')':label;
 }
 function release(){
  if(active){clearInterval(active.timer);active=null;}
 }
 function mount(title,wide=false){
  release();
  const root=node('section',null,wide?'direct-trade':'social-chat');
  const view={root,account:cloudAccount,refresh:null,timer:null};active=view;
  byId('home-dialog-title').textContent=title;
  dialog.classList.add('collection-dialog');dialog.classList.toggle('trade-hub-dialog',wide);
  content.replaceChildren(root);if(!dialog.open)dialog.showModal();
  view.live=()=>active===view && dialog.open && root.isConnected && cloudAccount===view.account;
  view.timer=setInterval(()=>{
   if(!view.live()){
    if(active===view){
     if(root.isConnected && view.account!==cloudAccount)root.replaceChildren(node('p','Sign in to continue.'));
     release();
    }
    return;
   }
   if(!document.hidden)void view.refresh?.();
  },4000);
  return view;
 }
 dialog.addEventListener('close',()=>{if(!dialog.open)release();});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshUnread(true);if(active?.live())void active.refresh?.();}});

 async function messages(initial='world'){
  const view=mount('Messages');
  const tabs=node('div',null,'social-tabs'),panel=node('section',null,'social-panel');
  tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Chat channels');
  panel.setAttribute('role','tabpanel');panel.id='social-channel-panel';
  syncNoticeAccount();
  const mute=node('input'),muteLabel=node('label',null,'social-mute'),noticeStatus=node('span',null,'social-status');
  mute.type='checkbox';mute.disabled=true;noticeStatus.setAttribute('role','status');
  muteLabel.append(mute,' Mute chat notifications');view.root.append(tabs,muteLabel,noticeStatus,panel);
  let changingMute=false,drawPeers;
  view.drawNotices=()=>{
   if(!view.live())return;
   mute.checked=Boolean(unread?.muted);mute.disabled=changingMute || !unread;
   channels.forEach(([key,label],i)=>{tabs.children[i].textContent=withCount(label,unread?.counts[key]);});
   drawPeers?.();
  };
  mute.onchange=async()=>{
   const chosen=mute.checked;changingMute=true;mute.disabled=true;noticeStatus.textContent='';
   try{await updateNotices({mute_notifications:chosen});}
   catch(error){if(view.live())noticeStatus.textContent=error.message;}
   finally{changingMute=false;view.drawNotices();}
  };
  let generation=0;const drafts=new Map();
  for(const [index,[key,label]] of channels.entries()){
   const tab=button(label,()=>selectChannel(key));tab.id='social-tab-'+key;
   tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel.id);
   tab.onkeydown=event=>{
    const next={ArrowLeft:(index+3)%4,ArrowRight:(index+1)%4,Home:0,End:3}[event.key];
    if(next!==undefined){event.preventDefault();tabs.children[next].focus();void selectChannel(channels[next][0]);}
   };
   tabs.append(tab);
  }
  async function selectChannel(key,peer=null){
   const token=++generation,live=()=>view.live()&&token===generation;
   const label=channels.find(([id])=>id===key)[1],draftKey=JSON.stringify([key,peer]);
   let pendingRead=null,sending=false,enabled=false,lastRows=null,lastFriends=null,scope=null,inboxKey=null;
   let latestIncoming=0,marked=0,marking=false;
   drawPeers=null;
   let retry=drafts.get(draftKey)?.retry;
   for(const [i,[id]] of channels.entries()){
    const selected=id===key;tabs.children[i].setAttribute('aria-selected',String(selected));tabs.children[i].tabIndex=selected?0:-1;
   }
   panel.setAttribute('aria-labelledby','social-tab-'+key);
   const scopeLine=node('p','','social-scope'),extra=node('div'),log=node('ol',null,'social-log');
   log.setAttribute('role','log');log.setAttribute('aria-label',label+' messages');log.setAttribute('aria-live','polite');
   const status=node('p','Loading messages…','social-status');status.setAttribute('role','status');
   const form=node('form',null,'social-compose'),input=node('input'),submit=node('button','Send');
   input.type='text';input.maxLength=400;input.placeholder='Write a message…';input.value=drafts.get(draftKey)?.text??'';
   input.setAttribute('aria-label','Message for '+label);submit.type='submit';
   input.disabled=submit.disabled=true;
   input.oninput=()=>{retry=null;drafts.set(draftKey,{text:input.value});submit.disabled=!enabled||sending||!input.value.trim();};
   form.append(input,submit);panel.replaceChildren(extra,scopeLine,log,form,status);
   let peerSelect;
   if(key==='friend'){
    const field=node('label','Conversation ','social-peer');peerSelect=node('select');
    peerSelect.setAttribute('aria-label','Friend conversation');
    peerSelect.onchange=()=>selectChannel('friend',peerSelect.value||null);field.append(peerSelect);extra.append(field);
   }
   async function markVisible(){
    if(!live() || document.hidden || marking || latestIncoming<=marked || log.scrollHeight-log.scrollTop-log.clientHeight>40)return;
    const seen=latestIncoming;marking=true;
    try{await updateNotices({read_through:seen});marked=seen;}
    catch{return;}finally{marking=false;}
    if(latestIncoming>marked)void markVisible();
   }
   log.addEventListener('scroll',markVisible);
   if(peerSelect)drawPeers=()=>{
    for(const option of peerSelect.options){
     const name=option.value;
     const count=name?unread?.peers[name]:unread?.friend_feed;
     option.textContent=withCount(name||'All friends',count);
    }
   };
   function renderFeed(data){
    enabled=data.can_send;scope=data.scope;
    input.disabled=!enabled;submit.disabled=!enabled||sending||!input.value.trim();
    if(key==='friend'){
     const names=data.friends??[],stamp=JSON.stringify(names);
     if(stamp!==lastFriends){
      lastFriends=stamp;peerSelect.replaceChildren(...['',...names].map(name=>{
       const option=node('option',name||'All friends');option.value=name;return option;
      }));peerSelect.value=peer??'';drawPeers();
     }
     scopeLine.textContent=peer?'Private conversation with '+peer+'.':enabled?'Posts here are shared with your accepted friends.':'Add a friend to use Friend Chat.';
    }else if(key==='guild')scopeLine.textContent=enabled?'Guild · '+scope:'Join a guild to use Guild Chat.';
    else scopeLine.textContent=key==='trade'?'Discuss trades with online trainers.':'Talk with trainers from across the arena.';
    const rows=data.messages,stamp=JSON.stringify(rows.map(row=>row.id));
    if(stamp===lastRows){void markVisible();return;}
    latestIncoming=rows.findLast(row=>!row.mine)?.id??0;
    const atBottom=lastRows===null||log.scrollHeight-log.scrollTop-log.clientHeight<40;
    lastRows=stamp;
    log.replaceChildren(...rows.map(row=>{
     const li=node('li'),name=button(row.name,()=>window.ArenaTrainerCard.open(row.mine?null:row.name));
     const time=node('time',timeFormat.format(new Date(row.sent_at)));time.dateTime=row.sent_at;time.title=new Date(row.sent_at).toLocaleString();
     const heading=node('div',null,'social-author');heading.append(name,time);
     li.append(heading,node('span',row.body));return li;
    }));
    if(!rows.length)log.append(node('li','No messages yet.','social-empty'));
    if(atBottom)log.scrollTop=log.scrollHeight;
    void markVisible();
   }
   async function tradeLinks(){
    if(key!=='trade')return;
    try{
     const rooms=await inbox();if(!live())return;
     const stamp=JSON.stringify(rooms);if(stamp===inboxKey)return;inboxKey=stamp;
     extra.replaceChildren(...rooms.map(r=>button((r.status==='invited'&&r.incoming?'Trade invitation from ':'Open trade with ')+r.partner,()=>openTrade(r.id))));
    }catch{if(live()){inboxKey=null;extra.replaceChildren();}}
   }
   async function refresh(){
    if(!live()||sending)return;
    if(pendingRead)return pendingRead;
    pendingRead=(async()=>{
     try{
      const [data]=await Promise.all([rpc('arena_chat',{channel_name:key,peer_name:peer}),tradeLinks()]);
      if(live()&&!sending){renderFeed(data);if(!retry)status.textContent='';}
     }catch(error){
      if(live()&&!sending){
       enabled=false;input.disabled=submit.disabled=true;lastRows=null;log.replaceChildren();scopeLine.textContent='';status.textContent=error.message;
       if(peer && peerSelect?.options.length===0){
        const all=node('option','All friends');all.value='';const current=node('option',peer);current.value=peer;
        peerSelect.append(all,current);peerSelect.value=peer;
       }
      }
     }finally{pendingRead=null;}
    })();return pendingRead;
   }
   form.onsubmit=async event=>{
    event.preventDefault();const text=input.value.trim();if(!enabled||sending||!text)return;
    sending=true;submit.disabled=true;input.readOnly=true;status.textContent='Sending…';
    if(!retry||retry.text!==text)retry={text,id:crypto.randomUUID()};
    drafts.set(draftKey,{text:input.value,retry});
    try{
     if(pendingRead)await pendingRead;
     if(!live())return;
     const data=await rpc('arena_chat',{channel_name:key,peer_name:peer,body_text:text,client_id:retry.id,expected_guild:key==='guild'?scope:null});
     if(drafts.get(draftKey)?.retry?.id===retry.id)drafts.delete(draftKey);
     if(live()){retry=null;input.value='';renderFeed(data);log.scrollTop=log.scrollHeight;void markVisible();status.textContent='';}
    }catch(error){if(live())status.textContent=error.message;}
    finally{if(live()){sending=false;input.readOnly=false;submit.disabled=!enabled||!input.value.trim();}}
   };
   view.refresh=refresh;await refresh();
  }
  view.drawNotices();refreshUnread(true);
  await selectChannel(initial);
 }

 function tradeEntry(action){
  if(phase==='friendlist'||phase==='guild-directory'||phase==='leaderboard-page')openMenu();
  if(phase!=='home'||automaticBattleLoopActive()){
   const v=mount('Direct trade');v.root.append(node('p','Return to the main menu to trade.'));return;
  }
  return action();
 }
 function startTrade(name){return tradeEntry(()=>tradeRoom('invite',{name}));}
 function openTrade(id){return tradeEntry(()=>tradeRoom('view',{id}));}
 async function tradeRoom(first,args){
  const view=mount('Direct trade',true);
  const state=node('p','Opening trade…','direct-state'),offers=node('div',null,'direct-offers');
  const expiry=node('small',null,'direct-expiry');
  const actions=node('div',null,'market-actions'),pickerArea=node('div'),feedback=node('p','','social-status');feedback.setAttribute('role','status');
  view.root.append(state,offers,actions,pickerArea,expiry,feedback);
  let room=null,lastKey=null,working=false,read=null,choosing=false,choiceToken=0,claimed=false,collecting=false,triedDelivery=false;
  function stopChoosing(){choiceToken++;choosing=false;pickerArea.replaceChildren();}
  function actionButton(label,fn,disabled=false){
   const b=button(label,async()=>{
    if(working||!view.live())return;
    working=true;feedback.textContent='';
    for(const control of actions.querySelectorAll('button'))control.disabled=true;
    b.disabled=true;
    try{if(read)await read;if(view.live())await fn();}
    catch(error){if(view.live())feedback.textContent=error.message;}
    finally{working=false;if(view.live()&&room){await refresh();if(view.live()&&room)draw(room,true);if(b.isConnected)b.disabled=false;}}
   });b.disabled=disabled;return b;
  }
  function offerCard(title,pokemon,ready){
   const card=node('article',null,'direct-offer');card.append(node('h3',title));
   if(pokemon){
    card.append(window.ArenaTradePC.pokemonPanel(pokemon));
    if(pokemon.ability)card.append(node('small','Ability · '+pokemon.ability));
    if(pokemon.moves?.length)card.append(node('small','Moves · '+pokemon.moves.join(', ')));
    if(ready)card.append(node('strong','Confirmed','direct-confirmed'));
   }else card.append(node('p','No Pokémon offered.'));
   return card;
  }
  async function choose(){
   stopChoosing();choosing=true;const token=choiceToken;
   pickerArea.replaceChildren(node('p','Loading your PC…'));
   try{
    const rows=await window.ArenaTradePC.inventory();
    if(!view.live()||token!==choiceToken)return;
    let pick=null;
    const offer=actionButton('Offer selected Pokémon',async()=>{
     if(!pick)return;
     await window.arenaMarketMutate('offer',{id:room.id,version:room.version,selector:pick.selector},'direct');
     if(view.live()){stopChoosing();feedback.textContent='Your offer was saved.';}
    },true);
    const picker=window.ArenaTradePC.picker(rows,row=>{pick=row;offer.disabled=!row;});
    pickerArea.replaceChildren(node('p','Choose an Active Pokémon or PC copy. Keep one Pokémon in your PC while your offer is held. Held items stay with you.'),
     picker,offer,button('Close PC',stopChoosing));
   }catch(error){if(view.live()&&token===choiceToken){stopChoosing();feedback.textContent=error.message;}}
  }
  function draw(data,force=false){
   const previousOffer=room?.mine;room=data;
   const stamp=JSON.stringify(data);if(!force&&stamp===lastKey)return;lastKey=stamp;
   if(choosing && JSON.stringify(previousOffer)!==JSON.stringify(room.mine))stopChoosing();
   byId('home-dialog-title').textContent='Trade with '+room.partner;
   offers.replaceChildren();actions.replaceChildren();
   expiry.textContent=room.expires && (room.status==='invited'||room.status==='open')?
    'Expires at '+timeFormat.format(new Date(room.expires))+'. Reopen this trade from Notifications or Trade Chat.':'';
   if(room.status==='invited'){
    state.textContent=room.incoming?room.partner+' invited you to trade Pokémon.':'Waiting for '+room.partner+' to accept.';
    if(room.incoming)actions.append(actionButton('Accept trade',()=>change('accept')));
    actions.append(actionButton(room.incoming?'Decline':'Cancel invitation',()=>change('cancel')));return;
   }
   if(room.status==='open'){
    offers.append(offerCard('Your offer',room.mine,room.ready),offerCard(room.partner+'’s offer',room.theirs,room.partner_ready));
    state.textContent=room.ready?'You confirmed. Waiting for '+room.partner+'.':room.partner_ready?room.partner+' confirmed. Review both Pokémon.':'Both trainers must confirm the same pair of Pokémon.';
    const reviewed=room.version;
    actions.append(actionButton(room.mine?'Change offer':'Choose Pokémon',choose),
     actionButton(room.ready?'Confirmed':'Confirm trade',()=>change('confirm',reviewed),!room.mine||!room.theirs||room.ready),
     actionButton('Cancel trade',()=>change('cancel')));
   }else{
    stopChoosing();clearInterval(view.timer);
    state.textContent=room.status==='completed'?'Trade completed. You received '+(room.theirs?.name??'a Pokémon')+'.':
     room.status==='expired'?'This trade expired.':'This trade was canceled.';
    if(room.status==='completed'||room.mine){
     const delivered=claimed||room.pending_delivery===false;
     actions.append(actionButton(delivered?'Received in PC':collecting?'Receiving…':'Receive Pokémon',receive,delivered||collecting));
     if(!delivered&&!triedDelivery){
      triedDelivery=true;queueMicrotask(()=>{
       if(view.live())void receive().catch(error=>{if(view.live())feedback.textContent=error.message;});
      });
     }
    }
    actions.append(button('Back to Trade Chat',()=>messages('trade')));
   }
  }
  async function receive(){
   if(collecting||claimed||!view.live())return;
   collecting=true;draw(room,true);
   try{
    await window.arenaMarketMutate('claim');claimed=true;
    if(view.live())feedback.textContent='Your PC is up to date.';
   }finally{collecting=false;if(view.live())draw(room,true);}
  }
  async function change(action,version){
   const data=await direct(action,{id:room.id,version:version??room.version});
   if(view.live()){stopChoosing();draw(data);}
  }
  async function refresh(){
   if(!view.live()||working||!room)return;
   if(read)return read;
   read=(async()=>{
    try{const data=await direct('view',{id:room.id});if(view.live()&&!working)draw(data);}
    catch(error){if(view.live())feedback.textContent=error.message;}finally{read=null;}
   })();return read;
  }
  view.refresh=refresh;
  try{const data=await direct(first,args);if(view.live())draw(data);}
  catch(error){if(view.live()){state.textContent=error.message;actions.append(button('Back to Trade Chat',()=>messages('trade')));}}
 }
 window.ArenaSocial={messages,refreshUnread,startTrade,openTrade,inbox,canTrade:async name=>(await direct('availability',{name})).available};
})();
