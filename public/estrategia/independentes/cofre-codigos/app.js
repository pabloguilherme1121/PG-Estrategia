import {createVault,submitVaultGuess,undoVaultGuess,pauseVault,hintVault} from "./engine.mjs";
const $=id=>document.getElementById(id),PREF="pg-estrategia-cofre-config-v1",SAVE="pg-estrategia-cofre-recordes-v1";
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}};
const pref=read(PREF),stored=read(SAVE),records=stored&&typeof stored==="object"&&!Array.isArray(stored)?stored:{};
if(["sem-repeticao","com-repeticao"].includes(pref?.mode))$("mode").value=pref.mode;
if(["recruta","tatico","veterano"].includes(pref?.difficulty))$("difficulty").value=pref.difficulty;
const sym=["◆","●","▲","■","★","✦","✚","⬟"];
let game,guess,selected=0;
const key=()=>game.mode+":"+game.difficulty;
function record(){
 if(game.phase!=="won")return;const old=records[key()];
 if(Number.isInteger(old)&&old>=game.score)return;
 records[key()]=game.score;try{localStorage.setItem(SAVE,JSON.stringify(records));}catch{}
}
function setSymbol(index,value){
 if(game.phase!=="playing"||game.paused)return;
 if(game.mode==="sem-repeticao"){
  const old=guess.indexOf(value);if(old!==-1&&old!==index)guess[old]=null;
 }
 guess[index]=value;selected=index;render();
}
function render(){
 $("attempts").textContent=game.attempts.length+"/"+game.maxAttempts;
 $("reveals").textContent=game.revealed.length+"/"+game.secret.length;
 $("mode-label").textContent=game.mode==="sem-repeticao"?"Sem repetição":"Com repetição";
 $("phase").textContent=game.phase==="won"?"Vitória":game.phase==="lost"?"Derrota":game.paused?"Pausado":"Em andamento";
 $("status-text").textContent=game.message;
 $("record").textContent=Number.isInteger(records[key()])?records[key()]+" pontos":"Nenhum";
 $("pause").textContent=game.paused?"Retomar":"Pausar";$("pause").disabled=game.phase!=="playing";
 $("undo").disabled=game.phase!=="playing"||game.paused||!game.attempts.length;
 $("hint").disabled=game.phase!=="playing"||game.paused||game.revealed.length>=game.secret.length;
 $("submit").disabled=game.phase!=="playing"||game.paused||guess.some(x=>x===null);
 const slots=document.createDocumentFragment();
 guess.forEach((value,index)=>{
  const cell=document.createElement("div");cell.className="slot";cell.dataset.selected=String(selected===index);
  const choose=document.createElement("button");choose.type="button";choose.textContent=value===null?"?":sym[value];choose.setAttribute("aria-label","Posição "+(index+1)+": "+(value===null?"vazia":"símbolo "+value));
  choose.disabled=game.phase!=="playing"||game.paused;
  choose.addEventListener("click",()=>{selected=index;render();});
  const previous=document.createElement("button");previous.type="button";previous.className="adjust";previous.textContent="−";previous.setAttribute("aria-label","Símbolo anterior da posição "+(index+1));previous.disabled=choose.disabled;
  previous.addEventListener("click",()=>setSymbol(index,(value===null?game.palette:value+game.palette-1)%game.palette));
  const next=document.createElement("button");next.type="button";next.className="adjust";next.textContent="+";next.setAttribute("aria-label","Próximo símbolo da posição "+(index+1));next.disabled=choose.disabled;
  next.addEventListener("click",()=>setSymbol(index,(value===null?0:value+1)%game.palette));
  cell.append(previous,choose,next);slots.append(cell);
 });
 $("slots").replaceChildren(slots);
 const palette=document.createDocumentFragment();
 for(let i=0;i<game.palette;i++){
  const btn=document.createElement("button");btn.type="button";btn.textContent=sym[i];btn.setAttribute("aria-label","Usar símbolo "+i);
  btn.disabled=game.phase!=="playing"||game.paused;
  btn.addEventListener("click",()=>setSymbol(selected,i));palette.append(btn);
 }
 $("palette").replaceChildren(palette);
 const history=document.createDocumentFragment();
 game.attempts.forEach((attempt,i)=>{
  const li=document.createElement("li");li.className="attempt";const label=document.createElement("span");
  label.textContent=(i+1)+". "+attempt.guess.map(x=>sym[x]).join(" ");const feedback=document.createElement("strong");
  feedback.textContent="Exatos: "+attempt.exact+" · Deslocados: "+attempt.misplaced;li.append(label,feedback);history.append(li);
 });
 $("history").replaceChildren(history);
}
function restart(){
 game=createVault({mode:$("mode").value,difficulty:$("difficulty").value,seed:0});guess=Array(game.secret.length).fill(null);selected=0;
 try{localStorage.setItem(PREF,JSON.stringify({mode:game.mode,difficulty:game.difficulty}));}catch{}
 $("hint-text").textContent="";render();
}
$("mode").addEventListener("change",restart);$("difficulty").addEventListener("change",restart);
$("submit").addEventListener("click",()=>{
 const next=submitVaultGuess(game,guess);
 if(next===game){$("hint-text").textContent="Verifique todos os símbolos e as repetições.";return;}
 game=next;record();guess=Array(game.secret.length).fill(null);selected=0;$("hint-text").textContent="";render();
});
$("pause").addEventListener("click",()=>{game=pauseVault(game);render();});
$("undo").addEventListener("click",()=>{game=undoVaultGuess(game);render();});
$("reset").addEventListener("click",restart);
$("hint").addEventListener("click",()=>{
 const hint=hintVault(game);if(!hint)return;
 game={...game,revealed:[...game.revealed,hint.index]};
 setSymbol(hint.index,hint.value);
 $("hint-text").textContent="Dica: posição "+(hint.index+1)+" contém "+sym[hint.value]+".";
 render();
});
document.querySelectorAll("[data-bot]").forEach(button=>button.addEventListener("click",()=>{
 $("bot-answer").textContent=button.dataset.bot==="situation"?"Você usou "+game.attempts.length+" de "+game.maxAttempts+" tentativas, com "+game.revealed.length+" posições reveladas.":button.dataset.bot==="strategy"?"Use a contagem de exatos e deslocados para eliminar posições. Mantenha símbolos confirmados e altere apenas os demais.":"Toque numa posição, escolha um símbolo e use Testar combinação. Se o modo não permite repetição, um símbolo selecionado é movido da posição antiga. Desfazer apaga a última tentativa.";
}));
restart();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}),{once:true});