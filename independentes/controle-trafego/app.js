import {createTraffic,runTrafficTurn,undoTrafficTurn,toggleTrafficPause} from './engine.mjs';
const $=id=>document.getElementById(id);
const STORAGE='pg-strategy-traffic-records-v1';
let state,topic=null,records={};
try{
 const saved=JSON.parse(localStorage.getItem(STORAGE)||'{}');
 if(saved&&typeof saved==='object'&&!Array.isArray(saved))
  records=Object.fromEntries(Object.entries(saved).filter(([key,value])=>/^(cidade|resgate):(recruta|tatico|veterano)$/.test(key)&&Number.isInteger(value)&&value>=0&&value<=30));
}catch{}
function key(){return state.mode+':'+state.difficulty;}
function saveRecord(){
 if(state.phase!=='won')return;
 if(!records[key()]||state.served>records[key()]){
  records[key()]=state.served;
  try{localStorage.setItem(STORAGE,JSON.stringify(records))}catch{}
 }
}
function botAnswer(){
 if(topic==='controles')return 'Escolha Norte–Sul ou Leste–Oeste a cada turno. Um veículo de cada via aberta atravessa. Pausar não avança o relógio e Desfazer restaura a última decisão.';
 if(topic==='situacao')return 'Turno '+state.turn+' de '+state.maxTurns+', '+state.served+' veículos liberados. Ambulâncias liberadas: '+state.urgentServed+'. '+state.notice;
 return state.mode==='cidade'?'Libere pelo menos '+state.target+' veículos em 12 turnos sem ultrapassar o limite de '+state.maxQueue+' carros por via.':'Libere '+state.target+' veículos e as duas ambulâncias antes de expirar o prazo. Observe o Leste.';
}
function render(){
 $('turns').textContent=state.turn+'/'+state.maxTurns;
 $('served').textContent=state.served+'/'+state.target;
 $('emergency').textContent=state.mode==='resgate'?state.urgentServed+'/2':'Não há';
 $('limit').textContent=state.maxQueue;
 $('phase').textContent=state.phase==='won'?'Vitória':state.phase==='lost'?'Derrota':state.paused?'Pausado':'Em andamento';
 $('phase').dataset.phase=state.phase;
 $('status').textContent=state.notice;
 $('status').dataset.phase=state.phase;
 const labels={N:'Norte',E:'Leste',S:'Sul',W:'Oeste'};
 for(const side of Object.keys(labels)){
  const cars=state.lanes[side],urgents=cars.filter(car=>car.urgent).length;
  $('lane-'+side).textContent=cars.length+' '+(cars.length===1?'veículo':'veículos')+(urgents?' · 🚑 '+urgents:'');
  document.querySelector('[data-lane="'+side+'"]').dataset.active=state.axis!=='none'&&(state.axis==='NS'?['N','S'].includes(side):['E','W'].includes(side))?'true':'false';
 }
 $('signal').textContent=state.axis==='none'?'◉':state.axis==='NS'?'↕':'↔';
 $('signal').setAttribute('aria-label',state.axis==='none'?'Semáforo fechado':'Última abertura: '+(state.axis==='NS'?'Norte–Sul':'Leste–Oeste'));
 const enabled=state.phase==='playing'&&!state.paused;
 $('signal-ns').disabled=!enabled;
 $('signal-ew').disabled=!enabled;
 $('pause').disabled=state.phase!=='playing';
 $('pause').textContent=state.paused?'Retomar operação':'Pausar operação';
 $('pause').setAttribute('aria-pressed',String(state.paused));
 $('undo').disabled=!state.history.length;
 $('record').textContent=records[key()]?'Maior resultado nesta configuração: '+records[key()]+' veículos.':'Sem recordes nesta configuração.';
 if(topic)$('bot-answer').textContent=botAnswer();
}
function reset(){
 const raw=new URLSearchParams(location.search).get('seed');
 const seed=raw!==null&&/^\d{1,10}$/.test(raw)&&Number.isSafeInteger(Number(raw))?Number(raw):0;
 state=createTraffic({mode:$('mode').value,difficulty:$('difficulty').value,seed});
 topic=null;$('bot-answer').textContent='Escolha um assunto.';render();
}
for(const button of document.querySelectorAll('[data-axis]'))button.addEventListener('click',event=>{
 const axis=button.dataset.axis;
 state=runTrafficTurn(state,axis);
 saveRecord();render();
 if(event.detail===0&&state.phase!=='playing')$('reset').focus({preventScroll:true});
});
$('pause').addEventListener('click',()=>{state=toggleTrafficPause(state);render()});
$('undo').addEventListener('click',()=>{state=undoTrafficTurn(state);render()});
$('reset').addEventListener('click',reset);
$('mode').addEventListener('change',reset);
$('difficulty').addEventListener('change',reset);
$('pg-bot').addEventListener('click',event=>{
 const control=event.target.closest('[data-help]');if(!control)return;
 topic=control.dataset.help;
 for(const b of document.querySelectorAll('[data-help]'))b.setAttribute('aria-pressed',String(b===control));
 $('bot-answer').textContent=botAnswer();
});
reset();
if('serviceWorker'in navigator&&location.protocol==='https:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}));