// Motor original de nonogramas: pistas de sequências consecutivas por linha e coluna.
export const NONOGRAM_LEVELS=Object.freeze({recruta:5,tatico:6,veterano:7});
export const NONOGRAM_MODES=Object.freeze(["exploracao","precisao"]);
const marks=new Set(["fill","empty"]);
const runs=values=>{const result=[];let count=0;for(const value of values){if(value)count++;else if(count){result.push(count);count=0;}}if(count)result.push(count);return result.length?result:[0];};
export function createNonogram({mode="exploracao",difficulty="recruta",seed=0}={}){
 if(!NONOGRAM_MODES.includes(mode)||!Object.hasOwn(NONOGRAM_LEVELS,difficulty)||!Number.isSafeInteger(seed)||seed<0||seed>999999999)throw new RangeError("Parâmetros inválidos.");
 const size=NONOGRAM_LEVELS[difficulty];
 // Bases com solução única; rotações e reflexos preservam essa propriedade.
 const basisSeed=size===6?1:0,orientation=seed%8;
 const solution=Array.from({length:size*size},(_,i)=>{
  let r=Math.floor(i/size),c=i%size;
  if(orientation>=4)c=size-1-c;
  for(let turn=0;turn<orientation%4;turn++){const next=c;c=size-1-r;r=next;}
  return (r*7+c*11+basisSeed*3)%9<4||(r+c+basisSeed)%5===0;
 });
 const rows=Array.from({length:size},(_,r)=>runs(solution.slice(r*size,(r+1)*size)));
 const columns=Array.from({length:size},(_,c)=>runs(Array.from({length:size},(_,r)=>solution[r*size+c])));
 return {mode,difficulty,seed,size,solution,rows,columns,marks:Array(size*size).fill(null),history:[],moves:0,maxMoves:mode==="precisao"?size*size+Math.ceil(size*size/2):size*size*3,errors:0,maxErrors:mode==="precisao"?4:Infinity,phase:"playing",paused:false,message:"Use as pistas para preencher ou descartar casas."};
}
export function playNonogram(game,index,mark){
 if(game.phase!=="playing"||game.paused||!Number.isInteger(index)||index<0||index>=game.marks.length||!marks.has(mark)||game.marks[index]===mark)return game;
 const next={...game,marks:[...game.marks],history:[...game.history,{index,previous:game.marks[index],errors:game.errors,moves:game.moves}]};
 next.marks[index]=mark;next.moves++;
 if((mark==="fill")!==game.solution[index])next.errors++;
 const won=next.marks.every((value,i)=>value!==null&&((value==="fill")===game.solution[i]));
 next.phase=won?"won":next.errors>=next.maxErrors||next.moves>=next.maxMoves?"lost":"playing";
 next.message=won?"Vitória! Enigma resolvido.":next.phase==="lost"?"Derrota. Reinicie para tentar outra estratégia.":"Pistas atualizadas. Continue.";
 return next;
}
export function undoNonogram(game){
 if(game.phase!=="playing"||game.paused||!game.history.length)return game;
 const history=game.history.slice(),last=history.pop(),next={...game,marks:[...game.marks],history,moves:last.moves,errors:last.errors,message:"Jogada desfeita."};
 next.marks[last.index]=last.previous;return next;
}
export function pauseNonogram(game){return game.phase==="playing"?{...game,paused:!game.paused,message:game.paused?"Partida retomada.":"Partida pausada."}:game;}
export function hintNonogram(game){
 if(game.phase!=="playing"||game.paused)return null;
 const index=game.marks.findIndex((mark,i)=>mark===null||((mark==="fill")!==game.solution[i]));
 return index<0?null:{index,mark:game.solution[index]?"fill":"empty"};
}
