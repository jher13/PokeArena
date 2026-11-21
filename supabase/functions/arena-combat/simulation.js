// The build script appends this adapter inside the Gym engine's scope.
let onlineRandomState=0;
let onlineSounds=[];
function recordOnlineSkillSound(move,event,shape,delay,variant) {
 const last=onlineSounds.at(-1);
 const order=last?.clock===clock?(last.order ?? 0)+1:0;
 onlineSounds.push({clock,order,move,event,shape,...(delay>0?{delay}:{}),...(variant?{variant}:{})});
}
let onlineRecalls={};
function onlineRandom() {
 onlineRandomState=(Math.imul(1664525,onlineRandomState)+1013904223)>>>0;
 return onlineRandomState/4294967296;
}
function onlineActor(name,entries,side,index,bossLevel,levelOverride,raid=null,copy=null,pvpRoster=null,pcOwned=side!=='boss') {
 if(!isAvailablePokemon(name)) throw Error('A Pokémon in this team is unavailable.');
 const progress=JSON.parse(entries['pokemon-arena-wild-progress'] ?? '{}') ?? {};
 const starter=JSON.parse(entries['pokemon-arena-starter'] ?? '{}') ?? {};
 const profileData=JSON.parse(entries['pokemon-arena-profiles'] ?? '{}') ?? {};
 let profile=copy?.profile ?? profileData[dex[name][0]];
 if(raid) {
  const traitOrder=[0,1,2,3,5,4];
  let pid=natureNames.indexOf(raid.nature);
  while(traitOrder[pid%traitOrder.length]!==raid.trait)pid+=natureNames.length;
  profile={ivs:Array(6).fill(31),evs:[...raid.evs],pid,shiny:Boolean(raid.master),abilityOverride:raid.ability};
 }
 const savedLevel=copy?.level ?? progress.owned?.[name]?.level;
 const level=levelOverride ?? bossLevel ?? (Number.isInteger(savedLevel)?clamp(savedLevel,1,100):name===starter.name?1:5);
 const fallback={ivs:Array(6).fill(bossLevel?23:0),evs:Array(6).fill(0),pid:0};
 savedMoves=JSON.parse(entries['pokemon-arena-moves'] ?? '{}') ?? {};
 delete loadouts[name];
 const moves=raid?legalLoadout(name,raid.moves,raid.master?16:8):bossLevel?wildMoves(name):copy?legalLoadout(name,copy.moves ?? []):movesFor(name);
 if(pcOwned)profile=cappedOwnedProfile(profile);
 const actor=unit(name,0,0,side!=='boss',level,{profile:validProfileData(profile)?profile:fallback,moves});
 const held=progress.held?.[name];
 const equipped=Object.entries(progress.held ?? {}).filter(([,item])=>item===held).map(([holder])=>holder);
 actor.heldItem=pvpRoster?pvpLoanerFor(name,pvpRoster,progress.pvpLoaners):
  Object.hasOwn(heldItems,held) && equipped.indexOf(name)>=0 && equipped.indexOf(name)<(progress.items?.[held] ?? 0)?held:null;
 if(!bossLevel){actor.ai=normalizeBattleAI(progress.ai?.[name]);actor.teamPlan=normalizeTeamPlan(progress.battlePlan);actor.carryName=typeof progress.battleCarry==='string'?progress.battleCarry:'';}
 actor.normalAttacksEnabled=true;
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
function isCoopMode(mode) {return mode==='coop' || mode==='coop_gigantamax' || Object.hasOwn(megaRaidTiers,mode);}
const raidFormRoster={
 coop_mega:['Gengar','Charizard','Lucario','Gardevoir','Tyranitar','Rayquaza'],
 coop_gigantamax:['Charizard','Gengar','Lapras','Snorlax','Machamp','Corviknight'],
};
function initializeOnline(match) {
 const levelOverride=match.mode==='free_fight'?100:undefined;
 const pvp=['ranked','unranked','free_fight'].includes(match.mode);
 const host=(match.host_pick ?? []).map((name,i)=>onlineActor(name,match.host_entries,'host',i,undefined,levelOverride,null,null,pvp?match.host_pick:null));
 const guest=(match.guest_pick ?? []).map((name,i)=>onlineActor(name,match.guest_entries,'guest',i,undefined,levelOverride,null,null,pvp?match.guest_pick:null,match.mode!=='campaign'));
 const coop=isCoopMode(match.mode);
 const raidTeam=match.raid_seats?.flatMap((seat,index)=>{
  if(!seat?.pokemon)return [];
  const side=seat.substitute || seat.uid===match.host?'host':'raid:'+seat.uid;
  return [onlineActor(seat.pokemon,seat.entries,side,index,undefined,undefined,null,seat.copy_data)];
 });
 const fighters=raidTeam ?? [...host,...guest];
 const bossLevel=Math.min(100,Math.ceil(Math.max(...fighters.map(a=>a.level))*1.1)+2);
 const raid=Object.hasOwn(megaRaidTiers,match.mode)?megaRaidTiers[match.mode]:null;
 setArenaDimensions(raid?megaRaidArenaSize:undefined);
 const forms=raidFormRoster[match.mode];
 const guardians=forms ?? ['Onix','Steelix','Golem','Aggron','Tyranitar','Rhyperior'];
 const boss=coop?Array.from({length:raid?1:match.format*2},(_,i)=>{
  const actor=onlineActor(raid?.species ?? guardians[i],{},'boss',i,raid?.level ?? bossLevel,undefined,raid);
  if(raid) {
   actor.raidForm=raid.name;
   actor.shiny=Boolean(raid.master);
   actor.masterRaidPhase=raid.master?1:undefined;
   actor.hp=actor.max=actor.stats[0]=raid.hp;
   actor.raidSecondary=raid.secondary;
   for(const stat of [1,2,4,5])actor.stats[stat]=Math.round(actor.stats[stat]*(1+raid.tier*0.12));
   return actor;
  }
  if(forms) {
   const mega=match.mode==='coop_mega';
   actor.raidForm=mega?(actor.name==='Charizard'?'Mega Charizard X':'Mega '+actor.name):'Gigantamax '+actor.name;
   actor.max=Math.round(actor.max*(mega?1.35:1.85));
   actor.hp=actor.max;
   actor.stats[0]=actor.max;
   if(mega)for(const stat of [1,2,4,5])actor.stats[stat]=Math.round(actor.stats[stat]*1.2);
  }
  return actor;
 }):[];
 allies=coop?fighters:host;
 enemies=coop?boss:guest;
 for(const actor of enemies) actor.friendly=false;
 const leads=raidTeam ?? (coop?[...host.slice(0,match.format),...guest.slice(0,match.format)]:host.slice(0,match.format));
 trainerFields=[leads,enemies.slice(0,match.format)].map(leads=>
   leads.map((actor,i)=>{
    const slot={actor:null,owner:actor.side,y:canvas.height/2+(i-(leads.length-1)/2)*Math.min(112,(canvas.height-110)/leads.length)};
    placeOnline(slot,actor);
    return slot;
   }));
 damageBuckets=[];
 entryHazards=[{},{}];
 fieldMoveExpiry={};
 clock=lastDamageClock=weatherTime=terrainTime=recallCooldown=0;
 battleWeather=battleTerrain=null;
 effects=[];pendingCasts=[];arenaSkillFields=[];arenaFieldSequence=0;onlineSounds=[];onlineRecalls={};
 onlineRandomState=Number.parseInt(match.id.slice(0,8),16)>>>0;
 arenaMap=raid?megaRaidArena(raid):randomArenaMap();
 if(raid?.master)Object.assign(arenaMap,{master:true,phase:1,phaseStarted:0,meteors:[],nextMeteor:0});
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
  arenaMap,arenaSkillFields,arenaFieldSequence,damageBuckets,entryHazards,fieldMoveExpiry,recalls:onlineRecalls,random:onlineRandomState,sounds:onlineSounds,
 };
}
// Older checkpoints can hold a full raid moveset on a transformed player.
function limitLegacyTransformSlots(state) {
 const oversized=new Set([...state.allies,...state.enemies]
  .filter(actor=>actor.battleTransform && actor.moves.length>standardMoveSlots).map(actor=>actor.onlineId));
 if(!oversized.size)return state;
 const trim=actor=>oversized.has(actor.onlineId)?{...actor,
  moves:actor.moves.slice(0,standardMoveSlots),moveCooldowns:actor.moveCooldowns.slice(0,standardMoveSlots),
  moveTimers:actor.moveTimers.slice(0,standardMoveSlots),moveCooldownStarts:(actor.moveCooldownStarts??[]).slice(0,standardMoveSlots)}:actor;
 return {...state,allies:state.allies.map(trim),enemies:state.enemies.map(trim),
  casts:state.casts.filter(cast=>!oversized.has(cast.actor) || !(cast.cooldownSlot>=standardMoveSlots))};
}
function loadOnlineState(state) {
 state=limitLegacyTransformSlots(state);
 ({allies,enemies,effects,clock,lastDamageClock,battleWeather,weatherTime,battleTerrain,terrainTime}=state);
 arenaMap=state.arenaMap?{...state.arenaMap,rocks:[]}:null;
 arenaSkillFields=state.arenaSkillFields ?? [];arenaFieldSequence=state.arenaFieldSequence ?? 0;
 setArenaDimensions(arenaMap ?? undefined);
 fieldMoveExpiry=state.fieldMoveExpiry ?? {};
 entryHazards=state.entryHazards ?? [{},{}];
 damageBuckets=state.damageBuckets ?? [];
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
 if(slot.actor?.hp>0 && blocksExhaustionRecall(slot.actor))throw Error('This Pokémon is exhausted.');
 if(slot.actor?.hp>0 && shadowTagSource(slot.actor))throw Error(shadowTagSource(slot.actor).ability+' prevents recalls inside its aura. Move out of range first.');
 if(slot.actor?.hp>0 && activeAbility(slot.actor)!=='Run Away' && fieldMoveActive('Fairy Lock'))throw Error('Fairy Lock prevents recalls.');
 if(slot.actor?.hp>0 && activeAbility(slot.actor)!=='Run Away' && (slot.actor.trappedUntil>clock || slot.actor.octolockUntil>clock))throw Error('This Pokémon is trapped.');
 if(slot.actor?.hp>0 && slot.actor.ingrainAt)throw Error('This Pokémon is rooted by Ingrain.');
 if(slot.actor?.hp>0 && (onlineRecalls[side] ?? 0)>clock) throw Error('Recall is on cooldown.');
 placeOnline(slot,incoming);
 if(slot.transition.stage==='recall')onlineRecalls[side]=clock+recallDelay+ballDuration;
}
function updateMasterRaid(sides) {
 if(!arenaMap?.master)return;
 const boss=enemies[0];
 if(!boss || boss.hp<=0)return;
 const nextPhase=Math.max(arenaMap.phase,masterRaidPhase(boss.hp,boss.max));
 if(nextPhase!==arenaMap.phase){
  arenaMap.phase=nextPhase;
  arenaMap.phaseStarted=clock;
  arenaMap.nextMeteor=clock;
  arenaMap.meteors=[];
 }
 boss.masterRaidPhase=nextPhase;
 if(nextPhase!==2)return;
 const fighters=sides[0].filter(actor=>actor.hp>0);
 const pending=[];
 for(const meteor of arenaMap.meteors){
  if(meteor.impact>clock){pending.push(meteor);continue;}
  for(const fighter of fighters){
   if(Math.hypot(fighter.x-meteor.x,fighter.y-meteor.y)>meteor.radius+bodyRadius(fighter))continue;
   const damage=Math.min(fighter.hp,defendDamage(fighter,Math.ceil(fighter.max*.12),clock));
   fighter.hp-=damage;
   recordOpponentDamage(boss,fighter,damage);
   effects.push({tx:fighter.x,ty:fighter.y,damage,multiplier:1,color:'#ffb18c',impactOnly:true,life:.58});
  }
  effects.push({x:meteor.x,y:meteor.y,tx:meteor.x,ty:meteor.y,zone:true,radius:meteor.radius,color:'#ff704b',life:.58});
 }
 if(fighters.length && clock>=arenaMap.nextMeteor){
  const target=fighters[Math.floor(onlineRandom()*fighters.length)];
  const radius=70;
  pending.push({x:target.x,y:target.y,radius,impact:clock+1},
   {x:radius+onlineRandom()*(canvas.width-2*radius),y:radius+onlineRandom()*(canvas.height-2*radius),radius,impact:clock+1});
  arenaMap.nextMeteor=clock+2.4;
 }
 arenaMap.meteors=pending;
}
function onlineFrame(dt,raid=false) {
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
   if(!transition.forced && !transition.outgoing.friendly)restoreOpponentTeam(allies);
  }
 }
 const sides=combatSides();
 if(sides.some(side=>!side.length))lastDamageClock+=dt;
 updateMasterRaid(sides);
 advanceCombat(dt,dt,sides);
 refreshBerriesAfterKnockout();
 // Co-op guardians replace themselves. PvP players choose their reserves.
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
 if(raid)return clock>=raidTimeLimit-1e-8?'guest':null;
 if(clock>=battleTimeLimit-1e-8) {
  const result=compareTeamHP(allies,enemies);
  return result>0?'host':result<0?'guest':'draw';
 }
 return null;
}
export function simulateOnline(match,state,steps,command,side) {
 onlineSounds=[];
 if(state)loadOnlineState(state);else initializeOnline(match);
 if(typeof command?.normalAttacks==='boolean') {
  for(const actor of [...allies,...enemies])if(actor.side===side)actor.normalAttacksEnabled=command.normalAttacks;
 } else if(command?.ai) {
  const {actor:id,target,position,style}=command.ai;
  const team=side==='host'?allies:enemies;
  const opposing=side==='host'?enemies:allies;
  const actor=team.find(member=>member.onlineId===id && member.side===side && member.hp>0);
  if(!actor || isCoopMode(match.mode))throw Error('Choose a healthy Pokémon on your side.');
  if(position!==undefined && !Object.hasOwn(battlePositions,position))throw Error('Invalid position.');
  if(style!==undefined && !['Aggressive','Balanced','Defensive'].includes(style))throw Error('Invalid style.');
  if(target!==undefined && !opposing.some(member=>member.onlineId===target && member.revealed && member.hp>0))
   throw Error('Choose a revealed opponent.');
  actor.ai=normalizeBattleAI({...actor.ai,...(position!==undefined?{position}:{}),...(style!==undefined?{style}:{})});
  if(target!==undefined)actor.manualTarget=target;
 } else if(command)onlineSend(side,command.incoming,command.slot);
 let result=null;
 for(let i=0;i<steps && !result;i++)result=onlineFrame(1/60,isCoopMode(match.mode));
 if(isCoopMode(match.mode) && result && result!=='draw')result=result==='host'?'coop_win':'coop_loss';
 return {state:saveOnlineState(),result};
}
function compactOnlineDamage(buckets) {
 const aggregate={dealt:{},taken:{}};
 for(const bucket of buckets ?? [])for(const kind of ['dealt','taken']) {
  for(const [id,entry] of Object.entries(bucket[kind] ?? {})) {
   const row=aggregate[kind][id] ??= {...entry,damage:0};
   row.damage+=entry.damage;
  }
 }
 return [aggregate];
}
export function onlineView(state,side,mode) {
 state=limitLegacyTransformSlots(state);
 const allowed=actor=>actor.side===side || actor.revealed;
 const visible=[...state.allies,...state.enemies].filter(allowed).map(actor=>{
  const {name,type,singleType,copiedSecondary,addedType,side,onlineId,hp,max,level,ability,abilitySuppressed,heldItem,moves,moveCooldowns,moveTimers,x,y,
   friendly,direction,facing,gait,motionTicks,stride,attack,attackStyle,attackSpan,attackX,attackY,
   hit,hitSpan,hitX,hitY,moveLabel,labelTime,fieldTime,ailment,stages,exhaustion,exhaustedUntil,dashRecharge,defendRecharge,defendUntil,raidForm,raidSecondary,shiny,masterRaidPhase,abilityStance,abilityForm,abilityElapsed,abilityNotice,abilityNoticeUntil,disguiseBroken,disguiseBrokenAt,illusionName,substituteHP,iceFaceBroken,puppetUntil}=actor;
  return {name,type,singleType,copiedSecondary,addedType,side,onlineId,hp,max,level:mode==='free_fight'?100:level,ability,abilitySuppressed,heldItem,moves,moveCooldowns,moveTimers,x,y,
   friendly,direction,facing,gait,motionTicks,stride,attack,attackStyle,attackSpan,attackX,attackY,
   hit,hitSpan,hitX,hitY,moveLabel,labelTime,fieldTime,ailment,stages,exhaustion,exhaustedUntil,dashRecharge,defendRecharge,defendUntil,raidForm,raidSecondary,shiny:shiny ?? Boolean(actor.profile?.shiny),masterRaidPhase,abilityStance,abilityForm,abilityElapsed,abilityNotice,abilityNoticeUntil,disguiseBroken,disguiseBrokenAt,illusionName,substituteHP,iceFaceBroken,puppetUntil};
 });
 const ids=new Set(visible.map(actor=>actor.onlineId));
 const fields=state.fields.map(slots=>slots.map(slot=>{
  const transition=slot.transition;
  if(!transition || ids.has(transition.incoming))return slot;
  return {...slot,transition:{...transition,incoming:null}};
 }));
 return {actors:visible,fields,arenaMap:state.arenaMap?{...state.arenaMap,rocks:[]}:null,arenaSkillFields:state.arenaSkillFields ?? [],damageBuckets:compactOnlineDamage(state.damageBuckets),casts:state.casts,effects:state.effects,
  weather:state.battleWeather,weatherTime:state.weatherTime,terrain:state.battleTerrain,clock:state.clock,
  normalAttacks:[...state.allies,...state.enemies].find(actor=>actor.side===side)?.normalAttacksEnabled ?? true,
  recall:Math.max(0,(state.recalls[side] ?? 0)-state.clock),sounds:state.sounds};
}
// Contracts replay the same immutable saved build in the browser and on the server.
export const campaignEngineVersion=updateLogEntries[0].version;
export function campaignContractMatch(entries,definition,runId) {
 const region=definition.region,regional=gymTeams.filter(gym=>gym.region===region);
 if(!regional.length || !['daily','elite'].includes(definition.kind))throw Error('Invalid regional contract.');
 const progress=JSON.parse(entries['pokemon-arena-wild-progress']??'{}');
 const savedTeam=JSON.parse(entries['pokemon-arena-team']??'[]');
 if(definition.kind==='elite' && savedTeam.length!==6)throw Error('Elite contracts require a full six-Pokémon team.');
 const count=Math.min(definition.kind==='elite'?6:3,savedTeam.length);
 const host=savedTeam.slice(0,count);if(!host.length || host.some(name=>!isAvailablePokemon(name) || !progress.owned?.[name]))throw Error('Save a healthy PC team first.');
 const gym=regional.at(-1),elite=definition.kind==='elite';
 const rotation=(definition.seed>>>0)%gym.roster.length;
 const foes=Array.from({length:count},(_,i)=>gym.roster[(i+rotation)%gym.roster.length]);
 const average=host.reduce((sum,name)=>sum+progress.owned[name].level,0)/host.length;
 const level=clamp(Math.round(elite?Math.max(80,average):average-3),1,100);
 const npcProgress={owned:{},held:{},items:{},ai:{},battlePlan:elite?'Burst':'Balanced'};
 const npcProfiles={},npcMoves={};
 foes.forEach(name=>{
  const slot=gym.roster.indexOf(name),physical=dexStats[dex[name][0]-1][1]>=dexStats[dex[name][0]-1][5];
  const profile={pid:physical?3:15,ivs:Array(6).fill(elite?31:18),evs:elite?(physical?[100,252,0,158,0,0]:[100,0,0,158,0,252]):Array(6).fill(0)};
  npcProfiles[dex[name][0]]=profile;npcProgress.owned[name]={level,xp:0};
  npcMoves[name]=gymMoves(name,gym,slot);npcProgress.ai[name]={style:elite?'Aggressive':'Balanced',position:'Auto',target:elite?'Type weakness':'Nearest'};
  const item=elite?(gymHeldItem(name)??'Leftovers'):null;
  if(item){npcProgress.held[name]=item;npcProgress.items[item]=(npcProgress.items[item]??0)+1;}
 });
 const seed=(definition.seed>>>0).toString(16).padStart(8,'0');
 return {id:seed+'-'+runId.slice(9),mode:'campaign',format:count,host_pick:host,guest_pick:foes,
  host_entries:entries,guest_entries:{'pokemon-arena-wild-progress':JSON.stringify(npcProgress),
   'pokemon-arena-profiles':JSON.stringify(npcProfiles),'pokemon-arena-moves':JSON.stringify(npcMoves)}};
}
