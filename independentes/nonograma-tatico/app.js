import {createNonogram,playNonogram,undoNonogram,pauseNonogram,hintNonogram} from "./engine.mjs";
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),raw=Number(params.get("seed")??0);
const seed=Number.isSafeInteger(raw)&&raw>=0&&raw<=999999999?raw:0;
const STORAGE="pg-estrategia-nonograma-preferencias-v1";
try{const saved=JSON.parse(localStorage.getItem(STORAGE)||"null");if(["exploracao","precisao"].includes(saved?.mode))$("mode").value=saved.mode;if(["recruta","tatico","veterano"].includes(saved?.difficulty))$("difficulty").value=saved.difficulty;}catch{}
let state,tool="fill";
const format=values=>values.join(" ");
function draw(){
 const root=$("puzzle"),size=state.size,grid=document.createDocumentFragment();
 root.style.gridTemplateColumns="minmax(55px,auto) repeat("+size+",minmax(38px,44px))";
 const corner=document.createElement("div");corner.className="clue corner";corner.textContent="↘";grid.append(corner);
 for(let c=0;c<size;c++){const clue=document.createElement("div");clue.className="clue column";clue.textContent=format(state.columns[c]);clue.setAttribute("aria-label","Coluna "+(c+1)+": "+format(state.columns[c]));grid.append(clue);}
 for(let r=0;r<size;r++){
  const clue=document.createElement("div");clue.className="clue row";clue.textContent=format(state.rows[r]);clue.setAttribute("aria-label","Linha "+(r+1)+": "+format(state.rows[r]));grid.append(clue);
  for(let c=0;c<size;c++){
   const i=r*size+c,mark=state.marks[i],button=document.createElement("button");
   button.type="button";button.className="tile";button.dataset.mark=mark??"unknown";button.dataset.index=String(i);
   button.textContent=mark==="fill"?"◆":mark==="empty"?"×":"·";
   button.setAttribute("aria-label","Linha "+(r+1)+", coluna "+(c+1)+": "+(mark==="fill"?"preenchida":mark==="empty"?"descartada":"desconhecida"));
   button.disabled=state.paused||state.phase!=="playing";grid.append(button);
  }
 }
 const active=document.activeElement,focusIndex=active?.dataset?.index;
 root.replaceChildren(grid);
 if(focusIndex!==undefined)root.querySelector('[data-index="'+focusIndex+'"]')?.focus({preventScroll:true});
 $("moves").textContent=state.moves+"/"+state.maxMoves;
 $("errors").textContent=state.mode==="precisao"?state.errors+"/"+state.maxErrors:String(state.errors);
 $("correct").textContent=state.marks.filter((mark,i)=>mark!==null&&((mark==="fill")===state.solution[i])).length+"/"+state.marks.length;
 $("phase").textContent=state.phase==="won"?"Vitória":state.phase==="lost"?"Derrota":state.paused?"Pausado":"Em andamento";
 $("status-text").textContent=state.message;
 $("pause").textContent=state.paused?"Retomar":"Pausar";$("pause").disabled=state.phase!=="playing";
 $("undo").disabled=state.paused||state.phase!=="playing"||!state.history.length;
 $("hint").disabled=state.paused||state.phase!=="playing";
 for(const name of ["fill","empty"])$(""+name).setAttribute("aria-pressed",String(tool===name));
}
function restart(){state=createNonogram({mode:$("mode").value,difficulty:$("difficulty").value,seed});try{localStorage.setItem(STORAGE,JSON.stringify({mode:state.mode,difficulty:state.difficulty}));}catch{}$("hint-text").textContent="";draw();}
function select(next){tool=next;draw();}
$("fill").addEventListener("click",()=>select("fill"));
$("empty").addEventListener("click",()=>select("empty"));
$("puzzle").addEventListener("click",event=>{const btn=event.target.closest("button[data-index]");if(!btn)return;state=playNonogram(state,Number(btn.dataset.index),tool);$("hint-text").textContent="";draw();});
$("puzzle").addEventListener("keydown",event=>{
 const button=event.target.closest("button[data-index]");if(!button)return;
 const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-state.size,ArrowDown:state.size}[event.key];
 if(delta===undefined)return;
 const index=Number(button.dataset.index),next=index+delta;
 if(next<0||next>=state.marks.length||Math.abs(delta)===1&&Math.floor(index/state.size)!==Math.floor(next/state.size))return;
 event.preventDefault();$("puzzle").querySelector('[data-index="'+next+'"]')?.focus();
});
$("mode").addEventListener("change",restart);$("difficulty").addEventListener("change",restart);
$("reset").addEventListener("click",restart);
$("pause").addEventListener("click",()=>{state=pauseNonogram(state);draw();});
$("undo").addEventListener("click",()=>{state=undoNonogram(state);draw();});
$("hint").addEventListener("click",()=>{
 const hint=hintNonogram(state);if(!hint)return;
 $("hint-text").textContent="Sugestão: linha "+(Math.floor(hint.index/state.size)+1)+", coluna "+(hint.index%state.size+1)+", "+(hint.mark==="fill"?"preencher":"descartar")+".";
 $("puzzle").querySelector('[data-index="'+hint.index+'"]')?.focus();
});
document.querySelectorAll("[data-bot]").forEach(button=>button.addEventListener("click",()=>{
 const type=button.dataset.bot;
 $("bot-answer").textContent=type==="situation"?"Você resolveu "+state.marks.filter(v=>v!==null).length+" de "+state.marks.length+" casas, com "+state.errors+" erros.":type==="strategy"?"Compare as pistas de uma linha com as colunas cruzadas. Blocos distintos precisam de pelo menos uma casa vazia.":"Selecione Preencher ou Descartar e toque nas casas. Use Tab para navegar, setas para mover o foco, Enter para marcar, Desfazer e Pausar.";
}));
restart();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}),{once:true});
