const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const lib=read('supabase/functions/arena-combat/engine.js').replace(/^export /gm,'');
const ui=read('arena-journey.js'),browser=vm.createContext({structuredClone,console,assert});
vm.runInContext(lib,browser);
vm.runInContext(`
 class MenuNode{
  constructor(text=''){this.textContent=text;this.children=[];this.classList={remove(){},add(){}};this.style={};this.isConnected=true;}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(){}
  get childElementCount(){return this.children.length;}
 }
 element=(tag,text)=>new MenuNode(text);
 const store=new Map();sessionStorage.setItem=(k,v)=>store.set(k,v);sessionStorage.getItem=k=>store.get(k)??null;sessionStorage.removeItem=k=>store.delete(k);
 document.getElementById=id=>{if(!menuNodes.has(id))menuNodes.set(id,new MenuNode());return menuNodes.get(id);};
 const menuNodes=new Map();const noop=()=>{};
 const counts={ev:0,pass:0,evo:0,loss:0,badge:0};
 awardKnockoutEVs=()=>counts.ev++;recordArenaEvolutionBattle=()=>counts.evo++;recordBattlePass=()=>{counts.pass++;return '';};
 applyDefeatRewards=()=>{counts.loss++;return '';};awardBadge=()=>{counts.badge++;return false;};
 renderBattleRosters=renderControls=startBattleMusic=playEvolutionScenes=showScreen=cancelWildRepeat=refreshBerriesAfterKnockout=
 sendNextTrainerReserve=advanceBattleSwitches=advanceCombat=noop;
 awaitingPlayerReserve=()=>false;combatSides=()=>[allies.filter(p=>p.hp>0),enemies.filter(p=>p.hp>0)];
 openMenu=()=>{phase='home';selectedGym=selectedTrainer=selectedWild=null;window.ArenaJourney.home();};
 team.splice(0,team.length,'Pikachu');wildProgress.owned.Pikachu={level:12,xp:0};wildProgress.items['Shell Bell']=1;
 clearedGyms.splice(0,clearedGyms.length,gymTeams[0].id);
 const findButton=(n,label)=>n.textContent===label?n:n.children.map(c=>findButton(c,label)).find(Boolean);
 `,browser);
vm.runInContext(ui,browser);
vm.runInContext(`
 const j=window.ArenaJourney;openBattle(gymTeams[0]);
 const enemyInitial=JSON.stringify(enemies),mapInitial=JSON.stringify(arenaMap);
 const first=enemies[0];first.hp=Math.floor(first.hp/2);
 j.hazardHit('Pikachu','Stealth Rock',7);
 allies.forEach(p=>p.hp=0);advance(0);
 assert.equal(phase,'home');assert.equal(counts.loss,1);
 assert(findButton(byId('journey-home'),'Practice same fight'));
 const receipt=JSON.stringify(counts);
 wildProgress.held.Pikachu='Shell Bell';
 findButton(byId('journey-home'),'Practice same fight').onclick();
 assert(j.isPractice());assert.equal(JSON.stringify(enemies),enemyInitial);assert.equal(JSON.stringify(arenaMap),mapInitial);
 assert.equal(allies[0].heldItem,'Shell Bell');
 enemies.forEach(p=>p.hp=0);advance(0);
 assert.equal(JSON.stringify(counts),receipt);assert.equal(wildProgress.campaign.journey.winsAfterEdit,1);
 `,browser);
// Reload the client component and recover the exact same opponent after a trip to PC.
vm.runInContext(ui,browser);
vm.runInContext(`
 window.ArenaJourney.home();findButton(byId('journey-home'),'Practice same fight').onclick();
 assert.equal(JSON.stringify(enemies),enemyInitial);assert.equal(JSON.stringify(arenaMap),mapInitial);
 assert(window.ArenaJourney.isPractice());openMenu();openBattle(gymTeams[0]);
 assert.equal(window.ArenaJourney.isPractice(),false);
 `,browser);
console.log('Gym practice restores the original enemies and map, uses edited gear, survives a reload and skips KO EVs, Battle Pass, evolution credit and badge rewards.');

