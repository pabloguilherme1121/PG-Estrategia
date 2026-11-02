import {createCipher,submitCipherGuess,revealCipherHint,pauseCipher,resumeCipher,CIPHER_TOKENS} from './engine.mjs';
import {cipherHelp,CIPHER_HELP} from './pg-bot.mjs';
const $=id=>document.getElementById(id);
const TOKEN_LABELS=Object.freeze({
 sol:'Sol',lua:'Lua',mar:'Mar',terra:'Terra',vento:'Vento',fogo:'Fogo',estrela:'Estrela'
});
const STORAGE='pg-estrategia-cifras-recordes-v1';
let state,botTopic=null,records={};
try{
 const value=JSON.parse(localStorage.getItem(STORAGE)||'{}');
 if(value&&typeof value==='object'&&!Array.isArray(value))
  records=Object.fromEntries(Object.entries(value).filter(([key,v])=>
   /^(codigo|expedicao):(recruta|tatico|veterano)$/.test(key)&&Number.isSafeInteger(v)&&v>=1&&v<=100));
}catch{/* armazenamento opcional */}
function buildSlots(){
 const count=state.secret.length;
 const nodes=[];
 for(let i=0;i<count;i++){
  const label=document.createElement('label');label.className='slot';
  const text=document.createElement('span');text.textContent='Posição '+(i+1);
  const select=document.createElement('select');select.id='symbol-'+i;select.setAttribute('aria-label','Símbolo da posição '+(i+1));
  for(const token of CIPHER_TOKENS){
    const option=document.createElement('option');option.value=token;option.textContent=TOKEN_LABELS[token];
    select.append(option);
  }
  select.value=CIPHER_TOKENS[i];label.append(text,select);nodes.push(label);
 }
 $('slots').replaceChildren(...nodes);
}
function readGuess(){return [...$('slots').querySelectorAll('select')].map(s=>s.value);}
function recordWin(){
 if(state.status!=='won')return;
 const key=state.mode+':'+state.difficulty;
 const score=Math.max(1,100-state.history.length*5-(2-state.hintsRemaining)*15);
 if(score>(records[key]||0)){
  records[key]=score;
  try{localStorage.setItem(STORAGE,JSON.stringify(records));}catch{/* storage optional */}
 }
}
function render(){
 $('round').textContent=state.history.length+' / '+state.maxAttempts;
 $('pause').textContent=state.paused?'Retomar':'Pausar';
 $('pause').setAttribute('aria-pressed',String(state.paused));
 $('pause').disabled=state.status!=='playing';
 $('submit').disabled=state.paused||state.status!=='playing';
 $('hint').disabled=state.paused||state.status!=='playing'||state.hintsRemaining===0;
 for(const select of $('slots').querySelectorAll('select'))select.disabled=state.paused||state.status!=='playing';
 const hints=state.reveals.map(entry=>'Posição '+(entry.index+1)+': '+TOKEN_LABELS[entry.token]);
 $('hints').textContent='Dicas restantes: '+state.hintsRemaining+(hints.length?' · '+hints.join(' · '):'');
 $('status').textContent=state.notice;
 $('status').dataset.status=state.status;
 $('record').textContent=records[state.mode+':'+state.difficulty]?'Melhor pontuação local: '+records[state.mode+':'+state.difficulty]:'Ainda sem recorde neste modo.';
 const items=state.history.map((entry,i)=>{
  const item=document.createElement('li');item.className='history-row';
  const guess=document.createElement('strong');guess.textContent='Tentativa '+(i+1)+': '+entry.guess.map(token=>TOKEN_LABELS[token]).join(' · ');
  const result=document.createElement('span');result.textContent=entry.exact+' exatos · '+entry.misplaced+' deslocados';
  item.append(guess,result);return item;
 });
 $('history').replaceChildren(...items);
 if(botTopic)$('bot-answer').textContent=cipherHelp(botTopic,state);
}
function start(){
 const requested=new URLSearchParams(location.search).get('seed');
 const parsed=requested!==null&&/^\d{1,10}$/.test(requested)?Number(requested):Math.floor(Math.random()*0xffffffff);
 state=createCipher({mode:$('mode').value,difficulty:$('difficulty').value,seed:parsed});
 buildSlots();render();
}
$('submit').addEventListener('click',()=>{
 const guess=readGuess();
 if(new Set(guess).size!==guess.length){
  $('status').textContent='Escolha símbolos diferentes em cada posição.';
  return;
 }
 const next=submitCipherGuess(state,guess);
 if(next===state)return;
 state=next;recordWin();render();
});
$('hint').addEventListener('click',()=>{state=revealCipherHint(state);render();});
$('pause').addEventListener('click',()=>{state=state.paused?resumeCipher(state):pauseCipher(state);render();});
$('restart').addEventListener('click',start);
$('mode').addEventListener('change',start);
$('difficulty').addEventListener('change',start);
$('pg-bot').addEventListener('click',event=>{
 const button=event.target.closest('button[data-help]');
 if(!button||!CIPHER_HELP.includes(button.dataset.help))return;
 botTopic=button.dataset.help;$('bot-answer').textContent=cipherHelp(botTopic,state);
});
start();
if('serviceWorker' in navigator && location.protocol==='https:')
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}));
