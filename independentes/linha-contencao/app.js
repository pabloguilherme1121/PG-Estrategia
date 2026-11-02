import {createFireline,firelineAction,advanceFireline,
  toggleFirelinePause,undoFireline,getFirelineHint,FIRELINE_LEVELS,FIRELINE_MODES}
  from "./engine.mjs";
const $=id=>document.getElementById(id);
const RECORD_KEY="pg-estrategia-contencao-recordes-v1";
const VIEW_KEY="pg-estrategia-contencao-preferencias-v1";
let records={};
try{
  const value=JSON.parse(localStorage.getItem(RECORD_KEY)||"{}");
  if(value && typeof value==="object"&&!Array.isArray(value))
    records=Object.fromEntries(Object.entries(value).filter(([key,score])=>
      /^(proteger|resistir):(recruta|tatico|veterano)$/.test(key)
      &&Number.isInteger(score)&&score>0&&score<=1000));
}catch{}
try{
  const saved=JSON.parse(localStorage.getItem(VIEW_KEY)||"null");
  if(saved&&FIRELINE_MODES.includes(saved.mode))$("mode").value=saved.mode;
  if(saved&&Object.hasOwn(FIRELINE_LEVELS,saved.difficulty))$("difficulty").value=saved.difficulty;
}catch{}
const remember=()=>{
  try{localStorage.setItem(VIEW_KEY,JSON.stringify({mode:$("mode").value,difficulty:$("difficulty").value}));}catch{}
};
let state,tool="suppress";
const key=()=>state.mode+":"+state.difficulty;
function saveRecord(){
  if(state.phase!=="won"||state.score<=(records[key()]||0))return;
  records[key()]=state.score;
  try{localStorage.setItem(RECORD_KEY,JSON.stringify(records));}catch{}
}
function buildBoard(){
  const board=$("board");
  board.style.setProperty("--size",String(state.size));
  board.replaceChildren(...Array.from({length:state.size*state.size},(_,index)=>{
    const button=document.createElement("button");
    button.type="button";button.className="cell";button.dataset.cell=String(index);
    const symbol=document.createElement("span");
    symbol.className="symbol";symbol.setAttribute("aria-hidden","true");
    const number=document.createElement("span");
    number.className="cell-number";number.textContent=String(index+1);
    number.setAttribute("aria-hidden","true");
    button.append(symbol,number);return button;
  }));
}
function render(){
  const playing=state.phase==="playing";
  const active=playing&&!state.paused&&state.actionsLeft>0;
  $("phase").dataset.phase=state.phase;
  $("phase").textContent=state.phase==="won"?"Vitória":state.phase==="lost"?"Derrota":
    state.paused?"Pausado":"Em andamento";
  $("round").textContent=state.round+"/"+state.maxRounds;
  $("water").textContent=String(state.water);
  $("actions").textContent=String(state.actionsLeft);
  $("smoke").textContent=state.smoke+"/"+state.maxSmoke;
  $("communities").textContent=(state.settlements.length-state.lostSettlements.length)+"/"+state.settlements.length;
  $("record").textContent=records[key()]?records[key()]+" pontos":"Nenhum";
  $("status").textContent=state.message;
  $("tool-label").textContent="Ferramenta selecionada: "+(tool==="suppress"?"Extinguir":"Criar barreira");
  for(const button of $("board").children){
    const cell=Number(button.dataset.cell);
    const fire=state.burning.includes(cell),barrier=state.firebreaks.includes(cell),
      burnt=state.scorched.includes(cell),home=state.settlements.includes(cell),
      lost=state.lostSettlements.includes(cell);
    const status=lost?"lost":fire?"fire":barrier?"barrier":home?"home":burnt?"scorched":"green";
    button.dataset.state=status;
    button.querySelector(".symbol").textContent={
      lost:"✕",fire:"🔥",barrier:"▦",home:"⌂",scorched:"░",green:"·",
    }[status];
    const accessible={lost:"comunidade perdida",fire:"foco de incêndio",
      barrier:"barreira",home:"comunidade protegida",
      scorched:"vegetação queimada",green:"vegetação"}[status];
    button.setAttribute("aria-label","Casa "+(cell+1)+", "+accessible+".");
    button.disabled=!active||state.water===0||
      (tool==="suppress"?!fire:fire||barrier||burnt||home);
  }
  for(const button of document.querySelectorAll("[data-tool]")){
    button.disabled=!playing||state.paused;
    button.setAttribute("aria-pressed",String(tool===button.dataset.tool));
  }
  $("refill").disabled=!active||state.water>=12;
  $("advance").disabled=!playing||state.paused;
  $("pause").disabled=!playing;
  $("pause").setAttribute("aria-pressed",String(state.paused));
  $("pause").textContent=state.paused?"Retomar":"Pausar";
  $("undo").disabled=!state.history.length||state.paused||!playing;
  $("hint").disabled=!active;
}
function restart(){
  const raw=new URLSearchParams(location.search).get("seed");
  const seed=raw!==null&&/^\d{1,9}$/.test(raw)?Number(raw):0;
  state=createFireline({mode:$("mode").value,difficulty:$("difficulty").value,seed});
  tool="suppress";
  $("hint-text").textContent="Dica disponível sem custo.";
  $("bot-answer").textContent="Escolha uma pergunta para ver a resposta.";
  buildBoard();render();
}
$("board").addEventListener("click",event=>{
  const button=event.target.closest("button[data-cell]");
  if(!button)return;
  state=firelineAction(state,tool,Number(button.dataset.cell));
  render();
});
for(const button of document.querySelectorAll("[data-tool]")){
  button.addEventListener("click",()=>{tool=button.dataset.tool;render();});
}
$("new").addEventListener("click",restart);
$("mode").addEventListener("change",()=>{remember();restart();});
$("difficulty").addEventListener("change",()=>{remember();restart();});
$("refill").addEventListener("click",()=>{state=firelineAction(state,"refill");render();});
$("advance").addEventListener("click",()=>{state=advanceFireline(state);saveRecord();render();});
$("pause").addEventListener("click",()=>{state=toggleFirelinePause(state);render();});
$("undo").addEventListener("click",()=>{state=undoFireline(state);render();});
$("hint").addEventListener("click",()=>{
  const hint=getFirelineHint(state);
  if(!hint){$("hint-text").textContent="Sem dica para esta rodada. Avance quando estiver pronto.";return;}
  $("hint-text").textContent=hint.reason+(hint.cell!==null?" Casa "+(hint.cell+1)+".":"");
  if(hint.action!=="refill"){tool=hint.action;render();}
});
$("pg-bot").addEventListener("click",event=>{
  const button=event.target.closest("button[data-help]");
  if(!button)return;
  for(const item of $("pg-bot").querySelectorAll("button[data-help]"))
    item.setAttribute("aria-pressed",String(button===item));
  $("bot-answer").textContent=button.dataset.help==="controles"?
    "Selecione Extinguir ou Barreira e toque nas casas. Repor água, Avançar, Pausar e Desfazer também funcionam pelo teclado.":
    button.dataset.help==="situacao"?
      "Rodada "+state.round+" de "+state.maxRounds+
      ". Focos: "+state.burning.length+". Água: "+state.water+
      ". Fumaça: "+state.smoke+" de "+state.maxSmoke+".":state.mode==="proteger"?
      "Proteja as duas comunidades até o fim das rodadas sem ultrapassar o limite de fumaça.":
      "Salve pelo menos uma comunidade até o fim das rodadas e mantenha a fumaça abaixo do limite.";
});
restart();
if("serviceWorker" in navigator&&location.protocol==="https:")
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}));
