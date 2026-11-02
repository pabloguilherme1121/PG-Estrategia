import {createMills,legalActions,playMills,toggleMillsPause,undoMills} from './engine.mjs';
const $=id=>document.getElementById(id);
const POINTS=[
 [5,5],[50,5],[95,5],[95,50],[95,95],[50,95],[5,95],[5,50],
 [20,20],[50,20],[80,20],[80,50],[80,80],[50,80],[20,80],[20,50],
 [35,35],[50,35],[65,35],[65,50],[65,65],[50,65],[35,65],[35,50]
];
const KEY='pg-estrategia-moinhos-vitorias-v1',PREF='pg-estrategia-moinhos-preferencias-v1';
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
let records=read(KEY);if(!records||typeof records!=='object'||Array.isArray(records))records={};
const prefs=read(PREF);
if(['classico','rapido'].includes(prefs?.mode))$('mode').value=prefs.mode;
if(['recruta','tatico','veterano'].includes(prefs?.difficulty))$('difficulty').value=prefs.difficulty;
let state,selection=null,previousResult='playing',revision=0;
const board=$('board');
const buttons=POINTS.map(([x,y],index)=>{
 const button=document.createElement('button');
 button.type='button';button.className='point';button.dataset.index=String(index);
 button.style.left=x+'%';button.style.top=y+'%';
 button.addEventListener('click',()=>choose(index));
 board.append(button);return button;
});
function saveWin(){
 const key=state.mode+':'+state.difficulty;
 if(state.phase==='won'&&previousResult!=='won'){
  const value=Number(records[key]);
  records[key]=Number.isSafeInteger(value)&&value>=0&&value<1000000?value+1:1;
  write(KEY,records);
 }
 previousResult=state.phase;
}
const ownerLabel=owner=>owner===1?'sua pedra':owner===2?'pedra rival':'casa vazia';
function render(){
 const actions=legalActions(state);
 const legalDestinations=new Set(actions.filter(a=>a.to!==undefined&&(a.type==='place'||a.from===selection)).map(a=>a.to));
 buttons.forEach((button,index)=>{
  const owner=state.board[index];
  button.dataset.owner=String(owner);
  button.textContent=owner===1?'●':owner===2?'◆':'';
  button.setAttribute('aria-label','Ponto '+(index+1)+', '+ownerLabel(owner));
  button.setAttribute('aria-pressed',String(selection===index));
  button.classList.toggle('selected',selection===index);
  button.classList.toggle('legal',legalDestinations.has(index));
  button.disabled=state.phase!=='playing'||state.paused;
 });
 $('human-pieces').textContent=state.board.filter(p=>p===1).length+'/'+state.piecesPerSide;
 $('bot-pieces').textContent=state.board.filter(p=>p===2).length+'/'+state.piecesPerSide;
 $('turns').textContent=String(state.turns);
 $('record').textContent=String(records[state.mode+':'+state.difficulty]||0);
 $('turn-badge').textContent=state.phase==='won'?'Vitória':state.phase==='lost'?'Derrota':state.phase==='draw'?'Empate':state.paused?'Pausado':state.pendingCapture?'Capture uma pedra':'Sua vez';
 $('status').textContent=state.phase==='won'?'Você venceu!':state.phase==='lost'?'O rival venceu. Tente outra estratégia.':state.phase==='draw'?'Empate por limite de rodadas.':state.paused?'Partida pausada.':state.pendingCapture?'Você formou um moinho: escolha uma pedra rival para capturar.':state.message;
 $('pause').textContent=state.paused?'Retomar':'Pausar';
 $('pause').disabled=state.phase!=='playing';
 $('undo').disabled=state.paused||!state.history.length;
}
function start(){
 revision++;selection=null;previousResult='playing';
 state=createMills({mode:$('mode').value,difficulty:$('difficulty').value,seed:revision});
 write(PREF,{mode:state.mode,difficulty:state.difficulty});
 $('bot-answer').textContent='Selecione uma orientação.';
 render();
}
function choose(index){
 if(state.phase!=='playing'||state.paused)return;
 const legal=legalActions(state);
 let action;
 if(state.pendingCapture)action={type:'capture',at:index};
 else if(state.placed[1]<state.piecesPerSide)action={type:'place',to:index};
 else if(selection!==null&&selection!==index)action={type:'move',from:selection,to:index};
 if(action&&legal.some(a=>Object.keys(a).every(k=>action[k]===a[k]))){
  state=playMills(state,action);selection=null;saveWin();render();return;
 }
 if(state.placed[1]>=state.piecesPerSide&&state.board[index]===1){
  selection=selection===index?null:index;render();return;
 }
 if(!state.pendingCapture&&state.placed[1]>=state.piecesPerSide){
  $('status').textContent='Escolha uma pedra sua e depois um ponto conectado livre.';
 }
}
$('mode').addEventListener('change',start);
$('difficulty').addEventListener('change',start);
$('reset').addEventListener('click',start);
$('pause').addEventListener('click',()=>{state=toggleMillsPause(state);render()});
$('undo').addEventListener('click',()=>{state=undoMills(state);selection=null;previousResult=state.phase;render()});
board.addEventListener('keydown',event=>{
 if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
 if(!(event.target instanceof HTMLElement)||!event.target.matches('button.point'))return;
 event.preventDefault();
 const from=Number(event.target.dataset.index);
 const vector={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[event.key];
 const [x,y]=POINTS[from];let target=-1,best=Infinity;
 POINTS.forEach(([nx,ny],i)=>{
  const dx=nx-x,dy=ny-y;
  const projection=dx*vector[0]+dy*vector[1];
  if(projection<=0)return;
  const perpendicular=Math.abs(dx*vector[1]-dy*vector[0]);
  const score=projection+perpendicular*3;
  if(score<best){best=score;target=i}
 });
 if(target>=0)buttons[target].focus();
});
document.querySelectorAll('[data-topic]').forEach(button=>button.addEventListener('click',()=>{
 const topic=button.dataset.topic;
 const mine=state.board.filter(x=>x===1).length,rival=state.board.filter(x=>x===2).length;
 $('bot-answer').textContent=topic==='objective'
  ?'Forme linhas de três pedras conectadas para capturar e reduzir o rival a menos de três peças. Evite ficar sem movimentos.'
  :topic==='controls'
  ?'Toque ou use Tab e Enter em um ponto. Na fase de movimento, escolha sua pedra e depois o destino. Setas do teclado movem o foco.'
  :'Você tem '+mine+' pedras e o rival '+rival+'. '+(state.pendingCapture?'Capture uma pedra adversária.':state.placed[1]<state.piecesPerSide?'Distribua as pedras nos pontos livres.':'Proteja seus moinhos e procure linhas de três.');
}));
if('serviceWorker' in navigator&&location.protocol==='https:'){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}),{once:true});
}
start();
