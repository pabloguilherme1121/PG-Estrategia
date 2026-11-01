import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMills, ADJACENCY, MILLS, isMill, legalActions,
  stepMills, playMills, toggleMillsPause, undoMills
} from '../public/estrategia/independentes/moinhos-pedra/engine.mjs';

function setup(config={}) { return createMills({mode:'rapido',difficulty:'recruta',seed:3,...config}); }
function position(overrides={}) {
  return {...setup(), board:Array(24).fill(0), placed:{1:6,2:6}, turn:1, pendingCapture:false, ...overrides};
}

test('Moinhos tem 24 casas, 16 alinhamentos e ligação por anéis',()=>{
  const a=setup();
  assert.equal(a.board.length,24);
  assert.equal(MILLS.length,16);
  assert.deepEqual(ADJACENCY[0].sort((a,b)=>a-b),[1,7]);
  assert.deepEqual(ADJACENCY[9].sort((a,b)=>a-b),[1,8,10,17]);
  assert.equal(a.piecesPerSide,6);
  assert.equal(setup({mode:'classico'}).piecesPerSide,9);
});
test('Colocar peças alterna turno; sobrepor casa ou agir fora de turno não altera estado',()=>{
  const start=setup();
  const after=stepMills(start,{type:'place',to:0});
  assert.equal(after.board[0],1);assert.equal(after.turn,2);
  assert.equal(start.board[0],0);
  assert.strictEqual(stepMills(after,{type:'place',to:0}),after);
  assert.strictEqual(stepMills(after,{type:'move',from:0,to:1}),after);
});
test('Três peças alinhadas formam moinho e exigem captura',()=>{
  const board=Array(24).fill(0);board[0]=board[1]=1;board[10]=board[11]=2;
  const start=position({board,placed:{1:2,2:2}});
  const mill=stepMills(start,{type:'place',to:2});
  assert.equal(isMill(mill.board,2,1),true);
  assert.equal(mill.pendingCapture,true);
  assert.equal(mill.turn,1);
  assert.strictEqual(stepMills(mill,{type:'place',to:3}),mill);
  const taken=stepMills(mill,{type:'capture',at:10});
  assert.equal(taken.board[10],0);
  assert.equal(taken.pendingCapture,false);
  assert.equal(taken.turn,2);
});
test('Capturar peça dentro de moinho é proibido quando há outra livre',()=>{
  const board=Array(24).fill(0);
  for(const i of [8,9,10,12])board[i]=2;
  const start=position({board,pendingCapture:true,placed:{1:6,2:6}});
  assert.strictEqual(stepMills(start,{type:'capture',at:8}),start);
  assert.equal(stepMills(start,{type:'capture',at:12}).board[12],0);
});
test('Movimento só ocorre depois de colocar todas as peças e respeita adjacência',()=>{
  const board=Array(24).fill(0);board[0]=board[2]=board[6]=board[10]=1;
  for(const i of [8,11,14,19])board[i]=2;
  const start=position({board,placed:{1:6,2:6}});
  assert.strictEqual(stepMills(start,{type:'move',from:0,to:17}),start);
  const moved=stepMills(start,{type:'move',from:0,to:1});
  assert.equal(moved.board[0],0);assert.equal(moved.board[1],1);
  const duringPlacement={...start,placed:{1:5,2:6}};
  assert.strictEqual(stepMills(duringPlacement,{type:'move',from:0,to:1}),duringPlacement);
});
test('Com apenas três peças, a regra do voo permite movimentar para uma casa vazia distante',()=>{
  const board=Array(24).fill(0);for(const i of [0,2,6])board[i]=1;
  for(const i of [8,11,14,19])board[i]=2;
  const start=position({board});
  const fly=stepMills(start,{type:'move',from:0,to:17});
  assert.equal(fly.board[17],1);assert.equal(fly.board[0],0);
});
test('Capturar a penúltima defesa adversária após distribuição encerra a partida',()=>{
  const board=Array(24).fill(0);for(const i of [0,1,2])board[i]=1;
  for(const i of [8,12,18])board[i]=2;
  const start=position({board,pendingCapture:true});
  const won=stepMills(start,{type:'capture',at:8});
  assert.equal(won.phase,'won');assert.equal(won.winner,1);
});
test('Bot executa ações válidas e é determinístico para uma mesma semente',()=>{
  const start=setup({difficulty:'veterano',seed:89});
  const a=playMills(start,{type:'place',to:1});
  const b=playMills(start,{type:'place',to:1});
  assert.deepEqual(a,b);
  assert.equal(a.turn,1);
  assert.equal(a.placed[1],1);
  assert.equal(a.placed[2],1);
  assert.equal(a.board.filter(x=>x!==0).length,2);
});
test('Pausa impede ações; desfazer restaura o estado anterior à resposta do rival',()=>{
  const start=setup();
  const paused=toggleMillsPause(start);
  assert.strictEqual(playMills(paused,{type:'place',to:0}),paused);
  const resumed=toggleMillsPause(paused);
  const played=playMills(resumed,{type:'place',to:0});
  const undone=undoMills(played);
  assert.deepEqual(undone.board,start.board);
  assert.deepEqual(undone.placed,start.placed);
  assert.equal(undone.turn,1);
});
test('O jogo oferece vitória, derrota e empate por limite, sem ações após resultado',()=>{
  const board=Array(24).fill(0);for(const i of [0,1,2])board[i]=2;
  for(const i of [8,12,18])board[i]=1;
  const defeated=stepMills(position({board,pendingCapture:true,turn:2}),{type:'capture',at:8});
  assert.equal(defeated.phase,'lost');assert.equal(defeated.winner,2);
  assert.strictEqual(stepMills(defeated,{type:'capture',at:12}),defeated);
  const other=Array(24).fill(0);other[0]=other[4]=other[8]=other[12]=1;other[2]=other[6]=other[10]=other[14]=2;
  const drawn=stepMills(position({board:other,turns:159}),{type:'move',from:0,to:1});
  assert.equal(drawn.phase,'draw');
  assert.deepEqual(legalActions(drawn),[]);
});
