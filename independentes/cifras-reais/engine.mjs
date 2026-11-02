// Cifras Reais: lógica dedutiva, sem dependência de outros motores.
export const CIPHER_TOKENS=Object.freeze(['sol','lua','mar','terra','vento','fogo','estrela']);
export const CIPHER_MODES=Object.freeze(['codigo','expedicao']);
const DIFFICULTY=Object.freeze({recruta:11,tatico:9,veterano:7});
const label=Object.freeze({codigo:4,expedicao:5});
function randomSequence(seed){
 let state=(seed>>>0)||0x9e3779b9;
 return ()=>{
  state^=state<<13;state^=state>>>17;state^=state<<5;
  return (state>>>0)/4294967296;
 };
}
export function createCipher({mode='codigo',difficulty='recruta',seed=1}={}){
 if(!CIPHER_MODES.includes(mode)||!Object.hasOwn(DIFFICULTY,difficulty))throw new RangeError('Modo ou dificuldade desconhecido');
 if(!Number.isSafeInteger(seed))throw new RangeError('Semente inválida');
 const r=randomSequence(seed),tokens=[...CIPHER_TOKENS];
 for(let i=tokens.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[tokens[i],tokens[j]]=[tokens[j],tokens[i]];}
 const secret=tokens.slice(0,label[mode]);
 return {mode,difficulty,seed,secret,history:[],maxAttempts:DIFFICULTY[difficulty],
   hintsRemaining:2,reveals:[],paused:false,status:'playing',
   notice:'Descubra a sequência secreta. Cada símbolo só pode ser usado uma vez.'};
}
export function rateCipherGuess(secret,guess){
 if(!Array.isArray(secret)||!Array.isArray(guess)||guess.length!==secret.length)return {exact:0,misplaced:0};
 let exact=0,misplaced=0;
 for(let i=0;i<guess.length;i++) {
  if(guess[i]===secret[i])exact++;
  else if(secret.includes(guess[i]))misplaced++;
 }
 return {exact,misplaced};
}
export function submitCipherGuess(s,guess){
 if(!s||s.status!=='playing'||s.paused||!Array.isArray(guess)||guess.length!==s.secret.length||new Set(guess).size!==guess.length)return s;
 if(!guess.every(token=>CIPHER_TOKENS.includes(token)))return s;
 const result=rateCipherGuess(s.secret,guess);
 const history=[...s.history,{guess:[...guess],...result}];
 const status=result.exact===s.secret.length?'won':history.length>=s.maxAttempts?'lost':'playing';
 const notice=status==='won'?'Vitória! Você decifrou a sequência.':status==='lost'?'Derrota: as tentativas acabaram. A sequência era: '+s.secret.join(' / ')+'.':'Resposta recebida. Reavalie os símbolos deslocados.';
 return {...s,history,status,notice};
}
export function revealCipherHint(s){
 if(!s||s.status!=='playing'||s.paused||s.hintsRemaining===0)return s;
 const index=s.reveals.length;
 if(index>=s.secret.length)return s;
 return {...s,hintsRemaining:s.hintsRemaining-1,
   reveals:[...s.reveals,{index,token:s.secret[index]}],
   notice:'PG Bot revelou um símbolo. Use as pistas para deduzir o restante.'};
}
export function pauseCipher(s){return s?.status==='playing'&&!s.paused?{...s,paused:true,notice:'Partida pausada.'}:s;}
export function resumeCipher(s){return s?.status==='playing'&&s.paused?{...s,paused:false,notice:'Partida retomada.'}:s;}
