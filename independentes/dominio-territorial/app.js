import {createDomainGame,actDomain,domainGuidance,GAME_RULES,axialNeighbors} from './engine.mjs';

const $=id=>document.getElementById(id);
const SVG='http://www.w3.org/2000/svg';
const STORAGE='pg-estrategia-dominio-territorial-record-v1';
const SIZE=42,CENTER_X=180,CENTER_Y=165;
let state=createDomainGame();
let topic='situacao';
let lastFocus=null;
let records={};
try{
 const data=JSON.parse(localStorage.getItem(STORAGE)||'{}');
 if(data&&typeof data==='object'&&!Array.isArray(data)){
  records=Object.fromEntries(Object.entries(data).filter(([id,value])=>
   ['recruta','tatico','veterano'].includes(id)&&Number.isSafeInteger(value)&&value>=1&&value<=GAME_RULES.maxTurns));
 }
}catch{}
const el=(tag,attributes={})=>{
 const node=document.createElementNS(SVG,tag);
 for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));
 return node;
};
const pos=(q,r)=>({
 x:CENTER_X+SIZE*Math.sqrt(3)*(q+r/2),
 y:CENTER_Y+SIZE*1.5*r
});
function hexPoints(x,y,r){
 return Array.from({length:6},(_,i)=>{
  const a=(60*i-30)*Math.PI/180;
  return (x+r*Math.cos(a)).toFixed(2)+','+(y+r*Math.sin(a)).toFixed(2);
 }).join(' ');
}
const makeText=(x,y,value,css='')=>{
 const n=el('text',{x,y,class:css});n.textContent=String(value);return n;
};
function drawBoard(){
 const grid=$('hex-grid');
 const elements=[];
 for(const [key,cell] of Object.entries(state.grid)){
  const {x,y}=pos(cell.q,cell.r);
  const group=el('g',{'class':'hex-cell','data-hex-key':key,'data-owner':cell.owner,
    'data-selected':state.selected===key,'role':'button',tabindex:state.phase==='playing'?'0':'-1',
    'aria-pressed':state.selected===key?'true':'false',
    'aria-disabled':state.phase==='playing'?'false':'true',
    'aria-label':'Setor '+key+', '+(cell.owner==='player'?'seu território':cell.owner==='enemy'?'adversário':'neutro')+
      ', '+cell.troops+' tropa(s), defesa '+cell.defenseBonus});
  group.append(el('polygon',{points:hexPoints(x,y,SIZE-2)}));
  if(cell.defenseBonus>1){
   group.append(el('circle',{cx:x,cy:y-18,r:9,class:'fort-bg'}),el('circle',{cx:x,cy:y-18,r:5,class:'fort'}));
  }
  group.append(makeText(x,y+5,cell.troops),makeText(x,y+23,key,'coord'));
  elements.push(group);
 }
 grid.replaceChildren(...elements);
 if(lastFocus){
  const node=[...grid.querySelectorAll('[data-hex-key]')].find(e=>e.dataset.hexKey===lastFocus);
  node?.focus({preventScroll:true});
 }
}
function apply(action){
 const next=actDomain(state,action);
 if(next===state)return false;
 const victory=state.phase!=='victory'&&next.phase==='victory';
 state=next;
 if(victory){
  const previous=records[state.difficulty];
  if(!previous||state.turn<previous){
   records[state.difficulty]=state.turn;
   try{localStorage.setItem(STORAGE,JSON.stringify(records))}catch{}
  }
 }
 render();
 return true;
}
function chooseCell(key,keyboard=false){
 if(state.phase!=='playing')return;
 const cell=state.grid[key];
 if(!cell)return;
 if(key===state.selected){lastFocus=keyboard?key:null;apply({type:'SELECT',target:key});return}
 if(cell.owner==='player'){
  lastFocus=keyboard?key:null;
  apply({type:'SELECT',target:key});return;
 }
 if(state.selected){
  const source=state.selected;
  if(!axialNeighbors(source).includes(key)){
   $('game-status').textContent='O ataque só pode alcançar hexágonos vizinhos.';
   return;
  }
  lastFocus=keyboard?key:null;
  apply({type:'ATTACK',source,target:key});
 }else $('game-status').textContent='Selecione primeiro uma posição azul sob seu controle.';
}
const grid=$('hex-grid');
grid.addEventListener('click',e=>{
 const g=e.target.closest?.('[data-hex-key]');
 if(g&&grid.contains(g))chooseCell(g.dataset.hexKey);
});
grid.addEventListener('keydown',e=>{
 const g=e.target.closest?.('[data-hex-key]');
 if(!g)return;
 const keys=['ArrowRight','ArrowUp','ArrowLeft','ArrowDown'];
 if(e.key==='Enter'||e.key===' '){
  e.preventDefault();chooseCell(g.dataset.hexKey,true);return;
 }
 if(keys.includes(e.key)){
  e.preventDefault();
  const current=g.dataset.hexKey;
  const neighbors=axialNeighbors(current).filter(k=>Object.hasOwn(state.grid,k));
  if(!neighbors.length)return;
  const preferred={
   ArrowRight:[0,1],ArrowUp:[2,3],ArrowLeft:[4,3],ArrowDown:[5,0]
  }[e.key];
  const all=axialNeighbors(current),target=preferred.map(i=>all[i]).find(k=>neighbors.includes(k))||neighbors[0];
  [...grid.querySelectorAll('[data-hex-key]')].find(node=>node.dataset.hexKey===target)?.focus();
 }
});
function botAnswer(){
 const guide=domainGuidance(state);
 $('bot-plan').hidden=topic!=='estrategia';
 if(topic==='estrategia'){
  $('bot-answer').textContent=guide.currentPhase+'. '+guide.recommendedAction;
  $('bot-plan').replaceChildren(...guide.strategyPlan.map(step=>{
   const li=document.createElement('li');li.textContent=step;return li;
  }));
 }else if(topic==='controles'){
  $('bot-answer').textContent='Toque em um hexágono aliado e depois no vizinho para atacar. Teclado: Tab, setas e Enter ou Espaço. Reforçar custa 3 suprimentos por tropa. Encerrar turno aciona a IA adversária.';
 }else{
  const m=guide.metrics;
  $('bot-answer').textContent='Turno '+m.turn+'. Seus suprimentos: '+m.playerSupplies+
   '. Setores aliados: '+m.playerHexes+'. Posições da fronteira expostas: '+m.vulnerableFrontiers+
   '. '+guide.recommendedAction+' '+guide.tacticalTip;
 }
}
function render(){
 drawBoard();
 $('turn').textContent=state.turn+'/'+GAME_RULES.maxTurns;
 $('supplies').textContent=String(state.playerSupplies);
 $('enemy-supplies').textContent=String(state.enemySupplies);
 $('record').textContent=records[state.difficulty]?records[state.difficulty]+' turnos':'Nenhum';
 const ownerName=owner=>owner==='player'?'capturado':owner==='enemy'?'controlado pelo adversário':'neutro';
 $('fortress-status').textContent='Bastião (0,0): '+ownerName(state.grid['0,0'].owner);
 $('base-status').textContent='Base rival (0,-1): '+ownerName(state.grid['0,-1'].owner);
 $('game-status').textContent=state.lastEvent;
 $('deploy').disabled=state.phase!=='playing'||!state.selected||
  state.grid[state.selected]?.owner!=='player'||state.playerSupplies<GAME_RULES.baseTroopCost;
 $('end-turn').disabled=state.phase!=='playing';
 $('undo').disabled=state.phase==='paused'||!state.history.length;
 $('pause').disabled=!['playing','paused'].includes(state.phase);
 $('pause').textContent=state.phase==='paused'?'Retomar':'Pausar';
 botAnswer();
}
$('deploy').addEventListener('click',()=>{lastFocus=null;if(state.selected)apply({type:'DEPLOY',target:state.selected,amount:1})});
$('end-turn').addEventListener('click',()=>{lastFocus=null;apply({type:'END_TURN'})});
$('undo').addEventListener('click',()=>{lastFocus=null;apply({type:'UNDO'})});
$('pause').addEventListener('click',()=>{lastFocus=null;apply({type:'PAUSE'})});
$('restart').addEventListener('click',()=>{
 lastFocus=null;
 state=createDomainGame({difficulty:$('difficulty').value});
 topic='situacao';render();
});
$('difficulty').addEventListener('change',()=>{
 lastFocus=null;state=createDomainGame({difficulty:$('difficulty').value});render();
});
for(const button of document.querySelectorAll('[data-bot]'))button.addEventListener('click',()=>{
 topic=button.dataset.bot;botAnswer();
});
render();
if('serviceWorker' in navigator){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>undefined),{once:true});
}