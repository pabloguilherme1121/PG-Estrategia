// Espelhos de Sinal: puzzle de reflexão de feixes com dois circuitos possíveis.
// O traçado, e não uma correspondência pré-programada, define a vitória.
export const MIRROR_MODES=Object.freeze(["simples","duplo"]);
export const MIRROR_LEVELS=Object.freeze({
  recruta:Object.freeze({size:4,maxMoves:12,decoys:1}),
  tatico:Object.freeze({size:5,maxMoves:16,decoys:2}),
  veterano:Object.freeze({size:6,maxMoves:20,decoys:4}),
});
const REFLECTIONS={
  "/":[1,0,3,2],
  "\\":[3,2,1,0],
};
const VECTORS=[[0,-1],[1,0],[0,1],[-1,0]];
function random(seed){
  let x=(seed^0xa6c81745)>>>0;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
}
function snapshot(state){
  const {history,...core}=state;
  return {...core,mirrors:state.mirrors.map(m=>({...m}))};
}
export function createMirrorGame({mode="simples",difficulty="recruta",seed=0}={}){
  if(!MIRROR_MODES.includes(mode)||!Object.hasOwn(MIRROR_LEVELS,difficulty)
    ||!Number.isSafeInteger(seed)||seed<0||seed>999999999)
    throw new RangeError("Modo, dificuldade ou semente inválidos.");
  const rules=MIRROR_LEVELS[difficulty],size=rules.size,rng=random(seed);
  const routes=mode==="duplo"?
    [{from:0,to:1,row:1},{from:size-1,to:size-2,row:size-2}]:
    [{from:0,to:size-1,row:1+(seed%(size-2))}];
  const mirrors=[],blocked=new Set();
  for(const route of routes){
    const slash=route.to>route.from?"\\":"/";
    for(let row=0;row<=route.row;row++)blocked.add(row*size+route.from);
    for(let col=Math.min(route.from,route.to);col<=Math.max(route.from,route.to);col++)
      blocked.add(route.row*size+col);
    for(let row=route.row;row<size;row++)blocked.add(row*size+route.to);
    for(const col of [route.from,route.to]){
      const cell=route.row*size+col;
      mirrors.push({cell,slant:rng()<.5?slash:(slash==="/"?"\\":"/"),
        solution:slash,critical:true});
    }
  }
  // At least one turn is needed even for the easiest seed.
  if(mirrors.every(m=>m.slant===m.solution))mirrors[0].slant=mirrors[0].solution==="/"?"\\":"/";
  const candidates=[];
  for(let i=0;i<size*size;i++)if(!blocked.has(i))candidates.push(i);
  for(let i=candidates.length-1;i>0;i--){
    const j=Math.floor(rng()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];
  }
  for(const cell of candidates.slice(0,rules.decoys))
    mirrors.push({cell,slant:rng()<.5?"/":"\\",solution:null,critical:false});
  mirrors.sort((a,b)=>a.cell-b.cell);
  return {mode,difficulty,seed,size,maxMoves:rules.maxMoves,moves:0,
    emitters:routes.map(route=>route.from),targets:routes.map(route=>route.to),
    mirrors,paused:false,phase:"playing",score:0,history:[],
    message:"Gire os refletores para conduzir cada feixe ao receptor na base."};
}
export function traceSignals(state){
  const {size}=state;
  const reflectors=new Map(state.mirrors.map(m=>[m.cell,m.slant]));
  const paths=[],hits=[];
  for(let i=0;i<state.emitters.length;i++){
    let x=state.emitters[i],y=-1,direction=2,reached=false;
    const path=[],visited=new Set();
    for(let step=0;step<size*size*4;step++){
      const [dx,dy]=VECTORS[direction];x+=dx;y+=dy;
      if(x<0||x>=size||y<0||y>=size){
        reached=y===size&&x===state.targets[i];
        break;
      }
      const cell=y*size+x,key=cell+":"+direction;
      if(visited.has(key))break;
      visited.add(key);path.push(cell);
      const mirror=reflectors.get(cell);
      if(mirror)direction=REFLECTIONS[mirror][direction];
    }
    paths.push(path);hits.push(reached);
  }
  return {paths,hits,reached:hits.filter(Boolean).length};
}
export function rotateMirror(state,cell){
  if(!state||state.phase!=="playing"||state.paused||!Number.isInteger(cell))return state;
  const i=state.mirrors.findIndex(m=>m.cell===cell);
  if(i<0)return state;
  const mirrors=state.mirrors.map((m,k)=>k===i?
    {...m,slant:m.slant==="/"?"\\":"/"}:{...m});
  const moves=state.moves+1;
  const result={...state,mirrors,moves,history:[...state.history,snapshot(state)].slice(-state.maxMoves)};
  const reached=traceSignals(result).reached;
  const phase=reached===state.targets.length?"won":moves>=state.maxMoves?"lost":"playing";
  return {...result,phase,score:phase==="won"?
    Math.max(10,500+state.targets.length*100+state.size*20-moves*20):0,
    message:phase==="won"?"Sinais recebidos! Todos os feixes chegaram aos destinos.":
      phase==="lost"?"Sem rota dentro do limite de giros. Tente novamente.":
        "Espelho girado. "+reached+" de "+state.targets.length+" receptores ativos."};
}
export function toggleMirrorPause(state){
  if(!state||state.phase!=="playing")return state;
  return {...state,paused:!state.paused,
    message:state.paused?"Transmissão retomada.":"Transmissão pausada."};
}
export function undoMirror(state){
  if(!state?.history?.length||state.paused||state.phase!=="playing")return state;
  return {...snapshot(state.history.at(-1)),history:state.history.slice(0,-1),
    message:"Último giro desfeito."};
}
export function getMirrorHint(state){
  if(!state||state.phase!=="playing"||state.paused)return null;
  const mirror=state.mirrors.find(m=>m.critical&&m.slant!==m.solution);
  return mirror?{cell:mirror.cell,slant:mirror.solution,
    reason:"Gire este refletor para aproximar o feixe da trajetória correta."}:null;
}
