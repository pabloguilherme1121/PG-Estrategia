import {newCrossing,moveCrossing,undoCrossing,toggleCrossingPause,hintCrossing} from "./engine.mjs";
const $=id=>document.getElementById(id),PREF="pg-estrategia-vale-config-v1",SAVE="pg-estrategia-vale-recordes-v1";
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}};
const pref=read(PREF),saved=read(SAVE),records=saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};
if(["classico","expedicao"].includes(pref?.mode))$("mode").value=pref.mode;
if(["recruta","tatico","veterano"].includes(pref?.difficulty))$("difficulty").value=pref.difficulty;
const LABEL={lobo:"Lobo",cabra:"Cabra",repolho:"Repolho",ferramentas:"Ferramentas",remedios:"Remédios"};
let state,selected=new Set();
const recordKey=()=>state.mode+":"+state.difficulty;
function saveRecord(){
 if(state.phase!=="won")return;
 const key=recordKey(),old=records[key];
 if(Number.isInteger(old)&&old>=state.score)return;
 records[key]=state.score;try{localStorage.setItem(SAVE,JSON.stringify(records));}catch{}
}
function render(){
 $("moves").textContent=String(state.moves);
 $("limit").textContent=String(state.limit);
 $("delivered").textContent=state.right.length+"/"+state.items.length;
 $("capacity").textContent=String(state.capacity);
 $("boat").textContent=state.bank===0?"Balsa na margem inicial":"Balsa na margem final";
 $("record").textContent=Number.isInteger(records[recordKey()])?records[recordKey()]+" pontos":"Nenhum";
 $("phase").textContent=state.phase==="won"?"Vitória":state.phase==="lost"?"Derrota":state.paused?"Pausado":"Em andamento";
 $("status-text").textContent=state.message;
 $("selection").textContent=selected.size?"Na balsa: "+[...selected].map(x=>LABEL[x]).join(", "):"Balsa vazia, piloto sozinho.";
 $("pause").textContent=state.paused?"Retomar":"Pausar";
 $("pause").disabled=state.phase!=="playing";$("undo").disabled=state.phase!=="playing"||state.paused||!state.history.length;
 $("hint").disabled=state.phase!=="playing"||state.paused;$("cross").disabled=state.phase!=="playing"||state.paused;
 for(const [bank,id] of [[0,"left"],[1,"right"]]){
  const fragment=document.createDocumentFragment();
  for(const item of state.items.filter(x=>state.right.includes(x)===(bank===1))){
   const b=document.createElement("button");b.type="button";b.textContent=LABEL[item];b.dataset.passenger=item;
   b.setAttribute("aria-pressed",String(selected.has(item)));
   b.disabled=state.bank!==bank||state.phase!=="playing"||state.paused;
   b.addEventListener("click",()=>{
    if(selected.has(item))selected.delete(item);else if(selected.size<state.capacity)selected.add(item);
    render();
   });
   fragment.append(b);
  }
  $(id).replaceChildren(fragment);
 }
}
function transit(passengers){
 const next=moveCrossing(state,passengers);
 if(next===state){$("hint-text").textContent="Travessia inválida: verifique a capacidade e os pares sem supervisão.";return;}
 state=next;selected.clear();$("hint-text").textContent="";saveRecord();render();
}
function restart(){
 state=newCrossing({mode:$("mode").value,difficulty:$("difficulty").value});selected.clear();
 try{localStorage.setItem(PREF,JSON.stringify({mode:state.mode,difficulty:state.difficulty}));}catch{}
 $("hint-text").textContent="";render();
}
$("mode").addEventListener("change",restart);$("difficulty").addEventListener("change",restart);
$("cross").addEventListener("click",()=>transit([...selected]));
$("pause").addEventListener("click",()=>{state=toggleCrossingPause(state);render();});
$("undo").addEventListener("click",()=>{state=undoCrossing(state);selected.clear();render();});
$("reset").addEventListener("click",restart);
$("hint").addEventListener("click",()=>{
 const hint=hintCrossing(state);
 if(!hint){$("hint-text").textContent="Sem solução com os turnos restantes. Reinicie a partida.";return;}
 selected=new Set(hint);$("hint-text").textContent=hint.length?"Dica: leve "+hint.map(x=>LABEL[x]).join(" e ")+".":"Dica: volte sozinho.";render();
});
document.querySelectorAll("[data-bot]").forEach(b=>b.addEventListener("click",()=>{
 $("bot-answer").textContent=b.dataset.bot==="situation"?"Balsa na margem "+(state.bank===0?"inicial":"final")+", "+state.right.length+" de "+state.items.length+" transportados, "+(state.limit-state.moves)+" turnos disponíveis.":b.dataset.bot==="strategy"?"O piloto precisa separar lobo e cabra, ou cabra e repolho, sempre que sair de uma margem. Às vezes é preciso devolver passageiros.":"Toque nos passageiros ao lado da balsa e escolha Atravessar. O piloto pode cruzar vazio. Desfazer recupera a etapa anterior. Tudo fica salvo apenas neste aparelho.";
}));
restart();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}),{once:true});