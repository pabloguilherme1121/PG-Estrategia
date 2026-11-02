import {createWarehouse,moveWarehouse,undoWarehouse,toggleWarehousePause,getWarehouseHint} from "./engine.mjs";
const $=id=>document.getElementById(id);
const SAVE="pg-estrategia-warehouse-recordes-v1",PREF="pg-estrategia-warehouse-preferencias-v1";
const validModes=new Set(["entrega","economia"]),validDifficulties=new Set(["recruta","tatico","veterano"]);
const labels={up:"cima",right:"direita",down:"baixo",left:"esquerda"};
const arrows={ArrowUp:"up",ArrowRight:"right",ArrowDown:"down",ArrowLeft:"left"};
const rawSeed=new URLSearchParams(location.search).get("seed");
const parsedSeed=rawSeed===null?0:Number(rawSeed);
const seed=Number.isSafeInteger(parsedSeed)&&parsedSeed>=0&&parsedSeed<=999999999?parsedSeed:0;
function safeRead(key){try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}}
const saved=safeRead(PREF)||{};
if(validModes.has(saved.mode))$("mode").value=saved.mode;
if(validDifficulties.has(saved.difficulty))$("difficulty").value=saved.difficulty;
const stored=safeRead(SAVE);
let records={};
if(stored&&typeof stored==="object"&&!Array.isArray(stored)){
 records=Object.fromEntries(Object.entries(stored).filter(([key,value])=>
  /^(entrega|economia):(recruta|tatico|veterano)$/.test(key)&&Number.isInteger(value)&&value>0&&value<=600));
}
let state;
const recordKey=()=>state.mode+":"+state.difficulty;
function savePrefs(){
 try{localStorage.setItem(PREF,JSON.stringify({mode:state.mode,difficulty:state.difficulty}));}catch{}
}
function saveRecord(){
 if(state.phase!=="won"||records[recordKey()]>=state.score)return;
 records[recordKey()]=state.score;
 try{localStorage.setItem(SAVE,JSON.stringify(records));}catch{}
}
function render(){
 const board=$("board");board.style.setProperty("--size",String(state.size));
 board.style.gridTemplateColumns="repeat("+state.size+",44px)";
 const walls=new Set(state.walls),boxes=new Set(state.boxes),goals=new Set(state.goals);
 const frag=document.createDocumentFragment();
 for(let i=0;i<state.size*state.size;i++){
  const cell=document.createElement("div");cell.className="cell";cell.setAttribute("role","gridcell");
  const wall=walls.has(i),box=boxes.has(i),goal=goals.has(i),player=state.player===i;
  let kind="floor",glyph="·",description="piso livre";
  if(wall){kind="wall";glyph="▦";description="parede";}
  else if(player){kind="player";glyph="●";description=goal?"agente no destino":"agente";}
  else if(box&&goal){kind="delivered";glyph="◆";description="carga entregue";}
  else if(box){kind="box";glyph="◆";description="carga";}
  else if(goal){kind="goal";glyph="◎";description="destino";}
  cell.dataset.type=kind;cell.textContent=glyph;cell.setAttribute("aria-label","Casa "+(i+1)+": "+description);
  frag.append(cell);
 }
 board.replaceChildren(frag);
 const delivered=state.boxes.filter(box=>goals.has(box)).length;
 $("moves").textContent=state.moves+"/"+state.maxMoves;
 $("delivered").textContent=delivered+"/"+state.boxes.length;
 $("record").textContent=records[recordKey()]?records[recordKey()]+" pontos":"Nenhum";
 const phase=$("phase");phase.dataset.phase=state.phase;
 phase.textContent=state.phase==="won"?"Vitória":state.phase==="lost"?"Derrota":state.paused?"Pausado":"Em andamento";
 $("status-text").textContent=state.message;
 $("pause").textContent=state.paused?"Retomar":"Pausar";
 $("pause").disabled=state.phase!=="playing";
 $("undo").disabled=state.paused||state.phase!=="playing"||!state.history.length;
 $("hint").disabled=state.paused||state.phase!=="playing";
 for(const direction of Object.keys(labels))$("direction-"+direction).disabled=state.paused||state.phase!=="playing";
}
function newGame(){
 state=createWarehouse({mode:$("mode").value,difficulty:$("difficulty").value,seed});
 savePrefs();$("hint-text").textContent="";delete $("hint-text").dataset.direction;
 $("bot-answer").textContent="Abra uma opção para receber orientação.";
 render();
}
function move(direction){
 const next=moveWarehouse(state,direction);
 if(next===state)return;
 state=next;saveRecord();render();
 $("hint-text").textContent="";delete $("hint-text").dataset.direction;
}
for(const direction of Object.keys(labels)){
 $("direction-"+direction).addEventListener("click",()=>move(direction));
}
$("mode").addEventListener("change",newGame);
$("difficulty").addEventListener("change",newGame);
$("pause").addEventListener("click",()=>{state=toggleWarehousePause(state);render();});
$("undo").addEventListener("click",()=>{state=undoWarehouse(state);render();$("hint-text").textContent="";delete $("hint-text").dataset.direction;});
$("reset").addEventListener("click",newGame);
$("hint").addEventListener("click",()=>{
 const hint=getWarehouseHint(state),output=$("hint-text");
 if(!hint){output.textContent="Não há solução segura com os movimentos restantes. Considere reiniciar.";delete output.dataset.direction;return;}
 output.textContent="Próximo movimento: para "+labels[hint.direction]+". "+hint.reason;
 output.dataset.direction=hint.direction;
});
document.addEventListener("keydown",event=>{
 const direction=arrows[event.key];
 if(!direction||event.altKey||event.ctrlKey||event.metaKey)return;
 if(event.target instanceof Element&&event.target.closest("input,textarea,select,[contenteditable=true]"))return;
 event.preventDefault();
 move(direction);
});
document.querySelectorAll("[data-bot]").forEach(button=>button.addEventListener("click",()=>{
 const kind=button.dataset.bot;
 let answer="";
 if(kind==="situation"){
  const count=state.boxes.filter(box=>state.goals.includes(box)).length;
  answer="Movimentos: "+state.moves+" de "+state.maxMoves+". Cargas entregues: "+count+" de "+state.boxes.length+". "+(state.paused?"Operação pausada.":state.phase==="won"?"Todas as cargas entregues.":state.phase==="lost"?"Operação encerrada.":"Continue planejando.");
 }else if(kind==="strategy"){
  const hint=getWarehouseHint(state);
  answer=hint?"Próxima jogada: para "+labels[hint.direction]+". Tente manter espaço atrás das caixas.":"Evite encostar caixas em paredes sem destino. Reinicie se não houver saída.";
 }else{
  answer="Use as setas do teclado ou os quatro botões de direção. Desfazer recupera o último passo; Pausar bloqueia a partida. Sem compras ou contas.";
 }
 $("bot-answer").textContent=answer;
}));
newGame();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}),{once:true});
