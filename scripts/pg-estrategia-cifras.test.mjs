import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createCipher, submitCipherGuess, rateCipherGuess, revealCipherHint, pauseCipher,
 resumeCipher, CIPHER_MODES, CIPHER_TOKENS
} from '../public/estrategia/independentes/cifras-reais/engine.mjs';

test('Cifras Reais possui dois modos com tamanhos próprios e três níveis',()=>{
 assert.deepEqual(CIPHER_MODES,['codigo','expedicao']);
 assert.equal(CIPHER_TOKENS.length,7);
 for(const mode of CIPHER_MODES)for(const difficulty of ['recruta','tatico','veterano']){
  const s=createCipher({mode,difficulty,seed:42});
  assert.equal(s.secret.length,mode==='codigo'?4:5);
  assert.equal(new Set(s.secret).size,s.secret.length);
  assert.ok(s.secret.every(x=>CIPHER_TOKENS.includes(x)));
  assert.equal(s.history.length,0);assert.equal(s.status,'playing');
  assert.ok(s.maxAttempts>=6);
 }
 assert.throws(()=>createCipher({mode:'desconhecido'}),RangeError);
 assert.throws(()=>createCipher({difficulty:'errado'}),RangeError);
});
test('Cifras Reais gera alvo determinístico por semente e variedade de partidas',()=>{
 assert.deepEqual(createCipher({seed:91}).secret,createCipher({seed:91}).secret);
 assert.notDeepEqual(createCipher({seed:91}).secret,createCipher({seed:92}).secret);
});
test('Cifras Reais avalia posições exatas e deslocadas sem contar símbolo em duplicidade',()=>{
 const secret=['sol','lua','terra','mar'];
 assert.deepEqual(rateCipherGuess(secret,['sol','lua','terra','mar']),{exact:4,misplaced:0});
 assert.deepEqual(rateCipherGuess(secret,['mar','terra','lua','sol']),{exact:0,misplaced:4});
 assert.deepEqual(rateCipherGuess(secret,['sol','vento','mar','fogo']),{exact:1,misplaced:1});
});
test('Cifras Reais recusa movimentos inválidos, repetidos e pausados sem mutação',()=>{
 const s=createCipher({seed:12});
 assert.strictEqual(submitCipherGuess(s,[]),s);
 assert.strictEqual(submitCipherGuess(s,['sol','sol','lua','terra']),s);
 assert.strictEqual(submitCipherGuess(s,['sol','lua','terra','naoExiste']),s);
 const p=pauseCipher(s);
 assert.equal(p.paused,true);
 assert.strictEqual(submitCipherGuess(p,s.secret),p);
 assert.deepEqual(resumeCipher(p).secret,s.secret);
 assert.equal(s.paused,false);
});
test('Cifras Reais permite deduzir e vencer com a combinação correta',()=>{
 const s=createCipher({seed:33});
 const probe=CIPHER_TOKENS.slice(0,4);
 const n=submitCipherGuess(s,probe);
 assert.equal(n.history.length,1);assert.equal(s.history.length,0);
 const final=submitCipherGuess(n,n.secret);
 assert.equal(final.status,'won');
 assert.equal(final.history.at(-1).exact,4);
 assert.strictEqual(submitCipherGuess(final,probe),final);
});
test('Cifras Reais tem derrota por limite e nenhum comando após finalização',()=>{
 let s=createCipher({difficulty:'veterano',seed:42});
 const wrong=CIPHER_TOKENS.filter(x=>!s.secret.includes(x));
 const guess=[...wrong,...s.secret].slice(0,s.secret.length);
 const shifted=[...guess.slice(1),guess[0]];
 for(let i=0;i<s.maxAttempts;i++){
  const candidate=guess.every((x,j)=>x===s.secret[j])?shifted:guess;
  s=submitCipherGuess(s,candidate);
 }
 assert.equal(s.status,'lost');
 assert.match(s.notice,/A sequência era:/);
 for(const token of s.secret)assert.match(s.notice,new RegExp(token));
 assert.equal(s.history.length,s.maxAttempts);
 assert.strictEqual(revealCipherHint(s),s);
});
test('Cifras Reais revela dica de posição limitada sem consumir jogadas',()=>{
 let s=createCipher({seed:4});
 const one=revealCipherHint(s);
 assert.equal(one.reveals.length,1);
 assert.equal(one.reveals[0].token,s.secret[one.reveals[0].index]);
 assert.equal(one.history.length,0);
 assert.equal(one.hintsRemaining,s.hintsRemaining-1);
 s=revealCipherHint(one);
 assert.equal(s.reveals.length,2);
 assert.strictEqual(revealCipherHint(s),s);
});
