import {createBridges,toggleBridge,undoBridge,toggleBridgePause,nextBridgeHint} from "./engine.mjs";
const $=id=>document.getElementById(id);
const RECORD_KEY="pg-estrategia-pontes-recordes-v1";
let state,topic=null,records={};
try{
 const obj=JSON.parse(localStorage.getItem(RECORD_KEY)||"{}");
 if(obj&&typeof obj==="object"&&!Array.isArray(obj))records=Object.fromEntries(Object.entries(obj).filter(([k,v])=>/^(conexao|redundancia):(recruta|tatico|veterano)$/.test(k)&&Number.isInteger(v)&&v>=0&&v<=100));
}catch{}
const nameOf=index=>"Ilha "+(index+1);
function bestKey(){return state.mode+":"+state.difficulty;}
function saveRecord(){
 if(state.phase!=="won")return;
 const remaining=state.budget-state.spent;
 if(records[bestKey()]===undefined||records[bestKey()]<remaining){
  records[bestKey()]=remaining;
  try{localStorage.setItem(RECORD_KEY,JSON.stringify(records));}catch{}
 }
}
const NS="http://www.w3.org/2000/svg";
function element(tag,attributes,text){
 const node=document.createElementNS(NS,tag);
 for(const [k,v] of Object.entries(attributes??{}))node.setAttribute(k,String(v));
 if(text!==undefined)node.textContent=text;
 return node;
}
function draw(){
 const graphic=$("map");
 const edgeNodes=state.edges.map(edge=>{
  const a=state.islands[edge.a],b=state.islands[edge.b],chosen=state.selected.includes(edge.id);
  const group=element("g",{"data-bridge":edge.id,"data-active":String(chosen)});
  group.append(element("line",{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:chosen?"#bdfc8c":"#6b91a8","stroke-width":chosen?2.3:0.9,"stroke-linecap":"round","stroke-dasharray":chosen?"none":"2 2"}));
  return group;
 });
 const islands=state.islands.map(island=>{
  const group=element("g");
  group.append(element("circle",{cx:island.x,cy:island.y,r:4.3,fill:"#244f69",stroke:"#d5ff9b","stroke-width":1}));
  group.append(element("text",{x:island.x,y:island.y+1.2,fill:"#fff","font-size":3.2,"font-weight":800,"text-anchor":"middle"},island.id+1));
  return group;
 });
 graphic.replaceChildren(...edgeNodes,...islands);
}
function showBot(){
 if(topic==="controles")return "Use os botões de ponte. Enter, Espaço e toque funcionam. Ação selecionada remove a ponte, recuperando créditos. Desfazer recupera a decisão anterior.";
 if(topic==="situacao")return "Créditos "+state.spent+" de "+state.budget+"; "+state.selected.length+" pontes ativas e "+state.moves+" comandos usados. "+state.notice;
 return state.mode==="conexao"?"Ligue todas as "+state.islands.length+" ilhas em uma rede, dentro do orçamento.":"Mantenha todas as ilhas conectadas mesmo se qualquer uma das pontes ficar indisponível.";
}
function makeControls(){
 const holder=$("bridges");
 holder.replaceChildren(...state.edges.map(edge=>{
  const btn=document.createElement("button");
  btn.type="button";btn.className="bridge-button";btn.dataset.edge=edge.id;
  btn.addEventListener("click",event=>{
   const keyboard=event.detail===0;
   state=toggleBridge(state,edge.id);
   saveRecord();render();
   if(keyboard&&state.phase!=="playing")$("new").focus({preventScroll:true});
  });
  return btn;
 }));
}
function render(){
 $("spent").textContent=state.spent+"/"+state.budget;
 $("moves").textContent=state.moves+"/"+state.maxMoves;
 $("active").textContent=String(state.selected.length);
 $("record").textContent=records[bestKey()]===undefined?"Nenhum":records[bestKey()]+" créditos restantes";
 $("phase").dataset.phase=state.phase;
 $("phase").textContent=state.phase==="won"?"Vitória":state.phase==="lost"?"Derrota":state.paused?"Pausado":"Em andamento";
 $("status").textContent=state.notice;
 for(const edge of state.edges){
  const b=$("bridges").querySelector('[data-edge="'+edge.id+'"]');
  const selected=state.selected.includes(edge.id);
  b.textContent=nameOf(edge.a)+" ↔ "+nameOf(edge.b)+" · "+edge.cost+" créditos"+(selected?" · Remover":"");
  b.setAttribute("aria-pressed",String(selected));
  b.disabled=state.phase!=="playing"||state.paused||(!selected&&state.spent+edge.cost>state.budget);
  b.dataset.active=String(selected);
 }
 $("pause").disabled=state.phase!=="playing";
 $("pause").textContent=state.paused?"Retomar":"Pausar";
 $("pause").setAttribute("aria-pressed",String(state.paused));
 $("undo").disabled=!state.history.length;
 $("hint").disabled=state.phase!=="playing"||state.paused;
 if(topic)$("bot-answer").textContent=showBot();
 draw();
}
function restart(){
 const raw=new URLSearchParams(location.search).get("seed");
 const seed=raw!==null&&/^\d{1,9}$/.test(raw)?Number(raw):0;
 state=createBridges({mode:$("mode").value,difficulty:$("difficulty").value,seed});
 topic=null;$("bot-answer").textContent="Escolha uma pergunta.";
 $("hint-text").textContent="Você pode solicitar uma dica sem gastar créditos.";
 makeControls();render();
}
$("new").addEventListener("click",restart);
$("mode").addEventListener("change",restart);
$("difficulty").addEventListener("change",restart);
$("pause").addEventListener("click",()=>{state=toggleBridgePause(state);render();});
$("undo").addEventListener("click",()=>{state=undoBridge(state);render();});
$("hint").addEventListener("click",()=>{
 const id=nextBridgeHint(state);
 const edge=state.edges.find(e=>e.id===id);
 $("hint-text").textContent=edge?"Considere a ponte entre "+nameOf(edge.a)+" e "+nameOf(edge.b)+".":"Retire uma ponte cara para recuperar créditos ou inicie outra partida.";
});
$("pg-bot").addEventListener("click",event=>{
 const b=event.target.closest("[data-help]");
 if(!b)return;
 topic=b.dataset.help;
 for(const btn of document.querySelectorAll("[data-help]"))btn.setAttribute("aria-pressed",String(btn===b));
 $("bot-answer").textContent=showBot();
});
restart();
if("serviceWorker"in navigator&&location.protocol==="https:")window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}));