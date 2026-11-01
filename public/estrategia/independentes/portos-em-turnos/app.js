import {createHarbor,dispatchHarbor,waitHarbor,undoHarbor,pauseHarbor,hintHarbor,HARBOR_BERTHS} from "./engine.mjs";
const $=id=>document.getElementById(id),CONFIG="pg-estrategia-portos-config-v1",RECORD="pg-estrategia-portos-record-v1";
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}};
const saved=read(CONFIG),loaded=read(RECORD),records=loaded&&typeof loaded==="object"&&!Array.isArray(loaded)?loaded:{};
if(["prazo","economia"].includes(saved?.mode))$("mode").value=saved.mode;
if(["recruta","tatico","veterano"].includes(saved?.difficulty))$("difficulty").value=saved.difficulty;
const candidate=Number(new URLSearchParams(location.search).get("seed")??0);
const seed=Number.isSafeInteger(candidate)&&candidate>=0&&candidate<=999999999?candidate:0;
let game;
const key=()=>game.mode+":"+game.difficulty;
const names={profundo:"Profundo",costeiro:"Costeiro"};
function saveRecord(){
 if(game.phase!=="won")return;
 const old=records[key()];
 if(Number.isInteger(old)&&old>=game.score)return;
 records[key()]=game.score;
 try{localStorage.setItem(RECORD,JSON.stringify(records));}catch{}
}
function render(){
 $("clock").textContent=game.clock+"h";
 $("count").textContent=game.completed.length+"/"+game.ships.length;
 $("phase").textContent=game.phase==="won"?"Vitória":game.phase==="lost"?"Derrota":game.paused?"Pausado":"Em andamento";
 $("record").textContent=Number.isInteger(records[key()])?records[key()]+" pontos":"Nenhum";
 $("status-text").textContent=game.message;
 $("pause").textContent=game.paused?"Retomar":"Pausar";
 $("pause").disabled=game.phase!=="playing";
 $("wait").disabled=game.phase!=="playing"||game.paused;
 $("undo").disabled=game.paused||!game.history.length;
 $("hint").disabled=game.phase!=="playing"||game.paused;
 const berths=document.createDocumentFragment();
 for(const berth of HARBOR_BERTHS){
  const box=document.createElement("div");box.className="berth";
  const header=document.createElement("strong");header.textContent="Cais "+names[berth];
  const detail=document.createElement("span"),assignment=game.active[berth];
  detail.textContent=assignment?assignment.id+" · "+assignment.remaining+"h restantes":"Livre para receber navios";
  box.dataset.busy=String(Boolean(assignment));box.append(header,detail);berths.append(box);
 }
 $("berths").replaceChildren(berths);
 const fragment=document.createDocumentFragment();
 for(const ship of game.ships){
  const done=game.completed.includes(ship.id),current=HARBOR_BERTHS.find(b=>game.active[b]?.id===ship.id);
  const item=document.createElement("li");item.className="ship";item.dataset.done=String(done);item.dataset.ship=ship.id;
  const info=document.createElement("div"),heading=document.createElement("strong"),details=document.createElement("small");
  heading.textContent=ship.id+" · carga "+ship.cargo;
  details.textContent="Chega "+ship.arrival+"h · Ocupa "+ship.duration+"h · Prazo "+ship.deadline+"h";
  info.append(heading,details);
  const actions=document.createElement("div");actions.className="ship-actions";
  if(done||current){
   const status=document.createElement("span");status.className="ship-status";
   status.textContent=done?"Entregue":"Em atendimento ("+names[current]+")";actions.append(status);
  }else for(const berth of HARBOR_BERTHS){
   if(ship.cargo==="pesada"&&berth==="costeiro")continue;
   const button=document.createElement("button");button.type="button";button.dataset.berth=berth;button.dataset.ship=ship.id;
   button.textContent=names[berth];button.setAttribute("aria-label","Despachar "+ship.id+" no cais "+names[berth]);
   button.disabled=ship.arrival>game.clock||Boolean(game.active[berth])||game.phase!=="playing"||game.paused;
   actions.append(button);
  }
  item.append(info,actions);fragment.append(item);
 }
 $("fleet").replaceChildren(fragment);
}
function restart(){
 game=createHarbor({mode:$("mode").value,difficulty:$("difficulty").value,seed});
 try{localStorage.setItem(CONFIG,JSON.stringify({mode:game.mode,difficulty:game.difficulty}));}catch{}
 $("hint-text").textContent="";render();
}
function step(next){
 if(next===game){$("hint-text").textContent="Esta operação não está disponível.";return;}
 game=next;$("hint-text").textContent="";saveRecord();render();
}
$("fleet").addEventListener("click",event=>{
 const button=event.target.closest("button[data-ship][data-berth]");
 if(button)step(dispatchHarbor(game,button.dataset.ship,button.dataset.berth));
});
$("wait").addEventListener("click",()=>step(waitHarbor(game)));
$("undo").addEventListener("click",()=>{game=undoHarbor(game);$("hint-text").textContent="";render();});
$("pause").addEventListener("click",()=>{game=pauseHarbor(game);render();});
$("reset").addEventListener("click",restart);
$("mode").addEventListener("change",restart);$("difficulty").addEventListener("change",restart);
$("hint").addEventListener("click",()=>{
 const action=hintHarbor(game),ship=action==="wait"||!action?null:game.ships.find(item=>item.id===action.id);
 $("hint-text").textContent=action===null?"Não há programação vencedora a partir deste estado. Desfaça uma ação ou reinicie.":
  action==="wait"?"Dica: avance uma hora para concluir operações ou receber novos navios.":
  "Dica: envie "+ship.id+" ao cais "+names[action.berth]+" antes do prazo "+ship.deadline+"h.";
});
document.querySelectorAll("[data-bot]").forEach(button=>button.addEventListener("click",()=>{
 const pending=game.ships.length-game.completed.length;
 $("bot-answer").textContent=button.dataset.bot==="situation"?
  "Faltam "+pending+" entregas, relógio em "+game.clock+"h. "+HARBOR_BERTHS.map(b=>names[b]+": "+(game.active[b]?.id??"livre")).join("; ")+". ":"";
 if(button.dataset.bot==="strategy")
  $("bot-answer").textContent="Use os dois cais em paralelo. Carga pesada só cabe no Profundo. Compare chegada, duração e prazo; a dica pesquisa uma programação vencedora com ocupação simultânea.";
 if(button.dataset.bot==="controls")
  $("bot-answer").textContent="Despache cada navio para um cais compatível, avance o relógio em Aguardar 1 hora, use Pausar ou Desfazer. O modo Economia penaliza cais totalmente ocioso com navios disponíveis.";
}));
restart();
if("serviceWorker" in navigator&&window.isSecureContext)
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}),{once:true});
