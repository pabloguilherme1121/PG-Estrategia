import {createGravity,tiltGravity,undoGravity,pauseGravity,hintGravity,GRAVITY_DIRS} from "./engine.mjs";
const $=id=>document.getElementById(id),PREF="pg-gravidade-config-v1",SAVE="pg-gravidade-recordes-v1";
const names={up:"cima",right:"direita",down:"baixo",left:"esquerda"};
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}};
const write=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v));}catch{}};
const pref=read(PREF),stored=read(SAVE);
const records=stored&&typeof stored==="object"&&!Array.isArray(stored)?
 Object.fromEntries(Object.entries(stored).filter(([k,v])=>/^(deslizar|passo):(recruta|tatico|veterano)$/.test(k)&&Number.isSafeInteger(v)&&v>=0&&v<=2600)):{};
if(["deslizar","passo"].includes(pref?.mode))$("mode").value=pref.mode;
if(["recruta","tatico","veterano"].includes(pref?.difficulty))$("difficulty").value=pref.difficulty;
const suppliedSeed=Number(new URLSearchParams(location.search).get("seed")??0);
let seed=Number.isSafeInteger(suppliedSeed)&&suppliedSeed>=0&&suppliedSeed<=99999999?suppliedSeed:0;
let game;
const key=p=>p.x+":"+p.y;
const recordKey=()=>game.mode+":"+game.difficulty;
function saveRecord(){
 if(game.phase!=="won"||(records[recordKey()]??-1)>=game.score)return;
 records[recordKey()]=game.score;write(SAVE,records);
}
function countGoals(){
 return game.tokens.filter((t,i)=>t.x===game.goals[i].x&&t.y===game.goals[i].y).length;
}
function drawBoard(){
 const board=$("board"),fragment=document.createDocumentFragment();
 board.style.setProperty("--size",String(game.size));
 const walls=new Set(game.blocks.map(key)),targets=new Map(game.goals.map(t=>[key(t),t.id]));
 const tokens=new Map(game.tokens.map(t=>[key(t),t.id]));
 for(let y=0;y<game.size;y++)for(let x=0;x<game.size;x++){
  const p=x+":"+y,block=walls.has(p),crystal=tokens.get(p),goal=targets.get(p);
  const tile=document.createElement("div");tile.className="tile";
  tile.dataset.x=String(x);tile.dataset.y=String(y);
  tile.dataset.kind=block?"rock":crystal?"crystal-"+crystal.toLowerCase():goal?"goal":"empty";
  if(crystal&&goal===crystal)tile.dataset.onGoal="true";
  tile.textContent=block?"▩":crystal??(goal?"◎":"·");
  tile.setAttribute("role","img");
  tile.setAttribute("aria-label",`Coluna ${x+1}, linha ${y+1}: ${block?"rocha":crystal?"cristal "+crystal+(goal===crystal?" no destino":"") :goal?"destino "+goal:"livre"}`);
  fragment.appendChild(tile);
 }
 board.replaceChildren(fragment);
}
function render(){
 $("phase").textContent=game.phase==="won"?"Vitória":game.phase==="lost"?"Derrota":game.paused?"Pausado":"Em andamento";
 $("moves").textContent=game.moves+"/"+game.limit;
 $("placed").textContent=countGoals()+"/2";
 $("record").textContent=Number.isInteger(records[recordKey()])?records[recordKey()]+" pontos":"Nenhum";
 $("goal").textContent=game.mode==="deslizar"?
  "Deslizar: os dois cristais percorrem quantas casas puderem até uma rocha, uma borda ou outra peça.":
  "Passo: cada inclinação move os dois cristais no máximo uma casa. Evite bloquear o colega.";
 $("message").textContent=game.message;
 $("pause").textContent=game.paused?"Retomar":"Pausar";
 $("pause").disabled=game.phase!=="playing";
 $("undo").disabled=game.phase!=="playing"||game.paused||!game.history.length;
 $("hint").disabled=game.phase!=="playing"||game.paused;
 document.querySelectorAll("[data-dir]").forEach(btn=>btn.disabled=game.phase!=="playing"||game.paused);
 drawBoard();
}
function restart(next=false){
 if(next)seed=(seed+1)%100000000;
 game=createGravity({mode:$("mode").value,difficulty:$("difficulty").value,seed});
 write(PREF,{mode:game.mode,difficulty:game.difficulty});
 $("hint-text").textContent="";render();
}
function move(direction){
 const next=tiltGravity(game,direction);
 if(next===game){$("hint-text").textContent="Essa inclinação não moveu nenhuma peça. Tente outra direção.";return;}
 game=next;saveRecord();$("hint-text").textContent="";render();
}
document.querySelectorAll("[data-dir]").forEach(button=>button.addEventListener("click",()=>move(button.dataset.dir)));
const arrow={ArrowUp:"up",ArrowDown:"down",ArrowLeft:"left",ArrowRight:"right"};
$("board").addEventListener("keydown",event=>{
 const direction=arrow[event.key];
 if(!direction)return;
 event.preventDefault();
 move(direction);
});
$("mode").addEventListener("change",()=>restart());
$("difficulty").addEventListener("change",()=>restart());
$("reset").addEventListener("click",()=>restart());
$("new").addEventListener("click",()=>restart(true));
$("undo").addEventListener("click",()=>{game=undoGravity(game);$("hint-text").textContent="";render();});
$("pause").addEventListener("click",()=>{game=pauseGravity(game);render();});
$("hint").addEventListener("click",()=>{
 const direction=hintGravity(game);
 $("hint-text").textContent=direction?"Dica calculada: incline para "+names[direction]+".":
  "Não há rota vencedora com as manobras restantes. Desfaça ou reinicie.";
});
document.querySelectorAll("[data-bot]").forEach(button=>button.addEventListener("click",()=>{
 $("bot-answer").textContent=button.dataset.bot==="status"?
  countGoals()+" de 2 cristais alinhados, "+(game.limit-game.moves)+" inclinações restantes. Modo "+game.mode+".":
 button.dataset.bot==="strategy"?
  "Tente posicionar uma peça perto de um obstáculo para controlar onde ela para. As duas peças se movem juntas e nunca ocupam a mesma casa. A dica mostra o próximo passo de uma rota possível.":
  "Foque o tabuleiro com Tab para usar setas do teclado, ou use os quatro botões de inclinação. Pausar impede movimentos; desfazer custa uma inclinação.";
}));
restart();
if("serviceWorker" in navigator&&window.isSecureContext)
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}),{once:true});
