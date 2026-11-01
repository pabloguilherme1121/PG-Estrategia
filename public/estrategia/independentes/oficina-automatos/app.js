import {createWorkshop,commandWorkshop,canWorkshopAction} from './engine.mjs';
const $=id=>document.getElementById(id);
const ACTIONS=[
 ['mine','Mineração: +3 minério'],['smelt','Fundir: 2 minério → 1 placa'],
 ['forge','Forjar: 2 placas → 1 engrenagem'],['assemble','Montar: placa + engrenagem → autômato'],
 ['sell','Vender 2 minérios: +6 créditos'],['cool','Resfriar máquinas'],
 ['upgrade','Melhorar extrator: 8 créditos'],['rest','Descansar e recuperar energia']
];
let current;let topic='objetivo';const STORAGE='pg-strategy-workshop-records-v1';
let records={};
try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
 for(const [key,value] of Object.entries(saved))if(/^(recruta|tatico|veterano):(montagem|contrato)$/.test(key)&&Number.isFinite(value)&&value>=0)records[key]=value;
}}catch{}
function key(){return current.difficulty+':'+current.mode}
function record(){if(current.status==='won'&&current.score>(records[key()]||0)){
 records[key()]=current.score;try{localStorage.setItem(STORAGE,JSON.stringify(records))}catch{}}
}
function gameMessage(){
 if(topic==='controles')return 'Cada comando gasta um dia e energia. Extraia minério, funda placas, use duas placas para engrenagens e depois monte robôs. Descanse para recuperar energia ou resfrie as máquinas.';
 if(topic==='situacao')return current.status==='won'?'Meta alcançada: vitória. Reinicie para tentar outra dificuldade.':current.status==='lost'?'Prazo encerrado. Reinicie e tente outra sequência.':current.status==='paused'?'A oficina está pausada. Toque em Retomar produção.':`Dia ${current.day} de ${current.maxDays}. Energia ${current.energy}; calor ${current.heat}/${current.maxHeat}. Revise a cadeia de produção antes do próximo comando.`;
 return current.mode==='montagem'?'Objetivo: produzir dois autômatos. Mineração → fundição → engrenagens → montagem. Aqueça menos a fábrica com pausas de resfriamento.':'Objetivo: montar um autômato e guardar pelo menos 20 créditos. Venda matéria-prima extra e preserve o caixa.';
}
function restoreKeyboardFocus(type,byKeyboard){
 if(!byKeyboard)return;
 const enabled=[...$('actions').querySelectorAll('button:not(:disabled)')];
 const target=enabled.find(button=>button.dataset.action===type)??enabled[0]??$('restart');
 target.focus({preventScroll:true});
}
function render(){
 const s=current;
 $('metrics').replaceChildren(...[
 ['Dia',`${s.day} / ${s.maxDays}`],['Energia',`${s.energy} / ${s.maxEnergy}`],['Calor',`${s.heat} / ${s.maxHeat}`],
 ['Minério',s.ore],['Placas',s.plates],['Engrenagens',s.gears],['Autômatos',s.robots],['Créditos',s.credits],['Extrator',s.upgraded?'Nível 2':'Nível 1']
 ].map(([name,value])=>{const e=document.createElement('div');e.className='metric';const small=document.createElement('small'),strong=document.createElement('strong');small.textContent=String(name);strong.textContent=String(value);e.append(small,strong);return e}));
 $('goal').textContent=s.mode==='montagem'?'Meta: dois autômatos prontos antes do último dia.':'Meta: um autômato pronto e 20 créditos guardados.';
 $('notice').textContent=s.notice;$('notice').dataset.status=s.status;
 $('record').textContent='Melhor recorde local: '+(records[key()]||'—');
 $('actions').replaceChildren(...ACTIONS.map(([type,label])=>{
  const b=document.createElement('button');b.type='button';b.textContent=type==='mine'&&s.upgraded?'Mineração: +4 minério':label;b.disabled=!canWorkshopAction(s,{type});b.dataset.action=type;b.setAttribute('aria-label',b.textContent);b.addEventListener('click',event=>{current=commandWorkshop(current,{type});record();render();restoreKeyboardFocus(type,event.detail===0)});return b;
 }));
 if(s.status==='playing'||s.status==='paused'){
  const b=document.createElement('button');b.type='button';b.textContent=s.status==='paused'?'Retomar produção':'Pausar produção';b.dataset.action='toggle-pause';b.addEventListener('click',event=>{current=commandWorkshop(current,{type:current.status==='playing'?'pause':'resume'});render();restoreKeyboardFocus('toggle-pause',event.detail===0)});$('actions').append(b);
 }
 if($('pg-bot').open)$('bot-answer').textContent=gameMessage();
}
function reset(){current=createWorkshop({difficulty:$('difficulty').value,mode:$('mode').value,seed:3});render()}
$('difficulty').addEventListener('change',reset);$('mode').addEventListener('change',reset);$('restart').addEventListener('click',reset);
$('pg-bot').addEventListener('toggle',()=>{if($('pg-bot').open)$('bot-answer').textContent=gameMessage()});
for(const b of document.querySelectorAll('[data-help]'))b.addEventListener('click',()=>{topic=b.dataset.help;for(const option of document.querySelectorAll('[data-help]'))option.setAttribute('aria-pressed',String(option===b));$('bot-answer').textContent=gameMessage()});
reset();
if('serviceWorker' in navigator&&location.protocol==='https:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}));