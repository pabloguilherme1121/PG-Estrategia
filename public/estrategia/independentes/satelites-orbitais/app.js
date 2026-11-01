import {createOrbitals,stepOrbitals,undoOrbitals,toggleOrbitalPause,hintOrbitals} from "./engine.mjs";
const $=id=>document.getElementById(id);
const modes=new Set(["cobertura","economia"]),levels=new Set(["recruta","tatico","veterano"]);
const param=new URLSearchParams(location.search),n=Number(param.get("seed")??0);
const seed=Number.isSafeInteger(n)&&n>=0&&n<=999999999?n:0;
const PREF="pg-estrategia-orbitais-preferencias-v1",SAVE="pg-estrategia-orbitais-recordes-v1";
const read=key=>{try{return JSON.parse(localStorage.getItem(key)||"null");}catch{return null;}};
const prefs=read(PREF);
if(modes.has(prefs?.mode))$("mode").value=prefs.mode;
if(levels.has(prefs?.difficulty))$("difficulty").value=prefs.difficulty;
let records=read(SAVE);if(!records||typeof records!=="object"||Array.isArray(records))records={};
let state;
const recordKey=()=>state.mode+":"+state.difficulty;
function persistRecord(){
 if(state.phase!=="won")return;
 const key=recordKey(),old=records[key];
 if(Number.isInteger(old)&&old>=state.score)return;
 records[key]=state.score;try{localStorage.setItem(SAVE,JSON.stringify(records));}catch{}
}
function makeButton(label,onClick,disabled=false){
 const b=document.createElement("button");b.type="button";b.textContent=label;b.disabled=disabled;
 b.addEventListener("click",onClick);return b;
}
function render(){
 $("turn").textContent=Math.min(state.turn+1,state.slots)+"/"+state.slots;
 $("energy").textContent=state.energy+"/"+state.maxEnergy;
 $("captured").textContent=state.captured.length+"/"+state.targets.length;
 const record=records[recordKey()];$("record").textContent=Number.isInteger(record)?record+" pontos":"Nenhum";
 $("phase").textContent=state.phase==="won"?"Vitória":state.phase==="lost"?"Derrota":state.paused?"Pausado":"Em andamento";
 $("status-text").textContent=state.message;
 $("mission").textContent=state.mode==="cobertura"?"Objetivo: transmitir todos os alvos.":"Objetivo: alcançar "+state.goal+" pontos de observação.";
 $("pause").textContent=state.paused?"Retomar":"Pausar";$("pause").disabled=state.phase!=="playing";
 $("undo").disabled=state.phase!=="playing"||state.paused||!state.history.length;
 $("hint").disabled=state.phase!=="playing"||state.paused;
 $("wait").disabled=state.phase!=="playing"||state.paused;
 const time=document.createDocumentFragment();
 for(let i=0;i<state.slots;i++){
  const cell=document.createElement("span");cell.className="slot";
  cell.dataset.state=i<state.turn?"past":i===state.turn?"current":state.blocked.includes(i)?"blocked":"future";
  cell.textContent=state.blocked.includes(i)?"×":String(i+1);
  cell.setAttribute("aria-label","Janela "+(i+1)+": "+(state.blocked.includes(i)?"tempestade":i<state.turn?"concluída":i===state.turn?"atual":"futura"));
  time.append(cell);
 }
 $("timeline").replaceChildren(time);
 const cards=document.createDocumentFragment();
 for(const target of state.targets){
  const done=state.captured.includes(target.id);
  const active=state.turn>=target.start&&state.turn<=target.end&&!state.blocked.includes(state.turn);
  const can=state.phase==="playing"&&!state.paused&&!done&&active&&state.energy>=target.cost;
  const tile=document.createElement("div");tile.className="target";tile.dataset.captured=String(done);
  const name=document.createElement("strong");name.textContent=target.name;
  const note=document.createElement("small");
  note.textContent="Janelas "+(target.start+1)+"–"+(target.end+1)+" · canal "+target.channel+" · "+target.reward+" pontos";
  const b=makeButton(done?"Concluído":active?"Transmitir":"Fora da janela",()=>play({kind:"capture",target:target.id}),!can);
  b.setAttribute("aria-label",(done?"Concluído: ":"Transmitir: ")+target.name);
  tile.append(name,note,b);cards.append(tile);
 }
 $("targets").replaceChildren(cards);
}
function play(action){
 const next=stepOrbitals(state,action);if(next===state)return;
 state=next;persistRecord();$("hint-text").textContent="";render();
}
function restart(){
 state=createOrbitals({mode:$("mode").value,difficulty:$("difficulty").value,seed});
 try{localStorage.setItem(PREF,JSON.stringify({mode:state.mode,difficulty:state.difficulty}));}catch{}
 $("hint-text").textContent="";render();
}
$("mode").addEventListener("change",restart);$("difficulty").addEventListener("change",restart);
$("wait").addEventListener("click",()=>play({kind:"wait"}));
$("pause").addEventListener("click",()=>{state=toggleOrbitalPause(state);render();});
$("undo").addEventListener("click",()=>{state=undoOrbitals(state);$("hint-text").textContent="";render();});
$("reset").addEventListener("click",restart);
$("hint").addEventListener("click",()=>{
 const suggestion=hintOrbitals(state);
 if(!suggestion){$("hint-text").textContent="Sem rota vencedora restante; tente reiniciar.";return;}
 const target=state.targets.find(t=>t.id===suggestion.target);
 $("hint-text").textContent=target?"Dica: transmita "+target.name+" nesta janela.":"Dica: aguarde a próxima janela para recuperar energia ou evitar tempestades.";
});
document.querySelectorAll("[data-bot]").forEach(button=>button.addEventListener("click",()=>{
 const type=button.dataset.bot;
 $("bot-answer").textContent=type==="situation"?"Janela "+(state.turn+1)+" de "+state.slots+", "+state.captured.length+" alvos concluídos, energia "+state.energy+".":type==="strategy"?"Observe o prazo de cada alvo e planeje a bateria. Janelas com tempestade não aceitam transmissões.":"Escolha Transmitir em um alvo visível, ou Avançar órbita. Pausar bloqueia comandos. Desfazer retorna um turno. Os dados ficam no aparelho.";
}));
restart();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(()=>{}),{once:true});