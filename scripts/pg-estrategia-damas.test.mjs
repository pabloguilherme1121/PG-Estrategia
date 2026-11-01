import test from 'node:test';
import assert from 'node:assert/strict';
import {createDraughts, legalDraughtsMoves, commandDraughts} from '../public/estrategia/independentes/draughts.mjs';
const blank = () => Array(64).fill(0);
function position(entries) { const board=blank(); for(const [cell,piece] of entries) board[cell]=piece; return {...createDraughts(),board}; }
test('Damas: estado inicial determinístico, 12 peças por lado e 3 dificuldades',()=>{
 for(const difficulty of ['recruta','tatico','veterano']){
  const a=createDraughts({difficulty,seed:27});
  assert.deepEqual(a,createDraughts({difficulty,seed:27}));
  assert.equal(a.board.filter(x=>x>0).length,12);
  assert.equal(a.board.filter(x=>x<0).length,12);
  assert.equal(a.mode,difficulty);
  assert.equal(a.phase,'playing');
  assert.ok(legalDraughtsMoves(a.board,1).length>0);
 }
 assert.throws(()=>createDraughts({difficulty:'facil'}),RangeError);
});
test('Damas: captura obrigatória impede movimento simples e remove adversário',()=>{
 const s=position([[42,1],[33,-1],[46,1],[10,-1]]);
 const moves=legalDraughtsMoves(s.board,1);
 assert.deepEqual(moves.map(({from,to,capture})=>({from,to,capture})),[{from:42,to:24,capture:33}]);
 assert.equal(commandDraughts(s,{type:'move',from:46,to:37}),s);
 const next=commandDraughts(s,{type:'move',from:42,to:24});
 assert.equal(next.board[33],0);
 assert.equal(next.board[24],1);
 assert.equal(s.board[42],1);
});
test('Damas: salto encadeado exige continuar capturando antes do turno rival',()=>{
 const s=position([[49,1],[42,-1],[28,-1],[7,-1]]);
 const first=commandDraughts(s,{type:'move',from:49,to:35});
 assert.equal(first.chainFrom,35);
 assert.equal(first.board[42],0);
 assert.equal(first.board[28],-1);
 assert.deepEqual(legalDraughtsMoves(first.board,1,35).map(m=>m.to),[21]);
 const second=commandDraughts(first,{type:'move',from:35,to:21});
 assert.equal(second.board[28],0);
 assert.equal(second.chainFrom,null);
 assert.equal(second.turn,1);
});
test('Damas: promoção torna a peça dama e permite mover para trás',()=>{
 const s=position([[10,1],[62,-1]]);
 const result=commandDraughts(s,{type:'move',from:10,to:1});
 assert.equal(result.board[1],2);
 assert.ok(legalDraughtsMoves(result.board,1).some(m=>m.from===1&&m.to===10));
});
test('Damas: vitória, derrota, pausa e partidas terminadas',()=>{
 const s=position([[42,1],[33,-1]]);
 const paused=commandDraughts(s,{type:'pause'});
 assert.equal(commandDraughts(paused,{type:'move',from:42,to:24}),paused);
 const resumed=commandDraughts(paused,{type:'resume'});
 const won=commandDraughts(resumed,{type:'move',from:42,to:24});
 assert.equal(won.phase,'won');assert.ok(won.score>0);
 assert.equal(commandDraughts(won,{type:'move',from:24,to:17}),won);
 const trapped=position([[1,1],[10,-1]]);
 assert.equal(legalDraughtsMoves(trapped.board,1).length,0);
});

test('Damas: rival responde de forma determinística e mantém tabuleiro imutável',()=>{
 const start=createDraughts({difficulty:'veterano',seed:8});
 const first=commandDraughts(start,{type:'move',from:40,to:33});
 assert.notEqual(first,start);
 assert.equal(first.turn,1);
 assert.deepEqual(first,commandDraughts(start,{type:'move',from:40,to:33}));
 assert.equal(start.board[40],1);
 assert.equal(start.board[33],0);
 assert.equal(first.board[33],1);
 assert.ok(first.board.filter(p=>p<0).length<=12);
});
