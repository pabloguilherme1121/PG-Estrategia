// Malha de Energia: quebra-cabeça Lights Out determinístico.
// Cada toque alterna o painel escolhido e seus vizinhos ortogonais.
// As transições são imutáveis; o plano registra paridades, não uma resposta fixa.
export const ENERGY_DIFFICULTIES=Object.freeze({
  recruta:Object.freeze({size:3,scramble:4,maxMoves:14}),
  tatico:Object.freeze({size:4,scramble:7,maxMoves:24}),
  veterano:Object.freeze({size:5,scramble:11,maxMoves:36})
});
export const ENERGY_MODES=Object.freeze(["restaurar","desligar"]);
function toggled(cells,index,size){
  const x=index%size,y=Math.floor(index/size);
  const next=cells.slice();
  for(const [nx,ny] of [[x,y],[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
    if(nx>=0&&nx<size&&ny>=0&&ny<size){
      const i=ny*size+nx;
      next[i]=1-next[i];
    }
  }
  return next;
}
function seededOrder(seed,count){
  let x=(seed>>>0)^0x9e3779b9;
  const values=Array.from({length:count},(_,i)=>i);
  for(let i=count-1;i>0;i--){
    x^=x<<13;x^=x>>>17;x^=x<<5;
    const j=(x>>>0)%(i+1);
    [values[i],values[j]]=[values[j],values[i]];
  }
  return values;
}
function snapshot(state){
  const {history,...saved}=state;
  return {...saved,cells:saved.cells.slice(),pending:saved.pending.slice()};
}
export function createGrid({mode="restaurar",difficulty="recruta",seed=0}={}){
  if(!ENERGY_MODES.includes(mode)||!Object.hasOwn(ENERGY_DIFFICULTIES,difficulty)||
    !Number.isSafeInteger(seed)||seed<0)throw new RangeError("Modo, dificuldade ou semente inválidos.");
  const {size,scramble,maxMoves}=ENERGY_DIFFICULTIES[difficulty];
  const goal=mode==="restaurar"?1:0;
  const selected=seededOrder(seed,size*size).slice(0,scramble);
  let cells=Array(size*size).fill(goal);
  for(const index of selected)cells=toggled(cells,index,size);
  // Geradores 3x3/4x4/5x5 não tornam a solução trivial.
  // Uma configuração excepcional que coincida com a meta é embaralhada novamente.
  if(cells.every(v=>v===goal)){
    const extra=seededOrder(seed+1,size*size).find(i=>!selected.includes(i));
    if(extra!==undefined){selected.push(extra);cells=toggled(cells,extra,size);}
  }
  return {mode,difficulty,seed,size,goal,cells,pending:selected.sort((a,b)=>a-b),
    moves:0,maxMoves,phase:"playing",paused:false,history:[],
    message:"Alterne uma célula e os vizinhos para atingir a meta."};
}
export function pressCell(state,index){
  if(!state||state.phase!=="playing"||state.paused||!Number.isInteger(index)||
    index<0||index>=state.cells.length)return state;
  const cells=toggled(state.cells,index,state.size);
  // Cada comando tem efeito de paridade e pode cancelar um comando anterior.
  const pending=state.pending.includes(index)
    ?state.pending.filter(v=>v!==index)
    :[...state.pending,index].sort((a,b)=>a-b);
  const moves=state.moves+1;
  const won=cells.every(v=>v===state.goal);
  const phase=won?"won":moves>=state.maxMoves?"lost":"playing";
  const message=phase==="won"?"Malha estabilizada! Vitória.":
    phase==="lost"?"Limite de comandos excedido. Tente outra estratégia.":
    "Células ajustadas. Observe as mudanças antes do próximo comando.";
  return {...state,cells,pending,moves,phase,message,
    history:[...state.history,snapshot(state)].slice(-36)};
}
export function toggleGridPause(state){
  if(!state||state.phase!=="playing")return state;
  return {...state,paused:!state.paused,
    message:state.paused?"Partida retomada.":"Partida pausada."};
}
export function undoGrid(state){
  if(!state?.history?.length)return state;
  return {...snapshot(state.history.at(-1)),history:state.history.slice(0,-1),
    message:"Último comando desfeito."};
}
export function revealGridHint(state){
  if(!state||state.phase!=="playing"||state.paused)return null;
  return state.pending[0]??null;
}
