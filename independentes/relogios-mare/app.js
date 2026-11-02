import {createTides,rotateTide,undoTide,pauseTide,hintTides} from "./engine.mjs";
const $=id=>document.getElementById(id),PREF="pg-estrategia-relogios-config-v1",SAVE="pg-estrategia-relogios-recordes-v1";
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}};
const pref=read(PREF),saved=read(SAVE),records=saved&&typeof saved==="object"&&!Array.isArray(saved)?saved:{};
if(["linha","anel"].includes(pref?.mode))$("mode").value=pref.mode;
if(["recruta","tatico","veterano"].includes(pref?.difficulty))$("difficulty").value=pref.difficulty;
const raw=Number(new URLSearchParams(location.search).get("seed")??0),seed=Number.isSafeInteger(raw)&&raw>=0&&raw<=999999999?raw:0;
let state;
const recordKey=()=>state.mode+":"+state.difficulty;
function record(){if(state.phase!=="won")return;const old=records[recordKey()];if(Number.isInteger(old)&&old>=state.score)return;records[recordKey()]=state.score;try{localStorage.setItem(SAVE,JSON.stringify(records));}catch{}}
function render(){
 const current=document.activeElement?.dataset?.clock;
 $("moves").textContent=state.moves+"/"+state.limit;
 $("aligned").textContent=state.ticks.filter(t=>t===0).length+"/"+state.size;
 $("phase").textContent=state.phase==="won"?"Vitória":state.phase==="lost"?"Derrota":state.paused?"Pausado":"Em andamento";
 $("record").textContent=Number.isInteger(records[recordKey()])?records[recordKey()]+" pontos":"Nenhum";
 $("status-text").textContent=state.message;
 $("pause").textContent=state.paused?"Retomar":"Pausar";
 $("pause").disabled=state.phase!=="playing";$("undo").disabled=state.phase!=="playing"||state.paused||!state.history.length;
 $("hint").disabled=state.phase!=="playing"||state.paused;
 const fragment=document.createDocumentFragment();
 state.ticks.forEach((tick,index)=>{const b=document.createElement("button");b.type="button";b.className="clock";b.dataset.clock=String(index);b.dataset.value=String(tick);
 b.textContent=String(tick);b.setAttribute("aria-label","Relógio "+(index+1)+": "+tick+", avançar");
 b.disabled=state.phase!=="playing"||state.paused;
 b.addEventListener("click",()=>{state=rotateTide(state,index);$("hint-text").textContent="";record();render();});
 fragment.append(b);});
 $("board").replaceChildren(fragment);
 if(current!==undefined)$("board").querySelector('[data-clock="'+current+'"]')?.focus({preventScroll:true});
}
function restart(){state=createTides({mode:$("mode").value,difficulty:$("difficulty").value,seed});$("hint-text").textContent="";
 try{localStorage.setItem(PREF,JSON.stringify({mode:state.mode,difficulty:state.difficulty}));}catch{}render();}
$("mode").addEventListener("change",restart);$("difficulty").addEventListener("change",restart);
$("reset").addEventListener("click",restart);
$("undo").addEventListener("click",()=>{state=undoTide(state);render();});
$("pause").addEventListener("click",()=>{state=pauseTide(state);render();});
$("hint").addEventListener("click",()=>{const index=hintTides(state);$("hint-text").textContent=index===null?"Não há rota vencedora restante. Reinicie a partida.":"Dica: toque no relógio "+(index+1)+".";if(index!==null)$("board").querySelector('[data-clock="'+index+'"]')?.focus({preventScroll:true});});
document.querySelectorAll("[data-bot]").forEach(button=>button.addEventListener("click",()=>{
 $("bot-answer").textContent=button.dataset.bot==="situation"?"Você alinhou "+state.ticks.filter(t=>t===0).length+" de "+state.size+" relógios. Restam "+(state.limit-state.moves)+" movimentos.":button.dataset.bot==="strategy"?"Considere que cada toque aumenta o valor atual e dos vizinhos em uma unidade. Use Pedir dica para calcular um passo rumo ao alinhamento.":"Toque nos relógios, use Tab e Enter no teclado, Desfazer para voltar um movimento e Pausar para bloquear o painel.";
}));restart();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}),{once:true});