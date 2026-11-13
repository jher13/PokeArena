// The build script appends this adapter inside the Gym engine's scope.
let onlineRandomState=0;
let onlineSounds=[];
let onlineRecalls={};
function onlineRandom() {
 onlineRandomState=(Math.imul(1664525,onlineRandomState)+1013904223)>>>0;
 return onlineRandomState/4294967296;
}
function onlineActor(name,entries,side,index,bossLevel) {
 if(!isAvailablePokemon(name)) throw Error('A Pokémon in this team is unavailable.');
 const progress=JSON.parse(entries['pokemon-arena-wild-progress'] ?? '{}') ?? {};
 const starter=JSON.parse(entries['pokemon-arena-starter'] ?? '{}') ?? {};
 const profileData=JSON.parse(entries['pokemon-arena-profiles'] ?? '{}') ?? {};
 const profile=profileData[dex[name][0]];
 const savedLevel=progress.owned?.[name]?.level;
 const level=bossLevel ?? (Number.isInteger(savedLevel)?clamp(savedLevel,1,100):name===starter.name?1:5);
 const fallback={ivs:Array(6).fill(bossLevel?23:0),evs:Array(6).fill(0),pid:0};
 savedMoves=JSON.parse(entries['pokemon-arena-moves'] ?? '{}') ?? {};
 delete loadouts[name];
 const moves=bossLevel?wildMoves(name):movesFor(name);
 const actor=unit(name,0,0,side!=='boss',level,{profile:validProfile(profile)?profile:fallback,moves});
 const held=progress.held?.[name];
 const equipped=Object.entries(progress.held ?? {}).filter(([,item])=>item===held).map(([holder])=>holder);
 actor.heldItem=Object.hasOwn(heldItems,held) && equipped.indexOf(name)<progress.items?.[held]?held:null;
 actor.onlineId=side+':'+index;
 actor.side=side;
 actor.revealed=false;
 return actor;
}
function placeOnline(slot,actor) {
 slot.transition=startSwitch(slot.actor,actor);
 slot.transition.incoming.y=slot.y;
 if(slot.transition.stage==='send')actor.revealed=true;
}
function initializeOnline(match) {
 const host=match.host_pick.map((name,i)=>onlineActor(name,match.host_entries,'host',i));
 const guest=match.guest_pick.map((name,i)=>onlineActor(name,match.guest_entries,'guest',i));
 const coop=match.mode==='coop';
 const bossLevel=Math.min(100,Math.ceil(Math.max(...host.map(a=>a.level),...guest.map(a=>a.level))*1.1)+2);
 const boss=coop?Array.from({length:match.format*2},(_,i)=>onlineActor(
  ['Onix','Steelix','Golem','Aggron','Tyranitar','Rhyperior'][i],{},'boss',i,bossLevel)):[];
 allies=coop?[...host,...guest]:host;
 enemies=coop?boss:guest;
 for(const actor of enemies) actor.friendly=false;
 const leads=coop?[...host.slice(0,match.format),...guest.slice(0,match.format)]:host.slice(0,match.format);
 trainerFields=[leads,enemies.slice(0,match.format)].map(leads=>
   leads.map((actor,i)=>{
    const slot={actor:null,owner:actor.side,y:240+(i-(leads.length-1)/2)*Math.min(112,370/leads.length)};
    placeOnline(slot,actor);
    return slot;
   }));
 clock=lastDamageClock=weatherTime=terrainTime=recallCooldown=0;
 battleWeather=battleTerrain=null;
 effects=[];pendingCasts=[];onlineSounds=[];onlineRecalls={};
 onlineRandomState=Number.parseInt(match.id.slice(0,8),16)>>>0;
}
const actorReferences=['ailmentSource','lastDamageBy'];
function saveOnlineState() {
 const encodeActor=actor=>({...actor,...Object.fromEntries(actorReferences.map(key=>[key,actor[key]?.onlineId ?? null]))});
 return {
  allies:allies.map(encodeActor),enemies:enemies.map(encodeActor),
  fields:trainerFields.map(slots=>slots.map(slot=>({...slot,actor:slot.actor?.onlineId ?? null,
   transition:slot.transition?{...slot.transition,outgoing:slot.transition.outgoing?.onlineId ?? null,
    incoming:slot.transition.incoming.onlineId}:null}))),
  casts:pendingCasts.map(cast=>({...cast,actor:cast.actor.onlineId})),effects,
  clock,lastDamageClock,battleWeather,weatherTime,battleTerrain,terrainTime,
  recalls:onlineRecalls,random:onlineRandomState,sounds:onlineSounds,
 };
}
function loadOnlineState(state) {
 ({allies,enemies,effects,clock,lastDamageClock,battleWeather,weatherTime,battleTerrain,terrainTime}=state);
 onlineRecalls=state.recalls;
 onlineSounds=state.sounds ?? [];
 onlineRandomState=state.random;
 const actors=new Map([...allies,...enemies].map(actor=>[actor.onlineId,actor]));
 const resolve=id=>actors.get(id) ?? null;
 for(const actor of actors.values())for(const key of actorReferences)actor[key]=resolve(actor[key]);
 trainerFields=state.fields.map(slots=>slots.map(slot=>({...slot,actor:resolve(slot.actor),
  transition:slot.transition?{...slot.transition,outgoing:resolve(slot.transition.outgoing),
   incoming:resolve(slot.transition.incoming)}:null})));
 pendingCasts=state.casts.map(cast=>({...cast,actor:resolve(cast.actor)}));
}
function onlineSend(side,incomingId,fieldIndex) {
 const slots=trainerFields.flat().filter(slot=>slot.owner===side);
 const slot=slots[fieldIndex];
 const incoming=[...allies,...enemies].find(actor=>actor.onlineId===incomingId && actor.side===side && actor.hp>0);
 if(!slot || slot.transition || !incoming || trainerFields.flat().some(field=>trainerOnField(incoming,[field])))
  throw Error('Choose an available reserve and field slot.');
 if(slot.actor?.hp>0 && (onlineRecalls[side] ?? 0)>clock) throw Error('Recall is on cooldown.');
 placeOnline(slot,incoming);
 if(slot.transition.stage==='recall')onlineRecalls[side]=clock+recallDelay+ballDuration;
}
function onlineFrame(dt) {
 refreshBerriesAfterKnockout();
 for(const slots of trainerFields)for(const slot of slots) {
  const transition=slot.transition;
  if(!transition)continue;
  const recalling=transition.stage==='recall';
  if(stepSwitch(transition,dt,dt)) {
   slot.actor=transition.incoming;
   slot.actor.entryPending=true;
   slot.transition=null;
  } else if(recalling && transition.stage==='send') {
   transition.incoming.revealed=true;
   if(!transition.outgoing.friendly)restoreOpponentTeam(allies);
  }
 }
 const sides=combatSides();
 if(sides.some(side=>!side.length))lastDamageClock+=dt;
 advanceCombat(dt,dt,sides);
 refreshBerriesAfterKnockout();
 for(const slot of trainerFields[1]) {
  if(slot.owner!=='boss' || slot.transition || slot.actor?.hp>0)continue;
  const reserve=enemies.find(actor=>actor.hp>0 && !trainerOnField(actor,trainerFields[1]));
  if(reserve)placeOnline(slot,reserve);
 }
 onlineSounds=onlineSounds.filter(sound=>clock-sound.clock<1);
 for(const effect of effects)effect.life-=dt;
 effects=effects.filter(effect=>effect.life>0);
 const a=allies.some(actor=>actor.hp>0);
 const b=enemies.some(actor=>actor.hp>0);
 if(!a || !b)return a?'host':b?'guest':'draw';
 if(clock>900) {
  const waiting=sides.map(side=>!side.length);
  if(waiting[0]!==waiting[1])return waiting[0]?'guest':'host';
  return 'draw';
 }
 if(clock-lastDamageClock>60)return 'draw';
 return null;
}
export function simulateOnline(match,state,steps,command,side) {
 onlineSounds=[];
 if(state)loadOnlineState(state);else initializeOnline(match);
 if(command)onlineSend(side,command.incoming,command.slot);
 let result=null;
 for(let i=0;i<steps && !result;i++)result=onlineFrame(1/60);
 if(match.mode==='coop' && result && result!=='draw')result=result==='host'?'coop_win':'coop_loss';
 return {state:saveOnlineState(),result};
}
export function onlineView(state,side) {
 const allowed=actor=>actor.side===side || actor.revealed;
 const visible=[...state.allies,...state.enemies].filter(allowed).map(actor=>{
  const {name,side,onlineId,hp,max,level,ability,heldItem,moves,moveCooldowns,moveTimers,x,y,
   friendly,direction,facing,gait,motionTicks,stride,attack,attackStyle,attackSpan,attackX,attackY,
   hit,hitSpan,hitX,hitY,moveLabel,labelTime,fieldTime}=actor;
  return {name,side,onlineId,hp,max,level,ability,heldItem,moves,moveCooldowns,moveTimers,x,y,
   friendly,direction,facing,gait,motionTicks,stride,attack,attackStyle,attackSpan,attackX,attackY,
   hit,hitSpan,hitX,hitY,moveLabel,labelTime,fieldTime};
 });
 const ids=new Set(visible.map(actor=>actor.onlineId));
 const fields=state.fields.map(slots=>slots.map(slot=>{
  const transition=slot.transition;
  if(!transition || ids.has(transition.incoming))return slot;
  return {...slot,transition:{...transition,incoming:null}};
 }));
 return {actors:visible,fields,casts:state.casts,effects:state.effects,
  weather:state.battleWeather,terrain:state.battleTerrain,clock:state.clock,
  recall:Math.max(0,(state.recalls[side] ?? 0)-state.clock),sounds:state.sounds};
}
