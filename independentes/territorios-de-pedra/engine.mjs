export const TERRITORY_MODES=Object.freeze(["territorio","capturas"]);
export const TERRITORY_LEVELS=Object.freeze({recruta:5,tatico:7,veterano:9});
const other=c=>c===1?2:1,signature=board=>board.join(""),playing=g=>g?.phase==="playing"&&!g.paused;
const near=(i,size)=>{const x=i%size,y=Math.floor(i/size),out=[];if(x>0)out.push(i-1);if(x<size-1)out.push(i+1);if(y>0)out.push(i-size);if(y<size-1)out.push(i+size);return out;};
function group(board,first,size){const color=board[first],members=new Set([first]),liberties=new Set(),queue=[first];for(let k=0;k<queue.length;k++)for(const n of near(queue[k],size)){if(!board[n])liberties.add(n);else if(board[n]===color&&!members.has(n)){members.add(n);queue.push(n);}}return{members,liberties};}
export function createTerritory({mode="territorio",difficulty="recruta",seed=0}={}){
 if(!TERRITORY_MODES.includes(mode)||!Object.hasOwn(TERRITORY_LEVELS,difficulty)||!Number.isSafeInteger(seed)||seed<0||seed>999999999)throw new RangeError("Configuração inválida");
 const size=TERRITORY_LEVELS[difficulty];return{mode,difficulty,seed,size,board:Array(size*size).fill(0),turn:1,captures:{black:0,white:0},captureTarget:difficulty==="recruta"?2:difficulty==="tatico"?3:4,phase:"playing",paused:false,moves:0,passes:0,maxMoves:size*size*2,koForbidden:null,history:[],scores:null,message:"Coloque pedras para cercar regiões. O rival responde a cada turno."};
}
export function scoreTerritory(game){
 const {board,size}=game,seen=new Set();let blackStones=0,whiteStones=0,blackTerritory=0,whiteTerritory=0,neutral=0;
 for(let i=0;i<board.length;i++){if(board[i]===1){blackStones++;continue;}if(board[i]===2){whiteStones++;continue;}if(seen.has(i))continue;
 const queue=[i],edges=new Set();seen.add(i);for(let q=0;q<queue.length;q++)for(const n of near(queue[q],size)){if(board[n]!==0)edges.add(board[n]);else if(!seen.has(n)){seen.add(n);queue.push(n);}}
 if(edges.size===1&&edges.has(1))blackTerritory+=queue.length;else if(edges.size===1&&edges.has(2))whiteTerritory+=queue.length;else neutral+=queue.length;}
 return{blackStones,whiteStones,blackTerritory,whiteTerritory,neutral,black:blackStones+blackTerritory,white:whiteStones+whiteTerritory+0.5};
}
function finish(game){const scores=scoreTerritory(game),black=game.mode==="capturas"?game.captures.black*100+scores.black:scores.black,white=game.mode==="capturas"?game.captures.white*100+scores.white:scores.white;const phase=black>white?"won":"lost";return{...game,phase,scores,message:phase==="won"?"Vitória! Você dominou o tabuleiro.":"Derrota. O rival dominou mais pontos."};}
function placement(game,index){const {board,size,turn}=game,next=board.slice();next[index]=turn;let captured=0;
 for(const n of near(index,size)){if(next[n]!==other(turn))continue;const candidate=group(next,n,size);if(candidate.liberties.size)continue;for(const k of candidate.members){next[k]=0;captured++;}}
 if(!group(next,index,size).liberties.size||game.koForbidden===signature(next))return null;return{board:next,captured};}
export function legalTerritory(game,index){return Boolean(playing(game)&&Number.isInteger(index)&&index>=0&&index<game.board.length&&game.board[index]===0&&placement(game,index));}
export function placeTerritory(game,index){if(!legalTerritory(game,index))return game;const result=placement(game,index),color=game.turn===1?"black":"white",captures={...game.captures,[color]:game.captures[color]+result.captured};
 let next={...game,board:result.board,captures,turn:other(game.turn),passes:0,moves:game.moves+1,koForbidden:signature(game.board),message:result.captured?result.captured+" pedra(s) capturada(s).":"Pedra colocada. Proteja suas liberdades."};
 if(game.mode==="capturas"&&captures[color]>=game.captureTarget){next={...next,phase:color==="black"?"won":"lost",scores:scoreTerritory(next),message:color==="black"?"Vitória! Meta de capturas alcançada.":"Derrota: o rival capturou a meta."};}else if(next.moves>=next.maxMoves)next=finish(next);return next;}
export function passTerritory(game){if(!playing(game))return game;const next={...game,turn:other(game.turn),passes:game.passes+1,moves:game.moves+1,koForbidden:null,message:"Passe registrado. Dois passes seguidos encerram a partida."};return next.passes>=2||next.moves>=next.maxMoves?finish(next):next;}
export function botTerritory(game){if(!playing(game)||game.turn!==2)return game;const moves=[];
 for(let i=0;i<game.board.length;i++){if(!legalTerritory(game,i))continue;const next=placeTerritory(game,i),x=i%game.size,y=Math.floor(i/game.size),center=(game.size-1)/2,around=near(i,game.size),friendly=around.filter(n=>game.board[n]===2).length,rivals=around.filter(n=>game.board[n]===1).length,safety=group(next.board,i,game.size).liberties.size,tie=(Math.imul(game.seed+i+1,1103515245)+Math.imul(game.moves+17,12345))>>>0;
 let rank=tie%1000/1000;if(game.difficulty!=="recruta")rank+=next.captures.white*45+friendly*3+rivals*1.5+safety/5;if(game.difficulty==="veterano")rank+=5-Math.abs(x-center)-Math.abs(y-center);moves.push({i,rank});}
 if(!moves.length)return passTerritory(game);moves.sort((a,b)=>b.rank-a.rank||a.i-b.i);return placeTerritory(game,moves[0].i);}
const snapshot=g=>({board:[...g.board],turn:g.turn,captures:{...g.captures},phase:g.phase,paused:g.paused,moves:g.moves,passes:g.passes,koForbidden:g.koForbidden,scores:g.scores,message:g.message});
export function commandTerritory(game,action){if(!playing(game)||game.turn!==1)return game;const next=action==="pass"?passTerritory(game):placeTerritory(game,action);if(next===game)return game;const responded=next.phase==="playing"&&next.turn===2?botTerritory(next):next;return{...responded,history:[...game.history,snapshot(game)]};}
export function undoTerritory(game){if(!game||game.paused||!game.history.length)return game;const history=game.history.slice(),prior=history.pop();return{...game,...prior,history,message:"Última rodada desfeita."};}
export function pauseTerritory(game){if(!game||game.phase!=="playing")return game;return{...game,paused:!game.paused,message:game.paused?"Partida retomada.":"Partida pausada."};}
export function territoryBotText(game,topic){if(topic==="rules")return"Grupos sem liberdades são capturados. Regiões vazias cercadas apenas por uma cor contam como território.";if(topic==="controls")return"Toque nos cruzamentos livres, use Tab/Enter, Passe, Desfazer ou Pause.";if(!game)return"Escolha modo e dificuldade.";const score=scoreTerritory(game);return"Turno "+game.moves+". Capturas: você "+game.captures.black+", rival "+game.captures.white+". Pontos de área: você "+score.black+", rival "+score.white+".";}
