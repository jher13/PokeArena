const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const additions=`
export {cappedOwnedProfile,validProfile,personalityIdOf,breedProfile,battleSpeedFactor,addCaughtPokemon,individualBaseStats,calculatedStats,personalityTrait,personalityBonus,applyTrainingItem,listedMoveAccuracy,categoryForMove,skillDescription,drawShinySparkles,onlineActor,unit};
export function sourceRows(){
 return Object.keys(moveCatalog).filter(name=>name!=='Normal Attack' && name!=='Struggle')
  .sort().map(name=>[name,categoryForMove(name),listedMoveAccuracy(name)]);
}
export function caughtProfile(name){
 return {active:profiles[dex[name][0]],copies:wildProgress.copies[name]};
}
export function sortBox(sort,order,includeCopies){
 const list=['Bulbasaur','Pikachu','Mewtwo','Mew','Caterpie'];
 for(const [i,name] of list.entries()){
  wildProgress.owned[name]={level:1,xp:0};
  profiles[dex[name][0]]={pid:0,ivs:Array(6).fill(0),evs:Array(6).fill(0),shiny:i===4};
 }
 wildProgress.copies.Mewtwo=[{level:5,profile:{...profiles[150],shiny:true}}];
 return pcCandidates(list,'',0,id=>({value:id==='pc-sort'?sort:id==='pc-order'?order:''}),includeCopies);
}
`;
(async()=>{
 const built=read('supabase/functions/arena-combat/engine.js');
 const game=await import('data:text/javascript;base64,'+Buffer.from(built+additions).toString('base64'));
 const profile={pid:23,ivs:[31,0,0,0,0,0],evs:[0,0,0,0,0,0]};
 const shiny={...profile,shiny:true};
 for(const level of [1,10,11,50,91,100]){
  const base=[106,110,90,130,90,154],bonus=2*Math.ceil(level/10);
  for(const [p,scale] of [[profile,1],[shiny,1.25]]){
   assert.deepEqual(game.individualBaseStats('Mewtwo',p),base.map(stat=>stat*scale));
   const expected=base.map((b,i)=>{
    const points=Math.floor((2*b*scale+p.ivs[i])*level/100);
    return i===0?points+level+10+bonus:Math.floor((points+5)*(i===3?110:i===4?90:100)/100);
   });
   const local=game.unit('Mewtwo',0,0,true,level,{profile:p,moves:['Recover']});
   const online=game.onlineActor('Mewtwo',{},'host',0,undefined,undefined,null,{level,profile:p,moves:['Recover']});
   assert.deepEqual(game.calculatedStats('Mewtwo',p,level),expected);
   assert.deepEqual(local.stats,expected);assert.deepEqual(online.stats,expected);
   assert.equal(Boolean(online.shiny),Boolean(p.shiny));
  }
 }
 assert.equal(game.calculatedStats('Shedinja',shiny,100)[0],1);
 for(let id=0;id<30;id++){
  const p={...profile,personalityId:id},stat=Math.floor(id/5),rival=(stat+1)%6;
  const tier=id%5+1;
  assert.equal(game.personalityTrait(p).tier,tier);
  for(const level of [1,9,10,11,19,20,21,90,91,99,100]){
   const blocks=Math.ceil(level/10);
   const old=game.calculatedStats('Mewtwo',{...p,personalityId:rival*5},level);
   const now=game.calculatedStats('Mewtwo',p,level);
   assert.deepEqual(now.map((n,i)=>n-old[i]),old.map((_,i)=>i===stat?tier*blocks:i===rival?-blocks:0));
   assert.deepEqual(game.onlineActor('Mewtwo',{},'host',0,undefined,undefined,null,{level,profile:p,moves:['Recover']}).stats,now);
  }
 }
 const legacy={pid:0,ivs:[0,0,0,0,0,30],evs:[0,0,0,0,0,0]};
 const original=game.personalityTrait(legacy);
 for(let i=0;i<6;i++)for(let j=legacy.ivs[i];j<31;j++)game.applyTrainingItem(legacy,i,{field:'ivs',delta:1});
 assert.deepEqual(game.personalityTrait(JSON.parse(JSON.stringify(legacy))),original);
 assert.equal(legacy.personalityId,25);
 const total=p=>p.ivs.reduce((sum,value)=>sum+value,0);
 assert.equal(total(legacy),93);
 const budget={...profile,ivs:[31,31,30,0,0,0]};
 assert.equal(game.applyTrainingItem(budget,3,{field:'ivs',delta:10}),1);
 assert.equal(game.applyTrainingItem(budget,4,{field:'ivs',delta:1}),0);
 assert.equal(game.applyTrainingItem(budget,0,{field:'ivs',delta:-1}),-1);
 assert.equal(game.applyTrainingItem(budget,4,{field:'ivs',delta:1}),1);
 assert.deepEqual(budget.ivs,[30,31,30,1,1,0]);
 for(const ivs of [[0,0,0,0,0,0],[31,31,30,0,0,0],[31,31,31,0,0,0]]) {
  const p={...profile,ivs};assert.strictEqual(game.cappedOwnedProfile(p),p);
 }
 const spreads=new Set();
 for(const pid of [...Array(2048).keys(),2147483646,2147483647,4294967295]){
  const p={pid,ivs:[31,30,29,28,27,26],evs:[4,0,0,252,0,252],shiny:true,abilityOverride:'Pressure'};
  if(pid%2)p.personalityId=17;
  const old=structuredClone(p);assert(!game.validProfile(p));
  const fixed=game.cappedOwnedProfile(p);assert.deepEqual(p,old);
  assert.equal(total(fixed),93);assert(game.validProfile(fixed));
  assert.deepEqual(fixed,{...p,ivs:fixed.ivs,personalityId:game.personalityIdOf(p)});
  assert.strictEqual(game.cappedOwnedProfile(fixed),fixed);
  assert.deepEqual(game.cappedOwnedProfile(structuredClone(p)),fixed);spreads.add(fixed.ivs.join(','));
 }
 assert(spreads.size>2000);
 const imported={...shiny,ivs:Array(6).fill(31)},converted=game.cappedOwnedProfile(imported);
 game.addCaughtPokemon('Volcanion',50,imported);game.addCaughtPokemon('Volcanion',40,{...imported,pid:19});
 const captures=game.caughtProfile('Volcanion');assert.deepEqual(captures.active,converted);
 assert.deepEqual(captures.copies[0].profile,game.cappedOwnedProfile({...imported,pid:19}));
 for(const side of ['host','guest','raid:guest']){
  const actor=game.onlineActor('Mewtwo',{},side,0,undefined,100,null,{profile:imported,moves:['Psystrike']});
  assert.deepEqual(actor.profile,converted);
 }
 const npc=game.onlineActor('Mewtwo',{},'guest',0,undefined,100,null,{profile:imported,moves:['Psystrike']},null,false);
 assert.deepEqual(npc.profile,imported);
 const parent={...profile,ivs:[31,31,31,0,0,0]},other={...profile,ivs:[0,0,0,31,31,31]};
 for(let i=0;i<500;i++){
  const child=game.breedProfile(parent,other);
  assert(game.validProfile(child));assert(child.ivs.filter((iv,stat)=>iv===parent.ivs[stat] || iv===other.ivs[stat]).length>=3);
 }
 const pace=game.battleSpeedFactor;
 for(const v of [0,100,209,210])assert.equal(pace(v),Math.min(1.7,0.65+v/200));
 for(const [v,expected] of [[270,1.85],[330,1.9]])assert(Math.abs(pace(v)-expected)<1e-12);
 assert(pace(1500)>pace(330) && pace(1500)<2);
 assert(pace(270)-pace(210)>pace(330)-pace(270));
 const slow=game.unit('Mewtwo',0,0,true,75,{profile,moves:['Recover']});
 const fast=game.unit('Mewtwo',0,0,true,100,{profile,moves:['Recover']});
 const ratio=pace(fast.stats[3])/pace(slow.stats[3]);
 assert(fast.stats[3]>210 && fast.pace>slow.pace);
 assert(Math.abs(fast.pace/slow.pace-ratio)<1e-12 && Math.abs(slow.cooldown/fast.cooldown-ratio)<1e-12);
 assert.deepEqual(fast.moveCooldowns,slow.moveCooldowns);
 const onlineFast=game.onlineActor('Mewtwo',{},'host',0,undefined,100,null,{profile,moves:['Recover']});
 assert.equal(onlineFast.pace,fast.pace);assert.equal(onlineFast.cooldown,fast.cooldown);

 assert.deepEqual(game.sortBox('shiny','asc',true).slice(0,2),['Caterpie','Mewtwo']);
 assert.deepEqual(game.sortBox('shiny','desc',true).slice(-2),['Caterpie','Mewtwo']);
 assert.deepEqual(game.sortBox('shiny','asc',false).slice(0,2),['Caterpie','Bulbasaur']);
 assert.deepEqual(game.sortBox('legendary','asc',true).slice(0,2),['Mewtwo','Mew']);
 assert.deepEqual(game.sortBox('legendary','desc',true).slice(-2),['Mewtwo','Mew']);
 const rows=game.sourceRows();assert.equal(rows.length,846);
 // Pokémon Database move/all snapshot: normalized Arena name, category and listed accuracy.
 assert.equal(createHash('sha256').update(JSON.stringify(rows)).digest('hex'),'0f38f0c06475c6f64dcac655e95f91f4fe5feebbce00686684091b7e459923c6');
 for(const [name,category,accuracy] of rows){
  assert(['Physical','Special','Status'].includes(category),name);
  assert(/^(\d+%|∞|—)$/.test(accuracy),name);
  const description=game.skillDescription(name);
  assert(description.length>12 && !/undefined|NaN/.test(description),name+' '+description);
 }
 for(const [name,regex] of [['Thunder',/paralysis|paraly/i],['Hyper Beam',/2 battle seconds/],['Hurricane',/roams/],['Explosion',/charging/],['Bullet Seed',/two to five/],['Recover',/restores/i]])assert.match(game.skillDescription(name),regex,name);
 // Fixed damage retains its actual listed category.
 assert.equal(game.categoryForMove('Seismic Toss'),'Physical');assert.equal(game.categoryForMove('Dragon Rage'),'Special');
 function sparkle(seconds){
  const rects=[],ctx={globalAlpha:1,save(){},restore(){},fillRect(...args){rects.push([this.fillStyle,this.globalAlpha,...args]);}};
  game.drawShinySparkles(ctx,0,0,40,40,seconds,150);return rects;
 }
 assert(sparkle(0).length>0);assert.notDeepEqual(sparkle(0),sparkle(.5));
 for(const name of ['physical','special','status']){
  const file=fs.readFileSync(path.join(root,'assets','move-'+name+'.png'));
  assert.equal(file.subarray(1,4).toString(),'PNG');assert.equal(file.readUInt32BE(16),60);assert.equal(file.readUInt32BE(20),40);
 }
 console.log('Full IV budget, 2,051 migration rolls, captures, hatching, Speed scaling, shiny and personality stats, legacy IV training, PC sort order, animated sparkles and 846 move categories, accuracy values and descriptions passed.');
})().catch(error=>{console.error(String(error),error.stack?.split('\n').filter(line=>!line.includes('data:text')).slice(-6).join('\n'));process.exitCode=1;});
