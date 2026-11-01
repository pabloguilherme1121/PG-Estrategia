import test from "node:test";
import assert from "node:assert/strict";
import {createReversi, legalReversiMoves, applyReversiMove, playReversiTurn, chooseReversiBotMove, reversiScore, pauseReversi, resumeReversi} from "../public/estrategia/independentes/reversi-tatico/engine.mjs";

test("Reversi: dois tabuleiros e três dificuldades com abertura real de quatro movimentos",()=>{
 for(const size of [6,8])for(const difficulty of ["recruta","tatico","veterano"]){
  const s=createReversi({size,difficulty});
  assert.equal(s.board.length,size*size);
  assert.equal(s.current,1);assert.equal(s.status,"playing");
  assert.deepEqual(reversiScore(s),{player:2,bot:2});
  assert.equal(legalReversiMoves(s,1).length,4);
  assert.equal(legalReversiMoves(s,-1).length,4);
 }
 assert.throws(()=>createReversi({size:10}),RangeError);
 assert.throws(()=>createReversi({difficulty:"impossivel"}),RangeError);
});
test("Reversi: capturas viram peças, movimento inválido não muda o estado",()=>{
 const s=createReversi({size:6});
 assert.strictEqual(applyReversiMove(s,-1),s);
 assert.strictEqual(applyReversiMove(s,0),s);
 const moves=legalReversiMoves(s);
 const next=applyReversiMove(s,moves[0]);
 assert.equal(next.board[moves[0]],1);
 assert.deepEqual(reversiScore(next),{player:4,bot:1});
 assert.deepEqual(reversiScore(s),{player:2,bot:2});
 assert.equal(next.current,-1);
});
test("Reversi: bot sempre escolhe casa legal e é determinístico",()=>{
 for(const difficulty of ["recruta","tatico","veterano"]){
  const s=createReversi({size:6,difficulty});
  const first=applyReversiMove(s,legalReversiMoves(s,1)[0]);
  const choice=chooseReversiBotMove(first);
  assert.ok(legalReversiMoves(first,-1).includes(choice));
  assert.equal(chooseReversiBotMove(first),choice);
 }
});
test("Reversi: pausa bloqueia partida e retomada não altera tabuleiro",()=>{
 const s=createReversi({size:6});
 const paused=pauseReversi(s);
 assert.equal(paused.paused,true);
 assert.strictEqual(playReversiTurn(paused,legalReversiMoves(paused)[0]),paused);
 const resumed=resumeReversi(paused);
 assert.deepEqual(resumed.board,s.board);assert.equal(resumed.paused,false);
});
test("Reversi: partida 6x6 chega ao resultado por regras, sem comandos inválidos nem travamento",()=>{
 let s=createReversi({size:6,difficulty:"veterano"});
 let turns=0;
 while(s.status==="playing" && turns++<38){
  const moves=legalReversiMoves(s,1);
  const index=moves[0];
  assert.ok(Number.isInteger(index),"jogador precisa de jogada após passagens automáticas");
  const next=playReversiTurn(s,index);
  assert.notStrictEqual(next,s,"movimento legal deve evoluir o jogo");
  assert.ok(reversiScore(next).player+reversiScore(next).bot<=36);
  s=next;
 }
 assert.notEqual(s.status,"playing",JSON.stringify({turns,state:s}));
 assert.ok(["won","lost","tie"].includes(s.status));
 assert.ok(reversiScore(s).player+reversiScore(s).bot<=36);
 assert.strictEqual(playReversiTurn(s,0),s);
});
