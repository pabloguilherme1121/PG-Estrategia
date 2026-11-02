import { createTrade, commandTrade, tradePrice, TRADE_CITIES, TRADE_GOODS, tradeCargoSize } from "./game.mjs";
import { marketBotAnswer, MARKET_BOT_TOPICS } from "./pg-bot.mjs";
const $=id=>document.getElementById(id);
const STORAGE="pg-strategy-mercado-records-v1";
const LABELS={graos:"Grãos",metal:"Metal",tecnologia:"Tecnologia"};
let state;
let selectedBotTopic=null;
let records={};
try{
  const raw=JSON.parse(localStorage.getItem(STORAGE)||"{}");
  if(raw&&typeof raw==="object"&&!Array.isArray(raw))
    records=Object.fromEntries(Object.entries(raw).filter(([key,value])=>
      /^(contratos|lucro):(recruta|tatico|veterano)$/.test(key)&&
      Number.isSafeInteger(value)&&value>=0&&value<1000000));
}catch{/* records remain optional */}
function element(tag,text){
 const el=document.createElement(tag);
 if(text!==undefined)el.textContent=String(text);
 return el;
}
function currentKey(){return state.mission+":"+state.mode;}
function newGame(){
 state=createTrade({difficulty:$("trade-difficulty").value,mission:$("trade-mode").value,
   seed:Math.floor(Math.random()*100000)});
 render();
}
function commit(command) {
 const next=commandTrade(state,command);
 if(next===state) {
   $("game-status").textContent="Essa ação não é possível agora. Confira os recursos e as rotas.";
   return;
 }
 state=next;
 if(state.phase==="won"&&state.score>(records[currentKey()]||0)){
   records={...records,[currentKey()]:state.score};
   try{localStorage.setItem(STORAGE,JSON.stringify(records));}catch{/* optional best score */}
 }
 render();
}
function stat(title,value){
 const node=element("div");
 node.append(element("span",title),element("strong",value));
 return node;
}
function render(){
 const playing=state.phase==="playing";
 const city=TRADE_CITIES[state.position];
 $("stats").replaceChildren(
   stat("Dia",state.turn+" / "+state.maxTurns),
   stat("Créditos",state.credits),
   stat("Combustível",state.fuel),
   stat("Carga",tradeCargoSize(state)+" / "+state.capacity),
   stat("Rival em",TRADE_CITIES[state.rival.position].name)
 );
 $("objective").textContent=state.mission==="contratos"
   ?"Entregas: Grãos na Metrópole "+state.delivered.graos+"/2 · Metal no Porto Norte "+state.delivered.metal+"/1"
   :"Capital acumulado: "+state.credits+" / "+state.target+" créditos";
 $("game-status").dataset.phase=state.phase;
 $("game-status").textContent=state.notice;
 $("pause").disabled=state.phase==="won"||state.phase==="lost";
 $("pause").textContent=state.phase==="paused"?"Retomar":"Pausar";
 $("pause").setAttribute("aria-pressed",String(state.phase==="paused"));
 $("city-description").textContent="Você está em "+city.name+". Rotas conectadas: "+city.roads.map(id=>TRADE_CITIES[id].name).join(", ")+".";
 const map=$("city-map");
 map.replaceChildren();
 TRADE_CITIES.forEach((entry,id)=>{
   const current=id===state.position;
   const reachable=city.roads.includes(id);
   const button=element("button");
   button.type="button";
   button.dataset.city=String(id);
   button.dataset.current=String(current);
   button.dataset.route=String(reachable);
   button.disabled=!playing||!reachable||state.fuel<1||state.credits<2;
   const label=element("strong",entry.name);
   const description=element("small",current?"Você está aqui":reachable?"Viajar · 2 créditos / 1 combustível":"Sem rota direta");
   button.append(label,description);
   button.setAttribute("aria-label",entry.name+": "+description.textContent);
   button.addEventListener("click",()=>commit({type:"travel",to:id}));
   map.append(button);
 });
 const prices=$("prices");
 prices.replaceChildren();
 TRADE_GOODS.forEach(good=>{
   const tr=element("tr");
   tr.append(element("td",LABELS[good]),element("td",tradePrice(state,state.position,good)),
     element("td",state.cargo[good]));
   prices.append(tr);
 });
 const product=$("product").value;
 const units=Number($("units").value);
 const price=tradePrice(state,state.position,product);
 $("buy").disabled=!playing||state.credits<price*units||tradeCargoSize(state)+units>state.capacity;
 $("sell").disabled=!playing||state.cargo[product]<units;
 $("refuel").disabled=!playing||state.credits<5||state.fuel>=7;
 $("upgrade").disabled=!playing||state.credits<10||state.capacity>=7;
 $("rest").disabled=!playing;
 $("product").disabled=!playing;
 $("units").disabled=!playing;
 const record=records[currentKey()]||0;
 $("record").textContent="Recorde em "+state.mission+" / "+state.mode+": "+record+" pontos (salvo neste aparelho).";
 if(selectedBotTopic)$("market-bot-answer").textContent=marketBotAnswer(selectedBotTopic,state);
}
$("trade-mode").addEventListener("change",newGame);
$("trade-difficulty").addEventListener("change",newGame);
$("restart").addEventListener("click",newGame);
$("pause").addEventListener("click",()=>commit({type:state.phase==="paused"?"resume":"pause"}));
$("product").addEventListener("change",render);
$("units").addEventListener("change",render);
for(const id of ["buy","sell","refuel","upgrade","rest"]){
 $(id).addEventListener("click",()=>{
   commit(id==="buy"||id==="sell"?{type:id,good:$("product").value,units:Number($("units").value)}:{type:id});
 });
}
$("pg-bot").addEventListener("click",event=>{
 const button=event.target.closest("button[data-market-topic]");
 if(!button||!MARKET_BOT_TOPICS.includes(button.dataset.marketTopic))return;
 selectedBotTopic=button.dataset.marketTopic;
 document.querySelectorAll("button[data-market-topic]").forEach(item=>item.setAttribute("aria-pressed",String(item===button)));
 $("market-bot-answer").textContent=marketBotAnswer(selectedBotTopic,state);
});
newGame();
if("serviceWorker" in navigator&&location.protocol==="https:")
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}));
