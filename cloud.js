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
function restoreArenaSave(save) {
 if(save?.version!==1 || !save.entries || !arenaSaveKeys.every(key=>
  Object.hasOwn(save.entries,key) && (save.entries[key]===null || typeof save.entries[key]==='string')))
  throw new Error('This is not a supported Pokemon Arena save.');
 for(const key of arenaSaveKeys) {
  const value=save.entries[key];
  if(value!==null && !['pokemon-arena-music','pokemon-arena-sfx'].includes(key)) JSON.parse(value);
 }
 const previous=readArenaSave().entries;
 function write(entries) {
  for(const key of arenaSaveKeys) {
   if(entries[key]===null) localStorage.removeItem(playerSaveKey(key));
   else playerStorage.setItem(key,entries[key]);
  }
 }
 try {write(save.entries);}
 catch(error) {write(previous);throw error;}
 window.location.reload();
}
function installArenaCloud() {
 const panel=byId('arena-cloud-panel');
 const status=byId('arena-cloud-status');
 const saveButton=byId('arena-cloud-save');
 const loadButton=byId('arena-cloud-load');
 const logout=byId('arena-cloud-signout');
 async function perform(action) {
  if(panel.inert) return;
  panel.inert=true;
  try {await action(await cloudClient());}
  catch(error) {status.textContent=error.message || 'Cloud request failed.';}
  finally {panel.inert=false;}
 }
 async function userFor(client) {
  const {data,error}=await client.auth.getUser();
  if(error || !data.user) throw new Error('Sign in with your email first.');
  return data.user;
 }
 async function getSave(client,user) {
  const {data,error}=await client.from('arena_saves').select('save_data,updated_at').eq('user_id',user.id).maybeSingle();
  if(error) throw error;
  return data;
 }
 saveButton.onclick=()=>perform(async client=>{
  if(!team.length) throw new Error('Enter the arena and choose a starter before uploading a save.');
  const user=await userFor(client);
  const existing=await getSave(client,user);
  if(existing && !window.confirm('Replace your cloud save with the selected local profile?')) return;
  const values={save_data:readArenaSave(),updated_at:new Date().toISOString()};
  const query=client.from('arena_saves');
  const {data,error}=await (existing?query.update(values).eq('user_id',user.id).eq('updated_at',existing.updated_at):
   query.insert({...values,user_id:user.id})).select('user_id');
  if(error) throw error;
  if(!data.length) throw new Error('The cloud save changed. Check it before trying again.');
  status.textContent='Profile saved to the cloud.';
 });
 loadButton.onclick=()=>perform(async client=>{
  const existing=await getSave(client,await userFor(client));
  if(!existing) throw new Error('This account has no cloud save.');
  if(window.confirm('Replace the selected local profile with the cloud save?')) restoreArenaSave(existing.save_data);
 });
 logout.onclick=()=>perform(async client=>{
  const {error}=await client.auth.signOut();
  if(error) throw error;
  returnToAccountGate();
 });

}
installArenaCloud();

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
   if(data.session) proceed();
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
   if(arenaCloudClient) {
    const client=await arenaCloudClient;
    const {error}=await client.auth.signOut();
    if(error) throw error;
   }
   returnToAccountGate();
  } catch(error) {
   openHomeDialog('Log out',element('p',error.message || 'Could not sign out.'));
  }
 };
}
installAccountGate();
