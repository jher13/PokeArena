const arenaSaveKeys = [
 'team','moves','profiles','wild-progress','gym-badges','starter',
 'roguelit-progress','trainer-options','music','sfx'
].map(key=>'pokemon-arena-'+key);
const campaignSaveKeys=['pokemon-arena-gym-badges/master','pokemon-arena-gym-badges/clean-records'];
const cloudRedirect='https://jher13.github.io/PokeArena/';
let arenaCloudClient;
const rememberedEmailKey='arena-remembered-email';
// Remove the persistent session left by the old Remember me option.
function rememberedLoginEmail(value) {
 try {
  if(value===undefined)return localStorage.getItem(rememberedEmailKey);
  if(value)localStorage.setItem(rememberedEmailKey,value);
  else localStorage.removeItem(rememberedEmailKey);
 } catch {}
 return null;
}
try {
 localStorage.removeItem('arena-remembered-user');
 localStorage.removeItem('sb-ckgcuhaiuwlccyaxewbv-auth-token');
} catch {}
function clearCloudAccountMarker() {
 sessionStorage.removeItem('arena-cloud-revision');
 sessionStorage.removeItem('arena-online-user');
 sessionStorage.removeItem('arena-sync-reload');
}
function cloudClient() {
 return arenaCloudClient ??= import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
  .then(({createClient})=>createClient('https://ckgcuhaiuwlccyaxewbv.supabase.co',
   'sb_publishable_NftRvgvLu2zPCvsAcIUqGA_GzNcyYxz',{auth:{detectSessionInUrl:false,storage:sessionStorage}}))
  .catch(error=>{arenaCloudClient=null;throw error;});
}
function readArenaSave() {
 const entries=Object.fromEntries([...arenaSaveKeys,...campaignSaveKeys].map(key=>[key,playerStorage.getItem(key)]));
 entries[campaignSaveKeys[1]]=JSON.stringify(gymRematchRecords);
 return {version:2,entries};
}
function validateArenaSave(save){
 const keys=save?.version===2?[...arenaSaveKeys,...campaignSaveKeys]:arenaSaveKeys;
 if(![1,2].includes(save?.version) || !save.entries || !keys.every(key=>
  Object.hasOwn(save.entries,key) && (save.entries[key]===null || typeof save.entries[key]==='string')))
  throw new Error('This is not a supported Pokemon Arena save.');
 const decoded={};
 for(const key of keys){
  const value=save.entries[key];
  if(value===null || ['pokemon-arena-music','pokemon-arena-sfx'].includes(key))continue;
  const parsed=JSON.parse(value);
  const expectsArray=['pokemon-arena-team','pokemon-arena-gym-badges',campaignSaveKeys[0]].includes(key);
  if(!parsed || typeof parsed!=='object' || Array.isArray(parsed)!==expectsArray)
   throw new Error('The save contains invalid '+key.replace('pokemon-arena-','')+' data.');
  decoded[key]=parsed;
 }
 return decoded;
}
function restoreArenaSave(save,writeKey=playerSaveKey) {
 validateArenaSave(save);
 const keys=save.version===2?[...arenaSaveKeys,...campaignSaveKeys]:arenaSaveKeys;
 const legacyPrefix=writeKey('pokemon-arena-gym-badges/clean/');
 const legacyKeys=save.version===2?Array.from({length:localStorage.length},(_,index)=>localStorage.key(index))
  .filter(key=>key?.startsWith(legacyPrefix)):[];
 const previous=Object.fromEntries(keys.map(key=>[key,localStorage.getItem(writeKey(key))]));
 const legacyValues=legacyKeys.map(key=>[key,localStorage.getItem(key)]);
 function write(entries) {
  for(const key of keys) {
   if(entries[key]===null) localStorage.removeItem(writeKey(key));
   else localStorage.setItem(writeKey(key),entries[key]);
  }
 }
 try {write(save.entries);for(const key of legacyKeys)localStorage.removeItem(key);}
 catch(error) {
  write(previous);
  for(const [key,value] of legacyValues)localStorage.setItem(key,value);
  throw error;
 }

}
let cloudAccount=null;
let cloudRevision=null;
let saveTimer;
let saving=false;
let dirty=false;
let leaseTimer;
const syncError=byId('arena-sync-error');
const saveState=element('span','Saved on this browser');
saveState.id='toolbar-save-state';
saveState.setAttribute('role','status');
byId('home-sync').prepend(saveState);
const homeScreen=byId('home');
const placeSyncError=()=>{
 if(homeScreen.hidden)document.body.append(syncError);
 else byId('home-sync').append(syncError);
};
new MutationObserver(placeSyncError).observe(homeScreen,{attributes:true,attributeFilter:['hidden']});
placeSyncError();
let localSaveFailed=false;
window.reportLocalSaveError=error=>{
 localSaveFailed=true;
 saveState.textContent='Local save failed';
 syncError.textContent='This browser could not save your latest progress. '+error.message;
 syncError.hidden=false;
};
let localChangeNumber=0;
async function syncArenaCloud(action) {
 const account=cloudAccount;
 if(!account)throw Error('Sign in to use your cloud save.');
 if(saving || window.isArenaMarketBusy?.())throw Error('A save or transaction is syncing. Try again shortly.');
 if(action==='load' && !window.confirm('Replace this browser’s progress with the latest cloud save?'))return '';
 if(action==='save' || (action==='sync' && dirty)){
  if(!team.length)throw Error('Choose a starter before saving to the cloud.');
  window.queueArenaSave();clearTimeout(saveTimer);
  await flushArenaSave();
  return saveState.textContent;
 }
 const changeNumber=localChangeNumber;
 saving=true;
 try {
  const row=await fetchArenaSave(await cloudClient(),account);
  if(cloudAccount!==account || localChangeNumber!==changeNumber || window.isArenaMarketBusy?.())
   throw Error('Your progress changed during sync. Try again.');
  if(!row){
   if(action==='load' || !team.length)throw Error('There is no cloud save yet.');
  }else{
   if(action==='sync' && row.updated_at===cloudRevision)return 'Cloud save is up to date.';
   restoreArenaSave(row.save_data);
   cloudRevision=row.updated_at;sessionStorage.setItem('arena-cloud-revision',cloudRevision);
   clearTimeout(saveTimer);dirty=false;updatePendingSave();
   window.location.reload();return 'Loading cloud save…';
  }
 }finally{
  saving=false;
  if(dirty && cloudAccount===account && !window.isArenaMarketBusy?.())window.queueArenaSave();
 }
 // First sync on a new account creates its cloud save using the normal revision check.
 return syncArenaCloud('save');
}
window.arenaCloudControls=()=>{
 const heading=element('h3','Cloud save');
 if(!cloudAccount)return [heading,element('p','Sign in to save, load, or re-sync your cloud progress.')];
 const status=element('p');status.setAttribute('role','status');
 const controls=[['save','Save to cloud'],['load','Load cloud save'],['sync','Re-sync']].map(([action,label])=>{
  const button=element('button',label);button.type='button';
  button.onclick=async()=>{
   controls.forEach(control=>{control.disabled=true;});
   try{status.textContent=await syncArenaCloud(action);}
   catch(error){status.textContent=error.message;}
   finally{controls.forEach(control=>{control.disabled=false;});}
  };
  return button;
 });
 return [heading,...controls,status];
};
async function fetchArenaSave(client,id) {
 const {data,error}=await client.from('arena_saves').select('save_data,updated_at').eq('user_id',id).maybeSingle();
 if(error) throw error;
 return data;
}
const pendingSaveKey=id=>'arena-pending-save:'+id;
function pendingSave(id){
 try{
  const pending=JSON.parse(localStorage.getItem(pendingSaveKey(id)));
  return pending && (pending.baseRevision===null || typeof pending.baseRevision==='string')?pending:null;
 }catch{return null;}
}
function updatePendingSave(){
 if(!cloudAccount)return;
 try{
  if(dirty)localStorage.setItem(pendingSaveKey(cloudAccount),JSON.stringify({baseRevision:cloudRevision}));
  else localStorage.removeItem(pendingSaveKey(cloudAccount));
 }catch(error){window.reportLocalSaveError(error);}
}
async function flushArenaSave() {
 if(!cloudAccount || !team.length || saving || !dirty || pendingMarketOperation()) return;
 saving=true;
 saveState.textContent='Syncing…';
 dirty=false;
 try {
  const client=await cloudClient();
  const {data,error}=await client.rpc('arena_write_save',{payload:readArenaSave(),expected_revision:cloudRevision});
  if(error)throw error;
  if(data?.status==='conflict'){
   const conflict=new Error('Progress changed on another device.');
   conflict.saveConflict=true;
   throw conflict;
  }
  if(data?.status!=='ok'){
   const rejected=new Error('The server rejected invalid save data.');
   rejected.saveConflict=true;
   throw rejected;
  }
  cloudRevision=data.updated_at;
  sessionStorage.setItem('arena-cloud-revision',cloudRevision);
  updatePendingSave();
  if(!localSaveFailed)syncError.hidden=true;
  saveState.textContent=localSaveFailed?'Local save failed':dirty?'Saved locally · sync pending':'Cloud synced';
  if(dirty) window.queueArenaSave();
 } catch(error) {
  dirty=true;
  updatePendingSave();
  saveState.textContent='Saved locally · sync failed';
  syncError.textContent='Progress could not sync. '+error.message+' ';
  const retry=element('button',error.saveConflict?'Load cloud save':'Retry sync');
  retry.onclick=async()=>{
   if(!error.saveConflict){await flushArenaSave().catch(()=>{});return;}
   try{await syncArenaCloud('load');}
   catch(loadError){syncError.append(element('span',' '+loadError.message));}
  };
  syncError.append(retry);
  syncError.hidden=false;
  throw error;
 } finally {saving=false;}
}
window.queueArenaSave=()=>{
 if(!cloudAccount) return;
 localChangeNumber++;
 dirty=true;
 updatePendingSave();
 if(!localSaveFailed)saveState.textContent='Saved locally · sync pending';
 clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>flushArenaSave().catch(()=>{}),350);
};
let leaseCheck=null;
async function checkArenaLease(){
 if(!cloudAccount || leaseCheck)return;
 const id=cloudAccount;
 leaseCheck=(async()=>{
  try{
   const client=await cloudClient();
   if(await claimArenaSession(client)){
    if(cloudAccount===id && !dirty && !saving && !localSaveFailed)saveState.textContent=cloudRevision?'Cloud synced':'Saved locally';
    return;
   }
   if(cloudAccount!==id)return;
   clearInterval(leaseTimer);
   clearTimeout(saveTimer);
   cloudAccount=null;
   const dialog=element('dialog',null,'client-update-dialog');
   const detail=dirty || saving?'Sign in again on this browser to retry any pending changes.':'The last synced save is available when you sign in again.';
   const leave=element('button','Return to sign-in');
   leave.onclick=async()=>{
    await client.auth.signOut({scope:'local'}).catch(()=>{});
    clearCloudAccountMarker();
    window.location.reload();
   };
   dialog.oncancel=event=>event.preventDefault();
   dialog.append(element('strong','Your online session ended.'),element('p','This account is now active in another session. '+detail),leave);
   document.body.append(dialog);
   dialog.showModal();
  }catch{if(cloudAccount===id)saveState.textContent='Waiting to verify online session…';}
 })();
 try{await leaseCheck;}finally{leaseCheck=null;}
}
window.collectServerRaidRewards=async()=>{
 if(!cloudAccount)throw new Error('Sign in to collect raid rewards.');
 if(saving)throw new Error('Waiting for cloud save. Try again.');
 await flushArenaSave();
 if(saving || dirty)throw new Error('Sync your save before collecting raid rewards.');
 saving=true;
 try {
  const {data,error}=await (await cloudClient()).rpc('arena_collect_raid_rewards',{expected_revision:cloudRevision});
  if(error)throw error;
  if(data?.status!=='ok')throw new Error('Cloud save changed. Sync or reload before collecting rewards.');
  cloudRevision=data.updated_at;
  for(const reward of data.rewards){
   if(!wildProgress.megaRaidRewards.includes(reward.mode))wildProgress.megaRaidRewards.push(reward.mode);
   wildProgress.coins+=reward.coins;
   wildProgress.balls[ultraBallIndex]+=reward.ultra_balls;
   wildProgress.items[reward.pvp_item]=(wildProgress.items[reward.pvp_item] ?? 0)+1;
  }
  if(data.rewards.length)saveWildProgress();
  if(!localSaveFailed)sessionStorage.setItem('arena-cloud-revision',cloudRevision);
  return data.rewards;
 }finally{
  saving=false;
  if(dirty)window.queueArenaSave();
 }
};
async function claimArenaSession(client){
 const {data,error}=await client.rpc('arena_claim_session');
 if(error)throw error;
 return data===true;
}
async function enterCloudAccount(client,user,proceed){
 const id=user.id;
 if(!await claimArenaSession(client)){
  await client.auth.signOut({scope:'local'});
  throw new Error('This account is already active on another device. Sign out there or try again after three minutes.');
 }
 const row=await fetchArenaSave(client,id);
 const pending=pendingSave(id);
 if(onlineSaveId!==id){
  if(row && !pending)restoreArenaSave(row.save_data,key=>'arena-online:'+id+':'+key);
  sessionStorage.setItem('arena-online-user',id);
  sessionStorage.setItem('arena-sync-reload',id);
  if(row)sessionStorage.setItem('arena-cloud-revision',row.updated_at);
  window.location.reload();
  return;
 }
 cloudAccount=id;
 cloudRevision=pending?pending.baseRevision:row?.updated_at ?? null;
 // A pending local draft must survive a reload until the server accepts it or the player chooses the cloud copy.
 if(row && !pending && (sessionStorage.getItem('arena-sync-reload')!==id || sessionStorage.getItem('arena-cloud-revision')!==row.updated_at)){
  restoreArenaSave(row.save_data);
  sessionStorage.setItem('arena-sync-reload',id);
  sessionStorage.setItem('arena-cloud-revision',row.updated_at);
  window.location.reload();
  return;
 }
 saveState.textContent=row?'Cloud synced':'Saved locally';
 clearInterval(leaseTimer);
 leaseTimer=setInterval(checkArenaLease,30000);
 proceed();
 void window.resumeArenaPresence?.();
 if(pending){
  // Submit against the original base revision. A newer server copy produces the normal conflict UI.
  window.queueArenaSave();
 }
}
window.addEventListener('online',async()=>{await checkArenaLease();await flushArenaSave().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden')flushArenaSave().catch(()=>{});
 else if(document.visibilityState==='visible')void checkArenaLease();
});
let returnToAccountGate;
function installAccountGate() {
 const gate=byId('account-gate');
 const status=byId('account-status');
 const form=byId('account-form');
 const login=byId('account-login');
 const signup=byId('account-signup');
 const submit=byId('account-submit');
 const password=byId('account-password');
 const remember=byId('account-remember');
 const email=byId('account-email');
 const rememberedEmail=rememberedLoginEmail();
 if(remember) {
  remember.checked=Boolean(rememberedEmail);
  remember.onchange=()=>{if(!remember.checked)rememberedLoginEmail('');};
 }
 if(rememberedEmail && !email.value)email.value=rememberedEmail;
 let creating=false;
 function proceed() {
  gate.hidden=true;
  openMenu();
 }
 function selectMode(create) {
  creating=create;
  login.setAttribute('aria-pressed',String(!create));
  signup.setAttribute('aria-pressed',String(create));
  submit.textContent=create?'Sign up':'Log in';
  password.autocomplete=create?'new-password':'current-password';
  status.textContent='';
 }
 login.onclick=()=>selectMode(false);
 signup.onclick=()=>selectMode(true);
 byId('account-offline').onclick=async()=>{
  if(arenaCloudClient) {
   try {
    const client=await arenaCloudClient;
    if(cloudAccount){await window.leaveArenaPresence?.(client);await client.rpc('arena_release_session');}
    const {error}=await client.auth.signOut({scope:'local'});
    if(error) throw error;
   } catch(error) {void window.resumeArenaPresence?.();status.textContent=error.message;return;}
  }
  clearInterval(leaseTimer);
  clearCloudAccountMarker();
  if(onlineSaveId) {window.location.reload();return;}
  proceed();
 };
 form.onsubmit=async event=>{
  event.preventDefault();
  if(submit.disabled) return;
  submit.disabled=true;
  status.textContent=creating?'Creating account…':'Signing in…';
  try {
   const client=await cloudClient();
   const credentials={email:email.value.trim(),password:password.value};
   const {data,error}=creating
    ? await client.auth.signUp({...credentials,options:{emailRedirectTo:cloudRedirect}})
    : await client.auth.signInWithPassword(credentials);
   if(error) throw error;
   password.value='';
   if(data.session) {
    rememberedLoginEmail(remember?.checked?credentials.email:'');
    status.textContent='Loading your save…';
    await enterCloudAccount(client,data.session.user,proceed);
   }
   else status.textContent='Confirm your email, then log in with your password.';
  } catch(error) {status.textContent=error.message || 'Could not sign in.';}
  finally {submit.disabled=false;}
 };
 returnToAccountGate=()=>{
  cancelWildRepeat();
  phase='login';
  showScreen('login');
  byId('login').hidden=true;
  gate.hidden=false;
  password.value='';
  selectMode(false);
 };
 byId('toolbar-logout').onclick=async()=>{
  try {
   if(saving) throw new Error('Wait for your cloud save to finish.');
   await flushArenaSave();
   if(arenaCloudClient) {
    const client=await arenaCloudClient;
    await window.leaveArenaPresence?.(client);await client.rpc('arena_release_session');
    const {error}=await client.auth.signOut({scope:'local'});
    if(error) throw error;
   }
   clearInterval(leaseTimer);
   clearCloudAccountMarker();
   if(onlineSaveId) {window.location.reload();return;}
   returnToAccountGate();
  } catch(error) {
   void window.resumeArenaPresence?.();openHomeDialog('Log out',element('p',error.message || 'Could not sign out.'));
  }
 };
 if(onlineSaveId) cloudClient().then(async client=>{
  const {data,error}=await client.auth.getUser();
  if(error || !data.user || data.user.id!==onlineSaveId) throw new Error('Log in again to load your cloud save.');
  await enterCloudAccount(client,data.user,proceed);
 }).catch(error=>{status.textContent=error.message;});
}
installAccountGate();

