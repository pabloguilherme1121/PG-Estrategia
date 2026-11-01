import {createReversi,legalReversiMoves,playReversiTurn,reversiScore,pauseReversi,resumeReversi} from "./engine.mjs";
import {reversiHelp,REVERSI_HELP} from "./pg-bot.mjs";
const $=id=>document.getElementById(id);
const KEY="pg-estrategia-reversi-records-v1";
let state,previous=null,helpTopic=null,records={};
try{
 const value=JSON.parse(localStorage.getItem(KEY)||"{}");
 if(value&&typeof value==="object"&&!Array.isArray(value))
  records=Object.fromEntries(Object.entries(value).filter(([key,score])=>
   /^(6|8):(recruta|tatico|veterano)$/.test(key)&&Number.isSafeInteger(score)&&score>=1&&score<=64));
}catch{/* local records optional */}
const id=()=>state.size+":"+state.difficulty;
function start(){
 state=createReversi({size:Number($("size").value),difficulty:$("difficulty").value});
 previous=null;render();
}
function record(){
 if(state.status!=="won")return;
 const advantage=reversiScore(state),points=advantage.player-advantage.bot;
 if(points>(records[id()]||0)){
  records[id()]=points;
  try{localStorage.setItem(KEY,JSON.stringify(records));}catch{/* storage optional */}
 }
}
function render(){
 const moves=state.paused?[]:legalReversiMoves(state,1);
 const score=reversiScore(state);
 $("player-score").textContent=String(score.player);
 $("bot-score").textContent=String(score.bot);
 $("round").textContent=String(state.turns);
 $("turn").textContent=state.paused?"Em pausa":state.status==="playing"?"Sua vez":"Encerrado";
 $("pause").textContent=state.paused?"Retomar":"Pausar";
 $("pause").setAttribute("aria-pressed",String(state.paused));
 $("pause").disabled=state.status!=="playing";
 $("undo").disabled=!previous||state.paused;
 $("status").textContent=state.notice;
 $("status").dataset.status=state.status;
 $("record").textContent=records[id()]?"Melhor vantagem: +"+records[id()]+" peças":"Sem recorde local";
 $("board").style.setProperty("--n",String(state.size));
 const buttons=state.board.map((piece,index)=>{
  const allowed=moves.includes(index),row=Math.floor(index/state.size)+1,col=index%state.size+1;
  const button=document.createElement("button");
  button.type="button";button.className="cell";button.dataset.index=String(index);
  button.dataset.piece=String(piece);button.dataset.legal=String(allowed);
  button.textContent=piece?"●":allowed?"·":" ";
  button.disabled=!allowed;
  button.setAttribute("aria-label","Linha "+row+", coluna "+col+": "+(piece===1?"sua peça":piece===-1?"peça rival":allowed?"jogada disponível":"vazia"));
  return button;
 });
 $("board").replaceChildren(...buttons);
 if(helpTopic)$("bot-answer").textContent=reversiHelp(helpTopic,state);
}
$("board").addEventListener("click",event=>{
 const button=event.target.closest("button[data-legal='true']");
 if(!button||state.paused||state.status!=="playing")return;
 const next=playReversiTurn(state,Number(button.dataset.index));
 if(next===state)return;
 previous=state;state=next;record();render();
});
$("pause").addEventListener("click",()=>{
 state=state.paused?resumeReversi(state):pauseReversi(state);render();
});
$("undo").addEventListener("click",()=>{
 if(!previous||state.paused)return;
 state=previous;previous=null;render();
});
$("new").addEventListener("click",start);
$("size").addEventListener("change",start);
$("difficulty").addEventListener("change",start);
$("pg-bot").addEventListener("click",event=>{
 const button=event.target.closest("button[data-help]");
 if(!button||!REVERSI_HELP.includes(button.dataset.help))return;
 helpTopic=button.dataset.help;
 $("bot-answer").textContent=reversiHelp(helpTopic,state);
});
start();
if("serviceWorker" in navigator&&location.protocol==="https:")
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}));
