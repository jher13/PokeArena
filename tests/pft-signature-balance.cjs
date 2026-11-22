const assert=require('node:assert/strict');

module.exports=function checkSignatures(game,forms,resetSeed,showTable){
 const starByForm=new Map();
 for(const base of game.roster.flat()){
  starByForm.set(base,1);
  for(const branch of game.evolutionFamilies[base] ?? []){
   branch.forEach((name,i)=>starByForm.set(name,i+2));
  }
 }
 const teammates=['Geodude','Oddish','Pidgey'];
 const results=[];
 function trial(name,star,size,side){
  resetSeed(12+size);
  const teams=[game.makeTrainer('Left'),game.makeTrainer('Right')];
  const names=[name,...teammates.filter(other=>other!==name)].slice(0,size);
  for(const team of teams){
   team.units=names.map((species,i)=>({name:species,star:i?1:star,position:{x:2+i,y:4}}));
  }
  const units=game.battle(...teams);
  const candidate=units[side*size];
  // Identical teams and positioning isolate what the candidate's signature adds to its kit.
  units[(1-side)*size].move=null;
  for(let t=0;t<22000 && game.outcome(units)===null;t+=game.combatStepMs)game.tick(units,t);
  const health=enemy=>units.filter(unit=>unit.opponent===enemy).reduce((sum,unit)=>sum+unit.hp/unit.max,0)/size;
  const margin=(health(false)-health(true))*(side?-1:1);
  assert(Number.isFinite(margin),name);
  return {margin,cast:Boolean(candidate.lastCast)};
 }
 const allForms=new Set([...forms,...Object.keys(game.signatures),...Object.keys(game.expandedSignatures)]);
 for(const name of allForms){
  const star=starByForm.get(name) ?? 1;
  const row={name,star,casts:0};
  for(const [size,key] of [[1,'solo'],[3,'triples']]){
   const first=trial(name,star,size,0),second=trial(name,star,size,1);
   row[key]=+((first.margin+second.margin)/2).toFixed(3);
   row.casts+=Number(first.cast)+Number(second.cast);
  }
  assert(row.casts>0,name+' must release its signature in the test matches');
  results.push(row);
 }
 console.log(results.length+' PFT signatures cast across '+results.length*4+' mirrored solo and three-Pokémon trials.');
 if(showTable)console.table(results);
};
