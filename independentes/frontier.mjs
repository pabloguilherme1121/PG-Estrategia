/** Fronteira Orbital — jogo 4X compacto, determinístico e independente.
 * Exploração por névoa, colonização conectada, economia, pesquisa e facção rival.
 * Sem DOM, armazenamento, rede, animação ou timers.
 */
export const FRONTIER_DIFFICULTIES=Object.freeze(["recruta","tatico","veterano"]);
export const FRONTIER_MODES=Object.freeze(["expansao","pesquisa"]);
const PARAMETERS=Object.freeze({
 recruta:{turns:24,enemyEvery:4,enemyLimit:9,energy:10,ore:9},
 tatico:{turns:20,enemyEvery:3,enemyLimit:8,energy:9,ore:8},
 veterano:{turns:18,enemyEvery:2,enemyLimit:7,energy:8,ore:7},
});
const TERRAIN=Object.freeze(["mineral","solar","ruinas","planicie"]);
const validCell=cell=>Number.isInteger(cell)&&cell>=0&&cell<16;
const adjacent=cell=>{
 const row=Math.floor(cell/4),col=cell%4;
 return [[row-1,col],[row+1,col],[row,col-1],[row,col+1]]
  .filter(([r,c])=>r>=0&&r<4&&c>=0&&c<4).map(([r,c])=>r*4+c);
};
export function createFrontier({difficulty="recruta",mission="expansao",seed=1}={}){
 if(!FRONTIER_DIFFICULTIES.includes(difficulty)||!FRONTIER_MODES.includes(mission)||!Number.isSafeInteger(seed))throw new RangeError("Dificuldade, operação ou semente inválida");
 const config=PARAMETERS[difficulty];let x=seed>>>0||1;
 const terrain=Array.from({length:16},(_,cell)=>{
  if(cell===0)return "base";
  if(cell===15)return "rival";
  x^=x<<13;x^=x>>>17;x^=x<<5;
  return TERRAIN[(x>>>0)%TERRAIN.length];
 });
 const owners=Array(16).fill(0);owners[0]=1;owners[15]=2;
 const visible=Array(16).fill(false);visible[0]=true;
 return {mode:difficulty,mission,seed,terrain,owners,visible,turn:0,
  maxTurns:config.turns,energy:config.energy,ore:config.ore,science:0,
  phase:"playing",paused:false,score:0,enemyEvery:config.enemyEvery,
  message:"Explore os setores vizinhos, construa colônias e escolha sua condição de vitória."};
}
export function canFrontierAction(s,a){
 if(!s||s.phase!=="playing"||!a||typeof a!=="object")return false;
 if(a.type==="pause")return !s.paused;
 if(a.type==="resume")return s.paused;
 if(s.paused)return false;
 if(a.type==="research")return s.ore>=2&&s.energy>=2&&s.owners.filter(o=>o===1).length>=2;
 if(a.type==="extract")return s.ore<30||s.energy<30;
 if(!validCell(a.cell)||s.owners[a.cell]!==0)return false;
 if(a.type==="scout")return !s.visible[a.cell]&&s.energy>=1&&adjacent(a.cell).some(c=>s.visible[c]);
 if(a.type==="colonize")return s.visible[a.cell]&&s.ore>=2&&s.energy>=2&&adjacent(a.cell).some(c=>s.owners[c]===1);
 return false;
}
function rivalTurn(s){
 if(s.turn%s.enemyEvery!==0)return s.owners;
 const copy=[...s.owners],candidates=new Set();
 for(let cell=0;cell<16;cell++)if(copy[cell]===2)for(const n of adjacent(cell))if(copy[n]===0)candidates.add(n);
 const next=[...candidates].sort((a,b)=>a-b)[0];
 if(next!==undefined)copy[next]=2;
 return copy;
}
function finishTurn(s,message){
 const count=s.owners.filter(o=>o===1).length;
 const won=s.mission==="expansao"?count>=5:s.science>=12;
 const completed={...s,turn:s.turn+1,energy:Math.min(30,s.energy+1),ore:Math.min(30,s.ore+1)};
 if(won)return {...completed,phase:"won",score:700+completed.science*70+count*100+
  (completed.maxTurns-completed.turn)*20,message:"Vitória! Sua estratégia orbital foi concluída."};
 completed.owners=rivalTurn(completed);
 const enemyCount=completed.owners.filter(o=>o===2).length;
 const lost=completed.turn>=completed.maxTurns||enemyCount>=PARAMETERS[completed.mode].enemyLimit;
 return {...completed,phase:lost?"lost":"playing",
  message:lost?"Derrota: a facção rival dominou o espaço ou o prazo terminou.":message};
}
export function commandFrontier(s,a){
 if(!canFrontierAction(s,a))return s;
 if(a.type==="pause")return {...s,paused:true,message:"Campanha orbital pausada."};
 if(a.type==="resume")return {...s,paused:false,message:"Campanha orbital retomada."};
 if(a.type==="scout"){
  const visible=[...s.visible];visible[a.cell]=true;
  return finishTurn({...s,visible,energy:s.energy-1},"Setor "+(a.cell+1)+" explorado: "+s.terrain[a.cell]+".");
 }
 if(a.type==="colonize"){
  const owners=[...s.owners];owners[a.cell]=1;
  const type=s.terrain[a.cell];
  return finishTurn({...s,owners,energy:s.energy-2+(type==="solar"?2:0),
   ore:s.ore-2+(type==="mineral"?2:0),science:s.science+(type==="ruinas"?2:0)},
   "Colônia estabelecida no setor "+(a.cell+1)+". Energia, minério e ciência atualizados.");
 }
 if(a.type==="research")return finishTurn({...s,energy:s.energy-2,ore:s.ore-2,science:s.science+3},
  "Pesquisa concluída. +3 pontos de ciência.");
 return finishTurn({...s,energy:Math.min(30,s.energy+3),ore:Math.min(30,s.ore+3)},
  "Recursos extraídos. +3 energia e +3 minério.");
}
