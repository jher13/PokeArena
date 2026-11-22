import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';

// Run from any directory. --json prints per-entry results; --casts skips the exhibition matches.
const source=readFileSync(new URL('../supabase/functions/arena-combat/engine.js',import.meta.url),'utf8');
function prepareTrial(size,seed) {
 const match={id:seed.toString(16).padStart(8,'0')+'-0000-4000-8000-000000000099',mode:'free_fight',format:size,
  host_pick:['Mew','Golduck'].slice(0,size),guest_pick:['Mew','Golduck'].slice(0,size),host_entries:{},guest_entries:{}};
 initializeOnline(match);
 for(const [side,team] of [allies,enemies].entries())for(const [i,unit] of team.entries()){
  unit.x=side?518:438;unit.y=220+i*55;unit.facing=side?-1:1;unit.direction=side?6:2;
  Object.assign(unit,{ability:null,heldItem:null,type:'Normal',singleType:true,copiedSecondary:null,
   hp:320,max:400,stats:[400,200,200,200,200,200],revealed:true,entryPending:true,
   ai:normalizeBattleAI({style:'Balanced',position:'Auto',target:'Nearest'})});
  Object.assign(trainerFields[side][i],{actor:unit,transition:null});
 }
 // Keep the seeded geometry and remove environmental damage bonuses from the controlled matchups.
 arenaMap=null; arenaSkillFields=[]; fieldMoveExpiry={}; lastDamageClock=0; masterPressure=0;
 return match;
}
function equipMoves(unit,moves){
 unit.moves=[...new Set(moves)];unit.moveTimers=unit.moves.map(()=>0);unit.moveCooldownStarts=[];
 unit.moveCooldowns=unit.moves.map(move=>moveRules(move).cooldown);
}
function measureCast(move) {
 const data=moveCatalog[move],rules=moveRules(move),geom=arenaMoveGeometry(move,rules);
 const row={move,category:categoryForMove(move),cooldown:rules.cooldown,range:geom.range,radius:geom.radius,
  warning:geom.warning,scope:rules.scope,healing:skillHealingPercent(move,rules),changes:rules.changes,ailment:rules.ailment,
  controlChance:rules.ailmentChance,description:skillDescription(move)};
 if(data[4])return row;
 let hp=0,self=0;
 for(let n=0;n<32;n++){
  prepareTrial(1,(n+1)*2654435761>>>0);
  const a=allies[0],b=enemies[0];a.type=b.type='Unaligned';a.hp=750;b.hp=b.max=a.max=1000;
  a.x=380;b.x=402;b.direction=6;b.facing=-1;b.y=a.y;
  a.entryPending=b.entryPending=false;
  // Condition the measurement on the attack reaching the target. Accuracy, crits, individual strikes and recoil still roll.
  resolveOffensiveMove(a,move,rules,b,[b],geom.shape==='vortex'?{roaming:true}:null);
  hp+=1000-b.hp;self+=a.hp-750;
 }
 row.contactDamage=+(hp/32).toFixed(2);row.netUserHp=+(self/32).toFixed(2);
 row.contactDamagePerSecond=+(hp/32/(rules.cooldown+Math.max(.58,geom.shape || geom.radius?geom.warning:0))).toFixed(2);
 return row;
}
function exhibition(entry,kind,size,swap){
 const seed=size===1?0x1234abce:0xc0617b01;
 prepareTrial(size,seed);
 const candidate=(swap?enemies:allies)[0];
 const core=size===1?['Pound','Water Pulse','Ice Punch']:['Pound','Water Pulse','Life Dew'];
 for(const unit of [...allies,...enemies])equipMoves(unit,unit.name==='Mew'?core:['Slash','Thunder Wave','Bubble Beam']);
 if(kind==='move')equipMoves(candidate,[entry,...core]);else candidate.ability=entry;
 let outcome=null;
 for(let frame=0;frame<16*60 && !outcome;frame++)outcome=onlineFrame(1/60,false);
 const health=team=>team.reduce((total,unit)=>total+unit.hp/unit.max,0)/team.length;
 const advantage=(health(allies)-health(enemies))*(swap?-1:1);
 if(!Number.isFinite(advantage))throw Error(entry+' produced invalid health');
 return advantage;
}
function runAudit(castsOnly,slice,parts){
 const moveNames=visibleArenaMoves(),abilityNames=Object.keys(abilityCatalog).sort();
 const inSlice=i=>i%parts===slice;
 const moves=[],abilities=[];
 for(const [i,move] of moveNames.entries())if(inSlice(i))moves.push(measureCast(move));
 for(const [i,ability] of abilityNames.entries())if(inSlice(i)){
  if(!abilityEffects.has(ability)||!arenaAbilityDescriptions[ability])throw Error('Missing ability rules: '+ability);
  abilities.push({ability,description:arenaAbilityDescriptions[ability]});
 }
 if(!castsOnly)for(const [kind,rows] of [['move',moves],['ability',abilities]])for(const row of rows){
  for(const [key,size] of [['duel',1],['doubles',2]]){
   const margin=(exhibition(row[kind],kind,size,false)+exhibition(row[kind],kind,size,true))/2;
   row[key]=+margin.toFixed(4);
  }
 }
 return {moves,abilities};
}
const program=[prepareTrial,equipMoves,measureCast,exhibition,runAudit].map(fn=>fn.toString()).join('\n');
const engine=await import('data:text/javascript;base64,'+Buffer.from(source+'\n'+program+'\nexport {runAudit};').toString('base64'));
const [part=0,parts=1]=(process.argv.find(arg=>arg.startsWith('--slice='))?.slice(8)??'0/1').split('/').map(Number);
assert(Number.isInteger(part)&&Number.isInteger(parts)&&part>=0&&part<parts);
const result=engine.runAudit(process.argv.includes('--casts'),part,parts);
if(process.argv.includes('--json'))console.log(JSON.stringify(result));
else console.log('Audited '+result.moves.length+' moves and '+result.abilities.length+' abilities. '+
 (process.argv.includes('--casts')?'Contact and rules measurements.':'Each entry played both sides in singles and doubles for up to 16 seconds.'));
