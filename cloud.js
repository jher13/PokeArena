const arenaSaveKeys = [
 'team','moves','profiles','wild-progress','gym-badges','starter',
 'roguelit-progress','trainer-options','music','sfx'
].map(key=>'pokemon-arena-'+key);
const cloudRedirect='https://jher13.github.io/PokeArena/';
let arenaCloudClient;
function cloudClient() {
 return arenaCloudClient ??= import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
  .then(({createClient})=>createClient('https://ckgcuhaiuwlccyaxewbv.supabase.co',
   'sb_publishable_NftRvgvLu2zPCvsAcIUqGA_GzNcyYxz',{auth:{detectSessionInUrl:false}}))
  .catch(error=>{arenaCloudClient=null;throw error;});
}
function readArenaSave() {
 return {version:1,entries:Object.fromEntries(arenaSaveKeys.map(key=>[key,playerStorage.getItem(key)]))};
}
function restoreArenaSave(save,writeKey=playerSaveKey) {
 if(save?.version!==1 || !save.entries || !arenaSaveKeys.every(key=>
  Object.hasOwn(save.entries,key) && (save.entries[key]===null || typeof save.entries[key]==='string')))
  throw new Error('This is not a supported Pokemon Arena save.');
 for(const key of arenaSaveKeys) {
  const value=save.entries[key];
  if(value!==null && !['pokemon-arena-music','pokemon-arena-sfx'].includes(key)) JSON.parse(value);
 }
 const previous=Object.fromEntries(arenaSaveKeys.map(key=>[key,localStorage.getItem(writeKey(key))]));
 function write(entries) {
  for(const key of arenaSaveKeys) {
   if(entries[key]===null) localStorage.removeItem(writeKey(key));
   else localStorage.setItem(writeKey(key),entries[key]);
  }
 }
 try {write(save.entries);}
 catch(error) {write(previous);throw error;}

}
let cloudAccount=null;
let cloudRevision=null;
let saveTimer;
let saving=false;
let dirty=false;
const syncError=byId('arena-sync-error');
async function fetchArenaSave(client,id) {
 const {data,error}=await client.from('arena_saves').select('save_data,updated_at').eq('user_id',id).maybeSingle();
 if(error) throw error;
 return data;
}
async function flushArenaSave() {
 if(!cloudAccount || !team.length || saving || !dirty) return;
 saving=true;
 dirty=false;
 try {
  const client=await cloudClient();
  const values={save_data:readArenaSave(),updated_at:new Date().toISOString()};
  const query=client.from('arena_saves');
  const {data,error}=await (cloudRevision
   ?query.update(values).eq('user_id',cloudAccount).eq('updated_at',cloudRevision)
   :query.insert({...values,user_id:cloudAccount})).select('updated_at');
  if(error) throw error;
  if(!data?.length) throw new Error('Progress changed on another device. Reload and log in again to get the latest save.');
  cloudRevision=data[0].updated_at;
  syncError.hidden=true;
  if(dirty) window.queueArenaSave();
 } catch(error) {
  dirty=true;
  syncError.textContent='Progress could not sync. '+error.message;
  syncError.hidden=false;
  throw error;
 } finally {saving=false;}
}
window.queueArenaSave=()=>{
 if(!cloudAccount) return;
 dirty=true;
 clearTimeout(saveTimer);
 saveTimer=setTimeout(()=>flushArenaSave().catch(()=>{}),350);
};
async function enterCloudAccount(client,user,proceed,allowGuestImport=false) {
 const id=user.id;
 let row=await fetchArenaSave(client,id);
 if(!row && allowGuestImport && !onlineSaveId && team.length &&
    window.confirm('Link this browser’s guest progress to your account?')) {
  const {error}=await client.from('arena_saves').insert({user_id:id,save_data:readArenaSave()});
  if(error) throw error;
  row=await fetchArenaSave(client,id);
 }
 if(onlineSaveId!==id) {
  if(row) restoreArenaSave(row.save_data,key=>'arena-online:'+id+':'+key);
  sessionStorage.setItem('arena-online-user',id);
  window.location.reload();
  return;
 }
 cloudAccount=id;
 cloudRevision=row?.updated_at ?? null;
 proceed();
}
window.addEventListener('online',()=>flushArenaSave().catch(()=>{}));
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='hidden') flushArenaSave().catch(()=>{});
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
    const {error}=await client.auth.signOut({scope:'local'});
    if(error) throw error;
   } catch(error) {status.textContent=error.message;return;}
  }
  if(onlineSaveId) {sessionStorage.removeItem('arena-online-user');window.location.reload();return;}
  proceed();
 };
 form.onsubmit=async event=>{
  event.preventDefault();
  if(submit.disabled) return;
  submit.disabled=true;
  status.textContent='Sending email link…';
  try {
   const client=await cloudClient();
   const credentials={email:byId('account-email').value.trim(),password:password.value};
   const {data,error}=creating
    ? await client.auth.signUp({...credentials,options:{emailRedirectTo:cloudRedirect}})
    : await client.auth.signInWithPassword(credentials);
   if(error) throw error;
   password.value='';
   if(data.session) await enterCloudAccount(client,data.session.user,proceed,true);
   else status.textContent='Confirm your email, then log in with your password.';
  } catch(error) {status.textContent=error.message || 'Could not send the link.';}
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
    const {error}=await client.auth.signOut();
    if(error) throw error;
   }
   if(onlineSaveId) {sessionStorage.removeItem('arena-online-user');window.location.reload();return;}
   returnToAccountGate();
  } catch(error) {
   openHomeDialog('Log out',element('p',error.message || 'Could not sign out.'));
  }
 };
 if(onlineSaveId) cloudClient().then(async client=>{
  const {data,error}=await client.auth.getUser();
  if(error || !data.user || data.user.id!==onlineSaveId) throw new Error('Log in again to load your cloud save.');
  await enterCloudAccount(client,data.user,proceed);
 }).catch(error=>{status.textContent=error.message;});
}
installAccountGate();
