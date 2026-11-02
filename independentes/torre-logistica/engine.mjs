// Torre Logística: quebra-cabeça de transferência de discos com pilhas ordenadas.
// Motor local e determinístico; BFS recomenda o caminho legal mais curto de qualquer estado.
export const TOWER_LEVELS=Object.freeze({
  recruta:Object.freeze({discs:3,maxMoves:32}),
  tatico:Object.freeze({discs:4,maxMoves:48}),
  veterano:Object.freeze({discs:5,maxMoves:80})
});
export const TOWER_MODES=Object.freeze(["transferencia","resgate"]);
function copyPegs(pegs){return pegs.map(peg=>peg.slice());}
function legal(pegs,from,to){
 if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||from>2||to<0||to>2||from===to)return false;
 const a=pegs[from],b=pegs[to];
 return a.length>0&&(!b.length||a.at(-1)<b.at(-1));
}
function changed(pegs,from,to){
 const next=copyPegs(pegs);
 next[to].push(next[from].pop());
 return next;
}
function snapshot(state){
 const {history,...saved}=state;
 return {...saved,pegs:copyPegs(saved.pegs)};
}
function goal(pegs,target,discs){return pegs[target].length===discs;}
function rng(seed){
 let x=(seed^0x9e3779b9)>>>0;
 return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};
}
export function createTower({mode="transferencia",difficulty="recruta",seed=0}={}){
 if(!TOWER_MODES.includes(mode)||!Object.hasOwn(TOWER_LEVELS,difficulty)||
    !Number.isSafeInteger(seed)||seed<0)throw new RangeError("Missão, nível ou semente inválida.");
 const {discs,maxMoves}=TOWER_LEVELS[difficulty],target=mode==="transferencia"?2:1;
 let pegs=[Array.from({length:discs},(_,i)=>discs-i),[],[]];
 const random=rng(seed);
 let previous=null;
 // A semente representa uma pane de logística: até três remanejamentos prévios.
 for(let t=0;t<(seed===0?0:1+seed%3);t++){
  let options=[];
  for(let from=0;from<3;from++)for(let to=0;to<3;to++)
   if(legal(pegs,from,to))options.push({from,to});
  const withoutReverse=options.filter(m=>!previous||m.from!==previous.to||m.to!==previous.from);
  if(withoutReverse.length)options=withoutReverse;
  const selected=options[random()%options.length];
  pegs=changed(pegs,selected.from,selected.to);previous=selected;
 }
 return {mode,difficulty,seed,discs,target,maxMoves,pegs,moves:0,paused:false,phase:"playing",
  history:[],notice:"Mova somente o disco do topo. Nunca coloque um disco maior sobre um menor."};
}
export function moveDisc(state,from,to){
 if(!state||state.phase!=="playing"||state.paused||!legal(state.pegs,from,to))return state;
 const pegs=changed(state.pegs,from,to);
 const moves=state.moves+1;
 const phase=goal(pegs,state.target,state.discs)?"won":moves>=state.maxMoves?"lost":"playing";
 const notice=phase==="won"?"Missão concluída! Todos os discos chegaram ao destino.":
  phase==="lost"?"Limite de manobras atingido. Reinicie para tentar outra rota.":
  "Disco movido. Planeje a próxima transferência.";
 return {...state,pegs,moves,phase,notice,history:[...state.history,snapshot(state)].slice(-80)};
}
export function toggleTowerPause(state){
 if(!state||state.phase!=="playing")return state;
 return {...state,paused:!state.paused,notice:state.paused?"Operação retomada.":"Operação pausada."};
}
export function undoTower(state){
 if(!state?.history?.length)return state;
 return {...snapshot(state.history.at(-1)),history:state.history.slice(0,-1),notice:"Última manobra desfeita."};
}
export function nextTowerHint(state){
 if(!state||state.phase!=="playing"||state.paused)return null;
 const start=copyPegs(state.pegs),seen=new Set([JSON.stringify(start)]);
 const queue=[{pegs:start,first:null}];
 for(let i=0;i<queue.length;i++){
  const node=queue[i];
  if(goal(node.pegs,state.target,state.discs))return node.first;
  for(let from=0;from<3;from++)for(let to=0;to<3;to++){
   if(!legal(node.pegs,from,to))continue;
   const next=changed(node.pegs,from,to),key=JSON.stringify(next);
   if(seen.has(key))continue;
   seen.add(key);
   queue.push({pegs:next,first:node.first??{from,to}});
  }
 }
 return null;
}
