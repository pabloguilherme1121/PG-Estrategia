// Convés Modular: empacotamento espacial e distribuição de lastro.
export const CARGO_MODES=Object.freeze(["encaixe","equilibrio"]);
export const CARGO_LEVELS=Object.freeze({recruta:4,tatico:5,veterano:6});
const LAYOUTS={
 recruta:[["A",2,2,2,0,0],["B",1,2,1,2,0],["C",1,2,1,3,0],["D",2,1,3,0,3]],
 tatico:[["A",2,2,2,0,0],["B",1,3,3,4,0],["C",2,1,1,2,1],["D",2,2,1,0,3],["E",2,1,2,3,4]],
 veterano:[["A",2,2,2,0,0],["B",2,2,3,4,0],["C",1,3,3,2,0],["D",1,3,2,3,0],["E",2,2,1,0,4],["F",2,2,1,4,4]]
};
function rand(seed){let n=(seed+1)*271828+19;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n;};}
function cells(item,x,y,rotated=false){const width=rotated?item.h:item.w,height=rotated?item.w:item.h;
 const result=[];for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++)result.push([x+dx,y+dy]);return result;
}
function key(x,y){return x+":"+y;}
function occupancy(state){
 const taken=new Set(state.blocked.map(([x,y])=>key(x,y)));
 for(const p of state.placements){const item=state.items.find(i=>i.id===p.id);
  for(const [x,y] of cells(item,p.x,p.y,p.rotated))taken.add(key(x,y));
 }
 return taken;
}
function loadBalance(items,placements,size){
 let value=0;
 for(const p of placements){const item=items.find(i=>i.id===p.id);
  for(const [x] of cells(item,p.x,p.y,p.rotated)){
   if(x<(size-1)/2)value+=item.weight;
   if(x>(size-1)/2)value-=item.weight;
  }
 }
 return value;
}
export function cargoBalance(state){return loadBalance(state.items,state.placements,state.size);}
export function createCargo({mode="encaixe",difficulty="recruta",seed=0}={}){
 if(!CARGO_MODES.includes(mode)||!Object.hasOwn(CARGO_LEVELS,difficulty)||
  !Number.isSafeInteger(seed)||seed<0||seed>99999999)throw new RangeError("Configuração inválida");
 const size=CARGO_LEVELS[difficulty],random=rand(seed);
 const flipX=seed%2===1,flipY=seed%3===2;
 const reference=LAYOUTS[difficulty].map(([id,w,h,weight,x,y])=>({
  id,x:flipX?size-x-w:x,y:flipY?size-y-h:y,rotated:false
 }));
 const items=LAYOUTS[difficulty].map(([id,w,h,weight])=>({id,w,h,weight}));
 for(let i=items.length-1;i>0;i--){const j=random()%(i+1);[items[i],items[j]]=[items[j],items[i]];}
 const reserved=new Set(reference.flatMap(p=>cells(items.find(i=>i.id===p.id),p.x,p.y).map(([x,y])=>key(x,y))));
 const free=[];for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(!reserved.has(key(x,y)))free.push([x,y]);
 for(let i=free.length-1;i>0;i--){const j=random()%(i+1);[free[i],free[j]]=[free[j],free[i]];}
 const blocked=free.slice(0,Math.min(free.length,Math.max(1,Math.floor(free.length*.55))));
 const targetBalance=loadBalance(items,reference,size);
 return {mode,difficulty,seed,size,items,blocked,reference,placements:[],
  targetBalance,phase:"playing",paused:false,moves:0,limit:items.length*3+5,
  score:0,history:[],message:"Selecione um módulo e toque onde deseja encaixá-lo."};
}
export function cargoFit(state,move){
 if(!state||!move||state.phase!=="playing"||state.paused)return false;
 const {id,x,y,rotated=false}=move;
 if(typeof id!=="string"||!Number.isInteger(x)||!Number.isInteger(y)||typeof rotated!=="boolean")return false;
 const item=state.items.find(i=>i.id===id);
 if(!item||state.placements.some(p=>p.id===id))return false;
 const used=occupancy(state);
 return cells(item,x,y,rotated).every(([cx,cy])=>cx>=0&&cy>=0&&cx<state.size&&cy<state.size&&!used.has(key(cx,cy)));
}
export function placeCargo(state,move){
 if(!cargoFit(state,move))return state;
 const position={id:move.id,x:move.x,y:move.y,rotated:move.rotated===true};
 const placements=[...state.placements,position],moves=state.moves+1;
 const full=placements.length===state.items.length;
 const balance=loadBalance(state.items,placements,state.size);
 const won=full&&(state.mode==="encaixe"||balance===state.targetBalance);
 const lost=!won&&moves>=state.limit;
 const phase=won?"won":lost?"lost":"playing";
 const score=won?Math.max(100,2000-moves*35):0;
 const message=won?"Carga completa! Convés organizado.":lost?"Manobras esgotadas. Reinicie o desafio.":full?
  "Carga posicionada, mas lastro fora do alvo. Desfaça e redistribua.":"Módulo encaixado. Distribua a carga restante.";
 return {...state,placements,moves,phase,score,message,
  history:[...state.history,{placements:state.placements}]};
}
export function undoCargo(state){
 if(!state||state.phase!=="playing"||state.paused||!state.history.length)return state;
 const history=[...state.history],prev=history.pop(),moves=state.moves+1;
 return {...state,placements:prev.placements,history,moves,phase:moves>=state.limit?"lost":"playing",
  message:moves>=state.limit?"Manobras esgotadas.":"Encaixe desfeito. Reorganize a carga."};
}
export function pauseCargo(state){
 return state?.phase==="playing"?{...state,paused:!state.paused,message:state.paused?"Partida retomada.":"Partida pausada."}:state;
}
function directSolution(state){
 const missing=state.reference.filter(p=>!state.placements.some(x=>x.id===p.id));
 let temp=state;
 for(const p of missing){
  if(!cargoFit(temp,p))return null;
  temp={...temp,placements:[...temp.placements,p]};
 }
 return temp.mode==="encaixe"||cargoBalance(temp)===temp.targetBalance?missing[0]??null:null;
}
export function solveCargo(state){
 if(!state||state.paused||state.phase!=="playing")return null;
 if(state.limit-state.moves<state.items.length-state.placements.length)return null;
 const reference=directSolution(state);if(reference)return reference;
 const rem=state.items.filter(item=>!state.placements.some(p=>p.id===item.id));
 let visits=0;
 function dfs(s,remaining){
  if(++visits>40000)return null;
  if(remaining.length===0)return s.mode==="encaixe"||cargoBalance(s)===s.targetBalance?[]:null;
  const item=remaining[0];
  for(const rotated of [false,true]){
   if(rotated&&item.w===item.h)continue;
   for(let y=0;y<s.size;y++)for(let x=0;x<s.size;x++){
    const p={id:item.id,x,y,rotated};
    if(!cargoFit(s,p))continue;
    const after={...s,placements:[...s.placements,p]};
    const rest=dfs(after,remaining.slice(1));
    if(rest)return [p,...rest];
   }
  }
  return null;
 }
 return dfs(state,rem)?.[0]??null;
}
export function hintCargo(state){return solveCargo(state);}
