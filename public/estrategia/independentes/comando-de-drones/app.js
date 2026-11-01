import {SIDE,WALLS,COMMANDS,createDroneGame,queueDroneOrder,removeDroneOrder,executeDroneProgram,undoDroneCycle,toggleDronePause,patrolAt} from './engine.mjs';
const $=id=>document.getElementById(id);
const KEY='pg-estrategia-drones-records-v1';
const NAMES={up:'↑ Subir',down:'↓ Descer',left:'← Esquerda',right:'→ Direita',wait:'⏳ Aguardar'};
let state,records={},topic=null;
try{
 const parsed=JSON.parse(localStorage.getItem(KEY)||'{}');
 if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))
  records=Object.fromEntries(Object.entries(parsed).filter(([k,v])=>/^(resgate|varredura):(recruta|tatico|veterano)$/.test(k)&&Number.isInteger(v)&&v>0&&v<=30));
}catch{}
function help(topic){
 if(topic==='objetivo')return 'Colete os dois sinais ◆ antes de chegar ao terminal ⌂. A operação '+$('mode').selectedOptions[0].textContent+' tem posições próprias.';
 if(topic==='controles')return 'Toque ou use Tab e Enter nos cinco comandos. Você pode programar de 1 a 3 ordens, executar, remover uma ordem, pausar ou desfazer o último ciclo.';
 if(topic==='situacao')return 'Você possui '+state.energy+' unidades de energia, '+state.integrity+' de integridade e coletou '+state.collected.length+' de 2 sinais. Ciclo '+state.cycles+' de '+state.maxCycles+'. '+state.notice;
 return 'Selecione um assunto válido.';
}
function render(){
 $('energy').textContent=state.energy;
 $('integrity').textContent=state.integrity;
 $('cycles').textContent=state.cycles+'/'+state.maxCycles;
 $('beacons').textContent=state.collected.length+'/2';
 $('phase').textContent=state.phase==='won'?'Vitória':state.phase==='lost'?'Derrota':state.paused?'Pausado':'Em andamento';
 $('phase').dataset.phase=state.phase;
 $('queue').textContent=state.queue.length?state.queue.map((cmd,i)=>(i+1)+'. '+NAMES[cmd]).join('  ·  '):'Nenhuma ordem programada.';
 $('status').textContent=state.notice;
 $('status').dataset.phase=state.phase;
 const ready=state.phase==='playing'&&!state.paused;
 $('execute').disabled=!ready||!state.queue.length;
 $('undo-order').disabled=!ready||!state.queue.length;
 $('undo-cycle').disabled=!state.history.length;
 $('pause').disabled=state.phase!=='playing';
 $('pause').setAttribute('aria-pressed',String(state.paused));
 $('pause').textContent=state.paused?'Retomar partida':'Pausar partida';
 for(const b of $('commands').querySelectorAll('button[data-command]'))b.disabled=!ready||state.queue.length>=3;
 const patrol=patrolAt(state),nodes=[];
 for(let i=0;i<SIDE*SIDE;i++){
  const r=Math.floor(i/SIDE)+1,c=i%SIDE+1,wall=WALLS.includes(i);
  const drone=i===state.position,enemy=i===patrol;
  const beacon=state.beacons.includes(i)&&!state.collected.includes(i);
  const exit=i===24;
  const cell=document.createElement('div');cell.className='cell';cell.setAttribute('role','gridcell');
  cell.dataset.kind=drone?'drone':enemy?'enemy':wall?'wall':beacon?'beacon':exit?'exit':'empty';
  cell.textContent=drone?'◉':enemy?'◈':wall?'■':beacon?'◆':exit?'⌂':'';
  cell.setAttribute('aria-label','Linha '+r+', coluna '+c+': '+(drone?'seu drone':enemy?'sentinela':wall?'bloqueio':beacon?'sinal':exit?'terminal':'casa livre'));
  nodes.push(cell);
 }
 $('board').replaceChildren(...nodes);
 const key=state.mode+':'+state.difficulty;
 $('record').textContent=records[key]?'Melhor resultado neste modo: '+records[key]+' comandos.':'Ainda sem recorde neste modo.';
 if(topic)$('bot-answer').textContent=help(topic);
}
function start(){
 const requested=new URLSearchParams(location.search).get('seed');
 const seed=requested!==null&&/^\d{1,10}$/.test(requested)&&Number.isSafeInteger(Number(requested))?Number(requested):Math.floor(Math.random()*0xffffffff);
 state=createDroneGame({mode:$('mode').value,difficulty:$('difficulty').value,seed});
 topic=null;$('bot-answer').textContent='Escolha um assunto.';render();
}
function record(){
 if(state.phase!=='won')return;
 const key=state.mode+':'+state.difficulty;
 if(!records[key]||state.tick<records[key]){
  records[key]=state.tick;
  try{localStorage.setItem(KEY,JSON.stringify(records));}catch{}
 }
}
$('commands').addEventListener('click',event=>{
 const b=event.target.closest('button[data-command]');
 if(!b||!COMMANDS.includes(b.dataset.command))return;
 state=queueDroneOrder(state,b.dataset.command);render();
});
$('execute').addEventListener('click',()=>{state=executeDroneProgram(state);record();render();});
$('undo-order').addEventListener('click',()=>{state=removeDroneOrder(state);render();});
$('undo-cycle').addEventListener('click',()=>{state=undoDroneCycle(state);render();});
$('pause').addEventListener('click',()=>{state=toggleDronePause(state);render();});
$('reset').addEventListener('click',start);
$('mode').addEventListener('change',start);
$('difficulty').addEventListener('change',start);
$('pg-bot').addEventListener('click',event=>{
 const b=event.target.closest('button[data-help]');if(!b)return;
 topic=b.dataset.help;$('bot-answer').textContent=help(topic);
});
start();
if('serviceWorker'in navigator&&location.protocol==='https:')window.addEventListener('load',()=>{
 navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
});
