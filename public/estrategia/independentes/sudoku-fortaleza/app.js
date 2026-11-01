import {createSudoku,playSudoku,hintSudoku,undoSudoku,toggleSudokuPause} from './engine.mjs';
const $=id=>document.getElementById(id);
const RECORD='pg-estrategia-sudoku-recordes-v1';
const PREF='pg-estrategia-sudoku-preferencias-v1';
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
const saved=read(PREF);
if(['classico','diagonal'].includes(saved?.mode))$('mode').value=saved.mode;
if(['recruta','tatico','veterano'].includes(saved?.difficulty))$('difficulty').value=saved.difficulty;
const rawRecords=read(RECORD);
const records={};
if(rawRecords&&typeof rawRecords==='object'&&!Array.isArray(rawRecords)){
 for(const [key,value] of Object.entries(rawRecords)){
  if(/^(classico|diagonal):(recruta|tatico|veterano)$/.test(key)&&Number.isInteger(value)&&value>0&&value<=1000)records[key]=value;
 }
}
const seedParam=new URLSearchParams(location.search).get('seed');
const parsedSeed=seedParam===null?1:Number(seedParam);
const initialSeed=Number.isSafeInteger(parsedSeed)&&parsedSeed>=0&&parsedSeed<=999999999?parsedSeed:1;
const board=$('board'),keypad=$('keypad');
let state,selection=null,tiles=[],resetCount=0,previousPhase='playing';
function recordKey(){return state.mode+':'+state.difficulty;}
function saveRecord(){
 if(state.phase==='won'&&previousPhase!=='won'){
  const best=records[recordKey()];
  if(!best||state.score>best){records[recordKey()]=state.score;write(RECORD,records);}
 }
 previousPhase=state.phase;
}
function makeTiles(){
 if(tiles.length===state.size*state.size)return;
 board.replaceChildren();tiles=[];
 board.style.setProperty('--size',String(state.size));
 const boxWidth=state.size===6?3:state.size===9?3:2;
 const boxHeight=state.size===9?3:2;
 const frag=document.createDocumentFragment();
 for(let index=0;index<state.size*state.size;index++){
  const tile=document.createElement('button');
  tile.type='button';tile.className='cell';tile.dataset.index=String(index);
  const row=Math.floor(index/state.size),col=index%state.size;
  tile.dataset.edgeRight=String((col+1)%boxWidth===0&&col<state.size-1);
  tile.dataset.edgeBottom=String((row+1)%boxHeight===0&&row<state.size-1);
  tile.addEventListener('click',()=>{selection=index;render();});
  frag.append(tile);tiles.push(tile);
 }
 board.append(frag);
}
const digits=[];
for(let value=1;value<=9;value++){
 const button=document.createElement('button');button.type='button';
 button.dataset.digit=String(value);button.textContent=String(value);
 button.addEventListener('click',()=>setDigit(value));
 keypad.insertBefore(button,keypad.querySelector('[data-digit="0"]'));
 digits.push(button);
}
keypad.querySelector('[data-digit="0"]').addEventListener('click',()=>setDigit(0));
function render(){
 makeTiles();
 board.style.setProperty('--size',String(state.size));
 for(let i=0;i<tiles.length;i++){
  const tile=tiles[i],number=state.values[i],row=Math.floor(i/state.size),col=i%state.size;
  tile.textContent=number?String(number):'';
  tile.dataset.fixed=String(state.givens[i]);
  tile.dataset.wrong=String(number!==0&&!state.givens[i]&&number!==state.solution[i]);
  tile.dataset.selected=String(selection===i);
  tile.disabled=state.phase!=='playing'||state.paused;
  tile.setAttribute('aria-pressed',String(selection===i));
  tile.setAttribute('aria-label','Linha '+(row+1)+', coluna '+(col+1)+', '+(number?'número '+number:'vazia')+(state.givens[i]?', pista fixa':''));
 }
 for(const btn of digits){btn.hidden=Number(btn.dataset.digit)>state.size;btn.disabled=state.phase!=='playing'||state.paused;}
 keypad.querySelector('[data-digit="0"]').disabled=state.phase!=='playing'||state.paused;
 $('completed').textContent=state.values.filter((n,i)=>n===state.solution[i]).length+'/'+state.values.length;
 $('errors').textContent=state.errors+'/'+state.maxErrors;
 $('moves').textContent=String(state.moves);
 $('record').textContent=records[recordKey()]?records[recordKey()]+' pts':'Nenhum';
 $('phase').textContent=state.phase==='won'?'Vitória':state.phase==='lost'?'Derrota':state.paused?'Pausado':'Em andamento';
 $('status-text').textContent=state.message;
 $('pause').textContent=state.paused?'Retomar':'Pausar';
 $('pause').disabled=state.phase!=='playing';
 $('undo').disabled=state.paused||state.phase!=='playing'||!state.history.length;
 $('hint').disabled=state.paused||state.phase!=='playing';
}
function start(){
 state=createSudoku({mode:$('mode').value,difficulty:$('difficulty').value,seed:initialSeed+resetCount++});
 selection=state.values.findIndex(v=>v===0);
 previousPhase='playing';
 write(PREF,{mode:state.mode,difficulty:state.difficulty});
 $('hint-text').textContent='';
 $('bot-answer').textContent='Selecione uma opção para ver uma orientação.';
 tiles=[];render();
}
function setDigit(value){
 if(selection===null||state.phase!=='playing'||state.paused)return;
 const next=playSudoku(state,selection,value);
 if(next===state)return;
 state=next;saveRecord();render();
 if(state.phase==='won')$('hint-text').textContent='Vitória! '+state.score+' pontos.';
}
function useHint(){
 const before=state,changed=hintSudoku(state);
 if(changed===before)return;
 state=changed;
 selection=state.values.findIndex(v=>v===0);
 saveRecord();render();
 $('hint-text').textContent=state.phase==='won'?'Fortaleza concluída com '+state.score+' pontos.':'Uma casa foi preenchida usando a solução. A dica reduz a pontuação.';
}
$('mode').addEventListener('change',start);
$('difficulty').addEventListener('change',start);
$('reset').addEventListener('click',start);
$('pause').addEventListener('click',()=>{state=toggleSudokuPause(state);render();});
$('undo').addEventListener('click',()=>{state=undoSudoku(state);previousPhase=state.phase;render();});
$('hint').addEventListener('click',useHint);
board.addEventListener('keydown',event=>{
 const target=event.target;
 if(!(target instanceof HTMLButtonElement)||!target.classList.contains('cell'))return;
 const index=Number(target.dataset.index),size=state.size;
 if(/^[1-9]$/.test(event.key)){event.preventDefault();selection=index;setDigit(Number(event.key));return;}
 if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();selection=index;setDigit(0);return;}
 const offsets={ArrowRight:1,ArrowLeft:-1,ArrowDown:size,ArrowUp:-size};
 if(Object.hasOwn(offsets,event.key)){
  event.preventDefault();
  const next=index+offsets[event.key];
  if(next>=0&&next<state.size*state.size&&
   !(event.key==='ArrowLeft'&&index%size===0)&&
   !(event.key==='ArrowRight'&&index%size===size-1)){
   selection=next;render();tiles[next].focus();
  }
 }
});
document.querySelectorAll('[data-bot]').forEach(button=>button.addEventListener('click',()=>{
 const correct=state.values.filter((n,i)=>n===state.solution[i]).length;
 $('bot-answer').textContent=button.dataset.bot==='goal'
  ?'Preencha linhas, colunas e blocos sem repetir números de 1 até '+state.size+'. '+(state.mode==='diagonal'?'As diagonais principais também precisam estar completas.':'')
  :button.dataset.bot==='controls'
  ?'Toque numa casa vazia e escolha um número de 1 a '+state.size+'. Também pode usar Tab, Enter, setas, teclas numéricas e Delete.'
  :'Você já confirmou '+correct+' de '+state.values.length+' casas. Restam '+(state.maxErrors-state.errors)+' tentativas antes da derrota. Dicas aplicam a solução e reduzem sua pontuação.';
}));
if('serviceWorker' in navigator&&window.isSecureContext){
 window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{}),{once:true});
}
start();
