// Linha de Contenção: simulação por turnos de avanço de incêndios na malha.
// Um fogo ativo avança para uma nova célula a cada rodada; áreas queimadas
// não podem ser recuperadas, barreiras bloqueiam a propagação.
export const FIRELINE_MODES=Object.freeze(["proteger","resistir"]);
export const FIRELINE_LEVELS=Object.freeze({
  recruta:Object.freeze({size:4,rounds:6,fires:2,water:7,smoke:10}),
  tatico:Object.freeze({size:5,rounds:8,fires:3,water:8,smoke:14}),
  veterano:Object.freeze({size:6,rounds:10,fires:4,water:9,smoke:18}),
});
const WATER_CAP=12;
function random(seed){
  let n=(seed^0x9e3779b9)>>>0;
  return ()=>{n^=n<<13;n^=n>>>17;n^=n<<5;return(n>>>0)/4294967296;};
}
function copyCore(state){
  const {history,...core}=state;
  return {...core,burning:[...state.burning],scorched:[...state.scorched],
    firebreaks:[...state.firebreaks],lostSettlements:[...state.lostSettlements]};
}
function playable(state){return state?.phase==="playing"&&!state.paused;}
export function createFireline({mode="proteger",difficulty="recruta",seed=0}={}){
  if(!FIRELINE_MODES.includes(mode)||!Object.hasOwn(FIRELINE_LEVELS,difficulty)
    ||!Number.isSafeInteger(seed)||seed<0||seed>999999999)
    throw new RangeError("Modo, dificuldade ou semente inválidos.");
  const level=FIRELINE_LEVELS[difficulty],size=level.size,rng=random(seed);
  const cols=[...Array(size).keys()];
  for(let i=cols.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[cols[i],cols[j]]=[cols[j],cols[i]];}
  const center=Math.floor(size/2);
  const selected=[center,...cols.filter(col=>col!==center)].slice(0,level.fires);
  const settlements=[center-1,center].map(col=>size*(size-1)+col);
  return {mode,difficulty,seed,size,round:1,maxRounds:level.rounds,
    burning:selected.sort((a,b)=>a-b),scorched:[],firebreaks:[],settlements,
    lostSettlements:[],water:level.water,smoke:0,maxSmoke:level.smoke,actionsLeft:2,paused:false,phase:"playing",
    history:[],score:0,
    message:"Tente conter as chamas. Cada rodada permite duas ações antes da propagação."};
}
export function firelineAction(state,action,cell){
  if(!playable(state)||!state.actionsLeft||!["suppress","firebreak","refill"].includes(action))return state;
  const valid=Number.isInteger(cell)&&cell>=0&&cell<state.size*state.size;
  const burning=new Set(state.burning),breaks=new Set(state.firebreaks),scorched=new Set(state.scorched);
  let water=state.water,message="";
  if(action==="suppress"){
    if(!valid||!burning.has(cell)||water<1)return state;
    burning.delete(cell);scorched.add(cell);water-=1;message="Chamas apagadas na casa "+(cell+1)+".";
  }else if(action==="firebreak"){
    if(!valid||burning.has(cell)||scorched.has(cell)||breaks.has(cell)
      ||state.settlements.includes(cell)||water<1)return state;
    breaks.add(cell);water-=1;message="Faixa de segurança criada na casa "+(cell+1)+".";
  }else{
    if(water>=WATER_CAP)return state;
    water=Math.min(WATER_CAP,water+3);message="Suprimentos de água reabastecidos.";
  }
  return {...state,burning:[...burning].sort((a,b)=>a-b),
    scorched:[...scorched].sort((a,b)=>a-b),
    firebreaks:[...breaks].sort((a,b)=>a-b),
    water,actionsLeft:state.actionsLeft-1,message,
    history:[...state.history,copyCore(state)].slice(-2)};
}
function nextSpread(state){
  const {size,round,seed}=state,blocked=new Set([...state.firebreaks,...state.scorched]);
  const burning=new Set(),lost=new Set(state.lostSettlements);
  const scorched=new Set(state.scorched);
  for(const cell of state.burning){
    scorched.add(cell);
    const row=Math.floor(cell/size),col=cell%size;
    if(row+1>=size)continue;
    const shift=((seed+round+col)%5===0)?1:((seed+round+col)%7===0)?-1:0;
    for(const nextCol of [col+shift,col,col-1,col+1]){
      if(nextCol<0||nextCol>=size)continue;
      const next=(row+1)*size+nextCol;
      if(blocked.has(next))continue;
      burning.add(next);
      if(state.settlements.includes(next))lost.add(next);
      break;
    }
  }
  // Recurring spot fires keep the objective meaningful after the first wave.
  if(round%3===0){
    const top=(seed+round*3)%size;
    const next=[top,...Array(size).keys()].find(col=>
      !blocked.has(col)&&!scorched.has(col)&&!burning.has(col));
    if(next!==undefined)burning.add(next);
  }
  return {burning:[...burning].sort((a,b)=>a-b),
    scorched:[...scorched].sort((a,b)=>a-b),
    lostSettlements:[...lost].sort((a,b)=>a-b)};
}
export function advanceFireline(state){
  if(!playable(state))return state;
  const spread=nextSpread(state);
  const alive=state.settlements.length-spread.lostSettlements.length;
  const minAlive=state.mode==="proteger"?state.settlements.length:1;
  const smoke=state.smoke+spread.burning.length;
  const loss=alive<minAlive||smoke>=state.maxSmoke;
  const final=state.round>=state.maxRounds;
  const phase=loss?"lost":final?"won":"playing";
  const score=phase==="won"?
    100*alive+state.water*3+(state.size*state.size-spread.scorched.length)*2:0;
  return {...state,...spread,smoke,phase,score,
    round:final?state.round:state.round+1,actionsLeft:phase==="playing"?2:0,
    history:[],
    message:phase==="won"?"Vitória! Áreas protegidas até o fim da operação.":
      phase==="lost"?"Derrota. Chamas ou fumaça comprometeram as áreas protegidas.":
        "Frente de incêndio avançou. Verifique as áreas em risco antes da próxima rodada."};
}
export function toggleFirelinePause(state){
  if(!state||state.phase!=="playing")return state;
  return {...state,paused:!state.paused,
    message:state.paused?"Operação retomada.":"Operação pausada."};
}
export function undoFireline(state){
  if(!state?.history?.length||state.paused||state.phase!=="playing")return state;
  return {...copyCore(state.history.at(-1)),history:state.history.slice(0,-1),
    message:"Última preparação desfeita."};
}
export function getFirelineHint(state){
  if(!playable(state)||!state.actionsLeft)return null;
  if(state.burning.length&&state.water){
    const next=state.burning.slice().sort((a,b)=>Math.floor(b/state.size)-Math.floor(a/state.size)||a-b)[0];
    return {action:"suppress",cell:next,reason:"Extinguir a frente de incêndio mais próxima das áreas protegidas."};
  }
  if(state.water<WATER_CAP)return {action:"refill",cell:null,reason:"Repor água para próximas emergências."};
  for(const base of state.settlements){
    const target=base-state.size;
    if(!state.firebreaks.includes(target)&&!state.scorched.includes(target)
      &&!state.burning.includes(target))
      return {action:"firebreak",cell:target,reason:"Preparar uma faixa perto de uma área protegida."};
  }
  const cell=Array.from({length:state.size*state.size},(_,i)=>i)
    .find(i=>!state.firebreaks.includes(i)&&!state.scorched.includes(i)
      &&!state.burning.includes(i)&&!state.settlements.includes(i));
  return cell===undefined?null:{action:"firebreak",cell,reason:"Reforçar as faixas de contenção."};
}
