import assert from 'node:assert/strict';
import {simulateOnline,onlineView,championCourse,journeyMatch} from '../supabase/functions/arena-combat/engine.js';

const names=['Mewtwo','Kyogre','Groudon','Rayquaza','Lugia','Ho-Oh'];
const id='74747474-0000-4000-8000-000000000001';
const entries={'pokemon-arena-team':JSON.stringify(names),'pokemon-arena-moves':JSON.stringify({Mewtwo:['Psystrike','Recover']}),
 'pokemon-arena-wild-progress':JSON.stringify({owned:Object.fromEntries(names.map(name=>[name,{level:80,xp:0}])),ai:{Mewtwo:{position:'Backline',style:'Defensive'}},held:{Mewtwo:'Shell Bell'},items:{'Shell Bell':1}})};
const seat=(uid,pokemon,substitute=false)=>({uid,pokemon,entries,substitute});
for(const mode of ['coop_mega','coop_mega_master']){
 const match={id,mode,format:1,host:'A',raid_seats:[seat('A','Mewtwo'),seat('B','Kyogre'),seat('A','Groudon',true)]};
 const advance=(state,n,command=null,side='host')=>simulateOnline(match,structuredClone(state),n,command,side).state;
 let state=advance(null,306);
 const v=state.arenaMap.flameVents;assert(v.until>state.clock);assert.equal(v.cycle,1);
 assert.throws(()=>advance(state,0,{raidFocus:{target:'left',cycle:0}}),/ended/);
 assert.throws(()=>advance(state,0,{raidFocus:{target:'left',cycle:1}},'raid:unknown'),/in the fight/);
 assert.throws(()=>advance(state,365,{raidFocus:{target:'right',cycle:1}}),/ended/);
 const focus=(state,side,target)=>advance(state,0,{raidFocus:{target,cycle:1}},side);
 const blast=structuredClone(state);blast.arenaMap.flameVents.until=blast.clock;
 blast.allies.forEach(p=>{p.hp=p.max;p.defendUntil=0;p.flinch=1;});
 const unsealed=advance(blast,1);
 blast.arenaMap.flameVents.left=1;const guarded=advance(blast,1);
 blast.arenaMap.flameVents.right=1;const canceled=advance(blast,1);
 const max=blast.allies[0].max;
 assert.equal(guarded.allies[0].hp-unsealed.allies[0].hp,Math.ceil(.18*max)-Math.ceil(.07*max));
 assert.equal(canceled.allies[0].hp-guarded.allies[0].hp,Math.ceil(.07*max));
 const none=advance(state,370);
 assert.equal(none.arenaMap.flameVents.outcome,0);
 const left=focus(state,'host','left'),one=advance(left,370);
 assert.equal(one.arenaMap.flameVents.outcome,1);
 const split=focus(left,'raid:B','right');
 assert.deepEqual(split.arenaMap.flameVents.calls,{host:'left','raid:B':'right'});
 assert.equal(split.arenaMap.flameVents.party,'right');
 // Compare the same combat instant with and without a third conscious participant.
 const probe=structuredClone(split);probe.casts=[];for(const p of probe.allies)Object.assign(p,{charge:0,attack:0,flinch:0,ailment:null,exhaustedUntil:0});
 const three=advance(probe,15);probe.allies[2].hp=0;const two=advance(probe,15);
 assert(three.arenaMap.flameVents.right>two.arenaMap.flameVents.right,'The substitute supports the latest party call');
 const partial=advance(split,30),mid=partial.arenaMap.flameVents;
 assert(mid.left>0 && mid.right>0);
 assert.deepEqual(onlineView(partial,'raid:B',mode).arenaMap.flameVents,mid);
 const both=advance(JSON.parse(JSON.stringify(partial)),340);
 assert.equal(both.arenaMap.flameVents.outcome,2);assert(both.arenaMap.flameVents.exposed>both.clock);
 assert.throws(()=>focus(both,'host','left'),/ended/);
}
for(const mode of ['coop_mega_2','coop_mega_3_master','unranked']){
 const m={id,mode,host:'A',format:1,host_pick:['Mewtwo'],guest_pick:['Groudon'],host_entries:entries,guest_entries:entries};
 assert.equal(simulateOnline(m,null,0,null,'host').state.arenaMap.flameVents,undefined);
}
const gauntlet={id,week:'2026-11-16',entries,kind:'champion',stage:0,hp:null};
const course=championCourse(gauntlet.week);assert.equal(new Set(course.map(g=>g.gym)).size,3);
assert.deepEqual(championCourse(gauntlet.week),course);assert.notDeepEqual(championCourse('2026-11-23'),course);
for(let stage=0;stage<3;stage++){
 const match=journeyMatch({...gauntlet,stage,prestige:stage===2,hp:[0,10,11,12,13,14]});
 assert.deepEqual(new Set(match.guest_pick),new Set(course[stage].roster));
 const state=simulateOnline(match,null,0,null,'host').state;
 assert.deepEqual(state.allies.map(p=>p.hp),[0,10,11,12,13,14]);
 if(stage===2)assert(state.enemies.every(p=>p.level===100));
 assert.equal(state.allies[0].heldItem,'Shell Bell');
}
const duel=journeyMatch({id,kind:'spar',entries,defense:entries});
const fresh=()=>simulateOnline(duel,null,0,null,'host').state;
const initial=fresh();assert([...initial.allies,...initial.enemies].every(a=>a.level===100));
assert.equal(initial.enemies[0].heldItem,'Shell Bell');assert.equal(initial.enemies[0].ai.position,'Backline');
assert.deepEqual(initial.enemies[0].moves.slice(0,2),['Psystrike','Recover']);
const single=simulateOnline(duel,fresh(),420,null,'host').state;
const part=simulateOnline(duel,fresh(),210,null,'host').state;
const resumed=simulateOnline(duel,JSON.parse(JSON.stringify(part)),210,null,'host').state;
assert.deepEqual(resumed.allies.map(a=>a.hp),single.allies.map(a=>a.hp));
assert.deepEqual(resumed.enemies.map(a=>a.hp),single.enemies.map(a=>a.hp));
console.log('Two-player Charizard vent calls, substitutes, missed calls, reconnects, three weekly teams, carried HP and level-100 saved-squad sparring passed.');

