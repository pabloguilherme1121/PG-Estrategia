// Pontes do Arquipélago: construção de rede com orçamento e redundância.
// Motor independente de roteamento: não simula trânsito, produção ou leilões.
export const BRIDGE_LEVELS=Object.freeze({
  recruta:Object.freeze({islands:5}),
  tatico:Object.freeze({islands:7}),
  veterano:Object.freeze({islands:9})
});
export const BRIDGE_MODES=Object.freeze(["conexao","redundancia"]);
function random(seed){
 let x=(seed>>>0)^0x9e3779b9;
 return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return x>>>0;};
}
function snapshot(state){
 const {history,...rest}=state;
 return {...rest,selected:rest.selected.slice()};
}
function connected(islands,edges,selected,omit=null){
 const set=new Set(selected);
 const graph=Array.from({length:islands.length},()=>[]);
 for(const e of edges){
  if(!set.has(e.id)||e.id===omit)continue;
  graph[e.a].push(e.b);
  graph[e.b].push(e.a);
 }
 const visited=new Set([0]),queue=[0];
 for(let i=0;i<queue.length;i++)for(const n of graph[queue[i]])
  if(!visited.has(n)){visited.add(n);queue.push(n);}
 return visited.size===islands.length;
}
export function networkComplete(state,selected=state.selected){
 if(!connected(state.islands,state.edges,selected))return false;
 return state.mode==="conexao"||selected.every(id=>connected(state.islands,state.edges,selected,id));
}
export function createBridges({mode="conexao",difficulty="recruta",seed=0}={}){
 if(!BRIDGE_MODES.includes(mode)||!Object.hasOwn(BRIDGE_LEVELS,difficulty)||
    !Number.isSafeInteger(seed)||seed<0)throw new RangeError("Configuração inválida.");
 const count=BRIDGE_LEVELS[difficulty].islands,rand=random(seed);
 const islands=Array.from({length:count},(_,i)=>({
  id:i,name:"Ilha "+(i+1),
  x:50+37*Math.cos(-Math.PI/2+2*Math.PI*i/count),
  y:50+37*Math.sin(-Math.PI/2+2*Math.PI*i/count)
 }));
 const edges=[];
 for(let i=0;i<count;i++){
  edges.push({id:"r"+i,a:i,b:(i+1)%count,cost:2+rand()%3,ring:true});
 }
 for(let i=0;i<count;i++){
  const a=i,b=(i+2)%count;
  edges.push({id:"c"+i,a,b,cost:2+rand()%4,ring:false});
 }
 const cost=edges.filter(e=>e.ring).reduce((sum,e)=>sum+e.cost,0);
 const budget=cost+Math.floor(count/3);
 return {mode,difficulty,seed,islands,edges,budget,spent:0,moves:0,
  maxMoves:count*3,selected:[],paused:false,phase:"playing",history:[],
  notice:"Construa pontes entre ilhas. Todas as partidas têm uma solução dentro do orçamento."};
}
export function toggleBridge(state,id){
 if(!state||state.phase!=="playing"||state.paused||typeof id!=="string")return state;
 const edge=state.edges.find(e=>e.id===id);
 if(!edge)return state;
 const present=state.selected.includes(id);
 if(!present&&state.spent+edge.cost>state.budget)return state;
 const selected=present?state.selected.filter(x=>x!==id):[...state.selected,id].sort();
 const spent=state.spent+(present?-edge.cost:edge.cost);
 const moves=state.moves+1;
 const candidate={...state,selected,spent,moves,
  history:[...state.history,snapshot(state)].slice(-state.maxMoves)};
 const won=networkComplete(candidate);
 const phase=won?"won":moves>=state.maxMoves?"lost":"playing";
 return {...candidate,phase,notice:won?"Vitória! A rede atingiu a meta da missão.":
  phase==="lost"?"Derrota: limite de construção e revisão atingido.":
  (present?"Ponte removida; créditos recuperados.":"Ponte construída; confira conexões e orçamento.")};
}
export function toggleBridgePause(state){
 if(!state||state.phase!=="playing")return state;
 return {...state,paused:!state.paused,notice:state.paused?"Operação retomada.":"Operação pausada."};
}
export function undoBridge(state){
 if(!state?.history?.length)return state;
 return {...snapshot(state.history.at(-1)),history:state.history.slice(0,-1),
  notice:"Última alteração desfeita."};
}
export function nextBridgeHint(state){
 if(!state||state.phase!=="playing"||state.paused)return null;
 return state.edges.find(e=>e.ring&&!state.selected.includes(e.id)&&state.spent+e.cost<=state.budget)?.id??null;
}
