import {createStealth,moveStealth,undoStealth,pauseStealth,hintStealth,spotStealth} from "./engine.mjs";
const $=id=>document.getElementById(id),PREF="pg-estrategia-sombras-config-v1",SAVE="pg-estrategia-sombras-record-v1";
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}};
const pref=read(PREF),stored=read(SAVE),records=stored&&typeof stored==="object"&&!Array.isArray(stored)?stored:{};
if(["cautela","alerta"].includes(pref?.mode))$("mode").value=pref.mode;
if(["recruta","tatico","veterano"].includes(pref?.difficulty))$("difficulty").value=pref.difficulty;
const candidateSeed=Number(new URLSearchParams(location.search).get("seed")??0);
const seed=Number.isSafeInteger(candidateSeed)&&candidateSeed>=0&&candidateSeed<=999999999?candidateSeed:0;
const ACTION_LABELS={north:"Norte",east:"Leste",south:"Sul",west:"Oeste",wait:"Esperar"};
let game;
function key(){return game.mode+":"+game.difficulty;}
function saveRecord(){
 if(game.phase!=="won")return;
 const old=records[key()];
 if(Number.isInteger(old)&&old>=game.score)return;
 records[key()]=game.score;
 try{localStorage.setItem(SAVE,JSON.stringify(records));}catch{}
}
function render(){
 $("turn").textContent=game.turn+"/"+game.limit;
 $("intel").textContent=game.hasIntel?"Obtido":"Pendente";
 $("record").textContent=Number.isInteger(records[key()])?records[key()]+" pontos":"Nenhum";
 $("phase").textContent=game.phase==="won"?"Vitória":game.phase==="lost"?"Derrota":game.paused?"Pausado":"Em andamento";
 $("status-text").textContent=game.message;
 $("pause").textContent=game.paused?"Retomar":"Pausar";
 $("pause").disabled=game.phase!=="playing";
 $("undo").disabled=game.phase!=="playing"||game.paused||game.history.length===0;
 $("hint").disabled=game.phase!=="playing"||game.paused;
 for(const button of document.querySelectorAll("[data-move]"))
  button.disabled=game.phase!=="playing"||game.paused;
 const wallSet=new Set(game.walls.map(([x,y])=>x+","+y));
 const fragment=document.createDocumentFragment(),board=$("board");
 board.style.setProperty("--size",String(game.size));
 for(let y=0;y<game.size;y++)for(let x=0;x<game.size;x++){
  const wall=wallSet.has(x+","+y),atAgent=game.player.x===x&&game.player.y===y;
  const guard=game.guards.find(g=>g.x===x&&g.y===y);
  const isIntel=game.intel.x===x&&game.intel.y===y&&!game.hasIntel;
  const atExit=game.exit.x===x&&game.exit.y===y;
  const spotted=!wall&&spotStealth(game,{x,y},game.turn);
  const cell=document.createElement("div");
  cell.className="tile";cell.setAttribute("role","gridcell");
  cell.dataset.wall=String(wall);cell.dataset.seen=String(spotted);
  cell.dataset.agent=String(atAgent);cell.dataset.guard=String(Boolean(guard));
  cell.dataset.intel=String(isIntel);cell.dataset.exit=String(atExit);
  const facing=guard?["Norte","Leste","Sul","Oeste"][(game.turn+guard.offset)%4]:null;
  const descriptor=wall?"Parede":atAgent?"Agente":guard?"Patrulha voltada para "+facing:isIntel?"Documento":atExit?"Saída":spotted?"Área observada":"Livre";
  cell.setAttribute("aria-label","Coluna "+(x+1)+", linha "+(y+1)+": "+descriptor);
  cell.textContent=atAgent?"A":guard?"P":isIntel?"D":atExit?"S":spotted?"!":"";
  fragment.append(cell);
 }
 board.replaceChildren(fragment);
}
function restart(){
 game=createStealth({mode:$("mode").value,difficulty:$("difficulty").value,seed});
 try{localStorage.setItem(PREF,JSON.stringify({mode:game.mode,difficulty:game.difficulty}));}catch{}
 $("hint-text").textContent="";
 render();
}
function step(action){
 const next=moveStealth(game,action);
 if(next===game){$("hint-text").textContent="Movimento bloqueado ou inválido.";return;}
 game=next;$("hint-text").textContent="";
 saveRecord();render();
}
document.querySelectorAll("[data-move]").forEach(button=>button.addEventListener("click",()=>step(button.dataset.move)));
$("mode").addEventListener("change",restart);$("difficulty").addEventListener("change",restart);
$("reset").addEventListener("click",restart);
$("undo").addEventListener("click",()=>{game=undoStealth(game);$("hint-text").textContent="";render();});
$("pause").addEventListener("click",()=>{game=pauseStealth(game);render();});
$("hint").addEventListener("click",()=>{
 const move=hintStealth(game);
 $("hint-text").textContent=move===null?"Não existe rota vencedora nos turnos restantes. Reinicie a partida.":"Dica: "+ACTION_LABELS[move]+".";
});
document.querySelectorAll("[data-bot]").forEach(button=>button.addEventListener("click",()=>{
 $("bot-answer").textContent=button.dataset.bot==="situation"?
  "Documento "+(game.hasIntel?"obtido":"pendente")+", "+(game.limit-game.turn)+" turnos disponíveis, "+game.guards.length+" patrulha(s) em atividade.":
 button.dataset.bot==="strategy"?
  "Observe a direção de cada patrulha e espere se a passagem estiver vigiada. As paredes bloqueiam a visão. A dica busca uma rota vencedora com as patrulhas girando.":
  "Use os botões Norte, Leste, Sul, Oeste e Esperar. Com foco no tabuleiro, as setas do teclado também movem o agente. Pausar bloqueia ações e Desfazer recupera o turno anterior.";
}));
$("board").tabIndex=0;
$("board").addEventListener("keydown",event=>{
 const actions={ArrowUp:"north",ArrowRight:"east",ArrowDown:"south",ArrowLeft:"west"," ":"wait"};
 if(!Object.hasOwn(actions,event.key))return;
 event.preventDefault();step(actions[event.key]);
});
restart();
if("serviceWorker" in navigator&&window.isSecureContext)
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}),{once:true});