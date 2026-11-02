/** Gravidade dos Cristais: dois cristais movem juntos em tabuleiro com rochas. */
export const GRAVITY_MODES=Object.freeze(["deslizar","passo"]);
export const GRAVITY_LEVELS=Object.freeze({recruta:4,tatico:5,veterano:6});
export const GRAVITY_DIRS=Object.freeze(["up","right","down","left"]);
const DIR=Object.freeze({up:[0,-1],right:[1,0],down:[0,1],left:[-1,0]});
const point=({x,y})=>x+":"+y;
function random(seed){let n=(seed^0x9e3779b9)>>>0;return()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return n>>>0;};}
function shuffle(list,rand){for(let i=list.length-1;i>0;i--){const j=rand()%(i+1);[list[i],list[j]]=[list[j],list[i]];}return list;}
function keyState(tokens){return tokens.map(point).join("|");}
function moveTokens(tokens,blocks,size,mode,direction){
 const [dx,dy]=DIR[direction],rock=new Set(blocks.map(point)),occupied=new Set(tokens.map(point));
 const order=[0,1].sort((i,j)=>dx*(tokens[j].x-tokens[i].x)+dy*(tokens[j].y-tokens[i].y));
 const result=tokens.map(t=>({...t}));
 for(const i of order){
  const t=result[i];occupied.delete(point(t));let x=t.x,y=t.y;
  for(;;){const nx=x+dx,ny=y+dy;
   if(nx<0||ny<0||nx>=size||ny>=size||rock.has(nx+":"+ny)||occupied.has(nx+":"+ny))break;
   x=nx;y=ny;
   if(mode==="passo")break;
  }
  result[i]={...t,x,y};occupied.add(point(result[i]));
 }
 return result;
}
function solved(tokens,goals){return tokens.every((t,i)=>t.x===goals[i].x&&t.y===goals[i].y);}
function shortest(state,remaining){
 const from=state.tokens;
 if(solved(from,state.goals))return [];
 const seen=new Set([keyState(from)]),queue=[{tokens:from,path:[]}];
 let cursor=0;
 while(cursor<queue.length){
  const node=queue[cursor++];
  if(node.path.length>=remaining)continue;
  for(const direction of GRAVITY_DIRS){
   const next=moveTokens(node.tokens,state.blocks,state.size,state.mode,direction),k=keyState(next);
   if(seen.has(k))continue;
   const path=[...node.path,direction];
   if(solved(next,state.goals))return path;
   seen.add(k);queue.push({tokens:next,path});
  }
 }
 return null;
}
export function createGravity({mode="deslizar",difficulty="recruta",seed=0}={}){
 if(!GRAVITY_MODES.includes(mode)||!Object.hasOwn(GRAVITY_LEVELS,difficulty)||
   !Number.isSafeInteger(seed)||seed<0||seed>99999999)throw new RangeError("Configuração inválida.");
 const size=GRAVITY_LEVELS[difficulty],rng=random(seed+size*997+GRAVITY_MODES.indexOf(mode)*14173);
 const wallCount=size===4?2:size===5?4:6,limit=size===4?16:size===5?21:26;
 for(let attempt=0;attempt<150;attempt++){
  const squares=[];for(let y=0;y<size;y++)for(let x=0;x<size;x++)squares.push({x,y});
  shuffle(squares,rng);
  const blocks=squares.slice(0,wallCount),chosen=squares.slice(wallCount,wallCount+2);
  const tokens=chosen.map((p,i)=>({id:i===0?"A":"B",x:p.x,y:p.y}));
  let current=tokens;
  for(let i=0;i<7+rng()%7;i++)current=moveTokens(current,blocks,size,mode,GRAVITY_DIRS[rng()%4]);
  const goals=current.map(p=>({...p}));
  if(solved(tokens,goals))continue;
  if(goals.some((p,i)=>p.x===tokens[i].x&&p.y===tokens[i].y))continue;
  const candidate={mode,difficulty,seed,size,blocks,tokens,goals,limit};
  const path=shortest(candidate,limit-4);
  if(!path||path.length<2||path.length>limit-4)continue;
  return {...candidate,phase:"playing",paused:false,moves:0,score:0,history:[],
    message:"Incline o tabuleiro e leve os cristais A e B até seus respectivos alvos."};
 }
 throw new Error("Não foi possível gerar desafio solucionável para esta configuração.");
}
export function tiltGravity(state,direction){
 if(!state||state.phase!=="playing"||state.paused||!Object.hasOwn(DIR,direction))return state;
 const tokens=moveTokens(state.tokens,state.blocks,state.size,state.mode,direction);
 if(keyState(tokens)===keyState(state.tokens))return state;
 const moves=state.moves+1,win=solved(tokens,state.goals),phase=win?"won":moves>=state.limit?"lost":"playing";
 return {...state,tokens,moves,phase,score:win?Math.max(100,2600-55*moves):0,
  history:[...state.history,state.tokens],message:win?"Cristais alinhados! Vitória.":phase==="lost"?
    "Manobras esgotadas. Reinicie para tentar outra rota.":"Os cristais deslizaram. Planeje a próxima inclinação."};
}
export function undoGravity(state){
 if(!state||state.phase!=="playing"||state.paused||!state.history.length)return state;
 const history=[...state.history],tokens=history.pop(),moves=state.moves+1;
 return {...state,tokens,history,moves,phase:moves>=state.limit?"lost":"playing",
  message:moves>=state.limit?"Manobras esgotadas.":"Inclinação desfeita. Ambos os cristais voltaram."};
}
export function pauseGravity(state){
 return state?.phase==="playing"?{...state,paused:!state.paused,
  message:state.paused?"Partida retomada.":"Partida pausada."}:state;
}
export function solveGravity(state){
 if(!state||state.phase!=="playing"||state.paused)return null;
 return shortest(state,state.limit-state.moves);
}
export function hintGravity(state){return solveGravity(state)?.[0]??null;}
