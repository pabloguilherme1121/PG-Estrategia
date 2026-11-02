import {createCargo,placeCargo,undoCargo,pauseCargo,hintCargo,cargoBalance,cargoFit} from "./engine.mjs";
const $=id=>document.getElementById(id),PREF="pg-conves-config-v1",SAVE="pg-conves-recordes-v1";
function read(key){try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
const pref=read(PREF),stored=read(SAVE);
const records=stored&&typeof stored==="object"&&!Array.isArray(stored)?
 Object.fromEntries(Object.entries(stored).filter(([k,v])=>/^(encaixe|equilibrio):(recruta|tatico|veterano)$/.test(k)&&Number.isSafeInteger(v)&&v>=0&&v<100000)):{};
if(["encaixe","equilibrio"].includes(pref?.mode))$("mode").value=pref.mode;
if(["recruta","tatico","veterano"].includes(pref?.difficulty))$("difficulty").value=pref.difficulty;
const requestedSeed=Number(new URLSearchParams(location.search).get("seed")??0);
let seed=Number.isSafeInteger(requestedSeed)&&requestedSeed>=0&&requestedSeed<=99999999?requestedSeed:0;
let game,selected=null,rotated=false;
function recordKey(){return game.mode+":"+game.difficulty;}
function saveRecord(){
 if(game.phase!=="won")return;
 if((records[recordKey()]??-1)>=game.score)return;
 records[recordKey()]=game.score;write(SAVE,records);
}
function drawBoard(){
 const board=$("board"),blocked=new Set(game.blocked.map(([x,y])=>x+":"+y)),occupied=new Map();
 for(const p of game.placements){
  const item=game.items.find(i=>i.id===p.id),w=p.rotated?item.h:item.w,h=p.rotated?item.w:item.h;
  for(let dy=0;dy<h;dy++)for(let dx=0;dx<w;dx++)occupied.set((p.x+dx)+":"+(p.y+dy),p.id);
 }
 board.style.setProperty("--size",String(game.size));const fragment=document.createDocumentFragment();
 for(let y=0;y<game.size;y++)for(let x=0;x<game.size;x++){
  const key=x+":"+y,kind=blocked.has(key)?"blocked":occupied.has(key)?"cargo":"free";
  const cell=document.createElement("button");cell.type="button";cell.className="tile";cell.dataset.kind=kind;
  cell.dataset.x=String(x);cell.dataset.y=String(y);
  cell.textContent=kind==="blocked"?"×":occupied.get(key)??"·";
  cell.setAttribute("aria-label","Coluna "+(x+1)+", linha "+(y+1)+": "+(kind==="blocked"?"bloqueada":kind==="cargo"?"carga "+occupied.get(key):"livre"));
  cell.disabled=game.phase!=="playing"||game.paused||kind!=="free";
  cell.addEventListener("click",()=>placeAt(x,y));fragment.appendChild(cell);
 }
 board.replaceChildren(fragment);
}
function drawItems(){
 const fragment=document.createDocumentFragment();
 for(const item of game.items){
  const done=game.placements.some(p=>p.id===item.id);
  const button=document.createElement("button");button.type="button";button.disabled=done||game.paused||game.phase!=="playing";
  button.setAttribute("aria-pressed",String(!done&&selected===item.id));
  button.setAttribute("aria-label","Módulo "+item.id+", "+item.w+" por "+item.h+", peso "+item.weight+(done?", posicionado":""));
  button.append(document.createTextNode("Módulo "+item.id));
  const meta=document.createElement("span");meta.textContent=item.w+" × "+item.h+" · peso "+item.weight+(done?" · colocado":"");
  button.append(meta);button.addEventListener("click",()=>{selected=item.id;rotated=false;$("hint-text").textContent="";render();});
  fragment.append(button);
 }
 $("cargo-list").replaceChildren(fragment);
}
function render(){
 $("moves").textContent=game.moves+"/"+game.limit;
 $("phase").textContent=game.phase==="won"?"Vitória":game.phase==="lost"?"Derrota":game.paused?"Pausado":"Em andamento";
 $("balance").textContent=cargoBalance(game)+" / "+(game.mode==="equilibrio"?game.targetBalance:"livre");
 $("record").textContent=Number.isInteger(records[recordKey()])?records[recordKey()]+" pontos":"Nenhum";
 $("goal").textContent=game.mode==="equilibrio"?
  "Posicione todos os módulos e iguale o lastro ao alvo "+game.targetBalance+". Esquerda soma, direita subtrai.":
  "Posicione todos os módulos sem sobreposição. O lastro fica livre neste modo.";
 $("message").textContent=game.message;
 $("pause").textContent=game.paused?"Retomar":"Pausar";
 $("pause").disabled=game.phase!=="playing";
 $("undo").disabled=game.phase!=="playing"||game.paused||game.history.length===0;
 $("hint").disabled=game.phase!=="playing"||game.paused;
 $("rotate").disabled=game.phase!=="playing"||game.paused||!selected||
  game.items.some(i=>i.id===selected&&i.w===i.h);
 $("rotate").textContent=rotated?"Girar módulo (rotacionado)":"Girar módulo";
 drawBoard();drawItems();
}
function restart(newSeed=false){
 if(newSeed)seed=(seed+1)%100000000;
 game=createCargo({mode:$("mode").value,difficulty:$("difficulty").value,seed});
 selected=game.items[0]?.id??null;rotated=false;
 write(PREF,{mode:game.mode,difficulty:game.difficulty});$("hint-text").textContent="";render();
}
function placeAt(x,y){
 if(!selected)return;
 const move={id:selected,x,y,rotated};
 const next=placeCargo(game,move);
 if(next===game){$("hint-text").textContent="O módulo não cabe nessa posição. Gire ou escolha outra casa.";return;}
 game=next;saveRecord();selected=game.items.find(i=>!game.placements.some(p=>p.id===i.id))?.id??null;rotated=false;
 $("hint-text").textContent="";render();
}
$("mode").addEventListener("change",()=>restart());
$("difficulty").addEventListener("change",()=>restart());
$("reset").addEventListener("click",()=>restart());
$("new").addEventListener("click",()=>restart(true));
$("rotate").addEventListener("click",()=>{rotated=!rotated;render();});
$("pause").addEventListener("click",()=>{game=pauseCargo(game);render();});
$("undo").addEventListener("click",()=>{
 const last=game.placements.at(-1)?.id;game=undoCargo(game);
 selected=last??selected;rotated=false;$("hint-text").textContent="";render();
});
$("hint").addEventListener("click",()=>{
 const move=hintCargo(game);
 $("hint-text").textContent=move?
  "Dica: coloque o módulo "+move.id+" na coluna "+(move.x+1)+", linha "+(move.y+1)+(move.rotated?", girado.":"."):
  "Sem rota vencedora com o espaço e as manobras restantes. Desfaça ou reinicie.";
});
$("board").addEventListener("keydown",event=>{
 const direction={ArrowUp:[0,-1],ArrowRight:[1,0],ArrowDown:[0,1],ArrowLeft:[-1,0]}[event.key];
 if(!direction||!event.target.matches(".tile"))return;
 event.preventDefault();
 const x=Number(event.target.dataset.x)+direction[0],y=Number(event.target.dataset.y)+direction[1];
 const target=$("board").querySelector('[data-x="'+x+'"][data-y="'+y+'"]');
 if(target&&!target.disabled)target.focus();
});
document.querySelectorAll("[data-bot]").forEach(button=>button.addEventListener("click",()=>{
 $("bot-answer").textContent=button.dataset.bot==="status"?
  game.placements.length+" de "+game.items.length+" módulos colocados; "+(game.limit-game.moves)+" manobras restantes. Lastro atual "+cargoBalance(game)+
  (game.mode==="equilibrio"?", alvo "+game.targetBalance+".":"."):
 button.dataset.bot==="strategy"?
  "Reserve espaço para peças grandes primeiro. No modo Equilíbrio, deslocar peso para a esquerda aumenta o lastro; para a direita reduz. Use a dica para uma posição solucionável.":
  "Escolha Módulo, opcionalmente Girar e toque na casa de origem. Tab navega entre botões; com foco na grade, as setas movem o foco. Desfazer consome uma manobra.";
}));
restart();
if("serviceWorker" in navigator&&window.isSecureContext)
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}),{once:true});
