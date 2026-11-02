import {createCouncil,commandCouncil,previewVote,FACTIONS,POLICIES} from "./engine.mjs";
import {councilBotAnswer} from "./pg-bot.mjs";
const $=id=>document.getElementById(id);
const STORAGE="pg-conselho-de-reinos-records-v1";
const params=new URLSearchParams(location.search);
const fixedSeed=/^\d{1,8}$/.test(params.get("seed")||"")?Number(params.get("seed")):null;
let state,records={};
let botTopic=null;
try{const saved=JSON.parse(localStorage.getItem(STORAGE)||"{}");if(saved&&typeof saved==="object"&&!Array.isArray(saved)){
 records=Object.fromEntries(Object.entries(saved).filter(([k,v])=>/^(tratados|crise):(recruta|tatico|veterano)$/.test(k)&&Number.isSafeInteger(v)&&v>=0&&v<1000000));
}}catch{/* keep in-memory best score */}
function node(tag,text){const element=document.createElement(tag);if(text!==undefined)element.textContent=String(text);return element;}
function key(){return state.mode+":"+state.difficulty;}
function newGame(){
 const seed=fixedSeed??Math.floor(Math.random()*100000000);
 state=createCouncil({difficulty:$("level").value,mode:$("objective-mode").value,seed});
 render();
}
function apply(action){
 const next=commandCouncil(state,action);
 if(next===state){$("notice").textContent="Ação indisponível: confira influência, confiança e limite de conversas.";return;}
 state=next;
 if(state.status==="won"&&state.score>(records[key()]||0)){
  records={...records,[key()]:state.score};
  try{localStorage.setItem(STORAGE,JSON.stringify(records));}catch{/* optional */}
 }
 render();
}
function stat(label,value){const item=node("div");item.className="stat";item.append(node("small",label),node("strong",value));return item;}
function render(){
 const active=state.status==="playing";
 $("stats").replaceChildren(
  stat("Rodada",state.round+" / "+state.maxRounds),
  stat("Acordos",state.passed+" / "+state.goal),
  stat("Votos necessários",state.requiredSeats+" / 9"),
  stat("Influência",state.influence),
  stat("Conversas",state.talks+" / 2")
 );
 $("goal-text").textContent="Objetivo: obter "+state.goal+" aprovações antes do limite de "+state.maxRounds+" rodadas. Cada votação encerra uma rodada.";
 $("notice").dataset.status=state.status;
 $("notice").textContent=state.notice;
 $("pause").disabled=state.status==="won"||state.status==="lost";
 $("pause").textContent=state.status==="paused"?"Retomar":"Pausar";
 $("pause").setAttribute("aria-pressed",String(state.status==="paused"));
 $("rival").textContent="Última ação da influência rival: "+FACTIONS[state.rivalFaction].name+".";
 const factionBoard=$("factions");factionBoard.replaceChildren();
 FACTIONS.forEach((f,index)=>{
  const card=node("article");card.className="faction";
  const info=node("div");info.append(node("strong",f.name),node("small",f.seats+" assentos · Confiança "+state.trust[index]+"/7"));
  const button=node("button","Negociar");button.type="button";button.dataset.faction=String(index);
  button.disabled=!active||state.talks>=2||state.influence<1||state.trust[index]>=7;
  button.setAttribute("aria-label","Negociar com "+f.name);
  button.addEventListener("click",()=>apply({type:"talk",faction:index}));
  const meter=node("meter");meter.min=0;meter.max=7;meter.value=state.trust[index];
  meter.setAttribute("aria-label","Confiança em "+f.name);
  card.append(info,button,meter);factionBoard.append(card);
 });
 const proposals=$("proposals");proposals.replaceChildren();
 Object.entries(POLICIES).forEach(([id,policy])=>{
  const vote=previewVote(state,id);
  const choice=node("article");choice.className="proposal";choice.dataset.majority=String(vote.seats>=state.requiredSeats);
  const title=node("strong",policy.name);
  const preview=node("small","Previsão: "+vote.seats+" votos de 9 · "+(vote.seats>=state.requiredSeats?"maioria formada":"negocie para formar maioria"));
  const button=node("button","Votar");button.type="button";button.dataset.policy=id;
  button.disabled=!active;button.setAttribute("aria-label","Votar "+policy.name);
  button.addEventListener("click",()=>apply({type:"vote",policy:id}));
  choice.append(title,preview,button);proposals.append(choice);
 });
 $("wait").disabled=!active;
 $("record").textContent="Recorde local ("+state.mode+" · "+state.difficulty+"): "+(records[key()]||0)+" pontos.";
 if(botTopic)$("bot-response").textContent=councilBotAnswer(botTopic,state);
}
$("level").addEventListener("change",newGame);
$("objective-mode").addEventListener("change",newGame);
$("restart").addEventListener("click",newGame);
$("pause").addEventListener("click",()=>apply({type:state.status==="paused"?"resume":"pause"}));
$("wait").addEventListener("click",()=>apply({type:"wait"}));
$("pg-bot").addEventListener("click",event=>{
 const button=event.target.closest("button[data-bot-topic]");
 if(!button)return;
 botTopic=button.dataset.botTopic;
 $("bot-response").textContent=councilBotAnswer(botTopic,state);
});
newGame();
if("serviceWorker"in navigator&&location.protocol==="https:")
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}));
