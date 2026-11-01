import {createTower,moveDisc,undoTower,toggleTowerPause,nextTowerHint} from "./engine.mjs";
const $=id=>document.getElementById(id);
const names=["A","B","C"];
const SAVE="pg-estrategia-torre-recordes-v1";
let state,selected=null,topic=null,feedback="",records={};
try{
 const obj=JSON.parse(localStorage.getItem(SAVE)||"{}");
 if(obj&&typeof obj==="object"&&!Array.isArray(obj))
  records=Object.fromEntries(Object.entries(obj).filter(([k,v])=>/^(transferencia|resgate):(recruta|tatico|veterano)$/.test(k)&&Number.isInteger(v)&&v>0&&v<=80));
}catch{}
function key(){return state.mode+":"+state.difficulty;}
function saveRecord(){
 if(state.phase!=="won"||records[key()]!==undefined&&records[key()]<=state.moves)return;
 records[key()]=state.moves;try{localStorage.setItem(SAVE,JSON.stringify(records));}catch{}
}
function createVisual(){
 $("platforms").replaceChildren(...names.map((name,index)=>{
  const group=document.createElement("section");group.className="platform";
  const title=document.createElement("h3");title.textContent="Plataforma "+name;
  const visual=document.createElement("div");visual.className="peg-visual";visual.setAttribute("aria-hidden","true");
  const rod=document.createElement("div");rod.className="rod";
  const stack=document.createElement("div");stack.className="stack";stack.dataset.stack=String(index);
  visual.append(rod,stack);
  const button=document.createElement("button");button.type="button";button.dataset.peg=String(index);
  button.className="peg-action";button.textContent="Selecionar "+name;
  button.addEventListener("click",event=>choose(index,event.detail===0));
  group.append(title,visual,button);
  return group;
 }));
}
function choose(index,keyboard){
 if(state.phase!=="playing"||state.paused)return;
 if(selected===null){
  if(!state.pegs[index].length){feedback="A plataforma "+names[index]+" está vazia. Escolha uma origem com discos.";render();return;}
  selected=index;feedback="Origem "+names[index]+" selecionada. Escolha a plataforma de destino.";render();return;
 }
 if(selected===index){selected=null;feedback="Origem cancelada.";render();return;}
 const old=state;
 state=moveDisc(state,selected,index);
 feedback=state===old?"Movimento inválido: somente um disco menor pode ficar sobre um maior.":"";
 selected=null;saveRecord();render();
 if(keyboard&&state.phase!=="playing")$("new").focus({preventScroll:true});
}
function answer(){
 if(topic==="controles")return "Escolha a origem e o destino com os botões A, B e C. Toque, Enter e Espaço são aceitos. Pausar bloqueia manobras e Desfazer recupera a última jogada.";
 if(topic==="situacao")return "Manobras "+state.moves+" de "+state.maxMoves+". Destino "+names[state.target]+" tem "+state.pegs[state.target].length+" de "+state.discs+" discos. "+state.notice;
 return "Transfira todos os "+state.discs+" discos até a plataforma "+names[state.target]+", movendo apenas o topo e mantendo discos menores sobre maiores.";
}
function render(){
 $("moves").textContent=state.moves+"/"+state.maxMoves;
 $("progress").textContent=state.pegs[state.target].length+"/"+state.discs;
 $("record").textContent=records[key()]===undefined?"Nenhum":records[key()]+" manobras";
 $("phase").dataset.phase=state.phase;
 $("phase").textContent=state.phase==="won"?"Vitória":state.phase==="lost"?"Derrota":state.paused?"Pausado":"Em andamento";
 $("status").textContent=feedback||state.notice;
 for(let i=0;i<3;i++){
  const stack=$("platforms").querySelector('[data-stack="'+i+'"]');
  stack.replaceChildren(...state.pegs[i].map(size=>{
   const item=document.createElement("span");item.className="disc";
   item.style.width=String(35+size/state.discs*60)+"%";
   item.textContent=String(size);item.dataset.size=String(size);
   return item;
  }));
  const button=$("platforms").querySelector('[data-peg="'+i+'"]');
  button.disabled=state.phase!=="playing"||state.paused;
  button.setAttribute("aria-label","Plataforma "+names[i]+": "+state.pegs[i].length+" discos, topo "+(state.pegs[i].at(-1)??"vazio"));
  button.setAttribute("aria-pressed",String(selected===i));
  button.textContent=selected===i?"Origem "+names[i]+" selecionada":"Selecionar "+names[i];
  $("platforms").children[i].dataset.target=String(i===state.target);
 }
 $("pause").disabled=state.phase!=="playing";
 $("pause").textContent=state.paused?"Retomar":"Pausar";
 $("pause").setAttribute("aria-pressed",String(state.paused));
 $("undo").disabled=!state.history.length;
 $("hint").disabled=state.phase!=="playing"||state.paused;
 if(topic)$("bot-answer").textContent=answer();
}
function reset(){
 const raw=new URLSearchParams(location.search).get("seed");
 const seed=raw!==null&&/^\d{1,9}$/.test(raw)?Number(raw):0;
 state=createTower({mode:$("mode").value,difficulty:$("difficulty").value,seed});
 selected=null;feedback="";topic=null;
 $("hint-text").textContent="A dica indica uma jogada legal para aproximar da vitória.";
 $("bot-answer").textContent="Selecione um assunto.";
 createVisual();render();
}
$("new").addEventListener("click",reset);
$("mode").addEventListener("change",reset);
$("difficulty").addEventListener("change",reset);
$("pause").addEventListener("click",()=>{state=toggleTowerPause(state);selected=null;feedback="";render();});
$("undo").addEventListener("click",()=>{state=undoTower(state);selected=null;feedback="";render();});
$("hint").addEventListener("click",()=>{
 const h=nextTowerHint(state);
 $("hint-text").textContent=h?"Tente mover o disco do topo de "+names[h.from]+" para "+names[h.to]+".":"Nenhuma dica disponível.";
});
$("pg-bot").addEventListener("click",event=>{
 const button=event.target.closest("[data-help]");if(!button)return;
 topic=button.dataset.help;
 for(const b of document.querySelectorAll("[data-help]"))b.setAttribute("aria-pressed",String(b===button));
 $("bot-answer").textContent=answer();
});
reset();
if("serviceWorker" in navigator&&location.protocol==="https:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}));
