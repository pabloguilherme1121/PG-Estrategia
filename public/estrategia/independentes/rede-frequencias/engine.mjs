// Rede de Frequências: alocação de canais sem interferência em um grafo.
// Motor independente. A campanha de 150 missões não é contabilizada como novos motores.
export const FREQUENCY_DIFFICULTIES = Object.freeze({
  recruta: Object.freeze({nodes:6, maxMoves:18, density:0.42}),
  tatico: Object.freeze({nodes:8, maxMoves:24, density:0.49}),
  veterano: Object.freeze({nodes:11, maxMoves:33, density:0.55}),
});
export const FREQUENCY_MODES = Object.freeze(["distribuir","economizar"]);
const LABELS=["Farol","Centro","Porto","Serra","Mata","Vale","Lago","Norte","Sul","Leste","Oeste"];

function makeRng(seed) {
  let value = (seed ^ 0x9e3779b9) >>> 0;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return (value >>> 0) / 4294967296;
  };
}
function makeEdges(seed, count, channels, density) {
  const random=makeRng(seed);
  const keys=new Set();
  const put=(a,b)=>keys.add(Math.min(a,b)+":"+Math.max(a,b));
  // A chain ensures the graph is connected. Its endpoints use different groups.
  for(let i=1;i<count;i++) put(i-1,i);
  // Three-channel mode includes a triangle and cannot be solved with only two.
  if(channels===3) put(0,2);
  for(let a=0;a<count;a++) for(let b=a+1;b<count;b++) {
    if(a%channels!==b%channels && random()<density) put(a,b);
  }
  return [...keys].map(key=>key.split(":").map(Number))
    .sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
}
function snapshot(state) {
  const {history,...saved}=state;
  return {...saved,slots:saved.slots.slice()};
}
function conflicts(edges,slots,node,channel) {
  return edges.some(([a,b])=>(a===node&&slots[b]===channel)||(b===node&&slots[a]===channel));
}
function canAct(state) {
  return Boolean(state && state.phase==="playing" && !state.paused && state.moves<state.maxMoves);
}
export function createFrequencyNetwork({mode="distribuir",difficulty="recruta",seed=0}={}) {
  if(!FREQUENCY_MODES.includes(mode) || !Object.hasOwn(FREQUENCY_DIFFICULTIES,difficulty)
    || !Number.isSafeInteger(seed) || seed<0 || seed>999999999)
    throw new RangeError("Modo, dificuldade ou semente inválidos.");
  const rules=FREQUENCY_DIFFICULTIES[difficulty];
  const channels=mode==="economizar"?2:3;
  return {
    mode,difficulty,seed,channels,
    nodes:LABELS.slice(0,rules.nodes),edges:makeEdges(seed,rules.nodes,channels,rules.density),
    slots:Array(rules.nodes).fill(null),moves:0,maxMoves:rules.maxMoves,
    paused:false,phase:"playing",score:0,history:[],
    message:"Escolha um canal e atribua a uma estação. Vizinhas não podem compartilhar o mesmo canal.",
  };
}
export function assignFrequency(state,node,channel) {
  if(!canAct(state) || !Number.isInteger(node) || node<0 || node>=state.slots.length
    || !Number.isInteger(channel) || channel<0 || channel>=state.channels
    || state.slots[node]===channel || conflicts(state.edges,state.slots,node,channel)) return state;
  const slots=state.slots.slice();
  slots[node]=channel;
  const moves=state.moves+1;
  const won=slots.every(v=>v!==null);
  const phase=won?"won":moves>=state.maxMoves?"lost":"playing";
  const score=won?(state.maxMoves-moves)*5+slots.length*25:0;
  const message=won?"Rede configurada! Nenhuma interferência. Vitória.":
    phase==="lost"?"O limite de alterações foi atingido. Tente outra distribuição.":
      state.nodes[node]+" configurado no canal "+(channel+1)+".";
  return {...state,slots,moves,phase,score,message,
    history:[...state.history,snapshot(state)].slice(-state.maxMoves)};
}
export function clearFrequency(state,node) {
  if(!canAct(state)||!Number.isInteger(node)||node<0||node>=state.slots.length
    ||state.slots[node]===null) return state;
  const slots=state.slots.slice();
  slots[node]=null;
  const moves=state.moves+1;
  const phase=moves>=state.maxMoves?"lost":"playing";
  return {...state,slots,moves,phase,message:phase==="lost"
    ?"Limite de alterações atingido.":"Canal removido de "+state.nodes[node]+".",
    history:[...state.history,snapshot(state)].slice(-state.maxMoves)};
}
export function toggleFrequencyPause(state) {
  if(!state||state.phase!=="playing") return state;
  return {...state,paused:!state.paused,
    message:state.paused?"Partida retomada.":"Partida pausada."};
}
export function undoFrequency(state) {
  if(!state?.history?.length||state.paused) return state;
  return {...snapshot(state.history.at(-1)),history:state.history.slice(0,-1),
    message:"Última alteração desfeita."};
}
// Finds a completion consistent with every existing assignment, not a greedy
// color that could make a still-solvable network impossible to finish.
export function getFrequencyHint(state) {
  if(!canAct(state)) return null;
  const slots=state.slots.slice();
  const neighbours=slots.map((_,i)=>state.edges.flatMap(([a,b])=>
    a===i?[b]:b===i?[a]:[]));
  const solve=()=>{
    let node=-1, options=null;
    for(let i=0;i<slots.length;i++){
      if(slots[i]!==null)continue;
      const valid=[];
      for(let color=0;color<state.channels;color++)
        if(!neighbours[i].some(other=>slots[other]===color))valid.push(color);
      if(!valid.length)return false;
      if(node<0 || valid.length<options.length ||
        (valid.length===options.length && neighbours[i].length>neighbours[node].length)){
        node=i;options=valid;
      }
    }
    if(node<0)return true;
    for(const color of options){
      slots[node]=color;
      if(solve())return true;
    }
    slots[node]=null;
    return false;
  };
  if(!solve())return null;
  const next=state.slots.findIndex(slot=>slot===null);
  return next<0?null:{node:next,channel:slots[next]};
}
