
const CONFIG={recruta:{size:4,boxHeight:2,boxWidth:2,blanks:5,maxErrors:3},tatico:{size:6,boxHeight:2,boxWidth:3,blanks:11,maxErrors:4},veterano:{size:9,boxHeight:3,boxWidth:3,blanks:27,maxErrors:5}};
const SOLVED_CACHE=new Map();
const keyFor=(size,mode)=>size+':'+mode;
function settings(size){
 const config=Object.values(CONFIG).find(item=>item.size===size);
 if(!config)throw new RangeError('Tamanho de tabuleiro inválido');
 return config;
}
function random(seed){
 let x=(seed|0)||0x9e3779b9;
 return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296};
}
function shuffled(values,rng){
 const result=[...values];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}
export function getSudokuCandidates(board,size,mode,index){
 if(!Array.isArray(board)||board.length!==size*size||index<0||index>=board.length||!Number.isInteger(index))return [];
 const {boxHeight,boxWidth}=settings(size),r=Math.floor(index/size),c=index%size;
 const used=new Set();
 for(let n=0;n<size;n++){if(n!==c)used.add(board[r*size+n]);if(n!==r)used.add(board[n*size+c]);}
 const startR=Math.floor(r/boxHeight)*boxHeight,startC=Math.floor(c/boxWidth)*boxWidth;
 for(let rr=startR;rr<startR+boxHeight;rr++)for(let cc=startC;cc<startC+boxWidth;cc++)if(rr*size+cc!==index)used.add(board[rr*size+cc]);
 if(mode==='diagonal'){
  if(r===c)for(let k=0;k<size;k++)if(k!==r)used.add(board[k*size+k]);
  if(r+c===size-1)for(let k=0;k<size;k++)if(k!==r)used.add(board[k*size+(size-1-k)]);
 }
 return Array.from({length:size},(_,n)=>n+1).filter(n=>!used.has(n));
}
export function isValidSudoku(board,size,mode='classico',complete=false){
 if(!Array.isArray(board)||board.length!==size*size)return false;
 for(let i=0;i<board.length;i++){
  const value=board[i];
  if(!Number.isInteger(value)||value<0||value>size||(complete&&value===0))return false;
  if(value!==0&&!getSudokuCandidates(board,size,mode,i).includes(value))return false;
 }
 return true;
}
function findCell(board,size,mode){
 let selected=-1,candidates=null;
 for(let i=0;i<board.length;i++){
  if(board[i])continue;
  const list=getSudokuCandidates(board,size,mode,i);
  if(!list.length)return {index:i,candidates:list};
  if(!candidates||list.length<candidates.length){selected=i;candidates=list;if(list.length===1)break;}
 }
 return {index:selected,candidates:candidates||[]};
}
export function countSolutions(board,size,mode='classico',limit=2){
 if(!isValidSudoku(board,size,mode))return 0;
 const working=board.slice();let found=0;
 function visit(){
  if(found>=limit)return;
  const {index,candidates}=findCell(working,size,mode);
  if(index<0){found++;return;}
  for(const v of candidates){working[index]=v;visit();working[index]=0;if(found>=limit)break;}
 }
 visit();return found;
}
function generateSolved(size,mode){
 const key=keyFor(size,mode);
 if(SOLVED_CACHE.has(key))return SOLVED_CACHE.get(key);
 const result=Array(size*size).fill(0),rng=random(size*101+(mode==='diagonal'?57:13));
 function fill(){
  const {index,candidates}=findCell(result,size,mode);
  if(index<0)return true;
  for(const value of shuffled(candidates,rng)){
   result[index]=value;if(fill())return true;result[index]=0;
  }
  return false;
 }
 if(!fill())throw Error('Não foi possível gerar solução');
 SOLVED_CACHE.set(key,result.slice());return result;
}
export function createSudoku({mode='classico',difficulty='recruta',seed=0}={}){
 const safeMode=mode==='diagonal'?'diagonal':'classico';
 const safeDifficulty=Object.hasOwn(CONFIG,difficulty)?difficulty:'recruta';
 const config=CONFIG[safeDifficulty],size=config.size;
 const safeSeed=Number.isSafeInteger(seed)?Math.abs(seed)%1000000000:0;
 const rng=random(safeSeed+size*33+(safeMode==='diagonal'?9331:0));
 const base=generateSolved(size,safeMode);
 const symbols=shuffled(Array.from({length:size},(_,n)=>n+1),rng);
 let solution=base.map(value=>symbols[value-1]);
 if(config.boxHeight===config.boxWidth&&rng()>.5)solution=solution.map((_,i)=>solution[(i%size)*size+Math.floor(i/size)]);
 if(rng()>.5)solution=solution.slice().reverse();
 const values=solution.slice();let removed=0;
 for(const i of shuffled(Array.from({length:values.length},(_,n)=>n),rng)){
  if(removed>=config.blanks)break;
  const previous=values[i];values[i]=0;
  if(countSolutions(values,size,safeMode,2)===1)removed++;
  else values[i]=previous;
 }
 return {mode:safeMode,difficulty:safeDifficulty,seed:safeSeed,size,
  values,givens:values.map(value=>value!==0),solution,errors:0,maxErrors:config.maxErrors,
  moves:0,hints:0,history:[],phase:'playing',paused:false,score:0,
  message:'Selecione uma casa vazia e um número.'};
}
function resultPhase(next){
 if(next.values.every((value,i)=>value===next.solution[i])){
  next.phase='won';next.score=Math.max(1,1000-next.moves*10-next.errors*80-next.hints*120);
  next.message='Fortaleza concluída!';
 }else if(next.errors>=next.maxErrors){
  next.phase='lost';next.message='Tentativas esgotadas. Reinicie a partida.';
 }
 return next;
}
function pushHistory(state){
 return [...state.history,{values:state.values.slice(),errors:state.errors,moves:state.moves,hints:state.hints,score:state.score,phase:state.phase}];
}
export function playSudoku(state,index,value){
 if(state.phase!=='playing'||state.paused||!Number.isInteger(index)||index<0||index>=state.values.length||
  !Number.isInteger(value)||value<0||value>state.size||state.givens[index])return state;
 if(state.values[index]===value&&value===state.solution[index])return state;
 const next={...state,values:state.values.slice(),history:pushHistory(state),
  moves:state.moves+1,message:'Número registrado.'};
 next.values[index]=value;
 if(value&&value!==state.solution[index]){
  next.errors++;
  next.message='Este número não corresponde à solução. Confira a linha, coluna e bloco.';
 }
 return resultPhase(next);
}
export function hintSudoku(state){
 if(state.phase!=='playing'||state.paused)return state;
 const index=state.values.findIndex((v,i)=>v!==state.solution[i]);
 if(index<0)return state;
 const next={...state,values:state.values.slice(),history:pushHistory(state),
  moves:state.moves+1,hints:state.hints+1,message:'Dica aplicada, com desconto na pontuação.'};
 next.values[index]=state.solution[index];
 return resultPhase(next);
}
export function undoSudoku(state){
 if(state.paused||state.phase!=='playing'||!state.history.length)return state;
 const previous=state.history.at(-1);
 return {...state,...previous,values:previous.values.slice(),history:state.history.slice(0,-1),message:'Jogada desfeita.'};
}
export function toggleSudokuPause(state){
 if(state.phase!=='playing')return state;
 return {...state,paused:!state.paused,message:state.paused?'Partida retomada.':'Partida pausada.'};
}
