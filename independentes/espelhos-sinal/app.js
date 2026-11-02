import {
  createMirrorGame,rotateMirror,traceSignals,undoMirror,toggleMirrorPause,
  getMirrorHint,MIRROR_MODES,MIRROR_LEVELS,
} from "./engine.mjs";

const $=id=>document.getElementById(id);
const STORE="pg-estrategia-espelhos-recordes-v1";
const PREFS="pg-estrategia-espelhos-preferencias-v1";
let records={};
try{
  const raw=JSON.parse(localStorage.getItem(STORE)||"{}");
  if(raw&&typeof raw==="object"&&!Array.isArray(raw))
    records=Object.fromEntries(Object.entries(raw).filter(([key,score])=>
      /^(simples|duplo):(recruta|tatico|veterano)$/.test(key)&&
      Number.isInteger(score)&&score>0&&score<1000));
}catch{}
try{
  const saved=JSON.parse(localStorage.getItem(PREFS)||"null");
  if(saved&&MIRROR_MODES.includes(saved.mode))$("mode").value=saved.mode;
  if(saved&&Object.hasOwn(MIRROR_LEVELS,saved.difficulty))$("difficulty").value=saved.difficulty;
}catch{}
let state;
const recordKey=()=>state.mode+":"+state.difficulty;
function savePreferences(){
  try{localStorage.setItem(PREFS,JSON.stringify({
    mode:$("mode").value,difficulty:$("difficulty").value,
  }));}catch{}
}
function saveRecord(){
  if(state.phase!=="won"||state.score<=(records[recordKey()]||0))return;
  records[recordKey()]=state.score;
  try{localStorage.setItem(STORE,JSON.stringify(records));}catch{}
}
function terminal(label,index,active){
  const cell=document.createElement("div");
  cell.className="terminal";
  cell.dataset.active=String(active);
  cell.dataset.index=String(index);
  cell.textContent=active?label:"·";
  return cell;
}
function buildBoard(){
  const board=$("board");
  board.style.setProperty("--size",String(state.size));
  board.replaceChildren(...Array.from({length:state.size*state.size},(_,i)=>{
    const button=document.createElement("button");
    button.type="button";button.className="cell";button.dataset.cell=String(i);
    const glyph=document.createElement("span");
    glyph.className="mirror-shape";glyph.setAttribute("aria-hidden","true");
    const number=document.createElement("span");
    number.className="cell-num";number.textContent=String(i+1);
    number.setAttribute("aria-hidden","true");
    button.append(glyph,number);
    return button;
  }));
  for(const [slot,list,label] of [
    ["emitters",state.emitters,"↓"],["targets",state.targets,"◎"],
  ]){
    const element=$(slot);
    element.style.setProperty("--size",String(state.size));
    element.replaceChildren(...Array.from({length:state.size},(_,i)=>
      terminal(label,i,list.includes(i))));
  }
}
function render(){
  const {reached,hits,paths}=traceSignals(state);
  const beamCells=new Set(paths.flat());
  const mirrors=new Map(state.mirrors.map(m=>[m.cell,m]));
  const available=state.phase==="playing"&&!state.paused;
  $("phase").dataset.phase=state.phase;
  $("phase").textContent=state.phase==="won"?"Vitória":state.phase==="lost"?"Derrota":
    state.paused?"Pausado":"Em andamento";
  $("moves").textContent=state.moves+"/"+state.maxMoves;
  $("reached").textContent=reached+"/"+state.targets.length;
  $("record").textContent=records[recordKey()]?records[recordKey()]+" pontos":"Nenhum";
  $("status").textContent=state.message;
  for(const button of $("board").children){
    const cell=Number(button.dataset.cell),mirror=mirrors.get(cell);
    button.dataset.beam=String(beamCells.has(cell));
    button.dataset.mirror=String(Boolean(mirror));
    button.dataset.critical=String(Boolean(mirror?.critical));
    button.querySelector(".mirror-shape").textContent=mirror?.slant??(beamCells.has(cell)?"•":"·");
    button.disabled=!available||!mirror;
    button.setAttribute("aria-label",mirror?
      "Espelho na casa "+(cell+1)+", orientação "+
        (mirror.slant==="/"?"barra":"barra invertida")+". Girar.":
      "Casa "+(cell+1)+(beamCells.has(cell)?", feixe passando.":", vazia."));
  }
  for(const terminal of $("targets").children){
    const index=state.targets.indexOf(Number(terminal.dataset.index));
    if(index<0)continue;
    terminal.dataset.reached=String(Boolean(hits[index]));
    terminal.textContent=hits[index]?"✓":"◎";
    terminal.setAttribute("aria-label","Receptor "+(index+1)+
      (hits[index]?", sinal recebido.":", aguardando sinal."));
  }
  $("undo").disabled=!available||!state.history.length;
  $("hint").disabled=!available;
  $("pause").disabled=state.phase!=="playing";
  $("pause").setAttribute("aria-pressed",String(state.paused));
  $("pause").textContent=state.paused?"Retomar":"Pausar";
}
function restart(){
  const raw=new URLSearchParams(location.search).get("seed");
  const seed=raw!==null&&/^\d{1,9}$/.test(raw)?Number(raw):0;
  state=createMirrorGame({mode:$("mode").value,difficulty:$("difficulty").value,seed});
  $("hint-text").textContent="Uma dica pode indicar o próximo espelho.";
  $("bot-answer").textContent="Selecione uma pergunta.";
  buildBoard();render();
}
$("board").addEventListener("click",event=>{
  const button=event.target.closest("button[data-cell]");
  if(!button)return;
  state=rotateMirror(state,Number(button.dataset.cell));
  saveRecord();render();
});
$("new").addEventListener("click",restart);
$("mode").addEventListener("change",()=>{savePreferences();restart();});
$("difficulty").addEventListener("change",()=>{savePreferences();restart();});
$("undo").addEventListener("click",()=>{state=undoMirror(state);render();});
$("pause").addEventListener("click",()=>{state=toggleMirrorPause(state);render();});
$("hint").addEventListener("click",()=>{
  const hint=getMirrorHint(state);
  $("hint-text").textContent=hint?
    hint.reason+" Casa "+(hint.cell+1)+".":"Nenhuma mudança adicional necessária.";
  if(hint){
    const button=$("board").querySelector('[data-cell="'+hint.cell+'"]');
    button?.focus({preventScroll:true});
  }
});
$("pg-bot").addEventListener("click",event=>{
  const button=event.target.closest("button[data-help]");
  if(!button)return;
  for(const item of $("pg-bot").querySelectorAll("button[data-help]"))
    item.setAttribute("aria-pressed",String(item===button));
  $("bot-answer").textContent=button.dataset.help==="controles"?
    "Toque nos espelhos para alternar entre barra e barra invertida. Também há Pausar, Desfazer e Pedir dica. Tab e Enter funcionam.":
    button.dataset.help==="situacao"?
      "Giros: "+state.moves+" de "+state.maxMoves+
        ". Receptores recebendo sinal: "+traceSignals(state).reached+
        " de "+state.targets.length+".":
      state.mode==="duplo"?
        "Conduza os dois feixes aos dois receptores antes de esgotar os giros.":
        "Conduza o feixe ao receptor na base antes de esgotar os giros.";
});
restart();
if("serviceWorker" in navigator&&location.protocol==="https:")
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}));
