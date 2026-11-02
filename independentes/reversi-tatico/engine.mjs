// Reversi Tático: reversões em oito direções, passagens e adversário determinístico.
// Motor puro, sem DOM, rede ou conta. 1 = jogador, -1 = bot.
const DIRECTIONS=[[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
const LEVELS=["recruta","tatico","veterano"];
const inside=(x,y,n)=>x>=0&&y>=0&&x<n&&y<n;
const ix=(x,y,n)=>y*n+x;

export function createReversi({size=6,difficulty="recruta"}={}){
 if(![6,8].includes(size)||!LEVELS.includes(difficulty))throw new RangeError("Tabuleiro ou dificuldade inválidos");
 const board=Array(size*size).fill(0),c=size/2;
 board[ix(c-1,c-1,size)]=-1;board[ix(c,c,size)]=-1;
 board[ix(c-1,c,size)]=1;board[ix(c,c-1,size)]=1;
 return {size,difficulty,board,current:1,paused:false,status:"playing",turns:0,
   notice:"Escolha uma casa marcada. Capture peças rivais entre duas das suas."};
}
export function reversiScore(state){
 return {player:state.board.filter(v=>v===1).length,bot:state.board.filter(v=>v===-1).length};
}
export function reversiFlips(state,index,side=state.current){
 const n=state.size;
 if(!Number.isInteger(index)||index<0||index>=n*n||state.board[index]!==0||![1,-1].includes(side))return [];
 const x=index%n,y=Math.floor(index/n),captured=[];
 for(const [dx,dy] of DIRECTIONS){
  let cx=x+dx,cy=y+dy;const ray=[];
  while(inside(cx,cy,n)&&state.board[ix(cx,cy,n)]===-side){
   ray.push(ix(cx,cy,n));cx+=dx;cy+=dy;
  }
  if(ray.length&&inside(cx,cy,n)&&state.board[ix(cx,cy,n)]===side)captured.push(...ray);
 }
 return captured;
}
export function legalReversiMoves(state,side=state.current){
 if(![1,-1].includes(side)||state.status!=="playing")return [];
 const moves=[];
 for(let i=0;i<state.board.length;i++)if(!state.board[i]&&reversiFlips(state,i,side).length)moves.push(i);
 return moves;
}
export function applyReversiMove(state,index){
 if(state.status!=="playing"||state.paused)return state;
 const flips=reversiFlips(state,index,state.current);
 if(!flips.length)return state;
 const board=state.board.slice();board[index]=state.current;
 for(const i of flips)board[i]=state.current;
 const after={...state,board,turns:state.turns+1};
 const other=-state.current;
 if(legalReversiMoves(after,other).length){
  return {...after,current:other,notice:(state.current===1?"Você capturou ":"O bot capturou ")+flips.length+" peça(s)."};
 }
 if(legalReversiMoves(after,state.current).length){
  return {...after,current:state.current,notice:"O adversário não tem jogada válida e passa a vez."};
 }
 const score=reversiScore(after),status=score.player>score.bot?"won":score.player<score.bot?"lost":"tie";
 return {...after,status,current:0,notice:status==="won"?"Vitória! Você domina mais peças.":status==="lost"?"Derrota: o rival domina mais peças.":"Empate: peças iguais no fim."};
}
export function chooseReversiBotMove(state){
 if(state.current!==-1||state.paused||state.status!=="playing")return null;
 const moves=legalReversiMoves(state,-1);
 if(!moves.length)return null;
 if(state.difficulty==="recruta")return moves[0];
 const n=state.size;
 let best=moves[0],bestValue=-Infinity;
 for(const i of moves){
  const flips=reversiFlips(state,i,-1).length,x=i%n,y=Math.floor(i/n);
  let value=flips;
  if(state.difficulty==="veterano"){
   const corner=(x===0||x===n-1)&&(y===0||y===n-1);
   const edge=(x===0||x===n-1||y===0||y===n-1);
   const after=applyReversiMove(state,i);
   const mobility=after.current===1?legalReversiMoves(after,1).length:0;
   value=flips*2+(corner?100:edge?12:0)-mobility*3;
  }
  if(value>bestValue){bestValue=value;best=i;}
 }
 return best;
}
export function playReversiTurn(state,index){
 if(state.current!==1||state.status!=="playing"||state.paused)return state;
 let next=applyReversiMove(state,index);
 if(next===state)return state;
 for(let count=0;count<state.size*state.size&&next.status==="playing"&&next.current===-1;count++){
  const botIndex=chooseReversiBotMove(next);
  if(botIndex===null)break;
  const evolved=applyReversiMove(next,botIndex);
  if(evolved===next)break;
  next=evolved;
 }
 return next;
}
export const pauseReversi=state=>state.status==="playing"&&!state.paused?{...state,paused:true,notice:"Partida pausada."}:state;
export const resumeReversi=state=>state.status==="playing"&&state.paused?{...state,paused:false,notice:"Partida retomada."}:state;
