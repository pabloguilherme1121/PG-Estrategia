/** Damas Táticas: captura obrigatória, múltiplos saltos, promoção e rival local.
 * Peças: 1/2 jogador, -1/-2 rival; 2 é dama. O tabuleiro não é mutado.
 */
export const DRAUGHTS_DIFFICULTIES = Object.freeze(['recruta','tatico','veterano']);
const at = (row,col) => row*8+col;
const inside = (row,col) => row>=0 && row<8 && col>=0 && col<8;
const sameSide = (piece,side) => piece*side>0;
function candidates(board,side,from){
 const piece=board[from];if(!sameSide(piece,side))return [];
 const row=Math.floor(from/8),col=from%8;
 const directions=Math.abs(piece)===2?[-1,1]:[side===1?-1:1];
 const result=[];
 for(const dr of directions)for(const dc of [-1,1]){
  const r=row+dr,c=col+dc;
  if(!inside(r,c))continue;
  const middle=at(r,c),other=board[middle];
  if(other===0)result.push({from,to:middle,capture:null});
  else if(sameSide(other,-side)&&inside(r+dr,c+dc)&&board[at(r+dr,c+dc)]===0)
   result.push({from,to:at(r+dr,c+dc),capture:middle});
 }
 return result;
}
export function legalDraughtsMoves(board,side=1,chainFrom=null){
 if(!Array.isArray(board)||board.length!==64||![1,-1].includes(side))return [];
 const choices=[];
 for(let i=0;i<64;i++){
  if(chainFrom!==null&&chainFrom!==i)continue;
  choices.push(...candidates(board,side,i));
 }
 const captures=choices.filter(move=>move.capture!==null);
 return captures.length||chainFrom!==null?captures:choices;
}
function place(board,move,side){
 const next=board.slice();let piece=next[move.from];next[move.from]=0;
 if(move.capture!==null)next[move.capture]=0;
 const last=Math.floor(move.to/8)===(side===1?0:7);
 const promoted=Math.abs(piece)===1&&last;
 if(promoted)piece=2*side;
 next[move.to]=piece;
 return {board:next,promoted};
}
function outcome(s,side){
 const other=-side;
 if(!s.board.some(piece=>sameSide(piece,other))||legalDraughtsMoves(s.board,other).length===0){
  const won=side===1;
  return {...s,phase:won?'won':'lost',score:won?120+s.captures*30+Math.max(0,80-s.turn)*2:0,
   message:won?'Vitória! Você venceu a disputa de damas.':'Derrota: não restaram movimentos ou peças.'};
 }
 return s;
}
function chooseRival(s,moves){
 if(s.mode==='recruta')return moves[(s.seed+s.turn)%moves.length];
 const value=move=>{
  const result=place(s.board,move,-1);
  const threat=legalDraughtsMoves(result.board,1).filter(m=>m.capture!==null).length;
  const center=3.5-Math.abs((move.to%8)-3.5);
  const promote=result.promoted?6:0;
  return (move.capture!==null?12:0)+promote+(s.mode==='veterano'?center*2-threat*7:0);
 };
 return moves.slice().sort((a,b)=>value(b)-value(a)||a.from-b.from||a.to-b.to)[0];
}
function rivalTurn(s){
 let next=s;
 for(let chain=null,steps=0;steps<12;steps++){
  const moves=legalDraughtsMoves(next.board,-1,chain);
  if(!moves.length)break;
  const move=chooseRival(next,moves),placed=place(next.board,move,-1);
  next={...next,board:placed.board};
  next=outcome(next,-1);
  if(next.phase!=='playing')return next;
  chain=move.capture!==null&&!placed.promoted&&legalDraughtsMoves(next.board,-1,move.to).length?move.to:null;
  if(chain===null)break;
 }
 return next;
}
export function createDraughts({difficulty='recruta',seed=1}={}){
 if(!DRAUGHTS_DIFFICULTIES.includes(difficulty)||!Number.isSafeInteger(seed))throw new RangeError('Dificuldade ou semente inválida');
 const board=Array(64).fill(0);
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  if((r+c)%2===1){if(r<3)board[at(r,c)]=-1;else if(r>4)board[at(r,c)]=1;}
 }
 return {board,mode:difficulty,seed,turn:0,maxTurns:80,chainFrom:null,captures:0,paused:false,phase:'playing',score:0,
  message:'Selecione uma peça clara e depois a casa de destino. Capturas são obrigatórias.'};
}
export function commandDraughts(s,action){
 if(!s||s.phase!=='playing'||!action||typeof action!=='object')return s;
 if(action.type==='pause')return s.paused?s:{...s,paused:true,message:'Partida pausada.'};
 if(action.type==='resume')return s.paused?{...s,paused:false,message:'Partida retomada.'}:s;
 if(s.paused||action.type!=='move'||!Number.isInteger(action.from)||!Number.isInteger(action.to))return s;
 const move=legalDraughtsMoves(s.board,1,s.chainFrom).find(m=>m.from===action.from&&m.to===action.to);
 if(!move)return s;
 const result=place(s.board,move,1);
 let next={...s,board:result.board,captures:s.captures+Number(move.capture!==null),
  message:move.capture!==null?'Captura realizada.':'Movimento confirmado.'};
 next=outcome(next,1);
 if(next.phase!=='playing')return next;
 if(move.capture!==null&&!result.promoted&&legalDraughtsMoves(next.board,1,move.to).length){
  return {...next,chainFrom:move.to,message:'Captura encadeada: continue com a mesma peça.'};
 }
 next={...next,chainFrom:null,turn:s.turn+1};
 next=rivalTurn(next);
 if(next.phase!=='playing')return next;
 if(next.turn>=next.maxTurns)return {...next,phase:'lost',message:'Limite de turnos atingido.'};
 return {...next,message:'Sua vez. Escolha uma peça e planeje a próxima jogada.'};
}
