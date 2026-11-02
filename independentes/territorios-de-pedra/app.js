import {
 createTerritory,commandTerritory,undoTerritory,pauseTerritory,legalTerritory,
 scoreTerritory,territoryBotText
} from "./engine.mjs";

const $=id=>document.getElementById(id),STORE="pg-estrategia-territorios-records-v1";
let records={};
try {
 const parsed=JSON.parse(localStorage.getItem(STORE)||"{}");
 if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)) {
  records=Object.fromEntries(Object.entries(parsed).filter(([key,value])=>
   /^(territorio|capturas):(recruta|tatico|veterano)$/.test(key)
   &&Number.isSafeInteger(value)&&value>=0&&value<10000));
 }
}catch{records={};}
let game=createTerritory(),renderedSize=0,seed=0,botTopic="status";
const board=$("board");
const scoreString=n=>String(n).replace(".",",");
function currentRecord(){
 const value=records[game.mode+":"+game.difficulty];
 return Number.isSafeInteger(value)?String(value):"Nenhum";
}
function persistWin(previous,next){
 if(previous.phase==="won"||next.phase!=="won")return;
 const key=next.mode+":"+next.difficulty;
 const score=Math.floor(next.mode==="capturas"?next.captures.black*100+next.scores.black:next.scores.black);
 if(score>(records[key]??-1)){
  records[key]=score;
  try{localStorage.setItem(STORE,JSON.stringify(records));}catch{ /* gameplay never depends on storage */ }
 }
}
function buildBoard(){
 if(game.size===renderedSize&&board.childElementCount===game.board.length)return;
 renderedSize=game.size;board.style.setProperty("--size",String(game.size));
 const cells=game.board.map((_,index)=>{
  const button=document.createElement("button");button.type="button";button.className="cell";
  button.dataset.cell=String(index);
  const stone=document.createElement("span");stone.className="stone";stone.setAttribute("aria-hidden","true");
  button.append(stone);return button;
 });
 board.replaceChildren(...cells);
 $("board-scroll").scrollLeft=0;
}
function render(){
 buildBoard();
 const score=scoreTerritory(game);
 $("moves").textContent=String(game.moves);
 $("captures").textContent=game.captures.black+" × "+game.captures.white;
 $("areas").textContent=scoreString(score.black)+" × "+scoreString(score.white);
 $("message").textContent=game.message;
 $("phase").textContent=game.phase==="won"?"Vitória":game.phase==="lost"?"Derrota":game.paused?"Pausado":"Em andamento";
 $("goal").textContent=game.mode==="capturas"?
   "Capture "+game.captureTarget+" pedras adversárias antes do rival. Se acabar o tempo, capturas e área decidem.":
   "Domine mais pedras e regiões cercadas. O rival recebe 0,5 ponto de compensação.";
 $("record").textContent=currentRecord();
 $("pause").textContent=game.paused?"Retomar":"Pausar";
 $("pause").disabled=game.phase!=="playing";
 $("pass").disabled=game.phase!=="playing"||game.paused;
 $("undo").disabled=game.paused||!game.history.length;
 $("mode").value=game.mode;$("difficulty").value=game.difficulty;
 $("bot-answer").textContent=territoryBotText(game,botTopic);
 const controls=board.children;
 for(let i=0;i<controls.length;i++){
  const cell=controls[i],stone=cell.firstElementChild,color=game.board[i];
  stone.className="stone"+(color===1?" dark":color===2?" light":"");
  cell.classList.toggle("occupied",color!==0);
  cell.disabled=!legalTerritory(game,i)||game.turn!==1;
  const label=color===1?"pedra escura":color===2?"pedra clara":"vazio";
  cell.setAttribute("aria-label",`Linha ${Math.floor(i/game.size)+1}, coluna ${i%game.size+1}: ${label}`);
 }
}
function apply(action,keyboard=false){
 const previous=game,next=commandTerritory(game,action);
 if(next===previous)return;
 game=next;persistWin(previous,next);render();
 if(keyboard){
  const candidate=Array.from(board.querySelectorAll("button.cell:not(:disabled)"))[0];
  candidate?.focus({preventScroll:true});
 }
}
board.addEventListener("click",event=>{
 const cell=event.target.closest("button[data-cell]");
 if(!cell||!board.contains(cell))return;
 apply(Number(cell.dataset.cell),event.detail===0);
});
$("pass").addEventListener("click",()=>apply("pass"));
$("undo").addEventListener("click",()=>{game=undoTerritory(game);render();});
$("pause").addEventListener("click",()=>{game=pauseTerritory(game);render();});
$("reset").addEventListener("click",()=>{
 game=createTerritory({mode:game.mode,difficulty:game.difficulty,seed});render();
});
$("new").addEventListener("click",()=>{
 seed=(seed+1)%1000000000;game=createTerritory({mode:game.mode,difficulty:game.difficulty,seed});render();
});
for(const id of ["mode","difficulty"]){
 $(id).addEventListener("change",()=>{
  const mode=$("mode").value,difficulty=$("difficulty").value;
  game=createTerritory({mode,difficulty,seed});render();
 });
}
document.querySelectorAll("[data-bot]").forEach(button=>button.addEventListener("click",()=>{
 botTopic=button.dataset.bot;render();
}));
window.addEventListener("storage",event=>{
 if(event.key!==STORE)return;
 try{
  const parsed=JSON.parse(event.newValue||"{}");
  if(parsed&&typeof parsed==="object"&&!Array.isArray(parsed)){
   records=Object.fromEntries(Object.entries(parsed).filter(([key,value])=>
    /^(territorio|capturas):(recruta|tatico|veterano)$/.test(key)
    &&Number.isSafeInteger(value)&&value>=0&&value<10000));
   render();
  }
 }catch{}
});
render();
if("serviceWorker" in navigator)navigator.serviceWorker.register("./sw.js").catch(()=>{});
