import {createDispatchGame,dispatchJob,undoDispatch,toggleDispatchPause,getDispatchHint,
  DISPATCH_MODES,DISPATCH_DIFFICULTIES} from "./engine.mjs";
const $ = id=>document.getElementById(id);
const RECORD_KEY="pg-estrategia-resgates-record-v1";
const VIEW_KEY="pg-estrategia-resgates-preferencias-v1";
let records={};
try {
  const saved=JSON.parse(localStorage.getItem(RECORD_KEY)||"{}");
  if(saved && typeof saved==="object"&&!Array.isArray(saved)){
    records=Object.fromEntries(Object.entries(saved).filter(([key,points])=>
      /^(prioridade|pontualidade):(recruta|tatico|veterano)$/.test(key) &&
      Number.isInteger(points)&&points>0&&points<=150));
  }
} catch {}
try {
  const saved=JSON.parse(localStorage.getItem(VIEW_KEY)||"null");
  if(saved&&DISPATCH_MODES.includes(saved.mode))$("mode").value=saved.mode;
  if(saved&&Object.hasOwn(DISPATCH_DIFFICULTIES,saved.difficulty))
    $("difficulty").value=saved.difficulty;
} catch {}
const saveView=()=>{
  try{localStorage.setItem(VIEW_KEY,JSON.stringify({mode:$("mode").value,difficulty:$("difficulty").value}));}catch{}
};
let state;
const key=()=>state.mode+":"+state.difficulty;
function updateRecord(){
  if(state.phase!=="won"||state.score<=(records[key()]||0))return;
  records[key()]=state.score;
  try{localStorage.setItem(RECORD_KEY,JSON.stringify(records));}catch{}
}
function buildBoard(){
  const jobs=$("jobs");
  jobs.replaceChildren(...state.jobs.map(job=>{
    const card=document.createElement("button");
    card.className="job";card.type="button";card.dataset.job=job.id;
    const title=document.createElement("strong");title.textContent=job.name;
    const desc=document.createElement("small");
    desc.textContent="Duração: "+job.duration+"h · Prazo: "+job.deadline+"h · Impacto: "+job.reward;
    const marker=document.createElement("span");marker.dataset.marker="";
    card.append(title,desc,marker);
    return card;
  }));
}
function render(){
  const playing=state.phase==="playing";
  $("phase").dataset.phase=state.phase;
  $("phase").textContent=state.phase==="won"?"Vitória":state.phase==="lost"?"Derrota":
    state.paused?"Pausado":"Em andamento";
  $("time").textContent=state.time+"/"+state.endTime;
  $("score").textContent=String(state.score);
  $("target").textContent=String(state.target);
  $("record").textContent=records[key()]?records[key()]+" pontos":"Nenhum";
  $("status").textContent=state.message;
  const completed=new Map(state.completed.map(item=>[item.id,item]));
  for(const card of $("jobs").querySelectorAll("button[data-job]")){
    const job=state.jobs.find(item=>item.id===card.dataset.job);
    const result=completed.get(job.id);
    card.dataset.completed=String(Boolean(result));
    card.dataset.urgent=String(!result&&job.deadline-state.time<=job.duration+1);
    card.disabled=!playing||state.paused||Boolean(result)||state.time+job.duration>state.endTime;
    const marker=card.querySelector("[data-marker]");
    marker.textContent=result?(result.onTime?"No prazo":"Atrasado"):
      job.deadline-state.time<=job.duration+1?"Urgente":"Pendente";
    card.setAttribute("aria-label",job.name+", "+job.duration+" horas, prazo "+
      job.deadline+" horas, impacto "+job.reward+". "+marker.textContent+".");
  }
  $("undo").disabled=!state.history.length||state.paused;
  $("hint").disabled=!playing||state.paused;
  $("pause").disabled=!playing;
  $("pause").setAttribute("aria-pressed",String(state.paused));
  $("pause").textContent=state.paused?"Retomar":"Pausar";
}
function restart(){
  const raw=new URLSearchParams(location.search).get("seed");
  const seed=raw!==null&&/^\d{1,9}$/.test(raw)?Number(raw):0;
  state=createDispatchGame({seed,mode:$("mode").value,difficulty:$("difficulty").value});
  buildBoard();
  $("hint-text").textContent="Dica opcional disponível.";
  $("bot-answer").textContent="Selecione uma pergunta para ver a resposta.";
  render();
}
$("jobs").addEventListener("click",event=>{
  const card=event.target.closest("button[data-job]");
  if(!card)return;
  state=dispatchJob(state,card.dataset.job);
  updateRecord();
  render();
});
$("new").addEventListener("click",restart);
$("mode").addEventListener("change",()=>{saveView();restart();});
$("difficulty").addEventListener("change",()=>{saveView();restart();});
$("undo").addEventListener("click",()=>{state=undoDispatch(state);render();});
$("pause").addEventListener("click",()=>{state=toggleDispatchPause(state);render();});
$("hint").addEventListener("click",()=>{
  const hint=getDispatchHint(state);
  const job=state.jobs.find(item=>item.id===hint?.id);
  $("hint-text").textContent=job?
    "Sugestão: atenda "+job.name+" agora. Duração "+job.duration+"h, prazo "+job.deadline+"h.":
    "Não há dica que garanta a meta com as escolhas atuais. Use Desfazer.";
});
$("pg-bot").addEventListener("click",event=>{
  const button=event.target.closest("button[data-help]");
  if(!button)return;
  for(const b of $("pg-bot").querySelectorAll("button[data-help]"))
    b.setAttribute("aria-pressed",String(b===button));
  $("bot-answer").textContent=button.dataset.help==="controles"?
    "Toque ou pressione Enter em um cartão para despachar um chamado. Você também pode Pausar, Desfazer ou Pedir dica.":
    button.dataset.help==="situacao"?
      "Tempo utilizado: "+state.time+" de "+state.endTime+
      " horas. Pontos: "+state.score+" de "+state.target+
      ". Chamados concluídos: "+state.completed.length+".":
      state.mode==="prioridade"?
        "Somar pontos de impacto. Apenas chamados no prazo contam, e a meta é calculada para cada turno.":
        "Atender o maior número possível de chamadas dentro do prazo. Cada atendimento pontual vale um ponto.";
});
restart();
if("serviceWorker" in navigator&&location.protocol==="https:"){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}));
}