let arenaMarketWorking=false;
const marketPendingKey=()=>cloudAccount?'arena-market-pending:'+cloudAccount:null;
function pendingMarketOperation(){try{return JSON.parse(sessionStorage.getItem(marketPendingKey()) ?? 'null');}catch{return null;}}
window.isArenaMarketBusy=()=>arenaMarketWorking || Boolean(cloudAccount && pendingMarketOperation());
function setPendingMarketOperation(value){const key=marketPendingKey();if(key){if(value)sessionStorage.setItem(key,JSON.stringify(value));else sessionStorage.removeItem(key);}}
function applyArenaMarketSnapshot(result) {
 validateArenaSave(result.save_data);
 restoreArenaSave(result.save_data);
 applyArenaMarketMemory(result.save_data);
 cloudRevision=result.updated_at;
 sessionStorage.setItem('arena-cloud-revision',cloudRevision);
 dirty=false;updatePendingSave();
 if(!localSaveFailed){syncError.hidden=true;saveState.textContent='Cloud synced';}
 if(phase==='home')openMenu();
}
async function waitForArenaSave(){
 const deadline=Date.now()+15000;
 while(saving){if(Date.now()>deadline)throw Error('Cloud sync is still busy. Try again shortly.');await new Promise(resolve=>setTimeout(resolve,50));}
}
async function marketRpc(action,args={},service='market') {
 if(!cloudAccount)throw Error('Sign in to use the Trading Hub.');
 const {data,error}=await (await cloudClient()).rpc(service==='direct'?'arena_direct_trade':service==='campaign'?'arena_campaign':'arena_market',{action,args});
 if(error){error.marketRpcRejected=Boolean(error.code);throw error;}
 if(data?.status && data.status!=='ok'){
  const failure=new Error(data.message ?? 'Your PC changed. Sync or reload before trading.');failure.marketStatus=data.status;throw failure;
 }
 return data;
}
window.arenaMarketRead=marketRpc;
async function sendMarketOperation(operation) {
 let error;
 for(let attempt=0;attempt<2;attempt++) {
  try{
   let timer;
   try{return await Promise.race([marketRpc(operation.action,operation.args,operation.service??'market'),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('The Hub is taking too long to respond. Open Trading Hub to retry this transaction safely.')),15000);})]);}
   finally{clearTimeout(timer);}
  }
  catch(failure){error=failure;if(failure.marketStatus || failure.marketRpcRejected)throw failure;}
 }
 throw error;
}
window.arenaMarketRecover=async()=>{
 const operation=pendingMarketOperation();if(!operation)return;
 if(arenaMarketWorking)throw Error('A Hub transaction is still syncing.');
 const allowed=operation.service==='campaign'?['home','menu','gyms','collection','wild-regions','trainer-regions'].includes(phase):phase==='home';
 if(!allowed || automaticBattleLoopActive())throw Error('Return to the main menu to sync this transaction.');
 arenaMarketWorking=true;document.body.setAttribute('aria-busy','true');
 try {
  await waitForArenaSave();saving=true;
  const result=await sendMarketOperation(operation);
  applyArenaMarketSnapshot(result);setPendingMarketOperation(null);return result;
 }catch(error){if(error.marketStatus || error.marketRpcRejected)setPendingMarketOperation(null);throw error;}
 finally {saving=false;arenaMarketWorking=false;document.body.removeAttribute('aria-busy');}
};
window.arenaMarketPrepare=async(service='market')=>{
 if(!cloudAccount)throw Error('Sign in to use the Trading Hub.');
 if((service==='campaign'?!['home','menu','gyms','collection','wild-regions','trainer-regions'].includes(phase):phase!=='home') || automaticBattleLoopActive())throw Error(service==='campaign'?'Finish your battle before opening regional rewards.':'Return to the main menu before trading.');
 await window.arenaMarketRecover();await waitForArenaSave();await flushArenaSave();
 if(dirty)throw Error('Sync your latest PC changes before trading.');
};
window.arenaMarketMutate=async(action,args={},service='market')=>{
 if(arenaMarketWorking)throw Error('A Hub transaction is still syncing.');
 await window.arenaMarketPrepare(service);
 if(arenaMarketWorking)throw Error('A Hub transaction is still syncing.');
 arenaMarketWorking=true;document.body.setAttribute('aria-busy','true');
 saveState.textContent=service==='campaign'?'Syncing regional progress…':action==='claim'?'Receiving Hub deliveries…':'Syncing Hub transaction…';
 let operation;
 try {
  clearTimeout(saveTimer);await waitForArenaSave();
  if(dirty)await flushArenaSave();
  if(dirty)throw Error('Sync your PC before trading.');
  saving=true;
  operation={action,...(service==='market'?{}:{service}),args:{...args,expected_revision:cloudRevision,request_id:crypto.randomUUID()}};
  setPendingMarketOperation(operation);
  const result=await sendMarketOperation(operation);
  applyArenaMarketSnapshot(result);setPendingMarketOperation(null);return result;
 }catch(error){
  if(error.marketStatus || error.marketRpcRejected)setPendingMarketOperation(null);
  if(pendingMarketOperation())saveState.textContent=service==='campaign'?'Regional transaction pending · retry reward sync':'Trade pending · open Trading Hub to retry';
  else if(!localSaveFailed)saveState.textContent='Cloud synced';
  throw error;
 }finally{
  saving=false;arenaMarketWorking=false;document.body.removeAttribute('aria-busy');
  if(dirty && !pendingMarketOperation())window.queueArenaSave();
 }
};
// A short inventory transaction can begin only from the main menu. Never lock an active battle.
for(const eventName of ['click','submit','keydown'])document.addEventListener(eventName,event=>{
 const pending=cloudAccount && pendingMarketOperation();
 const recoveryControl=event.target?.closest?.('#home-hub, #toolbar-notices, #home-dialog, #toolbar-logout, #arena-market-recover, #trainer-card-dialog .tc-heading button, #trainer-card-dialog .campaign-recover');
 if(arenaMarketWorking || pending && !recoveryControl){
  event.preventDefault();event.stopImmediatePropagation();
  if(!arenaMarketWorking){saveState.textContent=pending?.service==='campaign'?'Regional transaction pending · retry reward sync':'Trade pending · open Trading Hub to retry';syncError.hidden=false;
   const recover=element('button',pending?.service==='campaign'?'Retry reward sync':'Retry Hub sync');recover.id='arena-market-recover';recover.onclick=()=>window.arenaMarketRecover().catch(error=>{saveState.textContent=error.message;});
   syncError.replaceChildren(element('span','Finish syncing this transaction before changing progress. '),recover);
  }
 }
},true);
byId('home-dialog').addEventListener('cancel',event=>{if(arenaMarketWorking)event.preventDefault();});
let lastMarketDeliveryCheck=0;
window.arenaMarketNotifications=async()=>{
 const result=await marketRpc('notices');
 if(result.pending>0 && phase==='home' && !automaticBattleLoopActive() && !document.querySelector('dialog[open]') &&
  !saving && !dirty && !window.isArenaMarketBusy() && Date.now()-lastMarketDeliveryCheck>30000) {
  lastMarketDeliveryCheck=Date.now();
  queueMicrotask(()=>{
   if(phase==='home' && !automaticBattleLoopActive() && !document.querySelector('dialog[open]'))
    window.arenaMarketMutate('claim').catch(()=>{});
  });
 }
 return result;
};
window.arenaMarketMarkRead=ids=>marketRpc('read_notices',{ids});

window.arenaCampaignMutate=(action,args={})=>window.arenaMarketMutate(action,args,'campaign');
window.arenaCampaignRead=async(action='status',args={})=>{
 await waitForArenaSave();if(dirty && !saving)await flushArenaSave();
 if(dirty)throw Error('Sync your current progress before opening regional rewards.');
 return marketRpc(action,args,'campaign');
};
window.arenaCampaignVerify=async(run_id,campaign='verify')=>{
 if(!cloudAccount)throw Error('Sign in to verify this contract.');
 for(let attempt=0;attempt<40;attempt++){
  let timer;let response;
  try{response=await Promise.race([(await cloudClient()).functions.invoke('arena-combat',{body:{campaign,run_id}}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Contract verification timed out. Retry from Regional Progress.')),15000);})]);}finally{clearTimeout(timer);}
  const {data,error}=response;
  if(error){const body=await error.context?.json?.().catch(()=>null);throw Error(body?.error??error.message);}
  if(data?.error)throw Error(data.error);
  if(data?.pending && campaign==='verify')continue;
  return data;
 }
 throw Error('Verification is still in progress. Retry from Regional Progress.');
};
