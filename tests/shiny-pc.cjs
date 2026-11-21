const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const additions=`
export {individualBaseStats,calculatedStats,personalityTrait,personalityBonus,applyTrainingItem,listedMoveAccuracy,categoryForMove,skillDescription,drawShinySparkles,onlineActor,unit};
export function sourceRows(){
 return Object.keys(moveCatalog).filter(name=>name!=='Normal Attack' && name!=='Struggle')
  .sort().map(name=>[name,categoryForMove(name),listedMoveAccuracy(name)]);
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
 console.log('Shiny and personality stats, legacy IV training, PC sort order, animated sparkles and 846 move categories, accuracy values and descriptions passed.');
})().catch(error=>{console.error(String(error),error.stack?.split('\n').filter(line=>!line.includes('data:text')).slice(-6).join('\n'));process.exitCode=1;});
