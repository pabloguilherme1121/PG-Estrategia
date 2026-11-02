// Central de Resgates: despacho com durações, prazos e valor de atendimento.
// Motor de agendamento, separado de rotas, combate, leilão e da campanha.
export const DISPATCH_MODES = Object.freeze(["prioridade","pontualidade"]);
export const DISPATCH_DIFFICULTIES = Object.freeze({
  recruta:Object.freeze({jobs:6,endTime:12}),
  tatico:Object.freeze({jobs:8,endTime:16}),
  veterano:Object.freeze({jobs:10,endTime:20}),
});
const CALLS=Object.freeze([
  "Hospital","Defesa Civil","Estação","Escola","Comunidade","Posto",
  "Abrigo","Represa","Ponte","Sinal","Praça","Porto",
]);
function rng(seed){
  let x=(seed^0xa5a5f00d)>>>0;
  return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};
}
function snapshot(state) {
  const {history,...data}=state;
  return {...data,completed:data.completed.map(entry=>({...entry}))};
}
function canPlay(state) {return Boolean(state?.phase==="playing"&&!state.paused);}
function earned(job,end,mode){return end<=job.deadline ? mode==="pontualidade"?1:job.reward :0;}
// Memoized exact optimizer for at most ten pending calls.
// Only on-time completions can improve the objective; late calls have nonnegative cost.
function bestFuture(jobs,time,endTime,mask,mode){
  const memo=new Map();
  const solve=(used,clock)=>{
    const key=used*(endTime+1)+clock;
    if(memo.has(key))return memo.get(key);
    let best=0,chosen=-1;
    for(let i=0;i<jobs.length;i++){
      if(used&(1<<i))continue;
      const finish=clock+jobs[i].duration;
      if(finish>endTime||finish>jobs[i].deadline)continue;
      const value=earned(jobs[i],finish,mode)+solve(used|(1<<i),finish).score;
      if(value>best||(value===best&&chosen>=0&&jobs[i].deadline<jobs[chosen].deadline)){
        best=value;chosen=i;
      }
    }
    const out={score:best,choice:chosen};
    memo.set(key,out);
    return out;
  };
  return solve(mask,time);
}
function maskOf(state){
  const done=new Set(state.completed.map(item=>item.id));
  return state.jobs.reduce((mask,job,i)=>done.has(job.id)?mask|(1<<i):mask,0);
}
export function createDispatchGame({mode="prioridade",difficulty="recruta",seed=0}={}){
  if(!DISPATCH_MODES.includes(mode)||!Object.hasOwn(DISPATCH_DIFFICULTIES,difficulty)
    ||!Number.isSafeInteger(seed)||seed<0||seed>999999999)
    throw new RangeError("Modo, nível ou semente inválidos.");
  const rules=DISPATCH_DIFFICULTIES[difficulty];
  const random=rng(seed);
  const jobs=Array.from({length:rules.jobs},(_,i)=>{
    const duration=1+Math.floor(random()*3);
    const deadline=Math.min(rules.endTime,Math.max(duration,
      Math.floor((i+1)*rules.endTime/rules.jobs)+Math.floor(random()*4)));
    const reward=6+Math.floor(random()*10);
    return {id:"chamado-"+(i+1),name:CALLS[i],duration,deadline,reward};
  });
  const bestPossible=bestFuture(jobs,0,rules.endTime,0,mode).score;
  const target=Math.max(1,Math.ceil(bestPossible*.82));
  return {
    seed,mode,difficulty,jobs,time:0,endTime:rules.endTime,
    score:0,target,bestPossible,phase:"playing",paused:false,completed:[],
    history:[],message:"Escolha o próximo atendimento. Concluir após o prazo não dá pontos.",
  };
}
export function dispatchJob(state,id){
  if(!canPlay(state)||typeof id!=="string")return state;
  const job=state.jobs.find(item=>item.id===id);
  if(!job||state.completed.some(item=>item.id===id)||state.time+job.duration>state.endTime)
    return state;
  const finish=state.time+job.duration;
  const points=earned(job,finish,state.mode);
  const completed=[...state.completed,{id:job.id,finishedAt:finish,onTime:points>0,points}];
  const score=state.score+points;
  const result={...state,time:finish,score,completed,
    history:[...state.history,snapshot(state)].slice(-state.jobs.length)};
  const remaining=bestFuture(result.jobs,finish,result.endTime,maskOf(result),state.mode).score;
  const phase=score>=state.target?"won":score+remaining<state.target?"lost":"playing";
  return {...result,phase,message:phase==="won"?"Missão cumprida! Meta de atendimentos alcançada.":
    phase==="lost"?"Missão perdida. Não há tempo suficiente para atingir a meta.":
      job.name+": "+(points>0?"atendimento dentro do prazo.":"prazo perdido.")+
      " Tempo utilizado: "+finish+" de "+state.endTime+"."};
}
export function undoDispatch(state){
  if(!state?.history?.length||state.paused)return state;
  return {...snapshot(state.history.at(-1)),history:state.history.slice(0,-1),
    message:"Último atendimento desfeito."};
}
export function toggleDispatchPause(state){
  if(!canPlay(state)&&!(state?.phase==="playing"&&state.paused))return state;
  return {...state,paused:!state.paused,
    message:state.paused?"Operação retomada.":"Operação pausada."};
}
export function getDispatchHint(state){
  if(!canPlay(state))return null;
  const best=bestFuture(state.jobs,state.time,state.endTime,maskOf(state),state.mode);
  return best.choice<0?null:{id:state.jobs[best.choice].id,possible:best.score};
}
