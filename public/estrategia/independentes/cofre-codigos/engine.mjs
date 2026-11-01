// Cofre de Códigos: dedução de combinação secreta com feedback independente por tentativa.
export const VAULT_MODES=Object.freeze(["sem-repeticao","com-repeticao"]);
export const VAULT_LEVELS=Object.freeze({
 recruta:Object.freeze({length:4,palette:6,maxAttempts:9}),
 tatico:Object.freeze({length:5,palette:7,maxAttempts:10}),
 veterano:Object.freeze({length:6,palette:8,maxAttempts:12})
});
export function gradeGuess(secret,guess){
 const count=new Map(),exact=secret.reduce((n,x,i)=>{
  if(x===guess[i])return n+1;
  count.set(x,(count.get(x)||0)+1);return n;
 },0);
 let misplaced=0;
 for(let i=0;i<guess.length;i++){
  if(guess[i]===secret[i])continue;
  const available=count.get(guess[i])||0;
  if(available>0){misplaced++;count.set(guess[i],available-1);}
 }
 return {exact,misplaced};
}
export function createVault({mode="sem-repeticao",difficulty="recruta",seed=0}={}){
 if(!VAULT_MODES.includes(mode)||!Object.hasOwn(VAULT_LEVELS,difficulty)||!Number.isSafeInteger(seed)||seed<0||seed>999999999)throw new RangeError("Parâmetros inválidos");
 const cfg=VAULT_LEVELS[difficulty],pool=Array.from({length:cfg.palette},(_,i)=>i);
 let state=(seed+1)*7919+cfg.length*641+cfg.palette;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state;};
 const secret=Array.from({length:cfg.length},()=>{
  const index=random()%pool.length;
  const symbol=pool[index];
  if(mode==="sem-repeticao")pool.splice(index,1);
  return symbol;
 });
 return {mode,difficulty,seed,secret,palette:cfg.palette,maxAttempts:cfg.maxAttempts,
  attempts:[],revealed:[],phase:"playing",paused:false,score:0,message:"Descubra a sequência com as pistas de cada tentativa."};
}
export function submitVaultGuess(game,guess){
 if(!game||game.phase!=="playing"||game.paused||!Array.isArray(guess)||guess.length!==game.secret.length
 ||guess.some(n=>!Number.isInteger(n)||n<0||n>=game.palette)
 ||game.mode==="sem-repeticao"&&new Set(guess).size!==guess.length)return game;
 const feedback=gradeGuess(game.secret,guess),attempts=[...game.attempts,{guess:[...guess],...feedback}];
 const won=feedback.exact===game.secret.length;
 const phase=won?"won":attempts.length>=game.maxAttempts?"lost":"playing";
 const score=won?Math.max(10,1000-(attempts.length-1)*75-game.revealed.length*45):0;
 return {...game,attempts,phase,score,
  message:won?"Cofre aberto! Código descoberto.":phase==="lost"?"Tentativas esgotadas. Reinicie para abrir o cofre.":"Pistas registradas. Tente novamente."};
}
export function undoVaultGuess(game){
 if(!game||game.phase!=="playing"||game.paused||!game.attempts.length)return game;
 return {...game,attempts:game.attempts.slice(0,-1),message:"Tentativa anterior removida."};
}
export function pauseVault(game){
 return game?.phase==="playing"?{...game,paused:!game.paused,message:game.paused?"Missão retomada.":"Missão pausada."}:game;
}
export function hintVault(game){
 if(!game||game.phase!=="playing"||game.paused)return null;
 const index=game.secret.findIndex((_,i)=>!game.revealed.includes(i));
 return index<0?null:{index,value:game.secret[index]};
}
