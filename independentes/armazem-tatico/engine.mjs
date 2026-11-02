// Armazém Tático: Sokoban determinístico com caixas, destinos, paredes e planejamento por turnos.
// Regras próprias, sem confundir fases com novos jogos independentes.
export const WAREHOUSE_MODES=Object.freeze(["entrega","economia"]);
export const WAREHOUSE_LEVELS=Object.freeze({
 recruta:Object.freeze({size:5,boxes:1,maxMoves:28}),
 tatico:Object.freeze({size:6,boxes:2,maxMoves:50}),
 veterano:Object.freeze({size:6,boxes:3,maxMoves:78}),
});
const DELTAS=Object.freeze({up:[-1,0],right:[0,1],down:[1,0],left:[0,-1]});
const ORDER=Object.freeze(["up","right","down","left"]);
function moved(index,dir,size){
 const [dr,dc]=DELTAS[dir],r=Math.floor(index/size)+dr,c=index%size+dc;
 return r<0||r>=size||c<0||c>=size?-1:r*size+c;
}
function transform(index,size,turns){
 let row=Math.floor(index/size),col=index%size;
 for(let n=0;n<turns;n++){const nextRow=col;col=size-1-row;row=nextRow;}
 return row*size+col;
}
const sorted=items=>items.slice().sort((a,b)=>a-b);
const playable=s=>s?.phase==="playing"&&!s.paused;
function copyState(s){const {history,...rest}=s;return {...rest,boxes:[...s.boxes],goals:[...s.goals],walls:[...s.walls]};}
function key(p,boxes){return p+"|"+boxes.join(",");}
function advancePure(position,boxes,dir,size,walls){
 const to=moved(position,dir,size);
 if(to<0||walls.has(to))return null;
 const at=boxes.indexOf(to);
 if(at<0)return {player:to,boxes};
 const push=moved(to,dir,size);
 if(push<0||walls.has(push)||boxes.includes(push))return null;
 const next=boxes.slice();next[at]=push;
 return {player:to,boxes:sorted(next)};
}
function completed(boxes,goalSet){return boxes.every(box=>goalSet.has(box));}
export function createWarehouse({mode="entrega",difficulty="recruta",seed=0}={}){
 if(!WAREHOUSE_MODES.includes(mode)||!Object.hasOwn(WAREHOUSE_LEVELS,difficulty)
   ||!Number.isSafeInteger(seed)||seed<0||seed>999999999)
  throw new RangeError("Modo, dificuldade ou semente inválidos.");
 const rules=WAREHOUSE_LEVELS[difficulty],size=rules.size;
 const columns=rules.boxes===1?[2]:rules.boxes===2?[2,3]:[1,2,3];
 const targetColumns=rules.boxes===1?[2]:rules.boxes===2?[1,3]:[1,2,4];
 const cell=(r,c)=>r*size+c,turns=seed%4;
 const walls=[];
 for(let r=0;r<size;r++)for(let c=0;c<size;c++)
  if(r===0||c===0||r===size-1||c===size-1)walls.push(cell(r,c));
 walls.push(rules.boxes===1?cell(size-2,size-2):cell(3,rules.boxes===2?4:3));
 const goals=targetColumns.map(c=>cell(size-2,c));
 const boxes=columns.map(c=>cell(2,c));
 const player=cell(1,columns[0]);
 const maxMoves=mode==="economia"?Math.floor(rules.maxMoves*0.8):rules.maxMoves;
 return {mode,difficulty,seed,size,player:transform(player,size,turns),boxes:sorted(boxes.map(i=>transform(i,size,turns))),
  goals:sorted(goals.map(i=>transform(i,size,turns))),
  walls:sorted(walls.map(i=>transform(i,size,turns))),maxMoves,moves:0,
  phase:"playing",paused:false,score:0,history:[],
  message:"Mova as caixas até os destinos. Você só consegue empurrar uma por vez."};
}
export function moveWarehouse(state,direction){
 if(!playable(state)||!Object.hasOwn(DELTAS,direction))return state;
 const next=advancePure(state.player,state.boxes,direction,state.size,new Set(state.walls));
 if(!next)return state;
 const moves=state.moves+1,won=completed(next.boxes,new Set(state.goals));
 const phase=won?"won":moves>=state.maxMoves?"lost":"playing";
 return {...state,...next,moves,phase,score:won?Math.max(25,500-moves*8+(state.mode==="economia"?35:0)):0,
  message:won?"Vitória! Todas as entregas concluídas.":phase==="lost"?"Derrota. O limite de movimentos terminou.":"Posicione as caixas sem bloqueá-las nos cantos.",
  history:[...state.history,copyState(state)].slice(-30)};
}
export function toggleWarehousePause(state){
 if(!state||state.phase!=="playing")return state;
 return {...state,paused:!state.paused,message:state.paused?"Operação retomada.":"Operação pausada."};
}
export function undoWarehouse(state){
 if(!playable(state)||!state.history?.length)return state;
 return {...copyState(state.history.at(-1)),history:state.history.slice(0,-1),message:"Último movimento desfeito."};
}
// Busca em largura do estado real; considera onde o jogador pode andar e cada caixa empurrável.
// Evita dicas roteirizadas que funcionam apenas em uma semente.
export function getWarehouseHint(state){
 if(!playable(state))return null;
 const goalSet=new Set(state.goals),walls=new Set(state.walls),seen=new Set([key(state.player,state.boxes)]);
 const queue=[{player:state.player,boxes:state.boxes,first:null,depth:0}];
 let cursor=0;
 while(cursor<queue.length&&cursor<50000){
  const node=queue[cursor++];
  if(completed(node.boxes,goalSet)&&node.first)return {direction:node.first,reason:"Siga a rota que permite colocar todas as caixas nos destinos."};
  if(node.depth>=state.maxMoves-state.moves)continue;
  for(const direction of ORDER){
   const next=advancePure(node.player,node.boxes,direction,state.size,walls);
   if(!next)continue;
   const id=key(next.player,next.boxes);
   if(seen.has(id))continue;
   seen.add(id);
   queue.push({...next,first:node.first??direction,depth:node.depth+1});
  }
 }
 return null;
}
