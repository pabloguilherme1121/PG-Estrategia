/** Hex Conexão — deterministic two-sided connection game on a 7×7 hex grid.
 * Player 1 connects north-south; bot 2 connects west-east.
 * Unlike territory capture, every move permanently claims one empty cell.
 */
export const HEX_MODES = Object.freeze(["recruta", "tatico", "veterano"]);
const SIZE = 7;
const LENGTH = SIZE * SIZE;
const DIRECTIONS = [[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0]];
function coords(cell) { return [Math.floor(cell / SIZE), cell % SIZE]; }
export function getHexNeighbors(cell) {
  if (!Number.isInteger(cell) || cell < 0 || cell >= LENGTH) return [];
  const [row,col] = coords(cell);
  return DIRECTIONS.flatMap(([r,c]) => {
    const nr=row+r,nc=col+c;
    return nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE ? [nr*SIZE+nc]:[];
  });
}
export function getHexWinner(board) {
  if (!Array.isArray(board) || board.length !== LENGTH) return null;
  for(const owner of [1,2]) {
    const starts=Array.from({length:SIZE},(_,i)=>owner===1?i:SIZE*i);
    const seen=new Set(starts.filter(i=>board[i]===owner));
    const queue=[...seen];
    for(let i=0;i<queue.length;i++){
      const cell=queue[i],[r,c]=coords(cell);
      if((owner===1&&r===SIZE-1)||(owner===2&&c===SIZE-1))return owner;
      for(const next of getHexNeighbors(cell))if(board[next]===owner&&!seen.has(next)){
        seen.add(next);queue.push(next);
      }
    }
  }
  return null;
}
function seededIndex(seed,len) {
  let x=(seed>>>0)||1;
  x^=x<<13;x^=x>>>17;x^=x<<5;
  return (x>>>0)%len;
}
function winningMove(board,owner) {
  for(let i=0;i<LENGTH;i++){
    if(board[i]!==0)continue;
    const copy=[...board];copy[i]=owner;
    if(getHexWinner(copy)===owner)return i;
  }
  return null;
}
function connectionCost(board,owner) {
  // Dijkstra on hex adjacency. Enemy cells are impassable, own cells cost 0,
  // unclaimed cells cost 1; a lower score means a stronger connecting route.
  const distance=Array(LENGTH).fill(Infinity),done=new Set();
  const starts=Array.from({length:SIZE},(_,i)=>owner===1?i:SIZE*i);
  for(const c of starts)if(board[c]!==3-owner)distance[c]=board[c]===owner?0:1;
  for(let step=0;step<LENGTH;step++){
    let best=-1;
    for(let i=0;i<LENGTH;i++)if(!done.has(i)&&(best<0||distance[i]<distance[best]))best=i;
    if(best<0||!Number.isFinite(distance[best]))break;
    done.add(best);
    for(const next of getHexNeighbors(best)) {
      if(board[next]===3-owner)continue;
      const cost=board[next]===owner?0:1;
      distance[next]=Math.min(distance[next],distance[best]+cost);
    }
  }
  return Math.min(...Array.from({length:SIZE},(_,i)=>owner===1?(SIZE-1)*SIZE+i:i*SIZE+SIZE-1).map(i=>distance[i]));
}
export function getHexBotMove(board,difficulty="recruta",seed=31) {
  if(!Array.isArray(board)||board.length!==LENGTH||!HEX_MODES.includes(difficulty))return null;
  const empty=Array.from({length:LENGTH},(_,i)=>i).filter(i=>board[i]===0);
  if(!empty.length)return null;
  if(difficulty==="recruta")return empty[seededIndex(seed,empty.length)];
  const win=winningMove(board,2);
  if(win!==null)return win;
  const block=winningMove(board,1);
  if(block!==null)return block;
  if(difficulty==="tatico"){
    const central=empty.filter(i=>{const[r,c]=coords(i);return r>=2&&r<=4&&c>=2&&c<=4;});
    const options=central.length?central:empty;
    return options[seededIndex(seed,options.length)];
  }
  // Veteran: best route after placing stone, with tie-break that reduces the
  // opponent's route quality. Deterministic no-network AI.
  let best=empty[0],bestScore=Infinity;
  for(const cell of empty){
    const simulated=[...board];simulated[cell]=2;
    const self=connectionCost(simulated,2);
    const opponent=connectionCost(simulated,1);
    const[r,c]=coords(cell);
    const score=self*10-(Number.isFinite(opponent)?opponent:20)*2+
      Math.abs(r-3)*.07+Math.abs(c-3)*.07;
    if(score<bestScore){bestScore=score;best=cell;}
  }
  return best;
}
export function createHex({difficulty="recruta",seed=31}={}) {
  if(!HEX_MODES.includes(difficulty)||!Number.isSafeInteger(seed))throw new RangeError("Modo ou semente inválidos");
  return {
    id:"hex-conexao",mode:difficulty,seed,phase:"playing",
    board:Array(LENGTH).fill(0),turn:0,score:0,
    message:"Conecte a borda superior à inferior antes do adversário.",
  };
}
export function playHex(state,cell) {
  if(state?.phase!=="playing"||!Number.isInteger(cell)||cell<0||cell>=LENGTH||state.board[cell]!==0)return state;
  const board=[...state.board];board[cell]=1;
  const turn=state.turn+1;
  if(getHexWinner(board)===1)return{...state,board,turn,phase:"won",score:2400-turn*35,
    message:"Vitória! Você conectou as duas bordas."};
  const botCell=getHexBotMove(board,state.mode,state.seed+turn*971);
  if(botCell!==null)board[botCell]=2;
  const lost=getHexWinner(board)===2;
  return {...state,board,turn,phase:lost?"lost":"playing",score:0,
    message:lost?"Derrota. O adversário conectou as bordas laterais.":"Sua peça foi posicionada. O rival respondeu."};
}
