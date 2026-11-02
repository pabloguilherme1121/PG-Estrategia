// Labirinto das Sombras: furtividade por turnos, visão direcional e informação.
export const STEALTH_MODES=Object.freeze(["cautela","alerta"]);
export const STEALTH_LEVELS=Object.freeze({recruta:5,tatico:7,veterano:9});
export const STEALTH_ACTIONS=Object.freeze(["north","east","south","west","wait"]);
const DIRS=Object.freeze([[0,-1],[1,0],[0,1],[-1,0],[0,0]]);
const same=(a,b)=>a.x===b.x&&a.y===b.y;
const wallKey=(x,y)=>x+","+y;
function inside(size,x,y){return x>=0&&y>=0&&x<size&&y<size;}
function guardSet(size,seed){
 const offsets=[seed%4,(seed+2)%4,(seed+3)%4];
 return size===5?[{x:3,y:3,offset:offsets[0]}]:
  size===7?[{x:5,y:5,offset:offsets[0]},{x:2,y:3,offset:offsets[1]}]:
  [{x:7,y:7,offset:offsets[0]},{x:3,y:3,offset:offsets[1]},{x:5,y:6,offset:offsets[2]}];
}
export function spotStealth(board,player,turn){
 if(!board||!player||!Array.isArray(board.guards))return false;
 const maxRange=board.mode==="alerta"?3:2;
 const walls=new Set(board.walls.map(([x,y])=>wallKey(x,y)));
 for(const guard of board.guards){
  if(same(guard,player))return true;
  const [dx,dy]=DIRS[(turn+guard.offset)%4];
  for(let r=1;r<=maxRange;r++){
   const x=guard.x+dx*r,y=guard.y+dy*r;
   if(!inside(board.size,x,y)||walls.has(wallKey(x,y)))break;
   if(x===player.x&&y===player.y)return true;
  }
 }
 return false;
}
function plan(state){
 const queue=[{state,first:null}],seen=new Set();
 for(let qi=0;qi<queue.length;qi++){
  const {state:g,first}=queue[qi];
  if(g.phase==="won")return first;
  if(g.phase!=="playing"||g.turn>=g.limit)continue;
  const key=[g.player.x,g.player.y,g.turn%4,Number(g.hasIntel)].join(":");
  if(seen.has(key))continue;
  seen.add(key);
  for(const action of STEALTH_ACTIONS){
   const next=moveStealth(g,action);
   if(next!==g&&next.phase!=="lost")queue.push({state:{...next,history:[]},first:first??action});
  }
 }
 return null;
}
export function createStealth({mode="cautela",difficulty="recruta",seed=0}={}){
 if(!STEALTH_MODES.includes(mode)||!Object.hasOwn(STEALTH_LEVELS,difficulty)
 ||!Number.isSafeInteger(seed)||seed<0||seed>999999999)throw new RangeError("Configuração inválida");
 const size=STEALTH_LEVELS[difficulty],guards=guardSet(size,seed),used=new Set(guards.map(g=>wallKey(g.x,g.y)));
 let random=(seed+1)*911+size*101;
 const nextRandom=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random;};
 const walls=[];
 for(let i=0;i<size-1;i++){
  const x=1+nextRandom()%(size-2),y=1+nextRandom()%(size-2),key=wallKey(x,y);
  if(!used.has(key)){walls.push([x,y]);used.add(key);}
 }
 const result={mode,difficulty,seed,size,walls,guards,player:{x:0,y:0},
  intel:{x:size-1,y:0},exit:{x:size-1,y:size-1},
  hasIntel:false,turn:0,limit:size*8+10,phase:"playing",paused:false,score:0,history:[],
  message:"Recupere o documento e alcance a saída sem entrar na visão das patrulhas."};
 // A geração é determinística; remova obstáculos internos só se impedirem toda rota.
 if(plan(result)===null)return {...result,walls:[]};
 return result;
}
export function moveStealth(state,action){
 if(!state||state.phase!=="playing"||state.paused||!STEALTH_ACTIONS.includes(action))return state;
 const [dx,dy]=DIRS[STEALTH_ACTIONS.indexOf(action)],player={x:state.player.x+dx,y:state.player.y+dy};
 if(!inside(state.size,player.x,player.y)||state.walls.some(([x,y])=>player.x===x&&player.y===y))return state;
 const turn=state.turn+1,hasIntel=state.hasIntel||same(player,state.intel);
 const spotted=spotStealth(state,player,turn),won=hasIntel&&same(player,state.exit)&&!spotted;
 const phase=spotted?"lost":won?"won":turn>=state.limit?"lost":"playing";
 return {...state,player,turn,hasIntel,phase,
  score:won?Math.max(100,1250-turn*16+(state.mode==="alerta"?90:0)):0,
  message:spotted?"Alarme! A patrulha encontrou o agente.":won?"Vitória: documento recuperado e saída alcançada.":phase==="lost"?"O prazo de infiltração terminou.":hasIntel?"Documento seguro. Alcance a saída.":"Patrulhas avançaram. Evite os cones de visão.",
  history:[...state.history,{player:{...state.player},turn:state.turn,hasIntel:state.hasIntel,phase:state.phase,score:state.score,message:state.message}]};
}
export function undoStealth(state){
 if(!state||state.phase!=="playing"||state.paused||!state.history.length)return state;
 const history=[...state.history],last=history.pop();
 return {...state,...last,history,message:"Último turno desfeito."};
}
export function pauseStealth(state){
 return state?.phase==="playing"?{...state,paused:!state.paused,message:state.paused?"Missão retomada.":"Infiltração pausada."}:state;
}
export function hintStealth(state){
 if(!state||state.paused||state.phase!=="playing")return null;
 return plan(state);
}
