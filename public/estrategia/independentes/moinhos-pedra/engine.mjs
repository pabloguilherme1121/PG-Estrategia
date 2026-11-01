export const MILLS = [
  [0,1,2],[2,3,4],[4,5,6],[6,7,0],
  [8,9,10],[10,11,12],[12,13,14],[14,15,8],
  [16,17,18],[18,19,20],[20,21,22],[22,23,16],
  [1,9,17],[3,11,19],[5,13,21],[7,15,23]
];
export const ADJACENCY=Array.from({length:24},(_,p)=>{
 const ring=Math.floor(p/8)*8,local=p%8;
 const list=[ring+(local+7)%8,ring+(local+1)%8];
 if(local%2===1){
  if(ring>0)list.push(p-8);
  if(ring<16)list.push(p+8);
 }
 return list;
});
const count=(board,who)=>board.reduce((n,x)=>n+(x===who),0);
export function isMill(board,point,who){
 return MILLS.some(line=>line.includes(point)&&line.every(index=>board[index]===who));
}
export function createMills({mode='rapido',difficulty='recruta',seed=0}={}){
 const safeMode=mode==='classico'?'classico':'rapido';
 const piecesPerSide=safeMode==='classico'?9:6;
 return {board:Array(24).fill(0),mode:safeMode,
  difficulty:['recruta','tatico','veterano'].includes(difficulty)?difficulty:'recruta',
  seed:Number.isSafeInteger(seed)?seed:0,piecesPerSide,
  placed:{1:0,2:0},turn:1,pendingCapture:false,phase:'playing',
  winner:null,paused:false,turns:0,history:[],message:'Posicione a primeira peça.'};
}
const capturingPositions=(board,who)=>{
 const opp=who===1?2:1;
 const all=board.flatMap((x,i)=>x===opp?[i]:[]);
 const outside=all.filter(i=>!isMill(board,i,opp));
 return outside.length?outside:all;
};
export function legalActions(s){
 if(s.phase!=='playing'||s.paused)return [];
 if(s.pendingCapture)return capturingPositions(s.board,s.turn).map(at=>({type:'capture',at}));
 const who=s.turn,positions=s.board.flatMap((x,i)=>x===who?[i]:[]);
 if(s.placed[who]<s.piecesPerSide)
  return s.board.flatMap((x,i)=>x===0?[{type:'place',to:i}]:[]);
 const flight=positions.length===3,free=s.board.flatMap((x,i)=>x===0?[i]:[]);
 return positions.flatMap(from=>(flight?free:ADJACENCY[from].filter(to=>s.board[to]===0)).map(to=>({type:'move',from,to})));
}
function conclude(s){
 const enemy=s.turn===1?2:1;
 if(s.placed[enemy]>=s.piecesPerSide&&count(s.board,enemy)<3){
  s.winner=s.turn;s.phase=s.turn===1?'won':'lost';return s;
 }
 if(s.turns>=160){s.winner=null;s.phase='draw';return s;}
 if(s.placed[s.turn]>=s.piecesPerSide&&legalActions(s).length===0){
  s.winner=enemy;s.phase=enemy===1?'won':'lost';
 }
 return s;
}
export function stepMills(s,action){
 if(!action||!legalActions(s).some(a=>Object.keys(a).every(k=>a[k]===action[k])&&Object.keys(a).length===Object.keys(action).length))return s;
 const next={...s,board:s.board.slice(),placed:{...s.placed},history:s.history.slice(),turns:s.turns+1};
 const who=s.turn;
 if(action.type==='capture'){
  next.board[action.at]=0;next.pendingCapture=false;next.turn=who===1?2:1;
  next.message='Peça adversária retirada.';
  // Victory on capture is evaluated before regular turn rotation.
  if(next.placed[next.turn]>=next.piecesPerSide&&count(next.board,next.turn)<3){
   next.winner=who;next.phase=who===1?'won':'lost';return next;
  }
 }else{
  if(action.type==='place'){next.board[action.to]=who;next.placed[who]++;}
  else {next.board[action.from]=0;next.board[action.to]=who;}
  if(isMill(next.board,action.to,who)&&capturingPositions(next.board,who).length){
   next.pendingCapture=true;next.message='Moinho! Capture uma peça rival.';
  }else{next.turn=who===1?2:1;next.message='Jogada concluída.';}
 }
 return conclude(next);
}
function chooseBot(s){
 const options=legalActions(s);
 if(!options.length)return null;
 let best=options[0],value=-Infinity;
 for(const action of options){
  const candidate=stepMills(s,action);
  let score=action.type==='capture'?40:0;
  if(action.to!==undefined){
   if(candidate.pendingCapture)score+=60;
   score+=MILLS.filter(line=>line.includes(action.to)).reduce((n,line)=>n+line.filter(p=>candidate.board[p]===2).length,0)*3;
   score-=MILLS.filter(line=>line.includes(action.to)).reduce((n,line)=>n+line.filter(p=>candidate.board[p]===1).length===2?0:0,0);
  }
  const tie=((s.seed+1)*1103515245+(action.to??action.at??0)*134775813+(action.from??0)*7+s.turns*31)>>>0;
  if(s.difficulty==='recruta')score=0;
  if(s.difficulty==='tatico')score=Math.round(score/3);
  score+=tie%997/10000;
  if(score>value){value=score;best=action;}
 }
 return best;
}
export function playMills(s,action){
 if(s.phase!=='playing'||s.paused||s.turn!==1)return s;
 let next=stepMills(s,action);
 if(next===s)return s;
 next={...next,history:[...s.history,{...s,history:[],board:s.board.slice(),placed:{...s.placed}}]};
 let guard=0;
 while(next.phase==='playing'&&next.turn===2&&guard++<5){
  const bot=chooseBot(next);
  if(!bot)break;
  const updated=stepMills(next,bot);
  if(updated===next)break;
  next=updated;
 }
 return next;
}
export function toggleMillsPause(s){
 if(s.phase!=='playing')return s;
 return {...s,paused:!s.paused,message:s.paused?'Partida retomada.':'Partida pausada.'};
}
export function undoMills(s){
 if(!s.history?.length||s.paused)return s;
 const prev=s.history[s.history.length-1];
 return {...prev,history:s.history.slice(0,-1),message:'Rodada desfeita.'};
}
