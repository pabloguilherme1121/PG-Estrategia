import test from "node:test";
import assert from "node:assert/strict";
import {createVault,gradeGuess,submitVaultGuess,undoVaultGuess,pauseVault,hintVault,VAULT_LEVELS,VAULT_MODES} from "../public/estrategia/independentes/cofre-codigos/engine.mjs";
test("feedback usa combinação exata e considera símbolos repetidos uma única vez",()=>{
 assert.deepEqual(gradeGuess([1,1,2,3],[1,2,1,4]),{exact:1,misplaced:2});
 assert.deepEqual(gradeGuess([0,0,1,1],[0,0,0,0]),{exact:2,misplaced:0});
 assert.deepEqual(gradeGuess([0,1,2,3],[3,2,1,0]),{exact:0,misplaced:4});
});
test("criação determinística por modo, dificuldade e semente",()=>{
 for(const mode of VAULT_MODES)for(const difficulty of Object.keys(VAULT_LEVELS))for(let seed=0;seed<30;seed++){
  const g=createVault({mode,difficulty,seed});
  assert.deepEqual(g,createVault({mode,difficulty,seed}));
  assert.equal(g.secret.length,VAULT_LEVELS[difficulty].length);
  assert.equal(g.phase,"playing");
  assert.ok(g.secret.every(n=>Number.isInteger(n)&&n>=0&&n<g.palette));
  if(mode==="sem-repeticao")assert.equal(new Set(g.secret).size,g.secret.length);
 }
});
test("jogadas inválidas não alteram estado; parâmetros inválidos falham",()=>{
 const g=createVault();
 for(const guess of [[1],[0,1,2,99],[-1,0,1,2],[0,0,1,2],"abcd",null])
  assert.equal(submitVaultGuess(g,guess),g);
 assert.throws(()=>createVault({mode:"fake"}),RangeError);
 assert.throws(()=>createVault({difficulty:"fake"}),RangeError);
 assert.throws(()=>createVault({seed:-1}),RangeError);
});
test("pausa e desfazer preservam a pontuação e o estado imutável",()=>{
 const g=createVault(),wrong=g.secret.map(x=>(x+1)%g.palette);
 const next=submitVaultGuess(g,wrong);
 assert.equal(next.attempts.length,1);assert.equal(g.attempts.length,0);
 const paused=pauseVault(next);
 assert.equal(submitVaultGuess(paused,g.secret),paused);
 assert.equal(undoVaultGuess(paused),paused);
 assert.equal(hintVault(paused),null);
 const undone=undoVaultGuess(pauseVault(paused));
 assert.equal(undone.attempts.length,0);
});
test("dicas revelam posições sem consumir jogadas, solução vence",()=>{
 for(const mode of VAULT_MODES)for(const difficulty of Object.keys(VAULT_LEVELS)){
  let g=createVault({mode,difficulty,seed:19});
  for(let position=0;position<g.secret.length;position++){
   const hint=hintVault(g);
   assert.deepEqual(hint,{index:position,value:g.secret[position]});
   g={...g,revealed:[...g.revealed,position]};
  }
  const won=submitVaultGuess(g,g.secret);
  assert.equal(won.phase,"won");assert.ok(won.score>0);
  assert.equal(submitVaultGuess(won,g.secret),won);
 }
});
test("limite de tentativas encerra partida sem vitória",()=>{
 let g=createVault({mode:"com-repeticao",difficulty:"veterano",seed:0});
 for(let i=0;i<g.maxAttempts;i++){
  const wrong=g.secret.map(x=>(x+1+i%2)%g.palette);
  g=submitVaultGuess(g,wrong);
 }
 assert.equal(g.phase,"lost");
 assert.equal(hintVault(g),null);
});
