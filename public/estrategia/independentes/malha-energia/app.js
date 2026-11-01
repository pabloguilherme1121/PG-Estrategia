import {createGrid,pressCell,toggleGridPause,undoGrid,revealGridHint} from "./engine.mjs";
const $=id=>document.getElementById(id);
const SAVE="pg-estrategia-malha-recordes-v1";
let state,records={};
try{
 const parsed=JSON.parse(localStorage.getItem(SAVE)||"{}");
 if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)){
  records=Object.fromEntries(Object.entries(parsed).filter(([k,v])=>/^(restaurar|desligar):(recruta|tatico|veterano)$/.test(k)&&Number.isInteger(v)&&v>0&&v<=36));
 }
}catch{}
function key(){return state.mode+":"+state.difficulty;}
function record(){
 if(state.phase!=="won"||records[key()]&&records[key()]<=state.moves)return;
 records[key()]=state.moves;
 try{localStorage.setItem(SAVE,JSON.stringify(records));}catch{}
}
function render(){
 $("moves").textContent=state.moves+"/"+state.maxMoves;
 $("progress").textContent=state.cells.filter(v=>v===state.goal).length+"/"+state.cells.length;
 $("record").textContent=records[key()]?records[key()]+" comandos":"Nenhum";
 $("phase").dataset.phase=state.phase;
 $("phase").textContent=state.phase==="won"?"Vitória":state.phase==="lost"?"Derrota":state.paused?"Pausado":"Em andamento";
 $("status").textContent=state.message;
 $("board").style.setProperty("--columns",String(state.size));
 const cells=$("board").children;
 if(cells.length!==state.cells.length){
  $("board").replaceChildren(...state.cells.map((_,index)=>{
   const button=document.createElement("button");
   button.type="button";button.className="cell";button.dataset.cell=String(index);
   button.addEventListener("click",event=>{
    const fromKeyboard=event.detail===0;
    state=pressCell(state,index);record();render();
    if(fromKeyboard){
     const candidate=$("board").children[index];
     (candidate?.disabled?$("new"):candidate)?.focus({preventScroll:true});
    }
   });
   return button;
  }));
 }
 for(let i=0;i<state.cells.length;i++){
  const b=$("board").children[i],powered=state.cells[i]===1;
  b.dataset.powered=String(powered);
  b.setAttribute("aria-label","Linha "+(Math.floor(i/state.size)+1)+", coluna "+(i%state.size+1)+", "+(powered?"ligada":"desligada"));
  b.setAttribute("aria-pressed",String(powered));
  b.textContent=powered?"●":"○";
  b.disabled=state.phase!=="playing"||state.paused;
 }
 $("pause").disabled=state.phase!=="playing";
 $("pause").textContent=state.paused?"Retomar":"Pausar";
 $("pause").setAttribute("aria-pressed",String(state.paused));
 $("undo").disabled=!state.history.length;
 $("hint").disabled=state.phase!=="playing"||state.paused;
}
function restart(){
 const raw=new URLSearchParams(location.search).get("seed");
 const seed=raw!==null&&/^\d{1,9}$/.test(raw)?Number(raw):0;
 state=createGrid({mode:$("mode").value,difficulty:$("difficulty").value,seed});
 $("hint-text").textContent="Dica disponível sem custos.";
 $("bot-answer").textContent="Escolha uma pergunta para ver a resposta.";
 render();
}
$("new").addEventListener("click",restart);
$("mode").addEventListener("change",restart);
$("difficulty").addEventListener("change",restart);
$("pause").addEventListener("click",()=>{state=toggleGridPause(state);render();});
$("undo").addEventListener("click",()=>{state=undoGrid(state);render();});
$("hint").addEventListener("click",()=>{
 const index=revealGridHint(state);
 $("hint-text").textContent=index===null?"Nenhuma dica disponível.":"Experimente linha "+(Math.floor(index/state.size)+1)+", coluna "+(index%state.size+1)+".";
});
$("pg-bot").addEventListener("click",event=>{
 const button=event.target.closest("[data-help]");if(!button)return;
 for(const b of document.querySelectorAll("[data-help]"))b.setAttribute("aria-pressed",String(b===button));
 const topic=button.dataset.help;
 $("bot-answer").textContent=topic==="controles"?"Ative um painel por toque, Enter ou Espaço. Use Pausar, Desfazer e Mostrar dica.":topic==="situacao"?"Você usou "+state.moves+" de "+state.maxMoves+" comandos. "+state.message:"A missão "+(state.mode==="restaurar"?"Restaurar":"Desligar")+" exige que todas as "+state.cells.length+" células fiquem "+(state.goal?"ligadas.":"desligadas.");
});
restart();
if("serviceWorker" in navigator&&location.protocol==="https:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}));